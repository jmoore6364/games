// main.js — Wing Commoore. Game loop, physics, combat, waves, rendering, test hook.
import {
  V, makeBasis, pitch, yaw, roll, reortho, toCam, project,
  makeStars, drawStars, drawModel,
} from './render3d.js';
import { makeFighterModel, spawnEnemy, updateEnemy } from './ships.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import * as HUD from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const W = canvas.width, H = canvas.height;
const FOCAL = W * 0.82;

const audio = new Audio();
const input = new Input();
input.bindTouch({
  stick: document.getElementById('stick'), nub: document.getElementById('nub'),
  fire: document.getElementById('tFire'), ab: document.getElementById('tAb'),
  msl: document.getElementById('tMsl'), target: document.getElementById('tTarget'),
  thrUp: document.getElementById('tThrUp'), thrDn: document.getElementById('tThrDn'),
}, audio);

// show touch controls on touch devices
const touchEl = document.getElementById('touch');
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) touchEl.classList.add('on');

// ---------- tuning ----------
const MAX_SPEED = 55, AB_SPEED = 120, MIN_SPEED = 0;
const TURN = 1.5, ROLL = 2.2;
const BOLT_SPEED = 300, BOLT_LIFE = 1.3, BOLT_DMG = 16;
const E_BOLT_SPEED = 240, E_BOLT_LIFE = 2.2, E_BOLT_DMG = 8;
const FIRE_CD = 0.13, HEAT_PER = 0.085, HEAT_COOL = 0.55;
const SHIELD_MAX = 60, HULL_MAX = 100, SHIELD_REGEN = 5, SHIELD_DELAY = 3;
const LOCK_RANGE = 420, LOCK_TIME = 1.35, MISSILE_DMG = 60, MISSILE_SPEED = 150;
const WAVES = [2, 3, 4, 4];

let g;
function newGame() {
  g = {
    state: 'title', // title -> briefing? we combine; states: title, play, waveclear, gameover, complete
    t: 0,
    msgT: 0,
    player: {
      pos: { x: 0, y: 0, z: 0 },
      ori: makeBasis(),
      throttle: 0.6,
      speed: 0,
      abFuel: 1,
      ab: false,
      shieldFront: SHIELD_MAX, shieldRear: SHIELD_MAX,
      hull: HULL_MAX,
      gunHeat: 0, overheat: false,
      fireCd: 0,
      missiles: 6,
      hitFlash: 0,
    },
    enemies: [],
    bolts: [],
    missiles: [],
    fx: [], // explosions/particles
    kills: 0,
    wave: 0,
    totalWaves: WAVES.length,
    enemiesLeft: 0,
    spawnQueue: 0,
    spawnTimer: 0,
    targetId: null,
    lock: { id: null, prog: 0 },
    waveTimer: 0,
    shake: 0,
    lockToneT: 0,
  };
}
newGame();
const stars = makeStars(320, 420);

// ---------- state transitions ----------
function startGame() {
  newGame();
  audio.ensure(); audio.resume();
  g.state = 'play';
  g.wave = 0;
  nextWave();
}
function nextWave() {
  g.wave++;
  if (g.wave > g.totalWaves) { g.state = 'complete'; g.msgT = 0; return; }
  const n = WAVES[g.wave - 1];
  g.spawnQueue = n;
  g.enemiesLeft = n;
  g.spawnTimer = 0.3;
  g.state = 'play';
}

