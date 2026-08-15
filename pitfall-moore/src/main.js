// main.js — Pitfall Moore: bootstrap, physics, state machine, HUD, render loop.
import {
  W, H, HUD_H, GROUND_Y, GROUND_BOT, UG_FLOOR, N_SCREENS, LADDER_X,
  POND, VINE, HAZARD_X,
  buildWorld, surfaceSupport, fallResult, crocOpen, vineTip, logPositions, scorpionX,
} from './world.js';
import { drawScreen, drawHarry, drawTreasure } from './entities.js';
import { Audio } from './audio.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const audio = new Audio();
const input = new Input();

const RUN = 88, JUMP_VY = -238, GRAV = 680, CLIMB = 64;
const START_TIME = 12 * 60;

const game = {
  state: 'title',
  time: 0,
  world: buildWorld(),
  screen: 0,
  score: 2000, lives: 3, timeLeft: START_TIME,
  collected: new Set(),
  p: { x: 24, y: GROUND_Y, vx: 0, vy: 0, facing: 1, frame: 0, onGround: true, climbing: false, onVine: false, vineCd: 0, iframe: 0 },
  fellFrom: null,
  dieT: 0, deathCause: '',
  msg: '', msgT: 0,
  lastTick: 0,
};
const totalTreasures = game.world.screens.filter(s => s.treasure).length;
const scr = () => game.world.screens[game.screen];
const zone = () => (game.p.y > GROUND_BOT ? 'under' : 'surface');

function msg(text, t = 2.4) { game.msg = text; game.msgT = t; }

function newGame() {
  game.screen = 0;
  game.score = 2000; game.lives = 3; game.timeLeft = START_TIME;
  game.collected = new Set();
  respawn();
  game.state = 'play';
  msg('COLLECT ALL ' + totalTreasures + ' TREASURES!', 3);
}

function respawn() {
  const p = game.p;
  p.x = 24; p.y = GROUND_Y; p.vx = 0; p.vy = 0;
  p.onGround = true; p.climbing = false; p.onVine = false;
  p.iframe = 2; p.vineCd = 0;
  game.fellFrom = null;
}

function die(cause) {
  if (game.state !== 'play') return;
  game.state = 'dying';
  game.dieT = 1.4;
  game.deathCause = cause;
  game.p.onVine = false; game.p.climbing = false;
  audio.death();
}

input.on('mute', () => audio.toggleMute());
input.on('start', () => {
  audio.resume();
  if (game.state === 'title' || game.state === 'gameover' || game.state === 'victory') newGame();
});
function doJump() {
  audio.resume();
  if (game.state !== 'play') return;
  const p = game.p;
  if (p.onVine) {
    // release with the vine's momentum
    const t2 = vineTip(game.time), t1 = vineTip(game.time - 0.03);
    p.vx = Math.max(-160, Math.min(160, (t2.x - t1.x) / 0.03 * 1.15));
    p.vy = -175;
    p.onVine = false; p.vineCd = 0.45;
    audio.jump();
  } else if (p.climbing) {
    p.climbing = false; p.vy = -140; audio.jump();
  } else if (p.onGround) {
    p.vy = JUMP_VY; p.onGround = false; audio.jump();
  }
}
input.on('action', doJump);

