// Planet Zemoor: rooms, items, story.
//
// Tile legend:
//   .  empty          #  solid rock      %  solid organic (visual alt)
//   *  bombable       ^  spikes (hurt)   ~  lava (hurt, not solid)
//   |  door frame     D  blue door       R  red door (missile)
//   E  elevator pad   X  hive gate (opens when both titans fall)
//
// Rooms are authored as interior rows (width w-2); the loader wraps them in
// wall columns and carves doors from the `exits` list, so a door and its
// exit can never disagree.

export const TILE = 16;

const F = (n) => '#'.repeat(n);
const pad = (row, w) => (row + '.'.repeat(w)).slice(0, w);

export const SOLID = new Set(['#', '%', '*', 'X', 'E', '|']);

export const ROOMS = {};

function room(id, opts) {
  const {
    theme, music, w, h, rows,
    exits = [], items = [], spawns = [], elevators = [],
    boss = null, gate = null, statues = null, zebs = [], rinkaSpawners = [],
    ship = null, sky = false,
  } = opts;
  const iw = w - 2;
  const grid = [];
  for (let y = 0; y < h; y++) {
    grid.push('#' + pad(rows[y] || '', iw) + '#');
  }
  for (const e of exits) {
    const x = e.side === 'left' ? 0 : w - 1;
    const set = (y, ch) => { grid[y] = grid[y].slice(0, x) + ch + grid[y].slice(x + 1); };
    set(e.y - 1, '|');
    for (let dy = 0; dy < 3; dy++) set(e.y + dy, e.red ? 'R' : 'D');
  }
  ROOMS[id] = {
    id, theme, music, w, h, map: grid, exits, items, spawns, elevators,
    boss, gate, statues, zebs, rinkaSpawners, ship, sky,
  };
}

// Vertical shaft interiors (16 wide -> 14 interior). Ledges: L/C/R.
const LEDGE = { L: '######', C: '....######', R: '........######' };
function shaft(h, plats, extra = {}) {
  const rows = Array(h).fill('');
  rows[0] = F(14); rows[1] = F(14);
  rows[h - 1] = F(14); rows[h - 2] = F(14);
  for (const [y, p] of plats) rows[y] = LEDGE[p] || p;
  for (const [y, s] of Object.entries(extra)) rows[y] = s;
  return rows;
}

// Corridor interiors: solid top 2 and bottom 3 rows, features overlaid.
function corridor(iw, feats = {}, floor = null) {
  const rows = Array(15).fill('');
  rows[0] = F(iw); rows[1] = F(iw);
  rows[12] = floor ? floor[0] : F(iw);
  rows[13] = floor ? floor[1] : F(iw);
  rows[14] = floor ? floor[2] : F(iw);
  for (const [y, s] of Object.entries(feats)) rows[y] = s;
  return rows;
}

// ============================ BLUE CAVERNS ============================

room('b_start', {
  theme: 'brinstar', music: 'cavern', w: 48, h: 15,
  rows: corridor(46, {
    10: '.....##......%%%%....##.....%%%%',
    11: '.....##......%%%%....##.....%%%%',
  }),
  exits: [{ side: 'right', y: 9, to: 'b_shaft1' }],
  items: [{ id: 'morph', kind: 'morph', tx: 3, ty: 11 }],
  spawns: [['zoomer', 33, 11], ['zoomer', 12, 9]],
});

room('b_shaft1', {
  theme: 'brinstar', music: 'cavern', w: 16, h: 45,
  rows: shaft(45, [
    [6, 'L'], [9, 'C'], [12, 'R'], [15, 'C'], [18, 'L'], [21, 'C'],
    [24, 'R'], [27, 'C'], [30, 'L'], [33, 'C'], [36, 'R'], [39, 'C'],
  ]),
  exits: [
    { side: 'left', y: 3, to: 'b_start' },
    { side: 'right', y: 9, to: 'b_long' },
    { side: 'left', y: 15, to: 'c_entry', red: true },
    { side: 'right', y: 21, to: 'b_missile' },
    { side: 'left', y: 27, to: 'b_tank', red: true },
    { side: 'left', y: 40, to: 'b_low' },
    { side: 'right', y: 40, to: 'b_bomb', red: true },
  ],
  spawns: [['waver', 7, 13], ['ripper', 7, 32]],
});

