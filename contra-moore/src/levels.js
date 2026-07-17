// Stage layouts for Contra: Moore Force. Grids are built with terrain
// helpers rather than hand-typed maps. Tiles: 0 empty, 1 solid,
// 2 jump-through platform, 3 water surface (wadeable), 4 bridge (explodes).

export const TILE = 16;
export const T = { EMPTY: 0, SOLID: 1, PLAT: 2, WATER: 3, BRIDGE: 4 };

function makeGrid(w, h) {
  return { w, h, d: new Uint8Array(w * h) };
}
function set(g, x, y, v) {
  if (x >= 0 && x < g.w && y >= 0 && y < g.h) g.d[y * g.w + x] = v;
}
export function tileAt(g, tx, ty) {
  if (tx < 0 || tx >= g.w || ty < 0 || ty >= g.h) return 0;
  return g.d[ty * g.w + tx];
}
export function setTile(g, tx, ty, v) { set(g, tx, ty, v); }

function helpers(g) {
  return {
    // solid from row ty down to the bottom
    ground: (x0, x1, ty) => {
      for (let x = x0; x <= x1; x++) for (let y = ty; y < g.h; y++) set(g, x, y, T.SOLID);
    },
    block: (x0, x1, y0, y1) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(g, x, y, T.SOLID);
    },
    plat: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) set(g, x, ty, T.PLAT); },
    water: (x0, x1, ty = 12) => {
      for (let x = x0; x <= x1; x++) { set(g, x, ty, T.WATER); }
    },
    bridge: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) set(g, x, ty, T.BRIDGE); },
    wall: (x0, x1) => {
      for (let x = x0; x <= x1; x++) for (let y = 0; y < g.h; y++) set(g, x, y, T.SOLID);
    },
  };
}

// ---------------- AREA 1: JUNGLE ----------------

function buildJungle() {
  const g = makeGrid(224, 15);
  const { ground, plat, water, bridge, wall } = helpers(g);

  ground(0, 19, 11);
  water(20, 29); bridge(20, 29, 11);
  ground(30, 45, 11); plat(33, 36, 7); plat(40, 43, 8);
  ground(46, 53, 9);
  water(54, 61); plat(55, 56, 9); plat(58, 60, 7);
  ground(62, 71, 11); ground(72, 81, 9); ground(82, 89, 7); ground(90, 99, 11);
  plat(74, 76, 5);
  water(100, 109); bridge(100, 109, 11);
  ground(110, 139, 11); plat(114, 117, 8); plat(122, 125, 7); plat(130, 133, 8);
  water(140, 147); plat(141, 142, 9); plat(145, 146, 9);
  ground(148, 157, 11); ground(158, 167, 9); ground(168, 177, 11); plat(160, 163, 5);
  ground(178, 223, 11);
  wall(221, 223);

  const spawns = [
    { t: 'rifle', x: 34, row: 7 },
    { t: 'rifle', x: 42, row: 8 },
    { t: 'capsule', x: 34, d: 'M' },
    { t: 'rifle', x: 50, row: 9 },
    { t: 'turret', x: 66, row: 11 },
    { t: 'rifle', x: 75, row: 5 },
    { t: 'turret', x: 85, row: 7 },
    { t: 'capsule', x: 88, d: 'S' },
    { t: 'rifle', x: 115, row: 8 },
    { t: 'cannon', x: 128, row: 11 },
    { t: 'rifle', x: 131, row: 8 },
    { t: 'capsule', x: 124, d: 'B' },
    { t: 'turret', x: 152, row: 11 },
    { t: 'rifle', x: 161, row: 5 },
    { t: 'turret', x: 163, row: 9 },
    { t: 'capsule', x: 158, d: 'L' },
    { t: 'cannon', x: 188, row: 11 },
    { t: 'turret', x: 196, row: 11 },
    { t: 'cannon', x: 204, row: 11 },
    { t: 'capsule', x: 190, d: 'S' },
  ];
  const zones = [
    { x0: 4, x1: 92, rate: 130 },
    { x0: 104, x1: 200, rate: 105 },
  ];
  return {
    key: 'jungle', theme: 'jungle', vertical: false, g, spawns, zones,
    start: { x: 32, y: 140 }, boss: 'wall',
    story: ['YEAR 2ØXX. THE MOORLORD', 'LEGION HAS SEIZED THE', 'GALUGA ARCHIPELAGO.', '', 'SGT. MOORE — GO IN ALONE.', 'TEAR THEIR ARMY DOWN.'],
  };
}

