// Metal Moore — pixel art. Neo Geo-style sprites: string-grid art baked to
// offscreen canvases, 3 shades per material, warm dark outlines. Characters
// use Metal Slug's split-body trick: legs and torso animate independently.
// All original art.

// ---- master palette ----
export const PAL = {
  d: '#1a140f', // warm outline
  s: '#f4b98e', S: '#cf8a5e', F: '#a05e38', // skin
  h: '#7c4a20', H: '#502e10',               // hero hair
  w: '#f2eee0', W: '#bab2a0',               // white tee
  g: '#708344', G: '#4e5e2a', E: '#364418', // hero olive fatigues
  r: '#dc3c2c', R: '#9c2018',               // scarf red / blood-orange accents
  k: '#6f4c2c', K: '#48311b',               // leather / boots
  u: '#90906c', U: '#65674a', V: '#454831', // rebel drab uniform
  m: '#a63e50', M: '#702734',               // rebel fez / sash maroon
  q: '#a2aab4', Q: '#616873', Z: '#383e48', // gun metal
  y: '#f8d850', Y: '#dc9420',               // brass / gold
  o: '#f6851f', O: '#c14e14', x: '#fffbe6', // fire
  b: '#93a7b0', B: '#627a84', N: '#40525b', // slug steel
  c: '#63cfe8', C: '#2e84a8',               // glass / cockpit
  t: '#cfa965', T: '#9a7433',               // rope / sand / khaki
  j: '#44822f', J: '#2e5a1f', L: '#1a3a17', // jungle greens
  a: '#96683c', A: '#6b4526',               // dirt
  p: '#a5825c', P: '#7a5c3c',               // planks
  i: '#9c9c94', I: '#6e6e66',               // stone / concrete
  v: '#4790b4', X: '#2d5f80',               // water
  e: '#e8e0c8',                             // bone / highlight cream
  n: '#585048',                             // smoke grey
  z: '#8a8078',                             // smoke light
  f: '#ffd8a8',                             // muzzle warm glow
  '0': '#000000',
};

export function bake(rows, pal = PAL) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// white-flash version (for damage flashes)
function bakeWhite(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff8e0';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export const SPR = {};
export const SPRW = {}; // white-flash variants
const defs = [];
function def(name, rows) { defs.push([name, rows]); }

// =====================================================================
// PLAYER — Cpl. Jason Moore. Brown hair, red neckerchief, white tank
// top, olive fatigues. Faces right. Torso (incl. head + rifle) and legs
// are separate so any legs pair with any torso, like real Metal Slug.
// Torso sprites are 26x17, anchored so row 16 sits on the hip line.
// Leg sprites are 20x14, hip line at row 0.
// =====================================================================

def('t_aim', [
  '..........dhhhd...........',
  '........ddhhhhhd..........',
  '.......dhhhhhhhhd.........',
  '.......dhHsssshhd.........',
  '.......dssssssShd.........',
  '.......dsdssdsSd..........',
  '.......dssssssSd..........',
  '........dsSSsSd...........',
  '......ddrssSdd............',
  '.....drrrdsd..............',
  '....dwwrrrdd..............',
  '...dwwwwrdwwdssd..........',
  '..dwwwwwwwwwdssssdddddd...',
  '..dwwwwwwWddsSSdQZZZZZZd..',
  '..dwWWwwWWdksSdqqQQZd.Yd..',
  '..dwWdwwWd.dkkdddddZd.d...',
  '...dd.ddd...dd.....dd.....',
]);

def('t_fire', [
  '..........dhhhd...........',
  '........ddhhhhhd..........',
  '.......dhhhhhhhhd.........',
  '.......dhHsssshhd.........',
  '.......dssssssShd.........',
  '.......dsdssdsSd..........',
  '.......dssssssSd..........',
  '........dsSSsSd...........',
  '......ddrssSdd............',
  '.....drrrdsd..............',
  '....dwwrrrdd..............',
  '...dwwwwrdwwdssd..........',
  '..dwwwwwwwwwdsssddddddd...',
  '..dwwwwwwWddsSSdQZZZZZd...',
  '..dwWWwwWWdksSdqqQQZdYYd..',
  '..dwWdwwWd.dkkdddddZd.d...',
  '...dd.ddd...dd.....dd.....',
]);

def('t_up', [
  '...............dqd........',
  '...............dZd........',
  '...............dZd........',
  '..........dhhhdqZd........',
  '........ddhhhhhdQd........',
  '.......dhhhhhhhhQd........',
  '.......dhHsssshsQd........',
  '.......dssssssSsSd........',
  '.......dsdssdsSssd........',
  '.......dssssssSdsd........',
  '........dsSSsSddsd........',
  '......ddrssSddssd.........',
  '.....drrrdsdsssd..........',
  '....dwwrrrddsSd...........',
  '...dwwwwrwwwdSd...........',
  '..dwwwwwwwWWdd............',
  '..dwWWwwWWdd..............',
]);

def('t_upfire', [
  '...............dqd........',
  '...............dqd........',
  '...............dZd........',
  '..........dhhhdqZd........',
  '........ddhhhhhdQd........',
  '.......dhhhhhhhhQd........',
  '.......dhHsssshsQd........',
  '.......dssssssSsSd........',
  '.......dsdssdsSssd........',
  '.......dssssssSdsd........',
  '........dsSSsSddsd........',
  '......ddrssSddssd.........',
  '.....drrrdsdsssd..........',
  '....dwwrrrddsSd...........',
  '...dwwwwrwwwdSd...........',
  '..dwwwwwwwWWdd............',
  '..dwWWwwWWdd..............',
]);

// knife slash — 3 frames, arm sweeps forward with blade
def('t_knife1', [
  '..........dhhhd...........',
  '........ddhhhhhd..........',
  '.......dhhhhhhhhd.........',
  '.......dhHsssshhd.........',
  '.......dssssssShd.........',
  '.......dsdssdsSd..........',
  '.......dssssssSd..........',
  '........dsSSsSd..dd.......',
  '......ddrssSdd..dqed......',
  '.....drrrdsd...dssd.......',
  '....dwwrrrdd..dssd........',
  '...dwwwwrdwwdssSd.........',
  '..dwwwwwwwwwdsSd..........',
  '..dwwwwwwWdddd............',
  '..dwWWwwWWd...............',
  '..dwWdwwWd................',
  '...dd.ddd.................',
]);

def('t_knife2', [
  '..........dhhhd...........',
  '........ddhhhhhd..........',
  '.......dhhhhhhhhd.........',
  '.......dhHsssshhd.........',
  '.......dssssssShd.........',
  '.......dsdssdsSd..........',
  '.......dssssssSd..........',
  '........dsSSsSd...........',
  '......ddrssSdd............',
  '.....drrrdsd..............',
  '....dwwrrrddssssdqqeed....',
  '...dwwwwrdwwssSSddddd.....',
  '..dwwwwwwwwwddd...........',
  '..dwwwwwwWd...............',
  '..dwWWwwWWd...............',
  '..dwWdwwWd................',
  '...dd.ddd.................',
]);

def('t_knife3', [
  '..........dhhhd...........',
  '........ddhhhhhd..........',
  '.......dhhhhhhhhd.........',
  '.......dhHsssshhd.........',
  '.......dssssssShd.........',
  '.......dsdssdsSd..........',
  '.......dssssssSd..........',
  '........dsSSsSd...........',
  '......ddrssSdd............',
  '.....drrrdsd..............',
  '....dwwrrrdd..............',
  '...dwwwwrdww..............',
  '..dwwwwwwwwwdssssdqeed....',
  '..dwwwwwwWddsSSSddddd.....',
  '..dwWWwwWWddddd...........',
  '..dwWdwwWd................',
  '...dd.ddd.................',
]);

// grenade throw — arm arcs overhead
def('t_nade', [
  '.........dssd.............',
  '........dsSd..............',
  '.......dssdhhhd...........',
  '.......dsddhhhhhd.........',
  '......dsdhhhhhhhhd........',
  '......dsdhHsssshhd........',
  '......dSddssssssShd.......',
  '.......d.dsdssdsSd........',
  '.........dssssssSd........',
  '..........dsSSsSd.........',
  '........ddrssSdd..........',
  '.....ddrrrdsd.............',
  '....dwwwrrrdd.............',
  '...dwwwwwrdww.............',
  '..dwwwwwwwwwd.............',
  '..dwWWwwWWd...............',
  '...dd.ddd.................',
]);

// riding the slug — head + shoulders out of the hatch
def('t_ride', [
  '..........dhhhd...........',
  '........ddhhhhhd..........',
  '.......dhhhhhhhhd.........',
  '.......dhHsssshhd.........',
  '.......dssssssShd.........',
  '.......dsdssdsSd..........',
  '.......dssssssSd..........',
  '........dsSSsSd...........',
  '......ddrssSdd............',
  '.....drrrrrdd.............',
  '....dwwwwwwwd.............',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
]);

// ---- legs: 20x14, hip at top ----

def('l_stand', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '.....dggGdGggd......',
  '.....dgGd.dGgd......',
  '.....dgGd.dGgd......',
  '.....dgGd.dGgd......',
  '.....dgGd.dGgd......',
  '.....dkkd.dkkd......',
  '....dkkkd.dkkkd.....',
  '....dkkKd.dkkKd.....',
  '...dkkkKd.dkkkKd....',
  '...dkkkkd.dkkkkd....',
  '...ddddd...ddddd....',
  '....................',
]);