function spawnOne(dirBias) {
  // spawn ahead-ish at range, in a random direction within a forward-biased cone
  const p = g.player;
  let dir;
  if (dirBias) dir = dirBias;
  else {
    const a = (Math.random() * 2 - 1) * 1.1;
    const b = (Math.random() * 2 - 1) * 0.7;
    dir = V.norm(V.add(V.add(p.ori.fwd, V.scale(p.ori.right, a)), V.scale(p.ori.up, b)));
  }
  const dist = 300 + Math.random() * 180;
  const pos = V.add(p.pos, V.scale(dir, dist));
  const e = spawnEnemy(pos, {
    name: pick(['DRALTHMOORE', 'SALTHMOORE', 'KRANT-MOORE', 'GRIKATH-M']),
    model: makeFighterModel(),
    shield: 34 + Math.random() * 14,
    hull: 46 + Math.random() * 20,
    speed: 30 + Math.random() * 12,
    maxTurn: 1.0 + Math.random() * 0.4,
  });
  // face the player
  e.ori.fwd = V.norm(V.sub(p.pos, pos));
  reortho(e.ori);
  g.enemies.push(e);
  audio.warp();
  return e;
}
function pick(a) { return a[(Math.random() * a.length) | 0]; }

// ---------- combat ----------
function playerFire() {
  const p = g.player;
  if (p.overheat || p.fireCd > 0) return;
  p.fireCd = FIRE_CD;
  p.gunHeat = Math.min(1, p.gunHeat + HEAT_PER);
  if (p.gunHeat >= 1) p.overheat = true;
  const base = V.add(p.pos, V.scale(p.ori.fwd, 3));
  const vel = V.add(V.scale(p.ori.fwd, BOLT_SPEED), V.scale(p.ori.fwd, p.speed));
  for (const off of [-1.7, 1.7]) {
    const o = V.add(base, V.scale(p.ori.right, off));
    g.bolts.push({ pos: V.add(o, V.scale(p.ori.up, -0.4)), vel: V.clone(vel), life: BOLT_LIFE, friendly: true });
  }
  audio.laser();
}
function enemyFire(e) {
  const gun = V.add(e.pos, V.scale(e.ori.fwd, 4));
  const aim = V.norm(V.sub(g.player.pos, gun));
  g.bolts.push({ pos: gun, vel: V.scale(aim, E_BOLT_SPEED), life: E_BOLT_LIFE, friendly: false });
  audio.enemyLaser();
}
function launchMissile() {
  const p = g.player;
  if (p.missiles <= 0) return;
  if (!g.lock.id || g.lock.prog < 1) { audio.alarm(); return; }
  p.missiles--;
  const gun = V.add(p.pos, V.scale(p.ori.fwd, 3));
  g.missiles.push({
    pos: gun, vel: V.add(V.scale(p.ori.fwd, MISSILE_SPEED * 0.6), V.scale(p.ori.fwd, p.speed)),
    targetId: g.lock.id, life: 5.5, trail: [],
  });
  audio.missile();
  g.lock.prog = 0;
}

function explode(pos, size, big) {
  const parts = [];
  const n = big ? 18 : 12;
  for (let i = 0; i < n; i++) {
    const d = V.norm({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 2 - 1 });
    parts.push({ dir: d, spd: (8 + Math.random() * 22) * (big ? 1.5 : 1), r: (0.6 + Math.random() * 1.2) });
  }
  g.fx.push({ pos: V.clone(pos), t: 0, dur: big ? 1.1 : 0.7, size, parts, big });
  audio.explosion(big);
}

function damagePlayer(amount, fromDir) {
  const p = g.player;
  // front hemisphere if damage source is ahead
  const front = V.dot(fromDir, p.ori.fwd) < 0; // bolt travelling toward us; if moving opposite our fwd => came from front
  const key = front ? 'shieldFront' : 'shieldRear';
  let remaining = amount;
  if (p[key] > 0) {
    const absorbed = Math.min(p[key], remaining);
    p[key] -= absorbed; remaining -= absorbed;
    if (p[key] <= 0) audio.shieldDown();
    else audio.hit();
  }
  if (remaining > 0) { p.hull -= remaining; audio.alarm(); }
  p.hitFlash = 0.5; g.shake = Math.min(1, g.shake + 0.5);
  g._regenDelay = SHIELD_DELAY;
  if (p.hull <= 0) { p.hull = 0; g.state = 'gameover'; g.msgT = 0; explode(p.pos, 30, true); }
}

