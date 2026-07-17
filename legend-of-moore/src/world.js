// The kingdom of Moorule: overworld screens, caves, dungeons, story.
// No DOM dependencies — this module can be validated in node.
//
// Overworld tile legend:
//   .  grass    ,  flowers   s  sand    d  dirt path   G  gravel
//   b  bridge   c  cave      S  stairs (revealed secret)
//   1 2 3       dungeon entrances
//   t  tree     r  rock      R  bombable rock (secret)   w  water
//   h  bush (burnable if the screen's secret)  g  grave  X  sealed gate
//
// Dungeon tile legend (interiors are 14x9; walls and doors are added
// by the renderer):
//   .  floor    B  block     P  pushable block   S  statue
//   ~  water (solid)         L  lava (walkable, hurts)

export const TILE = 16;
export const OW_W = 6, OW_H = 5;
export const SCREEN_TW = 16, SCREEN_TH = 11;

export const START = { sx: 2, sy: 4, tx: 7, ty: 7 };

const OVER_WALK = new Set(['.', ',', 's', 'd', 'b', 'G', 'S', 'c', '1', '2', '3']);
export const overWalkable = (ch) => OVER_WALK.has(ch);
export const DUNG_WALK = new Set(['.', 'L']);

// ============================ OVERWORLD ============================
// 6x5 screens, 16x11 tiles each. Openings between screens sit at
// rows 4-6 (east/west) and columns 7-8 (north/south).

export const OVERWORLD = {};
function scr(x, y, rows, opts = {}) {
  if (rows.length !== SCREEN_TH) throw new Error(`screen ${x},${y}: ${rows.length} rows`);
  for (const r of rows) if (r.length !== SCREEN_TW) throw new Error(`screen ${x},${y}: bad row "${r}"`);
  OVERWORLD[`${x},${y}`] = { x, y, rows, spawns: opts.spawns || [], caves: opts.caves || {}, secret: opts.secret || null };
}

// ---- row 0: the mountains ----
scr(0, 0, [
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrRrrrrrrrrrrr',
  'rrGGGGGGGGGGGGrr',
  'rGGGGGGGGGGGGGGG',
  'rGGGGGGrrGGGGGGG',
  'rGGGGGGrrGGGGGGG',
  'rrGGGGGGGGGGGGrr',
  'rrrrGGGGGGGGrrrr',
  'rrrrrrGGGGrrrrrr',
  'rrrrrrrGGrrrrrrr',
], { spawns: ['hopper', 'hopper', 'ghost'], secret: { type: 'bomb', tx: 4, ty: 2, cave: 'mt_money' } });

scr(1, 0, [
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrGGrrrrrrrrGGrr',
  'rGGGGGGGGGGGGGGr',
  'GGGGGGGGGGGGGGGG',
  'GGGGrrrrrrrGGGGG',
  'GGGGGGGGGGGGGGGG',
  'rGGGGGGGGGGGGGGr',
  'rrrGGGGGGGGGGrrr',
  'rrrrrGGGGGGrrrrr',
  'rrrrrrrGGrrrrrrr',
], { spawns: ['hopper', 'hopper', 'spitter'] });

scr(2, 0, [
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrXXrrrrrrr',
  'rrrrrGGGGGGrrrrr',
  'rrGGGGGGGGGGGGrr',
  'GGGGGGGGGGGGGGGG',
  'GGGGGrrGGrrGGGGG',
  'GGGGGGGGGGGGGGGG',
  'rrGGGGGGGGGGGGrr',
  'rrrrGGGGGGGGrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
], { spawns: ['ghost', 'ghost'] });

scr(3, 0, [
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrr33rrrrrrr',
  'rrrGGGGGGGGGGrrr',
  'GGGGGGGGGGGGGGGG',
  'GGGGrrGGGGrrGGGG',
  'GGGGGGGGGGGGGGGG',
  'rrGGGGGGGGGGGGrr',
  'rrrrGGGGGGGGrrrr',
  'rrrrrrGGGGrrrrrr',
  'rrrrrrrGGrrrrrrr',
], { spawns: ['hopper', 'spitter', 'ghost'] });

