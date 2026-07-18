// Arena grid + campaign stage configs.

export const TILE = 16;
export const GW = 15;   // grid width in cells
export const GH = 13;   // grid height in cells
export const OFF_X = 8; // canvas offset of the play area
export const OFF_Y = 16;

export const T = { FLOOR: 0, HARD: 1, SOFT: 2, BREAK: 3 };
export const idx = (x, y) => y * GW + x;

// Classic layout: solid border + pillar at every (even, even) cell.
export function baseGrid() {
  const g = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (x === 0 || y === 0 || x === GW - 1 || y === GH - 1 || (x % 2 === 0 && y % 2 === 0)) {
        g[idx(x, y)] = T.HARD;
      }
    }
  }
  return g;
}

export const CORNERS = [
  { x: 1, y: 1 }, { x: GW - 2, y: GH - 2 }, { x: GW - 2, y: 1 }, { x: 1, y: GH - 2 },
];

// Cells kept clear of soft blocks so spawns aren't walled in.
function clearZone(cells, x, y) {
  cells.add(idx(x, y));
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    cells.add(idx(x + dx, y + dy));
  }
}

// Build an arena: grid + hidden items map. opts:
//   soft: 0..1 density, spawns: [{x,y}] kept clear,
//   items: array of powerup type strings hidden under soft blocks,
//   exit: bool — hide an exit under a soft block far from spawns[0].
export function makeArena(opts) {
  const grid = baseGrid();
  const keep = new Set();
  for (const s of opts.spawns) clearZone(keep, s.x, s.y);
  const softCells = [];
  for (let y = 1; y < GH - 1; y++) {
    for (let x = 1; x < GW - 1; x++) {
      const i = idx(x, y);
      if (grid[i] !== T.FLOOR || keep.has(i)) continue;
      if (Math.random() < opts.soft) {
        grid[i] = T.SOFT;
        softCells.push({ x, y, i });
      }
    }
  }
  // hidden items
  const items = new Map();
  const pool = softCells.slice();
  const takeRandom = (filter) => {
    const cands = pool.filter((c) => !items.has(c.i) && (!filter || filter(c)));
    if (!cands.length) return null;
    return cands[(Math.random() * cands.length) | 0];
  };
  if (opts.exit) {
    const s0 = opts.spawns[0];
    let cell = takeRandom((c) => Math.abs(c.x - s0.x) + Math.abs(c.y - s0.y) >= 8);
    if (!cell) cell = takeRandom(null);
    if (cell) items.set(cell.i, 'exit');
  }
  for (const type of opts.items || []) {
    const cell = takeRandom(null);
    if (cell) items.set(cell.i, type);
  }
  return { grid, items };
}

// ---- campaign ----
// enemies: counts per type. items: guaranteed powerups under soft blocks.
export const STAGES = [
  { theme: 0, soft: 0.62, time: 180, enemies: { balloon: 3 }, items: ['fire', 'bombs'] },
  { theme: 0, soft: 0.66, time: 180, enemies: { balloon: 3, chaser: 1 }, items: ['fire', 'speed'] },
  { theme: 1, soft: 0.68, time: 180, enemies: { balloon: 2, chaser: 2, speedy: 1 }, items: ['bombs', 'fire'] },
  { theme: 1, soft: 0.70, time: 180, enemies: { balloon: 2, chaser: 2, ghost: 1 }, items: ['kick', 'fire'] },
  { theme: 2, soft: 0.70, time: 180, enemies: { chaser: 2, speedy: 2, ghost: 1 }, items: ['bombs', 'speed'] },
  { theme: 2, soft: 0.72, time: 180, enemies: { balloon: 2, speedy: 2, ghost: 2 }, items: ['remote', 'fire'] },
  { theme: 3, soft: 0.72, time: 180, enemies: { chaser: 3, speedy: 2, ghost: 1 }, items: ['pass', 'bombs'] },
  { theme: 3, soft: 0.74, time: 180, enemies: { chaser: 2, speedy: 3, ghost: 2 }, items: ['fire', 'speed'] },
  { theme: 1, soft: 0.74, time: 180, enemies: { chaser: 3, speedy: 3, ghost: 3 }, items: ['bombs', 'fire'] },
  { theme: 4, soft: 0.30, time: 180, enemies: { boss: 1, balloon: 2 }, items: ['fire', 'bombs'], boss: true },
];

// Pick spawn cells for enemies: on floor, far from the hero.
export function enemySpawnCells(grid, hero, count) {
  const cands = [];
  for (let y = 1; y < GH - 1; y++) {
    for (let x = 1; x < GW - 1; x++) {
      if (grid[idx(x, y)] !== T.FLOOR) continue;
      if (Math.abs(x - hero.x) + Math.abs(y - hero.y) < 6) continue;
      cands.push({ x, y });
    }
  }
  // shuffle
  for (let i = cands.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  return cands.slice(0, count);
}

// Sudden-death shrink order for battle mode: clockwise inward spiral
// over the inner cells.
export function spiralCells() {
  const out = [];
  let x0 = 1, y0 = 1, x1 = GW - 2, y1 = GH - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) out.push({ x, y: y0 });
    for (let y = y0 + 1; y <= y1; y++) out.push({ x: x1, y });
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) out.push({ x, y: y1 });
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) out.push({ x: x0, y });
    x0++; y0++; x1--; y1--;
  }
  return out;
}
