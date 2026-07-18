// Stage layouts for Mega Moore. Stages are 15 tiles tall and built from
// 16-wide screen chunks written as compact strings (bottom rows only; blank
// rows are implied above). Tile chars:
//   . empty   # solid   = jump-through platform   H ladder   ^ spikes
//   < conveyor-left   > conveyor-right   * ice (slippery)   L lava (deadly)
//   D boss door   o crumbling ice block (becomes an entity)

export const TILE = 16;
export const T = {
  EMPTY: 0, SOLID: 1, PLAT: 2, LADDER: 3, SPIKE: 4,
  CONVL: 5, CONVR: 6, ICE: 7, LAVA: 8, DOOR: 9,
};
const CHARS = { '.': 0, '#': 1, '=': 2, H: 3, '^': 4, '<': 5, '>': 6, '*': 7, L: 8, D: 9, o: 0 };

export const isSolid = (t) => t === T.SOLID || t === T.CONVL || t === T.CONVR || t === T.ICE || t === T.DOOR;
export const isDeadly = (t) => t === T.SPIKE || t === T.LAVA;

export function tileAt(g, tx, ty) {
  if (tx < 0 || tx >= g.w) return T.SOLID; // stage edges are walls
  if (ty < 0 || ty >= g.h) return T.EMPTY;
  return g.d[ty * g.w + tx];
}
export function setTile(g, tx, ty, v) {
  if (tx >= 0 && tx < g.w && ty >= 0 && ty < g.h) g.d[ty * g.w + tx] = v;
}

// Pad a chunk given as its bottom rows up to 15 rows of 16 chars.
function C(rows) {
  const out = [];
  for (let i = 0; i < 15 - rows.length; i++) out.push('................');
  for (const r of rows) out.push((r + '................').slice(0, 16));
  return out;
}

const FLAT = (ch = '#') => C([ch.repeat(16), ch.repeat(16)]);
const DOOR_CHUNK = (ch = '#') => {
  const rows = [];
  for (let i = 0; i < 9; i++) rows.push('........#.......');
  for (let i = 0; i < 4; i++) rows.push('........D.......');
  rows.push(ch.repeat(16), ch.repeat(16));
  return rows;
};
const BOSS_ROOM = (ch = '#') => {
  const rows = [];
  for (let i = 0; i < 13; i++) rows.push('...............#');
  rows.push(ch.repeat(16), ch.repeat(16));
  return rows;
};
// Checkpoint chunk with a ladder up to a small item ledge.
const LADDER_CHUNK = (ch = '#') => C([
  '...==H==........',
  '.....H..........',
  '.....H..........',
  '.....H..........',
  '.....H..........',
  ch.repeat(16), ch.repeat(16),
]);

// ---------------------------------------------------------------- stages

