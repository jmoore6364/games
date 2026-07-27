// main.js — JIMOORE: Trash Bandit. Top-down stealth-arcade:
// roll into trash cans, eat what spills out, and don't wake the human.

import { TILE, COLS, ROWS, levelConfig } from './levels.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import {
  PAL, drawJimoore, drawCat, drawDog, drawRat, drawHuman,
  drawCan, drawFood, drawTile, drawBush,
} from './sprites.js';

const W = COLS * TILE;           // 384
const H = ROWS * TILE;           // 256
const HUD = 32;

const WALK_SPEED = 55;
const ROLL_SPEED = 128;
const PLAYER_R = 5.5;

const CONE_RANGE = 84;
const CONE_HALF = 0.55;          // radians

const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H + HUD;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / W, (innerHeight - 24) / (H + HUD))));
  canvas.style.width = W * s + 'px';
  canvas.style.height = (H + HUD) * s + 'px';
}
addEventListener('resize', resize);
resize();

const input = new Input();
const audio = new Audio();

// ---------------------------------------------------------------- state --
const G = {
  state: 'title',
  level: 1,
  score: 0,
  high: +(localStorage.getItem('jimoore-high') || 0),
  hearts: 3,
  frame: 0,
  stateTimer: 0,
  cfg: null,
  grid: [],            // map rows (strings)
  bushes: [],
  cans: [],
  food: [],
  cats: [],
  dogs: [],
  rats: [],
  particles: [],
  popups: [],
  player: null,
  human: null,
  noise: 0,
  ratTimer: 0,
  ratsAte: 0,
  invuln: 0,
  shakeT: 0,
};

window.__G = G;   // debug/testing hook

const tileAt = (tx, ty) =>
  (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) ? '#' : G.grid[ty][tx];
const isSolidTile = (ch) => ch === '#' || ch === 'H' || ch === 'D' || ch === 'W';
const solidAt = (x, y) => isSolidTile(tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));
const inBush = (x, y) => tileAt(Math.floor(x / TILE), Math.floor(y / TILE)) === 'B';

function canAt(x, y, skip) {
  for (const c of G.cans) {
    if (c === skip) continue;
    if (x > c.x - 8 && x < c.x + 8 && y > c.y - 8 && y < c.y + 8) return c;
  }
  return null;
}

// circle-ish collision: try the move on each axis; report what blocked us
function moveEntity(e, dx, dy, r) {
  const blocked = { tile: false, can: null };
  for (const [ax, d] of [['x', dx], ['y', dy]]) {
    if (!d) continue;
    const nx = ax === 'x' ? e.x + d : e.x, ny = ax === 'y' ? e.y + d : e.y;
    const pts = [[nx - r, ny - r], [nx + r, ny - r], [nx - r, ny + r], [nx + r, ny + r]];
    let hitTile = false, hitCan = null;
    for (const [px_, py_] of pts) {
      if (solidAt(px_, py_)) { hitTile = true; break; }
      const c = canAt(px_, py_);
      if (c) { hitCan = c; break; }
    }
    if (!hitTile && !hitCan) { e.x = nx; e.y = ny; }
    else { blocked.tile ||= hitTile; blocked.can = blocked.can || hitCan; }
  }
  return blocked;
}

function randomWalkableTile(minDistFrom, minDist) {
  for (let i = 0; i < 200; i++) {
    const tx = 1 + Math.floor(Math.random() * (COLS - 2));
    const ty = 2 + Math.floor(Math.random() * (ROWS - 3));
    const ch = tileAt(tx, ty);
    if (isSolidTile(ch) || ch === 'C') continue;
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (canAt(x, y)) continue;
    if (minDistFrom && Math.hypot(x - minDistFrom.x, y - minDistFrom.y) < minDist) continue;
    return { x, y };
  }
  return { x: W / 2, y: H / 2 };
}

