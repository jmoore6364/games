// The land of Moorule: overworld, towns, dungeons, people, monsters, story.
// No DOM dependencies — this module can be validated in node.
//
// Tile legend:
//   world:   . grass  f forest  h hills  m mountain  w water  s sand
//            S swamp  p path  b bridge  a ash  A ash tree
//            T town  C cave  W worldspire  G great gate (locked)
//            M mist wall (locked)  B broken bridge (locked)
//   town:    # wall  F floor  c counter  t table  e bed  l lamp  n fence
//            o well  i inn sign  g gear sign  v item sign  (+ . p f)
//   dungeon: R rock  , floor  < stairs up/out  > stairs down  X chest
//            x opened chest  Z brazier  O pillar

export const TILE = 16;
export const W_W = 160, W_H = 96;

const WALK = new Set(['.', 'f', 'h', 's', 'S', 'p', 'b', 'a', 'd', 'D', 'T', 'C', 'W', 'F', 'o', ',', '<', '>', 'x', 'l']);
export const walkable = (ch) => WALK.has(ch);
// tiles that trigger something when bumped (solid until their flag opens them)
export const BUMPS = new Set(['G', 'M', 'B']);

// ============================ OVERWORLD ============================
// Built in code with a seeded rng so it is deterministic.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s >> 16) / 32768;
  };
}

export const WORLD = [];
{
  const g = [];
  for (let y = 0; y < W_H; y++) g.push(new Array(W_W).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
  };
  const scatter = (x0, y0, x1, y1, ch, density, r, over = '.') => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (g[y][x] === over && r() < density) g[y][x] = ch;
      }
    }
  };
  // path carving: axis-aligned polyline; only writes over ground tiles
  const path = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      let [x, y] = pts[i];
      const [tx, ty] = pts[i + 1];
      while (x !== tx || y !== ty) {
        if ('.fhsSaA'.includes(g[y][x])) g[y][x] = 'p';
        if (x !== tx) x += Math.sign(tx - x);
        else y += Math.sign(ty - y);
      }
    }
  };

  const r = rng(20260717);
  // ocean ring
  fill(0, 0, W_W - 1, 2, 'w'); fill(0, W_H - 3, W_W - 1, W_H - 1, 'w');
  fill(0, 0, 2, W_H - 1, 'w'); fill(W_W - 3, 0, W_W - 1, W_H - 1, 'w');
  // northern mountain ring
  fill(3, 3, W_W - 4, 4, 'm');
  // ashlands (top band) walled by the Great Gate wall at y=14
  fill(3, 5, W_W - 4, 13, 'a');
  scatter(5, 6, W_W - 6, 13, 'A', 0.13, r, 'a');
  fill(3, 5, 25, 14, 'm');           // impassable north-west block
  fill(3, 14, W_W - 4, 14, 'm');     // the gate wall
  g[14][46] = 'G'; g[14][47] = 'G';  // the Great Gate
  // the Worldspire
  fill(57, 7, 59, 9, 'a');
  g[8][58] = 'W';
  g[7][58] = 'A'; // scorched tree behind
  // north country (between gate wall and mist wall)
  scatter(28, 15, 90, 29, 'h', 0.18, r);
  fill(3, 15, 27, 29, 'm');          // west block: no sneaking around
  fill(84, 15, W_W - 4, 29, 'm');    // east block (seals the north-east)
  fill(64, 15, 74, 17, 'm');         // Duskhold crags
  g[17][70] = 'm'; g[18][70] = 'C';  // Duskhold fort door faces south
  g[20][44] = 'T';                   // Highcairn
  // mist wall at y=30, pass at x=56..57
  fill(3, 30, W_W - 4, 30, 'm');
  g[30][56] = 'M'; g[30][57] = 'M';
  // the river (x=36..38) south of the mist wall, all the way to the sea
  fill(36, 31, 38, W_H - 1, 'w');
  g[38][36] = 'B'; g[38][37] = 'B'; g[38][38] = 'B'; // broken bridge
  // west country
  scatter(4, 31, 20, 50, 'f', 0.3, r);
  scatter(20, 31, 35, 44, 'f', 0.12, r);
  fill(9, 33, 11, 34, 'f');
  g[34][10] = 'C';                   // Hollow Barrow
  g[35][10] = '.';
  g[52][24] = 'T';                   // Emberwick
  fill(4, 56, 34, 60, 'f');
  fill(16, 58, 22, 60, '.');         // gap in the south woods toward the coast
  // east swamp
  fill(42, 33, 80, 52, 'S');
  scatter(39, 31, 92, 57, 'f', 0.1, r);
  fill(55, 39, 57, 41, '.');
  g[40][56] = 'T';                   // Sagemoor
  fill(71, 49, 73, 51, 'S');
  g[50][72] = 'C';                   // Mire Cave
  g[51][72] = 'S';
  fill(40, 58, 90, 60, 's');         // south-east beach
  g[59][60] = 'C';                   // the Sunken Vault

  // ======= the wider world =======
  // eastern pinewood (beyond the old coast, south of the mist wall)
  scatter(93, 31, W_W - 4, 60, 'f', 0.34, r);
  fill(104, 38, 112, 44, '.');
  g[40][108] = 'T';                  // Thornwatch camp
  fill(126, 46, 134, 52, '.');       // the Pale Stag's glade
  scatter(127, 47, 133, 51, 'f', 0.1, r);
  // southern coast, west of the river: Greywater and the lighthouse isle
  scatter(4, 61, 34, 78, 'f', 0.14, r);
  fill(3, 79, 35, W_H - 4, 's');     // grey sands
  g[72][16] = 'T';                   // Greywater
  fill(3, 84, 13, W_H - 4, 'w');     // the bay
  fill(5, 86, 9, 91, 's');           // the lighthouse isle
  g[87][7] = 'C';                    // the lighthouse
  g[80][10] = 'D';                   // ferry dock (mainland)
  g[90][7] = 'D';                    // ferry dock (isle)
  fill(10, 81, 10, 83, 's');         // pier approach
  // southern desert, east of the river
  fill(39, 61, W_W - 4, W_H - 4, 's');
  scatter(44, 62, W_W - 6, W_H - 5, 'd', 0.2, r, 's');
  scatter(44, 62, W_W - 6, W_H - 5, 'u', 0.06, r, 's');
  fill(39, 61, 43, 74, '.');         // green fringe below the beach
  fill(54, 72, 58, 76, '.');         // the oasis
  g[74][56] = 'T';                   // Cinderdune
  fill(118, 82, 124, 88, 'd');
  g[85][121] = 'C';                  // the Sand Sepulcher
  g[86][121] = 's';
  // the south-east sea, and The Smolder — a volcanic isle
  fill(134, 58, W_W - 1, W_H - 1, 'w');
  fill(142, 70, 150, 78, 'm');       // the isle's rim
  fill(143, 72, 149, 77, 'a');
  scatter(143, 72, 149, 77, 'A', 0.2, r, 'a');
  g[73][146] = 'C';                  // Ember Hollow
  fill(146, 74, 146, 78, 'a');       // path down from the crater
  g[78][146] = 'a';
  fill(144, 79, 148, 79, 's');       // the landing beach
  // roads
  path([[24, 53], [24, 46], [30, 46], [30, 39], [30, 38], [35, 38]]);
  g[38][30] = 'T';                   // Fordwell (placed after the road)
  path([[39, 38], [48, 38], [48, 40], [55, 40]]);
  path([[57, 40], [56, 40], [56, 31]]);
  path([[56, 29], [56, 20], [46, 20], [46, 15]]);
  path([[56, 20], [70, 20], [70, 19]]);
  path([[46, 13], [46, 10], [58, 10], [58, 9]]);
  path([[24, 46], [10, 46], [10, 35]]);
  path([[24, 53], [24, 58], [19, 58], [19, 66], [16, 66], [16, 71]]);   // to Greywater
  path([[16, 73], [16, 78], [12, 78], [12, 80], [10, 80]]);             // to the dock
  path([[60, 60], [60, 66], [56, 66], [56, 73]]);                       // beach to Cinderdune
  path([[58, 74], [80, 74], [80, 84], [118, 84], [120, 84]]);           // to the Sepulcher
  path([[92, 40], [107, 40]]);                                          // swamp to Thornwatch
  path([[109, 40], [120, 40], [120, 49], [126, 49]]);                   // camp to the glade
  for (const row of g) WORLD.push(row.join(''));
}

export const START_POS = { map: 'world', x: 24, y: 53, dir: 'up' };

