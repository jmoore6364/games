// Moore-tris — main game: state, loop, rendering, scoring, HUD, and test hook.
import {
  PIECES, TYPES, kicksFor, createBag, spawnX,
} from './pieces.js';
import {
  COLS, ROWS, HIDDEN, TOTAL_ROWS, createGrid, cellsOf,
  collides, lockPiece, fullRows, clearRows, dropY,
} from './board.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();

// ---- Layout constants (in cells) ----
const PAD = 1;          // margin around everything
const GAP = 1;          // gap between board and panel
const PANEL = 5;        // side-panel width in cells
const GRID_W = PAD + COLS + GAP + PANEL + PAD; // total cells wide = 18
const GRID_H = PAD + ROWS + PAD;               // total cells tall = 22

let cell = 24;          // pixel size of a cell, computed on resize
let dpr = 1;
let boardX = 0, boardY = 0, panelX = 0;

// ---- Timing / difficulty ----
const DAS = 150;        // ms before auto-repeat move kicks in
const ARR = 45;         // ms between auto-repeat moves
const SOFT_INTERVAL = 40;
const LOCK_DELAY = 500;
const MAX_LOCK_RESETS = 15;

function gravityMs(level) {
  // Frames-per-cell (at 60fps) roughly following classic curves, in ms.
  const t = [
    800, 717, 633, 550, 467, 383, 300, 217, 133, 100,
    83, 83, 83, 67, 67, 67, 50, 50, 50, 33, 33,
  ];
  return t[Math.min(level, t.length - 1)];
}

const SCORE_TABLE = [0, 40, 100, 300, 1200];
const CLEAR_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'];

// ---- Game state ----
const HS_KEY = 'mooretris.highscore';
let state = 'title'; // title | playing | paused | lineclear | gameover
let grid = createGrid();
let bag = createBag();
let piece = null;      // { type, rot, x, y }
let nextQueue = [];
let hold = null;
let holdUsed = false;
let score = 0;
let lines = 0;
let level = 0;
let highScore = Number(localStorage.getItem(HS_KEY) || 0);

let gravAcc = 0;
let lockTimer = 0;
let lockResets = 0;
let grounded = false;

// DAS state
let dasTime = 0, dasActive = false, arrTime = 0;
let softAcc = 0;

// Line clear animation
let clearRowsList = [];
let clearTimer = 0;
const CLEAR_DUR = 320;
let lastClearName = '';
let clearNameTimer = 0;

let flashLevel = 0; // brief flash on level up

let lastTime = 0;

// ---------------------------------------------------------------------------
// Piece management
// ---------------------------------------------------------------------------
function refillQueue() {
  while (nextQueue.length < 4) nextQueue.push(bag.next());
}

function spawn(type) {
  const t = type || nextQueue.shift();
  refillQueue();
  const p = { type: t, rot: 0, x: spawnX(t), y: 0 };
  piece = p;
  holdUsed = false;
  grounded = false;
  lockTimer = 0;
  lockResets = 0;
  gravAcc = 0;
  // Top-out: new piece immediately overlaps something.
  if (collides(grid, p)) {
    gameOver();
  }
}

function tryMove(dx, dy) {
  if (!piece) return false;
  const np = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (!collides(grid, np)) {
    piece = np;
    return true;
  }
  return false;
}

function tryRotate(dir) {
  if (!piece) return false;
  const from = piece.rot;
  const to = (from + (dir > 0 ? 1 : 3)) % 4;
  const kicks = kicksFor(piece.type, from, to);
  for (const [kx, ky] of kicks) {
    const np = { ...piece, rot: to, x: piece.x + kx, y: piece.y + ky };
    if (!collides(grid, np)) {
      piece = np;
      return true;
    }
  }
  return false;
}

function onGround() {
  return piece && collides(grid, { ...piece, y: piece.y + 1 });
}

function resetLockOnAction() {
  if (grounded && lockResets < MAX_LOCK_RESETS) {
    lockTimer = 0;
    lockResets++;
  }
}

function hardDrop() {
  if (!piece || state !== 'playing') return;
  const target = dropY(grid, piece);
  const dist = target - piece.y;
  piece.y = target;
  score += dist * 2;
  audio.harddrop();
  lockCurrent();
}

function lockCurrent() {
  lockPiece(grid, piece);
  audio.lock();
  piece = null;
  const rows = fullRows(grid);
  if (rows.length > 0) {
    clearRowsList = rows;
    clearTimer = 0;
    state = 'lineclear';
    if (rows.length === 4) audio.tetris(); else audio.clear(rows.length);
    lastClearName = CLEAR_NAMES[rows.length];
    clearNameTimer = 1200;
  } else {
    spawn();
  }
}

