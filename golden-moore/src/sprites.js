// Pixel art: string-grid sprites baked to offscreen canvases, plus
// procedural effects (slashes, sparks, earth magic). All original art.
// Humanoids are composed from upper-body + leg grids so one torso serves
// several poses, and palette maps give us Genesis-style color swap variants.

// ---- palettes ----
// char meanings: h hair/helm, H shade, s skin, S shade, t tunic/harness,
// T shade, p pants, P shade, k boots/leather, n bone, w blade, q blade shade,
// a accent (belt/sack), d dark detail, r red, b blue, B blue shade,
// y yellow, m meat, M meat shade, c glass, C glass shade, g glow

const HERO_PAL = {
  h: '#f8d820', H: '#b08810', s: '#f0b078', S: '#b87848',
  t: '#8a4c1c', T: '#5c3210', p: '#2858d8', P: '#1a3890',
  k: '#703818', w: '#e8ecf4', q: '#9098c0', d: '#201408', a: '#f8d820',
};

const GRUNT_PALS = [
  { h: '#485058', s: '#e0a070', S: '#a87048', t: '#309048', T: '#1c6030', p: '#584838', k: '#302018', w: '#d8dce8', q: '#888ca8', a: '#a87828', d: '#181008' },
  { h: '#586068', s: '#e0a070', S: '#a87048', t: '#c03028', T: '#801818', p: '#383048', k: '#201828', w: '#d8dce8', q: '#888ca8', a: '#c8a030', d: '#181008' },
  { h: '#706878', s: '#c89068', S: '#906040', t: '#8838c0', T: '#582080', p: '#303040', k: '#181820', w: '#d8dce8', q: '#888ca8', a: '#d0b040', d: '#181008' },
];

const SKEL_PALS = [
  { n: '#e8e8d0', N: '#a0a088', t: '#484858', T: '#303040', p: '#e8e8d0', k: '#a0a088', w: '#c8d0e0', q: '#8088a0', d: '#100810', a: '#484858' },
  { n: '#e8c8a8', N: '#a08868', t: '#802020', T: '#581010', p: '#e8c8a8', k: '#a08868', w: '#e8d8a0', q: '#a89860', d: '#180808', a: '#802020' },
];

const BRUTE_PALS = [
  { h: '#c8b028', H: '#907c10', s: '#5878d8', S: '#3850a0', t: '#784018', T: '#502808', p: '#906828', k: '#402810', w: '#e0e4f0', q: '#9098b8', d: '#101020', a: '#c8a030' },
  { h: '#b8b8c8', H: '#808090', s: '#d84838', S: '#982818', t: '#404858', T: '#282c38', p: '#585048', k: '#282018', w: '#e0e4f0', q: '#9098b8', d: '#180808', a: '#c8a030' },
];

// Death Moore: a giant dark knight — brute grids at 2x in funeral colors.
const BOSS_PAL = {
  h: '#282838', H: '#181824', s: '#8890a8', S: '#586078', t: '#901820', T: '#601018',
  p: '#606880', k: '#20242f', w: '#e8f0f8', q: '#98a0c0', d: '#c02020', a: '#c8a030',
};

const THIEF_PAL = {
  t: '#30a838', T: '#1c7024', s: '#f0b078', p: '#205828', k: '#4a3018',
  a: '#a87838', d: '#181008',
};

const BEAST_PAL = {
  b: '#4880e8', B: '#2c58b0', y: '#f0c838', r: '#e83848', d: '#101018',
};

const ITEM_PAL = {
  c: '#48a8f8', C: '#2060c0', a: '#8a5828', w: '#e8f0f8',
  m: '#d04828', M: '#8c2414', n: '#f0ead8',
};

// ---- baking ----
function bake(rows, pal, scale = 1) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

function bakeWhite(rows, pal, scale = 1) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

export const SPR = {};
function reg(name, rows, pal, scale = 1) {
  SPR[name] = bake(rows, pal, scale);
  SPR[name + '#w'] = bakeWhite(rows, pal, scale);
}
const J = (...parts) => [].concat(...parts);

// ======================= HERO: Moore the Golden =======================
// Golden-haired barbarian, 18 wide, faces right. Uppers 13 rows, legs 8.

