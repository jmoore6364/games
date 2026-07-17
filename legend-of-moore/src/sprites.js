// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural terrain and dungeon tiles. All original art.

// ---- palette ----
const PAL = {
  d: '#101010', // outline dark
  w: '#f8f8f8', // white
  g: '#30a020', // tunic green
  G: '#186010', // dark green
  s: '#f8b888', // skin
  h: '#804010', // brown (hair, wood)
  H: '#502808', // dark brown
  y: '#f8d838', // gold
  o: '#e07820', // orange
  r: '#c02818', // red
  R: '#f84020', // bright red
  b: '#3868f8', // blue
  B: '#182888', // dark blue
  c: '#40d8d8', // cyan
  p: '#c060e0', // purple
  P: '#682898', // dark purple
  q: '#a8a8b8', // grey
  Q: '#585868', // dark grey
  k: '#e8e0c8', // bone / pale
  t: '#d8b048', // tan
  n: '#282838', // near-black (shadow bodies)
};

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
function def(name, rows, palOverride) { defs.push([name, rows, palOverride]); }

// ============================ HERO ============================
// Moore of Moorule. Brown hair, green tunic. 16x16, facing viewer.

def('m_down1', [
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hsssssss....',
  '....sdssssds....',
  '....ssssssss....',
  '.....ssssss.....',
  '.....gggggg.....',
  '....gggggggg....',
  '...sgggggggss...',
  '...sgyyyyyygs...',
  '....gggggggg....',
  '.....GGGGGG.....',
  '.....hh..hh.....',
  '.....hh..hh.....',
  '....HHH..HHH....',
  '................',
]);
def('m_down2', [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hsssssss....',
  '....sdssssds....',
  '....ssssssss....',
  '.....ssssss.....',
  '.....gggggg.....',
  '....gggggggg....',
  '...sgggggggss...',
  '...sgyyyyyygs...',
  '.....GGGGGG.....',
  '....hh...hh.....',
  '...hh.....hh....',
  '..HHH.....HHH...',
  '................',
]);
def('m_up1', [
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '.....hhhhhh.....',
  '.....gggggg.....',
  '....gggggggg....',
  '...sgggggggss...',
  '...sgyyyyyygs...',
  '....gggggggg....',
  '.....GGGGGG.....',
  '.....hh..hh.....',
  '.....hh..hh.....',
  '....HHH..HHH....',
  '................',
]);
def('m_up2', [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '.....hhhhhh.....',
  '.....gggggg.....',
  '....gggggggg....',
  '...sgggggggss...',
  '...sgyyyyyygs...',
  '.....GGGGGG.....',
  '....hh...hh.....',
  '...hh.....hh....',
  '..HHH.....HHH...',
  '................',
]);
// side sprites face RIGHT; flip for left.
def('m_side1', [
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hhssssss....',
  '....hhsdssss....',
  '....hhssssss....',
  '.....hsssss.....',
  '.....gggggg.....',
  '....ggggggg.....',
  '....gggggggs....',
  '....gyyyyyys....',
  '....gggggg......',
  '.....GGGGG......',
  '.....hh.hh......',
  '.....hh.hh......',
  '....HHH.HHH.....',
  '................',
]);
def('m_side2', [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hhssssss....',
  '....hhsdssss....',
  '....hhssssss....',
  '.....hsssss.....',
  '.....gggggg.....',
  '....gggggggs....',
  '....gyyyyyys....',
  '....gggggg......',
  '.....GGGGG......',
  '....hh..hh......',
  '...hh....hh.....',
  '..HHH....HHH....',
  '................',
]);
// Holding a treasure overhead.
def('m_lift', [
  '...s........s...',
  '...ss......ss...',
  '....shhhhhhs....',
  '....hhhhhhhh....',
  '....hsssssss....',
  '....sdssssds....',
  '....ssssssss....',
  '.....ssssss.....',
  '.....gggggg.....',
  '....gggggggg....',
  '....gggggggg....',
  '....gyyyyyyg....',
  '.....GGGGGG.....',
  '.....hh..hh.....',
  '.....hh..hh.....',
  '....HHH..HHH....',
]);

