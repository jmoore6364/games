// main.js — The Extra-Moorestrial: bootstrap, state machine, HUD, render loop.
// The Atari 2600 E.T., but fair: pits you can see, levitation that works,
// a sense power that points at the goal, and humans you can outrun.
import {
  TILE, COLS, ROWS, SW, SH, HUD_H, T, isSolid,
  PAD_SCREEN, PAD_RECT, CALL_SCREEN, CALL_RECT, TOWN_SCREEN,
  buildWorld, tileAt, pitAt, safeExitSpot,
} from './world.js';
import {
  drawTile, drawPitBlock, drawCandy, drawFlower, drawPiece, drawCrystal,
  drawET, drawShip, drawHuman, Human,
} from './entities.js';
import { Audio } from './audio.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const PLAY = COLS * TILE; // 480x480 play area under the HUD

const audio = new Audio();
const input = new Input();

const START_ENERGY = 9999;
const ET_SPEED = 132;

const game = {
  state: 'title',
  time: 0,
  round: 1, score: 0, lives: 3,
  energy: START_ENERGY,
  world: null,
  cur: { sx: 1, sy: 0 },
  et: { x: PLAY / 2, y: 320, facing: 1, step: 0, moving: false },
  pieces: [],            // per piece: 'pit' | 'held' | 'fbi'
  humans: [],
  humanTimer: 4,
  elliottTimer: 30,
  revealed: new Set(),   // minimap screens marked by SENSE
  called: false,
  shipTimer: 0, shipState: 'none', shipY: -80, shipWait: 0,
  senseT: 0, senseCd: 0, senseAngle: 0,
  pit: null, pitItems: [],
  fallT: 0, riseT: 0, capT: 0, dieT: 0, boardT: 0, clearT: 0,
  msg: '', msgT: 0,
  bonus: 0,
};

const screen = () => game.world.S(game.cur.sx, game.cur.sy);
const piecesHeld = () => game.pieces.filter(p => p === 'held').length;
const confiscated = () => game.pieces.filter(p => p === 'fbi').length;

function msg(text, t = 2.6) { game.msg = text; game.msgT = t; }

function startRound(round) {
  game.round = round;
  game.world = buildWorld(round);
  game.pieces = ['pit', 'pit', 'pit'];
  game.cur = { sx: PAD_SCREEN.sx, sy: PAD_SCREEN.sy };
  game.et.x = (PAD_RECT.x + 1.5) * TILE;
  game.et.y = (PAD_RECT.y + PAD_RECT.h + 2) * TILE;
  game.energy = START_ENERGY;
  game.humans = [];
  game.humanTimer = 5;
  game.elliottTimer = 30 + Math.random() * 15;
  game.revealed = new Set();
  game.called = false;
  game.shipTimer = 0; game.shipState = 'none'; game.shipY = -80; game.shipWait = 0;
  game.senseT = 0; game.senseCd = 0;
  game.pit = null;
  game.state = 'play';
  msg(round === 1 ? 'FIND THE 3 PHONE PIECES IN THE PITS' : `ROUND ${round} — THE PITS RUN DEEPER`, 3.2);
}

function newGame() {
  game.score = 0; game.lives = 3;
  startRound(1);
}

// ---------- collision & movement ----------
function collides(x, y, asHuman) {
  const s = screen();
  const pts = [[-8, 2], [8, 2], [-8, 16], [8, 16]];
  for (const [ox, oy] of pts) {
    const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
    const t = tileAt(s, tx, ty);
    if (isSolid(t)) return true;
    if (asHuman && t === T.PIT) return true;
  }
  return false;
}

game.tryMove = function (ent, dx, dy, asHuman = false) {
  let moved = false;
  if (dx) {
    const nx = ent.x + dx;
    if (!collides(nx, ent.y, asHuman)) { ent.x = nx; moved = true; }
  }
  if (dy) {
    const ny = ent.y + dy;
    if (!collides(ent.x, ny, asHuman)) { ent.y = ny; moved = true; }
  }
  if (asHuman) {
    ent.x = Math.max(12, Math.min(PLAY - 12, ent.x));
    ent.y = Math.max(20, Math.min(PLAY - 6, ent.y));
  }
  return moved;
};

// ---------- world queries ----------
function worldPosOfPiece(i) {
  if (game.pieces[i] === 'fbi') {
    return { wx: (TOWN_SCREEN.sx * COLS + 4.5) * TILE, wy: (TOWN_SCREEN.sy * ROWS + 5.5) * TILE, sx: TOWN_SCREEN.sx, sy: TOWN_SCREEN.sy };
  }
  const p = game.world.pits.find(p => p.piece === i);
  if (!p) return null;
  return { wx: (p.sx * COLS + p.tx + 1) * TILE, wy: (p.sy * ROWS + p.ty + 1) * TILE, sx: p.sx, sy: p.sy };
}

