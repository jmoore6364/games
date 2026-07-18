// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural tiles, themes and effects. All original art.

// ---- base palette ----
const PAL = {
  s: '#f8b088', // skin
  S: '#c07858', // skin shade
  w: '#f8f8f8', // white
  k: '#101010', // black
  d: '#282830', // dark outline
  q: '#a8a8b8', // metal grey
  Q: '#585868', // dark metal
  y: '#f8d838', // yellow
  o: '#e07820', // orange
  r: '#f82818', // red
  R: '#901008', // dark red
  g: '#40a838', // green
  G: '#1f6018', // dark green
  c: '#40d8f8', // cyan
  C: '#1878b8', // deep cyan
  b: '#3858c8', // blue
  B: '#182888', // dark blue
  p: '#c060e0', // purple
  m: '#903090', // dark purple
  i: '#c8ecf8', // pale ice
  n: '#68c0e8', // mid ice
};

// Weapon palettes: '1' = light, '2' = dark body colors of the player suit.
export const WPAL = {
  P: { 1: '#00e8d8', 2: '#0070ec' },
  T: { 1: '#f8d838', 2: '#d84018' },
  F: { 1: '#f8f8f8', 2: '#2888d8' },
  G: { 1: '#f8b040', 2: '#606870' },
  V: { 1: '#f8e858', 2: '#9030b0' },
};
export const WCOLOR = { P: '#00e8d8', T: '#f88030', F: '#a8e8f8', G: '#f8b040', V: '#f8e858' };
export const WNAME = { P: 'M.BUSTER', T: 'TORCH WAVE', F: 'FROST SHARD', G: 'GEAR CUTTER', V: 'VOLT SHIELD' };

function bake(rows, pal = PAL) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
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

export const SPR = {};
const defs = [];
function def(name, rows) { defs.push([name, rows]); }

// ======================= PLAYER: Mega Moore =======================
// 16 wide, faces right. '1'/'2' are swapped per weapon palette.

const P_STAND = [
  '....2222222222..',
  '...211111111112.',
  '..21111111111120',
  '..212222222212..',
  '..21ssssssss12..',
  '..21swksskws12..',
  '..21ssssssss12..',
  '...2ssskkss2....',
  '....222222......',
  '...22111122.....',
  '..22111111122...',
  '.2w2111111112w2.',
  '.2w2211111122w2.',
  '..2..211112..2..',
  '.....211112.....',
  '.....211112.....',
  '...222111122....',
  '..2112..2112....',
  '..2112..2112....',
  '.21122..22112...',
  '.2222....2222...',
];
def('p_stand', P_STAND);

function legs(base, legRows) {
  return base.slice(0, 16).concat(legRows);
}
def('p_run1', legs(P_STAND, [
  '...222111122....',
  '..21122211122...',
  '.2112...22112...',
  '2112......2112..',
  '2222......2222..',
]));
def('p_run2', legs(P_STAND, [
  '...22111122.....',
  '....211112......',
  '....211112......',
  '....211122......',
  '....222222......',
]));
def('p_run3', legs(P_STAND, [
  '...222111122....',
  '...2112211122...',
  '..2112..22112...',
  '.2112....2112...',
  '.2222....2222...',
]));
def('p_jump', legs(P_STAND, [
  '...222111122....',
  '..21122.21122...',
  '.2112....2112...',
  '.2112.....2112..',
  '.222.......222..',
]));

def('p_climb1', [
  '.ww...........ww',
  '.22.2222222222.2',
  '.2211111111112.2',
  '..21111111111222',
  '..212222222212..',
  '..211111111112..',
  '..211111111112..',
  '...2111111112...',
  '....222222......',
  '...221111122....',
  '..22111111122...',
  '..22111111122...',
  '...211111112....',
  '.....211112.....',
  '.....211112.....',
  '...222111122....',
  '...2112.2112....',
  '...2112.2112....',
  '...2112.2112....',
  '..21122.22112...',
  '..2222...2222...',
]);
def('p_climb2', [
  '................',
  '.ww.2222222222..',
  '.2221111111112ww',
  '..2111111111122.',
  '..2122222222122.',
  '..211111111112..',
  '..211111111112..',
  '...2111111112...',
  '....222222......',
  '...221111122....',
  '..22111111122...',
  '..22111111122...',
  '...211111112....',
  '.....211112.....',
  '.....211112.....',
  '...222111122....',
  '...2112.2112....',
  '...2112.2112....',
  '...2112.2112....',
  '..21122.22112...',
  '..2222...2222...',
]);

