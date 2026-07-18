// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural tiles, flames and effects. All original art.

// ---- shared palette ----
const PAL = {
  d: '#101018', // outline / eyes
  w: '#ffffff', // glint / gloves
  f: '#f8f8f8', // face plate (always white)
  q: '#a8a8b8', // fuse gray
  y: '#f8d838', // gold
  o: '#f890b8', // balloon pink
  O: '#c05880', // balloon shade
  u: '#4890f0', // chaser blue
  U: '#2050a8', // chaser shade
  n: '#f8a020', // speedy orange
  N: '#b06010', // speedy shade
  v: '#d0e0f8', // ghost pale
  V: '#8898c8', // ghost shade
  r: '#e83828', // red accent
  k: '#202028', // bomb black
  g: '#40c040', // green accent
};

// Per-player suit colors (c = suit, C = suit shade).
export const PLAYER_COLORS = ['white', 'black', 'red', 'blue'];
const SUITS = {
  white: { c: '#f0f0f4', C: '#9898b0' },
  black: { c: '#484858', C: '#242430' },
  red: { c: '#e84838', C: '#8c1c10' },
  blue: { c: '#4878f0', C: '#1c38a0' },
};

function bake(rows, pal = PAL) {
  const h = rows.length;
  let w = 0;
  for (const r of rows) w = Math.max(w, r.length);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export const SPR = {};

// ======================= players =======================
// 16x16 round-helmet bomber. Front / back / side, 2 leg frames each.

const BODY_TOP = [
  '.....dddddd.....',
  '....dccccccd....',
  '...dccccccccd...',
];
const LEGS_STAND = [
  '....dccddccd....',
  '....dCCddCCd....',
  '.....dd..dd.....',
];
const LEGS_WALK = [
  '...dccd..dccd...',
  '...dCCd..dCCd...',
  '....dd....dd....',
];

function bmFront(legs) {
  return [
    ...BODY_TOP,
    '...dcffffffcd...',
    '..dcffffffffcd..',
    '..dcfdffffdfcd..',
    '..dcfdffffdfcd..',
    '...dcffffffcd...',
    '....dccccccd....',
    '..ddccccccccdd..',
    '.dwwdCccccCdwwd.',
    '.dwd.dccccd.dwd.',
    '..d..dccccd..d..',
    ...legs,
  ];
}

function bmBack(legs) {
  return [
    ...BODY_TOP,
    '...dccccccccd...',
    '..dccccccccccd..',
    '..dccCccccCccd..',
    '..dccCccccCccd..',
    '...dccccccccd...',
    '....dccccccd....',
    '..ddccccccccdd..',
    '.dwwdCccccCdwwd.',
    '.dwd.dccccd.dwd.',
    '..d..dccccd..d..',
    ...legs,
  ];
}

function bmSide(legs) {
  return [
    ...BODY_TOP,
    '...dccccffffd...',
    '..dcccccfffffd..',
    '..dcccccffdffd..',
    '..dcccccffdffd..',
    '...dccccffffd...',
    '....dccccccd....',
    '...dccccccccd...',
    '...dCccccccwd...',
    '....dcccccwwd...',
    '.....dccccd.....',
    ...legs,
  ];
}

const LEGS_SIDE_STAND = [
  '.....dcccd......',
  '.....dCCCd......',
  '......ddd.......',
];
const LEGS_SIDE_WALK = [
  '...dccd.dccd....',
  '...dCCd.dCCd....',
  '....dd...dd.....',
];

// ======================= enemies =======================

const E_BALLOON = [
  '................',
  '................',
  '.....dddddd.....',
  '....dooooood....',
  '...dooooooood...',
  '..dooooooooood..',
  '..dodooooooodod.',
  '..dooooooooood..',
  '..dooodddoooood.',
  '..dooooooooood..',
  '...doOOOOOOod...',
  '....doOOOOod....',
  '.....dddddd.....',
  '....dd....dd....',
  '................',
  '................',
];

const E_CHASER = [
  '................',
  '................',
  '..dd........dd..',
  '..dud......dud..',
  '...dudddddgud...'.replace('g', 'u'),
  '...duuuuuuuud...',
  '..duduuuuuudud..',
  '..dudduuuuddud..',
  '..duuuuuuuuuud..',
  '..duudddddduud..',
  '..duuuuuuuuuud..',
  '...dUUUUUUUUd...',
  '....dUUUUUUd....',
  '.....dddddd.....',
  '....dd....dd....',
  '................',
];

const E_SPEEDY = [
  '................',
  '.......dd.......',
  '......dnnd......',
  '.....dnnnnd.....',
  '....dnnnnnnd....',
  '...dnnwnnwnnd...',
  '..dnnnwnnwnnnd..',
  '.dnnnnnnnnnnnnd.',
  '..dnnndnndnnnd..',
  '...dnnnddnnnd...',
  '....dNNNNNNd....',
  '.....dNNNNd.....',
  '......dNNd......',
  '.......dd.......',
  '................',
  '................',
];

const E_GHOST = [
  '................',
  '................',
  '.....dddddd.....',
  '....dvvvvvvd....',
  '...dvvvvvvvvd...',
  '..dvvdvvvvdvvd..',
  '..dvvdvvvvdvvd..',
  '..dvvvvvvvvvvd..',
  '..dvvvdvvdvvvd..',
  '..dvvvvvvvvvvd..',
  '..dvvvvvvvvvvd..',
  '..dvVvvVvvVvvd..',
  '..dvdVvdVvdVvd..',
  '..dd.dd.dd.ddd..',
  '................',
  '................',
];

// ======================= powerup icons (8x8) =======================

const ICONS = {
  bombs: [
    '.....dd.',
    '....dd..',
    '..kkkk..',
    '.kkwkkk.',
    '.kwkkkk.',
    '.kkkkkk.',
    '.kkkkkk.',
    '..kkkk..',
  ],
  fire: [
    '...r....',
    '..rr.r..',
    '..rrrr..',
    '.rryrrr.',
    '.ryyyrr.',
    'rryyyyr.',
    'rryyyyrr',
    '.rrrrrr.',
  ],
  speed: [
    '....dd..',
    '...ddd..',
    '..ddd...',
    '.dddddd.',
    '...ddd..',
    '..ddd...',
    '.ddd....',
    '.dd.....',
  ],
  kick: [
    '..dd....',
    '..dbd...'.replace('b', 'd'),
    '..ddd...',
    '..ddd...',
    '..dddd..',
    '..ddddd.',
    'w.......',
    '.w.w.w..',
  ],
  remote: [
    '.qq.....',
    '.qq.....',
    'rrrrrr..',
    'rrrrrr..',
    'rrwrrr..',
    'rrrrrr..',
    '......yy',
    '.....yy.',
  ],
  pass: [
    '..kkkk..',
    '.kwkkkk.',
    'kk.kk.kk',
    'kkkkkkkk',
    'kk.kk.kk',
    '.kkkkkk.',
    'k.k..k.k',
    '........',
  ],
};

// ======================= themes =======================

export const THEMES = [
  { name: 'GREEN MEADOW', floor: '#78c850', floor2: '#70bc4c', soft: '#d8a048', soft2: '#a87028', hard: '#a0a8b8', hard2: '#666e80', music: 'play' },
  { name: 'SAND RUINS', floor: '#d8c088', floor2: '#ccb680', soft: '#c08850', soft2: '#8c5c30', hard: '#98a090', hard2: '#5c645c', music: 'play' },
  { name: 'ICE FIELD', floor: '#a8d0e8', floor2: '#9cc6e0', soft: '#7898d8', soft2: '#4860a0', hard: '#8890a8', hard2: '#505870', music: 'play' },
  { name: 'MAGMA KEEP', floor: '#b06848', floor2: '#a86040', soft: '#784038', soft2: '#4c2420', hard: '#687078', hard2: '#3c4248', music: 'play' },
  { name: 'BALLOON THRONE', floor: '#9078a8', floor2: '#8870a0', soft: '#b05880', soft2: '#743050', hard: '#585868', hard2: '#30303c', music: 'boss' },
];

function bakeHard(theme) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = theme.hard2; g.fillRect(0, 0, 16, 16);
  g.fillStyle = theme.hard; g.fillRect(1, 1, 14, 14);
  g.fillStyle = '#ffffff33'; g.fillRect(1, 1, 14, 2); g.fillRect(1, 1, 2, 14);
  g.fillStyle = theme.hard2; g.fillRect(3, 13, 12, 2); g.fillRect(13, 3, 2, 12);
  g.fillStyle = theme.hard2;
  g.fillRect(4, 4, 8, 8);
  g.fillStyle = theme.hard; g.fillRect(5, 5, 6, 6);
  return c;
}

