// main.js — Moore-Man game loop, state machine, HUD, scoring and rendering.

import {
  TILE, COLS, ROWS, buildLevel, HOUSE, FRUIT_TILE,
} from './maze.js';
import { Pac, Ghost, GHOST_DEFS } from './entities.js';
import { Audio } from './audio.js';
import { Input, initTouch } from './input.js';

const TOP = 24;                       // top HUD height (px, internal)
const BOARD_H = ROWS * TILE;          // 248
const CW = COLS * TILE;               // 224
const CH = TOP + BOARD_H + 16;        // + bottom strip

const canvas = document.getElementById('game');
canvas.width = CW; canvas.height = CH;
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const audio = new Audio();
const input = new Input();
initTouch(input, canvas);

function fitCanvas() {
  const pad = 4;
  const s = Math.max(1, Math.min(
    (window.innerWidth - pad) / CW,
    (window.innerHeight - pad) / CH,
  ));
  canvas.style.width = Math.floor(CW * s) + 'px';
  canvas.style.height = Math.floor(CH * s) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Scatter/chase schedule (seconds). Later levels shorten scatter phases.
function schedule(level) {
  const s = level >= 5 ? 5 : 7;
  const s2 = level >= 5 ? 3 : 5;
  return [
    { mode: 'scatter', dur: s }, { mode: 'chase', dur: 20 },
    { mode: 'scatter', dur: s }, { mode: 'chase', dur: 20 },
    { mode: 'scatter', dur: s2 }, { mode: 'chase', dur: 20 },
    { mode: 'scatter', dur: s2 }, { mode: 'chase', dur: 1e9 },
  ];
}
function frightTime(level) { return Math.max(1, 8 - (level - 1) * 0.7); }

const game = {
  state: 'title',   // title | ready | play | dying | levelclear | gameover
  score: 0,
  high: Number(localStorage.getItem('mm_high') || 0),
  lives: 3,
  level: 1,
  dotsEaten: 0,
  extraAwarded: false,
  timer: 0,
  flash: 0,
  combo: 0,
  floatScore: null, // {x,y,val,t}
  fruit: null,      // {t, taken} bonus timer
  fruitShownAt: -1,
};

let level = buildLevel();
let pac = new Pac();
let ghosts = GHOST_DEFS.map((d, i) => new Ghost(d, i));

// Mode manager state.
let sched = schedule(1);
let modeIndex = 0, modeTimer = sched[0].dur, curMode = 'scatter';
let frightTimer = 0;

function resetActors() {
  pac.reset();
  ghosts.forEach((g) => g.reset());
  sched = schedule(game.level);
  modeIndex = 0; modeTimer = sched[0].dur; curMode = 'scatter';
  frightTimer = 0;
  game.combo = 0;
  game.floatScore = null;
}

function newGame() {
  game.score = 0; game.lives = 3; game.level = 1;
  game.dotsEaten = 0; game.extraAwarded = false; game.combo = 0;
  game.fruit = null; game.fruitShownAt = -1;
  level = buildLevel();
  resetActors();
  audio.ensure();
  audio.startSiren();
  startReady();
}

function nextLevel() {
  game.level++;
  level = buildLevel();
  game.dotsEaten = 0;
  game.fruit = null; game.fruitShownAt = -1;
  resetActors();
  startReady();
}

function startReady() {
  game.state = 'ready';
  game.timer = 2.2;
  audio.intro();
}

// ---- Update ---------------------------------------------------------------

function update(dt) {
  input.pollGamepad();

  if (input.pressed('mute')) audio.setMuted(!audio.muted);
  if (input.pressed('pause') && (game.state === 'play' || game.paused)) {
    game.paused = !game.paused;
  }
  if (game.paused) { input.endFrame(); return; }

  // State-independent start/confirm.
  if ((game.state === 'title' || game.state === 'gameover') && input.pressed('start')) {
    audio.ensure();
    newGame();
    input.endFrame();
    return;
  }

  switch (game.state) {
    case 'title': break;
    case 'ready':
      game.timer -= dt;
      if (game.timer <= 0) game.state = 'play';
      break;
    case 'play': updatePlay(dt); break;
    case 'dying': updateDying(dt); break;
    case 'levelclear':
      game.timer -= dt; game.flash += dt;
      if (game.timer <= 0) nextLevel();
      break;
    case 'gameover':
      game.timer -= dt;
      break;
  }

  if (game.floatScore) { game.floatScore.t -= dt; if (game.floatScore.t <= 0) game.floatScore = null; }
  input.endFrame();
}

function updatePlay(dt) {
  // Steer Moore-Man from buffered input.
  if (input.dir) pac.next = input.dir;
  pac.update(level);

  // Eat dots / pellets.
  const pc = Math.round((pac.x - TILE / 2) / TILE);
  const pr = Math.round((pac.y - TILE / 2) / TILE);
  const wc = (pc + COLS) % COLS;
  if (pr >= 0 && pr < ROWS && wc >= 0 && wc < COLS && level.dots[pr][wc]) {
    const kind = level.dots[pr][wc];
    level.dots[pr][wc] = 0;
    level.totalDots--;
    game.dotsEaten++;
    if (kind === 2) {
      game.score += 50; audio.pellet();
      frightTimer = frightTime(game.level);
      game.combo = 0;
      ghosts.forEach((g) => g.setFrightened(true));
    } else {
      game.score += 10; audio.waka();
    }
    maybeFruit();
    if (game.score >= 10000 && !game.extraAwarded) {
      game.extraAwarded = true; game.lives++; audio.extend();
    }
    if (level.totalDots <= 0) {
      game.state = 'levelclear'; game.timer = 2.0; game.flash = 0;
      audio.updateSiren(0, false);
      return;
    }
  }

  // Fruit pickup.
  if (game.fruit && !game.fruit.taken) {
    if (Math.hypot(pac.x - FRUIT_TILE.c * TILE, pac.y - (FRUIT_TILE.r * TILE + TILE / 2)) < 7) {
      game.fruit.taken = true;
      const val = 100 + (game.level - 1) * 100;
      game.score += val; audio.fruit();
      game.floatScore = { x: pac.x, y: pac.y, val, t: 1.0 };
    }
    game.fruit.t -= dt;
    if (game.fruit.t <= 0) game.fruit = null;
  }

  // Mode clock (pauses while frightened).
  if (frightTimer > 0) {
    frightTimer -= dt;
    if (frightTimer <= 0) ghosts.forEach((g) => (g.frightened = false));
  } else {
    modeTimer -= dt;
    if (modeTimer <= 0 && modeIndex < sched.length - 1) {
      modeIndex++;
      curMode = sched[modeIndex].mode;
      modeTimer = sched[modeIndex].dur;
      ghosts.forEach((g) => g.reverse());
    }
  }

  // Update ghosts.
  const blink = ghosts[0];
  ghosts.forEach((g) => { g.mode = curMode; g.update(level, pac, blink, dt, game.level); });

  // Collisions.
  for (const g of ghosts) {
    if (g.state === 'eyes' || g.state === 'house' || g.state === 'entering') continue;
    if (Math.hypot(pac.x - g.x, pac.y - g.y) < 6.5) {
      if (g.frightened) {
        g.getEaten();
        const pts = 200 * Math.pow(2, game.combo);
        game.combo++;
        game.score += pts;
        game.floatScore = { x: g.x, y: g.y, val: pts, t: 0.9 };
        audio.eatGhost(game.combo);
      } else if (g.state === 'out' || g.state === 'leaving') {
        startDeath();
        return;
      }
    }
  }

  // Siren pitch tracks progress; quiet when frightened.
  const progress = 1 - level.totalDots / (level.totalDots + game.dotsEaten || 1);
  audio.updateSiren(Math.min(1, game.dotsEaten / 244), true, frightTimer > 0 ? 'fright' : 'normal');
}

function maybeFruit() {
  if ((game.dotsEaten === 70 || game.dotsEaten === 170) && game.fruitShownAt !== game.dotsEaten) {
    game.fruit = { t: 9, taken: false };
    game.fruitShownAt = game.dotsEaten;
  }
}

function startDeath() {
  game.state = 'dying';
  game.timer = 0;
  audio.updateSiren(0, false);
  audio.death();
}

function updateDying(dt) {
  game.timer += dt;
  if (game.timer >= 1.7) {
    game.lives--;
    if (game.lives < 0) {
      game.state = 'gameover';
      game.timer = 4;
      if (game.score > game.high) { game.high = game.score; localStorage.setItem('mm_high', game.high); }
      audio.stopSiren();
    } else {
      resetActors();
      startReady();
    }
  }
  if (game.score > game.high) { game.high = game.score; localStorage.setItem('mm_high', game.high); }
}

// ---- Render ---------------------------------------------------------------

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CW, CH);

  drawHUD();

  ctx.save();
  ctx.translate(0, TOP);

  const flashing = game.state === 'levelclear' && (Math.floor(game.flash * 6) % 2 === 0);
  drawMaze(flashing);

  if (game.state !== 'levelclear') {
    drawDots();
    drawFruit();
  }

  if (game.state === 'title') {
    drawTitle();
  } else {
    // Actors.
    if (game.state !== 'levelclear') {
      ghosts.forEach((g) => {
        const flashW = g.frightened && frightTimer < 2 && Math.floor(frightTimer * 8) % 2 === 0;
        g.draw(ctx, flashW);
      });
    }
    if (game.state === 'dying') {
      if (game.timer < 0.4) pac.draw(ctx);
      else pac.drawDeath(ctx, Math.min(1, (game.timer - 0.4) / 1.2));
    } else if (game.state !== 'levelclear') {
      pac.draw(ctx);
    }
    if (game.floatScore) {
      ctx.fillStyle = '#00e0ff';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(game.floatScore.val), game.floatScore.x, game.floatScore.y);
    }
    drawBanners();
    if (game.paused) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('PAUSED', CW / 2, HOUSE.centerY * TILE + 22);
    }
  }

  ctx.restore();
  drawLives();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('1UP', 10, 8);
  ctx.fillText(String(game.score).padStart(6, '0'), 4, 18);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd9a4';
  ctx.fillText('HIGH SCORE', CW / 2, 8);
  ctx.fillStyle = '#fff';
  ctx.fillText(String(game.high).padStart(6, '0'), CW / 2, 18);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe93b';
  ctx.fillText('LVL ' + game.level, CW - 4, 8);
}

