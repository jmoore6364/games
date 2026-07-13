import { LEVELS, COLS, ROWS } from './levels.js';
import { Game } from './game.js';
import { TILE, sprites, drawSprite, drawBrick, drawSolid, drawLadder, drawRope, drawHole } from './sprites.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { editor, initEditor, shareURL } from './editor.js';
import { decodeShare, customLevels, storeCustomLevels } from './share.js';
import './touch.js';

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const BOARD_H = ROWS * TILE;

const START_LIVES = 5;
const LEVEL_BONUS = 1500;

let state = 'title';      // title | levels | editor | intro | play | pause | dying | next | gameover | victory
let stateT = 0;
let level = 0;
let selLevel = 0;
let lives = START_LIVES;
let banked = 0;           // score carried between Game instances
let game = null;
let particles = [];
let flashT = 0;
let hiscore = +(localStorage.getItem('lodeRunner.hiscore') || 0);
let unlocked = +(localStorage.getItem('lodeRunner.unlocked') || 0);

let playMode = 'campaign'; // campaign | custom (saved/shared) | test (from the builder)
let customDef = null;
let sharedDef = null;
try {
  if (location.hash.startsWith('#lvl=')) sharedDef = decodeShare(location.hash.slice(5));
} catch { /* bad share link; ignore */ }

let titleSel = 0;
let levelsSel = 0;

const totalScore = () => banked + (game ? game.score : 0);

function save() {
  hiscore = Math.max(hiscore, totalScore());
  localStorage.setItem('lodeRunner.hiscore', hiscore);
  localStorage.setItem('lodeRunner.unlocked', unlocked);
}

function startRun(fromLevel) {
  playMode = 'campaign';
  level = fromLevel;
  lives = START_LIVES;
  banked = 0;
  loadLevel();
}

function loadLevel() {
  game = new Game(LEVELS[level]);
  particles = [];
  setState('intro', 1.3);
}

function startCustom(def, mode) {
  playMode = mode;
  customDef = def;
  banked = 0;
  lives = mode === 'test' ? 1 : START_LIVES;
  game = new Game(def);
  particles = [];
  setState('intro', mode === 'test' ? 0.7 : 1.3);
}

function enterEditor() {
  state = 'editor';
  game = null;
  editor.show();
}

function setState(s, t) { state = s; stateT = t; }

function currentLevelTitle() {
  if (playMode === 'campaign') return [`LEVEL ${level + 1}`, LEVELS[level].name];
  if (playMode === 'test') return ['PLAYTEST', customDef.name];
  return ['CUSTOM LEVEL', customDef.name];
}

// ---------- title / level-browser menus ----------

function titleItems() {
  const items = [{ id: 'play', label: `< LEVEL ${selLevel + 1}: ${LEVELS[selLevel].name} >` }];
  if (sharedDef) items.push({ id: 'shared', label: `PLAY SHARED: ${sharedDef.name}` });
  if (customLevels().length) items.push({ id: 'mine', label: 'MY LEVELS' });
  items.push({ id: 'build', label: 'LEVEL BUILDER' });
  return items;
}

const menuY = i => 205 + i * 27;

function activateTitle(item) {
  audio.unlock();
  if (item.id === 'play') { audio.startMusic(); startRun(selLevel); }
  else if (item.id === 'shared') { audio.startMusic(); startCustom(sharedDef, 'custom'); }
  else if (item.id === 'mine') { state = 'levels'; levelsSel = 0; }
  else if (item.id === 'build') enterEditor();
}

const levelsRowY = i => 130 + i * 26;

function levelsEntries() {
  return [...customLevels().map(l => l.name), 'BACK'];
}

function activateLevels(idx, del) {
  const list = customLevels();
  if (idx === list.length) { state = 'title'; return; } // BACK
  if (del) {
    storeCustomLevels(list.filter((_, i) => i !== idx));
    levelsSel = Math.min(levelsSel, customLevels().length);
    return;
  }
  audio.unlock();
  audio.startMusic();
  startCustom(list[idx], 'custom');
}

// canvas clicks/taps on the menus
cv.addEventListener('pointerdown', ev => {
  if (state !== 'title' && state !== 'levels') return;
  const rect = cv.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (cv.width / rect.width);
  const y = (ev.clientY - rect.top) * (cv.height / rect.height);
  if (state === 'title') {
    const items = titleItems();
    for (let i = 0; i < items.length; i++) {
      if (Math.abs(y - (menuY(i) - 6)) < 13) {
        titleSel = i;
        if (items[i].id === 'play' && x < cv.width * 0.35) {
          selLevel = (selLevel + 1) % (unlocked + 1); // tap left third cycles levels
          return;
        }
        activateTitle(items[i]);
        return;
      }
    }
  } else {
    const entries = levelsEntries();
    for (let i = 0; i < entries.length; i++) {
      if (Math.abs(y - (levelsRowY(i) - 6)) < 12) {
        levelsSel = i;
        activateLevels(i, i < entries.length - 1 && x > cv.width * 0.8);
        return;
      }
    }
  }
});

function spawnDigParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x + Math.random() * TILE, y: y + Math.random() * 8,
      vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 120,
      t: 0.45, c: Math.random() < 0.5 ? '#a83820' : '#701c0c',
    });
  }
}

function handleEvents() {
  for (const e of game.drainEvents()) {
    if (e === 'gold' || e === 'drop') audio.gold();
    else if (e === 'dig') {
      audio.dig();
      const p = game.player;
      spawnDigParticles((p.cx + p.face) * TILE, (p.cy + 1) * TILE);
    }
    else if (e === 'trap') audio.trap();
    else if (e === 'guardDie') audio.guardDie();
    else if (e === 'reveal') { audio.reveal(); flashT = 0.5; }
    else if (e === 'die') { audio.die(); setState('dying', 1.5); }
    else if (e === 'win') {
      audio.win();
      banked += game.score + LEVEL_BONUS;
      if (playMode === 'campaign') {
        lives = Math.min(9, lives + 1);
        unlocked = Math.max(unlocked, Math.min(level + 1, LEVELS.length - 1));
        save();
      }
      setState('next', playMode === 'campaign' ? 1.8 : 1.4);
    }
  }
}

// ---------- update ----------

function update(dt) {
  input.poll();
  if (input.consume('mute')) audio.toggleMute();
  const start = input.consume('start');
  const digL = input.consume('digL');
  const digR = input.consume('digR');
  const restart = input.consume('restart');
  // one-shot direction edges; only the menus use them, but always drain them
  const navDY = (input.consume('navdown') ? 1 : 0) - (input.consume('navup') ? 1 : 0);
  const navDX = (input.consume('navright') ? 1 : 0) - (input.consume('navleft') ? 1 : 0);

  if (state === 'title') {
    const items = titleItems();
    titleSel = Math.min(titleSel, items.length - 1);
    if (navDY) titleSel = (titleSel + navDY + items.length) % items.length;
    else if (navDX && items[titleSel].id === 'play') {
      selLevel = Math.max(0, Math.min(unlocked, selLevel + navDX));
    }
    if (start || digL || digR) activateTitle(items[titleSel]);
    return;
  }

  if (state === 'levels') {
    const entries = levelsEntries();
    levelsSel = Math.min(levelsSel, entries.length - 1);
    if (navDY) levelsSel = (levelsSel + navDY + entries.length) % entries.length;
    if (start) activateLevels(levelsSel, false);
    if (digR && levelsSel < entries.length - 1) activateLevels(levelsSel, true); // X deletes
    return;
  }

  if (state === 'editor') {
    editor.update(dt);
    return;
  }

  if (state === 'intro') {
    stateT -= dt;
    if (stateT <= 0 || start) setState('play', 0);
    return;
  }

  if (state === 'play') {
    if (start) { setState('pause', 0); return; }
    if (restart) { game.kill('restart'); }
    game.update(dt, { dx: input.dx, dy: input.dy, digL, digR });
    handleEvents();
    updateParticles(dt);
    if (flashT > 0) flashT -= dt;
    return;
  }

  if (state === 'pause') {
    if (start) setState('play', 0);
    return;
  }

  stateT -= dt;
  updateParticles(dt);

  if (state === 'dying' && stateT <= 0) {
    if (playMode === 'test') { enterEditor(); return; }
    banked += game.score;
    if (playMode === 'campaign') save();
    lives--;
    if (lives < 0) { audio.gameOver(); setState('gameover', 3); }
    else if (playMode === 'campaign') loadLevel();
    else { game = new Game(customDef); particles = []; setState('intro', 1.3); }
  } else if (state === 'next' && stateT <= 0) {
    if (playMode === 'test') { enterEditor(); return; }
    if (playMode === 'custom') { game = null; banked = 0; setState('title', 0); return; }
    level++;
    if (level >= LEVELS.length) setState('victory', 6);
    else loadLevel();
  } else if ((state === 'gameover' || state === 'victory') && (stateT <= 0 || start)) {
    if (playMode === 'campaign') save();
    game = null;
    banked = 0;
    if (playMode === 'test') enterEditor();
    else setState('title', 0);
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.t -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * dt;
  }
  particles = particles.filter(p => p.t > 0);
}

// ---------- render ----------