scr(4, 0, [
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrGGGGrrrrGGGGrr',
  'rGGGGGGGGGGGGGGr',
  'GGGGGGGGGGGGGGGG',
  'GGGrrGGGGGGrrGGG',
  'GGGGGGGGGGGGGGGG',
  'rrGGGGGGGGGGGGrr',
  'rrrGGGGGGGGGGrrr',
  'rrrrrGGGGGGrrrrr',
  'rrrrrrrGGrrrrrrr',
], { spawns: ['hopper', 'hopper', 'grunt'] });

scr(5, 0, [
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrcrrrrrr',
  'rrGGGGGGGGGGGGrr',
  'GGGGGGGGGGGGGGrr',
  'GGGGGrrrrGGGGGrr',
  'GGGGGGGGGGGGGGrr',
  'rrGGGGGGGGGGGGrr',
  'rrrrGGGGGGGGrrrr',
  'rrrrrGGGGGGrrrrr',
  'rrrrrrrGGrrrrrrr',
], { spawns: ['ghost', 'hopper'], caves: { '9,2': 'hint_gate' } });

// ---- row 1: graveyard, foothills, river ----
scr(0, 1, [
  'ttttttt..ttttttt',
  't..g..g..g..g..t',
  't..............t',
  't.g..g..c..g.g.t',
  't...............',
  't..g..g..g..g...',
  't...............',
  't.g..g..g..g.g.t',
  't..............t',
  't....g....g....t',
  'ttttttt..ttttttt',
], { spawns: ['ghost', 'ghost', 'ghost'], caves: { '8,3': 'white_sword' } });

scr(1, 1, [
  'ttttttt..ttttttt',
  't...g......g...t',
  't..............t',
  't.....g..g.....t',
  '................',
  '......g...g.....',
  '................',
  't....g....g....t',
  't..............t',
  't...g.....g....t',
  'ttttttt..ttttttt',
], { spawns: ['ghost', 'ghost', 'grunt'] });

scr(2, 1, [
  'rrrrrrrrrrrrrrrr',
  'rr...r....r...rr',
  'r..............r',
  'r...r......r...r',
  '................',
  '.....rr..rr.....',
  '................',
  'r....r....r....r',
  'r..............r',
  'rr............rr',
  'rrrrrrr..rrrrrrr',
], { spawns: ['spitter', 'spitter', 'hopper'] });

scr(3, 1, [
  'rrrrrrr..rrrrrrr',
  'r..............r',
  'r....rrcrr.....r',
  'r..............r',
  '................',
  '....r......r....',
  '................',
  'r..............r',
  'r...r......r...r',
  'r..............r',
  'rrrrrrr..rrrrrrr',
], { spawns: ['spitter', 'hopper'], caves: { '7,2': 'shopA' } });

scr(4, 1, [
  'ttttttt..ttttttt',
  't..............t',
  't...t......t...t',
  't......,,......t',
  '................',
  '.......,,.......',
  '................',
  't...t......t...t',
  't..............t',
  't..............t',
  'ttttttt..ttttttt',
], { spawns: ['spitter', 'spitter', 'grunt'] });

scr(5, 1, [
  'ttttttt..ttttttt',
  't..............t',
  't...,......,...t',
  't..............t',
  '............wwww',
  '...........wwwww',
  '..........wwwwww',
  't....wwbbwwwwwww',
  'twwwwwwbbwwwwwww',
  'wwwwwwwbbwwwwwww',
  'wwwwwwwbbwwwwwww',
], { spawns: ['lurker', 'lurker', 'spitter'] });

