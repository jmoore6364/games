// Pixel art: string-grid sprites baked to offscreen canvases at init,
// plus procedural bubbles, tiles and effects. All original art.

// ---- palette ----
const PAL = {
  g: '#38c048', // dragon green
  G: '#187828', // dragon dark green
  v: '#e8f8a8', // pale belly
  w: '#f8f8f8', // white
  d: '#101010', // outline / pupil
  r: '#f84040', // mouth red
  y: '#f8d838', // yellow
  o: '#e07820', // orange
  p: '#c060e0', // purple
  m: '#903090', // dark purple
  c: '#40d8d8', // cyan
  C: '#1878a8', // dark cyan
  b: '#3858c8', // blue
  k: '#583818', // brown
  q: '#a8a8b8', // grey
  x: '#f82818', // bright red
  n: '#f8b088', // peach
};

// Cyan dragon (player 2) — swap the greens for cyans.
const PAL_P2 = { ...PAL, g: '#40c8d8', G: '#186888', v: '#d8f8f8' };
// Angry flash — body colours swapped to furious red/white.
const angryPal = { ...PAL, p: '#f84040', m: '#a81010', c: '#f86060', C: '#a81010', y: '#f88060', o: '#c02010', b: '#f84040', v: '#f8d0d0' };

function bake(rows, pal = PAL) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export const SPR = {};
const defs = [];
function def(name, rows, opts = {}) { defs.push([name, rows, opts]); }

// ======================= PLAYER: Moore the dragon =======================
// Round little bubble dragon, faces right. 16x16.

def('d_stand', [
  '....g.....g.....',
  '...gg....gg.....',
  '...gggggggg.....',
  '..ggwdggwdgg....',
  '..ggwdggwdgg....',
  '.Ggggggggggggg..',
  'GGggggrrrrggg...',
  '.Gggggggggggg...',
  '..ggvvvvvvgg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..ggvvvvvvgg....',
  '...gggggggg.....',
  '...gg....gg.....',
  '..ggg....ggg....',
], { p2: true });

def('d_walk1', [
  '....g.....g.....',
  '...gg....gg.....',
  '...gggggggg.....',
  '..ggwdggwdgg....',
  '..ggwdggwdgg....',
  '.Ggggggggggggg..',
  'GGggggrrrrggg...',
  '.Gggggggggggg...',
  '..ggvvvvvvgg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..ggvvvvvvgg....',
  '...gggggggg.....',
  '..gg......gg....',
  '.ggg......ggg...',
], { p2: true });

def('d_walk2', [
  '................',
  '....g.....g.....',
  '...gg....gg.....',
  '...gggggggg.....',
  '..ggwdggwdgg....',
  '..ggwdggwdgg....',
  '.Ggggggggggggg..',
  'GGggggrrrrggg...',
  '.Gggggggggggg...',
  '..ggvvvvvvgg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..ggvvvvvvgg....',
  '...gggggggg.....',
  '....gg..gg......',
  '...ggg..ggg.....',
], { p2: true });

def('d_jump', [
  '....g.....g.....',
  '...gg....gg.....',
  '...gggggggg.....',
  '..ggwdggwdgg....',
  '..ggwdggwdgg....',
  '.Ggggggggggggg..',
  'GGggggrrrrggg...',
  '.Gggggggggggg...',
  '..ggvvvvvvgg....',
  '.ggvvvvvvvvgg...',
  '.ggvvvvvvvvgg...',
  '..gvvvvvvvvg....',
  '..ggvvvvvvgg....',
  '...gggggggg.....',
  '....gg..gg......',
  '....gg..gg......',
], { p2: true });

def('d_blow', [
  '....g.....g.....',
  '...gg....gg.....',
  '...gggggggg.....',
  '..ggwdggwdgg....',
  '..ggwdggwdgg....',
  '.Gggggggggggggg.',
  'GGgggggrrrrrrgg.',
  '.Ggggggrrrrrrg..',
  '..ggvvvggggg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..ggvvvvvvgg....',
  '...gggggggg.....',
  '...gg....gg.....',
  '..ggg....ggg....',
], { p2: true });

