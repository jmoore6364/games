// Round layouts for Bonk's Moore-venture. Grids are built with terrain
// helpers rather than hand-typed maps.
// Tiles: 0 empty, 1 solid, 2 jump-through platform, 3 water (swimmable),
// 4 BITE wall (teeth-climbable, marked with chomp-chevrons), 5 lava, 6 ice.

export const TILE = 16;
export const T = { EMPTY: 0, SOLID: 1, PLAT: 2, WATER: 3, BITE: 4, LAVA: 5, ICE: 6 };

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
    ground: (x0, x1, ty, tile = T.SOLID) => {
      for (let x = x0; x <= x1; x++) for (let y = ty; y < g.h; y++) set(g, x, y, tile);
    },
    block: (x0, x1, y0, y1, tile = T.SOLID) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(g, x, y, tile);
    },
    plat: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) set(g, x, ty, T.PLAT); },
    waterRect: (x0, x1, y0, y1) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(g, x, y, T.WATER);
    },
    bite: (tx, y0, y1) => { for (let y = y0; y <= y1; y++) set(g, tx, y, T.BITE); },
    lavaPool: (x0, x1, y0) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y < g.h; y++) set(g, x, y, T.LAVA);
    },
    wall: (x0, x1) => {
      for (let x = x0; x <= x1; x++) for (let y = 0; y < g.h; y++) set(g, x, y, T.SOLID);
    },
  };
}

// little helper: a row of smileys
function smileys(spawns, x0, x1, row, step = 2) {
  for (let x = x0; x <= x1; x += step) spawns.push({ t: 'smiley', x, row });
}

// ---------------- ROUND 1: GRASSLANDS ----------------

function buildGrass() {
  const g = makeGrid(200, 14);
  const { ground, plat } = helpers(g);

  ground(0, 33, 11);
  ground(37, 68, 11);
  ground(72, 107, 11);
  ground(113, 148, 11);
  ground(152, 199, 11);
  plat(44, 48, 6);
  plat(56, 59, 8);
  plat(90, 94, 7);
  plat(120, 123, 8);
  plat(128, 131, 6);
  plat(108, 111, 8); // helper over the wide gap
  plat(168, 171, 7);

  const spawns = [
    { t: 'door', x: 20, row: 11, room: 'clouds' },
    { t: 'dino', x: 14, row: 11 },
    { t: 'dino', x: 28, row: 11 },
    { t: 'spring', x: 42, row: 11 },
    { t: 'fruit', x: 46, row: 6 },
    { t: 'dino', x: 52, row: 11 },
    { t: 'meat1', x: 58, row: 8 },
    { t: 'dino', x: 63, row: 11 },
    { t: 'shell', x: 80, row: 11 },
    { t: 'shell', x: 85, row: 11 },
    { t: 'frog', x: 92, row: 11 },
    { t: 'ptero', x: 98, row: 4 },
    { t: 'spring', x: 105, row: 11 },
    { t: 'frog', x: 118, row: 11 },
    { t: 'dino', x: 126, row: 11 },
    { t: 'fruit', x: 129, row: 6 },
    { t: 'cactus', x: 138, row: 11 },
    { t: 'frog', x: 144, row: 11 },
    { t: 'meat2', x: 160, row: 11 },
    { t: 'dino', x: 166, row: 11 },
    { t: 'ptero', x: 172, row: 4 },
    { t: 'shell', x: 176, row: 11 },
    { t: 'cactus', x: 180, row: 11 },
    { t: 'heart', x: 148, row: 11 },
    { t: 'goal', x: 194, row: 11 },
  ];
  smileys(spawns, 6, 16, 9);
  smileys(spawns, 44, 48, 4);
  smileys(spawns, 56, 59, 6);
  smileys(spawns, 74, 88, 9);
  smileys(spawns, 90, 94, 5);
  smileys(spawns, 108, 111, 6);
  smileys(spawns, 120, 123, 6);
  smileys(spawns, 154, 164, 9);
  smileys(spawns, 168, 171, 5);
  smileys(spawns, 186, 192, 9);

  return {
    key: 'grass', theme: 'grass', g, spawns, grav: 1,
    start: { x: 24, y: 140 },
    tag: 'DINO COUNTRY. HEAD FIRST.',
  };
}

