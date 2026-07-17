// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural tiles, bosses and effects. All original art.

// ---- palette ----
const PAL = {
  x: '#f82818', // bandana red
  X: '#a81008', // bandana dark
  s: '#f8b088', // skin
  S: '#c07858', // skin shade
  k: '#583818', // hair / boots brown
  b: '#3858c8', // pants blue
  B: '#182888', // pants dark
  w: '#e8e8e8', // white
  d: '#101010', // outline
  g: '#40a838', // enemy green
  G: '#1f6018', // enemy dark green
  q: '#a8a8b8', // grey metal
  Q: '#585868', // dark grey
  y: '#f8d838', // yellow
  o: '#e07820', // orange
  p: '#c060e0', // purple
  m: '#903090', // dark purple
  c: '#40d8d8', // cyan
  r: '#b02818', // dark red
  v: '#88f8b0', // pale alien green
};

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
function def(name, rows) { defs.push([name, rows]); }

// ======================= PLAYER: Sgt. Moore =======================
// Shirtless commando, red bandana, blue fatigues. 16 wide, faces right.
// The rifle is drawn separately (drawGun) so one body works for all aims.

def('p_stand', [
  '.....xxxxx......',
  '....xxxxxxx.....',
  '....Xkssssd.....',
  '....Xsssssd.....',
  '....Xssswsd.....',
  '.....ssss.......',
  '......ss........',
  '....ssssss......',
  '...sssssssss....',
  '...ssSssssss....',
  '...ss.Ssss......',
  '......Ssss......',
  '.....bbbbbb.....',
  '.....bBBbbb.....',
  '.....bb..bb.....',
  '.....bb..bb.....',
  '.....bb..bb.....',
  '.....bb..bb.....',
  '....kbb..bbk....',
  '....kb....bk....',
  '...kkb....bkk...',
  '...kk......kk...',
]);

def('p_run1', [
  '.....xxxxx......',
  '....xxxxxxx.....',
  '....Xkssssd.....',
  '....Xsssssd.....',
  '....Xssswsd.....',
  '.....ssss.......',
  '......ss........',
  '....ssssss......',
  '...sssssssss....',
  '...ssSssssss....',
  '...ss.Ssss......',
  '......Ssss......',
  '.....bbbbbb.....',
  '....bbbBbbb.....',
  '...bbb...bbb....',
  '..bbb.....bbb...',
  '..bb.......bb...',
  '.kbb.......bbk..',
  '.kb.........bk..',
  'kkb.........bkk.',
  'kk...........kk.',
  '................',
]);

def('p_run2', [
  '.....xxxxx......',
  '....xxxxxxx.....',
  '....Xkssssd.....',
  '....Xsssssd.....',
  '....Xssswsd.....',
  '.....ssss.......',
  '......ss........',
  '....ssssss......',
  '...sssssssss....',
  '...ssSssssss....',
  '...ss.Ssss......',
  '......Ssss......',
  '.....bbbbbb.....',
  '.....bBbbbb.....',
  '.....bbbbb......',
  '.....bb.bb......',
  '.....bb.bb......',
  '....kbb.bbk.....',
  '....kb...bk.....',
  '....kb...bk.....',
  '...kkb...bkk....',
  '................',
]);

def('p_run3', [
  '.....xxxxx......',
  '....xxxxxxx.....',
  '....Xkssssd.....',
  '....Xsssssd.....',
  '....Xssswsd.....',
  '.....ssss.......',
  '......ss........',
  '....ssssss......',
  '...sssssssss....',
  '...ssSssssss....',
  '...ss.Ssss......',
  '......Ssss......',
  '.....bbbbbb.....',
  '....bbBbbbb.....',
  '....bbb.bbb.....',
  '...bbb...bb.....',
  '...bb....bb.....',
  '..kbb....bbk....',
  '..kb......bk....',
  '..kb......bk....',
  '.kkb......bkk...',
  '................',
]);

// Somersault ball, rotated in code.
def('p_jump', [
  '.....xxxxxx.....',
  '....xxssssx.....',
  '...Xssssssss....',
  '...ssswsssss....',
  '..sssssssbbb....',
  '..ssSsssbbbb....',
  '..ss.ssbbBbbb...',
  '..sssssbbbbbb...',
  '...ssssbb.bbb...',
  '...sssbbb.bbk...',
  '....ssbbbbbkk...',
  '.....bbbbbkk....',
  '......bbbkk.....',
  '................',
  '................',
  '................',
]);

// Lying prone, rifle arm forward (gun still drawn separately).
def('p_prone', [
  '........................',
  '..kk.bbb.ssssxxx........',
  '.kkbbbbbbssssxxxss......',
  '.kbbbbbbBsssssswsssss...',
  '..bbbbbbbsssssssssss....',
  '........................',
]);