// ---------------- AREA 2: THE FALLS (vertical) ----------------

function buildFalls() {
  const H = 152;
  const g = makeGrid(16, H);
  const { ground, block, plat } = helpers(g);

  ground(0, 15, H - 3); // start floor
  block(0, 0, 20, H - 1); block(15, 15, 20, H - 1); // canyon walls

  // Zigzag climb: platform bands every 3-4 rows, ledges with grunts.
  const lanes = [[2, 5], [6, 9], [10, 13], [6, 9]];
  let li = 0;
  const spawns = [];
  for (let y = H - 7; y > 18; y -= 3 + (li % 2)) {
    const [a, b] = lanes[li % lanes.length];
    if (li % 6 === 5) {
      block(a - 1, b + 1, y, y + 1); // solid ledge
      spawns.push({ t: 'lobber', x: a + 1, row: y });
    } else {
      plat(a, b, y);
    }
    if (li % 7 === 3) spawns.push({ t: 'rifle', x: a + 1, row: y });
    li++;
  }
  // Boss arena at the top: two side ledges under the idol.
  block(1, 5, 14, 15); block(10, 14, 14, 15);
  plat(6, 9, 12);

  spawns.push(
    { t: 'capsule', x: 0, d: 'M', scrollY: (H - 40) * TILE },
    { t: 'capsule', x: 0, d: 'S', scrollY: (H - 80) * TILE },
    { t: 'capsule', x: 0, d: 'B', scrollY: (H - 115) * TILE },
  );
  const zones = [{ y0: 30 * TILE, y1: (H - 10) * TILE, rate: 150, flyer: true }];
  return {
    key: 'falls', theme: 'falls', vertical: true, g, spawns, zones,
    start: { x: 48, y: (H - 6) * TILE }, boss: 'idol',
    story: ['THE JUNGLE WALL IS DOWN.', 'NOW CLIMB THE FALLS.', '', 'SOMETHING OLD AND HUNGRY', 'IS CARVED INTO THE ROCK', 'AT THE TOP. IT SEES YOU.'],
  };
}

// ---------------- AREA 3: DREADNOUGHT BASE ----------------

function buildBase() {
  const g = makeGrid(208, 15);
  const { ground, block, plat, wall } = helpers(g);

  ground(0, 207, 12);
  block(0, 207, 0, 0); // ceiling
  // Machinery pillars and catwalks.
  block(24, 26, 8, 11); plat(30, 34, 6);
  block(44, 46, 4, 6);
  plat(52, 56, 8); block(62, 64, 9, 11);
  plat(70, 75, 5); block(78, 80, 8, 11);
  block(92, 94, 4, 7); plat(88, 91, 9);
  block(104, 106, 9, 11); plat(110, 115, 7);
  block(124, 126, 4, 6); plat(120, 123, 9);
  block(136, 138, 8, 11); plat(142, 147, 6);
  block(156, 158, 9, 11); plat(152, 155, 5);
  plat(166, 171, 8);
  block(178, 180, 8, 11);
  wall(205, 207);

  const spawns = [
    { t: 'turret', x: 33, row: 12 },
    { t: 'turret', x: 40, row: 1, ceil: true },
    { t: 'rifle', x: 54, row: 8 },
    { t: 'roller', x: 60, row: 12 },
    { t: 'capsule', x: 40, d: 'M' },
    { t: 'turret', x: 72, row: 5 },
    { t: 'cannon', x: 79, row: 8 },
    { t: 'turret', x: 86, row: 1, ceil: true },
    { t: 'rifle', x: 89, row: 9 },
    { t: 'roller', x: 100, row: 12 },
    { t: 'capsule', x: 96, d: 'L' },
    { t: 'turret', x: 112, row: 7 },
    { t: 'cannon', x: 125, row: 4, side: -1 },
    { t: 'turret', x: 130, row: 1, ceil: true },
    { t: 'roller', x: 140, row: 12 },
    { t: 'rifle', x: 144, row: 6 },
    { t: 'capsule', x: 136, d: 'B' },
    { t: 'turret', x: 160, row: 12 },
    { t: 'rifle', x: 168, row: 8 },
    { t: 'turret', x: 172, row: 1, ceil: true },
    { t: 'cannon', x: 179, row: 8 },
    { t: 'roller', x: 190, row: 12 },
    { t: 'capsule', x: 184, d: 'S' },
  ];
  const zones = [{ x0: 8, x1: 190, rate: 120 }];
  return {
    key: 'base', theme: 'base', vertical: false, g, spawns, zones,
    start: { x: 32, y: 150 }, boss: 'tank',
    story: ['ABOVE THE FALLS: STEEL.', 'THE LEGION DUG A FORTRESS', 'INTO THE MOUNTAIN.', '', 'THEIR DREADNOUGHT ENGINE', 'IS WAKING UP. HURRY.'],
  };
}

