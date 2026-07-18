// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural tiles and effects. All original art.

// ---- palette ----
const PAL = {
  r: '#d82020', // plume red
  R: '#8c1010', // plume dark
  a: '#c8d4e0', // silver armor light
  A: '#6c7890', // silver armor dark
  s: '#f0b088', // skin
  S: '#b87858', // skin shade
  w: '#f8f8f8', // white
  d: '#101018', // outline / dark
  k: '#584028', // boots / wood brown
  h: '#f04058', // boxer hearts
  g: '#78a860', // zombie green
  G: '#44603c', // zombie dark green
  q: '#a8a8b8', // grey
  Q: '#565664', // dark grey
  y: '#f8d838', // yellow
  o: '#e07820', // orange
  p: '#a860d8', // magician purple
  m: '#5c2c88', // dark purple
  c: '#48c8d8', // cyan
  f: '#d04828', // demon red
  F: '#802818', // demon dark red
  v: '#b8e8f8', // pale ghost blue
  n: '#e8d8a8', // bone tan
};

const GOLD = { ...PAL, a: '#f0c840', A: '#a87818' };

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
// A knight frame is defined once, baked as silver 'k_*' and gold 'gk_*'.
const knightDefs = [];
function kdef(name, rows) { knightDefs.push([name, rows]); }

// ======================= SIR MOORE — ARMORED =======================
// 16 wide, faces right. Plumed helm, plate mail.

kdef('stand', [
  '......rr........',
  '.....rrr........',
  '....aaaa........',
  '...aaaaaa.......',
  '...Awwsaa.......',
  '...aaaaaa.......',
  '....AAAA........',
  '...aaaaaaa......',
  '..aAaaaaaAa.....',
  '..aA.aaa.Aa.....',
  '..aa.AAA.aa.....',
  '.....aaa........',
  '....aaaaa.......',
  '....AaaaA.......',
  '....aa.aa.......',
  '....aa.aa.......',
  '....Aa.aA.......',
  '....ka.ak.......',
  '...kka.akk......',
  '...kk...kk......',
]);

kdef('run1', [
  '......rr........',
  '.....rrr........',
  '....aaaa........',
  '...aaaaaa.......',
  '...Awwsaa.......',
  '...aaaaaa.......',
  '....AAAA........',
  '...aaaaaaa......',
  '..aAaaaaaAa.....',
  '..aA.aaa.Aa.....',
  '..aa.AAA.aa.....',
  '.....aaa........',
  '....aaaaa.......',
  '...AaaaaaA......',
  '...aa...aa......',
  '..aa.....aa.....',
  '..Aa.....aA.....',
  '.kka......ak....',
  '.kk.......akk...',
  '...........kk...',
]);

kdef('run2', [
  '......rr........',
  '.....rrr........',
  '....aaaa........',
  '...aaaaaa.......',
  '...Awwsaa.......',
  '...aaaaaa.......',
  '....AAAA........',
  '...aaaaaaa......',
  '..aAaaaaaAa.....',
  '..aA.aaa.Aa.....',
  '..aa.AAA.aa.....',
  '.....aaa........',
  '....aaaaa.......',
  '....AaaaA.......',
  '.....aaa........',
  '....aa.a........',
  '....Aa.aA.......',
  '....ka..ak......',
  '...kka..akk.....',
  '...kk....kk.....',
]);

kdef('jump', [
  '......rr........',
  '.....rrr........',
  '....aaaa........',
  '...aaaaaa.......',
  '...Awwsaa.......',
  '...aaaaaa.......',
  '....AAAA........',
  '...aaaaaaa......',
  '..aAaaaaaAa.....',
  '..aA.aaa.Aa.....',
  '..aa.AAA.aa.....',
  '....aaaaa.......',
  '...AaaaaaA......',
  '...aa...aa......',
  '..kaa...aak.....',
  '..kk.....kk.....',
  '................',
  '................',
  '................',
  '................',
]);

