// Stage layouts for Moore Icarus. Grids are built with terrain helpers.
// Tiles: 0 empty, 1 solid, 2 jump-through platform, 3 hot spring (heals),
// 4 locked door (needs a key), 5 spikes (hazard).
// Every world = climb -> horizontal -> fortress maze -> boss.

export const TILE = 16;
export const T = { EMPTY: 0, SOLID: 1, PLAT: 2, SPRING: 3, LOCK: 4, SPIKE: 5 };

const WORLD_THEME = ['underworld', 'overworld', 'sky'];
const WORLD_BOSS = ['pluton', 'gyrapace', 'moordusa'];

function makeGrid(w, h) { return { w, h, d: new Uint8Array(w * h) }; }
function set(g, x, y, v) { if (x >= 0 && x < g.w && y >= 0 && y < g.h) g.d[y * g.w + x] = v; }
export function tileAt(g, tx, ty) {
  if (tx < 0 || tx >= g.w || ty < 0 || ty >= g.h) return 0;
  return g.d[ty * g.w + tx];
}
export function setTile(g, tx, ty, v) { set(g, tx, ty, v); }

function helpers(g) {
  return {
    block: (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(g, x, y, T.SOLID); },
    ground: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) for (let y = ty; y < g.h; y++) set(g, x, y, T.SOLID); },
    plat: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) set(g, x, ty, T.PLAT); },
    spring: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) set(g, x, ty, T.SPRING); },
    spike: (x0, x1, ty) => { for (let x = x0; x <= x1; x++) set(g, x, ty, T.SPIKE); },
    lock: (x, y0, y1) => { for (let y = y0; y <= y1; y++) set(g, x, y, T.LOCK); },
    wallcol: (x) => { for (let y = 0; y < g.h; y++) set(g, x, y, T.SOLID); },
  };
}

const px = (t) => t * TILE;

// ==================== VERTICAL CLIMB ====================
function buildClimb(world) {
  const W = 16, H = 60;
  const g = makeGrid(W, H);
  const h = helpers(g);
  h.wallcol(0); h.wallcol(W - 1);          // side walls (screen-width playfield)
  h.block(1, W - 2, H - 2, H - 1);         // starting floor

  const spawns = [], pots = [], doors = [], hearts = [];
  const roster = [
    ['shemum', 'monoeye', 'specknose', 'keepah'],
    ['monoeye', 'specknose', 'girin', 'keepah'],
    ['monoeye', 'specknose', 'nettler', 'keepah'],
  ][world];

  // guaranteed staircase upward: 3-tile vertical gaps, alternating sides
  let row = H - 5, side = 0, step = 0;
  const tops = [];
  while (row > 4) {
    const x0 = side ? 8 : 2;
    const x1 = x0 + 4;
    h.plat(x0, x1, row);
    tops.push({ x0, x1, row });
    // enemies / pots on some steps
    if (step % 3 === 1) spawns.push({ t: roster[step % roster.length], tx: x0 + 2, ty: row - 1 });
    if (step % 4 === 2) pots.push({ tx: x0 + 1, ty: row - 1, amt: 5 });
    if (step === 6) h.spring(x0, x1, row);   // a hot spring rest ledge mid-climb
    side ^= 1; row -= 3; step++;
  }
  // top exit ledge + door
  const topLedge = tops[tops.length - 1];
  h.block(1, W - 2, topLedge.row - 3, topLedge.row - 3);
  doors.push({ kind: 'exit', tx: 7, ty: topLedge.row - 4 });
  // a few flyers streaming through the shaft
  spawns.push({ t: 'monoeye', tx: 5, ty: H - 20 });
  spawns.push({ t: 'specknose', tx: 10, ty: H - 34 });

  return {
    key: 'climb', world, theme: WORLD_THEME[world], type: 'climb', vertical: true,
    g, start: { x: px(7), y: px(H - 4) }, spawns, pots, doors, hearts, chests: [], keys: [],
    boss: null,
  };
}

