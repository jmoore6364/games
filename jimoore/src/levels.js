// levels.js — tile maps and per-level difficulty scaling.
//
// Legend: '#' fence  'H' house wall  'D' door  'W' planter/junk (solid)
//         '.' grass  ',' path  'B' bush (walkable, hides)  'C' trash can
//         'P' player spawn

export const TILE = 16;
export const COLS = 24;
export const ROWS = 16;

const MAP_BACKYARD = [
  '########################',
  '#HHHHHHHHHHDHHHHHHHHHHH#',
  '#..........,...........#',
  '#.B..C.....,....C....B.#',
  '#..........,...........#',
  '#...WW.....,....WW.....#',
  '#...WW.....,....WW..C..#',
  '#..........,...........#',
  '#.C........,...........#',
  '#.....B....,....B......#',
  '#..........,...........#',
  '#..C...WW..,..WW....C..#',
  '#.......W..,..W........#',
  '#..........,...........#',
  '#.B........P........B..#',
  '########################',
];

const MAP_ALLEY = [
  '########################',
  '#HHHHHHDHHHHHHHHHHHHHHH#',
  '#......,...............#',
  '#.C....,..WWWW....C..B.#',
  '#......,..W..W.........#',
  '#..B...,..W..W...WWW...#',
  '#......,.........W.C...#',
  '#,,,,,,,,,,,,,,,,W.....#',
  '#......W.........W.....#',
  '#..C...W....B....WWW...#',
  '#......W...............#',
  '#..WWWWW..C.......C....#',
  '#......................#',
  '#...B.......,......B...#',
  '#...........P..........#',
  '########################',
];

const MAP_JUNKYARD = [
  '########################',
  '#HHHHHHHHHHHHHHHHDHHHHH#',
  '#................,.....#',
  '#.C..WW....C.....,..B..#',
  '#....WW..........,.....#',
  '#..B.....WW...WW.,.....#',
  '#........WW...WW.,..C..#',
  '#.C..............,.....#',
  '#....,,,,,,,,,,,,,.....#',
  '#....,.........B.......#',
  '#.B..,..C..............#',
  '#....,......WW....C....#',
  '#....,..WW..WW.........#',
  '#.C..,..WW.......B.....#',
  '#....,......P..........#',
  '########################',
];

export const MAPS = [MAP_BACKYARD, MAP_ALLEY, MAP_JUNKYARD];

// Sanity-check map dimensions at load so a stray character shows up
// as a loud error instead of a subtle collision bug.
for (const m of MAPS) {
  if (m.length !== ROWS) throw new Error('map has wrong row count');
  for (const r of m) if (r.length !== COLS) throw new Error(`bad row width ${r.length}: "${r}"`);
}

export function levelConfig(n) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return {
    map: MAPS[(n - 1) % MAPS.length],
    cats: clamp(1 + Math.floor(n / 2), 1, 4),
    dogs: n >= 2 ? clamp(Math.floor(n / 2), 1, 3) : 0,
    ratsMax: n >= 2 ? clamp(1 + Math.floor((n - 1) / 2), 1, 4) : 0,
    ratInterval: clamp(10 - n, 5, 10),            // seconds between rat spawns
    noiseThreshold: clamp(100 - 7 * (n - 1), 55, 100),
    noiseDecay: clamp(7 - 0.4 * (n - 1), 4, 7),   // meter units per second
    // chance a can is upgraded past plastic: tier 2 from level 2, tier 3 from 3
    pTier2: clamp(0.3 * (n - 1), 0, 0.55),
    pTier3: clamp(0.2 * (n - 2), 0, 0.5),
  };
}
