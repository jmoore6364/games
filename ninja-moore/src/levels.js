// Act / scene layouts for Ninja Moore. Grids built with terrain helpers.
// Tiles: 0 empty, 1 solid, 2 jump-through platform, 5 spikes.

export const TILE = 16;
export const T = { EMPTY: 0, SOLID: 1, PLAT: 2, SPIKE: 5 };

function makeGrid(w, h) {
  return { w, h, d: new Uint8Array(w * h) };
}
function set(g, x, y, v) {
  if (x >= 0 && x < g.w && y >= 0 && y < g.h) g.d[y * g.w + x] = v;
}
export function tileAt(g, tx, ty) {
  if (tx < 0 || tx >= g.w) return T.SOLID; // side walls of the world
  if (ty < 0 || ty >= g.h) return 0;
  return g.d[ty * g.w + tx];
}

function helpers(g) {
  return {
    ground: (x0, x1, ty) => {
      for (let x = x0; x <= x1; x++) for (let y = ty; y < g.h; y++) set(g, x, y, T.SOLID);
    },
    block: (x0, x1, y0, y1) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(g, x, y, T.SOLID);
    },
    plat: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) set(g, x, ty, T.PLAT); },
    wall: (x0, x1) => {
      for (let x = x0; x <= x1; x++) for (let y = 0; y < g.h; y++) set(g, x, y, T.SOLID);
    },
    carve: (x0, x1, y0, y1) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(g, x, y, T.EMPTY);
    },
    fill: () => { g.d.fill(T.SOLID); },
  };
}

// Convenience for enemy spawn lists: { t, x, row } in tile coords.
// row = tile row the enemy's feet stand on (top of that tile).
const E = (t, x, row, o = {}) => ({ t, x, row, ...o });
const L = (x, row, drop) => ({ x, row, drop }); // lantern: hangs at head height

// ============================ ACT I — CITY ============================

function a1s1() {
  const g = makeGrid(110, 15);
  const { ground, block, plat } = helpers(g);
  ground(0, 29, 12);
  plat(8, 11, 9);
  ground(33, 52, 12); block(38, 39, 11, 11); plat(44, 47, 9);
  ground(53, 79, 12); block(60, 63, 10, 11); plat(68, 71, 8);
  ground(83, 109, 12); plat(88, 91, 9); plat(94, 97, 9);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 200,
    checkpointX: 55 * TILE,
    spawns: [
      E('knife', 14, 12), E('dog', 20, 12), E('knife', 26, 12),
      E('club', 36, 12), E('knife', 46, 12), E('dog', 50, 12),
      E('club', 62, 10), E('knife', 67, 12), E('dog', 74, 12),
      E('knife', 90, 12), E('club', 95, 12), E('dog', 102, 12), E('knife', 106, 12),
    ],
    lanterns: [L(9, 8, 'sp'), L(38, 10, 'star'), L(56, 11, 'sp'), L(70, 7, 'hp'), L(87, 11, 'sp'), L(99, 11, 'time')],
  };
}

function a1s2() {
  const g = makeGrid(100, 15);
  const { ground, block, plat, wall } = helpers(g);
  ground(0, 24, 12); plat(6, 9, 9);
  ground(28, 49, 12); block(34, 36, 10, 11); plat(42, 45, 8);
  ground(53, 70, 12); plat(58, 61, 9);
  ground(74, 99, 12);
  wall(98, 99);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 200,
    checkpointX: 55 * TILE,
    spawns: [
      E('knife', 10, 12), E('dog', 16, 12), E('club', 21, 12),
      E('knife', 31, 12), E('club', 35, 10), E('dog', 44, 12), E('knife', 47, 12),
      E('dog', 56, 12), E('club', 63, 12), E('knife', 67, 12),
    ],
    lanterns: [L(7, 8, 'sp'), L(43, 7, 'wind'), L(59, 8, 'hp'), L(77, 11, 'SP')],
    boss: { trigger: 86 * TILE, lockX: 84 * TILE, floor: 12 },
  };
}

// ========================== ACT II — MOUNTAIN ==========================