def('l_run1', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '....dggGgggGggd.....',
  '...dggGd..dGggd.....',
  '..dggGd....dGgd.....',
  '.dgGGd.....dGgd.....',
  '.dGGd......dGgd.....',
  'dkkd.......dkkd.....',
  'dkkkd......dkkkd....',
  'dkkKd.....dkkkKd....',
  'ddddd.....dkkkkd....',
  '...........ddddd....',
  '....................',
  '....................',
]);

def('l_run2', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '....dggGggGggd......',
  '...dggGddddGgd......',
  '..dggGd...dGgd......',
  '..dgGd....dGgd......',
  '..dGd.....dkkd......',
  '..dkkd....dkkkd.....',
  '..dkkkd...dkkKd.....',
  '..dkkKd...ddddd.....',
  '..ddddd.............',
  '....................',
  '....................',
  '....................',
]);

def('l_run3', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '.....dggGgGggd......',
  '.....dgGdddGgd......',
  '.....dgGd.dGgd......',
  '.....dgGddGgd.......',
  '.....dkkddkkd.......',
  '.....dkkkdkkkd......',
  '.....dkkKdkkKd......',
  '.....ddddddddd......',
  '....................',
  '....................',
  '....................',
  '....................',
]);

def('l_run4', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '.....dggGggGggd.....',
  '.....dgGdddGggd.....',
  '.....dgGd..dGggd....',
  '.....dgGd...dGgd....',
  '.....dkkd...dGgd....',
  '....dkkkd...dkkd....',
  '....dkkKd..dkkkd....',
  '....ddddd..dkkKd....',
  '...........ddddd....',
  '....................',
  '....................',
  '....................',
]);

def('l_run5', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '....dggGgggGggd.....',
  '...dggGd..dGgggd....',
  '..dggGd....dGggd....',
  '..dgGd......dGgd....',
  '..dkkd......dGgd....',
  '.dkkkd......dkkd....',
  '.dkkKd.....dkkkd....',
  '.ddddd.....dkkKd....',
  '...........ddddd....',
  '....................',
  '....................',
  '....................',
]);

def('l_run6', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '.....dggGgGggd......',
  '.....dgGdddGgd......',
  '....dggGd.dGgd......',
  '....dgGd..dGgd......',
  '....dGd...dkkd......',
  '....dkkd..dkkkd.....',
  '...dkkkd..dkkKd.....',
  '...dkkKd..ddddd.....',
  '...ddddd............',
  '....................',
  '....................',
  '....................',
]);

def('l_jump', [
  '......dgggggd.......',
  '.....dgggggggd......',
  '....dggGggGggd......',
  '...dggGddddGgd......',
  '..dggGd..dggGd......',
  '..dgGd..dggGd.......',
  '..dkkd..dgGd........',
  '.dkkkd..dkkd........',
  '.dkkKd.dkkkd........',
  '.ddddd.dkkKd........',
  '.......ddddd........',
  '....................',
  '....................',
  '....................',
]);

def('l_crouch', [
  '....dggggggggd......',
  '...dgggggggggggd....',
  '..dggGGdddGGgggd....',
  '..dkkd....dkkGgd....',
  '.dkkkd...dkkkkd.....',
  '.dkkKd...dkkKd......',
  '.ddddd...ddddd......',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
]);

// crouch torso — compact, rifle level with the ground
def('t_crouch', [
  '..........................',
  '..........................',
  '..........................',
  '..........dhhhd...........',
  '........ddhhhhhd..........',
  '.......dhhhhhhhhd.........',
  '.......dhHsssshhd.........',
  '.......dssssssShd.........',
  '.......dsdssdsSd..........',
  '.......dssssssSd..........',
  '........dsSSsSd...........',
  '......ddrssSddssd.........',
  '.....drrrrdsdssssdddddd...',
  '....dwwwwrdwdsSSdQZZZZZd..',
  '...dwwwwwwwwdsSdqqQQZdYd..',
  '...dwWWwwWWddkkdddddZd.d..',
  '....dd..dd...dd....dd.....',
]);

// whole-body deaths — thrown back off his feet
def('p_die1', [
  '..........................',
  '.....dd......dhhhd........',
  '....dssd..ddhhhhhhd.......',
  '....dsSd.dhhhhhhhhd.......',
  '.....dsddhHssssshd........',
  '.....dsdssssdssSd.........',
  '....dwwrrssssssd..........',
  '...dwwwwrrsSSsd...........',
  '..dwwwwwwwrdd.............',
  '..dwwwwwwwd.dggggd........',
  '..dwWWwwddggggggggd.......',
  '...ddddgggGGddddGgd.......',
  '....dggGGdd....dkkd.......',
  '....dkkd......dkkkd.......',
  '...dkkkd......dkkKd.......',
  '...dkKd.......ddddd.......',
  '...dddd...................',
]);

def('p_die2', [
  '..........................',
  '..........................',
  '..........................',
  '...dd.....dhhhhd..........',
  '..dssd..ddhhhhhhd.........',
  '..dsSd.dhhhhhhhhd.........',
  '...dsddhHssssshd..........',
  '...dwwrrsssdsSd...........',
  '..dwwwwrrsssSd.dgggd......',
  '.dwwwwwwwrddddggggggd.....',
  '.dwwwwwwwwggggGGddGggd....',
  '.dwWWwwWddggGGd...dkkd....',
  '..dddddggGGd.....dkkkd....',
  '......dkkd.......dkkKd....',
  '.....dkkkd.......ddddd....',
  '.....dkKdd................',
  '.....ddd..................',
]);

def('p_die3', [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '.....ddd.........dd.......',
  '...ddhhhdddddddddkkdd.....',
  '..dhhhssdwwwwwggdkkkkd....',
  '.dhHssssdwwwwwggggkkKd....',
  '.dssSSsrrwwwWWgggGkkkd....',
  '..ddddddddddddddddddd.....',
  '..........................',
]);