room('b_long', {
  theme: 'brinstar', music: 'cavern', w: 32, h: 15,
  rows: corridor(30, {
    8: '........####......####',
    11: '..........................%%',
  }),
  exits: [{ side: 'left', y: 9, to: 'b_shaft1' }],
  items: [{ id: 'long', kind: 'long', tx: 28, ty: 10 }],
  spawns: [['waver', 12, 5], ['waver', 22, 6], ['skree', 16, 2]],
});

room('b_missile', {
  theme: 'brinstar', music: 'cavern', w: 48, h: 15,
  rows: (() => {
    const wall = '.............%%%%%%%%%';
    const feats = { 11: '........................................%%' };
    for (let y = 2; y <= 10; y++) feats[y] = wall;
    return corridor(46, feats);
  })(),
  exits: [{ side: 'left', y: 9, to: 'b_shaft1' }],
  items: [{ id: 'm1', kind: 'mpack', tx: 41, ty: 10 }],
  spawns: [['zoomer', 30, 11], ['zoomer', 36, 9], ['skree', 26, 2]],
});

room('b_tank', {
  theme: 'brinstar', music: 'cavern', w: 16, h: 15,
  rows: corridor(14, { 11: '..%%' }),
  exits: [{ side: 'right', y: 9, to: 'b_shaft1', red: true }],
  items: [{ id: 'etank1', kind: 'etank', tx: 3, ty: 10 }],
  spawns: [['hopper', 8, 11]],
});

room('b_bomb', {
  theme: 'brinstar', music: 'cavern', w: 24, h: 15,
  rows: corridor(22, { 11: '................%%' }),
  exits: [{ side: 'left', y: 9, to: 'b_shaft1', red: true }],
  items: [{ id: 'bombs', kind: 'bombs', tx: 17, ty: 10 }],
  spawns: [['skree', 10, 2]],
});

room('b_low', {
  theme: 'brinstar', music: 'cavern', w: 64, h: 15,
  rows: (() => {
    const feats = {
      2: '......%%..............................%%%%',
      9: '.........................**',
      10: '.........................**',
      11: '.........................**',
    };
    const f12 = F(13) + 'EEEE' + F(24) + 'EEEE' + F(17);
    return corridor(62, feats, [f12, F(62), F(62)]);
  })(),
  exits: [
    { side: 'right', y: 9, to: 'b_shaft1' },
    { side: 'left', y: 9, to: 'b_gate' },
  ],
  items: [{ id: 'm2', kind: 'mpack', tx: 22, ty: 11 }],
  spawns: [['rio', 34, 5], ['rio', 52, 6], ['zoomer', 56, 11], ['zoomer', 8, 9]],
  elevators: [
    { tx: 42, tw: 4, ty: 12, to: 'n_shaft' },
    { tx: 14, tw: 4, ty: 12, to: 'k_shaft' },
  ],
});

room('b_gate', {
  theme: 'brinstar', music: 'cavern', w: 32, h: 15,
  rows: (() => {
    const feats = {};
    for (let y = 2; y <= 11; y++) feats[y] = '.'.repeat(13) + 'X';
    const f12 = F(3) + 'EEEE' + F(23);
    return corridor(30, feats, [f12, F(30), F(30)]);
  })(),
  exits: [{ side: 'right', y: 9, to: 'b_low' }],
  statues: [{ tx: 19, boss: 'boss_gorluk' }, { tx: 23, boss: 'boss_skyrax' }],
  gate: { tx: 14, y0: 2, y1: 11 },
  elevators: [{ tx: 4, tw: 4, ty: 12, to: 't_shaft' }],
});

// ============================ THE CRYSTAL HOLLOWS ============================
// Optional late-game area west of the great shaft, behind a red door.
// Holds the Screw Attack, a fifth Energy Tank, and two missile packs.