// ---------- update ----------
function updatePlay(dt) {
  const p = game.p;
  const d = input.dir();
  const s = scr();
  p.vineCd = Math.max(0, p.vineCd - dt);
  p.iframe = Math.max(0, p.iframe - dt);

  // ladder engagement
  const atLadder = s.ladder && Math.abs(p.x - LADDER_X) < 8;
  if (!p.climbing && atLadder) {
    if (zone() === 'surface' && p.onGround && d.down) { p.climbing = true; p.onGround = false; p.x = LADDER_X; p.vx = 0; p.vy = 0; }
    else if (zone() === 'under' && p.onGround && d.up) { p.climbing = true; p.onGround = false; p.x = LADDER_X; p.vx = 0; p.vy = 0; }
  }

  if (p.climbing) {
    const dy = (d.down ? 1 : 0) - (d.up ? 1 : 0);
    if (dy) {
      p.y += dy * CLIMB * dt;
      p.frame += dt * 8;
      if (Math.floor(p.y / 9) !== Math.floor((p.y - dy * CLIMB * dt) / 9)) audio.climb();
    }
    if (p.y <= GROUND_Y) { p.y = GROUND_Y; if (d.up) { p.climbing = false; p.onGround = true; } }
    if (p.y >= UG_FLOOR) { p.y = UG_FLOOR; if (d.down) { p.climbing = false; p.onGround = true; } }
  } else if (p.onVine) {
    const tip = vineTip(game.time);
    p.x = tip.x; p.y = tip.y + 15;
    p.facing = vineTip(game.time).x > vineTip(game.time - 0.03).x ? 1 : -1;
  } else {
    // run
    let ax = (d.right ? 1 : 0) - (d.left ? 1 : 0);
    p.vx = ax * RUN;
    if (ax) { p.facing = ax; p.frame += dt * 10; }
    p.x += p.vx * dt;

    // gravity
    p.vy += GRAV * dt;
    const prevY = p.y;
    p.y += p.vy * dt;

    if (zone() === 'surface' || prevY <= GROUND_BOT) {
      // landing on the surface line
      if (p.vy >= 0 && prevY <= GROUND_Y + 0.01 && p.y >= GROUND_Y) {
        const sup = surfaceSupport(s, p.x, game.time);
        if (sup) { p.y = GROUND_Y; p.vy = 0; p.onGround = true; }
        else {
          p.onGround = false;
          if (game.fellFrom == null) {
            const res = fallResult(s, p.x);
            game.fellFrom = res === 'under' ? (s.feature === 'holes' ? 'hole' : 'ladder') : 'death';
            if (res === 'under') audio.fall();
          }
        }
      } else if (p.onGround) {
        // walked off support (open croc jaw, quicksand opening, pit edge)
        const sup = surfaceSupport(s, p.x, game.time);
        if (!sup) {
          p.onGround = false;
          const res = fallResult(s, p.x);
          game.fellFrom = res === 'under' ? (s.feature === 'holes' ? 'hole' : 'ladder') : 'death';
          if (res === 'under') audio.fall();
        } else { p.y = GROUND_Y; p.vy = 0; }
      }
      // fell below the strip: sink or drop through
      if (!p.onGround && p.y > GROUND_Y + 9 && p.y < UG_FLOOR) {
        if (game.fellFrom === 'death') {
          const inPond = s.feature === 'crocs' && p.x > POND.x0 && p.x < POND.x1;
          return die(inPond ? 'croc' : 'sink');
        }
      }
    }
    // underground floor + ceiling
    if (p.y >= UG_FLOOR) {
      p.y = UG_FLOOR; p.vy = 0;
      if (!p.onGround) {
        p.onGround = true;
        if (game.fellFrom === 'hole') {
          game.score = Math.max(0, game.score - 100);
          audio.hit();
          msg('-100');
        }
        game.fellFrom = null;
      }
    }
    if (zone() === 'under' && !p.climbing && p.y < GROUND_BOT + 4 && p.vy < 0 && game.fellFrom == null) {
      p.y = GROUND_BOT + 4; p.vy = 0; // tunnel ceiling
    }

    // vine grab
    if (s.feature === 'tar' && !p.onGround && !p.onVine && p.vineCd <= 0 && zone() === 'surface') {
      const tip = vineTip(game.time);
      if (Math.abs(p.x - tip.x) < 13 && Math.abs((p.y - 15) - tip.y) < 15) {
        p.onVine = true; p.vy = 0;
        audio.vine();
      }
    }
  }

  // underground wall
  if (zone() === 'under' && s.wall != null && !p.climbing) {
    if (Math.abs(p.x - s.wall) < 12) p.x = s.wall + (p.x < s.wall ? -12 : 12);
  }

  // screen edges (tunnel exits skip two screens — the shortcut)
  const step = zone() === 'under' ? 2 : 1;
  if (p.x < 4) { game.screen = (game.screen - step + N_SCREENS * 2) % N_SCREENS; p.x = W - 6; p.onVine = false; p.climbing = false; }
  else if (p.x > W - 4) { game.screen = (game.screen + step) % N_SCREENS; p.x = 6; p.onVine = false; p.climbing = false; }

  // hazard contact
  if (zone() === 'surface' && p.y >= GROUND_Y - 2 && !p.onVine) {
    if ((s.feature === 'snake' || s.feature === 'fire') && Math.abs(p.x - HAZARD_X) < 9) return die(s.feature);
    if (p.iframe <= 0) {
      for (const l of logPositions(s, game.time)) {
        if (Math.abs(l.x - p.x) < 10) {
          game.score = Math.max(0, game.score - 100);
          p.iframe = 1.2;
          audio.hit();
          msg('-100');
          break;
        }
      }
    }
  }
  if (zone() === 'under' && s.scorpion && p.y >= UG_FLOOR - 2 && !p.climbing) {
    if (Math.abs(scorpionX(s, game.time) - p.x) < 9) return die('scorpion');
  }

  // treasure
  const tr = s.treasure;
  if (tr && !game.collected.has(s.i) && zone() === 'surface' && Math.abs(p.x - tr.x) < 10 && p.y >= GROUND_Y - 4) {
    game.collected.add(s.i);
    game.score += tr.val;
    audio.treasure();
    msg(`${tr.type.toUpperCase()}  +${tr.val}`);
    if (game.collected.size === totalTreasures) {
      const bonus = Math.floor(game.timeLeft) * 5;
      game.score += bonus;
      game.bonus = bonus;
      game.state = 'victory';
      audio.win();
    }
  }
}

