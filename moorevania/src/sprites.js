// Procedural pixel art: every sprite is baked from a character map at boot.
// '.' = transparent. All art is original.

const C = {
  k: '#000000', K: '#26262f', A: '#8a8a99', a: '#5a5a68', W: '#f5f5ee',
  s: '#e8b088', S: '#b07850', h: '#5a3620',
  r: '#c03028', R: '#801818', q: '#5a1010',
  o: '#d88030', O: '#8a4a18',
  y: '#f8d048', Y: '#a88018',
  g: '#40a040', G: '#1a6028', v: '#78c858',
  b: '#4878e8', B: '#203880', n: '#141c3a',
  p: '#9048c8', P: '#502878',
  e: '#e8e0c8', E: '#a09878',
  m: '#7a5a38', M: '#4a3618',
  d: '#c8a870', D: '#907040',
  c: '#48c8d8', F: '#e85818', f: '#f8b800',
  x: '#d84890', w: '#d8d8e8',
};

export const SPR = {};

function bake(rows) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const col = C[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  const fl = document.createElement('canvas');
  fl.width = w; fl.height = h;
  const fg = fl.getContext('2d');
  fg.translate(w, 0); fg.scale(-1, 1);
  fg.drawImage(cv, 0, 0);
  return { img: cv, flip: fl, w, h };
}

function def(name, rows) { SPR[name] = bake(rows); }

export function drawSprite(ctx, name, x, y, flip = false) {
  const s = SPR[name];
  if (!s) return;
  ctx.drawImage(flip ? s.flip : s.img, Math.round(x), Math.round(y));
}

// ============================== JASON BELMOORE ==============================
// 16 x 22, faces RIGHT.

def('p_idle', [
  '......hhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....ssssskss....',
  '....ssssssss....',
  '.....ssssss.....',
  '....RRRRRRR.....',
  '...RRRrrRRRR....',
  '..sRRrrrrRRRs...',
  '..sRRrrrrRRRs...',
  '..S.RrrrrRR.S...',
  '....RrrrrRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '....ddd.ddd.....',
  '....dd...dd.....',
  '...Mdd...ddM....',
  '...mm.....mm....',
  '..mmm.....mmm...',
  '..mmm.....mmm...',
]);

def('p_walk1', [
  '......hhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....ssssskss....',
  '....ssssssss....',
  '.....ssssss.....',
  '....RRRRRRR.....',
  '...RRRrrRRRR....',
  '..sRRrrrrRRRs...',
  '...sRrrrrRRs....',
  '....RrrrrRR.....',
  '....RrrrrRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '...ddd..ddd.....',
  '..ddd....dd.....',
  '..Mdd.....dM....',
  '..mm......mm....',
  '.mmm.......mmm..',
  '.mmm.......mmm..',
]);

def('p_walk2', [
  '......hhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....ssssskss....',
  '....ssssssss....',
  '.....ssssss.....',
  '....RRRRRRR.....',
  '...RRRrrRRRR....',
  '...RRrrrrRRR....',
  '..sRRrrrrRRs....',
  '..s.RrrrrRR.....',
  '....RrrrrRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '.....dddddd.....',
  '.....dd.ddd.....',
  '....Mdd.ddM.....',
  '....mm...mm.....',
  '...mmm...mmm....',
  '........mmmm....',
]);

def('p_jump', [
  '......hhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....ssssskss....',
  '....ssssssss....',
  '.....ssssss.....',
  '....RRRRRRR.....',
  '...RRRrrRRRs....',
  '..sRRrrrrRRs....',
  '..sRRrrrrRR.....',
  '....RrrrrRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '...ddd.dddd.....',
  '...dd..dd.......',
  '..Mdd..ddM......',
  '..mm...mm.......',
  '.mmm..mmm.......',
  '................',
  '................',
]);

def('p_crouch', [
  '......hhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....ssssskss....',
  '....ssssssss....',
  '....RRRRRRR.....',
  '...RRrrrrRRR....',
  '..sRRrrrrRRRs...',
  '..S.yyyyyyy.S...',
  '...dddd.dddd....',
  '..mdd.....ddm...',
  '.mmm.......mmm..',
]);

// wind-up: arm raised behind head
def('p_whip1', [
  '.....Ss.........',
  '.....sShhhh.....',
  '.....shhhhhh....',
  '....shhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....ssssskss....',
  '....ssssssss....',
  '.....ssssss.....',
  '...RRRRRRRR.....',
  '..RRRrrrRRRR....',
  '..RRrrrrrRRRs...',
  '...RrrrrrRR.S...',
  '....RrrrrRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '....ddd.ddd.....',
  '....dd...dd.....',
  '...Mdd...ddM....',
  '...mm.....mm....',
  '..mmm.....mmm...',
  '..mmm.....mmm...',
]);

// strike: arm extended forward
def('p_whip2', [
  '......hhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....ssssskss....',
  '....ssssssss....',
  '.....ssssss.....',
  '....RRRRRRR.....',
  '...RRRrrRRRss...',
  '..sRRrrrrRRRsS..',
  '..sRRrrrrRRR....',
  '..S.RrrrrRR.....',
  '....RrrrrRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '....ddd.ddd.....',
  '....dd...dd.....',
  '...Mdd...ddM....',
  '...mm.....mm....',
  '..mmm.....mmm...',
  '..mmm.....mmm...',
]);

def('p_climb1', [
  '....sS..........',
  '....sShhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....hhhhhhhh....',
  '.....hhhhhh.....',
  '....RRRRRRR.....',
  '...RRRRRRRRR....',
  '...RRRRRRRRRss..',
  '...RRRRRRRRRsS..',
  '...RRRRRRRRR....',
  '....RRRRRRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '...ddd..ddd.....',
  '...dd....dd.....',
  '..Mdd....ddM....',
  '..mm......mm....',
  '.mmm......mmm...',
  '................',
  '................',
]);