// ---------------------------------------------------------------- setup --
function initLevel(n) {
  const cfg = levelConfig(n);
  G.cfg = cfg;
  G.grid = cfg.map;
  G.bushes = [];
  G.cans = [];
  G.food = [];
  G.cats = [];
  G.dogs = [];
  G.rats = [];
  G.particles = [];
  G.popups = [];
  G.noise = 0;
  G.ratTimer = cfg.ratInterval;
  G.ratsAte = 0;
  G.invuln = 0;
  G.hearts = 3;

  let spawn = { x: W / 2, y: H - 32 }, door = { x: W / 2, y: TILE * 1.5 };
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = G.grid[ty][tx];
      const x = tx * TILE + 8, y = ty * TILE + 8;
      if (ch === 'B') G.bushes.push({ x: tx * TILE, y: ty * TILE });
      else if (ch === 'C') {
        const roll = Math.random();
        const tier = roll < cfg.pTier3 ? 3 : roll < cfg.pTier3 + cfg.pTier2 ? 2 : 1;
        G.cans.push({ x, y, tier, hp: tier, maxHp: tier, shake: 0, hitCd: 0 });
      } else if (ch === 'P') spawn = { x, y };
      else if (ch === 'D') door = { x, y: y + TILE };
    }
  }

  G.player = {
    x: spawn.x, y: spawn.y, spawn,
    face: 'up', rolling: false, moving: false, anim: 0,
  };
  G.human = {
    x: door.x, y: door.y, door,
    state: 'in',                 // in | out | search | return
    dir: 'down', target: null, lookAng: 0, timer: 0, stuck: 0, anim: 0,
  };

  for (let i = 0; i < cfg.cats; i++) {
    const p = randomWalkableTile(spawn, 90);
    G.cats.push({ x: p.x, y: p.y, state: 'wander', ang: Math.random() * 7, timer: 1, stun: 0, flee: 0, anim: 0, dir: 'right' });
  }
  for (let i = 0; i < cfg.dogs; i++) {
    const p = randomWalkableTile(spawn, 110);
    G.dogs.push({ x: p.x, y: p.y, state: 'patrol', dx: Math.random() < 0.5 ? 1 : -1, cool: 0, barkT: 0, anim: 0, dir: 'right' });
  }
}

// ---------------------------------------------------------------- noise --
function addNoise(n) {
  G.noise = Math.min(100, G.noise + n);
  if (G.noise >= G.cfg.noiseThreshold && G.human.state === 'in') {
    const h = G.human;
    h.state = 'out';
    h.x = h.door.x; h.y = h.door.y;
    h.target = { x: G.player.x, y: G.player.y };
    h.stuck = 0;
    audio.alert();
    audio.doorSlam();
    G.popups.push({ x: h.door.x, y: h.door.y - 20, txt: '!', life: 1.2, color: '#ff5050', big: true });
  }
}

// --------------------------------------------------------------- player --
function updatePlayer(dt) {
  const p = G.player;
  const v = input.poll();
  const len = Math.hypot(v.x, v.y) || 1;
  p.rolling = v.roll && (v.x || v.y || p.rolling);
  const speed = p.rolling ? ROLL_SPEED : WALK_SPEED;
  let dx = (v.x / len) * speed * dt, dy = (v.y / len) * speed * dt;

  if (p.rolling && !v.x && !v.y) {
    // keep rolling in the facing direction
    const f = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[p.face];
    dx = f[0] * speed * dt; dy = f[1] * speed * dt;
  }
  if (v.x || v.y) {
    p.face = Math.abs(v.x) >= Math.abs(v.y) ? (v.x < 0 ? 'left' : 'right') : (v.y < 0 ? 'up' : 'down');
  }
  p.moving = !!(dx || dy);
  if (p.moving) p.anim++;

  const blocked = moveEntity(p, dx, dy, PLAYER_R);

  if (p.rolling && p.moving) {
    addNoise(26 * dt);
    if ((G.frame & 7) === 0) audio.roll();
  }

  if (blocked.can) {
    const c = blocked.can;
    if (p.rolling && c.hitCd <= 0) {
      c.hp--; c.shake = 0.35; c.hitCd = 0.4;
      addNoise(8 + c.tier * 6);
      G.shakeT = 0.15;
      if (c.hp <= 0) smashCan(c);
      else audio.clank();
      // bounce back
      const bx = p.x - c.x, by = p.y - c.y, bl = Math.hypot(bx, by) || 1;
      p.x += (bx / bl) * 6; p.y += (by / bl) * 6;
    }
  }

  // eat food
  for (let i = G.food.length - 1; i >= 0; i--) {
    const f = G.food[i];
    if (Math.hypot(f.x - p.x, f.y - p.y) < 9) {
      G.food.splice(i, 1);
      G.score += 10;
      audio.eat();
      G.popups.push({ x: f.x, y: f.y - 6, txt: '+10', life: 0.6, color: PAL.gold });
      checkClear();
    }
  }
}