// Wading — torso above the waterline.
def('p_wade', [
  '.....xxxxx......',
  '....xxxxxxx.....',
  '....Xkssssd.....',
  '....Xsssssd.....',
  '....Xssswsd.....',
  '.....ssss.......',
  '......ss........',
  '....ssssss......',
  '...sssssssss....',
  '...ssSssssss....',
  '....s.Ssss......',
  '......Ssss......',
]);

// Fully submerged — just the bandana and eyes above water.
def('p_dive', [
  '.....xxxxx......',
  '....xxxxxxx.....',
  '....Xkssssd.....',
  '....Xssswsd.....',
]);

// Knocked back, the classic arc of defeat.
def('p_dead', [
  '......................',
  '....s..bbb...........x',
  '...ss.bbbbb..ssssss.xx',
  '..sssbbbbBbbsssssssxxk',
  '...s.bbbbbbb.sssswsxk.',
  '.....kk..kk.......ss..',
  '......................',
]);

// ======================= ENEMY SOLDIERS =======================

def('e_run1', [
  '.....ggggg......',
  '....ggggggg.....',
  '....Gdssssd.....',
  '....Gsssssd.....',
  '.....ssss.......',
  '....gggggg......',
  '...ggGgggggg....',
  '...gg.Ggggg.....',
  '......Gggg......',
  '.....GGGGG......',
  '....ggg.ggg.....',
  '...ggg...ggg....',
  '..ggg.....ggg...',
  '..gg.......gg...',
  '.dgg.......ggd..',
  '.dg.........gd..',
  'ddg.........gdd.',
  'dd...........dd.',
]);

def('e_run2', [
  '.....ggggg......',
  '....ggggggg.....',
  '....Gdssssd.....',
  '....Gsssssd.....',
  '.....ssss.......',
  '....gggggg......',
  '...ggGgggggg....',
  '...gg.Ggggg.....',
  '......Gggg......',
  '.....GGGGG......',
  '.....gggggg.....',
  '.....gg.gg......',
  '.....gg.gg......',
  '....dgg.ggd.....',
  '....dg...gd.....',
  '....dg...gd.....',
  '...ddg...gdd....',
  '................',
]);

// Kneeling rifleman.
def('e_rifle', [
  '.....ggggg......',
  '....ggggggg.....',
  '....Gdssssd.....',
  '....Gsssssd.....',
  '.....ssss.......',
  '....gggggggg....',
  '...ggGgggggggg..',
  '...gg.Ggggg.....',
  '.....GGGGG......',
  '....ggggggg.....',
  '...ggg..ggg.....',
  '...gg...ggg.....',
  '..dgg..gggdd....',
  '..ddddddddd.....',
]);

// Grenadier — arm raised to lob.
def('e_lobber', [
  '.......y........',
  '.....gg.s.......',
  '....gggss.......',
  '....Gdssssd.....',
  '....Gsssssd.....',
  '.....ssss.......',
  '....gggggg......',
  '...gGgggggg.....',
  '...gg.Ggggg.....',
  '......Gggg......',
  '.....GGGGG......',
  '.....gggggg.....',
  '.....gg.gg......',
  '.....gg.gg......',
  '....dgg.ggd.....',
  '....dg...gd.....',
  '...ddg...gdd....',
  '................',
]);

// ======================= ALIENS =======================

def('e_flyer1', [
  '..vv........vv..',
  '.vvvv......vvvv.',
  '.vvvvv.mm.vvvvv.',
  '..vvvmmmmmmvvv..',
  '....mmpppmmm....',
  '....mpprppm.....',
  '.....mpppm......',
  '......mmm.......',
  '.......m........',
]);

def('e_flyer2', [
  '................',
  '.....v....v.....',
  '.vv.vvv..vvv.vv.',
  '..vvvmmmmmmvvv..',
  '....mmpppmmm....',
  '....mpprppm.....',
  '.....mpppm......',
  '......mmm.......',
  '.......m........',
]);

def('e_larva1', [
  '................',
  '....vvv..vv.....',
  '..vvpppvvppv....',
  '.vpppppppppvv...',
  '.vprpppppppppv..',
  '..vvpppvvpppv...',
  '...dd..dd..dd...',
]);

def('e_larva2', [
  '................',
  '..vvv..vv..vv...',
  '.vpppvvppvvpv...',
  '.vprppppppppv...',
  '..vpppvvpppv....',
  '...dd..dd.dd....',
  '................',
]);

// ======================= PICKUP =======================
// Winged falcon capsule — the letter is drawn on top in code.

def('pickup', [
  '.qq..........qq.',
  'qwwq..oooo..qwwq',
  '.qwwqoooooooqwq.',
  '..qwooyyyyoowq..',
  '...ooyyyyyyoo...',
  '...ooyyyyyyoo...',
  '..qwooyyyyoowq..',
  '.qwwqoooooooqwq.',
  'qwwq..oooo..qwwq',
  '.qq..........qq.',
]);

