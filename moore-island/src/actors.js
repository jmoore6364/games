// Actors: walking, pathfinding over walk-boxes, depth scaling, talk animation.

import { ROOMS, isWalkable, scaleAt, VIEW_W, VIEW_H } from './rooms.js';
import { drawActorSprite, CHARS } from './sprites.js';

const CELL = 4;
const GW = Math.ceil(VIEW_W / CELL), GH = Math.ceil(VIEW_H / CELL);

const gridCache = new Map();
function grid(room) {
  if (gridCache.has(room)) return gridCache.get(room);
  const g = new Uint8Array(GW * GH);
  for (let cy = 0; cy < GH; cy++)
    for (let cx = 0; cx < GW; cx++)
      g[cy * GW + cx] = isWalkable(room, cx * CELL + CELL / 2, cy * CELL + CELL / 2) ? 1 : 0;
  gridCache.set(room, g);
  return g;
}

export function nearestWalkable(room, x, y) {
  if (isWalkable(room, x, y)) return { x, y };
  const g = grid(room);
  let best = null, bd = 1e9;
  for (let cy = 0; cy < GH; cy++)
    for (let cx = 0; cx < GW; cx++) {
      if (!g[cy * GW + cx]) continue;
      const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
      const d = (px - x) * (px - x) + (py - y) * (py - y) * 1.6;
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
  return best || { x, y };
}

function lineClear(room, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(2, Math.ceil(d / 2));
  for (let i = 0; i <= n; i++) {
    if (!isWalkable(room, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
  }
  return true;
}

// BFS over the cell grid, then smoothed with line-of-sight skips.
export function findPath(room, x0, y0, x1, y1) {
  const t = nearestWalkable(room, x1, y1);
  const s = nearestWalkable(room, x0, y0);
  if (lineClear(room, s.x, s.y, t.x, t.y)) return [t];
  const g = grid(room);
  const sc = { x: Math.min(GW - 1, s.x / CELL | 0), y: Math.min(GH - 1, s.y / CELL | 0) };
  const tc = { x: Math.min(GW - 1, t.x / CELL | 0), y: Math.min(GH - 1, t.y / CELL | 0) };
  const prev = new Int32Array(GW * GH).fill(-1);
  const q = [sc.y * GW + sc.x];
  prev[sc.y * GW + sc.x] = sc.y * GW + sc.x;
  let found = false;
  while (q.length) {
    const cur = q.shift();
    if (cur === tc.y * GW + tc.x) { found = true; break; }
    const cx = cur % GW, cy = (cur / GW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx;
      if (!g[ni] || prev[ni] !== -1) continue;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (!found) return [t];
  // reconstruct
  const cells = [];
  let cur = tc.y * GW + tc.x;
  while (cur !== sc.y * GW + sc.x) {
    cells.push({ x: (cur % GW) * CELL + CELL / 2, y: ((cur / GW) | 0) * CELL + CELL / 2 });
    cur = prev[cur];
  }
  cells.reverse();
  cells.push(t);
  // smooth
  const path = [];
  let ax = s.x, ay = s.y, i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    for (; j > i; j--) if (lineClear(room, ax, ay, cells[j].x, cells[j].y)) break;
    path.push(cells[j]);
    ax = cells[j].x; ay = cells[j].y;
    i = j + 1;
  }
  return path;
}

// ---------------------------------------------------------------- Actor ----

export class Actor {
  constructor(id, x, y, face = 'f') {
    this.id = id;
    this.x = x; this.y = y;
    this.face = face;
    this.path = [];
    this.walkPhase = 0;
    this.talking = false;
    this.onArrive = null;
    this.speed = 46;
  }

  walkTo(room, x, y, onArrive) {
    this.path = findPath(room, this.x, this.y, x, y);
    this.onArrive = onArrive || null;
  }

  stop() { this.path = []; this.onArrive = null; }

  get moving() { return this.path.length > 0; }

  update(dt, room) {
    if (!this.path.length) { this.walkPhase = null; return; }
    const t = this.path[0];
    const dx = t.x - this.x, dy = t.y - this.y;
    const d = Math.hypot(dx, dy);
    const sc = scaleAt(room, this.y);
    const step = this.speed * sc * dt;
    if (d <= step) {
      this.x = t.x; this.y = t.y;
      this.path.shift();
      if (!this.path.length) {
        this.walkPhase = null;
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
      }
      return;
    }
    this.x += dx / d * step;
    this.y += dy / d * step;
    if (Math.abs(dx) > Math.abs(dy) * 0.6) this.face = dx > 0 ? 'r' : 'l';
    else this.face = dy > 0 ? 'f' : 'b';
    this.walkPhase = ((this.walkPhase || 0) + dt * 2.2) % 1;
  }

  height(room) {
    const c = CHARS[this.id];
    const base = c ? c.h : 22;
    return base * scaleAt(room, this.y);
  }

  draw(g, room, t, opts = {}) {
    const sc = scaleAt(room, this.y);
    g.save();
    g.translate(Math.round(this.x), Math.round(this.y));
    const bob = CHARS[this.id] && CHARS[this.id].ghost ? Math.sin(t * 2 + this.x) * 2 : 0;
    g.translate(0, bob);
    g.scale(this.face === 'l' ? -sc : sc, sc);
    const face = this.face === 'l' ? 'r' : this.face;
    drawActorSprite(g, this.id, {
      face: face === 'u' ? 'b' : face,
      walkPhase: this.walkPhase,
      talk: this.talking,
      t,
      wave: opts.wave,
      hat: opts.hat,
    });
    g.restore();
  }

  // clickable bounds
  bounds(room) {
    const sc = scaleAt(room, this.y);
    const c = CHARS[this.id];
    const h = (c ? c.h : 20) * sc;
    const w = (c ? c.h * 0.42 : 18) * sc;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }
}
