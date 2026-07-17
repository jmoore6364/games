// Stage terrain as compact profile strings + wave scripts.
//
// Terrain DSL (space-separated segments, heights in tile rows, 25 rows tall):
//   "L,a,b"        L columns, flat: a rows of ceiling, b rows of floor
//   "L,a>a2,b>b2"  linear ramp from a to a2 (ceiling) and b to b2 (floor)
//   "~L,a1-a2,b1-b2"  organic wave between min-max (ceiling sin, floor cos)
// Blocks: "x,y,w,h;..." solid rects (asteroids, hull slabs, pillars).

export const TILE = 8;
export const ROWS = 25;            // play area = 25 * 8 = 200 px (224 - 24 HUD)
export const PLAY_H = ROWS * TILE;

function parseTerrain(str, w) {
  const top = new Int8Array(w), bot = new Int8Array(w);
  let x = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (tok[0] === '~') {
      const m = tok.slice(1).split(',');
      const L = +m[0];
      const [a1, a2] = m[1].split('-').map(Number);
      const [b1, b2] = m[2].split('-').map(Number);
      for (let i = 0; i < L && x < w; i++, x++) {
        const s = (Math.sin(i * 0.13) + 1) / 2;   // 0..1
        const c = (Math.cos(i * 0.11) + 1) / 2;
        top[x] = Math.round(a1 + (a2 - a1) * s);
        bot[x] = Math.round(b1 + (b2 - b1) * c);
      }
    } else {
      const m = tok.split(',');
      const L = +m[0];
      const [a1, a2] = m[1].includes('>') ? m[1].split('>').map(Number) : [+m[1], +m[1]];
      const [b1, b2] = m[2].includes('>') ? m[2].split('>').map(Number) : [+m[2], +m[2]];
      for (let i = 0; i < L && x < w; i++, x++) {
        const t = L > 1 ? i / (L - 1) : 0;
        top[x] = Math.round(a1 + (a2 - a1) * t);
        bot[x] = Math.round(b1 + (b2 - b1) * t);
      }
    }
  }
  // fill any shortfall with the last value
  for (; x < w; x++) { top[x] = top[x - 1] || 1; bot[x] = bot[x - 1] || 1; }
  return { top, bot };
}

function buildStage(def) {
  const w = def.w;
  const { top, bot } = parseTerrain(def.terrain, w);
  const g = new Uint8Array(w * ROWS);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < top[x]; y++) g[y * w + x] = 1;
    for (let y = ROWS - bot[x]; y < ROWS; y++) g[y * w + x] = 1;
  }
  if (def.blocks) {
    for (const b of def.blocks.split(';')) {
      if (!b) continue;
      const [bx, by, bw, bh] = b.split(',').map(Number);
      for (let y = by; y < by + bh && y < ROWS; y++) {
        for (let x = bx; x < bx + bw && x < w; x++) g[y * w + x] = 1;
      }
    }
  }
  return {
    ...def,
    g, wpx: w * TILE,
    bossX: (w - 32) * TILE,
    checkpoints: def.checkpoints.map((c) => c * TILE),
  };
}

export function tileAt(st, tx, ty) {
  if (ty < 0 || ty >= ROWS) return 1;
  if (tx < 0 || tx >= st.w) return 0;
  return st.g[ty * st.w + tx];
}

export function solidAt(st, x, y) {
  if (y < 0 || y >= PLAY_H) return true;
  return tileAt(st, x >> 3, y >> 3) === 1;
}

// ---------------------------------------------------------------- stages ----

