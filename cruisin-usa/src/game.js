// Cruis'n Moore — pseudo-3D sprite-scaling arcade racer.
// Road engine in the classic OutRun/Cruis'n style: projected road segments
// with curves, hills, fog, scaled roadside sprites and traffic.
//
// Player state lives in "register" fields on the Game (this.speed, this.playerX,
// ...). In two-player split screen each player's snapshot is swapped into those
// registers, updated/rendered, and swapped back out — single player runs on the
// registers directly, exactly as it always did.

import { SEGMENT_LENGTH, RUMBLE_LENGTH, buildCourses } from './track.js';
import { buildSprites, buildVehicles, buildBackground } from './sprites.js';

export const W = 960, H = 540;

const ROAD_WIDTH = 2000;                 // half-width of road in world units
const CAMERA_HEIGHT = 1100;
const FOV = 100;
const CAMERA_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const FOG_DENSITY = 5;
const MAX_SPEED = SEGMENT_LENGTH * 60;
const ACCEL = MAX_SPEED / 4.2;
const BRAKING = -MAX_SPEED;
const DECEL = -MAX_SPEED / 5;
const OFFROAD_DECEL = -MAX_SPEED / 1.5;
const OFFROAD_LIMIT = MAX_SPEED / 4;
const CENTRIFUGAL = 0.17;
const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH;
const PLAYER_W = 0.34;                   // in playerX units (1 = road half-width)
const CAR_LENGTH = SEGMENT_LENGTH * 1.1;

const RIVAL_NAMES = ['BLAZE', 'TEX', 'VINNY', 'PEACH', 'GHOST', 'DIESEL', 'SURGE'];

// selectable rides: top speed / acceleration / steering multipliers
const CARS = [
  { name: 'ROADSTER',    tag: 'ALL-AROUNDER',   top: 1.0,  accel: 1.0,  steer: 1.0,  pips: [4, 3, 3] },
  { name: 'LA BOMBA',    tag: 'PURE TOP SPEED', top: 1.05, accel: 0.85, steer: 0.85, pips: [5, 2, 2] },
  { name: 'MOORE WAGON', tag: 'LAUNCH + GRIP',  top: 0.94, accel: 1.2,  steer: 1.2,  pips: [3, 4, 5] },
];
const TOUR_POINTS = [10, 8, 7, 6, 5, 4, 3, 2];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
const P_COLORS = ['#ff4030', '#ffe14a'];

// per-player fields swapped between snapshots and the Game registers
const P_FIELDS = [
  'position', 'totalDist', 'playerX', 'speed', 'steer', 'lap', 'timeLeft',
  'nextGate', 'flip', 'busted', 'mercy', 'draft', 'drafting', 'shake', 'flash',
  'bgFarX', 'bgNearX', 'carIndex', 'stats', 'finished', 'timedOut', 'finTime', 'finPos',
];

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function wrap(z, len) { return ((z % len) + len) % len; }
function overlap(x1, w1, x2, w2) { return Math.abs(x1 - x2) < (w1 + w2) / 2; }
function fogAmount(ratio) { return 1 / Math.pow(Math.E, ratio * ratio * FOG_DENSITY); }