const HU_IDLE = [
  '......hhhhh.......',
  '.....hhhhhhh......',
  '.....Hssssss...w..',
  '.....Hssdsss...w..',
  '......ssss.....w..',
  '.......ss......w..',
  '....ssssssssss.w..',
  '...ssssssTssss.w..',
  '...ss.sssTsss..w..',
  '...sS.sssssss.sw..',
  '......tttttt..sq..',
  '......pppppp......',
  '......pppppp......',
];

const HU_ATK1 = [
  '......hhhhh.......',
  '.....hhhhhhh......',
  '.....Hssssss......',
  '.....Hssdsss......',
  '......ssss........',
  '.......ss.........',
  '....ssssssssss....',
  '...sssssssTssssss.',
  '...ss.ssssTsswwwww',
  '...sS.sssssss.....',
  '......tttttt......',
  '......pppppp......',
  '......pppppp......',
];

const HU_ATK2 = [
  '......hhhhh.......',
  '.....hhhhhhh......',
  '.....Hssssss......',
  '.....Hssdsss......',
  '......ssss....ww..',
  '.......ss....ww...',
  '....ssssssssssw...',
  '...ssssssTsssss...',
  '...ss.sssTsss.s...',
  '...sS.sssssss.....',
  '......tttttt......',
  '......pppppp......',
  '......pppppp......',
];

const HU_ATK3 = [
  '......hhhhh.......',
  '.....hhhhhhh......',
  '.....Hssssss......',
  '.....Hssdsss......',
  '......ssss........',
  '.......ss.........',
  '....ssssssssss....',
  '...ssssssTsssss...',
  '...ss.sssTsssss...',
  '...sS.sssssss.w...',
  '......tttttt..w...',
  '......pppppp..q...',
  '......pppppp......',
];

const HU_BACK = [
  '......hhhhh.......',
  '.....hhhhhhh......',
  '.....Hssssss......',
  '.....Hssdsss......',
  '......ssss........',
  '.......ss.........',
  '....ssssssssss....',
  'wwsssssssTssss....',
  'ww.ss.sssTsss.....',
  '...sS.sssssss.....',
  '......tttttt......',
  '......pppppp......',
  '......pppppp......',
];

const HU_CAST = [
  '......hhhhh.......',
  '.....hhhhhhh......',
  '.....Hssssss......',
  '.....Hssdsss......',
  '..s...ssss...s....',
  '..s....ss....s....',
  '..ssssssssssss....',
  '...ssssssTssss....',
  '....ssssTsss......',
  '....sssssss.......',
  '......tttttt......',
  '......pppppp......',
  '......pppppp......',
];

const HU_HURT = [
  '.....hhhhh........',
  '....hhhhhhh.......',
  '....Hssssss.......',
  '....Hsdssss.......',
  '.....ssss.........',
  '......ss..........',
  '....ssssssssss....',
  '..s.ssssssTsss.s..',
  '..s..sssTsss...s..',
  '.....sssssss......',
  '......tttttt......',
  '......pppppp......',
  '......pppppp......',
];

const HL_STAND = [
  '......pp..pp......',
  '......pp..pp......',
  '......pp..pp......',
  '......pp..pp......',
  '.....kpp..ppk.....',
  '.....kkp..pkk.....',
  '.....kk....kk.....',
  '....kkk....kkk....',
];

const HL_WALK1 = [
  '.....ppp..ppp.....',
  '.....pp....pp.....',
  '....ppp....ppp....',
  '....pp......pp....',
  '...kpp......ppk...',
  '...kkp......pkk...',
  '...kk........kk...',
  '..kkk........kkk..',
];

const HL_WALK2 = [
  '......ppppp.......',
  '......ppppp.......',
  '.....pp..pp.......',
  '.....pp...pp......',
  '....kpp...ppk.....',
  '....kkp...pkk.....',
  '....kk.....kk.....',
  '...kkk.....kkk....',
];

const HL_LUNGE = [
  '.....pppppp.......',
  '....pp...ppp......',
  '...ppp....ppp.....',
  '..ppp......pp.....',
  '..kpp......ppk....',
  '.kkp.......pkk....',
  '.kk.........kkk...',
  'kkk.........kkkk..',
];

const HL_AIR = [
  '......pppppp......',
  '.....pp..ppp......',
  '.....pp...pp......',
  '....kpp..ppk......',
  '....kk....kk......',
  '...kkk....kkk.....',
  '..................',
  '..................',
];