// ---------- targeting ----------
function cycleTarget() {
  const vis = g.enemies.filter((e) => !e.dead);
  if (vis.length === 0) { g.targetId = null; return; }
  // order by angle from crosshair, cycle
  const ids = vis.map((e) => e.id).sort((a, b) => a - b);
  let idx = ids.indexOf(g.targetId);
  idx = (idx + 1) % ids.length;
  g.targetId = ids[idx];
  audio.ui();
}
function autoTarget() {
  if (g.targetId && g.enemies.some((e) => e.id === g.targetId && !e.dead)) return;
  // pick nearest in front
  let best = null, bestScore = -2;
  for (const e of g.enemies) {
    if (e.dead) continue;
    const rel = V.norm(V.sub(e.pos, g.player.pos));
    const f = V.dot(rel, g.player.ori.fwd);
    if (f > bestScore) { bestScore = f; best = e; }
  }
  g.targetId = best ? best.id : null;
}

// ---------- update ----------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  g.t += dt;

  handleGlobalInput();
  if (g.state === 'play' || g.state === 'waveclear') update(dt);
  render();
  syncHook();
  requestAnimationFrame(frame);
}

function handleGlobalInput() {
  if (input.consume('mute')) { audio.setMuted(!audio.muted); }
  if (input.consume('restart')) { if (g.state === 'gameover' || g.state === 'complete') startGame(); }
  if (g.state === 'title') {
    if (input.consume('start') || input.consume('fire') || input.consume('startTap')) startGame();
  } else {
    input.consume('start'); input.consume('startTap');
  }
}