function update(dt) {
  game.time += dt;
  input.pollGamepad();
  if (game.msgT > 0) game.msgT -= dt;

  if (game.state === 'play' || game.state === 'dying') {
    game.timeLeft -= dt;
    if (game.timeLeft <= 30 && game.timeLeft > 0 && Math.floor(game.timeLeft) !== game.lastTick) {
      game.lastTick = Math.floor(game.timeLeft);
      audio.tick();
    }
    if (game.timeLeft <= 0) {
      game.timeLeft = 0;
      game.state = 'gameover';
      game.overReason = 'TIME RAN OUT';
      audio.gameOver();
      return;
    }
  }

  switch (game.state) {
    case 'play': updatePlay(dt); break;
    case 'dying':
      game.dieT -= dt;
      if (game.dieT <= 0) {
        game.lives--;
        if (game.lives <= 0) {
          game.state = 'gameover';
          game.overReason = 'OUT OF LIVES';
          audio.gameOver();
        } else {
          respawn();
          game.state = 'play';
        }
      }
      break;
  }
}

// ---------- render ----------
function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderHUD() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD_H);
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8e4c8';
  ctx.fillText(`SCORE ${String(game.score).padStart(6, '0')}`, 6, 11);
  const low = game.timeLeft < 60;
  ctx.fillStyle = low && Math.floor(game.time * 2) % 2 ? '#f06050' : '#c8e8c0';
  ctx.fillText(`TIME ${fmtTime(game.timeLeft)}`, 6, 23);
  // lives as hats
  for (let i = 0; i < game.lives; i++) {
    const lx = 128 + i * 14;
    ctx.fillStyle = '#c87828'; ctx.fillRect(lx, 16, 10, 3); ctx.fillRect(lx + 2, 13, 6, 3);
  }
  // treasure count
  ctx.fillStyle = '#e8b820'; ctx.fillRect(W - 78, 14, 10, 6);
  ctx.fillStyle = '#f8d858'; ctx.fillRect(W - 78, 14, 10, 2);
  ctx.fillStyle = '#e8e4c8';
  ctx.fillText(`${game.collected.size}/${totalTreasures}`, W - 62, 21);
  ctx.fillStyle = '#7a9a70';
  ctx.fillText(`#${game.screen + 1}`, W - 26, 11);
}

