// main.js — Street Moore II: round flow, combat resolution, HUD, rendering, test hook.
import {
  Fighter, Projectile, FIGHTERS, MOVES,
  FLOOR_Y, STAGE_W, VIEW_W, VIEW_H, roundRect,
} from './fighter.js';
import { drawStage } from './stage.js';
import { AI } from './ai.js';
import * as Audio from './audio.js';
import * as Input from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;

// ---------- responsive letterbox ----------
function resize() {
  const aspect = VIEW_W / VIEW_H;
  let w = window.innerWidth, h = window.innerHeight;
  if (w / h > aspect) w = h * aspect; else h = w / aspect;
  canvas.style.width = Math.round(w) + 'px';
  canvas.style.height = Math.round(h) + 'px';
}
window.addEventListener('resize', resize);
resize();
Input.initTouch();

// ---------- game object ----------
const G = {
  state: 'title',       // title | intro | fight | ko | matchend | paused
  prevState: 'title',
  mode: '1p',           // 1p | 2p
  menuSel: 0,           // 0 = 1P vs CPU, 1 = 2P local
  round: 1,
  roundTime: 60,
  timeLeft: 60,
  timer: 0,
  announce: '',
  announceT: 0,
  announceBig: false,
  timeScale: 1,
  slowT: 0,
  screenShake: 0,
  p1: null, p2: null,
  ai: null,
  projectiles: [],
  particles: [],
  cam: 0,
  hpDisp1: 100, hpDisp2: 100,
  forcePlayer: null,    // test hook: queued player command
  titleT: 0,
  flashScreen: 0,
};

function makeMatch() {
  const pdef = FIGHTERS.ryu;
  const odef = FIGHTERS.ken;
  G.p1 = new Fighter(pdef, 360, 1, 'left');
  G.p2 = new Fighter(odef, 600, -1, 'right');
  G.p1.wins = 0; G.p2.wins = 0;
  G.ai = new AI(G.p2, 1);
  G.round = 1;
  G.projectiles = [];
  G.particles = [];
}

function startRound() {
  const p1x = 360, p2x = 600;
  G.p1.reset(p1x, 1);
  G.p2.reset(p2x, -1);
  G.projectiles = [];
  G.particles = [];
  G.timeLeft = G.roundTime;
  G.hpDisp1 = 100; G.hpDisp2 = 100;
  if (G.ai) G.ai.setLevel(G.round);
  G.state = 'intro';
  G.timer = 0;
  setAnnounce(`ROUND ${G.round}`, true, 150);
  Audio.sfx.roundBell();
}

function setAnnounce(text, big, dur) {
  G.announce = text; G.announceBig = big; G.announceT = dur;
}

function startMatch(mode) {
  G.mode = mode || '1p';
  Audio.resume();
  makeMatch();
  startRound();
}

// ---------- combat callbacks ----------
function makeCB(self) {
  return {
    sound(name) { if (Audio.sfx[name]) Audio.sfx[name](); },
    fireball(fighter) {
      G.projectiles.push(new Projectile(fighter, fighter.facing, fighter.def));
    },
  };
}

function addSpark(x, y, big, color) {
  const n = big ? 14 : 8;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (big ? 3.5 : 2.2) * (0.5 + Math.random());
    G.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
      life: big ? 18 : 12, max: big ? 18 : 12,
      r: (big ? 4 : 3) * (0.6 + Math.random()), color: color || (big ? '#fff4c2' : '#ffffff'),
      grav: 0.12,
    });
  }
  // central flash ring
  G.particles.push({ x, y, vx: 0, vy: 0, life: big ? 10 : 7, max: big ? 10 : 7, ring: true, r: big ? 6 : 4, color: color || '#ffffff', grav: 0 });
}

function addDust(x) {
  for (let i = 0; i < 6; i++) {
    G.particles.push({
      x: x + (Math.random() - 0.5) * 20, y: FLOOR_Y,
      vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5,
      life: 14, max: 14, r: 3 + Math.random() * 2, color: 'rgba(150,120,80,0.7)', grav: 0.05,
    });
  }
}

// ---------- input → command ----------
function buildPlayerCmd(mapName, fighter) {
  const raw = Input.readPlayer(mapName);
  const cmd = {
    moveX: raw.moveX, down: raw.down, up: raw.up,
    jumpPressed: raw.jumpPressed,
    pLPressed: raw.pLPressed, pHPressed: raw.pHPressed,
    kLPressed: raw.kLPressed, kHPressed: raw.kHPressed,
    special: null,
  };
  // motion specials consume the punch press
  if (raw.pLPressed || raw.pHPressed) {
    const m = Input.checkMotion(mapName, fighter.facing);
    if (m) { cmd.special = m; cmd.pLPressed = false; cmd.pHPressed = false; }
  }
  return cmd;
}

