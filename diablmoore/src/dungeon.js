// dungeon.js — procedural generation, fog/light, A* pathfinding. DOM-free.
import { makeRng } from './items.js';

export const T = { WALL: 0, FLOOR: 1, DOOR: 2, STAIRS_DOWN: 3, STAIRS_UP: 4 };
export const WALKABLE = new Set([T.FLOOR, T.DOOR, T.STAIRS_DOWN, T.STAIRS_UP]);

// Level themes as you descend
export const THEMES = [
  { key: 'crypt',      floor: '#3a3630', wall: '#5a5148', wallTop: '#6d6355', accent: '#7a6f5f', name: 'Crypt' },
  { key: 'catacombs',  floor: '#332f36', wall: '#4c4550', wallTop: '#5f5666', accent: '#6b5f78', name: 'Catacombs' },
  { key: 'caves',      floor: '#2e2a26', wall: '#463b31', wallTop: '#57493a', accent: '#6a5138', name: 'Caves' },
  { key: 'hell',       floor: '#3a2420', wall: '#5a2620', wallTop: '#732b23', accent: '#a33', name: 'Hell' },
];
export function themeFor(depth, isBoss) {
  if (isBoss) return THEMES[3];
  return THEMES[Math.min(THEMES.length - 1, Math.floor((depth - 1) / 1.5))];
}

function makeGrid(w, h, v) {
  const g = new Uint8Array(w * h);
  if (v) g.fill(v);
  return g;
}

// Rooms + corridors generator. Returns a Level.
export function genDungeon(depth, seed, opts = {}) {
  const rng = makeRng((seed ^ (depth * 2654435761)) >>> 0);
  const boss = !!opts.boss;
  const W = opts.w || 44, H = opts.h || 44;
  const grid = makeGrid(W, H, T.WALL);
  const rooms = [];
  const targetRooms = boss ? 5 : 8 + Math.min(6, depth);
  let attempts = 0;
  while (rooms.length < targetRooms && attempts < 240) {
    attempts++;
    const rw = rng.int(5, boss ? 12 : 9);
    const rh = rng.int(5, boss ? 12 : 9);
    const rx = rng.int(1, W - rw - 2);
    const ry = rng.int(1, H - rh - 2);
    const nr = { x: rx, y: ry, w: rw, h: rh, cx: (rx + rw / 2) | 0, cy: (ry + rh / 2) | 0 };
    let overlap = false;
    for (const r of rooms) {
      if (nr.x - 1 < r.x + r.w + 1 && nr.x + nr.w + 1 > r.x - 1 &&
          nr.y - 1 < r.y + r.h + 1 && nr.y + nr.h + 1 > r.y - 1) { overlap = true; break; }
    }
    if (overlap) continue;
    rooms.push(nr);
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++) grid[y * W + x] = T.FLOOR;
  }
  // connect rooms in order via L corridors (guarantees connectivity)
  const carveH = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (grid[y * W + x] === T.WALL) grid[y * W + x] = T.FLOOR; };
  const carveV = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (grid[y * W + x] === T.WALL) grid[y * W + x] = T.FLOOR; };
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    if (rng.chance(0.5)) { carveH(a.cx, b.cx, a.cy); carveV(a.cy, b.cy, b.cx); }
    else { carveV(a.cy, b.cy, a.cx); carveH(a.cx, b.cx, b.cy); }
  }
  // extra loop connections for less mazey feel
  for (let k = 0; k < (boss ? 1 : 3); k++) {
    const a = rng.pick(rooms), b = rng.pick(rooms);
    if (a === b) continue;
    carveH(a.cx, b.cx, a.cy); carveV(a.cy, b.cy, b.cx);
  }
  // doors where corridors meet room edges (thin passages between walls)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (grid[y * W + x] !== T.FLOOR) continue;
    const l = grid[y * W + x - 1], r = grid[y * W + x + 1], u = grid[(y - 1) * W + x], d = grid[(y + 1) * W + x];
    const horiz = l === T.WALL && r === T.WALL && (u === T.FLOOR && d === T.FLOOR);
    const vert = u === T.WALL && d === T.WALL && (l === T.FLOOR && r === T.FLOOR);
    if ((horiz || vert) && rng.chance(0.35)) grid[y * W + x] = T.DOOR;
  }

  const spawnRoom = rooms[0];
  const spawn = { x: spawnRoom.cx, y: spawnRoom.cy };
  // stairs down in farthest room from spawn
  let far = rooms[rooms.length - 1], best = -1;
  for (const r of rooms) { const d = Math.abs(r.cx - spawn.x) + Math.abs(r.cy - spawn.y); if (d > best) { best = d; far = r; } }
  const stairsDown = { x: far.cx, y: far.cy };
  grid[stairsDown.y * W + stairsDown.x] = T.STAIRS_DOWN;
  const stairsUp = { x: spawn.x, y: spawn.y };
  grid[stairsUp.y * W + stairsUp.x] = T.STAIRS_UP;

  // decor: bones, barrels, sarcophagi, braziers on floor tiles away from stairs
  const decor = [];
  const decorTypes = ['bones', 'barrel', 'sarcophagus', 'brazier'];
  const nDecor = boss ? 6 : 10 + depth * 2;
  for (let i = 0; i < nDecor; i++) {
    const r = rng.pick(rooms);
    const dx = rng.int(r.x + 1, r.x + r.w - 2), dy = rng.int(r.y + 1, r.y + r.h - 2);
    if (grid[dy * W + dx] !== T.FLOOR) continue;
    if (dx === spawn.x && dy === spawn.y) continue;
    const type = rng.pick(decorTypes);
    // barrels/sarcophagi are destructible loot containers
    decor.push({ x: dx, y: dy, type, breakable: type === 'barrel' || type === 'sarcophagus', hp: 1, opened: false });
  }

  return { depth, boss, W, H, grid, rooms, spawn, stairsDown, stairsUp, decor, theme: themeFor(depth, boss), seed };
}

