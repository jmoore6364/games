// Neon City after dark: room paintings, walkable areas, hotspots and puzzle logic.
// Scenes are painted with canvas primitives in a 16-color EGA palette (plus neon).

import { SPR } from './sprites.js';

export const SCENE_TOP = 10;
export const SCENE_BOT = 187;

// EGA palette
const C = {
  black: '#000000', blue: '#0000AA', green: '#00AA00', cyan: '#00AAAA',
  red: '#AA0000', magenta: '#AA00AA', brown: '#AA5500', lgray: '#AAAAAA',
  dgray: '#555555', lblue: '#5555FF', lgreen: '#55FF55', lcyan: '#55FFFF',
  lred: '#FF5555', pink: '#FF55FF', yellow: '#FFFF55', white: '#FFFFFF',
};

export const AWARDS = {
  fizz: 2, mints: 2, rose: 4, card: 6, jackpot: 10,
  cover: 4, dance: 8, locket: 8, reunion: 6, love: 10,
};
export const MAXSCORE = Object.values(AWARDS).reduce((a, b) => a + b, 0);

export const ITEMS = {
  fizz:   { name: 'a bottle of grape fizz', names: ['fizz', 'grape fizz', 'soda', 'pop', 'bottle'], icon: () => SPR.fizz },
  mints:  { name: 'a tin of breath mints', names: ['mints', 'mint', 'breath mints', 'tin'], icon: () => SPR.mints },
  rose:   { name: 'a long-stemmed red rose', names: ['rose', 'roses', 'flower'], icon: () => SPR.rose },
  card:   { name: "Earl's gold membership card", names: ['card', 'membership card', 'member card'], icon: () => SPR.card },
  locket: { name: "Delilah's gold locket", names: ['locket', 'necklace', 'pendant'], icon: () => SPR.locket },
};

// ------------------------------------------------------------ paint kit ----

function rc(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function dither(g, x, y, w, h, c1, c2) {
  rc(g, x, y, w, h, c1);
  g.fillStyle = c2;
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x + (yy & 1); xx < x + w; xx += 2)
      g.fillRect(xx, yy, 1, 1);
}

// deterministic per-room speckle
function speckle(g, seed, x, y, w, h, c, n) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  g.fillStyle = c;
  for (let i = 0; i < n; i++) g.fillRect(x + (rnd() * w) | 0, y + (rnd() * h) | 0, 1, 1);
}

function stars(g, seed, x, y, w, h, n, t) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < n; i++) {
    const sx = x + (rnd() * w) | 0, sy = y + (rnd() * h) | 0;
    g.fillStyle = (i + (t >> 5)) % 9 ? '#666688' : C.white;
    g.fillRect(sx, sy, 1, 1);
  }
}

function brickWall(g, x, y, w, h, base, mortar) {
  rc(g, x, y, w, h, base);
  g.fillStyle = mortar;
  for (let yy = y + 6; yy < y + h; yy += 8) {
    g.fillRect(x, yy, w, 1);
    for (let xx = x + (((yy / 8) | 0) % 2 ? 8 : 0); xx < x + w; xx += 16) g.fillRect(xx, yy - 8, 1, 8);
  }
}

function litWindow(g, x, y, w, h, glow) {
  rc(g, x - 1, y - 1, w + 2, h + 2, '#181818');
  rc(g, x, y, w, h, glow);
  rc(g, x + ((w / 2) | 0), y, 1, h, '#181818');
  rc(g, x, y + ((h / 2) | 0), w, 1, '#181818');
}

function neon(g, txt, x, y, color, on, size = 10) {
  g.font = `bold ${size}px monospace`;
  g.textAlign = 'center'; g.textBaseline = 'top';
  g.fillStyle = '#1a0a1a';
  g.fillText(txt, x + 1, y + 1);
  g.fillStyle = on ? color : '#442244';
  g.fillText(txt, x, y);
}

function sidewalk(g, seed) {
  rc(g, 0, 118, 320, 34, '#8a8a92');
  speckle(g, seed, 0, 119, 320, 32, '#9a9aa2', 260);
  speckle(g, seed + 3, 0, 119, 320, 32, '#6a6a72', 200);
  for (let x = 24; x < 320; x += 48) rc(g, x, 119, 1, 32, '#70707a'); // expansion joints
  rc(g, 0, 150, 320, 3, '#606068'); // curb
}

function road(g, t) {
  rc(g, 0, 153, 320, SCENE_BOT - 152, '#26262e');
  speckle(g, 77, 0, 154, 320, SCENE_BOT - 155, '#32323c', 300);
  g.fillStyle = C.yellow;
  for (let x = -((t >> 1) % 28); x < 320; x += 28) g.fillRect(x, 169, 14, 2); // lane dashes
}

function trafficTaxis(g, t) {
  // decorative through-traffic; the fatal kind is handled by the trigger
  const x1 = ((t * 3) % 560) - 140;
  g.drawImage(SPR.taxi, x1, 155);
  const x2 = 380 - ((t * 2 + 130) % 700);
  g.drawImage(SPR.taxiL, x2, 172);
}

function skyline(g, y, seed) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  g.fillStyle = '#14142a';
  let x = 0;
  while (x < 320) {
    const w = 18 + rnd() * 30, h = 14 + rnd() * 42;
    g.fillRect(x, y - h, w, h);
    g.fillStyle = '#20203a';
    for (let i = 0; i < 4; i++) if (rnd() > 0.5) g.fillRect(x + 3 + rnd() * (w - 7), y - h + 3 + rnd() * (h - 8), 2, 2);
    g.fillStyle = '#14142a';
    x += w + 2;
  }
}

// ---------------------------------------------------------------- rooms ----

export const ROOMS = {};

// ---- neon street (west) ----
ROOMS.street = {
  id: 'street',
  name: 'Neon Street',
  desc: 'Saturday night on Neon Street. Sticky\'s Lounge glows to the west, the Quickie Mart '
      + 'hums to the east, and between them a dark alley minds its own business. The Strip lies east. '
      + 'Traffic never, ever stops.',
  walk: [{ x: 8, y: 118, w: 304, h: 68 }],
  block: [{ x: 96, y: 136, w: 12, h: 8 }, { x: 226, y: 110, w: 8, h: 10 }],
  exits: [{ side: 'e', to: 'strip' }],
  doors: [
    { rect: { x: 52, y: 96, w: 26, h: 26 }, to: 'lounge', x: 160, y: 176, label: "Sticky's" },
    { rect: { x: 126, y: 96, w: 28, h: 26 }, to: 'alley', x: 160, y: 178, label: 'alley' },
    { rect: { x: 164, y: 96, w: 26, h: 26 }, to: 'store', x: 160, y: 176, label: 'Quickie Mart' },
  ],
  triggers: [
    {
      rect: { x: 0, y: 155, w: 320, h: 32 },
      when: (g) => !g.cutscene,
      fn: (g) => g.startCutscene('taxi'),
    },
  ],
  draw(g, t) {
    // night sky
    rc(g, 0, SCENE_TOP, 320, 40, '#0a0a1e');
    stars(g, 15, 0, SCENE_TOP, 320, 26, 40, t);
    // sticky's building
    brickWall(g, 0, 36, 126, 82, '#4a2018', '#361410');
    litWindow(g, 14, 58, 26, 22, '#c88838');
    rc(g, 46, 92, 38, 26, '#241008'); // door recess
    rc(g, 52, 94, 26, 24, '#5a2c12');
    rc(g, 54, 96, 22, 22, '#6e3a1a');
    rc(g, 72, 106, 3, 3, C.yellow);
    neon(g, "STICKY'S", 64, 42, C.pink, (t >> 4) % 4 !== 0);
    neon(g, 'LOUNGE', 64, 54, C.lcyan, (t >> 4) % 4 !== 1, 8);
    // alley gap
    rc(g, 126, 36, 28, 82, '#05050c');
    dither(g, 126, 36, 28, 40, '#05050c', '#101020');
    rc(g, 128, 108, 24, 10, '#101018');
    // quickie mart
    brickWall(g, 154, 36, 166, 82, '#5a3020', '#42221a');
    litWindow(g, 204, 52, 94, 50, '#b8e8e8');
    g.fillStyle = '#5588aa'; // shelf silhouettes in the window
    for (let i = 0; i < 4; i++) rc(g, 210 + i * 22, 66, 14, 30);
    rc(g, 160, 92, 34, 26, '#241820');
    rc(g, 164, 94, 26, 24, '#7a98a8');
    litWindow(g, 167, 96, 20, 16, '#d8f0f0');
    neon(g, 'QUICKIE MART', 250, 40, C.lcyan, true, 9);
    neon(g, '24 HR', 178, 62, C.lred, (t >> 3) % 2 === 0, 8);
    // streetlamp
    rc(g, 228, 60, 4, 58, '#3a3a44');
    rc(g, 222, 56, 16, 6, '#3a3a44');
    rc(g, 226, 62, 8, 4, C.yellow);
    g.fillStyle = 'rgba(255,255,85,0.07)';
    g.beginPath(); g.moveTo(230, 66); g.lineTo(206, 118); g.lineTo(254, 118); g.closePath(); g.fill();
    sidewalk(g, 21);
    // hydrant
    rc(g, 98, 132, 8, 10, C.red);
    rc(g, 100, 129, 4, 4, C.red);
    rc(g, 96, 135, 12, 3, '#7a0000');
    // old gum constellation
    speckle(g, 91, 0, 122, 320, 26, '#5a5a62', 40);
    road(g, t);
    trafficTaxis(g, t);
  },
  actors() { return []; },
  hotspots: [
    {
      names: ['sign', 'neon', 'neon sign', 'stickys sign'],
      at: { x: 20, y: 40, w: 90, h: 26 }, near: 200,
      verbs: { look: 'STICKY\'S LOUNGE, in hot pink neon. The apostrophe has been out since 1979.' },
    },
    {
      names: ['lounge', 'bar', 'stickys', 'lounge door'],
      at: { x: 46, y: 92, w: 38, h: 26 }, near: 44, smart: 'enter',
      verbs: {
        look: 'The door to Sticky\'s Lounge. Muffled jukebox sounds seep through the wood.',
        open: (g) => { g.goDoor('lounge', 160, 176); },
        enter: (g) => { g.goDoor('lounge', 160, 176); },
        knock: 'It\'s a bar, not a speakeasy. Just go in.',
      },
    },
    {
      names: ['alley', 'gap', 'passage'],
      at: { x: 126, y: 60, w: 28, h: 58 }, near: 44, smart: 'enter',
      verbs: {
        look: 'A dark alley between the buildings. Somewhere in there, a cat is judging someone.',
        enter: (g) => { g.goDoor('alley', 160, 178); },
        smell: 'Eau de dumpster, with top notes of regret.',
      },
    },
    {
      names: ['mart', 'store', 'quickie mart', 'shop', 'market'],
      at: { x: 160, y: 52, w: 140, h: 66 }, near: 60, smart: 'enter',
      verbs: {
        look: 'The Quickie Mart: open 24 hours, because loneliness doesn\'t keep business hours.',
        enter: (g) => { g.goDoor('store', 160, 176); },
      },
    },
    {
      names: ['hydrant', 'fire hydrant'],
      at: { x: 96, y: 128, w: 12, h: 16 }, near: 36,
      verbs: {
        look: 'A fire hydrant, painted municipal red. It has seen things.',
        take: 'It\'s bolted to the city. The city would notice.',
        sit: 'In white polyester? Absolutely not.',
      },
    },
    {
      names: ['lamp', 'streetlamp', 'light'],
      at: { x: 222, y: 56, w: 16, h: 62 }, near: 40,
      verbs: {
        look: 'A streetlamp buzzing at exactly the frequency of a headache.',
        climb: 'The last man who climbed a lamppost in this town is still up there, legally speaking.',
      },
    },
    {
      names: ['road', 'street', 'traffic', 'taxi', 'cars'],
      at: { x: 0, y: 153, w: 320, h: 34 }, near: 200,
      verbs: {
        look: 'Taxis stream past in both directions, all night, at ramming speed. Jaywalking here is less a crime than a donation.',
        call: 'You whistle for a cab. Four of them speed up.',
      },
    },
    {
      names: ['window', 'windows'],
      at: { x: 204, y: 52, w: 94, h: 50 }, near: 200,
      verbs: { look: 'Through the mart window: snack racks, a slushie machine, and Vince, motionless as furniture.' },
    },
  ],
};

