// All art is procedurally generated pixel art — original designs, no ripped assets.
// Sprites are authored as string grids; letters index into a per-sprite palette.

export const SPR = {};
export const TILES = {};

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

const HERO_PAL = {
  H: '#0aa7a0', // cap & shirt (teal)
  O: '#f07818', // overalls (orange)
  S: '#ffcf9e', // skin
  D: '#50321a', // hair, eyes
  B: '#6b3f16', // boots
  Y: '#ffd800', // buttons
};
const HERO_FIRE_PAL = {
  H: '#f4f4f4', O: '#e04830', S: '#ffcf9e', D: '#50321a', B: '#a02818', Y: '#ffd800',
};

const HERO_SMALL = {
  idle: [
    '....HHHHHH......',
    '...HHHHHHHHHH...',
    '...DDDSSSDS.....',
    '..DSDSSSSSDSS...',
    '..DSDDSSSSSDSS..',
    '..DDSSSSSDDDD...',
    '....SSSSSSSS....',
    '...HHHOOHHH.....',
    '..HHHHOOHHHH....',
    '.HHHHOOOOOHHH...',
    '.SSHHOYOOYOHSS..',
    '.SSSOOOOOOOOSS..',
    '.SSOOOOOOOOOOS..',
    '....OOO..OOO....',
    '...BBBB..BBBB...',
    '..BBBBB..BBBBB..',
  ],
  walk1: [
    '....HHHHHH......',
    '...HHHHHHHHHH...',
    '...DDDSSSDS.....',
    '..DSDSSSSSDSS...',
    '..DSDDSSSSSDSS..',
    '..DDSSSSSDDDD...',
    '....SSSSSSSS....',
    '...HHHOOHHH.....',
    '..HHHHOOHHHHSS..',
    '..HHHOOOOOHHSS..',
    '..SSHOYOOYOHH...',
    '..SSOOOOOOOO....',
    '...OOOOOOOOO....',
    '....OOOOOB......',
    '...BBBB.BBB.....',
    '....BBBB.BBB....',
  ],
  walk2: [
    '....HHHHHH......',
    '...HHHHHHHHHH...',
    '...DDDSSSDS.....',
    '..DSDSSSSSDSS...',
    '..DSDDSSSSSDSS..',
    '..DDSSSSSDDDD...',
    '....SSSSSSSS....',
    '...HHHOOHHH.....',
    '..HHHHOOHHHH....',
    '..HHHOOOOOHHH...',
    '..SSHOYOOYOHSS..',
    '..SSOOOOOOOOSS..',
    '...OOO..OOOO....',
    '..OOO....OOO....',
    '.BBB......BBB...',
    'BBBB......BBBB..',
  ],
  jump: [
    '....HHHHHH..SS..',
    '...HHHHHHHHHSSS.',
    '...DDDSSSDS.SS..',
    '..DSDSSSSSDSHH..',
    '..DSDDSSSSSDHH..',
    '..DDSSSSSDDDHH..',
    '....SSSSSSSHH...',
    '..SSHHHOOHHHH...',
    '..SSHHOOOOHHH...',
    '..SHHOOOOOOHH...',
    '...HOYOOOYOH....',
    '...OOOOOOOOO....',
    '..OOOOOOOOOOO...',
    '..OOOO...OOOO...',
    '..BBBB....BBBB..',
    '..BBB......BBB..',
  ],
  skid: [
    '......HHHHHH....',
    '...HHHHHHHHHH...',
    '.....SDSSSDDD...',
    '...SSDSSSSSDSD..',
    '..SSDSSSSSDDSD..',
    '...DDDDSSSSSDD..',
    '....SSSSSSSS....',
    '....HHHOOHHH....',
    '..SSHHOOOOHHH...',
    '..SSHOOOOOOHH...',
    '...HHOYOOYOHH...',
    '...OOOOOOOOOO...',
    '...OOOOOOOOO....',
    '....OOO..OOO....',
    '...BBBB..BBBB...',
    '..BBBBB..BBBB...',
  ],
};