function bakeSoft(theme) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = theme.soft; g.fillRect(0, 0, 16, 16);
  g.fillStyle = theme.soft2;
  g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1);
  g.fillRect(0, 5, 16, 1); g.fillRect(0, 10, 16, 1);
  // staggered brick joints
  g.fillRect(5, 1, 1, 4); g.fillRect(11, 1, 1, 4);
  g.fillRect(2, 6, 1, 4); g.fillRect(8, 6, 1, 4); g.fillRect(14, 6, 1, 4);
  g.fillRect(5, 11, 1, 4); g.fillRect(11, 11, 1, 4);
  g.fillStyle = '#ffffff2e'; g.fillRect(0, 1, 16, 1);
  return c;
}

function bakeBomb() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  // pixel circle
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const dx = x - 6, dy = y - 6;
      if (dx * dx + dy * dy <= 38) {
        g.fillStyle = dx * dx + dy * dy >= 27 ? '#000008' : PAL.k;
        g.fillRect(x + 1.5, y + 3, 1, 1);
      }
    }
  }
  g.fillStyle = '#585868'; g.fillRect(4, 6, 3, 2); g.fillRect(5, 5, 2, 2);
  g.fillStyle = PAL.q; g.fillRect(7, 1, 2, 2); g.fillRect(8, 0, 2, 2);
  return c;
}