function update(dt) {
  const p = g.player;

  // ---- steering ----
  let pIn = 0, yIn = 0, rIn = 0;
  if (input.down('arrowup', 'w')) pIn += 1;
  if (input.down('arrowdown', 's')) pIn -= 1;
  if (input.down('arrowleft')) yIn -= 1;
  if (input.down('arrowright')) yIn += 1;
  if (input.down('a')) yIn -= 1;
  if (input.down('d')) yIn += 1;
  if (input.down('q')) rIn += 1;
  if (input.down('e')) rIn -= 1;
  if (input.stick.active) { yIn += input.stick.x; pIn += -input.stick.y; }
  pIn = Math.max(-1, Math.min(1, pIn));
  yIn = Math.max(-1, Math.min(1, yIn));
  if (Math.abs(pIn) > 0.01) pitch(p.ori, pIn * TURN * dt);
  if (Math.abs(yIn) > 0.01) yaw(p.ori, yIn * TURN * dt);
  if (Math.abs(rIn) > 0.01) roll(p.ori, rIn * ROLL * dt);
  reortho(p.ori);

  // ---- throttle & afterburner ----
  if (input.consume('throttleUp')) p.throttle = Math.min(1, p.throttle + 0.15);
  if (input.consume('throttleDown')) p.throttle = Math.max(0, p.throttle - 0.15);
  const abHeld = input.down('shift') || input.held.ab;
  p.ab = abHeld && p.abFuel > 0.02;
  if (p.ab) { p.abFuel = Math.max(0, p.abFuel - dt * 0.35); if (!g._abWas) audio.whoosh(); }
  else { p.abFuel = Math.min(1, p.abFuel + dt * 0.18); }
  g._abWas = p.ab;
  const targetSpeed = (p.ab ? AB_SPEED : MAX_SPEED) * (p.ab ? 1 : p.throttle);
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 2.5);
  p.pos = V.add(p.pos, V.scale(p.ori.fwd, p.speed * dt));
  audio.engineUpdate(p.throttle, p.ab);

  // ---- guns ----
  p.fireCd -= dt;
  if (p.overheat) { p.gunHeat -= HEAT_COOL * 0.7 * dt; if (p.gunHeat <= 0.25) { p.gunHeat = Math.max(0, p.gunHeat); p.overheat = false; } }
  else { p.gunHeat = Math.max(0, p.gunHeat - HEAT_COOL * dt); }
  const firing = input.down(' ') || input.held.fire || input.keys.has('spacebar');
  input.consume('fire');
  if (firing && g.state === 'play') playerFire();

  // ---- missiles fire button ----
  if (input.consume('missile') && g.state === 'play') launchMissile();
  if (input.consume('target')) cycleTarget();

  // ---- shields regen ----
  g._regenDelay = Math.max(0, (g._regenDelay || 0) - dt);
  if (g._regenDelay <= 0) {
    p.shieldFront = Math.min(SHIELD_MAX, p.shieldFront + SHIELD_REGEN * dt);
    p.shieldRear = Math.min(SHIELD_MAX, p.shieldRear + SHIELD_REGEN * dt);
  }
  p.hitFlash = Math.max(0, p.hitFlash - dt * 2);
  g.shake = Math.max(0, g.shake - dt * 3);

  // ---- spawn queue ----
  if (g.state === 'play' && g.spawnQueue > 0) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) { spawnOne(); g.spawnQueue--; g.spawnTimer = 0.8 + Math.random() * 0.6; }
  }

  // ---- enemies ----
  for (const e of g.enemies) {
    if (e.dead) continue;
    const res = updateEnemy(e, dt, g.player);
    if (res.shoot) enemyFire(e);
  }

  // ---- targeting / lock ----
  autoTarget();
  updateLock(dt);

  // ---- bolts ----
  for (const b of g.bolts) {
    b.pos = V.add(b.pos, V.scale(b.vel, dt));
    b.life -= dt;
    if (b.friendly) {
      for (const e of g.enemies) {
        if (e.dead || e.warp > 0.2) continue;
        if (dist2(b.pos, e.pos) < (e.radius + 1.2) ** 2) { hitEnemy(e, BOLT_DMG); b.life = 0; break; }
      }
    } else {
      if (dist2(b.pos, p.pos) < 4 ** 2) {
        damagePlayer(E_BOLT_DMG, V.norm(b.vel)); b.life = 0;
      }
    }
  }
  g.bolts = g.bolts.filter((b) => b.life > 0);

  // ---- missiles ----
  for (const m of g.missiles) {
    m.life -= dt;
    const tgt = g.enemies.find((e) => e.id === m.targetId && !e.dead);
    if (tgt) {
      const desired = V.norm(V.sub(tgt.pos, m.pos));
      const curDir = V.norm(m.vel);
      const nd = V.norm(V.add(curDir, V.scale(desired, 4 * dt)));
      m.vel = V.scale(nd, MISSILE_SPEED);
    }
    m.pos = V.add(m.pos, V.scale(m.vel, dt));
    m.trail.push(V.clone(m.pos)); if (m.trail.length > 6) m.trail.shift();
    if (tgt && dist2(m.pos, tgt.pos) < (tgt.radius + 2.5) ** 2) { hitEnemy(tgt, MISSILE_DMG); explode(m.pos, 12, false); m.life = 0; }
  }
  g.missiles = g.missiles.filter((m) => m.life > 0);

  // ---- fx ----
  for (const f of g.fx) f.t += dt;
  g.fx = g.fx.filter((f) => f.t < f.dur);

  // remove dead enemies
  g.enemies = g.enemies.filter((e) => !(e.dead && e.explodedDone));

  // ---- wave logic ----
  if (g.state === 'play' && g.spawnQueue === 0 && g.enemiesLeft === 0 && g.enemies.length === 0) {
    g.state = 'waveclear'; g.waveTimer = 2.6; g.msgT = 0;
  }
  if (g.state === 'waveclear') {
    g.waveTimer -= dt; g.msgT += dt;
    if (g.waveTimer <= 0) nextWave();
  }
}