function senseTargetPos() {
  const etw = { wx: game.cur.sx * PLAY + game.et.x, wy: game.cur.sy * PLAY + game.et.y };
  if (game.called) {
    return { ...etw, tx: (PAD_SCREEN.sx * COLS + PAD_RECT.x + 1.5) * TILE, ty: (PAD_SCREEN.sy * ROWS + PAD_RECT.y + 1.5) * TILE, label: 'THE LANDING PAD', sx: PAD_SCREEN.sx, sy: PAD_SCREEN.sy };
  }
  if (piecesHeld() === 3) {
    return { ...etw, tx: (CALL_SCREEN.sx * COLS + CALL_RECT.x + 1.5) * TILE, ty: (CALL_SCREEN.sy * ROWS + CALL_RECT.y + 1.5) * TILE, label: 'THE CALL RIDGE', sx: CALL_SCREEN.sx, sy: CALL_SCREEN.sy };
  }
  let best = null, bestD = Infinity;
  for (let i = 0; i < 3; i++) {
    if (game.pieces[i] === 'held') continue;
    const p = worldPosOfPiece(i);
    if (!p) continue;
    const d = Math.hypot(p.wx - etw.wx, p.wy - etw.wy);
    if (d < bestD) { bestD = d; best = { ...etw, tx: p.wx, ty: p.wy, label: game.pieces[i] === 'fbi' ? 'THE FBI OFFICE' : 'A PHONE PIECE', sx: p.sx, sy: p.sy }; }
  }
  return best;
}

function spendEnergy(n) {
  game.energy = Math.max(0, game.energy - n);
}
function gainEnergy(n) {
  game.energy = Math.min(START_ENERGY, game.energy + n);
}

// ---------- actions ----------
function doAction() {
  audio.resume();
  if (game.state === 'pit') {
    if (game.riseT <= 0) { game.riseT = 0.0001; audio.levitate(); }
    return;
  }
  if (game.state !== 'play') return;
  const s = screen();
  const tx = Math.floor(game.et.x / TILE), ty = Math.floor((game.et.y + 10) / TILE);
  const t = tileAt(s, tx, ty);

  // call home from the ridge with a full phone
  if (t === T.CALL && piecesHeld() === 3 && !game.called) {
    game.called = true;
    game.shipTimer = Math.max(45, 80 - (game.round - 1) * 8);
    game.shipState = 'coming';
    spendEnergy(120);
    game.score += 500;
    audio.call();
    setTimeout(() => audio.shipComing(), 1200);
    msg('PHONE HOME! THE SHIP IS COMING — GET TO THE PAD!', 3.5);
    return;
  }
  if (t === T.CALL && piecesHeld() < 3 && !game.called) {
    msg(`THE PHONE NEEDS ${3 - piecesHeld()} MORE PIECE${3 - piecesHeld() > 1 ? 'S' : ''}`);
    return;
  }

  // recover a confiscated piece from the FBI office door
  if (confiscated() > 0 && game.cur.sx === TOWN_SCREEN.sx && game.cur.sy === TOWN_SCREEN.sy) {
    const doorX = 4 * TILE + TILE / 2, doorY = 5 * TILE + TILE / 2;
    if (Math.hypot(game.et.x - doorX, game.et.y - doorY) < TILE * 1.6) {
      const i = game.pieces.indexOf('fbi');
      game.pieces[i] = 'held';
      game.score += 250;
      audio.piece(); audio.siren();
      msg('PIECE RECOVERED — NOW RUN!');
      const h = new Human('agent', doorX, doorY - 40, game.round);
      h.touchCd = 1.2;
      game.humans.push(h);
      return;
    }
  }

  // otherwise: SENSE — E.T.'s glowing finger points the way
  if (game.senseCd > 0) return;
  const target = senseTargetPos();
  if (!target) return;
  spendEnergy(60);
  game.senseCd = 0.8;
  game.senseT = 3.0;
  game.senseAngle = Math.atan2(target.ty - target.wy, target.tx - target.wx);
  game.revealed.add(`${target.sx},${target.sy}`);
  audio.sense();
  msg(`E.T. SENSES ${target.label}...`, 2.2);
}

input.on('action', doAction);
input.on('mute', () => audio.toggleMute());
input.on('start', () => {
  audio.resume();
  if (game.state === 'title' || game.state === 'gameover') newGame();
});

// ---------- pit interior ----------
function enterPit(pit) {
  game.pit = pit;
  game.state = 'fall';
  game.fallT = 0.7;
  spendEnergy(40);
  audio.fall();
}