// ---- row 2: deep woods, plains, the lake ----
scr(0, 2, [
  'ttttttt..ttttttt',
  't..............t',
  't..ttt.....t...t',
  't..t1t.........t',
  't..t.t..........',
  't...............',
  't...............',
  't....t....t....t',
  't..............t',
  't...t......t...t',
  'ttttttt..ttttttt',
], { spawns: ['grunt', 'grunt', 'spitter'] });

scr(1, 2, [
  'ttttttt..ttttttt',
  't.t..........t.t',
  't...t..tt..t...t',
  't..............t',
  '......t..t......',
  '................',
  '......t..t......',
  't..............t',
  't...t..tt..t...t',
  't.t..........t.t',
  'ttttttt..ttttttt',
], { spawns: ['grunt', 'grunt', 'hopper'] });

scr(2, 2, [
  'tttttttddttttttt',
  't......dd......t',
  't...,..dd..,...t',
  't......dd......t',
  'dddddddddddddddd',
  'dddddddddddddddd',
  '.......dd.......',
  't......dd......t',
  't..,...dd..,...t',
  't......dd......t',
  'tttttttddttttttt',
], { spawns: ['spitter', 'spitter', 'hopper', 'hopper'] });

scr(3, 2, [
  'ttttttt..ttttttt',
  't..............t',
  't..t........t..t',
  't.....,..,.....t',
  '................',
  '.......tt.......',
  '................',
  't.....,..,.....t',
  't..t........t..t',
  't..............t',
  'ttttttt..ttttttt',
], { spawns: ['spitter', 'spitter', 'grunt'] });

scr(4, 2, [
  'ttttttt..ttttttt',
  't..............t',
  't...t.......wwww',
  't..........wwwww',
  '...........wwwww',
  '............wwww',
  '...........wwwww',
  't..........wwwww',
  't...t.......wwww',
  't..............t',
  'ttttttt..ttttttt',
], { spawns: ['spitter', 'hopper', 'lurker'] });

scr(5, 2, [
  'wwwwwwwbbwwwwwww',
  'wwwwwwwbbwwwwwww',
  'wwwwwwwbbwwwwwww',
  'wwwww......wwwww',
  'wwww.r.22.r.wwww',
  'wwww........wwww',
  'wwwww......wwwww',
  'wwwwww....wwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
], { spawns: ['lurker', 'lurker'] });

// ---- row 3: south woods and plains ----
scr(0, 3, [
  'ttttttt..ttttttt',
  't.t.t........t.t',
  't..............t',
  't...tt....tt...t',
  't...............',
  't...............',
  't...............',
  't...tt....tt...t',
  't..............t',
  't.t.t......t.t.t',
  'ttttttt..ttttttt',
], { spawns: ['grunt', 'grunt', 'hopper'] });

scr(1, 3, [
  'ttttttt..ttttttt',
  't..............t',
  't....hh..hh....t',
  't....hh..hh....t',
  '................',
  '.....h....h.....',
  '................',
  't....hh..hh....t',
  't..............t',
  't..............t',
  'ttttttt..ttttttt',
], { spawns: ['grunt', 'spitter', 'hopper'], secret: { type: 'burn', tx: 5, ty: 5, cave: 'burn_money' } });

scr(2, 3, [
  'tttttttddttttttt',
  't......dd......t',
  't..,...dd..,...t',
  't......dd......t',
  '.......dd.......',
  '.......dd.......',
  '.......dd.......',
  't......dd......t',
  't..,...dd..,...t',
  't......dd......t',
  'tttttttddttttttt',
], { spawns: ['spitter', 'spitter', 'hopper'] });

scr(3, 3, [
  'ttttttt..ttttttt',
  't..............t',
  't....rrcrr.....t',
  't..............t',
  '................',
  '.....,....,.....',
  '................',
  't...t......t...t',
  't..............t',
  't..............t',
  'ttttttt..ttttttt',
], { spawns: ['spitter', 'grunt'], caves: { '7,2': 'shopB' } });