def('d_dead', [
  '....g.....g.....',
  '...gg....gg.....',
  '...gggggggg.....',
  '..ggdgdgdgdg....',
  '..gggdgggdgg....',
  '..ggdgdgdgdg....',
  '.Gggggggggggg...',
  'GGgggrrrrgggg...',
  '.Ggggggggggg....',
  '..ggvvvvvvgg....',
  '..gvvvvvvvvg....',
  '..gvvvvvvvvg....',
  '..ggvvvvvvgg....',
  '...gggggggg.....',
  '..gg......gg....',
  '.gg........gg...',
], { p2: true });

// ======================= ENEMIES =======================
// Walker "Grumble" — stomping wind-up toy, purple. (Zen-Chan style)
def('e_walk1', [
  '..pp........pp..',
  '..ppp......ppp..',
  '...pppppppppp...',
  '..pppppppppppp..',
  '.ppwwdppppwwdpp.',
  '.ppwwdppppwwdpp.',
  '.pppppppppppppp.',
  '.ppmmmmmmmmmmpp.',
  '.ppmwmwmwmwmmpp.',
  '.pppppppppppppp.',
  '..pppppppppppp..',
  '...pppppppppp...',
  '...ppp....ppp...',
  '..ppp......ppp..',
  '..pp........pp..',
  '................',
], { angry: true });

def('e_walk2', [
  '................',
  '..pp........pp..',
  '..ppp......ppp..',
  '...pppppppppp...',
  '..pppppppppppp..',
  '.ppwwdppppwwdpp.',
  '.ppwwdppppwwdpp.',
  '.pppppppppppppp.',
  '.ppmmmmmmmmmmpp.',
  '.ppmwmwmwmwmmpp.',
  '.pppppppppppppp.',
  '..pppppppppppp..',
  '...pppppppppp...',
  '....pp....pp....',
  '...ppp....ppp...',
  '................',
], { angry: true });

// Jumper "Springo" — coiled hopper, yellow-orange.
def('e_jump1', [
  '....yy....yy....',
  '...yyy....yyy...',
  '...yyyyyyyyyy...',
  '..yyyyyyyyyyyy..',
  '..ywwdyyyywwdy..',
  '..ywwdyyyywwdy..',
  '..yyyyyyyyyyyy..',
  '..yyyooooooyyy..',
  '..yyyyyyyyyyyy..',
  '...yyyyyyyyyy...',
  '....oooooooo....',
  '...oo..oo..oo...',
  '....oooooooo....',
  '...oo......oo...',
  '..ooo......ooo..',
  '................',
], { angry: true });

def('e_jump2', [
  '....yy....yy....',
  '...yyy....yyy...',
  '...yyyyyyyyyy...',
  '..yyyyyyyyyyyy..',
  '..ywwdyyyywwdy..',
  '..ywwdyyyywwdy..',
  '..yyyyyyyyyyyy..',
  '..yyyooooooyyy..',
  '..yyyyyyyyyyyy..',
  '...yyyyyyyyyy...',
  '....oooooooo....',
  '....oooooooo....',
  '....oo....oo....',
  '....oo....oo....',
  '...ooo....ooo...',
  '................',
], { angry: true });

// Floater "Puffish" — balloon whale, cyan, no legs. (Monsta style)
def('e_float1', [
  '................',
  '.....cccccc.....',
  '...cccccccccc...',
  '..cccwwdccccccc.',
  '.ccccwwdcccccccc',
  '.cccccccccccccC.',
  'ccccccccccccccC.',
  'cCCcccccccccCC..',
  'ccccccccccccc...',
  '.cccccccccccc...',
  '..ccccccccccC...',
  '...ccCCCCCCC....',
  '.....CC..CC.....',
  '....CC....CC....',
  '................',
  '................',
], { angry: true });

