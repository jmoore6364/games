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
// Jason Moore: the last white leisure suit in America. Black silk shirt,
// gold chain, platform shoes, unearned confidence.

const HERO_PAL = {
  H: '#5a3a1a', // hair
  S: '#ffcf9e', // skin
  E: '#201008', // eyes
  W: '#f0ece0', // suit
  w: '#c4bca8', // suit shade
  K: '#20242c', // black shirt
  G: '#ffd800', // gold chain
  B: '#7a4a22', // platform shoes
};

const HERO_DOWN = [
  '....HHHH....',
  '...HHHHHH...',
  '...HSSSSH...',
  '...SESSES...',
  '...SSSSSS...',
  '....SSSS....',
  '...WWWWWW...',
  '..WWKKKKWW..',
  '.wWKKKKKKWw.',
  '.wWKKGGKKWw.',
  '.SwWKKKKWwS.',
  '.S.wWWWWw.S.',
  '...WWWWWW...',
  '...wWWWWw...',
  '...WW..WW...',
  '...WW..WW...',
  '...WW..WW...',
  '...WW..WW...',
  '..BBB..BBB..',
  '..BBB..BBB..',
];
const HERO_DOWN_W1 = HERO_DOWN.slice(0, 14).concat([
  '...WW..WW...',
  '...WW..WW...',
  '..WW....WW..',
  '..WW....WW..',
  '.BBB....BBB.',
  '.BBB....BBB.',
]);
const HERO_DOWN_W2 = HERO_DOWN.slice(0, 14).concat([
  '...WWWWWW...',
  '....WWWW....',
  '....WWWW....',
  '....WWWW....',
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
  '...WWWWWW...',
  '..WWWWWWWW..',
  '.wWWWWWWWWw.',
  '.wWWWWWWWWw.',
  '.SwWWWWWWwS.',
  '.S.wWWWWw.S.',
  '...WWWWWW...',
  '...wWWWWw...',
  '...WW..WW...',
  '...WW..WW...',
  '...WW..WW...',
  '...WW..WW...',
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
  '...WWWWWW...',
  '..WWWWWWWW..',
  '..wKKWWWWw..',
  '..wKGWWWWw..',
  '..wKKWWWWw..',
  '..SwWWWWwS..',
  '...WWWWWW...',
  '...wWWWWw...',
  '....WWWW....',
  '....WWWW....',
  '....WWWW....',
  '....WWWW....',
  '...BBBB.....',
  '...BBBB.....',
];
const HERO_LEFT_W1 = HERO_LEFT.slice(0, 14).concat([
  '...WW.WW....',
  '...WW..WW...',
  '..WW....WW..',
  '..WW....WW..',
  '.BBB....BBB.',
  '.BBB....BBB.',
]);
const HERO_LEFT_W2 = HERO_LEFT.slice(0, 14).concat([
  '....WWWW....',
  '....WWWW....',
  '...WW.WW....',
  '...WW.WW....',
  '..BBB.BBB...',
  '..BBB.BBB...',
]);

// The Point. One arm skyward, one hip cocked. You know the pose.
const HERO_DANCE = [
  '..........S.',
  '..........S.',
  '....HHHH.W..',
  '...HHHHHHW..',
  '...HSSSSW...',
  '...SESSEW...',
  '...SSSSSS...',
  '....SSSS....',
  '...WWWWWW...',
  '..WWKKKKWW..',
  '.SwKKGGKKWw.',
  '.S.wKKKKWwS.',
  '...WWWWWWS..',
  '...wWWWWw...',
  '...WW.WW....',
  '...WW..WW...',
  '..WW....WW..',
  '..WW....WW..',
  '.BBB....BBB.',
  '.BBB....BBB.',
];

// ----------------------------------------------------------------- npcs ----

// Sticky, the philosopher-bartender of Sticky's Lounge.
const STICKY_PAL = {
  S: '#ffcf9e', E: '#201008', M: '#4a2c12',
  W: '#f4f4f4', V: '#282830', A: '#b8b8c0', B: '#4a2c12',
};
const STICKY = [
  '....SSSS....',
  '...MSSSSM...',
  '...SSSSSS...',
  '...SESSES...',
  '...SMMMMS...',
  '....SSSS....',
  '...WWWWWW...',
  '..VWWWWWWV..',
  '.VVWWWWWWVV.',
  '.VVWWWWWWVV.',
  '.SVVWWWWVVS.',
  '.S.VWWWWV.S.',
  '...AAAAAA...',
  '...AAAAAA...',
  '...AAAAAA...',
  '...AAAAAA...',
  '...AA..AA...',
  '...AA..AA...',
  '..BBB..BBB..',
  '..BBB..BBB..',
];

// Earl, a barstool fixture since the Ford administration.
const EARL_PAL = {
  C: '#7a5a2a', S: '#e8b88e', E: '#201008',
  J: '#3a6a3a', j: '#2a4a2a', P: '#6a5a4a', B: '#3a3230', T: '#8a5a22',
};
const EARL = [
  '...CCCC.......',
  '..CCCCCC......',
  '..SSSSSS......',
  '..SESSES......',
  '..SSSSSS......',
  '.JJSSSSJJ.....',
  '.JJJJJJJJJ....',
  '.JJJJJJJJJJ...',
  '.jJJJJJJJJJS..',
  '.jJJJJJJJJJS..',
  '..jJJJJJJJ....',
  '..PPPPPPPP....',
  '..PP....PP....',
  '..PP....PP....',
  '.BBB....BBB...',
  '..TTTTTTTT....',
  '...T....T.....',
  '...T....T.....',
  '...T....T.....',
  '..TT....TT....',
];

// Vince, the Quickie Mart clerk. Has seen everything. Twice.
const VINCE_PAL = {
  H: '#282018', S: '#ffcf9e', E: '#201008',
  W: '#f4f4f4', R: '#c03030', r: '#8a1c1c', B: '#4a2c12', P: '#3a3a44',
};
const VINCE = [
  '....HHHH....',
  '...HHHHHH...',
  '...HSSSSH...',
  '...SESSES...',
  '...SSSSSS...',
  '....SSSS....',
  '...WWWWWW...',
  '..RWWWWWWR..',
  '.RRWWWWWWRR.',
  '.RRWWWWWWRR.',
  '.SRrWWWWrRS.',
  '.S.RRRRRR.S.',
  '...RRRRRR...',
  '...rRRRRr...',
  '...PP..PP...',
  '...PP..PP...',
  '...PP..PP...',
  '...PP..PP...',
  '..BBB..BBB..',
  '..BBB..BBB..',
];

// Bruno the bouncer. Arms like carry-on luggage.
const BOUNCER_PAL = {
  S: '#c89868', E: '#201008', D: '#181818',
  K: '#20242c', k: '#14161c', P: '#2a2a34', B: '#181818',
};
const BOUNCER = [
  '....SSSS.....',
  '...SSSSSS....',
  '...DDDDDD....',
  '...SSSSSS....',
  '....SSSS.....',
  '..KKKKKKKK...',
  '.KKKKKKKKKK..',
  'KKKKKKKKKKKK.',
  'KSKKKKKKKKSK.',
  'SSKKKKKKKKSS.',
  '.SSSSKKSSSS..',
  '..kKKKKKKk...',
  '..PPPPPPPP...',
  '..PPPPPPPP...',
  '..PP....PP...',
  '..PP....PP...',
  '..PP....PP...',
  '..PP....PP...',
  '.BBB....BBB..',
  '.BBB....BBB..',
];

const GUARD_PAL = {
  S: '#ffcf9e', E: '#201008', D: '#181818',
  K: '#701818', k: '#4a1010', P: '#282830', B: '#181818',
};

// Delilah. The most dangerous thing in Neon City is her raised eyebrow.
const DELILAH_PAL = {
  H: '#241a10', S: '#f4c398', E: '#201008',
  R: '#e02858', r: '#a01838', B: '#e02858',
};
const DELILAH = [
  '..HHHHHH..',
  '.HHHHHHHH.',
  '.HHSSSSHH.',
  '.HSESSESH.',
  '.HHSSSSHH.',
  '.HH.SS.HH.',
  '.H.RRRR.H.',
  '.HRRRRRRH.',
  '..RrRRrR..',
  '.SRRRRRRS.',
  '.S.RRRR.S.',
  '...RRRR...',
  '...RRRR...',
  '..RRRRRR..',
  '..RRRRRR..',
  '.RRrRRrRR.',
  '...S..S...',
  '...S..S...',
  '...B..B...',
];
const DELILAH_DANCE = [
  'S.......S.',
  'S.HHHHH.S.',
  '.HHHHHHH..',
  '.HHSSSSH..',
  '.HSESSES..',
  '.HHSSSSH..',
  '.SH.SS.HS.',
  '..SRRRRS..',
  '..RRRRRR..',
  '..RrRRrR..',
  '..RRRRRR..',
  '...RRRR...',
  '...RRRR...',
  '..RRRRRR..',
  '.RRRRRRRR.',
  '.RRrRRrRR.',
  '...S..S...',
  '..S....S..',
  '..B....B..',
];

// Anonymous disco patrons: the hero grid in louder colors.
const DANCER1_PAL = {
  H: '#181008', S: '#c89868', E: '#201008',
  W: '#8828c0', w: '#601c8a', K: '#f0e0a0', G: '#ffd800', B: '#181818',
};
const DANCER2_PAL = {
  H: '#c8a030', S: '#f4c398', E: '#201008',
  R: '#28a048', r: '#187030', B: '#f0f0f0',
};

// The taxis of Neon City: fast, yellow, and legally blameless.
const TAXI_PAL = {
  Y: '#ffd800', y: '#c8a838', K: '#181818', W: '#88ccee', H: '#fff8c0',
};
const TAXI = [
  '.........YYYYYYYYYYYYY..........',
  '........YWWWYYYYYYWWWY..........',
  '.......YYWWWYYYYYYWWWYY.........',
  'yYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYH',
  'YKYKYKYKYKYKYKYKYKYKYKYKYKYKYKYY',
  'yYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYy',
  '....KKK...............KKK.......',
  '...KKKKK.............KKKKK......',
  '....KKK...............KKK.......',
];

// Duchess, the alley cat. Judges you from atop the dumpster.
const CAT_PAL = { K: '#8a8a96', k: '#5a5a66', E: '#55FF55', P: '#e8a8a8' };
const CAT = [
  '.K...K......',
  '.KK.KK......',
  '.KKKKK......',
  '.KEKEK......',
  '.KPKKK......',
  '.KKKKKKKKk..',
  '.KKKKKKKKKk.',
  '..KK...KK.k.',
  '..K.....K.k.',
];

// ---------------------------------------------------------------- items ----

const FIZZ = makeSprite([
  '...CC...',
  '...CC...',
  '..pppp..',
  '..PPPP..',
  '..PGGP..',
  '..PGGP..',
  '..PPPP..',
  '..pppp..',
], { C: '#c8c8d0', P: '#8030c0', p: '#601c8a', G: '#f0f0f0' });

const MINTS = makeSprite([
  '.WWWWWW.',
  'WWGGGGWW',
  'WGWWWWGW',
  'WGWWWWGW',
  'WWGGGGWW',
  '.WWWWWW.',
], { W: '#f4f4f4', G: '#2a8c2a' });

const ROSE = makeSprite([
  '..RRR...',
  '.RRrRR..',
  '.RrRrR..',
  '..RRR...',
  '...G....',
  '..GG.G..',
  '...GG...',
  '...G....',
], { R: '#e02858', r: '#a01838', G: '#2a8c2a' });

const CARD = makeSprite([
  'GGGGGGGGGG',
  'GggggggggG',
  'GgKKgKgKgG',
  'GggggggggG',
  'GgKKKKKggG',
  'GGGGGGGGGG',
], { G: '#ffd800', g: '#c8a838', K: '#7a0000' });

const LOCKET = makeSprite([
  '.C....C.',
  '..C..C..',
  '...CC...',
  '.GG.GG..',
  'GGGGGGG.',
  'GGGGGGG.',
  '.GGGGG..',
  '..GGG...',
  '...G....',
], { C: '#c8a838', G: '#ffd800' });

// ------------------------------------------------------------- assembly ----

SPR.hero = {
  down: [HERO_DOWN, HERO_DOWN_W1, HERO_DOWN_W2].map(r => makeSprite(r, HERO_PAL)),
  up:   [HERO_UP, HERO_UP_W1, HERO_UP_W2].map(r => makeSprite(r, HERO_PAL)),
  left: [HERO_LEFT, HERO_LEFT_W1, HERO_LEFT_W2].map(r => makeSprite(r, HERO_PAL)),
};
SPR.hero.right = SPR.hero.left.map(flipped);
SPR.heroDance = [makeSprite(HERO_DOWN, HERO_PAL), makeSprite(HERO_DANCE, HERO_PAL)];

SPR.sticky = makeSprite(STICKY, STICKY_PAL);
SPR.earl = makeSprite(EARL, EARL_PAL);
SPR.vince = makeSprite(VINCE, VINCE_PAL);
SPR.bouncer = makeSprite(BOUNCER, BOUNCER_PAL);
SPR.guard = makeSprite(BOUNCER, GUARD_PAL);
SPR.delilah = makeSprite(DELILAH, DELILAH_PAL);
SPR.delilahDance = [makeSprite(DELILAH, DELILAH_PAL), makeSprite(DELILAH_DANCE, DELILAH_PAL)];
SPR.dancer1 = [HERO_DOWN, HERO_DOWN_W1, HERO_DOWN_W2].map(r => makeSprite(r, DANCER1_PAL));
SPR.dancer2 = [makeSprite(DELILAH, DANCER2_PAL), makeSprite(DELILAH_DANCE, DANCER2_PAL)];
SPR.taxi = makeSprite(TAXI, TAXI_PAL);
SPR.taxiL = flipped(SPR.taxi);
SPR.cat = makeSprite(CAT, CAT_PAL);
SPR.catR = flipped(SPR.cat);

SPR.fizz = FIZZ;
SPR.mints = MINTS;
SPR.rose = ROSE;
SPR.card = CARD;
SPR.locket = LOCKET;