function buildPitItems(pit) {
  const j = (n) => ((pit.id * 37 + n * 61) % 40) - 20; // deterministic jitter per pit
  const items = [];
  if (pit.piece >= 0 && game.pieces[pit.piece] === 'pit') {
    items.push({ type: 'piece', which: pit.piece, x: PLAY / 2 + j(1), y: 230 + j(2) / 2 });
  }
  for (let c = pit.candyTaken; c < pit.candy; c++) {
    items.push({ type: 'candy', x: 150 + c * 180 + j(3 + c), y: 330 + j(4 + c) / 2 });
  }
  if (pit.crystal && !pit.crystalTaken) {
    items.push({ type: 'crystal', x: PLAY / 2 + j(5), y: 400 });
  }
  return items;
}

// ---------- humans ----------
function openSpawnSpot() {
  const spots = [
    { x: 48, y: 7 * TILE + 16 }, { x: PLAY - 48, y: 7 * TILE + 16 },
    { x: 7 * TILE + 16, y: 64 }, { x: 7 * TILE + 16, y: PLAY - 64 },
  ];
  for (let i = spots.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [spots[i], spots[k]] = [spots[k], spots[i]];
  }
  for (const e of spots) if (!collides(e.x, e.y, true)) return e;
  return null;
}

function spawnHuman() {
  const e = openSpawnSpot();
  if (!e) return;
  const type = Math.random() < 0.55 ? 'agent' : 'scientist';
  game.humans.push(new Human(type, e.x, e.y, game.round));
}

function humanTouch(h) {
  if (h.touchCd > 0 || h.state === 'flee' || h.state === 'leave') return;
  if (h.type === 'elliott') {
    gainEnergy(1500);
    game.score += 200;
    audio.elliott();
    msg('ELLIOTT! ENERGY RESTORED — THE HUMANS SCATTER');
    for (const o of game.humans) if (o !== h) { o.state = 'flee'; o.stateT = 0; }
    h.state = 'leave'; h.stateT = 0; h.touchCd = 99;
    return;
  }
  if (h.type === 'agent') {
    h.touchCd = 1.6;
    audio.agent();
    if (!game.called && piecesHeld() > 0) {
      const i = game.pieces.indexOf('held');
      game.pieces[i] = 'fbi';
      h.carrying = true;
      h.state = 'leave'; h.stateT = 0;
      msg('THE AGENT CONFISCATED A PHONE PIECE! (FBI OFFICE, SE TOWN)', 3.2);
    } else {
      spendEnergy(200);
      h.state = 'leave'; h.stateT = 0;
      msg('THE AGENT ROUGHED YOU UP! -200 ENERGY');
    }
    return;
  }
  // scientist: hauled off for examination
  audio.siren();
  game.state = 'captured';
  game.capT = 1.4;
  spendEnergy(350);
}

// ---------- update ----------
function updatePlay(dt) {
  const d = input.dir();
  let vx = (d.right ? 1 : 0) - (d.left ? 1 : 0);
  let vy = (d.down ? 1 : 0) - (d.up ? 1 : 0);
  if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
  game.et.moving = !!(vx || vy);
  if (game.et.moving) {
    if (vx) game.et.facing = vx > 0 ? 1 : -1;
    game.tryMove(game.et, vx * ET_SPEED * dt, vy * ET_SPEED * dt);
    game.et.step += dt * 9;
    spendEnergy((22 + (game.round - 1) * 4) * dt);
  }

  // screen flips
  const et = game.et;
  if (et.x < 8 && game.cur.sx > 0) { game.cur.sx--; et.x = PLAY - 10; changeScreen(); }
  else if (et.x > PLAY - 8 && game.cur.sx < SW - 1) { game.cur.sx++; et.x = 10; changeScreen(); }
  else if (et.y < 8 && game.cur.sy > 0) { game.cur.sy--; et.y = PLAY - 10; changeScreen(); }
  else if (et.y > PLAY - 8 && game.cur.sy < SH - 1) { game.cur.sy++; et.y = 10; changeScreen(); }
  et.x = Math.max(6, Math.min(PLAY - 6, et.x));
  et.y = Math.max(14, Math.min(PLAY - 4, et.y));

  // fell (walked) into a pit?
  const ctx_ = Math.floor(et.x / TILE), cty = Math.floor((et.y + 10) / TILE);
  if (tileAt(screen(), ctx_, cty) === T.PIT) {
    const pit = pitAt(game.world, game.cur.sx, game.cur.sy, ctx_, cty);
    if (pit) { enterPit(pit); return; }
  }

  // items on this screen
  for (const it of screen().items) {
    if (it.type === 'candy' && !it.taken) {
      if (Math.hypot(it.tx * TILE + 16 - et.x, it.ty * TILE + 16 - et.y) < 17) {
        it.taken = true; gainEnergy(700); game.score += 100; audio.candy();
      }
    } else if (it.type === 'flower' && !it.bloom) {
      if (Math.hypot(it.tx * TILE + 16 - et.x, it.ty * TILE + 16 - et.y) < 15) {
        it.bloom = true; gainEnergy(200); game.score += 250; audio.flower();
        msg('E.T. HEALED A FLOWER  +250');
      }
    }
  }

  // humans
  game.humanTimer -= dt;
  const maxHumans = game.round >= 3 ? 2 : 1;
  const activeHostiles = game.humans.filter(h => h.type !== 'elliott' && h.state !== 'flee' && h.state !== 'leave').length;
  if (game.humanTimer <= 0) {
    game.humanTimer = Math.max(3.5, 9 - game.round) + Math.random() * 4;
    if (activeHostiles < maxHumans && Math.random() < 0.75) spawnHuman();
  }
  game.elliottTimer -= dt;
  if (game.elliottTimer <= 0) {
    game.elliottTimer = 40 + Math.random() * 20;
    const e = openSpawnSpot();
    if (e) game.humans.push(new Human('elliott', e.x, e.y, game.round));
  }
  for (const h of game.humans) {
    h.update(game, dt);
    if ((h.state === 'flee' || h.state === 'leave') && h.stateT > 2.2) h.dead = true;
    if (Math.hypot(h.x - et.x, h.y - et.y) < 18) humanTouch(h);
  }
  game.humans = game.humans.filter(h => !h.dead);

  updateShip(dt);
}