export function initSprites() {
  for (const [name, rows] of defs) SPR[name] = bake(rows);
}

export function drawSprite(ctx, name, x, y, flip = false) {
  const c = SPR[name];
  if (!c) return;
  ctx.save();
  if (flip) {
    ctx.translate(Math.round(x) + c.width, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(c, 0, 0);
  } else {
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }
  ctx.restore();
}

export function drawSpriteRot(ctx, name, cx, cy, angle) {
  const c = SPR[name];
  if (!c) return;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(angle);
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  ctx.restore();
}

// ======================= THEMES & TILES =======================

export const THEMES = {
  jungle: {
    name: 'AREA 1 · JUNGLE PERIMETER',
    sky0: '#183048', sky1: '#284878',
    solid: '#7a4820', solidDark: '#4a2810', top: '#48a030', topLite: '#70d048',
    plat: '#8a6838', platDark: '#584018',
    music: 'jungle',
  },
  falls: {
    name: 'AREA 2 · THE FALLS',
    sky0: '#101828', sky1: '#203858',
    solid: '#607080', solidDark: '#303a48', top: '#8a9ab0', topLite: '#c8d8e8',
    plat: '#708090', platDark: '#404a58',
    music: 'falls',
  },
  base: {
    name: 'AREA 3 · DREADNOUGHT BASE',
    sky0: '#100818', sky1: '#201030',
    solid: '#586068', solidDark: '#282e34', top: '#8890a0', topLite: '#b8c0d0',
    plat: '#786858', platDark: '#483828',
    music: 'base',
  },
  hive: {
    name: 'AREA 4 · THE MOORLORD HIVE',
    sky0: '#180818', sky1: '#301028',
    solid: '#803048', solidDark: '#481828', top: '#b04868', topLite: '#e07898',
    plat: '#903858', platDark: '#502030',
    music: 'hive',
  },
};

// t: 1 solid, 2 platform, 3 water, 4 bridge. topOpen: no solid above.
export function drawTile(ctx, t, theme, x, y, frame, topOpen) {
  const th = THEMES[theme];
  if (t === 1) {
    ctx.fillStyle = th.solid;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = th.solidDark;
    ctx.fillRect(x + 2, y + 6, 5, 3); ctx.fillRect(x + 9, y + 11, 5, 3);
    ctx.fillRect(x + 10, y + 2, 4, 2);
    if (topOpen) {
      ctx.fillStyle = th.top;
      ctx.fillRect(x, y, 16, 4);
      ctx.fillStyle = th.topLite;
      ctx.fillRect(x, y, 16, 1);
      ctx.fillRect(x + ((x >> 4) * 7) % 12, y + 1, 2, 2);
    }
  } else if (t === 2) {
    ctx.fillStyle = th.plat;
    ctx.fillRect(x, y, 16, 6);
    ctx.fillStyle = th.platDark;
    ctx.fillRect(x, y + 4, 16, 2);
    ctx.fillStyle = th.topLite;
    ctx.fillRect(x, y, 16, 1);
  } else if (t === 3) {
    const ph = Math.sin((frame / 20) + x / 24);
    ctx.fillStyle = '#1858a8';
    ctx.fillRect(x, y + 4, 16, 12);
    ctx.fillStyle = '#3078c8';
    ctx.fillRect(x, y + 2, 16, 3);
    ctx.fillStyle = '#a8d8f8';
    ctx.fillRect(x + (ph > 0 ? 2 : 8), y + 2, 5, 1);
  } else if (t === 4) {
    ctx.fillStyle = '#906838';
    ctx.fillRect(x, y, 16, 6);
    ctx.fillStyle = '#583818';
    ctx.fillRect(x, y + 4, 16, 2);
    ctx.fillRect(x + 7, y, 2, 4);
    ctx.fillStyle = '#c8a060';
    ctx.fillRect(x, y, 16, 1);
  }
}

// Deep-water fill below a surface tile.
export function drawWaterBody(ctx, x, y) {
  ctx.fillStyle = '#10407e';
  ctx.fillRect(x, y, 16, 16);
}

// ======================= EXPLOSIONS =======================

export function drawBoom(ctx, x, y, t, big = false) {
  const r = (big ? 3 : 2) + t * (big ? 1.6 : 1.1);
  const colors = ['#f8f8d8', '#f8d838', '#e07820', '#b02818'];
  for (let i = 0; i < 4; i++) {
    const rr = r - i * (big ? 3 : 2);
    if (rr <= 0) continue;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMuzzle(ctx, x, y) {
  ctx.fillStyle = '#f8f8d8';
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.fillStyle = '#f8d838';
  ctx.fillRect(x - 1, y - 1, 2, 2);
}