export const TOWN_AT = {
  '24,52': 'emberwick', '30,38': 'fordwell', '56,40': 'sagemoor', '44,20': 'highcairn',
  '16,72': 'greywater', '56,74': 'cinderdune', '108,40': 'thornwatch',
};
export const CAVE_AT = {
  '10,34': 'barrow1', '72,50': 'mire1', '70,18': 'dusk1', '58,8': 'spire1', '60,59': 'vault1',
  '7,87': 'light1', '121,85': 'sep1', '146,73': 'ember1',
};
// ferry docks: stepping on one 'D' sails you to its pair
export const DOCKS = { '10,80': [7, 90], '7,90': [10, 80] };
// bosses that roam the open world
export const WORLD_BOSSES = {
  ...Object.fromEntries(
    ['129,49', '130,49', '131,49', '130,48', '130,50'].map((k) => [k,
      { group: ['palestag'], flag: 'k_stag', text: 'THE PALE STAG LOWERS ITS CROWN OF BONE!' }]),
  ),
  // the Kraken guards every water tile touching The Smolder's beach
  ...Object.fromEntries(
    ['144,80', '145,80', '146,80', '147,80', '148,80', '143,79', '149,79'].map((k) => [k,
      { group: ['kraken'], flag: 'k_kraken', text: 'THE SEA BOILS -- THE KRAKEN HAS FOUND YOUR HULL!' }]),
  ),
};
// where the ship waits when granted (and after a defeat)
export const SHIP_HOME = [10, 84];
// encounters while sailing
export const SEA_ENCOUNTERS = {
  rate: 15,
  groups: [['gullwing'], ['saltfang'], ['gullwing', 'gullwing'], ['krakenarm'], ['saltfang', 'gullwing'], ['krakenarm', 'saltfang']],
};

// ============================ TOWNS ============================
// 24 x 16 maps. Walking off any edge returns to the world map.

function town(id, name, rows, npcs, spawn) {
  return { id, kind: 'town', name, rows, npcs, spawn, music: 'town' };
}

const EMBERWICK = town('emberwick', 'EMBERWICK', [
  'ffffffffffffffffffffffff',
  'f...#i#####....#####v#.f',
  'f...#FFFFF#....#FFFFF#.f',
  'f...#eFFFc#....#cFFFF#.f',
  'f...####F##....##F####.f',
  'f.......................'.slice(0, 23) + 'f',
  'f..l.....p.....p.....l.f',
  'f........ppppppp.......f',
  'f...#######..o.p.......f',
  'f...#FFFFF#....p.....n.f',
  'f...#FtFFF#....p.....n.f',
  'f...#FFFFe#..l.p.......f',
  'f...###F###....p.......f',
  'f........................'.slice(0, 23) + 'f',
  'f..........ppppp.......f',
  'ffffffffffp.....pfffffff',
], [
  { id: 'mayor', sprite: 'mayor', x: 7, y: 10, role: 'mayor' },
  { id: 'inn_e', sprite: 'woman', x: 6, y: 2, role: 'inn', price: 8 },
  { id: 'shop_e', sprite: 'man2', x: 17, y: 3, role: 'shop', shop: 'ember_items' },
  { id: 'vil1', sprite: 'man', x: 12, y: 9, wander: true, say: [
    { if: 'weaver', text: ['THE SUN LOOKS BRIGHTER', 'ALREADY. YOU DID IT, MOORE!'] },
    { if: 'brann', text: ['YOU FIXED THE FORDWELL', 'BRIDGE? INCREDIBLE!'] },
    { text: ['THE SUN GROWS DIMMER EVERY', 'DAY. THE CROPS ARE FAILING.'] },
  ] },
  { id: 'vil2', sprite: 'woman2', x: 18, y: 11, wander: true, say: [
    { text: ['FOLLOW THE ROAD NORTH TO', 'FORDWELL, BY THE RIVER.'] },
  ] },
  { id: 'vil3', sprite: 'elder', x: 5, y: 6, say: [
    { if: 'ember', text: ['THAT LANTERN CARRIES THE', 'LAST TRUE FLAME. GUARD IT', 'WITH YOUR LIFE, LAD.'] },
    { text: ['IN MY DAY THE GREAT HEARTH', 'BLAZED LIKE A SECOND SUN.'] },
  ] },
], { x: 12, y: 13 });

const FORDWELL = town('fordwell', 'FORDWELL', [
  'ffffffffffffffffffffffff',
  'f..#g######...#####i#..f',
  'f..#FFFFFF#...#FFFFF#..f',
  'f..#cFFFFF#...#eFFFc#..f',
  'f..###F####...###F###..f',
  'f......................f',
  'f.l....p........p....l.f',
  'f......ppppppppppp.....f',
  'f..........p...........'.slice(0, 23) + 'f',
  'f..#####...p...#####v#.f',
  'f..#FFF#...p...#FFFFF#.f',
  'f..#FtF#...o...#FFFFc#.f',
  'f..#FFF#.......##F####.f',
  'f..##F##...n.n.........f',
  'f..........p...........'.slice(0, 23) + 'f',
  'ffffffffffffpppfffffffff',
], [
  { id: 'brann', sprite: 'brann', x: 4, y: 11, role: 'brann' },
  { id: 'gear_f', sprite: 'man2', x: 4, y: 2, role: 'shop', shop: 'ford_gear' },
  { id: 'inn_f', sprite: 'woman', x: 19, y: 2, role: 'inn', price: 15 },
  { id: 'shop_f', sprite: 'woman2', x: 20, y: 10, role: 'shop', shop: 'ford_items' },
  { id: 'vil4', sprite: 'guard', x: 12, y: 6, say: [
    { if: 'brann', text: ['BRANN FIXED THE BRIDGE!', 'THE EAST ROAD IS OPEN.'] },
    { text: ['THE BRIDGE HAS BEEN OUT FOR', 'MONTHS. ONLY BRANN COULD FIX', 'IT... IF HE HAD GOOD IRON.'] },
  ] },
  { id: 'vil5', sprite: 'man', x: 8, y: 8, wander: true, say: [
    { text: ['AN OLD BARROW LIES IN THE', 'WESTERN WOODS. FULL OF', 'WALKING BONES, THEY SAY.'] },
  ] },
  { id: 'fisher', sprite: 'man2', x: 12, y: 12, role: 'fisher' },
], { x: 12, y: 13 });

const SAGEMOOR = town('sagemoor', 'SAGEMOOR', [
  'ffffffffffffffffffffffff',
  'f..#####v#....#i#####..f',
  'f..#FFFFF#....#FFFFF#..f',
  'f..#cFFFF#....#cFFFe#..f',
  'f..##F####....####F##..f',
  'f......................f',
  'f.l..p..........p....l.f',
  'f....pppppopppppp......f',
  'f........p.............f',
  'f..#g#####p............f',
  'f..#FFFFF#p..n.n.n.....f',
  'f..#cFFFF#p............f',
  'f..###F###p............f',
  'f.........p............f',
  'f.........p............f',
  'fffffffffpppffffffffffff',
], [
  { id: 'lyra', sprite: 'lyra', x: 10, y: 7, role: 'lyra' },
  { id: 'shop_s', sprite: 'man2', x: 4, y: 2, role: 'shop', shop: 'sage_items' },
  { id: 'inn_s', sprite: 'woman2', x: 16, y: 3, role: 'inn', price: 25 },
  { id: 'gear_s', sprite: 'man', x: 4, y: 10, role: 'shop', shop: 'sage_gear' },
  { id: 'vil6', sprite: 'elder', x: 16, y: 10, say: [
    { if: 'weaver', text: ['THE HEARTH BURNS AGAIN.', 'BLESS YOU, TRAVELERS.'] },
    { if: 'lyra', text: ['LYRA CLEARED THE MIST PASS', 'NORTH OF TOWN. THE MOUNTAIN', 'ROAD AWAITS YOU.'] },
    { text: ['THE DUSKWEAVER SPINS ITS WEB', 'ATOP THE WORLDSPIRE, SNUFFING', 'EVERY FLAME IN THE LAND.'] },
  ] },
  { id: 'vil7', sprite: 'woman', x: 19, y: 8, wander: true, say: [
    { if: 'bloom', text: ['THE FEVER IS BREAKING.', 'THANK YOU, STRANGERS.'] },
    { text: ['HALF THE VILLAGE LIES SICK', 'WITH MARSH FEVER. ONLY LYRA', 'KEEPS US ALIVE.'] },
  ] },
], { x: 11, y: 13 });

const HIGHCAIRN = town('highcairn', 'HIGHCAIRN', [
  'ffffffffffffffffffffffff',
  'f..#i######...#####g#..f',
  'f..#FFFFFF#...#FFFFF#..f',
  'f..#eFFFFc#...#cFFFF#..f',
  'f..####F###...##F####..f',
  'f......................f',
  'f.l...p..........p...l.f',
  'f.....pppppppppppp.....f',
  'f.........p............f',
  'f..#####v#p............f',
  'f..#FFFFF#p...n..n..n..f',
  'f..#cFFFF#p............f',
  'f..###F###p............f',
  'f.........p............f',
  'f.........p............f',
  'ffffffffffpppfffffffffff',
], [
  { id: 'keeper', sprite: 'guard', x: 16, y: 10, role: 'keeper' },
  { id: 'inn_h', sprite: 'woman', x: 5, y: 3, role: 'inn', price: 40 },
  { id: 'gear_h', sprite: 'man2', x: 18, y: 3, role: 'shop', shop: 'high_gear' },
  { id: 'shop_h', sprite: 'woman2', x: 4, y: 10, role: 'shop', shop: 'high_items' },
  { id: 'vil8', sprite: 'elder', x: 13, y: 6, wander: true, say: [
    { if: 'weaver', text: ['YOU CLIMBED THE SPIRE AND', 'LIVED! THE BARDS WILL SING', 'OF THIS.'] },
    { if: 'gateOpen', text: ['THE GATE STANDS OPEN. ONLY', 'ASH AND SHADOW LIE BEYOND.', 'GO WELL-RESTED, FRIENDS.'] },
    { text: ['CULTISTS OF THE DUSK HOLD', 'THE OLD FORT EAST OF HERE.', 'THEY TOOK OUR SIGNAL HORN.'] },
  ] },
], { x: 11, y: 13 });