// =====================================================================
// REBEL SOLDIER — Gen. Moore-den's infantry. Drab coat, maroon fez,
// stubble, hunched Metal Slug posture. 22x24, faces right (toward the
// player when flipped). One-piece sprites.
// =====================================================================

def('e_stand', [
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd...........',
  '....dduuudd...........',
  '...duuuuuuud..........',
  '..duuuuuuuuudssd......',
  '..duuUuuuuudssssddd...',
  '..duuUuuuUdsSdZZZZd...',
  '..duuUuuuUdkSdqQZd....',
  '..duuUuuuUddddddd.....',
  '...duUdUUud...........',
  '...duuduuud...........',
  '...dVVddVVd...........',
  '...duud.duud..........',
  '...duud.duud..........',
  '...dkkd.dkkd..........',
  '..dkkkd.dkkkd.........',
  '..dkkKd.dkkKd.........',
  '..ddddd.ddddd.........',
]);

def('e_walk1', [
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd...........',
  '....dduuudd...........',
  '...duuuuuuud..........',
  '..duuuuuuuuudssd......',
  '..duuUuuuuudssssddd...',
  '..duuUuuuUdsSdZZZZd...',
  '..duuUuuuUdkSdqQZd....',
  '..duuUuuuUddddddd.....',
  '...duUdUUud...........',
  '...duuuuuud...........',
  '..dVVuudVVud..........',
  '..duud..duud..........',
  '.duud....duud.........',
  '.dkkd....dkkd.........',
  'dkkkd....dkkkd........',
  'dkkKd....dkkKd........',
  'ddddd....ddddd........',
]);

def('e_walk2', [
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd...........',
  '....dduuudd...........',
  '...duuuuuuud..........',
  '..duuuuuuuuudssd......',
  '..duuUuuuuudssssddd...',
  '..duuUuuuUdsSdZZZZd...',
  '..duuUuuuUdkSdqQZd....',
  '..duuUuuuUddddddd.....',
  '...duUdUUud...........',
  '...duuuuud............',
  '...dVVuVVd............',
  '...duuduud............',
  '...duududd............',
  '...dkkdkkd............',
  '..dkkkdkkkd...........',
  '..dkkKdkkKd...........',
  '..ddddddddd...........',
]);

def('e_walk3', [
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd...........',
  '....dduuudd...........',
  '...duuuuuuud..........',
  '..duuuuuuuuudssd......',
  '..duuUuuuuudssssddd...',
  '..duuUuuuUdsSdZZZZd...',
  '..duuUuuuUdkSdqQZd....',
  '..duuUuuuUddddddd.....',
  '...duUdUUud...........',
  '...duuuuuud...........',
  '..duVVudVVd...........',
  '..duud.duud...........',
  '..dudd..duud..........',
  '..dkkd..dkkd..........',
  '.dkkkd..dkkkd.........',
  '.dkkKd..dkkKd.........',
  '.ddddd..ddddd.........',
]);

// kneeling aim + fire
def('e_aim', [
  '......................',
  '......................',
  '......................',
  '......................',
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd...........',
  '....dduuuddssd........',
  '...duuuuuudssssddd....',
  '..duuuuuuudsSdZZZZd...',
  '..duuUuuuUdkSdqQZd....',
  '..duuUuuuUddddddd.....',
  '..duuUuuuuud..........',
  '...duUuuuuud..........',
  '...duuduuVVd..........',
  '...dVVduud............',
  '...duuddkkd...........',
  '..dkkkddkkkd..........',
  '..ddddddddddd.........',
]);

def('e_fire', [
  '......................',
  '......................',
  '......................',
  '......................',
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd...........',
  '....dduuuddssd........',
  '...duuuuuudsssdddd....',
  '..duuuuuuudsSdZZZd....',
  '..duuUuuuUdkSdqQZdo...',
  '..duuUuuuUddddddd.....',
  '..duuUuuuuud..........',
  '...duUuuuuud..........',
  '...duuduuVVd..........',
  '...dVVduud............',
  '...duuddkkd...........',
  '..dkkkddkkkd..........',
  '..ddddddddddd.........',
]);

// knife-charger lunge
def('e_knife1', [
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd..dd.......',
  '....dduuudd.dqed......',
  '...duuuuuuudssd.......',
  '..duuuuuuuudsd........',
  '..duuUuuuusssd........',
  '..duuUuuuUsSd.........',
  '..duuUuuuUdd..........',
  '..duuUuuuUd...........',
  '...duUdUUud...........',
  '...duuuuuud...........',
  '..dVVuudVVud..........',
  '..duud..duud..........',
  '.duud....duud.........',
  '.dkkd....dkkd.........',
  'dkkkd....dkkkd........',
  'dkkKd....dkkKd........',
  'ddddd....ddddd........',
]);

def('e_knife2', [
  '.......dmmmd..........',
  '......dmmmmmd.........',
  '......dmMMMmd.........',
  '.....dsssssSd.........',
  '.....dsdssdSd.........',
  '.....dsssssSd.........',
  '.....dsFSsFd..........',
  '......dsSSd...........',
  '....dduuudd...........',
  '...duuuuuuud..........',
  '..duuuuuuuussssdqeed..',
  '..duuUuuuusSSSddddd...',
  '..duuUuuuUddd.........',
  '..duuUuuuUd...........',
  '..duuUuuuUd...........',
  '...duUdUUud...........',
  '...duuuuuud...........',
  '..dVVuudVVud..........',
  '..duud..duud..........',
  '.duud....duud.........',
  '.dkkd....dkkd.........',
  'dkkkd....dkkkd........',
  'dkkKd....dkkKd........',
  'ddddd....ddddd........',
]);

// grenadier wind-up
def('e_nade', [
  '.........dssd.........',
  '........dsSd..........',
  '.......dssd...........',
  '.......dsddmmmd.......',
  '......dsddmmmmmd......',
  '......dSddmMMMmd......',
  '.......ddsssssSd......',
  '.........dsdssdSd.....',
  '.........dsssssSd.....',
  '.........dsFSsFd......',
  '..........dsSSd.......',
  '.......dduuudd........',
  '......duuuuuuud.......',
  '.....duuuuuuuuud......',
  '.....duuUuuuuuUd......',
  '.....duuUuuuuuUd......',
  '.....duUdUUud.........',
  '.....duuduuud.........',
  '.....dVVddVVd.........',
  '.....duud.duud........',
  '.....duud.duud........',
  '.....dkkd.dkkd........',
  '....dkkkd.dkkkd.......',
  '....ddddd.ddddd.......',
]);

// deaths — blown backwards, classic flail
def('e_die1', [
  '..............dd......',
  '....dd.......dssd.....',
  '...dssd.dmmmddsSd.....',
  '...dsSddmmmmmdsd......',
  '....dsddmMMMmdd.......',
  '....dsdsssssSd........',
  '.....ddsdssdSd........',
  '....duusssssSd........',
  '...duuudsSSdd.........',
  '..duuuuuudd...........',
  '..duuUuuuud...........',
  '..duuUuuuuud..........',
  '...duUdUuuud..........',
  '...duudduuVd..........',
  '...dVVd.dud.dggd......',
  '...duud.duddkkkd......',
  '...dkkd..ddkkKdd......',
  '..dkkkd...ddddd.......',
  '..dkKdd...............',
  '..dddd................',
  '......................',
  '......................',
  '......................',
  '......................',
]);

