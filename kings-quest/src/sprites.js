// All art is procedurally generated pixel art - original designs, no ripped assets.
// Sprites are authored as string grids; letters index into a per-sprite palette.

export const SPR = {};

function makeSprite(rows, pal) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function flipped(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.translate(img.width, 0);
  g.scale(-1, 1);
  g.drawImage(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- hero ----
// Sir Jason of Moore: blue tunic, steel greaves, gold belt.

const HERO_PAL = {
  H: '#6b3f16', // hair
  S: '#ffcf9e', // skin
  E: '#201008', // eyes
  T: '#3355cc', // tunic
  U: '#2a4099', // tunic shade
  A: '#b8bcc8', // steel
  D: '#5a5e6e', // steel dark / legs
  G: '#ffd800', // gold belt
  B: '#4a2c12', // boots
};

const HERO_DOWN = [
  '....HHHH....',
  '...HHHHHH...',
  '...HSSSSH...',
  '...SESSES...',
  '...SSSSSS...',
  '....SSSS....',
  '...TTTTTT...',
  '..TTTTTTTT..',
  '.ATUTTTTUTA.',
  '.ATTTTTTTTA.',
  '.SATTTTTTAS.',
  '.S.GGGGGG.S.',
  '...TTTTTT...',
  '...UTTTTU...',
  '...DD..DD...',
  '...DD..DD...',
  '...DD..DD...',
  '...DD..DD...',
  '..BBB..BBB..',
  '..BBB..BBB..',
];
const HERO_DOWN_W1 = HERO_DOWN.slice(0, 14).concat([
  '...DD..DD...',
  '...DD..DD...',
  '..DD....DD..',
  '..DD....DD..',
  '.BBB....BBB.',
  '.BBB....BBB.',
]);
const HERO_DOWN_W2 = HERO_DOWN.slice(0, 14).concat([
  '...DDDDDD...',
  '....DDDD....',
  '....DDDD....',
  '....DDDD....',
  '...BBBBBB...',
  '...BBBBBB...',
]);

const HERO_UP = [
  '....HHHH....',
  '...HHHHHH...',
  '...HHHHHH...',
  '...HHHHHH...',
  '...HHHHHH...',
  '....SSSS....',
  '...TTTTTT...',
  '..TTTTTTTT..',
  '.ATUTTTTUTA.',
  '.ATTTTTTTTA.',
  '.SATTTTTTAS.',
  '.S.GGGGGG.S.',
  '...TTTTTT...',
  '...UTTTTU...',
  '...DD..DD...',
  '...DD..DD...',
  '...DD..DD...',
  '...DD..DD...',
  '..BBB..BBB..',
  '..BBB..BBB..',
];
const HERO_UP_W1 = HERO_UP.slice(0, 14).concat(HERO_DOWN_W1.slice(14));
const HERO_UP_W2 = HERO_UP.slice(0, 14).concat(HERO_DOWN_W2.slice(14));

const HERO_LEFT = [
  '....HHHH....',
  '...HHHHHH...',
  '...HSSSHH...',
  '...ESSSHH...',
  '...SSSSHH...',
  '....SSSS....',
  '...TTTTTT...',
  '..TTTTTTTT..',
  '..TUTTTTUT..',
  '..ATTTTTTA..',
  '..ATTTTTTA..',
  '..SGGGGGGS..',
  '...TTTTTT...',
  '...UTTTTU...',
  '....DDDD....',
  '....DDDD....',
  '....DDDD....',
  '....DDDD....',
  '...BBBB.....',
  '...BBBB.....',
];
const HERO_LEFT_W1 = HERO_LEFT.slice(0, 14).concat([
  '...DD.DD....',
  '...DD..DD...',
  '..DD....DD..',
  '..DD....DD..',
  '.BBB....BBB.',
  '.BBB....BBB.',
]);
const HERO_LEFT_W2 = HERO_LEFT.slice(0, 14).concat([
  '....DDDD....',
  '....DDDD....',
  '...DD.DD....',
  '...DD.DD....',
  '..BBB.BBB...',
  '..BBB.BBB...',
]);

// ----------------------------------------------------------------- npcs ----

const KING_PAL = {
  G: '#ffd800', J: '#ff5555', j: '#5555ff', // crown + jewels
  S: '#ffcf9e', E: '#201008',
  W: '#f4f4f4', // beard / ermine trim
  R: '#aa0000', r: '#7a0000', // robe
  B: '#4a2c12',
};
const KING = [
  '..G.G.G.G..',
  '..GGGGGGG..',
  '..GJGjGJG..',
  '...SSSSS...',
  '...SESES...',
  '..WSSSSSW..',
  '..WWSSSWW..',
  '..WWWWWWW..',
  '...WWWWW...',
  '..RRRWRRR..',
  '.RRRRWRRRR.',
  '.RRRRWRRRR.',
  'WRRRRWRRRRW',
  'WRRRRWRRRRW',
  'WrRRRWRRRrW',
  '.rRRRRRRRr.',
  '.rRRRRRRRr.',
  '.rrRRRRRrr.',
  '.rrrRRRrrr.',
  '.rrrrrrrrr.',
  '.WWWWWWWWW.',
  '..BB...BB..',
];
const GUARD_PAL = {
  A: '#b8bcc8', D: '#5a5e6e',
  S: '#ffcf9e', E: '#201008',
  T: '#3355cc', U: '#2a4099',
  B: '#4a2c12', P: '#8a5a22', // spear shaft
  Y: '#ffd800',
};
const GUARD = [
  '.........A..',
  '...AAAA..A..',
  '..AAAAAA.P..',
  '..A.AA.A.P..',
  '..SSSSSS.P..',
  '..SESSES.P..',
  '...SSSS..P..',
  '..TTTTTT.P..',
  '.TTTTTTTTP..',
  '.ATUTTUTAP..',
  '.ATTTTTTAP..',
  '.STTYYTTSP..',
  '..TTTTTT.P..',
  '..UTTTTU.P..',
  '..DD..DD.P..',
  '..DD..DD.P..',
  '..DD..DD....',
  '.BBB..BBB...',
];

const GOAT_PAL = {
  W: '#e8e4d8', w: '#b8b4a8',
  H: '#c89858', E: '#201008', P: '#e8a8a8',
};
const GOAT1 = [
  '.H..H...........',
  '.HH.H...........',
  '.WWWW...........',
  '.WEWW...........',
  '.WWWWWWWWWWWw...',
  'PWWWWWWWWWWWWw..',
  '.W.WWWWWWWWWWw..',
  '.W..WWWWWWWWWw..',
  '....Ww.....wW...',
  '....Ww.....wW...',
  '....Ww.....wW...',
];
const GOAT2 = [
  '.H..H...........',
  '.HH.H...........',
  '.WWWW...........',
  '.WEWW...........',
  '.WWWWWWWWWWWw...',
  'PWWWWWWWWWWWWw..',
  '.W.WWWWWWWWWWw..',
  '.W..WWWWWWWWWw..',
  '...wW.......Ww..',
  '..wW.........Ww.',
  '..wW.........Ww.',
];

const TROLL_PAL = {
  G: '#2a8c2a', g: '#1e661e', // hide
  E: '#ffd800', M: '#701010', // eyes, mouth
  C: '#6a4418', c: '#4a2c12', // club
  N: '#88c088', // belly
};
const TROLL = [
  '......CC......',
  '.....CCCC.....',
  '.....CcCC.....',
  '..G..CcCC..G..',
  '.GGG.CcC..GGG.',
  '.GGGGGGGGGGGG.',
  '..GGGGGGGGGG..',
  '..GEGGGGGGEG..',
  '..GGGGGGGGGG..',
  '..GMMMMMMMMG..',
  '..GGMMMMMMGG..',
  '.GGGGGGGGGGGG.',
  '.GGNNNNNNNNGG.',
  '.GGNNNNNNNNGG.',
  'gGGNNNNNNNNGGg',
  'gGGNNNNNNNNGGg',
  'gG.GGGGGGGG.Gg',
  '...GGG..GGG...',
  '...GGG..GGG...',
  '...ggg..ggg...',
  '..gggg..gggg..',
];

const DRAGON_PAL = {
  G: '#1e8c3a', g: '#136326', // scales
  Y: '#ffe088', // belly
  R: '#e03030', r: '#8c1616', // wings
  E: '#ff3030', W: '#f4f4f4', // eye, teeth
  H: '#ffd800', // horns
};
const DRAGON1 = [
  '............................H..H...........',
  '...........................HGGGGH..........',
  '..............RR...........GGGGGGG.........',
  '.............RRRR.........GGEGGGGGG........',
  '............RRrrRR........GGGGGGGGG........',
  '...........RRrrrrRR.......GGGGGGGG.........',
  '..........RRrrrrrrRR......GGWGWGW..........',
  '.........RRrrrrrrrrRR....GGGGGGG...........',
  '....GGGGGRRrrrrrrrrrRRGGGGGGGG.............',
  '..GGGGGGGGGGGGGGGGGGGGGGGGGGG..............',
  '.GGGGGGGGGGGGGGGGGGGGGGGGGG................',
  'gGGGGYYYYYYYYYYYYYYYGGGGGGG................',
  'gGGGYYYYYYYYYYYYYYYYYGGGGG.................',
  '.gGGYYYYYYYYYYYYYYYYYGGGG..................',
  '..gGGYYYYYYYYYYYYYYYGGGG...................',
  '...gGGGGGGGGGGGGGGGGGGG....................',
  '....gGG.GGg....gGG.GGg.....................',
  '....gGG.GGg....gGG.GGg.....................',
  '...ggGGGGGgg..ggGGGGGgg....................',
];
const DRAGON2 = [
  '............................H..H...........',
  '...........................HGGGGH..........',
  '..........RR...............GGGGGGG.........',
  '.........RRRR..............GGEGGGGGG.......',
  '.........RRrrRR............GGGGGGGGG.......',
  '..........RRrrrRR..........GGGGGGGG........',
  '...........RRrrrrRR........GGWGWGW.........',
  '............RRrrrrrRR.....GGGGGGG..........',
  '....GGGGG....RRrrrrrRRGGGGGGGGG............',
  '..GGGGGGGGGGGGGGGGGGGGGGGGGGG..............',
  '.GGGGGGGGGGGGGGGGGGGGGGGGGG................',
  'gGGGGYYYYYYYYYYYYYYYGGGGGGG................',
  'gGGGYYYYYYYYYYYYYYYYYGGGGG.................',
  '.gGGYYYYYYYYYYYYYYYYYGGGG..................',
  '..gGGYYYYYYYYYYYYYYYGGGG...................',
  '...gGGGGGGGGGGGGGGGGGGG....................',
  '....gGG.GGg....gGG.GGg.....................',
  '....gGG.GGg....gGG.GGg.....................',
  '...ggGGGGGgg..ggGGGGGgg....................',
];

const OWL_PAL = {
  B: '#8a5a22', b: '#6a4418',
  W: '#f0e0c0', E: '#ffd800', K: '#201008',
};
const OWL1 = [
  'B......B',
  'BB....BB',
  'BBBBBBBB',
  'BEKBBKEB',
  'BBBWWBBB',
  'bWWWWWWb',
  'bWWWWWWb',
  '.bbBBbb.',
  '..K..K..',
];
const OWL2 = [
  'B......B',
  'BB....BB',
  'BBBBBBBB',
  'BBBBBBBB',
  'BBBWWBBB',
  'bWWWWWWb',
  'bWWWWWWb',
  '.bbBBbb.',
  '..K..K..',
];

// ---------------------------------------------------------------- items ----

const BUCKET = makeSprite([
  '.DDDDDD.',
  'D......D',
  'AwwwwwwA',
  '.AwwwwwA',
  '.AwwwwA.',
  '.AwwwwA.',
  '..AAAA..',
], { D: '#5a5e6e', A: '#8a8e9e', w: '#b8bcc8' });

const BUCKET_FULL = makeSprite([
  '.DDDDDD.',
  'DBBBBBBD',
  'ABbbbbBA',
  '.ABBBBA.',
  '.AwwwwA.',
  '.AwwwwA.',
  '..AAAA..',
], { D: '#5a5e6e', A: '#8a8e9e', w: '#b8bcc8', B: '#3060d0', b: '#60a0f0' });

const MUSHROOM = makeSprite([
  '..RRRR..',
  '.RWRRWR.',
  'RRRWRRRR',
  'RWRRRRWR',
  '..WWWW..',
  '..WWWW..',
  '..WWWW..',
], { R: '#e03030', W: '#f4f0e0' });

const CARROT = makeSprite([
  '....GG..',
  '..GGG...',
  '...G....',
  '..OOO...',
  '..OOO...',
  '.OOO....',
  '.OO.....',
  'OO......',
], { G: '#2a8c2a', O: '#f07818' });

const CROWN = makeSprite([
  'G..G..G..G',
  'G.GG.GG..G',
  'GGGGGGGGGG',
  'GJGGBGGJGG',
  'GGGGGGGGGG',
  'GGGGGGGGGG',
], { G: '#ffd800', J: '#ff5555', B: '#5555ff' });

// ------------------------------------------------------------- assembly ----

SPR.hero = {
  down: [HERO_DOWN, HERO_DOWN_W1, HERO_DOWN_W2].map(r => makeSprite(r, HERO_PAL)),
  up:   [HERO_UP, HERO_UP_W1, HERO_UP_W2].map(r => makeSprite(r, HERO_PAL)),
  left: [HERO_LEFT, HERO_LEFT_W1, HERO_LEFT_W2].map(r => makeSprite(r, HERO_PAL)),
};
SPR.hero.right = SPR.hero.left.map(flipped);

SPR.king = makeSprite(KING, KING_PAL);
SPR.guard = makeSprite(GUARD, GUARD_PAL);
SPR.goat = [makeSprite(GOAT1, GOAT_PAL), makeSprite(GOAT2, GOAT_PAL)];
SPR.goatR = SPR.goat.map(flipped);
SPR.troll = makeSprite(TROLL, TROLL_PAL);
SPR.dragon = [makeSprite(DRAGON1, DRAGON_PAL), makeSprite(DRAGON2, DRAGON_PAL)];
SPR.dragonL = SPR.dragon.map(flipped); // head toward the cave entrance
SPR.owl = [makeSprite(OWL1, OWL_PAL), makeSprite(OWL2, OWL_PAL)];
SPR.bucket = BUCKET;
SPR.bucketFull = BUCKET_FULL;
SPR.mushroom = MUSHROOM;
SPR.carrot = CARROT;
SPR.crown = CROWN;