def('p_slide', [
  '...........22222222.',
  '..........2111111112',
  '..........2122222212',
  '..........21ssssss12',
  '..2222222221swkss12.',
  '.221111111111ssss2..',
  '.2211111111111122...',
  '..221111111111122...',
  '..22211111111222....',
  '..222..2222222......',
]);

def('p_hurt', [
  '....2222222222..',
  '...211111111112.',
  '..211111111112..',
  '..212222222212..',
  '..21ssssssss12..',
  '..21skssssks12..',
  '..21ssssssss12..',
  '...2sskkkss2....',
  'w...222222...w..',
  '2w.221111122w2..',
  '.222111111122...',
  '..211111111112..',
  '..221111111122..',
  '.....211112.....',
  '....2111112.....',
  '...221111122....',
  '..2112..21122...',
  '.2112....2112...',
  '2112......2112..',
  '2222......2222..',
  '................',
]);

// ======================= MINOR ENEMIES =======================

def('e_walker1', [
  '....qqqqqq....',
  '..qqQQQQQQqq..',
  '.qQQrrQQrrQQq.',
  '.qQQrwQQrwQQq.',
  '.qQQQQQQQQQQq.',
  '..qQQQQQQQQq..',
  '...qqqqqqqq...',
  '..kk......kk..',
  '.kk........kk.',
]);
def('e_walker2', [
  '....qqqqqq....',
  '..qqQQQQQQqq..',
  '.qQQrrQQrrQQq.',
  '.qQQrwQQrwQQq.',
  '.qQQQQQQQQQQq.',
  '..qQQQQQQQQq..',
  '...qqqqqqqq...',
  '....kk..kk....',
  '....kk..kk....',
]);

def('e_hopper', [
  '...gg....gg...',
  '..gGGg..gGGg..',
  '..gGwGggGwGg..',
  '..gGGGGGGGGg..',
  '...gGGGGGGg...',
  '..ggGGGGGGgg..',
  '.g..gg..gg..g.',
  '.g..g....g..g.',
  '.gg.g....g.gg.',
]);

def('e_flyer1', [
  'pp..........pp',
  'ppp..mmmm..ppp',
  '.pppmmmmmmppp.',
  '..pmmwmmwmmp..',
  '...mmmmmmmm...',
  '....mmkkmm....',
  '.....mmmm.....',
]);
def('e_flyer2', [
  '..............',
  '.....mmmm.....',
  'pppmmmmmmmmppp',
  'pppmwmmwmmmppp',
  '.ppmmmmmmmmpp.',
  '....mmkkmm....',
  '.....mmmm.....',
]);

def('e_met_closed', [
  '....yyyyyy....',
  '..yyyyyyyyyy..',
  '.yyyyyyyyyyyy.',
  '.yyQyyyyyyQyy.',
  '.yyyyyyyyyyyy.',
  '..QQQQQQQQQQ..',
]);
def('e_met_open', [
  '....yyyyyy....',
  '..yyyyyyyyyy..',
  '.yyyyyyyyyyyy.',
  '.yyQyyyyyyQyy.',
  '..kkwkkkkwkk..',
  '..kkkkkkkkkk..',
  '...kk....kk...',
]);

def('e_shield1', [
  '..bbbb....ww..',
  '.bBBBBb..wqqw.',
  '.bBwwBb..wqqw.',
  '.bBBBBb..wqqw.',
  '..bbbbbb.wqqw.',
  '...bBBb..wqqw.',
  '..bbBBbb.wqqw.',
  '.b.bBBb.bwqqw.',
  '...bBBb..wqqw.',
  '..bb..bb.wqqw.',
  '..bb..bb..ww..',
]);
def('e_shield2', [
  '..bbbb....ww..',
  '.bBBBBb..wqqw.',
  '.bBwwBb..wqqw.',
  '.bBBBBb.wqqw..',
  '..bbbbbbwqqw..',
  '...bBBbwqqw...',
  '..bbBBbbqqw...',
  '.b.bBBb.bqw...',
  '...bBBb..w....',
  '..b.b.bb......',
  '..bb...bb.....',
]);

