// Opponent roster for Moore-Out!! Each opponent is a puzzle: a sprite config
// plus pattern scripts. A script step is either an attack, a taunt, or a wait.
//
// Attack step fields:
//   m        move id (drives the animation: jabL/jabR/hookL/hookR/upperL/upperR/spinL/spinR)
//   tell     wind-up frames (telegraph). Counter window = first cWin frames.
//   active   frames the punch is live (hits unless correctly defended)
//   recover  frames the opponent is open after the punch
//   dmg      damage to the player
//   avoid    player defenses that fully avoid it: 'left' 'right' 'duck'
//            (jabs are never duckable — ducking a blockable jab still blocks it
//            for chip damage; hooks duck cleanly; uppercuts punish ducking)
//   block    true if holding block reduces it to chip damage
//   counter  true if punching during the counter window interrupts + earns a star
//   high     true = the glove flies at head height (visual)
//   kd       true = instant knockdown if it lands
//   starOnDodge  dodging the active frames earns an instant star
//   speech   taunt line shown during the tell
// Taunt step: { taunt: frames, speech } — opponent is wide open.
// Wait step:  { wait: frames }

export const OPPONENTS = [
  {
    id: 'glass',
    name: 'GLASS MOORE',
    tag: 'THE PARIS PUSHOVER',
    circuit: 'MINOR CIRCUIT',
    quote: 'PLEASE DON\'T HIT MY FACE. IT\'S NEW.',
    hp: 60,
    cfg: {
      skin: '#f0c8a0', skinShade: '#c89870', hair: '#c8a040', hairstyle: 'flat',
      trunks: '#68a8e8', trunksAccent: '#f8f8f8', gloves: '#d84040', glovesHi: '#f88888',
      feature: 'none',
    },
    guard: 'face',          // body shots land any time; face is covered
    bodyMul: 1, faceMul: 2,
    hitsToStun: 3, stunDur: 150,
    cWin: 22,
    idleMin: 55, idleMax: 100,
    counterStagger: 70,
    getUpCounts: [5, 7, 99],   // 3rd knockdown: he stays down
    downHpRestore: 0.35,
    taunts: ['MAMAN!', 'OH NO...', 'BE GENTLE!'],
    advice: [
      'HE BLINKS BEFORE EVERY HOOK. WATCH THE EYES, NOT THE GLOVES.',
      'COUNTER HIS JAB THE MOMENT HIS GLOVE FLASHES. FREE STARS, KID.',
      'HIS BODY IS WIDE OPEN. JAB, JAB, JAB. HE\'S MADE OF GLASS.',
    ],
    combos: [
      { w: 4, steps: [{ m: 'jabL', tell: 52, active: 14, recover: 44, dmg: 6, avoid: ['left', 'right'], block: true, counter: true }] },
      { w: 4, steps: [{ m: 'jabR', tell: 52, active: 14, recover: 44, dmg: 6, avoid: ['left', 'right'], block: true, counter: true }] },
      { w: 3, steps: [
        { m: 'jabL', tell: 46, active: 14, recover: 20, dmg: 6, avoid: ['left', 'right'], block: true, counter: true },
        { m: 'jabR', tell: 34, active: 14, recover: 46, dmg: 6, avoid: ['left', 'right'], block: true, counter: true },
      ] },
      { w: 3, minRound: 1, steps: [{ m: 'hookL', tell: 46, active: 12, recover: 50, dmg: 10, high: true, avoid: ['right', 'duck'], block: true, counter: true, tellBlink: true }] },
      { w: 2, minRound: 2, steps: [{ m: 'hookR', tell: 44, active: 12, recover: 50, dmg: 10, high: true, avoid: ['left', 'duck'], block: true, counter: true, tellBlink: true }] },
      { w: 2, steps: [{ taunt: 90, speech: 'NO REFUNDS!' }] },
    ],
  },

  {
    id: 'baron',
    name: 'BARON VON MOORE',
    tag: 'ZE UNCROSSABLE GUARD',
    circuit: 'MINOR CIRCUIT',
    quote: 'ZE BARON DOES NOT BLEED. HE DRIZZLES.',
    hp: 75,
    cfg: {
      skin: '#e8b088', skinShade: '#b88858', hair: '#383838', hairstyle: 'slick',
      trunks: '#282838', trunksAccent: '#f8d838', gloves: '#8838b8', glovesHi: '#c888e8',
      feature: 'monocle', mustache: true,
    },
    guard: 'all',           // uncrossable until he winds up
    bodyMul: 1, faceMul: 1.6,
    hitsToStun: 4, stunDur: 140,
    cWin: 20,
    idleMin: 45, idleMax: 85,
    counterStagger: 65,
    getUpCounts: [4, 7, 99],
    downHpRestore: 0.35,
    taunts: ['PEASANT!', 'ACH!', 'MEIN MONOCLE!'],
    advice: [
      'HIS GUARD IS A WALL. ONLY SWING WHEN HE WINDS UP OR MISSES.',
      'WHEN HE LIFTS ZAT GLOVE TO TAUNT, MAKE HIM REGRET IT.',
      'DUCK WON\'T DODGE HIS UPPERCUT. STEP LEFT OR RIGHT, THEN POUR IT ON.',
    ],
    combos: [
      { w: 4, steps: [{ m: 'jabR', tell: 38, active: 12, recover: 40, dmg: 9, avoid: ['left', 'right'], block: true, counter: true, speech: 'EN GARDE!' }] },
      { w: 3, steps: [
        { m: 'jabL', tell: 36, active: 12, recover: 16, dmg: 8, avoid: ['left', 'right'], block: true, counter: true },
        { m: 'jabR', tell: 26, active: 12, recover: 16, dmg: 8, avoid: ['left', 'right'], block: true },
        { m: 'jabL', tell: 26, active: 12, recover: 44, dmg: 8, avoid: ['left', 'right'], block: true },
      ] },
      { w: 3, minRound: 1, steps: [{ m: 'hookR', tell: 36, active: 12, recover: 46, dmg: 12, high: true, avoid: ['left', 'duck'], block: true, counter: true }] },
      { w: 2, minRound: 1, steps: [{ m: 'upperR', tell: 40, active: 12, recover: 55, dmg: 14, high: true, avoid: ['left', 'right'], block: false, counter: true, speech: 'AUFSTEHEN!' }] },
      { w: 3, steps: [{ taunt: 80, speech: 'KISS ZE GLOVE!' }] },
      { w: 2, minRound: 2, steps: [
        { m: 'hookL', tell: 34, active: 12, recover: 14, dmg: 11, high: true, avoid: ['right', 'duck'], block: true, counter: true },
        { m: 'upperR', tell: 30, active: 12, recover: 55, dmg: 14, high: true, avoid: ['left', 'right'], block: false },
      ] },
    ],
  },

  {
    id: 'mambo',
    name: 'KING MAMBO',
    tag: 'THE CARNIVAL CRUSHER',
    circuit: 'MAJOR CIRCUIT',
    quote: 'ONE, TWO, CHA-CHA-CHA. YOU FALL ON THE CHA.',
    hp: 85,
    cfg: {
      skin: '#b87848', skinShade: '#906038', hair: '#181818', hairstyle: 'crown',
      trunks: '#e8b820', trunksAccent: '#d83870', gloves: '#e83898', glovesHi: '#f888c8',
      feature: 'none', sash: '#d83870',
    },
    guard: 'all',
    bodyMul: 1, faceMul: 1.5,
    hitsToStun: 4, stunDur: 130,
    cWin: 16,
    idleMin: 40, idleMax: 75,
    dance: true,            // idle sways with the beat
    counterStagger: 60,
    getUpCounts: [4, 6, 99],
    downHpRestore: 0.3,
    taunts: ['¡AY!', 'MY CROWN!', 'OFF-BEAT!'],
    advice: [
      'HE FIGHTS ON THE BEAT. ONE-TWO-THREE, THEN THE HOOK. COUNT IT.',
      'THE MAMBO SPIN CAN\'T BE BLOCKED. DODGE RIGHT, THEN LEFT. TWICE!',
      'COUNTER THE UPPERCUT WHEN HE CROUCHES LOW. THAT\'S YOUR STAR.',
    ],
    combos: [
      { w: 4, steps: [
        { m: 'jabL', tell: 34, active: 11, recover: 12, dmg: 9, avoid: ['left', 'right'], block: true, counter: true },
        { m: 'jabR', tell: 22, active: 11, recover: 12, dmg: 9, avoid: ['left', 'right'], block: true },
        { m: 'hookL', tell: 30, active: 12, recover: 48, dmg: 12, high: true, avoid: ['right', 'duck'], block: true, speech: 'CHA-CHA!' },
      ] },
      { w: 3, steps: [{ m: 'hookR', tell: 34, active: 12, recover: 44, dmg: 12, high: true, avoid: ['left', 'duck'], block: true, counter: true }] },
      { w: 3, minRound: 1, steps: [{ m: 'upperL', tell: 36, active: 12, recover: 52, dmg: 14, high: true, avoid: ['left', 'right'], block: false, counter: true, speech: '¡ARRIBA!' }] },
      { w: 3, minRound: 1, steps: [
        { m: 'spinL', tell: 42, active: 13, recover: 8, dmg: 13, high: true, avoid: ['right'], block: false, speech: '¡MAMBO!' },
        { m: 'spinR', tell: 26, active: 13, recover: 55, dmg: 13, high: true, avoid: ['left'], block: false },
      ] },
      { w: 2, steps: [{ taunt: 70, speech: '¡BAILA!' }] },
    ],
  },

  {
    id: 'iron',
    name: 'IRON MOORE',
    tag: 'THE WALKING VAULT',
    circuit: 'MAJOR CIRCUIT',
    quote: 'GO AHEAD. PUNCH THE VAULT. SEE WHAT IT COSTS YOU.',
    hp: 100,
    cfg: {
      skin: '#c8a080', skinShade: '#987850', hair: '#282828', hairstyle: 'bald',
      trunks: '#484858', trunksAccent: '#a8a8b8', gloves: '#585868', glovesHi: '#9898a8',
      feature: 'armor',
    },
    guard: 'all',
    armored: true,          // face punches bounce off until he's stunned
    bodyMul: 1, faceMul: 2.2,
    hitsToStun: 4, stunDur: 170,
    cWin: 14,
    idleMin: 50, idleMax: 90,
    counterStagger: 40,
    getUpCounts: [3, 6, 99],
    downHpRestore: 0.3,
    taunts: ['CLANG.', 'TICKLES.', 'WARRANTY VOID.'],
    advice: [
      'HE ONLY OPENS UP AFTER HIS BIG UPPERCUT MISSES. MAKE IT MISS.',
      'FACE SHOTS BOUNCE OFF THAT JAW. WORK THE BODY UNTIL HE WOBBLES.',
      'WHEN HE\'S DIZZY THE ARMOR MEANS NOTHING. GO UPSTAIRS. GO BIG.',
    ],
    combos: [
      { w: 3, steps: [{ m: 'hookL', tell: 32, active: 12, recover: 10, dmg: 13, high: true, avoid: ['right', 'duck'], block: true }] },
      { w: 3, steps: [{ m: 'hookR', tell: 32, active: 12, recover: 10, dmg: 13, high: true, avoid: ['left', 'duck'], block: true }] },
      { w: 2, steps: [
        { m: 'jabL', tell: 30, active: 11, recover: 8, dmg: 10, avoid: ['left', 'right'], block: true },
        { m: 'jabR', tell: 24, active: 11, recover: 8, dmg: 10, avoid: ['left', 'right'], block: true },
      ] },
      { w: 4, steps: [{ m: 'upperR', tell: 38, active: 12, recover: 100, dmg: 18, high: true, avoid: ['left', 'right'], block: false, counter: true, speech: 'VAULT SLAM!' }] },
      { w: 2, minRound: 1, steps: [
        { m: 'hookL', tell: 30, active: 12, recover: 8, dmg: 13, high: true, avoid: ['right', 'duck'], block: true },
        { m: 'upperR', tell: 30, active: 12, recover: 100, dmg: 18, high: true, avoid: ['left', 'right'], block: false, counter: true },
      ] },
      { w: 1, steps: [{ taunt: 60, speech: 'INSURED.' }] },
    ],
  },

  {
    id: 'moorelight',
    name: 'MR. MOORELIGHT',
    tag: 'THE CHAMP',
    circuit: 'WORLD TITLE',
    quote: 'BLINK AND YOU\'LL MISS IT. SO... BLINK.',
    hp: 110,
    cfg: {
      skin: '#a86838', skinShade: '#805028', hair: '#101010', hairstyle: 'spike',
      trunks: '#f8d838', trunksAccent: '#181818', gloves: '#f8f8f8', glovesHi: '#ffffff',
      glovesDark: '#c8c8d0', feature: 'shades', sash: '#f8d838',
    },
    guard: 'all',
    bodyMul: 1, faceMul: 1.5,
    hitsToStun: 5, stunDur: 120,
    cWin: 12,
    idleMin: 30, idleMax: 60,
    counterStagger: 50,
    getUpCounts: [3, 5, 99],
    downHpRestore: 0.25,
    taunts: ['TOO SLOW.', 'YAWN.', 'CUTE.'],
    advice: [
      'HE FEINTS. THE FIRST TWITCH IS A LIE — DEFEND THE SECOND ONE.',
      'WHEN HE WINKS, THE EXPRESS IS COMING. DODGE IT FOR A FREE STAR.',
      'ONE STAR UPPERCUT WHILE HE\'S DIZZY. THAT\'S HOW CHAMPS FALL.',
    ],
    combos: [
      { w: 4, steps: [
        { m: 'jabL', tell: 18, active: 10, recover: 10, dmg: 10, avoid: ['left', 'right'], block: true, counter: true },
        { m: 'jabR', tell: 16, active: 10, recover: 26, dmg: 10, avoid: ['left', 'right'], block: true },
      ] },
      { w: 3, steps: [{ m: 'hookL', tell: 20, active: 11, recover: 30, dmg: 14, high: true, avoid: ['right', 'duck'], block: true, counter: true }] },
      { w: 3, steps: [
        { feint: true, m: 'jabL', tell: 16, speech: '!' },
        { m: 'hookR', tell: 14, active: 11, recover: 32, dmg: 14, high: true, avoid: ['left', 'duck'], block: true },
      ] },
      { w: 2, minRound: 1, steps: [
        { m: 'jabL', tell: 16, active: 10, recover: 8, dmg: 9, avoid: ['left', 'right'], block: true },
        { m: 'jabR', tell: 14, active: 10, recover: 8, dmg: 9, avoid: ['left', 'right'], block: true },
        { m: 'upperR', tell: 24, active: 12, recover: 45, dmg: 16, high: true, avoid: ['left', 'right'], block: false, counter: true },
      ] },
      { w: 2, minRound: 1, steps: [
        { m: 'special', tell: 44, active: 14, recover: 80, dmg: 30, high: true, kd: true, avoid: ['left', 'right'],
          block: false, starOnDodge: true, tellWink: true, speech: 'LIGHTS OUT!' },
      ] },
      { w: 2, steps: [{ taunt: 50, speech: 'HIT ME. TRY.' }] },
    ],
  },
];
