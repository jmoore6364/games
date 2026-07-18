// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural tiles and effects. All original art.

// ---- palette ----
const PAL = {
  n: '#3070e8', // ninja blue
  N: '#183898', // ninja dark blue
  s: '#f8b088', // skin
  S: '#c07858', // skin shade
  w: '#e8e8e8', // white
  d: '#101010', // outline
  k: '#583818', // brown
  q: '#a8a8b8', // grey metal
  Q: '#585868', // dark grey
  y: '#f8d838', // yellow
  o: '#e07820', // orange
  f: '#f85818', // fire
  r: '#b02818', // dark red
  x: '#f82818', // bright red
  g: '#40a838', // green
  G: '#1f6018', // dark green
  p: '#c060e0', // purple
  m: '#903090', // dark purple
  c: '#40d8d8', // cyan
  v: '#88f8b0', // pale green
  t: '#c8a878', // tan
  T: '#907048', // tan dark
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

// ======================= PLAYER: Ninja Moore =======================
// Blue-clad shinobi, faces right. 16 wide.

def('p_stand', [
  '.....nnnnn......',
  '....nnnnnnn.....',
  '....nNsswsd.....',
  '....nNsssssd....',
  '....nnnnnn......',
  '.....Nnnn.......',
  '....nnnnnn.q....',
  '...nnnnnnnq.....',
  '...nnNnnnnn.....',
  '...nn.Nnnn......',
  '...ss.Nnnn......',
  '.....NNNNN......',
  '.....nnnnnn.....',
  '.....nNNnnn.....',
  '.....nn..nn.....',
  '.....nn..nn.....',
  '.....nn..nn.....',
  '....Nnn..nnN....',
  '....Nn....nN....',
  '...NNn....nNN...',
]);

def('p_run1', [
  '.....nnnnn......',
  '....nnnnnnn.....',
  '....nNsswsd.....',
  '....nNsssssd....',
  '....nnnnnn......',
  '.....Nnnn.......',
  '....nnnnnnss....',
  '...nnnnnnnn.....',
  '...ssNnnnnn.....',
  '.....Nnnnn......',
  '.....NNNNN......',
  '....nnnNnnn.....',
  '...nnn...nnn....',
  '..nnn.....nnn...',
  '..nn.......nn...',
  '.Nnn.......nnN..',
  '.Nn.........nN..',
  'NNn.........nNN.',
  'NN...........NN.',
  '................',
]);

def('p_run2', [
  '.....nnnnn......',
  '....nnnnnnn.....',
  '....nNsswsd.....',
  '....nNsssssd....',
  '....nnnnnn......',
  '.....Nnnn.......',
  '....nnnnnn......',
  '...nnnnnnnss....',
  '...nnNnnnnn.....',
  '..ss.Nnnnn......',
  '.....NNNNN......',
  '.....nnnnn......',
  '.....nnnnn......',
  '.....nn.nn......',
  '.....nn.nn......',
  '....Nnn.nnN.....',
  '....Nn...nN.....',
  '...NNn...nNN....',
  '...NN.....NN....',
  '................',
]);

// somersault ball (jump)
def('p_jump', [
  '....nnnnnnn.....',
  '...nnnnnnnnn....',
  '..nnNsswsnnnn...',
  '..nnNsssssnnn...',
  '..nnnnnnnnnnn...',
  '..nnNNnnnNNnn...',
  '..nnNnnnnnNnn...',
  '..nnnnNNnnnnn...',
  '..NnnnnnnnnnN...',
  '..NnnNnnnNnnN...',
  '...NnnnnnnnN....',
  '....NNnnnNN.....',
  '.....NNNNN......',
  '................',
]);

// slash: arm thrust forward, blade drawn separately
def('p_slash', [
  '.....nnnnn......',
  '....nnnnnnn.....',
  '....nNsswsd.....',
  '....nNsssssd....',
  '....nnnnnn......',
  '.....Nnnn.......',
  '....nnnnnn......',
  '...nnnnnnnnsss..',
  '...nnNnnnnn.....',
  '...nn.Nnnn......',
  '...ss.Nnnn......',
  '.....NNNNN......',
  '.....nnnnnn.....',
  '.....nNNnnn.....',
  '....nnn..nn.....',
  '...nnn...nnn....',
  '...nn.....nn....',
  '..Nnn.....nnN...',
  '..Nn.......nN...',
  '.NNn.......nNN..',
]);

def('p_crouch', [
  '.....nnnnn......',
  '....nnnnnnn.....',
  '....nNsswsd.....',
  '....nNsssssd....',
  '....nnnnnn......',
  '...nnnnnnnn.....',
  '..nnnNnnnnnss...',
  '..nnn.NNNNN.....',
  '..nnnnnnnnnn....',
  '.NnnnNNnnnnnN...',
  '.NNn.......nNN..',
]);

// wall cling: gripping, knees bent, facing the wall (wall to the right)
def('p_cling', [
  '......nnnnn.s...',
  '.....nnnnnnns...',
  '.....nNsswsdn...',
  '.....nNsssssn...',
  '.....nnnnnn.....',
  '......Nnnnn.....',
  '.....nnnnnns....',
  '....nnnnnnns....',
  '....nnNnnnn.....',
  '....nn.Nnnn.....',
  '......NNNNN.....',
  '.....nnnnnnn....',
  '.....nNNnnnn....',
  '......nn.nnn....',
  '.....nnn.nnN....',
  '....Nnn...nN....',
  '....Nn...nnN....',
  '.....n...NN.....',
]);

def('p_hurt', [
  '......nnnnn.....',
  '.....nnnnnnn....',
  '.....nNsswsd....',
  '.....nNsssssd...',
  '.....nnnnnn.....',
  '..s...Nnnn......',
  '...ssnnnnnn.....',
  '....nnnnnnnss...',
  '....nnNnnnnss...',
  '.....Nnnnn......',
  '.....NNNNN......',
  '....nnnnnnn.....',
  '...nnn.nnnnn....',
  '..nnn....nnn....',
  '..nn......nnn...',
  '.Nnn.......nnN..',
  '.Nn.........nN..',
  '................',
]);

// ======================= ENEMIES =======================

// knife thug — purple jacket street punk
def('e_knife1', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksswsd......',
  '....kssssd......',
  '.....ssss.......',
  '....pppppp......',
  '...pppppppp.....',
  '...ppmppppss.q..',
  '...pp.mpppss.q..',
  '...ss.mppp......',
  '.....mmmmm......',
  '....QQQQQQ......',
  '...QQQ..QQQ.....',
  '...QQ....QQ.....',
  '..dQQ....QQd....',
  '..dQ......Qd....',
]);

