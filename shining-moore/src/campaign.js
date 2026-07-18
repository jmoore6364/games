// Shining Moore — campaign data: 8 battles (maps + enemies + objectives),
// story dialogue, HQ, shop stock, save schema. Headless (no DOM).

import { ENEMIES } from './units.js';

// Map legend: . plains  r road  = bridge  f forest  h hills  w water
//             # wall    T throne  G gate  F floor  c church  s sand

const B1_MAP = [ // Defend the Gate — enemies march down the road to the gate
  '####################',
  '#..hh....rr....hh..#',
  '#..hh...wrrw...hh..#',
  '#.......wrrw.......#',
  '#..ff...wrrw..ff...#',
  '#..ff...wrrw..ff...#',
  '#.......wrrw.......#',
  '#....f..wrrw..f....#',
  '#.......wrrw.......#',
  '#..f....wrrw....f..#',
  '#.......wrrw.......#',
  '#....ffwwrrwwff....#',
  '#.....wwwrrwww.....#',
  '#......w.rr.w......#',
  '#........rr........#',
  '#...f....rr....f...#',
  '#........rr........#',
  '########GGGG########',
  '#FFFFFFFFFFFFFFFFFF#',
  '####################',
];

const B2_MAP = [ // Cross the Bridge — a river chokepoint
  '####################',
  '#hh......ff......hh#',
  '#h....f......f....h#',
  '#........rr........#',
  '#..f.....rr.....f..#',
  '#........rr........#',
  '#.f......rr......f.#',
  '#........rr........#',
  '#wwwwwwww==wwwwwwww#',
  '#wwwwwwww==wwwwwwww#',
  '#wwwwwwww==wwwwwwww#',
  '#........rr........#',
  '#..f.....rr.....ff.#',
  '#........rr........#',
  '#...ff...rr...f....#',
  '#........rr........#',
  '#....f...rr..f.....#',
  '#........rr........#',
  '#........rr........#',
  '####################',
];

const B3_MAP = [ // Forest Ambush — a road winding through deep woods
  '####################',
  '#ffffff..ff..ffffff#',
  '#fffff....f...fffff#',
  '#fff....f......ffff#',
  '#ff..f.....f....fff#',
  '#f.....rrrr......ff#',
  '#f...rrr..rrr.....f#',
  '#f..rr......rrr...f#',
  '#f.rr..f......rr..f#',
  '#f.r............r.f#',
  '#f.r...f...f....r.f#',
  '#f.rr..........rr.f#',
  '#ff.rrr......rrr..f#',
  '#fff..rrrrrrrr...ff#',
  '#ffff.....f.....fff#',
  '#fffff....f....ffff#',
  '#ffff...f.....fffff#',
  '#fff.........ffffff#',
  '#ffff...f...fffffff#',
  '####################',
];

const B4_MAP = [ // Seize the Church — village square, church at north
  '####################',
  '###cccccccccc..#####',
  '###cccccccccc..hh###',
  '###cccc...cccc.....#',
  '###ccc.....ccc..f..#',
  '####cc.....cc......#',
  '#....c.....c....f..#',
  '#.f....rrr.........#',
  '#......rrr...##....#',
  '#..##..rrr...##..f.#',
  '#..##..rrr.........#',
  '#......rrr..f......#',
  '#.f....rrr......##.#',
  '#......rrr..f...##.#',
  '#..f...rrr.........#',
  '#......rrr....f....#',
  '#..##..rrr.........#',
  '#..##..rrr...f..f..#',
  '#......rrr.........#',
  '####################',
];