// ============================ DUNGEONS ============================
// 24 x 16 floors.

function dungeon(id, name, rows, opts = {}) {
  return {
    id, kind: 'dungeon', name, rows,
    music: opts.music || 'dungeon',
    links: opts.links || {},
    chests: opts.chests || {},
    bosses: opts.bosses || {},
    encounters: opts.encounters || null,
    hearth: opts.hearth || null,
    npcs: [],
    dark: false,
  };
}

const BARROW1 = dungeon('barrow1', 'THE HOLLOW BARROW', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,R,,,,,,,,,,,,XR',
  'R,R,RRR,R,RRRRRRRR,RRRRR',
  'R,R,,,R,R,,,,,,,,R,,,,,R',
  'R,R,X,R,RRRRRRRR,RRRRR,R',
  'R,R,,,R,,,,,,,,R,,,,,R,R',
  'R,RRRRRRRRRRRR,RRRRR,R,R',
  'R,,,,,,,,,,,,R,,,,,R,R,R',
  'RRRRRRRRRRRR,RRRRR,R,R,R',
  'R,,,,,,,,,,,,,,,,R,R,R,R',
  'R,RRRRRRRRRRRRRR,R,R,R,R',
  'R,,,,,,,,,,,,,,R,R,,,R,R',
  'RRRRRRRRRRRRRR,R,RRRRR,R',
  'R,,,,,,,,,,,,,,R,,,,,,,R',
  'R,<,RRRRRRRRRRRRRR,>,,,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,14': { map: 'world', x: 10, y: 35 }, '19,14': { map: 'barrow2', x: 2, y: 2 } },
  chests: { '4,4': { item: 'ring', quest: false }, '22,1': { item: 'potion' } },
  encounters: { rate: 14, groups: [['bonewalker'], ['bonewalker', 'bonewalker'], ['spider', 'wisp'], ['wisp', 'wisp']] },
});

const BARROW2 = dungeon('barrow2', 'BARROW DEPTHS', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,<,R,RRRRRRRRRRRRRRRR,R',
  'R,,,R,,,,,,,,,,,,,,,,R,R',
  'RRR,R,RRRRRRRRRRRRRR,R,R',
  'R,,,R,R,,,,,,,,,,,,R,R,R',
  'R,RRR,R,RRRRRRRRRR,R,R,R',
  'R,R,,,R,R,,,,,,,,R,R,R,R',
  'R,R,RRR,R,RRRRRR,R,R,R,R',
  'R,R,R,,,R,ROOOR,,R,R,R,R',
  'R,R,R,RRR,R,,,R,RR,R,R,R',
  'R,R,R,,,,,R,X,R,R,,,R,XR',
  'R,R,RRRRRRR,,,R,R,RRRRRR',
  'R,R,,,,,,,,,,,R,R,,,,,,R',
  'R,RRRRRRR,RR,RR,RRRRRR,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,2': { map: 'barrow1', x: 19, y: 14 } },
  chests: { '12,11': { item: 'iron', quest: true }, '22,11': { gold: 60 } },
  bosses: {
    '11,12': { group: ['stonewarden'], flag: 'k_warden', text: 'THE STONE WARDEN WAKES!' },
    '12,12': { group: ['stonewarden'], flag: 'k_warden', text: 'THE STONE WARDEN WAKES!' },
    '13,12': { group: ['stonewarden'], flag: 'k_warden', text: 'THE STONE WARDEN WAKES!' },
  },
  encounters: { rate: 13, groups: [['bonewalker', 'bonewalker'], ['bonewalker', 'spider'], ['spider', 'spider'], ['wisp', 'wisp', 'wisp']] },
});

const MIRE1 = dungeon('mire1', 'THE MIRE CAVE', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R'.slice(0, 24),
  'R,RRRRRRRRRRRR,R,R,RRR,R',
  'R,R,,,,,,,,,,R,R,R,,,R,R',
  'R,R,RRRRRRRR,R,R,R,X,R,R',
  'R,R,R,,,,,,R,R,R,R,,,R,R',
  'R,R,R,RRRR,R,R,R,RRRRR,R',
  'R,R,R,R,,R,R,R,R,,,,,,,R',
  'R,R,R,R,,R,R,R,RRRRRRR,R',
  'R,R,,,RRRR,R,R,,,,,,,R,R',
  'R,RRRRR,,,,R,RRRRRRR,R,R',
  'R,,,,,R,RRRR,,,,,,,R,R,R',
  'RRRRR,R,R,,,,RRRRR,R,R,R',
  'R,,,,,R,R,RRRR,,,R,,,R,R',
  'R,<,RRR,,,,,,,,>,R,RRR,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,14': { map: 'world', x: 72, y: 51 }, '15,14': { map: 'mire2', x: 2, y: 2 } },
  chests: { '19,4': { gold: 80 } },
  encounters: { rate: 14, groups: [['crawler'], ['crawler', 'duskbat'], ['serpent'], ['duskbat', 'duskbat']] },
});

const MIRE2 = dungeon('mire2', 'MIRE DEPTHS', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,<,RRRRRRRRRRRRRRRRRR,R',
  'R,,,,,,,,,,R,,,,,,,,,R,R',
  'R,RRRRRRRR,R,RRRRRRR,R,R',
  'R,,,,,,,,R,R,R,,,,,R,R,R',
  'R,RRRRRR,R,R,R,RRR,R,R,R',
  'R,R,,,,R,R,R,R,RXR,R,R,R',
  'R,R,XR,R,R,R,R,R,R,R,R,R',
  'R,R,,R,R,R,R,R,R,R,R,R,R',
  'R,RRRR,R,R,R,R,R,R,R,R,R',
  'R,,,,,,R,R,R,R,,,R,R,R,R',
  'RRRRRRRR,R,R,RRRRR,R,R,R',
  'R,,,,,,,,R,R,,,,,,,R,,,R',
  'R,RRRRRRRR,RRRRRRRRRRR,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,2': { map: 'mire1', x: 15, y: 14 } },
  chests: { '16,7': { item: 'bloom', quest: true }, '4,8': { item: 'bigpotion' } },
  bosses: {
    '16,11': { group: ['miremaw'], flag: 'k_miremaw', text: 'THE MIRE MAW RISES FROM THE MUCK!' },
    '15,11': { group: ['miremaw'], flag: 'k_miremaw', text: 'THE MIRE MAW RISES FROM THE MUCK!' },
  },
  encounters: { rate: 13, groups: [['crawler', 'crawler'], ['serpent', 'duskbat'], ['serpent', 'serpent'], ['duskbat', 'duskbat', 'duskbat']] },
});

const DUSK1 = dungeon('dusk1', 'DUSKHOLD FORT', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,R,RRRRRR,O,O,RRRRRRR,R',
  'R,R,,,,,,R,,,,,R,,,,,R,R',
  'R,R,R,RR,R,RRR,R,R,R,R,R',
  'R,R,R,,R,R,R,R,R,R,R,R,R',
  'R,R,R,XR,R,R,R,R,RXR,R,R',
  'R,R,RRRR,R,R,R,R,RRR,R,R',
  'R,R,,,,,,R,R,R,R,,,,,R,R',
  'R,RRRRRRRR,R,R,RRRRR,R,R',
  'R,,,,,,,,,,R,R,,,,,R,R,R',
  'RRRRRRRRRR,R,RRRRR,R,R,R',
  'R,,,,,,,,,,R,,,,,R,,,R,R',
  'R,RRRRRRRRRRRRRR,RRRRR,R',
  'R,,,,,,,<,,,,,,,,,,>,,,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '8,14': { map: 'world', x: 70, y: 19 }, '19,14': { map: 'dusk2', x: 2, y: 13 } },
  chests: { '6,6': { gold: 120 }, '18,6': { item: 'ether' } },
  encounters: { rate: 14, groups: [['cultist'], ['cultist', 'cultist'], ['brute'], ['cragbeast'], ['cultist', 'brute']] },
});