const HL_RIDE = [
  '.....pppppppp.....',
  '.....pp....pp.....',
  '.....kk....kk.....',
  '....kkk....kkk....',
  '..................',
  '..................',
  '..................',
  '..................',
];

const H_DOWN = [
  '..........................',
  '..hhh.....................',
  '.hsssh.ssssssssspppppp....',
  'hssssh.sssTsssssppppppkkk.',
  '.hsssh.sssssssssppppppkkk.',
  '..hhh.....................',
];

reg('h_idle', J(HU_IDLE, HL_STAND), HERO_PAL);
reg('h_walk1', J(HU_IDLE, HL_WALK1), HERO_PAL);
reg('h_walk2', J(HU_IDLE, HL_WALK2), HERO_PAL);
reg('h_atk1', J(HU_ATK1, HL_LUNGE), HERO_PAL);
reg('h_atk2', J(HU_ATK2, HL_STAND), HERO_PAL);
reg('h_atk3', J(HU_ATK3, HL_LUNGE), HERO_PAL);
reg('h_back', J(HU_BACK, HL_STAND), HERO_PAL);
reg('h_cast', J(HU_CAST, HL_STAND), HERO_PAL);
reg('h_hurt', J(HU_HURT, HL_STAND), HERO_PAL);
reg('h_jump', J(HU_IDLE, HL_AIR), HERO_PAL);
reg('h_jatk', J(HU_ATK3, HL_AIR), HERO_PAL);
reg('h_dash', J(HU_ATK2, HL_LUNGE), HERO_PAL);
reg('h_ride', J(HU_IDLE, HL_RIDE), HERO_PAL);
reg('h_down', H_DOWN, HERO_PAL);

// ======================= GRUNT swordsman =======================
// 16 wide. Uppers 11 rows, legs 8.

const GU_IDLE = [
  '......hhhh......',
  '.....hhhhhh.....',
  '.....ssssss..w..',
  '.....ssdsss..w..',
  '......ssss...w..',
  '....tttttttt.w..',
  '...stttttttt.w..',
  '...s.tttttt.sq..',
  '...s.tttttt.....',
  '.....tttttt.....',
  '.....aaaaaa.....',
];

const GU_WIND = [
  '......hhhh..ww..',
  '.....hhhhhh.w...',
  '.....ssssss.w...',
  '.....ssdsssss...',
  '......ssss..s...',
  '....tttttttt....',
  '...stttttttt....',
  '...s.tttttt.....',
  '...s.tttttt.....',
  '.....tttttt.....',
  '.....aaaaaa.....',
];

const GU_ATK = [
  '......hhhh......',
  '.....hhhhhh.....',
  '.....ssssss.....',
  '.....ssdsss.....',
  '......ssss......',
  '....tttttttt....',
  '...sttttttttss..',
  '...s.ttttttswwww',
  '...s.tttttt.....',
  '.....tttttt.....',
  '.....aaaaaa.....',
];

const GU_HURT = [
  '.....hhhh.......',
  '....hhhhhh......',
  '....ssssss......',
  '....sdssss......',
  '.....ssss.......',
  '....tttttttt....',
  '..s.tttttttt.s..',
  '..s..tttttt..s..',
  '.....tttttt.....',
  '.....tttttt.....',
  '.....aaaaaa.....',
];

const EL_STAND = [
  '.....pp..pp.....',
  '.....pp..pp.....',
  '.....pp..pp.....',
  '....kpp..ppk....',
  '....kkp..pkk....',
  '....kk....kk....',
  '...kkk....kkk...',
  '................',
];

const EL_WALK1 = [
  '....ppp..ppp....',
  '....pp....pp....',
  '...ppp....ppp...',
  '...kpp....ppk...',
  '..kkp......pkk..',
  '..kk........kk..',
  '.kkk........kkk.',
  '................',
];

const EL_WALK2 = [
  '.....ppppp......',
  '.....ppppp......',
  '....pp..pp......',
  '....kpp.ppk.....',
  '....kkp.pkk.....',
  '....kk...kk.....',
  '...kkk...kkk....',
  '................',
];

const EL_LUNGE = [
  '....pppppp......',
  '...pp...pp......',
  '..ppp....pp.....',
  '..kpp....ppk....',
  '.kkp......pkk...',
  '.kk........kk...',
  'kkk........kkk..',
  '................',
];