const HERO_BIG = {
  idle: [
    '.....HHHHHH.....',
    '....HHHHHHHHHH..',
    '....DDDSSSSDS...',
    '...DSDSSSSSSDS..',
    '...DSDDSSSSSDSS.',
    '...DDSSSSSSDDD..',
    '.....SSSSSSSS...',
    '....HHHHOOHH....',
    '...HHHHHOOHHH...',
    '..HHHHHOOOOHHH..',
    '..HHHHOOOOOOHH..',
    '.SSHHHOYOOYOHSS.',
    '.SSSHHOOOOOOSSS.',
    '.SSOOOOOOOOOOSS.',
    '..SOOOOOOOOOOS..',
    '....OOOOOOOO....',
    '....OOOOOOOO....',
    '....OOOOOOOO....',
    '....OOO..OOO....',
    '....OOO..OOO....',
    '....OOO..OOO....',
    '...BBBB..BBBB...',
    '..BBBBB..BBBBB..',
    '..BBBBB..BBBBB..',
  ],
  walk1: [
    '.....HHHHHH.....',
    '....HHHHHHHHHH..',
    '....DDDSSSSDS...',
    '...DSDSSSSSSDS..',
    '...DSDDSSSSSDSS.',
    '...DDSSSSSSDDD..',
    '.....SSSSSSSS...',
    '....HHHHOOHH....',
    '...HHHHHOOHHH...',
    '..HHHHHOOOOHHSS.',
    '..HHHHOOOOOOHSS.',
    '..SHHHOYOOYOHS..',
    '..SSHHOOOOOOO...',
    '..SSOOOOOOOOO...',
    '...OOOOOOOOOO...',
    '....OOOOOOOO....',
    '....OOOOOOOO....',
    '....OOOOOOO.....',
    '.....OOOOOB.....',
    '....OOOOBBB.....',
    '...OOO.BBBB.....',
    '...BBB..BBBB....',
    '..BBBB..........',
    '..BBBBB.........',
  ],
  walk2: [
    '.....HHHHHH.....',
    '....HHHHHHHHHH..',
    '....DDDSSSSDS...',
    '...DSDSSSSSSDS..',
    '...DSDDSSSSSDSS.',
    '...DDSSSSSSDDD..',
    '.....SSSSSSSS...',
    '....HHHHOOHH....',
    '...HHHHHOOHHH...',
    '..HHHHHOOOOHHH..',
    '..HHHHOOOOOOHH..',
    '.SSHHHOYOOYOHSS.',
    '.SSSHHOOOOOOSSS.',
    '.SSOOOOOOOOOOSS.',
    '..SOOOOOOOOOOS..',
    '....OOOOOOOO....',
    '....OOOOOOOO....',
    '...OOOO..OOOO...',
    '...OOO....OOO...',
    '..OOO......OOO..',
    '..BBB......BBB..',
    '.BBBB......BBBB.',
    'BBBB........BBBB',
    '................',
  ],
  jump: [
    '.....HHHHHH.SS..',
    '....HHHHHHHHSSS.',
    '....DDDSSSSDSS..',
    '...DSDSSSSSSDHH.',
    '...DSDDSSSSSDHH.',
    '...DDSSSSSSDDHH.',
    '.....SSSSSSSHH..',
    '....HHHHOOHHHH..',
    '...HHHHHOOHHHH..',
    '..SHHHHOOOOHHH..',
    '..SSHHOOOOOOHH..',
    '..SSHHOYOOYOH...',
    '...SHHOOOOOOO...',
    '...OOOOOOOOOO...',
    '..OOOOOOOOOOOO..',
    '..OOOOOOOOOOOO..',
    '...OOOOOOOOOO...',
    '...OOOO..OOOO...',
    '...OOO....OOO...',
    '..OOOO....OOOO..',
    '..BBBB....BBBB..',
    '..BBBB....BBBB..',
    '..BBB......BBB..',
    '................',
  ],
  skid: [
    '.......HHHHHH...',
    '....HHHHHHHHHH..',
    '......SDSSSSDDD.',
    '....SSDSSSSSSDD.',
    '...SSDSSSSSSDDS.',
    '....DDDDSSSSSD..',
    '......SSSSSSS...',
    '.....HHHHOOHH...',
    '...SHHHHHOOHHH..',
    '..SSHHHOOOOOHH..',
    '..SSHHOOOOOOHH..',
    '...SHHOYOOYOHH..',
    '....HHOOOOOOHH..',
    '...OOOOOOOOOOO..',
    '...OOOOOOOOOOO..',
    '....OOOOOOOO....',
    '....OOOOOOOO....',
    '....OOOOOOOO....',
    '....OOO..OOO....',
    '....OOO..OOO....',
    '...OOOO..OOO....',
    '...BBBB..BBBB...',
    '..BBBBB..BBBB...',
    '..BBBB....BBBB..',
  ],
  crouch: [
    '.....HHHHHH.....',
    '....HHHHHHHHHH..',
    '....DDDSSSSDS...',
    '...DSDSSSSSSDS..',
    '...DSDDSSSSSDSS.',
    '...DDSSSSSSDDD..',
    '.....SSSSSSSS...',
    '...HHHHHOOHHH...',
    '..HHHHHOOOOHHH..',
    '.SSHHHOYOOYOHSS.',
    '.SSOOOOOOOOOOSS.',
    '..SOOOOOOOOOOS..',
    '....OOOOOOOO....',
    '....OOO..OOO....',
    '...BBBB..BBBB...',
    '..BBBBB..BBBBB..',
  ],
};