scr(4, 3, [
  'ttttttt..ttttttt',
  't..........www.t',
  't..........www.t',
  't..........www.t',
  '...........bbb..',
  '...........bbb..',
  '...........bbb..',
  't..........www.t',
  't..........www.t',
  't..........www.t',
  'ttttttt..ttwwwtt',
], { spawns: ['lurker', 'spitter', 'grunt'] });

scr(5, 3, [
  'wwwwwwwwwwwwwwww',
  'tsssssssssssssst',
  'tsssssssssssssst',
  'tsstsssssstsssst',
  'sssssssssssssssw',
  'ssssssssssssssww',
  'sssssssssssssssw',
  'tsssssssssssssst',
  'tsssstssssstssst',
  'tsssssssssssssst',
  'tttttttssttttttt',
], { spawns: ['hopper', 'hopper', 'spitter'] });

// ---- row 4: the south ----
scr(0, 4, [
  'ttttttt..ttttttt',
  't.t............t',
  't....h....h....t',
  't..............t',
  't...............',
  't......hh.......',
  't...............',
  't....h....h....t',
  't..............t',
  't.t..........t.t',
  'tttttttttttttttt',
], { spawns: ['spitter', 'spitter'] });

scr(1, 4, [
  'ttttttt..ttttttt',
  't..............t',
  't.....rcr......t',
  't..............t',
  '................',
  '.....h....h.....',
  '................',
  't....h....h....t',
  't..............t',
  't..............t',
  'tttttttttttttttt',
], { spawns: ['spitter', 'hopper'], caves: { '7,2': 'hint_crypt' } });

scr(2, 4, [
  'tttttttddttttttt',
  't......dd......t',
  't..rcr.dd......t',
  't......dd......t',
  '.......dd.......',
  '.......dd.......',
  '.......dd.......',
  't..............t',
  't.....,..,.....t',
  't..............t',
  'tttttttttttttttt',
], { spawns: [], caves: { '4,2': 'start_sword' } });

scr(3, 4, [
  'ttttttt..ttttttt',
  't..............t',
  't...t......t...t',
  't.....,..,.....t',
  '................',
  '.......tt.......',
  '................',
  't....t....t....t',
  't..............t',
  't..............t',
  'tttttttttttttttt',
], { spawns: ['spitter', 'spitter', 'hopper'] });

scr(4, 4, [
  'ttttttt..ttwwwtt',
  't..........www.t',
  't..........www.t',
  'tsssssssssssssst',
  'ssssssssssssssss',
  'ssssssssssssssss',
  'ssssssssssssssss',
  'tsssstssssstssst',
  'tsssssssssssssst',
  'tsssssssssssssst',
  'tttttttttttttttt',
], { spawns: ['hopper', 'hopper', 'grunt'] });

scr(5, 4, [
  'tttttttssttttttt',
  'tsssssssssssssst',
  'tssssssrRrssssst',
  'tsssssssssssssst',
  'sssssssssssssssw',
  'ssssssssssssswww',
  'sssssssssssswwww',
  'tsssssssssswwwwt',
  'tssssssssswwwwwt',
  'tsssssssswwwwwwt',
  'tttttttttttttttt',
], { spawns: ['hopper', 'lurker', 'spitter'], secret: { type: 'bomb', tx: 8, ty: 2, cave: 'beach_heart' } });

// Dungeon entrance tiles -> which dungeon.
export const ENTRANCES = { 1: 'oak', 2: 'crypt', 3: 'ember' };
// Where you pop out when leaving each dungeon: [screenX, screenY, tileX, tileY]
export const DUNGEON_EXIT = {
  oak: [0, 2, 4, 4],
  crypt: [5, 2, 7, 5],
  ember: [3, 0, 7, 3],
  lair: [2, 0, 7, 2],
};

// ============================ CAVES ============================