def('p_climb2', [
  '..........Ss....',
  '......hhhhSs....',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....hhhhhhhh....',
  '.....hhhhhh.....',
  '....RRRRRRR.....',
  '..ssRRRRRRRR....',
  '..SsRRRRRRRRR...',
  '....RRRRRRRRR...',
  '...RRRRRRRRR....',
  '....RRRRRRR.....',
  '....yyyyyyy.....',
  '....ddddddd.....',
  '....ddd..ddd....',
  '....dd....dd....',
  '...Mdd....ddM...',
  '....mm....mm....',
  '...mmm....mmm...',
  '................',
  '................',
]);

def('p_hurt', [
  '......hhhh......',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....rrrrrrrr....',
  '....ssssssss....',
  '....sskssssk....',
  '....ssssssss....',
  '.....ssssss.....',
  '...sRRRRRRR.....',
  '..sRRRrrRRRR....',
  '..SRRrrrrRRRs...',
  '...RRrrrrRRRsS..',
  '....RrrrrRR.....',
  '....RrrrrRR.....',
  '....yyyyyyy.....',
  '...dddddddd.....',
  '..ddd...ddd.....',
  '..dd.....ddd....',
  '.Mdd......ddM...',
  '.mm........mm...',
  'mmm........mmm..',
  '................',
]);

// ============================== ENEMIES ==============================

def('zombie1', [
  '.....vvvv.......',
  '....vvvvvv......',
  '....vkvvkv......',
  '....vvvvvv......',
  '.....vvvv.......',
  '....KKKKKK......',
  '...KKKKKKKK.....',
  '..vKKKKKKKKv....',
  '..vKKKKKKKKv....',
  '..v.KKKKKK.v....',
  '..v.KKKKKK.v....',
  '....KKKKKK......',
  '....KKKKKK......',
  '....KK.KKK......',
  '....KK..KK......',
  '....KK..KK......',
  '...vKK..KKv.....',
  '...vv....vv.....',
  '...vv....vv.....',
  '..vvv....vvv....',
]);

def('zombie2', [
  '.....vvvv.......',
  '....vvvvvv......',
  '....vkvvkv......',
  '....vvvvvv......',
  '.....vvvv.......',
  '....KKKKKK......',
  '...KKKKKKKK.....',
  '..vKKKKKKKKv....',
  '..vKKKKKKKK.v...',
  '..v.KKKKKK..v...',
  '....KKKKKK......',
  '....KKKKKK......',
  '....KKKKKK......',
  '...KKK.KKK......',
  '...KK...KK......',
  '..vKK...KKv.....',
  '..vv.....vv.....',
  '..vv.....vv.....',
  '.vvv.....vvv....',
  '................',
]);

def('skeleton1', [
  '.....eeee.......',
  '....eeeeee......',
  '....ekeeke......',
  '....eeeeee......',
  '.....e.e.e......',
  '.....eeee.......',
  '....EeeeeE......',
  '...eEeeeeEe.....',
  '...e.eeee.e.....',
  '...e.EeeE.e.....',
  '...e.eeee.e.....',
  '.....EeeE.......',
  '.....e..e.......',
  '.....e..e.......',
  '....Ee..eE......',
  '....e....e......',
  '....e....e......',
  '...ee....ee.....',
]);

def('skeleton2', [
  '.....eeee.......',
  '....eeeeee......',
  '....ekeeke......',
  '....eeeeee......',
  '.....e.e.e......',
  '.....eeee.......',
  '....EeeeeE......',
  '...eEeeeeEe.....',
  '...e.eeee.e.....',
  '...e.EeeE.e.....',
  '.....eeee.......',
  '.....EeeE.......',
  '....ee..ee......',
  '...ee....ee.....',
  '...e......e.....',
  '..ee......ee....',
  '................',
  '................',
]);

def('bat1', [
  'PP............PP',
  'PpP..........PpP',
  'PppP.PPPP...PppP',
  '.PppPppppP.PppP.',
  '..PpppppppPppP..',
  '...Pprpprpppp...',
  '....pppppppp....',
  '.....pkppkp.....',
  '......pppp......',
  '................',
]);

def('bat2', [
  '................',
  '................',
  '.....PPPP.......',
  '....PppppP......',
  '.PPPpppppppPPP..',
  'PpppprpprpppppP.',
  '.PPpppppppppPP..',
  '...Ppkppkpp.....',
  '....Ppppp.......',
  '.....PPP........',
]);

def('ghost', [
  '.....wwww.......',
  '...wwwwwwww.....',
  '..wwwwwwwwww....',
  '..wwkwwwwkww....',
  '..wwwwwwwwww....',
  '.wwwwwkkwwwww...',
  '.wwwwwwwwwwww...',
  '.wwwwwwwwwwww...',
  '.wwwwwwwwwwww...',
  '..wwwwwwwwww....',
  '..w.wwww.www....',
  '.....ww...w.....',
]);

def('wolf1', [
  '......................A.',
  'AA...................AA.',
  'AAA......AAAAAAA....AA..',
  '.AAAAAAAAAAAAAAAAAAAA...',
  'kAAAAAAAAAAAAAAAAAAA....',
  '.AaAAAAAAAAAAAAAAAA.....',
  '..AaaAAAAAAAAAAAAA......',
  '..AA..AAA....AAA........',
  '..AA...AA.....AA........',
  '.AA....AA......AA.......',
]);