// -------------------------------------------------------------- enemies ----

const GOOMBA_PAL = { C: '#a04808', F: '#e8c890', W: '#f8f8f8', K: '#181008' };
const GOOMBA = [
  '................',
  '.....CCCCCC.....',
  '....CCCCCCCC....',
  '...CCCCCCCCCC...',
  '..CCCCCCCCCCCC..',
  '..CWWKCCCCKWWC..',
  '.CCWWKCCCCKWWCC.',
  '.CCCCCCCCCCCCCC.',
  '.CCCCCCCCCCCCCC.',
  '.CCCFFFFFFFFCCC.',
  '..CCFFFFFFFFCC..',
  '...CFFFFFFFFC...',
  '....FFFFFFFF....',
  '..KKKKK..KKKKK..',
  '.KKKKKK..KKKKKK.',
  '................',
];
const GOOMBA_FLAT = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....CCCCCCCC....',
  '..CCCCCCCCCCCC..',
  '.CWWKCCCCCCKWWC.',
  '.CCCCCCCCCCCCCC.',
  '.KKKKKKKKKKKKKK.',
  '.KKKK......KKKK.',
  '................',
];

const KOOPA_PAL = { G: '#10a848', L: '#88e070', Y: '#f8d048', W: '#f8f8f8', K: '#181008', S: '#f8a848' };
const KOOPA1 = [
  '....YYYY........',
  '...YYYYYY.......',
  '...YKYYYY.......',
  '...YYKYYY.......',
  '...YYYYY........',
  '....YYY.GGGG....',
  '....YY.GGLLGG...',
  '....YYGGLGGLGG..',
  '.....GGLGGGGLG..',
  '....GGGLGGGGLGG.',
  '....GGGLGGGGLGG.',
  '....GGGGLLLLGG..',
  '.....GGGGGGGG...',
  '....YYY..YYY....',
  '...YYYY..YYYY...',
  '..SSSS....SSSS..',
];
const KOOPA2 = [
  '....YYYY........',
  '...YYYYYY.......',
  '...YKYYYY.......',
  '...YYKYYY.......',
  '...YYYYY........',
  '....YYY.GGGG....',
  '....YY.GGLLGG...',
  '....YYGGLGGLGG..',
  '.....GGLGGGGLG..',
  '....GGGLGGGGLGG.',
  '....GGGLGGGGLGG.',
  '....GGGGLLLLGG..',
  '.....GGGGGGGG...',
  '.....YYY.YYY....',
  '....YYYY.YYY....',
  '...SSSS...SSSS..',
];
const SHELL = [
  '.....GGGGGG.....',
  '...GGGLLLLGG....',
  '..GGLLGGGGLLGG..',
  '..GLGGLLLLGGLG..',
  '.GGLGLLGGLLGLGG.',
  '.GGLGLGGGGLGLGG.',
  '.GGLGLLGGLLGLGG.',
  '..GLGGLLLLGGLG..',
  '..GGLLGGGGLLGG..',
  '...GGGLLLLGGG...',
  '....GGGGGGGG....',
  '.....WWWWWW.....',
];

// ---------------------------------------------------------------- items ----

const MUSH_PAL = { R: '#e03828', W: '#f8f8f8', S: '#ffcf9e', K: '#181008' };
const MUSHROOM = [
  '.....RRRRRR.....',
  '...RRRWWWWRR....',
  '..RRWWWWWWRRRR..',
  '..RWWWWRRRRRWR..',
  '.RRWWWRRRRRWWWR.',
  '.RWWWRRRRRRWWWR.',
  '.RWWRRRRRRRRWWR.',
  '.RRRRRRRRRRRRRR.',
  '..WWWWWWWWWWWW..',
  '..WWKWWWWWWKWW..',
  '..WWKWWWWWWKWW..',
  '...WWWWWWWWWW...',
  '....WWWWWWWW....',
];

const FLOWER_PAL = { F: '#f88030', W: '#f8f8f8', Y: '#f8d048', G: '#10a848', L: '#88e070' };
const FLOWER = [
  '....FFF..FFF....',
  '...FWWFFFFWWF...',
  '...FWFYYYYFWF...',
  '...FFFYYYYFFF...',
  '....FFFYYFFF....',
  '.....FFFFFF.....',
  '.......GG.......',
  '..LL...GG...LL..',
  '..LLL..GG..LLL..',
  '...LLL.GG.LLL...',
  '....LLLGGLLL....',
  '......LGGL......',
  '.......GG.......',
];