export const CAVES = {
  start_sword: {
    npc: 'oldman',
    text: ['THE WILDS OF MOORULE ARE NO', 'PLACE TO WANDER UNARMED.', 'TAKE THIS, MOORE.'],
    give: 'sword',
  },
  white_sword: {
    npc: 'oldman',
    text: ['YOU HAVE PROVEN YOUR HEART.', 'TAKE THE WHITE SWORD.'],
    denyText: ['RETURN WHEN FIVE HEARTS', 'BEAT IN YOUR CHEST.'],
    give: 'wsword',
    needHearts: 5,
  },
  shopA: {
    npc: 'merchant',
    text: ['BUY SOMETHIN, WILL YA.'],
    shop: [
      { item: 'bombs', price: 20 },
      { item: 'candle', price: 40 },
      { item: 'key', price: 20 },
    ],
  },
  shopB: {
    npc: 'merchant',
    text: ['A FINE DAY FOR TRADE.'],
    shop: [
      { item: 'bombs', price: 20 },
      { item: 'key', price: 15 },
      { item: 'candle', price: 40 },
    ],
  },
  hint_gate: {
    npc: 'oldman',
    text: ['ONLY THE THREE SHARDS TOGETHER', 'WILL BREAK THE SEAL', 'ON MOUNT MOORE.'],
  },
  hint_crypt: {
    npc: 'oldman',
    text: ['THE GRAVEMAW OF THE DROWNED', 'CRYPT FEARS ONLY FIRE', 'THAT BURSTS.'],
  },
  burn_money: {
    text: ['A SECRET IS A SECRET', 'TO EVERYONE. TAKE THIS.'],
    gems: 30,
  },
  mt_money: {
    text: ['THE MOUNTAIN PAYS', 'THE PATIENT DIGGER.'],
    gems: 50,
  },
  beach_heart: {
    text: ['THE SEA KEEPS ITS TREASURES', 'FOR THE BOLD.'],
    give: 'container',
  },
};

// ============================ DUNGEONS ============================
// Interiors are 14 wide x 9 tall; the renderer adds the outer wall ring.
// Doors sit mid-wall: n/s at full columns 7-8, e/w at full row 5.
// Exit types: open, lock (key), bomb (hidden), exit (leaves the dungeon).
// Room flags: slam (doors close while enemies live), puzzle:'push'
// (doors stay closed until the P block is pushed), dark (needs candle
// to see well), boss.

const O9 = '..............';
const P_OPEN = [O9, O9, O9, O9, O9, O9, O9, O9, O9];
const P_STATUES = [
  '..............',
  '.S..........S.',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '.S..........S.',
  '..............',
];
const P_BLOCKS = [
  '..............',
  '..............',
  '..BB......BB..',
  '..............',
  '.....B..B.....',
  '..............',
  '..BB......BB..',
  '..............',
  '..............',
];
const P_MAZE = [
  '..............',
  '.BB..BB..BB.B.',
  '..............',
  '.B.BB..BB..BB.',
  '..............',
  '.BB..BB..BB.B.',
  '..............',
  '.B.BB..BB..BB.',
  '..............',
];
const P_MOAT = [
  '..............',
  '..............',
  '..~~~~..~~~~..',
  '..~........~..',
  '..............',
  '..~........~..',
  '..~~~~..~~~~..',
  '..............',
  '..............',
];
const P_LAVA = [
  '..............',
  '..............',
  '..LLLL..LLLL..',
  '..L........L..',
  '..............',
  '..L........L..',
  '..LLLL..LLLL..',
  '..............',
  '..............',
];
const P_PUSH = [
  '..............',
  '.B.B......B.B.',
  '..............',
  '..............',
  '......P.......',
  '..............',
  '..............',
  '.B.B......B.B.',
  '..............',
];
const P_BOSS = [
  '..............',
  '.S..........S.',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '.S..........S.',
  '..............',
];

