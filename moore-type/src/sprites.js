// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural terrain tiles and effects. All original art, 16-bit flavored.

// ---- palette ----
const PAL = {
  w: '#f8f8f8', // white
  d: '#101018', // outline
  b: '#3868e8', // hull blue
  B: '#1838a0', // hull dark blue
  c: '#50e8f8', // cockpit cyan
  C: '#2090c0', // cyan shade
  q: '#b8b8c8', // light metal
  Q: '#686878', // dark metal
  y: '#f8d838', // yellow
  o: '#f88820', // orange
  O: '#c04808', // orange dark
  r: '#f83838', // red
  R: '#981020', // dark red
  g: '#48d858', // green
  G: '#187830', // dark green
  p: '#c868f8', // purple
  P: '#7828a8', // dark purple
  m: '#e858a8', // magenta flesh
  M: '#881848', // flesh dark
  v: '#a8f8c0', // pale
  k: '#404858', // gunmetal
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
function def(name, rows, pal) { defs.push([name, rows, pal]); }

// ======================= R-9 MOORE (player ship) =======================
// 24x12, faces right. Blue hull, cyan canopy, grey engine block.

def('ship', [
  '........bb..............',
  '.......bccb.............',
  '..qq..bbccbb............',
  '.qQQbbbbbbbbbbbb........',
  'qQbbbbBccccBbbbbbbbb....',
  'qQbbbbBcccccBbbbbbbbbbbw',
  'qQbbbbBBBBBBbbbbbbbbbbbw',
  'qQbbbbbbbbbbbbbbbbbb....',
  '.qQQbbbbbbbbbbbb........',
  '..qq..bbyybb............',
  '.......byyb.............',
  '........bb..............',
]);

// Force pod: 12x12 pulsing orb.
def('pod1', [
  '...oyyyo....',
  '..oyywwyo...',
  '.oyywwwwyo..',
  'oyywwwwwwyo.',
  'oywwooowwyo.',
  'oywwooowwyo.',
  'oywwooowwyo.',
  'oyywwwwwwyo.',
  '.oyywwwwyo..',
  '..oyywwyo...',
  '...oyyyo....',
  '............',
]);
def('pod2', [
  '...yooOy....',
  '..yoowwoy...',
  '.yoowwwwoy..',
  'yoowwwwwwoy.',
  'yowwyyywwoy.',
  'yowwyyywwoy.',
  'yowwyyywwoy.',
  'yoowwwwwwoy.',
  '.yoowwwwoy..',
  '..yoowwoy...',
  '...yooOy....',
  '............',
]);

// Sine flyer 12x10 (grey) + red capsule-carrier variant.
def('sine', [
  '....qqq.....',
  '..qqqQQq....',
  '.qqccqQQq...',
  'qqccqqqQQqq.',
  'qqqqqqqqQQQq',
  'qqqqqqqqQQQq',
  'qqccqqqQQqq.',
  '.qqccqQQq...',
  '..qqqQQq....',
  '....qqq.....',
]);
def('sineR', [
  '....rrr.....',
  '..rrrRRr....',
  '.rryyrRRr...',
  'rryyrrrRRrr.',
  'rrrrrrrrRRRr',
  'rrrrrrrrRRRr',
  'rryyrrrRRrr.',
  '.rryyrRRr...',
  '..rrrRRr....',
  '....rrr.....',
]);

// Terrain turret pod base 12x10 (barrel drawn procedurally).
def('turret', [
  '....kkkk....',
  '..kkqqqqkk..',
  '.kqqrrrrqqk.',
  '.kqrrwwrrqk.',
  'kkqrrwwrrqkk',
  'kkqqrrrrqqkk',
  'kQQQQQQQQQQk',
  'kQQQQQQQQQQk',
  'kkkkkkkkkkkk',
  '............',
]);

// Straight rusher 14x8.
def('rusher', [
  '.....pp.......',
  '..pppPPpp.....',
  '.pyyppPPPpp...',
  'ppyyppppPPPppp',
  'ppyyppppPPPppp',
  '.pyyppPPPpp...',
  '..pppPPpp.....',
  '.....pp.......',
]);

// Wall crawler 12x10.
def('crawler', [
  '..gGGGGGGg..',
  '.gGvvvvvvGg.',
  'gGvggggggvGg',
  'gGvgrrrrgvGg',
  'gGvgrwwrgvGg',
  'gGvgrrrrgvGg',
  'gGvggggggvGg',
  'gGGGGGGGGGGg',
  '.g.g.g.g.g..',
  'g.g.g.g.g.g.',
]);

// Orbiting-shield core 14x14.
def('orbcore', [
  '....kkkkkk....',
  '..kkqqqqqqkk..',
  '.kqqppppppqqk.',
  '.kqpppyypppqk.',
  'kqppyywwyyppqk',
  'kqppywwwwyppqk',
  'kqppywwwwyppqk',
  'kqppyywwyyppqk',
  '.kqpppyypppqk.',
  '.kqqppppppqqk.',
  '..kkqqqqqqkk..',
  '....kkkkkk....',
  '..............',
  '..............',
]);

// Homing missile launcher 16x12.
def('homer', [
  '......kkkkkk....',
  '...kkkQQQQQQkk..',
  '..kQQQqqqqqQQQk.',
  '.kQqqqrrrqqqqQQk',
  'kQqqrrwwwrrqqQQk',
  'kQqqrrwwwrrqqQQk',
  '.kQqqqrrrqqqqQQk',
  '..kQQQqqqqqQQQk.',
  '...kkkQQQQQQkk..',
  '......kkkkkk....',
  '..oo........oo..',
  '..oo........oo..',
]);

// Zako swarm bug 8x8.
def('zako', [
  '..cCCc..',
  '.cCwwCc.',
  'cCwddwCc',
  'CCwddwCC',
  '.CCwwCC.',
  '..CCCC..',
  '.C.CC.C.',
  'C..CC..C',
]);

// Homing missile 8x6.
def('emissile', [
  '....rr..',
  '.qqqrrr.',
  'qqqqrrrr',
  'qqqqrrrr',
  '.qqqrrr.',
  '....rr..',
]);

// Power capsule (orange, Gradius style) 12x10.
def('capsule', [
  '...oooooo...',
  '..oyyyyyyo..',
  '.oyywwwwyyo.',
  'oyywwwwwwyyo',
  'oywwwwwwwwyo',
  'oywwwwwwwwyo',
  'oyywwwwwwyyo',
  '.oyywwwwyyo.',
  '..oyyyyyyo..',
  '...oooooo...',
]);
// Revenge capsule (cyan flash) 12x10.
def('capsuleR', [
  '...cccccc...',
  '..cwwwwwwc..',
  '.cwwCCCCwwc.',
  'cwwCCwwCCwwc',
  'cwCCwwwwCCwc',
  'cwCCwwwwCCwc',
  'cwwCCwwCCwwc',
  '.cwwCCCCwwc.',
  '..cwwwwwwc..',
  '...cccccc...',
]);
// Force pod powerup 12x10.
def('podItem', [
  '...yyyyyy...',
  '..yooooooy..',
  '.yoowwwwooy.',
  'yoowFFFFwooy',
  'yowFFwwFFwoy',
  'yowFFwwFFwoy',
  'yoowFFFFwooy',
  '.yoowwwwooy.',
  '..yooooooy..',
  '...yyyyyy...',
], { ...PAL, F: '#f88820' });

// Boss core (shared weak point) 16x16, open + closed.
def('coreOpen', [
  '....kkkkkkkk....',
  '..kkqqqqqqqqkk..',
  '.kqqQQQQQQQQqqk.',
  '.kqQQrrrrrrQQqk.',
  'kqQQrrwwwwrrQQqk',
  'kqQrrwwrrwwrrQqk',
  'kqQrwwrrrrwwrQqk',
  'kqQrwrrwwrrwrQqk',
  'kqQrwrrwwrrwrQqk',
  'kqQrwwrrrrwwrQqk',
  'kqQrrwwwwwwrrQqk',
  'kqQQrrwwwwrrQQqk',
  '.kqQQrrrrrrQQqk.',
  '.kqqQQQQQQQQqqk.',
  '..kkqqqqqqqqkk..',
  '....kkkkkkkk....',
]);
def('coreClosed', [
  '....kkkkkkkk....',
  '..kkqqqqqqqqkk..',
  '.kqqQQQQQQQQqqk.',
  '.kqQQkkkkkkQQqk.',
  'kqQQkkqqqqkkQQqk',
  'kqQkkqQQQQqkkQqk',
  'kqQkqQkkkkQqkQqk',
  'kqQkqQkrrkQqkQqk',
  'kqQkqQkrrkQqkQqk',
  'kqQkqQkkkkQqkQqk',
  'kqQkkqQQQQqkkQqk',
  'kqQQkkqqqqkkQQqk',
  '.kqQQkkkkkkQQqk.',
  '.kqqQQQQQQQQqqk.',
  '..kkqqqqqqqqkk..',
  '....kkkkkkkk....',
]);

export function initSprites() {
  for (const [name, rows, pal] of defs) SPR[name] = bake(rows, pal);
  // pre-flipped horizontal copies
  for (const name of Object.keys(SPR)) {
    const s = SPR[name];
    const c = document.createElement('canvas');
    c.width = s.width; c.height = s.height;
    const g = c.getContext('2d');
    g.translate(s.width, 0); g.scale(-1, 1);
    g.drawImage(s, 0, 0);
    SPR[name + '~f'] = c;
  }
}

export function drawSprite(ctx, name, x, y, flip = false) {
  const s = SPR[flip ? name + '~f' : name];
  if (s) ctx.drawImage(s, Math.round(x), Math.round(y));
}

// ======================= themes / terrain tiles =======================

export const THEMES = [
  {
    name: 'STAGE 1  ASTEROID APPROACH', music: 'st1',
    sky0: '#080818', sky1: '#101028',
    base: '#7a6a58', dark: '#4a4038', lite: '#a89880', edge: '#c8b8a0',
  },
  {
    name: 'STAGE 2  THE LIVING CORRIDOR', music: 'st2',
    sky0: '#180810', sky1: '#28081c',
    base: '#881848', dark: '#500a30', lite: '#b83868', edge: '#e858a8',
  },
  {
    name: 'STAGE 3  FLEET GAUNTLET', music: 'st3',
    sky0: '#04040c', sky1: '#0c0c20',
    base: '#485068', dark: '#283048', lite: '#68789a', edge: '#98a8c8',
  },
  {
    name: 'STAGE 4  MOTHERSHIP CORE', music: 'st4',
    sky0: '#020a08', sky1: '#06140e',
    base: '#2a5848', dark: '#183828', lite: '#488870', edge: '#78c8a0',
  },
];

// Deterministic speckle.
const rnd = (tx, ty) => ((tx * 73856093) ^ (ty * 19349663)) >>> 0;

export function drawTile(ctx, theme, sx, sy, tx, ty, openUp, openDn, frame) {
  const th = THEMES[theme];
  ctx.fillStyle = th.base;
  ctx.fillRect(sx, sy, 8, 8);
  const r = rnd(tx, ty);
  ctx.fillStyle = th.dark;
  ctx.fillRect(sx + (r % 5), sy + ((r >> 3) % 5), 3, 2);
  if ((r >> 6) % 3 === 0) {
    ctx.fillStyle = th.lite;
    ctx.fillRect(sx + ((r >> 9) % 6), sy + ((r >> 12) % 6), 2, 2);
  }
  if (theme === 1) {
    // organic: pulsing vein dots
    if ((r >> 4) % 4 === 0) {
      ctx.fillStyle = (frame >> 4) % 2 ? '#e858a8' : '#b83868';
      ctx.fillRect(sx + ((r >> 7) % 6), sy + ((r >> 10) % 6), 2, 2);
    }
  }
  if (openUp) { ctx.fillStyle = th.edge; ctx.fillRect(sx, sy, 8, 2); }
  if (openDn) { ctx.fillStyle = th.dark; ctx.fillRect(sx, sy + 7, 8, 1); }
}

// Parallax starfield / background per theme.
export function drawBackdrop(ctx, theme, camX, frame, W, H) {
  const th = THEMES[theme];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, th.sky0);
  grad.addColorStop(1, th.sky1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // stars, two parallax layers
  for (let i = 0; i < 28; i++) {
    const r = rnd(i, 7);
    const spd = i % 2 ? 0.25 : 0.5;
    const x = ((r % 512) - camX * spd) % W;
    const y = (r >> 5) % H;
    ctx.fillStyle = i % 3 === 0 ? '#8890b8' : '#485078';
    ctx.fillRect((x + W) % W, y, i % 2 ? 1 : 2, i % 2 ? 1 : 2);
  }
  if (theme === 0) {
    // distant drifting rocks
    ctx.fillStyle = '#20202e';
    for (let i = 0; i < 5; i++) {
      const r = rnd(i, 91);
      const x = (((r % 512) - camX * 0.18) % (W + 40) + W + 40) % (W + 40) - 20;
      ctx.beginPath();
      ctx.ellipse(x, 30 + ((r >> 6) % (H - 60)), 8 + (r % 8), 6 + ((r >> 4) % 6), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 1) {
    // drifting spores
    ctx.fillStyle = '#48102c';
    for (let i = 0; i < 8; i++) {
      const r = rnd(i, 53);
      const x = (((r % 512) - camX * 0.22) % (W + 20) + W + 20) % (W + 20) - 10;
      const y = ((r >> 5) % H) + Math.sin((frame + i * 30) / 40) * 6;
      ctx.beginPath(); ctx.arc(x, y, 3 + (r % 4), 0, Math.PI * 2); ctx.fill();
    }
  } else if (theme === 2) {
    // distant fleet silhouettes
    ctx.fillStyle = '#141428';
    for (let i = 0; i < 4; i++) {
      const r = rnd(i, 37);
      const x = (((r % 512) - camX * 0.15) % (W + 80) + W + 80) % (W + 80) - 40;
      const y = 24 + ((r >> 6) % (H - 70));
      ctx.fillRect(x, y, 36, 6);
      ctx.fillRect(x + 8, y - 4, 12, 4);
    }
  } else if (theme === 3) {
    // interior girders
    ctx.fillStyle = '#0a1f18';
    for (let i = 0; i < 8; i++) {
      const x = ((i * 64 - camX * 0.4) % (W + 64) + W + 64) % (W + 64) - 32;
      ctx.fillRect(x, 0, 10, H);
    }
    ctx.fillStyle = '#122a20';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 96 - camX * 0.7) % (W + 96) + W + 96) % (W + 96) - 48;
      ctx.fillRect(x, 0, 4, H);
    }
  }
}

// Explosion: pixel ring burst.
export function drawBoom(ctx, x, y, t, big) {
  const max = big ? 22 : 14;
  const p = t / max;
  const r = (big ? 20 : 10) * p + 2;
  const cols = ['#f8f8f8', '#f8d838', '#f88820', '#c04808'];
  ctx.fillStyle = cols[Math.min(3, Math.floor(p * 4))];
  for (let i = 0; i < (big ? 10 : 7); i++) {
    const a = (i / (big ? 10 : 7)) * Math.PI * 2 + t * 0.1;
    const rr = r * (0.7 + ((i * 37) % 5) / 10);
    ctx.fillRect(Math.round(x + Math.cos(a) * rr) - 2, Math.round(y + Math.sin(a) * rr) - 2, big ? 5 : 4, big ? 5 : 4);
  }
  if (p < 0.4) {
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 7, 7);
  }
}