function hitEnemy(e, dmg) {
  if (e.shield > 0) {
    const a = Math.min(e.shield, dmg); e.shield -= a; dmg -= a;
    audio.hit();
  }
  if (dmg > 0) e.hull -= dmg;
  if (e.hull <= 0 && !e.dead) {
    e.dead = true;
    explode(e.pos, 16, true);
    e.explodedDone = true;
    g.kills++;
    g.enemiesLeft = Math.max(0, g.enemiesLeft - 1);
    if (g.targetId === e.id) g.targetId = null;
    if (g.lock.id === e.id) { g.lock.id = null; g.lock.prog = 0; }
  } else {
    audio.hit();
  }
}

function updateLock(dt) {
  const p = g.player;
  const tgt = g.enemies.find((e) => e.id === g.targetId && !e.dead);
  if (!tgt) { g.lock.id = null; g.lock.prog = 0; return; }
  const rel = V.sub(tgt.pos, p.pos);
  const d = V.len(rel);
  const dir = V.scale(rel, 1 / d);
  const facing = V.dot(dir, p.ori.fwd);
  if (d < LOCK_RANGE && facing > 0.965 && tgt.warp <= 0) {
    if (g.lock.id !== tgt.id) { g.lock.id = tgt.id; g.lock.prog = 0; }
    const was = g.lock.prog;
    g.lock.prog = Math.min(1, g.lock.prog + dt / LOCK_TIME);
    g.lockToneT -= dt;
    if (g.lockToneT <= 0 && g.lock.prog < 1) { audio.lock(); g.lockToneT = 0.16; }
    if (was < 1 && g.lock.prog >= 1) audio.lockDone();
  } else {
    g.lock.prog = Math.max(0, g.lock.prog - dt * 1.5);
    if (g.lock.prog <= 0) g.lock.id = null;
  }
}

function dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return dx * dx + dy * dy + dz * dz; }

// ---------- render ----------
function projP(pt) { return project(toCam(pt, g.player.pos, g.player.ori), W, H, FOCAL); }