const isWall = (c, r) => (r >= 0 && r < ROWS && c >= 0 && c < COLS && level.walls[r][c]);

function drawMaze(flashWhite) {
  const wallCol = flashWhite ? '#ffffff' : '#1b1bcf';
  const hi = flashWhite ? '#ffffff' : '#4a4aff';
  const lo = flashWhite ? '#cfcfff' : '#0c0c66';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!level.walls[r][c]) continue;
      const x = c * TILE, y = r * TILE;
      ctx.fillStyle = wallCol;
      ctx.fillRect(x, y, TILE, TILE);
      // Subtle tube shading only on exposed edges.
      ctx.fillStyle = hi;
      if (!isWall(c, r - 1)) ctx.fillRect(x, y, TILE, 1);
      if (!isWall(c - 1, r)) ctx.fillRect(x, y, 1, TILE);
      ctx.fillStyle = lo;
      if (!isWall(c, r + 1)) ctx.fillRect(x, y + TILE - 1, TILE, 1);
      if (!isWall(c + 1, r)) ctx.fillRect(x + TILE - 1, y, 1, TILE);
    }
  }
  // Ghost-house door.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (level.doors[r][c]) {
        ctx.fillStyle = '#ff9ff2';
        ctx.fillRect(c * TILE, r * TILE + 3, TILE, 2);
      }
    }
  }
}