// ==================== HORIZONTAL STRETCH ====================
function buildHoriz(world) {
  const W = 100, H = 15;
  const g = makeGrid(W, H);
  const h = helpers(g);
  const roster = [
    ['nettler', 'shemum', 'girin', 'keepah', 'tamambo'],
    ['nettler', 'girin', 'tamambo', 'specknose', 'keepah'],
    ['nettler', 'girin', 'tamambo', 'specknose', 'monoeye'],
  ][world];

  const spawns = [], pots = [], doors = [], hearts = [];
  // rolling ground with a couple of jumpable pits (fall = death)
  h.ground(0, 14, 11);
  h.plat(4, 7, 8); h.plat(10, 12, 6);
  spawns.push({ t: roster[0], tx: 8, ty: 10 });
  pots.push({ tx: 6, ty: 7, amt: 5 });

  h.ground(15, 24, 9); h.plat(18, 20, 6);
  spawns.push({ t: roster[1], tx: 20, ty: 8 });
  // pit 25-27 (3 wide, jumpable)
  h.ground(28, 40, 11); h.spring(30, 32, 11);
  spawns.push({ t: roster[2], tx: 36, ty: 10 });
  doors.push({ kind: 'shop', tx: 38, ty: 10 });      // a merchant tent

  h.ground(41, 52, 9); h.plat(44, 47, 6);
  spawns.push({ t: roster[3], tx: 48, ty: 8 });
  // pit 53-55
  h.ground(56, 70, 11); h.plat(60, 63, 7);
  spawns.push({ t: roster[0], tx: 64, ty: 10 });
  spawns.push({ t: roster[4], tx: 67, ty: 5 });
  pots.push({ tx: 58, ty: 10, amt: 5 });

  h.ground(71, 82, 8); h.plat(74, 77, 5);
  spawns.push({ t: roster[1], tx: 78, ty: 7 });
  // pit 83-85
  h.ground(86, 99, 11);
  spawns.push({ t: roster[2], tx: 90, ty: 10 });
  doors.push({ kind: 'exit', tx: 96, ty: 10 });

  return {
    key: 'horiz', world, theme: WORLD_THEME[world], type: 'horiz', vertical: false,
    g, start: { x: px(2), y: px(9) }, spawns, pots, doors, hearts, chests: [], keys: [],
    boss: null,
  };
}

// ==================== FORTRESS MAZE ====================
function buildFortress(world) {
  const W = 48, H = 20;
  const g = makeGrid(W, H);
  const h = helpers(g);
  // outer shell
  h.block(0, W - 1, 0, 0); h.block(0, W - 1, H - 1, H - 1);
  h.wallcol(0); h.wallcol(W - 1);

  const spawns = [], pots = [], doors = [], hearts = [], chests = [], keys = [];

  // ---- entry hall (left) ----
  h.block(1, 12, 15, H - 2);                 // floor
  h.plat(4, 7, 11); h.plat(9, 11, 8);        // climb to key ledge
  keys.push({ tx: 10, ty: 7 });              // the key sits up high
  spawns.push({ t: 'shemum', tx: 6, ty: 14 });
  spawns.push({ t: 'monoeye', tx: 8, ty: 6 });
  doors.push({ kind: 'nurse', tx: 2, ty: 14 });   // cure room by the entrance
  pots.push({ tx: 3, ty: 14, amt: 5 });

  // ---- side vault with chests (a trap + a treasure) ----
  h.block(1, 12, 3, 3);                        // ceiling ledge for vault
  h.plat(2, 6, 5);
  chests.push({ tx: 3, ty: 4, trap: true });   // TRAP: Eggplant Wizard!
  chests.push({ tx: 10, ty: 14, trap: false, amt: 20 }); // treasure hearts

  // ---- locked gate to the inner keep ----
  h.block(13, 13, 1, 14);                      // wall with a gap
  h.block(13, 13, 15, H - 2);                  // continuous floor under the doorway
  set(g, 13, 14, T.EMPTY);                     // doorway at floor
  h.lock(13, 12, 14);                          // locked door blocks the gap

  // ---- corridor + shaft up to the reaper ----
  h.block(14, 30, 15, H - 2);
  h.plat(16, 19, 11); h.plat(22, 25, 8); h.plat(26, 29, 12);
  spawns.push({ t: 'nettler', tx: 20, ty: 14 });
  spawns.push({ t: 'girin', tx: 24, ty: 7 });
  h.spring(28, 30, 15);
  doors.push({ kind: 'shop', tx: 18, ty: 14 });
  pots.push({ tx: 27, ty: 11, amt: 5 });

  // ---- reaper chamber ----
  h.block(31, 46, 15, H - 2);
  h.block(31, 31, 1, 14);                      // chamber entrance wall w/ gap
  set(g, 31, 14, T.EMPTY);
  spawns.push({ t: 'reaper', tx: 40, ty: 13 });  // the Reaper-Moore
  // exit door far right (reachable once reaper is down; guarded by nothing else)
  doors.push({ kind: 'exit', tx: 45, ty: 14, needBoss: true });

  return {
    key: 'fortress', world, theme: 'fortress', type: 'fortress', vertical: false,
    g, start: { x: px(3), y: px(13) }, spawns, pots, doors, hearts, chests, keys,
    boss: null, miniboss: true,
  };
}