def('wolf2', [
  '.....................A..',
  'AA..................AA..',
  'AAA......AAAAAAA...AA...',
  '.AAAAAAAAAAAAAAAAAAA....',
  'kAAAAAAAAAAAAAAAAAA.....',
  '.AaAAAAAAAAAAAAAAAA.....',
  '..AaaAAAAAAAAAAAAAA.....',
  '...AAAA........AAAA.....',
  '....AAA.........AAA.....',
  '....AA...........AA.....',
]);

def('merman', [
  '.....gggg.......',
  '....gggggg......',
  '....gkggkg......',
  '....gggggg......',
  '....Gggggc......',
  '....GGGGGG......',
  '...cGGGGGGc.....',
  '..ccGGGGGGcc....',
  '..c.GGGGGG.c....',
  '....GGGGGG......',
  '....GGGGGG......',
  '....GGGGGG......',
  '...GGG.GGG......',
  '...GG...GG......',
  '..cGG...GGc.....',
  '..cc.....cc.....',
]);

def('mudman1', [
  '......mmm.......',
  '....mmmmmm......',
  '...mmmmmmmm.....',
  '...mkmmmmkm.....',
  '...mmmmmmmm.....',
  '..mmmmmmmmmm....',
  '..mMmmmmmmMm....',
  '.mmmmmmmmmmmm...',
  '.mMmmmmmmmmMm...',
  'mmmmmmmmmmmmmm..',
  'mMmmmMmmmMmmMm..',
  'mmmmmmmmmmmmmm..',
]);

def('mudman2', [
  '................',
  '......mmm.......',
  '....mmmmmm......',
  '...mkmmmmkm.....',
  '...mmmmmmmm.....',
  '..mmmmmmmmmm....',
  '..mMmmmmmmMm....',
  '.mmmmmmmmmmmm...',
  '.mMmmmmmmmmMm...',
  'mmmmmmmmmmmmmm..',
  'mMmmMmmmMmmmMm..',
  'mmmmmmmmmmmmmm..',
]);

def('spider', [
  '..K.......K...',
  '..K..KKK..K...',
  '.K..KKKKK..K..',
  '.K.KKrKrKK.K..',
  'KK.KKKKKKK.KK.',
  'K..KKKKKKK..K.',
  'K...KKKKK...K.',
  '.....KKK......',
  '....K...K.....',
  '...K.....K....',
]);

def('crow1', [
  '.........kk.',
  '........kkkk',
  '.kk....kkWk.',
  '.kkk..kkkk..',
  '..kkkkkkkko.',
  '...kkkkkk...',
  '....kkkk....',
  '...kk..k....',
  '...k....k...',
]);

def('crow2', [
  '.........kk.',
  '........kkkk',
  '.......kkWk.',
  '..kkkkkkkk..',
  '.kkkkkkkkko.',
  'kkkkkkkkk...',
  '....kkkk....',
  '...kk..k....',
  '...k....k...',
]);

def('fireskull1', [
  '..fF...F....',
  '.FfF..fF.F..',
  '.FffFFffFF..',
  '..FeeeeF....',
  '.FeeeeeeF...',
  '.eekeeke....',
  '.eeeeeee....',
  '..eekkee....',
  '..ee.eee....',
  '...eee......',
]);

def('fireskull2', [
  '...F..fF....',
  '.F.fF.Ff.F..',
  '.FFffFfFFF..',
  '..FeeeeF....',
  '.FeeeeeeF...',
  '.eekeeke....',
  '.eeeeeee....',
  '..eekkee....',
  '..ee.eee....',
  '...eee......',
]);

def('knight1', [
  '.....rr.........',
  '....Arr.........',
  '....AAAAA.......',
  '...AAAAAAA......',
  '...AkAAAkA......',
  '...AAAAAAA......',
  '....AAAAA.......',
  '...aAAAAAa......',
  '..aAAAAAAAa.....',
  '..aAAAAAAAa.....',
  '..a.AAAAA.a.....',
  '..a.AAAAA.a.....',
  '..aaAAAAAaa.....',
  '....AAAAA.......',
  '....AA.AA.......',
  '....AA.AA.......',
  '....AA.AA.......',
  '...aAA.AAa......',
  '...aa...aa......',
  '..aaa...aaa.....',
]);

def('knight2', [
  '.....rr.........',
  '....Arr.........',
  '....AAAAA.......',
  '...AAAAAAA......',
  '...AkAAAkA......',
  '...AAAAAAA......',
  '....AAAAA.......',
  '...aAAAAAa......',
  '..aAAAAAAAa.....',
  '..aAAAAAAAa.....',
  '..a.AAAAA.a.....',
  '..a.AAAAA.a.....',
  '..aaAAAAAaa.....',
  '....AAAAA.......',
  '...AAA.AAA......',
  '...AA...AA......',
  '...AA...AA......',
  '..aAA...AAa.....',
  '..aa.....aa.....',
  '.aaa.....aaa....',
]);

def('mummy1', [
  '.....eeee.......',
  '....eeeeee......',
  '....eEkEee......',
  '....eeeeee......',
  '....eEeeEe......',
  '....eeeeee......',
  '...eeEeeeEe.....',
  '...eeeeeeee.....',
  '...eEeeeEee.....',
  '...e.eeee.e.....',
  '...e.EeeE.e.....',
  '.....eeee.......',
  '.....eEeE.......',
  '....ee..ee......',
  '....eE..Ee......',
  '....ee..ee......',
  '...Eee..eeE.....',
  '................',
]);