def('e_die2', [
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '....dd.........dd.....',
  '...dssd.dmmmd.dssd....',
  '...dsSddmmmmmddsSd....',
  '....dsddmMMMmdsd......',
  '....dsdsssssSdd.......',
  '.....ddsdssdSd........',
  '....duusssssSduud.....',
  '...duuuudsSdduuud.....',
  '..duuuuuuuuuuuuud.....',
  '..duuUuuuuuuuUud......',
  '...dkkdUUudkkd........',
  '..dkkkduuudkkkd.......',
  '..dkKddVVVddkKd.......',
  '..ddd.......ddd.......',
  '......................',
  '......................',
  '......................',
]);

def('e_die3', [
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......................',
  '......dd..............',
  '.....dmmd.......dd....',
  '..ddddssddddddddkkdd..',
  '.dmmdssssuuuuuudkkkkd.',
  '.dmMdsSSduuuuUUukkKKd.',
  '..dddddddddddddddddd..',
  '......................',
  '......................',
]);

// =====================================================================
// POW — bearded prisoner tied to a post. Freed: salutes, shuffles off.
// 20x26 including the post.
// =====================================================================

def('pow_tied1', [
  '.........dppd.......',
  '.........dpPd.......',
  '......dhhdpPd.......',
  '.....dhhhhpPdd......',
  '.....dhsssppdd......',
  '.....dsdsdsPd.......',
  '.....dssssppd.......',
  '.....dhhhhhpd.......',
  '.....dhhhhhdd.......',
  '......dhhhdpd.......',
  '....ddwwwwdpd.......',
  '...dwwwwwwwpdd......',
  '..dwwdwwwwdppd......',
  '..dwwtttttttpd......',
  '..dwwdwwwwdppd......',
  '..dwwtttttttpd......',
  '...dddwwwwdppd......',
  '.....dwwwwdpPd......',
  '.....dggggdpPd......',
  '.....dgdggdpPd......',
  '.....dgdggdpPd......',
  '.....dkdkkdpPd......',
  '....dkkdkkkdPd......',
  '....ddddddddPd......',
  '.........dpPd.......',
  '.........dddd.......',
]);

def('pow_tied2', [
  '.........dppd.......',
  '.........dpPd.......',
  '......dhhdpPd.......',
  '.....dhhhhpPdd......',
  '.....dhsssppdd......',
  '.....dsdsdsPd.......',
  '.....dssssppd.......',
  '.....dhhhhhpd.......',
  '.....dhhhhhdd.......',
  '......dhhhdpd.......',
  '....ddwwwwdpd.......',
  '...dwwwwwwwpdd......',
  '..dwwdwwwwdppd......',
  '..dwwtttttttpd......',
  '..dwwdwwwwdppd......',
  '..dwwtttttttpd......',
  '..ddddwwwwdppd......',
  '.....dwwwwdpPd......',
  '.....dggggdpPd......',
  '.....dggdgdpPd......',
  '.....dggdgdpPd......',
  '.....dkkdkdpPd......',
  '....dkkkdkkdPd......',
  '....ddddddddPd......',
  '.........dpPd.......',
  '.........dddd.......',
]);

def('pow_salute', [
  '....................',
  '....................',
  '......dhhd..dd......',
  '.....dhhhhddssd.....',
  '.....dhsssdssd......',
  '.....dsdsdssd.......',
  '.....dssssdd........',
  '.....dhhhhhd........',
  '.....dhhhhhd........',
  '......dhhhd.........',
  '....ddwwwwdd........',
  '...dwwwwwwwwd.......',
  '..dwwdwwwwdwwd......',
  '..dwwdwwwwdwwd......',
  '..dwWdwwwwdwWd......',
  '..dddwwwwwddd.......',
  '.....dwwWWd.........',
  '.....dwwWWd.........',
  '.....dggggd.........',
  '.....dgdggd.........',
  '.....dgdggd.........',
  '.....dkdkkd.........',
  '....dkkdkkkd........',
  '....dddddddd........',
  '....................',
  '....................',
]);

def('pow_walk1', [
  '....................',
  '....................',
  '......dhhd..........',
  '.....dhhhhd.........',
  '.....dhsssd.........',
  '.....dsdsdd.........',
  '.....dssssd.........',
  '.....dhhhhhd........',
  '.....dhhhhhd........',
  '......dhhhd.........',
  '....ddwwwwdd........',
  '...dwwwwwwwwd.......',
  '..dwwdwwwwdwwd......',
  '..dwwdwwwwdwwd......',
  '..dwWdwwwwdwWd......',
  '..dddwwwwwddd.......',
  '.....dwwWWd.........',
  '.....dggggd.........',
  '....dggdggd.........',
  '...dggd.dggd........',
  '...dgd...dgd........',
  '..dkkd...dkkd.......',
  '.dkkkd...dkkkd......',
  '.ddddd...ddddd......',
  '....................',
  '....................',
]);

def('pow_walk2', [
  '....................',
  '....................',
  '......dhhd..........',
  '.....dhhhhd.........',
  '.....dhsssd.........',
  '.....dsdsdd.........',
  '.....dssssd.........',
  '.....dhhhhhd........',
  '.....dhhhhhd........',
  '......dhhhd.........',
  '....ddwwwwdd........',
  '...dwwwwwwwwd.......',
  '..dwwdwwwwdwwd......',
  '..dwwdwwwwdwwd......',
  '..dwWdwwwwdwWd......',
  '..dddwwwwwddd.......',
  '.....dwwWWd.........',
  '.....dggggd.........',
  '.....dgdggd.........',
  '.....dgddgd.........',
  '.....dgd.dgd........',
  '.....dkkddkkd.......',
  '....dkkkdkkKd.......',
  '....dddddddd........',
  '....................',
  '....................',
]);

// =====================================================================
// THE MOORE SLUG — SV-001M. Squat steel tank, big treads, one-man hatch.
// Body 44x20 (two tread frames), turret 20x12 at three elevations.
// =====================================================================

def('slug_body1', [
  '...............ddddddddddddd................',
  '.............ddbbbbbbbbbbbbbdd..............',
  '...........ddbbbbbbbbbbbbbbbbbdd............',
  '..........dbbbbbbbbbbbbbbbbbbbbbdd..........',
  '.........dbbbbbbbbbbbbbbbbbbbbbbbbd.........',
  '..dddddddbbbbbBBBBBBBBBBBBBBBbbbbbbddddddd..',
  '.dbbbbbbbbbyybbBBBBBBBBBBBBBbbbbbbbbbbbbbbd.',
  'dbbbbbbbbbbyybbbbbbbbbbbbbbbbbbbbbbbbbbbbbbd',
  'dbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBd',
  'dbBNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNBBd',
  '.ddZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZdd..',
  '.dZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZZd..',
  'dZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZZZZd.',
  'dZqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqZZZZd.',
  'dZqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqZZZZd.',
  'dZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZZZd..',
  '.dZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZZd..',
  '.ddZdZdZdZdZdZdZdZdZdZdZdZdZdZdZdZdZdZddd...',
  '..dddddddddddddddddddddddddddddddddddddd....',
  '............................................',
]);

def('slug_body2', [
  '...............ddddddddddddd................',
  '.............ddbbbbbbbbbbbbbdd..............',
  '...........ddbbbbbbbbbbbbbbbbbdd............',
  '..........dbbbbbbbbbbbbbbbbbbbbbdd..........',
  '.........dbbbbbbbbbbbbbbbbbbbbbbbbd.........',
  '..dddddddbbbbbBBBBBBBBBBBBBBBbbbbbbddddddd..',
  '.dbbbbbbbbbyybbBBBBBBBBBBBBBbbbbbbbbbbbbbbd.',
  'dbbbbbbbbbbyybbbbbbbbbbbbbbbbbbbbbbbbbbbbbbd',
  'dbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBd',
  'dbBNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNBBd',
  '.ddZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZdd..',
  '.dZZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZd..',
  'dZZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZZZd.',
  'dZZqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqZZZd.',
  'dZZqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqqQZZQqZZZd.',
  'dZZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZqQQqZZZd..',
  '.dZZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZqqZZZZd..',
  '.dddZdZdZdZdZdZdZdZdZdZdZdZdZdZdZdZdZddZd...',
  '..dddddddddddddddddddddddddddddddddddddd....',
  '............................................',
]);

