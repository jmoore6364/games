// entities.js — Moore-Man and the four ghosts: grid movement with cornering,
// classic scatter/chase/frightened AI, and procedural drawing.

import { TILE, COLS, ROWS, HOUSE, PAC_START, isBlocked } from './maze.js';

export const DV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
export const OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
const TURN_ORDER = ['up', 'left', 'down', 'right']; // tie-break priority (classic)
const CORNER = 3; // px tolerance for turning at a junction

const tc = (x) => Math.floor(x / TILE);
const tr = (y) => Math.floor(y / TILE);
const cx = (x) => Math.floor(x / TILE) * TILE + TILE / 2;
const cy = (y) => Math.floor(y / TILE) * TILE + TILE / 2;

// ---- Moore-Man ------------------------------------------------------------

export class Pac {
  constructor() { this.reset(); }
  reset() {
    this.x = PAC_START.c * TILE;
    this.y = PAC_START.r * TILE + TILE / 2;
    this.dir = 'left';
    this.next = 'left';
    this.speed = 1.15;
    this.mouth = 0;      // 0..1 chomp phase
    this.moved = false;  // did we advance this frame (drives waka + mouth)
  }

  get tile() { return { c: tc(this.x), r: tr(this.y) }; }

  update(level) {
    this.moved = step(this, level, false, this.speed);
    if (this.moved) this.mouth = (this.mouth + 0.12) % 1;
  }

