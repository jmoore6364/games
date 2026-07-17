// The land of Moorlach: zones, shops, dialogue, story.
// Maps are built with a tiny builder DSL rather than giant ASCII blocks.
//
// Tile legend:
//   .  empty        #  solid        %  solid (dark)   *  breakable
//   =  platform     H  ladder       ~  shallow water (harmful)
//   W  deep water (deadly)          ^  spikes
//   t  candle (whip for hearts)     g/f/c/w/|  decoration

export const TILE = 16;

function mk(w, h = 15) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const b = {
    w, h, g,
    put(x, y, ch) { if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = ch; return b; },
    fill(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) b.put(x, y, ch); return b; },
    ground(x0, x1, top = h - 3) { return b.fill(x0, top, x1, h - 1, '#'); },
    plat(x, w2, y) { return b.fill(x, y, x + w2 - 1, y, '='); },
    ladder(x, y0, y1) { return b.fill(x, y0, x, y1, 'H'); },
    candles(y, ...xs) { xs.forEach((x) => b.put(x, y, 't')); return b; },
    deco(ch, y, ...xs) { xs.forEach((x) => b.put(x, y, ch)); return b; },
    rows() { return g.map((r) => r.join('')); },
  };
  return b;
}

// ============================== ITEMS ==============================

export const WHIPS = [
  { id: 'leather', name: 'LEATHER WHIP', dmg: 1, reach: 26, color: '#8a6a3a' },
  { id: 'chain', name: 'CHAIN WHIP', dmg: 2, reach: 30, color: '#a8a8b8' },
  { id: 'morningstar', name: 'MORNING STAR', dmg: 3, reach: 36, color: '#d8d8e8' },
  { id: 'flame', name: 'FLAME WHIP', dmg: 4.5, reach: 42, color: '#f8b800' },
  { id: 'blood', name: 'BLOOD WHIP', dmg: 6, reach: 44, color: '#c03028' },
];

export const SUBS = {
  dagger: { name: 'DAGGER', cost: 1, icon: 'dagger_i' },
  axe: { name: 'BATTLE AXE', cost: 2, icon: 'axe_i' },
  holywater: { name: 'HOLY WATER', cost: 2, icon: 'holy_i' },
  cross: { name: 'GOLDEN CROSS', cost: 3, icon: 'cross_i' },
};

export const ITEMS = {
  stake: { name: 'OAK STAKE', price: 15, desc: 'CRACKS A RELIC ORB. ONE USE.', kind: 'consumable', icon: 'stake_i', max: 9 },
  tonic: { name: 'MOOR TONIC', price: 30, desc: 'DRINK TO MEND HALF YOUR WOUNDS.', kind: 'consumable', icon: 'tonic', max: 9 },
  laurel: { name: 'LAUREL', price: 40, desc: 'FIVE SECONDS OF PROTECTION.', kind: 'consumable', icon: 'laurel_i', max: 9 },
  garlic: { name: 'GARLIC', price: 25, desc: 'THE OLD WIVES SWEAR BY IT.', kind: 'consumable', icon: 'garlic_i', max: 3 },
  ash: { name: 'HOLY ASH', price: 60, desc: 'SCATTERS. SCOURS THE SCREEN OF EVIL.', kind: 'consumable', icon: 'holy_i', max: 3 },
  dagger: { name: 'DAGGER', price: 20, desc: 'FLIES STRAIGHT AND FAST. 1 HEART.', kind: 'sub', icon: 'dagger_i' },
  axe: { name: 'BATTLE AXE', price: 60, desc: 'ARCS OVERHEAD. 2 HEARTS.', kind: 'sub', icon: 'axe_i' },
  holywater: { name: 'HOLY WATER', price: 50, desc: 'BURNS WHERE IT LANDS. 2 HEARTS.', kind: 'sub', icon: 'holy_i' },
  cross: { name: 'GOLDEN CROSS', price: 120, desc: 'RETURNS TO YOUR HAND. 3 HEARTS.', kind: 'sub', icon: 'cross_i' },
  chainwhip: { name: 'CHAIN WHIP', price: 80, desc: 'A STOUTER LASH. STRIKES HARDER.', kind: 'whip', tier: 1 },
  morningstar: { name: 'MORNING STAR', price: 200, desc: 'THE HUNTER\'S FLAIL OF LEGEND.', kind: 'whip', tier: 2 },
  flamewhip: { name: 'FLAME WHIP', price: 350, desc: 'VORLOK FEARS THE CLEANSING FLAME.', kind: 'whip', tier: 3 },
};