function emptyCmd() {
  return { moveX: 0, down: false, up: false, jumpPressed: false, pLPressed: false, pHPressed: false, kLPressed: false, kHPressed: false, special: null };
}

// ---------- fixed-step simulation ----------
function step() {
  G.timer++;

  if (G.state === 'fight') {
    // incoming-fireball flags for AI reaction
    G.p2._incomingFireball = G.projectiles.some((p) => p.owner === G.p1 && Math.sign(p.vx) === Math.sign(G.p2.x - p.x));
    G.p1._incomingFireball = G.projectiles.some((p) => p.owner === G.p2 && Math.sign(p.vx) === Math.sign(G.p1.x - p.x));

    // Player 1 command
    let c1 = buildPlayerCmd('arrows', G.p1);
    if (G.mode === '2p') {
      // In 2p, left fighter uses WASD, right fighter uses arrows.
      c1 = buildPlayerCmd('wasd', G.p1);
    }
    // test-hook forced command
    if (G.forcePlayer) { Object.assign(c1, G.forcePlayer); G.forcePlayer = null; }

    // Player 2 command
    let c2;
    if (G.mode === '2p') c2 = buildPlayerCmd('arrows', G.p2);
    else c2 = G.ai.update(G.p2, G.p1);

    G.p1.update(c1, G.p2, makeCB(G.p1));
    G.p2.update(c2, G.p1, makeCB(G.p2));

    resolveCollisions();
    resolveHits();
    updateProjectiles();

    // round timer
    if (G.timer % 60 === 0 && G.timeLeft > 0) G.timeLeft--;
    if (G.timeLeft <= 0) endRoundByTime();

    // KO check
    if (G.p1.hp <= 0 || G.p2.hp <= 0) triggerKO();
  } else if (G.state === 'intro') {
    // freeze fighters, apply gravity only
    stepIdlePhysics();
    if (G.timer === 92) { setAnnounce('FIGHT!', true, 70); Audio.sfx.fight(); }
    if (G.timer >= 150) { G.state = 'fight'; G.timer = 0; }
  } else if (G.state === 'ko') {
    stepIdlePhysics();
    updateProjectiles();
    G.koCount = (G.koCount || 0) + 1;
    if (G.koCount === 60) resolveRoundEnd();
  } else if (G.state === 'matchend') {
    stepIdlePhysics();
  }

  // particles + camera + fx always
  updateParticles();
  updateCamera();
  if (G.announceT > 0) G.announceT--;
  if (G.screenShake > 0) G.screenShake *= 0.85;
  if (G.slowT > 0) { G.slowT--; if (G.slowT <= 0) G.timeScale = 1; }
  if (G.flashScreen > 0) G.flashScreen--;

  // ease HUD hp bars
  G.hpDisp1 += (G.p1.hp - G.hpDisp1) * 0.14;
  G.hpDisp2 += (G.p2.hp - G.hpDisp2) * 0.14;
}

function stepIdlePhysics() {
  const cb = makeCB(G.p1);
  const c = emptyCmd();
  // keep them facing / falling but no actions
  G.p1.update(c, G.p2, cb);
  G.p2.update(emptyCmd(), G.p1, makeCB(G.p2));
}

function resolveCollisions() {
  const a = G.p1, b = G.p2;
  const minSep = 42 * ((a.def.girth + b.def.girth) / 2);
  const dx = b.x - a.x;
  const dist = Math.abs(dx);
  if (dist < minSep && a.airY < 40 && b.airY < 40) {
    const push = (minSep - dist) / 2;
    const dir = Math.sign(dx) || 1;
    a.x -= dir * push;
    b.x += dir * push;
    const pad = 26;
    a.x = Math.max(pad, Math.min(STAGE_W - pad, a.x));
    b.x = Math.max(pad, Math.min(STAGE_W - pad, b.x));
  }
}

function rectsOverlap(r1, r2) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

