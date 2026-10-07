// main.js — Excitemoore: physics, race flow, HUD, render loop.
// Excitebike rules: turbo heats the engine, overheat stalls it; match your
// pitch to the landing slope or eat dirt; cool pads reset the temp gauge.
import {
  W, H, HUD_H, LANES, N_TRACKS, laneBaseY,
  buildTrack, heightAt, slopeAt, featureAt,
} from './track.js';
import { drawBackdrop, drawLane, drawBike } from './entities.js';
import { Audio } from './audio.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const audio = new Audio();
const input = new Input();

const MAX_NORMAL = 158, MAX_TURBO = 210, GRAV = 500;

const game = {
  state: 'title',
  time: 0,
  trackIdx: 0,
  track: null,
  attemptsLeft: 3,
  totalTime: 0,
  raceTime: 0,
  cdT: 0, cdBeep: 0,
  finT: 0, qualified: false,
  camX: 0,
  p: null,
  riders: [],
  autopilot: false,
  msg: '', msgT: 0,
};

function msg(text, t = 2.2) { game.msg = text; game.msgT = t; }

function freshBike(x, lane, color) {
  return {
    x, lane, laneF: lane, h: 0, vy: 0, pitch: 0, speed: 0,
    airborne: false, airT: 0, crashT: 0, stallT: 0, heat: 0,
    laneCd: 0, iframe: 0, prevSlope: 0, lastCool: null, frame: 0, color,
  };
}

function startTrack(idx) {
  game.trackIdx = idx;
  game.track = buildTrack(idx);
  game.p = freshBike(80, 1, '#e03838');
  game.riders = game.track.riders.map(r => ({ ...freshBike(r.x, r.lane, r.color), ai: r }));
  game.raceTime = 0;
  game.camX = 0;
  game.state = 'countdown';
  game.cdT = 3.4; game.cdBeep = 4;
}

function newGame() {
  game.attemptsLeft = 3;
  game.totalTime = 0;
  startTrack(0);
}

input.on('mute', () => audio.toggleMute());
input.on('start', () => {
  audio.resume();
  if (game.state === 'title' || game.state === 'gameover' || game.state === 'champion') newGame();
});
input.on('action', () => audio.resume());

