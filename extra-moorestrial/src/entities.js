// entities.js — procedural sprite drawing + wandering humans. No image assets.
import { TILE, T } from './world.js';

// ---------- tiles ----------
export function drawTile(ctx, t, px, py, time) {
  switch (t) {
    case T.GRASS:
      ctx.fillStyle = '#1d4a25'; ctx.fillRect(px, py, TILE, TILE); break;
    case T.GRASS2:
      ctx.fillStyle = '#1d4a25'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#175220';
      ctx.fillRect(px + 6, py + 8, 4, 4); ctx.fillRect(px + 20, py + 18, 4, 4);
      ctx.fillRect(px + 12, py + 24, 4, 4); break;
    case T.PATH:
      ctx.fillStyle = '#6b5637'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#5d4a2e'; ctx.fillRect(px + 4, py + 10, 6, 4); ctx.fillRect(px + 20, py + 22, 6, 4);
      break;
    case T.TREE: {
      ctx.fillStyle = '#1d4a25'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#4a2f14'; ctx.fillRect(px + 13, py + 20, 6, 10);
      ctx.fillStyle = '#0e3316';
      ctx.fillRect(px + 4, py + 10, 24, 12);
      ctx.fillRect(px + 8, py + 4, 16, 10);
      ctx.fillStyle = '#155c24';
      ctx.fillRect(px + 8, py + 8, 10, 6); ctx.fillRect(px + 12, py + 4, 8, 4);
      break;
    }
    case T.ROCK:
      ctx.fillStyle = '#1d4a25'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#4e5560'; ctx.fillRect(px + 4, py + 12, 24, 16);
      ctx.fillStyle = '#6a7280'; ctx.fillRect(px + 8, py + 8, 16, 10);
      ctx.fillStyle = '#3a404a'; ctx.fillRect(px + 8, py + 22, 16, 6);
      break;
    case T.PIT: // drawn per-block by drawPitBlock; base here for safety
      ctx.fillStyle = '#0a0a12'; ctx.fillRect(px, py, TILE, TILE); break;
    case T.PAD: {
      ctx.fillStyle = '#2c2c38'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#3a3a4a'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      const on = Math.floor(time * 2) % 2 === 0;
      ctx.fillStyle = on ? '#f8d848' : '#7a6a20';
      ctx.fillRect(px + 13, py + 13, 6, 6);
      break;
    }
    case T.CALL: {
      ctx.fillStyle = '#243b52'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#2e4a66'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      const gl = 0.5 + 0.5 * Math.sin(time * 3);
      ctx.fillStyle = `rgba(120,220,255,${0.25 + gl * 0.35})`;
      ctx.fillRect(px + 10, py + 10, 12, 12);
      break;
    }
    case T.WALL:
      ctx.fillStyle = '#565066'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#464056'; ctx.fillRect(px, py + 14, TILE, 2); ctx.fillRect(px, py + 30, TILE, 2);
      ctx.fillRect(px + 15, py, 2, 14); ctx.fillRect(px + 7, py + 16, 2, 14); ctx.fillRect(px + 23, py + 16, 2, 14);
      break;
    case T.DOOR_FBI:
      ctx.fillStyle = '#565066'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#1a2a52'; ctx.fillRect(px + 4, py + 4, 24, 28);
      ctx.fillStyle = '#f8d848'; ctx.fillRect(px + 12, py + 10, 8, 8);
      ctx.fillStyle = '#1a2a52'; ctx.fillRect(px + 14, py + 12, 4, 4);
      break;
    case T.DOOR_SCI:
      ctx.fillStyle = '#565066'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#d8dce6'; ctx.fillRect(px + 4, py + 4, 24, 28);
      ctx.fillStyle = '#c83a3a'; ctx.fillRect(px + 13, py + 8, 6, 16); ctx.fillRect(px + 8, py + 13, 16, 6);
      break;
  }
}