const E_DOWN = [
  '......................',
  '..hhh.................',
  '.hsssh.tttttttpppppkk.',
  '.hsssh.tttttttpppppkk.',
  '..hhh.................',
  '......................',
];

GRUNT_PALS.forEach((pal, v) => {
  reg(`g${v}_idle`, J(GU_IDLE, EL_STAND), pal);
  reg(`g${v}_walk1`, J(GU_IDLE, EL_WALK1), pal);
  reg(`g${v}_walk2`, J(GU_IDLE, EL_WALK2), pal);
  reg(`g${v}_wind`, J(GU_WIND, EL_STAND), pal);
  reg(`g${v}_atk`, J(GU_ATK, EL_LUNGE), pal);
  reg(`g${v}_hurt`, J(GU_HURT, EL_STAND), pal);
  reg(`g${v}_down`, E_DOWN, pal);
});

// ======================= SKELETON =======================
// Bony, quick, blocks. Reuses enemy legs with a bone palette.

const SU_IDLE = [
  '......nnnn......',
  '.....nnnnnn.....',
  '.....ndnndn.....',
  '.....nnnnnn.....',
  '......nnn....w..',
  '....tttttttt.w..',
  '...ntttttttt.w..',
  '...n.tttttt.nq..',
  '...n.tttttt.....',
  '.....nnnnnn.....',
  '.....tttttt.....',
];

const SU_BLOCK = [
  '......nnnn..w...',
  '.....nnnnnn.w...',
  '.....ndnndn.w...',
  '.....nnnnnn.w...',
  '......nnn..nw...',
  '....ttttttttw...',
  '...ntttttttt....',
  '...n.tttttt.....',
  '...n.tttttt.....',
  '.....nnnnnn.....',
  '.....tttttt.....',
];

const SU_WIND = [
  '......nnnn..ww..',
  '.....nnnnnn.w...',
  '.....ndnndn.w...',
  '.....nnnnnnnn...',
  '......nnn...n...',
  '....tttttttt....',
  '...ntttttttt....',
  '...n.tttttt.....',
  '...n.tttttt.....',
  '.....nnnnnn.....',
  '.....tttttt.....',
];

const SU_ATK = [
  '......nnnn......',
  '.....nnnnnn.....',
  '.....ndnndn.....',
  '.....nnnnnn.....',
  '......nnn.......',
  '....tttttttt....',
  '...nttttttttnn..',
  '...n.ttttttnwwww',
  '...n.tttttt.....',
  '.....nnnnnn.....',
  '.....tttttt.....',
];

const SU_HURT = [
  '.....nnnn.......',
  '....nnnnnn......',
  '....ndnndn......',
  '....nnnnnn......',
  '.....nnn........',
  '....tttttttt....',
  '..n.tttttttt.n..',
  '..n..tttttt..n..',
  '.....tttttt.....',
  '.....nnnnnn.....',
  '.....tttttt.....',
];

const S_DOWN = [
  '......................',
  '..nnn.................',
  '.nnnnn.tttttttnnnnnnn.',
  '.ndnnn.tttttttnnnnnnn.',
  '..nnn.................',
  '......................',
];

SKEL_PALS.forEach((pal, v) => {
  reg(`sk${v}_idle`, J(SU_IDLE, EL_STAND), pal);
  reg(`sk${v}_walk1`, J(SU_IDLE, EL_WALK1), pal);
  reg(`sk${v}_walk2`, J(SU_IDLE, EL_WALK2), pal);
  reg(`sk${v}_block`, J(SU_BLOCK, EL_STAND), pal);
  reg(`sk${v}_wind`, J(SU_WIND, EL_STAND), pal);
  reg(`sk${v}_atk`, J(SU_ATK, EL_LUNGE), pal);
  reg(`sk${v}_hurt`, J(SU_HURT, EL_STAND), pal);
  reg(`sk${v}_down`, S_DOWN, pal);
});

// ======================= HEAVY AXE BRUTE =======================
// 22 wide. Uppers 14 rows, legs 9. Also serves Death Moore at 2x scale.

const BU_IDLE = [
  '........hhhhhh........',
  '.......hhhhhhhh.......',
  '.......Hssssssh.......',
  '.......Hsdssssh.......',
  '........ssssss........',
  '.........ssss.....wK..',
  '.....ssssssssssss.wKw.',
  '....ssssssssssssss.K..',
  '...sssssssTssssssssK..',
  '...ss.ssssssssss.ssK..',
  '...ss.sssTssssss.ssK..',
  '...S...tttttttt.......',
  '.......pppppppp.......',
  '.......pppppppp.......',
];