  draw(ctx) {
    const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.dir];
    // Mouth opens and closes; 0 at closed, ~0.33*PI at widest.
    const open = (Math.sin(this.mouth * Math.PI * 2) * 0.5 + 0.5) * 0.33 * Math.PI + 0.02;
    const r = TILE * 0.72;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffe93b';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, open, Math.PI * 2 - open);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Death animation frame: sweep the wedge closed into nothing. t in 0..1.
  drawDeath(ctx, t) {
    const r = TILE * 0.72;
    const a = t * Math.PI; // opening grows to full circle
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#ffe93b';
    if (t < 1) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, -Math.PI / 2 + a, Math.PI * 2.5 - a - Math.PI / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---- Ghosts ---------------------------------------------------------------

export const GHOST_DEFS = [
  { name: 'Blinkmoore', color: '#ff2f2f', scatter: { c: COLS - 3, r: -1 }, homeCol: 13.5, startOut: true, release: 0 },
  { name: 'Pinkmoore', color: '#ff9ff2', scatter: { c: 2, r: -1 }, homeCol: 13.5, startOut: false, release: 0.3 },
  { name: 'Inkmoore', color: '#33e6ff', scatter: { c: COLS - 1, r: ROWS }, homeCol: 11.5, startOut: false, release: 4 },
  { name: 'Clydemoore', color: '#ffb852', scatter: { c: 0, r: ROWS }, homeCol: 15.5, startOut: false, release: 8 },
];

export class Ghost {
  constructor(def, index) {
    this.def = def;
    this.index = index;
    this.color = def.color;
    this.name = def.name;
    this.reset();
  }

  reset() {
    const d = this.def;
    if (d.startOut) {
      this.x = HOUSE.exit.c * TILE;
      this.y = HOUSE.exit.r * TILE + TILE / 2;
      this.state = 'out';
      this.dir = 'left';
    } else {
      this.x = d.homeCol * TILE;
      this.y = HOUSE.centerY * TILE + TILE / 2;
      this.state = 'house';
      this.dir = 'up';
    }
    this.next = this.dir;
    this.mode = 'scatter';
    this.frightened = false;
    this.frightTimer = 0;
    this.releaseTimer = d.release;
    this._dtC = -1; this._dtR = -1;
    this.bounceDir = 1;
  }

  get tile() { return { c: tc(this.x), r: tr(this.y) }; }

  speedFor() {
    const boost = Math.min(0.35, (this.levelNum - 1) * 0.05);
    if (this.state === 'eyes') return 2.1;
    if (this.frightened) return 0.62 + boost * 0.4;
    // Slow in the tunnel row.
    if (tr(this.y) === 14 && (tc(this.x) < 6 || tc(this.x) > 21)) return 0.55;
    return 0.95 + boost;
  }

  // Called each frame with game context.
  update(level, pac, blink, dt, levelNum) {
    this.levelNum = levelNum || 1;
    switch (this.state) {
      case 'house': this._house(dt); break;
      case 'leaving': this._leaving(); break;
      case 'entering': this._entering(); break;
      case 'eyes': this._eyes(level); break;
      default: this._out(level, pac, blink); break;
    }
  }

  _house(dt) {
    // Bounce vertically until the release timer expires.
    const topY = (HOUSE.insideRowTop) * TILE + TILE / 2 + 1;
    const botY = (HOUSE.insideRowBot) * TILE + TILE / 2 - 1;
    this.y += this.bounceDir * 0.5;
    if (this.y < topY) { this.y = topY; this.bounceDir = 1; }
    if (this.y > botY) { this.y = botY; this.bounceDir = -1; }
    this.releaseTimer -= dt;
    if (this.releaseTimer <= 0) { this.state = 'leaving'; }
  }

  _leaving() {
    // Align to center column, then rise out through the door to the exit tile.
    const targetX = HOUSE.exit.c * TILE;
    const exitY = HOUSE.exit.r * TILE + TILE / 2;
    if (Math.abs(this.x - targetX) > 0.6) {
      this.x += Math.sign(targetX - this.x) * 0.5;
    } else {
      this.x = targetX;
      this.y -= 0.7;
      if (this.y <= exitY) {
        this.y = exitY;
        this.state = 'out';
        this.dir = 'left'; this.next = 'left';
        this._dtC = -1; this._dtR = -1;
      }
    }
  }

  _entering() {
    // Descend from the exit into the house center, then re-arm.
    const targetX = HOUSE.exit.c * TILE;
    const homeY = HOUSE.centerY * TILE + TILE / 2;
    if (Math.abs(this.x - targetX) > 0.6) {
      this.x += Math.sign(targetX - this.x) * 1.5;
    } else {
      this.x = targetX;
      this.y += 1.5;
      if (this.y >= homeY) {
        this.y = homeY;
        this.frightened = false;
        this.state = 'house';
        this.releaseTimer = 0.5;
        this.bounceDir = 1;
        this.dir = 'up';
      }
    }
  }

  _eyes(level) {
    // Navigate corridors back toward the house exit, then dive in.
    const exitX = HOUSE.exit.c * TILE;
    const exitY = HOUSE.exit.r * TILE + TILE / 2;
    if (Math.abs(this.x - exitX) < 3 && Math.abs(this.y - exitY) < 3) {
      this.x = exitX; this.y = exitY;
      this.state = 'entering';
      return;
    }
    this.target = { c: HOUSE.exit.c, r: HOUSE.exit.r };
    this._aiChoose(level, true);
    step(this, level, true, this.speedFor());
  }

  _out(level, pac, blink) {
    // Compute this ghost's target tile, then steer toward it.
    if (this.frightened) {
      this._aiRandom(level);
    } else {
      this.target = this._targetTile(pac, blink);
      this._aiChoose(level, false);
    }
    step(this, level, false, this.speedFor());
  }

  _targetTile(pac, blink) {
    if (this.mode === 'scatter') return this.def.scatter;
    const p = pac.tile;
    const [pdx, pdy] = DV[pac.dir];
    switch (this.index) {
      case 0: // Blinkmoore — chase Moore-Man directly.
        return { c: p.c, r: p.r };
      case 1: // Pinkmoore — 4 tiles ahead (ambush).
        return { c: p.c + pdx * 4, r: p.r + pdy * 4 };
      case 2: { // Inkmoore — vector doubled off Blinkmoore.
        const ax = p.c + pdx * 2, ay = p.r + pdy * 2;
        const b = blink.tile;
        return { c: ax + (ax - b.c), r: ay + (ay - b.r) };
      }
      default: { // Clydemoore — chase when far, flee to corner when near.
        const b = this.tile;
        const dist = Math.hypot(b.c - p.c, b.r - p.r);
        return dist > 8 ? { c: p.c, r: p.r } : this.def.scatter;
      }
    }
  }

  _aiChoose(level, useDoor) {
    // Only decide once per tile, at (or just after) entering it.
    const c = tc(this.x), r = tr(this.y);
    if (c === this._dtC && r === this._dtR) return;
    this._dtC = c; this._dtR = r;
    let best = null, bestD = Infinity;
    for (const d of TURN_ORDER) {
      if (d === OPP[this.dir]) continue;
      const [dc, dr] = DV[d];
      let nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= COLS) { if (r === 14) nc = (nc + COLS) % COLS; else continue; }
      if (isBlocked(level, nc, nr, useDoor)) continue;
      const tx = this.target.c, ty = this.target.r;
      const dist = (nc - tx) * (nc - tx) + (nr - ty) * (nr - ty);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    if (best) this.next = best;
  }

  _aiRandom(level) {
    const c = tc(this.x), r = tr(this.y);
    if (c === this._dtC && r === this._dtR) return;
    this._dtC = c; this._dtR = r;
    const opts = [];
    for (const d of TURN_ORDER) {
      if (d === OPP[this.dir]) continue;
      const [dc, dr] = DV[d];
      let nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= COLS) { if (r === 14) nc = (nc + COLS) % COLS; else continue; }
      if (isBlocked(level, nc, nr, false)) continue;
      opts.push(d);
    }
    if (opts.length) this.next = opts[(Math.random() * opts.length) | 0];
  }

  // Force a direction reversal on scatter<->chase transitions (classic tell).
  reverse() {
    if (this.state !== 'out') return;
    this.dir = OPP[this.dir] || this.dir;
    this.next = this.dir;
    this._dtC = -1; this._dtR = -1;
  }

  setFrightened(on) {
    if (this.state !== 'out') return;
    if (on) {
      this.frightened = true;
      this.dir = OPP[this.dir] || this.dir;
      this.next = this.dir;
      this._dtC = -1; this._dtR = -1;
    }
  }

  getEaten() {
    this.frightened = false;
    this.state = 'eyes';
    this._dtC = -1; this._dtR = -1;
  }

  draw(ctx, flashWhite) {
    const r = TILE * 0.78;
    const x = this.x, y = this.y;
    if (this.state === 'eyes') { this._drawEyes(ctx, x, y); return; }
    // Body color.
    let body = this.color;
    if (this.frightened) body = flashWhite ? '#ffffff' : '#2436ff';
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y - 1, r, Math.PI, 0);
    // Wavy skirt.
    const feet = 3, baseY = y - 1 + r;
    ctx.lineTo(x + r, baseY);
    const w = (r * 2) / feet;
    for (let i = 0; i < feet; i++) {
      const fx = x + r - i * w;
      const mid = fx - w / 2;
      ctx.quadraticCurveTo(mid, baseY - 3, fx - w, baseY);
    }
    ctx.closePath();
    ctx.fill();
    if (this.frightened) {
      // Scared face: white eyes + zigzag mouth.
      ctx.fillStyle = flashWhite ? '#ff2f2f' : '#ffffff';
      ctx.fillRect(x - 3, y - 2, 2, 2);
      ctx.fillRect(x + 1, y - 2, 2, 2);
      ctx.strokeStyle = flashWhite ? '#ff2f2f' : '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 3);
      for (let i = 0; i <= 4; i++) ctx.lineTo(x - 4 + i * 2, y + (i % 2 ? 1 : 3));
      ctx.stroke();
    } else {
      this._drawEyes(ctx, x, y);
    }
  }