def('e_float2', [
  '................',
  '.....cccccc.....',
  '...cccccccccc...',
  '..cccwwdccccccc.',
  '.ccccwwdcccccccc',
  '.cccccccccccccC.',
  'ccccccccccccccC.',
  'cCCcccccccccCC..',
  'ccccccccccccc...',
  '.cccccccccccc...',
  '..ccccccccccC...',
  '...ccCCCCCCC....',
  '....CC..CC......',
  '.....CC..CC.....',
  '................',
  '................',
], { angry: true });

// Spitter "Grogg" — grumpy hooded lobber, blue. (Drunk style)
def('e_spit1', [
  '.....bbbbbb.....',
  '....bbbbbbbb....',
  '...bbbbbbbbbb...',
  '...bbwdbbwdbb...',
  '...bbwdbbwdbb...',
  '...bbbbbbbbbb...',
  '...bbbxxxxbbb...',
  '...bbbbbbbbbb...',
  '..bbnbbbbbbnbb..',
  '..bnnbbbbbbnnb..',
  '...bbbbbbbbbb...',
  '...bbbbbbbbbb...',
  '....bbbbbbbb....',
  '....bb....bb....',
  '...bbb....bbb...',
  '................',
], { angry: true });

def('e_spit2', [
  '.....bbbbbb.....',
  '....bbbbbbbb....',
  '...bbbbbbbbbb...',
  '...bbwdbbwdbb...',
  '...bbwdbbwdbb...',
  '...bbbbbbbbbb...',
  '...bbxxxxxxbb...',
  '...bbbbbbbbbb...',
  '..bnnbbbbbbnnb..',
  '..bnbbbbbbbbnb..',
  '...bbbbbbbbbb...',
  '...bbbbbbbbbb...',
  '....bbbbbbbb....',
  '...bb......bb...',
  '..bbb......bbb..',
  '................',
], { angry: true });

// Baron von Bones — invincible hurry-up skull.
def('skull', [
  '....wwwwwwww....',
  '..wwwwwwwwwwww..',
  '.wwwwwwwwwwwwww.',
  '.wwwwwwwwwwwwww.',
  '.wwddwwwwwwddww.',
  '.wdddwwwwwwdddw.',
  '.wwddwwwwwwddww.',
  '.wwwwwwddwwwwww.',
  '.wwwwwddddwwwww.',
  '..wwwwwwwwwwww..',
  '..wdwdwdwdwdww..',
  '..wwdwdwdwdwww..',
  '...wwwwwwwwww...',
  '....w.w..w.w....',
  '................',
  '................',
]);

// ======================= ITEMS (10x10) =======================
def('f_banana', [
  '......kk..',
  '.....yyk..',
  '....yyyy..',
  '...yyyyy..',
  '..yyyyy...',
  '.yyyyyy...',
  '.yyyyy....',
  '.yyyy.....',
  '..yy......',
  '..........',
]);

def('f_orange', [
  '....kk....',
  '...ooo....',
  '..ooooo...',
  '.ooooooo..',
  '.owoooooo.',
  '.ooooooo..',
  '.ooooooo..',
  '..ooooo...',
  '...ooo....',
  '..........',
]);

def('f_melon', [
  '....kk....',
  '..gggggg..',
  '.gGgggGgg.',
  '.ggggggggg',
  'gGggGgggGg',
  '.gggggggg.',
  '.ggGgggGg.',
  '..gggggg..',
  '...gggg...',
  '..........',
]);

def('f_gem', [
  '..........',
  '..cwcccc..',
  '.cwcccccc.',
  '.wccccccc.',
  '.cccccccc.',
  '..ccccccc.',
  '...ccccc..',
  '....ccc...',
  '.....c....',
  '..........',
]);

def('i_shoes', [
  '..........',
  '..........',
  '..xx......',
  '..xxx.....',
  '..xxxx....',
  '..xxxxxx..',
  '.xxxxxxxx.',
  '.wwwwwwww.',
  '..........',
  '..........',
]);