def('e_knife2', [
  '.....kkkk.......',
  '....kkkkkk......',
  '....ksswsd......',
  '....kssssd......',
  '.....ssss.......',
  '....pppppp......',
  '...pppppppp.....',
  '...ppmppppssq...',
  '...pp.mpppss....',
  '...ss.mppp......',
  '.....mmmmm......',
  '....QQQQQ.......',
  '....QQ.QQ.......',
  '....QQ.QQ.......',
  '...dQQ.QQd......',
  '...dQ...Qd......',
]);

// club thug — big green bruiser with a club
def('e_club1', [
  '.......gggg...k.',
  '......gggggg..k.',
  '......gsswsd..k.',
  '......gssssd.kk.',
  '.......ssss..kk.',
  '.....gggggggkk..',
  '....ggggggggk...',
  '....ggGggggss...',
  '....gg.Ggggss...',
  '....ss.Gggg.....',
  '......GGGGG.....',
  '.....gggggg.....',
  '.....gGGggg.....',
  '.....gg..gg.....',
  '.....gg..gg.....',
  '....dgg..ggd....',
  '....dg....gd....',
]);

def('e_club2', [
  '.kk....gggg.....',
  '.kk...gggggg....',
  '..kk..gsswsd....',
  '..kkk.gssssd....',
  '...kkk.ssss.....',
  '....kkgggggg....',
  '....gggggggg....',
  '....ggGgggss....',
  '....gg.Gggss....',
  '....ss.Gggg.....',
  '......GGGGG.....',
  '.....gggggg.....',
  '.....gGGggg.....',
  '....ggg..gg.....',
  '...ggg...ggg....',
  '...dgg....ggd...',
  '...dg......gd...',
]);