room('c_entry', {
  theme: 'crystal', music: 'crystal', w: 32, h: 15,
  rows: (() => {
    const feats = {
      10: '.............%%....%%',
      11: '.............%%....%%',
    };
    const f12 = F(4) + 'EEEE' + F(22);
    return corridor(30, feats, [f12, F(30), F(30)]);
  })(),
  exits: [{ side: 'right', y: 9, to: 'b_shaft1', red: true }],
  spawns: [['hopper', 17, 11], ['waver', 24, 6]],
  elevators: [{ tx: 5, tw: 4, ty: 12, to: 'c_shaft' }],
});

room('c_shaft', {
  theme: 'crystal', music: 'crystal', w: 16, h: 45,
  rows: shaft(45, [
    [6, '#####EEEE'], [9, 'C'], [12, 'R'], [15, 'C'], [18, 'L'], [21, 'C'],
    [24, 'R'], [27, 'C'], [30, 'L'], [33, 'C'], [36, 'R'], [39, 'C'],
  ]),
  exits: [
    { side: 'right', y: 9, to: 'c_gallery' },
    { side: 'left', y: 15, to: 'c_maze', red: true },
    { side: 'right', y: 33, to: 'c_deep' },
  ],
  spawns: [['ripper', 7, 23], ['waver', 7, 31]],
  elevators: [{ tx: 6, tw: 4, ty: 6, to: 'c_entry' }],
});

room('c_gallery', {
  theme: 'crystal', music: 'crystal', w: 48, h: 15,
  rows: (() => {
    const feats = {
      8: '......####..........####',
      9: '.'.repeat(40) + '**',
      10: '......%%............%%..............%%..**',
      11: '......%%............%%..............%%..**',
    };
    return corridor(46, feats);
  })(),
  exits: [{ side: 'left', y: 9, to: 'c_shaft' }],
  items: [{ id: 'm8', kind: 'mpack', tx: 44, ty: 11 }],
  spawns: [['skree', 14, 2], ['skree', 30, 2], ['zoomer', 26, 11], ['zoomer', 34, 9]],
});

room('c_maze', {
  theme: 'crystal', music: 'crystal', w: 32, h: 15,
  rows: (() => {
    const wall = '.........%%%%%%%%%%%%%%%%%';
    const feats = { 11: '...%%' };
    for (let y = 2; y <= 10; y++) feats[y] = wall;
    return corridor(30, feats);
  })(),
  exits: [{ side: 'right', y: 9, to: 'c_shaft', red: true }],
  items: [{ id: 'etank5', kind: 'etank', tx: 4, ty: 10 }],
  spawns: [['hopper', 7, 11]],
});

room('c_deep', {
  theme: 'crystal', music: 'crystal', w: 48, h: 15,
  rows: corridor(46, {
    5: '......................#####',
    9: '.................####.........####',
    11: '.................^^^^.........^^^^......%%',
  }),
  exits: [{ side: 'left', y: 9, to: 'c_shaft' }],
  items: [
    { id: 'screw', kind: 'screw', tx: 42, ty: 10 },
    { id: 'm9', kind: 'mpack', tx: 25, ty: 4 },
  ],
  spawns: [['hopper', 12, 11], ['rio', 22, 3], ['rio', 34, 4]],
});

// ============================ THE MOLTEN VEIN ============================

room('n_shaft', {
  theme: 'norfair', music: 'depths', w: 16, h: 45,
  rows: shaft(45, [
    [6, '#####EEEE'], [9, 'C'], [12, 'R'], [15, 'C'], [18, 'L'], [21, 'C'],
    [24, 'R'], [27, 'C'], [30, 'L'], [33, 'C'], [36, 'R'], [39, 'C'],
  ]),
  exits: [
    { side: 'right', y: 9, to: 'n_hijump' },
    { side: 'left', y: 15, to: 'n_ice', red: true },
    { side: 'right', y: 21, to: 'n_lava' },
    { side: 'left', y: 40, to: 'n_deep' },
  ],
  spawns: [['waver', 7, 19], ['ripper', 7, 32]],
  elevators: [{ tx: 6, tw: 4, ty: 6, to: 'b_low' }],
});

