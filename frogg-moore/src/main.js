// main.js — bootstrap, state machine, HUD, render orchestration, test hook.
import { World, W, H, TOP, TILE, BANK_ROW, START_TIME } from './world.js';
import { drawFrog } from './entities.js';
import { Audio } from './audio.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const audio = new Audio();
const input = new Input();
const world = new World();

const START_LIVES = 5;
const game = {
  state: 'title',      // title | playing | dying | levelclear | gameover
  score: 0,
  hi: 0,
  lives: START_LIVES,
  level: 1,
  dieT: 0,
  dieMode: 'squash',
  clearT: 0,
  flash: 0,
};

// ---------- responsive scaling ----------
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  canvas.style.width = Math.round(W * scale) + 'px';
  canvas.style.height = Math.round(H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();

// ---------- state transitions ----------
function startGame() {
  audio.resume();
  game.score = 0;
  game.lives = START_LIVES;
  game.level = 1;
  world.fullReset(1);
  game.state = 'playing';
}

function nextLife(cause) {
  game.lives--;
  if (game.lives <= 0) {
    game.state = 'gameover';
    game.hi = Math.max(game.hi, game.score);
    audio.gameOver();
  } else {
    world.softResetFrog();
    game.state = 'playing';
  }
}

function onDeath(cause) {
  game.state = 'dying';
  game.dieT = 0;
  game.dieMode = (cause === 'squash') ? 'squash' : 'splash';
  if (cause === 'squash') audio.squash();
  else if (cause === 'timeout') audio.timeout();
  else audio.splash();
}

function onHome(ev) {
  const timeBonus = Math.max(0, Math.floor(world.timer) * 10);
  game.score += 50 + timeBonus;
  if (ev.fly) { game.score += 200; audio.fly(); }
  audio.home();
  if (world.allHome()) {
    game.score += 1000;
    game.state = 'levelclear';
    game.clearT = 0;
    audio.levelClear();
  } else {
    world.softResetFrog();
  }
}

// ---------- input wiring ----------
function tryHop(dir) {
  if (game.state !== 'playing') return;
  if (world.hop(dir)) {
    audio.hop();
    // forward-progress score: reaching a new furthest (smaller) row
    const target = world.frog.toRow;
    if (target < world.furthest) {
      game.score += 10 * (world.furthest - target);
      world.furthest = target;
    }
  }
}
input.on('up', () => tryHop(0));
input.on('right', () => tryHop(1));
input.on('down', () => tryHop(2));
input.on('left', () => tryHop(3));
input.on('start', () => {
  if (game.state === 'title' || game.state === 'gameover') startGame();
});
input.on('mute', () => { const m = audio.toggleMute(); game.flash = m ? -1 : 1; });

// ---------- update ----------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

function update(dt) {
  if (game.state === 'playing') {
    const ev = world.update(dt);
    if (ev) {
      if (ev.type === 'death') onDeath(ev.cause);
      else if (ev.type === 'home') onHome(ev);
    }
  } else if (game.state === 'dying') {
    game.dieT += dt;
    // keep water/traffic moving during death for life
    for (const m of world.movers) m.update(dt);
    world.t += dt;
    if (game.dieT >= 0.95) nextLife();
  } else if (game.state === 'levelclear') {
    game.clearT += dt;
    world.t += dt;
    for (const m of world.movers) m.update(dt);
    if (game.clearT >= 2.0) {
      game.level++;
      world.fullReset(game.level);
      game.state = 'playing';
    }
  } else if (game.state === 'title' || game.state === 'gameover') {
    world.t += dt;
    for (const m of world.movers) m.update(dt);
  }
}

// ---------- render ----------
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#05100a';
  ctx.fillRect(0, 0, W, H);

  world.drawBackground(ctx);
  world.drawMovers(ctx);
  world.drawHomes(ctx);

  if (game.state === 'playing') {
    world.drawFrog(ctx, 0);
  } else if (game.state === 'dying') {
    drawDying();
  } else if (game.state === 'levelclear') {
    // frogs sit in homes; overlay banner
  }

  drawHUD();
  drawTimeBar();

  if (game.state === 'title') drawTitle();
  else if (game.state === 'gameover') drawGameOver();
  else if (game.state === 'levelclear') drawBanner('LEVEL ' + game.level + ' CLEAR!', '#ffe36b');
}