const B5_MAP = [ // Mountain Pass — cliffs and gaps where flyers shine
  '####################',
  '#hhhh..........hhhh#',
  '#hhh....rrrr....hhh#',
  '#hh....rr..rr....hh#',
  '#h.....r....r.....h#',
  '#hwwwwhr....rhwwwwh#',
  '#hwwwwhr....rhwwwwh#',
  '#hh...hrr...rh...hh#',
  '#hhh...hr...rh..hhh#',
  '#hwwwww.r...r.wwwwh#',
  '#hwwwww.rr..r.wwwwh#',
  '#hh......r..rr...hh#',
  '#h...h...r...r....h#',
  '#h..hh..rr...rr...h#',
  '#h..h...r..h..r...h#',
  '#h......r..hh.r...h#',
  '#hh....rr..h..rr.hh#',
  '#hhh...r.......rhhh#',
  '#hhhh..........hhhh#',
  '####################',
];

const B6_MAP = [ // Castle Courtyard
  '####################',
  '#FFFFFF##FF##FFFFFF#',
  '#FFFFFF#FFFF#FFFFFF#',
  '#FF..............FF#',
  '#F....f......f....F#',
  '#F..##........##..F#',
  '#F..##..rrrr..##..F#',
  '#F......rrrr......F#',
  '#F..f...rrrr...f..F#',
  '#F......rrrr......F#',
  '#F......rrrr......F#',
  '#F..f...rrrr...f..F#',
  '#F......rrrr......F#',
  '#F..##..rrrr..##..F#',
  '#F..##........##..F#',
  '#F....f......f....F#',
  '#FF..............FF#',
  '#FFFFFF#FFFF#FFFFFF#',
  '#FFFFFF##FF##FFFFFF#',
  '####################',
];

const B7_MAP = [ // Throne Room — Vexmoore waits on the throne
  '####################',
  '#######FFTTFF#######',
  '#######FFFFFF#######',
  '####FFFFFFFFFFFF####',
  '####FF########FF####',
  '####FF########FF####',
  '####FFFFFFFFFFFF####',
  '#####FFF####FFF#####',
  '#####FFF####FFF#####',
  '####FFFFFFFFFFFF####',
  '####FF########FF####',
  '####FF########FF####',
  '####FFFFFFFFFFFF####',
  '#####FFFFFFFFFF#####',
  '######FFFFFFFF######',
  '######FFFFFFFF######',
  '#####FFFFFFFFFF#####',
  '####FFFFFFFFFFFF####',
  '####FFFFFFFFFFFF####',
  '####################',
];

const B8_MAP = [ // The Dark Summit — Dark Moore Dragon
  '####################',
  '#hhhhhhh.ss.hhhhhhh#',
  '#hhhhh..ssss..hhhhh#',
  '#hhh....ssss....hhh#',
  '#hh....ssssss....hh#',
  '#h.....ssssss.....h#',
  '#h......ssss......h#',
  '#hwwwh...ss...hwwwh#',
  '#hwwwh...ss...hwwwh#',
  '#hh......ss......hh#',
  '#h...f...ss...f...h#',
  '#h.......ss.......h#',
  '#hh..f...ss...f..hh#',
  '#hhh.....ss.....hhh#',
  '#hh......ss......hh#',
  '#h....f..ss..f....h#',
  '#h.......ss.......h#',
  '#hh......ss......hh#',
  '#hhhh....ss....hhhh#',
  '####################',
];