// Arm swung forward mid-throw.
kdef('throw', [
  '......rr........',
  '.....rrr........',
  '....aaaa........',
  '...aaaaaa.......',
  '...Awwsaa.......',
  '...aaaaaa.......',
  '....AAAA........',
  '...aaaaaaaaa....',
  '..aAaaaaaaaAa...',
  '..aA.aaa........',
  '..aa.AAA........',
  '.....aaa........',
  '....aaaaa.......',
  '....AaaaA.......',
  '....aa.aa.......',
  '....aa.aa.......',
  '....Aa.aA.......',
  '....ka.ak.......',
  '...kka.akk......',
  '...kk...kk......',
]);

// Crouched — half height, shield up.
kdef('crouch', [
  '......rr........',
  '.....rrr........',
  '....aaaa........',
  '...aaaaaa.......',
  '...Awwsaa.......',
  '...aaaaaa.......',
  '...aaaaaaa......',
  '..aAaaaaaAa.....',
  '..aaaAAAaaa.....',
  '...kkaaakk......',
  '...kk...kk......',
]);

// On a ladder, symmetrical, arms up.
kdef('climb1', [
  '......rr........',
  '.....rrrr.......',
  '....aaaa........',
  '...aaaaaa.......',
  '..a.aaaa.a......',
  '..aaaaaaaa......',
  '..A.AAAA.A......',
  '....aaaa........',
  '...aaaaaa.......',
  '...aAaaAa.......',
  '...aaaaaa.......',
  '....AAAA........',
  '....aaaa........',
  '....aa.a........',
  '....aa.aa.......',
  '....ka..a.......',
  '...kka..ak......',
  '....k...kk......',
  '................',
  '................',
]);

kdef('climb2', [
  '......rr........',
  '.....rrrr.......',
  '....aaaa........',
  '...aaaaaa.......',
  '..a.aaaa.a......',
  '..aaaaaaaa......',
  '..A.AAAA.A......',
  '....aaaa........',
  '...aaaaaa.......',
  '...aAaaAa.......',
  '...aaaaaa.......',
  '....AAAA........',
  '....aaaa........',
  '....a.aa........',
  '...aa.aa........',
  '....a..ak.......',
  '...ka..akk......',
  '...kk...k.......',
  '................',
  '................',
]);

// ======================= SIR MOORE — BOXERS =======================
// One hit and the armor's gone: heart-print boxers, bare everything else.

def('b_stand', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksssss......',
  '....Swwsss......',
  '....ssssss......',
  '.....sSSs.......',
  '....ssssss......',
  '...sssssssss....',
  '..sSssssssSs....',
  '..ss.ssss.ss....',
  '..ss.SSSS.ss....',
  '.....wwww.......',
  '....wwhwww......',
  '....whwwhw......',
  '....ww.ww.......',
  '....ss.ss.......',
  '....Ss.sS.......',
  '....ks.sk.......',
  '...kks.skk......',
  '...kk...kk......',
]);

def('b_run1', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksssss......',
  '....Swwsss......',
  '....ssssss......',
  '.....sSSs.......',
  '....ssssss......',
  '...sssssssss....',
  '..sSssssssSs....',
  '..ss.ssss.ss....',
  '..ss.SSSS.ss....',
  '....wwwww.......',
  '...wwhwwww......',
  '...ss...ss......',
  '..ss.....ss.....',
  '..Ss.....sS.....',
  '.kks......sk....',
  '.kk.......skk...',
  '...........kk...',
  '................',
]);

def('b_run2', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksssss......',
  '....Swwsss......',
  '....ssssss......',
  '.....sSSs.......',
  '....ssssss......',
  '...sssssssss....',
  '..sSssssssSs....',
  '..ss.ssss.ss....',
  '..ss.SSSS.ss....',
  '....wwwww.......',
  '....whwww.......',
  '.....ss.s.......',
  '....ss.ss.......',
  '....Ss.sS.......',
  '....ks..sk......',
  '...kks..skk.....',
  '...kk....kk.....',
  '................',
]);

def('b_jump', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksssss......',
  '....Swwsss......',
  '....ssssss......',
  '.....sSSs.......',
  '....ssssss......',
  '...sssssssss....',
  '..sSssssssSs....',
  '..ss.ssss.ss....',
  '...wwwwww.......',
  '...whwwhw.......',
  '...ss...ss......',
  '..kss...ssk.....',
  '..kk.....kk.....',
  '................',
  '................',
  '................',
  '................',
  '................',
]);