export const SHOPS = {
  item: {
    name: "LENA'S APOTHECARY", keeper: 'merchant',
    greet: 'HERBS, TONICS, AND SHARP THINGS. WHAT DO YOU NEED, HUNTER?',
    stock: ['stake', 'tonic', 'laurel', 'garlic', 'dagger', 'holywater'],
  },
  weapon: {
    name: 'BORIS THE SMITH', keeper: 'smith',
    greet: 'A BELMOORE! LET ME SEE THAT SORRY WHIP OF YOURS.',
    stock: ['chainwhip', 'axe', 'cross'],
  },
  hermit: {
    name: 'THE MARSH HERMIT', keeper: 'hermit',
    greet: 'HEH. THE CHURCH WON\'T SELL YOU WHAT I SELL. COIN OR HEARTS, ALL THE SAME.',
    stock: ['morningstar', 'laurel', 'tonic', 'stake'],
  },
  castle: {
    name: 'THE PALE TRADER', keeper: 'shade',
    greet: 'EVEN A SHADE MUST EAT. BUY SOMETHING... PLEASE.',
    stock: ['flamewhip', 'tonic', 'laurel'],
  },
  port: {
    name: 'THE FISH EXCHANGE', keeper: 'smith',
    greet: 'FRESH OFF THE LAKE. THE ASH? DON\'T ASK WHOSE.',
    stock: ['ash', 'tonic', 'stake', 'laurel'],
  },
};

export const RELICS = [
  { id: 'fang', name: "VORLOK'S FANG", icon: 'relic_fang', manor: 'BRAMBLEWICK MANOR' },
  { id: 'eye', name: "VORLOK'S EYE", icon: 'relic_eye', manor: 'GRIMHOLLOW HALL' },
  { id: 'chalice', name: "VORLOK'S CHALICE", icon: 'relic_chalice', manor: 'RAVENMOOR KEEP' },
];

// Bestiary entries in display order. Bosses are "defeated" by save flag.
export const BESTIARY = [
  { type: 'zombie', name: 'ZOMBIE', icon: 'zombie1', lore: 'RISES NIGHTLY. FALLS EASILY.' },
  { type: 'wolf', name: 'MOOR WOLF', icon: 'wolf1', lore: 'LUNGES WHEN YOU DRAW NEAR.' },
  { type: 'bat', name: 'CAVE BAT', icon: 'bat2', lore: 'HANGS. WAITS. SWOOPS.' },
  { type: 'crow', name: 'CARRION CROW', icon: 'crow1', lore: 'CLIFF CARRION WITH A GRUDGE.' },
  { type: 'skeleton', name: 'SKELETON', icon: 'skeleton1', lore: 'THROWS ITS OWN SHINBONES.' },
  { type: 'redskeleton', name: 'RED SKELETON', icon: 'redskel1', lore: 'DEATH IS A BRIEF INCONVENIENCE.' },
  { type: 'ghost', name: 'GHOST', icon: 'ghost', lore: 'WALLS MEAN NOTHING TO GRIEF.' },
  { type: 'wraith', name: 'WRAITH', icon: 'wraith', lore: 'GRIEF, BUT FASTER.' },
  { type: 'merman', name: 'MERMAN', icon: 'merman', lore: 'LEAPS FROM STILL WATER.' },
  { type: 'mudman', name: 'MUDMAN', icon: 'mudman1', lore: 'THE MARSH GIVEN APPETITE.' },
  { type: 'crab', name: 'SNAPCLAW', icon: 'crab1', lore: 'STRIKE WHEN IT REARS.' },
  { type: 'spider', name: 'CRYPT SPIDER', icon: 'spider', lore: 'DROPS FROM THE DARK.' },
  { type: 'fireskull', name: 'FIRE SKULL', icon: 'fireskull1', lore: 'A SKULL THAT REMEMBERS BURNING.' },
  { type: 'knight', name: 'HOLLOW KNIGHT', icon: 'knight1', lore: 'EMPTY ARMOR, FULL OF SPITE.' },
  { type: 'mummy', name: 'MUMMY', icon: 'mummy1', lore: 'WRAPPED FOR A JOURNEY IT REFUSES.' },
  { type: 'batlord', name: 'THE BAT LORD', icon: 'batlord2', lore: 'FIRST WARDEN OF THE FANG.', boss: 'boss_manor1' },
  { type: 'gravelord', name: 'THE GRAVELORD', icon: 'gravelord1', lore: 'THE BONE-KING BELOW THE CRYPT.', boss: 'boss_catacombs' },
  { type: 'reaper', name: 'THE REAPER', icon: 'reaper', lore: 'GRIMHOLLOW\'S PATIENT HARVESTER.', boss: 'boss_manor2' },
  { type: 'bonedragon', name: 'BONE DRAGON', icon: 'dragonhead', lore: 'RAVENMOOR\'S COILED SENTINEL.', boss: 'boss_manor3' },
  { type: 'vorlok', name: 'COUNT VORLOK', icon: 'vorlok1', lore: 'THE COUNT. TWICE-KILLED, TWICE-RISEN.', boss: 'won' },
  { type: 'nyxara', name: 'NYXARA', icon: 'nyxara1', lore: 'THE BLOOD MOON MADE FLESH.', boss: 'boss_moonwell' },
];