function drawDying() {
  const s = world.frogScreen();
  if (game.dieMode === 'squash') {
    const t = Math.min(1, game.dieT / 0.4);
    drawFrog(ctx, s.x, s.y, world.frogSize(), s.dir, t);
    if (game.dieT > 0.3) {
      ctx.fillStyle = '#c33';
      ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText('SPLAT', s.x, s.y - 16);
    }
  } else {
    // splash: shrink + ripple rings + bubbles
    const t = Math.min(1, game.dieT / 0.7);
    const size = world.frogSize() * (1 - t * 0.7);
    if (t < 0.9) drawFrog(ctx, s.x, s.y, size, s.dir, 0);
    ctx.strokeStyle = 'rgba(180,220,255,' + (1 - t) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, 6 + t * 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(s.x, s.y, 2 + t * 12, 0, Math.PI * 2); ctx.stroke();
  }
}

// ---------- HUD ----------
function drawHUD() {
  ctx.fillStyle = '#05100a';
  ctx.fillRect(0, 0, W, TOP);
  ctx.fillStyle = '#173d24';
  ctx.fillRect(0, TOP - 2, W, 2);

  ctx.textAlign = 'left';
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#ffe36b';
  ctx.fillText('SCORE', 8, 15);
  ctx.fillStyle = '#eafff0';
  ctx.font = 'bold 17px "Courier New", monospace';
  ctx.fillText(String(game.score).padStart(6, '0'), 8, 33);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8fe0ff';
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillText('LEVEL ' + game.level, W / 2, 26);

  // lives as little frogs
  ctx.textAlign = 'right';
  for (let i = 0; i < Math.max(0, game.lives - 1); i++) {
    drawFrog(ctx, W - 14 - i * 20, 20, 16, 0, 0);
  }
  if (audio.muted) {
    ctx.fillStyle = '#e06666';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('MUTE', W - 6, 38);
  }
}

function drawTimeBar() {
  const frac = Math.max(0, world.timer / START_TIME);
  const barW = (W - 80) * frac;
  const y = H - 8;
  ctx.fillStyle = '#0c1c12';
  ctx.fillRect(0, y - 2, W, 10);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe36b';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('TIME', 6, y + 6);
  // bar from right
  const g = frac > 0.5 ? '#4be06a' : frac > 0.25 ? '#e0c94b' : '#e0544b';
  ctx.fillStyle = g;
  ctx.fillRect(W - 6 - barW, y - 1, barW, 8);
}

// ---------- overlays ----------
function dim(a = 0.55) { ctx.fillStyle = 'rgba(2,8,5,' + a + ')'; ctx.fillRect(0, 0, W, H); }

function drawTitle() {
  dim(0.6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5ad24a';
  ctx.font = 'bold 46px "Courier New", monospace';
  ctx.fillText('FROGG', W / 2, 150);
  ctx.fillStyle = '#ffe36b';
  ctx.fillText('MOORE', W / 2, 200);
  drawFrog(ctx, W / 2, 250, 44, 0, 0);
  ctx.fillStyle = '#cfeacc';
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillText('Hop across road & river', W / 2, 320);
  ctx.fillText('Fill all 5 homes', W / 2, 344);
  ctx.fillStyle = (Math.floor(world.t * 2) % 2) ? '#8fe0ff' : '#4a8a6a';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillText('PRESS ENTER / START', W / 2, 410);
  ctx.fillStyle = '#7fae90';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('Arrows / WASD to hop  ·  M mute', W / 2, 448);
}

function drawGameOver() {
  dim(0.62);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0544b';
  ctx.font = 'bold 40px "Courier New", monospace';
  ctx.fillText('GAME OVER', W / 2, 220);
  ctx.fillStyle = '#eafff0';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillText('SCORE ' + game.score, W / 2, 270);
  ctx.fillStyle = '#ffe36b';
  ctx.fillText('BEST  ' + game.hi, W / 2, 298);
  ctx.fillStyle = (Math.floor(world.t * 2) % 2) ? '#8fe0ff' : '#4a8a6a';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText('PRESS ENTER TO RESTART', W / 2, 360);
}

function drawBanner(text, color) {
  ctx.fillStyle = 'rgba(2,8,5,0.4)'; ctx.fillRect(0, H / 2 - 40, W, 80);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillText(text, W / 2, H / 2 + 8);
}

requestAnimationFrame(frame);

// ---------- test hook ----------
window.__fm = {
  start: startGame,
  hop: tryHop,
  get state() { return game.state; },
  get score() { return game.score; },
  get lives() { return game.lives; },
  get level() { return game.level; },
  get frog() { return { x: world.frog.x, row: world.frog.row }; },
  world, game, audio,
};