def('slug_tur_f', [
  '......ddddddd.............',
  '....ddbbbbbbbdd...........',
  '...dbbbbbbbbbbbd..........',
  '..dbbccbbbbbbbbd..........',
  '..dbccbbbbbbbbbddddddddd..',
  '..dbcbbbbbbbbbbqqqqqqqqZd.',
  '..dbbbbbbbbbBBbZZZZZZZZZd.',
  '..dbbbbbbbbbBBbddddddddd..',
  '...dbbbbbbbBBbd...........',
  '....ddBBBBBBdd............',
  '......dddddd..............',
  '..........................',
]);

def('slug_tur_u45', [
  '..................dd......',
  '................ddZZd.....',
  '..............dqqZZd......',
  '............ddqZZZd.......',
  '......dddddddqZZd.........',
  '....ddbbbbbbqZZd..........',
  '...dbbccbbbbZZd...........',
  '..dbbccbbbbbbbd...........',
  '..dbcbbbbbbbbBd...........',
  '..dbbbbbbbbBBbd...........',
  '...ddBBBBBBBdd............',
  '.....ddddddd..............',
]);

def('slug_tur_u90', [
  '.........dqZd.............',
  '.........dZZd.............',
  '.........dZZd.............',
  '.........dZZd.............',
  '......dddbZZbddd..........',
  '....ddbbbbZZbbbdd.........',
  '...dbbccbbbbbbbbd.........',
  '..dbbccbbbbbbbbbd.........',
  '..dbcbbbbbbbbbBbd.........',
  '...dbbbbbbbbbBBd..........',
  '....ddBBBBBBBdd...........',
  '......ddddddd.............',
]);

// =====================================================================
// R-MOORE COPTER — rebel gunship. 36x22, two rotor frames.
// =====================================================================

def('heli1', [
  'dddddddddddddddddddddddddddddddd....',
  '...............dqd..................',
  '...............dZd..................',
  '..........ddddduuudddd..............',
  '.......dduuuuuuuuuuuuuudd...........',
  '.....dduuuuuuuuuuuuuuuuuudd.........',
  '....duuuuccccuuuuuuuuuuuuuud........',
  '...duuuuccccCuuuUUUuuuuuuuuuddd.....',
  '...duuucccCCuuuuUUUuuuuuuuuuuuuddd..',
  '...duuuuccCuuuuuuuuuuuuuuuuuuuuuVdd.',
  '...duuuuuuuuuuuuuuuUUUUuuuuuVVdddd..',
  '....duuuuuuuUUUUUUUUUUUUVVVVdddd....',
  '.....dduuVVVVVVVVVVVVVVVdddd........',
  '.......ddddZQZdVVVVVdddd............',
  '..........dZQZdddddd................',
  '..........dZQZd.....................',
  '.........ddZQZdd....................',
  '......dddZZZQZZZddd.................',
  '.....dZZZZZZQZZZZZZd................',
  '.....ddddddddddddddd................',
  '....................................',
  '....................................',
]);

def('heli2', [
  '...........ddddddddddd..............',
  '...............dqd..................',
  '...............dZd..................',
  '..........ddddduuudddd..............',
  '.......dduuuuuuuuuuuuuudd...........',
  '.....dduuuuuuuuuuuuuuuuuudd.........',
  '....duuuuccccuuuuuuuuuuuuuud........',
  '...duuuuccccCuuuUUUuuuuuuuuuddd.....',
  '...duuucccCCuuuuUUUuuuuuuuuuuuuddd..',
  '...duuuuccCuuuuuuuuuuuuuuuuuuuuuVdd.',
  '...duuuuuuuuuuuuuuuUUUUuuuuuVVdddd..',
  '....duuuuuuuUUUUUUUUUUUUVVVVdddd....',
  '.....dduuVVVVVVVVVVVVVVVdddd........',
  '.......ddddZQZdVVVVVdddd............',
  '..........dZQZdddddd................',
  '..........dZQZd.....................',
  '.........ddZQZdd....................',
  '......dddZZZQZZZddd.................',
  '.....dZZZZZZQZZZZZZd................',
  '.....ddddddddddddddd................',
  '....................................',
  '....................................',
]);

// =====================================================================
// PICKUPS — Metal Slug style medals & loot, 14x12ish
// =====================================================================

def('pk_H', [
  '....dddddd....',
  '..ddyyyyyydd..',
  '.dyyYYYYYYyyd.',
  '.dyYxxYYxxYyd.',
  'dyyYxxYYxxYyyd',
  'dyyYxxxxxxYyyd',
  'dyyYxxYYxxYyyd',
  '.dyYxxYYxxYyd.',
  '.dyyYYYYYYyyd.',
  '..ddyyyyyydd..',
  '....dddddd....',
  '..............',
]);

def('pk_R', [
  '....dddddd....',
  '..ddyyyyyydd..',
  '.dyyYYYYYYyyd.',
  '.dyYxxxxYYYyd.',
  'dyyYxxYYxxYyyd',
  'dyyYxxxxxYYyyd',
  'dyyYxxYxxYYyyd',
  '.dyYxxYYxxYyd.',
  '.dyyYYYYYYyyd.',
  '..ddyyyyyydd..',
  '....dddddd....',
  '..............',
]);

def('pk_nade', [
  '..dddddddddd..',
  '.dttttttttttd.',
  'dttTdrrrrdTttd',
  'dttdRrrrrRdttd',
  'dttdRrOOrRdttd',
  'dttdRrrrrRdttd',
  'dttTdRRRRdTttd',
  'dtttttttttttd.',
  'dTTTTTTTTTTTd.',
  '.ddddddddddd..',
  '..............',
  '..............',
]);

def('pk_food', [
  '..............',
  '....ddddd.....',
  '..ddoooooddd..',
  '.dooyyyyyoood.',
  'doyyyyyyyyyod.',
  'doyyYYYYYyyodd',
  'dooyYYYYYyoode',
  '.dooyyyyyoodd.',
  '..ddoooooddee.',
  '....ddddd.dd..',
  '..............',
  '..............',
]);

def('pk_coin', [
  '....dddd......',
  '..ddyyyydd....',
  '.dyYYYYYYyd...',
  'dyYyyyyyyYyd..',
  'dyYyYYyyyYyd..',
  'dyYyyYyyyYyd..',
  'dyYyYYYyyYyd..',
  'dyYyyyyyyYyd..',
  '.dyYYYYYYyd...',
  '..ddyyyydd....',
  '....dddd......',
  '..............',
]);

// =====================================================================
// PROJECTILES & SMALL FX
// =====================================================================

def('muzzle1', [
  '...f....',
  '.fxxf...',
  'fxxxxof.',
  '.fxxf...',
  '...f....',
  '........',
]);

def('muzzle2', [
  '..o..f..',
  '.fxof...',
  'oxxxxxof',
  '.fxof...',
  '..o..f..',
  '........',
]);

def('ebullet1', [
  '..dd..',
  '.dood.',
  'doxxod',
  'doxxod',
  '.dood.',
  '..dd..',
]);

def('ebullet2', [
  '..dd..',
  '.dxod.',
  'dxoxod',
  'doxoxd',
  '.doxd.',
  '..dd..',
]);