function pickFrame(ent, isPlayer) {
  const g = game;
  const cell = g.at(ent.cx, ent.cy);
  if (isPlayer && g.digT > 0) return 'dig';
  if (!isPlayer && ent.trapped) return (ent.anim * 6 | 0) % 2 ? 'fall' : 'stand';
  const fr = (ent.anim * 1.6 | 0) % 2;
  if (cell === '-' && (!ent.moving || ent.move === 'rope')) return fr ? 'hang1' : 'hang0';
  if (ent.moving) {
    if (ent.move === 'fall') return 'fall';
    if (ent.move === 'climb') return fr ? 'climb1' : 'climb0';
    return fr ? 'run1' : 'run0';
  }
  if (cell === 'H') return 'climb0';
  return 'stand';
}

function drawEnt(ent, isPlayer) {
  const set = isPlayer ? sprites.player : sprites.guard;
  const frame = pickFrame(ent, isPlayer);
  const x = ent.x * TILE, y = ent.y * TILE;
  if (!isPlayer && ent.grace > 0 && (ent.grace * 12 | 0) % 2) return; // spawn shimmer
  drawSprite(ctx, set[frame], x, y, ent.face < 0 && !frame.startsWith('climb'));
  if (!isPlayer && ent.carrying) {
    ctx.fillStyle = '#ffd020';
    ctx.fillRect(x + 9, y + 13, 6, 4);
  }
}

function drawBoard() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, BOARD_H);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const raw = game.grid[y][x];
      const px = x * TILE, py = y * TILE;
      if (raw === '#' || raw === 'T') {
        const h = game.holes.get(x + ',' + y);
        if (h) {
          const [phase, k] = game.holePhase(h);
          drawHole(ctx, px, py, phase, k);
        } else drawBrick(ctx, px, py);
      } else if (raw === '@') drawSolid(ctx, px, py);
      else if (raw === 'H') drawLadder(ctx, px, py, false);
      else if (raw === '-') drawRope(ctx, px, py);
      else if (raw === 'X' && game.revealed) drawLadder(ctx, px, py, true);
    }
  }
  for (const k of game.gold) {
    const [x, y] = k.split(',').map(Number);
    ctx.drawImage(sprites.gold, x * TILE, y * TILE);
  }
  for (const g of game.guards) if (!g.dead) drawEnt(g, false);
  if (!(state === 'dying' && (stateT * 10 | 0) % 2)) drawEnt(game.player, true);
  ctx.fillStyle = '#8a5020';
  for (const p of particles) ctx.fillRect(p.x, p.y, 3, 3);
  if (flashT > 0) {
    ctx.fillStyle = `rgba(255, 232, 120, ${flashT * 0.4})`;
    ctx.fillRect(0, 0, cv.width, BOARD_H);
  }
}