const BU_WIND = [
  '........hhhhhh...ww...',
  '.......hhhhhhhh.wKw...',
  '.......Hssssssh..K....',
  '.......Hsdssssh..K....',
  '........ssssss..sK....',
  '.........ssss..ss.....',
  '.....ssssssssssss.....',
  '....ssssssssssssss....',
  '...sssssssTsssssss....',
  '...ss.ssssssssss......',
  '...ss.sssTssssss......',
  '...S...tttttttt.......',
  '.......pppppppp.......',
  '.......pppppppp.......',
];

const BU_ATK = [
  '........hhhhhh........',
  '.......hhhhhhhh.......',
  '.......Hssssssh.......',
  '.......Hsdssssh.......',
  '........ssssss........',
  '.........ssss.........',
  '.....ssssssssssss.....',
  '....ssssssssssssssss..',
  '...sssssssTsssssssKKK.',
  '...ss.ssssssssss...www',
  '...ss.sssTssssss...www',
  '...S...tttttttt.......',
  '.......pppppppp.......',
  '.......pppppppp.......',
];

const BU_HURT = [
  '.......hhhhhh.........',
  '......hhhhhhhh........',
  '......Hssssssh........',
  '......Hsdssssh........',
  '.......ssssss.........',
  '........ssss..........',
  '.....ssssssssssss.....',
  '..s.ssssssssssssss.s..',
  '..s..sssssTsssss...s..',
  '.....ssssssssss.......',
  '.....sssTssssss.......',
  '.......tttttttt.......',
  '.......pppppppp.......',
  '.......pppppppp.......',
];

const BL_STAND = [
  '.......pp....pp.......',
  '.......pp....pp.......',
  '......kpp....ppk......',
  '......kkp....pkk......',
  '......kk......kk......',
  '.....kkk......kkk.....',
  '.....kkk......kkk.....',
  '......................',
  '......................',
];

const BL_WALK1 = [
  '......ppp....ppp......',
  '.....ppp......ppp.....',
  '.....kpp......ppk.....',
  '....kkpp......ppkk....',
  '....kkk........kkk....',
  '...kkkk........kkkk...',
  '......................',
  '......................',
  '......................',
];

const BL_WALK2 = [
  '.......pppppp.........',
  '.......pp..pp.........',
  '......kpp..ppk........',
  '......kkp..pkk........',
  '......kkk...kkk.......',
  '.....kkkk...kkkk......',
  '......................',
  '......................',
  '......................',
];

const BL_LUNGE = [
  '.....pppppppp.........',
  '....ppp....ppp........',
  '...kpp......ppk.......',
  '..kkpp......ppkk......',
  '..kkk........kkk......',
  '.kkkk........kkkk.....',
  '......................',
  '......................',
  '......................',
];

const B_DOWN = [
  '............................',
  '..hhhh......................',
  '.hssssh.ssssssssssppppppkkk.',
  'hsssssh.ssssTsssssppppppkkkk',
  '.hssssh.ssssssssssppppppkkk.',
  '..hhhh......................',
  '............................',
];

BRUTE_PALS.forEach((pal, v) => {
  reg(`br${v}_idle`, J(BU_IDLE, BL_STAND), pal);
  reg(`br${v}_walk1`, J(BU_IDLE, BL_WALK1), pal);
  reg(`br${v}_walk2`, J(BU_IDLE, BL_WALK2), pal);
  reg(`br${v}_wind`, J(BU_WIND, BL_STAND), pal);
  reg(`br${v}_atk`, J(BU_ATK, BL_LUNGE), pal);
  reg(`br${v}_hurt`, J(BU_HURT, BL_STAND), pal);
  reg(`br${v}_down`, B_DOWN, pal);
});

// Death Moore — the same iron silhouette, twice the size, dead colors.
reg('boss_idle', J(BU_IDLE, BL_STAND), BOSS_PAL, 2);
reg('boss_walk1', J(BU_IDLE, BL_WALK1), BOSS_PAL, 2);
reg('boss_walk2', J(BU_IDLE, BL_WALK2), BOSS_PAL, 2);
reg('boss_wind', J(BU_WIND, BL_STAND), BOSS_PAL, 2);
reg('boss_atk', J(BU_ATK, BL_LUNGE), BOSS_PAL, 2);
reg('boss_hurt', J(BU_HURT, BL_STAND), BOSS_PAL, 2);
reg('boss_down', B_DOWN, BOSS_PAL, 2);