export function tileAt(level, x, y) {
  if (x < 0 || y < 0 || x >= level.W || y >= level.H) return T.WALL;
  return level.grid[y * level.W + x];
}
export function isWalkable(level, x, y) {
  const decorBlock = level.decor && level.decor.some((d) => d.x === x && d.y === y && !d.opened && (d.type === 'sarcophagus' || d.type === 'barrel'));
  if (decorBlock) return false;
  return WALKABLE.has(tileAt(level, x, y));
}
// pathing ignores decor (used by A* target reasoning); walls only
export function isOpen(level, x, y) { return WALKABLE.has(tileAt(level, x, y)); }

// ---- A* pathfinding (8-dir, no corner cutting) -----------------------------
export function findPath(level, start, goal, opts = {}) {
  const W = level.W, H = level.H;
  const passable = opts.passable || ((x, y) => isOpen(level, x, y));
  const si = start.y * W + start.x, gi = goal.y * W + goal.x;
  if (si === gi) return [start];
  if (!passable(goal.x, goal.y) && !opts.adjacentOk) return null;
  const open = new MinHeap();
  const came = new Map();
  const gScore = new Map();
  const h = (x, y) => { const dx = Math.abs(x - goal.x), dy = Math.abs(y - goal.y); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  gScore.set(si, 0);
  open.push(si, h(start.x, start.y));
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  let iter = 0;
  while (open.size && iter++ < 20000) {
    const cur = open.pop();
    if (cur === gi) return reconstruct(came, cur, W);
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy, cost] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!passable(nx, ny)) continue;
      if (dx !== 0 && dy !== 0) { if (!passable(cx + dx, cy) || !passable(cx, cy + dy)) continue; } // no corner cut
      const ni = ny * W + nx;
      const tentative = gScore.get(cur) + cost;
      if (tentative < (gScore.has(ni) ? gScore.get(ni) : Infinity)) {
        came.set(ni, cur); gScore.set(ni, tentative);
        open.push(ni, tentative + h(nx, ny));
      }
    }
  }
  // no path: if adjacentOk, return path to nearest reachable neighbour of goal
  if (opts.adjacentOk) {
    let best = null, bestG = Infinity;
    for (const [dx, dy] of dirs) {
      const nx = goal.x + dx, ny = goal.y + dy, ni = ny * W + nx;
      if (gScore.has(ni) && gScore.get(ni) < bestG) { bestG = gScore.get(ni); best = ni; }
    }
    if (best != null) return reconstruct(came, best, W);
  }
  return null;
}
function reconstruct(came, cur, W) {
  const path = [];
  while (cur != null) { path.push({ x: cur % W, y: (cur / W) | 0 }); cur = came.has(cur) ? came.get(cur) : null; }
  return path.reverse();
}

// minimal binary heap keyed by priority
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v, p) { const a = this.a; a.push({ v, p }); let i = a.length - 1; while (i > 0) { const par = (i - 1) >> 1; if (a[par].p <= a[i].p) break; [a[par], a[i]] = [a[i], a[par]]; i = par; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < a.length && a[l].p < a[s].p) s = l; if (r < a.length && a[r].p < a[s].p) s = r; if (s === i) break; [a[s], a[i]] = [a[i], a[s]]; i = s; } } return top.v; }
}

// connectivity: every floor tile reachable from spawn
export function connectivity(level) {
  const W = level.W, H = level.H;
  const seen = new Uint8Array(W * H);
  const stack = [level.spawn.y * W + level.spawn.x];
  seen[stack[0]] = 1;
  let count = 1;
  const dirs = [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1];
  while (stack.length) {
    const c = stack.pop();
    const cx = c % W, cy = (c / W) | 0;
    for (const d of dirs) {
      const n = c + d;
      const nx = n % W, ny = (n / W) | 0;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (Math.abs(nx - cx) > 1 || Math.abs(ny - cy) > 1) continue;
      if (seen[n]) continue;
      if (!WALKABLE.has(level.grid[n])) continue;
      seen[n] = 1; count++; stack.push(n);
    }
  }
  let total = 0, reached = 0;
  for (let i = 0; i < level.grid.length; i++) if (WALKABLE.has(level.grid[i])) { total++; if (seen[i]) reached++; }
  return { total, reached, fullyConnected: total === reached };
}

// ---- fog / light -----------------------------------------------------------
// vis: 0 unexplored, 1 explored (dim), 2 currently lit. Stored per-level.
export function makeVis(level) { level.vis = new Uint8Array(level.W * level.H); return level.vis; }
export function updateLight(level, px, py, radius) {
  const W = level.W, H = level.H, vis = level.vis;
  // downgrade lit->explored
  for (let i = 0; i < vis.length; i++) if (vis[i] === 2) vis[i] = 1;
  const r2 = radius * radius;
  const x0 = Math.max(0, px - radius), x1 = Math.min(W - 1, px + radius);
  const y0 = Math.max(0, py - radius), y1 = Math.min(H - 1, py + radius);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - px, dy = y - py;
    if (dx * dx + dy * dy > r2) continue;
    if (losClear(level, px, py, x, y)) vis[y * W + x] = 2;
  }
  vis[py * W + px] = 2;
}
// Bresenham LOS stopping at walls (walls themselves are visible)
function losClear(level, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (let i = 0; i < 64; i++) {
    if (x === x1 && y === y1) return true;
    if (!(x === x0 && y === y0)) {
      if (level.grid[y * level.W + x] === T.WALL) return false;
    }
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return true;
}