// ---------------- ROUND 2: WATERFALL CLIFFS ----------------

function buildFalls() {
  const g = makeGrid(120, 30);
  const { ground, block, plat, waterRect, bite } = helpers(g);

  ground(0, 20, 26);
  waterRect(21, 44, 26, 28);
  block(21, 44, 29, 29);          // pool floor
  block(28, 36, 20, 25);          // ceiling shelf — dive under it
  ground(45, 60, 26);
  // the big cliff: teeth-climb showcase
  block(61, 99, 7, 29);
  bite(61, 8, 25);
  // hidden heart container ledge, jump back left from the cliff top
  plat(55, 58, 5);
  // second cliff up to the goal plateau
  block(100, 119, 3, 29);
  bite(100, 4, 6);

  const spawns = [
    { t: 'dino', x: 8, row: 26 },
    { t: 'fish', x: 25, row: 28 },
    { t: 'fish', x: 32, row: 28 },
    { t: 'fish', x: 40, row: 27 },
    { t: 'meat1', x: 41, row: 26 },
    { t: 'dino', x: 50, row: 26 },
    { t: 'ptero', x: 55, row: 20 },
    { t: 'heartcont', x: 56, row: 5 },
    { t: 'dino', x: 70, row: 7 },
    { t: 'frog', x: 78, row: 7 },
    { t: 'shell', x: 84, row: 7 },
    { t: 'dino', x: 90, row: 7 },
    { t: 'ptero', x: 86, row: 2 },
    { t: 'fruit', x: 96, row: 7 },
    { t: 'meat2', x: 106, row: 3 },
    { t: 'goal', x: 114, row: 3 },
  ];
  smileys(spawns, 4, 16, 24);
  smileys(spawns, 22, 26, 25); // over the pool surface
  smileys(spawns, 38, 42, 25);
  smileys(spawns, 30, 34, 27); // underwater, beneath the shelf
  smileys(spawns, 48, 58, 24);
  // a trail of smileys up the climb wall
  for (let row = 24; row >= 9; row -= 3) spawns.push({ t: 'smiley', x: 59, row });
  smileys(spawns, 64, 96, 5);
  smileys(spawns, 104, 112, 1);

  return {
    key: 'falls', theme: 'falls', g, spawns, grav: 1,
    start: { x: 16, y: 380 },
    tag: 'BITE THE MARKED WALLS. GNAW UP.',
  };
}

// ---------------- ROUND 3: LAVA CRATER ----------------

function buildLava() {
  const g = makeGrid(190, 14);
  const { ground, plat, lavaPool } = helpers(g);

  ground(0, 29, 11);
  lavaPool(30, 37, 12);
  plat(33, 34, 8);
  ground(38, 69, 11);
  lavaPool(70, 79, 12);
  plat(74, 75, 7);
  ground(80, 109, 11);
  lavaPool(110, 116, 12);
  ground(117, 152, 11);
  lavaPool(153, 155, 12);
  ground(156, 189, 11);
  plat(50, 53, 7);
  plat(96, 99, 7);
  plat(126, 129, 8);
  plat(134, 137, 6);

  const spawns = [
    { t: 'dino', x: 12, row: 11 },
    { t: 'spiky', x: 20, row: 11 },
    { t: 'geyser', x: 33, row: 12 },
    { t: 'spiky', x: 44, row: 11 },
    { t: 'dino', x: 50, row: 11 },
    { t: 'meat1', x: 52, row: 7 },
    { t: 'spiky', x: 60, row: 11 },
    { t: 'frog', x: 65, row: 11 },
    { t: 'geyser', x: 72, row: 12 },
    { t: 'geyser', x: 76, row: 12 },
    { t: 'door', x: 88, row: 11, room: 'tower' },
    { t: 'spiky', x: 94, row: 11 },
    { t: 'cactus', x: 100, row: 11 },
    { t: 'frog', x: 105, row: 11 },
    { t: 'geyser', x: 113, row: 12 },
    { t: 'dino', x: 122, row: 11 },
    { t: 'spiky', x: 130, row: 11 },
    { t: 'shell', x: 136, row: 11 },
    { t: 'cactus', x: 144, row: 11 },
    { t: 'heart', x: 149, row: 11 },
    { t: 'geyser', x: 154, row: 12 },
    { t: 'meat2', x: 160, row: 11 },
    { t: 'grub', x: 170, row: 11 },
    { t: 'goal', x: 185, row: 11 },
  ];
  smileys(spawns, 6, 16, 9);
  smileys(spawns, 31, 36, 6);
  smileys(spawns, 40, 48, 9);
  smileys(spawns, 71, 78, 5);
  smileys(spawns, 82, 92, 9);
  smileys(spawns, 111, 115, 7);
  smileys(spawns, 118, 128, 9);
  smileys(spawns, 134, 137, 4);
  smileys(spawns, 157, 165, 9);

  return {
    key: 'lava', theme: 'lava', g, spawns, grav: 1,
    start: { x: 24, y: 140 },
    tag: 'GEYSERS BOOST. SPIKES NEED SHOCKWAVES.',
  };
}