export const LEVELS = [0, 40, 110, 220, 380, 600, 900, 1300, 1800, 2500];
export const maxHpFor = (lvl) => 40 + lvl * 8;
export const atkMult = (lvl) => 1 + (lvl - 1) * 0.08;

// ============================== STORY ==============================

export const STORY = [
  ['THE YEAR IS 1698.',
    '',
    'A GENERATION AGO, SIR ALDRIC BELMOORE',
    'STRUCK DOWN COUNT VORLOK AND BURNED',
    'HIS CASTLE TO A BLACK SHELL.'],
  ['BUT THE COUNT\'S DYING CURSE TOOK ROOT.',
    '',
    'CROPS WITHER. THE MISTS NEVER LIFT.',
    'AND WHEN THE SUN GOES DOWN,',
    'THE DEAD OF MOORLACH RISE.'],
  ['THREE RELICS OF VORLOK WERE SEALED',
    'IN THREE CURSED MANORS:',
    '',
    'THE FANG. THE EYE. THE CHALICE.'],
  ['ONLY WHEN ALL THREE ARE CARRIED TO',
    'THE CASTLE RUIN CAN THE COUNT BE',
    'CALLED BACK INTO FLESH...',
    '',
    'AND DESTROYED FOREVER.'],
  ['JASON BELMOORE, LAST OF THE LINE,',
    'WALKS INTO DOLEFUL HOLLOW AT DAWN',
    'WITH A LEATHER WHIP AND THIRTY HEARTS.',
    '',
    'THE CURSE ENDS WITH HIM. ONE WAY',
    'OR THE OTHER.'],
];

export const ENDING = [
  ['THE CHALICE CRACKED.',
    'THE EYE CLOSED.',
    'THE FANG CRUMBLED TO DUST.'],
  ['WITH NOTHING LEFT TO ANCHOR IT,',
    'THE COUNT\'S SHRIEKING SHADOW',
    'THINNED INTO THE MORNING MIST',
    'AND WAS GONE.'],
  ['DAWN BROKE OVER MOORLACH.',
    '',
    'FOR THE FIRST TIME IN A GENERATION,',
    'NOTHING ROSE TO MEET THE DARK.'],
  ['JASON BELMOORE WALKED BACK TO THE',
    'HOLLOW, HUNG THE WHIP ABOVE THE',
    'HEARTH, AND SLEPT UNTIL NOON.',
    '',
    'THE LAND, AT LAST, COULD SLEEP TOO.'],
];

// ============================== ZONES ==============================