export const DUNGEONS = {
  oak: {
    name: 'LEVEL 1 - THE HOLLOW OAK',
    theme: 'oak',
    level: 1,
    entry: '1,3',
    rooms: {
      '1,3': { rows: P_STATUES, exits: { s: 'exit', n: 'open' } },
      '1,2': { rows: P_BLOCKS, exits: { s: 'open', n: 'lock', e: 'open', w: 'bomb' }, spawns: ['zol', 'zol', 'zol'] },
      '0,2': { rows: P_OPEN, exits: { e: 'bomb' }, spawns: ['bat', 'bat', 'bat'], items: [{ kind: 'gems', amount: 30, tx: 7, ty: 5 }] },
      '2,2': { rows: P_STATUES, exits: { w: 'open', n: 'open' }, spawns: ['gel', 'gel', 'gel', 'gel'], items: [{ kind: 'compass', tx: 5, ty: 5 }, { kind: 'key', tx: 10, ty: 5 }] },
      '2,1': { rows: P_BLOCKS, exits: { s: 'open' }, spawns: ['stalfos', 'stalfos', 'stalfos'], slam: true, items: [{ kind: 'boomerang', tx: 7, ty: 4 }] },
      '1,1': { rows: P_MAZE, exits: { s: 'lock', n: 'lock', w: 'open' }, spawns: ['stalfos', 'stalfos', 'bat'], items: [{ kind: 'key', tx: 7, ty: 5 }] },
      '0,1': { rows: P_OPEN, exits: { e: 'open' }, spawns: ['zol', 'zol', 'bat', 'bat'], items: [{ kind: 'map', tx: 7, ty: 5 }] },
      '1,0': { rows: P_BOSS, exits: { s: 'lock', e: 'open' }, boss: 'thornmaw', slam: true },
      '2,0': { rows: P_STATUES, exits: { w: 'open' }, items: [{ kind: 'shard', tx: 7, ty: 5 }] },
    },
  },
  crypt: {
    name: 'LEVEL 2 - THE DROWNED CRYPT',
    theme: 'crypt',
    level: 2,
    entry: '2,3',
    rooms: {
      '2,3': { rows: P_STATUES, exits: { s: 'exit', n: 'open' } },
      '2,2': { rows: P_MOAT, exits: { s: 'open', n: 'open', e: 'open', w: 'lock' }, spawns: ['bat', 'bat', 'bat'] },
      '3,2': { rows: P_PUSH, exits: { w: 'open' }, puzzle: 'push', spawns: ['gel', 'gel'], items: [{ kind: 'key', tx: 11, ty: 5 }] },
      '1,2': { rows: P_BLOCKS, exits: { e: 'lock', n: 'open' }, dark: true, spawns: ['zol', 'zol', 'zol'], items: [{ kind: 'map', tx: 3, ty: 5 }] },
      '1,1': { rows: P_MAZE, exits: { s: 'open', n: 'bomb', e: 'open' }, dark: true, slam: true, spawns: ['stalfos', 'stalfos', 'stalfos'], items: [{ kind: 'key', tx: 7, ty: 5 }] },
      '1,0': { rows: P_OPEN, exits: { s: 'bomb' }, spawns: ['bat', 'bat'], items: [{ kind: 'gems', amount: 50, tx: 7, ty: 5 }] },
      '2,1': { rows: P_MOAT, exits: { w: 'open', s: 'open', n: 'lock' }, spawns: ['knight', 'knight'], items: [{ kind: 'compass', tx: 7, ty: 3 }] },
      '2,0': { rows: P_BOSS, exits: { s: 'lock', e: 'open' }, boss: 'gravemaw', slam: true },
      '3,0': { rows: P_STATUES, exits: { w: 'open' }, items: [{ kind: 'shard', tx: 7, ty: 5 }] },
    },
  },
  ember: {
    name: 'LEVEL 3 - THE EMBER MAW',
    theme: 'ember',
    level: 3,
    entry: '1,3',
    rooms: {
      '1,3': { rows: P_STATUES, exits: { s: 'exit', n: 'open' }, spawns: ['trap', 'trap'] },
      '1,2': { rows: P_LAVA, exits: { s: 'open', n: 'open', e: 'open', w: 'bomb' }, spawns: ['hexer', 'hexer'] },
      '0,2': { rows: P_OPEN, exits: { e: 'bomb' }, spawns: ['bat', 'bat'], items: [{ kind: 'gems', amount: 50, tx: 7, ty: 5 }] },
      '2,2': { rows: P_BLOCKS, exits: { w: 'open', n: 'lock' }, spawns: ['knight', 'knight', 'trap'], items: [{ kind: 'map', tx: 7, ty: 5 }] },
      '2,1': { rows: P_MAZE, exits: { s: 'lock', w: 'open' }, dark: true, spawns: ['hexer', 'hexer', 'bat'], items: [{ kind: 'key', tx: 7, ty: 5 }, { kind: 'compass', tx: 11, ty: 7 }] },
      '1,1': { rows: P_LAVA, exits: { s: 'open', e: 'open', n: 'lock', w: 'open' }, slam: true, spawns: ['knight', 'knight', 'knight'] },
      '0,1': { rows: P_PUSH, exits: { e: 'open' }, puzzle: 'push', spawns: ['gel', 'gel'], items: [{ kind: 'key', tx: 3, ty: 5 }] },
      '1,0': { rows: P_BOSS, exits: { s: 'lock', e: 'open' }, boss: 'hexlord', slam: true },
      '2,0': { rows: P_STATUES, exits: { w: 'open' }, items: [{ kind: 'shard', tx: 7, ty: 5 }] },
    },
  },
  lair: {
    name: 'VEXMOOR\'S KEEP',
    theme: 'lair',
    level: 9,
    entry: '1,3',
    rooms: {
      '1,3': { rows: P_STATUES, exits: { s: 'exit', n: 'open' }, slam: true, spawns: ['knight', 'knight'] },
      '1,2': { rows: P_MAZE, exits: { s: 'open', n: 'open', w: 'open' }, dark: true, slam: true, spawns: ['hexer', 'hexer', 'trap'] },
      '0,2': { rows: P_STATUES, exits: { e: 'open' }, items: [{ kind: 'fairy', tx: 7, ty: 5 }] },
      '1,1': { rows: P_BOSS, exits: { s: 'open', n: 'open' }, boss: 'vexmoor', slam: true },
      '1,0': { rows: P_OPEN, exits: { s: 'open' }, princess: true },
    },
  },
};