const COIN_PAL = { Y: '#f8b800', O: '#e07800', W: '#fff8c0' };
const COIN_FRAMES = [
  [
    '.....YYYYYY.....',
    '....YYWWYYYY....',
    '...YYWWYYYYYY...',
    '...YWWYYYYYYO...',
    '..YYWWYYYYYYOO..',
    '..YWWYYYYYYYOO..',
    '..YWWYYYYYYYOO..',
    '..YWWYYYYYYYOO..',
    '..YWWYYYYYYYOO..',
    '..YYWWYYYYYYOO..',
    '...YWWYYYYYYO...',
    '...YYWWYYYYYY...',
    '....YYWWYYYY....',
    '.....YYYYYY.....',
  ],
  [
    '......YYYY......',
    '.....YWWYYY.....',
    '.....YWYYYO.....',
    '....YWWYYYYO....',
    '....YWWYYYYO....',
    '....YWWYYYYO....',
    '....YWWYYYYO....',
    '....YWWYYYYO....',
    '....YWWYYYYO....',
    '....YWWYYYYO....',
    '....YWWYYYYO....',
    '.....YWYYYO.....',
    '.....YYYYYO.....',
    '......YYYY......',
  ],
  [
    '.......YY.......',
    '.......YY.......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '......YYYO......',
    '.......YY.......',
    '.......YY.......',
  ],
];

const FIREBALL = [
  '..WW..',
  '.WYYW.',
  'WYYRYW',
  'WYRRYW',
  '.WYYW.',
  '..WW..',
];
const FIREBALL_PAL = { W: '#fff8c0', Y: '#f8b800', R: '#e03828' };

// ---------------------------------------------------------------- tiles ----

function makeTile(draw) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  draw(c.getContext('2d'));
  return c;
}

function buildTiles() {
  const brickBase = '#c85820', brickDark = '#78290c', brickLight = '#f0a060';

  TILES.ground = makeTile(g => {
    g.fillStyle = brickBase; g.fillRect(0, 0, 16, 16);
    g.fillStyle = brickLight; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
    g.fillStyle = brickDark;
    g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1);
    g.fillRect(7, 1, 1, 6); g.fillRect(15, 1, 1, 6);
    g.fillRect(3, 8, 1, 7); g.fillRect(11, 8, 1, 7);
  });

  TILES.brick = makeTile(g => {
    g.fillStyle = brickBase; g.fillRect(0, 0, 16, 16);
    g.fillStyle = brickLight; g.fillRect(0, 0, 16, 1);
    g.fillStyle = brickDark;
    g.fillRect(0, 3, 16, 1); g.fillRect(0, 7, 16, 1); g.fillRect(0, 11, 16, 1); g.fillRect(0, 15, 16, 1);
    g.fillRect(5, 0, 1, 3); g.fillRect(11, 4, 1, 3); g.fillRect(5, 8, 1, 3); g.fillRect(11, 12, 1, 3);
  });

  TILES.q = makeTile(g => {
    g.fillStyle = '#f8a800'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#fff0a0'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
    g.fillStyle = '#a84800'; g.fillRect(15, 0, 1, 16); g.fillRect(0, 15, 16, 1);
    g.fillStyle = '#a84800';
    g.fillRect(1, 1, 2, 2); g.fillRect(13, 1, 2, 2); g.fillRect(1, 13, 2, 2); g.fillRect(13, 13, 2, 2);
    // question mark
    g.fillRect(5, 3, 6, 2); g.fillRect(4, 4, 2, 2); g.fillRect(10, 4, 2, 3);
    g.fillRect(8, 7, 3, 2); g.fillRect(7, 8, 2, 2); g.fillRect(7, 12, 2, 2);
  });

  TILES.used = makeTile(g => {
    g.fillStyle = '#985030'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#c88060'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
    g.fillStyle = '#502010'; g.fillRect(15, 0, 1, 16); g.fillRect(0, 15, 16, 1);
    g.fillStyle = '#502010';
    g.fillRect(2, 2, 2, 2); g.fillRect(12, 2, 2, 2); g.fillRect(2, 12, 2, 2); g.fillRect(12, 12, 2, 2);
  });

  TILES.hard = makeTile(g => {
    g.fillStyle = '#d0885c'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#f8c8a0'; g.fillRect(0, 0, 15, 2); g.fillRect(0, 0, 2, 15);
    g.fillStyle = '#78290c'; g.fillRect(15, 0, 1, 16); g.fillRect(0, 15, 16, 1);
    g.fillRect(14, 1, 1, 14); g.fillRect(1, 14, 14, 1);
  });

  const pipeBody = '#18b830', pipeLight = '#98e888', pipeDark = '#005810';
  TILES.pipeTL = makeTile(g => {
    g.fillStyle = pipeBody; g.fillRect(0, 0, 16, 16);
    g.fillStyle = pipeLight; g.fillRect(1, 0, 3, 16); g.fillRect(0, 0, 16, 1);
    g.fillStyle = pipeDark; g.fillRect(0, 0, 1, 16); g.fillRect(0, 15, 16, 1); g.fillRect(10, 1, 2, 14);
  });
  TILES.pipeTR = makeTile(g => {
    g.fillStyle = pipeBody; g.fillRect(0, 0, 16, 16);
    g.fillStyle = pipeLight; g.fillRect(0, 0, 16, 1); g.fillRect(4, 1, 2, 14);
    g.fillStyle = pipeDark; g.fillRect(15, 0, 1, 16); g.fillRect(0, 15, 16, 1); g.fillRect(12, 1, 2, 14);
  });
  TILES.pipeL = makeTile(g => {
    g.fillStyle = pipeBody; g.fillRect(0, 0, 16, 16);
    g.fillStyle = pipeLight; g.fillRect(3, 0, 3, 16);
    g.fillStyle = pipeDark; g.fillRect(2, 0, 1, 16); g.fillRect(11, 0, 2, 16);
  });
  TILES.pipeR = makeTile(g => {
    g.fillStyle = pipeBody; g.fillRect(0, 0, 16, 16);
    g.fillStyle = pipeLight; g.fillRect(5, 0, 2, 16);
    g.fillStyle = pipeDark; g.fillRect(13, 0, 1, 16); g.fillRect(10, 0, 2, 16);
  });
}