// ---------- shared bike physics ----------
// ctrl: { accel, brake, turbo, up, down, leanBack, leanFwd, maxSpeed }
// returns events for sound/msg hooks
function stepBike(b, ctrl, track, dt) {
  const ev = {};
  b.frame += dt * (1 + b.speed / 40);
  b.laneCd = Math.max(0, b.laneCd - dt);
  b.iframe = Math.max(0, b.iframe - dt);

  if (b.crashT > 0) {
    b.crashT -= dt;
    b.speed = 0;
    if (b.crashT <= 0) { b.iframe = 1.2; b.speed = 30; b.pitch = 0; }
    return ev;
  }
  if (b.stallT > 0) {
    b.stallT -= dt;
    b.speed = Math.max(0, b.speed - 110 * dt);
    if (b.stallT <= 0) b.heat = 0;
  }

  const stalled = b.stallT > 0;
  const turbo = ctrl.turbo && !stalled;
  if (turbo) b.speed = Math.min(ctrl.maxSpeed ?? MAX_TURBO, b.speed + 150 * dt);
  else if (ctrl.accel && !stalled) b.speed = Math.min(Math.min(MAX_NORMAL, ctrl.maxSpeed ?? MAX_NORMAL), b.speed + 120 * dt);
  else if (ctrl.brake && !b.airborne) b.speed = Math.max(0, b.speed - 220 * dt);
  else b.speed = Math.max(0, b.speed - 55 * dt);

  if (turbo) {
    b.heat += 25 * dt;
    if (b.heat >= 100) { b.heat = 100; b.stallT = 2.6; ev.overheated = true; }
  } else b.heat = Math.max(0, b.heat - 11 * dt);

  // lane changes only on flat ground
  if (!b.airborne && b.laneCd <= 0 && (ctrl.up || ctrl.down)) {
    const target = Math.max(0, Math.min(LANES - 1, b.lane + (ctrl.down ? 1 : -1)));
    if (target !== b.lane &&
        heightAt(track, b.lane, b.x) < 5 && heightAt(track, target, b.x) < 5) {
      b.lane = target; b.laneCd = 0.28;
    }
  }
  b.laneF += (b.lane - b.laneF) * Math.min(1, 10 * dt);

  b.x += b.speed * dt;
  const gh = heightAt(track, b.lane, b.x);

  // takeoff energy comes from the averaged slope of the last 24px of approach,
  // so a long ramp and a sharp bump launch believably, not identically
  const takeoffSlope = () => Math.max(0, (heightAt(track, b.lane, b.x - 2) - heightAt(track, b.lane, b.x - 26)) / 24);
  const launch = () => {
    b.airborne = true; b.airT = 0;
    b.vy = Math.min(205, takeoffSlope() * b.speed * 2.6);
    b.pitch = Math.atan(b.prevSlope);
    if (b.vy > 40) ev.launched = true;
  };

  if (!b.airborne) {
    if (gh < b.h - 7 && b.speed > 40) {
      launch(); // the ground fell away (sheer ramp back)
    } else {
      const slope = slopeAt(track, b.lane, b.x);
      // crest pop: carrying real speed over a crest gets you airborne
      if (b.prevSlope > 0.15 && slope < -0.05 && b.speed > 165) {
        launch();
      } else {
        b.speed = Math.max(0, b.speed - Math.max(0, slope) * 260 * dt);
        b.speed = Math.min(215, b.speed + Math.max(0, -slope) * 120 * dt);
        b.h = gh;
        b.pitch = Math.atan(slope) * 0.9;
        b.prevSlope = slope;
        const f = featureAt(track, b.lane, b.x);
        if (f && f.type === 'mud') { b.speed = Math.min(Math.max(34, b.speed - 230 * dt), 96); ev.mud = true; }
        else if (f && f.type === 'cool' && b.lastCool !== f) { b.lastCool = f; b.heat = 0; ev.cooled = true; }
      }
    }
  } else {
    b.airT += dt;
    b.vy -= GRAV * dt;
    b.h += b.vy * dt;
    if (ctrl.leanBack) b.pitch = Math.min(1.0, b.pitch + 2.4 * dt);
    if (ctrl.leanFwd) b.pitch = Math.max(-1.0, b.pitch - 2.4 * dt);
    if (b.h <= gh && b.airT > 0.06) {
      const theta = Math.atan(slopeAt(track, b.lane, b.x));
      const diff = Math.abs(b.pitch - theta);
      b.airborne = false; b.h = gh; b.vy = 0; b.pitch = theta;
      b.prevSlope = slopeAt(track, b.lane, b.x);
      if (diff < 0.38) ev.landed = 'clean';
      else if (diff < 0.75) { ev.landed = 'bounce'; b.speed *= 0.6; }
      else { ev.landed = 'crash'; b.crashT = 2.3; }
    }
    if (b.h < 0) b.h = 0;
  }
  return ev;
}

// ---------- control builders ----------
function autopilotCtrl(b, track) {
  const ctrl = { accel: true, turbo: b.heat < 52, maxSpeed: MAX_TURBO };
  if (b.airborne) {
    const target = Math.atan(slopeAt(track, b.lane, b.x + b.speed * 0.25));
    ctrl.leanBack = b.pitch < target - 0.05;
    ctrl.leanFwd = b.pitch > target + 0.05;
  } else {
    // dodge mud ahead if a neighbor lane is clear
    const ahead = featureAt(track, b.lane, b.x + 130);
    if (ahead && ahead.type === 'mud') {
      for (const d of [-1, 1]) {
        const k = b.lane + d;
        if (k < 0 || k >= LANES) continue;
        const f = featureAt(track, k, b.x + 130);
        if (!f || f.type !== 'mud') { if (d < 0) ctrl.up = true; else ctrl.down = true; break; }
      }
    }
  }
  return ctrl;
}

function playerCtrl() {
  if (game.autopilot) return autopilotCtrl(game.p, game.track);
  const d = input.dir();
  const b = game.p;
  return {
    accel: d.right && !b.airborne,
    brake: d.left && !b.airborne,
    turbo: d.action,
    up: d.up, down: d.down,
    leanBack: b.airborne && d.left,
    leanFwd: b.airborne && d.right,
    maxSpeed: MAX_TURBO,
  };
}

function riderCtrl(r, track, dt) {
  const ai = r.ai;
  ai.turboT -= dt; ai.laneT -= dt;
  if (ai.turboT <= 0) ai.turboT = 4 + Math.random() * 5;
  if (ai.laneT <= 0) {
    ai.laneT = 2.5 + Math.random() * 4;
    ai.wantLane = Math.random() < 0.5 ? -1 : 1;
  }
  const ctrl = {
    accel: r.speed < ai.targetSpeed,
    turbo: ai.turboT < 1.6 && r.speed < ai.targetSpeed + 30,
    maxSpeed: ai.targetSpeed + 34,
  };
  if (ai.wantLane) {
    if (ai.wantLane < 0) ctrl.up = true; else ctrl.down = true;
    if (r.laneCd > 0) ai.wantLane = 0;
  }
  if (r.airborne) {
    const target = Math.atan(slopeAt(track, r.lane, r.x + r.speed * 0.25));
    ctrl.leanBack = r.pitch < target - 0.05;
    ctrl.leanFwd = r.pitch > target + 0.05;
  }
  return ctrl;
}