def('i_fastbub', [
  '...cccc...',
  '..c....c..',
  '.c.ww...c.',
  '.c.w....c.',
  '.c......c.',
  '.c......c.',
  '..c....c..',
  '...cccc...',
  '..........',
  '..........',
]);

def('i_range', [
  '....pp....',
  '...pppp...',
  '..pwpppp..',
  '..pppppp..',
  '..pppppp..',
  '...pppp...',
  '....pp....',
  '....kk....',
  '....kk....',
  '....kk....',
]);

def('i_candy', [
  '...xxx....',
  '..xwwxx...',
  '..xwxxx...',
  '...xxx....',
  '....kk....',
  '....kk....',
  '....kk....',
  '....kk....',
  '..........',
  '..........',
]);

// spitter projectile
def('rock', [
  '.qq.',
  'qqqq',
  'qqqq',
  '.qq.',
]);

export function initSprites() {
  for (const [name, rows, opts] of defs) {
    SPR[name] = bake(rows);
    if (opts.p2) SPR[name + '_p2'] = bake(rows, PAL_P2);
    if (opts.angry) SPR[name + '_angry'] = bake(rows, angryPal);
  }
  bakeTiles();
}

export function drawSprite(ctx, name, x, y, flip = false, w = 0, h = 0) {
  const s = SPR[name];
  if (!s) return;
  const dw = w || s.width, dh = h || s.height;
  if (!flip) { ctx.drawImage(s, Math.round(x), Math.round(y), dw, dh); return; }
  ctx.save();
  ctx.translate(Math.round(x) + dw, Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(s, 0, 0, dw, dh);
  ctx.restore();
}

// ======================= TILES =======================
// One 16x16 block canvas per theme; themes rotate every 5 rounds.

export const THEMES = [
  { name: 'SODA CAVES', a: '#3858c8', b: '#182888', c: '#7898f8', bg: '#000010' },
  { name: 'MINT WOODS', a: '#38a848', b: '#186028', c: '#78e888', bg: '#00100a' },
  { name: 'CARAMEL KEEP', a: '#e07820', b: '#904810', c: '#f8b858', bg: '#100800' },
  { name: 'GRAPE TOWERS', a: '#a848d8', b: '#602888', c: '#d888f8', bg: '#0c0014' },
];

const tileCanvases = [];
function bakeTiles() {
  for (const th of THEMES) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = th.b;
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = th.a;
    g.fillRect(1, 1, 14, 14);
    g.fillStyle = th.c;
    g.fillRect(1, 1, 14, 2);
    g.fillRect(1, 1, 2, 14);
    g.fillStyle = th.b;
    // brick notches
    g.fillRect(4, 6, 3, 2);
    g.fillRect(10, 10, 3, 2);
    g.fillRect(8, 3, 2, 2);
    tileCanvases.push(c);
  }
}

export function drawLevelTile(ctx, theme, x, y) {
  ctx.drawImage(tileCanvases[theme % tileCanvases.length], x, y);
}

// ======================= BUBBLES & EFFECTS =======================

export function drawBubble(ctx, cx, cy, r, t, color = '#a8e8f8', hot = false) {
  const wob = Math.sin(t / 9) * 0.9;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = hot ? '#f88060' : color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r + wob * 0.5, r - wob * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r + wob * 0.5, r - wob * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(cx - r * 0.5, cy - r * 0.55, 2, 2);
  ctx.fillRect(cx - r * 0.62, cy - r * 0.3, 1, 1);
  ctx.restore();
}

export function drawPop(ctx, cx, cy, t) {
  // t: 0..8 — four droplets flying outward
  const d = 2 + t * 1.6;
  ctx.fillStyle = t < 4 ? '#d8f8f8' : '#88c8e8';
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    ctx.fillRect(Math.round(cx + dx * d) - 1, Math.round(cy + dy * d) - 1, 2, 2);
  }
  if (t < 4) {
    ctx.strokeStyle = '#f8f8f8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 + t * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