// dog — lunging hound, 18x12
def('e_dog1', [
  '...............kk.',
  '..............kkk.',
  'k....kkkkkkkkkkkw.',
  'kk..kkkkkkkkkkkkd.',
  '.kkkkkkkkkkkkkkk..',
  '..kkkkkkkkkkkkkk..',
  '..kkkkkkkkkkkk....',
  '..kkk.......kkk...',
  '..kk.........kk...',
  '..kk.........kk...',
  '.dkk.........kkd..',
  '..................',
]);

def('e_dog2', [
  '...............kk.',
  '..............kkk.',
  'k....kkkkkkkkkkkw.',
  'kk..kkkkkkkkkkkkd.',
  '.kkkkkkkkkkkkkkk..',
  '..kkkkkkkkkkkkkk..',
  '..kkkkkkkkkkkk....',
  '...kkk.....kkk....',
  '....kkk...kkk.....',
  '.....kk...kk......',
  '.....dkk.kkd......',
  '..................',
]);

// hawk — wings up / wings down, 18x14. THE menace.
def('e_hawk1', [
  '..T............T..',
  '..TT..........TT..',
  '..TTT........TTT..',
  '..TTTT......TTTT..',
  '..tTTTT....TTTTt..',
  '..ttTTTT..TTTTtt..',
  '...tttTTTTTTttt...',
  '....tttttttttt....',
  '......tttttt.yd...',
  '......tttttttyy...',
  '.......tttttt.....',
  '........tt.tt.....',
  '........yy.yy.....',
  '..................',
]);

def('e_hawk2', [
  '..................',
  '..................',
  '......t....t......',
  '..tttttt..tttttt..',
  '.tTTTTTTTTTTTTTTt.',
  '..TTTTTTTTTTTTTT..',
  '...ttTTTTTTTTtt...',
  '....ttttttttt.....',
  '......tttttt.yd...',
  '......tttttttyy...',
  '.......tttttt.....',
  '........tt.tt.....',
  '........yy.yy.....',
  '..................',
]);

// gunner — kneeling soldier, rifle forward
def('e_gun', [
  '.....GGGG.......',
  '....GGGGGG......',
  '....Gsswsd......',
  '....Gssssd......',
  '.....ssss.......',
  '....GGGGGG......',
  '...GGGGGGGGqqqqq',
  '...GGgGGGGGq....',
  '...GG.gGGss.....',
  '...ss.gGGG......',
  '.....GGGGGG.....',
  '....GGG.GGGG....',
  '...GGG...GGGG...',
  '..dGGG...GGGd...',
]);

// grenadier — arm raised to lob
def('e_gren', [
  '..o..GGGG.......',
  '..ss.GGGGG......',
  '...ssGsswsd.....',
  '....sGssssd.....',
  '.....ssss.......',
  '....GGGGGG......',
  '...GGGGGGGG.....',
  '...GGgGGGGG.....',
  '...GG.gGGGss....',
  '...ss.gGGG......',
  '.....ggggg......',
  '....GGGGGG......',
  '....GG..GG......',
  '....GG..GG......',
  '...dGG..GGd.....',
  '...dG....Gd.....',
]);

// bat — 12x8
def('e_bat1', [
  'm..........m',
  'mm........mm',
  'mmm..mm..mmm',
  '.mmmmmmmmmm.',
  '..mmxmmxmm..',
  '...mmmmmm...',
  '....m..m....',
  '............',
]);