// ======================= THIEF GNOME =======================

const TH_RUN1 = [
  '.....tttt.....',
  '....tttttt....',
  '....tsssst....',
  '....tsdsdt....',
  '.....ssss.....',
  '..aattttttt...',
  '.aaaatttttt...',
  '.aaaa.tttt....',
  '..aa..tttt....',
  '......tttt....',
  '.....pp.pp....',
  '....pp...pp...',
  '...kk.....pp..',
  '..kkk.....kkk.',
];

const TH_RUN2 = [
  '.....tttt.....',
  '....tttttt....',
  '....tsssst....',
  '....tsdsdt....',
  '.....ssss.....',
  '..aattttttt...',
  '.aaaatttttt...',
  '.aaaa.tttt....',
  '..aa..tttt....',
  '......tttt....',
  '.....ppppp....',
  '.....pp.pp....',
  '....kkp..pp...',
  '....kk....kkk.',
];

const TH_HURT = [
  '.s...tttt...s.',
  '.s..tttttt..s.',
  '.s..tsssst..s.',
  '.ss.tsdsdt.ss.',
  '.....ssss.....',
  '....tttttt....',
  '....tttttt....',
  '.....tttt.....',
  '.....tttt.....',
  '.....pp.pp....',
  '....pp...pp...',
  '...kk.....kk..',
  '..............',
  '..............',
];

reg('th_run1', TH_RUN1, THIEF_PAL);
reg('th_run2', TH_RUN2, THIEF_PAL);
reg('th_hurt', TH_HURT, THIEF_PAL);

// ======================= CHICKENLEG BEAST =======================
// 32 wide, faces right. Tail whip is drawn as an arc effect.

const BEAST_STAND = [
  '........................rr......',
  '.......................rrrr.....',
  '.......................bbbbb....',
  '......................bbdbbbyyy.',
  '......................bbbbbb....',
  '.....................bbbbb......',
  '....................bbbbb.......',
  '..bb.......bbbbbbbbbbbbbb.......',
  '...bbb...bbbbbbbbbbbbbbbb.......',
  '....bbbbbbbbBbbbbbbbbbbbb.......',
  '.......bbbbbbbbbbbbbbbbb........',
  '........bbbbbbbbbbbbbb..........',
  '..........Bbb....Bbb............',
  '..........yby....yby............',
  '..........yy.....yy.............',
  '.........yyy....yyy.............',
];

const BEAST_WALK1 = [
  '........................rr......',
  '.......................rrrr.....',
  '.......................bbbbb....',
  '......................bbdbbbyyy.',
  '......................bbbbbb....',
  '.....................bbbbb......',
  '....................bbbbb.......',
  '..bb.......bbbbbbbbbbbbbb.......',
  '...bbb...bbbbbbbbbbbbbbbb.......',
  '....bbbbbbbbBbbbbbbbbbbbb.......',
  '.......bbbbbbbbbbbbbbbbb........',
  '........bbbbbbbbbbbbbb..........',
  '.........Bbb......Bbb...........',
  '........yby......yby............',
  '........yy........yy............',
  '.......yyy.......yyy............',
];

const BEAST_WALK2 = [
  '........................rr......',
  '.......................rrrr.....',
  '.......................bbbbb....',
  '......................bbdbbbyyy.',
  '......................bbbbbb....',
  '.....................bbbbb......',
  '....................bbbbb.......',
  '..bb.......bbbbbbbbbbbbbb.......',
  '...bbb...bbbbbbbbbbbbbbbb.......',
  '....bbbbbbbbBbbbbbbbbbbbb.......',
  '.......bbbbbbbbbbbbbbbbb........',
  '........bbbbbbbbbbbbbb..........',
  '...........Bbb....Bbb...........',
  '............yby....yby..........',
  '.............yy....yy...........',
  '............yyy....yyy..........',
];