function zHollow() {
  const b = mk(120);
  b.ground(0, 119, 12);
  // lamp posts
  b.deco('|', 11, 10, 34, 58, 82, 106).deco('|', 10, 10, 34, 58, 82, 106)
    .deco('|', 9, 10, 34, 58, 82, 106).candles(8, 10, 34, 58, 82, 106);
  // fences
  b.deco('f', 11, 4, 5, 6, 27, 28, 29, 63, 64, 65, 96, 97, 98, 114, 115);
  // crates to hop
  b.fill(52, 11, 53, 11, '%').fill(53, 10, 53, 10, '%');
  return {
    id: 'hollow', name: 'DOLEFUL HOLLOW', theme: 'town', music: 'town', safe: true,
    map: b.rows(), left: 'westwood', right: 'marsh',
    doors: [
      { x: 18, kind: 'church', label: 'CHURCH' },
      { x: 46, kind: 'shop', shop: 'item', label: 'APOTHECARY' },
      { x: 72, kind: 'shop', shop: 'weapon', label: 'SMITHY' },
      { x: 92, kind: 'msg', label: 'HOUSE', msg: 'THE DOOR IS BARRED FROM WITHIN. YOU HEAR PRAYING.' },
    ],
    npcs: [
      { x: 30, sprite: 'villager_f', name: 'MARTA', lines: ['STAY OFF THE ROADS AT NIGHT, HUNTER.', 'THE DEAD ARE JEALOUS OF THE LIVING.', 'POOR VIRETON STILL CLINGS ON PAST', 'THE BONEBRIDGE, HALF UNDER THE LAKE.'] },
      { x: 56, sprite: 'villager_m', name: 'OLD PYOTR', lines: ['A RELIC ORB CANNOT BE CRACKED BY ANY WHIP.', 'ONLY AN OAK STAKE. LENA SELLS THEM.', 'BUY ONE BEFORE YOU ENTER A MANOR.'] },
      { x: 84, sprite: 'child', name: 'WEE INGA', lines: ['GARLIC IN THE GRAVEYARD SUMMONS A FAIRY!', 'HONEST! MY COUSIN SAW IT!'] },
      { x: 102, sprite: 'elder', name: 'ELDER OSWIN', lines: ['THREE MANORS, THREE RELICS, HUNTER:', 'BRAMBLEWICK PAST THE GRAVEYARD, WEST.', 'GRIMHOLLOW ON THE LAKE ISLE, EAST.', 'RAVENMOOR ATOP THE WIDOW\'S CLIFFS.', 'ONLY THEN WILL THE CASTLE GATE OPEN.'] },
      { x: 112, sprite: 'villager_m', name: 'DRUNK YURI', lines: ['THE COUNT IS ALREADY DEAD. GO HOME.', '...HIC... NOBODY LISTENS TO YURI.'] },
    ],
    spawns: [],
    ambient: { day: [], night: ['zombie', 'zombie'], max: 3, rate: 160 },
  };
}

function zWestwood() {
  const b = mk(110);
  b.ground(0, 109, 12);
  b.ground(40, 70, 10);
  // pond
  b.fill(24, 12, 28, 13, '~');
  // tree platforms
  b.plat(33, 3, 8).plat(58, 4, 6).plat(76, 4, 7);
  b.candles(7, 34).candles(5, 59).candles(6, 77).candles(11, 14, 90, 102).candles(9, 48, 62);
  b.deco('f', 11, 2, 3).deco('f', 9, 44, 45, 66, 67);
  return {
    id: 'westwood', name: 'WHISPERING WOODS', theme: 'forest', music: 'day',
    map: b.rows(), left: 'graveyard', right: 'hollow',
    doors: [
      { x: 52, kind: 'zone', to: 'moonwell', tox: 3, label: 'MOON WELL', moonlock: true },
    ],
    npcs: [
      { x: 96, sprite: 'villager_m', name: 'WOODSMAN KOL', lines: ['WOLVES LUNGE WHEN YOU DRAW NEAR.', 'STAND YOUR GROUND AND WHIP THE LEAP.', 'THE OLD WELL ON THE HILL HUMS AT NIGHT.', 'I DON\'T DRINK FROM IT NO MORE.'] },
    ],
    spawns: [['wolf', 20], ['wolf', 86], ['bat', 36, 3], ['bat', 70, 2], ['zombie', 50]],
    ambient: { day: ['zombie'], night: ['zombie', 'zombie', 'bat'], max: 4, rate: 150 },
  };
}

function zGraveyard() {
  const b = mk(100);
  b.ground(0, 99, 12);
  b.fill(0, 4, 1, 11, '%');
  b.deco('g', 11, 8, 14, 22, 30, 48, 56, 66, 74);
  // crypt (with step blocks so its roof candles are reachable)
  b.fill(36, 9, 43, 11, '%');
  b.put(35, 11, '%').put(44, 11, '%');
  b.candles(8, 37, 42).candles(11, 18, 62, 80);
  return {
    id: 'graveyard', name: 'GRAVEMIST CEMETERY', theme: 'grave', music: 'day',
    map: b.rows(), right: 'westwood',
    doors: [
      { x: 46, kind: 'zone', to: 'catacombs', tox: 3, label: 'CRYPT STAIRS' },
      { x: 88, kind: 'zone', to: 'manor1', tox: 3, label: 'BRAMBLEWICK MANOR' },
    ],
    npcs: [
      { x: 55, sprite: 'villager_m', name: 'GRAVEDIGGER HUGO', lines: ['I DIG THEM DOWN, THE NIGHT DIGS THEM UP.', 'THE CRYPT STAIRS GO DOWN A LONG WAY.', 'AN OLD BONE-KING SLEEPS AT THE BOTTOM.', 'ME? I STAY UP HERE WITH THE QUIET ONES.'] },
    ],
    spawns: [['skeleton', 25], ['skeleton', 60], ['ghost', 40, 5], ['ghost', 72, 7]],
    ambient: { day: ['zombie'], night: ['zombie', 'zombie', 'ghost', 'wraith'], max: 4, rate: 140 },
  };
}