def('e_bat2', [
  '............',
  '............',
  '.....mm.....',
  'mmmmmmmmmmmm',
  'mmmmxmmxmmmm',
  '.m.mmmmmm.m.',
  '....m..m....',
  '............',
]);

// enemy sword ninja — grey and red
def('e_ninja1', [
  '.....qqqqq......',
  '....qqqqqqq.....',
  '....qQsswsd.....',
  '....qQsssssd....',
  '....qqqqqq......',
  '.....xqqq.......',
  '....qqqqqq.q....',
  '...qqqqqqqq.....',
  '...qqQqqqqq.....',
  '...qq.Qqqq......',
  '...ss.Qqqq......',
  '.....xxxxx......',
  '.....qqqqqq.....',
  '.....qQQqqq.....',
  '.....qq..qq.....',
  '.....qq..qq.....',
  '....Qqq..qqQ....',
  '....Qq....qQ....',
  '...QQq....qQQ...',
]);

def('e_ninja2', [
  '....qqqqqqq.....',
  '...qqqqqqqqq....',
  '..qqQsswsqqqq...',
  '..qqQsssssqqq...',
  '..qqqqqqqqqqq...',
  '..qqxxqqqxxqq...',
  '..qqQqqqqqQqq...',
  '..qqqqQQqqqqq...',
  '..QqqqqqqqqqQ...',
  '..QqqQqqqQqqQ...',
  '...QqqqqqqqQ....',
  '....QQqqqQQ.....',
  '.....QQQQQ......',
]);

// ======================= BOSSES =======================

// Act 1 boss BUTCH — massive bruiser, 26x30
def('b_butch', [
  '..........rrrrrr..........',
  '.........rrrrrrrr.........',
  '.........rsswssrr.........',
  '.........rssssssr.........',
  '..........ssssss..........',
  '......rrrrrrrrrrrr.....k..',
  '....rrrrrrrrrrrrrrrr..kk..',
  '...rrrrrrrrrrrrrrrrrr.kk..',
  '...rrrrRrrrrrrRrrrrssskk..',
  '...rrr.rRrrrrRr.rrsss.kk..',
  '...rr..rRrrrrRr..rr...kk..',
  '...ss..rrrrrrrr..ss...kk..',
  '.......rrrrrrrr.......kk..',
  '.......RRRRRRRR.......kk..',
  '......rrrrrrrrrr......kk..',
  '......rrRRrrRRrr..........',
  '......rrr....rrr..........',
  '......rrr....rrr..........',
  '......rrr....rrr..........',
  '.....Rrrr....rrrR.........',
  '.....Rrr......rrR.........',
  '....RRrr......rrRR........',
  '....RR..........RR........',
]);

// Act 4 boss COL. BLISK — armored officer, 20x26
def('b_blisk', [
  '......QQQQQQ........',
  '.....QQQQQQQQ.......',
  '.....Qsswssdq.......',
  '.....Qssssssq.......',
  '......ssssss........',
  '....QQQQQQQQQQ......',
  '...QQqQQQQQQqQQ.....',
  '..QQQqQQQQQQqQQQqqqq',
  '..QQ.qQQxxQQq.QQq...',
  '..QQ.qQQQQQQq.ss....',
  '..ss.qQQQQQQq.......',
  '.....QQQQQQQQ.......',
  '.....QQQxxQQQ.......',
  '.....QQQQQQQQ.......',
  '....QQQQ..QQQQ......',
  '....QQQ....QQQ......',
  '....QQQ....QQQ......',
  '...dQQQ....QQQd.....',
  '...dQQ......QQd.....',
]);