const DUSK2 = dungeon('dusk2', 'DUSKHOLD SANCTUM', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,RRRRRRRRR,ZR,RRRRRRR,R',
  'R,R,,,,,,,R,,,,R,,,,,R,R',
  'R,R,RRRRR,R,XX,R,RRR,R,R',
  'R,R,R,,,R,R,,,,R,R,R,R,R',
  'R,R,R,O,R,RRR,RR,R,R,R,R',
  'R,R,R,,,R,,,R,,,,R,R,R,R',
  'R,R,RRRRRRR,RRRRRR,R,R,R',
  'R,R,,,,,,,R,,,,,,,,R,R,R',
  'R,RRRRRRR,RRRRRRRRRR,R,R',
  'R,,,,,,,R,,,,,,,,,,,,R,R',
  'RRRRRRR,RRRRRRRRRRRRRR,R',
  'R,<,,,,,,,,,,,,,,,,,,,,R',
  'R,,,RRRRRRRRRRRRRRRRRR,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,13': { map: 'dusk1', x: 19, y: 14 } },
  chests: { '12,4': { item: 'horn', quest: true }, '13,4': { item: 'chain' } },
  bosses: {
    '11,3': { group: ['duskpriest'], flag: 'k_priest', text: '"THE FLAME DIES TONIGHT," HISSES THE DUSKPRIEST!' },
    '12,3': { group: ['duskpriest'], flag: 'k_priest', text: '"THE FLAME DIES TONIGHT," HISSES THE DUSKPRIEST!' },
    '13,3': { group: ['duskpriest'], flag: 'k_priest', text: '"THE FLAME DIES TONIGHT," HISSES THE DUSKPRIEST!' },
    '14,3': { group: ['duskpriest'], flag: 'k_priest', text: '"THE FLAME DIES TONIGHT," HISSES THE DUSKPRIEST!' },
    '11,4': { group: ['duskpriest'], flag: 'k_priest', text: '"THE FLAME DIES TONIGHT," HISSES THE DUSKPRIEST!' },
    '14,4': { group: ['duskpriest'], flag: 'k_priest', text: '"THE FLAME DIES TONIGHT," HISSES THE DUSKPRIEST!' },
  },
  encounters: { rate: 13, groups: [['cultist', 'cultist'], ['brute', 'cultist'], ['brute', 'brute'], ['cragbeast', 'cultist']] },
});

const SPIRE1 = dungeon('spire1', 'THE WORLDSPIRE', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,RRRRRRRRRRRRRRRRRRRR,R',
  'R,R,,,,,,,,,,,,,,,,,,R,R',
  'R,R,R,RRRRRRRRRRRRRR,R,R',
  'R,R,R,,,,,,,,,,,,,,R,R,R',
  'R,R,R,R,RRRRRRRRRZ,R,R,R',
  'R,R,R,R,,,,,,,,,,R,R,R,R',
  'R,R,R,R,R,RRRRRR,R,R,R,R',
  'R,R,R,R,R,,>,,,R,R,R,R,R',
  'R,R,R,R,R,,,,,,R,R,R,R,R',
  'R,R,R,R,RRRRRRRR,R,R,R,R',
  'R,R,R,R,,,,,,,,,,R,R,R,R',
  'R,R,R,RRRRRRRRRRRR,R,R,R',
  'R,<,R,,,,,,,,,,,,,,R,X,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  music: 'dungeon',
  links: { '2,14': { map: 'world', x: 58, y: 9 }, '11,9': { map: 'spire2', x: 11, y: 9 } },
  chests: { '21,14': { item: 'bigpotion' } },
  encounters: { rate: 14, groups: [['revenant'], ['embereater'], ['revenant', 'revenant'], ['embereater', 'revenant']] },
});

const SPIRE2 = dungeon('spire2', 'SPIRE HEIGHTS', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,RRRRRRRRRR,RRRRRRRRR,R',
  'R,R,,,,,,,,,,,,,,,,,,R,R',
  'R,R,RRRRR,RRRRR,RRRR,R,R',
  'R,R,R,,,R,R,,,R,R,,R,R,R',
  'R,R,R,X,R,R,Z,R,R,,R,R,R',
  'R,R,R,,,R,R,,,R,RR,R,R,R',
  'R,R,RR,RR,R,R,R,R,,R,R,R',
  'R,R,,,,,,,R<R,R,R,RR,R,R',
  'R,RRRRRRRRRRR,R,R,,,,R,R',
  'R,,,,,,,,,,,R,R,RRRR,R,R',
  'RRRRRRRRRRR,R,R,,,,R,R,R',
  'R,,,,,,,,,R,R,RRRR,R,,,R',
  'R,>,RRRRR,,,,,,,,,,,RR,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '11,9': { map: 'spire1', x: 11, y: 9 }, '2,14': { map: 'spire3', x: 2, y: 13 } },
  chests: { '6,6': { item: 'ether' } },
  encounters: { rate: 13, groups: [['shadowknight'], ['revenant', 'embereater'], ['embereater', 'embereater'], ['shadowknight', 'revenant']] },
});

const SPIRE3 = dungeon('spire3', 'THE GREAT HEARTH', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRR,Z,,Z,RRRRRRRRR',
  'RRRRRRR,,,,,,,,,RRRRRRRR',
  'RRRRRR,,,,ZHZ,,,,RRRRRRR'.replace('H', ','),
  'RRRRRR,,,,,,,,,,,RRRRRRR',
  'RRRRRR,,,,,,,,,,,RRRRRRR',
  'RRRRRRR,,,,,,,,,RRRRRRRR',
  'RRRRRRRR,,,,,,,RRRRRRRRR',
  'RRRRRRRR,,,,,,,RRRRRRRRR',
  'RRRRRRRR,O,,,O,RRRRRRRRR',
  'RRRRRRRR,,,,,,,RRRRRRRRR',
  'RRRRRRRR,,,,,,,RRRRRRRRR',
  'RRRRRRRR,,,,,,,RRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,<,RRRRRRRRRRRRRRRR,,,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  music: 'boss',
  links: { '2,14': { map: 'spire2', x: 2, y: 14 } },
  chests: {},
  bosses: Object.fromEntries(
    ['8,8', '9,8', '10,8', '11,8', '12,8', '13,8', '14,8'].map((k) => [k,
      { group: ['duskweaver'], flag: 'weaver', text: 'THE DUSKWEAVER DESCENDS ON THREADS OF SHADOW!' }]),
  ),
  encounters: null,
  hearth: { x: 11, y: 3 }, // step here with the weaver dead -> relight -> ending
});

const GREYWATER = town('greywater', 'GREYWATER', [
  'ffffffffffffffffffffffff',
  'f..#i######...#####v#..f',
  'f..#FFFFFF#...#FFFFF#..f',
  'f..#eFFFFc#...#cFFFF#..f',
  'f..####F###...##F####..f',
  'f......................f',
  'f.l...p..........p...l.f',
  'f.....pppppppppppp.....f',
  'f.........p............f',
  'f....n.n..p...n.n.n....f',
  'f.........p............f',
  'f.........p............f',
  'fwwwww....p....wwwwwwwwf',
  'fwwwww.pppppp..wwwwwwwwf',
  'fwwwwwwppppppwwwwwwwwwwf',
  'ffffffffppppffffffffffff',
], [
  { id: 'inn_g', sprite: 'woman', x: 5, y: 3, role: 'inn', price: 12 },
  { id: 'shop_g', sprite: 'man2', x: 16, y: 3, role: 'shop', shop: 'grey_items' },
  { id: 'ferry', sprite: 'man', x: 9, y: 13, say: [
    { text: ['FERRYMAN: THE OLD LIGHT ON', 'THE ISLE STILL TURNS, BUT', 'SOMETHING NESTS IN IT NOW.', 'MY SKIFF WAITS AT THE DOCK', 'SOUTH OF TOWN.'] },
  ] },
  { id: 'harbor', sprite: 'elder', x: 17, y: 10, role: 'shipwright' },
  { id: 'vil_g', sprite: 'woman2', x: 6, y: 9, wander: true, say: [
    { text: ['GREY SANDS, GREY SKY, GREY', 'WATER. HOME SWEET HOME.'] },
  ] },
], { x: 10, y: 10 });

const CINDERDUNE = town('cinderdune', 'CINDERDUNE', [
  'ssssssssssssssssssssssss',
  's..#v######...#####g#..s',
  's..#FFFFFF#...#FFFFF#..s',
  's..#cFFFFF#...#cFFFF#..s',
  's..####F###...##F####..s',
  's......................s',
  's.l...p..........p...l.s',
  's.....pppppopppppp.....s',
  's.........p............s',
  's..#i###..p............s',
  's..#FFF#..p..n.n.n.....s',
  's..#FcF#..p............s',
  's..##F##..p............s',
  's.........p............s',
  's.........p............s',
  'sssssssssspppsssssssssss',
], [
  { id: 'shop_c', sprite: 'man2', x: 4, y: 2, role: 'shop', shop: 'dune_items' },
  { id: 'gear_c', sprite: 'man', x: 16, y: 3, role: 'shop', shop: 'dune_gear' },
  { id: 'inn_c', sprite: 'woman', x: 5, y: 10, role: 'inn', price: 30 },
  { id: 'caravan', sprite: 'mayor', x: 14, y: 10, role: 'caravan' },
  { id: 'vil_c', sprite: 'woman2', x: 18, y: 8, wander: true, say: [
    { if: 'k_husk', text: ['THE SANDS LIE QUIET NOW.', 'THE HUSK IS DUST AT LAST.'] },
    { text: ['THE SEPULCHER EAST OF HERE', 'EATS CARAVANS WHOLE. THE', 'HUSK KEEPS WHAT IT TAKES.'] },
  ] },
], { x: 11, y: 13 });