function changeScreen() {
  game.humans = [];
  game.humanTimer = Math.min(game.humanTimer, 2 + Math.random() * 3);
}

function updateShip(dt) {
  if (!game.called) return;
  if (game.shipState === 'coming') {
    game.shipTimer -= dt;
    if (game.shipTimer <= 0) {
      game.shipState = 'waiting';
      game.shipWait = 14;
      game.shipY = (PAD_RECT.y + 0.5) * TILE - 34;
      audio.shipLand();
      msg('THE SHIP HAS LANDED — STAND ON THE PAD!', 3);
    }
  } else if (game.shipState === 'waiting') {
    game.shipWait -= dt;
    const onPadScreen = game.cur.sx === PAD_SCREEN.sx && game.cur.sy === PAD_SCREEN.sy;
    if (onPadScreen) {
      const tx = Math.floor(game.et.x / TILE), ty = Math.floor((game.et.y + 10) / TILE);
      if (tileAt(screen(), tx, ty) === T.PAD) {
        game.state = 'boarding';
        game.boardT = 2.8;
        audio.beam();
        return;
      }
    }
    if (game.shipWait <= 0) {
      game.shipState = 'none';
      game.called = false;
      msg('THE SHIP LEFT WITHOUT YOU... CALL AGAIN FROM THE RIDGE', 3.5);
    }
  }
}

function updatePit(dt) {
  if (game.riseT > 0) {
    game.riseT += dt;
    spendEnergy(130 * dt);
    if (Math.floor(game.riseT * 6) !== Math.floor((game.riseT - dt) * 6)) audio.levitate();
    if (game.riseT >= 1.3) {
      const spot = safeExitSpot(screen(), game.pit);
      game.et.x = spot.x; game.et.y = spot.y;
      game.pit = null;
      game.riseT = 0;
      game.state = 'play';
      audio.riseDone();
    }
    return;
  }
  const d = input.dir();
  let vx = (d.right ? 1 : 0) - (d.left ? 1 : 0);
  let vy = (d.down ? 1 : 0) - (d.up ? 1 : 0);
  if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
  game.et.moving = !!(vx || vy);
  if (game.et.moving) {
    if (vx) game.et.facing = vx > 0 ? 1 : -1;
    game.pitPos.x = Math.max(90, Math.min(PLAY - 90, game.pitPos.x + vx * ET_SPEED * dt));
    game.pitPos.y = Math.max(180, Math.min(PLAY - 30, game.pitPos.y + vy * ET_SPEED * dt));
    game.et.step += dt * 9;
    spendEnergy(18 * dt);
  }
  for (const it of game.pitItems) {
    if (it.taken) continue;
    if (Math.hypot(it.x - game.pitPos.x, it.y - game.pitPos.y) < 18) {
      it.taken = true;
      if (it.type === 'piece') {
        game.pieces[it.which] = 'held';
        game.score += 1000;
        audio.piece();
        msg(piecesHeld() === 3 ? 'PHONE COMPLETE! CALL FROM THE SOUTH RIDGE!' : `PHONE PIECE ${piecesHeld()} OF 3!`, 3);
      } else if (it.type === 'candy') {
        game.pit.candyTaken++;
        gainEnergy(700); game.score += 100; audio.candy();
      } else if (it.type === 'crystal') {
        game.pit.crystalTaken = true;
        gainEnergy(300); game.score += 500; audio.crystal();
        msg('A ZENITE CRYSTAL!  +500');
      }
    }
  }
}