room('n_hijump', {
  theme: 'norfair', music: 'depths', w: 48, h: 15,
  rows: (() => {
    const feats = {
      10: '.........###.........###',
      11: '...........................................%%',
    };
    for (let y = 2; y <= 10; y++) {
      feats[y] = (feats[y] || pad('', 33)) .slice(0, 33) + '%%%%%%%';
    }
    const f = F(7) + '~'.repeat(7) + F(5) + '~'.repeat(7) + F(20);
    return corridor(46, feats, [f, f, f]);
  })(),
  exits: [{ side: 'left', y: 9, to: 'n_shaft' }],
  items: [{ id: 'hijump', kind: 'hijump', tx: 44, ty: 10 }],
  spawns: [['squeept', 10, 13], ['squeept', 22, 13], ['rio', 28, 4]],
});

room('n_ice', {
  theme: 'norfair', music: 'depths', w: 32, h: 15,
  rows: corridor(30, {
    8: '.......####......####',
    11: '...%%',
  }),
  exits: [{ side: 'right', y: 9, to: 'n_shaft', red: true }],
  items: [{ id: 'ice', kind: 'ice', tx: 4, ty: 10 }],
  spawns: [['ripper', 12, 6], ['ripper', 22, 10]],
});

room('n_lava', {
  theme: 'norfair', music: 'depths', w: 64, h: 15,
  rows: (() => {
    const feats = {
      7: '.'.repeat(44) + '#########',
      10: '.'.repeat(9) + '###' + '.'.repeat(11) + '###' + '.'.repeat(12) + '###',
    };
    for (let y = 3; y <= 6; y++) feats[y] = '.'.repeat(50) + '*';
    const f = F(6) + '~'.repeat(10) + F(4) + '~'.repeat(10) + F(6) + '~'.repeat(8) + F(18);
    return corridor(62, feats, [f, f, f]);
  })(),
  exits: [{ side: 'left', y: 9, to: 'n_shaft' }],
  items: [
    { id: 'm3', kind: 'mpack', tx: 33, ty: 11 },
    { id: 'varia', kind: 'varia', tx: 47, ty: 6 },
    { id: 'etank2', kind: 'etank', tx: 49, ty: 6 },
    { id: 'm4', kind: 'mpack', tx: 60, ty: 11 },
  ],
  spawns: [
    ['squeept', 10, 13], ['squeept', 24, 13], ['squeept', 39, 13],
    ['rio', 20, 4], ['rio', 36, 5],
  ],
});

room('n_deep', {
  theme: 'norfair', music: 'depths', w: 48, h: 15,
  rows: (() => {
    const feats = {
      10: '.'.repeat(11) + '###' + '.'.repeat(13) + '###',
    };
    const f12 = F(2) + 'EEEE' + F(2) + '~'.repeat(10) + F(6) + '~'.repeat(10) + F(12);
    const f = F(8) + '~'.repeat(10) + F(6) + '~'.repeat(10) + F(12);
    return corridor(46, feats, [f12, f, f]);
  })(),
  exits: [
    { side: 'right', y: 9, to: 'n_shaft' },
    { side: 'left', y: 9, to: 'w_entry' },
  ],
  spawns: [['squeept', 13, 13], ['squeept', 28, 13], ['waver', 20, 6], ['waver', 38, 7]],
  elevators: [{ tx: 3, tw: 4, ty: 12, to: 'r_shaft' }],
});

// ============================ THE SUNKEN WRECK ============================
// A colony ship swallowed by the planet, entered from the deep lava run.
// Holds the Wave Beam, a sixth Energy Tank, and a missile pack.

room('w_entry', {
  theme: 'wreck', music: 'wreck', w: 48, h: 15,
  rows: corridor(46, {
    8: '..........%%%%............%%%%',
    10: '......%%......%%%%......%%......%%%%',
    11: '......%%......%%%%......%%......%%%%',
  }),
  exits: [
    { side: 'right', y: 9, to: 'n_deep' },
    { side: 'left', y: 9, to: 'w_shaft' },
  ],
  spawns: [['ripper', 14, 6], ['ripper', 30, 4], ['skree', 22, 2]],
});