// ---------------- AREA 4: THE MOORLORD HIVE ----------------

function buildHive() {
  const g = makeGrid(192, 15);
  const { ground, block, plat, wall } = helpers(g);

  ground(0, 191, 11);
  block(30, 191, 0, 0); // hive roof closes in
  plat(20, 24, 7); plat(32, 36, 6);
  block(44, 46, 8, 10);
  plat(52, 57, 7); block(64, 66, 3, 5);
  plat(72, 77, 8); plat(84, 89, 5);
  block(96, 98, 8, 10);
  plat(104, 109, 7); block(116, 118, 3, 6);
  plat(124, 129, 8); plat(136, 141, 5);
  block(148, 150, 8, 10);
  plat(156, 161, 7);
  ground(168, 191, 9);
  wall(189, 191);

  const spawns = [
    { t: 'pod', x: 26, row: 11 },
    { t: 'rifle', x: 34, row: 6 },
    { t: 'pod', x: 48, row: 11 },
    { t: 'capsule', x: 36, d: 'S' },
    { t: 'flyernest', x: 60 },
    { t: 'pod', x: 70, row: 11 },
    { t: 'rifle', x: 86, row: 5 },
    { t: 'pod', x: 93, row: 11 },
    { t: 'capsule', x: 84, d: 'M' },
    { t: 'flyernest', x: 102 },
    { t: 'pod', x: 113, row: 11 },
    { t: 'rifle', x: 126, row: 8 },
    { t: 'pod', x: 133, row: 11 },
    { t: 'capsule', x: 128, d: 'B' },
    { t: 'flyernest', x: 144 },
    { t: 'pod', x: 154, row: 11 },
    { t: 'rifle', x: 158, row: 7 },
    { t: 'pod', x: 172, row: 9 },
    { t: 'capsule', x: 165, d: 'L' },
  ];
  const zones = [];
  return {
    key: 'hive', theme: 'hive', vertical: false, g, spawns, zones,
    start: { x: 32, y: 140 }, boss: 'heart',
    story: ['THE MACHINE IS SCRAP.', 'BUT UNDER THE MOUNTAIN', 'THE WALLS ARE... BREATHING.', '', 'FIND THE MOORLORD HEART.', 'BURN IT. GO HOME.'],
  };
}

export const STAGES = [buildJungle(), buildFalls(), buildBase(), buildHive()];

export const ENDING = [
  'THE HEART BURSTS. THE HIVE',
  'SCREAMS AND FALLS SILENT.',
  '',
  'SGT. MOORE WALKS OUT OF THE',
  'SMOKE AS THE ISLAND SINKS',
  'BEHIND HIM.',
  '',
  'THE GALAXY SLEEPS TONIGHT.',
  'BUT KEEP THE RIFLE LOADED —',
  'THERE IS ALWAYS MOORE.',
];