function zMarsh() {
  const b = mk(120);
  b.ground(0, 119, 12);
  for (const [p0, p1] of [[22, 30], [46, 54], [78, 88], [100, 108]]) {
    b.fill(p0, 12, p1, 13, '~');
  }
  b.plat(49, 3, 9);
  b.candles(11, 12, 40, 70, 95, 114).candles(8, 50);
  b.deco('f', 11, 60, 61, 62);
  return {
    id: 'marsh', name: 'SORROW MARSH', theme: 'marsh', music: 'day',
    map: b.rows(), left: 'hollow', right: 'bridge',
    doors: [
      { x: 64, kind: 'shop', shop: 'hermit', label: 'HERMIT HUT' },
    ],
    npcs: [],
    spawns: [['merman', 26, 12], ['merman', 50, 12], ['merman', 103, 12], ['mudman', 38], ['mudman', 92], ['bat', 68, 4]],
    ambient: { day: [], night: ['zombie', 'merman'], max: 3, rate: 170 },
  };
}

function zBridge() {
  const b = mk(110);
  b.fill(0, 12, 109, 14, 'W');
  b.fill(0, 12, 5, 14, '#').fill(104, 12, 109, 14, '#').fill(50, 12, 60, 14, '#');
  // deck
  b.plat(4, 20, 8).plat(27, 12, 8).plat(41, 12, 8);
  b.plat(58, 14, 8).plat(74, 18, 8).plat(94, 12, 8);
  // ladders pier <-> deck
  b.ladder(6, 9, 11).ladder(51, 9, 11).ladder(103, 9, 11);
  // posts (decorative)
  b.deco('|', 9, 14, 32, 46, 66, 84, 98).deco('|', 10, 14, 32, 46, 66, 84, 98).deco('|', 11, 14, 32, 46, 66, 84, 98);
  b.candles(7, 12, 30, 46, 64, 82, 98);
  return {
    id: 'bridge', name: 'BONEBRIDGE', theme: 'bridge', music: 'day',
    map: b.rows(), left: 'marsh', right: 'vireton',
    doors: [
      { x: 54, kind: 'zone', to: 'manor2', tox: 3, label: 'GRIMHOLLOW HALL' },
    ],
    npcs: [],
    spawns: [['bat', 20, 3], ['bat', 44, 2], ['bat', 78, 3], ['merman', 30, 11], ['merman', 70, 11], ['merman', 90, 11]],
    ambient: { day: ['bat'], night: ['bat', 'merman'], max: 3, rate: 180 },
    // the ferryman's strongbox, washed up on the isle below the deck
    chests: [{ x: 58, y: 11, contents: 'bell' }],
  };
}

function zCliffs() {
  const b = mk(120);
  b.ground(0, 15, 13);
  b.ground(16, 30, 11);
  b.ground(31, 55, 9);
  b.fill(56, 11, 58, 11, '^').fill(56, 12, 58, 14, '#');
  b.ground(59, 80, 9);
  b.ground(81, 100, 7);
  b.ground(101, 119, 5);
  b.fill(119, 0, 119, 4, '%');
  b.plat(24, 3, 8);
  b.candles(12, 8).candles(10, 20).candles(8, 40, 70).candles(6, 88).candles(4, 106);
  return {
    id: 'cliffs', name: "WIDOW'S CLIFFS", theme: 'cliff', music: 'day',
    map: b.rows(), left: 'vireton',
    doors: [
      { x: 90, kind: 'zone', to: 'manor3', tox: 3, label: 'RAVENMOOR KEEP' },
      { x: 112, kind: 'zone', to: 'castle', tox: 3, label: 'CASTLE VORLOK', lockRelics: 3 },
    ],
    npcs: [
      { x: 66, sprite: 'villager_f', name: 'MAD AGNES', lines: ['THE CASTLE GATE KNOWS WHAT YOU CARRY.', 'FANG, EYE, CHALICE... OR IT STAYS SHUT.', 'A PALE THING STILL TRADES INSIDE. HEE HEE.'] },
    ],
    spawns: [['wolf', 10], ['crow', 25, 9], ['crow', 62, 7], ['fireskull', 75, 5], ['fireskull', 105, 2]],
    ambient: { day: ['crow'], night: ['bat', 'ghost'], max: 3, rate: 170 },
  };
}