function update(dt) {
  game.time += dt;
  input.pollGamepad();
  if (game.msgT > 0) game.msgT -= dt;
  if (game.senseT > 0) game.senseT -= dt;
  if (game.senseCd > 0) game.senseCd -= dt;

  switch (game.state) {
    case 'play': updatePlay(dt); break;
    case 'pit': updatePit(dt); break;
    case 'fall':
      game.fallT -= dt;
      if (game.fallT <= 0) {
        game.state = 'pit';
        game.pitItems = buildPitItems(game.pit);
        game.pitPos = { x: PLAY / 2, y: PLAY - 60 };
      }
      break;
    case 'captured':
      game.capT -= dt;
      if (game.capT <= 0) {
        game.cur = { sx: TOWN_SCREEN.sx, sy: TOWN_SCREEN.sy };
        game.et.x = 10 * TILE + 16; game.et.y = 11 * TILE + 20;
        game.humans = [];
        game.state = 'play';
        msg('EXAMINED AND RELEASED AT THE LAB... -350 ENERGY', 3);
      }
      break;
    case 'boarding':
      game.boardT -= dt;
      if (game.boardT <= 0) {
        game.bonus = 5000 + Math.floor(game.energy / 10) * 10;
        game.score += game.bonus;
        game.state = 'roundclear';
        game.clearT = 4;
        audio.win();
      }
      break;
    case 'roundclear':
      game.clearT -= dt;
      if (game.clearT <= 0) startRound(game.round + 1);
      break;
    case 'dying':
      game.dieT -= dt;
      if (game.dieT <= 0) {
        game.lives--;
        if (game.lives > 0) {
          gainEnergy(5000);
          game.humans = [];
          game.state = 'play';
          audio.revive();
          msg('ELLIOTT FOUND YOU AND BROUGHT YOU BACK!', 3);
        } else {
          game.state = 'gameover';
          audio.gameOver();
        }
      }
      break;
  }

  // energy death (any active state)
  if ((game.state === 'play' || game.state === 'pit') && game.energy <= 0) {
    game.state = 'dying';
    game.dieT = 2;
    game.riseT = 0;
    // dying in a pit: Elliott pulls you out — respawn happens on the surface
    if (game.pit) {
      const spot = safeExitSpot(screen(), game.pit);
      game.et.x = spot.x; game.et.y = spot.y;
      game.pit = null;
    }
    audio.wilt();
  }
}