// ---------- race update ----------
function updateRace(dt) {
  const p = game.p, track = game.track;
  game.raceTime += dt;

  const ev = stepBike(p, playerCtrl(), track, dt);
  if (ev.launched) audio.jump();
  if (ev.landed === 'clean') audio.land();
  if (ev.landed === 'bounce') { audio.bounce(); msg('SLOPPY LANDING'); }
  if (ev.landed === 'crash') { audio.crash(); msg('WIPEOUT!'); }
  if (ev.overheated) { audio.overheat(); msg('OVERHEATED! LET IT COOL'); }
  if (ev.cooled) { audio.cool(); msg('TEMP RESET', 1.2); }

  for (const r of game.riders) {
    stepBike(r, riderCtrl(r, track, dt), track, dt);
    // recycle traffic that falls far behind
    if (r.x < game.camX - 500) {
      r.x = p.x + 500 + Math.random() * 400;
      r.crashT = 0; r.airborne = false; r.h = 0; r.speed = r.ai.targetSpeed * 0.8;
    }
    // collisions
    if (r.crashT <= 0 && Math.abs(r.x - p.x) < 15 && Math.abs(r.laneF - p.laneF) < 0.4) {
      if (p.airborne && p.h > r.h + 5 && p.vy < 0) {
        r.crashT = 2.2;
        audio.rideover();
        msg('LANDED ON A RIVAL!');
      } else if (!p.airborne && !r.airborne && p.crashT <= 0 && p.iframe <= 0) {
        p.crashT = 2.3;
        audio.crash();
        msg('CLIPPED A RIVAL!');
      }
    }
  }

  game.camX = Math.max(0, p.x - 70);

  if (p.x >= track.len) {
    game.qualified = game.raceTime <= track.qualify;
    game.state = 'finished';
    game.finT = 3.6;
    if (game.qualified) { game.totalTime += game.raceTime; audio.finish(); }
    else audio.fail();
  }
}

function update(dt) {
  game.time += dt;
  input.pollGamepad();
  if (game.msgT > 0) game.msgT -= dt;

  switch (game.state) {
    case 'countdown': {
      game.cdT -= dt;
      const sec = Math.ceil(game.cdT);
      if (sec < game.cdBeep && game.cdT > 0) { game.cdBeep = sec; audio.beep(false); }
      if (game.cdT <= 0) { game.state = 'race'; audio.beep(true); }
      break;
    }
    case 'race': updateRace(dt); break;
    case 'finished':
      game.finT -= dt;
      if (game.finT <= 0) {
        if (game.qualified) {
          if (game.trackIdx + 1 >= N_TRACKS) { game.state = 'champion'; audio.champion(); }
          else startTrack(game.trackIdx + 1);
        } else {
          game.attemptsLeft--;
          if (game.attemptsLeft <= 0) { game.state = 'gameover'; }
          else startTrack(game.trackIdx);
        }
      }
      break;
  }

  const p = game.p;
  audio.engine(
    p ? p.speed : 0,
    p ? (game.state === 'race' && playerCtrl().turbo && p.stallT <= 0) : false,
    p ? p.airborne : false,
    game.state === 'title' || game.state === 'champion' || game.state === 'gameover' || !p || p.crashT > 0,
  );
}