const THORNWATCH = town('thornwatch', 'THORNWATCH CAMP', [
  'ffffffffffffffffffffffff',
  'f......................f',
  'f...n.n.n....n.n.n.....f',
  'f......................f',
  'f....l..........l......f',
  'f......................f',
  'f...#i###....#####v#...f',
  'f...#FFF#....#FFFFF#...f',
  'f...#FcF#....#cFFFF#...f',
  'f...##F##....##F####...f',
  'f......................f',
  'f....l..........l......f',
  'f......................f',
  'f...n.n.n....n.n.n.....f',
  'f......................f',
  'fffffffffffpppffffffffff',
], [
  { id: 'cook', sprite: 'woman2', x: 5, y: 8, role: 'inn', price: 10 },
  { id: 'shop_t', sprite: 'man2', x: 15, y: 8, role: 'shop', shop: 'thorn_items' },
  { id: 'hunter', sprite: 'brann', x: 10, y: 4, role: 'hunter' },
  { id: 'trapper', sprite: 'man', x: 16, y: 11, wander: true, say: [
    { if: 'k_stag', text: ['TRAPPER: YOU FELLED THE PALE', 'STAG? THE WOOD FEELS LIGHTER', 'ALREADY. AND HEAVIER, TOO.'] },
    { text: ['TRAPPER: EAST OF CAMP LIES', 'A GLADE NO SNARE SURVIVES.', 'THE PALE STAG WALKS IT.'] },
  ] },
], { x: 12, y: 13 });

// The Lighthouse — optional early dungeon across the bay.
const LIGHT1 = dungeon('light1', 'THE OLD LIGHTHOUSE', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,RRRRRRRRRRRRRRRRRRRR,R',
  'R,R,,,,,,,,,,,,,,,,,,R,R',
  'R,R,R,RRRRRRRRRRRRRR,R,R',
  'R,R,R,,,,,,,,,,,,,,R,R,R',
  'R,R,R,RRRRRRRRRRRZ,R,R,R',
  'R,R,R,R,,,,,,,,,,R,R,R,R',
  'R,R,R,R,RRRRR,RR,R,R,R,R',
  'R,R,R,R,R,,>,,,R,R,R,R,R',
  'R,R,R,R,R,,,,,,R,R,R,R,R',
  'R,R,R,R,RRRRRRRR,R,R,R,R',
  'R,R,R,R,,,,,,,,,,R,R,R,R',
  'R,R,R,RRRRRRRRRR,R,R,R,R',
  'R,<,R,,,,,,,,,,,,R,X,R,R'.slice(0, 23) + 'R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,14': { map: 'world', x: 7, y: 88 }, '11,9': { map: 'light2', x: 11, y: 13 } },
  chests: { '19,14': { gold: 120 } },
  encounters: { rate: 13, groups: [['reefling'], ['stormsprite'], ['reefling', 'reefling'], ['stormsprite', 'reefling'], ['bandit', 'bandit']] },
});

const LIGHT2 = dungeon('light2', 'THE LAMP ROOM', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRR,X,,,X,RRRRRRRR',
  'RRRRRRRR,,,,,,,,RRRRRRRR',
  'RRRRRRRRZ,,,,,,ZRRRRRRRR',
  'RRRRRRRR,,,,,,,,RRRRRRRR',
  'RRRRRR,,,,,,,,,,,,RRRRRR',
  'RRRRRR,,,,,,,,,,,,RRRRRR',
  'RRRRRR,,,,,,,,,,,,RRRRRR',
  'RRRRRRRR,,,,,,,,RRRRRRRR',
  'RRRRRRRRRR,,,,RRRRRRRRRR',
  'RRRRRRRRRR,,,,RRRRRRRRRR',
  'RRRRRRRRRR,,,,RRRRRRRRRR',
  'RRRRRRRRRR,,,,RRRRRRRRRR',
  'RRRRRRRRRR,<,,RRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  music: 'boss',
  links: { '11,13': { map: 'light1', x: 11, y: 9 } },
  chests: { '10,1': { item: 'sirocco' }, '14,1': { gold: 400 } },
  bosses: Object.fromEntries(
    ['10,9', '11,9', '12,9', '13,9'].map((k) => [k,
      { group: ['stormcaller'], flag: 'k_storm', text: 'THE STORMCALLER SHRIEKS FROM THE DEAD LAMP!' }]),
  ),
  encounters: null,
});

// The Sand Sepulcher — the desert's buried tomb.
const SEP1 = dungeon('sep1', 'THE SAND SEPULCHER', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,RRRRRRRRRR,RRRRRRRRR,R',
  'R,R,,,,,,,,,,,,,,,,,,R,R',
  'R,R,RRRRRRRRRRRRRRRR,R,R',
  'R,R,,,,,,,,R,,,,,,,R,R,R',
  'R,RRRRRRR,R,R,R,RR,R,R,R',
  'R,R,,,,,,,,,R,R,XR,R,R,R',
  'R,R,XR,R,R,R,R,R,R,R,R,R',
  'R,R,,R,R,R,R,R,,,R,R,R,R',
  'R,RRRR,R,R,R,RRRRR,R,R,R',
  'R,,,,,,R,R,R,,,,,R,,,R,R',
  'RRRRRRRR,R,RRRRR,RRRR,R,'.slice(0, 23) + 'R',
  'R,,,,,,,,R,,,,,,,,,,,,,R',
  'R,<,RRRRRRRRRR,>,RRRRR,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,14': { map: 'world', x: 121, y: 86 }, '15,14': { map: 'sep2', x: 2, y: 2 } },
  chests: { '16,7': { item: 'cargo' }, '4,8': { item: 'bigpotion' } },
  encounters: { rate: 13, groups: [['dustjackal'], ['glasscorpion'], ['sunwraith'], ['dustjackal', 'dustjackal'], ['glasscorpion', 'sunwraith']] },
});

const SEP2 = dungeon('sep2', 'THE HUSK\'S REST', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,<,RRRRRRRRRRRRRRRRRR,R',
  'R,,,,,,,,,,,,,,,,,,,,R,R',
  'RRRRRRRRRRRRRRRRRRRR,R,R',
  'RRRRRRRRR,X,X,RRRRRR,R,R',
  'RRRRRRRR,,,,,,RRRRRR,R,R',
  'RRRRRRRRZ,,,,ZRRRRRR,R,R',
  'RRRRRRRR,,,,,,RRRRRR,R,R',
  'RRRRRR,,,,,,,,,,RRRR,R,R',
  'RRRRRR,,,,,,,,,,RRRR,R,R',
  'RRRRRR,,,,,,,,,,RRRR,R,R',
  'RRRRRRRRR,,,,RRRRRRR,R,R',
  'R,,,,,,,,,,,,,,,,,,,,R,R',
  'R,RRRRRRRRRRRRRRRRRRRR,R'.slice(0, 23) + 'R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  music: 'boss',
  links: { '2,2': { map: 'sep1', x: 15, y: 14 } },
  chests: { '10,5': { gold: 600 }, '12,5': { item: 'tonic' } },
  bosses: Object.fromEntries(
    ['9,12', '10,12', '11,12', '12,12'].map((k) => [k,
      { group: ['husk'], flag: 'k_husk', text: 'THE HUSK UNFOLDS FROM ITS WRAPPINGS OF SAND!' }]),
  ),
  encounters: null,
});

// The Sunken Vault — optional superboss dungeon under the eastern sands.
const VAULT1 = dungeon('vault1', 'THE SUNKEN VAULT', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,<,RRRRRRRRRRRRRRRRRR,R',
  'R,,,,,,,,,,,,,,,,,,,,R,R',
  'RRRRRRRRRRRRRRRRRRRR,R,R',
  'R,,,,,,,,,,,,,,,,,,,,R,R',
  'R,R,RRRRRRRRRRRRRRRRRR,R',
  'R,R,,,,,,,,,,,,,,,,,,,,R',
  'R,RRRRRRRRRRRRRRRRRRRR,R',
  'R,,,,,,,,,,,,,,,,,,,,R,R',
  'RRRRRRRRRRRRRRRRRRRR,R,R',
  'RXX,,,,,,,,,,,,,,,,,,R,R',
  'R,RRRRRRRRRRRRRRRRRRRR,R',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,>,RRRRRRRRRRRRRRRRRR,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  links: { '2,2': { map: 'world', x: 60, y: 60 }, '2,14': { map: 'vault2', x: 2, y: 14 } },
  chests: { '1,11': { gold: 300 }, '2,11': { item: 'ether' } },
  encounters: { rate: 12, groups: [['drowned'], ['deepshade'], ['drowned', 'drowned'], ['deepshade', 'drowned'], ['shadowknight', 'deepshade']] },
});