const BEAST_WHIP = [
  '........................rr......',
  '.......................rrrr.....',
  '.......................bbbbb....',
  '......................bbdbbbyyy.',
  '......................bbbbbb....',
  '..bbb................bbbbb......',
  '...bbbb.............bbbbb.......',
  '.....bbb...bbbbbbbbbbbbbb.......',
  '.........bbbbbbbbbbbbbbbb.......',
  '....bbbbbbbbBbbbbbbbbbbbb.......',
  '.......bbbbbbbbbbbbbbbbb........',
  '........bbbbbbbbbbbbbb..........',
  '..........Bbb....Bbb............',
  '..........yby....yby............',
  '..........yy.....yy.............',
  '.........yyy....yyy.............',
];

reg('beast_stand', BEAST_STAND, BEAST_PAL);
reg('beast_walk1', BEAST_WALK1, BEAST_PAL);
reg('beast_walk2', BEAST_WALK2, BEAST_PAL);
reg('beast_whip', BEAST_WHIP, BEAST_PAL);

// ======================= ITEMS =======================

reg('potion', [
  '..www..',
  '..aaa..',
  '..CcC..',
  '.ccccc.',
  'ccccccc',
  'ccCcccc',
  'ccccccc',
  '.ccccc.',
  '..ccc..',
], ITEM_PAL);

reg('meat', [
  '...mmmmm....',
  '..mmmmmmm...',
  '.mmmMmmmm.nn',
  '.mmmmmmmmnnn',
  '..mmmmmmm.nn',
  '...mmmmm....',
], ITEM_PAL);

// ======================= drawing helpers =======================

export function initSprites() { /* baked at module load; hook kept for parity */ }

export function drawSprite(ctx, name, x, y, flip = false, white = false) {
  const img = SPR[white ? name + '#w' : name];
  if (!img) return;
  if (!flip) {
    ctx.drawImage(img, Math.round(x), Math.round(y));
  } else {
    ctx.save();
    ctx.translate(Math.round(x) + img.width, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}

export function sprSize(name) {
  const img = SPR[name];
  return img ? { w: img.width, h: img.height } : { w: 0, h: 0 };
}

export function drawShadow(ctx, cx, cy, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(cy), w / 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A swinging blade arc in front of an attacker. t goes 0..1 over the swing.
export function drawSlash(ctx, x, y, face, t, big = false, color = '#f8f0d0') {
  const r = big ? 22 : 16;
  const a0 = face > 0 ? -1.5 + t * 1.6 : Math.PI + 1.5 - t * 1.6;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9 - t * 0.5;
  ctx.lineWidth = big ? 3 : 2;
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a0 + 0.9 * (face > 0 ? 1 : -1), face < 0);
  ctx.stroke();
  ctx.globalAlpha = 0.5 - t * 0.3;
  ctx.beginPath();
  ctx.arc(x, y, r - 4, a0, a0 + 0.7 * (face > 0 ? 1 : -1), face < 0);
  ctx.stroke();
  ctx.restore();
}

export function drawSpark(ctx, x, y, t) {
  const r = 2 + t * 1.5;
  ctx.fillStyle = t < 2 ? '#fff8e0' : '#f8c040';
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + t * 0.5;
    ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 3, 3);
  }
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
}

// Earth magic pillar: a jagged rock column bursting up from ground y.
export function drawRock(ctx, x, groundY, t, hMax) {
  const up = Math.min(1, t / 8);
  const fade = t > 26 ? Math.max(0, 1 - (t - 26) / 10) : 1;
  const h = hMax * up;
  ctx.save();
  ctx.globalAlpha = fade;
  for (let i = 0; i < h; i += 4) {
    const w = 10 - (i / hMax) * 6 + ((i * 7 + x) % 3);
    ctx.fillStyle = i % 8 < 4 ? '#8a6030' : '#6a4820';
    ctx.fillRect(Math.round(x - w / 2), Math.round(groundY - i - 4), Math.round(w), 4);
  }
  ctx.fillStyle = '#f8d878';
  ctx.fillRect(Math.round(x - 1), Math.round(groundY - h), 2, Math.round(h * 0.6));
  // debris
  ctx.fillStyle = '#6a4820';
  for (let i = 0; i < 3; i++) {
    const dx = ((i * 23 + t * 5) % 24) - 12;
    ctx.fillRect(Math.round(x + dx), Math.round(groundY - 2 - ((t * 2 + i * 9) % 14)), 2, 2);
  }
  ctx.restore();
}