function a2s1() {
  const g = makeGrid(120, 15);
  const { ground, plat } = helpers(g);
  ground(0, 17, 12); ground(18, 29, 10);
  ground(33, 44, 11); plat(38, 41, 8); plat(45, 46, 10);
  ground(47, 59, 9); ground(60, 69, 11);
  ground(72, 86, 10); plat(78, 81, 7);
  ground(90, 101, 12); ground(102, 119, 10);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 220,
    checkpointX: 62 * TILE,
    hawk: { x0: 16, x1: 118, rate: 240 },
    spawns: [
      E('knife', 8, 12), E('dog', 14, 12),
      E('knife', 22, 10), E('club', 26, 10),
      E('knife', 36, 11), E('dog', 42, 11),
      E('club', 52, 9), E('knife', 57, 9), E('dog', 64, 11),
      E('knife', 76, 10), E('club', 80, 7), E('dog', 84, 10),
      E('knife', 95, 12), E('club', 98, 12), E('knife', 108, 10), E('dog', 114, 10),
    ],
    lanterns: [L(12, 11, 'sp'), L(39, 7, 'sp'), L(55, 8, 'hp'), L(79, 6, 'fire'), L(93, 11, 'sp'), L(110, 9, 'time')],
  };
}

function a2s2() {
  const g = makeGrid(110, 15);
  const { ground, block, plat, wall } = helpers(g);
  ground(0, 14, 12);
  ground(17, 31, 11); plat(24, 27, 8);
  ground(35, 48, 12); block(40, 42, 10, 11);
  plat(50, 51, 11); ground(52, 63, 10);
  ground(67, 79, 11); ground(80, 109, 10);
  wall(108, 109);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 200,
    checkpointX: 53 * TILE,
    hawk: { x0: 10, x1: 90, rate: 220 },
    spawns: [
      E('knife', 8, 12), E('dog', 12, 12),
      E('club', 22, 11), E('knife', 28, 11),
      E('knife', 38, 12), E('club', 41, 10), E('dog', 45, 12),
      E('knife', 55, 10), E('dog', 60, 10),
      E('club', 71, 11), E('knife', 75, 11),
    ],
    lanterns: [L(25, 7, 'sp'), L(43, 9, 'hp'), L(57, 9, 'SP'), L(73, 10, 'sp')],
    boss: { trigger: 96 * TILE, lockX: 94 * TILE, floor: 10 },
  };
}

// ========================= ACT III — WATERFALL =========================

function a3s1() {
  const g = makeGrid(100, 15);
  const { ground, plat } = helpers(g);
  ground(0, 14, 12);
  plat(17, 18, 11);
  ground(19, 28, 12);
  ground(31, 40, 11);
  plat(43, 44, 10);
  ground(47, 58, 11); plat(52, 55, 8);
  ground(61, 72, 12);
  plat(75, 76, 11);
  ground(79, 99, 11);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 220,
    checkpointX: 52 * TILE,
    spawns: [
      E('bat', 22, 6), E('knife', 25, 12), E('bat', 35, 5),
      E('bat', 50, 5), E('club', 54, 11), E('knife', 68, 12),
      E('bat', 65, 6), E('bat', 84, 5), E('dog', 88, 11), E('knife', 93, 11),
    ],
    lanterns: [L(10, 11, 'sp'), L(33, 10, 'sp'), L(49, 10, 'hp'), L(63, 11, 'wind'), L(81, 10, 'SP'), L(90, 10, 'time')],
  };
}

// The signature vertical wall-jump shaft. Climbable with wall jumps only:
// parallel solid walls at x=4-5 and x=10-11 (64px apart) the whole way up.
function a3s2() {
  const g = makeGrid(16, 52);
  const { fill, carve, plat } = helpers(g);
  fill();
  carve(6, 9, 3, 47);          // the shaft
  carve(2, 13, 44, 47);        // bottom chamber (floor = row 48)
  carve(2, 13, 1, 3);          // top chamber
  plat(6, 7, 38); plat(8, 9, 30); plat(6, 7, 22); plat(8, 9, 14);
  return {
    g, startX: 4 * TILE, startY: 47 * TILE + 16 - 20, exit: 'top', vertical: true, time: 250,
    exitY: 2 * TILE,
    checkpointY: 22 * TILE, checkpointPos: { x: 6 * TILE + 4, y: 22 * TILE - 20 },
    spawns: [
      E('bat', 7, 41, { hang: true }), E('bat', 8, 34, { hang: true }),
      E('bat', 7, 26, { hang: true }), E('bat', 8, 18, { hang: true }),
      E('bat', 7, 10, { hang: true }),
    ],
    lanterns: [L(6, 37, 'sp'), L(9, 29, 'hp'), L(6, 21, 'sp'), L(9, 13, 'SP')],
  };
}