function bakeBoss() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  // big balloon body
  for (let y = 0; y < 26; y++) {
    for (let x = 0; x < 26; x++) {
      const dx = x - 12.5, dy = y - 12.5;
      const dd = dx * dx + dy * dy;
      if (dd <= 165) {
        let col = '#d84860';
        if (dd >= 130) col = '#101018';
        else if (dy > 5) col = '#902848';
        g.fillRect(x + 3, y + 5, 1, 1);
        g.fillStyle = col;
        g.fillRect(x + 3, y + 5, 1, 1);
      }
    }
  }
  // crown
  g.fillStyle = PAL.y;
  g.fillRect(10, 1, 12, 4);
  g.fillRect(10, 0, 2, 2); g.fillRect(15, 0, 2, 2); g.fillRect(20, 0, 2, 2);
  g.fillStyle = '#b08000'; g.fillRect(10, 4, 12, 1);
  // angry eyes
  g.fillStyle = '#101018';
  g.fillRect(9, 12, 4, 4); g.fillRect(19, 12, 4, 4);
  g.fillRect(8, 10, 5, 2); g.fillRect(19, 10, 5, 2);
  g.fillStyle = '#ffffff'; g.fillRect(10, 13, 2, 2); g.fillRect(20, 13, 2, 2);
  // mouth with teeth
  g.fillStyle = '#101018'; g.fillRect(11, 20, 10, 4);
  g.fillStyle = '#ffffff'; g.fillRect(12, 20, 2, 2); g.fillRect(16, 20, 2, 2); g.fillRect(19, 22, 2, 2);
  return c;
}

function bakePowerup(icon) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#101018'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#f8b048'; g.fillRect(1, 1, 14, 14);
  g.fillStyle = '#fce8a0'; g.fillRect(1, 1, 14, 2);
  g.fillStyle = '#b87020'; g.fillRect(1, 13, 14, 2);
  const ic = bake(icon);
  g.drawImage(ic, 4, 4);
  return c;
}

function bakeExit() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#303038'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#585868'; g.fillRect(1, 1, 14, 14);
  g.fillStyle = '#101018'; g.fillRect(3, 4, 10, 12);
  g.fillStyle = '#f8d838'; g.fillRect(4, 5, 8, 2);
  g.fillStyle = '#282838'; g.fillRect(4, 8, 8, 8);
  return c;
}