// Act 5 boss MALEK — necromancer in robes, 20x28
def('b_malek', [
  '.......mmmmmm.......',
  '......mmmmmmmm......',
  '......mmvvvvmm......',
  '......mv.vv.vm......',
  '......mvvvvvvm......',
  '.......mmmmmm.......',
  '......mmmmmmmm......',
  '.....mmmmmmmmmm.....',
  '....mmmpmmmmpmmm....',
  '...mmm.pmmmmp.mmm...',
  '...mm..pmmmmp..mm...',
  '...vv..mmmmmm..vv...',
  '.......mmmmmm.......',
  '......mmmmmmmm......',
  '......mmmmmmmm......',
  '.....mmmmmmmmmm.....',
  '.....mmmmmmmmmm.....',
  '....mmmmmmmmmmmm....',
  '....mmmmmmmmmmmm....',
  '...mmmmmmmmmmmmmm...',
  '...mmmmmmmmmmmmmm...',
]);

// Final boss form 1: DEMON GIANT, 30x34
def('b_giant', [
  '....x....................x....',
  '...xx....rrrrrrrrrr......xx...',
  '...xx...rrrrrrrrrrrr.....xx...',
  '..xxx..rrryyrrrryyrrr...xxx...',
  '..xx...rrryyrrrryyrrr....xx...',
  '..xx...rrrrrrrrrrrrr.....xx...',
  '..xx...rrrwwwwwwwrrr.....xx...',
  '...x...rrrrrrrrrrrr......x....',
  '....rrrrrrrrrrrrrrrrrr........',
  '..rrrrrrrrrrrrrrrrrrrrrr......',
  '.rrrrrrRrrrrrrrrrrRrrrrrr.....',
  '.rrrr..rRrrrrrrrrRr..rrrr.....',
  '.rrr...rRrrrrrrrrRr...rrr.....',
  '.rr....rrrrrrrrrrrr....rr.....',
  '.xx....rrrrRRrrrrrr....xx.....',
  '.......rrrrRRrrrrrr...........',
  '.......RRRRRRRRRRRR...........',
  '......rrrrrrrrrrrrrr..........',
  '......rrrRRrrrrRRrrr..........',
  '......rrrr......rrrr..........',
  '......rrrr......rrrr..........',
  '......rrrr......rrrr..........',
  '.....Rrrrr......rrrrR.........',
  '.....Rrrr........rrrR.........',
  '....RRrrr........rrrRR........',
  '....RRRR..........RRRR........',
]);

// Final boss form 2: DETACHED HEAD, 20x18
def('b_head', [
  '..x..............x..',
  '.xx..rrrrrrrrrr..xx.',
  '.xx.rrrrrrrrrrrr.xx.',
  'xxx.rryyrrrryyrr.xxx',
  'xx..rryyrrrryyrr..xx',
  'xx..rrrrrrrrrrrr..xx',
  'x...rrrrrrrrrrrr...x',
  '....rrwwwwwwwwrr....',
  '....rrrrrrrrrrrr....',
  '....rrwwwwwwwwrr....',
  '.....rrrrrrrrrr.....',
  '......rrrrrrrr......',
  '.......rrrrrr.......',
  '........rrrr........',
  '....................',
]);

// Final boss form 3: HEART CORE, 16x18
def('b_heart', [
  '....xxx..xxx....',
  '...xxxxxxxxxx...',
  '..xxrrxxxxrrxx..',
  '..xrrrrxxrrrrx..',
  '..xrrrrrrrrrrx..',
  '..xxrrrrrrrrxx..',
  '...xxrrwwrrxx...',
  '...xxrrwwrrxx...',
  '....xxrrrrxx....',
  '....xxrrrrxx....',
  '.....xxrrxx.....',
  '......xxxx......',
  '.......xx.......',
  '................',
]);

// ======================= ITEMS / PROPS =======================

// lantern (slash to open)
def('lantern', [
  '....yy....',
  '...qqqq...',
  '..rryyrr..',
  '.rryyyyrr.',
  '.ryyyyyyr.',
  '.ryyooyyr.',
  '.rryyyyrr.',
  '..rryyrr..',
  '...qqqq...',
  '....yy....',
]);