function zVireton() {
  const b = mk(120);
  b.ground(0, 119, 12);
  // the drowned quarter: flooded street sections
  for (const [p0, p1] of [[18, 24], [40, 46], [86, 92]]) {
    b.fill(p0, 12, p1, 13, '~');
  }
  // plank walks over the water
  b.plat(19, 5, 10).plat(41, 5, 10).plat(87, 5, 10);
  // the dock
  b.deco('f', 11, 2, 3, 4).deco('|', 11, 8).deco('|', 10, 8);
  b.deco('f', 11, 52, 53, 116, 117);
  b.candles(11, 12, 36, 56, 80, 96, 113).candles(9, 21, 43, 89);
  return {
    id: 'vireton', name: 'VIRETON, THE DROWNED QUARTER', theme: 'port', music: 'port', safe: true,
    map: b.rows(), left: 'bridge', right: 'cliffs',
    doors: [
      { x: 30, kind: 'msg', label: 'PETRA\'S HOUSE', msg: 'THE WIDOW IS OUT FRONT, WATCHING THE LAKE.' },
      { x: 70, kind: 'shop', shop: 'port', label: 'FISH EXCHANGE' },
      { x: 100, kind: 'church', label: 'CHAPEL' },
    ],
    npcs: [
      { x: 34, sprite: 'villager_f', name: 'WIDOW PETRA', quest: 'bell' },
      { x: 60, sprite: 'villager_m', name: 'FISHERMAN ODD', lines: ['SNAPCLAWS SHRUG OFF A WHIP TO THE SHELL.', 'STRIKE WHEN THEY REAR UP TO PINCH.'] },
      { x: 82, sprite: 'child', name: 'LITTLE TOMAS', lines: ['THE OLD QUARTER SANK IN GRANDPA\'S DAY.', 'FISH SWIM THROUGH THE PARLORS NOW.'] },
      { x: 110, sprite: 'villager_m', name: 'SOGGY LUKAS', lines: ['I SAW A CROWNED SKELETON DANCING', 'UNDER THE GRAVEYARD. NOBODY BELIEVES ME.', '...HAVE YOU SEEN MY BOOT?'] },
    ],
    spawns: [['crab', 14], ['crab', 50], ['merman', 43, 12], ['bat', 76, 4]],
    ambient: { day: [], night: ['zombie', 'merman'], max: 3, rate: 170 },
  };
}

function shell(b) {
  const { w, h } = b;
  b.fill(0, h - 3, w - 1, h - 1, '#');
  b.fill(0, 0, w - 1, 0, '#');
  b.fill(0, 1, 0, h - 4, '#');
  b.fill(w - 1, 1, w - 1, h - 4, '#');
  return b;
}

function zManor1() {
  const b = shell(mk(90, 24));
  b.fill(1, 15, 60, 15, '#');
  b.fill(20, 9, 88, 9, '#');
  b.ladder(55, 16, 20).put(55, 15, 'H');
  b.ladder(25, 10, 14).put(25, 9, 'H');
  // breakable wall hiding a candle cache
  b.fill(70, 7, 70, 8, '*');
  b.candles(8, 74, 78, 82);
  b.candles(20, 6, 12, 18, 30, 42);
  b.candles(14, 8, 16, 32, 40, 48);
  b.candles(8, 28, 36, 44, 52, 60);
  b.deco('c', 20, 10, 34).deco('c', 19, 10, 34).deco('c', 18, 10, 34);
  b.deco('w', 12, 20, 44).deco('w', 6, 40, 56);
  return {
    id: 'manor1', name: 'BRAMBLEWICK MANOR', theme: 'manor', music: 'manor', indoor: true,
    map: b.rows(),
    doors: [{ x: 3, kind: 'zone', to: 'graveyard', tox: 86, label: 'LEAVE' }],
    npcs: [],
    spawns: [['spider', 30, 1], ['spider', 46, 1], ['skeleton', 14], ['skeleton', 40, 14], ['bat', 50, 12], ['ghost', 66, 17]],
    boss: { type: 'batlord', x: 76, y: 13, trigger: { x0: 63, x1: 89, y0: 10, y1: 21 }, orbX: 78, orbY: 20, relic: 'fang' },
  };
}