room('w_shaft', {
  theme: 'wreck', music: 'wreck', w: 16, h: 30,
  rows: shaft(30, [
    [12, 'R'], [15, 'C'], [18, 'R'], [21, 'C'], [24, 'R'],
  ], { 27: F(14) }),
  exits: [
    { side: 'right', y: 9, to: 'w_entry' },
    { side: 'left', y: 24, to: 'w_hold' },
  ],
  spawns: [['waver', 7, 20]],
});

room('w_hold', {
  theme: 'wreck', music: 'wreck', w: 48, h: 15,
  rows: corridor(46, {
    5: '..............................#####',
    9: '......................**............####',
    10: '......................**',
    11: '......................**',
  }),
  exits: [
    { side: 'right', y: 9, to: 'w_shaft' },
    { side: 'left', y: 9, to: 'w_core', red: true },
  ],
  items: [{ id: 'etank6', kind: 'etank', tx: 32, ty: 4 }],
  spawns: [['hopper', 12, 11], ['hopper', 34, 11], ['zoomer', 28, 11]],
});

room('w_core', {
  theme: 'wreck', music: 'wreck', w: 24, h: 15,
  rows: corridor(22, {
    11: '...%%...^^^',
  }),
  exits: [{ side: 'right', y: 9, to: 'w_hold', red: true }],
  items: [
    { id: 'wave', kind: 'wave', tx: 4, ty: 10 },
    { id: 'm10', kind: 'mpack', tx: 7, ty: 11 },
  ],
  spawns: [['skree', 14, 2], ['waver', 16, 7]],
});

// ============================ GORLUK'S DEN ============================

room('k_shaft', {
  theme: 'kraid', music: 'lair', w: 16, h: 30,
  rows: shaft(30, [
    [6, '#####EEEE'], [9, 'R'], [12, 'C'], [15, 'R'], [18, 'C'], [21, 'R'], [24, 'C'],
  ], { 27: F(14) }),
  exits: [{ side: 'left', y: 24, to: 'k_hall' }],
  spawns: [['zoomer', 8, 26]],
  elevators: [{ tx: 6, tw: 4, ty: 6, to: 'b_low' }],
});

room('k_hall', {
  theme: 'kraid', music: 'lair', w: 48, h: 15,
  rows: corridor(46, {
    9: '.'.repeat(20) + '####',
    11: '.'.repeat(19) + '^^^^^^',
  }),
  exits: [
    { side: 'right', y: 9, to: 'k_shaft' },
    { side: 'left', y: 9, to: 'k_boss' },
  ],
  spawns: [['hopper', 12, 11], ['hopper', 32, 11], ['zoomer', 40, 11]],
});

room('k_boss', {
  theme: 'kraid', music: 'lair', w: 24, h: 15,
  rows: corridor(22, { 2: '%%%%..%%%%%%..%%%%' }),
  exits: [
    { side: 'right', y: 9, to: 'k_hall' },
    { side: 'left', y: 9, to: 'k_prize', flag: 'boss_gorluk' },
  ],
  boss: { kind: 'gorluk', tx: 5 },
});

room('k_prize', {
  theme: 'kraid', music: 'lair', w: 16, h: 15,
  rows: corridor(14, {}),
  exits: [{ side: 'right', y: 9, to: 'k_boss', flag: 'boss_gorluk' }],
  items: [
    { id: 'etank3', kind: 'etank', tx: 5, ty: 11 },
    { id: 'm5', kind: 'mpack', tx: 9, ty: 11 },
  ],
});

// ============================ SKYRAX'S ROOST ============================

room('r_shaft', {
  theme: 'ridley', music: 'lair', w: 16, h: 30,
  rows: shaft(30, [
    [6, '.....EEEE#####'], [9, 'L'], [12, 'C'], [15, 'L'], [18, 'C'], [21, 'L'], [24, 'C'],
  ], { 27: F(14) }),
  exits: [{ side: 'right', y: 24, to: 'r_hall' }],
  spawns: [['waver', 7, 15]],
  elevators: [{ tx: 6, tw: 4, ty: 6, to: 'n_deep' }],
});