def('e_spawner', [
  '.....mmmmmm.....',
  '...mmpppppmm....',
  '..mpppwwppppm...',
  '..mppwppwpppm...',
  '.mppppppppppm...',
  '.mpkkppppkkppm..',
  '.mpkwpppkwpppm..',
  '.mpppppppppppm..',
  '..mpppmmpppm....',
  '..QQQQQQQQQQQ...',
  '..QqqqqqqqqqQ...',
  '..QQQQQQQQQQQ...',
]);

def('e_ling', [
  '..pppp..',
  '.pwppwp.',
  '.pppppp.',
  '..pppp..',
  '.k.kk.k.',
]);

// ======================= ROBOT MASTERS (20x24) =======================

def('bm_torch', [
  '.....r..rr..r.......',
  '....rroorrorr.......',
  '...rrooyyoorr.......',
  '...2rrrrrrrr2.......'.replaceAll('2', 'R'),
  '..RRrrrrrrrrRR......',
  '..Rrrssssssrr R.....',
  '..Rrsswkskwssr......',
  '..Rrssssssssr.......',
  '...rssskksssr.......',
  '....rrrrrrrr........',
  '...rrooooooorr......',
  '..rrooooooooorr.....',
  '.royroooooooryor....',
  '.rwyroooooooyrwr....',
  '..r..rooooor..r.....',
  '.....rooooor........',
  '....rrooooorr.......',
  '...rror..rorr.......',
  '..rror....rorr......',
  '..rrr......rrr......',
  '.RRrr......rrRR.....',
  '.RRRR......RRRR.....',
]);

def('bm_frost', [
  '....i..ii..i........',
  '...iinniinnii.......',
  '..iinnnnnnnnii......',
  '..innnnnnnnnni......',
  '..inCCCCCCCCni......',
  '..inCssssssCni......',
  '..inCwkssкwCni......'.replaceAll('к', 'k'),
  '..inCssssssCni......',
  '...iCsskksssi.......',
  '....iiiiiiii........',
  '...iinnnnnnnii......',
  '..iinnnnnnnnnii.....',
  '.iwiinnnnnnniiwi....',
  '.iwiinnnnnnniiwi....',
  '..i..innnnni..i.....',
  '.....innnnni........',
  '....iinnnnnii.......',
  '...iini..inii.......',
  '..iini....inii......',
  '..iii......iii......',
  '.niii......iiin.....',
  '.nnnn......nnnn.....',
]);

def('bm_gear', [
  '....Q.QQQQ.Q........',
  '...QQyQQQQyQQ.......',
  '..QQQQQQQQQQQQ......',
  '..QyQQQQQQQQyQ......',
  '..QQqqqqqqqqQQ......',
  '..Qqqssssssqq Q.....',
  '..Qqsswkskwssq......',
  '..Qqssssssssq.......',
  '...qssskksssq.......',
  '....qqqqqqqq........',
  '..yyQQQQQQQQyy......',
  '.yQyQqqqqqqQyQy.....',
  '.yQyQqqqqqqQyQy.....',
  '..yyQqqqqqqQyy......',
  '.....QqqqqQ.........',
  '.....QqqqqQ.........',
  '....QQqqqqQQ........',
  '...QQq Q..qQQ.......',
  '..QQq......qQQ......',
  '..QQQ......QQQ......',
  '.yQQQ......QQQy.....',
  '.yyyy......yyyy.....',
]);

def('bm_volt', [
  '.......yy...........',
  '......yy............',
  '....yyyy............',
  '...myyyyym..........',
  '..mmyyyyyym.........',
  '..mypyyyyym.........',
  '..myssssssym........',
  '..myswkskwsym.......',
  '..mysssssssym.......',
  '...yssskksssm.......',
  '....yyyyyyyy........',
  '...mmyyyyyymm.......',
  '..mmyyyyyyyymm......',
  '.mymmyyyyyymmym.....',
  '.mwmmyyyyyymmwm.....',
  '..m..myyyym..m......',
  '.....myyyym.........',
  '....mmyyyymm........',
  '...mmy m..ymm.......',
  '..mmy......ymm......',
  '..mmm......mmm......',
  '.ymmm......mmmy.....',
]);