// a whole 2x2 pit crater, drawn once per pit so the rim reads clearly
export function drawPitBlock(ctx, px, py, hasPieceHint) {
  const w = TILE * 2, h = TILE * 2;
  ctx.fillStyle = '#1d4a25'; ctx.fillRect(px, py, w, h);
  ctx.fillStyle = '#2e2438'; ctx.fillRect(px + 2, py + 2, w - 4, h - 4);
  ctx.fillStyle = '#171022'; ctx.fillRect(px + 7, py + 7, w - 14, h - 14);
  ctx.fillStyle = '#05030a'; ctx.fillRect(px + 13, py + 13, w - 26, h - 26);
  ctx.fillStyle = '#463a58';
  ctx.fillRect(px + 4, py, w - 8, 3); ctx.fillRect(px + 4, py + h - 3, w - 8, 3);
  ctx.fillRect(px, py + 4, 3, h - 8); ctx.fillRect(px + w - 3, py + 4, 3, h - 8);
}

// ---------- pickups ----------
export function drawCandy(ctx, x, y) {
  ctx.fillStyle = '#e8862c'; ctx.fillRect(x - 7, y - 3, 5, 5);
  ctx.fillStyle = '#d8b02c'; ctx.fillRect(x - 2, y - 5, 5, 5);
  ctx.fillStyle = '#b8542c'; ctx.fillRect(x + 3, y - 2, 5, 5);
}

export function drawFlower(ctx, x, y, bloom, time) {
  ctx.fillStyle = bloom ? '#2c7a34' : '#5a5a4a';
  ctx.fillRect(x - 1, y - 4, 3, 10);
  if (bloom) {
    const c = ['#f06292', '#ffd54f', '#7ec8f8'][Math.floor(x + y) % 3];
    ctx.fillStyle = c;
    ctx.fillRect(x - 5, y - 9, 4, 4); ctx.fillRect(x + 2, y - 9, 4, 4);
    ctx.fillRect(x - 5, y - 3, 4, 4); ctx.fillRect(x + 2, y - 3, 4, 4);
    ctx.fillStyle = '#fff8d0'; ctx.fillRect(x - 1, y - 7, 3, 4);
  } else {
    ctx.fillStyle = '#6a6a58';
    ctx.fillRect(x - 4, y - 6, 3, 3); ctx.fillRect(x + 2, y - 5, 3, 3);
  }
}

// the three phone pieces: speaker, dial, antenna
export function drawPiece(ctx, x, y, which, scale = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = '#c8ccd8';
  if (which === 0) { // speaker cone
    ctx.fillRect(-7, -4, 14, 8);
    ctx.fillStyle = '#8a90a2';
    ctx.fillRect(-5, -2, 3, 4); ctx.fillRect(0, -2, 3, 4); ctx.fillRect(4, -2, 2, 4);
  } else if (which === 1) { // dial wheel
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#8a90a2';
    ctx.fillRect(-4, -4, 3, 3); ctx.fillRect(2, -4, 3, 3); ctx.fillRect(-4, 2, 3, 3); ctx.fillRect(2, 2, 3, 3);
  } else { // antenna coil
    ctx.fillRect(-2, -8, 4, 16);
    ctx.fillRect(-6, -8, 12, 3);
    ctx.fillStyle = '#f06060'; ctx.fillRect(-2, -8, 4, 3);
  }
  ctx.restore();
}

export function drawCrystal(ctx, x, y, time) {
  const g = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.fillStyle = `rgba(110,240,230,${g})`;
  ctx.fillRect(x - 3, y - 7, 6, 5); ctx.fillRect(x - 5, y - 3, 10, 5); ctx.fillRect(x - 3, y + 2, 6, 4);
}

