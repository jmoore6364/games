// Pixel art: string-grid sprites and parametric portraits baked to offscreen
// canvases, plus procedural 24px terrain tiles. All original art.

export const TILE = 24;

const PAL = {
  d: '#101010', w: '#f8f8f8', s: '#f8b888', y: '#f8d838', o: '#e07820',
  r: '#c02818', R: '#f84020', g: '#30a020', G: '#186010', b: '#3868f8',
  B: '#182888', c: '#40d8d8', p: '#c060e0', P: '#682898', q: '#a8a8b8',
  Q: '#585868', k: '#e8e0c8', h: '#804010', H: '#502808', t: '#d8b048',
  n: '#282838', m: '#607048', M: '#404830', e: '#a8e858', E: '#487818',
  v: '#d0d0e0',
};

function bake(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

// ---------- 16x16 unit templates ----------
// 1 hair/helm  2 skin  3 body  4 trim  5 legs  6 boots  7 mount/fur  8 mount dark  W wing

const HUMAN = [
  '................',
  '.....111111.....',
  '....11111111....',
  '....12222221....',
  '....2d2222d2....',
  '.....222222.....',
  '.....333333.....',
  '....33333333....',
  '...2333333332...',
  '...2344444432...',
  '....33333333....',
  '.....444444.....',
  '.....55..55.....',
  '.....55..55.....',
  '....666..666....',
  '................',
];

const ROBED = [
  '................',
  '.....111111.....',
  '....11111111....',
  '....11222211....',
  '....1d2222d1....',
  '.....222222.....',
  '.....333333.....',
  '....33333333....',
  '...2333333332...',
  '...2334444332...',
  '....33333333....',
  '...3333333333...',
  '..333333333333..',
  '..334444444433..',
  '...66......66...',
  '................',
];

const RIDER = [
  '................',
  '......1111......',
  '.....111111.....',
  '.....122221.....',
  '.....2d22d2.....',
  '.....333333.....',
  '....33344333....',
  '..7.33333333.7..',
  '.777777777777...',
  '7777777777777777',
  '7788888888888877',
  '.78888888888887.',
  '.78..78..87..87.',
  '.78..78..87..87.',
  '.88..88..88..88.',
  '................',
];

const WINGED = [
  '................',
  '.W...111111...W.',
  'WW..11111111..WW',
  'WWW.12222221.WWW',
  'WWWW2d2222d2WWWW',
  'WWW..222222..WWW',
  'WW...333333...WW',
  'W...33333333...W',
  '...2333333332...',
  '...2344444432...',
  '....33333333....',
  '.....444444.....',
  '.....55..55.....',
  '.....55..55.....',
  '....666..666....',
  '................',
];

const BEAST = [
  '................',
  '................',
  '..77............',
  '.7777.......77..',
  '.7d77......7777.',
  '..7777777777777.',
  '..77777777777777',
  '...7777777777787',
  '...777777777778.',
  '...77777777777..',
  '...778877778877.',
  '...77..77..77...',
  '...78..78..78...',
  '...88..88..88...',
  '................',
  '................',
];

const DRAGON = [
  '........77..............77.....',
  '.......7777............7777....',
  '......777777..........777777...',
  '.....77777777........77777777..',
  '....7777777777......7777777777.',
  '...777777777777....777777777777',
  '..77777777777777..7777777777777',
  '..777777777777777777777777777..',
  '...7777777777777777777777777...',
  '....777777777777777777777......',
  '.....77777777777777777777......',
  '......777777777777777777.......',
  '.......77778888887777..77......',
  '.......7778888888877....77.....',
  '......777888888888777..........',
  '.....777d8888888887777.........',
  '.....77dd888888888877777.......',
  '.....7777888888888777777.......',
  '......77788888888877777........',
  '.......777888888877777.........',
  '........77788888777............',
  '........7777777777.............',
  '.......777777777777............',
  '......77778888877777...........',
  '.....7777788888777777..........',
  '....77777888888877777..........',
  '....7777888888887777...........',
  '....777788....887777...........',
  '....7777........7777...........',
  '....777..........777...........',
  '...77..............77..........',
  '................................',
];

// palettes per unit key: [hair, skin, body, trim, legs, boots, mount, mountDark, wing]
const UNIT_PALS = {
  // players
  hero: { t: HUMAN, 1: 'h', 3: 'b', 4: 'y', 5: 'B', 6: 'H' },
  warrior: { t: HUMAN, 1: 'o', 3: 'o', 4: 'h', 5: 'H', 6: 'H' },
  healer: { t: ROBED, 1: 'y', 3: 'w', 4: 'b', 6: 'H' },
  knight: { t: RIDER, 1: 'q', 3: 'v', 4: 'r', 7: 'h', 8: 'H' },
  archer: { t: HUMAN, 1: 't', 3: 'g', 4: 'G', 5: 'H', 6: 'H' },
  mage: { t: ROBED, 1: 'P', 2: 's', 3: 'p', 4: 'y', 6: 'H' },
  wolf: { t: HUMAN, 1: 'q', 2: 'q', 3: 'Q', 4: 'r', 5: 'Q', 6: 'H' },
  birdman: { t: WINGED, 1: 'c', 3: 'v', 4: 'b', 5: 'Q', 6: 'H', W: 'w' },
  // enemies
  gob: { t: HUMAN, 1: 'G', 2: 'e', 3: 'h', 4: 'H', 5: 'H', 6: 'H' },
  orc: { t: HUMAN, 1: 'M', 2: 'E', 3: 'm', 4: 'd', 5: 'M', 6: 'H' },
  earc: { t: HUMAN, 1: 'n', 2: 'q', 3: 'Q', 4: 'p', 5: 'n', 6: 'n' },
  dmag: { t: ROBED, 1: 'n', 2: 'q', 3: 'n', 4: 'r', 6: 'n' },
  dpri: { t: ROBED, 1: 'n', 2: 'q', 3: 'P', 4: 'w', 6: 'n' },
  wolfE: { t: BEAST, 7: 'Q', 8: 'n' },
  harp: { t: WINGED, 1: 'p', 2: 's', 3: 'P', 4: 'p', 5: 'P', 6: 'n', W: 'p' },
  eknt: { t: RIDER, 1: 'n', 3: 'Q', 4: 'r', 7: 'n', 8: 'd' },
  garg: { t: WINGED, 1: 'Q', 2: 'q', 3: 'q', 4: 'Q', 5: 'Q', 6: 'Q', W: 'q' },
  zomb: { t: HUMAN, 1: 'm', 2: 'e', 3: 'M', 4: 'm', 5: 'M', 6: 'H' },
  vex: { t: ROBED, 1: 'y', 2: 'q', 3: 'r', 4: 'y', 6: 'n' },
  drag: { t: DRAGON, 7: 'P', 8: 'e' },
};

export const SPR = {};
export const TILES = {};
export const FACES = {};

function unitCanvas(key, promoted) {
  const spec = UNIT_PALS[key];
  const pal = { d: PAL.d, 2: PAL.s, 5: PAL.Q };
  for (const k of Object.keys(spec)) if (k !== 't') pal[k] = PAL[spec[k]];
  if (promoted) pal[4] = PAL.y; // gold trim for promoted classes
  return bake(spec.t, pal);
}

// ---------- terrain tiles ----------
function tileCanvas(fn) {
  const cv = document.createElement('canvas');
  cv.width = TILE; cv.height = TILE;
  fn(cv.getContext('2d'));
  return cv;
}

// small deterministic hash for speckles
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) % 97 / 97;

