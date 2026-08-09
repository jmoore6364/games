// Mission 1 — "The Green Wall". Beach landing → jungle trail → occupied
// village → gorge bridge → slug pickup → rebel line → Iron Moore-den.

export const TILE = 16;
export const T = { EMPTY: 0, GRASS: 1, DIRT: 2, PLANK: 3, CRATE: 4, SANDBAG: 5, STONE: 6, BRIDGE: 7 };

const W = 224, H = 14; // 3584 x 224 px

export function tileAt(g, tx, ty) {
  if (tx < 0 || tx >= g.w) return T.DIRT;
  if (ty < 0) return T.EMPTY;
  if (ty >= g.h) return T.DIRT;
  return g.d[ty * g.w + tx];
}
export function setTile(g, tx, ty, v) {
  if (tx < 0 || tx >= g.w || ty < 0 || ty >= g.h) return;
  g.d[ty * g.w + tx] = v;
}
export const solid = (t) => t === T.GRASS || t === T.DIRT || t === T.CRATE || t === T.SANDBAG || t === T.STONE;
// platforms you can stand on (and drop through from above only)
export const standable = (t) => solid(t) || t === T.PLANK || t === T.BRIDGE;

function buildGrid() {
  const d = new Uint8Array(W * H);
  const g = { w: W, h: H, d };

  // ground height per column (row of the grass top)
  const hs = new Array(W).fill(11);
  const span = (a, b, r) => { for (let c = a; c <= b && c < W; c++) hs[c] = r; };
  span(0, 34, 11);
  span(35, 38, 10);   // first rise
  span(39, 58, 10);
  span(59, 62, 9);    // higher shelf in the jungle
  span(63, 72, 9);
  span(73, 76, 10);
  span(77, 95, 11);   // village floor
  span(96, 105, 13);  // gorge bottom
  span(106, 122, 10); // slug hill
  span(123, 168, 11); // rebel line
  span(169, 176, 10);
  span(177, 223, 11); // boss approach + arena

  for (let c = 0; c < W; c++) {
    const top = hs[c];
    const cap = c >= 96 && c <= 105 ? T.DIRT : (c >= 190 ? T.STONE : T.GRASS);
    setTile(g, c, top, cap);
    for (let r = top + 1; r < H; r++) setTile(g, c, r, T.DIRT);
  }

  // bridge over the gorge, level with the banks
  for (let c = 95; c <= 106; c++) setTile(g, c, 11, T.BRIDGE);

  // crates: steps and cover
  const crate = (c, r) => setTile(g, c, r, T.CRATE);
  crate(33, 10); // step up to the rise
  crate(46, 9); crate(47, 9); crate(47, 8);
  crate(88, 10); crate(89, 10); crate(89, 9);
  crate(120, 9);
  crate(150, 10); crate(151, 10); crate(151, 9); crate(152, 10);
  crate(183, 10);

  // sandbag emplacements
  const bag = (c) => setTile(g, c, hs[c] - 1, T.SANDBAG);
  bag(52); bag(53); bag(131); bag(132); bag(158); bag(159); bag(186); bag(187);

  // plank platforms (jump-through)
  const plank = (a, b, r) => { for (let c = a; c <= b; c++) setTile(g, c, r, T.PLANK); };
  plank(42, 45, 6);   // jungle lookout
  plank(80, 84, 7);   // village roofline walk
  plank(140, 144, 7); // watch platform
  plank(163, 166, 6);

  return { g, hs };
}

const built = buildGrid();

export const LEVEL = {
  g: built.g,
  hs: built.hs,
  start: { x: 40, y: 150 },
  endX: W * TILE,
  bossLockX: (W - 20) * TILE, // camera locks with arena on screen
  bossX: (W - 8) * TILE,

  // decorative props: {t, x(px), c(col to sit on)}
  props: [
    { t: 'palm', c: 6 }, { t: 'bush', c: 12 }, { t: 'sign', c: 16 },
    { t: 'palm', c: 22 }, { t: 'bush', c: 28 }, { t: 'palm', c: 40 },
    { t: 'bush', c: 55 }, { t: 'palm', c: 66 }, { t: 'bush', c: 70 },
    { t: 'hut', c: 79 }, { t: 'hut', c: 90 }, { t: 'fence', c: 86 },
    { t: 'fence', c: 87 }, { t: 'barrel', c: 93 },
    { t: 'palm', c: 111 }, { t: 'bush', c: 116 },
    { t: 'hut', c: 128 }, { t: 'barrel', c: 135 }, { t: 'fence', c: 136 },
    { t: 'bush', c: 147 }, { t: 'palm', c: 155 }, { t: 'bush', c: 172 },
    { t: 'barrel', c: 181 }, { t: 'bush', c: 192 },
  ],

  // POWs tied to posts: col positions
  pows: [26, 83, 118, 161],

  // the Moore Slug waits on its hill
  slugCol: 113,

  // spawn zones: when camera right edge passes x, spawn the batch.
  // types: rifle | knife | nade | heli
  zones: [
    { x: 640, spawns: [{ t: 'rifle', c: 50 }, { t: 'knife', c: 55 }] },
    { x: 800, spawns: [{ t: 'rifle', c: 61 }, { t: 'rifle', c: 68 }] },
    { x: 1000, spawns: [{ t: 'knife', c: 74 }, { t: 'knife', c: 78 }] },
    { x: 1230, spawns: [{ t: 'nade', c: 82, plat: true }, { t: 'rifle', c: 92 }] },
    { x: 1400, spawns: [{ t: 'knife', c: 99 }, { t: 'rifle', c: 108 }] },
    { x: 1600, spawns: [{ t: 'heli', c: 108 }] },
    { x: 1860, spawns: [{ t: 'rifle', c: 131 }, { t: 'nade', c: 135 }] },
    { x: 2100, spawns: [{ t: 'knife', c: 139 }, { t: 'knife', c: 143 }, { t: 'rifle', c: 141, plat: true }] },
    { x: 2350, spawns: [{ t: 'rifle', c: 158 }, { t: 'nade', c: 162 }, { t: 'heli', c: 152 }] },
    { x: 2600, spawns: [{ t: 'knife', c: 171 }, { t: 'knife', c: 174 }, { t: 'rifle', c: 165, plat: true }] },
    { x: 2900, spawns: [{ t: 'rifle', c: 186 }, { t: 'rifle', c: 188 }, { t: 'nade', c: 192 }] },
    { x: 3050, spawns: [{ t: 'knife', c: 195 }, { t: 'heli', c: 190 }] },
  ],
};

export function groundYpx(c) {
  return LEVEL.hs[Math.max(0, Math.min(W - 1, c))] * TILE;
}