// ---- sticky's lounge ----
ROOMS.lounge = {
  id: 'lounge',
  name: "Sticky's Lounge",
  desc: 'Wood paneling, forty years of cigarette varnish, and a jukebox older than you. '
      + 'Sticky polishes glasses behind the bar. At the end of it slumps Earl, a load-bearing regular. '
      + 'The street is south.',
  walk: [{ x: 8, y: 124, w: 304, h: 62 }],
  block: [
    { x: 28, y: 104, w: 212, h: 26 },  // the bar
    { x: 270, y: 118, w: 36, h: 16 },  // jukebox
    { x: 34, y: 156, w: 28, h: 10 },   // table
  ],
  exits: [{ side: 's', to: 'street' }],
  draw(g, t) {
    // paneled walls
    rc(g, 0, SCENE_TOP, 320, 94, '#3c2410');
    g.fillStyle = '#2c1a0a';
    for (let x = 0; x < 320; x += 22) g.fillRect(x, SCENE_TOP, 1, 94);
    rc(g, 0, 46, 320, 2, '#2c1a0a');
    // back-bar mirror and bottles
    rc(g, 34, 26, 200, 52, '#1c2430');
    dither(g, 34, 26, 200, 52, '#1c2430', '#28303e');
    rc(g, 32, 24, 204, 2, '#c8a838'); rc(g, 32, 78, 204, 2, '#c8a838');
    const bcols = [C.lred, C.lgreen, C.yellow, C.lcyan, C.pink, '#c88838'];
    for (let i = 0; i < 16; i++) {
      const bx = 42 + i * 12, bc = bcols[i % bcols.length];
      rc(g, bx, 58, 6, 18, bc);
      rc(g, bx + 2, 52, 2, 6, bc);
    }
    neon(g, "STICKY'S", 134, 32, C.pink, (t >> 4) % 5 !== 0);
    // floor
    for (let y = 104; y < SCENE_BOT; y += 14)
      for (let x = 0; x < 320; x += 14)
        rc(g, x, y, 14, 14, ((x / 14 + y / 14) | 0) % 2 ? '#381610' : '#2a100c');
    // sticky, behind the bar (counter face drawn after, so he tends it properly)
    g.drawImage(SPR.sticky, 118, 84);
    // bar counter
    rc(g, 28, 104, 212, 8, '#8a5a2a');
    rc(g, 28, 104, 212, 2, '#a87838');
    rc(g, 28, 112, 212, 18, '#5a3416');
    g.fillStyle = '#4a2810';
    for (let x = 36; x < 236; x += 26) g.fillRect(x, 114, 1, 14);
    // taps and a rag
    rc(g, 152, 92, 3, 12, C.lgray); rc(g, 158, 92, 3, 12, C.lgray);
    rc(g, 150, 90, 13, 3, '#8a8e9e');
    rc(g, 196, 104, 12, 4, '#d8d8d0');
    // earl's glass
    rc(g, 60, 100, 5, 6, '#c8e8f0');
    // jukebox
    rc(g, 270, 80, 36, 54, '#6a1c8a');
    g.fillStyle = '#8a2caa';
    g.beginPath(); g.arc(288, 84, 18, Math.PI, 0); g.fill();
    rc(g, 276, 88, 24, 18, '#20d8d8');
    rc(g, 278, 108, 20, 10, C.yellow);
    g.fillStyle = [C.lred, C.yellow, C.lgreen, C.lcyan][(t >> 3) % 4];
    g.fillRect(272, 82, 3, 50); g.fillRect(301, 82, 3, 50);
    // corner tv
    rc(g, 8, 20, 30, 22, '#181820');
    dither(g, 10, 22, 26, 18, '#3a3a4a', '#5a5a6a');
    // table + chairs
    rc(g, 34, 152, 28, 8, '#5a3416');
    rc(g, 36, 160, 4, 8, '#4a2810'); rc(g, 56, 160, 4, 8, '#4a2810');
  },
  actors(game, t) {
    return [{ y: 134, draw: (g) => g.drawImage(SPR.earl, 44, 114) }];
  },
  hotspots: [
    {
      names: ['sticky', 'bartender', 'barman'],
      at: { x: 114, y: 84, w: 22, h: 30 }, near: 60, smart: 'talk',
      verbs: {
        look: 'Sticky: mustache like a push broom, apron like a crime scene, heart of gold (plated).',
        talk: (g) => {
          if (!g.f.questGiven) {
            g.f.questGiven = true;
            g.say(
              '"Evening, champ. Let me guess — looking for love." Sticky doesn\'t look up from the glass '
              + 'he\'s polishing. "They all are. And in this town, love means DELILAH — sings at the Inferno, '
              + 'sharp enough to cut glass. Every fella in Neon City has struck out with her."',
              '"Course, the Inferno\'s members-only." He tips his head toward the end of the bar. '
              + '"Earl there\'s got a gold card from his disco days. And Earl would sell his soul for a '
              + 'grape fizz — Quickie Mart\'s got \'em — ever since he went broke."',
            );
            return;
          }
          if (!g.f.cardGiven) return '"Grape fizz, champ. Two bucks at the mart. Cheapest miracle in town."';
          if (!g.f.roseGiven) return '"Off to see Delilah? Two words: red roses and fresh breath. That\'s four words. '
            + 'Vince stocks both."';
          if (g.f.danced && !g.f.lockFound) return '"Lost her locket in MY alley, did she? Check the dumpster — and mind '
            + 'the dark end, and mind Duchess. Mostly Duchess."';
          if (g.f.invited) return '"The ROOF of the Grand? Champ, I\'d start walking before she changes her mind."';
          return '"Knock \'em dead, tiger. Metaphorically. The Inferno has a strict policy."';
        },
      },
    },
    {
      names: ['earl', 'drunk', 'regular', 'old man'],
      at: { x: 42, y: 112, w: 18, h: 24 }, near: 46, smart: 'talk',
      verbs: {
        look: (g) => g.f.cardGiven
          ? 'Earl sits a little straighter now, cradling his grape fizz like a chalice.'
          : 'Earl has been part of this barstool since the Ford administration. His lips form a single, silent word: "fizz."',
        talk: (g) => g.f.cardGiven
          ? '"In \'77," Earl says, misty, "I did the hustle so hard the mayor sent a card." He pats where the card used to be. "Do it proud, kid."'
          : '"...fizz..." croaks Earl, with the dignity of a man who knows exactly what he wants.',
        give_fizz: (g) => {
          g.remove('fizz');
          g.f.cardGiven = true;
          g.give('card');
          g.award('card');
          g.say(
            'Earl\'s hands close around the grape fizz like it\'s the last chopper out. He drains half of it, '
            + 'shudders from hat to socks, and focuses on you for the first time.',
            '"You\'re alright, kid." From somewhere inside his jacket he produces a GOLD MEMBERSHIP CARD, '
            + 'edges worn soft. "Inferno, class of \'77. Disco champion, me. Tell Bruno the card\'s good — '
            + 'the cover charge, that\'s your problem."',
          );
        },
        buy: '"...fizz..." He\'s not selling. He\'s requesting.',
        pet: 'You pat Earl on the shoulder. A small cloud of dust and better days rises.',
      },
    },
    {
      names: ['jukebox', 'juke'],
      at: { x: 270, y: 78, w: 36, h: 56 }, near: 44, smart: 'use',
      verbs: {
        look: 'A Wurli-ish jukebox in grape purple. Every song is disco. Every. Song.',
        use: (g) => { g.sfx.scratch(); return 'You punch B-7. The jukebox thinks about it, then plays the same song, but louder. Sticky nods approvingly.'; },
        play: (g) => { g.sfx.scratch(); return 'You punch B-7. The jukebox thinks about it, then plays the same song, but louder. Sticky nods approvingly.'; },
        kill: 'Sticky clears his throat. The jukebox is family.',
      },
    },
    {
      names: ['beer', 'drink'],
      at: { x: 28, y: 88, w: 212, h: 40 }, near: 60,
      verbs: {
        look: 'The taps pour two options: cold, and colder.',
        buy: (g) => {
          if (g.f.beerBought) return '"Nope," says Sticky, without turning around. "You\'ve got a big night, champ. Bartender\'s orders."';
          if (!g.pay(1)) return '"Beer\'s a buck. You\'re short. Story of this whole bar, champ."';
          g.f.beerBought = true;
          g.sfx.slurp();
          return 'One cold beer, one dollar. You nurse it like a professional. Liquid courage: acquired.';
        },
        drink: (g) => g.f.beerBought ? 'You already had yours. Pace yourself, Casanova.' : 'Order one first. This is a business.',
      },
    },
    {
      names: ['special', 'stickys special', 'cocktail', 'house special'],
      at: { x: 150, y: 88, w: 20, h: 20 }, near: 70,
      verbs: {
        look: 'A chalkboard behind the taps reads: STICKY\'S SPECIAL — $1. IF YOU HAVE TO ASK, DON\'T.',
        buy: (g) => {
          g.sfx.slurp();
          g.die('Sticky slides over something teal that smokes slightly. "Your funeral," he says, accurately. '
            + 'It tastes like lightning and pool cleaner. The room does a slow, elegant barrel roll, '
            + 'and the last thing you see is the ceiling fan, waving goodbye.');
        },
        drink: (g) => ROOMS.lounge.hotspots[4].verbs.buy(g),
      },
    },
    {
      names: ['bottles', 'bottle', 'bar'],
      at: { x: 34, y: 26, w: 200, h: 52 }, near: 200,
      verbs: { look: 'Rows of bottles in colors not found in nature, doubled by a mirror that flatters no one.' },
    },
    {
      names: ['tv', 'television'],
      at: { x: 8, y: 20, w: 30, h: 22 }, near: 200,
      verbs: { look: 'The TV shows either static or the local news. In Neon City it\'s hard to tell.' },
    },
    {
      names: ['table', 'chairs'],
      at: { x: 34, y: 150, w: 28, h: 16 }, near: 40,
      verbs: { look: 'A table for two, reserved eternally for nobody.', sit: 'You\'re not here to sit. You\'re here to become legend.' },
    },
  ],
};