def('it_sp', [ // small spirit orb (blue)
  '..cc..',
  '.cccc.',
  'ccwccc',
  'cccccc',
  '.cccc.',
  '..cc..',
]);

def('it_SP', [ // big spirit orb (red)
  '..xx..',
  '.xxxx.',
  'xxwxxx',
  'xxxxxx',
  '.xxxx.',
  '..xx..',
]);

def('it_hp', [ // health flask
  '..ww..',
  '..ww..',
  '.gggg.',
  'gggggg',
  'ggvggg',
  '.gggg.',
]);

def('it_1up', [ // ninja mask token
  '.nnnn.',
  'nnnnnn',
  'nwnnwn',
  'nnnnnn',
  '.nnnn.',
  '..nn..',
]);

def('it_time', [ // hourglass
  'yyyyyy',
  '.wwww.',
  '..ww..',
  '..ww..',
  '.w..w.',
  'yyyyyy',
]);

def('it_star', [ // throwing star pickup
  '..q...',
  '.qqq..',
  'qqwqq.',
  '.qqq..',
  '..q...',
  '......',
]);

def('it_wind', [ // windmill shuriken pickup
  'q...q.',
  '.q.q..',
  '..w...',
  '.q.q..',
  'q...q.',
  '......',
]);

def('it_fire', [ // fire wheel scroll
  '..ff..',
  '.ffff.',
  'ffooff',
  'ffooff',
  '.ffff.',
  '..ff..',
]);

def('it_jump', [ // jump-slash scroll
  '.cccc.',
  'cwwwwc',
  'cwccwc',
  'cwccwc',
  'cwwwwc',
  '.cccc.',
]);

// ======================= PROJECTILES =======================

def('pr_star1', [
  '..q..',
  '.qqq.',
  'qqwqq',
  '.qqq.',
  '..q..',
]);

def('pr_star2', [
  'q...q',
  '.qwq.',
  '..q..',
  '.qwq.',
  'q...q',
]);

def('pr_wind1', [
  'q.....q..',
  '.q...q...',
  '..qwq....',
  '.q...q...',
  'q.....q..',
  '.........',
]);

def('pr_fire', [
  '..ff..',
  '.foof.',
  'fooyof',
  'foyoof',
  '.foof.',
  '..ff..',
]);

def('pr_kunai', [
  '......qq',
  '..qqqqq.',
  'xxqqqqq.',
  '..qqqqq.',
  '......qq',
]);

def('pr_gren', [
  '.gg.',
  'gggg',
  'gGGg',
  '.gg.',
]);

def('pr_feather', [
  't...',
  'tt..',
  '.tt.',
  '..tt',
]);

def('pr_orb', [ // enemy magic orb
  '.pp.',
  'pmmp',
  'pmmp',
  '.pp.',
]);

export function initSprites() {
  for (const [name, rows, pal] of defs) SPR[name] = bake(rows, pal);
}

export function drawSprite(ctx, name, x, y, flip = false, scale = 1) {
  const s = SPR[name];
  if (!s) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) { ctx.scale(-scale, scale); ctx.drawImage(s, -s.width, 0); }
  else if (scale !== 1) { ctx.scale(scale, scale); ctx.drawImage(s, 0, 0); }
  else ctx.drawImage(s, 0, 0);
  ctx.restore();
}

// ======================= THEMES / TILES =======================