function finishClear() {
  const n = clearRowsList.length;
  grid = clearRows(grid, clearRowsList);
  score += SCORE_TABLE[n] * (level + 1);
  const prevLevel = level;
  lines += n;
  level = Math.floor(lines / 10);
  if (level > prevLevel) {
    audio.levelup();
    flashLevel = 350;
  }
  clearRowsList = [];
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HS_KEY, String(highScore));
  }
  state = 'playing';
  spawn();
}

function doHold() {
  if (!piece || holdUsed || state !== 'playing') return;
  audio.hold();
  const cur = piece.type;
  if (hold === null) {
    hold = cur;
    spawn();
  } else {
    const swap = hold;
    hold = cur;
    piece = { type: swap, rot: 0, x: spawnX(swap), y: 0 };
    grounded = false;
    lockTimer = 0;
    lockResets = 0;
    if (collides(grid, piece)) gameOver();
  }
  holdUsed = true;
}

// ---------------------------------------------------------------------------
// Game control
// ---------------------------------------------------------------------------
function startGame() {
  grid = createGrid();
  bag = createBag();
  nextQueue = [];
  refillQueue();
  hold = null;
  holdUsed = false;
  score = 0;
  lines = 0;
  level = 0;
  gravAcc = 0;
  clearRowsList = [];
  lastClearName = '';
  clearNameTimer = 0;
  state = 'playing';
  audio.resume();
  audio.startArp();
  spawn();
}

function gameOver() {
  state = 'gameover';
  piece = null;
  audio.stopArp();
  audio.gameover();
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HS_KEY, String(highScore));
  }
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------
const input = createInput((action) => {
  audio.resume();
  switch (action) {
    case 'start':
      if (state === 'title' || state === 'gameover') startGame();
      else if (state === 'paused') { state = 'playing'; audio.startArp(); }
      break;
    case 'pause':
      if (state === 'playing') { state = 'paused'; audio.stopArp(); }
      else if (state === 'paused') { state = 'playing'; audio.startArp(); }
      break;
    case 'mute':
      audio.toggleMute();
      break;
    case 'left':
      if (state === 'playing' && tryMove(-1, 0)) { audio.move(); resetLockOnAction(); }
      break;
    case 'right':
      if (state === 'playing' && tryMove(1, 0)) { audio.move(); resetLockOnAction(); }
      break;
    case 'rotateCW':
      if (state === 'playing' && tryRotate(1)) { audio.rotate(); resetLockOnAction(); }
      break;
    case 'rotateCCW':
      if (state === 'playing' && tryRotate(-1)) { audio.rotate(); resetLockOnAction(); }
      break;
    case 'softDropStart':
      softAcc = SOFT_INTERVAL; // trigger an immediate step
      break;
    case 'softDropEnd':
      break;
    case 'hardDrop':
      hardDrop();
      break;
    case 'hold':
      doHold();
      break;
    default:
      break;
  }
});

// ---------------------------------------------------------------------------
// Update loop
// ---------------------------------------------------------------------------
function update(dt) {
  if (flashLevel > 0) flashLevel = Math.max(0, flashLevel - dt);
  if (clearNameTimer > 0) clearNameTimer = Math.max(0, clearNameTimer - dt);

  if (state === 'lineclear') {
    clearTimer += dt;
    if (clearTimer >= CLEAR_DUR) finishClear();
    return;
  }
  if (state !== 'playing' || !piece) return;

  // Horizontal auto-repeat (DAS/ARR)
  const dir = input.held.left ? -1 : input.held.right ? 1 : 0;
  if (dir === 0) {
    dasTime = 0; dasActive = false; arrTime = 0;
  } else {
    dasTime += dt;
    if (!dasActive) {
      if (dasTime >= DAS) { dasActive = true; arrTime = 0; }
    } else {
      arrTime += dt;
      while (arrTime >= ARR) {
        arrTime -= ARR;
        if (tryMove(dir, 0)) resetLockOnAction();
        else break;
      }
    }
  }

  // Soft drop
  if (input.held.down) {
    softAcc += dt;
    while (softAcc >= SOFT_INTERVAL) {
      softAcc -= SOFT_INTERVAL;
      if (tryMove(0, 1)) { score += 1; gravAcc = 0; }
      else break;
    }
  } else {
    softAcc = 0;
  }

  // Gravity
  gravAcc += dt;
  const gi = gravityMs(level);
  while (gravAcc >= gi) {
    gravAcc -= gi;
    if (!tryMove(0, 1)) break;
  }

  // Lock delay
  grounded = onGround();
  if (grounded) {
    lockTimer += dt;
    if (lockTimer >= LOCK_DELAY) {
      lockCurrent();
    }
  } else {
    lockTimer = 0;
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  cell = Math.max(8, Math.floor(Math.min(w / GRID_W, h / GRID_H)));
  const pxW = GRID_W * cell;
  const pxH = GRID_H * cell;
  canvas.width = Math.floor(pxW * dpr);
  canvas.height = Math.floor(pxH * dpr);
  canvas.style.width = pxW + 'px';
  canvas.style.height = pxH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  boardX = PAD * cell;
  boardY = PAD * cell;
  panelX = (PAD + COLS + GAP) * cell;
}
window.addEventListener('resize', resize);

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `rgb(${r},${g},${b})`;
}