// ---- the alley ----
ROOMS.alley = {
  id: 'alley',
  name: 'The Alley',
  desc: 'The alley behind Sticky\'s: a dumpster, a puddle with delusions of mirrorhood, and a fire '
      + 'escape nobody has ever escaped down. A cat supervises from the dumpster lid. The dark end, '
      + 'north, is best left unaudited. The street is south.',
  walk: [{ x: 70, y: 122, w: 180, h: 64 }],
  block: [{ x: 76, y: 128, w: 64, h: 24 }, { x: 148, y: 152, w: 24, h: 8 }],
  exits: [{ side: 's', to: 'street' }],
  triggers: [
    {
      rect: { x: 70, y: 122, w: 180, h: 5 },
      when: (g) => !g.cutscene,
      fn: (g) => g.die('You stride into the dark end of the alley, glowing like a full moon in that white suit. '
        + 'A voice says "nice threads," and then several things happen very fast, none of them to your advantage. '
        + 'Your last thought: at least the suit stayed clean.'),
    },
  ],
  draw(g, t) {
    // sky slot between rooftops
    rc(g, 0, SCENE_TOP, 320, 20, '#0a0a1e');
    stars(g, 31, 60, SCENE_TOP, 200, 16, 16, t);
    rc(g, 0, SCENE_TOP, 66, 20, '#10101c'); rc(g, 254, SCENE_TOP, 66, 20, '#10101c');
    // walls
    brickWall(g, 0, 22, 70, 164, '#3a1c14', '#28120c');
    brickWall(g, 250, 22, 70, 164, '#341a16', '#22100c');
    // alley floor, fading to black at the deep end
    rc(g, 70, 22, 180, 165, '#2e2e36');
    dither(g, 70, 90, 180, 40, '#2e2e36', '#1c1c24');
    rc(g, 70, 22, 180, 60, '#0a0a10');
    dither(g, 70, 78, 180, 14, '#0a0a10', '#1c1c24');
    speckle(g, 41, 70, 118, 180, 66, '#3c3c46', 240);
    // graffiti
    neon(g, 'DISCO LIVES', 34, 70, C.pink, true, 8);
    g.save(); g.translate(30, 96); g.rotate(-0.12);
    neon(g, '<3', 0, 0, C.lred, true, 8);
    g.restore();
    // fire escape
    g.fillStyle = '#20242c';
    for (let i = 0; i < 4; i++) {
      const fy = 34 + i * 26;
      rc(g, 258, fy, 54, 3, '#20242c');
      rc(g, 258, fy - 14, 3, 17, '#20242c');
      rc(g, 309, fy - 14, 3, 17, '#20242c');
      for (let x = 262; x < 308; x += 8) rc(g, x, fy - 12, 1, 12, '#181c22');
    }
    // dumpster
    rc(g, 76, 116, 64, 36, '#2a5a2a');
    rc(g, 76, 116, 64, 6, '#1e461e');
    rc(g, 74, 112, 68, 6, '#357035');
    speckle(g, 51, 76, 118, 64, 32, '#1e461e', 90);
    speckle(g, 52, 76, 118, 64, 32, '#7a5a20', 40); // rust
    rc(g, 82, 148, 8, 5, '#181818'); rc(g, 126, 148, 8, 5, '#181818');
    // trash bags
    g.fillStyle = '#181820';
    g.beginPath(); g.arc(156, 156, 9, 0, 7); g.fill();
    g.beginPath(); g.arc(166, 158, 7, 0, 7); g.fill();
    rc(g, 154, 146, 3, 4, '#3a3a44');
    // bottles
    rc(g, 176, 156, 3, 8, '#2a6a3a'); rc(g, 182, 158, 3, 6, '#6a2a2a');
    // puddle
    g.fillStyle = '#222236';
    g.beginPath(); g.ellipse(206, 168, 26, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#3a3a5e';
    g.beginPath(); g.ellipse(206, 168, 22, 4, 0, 0, 7); g.fill();
    g.fillStyle = C.pink; // neon reflection
    g.fillRect(196 + ((t >> 4) % 3), 166, 12, 1);
  },
  actors(game, t) {
    const blink = (t % 200) < 14;
    return [{
      y: 121,
      draw: (g) => {
        g.drawImage(SPR.cat, 96, 103);
        if (blink) { g.fillStyle = '#5a5a66'; g.fillRect(98, 106, 2, 1); g.fillRect(101, 106, 2, 1); }
      },
    }];
  },
  hotspots: [
    {
      names: ['dumpster', 'trash', 'garbage', 'bin'],
      at: { x: 74, y: 110, w: 68, h: 42 }, near: 44, smart: 'search',
      verbs: {
        look: (g) => g.f.lockKnown && !g.f.lockFound
          ? 'THE dumpster. Somewhere in there is Delilah\'s locket. Somewhere in there is also everything else.'
          : 'A municipal-green dumpster. The cat on the lid charges no admission but accepts tribute.',
        open: (g) => ROOMS.alley.hotspots[0].verbs.search(g),
        search: (g) => {
          if (g.f.lockFound) return 'Once was enough. Some victories should not be repeated.';
          if (!g.f.lockKnown) return 'You lift the lid, gag gently, and close it. You\'d need an excellent reason. '
            + 'You do not currently have an excellent reason.';
          g.f.lockFound = true;
          g.give('locket');
          g.award('locket');
          g.sfx.pickup();
          g.say(
            'You take a breath, apologize to the suit, and go in. Past the banana peels, beneath a pizza box '
            + 'of unspeakable vintage, something glints...',
            'DELILAH\'S GOLD LOCKET — chain snapped, heart intact. The cat watches you climb out, '
            + 'covered in coffee grounds, and slow-blinks with something like respect.',
          );
        },
        climb: 'Only as a last resort. (SEARCH DUMPSTER, if you must.)',
        smell: 'From this range? Bold. It smells like a health code violation earning overtime.',
      },
    },
    {
      names: ['cat', 'duchess', 'kitty'],
      at: { x: 94, y: 102, w: 14, h: 12 }, near: 40, smart: 'pet',
      verbs: {
        look: 'A charcoal alley cat with judgmental green eyes. Locals call her Duchess. She earned it.',
        talk: (g) => { g.sfx.meow(); return '"Mrow," says Duchess, which is alley-speak for "you\'re standing in my office."'; },
        pet: (g) => { g.sfx.meow(); return 'Duchess permits exactly two pets, then raises one paw: audience concluded.'; },
        take: 'Duchess declines, in writing, with claws.',
        give_fizz: 'Duchess sniffs the grape fizz and files a formal complaint.',
      },
    },
    {
      names: ['graffiti', 'wall', 'writing'],
      at: { x: 4, y: 60, w: 62, h: 46 }, near: 60,
      verbs: {
        look: 'Spray paint declares DISCO LIVES, with a heart. Someone here believes. Someone here is right.',
        read: 'DISCO LIVES. And below it, a heart. Poetry is alive and well in Neon City.',
      },
    },
    {
      names: ['puddle', 'water'],
      at: { x: 180, y: 160, w: 52, h: 14 }, near: 40,
      verbs: {
        look: 'A puddle reflecting pink neon. In it you look amazing, if a little rippled.',
        drink: 'There is a line, and that line is well behind you, and you\'re still not drinking it.',
        swim: 'It\'s two inches deep. Even your ego wouldn\'t float.',
      },
    },
    {
      names: ['fire escape', 'escape', 'ladder', 'stairs'],
      at: { x: 256, y: 20, w: 58, h: 100 }, near: 60,
      verbs: {
        look: 'A fire escape held together by rust and municipal optimism.',
        climb: 'The ladder is rusted shut, and you\'re wearing white. Both facts are final.',
      },
    },
    {
      names: ['darkness', 'dark', 'shadows', 'dark end'],
      at: { x: 70, y: 22, w: 180, h: 70 }, near: 200,
      verbs: {
        look: 'The far end of the alley is dark enough to have its own cover charge. Whatever\'s in there can keep it.',
      },
    },
  ],
};

// ---- quickie mart ----
ROOMS.store = {
  id: 'store',
  name: 'Quickie Mart',
  desc: 'Fluorescent lights hum over the Quickie Mart. Vince guards the register with the serenity of '
      + 'a man beyond surprise. Cooler in the back, snack aisle in the middle, roses by the counter, '
      + 'magazines you will not be reading. The street is south.',
  walk: [{ x: 8, y: 118, w: 304, h: 68 }],
  block: [
    { x: 16, y: 104, w: 104, h: 28 },  // counter
    { x: 122, y: 128, w: 22, h: 16 },  // rose bucket
    { x: 84, y: 152, w: 112, h: 16 },  // snack gondola
    { x: 256, y: 100, w: 56, h: 30 },  // cooler
    { x: 226, y: 152, w: 44, h: 12 },  // magazine rack
  ],
  exits: [{ side: 's', to: 'street' }],
  draw(g, t) {
    // walls + fluorescents
    rc(g, 0, SCENE_TOP, 320, 90, '#c8c8b4');
    rc(g, 0, SCENE_TOP, 320, 4, '#a8a894');
    for (const lx of [60, 180]) {
      rc(g, lx, SCENE_TOP + 4, 80, 6, '#f8f8f0');
      rc(g, lx, SCENE_TOP + 10, 80, 1, '#888878');
      if ((t >> 2) % 20 === 0) rc(g, lx, SCENE_TOP + 4, 80, 6, '#d8d8c8'); // flicker
    }
    // back shelves
    for (let row = 0; row < 2; row++) {
      const sy = 34 + row * 30;
      rc(g, 10, sy, 230, 24, '#9a9a8a');
      rc(g, 10, sy + 22, 230, 3, '#7a7a6a');
      const pc = [C.lred, C.yellow, C.lgreen, C.lcyan, C.pink, '#c88838'];
      for (let i = 0; i < 21; i++) rc(g, 14 + i * 11, sy + 6, 8, 15, pc[(i + row * 3) % pc.length]);
    }
    // cooler
    rc(g, 254, 30, 60, 100, '#b8c8d0');
    rc(g, 258, 36, 52, 84, '#d8f0f8');
    dither(g, 258, 36, 52, 84, '#d8f0f8', '#b8e0f0');
    for (let r = 0; r < 3; r++) {
      rc(g, 258, 60 + r * 24, 52, 2, '#98b0b8');
      for (let i = 0; i < 6; i++) rc(g, 262 + i * 8, 44 + r * 24, 5, 14, i % 2 ? '#8030c0' : '#c05030');
    }
    rc(g, 254, 26, 60, 6, '#8898a0');
    neon(g, 'FIZZ', 284, 16, C.pink, (t >> 4) % 3 !== 0, 8);
    // floor tiles
    for (let y = 100; y < SCENE_BOT; y += 12)
      for (let x = 0; x < 320; x += 12)
        rc(g, x, y, 12, 12, ((x / 12 + y / 12) | 0) % 2 ? '#d8d8cc' : '#c0c0b4');
    // vince behind the counter (face drawn after him)
    g.drawImage(SPR.vince, 48, 86);
    // counter
    rc(g, 16, 104, 104, 8, '#8a8a7a');
    rc(g, 16, 104, 104, 2, '#a8a898');
    rc(g, 16, 112, 104, 20, '#6a6a5a');
    // register
    rc(g, 22, 92, 20, 14, '#3a3a44');
    rc(g, 24, 88, 14, 6, '#2a2a34');
    rc(g, 26, 94, 12, 4, '#55FF55');
    // mints display on the counter
    rc(g, 92, 98, 18, 8, '#d8d8d0');
    rc(g, 94, 100, 6, 4, '#2a8c2a'); rc(g, 102, 100, 6, 4, '#2a8c2a');
    // rose bucket
    rc(g, 122, 130, 22, 14, '#5a5a6a');
    rc(g, 124, 132, 18, 10, '#3a3a4a');
    for (let i = 0; i < 5; i++) {
      rc(g, 126 + i * 3, 118, 1, 14, '#2a8c2a');
      rc(g, 125 + i * 3, 114, 3, 4, i % 2 ? '#e02858' : '#c01838');
    }
    // snack gondola
    rc(g, 84, 140, 112, 14, '#9a9a8a');
    rc(g, 84, 152, 112, 14, '#8a8a7a');
    const sc = [C.yellow, C.lred, C.lgreen, '#c88838', C.pink];
    for (let i = 0; i < 13; i++) rc(g, 88 + i * 8, 142, 6, 10, sc[i % sc.length]);
    // magazine rack
    rc(g, 226, 148, 44, 16, '#7a5a3a');
    for (let i = 0; i < 4; i++) {
      rc(g, 229 + i * 10, 140, 8, 12, ['#c05030', '#3050c0', '#c030a0', '#30a050'][i]);
      rc(g, 230 + i * 10, 142, 6, 3, '#f0f0e0');
    }
  },
  actors() { return []; },
  hotspots: [
    {
      names: ['vince', 'clerk', 'cashier'],
      at: { x: 44, y: 86, w: 22, h: 30 }, near: 60, smart: 'talk',
      verbs: {
        look: 'Vince has worked the night shift so long his blood type is fluorescent. Nothing you do tonight will surprise him.',
        talk: (g) => {
          if (!g.f.questGiven) return '"Fizz two bucks. Mints one. Roses five. Restroom\'s broken." Vince has answered every possible question preemptively.';
          if (!g.has('fizz') && !g.f.cardGiven) return '"Grape fizz? Cooler, back wall. Two bucks. Earl again?" You nod. "Tell him Vince says hi and also he owes me eleven dollars."';
          return '"Fizz two, mints one, roses five." A pause. "Good luck with Delilah." You didn\'t say anything about Delilah. Vince knows.';
        },
      },
    },
    {
      names: ['fizz', 'grape fizz', 'soda', 'pop', 'cooler'],
      at: { x: 254, y: 30, w: 60, h: 100 }, near: 50, smart: 'buy',
      verbs: {
        look: 'The cooler hums with grape fizz: purple, carbonated, allegedly a beverage.',
        buy: (g) => {
          if (g.has('fizz')) return 'One bottle of Earl-fuel is plenty. It\'s two dollars a miracle.';
          if (!g.pay(2)) return '"Two bucks," says Vince, from across the store, without looking.';
          g.give('fizz');
          g.award('fizz');
          g.sfx.doorbell();
          return 'One grape fizz, ice cold. Vince rings it up from pure muscle memory. "Tell Earl hi."';
        },
        take: (g) => ROOMS.store.hotspots[1].verbs.buy(g),
        open: 'The cooler door squeaks open. Cold grape-scented air rolls out. Buy something or close it — Vince pays the electric.',
      },
    },
    {
      names: ['mints', 'mint', 'breath mints'],
      at: { x: 92, y: 96, w: 18, h: 12 }, near: 44, smart: 'buy',
      verbs: {
        look: '"ARCTIC BLAST" breath mints: strong enough to be regulated, minty enough to matter.',
        buy: (g) => {
          if (g.has('mints')) return 'You\'ve got a tin already. Your breath can only get so legal.';
          if (!g.pay(1)) return 'One dollar. You cannot currently afford fresh breath. Let that sink in.';
          g.give('mints');
          g.award('mints');
          g.sfx.doorbell();
          return 'One tin of ARCTIC BLAST. "Good call," says Vince, which from Vince is a standing ovation.';
        },
        take: (g) => ROOMS.store.hotspots[2].verbs.buy(g),
        eat: 'Buy them first. Vince is watching. Vince is always watching.',
      },
    },
    {
      names: ['rose', 'roses', 'flower', 'flowers'],
      at: { x: 120, y: 112, w: 26, h: 32 }, near: 44, smart: 'buy',
      verbs: {
        look: 'A bucket of long-stemmed red roses, improbably fresh. The Quickie Mart contains multitudes.',
        buy: (g) => {
          if (g.has('rose')) return 'One rose is romance. A dozen is a subpoena.';
          if (!g.pay(5)) return '"Five bucks a stem," says Vince. You are worth less than a flower right now. Noted.';
          g.give('rose');
          g.award('rose');
          g.sfx.doorbell();
          return 'You select the reddest rose in the bucket. Vince wraps the stem in a paper towel, which is Quickie Mart for gift wrap.';
        },
        take: (g) => ROOMS.store.hotspots[3].verbs.buy(g),
        smell: 'It smells like every good decision you\'re about to make.',
      },
    },
    {
      names: ['magazines', 'magazine', 'rack'],
      at: { x: 226, y: 138, w: 44, h: 26 }, near: 44,
      verbs: {
        look: 'The top shelf is sealed in plastic and shame. The bottom shelf is fishing magazines, which are worse.',
        buy: 'Vince raises one eyebrow a single millimeter. You put it back. Tonight you\'re a gentleman.',
        take: 'Vince raises one eyebrow a single millimeter. You put it back. Tonight you\'re a gentleman.',
        read: 'You browse "CROCHET QUARTERLY" to look innocent. You have never looked less innocent.',
      },
    },
    {
      names: ['register', 'till', 'cash register'],
      at: { x: 22, y: 88, w: 20, h: 18 }, near: 50,
      verbs: {
        look: 'The register displays $0.00 and, somehow, disappointment.',
        take: 'Vince slides it out of reach without looking up. He has done this before.',
        open: 'Vince slides it out of reach without looking up. He has done this before.',
      },
    },
    {
      names: ['snacks', 'chips', 'aisle', 'shelf', 'shelves'],
      at: { x: 84, y: 138, w: 112, h: 28 }, near: 50,
      verbs: {
        look: 'Chips in flavors science regrets. You\'re saving your appetite for romance.',
        buy: 'Crumbs on white polyester? Tonight of all nights? No.',
        eat: 'Crumbs on white polyester? Tonight of all nights? No.',
      },
    },
  ],
};

// ---- the strip (east) ----
ROOMS.strip = {
  id: 'strip',
  name: 'The Strip',
  desc: 'The neon heart of Neon City. The GRAND casino blazes to the west, the HOTEL GRAND towers '
      + 'in the middle, and the INFERNO disco throbs to the east — behind Bruno, a bouncer with the '
      + 'build and warmth of a vending machine. Neon Street is west. The traffic remains lethal.',
  walk: [{ x: 8, y: 118, w: 304, h: 68 }],
  block: [{ x: 284, y: 132, w: 16, h: 10 }],
  exits: [{ side: 'w', to: 'street' }],
  doors: [
    { rect: { x: 58, y: 96, w: 30, h: 26 }, to: 'casino', x: 160, y: 176, label: 'casino' },
    {
      rect: { x: 162, y: 96, w: 28, h: 26 }, to: 'rooftop', x: 160, y: 178, label: 'hotel',
      when: (g) => g.f.invited,
      deny: (g) => g.say('The doorman materializes like an eclipse. "Guests of the Grand only." His tone suggests '
        + 'you are not, and have never been, a guest of anything.'),
    },
    {
      rect: { x: 252, y: 96, w: 30, h: 26 }, to: 'disco', x: 160, y: 178, label: 'disco',
      when: (g) => g.f.coverPaid,
      deny: (g) => {
        if (!g.has('card')) g.say('Bruno\'s palm lands on your chest like a parking barrier. "Members only." '
          + 'He says it the way other people say "goodbye."');
        else g.say('Bruno eyes Earl\'s gold card. "Card\'s good. Cover\'s twenty bucks." He waits. '
          + 'Mountains wait like this. (Try PAY BOUNCER.)');
      },
    },
  ],
  triggers: [
    {
      rect: { x: 0, y: 155, w: 320, h: 32 },
      when: (g) => !g.cutscene,
      fn: (g) => g.startCutscene('taxi'),
    },
  ],
  draw(g, t) {
    rc(g, 0, SCENE_TOP, 320, 40, '#0a0a1e');
    stars(g, 62, 0, SCENE_TOP, 320, 20, 30, t);
    // hotel tower rises into the sky
    rc(g, 138, 14, 76, 104, '#2e2e42');
    g.fillStyle = '#f0d888';
    let hs = 5;
    const hrnd = () => (hs = (hs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let wy = 20; wy < 76; wy += 10)
      for (let wx = 144; wx < 208; wx += 12)
        if (hrnd() > 0.45) g.fillRect(wx, wy, 6, 5);
    neon(g, 'HOTEL', 176, 16, C.yellow, true, 8);
    // casino
    rc(g, 0, 34, 138, 84, '#3a1030');
    // marquee with chasing bulbs
    rc(g, 8, 36, 122, 38, '#1a0818');
    rc(g, 10, 38, 118, 34, '#2a1028');
    g.fillStyle = C.yellow;
    for (let i = 0; i < 30; i++) {
      const per = 2 * (118 + 34) / 30;
      let p = (i * per + (t >> 1) % per);
      p = p % (2 * (118 + 34));
      let bx, by;
      if (p < 118) { bx = 10 + p; by = 38; }
      else if (p < 118 + 34) { bx = 128; by = 38 + (p - 118); }
      else if (p < 236) { bx = 128 - (p - 152); by = 72; }
      else { bx = 10; by = 72 - (p - 236); }
      g.fillRect(bx, by, 2, 2);
    }
    neon(g, 'GRAND', 69, 42, C.yellow, true, 14);
    neon(g, 'CASINO', 69, 58, C.lred, (t >> 3) % 2 === 0, 9);
    rc(g, 52, 90, 42, 28, '#241020');
    rc(g, 58, 92, 30, 26, '#c8a838');
    rc(g, 72, 92, 2, 26, '#8a6818');
    litWindow(g, 60, 96, 10, 14, '#f8e8b0'); litWindow(g, 76, 96, 10, 14, '#f8e8b0');
    // hotel entrance + awning
    rc(g, 150, 80, 52, 12, '#1e5a34');
    g.fillStyle = '#2a7a48';
    for (let x = 150; x < 202; x += 8) g.fillRect(x, 80, 4, 12);
    rc(g, 148, 90, 56, 3, '#163f24');
    rc(g, 158, 92, 36, 26, '#242430');
    rc(g, 162, 94, 28, 24, '#4a4a5e');
    litWindow(g, 165, 96, 22, 18, '#d8d8f0');
    // disco inferno
    rc(g, 214, 30, 106, 88, '#200a34');
    dither(g, 214, 30, 106, 20, '#200a34', '#2e1244');
    // neon flame
    const fc = [(t >> 2) % 2 ? C.lred : C.yellow, (t >> 2) % 2 ? C.yellow : C.lred];
    g.fillStyle = fc[0];
    g.beginPath(); g.moveTo(258, 62); g.lineTo(266, 34); g.lineTo(272, 50); g.lineTo(278, 38); g.lineTo(282, 62); g.closePath(); g.fill();
    g.fillStyle = fc[1];
    g.beginPath(); g.moveTo(263, 62); g.lineTo(269, 46); g.lineTo(275, 62); g.closePath(); g.fill();
    neon(g, 'INFERNO', 268, 64, [C.pink, C.lcyan, C.yellow][(t >> 3) % 3], true, 11);
    rc(g, 246, 90, 42, 28, '#180826');
    rc(g, 252, 92, 30, 26, '#3a1a5e');
    rc(g, 266, 92, 2, 26, '#28104a');
    // velvet rope
    rc(g, 244, 128, 3, 14, '#c8a838'); rc(g, 288, 128, 3, 14, '#c8a838');
    g.strokeStyle = '#a01838'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(246, 130); g.quadraticCurveTo(266, 138, 289, 130); g.stroke();
    sidewalk(g, 43);
    // red carpet from the casino door
    rc(g, 56, 118, 34, 32, '#8a1020');
    dither(g, 56, 118, 34, 32, '#8a1020', '#6a0c18');
    road(g, t);
    trafficTaxis(g, t + 40);
  },
  actors(game, t) {
    return [{
      y: 142,
      draw: (g) => g.drawImage(SPR.bouncer, 284, 122),
    }];
  },
  hotspots: [
    {
      names: ['bruno', 'bouncer', 'doorman of inferno'],
      at: { x: 282, y: 120, w: 18, h: 24 }, near: 50, smart: 'talk',
      verbs: {
        look: 'Bruno. Arms crossed, sunglasses at midnight, expression carved from municipal granite.',
        talk: (g) => {
          if (g.f.coverPaid) return '"Enjoy the Inferno." Bruno almost smiles. Somewhere, a glacier calves.';
          if (!g.has('card')) return '"Members only." Bruno\'s sunglasses reflect you, twice, both times unimpressed.';
          return '"Card\'s good," Bruno concedes. "Cover\'s twenty bucks." (Try PAY BOUNCER. The casino pays better than it looks.)';
        },
        pay: (g) => {
          if (g.f.coverPaid) return 'You\'ve paid. Bruno remembers everything. Especially you.';
          if (!g.has('card')) return '"Pay for WHAT?" Bruno says. "You\'re not even a member." Harsh, but procedurally correct.';
          if (!g.pay(20)) return 'You pull out your cash. Bruno counts it from a distance of four feet, snorts, '
            + 'and resumes being a wall. Twenty bucks. (The GRAND casino has slot machines...)';
          g.f.coverPaid = true;
          g.award('cover');
          g.sfx.kaching();
          return 'You hand over twenty dollars with the card. Bruno stamps your hand with a tiny flame, '
            + 'unclips the velvet rope, and grants you three degrees of nod. You\'re IN.';
        },
        give_card: (g) => g.f.coverPaid
          ? 'Bruno has seen the card. Bruno sees everything.'
          : '"Card\'s good," Bruno says, handing it back. "Cover\'s still twenty." (PAY BOUNCER.)',
        kill: (g) => g.die('You take a swing at Bruno. What happens next is difficult to describe without diagrams, '
          + 'but the upshot is that Bruno folds you into a compact, travel-sized shape and files you in the '
          + 'dumpster behind Sticky\'s. Duchess the cat pronounces you legally deceased.'),
        kiss: '"No," says Bruno, to a question you had not yet asked.',
      },
    },
    {
      names: ['casino', 'grand', 'marquee', 'casino door'],
      at: { x: 8, y: 36, w: 130, h: 82 }, near: 60, smart: 'enter',
      verbs: {
        look: 'The GRAND: a thousand chasing bulbs spelling out the universal message "give us your money."',
        enter: (g) => { g.goDoor('casino', 160, 176); },
      },
    },
    {
      names: ['hotel', 'hotel grand', 'tower', 'hotel door'],
      at: { x: 148, y: 80, w: 56, h: 38 }, near: 50, smart: 'enter',
      verbs: {
        look: (g) => g.f.invited
          ? 'The Hotel Grand. Somewhere at the top, a rooftop terrace. And Delilah. Deep breath, champ.'
          : 'The Hotel Grand: forty floors of places you can\'t afford to sleep. The doorman guards it like scripture.',
        enter: (g) => {
          if (!g.f.invited) return 'The doorman shifts half an inch, which in doorman is a full tackle. Guests only.';
          g.goDoor('rooftop', 160, 178);
        },
      },
    },
    {
      names: ['disco', 'inferno', 'club', 'disco door'],
      at: { x: 214, y: 30, w: 106, h: 88 }, near: 70, smart: 'enter',
      verbs: {
        look: 'The INFERNO. The bass line is audible from the street. So is Bruno\'s disapproval.',
        enter: (g) => {
          if (g.f.coverPaid) { g.goDoor('disco', 160, 178); return; }
          if (!g.has('card')) return 'Bruno intercepts you without appearing to move. "Members only."';
          return 'Bruno taps the rope. "Cover\'s twenty." (PAY BOUNCER.)';
        },
      },
    },
    {
      names: ['carpet', 'red carpet'],
      at: { x: 56, y: 118, w: 34, h: 32 }, near: 60,
      verbs: { look: 'A red carpet, laid out to make losers feel like winners on the way in. Genius, really.' },
    },
    {
      names: ['rope', 'velvet rope'],
      at: { x: 244, y: 126, w: 48, h: 18 }, near: 44,
      verbs: {
        look: 'A velvet rope. Physically, it could stop a moth. Socially, it could stop an army.',
        climb: 'Bruno\'s head rotates toward you like a security camera. You pretend to stretch.',
      },
    },
    {
      names: ['road', 'street', 'traffic', 'taxi', 'cars'],
      at: { x: 0, y: 153, w: 320, h: 34 }, near: 200,
      verbs: {
        look: 'The Strip\'s traffic is faster and richer than Neon Street\'s, and exactly as fatal.',
        call: 'You raise an arm for a taxi. Three lanes of them decline simultaneously.',
      },
    },
  ],
};

// ---- the grand casino ----
ROOMS.casino = {
  id: 'casino',
  name: 'The Grand Casino',
  desc: 'Red velvet, gold trim, and a carpet designed by someone angry at eyes. A row of slot machines '
      + 'blinks by the west wall — the one on the end is LUCKY LUCY. The cashier\'s cage glitters to '
      + 'the east, guarded. The Strip is south.',
  walk: [{ x: 8, y: 118, w: 304, h: 68 }],
  block: [
    { x: 22, y: 104, w: 100, h: 22 },  // slots
    { x: 148, y: 104, w: 74, h: 20 },  // card table
    { x: 248, y: 106, w: 64, h: 24 },  // cage
  ],
  exits: [{ side: 's', to: 'strip' }],
  draw(g, t) {
    // walls
    rc(g, 0, SCENE_TOP, 320, 88, '#4a1020');
    dither(g, 0, SCENE_TOP, 320, 88, '#4a1020', '#5a1828');
    rc(g, 0, SCENE_TOP + 40, 320, 2, '#c8a838');
    // art-deco fans
    g.strokeStyle = '#c8a838'; g.lineWidth = 1;
    for (const fx of [50, 160, 270]) {
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.arc(fx, 46, 4 + i * 5, Math.PI, 0); g.stroke();
      }
    }
    // chandelier
    g.fillStyle = '#c8a838';
    g.beginPath(); g.moveTo(160, SCENE_TOP); g.lineTo(160, 22); g.stroke();
    rc(g, 144, 22, 32, 4, '#c8a838');
    for (let i = 0; i < 5; i++) {
      const cx = 146 + i * 7;
      rc(g, cx, 26, 2, 5 + (i % 2) * 2, '#e8d8a0');
      g.fillStyle = (t >> 3) % 5 === i ? C.white : C.yellow;
      g.fillRect(cx - 1, 31 + (i % 2) * 2, 4, 4);
      g.fillStyle = '#c8a838';
    }
    // carpet of sensory assault
    rc(g, 0, 98, 320, SCENE_BOT - 97, '#6a1024');
    for (let y = 100; y < SCENE_BOT; y += 16)
      for (let x = ((y / 16) | 0) % 2 * 8; x < 320; x += 16) {
        g.fillStyle = '#8a2038';
        g.fillRect(x + 3, y + 3, 8, 8);
        g.fillStyle = '#c8a838';
        g.fillRect(x + 6, y + 6, 2, 2);
      }
    // slot machines
    const scol = ['#c03030', '#3050c0', '#c8a838'];
    for (let i = 0; i < 3; i++) {
      const sx = 26 + i * 34;
      rc(g, sx, 66, 28, 52, '#28283a');
      rc(g, sx + 2, 68, 24, 20, scol[i]);
      rc(g, sx + 4, 72, 20, 12, '#f0f0e0'); // reel window
      const syms = ['#e02858', '#c8a838', '#2a8c2a'];
      for (let r = 0; r < 3; r++) {
        const spin = (!ROOMS.casino._won && i === 2) ? ((t >> 2) + r * 2) % 3 : (i + r) % 3;
        rc(g, sx + 6 + r * 6, 75, 4, 6, syms[spin]);
      }
      rc(g, sx + 4, 92, 20, 22, '#3a3a4e');
      rc(g, sx + 28, 70, 3, 3, '#c8c8d0'); // lever knob
      rc(g, sx + 28, 73, 2, 12, '#8a8e9e');
      g.fillStyle = (t >> 3) % 3 === i ? C.yellow : '#7a6828';
      g.fillRect(sx + 8, 62, 12, 4);
    }
    neon(g, 'LUCKY LUCY', 94, 50, C.pink, (t >> 4) % 2 === 0, 8);
    // card table, closed
    g.fillStyle = '#1e5a34';
    g.beginPath(); g.ellipse(185, 108, 38, 14, 0, 0, 7); g.fill();
    g.fillStyle = '#163f24';
    g.beginPath(); g.ellipse(185, 108, 32, 10, 0, 0, 7); g.fill();
    rc(g, 168, 102, 34, 5, '#f0f0e0');
    g.fillStyle = '#8a1020'; g.font = 'bold 6px monospace'; g.textAlign = 'center';
    g.fillText('CLOSED', 185, 103);
    // cashier cage
    rc(g, 248, 44, 64, 86, '#3a2a10');
    rc(g, 252, 50, 56, 60, '#181410');
    g.fillStyle = '#c8a838';
    for (let x = 254; x < 308; x += 6) g.fillRect(x, 50, 2, 60);
    rc(g, 252, 76, 56, 3, '#c8a838');
    rc(g, 262, 112, 36, 4, '#c8a838');
    neon(g, 'CASHIER', 280, 32, C.yellow, true, 8);
  },
  actors(game, t) {
    return [{ y: 142, draw: (g) => g.drawImage(SPR.guard, 224, 122) }];
  },
  hotspots: [
    {
      names: ['slots', 'slot', 'slot machine', 'machine', 'lucy', 'lucky lucy'],
      at: { x: 22, y: 62, w: 100, h: 56 }, near: 46, smart: 'play',
      verbs: {
        look: (g) => g.f.jackpot
          ? 'Lucky Lucy wears a hand-scrawled OUT OF ORDER sign. You did that. You\'re somebody now.'
          : 'Three slot machines. Two look terminally honest. The one on the end — LUCKY LUCY — hums like she knows something.',
        play: (g) => {
          if (g.f.jackpot) return 'Lucky Lucy is OUT OF ORDER, and it\'s entirely your fault. The management is reportedly "reviewing procedures."';
          if (!g.pay(1)) return 'A dollar a pull, and you\'re down to lint and ambition.';
          g.f.slotPulls = (g.f.slotPulls || 0) + 1;
          g.sfx.blip();
          // Lucy pays out on the third pull — or on your very last dollar,
          // because Neon City is cruel but this game is not.
          const lastDollar = g.cash === 0;
          if (g.f.slotPulls === 1 && !lastDollar) return 'CLUNK. Whirrr... Cherry. Lemon. Grape. Lucy takes your dollar with the '
            + 'warmth of a parking meter.';
          if (g.f.slotPulls === 2 && !lastDollar) return 'CLUNK. Whirrr... Cherry. Cherry... lemon. So close you can taste it. '
            + '(The taste is lemon.)';
          ROOMS.casino._won = true;
          g.f.jackpot = true;
          g.earn(100);
          g.award('jackpot');
          g.sfx.kaching();
          g.say(
            (lastDollar ? 'Your very last dollar drops with the finality of a coffin lid. ' : '')
            + 'CLUNK. Whirrr... Cherry. CHERRY. C-H-E-R-R-Y! Lucky Lucy erupts — sirens, lights, and a '
            + 'waterfall of coins that overflows your pockets, your shoes, and one nearby ashtray.',
            'A HUNDRED DOLLARS. The security guard\'s mustache twitches, which for him is open weeping. '
            + 'You are now, by Neon City standards, wealthy.',
          );
        },
        use: (g) => ROOMS.casino.hotspots[0].verbs.play(g),
        kill: 'You raise a fist at the machine. The guard raises an eyebrow at you. The exchange rate is not in your favor.',
      },
    },
    {
      names: ['guard', 'security'],
      at: { x: 222, y: 120, w: 18, h: 24 }, near: 50, smart: 'talk',
      verbs: {
        look: 'Casino security: burgundy jacket, sunglasses indoors at night, mustache with tenure.',
        talk: (g) => g.f.jackpot
          ? '"Congratulations," the guard says, in the tone of a man reading his own eulogy. "Please spend it elsewhere."'
          : '"House rules: no counting, no systems, no crying at the tables." A pause. "Lucky Lucy\'s due, though. Didn\'t hear it from me."',
      },
    },
    {
      names: ['cage', 'cashier', 'money', 'vault'],
      at: { x: 248, y: 44, w: 64, h: 86 }, near: 56,
      verbs: {
        look: 'Behind the golden bars, stacks of cash sit in tidy rows, radiating unavailability.',
        take: (g) => g.die('You reach through the cashier\'s bars, on camera, in the most identifiable suit in the '
          + 'hemisphere. The Grand\'s security team gives you a complimentary tour of the loading dock, '
          + 'the pavement, and — briefly — low Earth orbit.'),
        open: 'The cage opens for employees, armored trucks, and absolutely not you.',
        buy: 'Technically everything here is for sale except the money.',
      },
    },
    {
      names: ['table', 'cards', 'blackjack', 'card table'],
      at: { x: 148, y: 96, w: 74, h: 26 }, near: 50,
      verbs: {
        look: 'The card table is CLOSED. The dealer is on his fourteenth smoke break of the shift.',
        play: 'The felt is closed. The only game in town is Lucy.',
        sit: 'You sit at the closed table alone for a moment. It\'s the loneliest thing you\'ve done all week, and that\'s saying something.',
      },
    },
    {
      names: ['chandelier'],
      at: { x: 140, y: 20, w: 40, h: 20 }, near: 300,
      verbs: {
        look: 'A chandelier calibrated to make quarters look like doubloons.',
        climb: 'The chandelier scene happens in a different kind of movie.',
      },
    },
    {
      names: ['carpet'],
      at: { x: 0, y: 130, w: 320, h: 56 }, near: 300,
      verbs: { look: 'The carpet pattern is designed so you can\'t tell time, direction, or how much you\'ve lost. It\'s working.' },
    },
  ],
};

// ---- the inferno disco ----
ROOMS.disco = {
  id: 'disco',
  name: 'The Inferno',
  desc: 'THE INFERNO. A mirror ball scatters diamonds over a pulsing dance floor, the bass rearranges '
      + 'your internal organs alphabetically, and there — by the tall table, in the red dress — is '
      + 'DELILAH. Play it cool. You have never once played it cool. The Strip is south.',
  walk: [{ x: 8, y: 118, w: 304, h: 68 }],
  block: [
    { x: 18, y: 96, w: 64, h: 20 },   // dj booth
    { x: 268, y: 112, w: 34, h: 16 }, // delilah's table
    { x: 6, y: 118, w: 14, h: 10 },   // speaker
    { x: 298, y: 118, w: 14, h: 10 }, // speaker
  ],
  exits: [{ side: 's', to: 'strip' }],
  draw(g, t) {
    rc(g, 0, SCENE_TOP, 320, SCENE_BOT - SCENE_TOP + 1, '#160826');
    dither(g, 0, SCENE_TOP, 320, 60, '#160826', '#1e0c34');
    // mirror ball
    g.strokeStyle = '#8a8e9e';
    g.beginPath(); g.moveTo(160, SCENE_TOP); g.lineTo(160, 22); g.stroke();
    g.fillStyle = '#b8bcc8';
    g.beginPath(); g.arc(160, 32, 11, 0, 7); g.fill();
    for (let i = 0; i < 12; i++) {
      const a = (t / 20 + i * 0.52) % 6.28;
      g.fillStyle = [C.white, C.lcyan, C.pink][i % 3];
      g.fillRect(160 + Math.cos(a) * 8 - 1, 32 + Math.sin(a) * 8 - 1, 2, 2);
    }
    // sweeping light beams
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(t / 40 + i * 2.1) * 0.9;
      g.fillStyle = ['rgba(255,85,255,0.08)', 'rgba(85,255,255,0.08)', 'rgba(255,255,85,0.08)'][i];
      g.beginPath();
      g.moveTo(160, 36);
      g.lineTo(160 + Math.sin(a) * 150 - 26, SCENE_BOT);
      g.lineTo(160 + Math.sin(a) * 150 + 26, SCENE_BOT);
      g.closePath(); g.fill();
    }
    // glint rays off the ball
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 5; i++) {
      const a = t / 20 + i * 1.26;
      g.fillRect(160 + Math.cos(a) * 16, 32 + Math.sin(a) * 16, 1, 1);
    }
    // dance floor
    const cols = ['#c81870', '#1878c8', '#c8a818', '#18a858'];
    const dim = ['#701040', '#104070', '#706010', '#106030'];
    for (let ty = 0; ty < 4; ty++)
      for (let tx = 0; tx < 12; tx++) {
        const lit = ((tx + ty + (t >> 4)) % 4);
        const px = 64 + tx * 16, py = 110 + ty * 17;
        rc(g, px, py, 16, 17, lit === 0 ? cols[(tx * 3 + ty) % 4] : dim[(tx * 3 + ty) % 4]);
        rc(g, px, py, 16, 1, '#0c0418');
        rc(g, px, py, 1, 17, '#0c0418');
      }
    // dj booth
    rc(g, 18, 80, 64, 36, '#28104a');
    rc(g, 18, 80, 64, 4, '#3a1a6e');
    g.fillStyle = '#181818';
    g.beginPath(); g.arc(38, 90, 7, 0, 7); g.fill();
    g.beginPath(); g.arc(60, 90, 7, 0, 7); g.fill();
    g.fillStyle = '#c8a838';
    g.fillRect(38 + Math.cos(t / 6) * 4, 90 + Math.sin(t / 6) * 4, 2, 2);
    // the dj: head, headphones, groove
    const bob = Math.sin(t / 8) * 2;
    g.fillStyle = '#c89868'; g.beginPath(); g.arc(49, 76 + bob, 6, 0, 7); g.fill();
    g.fillStyle = '#181818'; g.fillRect(43, 72 + bob, 3, 6); g.fillRect(52, 72 + bob, 3, 6);
    rc(g, 43, 69 + bob, 12, 3, '#181818');
    neon(g, 'DJ MOJO', 49, 100, C.lcyan, (t >> 3) % 2 === 0, 7);
    // speakers
    for (const sx of [6, 298]) {
      rc(g, sx, 50, 16, 76, '#181022');
      const pump = (t >> 2) % 2;
      g.fillStyle = '#3a2a5e';
      g.beginPath(); g.arc(sx + 8, 70, 6 - pump, 0, 7); g.fill();
      g.beginPath(); g.arc(sx + 8, 96, 6 - pump, 0, 7); g.fill();
      g.beginPath(); g.arc(sx + 8, 116, 5 - pump, 0, 7); g.fill();
    }
    // delilah's tall table
    rc(g, 276, 100, 20, 4, '#3a1a5e');
    rc(g, 284, 104, 4, 22, '#28104a');
    rc(g, 278, 96, 4, 6, '#c8e8f0'); // her cocktail
    rc(g, 279, 94, 2, 3, '#e02858');
  },
  actors(game, t) {
    const list = [];
    const df = (t >> 4) % 2;
    // background dancers
    list.push({ y: 150, draw: (g) => g.drawImage(SPR.dancer1[1 + df], 104, 130) });
    list.push({ y: 152, draw: (g) => g.drawImage(SPR.dancer2[df], 126, 133) });
    list.push({ y: 168, draw: (g) => g.drawImage(SPR.dancer2[1 - df], 178, 149) });
    list.push({ y: 166, draw: (g) => g.drawImage(SPR.dancer1[1 + (1 - df)], 200, 146) });
    // delilah, unless the dance cutscene is starring her
    if (!(game.cutscene && game.cutscene.type === 'dance')) {
      list.push({ y: 138, draw: (g) => g.drawImage(SPR.delilah, 264, 119) });
    }
    return list;
  },
  hotspots: [
    {
      names: ['delilah', 'singer', 'woman', 'lady', 'girl in red', 'her'],
      at: { x: 262, y: 116, w: 16, h: 24 }, near: 50, smart: 'talk',
      verbs: {
        look: (g) => {
          if (g.f.invited) return 'Delilah twirls the locket chain around one finger and watches you the way cats watch canaries they\'ve decided to marry.';
          if (g.f.danced) return 'Delilah, catching her breath, one hand at her bare collarbone where a locket used to sit.';
          return 'Delilah. Red dress, dark eyes, and the unbothered stillness of a woman who has heard every line ever written and rated them all.';
        },
        talk: (g) => {
          if (g.f.invited) return '"Roof of the Hotel Grand, sugar. I\'ll be the one watching the sunrise. '
            + 'Don\'t make me watch it alone."';
          if (g.has('locket')) return 'Delilah\'s eyes drop to your hand and go wide. "Is that—?!" (GIVE LOCKET TO DELILAH.)';
          if (g.f.danced) return '"My locket," she sighs, touching her collarbone. "Gold, heart-shaped, gone. The clasp '
            + 'snapped somewhere behind Sticky\'s the other night. Probably buried in that awful dumpster by now." '
            + 'She looks at you sideways. "Shame nobody around here is the dumpster-diving-for-a-lady type."';
          if (g.f.roseGiven) return '"So." She sets the rose down, stem aligned just so. "Are you going to ask a '
            + 'lady to dance, or do I have to do everything myself tonight?" (Try DANCE.)';
          if (!g.f.mintFresh) {
            g.sfx.buzz();
            return 'You lean in with your finest opener. Delilah leans back the exact same distance. "Sugar," '
              + 'she says, not unkindly, "that breath could strip wallpaper. Come back minty." '
              + '(The Quickie Mart sells ARCTIC BLAST mints. You may need to EAT them.)';
          }
          return '"Minty," she notes, with the ghost of a smile. "A man of standards after all." She swirls her '
            + 'drink. "I like standards. I like gestures more. The old-fashioned kind. The kind with petals." '
            + '(Hmm. Vince sells roses...)';
        },
        give_rose: (g) => {
          if (g.f.roseGiven) return 'You already gave her your rose. She\'s wearing it. Play it cool for once.';
          if (!g.f.mintFresh) return 'You extend the rose. Delilah accepts it at full arm\'s length, like a letter '
            + 'from the tax office. "Lovely. Now about that breath, sugar." (EAT MINTS first.)';
          g.remove('rose');
          g.f.roseGiven = true;
          g.sfx.award();
          g.say(
            'You present the rose with a flourish you practiced in exactly zero mirrors. Delilah takes it, '
            + 'inhales, and for one unguarded moment the neon catches something soft in her eyes.',
            '"Okay, Polyester," she says, tucking it behind her ear. "You have my attention. Briefly."',
          );
        },
        give_locket: (g) => {
          if (!g.f.lockFound) return 'You pat your pockets theatrically. You don\'t have it yet.';
          g.remove('locket');
          g.f.invited = true;
          g.award('reunion');
          g.sfx.fanfare();
          g.say(
            'You open your hand. The locket sits on your palm, still faintly heroic-smelling of dumpster.',
            'Delilah goes very still. "My grandmother\'s," she says quietly, fastening it with both hands. '
            + '"Every fella in this city told me they\'d do anything for me. You\'re the first one who did '
            + 'something DISGUSTING." Her eyes shine. "That\'s the most romantic thing I\'ve ever seen."',
            '"Roof of the Hotel Grand, sugar. Ten minutes. I\'ll tell the doorman you\'re expected." '
            + 'She taps your chest with one finger. "Don\'t change the suit."',
          );
        },
        give_fizz: '"Grape fizz." Delilah regards the bottle. "Sugar, I have STANDARDS." A beat. "Earl still off the wagon?"',
        give_mints: 'She raises an eyebrow. "Offer a lady a mint and she wonders about herself. EAT one yourself and she wonders about you. Better odds."',
        give_card: '"Sugar, I know the owner. I AM the entertainment." She hands Earl\'s card back delicately.',
        dance: (g) => {
          if (g.f.danced) return '"My feet are still recovering from the first time, sugar." She says it like a compliment. It might be one.';
          if (!g.f.mintFresh) return 'Delilah holds up one finger before you speak. "Minty first. Dancing second." (EAT MINTS.)';
          if (!g.f.roseGiven) return '"A lady likes a little ceremony before the dance floor, sugar." She glances, pointedly, at your empty hands.';
          g.startCutscene('dance');
        },
        kiss: (g) => {
          if (g.f.invited) return '"Roof. Sunrise. Patience, tiger." She smiles like she invented it.';
          return '"Easy, tiger." She stops you with one finger, dead center of your forehead. It is somehow the most romantic moment of your life so far.';
        },
      },
    },
    {
      names: ['dj', 'dj mojo', 'mojo'],
      at: { x: 18, y: 60, w: 64, h: 56 }, near: 60, smart: 'talk',
      verbs: {
        look: 'DJ Mojo, headphones on one ear, whole soul on the crossfader. He has not stopped grooving since 1976. Doctors are baffled.',
        talk: 'You shout a request. DJ Mojo nods with deep understanding and plays the song he was always going to play. It\'s the right call.',
        play: 'The booth is sacred ground. Mojo alone touches the wheels of steel.',
      },
    },
    {
      names: ['dancers', 'dancer', 'crowd', 'people'],
      at: { x: 90, y: 128, w: 130, h: 44 }, near: 200,
      verbs: {
        look: 'The dance floor crowd moves as one glittering organism. A man in a purple suit is doing moves that will be illegal by 1985.',
        talk: '"HUH?" they reply, in perfect synchronized deafness.',
      },
    },
    {
      names: ['ball', 'mirror ball', 'disco ball'],
      at: { x: 148, y: 20, w: 24, h: 24 }, near: 300,
      verbs: {
        look: 'The mirror ball spins serenely above it all, dispensing tiny diamonds of light to rich and poor alike.',
        take: 'It hangs thirty feet up, and it belongs to everyone. Have some respect.',
      },
    },
    {
      names: ['speakers', 'speaker', 'bass'],
      at: { x: 6, y: 50, w: 16, h: 76 }, near: 60,
      verbs: {
        look: 'Speaker stacks taller than Bruno. Standing this close reorganizes your dental work.',
        climb: 'Climbing the speakers is how legends are born and insurance claims are filed.',
      },
    },
    {
      names: ['floor', 'dance floor'],
      at: { x: 64, y: 110, w: 192, h: 68 }, near: 300,
      verbs: { look: 'Underlit squares pulse in time with the music. Somewhere under there is a small fortune in colored bulbs and a large fortune in dreams.' },
    },
  ],
};