export const THEMES = {
  city: {
    name: 'CITY STREETS', music: 'city',
    sky0: '#0a0a20', sky1: '#181038',
    solid: '#585868', solidTop: '#8888a0', solidDark: '#303040',
    plat: '#a06830',
  },
  mountain: {
    name: 'TALON PASS', music: 'mountain',
    sky0: '#201830', sky1: '#403050',
    solid: '#705848', solidTop: '#a08870', solidDark: '#403028',
    plat: '#907048',
  },
  falls: {
    name: 'THOUSAND FALLS', music: 'falls',
    sky0: '#102030', sky1: '#204058',
    solid: '#486878', solidTop: '#78a0b0', solidDark: '#284048',
    plat: '#587888',
  },
  base: {
    name: 'STEEL SERPENT BASE', music: 'base',
    sky0: '#101018', sky1: '#202030',
    solid: '#606878', solidTop: '#98a0b0', solidDark: '#383e48',
    plat: '#788090',
  },
  catacombs: {
    name: 'THE BONEHOUSE', music: 'catacombs',
    sky0: '#100810', sky1: '#201020',
    solid: '#605058', solidTop: '#907880', solidDark: '#302830',
    plat: '#706058',
  },
  fortress: {
    name: 'DEMON FORTRESS', music: 'fortress',
    sky0: '#180808', sky1: '#301010',
    solid: '#684048', solidTop: '#986068', solidDark: '#382028',
    plat: '#805058',
  },
};

// t: 1 solid, 2 platform, 5 spikes
export function drawTile(ctx, t, themeKey, sx, sy, frame, topOpen, interior = false) {
  const th = THEMES[themeKey];
  if (t === 1) {
    if (interior) { // buried deep: flat, quiet
      ctx.fillStyle = th.solidDark;
      ctx.fillRect(sx, sy, 16, 16);
      return;
    }
    ctx.fillStyle = th.solid;
    ctx.fillRect(sx, sy, 16, 16);
    ctx.fillStyle = th.solidDark;
    ctx.fillRect(sx + 1, sy + 9, 6, 6);
    ctx.fillRect(sx + 9, sy + 1, 6, 6);
    if (topOpen) {
      ctx.fillStyle = th.solidTop;
      ctx.fillRect(sx, sy, 16, 3);
    }
  } else if (t === 2) {
    ctx.fillStyle = th.plat;
    ctx.fillRect(sx, sy, 16, 5);
    ctx.fillStyle = th.solidDark;
    ctx.fillRect(sx, sy + 5, 16, 1);
    ctx.fillRect(sx + 2, sy + 1, 2, 3);
    ctx.fillRect(sx + 12, sy + 1, 2, 3);
  } else if (t === 5) {
    ctx.fillStyle = '#c8c8d8';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i * 4, sy + 16);
      ctx.lineTo(sx + i * 4 + 2, sy + 8);
      ctx.lineTo(sx + i * 4 + 4, sy + 16);
      ctx.fill();
    }
  }
}

// slash arc effect in front of the player
export function drawSlashArc(ctx, x, y, face, t, big = false) {
  const p = t / 8;
  ctx.strokeStyle = p < 0.5 ? '#ffffff' : '#a8d8f8';
  ctx.lineWidth = 2;
  const r = big ? 16 : 13;
  ctx.beginPath();
  const a0 = face > 0 ? -1.3 + p * 1.6 : Math.PI + 1.3 - p * 1.6;
  ctx.arc(x, y, r, a0 - 0.7, a0 + 0.7);
  ctx.stroke();
}

export function drawBoom(ctx, x, y, t, big = false) {
  const r = big ? 4 + t * 1.3 : 3 + t * 0.9;
  const cols = ['#ffffff', '#f8d838', '#e07820', '#b02818'];
  ctx.fillStyle = cols[Math.min(3, t >> 2)];
  for (let i = 0; i < (big ? 7 : 5); i++) {
    const a = (i * 2.4 + t * 0.25);
    ctx.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r - 2, 4, 4);
  }
  if (t < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 6, 6); }
}

// fire jet flame column (h px tall, animated)
export function drawFlame(ctx, x, y, h, frame) {
  for (let i = 0; i < h; i += 4) {
    const w = 8 + Math.sin((frame * 0.6 + i) * 0.8) * 3 * (1 - i / h);
    ctx.fillStyle = i % 8 < 4 ? '#f85818' : '#f8d838';
    ctx.fillRect(x + 8 - w / 2, y + h - i - 4, w, 4);
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 6, y + h - 6, 4, 4);
}