// Each battle: name, map, deploy (player start tiles, in force order),
// enemies [{t, x, y, lv, aggro, noMove, ai}], objective, gold, terrainName (cut-in backdrop), music.
export const BATTLES = [
  {
    name: 'DEFEND THE GATE', map: B1_MAP, objective: 'defend',
    defendTiles: [[8, 17], [9, 17], [10, 17], [11, 17]],
    intro: 'PROTECT THE GATE OF MOOREGARD!\nLET NO FIEND THROUGH!',
    deploy: [[9, 15], [10, 15], [9, 16], [10, 16], [8, 15], [11, 15], [8, 16], [11, 16]],
    enemies: [
      { t: 'gob', x: 9, y: 2, lv: 1, aggro: 99 },
      { t: 'gob', x: 10, y: 3, lv: 1, aggro: 99 },
      { t: 'gob', x: 9, y: 5, lv: 1, aggro: 99 },
      { t: 'wolfE', x: 10, y: 6, lv: 1, aggro: 99 },
      { t: 'gob', x: 9, y: 8, lv: 2, aggro: 99 },
      { t: 'orc', x: 10, y: 9, lv: 1, aggro: 99 },
    ],
    gold: 120, terrainName: 'PLAINS', music: 'map',
  },
  {
    name: 'CROSS THE BRIDGE', map: B2_MAP, objective: 'rout',
    intro: 'THE OLD SPAN OF WYNDMOORE.\nTAKE THE FAR BANK!',
    deploy: [[9, 17], [10, 17], [9, 18], [10, 18], [8, 17], [11, 17], [8, 18], [11, 18]],
    enemies: [
      { t: 'gob', x: 9, y: 11, lv: 2, aggro: 6 },
      { t: 'gob', x: 10, y: 11, lv: 2, aggro: 6 },
      { t: 'orc', x: 9, y: 7, lv: 2, aggro: 5 },
      { t: 'earc', x: 10, y: 6, lv: 2, aggro: 6 },
      { t: 'earc', x: 8, y: 5, lv: 2, aggro: 6 },
      { t: 'wolfE', x: 12, y: 4, lv: 2, aggro: 5 },
      { t: 'orc', x: 9, y: 3, lv: 3, aggro: 4 },
    ],
    gold: 150, terrainName: 'BRIDGE', music: 'map',
  },
  {
    name: 'FOREST AMBUSH', map: B3_MAP, objective: 'rout',
    intro: 'THE WOODS ARE TOO QUIET.\nEYES OPEN, FORCE!',
    deploy: [[9, 16], [10, 16], [9, 17], [10, 17], [8, 16], [11, 16], [8, 17], [11, 17]],
    enemies: [
      { t: 'wolfE', x: 4, y: 12, lv: 3, aggro: 5 },
      { t: 'wolfE', x: 15, y: 12, lv: 3, aggro: 5 },
      { t: 'gob', x: 6, y: 9, lv: 3, aggro: 5 },
      { t: 'gob', x: 13, y: 9, lv: 3, aggro: 5 },
      { t: 'earc', x: 7, y: 6, lv: 3, aggro: 6 },
      { t: 'earc', x: 12, y: 6, lv: 3, aggro: 6 },
      { t: 'dmag', x: 9, y: 4, lv: 3, aggro: 7 },
      { t: 'orc', x: 10, y: 5, lv: 4, aggro: 5 },
    ],
    gold: 180, terrainName: 'FOREST', music: 'map',
  },
  {
    name: 'SEIZE THE CHURCH', map: B4_MAP, objective: 'rout',
    intro: 'THE VILLAGE CHURCH IS TAKEN.\nDRIVE THE DEAD OUT!',
    deploy: [[7, 17], [8, 17], [7, 18], [8, 18], [9, 17], [10, 17], [9, 18], [10, 18]],
    enemies: [
      { t: 'zomb', x: 8, y: 13, lv: 4, aggro: 5 },
      { t: 'zomb', x: 9, y: 12, lv: 4, aggro: 5 },
      { t: 'gob', x: 5, y: 10, lv: 4, aggro: 5 },
      { t: 'earc', x: 12, y: 10, lv: 4, aggro: 6 },
      { t: 'zomb', x: 8, y: 8, lv: 4, aggro: 5 },
      { t: 'dmag', x: 9, y: 6, lv: 4, aggro: 6 },
      { t: 'dpri', x: 7, y: 3, lv: 4, aggro: 4 },
      { t: 'garg', x: 10, y: 3, lv: 4, aggro: 5 },
    ],
    gold: 220, terrainName: 'CHURCH', music: 'map',
  },
  {
    name: 'MOUNTAIN PASS', map: B5_MAP, objective: 'rout',
    intro: 'OVER THE PEAKS OF MOORHORN.\nWINGS WILL WIN THIS PASS.',
    deploy: [[8, 17], [9, 17], [10, 17], [11, 17], [8, 18], [9, 18], [10, 18], [11, 18]],
    enemies: [
      { t: 'gob', x: 8, y: 13, lv: 5, aggro: 5 },
      { t: 'harp', x: 4, y: 10, lv: 5, aggro: 6 },
      { t: 'harp', x: 15, y: 10, lv: 5, aggro: 6 },
      { t: 'earc', x: 8, y: 9, lv: 5, aggro: 6 },
      { t: 'orc', x: 8, y: 7, lv: 5, aggro: 5 },
      { t: 'earc', x: 12, y: 7, lv: 5, aggro: 6 },
      { t: 'harp', x: 9, y: 4, lv: 6, aggro: 6 },
      { t: 'eknt', x: 10, y: 3, lv: 5, aggro: 5 },
    ],
    gold: 260, terrainName: 'HILLS', music: 'map',
  },
  {
    name: 'CASTLE COURTYARD', map: B6_MAP, objective: 'rout',
    intro: 'CASTLE MOOREGARD, USURPED.\nRECLAIM THE COURTYARD!',
    deploy: [[8, 16], [9, 16], [10, 16], [11, 16], [8, 17], [9, 17], [10, 17], [11, 17]],
    enemies: [
      { t: 'eknt', x: 9, y: 12, lv: 6, aggro: 5 },
      { t: 'eknt', x: 10, y: 12, lv: 6, aggro: 5 },
      { t: 'orc', x: 5, y: 10, lv: 6, aggro: 5 },
      { t: 'orc', x: 14, y: 10, lv: 6, aggro: 5 },
      { t: 'earc', x: 7, y: 8, lv: 6, aggro: 6 },
      { t: 'earc', x: 12, y: 8, lv: 6, aggro: 6 },
      { t: 'dmag', x: 9, y: 6, lv: 6, aggro: 7 },
      { t: 'dpri', x: 10, y: 5, lv: 6, aggro: 4 },
      { t: 'garg', x: 9, y: 3, lv: 6, aggro: 6 },
      { t: 'garg', x: 10, y: 3, lv: 6, aggro: 6 },
    ],
    gold: 320, terrainName: 'FLOOR', music: 'map',
  },
  {
    name: 'THE THRONE ROOM', map: B7_MAP, objective: 'boss',
    intro: 'LORD VEXMOORE SITS THE STOLEN\nTHRONE. BRING HIM DOWN!',
    deploy: [[8, 17], [9, 17], [10, 17], [11, 17], [7, 17], [12, 17], [8, 18], [11, 18]],
    enemies: [
      { t: 'eknt', x: 7, y: 13, lv: 7, aggro: 5 },
      { t: 'eknt', x: 12, y: 13, lv: 7, aggro: 5 },
      { t: 'zomb', x: 6, y: 9, lv: 7, aggro: 5 },
      { t: 'zomb', x: 13, y: 9, lv: 7, aggro: 5 },
      { t: 'dmag', x: 6, y: 6, lv: 7, aggro: 6 },
      { t: 'dmag', x: 13, y: 6, lv: 7, aggro: 6 },
      { t: 'dpri', x: 8, y: 3, lv: 7, aggro: 4 },
      { t: 'garg', x: 11, y: 3, lv: 7, aggro: 5 },
      { t: 'vex', x: 9, y: 1, lv: 7, aggro: 3, noMove: true },
    ],
    gold: 420, terrainName: 'FLOOR', music: 'boss',
  },
  {
    name: 'THE DARK SUMMIT', map: B8_MAP, objective: 'boss',
    intro: 'THE DARK MOORE DRAGON WAKES.\nFOR MOOREGARD! FOR THE DAWN!',
    deploy: [[8, 17], [9, 17], [10, 17], [11, 17], [8, 18], [9, 18], [10, 18], [11, 18]],
    enemies: [
      { t: 'garg', x: 5, y: 12, lv: 8, aggro: 5 },
      { t: 'garg', x: 14, y: 12, lv: 8, aggro: 5 },
      { t: 'harp', x: 4, y: 8, lv: 8, aggro: 6 },
      { t: 'harp', x: 15, y: 8, lv: 8, aggro: 6 },
      { t: 'zomb', x: 8, y: 8, lv: 8, aggro: 5 },
      { t: 'zomb', x: 11, y: 8, lv: 8, aggro: 5 },
      { t: 'dpri', x: 7, y: 5, lv: 8, aggro: 5 },
      { t: 'dpri', x: 12, y: 5, lv: 8, aggro: 5 },
      { t: 'drag', x: 9, y: 3, lv: 9, aggro: 6, noMove: true },
    ],
    gold: 600, terrainName: 'SAND', music: 'boss',
  },
];