function speckle(g, base, spots, n = 14, seed = 0) {
  g.fillStyle = base; g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = spots;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i + seed, i * 3 + 1) * TILE);
    const y = Math.floor(hash(i * 7 + 2 + seed, i + 5) * TILE);
    g.fillRect(x, y, 2, 1);
  }
}

function makeTiles() {
  TILES['.'] = tileCanvas((g) => speckle(g, '#58a838', '#70c048', 12, 1));
  TILES['s'] = tileCanvas((g) => speckle(g, '#d8b878', '#c8a860', 12, 2));
  TILES['F'] = tileCanvas((g) => {
    speckle(g, '#9898a8', '#a8a8b8', 6, 3);
    g.strokeStyle = '#88889820'; g.fillStyle = '#888898';
    g.fillRect(0, 11, TILE, 1); g.fillRect(11, 0, 1, 11); g.fillRect(5, 12, 1, 12);
  });
  TILES['c'] = tileCanvas((g) => {
    speckle(g, '#b8b8c8', '#c8c8d8', 6, 4);
    g.fillStyle = '#8888a0';
    g.fillRect(0, 11, TILE, 1); g.fillRect(11, 0, 1, TILE);
    g.fillStyle = '#d8c878'; g.fillRect(10, 4, 4, 2);
  });
  TILES['r'] = tileCanvas((g) => {
    speckle(g, '#c8a878', '#b89868', 10, 5);
    g.fillStyle = '#a88858';
    g.fillRect(3, 5, 2, 2); g.fillRect(17, 14, 3, 2); g.fillRect(9, 19, 2, 2);
  });
  TILES['='] = tileCanvas((g) => {
    g.fillStyle = '#8a5a2a'; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = '#a87840';
    for (let y = 0; y < TILE; y += 4) g.fillRect(0, y, TILE, 3);
    g.fillStyle = '#6a4520'; g.fillRect(0, 0, 2, TILE); g.fillRect(22, 0, 2, TILE);
  });
  TILES['f'] = tileCanvas((g) => {
    speckle(g, '#409030', '#58a838', 8, 6);
    g.fillStyle = '#186018';
    g.beginPath();
    g.fillRect(8, 4, 8, 3); g.fillRect(6, 7, 12, 4); g.fillRect(4, 11, 16, 5);
    g.fillStyle = '#28802a'; g.fillRect(7, 6, 4, 3); g.fillRect(12, 9, 5, 3);
    g.fillStyle = '#6a4520'; g.fillRect(10, 16, 4, 5);
  });
  TILES['h'] = tileCanvas((g) => {
    speckle(g, '#a08858', '#b09868', 8, 7);
    g.fillStyle = '#807048';
    g.fillRect(2, 16, 20, 6); g.fillRect(5, 11, 14, 5); g.fillRect(9, 7, 7, 4);
    g.fillStyle = '#c0a878'; g.fillRect(9, 7, 3, 2); g.fillRect(5, 11, 4, 2); g.fillRect(2, 16, 5, 2);
  });
  // water: two animation frames
  TILES['w'] = [0, 1].map((f) => tileCanvas((g) => {
    g.fillStyle = '#2858c8'; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = '#4878e8';
    for (let i = 0; i < 5; i++) {
      const y = (i * 5 + f * 2) % TILE;
      g.fillRect((i * 7 + f * 3) % 16, y, 7, 1);
    }
  }));
  TILES['#'] = tileCanvas((g) => {
    g.fillStyle = '#686878'; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = '#888898';
    for (let y = 0; y < TILE; y += 6) {
      for (let x = 0; x < TILE; x += 8) g.fillRect(x + ((y / 6) % 2 ? 4 : 0), y, 7, 5);
    }
    g.fillStyle = '#484858'; g.fillRect(0, 0, TILE, 1); g.fillRect(0, 23, TILE, 1);
  });
  TILES['T'] = tileCanvas((g) => {
    speckle(g, '#b8b8c8', '#c8c8d8', 4, 8);
    g.fillStyle = '#c02818'; g.fillRect(6, 2, 12, 18);
    g.fillStyle = '#f8d838';
    g.fillRect(4, 2, 2, 20); g.fillRect(18, 2, 2, 20); g.fillRect(4, 20, 16, 2); g.fillRect(6, 2, 12, 2);
    g.fillStyle = '#e8b820'; g.fillRect(10, 5, 4, 3);
  });
  TILES['G'] = tileCanvas((g) => {
    g.fillStyle = '#907040'; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = '#a88850';
    for (let x = 0; x < TILE; x += 5) g.fillRect(x, 0, 4, TILE);
    g.fillStyle = '#584828'; g.fillRect(0, 10, TILE, 2);
    g.fillStyle = '#383828'; g.fillRect(3, 4, 2, 2); g.fillRect(19, 4, 2, 2); g.fillRect(3, 16, 2, 2); g.fillRect(19, 16, 2, 2);
  });
}