// ---------- render ----------
function renderHUD() {
  ctx.fillStyle = '#120c20';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#2a1f45';
  ctx.fillRect(0, HUD_H - 2, W, 2);

  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8e4f8';
  ctx.fillText(`SCORE ${String(game.score).padStart(6, '0')}`, 10, 18);
  ctx.fillStyle = '#b8a8e8';
  ctx.fillText(`ROUND ${game.round}`, 150, 18);

  // lives: little E.T. heads
  for (let i = 0; i < game.lives; i++) {
    const lx = 230 + i * 22;
    ctx.fillStyle = '#a8783c'; ctx.fillRect(lx, 8, 14, 8);
    ctx.fillStyle = '#f0f4ff'; ctx.fillRect(lx + 2, 10, 4, 4); ctx.fillRect(lx + 8, 10, 4, 4);
  }

  // energy: Atari-style counter + bar
  ctx.fillStyle = '#8878b8';
  ctx.fillText('ENERGY', 10, 42);
  ctx.fillStyle = game.energy < 1500 ? (Math.floor(game.time * 4) % 2 ? '#f06060' : '#e8e4f8') : '#e8e4f8';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(String(Math.ceil(game.energy)).padStart(4, '0'), 75, 45);
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#241c38'; ctx.fillRect(10, 52, 150, 10);
  const frac = game.energy / START_ENERGY;
  ctx.fillStyle = frac < 0.2 ? '#e05050' : frac < 0.5 ? '#e8b048' : '#58c878';
  ctx.fillRect(11, 53, 148 * frac, 8);

  // phone piece slots
  ctx.fillStyle = '#8878b8'; ctx.fillText('PHONE', 185, 42);
  for (let i = 0; i < 3; i++) {
    const sx = 185 + i * 26;
    ctx.strokeStyle = '#4a3a72'; ctx.lineWidth = 2;
    ctx.strokeRect(sx, 48, 22, 22);
    if (game.pieces[i] === 'held') drawPiece(ctx, sx + 11, 59, i, 1);
    else if (game.pieces[i] === 'fbi') {
      ctx.fillStyle = '#803040'; ctx.fillRect(sx + 4, 52, 14, 14);
      ctx.fillStyle = '#f8d848'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('FBI', sx + 11, 62); ctx.textAlign = 'left'; ctx.font = 'bold 13px monospace';
    }
  }

  // ship timer
  if (game.called && game.shipState === 'coming') {
    ctx.fillStyle = '#f8d848';
    ctx.fillText(`SHIP ${Math.ceil(game.shipTimer)}`, 285, 42);
  } else if (game.shipState === 'waiting') {
    ctx.fillStyle = Math.floor(game.time * 3) % 2 ? '#f8d848' : '#f06060';
    ctx.fillText(`BOARD! ${Math.ceil(game.shipWait)}`, 285, 42);
  }

  // minimap
  const mx = 424, my = 24, cell = 15;
  ctx.fillStyle = '#241c38'; ctx.fillRect(mx - 2, my - 2, cell * 3 + 4, cell * 3 + 4);
  for (let sy = 0; sy < SH; sy++) for (let sx = 0; sx < SW; sx++) {
    const cx = mx + sx * cell, cy = my + sy * cell;
    ctx.fillStyle = (sx === game.cur.sx && sy === game.cur.sy) ? '#4a3a72' : '#181228';
    ctx.fillRect(cx, cy, cell - 1, cell - 1);
    if (sx === PAD_SCREEN.sx && sy === PAD_SCREEN.sy) { ctx.fillStyle = '#f8d848'; ctx.fillRect(cx + 5, cy + 5, 4, 4); }
    if (sx === CALL_SCREEN.sx && sy === CALL_SCREEN.sy) { ctx.fillStyle = '#5ad8e8'; ctx.fillRect(cx + 5, cy + 5, 4, 4); }
    if (sx === TOWN_SCREEN.sx && sy === TOWN_SCREEN.sy) { ctx.fillStyle = '#8a8a9a'; ctx.fillRect(cx + 5, cy + 5, 4, 4); }
    if (game.revealed.has(`${sx},${sy}`)) {
      const pieceHere = game.world.pits.some(p => p.sx === sx && p.sy === sy && p.piece >= 0 && game.pieces[p.piece] === 'pit');
      if (pieceHere && Math.floor(game.time * 3) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(cx + 10, cy + 2, 3, 3); }
    }
  }
}