const STAGE_DEFS = {
  torch: {
    theme: 'torch', boss: 'torch',
    chunks: [
      FLAT(),
      C(['######...#######', '######LLL#######']),
      C(['......===.......', '................', '.===.......===..', '................', '................', 'LLLLLLLLLLLLLLLL']),
      FLAT(),
      C(['.....====.......', '................', '..##............', '..##............', '################', '################']),
      C(['.......##.......', '..##...##...##..', '..##...##...##..', '..##...##...##..', 'LL##LLL##LLL##LL']),
      LADDER_CHUNK(),
      FLAT(),
      C(['......===.......', '................', '.===.......===..', '................', '................', 'LLLLLLLLLLLLLLLL']),
      FLAT(),
      FLAT(),
      DOOR_CHUNK(),
      BOSS_ROOM(),
    ],
    enemies: [
      { t: 'walker', x: 52, r: 13 }, { t: 'hopper', x: 58, r: 13 },
      { t: 'walker', x: 70, r: 13 }, { t: 'met', x: 75, r: 13 },
      { t: 'shieldwalker', x: 116, r: 13 }, { t: 'spawner', x: 122, r: 13 },
      { t: 'hopper', x: 148, r: 13 }, { t: 'met', x: 152, r: 13 }, { t: 'flyer', x: 150, r: 6 },
      { t: 'walker', x: 164, r: 13 }, { t: 'hopper', x: 170, r: 13 }, { t: 'flyer', x: 166, r: 5 },
    ],
    items: [
      { t: 'ws', x: 56, r: 13 }, { t: 'wb', x: 70, r: 9 },
      { t: 'hb', x: 99, r: 8 }, { t: 'etank', x: 135, r: 9 },
    ],
    flames: [
      { x: 37, off: 0 }, { x: 42, off: 70 },
      { x: 85, off: 30 }, { x: 90, off: 100 },
      { x: 132, off: 0 }, { x: 137, off: 70 },
    ],
    checkpointX: 106,
  },

  frost: {
    theme: 'frost', boss: 'frost',
    chunks: [
      FLAT('*'),
      C(['******...*******', '******^^^*******']),
      C(['.oo..oo..oo..oo.', '................', '^^^^^^^^^^^^^^^^']),
      FLAT('*'),
      C(['**..........****', '**..........****']),
      FLAT('*'),
      LADDER_CHUNK('*'),
      C(['****^^****^^****', '****************']),
      C(['.oo..oo...oo....', '..............**', '^^^^^^^^^^^^^^**']),
      FLAT('*'),
      C(['......===.......', '................', '.===.......===..', '................', '................', '................']),
      DOOR_CHUNK('*'),
      BOSS_ROOM('*'),
    ],
    enemies: [
      { t: 'hopper', x: 50, r: 13 }, { t: 'walker', x: 54, r: 13 },
      { t: 'met', x: 86, r: 13 }, { t: 'flyer', x: 84, r: 5 },
      { t: 'hopper', x: 102, r: 13 },
      { t: 'walker', x: 121, r: 13 },
      { t: 'shieldwalker', x: 148, r: 13 }, { t: 'spawner', x: 154, r: 13 },
      { t: 'flyer', x: 162, r: 6 }, { t: 'flyer', x: 168, r: 7 },
    ],
    items: [
      { t: 'ws', x: 56, r: 13 }, { t: 'hb', x: 99, r: 8 }, { t: 'etank', x: 167, r: 9 },
    ],
    appear: [
      { period: 45, blocks: [[67, 12], [70, 11], [73, 12]] },
    ],
    checkpointX: 106,
  },

  gear: {
    theme: 'gear', boss: 'gear',
    chunks: [
      FLAT(),
      C(['####>>>><<<<####', '################']),
      C(['################', '################', '################', '################', '################', '################', '################', '################', '################', '................', '................', '................', '................', '################', '################']),
      FLAT(),
      C(['##...........###', '##...........###']),
      C(['<<<<..>>>>..<<<<', '####..####..####']),
      LADDER_CHUNK(),
      C(['################', '################', '################', '################', '################', '################', '################', '################', '################', '................', '................', '................', '................', '################', '################']),
      C(['............==..', '................', '................', '................', '##............##', '##^^^^^^^^^^^^##']),
      C(['>>>>>>>><<<<<<<<', '################']),
      FLAT(),
      DOOR_CHUNK(),
      BOSS_ROOM(),
    ],
    enemies: [
      { t: 'walker', x: 20, r: 13 },
      { t: 'met', x: 52, r: 13 }, { t: 'spawner', x: 58, r: 13 },
      { t: 'shieldwalker', x: 120, r: 13 },
      { t: 'met', x: 148, r: 13 }, { t: 'hopper', x: 151, r: 13 }, { t: 'met', x: 155, r: 13 },
      { t: 'spawner', x: 164, r: 13 }, { t: 'walker', x: 168, r: 13 }, { t: 'hopper', x: 172, r: 13 },
      { t: 'flyer', x: 170, r: 6 },
    ],
    items: [
      { t: 'ws', x: 30, r: 13 }, { t: 'hb', x: 99, r: 8 }, { t: 'etank', x: 140, r: 9 },
    ],
    crushers: [
      { x: 35, off: 0 }, { x: 40, off: 60 }, { x: 45, off: 120 },
      { x: 116, off: 0 }, { x: 123, off: 90 },
    ],
    plats: [
      { x: 66, y: 11, axis: 'y', range: 24, sp: 0.03, ph: 0 },
      { x: 71, y: 10, axis: 'x', range: 20, sp: 0.025, ph: 1.5 },
      { x: 131, y: 11.5, axis: 'y', range: 24, sp: 0.03, ph: 0 },
      { x: 136, y: 10.5, axis: 'y', range: 24, sp: 0.03, ph: 3.1 },
    ],
    checkpointX: 106,
  },

  volt: {
    theme: 'volt', boss: 'volt',
    chunks: [
      FLAT(),
      C(['......H.########', '......H.........', '......H.........', '......H.........', '......H.........', '################', '################']),
      C(['################', '................', '................', '................', '................', '################', '################']),
      C(['########........', '................', '................', '................', '................', '################', '################']),
      C(['..==..==..==....', '................', '##............##', '##^^^^^^^^^^^^##']),
      FLAT(),
      LADDER_CHUNK(),
      FLAT(),
      C(['..H.############', '..H.............', '..H.............', '..H.............', '..H.............', '################', '################']),
      C(['########........', '................', '................', '................', '................', '################', '################']),
      C(['......==..==....', '................', '####........####', '####^^^^^^^^####']),
      DOOR_CHUNK(),
      BOSS_ROOM(),
    ],
    enemies: [
      { t: 'walker', x: 12, r: 13 },
      { t: 'flyer', x: 40, r: 4 }, { t: 'met', x: 44, r: 13 },
      { t: 'met', x: 62, r: 13 },
      { t: 'hopper', x: 84, r: 13 }, { t: 'met', x: 88, r: 13 },
      { t: 'walker', x: 118, r: 13 },
      { t: 'spawner', x: 138, r: 13 },
      { t: 'flyer', x: 150, r: 4 }, { t: 'met', x: 154, r: 13 },
      { t: 'shieldwalker', x: 157, r: 13 },
    ],
    items: [
      { t: 'wb', x: 44, r: 13 }, { t: 'hb', x: 99, r: 8 }, { t: 'etank', x: 143, r: 8 },
    ],
    beams: [
      { x: 34, y: 11, dir: 'h', len: 10, on: 60, offd: 60, off: 0 },
      { x: 60, y: 9, dir: 'v', len: 4, on: 70, offd: 70, off: 0 },
      { x: 64, y: 9, dir: 'h', len: 16, on: 50, offd: 80, off: 0 },
      { x: 115, y: 9, dir: 'v', len: 4, on: 70, offd: 70, off: 0 },
      { x: 120, y: 9, dir: 'v', len: 4, on: 70, offd: 70, off: 60 },
      { x: 125, y: 9, dir: 'v', len: 4, on: 70, offd: 70, off: 120 },
      { x: 160, y: 9, dir: 'h', len: 16, on: 50, offd: 80, off: 0 },
    ],
    checkpointX: 106,
  },

  fortress: {
    theme: 'fortress', boss: 'moorly',
    chunks: [
      FLAT(),
      C(['####>>>>...#####', '########...#####']),
      C(['##..........####', '##^^^^^^^^^^####']),
      FLAT(),
      C(['################', '################', '################', '################', '################', '################', '################', '################', '################', '................', '................', '................', '................', '<<<<<<<<<<<<<<<<', '################']),
      FLAT(), // boss-rush room
      FLAT(),
      C(['.....==..==.....', '................', '####........####', '####^^^^^^^^####']),
      C(['.==..==..==..==.', '................', '................', 'LLLLLLLLLLLLLLLL']),
      FLAT(),
      C(['<<<<>>>><<<<>>>>', '################']),
      FLAT(),
      DOOR_CHUNK(),
      BOSS_ROOM(),
    ],
    enemies: [
      { t: 'met', x: 50, r: 13 }, { t: 'shieldwalker', x: 55, r: 13 }, { t: 'met', x: 60, r: 13 },
      { t: 'walker', x: 100, r: 13 }, { t: 'hopper', x: 104, r: 13 },
      { t: 'spawner', x: 148, r: 13 }, { t: 'met', x: 152, r: 13 }, { t: 'met', x: 156, r: 13 },
      { t: 'hopper', x: 162, r: 13 }, { t: 'hopper', x: 166, r: 13 }, { t: 'hopper', x: 170, r: 13 },
      { t: 'flyer', x: 168, r: 6 },
      { t: 'shieldwalker', x: 180, r: 13 }, { t: 'shieldwalker', x: 185, r: 13 }, { t: 'walker', x: 188, r: 13 },
    ],
    items: [
      { t: 'hb', x: 101, r: 13 }, { t: 'wb', x: 121, r: 11 }, { t: 'ws', x: 149, r: 13 },
    ],
    appear: [
      { period: 45, blocks: [[35, 12], [38, 10], [41, 12]] },
    ],
    crushers: [
      { x: 69, off: 0 }, { x: 75, off: 90 },
    ],
    flames: [
      { x: 132, off: 0 }, { x: 139, off: 80 },
    ],
    beams: [
      { x: 112, y: 9, dir: 'h', len: 16, on: 50, offd: 80, off: 0 },
    ],
    rushChunk: 5, // boss-rush refight room lives in chunk 5
    checkpointX: 50, // before the rush room so it cannot be skipped by dying

  },
};