// ============================ TEXT ============================

export const STORY = [
  [
    'LONG AGO, THE KINGDOM OF',
    'MOORULE WAS KEPT SAFE BY',
    'THE GOLDEN AMULET.',
    '',
    'BUT VEXMOOR, THE SHADOW KING,',
    'STORMED THE CASTLE TO',
    'SEIZE ITS POWER.',
  ],
  [
    'PRINCESS SEREN SHATTERED THE',
    'AMULET INTO THREE SHARDS AND',
    'HID THEM IN THE DARK PLACES',
    'OF THE LAND. VEXMOOR LOCKED',
    'HER ATOP MOUNT MOORE.',
    '',
    'MOORE... FIND THE SHARDS.',
    'BREAK THE SEAL. SAVE US ALL.',
  ],
];

export const ENDING = [
  'THE AMULET IS WHOLE AGAIN.',
  'THE SHADOW IS LIFTED.',
  '',
  'THANKS, MOORE.',
  'YOU ARE THE HERO OF MOORULE.',
];

export const ITEM_INFO = {
  sword: 'WOODEN SWORD',
  wsword: 'WHITE SWORD',
  boomerang: 'BOOMERANG',
  candle: 'CANDLE',
  bombs: 'BOMBS',
  key: 'SMALL KEY',
  map: 'DUNGEON MAP',
  compass: 'COMPASS',
  container: 'HEART CONTAINER',
  shard: 'AMULET SHARD',
  fairy: 'FAIRY',
};