function renderSurface() {
  const s = screen();
  ctx.save();
  ctx.translate(0, HUD_H);

  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    drawTile(ctx, s.tiles[ty * COLS + tx], tx * TILE, ty * TILE, game.time);
  }
  for (const p of game.world.pits) {
    if (p.sx === game.cur.sx && p.sy === game.cur.sy) drawPitBlock(ctx, p.tx * TILE, p.ty * TILE);
  }
  for (const it of s.items) {
    if (it.type === 'candy' && !it.taken) drawCandy(ctx, it.tx * TILE + 16, it.ty * TILE + 16);
    else if (it.type === 'flower') drawFlower(ctx, it.tx * TILE + 16, it.ty * TILE + 16, it.bloom, game.time);
  }

  // ship on the pad screen
  if (game.cur.sx === PAD_SCREEN.sx && game.cur.sy === PAD_SCREEN.sy) {
    const padCX = (PAD_RECT.x + 1.5) * TILE;
    if (game.shipState === 'waiting') {
      drawShip(ctx, padCX, game.shipY, game.time, true, (PAD_RECT.y + PAD_RECT.h) * TILE);
    } else if (game.shipState === 'coming' && game.shipTimer < 6) {
      const t = 1 - game.shipTimer / 6;
      drawShip(ctx, padCX, -60 + t * ((PAD_RECT.y + 0.5) * TILE - 34 + 60), game.time);
    }
  }

  for (const h of game.humans) drawHuman(ctx, h.x, h.y, h.type, h.step, h.carrying);

  if (game.state === 'fall') {
    // E.T. tumbling into the crater
    const t = 1 - game.fallT / 0.7;
    ctx.save();
    ctx.translate(game.et.x, game.et.y);
    ctx.scale(1 - t * 0.7, 1 - t * 0.7);
    drawET(ctx, 0, 0, { step: t * 12 });
    ctx.restore();
  } else if (game.state === 'boarding') {
    // renderBoarding draws E.T. rising in the beam instead
  } else {
    drawET(ctx, game.et.x, game.et.y, {
      step: game.et.moving ? game.et.step : 0,
      facing: game.et.facing,
      glow: game.senseT > 0,
      wilt: game.state === 'dying' ? 1 - game.dieT / 2 : 0,
    });
  }

  // sense arrow
  if (game.senseT > 0 && game.state === 'play') {
    const a = game.senseAngle;
    const ax = game.et.x + Math.cos(a) * 34, ay = game.et.y - 10 + Math.sin(a) * 34;
    const pulse = 0.6 + 0.4 * Math.sin(game.time * 8);
    ctx.save();
    ctx.translate(ax, ay); ctx.rotate(a);
    ctx.fillStyle = `rgba(255,120,100,${pulse})`;
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-8, -8); ctx.lineTo(-4, 0); ctx.lineTo(-8, 8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function renderPit() {
  ctx.save();
  ctx.translate(0, HUD_H);
  ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, PLAY, PLAY);
  // cave mouth glow above
  ctx.fillStyle = '#181228';
  ctx.fillRect(70, 20, PLAY - 140, 60);
  ctx.fillStyle = '#241c38';
  ctx.fillRect(90, 30, PLAY - 180, 40);
  // rocky walls
  ctx.fillStyle = '#1a1226';
  ctx.fillRect(60, 80, PLAY - 120, PLAY - 110);
  ctx.fillStyle = '#241a34';
  for (let i = 0; i < 14; i++) {
    const rx = 60 + ((i * 97) % (PLAY - 140));
    const ry = 100 + ((i * 151) % (PLAY - 160));
    ctx.fillRect(rx, ry, 10, 6);
  }
  ctx.fillStyle = '#120c1c';
  ctx.fillRect(80, 170, PLAY - 160, PLAY - 210);

  for (const it of game.pitItems) {
    if (it.taken) continue;
    if (it.type === 'piece') {
      drawPiece(ctx, it.x, it.y, it.which, 1.6);
      const g = 0.3 + 0.25 * Math.sin(game.time * 4);
      ctx.fillStyle = `rgba(200,220,255,${g})`;
      ctx.fillRect(it.x - 14, it.y + 10, 28, 3);
    } else if (it.type === 'candy') drawCandy(ctx, it.x, it.y);
    else if (it.type === 'crystal') drawCrystal(ctx, it.x, it.y, game.time);
  }

  const rising = game.riseT > 0;
  const rf = rising ? Math.min(1, game.riseT / 1.3) : 0;
  const ey = game.pitPos.y - rf * (game.pitPos.y - 60);
  drawET(ctx, game.pitPos.x, ey, {
    step: game.et.moving && !rising ? game.et.step : 0,
    facing: game.et.facing,
    neck: rising ? 1 : 0,
    glow: rising,
  });
  if (rising) {
    for (let i = 0; i < 5; i++) {
      const sy = ey + 24 + i * 14 + (game.time * 60 % 14);
      if (sy < game.pitPos.y + 20) {
        ctx.fillStyle = `rgba(160,240,255,${0.5 - i * 0.09})`;
        ctx.fillRect(game.pitPos.x - 10 + (i % 2) * 16, sy, 5, 5);
      }
    }
  }

  ctx.fillStyle = '#8878b8';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(rising ? 'LEVITATING...' : 'GRAB THE LOOT — TAP POWER TO LEVITATE OUT', PLAY / 2, PLAY - 12);
  ctx.textAlign = 'left';
  ctx.restore();
}

function renderBoarding() {
  renderSurface();
  ctx.save();
  ctx.translate(0, HUD_H);
  const t = 1 - game.boardT / 2.8;
  const padCX = (PAD_RECT.x + 1.5) * TILE;
  drawShip(ctx, padCX, game.shipY - t * 30, game.time, true, (PAD_RECT.y + PAD_RECT.h) * TILE);
  const ey = game.et.y - t * (game.et.y - game.shipY - 10);
  drawET(ctx, padCX, ey, { neck: 1, glow: true });
  ctx.restore();
}

function centerText(lines, y0, dy = 26) {
  ctx.textAlign = 'center';
  lines.forEach(([text, color, size], i) => {
    ctx.font = `bold ${size || 14}px monospace`;
    ctx.fillStyle = color || '#e8e4f8';
    ctx.fillText(text, W / 2, y0 + i * dy);
  });
  ctx.textAlign = 'left';
}