def('mummy2', [
  '.....eeee.......',
  '....eeeeee......',
  '....eEkEee......',
  '....eeeeee......',
  '....eEeeEe......',
  '....eeeeee......',
  '...eeEeeeEe.....',
  '...eeeeeeee.....',
  '...eEeeeEee.....',
  '...e.eeee.e.....',
  '...e.EeeE.e.....',
  '.....eeee.......',
  '.....eEeE.......',
  '....eee.ee......',
  '...eeE...Ee.....',
  '...ee.....ee....',
  '..Eee.....eeE...',
  '................',
]);

// ============================== BOSSES ==============================

def('batlord1', [
  'PP............................PP',
  'PpP..........................PpP',
  'PppP........................PppP',
  'PpppP..........PP.........PpppP.',
  '.PppppP......PPppPP......PpppP..',
  '..PpppppPP..PppppppP..PPppppP...',
  '...PppppppPPppppppppPPppppppP...',
  '....PpppppppprppprpppppppppP....',
  '.....PppppppprppprppppppppP.....',
  '......Pppppppppppppppppp P......',
  '.......PpppFppppppFppppP........',
  '........PppppkkkkpppppP.........',
  '.........PpppppppppppP..........',
  '..........PppkppkpppP...........',
  '...........Ppppppp P............',
  '............Ppppp...............',
  '.............PPP................',
  '................................',
]);

def('batlord2', [
  '................................',
  '................................',
  '................................',
  '...............PP...............',
  '.............PPppPP.............',
  '....PPPP....PppppppP....PPPP....',
  '..PPppppPPPPppppppppPPPPppppPP..',
  '.PpppppppppprppprppppppppppppP..',
  'PpppppppppppprppprpppppppppppppP',
  '.PPpppppppppppppppppppppppppPP..',
  '...PPppppFppppppFppppppppPP.....',
  '......PppppkkkkppppppPP.........',
  '.........PpppppppppP............',
  '..........PpkppkppP.............',
  '...........Pppppp...............',
  '............Ppppp...............',
  '.............PPP................',
  '................................',
]);

def('reaper', [
  '........KKKK............',
  '.......KKKKKK...........',
  '......KKkkkkKK..........',
  '......Kkwkkwk K.........',
  '......KkkkkkkK..........',
  '.......KKKKKK...........',
  '.....KKKKKKKKK..........',
  '....KKKKKKKKKKK.........',
  '...KKKKKKKKKKKKK........',
  '...KKK.KKKKK.KKK........',
  '..KKKK.KKKKK.KKKK.......',
  '..KKK..KKKKK..KKK.......',
  '..KKK..KKKKK..KKK.......',
  '.KKKK..KKKKK..KKKK......',
  '.KKK...KKKKK...KKK......',
  '.KKK...KKKKK...KKK......',
  'KKKK...KKKKK...KKKK.....',
  'KKK....KKKKK....KKK.....',
  '.......KKKKK............',
  '......KKKKKKK...........',
  '.....KKK.KKKKK..........',
  '....KK.....KKK..........',
  '...K........K...........',
]);

def('scythe', [
  '..eeeeeeee....',
  '.eeEEEEEeee...',
  'eE........ee..',
  '...........e..',
  '......m.....e.',
  '......m.......',
  '......m.......',
  '......m.......',
  '......m.......',
  '......m.......',
  '......m.......',
  '......m.......',
]);

def('dragonhead', [
  '....eeeeee........',
  '..eeeeeeeeee......',
  '.eeeeeeeeeeee.....',
  'eeeFeeeeeeeeee....',
  'eeeeeeeeeeeeeee...',
  '.eeeeeeEEeeeeeee..',
  '..eeeee..eeeeeeee.',
  '...ee.....eeeeeee.',
  '..e.e.....eeeeee..',
  '...........eeee...',
  '..........eeee....',
  '.........eee......',
]);

def('dragonseg', [
  '...eeee...',
  '..eeeeee..',
  '.eeEeeEee.',
  '.eeeeeeee.',
  '.eeEeeEee.',
  '..eeeeee..',
  '...eeee...',
]);

def('vorlok1', [
  '......kkkkkk........',
  '.....kkkkkkkk.......',
  '.....kwwwwwwk.......',
  '.....kwrwwrwk.......',
  '.....kwwwwwwk.......',
  '......wwkkww........',
  '....kkkkkkkkkk......',
  '...kkkkkkkkkkkk.....',
  '..kkkKkkkkkkKkkk....',
  '..kkkKkrrrrkKkkk....',
  '.kkkkKkrrrrkKkkkk...',
  '.kkkkKkrrrrkKkkkk...',
  '.kkk.KkrrrrkK.kkk...',
  '.kk..KkkkkkkK..kk...',
  '.k...kkkkkkkk...k...',
  '.....kkkkkkkk.......',
  '.....kkkkkkkk.......',
  '.....kkk..kkk.......',
  '.....kk....kk.......',
  '....Kkk....kkK......',
  '....kk......kk......',
  '...kkk......kkk.....',
]);

def('vorlok2', [
  '......kkkkkk........',
  '.....kkkkkkkk.......',
  '.....kwwwwwwk.......',
  '.....kwrwwrwk.......',
  '.....kwwwwwwk.......',
  '......wwkkww........',
  '..k.kkkkkkkkkk.k....',
  '..kkkkkkkkkkkkkk....',
  '.kkkkKkkkkkkKkkkk...',
  '.kwkkKkrrrrkKkkwk...',
  'kkwkkKkrrrrkKkkwkk..',
  'kkwkkKkrrrrkKkkwkk..',
  'kkw.kKkrrrrkKk.wkk..',
  'kk...KkkkkkkK...kk..',
  'k....kkkkkkkk....k..',
  '.....kkkkkkkk.......',
  '.....kkkkkkkk.......',
  '.....kkk..kkk.......',
  '.....kk....kk.......',
  '....Kkk....kkK......',
  '....kk......kk......',
  '...kkk......kkk.....',
]);