function renderPlayfield() {
  const s = scr();
  drawScreen(ctx, s, game.time);
  if (s.treasure && !game.collected.has(s.i)) drawTreasure(ctx, s.treasure.x, GROUND_Y, s.treasure.type, game.time);

  const p = game.p;
  if (game.state === 'dying') {
    const sinkY = game.deathCause === 'sink' || game.deathCause === 'croc'
      ? Math.min(14, (1.4 - game.dieT) * 18) : 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, HUD_H, W, GROUND_Y + 6 - HUD_H + (zone() === 'under' ? 80 : 0)); ctx.clip();
    drawHarry(ctx, p.x, p.y + sinkY, { mode: 'sink', facing: p.facing });
    ctx.restore();
  } else {
    const mode = p.onVine ? 'swing' : p.climbing ? 'climb'
      : !p.onGround ? 'jump' : Math.abs(p.vx) > 1 ? 'run' : 'stand';
    drawHarry(ctx, p.x, p.y, { mode, frame: p.frame, facing: p.facing, flash: p.iframe > 0 });
  }

  if (game.msgT > 0) {
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const tw = ctx.measureText(game.msg).width;
    ctx.fillRect(W / 2 - tw / 2 - 6, H - 22, tw + 12, 14);
    ctx.fillStyle = '#f8e8b0';
    ctx.fillText(game.msg, W / 2, H - 12);
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
  drawScreen(ctx, game.world.screens[3], game.time);
  ctx.fillStyle = 'rgba(0,10,0,0.62)'; ctx.fillRect(0, 0, W, H);
  centerText([
    ['PITFALL', '#f8d858', 30],
    ['MOORE', '#e8b820', 22],
  ], 58, 26);
  centerText([
    ['swing the vines - mind the crocs', '#c8e8c0'],
    ['raid the tunnels - beat the clock', '#c8e8c0'],
    [`${totalTreasures} treasures - 12 minutes - 3 lives`, '#7a9a70', 9],
  ], 116, 13);
  if (Math.floor(game.time * 2) % 2 === 0) centerText([['PRESS ENTER / START', '#f8d858', 12]], 178);
  drawHarry(ctx, 36 + Math.sin(game.time * 1.2) * 6, 210, { mode: 'run', frame: game.time * 10, facing: 1 });
}

function renderEnd(title, color) {
  renderPlayfield();
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
  centerText([
    [title, color, 18],
    [`SCORE ${String(game.score).padStart(6, '0')}`, '#e8e4c8', 12],
  ], 74, 22);
  if (game.state === 'victory') centerText([[`TIME BONUS +${game.bonus}`, '#8ae88a', 10]], 122);
  else centerText([[game.overReason || '', '#c8a8a0', 10]], 122);
  centerText([[`TREASURES ${game.collected.size}/${totalTreasures}`, '#c8e8c0', 10]], 138);
  if (Math.floor(game.time * 2) % 2 === 0) centerText([['PRESS ENTER / START', '#f8d858', 11]], 172);
}

function render() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  switch (game.state) {
    case 'title': renderTitle(); break;
    case 'gameover': renderEnd('GAME OVER', '#f06050'); break;
    case 'victory': renderEnd('JUNGLE CLEARED!', '#f8d858'); break;
    default: renderPlayfield(); break;
  }
  if (game.state === 'play' || game.state === 'dying') renderHUD();
  else { renderHUD(); }
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
window.__pf = {
  game,
  start: () => { if (game.state !== 'play') newGame(); },
  state: () => game.state,
  pos: () => ({ screen: game.screen, x: game.p.x, y: game.p.y, zone: zone(), onGround: game.p.onGround, onVine: game.p.onVine, climbing: game.p.climbing }),
  jump: () => doJump(),
  hold: (dir, v = true) => { input.held[dir] = v; },
  warp: (screen, x, under = false) => {
    game.screen = ((screen % N_SCREENS) + N_SCREENS) % N_SCREENS;
    game.p.x = x; game.p.y = under ? UG_FLOOR : GROUND_Y;
    game.p.vx = 0; game.p.vy = 0; game.p.onGround = true;
    game.p.climbing = false; game.p.onVine = false;
    game.fellFrom = null;
  },
  screens: () => game.world.screens,
  setTime: (t) => { game.timeLeft = t; },
  setLives: (n) => { game.lives = n; },
  collectAllBut: (n) => {
    const withT = game.world.screens.filter(s => s.treasure);
    game.collected = new Set(withT.slice(0, withT.length - n).map(s => s.i));
  },
};
