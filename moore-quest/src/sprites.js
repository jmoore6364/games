// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural terrain tiles. All original art.
//
// Party members and NPCs share two humanoid templates (tunic / dress),
// baked once per character with that character's palette.

const PAL = {
  d: '#101010', // outline / eyes
  w: '#f8f8f8', // white
  s: '#f8b888', // default skin
  y: '#f8d838', // gold
  o: '#e07820', // orange
  r: '#c02818', // red
  R: '#f84020', // bright red
  g: '#30a020', // green
  G: '#186010', // dark green
  b: '#3868f8', // blue
  B: '#182888', // dark blue
  c: '#40d8d8', // cyan
  p: '#c060e0', // purple
  P: '#682898', // dark purple
  q: '#a8a8b8', // grey
  Q: '#585868', // dark grey
  k: '#e8e0c8', // bone
  h: '#804010', // brown
  H: '#502808', // dark brown
  t: '#d8b048', // tan
  n: '#282838', // near-black
  m: '#607048', // murk green
  M: '#404830', // dark murk
};

function bake(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

export const SPR = {};
const defs = [];
function def(name, rows, palOverride) { defs.push([name, rows, palOverride]); }

// ======================= HUMANOID TEMPLATES =======================
// Letters: 1 hair/hat  2 skin  3 coat  4 coat dark/trim  5 legs  6 boots

const TUNIC = {
  d1: [
    '.....111111.....',
    '....11111111....',
    '....12222222....',
    '....2d2222d2....',
    '....22222222....',
    '.....222222.....',
    '.....333333.....',
    '....33333333....',
    '...233333333.2..',
    '...2344444432...',
    '....33333333....',
    '.....444444.....',
    '.....55..55.....',
    '.....55..55.....',
    '....666..666....',
    '................',
  ],
  d2: [
    '................',
    '.....111111.....',
    '....11111111....',
    '....12222222....',
    '....2d2222d2....',
    '....22222222....',
    '.....222222.....',
    '.....333333.....',
    '....33333333....',
    '...2334444333...',
    '.....333333.....',
    '.....444444.....',
    '....55....55....',
    '...55......55...',
    '..666......666..',
    '................',
  ],
  u1: [
    '.....111111.....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '.....111111.....',
    '.....333333.....',
    '....33333333....',
    '...233333333.2..',
    '...2344444432...',
    '....33333333....',
    '.....444444.....',
    '.....55..55.....',
    '.....55..55.....',
    '....666..666....',
    '................',
  ],
  u2: [
    '................',
    '.....111111.....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '.....111111.....',
    '.....333333.....',
    '....33333333....',
    '...2334444332...',
    '.....333333.....',
    '.....444444.....',
    '....55....55....',
    '...55......55...',
    '..666......666..',
    '................',
  ],
  s1: [
    '.....111111.....',
    '....11111111....',
    '....11222222....',
    '....112d2222....',
    '....11222222....',
    '.....122222.....',
    '.....333333.....',
    '....3333333.....',
    '....33333332....',
    '....34444442....',
    '....333333......',
    '.....44444......',
    '.....55.55......',
    '.....55.55......',
    '....666.666.....',
    '................',
  ],
  s2: [
    '................',
    '.....111111.....',
    '....11111111....',
    '....11222222....',
    '....112d2222....',
    '....11222222....',
    '.....122222.....',
    '.....333333.....',
    '....33333332....',
    '....34444442....',
    '....333333......',
    '.....44444......',
    '....55...55.....',
    '...55.....55....',
    '..666.....666...',
    '................',
  ],
};

const DRESS = {
  d1: [
    '.....111111.....',
    '....11111111....',
    '....12222221....',
    '....2d2222d2....',
    '....22222222....',
    '.....222222.....',
    '.....333333.....',
    '....33333333....',
    '...2333333332...',
    '...2334444332...',
    '....33333333....',
    '...3333333333...',
    '..333333333333..',
    '..333333333333..',
    '...66......66...',
    '................',
  ],
  d2: [
    '................',
    '.....111111.....',
    '....11111111....',
    '....12222221....',
    '....2d2222d2....',
    '....22222222....',
    '.....222222.....',
    '.....333333.....',
    '....33333333....',
    '...2334444332...',
    '....33333333....',
    '...3333333333...',
    '..333333333333..',
    '..333333333333..',
    '..66........66..',
    '................',
  ],
  u1: [
    '.....111111.....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '.....111111.....',
    '.....333333.....',
    '....33333333....',
    '...2333333332...',
    '...2334444332...',
    '....33333333....',
    '...3333333333...',
    '..333333333333..',
    '..333333333333..',
    '...66......66...',
    '................',
  ],
  u2: [
    '................',
    '.....111111.....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '....11111111....',
    '.....111111.....',
    '.....333333.....',
    '....33333333....',
    '...2334444332...',
    '....33333333....',
    '...3333333333...',
    '..333333333333..',
    '..333333333333..',
    '..66........66..',
    '................',
  ],
  s1: [
    '.....111111.....',
    '....11111111....',
    '....11222222....',
    '....112d2222....',
    '....11222222....',
    '.....122222.....',
    '.....333333.....',
    '....3333333.....',
    '....33333332....',
    '....34444442....',
    '....3333333.....',
    '....33333333....',
    '...3333333333...',
    '...3333333333...',
    '....66....66....',
    '................',
  ],
  s2: [
    '................',
    '.....111111.....',
    '....11111111....',
    '....11222222....',
    '....112d2222....',
    '....11222222....',
    '.....122222.....',
    '.....333333.....',
    '....33333332....',
    '....34444442....',
    '....3333333.....',
    '....33333333....',
    '...3333333333...',
    '...3333333333...',
    '...66.....66....',
    '................',
  ],
};

// name -> [template, {1: hair, 2: skin, 3: coat, 4: trim, 5: legs, 6: boots}]
const CHARS = {
  moore: [TUNIC, { 1: '#804010', 2: '#f8b888', 3: '#3868f8', 4: '#f8d838', 5: '#804010', 6: '#502808' }],
  brann: [TUNIC, { 1: '#c02818', 2: '#e8a878', 3: '#804010', 4: '#502808', 5: '#585868', 6: '#282838' }],
  lyra: [DRESS, { 1: '#101010', 2: '#f8c8a0', 3: '#682898', 4: '#c060e0', 5: '#682898', 6: '#282838' }],
  man: [TUNIC, { 1: '#502808', 2: '#f8b888', 3: '#30a020', 4: '#186010', 5: '#804010', 6: '#502808' }],
  man2: [TUNIC, { 1: '#101010', 2: '#e8a878', 3: '#d8b048', 4: '#804010', 5: '#585868', 6: '#282838' }],
  woman: [DRESS, { 1: '#f8d838', 2: '#f8c8a0', 3: '#c02818', 4: '#f8d838', 5: '#c02818', 6: '#502808' }],
  woman2: [DRESS, { 1: '#804010', 2: '#f8b888', 3: '#40d8d8', 4: '#182888', 5: '#40d8d8', 6: '#502808' }],
  elder: [TUNIC, { 1: '#e8e0c8', 2: '#e8b890', 3: '#a8a8b8', 4: '#585868', 5: '#a8a8b8', 6: '#282838' }],
  guard: [TUNIC, { 1: '#585868', 2: '#f8b888', 3: '#a8a8b8', 4: '#c02818', 5: '#585868', 6: '#282838' }],
  mayor: [TUNIC, { 1: '#e8e0c8', 2: '#f8b888', 3: '#c02818', 4: '#f8d838', 5: '#282838', 6: '#101010' }],
  cultist: [TUNIC, { 1: '#282838', 2: '#404050', 3: '#282838', 4: '#682898', 5: '#282838', 6: '#101010' }],
};

// ======================= BATTLE SPRITES =======================
// Regular enemies 24x24; bosses 32x32 (drawn 2x in battle).

def('b_ashwolf', [
  '........................',
  '........................',
  '........................',
  '......QQ................',
  '.....QQQQ...........Q...',
  '.....QwdQQ.........QQ...',
  '.....QQQQQQ.......QQ....',
  '......QQQQQQQQQQQQQQ....',
  '....QQQQQQQQQQQQQQQQ....',
  '...QQQQQQQQQQQQQQQQ.....',
  '..QQdQQQQQQQQQQQQQQ.....',
  '..QQQ.QQQQQQQQQQQQQ.....',
  '.......QQQQQQQQQQQQ.....',
  '.......QQ..QQQ...QQ.....',
  '.......QQ...QQ...QQ.....',
  '......QQ....QQ....QQ....',
  '......nn....nn....nn....',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_wisp', [
  '........................',
  '........................',
  '...........R............',
  '..........RRR...........',
  '.........RRoRR..........',
  '........RRoooRR.........',
  '.......RRoo0ooRR........'.replace('0', 'o'),
  '.......RooyyyooR........',
  '......RRoyyyyyoRR.......',
  '......RoyydyydyoR.......',
  '......RoyyyyyyyoR.......',
  '......RoyydddyyoR.......',
  '......RRoyyyyyoRR.......',
  '.......RooyyyooR........',
  '.......RRoooooRR........',
  '........RRoooRR.........',
  '.........RRoRR..........',
  '..........RRR...........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_spider', [
  '........................',
  '........................',
  '........................',
  '........................',
  '..G..................G..',
  '...G................G...',
  '....G..GGGGGGGG....G....',
  '....GGGGGGGGGGGGGGG.....',
  '...G.GGGwdGGdwGGG.G.....',
  '..G..GGGGGGGGGGG...G....',
  '.....GGGGddGGGGG........',
  '..G..GGGGGGGGGGG..G.....',
  '...GGGgggggggggGGG......',
  '..G..ggggggggggg...G....',
  '.....gggGGGGggg.........',
  '..G...ggggggggg...G.....',
  '...G...ggggggg....G.....',
  '....G.........G..G......',
  '.....G.........G........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_bonewalker', [
  '........................',
  '.......kkkkkkkk.........',
  '......kkkkkkkkkk........',
  '......kddkkkkddk........',
  '......kkkkkkkkkk........',
  '.......kdkdkdkd.........',
  '........kkkkkk..........',
  '.......kkkkkkkk.........',
  '.....kk.kkkkkk.kk.......',
  '.....k..kkkkkk..k.......',
  '.....k.kkkkkkkk.k.......',
  '.....k..kkkkkk..k.......',
  '....kk...kkkk...kk......',
  '.........kkkk...........',
  '........kk..kk..........',
  '........kk..kk..........',
  '........kk..kk..........',
  '.......kkk..kkk.........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_crawler', [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '......mmmmmmmmmm........',
  '....mmmmmmmmmmmmmm......',
  '...mmMmmmmmmmmmMmmm.....',
  '..mmmmmwdmmmmdwmmmmm....',
  '..mMmmmmmmmmmmmmmmMm....',
  '..mmmmMMMMMMMMMMmmmm....',
  '..mmMMMddddddMMMMMmm....',
  '...mmMMMMMMMMMMMMmm.....',
  '..mm.mmm.mm.mmm.mm......',
  '.mm..mm...mm..mm..m.....',
  '.m...m....m....m...m....',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_serpent', [
  '........................',
  '........gggg............',
  '.......gggggg...........',
  '......ggwdgggg..........',
  '......gggggggg..........',
  '......ggRRggg...........',
  '.......gRRgg............',
  '.......gggg.............',
  '.......gggg.............',
  '......ggggg.............',
  '.....ggggg....gggg......',
  '....ggggg...gggggggg....',
  '....gggg...gggggggggg...',
  '....gggg..gggg....ggg...',
  '....ggggggggg.....ggg...',
  '.....gggggggg....gggg...',
  '......ggggggggggggggg...',
  '.......ggggggggggggg....',
  '.........ggggggggg......',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_duskbat', [
  '........................',
  '........................',
  '........................',
  'PP....................PP',
  'PPP..................PPP',
  '.PPPP..............PPPP.',
  '..PPPPP..PPPPPP..PPPPP..',
  '...PPPPPPPPPPPPPPPPPP...',
  '....PPPPPPPPPPPPPPPP....',
  '.....PPPRddPPddRPPP.....',
  '......PPPPPPPPPPPP......',
  '.......PPPddddPPP.......',
  '........PPPPPPPP........',
  '.........PP..PP.........',
  '........PP....PP........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_cultist', [
  '........................',
  '........nnnnnn..........',
  '.......nnnnnnnn.........',
  '......nnnnnnnnnn........',
  '......nnRnnnnRnn........',
  '......nnnnnnnnnn........',
  '.......nnnnnnnn.........',
  '......nnnnnnnnnn........',
  '.....nnnnnnnnnnnn.......',
  '....nnnPnnnnnnPnnn......',
  '....nnnPnnnnnnPnn.w.....',
  '...nnnnPnnnnnnPnn.ww....',
  '...nnnnnnnnnnnnnn.w.....',
  '...nnnnnnnnnnnnnnnq.....',
  '...nnnnnnnnnnnnnn.......',
  '...nnnnnnnnnnnnnn.......',
  '..nnnnnnnnnnnnnnnn......',
  '..nnnnnnnnnnnnnnnn......',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_brute', [
  '........................',
  '......nnnnnnnn..........',
  '.....nnnnnnnnnn.........',
  '.....nnRnnnnRnn....HH...',
  '.....nnnnnnnnnn....HH...',
  '......nnnnnnnn.....HH...',
  '....nnnnnnnnnnnn...HH...',
  '...nnnnnnnnnnnnnn..HH...',
  '..nnnnnnnnnnnnnnnn.HH...',
  '..nnPnnnnnnnnnnPnnnHH...',
  '..nnPnnnnnnnnnnPnn2HH...',
  '..nnPnnnnnnnnnnPnn.HH...',
  '..nnnnnnnnnnnnnnnn.HH...'.replace('2', 'n'),
  '..nnnnnnnnnnnnnnnn......',
  '..nnnnnnnnnnnnnnnn......',
  '..nnnnnnnnnnnnnnnn......',
  '..nnnnnnnnnnnnnnnn......',
  '.nnnnnnnnnnnnnnnnnn.....',
  '.nnnnnn......nnnnnn.....',
  '.nnnnn........nnnnn.....',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_cragbeast', [
  '........................',
  '........................',
  '.......QQQQQQQQ.........',
  '.....QQQQQQQQQQQQ.......',
  '....QQqqQQQQQQqqQQ......',
  '...QQqyyqQQQQqyyqQQ.....',
  '...QQqqqQQQQQQqqqQQ.....',
  '..QQQQQQQQQQQQQQQQQQ....',
  '..QQqQQQQQQQQQQQQqQQ....',
  '..QQQQQQdddddQQQQQQQ....',
  '..QQQQQddQQQddQQQQQQ....',
  '..QQQQQQQQQQQQQQQQQ.....',
  '...QQQQQQQQQQQQQQQQ.....',
  '...QQQQQQQQQQQQQQQ......',
  '..QQQQQ.QQQQQ.QQQQQ.....',
  '..QQQQ...QQQ...QQQQ.....',
  '..QQQ.....Q.....QQQ.....',
  '..nnn...........nnn.....',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_revenant', [
  '........................',
  '.......qqqqqqqq.........',
  '......qqqqqqqqqq........',
  '......qq.qqqq.qq........',
  '......qqcqqqqcqq........',
  '......qqqqqqqqqq........',
  '.......qqqqqqqq.........',
  '......qqqqqqqqqq........',
  '....qqqqqqqqqqqqqq......',
  '...qqq.qqqqqqqq.qqq.....',
  '...qq..qqqqqqqq..qq.....',
  '...qq.qqqqqqqqqq.qq.....',
  '...q..qqqqqqqqqq..q.....',
  '......qqqqqqqqqq........',
  '.......qqqqqqqq.........',
  '.......qqq..qqq.........',
  '......qqq....qqq........',
  '......qq......qq........',
  '.......q......q.........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_embereater', [
  '........................',
  '........................',
  '........................',
  '....nnnn......nnnn......',
  '...nnnnnn....nnnnnn.....',
  '...nnRnnnnnnnnnnRnn.....',
  '...nnnnnnnnnnnnnnnn.....',
  '....nnnnnnnnnnnnnn......',
  '...nnnnRRnnnnRRnnnn.....',
  '..nnnRRnnnnnnnnRRnnn....',
  '..nnnnnnnRRRRnnnnnnn....',
  '..nRRnnnRRooRRnnnRRn....',
  '..nnnnnnRoyyoRnnnnnn....',
  '..nnnRRnRRooRRnRRnnn....',
  '...nnnnnnRRRRnnnnnn.....',
  '...nnnnnnnnnnnnnnnn.....',
  '....nnnn.nnnn.nnnn......',
  '....nnn...nn...nnn......',
  '....nn....nn....nn......',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]);
def('b_shadowknight', [
  '........................',
  '.......PPPPPPPP.........',
  '......PPPPPPPPPP........',
  '......PPnnnnnnPP........',
  '......PPnRnnRnPP........',
  '......PPnnnnnnPP........',
  '.......PPPPPPPP.........',
  '.....PPPPPPPPPPPP..w....',
  '....PPPPPPPPPPPPPP.w....',
  '...PPPnPPPPPPnPPPP.w....',
  '...PPnnPPPPPPnnPP..w....',
  '...PPnnPPPPPPnnPP..w....',
  '...PPnnPPPPPPnnPPPyy....',
  '...PPPnPPPPPPnPPP..y....',
  '....PPPPPPPPPPPP........',
  '....PPPPPPPPPPPP........',
  '.....PPP....PPP.........',
  '.....PPP....PPP.........',
  '.....PPP....PPP.........',
  '....PPPP....PPPP........',
  '........................',
  '........................',
  '........................',
  '........................',
]);

// Drowned One — a barnacled corpse-walker of the Sunken Vault.
def('b_drowned', [
  '........................',
  '.......cccccccc.........',
  '......cccccccccc........',
  '......cddcccccdc........',
  '......cccccccccc........',
  '.......cdcdcdcd.........',
  '........cccccc..........',
  '....m..cccccccc.........',
  '.....mm.cccccc.mm.......',
  '.....c..cccccc..c.......',
  '.....c.ccmccccc.c.......',
  '.....c..cccccc..c.......',
  '....cc...cccc...cc......',
  '.........cccc...........',
  '........cc..cc..........',
  '........cc..cc.m........',
  '........cc..cc.m........',
  '.......ccc..ccc.........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
], { c: '#58a8a0', m: '#2a6858' }),
// Deep Shade — a wraith of black water.
def('b_deepshade', [
  '........................',
  '........................',
  '......BBBBBBBB..........',
  '.....BBBBBBBBBB.........',
  '....BBBcBBBBcBBB........',
  '....BBBcBBBBcBBB........',
  '....BBBBBBBBBBBB........',
  '.....BBBBddBBBB.........',
  '....BBBBBBBBBBBB........',
  '...BBBBBBBBBBBBBB.......',
  '..BBBBBBBBBBBBBBBB......',
  '..BBBBBBBBBBBBBBBB......',
  '..BB.BBBBBBBBBB.BB......',
  '..B..BBBBBBBBBB..B......',
  '.....BBB.BB.BBB.........',
  '....BB.BB..BB.BB........',
  '....B...B..B...B........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
], { B: '#203058', c: '#40d8d8' }),
// ---- bosses (32x32) ----
def('b_drownedking', [
  '........y..y..y..y..y...........',
  '........yy.yy.yy.yy.yy..........',
  '........yyyyyyyyyyyyyy..........',
  '.........kkkkkkkkkkkk...........',
  '........kkkkkkkkkkkkkk..........',
  '........kkcckkkkkkcckk..........',
  '........kkcckkkkkkcckk..........',
  '........kkkkkkkkkkkkkk..........',
  '.........kkkdddddkkkk...........',
  '..........kkkkkkkkkk......q.....',
  '......mmkkkkkkkkkkkkkk...qqq....',
  '....mmkkkkkkkkkkkkkkkkkk..q.....',
  '...kkkkkkkkkkkkkkkkkkkkkk.q.....',
  '..kkkkkkkkmmkkkkmmkkkkkkk.q.....',
  '..kkkkkkkkkkkkkkkkkkkkkkkkq.....',
  '..kkk.kkkkkkkkkkkkkkkk.kkkq.....',
  '..kk..kkkkkkkkkkkkkkkk..kkq.....',
  '..kk..kkmmkkkkkkkkmmkk..kkq.....',
  '..k...kkkkkkkkkkkkkkkk...kq.....',
  '......kkkkkkkkkkkkkkkk....q.....',
  '......kkkkkkkkkkkkkkkk....q.....',
  '.......kkkkkkkkkkkkkk.....q.....',
  '.......kkkkk....kkkkk...........',
  '......kkkkkk....kkkkkk..........',
  '......kkkkk......kkkkk..........',
  '......kkkk........kkkk..........',
  '.....kkkkk........kkkkk.........',
  '.....mmmmm........mmmmm.........',
  '................................',
  '................................',
  '................................',
  '................................',
], { k: '#c8d8c8', c: '#40d8d8', m: '#2a6858' }),
def('b_stonewarden', [
  '................................',
  '..........QQQQQQQQQQ...........',
  '........QQQQQQQQQQQQQQ.........',
  '.......QQqqQQQQQQQQqqQQ........',
  '......QQqyyqQQQQQQqyyqQQ.......',
  '......QQqqqQQQQQQQQqqqQQ.......',
  '......QQQQQQQQQQQQQQQQQQ.......',
  '.......QQQQQddddQQQQQQQ........',
  '........QQQQQQQQQQQQQQ.........',
  '....QQQQQQQQQQQQQQQQQQQQQQ.....',
  '...QQQQQQQQQQQQQQQQQQQQQQQQ....',
  '..QQqQQQQQQQQQQQQQQQQQQQqQQ....',
  '..QQQQQQyQQQQQQQQQQQyQQQQQQ....',
  '..QQQQQQQQQQQQQQQQQQQQQQQQQ....',
  '..QQQ.QQQQQQQQQQQQQQQQ.QQQQ....',
  '..QQ..QQQQQQQQQQQQQQQQ..QQQ....',
  '..QQ..QQQQQQQQQQQQQQQQ..QQ.....',
  '..Q...QQQQQQQQQQQQQQQQ...Q.....',
  '......QQQQQQQQQQQQQQQQ.........',
  '......QQQQQQQQQQQQQQQQ.........',
  '.......QQQQQQQQQQQQQQ..........',
  '.......QQQQQ....QQQQQ..........',
  '......QQQQQQ....QQQQQQ.........',
  '......QQQQQ......QQQQQ.........',
  '......QQQQ........QQQQ.........',
  '.....QQQQQ........QQQQQ........',
  '.....nnnnn........nnnnn........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]);
def('b_miremaw', [
  '................................',
  '................................',
  '......mmmm..........mmmm.......',
  '.....mmMMmm........mmMMmm......',
  '.....mMyyMm........mMyyMm......',
  '.....mmMMmmmmmmmmmmmmMMmm......',
  '....mmmmmmmmmmmmmmmmmmmmmm.....',
  '...mmmmmmmmmmmmmmmmmmmmmmmm....',
  '..mmmmmmmmmmmmmmmmmmmmmmmmmm...',
  '..mmMmmmmmmmmmmmmmmmmmmmMmmm...',
  '..mmmmRRRRRRRRRRRRRRRRmmmmmm...',
  '..mmmRRddddddddddddddRRmmmmm...',
  '..mmmRdddwwddddddwwdddRmmmmm...',
  '..mmmRdddwwddddddwwdddRmmmm....',
  '..mmmRRddddddddddddddRRmmmm....',
  '..mmmmRRRRRRRRRRRRRRRRmmmmm....',
  '..mmmmmmmmmmmmmmmmmmmmmmmmm....',
  '..mMmmmmmmmmmmmmmmmmmmmmMmm....',
  '..mmmmmmmmmmmmmmmmmmmmmmmmm....',
  '...mmmmmmmmmmmmmmmmmmmmmmm.....',
  '...mmmmMMmmmmmmmmmmMMmmmmm.....',
  '....mmMMMMmmmmmmmmMMMMmmm......',
  '....mmMMMMmmmmmmmmMMMMmmm......',
  '.....mmMMmmmmmmmmmmMMmm........',
  '......mmmmmm.mm.mmmmmm.........',
  '.....MMMM..MMMM..MMMM..........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]);
def('b_duskpriest', [
  '................................',
  '............nnnnnn..............',
  '...........nnnnnnnn.............',
  '..........nnnnnnnnnn............',
  '..........nnPPnnPPnn............',
  '..........nnPPnnPPnn......yy....',
  '..........nnnnnnnnnn......yy....',
  '...........nnnddnnn.......yy....',
  '............nnnnnn........yy....',
  '.........nnnnnnnnnnnn.....yy....',
  '.......nnnnnnnnnnnnnnnn...yy....',
  '......nnnPnnnnnnnnnnPnnn..yy....',
  '.....nnnnPnnnnnnnnnnPnnnn.yy....',
  '....nnnnnPnnnnnnnnnnPnnnn2yy....'.replace('2', 'n'),
  '....nnnnnPnnnnnnnnnnPnnnnnyy....',
  '....nnnnnPnnnnnnnnnnPnnnn.yy....',
  '....nnnnnnnnnnnnnnnnnnnn..yy....',
  '....nnnnnnnnnnnnnnnnnnnn..yy....',
  '....nnnnnnnnnnnnnnnnnnnn..PP....',
  '....nnnnnnnnnnnnnnnnnnnn.PPPP...',
  '....nnnnnnnnnnnnnnnnnnnn..PP....',
  '...nnnnnnnnnnnnnnnnnnnnnn.......',
  '...nnnnnnnnnnnnnnnnnnnnnn.......',
  '...nnnnnnnnnnnnnnnnnnnnnn.......',
  '...nnnnnnnnnnnnnnnnnnnnnn.......',
  '..nnnnnnnnnnnnnnnnnnnnnnnn......',
  '..nnnnnnnnnnnnnnnnnnnnnnnn......',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
]);
def('b_duskweaver', [
  '................................',
  '.....P......................P...',
  '......P....................P....',
  '.......P.....nnnnnn.......P.....',
  '........P...nnnnnnnn.....P......',
  '.........P.nnnnnnnnnn...P.......',
  '.........PnnnRRnnRRnnn.P........',
  '..........nnnRRnnRRnnn..........',
  '..........nnnnnnnnnnnn..........',
  '...........nnnnddnnnn...........',
  '.....P......nnnnnnnn......P.....',
  '......P..nnnnnnnnnnnnn...P......',
  '.......PnnnnnnnnnnnnnnnnP.......',
  '......nnnnnnnnnnnnnnnnnnnn......',
  '.....nnnnnnnnnnnnnnnnnnnnnn.....',
  '....nnnnnPPnnnnnnnnnnPPnnnnn....',
  '....nnnnPPnnnnnnnnnnnnPPnnnn....',
  '...nnnnPPnnnnRRRRnnnnnnPPnnnn...',
  '...nnnPPnnnnRRddRRnnnnnnPPnnn...',
  '...nnnPnnnnnRddddRnnnnnnnPnnn...',
  '...nnPPnnnnnRRddRRnnnnnnPPnnn...',
  '...nnPnnnnnnnRRRRnnnnnnnnPnnn...',
  '...nnnnnnnnnnnnnnnnnnnnnnnnnn...',
  '...nnnnnnnnnnnnnnnnnnnnnnnnn....',
  '....nnnnnnnnnnnnnnnnnnnnnnnn....',
  '....nnnnnnnnnnnnnnnnnnnnnnn.....',
  '.....nnnnnn..nnnnnn..nnnnn......',
  '.....nnnnn....nnnn....nnnn......',
  '......nnn......nn......nnn......',
  '.....PPP........P......PPP......',
  '................................',
  '................................',
]);

// ======================= MISC SPRITES =======================

def('cursor', [
  'w.......',
  'ww......',
  'www.....',
  'wwww....',
  'wwwww...',
  'wwwwww..',
  'www.....',
  'w.w.....',
]);
def('ember', [
  '...oo...',
  '..oRRo..',
  '.oRyyRo.',
  '.oRyyRo.',
  '..oRRo..',
  '...oo...',
  '........',
  '........',
]);
def('fx_slash', [
  '..............w.',
  '............ww..',
  '..........ww....',
  '........ww......',
  '......ww........',
  '....ww..........',
  '..ww............',
  'w...............',
]);
def('fx_fireball', [
  '...RR...',
  '..RooR..',
  '.RoyyoR.',
  '.RoyyoR.',
  '..RooR..',
  '...RR...',
  '........',
  '........',
]);
def('fx_spark', [
  '...w....',
  '...w....',
  '.wwwww..',
  '...w....',
  '...w....',
  '........',
  '........',
  '........',
]);

// ======================= BAKING =======================

export function initSprites() {
  for (const [name, rows, palO] of defs) {
    SPR[name] = bake(rows, palO ? { ...PAL, ...palO } : PAL);
  }
  // humanoids: bake each character in all 6 poses
  for (const [name, [tpl, colors]] of Object.entries(CHARS)) {
    const pal = { ...PAL, '1': colors[1], '2': colors[2], '3': colors[3], '4': colors[4], '5': colors[5], '6': colors[6] };
    for (const pose of ['d1', 'd2', 'u1', 'u2', 's1', 's2']) {
      SPR[`w_${name}_${pose}`] = bake(tpl[pose], pal);
    }
  }
  initTiles();
}

export function drawSprite(ctx, name, x, y, flipH = false, scale = 1) {
  const c = SPR[name];
  if (!c) return;
  ctx.save();
  ctx.translate(Math.round(x) + (flipH ? c.width * scale : 0), Math.round(y));
  ctx.scale(flipH ? -scale : scale, scale);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

// Draw a walking character: dir in {'down','up','left','right'}, frame 0/1.
export function drawWalker(ctx, name, dir, frame, x, y) {
  const f = frame ? 2 : 1;
  if (dir === 'down') drawSprite(ctx, `w_${name}_d${f}`, x, y);
  else if (dir === 'up') drawSprite(ctx, `w_${name}_u${f}`, x, y);
  else drawSprite(ctx, `w_${name}_s${f}`, x, y, dir === 'left');
}

// ======================= TILES =======================

const T = 16;
function tile(fn) {
  const c = document.createElement('canvas');
  c.width = T; c.height = T;
  const g = c.getContext('2d');
  fn(g);
  return c;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s >> 16) / 32768;
  };
}

export const TILES = {};

function initTiles() {
  const ground = (g, base, dot, seed, n = 6) => {
    g.fillStyle = base; g.fillRect(0, 0, T, T);
    const r = rng(seed);
    g.fillStyle = dot;
    for (let i = 0; i < n; i++) g.fillRect((r() * T) | 0, (r() * T) | 0, 1, 1);
  };
  const GRASS = '#58a838', GRASS_D = '#3f8828';

  // ---- overworld ----
  TILES['.'] = tile((g) => ground(g, GRASS, GRASS_D, 7));
  TILES.f = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#186010';
    g.fillRect(2, 2, 12, 9); g.fillRect(4, 1, 8, 12);
    g.fillStyle = '#30a020';
    g.fillRect(4, 3, 5, 3); g.fillRect(9, 5, 3, 2);
    g.fillStyle = '#502808'; g.fillRect(7, 12, 2, 3);
  });
  TILES.m = tile((g) => {
    ground(g, '#8a7a5a', '#6a5c42', 11);
    g.fillStyle = '#6a5c42';
    g.beginPath(); g.moveTo(0, 15); g.lineTo(8, 2); g.lineTo(15, 15); g.fill();
    g.fillStyle = '#9c8c6c';
    g.beginPath(); g.moveTo(3, 15); g.lineTo(8, 5); g.lineTo(11, 15); g.fill();
    g.fillStyle = '#f8f8f8'; g.fillRect(7, 3, 2, 2);
  });
  TILES.w = [
    tile((g) => {
      g.fillStyle = '#2858d8'; g.fillRect(0, 0, T, T);
      g.fillStyle = '#6890f8'; g.fillRect(1, 4, 5, 1); g.fillRect(9, 10, 5, 1);
    }),
    tile((g) => {
      g.fillStyle = '#2858d8'; g.fillRect(0, 0, T, T);
      g.fillStyle = '#6890f8'; g.fillRect(3, 5, 5, 1); g.fillRect(8, 11, 5, 1);
    }),
  ];
  TILES.s = tile((g) => ground(g, '#e8d8a0', '#c8b880', 21, 8));
  TILES.S = [
    tile((g) => {
      ground(g, '#607048', '#404830', 31, 9);
      g.fillStyle = '#3a5878'; g.fillRect(2, 9, 6, 3); g.fillRect(10, 3, 4, 3);
      g.fillStyle = '#8898a8'; g.fillRect(3, 10, 2, 1);
    }),
    tile((g) => {
      ground(g, '#607048', '#404830', 31, 9);
      g.fillStyle = '#3a5878'; g.fillRect(2, 9, 6, 3); g.fillRect(10, 3, 4, 3);
      g.fillStyle = '#8898a8'; g.fillRect(11, 4, 2, 1);
    }),
  ];
  TILES.h = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#3f8828';
    g.beginPath(); g.moveTo(1, 13); g.quadraticCurveTo(8, 3, 15, 13); g.lineTo(1, 13); g.fill();
    g.fillStyle = '#58a838';
    g.beginPath(); g.moveTo(4, 13); g.quadraticCurveTo(8, 6, 12, 13); g.lineTo(4, 13); g.fill();
  });
  TILES.p = tile((g) => ground(g, '#c8a058', '#a88040', 41));
  TILES.b = tile((g) => {
    g.fillStyle = '#2858d8'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#a87840'; g.fillRect(1, 0, 14, T);
    g.fillStyle = '#804010';
    for (let y = 1; y < 16; y += 3) g.fillRect(1, y, 14, 1);
    g.fillStyle = '#502808'; g.fillRect(1, 0, 1, T); g.fillRect(14, 0, 1, T);
  });
  TILES.B = tile((g) => {
    g.fillStyle = '#2858d8'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#a87840'; g.fillRect(1, 0, 14, 4); g.fillRect(1, 12, 14, 4);
    g.fillStyle = '#502808'; g.fillRect(3, 2, 3, 2); g.fillRect(10, 13, 3, 2);
    g.fillStyle = '#6890f8'; g.fillRect(4, 7, 4, 1);
  });
  TILES.a = tile((g) => ground(g, '#787068', '#585048', 51, 8));
  TILES.A = tile((g) => {
    ground(g, '#787068', '#585048', 51, 8);
    g.fillStyle = '#383028';
    g.fillRect(7, 3, 2, 11);
    g.fillRect(4, 5, 3, 1); g.fillRect(9, 4, 4, 1); g.fillRect(5, 8, 2, 1); g.fillRect(9, 7, 3, 1);
  });
  TILES.T = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#c02818'; g.fillRect(2, 4, 6, 4); g.fillRect(9, 3, 5, 4);
    g.fillStyle = '#e8d8a0'; g.fillRect(3, 8, 4, 5); g.fillRect(10, 7, 3, 6);
    g.fillStyle = '#101010'; g.fillRect(4, 10, 2, 3); g.fillRect(11, 9, 1, 2);
  });
  TILES.C = tile((g) => {
    g.fillStyle = '#8a7a5a'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#6a5c42'; g.fillRect(0, 0, T, 3);
    g.fillStyle = '#101010'; g.fillRect(4, 5, 8, 11); g.fillRect(6, 3, 4, 13);
  });
  TILES.G = tile((g) => {
    g.fillStyle = '#6a5c42'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#484038'; g.fillRect(2, 1, 12, 15);
    g.fillStyle = '#8a7a5a'; g.fillRect(2, 1, 12, 2);
    g.fillStyle = '#f8d838'; g.fillRect(7, 7, 2, 3);
  });
  TILES.M = [
    tile((g) => {
      ground(g, '#607048', '#404830', 31, 4);
      g.fillStyle = 'rgba(200,210,230,0.75)';
      g.fillRect(0, 2, 16, 4); g.fillRect(2, 8, 14, 3); g.fillRect(0, 12, 12, 3);
    }),
    tile((g) => {
      ground(g, '#607048', '#404830', 31, 4);
      g.fillStyle = 'rgba(200,210,230,0.75)';
      g.fillRect(2, 3, 14, 4); g.fillRect(0, 9, 13, 3); g.fillRect(3, 13, 13, 3);
    }),
  ];
  TILES.W = tile((g) => {
    g.fillStyle = '#484058'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#686078'; g.fillRect(2, 0, 12, 16);
    g.fillStyle = '#101010'; g.fillRect(5, 6, 6, 10);
    g.fillStyle = '#f88018'; g.fillRect(7, 1, 2, 3);
    g.fillStyle = '#f8d838'; g.fillRect(7, 2, 2, 1);
  });

  // ---- town ----
  TILES['#'] = tile((g) => {
    g.fillStyle = '#b08858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#8a6840';
    g.fillRect(0, 7, T, 1); g.fillRect(0, 15, T, 1);
    g.fillRect(7, 0, 1, 8); g.fillRect(3, 8, 1, 8); g.fillRect(11, 8, 1, 8);
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(0, 0, T, 1); g.fillRect(0, 8, T, 1);
  });
  TILES.F = tile((g) => {
    g.fillStyle = '#c09858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#a07840';
    g.fillRect(0, 3, T, 1); g.fillRect(0, 7, T, 1); g.fillRect(0, 11, T, 1); g.fillRect(0, 15, T, 1);
    g.fillRect(5, 0, 1, 3); g.fillRect(11, 4, 1, 3); g.fillRect(3, 8, 1, 3); g.fillRect(9, 12, 1, 3);
  });
  TILES.c = tile((g) => {
    g.fillStyle = '#c09858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#804010'; g.fillRect(0, 4, T, 12);
    g.fillStyle = '#a06030'; g.fillRect(0, 4, T, 3);
    g.fillStyle = '#502808'; g.fillRect(0, 8, T, 1);
  });
  TILES.t = tile((g) => {
    g.fillStyle = '#c09858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#804010'; g.fillRect(2, 5, 12, 8);
    g.fillStyle = '#a06030'; g.fillRect(2, 5, 12, 3);
    g.fillStyle = '#502808'; g.fillRect(3, 13, 2, 2); g.fillRect(11, 13, 2, 2);
  });
  TILES.e = tile((g) => {
    g.fillStyle = '#c09858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#c02818'; g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#f8f8f8'; g.fillRect(2, 2, 12, 4);
    g.fillStyle = '#802010'; g.fillRect(2, 12, 12, 2);
  });
  TILES.l = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#282838'; g.fillRect(7, 4, 2, 11);
    g.fillStyle = '#f8d838'; g.fillRect(6, 1, 4, 4);
    g.fillStyle = '#f88018'; g.fillRect(7, 2, 2, 2);
  });
  TILES.n = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#804010'; g.fillRect(0, 6, T, 2); g.fillRect(0, 11, T, 2);
    g.fillStyle = '#a06030'; g.fillRect(2, 4, 2, 11); g.fillRect(12, 4, 2, 11);
  });
  TILES.o = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#585868'; g.fillRect(2, 4, 12, 10);
    g.fillStyle = '#a8a8b8'; g.fillRect(3, 5, 10, 8);
    g.fillStyle = '#2858d8'; g.fillRect(5, 7, 6, 4);
    g.fillStyle = '#804010'; g.fillRect(7, 1, 2, 4);
  });
  const sign = (draw) => tile((g) => {
    g.fillStyle = '#b08858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#8a6840'; g.fillRect(0, 7, T, 1); g.fillRect(0, 15, T, 1); g.fillRect(7, 0, 1, 8);
    g.fillStyle = '#502808'; g.fillRect(2, 3, 12, 10);
    g.fillStyle = '#e8d8a0'; g.fillRect(3, 4, 10, 8);
    draw(g);
  });
  TILES.i = sign((g) => { // inn: bed glyph
    g.fillStyle = '#c02818'; g.fillRect(4, 7, 8, 4);
    g.fillStyle = '#f8f8f8'; g.fillRect(4, 6, 3, 2);
  });
  TILES.g = sign((g) => { // gear: sword glyph
    g.fillStyle = '#585868'; g.fillRect(7, 5, 2, 6);
    g.fillStyle = '#804010'; g.fillRect(5, 9, 6, 2);
  });
  TILES.v = sign((g) => { // items: vial glyph
    g.fillStyle = '#30a020'; g.fillRect(6, 7, 4, 4);
    g.fillStyle = '#585868'; g.fillRect(7, 5, 2, 2);
  });

  // ---- dungeon ----
  TILES.R = tile((g) => {
    g.fillStyle = '#484048'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#585868';
    g.fillRect(1, 1, 6, 6); g.fillRect(9, 2, 5, 5); g.fillRect(2, 9, 5, 5); g.fillRect(9, 9, 6, 5);
    g.fillStyle = '#302838'; g.fillRect(0, 7, T, 2); g.fillRect(7, 0, 2, 8);
  });
  TILES[','] = tile((g) => ground(g, '#706860', '#565048', 61, 5));
  TILES['<'] = tile((g) => {
    g.fillStyle = '#101010'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#c8c8d8';
    g.fillRect(0, 12, T, 3); g.fillRect(3, 8, 13, 3); g.fillRect(6, 4, 10, 3); g.fillRect(9, 0, 7, 3);
  });
  TILES['>'] = tile((g) => {
    g.fillStyle = '#101010'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#8888a0';
    g.fillRect(0, 0, T, 3); g.fillRect(3, 4, 13, 3); g.fillRect(6, 8, 10, 3); g.fillRect(9, 12, 7, 3);
  });
  TILES.X = tile((g) => {
    ground(g, '#706860', '#565048', 61, 5);
    g.fillStyle = '#804010'; g.fillRect(2, 4, 12, 10);
    g.fillStyle = '#a06030'; g.fillRect(2, 4, 12, 4);
    g.fillStyle = '#f8d838'; g.fillRect(7, 8, 2, 3);
    g.fillStyle = '#502808'; g.fillRect(2, 8, 12, 1);
  });
  TILES.x = tile((g) => { // opened chest
    ground(g, '#706860', '#565048', 61, 5);
    g.fillStyle = '#804010'; g.fillRect(2, 8, 12, 6);
    g.fillStyle = '#502808'; g.fillRect(2, 4, 12, 3); g.fillRect(3, 9, 10, 3);
  });
  TILES.Z = [
    tile((g) => {
      ground(g, '#706860', '#565048', 61, 5);
      g.fillStyle = '#585868'; g.fillRect(5, 9, 6, 6);
      g.fillStyle = '#f88018'; g.fillRect(6, 4, 4, 5);
      g.fillStyle = '#f8d838'; g.fillRect(7, 5, 2, 3);
    }),
    tile((g) => {
      ground(g, '#706860', '#565048', 61, 5);
      g.fillStyle = '#585868'; g.fillRect(5, 9, 6, 6);
      g.fillStyle = '#f88018'; g.fillRect(6, 3, 4, 6);
      g.fillStyle = '#f8d838'; g.fillRect(7, 4, 2, 4);
    }),
  ];
  TILES.O = tile((g) => {
    ground(g, '#706860', '#565048', 61, 5);
    g.fillStyle = '#8888a0'; g.fillRect(4, 1, 8, 14);
    g.fillStyle = '#585868'; g.fillRect(4, 1, 2, 14); g.fillRect(3, 0, 10, 2); g.fillRect(3, 14, 10, 2);
  });
}

// Draw one tile char at pixel x,y. frame animates water/swamp/mist/braziers.
export function drawTile(ctx, ch, x, y, frame) {
  let c = TILES[ch] || TILES['.'];
  if (Array.isArray(c)) c = c[(frame >> 4) & 1];
  ctx.drawImage(c, x, y);
}

// Classic RPG window.
export function drawWindow(ctx, x, y, w, h) {
  ctx.fillStyle = '#101048';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#f8f8f8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#8890c8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
}