// ---------------- story ----------------

export const OPENING = [
  'LONG AGO, THE KINGDOM OF',
  'MOOREGARD SEALED THE DARK',
  'DRAGON BENEATH THE MOUNTAIN.',
  '',
  'FOR A THOUSAND YEARS THE',
  'SEAL HELD, AND THE LAND',
  'KNEW PEACE AND PLENTY.',
  '',
  'BUT NOW THE VIZIER, LORD',
  'VEXMOORE, HAS BETRAYED THE',
  'CROWN. THE SEAL WEAKENS.',
  'THE MOUNTAIN SMOKES.',
  '',
  'ONLY THE YOUNG SWORDSMAN',
  'MOORE AND HIS SHINING FORCE',
  'STAND BETWEEN MOOREGARD',
  'AND THE COMING DARK...',
];

// Pre/post battle scenes: arrays of [face, name, line]. Kept short and charming.
export const SCENES = {
  pre0: [
    ['kael', 'KAEL', 'GOBLINS ON THE NORTH ROAD, MOORE. THEY MARCH ON OUR GATE.'],
    ['moore', 'MOORE', 'THEN THE GATE IS WHERE WE STAND. NOT ONE STEP PAST IT.'],
  ],
  post0: [
    ['gart', 'GART', 'HA! THEY BOUNCED OFF US LIKE RAIN OFF AN ANVIL.'],
    ['pip', 'PIP', 'OI! GOT A BOW AND STEADY HANDS. ROOM IN THIS FORCE FOR ME?'],
    ['moore', 'MOORE', 'WELCOME, PIP. WE MARCH FOR THE BRIDGE AT DAWN.'],
  ],
  pre1: [
    ['mira', 'MIRA', 'VEXMOORE BROKE EVERY CROSSING BUT THE OLD SPAN. HE WANTS US HERE.'],
    ['moore', 'MOORE', 'THEN WE OBLIGE HIM. SHIELDS FIRST ACROSS THE BRIDGE.'],
  ],
  post1: [
    ['zin', 'ZIN', 'I FELT THAT BATTLE FROM MY TOWER. YOU NEED FIRE, CAPTAIN. I AM FIRE.'],
    ['moore', 'MOORE', 'THEN BURN A PATH TO MOOREGARD, ZIN. WELCOME.'],
  ],
  pre2: [
    ['pip', 'PIP', 'BIRDS STOPPED SINGING. THAT IS NEVER GOOD.'],
    ['moore', 'MOORE', 'AMBUSH. STAY TIGHT, STRIKE FIRST.'],
  ],
  post2: [
    ['sly', 'SLY', 'YOU FIGHT WELL FOR PEOPLE WITHOUT FANGS. THE WOODS OWE VEXMOORE A DEBT. I COLLECT.'],
    ['moore', 'MOORE', 'A WOLF WITH A GRUDGE. YOU WILL FIT RIGHT IN, SLY.'],
  ],
  pre3: [
    ['mira', 'MIRA', 'THE DEAD WALK IN MY OWN CHURCH... THIS IS BLASPHEMY, MOORE.'],
    ['moore', 'MOORE', 'THEN LET US SWEEP IT CLEAN, SISTER.'],
  ],
  post3: [
    ['aer', 'AER', 'THE SKY FOLK SAW YOUR BANNER FROM THE PEAKS. MY SPEAR IS YOURS.'],
    ['mira', 'MIRA', 'THE ANCIENT RITE IS RESTORED. WARRIORS OF THE TENTH RANK MAY NOW BE PROMOTED AT ANY CHURCH.'],
  ],
  pre4: [
    ['aer', 'AER', 'THE PASS IS NARROW AND THE CLIFFS ARE CRUEL. BUT NOT TO WINGS.'],
    ['moore', 'MOORE', 'THEN BE OUR WINGS, AER. WE WILL HOLD THE ROAD.'],
  ],
  post4: [
    ['kael', 'KAEL', 'BEYOND THIS RIDGE LIES THE CASTLE... MY HOME. OUR HOME.'],
    ['moore', 'MOORE', 'WE TAKE IT BACK. ALL OF IT.'],
  ],
  pre5: [
    ['gart', 'GART', 'DARK KNIGHTS IN THE COURTYARD. TRAITORS IN OUR OWN COLORS.'],
    ['moore', 'MOORE', 'FORM UP. TODAY MOOREGARD REMEMBERS WHO SHE IS.'],
  ],
  post5: [
    ['zin', 'ZIN', 'VEXMOORE COWERS IN THE THRONE ROOM, FEEDING THE SEAL TO HIS DRAGON GOD.'],
    ['moore', 'MOORE', 'THEN WE ARE DONE KNOCKING. OPEN THE DOORS.'],
  ],
  pre6: [
    ['vex', 'VEXMOORE', 'THE SHEPHERD BOY AND HIS STRAYS. I OFFERED MOOREGARD TO THE DRAGON. IT PAYS BETTER.'],
    ['moore', 'MOORE', 'YOU SOLD A KINGDOM THAT WAS NEVER YOURS. COME DOWN OFF MY KING\'S CHAIR.'],
  ],
  post6: [
    ['vex', 'VEXMOORE', 'FOOLS... THE SEAL IS ALREADY... BROKEN. HE WAKES... HE WAKES...'],
    ['mira', 'MIRA', 'THE MOUNTAIN! MOORE, LOOK -- THE SKY ITSELF IS BURNING!'],
    ['moore', 'MOORE', 'ONE CLIMB LEFT, MY FRIENDS. THE LONGEST ONE.'],
  ],
  pre7: [
    ['moore', 'MOORE', 'WHATEVER HAPPENS ON THIS SUMMIT... IT WAS AN HONOR, ALL OF YOU.'],
    ['gart', 'GART', 'SAVE THE SPEECHES, LAD. THERE IS A LIZARD THAT NEEDS AN AXE.'],
  ],
  post7: [
    ['moore', 'MOORE', 'IT IS DONE. THE DARK DRAGON SLEEPS FOREVER.'],
  ],
};