// Dr. Moorly's skull hover machine (32x28)
def('moorly', [
  '..........qqqqqqqqqq............',
  '........qqQQQQQQQQQQqq..........',
  '.......qQQwwwwwwwwwwQQq.........',
  '......qQwwwwwwwwwwwwwwQq........',
  '.....qQwwwwwwwwwwwwwwwwQq.......',
  '.....qQwwkkwwwwwwwwkkwwQq.......',
  '.....qQwkkkkwwwwwwkkkkwQq.......',
  '.....qQwkkkkwwwwwwkkkkwQq.......',
  '.....qQwwkkwwwkkwwwkkwwQq.......',
  '.....qQwwwwwwkkkkwwwwwwQq.......',
  '.....qQwwwwwwwkkwwwwwwwQq.......',
  '......qQwwkwkwkwkwkwkwQq........',
  '......qQwkwkwkwkwkwkwwQq........',
  '.......qQwwwwwwwwwwwwQq.........',
  '........qqQQQQQQQQQQqq..........',
  '.....qqqqqQQQQQQQQQQqqqqq.......',
  '...qqQQQQQQssssssssQQQQQQqq.....',
  '..qQQQQQQQsswkssswssQQQQQQQq....',
  '..qQrrQQQQssssssssssQQQQrrQq....',
  '..qQrrQQQQQsskkkkssQQQQQrrQq....',
  '..qQQQQQQQQQssssssQQQQQQQQQq....',
  '...qqQQQQQQQQQQQQQQQQQQQqq......',
  '.....qqqQQQQQQQQQQQQqqq.........',
  '.......yy..yy..yy..yy...........',
  '......yy..yy....yy..yy..........',
  '.......y...y....y...y...........',
  '................................',
  '................................',
]);

// ======================= PORTRAITS (16x16) =======================

def('port_torch', [
  'RRRr.r..r.rRRRRR',
  'RRrrooroorrrRRRR',
  'RRrooyyooyorrRRR',
  'RRrrrrrrrrrrrRRR',
  'RrrrrrrrrrrrrrRR',
  'RrrssssssssrrrRR',
  'Rrrswksskwsrr RR',
  'RrrssssssssrrRRR',
  'RrrssskksssrrRRR',
  'RRrrssssssrrRRRR',
  'RRRrrrrrrrrRRRRR',
  'RRrrooooooorrRRR',
  'RrroooooooooorRR',
  'RrooooooooooorRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
]);
def('port_frost', [
  'CCCi.i..i.iCCCCC',
  'CCiinniinniiCCCC',
  'CCinnnnnnnnniCCC',
  'CCinnnnnnnnnniCC',
  'CiinCCCCCCCCniCC',
  'CiinCssssssCniCC',
  'CiinCwkskwsCniCC',
  'CiinCssssssCniCC',
  'CiiCsskkssssiCCC',
  'CCiissssssiiCCCC',
  'CCCiiiiiiiiCCCCC',
  'CCiinnnnnnniiCCC',
  'CiinnnnnnnnnniCC',
  'CinnnnnnnnnnniCC',
  'CCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCC',
]);
def('port_gear', [
  'kkQq.QQQQ.qQkkkk',
  'kkQQyQQQQyQQkkkk',
  'kQQQQQQQQQQQQkkk',
  'kQyQQQQQQQQyQkkk',
  'kQQqqqqqqqqQQkkk',
  'kQqqssssssqqQkkk',
  'kQqsswkskwsqQkkk',
  'kQqssssssssqQkkk',
  'kQqssskksssqQkkk',
  'kkQqssssssqQkkkk',
  'kkkQqqqqqqQkkkkk',
  'kkyQQQQQQQQykkkk',
  'kyQyQqqqqQyQykkk',
  'kyQyQqqqqQyQykkk',
  'kkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkk',
]);
def('port_volt', [
  'mmmm...yy..mmmmm',
  'mmmm..yy...mmmmm',
  'mmm.yyyy...mmmmm',
  'mmmmyyyyymmmmmmm',
  'mmmyyyyyyyymmmmm',
  'mmyypyyyyyymmmmm',
  'mmyssssssssymmmm',
  'mmyswkssкwsymmmm'.replaceAll('к', 'k'),
  'mmysssssssssymmm',
  'mmmysskkssyymmmm',
  'mmmmyssssyymmmmm',
  'mmmmyyyyyyymmmmm',
  'mmmyyyyyyyyymmmm',
  'mmyyyyyyyyyyymmm',
  'mmmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmmm',
]);
def('port_skull', [
  'kkkkkkkkkkkkkkkk',
  'kkkkqqqqqqqkkkkk',
  'kkkqwwwwwwwqkkkk',
  'kkqwwwwwwwwwqkkk',
  'kkqwwwwwwwwwqkkk',
  'kkqwkkwwwkkwqkkk',
  'kkqwkkwwwkkwqkkk',
  'kkqwwwwkwwwwqkkk',
  'kkkqwwkkkwwqkkkk',
  'kkkqwwwwwwwqkkkk',
  'kkkqwkwkwkwqkkkk',
  'kkkkqwwwwwqkkkkk',
  'kkkkkqqqqqkkkkkk',
  'kkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkk',
]);