function smashCan(c) {
  G.cans.splice(G.cans.indexOf(c), 1);
  audio.smash(c.tier);
  addNoise(6 + c.tier * 6);
  G.score += 100 * c.tier;
  G.popups.push({ x: c.x, y: c.y - 12, txt: '+' + 100 * c.tier, life: 0.9, color: '#fff' });
  const n = 2 + c.tier + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    let fx = c.x, fy = c.y;
    for (let t = 0; t < 10; t++) {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 22;
      const nx = c.x + Math.cos(a) * d, ny = c.y + Math.sin(a) * d;
      if (!solidAt(nx, ny) && nx > TILE && nx < W - TILE && ny > TILE * 2 && ny < H - TILE) { fx = nx; fy = ny; break; }
    }
    G.food.push({ x: fx, y: fy, kind: Math.floor(Math.random() * 4) });
  }
  for (let i = 0; i < 10; i++) {
    G.particles.push({
      x: c.x, y: c.y,
      vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.8) * 90,
      life: 0.5 + Math.random() * 0.3,
      color: [PAL.fur, '#9aa2ae', '#4a8a4a', PAL.gold][i & 3],
    });
  }
  checkClear();
}

function checkClear() {
  if (G.state === 'play' && G.cans.length === 0 && G.food.length === 0) {
    G.state = 'clear';
    G.stateTimer = 3;
    const bonus = G.hearts * 100 + (G.ratsAte === 0 ? 200 : 0);
    G.score += bonus;
    audio.clear();
  }
}

function hurtPlayer(knockFrom, cause) {
  if (G.invuln > 0) return;
  G.hearts--;
  G.invuln = 1.6;
  audio.scratch();
  addNoise(12);
  G.shakeT = 0.25;
  const p = G.player;
  const bx = p.x - knockFrom.x, by = p.y - knockFrom.y, bl = Math.hypot(bx, by) || 1;
  moveEntity(p, (bx / bl) * 14, (by / bl) * 14, PLAYER_R);
  G.popups.push({ x: p.x, y: p.y - 12, txt: cause, life: 0.8, color: '#ff5050' });
  if (G.hearts <= 0) gameOver();
}

function gameOver() {
  G.state = 'over';
  G.stateTimer = 0;
  audio.gameOver();
  if (G.score > G.high) { G.high = G.score; localStorage.setItem('jimoore-high', G.high); }
}

// ---------------------------------------------------------------- human --
function updateHuman(dt) {
  const h = G.human;
  if (h.state === 'in') return;
  h.anim++;

  const walk = (tx, ty, speed) => {
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1;
    const ox = h.x, oy = h.y;
    moveEntity(h, (dx / d) * speed * dt, (dy / d) * speed * dt, 6);
    h.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    h.lookAng = Math.atan2(dy, dx);
    if (Math.hypot(h.x - ox, h.y - oy) < speed * dt * 0.3) h.stuck += dt; else h.stuck = 0;
    return d;
  };

  if (h.state === 'out') {
    const d = walk(h.target.x, h.target.y, 58);
    if (d < 12 || h.stuck > 1.1) { h.state = 'search'; h.timer = 2.8; h.stuck = 0; }
  } else if (h.state === 'search') {
    h.timer -= dt;
    h.lookAng += dt * 2.4;
    h.dir = ['right', 'down', 'left', 'up'][Math.floor(((h.lookAng % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 2)) % 4];
    if (h.timer <= 0) {
      // fresh noise while searching sends them to it, otherwise go home
      h.state = 'return';
    }
  } else if (h.state === 'return') {
    const d = walk(h.door.x, h.door.y, 52);
    if (d < 8 || h.stuck > 1.4) {
      h.state = 'in';
      G.noise = Math.min(G.noise, G.cfg.noiseThreshold * 0.4);
      audio.doorSlam();
    }
  }

  // renewed racket re-aggros the human while outside
  if (h.state !== 'out' && G.noise >= G.cfg.noiseThreshold) {
    h.state = 'out';
    h.target = { x: G.player.x, y: G.player.y };
    h.stuck = 0;
  }

  // flashlight catch check
  const p = G.player;
  const dx = p.x - h.x, dy = p.y - h.y;
  const dist = Math.hypot(dx, dy);
  if (dist < CONE_RANGE && !inBush(p.x, p.y)) {
    let da = Math.atan2(dy, dx) - h.lookAng;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) < CONE_HALF && losClear(h.x, h.y, p.x, p.y)) caughtByHuman();
  }
}

