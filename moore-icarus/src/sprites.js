// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural tiles, bosses and props. All original art.

const PAL = {
  w: '#f0f0f8', // toga white
  W: '#c8d0e8', // toga / wing shade
  l: '#ffffff', // wing highlight
  s: '#f8c088', // skin
  S: '#c88858', // skin shade
  k: '#6b3f1c', // hair brown
  K: '#4a2a12', // hair dark
  y: '#f8d038', // bow / gold
  Y: '#c89818', // gold shade
  d: '#20202c', // outline
  g: '#48b048', // laurel green / slime
  G: '#2c7028', // dark green
  r: '#e04038', // red
  R: '#a02020', // dark red
  p: '#c060e0', // purple
  P: '#7838a0', // dark purple
  m: '#b0b0c0', // grey
  M: '#606074', // dark grey
  c: '#40d0e0', // cyan / eye
  o: '#e88028', // orange
  e: '#8038a0', // eggplant purple
  E: '#502068', // eggplant dark
  b: '#3858c8', // blue
  n: '#f8a0c0', // pink (nurse)
  t: '#f8e0b0', // bone / pale
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

// ======================= PLAYER: Pit-Moore =======================
// Winged angel, white toga, brown hair, gold bow. 16 wide, faces right.

def('p_stand', [
  '.....kkkk.......',
  '....kssssk......',
  '....ssssss......',
  '....sSslsd......',
  '.....ssss.......',
  '.l...wwww..y....',
  'llW.wwwwww.y....',
  '.lWwwwwwwwyy....',
  '..Wwwwwwww.y....',
  '...wwwwww..y....',
  '...wwwwww..y....',
  '....wwww...y....',
  '....s..s........',
  '....s..s........',
  '...ss..ss.......',
  '...kk..kk.......',
]);

def('p_run1', [
  '.....kkkk.......',
  '....kssssk......',
  '....ssssss......',
  '....sSslsd......',
  '.....ssss.......',
  '.l...wwww..y....',
  'llW.wwwwww.y....',
  '.lWwwwwwwwyy....',
  '..Wwwwwwww.y....',
  '...wwwwww..y....',
  '...wwwwww..y....',
  '....wwww........',
  '...ss..ss.......',
  '..ss....ss......',
  '.kk......kk.....',
  '................',
]);

def('p_run2', [
  '.....kkkk.......',
  '....kssssk......',
  '....ssssss......',
  '....sSslsd......',
  '.....ssss.......',
  '.l...wwww..y....',
  'llW.wwwwww.y....',
  '.lWwwwwwwwyy....',
  '..Wwwwwwww.y....',
  '...wwwwww..y....',
  '...wwwwww..y....',
  '....wwww...y....',
  '.....ss.........',
  '....ss..........',
  '...kkk..kk......',
  '.........kk.....',
]);

// Rising / jumping, wings spread.
def('p_jump', [
  '.....kkkk.......',
  '....kssssk......',
  '....ssssss......',
  '....sSslsd......',
  '.l...ssss..y....',
  'llW..wwww..y....',
  'lllWwwwwwwyy....',
  '.llwwwwwww.y....',
  '..lwwwwww..y....',
  '...wwwwww..y....',
  '....wwww........',
  '....ss.ss.......',
  '...ss...ss......',
  '..kk.....kk.....',
  '................',
  '................',
]);

// Crouch — low, bow forward.
def('p_crouch', [
  '................',
  '................',
  '.....kkkk.......',
  '....kssssk......',
  '....ssssss......',
  '....sSslsd......',
  '.l..wwwwww.y....',
  'llWwwwwwwwwy....',
  '.lWwwwwwwwwy....',
  '...wwwwwww......',
  '..sswwwwwss.....',
  '..kk....kk......',
]);

// Aiming up — bow raised overhead.
def('p_up', [
  '........y.......',
  '.....kkky.......',
  '....kssyy.......',
  '....sssy........',
  '....sSslsd......',
  '.l...ssss.......',
  'llW.wwwwww......',
  '.lWwwwwwwww.....',
  '..Wwwwwwww......',
  '...wwwwww.......',
  '...wwwwww.......',
  '....wwww........',
  '....s..s........',
  '....s..s........',
  '...ss..ss.......',
  '...kk..kk.......',
]);

// Eggplant curse form — a walking eggplant with tiny legs.
def('p_egg', [
  '.......gg.......',
  '......gGg.......',
  '.....gGg........',
  '....eeeee.......',
  '...eeeeeee......',
  '..eeeeeeeee.....',
  '..eeeeEeeee.....',
  '..eeeeeeeee.....',
  '..eeeeeeeee.....',
  '...eeeeeee......',
  '....eeeee.......',
  '.....eee........',
  '....k...k.......',
  '...kk...kk......',
  '................',
  '................',
]);

// Struck / dead — tumbling.
def('p_hurt', [
  '................',
  '..k.....y.......',
  '.kssk..yy.......',
  '.ssSs.wwww......',
  '..sswwwwwwww....',
  '..wwwwwwwwww....',
  '.ss.wwww..ss....',
  '.kk.......kk....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);

// ======================= ENEMIES =======================

// Monoeye — a single floating eyeball.
def('monoeye', [
  '...mmmmm...',
  '..mwwwwwm..',
  '.mwwcccwwm.',
  '.mwccdccwm.',
  '.mwcdddcwm.',
  '.mwccdccwm.',
  '.mwwcccwwm.',
  '..mwwwwwm..',
  '...mmmmm...',
]);

// Shemum — hopping blob.
def('shemum', [
  '...ggggg...',
  '..gGgggGg..',
  '.gggwgwggg.',
  '.gggdgdggg.',
  '.ggggggggg.',
  '.gGgggggGg.',
  '..ggggggg..',
  '...G.G.G...',
]);

// Nettler — grounded spiny charger.
def('nettler', [
  '.r..r..r...',
  'rRr.rRr.rRr',
  '.rrrrrrrr..',
  'rrRrrrrRrr.',
  'rrwrrrwrrr.',
  'rrdrrrdrrr.',
  '.rrrrrrrr..',
  '.R.R..R.R..',
]);

// Specknose — a big-nosed diving imp.
def('specknose', [
  '..pppppp...',
  '.pPpppppp..',
  '.pppwwppp..',
  '.pppddppp..',
  '.ppp..ppp..',
  '..ppoopp...',
  '...oooo....',
  '....oo.....',
]);

// Keepah / McGoo — stationary spawner urn.
def('keepah', [
  '..MMMMMM...',
  '.MmmmmmmM..',
  '.MmmccmmM..',
  '.MmccccmM..',
  '.MmcddcmM..',
  '.MmccccmM..',
  '.MmmmmmmM..',
  '.MMMMMMMM..',
  '..M.MM.M...',
]);

// Tamambo — armoured pillbug that curls.
def('tamambo', [
  '..MMMMMM...',
  '.MmwwwwmM..',
  'MmwWWWWwmM.',
  'MmwWccWwmM.',
  'MmwWWWWwmM.',
  'MmwwwwwwmM.',
  '.MmmmmmmM..',
  '..MMMMMM...',
]);

// Girin — a bobbing serpent head.
def('girin', [
  '...GGGG....',
  '..GgggggG..',
  '.GggwwgggG.',
  '.GggdwgggG.',
  '.GgggggggG.',
  '.GGgggggG..',
  '..rGGGGr...',
  '..r.rr.r...',
]);

// ======================= PROPS =======================

def('heart', [
  '.rr.rr.',
  'rRrrRRr',
  'rRRRRRr',
  'rRRRRRr',
  '.rRRRr.',
  '..rRr..',
  '...r...',
]);

def('pot', [
  '...MMM...',
  '.MMMMMMM.',
  'MmooooomM',
  'MoooooooM',
  'MoooooooM',
  'MoooooooM',
  '.MoooooM.',
  '..MMMMM..',
]);

def('chest', [
  '.yyyyyyy.',
  'yYYYYYYYy',
  'yYyyyyyYy',
  'yYYYoYYYy',
  'kkkkokkkk',
  'kKKKoKKKk',
  'kKKKKKKKk',
  'kkkkkkkkk',
]);

def('key', [
  '.yyy.....',
  'yY.Yy....',
  'yY.Yy....',
  '.yyy.....',
  '..y......',
  '..y......',
  '..yy.....',
  '..y.y....',
]);

// Merchant — a hooded shopkeep.
def('merchant', [
  '...ppppp....',
  '..pPPPPPp...',
  '..pPsssPp...',
  '..pPsdsPp...',
  '..pPsssPp...',
  '.ppppppppp..',
  'pPpwwwwwpPp.',
  'pPwwwwwwwPp.',
  '.pwwwwwwwp..',
  '.pwwwwwwwp..',
  '..ppppppp...',
  '..kk...kk...',
]);

// Nurse — pink, healing angel.
def('nurse', [
  '...nnnnn....',
  '..nrwwwrn...',  // little cap with cross
  '..nssssssn..',
  '..nsSslsdn..',
  '...ssssss...',
  '..nwwwwwwn..',
  '.nwwrwrwwn..',  // cross on dress
  '.nwwwrwwwn..',
  '.nwwwwwwwn..',
  '..wwwwwww...',
  '..ss...ss...',
  '..kk...kk...',
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

// ======================= THEMES & TILES =======================

export const THEMES = {
  underworld: {
    name: 'WORLD 1 · THE UNDERWORLD',
    sky0: '#180818', sky1: '#301028',
    solid: '#5a3a5a', solidDark: '#341f34', top: '#8a5a8a', topLite: '#b87ab8',
    plat: '#7a4a6a', platDark: '#3a2436',
    music: 'climb',
  },
  overworld: {
    name: 'WORLD 2 · THE OVERWORLD',
    sky0: '#204878', sky1: '#4088c8',
    solid: '#c8d0e0', solidDark: '#8090a8', top: '#f0f4ff', topLite: '#ffffff',
    plat: '#d8e0f0', platDark: '#98a4bc',
    music: 'sky',
  },
  sky: {
    name: 'WORLD 3 · THE SKY TEMPLE',
    sky0: '#102040', sky1: '#284888',
    solid: '#d8c890', solidDark: '#a08850', top: '#f8e8b0', topLite: '#fff8d8',
    plat: '#e8d8a0', platDark: '#b09860',
    music: 'sky',
  },
  fortress: {
    name: 'FORTRESS',
    sky0: '#101018', sky1: '#20202c',
    solid: '#585868', solidDark: '#2c2c38', top: '#787890', topLite: '#9898b0',
    plat: '#686878', platDark: '#3a3a46',
    music: 'fort',
  },
};

// t: 1 solid, 2 platform, 3 spring (hot spring surface), 4 lock door tile, 5 hazard.
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
    }
  } else if (t === 2) {
    ctx.fillStyle = th.plat;
    ctx.fillRect(x, y, 16, 6);
    ctx.fillStyle = th.platDark;
    ctx.fillRect(x, y + 4, 16, 2);
    ctx.fillStyle = th.topLite;
    ctx.fillRect(x, y, 16, 1);
  } else if (t === 3) {
    // hot spring water surface
    const ph = Math.sin((frame / 18) + x / 20);
    ctx.fillStyle = '#20a0b0';
    ctx.fillRect(x, y + 4, 16, 12);
    ctx.fillStyle = '#40d0e0';
    ctx.fillRect(x, y + 2, 16, 3);
    ctx.fillStyle = '#d0f8ff';
    ctx.fillRect(x + (ph > 0 ? 2 : 9), y + 2, 4, 1);
    // rising steam bubbles
    ctx.fillStyle = 'rgba(220,255,255,0.4)';
    const by = ((frame >> 1) + x) % 16;
    ctx.fillRect(x + 5, y - by + 8, 2, 2);
  } else if (t === 4) {
    // locked door tile
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#3a240f';
    ctx.fillRect(x + 2, y + 2, 12, 12);
    ctx.fillStyle = '#f8d038';
    ctx.fillRect(x + 7, y + 6, 3, 4);
    ctx.fillRect(x + 8, y + 8, 1, 4);
  } else if (t === 5) {
    // hazard spikes
    ctx.fillStyle = '#20202c';
    ctx.fillRect(x, y + 10, 16, 6);
    ctx.fillStyle = '#c0c0d0';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 4, y + 12);
      ctx.lineTo(x + i * 4 + 2, y + 2);
      ctx.lineTo(x + i * 4 + 4, y + 12);
      ctx.fill();
    }
  }
}

// ======================= EFFECTS =======================

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

// Simple star-poof when an enemy dies.
export function drawPoof(ctx, x, y, t) {
  ctx.fillStyle = t < 4 ? '#fff8d8' : '#f8d838';
  const r = 2 + t * 0.8;
  for (let a = 0; a < 6; a++) {
    const ang = a * Math.PI / 3 + t * 0.2;
    ctx.fillRect(x + Math.cos(ang) * r - 1, y + Math.sin(ang) * r - 1, 2, 2);
  }
}