def('b_throw', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksssss......',
  '....Swwsss......',
  '....ssssss......',
  '.....sSSs.......',
  '....ssssss......',
  '...ssssssssss...',
  '..sSssssssssSs..',
  '..ss.ssss.......',
  '..ss.SSSS.......',
  '.....wwww.......',
  '....wwhwww......',
  '....whwwhw......',
  '....ww.ww.......',
  '....ss.ss.......',
  '....Ss.sS.......',
  '....ks.sk.......',
  '...kks.skk......',
  '...kk...kk......',
]);

def('b_crouch', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksssss......',
  '....Swwsss......',
  '....ssssss......',
  '....ssssss......',
  '...sssssssss....',
  '..sswwwwwwss....',
  '...swhwwhws.....',
  '...kks..skk.....',
  '...kk....kk.....',
]);

def('b_climb1', [
  '.....kkkk.......',
  '....kkkkkkk.....',
  '....ksssss......',
  '..s.ssssss.s....',
  '..ssssssssss....',
  '..S.ssssss.S....',
  '....ssssss......',
  '...ssssssss.....',
  '...sSssssSs.....',
  '...ssssssss.....',
  '....wwwww.......',
  '....whwwhw......',
  '....ww.ww.......',
  '....ss.s........',
  '....ss.ss.......',
  '....ks..s.......',
  '...kks..sk......',
  '....k...kk......',
  '................',
  '................',
]);

def('b_climb2', [
  '.....kkkk.......',
  '....kkkkkkk.....',
  '....ksssss......',
  '..s.ssssss.s....',
  '..ssssssssss....',
  '..S.ssssss.S....',
  '....ssssss......',
  '...ssssssss.....',
  '...sSssssSs.....',
  '...ssssssss.....',
  '....wwwww.......',
  '....whwwhw......',
  '....ww.ww.......',
  '.....s.ss.......',
  '....ss.ss.......',
  '.....s..sk......',
  '....ks..skk.....',
  '....kk...k......',
  '................',
  '................',
]);

// ======================= THE DUCK =======================
// Polymorphed by the magician: small, absurd, defenseless.

def('duck1', [
  '....ww......',
  '...wwww.....',
  '...wdww.oo..',
  '...wwwwooo..',
  '.wwwwwww....',
  'wwwwwwww....',
  'wwwwwww.....',
  '.wwwww......',
  '..oo.oo.....',
  '..o...o.....',
]);

def('duck2', [
  '....ww......',
  '...wwww.....',
  '...wdww.oo..',
  '...wwwwooo..',
  '.wwwwwww....',
  'wwwwwwww....',
  'wwwwwww.....',
  '.wwwww......',
  '...oo.o.....',
  '...o..oo....',
]);

// The classic pile of bones.
def('bones', [
  '................',
  '......nn........',
  '.....nwwn.......',
  '..n..nwwn..n....',
  '.nnn.nnnn.nnn...',
  'nnnnnnnnnnnnnn..',
  '.nn.nnnnnn.nn...',
  '................',
]);

// ======================= ENEMIES =======================

// Zombie — shambling, rotten.
def('zomb1', [
  '....ggg.........',
  '...ggggg........',
  '...gdgdg........',
  '...ggggg........',
  '....gGG.........',
  '...ggggg........',
  '..gGgggggg......',
  '..gg.ggg.gg.....',
  '..gg.GGG.gg.....',
  '.....ggg........',
  '....ggggg.......',
  '....G.g.G.......',
  '....g.g.g.......',
  '....g..gg.......',
  '...Gg..gG.......',
  '...gg...gg......',
]);

def('zomb2', [
  '....ggg.........',
  '...ggggg........',
  '...gdgdg........',
  '...ggggg........',
  '....gGG.........',
  '...ggggg........',
  '..gGgggggg......',
  '..gg.ggg.gg.....',
  '..gg.GGG.gg.....',
  '.....ggg........',
  '....ggggg.......',
  '....G.gG........',
  '....gg.g........',
  '....gg.g........',
  '...Ggg.gG.......',
  '....g...g.......',
]);