room('r_hall', {
  theme: 'ridley', music: 'lair', w: 48, h: 15,
  rows: (() => {
    const feats = {
      10: '.'.repeat(13) + '###' + '.'.repeat(15) + '###',
    };
    const f = F(10) + '~'.repeat(10) + F(8) + '~'.repeat(10) + F(8);
    return corridor(46, feats, [f, f, f]);
  })(),
  exits: [
    { side: 'left', y: 9, to: 'r_shaft' },
    { side: 'right', y: 9, to: 'r_boss' },
  ],
  spawns: [['rio', 16, 4], ['rio', 30, 5], ['squeept', 14, 13], ['squeept', 32, 13]],
});

room('r_boss', {
  theme: 'ridley', music: 'lair', w: 24, h: 15,
  rows: corridor(22, { 2: '%%..%%%%..%%%%..%%' }),
  exits: [
    { side: 'left', y: 9, to: 'r_hall' },
    { side: 'right', y: 9, to: 'r_prize', flag: 'boss_skyrax' },
  ],
  boss: { kind: 'skyrax', tx: 15 },
});

room('r_prize', {
  theme: 'ridley', music: 'lair', w: 16, h: 15,
  rows: corridor(14, {}),
  exits: [{ side: 'left', y: 9, to: 'r_boss', flag: 'boss_skyrax' }],
  items: [
    { id: 'etank4', kind: 'etank', tx: 7, ty: 11 },
    { id: 'm6', kind: 'mpack', tx: 4, ty: 11 },
    { id: 'm7', kind: 'mpack', tx: 10, ty: 11 },
  ],
});

// ============================ THE HIVE ============================

room('t_shaft', {
  theme: 'tourian', music: 'hive', w: 16, h: 40,
  rows: shaft(40, [
    [6, '#####EEEE'], [9, 'C'], [13, 'R'], [17, 'C'], [21, 'L'],
    [25, 'C'], [29, 'R'], [33, 'C'],
  ], { 37: F(14) }),
  exits: [{ side: 'left', y: 34, to: 't_hall1' }],
  spawns: [['phazoid', 8, 20]],
  elevators: [{ tx: 6, tw: 4, ty: 6, to: 'b_gate' }],
});

room('t_hall1', {
  theme: 'tourian', music: 'hive', w: 48, h: 15,
  rows: corridor(46, {
    8: '..........####............####',
  }),
  exits: [
    { side: 'right', y: 9, to: 't_shaft' },
    { side: 'left', y: 9, to: 't_hall2' },
  ],
  spawns: [['phazoid', 12, 5], ['phazoid', 24, 7], ['phazoid', 36, 4]],
});

room('t_hall2', {
  theme: 'tourian', music: 'hive', w: 64, h: 15,
  rows: (() => {
    const f12 = F(5) + '~'.repeat(4) + '##' + '~'.repeat(3) + '##' + '~~' + F(44);
    const f = F(5) + '~'.repeat(13) + F(44);
    return corridor(62, {}, [f12, f, f]);
  })(),
  exits: [
    { side: 'right', y: 9, to: 't_hall1' },
    { side: 'left', y: 9, to: 't_escape', flag: 'escape' },
  ],
  zebs: [{ tx: 48 }, { tx: 40 }, { tx: 32 }],
  rinkaSpawners: [{ tx: 54, ty: 2 }, { tx: 44, ty: 2 }, { tx: 36, ty: 2 }, { tx: 20, ty: 2 }],
  boss: { kind: 'overmind', tx: 10 },
});

room('t_escape', {
  theme: 'tourian', music: 'escape', w: 16, h: 50,
  rows: shaft(50, [
    [6, 'R'], [8, 'C'], [11, 'L'], [14, 'C'], [17, 'L'], [20, 'C'],
    [23, 'R'], [26, 'C'], [29, 'L'], [32, 'C'], [35, 'R'], [38, 'C'],
    [41, 'L'], [44, 'C'],
  ], { 47: F(14) }),
  exits: [
    { side: 'right', y: 44, to: 't_hall2', flag: 'escape' },
    { side: 'right', y: 3, to: 't_surface' },
  ],
});