// ---------- parametric 24x24 portraits ----------
const FACE_SPECS = {
  moore: { skin: 's', hair: 'h', style: 'hair', extra: 'band', ec: 'b' },
  kael: { skin: 's', hair: 'q', style: 'helm', extra: 'plume', ec: 'Q' },
  gart: { skin: 's', hair: 'o', style: 'bald', extra: 'beard', ec: 'H' },
  mira: { skin: 's', hair: 'y', style: 'long', extra: 'circlet', ec: 'b' },
  pip: { skin: 's', hair: 't', style: 'hair', extra: 'feather', ec: 'G' },
  zin: { skin: 's', hair: 'P', style: 'hood', extra: null, ec: 'p' },
  sly: { skin: 'q', hair: 'Q', style: 'wolf', extra: null, ec: 'y' },
  aer: { skin: 's', hair: 'c', style: 'hair', extra: 'wingear', ec: 'c' },
  vex: { skin: 'q', hair: 'n', style: 'hood', extra: 'crown', ec: 'r' },
  drag: { skin: 'P', hair: 'P', style: 'dragon', extra: null, ec: 'r' },
};

function makeFace(spec) {
  const cv = document.createElement('canvas');
  cv.width = 24; cv.height = 24;
  const g = cv.getContext('2d');
  const C = (k) => PAL[k];
  const skin = C(spec.skin), hair = C(spec.hair);
  // backdrop shoulders
  g.fillStyle = C('n'); g.fillRect(2, 19, 20, 5);
  if (spec.style === 'dragon') {
    g.fillStyle = hair;
    g.fillRect(4, 6, 16, 14); g.fillRect(2, 2, 4, 6); g.fillRect(18, 2, 4, 6);
    g.fillStyle = C('e'); g.fillRect(6, 16, 12, 4);
    g.fillStyle = C('r'); g.fillRect(7, 10, 3, 2); g.fillRect(14, 10, 3, 2);
    g.fillStyle = C('d'); g.fillRect(8, 18, 2, 2); g.fillRect(14, 18, 2, 2);
    return cv;
  }
  // hair back / headgear
  if (spec.style === 'long') { g.fillStyle = hair; g.fillRect(4, 4, 16, 18); }
  if (spec.style === 'hair' || spec.style === 'wolf') { g.fillStyle = hair; g.fillRect(5, 3, 14, 8); }
  if (spec.style === 'hood') { g.fillStyle = hair; g.fillRect(4, 2, 16, 20); }
  if (spec.style === 'helm') { g.fillStyle = hair; g.fillRect(5, 2, 14, 9); g.fillRect(4, 6, 16, 4); }
  if (spec.style === 'wolf') { // ears
    g.fillStyle = hair; g.fillRect(4, 1, 4, 5); g.fillRect(16, 1, 4, 5);
  }
  // face
  g.fillStyle = skin;
  g.fillRect(7, spec.style === 'hood' || spec.style === 'helm' ? 9 : 7, 10, 11);
  if (spec.style === 'wolf') { g.fillRect(9, 14, 6, 5); } // muzzle
  // bangs
  if (spec.style === 'hair') { g.fillStyle = hair; g.fillRect(7, 6, 10, 3); g.fillRect(6, 6, 2, 6); }
  if (spec.style === 'long') { g.fillStyle = hair; g.fillRect(7, 5, 10, 3); g.fillRect(5, 5, 2, 17); g.fillRect(17, 5, 2, 17); }
  // eyes
  g.fillStyle = C(spec.ec);
  g.fillRect(9, 12, 2, 2); g.fillRect(14, 12, 2, 2);
  g.fillStyle = C('d');
  g.fillRect(9, 13, 2, 1); g.fillRect(14, 13, 2, 1);
  // mouth
  g.fillStyle = C('d'); g.fillRect(11, 17, 3, 1);
  // extras
  g.fillStyle = C('r');
  if (spec.extra === 'band') { g.fillStyle = C('r'); g.fillRect(6, 8, 12, 2); }
  if (spec.extra === 'plume') { g.fillStyle = C('r'); g.fillRect(10, 0, 4, 3); }
  if (spec.extra === 'beard') { g.fillStyle = hair; g.fillRect(7, 15, 10, 6); g.fillStyle = skin; g.fillRect(10, 15, 4, 2); }
  if (spec.extra === 'circlet') { g.fillStyle = C('y'); g.fillRect(7, 4, 10, 1); }
  if (spec.extra === 'feather') { g.fillStyle = C('g'); g.fillRect(17, 2, 3, 6); }
  if (spec.extra === 'wingear') { g.fillStyle = C('w'); g.fillRect(2, 8, 3, 8); g.fillRect(19, 8, 3, 8); }
  if (spec.extra === 'crown') { g.fillStyle = C('y'); g.fillRect(6, 2, 12, 3); g.fillRect(6, 0, 2, 2); g.fillRect(11, 0, 2, 2); g.fillRect(16, 0, 2, 2); }
  return cv;
}