function drawDots() {
  const blink = Math.floor(performance.now() / 250) % 2 === 0;
  ctx.fillStyle = '#ffd9a4';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const d = level.dots[r][c];
      if (!d) continue;
      const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
      if (d === 1) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      } else if (blink) {
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawFruit() {
  if (!game.fruit || game.fruit.taken) return;
  const x = FRUIT_TILE.c * TILE, y = FRUIT_TILE.r * TILE + TILE / 2;
  drawCherry(x, y);
}

function drawCherry(x, y) {
  ctx.strokeStyle = '#2fbf3f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 4); ctx.quadraticCurveTo(x, y - 6, x + 3, y - 4);
  ctx.stroke();
  ctx.fillStyle = '#ff2f2f';
  for (const dx of [-3, 2]) {
    ctx.beginPath(); ctx.arc(x + dx, y + 2, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff9a9a';
  ctx.beginPath(); ctx.arc(x - 4, y + 1, 0.8, 0, Math.PI * 2); ctx.fill();
}

function drawTitle() {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe93b';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('MOORE-MAN', CW / 2, BOARD_H * 0.32);

  // Row of the cast.
  const y = BOARD_H * 0.45;
  ctx.save();
  ctx.translate(CW / 2 - 48, y);
  ctx.fillStyle = '#ffe93b';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.arc(0, 0, 7, 0.35, Math.PI * 2 - 0.35); ctx.closePath(); ctx.fill();
  ctx.restore();
  GHOST_DEFS.forEach((d, i) => {
    ctx.fillStyle = d.color;
    const gx = CW / 2 - 20 + i * 22, gy = y;
    ctx.beginPath(); ctx.arc(gx, gy - 1, 6, Math.PI, 0);
    ctx.lineTo(gx + 6, gy + 5); ctx.lineTo(gx - 6, gy + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(gx - 3, gy - 2, 2, 2); ctx.fillRect(gx + 1, gy - 2, 2, 2);
  });

  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.fillText('BLINKMOORE  PINKMOORE', CW / 2, BOARD_H * 0.56);
  ctx.fillText('INKMOORE  CLYDEMOORE', CW / 2, BOARD_H * 0.62);

  if (Math.floor(performance.now() / 500) % 2 === 0) {
    ctx.fillStyle = '#ffe93b';
    ctx.font = '9px monospace';
    ctx.fillText('PRESS ENTER / TAP', CW / 2, BOARD_H * 0.75);
  }
  ctx.fillStyle = '#8a8aff';
  ctx.font = '6px monospace';
  ctx.fillText('10 PTS  o 50 PTS  GHOST 200+', CW / 2, BOARD_H * 0.85);
}

function drawBanners() {
  ctx.textAlign = 'center';
  if (game.state === 'ready') {
    ctx.fillStyle = '#ffe93b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('READY!', CW / 2, HOUSE.centerY * TILE + 22);
  }
  if (game.state === 'gameover') {
    ctx.fillStyle = '#ff2f2f';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('GAME OVER', CW / 2, HOUSE.centerY * TILE + 22);
  }
}

function drawLives() {
  const y = TOP + BOARD_H + 8;
  for (let i = 0; i < Math.max(0, game.lives); i++) {
    const x = 12 + i * 16;
    ctx.fillStyle = '#ffe93b';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 6, Math.PI * 0.85, Math.PI * 2 - Math.PI * 0.85, false);
    ctx.closePath();
    ctx.fill();
  }
  // Level fruit markers on the right.
  const n = Math.min(6, game.level);
  for (let i = 0; i < n; i++) drawCherry(CW - 12 - i * 14, y);
}

// ---- Loop -----------------------------------------------------------------

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  acc += Math.min(dt, 0.1);
  let guard = 0;
  while (acc >= STEP && guard < 5) { update(STEP); acc -= STEP; guard++; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- Test hook ------------------------------------------------------------
window.__mm = {
  start() { audio.ensure(); newGame(); },
  get state() { return game.state; },
  get score() { return game.score; },
  get lives() { return game.lives; },
  get level() { return game.level; },
  get dotsLeft() { return level.totalDots; },
  press(dir) { input.dir = dir; },
  game, pac, get ghosts() { return ghosts; },
};