// Swords: 16x16. _up points up (flipV for down); _side points right (flipH left).
def('sword_up', [
  '.......ww.......',
  '.......wq.......',
  '.......wq.......',
  '.......wq.......',
  '.......wq.......',
  '.......wq.......',
  '.......wq.......',
  '.......wq.......',
  '.......wq.......',
  '.......wq.......',
  '......yyyy......',
  '.......yy.......',
  '.......yy.......',
  '.......yy.......',
  '................',
  '................',
]);
def('sword_side', [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....y..........',
  '.....y..........',
  '..yyyywwwwwwwww.',
  '.....yqqqqqqqqq.',
  '.....y..........',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
const WHITE_SWAP = { q: '#40d8d8', y: '#f8f8f8' };
def('wsword_up', null); // baked as recolor below
def('wsword_side', null);
const BEAM_SWAP = { q: '#c060e0', w: '#40d8d8', y: '#40d8d8' };
def('beam_up', null);
def('beam_side', null);

// ============================ ENEMIES ============================

// Spitter — rock-spitting red octopod (overworld).
def('en_spitter1', [
  '................',
  '................',
  '....rrrrrrrr....',
  '...rrrrrrrrrr...',
  '..rrwddrrddwrr..',
  '..rrddrrrrddrr..',
  '..rrrrrrrrrrrr..',
  '..rrrRRRRRRrrr..',
  '...rrRddddRrr...',
  '...rrrRRRRrrr...',
  '..rr.rr..rr.rr..',
  '..rr.rr..rr.rr..',
  '................',
  '................',
  '................',
  '................',
]);
def('en_spitter2', [
  '................',
  '................',
  '....rrrrrrrr....',
  '...rrrrrrrrrr...',
  '..rrwddrrddwrr..',
  '..rrddrrrrddrr..',
  '..rrrrrrrrrrrr..',
  '..rrrRRRRRRrrr..',
  '...rrRddddRrr...',
  '...rrrRRRRrrr...',
  '...rr.rrrr.rr...',
  '..rr..rrrr..rr..',
  '................',
  '................',
  '................',
  '................',
]);
// Hopper — leaping blue tick.
def('en_hopper1', [
  '................',
  '................',
  '................',
  '.....bbbbbb.....',
  '....bbbbbbbb....',
  '...bbwdbbdwbb...',
  '...bbbbbbbbbb...',
  '....bBBBBBBb....',
  '..b..bBBBBb..b..',
  '.bb..b....b..bb.',
  'bb..bb....bb..bb',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
def('en_hopper2', [
  '................',
  '................',
  '................',
  '................',
  '.....bbbbbb.....',
  '....bbbbbbbb....',
  '...bbwdbbdwbb...',
  '...bbbbbbbbbb...',
  '....bBBBBBBb....',
  '...b.b....b.b...',
  '...bb......bb...',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
// Burrower — sand worm.
def('en_burrower1', [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....hhhhh......',
  '....hhdhdhh.....',
  '....hhhhhhh.....',
  '...HhhhhhhhH....',
  '..tHHhhhhHHt....',
  '.tttHHHHHHttt...',
  '................',
  '................',
  '................',
  '................',
]);
def('en_burrower2', [
  '................',
  '................',
  '.....hhhhh......',
  '....hhdhdhh.....',
  '....hhhhhhh.....',
  '....Hhhhhhh.....',
  '....hhhhhhH.....',
  '....HhhhhhH.....',
  '....hhhhhhh.....',
  '...HhhhhhhhH....',
  '..tHHhhhhHHt....',
  '.tttHHHHHHttt...',
  '................',
  '................',
  '................',
  '................',
]);
// Grunt — spear-throwing marsh goblin.
def('en_grunt1', [
  '....gggggg...h..',
  '...gggggggg..h..',
  '...gwdggdwg..h..',
  '...gggggggg..h..',
  '....gGGGGg...q..',
  '....gggggg...h..',
  '...hhhhhhhh..h..',
  '..hhhhhhhhhh.h..',
  '..hsHHHHHHshsh..',
  '..hsHHHHHHs..h..',
  '...hhhhhhhh..h..',
  '....HHHHHH...h..',
  '....gg..gg......',
  '....gg..gg......',
  '...GGG..GGG.....',
  '................',
]);
def('en_grunt2', [
  '................',
  '....gggggg...h..',
  '...gggggggg..h..',
  '...gwdggdwg..h..',
  '...gggggggg..h..',
  '....gGGGGg...q..',
  '....gggggg...h..',
  '...hhhhhhhh..h..',
  '..hhhhhhhhhhsh..',
  '..hsHHHHHHs..h..',
  '...hhhhhhhh..h..',
  '....HHHHHH...h..',
  '...gg....gg..h..',
  '..gg......gg....',
  '.GGG......GGG...',
  '................',
]);
// Lurker — river beast, surfaces to spit fire.
def('en_lurker1', [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bwdbbbbb.....',
  '...bbbbbbbb.....',
  '..c.bbbbbb.c....',
  '.ccc.c..c.ccc...',
  '................',
  '................',
]);
def('en_lurker2', [
  '................',
  '................',
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bwdbbbbb.....',
  '...bbbbbbbb.....',
  '...bbRRRbbb.....',
  '....bbbbbb......',
  '.....bbbb.......',
  '.....bbbb.......',
  '....bbbbbb......',
  '..c.bbbbbb.c....',
  '.ccc.c..c.ccc...',
  '................',
  '................',
]);
// Ghost — graveyard haunt.
def('en_ghost1', [
  '................',
  '.....kkkkkk.....',
  '....kkkkkkkk....',
  '...kkkkkkkkkk...',
  '...kkdkkkkdkk...',
  '...kkkkkkkkkk...',
  '...kkkkddkkkk...',
  '...kkkkkkkkkk...',
  '...kkkkkkkkkk...',
  '...kkkkkkkkkk...',
  '...kk.kkkk.kk...',
  '...k...kk...k...',
  '................',
  '................',
  '................',
  '................',
]);
def('en_ghost2', [
  '................',
  '................',
  '.....kkkkkk.....',
  '....kkkkkkkk....',
  '...kkkkkkkkkk...',
  '...kkdkkkkdkk...',
  '...kkkkkkkkkk...',
  '...kkkkddkkkk...',
  '...kkkkkkkkkk...',
  '...kkkkkkkkkk...',
  '....kkk.kkk.....',
  '...kk.kk.kk.....',
  '................',
  '................',
  '................',
  '................',
]);
// Bat — dungeon keese-kin.
def('en_bat1', [
  '................',
  '................',
  '................',
  '................',
  'PP............PP',
  'PPP..........PPP',
  '.PPP.PPPPPP.PPP.',
  '..PPPPPPPPPPPP..',
  '...PPwdPPdwPP...',
  '....PPPPPPPP....',
  '.....P.PP.P.....',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
def('en_bat2', [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....PPPPPP.....',
  '..PPPPPPPPPPPP..',
  '.PPPPPwdPdwPPPP.',
  '..PP.PPPPPP.PP..',
  '......P.P.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
// Gel — little blob (from a split zol).
def('en_gel1', [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......cccc......',
  '.....cccccc.....',
  '.....cdccdc.....',
  '.....cccccc.....',
  '......cccc......',
  '................',
  '................',
  '................',
]);
def('en_gel2', [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....cccccc.....',
  '....ccdccdcc....',
  '....cccccccc....',
  '................',
  '................',
  '................',
  '................',
]);
// Zol — big blob; splits into two gels.
def('en_zol1', [
  '................',
  '................',
  '................',
  '................',
  '.....cccccc.....',
  '....cccccccc....',
  '...cccccccccc...',
  '...ccdccccdcc...',
  '...cccccccccc...',
  '...cccccccccc...',
  '....cccccccc....',
  '.....cccccc.....',
  '................',
  '................',
  '................',
  '................',
]);
def('en_zol2', [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....cccccc.....',
  '....cccccccc....',
  '...ccdccccdcc...',
  '...cccccccccc...',
  '...cccccccccc...',
  '..cccccccccccc..',
  '.cccccccccccccc.',
  '................',
  '................',
  '................',
  '................',
]);
// Stalfos — restless bones.
def('en_stalfos1', [
  '.....kkkkkk.....',
  '....kkkkkkkk....',
  '....kddkkddk....',
  '....kkkkkkkk....',
  '.....kdkdkd.....',
  '......kkkk......',
  '....kkkkkkkk....',
  '...k..kkkk..k...',
  '...k..kkkk..k...',
  '...k.kkkkkk.k...',
  '......kkkk......',
  '.....kk..kk.....',
  '.....kk..kk.....',
  '.....kk..kk.....',
  '....kkk..kkk....',
  '................',
]);
def('en_stalfos2', [
  '................',
  '.....kkkkkk.....',
  '....kkkkkkkk....',
  '....kddkkddk....',
  '....kkkkkkkk....',
  '.....kdkdkd.....',
  '......kkkk......',
  '....kkkkkkkk....',
  '...k..kkkk..k...',
  '...k..kkkk..k...',
  '...k.kkkkkk.k...',
  '......kkkk......',
  '....kk....kk....',
  '...kk......kk...',
  '..kkk......kkk..',
  '................',
]);
// Knight — armored sentinel.
def('en_knight1', [
  '.....RRRR.......',
  '....qqqqqq......',
  '...qqqqqqqq.....',
  '...qddqqddq.....',
  '...qqqqqqqq.....',
  '....qqQQqq......',
  '...QQQQQQQQ.....',
  '..QQqQQQQqQQyy..',
  '..QQqQQQQqQyyyy.',
  '..QQQQQQQQQyddy.',
  '...QQQQQQQ.yyyy.',
  '....QQQQQQ..yy..',
  '....qq..qq......',
  '....qq..qq......',
  '...QQQ..QQQ.....',
  '................',
]);
def('en_knight2', [
  '................',
  '.....RRRR.......',
  '....qqqqqq......',
  '...qqqqqqqq.....',
  '...qddqqddq.....',
  '...qqqqqqqq.....',
  '....qqQQqq......',
  '...QQQQQQQQyy...',
  '..QQqQQQQqQyyyy.',
  '..QQqQQQQqQyddy.',
  '..QQQQQQQQQyyyy.',
  '...QQQQQQQ..yy..',
  '...qq....qq.....',
  '..qq......qq....',
  '.QQQ......QQQ...',
  '................',
]);
// Hexer — teleporting spellcaster.
def('en_hexer1', [
  '.......pp.......',
  '......pppp......',
  '.....pppppp.....',
  '....pppppppp....',
  '...pppppppppp...',
  '....nnnnnnnn....',
  '....nwn..nwn....',
  '....nnnnnnnn....',
  '...pppppppppp...',
  '...pPpppppppP...',
  '..ppPpppppppPp..',
  '..ppPpppppppPp..',
  '...PPppppppPP...',
  '....pppppppp....',
  '...PPPPPPPPPP...',
  '................',
]);
def('en_hexer2', [
  '................',
  '.......pp.......',
  '......pppp......',
  '.....pppppp.....',
  '....pppppppp....',
  '...pppppppppp...',
  '....nnnnnnnn....',
  '....nwn..nwn....',
  '....nnnnnnnn....',
  '...pppppppppp...',
  '..pPpppppppppP..',
  '..pPpppppppppP..',
  '...PppppppppP...',
  '....pppppppp....',
  '...PPPPPPPPPP...',
  '................',
]);
// Blade trap — lunging spiked ball.
def('en_trap', [
  '.......qq.......',
  '......qqqq......',
  '...q..qQQq..q...',
  '..qq.qQQQQq.qq..',
  '..qqqQQQQQQqqq..',
  '...qQQwwQQQQq...',
  '..qQQwwQQQQQQq..',
  '.qqQQwQQQQQQQqq.',
  '.qqQQQQQQQQQQqq.',
  '..qQQQQQQQQQQq..',
  '...qQQQQQQQQq...',
  '..qq.qQQQQq.qq..',
  '...q..qQQq..q...',
  '......qqqq......',
  '.......qq.......',
  '................',
]);

// ============================ BOSSES (32x32) ============================

// Thornmaw — briar dragon of the Hollow Oak.
def('bo_thornmaw', [
  '..........GG....................',
  '.........GGGG.......GG..........',
  '..........GGGG.....GGGG.........',
  '......GGGGGGGGGGGGGGGG..........',
  '.....GGggggggggggggGGGG.........',
  '....GGgggwwddggggggggGG.........',
  '....GGgggddwwggggggggggG........',
  '....GGgggggggggggRRRgggg........',
  '.....GGggggggggRRRRRRggg........',
  '......GGggggggRRdddddRR.........',
  '.......GGggggggRRRRRR...........',
  '........GGgggggggggg............',
  '.........GGggggggggGG...........',
  '..........GGggggggggGG..........',
  '....GG.....GGggggggggG..........',
  '...GGGG.....GGgggggggGG.........',
  '..GGgGGG.....GGgggggggG.........',
  '..GGggGGG.....GGggggggGG........',
  '...GGgggGG.....GGggggggG........',
  '....GGgggGGGGGGGGgggggGG........',
  '.....GGggggggggggggggGG.........',
  '......GGggggggggggggGG..........',
  '.......GGGgggggggggGG...........',
  '.........GGGgggggGGG............',
  '...........GGgggGG..............',
  '..........GGgggGG...............',
  '.........GGgggGG................',
  '........GGgggggGGGGG............',
  '........GGggggggggGGGG..........',
  '.........GGGGggggggggGG.........',
  '............GGGGGGGGGG..........',
  '................................',
]);
// Gravemaw — stone toad that swallows fire.
def('bo_gravemaw', [
  '................................',
  '................................',
  '.......qqqq........qqqq........',
  '......qQQQQq......qQQQQq........',
  '......qQwdQq......qQwdQq........',
  '.....qqQQQQqqqqqqqqQQQQqq.......',
  '....qqqqqqqqqqqqqqqqqqqqqq......',
  '...qqqqqqqqqqqqqqqqqqqqqqqq.....',
  '..qqQQqqqqqqqqqqqqqqqqQQqqqq....',
  '..qQQQQqqqqqqqqqqqqqqQQQQqqq....',
  '..qqQQqqqqqqqqqqqqqqqqQQqqqqq...',
  '..qqqqqqRRRRRRRRRRRRqqqqqqqqq...',
  '..qqqqqRRddddddddddRRqqqqqqqq...',
  '..qqqqqRdddddddddddddRqqqqqqq...',
  '..qqqqqRRddddddddddRRqqqqqqqq...',
  '..qqqqqqRRRRRRRRRRRRqqqqqqqq....',
  '..qqqqqqqqqqqqqqqqqqqqqqqqqq....',
  '...qqqqqqqqqqqqqqqqqqqqqqqq.....',
  '...qqqqqqqqqqqqqqqqqqqqqqqq.....',
  '..qqqqQQqqqqqqqqqqqqqqQQqqqqq...',
  '..qqqQQQQqqqqqqqqqqqqQQQQqqqq...',
  '..qqqQQQQqqqqqqqqqqqqQQQQqqqq...',
  '..qqqqQQqqqqqqqqqqqqqqQQqqqq....',
  '...qqqqqqqqqqqqqqqqqqqqqqqq.....',
  '....qqqqqqqqqqqqqqqqqqqqqq......',
  '.....qqqqqq..qqqqq..qqqqq.......',
  '....QQQQ..QQQQ..QQQQ..QQQQ......',
  '....QQQQ..QQQQ..QQQQ..QQQQ......',
  '................................',
  '................................',
  '................................',
  '................................',
]);
// Hexlord — arch-mage of the Ember Maw.
def('bo_hexlord', [
  '..............RR................',
  '.............RRRR...............',
  '............RRRRRR..............',
  '...........RRRRRRRR.............',
  '..........RRRRRRRRRR............',
  '..........RRyyRRyyRR............',
  '.........RRRRRRRRRRRR...........',
  '........RRRRRRRRRRRRRR..........',
  '.........nnnnnnnnnnnn...........',
  '.........nnwwnnnnwwnn...........',
  '.........nnnnnnnnnnnn...........',
  '..........nnnnnnnnnn............',
  '........RRRRRRRRRRRRRR..........',
  '.......RRRRRRRRRRRRRRRR.........',
  '......RRrRRRRRRRRRRRRrRR........',
  '.....RRrrRRRyyyyyyRRRrrRR.......',
  '....RRrrRRRyyddddyyRRRrrRR......',
  '....RrrRRRRyddyyddyRRRRrrR......',
  '....RrrRRRRyyddddyyRRRRrrR......',
  '....RrrRRRRRyyyyyyRRRRRrrR......',
  '....RrrRRRRRRRRRRRRRRRRrrR......',
  '.....rrRRRRRRRRRRRRRRRrr........',
  '.....yy.RRRRRRRRRRRRR.yy........',
  '.....yy..RRRRRRRRRRR..yy........',
  '..........RRRRRRRRR.............',
  '..........RRRRRRRRR.............',
  '.........RRRRRRRRRRR............',
  '........RRRRRRRRRRRRR...........',
  '.......RRRRRRRRRRRRRRR..........',
  '......RRRRRRRRRRRRRRRRR.........',
  '................................',
  '................................',
]);
// Vexmoor — the Shadow King.
def('bo_vexmoor', [
  '........y..y..y..y..y...........',
  '........yy.yy.yy.yy.yy..........',
  '........yyyyyyyyyyyyyy..........',
  '.........nnnnnnnnnnnn...........',
  '........nnnnnnnnnnnnnn..........',
  '........nnRRnnnnnnRRnn..........',
  '........nnRRnnnnnnRRnn..........',
  '........nnnnnnnnnnnnnn..........',
  '.........nnnnnddnnnnn...........',
  '..........nnnnnnnnnn............',
  '......PPPPnnnnnnnnnnPPPP........',
  '....PPPPPPnnnnnnnnnnPPPPPP......',
  '...PPPPnnnnnnnnnnnnnnnnPPPP.....',
  '..PPPPnnnnnnnnnnnnnnnnnnPPPP....',
  '..PPPnnnnnnPPPPPPnnnnnnnnPPP....',
  '..PPnnnnnnPPddddPPnnnnnnnnPP....',
  '..PPnnnnnnPPddddPPnnnnnnnnPP....',
  '..PPnnnnnnnPPPPPPnnnnnnnnnPP....',
  '..PPnnnnnnnnnnnnnnnnnnnnnnPP....',
  '..PPnnnnnnnnnnnnnnnnnnnnnnPP....',
  '..PPnnnnnnnnnnnnnnnnnnnnnnPP....',
  '..PPPnnnnnnnnnnnnnnnnnnnPPPP....',
  '..PPPPnnnnnnnnnnnnnnnnnPPPP.....',
  '...PPPPnnnnnnnnnnnnnnnPPPP......',
  '....PPPnnnnnnnnnnnnnnnPPP.......',
  '....PPnnnnnnnnnnnnnnnnnPP.......',
  '....PPnnnnnn....nnnnnnnPP.......',
  '....PPnnnnn......nnnnnnPP.......',
  '....PPnnnnn......nnnnnnPP.......',
  '.....Pnnnnn......nnnnnnP........',
  '.....nnnnn........nnnnn.........',
  '................................',
]);

// ============================ NPCS ============================

def('np_oldman', [
  '................',
  '.....qqqqqq.....',
  '....qqqqqqqq....',
  '....qsssssss....',
  '....sdssssds....',
  '....ssssssss....',
  '....wwssssww....',
  '....wwwwwwww....',
  '.....wwwwww.....',
  '....rrrrrrrr....',
  '...rrrrrrrrrr...',
  '...rrrrrrrrrr...',
  '...rrrrrrrrrr...',
  '...rrrrrrrrrr...',
  '...rrrrrrrrrr...',
  '....rr....rr....',
]);
def('np_merchant', [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hsssssss....',
  '....sdssssds....',
  '....ssssssss....',
  '....shhhhhhs....',
  '.....ssssss.....',
  '....bbbbbbbb....',
  '...bbbbbbbbbb...',
  '..sbbbbbbbbbbs..',
  '..sbbbbbbbbbbs..',
  '...bbbbbbbbbb...',
  '...bbbbbbbbbb...',
  '....bb....bb....',
  '...BBB....BBB...',
]);
def('np_princess', [
  '.....y.y.y......',
  '.....yyyyy......',
  '....yhhhhhy.....',
  '....hhhhhhhh....',
  '....hsssssss....',
  '....sdssssds....',
  '....ssssssss....',
  '.....ssssss.....',
  '....pppppppp....',
  '...pppppppppp...',
  '..spppppppppps..',
  '..spppppppppps..',
  '...pppppppppp...',
  '..pppppppppppp..',
  '..pppppppppppp..',
  '.pppppppppppppp.',
]);

// ============================ ITEMS ============================

def('it_sword', [
  '...ww...',
  '...wq...',
  '...wq...',
  '...wq...',
  '...wq...',
  '...wq...',
  '...wq...',
  '...wq...',
  '...wq...',
  '..yyyy..',
  '...yy...',
  '...yy...',
  '...yy...',
  '........',
]);
def('it_wsword', null); // recolor
def('it_boomer', [
  '.hh.....',
  '.hhh....',
  '..hhh...',
  '...hhh..',
  '....hhh.',
  '....yhh.',
  '.....hh.',
  '........',
]);
def('it_bomb', [
  '....qq..',
  '...q....',
  '..nnnn..',
  '.nnnnnn.',
  '.nnwnnn.',
  '.nnnnnn.',
  '.nnnnnn.',
  '..nnnn..',
]);
def('it_candle', [
  '...o....',
  '..oRo...',
  '..oRo...',
  '...w....',
  '..rrr...',
  '..rrr...',
  '..rrr...',
  '..rrr...',
  '..rrr...',
  '.yyyyy..',
]);
def('it_key', [
  '..yyy...',
  '.yy.yy..',
  '.yy.yy..',
  '..yyy...',
  '...yy...',
  '...yy...',
  '...yyy..',
  '...yy...',
  '...yyy..',
]);
def('it_map', [
  '.tttttt.',
  '.tddtdt.',
  '.ttttdt.',
  '.tdddtt.',
  '.tttttt.',
  '.tdtttt.',
  '.tttttt.',
  '.tttttt.',
]);
def('it_compass', [
  '..yyyy..',
  '.yyyyyy.',
  'yyyRyyyy',
  'yyyRRyyy',
  'yyyyRyyy',
  'yyyyyyyy',
  '.yyyyyy.',
  '..yyyy..',
]);
def('it_heart', [
  '.rr..rr.',
  'rrrrrrrr',
  'rRrrrrrr',
  'rrrrrrrr',
  '.rrrrrr.',
  '..rrrr..',
  '...rr...',
  '........',
]);
def('it_container', [
  '..rrr....rrr..',
  '.rrrrr..rrrrr.',
  'rrRRrrrrrrrrrr',
  'rrRrrrrrrrrrrr',
  'rrrrrrrrrrrrrr',
  '.rrrrrrrrrrrr.',
  '..rrrrrrrrrr..',
  '...rrrrrrrr...',
  '....rrrrrr....',
  '.....rrrr.....',
  '......rr......',
  '..............',
]);
def('it_gem', [
  '...cc...',
  '..cccc..',
  '.cwcccc.',
  '.cccccc.',
  '.cccccc.',
  '..cccc..',
  '...cc...',
  '........',
]);
def('it_gem5', [
  '...yy...',
  '..yyyy..',
  '.ywyyyy.',
  '.yyyyyy.',
  '.yyyyyy.',
  '..yyyy..',
  '...yy...',
  '........',
]);
def('it_fairy', [
  '.w....w.',
  'www..www',
  '.wwssww.',
  '..ssss..',
  '..ssss..',
  '.wwssww.',
  'www..www',
  '.w....w.',
]);
def('it_shard', [
  '.......yy.',
  '......yyy.',
  '.....yyyy.',
  '....yyoyy.',
  '...yyooyy.',
  '..yyoooyy.',
  '.yyyyyyyy.',
  'yyyyyyyyy.',
  '..........',
]);
def('it_amulet', [
  '.....yyyy.......',
  '....yyyyyy......',
  '...yyoooyyy.....',
  '..yyooooooyy....',
  '.yyoooooooyyy...',
  'yyyyyyyyyyyyyy..',
  '.yyy........y...',
  '..yy............',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);

// ============================ PROJECTILES / FX ============================

def('pr_rock', [
  '..qq..',
  '.qqqq.',
  'qqQqqq',
  'qqqQqq',
  '.qqqq.',
  '..qq..',
]);
def('pr_spear_v', [
  '.qq.',
  'qqqq',
  '.qq.',
  '.hh.',
  '.hh.',
  '.hh.',
  '.hh.',
  '.hh.',
  '.hh.',
  '.hh.',
  '.hh.',
  '.hh.',
]);
def('pr_spear_h', [
  '..q.........',
  '.qqhhhhhhhhh',
  '..q.........',
]);
def('pr_fire1', [
  '...R....',
  '..RRR...',
  '.RRoRR..',
  '.RoooR..',
  '.RoyoR..',
  '.RooRR..',
  '..RRR...',
  '........',
]);
def('pr_fire2', [
  '....R...',
  '..RRR...',
  '.RRooR..',
  '.RoyoR..',
  '.RoooR..',
  '..RoR...',
  '..RRR...',
  '........',
]);
def('pr_bolt1', [
  '...p....',
  '..ppp...',
  '.ppwpp..',
  '..ppp...',
  '...p....',
  '........',
]);
def('pr_bolt2', [
  '.p...p..',
  '..ppp...',
  '.ppwpp..',
  '..ppp...',
  '.p...p..',
  '........',
]);
def('fx_flame1', [
  '...R....',
  '..RRo...',
  '.RRooR..',
  '.RoyyR..',
  '.RoyyoR.',
  '.RRooRR.',
  '..RRRR..',
  '........',
]);
def('fx_flame2', [
  '....R...',
  '..oRR...',
  '.RooRR..',
  '.RyyoR..',
  '.RoyyoR.',
  '.RRooRR.',
  '..RRRR..',
  '........',
]);
def('fx_fire', [
  '....RR....R.....',
  '..R.RRR..RR.....',
  '..RRRoRRRRR.R...',
  '...RRooRoRRRR...',
  '..RRooyooRRR....',
  '..RRoyyyooRR....',
  '.RRooyyyyooRR...',
  '.RRoyyyyyyoRR...',
  '..HHHHHHHHHH....',
  '..HHHHHHHHHH....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
def('fx_poof1', [
  '................',
  '................',
  '................',
  '................',
  '......qq.qq.....',
  '.....qwwqwwq....',
  '....qwwwwwwq....',
  '.....qwwwwq.....',
  '....qwwwwwwq....',
  '.....qq.qq......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
def('fx_poof2', [
  '................',
  '................',
  '....q.......q...',
  '...qwq.....qwq..',
  '....q...q...q...',
  '.......qwq......',
  '....q...q...q...',
  '...qwq.....qwq..',
  '....q.......q...',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
def('fx_boom1', [
  '................',
  '................',
  '.....oo.oo......',
  '....oRRoRRo.....',
  '...oRyyRyyRo....',
  '...oRywwwyRo....',
  '....RywwwyR.....',
  '...oRywwwyRo....',
  '...oRyyRyyRo....',
  '....oRRoRRo.....',
  '.....oo.oo......',
  '................',
  '................',
  '................',
  '................',
  '................',
]);
def('fx_boom2', [
  '................',
  '..q....q....q...',
  '.qoq..qoq..qoq..',
  '..q....q....q...',
  '................',
  '.q..qq...qq..q..',
  'qoqqooq.qooqqoq.',
  '.q..qq...qq..q..',
  '................',
  '..q....q....q...',
  '.qoq..qoq..qoq..',
  '..q....q....q...',
  '................',
  '................',
  '................',
  '................',
]);
def('fx_sparkle', [
  '...w....',
  '...w....',
  '.wwwww..',
  '...w....',
  '...w....',
  '........',
  '........',
  '........',
]);

// ============================ BAKING ============================

export function initSprites() {
  for (const [name, rows] of defs) {
    if (!rows) continue;
    SPR[name] = bake(rows, PAL);
  }
  const rebake = (src, swap) => {
    const rows = defs.find(([n]) => n === src)[1];
    return bake(rows, { ...PAL, ...swap });
  };
  SPR.wsword_up = rebake('sword_up', WHITE_SWAP);
  SPR.wsword_side = rebake('sword_side', WHITE_SWAP);
  SPR.beam_up = rebake('sword_up', BEAM_SWAP);
  SPR.beam_side = rebake('sword_side', BEAM_SWAP);
  SPR.it_wsword = rebake('it_sword', WHITE_SWAP);
  initTiles();
}

export function drawSprite(ctx, name, x, y, flipH = false, flipV = false) {
  const c = SPR[name];
  if (!c) return;
  if (!flipH && !flipV) { ctx.drawImage(c, Math.round(x), Math.round(y)); return; }
  ctx.save();
  ctx.translate(Math.round(x) + (flipH ? c.width : 0), Math.round(y) + (flipV ? c.height : 0));
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

// ============================ TILES ============================
// Procedural 16x16 tiles with a deterministic mini-RNG so patterns are stable.

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

export const OT = {}; // overworld tiles
export const DT = {}; // dungeon tile sets per theme

const GRASS = '#e0b850', GRASS_D = '#c09838';

function initTiles() {
  const ground = (g, base, dot, seed, n = 6) => {
    g.fillStyle = base; g.fillRect(0, 0, T, T);
    const r = rng(seed);
    g.fillStyle = dot;
    for (let i = 0; i < n; i++) g.fillRect((r() * T) | 0, (r() * T) | 0, 1, 1);
  };

  OT.grass = tile((g) => ground(g, GRASS, GRASS_D, 7));
  OT.flowers = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#f84020'; g.fillRect(3, 4, 2, 2); g.fillRect(10, 9, 2, 2);
    g.fillStyle = '#f8f8f8'; g.fillRect(11, 3, 2, 2); g.fillRect(4, 11, 2, 2);
    g.fillStyle = '#186010'; g.fillRect(4, 6, 1, 2); g.fillRect(11, 11, 1, 2);
  });
  OT.sand = tile((g) => ground(g, '#f0dca0', '#d8c080', 21, 8));
  OT.dirt = tile((g) => ground(g, '#c89858', '#a87840', 33));
  OT.tree = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#186010';
    g.fillRect(2, 1, 12, 10); g.fillRect(1, 3, 14, 7); g.fillRect(4, 0, 8, 12);
    g.fillStyle = '#30a020';
    g.fillRect(3, 2, 6, 3); g.fillRect(5, 5, 4, 2); g.fillRect(10, 3, 3, 2);
    g.fillStyle = '#502808'; g.fillRect(6, 11, 4, 5);
    g.fillStyle = '#804010'; g.fillRect(7, 11, 2, 5);
  });
  OT.rock = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#786858';
    g.fillRect(1, 3, 14, 12); g.fillRect(3, 1, 10, 14);
    g.fillStyle = '#988878'; g.fillRect(4, 3, 6, 4); g.fillRect(3, 8, 3, 3);
    g.fillStyle = '#484038'; g.fillRect(10, 8, 4, 6); g.fillRect(4, 12, 5, 3);
  });
  OT.rockB = OT.rock; // bombable rock looks identical (that's the secret)
  OT.water = [
    tile((g) => {
      g.fillStyle = '#2858f8'; g.fillRect(0, 0, T, T);
      g.fillStyle = '#78a0f8'; g.fillRect(1, 4, 5, 1); g.fillRect(9, 10, 5, 1);
    }),
    tile((g) => {
      g.fillStyle = '#2858f8'; g.fillRect(0, 0, T, T);
      g.fillStyle = '#78a0f8'; g.fillRect(3, 5, 5, 1); g.fillRect(8, 11, 5, 1);
    }),
  ];
  OT.bridge = tile((g) => {
    g.fillStyle = '#2858f8'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#a87840'; g.fillRect(0, 1, T, 14);
    g.fillStyle = '#804010';
    for (let y = 2; y < 15; y += 3) g.fillRect(0, y, T, 1);
    g.fillStyle = '#502808'; g.fillRect(0, 0, T, 1); g.fillRect(0, 15, T, 1);
  });
  OT.bush = tile((g) => {
    ground(g, GRASS, GRASS_D, 7);
    g.fillStyle = '#186010';
    g.fillRect(2, 4, 12, 10); g.fillRect(4, 2, 8, 13);
    g.fillStyle = '#30a020';
    g.fillRect(4, 4, 4, 3); g.fillRect(9, 6, 3, 2); g.fillRect(6, 9, 4, 2);
  });
  OT.grave = tile((g) => {
    ground(g, '#b8b8a8', '#989888', 55);
    g.fillStyle = '#787868'; g.fillRect(4, 3, 8, 11);
    g.fillStyle = '#a8a898'; g.fillRect(5, 4, 6, 9); g.fillRect(6, 2, 4, 2);
    g.fillStyle = '#585848'; g.fillRect(6, 6, 4, 1); g.fillRect(6, 8, 4, 1);
  });
  OT.gravel = tile((g) => ground(g, '#b8b8a8', '#989888', 55));
  OT.cave = tile((g) => {
    g.fillStyle = '#786858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#988878'; g.fillRect(0, 0, T, 2);
    g.fillStyle = '#101010'; g.fillRect(3, 4, 10, 12); g.fillRect(5, 2, 6, 14);
  });
  OT.dungeonDoor = tile((g) => {
    g.fillStyle = '#786858'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#101010'; g.fillRect(2, 3, 12, 13);
    g.fillStyle = '#f8d838'; g.fillRect(2, 3, 12, 1);
  });
  OT.gate = tile((g) => {
    g.fillStyle = '#484048'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#686068'; g.fillRect(1, 1, 14, 14);
    g.fillStyle = '#c060e0';
    g.fillRect(7, 3, 2, 5); g.fillRect(5, 6, 6, 2); g.fillRect(6, 10, 4, 3);
  });
  OT.stairs = tile((g) => {
    g.fillStyle = '#101010'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#a8a8b8';
    g.fillRect(0, 0, T, 3); g.fillRect(3, 5, 13, 2); g.fillRect(6, 9, 10, 2); g.fillRect(9, 13, 7, 2);
  });

  // Dungeon themes: [wall, wallDark, floor, floorDot]
  const THEME_COLORS = {
    oak: ['#309048', '#185028', '#c8a878', '#b09060'],
    crypt: ['#3868c8', '#182878', '#90a0b8', '#788aa0'],
    ember: ['#c85030', '#701808', '#d8a880', '#c09068'],
    lair: ['#7838a8', '#381858', '#9880a8', '#807090'],
  };
  for (const [key, [wall, wallD, floor, floorDot]] of Object.entries(THEME_COLORS)) {
    const set = {};
    set.floor = tile((g) => {
      g.fillStyle = floor; g.fillRect(0, 0, T, T);
      g.fillStyle = floorDot;
      g.fillRect(0, 0, 1, 1); g.fillRect(8, 8, 1, 1);
    });
    set.wall = tile((g) => {
      g.fillStyle = wall; g.fillRect(0, 0, T, T);
      g.fillStyle = wallD;
      g.fillRect(0, 7, T, 1); g.fillRect(0, 15, T, 1);
      g.fillRect(7, 0, 1, 8); g.fillRect(15, 0, 1, 8);
      g.fillRect(3, 8, 1, 8); g.fillRect(11, 8, 1, 8);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(0, 0, T, 1); g.fillRect(0, 8, T, 1);
    });
    set.block = tile((g) => {
      g.fillStyle = floor; g.fillRect(0, 0, T, T);
      g.fillStyle = wallD; g.fillRect(1, 1, 14, 14);
      g.fillStyle = wall; g.fillRect(1, 1, 13, 13);
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(1, 1, 13, 2);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(2, 12, 13, 3);
    });
    set.statue = tile((g) => {
      g.fillStyle = floor; g.fillRect(0, 0, T, T);
      g.fillStyle = wallD;
      g.fillRect(4, 1, 8, 14);
      g.fillRect(3, 12, 10, 3);
      g.fillStyle = wall;
      g.fillRect(5, 2, 6, 4); // head
      g.fillRect(5, 7, 6, 5);
      g.fillStyle = '#f8d838'; g.fillRect(6, 3, 1, 1); g.fillRect(9, 3, 1, 1);
    });
    set.water = tile((g) => {
      g.fillStyle = '#182878'; g.fillRect(0, 0, T, T);
      g.fillStyle = '#3868c8'; g.fillRect(2, 4, 5, 1); g.fillRect(9, 11, 5, 1);
    });
    set.lava = [
      tile((g) => {
        g.fillStyle = '#c02818'; g.fillRect(0, 0, T, T);
        g.fillStyle = '#f88018'; g.fillRect(1, 2, 6, 2); g.fillRect(9, 9, 5, 2); g.fillRect(3, 12, 4, 2);
        g.fillStyle = '#f8d838'; g.fillRect(3, 3, 2, 1); g.fillRect(11, 10, 2, 1);
      }),
      tile((g) => {
        g.fillStyle = '#c02818'; g.fillRect(0, 0, T, T);
        g.fillStyle = '#f88018'; g.fillRect(8, 2, 6, 2); g.fillRect(2, 8, 5, 2); g.fillRect(9, 13, 4, 2);
        g.fillStyle = '#f8d838'; g.fillRect(10, 3, 2, 1); g.fillRect(4, 9, 2, 1);
      }),
    ];
    set.wallColor = wall;
    set.wallDark = wallD;
    set.floorColor = floor;
    DT[key] = set;
  }
}

// Draw one overworld tile char at pixel x,y. frame animates water/lava.
export function drawOverTile(ctx, ch, x, y, frame) {
  const f2 = (frame >> 4) & 1;
  let c = null;
  switch (ch) {
    case '.': c = OT.grass; break;
    case ',': c = OT.flowers; break;
    case 's': c = OT.sand; break;
    case 'd': c = OT.dirt; break;
    case 't': c = OT.tree; break;
    case 'r': case 'R': c = OT.rock; break;
    case 'w': c = OT.water[f2]; break;
    case 'b': c = OT.bridge; break;
    case 'h': c = OT.bush; break;
    case 'g': c = OT.grave; break;
    case 'G': c = OT.gravel; break;
    case 'c': c = OT.cave; break;
    case '1': case '2': case '3': c = OT.dungeonDoor; break;
    case 'X': c = OT.gate; break;
    case 'S': c = OT.stairs; break;
    default: c = OT.grass;
  }
  ctx.drawImage(c, x, y);
}

// Draw one dungeon tile char with the given theme key.
export function drawDungTile(ctx, ch, x, y, frame, theme) {
  const set = DT[theme] || DT.oak;
  const f2 = (frame >> 4) & 1;
  let c = null;
  switch (ch) {
    case '#': c = set.wall; break;
    case '.': c = set.floor; break;
    case 'B': case 'P': c = set.block; break;
    case 'S': c = set.statue; break;
    case '~': c = set.water; break;
    case 'L': c = set.lava[f2]; break;
    default: c = set.floor;
  }
  ctx.drawImage(c, x, y);
}