function renderTitle() {
  ctx.fillStyle = '#0b0714'; ctx.fillRect(0, 0, W, H);
  // starfield
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137) % W, sy = (i * 211) % 260;
    const tw = (Math.sin(game.time * 2 + i) + 1) / 2;
    ctx.fillStyle = `rgba(220,220,255,${0.2 + tw * 0.5})`;
    ctx.fillRect(sx, sy, 2, 2);
  }
  // moon
  ctx.fillStyle = '#d8d8e8'; ctx.beginPath(); ctx.arc(390, 90, 38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b8b8cc';
  ctx.beginPath(); ctx.arc(380, 80, 8, 0, Math.PI * 2); ctx.arc(402, 100, 6, 0, Math.PI * 2); ctx.fill();
  drawShip(ctx, 120, 100 + Math.sin(game.time) * 6, game.time);
  drawET(ctx, W / 2, 300, { neck: 1, glow: true, step: 0 });

  centerText([
    ['THE', '#b8a8e8', 16],
    ['EXTRA-MOORESTRIAL', '#f8d848', 30],
    ['the Atari game, done right this time', '#8878b8', 13],
  ], 170, 30);
  centerText([
    ['FIND 3 PHONE PIECES HIDDEN IN THE PITS', '#cabfe0'],
    ['CALL HOME FROM THE SOUTH RIDGE', '#cabfe0'],
    ['REACH THE LANDING PAD BEFORE THE SHIP LEAVES', '#cabfe0'],
    ['', '#cabfe0'],
    ['CANDY = ENERGY   FLOWERS = POINTS', '#8878b8', 12],
    ['DODGE THE AGENT AND THE SCIENTIST', '#8878b8', 12],
    ['POWER: SENSE THE WAY / LEVITATE OUT OF PITS / CALL', '#8878b8', 12],
  ], 360, 22);
  const blink = Math.floor(game.time * 2) % 2 === 0;
  if (blink) centerText([['PRESS ENTER / START', '#f8d848', 18]], 530);
}

function renderGameOver() {
  ctx.fillStyle = '#0b0714'; ctx.fillRect(0, 0, W, H);
  drawET(ctx, W / 2, 260, { wilt: 1 });
  centerText([
    ['E.T. COULD NOT PHONE HOME', '#f06060', 22],
    [`FINAL SCORE  ${String(game.score).padStart(6, '0')}`, '#e8e4f8', 16],
    [`ROUNDS SURVIVED  ${game.round}`, '#8878b8', 13],
  ], 330, 34);
  if (Math.floor(game.time * 2) % 2 === 0) centerText([['PRESS ENTER / START', '#f8d848', 16]], 480);
}

function renderRoundClear() {
  ctx.fillStyle = '#0b0714'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137) % W, sy = (i * 211) % H;
    ctx.fillStyle = `rgba(220,220,255,${0.2 + ((Math.sin(game.time * 3 + i) + 1) / 2) * 0.5})`;
    ctx.fillRect(sx, sy, 2, 2);
  }
  const t = 1 - Math.max(0, game.clearT - 1) / 3;
  drawShip(ctx, W / 2, 420 - t * 380, game.time);
  centerText([
    ['E.T. WENT HOME!', '#f8d848', 26],
    [`ROUND ${game.round} CLEAR`, '#e8e4f8', 16],
    [`BONUS  +${game.bonus}`, '#58c878', 15],
    [`SCORE  ${String(game.score).padStart(6, '0')}`, '#e8e4f8', 15],
  ], 150, 34);
}

function render() {
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, 0, W, H);

  switch (game.state) {
    case 'title': renderTitle(); return;
    case 'gameover': renderGameOver(); return;
    case 'roundclear': renderRoundClear(); return;
    case 'pit': renderHUD(); renderPit(); break;
    case 'boarding': renderHUD(); renderBoarding(); break;
    case 'captured': {
      renderHUD(); renderSurface();
      const a = 1 - Math.max(0, game.capT) / 1.4;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, HUD_H, W, PLAY);
      ctx.fillStyle = '#e8e4f8'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText('THE SCIENTIST GRABBED E.T.!', W / 2, H / 2);
      ctx.textAlign = 'left';
      break;
    }
    default: renderHUD(); renderSurface(); break;
  }

  // floating message bar
  if (game.msgT > 0 && game.state !== 'title') {
    ctx.font = 'bold 13px monospace';
    const tw = ctx.measureText(game.msg).width;
    ctx.fillStyle = 'rgba(10,6,20,0.85)';
    ctx.fillRect(W / 2 - tw / 2 - 10, H - 42, tw + 20, 24);
    ctx.fillStyle = '#f8e8b0';
    ctx.textAlign = 'center';
    ctx.fillText(game.msg, W / 2, H - 26);
    ctx.textAlign = 'left';
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
window.__et = {
  game,
  start: () => { if (game.state === 'title' || game.state === 'gameover') newGame(); },
  state: () => game.state,
  pos: () => ({ sx: game.cur.sx, sy: game.cur.sy, x: game.et.x, y: game.et.y }),
  warp: (sx, sy, tx, ty) => { game.cur = { sx, sy }; game.et.x = tx * TILE + 16; game.et.y = ty * TILE + 16; game.humans = []; },
  hold: (dir, v = true) => { input.held[dir] = v; },
  action: () => doAction(),
  grantPieces: () => { game.pieces = ['held', 'held', 'held']; },
  setEnergy: (n) => { game.energy = n; },
  pits: () => game.world.pits,
};