// ---------- render ----------
function renderHUD() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD_H);
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  const t = game.raceTime;
  ctx.fillStyle = (game.state === 'race' && t > game.track.qualify) ? '#f06050' : '#e8e4c8';
  ctx.fillText(`TIME ${t.toFixed(1)}`, 6, 11);
  ctx.fillStyle = '#8a9a78';
  ctx.fillText(`QUAL ${game.track.qualify}.0`, 6, 23);
  ctx.fillStyle = '#e8e4c8';
  ctx.fillText(`${Math.round(game.p.speed)} KM/H`, 82, 11);
  ctx.fillStyle = '#8a8a9a';
  ctx.fillText(`TRACK ${game.trackIdx + 1}/${N_TRACKS}`, 82, 23);
  // temp gauge
  ctx.fillStyle = '#e8e4c8'; ctx.fillText('TEMP', 170, 11);
  ctx.fillStyle = '#241c10'; ctx.fillRect(204, 3, 64, 9);
  const hf = game.p.heat / 100;
  const hot = game.p.heat > 78;
  ctx.fillStyle = game.p.stallT > 0 ? '#f06050'
    : hot && Math.floor(game.time * 5) % 2 ? '#f8f8f8'
    : hf > 0.78 ? '#f06050' : hf > 0.5 ? '#e8a030' : '#58c878';
  ctx.fillRect(205, 4, 62 * hf, 7);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(204.5, 3.5, 63, 8);
  // attempts as little bikes
  for (let i = 0; i < game.attemptsLeft; i++) {
    const bx = 288 + i * 11;
    ctx.fillStyle = '#e03838'; ctx.fillRect(bx, 6, 7, 3);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx, 9, 2, 2); ctx.fillRect(bx + 5, 9, 2, 2);
  }
  // progress bar
  ctx.fillStyle = '#241c10'; ctx.fillRect(170, 17, 142, 6);
  ctx.fillStyle = '#58a8e8';
  ctx.fillRect(171, 18, 140 * Math.min(1, game.p.x / game.track.len), 4);
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(170 + 140, 16, 2, 8);
}

function renderRace() {
  drawBackdrop(ctx, game.camX, game.time);
  ctx.fillStyle = '#6a9a3a'; ctx.fillRect(0, laneBaseY(LANES - 1) + 14, W, H); // infield grass
  for (let k = 0; k < LANES; k++) drawLane(ctx, game.track, k, game.camX, game.time);

  // draw bikes back-to-front by lane
  const all = [...game.riders, game.p].sort((a, b) => a.laneF - b.laneF);
  for (const b of all) {
    const sx = b.x - game.camX;
    if (sx < -40 || sx > W + 40) continue;
    const sy = laneBaseY(0) + b.laneF * 32 - b.h;
    const isP = b === game.p;
    drawBike(ctx, sx, sy, b.pitch, b.color, {
      frame: b.frame,
      turbo: isP && game.state === 'race' && playerCtrl().turbo && b.stallT <= 0 && !b.crashT,
      crashed: b.crashT > 0,
      stalled: b.stallT > 0,
      flash: isP && b.iframe > 0,
    });
  }

  if (game.msgT > 0) {
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(game.msg).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(W / 2 - tw / 2 - 6, H - 20, tw + 12, 14);
    ctx.fillStyle = '#f8e8b0';
    ctx.fillText(game.msg, W / 2, H - 10);
    ctx.textAlign = 'left';
  }
}

function centerText(lines, y0, dy = 16) {
  ctx.textAlign = 'center';
  lines.forEach(([text, color, size], i) => {
    ctx.font = `bold ${size || 10}px monospace`;
    ctx.fillStyle = color || '#e8e4c8';
    ctx.fillText(text, W / 2, y0 + i * dy);
  });
  ctx.textAlign = 'left';
}

function renderTitle() {
  drawBackdrop(ctx, game.time * 30, game.time);
  ctx.fillStyle = '#6a9a3a'; ctx.fillRect(0, laneBaseY(LANES - 1) + 14, W, H);
  for (let k = 0; k < LANES; k++) {
    ctx.fillStyle = LANE_COLORS_TITLE[k];
    ctx.fillRect(0, laneBaseY(k), W, 32);
  }
  ctx.fillStyle = 'rgba(10,6,0,0.55)'; ctx.fillRect(0, 0, W, H);
  centerText([
    ['EXCITEMOORE', '#f8d858', 26],
    ['motocross for the Moore Arcade', '#c8b890', 10],
  ], 66, 20);
  centerText([
    ['RIGHT accelerate - SPACE turbo', '#e8e4c8'],
    ['UP/DOWN switch lanes - in air LEAN with LEFT/RIGHT', '#e8e4c8'],
    ['match the landing slope or wipe out', '#e8e4c8'],
    ['turbo overheats - ride the cool pads', '#e8e4c8'],
    ['5 tracks - beat the qualifying time - 3 entries', '#8a9a78', 9],
  ], 112, 13);
  if (Math.floor(game.time * 2) % 2 === 0) centerText([['PRESS ENTER / START', '#f8d858', 12]], 196);
  drawBike(ctx, 60 + (game.time * 60 % (W + 120)) - 60, laneBaseY(3) - 2, 0.1, '#e03838', { frame: game.time * 8, turbo: true });
}
const LANE_COLORS_TITLE = ['#c09048', '#b08240', '#a07438', '#906830'];

