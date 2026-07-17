// Cruis'n Moore — pseudo-3D sprite-scaling arcade racer.
// Road engine in the classic OutRun/Cruis'n style: projected road segments
// with curves, hills, fog, scaled roadside sprites and traffic.

import { SEGMENT_LENGTH, RUMBLE_LENGTH, buildCourses } from './track.js';
import { buildSprites, buildVehicles, buildBackground } from './sprites.js';

export const W = 960, H = 540;

const ROAD_WIDTH = 2000;                 // half-width of road in world units
const CAMERA_HEIGHT = 1100;
const FOV = 100;
const CAMERA_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const DRAW_DISTANCE = 240;               // segments
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
    this.state = 'title';
    this.flash = null;       // { text, sub, t }
    this.attractPos = 0;
    this.loadCourse(0);
  }

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
    this.position = 0;         // camera z along track (wrapped)
    this.totalDist = 0;        // unwrapped distance
    this.playerX = 0;
    this.speed = 0;
    this.steer = 0;
    this.bgFarX = 0; this.bgNearX = 0;
    this.raceTime = 0;
    this.timeLeft = this.course.timeStart;
    this.lap = 1;
    this.flip = null;
    this.mercy = 0;            // post-crash invulnerability seconds
    this.shake = 0;
    this.finPos = 0;
    this.flash = null;

    // flat list of bonus-time gates across the whole race (checkpoints + lap lines)
    this.gates = [];
    for (let lapI = 0; lapI < this.course.laps; lapI++) {
      for (const cpSeg of this.course.checkpoints) {
        this.gates.push(lapI * this.trackLength + cpSeg * SEGMENT_LENGTH);
      }
      if (lapI > 0) this.gates.push(lapI * this.trackLength);
    }
    this.gates.sort((a, b) => a - b);
    this.nextGate = 0;

    // rivals start on the grid ahead of the player (you're 8th of 8)
    this.cars = [];
    for (let r = 0; r < 7; r++) {
      this.cars.push({
        kind: 'rival', name: RIVAL_NAMES[r], img: this.vehicles.rivals[r],
        dist: (r + 1) * SEGMENT_LENGTH * 2.2,
        z: 0, offset: (r % 2 === 0 ? -0.42 : 0.42), w: 0.34,
        base: MAX_SPEED * (0.70 + r * 0.045), speed: 0,
        finished: false, finishTime: 0,
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
    for (const c of this.cars) c.z = wrap(c.z, this.trackLength);
  }

  startRace() {
    this.resetRace();
    this.state = 'countdown';
    this.countdown = 3.999;
    this.lastBeep = 4;
    this.sound.startEngine();
    this.sound.startMusic();
  }

  // --- helpers -----------------------------------------------------------------

  segmentAt(z) {
    return this.segments[Math.floor(wrap(z, this.trackLength) / SEGMENT_LENGTH) % this.segments.length];
  }

  playerRank() {
    let ahead = 0;
    for (const c of this.cars) if (c.kind === 'rival' && c.dist > this.totalDist) ahead++;
    return 1 + ahead;
  }

  // --- update ------------------------------------------------------------------

  update(dt) {
    const inp = this.input.poll();

    if (this.input.consume('mute')) this.sound.toggleMute();

    switch (this.state) {
      case 'title': this.updateTitle(dt); break;
      case 'countdown': this.updateCountdown(dt, inp); break;
      case 'race': this.updateRace(dt, inp); break;
      case 'finish':
      case 'gameover':
        this.updateCars(dt);
        if (this.input.consume('start')) {
          this.sound.stopEngine(); this.sound.stopMusic();
          this.state = 'title';
        }
        break;
    }
    if (this.flash) {
      this.flash.t -= dt;
      if (this.flash.t <= 0) this.flash = null;
    }
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  updateTitle(dt) {
    // attract mode: cruise the camera down the selected course
    this.attractPos = wrap(this.attractPos + MAX_SPEED * 0.35 * dt, this.trackLength);
    if (this.input.consume('left')) {
      this.loadCourse((this.courseIndex + this.courses.length - 1) % this.courses.length);
      this.sound.blip(500, 0.08);
    }
    if (this.input.consume('right')) {
      this.loadCourse((this.courseIndex + 1) % this.courses.length);
      this.sound.blip(500, 0.08);
    }
    if (this.input.consume('start')) this.startRace();
  }

  updateCountdown(dt, inp) {
    this.countdown -= dt;
    const n = Math.ceil(this.countdown);
    if (n < this.lastBeep && n >= 0) {
      this.lastBeep = n;
      this.sound.countBeep(n === 0);
    }
    if (inp.accel) this.speed = Math.min(this.speed + ACCEL * 0.4 * dt, MAX_SPEED * 0.1); // rev at the line
    this.sound.setEngine(inp.accel ? 0.35 : 0.05, false);
    if (this.countdown <= 0) {
      this.state = 'race';
      this.flash = { text: this.course.name, sub: `${this.course.laps} LAPS`, t: 2.2 };
    }
  }

  updateRace(dt, inp) {
    this.raceTime += dt;
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
    } else {
      if (inp.left) { this.playerX -= dx; this.steer = Math.max(-1, this.steer - dt * 6); }
      else if (inp.right) { this.playerX += dx; this.steer = Math.min(1, this.steer + dt * 6); }
      else this.steer *= Math.max(0, 1 - dt * 8);

      this.playerX -= dx * speedPct * playerSeg.curve * CENTRIFUGAL;

      if (inp.accel) this.speed += ACCEL * (1 - speedPct * 0.25) * dt;
      else if (inp.brake) this.speed += BRAKING * dt;
      else this.speed += DECEL * dt;

      // hard cornering squeal
      if (speedPct > 0.7 && Math.abs(playerSeg.curve) >= 4 && (inp.left || inp.right) && Math.random() < dt * 6) {
        this.sound.skid();
      }
    }

    // off-road
    const offroad = Math.abs(this.playerX) > 1;
    if (offroad) {
      if (this.speed > OFFROAD_LIMIT) this.speed += OFFROAD_DECEL * dt;
      this.shake = Math.max(this.shake, 0.25);
      // scenery collisions
      if (!this.flip && this.mercy <= 0) {
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
    this.speed = clamp(this.speed, 0, MAX_SPEED);

    // advance
    const prevTotal = this.totalDist;
    this.totalDist += this.speed * dt;
    this.position = wrap(this.position + this.speed * dt, this.trackLength);

    this.mercy = Math.max(0, this.mercy - dt);
    this.updateCars(dt);
    if (!this.flip && this.mercy <= 0) this.carCollisions();

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

    this.sound.setEngine(speedPct, offroad && this.speed > 300);

    // finish / game over
    if (this.totalDist >= this.trackLength * this.course.laps) {
      this.state = 'finish';
      this.flash = null;
      this.finPos = this.playerRank();
      this.sound.finishFanfare();
      this.saveBest();
    } else if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.state = 'gameover';
      this.flash = null;
      this.sound.stopEngine();
      this.sound.gameOver();
    }
  }

  crashIntoScenery() {
    if (this.speed > MAX_SPEED * 0.6) {
      this.flip = { t: 0, dur: 1.1 };
      this.shake = 1;
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
    for (const car of this.cars) {
      if (car.kind === 'rival') {
        if (!racing && this.state !== 'finish' && this.state !== 'gameover') continue;
        // rubber-band toward the player to keep the race close; the dead zone
        // stops rivals from speed-matching bumper-to-bumper, so passes stick
        const diff = this.totalDist - car.dist;
        const dz = Math.abs(diff) > 4000 ? diff - Math.sign(diff) * 4000 : 0;
        const rubber = clamp(1 + dz / 120000, 0.8, 1.08);
        const target = car.base * rubber;
        car.speed += clamp(target - car.speed, -ACCEL * dt, ACCEL * 0.8 * dt);
        car.dist += car.speed * dt;
        car.z = wrap(car.dist, this.trackLength);
        this.rivalSteer(car, dt);
      } else if (car.kind === 'traffic') {
        car.z = wrap(car.z + car.speed * dt, this.trackLength);
      } else { // oncoming
        car.z = wrap(car.z - car.speed * dt, this.trackLength);
        // keep oncoming traffic cycling through the player's view
        const rel = wrap(car.z - this.position, this.trackLength);
        if (rel > this.trackLength - SEGMENT_LENGTH * 10) { // just passed behind us
          car.z = wrap(this.position + (DRAW_DISTANCE + 20 + Math.random() * 100) * SEGMENT_LENGTH, this.trackLength);
          car.offset = -0.75 + Math.random() * 0.35;
        }
      }
    }
  }

  rivalSteer(car, dt) {
    // avoid the player and other cars just ahead
    const look = SEGMENT_LENGTH * 12;
    let steer = 0;
    const relPlayer = wrap(this.position + PLAYER_Z - car.z, this.trackLength);
    if (relPlayer < look && relPlayer > 0 && overlap(car.offset, car.w, this.playerX, PLAYER_W * 1.6)) {
      steer = this.playerX > car.offset ? -1 : 1;
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

      if (car.kind === 'oncoming') {
        // head-on: the famous Cruis'n wipeout
        if (this.speed + car.speed > MAX_SPEED * 0.7) {
          this.flip = { t: 0, dur: 1.2 };
          this.shake = 1;
          this.sound.crash();
        } else {
          this.speed = 0;
          this.mercy = 1;
          this.sound.bump();
        }
        car.z = wrap(this.position + (DRAW_DISTANCE + 50) * SEGMENT_LENGTH, this.trackLength);
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

  saveBest() {
    try {
      const key = `cruisin-moore-best-${this.course.id}`;
      const prev = parseFloat(localStorage.getItem(key));
      if (!prev || this.raceTime < prev) localStorage.setItem(key, this.raceTime.toFixed(2));
    } catch { /* private mode */ }
  }
  getBest(id) {
    try { return parseFloat(localStorage.getItem(`cruisin-moore-best-${id}`)) || null; }
    catch { return null; }
  }

  // --- render ------------------------------------------------------------------

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.05) {
      ctx.translate((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 10);
    }
    const camZ = this.state === 'title' ? this.attractPos : this.position;
    this.renderWorld(camZ, this.state === 'title' ? 0 : this.playerX);
    if (this.state !== 'title') this.renderPlayer();
    ctx.restore();

    switch (this.state) {
      case 'title': this.renderTitle(); break;
      case 'countdown': this.renderHUD(); this.renderCountdown(); break;
      case 'race': this.renderHUD(); break;
      case 'finish': this.renderHUD(); this.renderResults(true); break;
      case 'gameover': this.renderHUD(); this.renderResults(false); break;
    }
  }

  renderWorld(camZ, camXNorm) {
    const ctx = this.ctx;
    const course = this.course;

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, course.sky[0]);
    sky.addColorStop(1, course.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // parallax background
    const base = this.segmentAt(camZ);
    const speedPct = this.speed / MAX_SPEED;
    if (this.state !== 'title') {
      this.bgFarX = wrap(this.bgFarX + base.curve * speedPct * 18, 1024);
      this.bgNearX = wrap(this.bgNearX + base.curve * speedPct * 38, 1024);
    } else {
      this.bgFarX = wrap(this.bgFarX + base.curve * 8 * (1 / 60), 1024);
      this.bgNearX = wrap(this.bgNearX + base.curve * 16 * (1 / 60), 1024);
    }
    const basePct = (wrap(camZ, this.trackLength) % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const playerY = base.p1y + (base.p2y - base.p1y) * basePct;
    const bgY = clamp(-playerY * 0.004, -40, 20);
    this.drawTiled(this.bg.far, -this.bgFarX, H * 0.5 - 200 + 40 + bgY * 0.5, 1.0);
    this.drawTiled(this.bg.near, -this.bgNearX, H * 0.5 - 200 + 78 + bgY, 1.0);

    // road segments
    const camX = camXNorm * ROAD_WIDTH;
    const camY = playerY + CAMERA_HEIGHT;
    let maxY = H;
    let x = 0;
    let dxAcc = -(base.curve * basePct);
    const baseIndex = base.index;

    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const seg = this.segments[(baseIndex + n) % this.segments.length];
      const looped = seg.index < baseIndex;
      const segZ1 = seg.index * SEGMENT_LENGTH + (looped ? this.trackLength : 0);
      const camAbsZ = wrap(camZ, this.trackLength);

      seg.fog = fogAmount(n / DRAW_DISTANCE);

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
    for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
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
      y: H / 2 - scale * worldY * H / 2,
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
      ctx.fillStyle = c.fog;
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
    this.drawClipped(car.img, x - destW / 2, y - destH, destW, destH, seg.clip, seg.fog);
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
    const img = this.vehicles.player;
    const speedPct = this.speed / MAX_SPEED;
    // same projection as other cars at the player's z, so sizes match side-by-side
    const w = Math.min(W * 0.3, (CAMERA_DEPTH / PLAYER_Z) * (PLAYER_W * ROAD_WIDTH * 1.1) * W / 2);
    const h = w * (img.height / img.width);
    const bounce = speedPct > 0.05 ? (Math.random() - 0.5) * 3 * speedPct : 0;
    const cx = W / 2, cy = H - h / 2 - 14 + bounce;

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

  renderHUD() {
    const ctx = this.ctx;
    // time
    const warn = this.timeLeft < 10 && this.state === 'race';
    const timeCol = warn && Math.floor(this.raceTime * 4) % 2 === 0 ? '#ff4030' : '#ffe14a';
    this.text('TIME', 24, 34, 16, '#fff', 'left');
    this.text(String(Math.max(0, Math.ceil(this.timeLeft))), 24, 72, 40, timeCol, 'left');

    // position + lap
    const rank = this.state === 'finish' ? this.finPos : this.playerRank();
    const sup = ['st', 'nd', 'rd'][rank - 1] || 'th';
    this.text(`${rank}${sup} / 8`, W - 24, 44, 28, rank === 1 ? '#7dff6a' : '#fff', 'right');
    this.text(`LAP ${Math.min(this.lap, this.course.laps)}/${this.course.laps}`, W - 24, 74, 18, '#9adcff', 'right');

    // speed
    const mph = Math.round((this.speed / MAX_SPEED) * 149);
    this.text(String(mph), W - 24, H - 34, 44, '#fff', 'right');
    this.text('MPH', W - 24, H - 12, 14, '#ffb14a', 'right');

    // center flash
    if (this.flash) {
      const a = clamp(this.flash.t / 0.4, 0, 1);
      ctx.globalAlpha = a;
      this.text(this.flash.text, W / 2, H * 0.3, 44, '#ffe14a');
      if (this.flash.sub) this.text(this.flash.sub, W / 2, H * 0.3 + 36, 20, '#fff');
      ctx.globalAlpha = 1;
    }
  }

  renderCountdown() {
    const n = Math.ceil(this.countdown);
    const t = this.countdown - Math.floor(this.countdown);
    const size = 90 + (1 - t) * 40;
    this.text(n > 0 ? String(n) : 'GO!', W / 2, H * 0.42, size, n > 0 ? '#ffe14a' : '#7dff6a');
  }

  renderResults(finished) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8,8,20,0.72)';
    ctx.fillRect(W / 2 - 280, H * 0.2, 560, 250);
    ctx.strokeStyle = '#f8a800'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 280, H * 0.2, 560, 250);
    if (finished) {
      const sup = ['st', 'nd', 'rd'][this.finPos - 1] || 'th';
      this.text('FINISH!', W / 2, H * 0.2 + 58, 44, '#7dff6a');
      this.text(`${this.finPos}${sup} PLACE`, W / 2, H * 0.2 + 110, 34, this.finPos === 1 ? '#ffe14a' : '#fff');
      this.text(`TIME  ${this.raceTime.toFixed(2)}`, W / 2, H * 0.2 + 152, 22, '#9adcff');
      const best = this.getBest(this.course.id);
      if (best) this.text(`BEST  ${best.toFixed(2)}`, W / 2, H * 0.2 + 182, 18, '#889');
      if (this.finPos === 1) this.text('CRUIS-TACULAR!', W / 2, H * 0.2 + 214, 18, '#ff8ad8');
    } else {
      this.text('TIME UP', W / 2, H * 0.2 + 70, 48, '#ff4030');
      this.text(`YOU REACHED LAP ${this.lap}`, W / 2, H * 0.2 + 120, 20, '#fff');
    }
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER', W / 2, H * 0.2 + 236, 16, '#ffb14a');
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

    // course select
    const c = this.course;
    this.text('◀', W / 2 - 250, 320, 30, '#ffb14a');
    this.text('▶', W / 2 + 250, 320, 30, '#ffb14a');
    ctx.fillStyle = 'rgba(8,8,20,0.7)';
    ctx.fillRect(W / 2 - 210, 270, 420, 84);
    ctx.strokeStyle = '#f8a800'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - 210, 270, 420, 84);
    this.text(c.name, W / 2, 305, 26, '#fff');
    const best = this.getBest(c.id);
    this.text(best ? `BEST TIME ${best.toFixed(2)}` : `${c.laps} LAPS · BEAT 7 RIVALS`, W / 2, 336, 15, '#9adcff');
    this.text(`COURSE ${this.courseIndex + 1}/${this.courses.length}`, W / 2, 380, 14, '#889');

    if (Math.floor(performance.now() / 500) % 2 === 0) {
      this.text('PRESS ENTER TO RACE', W / 2, 440, 26, '#7dff6a');
    }
    this.text('←→ STEER · ↑ GAS · ↓ BRAKE · M MUTE', W / 2, H - 24, 14, '#99a');
  }
}
