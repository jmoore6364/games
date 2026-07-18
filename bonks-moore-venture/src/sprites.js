// Pixel art for Bonk's Moore-venture: string-grid sprites baked to
// offscreen canvases, plus procedural tiles, bosses and effects.
// All original art. Bonk's head is ~65% of his sprite — as it should be.

// ---- palette ----
const PAL = {
  s: '#f8c8a0', // bonk skin
  S: '#d09060', // skin shade
  d: '#202020', // outline
  w: '#f8f8f8', // white
  e: '#181818', // pupil
  r: '#e83030', // mouth red / meat
  R: '#a01818', // dark red
  b: '#8a5024', // loincloth brown
  B: '#5a3010', // dark brown
  k: '#f8f8f8', // teeth
  g: '#40b048', // dino green
  G: '#207828', // dark green
  q: '#b0a890', // shell tan
  Q: '#786850', // shell dark
  y: '#f8d800', // smiley yellow
  Y: '#c89800', // dark yellow
  o: '#f88800', // orange
  p: '#c060e0', // ptero purple
  m: '#903090', // dark purple
  c: '#40c8e8', // cyan / water
  C: '#2078b8', // dark cyan
  n: '#3858c8', // penguin blue
  N: '#182888', // penguin dark
  h: '#f890b8', // grub pink
  H: '#c05880', // grub dark pink
  v: '#a8e8b8', // pale green
  f: '#f8f8ff', // ice white
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

function flipped(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.translate(img.width, 0); g.scale(-1, 1);
  g.drawImage(img, 0, 0);
  return c;
}

export const SPR = {};
const defs = [];
function def(name, rows) { defs.push([name, rows]); }

// ======================= BONK: the head himself =======================
// 18 wide, 20 tall, faces right. Head is rows 0-12 (65%).

const HEAD = [
  '.....dddddddd.....',
  '...ddssssssssdd...',
  '..dssssssssssssd..',
  '.dssssssssssssssd.',
  '.dssssssssssssssd.',
  'dsssswwsssswwssssd',
  'dsssswesssswessssd',
  'dssssssssssssssssd',
  '.dsssssrrrrrsssd..',
  '..dssssRrrRssssd..',
  '..dssssssssssssd..',
  '...ddssssssssdd...',
  '.....dddddddd.....',
];

def('b_stand', [...HEAD,
  '.......ssss.......',
  '......ssssss......',
  '......dbbbbd......',
  '......dbbbbd......',
  '.......s..s.......',
  '.......s..s.......',
  '......ss..ss......',
]);

def('b_run1', [...HEAD,
  '.......ssss.......',
  '......ssssss......',
  '......dbbbbd......',
  '......dbbbbd......',
  '......s....s......',
  '.....ss....ss.....',
  '....ss......ss....',
]);

def('b_run2', [...HEAD,
  '.......ssss.......',
  '......ssssss......',
  '......dbbbbd......',
  '......dbbbbd......',
  '.......sss........',
  '......ss.s........',
  '......s...ss......',
]);

def('b_jump', [...HEAD,
  '.......ssss.......',
  '......ssssss......',
  '......dbbbbd......',
  '......dbbbbd......',
  '......ss..ss......',
  '..................',
  '..................',
]);

// standing headbutt — brows down, teeth gritted, body leaning back
def('b_butt', [
  '.....dddddddd.....',
  '...ddssssssssdd...',
  '..dssssssssssssd..',
  '.dssssssssssssssd.',
  '.dsssddssssddsssd.',
  'dsssswwsssswwssssd',
  'dssssswesssswesssd',
  'dssssssssssssssssd',
  '.dssssskkkkksssd..',
  '..dssssRRRRssssd..',
  '..dssssssssssssd..',
  '...ddssssssssdd...',
  '.....dddddddd.....',
  '.....ssss.........',
  '....ssssss........',
  '....dbbbbd........',
  '....dbbbbd........',
  '...ss..ss.........',
  '..ss.....s........',
  '..................',
]);

// diving headbutt — head-first, feet in the air
def('b_dive', [
  '......ss..ss......',
  '.......s..s.......',
  '......dbbbbd......',
  '......dbbbbd......',
  '......ssssss......',
  '.......ssss.......',
  '.....dddddddd.....',
  '...ddssssssssdd...',
  '..dssssssssssssd..',
  '.dssssssssssssssd.',
  '.dssssssssssssssd.',
  'dssssssssssssssssd',
  'dsssswwsssswwssssd',
  'dsssswesssswessssd',
  '.dssssssssssssssd.',
  '.dsssskkkkkksssd..',
  '..dssssssssssssd..',
  '...ddssssssssdd...',
  '.....dddddddd.....',
  '..................',
]);

// spin — a blur of head, motion streaks
def('b_spin1', [
  '.....dddddddd.....',
  '...ddssssssssdd...',
  '..dswwsssssssssd..',
  '.dssssssssswwsssd.',
  '.dsswwsssssssssdd.',
  'dsssssssswwsssssdd',
  'dsswwsssssssssssdd',
  '.dssssssswwssssdd.',
  '.dsswwsssssssssd..',
  '..dssssssswwssd...',
  '...ddssssssssdd...',
  '.....dddddddd.....',
  '..................',
]);

def('b_spin2', [
  '.....dddddddd.....',
  '...ddssssssssdd...',
  '..dssssssswwsssd..',
  '.dsswwsssssssssd..',
  '.ddsssssswwsssssd.',
  'ddssswwsssssssssd.',
  'ddsssssssssswwssd.',
  '.ddsswwsssssssssd.',
  '..dsssssssswwssd..',
  '...dswwsssssssd...',
  '...ddssssssssdd...',
  '.....dddddddd.....',
  '..................',
]);

// teeth-climb — jaws sunk into the wall on the right
def('b_climb1', [
  '.....ddddddd......',
  '...ddsssssssdd....',
  '..dsssssssssssd...',
  '.dssssssssssssdd..',
  '.dsssswwsssssskd..',
  '.dsssswessssskkd..',
  '.dssssssssssrrkd..',
  '.dsssssssssrrrkd..',
  '.dssssssssssrrkd..',
  '.dsssssssssssskd..',
  '..dsssssssssssd...',
  '...ddsssssssdd....',
  '.....ddddddd......',
  '.......ssss.......',
  '......ssssss......',
  '......dbbbbd......',
  '......dbbbbd......',
  '.......s..s.......',
  '......ss..ss......',
  '..................',
]);

def('b_climb2', [
  '.....ddddddd......',
  '...ddsssssssdd....',
  '..dsssssssssssd...',
  '.dssssssssssssdd..',
  '.dsssswwssssskkd..',
  '.dsssswesssskkkd..',
  '.dsssssssssskkkd..',
  '.dssssssssskkkkd..',
  '.dssssssssssskd...',
  '.dssssssssssssd...',
  '..dsssssssssssd...',
  '...ddsssssssdd....',
  '.....ddddddd......',
  '.......ssss.......',
  '......ssssss......',
  '......dbbbbd......',
  '......dbbbbd......',
  '......s..ss.......',
  '......ss..ss......',
  '..................',
]);

// swimming — horizontal, headbutt stroke
def('b_swim1', [
  '..........ddddddd.....',
  '........ddsssssssdd...',
  '.......dsssssssssssd..',
  '......dssssswwsssssd..',
  '......dssssswesssssd..',
  '.ssss.dsssssssssssssd.',
  'ssssssdsssssssssssssd.',
  'sbbbbbdssssssrrrsssd..',
  'sbbbbb.dsssssrrssssd..',
  '.s..s...dsssssssssd...',
  '.ss.ss...ddsssssdd....',
  '...........ddddd......',
]);

def('b_swim2', [
  '..........ddddddd.....',
  '........ddsssssssdd...',
  '.......dsssssssssssd..',
  '......dssssswwsssssd..',
  '......dssssswesssssd..',
  '..ss..dsssssssssssssd.',
  '.sssssdsssssssssssssd.',
  '.bbbbbdssssssrrrsssd..',
  '.bbbbb.dsssssrrssssd..',
  '..s.s...dsssssssssd...',
  '.ss..ss..ddsssssdd....',
  '...........ddddd......',
]);

// the MEAT FLEX — freeze-frame pose
def('b_flex', [...HEAD.slice(0, 8),
  '.dssssswwwwwsssd..',
  '..dssssrrrrssssd..',
  '..dssssssssssssd..',
  '...ddssssssssdd...',
  '.....dddddddd.....',
  '..ss...ssss...ss..',
  '...ss.ssssss.ss...',
  '......dbbbbd......',
  '......dbbbbd......',
  '.......s..s.......',
  '......ss..ss......',
  '..................',
]);

// hurt — big yelp
def('b_hurt', [
  '.....dddddddd.....',
  '...ddssssssssdd...',
  '..dssssssssssssd..',
  '.dssssssssssssssd.',
  '.dsssddssssddsssd.',
  'dssssdessssdesssd.',
  'dssssssssssssssssd',
  'dssssssssssssssssd',
  '.dssssssrrrsssd...',
  '..dssssrRRrsssd...',
  '..dssssssssssssd..',
  '...ddssssssssdd...',
  '.....dddddddd.....',
  '.......ssss.......',
  '.....ssssssss.....',
  '......dbbbbd......',
  '......dbbbbd......',
  '......s....s......',
  '.....ss....ss.....',
  '..................',
]);

// crying — game over
def('b_cry', [
  '.....dddddddd.....',
  '...ddssssssssdd...',
  '..dssssssssssssd..',
  '.dssssssssssssssd.',
  '.dsssddssssddsssd.',
  'dssssddssssddssssd',
  'dssssccssssccssssd',
  'dssssccssssccssssd',
  '.dsssscsssscsssd..',
  '..dssssRRRRssssd..',
  '..dsssRrrrrRsssd..',
  '...ddssssssssdd...',
  '.....dddddddd.....',
  '.......ssss.......',
  '......ssssss......',
  '......dbbbbd......',
  '......dbbbbd......',
  '.......s..s.......',
  '.......s..s.......',
  '......ss..ss......',
]);

// ======================= ENEMIES =======================

def('e_dino1', [
  '....dddddd....',
  '..ddggggggdd..',
  '.dggggggggggd.',
  '.dggggwegggggd',
  '.dggggggggggd.',
  '.dgggrrrgggd..',
  '..dggggggggd..',
  '...ddddddd....',
  '....gggg......',
  '...gGggGg.....',
  '...g....g.....',
  '..dg....gd....',
]);

def('e_dino2', [
  '....dddddd....',
  '..ddggggggdd..',
  '.dggggggggggd.',
  '.dggggwegggggd',
  '.dggggggggggd.',
  '.dgggrrrgggd..',
  '..dggggggggd..',
  '...ddddddd....',
  '....gggg......',
  '...gGggGg.....',
  '....g..g......',
  '....gd.dg.....',
]);

def('e_shell', [
  '...dddddddd.....',
  '..dqqqqqqqqd....',
  '.dqyqQqQqQqqd...',
  '.dqQqyqyqyqqd...',
  '.dqqqqqqqqqqdddd',
  '.dqqQqQqQqqdggwd',
  '..ddddddddddggg.',
  '....g...g..dddd.',
  '...dg...gd......',
]);

def('e_shellflip', [
  '....g...g.......',
  '...dg...gd.evd..',
  '..ddddddddddvvd.',
  '.dqqQqQqQqqdggd.',
  '.dqqqqqqqqqqddd.',
  '.dqQqyqyqyqqd...',
  '.dqyqQqQqQqqd...',
  '..dqqqqqqqqd....',
  '...dddddddd.....',
]);

def('e_ptero1', [
  '.dd............dd.',
  '.dppd........dppd.',
  '..dpppd.dd..dpppd.',
  '...dpppdppddpppd..',
  '....dpppppppppd...',
  '.....dppppppd.....',
  '......dpwepppddd..',
  '.......dppppdoo...',
  '........dddd......',
]);

def('e_ptero2', [
  '..................',
  '....dd......dd....',
  '...dpppd.ddpppd...',
  '....dpppdpppppd...',
  '....dpppppppppd...',
  '...dpppppppppd....',
  '..dpppdpwepppddd..',
  '.dppd..dppppdoo...',
  '.dd.....dddd......',
]);

def('e_frog', [
  '..dddddddd..',
  '.dggwggwggd.',
  '.dggegge.gd.',
  'dggggggggggd',
  'dgvvvvvvvvgd',
  'dgvvvvvvvvgd',
  '.dggggggggd.',
  '.dgg.gg.ggd.',
  'dgg..gg..ggd',
  'dd...dd...dd',
]);

def('e_spiky', [
  '.y..y..y..y...',
  '.dy.dy.dy.dy..',
  '.dmmmmmmmmmmd.',
  'dmmwemmmmmmmd.',
  'dmmmmmmmmmmmmd',
  'dmmmmmmmmmmmmd',
  '.dm.mm.mm.md..',
  '.dd.dd.dd.dd..',
]);

def('e_fish', [
  '.....dddddd..d.',
  '...ddccccccddcd',
  '..dccwecccccccd',
  '.dcccccccccccd.',
  '..dcccccccccdcd',
  '...ddccccccddcd',
  '.....dddddd..d.',
]);

def('e_cactus', [
  '.....oo.....',
  '....oyyo....',
  '.....gg.....',
  '...dggggd...',
  '..dggggggd..',
  '..dgwegggd..',
  '..dggggggd..',
  'g.dggrrggd.g',
  'ggdggggggdgg',
  '.dggggggggd.',
  '..dggggggd..',
  '..dggggggd..',
  '..dggggggd..',
  '..dGGGGGGd..',
]);

def('e_penguin', [
  '...dddddd...',
  '..dnnnnnnd..',
  '.dnnwennnnd.',
  '.dnnnnnnnnd.',
  '.dnnoonnnnd.',
  'dnnwwwwnnnnd',
  'dnnwwwwnnnnd',
  'dnnwwwwnnnnd',
  '.dnwwwwnnd..',
  '.dnnnnnnnd..',
  '..doo.ood...',
]);

def('e_grub', [
  '............dddddddd......',
  '..........ddhhhhhhhhdd....',
  '.ddddddd.dhhhhhhhhhhhhd...',
  'dhhhhhhhdhhhwwehhhwwehhd..',
  'dhHhhHhhhhhhhhhhhhhhhhhd..',
  'dhhhhhhhhhhhhhhhhhhhhhhd..',
  'dhHhhHhhHhhhhhRRRRhhhhd...',
  'dhhhhhhhhhhhhhRRRRhhhhd...',
  'dhHhhHhhHhhhhhhhhhhhhd....',
  '.dhhhhhhhhhhhhhhhhhhd.....',
  '..ddddddddddddddddd.......',
]);

// ======================= ITEMS =======================

def('i_smiley', [
  '..dddddd..',
  '.dyyyyyyd.',
  'dyyeyyeyyd',
  'dyyyyyyyyd',
  'dyeyyyyeyd',
  'dyyeeeeyyd',
  '.dyyyyyyd.',
  '..dddddd..',
]);

def('i_meat1', [
  '..dddddd....',
  '.drrrrrrd...',
  'drrRrrrrrdww',
  'drrrrRrrrdww',
  '.drrrrrrdww.',
  '..ddddddww..',
]);

def('i_meat2', [
  '...dddddddd.....',
  '..drrrrrrrrd....',
  '.drrRRrrrrrrd...',
  'drrrrrrrRrrrrdww',
  'drrRrrrrrrrrdwww',
  'drrrrrrRrrrrdwww',
  '.drrrrrrrrrdww..',
  '..drrRrrrrd.ww..',
  '...dddddddd.....',
]);

def('i_heart', [
  '.dd...dd..',
  'drrd.drrd.',
  'drrrdrrrrd',
  'drrrrrrrd.',
  '.drrrrrd..',
  '..drrrd...',
  '...drd....',
  '....d.....',
]);

def('i_heartcont', [
  '.ww....ww...',
  'wddw..wddw..',
  'wdrrdwdrrdw.',
  'wdrrrdrrrrdw',
  '.wdrrrrrrdw.',
  '..wdrrrrdw..',
  '...wdrrdw...',
  '....wddw....',
  '.....ww.....',
]);

def('i_fruit', [
  '....gg....',
  '...gg.....',
  '..dood....',
  '.doooood..',
  'doooooood.',
  'dooYooood.',
  'doooooood.',
  '.doooood..',
  '..doood...',
]);

def('i_spring1', [
  '..hh.yy.hh......',
  '.hhhdyydhhh.....',
  '.hhdyyyydhh.....',
  '..dyyeeyyd......',
  '.hhdyyyydhh.....',
  '.hhhdyydhhh.....',
  '..hh.gg.hh......',
  '.....gg.........',
  '....g.g.........',
  '.....gg.........',
  '....g.g.........',
  '....GGG.........',
]);

def('i_spring2', [
  '................',
  '................',
  '................',
  '................',
  '..hh.yy.hh......',
  '.hhhdyydhhh.....',
  '.hhdyeeyydhh....',
  '..hdyyyydh......',
  '...h.gg.h.......',
  '....ggg.........',
  '....g.g.........',
  '....GGG.........',
]);

def('i_door', [
  '.....hhhhhhh........',
  '...hhyyyyyyyhh......',
  '..hyy.......yyh.....',
  '.hy..ddddddd..yh....',
  '.hy.dNNNNNNNd.yh....',
  'hy..dNNNNNNNd..yh...',
  'hy..dNNNNNNNd..yh...',
  'hy..dNNNNNNNd..yh...',
  'hy..dNNNNNNNd..yh...',
  'hy..dNNNNNNNd..yh...',
  '.hy.dNNNNNNNd.yh....',
  '.hy.dNNNNNNNd.yh....',
  '..hhdNNNNNNNdhh.....',
  '...gdNNNNNNNdg......',
  '..ggdNNNNNNNdgg.....',
]);

def('i_goal', [
  '......dddddddddd........',
  '....ddyyyyyyyyyydd......',
  '...dyyyyyyyyyyyyyyd.....',
  '..dyyyeeyyyyyyeeyyyd....',
  '..dyyyeeyyyyyyeeyyyd....',
  '..dyyyyyyyyyyyyyyyyd....',
  '..dyyeyyyyyyyyyyeyyd....',
  '..dyyyeeyyyyyyeeyyyd....',
  '...dyyyyeeeeeeyyyyd.....',
  '....ddyyyyyyyyyydd......',
  '......dddddddddd........',
  '........dqqqqd..........',
  '........dqqqqd..........',
  '......ddqqqqqqdd........',
  '.....dqQqQqQqQqqd.......',
  '.....dqqqqqqqqqqd.......',
]);

def('i_egg', [
  '..ddd..',
  '.dwwwd.',
  'dwwwwwd',
  'dwwvwwd',
  'dwwwwwd',
  '.dwwwd.',
  '..ddd..',
]);

// ======================= baking =======================

export function initSprites() {
  for (const [name, rows] of defs) {
    const img = bake(rows);
    SPR[name] = { r: img, l: flipped(img) };
  }
  // "angry Bonk" (small meat) — hot red-orange palette variants
  const hot = { ...PAL, s: '#f87840', S: '#c04010', b: '#f8d800', B: '#c89800' };
  for (const [name, rows] of defs) {
    if (!name.startsWith('b_')) continue;
    const img = bake(rows, hot);
    SPR['hot_' + name] = { r: img, l: flipped(img) };
  }
  // rampage white-flash variants
  const blaze = { ...PAL, s: '#f8f8f8', S: '#f8d8a0', b: '#f8f8f8', B: '#d8d8d8', d: '#f89800' };
  for (const [name, rows] of defs) {
    if (!name.startsWith('b_')) continue;
    const img = bake(rows, blaze);
    SPR['bz_' + name] = { r: img, l: flipped(img) };
  }
}

export function drawSprite(ctx, name, x, y, flip = false) {
  const s = SPR[name];
  if (!s) return;
  ctx.drawImage(flip ? s.l : s.r, Math.round(x), Math.round(y));
}

// ======================= themes & tiles =======================

export const THEMES = {
  grass: { name: 'GRASSLANDS', music: 'grass', sky0: '#68c0f8', sky1: '#a8e0f8', ground: '#a06030', gDark: '#784820', top: '#40b048', top2: '#68d060' },
  falls: { name: 'WATERFALL CLIFFS', music: 'falls', sky0: '#4888d8', sky1: '#88b8e8', ground: '#8888a0', gDark: '#606078', top: '#50a858', top2: '#78c878' },
  lava: { name: 'LAVA CRATER', music: 'lava', sky0: '#401018', sky1: '#883020', ground: '#584850', gDark: '#403038', top: '#786068', top2: '#907880' },
  ice: { name: 'ICE PLATEAU', music: 'ice', sky0: '#88b8e8', sky1: '#c8e8f8', ground: '#88a8d8', gDark: '#6080b8', top: '#f8f8ff', top2: '#d8e8f8' },
  moon: { name: 'MOON PALACE', music: 'moon', sky0: '#100828', sky1: '#301850', ground: '#786098', gDark: '#584878', top: '#b0a0c8', top2: '#d0c0e8' },
  bonus: { name: 'BONUS', music: 'bonus', sky0: '#f8a8d0', sky1: '#f8d0e0', ground: '#c878a8', gDark: '#985880', top: '#f8e888', top2: '#f8f8b0' },
};

// t matches T in levels.js: 1 solid, 2 plat, 3 water, 4 bite, 5 lava, 6 ice
export function drawTile(ctx, t, themeKey, sx, sy, frame, topOpen) {
  const th = THEMES[themeKey];
  if (t === 1) { // solid
    ctx.fillStyle = th.ground;
    ctx.fillRect(sx, sy, 16, 16);
    ctx.fillStyle = th.gDark;
    ctx.fillRect(sx + 2, sy + 6, 5, 4);
    ctx.fillRect(sx + 10, sy + 12, 4, 3);
    if (topOpen) {
      ctx.fillStyle = th.top;
      ctx.fillRect(sx, sy, 16, 5);
      ctx.fillStyle = th.top2;
      ctx.fillRect(sx, sy, 16, 2);
      ctx.fillRect(sx + 3, sy + 2, 2, 2);
      ctx.fillRect(sx + 9, sy + 2, 3, 2);
    }
  } else if (t === 2) { // jump-through platform
    ctx.fillStyle = th.top;
    ctx.fillRect(sx, sy, 16, 5);
    ctx.fillStyle = th.top2;
    ctx.fillRect(sx, sy, 16, 2);
    ctx.fillStyle = th.gDark;
    ctx.fillRect(sx + 1, sy + 5, 2, 2);
    ctx.fillRect(sx + 13, sy + 5, 2, 2);
  } else if (t === 3) { // water
    ctx.fillStyle = 'rgba(40,120,216,0.75)';
    ctx.fillRect(sx, sy, 16, 16);
    if (topOpen) {
      ctx.fillStyle = '#a8e0f8';
      const ph = (frame >> 3) % 2;
      for (let i = 0; i < 4; i++) ctx.fillRect(sx + i * 4 + (ph ? 2 : 0), sy, 3, 2);
    } else if (((sx * 7 + sy * 13) & 31) === 0) {
      ctx.fillStyle = 'rgba(168,224,248,0.5)';
      ctx.fillRect(sx + 6, sy + ((frame >> 2) + sx) % 14, 2, 2);
    }
  } else if (t === 4) { // BITE wall — chompable, marked with big white tooth-marks
    ctx.fillStyle = th.ground;
    ctx.fillRect(sx, sy, 16, 16);
    ctx.fillStyle = th.gDark;
    ctx.fillRect(sx, sy, 2, 16);
    ctx.fillRect(sx + 14, sy, 2, 16);
    ctx.fillStyle = '#f8f8f8';
    // two rows of chomp-chevrons
    for (const oy of [2, 9]) {
      ctx.fillRect(sx + 3, sy + oy, 3, 2);
      ctx.fillRect(sx + 6, sy + oy + 2, 3, 2);
      ctx.fillRect(sx + 9, sy + oy, 3, 2);
    }
  } else if (t === 5) { // lava
    const ph = (frame >> 3) % 2;
    ctx.fillStyle = ph ? '#f86800' : '#f88800';
    ctx.fillRect(sx, sy, 16, 16);
    ctx.fillStyle = '#f8d800';
    ctx.fillRect(sx + (ph ? 2 : 8), sy + 2, 4, 2);
    ctx.fillRect(sx + (ph ? 10 : 4), sy + 8, 3, 2);
    if (topOpen) {
      ctx.fillStyle = '#f8f088';
      ctx.fillRect(sx, sy, 16, 2);
    }
  } else if (t === 6) { // ice — slippery!
    ctx.fillStyle = '#b8d8f8';
    ctx.fillRect(sx, sy, 16, 16);
    ctx.fillStyle = '#f8f8ff';
    ctx.fillRect(sx, sy, 16, 4);
    ctx.fillStyle = '#88b8e8';
    ctx.fillRect(sx + 3, sy + 8, 6, 2);
    ctx.fillRect(sx + 11, sy + 12, 3, 2);
  }
}

// ======================= procedural drawing =======================

// Bonk's comically large head at any scale, for title / cards / ending.
export function drawBigHead(ctx, cx, cy, r, mood, frame) {
  const o = '#202020';
  ctx.fillStyle = o;
  ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8c8a0';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d09060';
  ctx.beginPath(); ctx.arc(cx - r * 0.15, cy + r * 0.75, r * 0.5, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#f8c8a0';
  ctx.beginPath(); ctx.arc(cx - r * 0.1, cy + r * 0.62, r * 0.55, 0, Math.PI * 2); ctx.fill();
  // eyes
  const blink = mood !== 'cry' && (frame % 190) > 182;
  for (const ex of [cx - r * 0.36, cx + r * 0.36]) {
    if (blink) {
      ctx.fillStyle = o;
      ctx.fillRect(ex - r * 0.2, cy - r * 0.2, r * 0.4, 2);
      continue;
    }
    ctx.fillStyle = '#f8f8f8';
    ctx.beginPath(); ctx.ellipse(ex, cy - r * 0.18, r * 0.2, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = o;
    ctx.beginPath(); ctx.arc(ex + r * 0.05, cy - r * 0.12, r * 0.09, 0, Math.PI * 2); ctx.fill();
  }
  if (mood === 'cry') {
    ctx.fillStyle = '#40c8e8';
    const dy = (frame * 2) % 20;
    for (const ex of [cx - r * 0.36, cx + r * 0.36]) {
      ctx.fillRect(ex - 2, cy - r * 0.02, 4, r * 0.35);
      ctx.fillRect(ex - 2, cy + r * 0.33 + dy, 4, 6);
    }
    ctx.fillStyle = '#a01818';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.55, r * 0.25, Math.PI, 0); ctx.fill();
  } else if (mood === 'wow') {
    ctx.fillStyle = '#a01818';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.45, r * 0.18, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  } else { // grin
    ctx.fillStyle = '#a01818';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.32, r * 0.38, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(cx - r * 0.36, cy + r * 0.3, r * 0.72, r * 0.12);
  }
}

// King Moore-Drool III — giant dino king, crown is the weak point.
export function drawKing(ctx, x, y, frame, flip, flash, hurt) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) { ctx.translate(48, 0); ctx.scale(-1, 1); }
  const body = flash ? '#f8f8f8' : hurt ? '#f89058' : '#40b048';
  const dark = flash ? '#d8d8d8' : '#207828';
  const bob = Math.sin(frame / 9) * 1.5;
  // tail
  ctx.fillStyle = dark;
  ctx.fillRect(-8, 34 + bob / 2, 14, 8);
  // legs
  ctx.fillStyle = dark;
  const step = Math.sin(frame / 6) * 3;
  ctx.fillRect(10 + step, 40, 10, 12);
  ctx.fillRect(26 - step, 40, 10, 12);
  // body
  ctx.fillStyle = body;
  ctx.fillRect(4, 22 + bob, 36, 22);
  ctx.fillStyle = dark;
  ctx.fillRect(4, 22 + bob, 36, 3);
  // belly
  ctx.fillStyle = '#a8e8b8';
  ctx.fillRect(10, 30 + bob, 22, 12);
  // head (big, at right)
  ctx.fillStyle = body;
  ctx.fillRect(20, 4 + bob, 28, 22);
  // jaw + drool
  ctx.fillStyle = dark;
  ctx.fillRect(34, 18 + bob, 14, 6);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(36, 17 + bob, 3, 3); ctx.fillRect(42, 17 + bob, 3, 3);
  ctx.fillStyle = '#a8e0f8';
  ctx.fillRect(44, 24 + bob + ((frame >> 2) % 6), 2, 4); // the moore-drool
  // eye
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(30, 9 + bob, 7, 7);
  ctx.fillStyle = '#181818'; ctx.fillRect(33, 11 + bob, 3, 3);
  // CROWN — the weak point, flashes gold
  const cy = -4 + bob;
  ctx.fillStyle = (frame >> 3) % 2 ? '#f8d800' : '#f8f088';
  ctx.fillRect(24, cy + 2, 20, 6);
  for (let i = 0; i < 4; i++) ctx.fillRect(24 + i * 5, cy - 3, 3, 5);
  ctx.fillStyle = '#e83030';
  ctx.fillRect(32, cy + 3, 4, 4);
  ctx.restore();
}