function resolveHits() {
  for (const [atk, def] of [[G.p1, G.p2], [G.p2, G.p1]]) {
    if (!atk.attack || atk.attack.hasHit) continue;
    const hr = atk.hitRect();
    if (!hr) continue;
    const dr = def.hurtRect();
    if (rectsOverlap(hr, dr)) {
      atk.attack.hasHit = true;
      const mv = atk.attack.move;
      const res = def.receiveHit(mv, atk.facing, makeCB(def));
      if (res.result === 'blocked') {
        addSpark(res.x, res.y, false, '#bfe3ff');
        G.screenShake = Math.max(G.screenShake, 3);
      } else if (res.result !== 'ignored' && res.result !== 'invuln') {
        addSpark(res.x, res.y, res.big, res.big ? '#ffd86b' : '#ffffff');
        G.screenShake = Math.max(G.screenShake, res.big ? 8 : 4);
        if (res.big) { G.slowT = 4; G.timeScale = 0.5; }
      }
    }
  }
}

function updateProjectiles() {
  for (const p of G.projectiles) {
    p.update();
    if (p.dead) continue;
    const target = p.owner === G.p1 ? G.p2 : G.p1;
    if (target.state === 'ko') continue;
    if (rectsOverlap(p.rect(), target.hurtRect())) {
      const mv = { dmg: p.dmg, hitstun: p.hitstun, blockstun: p.blockstun, kb: p.kb, knockdown: false, hb: { cy: 78 }, sfxHit: 'fireballHit' };
      const res = target.receiveHit(mv, p.dir, makeCB(target));
      p.dead = true;
      if (res.result === 'blocked') addSpark(res.x, res.y, false, '#bfe3ff');
      else if (res.result !== 'ignored' && res.result !== 'invuln') {
        addSpark(p.x, p.y, true, p.def.fire.core);
        G.screenShake = Math.max(G.screenShake, 6);
        Audio.sfx.fireballHit();
        if (target.hp <= 0) { G.slowT = 4; G.timeScale = 0.5; }
      } else if (res.result === 'invuln') {
        addSpark(p.x, p.y, false, p.def.fire.core);
      }
    }
    // projectile vs projectile: cancel
    for (const q of G.projectiles) {
      if (q !== p && !q.dead && q.owner !== p.owner && rectsOverlap(p.rect(), q.rect())) {
        p.dead = true; q.dead = true;
        addSpark((p.x + q.x) / 2, p.y, true, '#ffffff');
      }
    }
  }
  G.projectiles = G.projectiles.filter((p) => !p.dead);
}