// ---------------- ROUND 4: ICE PLATEAU ----------------

function buildIce() {
  const g = makeGrid(190, 14);
  const { ground, plat } = helpers(g);

  ground(0, 39, 11, T.ICE);
  plat(41, 43, 9);
  ground(45, 79, 11, T.ICE);
  plat(50, 53, 7);
  plat(58, 61, 5);
  plat(68, 72, 5);
  ground(85, 119, 11, T.ICE);
  plat(81, 82, 9);
  ground(126, 159, 11, T.ICE);
  plat(121, 124, 8);
  ground(164, 189, 11, T.ICE);
  plat(146, 149, 7);

  const spawns = [
    { t: 'penguin', x: 15, row: 11 },
    { t: 'dino', x: 22, row: 11 },
    { t: 'penguin', x: 30, row: 11 },
    { t: 'shell', x: 52, row: 11 },
    { t: 'shell', x: 57, row: 11 },
    { t: 'ptero', x: 62, row: 3 },
    { t: 'spring', x: 66, row: 11 },
    { t: 'heartcont', x: 70, row: 5 },
    { t: 'meat1', x: 60, row: 5 },
    { t: 'penguin', x: 75, row: 11 },
    { t: 'penguin', x: 92, row: 11 },
    { t: 'frog', x: 100, row: 11 },
    { t: 'penguin', x: 108, row: 11 },
    { t: 'spring', x: 117, row: 11 },
    { t: 'cactus', x: 132, row: 11 },
    { t: 'penguin', x: 138, row: 11 },
    { t: 'fruit', x: 148, row: 7 },
    { t: 'meat2', x: 152, row: 11 },
    { t: 'frog', x: 156, row: 11 },
    { t: 'heart', x: 168, row: 11 },
    { t: 'penguin', x: 172, row: 11 },
    { t: 'shell', x: 178, row: 11 },
    { t: 'goal', x: 184, row: 11 },
  ];
  smileys(spawns, 6, 14, 9);
  smileys(spawns, 41, 43, 7);
  smileys(spawns, 50, 53, 5);
  smileys(spawns, 58, 61, 3);
  smileys(spawns, 81, 82, 7);
  smileys(spawns, 88, 98, 9);
  smileys(spawns, 121, 124, 6);
  smileys(spawns, 128, 140, 9);
  smileys(spawns, 146, 149, 5);
  smileys(spawns, 166, 180, 9);

  return {
    key: 'ice', theme: 'ice', g, spawns, grav: 1,
    start: { x: 24, y: 140 },
    tag: 'SLIPPERY! SPIN-GLIDE THE GAPS.',
  };
}

// ---------------- ROUND 5: MOON PALACE ----------------