function drawBlock(px, py, s, color, alpha = 1) {
  const inset = Math.max(1, Math.floor(s * 0.06));
  ctx.globalAlpha = alpha;
  // base gradient
  const g = ctx.createLinearGradient(px, py, px, py + s);
  g.addColorStop(0, shade(color, 40));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -45));
  ctx.fillStyle = g;
  ctx.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);
  // top-left highlight bevel
  const b = Math.max(1, Math.floor(s * 0.12));
  ctx.fillStyle = shade(color, 70);
  ctx.fillRect(px + inset, py + inset, s - inset * 2, b);
  ctx.fillRect(px + inset, py + inset, b, s - inset * 2);
  // bottom-right shadow bevel
  ctx.fillStyle = shade(color, -60);
  ctx.fillRect(px + inset, py + s - inset - b, s - inset * 2, b);
  ctx.fillRect(px + s - inset - b, py + inset, b, s - inset * 2);
  ctx.globalAlpha = 1;
}

function drawGhostBlock(px, py, s, color) {
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.strokeRect(px + 2, py + 2, s - 4, s - 4);
  ctx.globalAlpha = 1;
}

function drawWell() {
  const w = COLS * cell, h = ROWS * cell;
  // background
  ctx.fillStyle = '#0a0e18';
  ctx.fillRect(boardX, boardY, w, h);
  // subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(boardX + x * cell + 0.5, boardY);
    ctx.lineTo(boardX + x * cell + 0.5, boardY + h);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(boardX, boardY + y * cell + 0.5);
    ctx.lineTo(boardX + w, boardY + y * cell + 0.5);
    ctx.stroke();
  }
  // border
  ctx.strokeStyle = '#2b3550';
  ctx.lineWidth = 2;
  ctx.strokeRect(boardX - 1, boardY - 1, w + 2, h + 2);
}

function cellPx(gx, gy) {
  return [boardX + gx * cell, boardY + (gy - HIDDEN) * cell];
}

function drawStack() {
  for (let y = HIDDEN; y < TOTAL_ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = grid[y][x];
      if (c) {
        const [px, py] = cellPx(x, y);
        drawBlock(px, py, cell, c);
      }
    }
  }
}