// Crow — perched, then swooping.
def('crow_sit', [
  '....dd......',
  '...dddd.....',
  '...dodd.....',
  '...dddd.o...',
  '..dddddd....',
  '.ddddddd....',
  '.dddddd.....',
  '..dddd......',
  '...o.o......',
]);

def('crow_fly1', [
  'dd........dd',
  '.ddd....ddd.',
  '..dddddddd..',
  '...ddddod...',
  '....dddd.o..',
  '.....dd.....',
]);

def('crow_fly2', [
  '............',
  '....d..d....',
  '..dddddddd..',
  '.ddddddod...',
  'dd..dddd.o..',
  '.....dd.....',
]);

// Man-eating plant — spits arcing seeds.
def('plant1', [
  '.....ffff.......',
  '....ffddff......',
  '...ffdddddf.....',
  '...fdwwwwdf.....',
  '...ffdddddf.....',
  '....ffddff......',
  '.....ffff.......',
  '..G...gg...G....',
  '.GGg..gg..gGG...',
  '..GGg.gg.gGG....',
  '....G.gg.G......',
  '.....ggg........',
]);

def('plant2', [
  '.....ffff.......',
  '....ffffff......',
  '...fffffff......',
  '...ffffffff.....',
  '...fffffff......',
  '....ffffff......',
  '.....ffff.......',
  '..G...gg...G....',
  '.GGg..gg..gGG...',
  '..GGg.gg.gGG....',
  '....G.gg.G......',
  '.....ggg........',
]);

// Ghost — phases in and out, drifts through walls.
def('ghost1', [
  '....vvvv......',
  '...vvvvvv.....',
  '..vvdvvdvv....',
  '..vvvvvvvv....',
  '..vvvvvvvv....',
  '..vvvdddvv....',
  '..vvvvvvvv....',
  '..vvvvvvvv....',
  '..vv.vv.vv....',
  '..v...v..v....',
]);

def('ghost2', [
  '....vvvv......',
  '...vvvvvv.....',
  '..vvdvvdvv....',
  '..vvvvvvvv....',
  '..vvvvvvvv....',
  '..vvvdddvv....',
  '..vvvvvvvv....',
  '..vvvvvvvv....',
  '..v.vv.vv.....',
  '...v..v..v....',
]);

// Skeleton knight — walks and lobs bones.
def('skel1', [
  '....nnnn........',
  '...nnnnnn.......',
  '...ndnnd........',
  '...nnnnnn.......',
  '....nnn.........',
  '...nnnnnn.......',
  '..nQnnnnnQ......',
  '..nn.nnn.nn.....',
  '.....QQQ........',
  '....nnnnn.......',
  '....n.n.n.......',
  '....n.n.n.......',
  '....n..nn.......',
  '...Qn..nQ.......',
  '...nn...nn......',
]);

def('skel2', [
  '....nnnn........',
  '...nnnnnn.......',
  '...ndnnd........',
  '...nnnnnn.......',
  '....nnn.........',
  '...nnnnnn.......',
  '..nQnnnnnQ......',
  '..nn.nnn.nn.....',
  '.....QQQ........',
  '....nnnnn.......',
  '....nn.n........',
  '.....n.n........',
  '....nn.n........',
  '...Qn..nQ.......',
  '....n...n.......',
]);

// Red Moorimer — the flying demon. Hover, swoop, ruin your day.
def('demon1', [
  'F..............F',
  'FF............FF',
  'FfF..........FfF',
  'FffF.ffff...FffF',
  '.FffFffffF.FffF.',
  '..FfffddffFffF..',
  '...ffdwwdfff....',
  '...fffddffff....',
  '....ffffffF.....',
  '...fFffffFf.....',
  '...f.FffF..f....',
  '.....f..f.......',
  '.....F..F.......',
]);

def('demon2', [
  '................',
  '................',
  '.F...........F..',
  'FfF..ffff...FfF.',
  'FffFfffffFFFffF.',
  'FFffffddfffffF..',
  '...ffdwwdfff....',
  '...fffddffff....',
  '....ffffffF.....',
  '...fFffffFf.....',
  '...f.FffF..f....',
  '.....f..f.......',
  '.....F..F.......',
]);