def('grenade1', [
  '..dyd...',
  '.ddddd..',
  '.djJjd..',
  'djjjJjd.',
  'djjJJjd.',
  'djJJJjd.',
  '.djJjd..',
  '..ddd...',
]);

def('grenade2', [
  '...dyd..',
  '..ddddd.',
  '..djJjd.',
  '.djjjJjd',
  '.djJjJjd',
  '.djJJJjd',
  '..djJjd.',
  '...ddd..',
]);

def('rocket', [
  '.....ddd....',
  'doodqqQZddd.',
  'dxoqqqQQZZd.',
  'doodqqQZddd.',
  '.....ddd....',
  '............',
]);

def('shell', [
  '..dddd..',
  '.dZZZZd.',
  'dZqqQZZd',
  'dZqQQZZd',
  '.dZZZZd.',
  '..dddd..',
]);

def('pbullet', [
  '.dd.',
  'dyxd',
  'dxyd',
  '.dd.',
]);

// =====================================================================
// TILES — 16x16
// =====================================================================

def('tile_grass', [
  'jjJjjjjJJjjjjJjj',
  'jJjjaJjjjaJjjjja',
  'aajaaajaaaajaaaa',
  'aaaaaAaaaaaaaAaa',
  'aaAaaaaaaAaaaaaa',
  'aaaaaaAaaaaaaaaa',
  'aAaaaaaaaaaAaaaA',
  'aaaaaAaaaaaaaaaa',
  'aaaaaaaaAaaaaaAa',
  'aaAaaaaaaaaaaaaa',
  'aaaaaaaAaaaAaaaa',
  'aAaaaaaaaaaaaaaa',
  'aaaaAaaaaaaaaAaa',
  'aaaaaaaaaAaaaaaa',
  'aaAaaaaaaaaaaaaa',
  'aaaaaaAaaaaaaAaa',
]);

def('tile_dirt', [
  'aaaaaAaaaaaaaAaa',
  'aaAaaaaaaAaaaaaa',
  'aaaaaaaaaaaaaaaa',
  'aAaaaaAaaaaAaaaA',
  'aaaaaaaaaaaaaaaa',
  'aaaaAaaaaAaaaaAa',
  'aaAaaaaaaaaaaaaa',
  'aaaaaaaAaaaAaaaa',
  'aAaaaaaaaaaaaaaa',
  'aaaaAaaaaaaaaAaa',
  'aaaaaaaaaAaaaaaa',
  'aaAaaaaaaaaaaaaa',
  'aaaaaaAaaaaaaAaa',
  'aaaaaaaaaaAaaaaa',
  'aAaaaAaaaaaaaaaa',
  'aaaaaaaaaaaaAaaa',
]);

def('tile_plank', [
  'dddddddddddddddd',
  'pppppdppppppppdp',
  'ppPppdpppPppppdp',
  'PPPPPdPPPPPPPPdP',
  'dddddddddddddddd',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]);

def('tile_crate', [
  'dddddddddddddddd',
  'dppppppppppppppd',
  'dpPttttttttttPpd',
  'dptdttttttttdtpd',
  'dpttddttttddttpd',
  'dpttttddddttttpd',
  'dpttttddddttttpd',
  'dpttddttttddttpd',
  'dptdttttttttdtpd',
  'dpPtttttttttdPpd',
  'dpttttttttttttpd',
  'dpPttttttttttPpd',
  'dppppppppppppppd',
  'dddddddddddddddd',
  'dPPPPPPPPPPPPPPd',
  'dddddddddddddddd',
]);

def('tile_sandbag', [
  '.ddddddd.ddddddd',
  'dtttttttdttttttt',
  'dtttTTttdtttTTtt',
  'dtTttttTdtTttttT',
  'dTTTTTTTdTTTTTTT',
  'ddddddddddddddddd'.slice(0, 16),
  'dtttttdtttttttdt',
  'dttTTtdtttTTttdt',
  'dtTtttdtTttttTdt',
  'dTTTTTdTTTTTTTdT',
  'dddddddddddddddd',
  '.ddddddd.ddddddd',
  'dtttttttdttttttt',
  'dttTTtttdttTTttt',
  'dTTTTTTTdTTTTTTT',
  'dddddddddddddddd',
]);

def('tile_stone', [
  'iiiiiiIiiiiiiiIi',
  'iIiiiiiiiIiiiiii',
  'iiiiIiiiiiiiIiii',
  'IIiiiiiIIiiiiiII',
  'dddddddddddddddd',
  'iiIiiiiiiiIiiiii',
  'iiiiiIiiiiiiiiIi',
  'iIiiiiiiIiiiiiii',
  'IIiiIiiiiiIIiiii',
  'dddddddddddddddd',
  'iiiiiiIiiiiiiIii',
  'iIiiiiiiiIiiiiii',
  'iiiIiiiiiiiiIiii',
  'IiiiiiIIiiiiiiII',
  'dddddddddddddddd',
  'iiiiIiiiiiiIiiii',
]);

def('tile_bridge', [
  'dddddddddddddddd',
  'pppppppdpppppppp',
  'ppPppppdpppppPpp',
  'PPPPPPPdPPPPPPPP',
  'dddddddddddddddd',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
  '.dPd........dPd.',
]);

// =====================================================================
// PROPS
// =====================================================================

def('palm', [
  '..........ddjjdd....................',
  '.......ddjjjjjjjdd..................',
  '.....djjjjJJjjjjjjdd................',
  '...djjjJJJjjjJJjjjjjdd..............',
  '..djjJJJdddjjjjJJjjjjjd.............',
  '.djjJJd...ddjjjjJJJjjjjd............',
  '.djJd......ddJjjjjJJjjjjd...........',
  '..dd....ddjjjJJdjjjjJjjjd...........',
  '......djjjjJJd..dJjjjjjd............',
  '....djjjJJd......dJjjd..............',
  '...djjJd...dkd....dd................',
  '...djd....dkkkd.....................',
  '...dd.....dkKkd.....................',
  '..........dkkKd.....................',
  '..........dkKkd.....................',
  '.........dkkKkd.....................',
  '.........dkKkkd.....................',
  '.........dkkKkd.....................',
  '........dkkKkkd.....................',
  '........dkKkkKd.....................',
  '........dkkKkkd.....................',
  '.......dkkKkkKd.....................',
  '.......dkKkkKkd.....................',
  '.......dkkKkkkd.....................',
  '......ddddddddd.....................',
]);

def('bush', [
  '......ddjjdd............',
  '...ddjjjjjjjdd..........',
  '..djjJJjjjJjjjdd........',
  '.djjjjjjJjjjJjjjd.......',
  'djJJjjJjjjjjjjJjjd......',
  'djjjJjjjjJJjjjjjjd......',
  'dJJjjjJJjjjjJJjJjd......',
  '.dJJJjjjjJJjjjJJd.......',
  '..ddJJJJjjjjJJdd........',
  '....ddddJJJddd..........',
  '........................',
  '........................',
]);

def('barrel', [
  '.dddddddd...',
  'dqiiiiiiqd..',
  'dZqqqqqqZd..',
  'diiiiiiiid..',
  'diiIiiIiid..',
  'dZqqqqqqZd..',
  'diiiiiiiid..',
  'diIiiiiIid..',
  'diiiiIiiid..',
  'dZqqqqqqZd..',
  'dIIIIIIIId..',
  '.dddddddd...',
]);

def('sign', [
  '.dddddddddddddddddddd...',
  '.dppppppppppppppppppd...',
  '.dpTTpTpTTpTpTTpTTppd...',
  '.dpTpTpTpTpTpTpppTppd...',
  '.dpTTpTpTpTpTTppTTppd...',
  '.dppppppppppppppppppd...',
  '.dddddddddddddddddddd...',
  '........dPPd............',
  '........dPPd............',
  '........dPPd............',
  '........dPPd............',
  '........dddd............',
]);