function drawClearAnim() {
  const t = clearTimer / CLEAR_DUR;
  const flash = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
  for (const y of clearRowsList) {
    const py = boardY + (y - HIDDEN) * cell;
    ctx.globalAlpha = 0.85 * (1 - t);
    ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * flash})`;
    const shrink = t * cell * 0.5;
    ctx.fillRect(boardX, py + shrink, COLS * cell, cell - shrink * 2);
    ctx.globalAlpha = 1;
  }
}

function drawGhostAndPiece() {
  if (!piece) return;
  const color = PIECES[piece.type].color;
  // ghost
  const gy = dropY(grid, piece);
  if (gy !== piece.y) {
    for (const [cx, cyc] of PIECES[piece.type].states[piece.rot]) {
      const x = piece.x + cx, y = gy + cyc;
      if (y >= HIDDEN) {
        const [px, py] = cellPx(x, y);
        drawGhostBlock(px, py, cell, color);
      }
    }
  }
  // active piece
  for (const [x, y] of cellsOf(piece)) {
    if (y >= HIDDEN) {
      const [px, py] = cellPx(x, y);
      drawBlock(px, py, cell, color);
    }
  }
}

function drawMiniPiece(type, boxX, boxY, boxW, boxH, scale) {
  const s = cell * scale;
  const state = PIECES[type].states[0];
  let minX = 9, maxX = -9, minY = 9, maxY = -9;
  for (const [x, y] of state) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const pw = (maxX - minX + 1) * s;
  const ph = (maxY - minY + 1) * s;
  const ox = boxX + (boxW - pw) / 2 - minX * s;
  const oy = boxY + (boxH - ph) / 2 - minY * s;
  for (const [x, y] of state) {
    drawBlock(ox + x * s, oy + y * s, s, PIECES[type].color);
  }
}

function label(text, x, y) {
  ctx.fillStyle = '#7f8db0';
  ctx.font = `${Math.floor(cell * 0.5)}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function value(text, x, y, color = '#eef2ff') {
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(cell * 0.72)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function panelBox(x, y, w, h) {
  ctx.fillStyle = '#0a0e18';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2b3550';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawPanel() {
  const px = panelX;
  const w = PANEL * cell;
  let y = boardY;

  // HOLD
  label('HOLD', px, y + cell * 0.5);
  const holdBoxY = y + cell * 0.7;
  const holdBoxH = cell * 2.6;
  panelBox(px, holdBoxY, w, holdBoxH);
  if (hold) {
    const scale = hold === 'I' || hold === 'O' ? 0.5 : 0.55;
    drawMiniPiece(hold, px, holdBoxY, w, holdBoxH, scale);
  }
  y = holdBoxY + holdBoxH + cell * 0.5;

  // NEXT
  label('NEXT', px, y + cell * 0.5);
  let ny = y + cell * 0.7;
  const nextH = cell * 2.1;
  for (let i = 0; i < 3; i++) {
    panelBox(px, ny, w, nextH);
    const t = nextQueue[i];
    if (t) {
      const scale = t === 'I' || t === 'O' ? 0.42 : 0.46;
      drawMiniPiece(t, px, ny, w, nextH, scale);
    }
    ny += nextH + cell * 0.2;
  }
  y = ny + cell * 0.3;

  // STATS
  const stat = (name, val, color) => {
    label(name, px, y + cell * 0.45);
    value(val, px, y + cell * 1.15, color);
    y += cell * 1.5;
  };
  stat('SCORE', String(score), '#eef2ff');
  stat('HIGH', String(highScore), '#f7d308');
  stat('LEVEL', String(level), flashLevel > 0 ? '#42ff8a' : '#eef2ff');
  stat('LINES', String(lines), '#eef2ff');
}

function drawCenterText(lines2, sub) {
  const w = COLS * cell, h = ROWS * cell;
  ctx.fillStyle = 'rgba(3,5,10,0.82)';
  ctx.fillRect(boardX, boardY, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = boardX + w / 2;
  let cy = boardY + h / 2 - (lines2.length - 1) * cell * 0.9;
  for (const [txt, size, color] of lines2) {
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(cell * size)}px monospace`;
    ctx.fillText(txt, cx, cy);
    cy += cell * (size + 0.5);
  }
  if (sub) {
    ctx.fillStyle = '#9fb0d8';
    ctx.font = `${Math.floor(cell * 0.5)}px monospace`;
    ctx.fillText(sub, cx, boardY + h - cell * 1.2);
  }
}

function render() {
  ctx.fillStyle = '#04060c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawWell();
  drawStack();
  if (state === 'lineclear') {
    drawClearAnim();
  } else {
    drawGhostAndPiece();
  }
  drawPanel();

  if (state === 'title') {
    drawCenterText(
      [['MOORE', 1.5, '#31c7ef'], ['TRIS', 1.5, '#f7d308']],
      'Press ENTER / tap START',
    );
  } else if (state === 'paused') {
    drawCenterText([['PAUSED', 1.2, '#eef2ff']], 'Press P to resume');
  } else if (state === 'gameover') {
    drawCenterText(
      [['GAME', 1.3, '#ef2029'], ['OVER', 1.3, '#ef2029'], [`SCORE ${score}`, 0.7, '#eef2ff']],
      'Press ENTER to play again',
    );
  }

  // Line clear name popup
  if (clearNameTimer > 0 && lastClearName) {
    const a = Math.min(1, clearNameTimer / 400);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = lastClearName === 'TETRIS' ? '#f7d308' : '#42ff8a';
    ctx.font = `bold ${Math.floor(cell * 0.9)}px monospace`;
    ctx.fillText(lastClearName, boardX + COLS * cell / 2, boardY + ROWS * cell * 0.35);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function frame(now) {
  const dt = Math.min(50, now - lastTime || 16);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

resize();
lastTime = performance.now();
requestAnimationFrame(frame);

// ---------------------------------------------------------------------------
// Test hook
// ---------------------------------------------------------------------------
window.__mt = {
  start: startGame,
  get state() { return state; },
  get score() { return score; },
  get lines() { return lines; },
  get level() { return level; },
  get piece() { return piece ? { ...piece } : null; },
  get grid() { return grid; },
  spawn(type) { if (state === 'playing') spawn(type); },
  moveLeft() { return tryMove(-1, 0); },
  moveRight() { return tryMove(1, 0); },
  moveTo(x) {
    if (!piece) return false;
    let guard = 30;
    while (piece.x < x && guard-- > 0) { if (!tryMove(1, 0)) break; }
    while (piece.x > x && guard-- > 0) { if (!tryMove(-1, 0)) break; }
    return piece.x === x;
  },
  rotateCW() { return tryRotate(1); },
  rotateCCW() { return tryRotate(-1); },
  softStep() { return tryMove(0, 1); },
  nudgeDown(n) { let m = 0; for (let i = 0; i < n; i++) { if (tryMove(0, 1)) m++; else break; } return m; },
  hardDrop,
  hold: doHold,
  toggleMute() { return audio.toggleMute(); },
};