// Ogre gate-guard — big, slow, very unfriendly.
def('ogre1', [
  '.......qqqqqq.......',
  '......qqqqqqqq......',
  '.....qqddqqddqq.....',
  '.....qqqqqqqqqq.....',
  '......qqQQQQqq......',
  '.....qqqwwwwqqq.....',
  '....qqqqqqqqqqqq....',
  '...qQqqqqqqqqqqQq...',
  '..qqq.qqqqqqqq.qqq..',
  '..qq..qQQQQQQq..qq..',
  '..qq..qqqqqqqq..qq..',
  '.qQq..qqqqqqqq..qQq.',
  '.qq...qQQQQQQq...qq.',
  '......qqqqqqqq......',
  '.....qqqq..qqqq.....',
  '.....qqq....qqq.....',
  '....kqqq....qqqk....',
  '....kqq......qqk....',
  '...kkqq......qqkk...',
  '...kkk........kkk...',
]);

def('ogre2', [
  '.......qqqqqq.......',
  '......qqqqqqqq......',
  '.....qqddqqddqq.....',
  '.....qqqqqqqqqq.....',
  '......qqQQQQqq......',
  '.....qqqwwwwqqq.....',
  '....qqqqqqqqqqqq....',
  '...qQqqqqqqqqqqQq...',
  '..qqq.qqqqqqqq.qqq..',
  '..qq..qQQQQQQq..qq..',
  '..qq..qqqqqqqq..qq..',
  '.qQq..qqqqqqqq..qQq.',
  '.qq...qQQQQQQq...qq.',
  '......qqqqqqqq......',
  '.....qqqqqqqqq......',
  '......qqq.qqq.......',
  '.....kqq...qqk......',
  '.....kqq...qqk......',
  '....kkqq....qqkk....',
  '....kkk......kkk....',
]);

// The evil magician — pops from chests, turns knights into ducks.
def('mage1', [
  '.......pp.......',
  '......pppp......',
  '.....pppppp.....',
  '....pppppppp....',
  '..pppppppppppp..',
  '.....ssssss.....',
  '.....sdssds.....',
  '.....ssssss.....',
  '....mmmmmmmm....',
  '...mmpmmmmpmm...',
  '...mm.mmmm.mm...',
  '...ss.mmmm.ss...',
  '......mmmm......',
  '.....mmmmmm.....',
  '....mmmmmmmm....',
  '....mm....mm....',
]);

def('mage2', [
  '.......pp.......',
  '......pppp......',
  '.....pppppp.....',
  '....pppppppp....',
  '..pppppppppppp..',
  '.....ssssss.....',
  '.....sdssds.....',
  '.....ssssss.....',
  '..s.mmmmmmmm.s..',
  '..smmpmmmmpmms..',
  '...mm.mmmm.mm...',
  '......mmmm......',
  '......mmmm......',
  '.....mmmmmm.....',
  '....mmmmmmmm....',
  '....mm....mm....',
]);

// Astamoore the demon lord — body; wings drawn in code. Weak point: head.
def('asta1', [
  '......f......f......',
  '.....fFf....fFf.....',
  '.....fff....fff.....',
  '......ffffffff......',
  '.....ffffffffff.....',
  '.....fdwwffwwdf.....',
  '.....ffffffffff.....',
  '......ffdddddf......',
  '......ffffffff......',
  '....ffffffffffff....',
  '...fFffffffffffFf...',
  '..fFfffFFFFFFfffFf..',
  '..ff.ffffffffff.ff..',
  '..ff.ffFFFFFFff.ff..',
  '..f..ffffffffff..f..',
  '.....ffFFFFFFff.....',
  '......ffffffff......',
  '.....fffff.fffff....',
  '.....ffff...ffff....',
  '....fFff.....ffFf...',
  '....fff.......fff...',
  '...fff.........fff..',
]);