function losClear(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(d / 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

function caughtByHuman() {
  G.state = 'caught';
  G.stateTimer = 1.6;
  G.hearts--;
  audio.caught();
  if (G.score > G.high) { G.high = G.score; localStorage.setItem('jimoore-high', G.high); }
}

function resolveCaught() {
  if (G.hearts <= 0) { gameOver(); return; }
  const p = G.player;
  p.x = p.spawn.x; p.y = p.spawn.y;
  p.rolling = false;
  G.human.state = 'in';
  G.noise = 20;
  G.invuln = 2;
  G.state = 'play';
}

// -------------------------------------------------------------- enemies --
function updateCats(dt) {
  const p = G.player;
  for (const c of G.cats) {
    c.anim++;
    if (c.stun > 0) { c.stun -= dt; continue; }
    if (c.flee > 0) c.flee -= dt;
    const dToP = Math.hypot(p.x - c.x, p.y - c.y);
    const canSee = !inBush(p.x, p.y);

    if (c.flee <= 0 && canSee && dToP < 64 && c.state !== 'chase') { c.state = 'chase'; audio.meow(); }
    if (c.state === 'chase' && (!canSee || dToP > 110 || c.flee > 0)) c.state = 'wander';

    let vx = 0, vy = 0;
    if (c.state === 'chase') {
      vx = (p.x - c.x) / dToP * 62; vy = (p.y - c.y) / dToP * 62;
    } else {
      c.timer -= dt;
      if (c.timer <= 0) { c.ang = Math.random() * Math.PI * 2; c.timer = 0.8 + Math.random() * 1.8; }
      vx = Math.cos(c.ang) * 30; vy = Math.sin(c.ang) * 30;
    }
    const before = { x: c.x, y: c.y };
    const blocked = moveEntity(c, vx * dt, vy * dt, 5);
    if ((blocked.tile || blocked.can) && c.state !== 'chase') c.timer = 0;
    if (vx) c.dir = vx < 0 ? 'left' : 'right';

    if (dToP < 11) {
      if (p.rolling) {
        c.stun = 3; c.state = 'wander';
        G.score += 50;
        audio.squeak();
        G.popups.push({ x: c.x, y: c.y - 10, txt: '+50', life: 0.7, color: PAL.gold });
      } else {
        hurtPlayer(before, 'SCRATCH!');
        c.flee = 2; c.state = 'wander'; c.ang = Math.atan2(c.y - p.y, c.x - p.x); c.timer = 2;
      }
    }
  }
}

function updateDogs(dt) {
  const p = G.player;
  for (const d of G.dogs) {
    d.anim++;
    if (d.cool > 0) d.cool -= dt;
    const dToP = Math.hypot(p.x - d.x, p.y - d.y);
    const canSee = !inBush(p.x, p.y);

    if (d.state === 'patrol' && canSee && d.cool <= 0 && dToP < 88) { d.state = 'chase'; audio.bark(); d.barkT = 0; }
    if (d.state === 'chase' && (!canSee || dToP > 140 || d.cool > 0)) d.state = 'patrol';

    if (d.state === 'chase') {
      d.barkT -= dt;
      if (d.barkT <= 0) { audio.bark(); d.barkT = 1.1; }
      addNoise(9 * dt);
      const blocked = moveEntity(d, (p.x - d.x) / dToP * 112 * dt, (p.y - d.y) / dToP * 112 * dt, 6);
      d.dir = p.x < d.x ? 'left' : 'right';
      if (blocked.tile && Math.abs(p.y - d.y) > 4) moveEntity(d, 0, Math.sign(p.y - d.y) * 50 * dt, 6);
    } else {
      const blocked = moveEntity(d, d.dx * 42 * dt, 0, 6);
      if (blocked.tile || blocked.can) d.dx *= -1;
      d.dir = d.dx < 0 ? 'left' : 'right';
    }

    if (dToP < 12) {
      if (p.rolling) {
        // a rolling sphere just bounces off a big dog
        const bx = p.x - d.x, by = p.y - d.y, bl = Math.hypot(bx, by) || 1;
        moveEntity(p, (bx / bl) * 18, (by / bl) * 18, PLAYER_R);
        d.cool = 1.2; d.state = 'patrol';
        audio.clank();
      } else {
        hurtPlayer(d, 'CHOMP!');
        d.cool = 2; d.state = 'patrol';
      }
    }
  }
}

function updateRats(dt) {
  const cfg = G.cfg;
  if (cfg.ratsMax > 0 && G.food.length > 0) {
    G.ratTimer -= dt;
    if (G.ratTimer <= 0 && G.rats.length < cfg.ratsMax) {
      G.ratTimer = cfg.ratInterval;
      const edges = [];
      for (let tx = 1; tx < COLS - 1; tx++) {
        if (!isSolidTile(tileAt(tx, 2))) edges.push({ x: tx * TILE + 8, y: 2 * TILE + 8 });
        if (!isSolidTile(tileAt(tx, ROWS - 2))) edges.push({ x: tx * TILE + 8, y: (ROWS - 2) * TILE + 8 });
      }
      const e = edges[Math.floor(Math.random() * edges.length)] || { x: W / 2, y: H - 24 };
      G.rats.push({ x: e.x, y: e.y, state: 'seek', eatT: 0, target: null, anim: 0, dir: 'right', gone: false });
      audio.squeak();
    }
  }

  const p = G.player;
  for (let i = G.rats.length - 1; i >= 0; i--) {
    const r = G.rats[i];
    r.anim++;

    if (p.rolling && Math.hypot(p.x - r.x, p.y - r.y) < 11 && r.state !== 'flee') {
      r.state = 'flee';
      G.score += 25;
      audio.squeak();
      G.popups.push({ x: r.x, y: r.y - 8, txt: '+25', life: 0.6, color: PAL.gold });
    }

    if (r.state === 'flee') {
      const blocked = moveEntity(r, Math.sign(r.x - p.x || 1) * 95 * dt, r.y > H / 2 ? 70 * dt : -70 * dt, 4);
      r.dir = r.x - p.x < 0 ? 'left' : 'right';
      if (blocked.tile || r.x < TILE || r.x > W - TILE) { G.rats.splice(i, 1); }
      continue;
    }

    // pick nearest food
    let best = null, bd = 1e9;
    for (const f of G.food) {
      const d = Math.hypot(f.x - r.x, f.y - r.y);
      if (d < bd) { bd = d; best = f; }
    }
    if (!best) {
      // nothing left to steal — scurry home
      r.state = 'flee';
      continue;
    }
    if (bd < 6) {
      r.eatT += dt;
      if (r.eatT > 1.1) {
        const idx = G.food.indexOf(best);
        if (idx >= 0) {
          G.food.splice(idx, 1);
          G.ratsAte++;
          G.popups.push({ x: best.x, y: best.y - 6, txt: 'STOLEN!', life: 0.8, color: '#c78e8e' });
          checkClear();
        }
        r.eatT = 0;
      }
    } else {
      r.eatT = 0;
      moveEntity(r, (best.x - r.x) / bd * 52 * dt, (best.y - r.y) / bd * 52 * dt, 4);
      r.dir = best.x < r.x ? 'left' : 'right';
    }
  }
}

// ------------------------------------------------------------------ fx --
function updateFx(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const q = G.particles[i];
    q.life -= dt;
    if (q.life <= 0) { G.particles.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 160 * dt;
  }
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const q = G.popups[i];
    q.life -= dt;
    q.y -= 14 * dt;
    if (q.life <= 0) G.popups.splice(i, 1);
  }
}

// -------------------------------------------------------------- update --
let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.frame++;

  if (input.take('mute')) audio.toggleMute();

  switch (G.state) {
    case 'title':
      if (input.take('start') || input.take('any')) {
        G.level = 1; G.score = 0;
        initLevel(1);
        G.state = 'play';
      }
      break;
    case 'play':
      if (input.take('pause')) { G.state = 'pause'; break; }
      G.invuln = Math.max(0, G.invuln - dt);
      G.shakeT = Math.max(0, G.shakeT - dt);
      G.noise = Math.max(0, G.noise - G.cfg.noiseDecay * dt);
      for (const c of G.cans) { c.hitCd = Math.max(0, c.hitCd - dt); c.shake = Math.max(0, c.shake - dt); }
      updatePlayer(dt);
      updateHuman(dt);
      updateCats(dt);
      updateDogs(dt);
      updateRats(dt);
      updateFx(dt);
      break;
    case 'pause':
      if (input.take('pause') || input.take('start')) G.state = 'play';
      break;
    case 'caught':
      G.stateTimer -= dt;
      updateFx(dt);
      if (G.stateTimer <= 0) resolveCaught();
      break;
    case 'clear':
      G.stateTimer -= dt;
      updateFx(dt);
      if (G.stateTimer <= 0) {
        G.level++;
        initLevel(G.level);
        G.state = 'play';
      }
      break;
    case 'over':
      G.stateTimer += dt;
      if (G.stateTimer > 1 && (input.take('start') || input.take('any'))) G.state = 'title';
      break;
  }
  input.endFrame();
  render();
}