// ---------- E.T. himself ----------
// neck: 0..1 extension; step: walk phase; wilt: 0..1 sag; glow: heart/finger light
export function drawET(ctx, x, y, opts = {}) {
  const { neck = 0, step = 0, wilt = 0, glow = false, facing = 1 } = opts;
  const sag = wilt * 8;
  const nk = Math.round(neck * 14);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + sag));

  const skin = '#a8783c', skinD = '#7c5628', belly = '#c8a058';
  // legs
  const legShift = Math.round(Math.sin(step) * 3);
  ctx.fillStyle = skinD;
  ctx.fillRect(-9, 8, 6, 8 + legShift); ctx.fillRect(3, 8, 6, 8 - legShift);
  ctx.fillStyle = skin;
  ctx.fillRect(-11, 14 + legShift, 8, 3); ctx.fillRect(3, 14 - legShift, 8, 3);
  // squat body
  ctx.fillStyle = skin; ctx.fillRect(-11, -6, 22, 16);
  ctx.fillStyle = belly; ctx.fillRect(-6, -3, 12, 11);
  if (glow) {
    const g = 0.6 + 0.4 * Math.sin(performance.now() / 120);
    ctx.fillStyle = `rgba(255,80,70,${g})`; ctx.fillRect(-3, -1, 6, 6);
  }
  // arms
  ctx.fillStyle = skinD;
  ctx.fillRect(-15, -4, 5, 10); ctx.fillRect(10, -4, 5, 10);
  if (glow) { ctx.fillStyle = '#ffd8a0'; ctx.fillRect(facing > 0 ? 13 : -16, -8, 3, 5); }
  // neck
  ctx.fillStyle = skin; ctx.fillRect(-4, -10 - nk, 8, 6 + nk);
  // wide flat head
  ctx.fillStyle = skin; ctx.fillRect(-10, -20 - nk, 20, 12);
  ctx.fillStyle = skinD; ctx.fillRect(-10, -21 - nk, 20, 3);
  // huge eyes
  const blink = (Math.floor(performance.now() / 2600) % 4 === 0) && (performance.now() % 2600 < 140);
  if (blink || wilt > 0.5) {
    ctx.fillStyle = skinD; ctx.fillRect(-8, -15 - nk, 7, 2); ctx.fillRect(1, -15 - nk, 7, 2);
  } else {
    ctx.fillStyle = '#f0f4ff';
    ctx.fillRect(-8, -17 - nk, 7, 6); ctx.fillRect(1, -17 - nk, 7, 6);
    ctx.fillStyle = '#203050';
    const px = facing > 0 ? 1 : -1;
    ctx.fillRect(-5 + px, -16 - nk, 3, 4); ctx.fillRect(4 + px, -16 - nk, 3, 4);
  }
  ctx.restore();
}

// ---------- ship ----------
export function drawShip(ctx, x, y, time, beam = false, beamBottom = 0) {
  if (beam) {
    const flick = 0.35 + 0.2 * Math.sin(time * 18);
    ctx.fillStyle = `rgba(160,240,255,${flick})`;
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 12); ctx.lineTo(x + 14, y + 12);
    ctx.lineTo(x + 30, beamBottom); ctx.lineTo(x - 30, beamBottom);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#8a94aa';
  ctx.fillRect(x - 44, y, 88, 12);
  ctx.fillRect(x - 30, y - 8, 60, 8);
  ctx.fillStyle = '#b8c2d8'; ctx.fillRect(x - 30, y - 2, 60, 4);
  ctx.fillStyle = '#5ad8e8'; ctx.fillRect(x - 14, y - 16, 28, 9);
  ctx.fillStyle = '#3a4258'; ctx.fillRect(x - 44, y + 10, 88, 3);
  for (let i = 0; i < 5; i++) {
    const on = (Math.floor(time * 6) + i) % 5 === 0;
    ctx.fillStyle = on ? '#ffe860' : '#805020';
    ctx.fillRect(x - 36 + i * 18, y + 4, 6, 5);
  }
}