export const STAGE_IDS = ['torch', 'frost', 'gear', 'volt', 'fortress'];

function groundRow(g, col) {
  for (let y = 0; y < g.h; y++) if (isSolid(tileAt(g, col, y))) return y;
  return 13;
}

// Build a fresh stage instance (grids are mutated during play: doors open).
export function buildStage(id) {
  const def = STAGE_DEFS[id];
  const chunks = def.chunks;
  const w = chunks.length * 16, h = 15;
  const g = { w, h, d: new Uint8Array(w * h) };
  const crumbles = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    for (let y = 0; y < 15; y++) {
      const row = chunks[ci][y];
      for (let x = 0; x < 16; x++) {
        const ch = row[x];
        const tx = ci * 16 + x;
        if (ch === 'o') { crumbles.push({ x: tx, y }); continue; }
        g.d[y * w + tx] = CHARS[ch] ?? 0;
      }
    }
  }
  // locate the boss door column
  let doorX = -1;
  for (let x = 0; x < w && doorX < 0; x++) {
    for (let y = 0; y < h; y++) if (tileAt(g, x, y) === T.DOOR) { doorX = x; break; }
  }
  const cpRow = groundRow(g, def.checkpointX);
  return {
    id, theme: def.theme, bossId: def.boss, g,
    start: { x: 20, y: 13 * TILE - 21 },
    checkpoint: { x: def.checkpointX * TILE, y: cpRow * TILE - 21 },
    doorX,
    bossRoomX: w - 16,
    enemies: def.enemies || [],
    items: def.items || [],
    flames: def.flames || [],
    crushers: def.crushers || [],
    plats: def.plats || [],
    beams: def.beams || [],
    appear: def.appear || [],
    crumbles,
    rushX: def.rushChunk !== undefined ? def.rushChunk * 16 : -1,
  };
}