  _drawEyes(ctx, x, y) {
    const [dx, dy] = DV[this.dir] || [0, 0];
    for (const ex of [-3, 3]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(x + ex * 0.9, y - 1, 2.3, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1aff';
      ctx.beginPath();
      ctx.arc(x + ex * 0.9 + dx * 1.4, y - 1 + dy * 1.6, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---- Shared grid movement with cornering ----------------------------------
// Returns true if the entity advanced this frame.
export function step(ent, level, forGhost, speed) {
  const ccx = cx(ent.x), ccy = cy(ent.y);

  // Try to adopt the queued direction.
  if (ent.next && ent.next !== ent.dir) {
    if (OPP[ent.next] === ent.dir) {
      ent.dir = ent.next;
    } else if (Math.abs(ent.x - ccx) <= CORNER && Math.abs(ent.y - ccy) <= CORNER) {
      if (canGo(level, ccx, ccy, ent.next, forGhost)) {
        ent.x = ccx; ent.y = ccy;
        ent.dir = ent.next;
      }
    }
  }

  if (!ent.dir) return false;
  const [dc, dr] = DV[ent.dir];
  let nx = ent.x + dc * speed;
  let ny = ent.y + dr * speed;
  let moved = true;

  // Blocked ahead? clamp to current tile center.
  if (!canGo(level, ent.x, ent.y, ent.dir, forGhost)) {
    if (ent.dir === 'left' && nx < ccx) { nx = ccx; moved = false; }
    if (ent.dir === 'right' && nx > ccx) { nx = ccx; moved = false; }
    if (ent.dir === 'up' && ny < ccy) { ny = ccy; moved = false; }
    if (ent.dir === 'down' && ny > ccy) { ny = ccy; moved = false; }
  }

  ent.x = nx; ent.y = ny;
  // Keep the cross axis pinned to the corridor center.
  if (ent.dir === 'left' || ent.dir === 'right') ent.y = ccy;
  else ent.x = ccx;

  // Tunnel wrap on the middle row.
  const halfW = COLS * TILE;
  if (ent.x < -TILE / 2) ent.x += halfW;
  else if (ent.x > halfW + TILE / 2) ent.x -= halfW;

  return moved;
}

function canGo(level, x, y, dir, forGhost) {
  const [dc, dr] = DV[dir];
  let nc = tc(x) + dc, nr = tr(y) + dr;
  return !isBlocked(level, nc, nr, forGhost);
}