// ---------------------------------------------------------------- build ----

function frames(def, pal) {
  const out = {};
  for (const [name, rows] of Object.entries(def)) {
    const img = makeSprite(rows, pal);
    out[name] = { r: img, l: flipped(img) };
  }
  return out;
}

export function initSprites() {
  SPR.heroSmall = frames(HERO_SMALL, HERO_PAL);
  SPR.heroBig = frames(HERO_BIG, HERO_PAL);
  SPR.heroSmallFire = frames(HERO_SMALL, HERO_FIRE_PAL);
  SPR.heroBigFire = frames(HERO_BIG, HERO_FIRE_PAL);

  const goomba = makeSprite(GOOMBA, GOOMBA_PAL);
  SPR.goomba = [{ r: goomba, l: flipped(goomba) }];
  SPR.goombaFlat = makeSprite(GOOMBA_FLAT, GOOMBA_PAL);

  const k1 = makeSprite(KOOPA1, KOOPA_PAL), k2 = makeSprite(KOOPA2, KOOPA_PAL);
  SPR.koopa = [{ r: flipped(k1), l: k1 }, { r: flipped(k2), l: k2 }]; // authored facing left
  SPR.shell = makeSprite(SHELL, KOOPA_PAL);

  SPR.mushroom = makeSprite(MUSHROOM, MUSH_PAL);
  SPR.flower = makeSprite(FLOWER, FLOWER_PAL);
  SPR.coin = COIN_FRAMES.map(f => makeSprite(f, COIN_PAL));
  SPR.fireball = makeSprite(FIREBALL, FIREBALL_PAL);

  buildTiles();
}

// Draw sprite bottom-center aligned on an entity's hitbox.
export function drawEntity(g, img, e, camX) {
  const x = Math.round(e.x + e.w / 2 - img.width / 2 - camX);
  const y = Math.round(e.y + e.h - img.height);
  g.drawImage(img, x, y);
}

// ------------------------------------------------------------ tiny font ----

const FONT = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
  '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001001010010', '8': '111101111101111',
  '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011',
  D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111',
  J: '001001001101010', K: '101110100110101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110110101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111',
  V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '-': '000000111000000', 'x': '000101010101000', '!': '010010010000010',
  '.': '000000000000010', '*': '010111010111010', ':': '000010000010000',
};

export function drawText(g, text, x, y, color = '#ffffff') {
  g.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    if (ch === ' ') { cx += 4; continue; }
    const bits = FONT[ch];
    if (bits) {
      for (let i = 0; i < 15; i++) {
        if (bits[i] === '1') g.fillRect(cx + (i % 3), y + (i / 3 | 0), 1, 1);
      }
    }
    cx += 4;
  }
  return cx;
}