// ---- the rooftop ----
ROOMS.rooftop = {
  id: 'rooftop',
  name: 'Rooftop of the Hotel Grand',
  desc: 'The rooftop terrace of the Hotel Grand, forty floors above the noise. String lights sway, '
      + 'the city glitters below, and the sky is going soft at the edges — dawn coming in. Delilah '
      + 'waits at the parapet. The elevator is south, but who cares.',
  walk: [{ x: 8, y: 124, w: 304, h: 62 }],
  block: [
    { x: 24, y: 130, w: 18, h: 14 },   // palm
    { x: 278, y: 130, w: 18, h: 14 },  // palm
    { x: 212, y: 146, w: 30, h: 12 },  // table
  ],
  exits: [{ side: 's', to: 'strip' }],
  draw(g, t) {
    // dawn gradient
    rc(g, 0, SCENE_TOP, 320, 30, '#1c1c4e');
    rc(g, 0, 38, 320, 18, '#4c2a6a');
    rc(g, 0, 54, 320, 16, '#8a3a6a');
    rc(g, 0, 68, 320, 14, '#c85858');
    rc(g, 0, 80, 320, 12, '#e8904a');
    stars(g, 87, 0, SCENE_TOP, 320, 22, 22, t);
    // rising sun
    g.fillStyle = '#f8d868';
    g.beginPath(); g.arc(252, 92, 12, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(248,216,104,0.25)';
    g.beginPath(); g.arc(252, 92, 20, Math.PI, 0); g.fill();
    skyline(g, 92, 9);
    // parapet
    rc(g, 0, 100, 320, 18, '#4a4a5e');
    rc(g, 0, 100, 320, 3, '#6a6a7e');
    g.fillStyle = '#3a3a4c';
    for (let x = 0; x < 320; x += 24) g.fillRect(x, 103, 1, 15);
    // deck
    rc(g, 0, 118, 320, SCENE_BOT - 117, '#3e3e50');
    speckle(g, 93, 0, 120, 320, 64, '#48485c', 300);
    speckle(g, 94, 0, 120, 320, 64, '#32323e', 200);
    for (let x = 40; x < 320; x += 56) rc(g, x, 118, 1, 68, '#32323e'); // tar seams
    // string lights
    g.strokeStyle = '#2a2a38';
    for (const [x1, x2, sag] of [[10, 160, 26], [160, 310, 22]]) {
      g.beginPath(); g.moveTo(x1, 46);
      g.quadraticCurveTo((x1 + x2) / 2, 46 + sag * 2, x2, 46);
      g.stroke();
      for (let i = 1; i < 8; i++) {
        const p = i / 8;
        const lx = x1 + (x2 - x1) * p;
        const ly = 46 + sag * 2 * p * (1 - p) * 2;
        g.fillStyle = [C.yellow, C.pink, C.lcyan, C.lgreen][(i + (t >> 5)) % 4];
        g.fillRect(lx - 1, ly, 3, 3);
      }
    }
    // potted palms
    for (const px of [32, 286]) {
      rc(g, px - 7, 132, 16, 10, '#7a3c1e');
      rc(g, px - 1, 112, 3, 22, '#8a5a2a');
      g.fillStyle = '#2a8c4a';
      for (let i = 0; i < 5; i++) {
        const a = -0.5 - i * 0.55;
        g.beginPath();
        g.moveTo(px, 114);
        g.quadraticCurveTo(px + Math.cos(a) * 16, 108 + Math.sin(a) * 10, px + Math.cos(a) * 24, 112 + Math.sin(a) * 16);
        g.quadraticCurveTo(px + Math.cos(a) * 14, 112 + Math.sin(a) * 8, px, 116);
        g.fill();
      }
    }
    // table for two
    rc(g, 214, 140, 26, 4, '#d8d8d0');
    rc(g, 224, 144, 6, 14, '#8a8a92');
    rc(g, 217, 132, 3, 9, '#c8e8f0'); rc(g, 233, 132, 3, 9, '#c8e8f0');
    rc(g, 224, 130, 5, 11, '#2a5a2a'); // the bubbly
    rc(g, 225, 128, 3, 3, '#c8a838');
  },
  actors(game, t) {
    return [{ y: 130, draw: (g) => g.drawImage(SPR.delilah, 148, 111) }];
  },
  hotspots: [
    {
      names: ['delilah', 'her', 'woman', 'lady'],
      at: { x: 146, y: 108, w: 16, h: 24 }, near: 46, smart: 'talk',
      verbs: {
        look: 'Delilah leans on the parapet with the sunrise starting behind her, wearing your rose and her grandmother\'s locket. Somewhere a saxophone begins to play entirely on its own.',
        talk: (g) => {
          g.f.roofTalk = true;
          return '"You came." She turns, and the first light catches the locket. "You know, sugar, every fella in Neon '
            + 'City talks a big game. You\'re the only one who ever smelled like a dumpster FOR me." She steps '
            + 'closer. "Well, Polyester? The sun\'s coming up."';
        },
        kiss: (g) => {
          g.sfx.smooch();
          g.winGame();
        },
        give_rose: 'She\'s already wearing your rose. Greatest five dollars you ever spent.',
        dance: (g) => { g.sfx.whistle(); return 'You slow-dance to no music at all, forty floors above everything. She puts her head on your shoulder. Don\'t ruin it by counting steps.'; },
      },
    },
    {
      names: ['city', 'view', 'skyline', 'neon city'],
      at: { x: 0, y: 60, w: 320, h: 40 }, near: 300,
      verbs: {
        look: 'Neon City spreads out below: the Strip, the mart, Sticky\'s pink sign, all of it humming. From up here even the taxis look harmless. They are not.',
      },
    },
    {
      names: ['sun', 'sunrise', 'dawn'],
      at: { x: 232, y: 76, w: 40, h: 20 }, near: 300,
      verbs: { look: 'The sun comes up on Neon City like a slow round of applause.' },
    },
    {
      names: ['table', 'glasses', 'champagne', 'bubbly'],
      at: { x: 210, y: 128, w: 34, h: 30 }, near: 44,
      verbs: {
        look: 'A table for two: something bubbly on ice and two glasses. She planned this. She PLANNED this.',
        drink: 'Not yet. There\'s an order to these things, and you\'re finally learning it.',
      },
    },
    {
      names: ['lights', 'string lights'],
      at: { x: 10, y: 44, w: 300, h: 30 }, near: 300,
      verbs: { look: 'Colored bulbs on a wire, swaying in the high wind. The poor man\'s stars. The best kind.' },
    },
    {
      names: ['parapet', 'ledge', 'edge', 'railing'],
      at: { x: 0, y: 100, w: 320, h: 18 }, near: 60,
      verbs: {
        look: 'A waist-high parapet between you and forty floors of regret.',
        climb: 'Absolutely not. Tonight is going TOO WELL.',
        jump: 'The night this is going? Not a chance.',
      },
    },
  ],
};

// Every room: find a walkable spot near (x,y) for spawning.
export function clampToWalk(room, x, y) {
  let best = null, bd = 1e9;
  for (const r of room.walk) {
    const cx = Math.max(r.x + 2, Math.min(r.x + r.w - 2, x));
    const cy = Math.max(r.y + 2, Math.min(r.y + r.h - 2, y));
    const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
    if (d < bd) { bd = d; best = { x: cx, y: cy }; }
  }
  return best || { x, y };
}