def('demon1', [
  'PP............................PP',
  'PpP..........................PpP',
  'PppPP......................PPppP',
  '.PpppPP..........PP......PPpppP.',
  '..PppppPPP....PPPppPP.PPPppppP..',
  '...PppppppPPPPpppppppPpppppP....',
  '....PpppppppppFppFppppppppP.....',
  '.....PpppppppprppfpppppppP......',
  '......PppppppppppppppppP........',
  '.......PpppFFFFFFFFpppP.........',
  '......PppppFwwwwwwFppppP........',
  '......PpppppFFFFFFpppppP........',
  '.....Pppp.ppppppppp.pppP........',
  '.....Ppp..pppppppp...ppP........',
  '.....Pp...ppp..ppp....pP........',
  '..........pp....pp..............',
  '.........Ppp....ppP.............',
  '.........pp......pp.............',
  '........ppp......ppp............',
]);

def('demon2', [
  '................................',
  '.....PP..................PP.....',
  '....PppPP..............PPppP....',
  '....PppppPP....PP....PPpppppP...',
  '...PppppppPPPPPppPPPPpppppppP...',
  '...PpppppppppppppppppppppppP....',
  '....PpppppppppFppFpppppppP......',
  '.....PpppppppprppfppppppP.......',
  '......PppppppppppppppppP........',
  '.......PpppFFFFFFFFpppP.........',
  '......PppppFwwwwwwFppppP........',
  '......PpppppFFFFFFpppppP........',
  '.....Pppp.ppppppppp.pppP........',
  '.....Ppp..pppppppp...ppP........',
  '.....Pp...ppp..ppp....pP........',
  '..........pp....pp..............',
  '.........Ppp....ppP.............',
  '.........pp......pp.............',
  '........ppp......ppp............',
]);

// ============================== NPCS ==============================

def('villager_m', [
  '.....hhhh.......',
  '....hhhhhh......',
  '....ssssss......',
  '....sksssk......',
  '....ssssss......',
  '.....ssss.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..sbbbbbbbbs....',
  '..sbbbbbbbbs....',
  '....bbbbbb......',
  '....bbbbbb......',
  '....MMMMMM......',
  '....MM..MM......',
  '....MM..MM......',
  '....MM..MM......',
  '...mMM..MMm.....',
  '...mm....mm.....',
]);

def('villager_f', [
  '.....YYYY.......',
  '....YhhhhY......',
  '....hssssh......',
  '....hsksskh.....',
  '....hssssh......',
  '.....ssss.......',
  '....gggggg......',
  '...gggggggg.....',
  '..sgggggggg s...',
  '..sggggggggs....',
  '...gggggggg.....',
  '...gggggggg.....',
  '..gggggggggg....',
  '..gggggggggg....',
  '.gggggggggggg...',
  '.gggggggggggg...',
  '....mm..mm......',
  '................',
]);

def('child', [
  '.....hhhh.......',
  '....hhhhhh......',
  '....ssssss......',
  '....sksssk......',
  '....ssssss......',
  '....oooooo......',
  '...soooooos.....',
  '...soooooos.....',
  '....oooooo......',
  '....MM.MM.......',
  '....MM.MM.......',
  '...mMM.MMm......',
]);

def('priest', [
  '.....AAAA.......',
  '....AAAAAA......',
  '....ssssss......',
  '....sksssk......',
  '....ssssss......',
  '.....ssss.......',
  '....WWWWWW......',
  '...WWWyyWWW.....',
  '..sWWWyyWWWs....',
  '..sWWWyyWWWs....',
  '..s.WWyyWW.s....',
  '....WWWWWW......',
  '....WWWWWW......',
  '....WWWWWW......',
  '....WWWWWW......',
  '...WWWWWWWW.....',
  '...WWWWWWWW.....',
  '....mm..mm......',
]);

def('smith', [
  '................',
  '.....kkkk.......',
  '....ssssss......',
  '....sksssk......',
  '....sshhss......',
  '.....hhhh.......',
  '....OOOOOO......',
  '...OOOOOOOO.....',
  '..sOOOOOOOOs....',
  '.ssOOOOOOOOss...',
  '.S.OMMMMMMO.S...',
  '...OMMMMMMO.....',
  '....MMMMMM......',
  '....MM..MM......',
  '....MM..MM......',
  '...mMM..MMm.....',
  '...mm....mm.....',
  '................',
]);

def('merchant', [
  '.....PPPP.......',
  '....PPPPPP......',
  '...PPssssPP.....',
  '...PPsksskPP....',
  '...PPssssPP.....',
  '....PPPPPP......',
  '...PPPPPPPP.....',
  '..sPPPPPPPPs....',
  '..sPPPPPPPPs....',
  '..s.PPPPPP.s....',
  '....PPPPPP......',
  '....PPPPPP......',
  '....PPPPPP......',
  '...PPPPPPPP.....',
  '...PPPPPPPP.....',
  '....mm..mm......',
  '................',
  '................',
]);

def('hermit', [
  '.....AAAA.......',
  '....AAAAAA......',
  '....ssssss......',
  '....sksssk......',
  '....ssAAss......',
  '....AAAAAA......',
  '....MMMMMM......',
  '...MMMMMMMM.....',
  '..sMMMMMMMMs....',
  '..sMMMMMMMMs....',
  '..s.MMMMMM.s....',
  '....MMMMMM......',
  '....MMMMMM......',
  '....MMMMMM......',
  '...MMMMMMMM.....',
  '....mm..mm......',
  '................',
  '................',
]);

