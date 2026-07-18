// Moormings pixel art — string-grid sprites baked to offscreen canvases.
// Little green-haired, blue-robed folk, ~5x10 body in a 9x13 frame
// (headroom for umbrellas and picks). Feet sit on the bottom row.
// All art original. Render-layer only — never imported by the headless sim.

const PAL = {
  g: '#58e858', // hair green
  G: '#2c9c2c', // hair shade
  s: '#f8d0a8', // skin
  S: '#c89878', // skin shade
  b: '#4868f0', // robe blue
  B: '#2038a8', // robe shade
  w: '#f8f8f8', // white
  k: '#181820', // near-black
  r: '#f04838', // umbrella red
  y: '#f8d838', // yellow
  o: '#c08040', // wood
  q: '#b8c0d0', // metal
  p: '#f878b8', // pink (splat? no — flair)
};

function bake(rows, flip = false) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!PAL[ch]) continue;
      g.fillStyle = PAL[ch];
      g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return c;
}

export const SPR = {};   // SPR[name] = [rightFacing, leftFacing]
const defs = [];
const def = (name, rows) => defs.push([name, rows]);

// ---- walking (2 frames) ----
def('walk1', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);
def('walk2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '...bb....',
  '...kk....',
]);

// ---- falling: arms out, hair up ----
def('fall', [
  '.........',
  '.........',
  '..g.g.g..',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '.s.bb.s..',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k..k...',
]);

// ---- floating: red-white brolly ----
def('float1', [
  '..rwrwr..',
  '.rwrwrwr.',
  '....k....',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '...bb....',
  '...bb....',
  '..b..b...',
  '..k..k...',
]);
def('float2', [
  '..wrwrw..',
  '.wrwrwrw.',
  '....k....',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '...bb....',
  '...bb....',
  '..b.b....',
  '..k.k....',
]);

// ---- climbing (2 frames, hugging wall to the right) ----
def('climb1', [
  '.........',
  '.........',
  '.........',
  '...gggs..',
  '...ggg...',
  '....ss...',
  '...bbbs..',
  '...bbb...',
  '...bbB...',
  '...bbB...',
  '....bb...',
  '....b.k..',
  '....k....',
]);
def('climb2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '...gggs..',
  '....ss...',
  '...bbb...',
  '...bbbs..',
  '...bbB...',
  '...bbB...',
  '....bb...',
  '....bk...',
  '.....k...',
]);

// ---- blocker: arms out wide ----
def('block1', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '.ssbbss..',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);
def('block2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '.s..ss..s',
  '..sbbbs..',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);

// ---- builder: trowel + brick ----
def('build1', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbs...',
  '..bbbsy..',
  '..bbBy...',
  '..bbB....',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);
def('build2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbb....',
  '..bbbs...',
  '..bbBsy..',
  '..bbB.y..',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);

// ---- basher: swinging fists forward ----
def('bash1', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbss..',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);
def('bash2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss.s..',
  '..bbbs...',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);

// ---- miner: pick swings diagonally ----
def('mine1', [
  '.........',
  '.....q...',
  '....qo...',
  '...ggo...',
  '..gggo...',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);
def('mine2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...sso...',
  '..bbbbo..',
  '..bbbboq.',
  '..bbbB.q.',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);

// ---- digger: shovel down, dirt spray ----
def('dig1', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bboB...',
  '..bboB...',
  '...bo....',
  '..bqqb...',
  '..k.qk...',
]);
def('dig2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '..bbbb...',
  '..bbob...',
  '..bboB...',
  '..bbBo...',
  '...bbo...',
  '..b.qq...',
  '..kq.k...',
]);

// ---- oh no! hands on head ----
def('ohno', [
  '.........',
  '.........',
  '.........',
  '..sggg s.',
  '..sggggs.',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);

// ---- shrug: out of bricks ----
def('shrug', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '...ss....',
  '.s.bb.s..',
  '.sbbbbs..',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '..k...k..',
]);

// ---- splat: a sad green-blue puddle ----
def('splat', [
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '..gbbg...',
  '.gbbbbg..',
]);

// ---- exiting: little jump of joy ----
def('exit1', [
  '.........',
  '.........',
  '.s.....s.',
  '..sggg s.',
  '..gggg...',
  '...ss....',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '..b..b...',
  '.k.....k.',
]);
def('exit2', [
  '.........',
  '.........',
  '.........',
  '...ggg...',
  '..gggg...',
  '.s.ss.s..',
  '..bbbb...',
  '..bbbb...',
  '..bbbB...',
  '..bbbB...',
  '...bb....',
  '...bb....',
  '...kk....',
]);

// ---- drown: just hair above the waves ----
def('drown', [
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '..s...s..',
  '...ggg...',
  '..gggg...',
  '.........',
  '.........',
  '.........',
]);

// ================= HUD icons (11x9) =================
const IPAL = { ...PAL };
export const ICO = {};
const idefs = [];
const idef = (name, rows) => idefs.push([name, rows]);