const VAULT2 = dungeon('vault2', 'THE DROWNED THRONE', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRR,X,X,X,RRRRRRRR',
  'RRRRRRRR,,,,,,,,RRRRRRRR',
  'RRRRRRRR,,,,,,,,RRRRRRRR',
  'RRRRRRRR,O,,,,O,RRRRRRRR',
  'RRRRRR,,,,,,,,,,,,RRRRRR',
  'RRRRRR,,,,,,,,,,,,RRRRRR',
  'RRRRRR,,,,,,,,,,,,RRRRRR',
  'RRRRRRRR,,,,,,,,RRRRRRRR',
  'RRRRRRRR,,,,,,,,RRRRRRRR',
  'RRRRRRRRRR,,,,RRRRRRRRRR',
  'R,,,,,,,,,,,,,,,,,,,,,,R',
  'R,RRRRRRRRRRRRRRRRRRRR,R',
  'R,RRRRRRRRRRRRRRRRRRRR,R',
  'R,<,RRRRRRRRRRRRRRRR,,,R',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  music: 'boss',
  links: { '2,14': { map: 'vault1', x: 2, y: 14 } },
  chests: { '10,1': { item: 'dawnlantern' }, '12,1': { gold: 500 }, '14,1': { item: 'aegis' } },
  bosses: Object.fromEntries(
    ['10,10', '11,10', '12,10', '13,10'].map((k) => [k,
      { group: ['drownedking'], flag: 'k_king', text: 'THE DROWNED KING RISES FROM HIS SALT THRONE!' }]),
  ),
  encounters: null,
});

// Ember Hollow — the crater's heart, on The Smolder.
const EMBER1 = dungeon('ember1', 'EMBER HOLLOW', [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRR,X,X,X,RRRRRRRRR',
  'RRRRRRR,,,,,,,,RRRRRRRRR',
  'RRRRRRRZ,,,,,,ZRRRRRRRRR',
  'RRRRRR,,,,,,,,,,RRRRRRRR',
  'RRRRRR,,,,,,,,,,RRRRRRRR',
  'RRRRRR,,,,,,,,,,RRRRRRRR',
  'RRRRRRRR,,,,,,RRRRRRRRRR',
  'RRRRRRRRR,,,,RRRRRRRRRRR',
  'RRRR,,,,,,,,,,,,,RRRRRRR',
  'RRRR,RRRRRRRRRRR,RRRRRRR',
  'RRRR,RRRRRRRRRRR,RRRRRRR',
  'RRRR,,,,,,,,,,,,,RRRRRRR',
  'RRRRRRRRRR,<,RRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
], {
  music: 'boss',
  links: { '11,13': { map: 'world', x: 146, y: 78 } },
  chests: { '9,1': { item: 'emberplate' }, '11,1': { gold: 800 }, '13,1': { item: 'bigpotion' } },
  bosses: Object.fromEntries(
    ['9,8', '10,8', '11,8', '12,8'].map((k) => [k,
      { group: ['cindercolossus'], flag: 'k_colossus', text: 'THE CINDER COLOSSUS HEAVES ITSELF FROM THE MAGMA!' }]),
  ),
  encounters: { rate: 12, groups: [['embereater'], ['sunwraith'], ['embereater', 'sunwraith'], ['revenant', 'embereater']] },
});

export const MAPS = {
  emberwick: EMBERWICK, fordwell: FORDWELL, sagemoor: SAGEMOOR, highcairn: HIGHCAIRN,
  greywater: GREYWATER, cinderdune: CINDERDUNE, thornwatch: THORNWATCH,
  barrow1: BARROW1, barrow2: BARROW2, mire1: MIRE1, mire2: MIRE2,
  dusk1: DUSK1, dusk2: DUSK2, spire1: SPIRE1, spire2: SPIRE2, spire3: SPIRE3,
  vault1: VAULT1, vault2: VAULT2, light1: LIGHT1, light2: LIGHT2, sep1: SEP1, sep2: SEP2,
  ember1: EMBER1,
};

// ============================ ITEMS & GEAR ============================

export const ITEMS = {
  potion: { name: 'POTION', price: 20, heal: 35, desc: 'HEALS 35 HP' },
  bigpotion: { name: 'BIG POTION', price: 60, heal: 90, desc: 'HEALS 90 HP' },
  ether: { name: 'ETHER', price: 70, mp: 25, desc: 'RESTORES 25 MP' },
  tonic: { name: 'TONIC', price: 45, revive: true, desc: 'REVIVES A FALLEN ALLY' },
  smoke: { name: 'SMOKE BOMB', price: 15, flee: true, desc: 'ESCAPE ANY BATTLE' },
  antidote: { name: 'ANTIDOTE', price: 25, cure: true, desc: 'CURES POISON' },
  iron: { name: 'STAR-IRON', quest: true, desc: 'METAL FROM A FALLEN STAR' },
  ring: { name: 'LUCKY RING', quest: true, desc: 'A FISHERMAN\'S HEIRLOOM' },
  cargo: { name: 'LOST CARGO', quest: true, desc: 'A CARAVAN\'S SEALED STRONGBOX' },
  bloom: { name: 'MOONBLOOM', quest: true, desc: 'A FLOWER THAT DRINKS MOONLIGHT' },
  horn: { name: 'SIGNAL HORN', quest: true, desc: 'OPENS THE GREAT GATE' },
};

export const GEAR = {
  // weapons
  lantern: { name: 'LANTERN STAFF', slot: 'weapon', who: 'moore', atk: 2, price: 0 },
  oakstaff: { name: 'OAK STAFF', slot: 'weapon', who: 'moore', atk: 5, price: 60 },
  emberrod: { name: 'EMBER ROD', slot: 'weapon', who: 'moore', atk: 10, price: 240 },
  dawnlantern: { name: 'DAWN LANTERN', slot: 'weapon', who: 'moore', atk: 15, price: 900 },
  handaxe: { name: 'HAND AXE', slot: 'weapon', who: 'brann', atk: 4, price: 0 },
  broadaxe: { name: 'BROAD AXE', slot: 'weapon', who: 'brann', atk: 9, price: 160 },
  waraxe: { name: 'WAR AXE', slot: 'weapon', who: 'brann', atk: 14, price: 420 },
  knife: { name: 'HEDGE KNIFE', slot: 'weapon', who: 'lyra', atk: 3, price: 0 },
  willow: { name: 'WILLOW WAND', slot: 'weapon', who: 'lyra', atk: 7, price: 130 },
  moonwand: { name: 'MOON WAND', slot: 'weapon', who: 'lyra', atk: 11, price: 300 },
  glassrod: { name: 'GLASS ROD', slot: 'weapon', who: 'moore', atk: 12, price: 520 },
  suncleaver: { name: 'SUN CLEAVER', slot: 'weapon', who: 'brann', atk: 16, price: 780 },
  sirocco: { name: 'SIROCCO WAND', slot: 'weapon', who: 'lyra', atk: 13, price: 700 },
  // armor (anyone)
  cloth: { name: 'CLOTH TUNIC', slot: 'armor', def: 1, price: 0 },
  leather: { name: 'LEATHER COAT', slot: 'armor', def: 3, price: 50 },
  chain: { name: 'CHAIN SHIRT', slot: 'armor', def: 6, price: 180 },
  plate: { name: 'FORGE PLATE', slot: 'armor', def: 10, price: 460 },
  aegis: { name: 'TIDEWORN AEGIS', slot: 'armor', def: 14, price: 990 },
  duneweave: { name: 'DUNEWEAVE ROBE', slot: 'armor', def: 8, price: 320 },
  staghide: { name: 'STAGHIDE COAT', slot: 'armor', def: 9, price: 400 },
  emberplate: { name: 'EMBERPLATE', slot: 'armor', def: 16, price: 1400 },
};