// -------------------------------------------------------------- render --
function render() {
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, W, H + HUD);

  if (G.state === 'title') { renderTitle(); return; }

  ctx.save();
  ctx.translate(0, HUD);
  if (G.shakeT > 0) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);

  // tiles
  for (let ty = 0; ty < ROWS; ty++)
    for (let tx = 0; tx < COLS; tx++) {
      const ch = G.grid[ty][tx];
      drawTile(ctx, ch === 'B' || ch === 'C' || ch === 'P' ? '.' : ch, tx * TILE, ty * TILE, G.frame);
    }

  // porch light glow when human is out
  if (G.human.state !== 'in') {
    const d = G.human.door;
    const grad = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, 40);
    grad.addColorStop(0, 'rgba(248,168,0,0.25)');
    grad.addColorStop(1, 'rgba(248,168,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(d.x - 40, d.y - 40, 80, 80);
  }

  for (const b of G.bushes) drawBush(ctx, b.x, b.y, G.frame);
  for (const c of G.cans) drawCan(ctx, c.x - 8, c.y - 8, c.tier, c.hp, c.maxHp, c.shake, G.frame);
  for (const f of G.food) drawFood(ctx, f.x - 3, f.y - 3, f.kind, G.frame);
  for (const r of G.rats) drawRat(ctx, r.x - 6, r.y - 6, r.dir, r.anim, r.eatT > 0);
  for (const c of G.cats) drawCat(ctx, c.x - 8, c.y - 8, c.dir, c.anim, c.stun > 0);
  for (const d of G.dogs) drawDog(ctx, d.x - 9, d.y - 9, d.dir, d.anim, d.state === 'chase');

  // flashlight cone
  const h = G.human;
  if (h.state !== 'in') {
    ctx.save();
    ctx.globalAlpha = 0.16 + Math.sin(G.frame * 0.2) * 0.03;
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.arc(h.x, h.y, CONE_RANGE, h.lookAng - CONE_HALF, h.lookAng + CONE_HALF);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    drawHuman(ctx, h.x - 8, h.y - 12, h.dir, h.anim);
  }

  // player (blink while invulnerable)
  const p = G.player;
  if (!(G.invuln > 0 && (G.frame >> 2) % 2)) {
    drawJimoore(ctx, p.x - 8, p.y - 9, p.face, p.anim, p.rolling, inBush(p.x, p.y));
  }

  for (const q of G.particles) {
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x | 0, q.y | 0, 2, 2);
  }
  for (const q of G.popups) {
    ctx.fillStyle = q.color;
    ctx.font = (q.big ? 'bold 12px' : 'bold 7px') + ' monospace';
    ctx.textAlign = 'center';
    ctx.fillText(q.txt, q.x, q.y);
  }

  ctx.restore();

  renderHud();

  // overlays
  if (G.state === 'caught') overlay('CAUGHT!', '#ff5050', 'the human grabbed you');
  else if (G.state === 'clear') overlay('ALLEY CLEARED!', PAL.gold, G.ratsAte === 0 ? 'clean plate bonus +200' : `rats stole ${G.ratsAte} snacks`);
  else if (G.state === 'over') overlay('GAME OVER', '#ff5050', `score ${G.score} · high ${G.high} — press start`);
  else if (G.state === 'pause') overlay('PAUSED', '#9aa2ae', 'P to resume');
}