idef('climber', [
  '........qq.',
  '...w....qq.',
  '..www...qq.',
  '.w.w.w..qq.',
  '...w....qq.',
  '...w...gqq.',
  '...w..gbqq.',
  '...w...bqq.',
  '..kk..k.qq.',
]);
idef('floater', [
  '..rwrwrwr..',
  '.rwrwrwrwr.',
  '.r...k...r.',
  '.....k.....',
  '.....k.....',
  '....gk.....',
  '....gb.....',
  '....bb.....',
  '....k.k....',
]);
idef('bomber', [
  '......y....',
  '.....y.....',
  '....kk.....',
  '...kkkk....',
  '..kkkkkk...',
  '..kkwkkk...',
  '..kkkkkk...',
  '...kkkk....',
  '....kk.....',
]);
idef('blocker', [
  '....ggg....',
  '....ggg....',
  '.s..ss..s..',
  '..ssbbss...',
  '....bb.....',
  '....bb.....',
  '....bb.....',
  '...b..b....',
  '...k..k....',
]);
idef('builder', [
  '........yy.',
  '......yyyy.',
  '....yyyy...',
  '..yyyy.....',
  'yyyy.......',
  'yy.....g...',
  '.......gb..',
  '.......bb..',
  '.......kk..',
]);
idef('basher', [
  '.......qqq.',
  '.g.....qqq.',
  '.gb.s..qqq.',
  '.bbs.www...',
  '.bb..www...',
  '.bbs.www...',
  '.bb.s..qqq.',
  '.kk....qqq.',
  '.......qqq.',
]);
idef('miner', [
  '.......q...',
  '......qo...',
  '.....qo....',
  '..g..o.....',
  '..gbo......',
  '..bbo.qq...',
  '..bb...qq..',
  '..kk....qq.',
  '.........q.',
]);
idef('digger', [
  '....gg.....',
  '...gbb.....',
  '...obb.....',
  '...o.kk....',
  '...o.......',
  '..qqq......',
  '...w.......',
  '..w.w.w....',
  '.w..w..w...',
]);
idef('pause', [
  '...........',
  '..ww...ww..',
  '..ww...ww..',
  '..ww...ww..',
  '..ww...ww..',
  '..ww...ww..',
  '..ww...ww..',
  '..ww...ww..',
  '...........',
]);
idef('nuke', [
  '...yyyyy...',
  '..yyyyyyy..',
  '..yykykyy..',
  '..yyyyyyy..',
  '...yyyyy...',
  '....yyy....',
  '....kkk....',
  '...kkkkk...',
  '..kkkkkkk..',
]);
idef('ff', [
  '...........',
  '.ww...ww...',
  '.www..www..',
  '.wwww.wwww.',
  '.wwwwwwwww.',
  '.wwww.wwww.',
  '.www..www..',
  '.ww...ww...',
  '...........',
]);

export function initSprites() {
  for (const [name, rows] of defs) SPR[name] = [bake(rows, false), bake(rows, true)];
  for (const [name, rows] of idefs) ICO[name] = bake(rows, false);
}

// job -> frame name picker (t = sim tick)
export function frameFor(m, t) {
  const s = (n) => n;
  const a2 = (x, y) => ((t >> 3) & 1) ? x : y;
  switch (m.job) {
    case 'walker': return a2('walk1', 'walk2');
    case 'faller': return s('fall');
    case 'floatfall': return a2('float1', 'float2');
    case 'climber': return a2('climb1', 'climb2');
    case 'blocker': return ((t >> 4) & 1) ? 'block1' : 'block2';
    case 'builder': return a2('build1', 'build2');
    case 'basher': return a2('bash1', 'bash2');
    case 'miner': return a2('mine1', 'mine2');
    case 'digger': return a2('dig1', 'dig2');
    case 'ohno': return s('ohno');
    case 'shrug': return s('shrug');
    case 'splat': case 'burn': return s('splat');
    case 'drown': return s('drown');
    case 'exiting': return a2('exit1', 'exit2');
    default: return 'walk1';
  }
}

// ---- terrain palettes per theme ----
export const THEMES = {
  moss: { sky0: '#0c1428', sky1: '#28405c', dirt: ['#3e7a2e', '#54963a', '#6a4a2a', '#7e5c34'], top: '#8ee860', hill: '#16283c' },
  crystal: { sky0: '#100c24', sky1: '#302858', dirt: ['#4a5a90', '#5c6ea8', '#3c4878', '#6c80b8'], top: '#a8c0f0', hill: '#1c1838' },
  inferno: { sky0: '#180808', sky1: '#48201c', dirt: ['#7a4030', '#92503a', '#5e3024', '#a86048'], top: '#f0a060', hill: '#280f0c' },
};
export const STEEL_COLS = ['#8890a0', '#9aa2b2', '#787f8e'];
export const BRICK_COLS = ['#e8c060', '#d0a848'];