export const SHOPS = {
  ember_items: { name: 'EMBERWICK GOODS', stock: ['potion', 'smoke'] },
  ford_items: { name: 'FORDWELL GOODS', stock: ['potion', 'tonic', 'antidote', 'smoke'] },
  ford_gear: { name: 'FORDWELL SMITHY', stock: ['oakstaff', 'broadaxe', 'leather'] },
  sage_items: { name: 'SAGEMOOR GOODS', stock: ['potion', 'bigpotion', 'antidote', 'tonic', 'smoke'] },
  sage_gear: { name: 'SAGEMOOR TRADER', stock: ['willow', 'broadaxe', 'chain'] },
  high_items: { name: 'HIGHCAIRN GOODS', stock: ['bigpotion', 'ether', 'antidote', 'tonic', 'smoke'] },
  high_gear: { name: 'HIGHCAIRN ARMORY', stock: ['emberrod', 'waraxe', 'moonwand', 'plate'] },
  grey_items: { name: 'GREYWATER GOODS', stock: ['potion', 'antidote', 'tonic', 'smoke'] },
  dune_items: { name: 'CINDERDUNE BAZAAR', stock: ['bigpotion', 'ether', 'antidote', 'tonic', 'smoke'] },
  dune_gear: { name: 'CINDERDUNE OUTFITTER', stock: ['glassrod', 'suncleaver', 'duneweave'] },
  thorn_items: { name: 'THORNWATCH STORES', stock: ['potion', 'bigpotion', 'antidote', 'smoke'] },
};

// ============================ PARTY ============================

export const PARTY_DEFS = {
  moore: {
    name: 'MOORE', sprite: 'moore',
    base: { hp: 30, mp: 10, atk: 6, def: 4, spd: 7, mag: 6 },
    growth: { hp: 6, mp: 3, atk: 2, def: 1, spd: 1, mag: 2 },
    weapon: 'lantern', armor: 'cloth',
    skills: [
      { id: 'flare', lv: 1 }, { id: 'warmth', lv: 3 }, { id: 'blaze', lv: 7 },
    ],
  },
  brann: {
    name: 'BRANN', sprite: 'brann',
    base: { hp: 44, mp: 5, atk: 9, def: 7, spd: 5, mag: 2 },
    growth: { hp: 8, mp: 1, atk: 3, def: 2, spd: 1, mag: 0 },
    weapon: 'handaxe', armor: 'leather',
    skills: [
      { id: 'smash', lv: 1 }, { id: 'quake', lv: 8 },
    ],
  },
  lyra: {
    name: 'LYRA', sprite: 'lyra',
    base: { hp: 26, mp: 18, atk: 4, def: 3, spd: 8, mag: 9 },
    growth: { hp: 5, mp: 4, atk: 1, def: 1, spd: 2, mag: 3 },
    weapon: 'knife', armor: 'cloth',
    skills: [
      { id: 'mend', lv: 1 }, { id: 'storm', lv: 1 }, { id: 'renew', lv: 10 },
    ],
  },
};

export const SKILLS = {
  flare: { name: 'FLARE', mp: 5, kind: 'fire', target: 'enemy', pow: 10 },
  blaze: { name: 'BLAZE', mp: 13, kind: 'fire', target: 'enemies', pow: 8 },
  warmth: { name: 'WARMTH', mp: 4, kind: 'heal', target: 'ally', pow: 16 },
  smash: { name: 'SMASH', mp: 5, kind: 'phys', target: 'enemy', mult: 1.7 },
  quake: { name: 'QUAKE', mp: 11, kind: 'phys', target: 'enemies', mult: 0.9 },
  mend: { name: 'MEND', mp: 4, kind: 'heal', target: 'ally', pow: 26 },
  storm: { name: 'STORM', mp: 8, kind: 'storm', target: 'enemies', pow: 12 },
  renew: { name: 'RENEW', mp: 14, kind: 'heal', target: 'allies', pow: 24 },
};

// total xp required to reach a level
export const xpForLevel = (lv) => Math.floor(14 * (lv - 1) * (lv - 1) + 26 * (lv - 1));

// ============================ ENEMIES ============================

export const ENEMIES = {
  ashwolf: { name: 'ASH WOLF', sprite: 'b_ashwolf', hp: 14, atk: 8, def: 3, spd: 8, xp: 5, gold: 4 },
  wisp: { name: 'CINDER WISP', sprite: 'b_wisp', hp: 10, atk: 6, def: 2, spd: 6, xp: 5, gold: 5, cast: { kind: 'fire', pow: 7, chance: 0.5 } },
  spider: { name: 'THICKET SPIDER', sprite: 'b_spider', hp: 18, atk: 9, def: 4, spd: 5, xp: 7, gold: 6, poison: 0.2 },
  bonewalker: { name: 'BONE WALKER', sprite: 'b_bonewalker', hp: 24, atk: 11, def: 5, spd: 4, xp: 10, gold: 9 },
  crawler: { name: 'MIRE CRAWLER', sprite: 'b_crawler', hp: 28, atk: 12, def: 7, spd: 5, xp: 13, gold: 11, poison: 0.25 },
  serpent: { name: 'BOG SERPENT', sprite: 'b_serpent', hp: 32, atk: 14, def: 5, spd: 9, xp: 16, gold: 13, poison: 0.3 },
  duskbat: { name: 'DUSK BAT', sprite: 'b_duskbat', hp: 22, atk: 11, def: 3, spd: 12, xp: 13, gold: 11 },
  cultist: { name: 'DUSK CULTIST', sprite: 'b_cultist', hp: 36, atk: 15, def: 7, spd: 8, xp: 22, gold: 20, cast: { kind: 'fire', pow: 12, chance: 0.4 } },
  brute: { name: 'DUSK BRUTE', sprite: 'b_brute', hp: 52, atk: 19, def: 8, spd: 5, xp: 28, gold: 26 },
  cragbeast: { name: 'CRAG BEAST', sprite: 'b_cragbeast', hp: 46, atk: 17, def: 12, spd: 4, xp: 26, gold: 22 },
  revenant: { name: 'ASH REVENANT', sprite: 'b_revenant', hp: 58, atk: 21, def: 10, spd: 9, xp: 38, gold: 32 },
  embereater: { name: 'EMBER EATER', sprite: 'b_embereater', hp: 64, atk: 23, def: 12, spd: 7, xp: 42, gold: 36, cast: { kind: 'fire', pow: 18, chance: 0.4 } },
  shadowknight: { name: 'SHADOW KNIGHT', sprite: 'b_shadowknight', hp: 78, atk: 27, def: 14, spd: 10, xp: 58, gold: 50 },
  drowned: { name: 'DROWNED ONE', sprite: 'b_drowned', hp: 66, atk: 24, def: 12, spd: 8, xp: 60, gold: 55, poison: 0.3 },
  deepshade: { name: 'DEEP SHADE', sprite: 'b_deepshade', hp: 58, atk: 26, def: 10, spd: 13, xp: 66, gold: 60 },
  bandit: { name: 'ROAD BANDIT', sprite: 'b_bandit', hp: 30, atk: 13, def: 6, spd: 10, xp: 14, gold: 24 },
  reefling: { name: 'REEFLING', sprite: 'b_reefling', hp: 34, atk: 14, def: 8, spd: 7, xp: 17, gold: 14, poison: 0.25 },
  stormsprite: { name: 'STORM SPRITE', sprite: 'b_stormsprite', hp: 38, atk: 15, def: 7, spd: 13, xp: 20, gold: 16, cast: { kind: 'storm', pow: 12, chance: 0.5 } },
  dustjackal: { name: 'DUST JACKAL', sprite: 'b_dustjackal', hp: 46, atk: 19, def: 8, spd: 13, xp: 28, gold: 24 },
  glasscorpion: { name: 'GLASS SCORPION', sprite: 'b_glasscorpion', hp: 54, atk: 20, def: 14, spd: 6, xp: 32, gold: 26, poison: 0.35 },
  sunwraith: { name: 'SUN WRAITH', sprite: 'b_sunwraith', hp: 62, atk: 24, def: 10, spd: 10, xp: 40, gold: 34, cast: { kind: 'fire', pow: 20, chance: 0.4 } },
  gullwing: { name: 'GULLWING', sprite: 'b_gullwing', hp: 40, atk: 17, def: 7, spd: 14, xp: 26, gold: 20 },
  saltfang: { name: 'SALTFANG', sprite: 'b_saltfang', hp: 56, atk: 22, def: 9, spd: 11, xp: 38, gold: 30 },
  krakenarm: { name: 'KRAKEN ARM', sprite: 'b_krakenarm', hp: 70, atk: 25, def: 13, spd: 6, xp: 48, gold: 40 },
  // bosses
  stonewarden: { name: 'STONE WARDEN', sprite: 'b_stonewarden', boss: true, hp: 130, atk: 16, def: 11, spd: 4, xp: 90, gold: 120 },
  miremaw: { name: 'MIRE MAW', sprite: 'b_miremaw', boss: true, hp: 210, atk: 21, def: 10, spd: 6, xp: 180, gold: 240, double: true },
  duskpriest: { name: 'DUSKPRIEST', sprite: 'b_duskpriest', boss: true, hp: 290, atk: 25, def: 12, spd: 10, xp: 320, gold: 400, cast: { kind: 'fire', pow: 22, chance: 0.45 } },
  duskweaver: { name: 'THE DUSKWEAVER', sprite: 'b_duskweaver', boss: true, hp: 460, atk: 31, def: 15, spd: 12, xp: 999, gold: 999, cast: { kind: 'fire', pow: 26, chance: 0.35 }, double: true },
  drownedking: { name: 'THE DROWNED KING', sprite: 'b_drownedking', boss: true, hp: 600, atk: 34, def: 18, spd: 11, xp: 1500, gold: 1500, poison: 0.35, cast: { kind: 'fire', pow: 30, chance: 0.3 }, double: true },
  stormcaller: { name: 'THE STORMCALLER', sprite: 'b_stormcaller', boss: true, hp: 260, atk: 22, def: 11, spd: 14, xp: 240, gold: 320, cast: { kind: 'storm', pow: 20, chance: 0.45 } },
  husk: { name: 'THE HUSK', sprite: 'b_husk', boss: true, hp: 340, atk: 26, def: 14, spd: 7, xp: 420, gold: 520, poison: 0.3, double: true },
  palestag: { name: 'THE PALE STAG', sprite: 'b_palestag', boss: true, hp: 300, atk: 28, def: 12, spd: 16, xp: 460, gold: 380, double: true },
  kraken: { name: 'THE KRAKEN', sprite: 'b_kraken', boss: true, hp: 520, atk: 32, def: 15, spd: 9, xp: 900, gold: 900, double: true, cast: { kind: 'storm', pow: 24, chance: 0.35 } },
  cindercolossus: { name: 'CINDER COLOSSUS', sprite: 'b_cindercolossus', boss: true, hp: 700, atk: 36, def: 20, spd: 5, xp: 2000, gold: 2000, double: true, cast: { kind: 'fire', pow: 32, chance: 0.35 } },
};

