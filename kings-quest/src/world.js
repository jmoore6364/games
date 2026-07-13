// The kingdom of Moore: room paintings, walkable areas, hotspots and puzzle logic.
// Scenes are painted with canvas primitives in a 16-color EGA palette.

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
  carrot: 2, goat: 5, bucket: 3, fill: 3, troll: 10, douse: 12, crown: 10, deliver: 15,
};
export const MAXSCORE = Object.values(AWARDS).reduce((a, b) => a + b, 0);

export const ITEMS = {
  carrot:   { name: 'a crisp carrot', names: ['carrot', 'carrots'], icon: () => SPR.carrot },
  mushroom: { name: 'a speckled toadstool', names: ['mushroom', 'toadstool'], icon: () => SPR.mushroom },
  bucket:   { name: 'a wooden bucket', names: ['bucket', 'pail'], icon: (game) => game.f.bucketFull ? SPR.bucketFull : SPR.bucket },
  crown:    { name: 'the Crown of Moore', names: ['crown'], icon: () => SPR.crown },
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

function sky(g, top = SCENE_TOP, horizon = 80) {
  rc(g, 0, top, 320, horizon - top, C.lblue);
  dither(g, 0, horizon - 14, 320, 7, C.lblue, C.lcyan);
  rc(g, 0, horizon - 7, 320, 7, C.lcyan);
}

function cloud(g, x, y, w) {
  rc(g, x, y, w, 4, C.white);
  rc(g, x + 4, y - 3, w - 10, 3, C.white);
  rc(g, x + 8, y + 4, w - 14, 2, C.white);
}

function grass(g, seed, y0 = 80) {
  rc(g, 0, y0, 320, SCENE_BOT - y0 + 1, C.green);
  dither(g, 0, y0, 320, 4, C.green, C.lgreen);
  speckle(g, seed, 0, y0 + 4, 320, SCENE_BOT - y0 - 4, C.lgreen, 260);
  speckle(g, seed + 7, 0, y0 + 4, 320, SCENE_BOT - y0 - 4, '#007700', 160);
}

function tree(g, x, y, s) { // y = base of trunk
  rc(g, x - 3 * s, y - 14 * s, 6 * s, 14 * s, C.brown);
  rc(g, x - 2 * s, y - 14 * s, 2 * s, 14 * s, '#7a3c00');
  g.fillStyle = C.green;
  g.beginPath(); g.arc(x, y - 20 * s, 12 * s, 0, 7); g.fill();
  g.beginPath(); g.arc(x - 9 * s, y - 15 * s, 8 * s, 0, 7); g.fill();
  g.beginPath(); g.arc(x + 9 * s, y - 15 * s, 8 * s, 0, 7); g.fill();
  g.fillStyle = C.lgreen;
  g.beginPath(); g.arc(x - 4 * s, y - 23 * s, 6 * s, 0, 7); g.fill();
}

function flower(g, x, y, c) {
  g.fillStyle = c; g.fillRect(x - 1, y - 1, 3, 1); g.fillRect(x, y - 2, 1, 3);
  g.fillStyle = C.yellow; g.fillRect(x, y - 1, 1, 1);
}

function water(g, t, x, y, w, h) {
  dither(g, x, y, w, h, C.blue, C.lblue);
  g.fillStyle = C.lcyan;
  for (let i = 0; i < w / 16; i++) {
    const wx = x + i * 16 + ((t >> 3) + i * 5) % 12;
    const wy = y + 3 + ((i * 37) % (h - 6));
    g.fillRect(wx, wy, 6, 1);
  }
}

function fenceH(g, x, y, w) {
  rc(g, x, y, w, 2, C.brown);
  rc(g, x, y + 5, w, 2, C.brown);
  for (let px = x; px < x + w; px += 12) rc(g, px, y - 3, 3, 13, '#7a3c00');
}

function signpost(g, x, y) {
  rc(g, x + 5, y - 16, 3, 16, '#7a3c00');
  rc(g, x, y - 24, 14, 9, C.brown);
  rc(g, x + 1, y - 23, 12, 7, '#c88838');
  g.fillStyle = '#5a2c00';
  g.fillRect(x + 2, y - 21, 9, 1); g.fillRect(x + 2, y - 19, 7, 1);
}

function mountains(g, y) {
  g.fillStyle = C.dgray;
  g.beginPath();
  g.moveTo(180, y); g.lineTo(230, y - 46); g.lineTo(270, y - 20); g.lineTo(300, y - 52); g.lineTo(340, y);
  g.closePath(); g.fill();
  g.fillStyle = C.white;
  g.beginPath(); g.moveTo(222, y - 37); g.lineTo(230, y - 46); g.lineTo(238, y - 37); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(292, y - 43); g.lineTo(300, y - 52); g.lineTo(308, y - 43); g.closePath(); g.fill();
}

function castleFar(g, x, y) {
  rc(g, x, y - 30, 44, 30, C.lgray);
  rc(g, x - 8, y - 40, 12, 40, C.lgray);
  rc(g, x + 40, y - 40, 12, 40, C.lgray);
  rc(g, x - 8, y - 44, 12, 4, C.dgray);
  rc(g, x + 40, y - 44, 12, 4, C.dgray);
  for (let i = 0; i < 5; i++) rc(g, x + 2 + i * 9, y - 34, 5, 4, C.dgray);
  rc(g, x - 6, y - 52, 2, 8, C.brown);
  rc(g, x - 4, y - 52, 7, 4, C.lred);
}

// ---------------------------------------------------------------- rooms ----

export const ROOMS = {};

// ---- throne room ----
ROOMS.throne = {
  id: 'throne',
  name: 'The Royal Throne Room',
  desc: 'The great hall of Castle Moore. Banners hang from stone walls, and King Edmund '
      + 'the Wise sits upon his throne atop the dais. A red carpet leads to the courtyard door, south.',
  walk: [{ x: 16, y: 128, w: 288, h: 58 }],
  block: [{ x: 118, y: 128, w: 84, h: 18 }], // dais steps
  exits: [{ side: 's', to: 'courtyard' }],
  draw(g, t, game) {
    // stone wall
    dither(g, 0, SCENE_TOP, 320, 90, C.dgray, C.lgray);
    for (let y = SCENE_TOP + 6; y < 100; y += 12) {
      rc(g, 0, y, 320, 1, '#404040');
      for (let x = ((y / 12) | 0) % 2 ? 14 : 0; x < 320; x += 28) rc(g, x, y - 12, 1, 12, '#404040');
    }
    // windows
    for (const wx of [40, 250]) {
      rc(g, wx, SCENE_TOP + 10, 20, 34, C.blue);
      dither(g, wx, SCENE_TOP + 10, 20, 34, C.blue, C.lblue);
      rc(g, wx + 9, SCENE_TOP + 10, 2, 34, C.dgray);
      rc(g, wx, SCENE_TOP + 26, 20, 2, C.dgray);
    }
    // banners
    for (const bx of [86, 214]) {
      rc(g, bx, SCENE_TOP + 8, 18, 38, C.red);
      rc(g, bx + 2, SCENE_TOP + 10, 14, 34, '#7a0000');
      rc(g, bx + 6, SCENE_TOP + 18, 6, 10, C.yellow); // heraldic mark
      g.fillStyle = C.red;
      g.beginPath(); g.moveTo(bx, SCENE_TOP + 46); g.lineTo(bx + 9, SCENE_TOP + 54); g.lineTo(bx + 18, SCENE_TOP + 46); g.fill();
    }
    // floor
    dither(g, 0, 100, 320, SCENE_BOT - 99, '#707070', C.lgray);
    // carpet
    rc(g, 140, 108, 40, SCENE_BOT - 107, C.red);
    rc(g, 144, 108, 32, SCENE_BOT - 107, '#7a0000');
    // dais
    rc(g, 118, 96, 84, 34, '#8a8a8a');
    rc(g, 112, 126, 96, 8, C.lgray);
    rc(g, 106, 134, 108, 8, '#909090');
    // throne
    rc(g, 138, 58, 44, 44, C.brown);
    rc(g, 142, 62, 36, 40, '#7a3c00');
    rc(g, 136, 54, 8, 10, C.yellow); rc(g, 176, 54, 8, 10, C.yellow);
  },
  actors(game, t) {
    const list = [
      { y: 101, draw: (g) => g.drawImage(SPR.king, 149, 78) },
      { y: 132, draw: (g) => g.drawImage(SPR.guard, 74, 96) },
      { y: 132, draw: (g) => g.drawImage(SPR.guard, 236, 96) },
    ];
    return list;
  },
  hotspots: [
    {
      names: ['king', 'edmund', 'king edmund'],
      at: { x: 140, y: 70, w: 40, h: 60 }, near: 52, smart: 'talk',
      verbs: {
        look: (g) => g.f.delivered
          ? 'King Edmund beams beneath the Crown of Moore, restored at last.'
          : 'King Edmund the Wise. His brow is bare, and his eyes are heavy with worry.',
        talk: (g) => {
          if (g.f.delivered) return '"You shall always have a place at this table, Sir Jason."';
          if (g.has('crown')) return '"Is that... the crown?! Present it to me, brave knight!" (Try GIVE CROWN TO KING.)';
          if (g.f.questGiven) {
            if (g.f.dragonGone) return '"The dragon is bested? Then bring me my crown, Sir Jason!"';
            if (g.f.trollGone) return '"The bridge is clear? Make haste to the mountain cave!"';
            return '"The dragon nests in the cave beyond the eastern bridge. Go carefully — its fire is fierce, '
                 + 'and the bridge troll is fiercer still."';
          }
          g.f.questGiven = true;
          g.say(
            '"Sir Jason! A winged terror has stolen the Crown of Moore from this very hall. '
            + 'Without it, the kingdom will fall to squabbling dukes by harvest time."',
            '"Recover the crown, and you shall be named heir to the throne. The beast flew east, '
            + 'toward the mountains beyond the river. Take what you need from my lands — and take care: '
            + 'that dragon\'s flame has cooked braver knights than you."',
          );
        },
        give_crown: (g) => {
          g.remove('crown');
          g.f.delivered = true;
          g.award('deliver');
          g.winGame();
        },
      },
    },
    {
      names: ['throne'],
      at: { x: 136, y: 54, w: 48, h: 48 }, near: 60,
      verbs: {
        look: 'A grand oaken throne trimmed in gold. It looks slightly too comfortable.',
        take: 'The guards clear their throats in unison.',
      },
    },
    {
      names: ['guard', 'guards'],
      at: { x: 70, y: 96, w: 180, h: 40 }, near: 60, smart: 'talk',
      verbs: {
        look: 'The royal guards stand at attention. One of them is clearly asleep standing up.',
        talk: '"All hail Sir Jason!" they bark, perfectly in sync.',
      },
    },
    {
      names: ['banner', 'banners', 'tapestry'],
      at: { x: 86, y: 18, w: 146, h: 40 }, near: 200,
      verbs: { look: 'Crimson banners bearing the golden oak of House Moore.' },
    },
    {
      names: ['window', 'windows'],
      at: { x: 40, y: 20, w: 230, h: 34 }, near: 200,
      verbs: { look: 'Through the leaded glass you can see the courtyard below.' },
    },
  ],
};

// ---- courtyard ----
ROOMS.courtyard = {
  id: 'courtyard',
  name: 'Castle Courtyard',
  desc: 'The cobbled courtyard of Castle Moore. A kitchen garden grows against the west wall, '
      + 'and the great door to the throne room stands north. The meadow lies south.',
  walk: [{ x: 10, y: 118, w: 300, h: 68 }],
  block: [{ x: 18, y: 118, w: 74, h: 30 }, { x: 236, y: 118, w: 30, h: 22 }], // garden, fountain
  exits: [{ side: 's', to: 'meadow' }],
  doors: [{ rect: { x: 146, y: 96, w: 34, h: 28 }, to: 'throne', x: 160, y: 178, label: 'castle door' }],
  draw(g, t, game) {
    sky(g, SCENE_TOP, 60);
    cloud(g, 30, SCENE_TOP + 12, 30);
    // castle wall across the top
    dither(g, 0, 52, 320, 60, C.lgray, '#8a8a8a');
    for (let y = 58; y < 108; y += 12) {
      rc(g, 0, y, 320, 1, C.dgray);
      for (let x = ((y / 12) | 0) % 2 ? 16 : 0; x < 320; x += 32) rc(g, x, y - 12, 1, 12, C.dgray);
    }
    // battlements
    for (let x = 0; x < 320; x += 16) rc(g, x, 44, 9, 9, C.lgray);
    // towers
    rc(g, 8, 30, 26, 82, C.lgray); rc(g, 4, 22, 34, 9, C.dgray);
    rc(g, 286, 30, 26, 82, C.lgray); rc(g, 282, 22, 34, 9, C.dgray);
    rc(g, 18, 40, 6, 10, C.black); rc(g, 296, 40, 6, 10, C.black);
    // flag
    rc(g, 19, 4, 2, 20, C.brown); rc(g, 21, 4, 12, 7, C.lred);
    // big door
    rc(g, 142, 68, 42, 56, C.dgray);
    rc(g, 146, 72, 34, 52, C.brown);
    rc(g, 148, 74, 30, 50, '#7a3c00');
    rc(g, 162, 74, 2, 50, '#5a2c00');
    rc(g, 156, 98, 4, 4, C.yellow);
    // cobbles
    rc(g, 0, 112, 320, SCENE_BOT - 111, '#8a8a8a');
    speckle(g, 33, 0, 114, 320, SCENE_BOT - 115, C.lgray, 420);
    speckle(g, 44, 0, 114, 320, SCENE_BOT - 115, C.dgray, 320);
    // garden bed
    rc(g, 18, 118, 74, 30, C.brown);
    dither(g, 18, 118, 74, 30, C.brown, '#7a3c00');
    for (let i = 0; i < 6; i++) {
      const cx = 26 + i * 11;
      if (game.f.carrotTaken && i === 2) continue;
      g.fillStyle = C.lgreen;
      g.fillRect(cx, 124, 1, 5); g.fillRect(cx - 2, 125, 5, 2);
      g.fillRect(cx, 136, 1, 5); g.fillRect(cx - 2, 137, 5, 2);
    }
    rc(g, 14, 114, 82, 3, C.lgray); rc(g, 14, 148, 82, 3, C.lgray);
    // fountain
    rc(g, 236, 120, 30, 18, C.lgray);
    rc(g, 240, 122, 22, 13, C.dgray);
    water(g, t, 241, 123, 20, 11);
    g.fillStyle = C.lcyan;
    g.fillRect(250, 112 - ((t >> 2) % 4), 2, 10 + ((t >> 2) % 4));
  },
  actors(game, t) {
    return [{ y: 136, draw: (g) => g.drawImage(SPR.guard, 200, 100) }];
  },
  hotspots: [
    {
      names: ['carrot', 'carrots', 'garden', 'vegetables'],
      at: { x: 18, y: 118, w: 74, h: 30 }, near: 46, smart: 'take',
      verbs: {
        look: (g) => g.f.carrotTaken
          ? 'Neat rows of royal vegetables. One carrot is conspicuously missing.'
          : 'The royal kitchen garden. The carrots look magnificent — the kind a goat would follow anywhere.',
        take: (g) => {
          if (g.f.carrotTaken) return 'One royal carrot is quite enough. The cook counts them.';
          g.f.carrotTaken = true;
          g.give('carrot');
          g.award('carrot');
          return 'You pull up the plumpest carrot in the kingdom and brush off the soil.';
        },
        smell: 'Earthy. Wholesome. Faintly of tomorrow\'s soup.',
        eat: (g) => g.has('carrot') ? 'Better to save it — you have a feeling someone will want it.' : 'Pick one first.',
      },
    },
    {
      names: ['guard', 'soldier'],
      at: { x: 198, y: 100, w: 16, h: 36 }, near: 46, smart: 'talk',
      verbs: {
        look: 'A guard leans on his spear, working very hard at looking busy.',
        talk: (g) => {
          if (!g.f.questGiven) return '"The king awaits you in the throne room, Sir Jason. He is not in a good mood."';
          if (!g.f.trollGone) return '"That bridge troll? Thick as a wall and twice as ugly. But I hear the old billy goat '
            + 'in the meadow has knocked over sturdier things than trolls... if you can get it to follow you."';
          if (!g.f.dragonGone) return '"Off to the dragon? Word is the beast guards its flame like a treasure. '
            + 'Shame there\'s no rain in the mountains."';
          return '"They\'ll sing songs about you, sir. Bad ones, probably, but songs."';
        },
      },
    },
    {
      names: ['fountain'],
      at: { x: 236, y: 118, w: 30, h: 22 }, near: 46,
      verbs: {
        look: 'A small fountain burbles cheerfully. Coins glint at the bottom.',
        take: 'Stealing wishes is terrible luck.',
        drink: 'Cold and clear. You feel refreshed.',
        fill: (g) => {
          if (!g.has('bucket')) return 'You have nothing to carry water in.';
          if (g.f.bucketFull) return 'The bucket is already full.';
          g.f.bucketFull = true; g.award('fill'); g.sfx.splash();
          return 'You fill the bucket to the brim with fountain water.';
        },
      },
    },
    {
      names: ['door', 'castle', 'castle door'],
      at: { x: 142, y: 68, w: 42, h: 56 }, near: 40, smart: 'enter',
      verbs: {
        look: 'The great oak door to the throne room.',
        open: (g) => { g.goDoor('throne', 160, 178); },
        enter: (g) => { g.goDoor('throne', 160, 178); },
      },
    },
    {
      names: ['flag'],
      at: { x: 16, y: 4, w: 20, h: 20 }, near: 400,
      verbs: { look: 'The crimson flag of House Moore snaps in the breeze.' },
    },
  ],
};

// ---- meadow ----
ROOMS.meadow = {
  id: 'meadow',
  name: 'Sunny Meadow',
  desc: 'A wide green meadow south of the castle. A stone well stands near the path, '
      + 'and an old billy goat watches you from its pen. Paths lead all four directions.',
  walk: [{ x: 8, y: 110, w: 304, h: 76 }],
  block: [
    { x: 60, y: 122, w: 26, h: 20 },   // well
    { x: 218, y: 118, w: 88, h: 4 },   // pen north fence
    { x: 218, y: 118, w: 4, h: 52 },   // pen west fence
    { x: 218, y: 166, w: 88, h: 4 },   // pen south fence
  ],
  exits: [
    { side: 'n', to: 'courtyard' }, { side: 'w', to: 'forest' },
    { side: 'e', to: 'bridge' }, { side: 's', to: 'lake' },
  ],
  draw(g, t, game) {
    sky(g, SCENE_TOP, 78);
    cloud(g, 60, SCENE_TOP + 14, 34); cloud(g, 210, SCENE_TOP + 24, 26);
    mountains(g, 78);
    castleFar(g, 130, 76);
    grass(g, 5, 78);
    // path crossing
    dither(g, 150, 108, 22, SCENE_BOT - 107, C.brown, '#c88838');
    dither(g, 0, 138, 320, 14, C.brown, '#c88838');
    for (const [fx, fy, fc] of [[30, 116, C.lred], [45, 170, C.yellow], [120, 176, C.white], [200, 180, C.lred], [110, 120, C.yellow]])
      flower(g, fx, fy, fc);
    // well
    rc(g, 60, 122, 26, 18, C.lgray);
    rc(g, 62, 124, 22, 14, C.dgray);
    water(g, t, 64, 126, 18, 10);
    rc(g, 58, 96, 3, 30, C.brown); rc(g, 85, 96, 3, 30, C.brown);
    rc(g, 54, 90, 38, 8, C.red);
    rc(g, 71, 100, 2, 14, C.dgray);
    rc(g, 68, 112, 8, 7, C.brown);
    // goat pen
    fenceH(g, 218, 118, 88);
    fenceH(g, 218, 166, 88);
    rc(g, 219, 118, 2, 50, C.brown);
    signpost(g, 140, 136);
  },
  actors(game, t) {
    const a = [];
    if (!game.f.goatFollowing && !game.f.goatGone) {
      const bob = (t >> 4) % 2;
      a.push({ y: 152, draw: (g) => g.drawImage(SPR.goat[bob], 244, 140) });
    }
    return a;
  },
  hotspots: [
    {
      names: ['goat', 'billy goat', 'billy'],
      at: (g) => (!g.f.goatFollowing && !g.f.goatGone) ? { x: 240, y: 138, w: 24, h: 16 } : null,
      near: 46, smart: 'talk',
      verbs: {
        look: 'A stout old billy goat with formidable horns and a look of profound stubbornness.',
        talk: (g) => { g.sfx.bleat(); return '"Baaah," says the goat, unimpressed.'; },
        take: 'The goat plants its hooves. It is going nowhere — not for free, anyway.',
        pet: (g) => { g.sfx.bleat(); return 'You scratch the goat between the horns. It tolerates this.'; },
        give_carrot: (g) => {
          g.remove('carrot');
          g.f.goatFollowing = true;
          g.award('goat');
          g.sfx.bleat();
          g.say(
            'The goat\'s eyes lock onto the carrot. It clears the fence in one astonishing bound '
            + 'and crunches the carrot down in three bites.',
            'The goat now follows you everywhere, hoping for seconds.',
          );
        },
      },
    },
    {
      names: ['well'],
      at: { x: 54, y: 90, w: 38, h: 50 }, near: 44, smart: 'look',
      verbs: {
        look: 'A cool stone well with a little red roof. The water glimmers far below... no wait, quite near the top actually.',
        fill: (g) => {
          if (!g.has('bucket')) return 'You have nothing to carry water in. A bucket would do nicely.';
          if (g.f.bucketFull) return 'The bucket is already full.';
          g.f.bucketFull = true; g.award('fill'); g.sfx.splash();
          return 'You dip the bucket and haul it up brimming with cold well water.';
        },
        drink: 'You slurp from your cupped hand. Delicious.',
        climb: 'Climbing into wells is how adventures end, not begin.',
        enter: 'Climbing into wells is how adventures end, not begin.',
      },
    },
    {
      names: ['sign', 'signpost'],
      at: { x: 140, y: 112, w: 14, h: 26 }, near: 40, smart: 'look',
      verbs: {
        look: 'The signpost reads: CASTLE — N. FOREST — W. LAKE — S. BRIDGE & MOUNTAINS — E.',
        read: 'The signpost reads: CASTLE — N. FOREST — W. LAKE — S. BRIDGE & MOUNTAINS — E.',
      },
    },
    {
      names: ['pen', 'fence'],
      at: { x: 218, y: 118, w: 88, h: 52 }, near: 50,
      verbs: {
        look: (g) => g.f.goatFollowing || g.f.goatGone
          ? 'An empty goat pen. The fence bears fresh hoof marks.'
          : 'A split-rail pen. It does not look goat-proof so much as goat-tolerated.',
        open: 'The gate is rusted shut, but the fence is low.',
        climb: 'You have no business in a goat pen.',
      },
    },
    {
      names: ['flowers', 'flower'],
      at: { x: 20, y: 108, w: 100, h: 76 }, near: 60,
      verbs: {
        look: 'Wildflowers nod in the breeze.',
        take: 'You pick one, then feel silly and put it back.',
        smell: 'Sweet as a summer morning.',
      },
    },
  ],
};

// ---- forest ----
ROOMS.forest = {
  id: 'forest',
  name: 'Whispering Forest',
  desc: 'Ancient oaks crowd close, their canopy sighing overhead. An owl studies you from a low '
      + 'branch, and a speckled toadstool sprouts beside an old stump. The meadow lies east.',
  walk: [{ x: 8, y: 116, w: 304, h: 70 }],
  block: [
    { x: 42, y: 116, w: 18, h: 14 },  // big tree trunk
    { x: 196, y: 128, w: 16, h: 12 }, // tree trunk
    { x: 118, y: 152, w: 20, h: 12 }, // stump
  ],
  exits: [{ side: 'e', to: 'meadow' }],
  draw(g, t, game) {
    // canopy gloom
    rc(g, 0, SCENE_TOP, 320, 110, '#003300');
    dither(g, 0, SCENE_TOP, 320, 60, '#003300', C.green);
    speckle(g, 91, 0, SCENE_TOP, 320, 50, C.lgreen, 120);
    // light shafts
    g.fillStyle = 'rgba(255,255,85,0.18)';
    g.beginPath(); g.moveTo(150, SCENE_TOP); g.lineTo(170, SCENE_TOP); g.lineTo(230, SCENE_BOT); g.lineTo(196, SCENE_BOT); g.fill();
    // ground
    rc(g, 0, 112, 320, SCENE_BOT - 111, '#116611');
    speckle(g, 17, 0, 114, 320, SCENE_BOT - 115, C.green, 300);
    speckle(g, 29, 0, 114, 320, SCENE_BOT - 115, '#0a4a0a', 260);
    // big owl tree
    rc(g, 42, 40, 18, 90, C.brown);
    rc(g, 46, 40, 5, 90, '#7a3c00');
    rc(g, 58, 74, 40, 5, C.brown); // branch
    g.fillStyle = C.green;
    g.beginPath(); g.arc(50, 40, 34, 0, 7); g.fill();
    g.beginPath(); g.arc(90, 30, 26, 0, 7); g.fill();
    // second tree
    rc(g, 196, 60, 16, 80, C.brown);
    rc(g, 200, 60, 4, 80, '#7a3c00');
    g.fillStyle = C.green;
    g.beginPath(); g.arc(204, 52, 30, 0, 7); g.fill();
    g.fillStyle = C.lgreen;
    g.beginPath(); g.arc(196, 42, 12, 0, 7); g.fill();
    tree(g, 290, 130, 1.4);
    // stump
    rc(g, 118, 148, 20, 14, C.brown);
    rc(g, 120, 146, 16, 5, '#c88838');
    // mushroom by the stump
    if (!game.f.mushroomTaken) g.drawImage(SPR.mushroom, 142, 156);
  },
  actors(game, t) {
    const blink = (t % 160) < 12 ? 1 : 0;
    return [{ y: 74, draw: (g) => g.drawImage(SPR.owl[blink], 72, 65) }];
  },
  hotspots: [
    {
      names: ['owl', 'bird'],
      at: { x: 70, y: 64, w: 12, h: 12 }, near: 60, smart: 'talk',
      verbs: {
        look: 'A round brown owl with enormous golden eyes. It looks wiser than most of the court.',
        talk: (g) => {
          if (!g.f.dragonGone) return g.say(
            '"Hoo," says the owl, turning its head alarmingly far. "Off to face the dragon, are we?"',
            '"Then know this: a dragon\'s flame is its pride and its life. Douse it — truly douse it — '
            + 'and the beast will flee in shame. The lake is generous, if you\'ve something to carry water in. Hoo."',
          );
          return '"Hoo. The kingdom smells of victory. Or possibly carrots."';
        },
        take: 'The owl hops just out of reach and gives you a look of ancient disappointment.',
      },
    },
    {
      names: ['mushroom', 'toadstool'],
      at: (g) => g.f.mushroomTaken ? null : { x: 140, y: 154, w: 12, h: 10 }, near: 36, smart: 'take',
      verbs: {
        look: 'A fat red toadstool with white speckles. It looks decidedly, emphatically poisonous.',
        take: (g) => {
          g.f.mushroomTaken = true;
          g.give('mushroom');
          return 'You pick the toadstool, careful not to lick your fingers afterward.';
        },
        eat: () => 'Surely not. It has warning colors. It IS a warning.',
        smell: 'It smells like regret.',
      },
    },
    {
      names: ['stump'],
      at: { x: 118, y: 146, w: 20, h: 16 }, near: 40,
      verbs: {
        look: 'An old lightning-split stump, soft with moss.',
        sit: 'No time to rest — the kingdom needs its crown.',
      },
    },
    {
      names: ['tree', 'trees', 'oak', 'forest'],
      at: { x: 30, y: 20, w: 260, h: 140 }, near: 400,
      verbs: {
        look: 'Ancient oaks. The whispering you hear is probably just the wind. Probably.',
        climb: 'The lowest branch belongs to the owl, and the owl is not sharing.',
      },
    },
  ],
};

// ---- lake ----
ROOMS.lake = {
  id: 'lake',
  name: 'Lake Moorewater',
  desc: 'A calm blue lake fills the valley south of the meadow. Something glints on the sandy shore. '
      + 'The water looks deep — and your tunic is not a swimming costume.',
  walk: [{ x: 8, y: 112, w: 304, h: 62 }], // extends into the shallows — a Sierra classic
  block: [],
  exits: [{ side: 'n', to: 'meadow' }],
  triggers: [
    {
      rect: { x: 0, y: 162, w: 320, h: 28 },
      when: () => true,
      fn: (g) => g.die('You wade in for a closer look. The lakebed drops away like a trapdoor, and your '
        + 'sturdy boots turn out to be excellent anchors. Glub.'),
    },
  ],
  draw(g, t, game) {
    sky(g, SCENE_TOP, 74);
    cloud(g, 120, SCENE_TOP + 10, 40);
    grass(g, 12, 74);
    tree(g, 24, 116, 1.2);
    // sand
    dither(g, 0, 130, 320, 26, C.yellow, '#c8a838');
    speckle(g, 55, 0, 132, 320, 22, C.brown, 90);
    // water
    water(g, t, 0, 156, 320, SCENE_BOT - 155);
    dither(g, 0, 154, 320, 3, C.yellow, C.blue);
    // reeds
    for (const rx of [270, 278, 286]) {
      rc(g, rx, 140, 2, 18, C.green);
      rc(g, rx - 1, 138, 4, 6, C.brown);
    }
    // bucket on the sand
    if (!game.f.bucketTaken) g.drawImage(SPR.bucket, 208, 140);
  },
  actors() { return []; },
  hotspots: [
    {
      names: ['bucket', 'pail'],
      at: (g) => g.f.bucketTaken ? null : { x: 206, y: 138, w: 12, h: 12 }, near: 36, smart: 'take',
      verbs: {
        look: 'A sturdy wooden bucket, abandoned by some picnicker. Watertight, by the look of it.',
        take: (g) => {
          g.f.bucketTaken = true;
          g.give('bucket');
          g.award('bucket');
          return 'You take the bucket. Every hero needs a bucket; few admit it.';
        },
      },
    },
    {
      names: ['lake', 'water'],
      at: { x: 0, y: 156, w: 320, h: 30 }, near: 60, smart: 'look',
      verbs: {
        look: 'Deep, cold and glass-calm. A fish jumps, mocking you gently.',
        swim: (g) => g.die('You dive in heroically. Your boots, belt and iron nerve all weigh roughly '
          + 'the same as an anvil. The lake keeps its secrets — and now, you.'),
        drink: 'You scoop a cold mouthful. Tastes faintly of fish opinions.',
        fill: (g) => {
          if (!g.has('bucket')) return 'You have nothing to carry water in.';
          if (g.f.bucketFull) return 'The bucket is already full.';
          g.f.bucketFull = true; g.award('fill'); g.sfx.splash();
          return 'You fill the bucket with cold lake water. Heavier than it looks.';
        },
      },
    },
    {
      names: ['reeds', 'reed'],
      at: { x: 266, y: 136, w: 26, h: 22 }, near: 40,
      verbs: { look: 'Cattails nod at the waterline.', take: 'They squeak rudely and stay rooted.' },
    },
  ],
};

// ---- troll bridge ----
ROOMS.bridge = {
  id: 'bridge',
  name: 'The Troll Bridge',
  desc: 'A rope-and-plank bridge spans a roaring gorge. On the far side squats an enormous troll '
      + 'with a club the size of a rowboat. The mountains rise to the east.',
  walk: [
    { x: 8, y: 116, w: 124, h: 70 },     // west bank
    { x: 128, y: 146, w: 70, h: 16 },    // the bridge itself
    { x: 194, y: 116, w: 118, h: 70 },   // east bank
  ],
  block: [],
  exits: [{ side: 'w', to: 'meadow' }, { side: 'e', to: 'mountain', when: (g) => g.f.trollGone }],
  triggers: [
    {
      rect: { x: 150, y: 140, w: 60, h: 26 },
      when: (g) => !g.f.trollGone && !g.f.goatFollowing,
      fn: (g) => {
        g.f.trollTries = (g.f.trollTries || 0) + 1;
        if (g.f.trollTries === 1) {
          g.hero.x = 140; g.hero.tx = null;
          g.sfx.roar();
          g.say('The troll rises to its full, horrible height. "TOLL!" it bellows, and shoves you back '
            + 'with one mossy finger. "NONE CROSS. BRIDGE MINE."');
        } else if (g.f.trollTries === 2) {
          g.hero.x = 140; g.hero.tx = null;
          g.sfx.roar();
          g.say('"LAST WARNING, TIN MAN." The troll\'s breath alone nearly knocks you into the gorge. '
            + 'Perhaps brute force is the wrong approach. Perhaps... a harder head is needed.');
        } else {
          g.die('The troll picks you up like a kitten, examines you briefly, and drops you into the gorge. '
            + 'The river far below breaks your fall. And everything else.');
          g.f.trollTries = 0;
        }
      },
    },
    {
      rect: { x: 60, y: 116, w: 260, h: 70 },
      when: (g) => !g.f.trollGone && g.f.goatFollowing && !g.cutscene,
      fn: (g) => g.startCutscene('goatCharge'),
    },
  ],
  draw(g, t, game) {
    sky(g, SCENE_TOP, 82);
    mountains(g, 82);
    grass(g, 21, 82);
    // gorge — layered rock strata falling away to the river
    rc(g, 132, 100, 60, SCENE_BOT - 99, '#333333');
    for (let y = 104; y < SCENE_BOT; y += 9) {
      rc(g, 132, y, 60, 4, C.dgray);
      rc(g, 136 + (y % 27), y + 2, 10, 1, '#222222');
    }
    speckle(g, 61, 132, 100, 60, SCENE_BOT - 100, '#222222', 140);
    rc(g, 128, 100, 4, SCENE_BOT - 99, '#7a3c00');
    rc(g, 192, 100, 4, SCENE_BOT - 99, '#7a3c00');
    // river at the bottom of the gorge
    water(g, t, 134, 176, 56, 10);
    // bridge
    rc(g, 124, 146, 76, 3, C.brown);
    rc(g, 124, 160, 76, 3, C.brown);
    for (let x = 126; x < 198; x += 7) rc(g, x, 148, 5, 13, '#c88838');
    rc(g, 124, 138, 2, 26, '#7a3c00'); rc(g, 198, 138, 2, 26, '#7a3c00');
    g.strokeStyle = '#7a3c00';
    g.beginPath(); g.moveTo(125, 140); g.lineTo(199, 140); g.stroke();
    tree(g, 40, 120, 1.3);
    for (const [fx, fy, fc] of [[70, 168, C.yellow], [250, 172, C.lred]]) flower(g, fx, fy, fc);
  },
  actors(game, t) {
    const a = [];
    const cs = game.cutscene;
    if (!game.f.trollGone) {
      let tx = 200, ty = 128, fall = 0;
      if (cs && cs.type === 'goatCharge' && cs.t > 60) {
        const k = cs.t - 60;
        if (k < 20) { tx = 200 - k; }               // knocked toward gorge
        else { tx = 176; fall = (k - 20) * 3; }     // plummets
      }
      if (fall < 90) a.push({
        y: ty + 34 + fall,
        draw: (g) => g.drawImage(SPR.troll, tx | 0, (ty + fall) | 0, 22, 34),
      });
    }
    if (game.f.goatAtBridge && game.f.trollGone) {
      const bob = (t >> 4) % 2;
      a.push({ y: 178, draw: (g) => g.drawImage(SPR.goatR[bob], 226, 166) });
    }
    return a;
  },
  hotspots: [
    {
      names: ['troll'],
      at: (g) => g.f.trollGone ? null : { x: 200, y: 128, w: 22, h: 34 }, near: 90, smart: 'talk',
      verbs: {
        look: 'Nine feet of moss, muscle and bad temper. Its club has notches. You do not ask what for.',
        talk: (g) => { g.sfx.roar(); return '"TOLL," explains the troll. Negotiations conclude.'; },
        give_carrot: 'The troll sniffs the carrot, then looks at you as if YOU were the vegetable. "TOLL. NOT SNACK."',
        give_mushroom: 'The troll recoils. Even trolls know better than to eat that.',
        kill: 'You are wearing a tunic. It is holding a tree trunk. Arithmetic says no.',
      },
    },
    {
      names: ['bridge'],
      at: { x: 124, y: 138, w: 76, h: 26 }, near: 70, smart: 'look',
      verbs: {
        look: (g) => g.f.trollGone
          ? 'The planks creak but hold. The gorge below is very deep and very opinionated.'
          : 'A sturdy plank bridge — with a distinctly non-sturdy troll problem at the far end.',
        cross: (g) => g.f.trollGone
          ? 'Just walk on across — the way east is clear now.'
          : 'The troll watches you like a cat watches a very confident mouse.',
      },
    },
    {
      names: ['gorge', 'river', 'water'],
      at: { x: 132, y: 166, w: 60, h: 20 }, near: 80,
      verbs: {
        look: 'Far below, white water gnaws the rocks.',
        jump: (g) => g.die('You leap into the gorge with tremendous style and no plan whatsoever. '
          + 'The river awards you full marks for entry.'),
        swim: 'You would have to jump in first, and that would be the end of the story.',
      },
    },
    {
      names: ['goat'],
      at: (g) => g.f.goatAtBridge ? { x: 226, y: 166, w: 20, h: 14 } : null, near: 46, smart: 'talk',
      verbs: {
        look: 'The goat grazes by the bridge it now owns, radiating quiet triumph.',
        talk: (g) => { g.sfx.bleat(); return '"Baaah," says the hero of the gorge.'; },
        pet: (g) => { g.sfx.bleat(); return 'You scratch the champion between the horns. It has earned it.'; },
        take: 'The goat has retired here. Its toll rates are very reasonable: none.',
      },
    },
  ],
};

// ---- mountain path ----
ROOMS.mountain = {
  id: 'mountain',
  name: 'Mountain Path',
  desc: 'A stony path climbs between towering crags. A cave mouth gapes in the cliff face, '
      + 'its edges scorched black. A crooked sign stands beside it.',
  walk: [{ x: 8, y: 122, w: 304, h: 64 }],
  block: [{ x: 60, y: 122, w: 22, h: 14 }],
  exits: [{ side: 'w', to: 'bridge' }],
  doors: [{ rect: { x: 226, y: 92, w: 44, h: 42 }, to: 'cave', x: 34, y: 168, label: 'cave' }],
  draw(g, t, game) {
    sky(g, SCENE_TOP, 70);
    // crags
    g.fillStyle = C.dgray;
    g.beginPath(); g.moveTo(0, 120); g.lineTo(30, 40); g.lineTo(70, 90); g.lineTo(110, 30); g.lineTo(150, 100); g.lineTo(0, 120); g.fill();
    g.fillStyle = '#666666';
    g.beginPath(); g.moveTo(150, 120); g.lineTo(200, 20); g.lineTo(260, 70); g.lineTo(320, 30); g.lineTo(320, 130); g.fill();
    g.fillStyle = C.white;
    g.beginPath(); g.moveTo(103, 39); g.lineTo(110, 30); g.lineTo(117, 39); g.fill();
    g.beginPath(); g.moveTo(193, 29); g.lineTo(200, 20); g.lineTo(207, 29); g.fill();
    // cliff wall behind path
    dither(g, 0, 100, 320, 36, C.dgray, '#666666');
    // cave mouth
    g.fillStyle = C.black;
    g.beginPath(); g.moveTo(226, 134); g.lineTo(230, 100); g.lineTo(248, 92); g.lineTo(266, 100); g.lineTo(270, 134); g.fill();
    // scorch marks
    speckle(g, 66, 222, 90, 54, 46, '#221100', 160);
    // rocky ground
    rc(g, 0, 130, 320, SCENE_BOT - 129, '#8a7a5a');
    speckle(g, 71, 0, 132, 320, SCENE_BOT - 133, C.dgray, 260);
    speckle(g, 88, 0, 132, 320, SCENE_BOT - 133, '#a89a78', 300);
    // boulder
    g.fillStyle = C.dgray;
    g.beginPath(); g.arc(70, 128, 12, 0, 7); g.fill();
    g.fillStyle = C.lgray;
    g.beginPath(); g.arc(66, 124, 5, 0, 7); g.fill();
    signpost(g, 288, 150);
    // circling bird
    g.fillStyle = C.black;
    const bx = 160 + Math.cos(t / 90) * 60, by = 40 + Math.sin(t / 70) * 8;
    g.fillRect(bx - 3, by, 3, 1); g.fillRect(bx + 1, by, 3, 1); g.fillRect(bx - 1, by - 1, 3, 1);
  },
  actors() { return []; },
  hotspots: [
    {
      names: ['cave', 'cave mouth', 'entrance'],
      at: { x: 226, y: 92, w: 44, h: 42 }, near: 46, smart: 'enter',
      verbs: {
        look: 'The cave mouth is charred like an old chimney. Warm air breathes out of it, smelling of sulfur.',
        enter: (g) => { g.goDoor('cave', 34, 168); },
      },
    },
    {
      names: ['sign', 'signpost'],
      at: { x: 288, y: 126, w: 14, h: 26 }, near: 40, smart: 'look',
      verbs: {
        look: 'The sign reads: "BEWARE YE DRAGON. SERIOUSLY. — MGMT"',
        read: 'The sign reads: "BEWARE YE DRAGON. SERIOUSLY. — MGMT"',
      },
    },
    {
      names: ['boulder', 'rock'],
      at: { x: 58, y: 116, w: 24, h: 20 }, near: 40,
      verbs: {
        look: 'A boulder, doing what boulders do best.',
        take: 'It outweighs your horse. You do not have a horse.',
        climb: 'You climb the boulder, feel briefly majestic, and climb back down.',
      },
    },
    {
      names: ['bird', 'condor'],
      at: { x: 100, y: 30, w: 120, h: 20 }, near: 400,
      verbs: { look: 'A carrion bird circles the path. It seems optimistic about you.' },
    },
  ],
};

// ---- dragon's cave ----
ROOMS.cave = {
  id: 'cave',
  name: "The Dragon's Cave",
  desc: 'The cave glows with firelight. Atop a mound of half-melted treasure sprawls the dragon, '
      + 'one lazy eye half-open, flames curling from its nostrils. Somewhere under it: the crown.',
  walk: [{ x: 8, y: 126, w: 304, h: 60 }],
  block: [{ x: 210, y: 130, w: 102, h: 56 }], // treasure mound
  exits: [{ side: 'w', to: 'mountain' }],
  triggers: [
    {
      rect: { x: 176, y: 126, w: 144, h: 60 },
      when: (g) => !g.f.dragonGone && !g.cutscene,
      fn: (g) => g.startCutscene('dragonWake'),
    },
  ],
  draw(g, t, game) {
    // rock walls
    rc(g, 0, SCENE_TOP, 320, 190, '#221408');
    dither(g, 0, SCENE_TOP, 320, 60, '#221408', '#3a2410');
    speckle(g, 99, 0, SCENE_TOP, 320, 100, '#3a2410', 400);
    // stalactites
    g.fillStyle = '#3a2410';
    for (let i = 0; i < 9; i++) {
      const sx = 20 + i * 36;
      g.beginPath(); g.moveTo(sx, SCENE_TOP); g.lineTo(sx + 8, SCENE_TOP); g.lineTo(sx + 4, SCENE_TOP + 14 + (i % 3) * 8); g.fill();
    }
    // floor
    rc(g, 0, 122, 320, SCENE_BOT - 121, '#4a3418');
    speckle(g, 111, 0, 124, 320, SCENE_BOT - 125, '#3a2410', 380);
    speckle(g, 123, 0, 124, 320, SCENE_BOT - 125, '#6a4c22', 300);
    // daylight from the entrance
    g.fillStyle = 'rgba(85,255,255,0.14)';
    g.beginPath(); g.moveTo(0, 110); g.lineTo(0, SCENE_BOT); g.lineTo(60, SCENE_BOT); g.fill();
    // treasure mound
    g.fillStyle = C.brown;
    g.beginPath(); g.moveTo(205, SCENE_BOT); g.lineTo(255, 128); g.lineTo(315, 132); g.lineTo(320, SCENE_BOT); g.fill();
    speckle(g, 140, 214, 134, 100, 50, C.yellow, 200);
    speckle(g, 151, 214, 140, 100, 44, '#c8a838', 120);
    // firelight glow when the dragon is home
    if (!game.f.dragonGone) {
      const flick = 0.10 + 0.05 * Math.sin(t / 5);
      g.fillStyle = `rgba(255,85,85,${flick})`;
      g.fillRect(140, SCENE_TOP, 180, 176);
      // flames curling from the snout (the head faces the entrance)
      for (let i = 0; i < 5; i++) {
        const fx = 196 + i * 5, fh = 6 + ((t >> 2) + i * 3) % 9;
        rc(g, fx, 122 - fh, 3, fh, i % 2 ? C.yellow : C.lred);
      }
    }
    // the crown, revealed
    if (game.f.dragonGone && !game.f.crownTaken) g.drawImage(SPR.crown, 250, 122);
  },
  actors(game, t) {
    const a = [];
    if (!game.f.dragonGone) {
      const frame = (t >> 5) % 2;
      let dy = 94, dx = 212;
      const cs = game.cutscene;
      if (cs && cs.type === 'dragonDouse' && cs.t > 80) {
        dy = 94 - (cs.t - 80) * 2.2;                     // flees upward, mortified
        if (cs.t % 8 < 4) dx += 2;                       // frantic wingbeats
      }
      if (dy > -70) a.push({ y: 128, draw: (g) => g.drawImage(SPR.dragonL[frame], dx, dy | 0, 79, 34) });
    }
    return a;
  },
  hotspots: [
    {
      names: ['dragon', 'beast'],
      at: (g) => g.f.dragonGone ? null : { x: 212, y: 94, w: 80, h: 36 }, near: 170, smart: 'look',
      verbs: {
        look: 'The dragon dozes with one eye cracked open, flame flickering at its nostrils like a pilot light. '
            + 'It is the size of a barn and considerably better armored.',
        talk: 'You clear your throat. The flames at its nostrils double in height. You un-clear it.',
        kill: 'With what — stern language? The beast is armored like a fortress. Its FIRE is the thing to beat.',
        give_carrot: 'Dragons are not herbivores. Do not volunteer alternatives.',
        give_mushroom: 'Tempting — but you would have to get close enough to serve it, and dragons prefer their food... you.',
      },
    },
    {
      names: ['crown'],
      at: (g) => (!g.f.crownTaken) ? { x: 246, y: 118, w: 18, h: 14 } : null,
      near: 60, smart: 'take',
      verbs: {
        look: (g) => g.f.dragonGone
          ? 'The Crown of Moore gleams atop the mound, unmelted and glorious.'
          : 'You can just see a golden glint beneath the dragon\'s foreleg. So close. So very guarded.',
        take: (g) => {
          if (!g.f.dragonGone) { g.startCutscene('dragonWake'); return; }
          g.f.crownTaken = true;
          g.give('crown');
          g.award('crown');
          g.sfx.fanfare();
          return 'You lift the Crown of Moore from the mound. It is heavier than it looks — most responsibilities are. '
               + 'Now: back to the king!';
        },
      },
    },
    {
      names: ['treasure', 'gold', 'mound', 'hoard'],
      at: { x: 210, y: 128, w: 102, h: 58 }, near: 70,
      verbs: {
        look: 'Coins, goblets and candlesticks, all fused together by dragonfire into one glittering lump.',
        take: (g) => g.f.dragonGone
          ? 'It is fused into a single lump weighing as much as a cottage. The crown alone will do.'
          : 'Reaching under a dragon for pocket change seems like a poor trade.',
      },
    },
    {
      names: ['fire', 'flames', 'flame'],
      at: (g) => g.f.dragonGone ? null : { x: 210, y: 130, w: 40, h: 20 }, near: 170,
      verbs: {
        look: 'The dragon\'s flame gutters and flares with every breath. Its pride and its life, the owl said.',
        take: 'Ha. No.',
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