def('fence', [
  'dpd....dpd....dp',
  'dppddddppddddpp.'.slice(0, 16),
  'dppppppppppppppd',
  'dpPd...dpPd...dp',
  'dpPd...dpPd...dp',
  'dppppppppppppppd',
  'dpPd...dpPd...dp',
  'dpPd...dpPd...dp',
  'dpPd...dpPd...dp',
  'ddd....ddd....dd',
  '................',
  '................',
]);

def('cloud', [
  '..........xxxx..........xx......',
  '......xxxxxxxxxxx....xxxxxxx....',
  '...xxxxxxxxxxxxxxxxxxxxxxxxxxx..'.slice(0, 32),
  '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.slice(0, 32),
  '.xxxxxxxxxxxxxxxxxxxxxxxxxxxx..',
  '....xxxxxxx....xxxxxxxxxx.......',
  '................................',
]);

// =====================================================================
// BAKE EVERYTHING — plus horizontally flipped and white-flash variants.
// =====================================================================

const SPRF = {};  // flipped
const SPRWF = {}; // flipped + white

function flipCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

export function initSprites() {
  for (const [name, rows] of defs) {
    const c = bake(rows);
    SPR[name] = c;
    SPRF[name] = flipCanvas(c);
    SPRW[name] = bakeWhite(c);
    SPRWF[name] = flipCanvas(SPRW[name]);
  }
  bakeBoss();
  bakeHut();
}

// draw with integer snap; flip mirrors in place around the sprite box
export function drawSprite(g, name, x, y, flip = false, white = false) {
  const map = white ? (flip ? SPRWF : SPRW) : (flip ? SPRF : SPR);
  const c = map[name];
  if (!c) return;
  g.drawImage(c, Math.round(x), Math.round(y));
}

export function sprW(name) { return SPR[name] ? SPR[name].width : 0; }
export function sprH(name) { return SPR[name] ? SPR[name].height : 0; }

const TILE_MAP = {
  1: 'tile_grass', 2: 'tile_dirt', 3: 'tile_plank', 4: 'tile_crate',
  5: 'tile_sandbag', 6: 'tile_stone', 7: 'tile_bridge',
};
export function drawTileId(g, id, x, y) {
  const n = TILE_MAP[id];
  if (n) g.drawImage(SPR[n], x, y);
}

// ---- tiny deterministic noise ----
export function hashNoise(i, salt = 0) {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177 | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

// =====================================================================
// BOSS — the "Iron Moore-den", a hulking artillery crawler. Procedural
// pixel build: layered steel, rivets, gold M crest, glass cockpit.
// =====================================================================

export const BOSS = { body: null, bodyW: null, tread: [], cannon: null, W: 118, H: 74 };

function px(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }

function bakeBoss() {
  const W = BOSS.W, H = BOSS.H;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const P = PAL;

  // main hull — stepped armored slabs, sloped at the front (left)
  px(g, 10, 24, 100, 28, P.d);
  px(g, 12, 26, 96, 24, P.b);
  px(g, 12, 40, 96, 10, P.B);
  px(g, 12, 47, 96, 3, P.N);
  // sloped nose plate
  for (let i = 0; i < 12; i++) {
    px(g, 10 - i, 26 + i * 2, 4, 28 - i * 2, i % 3 === 0 ? P.d : P.B);
  }
  // upper deck
  px(g, 30, 12, 74, 14, P.d);
  px(g, 32, 14, 70, 10, P.b);
  px(g, 32, 20, 70, 4, P.B);
  // command tower + cockpit glass
  px(g, 74, 2, 30, 12, P.d);
  px(g, 76, 4, 26, 8, P.B);
  px(g, 78, 5, 12, 6, P.d);
  px(g, 79, 6, 10, 4, P.c);
  px(g, 79, 8, 10, 2, P.C);
  // panel seams
  px(g, 40, 26, 1, 22, P.N); px(g, 64, 26, 1, 22, P.N); px(g, 88, 26, 1, 22, P.N);
  px(g, 50, 14, 1, 10, P.N); px(g, 72, 14, 1, 10, P.N);
  // rivets
  for (let x = 16; x < 106; x += 8) { px(g, x, 27, 1, 1, P.q); px(g, x, 45, 1, 1, P.N); }
  for (let x = 34; x < 100; x += 8) px(g, x, 15, 1, 1, P.q);
  // gold M crest
  px(g, 46, 30, 14, 10, P.d);
  px(g, 47, 31, 12, 8, P.Y);
  px(g, 48, 32, 2, 6, P.y); px(g, 56, 32, 2, 6, P.y);
  px(g, 50, 33, 1, 2, P.y); px(g, 55, 33, 1, 2, P.y);
  px(g, 51, 34, 1, 2, P.y); px(g, 54, 34, 1, 2, P.y);
  px(g, 52, 35, 2, 2, P.y);
  // exhaust stacks
  px(g, 96, 4, 6, 10, P.d); px(g, 97, 5, 4, 8, P.Z); px(g, 97, 5, 4, 2, P.Q);
  px(g, 104, 6, 6, 8, P.d); px(g, 105, 7, 4, 6, P.Z); px(g, 105, 7, 4, 2, P.Q);
  BOSS.body = c;
  BOSS.bodyW = bakeWhite(c);

  // treads — two frames, offset lug pattern
  for (let f = 0; f < 2; f++) {
    const t = document.createElement('canvas');
    t.width = W; t.height = 24; // sits at H-24
    const tg = t.getContext('2d');
    px(tg, 2, 2, 114, 20, P.d);
    px(tg, 4, 4, 110, 16, P.Z);
    // road wheels
    for (let i = 0; i < 7; i++) {
      const wx = 8 + i * 15;
      px(tg, wx, 7, 10, 10, P.d);
      px(tg, wx + 1, 8, 8, 8, P.Q);
      px(tg, wx + 3, 10, 4, 4, P.Z);
      px(tg, wx + 4, 11, 2, 2, P.q);
    }
    // lugs around the rim
    for (let x = 4 + f * 3; x < 112; x += 6) {
      px(tg, x, 2, 3, 2, P.Q);
      px(tg, x + 3, 20, 3, 2, P.Q);
    }
    BOSS.tread.push(t);
  }

  // the great cannon — drawn pointing left (toward the player)
  const cn = document.createElement('canvas');
  cn.width = 52; cn.height = 18;
  const cg = cn.getContext('2d');
  px(cg, 30, 1, 22, 16, P.d);
  px(cg, 32, 3, 18, 12, P.B);
  px(cg, 32, 10, 18, 5, P.N);
  px(cg, 2, 4, 30, 10, P.d);
  px(cg, 2, 6, 30, 6, P.Z);
  px(cg, 2, 6, 30, 2, P.Q);
  px(cg, 0, 3, 6, 12, P.d);
  px(cg, 1, 5, 4, 8, P.Z);
  px(cg, 1, 5, 4, 3, P.Q);
  BOSS.cannon = cn;
}

// =====================================================================
// HUT — village shack, procedural planks + thatch roof. 72x56.
// =====================================================================

export const HUT = { c: null, W: 72, H: 56 };

function bakeHut() {
  const c = document.createElement('canvas');
  c.width = HUT.W; c.height = HUT.H;
  const g = c.getContext('2d');
  const P = PAL;
  // walls
  px(g, 8, 22, 56, 34, P.d);
  px(g, 10, 24, 52, 32, P.p);
  for (let y = 28; y < 56; y += 6) px(g, 10, y, 52, 1, P.d);
  for (let y = 25; y < 56; y += 6) px(g, 10, y + 1, 52, 2, P.P);
  px(g, 22, 24, 1, 32, P.d); px(g, 46, 24, 1, 32, P.d);
  // doorway
  px(g, 30, 34, 14, 22, P.d);
  px(g, 32, 36, 10, 20, '#241a10');
  // window
  px(g, 50, 30, 9, 8, P.d);
  px(g, 51, 31, 7, 6, '#241a10');
  px(g, 51, 33, 7, 1, P.P); px(g, 54, 31, 1, 6, P.P);
  // thatch roof, overhanging
  for (let i = 0; i < 5; i++) {
    const y = 6 + i * 4;
    const inset = 8 - i * 2;
    px(g, inset, y, 72 - inset * 2, 5, P.d);
    px(g, inset + 1, y + 1, 70 - inset * 2, 3, i % 2 ? P.t : P.T);
  }
  px(g, 0, 22, 72, 3, P.d);
  px(g, 1, 22, 70, 2, P.K);
  // straggly straw ends
  for (let x = 2; x < 70; x += 3) {
    if (hashNoise(x, 7) > 0.5) px(g, x, 25, 1, 2 + Math.floor(hashNoise(x, 9) * 3), P.T);
  }
  HUT.c = c;
}

// =====================================================================
// EXPLOSIONS & SMOKE — procedural, Metal Slug orange/white/black
// =====================================================================

function pxCircle(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}

// t: 0..1 lifetime, seed for jitter, size ~ max radius
export function drawBoom(g, cx, cy, t, size = 16, seed = 1) {
  cx = Math.round(cx); cy = Math.round(cy);
  if (t < 0.18) { // white flash core
    pxCircle(g, cx, cy, Math.max(2, size * (t / 0.18) * 0.7), PAL.x);
    return;
  }
  if (t < 0.62) { // fireball with ragged rim
    const k = (t - 0.18) / 0.44;
    const r = size * (0.5 + 0.5 * k);
    pxCircle(g, cx, cy, r, PAL.O);
    pxCircle(g, cx - r * 0.15, cy - r * 0.2, r * 0.75, PAL.o);
    pxCircle(g, cx - r * 0.2, cy - r * 0.28, r * 0.42, PAL.y);
    if (k < 0.5) pxCircle(g, cx - r * 0.2, cy - r * 0.3, r * 0.2, PAL.x);
    // ragged flame tongues
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + seed;
      const rr = r * (0.9 + hashNoise(i, seed * 31) * 0.45);
      pxCircle(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8, Math.max(1, r * 0.22 * (1 - k * 0.5)), i % 2 ? PAL.o : PAL.O);
    }
    // dark smoke starting to curl off the top
    if (k > 0.5) {
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI * (0.25 + i * 0.17);
        pxCircle(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.3, PAL.n);
      }
    }
    return;
  }
  { // dissipating smoke ring
    const k = (t - 0.62) / 0.38;
    const r = size * (1 + k * 0.5);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + seed * 2;
      const rr = r * (0.85 + hashNoise(i, seed * 17) * 0.35);
      const pr = Math.max(1, size * 0.32 * (1 - k));
      pxCircle(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8 - k * size * 0.4, pr, i % 2 ? PAL.n : PAL.z);
    }
  }
}