export const ENDING = [
  'THE DARK MOORE DRAGON FELL,',
  'AND DAWN BROKE OVER THE',
  'MOUNTAIN FOR THE FIRST',
  'TIME IN A THOUSAND YEARS.',
  '',
  'MOOREGARD REBUILT HER GATE,',
  'HER BRIDGE, AND HER CHURCH.',
  'THE FORCE WENT ITS WAYS --',
  'BUT EVERY SPRING THEY MEET',
  'AT THE OLD GATE, AND DRINK',
  'TO THE ONES WHO STOOD.',
  '',
  'THE SWORD OF MOORE HANGS',
  'ABOVE THE THRONE, SHINING.',
  '',
  '     THE END',
];

// HQ chatter: per next-battle index, per companion. One short line each.
export const HQ_TALK = [
  { kael: 'DRILLS AT DAWN, CAPTAIN. THE GATE WILL NOT FALL WHILE I BREATHE.', gart: 'MY AXE IS SHARP. MY ALE IS NOT. FIX ONE OF THESE.', mira: 'I PRAYED FOR PEACE. I PACKED BANDAGES ANYWAY.' },
  { pip: 'A BRIDGE FIGHT? LOVELY. NOWHERE FOR THEM TO DODGE.', kael: 'MIND THE WATER. HORSES SINK FASTER THAN PRIDE.', mira: 'KEEP TO THE ROAD AND STAY WHERE I CAN REACH YOU.' },
  { zin: 'FORESTS DAMPEN FLAME. I WILL SIMPLY USE MORE FLAME.', sly: 'TREES ARE JUST WALLS THAT GREW LAZY.', gart: 'AMBUSHERS HATE A MAN WHO REFUSES TO DIE. THAT IS ME.' },
  { mira: 'TAKE BACK MY CHURCH AND I WILL TEACH THE OLD RITES AGAIN.', sly: 'ZOMBIES SMELL TERRIBLE. I VOLUNTEER TO STAY UPWIND.', pip: 'DEAD MEN WALKING? THEY WALK SLOW. I SHOOT FAST.' },
  { aer: 'THE PASS SINGS WITH WIND. UP THERE, I AM THE STORM.', zin: 'HARPIES. FINALLY, TARGETS THAT SAVE ME THE AIMING.', kael: 'CLIFFS AHEAD. THE HORSE STAYS ON THE ROAD, AND SO DO I.' },
  { kael: 'HOME... I SWORE AN OATH IN THAT COURTYARD. TODAY I KEEP IT.', gart: 'CASTLE FOOD IS THE BEST FOOD. FIGHT HARD, EAT WELL.', aer: 'STONE WALLS MEAN NOTHING TO WINGS. I WILL SCOUT AHEAD.' },
  { zin: 'VEXMOORE WAS MY TEACHER ONCE. I OWE HIM A REFUND.', mira: 'EVEN NOW I PITY HIM. AFTER WE WIN, MIND YOU.', sly: 'A THRONE IS JUST A CHAIR THAT LIES.' },
  { moore: 'AFTER THIS... I AM PLANTING A GARDEN. SOMETHING THAT ONLY GROWS.', gart: 'ONE DRAGON. EIGHT OF US. HARDLY SEEMS FAIR TO THE DRAGON.', mira: 'WHATEVER WAITS UP THERE, THE LIGHT GOES WITH US.' },
];