function text(str, x, y, size, color, align = 'left') {
  ctx.font = `700 ${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function drawHUD() {
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, BOARD_H, cv.width, cv.height - BOARD_H);
  const y = BOARD_H + 21;
  text(`SCORE ${String(totalScore()).padStart(6, '0')}`, 10, y, 15, '#f8d848');
  const hi = playMode === 'campaign' ? Math.max(hiscore, totalScore()) : hiscore;
  text(`HI ${String(hi).padStart(6, '0')}`, 190, y, 15, '#8890b0');
  const left = game ? game.gold.size + game.carried : 0;
  text(`GOLD ${left}`, 340, y, 15, '#ffd020');
  text(`MEN ${playMode === 'test' ? '-' : Math.max(0, lives)}`, 448, y, 15, '#58c8ff');
  const lvl = playMode === 'campaign' ? `LVL ${level + 1}` : playMode === 'test' ? 'TEST' : 'CUSTOM';
  text(lvl, 540, y, 15, '#e8f4ff');
  if (audio.muted) text('MUTE', 610, y, 15, '#667');
}

function overlayBox() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, cv.width, BOARD_H);
}

function drawTitle(t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  for (let x = 0; x < COLS; x++) drawBrick(ctx, x * TILE, BOARD_H - TILE * 2);
  drawLadder(ctx, 3 * TILE, BOARD_H - TILE * 5, false);
  drawLadder(ctx, 3 * TILE, BOARD_H - TILE * 4, false);
  drawLadder(ctx, 3 * TILE, BOARD_H - TILE * 3, false);
  ctx.drawImage(sprites.gold, 16 * TILE, BOARD_H - TILE * 3);
  ctx.drawImage(sprites.gold, 21 * TILE, BOARD_H - TILE * 3);
  const bounce = Math.sin(t * 2) * 4;
  text('LODE RUNNER', cv.width / 2 + 4, 108 + 4 + bounce, 52, '#78290c', 'center');
  text('LODE RUNNER', cv.width / 2, 108 + bounce, 52, '#f8a800', 'center');
  text("MOORE'S GOLD", cv.width / 2, 144, 20, '#0aa7a0', 'center');

  const items = titleItems();
  for (let i = 0; i < items.length; i++) {
    const sel = i === titleSel;
    const label = sel ? `> ${items[i].label} <` : items[i].label;
    text(label, cv.width / 2, menuY(i), 17, sel ? '#f8d848' : '#aab', 'center');
  }
  const run = (t * 3 | 0) % 2 ? 'run1' : 'run0';
  drawSprite(ctx, sprites.player[run], ((t * 60) % (cv.width + 48)) - 24, BOARD_H - TILE * 3, false);
  drawSprite(ctx, sprites.guard[run], ((t * 60) % (cv.width + 48)) - 24 - 60, BOARD_H - TILE * 3, false);
  text('up/down choose - left/right pick level - enter/start go', cv.width / 2, 306, 12, '#667', 'center');
  text('collect all gold - the exit ladder appears - climb out the top', cv.width / 2, 322, 12, '#99a', 'center');
  text(`HI ${String(hiscore).padStart(6, '0')}`, cv.width / 2, BOARD_H + 20, 14, '#8890b0', 'center');
}

function drawLevels() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  text('MY LEVELS', cv.width / 2, 80, 30, '#f8a800', 'center');
  const entries = levelsEntries();
  for (let i = 0; i < entries.length; i++) {
    const sel = i === levelsSel;
    text(sel ? `> ${entries[i]} <` : entries[i], cv.width / 2, levelsRowY(i), 16,
      sel ? '#f8d848' : entries[i] === 'BACK' ? '#99a' : '#e8f4ff', 'center');
  }
  text('enter play - X delete - built levels save here from the builder',
    cv.width / 2, BOARD_H - 18, 12, '#667', 'center');
}

let last = 0, titleT = 0;
function frame(ts) {
  const dt = Math.min((ts - last) / 1000 || 0, 1 / 30);
  last = ts;
  update(dt);

  if (state === 'title') {
    titleT += dt;
    drawTitle(titleT);
  } else if (state === 'levels') {
    drawLevels();
  } else if (state === 'editor') {
    editor.draw();
  } else {
    drawBoard();
    drawHUD();
    if (state === 'intro') {
      overlayBox();
      const [a, b] = currentLevelTitle();
      text(a, cv.width / 2, 170, 30, '#f8a800', 'center');
      text(b, cv.width / 2, 205, 20, '#e8f4ff', 'center');
    } else if (state === 'pause') {
      overlayBox();
      text('PAUSED', cv.width / 2, 190, 30, '#f8d848', 'center');
      text('ENTER TO RESUME', cv.width / 2, 220, 14, '#99a', 'center');
    } else if (state === 'next') {
      overlayBox();
      text('LEVEL CLEAR!', cv.width / 2, 180, 30, '#58f898', 'center');
      if (playMode === 'campaign') {
        text(`BONUS ${LEVEL_BONUS}   EXTRA MAN`, cv.width / 2, 212, 16, '#f8d848', 'center');
      }
    } else if (state === 'gameover') {
      overlayBox();
      text('GAME OVER', cv.width / 2, 190, 34, '#ff5a48', 'center');
      text(`SCORE ${totalScore()}`, cv.width / 2, 222, 16, '#f8d848', 'center');
    } else if (state === 'victory') {
      overlayBox();
      text('YOU CLEANED OUT THE HOARD!', cv.width / 2, 160, 24, '#ffd020', 'center');
      text(`ALL ${LEVELS.length} LEVELS CLEAR`, cv.width / 2, 195, 18, '#58f898', 'center');
      text(`FINAL SCORE ${totalScore()}`, cv.width / 2, 228, 18, '#f8d848', 'center');
    }
  }
  requestAnimationFrame(frame);
}

initEditor({
  canvas: cv,
  g: ctx,
  isEditing: () => state === 'editor',
  onTest: def => { audio.unlock(); startCustom(def, 'test'); },
  onExit: () => { setState('title', 0); },
});
if (sharedDef) titleSel = 1; // preselect the shared level entry
requestAnimationFrame(frame);

// dev/test hooks (browser console)
window.lodeRunner = {
  get game() { return game; },
  get state() { return state; },
  get editor() { return editor; },
  shareURL,
  goto(n) { playMode = 'campaign'; level = Math.max(0, Math.min(LEVELS.length - 1, n - 1)); lives = START_LIVES; loadLevel(); },
  skip() { if (game) { game.gold.clear(); game.carried = 0; game.revealed = true; game.status = 'won'; game.events.push('win'); handleEvents(); } },
  openEditor() { enterEditor(); },
};