function overlay(big, color, small) {
  ctx.fillStyle = 'rgba(10,10,18,0.72)';
  ctx.fillRect(0, HUD + 70, W, 78);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 22px monospace';
  ctx.fillText(big, W / 2, HUD + 108);
  ctx.fillStyle = '#ccd';
  ctx.font = '9px monospace';
  ctx.fillText(small, W / 2, HUD + 128);
}

function heart(x, y, filled) {
  ctx.fillStyle = filled ? '#e04858' : '#3a3a48';
  ctx.fillRect(x, y + 1, 3, 3); ctx.fillRect(x + 4, y + 1, 3, 3);
  ctx.fillRect(x + 1, y + 3, 5, 2); ctx.fillRect(x + 2, y + 5, 3, 1); ctx.fillRect(x + 3, y + 6, 1, 1);
}

function renderHud() {
  ctx.fillStyle = '#1a1a28';
  ctx.fillRect(0, 0, W, HUD);
  ctx.fillStyle = '#0aa7a0';
  ctx.fillRect(0, HUD - 2, W, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = PAL.gold;
  ctx.font = 'bold 9px monospace';
  ctx.fillText('LV ' + G.level, 6, 12);
  ctx.fillStyle = '#eee';
  ctx.fillText(String(G.score).padStart(6, '0'), 6, 25);

  for (let i = 0; i < 3; i++) heart(52 + i * 10, 16, i < G.hearts);

  // cans + food remaining
  ctx.fillStyle = '#9aa2ae';
  ctx.font = '8px monospace';
  ctx.fillText('CANS ' + G.cans.length, 96, 12);
  ctx.fillText('FOOD ' + G.food.length, 96, 25);

  // noise meter
  const mx = 170, mw = 130;
  ctx.fillStyle = '#9aa2ae';
  ctx.fillText('NOISE', mx, 12);
  ctx.fillStyle = '#12121e';
  ctx.fillRect(mx, 16, mw, 8);
  const frac = G.noise / 100;
  ctx.fillStyle = G.noise > G.cfg.noiseThreshold - 15 ? '#ff5050' : G.noise > G.cfg.noiseThreshold - 35 ? PAL.gold : '#0aa7a0';
  ctx.fillRect(mx, 16, mw * frac, 8);
  // threshold notch
  ctx.fillStyle = '#fff';
  ctx.fillRect(mx + mw * (G.cfg.noiseThreshold / 100) - 1, 14, 2, 12);

  if (G.human.state !== 'in') {
    ctx.fillStyle = (G.frame >> 3) % 2 ? '#ff5050' : '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('HUMAN!', mx + mw + 8, 23);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#667';
  ctx.font = '8px monospace';
  ctx.fillText('HI ' + G.high, W - 6, 12);
}

let titleAnim = 0;
function renderTitle() {
  titleAnim++;
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.gold;
  ctx.font = 'bold 30px monospace';
  ctx.fillText('JIMOORE', W / 2, 74);
  ctx.fillStyle = '#0aa7a0';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('T R A S H   B A N D I T', W / 2, 94);

  // big rolling Jimoore bouncing across
  const rx = ((titleAnim * 1.4) % (W + 96)) - 48;
  ctx.save();
  ctx.translate(rx, 128);
  ctx.scale(3, 3);
  drawJimoore(ctx, -8, -8, 'right', titleAnim, true, false);
  ctx.restore();

  ctx.fillStyle = '#ccd';
  ctx.font = '9px monospace';
  ctx.fillText('sneak the yard · ROLL to smash cans · eat every snack', W / 2, 196);
  ctx.fillText('cats scratch · dogs bark · rats steal', W / 2, 210);
  ctx.fillStyle = '#ff5050';
  ctx.fillText("don't let the HUMAN catch you in the flashlight", W / 2, 224);
  ctx.fillStyle = '#99a';
  ctx.fillText('hide in bushes to disappear', W / 2, 238);

  if ((titleAnim >> 4) % 2) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('PRESS ENTER / TAP START', W / 2, 268);
  }
  ctx.fillStyle = '#667';
  ctx.font = '8px monospace';
  ctx.fillText('HI ' + G.high, W / 2, 284);
}

requestAnimationFrame(tick);