// ---------- emblem for the title screen ----------
export function makeEmblem() {
  const cv = document.createElement('canvas');
  cv.width = 48; cv.height = 64;
  const g = cv.getContext('2d');
  // shield
  g.fillStyle = '#182888';
  g.fillRect(4, 8, 40, 34);
  g.fillRect(8, 42, 32, 8); g.fillRect(14, 50, 20, 6); g.fillRect(20, 56, 8, 4);
  g.fillStyle = '#f8d838';
  g.fillRect(4, 8, 40, 3); g.fillRect(4, 8, 3, 34); g.fillRect(41, 8, 3, 34);
  // sword (point down)
  g.fillStyle = '#e8e8f0'; g.fillRect(21, 12, 6, 34);
  g.fillStyle = '#b8b8c8'; g.fillRect(24, 12, 3, 34);
  g.fillStyle = '#e8e8f0'; g.fillRect(22, 46, 4, 4); g.fillRect(23, 50, 2, 3);
  g.fillStyle = '#f8d838'; g.fillRect(14, 8, 20, 4); g.fillRect(21, 2, 6, 6);
  g.fillStyle = '#c02818'; g.fillRect(22, 3, 4, 4);
  // rays
  g.fillStyle = '#f8d838';
  g.fillRect(10, 18, 8, 2); g.fillRect(30, 18, 8, 2);
  g.fillRect(12, 26, 6, 2); g.fillRect(30, 26, 6, 2);
  return cv;
}