function a3s3() {
  const g = makeGrid(80, 15);
  const { ground, plat, wall } = helpers(g);
  ground(0, 79, 12);
  plat(20, 23, 9); plat(36, 39, 9);
  wall(78, 79);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 180,
    checkpointX: 0,
    spawns: [
      E('bat', 18, 5), E('knife', 28, 12), E('bat', 34, 5), E('club', 48, 12),
    ],
    lanterns: [L(10, 11, 'hp'), L(40, 11, 'sp')],
    boss: { trigger: 66 * TILE, lockX: 64 * TILE, floor: 12 },
  };
}

// ========================== ACT IV — BASE ==========================

function a4s1() {
  const g = makeGrid(120, 15);
  const { ground, block, plat } = helpers(g);
  ground(0, 37, 12); block(14, 16, 10, 11); plat(22, 25, 9);
  ground(41, 69, 12); block(48, 50, 10, 11); plat(56, 59, 8);
  ground(73, 119, 12); block(80, 83, 10, 11); plat(90, 93, 9); block(100, 102, 10, 11); plat(108, 111, 8);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 220,
    checkpointX: 60 * TILE,
    spawns: [
      E('gunner', 20, 12), E('gunner', 34, 12),
      E('gren', 45, 12), E('gunner', 52, 12), E('dog', 62, 12),
      E('gunner', 78, 12), E('gren', 85, 12), E('gunner', 92, 9),
      E('dog', 98, 12), E('gren', 105, 12), E('gunner', 112, 12), E('eninja', 116, 12),
    ],
    lanterns: [L(12, 11, 'sp'), L(23, 8, 'sp'), L(57, 7, 'hp'), L(91, 8, 'jump'), L(103, 9, 'time')],
  };
}

function a4s2() {
  const g = makeGrid(110, 15);
  const { ground, block, plat, wall } = helpers(g);
  ground(0, 29, 12);
  ground(33, 59, 12); plat(40, 43, 9); block(48, 50, 10, 11);
  ground(63, 109, 12); plat(70, 73, 9);
  wall(108, 109);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 200,
    checkpointX: 64 * TILE,
    spawns: [
      E('gunner', 10, 12), E('gren', 16, 12), E('dog', 22, 12),
      E('gunner', 38, 12), E('gunner', 44, 12), E('gren', 52, 12), E('dog', 56, 12),
      E('gunner', 68, 12), E('gren', 76, 12), E('gunner', 82, 12), E('eninja', 87, 12),
    ],
    lanterns: [L(13, 11, 'sp'), L(41, 8, 'hp'), L(71, 8, 'SP'), L(90, 11, 'sp')],
    boss: { trigger: 96 * TILE, lockX: 94 * TILE, floor: 12 },
  };
}

// ======================== ACT V — CATACOMBS ========================

function a5s1() {
  const g = makeGrid(110, 15);
  const { ground, block, plat } = helpers(g);
  block(0, 109, 0, 1); // cave ceiling
  ground(0, 24, 12);
  ground(28, 54, 12); block(35, 37, 10, 11); plat(45, 48, 9);
  ground(58, 84, 12); block(66, 68, 10, 11); plat(75, 78, 9);
  ground(88, 109, 12);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 220,
    checkpointX: 58 * TILE,
    spawns: [
      E('jet', 15, 12), E('bat', 20, 5), E('club', 30, 12), E('bat', 32, 6),
      E('jet', 41, 12, { phase: 60 }), E('bat', 50, 5),
      E('club', 60, 12), E('jet', 62, 12, { phase: 120 }), E('bat', 72, 6), E('eninja', 80, 12),
      E('jet', 93, 12, { phase: 30 }), E('bat', 98, 5), E('jet', 103, 12, { phase: 90 }), E('bat', 106, 6),
    ],
    lanterns: [L(8, 11, 'sp'), L(46, 8, 'hp'), L(76, 8, 'fire'), L(100, 11, 'sp')],
  };
}