const STAGE_DEFS = [
  {
    key: 'asteroid', theme: 0, speed: 1.0, w: 592,
    sub: 'DEBRIS BELT OF SECTOR MOORE',
    story: ['THE BYDO-CLASS ARMADA HIDES', 'BEHIND THE DEBRIS BELT.', '', 'PUNCH THROUGH THE ROCKS.'],
    terrain: '64,0,1 32,0,3 32,2,1 48,0,2 24,4,4 40,1,1 32,6,2 32,2,6 48,1,1 24,8,8 48,7,7 32,1,2 48,0,1 40,3,5 48,1,1',
    blocks: '150,8,6,5;158,16,5,4;210,4,7,5;218,14,6,5;400,10,8,6;470,6,6,4;476,15,5,4',
    checkpoints: [0, 200, 400],
    boss: 'golem',
    waves: [
      { c: 36, t: 'zako', y: 60, n: 5 },
      { c: 56, t: 'sine', y: 70, n: 5 },
      { c: 72, t: 'podItem', y: 100 },
      { c: 84, t: 'turret', side: 1 },
      { c: 92, t: 'turret', side: 1 },
      { c: 100, t: 'sine', y: 120, n: 6, red: 1 },
      { c: 120, t: 'rusher', y: 50, n: 3 },
      { c: 132, t: 'turret', side: -1 },
      { c: 150, t: 'crawler', side: 1 },
      { c: 162, t: 'zako', y: 130, n: 6, red: 1 },
      { c: 180, t: 'homer', y: 80 },
      { c: 200, t: 'sine', y: 90, n: 6 },
      { c: 214, t: 'turret', side: 1 }, { c: 222, t: 'turret', side: -1 },
      { c: 236, t: 'rusher', y: 110, n: 4 },
      { c: 252, t: 'zako', y: 70, n: 6 },
      { c: 268, t: 'sine', y: 140, n: 6, red: 1 },
      { c: 288, t: 'mid', n: 1 },
      { c: 322, t: 'turret', side: 1 }, { c: 330, t: 'turret', side: -1 }, { c: 346, t: 'turret', side: 1 },
      { c: 376, t: 'zako', y: 100, n: 6 },
      { c: 392, t: 'sine', y: 60, n: 6, red: 1 },
      { c: 410, t: 'homer', y: 120 },
      { c: 430, t: 'orb', y: 90 },
      { c: 450, t: 'rusher', y: 80, n: 4 },
      { c: 470, t: 'crawler', side: 1 }, { c: 478, t: 'crawler', side: -1 },
      { c: 495, t: 'sine', y: 110, n: 6 },
      { c: 515, t: 'zako', y: 60, n: 7, red: 1 },
      { c: 535, t: 'turret', side: 1 }, { c: 541, t: 'turret', side: -1 },
    ],
  },
  {
    key: 'organic', theme: 1, speed: 1.0, w: 600,
    sub: 'INSIDE THE LIVING HULK',
    story: ['A DERELICT GONE WRONG.', 'THE WALLS ARE ALIVE AND', 'THEY KNOW YOU ARE HERE.', '', 'FIND THE HEART. BURN IT.'],
    terrain: '48,1,2 ~64,1-4,2-6 32,5>2,8>3 ~96,2-7,2-7 40,8,8 ~72,3-8,3-8 32,2,10 ~80,6-10,1-5 48,2,2 ~56,4-9,4-9 32,2,3',
    blocks: '130,10,4,4;260,12,5,4;352,6,4,3;356,16,4,4',
    checkpoints: [0, 180, 392],
    boss: 'dobker',
    waves: [
      { c: 34, t: 'crawler', side: 1 },
      { c: 44, t: 'sine', y: 80, n: 6, red: 1 },
      { c: 62, t: 'zako', y: 110, n: 6 },
      { c: 80, t: 'turret', side: -1 },
      { c: 88, t: 'crawler', side: 1 },
      { c: 104, t: 'sine', y: 60, n: 6 },
      { c: 120, t: 'homer', y: 100 },
      { c: 136, t: 'zako', y: 70, n: 6, red: 1 },
      { c: 152, t: 'turret', side: 1 }, { c: 158, t: 'turret', side: -1 },
      { c: 172, t: 'crawler', side: -1 },
      { c: 186, t: 'rusher', y: 90, n: 4 },
      { c: 204, t: 'sine', y: 120, n: 6, red: 1 },
      { c: 224, t: 'orb', y: 100 },
      { c: 244, t: 'zako', y: 90, n: 7 },
      { c: 262, t: 'mid', n: 2 },
      { c: 300, t: 'turret', side: 1 }, { c: 308, t: 'turret', side: -1 },
      { c: 324, t: 'crawler', side: 1 }, { c: 330, t: 'crawler', side: -1 },
      { c: 348, t: 'sine', y: 80, n: 6, red: 1 },
      { c: 368, t: 'homer', y: 60 },
      { c: 388, t: 'zako', y: 120, n: 6 },
      { c: 408, t: 'rusher', y: 70, n: 4 },
      { c: 428, t: 'turret', side: -1 }, { c: 436, t: 'turret', side: 1 },
      { c: 452, t: 'sine', y: 100, n: 6, red: 1 },
      { c: 472, t: 'orb', y: 80 },
      { c: 492, t: 'crawler', side: 1 },
      { c: 512, t: 'zako', y: 60, n: 7, red: 1 },
      { c: 532, t: 'homer', y: 110 },
    ],
  },
  {
    key: 'fleet', theme: 2, speed: 1.2, w: 600,
    sub: 'THE GAUNTLET OF STEEL',
    story: ['THE ARMADA STANDS IN RANKS', 'BETWEEN YOU AND THE', 'MOTHERSHIP.', '', 'THREAD THE NEEDLE.'],
    terrain: '600,1,1',
    blocks: '120,5,14,2;180,18,12,2;240,8,10,2;300,3,16,2;340,15,14,2;420,10,12,3;456,4,10,2;490,18,10,2;528,9,12,2',
    checkpoints: [0, 200, 410],
    boss: 'carrier',
    waves: [
      { c: 32, t: 'sine', y: 70, n: 6 },
      { c: 50, t: 'rusher', y: 100, n: 4 },
      { c: 66, t: 'zako', y: 60, n: 7, red: 1 },
      { c: 84, t: 'homer', y: 130 },
      { c: 100, t: 'sine', y: 110, n: 6, red: 1 },
      { c: 122, t: 'turret', side: 1 },          // sits on hull slab
      { c: 128, t: 'crawler', side: 1 },
      { c: 144, t: 'rusher', y: 60, n: 5 },
      { c: 162, t: 'zako', y: 100, n: 7 },
      { c: 182, t: 'turret', side: 1 },
      { c: 198, t: 'homer', y: 70 }, { c: 202, t: 'homer', y: 140 },
      { c: 220, t: 'sine', y: 90, n: 7, red: 1 },
      { c: 242, t: 'turret', side: 1 },
      { c: 258, t: 'orb', y: 110 },
      { c: 276, t: 'mid', n: 3 },
      { c: 318, t: 'rusher', y: 80, n: 5 },
      { c: 336, t: 'zako', y: 130, n: 7, red: 1 },
      { c: 356, t: 'sine', y: 60, n: 7 },
      { c: 376, t: 'homer', y: 100 },
      { c: 396, t: 'rusher', y: 120, n: 5 },
      { c: 414, t: 'orb', y: 70 },
      { c: 432, t: 'turret', side: 1 },
      { c: 448, t: 'zako', y: 90, n: 7 },
      { c: 462, t: 'sine', y: 130, n: 7, red: 1 },
      { c: 482, t: 'homer', y: 60 }, { c: 486, t: 'homer', y: 150 },
      { c: 506, t: 'rusher', y: 100, n: 6 },
      { c: 524, t: 'orb', y: 120 },
      { c: 542, t: 'zako', y: 70, n: 8, red: 1 },
    ],
  },
  {
    key: 'mothership', theme: 3, speed: 0.9, w: 620,
    sub: 'HEART OF THE MACHINE',
    story: ['YOU ARE INSIDE.', 'CORRIDORS OF GRINDING STEEL', 'GUARD THE CORE.', '', 'NOTHING FLIES OUT AGAIN.', 'MAKE IT COUNT.'],
    terrain: '48,2,2 40,2,8 40,8,2 32,4,4 48,10,2 48,2,10 40,6,6 48,2,2 32,9,3 32,3,9 60,5,5 48,2,2 56,7,7 48,3,3',
    blocks: '176,12,4,3;344,4,3,4;348,17,3,4;452,11,5,3',
    checkpoints: [0, 170, 330, 470],
    boss: 'mother',
    waves: [
      { c: 34, t: 'crawler', side: 1 },
      { c: 44, t: 'zako', y: 80, n: 6 },
      { c: 58, t: 'turret', side: 1 }, { c: 64, t: 'turret', side: -1 },
      { c: 80, t: 'crusher', y0: 16, y1: 96, h: 56 },
      { c: 96, t: 'sine', y: 100, n: 6, red: 1 },
      { c: 112, t: 'homer', y: 70 },
      { c: 126, t: 'crusher', y0: 100, y1: 180, h: 56 },
      { c: 142, t: 'turret', side: 1 },
      { c: 156, t: 'zako', y: 110, n: 6, red: 1 },
      { c: 172, t: 'crawler', side: -1 },
      { c: 188, t: 'rusher', y: 90, n: 4 },
      { c: 206, t: 'orb', y: 100 },
      { c: 224, t: 'crusher', y0: 20, y1: 120, h: 64 },
      { c: 246, t: 'sine', y: 80, n: 6, red: 1 },
      { c: 266, t: 'mid', n: 4 },
      { c: 306, t: 'turret', side: 1 }, { c: 312, t: 'turret', side: -1 },
      { c: 328, t: 'homer', y: 100 },
      { c: 344, t: 'crusher', y0: 40, y1: 150, h: 60 },
      { c: 362, t: 'crawler', side: 1 }, { c: 368, t: 'crawler', side: -1 },
      { c: 386, t: 'zako', y: 90, n: 7, red: 1 },
      { c: 404, t: 'orb', y: 80 },
      { c: 424, t: 'rusher', y: 110, n: 5 },
      { c: 442, t: 'turret', side: 1 }, { c: 448, t: 'turret', side: -1 },
      { c: 464, t: 'crusher', y0: 30, y1: 130, h: 60 },
      { c: 484, t: 'sine', y: 100, n: 7, red: 1 },
      { c: 504, t: 'homer', y: 60 }, { c: 508, t: 'homer', y: 140 },
      { c: 526, t: 'zako', y: 80, n: 8 },
      { c: 544, t: 'orb', y: 110 },
      { c: 560, t: 'rusher', y: 90, n: 5 },
    ],
  },
];

export const STAGES = STAGE_DEFS.map(buildStage);

export const ENDING = [
  'THE MOTHER CORE GUTTERS OUT.',
  'THE ARMADA DRIFTS, HEADLESS,',
  'INTO THE DEBRIS IT HID BEHIND.',
  '',
  'ONE FIGHTER TURNS FOR HOME,',
  'HULL SCORCHED, POD HUMMING.',
  '',
  'THE BELT IS QUIET NOW.',
];