// Shop stock by next-battle index: weapon tier available, plus items.
export function shopStock(battleIdx) {
  const tier = battleIdx <= 1 ? 1 : battleIdx <= 3 ? 2 : battleIdx <= 5 ? 3 : 4;
  const fams = ['sword', 'lance', 'bow', 'axe', 'rod', 'spear', 'claw'];
  const weapons = [];
  for (const f of fams) {
    if (tier >= 2) weapons.push(f + tier);
    if (tier >= 3) weapons.push(f + (tier - 1));
  }
  return { weapons, items: ['herb', 'potion'] };
}

export const SAVE_KEY = 'shining-moore-save';
export const DIFFICULTIES = [
  { id: 'easy', name: 'SQUIRE', scale: 0.8 },
  { id: 'normal', name: 'KNIGHT', scale: 1.0 },
  { id: 'hard', name: 'LEGEND', scale: 1.25 },
];

export function reviveCost(u) { return 20 + u.level * 10; }
export function promoAllowed(save) { return !!save.flags.promo; }

// sanity checks (run at startup; warnings only)
export function validateCampaign() {
  const errs = [];
  BATTLES.forEach((b, i) => {
    if (b.map.length !== 20 || b.map.some((r) => r.length !== 20)) errs.push(`battle ${i}: map not 20x20`);
    for (const [x, y] of b.deploy) {
      if (b.map[y][x] === '#' || b.map[y][x] === 'w') errs.push(`battle ${i}: bad deploy ${x},${y}`);
    }
    for (const e of b.enemies) {
      const fly = ENEMIES[e.t].moveType === 'fly';
      if (b.map[e.y][e.x] === '#' || (b.map[e.y][e.x] === 'w' && !fly)) errs.push(`battle ${i}: enemy in wall/water ${e.t} ${e.x},${e.y}`);
    }
  });
  return errs;
}