def('shade', [
  '.....nnnn.......',
  '....nnnnnn......',
  '....nwnnwn......',
  '....nnnnnn......',
  '.....nnnn.......',
  '....nnnnnn......',
  '...nnnnnnnn.....',
  '..nnnnnnnnnn....',
  '..nnnnnnnnnn....',
  '..n.nnnnnn.n....',
  '....nnnnnn......',
  '....nnnnnn......',
  '....nnnnnn......',
  '...nnnnnnnn.....',
  '....nn..nn......',
  '................',
]);

def('elder', [
  '.....WWWW.......',
  '....WWWWWW......',
  '....ssssss......',
  '....sksssk......',
  '....ssWWss......',
  '....WWWWWW......',
  '....PPPPPP......',
  '...PPPPPPPP.....',
  '..sPPPPPPPPs....',
  '..sPPPPPPPPsm...',
  '..s.PPPPPP.sm...',
  '....PPPPPP..m...',
  '....PPPPPP..m...',
  '....PPPPPP..m...',
  '...PPPPPPPP.m...',
  '....mm..mm......',
  '................',
  '................',
]);

// ============================== ITEMS & FX ==============================

def('heart_s', [
  '.rr.rr..',
  'rrrrrrr.',
  'rrrrrrr.',
  '.rrrrr..',
  '..rrr...',
  '...r....',
]);

def('heart_b', [
  '..rrr..rrr..',
  '.rrrrrrrrrr.',
  'rrrrWrrrrrrr',
  'rrrrrrrrrrrr',
  '.rrrrrrrrrr.',
  '..rrrrrrrr..',
  '...rrrrrr...',
  '....rrrr....',
  '.....rr.....',
]);

def('tonic', [
  '...ee...',
  '...ee...',
  '..eeee..',
  '.exxxxe.',
  '.exxxxe.',
  '.exxxxe.',
  '..eeee..',
]);

def('laurel_i', [
  '.gg..gg.',
  'g.vggv.g',
  'g.vggv.g',
  'g.vggv.g',
  '.gv..vg.',
  '..gggg..',
]);

def('stake_i', [
  '.mm.....',
  '.mmm....',
  '..mmm...',
  '...mmm..',
  '....mm..',
  '.....m..',
]);

def('relic_fang', [
  '.ee.....ee.',
  '.eee...eee.',
  '..eee.eee..',
  '..Eee.eeE..',
  '...ee.ee...',
  '...eE.Ee...',
  '....e.e....',
]);

def('relic_eye', [
  '..pppppp..',
  '.ppwwwwpp.',
  'ppwwkkwwpp',
  'ppwwkkwwpp',
  '.ppwwwwpp.',
  '..pppppp..',
]);

def('relic_chalice', [
  '.yyyyyyyy.',
  '.yYrrrrYy.',
  '..yYrrYy..',
  '...yyyy...',
  '....yy....',
  '...yyyy...',
  '..yyyyyy..',
]);

def('orb', [
  '....pppp....',
  '..pppwwppp..',
  '.ppwwwwwwpp.',
  '.ppwwwwwwpp.',
  'ppwwwwwwwwpp',
  'ppwwwwwwwwpp',
  '.ppwwwwwwpp.',
  '.ppwwwwwwpp.',
  '..pppwwppp..',
  '....pppp....',
]);

def('dagger_i', [
  'mm.eeeeeee',
  'mmeeeeeeeE',
  'mm.eeeeeee',
]);

def('axe_i', [
  '..eeee....',
  '.eeeeee...',
  'eeee.mm...',
  'eeee.mm...',
  '.eee.mm...',
  '..e..mm...',
  '.....mm...',
  '.....mm...',
]);

def('holy_i', [
  '...cc...',
  '...cc...',
  '..cccc..',
  '.cWWWWc.',
  '.cWWWWc.',
  '.cWWWWc.',
  '..cccc..',
]);

def('cross_i', [
  '...yy...',
  '...yy...',
  '.yyyyyy.',
  '.yyyyyy.',
  '...yy...',
  '...yy...',
  '...yy...',
]);

def('bone', [
  'e..e....',
  '.ee.....',
  '.ee.....',
  'e..e....',
]);

def('sickle', [
  '..eeee..',
  '.ee..ee.',
  'ee....ee',
  'e......e',
  'ee......',
  '.ee.....',
]);

def('spear', [
  '.........ee.',
  'mmmmmmmmmeee',
  '.........ee.',
]);

// ============================== TILES & BACKGROUNDS ==============================

const T = 16;