// ==================== WORLD BOSS ARENA ====================
function buildBoss(world) {
  const W = 16, H = 15;
  const g = makeGrid(W, H);
  const h = helpers(g);
  h.wallcol(0); h.wallcol(W - 1);
  h.block(1, W - 2, 13, H - 1);
  h.plat(2, 4, 9); h.plat(11, 13, 9);        // side ledges
  h.plat(6, 9, 6);
  return {
    key: 'boss', world, theme: WORLD_THEME[world], type: 'boss', vertical: false,
    g, start: { x: px(7), y: px(11) }, spawns: [], pots: [], doors: [], hearts: [], chests: [], keys: [],
    boss: WORLD_BOSS[world],
  };
}

// ==================== ASSEMBLE 3 WORLDS ====================
export const STAGES = [];
export const WORLD_INTRO = [
  {
    name: 'THE UNDERWORLD',
    lines: ['The goddess Moora is captured,', 'the sacred bow stolen.', 'Pit-Moore spreads his wings and', 'climbs out of the pit of dread.'],
  },
  {
    name: 'THE OVERWORLD',
    lines: ['Free of the Underworld, Pit-Moore', 'soars the cloud kingdoms,', 'past sky fortresses and their', 'winged sentinels.'],
  },
  {
    name: 'THE SKY TEMPLE',
    lines: ['The final ascent. Beyond the', 'gates coils Moordusa, gaze of', 'stone. Rescue Moora and restore', 'the light of the sky!'],
  },
];

for (let w = 0; w < 3; w++) {
  STAGES.push(buildClimb(w));
  STAGES.push(buildHoriz(w));
  STAGES.push(buildFortress(w));
  STAGES.push(buildBoss(w));
}

// sacred treasure granted after each world boss
export const SACRED = [
  { name: 'THE ARROW OF LIGHT', desc: 'Arrows fly farther and faster!', apply: (up) => { up.range++; up.speed++; } },
  { name: 'THE SACRED BOW', desc: 'You now loose THREE arrows!', apply: (up) => { up.triple = true; } },
  { name: 'THE WINGS OF PEGASUS', desc: 'Arrows strike with holy force!', apply: (up) => { up.big = true; up.range++; } },
];

export const ENDING = [
  'The gaze of Moordusa shatters.',
  'Light floods the Sky Temple.',
  'Pit-Moore lifts the goddess Moora',
  'on his shining wings, and the',
  'three worlds wake to a new dawn.',
  '',
  'MOORE ICARUS — FIN',
];