// ======================= PICKUPS =======================

def('pk_hs', [
  '.rr.rr.',
  'rrrrrrr',
  'rwrrrrr',
  '.rrrrr.',
  '..rrr..',
  '...r...',
]);
def('pk_hb', [
  '..rrr.rrr..',
  '.rrrrrrrrr.',
  'rrwwrrrrrrr',
  'rrwrrrrrrrr',
  'rrrrrrrrrrr',
  '.rrrrrrrrr.',
  '..rrrrrrr..',
  '....rrr....',
  '.....r.....',
]);
def('pk_ws', [
  '.cc.cc.',
  'ccccccc',
  'cwccccc',
  '.ccccc.',
  '..ccc..',
  '...c...',
]);
def('pk_wb', [
  '..ccc.ccc..',
  '.ccccccccc.',
  'ccwwccccccc',
  'ccwcccccccc',
  'ccccccccccc',
  '.ccccccccc.',
  '..ccccccc..',
  '....ccc....',
  '.....c.....',
]);
def('pk_life', [
  '...2222222......'.replaceAll('2', 'B'),
  '..2111111120....'.replaceAll('2', 'B').replaceAll('1', 'c').replaceAll('0', '.'),
  '.BccccccccB.',
  '.BcBBBBBBcB.',
  '.BcssssssB..',
  '.BcswssщsB..'.replaceAll('щ', 'w'),
  '.BcssssssB..',
  '..BsskkssB..',
  '...BBBBBB...',
]);
def('pk_etank', [
  '.BBBBBBBB.',
  'BBccccccBB',
  'Bcwcccc cB'.replaceAll(' ', 'c'),
  'BccwwccccB',
  'BccwcccccB',
  'BcwwwwcccB',
  'BccwcccccB',
  'BccccccccB',
  'BBccccccBB',
  '.BBBBBBBB.',
]);

// ======================= THEMES / TILES =======================

export const THEMES = {
  torch: {
    name: 'TORCH MOORE', sky0: '#200408', sky1: '#38080c',
    solid: '#8c3810', dark: '#581c08', lite: '#c86830', lad: '#e0a030',
  },
  frost: {
    name: 'FROST MOORE', sky0: '#04102c', sky1: '#102048',
    solid: '#4880c0', dark: '#204878', lite: '#a0d0f0', lad: '#c8e8f8',
  },
  gear: {
    name: 'GEAR MOORE', sky0: '#100e14', sky1: '#1c1a24',
    solid: '#707078', dark: '#3c3c44', lite: '#a8a8b0', lad: '#f8b040',
  },
  volt: {
    name: 'VOLT MOORE', sky0: '#0c0418', sky1: '#1c0830',
    solid: '#605090', dark: '#342858', lite: '#9080c8', lad: '#f8e858',
  },
  fortress: {
    name: 'SKULL FORTRESS', sky0: '#0a0408', sky1: '#180a12',
    solid: '#684858', dark: '#382030', lite: '#987888', lad: '#c0c0c8',
  },
};