// World encounter zones, checked in order. rate = avg steps per battle.
export const ZONES = [
  { rect: [3, 3, W_W - 4, 14], rate: 11, groups: [['revenant'], ['embereater'], ['shadowknight'], ['revenant', 'embereater'], ['shadowknight', 'revenant']] },
  { rect: [3, 15, W_W - 4, 30], rate: 13, groups: [['cultist'], ['brute'], ['cragbeast'], ['cultist', 'cultist'], ['brute', 'cragbeast']] },
  { rect: [93, 31, W_W - 4, 60], rate: 13, groups: [['dustjackal'], ['bandit', 'bandit'], ['spider', 'spider'], ['ashwolf', 'ashwolf', 'ashwolf'], ['bandit', 'dustjackal']] },
  { rect: [39, 31, 92, 60], rate: 13, groups: [['crawler'], ['serpent'], ['duskbat'], ['crawler', 'duskbat'], ['serpent', 'crawler']] },
  { rect: [3, 31, 38, 60], rate: 15, groups: [['ashwolf'], ['wisp'], ['ashwolf', 'ashwolf'], ['spider'], ['wisp', 'ashwolf'], ['spider', 'wisp']] },
  { rect: [3, 80, 13, 95], rate: 13, groups: [['reefling'], ['stormsprite'], ['reefling', 'stormsprite'], ['reefling', 'reefling']] },
  { rect: [3, 61, 38, 95], rate: 14, groups: [['bandit'], ['reefling'], ['ashwolf', 'bandit'], ['bandit', 'bandit'], ['spider']] },
  { rect: [39, 61, W_W - 4, 95], rate: 13, groups: [['dustjackal'], ['glasscorpion'], ['sunwraith'], ['dustjackal', 'dustjackal'], ['glasscorpion', 'sunwraith'], ['dustjackal', 'glasscorpion']] },
];
// terrain multiplier: forests, swamps and dunes are more dangerous, roads safer
export const TERRAIN_RATE = { p: 2.4, '.': 1.4, s: 1.4, a: 1.0, f: 0.8, S: 0.8, h: 0.9, d: 0.8, D: 3 };

// ============================ STORY ============================

export const STORY = [
  [
    'THE SUN OF MOORULE IS NOT',
    'A STAR. IT IS A FIRE --',
    'THE GREAT HEARTH, KINDLED',
    'ATOP THE WORLDSPIRE IN THE',
    'ELDEST DAYS.',
    '',
    'NOW, ONE BY ONE, THE LAMPS',
    'OF THE LAND ARE GOING OUT.',
  ],
  [
    'THE DUSKWEAVER HAS WRAPPED',
    'THE HEARTH IN THREADS OF',
    'SHADOW, AND THE LONG COLD',
    'CREEPS ACROSS MOORULE.',
    '',
    'IN THE VILLAGE OF EMBERWICK,',
    'ONE LAMP STILL BURNS -- KEPT',
    'BY A YOUNG LAMPLIGHTER',
    'NAMED MOORE.',
  ],
];

export const ENDING = [
  'THE EVERFLAME TOUCHES THE',
  'COLD STONE OF THE HEARTH...',
  '',
  'AND THE SKY CATCHES FIRE.',
  '',
  'DAWN, TRUE DAWN, ROLLS',
  'ACROSS MOORULE FOR THE',
  'FIRST TIME IN A YEAR.',
  '',
  'THE LAMPLIGHTER OF EMBERWICK',
  'HAS LIT THE LAST LAMP.',
];

// ============================ VALIDATION ============================

export function validateWorld() {
  const errs = [];
  if (WORLD.length !== W_H) errs.push('world height');
  for (const row of WORLD) if (row.length !== W_W) errs.push('world width');
  for (const [key, id] of Object.entries(TOWN_AT)) {
    const [x, y] = key.split(',').map(Number);
    if (WORLD[y][x] !== 'T') errs.push(`town marker missing at ${key}`);
    if (!MAPS[id]) errs.push(`unknown town ${id}`);
  }
  for (const [key, id] of Object.entries(CAVE_AT)) {
    const [x, y] = key.split(',').map(Number);
    if (WORLD[y][x] !== 'C' && WORLD[y][x] !== 'W') errs.push(`cave marker missing at ${key} (${WORLD[y][x]})`);
    if (!MAPS[id]) errs.push(`unknown cave ${id}`);
  }
  for (const [id, m] of Object.entries(MAPS)) {
    const h = m.rows.length, w = m.rows[0].length;
    if (m.kind === 'town' && (w !== 24 || h !== 16)) errs.push(`${id}: bad town size ${w}x${h}`);
    for (const row of m.rows) if (row.length !== w) errs.push(`${id}: ragged rows`);
    for (const npc of m.npcs || []) {
      const ch = m.rows[npc.y]?.[npc.x];
      if (!walkable(ch) && ch !== 'F') errs.push(`${id}: npc ${npc.id} on solid '${ch}'`);
    }
    if (m.spawn && !walkable(m.rows[m.spawn.y][m.spawn.x])) errs.push(`${id}: bad spawn`);
    for (const [key, link] of Object.entries(m.links || {})) {
      const [x, y] = key.split(',').map(Number);
      const ch = m.rows[y]?.[x];
      if (ch !== '<' && ch !== '>') errs.push(`${id}: link at ${key} not on stairs (${ch})`);
      const dest = link.map === 'world' ? null : MAPS[link.map];
      if (link.map !== 'world' && !dest) errs.push(`${id}: link to unknown map ${link.map}`);
      const dch = link.map === 'world' ? WORLD[link.y][link.x] : dest.rows[link.y]?.[link.x];
      if (!walkable(dch)) errs.push(`${id}: link dest ${link.map} ${link.x},${link.y} solid '${dch}'`);
    }
    for (const key of Object.keys(m.chests || {})) {
      const [x, y] = key.split(',').map(Number);
      if (m.rows[y]?.[x] !== 'X') errs.push(`${id}: chest at ${key} not on X`);
      const c = m.chests[key];
      if (c.item && !ITEMS[c.item] && !GEAR[c.item]) errs.push(`${id}: chest item ${c.item} unknown`);
    }
    for (const key of Object.keys(m.bosses || {})) {
      const [x, y] = key.split(',').map(Number);
      if (!walkable(m.rows[y]?.[x])) errs.push(`${id}: boss trigger at ${key} on solid`);
      for (const e of m.bosses[key].group) if (!ENEMIES[e]) errs.push(`${id}: boss enemy ${e} unknown`);
    }
    if (m.encounters) for (const grp of m.encounters.groups) for (const e of grp) if (!ENEMIES[e]) errs.push(`${id}: enemy ${e} unknown`);
    for (const npc of m.npcs || []) {
      if (npc.shop && !SHOPS[npc.shop]) errs.push(`${id}: npc ${npc.id} unknown shop`);
    }
  }
  for (const shop of Object.values(SHOPS)) {
    for (const it of shop.stock) if (!ITEMS[it] && !GEAR[it]) errs.push(`shop item ${it} unknown`);
  }
  for (const zone of ZONES) for (const grp of zone.groups) for (const e of grp) if (!ENEMIES[e]) errs.push(`zone enemy ${e} unknown`);
  // every skill referenced exists
  for (const def of Object.values(PARTY_DEFS)) {
    for (const s of def.skills) if (!SKILLS[s.id]) errs.push(`skill ${s.id} unknown`);
    if (!GEAR[def.weapon] || !GEAR[def.armor]) errs.push('bad starting gear');
  }
  return errs;
}