def('asta2', [
  '......f......f......',
  '.....fFf....fFf.....',
  '.....fff....fff.....',
  '......ffffffff......',
  '.....ffffffffff.....',
  '.....fdyyffyydf.....',
  '.....ffffffffff.....',
  '......ffdddddf......',
  '......ffffffff......',
  '....ffffffffffff....',
  '...fFffffffffffFf...',
  '..fFfffFFFFFFfffFf..',
  '..ff.ffffffffff.ff..',
  '..ff.ffFFFFFFff.ff..',
  '..f..ffffffffff..f..',
  '.....ffFFFFFFff.....',
  '......ffffffff......',
  '.....fffff.fffff....',
  '.....ffff...ffff....',
  '....fFff.....ffFf...',
  '....fff.......fff...',
  '...fff.........fff..',
]);

// ======================= CHESTS & PICKUPS =======================

def('chest', [
  '.kkkkkkkkkkkkk..',
  'kkkkkkkkkkkkkkk.',
  'kkyykkkkkkkyykk.',
  'kkkkkkkkkkkkkkk.',
  'kkkkkkyyykkkkkk.',
  'kkkkkkyyykkkkkk.',
  'kkkkkkkkkkkkkkk.',
  'kkyykkkkkkkyykk.',
  'kkkkkkkkkkkkkkk.',
  '.kkkkkkkkkkkkk..',
]);

def('chest_open', [
  '.kkkkkkkkkkkkk..',
  'kk...........kk.',
  'kk...........kk.',
  'kkkkkkkkkkkkkkk.',
  'kkkkkkyyykkkkkk.',
  'kkkkkkyyykkkkkk.',
  'kkkkkkkkkkkkkkk.',
  'kkyykkkkkkkyykk.',
  'kkkkkkkkkkkkkkk.',
  '.kkkkkkkkkkkkk..',
]);

// item icons
def('i_lance', [
  '............',
  'qq..........',
  'qqqwwwwwwwww',
  'qq..........',
  '............',
]);

def('i_dagger', [
  '....w.....',
  '...www....',
  '...www....',
  '...www....',
  '..kkkkk...',
  '...kkk....',
]);

def('i_torch', [
  '...yy.....',
  '..yooy....',
  '..yoy.....',
  '...kk.....',
  '...kk.....',
  '...kk.....',
]);

def('i_axe', [
  '..qqq.....',
  '.qqqqq....',
  '.qqkqq....',
  '..qkq.....',
  '...k......',
  '...k......',
]);

def('i_armor', [
  '..aaaaaa..',
  '.aAaaaaAa.',
  '.aA.aa.Aa.',
  '.aa.AA.aa.',
  '....aa....',
  '...aaaa...',
  '...AaaA...',
], PAL);

def('i_gold', [
  '..aaaaaa..',
  '.aAaaaaAa.',
  '.aA.aa.Aa.',
  '.aa.AA.aa.',
  '....aa....',
  '...aaaa...',
  '...AaaA...',
], GOLD);