// Tile ids must match levels.js T constants.
export function drawTile(ctx, t, themeKey, x, y, frame) {
  const th = THEMES[themeKey];
  if (t === 1) { // SOLID brick
    ctx.fillStyle = th.solid;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = th.dark;
    ctx.fillRect(x, y + 7, 16, 1);
    ctx.fillRect(x, y + 15, 16, 1);
    ctx.fillRect(x + 7, y, 1, 7);
    ctx.fillRect(x + 3, y + 8, 1, 7);
    ctx.fillRect(x + 11, y + 8, 1, 7);
    ctx.fillStyle = th.lite;
    ctx.fillRect(x, y, 16, 1);
  } else if (t === 2) { // PLAT
    ctx.fillStyle = th.lite;
    ctx.fillRect(x, y, 16, 2);
    ctx.fillStyle = th.dark;
    ctx.fillRect(x, y + 2, 16, 3);
    ctx.fillStyle = th.solid;
    ctx.fillRect(x + 1, y + 2, 2, 3); ctx.fillRect(x + 7, y + 2, 2, 3); ctx.fillRect(x + 13, y + 2, 2, 3);
  } else if (t === 3) { // LADDER
    ctx.fillStyle = th.lad;
    ctx.fillRect(x + 2, y, 2, 16);
    ctx.fillRect(x + 12, y, 2, 16);
    ctx.fillRect(x + 2, y + 3, 12, 2);
    ctx.fillRect(x + 2, y + 11, 12, 2);
  } else if (t === 4) { // SPIKE
    ctx.fillStyle = '#181820';
    ctx.fillRect(x, y + 12, 16, 4);
    ctx.fillStyle = '#c8c8d8';
    for (let i = 0; i < 4; i++) {
      const bx = x + i * 4;
      ctx.beginPath();
      ctx.moveTo(bx, y + 13); ctx.lineTo(bx + 2, y + 1); ctx.lineTo(bx + 4, y + 13);
      ctx.fill();
    }
  } else if (t === 5 || t === 6) { // CONVEYOR left / right
    ctx.fillStyle = '#303038';
    ctx.fillRect(x, y, 16, 8);
    ctx.fillStyle = '#181820';
    ctx.fillRect(x, y + 8, 16, 8);
    ctx.fillStyle = th.lad;
    const dir = t === 6 ? 1 : -1;
    const off = ((frame >> 2) * dir) % 8;
    for (let i = -1; i < 3; i++) {
      const cx = x + ((i * 8 + off) % 16 + 16) % 16;
      ctx.fillRect(cx, y + 2, 4, 2);
    }
    ctx.fillStyle = '#585860';
    ctx.fillRect(x, y + 6, 16, 2);
  } else if (t === 7) { // ICE
    ctx.fillStyle = '#88c8f0';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#c8ecf8';
    ctx.fillRect(x, y, 16, 3);
    ctx.fillRect(x + 2, y + 5, 4, 2);
    ctx.fillRect(x + 9, y + 9, 4, 2);
    ctx.fillStyle = '#4880c0';
    ctx.fillRect(x, y + 14, 16, 2);
  } else if (t === 8) { // LAVA
    const ph = (frame >> 3) % 2;
    ctx.fillStyle = ph ? '#e05010' : '#f87018';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#f8d838';
    for (let i = 0; i < 4; i++) {
      const bx = x + ((i * 5 + (frame >> 2)) % 16);
      ctx.fillRect(bx, y + ((i * 7 + (frame >> 3)) % 6), 2, 2);
    }
    ctx.fillStyle = '#f8b088';
    ctx.fillRect(x, y, 16, 2);
  } else if (t === 9) { // DOOR
    ctx.fillStyle = '#888890';
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = '#484850';
    ctx.fillRect(x, y + 3, 16, 2);
    ctx.fillRect(x, y + 11, 16, 2);
    ctx.fillStyle = '#b8b8c0';
    ctx.fillRect(x, y, 16, 1);
  }
}

export function drawBoom(ctx, x, y, t, big) {
  const r = big ? 4 + t : 2 + t * 0.8;
  ctx.fillStyle = ['#f8f8f8', '#f8d838', '#e07820', '#901008'][t % 4];
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
  ctx.fill();
  if (t > 3) {
    ctx.fillStyle = '#101010';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r - 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Death orbs: MM style plus-shaped spark
export function drawOrb(ctx, x, y, frame) {
  ctx.fillStyle = frame % 8 < 4 ? '#f8f8f8' : '#00e8d8';
  ctx.fillRect(x - 1, y - 4, 2, 8);
  ctx.fillRect(x - 4, y - 1, 8, 2);
  ctx.fillRect(x - 2, y - 2, 4, 4);
}

export function drawSprite(ctx, name, x, y, flip = false) {
  const c = SPR[name];
  if (!c) return;
  if (!flip) { ctx.drawImage(c, Math.round(x), Math.round(y)); return; }
  ctx.save();
  ctx.translate(Math.round(x) + c.width, Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

export function initSprites() {
  for (const [name, rows] of defs) {
    SPR[name] = bake(rows);
    // Player frames get one variant per weapon palette.
    if (name.startsWith('p_')) {
      for (const w of Object.keys(WPAL)) {
        SPR[`${name}_${w}`] = bake(rows, { ...PAL, ...WPAL[w] });
      }
    }
  }
}