function zManor2() {
  const b = shell(mk(100, 24));
  b.fill(1, 15, 45, 15, '#').fill(54, 15, 98, 15, '#');
  b.fill(30, 9, 80, 9, '#');
  b.ladder(8, 16, 20).put(8, 15, 'H');
  b.ladder(70, 16, 20).put(70, 15, 'H');
  b.ladder(35, 10, 14).put(35, 9, 'H');
  b.plat(47, 6, 12);
  b.fill(46, 20, 53, 20, '^');
  b.fill(90, 13, 90, 14, '*');
  b.candles(14, 93, 96);
  b.candles(20, 4, 14, 24, 34, 58, 64, 80, 92);
  b.candles(14, 6, 16, 26, 42, 60, 74);
  b.candles(8, 34, 42, 50, 58, 66, 74);
  b.candles(14, 84);
  b.deco('c', 20, 20, 62).deco('c', 19, 20, 62).deco('c', 18, 20, 62);
  b.deco('w', 12, 12, 60).deco('w', 6, 44, 70);
  return {
    id: 'manor2', name: 'GRIMHOLLOW HALL', theme: 'manor2', music: 'manor', indoor: true,
    map: b.rows(),
    doors: [{ x: 3, kind: 'zone', to: 'bridge', tox: 52, label: 'LEAVE' }],
    npcs: [],
    spawns: [['ghost', 20, 18], ['ghost', 60, 12], ['knight', 40, 14], ['knight', 75], ['skeleton', 60], ['bat', 25, 11], ['spider', 50, 1]],
    boss: { type: 'reaper', x: 88, y: 3, trigger: { x0: 81, x1: 98, y0: 1, y1: 14 }, orbX: 92, orbY: 14, relic: 'eye' },
  };
}

function zManor3() {
  const b = shell(mk(100, 24));
  b.fill(6, 9, 50, 9, '#');
  b.fill(20, 15, 98, 15, '#');
  b.ladder(90, 16, 20).put(90, 15, 'H');
  b.ladder(24, 10, 14).put(24, 9, 'H');
  b.fill(34, 20, 36, 20, '^').fill(60, 20, 61, 20, '^').fill(44, 14, 45, 14, '^');
  b.fill(12, 19, 12, 20, '*');
  b.candles(20, 5, 8);
  b.candles(20, 28, 40, 52, 64, 76, 86);
  b.candles(14, 30, 42, 56, 70, 84, 94);
  b.candles(8, 10, 18, 28, 38, 46);
  b.deco('c', 20, 50, 74).deco('c', 19, 50, 74).deco('c', 18, 50, 74);
  b.deco('w', 12, 36, 78).deco('w', 6, 14, 32);
  return {
    id: 'manor3', name: 'RAVENMOOR KEEP', theme: 'manor3', music: 'manor', indoor: true,
    map: b.rows(),
    doors: [{ x: 3, kind: 'zone', to: 'cliffs', tox: 88, label: 'LEAVE' }],
    npcs: [],
    spawns: [['fireskull', 30, 18], ['mummy', 44], ['mummy', 70, 14], ['fireskull', 60, 12], ['skeleton', 82], ['spider', 40, 1], ['knight', 30, 8]],
    boss: { type: 'bonedragon', x: 6, y: 4, trigger: { x0: 1, x1: 16, y0: 1, y1: 8 }, orbX: 10, orbY: 8, relic: 'chalice' },
  };
}

function zCatacombs() {
  const b = shell(mk(100, 18));
  b.fill(1, 10, 40, 10, '#').fill(52, 10, 98, 10, '#');
  b.fill(20, 5, 80, 5, '#');
  b.ladder(8, 11, 14).put(8, 10, 'H');
  b.ladder(60, 11, 14).put(60, 10, 'H');
  b.ladder(30, 6, 9).put(30, 5, 'H');
  b.fill(24, 14, 25, 14, '^').fill(45, 14, 47, 14, '^');
  // treasure vault sealed behind a breakable wall
  b.fill(93, 13, 93, 14, '*');
  b.candles(14, 5, 14, 34, 55, 66, 76, 96);
  b.candles(9, 12, 24, 36, 56, 70, 90);
  b.candles(4, 24, 36, 48, 60, 72);
  b.deco('g', 14, 10, 30, 52).deco('g', 9, 18, 46, 76);
  b.deco('c', 14, 40, 68).deco('c', 13, 40, 68).deco('c', 12, 40, 68);
  return {
    id: 'catacombs', name: 'THE CATACOMBS', theme: 'catacomb', music: 'cata', indoor: true,
    map: b.rows(),
    doors: [{ x: 3, kind: 'zone', to: 'graveyard', tox: 48, label: 'LEAVE' }],
    npcs: [],
    spawns: [['redskeleton', 20], ['redskeleton', 65, 9], ['spider', 28, 1], ['spider', 58, 1], ['wraith', 40, 12], ['wraith', 75, 7], ['bat', 50, 8]],
    boss: { type: 'gravelord', x: 85, y: 12, trigger: { x0: 70, x1: 98, y0: 11, y1: 14 }, orbX: 86, orbY: 14, relic: null, drop: 'amulet' },
    chests: [{ x: 96, y: 14, contents: 'cross' }],
  };
}