room('t_surface', {
  theme: 'brinstar', music: 'escape', w: 32, h: 15,
  rows: corridor(30, {}),
  exits: [{ side: 'left', y: 9, to: 't_escape' }],
  ship: { tx: 18 },
  sky: true,
});

// ============================ ITEMS ============================

export const ITEM_INFO = {
  morph: { name: 'MORPH BALL', desc: 'PRESS DOWN TO CURL INTO A BALL.' },
  mpack: { name: 'MISSILE PACK', desc: 'MISSILE CAPACITY +5. PRESS C TO ARM.' },
  bombs: { name: 'BOMBS', desc: 'FIRE WHILE MORPHED TO LAY A CHARGE.' },
  long: { name: 'LONG BEAM', desc: 'YOUR SHOTS FLY THE FULL RANGE.' },
  ice: { name: 'ICE BEAM', desc: 'YOUR SHOTS FREEZE WHAT THEY STRIKE.' },
  hijump: { name: 'HI-JUMP BOOTS', desc: 'LEAP HALF AGAIN AS HIGH.' },
  varia: { name: 'VARIA SUIT', desc: 'ALL DAMAGE IS HALVED.' },
  etank: { name: 'ENERGY TANK', desc: 'MAXIMUM ENERGY +100.' },
  screw: { name: 'SCREW ATTACK', desc: 'YOUR SOMERSAULT TEARS THROUGH FOES.' },
  wave: { name: 'WAVE BEAM', desc: 'YOUR SHOTS PASS THROUGH WALLS.' },
};

// ---- automap: room positions in screen units, grouped by area ----
// [gx, gy] of the room's top-left screen; optional third entry overrides
// the map area (t_surface is drawn with the Hive even though it uses the
// brinstar tile theme).
const MAP_POS = {
  b_start: [0, 0], b_shaft1: [3, 0], b_long: [4, 0], b_missile: [4, 1],
  b_tank: [2, 1], b_bomb: [4, 2], b_low: [-1, 2], b_gate: [-3, 2],
  c_entry: [0, 0], c_shaft: [0, 1], c_gallery: [1, 1], c_maze: [-2, 2], c_deep: [1, 3],
  n_shaft: [0, 0], n_hijump: [1, 0], n_ice: [-2, 1], n_lava: [1, 1], n_deep: [-3, 2],
  w_entry: [0, 0], w_shaft: [-1, 0], w_hold: [-4, 1], w_core: [-6, 1],
  k_shaft: [0, 0], k_hall: [-3, 1], k_boss: [-5, 1], k_prize: [-6, 1],
  r_shaft: [0, 0], r_hall: [1, 1], r_boss: [4, 1], r_prize: [6, 1],
  t_shaft: [0, 0], t_hall1: [-3, 2], t_hall2: [-7, 2],
  t_escape: [-8, -1], t_surface: [-7, -1, 'tourian'],
};
for (const [id, [gx, gy, area]] of Object.entries(MAP_POS)) {
  const r = ROOMS[id];
  r.mapPos = [gx, gy];
  r.mapArea = area || r.theme;
  r.mapW = Math.ceil(r.w / 16);
  r.mapH = Math.ceil(r.h / 15);
}

// ============================ STORY ============================

export const STORY = [
  ['EMERGENCY ORDER M-26.',
    '',
    'THE MINING COLONY ON PLANET',
    'ZEMOOR HAS GONE SILENT.'],
  ['DEEP SCANS SHOW A HIVE ORGANISM,',
    'THE OVERMIND, NESTING IN THE CORE.',
    '',
    'IT BREEDS ENERGY LEECHES.',
    'THE CREWS CALLED THEM PHAZOIDS.'],
  ['TWO ANCIENT TITANS, GORLUK AND',
    'SKYRAX, HAVE RISEN TO GUARD THE',
    'ONLY GATE INTO THE HIVE.'],
  ['BOUNTY HUNTER J. MOORE',
    'DROPS ALONE INTO THE BLUE CAVERNS.',
    '',
    'DESTROY THE TITANS.',
    'BREACH THE HIVE.',
    'END THE OVERMIND.'],
];