function a5s2() {
  const g = makeGrid(110, 15);
  const { ground, block, plat, wall } = helpers(g);
  block(0, 109, 0, 1);
  ground(0, 19, 12);
  ground(23, 49, 12); block(30, 32, 10, 11); plat(40, 43, 9);
  ground(53, 79, 12); block(60, 62, 10, 11); plat(70, 73, 9);
  ground(83, 109, 12);
  plat(96, 98, 8); plat(104, 106, 8); // Malek's perches
  wall(108, 109);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 200,
    checkpointX: 54 * TILE,
    spawns: [
      E('jet', 12, 12), E('bat', 16, 5),
      E('bat', 27, 6), E('club', 34, 12), E('jet', 36, 12, { phase: 80 }), E('bat', 45, 5), E('eninja', 47, 12),
      E('jet', 57, 12, { phase: 40 }), E('bat', 65, 6), E('club', 68, 12), E('jet', 76, 12, { phase: 100 }), E('bat', 78, 5),
    ],
    lanterns: [L(25, 11, 'sp'), L(41, 8, 'hp'), L(71, 8, 'SP'), L(86, 11, 'time')],
    boss: { trigger: 96 * TILE, lockX: 94 * TILE, floor: 12 },
  };
}

// ======================= ACT VI — DEMON FORTRESS =======================

function a6s1() {
  const g = makeGrid(130, 15);
  const { ground, block, plat } = helpers(g);
  ground(0, 17, 12);
  ground(20, 39, 11); block(28, 30, 9, 10);
  ground(43, 59, 12); plat(50, 53, 9); plat(60, 61, 11);
  ground(62, 79, 10);
  ground(83, 99, 12); block(90, 92, 10, 11);
  ground(102, 129, 11);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 240,
    checkpointX: 64 * TILE,
    spawns: [
      E('knife', 8, 12), E('dog', 12, 12),
      E('club', 24, 11), E('gunner', 33, 11), E('bat', 37, 5),
      E('gren', 46, 12), E('jet', 48, 12, { phase: 50 }), E('dog', 54, 12), E('knife', 57, 12),
      E('gunner', 66, 10), E('club', 72, 10), E('bat', 76, 4),
      E('gren', 87, 12), E('eninja', 94, 12),
      E('gunner', 108, 11), E('jet', 110, 11, { phase: 0 }), E('dog', 114, 11), E('club', 118, 11), E('knife', 124, 11),
    ],
    lanterns: [L(14, 11, 'sp'), L(35, 10, 'hp'), L(55, 11, 'SP'), L(74, 9, 'fire'), L(96, 11, 'sp'), L(120, 10, 'hp')],
  };
}

function a6s2() {
  const g = makeGrid(100, 15);
  const { ground, plat, wall } = helpers(g);
  ground(0, 15, 12);
  ground(19, 35, 12);
  ground(39, 55, 12); plat(44, 47, 9);
  ground(59, 99, 12);
  wall(98, 99);
  return {
    g, startX: 24, startY: 172, exit: 'right', time: 220,
    checkpointX: 60 * TILE,
    spawns: [
      E('eninja', 24, 12), E('gunner', 30, 12),
      E('club', 44, 12), E('jet', 42, 12, { phase: 70 }), E('gren', 50, 12),
      E('bat', 63, 5), E('bat', 66, 6), E('eninja', 70, 12),
    ],
    lanterns: [L(22, 11, 'hp'), L(48, 11, 'SP'), L(75, 11, 'hp'), L(79, 11, 'sp')],
    boss: { trigger: 86 * TILE, lockX: 84 * TILE, floor: 12 },
  };
}

export const ACTS = [
  { num: 'I', theme: 'city', boss: 'butch', bossName: 'BUTCH THE BLADE', scenes: [a1s1(), a1s2()] },
  { num: 'II', theme: 'mountain', boss: 'razorbeak', bossName: 'RAZORBEAK', scenes: [a2s1(), a2s2()] },
  { num: 'III', theme: 'falls', boss: 'kage', bossName: 'MASTER KAGE', scenes: [a3s1(), a3s2(), a3s3()] },
  { num: 'IV', theme: 'base', boss: 'blisk', bossName: 'COL. BLISK', scenes: [a4s1(), a4s2()] },
  { num: 'V', theme: 'catacombs', boss: 'malek', bossName: 'MALEK THE HOLLOW', scenes: [a5s1(), a5s2()] },
  { num: 'VI', theme: 'fortress', boss: 'demon', bossName: 'THE DEMON MOORE', scenes: [a6s1(), a6s2()] },
];