// ---------- humans ----------
export function drawHuman(ctx, x, y, type, step, carrying = false) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const legShift = Math.round(Math.sin(step) * 3);
  if (type === 'agent') {
    ctx.fillStyle = '#14161e';
    ctx.fillRect(-7, 10, 5, 8 + legShift); ctx.fillRect(2, 10, 5, 8 - legShift);
    ctx.fillRect(-8, -6, 16, 17);
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-2, -5, 4, 8);
    ctx.fillStyle = '#8a1c1c'; ctx.fillRect(-1, -5, 2, 8);
    ctx.fillStyle = '#d8a878'; ctx.fillRect(-5, -16, 10, 10);
    ctx.fillStyle = '#14161e'; ctx.fillRect(-6, -14, 12, 3); // sunglasses
    ctx.fillRect(-7, -20, 14, 5); ctx.fillRect(-9, -16, 18, 2); // fedora
    if (carrying) { ctx.fillStyle = '#c8ccd8'; ctx.fillRect(8, -4, 7, 7); }
  } else if (type === 'scientist') {
    ctx.fillStyle = '#c8ccd4';
    ctx.fillRect(-7, 10, 5, 8 + legShift); ctx.fillRect(2, 10, 5, 8 - legShift);
    ctx.fillStyle = '#e8ecf4'; ctx.fillRect(-8, -6, 16, 17);
    ctx.fillStyle = '#8898b0'; ctx.fillRect(-2, -4, 4, 10);
    ctx.fillStyle = '#d8a878'; ctx.fillRect(-5, -16, 10, 10);
    ctx.fillStyle = '#f0f0f8'; ctx.fillRect(-6, -13, 5, 3); ctx.fillRect(1, -13, 5, 3); // glasses
    ctx.fillStyle = '#b8bcc8'; ctx.fillRect(-6, -19, 12, 4);
    ctx.fillStyle = '#3a4a68'; ctx.fillRect(6, -2, 6, 8); // clipboard
  } else { // elliott
    ctx.fillStyle = '#3a4a90';
    ctx.fillRect(-6, 8, 5, 7 + legShift); ctx.fillRect(1, 8, 5, 7 - legShift);
    ctx.fillStyle = '#c83a3a'; ctx.fillRect(-7, -4, 14, 13); // red hoodie
    ctx.fillStyle = '#a82a2a'; ctx.fillRect(-7, -4, 14, 3);
    ctx.fillStyle = '#e8b888'; ctx.fillRect(-5, -13, 10, 9);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-5, -15, 10, 4);
    ctx.fillStyle = '#203050'; ctx.fillRect(-3, -11, 2, 3); ctx.fillRect(2, -11, 2, 3);
  }
  ctx.restore();
}

// Human actor: chases (agent/scientist) or approaches to help (elliott).
export class Human {
  constructor(type, x, y, round) {
    this.type = type;
    this.x = x; this.y = y;
    this.step = 0;
    this.state = 'roam';       // roam | chase | flee | leave
    this.stateT = 0;
    this.wanderDir = { x: 0, y: 0 };
    this.carrying = false;      // agent holding a stolen phone piece
    const spd = { agent: 78, scientist: 62, elliott: 70 };
    this.speed = spd[type] + (type === 'agent' ? round * 6 : round * 3);
    this.touchCd = 0;
    this.avoidT = 0;
    this.avoidDir = { x: 0, y: 0 };
  }
  update(game, dt) {
    this.stateT += dt;
    this.touchCd = Math.max(0, this.touchCd - dt);
    const et = game.et;
    const dx = et.x - this.x, dy = et.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    let vx = 0, vy = 0;
    if (this.state === 'flee' || this.state === 'leave') {
      vx = -dx / dist; vy = -dy / dist;
    } else if (this.type === 'elliott') {
      if (dist > 8) { vx = dx / dist; vy = dy / dist; }
    } else if (dist < 480) {
      vx = dx / dist; vy = dy / dist; // chase
    } else {
      if (this.stateT > 1.2) { this.stateT = 0; const a = Math.random() * Math.PI * 2; this.wanderDir = { x: Math.cos(a), y: Math.sin(a) }; }
      vx = this.wanderDir.x; vy = this.wanderDir.y;
    }
    if (this.avoidT > 0) { this.avoidT -= dt; vx = this.avoidDir.x; vy = this.avoidDir.y; }
    const moved = game.tryMove(this, vx * this.speed * dt, vy * this.speed * dt, true);
    if (!moved && (vx || vy)) {
      // cornered on an obstacle: dodge perpendicular for a moment, no pathfinding needed
      const sign = Math.random() < 0.5 ? 1 : -1;
      this.avoidDir = { x: -vy * sign, y: vx * sign };
      this.avoidT = 0.4 + Math.random() * 0.4;
      if (this.state === 'roam') { const a = Math.random() * Math.PI * 2; this.wanderDir = { x: Math.cos(a), y: Math.sin(a) }; }
    }
    if (vx || vy) this.step += dt * 10;
  }
}