export class Game {
  constructor(canvas, input, sound) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.sound = sound;
    this.courses = buildCourses();
    this.courseIndex = 0;
    this.menuIndex = 0;      // title carousel: courses..., then MOORE TOUR
    this.carIndex = 0;
    this.stats = CARS[0];
    this.twoPlayer = false;
    this.carSel = [0, 0];
    this.carSelP = 0;
    this.players = [];
    this.curPlayer = 0;
    this.pview = [];
    this.mode = 'single';    // 'single' | 'tour'
    this.tourIndex = 0;
    this.tourPoints = null;
    this.tourOver = false;
    this.state = 'title';
    this.flash = null;       // { text, sub, t }
    this.attractPos = 0;
    this.weather = null;     // { kind: 'rain'|'sunset', sky?, fog? }
    this.particles = [];
    this.draft = 0;
    this.drafting = false;
    this.vpH = H;            // active viewport height (H/2 per view in split screen)
    this.loadCourse(0);
  }

  // --- player snapshots ---------------------------------------------------------

  makePlayer(i) {
    const carIndex = this.carSel[i] || 0;
    return {
      idx: i, carIndex, stats: CARS[carIndex],
      position: 0, totalDist: 0,
      playerX: this.twoPlayer && this.mode === 'single' ? (i === 0 ? -0.3 : 0.3) : 0,
      speed: 0, steer: 0, lap: 1,
      timeLeft: this.course.timeStart, nextGate: 0,
      flip: null, busted: null, mercy: 0, draft: 0, drafting: false,
      shake: 0, flash: null, bgFarX: 0, bgNearX: 0,
      finished: false, timedOut: false, finTime: 0, finPos: 0,
    };
  }

  loadP(p) { for (const f of P_FIELDS) this[f] = p[f]; }
  saveP(p) { for (const f of P_FIELDS) p[f] = this[f]; }

  // lightweight read-only views for AI/rank code (register-backed for 1P)
  refreshPview() {
    if (this.players.length === 1) {
      this.pview = [{ totalDist: this.totalDist, position: this.position, playerX: this.playerX, speed: this.speed, finished: this.finished }];
    } else {
      this.pview = this.players.map((p) => ({
        totalDist: p.totalDist, position: p.position, playerX: p.playerX, speed: p.speed, finished: p.finished,
      }));
    }
  }

  vpFor(i) {
    return this.players.length === 2 ? { y: i * (H / 2), h: H / 2 } : { y: 0, h: H };
  }

  drawDist() { return this.players.length === 2 ? 170 : 240; }

  // --- setup -----------------------------------------------------------------

  loadCourse(i) {
    this.courseIndex = i;
    const course = this.courses[i];
    this.course = course;
    this.segments = course.segments;
    this.trackLength = course.trackLength;
    this.sprites = buildSprites(course.night);
    this.vehicles = buildVehicles(course.night);
    this.bg = buildBackground(course);
    this.cars = [];
  }

  resetRace() {
    this.raceTime = 0;

    // flat list of bonus-time gates across the whole race (checkpoints + lap lines)
    this.gates = [];
    for (let lapI = 0; lapI < this.course.laps; lapI++) {
      for (const cpSeg of this.course.checkpoints) {
        this.gates.push(lapI * this.trackLength + cpSeg * SEGMENT_LENGTH);
      }
      if (lapI > 0) this.gates.push(lapI * this.trackLength);
    }
    this.gates.sort((a, b) => a - b);

    // rivals start on the grid ahead of the players (you're at the back)
    this.cars = [];
    for (let r = 0; r < 7; r++) {
      this.cars.push({
        kind: 'rival', name: RIVAL_NAMES[r], img: this.vehicles.rivals[r],
        dist: (r + 1) * SEGMENT_LENGTH * 2.2,
        z: 0, offset: (r % 2 === 0 ? -0.42 : 0.42), w: 0.34,
        base: MAX_SPEED * (0.70 + r * 0.045), speed: 0,
      });
    }
    // same-direction traffic (right side of the road)
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let t = 0; t < 20; t++) {
      const img = this.vehicles.traffic[t % this.vehicles.traffic.length];
      this.cars.push({
        kind: 'traffic', img,
        dist: 0, z: rnd(60, this.segments.length - 20) * SEGMENT_LENGTH,
        offset: rnd(0.3, 0.72), w: img.width > 128 ? 0.4 : 0.33,
        speed: MAX_SPEED * rnd(0.22, 0.4),
      });
    }
    // oncoming traffic (left side, toward the player) — the Cruis'n signature
    for (let o = 0; o < 6; o++) {
      this.cars.push({
        kind: 'oncoming', img: this.vehicles.oncoming[o % this.vehicles.oncoming.length],
        dist: 0, z: rnd(80, this.segments.length - 20) * SEGMENT_LENGTH,
        offset: rnd(-0.75, -0.4), w: 0.33,
        speed: MAX_SPEED * rnd(0.25, 0.35),
      });
    }
    // highway patrol parked on the shoulders — speed past one and it lights up
    for (const frac of [0.3, 0.65]) {
      this.cars.push({
        kind: 'cop', img: this.vehicles.police[0],
        dist: 0, z: Math.floor(this.segments.length * frac) * SEGMENT_LENGTH,
        offset: frac < 0.5 ? 1.25 : -1.25, w: 0.34,
        speed: 0, cop: 'parked', chaseT: 0, target: 0,
      });
    }
    for (const c of this.cars) c.z = wrap(c.z, this.trackLength);

    // players
    const n = (this.twoPlayer && this.mode === 'single') ? 2 : 1;
    this.players = [];
    for (let i = 0; i < n; i++) this.players.push(this.makePlayer(i));
    this.loadP(this.players[0]);
    this.curPlayer = 0;
    this.refreshPview();

    // ghost: replay of your record run (1P single races only)
    this.ghost = null;
    this.ghostRec = null;
    if (this.mode === 'single' && n === 1) {
      try { this.ghost = JSON.parse(localStorage.getItem(`cruisin-moore-ghost-${this.course.id}`)); }
      catch { this.ghost = null; }
      this.ghostRec = { next: 0, samples: [] };
    }
  }

  ghostState() {
    const g = this.ghost;
    if (!g || !g.samples || !g.samples.length) return null;
    const idx = this.raceTime / (g.step || 0.05);
    const i = Math.min(Math.floor(idx), g.samples.length - 1);
    const j = Math.min(i + 1, g.samples.length - 1);
    const f = clamp(idx - i, 0, 1);
    return {
      dist: g.samples[i][0] + (g.samples[j][0] - g.samples[i][0]) * f,
      x: (g.samples[i][1] + (g.samples[j][1] - g.samples[i][1]) * f) / 1000,
    };
  }

  startRace() {
    this.sound.stopSiren();
    this.resetRace();
    this.particles = [];
    // roll the weather: rain anywhere, golden-hour skies by day
    const roll = Math.random();
    if (roll < 0.22) {
      this.weather = { kind: 'rain', sky: this.course.night ? null : ['#5a6a80', '#9aa8b8'], fog: this.course.night ? null : '#96a4b4' };
    } else if (roll < 0.42 && !this.course.night) {
      this.weather = { kind: 'sunset', sky: ['#ff7a3c', '#ffd9a0'], fog: '#ffd9a0' };
    } else {
      this.weather = null;
    }
    this.state = 'countdown';
    this.countdown = 3.999;
    this.lastBeep = 4;
    this.sound.startEngine();
    this.sound.startMusic(this.course.music);
  }

  skyColors() {
    return (this.weather && this.weather.sky) ? this.weather.sky : this.course.sky;
  }

  fogColor() {
    return (this.weather && this.weather.fog) ? this.weather.fog : this.course.fog;
  }

  // --- helpers -----------------------------------------------------------------

  segmentAt(z) {
    return this.segments[Math.floor(wrap(z, this.trackLength) / SEGMENT_LENGTH) % this.segments.length];
  }

  totalRacers() { return 7 + this.players.length; }

  playerRank() {
    let ahead = 0;
    for (const c of this.cars) if (c.kind === 'rival' && c.dist > this.totalDist) ahead++;
    for (let j = 0; j < this.pview.length; j++) {
      if (j === this.curPlayer) continue;
      if (this.pview[j].totalDist > this.totalDist) ahead++;
    }
    return 1 + ahead;
  }

  // --- update ------------------------------------------------------------------

  update(dt) {
    const inputs = this.input.poll(this.players.length === 2 ? 2 : 1);

    if (this.input.consume('mute')) this.sound.toggleMute();

    if ((this.state === 'race' || this.state === 'countdown') && this.input.consume('restart')) {
      this.startRace();
      return;
    }

    switch (this.state) {
      case 'title': this.updateTitle(dt); break;
      case 'car': this.updateCarSelect(dt); break;
      case 'countdown': this.updateCountdown(dt, inputs); break;
      case 'race': this.updateRaceAll(dt, inputs); break;
      case 'finish':
      case 'gameover':
        this.updateCars(dt);
        if (this.input.consume('start')) this.leaveRaceEnd();
        break;
      case 'standings':
        if (this.input.consume('start')) {
          if (!this.tourOver && this.tourIndex < this.courses.length - 1) {
            this.tourIndex++;
            this.loadCourse(this.tourIndex);
            this.startRace();
          } else {
            this.state = 'champion';
          }
        }
        break;
      case 'initials': this.updateInitials(); break;
      case 'leaderboard':
        if (this.input.consume('start')) this.goTitle();
        break;
      case 'champion':
        if (this.input.consume('start')) this.goTitle();
        break;
    }
    // flashes tick per player (registers ARE player 1 in single player)
    const tickFlash = (holder) => {
      if (holder.flash) {
        holder.flash.t -= dt;
        if (holder.flash.t <= 0) holder.flash = null;
      }
      holder.shake = Math.max(0, (holder.shake || 0) - dt * 3);
    };
    if (this.players.length === 2) for (const p of this.players) tickFlash(p);
    else tickFlash(this);
    this.updateParticles(dt);
  }

  updateTitle(dt) {
    // attract mode: cruise the camera down the selected course
    this.attractPos = wrap(this.attractPos + MAX_SPEED * 0.35 * dt, this.trackLength);
    if (this.input.consume('two')) {
      this.twoPlayer = !this.twoPlayer;
      this.sound.blip(this.twoPlayer ? 760 : 520, 0.1);
      const entries = this.courses.length + (this.twoPlayer ? 0 : 1);
      if (this.menuIndex >= entries) { this.menuIndex = 0; this.loadCourse(0); }
    }
    const entries = this.courses.length + (this.twoPlayer ? 0 : 1); // tour is 1P only
    let moved = 0;
    if (this.input.consume('left')) moved = -1;
    if (this.input.consume('right')) moved = 1;
    if (moved) {
      this.menuIndex = (this.menuIndex + entries + moved) % entries;
      if (this.menuIndex < this.courses.length) this.loadCourse(this.menuIndex);
      this.sound.blip(500, 0.08);
    }
    if (this.input.consume('start')) {
      if (this.menuIndex === this.courses.length) {
        this.mode = 'tour';
        this.tourIndex = 0;
        this.tourPoints = {};
        this.tourOver = false;
        this.loadCourse(0);
      } else {
        this.mode = 'single';
        this.loadCourse(this.menuIndex);
      }
      this.state = 'car';
      this.carSelP = 0;
      this.sound.blip(700, 0.1);
    }
  }

  updateCarSelect(dt) {
    this.attractPos = wrap(this.attractPos + MAX_SPEED * 0.35 * dt, this.trackLength);
    if (this.input.consume('left')) {
      this.carSel[this.carSelP] = (this.carSel[this.carSelP] + CARS.length - 1) % CARS.length;
      this.sound.blip(500, 0.08);
    }
    if (this.input.consume('right')) {
      this.carSel[this.carSelP] = (this.carSel[this.carSelP] + 1) % CARS.length;
      this.sound.blip(500, 0.08);
    }
    if (this.input.consume('start')) {
      this.sound.blip(800, 0.1);
      if (this.twoPlayer && this.mode === 'single' && this.carSelP === 0) {
        this.carSelP = 1;
      } else {
        this.carIndex = this.carSel[0];
        this.stats = CARS[this.carIndex];
        this.startRace();
      }
    }
  }

  leaveRaceEnd() {
    this.sound.stopEngine();
    this.sound.stopMusic();
    this.sound.stopSiren();
    if (this.mode === 'tour') {
      this.applyTourPoints(this.state === 'finish');
      if (this.state === 'gameover') this.tourOver = true;
      this.state = 'standings';
    } else if (this.players.length === 1 && this.state === 'finish' &&
               this.qualifies(this.course.id, this.finTime)) {
      this.entry = { slot: 0, chars: [0, 0, 0] };
      this.input.pressed = {};
      this.state = 'initials';
    } else {
      this.goTitle();
    }
  }

  goTitle() {
    this.mode = 'single';
    this.weather = null;
    this.ghost = null;
    this.state = 'title';
  }

  updateInitials() {
    const e = this.entry;
    let d = 0;
    if (this.input.consume('right') || this.input.consume('up')) d = 1;
    if (this.input.consume('left') || this.input.consume('down')) d = -1;
    if (d) {
      e.chars[e.slot] = (e.chars[e.slot] + LETTERS.length + d) % LETTERS.length;
      this.sound.blip(600, 0.05);
    }
    if (this.input.consume('start')) {
      this.sound.blip(800, 0.08);
      e.slot++;
      if (e.slot >= 3) {
        const ini = e.chars.map((c) => LETTERS[c]).join('').trimEnd() || 'AAA';
        this.newEntry = { ini, time: parseFloat(this.finTime.toFixed(2)) };
        this.saveEntry(this.course.id, this.newEntry.ini, this.newEntry.time);
        this.state = 'leaderboard';
      }
    }
  }

  applyTourPoints(finished) {
    const rivals = this.cars.filter((c) => c.kind === 'rival')
      .sort((a, b) => b.dist - a.dist)
      .map((r) => r.name);
    const order = rivals.slice();
    if (finished) order.splice(this.finPos - 1, 0, 'YOU');
    else order.push('YOU'); // DNF
    order.forEach((name, i) => {
      const pts = (name === 'YOU' && !finished) ? 0 : TOUR_POINTS[i];
      this.tourPoints[name] = (this.tourPoints[name] || 0) + pts;
    });
  }

  tourTable() {
    return Object.entries(this.tourPoints).sort((a, b) => b[1] - a[1]);
  }

  updateCountdown(dt, inputs) {
    this.countdown -= dt;
    const n = Math.ceil(this.countdown);
    if (n < this.lastBeep && n >= 0) {
      this.lastBeep = n;
      this.sound.countBeep(n === 0);
    }
    const two = this.players.length === 2;
    for (let i = 0; i < this.players.length; i++) {
      if (two) this.loadP(this.players[i]);
      const inp = inputs[i] || inputs[0];
      if (inp.accel) this.speed = Math.min(this.speed + ACCEL * 0.4 * dt, MAX_SPEED * 0.1); // rev at the line
      if (two) this.saveP(this.players[i]);
    }
    this.sound.setEngine((inputs[0].accel) ? 0.35 : 0.05, false);
    if (this.countdown <= 0) {
      this.state = 'race';
      const sub = this.weather?.kind === 'rain' ? 'RAIN — SLICK ROADS!' : `${this.course.laps} LAPS`;
      const flash = () => ({ text: this.course.name, sub, t: 2.2 });
      this.flash = flash();
      if (two) for (const p of this.players) p.flash = flash();
    }
  }

  updateRaceAll(dt, inputs) {
    this.raceTime += dt;
    const two = this.players.length === 2;

    this.refreshPview();
    this.updateCars(dt);

    for (let i = 0; i < this.players.length; i++) {
      this.curPlayer = i;
      if (two) this.loadP(this.players[i]);
      const inp = inputs[i] || inputs[0];
      if (this.finished || this.timedOut) {
        // coast after your race is over
        this.speed = Math.max(0, this.speed + DECEL * dt);
        this.totalDist += this.speed * dt;
        this.position = wrap(this.position + this.speed * dt, this.trackLength);
      } else {
        this.updateRacePlayer(dt, inp);
      }
      if (two) this.saveP(this.players[i]);
    }
    this.curPlayer = 0;
    this.refreshPview();

    this.sound.setEngine((two ? this.players[0].speed : this.speed) / MAX_SPEED, false);

    // race ends when every player is finished or out of time
    const allDone = this.players.every((p, i) => {
      const src = (two || i > 0) ? p : this;
      return src.finished || src.timedOut;
    });
    if (allDone) {
      const anyFin = two ? this.players.some((p) => p.finished) : this.finished;
      if (two) this.loadP(this.players[0]);
      this.flash = null;
      this.state = anyFin ? 'finish' : 'gameover';
      this.sound.stopSiren();
      if (!anyFin) {
        this.sound.stopEngine();
        this.sound.gameOver();
      }
    }
  }

  updateRacePlayer(dt, inp) {
    this.timeLeft -= dt;

    const playerSeg = this.segmentAt(this.position + PLAYER_Z);
    const speedPct = this.speed / MAX_SPEED;
    const dx = dt * 2.2 * speedPct;

    if (this.flip) {
      this.flip.t += dt;
      this.speed = Math.max(0, this.speed - MAX_SPEED * 1.4 * dt);
      if (this.flip.t >= this.flip.dur) {
        this.flip = null;
        this.playerX = clamp(this.playerX, -0.85, 0.85);
        this.speed = 0;
        this.mercy = 2;
      }
      this.steer = 0;
    } else if (this.busted) {
      this.busted.t += dt;
      this.speed = Math.max(0, this.speed - MAX_SPEED * 2 * dt);
      this.steer = 0;
      if (this.busted.t >= this.busted.dur) {
        this.busted = null;
        this.mercy = 1.5;
      }
    } else {
      const grip = this.weather?.kind === 'rain' ? 0.88 : 1;
      const sdx = dx * this.stats.steer * grip;
      if (inp.left) { this.playerX -= sdx; this.steer = Math.max(-1, this.steer - dt * 6); }
      else if (inp.right) { this.playerX += sdx; this.steer = Math.min(1, this.steer + dt * 6); }
      else this.steer *= Math.max(0, 1 - dt * 8);

      this.playerX -= dx * speedPct * playerSeg.curve * CENTRIFUGAL;

      this.updateDraft(dt);
      const maxSpd = MAX_SPEED * this.stats.top * (1 + 0.07 * this.draft);
      if (inp.accel) {
        this.speed += ACCEL * this.stats.accel * (this.drafting ? 1.3 : 1) * (1 - (this.speed / maxSpd) * 0.25) * dt;
      } else if (inp.brake) this.speed += BRAKING * dt;
      else this.speed += DECEL * dt;

      // hard cornering squeal + tire smoke
      if (speedPct > 0.7 && Math.abs(playerSeg.curve) >= 4 && (inp.left || inp.right)) {
        if (Math.random() < dt * 6) this.sound.skid();
        this.spawnSmoke();
      }
    }

    // off-road
    const offroad = Math.abs(this.playerX) > 1;
    if (offroad) {
      if (this.speed > OFFROAD_LIMIT) this.speed += OFFROAD_DECEL * dt;
      this.shake = Math.max(this.shake, 0.25);
      if (this.speed > 1500) this.spawnDust();
      // scenery collisions
      if (!this.flip && !this.busted && this.mercy <= 0) {
        for (const s of playerSeg.sprites) {
          const spr = this.sprites[s.name];
          if (spr.arch) continue;
          const sw = spr.worldW / ROAD_WIDTH;
          if (overlap(this.playerX, PLAYER_W, s.offset + (s.offset > 0 ? sw / 2 : -sw / 2), sw * 0.7)) {
            this.crashIntoScenery();
            break;
          }
        }
      }
    }

    this.playerX = clamp(this.playerX, -2.2, 2.2);
    this.speed = clamp(this.speed, 0, MAX_SPEED * this.stats.top * (1 + 0.07 * this.draft));

    // advance
    const prevTotal = this.totalDist;
    this.totalDist += this.speed * dt;
    this.position = wrap(this.position + this.speed * dt, this.trackLength);

    // ghost recording (20 Hz, 1P only)
    if (this.ghostRec && this.raceTime >= this.ghostRec.next && this.ghostRec.samples.length < 4800) {
      this.ghostRec.next += 0.05;
      this.ghostRec.samples.push([Math.round(this.totalDist), Math.round(this.playerX * 1000)]);
    }

    // radar: blow past a parked cop at speed and it lights up
    if (!this.flip && !this.busted) {
      const pz = wrap(this.position + PLAYER_Z, this.trackLength);
      for (const cop of this.cars) {
        if (cop.kind !== 'cop' || cop.cop !== 'parked') continue;
        let rel = cop.z - pz;
        if (rel > this.trackLength / 2) rel -= this.trackLength;
        if (rel < -this.trackLength / 2) rel += this.trackLength;
        if (rel < 0 && rel > -SEGMENT_LENGTH * 2 && this.speed > MAX_SPEED * 0.75) {
          cop.cop = 'chase';
          cop.chaseT = 10;
          cop.target = this.curPlayer;
          cop.speed = this.speed * 0.55;
          this.sound.startSiren();
          this.flash = { text: 'COPS!', sub: 'OUTRUN THE HEAT!', t: 1.6 };
        }
      }
    }

    this.mercy = Math.max(0, this.mercy - dt);
    if (!this.flip && !this.busted && this.mercy <= 0) this.carCollisions();

    // player-vs-player rubbing
    for (let j = 0; j < this.pview.length; j++) {
      if (j === this.curPlayer) continue;
      const o = this.pview[j];
      if (Math.abs(this.totalDist - o.totalDist) < CAR_LENGTH &&
          overlap(this.playerX, PLAYER_W, o.playerX, PLAYER_W) && this.speed > 500) {
        if (this.speed > o.speed) this.speed = Math.max(o.speed * 0.9, this.speed * 0.85);
        this.playerX += this.playerX > o.playerX ? 0.05 : -0.05;
        this.shake = Math.max(this.shake, 0.2);
      }
    }

    // time gates
    if (this.nextGate < this.gates.length &&
        prevTotal < this.gates[this.nextGate] && this.totalDist >= this.gates[this.nextGate]) {
      this.nextGate++;
      this.timeLeft += this.course.timeBonus;
      this.sound.checkpoint();
      this.flash = { text: 'CHECKPOINT', sub: `+${this.course.timeBonus} SECONDS`, t: 1.6 };
    }

    // laps
    const newLap = Math.floor(this.totalDist / this.trackLength) + 1;
    if (newLap > this.lap && newLap <= this.course.laps) {
      this.lap = newLap;
      this.flash = { text: `LAP ${this.lap}`, sub: newLap === this.course.laps ? 'FINAL LAP!' : '', t: 1.8 };
    }

    // finish / out of time (the race state resolves once everyone is done)
    if (this.totalDist >= this.trackLength * this.course.laps) {
      this.finished = true;
      this.finTime = this.raceTime;
      this.finPos = this.playerRank();
      this.flash = null;
      this.sound.finishFanfare();
      // save the ghost if this run is the new course record
      const board = this.getBoard(this.course.id);
      if (this.mode === 'single' && this.ghostRec && (!board.length || this.finTime < board[0].time)) {
        try {
          localStorage.setItem(`cruisin-moore-ghost-${this.course.id}`, JSON.stringify({
            time: parseFloat(this.finTime.toFixed(2)), step: 0.05, samples: this.ghostRec.samples,
          }));
        } catch { /* private mode */ }
      }
    } else if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.timedOut = true;
      this.flash = null;
      this.sound.gameOver();
    }
  }

  updateDraft(dt) {
    // tucked in behind a same-direction car at speed → slipstream builds
    let drafting = false;
    if (this.speed > MAX_SPEED * 0.62) {
      const pz = wrap(this.position + PLAYER_Z, this.trackLength);
      for (const car of this.cars) {
        if (car.kind === 'oncoming' || car.kind === 'cop') continue;
        let rel = car.z - pz;
        if (rel > this.trackLength / 2) rel -= this.trackLength;
        if (rel < -this.trackLength / 2) rel += this.trackLength;
        if (rel > CAR_LENGTH * 0.8 && rel < SEGMENT_LENGTH * 9 &&
            Math.abs(this.playerX - car.offset) < 0.22) {
          drafting = true;
          break;
        }
      }
    }
    const wasFull = this.draft >= 1;
    this.draft = clamp(this.draft + (drafting ? dt / 1.2 : -dt / 0.8), 0, 1);
    this.drafting = drafting;
    if (!wasFull && this.draft >= 1) this.sound.blip(980, 0.15, 'square', 0.18);
  }

  // --- particles (screen space) ----------------------------------------------

  addParticle(p) {
    if (this.particles.length < 240) this.particles.push(p);
  }

  spawnDust() {
    const vp = this.vpFor(this.curPlayer);
    const c = { coast: '#b09a6a', desert: '#d8b078', rockies: '#eef2f6', city: '#8a8a92' }[this.course.id] || '#b09a6a';
    for (const side of [-1, 1]) {
      this.addParticle({
        x: W / 2 + side * 62 + (Math.random() - 0.5) * 20, y: vp.y + vp.h - 34,
        vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, g: 0,
        life: 0.5, max: 0.5, size: 5 + Math.random() * 5, color: c,
      });
    }
  }

  spawnSmoke() {
    const vp = this.vpFor(this.curPlayer);
    for (const side of [-1, 1]) {
      this.addParticle({
        x: W / 2 + side * 68, y: vp.y + vp.h - 28,
        vx: side * 30 + (Math.random() - 0.5) * 40, vy: -25 - Math.random() * 35, g: 0,
        life: 0.4, max: 0.4, size: 4 + Math.random() * 4, color: 'rgba(210,210,215,0.8)',
      });
    }
  }

  spawnDebris() {
    const vp = this.vpFor(this.curPlayer);
    for (let i = 0; i < 14; i++) {
      this.addParticle({
        x: W / 2 + (Math.random() - 0.5) * 90, y: vp.y + vp.h - 90,
        vx: (Math.random() - 0.5) * 500, vy: -150 - Math.random() * 320, g: 800,
        life: 1.1, max: 1.1, size: 3 + Math.random() * 4,
        color: Math.random() < 0.5 ? '#d42222' : '#33333a',
      });
    }
  }

  updateParticles(dt) {
    // rain streaks
    if (this.weather?.kind === 'rain' &&
        ['countdown', 'race', 'finish', 'gameover'].includes(this.state)) {
      for (let i = 0; i < 6; i++) {
        this.addParticle({
          x: Math.random() * W, y: -10 - Math.random() * 30,
          vx: -40 - this.steer * 60, vy: 850 + Math.random() * 250, g: 0,
          life: 0.9, max: 0.9, rain: true,
        });
      }
    }
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
      p.life -= dt;
      if (p.rain && p.y > H - 8) p.life = 0;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  renderParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      if (p.rain) {
        ctx.strokeStyle = 'rgba(190,205,235,0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.02, p.y + p.vy * 0.022);
        ctx.stroke();
      } else {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    }
  }

  bust(cop) {
    this.busted = { t: 0, dur: 2.5 };
    cop.cop = 'done';
    cop.speed = 0;
    this.shake = 0.6;
    this.sound.stopSiren();
    this.sound.bump();
    [500, 400, 300].forEach((f, i) => this.sound.blip(f, 0.2, 'square', 0.25, i * 0.15));
    this.flash = { text: 'BUSTED!', sub: 'THE CLOCK IS STILL RUNNING', t: 2.4 };
  }

  crashIntoScenery() {
    if (this.speed > MAX_SPEED * 0.6) {
      this.flip = { t: 0, dur: 1.1 };
      this.shake = 1;
      this.spawnDebris();
      this.sound.crash();
    } else {
      this.speed *= 0.2;
      this.playerX += this.playerX > 0 ? -0.12 : 0.12;
      this.shake = Math.max(this.shake, 0.4);
      this.sound.bump();
    }
  }

  updateCars(dt) {
    const racing = this.state === 'race';
    const leadDist = Math.max(...this.pview.map((p) => p.totalDist));
    for (const car of this.cars) {
      if (car.kind === 'rival') {
        if (!racing && this.state !== 'finish' && this.state !== 'gameover') continue;
        // rubber-band toward the leading player; the dead zone stops rivals
        // from speed-matching bumper-to-bumper, so passes stick
        const diff = leadDist - car.dist;
        const dz = Math.abs(diff) > 4000 ? diff - Math.sign(diff) * 4000 : 0;
        const rubber = clamp(1 + dz / 120000, 0.8, 1.08);
        const target = car.base * rubber;
        car.speed += clamp(target - car.speed, -ACCEL * dt, ACCEL * 0.8 * dt);
        car.dist += car.speed * dt;
        car.z = wrap(car.dist, this.trackLength);
        this.rivalSteer(car, dt);
      } else if (car.kind === 'cop') {
        if (car.cop === 'chase') {
          const t = this.pview[car.target] || this.pview[0];
          car.chaseT -= dt;
          const targetSpd = Math.min(MAX_SPEED * 1.05, t.speed + 1500);
          car.speed += clamp(targetSpd - car.speed, -ACCEL * dt, ACCEL * 1.4 * dt);
          car.z = wrap(car.z + car.speed * dt, this.trackLength);
          car.offset += clamp(t.playerX - car.offset, -1, 1) * dt * 1.6;
          car.offset = clamp(car.offset, -0.9, 0.9);
          if (car.chaseT <= 0) {
            car.cop = 'done';
            car.speed = 0;
            this.sound.stopSiren();
            const msg = { text: 'LOST THE HEAT!', sub: '', t: 1.5 };
            if (this.players.length === 2) this.players[car.target].flash = msg;
            else this.flash = msg;
          }
        } else if (car.cop === 'done') {
          car.offset += (1.3 - car.offset) * dt * 2; // pull over to the shoulder
        }
        car.img = this.vehicles.police[car.cop === 'done' ? 0 : Math.floor(performance.now() / 125) % 2];
      } else if (car.kind === 'traffic') {
        car.z = wrap(car.z + car.speed * dt, this.trackLength);
      } else { // oncoming
        car.z = wrap(car.z - car.speed * dt, this.trackLength);
        // keep oncoming traffic cycling through the lead player's view
        const anchor = this.pview[0] ? this.pview[0].position : 0;
        const rel = wrap(car.z - anchor, this.trackLength);
        if (rel > this.trackLength - SEGMENT_LENGTH * 10) { // just passed behind us
          car.z = wrap(anchor + (this.drawDist() + 20 + Math.random() * 100) * SEGMENT_LENGTH, this.trackLength);
          car.offset = -0.75 + Math.random() * 0.35;
        }
      }
    }
  }

  rivalSteer(car, dt) {
    // avoid the players and other cars just ahead
    const look = SEGMENT_LENGTH * 12;
    let steer = 0;
    for (const p of this.pview) {
      const relPlayer = wrap(p.position + PLAYER_Z - car.z, this.trackLength);
      if (relPlayer < look && relPlayer > 0 && overlap(car.offset, car.w, p.playerX, PLAYER_W * 1.6)) {
        steer = p.playerX > car.offset ? -1 : 1;
        break;
      }
    }
    if (!steer) {
      for (const other of this.cars) {
        if (other === car) continue;
        const rel = wrap(other.z - car.z, this.trackLength);
        if (rel > 0 && rel < look && car.speed > (other.kind === 'oncoming' ? 0 : other.speed) &&
            overlap(car.offset, car.w, other.offset, other.w * 1.4)) {
          steer = other.offset > car.offset ? -1 : 1;
          break;
        }
      }
    }
    if (steer) car.offset += steer * dt * 0.8;
    else car.offset += clamp((Math.sign(car.offset || 1) * 0.4 - car.offset), -1, 1) * dt * 0.2;
    car.offset = clamp(car.offset, -0.85, 0.85);
  }

  carCollisions() {
    const pz = wrap(this.position + PLAYER_Z, this.trackLength);
    for (const car of this.cars) {
      let rel = car.z - pz;
      if (rel > this.trackLength / 2) rel -= this.trackLength;
      if (rel < -this.trackLength / 2) rel += this.trackLength;
      if (Math.abs(rel) > CAR_LENGTH) continue;
      if (!overlap(this.playerX, PLAYER_W, car.offset, car.w)) continue;

      if (car.kind === 'cop') {
        if (car.cop === 'chase' && car.target === this.curPlayer) {
          this.bust(car);
        } else {
          this.speed = Math.min(this.speed, MAX_SPEED * 0.15);
          this.playerX += this.playerX > car.offset ? 0.1 : -0.1;
          this.shake = Math.max(this.shake, 0.35);
          this.sound.bump();
        }
        continue;
      }
      if (car.kind === 'oncoming') {
        // head-on: the famous Cruis'n wipeout
        if (this.speed + car.speed > MAX_SPEED * 0.7) {
          this.flip = { t: 0, dur: 1.2 };
          this.shake = 1;
          this.spawnDebris();
          this.sound.crash();
        } else {
          this.speed = 0;
          this.mercy = 1;
          this.sound.bump();
        }
        car.z = wrap(this.position + (this.drawDist() + 50) * SEGMENT_LENGTH, this.trackLength);
      } else if (this.speed > car.speed) {
        // rear-end: match their speed and get shoved back behind the car
        this.speed = car.speed * 0.85;
        const newPos = wrap(car.z - PLAYER_Z - CAR_LENGTH * 0.6, this.trackLength);
        const back = wrap(this.position - newPos, this.trackLength);
        if (back < this.trackLength / 2) {
          this.totalDist -= back;
          this.position = newPos;
        }
        this.playerX += this.playerX > car.offset ? 0.06 : -0.06;
        this.shake = Math.max(this.shake, 0.35);
        this.sound.bump();
      }
    }
  }

  // top-5 local leaderboard per course (with migration from the old single-best key)
  getBoard(id) {
    try {
      const board = JSON.parse(localStorage.getItem(`cruisin-moore-lb-${id}`)) || [];
      const legacy = parseFloat(localStorage.getItem(`cruisin-moore-best-${id}`));
      if (legacy && !board.some((e) => e.time === legacy)) {
        board.push({ ini: '---', time: legacy });
        board.sort((a, b) => a.time - b.time);
      }
      return board.slice(0, 5);
    } catch { return []; }
  }
  qualifies(id, time) {
    const board = this.getBoard(id);
    return board.length < 5 || time < board[board.length - 1].time;
  }
  saveEntry(id, ini, time) {
    try {
      const board = this.getBoard(id);
      board.push({ ini, time });
      board.sort((a, b) => a.time - b.time);
      localStorage.setItem(`cruisin-moore-lb-${id}`, JSON.stringify(board.slice(0, 5)));
      localStorage.removeItem(`cruisin-moore-best-${id}`);
    } catch { /* private mode */ }
  }

  // --- render ------------------------------------------------------------------

  render() {
    const ctx = this.ctx;
    const inMenu = this.state === 'title' || this.state === 'car';
    const two = this.players.length === 2 && !inMenu;

    if (two) {
      for (let i = 0; i < 2; i++) {
        const vp = this.vpFor(i);
        this.curPlayer = i;
        this.loadP(this.players[i]);
        this.vpH = vp.h;
        ctx.save();
        ctx.translate(0, vp.y);
        ctx.beginPath();
        ctx.rect(0, 0, W, vp.h);
        ctx.clip();
        this.renderView(false, i);
        ctx.restore();
        this.saveP(this.players[i]);
      }
      this.vpH = H;
      this.loadP(this.players[0]);
      this.curPlayer = 0;
      // divider
      ctx.fillStyle = '#000';
      ctx.fillRect(0, H / 2 - 2, W, 4);
    } else {
      this.vpH = H;
      this.renderView(inMenu, 0);
    }

    this.renderParticles();

    switch (this.state) {
      case 'title': this.renderTitle(); break;
      case 'car': this.renderCarSelect(); break;
      case 'countdown': this.renderCountdown(); break;
      case 'race': break;
      case 'finish': this.renderResults(true); break;
      case 'gameover': this.renderResults(false); break;
      case 'standings': this.renderStandings(); break;
      case 'initials': this.renderInitials(); break;
      case 'leaderboard': this.renderLeaderboard(); break;
      case 'champion': this.renderChampion(); break;
    }
  }

  renderView(isMenu, playerIdx) {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.05) {
      ctx.translate((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 10);
    }
    const camZ = isMenu ? this.attractPos : this.position;
    this.renderWorld(camZ, isMenu ? 0 : this.playerX);
    if (!isMenu) this.renderPlayer();
    ctx.restore();

    if (this.weather?.kind === 'rain' && !isMenu) {
      ctx.fillStyle = 'rgba(30,40,70,0.16)';
      ctx.fillRect(0, 0, W, this.vpH);
    }
    if (!isMenu && ['countdown', 'race', 'finish', 'gameover'].includes(this.state)) {
      this.renderHUD(playerIdx);
    }
  }

  renderWorld(camZ, camXNorm) {
    const ctx = this.ctx;
    const vpH = this.vpH;

    // sky
    const skyCols = this.skyColors();
    const sky = ctx.createLinearGradient(0, 0, 0, vpH * 0.55);
    sky.addColorStop(0, skyCols[0]);
    sky.addColorStop(1, skyCols[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, vpH);

    // parallax background
    const base = this.segmentAt(camZ);
    const speedPct = this.speed / MAX_SPEED;
    if (this.state !== 'title' && this.state !== 'car') {
      this.bgFarX = wrap(this.bgFarX + base.curve * speedPct * 18, 1024);
      this.bgNearX = wrap(this.bgNearX + base.curve * speedPct * 38, 1024);
    } else {
      this.bgFarX = wrap(this.bgFarX + base.curve * 8 * (1 / 60), 1024);
      this.bgNearX = wrap(this.bgNearX + base.curve * 16 * (1 / 60), 1024);
    }
    const basePct = (wrap(camZ, this.trackLength) % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const playerY = base.p1y + (base.p2y - base.p1y) * basePct;
    const bgY = clamp(-playerY * 0.004, -40, 20);
    this.drawTiled(this.bg.far, -this.bgFarX, vpH * 0.5 - 200 + 40 + bgY * 0.5, 1.0);
    this.drawTiled(this.bg.near, -this.bgNearX, vpH * 0.5 - 200 + 78 + bgY, 1.0);

    // road segments
    const drawDist = this.drawDist();
    const camX = camXNorm * ROAD_WIDTH;
    const camY = playerY + CAMERA_HEIGHT;
    let maxY = vpH;
    let x = 0;
    let dxAcc = -(base.curve * basePct);
    const baseIndex = base.index;

    for (let n = 0; n < drawDist; n++) {
      const seg = this.segments[(baseIndex + n) % this.segments.length];
      const looped = seg.index < baseIndex;
      const segZ1 = seg.index * SEGMENT_LENGTH + (looped ? this.trackLength : 0);
      const camAbsZ = wrap(camZ, this.trackLength);

      seg.fog = fogAmount(n / drawDist);

      const p1 = this.project(x, seg.p1y - camY, segZ1 - camAbsZ, camX);
      x += dxAcc; dxAcc += seg.curve;
      const p2 = this.project(x, seg.p2y - camY, segZ1 + SEGMENT_LENGTH - camAbsZ, camX);

      seg.p1s = p1; seg.p2s = p2;
      seg.clip = maxY;

      if (p1.z <= CAMERA_DEPTH || p2.y >= maxY || p2.y >= p1.y) { seg.onScreen = false; continue; }
      seg.onScreen = true;
      this.drawSegment(seg, p1, p2);
      maxY = p2.y;
    }

    // sprites & cars, far to near
    this.assignCarsToSegments();
    if (this.ghost && (this.state === 'race' || this.state === 'countdown')) {
      const gs = this.ghostState();
      if (gs) {
        this.segmentAt(gs.dist).carsDraw.push({
          kind: 'ghost', img: this.vehicles.ghost,
          z: wrap(gs.dist, this.trackLength), offset: gs.x, w: 0.34, alpha: 0.65,
        });
      }
    }
    // the other player's car appears in this player's world
    if (this.players.length === 2) {
      for (let j = 0; j < 2; j++) {
        if (j === this.curPlayer) continue;
        const o = this.players[j];
        this.segmentAt(o.position + PLAYER_Z).carsDraw.push({
          kind: 'p2', img: this.vehicles.players[o.carIndex],
          z: wrap(o.position + PLAYER_Z, this.trackLength), offset: o.playerX, w: 0.34,
        });
      }
    }
    for (let n = drawDist - 1; n >= 0; n--) {
      const seg = this.segments[(baseIndex + n) % this.segments.length];
      if (!seg.onScreen) continue;
      for (const s of seg.sprites) this.drawSprite(seg, s);
      for (const car of seg.carsDraw) this.drawCar(seg, car);
    }
  }

  project(worldX, worldY, worldZ, camX) {
    const z = Math.max(worldZ, 1);
    const scale = CAMERA_DEPTH / z;
    return {
      x: W / 2 + scale * (worldX - camX) * W / 2,
      y: this.vpH / 2 - scale * worldY * this.vpH / 2,
      w: scale * ROAD_WIDTH * W / 2,
      scale, z: worldZ,
    };
  }

  drawTiled(img, ox, y, alpha) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ox = wrap(ox, img.width);
    ctx.drawImage(img, ox - img.width, y);
    ctx.drawImage(img, ox, y);
    if (ox + img.width < W) ctx.drawImage(img, ox + img.width, y);
    ctx.globalAlpha = 1;
  }

  drawSegment(seg, p1, p2) {
    const ctx = this.ctx;
    const c = this.course;
    const alt = Math.floor(seg.index / RUMBLE_LENGTH) % 2 === 0;

    // grass
    ctx.fillStyle = alt ? c.grass[0] : c.grass[1];
    ctx.fillRect(0, p2.y, W, p1.y - p2.y);

    const r1 = p1.w / 6, r2 = p2.w / 6;      // rumble width
    const poly = (x1, y1, w1, x2, y2, w2, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1);
      ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2);
      ctx.closePath(); ctx.fill();
    };

    poly(p1.x, p1.y, p1.w + r1, p2.x, p2.y, p2.w + r2, alt ? c.rumble[0] : c.rumble[1]);
    poly(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, seg.marker ? '#9a9aa2' : (alt ? c.road[0] : c.road[1]));

    // lane lines (4 lanes)
    if (alt) {
      const l1 = Math.max(1, p1.w / 40), l2 = Math.max(1, p2.w / 40);
      for (const lane of [-0.5, 0, 0.5]) {
        poly(p1.x + p1.w * lane, p1.y, l1, p2.x + p2.w * lane, p2.y, l2, c.lane);
      }
    }

    // fog
    if (seg.fog < 1) {
      ctx.globalAlpha = 1 - seg.fog;
      ctx.fillStyle = this.fogColor();
      ctx.fillRect(0, p2.y, W, p1.y - p2.y);
      ctx.globalAlpha = 1;
    }
  }

  assignCarsToSegments() {
    for (const seg of this.segments) {
      if (seg.carsDraw && seg.carsDraw.length) seg.carsDraw.length = 0;
      else seg.carsDraw = seg.carsDraw || [];
    }
    for (const car of this.cars) {
      this.segmentAt(car.z).carsDraw.push(car);
    }
  }

  drawSprite(seg, s) {
    const spr = this.sprites[s.name];
    const p1 = seg.p1s;
    const destW = p1.scale * spr.worldW * W / 2;
    const destH = destW * (spr.img.height / spr.img.width);
    let destX, destY;
    if (spr.arch) {
      destX = p1.x - destW / 2;
      destY = p1.y - destH;
    } else {
      destX = p1.x + p1.scale * s.offset * ROAD_WIDTH * W / 2 - (s.offset > 0 ? 0 : destW);
      destY = p1.y - destH;
    }
    this.drawClipped(spr.img, destX, destY, destW, destH, seg.clip, seg.fog);
  }

  drawCar(seg, car) {
    const p1 = seg.p1s, p2 = seg.p2s;
    const pct = (wrap(car.z, this.trackLength) % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const scale = p1.scale + (p2.scale - p1.scale) * pct;
    const x = p1.x + (p2.x - p1.x) * pct + scale * car.offset * ROAD_WIDTH * W / 2;
    const y = p1.y + (p2.y - p1.y) * pct;
    const worldW = car.w * ROAD_WIDTH * 1.1;
    const destW = scale * worldW * W / 2;
    const destH = destW * (car.img.height / car.img.width);
    this.drawClipped(car.img, x - destW / 2, y - destH, destW, destH, seg.clip, seg.fog * (car.alpha || 1));
  }

  drawClipped(img, x, y, w, h, clipY, fog) {
    if (w < 1 || h < 1) return;
    const ctx = this.ctx;
    let sh = img.height;
    if (clipY != null && y + h > clipY) {
      const visible = clipY - y;
      if (visible <= 0) return;
      sh = img.height * (visible / h);
      h = visible;
    }
    ctx.globalAlpha = clamp(fog != null ? fog : 1, 0, 1);
    ctx.drawImage(img, 0, 0, img.width, sh, x, y, w, h);
    ctx.globalAlpha = 1;
  }

  renderPlayer() {
    const ctx = this.ctx;
    const img = this.vehicles.players[this.carIndex];
    const speedPct = this.speed / MAX_SPEED;
    // same projection as other cars at the player's z, so sizes match side-by-side
    let w = Math.min(W * 0.3, (CAMERA_DEPTH / PLAYER_Z) * (PLAYER_W * ROAD_WIDTH * 1.1) * W / 2);
    if (this.vpH < H) w *= 0.75;
    const h = w * (img.height / img.width);
    const bounce = speedPct > 0.05 ? (Math.random() - 0.5) * 3 * speedPct : 0;
    const cx = W / 2, cy = this.vpH - h / 2 - 14 + bounce;

    if (this.mercy > 0 && Math.floor(this.mercy * 10) % 2 === 0) return; // blink
    ctx.save();
    ctx.translate(cx, cy);
    if (this.flip) {
      const t = this.flip.t / this.flip.dur;
      ctx.translate(0, -Math.sin(t * Math.PI) * 90);
      ctx.rotate(t * Math.PI * 4);
      ctx.scale(1 - Math.sin(t * Math.PI) * 0.15, 1 - Math.sin(t * Math.PI) * 0.15);
    } else {
      ctx.rotate(this.steer * 0.07);
    }
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // --- overlays ------------------------------------------------------------------

  text(str, x, y, size, color, align = 'center', font = 'bold') {
    const ctx = this.ctx;
    ctx.font = `${font} ${size}px monospace`;
    ctx.textAlign = align;
    ctx.fillStyle = '#000';
    ctx.fillText(str, x + size * 0.08, y + size * 0.08);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  renderHUD(playerIdx) {
    const ctx = this.ctx;
    const vpH = this.vpH;
    const hs = vpH < H ? 0.72 : 1;   // shrink HUD text in split screen
    const two = this.players.length === 2;

    // time
    const warn = this.timeLeft < 10 && this.state === 'race' && !this.finished && !this.timedOut;
    const timeCol = warn && Math.floor(this.raceTime * 4) % 2 === 0 ? '#ff4030' : '#ffe14a';
    this.text('TIME', 24, 34 * hs, 16 * hs, '#fff', 'left');
    this.text(String(Math.max(0, Math.ceil(this.timeLeft))), 24, 72 * hs, 40 * hs, timeCol, 'left');
    if (two) this.text(`P${playerIdx + 1}`, 24, 96 * hs, 18 * hs, P_COLORS[playerIdx], 'left');

    // position + lap
    const rank = this.finished ? this.finPos : this.playerRank();
    const sup = ['st', 'nd', 'rd'][rank - 1] || 'th';
    this.text(`${rank}${sup} / ${this.totalRacers()}`, W - 24, 44 * hs, 28 * hs, rank === 1 ? '#7dff6a' : '#fff', 'right');
    this.text(`LAP ${Math.min(this.lap, this.course.laps)}/${this.course.laps}`, W - 24, 74 * hs, 18 * hs, '#9adcff', 'right');

    // speed
    const mph = Math.round((this.speed / MAX_SPEED) * 149);
    this.text(String(mph), W - 24, vpH - 34 * hs, 44 * hs, '#fff', 'right');
    this.text('MPH', W - 24, vpH - 12 * hs, 14 * hs, '#ffb14a', 'right');

    // draft meter
    if (this.draft > 0.02) {
      const dw = 120 * hs;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(W - 24 - dw, vpH - 92 * hs, dw, 10 * hs);
      ctx.fillStyle = this.draft >= 1 ? '#7dff6a' : '#4aa8e8';
      ctx.fillRect(W - 24 - dw, vpH - 92 * hs, dw * this.draft, 10 * hs);
      if (this.draft >= 1 && Math.floor(this.raceTime * 6) % 2 === 0) {
        this.text('DRAFT!', W - 24, vpH - 100 * hs, 16 * hs, '#7dff6a', 'right');
      }
    }

    // race progress bar with rival + player blips
    const total = this.trackLength * this.course.laps;
    const bw = 300 * hs, bh = 8 * hs;
    const bx = W / 2 - bw / 2, by = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(bx + bw / 2 - 1, by, 2, bh); // lap line
    for (const car of this.cars) {
      if (car.kind !== 'rival') continue;
      const p = clamp(car.dist / total, 0, 1);
      ctx.fillStyle = '#9adcff';
      ctx.fillRect(bx + p * bw - 2, by + 1, 4, bh - 2);
    }
    for (let j = 0; j < this.pview.length; j++) {
      const p = clamp(this.pview[j].totalDist / total, 0, 1);
      ctx.fillStyle = P_COLORS[j];
      ctx.fillRect(bx + p * bw - 3, by - 3, 6, bh + 6);
    }
    if (this.mode === 'tour') {
      this.text(`TOUR RACE ${this.tourIndex + 1}/${this.courses.length}`, W / 2, by + 34, 13, '#ff8ad8');
    }

    // ghost gap
    if (this.ghost && this.state === 'race' && this.speed > 500) {
      const gs = this.ghostState();
      if (gs) {
        const gap = (this.totalDist - gs.dist) / Math.max(this.speed, 2000);
        this.text(`GHOST ${gap >= 0 ? '+' : ''}${gap.toFixed(1)}s`, W / 2, by + 34, 13,
          gap >= 0 ? '#7dff6a' : '#9fd8e8');
      }
    }

    // police lights wash (chases targeting this player)
    const chase = this.cars.some((c) => c.kind === 'cop' && c.cop === 'chase' && c.target === playerIdx);
    if (chase || this.busted) {
      const phase = Math.floor(performance.now() / 125) % 2;
      const a = this.busted ? 0.25 : 0.1;
      ctx.fillStyle = phase ? `rgba(255,50,50,${a})` : `rgba(60,90,255,${a})`;
      ctx.fillRect(0, 0, W, 54 * hs);
      if (this.busted) ctx.fillRect(0, vpH - 54 * hs, W, 54 * hs);
    }

    // per-player race-over banner while the other player finishes
    if (this.state === 'race' && (this.finished || this.timedOut)) {
      if (this.finished) {
        const fsup = ['st', 'nd', 'rd'][this.finPos - 1] || 'th';
        this.text('FINISHED!', W / 2, vpH * 0.4, 40 * hs, '#7dff6a');
        this.text(`${this.finPos}${fsup} PLACE`, W / 2, vpH * 0.4 + 36 * hs, 22 * hs, '#ffe14a');
      } else {
        this.text('TIME UP', W / 2, vpH * 0.4, 40 * hs, '#ff4030');
      }
    }

    // center flash
    if (this.flash) {
      const a = clamp(this.flash.t / 0.4, 0, 1);
      ctx.globalAlpha = a;
      this.text(this.flash.text, W / 2, vpH * 0.3, 44 * hs, '#ffe14a');
      if (this.flash.sub) this.text(this.flash.sub, W / 2, vpH * 0.3 + 36 * hs, 20 * hs, '#fff');
      ctx.globalAlpha = 1;
    }
  }

  renderCountdown() {
    const n = Math.ceil(this.countdown);
    const t = this.countdown - Math.floor(this.countdown);
    const size = 90 + (1 - t) * 40;
    this.text(n > 0 ? String(n) : 'GO!', W / 2, H * 0.45, size, n > 0 ? '#ffe14a' : '#7dff6a');
  }

  renderResults(finished) {
    if (this.players.length === 2) { this.renderResults2(); return; }
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,8,20,0.72)';
    ctx.fillRect(W / 2 - 280, H * 0.2, 560, 250);
    ctx.strokeStyle = '#f8a800'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 280, H * 0.2, 560, 250);
    if (finished) {
      const sup = ['st', 'nd', 'rd'][this.finPos - 1] || 'th';
      this.text('FINISH!', W / 2, H * 0.2 + 58, 44, '#7dff6a');
      this.text(`${this.finPos}${sup} PLACE`, W / 2, H * 0.2 + 110, 34, this.finPos === 1 ? '#ffe14a' : '#fff');
      this.text(`TIME  ${this.finTime.toFixed(2)}`, W / 2, H * 0.2 + 152, 22, '#9adcff');
      const top = this.getBoard(this.course.id)[0];
      if (this.mode === 'single' && this.qualifies(this.course.id, this.finTime)) {
        this.text('NEW TOP-5 TIME!', W / 2, H * 0.2 + 182, 18, '#7dff6a');
      } else if (top) {
        this.text(`BEST  ${top.time.toFixed(2)} ${top.ini}`, W / 2, H * 0.2 + 182, 18, '#889');
      }
      if (this.finPos === 1) this.text('CRUIS-TACULAR!', W / 2, H * 0.2 + 214, 18, '#ff8ad8');
    } else {
      this.text('TIME UP', W / 2, H * 0.2 + 70, 48, '#ff4030');
      this.text(`YOU REACHED LAP ${this.lap}`, W / 2, H * 0.2 + 120, 20, '#fff');
    }
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER', W / 2, H * 0.2 + 236, 16, '#ffb14a');
    }
  }

  renderResults2() {
    const ctx = this.ctx;
    const [a, b] = this.players;
    // head-to-head winner: finishing beats DNF; then better place; then time
    let winner = -1;
    if (a.finished || b.finished) {
      if (a.finished && !b.finished) winner = 0;
      else if (b.finished && !a.finished) winner = 1;
      else if (a.finPos !== b.finPos) winner = a.finPos < b.finPos ? 0 : 1;
      else winner = a.finTime <= b.finTime ? 0 : 1;
    }
    ctx.fillStyle = 'rgba(8,8,20,0.8)';
    ctx.fillRect(W / 2 - 280, H * 0.18, 560, 280);
    ctx.strokeStyle = '#f8a800'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 280, H * 0.18, 560, 280);
    this.text(winner < 0 ? 'DOUBLE TIME-UP!' : `PLAYER ${winner + 1} WINS!`,
      W / 2, H * 0.18 + 60, 40, winner < 0 ? '#ff4030' : P_COLORS[winner]);
    for (let i = 0; i < 2; i++) {
      const p = this.players[i];
      const y = H * 0.18 + 120 + i * 60;
      const sup = ['st', 'nd', 'rd'][p.finPos - 1] || 'th';
      this.text(`P${i + 1}`, W / 2 - 220, y, 26, P_COLORS[i], 'left');
      this.text(CARS[p.carIndex].name, W / 2 - 150, y, 18, '#9adcff', 'left');
      this.text(p.finished ? `${p.finPos}${sup} · ${p.finTime.toFixed(2)}` : 'TIME UP',
        W / 2 + 220, y, 22, p.finished ? '#fff' : '#ff4030', 'right');
    }
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER', W / 2, H * 0.18 + 256, 16, '#ffb14a');
    }
  }

  renderTitle() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6,6,18,0.45)';
    ctx.fillRect(0, 0, W, H);

    // logo
    this.text('CRUIS’N', W / 2, 120, 76, '#ffe14a');
    this.text('MOORE', W / 2, 190, 76, '#ff4030');
    this.text('COAST TO COAST ARCADE RACING', W / 2, 224, 16, '#9adcff');

    // course / tour carousel
    const entries = this.courses.length + (this.twoPlayer ? 0 : 1);
    const isTour = this.menuIndex === this.courses.length;
    this.text('◀', W / 2 - 250, 320, 30, '#ffb14a');
    this.text('▶', W / 2 + 250, 320, 30, '#ffb14a');
    ctx.fillStyle = 'rgba(8,8,20,0.7)';
    ctx.fillRect(W / 2 - 210, 270, 420, 84);
    ctx.strokeStyle = isTour ? '#ff8ad8' : '#f8a800'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 210, 270, 420, 84);
    if (isTour) {
      this.text('MOORE TOUR', W / 2, 305, 26, '#ff8ad8');
      this.text(`ALL ${this.courses.length} COURSES · POINTS CHAMPIONSHIP`, W / 2, 336, 15, '#9adcff');
    } else {
      const c = this.course;
      this.text(c.name, W / 2, 305, 26, '#fff');
      const top = this.getBoard(c.id)[0];
      this.text(top ? `BEST ${top.time.toFixed(2)} · ${top.ini}` : `${c.laps} LAPS · BEAT 7 RIVALS`, W / 2, 336, 15, '#9adcff');
    }
    this.text(`${this.menuIndex + 1}/${entries}`, W / 2, 380, 14, '#889');

    // 1P / 2P mode
    this.text(this.twoPlayer ? '2P SPLIT SCREEN — PRESS 2 FOR 1P' : '1 PLAYER — PRESS 2 FOR SPLIT SCREEN',
      W / 2, 410, 15, this.twoPlayer ? '#ffe14a' : '#99a');

    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER OR TAP GAS', W / 2, 448, 26, '#7dff6a');
    }
    this.text(this.twoPlayer
      ? 'P1 ARROWS · P2 WASD · R RESTART · M MUTE'
      : '←→ STEER · ↑ GAS · ↓ BRAKE · R RESTART · M MUTE', W / 2, H - 24, 14, '#99a');
  }

  renderCarSelect() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6,6,18,0.55)';
    ctx.fillRect(0, 0, W, H);
    const two = this.twoPlayer && this.mode === 'single';
    this.text(two ? `PLAYER ${this.carSelP + 1} — SELECT YOUR RIDE` : 'SELECT YOUR RIDE',
      W / 2, 88, two ? 34 : 40, two ? P_COLORS[this.carSelP] : '#ffe14a');
    this.text(this.mode === 'tour' ? `MOORE TOUR · ${this.courses.length} RACES` : this.course.name,
      W / 2, 120, 16, this.mode === 'tour' ? '#ff8ad8' : '#9adcff');

    const statNames = ['SPEED', 'ACCEL', 'GRIP'];
    const selIdx = this.carSel[this.carSelP];
    for (let i = 0; i < CARS.length; i++) {
      const cx = W / 2 + (i - 1) * 265;
      const sel = i === selIdx;
      ctx.fillStyle = sel ? 'rgba(30,30,62,0.9)' : 'rgba(10,10,24,0.72)';
      ctx.fillRect(cx - 115, 150, 230, 268);
      ctx.strokeStyle = sel ? (two ? P_COLORS[this.carSelP] : '#f8a800') : '#445'; ctx.lineWidth = 3;
      ctx.strokeRect(cx - 115, 150, 230, 268);
      const img = this.vehicles.players[i];
      const w = sel ? 160 : 140;
      const h = w * (img.height / img.width);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, cx - w / 2, 235 - h, w, h);
      this.text(CARS[i].name, cx, 268, 18, sel ? '#fff' : '#99a');
      this.text(CARS[i].tag, cx, 290, 11, '#9adcff');
      if (two && this.carSelP === 1 && i === this.carSel[0]) {
        this.text('P1', cx - 95, 175, 14, P_COLORS[0], 'left');
      }
      for (let s = 0; s < 3; s++) {
        const y = 322 + s * 24;
        this.text(statNames[s], cx - 95, y, 12, '#889', 'left');
        for (let p = 0; p < 5; p++) {
          ctx.fillStyle = p < CARS[i].pips[s] ? '#7dff6a' : '#31374a';
          ctx.fillRect(cx - 20 + p * 20, y - 9, 15, 10);
        }
      }
    }
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER OR TAP GAS', W / 2, 470, 24, '#7dff6a');
    }
  }

  renderStandings() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,8,20,0.85)';
    ctx.fillRect(W / 2 - 260, 44, 520, 452);
    ctx.strokeStyle = '#ff8ad8'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 260, 44, 520, 452);
    this.text('TOUR STANDINGS', W / 2, 88, 30, '#ffe14a');
    this.text(`AFTER RACE ${this.tourIndex + 1} OF ${this.courses.length}`, W / 2, 114, 14, '#9adcff');
    this.tourTable().forEach(([name, pts], i) => {
      const y = 154 + i * 36;
      const you = name === 'YOU';
      const col = you ? '#ffe14a' : '#fff';
      this.text(`${i + 1}.`, W / 2 - 205, y, 20, you ? '#ffe14a' : '#889', 'left');
      this.text(name, W / 2 - 155, y, 20, col, 'left');
      this.text(`${pts} PTS`, W / 2 + 205, y, 20, you ? '#ffe14a' : '#9adcff', 'right');
    });
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      const last = this.tourOver || this.tourIndex >= this.courses.length - 1;
      this.text(last ? 'PRESS ENTER FOR FINAL RESULTS' : 'PRESS ENTER FOR NEXT RACE', W / 2, 478, 16, '#7dff6a');
    }
  }

  renderInitials() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,8,20,0.85)';
    ctx.fillRect(W / 2 - 240, 90, 480, 340);
    ctx.strokeStyle = '#7dff6a'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 240, 90, 480, 340);
    this.text('NEW TOP-5 TIME!', W / 2, 140, 32, '#7dff6a');
    this.text(`${this.course.name} · ${this.finTime.toFixed(2)}`, W / 2, 170, 16, '#9adcff');
    this.text('ENTER YOUR INITIALS', W / 2, 210, 14, '#889');
    for (let i = 0; i < 3; i++) {
      const x = W / 2 + (i - 1) * 80;
      const sel = i === this.entry.slot;
      ctx.fillStyle = sel ? 'rgba(60,60,110,0.9)' : 'rgba(20,20,40,0.9)';
      ctx.fillRect(x - 30, 235, 60, 70);
      ctx.strokeStyle = sel ? '#ffe14a' : '#445'; ctx.lineWidth = 3;
      ctx.strokeRect(x - 30, 235, 60, 70);
      this.text(LETTERS[this.entry.chars[i]], x, 288, 44, sel ? '#ffe14a' : '#fff');
      if (sel && Math.floor(performance.now() / 300) % 2 === 0) {
        this.text('▲', x, 230, 14, '#ffb14a');
        this.text('▼', x, 322, 14, '#ffb14a');
      }
    }
    this.text('←→ LETTER · ENTER/GAS NEXT', W / 2, 400, 14, '#99a');
  }

  renderLeaderboard() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,8,20,0.85)';
    ctx.fillRect(W / 2 - 240, 70, 480, 390);
    ctx.strokeStyle = '#f8a800'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 240, 70, 480, 390);
    this.text('TOP TIMES', W / 2, 116, 30, '#ffe14a');
    this.text(this.course.name, W / 2, 142, 15, '#9adcff');
    const board = this.getBoard(this.course.id);
    board.forEach((e, i) => {
      const y = 190 + i * 42;
      const isNew = this.newEntry && e.ini === this.newEntry.ini && e.time === this.newEntry.time;
      const col = isNew ? '#7dff6a' : '#fff';
      this.text(`${i + 1}.`, W / 2 - 180, y, 22, isNew ? '#7dff6a' : '#889', 'left');
      this.text(e.ini, W / 2 - 120, y, 22, col, 'left');
      this.text(e.time.toFixed(2), W / 2 + 180, y, 22, isNew ? '#7dff6a' : '#9adcff', 'right');
    });
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER', W / 2, 440, 16, '#7dff6a');
    }
  }

  renderChampion() {
    const ctx = this.ctx;
    const table = this.tourTable();
    const rank = table.findIndex(([name]) => name === 'YOU') + 1;
    ctx.fillStyle = 'rgba(8,8,20,0.88)';
    ctx.fillRect(W / 2 - 280, 44, 560, 452);
    ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4;
    ctx.strokeRect(W / 2 - 280, 44, 560, 452);
    if (rank === 1) {
      this.text('★ TOUR CHAMPION ★', W / 2, 100, 40, '#ffe14a');
      this.text('CRUIS-TACULAR, COAST TO COAST!', W / 2, 132, 16, '#ff8ad8');
    } else {
      const sup = ['st', 'nd', 'rd'][rank - 1] || 'th';
      this.text('TOUR COMPLETE', W / 2, 100, 36, '#9adcff');
      this.text(this.tourOver ? 'RAN OUT OF TIME ON THE ROAD' : `${rank}${sup} OVERALL — KEEP CRUIS’N`, W / 2, 132, 16, '#fff');
    }
    table.forEach(([name, pts], i) => {
      const y = 172 + i * 34;
      const you = name === 'YOU';
      this.text(`${i + 1}.`, W / 2 - 205, y, 19, you ? '#ffe14a' : '#889', 'left');
      this.text(name, W / 2 - 155, y, 19, you ? '#ffe14a' : '#fff', 'left');
      this.text(`${pts} PTS`, W / 2 + 205, y, 19, you ? '#ffe14a' : '#9adcff', 'right');
    });
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER', W / 2, 478, 16, '#7dff6a');
    }
  }
}