function renderFinished() {
  renderRace();
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(0, 0, W, H);
  if (game.qualified) {
    centerText([
      ['QUALIFIED!', '#58e858', 20],
      [`TIME ${game.raceTime.toFixed(1)}  (QUAL ${game.track.qualify}.0)`, '#e8e4c8', 11],
      [game.trackIdx + 1 >= N_TRACKS ? 'THAT WAS THE FINAL!' : `NEXT: TRACK ${game.trackIdx + 2}`, '#c8b890', 10],
    ], 92, 20);
  } else {
    centerText([
      ['TOO SLOW...', '#f06050', 20],
      [`TIME ${game.raceTime.toFixed(1)}  (NEEDED ${game.track.qualify}.0)`, '#e8e4c8', 11],
      [`ENTRIES LEFT: ${game.attemptsLeft - 1}`, '#c8b890', 10],
    ], 92, 20);
  }
}

function renderChampion() {
  ctx.fillStyle = '#0a0806'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const fx = (i * 137 + Math.floor(game.time * 40) * (i % 3 + 1)) % W;
    const fy = (i * 211) % (H - 60);
    ctx.fillStyle = ['#f8d858', '#e85858', '#58e8f8', '#58e858'][i % 4];
    ctx.fillRect(fx, fy, 2, 2);
  }
  centerText([
    ['CHAMPION!', '#f8d858', 26],
    ['ALL 5 TRACKS QUALIFIED', '#e8e4c8', 11],
    [`TOTAL TIME ${game.totalTime.toFixed(1)}`, '#58e8f8', 13],
  ], 80, 24);
  drawBike(ctx, W / 2, 170, 0.35, '#e03838', { frame: game.time * 8, turbo: true });
  if (Math.floor(game.time * 2) % 2 === 0) centerText([['PRESS ENTER / START', '#f8d858', 11]], 206);
}

function renderGameOver() {
  renderRace();
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
  centerText([
    ['OUT OF ENTRIES', '#f06050', 20],
    [`STOPPED AT TRACK ${game.trackIdx + 1} OF ${N_TRACKS}`, '#e8e4c8', 11],
  ], 96, 22);
  if (Math.floor(game.time * 2) % 2 === 0) centerText([['PRESS ENTER / START', '#f8d858', 11]], 170);
}

function render() {
  ctx.fillStyle = '#0a0806'; ctx.fillRect(0, 0, W, H);
  switch (game.state) {
    case 'title': renderTitle(); return;
    case 'champion': renderChampion(); return;
    case 'gameover': renderGameOver(); renderHUD(); return;
    case 'finished': renderFinished(); renderHUD(); return;
    case 'countdown': {
      renderRace(); renderHUD();
      const sec = Math.ceil(game.cdT);
      centerText([
        [`TRACK ${game.trackIdx + 1}  -  QUALIFY IN ${game.track.qualify}.0s`, '#e8e4c8', 11],
        [game.cdT > 0.4 ? String(sec) : 'GO!', '#f8d858', 30],
      ], 100, 34);
      return;
    }
    default: renderRace(); renderHUD();
  }
}

// ---------- responsive scaling ----------
function fit() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fit);
fit();

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- test hook ----------
window.__xb = {
  game,
  start: () => { if (game.state !== 'race' && game.state !== 'countdown') newGame(); },
  state: () => game.state,
  pos: () => ({
    x: game.p.x, lane: game.p.lane, h: game.p.h, speed: game.p.speed,
    airborne: game.p.airborne, crashed: game.p.crashT > 0,
    stalled: game.p.stallT > 0, heat: game.p.heat, pitch: game.p.pitch,
  }),
  hold: (dir, v = true) => { input.held[dir] = v; },
  warp: (x, lane = 1) => {
    const p = game.p;
    p.x = x; p.lane = lane; p.laneF = lane;
    p.h = heightAt(game.track, lane, x); p.vy = 0;
    p.airborne = false; p.crashT = 0; p.stallT = 0; p.prevSlope = 0;
  },
  setSpeed: (v) => { game.p.speed = v; },
  setHeat: (v) => { game.p.heat = v; },
  setRaceTime: (t) => { game.raceTime = t; },
  skipCountdown: () => { if (game.state === 'countdown') { game.cdT = 0.01; } },
  track: () => game.track,
  riders: () => game.riders,
  setAutopilot: (v) => { game.autopilot = !!v; },
  setAttempts: (n) => { game.attemptsLeft = n; },
  gotoTrack: (n) => { startTrack(n); },
};