function updateParticles() {
  for (const pt of G.particles) {
    pt.x += pt.vx; pt.y += pt.vy;
    if (pt.grav) pt.vy += pt.grav;
    pt.life--;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
}

function updateCamera() {
  const mid = (G.p1.x + G.p2.x) / 2;
  let target = mid - VIEW_W / 2;
  target = Math.max(0, Math.min(STAGE_W - VIEW_W, target));
  G.cam += (target - G.cam) * 0.12;
}

// ---------- round resolution ----------
function triggerKO() {
  if (G.state !== 'fight') return;
  // set loser(s)
  const p1dead = G.p1.hp <= 0, p2dead = G.p2.hp <= 0;
  G.state = 'ko';
  G.koCount = 0;
  G.timeScale = 0.35; G.slowT = 40;
  G.screenShake = 12;
  G.flashScreen = 8;
  Audio.sfx.ko();
  setAnnounce('K.O.', true, 130);
  // announce winner pip later
  G._roundP1dead = p1dead;
  G._roundP2dead = p2dead;
}

function endRoundByTime() {
  if (G.state !== 'fight') return;
  G.state = 'ko';
  G.koCount = 0;
  setAnnounce('TIME UP', true, 130);
  Audio.sfx.roundBell();
  if (G.p1.hp === G.p2.hp) { G._roundP1dead = false; G._roundP2dead = false; G._draw = true; }
  else if (G.p1.hp < G.p2.hp) { G._roundP1dead = true; G._roundP2dead = false; }
  else { G._roundP1dead = false; G._roundP2dead = true; }
}

function resolveRoundEnd() {
  const p1lost = G._roundP1dead, p2lost = G._roundP2dead;
  if (G._draw) {
    // draw: no pip, replay round
    G._draw = false;
    setAnnounce('DRAW', true, 90);
    setTimeout(() => {}, 0);
    startRound();
    return;
  }
  if (p1lost && !p2lost) { G.p2.wins++; G.p1.setKO(); G.p2.state = 'victory'; }
  else if (p2lost && !p1lost) { G.p1.wins++; G.p2.setKO(); G.p1.state = 'victory'; }
  else { // double KO — award nobody, replay
    startRound(); return;
  }

  if (G.p1.wins >= 2 || G.p2.wins >= 2) {
    G.state = 'matchend';
    G.timer = 0;
    const playerWon = G.p1.wins >= 2;
    if (G.mode === '2p') setAnnounce(playerWon ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS', true, 99999);
    else setAnnounce(playerWon ? 'YOU WIN' : 'YOU LOSE', true, 99999);
    if (playerWon) Audio.sfx.win(); else Audio.sfx.lose();
  } else {
    G.round++;
    // brief delay then next round
    G._nextRoundAt = 90;
    G._pendingNextRound = true;
  }
}

// ---------- main loop ----------
let last = performance.now();
let acc = 0;
const FIXED = 1000 / 60;

function frame(now) {
  let dt = now - last; last = now;
  if (dt > 100) dt = 100;
  acc += dt;
  let steps = 0;
  const budget = G.timeScale < 1 ? Math.ceil(2 / G.timeScale) : 5;
  // handle slow-mo: run one step every (1/timeScale) accumulations
  while (acc >= FIXED && steps < budget) {
    // slow-mo skip
    if (G.timeScale < 1) {
      G._slowAcc = (G._slowAcc || 0) + 1;
      const period = Math.round(1 / G.timeScale);
      if (G._slowAcc % period === 0) runStep();
    } else {
      runStep();
    }
    acc -= FIXED;
    steps++;
  }
  render();
  requestAnimationFrame(frame);
}

function runStep() {
  Input.beginFrame();
  Input.updateDirs();
  handleGlobalKeys();
  if (G.state !== 'paused' && G.state !== 'title') {
    step();
    if (G._pendingNextRound) {
      G._nextRoundAt--;
      if (G._nextRoundAt <= 0) { G._pendingNextRound = false; startRound(); }
    }
  }
  Input.clearEdges();
}

function handleGlobalKeys() {
  if (Input.consumeMute()) Audio.toggleMute();
  const enter = Input.consumeEnter();
  if (enter) {
    Audio.resume();
    if (G.state === 'title') {
      startMatch(G.menuSel === 0 ? '1p' : '2p');
    } else if (G.state === 'matchend') {
      G.state = 'title'; G.titleT = 0;
    } else if (G.state === 'fight') {
      G.prevState = 'fight'; G.state = 'paused';
    } else if (G.state === 'paused') {
      G.state = G.prevState || 'fight';
    }
  }
  // title menu navigation
  if (G.state === 'title') {
    const r = Input.readPlayer('arrows');
    const w = Input.readPlayer('wasd');
    if (r.up || w.up || r.jumpPressed || w.jumpPressed) G.menuSel = 0;
    if (r.down || w.down) G.menuSel = 1;
  }
}

// ---------- rendering ----------
function render() {
  ctx.save();
  // screen shake
  let sx = 0, sy = 0;
  if (G.screenShake > 0.5) {
    sx = (Math.random() - 0.5) * G.screenShake;
    sy = (Math.random() - 0.5) * G.screenShake;
  }
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.translate(sx, sy);

  if (G.state === 'title') { drawTitle(); ctx.restore(); return; }

  // stage (screen space with parallax)
  drawStage(ctx, G.cam, G.timer);

  // world-space entities
  ctx.save();
  ctx.translate(-G.cam, 0);
  // draw further fighter first (by x) for slight depth — draw both
  const order = G.p1.airY > G.p2.airY ? [G.p2, G.p1] : [G.p1, G.p2];
  order[0].draw(ctx);
  order[1].draw(ctx);
  for (const p of G.projectiles) p.draw(ctx);
  drawParticles();
  ctx.restore();

  // HUD (screen space)
  drawHUD();

  // announcements
  if (G.announceT > 0 || G.state === 'matchend') drawAnnounce();

  if (G.state === 'paused') drawPause();

  // KO flash
  if (G.flashScreen > 0) {
    ctx.fillStyle = `rgba(255,255,255,${G.flashScreen / 8 * 0.6})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  ctx.restore();
}

function drawParticles() {
  for (const pt of G.particles) {
    const a = pt.life / pt.max;
    if (pt.ring) {
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r + (1 - a) * 16, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = Math.min(1, a * 1.4);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * (0.4 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---- HUD ----
function drawHUD() {
  drawHealthBar(G.p1, G.hpDisp1, 16, true);
  drawHealthBar(G.p2, G.hpDisp2, VIEW_W - 16 - 250, false);

  // timer
  ctx.fillStyle = '#0d0d14';
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 2;
  roundRect(ctx, VIEW_W / 2 - 30, 12, 60, 40, 6);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = G.timeLeft <= 10 ? '#ff5b5b' : '#ffe08a';
  ctx.font = 'bold 26px "Trebuchet MS", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.max(0, Math.ceil(G.timeLeft))).padStart(2, '0'), VIEW_W / 2, 33);

  // round indicator
  ctx.font = 'bold 10px "Trebuchet MS", monospace';
  ctx.fillStyle = '#e8d9a8';
  ctx.fillText(`ROUND ${G.round}`, VIEW_W / 2, 60);
}

function drawHealthBar(f, disp, x, leftSide) {
  const w = 250, h = 20, y = 16;
  // frame
  ctx.fillStyle = '#0c0c12';
  roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 5); ctx.fill();
  // back (damage)
  ctx.fillStyle = '#5a1a1a';
  roundRect(ctx, x, y, w, h, 3); ctx.fill();
  // trailing yellow
  const dispFrac = Math.max(0, disp / f.maxHp);
  ctx.fillStyle = '#e8c04a';
  const dw = w * dispFrac;
  if (leftSide) roundRect(ctx, x, y, Math.max(0, dw), h, 3);
  else roundRect(ctx, x + w - Math.max(0, dw), y, Math.max(0, dw), h, 3);
  ctx.fill();
  // current hp (green→red)
  const frac = Math.max(0, f.hp / f.maxHp);
  const col = frac > 0.5 ? '#4fd06a' : frac > 0.25 ? '#e8c04a' : '#e0472e';
  ctx.fillStyle = col;
  const hw = w * frac;
  if (leftSide) roundRect(ctx, x, y, Math.max(0, hw), h, 3);
  else roundRect(ctx, x + w - Math.max(0, hw), y, Math.max(0, hw), h, 3);
  ctx.fill();
  // gloss
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  if (leftSide) roundRect(ctx, x, y, Math.max(0, hw), h / 2, 3);
  else roundRect(ctx, x + w - Math.max(0, hw), y, Math.max(0, hw), h / 2, 3);
  ctx.fill();
  // border
  ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 3); ctx.stroke();

  // name
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px "Trebuchet MS", monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = leftSide ? 'left' : 'right';
  ctx.fillText(f.def.name, leftSide ? x : x + w, y + h + 15);

  // win pips
  const pips = 2;
  for (let i = 0; i < pips; i++) {
    const px = leftSide ? x + i * 18 : x + w - i * 18;
    const py = y + h + 26;
    drawPip(px, py, i < f.wins, leftSide);
  }
}

function drawPip(x, y, filled, leftSide) {
  ctx.save();
  ctx.translate(x + (leftSide ? 6 : -6), y);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
    ctx.lineTo(Math.cos(a2) * 2.6, Math.sin(a2) * 2.6);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd94a' : 'rgba(255,255,255,0.15)';
  ctx.fill();
  ctx.strokeStyle = '#b98f2a'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawAnnounce() {
  const txt = G.announce;
  if (!txt) return;
  const big = G.announceBig;
  let scale = 1;
  if (G.announceT > 0 && big) {
    const p = 1 - Math.min(1, (G.announceT) / 30);
    scale = 0.6 + Math.min(1, (1 - Math.abs(0.5 - p) * 0.4)) * 0.5;
  }
  ctx.save();
  ctx.translate(VIEW_W / 2, VIEW_H / 2 - 30);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = big ? 58 : 30;
  ctx.font = `900 ${size}px "Trebuchet MS", Impact, sans-serif`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1a1020';
  ctx.strokeText(txt, 0, 0);
  const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.5, '#ffcf3a');
  grad.addColorStop(1, '#e8781f');
  ctx.fillStyle = grad;
  ctx.fillText(txt, 0, 0);
  ctx.restore();

  if (G.state === 'matchend') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px "Trebuchet MS", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press ENTER / START to rematch', VIEW_W / 2, VIEW_H / 2 + 44);
  }
}

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.font = '900 46px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = 'bold 14px monospace';
  ctx.fillText('Press ENTER to resume', VIEW_W / 2, VIEW_H / 2 + 30);
}

// ---- Title screen ----
function drawTitle() {
  G.titleT++;
  // backdrop
  drawStage(ctx, 120 + Math.sin(G.titleT * 0.006) * 60, G.titleT);
  ctx.fillStyle = 'rgba(10,6,18,0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // logo
  ctx.save();
  ctx.translate(VIEW_W / 2, 96);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const bob = Math.sin(G.titleT * 0.05) * 3;
  ctx.font = '900 60px "Trebuchet MS", Impact, sans-serif';
  ctx.lineWidth = 10; ctx.strokeStyle = '#20122a';
  ctx.strokeText('STREET MOORE', 0, bob);
  const g = ctx.createLinearGradient(0, -30, 0, 30);
  g.addColorStop(0, '#ffe27a'); g.addColorStop(0.5, '#ff9d2e'); g.addColorStop(1, '#d63a1e');
  ctx.fillStyle = g;
  ctx.fillText('STREET MOORE', 0, bob);
  // II
  ctx.font = '900 52px "Trebuchet MS", Impact, sans-serif';
  ctx.strokeText('II', 275, bob + 2);
  ctx.fillStyle = '#ffd94a';
  ctx.fillText('II', 275, bob + 2);
  ctx.restore();

  ctx.font = 'bold 13px "Trebuchet MS", monospace';
  ctx.fillStyle = '#e8d9a8';
  ctx.textAlign = 'center';
  ctx.fillText('THE WORLD MOORIOR TOURNAMENT', VIEW_W / 2, 138);

  // mini fighter previews
  drawPreviewFighter(VIEW_W / 2 - 150, 250, FIGHTERS.ryu, 1);
  drawPreviewFighter(VIEW_W / 2 + 150, 250, FIGHTERS.ken, -1);
  ctx.fillStyle = '#fff';
  ctx.font = '900 22px "Trebuchet MS"';
  ctx.textAlign = 'center';
  ctx.fillText('VS', VIEW_W / 2, 210);

  // menu
  const opts = ['1P  vs  CPU', '2P  LOCAL'];
  ctx.font = 'bold 18px "Trebuchet MS", monospace';
  for (let i = 0; i < opts.length; i++) {
    const sel = i === G.menuSel;
    ctx.fillStyle = sel ? '#ffd94a' : 'rgba(255,255,255,0.6)';
    const y = 292 + i * 26;
    ctx.fillText((sel ? '▶ ' : '   ') + opts[i], VIEW_W / 2, y);
  }

  ctx.font = '11px monospace';
  ctx.fillStyle = '#9aa';
  ctx.fillText('Up/Down or W/S to choose  •  ENTER / START to fight', VIEW_W / 2, 346);
}

const _previewFighters = {};
function drawPreviewFighter(x, y, def, facing) {
  let f = _previewFighters[def.id];
  if (!f) { f = new Fighter(def, 0, facing, 'left'); _previewFighters[def.id] = f; }
  f.animT = G.titleT;
  f.facing = facing;
  f.state = 'idle';
  f.x = 0;
  // fighter.draw places feet at FLOOR_Y; translate so feet land at y instead
  ctx.save();
  ctx.translate(x, y - FLOOR_Y);
  f.draw(ctx);
  ctx.restore();
}

// ---------- boot ----------
requestAnimationFrame(frame);

// ---------- test hook ----------
window.__sm = {
  get state() { return G.state; },
  get round() { return G.round; },
  get mode() { return G.mode; },
  get p1hp() { return G.p1 ? G.p1.hp : null; },
  get p2hp() { return G.p2 ? G.p2.hp : null; },
  get p1() { return G.p1; },
  get p2() { return G.p2; },
  get projectiles() { return G.projectiles; },
  start(mode) { startMatch(mode || '1p'); },
  // queue a player command for the next fight step
  cmd(obj) { G.forcePlayer = Object.assign(emptyCmd(), obj); },
  punch(heavy) { G.forcePlayer = Object.assign(emptyCmd(), heavy ? { pHPressed: true } : { pLPressed: true }); },
  kick(heavy) { G.forcePlayer = Object.assign(emptyCmd(), heavy ? { kHPressed: true } : { kLPressed: true }); },
  fireball() { G.forcePlayer = Object.assign(emptyCmd(), { special: 'fireball' }); },
  uppercut() { G.forcePlayer = Object.assign(emptyCmd(), { special: 'uppercut' }); },
  move(dir) { G.forcePlayer = Object.assign(emptyCmd(), { moveX: dir }); },
  hurt(who, dmg) { const f = who === 2 ? G.p2 : G.p1; if (f) f.hp = Math.max(0, f.hp - dmg); },
};