export function drawPoof(ctx, x, y, t) {
  const r = 3 + t * 0.8;
  ctx.fillStyle = t % 4 < 2 ? '#f8f8f8' : '#f8d8a0';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + t * 0.2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(1, 5 - t * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawStars(ctx, x, y, t) {
  ctx.fillStyle = t % 6 < 3 ? '#f8d800' : '#f8f8f8';
  for (let i = 0; i < 3; i++) {
    const a = t * 0.12 + (i / 3) * Math.PI * 2;
    ctx.fillRect(x + Math.cos(a) * 9 - 1, y + Math.sin(a) * 3 - 1, 3, 3);
  }
}

export function drawShockwave(ctx, x, y, t) {
  const r = t * 3.2;
  ctx.strokeStyle = `rgba(248,216,0,${Math.max(0, 1 - t / 14)})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(248,248,248,${Math.max(0, 0.8 - t / 14)})`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.7, r * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
}

export function drawGeyser(ctx, x, groundY, h, frame) {
  // erupting column of water/steam, width 14
  for (let yy = groundY - h; yy < groundY; yy += 4) {
    const w = 10 + ((yy + frame * 3) % 8 > 4 ? 3 : 0);
    ctx.fillStyle = ((yy >> 2) + (frame >> 2)) % 2 ? '#a8e0f8' : '#e8f8ff';
    ctx.fillRect(x + 7 - w / 2, yy, w, 4);
  }
  ctx.fillStyle = '#f8f8ff';
  ctx.fillRect(x + 2, groundY - h - 3, 10, 4);
}