export function initSprites() {
  // players in 4 suit colors
  for (const col of PLAYER_COLORS) {
    const pal = { ...PAL, ...SUITS[col] };
    SPR[`bm_${col}_down0`] = bake(bmFront(LEGS_STAND), pal);
    SPR[`bm_${col}_down1`] = bake(bmFront(LEGS_WALK), pal);
    SPR[`bm_${col}_up0`] = bake(bmBack(LEGS_STAND), pal);
    SPR[`bm_${col}_up1`] = bake(bmBack(LEGS_WALK), pal);
    SPR[`bm_${col}_side0`] = bake(bmSide(LEGS_SIDE_STAND), pal);
    SPR[`bm_${col}_side1`] = bake(bmSide(LEGS_SIDE_WALK), pal);
  }
  SPR.e_balloon = bake(E_BALLOON);
  SPR.e_chaser = bake(E_CHASER);
  SPR.e_speedy = bake(E_SPEEDY);
  SPR.e_ghost = bake(E_GHOST);
  SPR.boss = bakeBoss();
  SPR.bomb = bakeBomb();
  SPR.exit = bakeExit();
  for (const k of Object.keys(ICONS)) SPR[`pu_${k}`] = bakePowerup(ICONS[k]);
  THEMES.forEach((t, i) => {
    SPR[`hard${i}`] = bakeHard(t);
    SPR[`soft${i}`] = bakeSoft(t);
  });
}

export function drawSprite(ctx, name, x, y, flip = false) {
  const s = SPR[name];
  if (!s) return;
  if (!flip) { ctx.drawImage(s, Math.round(x), Math.round(y)); return; }
  ctx.save();
  ctx.translate(Math.round(x) + s.width, Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(s, 0, 0);
  ctx.restore();
}

// ---- flames (procedural, animated) ----
// kind: 'c' center, 'h'/'v' arms, 'l','r','u','d' end caps.
export function drawFlame(ctx, x, y, kind, t) {
  // envelope: grow fast, hold, shrink
  const life = 45;
  const k = t < 8 ? t / 8 : t > life - 12 ? Math.max(0, (life - t) / 12) : 1;
  const w1 = Math.round(7 * k) + 4;  // outer thickness
  const w2 = Math.max(2, w1 - 5);    // core thickness
  const cx = x + 8, cy = y + 8;
  const outer = t % 8 < 4 ? '#e84818' : '#f87818';
  const core = '#f8e850';
  const horiz = kind === 'h' || kind === 'l' || kind === 'r';
  ctx.fillStyle = outer;
  if (kind === 'c') {
    ctx.fillRect(cx - w1 / 2, y, w1, 16);
    ctx.fillRect(x, cy - w1 / 2, 16, w1);
  } else if (horiz) {
    ctx.fillRect(x, cy - w1 / 2, 16, w1);
  } else {
    ctx.fillRect(cx - w1 / 2, y, w1, 16);
  }
  // rounded end caps
  if (kind === 'l') ctx.fillRect(x + 2, cy - w1 / 2 - 1, 4, w1 + 2);
  if (kind === 'r') ctx.fillRect(x + 10, cy - w1 / 2 - 1, 4, w1 + 2);
  if (kind === 'u') ctx.fillRect(cx - w1 / 2 - 1, y + 2, w1 + 2, 4);
  if (kind === 'd') ctx.fillRect(cx - w1 / 2 - 1, y + 10, w1 + 2, 4);
  ctx.fillStyle = core;
  if (kind === 'c') {
    ctx.fillRect(cx - w2 / 2, y + 2, w2, 12);
    ctx.fillRect(x + 2, cy - w2 / 2, 12, w2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  } else if (horiz) {
    ctx.fillRect(x, cy - w2 / 2, 16, w2);
  } else {
    ctx.fillRect(cx - w2 / 2, y, w2, 16);
  }
}

// Crumbling soft block.
export function drawBreak(ctx, x, y, themeIdx, t) {
  const s = SPR[`soft${themeIdx}`];
  const ph = Math.min(3, (t / 8) | 0);
  const sz = 16 - ph * 4;
  const off = (16 - sz) / 2;
  ctx.drawImage(s, 0, 0, 16, 16, x + off, y + off, sz, sz);
}