export function drawPuff(g, cx, cy, t, size = 5, seed = 1) {
  const r = Math.max(1, size * (0.4 + 0.6 * t));
  pxCircle(g, cx, cy - t * 6, r, t < 0.4 ? PAL.z : PAL.n);
  pxCircle(g, cx - r * 0.3, cy - t * 6 - r * 0.3, Math.max(1, r * 0.5), PAL.z);
}

// =====================================================================
// PARALLAX BACKGROUND — dawn sky, far ridge, jungle wall
// =====================================================================

const SKY_BANDS = [
  ['#2e4a78', 0.00], ['#3c5c88', 0.16], ['#597698', 0.30],
  ['#8898a4', 0.44], ['#c8ae94', 0.58], ['#e8c890', 0.70],
  ['#f4d898', 0.80], ['#f8e4b0', 1.00],
];

export function drawSky(g, W, H, frame) {
  let prev = 0;
  for (let i = 0; i < SKY_BANDS.length; i++) {
    const [col, end] = SKY_BANDS[i];
    const y0 = Math.round(prev * H), y1 = Math.round(end * H);
    g.fillStyle = col;
    g.fillRect(0, y0, W, y1 - y0);
    // dithered seam
    if (i > 0) {
      g.fillStyle = col;
      for (let x = 0; x < W; x += 2) g.fillRect(x + (y0 % 2), y0 - 1, 1, 1);
    }
    prev = end;
  }
  // sun disc hanging in the dawn haze
  pxCircle(g, W * 0.72, H * 0.47, 14, '#f8ecd0');
  pxCircle(g, W * 0.72, H * 0.47, 11, '#fdf6e0');
}

export function drawClouds(g, camX, W, frame) {
  const c = SPR.cloud;
  if (!c) return;
  const off = Math.floor(camX * 0.08 + frame * 0.02);
  for (let i = 0; i < 5; i++) {
    const x = ((i * 147 - off) % (W + 80) + (W + 80)) % (W + 80) - 60;
    const y = 12 + (i * 37) % 46;
    g.globalAlpha = 0.5;
    g.drawImage(c, Math.round(x), y);
    g.globalAlpha = 1;
  }
}

export function drawRidge(g, camX, W, H) {
  // two overlapping mountain silhouettes
  const layers = [
    { p: 0.15, base: H * 0.62, amp: 26, col: '#6a7890', salt: 3 },
    { p: 0.25, base: H * 0.66, amp: 20, col: '#4e5f74', salt: 8 },
  ];
  for (const L of layers) {
    g.fillStyle = L.col;
    const off = camX * L.p;
    for (let x = 0; x < W; x++) {
      const wx = Math.floor(x + off);
      const seg = Math.floor(wx / 46);
      const f = (wx % 46) / 46;
      const h0 = hashNoise(seg, L.salt) * L.amp;
      const h1 = hashNoise(seg + 1, L.salt) * L.amp;
      // triangular peaks
      const h = f < 0.5 ? h0 + (h1 * 0.3 + L.amp * 0.7 - h0) * (f * 2) : (h1 * 0.3 + L.amp * 0.7) + (h1 - (h1 * 0.3 + L.amp * 0.7)) * ((f - 0.5) * 2);
      const top = Math.round(L.base - h);
      g.fillRect(x, top, 1, H - top);
    }
  }
}

export function drawJungleWall(g, camX, W, H, groundY) {
  // dense canopy band behind the playfield
  const off = camX * 0.5;
  for (let x = 0; x < W; x++) {
    const wx = Math.floor(x + off);
    const h = 34 + Math.floor(
      hashNoise(Math.floor(wx / 13), 21) * 14 +
      hashNoise(Math.floor(wx / 5), 22) * 7 +
      hashNoise(wx, 23) * 3);
    const top = groundY - h;
    g.fillStyle = PAL.L;
    g.fillRect(x, top, 1, h);
    g.fillStyle = PAL.J;
    g.fillRect(x, top, 1, 3 + Math.floor(hashNoise(wx, 24) * 4));
    if (hashNoise(wx, 25) > 0.86) {
      g.fillStyle = PAL.j;
      g.fillRect(x, top + 1, 1, 2);
    }
    if (hashNoise(wx, 26) > 0.93) {
      g.fillStyle = '#0f2410';
      g.fillRect(x, top + 8 + Math.floor(hashNoise(wx, 27) * (h - 12)), 1, 3);
    }
  }
}