function zMoonwell() {
  const b = shell(mk(60, 15));
  b.plat(10, 4, 8).plat(26, 4, 7).plat(44, 4, 8);
  b.candles(11, 8, 20, 34, 50).candles(7, 11, 45).candles(6, 27);
  b.deco('c', 11, 16, 40).deco('c', 10, 16, 40).deco('c', 9, 16, 40);
  b.deco('g', 11, 24, 30);
  return {
    id: 'moonwell', name: 'THE MOON WELL', theme: 'well', music: 'night', indoor: true,
    map: b.rows(),
    doors: [{ x: 3, kind: 'zone', to: 'westwood', tox: 50, label: 'CLIMB OUT' }],
    npcs: [],
    spawns: [],
    boss: { type: 'nyxara', x: 40, y: 4, trigger: { x0: 8, x1: 58, y0: 1, y1: 14 }, orbX: 30, orbY: 11, relic: null, drop: 'bloodwhip' },
  };
}

function zCastle() {
  const b = shell(mk(120, 24));
  b.fill(15, 15, 70, 15, '#');
  b.fill(40, 9, 117, 9, '#');
  b.ladder(18, 16, 20).put(18, 15, 'H');
  b.ladder(66, 16, 20).put(66, 15, 'H');
  b.ladder(45, 10, 14).put(45, 9, 'H');
  b.fill(28, 20, 30, 20, '^').fill(55, 20, 56, 20, '^').fill(86, 20, 88, 20, '^');
  b.fill(78, 13, 79, 14, '*');
  b.candles(14, 82);
  b.candles(20, 6, 12, 36, 44, 60, 74, 94, 104);
  b.candles(14, 20, 28, 40, 52, 62);
  b.candles(8, 48, 56, 64, 72, 80, 88);
  b.candles(8, 98, 104, 110);
  b.deco('c', 20, 40, 70, 100).deco('c', 19, 40, 70, 100).deco('c', 18, 40, 70, 100);
  b.deco('w', 12, 24, 58).deco('w', 6, 52, 76);
  return {
    id: 'castle', name: 'CASTLE VORLOK', theme: 'castle', music: 'manor', indoor: true,
    map: b.rows(),
    doors: [
      { x: 3, kind: 'zone', to: 'cliffs', tox: 110, label: 'LEAVE' },
      { x: 25, kind: 'shop', shop: 'castle', label: '???' },
    ],
    npcs: [],
    spawns: [['knight', 35], ['knight', 90, 8], ['ghost', 50, 12], ['fireskull', 60, 6], ['mummy', 75, 8], ['skeleton', 55, 14], ['bat', 40, 12], ['mummy', 100]],
    boss: { type: 'vorlok', x: 105, y: 3, trigger: { x0: 96, x1: 118, y0: 1, y1: 8 }, relic: null },
  };
}

export const ZONES = {};
for (const z of [zHollow(), zWestwood(), zGraveyard(), zMarsh(), zBridge(), zVireton(), zCliffs(), zManor1(), zManor2(), zManor3(), zCatacombs(), zMoonwell(), zCastle()]) {
  z.w = z.map[0].length;
  z.h = z.map.length;
  ZONES[z.id] = z;
}

export function tileAt(zone, tx, ty) {
  if (tx < 0 || tx >= zone.w) return '#';
  if (ty < 0) return '.';
  if (ty >= zone.h) return '.';
  return zone.map[ty][tx];
}

export function isSolid(ch) { return ch === '#' || ch === '%' || ch === '*'; }

// First solid row below open air in this column (skips a solid ceiling).
export function findGround(zone, tx) {
  let seenOpen = false;
  for (let y = 0; y < zone.h; y++) {
    if (isSolid(tileAt(zone, tx, y))) {
      if (seenOpen) return y;
    } else seenOpen = true;
  }
  return zone.h - 3;
}