function lerpC(c1, c2, t) {
  const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const a = p(c1), b = p(c2);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

// Deterministic hash for scenery placement.
function hash(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const THEME_SOLID = {
  town: ['#6a6a78', '#55555f', '#7d7d8c'],
  forest: ['#6a4a28', '#4a3218', '#7d5a34'],
  grave: ['#5a5a64', '#44444c', '#6a6a76'],
  marsh: ['#4a5230', '#343a20', '#5a6440'],
  bridge: ['#8a6a3a', '#66491f', '#9c7c48'],
  cliff: ['#70605a', '#544842', '#82726a'],
  manor: ['#7a5a48', '#5a4032', '#8c6a56'],
  manor2: ['#586078', '#404658', '#68708c'],
  manor3: ['#7a4a4a', '#583232', '#8c5a5a'],
  castle: ['#4a4258', '#332e40', '#5a5069'],
};

export function drawTile(ctx, ch, theme, px, py, t, above) {
  const pal = THEME_SOLID[theme] || THEME_SOLID.town;
  switch (ch) {
    case '#': {
      ctx.fillStyle = pal[0];
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = pal[1];
      // brick joints
      ctx.fillRect(px, py + 7, T, 1);
      ctx.fillRect(px, py + 15, T, 1);
      ctx.fillRect(px + 4, py, 1, 7);
      ctx.fillRect(px + 11, py + 8, 1, 7);
      ctx.fillStyle = pal[2];
      ctx.fillRect(px, py, T, 1);
      // grass / moss cap outdoors when open above
      if (above === '.' || above === 't' || above === undefined) {
        if (theme === 'forest' || theme === 'marsh') {
          ctx.fillStyle = theme === 'marsh' ? '#5a7a38' : '#3f8438';
          ctx.fillRect(px, py, T, 3);
        } else if (theme === 'grave') {
          ctx.fillStyle = '#4a6a48';
          ctx.fillRect(px, py, T, 2);
        }
      }
      break;
    }
    case '%': {
      ctx.fillStyle = pal[1];
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = pal[0];
      ctx.fillRect(px + 1, py + 1, 6, 6);
      ctx.fillRect(px + 9, py + 9, 6, 6);
      break;
    }
    case '*': {
      ctx.fillStyle = '#9a6a3a';
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#6a4218';
      ctx.fillRect(px, py + 7, T, 1);
      ctx.fillRect(px + 7, py, 1, T);
      ctx.fillStyle = '#c89058';
      ctx.fillRect(px + 2, py + 2, 3, 1);
      ctx.fillRect(px + 10, py + 10, 3, 1);
      break;
    }
    case '=': {
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(px, py, T, 5);
      ctx.fillStyle = '#66491f';
      ctx.fillRect(px, py + 4, T, 1);
      ctx.fillRect(px + 7, py, 1, 4);
      break;
    }
    case 'H': {
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(px + 2, py, 2, T);
      ctx.fillRect(px + 12, py, 2, T);
      ctx.fillRect(px + 2, py + 3, 12, 2);
      ctx.fillRect(px + 2, py + 11, 12, 2);
      break;
    }
    case '~': {
      const w = Math.sin(t / 20 + px / 13) * 1.5;
      ctx.fillStyle = theme === 'marsh' ? 'rgba(70,100,50,0.85)' : 'rgba(40,80,160,0.8)';
      ctx.fillRect(px, py + 3 + w, T, T - 3 - w);
      ctx.fillStyle = theme === 'marsh' ? '#8aa858' : '#78a8e8';
      ctx.fillRect(px, py + 3 + w, T, 1);
      break;
    }
    case 'W': {
      const w = Math.sin(t / 16 + px / 17) * 1.5;
      ctx.fillStyle = '#101838';
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = '#28407a';
      ctx.fillRect(px, py + 2 + w, T, 2);
      break;
    }
    case '^': {
      ctx.fillStyle = '#b8b8c8';
      for (let i = 0; i < 4; i++) {
        const bx = px + i * 4;
        ctx.beginPath();
        ctx.moveTo(bx, py + T);
        ctx.lineTo(bx + 2, py + 4);
        ctx.lineTo(bx + 4, py + T);
        ctx.fill();
      }
      ctx.fillStyle = '#6a6a78';
      ctx.fillRect(px, py + 14, T, 2);
      break;
    }
    case 't': {
      // floating candle, animated flame
      ctx.fillStyle = '#e8e0c8';
      ctx.fillRect(px + 6, py + 6, 4, 9);
      ctx.fillStyle = '#a09878';
      ctx.fillRect(px + 6, py + 14, 4, 1);
      const fl = Math.floor(t / 8) % 2;
      ctx.fillStyle = '#f8b800';
      ctx.fillRect(px + 6, py + 2 + fl, 4, 4);
      ctx.fillStyle = '#e85818';
      ctx.fillRect(px + 7, py + 3 + fl, 2, 2);
      break;
    }
    case 'g': {
      ctx.fillStyle = '#8a8a99';
      ctx.fillRect(px + 3, py + 4, 10, 12);
      ctx.fillRect(px + 5, py + 2, 6, 3);
      ctx.fillStyle = '#5a5a68';
      ctx.fillRect(px + 5, py + 7, 6, 1);
      ctx.fillRect(px + 5, py + 10, 6, 1);
      break;
    }
    case 'f': {
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(px + 2, py + 4, 2, 12);
      ctx.fillRect(px + 12, py + 4, 2, 12);
      ctx.fillRect(px, py + 6, T, 2);
      ctx.fillRect(px, py + 11, T, 2);
      break;
    }
    case 'c': {
      ctx.fillStyle = pal[2];
      ctx.fillRect(px + 3, py, 10, T);
      ctx.fillStyle = pal[1];
      ctx.fillRect(px + 3, py, 1, T);
      ctx.fillRect(px + 12, py, 1, T);
      ctx.fillRect(px + 5, py + 4, 6, 1);
      ctx.fillRect(px + 5, py + 11, 6, 1);
      break;
    }
    case 'w': {
      ctx.fillStyle = '#181828';
      ctx.fillRect(px + 3, py + 2, 10, 13);
      ctx.fillStyle = '#f8d048';
      ctx.fillRect(px + 5, py + 4, 3, 4);
      ctx.fillRect(px + 9, py + 4, 2, 4);
      ctx.fillStyle = pal[2];
      ctx.fillRect(px + 3, py + 2, 10, 1);
      break;
    }
    case '|': {
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(px + 6, py, 4, T);
      break;
    }
  }
}

const SKY = {
  day: ['#78a8e0', '#b8d0e8'],
  dusk: ['#584878', '#d87848'],
  night: ['#0a0e22', '#1a2244'],
};

// phase: 0 day, 1 night; blend handles dusk.
export function drawBG(ctx, theme, camX, camY, t, nightBlend, W, H) {
  const indoor = theme === 'manor' || theme === 'manor2' || theme === 'manor3' || theme === 'castle';
  if (indoor) {
    const base = { manor: '#241a14', manor2: '#161a26', manor3: '#241416', castle: '#16121e' }[theme];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    // faint arches
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    const off = -(camX * 0.5) % 96;
    for (let x = off - 96; x < W + 96; x += 96) {
      ctx.fillRect(x + 20, 30 - camY * 0.3, 56, 150);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const off2 = -(camX * 0.5) % 96;
    for (let x = off2 - 96; x < W + 96; x += 96) {
      ctx.fillRect(x + 24, 36 - camY * 0.3, 48, 140);
    }
    return;
  }

  // sky
  const top = lerpC(SKY.day[0], SKY.night[0], nightBlend);
  const bot = lerpC(SKY.day[1], SKY.night[1], nightBlend);
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bot);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // stars
  if (nightBlend > 0.4) {
    ctx.fillStyle = `rgba(255,255,240,${(nightBlend - 0.4) * 1.2})`;
    for (let i = 0; i < 40; i++) {
      const sx = (hash(i) * 900 - camX * 0.05) % W;
      const sy = hash(i + 77) * H * 0.55;
      ctx.fillRect((sx + W) % W, sy, 1, 1);
    }
  }

  // sun / moon
  const cx = W - 60, cy = 36;
  if (nightBlend < 0.5) {
    ctx.fillStyle = `rgba(248,216,72,${1 - nightBlend * 2})`;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = `rgba(228,228,248,${(nightBlend - 0.5) * 2})`;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 8, 0, 7); ctx.fill();
  }

  // far layer: mountains + castle silhouette
  const farCol = lerpC('#5878a8', '#101630', nightBlend);
  ctx.fillStyle = farCol;
  const fOff = camX * 0.15;
  for (let i = -1; i < W / 60 + 2; i++) {
    const gx = Math.floor((fOff) / 60) + i;
    const x = gx * 60 - fOff;
    const hh = 30 + hash(gx * 3) * 45;
    ctx.beginPath();
    ctx.moveTo(x - 40, H);
    ctx.lineTo(x, H - hh - 40);
    ctx.lineTo(x + 40, H);
    ctx.fill();
  }
  // distant castle (always looming on the horizon)
  const castX = W * 0.72 - camX * 0.08;
  const cxm = ((castX % (W * 2.5)) + W * 2.5) % (W * 2.5) - W * 0.5;
  ctx.fillStyle = farCol;
  ctx.fillRect(cxm, H - 118, 44, 60);
  ctx.fillRect(cxm - 8, H - 128, 12, 70);
  ctx.fillRect(cxm + 40, H - 128, 12, 70);
  ctx.beginPath(); ctx.moveTo(cxm - 8, H - 128); ctx.lineTo(cxm - 2, H - 142); ctx.lineTo(cxm + 4, H - 128); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cxm + 40, H - 128); ctx.lineTo(cxm + 46, H - 142); ctx.lineTo(cxm + 52, H - 128); ctx.fill();

  // near layer per theme
  const nearCol = lerpC(
    { town: '#4a5a70', forest: '#2a4a30', grave: '#3a4250', marsh: '#3a4a30', bridge: '#2a3a55', cliff: '#4a4248' }[theme] || '#3a4250',
    '#0c1020', nightBlend * 0.85);
  ctx.fillStyle = nearCol;
  const nOff = camX * 0.4;
  if (theme === 'forest' || theme === 'marsh') {
    for (let i = -1; i < W / 34 + 2; i++) {
      const gx = Math.floor(nOff / 34) + i;
      const x = gx * 34 - nOff;
      const th = 50 + hash(gx * 7) * 40;
      ctx.fillRect(x + 14, H - th + 26, 6, th);
      ctx.beginPath(); ctx.arc(x + 17, H - th + 22, 16 + hash(gx) * 7, 0, 7); ctx.fill();
    }
  } else if (theme === 'grave') {
    for (let i = -1; i < W / 46 + 2; i++) {
      const gx = Math.floor(nOff / 46) + i;
      const x = gx * 46 - nOff;
      if (hash(gx * 13) > 0.4) {
        ctx.fillRect(x + 10, H - 52, 12, 30);
        ctx.fillRect(x + 13, H - 56, 6, 6);
      } else {
        ctx.fillRect(x + 8, H - 66, 4, 44);
        ctx.fillRect(x + 2, H - 58, 16, 4);
      }
    }
  } else if (theme === 'town') {
    for (let i = -1; i < W / 70 + 2; i++) {
      const gx = Math.floor(nOff / 70) + i;
      const x = gx * 70 - nOff;
      const hh = 34 + hash(gx * 5) * 26;
      ctx.fillRect(x + 6, H - hh - 8, 48, hh);
      ctx.beginPath();
      ctx.moveTo(x, H - hh - 8); ctx.lineTo(x + 30, H - hh - 26); ctx.lineTo(x + 60, H - hh - 8);
      ctx.fill();
    }
  } else if (theme === 'cliff') {
    for (let i = -1; i < W / 52 + 2; i++) {
      const gx = Math.floor(nOff / 52) + i;
      const x = gx * 52 - nOff;
      const hh = 60 + hash(gx * 11) * 60;
      ctx.fillRect(x, H - hh, 52, hh);
    }
  } else if (theme === 'bridge') {
    // fog bank over the lake
    ctx.fillStyle = lerpC('#8898b8', '#182038', nightBlend);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = H - 70 + i * 9;
      const dx = (t * (0.2 + i * 0.07) + i * 130) % (W + 200) - 100;
      ctx.beginPath(); ctx.arc(dx, y, 45, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