function buildMoon() {
  const g = makeGrid(160, 14);
  const { ground, plat, wall } = helpers(g);

  ground(0, 29, 11);
  plat(33, 35, 8);
  ground(39, 59, 11);
  plat(44, 46, 7);
  plat(50, 52, 4);
  plat(63, 64, 9);
  plat(67, 68, 6);
  ground(70, 99, 11);
  plat(76, 78, 6);
  plat(84, 86, 4);
  plat(103, 104, 7);
  ground(108, 159, 11);
  plat(112, 114, 6);
  wall(158, 159);

  const spawns = [
    { t: 'dino', x: 12, row: 11 },
    { t: 'ptero', x: 20, row: 3 },
    { t: 'shell', x: 24, row: 11 },
    { t: 'frog', x: 44, row: 11 },
    { t: 'meat1', x: 51, row: 4 },
    { t: 'spiky', x: 55, row: 11 },
    { t: 'dino', x: 74, row: 11 },
    { t: 'shell', x: 80, row: 11 },
    { t: 'shell', x: 85, row: 11 },
    { t: 'ptero', x: 90, row: 3 },
    { t: 'cactus', x: 94, row: 11 },
    { t: 'heart', x: 110, row: 11 },
    { t: 'meat2', x: 113, row: 6 },
    { t: 'frog', x: 118, row: 11 },
    { t: 'spiky', x: 124, row: 11 },
    { t: 'king', x: 146, row: 11 },
  ];
  smileys(spawns, 6, 16, 9);
  smileys(spawns, 33, 35, 6);
  smileys(spawns, 44, 46, 5);
  smileys(spawns, 50, 52, 2);
  smileys(spawns, 63, 68, 4);
  smileys(spawns, 72, 82, 9);
  smileys(spawns, 84, 86, 2);
  smileys(spawns, 103, 104, 5);
  smileys(spawns, 109, 121, 9);

  return {
    key: 'moon', theme: 'moon', g, spawns, grav: 0.5,
    start: { x: 24, y: 140 }, bossX: 132,
    tag: 'LOW GRAVITY. DIVE ON HIS CROWN!',
  };
}

export const ROUNDS = [buildGrass(), buildFalls(), buildLava(), buildIce(), buildMoon()];

// ---------------- BONUS ROOMS (flower doors) ----------------

export function buildBonus(kind) {
  if (kind === 'clouds') {
    // "bounce on clouds, collect smileys"
    const g = makeGrid(16, 14);
    const { ground, wall } = helpers(g);
    ground(0, 15, 12);
    wall(0, 0); wall(15, 15);
    const spawns = [
      { t: 'spring', x: 3, row: 12 },
      { t: 'spring', x: 8, row: 12 },
      { t: 'spring', x: 12, row: 12 },
    ];
    for (let x = 2; x <= 13; x += 2) {
      spawns.push({ t: 'smiley', x, row: 3 });
      spawns.push({ t: 'smiley', x: x + 1, row: 6 });
      spawns.push({ t: 'smiley', x, row: 9 });
    }
    spawns.push({ t: 'fruit', x: 7, row: 2 });
    return {
      key: 'bonus', theme: 'bonus', g, spawns, grav: 1,
      start: { x: 88, y: 150 }, time: 720, title: 'CLOUD BOUNCE! GRAB SMILEYS!',
    };
  }
  // "climb the tower of smileys before time"
  const g = makeGrid(16, 30);
  const { ground, block, bite, wall } = helpers(g);
  ground(0, 15, 27);
  wall(0, 0); wall(15, 15);
  block(9, 15, 5, 29);
  bite(9, 6, 25);
  const spawns = [{ t: 'meat1', x: 12, row: 5 }, { t: 'fruit', x: 14, row: 5 }];
  for (let row = 25; row >= 6; row -= 2) spawns.push({ t: 'smiley', x: 7, row });
  for (let x = 10; x <= 14; x++) spawns.push({ t: 'smiley', x, row: 4 });
  smileys(spawns, 2, 6, 25);
  return {
    key: 'bonus', theme: 'bonus', g, spawns, grav: 1,
    start: { x: 40, y: 27 * 16 - 30 }, time: 780, title: 'CLIMB THE SMILEY TOWER!',
  };
}
