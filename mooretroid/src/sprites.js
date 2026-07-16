// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural tiles/doors/effects. All original art.

// ---- palettes ----
const BASE_PAL = {
  o: '#e07820', // suit orange
  r: '#b02818', // suit red / dark
  v: '#68d868', // visor
  g: '#3898f8', // arm cannon blue
  w: '#e8e8e8', // white
  d: '#101010', // outline dark
  y: '#f8d838', // yellow
  p: '#c060e0', // purple
  G: '#40a838', // green
  D: '#186018', // dark green
  b: '#3858c8', // blue
  B: '#182888', // dark blue
  s: '#f8b090', // pale flesh
  m: '#903090', // dark purple
  c: '#40d8d8', // cyan
  k: '#583818', // brown
  q: '#a8a8b8', // grey
  Q: '#585868', // dark grey
  x: '#f84020', // bright red/orange
};

// Varia suit swap: orange->gold, red->deep orange, cannon stays.
const VARIA_SWAP = { o: '#f8c828', r: '#d05810', g: '#48c848' };

function bake(rows, pal) {
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

// ============================ PLAYER ============================
// Hunter J. Moore. 16 wide. Facing right; flip for left.

def('p_stand', [
  '......rrrr......',
  '.....rrrrrr.....',
  '....rroooorr....',
  '....rovvvvdr....',
  '....rroooorr....',
  '.....rrrrrr.....',
  '....oooooo......',
  '...oorrrroo.....',
  '..ooorrrrooo....',
  '..oo.oooo.ggg...',
  '..oo.oooo.ggg...',
  '..oo.oooo.gg....',
  '.....oooo.......',
  '....oorroo......',
  '....orooro......',
  '....oo..oo......',
  '....oo..oo......',
  '....oo..oo......',
  '...roo..oor.....',
  '...ro....or.....',
  '...ro....or.....',
  '...ro....or.....',
  '..rro....orr....',
  '..rr......rr....',
]);

def('p_run1', [
  '......rrrr......',
  '.....rrrrrr.....',
  '....rroooorr....',
  '....rovvvvdr....',
  '....rroooorr....',
  '.....rrrrrr.....',
  '....oooooo......',
  '...oorrrroo.....',
  '..ooorrrroggg...',
  '..oo.oooo.ggg...',
  '..oo.oooo.gg....',
  '.....oooo.......',
  '....oorroo......',
  '...ooroorro.....',
  '...oro...oro....',
  '..oro.....oro...',
  '..oo.......oo...',
  '.roo.......oor..',
  '.ro.........or..',
  'rro.........orr.',
  'rr...........rr.',
  '................',
  '................',
  '................',
]);

def('p_run2', [
  '......rrrr......',
  '.....rrrrrr.....',
  '....rroooorr....',
  '....rovvvvdr....',
  '....rroooorr....',
  '.....rrrrrr.....',
  '....oooooo......',
  '...oorrrroo.....',
  '..ooorrrroggg...',
  '..oo.oooo.ggg...',
  '..oo.oooo.gg....',
  '.....oooo.......',
  '....oorroo......',
  '....oroor.......',
  '....oo.oo.......',
  '....oo.oo.......',
  '....oo..oo......',
  '...roo..oor.....',
  '...ro....or.....',
  '...rr....rr.....',
  '................',
  '................',
  '................',
  '................',
]);

def('p_run3', [
  '......rrrr......',
  '.....rrrrrr.....',
  '....rroooorr....',
  '....rovvvvdr....',
  '....rroooorr....',
  '.....rrrrrr.....',
  '....oooooo......',
  '...oorrrroo.....',
  '..ooorrrroggg...',
  '..oo.oooo.ggg...',
  '..oo.oooo.gg....',
  '.....oooo.......',
  '....oorroo......',
  '....orooro......',
  '...oro..oro.....',
  '...oo....oo.....',
  '...oo....oo.....',
  '..roo....oor....',
  '..ro......or....',
  '..rr......rr....',
  '................',
  '................',
  '................',
  '................',
]);

// Aiming straight up.
def('p_up', [
  '..........gg....',
  '..........gg....',
  '..........gg....',
  '......rrrrgg....',
  '.....rrrrrgg....',
  '....rroooogg....',
  '....rovvvvor....',
  '....rrooooor....',
  '.....rrrrrr.....',
  '....oooooo......',
  '...oorrrroo.....',
  '..ooorrrrooo....',
  '..oo.oooo.oo....',
  '..oo.oooo.oo....',
  '.....oooo.......',
  '....oorroo......',
  '....orooro......',
  '....oo..oo......',
  '....oo..oo......',
  '...roo..oor.....',
  '...ro....or.....',
  '...ro....or.....',
  '..rro....orr....',
  '..rr......rr....',
]);

// In-air tuck (small jump).
def('p_jump', [
  '......rrrr......',
  '.....rrrrrr.....',
  '....rroooorr....',
  '....rovvvvdr....',
  '....rroooorr....',
  '.....rrrrrr.....',
  '....oooooo......',
  '...oorrrroggg...',
  '..ooorrrro.ggg..',
  '..oo.oooo..gg...',
  '..oo.oooo.......',
  '.....oooo.......',
  '....oorroo......',
  '...oorooroo.....',
  '...oro..oro.....',
  '..oro....oro....',
  '..oo......oo....',
  '..rr......rr....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);

// Somersault frames (running jump).
def('p_spin1', [
  '.....oooooo.....',
  '...oorrrrrroo...',
  '..oorroooorroo..',
  '..oroovvvvooro..',
  '.oorooooooooroo.',
  '.oroooggooooro..',
  '.orooogg.oooro..',
  '.oorooooooroo...',
  '..oorrrrrroo....',
  '...oooooooo.....',
  '.....oooo.......',
  '................',
]);
def('p_spin2', [
  '.....oooooo.....',
  '...oooooooooo...',
  '..oorrrrrrrroo..',
  '..orroooooorro..',
  '.ooroovvvvoroo..',
  '.orooooooooooo..',
  '.oroogg..oooro..',
  '.ooroggoooroo...',
  '..oorrrrrroo....',
  '...oooooooo.....',
  '.....oooo.......',
  '................',
]);

// Morph ball, 2 roll frames.
def('p_ball1', [
  '....rrrrrr......',
  '..rroooooorr....',
  '.rooyyoooooor...',
  '.royooyoooooor..',
  'rooyooyooooooor.',
  'roooyyoooooooor.',
  'rooooooooooooor.',
  'roooooooooooor..',
  '.roooooooooor...',
  '..rroooooorr....',
  '....rrrrrr......',
  '................',
]);
def('p_ball2', [
  '....rrrrrr......',
  '..rroooooorr....',
  '.roooooyyooor...',
  '.rooooyooyoor...',
  'roooooyooyooor..',
  'rooooooyyooooor.',
  'rooooooooooooor.',
  'roooooooooooor..',
  '.roooooooooor...',
  '..rroooooorr....',
  '....rrrrrr......',
  '................',
]);

// ============================ ENEMIES ============================

def('zoomer1', [
  '....y..y..y.....',
  '..y.d..d..d.y...',
  '...ddddddddd....',
  '..ddxddxddxdd...',
  '.y.dxxdxxdxx.y..',
  '..ddddddddddd...',
  '..dd.dd.dd.dd...',
]);
def('zoomer2', [
  '..y..y..y..y....',
  '...d..d..d......',
  '...ddddddddd....',
  '..ddxddxddxdd...',
  '...dxxdxxdxx....',
  '..ddddddddddd...',
  '..d.dd.dd.dd....',
]);

def('skree1', [
  '......qq........',
  '......qq........',
  '.....qqqq.......',
  '....qQqqQq......',
  '...qqxqqxqq.....',
  '...qqqqqqqq.....',
  '..q.qq..qq.q....',
  '..q..q..q..q....',
]);
def('skree2', [
  '......qq........',
  '......qq........',
  '.....qqqq.......',
  '....qQqqQq......',
  '...qqxqqxqq.....',
  '...qqqqqqqq.....',
  '...q.qq.qq.q....',
  '....q..q..q.....',
]);

def('ripper', [
  '....yyyyyyyy....',
  '..yyxxxxxxxxyy..',
  '.yxxxxxxxxxxxxy.',
  '..yyxxxxxxxxyy..',
  '....yyyyyyyy....',
]);

def('waver1', [
  '.pp..........pp.',
  'pmmp........pmmp',
  '.pmmpp....ppmmp.',
  '..pmmmppppmmmp..',
  '...ppmmmmmmpp...',
  '.....pppppp.....',
]);
def('waver2', [
  '................',
  '.pp..........pp.',
  'pmmpp......ppmmp',
  '.ppmmmppppmmmpp.',
  '...ppmmmmmmpp...',
  '.....pppppp.....',
]);

def('hopper1', [
  '....GGGGGGGG....',
  '..GGDDGGGGDDGG..',
  '.GGxGGGGGGGGxGG.',
  '.GGGGGGGGGGGGGG.',
  '..GGDDDDDDDDGG..',
  '...GG......GG...',
  '..GG........GG..',
  '.GG..........GG.',
]);
def('hopper2', [
  '....GGGGGGGG....',
  '..GGDDGGGGDDGG..',
  '.GGxGGGGGGGGxGG.',
  '.GGGGGGGGGGGGGG.',
  '..GGDDDDDDDDGG..',
  '...GGG....GGG...',
  '....GG....GG....',
  '....GG....GG....',
]);

def('squeept', [
  '....xxxx....',
  '..xxyyyyxx..',
  '.xyyxyyxyyx.',
  '.xyxxyyxxyx.',
  '.xxxxxxxxxx.',
  '..xx.xx.xx..',
]);

def('rio1', [
  'pp............pp',
  '.ppp........ppp.',
  '..pppp....pppp..',
  '...pmmppppmmp...',
  '....pxmppmxp....',
  '.....pppppp.....',
  '......p..p......',
]);
def('rio2', [
  '................',
  '.pp..........pp.',
  '..ppp......ppp..',
  '...pmmppppmmp...',
  '....pxmppmxp....',
  '.....pppppp.....',
  '.....p....p.....',
]);

// Phazoid — the energy leech (metroid analog).
def('phazoid1', [
  '.....cccccc.....',
  '...cccGGGGccc...',
  '..ccGGccccGGcc..',
  '..cGccccccccGc..',
  '..cGccxccxccGc..',
  '..ccGccccccGcc..',
  '...cccGGGGccc...',
  '....cc.cc.cc....',
  '...cc..cc..cc...',
  '...c...c....c...',
]);
def('phazoid2', [
  '.....cccccc.....',
  '...cccGGGGccc...',
  '..ccGGccccGGcc..',
  '..cGccccccccGc..',
  '..cGccxccxccGc..',
  '..ccGccccccGcc..',
  '...cccGGGGccc...',
  '...cc..cc..cc...',
  '....cc.cc.cc....',
  '....c...c..c....',
]);

def('rinka', [
  '...xx...',
  '..xyyx..',
  '.xy..yx.',
  'xy....yx',
  'xy....yx',
  '.xy..yx.',
  '..xyyx..',
  '...xx...',
]);

// ============================ BOSSES ============================
// Gorluk, warden of the green deep (kraid analog). Drawn 2x in code.

def('gorluk', [
  '........DDDD............',
  '.......DGGGGD...........',
  '......DGxGGxGD..........',
  '......DGGGGGGD..........',
  '.......DGwwGD...........',
  '......DDGGGGDD..........',
  '....DDGGGGGGGGDD........',
  '...DGGGGGGGGGGGGD..y....',
  '..DGGGyGGGGGGGGGGD.yy...',
  '..DGGyyyGGGGGGGGGGDyy...',
  '.DGGGGyGGGGGGGyGGGGGy...',
  '.DGGGGGGGGGGGyyyGGGGG...',
  '.DGGGGGGGGGGGGyGGGGGD...',
  '.DGGyGGGGGGGGGGGGGGD....',
  '.DGyyyGGGGGGGGGGGGD.....',
  '.DGGyGGGGGGGGGGGGD......',
  '.DGGGGGGGGGGGGGGD.......',
  '..DGGGGGGGGGGGGD........',
  '..DGGDDGGGGDDGGD........',
  '..DGGD.DGGD.DGGD........',
  '.DDGGD.DGGD.DGGDD.......',
  '.DDDDD.DDDD.DDDDD.......',
]);

// Skyrax, terror of the molten roost (ridley analog). Drawn 2x in code.
def('skyrax', [
  '......mm................',
  '.....mppm...............',
  '....mpxppm..............',
  '....mppppmm.............',
  '.....mppppm.............',
  '......mmpppm............',
  'mm......mpppm.....mm....',
  'mppmm....mpppm..mmppm...',
  'mpppppmm.mpppmmmpppppm..',
  '.mpppppppppppppppppppm..',
  '..mppppppppppppppppm....',
  '...mppppppppppppppm.....',
  '....mppwpppppwppm.......',
  '.....mpppppppppm........',
  '......mpppppppm.........',
  '......mppmmppm..........',
  '.....mppm..mppm.........',
  '....mppm....mppm........',
  '....mpm......mpm........',
  '....mm........mm........',
]);

// The Overmind — brain in armored vitrine (drawn with jar in code).
def('overmind', [
  '....ssssssss....',
  '..sssmsssssss...',
  '.ssmssssmssssss.',
  '.sssssmssssmsss.',
  'ssmsssssssssssss',
  'sssssmsssmssssss',
  'ssssssssssssmsss',
  '.sxxsssmsssssss.',
  '.sxxssssssssmss.',
  '.ssssmsssmssss..',
  '..ssssssssssss..',
  '...ssssssss.....',
]);

// ============================ ITEMS ============================

def('i_morph', [
  '....rrrrrr......',
  '..rroooooorr....',
  '.royyooooooor...',
  '.royyoooooooor..',
  '.roooooooooor...',
  '..rroooooorr....',
  '....rrrrrr......',
]);
def('i_bombs', [
  '......ww........',
  '.....w..........',
  '....rrrr........',
  '...rooyyr.......',
  '...royyyyr......',
  '...royyyyr......',
  '....royyr.......',
  '.....rrr........',
]);
def('i_long', [
  '..gg............',
  '..gggg..........',
  '....gggg........',
  '......gggg......',
  '........gggg....',
  '..........gggg..',
  '............gg..',
]);
def('i_ice', [
  '...c...c...c....',
  '....c..c..c.....',
  '.....ccccc......',
  '..ccccwwwcccc...',
  '.....ccccc......',
  '....c..c..c.....',
  '...c...c...c....',
]);
def('i_hijump', [
  '....rr..rr......',
  '....rr..rr......',
  '....rr..rr......',
  '...rrr..rrr.....',
  '..rryr..ryrr....',
  '..rrrr..rrrr....',
]);
def('i_varia', [
  '....yyyyyy......',
  '..yyoooooyy.....',
  '.yoooyyoooy.....',
  '.yooyooyooy.....',
  '.yoooyyoooy.....',
  '..yyoooooyy.....',
  '....yyyyyy......',
]);
def('i_etank', [
  '..ww..ww..ww....',
  '.wxxwwxxwwxxw...',
  '.wxxwwxxwwxxw...',
  '..ww..ww..ww....',
]);
def('i_missile', [
  '....xx..........',
  '...xxxx.........',
  '...xxxx.........',
  '...qqqq.........',
  '...qqqq.........',
  '...qqqq.........',
  '..q.qq.q........',
  '..qqqqqq........',
]);

// Pickups dropped by enemies.
def('pu_energy', [
  '..xx..',
  '.xyyx.',
  'xyyyyx',
  '.xyyx.',
  '..xx..',
]);
def('pu_missile', [
  '..x..',
  '.xxx.',
  '.qqq.',
  '.qqq.',
  '.q.q.',
]);

// The gunship, for the finale.
def('ship', [
  '..............oooo..............',
  '...........oooooooooo...........',
  '.........oorrrrrrrrrroo.........',
  '.......oorrooooooooooroo........',
  '.....oooroooovvvvoooooroo.......',
  '...ooooooooovvvvvvoooooooo......',
  '.oooooooooooooooooooooooooooo...',
  'roooooooooooooooooooooooooooor..',
  'rrrooooooooooooooooooooooooorr..',
  '..rrrrrrrrrrrrrrrrrrrrrrrrrr....',
  '....rr......rrrr......rr........',
  '....rr......rrrr......rr........',
]);

// Ancient statues that guard the Hive gate.
def('statue_g', [
  '...DDDD...',
  '..DGGGGD..',
  '..DGxGxD..',
  '..DGGGGD..',
  '...DGGD...',
  '..DGGGGD..',
  '.DGGGGGGD.',
  '.DGGGGGGD.',
  '.DDDDDDDD.',
]);
def('statue_s', [
  '...mmmm...',
  '..mppppm..',
  '..mpxpxm..',
  '..mppppm..',
  '...mppm...',
  '..mppppm..',
  '.mppppppm.',
  '.mppppppm.',
  '.mmmmmmmm.',
]);

// ---- bake everything, plus varia-swap player sprites ----
export function initSprites() {
  for (const [name, rows] of defs) {
    SPR[name] = bake(rows, BASE_PAL);
    if (name.startsWith('p_')) {
      SPR['v' + name.slice(1)] = bake(rows, { ...BASE_PAL, ...VARIA_SWAP });
    }
  }
}

export function drawSprite(ctx, name, x, y, flip = false) {
  const s = SPR[name];
  if (!s) return;
  x = Math.round(x); y = Math.round(y);
  if (!flip) { ctx.drawImage(s, x, y); return; }
  ctx.save();
  ctx.translate(x + s.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(s, 0, 0);
  ctx.restore();
}

export function drawSpriteScaled(ctx, name, x, y, scale, flip = false) {
  const s = SPR[name];
  if (!s) return;
  x = Math.round(x); y = Math.round(y);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(x + s.width * scale, y);
    ctx.scale(-scale, scale);
  } else {
    ctx.translate(x, y);
    ctx.scale(scale, scale);
  }
  ctx.drawImage(s, 0, 0);
  ctx.restore();
}

// ============================ TILES ============================
// Area themes: colors for rock, alt-rock, accents.

export const THEMES = {
  brinstar: { rock: '#2848b0', hi: '#4870e0', lo: '#101c60', alt: '#7040a8', althi: '#9868d0', spike: '#b8c8e8', name: 'BLUE CAVERNS' },
  norfair: { rock: '#b04818', hi: '#e07030', lo: '#601c08', alt: '#a83848', althi: '#d06070', spike: '#f0c880', name: 'THE MOLTEN VEIN' },
  kraid: { rock: '#287838', hi: '#48a858', lo: '#0c3818', alt: '#588048', althi: '#80a868', spike: '#c8e0b8', name: 'GORLUK\'S DEN' },
  ridley: { rock: '#883058', hi: '#b85080', lo: '#401028', alt: '#a04830', althi: '#c87048', spike: '#e8b8c8', name: 'SKYRAX\'S ROOST' },
  tourian: { rock: '#606878', hi: '#8890a0', lo: '#282c38', alt: '#385858', althi: '#588080', spike: '#c8d0d8', name: 'THE HIVE' },
};

// Deterministic per-tile speckle.
const spk = (tx, ty, n) => ((tx * 73 + ty * 151 + n * 37) % 97) / 97;

export function drawTile(ctx, ch, px, py, tx, ty, theme, frame) {
  const T = 16;
  switch (ch) {
    case '#':
    case '*': { // '*' (bombable) looks identical on purpose
      ctx.fillStyle = theme.rock;
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = theme.hi;
      ctx.fillRect(px, py, T, 2);
      ctx.fillRect(px, py, 2, T);
      ctx.fillStyle = theme.lo;
      ctx.fillRect(px, py + T - 2, T, 2);
      ctx.fillRect(px + T - 2, py, 2, T);
      for (let i = 0; i < 3; i++) {
        const rx = Math.floor(spk(tx, ty, i) * 10) + 3;
        const ry = Math.floor(spk(ty, tx, i + 5) * 10) + 3;
        ctx.fillStyle = i % 2 ? theme.lo : theme.hi;
        ctx.fillRect(px + rx, py + ry, 2, 2);
      }
      break;
    }
    case '%': { // organic alt rock
      ctx.fillStyle = theme.alt;
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = theme.althi;
      ctx.fillRect(px + 2, py + 2, 5, 5);
      ctx.fillRect(px + 9, py + 8, 5, 5);
      ctx.fillStyle = theme.lo;
      ctx.fillRect(px + 9, py + 2, 4, 3);
      ctx.fillRect(px + 2, py + 10, 4, 3);
      break;
    }
    case '^': { // spikes
      ctx.fillStyle = theme.spike;
      for (let i = 0; i < 4; i++) {
        const bx = px + i * 4;
        ctx.beginPath();
        ctx.moveTo(bx, py + T);
        ctx.lineTo(bx + 2, py + 2);
        ctx.lineTo(bx + 4, py + T);
        ctx.fill();
      }
      break;
    }
    case '~': { // lava, animated
      const ph = Math.floor(frame / 8) % 2;
      ctx.fillStyle = '#c83010';
      ctx.fillRect(px, py + 3, T, T - 3);
      ctx.fillStyle = '#f86818';
      ctx.fillRect(px, py + 3, T, 2);
      ctx.fillStyle = '#f8d030';
      for (let i = 0; i < 2; i++) {
        const bx = (tx * 5 + i * 8 + ph * 4) % 14;
        ctx.fillRect(px + bx, py + 3, 2, 2);
      }
      break;
    }
    case '|': { // door frame / machinery
      ctx.fillStyle = '#484858';
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#686878';
      ctx.fillRect(px, py, T, 2);
      ctx.fillRect(px, py, 2, T);
      ctx.fillStyle = '#202028';
      ctx.fillRect(px + T - 2, py, 2, T);
      ctx.fillRect(px + 4, py + 4, 3, 3);
      ctx.fillRect(px + 9, py + 9, 3, 3);
      break;
    }
    case 'X': { // hive gate
      ctx.fillStyle = '#383040';
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#e83828';
      ctx.fillRect(px + 2, py + 6, T - 4, 3);
      ctx.fillStyle = '#585060';
      ctx.fillRect(px, py, T, 2);
      ctx.fillRect(px, py + T - 2, T, 2);
      break;
    }
    case 'E': { // elevator pad
      ctx.fillStyle = '#a8a8b8';
      ctx.fillRect(px, py, T, 6);
      ctx.fillStyle = '#e8e858';
      ctx.fillRect(px + 2, py + 2, 2, 2);
      ctx.fillRect(px + 12, py + 2, 2, 2);
      ctx.fillStyle = '#585868';
      ctx.fillRect(px + 6, py + 6, 4, T - 6);
      break;
    }
  }
}

// Door bubble: 1 tile wide, 3 tall, half-round facing dir (1=opens right, -1=left).
export function drawDoor(ctx, px, py, color, openT, dir) {
  if (openT >= 1) return;
  const h = 48;
  const w = Math.round(8 * (1 - openT));
  if (w <= 0) return;
  const cols = color === 'red' ? ['#e83828', '#f8a090'] : ['#3878e8', '#a0c8f8'];
  ctx.fillStyle = cols[0];
  for (let row = 0; row < h; row += 2) {
    // rounded profile: narrower at top/bottom
    const t = Math.abs(row - h / 2 + 1) / (h / 2);
    const ww = Math.max(2, Math.round(w * Math.sqrt(1 - t * t * 0.85)));
    const x0 = dir === 1 ? px : px + 16 - ww;
    ctx.fillRect(x0, py + row, ww, 2);
  }
  ctx.fillStyle = cols[1];
  ctx.fillRect(dir === 1 ? px : px + 14, py + 18, 2, 12);
}

// Simple expanding explosion.
export function drawBoom(ctx, x, y, t, big = false) {
  const r = (big ? 22 : 12) * t;
  const cols = ['#f8f8f8', '#f8d030', '#f86818', '#903018'];
  for (let i = 0; i < 4; i++) {
    const rr = r * (1 - i * 0.2);
    if (rr <= 0) continue;
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t > 0.5) {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, r * (t - 0.5) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