// ============================ VALIDATION ============================

const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

export function validateWorld() {
  const errs = [];
  // Overworld: every screen exists and edges agree on walkability.
  for (let y = 0; y < OW_H; y++) {
    for (let x = 0; x < OW_W; x++) {
      const s = OVERWORLD[`${x},${y}`];
      if (!s) { errs.push(`missing screen ${x},${y}`); continue; }
      // east neighbor
      const e = OVERWORLD[`${x + 1},${y}`];
      if (e) {
        for (let r = 0; r < SCREEN_TH; r++) {
          const a = overWalkable(s.rows[r][SCREEN_TW - 1]);
          const b = overWalkable(e.rows[r][0]);
          if (a !== b) errs.push(`edge mismatch ${x},${y} E row ${r}`);
        }
      }
      // south neighbor
      const so = OVERWORLD[`${x},${y + 1}`];
      if (so) {
        for (let c = 0; c < SCREEN_TW; c++) {
          const a = overWalkable(s.rows[SCREEN_TH - 1][c]);
          const b = overWalkable(so.rows[0][c]);
          if (a !== b) errs.push(`edge mismatch ${x},${y} S col ${c}`);
        }
      }
      for (const key of Object.keys(s.caves)) {
        const [tx, ty] = key.split(',').map(Number);
        const ch = s.rows[ty][tx];
        if (ch !== 'c' && ch !== 'S') errs.push(`cave marker not on cave tile at ${x},${y} ${key}`);
        if (!CAVES[s.caves[key]]) errs.push(`unknown cave ${s.caves[key]}`);
      }
      if (s.secret) {
        const ch = s.rows[s.secret.ty][s.secret.tx];
        if (s.secret.type === 'burn' && ch !== 'h') errs.push(`burn secret not on bush at ${x},${y}`);
        if (s.secret.type === 'bomb' && ch !== 'R') errs.push(`bomb secret not on R at ${x},${y}`);
        if (!CAVES[s.secret.cave]) errs.push(`unknown secret cave ${s.secret.cave}`);
      }
    }
  }
  // Dungeons: geometry + reciprocal exits.
  for (const [did, d] of Object.entries(DUNGEONS)) {
    if (!d.rooms[d.entry]) errs.push(`${did}: entry room missing`);
    for (const [key, room] of Object.entries(d.rooms)) {
      const [x, y] = key.split(',').map(Number);
      if (room.rows.length !== 9) errs.push(`${did} ${key}: bad row count`);
      for (const r of room.rows) if (r.length !== 14) errs.push(`${did} ${key}: bad row width`);
      for (const [dir, type] of Object.entries(room.exits)) {
        if (type === 'exit') continue;
        const [dx, dy] = DIRS[dir];
        const nb = d.rooms[`${x + dx},${y + dy}`];
        if (!nb) { errs.push(`${did} ${key}: exit ${dir} leads nowhere`); continue; }
        const back = nb.exits[OPP[dir]];
        if (!back) errs.push(`${did} ${key}: exit ${dir} has no reciprocal`);
        else if (back !== type) errs.push(`${did} ${key}: exit ${dir} type ${type} != ${back}`);
      }
      for (const it of room.items || []) {
        if (!['gems', 'key', 'map', 'compass', 'boomerang', 'shard', 'fairy', 'container'].includes(it.kind)) {
          errs.push(`${did} ${key}: unknown item ${it.kind}`);
        }
        const ch = room.rows[it.ty - 1]?.[it.tx - 1];
        if (!DUNG_WALK.has(ch)) errs.push(`${did} ${key}: item ${it.kind} on solid tile`);
      }
      if (room.puzzle === 'push' && !room.rows.some((r) => r.includes('P'))) {
        errs.push(`${did} ${key}: push puzzle without P block`);
      }
    }
  }
  return errs;
}