export function initSprites() {
  makeTiles();
  for (const key of Object.keys(UNIT_PALS)) {
    SPR[key] = unitCanvas(key, false);
    SPR[key + '_p'] = unitCanvas(key, true);
  }
  for (const key of Object.keys(FACE_SPECS)) FACES[key] = makeFace(FACE_SPECS[key]);
}

export function drawTile(g, ch, x, y, frame = 0) {
  const t = TILES[ch] || TILES['.'];
  const cv = Array.isArray(t) ? t[frame % t.length] : t;
  g.drawImage(cv, x, y);
}

// SF-style bevelled menu window.
export function drawWindow(g, x, y, w, h) {
  g.fillStyle = '#101838'; g.fillRect(x, y, w, h);
  g.fillStyle = '#f8f8f8'; g.fillRect(x + 1, y + 1, w - 2, 1); g.fillRect(x + 1, y + 1, 1, h - 2);
  g.fillRect(x + 1, y + h - 2, w - 2, 1); g.fillRect(x + w - 2, y + 1, 1, h - 2);
  g.fillStyle = '#8890b8'; g.fillRect(x + 3, y + 3, w - 6, 1); g.fillRect(x + 3, y + 3, 1, h - 6);
  g.fillRect(x + 3, y + h - 4, w - 6, 1); g.fillRect(x + w - 4, y + 3, 1, h - 6);
}