function render() {
  ctx.fillStyle = '#01030a';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (g.shake > 0) {
    const s = g.shake * 6;
    ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
  }

  // starfield
  drawStars(ctx, stars, g.player.pos, g.player.ori, W, H, FOCAL, 420, g.player.speed);

  if (g.state === 'title') { ctx.restore(); drawTitle(); return; }

  // depth-sort enemies far->near
  const drawList = g.enemies.filter((e) => !e.dead).map((e) => ({ e, d: dist2(e.pos, g.player.pos) }));
  drawList.sort((a, b) => b.d - a.d);
  for (const { e } of drawList) drawEnemy(e);

  // bolts
  drawBolts();
  // missiles
  drawMissiles();
  // fx
  drawFx();

  ctx.restore(); // end shake for world

  // cockpit + HUD (not shaken)
  HUD.drawCockpit(ctx, W, H);
  drawHUD();

  // hit flash
  if (g.player.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${g.player.hitFlash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (g.state === 'gameover') drawOverlay('MISSION FAILED', 'Your fighter was destroyed.  Press R to relaunch', '#ff5a5a');
  if (g.state === 'complete') drawOverlay('MISSION COMPLETE', `All wings cleared — ${g.kills} kills.  Press R to fly again`, '#5dff8a');
}

function drawEnemy(e) {
  const scale = e.warp > 0 ? (1 - e.warp) * 1.0 + 0.02 : 1;
  // engine glow drawn behind the model so the fighter reads on top of it
  const eng = V.add(e.pos, V.scale(e.ori.fwd, -2 * (e.model.scale)));
  const pj = projP(eng);
  if (pj.vis) {
    const r = Math.min(60, Math.max(1.2, 1.7 * pj.scale * scale));
    const grd = ctx.createRadialGradient(pj.sx, pj.sy, 0, pj.sx, pj.sy, r);
    grd.addColorStop(0, 'rgba(255,190,110,0.85)');
    grd.addColorStop(0.5, 'rgba(255,130,50,0.35)');
    grd.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(pj.sx, pj.sy, r, 0, Math.PI * 2); ctx.fill();
  }
  drawModel(ctx, e.model, e.pos, e.ori, g.player.pos, g.player.ori, W, H, FOCAL, { scale, light: g._light });
  // warp-in shimmer
  if (e.warp > 0) {
    const c = projP(e.pos);
    if (c.vis) {
      ctx.strokeStyle = `rgba(120,200,255,${e.warp})`;
      ctx.lineWidth = 2;
      const r = 10 * c.scale * (0.5 + e.warp);
      ctx.beginPath(); ctx.arc(c.sx, c.sy, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

function drawBolts() {
  for (const b of g.bolts) {
    const head = projP(b.pos);
    if (!head.vis || head.z < 6) continue; // skip muzzle-blob when very close
    const tailPos = V.sub(b.pos, V.scale(b.vel, 0.03));
    const tail = projP(tailPos);
    ctx.lineCap = 'round';
    const lw = Math.max(1.5, Math.min(4, 2.4 * head.scale));
    if (b.friendly) {
      ctx.strokeStyle = 'rgba(120,255,180,0.95)'; ctx.lineWidth = lw;
    } else {
      ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.lineWidth = lw;
    }
    ctx.beginPath();
    ctx.moveTo(head.sx, head.sy);
    if (tail.vis) ctx.lineTo(tail.sx, tail.sy); else ctx.lineTo(head.sx, head.sy + 1);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawMissiles() {
  for (const m of g.missiles) {
    // trail
    ctx.strokeStyle = 'rgba(255,190,120,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (const tp of m.trail) {
      const pj = projP(tp);
      if (!pj.vis) { started = false; continue; }
      if (!started) { ctx.moveTo(pj.sx, pj.sy); started = true; } else ctx.lineTo(pj.sx, pj.sy);
    }
    ctx.stroke();
    const pj = projP(m.pos);
    if (pj.vis) {
      ctx.fillStyle = '#ffd27a';
      const r = Math.max(2, 2.5 * pj.scale);
      ctx.beginPath(); ctx.arc(pj.sx, pj.sy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFx() {
  for (const f of g.fx) {
    const k = f.t / f.dur;
    const c = projP(f.pos);
    if (!c.vis) continue;
    // core flash
    if (k < 0.4) {
      const fr = (1 - k / 0.4);
      const r = f.size * c.scale * (0.4 + k * 1.6);
      const grd = ctx.createRadialGradient(c.sx, c.sy, 0, c.sx, c.sy, r);
      grd.addColorStop(0, `rgba(255,255,220,${fr})`);
      grd.addColorStop(0.4, `rgba(255,180,80,${fr * 0.9})`);
      grd.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(c.sx, c.sy, r, 0, Math.PI * 2); ctx.fill();
    }
    // particles
    for (const pt of f.parts) {
      const wp = V.add(f.pos, V.scale(pt.dir, pt.spd * f.t));
      const pj = projP(wp);
      if (!pj.vis) continue;
      const a = 1 - k;
      ctx.fillStyle = `rgba(255,${140 + 80 * a | 0},${60 * a | 0},${a})`;
      const r = Math.max(1, pt.r * pj.scale * (1 - k * 0.5));
      ctx.fillRect(pj.sx - r, pj.sy - r, r * 2, r * 2);
    }
  }
}

// ---------- HUD ----------
function drawHUD() {
  const p = g.player;
  // reticle
  HUD.drawReticle(ctx, W, H, p.gunHeat);

  const tgt = g.enemies.find((e) => e.id === g.targetId && !e.dead);
  // radar blips
  const blips = [];
  const RRANGE = 600;
  for (const e of g.enemies) {
    if (e.dead) continue;
    const rel = V.sub(e.pos, p.pos);
    const rx = V.dot(rel, p.ori.right);
    const ry = V.dot(rel, p.ori.up);
    const rz = V.dot(rel, p.ori.fwd);
    const d = Math.max(1, Math.hypot(rx, ry, rz));
    const nx = (rx / RRANGE);
    const nz = (rz / RRANGE);
    blips.push({ x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, nz)), front: rz > 0, target: e.id === g.targetId });
  }
  HUD.drawRadar(ctx, W, H, blips);

  // target box + lead
  if (tgt) {
    const c = projP(tgt.pos);
    const info = {
      name: tgt.name, dist: V.len(V.sub(tgt.pos, p.pos)),
      shield: tgt.shield / tgt.shieldMax, hull: tgt.hull / tgt.hullMax,
      locking: g.lock.id === tgt.id && g.lock.prog > 0 && g.lock.prog < 1,
      locked: g.lock.id === tgt.id && g.lock.prog >= 1,
      lockProg: g.lock.prog,
    };
    if (c.vis) {
      const r = Math.max(16, tgt.radius * c.scale * 1.3);
      HUD.drawTargetBox(ctx, { x: c.sx, y: c.sy, r }, info);
      // lead indicator
      const rel = V.sub(tgt.pos, p.pos);
      const t = V.len(rel) / BOLT_SPEED;
      const vr = V.sub(tgt.vel, V.scale(p.ori.fwd, p.speed));
      const lead = V.add(tgt.pos, V.scale(vr, t));
      const lp = projP(lead);
      if (lp.vis && info.dist < 500) HUD.drawLead(ctx, lp.sx, lp.sy);
    } else {
      // off-screen arrow toward target
      const rel = V.sub(tgt.pos, p.pos);
      const rx = V.dot(rel, p.ori.right), ry = V.dot(rel, p.ori.up);
      const ang = Math.atan2(-ry, rx);
      HUD.drawEdgeArrow(ctx, W, H, ang, '#ffe14d', 'TARGET');
    }
  }

  // enemy-behind arrows for the closest few threats off-screen
  let warned = 0;
  for (const e of g.enemies) {
    if (e.dead || e.id === g.targetId) continue;
    const rel = V.sub(e.pos, p.pos);
    const rz = V.dot(rel, p.ori.fwd);
    const c = projP(e.pos);
    const onScreen = c.vis && c.sx > 0 && c.sx < W && c.sy > 0 && c.sy < H;
    if (!onScreen && warned < 3) {
      const rx = V.dot(rel, p.ori.right), ry = V.dot(rel, p.ori.up);
      const ang = Math.atan2(-ry, rx);
      HUD.drawEdgeArrow(ctx, W, H, ang, rz > 0 ? '#ff7a5a' : '#ff4d4d', rz > 0 ? '' : 'BEHIND');
      warned++;
    }
  }

  // shields, throttle, radar, topbar
  HUD.drawShields(ctx, W, H, p.shieldFront / SHIELD_MAX, p.shieldRear / SHIELD_MAX, p.hull / HULL_MAX);
  HUD.drawThrottle(ctx, W, H, p.throttle, p.abFuel, p.ab, p.speed);
  HUD.drawTopBar(ctx, W, H, {
    wave: g.wave, totalWaves: g.totalWaves, enemiesLeft: aliveCount(),
    kills: g.kills, missiles: p.missiles, gunHeat: p.gunHeat,
  });

  if (p.overheat) {
    ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 13px "Courier New",monospace'; ctx.textAlign = 'center';
    ctx.fillText('GUNS OVERHEATED', W / 2, H * 0.58);
  }

  if (g.state === 'waveclear') {
    const nextIsLast = g.wave >= g.totalWaves;
    HUD.drawMessage(ctx, W, H, 'WING CLEAR', nextIsLast ? 'Final wing inbound…' : `Wave ${g.wave} cleared — next wing warping in…`, Math.min(1, g.msgT * 2));
  }
}

// enemiesLeft counter shown in top bar: use actual alive count
function aliveCount() { return g.enemies.filter((e) => !e.dead).length + g.spawnQueue; }

function drawTitle() {
  // faint starfield already drawn. Big title + briefing.
  ctx.save();
  ctx.textAlign = 'center';
  // glow title
  ctx.fillStyle = '#ffb020';
  ctx.font = 'bold 62px "Courier New",monospace';
  ctx.shadowColor = 'rgba(255,150,20,0.6)'; ctx.shadowBlur = 24;
  ctx.fillText('WING COMMOORE', W / 2, H * 0.30);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#37e0ff';
  ctx.font = '16px "Courier New",monospace';
  ctx.fillText('A Moore-Cat Dogfighting Simulator', W / 2, H * 0.37);

  // briefing box
  ctx.fillStyle = 'rgba(8,18,32,0.7)';
  const bw = W * 0.62, bx = (W - bw) / 2, by = H * 0.42, bh = H * 0.40;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#2f6fa0'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfe6ff'; ctx.font = '13px "Courier New",monospace';
  const lines = [
    'MISSION BRIEFING — TCS Moore, sector Vega-9',
    'The Kilrathi Moore have jumped in. Clear all 4 wings.',
    '',
    'ARROWS / W,S ....... pitch      A / D ....... yaw',
    'Q / E ............. roll        Z / X ....... throttle',
    'SPACE ............. fire lasers SHIFT ....... afterburner',
    'M / CTRL .......... missile     T ........... cycle target',
    'R ................. restart     ; ........... mute',
    '',
    'Get a LOCK (hold target in reticle) before firing missiles.',
  ];
  let ly = by + 24;
  for (const l of lines) { ctx.fillText(l, bx + 20, ly); ly += 17; }

  ctx.textAlign = 'center';
  const blink = (Math.sin(g.t * 4) * 0.5 + 0.5);
  ctx.fillStyle = `rgba(255,220,80,${0.4 + blink * 0.6})`;
  ctx.font = 'bold 22px "Courier New",monospace';
  ctx.fillText('PRESS ENTER TO LAUNCH', W / 2, H * 0.90);
  ctx.restore();
}

function drawOverlay(title, sub, col) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = col; ctx.font = 'bold 46px "Courier New",monospace';
  ctx.shadowColor = col; ctx.shadowBlur = 20;
  ctx.fillText(title, W / 2, H * 0.44);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#cfe6ff'; ctx.font = '16px "Courier New",monospace';
  ctx.fillText(sub, W / 2, H * 0.52);
  ctx.restore();
}

// light direction rotates slowly for a bit of life
function updateLight() { g._light = { x: 0.4, y: 0.55, z: -0.72 }; }
updateLight();

// ---------- test hook ----------
function syncHook() {
  window.__wc.state = g.state;
  window.__wc.hull = g.player.hull;
  window.__wc.kills = g.kills;
  window.__wc.wave = g.wave;
  window.__wc.enemies = g.enemies.filter((e) => !e.dead).length;
}
window.__wc = {
  state: 'title', hull: HULL_MAX, kills: 0, wave: 0, enemies: 0,
  start() { startGame(); },
  fire() { audio.ensure(); playerFire(); },
  launchMissile() { launchMissile(); },
  spawnEnemyAhead() {
    audio.ensure();
    if (g.state === 'title') startGame();
    const p = g.player;
    return spawnOne(p.ori.fwd);
  },
  forceLock() { const t = g.enemies.find((e) => !e.dead); if (t) { g.targetId = t.id; g.lock.id = t.id; g.lock.prog = 1; } },
  get game() { return g; },
};

requestAnimationFrame(frame);