export function initSprites() {
  for (const [name, rows, pal] of defs) SPR[name] = bake(rows, pal);
  for (const [name, rows] of knightDefs) {
    SPR['k_' + name] = bake(rows, PAL);
    SPR['gk_' + name] = bake(rows, GOLD);
  }
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

// Draw only the top `px` rows of a sprite (zombies rising from the dirt).
export function drawSpriteClip(ctx, name, x, y, px, flip = false) {
  const c = SPR[name];
  if (!c || px <= 0) return;
  const h = Math.min(c.height, Math.round(px));
  ctx.save();
  if (flip) {
    ctx.translate(Math.round(x) + c.width, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(c, 0, 0, c.width, h, 0, 0, c.width, h);
  } else {
    ctx.drawImage(c, 0, 0, c.width, h, Math.round(x), Math.round(y), c.width, h);
  }
  ctx.restore();
}

// ======================= THEMES & TILES =======================

export const THEMES = {
  grave: {
    name: 'STAGE 1 · THE GRAVEYARD',
    sky0: '#0a0a1e', sky1: '#16163a',
    solid: '#4a4438', solidDark: '#2a2620', top: '#3c6030', topLite: '#5c8848',
    plat: '#6a5030', platDark: '#3a2c18',
    music: 'grave',
  },
  forest: {
    name: 'STAGE 2 · FOREST OF FEAR',
    sky0: '#081018', sky1: '#10202c',
    solid: '#3c4c2c', solidDark: '#202c18', top: '#2c5828', topLite: '#488040',
    plat: '#6a5030', platDark: '#3a2c18',
    music: 'forest',
  },
  ice: {
    name: 'STAGE 3 · ICE VILLAGE',
    sky0: '#101830', sky1: '#203050',
    solid: '#5868a0', solidDark: '#303c60', top: '#c8e0f8', topLite: '#f0f8ff',
    plat: '#7a6848', platDark: '#453828',
    music: 'ice',
  },
  caves: {
    name: 'STAGE 4 · CRYSTAL CAVES',
    sky0: '#100a20', sky1: '#1c1234',
    solid: '#54486c', solidDark: '#2e2640', top: '#8878b0', topLite: '#b8a8e0',
    plat: '#6a5030', platDark: '#3a2c18',
    music: 'caves',
  },
  castle: {
    name: 'STAGE 5 · CASTLE WALLS',
    sky0: '#180c14', sky1: '#301824',
    solid: '#6c6474', solidDark: '#3a3540', top: '#8c8498', topLite: '#b0a8c0',
    plat: '#5a4a34', platDark: '#32281c',
    music: 'castle',
  },
  throne: {
    name: 'STAGE 6 · DEMON THRONE',
    sky0: '#1c0808', sky1: '#320e0e',
    solid: '#5c2c2c', solidDark: '#341616', top: '#844040', topLite: '#a85858',
    plat: '#5a4a34', platDark: '#32281c',
    music: 'boss',
  },
};

// t: 1 solid, 2 platform, 3 ladder, 4 gravestone, 5 water, 6 ice.
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
    ctx.fillRect(x, y, 16, 5);
    ctx.fillStyle = th.platDark;
    ctx.fillRect(x, y + 3, 16, 2);
    ctx.fillRect(x + 3, y + 1, 1, 2); ctx.fillRect(x + 11, y + 1, 1, 2);
    ctx.fillStyle = th.topLite;
    ctx.fillRect(x, y, 16, 1);
  } else if (t === 3) {
    ctx.fillStyle = '#7a6030';
    ctx.fillRect(x + 3, y, 2, 16); ctx.fillRect(x + 11, y, 2, 16);
    ctx.fillStyle = '#9a7c40';
    ctx.fillRect(x + 3, y + 3, 10, 2); ctx.fillRect(x + 3, y + 11, 10, 2);
  } else if (t === 4) {
    // gravestone — solid, blocks weapons, mocks you
    ctx.fillStyle = '#8a8a96';
    ctx.fillRect(x + 3, y + 4, 10, 12);
    ctx.fillRect(x + 4, y + 2, 8, 3);
    ctx.fillStyle = '#5a5a66';
    ctx.fillRect(x + 4, y + 14, 9, 2);
    ctx.fillRect(x + 5, y + 6, 6, 1); ctx.fillRect(x + 5, y + 9, 6, 1);
    ctx.fillStyle = '#b8b8c4';
    ctx.fillRect(x + 4, y + 2, 2, 2);
  } else if (t === 5) {
    const ph = Math.sin((frame / 20) + x / 24);
    ctx.fillStyle = '#0c2038';
    ctx.fillRect(x, y + 4, 16, 12);
    ctx.fillStyle = '#183454';
    ctx.fillRect(x, y + 2, 16, 3);
    ctx.fillStyle = '#4878a8';
    ctx.fillRect(x + (ph > 0 ? 2 : 8), y + 2, 5, 1);
  } else if (t === 6) {
    ctx.fillStyle = '#88b8e0';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#5888c0';
    ctx.fillRect(x + 3, y + 7, 5, 2); ctx.fillRect(x + 10, y + 12, 4, 2);
    if (topOpen) {
      ctx.fillStyle = '#d8ecfc';
      ctx.fillRect(x, y, 16, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 16, 1);
    }
  }
}

// Deep-water fill below a surface tile.
export function drawWaterBody(ctx, x, y) {
  ctx.fillStyle = '#081828';
  ctx.fillRect(x, y, 16, 16);
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

// Puff of magic — polymorph cloud.
export function drawPoof(ctx, x, y, t) {
  const r = 4 + t * 0.8;
  ctx.fillStyle = ['#f8f8f8', '#c8a8f0', '#a860d8'][t % 3];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