export const ENDING = [
  'THE OVERMIND IS DESTROYED.',
  'THE HIVE COLLAPSES INTO THE CORE.',
  '',
  'ZEMOOR IS SILENT AGAIN --',
  'THIS TIME, IN PEACE.',
  '',
  'SEE YOU NEXT MISSION.',
];

// Progression hints for the pause screen.
export function hintFor(save) {
  const it = save.items;
  if (!it.morph) return 'SOMETHING GLINTS AT THE WEST END OF THE FIRST CAVERN.';
  if (!it.m1) return 'A NARROW CRAWLWAY EAST OF THE GREAT SHAFT HIDES A WEAPON.';
  if (!it.bombs) return 'A CRIMSON DOOR LOW IN THE GREAT SHAFT ANSWERS ONLY TO MISSILES.';
  if (!save.flags.boss_gorluk && !save.flags.boss_skyrax) {
    return 'RIDE THE ELEVATORS FROM THE LOWER CAVERN. TWO TITANS MUST FALL.';
  }
  if (!save.flags.boss_gorluk) return 'GORLUK WAITS BELOW THE WESTERN ELEVATOR.';
  if (!save.flags.boss_skyrax) return 'SKYRAX ROOSTS BENEATH THE MOLTEN VEIN.';
  if (!save.flags.boss_overmind) return 'THE HIVE GATE IS OPEN. THE OVERMIND WAITS AT ITS HEART.';
  return 'RUN. THE PLANET IS COMING DOWN.';
}

// ---- world sanity checks (used by tools/validate.js and on boot in dev) ----
export function validateWorld() {
  const errs = [];
  const solidAt = (r, x, y) => {
    if (x < 0 || x >= r.w || y < 0 || y >= r.h) return true;
    return SOLID.has(r.map[y][x]);
  };
  for (const r of Object.values(ROOMS)) {
    for (let y = 0; y < r.h; y++) {
      if (r.map[y].length !== r.w) errs.push(`${r.id} row ${y} width ${r.map[y].length} != ${r.w}`);
    }
    for (const e of r.exits) {
      const other = ROOMS[e.to];
      if (!other) { errs.push(`${r.id} exit to unknown room ${e.to}`); continue; }
      const back = other.exits.find((o) => o.to === r.id && o.side !== e.side);
      if (!back) errs.push(`${r.id} -> ${e.to}: no reciprocal exit`);
      const ix = e.side === 'left' ? 1 : r.w - 2;
      if (!solidAt(r, ix, e.y + 3)) errs.push(`${r.id} door y=${e.y}: no ground under door`);
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 1; dx <= 2; dx++) {
          const x = e.side === 'left' ? dx : r.w - 1 - dx;
          if (solidAt(r, x, e.y + dy)) errs.push(`${r.id} door y=${e.y}: passage blocked at ${x},${e.y + dy}`);
        }
      }
    }
    for (const el of r.elevators) {
      const other = ROOMS[el.to];
      if (!other) { errs.push(`${r.id} elevator to unknown room ${el.to}`); continue; }
      if (!other.elevators.find((o) => o.to === r.id)) errs.push(`${r.id} elevator -> ${el.to}: no reciprocal`);
      for (let i = 0; i < el.tw; i++) {
        if (r.map[el.ty][el.tx + i] !== 'E') errs.push(`${r.id} elevator pad missing E at ${el.tx + i},${el.ty}`);
      }
    }
    for (const it of r.items) {
      if (solidAt(r, it.tx, it.ty)) errs.push(`${r.id} item ${it.id} inside solid tile at ${it.tx},${it.ty}`);
    }
    for (const [type, tx, ty] of r.spawns) {
      if (tx < 1 || tx >= r.w - 1 || ty < 1 || ty >= r.h - 1) errs.push(`${r.id} spawn ${type} out of bounds`);
    }
  }
  return errs;
}
