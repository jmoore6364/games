// Leisure Suit Moore: Looking for Love in Neon City — a Sierra-style adventure in vanilla JS.

import { SPR } from './sprites.js';
import { ROOMS, ITEMS, AWARDS, MAXSCORE, SCENE_TOP, SCENE_BOT, clampToWalk } from './world.js';
import { parse, nounMatch } from './parser.js';
import { sfx, startMusic, toggleMute, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;
const W = 320, H = 200;
const FONT = '8px monospace';
const SAVE_KEY = 'leisure-suit-moore-save';

// -------------------------------------------------------------- age quiz ----
// The time-honored adulthood exam. Guards nothing, delights everyone.

const QUIZ = [
  {
    q: 'A lava lamp is primarily used for:',
    a: ['Illumination', 'Home security', 'Setting a mood you cannot un-set'],
    correct: 2,
    snark: 'Incorrect. A lava lamp has never illuminated anything but the soul.',
  },
  {
    q: 'Disco is:',
    a: ['Dead', 'A type of biscuit', 'Eternal, and lives in all of us'],
    correct: 2,
    snark: 'WRONG. Go to your room and think about what you said.',
  },
  {
    q: 'How many shirt buttons may a gentleman leave undone?',
    a: ['Zero', 'Exactly one', 'As many as the chest hair requires'],
    correct: 2,
    snark: 'Incorrect, and frankly the suit is embarrassed for you.',
  },
];

// ------------------------------------------------------------------ state ----

function freshState() {
  return {
    mode: 'title',            // title | quiz | play | dead | won
    room: 'street',
    hero: { x: 60, y: 138, dir: 'down', step: 0, tx: null, ty: null },
    f: {},                    // world flags
    inv: [],
    cash: 10,
    score: 0,
    awarded: [],
    deaths: 0,
    msgs: [],                 // dialog page queue
    typed: '',
    pending: null,            // { hs, verb, item } to run on arrival
    cutscene: null,           // { type, t }
    lastSafe: { x: 60, y: 138 },
    deathText: '',
    pendingWin: false,
    invOpen: false,
    pickedItem: null,         // item selected from the bag (touch flow)
    quiz: { i: 0, flash: '' },
  };
}

let S = freshState();
const held = new Set();
let frame = 0;
let verbMode = 'walk';

// --------------------------------------------------------------- game api ----

const game = {
  get f() { return S.f; },
  get hero() { return S.hero; },
  get cutscene() { return S.cutscene; },
  get cash() { return S.cash; },
  get roomId() { return S.room; },
  sfx,
  say(...pages) { S.msgs.push(...pages); },
  has(id) { return S.inv.includes(id); },
  give(id) { if (!S.inv.includes(id)) { S.inv.push(id); sfx.pickup(); } },
  remove(id) { S.inv = S.inv.filter(i => i !== id); },
  pay(n) { if (S.cash < n) return false; S.cash -= n; return true; },
  earn(n) { S.cash += n; },
  award(id) {
    if (S.awarded.includes(id)) return;
    S.awarded.push(id);
    S.score += AWARDS[id];
    sfx.award();
  },
  die(text) {
    if (S.mode !== 'play') return;
    S.mode = 'dead';
    S.deaths++;
    S.deathText = text;
    S.cutscene = null;
    S.hero.tx = S.hero.ty = null;
    S.pending = null;
    sfx.death();
  },
  winGame() {
    sfx.fanfare();
    game.award('love');
    S.f.won = true;
    S.pendingWin = true;
    game.say(
      'You kiss Delilah as the sun clears the skyline, and forty floors below, all of Neon City '
      + 'honks at once. (Traffic. But it FEELS like applause.)',
      'She pulls back just far enough to look at you. "Jason Moore," she says, trying the name out, '
      + '"you\'re a disaster in a beautiful suit." She straightens your collar. "MY disaster."',
    );
  },
  goDoor(to, x, y) {
    sfx.open();
    switchRoom(to, x, y);
  },
  startCutscene(type) {
    if (S.cutscene) return;
    S.hero.tx = S.hero.ty = null;
    S.pending = null;
    S.cutscene = { type, t: 0, hx: S.hero.x, hy: S.hero.y };
  },
};

function room() { return ROOMS[S.room]; }

function switchRoom(to, x, y) {
  S.room = to;
  const p = clampToWalk(ROOMS[to], x, y);
  S.hero.x = p.x; S.hero.y = p.y;
  S.hero.tx = S.hero.ty = null;
  S.pending = null;
  S.lastSafe = { x: p.x, y: p.y };
}

// ------------------------------------------------------------- collisions ----

function canStand(x, y) {
  const r = room();
  let ok = false;
  for (const w of r.walk) if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) { ok = true; break; }
  if (!ok) return false;
  for (const b of (r.block || [])) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return false;
  return true;
}

function walkBounds() {
  const r = room();
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const w of r.walk) {
    minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x + w.w);
    minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y + w.h);
  }
  return { minX, maxX, minY, maxY };
}

function findExit(side) {
  for (const e of (room().exits || [])) {
    if (e.side !== side) continue;
    if (e.when && !e.when(game)) continue;
    return e;
  }
  return null;
}

// ---------------------------------------------------------------- movement ----

const SPEED = 1.4;

function moveHero() {
  const h = S.hero;
  let dx = 0, dy = 0;
  if (held.has('ArrowLeft')) dx -= 1;
  if (held.has('ArrowRight')) dx += 1;
  if (held.has('ArrowUp')) dy -= 1;
  if (held.has('ArrowDown')) dy += 1;

  if (dx || dy) { h.tx = h.ty = null; if (S.pending) S.pending = null; }
  else if (h.tx != null) {
    const ddx = h.tx - h.x, ddy = h.ty - h.y;
    const d = Math.hypot(ddx, ddy);
    if (d < 2) { h.tx = h.ty = null; onArrive(); }
    else { dx = ddx / d; dy = ddy / d; }
  }
  if (!dx && !dy) { h.step = 0; return; }

  if (Math.abs(dx) > Math.abs(dy)) h.dir = dx < 0 ? 'left' : 'right';
  else if (dy) h.dir = dy < 0 ? 'up' : 'down';

  const before = h.tx != null ? Math.hypot(h.tx - h.x, h.ty - h.y) : 0;
  const nx = h.x + dx * SPEED, ny = h.y + dy * SPEED;
  let moved = false;
  if (dx && canStand(nx, h.y)) { h.x = nx; moved = true; }
  if (dy && canStand(h.x, ny)) { h.y = ny; moved = true; }
  h.step = moved ? h.step + 1 : 0;

  // auto-walk stall detection: an obstacle can block real progress while tiny
  // one-axis drift keeps `moved` true — give up and try the pending action
  if (h.tx != null) {
    const after = Math.hypot(h.tx - h.x, h.ty - h.y);
    h.stall = (before - after < 0.2) ? (h.stall || 0) + 1 : 0;
    if (h.stall > 12) { h.stall = 0; h.tx = h.ty = null; onArrive(); return; }
  }

  // edge exits
  const b = walkBounds();
  let exit = null, side = null;
  if (dx < 0 && h.x <= b.minX + 3) side = 'w';
  else if (dx > 0 && h.x >= b.maxX - 3) side = 'e';
  else if (dy < 0 && h.y <= b.minY + 3) side = 'n';
  else if (dy > 0 && h.y >= b.maxY - 3) side = 's';
  if (side) exit = findExit(side);
  if (exit) {
    const dest = ROOMS[exit.to];
    const db = (() => {
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (const w of dest.walk) {
        minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x + w.w);
        minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y + w.h);
      }
      return { minX, maxX, minY, maxY };
    })();
    if (side === 'w') switchRoom(exit.to, db.maxX - 6, h.y);
    else if (side === 'e') switchRoom(exit.to, db.minX + 6, h.y);
    else if (side === 'n') switchRoom(exit.to, h.x, db.maxY - 6);
    else switchRoom(exit.to, h.x, db.minY + 6);
    return;
  }

  // stuck while auto-walking: give up and try the pending action anyway
  if (!moved && h.tx != null) { h.tx = h.ty = null; onArrive(); }

  // doors (some have velvet-rope policies)
  for (const d of (room().doors || [])) {
    const r = d.rect;
    if (h.x >= r.x && h.x <= r.x + r.w && h.y >= r.y && h.y <= r.y + r.h) {
      if (d.when && !d.when(game)) {
        h.y = Math.min(h.y + 10, walkBounds().maxY - 3); // bounced back politely
        h.tx = h.ty = null;
        S.pending = null;
        if (d.deny) d.deny(game);
        return;
      }
      game.goDoor(d.to, d.x, d.y);
      return;
    }
  }
}

function hotspotRect(hs) {
  const at = typeof hs.at === 'function' ? hs.at(game) : hs.at;
  return at || null;
}

function distToRect(x, y, r) {
  const cx = Math.max(r.x, Math.min(r.x + r.w, x));
  const cy = Math.max(r.y, Math.min(r.y + r.h, y));
  return Math.hypot(x - cx, y - cy);
}

function onArrive() {
  const p = S.pending;
  if (!p) return;
  S.pending = null;
  const r = hotspotRect(p.hs);
  if (!r) return;
  const near = (p.hs.near || 36) * 1.4;
  if (distToRect(S.hero.x, S.hero.y, r) <= near) runHotspotVerb(p.hs, p.verb, p.item);
  else game.say("You can't quite get close enough.");
}

// --------------------------------------------------------------- cutscenes ----

function updateCutscene() {
  const cs = S.cutscene;
  if (!cs) return;
  cs.t++;
  if (cs.type === 'taxi') {
    if (cs.t === 6) sfx.honk();
    if (cs.t === 30) sfx.honk();
    if (cs.t === 44) sfx.crash();
    if (cs.t >= 66) {
      S.cutscene = null;
      game.die('You step into the road. A taxi appears from nowhere — they always appear from nowhere — '
        + 'and the last thing you hear is the cabbie\'s meter still running. In Neon City, jaywalking '
        + 'isn\'t a misdemeanor. It\'s a lifestyle, and lifestyles end.');
    }
  } else if (cs.type === 'dance') {
    if (cs.t === 1) sfx.scratch();
    if (cs.t % 30 === 5) sfx.blip();
    if (cs.t >= 230) {
      S.cutscene = null;
      S.f.danced = true;
      S.f.lockKnown = true;
      game.award('dance');
      game.say(
        'The floor clears. The mirror ball finds you. And for three glorious minutes, Jason Moore — '
        + 'assistant regional manager of a discount carpet emporium — is the undisputed KING of the Inferno. '
        + 'Even DJ Mojo removes one headphone, which has never happened.',
        'Delilah spins into your arms, laughing for real now. "Okay, OKAY, Polyester. You can dance. '
        + 'Earl teach you that?" She catches her breath, and her hand goes to her bare collarbone.',
        '"I used to have a locket," she says, quieter. "Gold. My grandmother\'s. Clasp snapped the other '
        + 'night in the alley behind Sticky\'s — it\'s probably at the bottom of that horrible dumpster." '
        + 'She smiles, but it doesn\'t reach all the way. "Anyway. Dance with me again sometime, sugar."',
      );
    }
  }
}

function drawCutsceneFx() {
  const cs = S.cutscene;
  if (!cs) return;
  if (cs.type === 'taxi') {
    // the taxi of destiny
    const tx = -80 + cs.t * 7;
    g.drawImage(SPR.taxi, tx | 0, (S.hero.y - 10) | 0);
    if (cs.t > 44) {
      // stars over the hero
      for (let i = 0; i < 5; i++) {
        const a = cs.t / 6 + i * 1.26;
        g.fillStyle = C_YELLOW;
        g.fillRect(S.hero.x + Math.cos(a) * 12 - 1, S.hero.y - 30 + Math.sin(a) * 5, 3, 3);
      }
    }
  } else if (cs.type === 'dance') {
    // strobe wash
    if ((cs.t >> 3) % 4 === 0) {
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(0, SCENE_TOP, W, SCENE_BOT - SCENE_TOP);
    }
    // spotlight on the pair
    g.fillStyle = 'rgba(255,255,170,0.10)';
    g.beginPath(); g.ellipse(160, 150, 46, 16, 0, 0, 7); g.fill();
    // the dancers
    const df = (cs.t >> 4) % 2;
    g.drawImage(SPR.heroDance[df], 136, 128);
    g.drawImage(SPR.delilahDance[1 - df], 172, 129);
    // hearts, once things get going
    if (cs.t > 140) {
      for (let i = 0; i < 4; i++) {
        const hy = 120 - ((cs.t - 140) + i * 22) % 70;
        const hx = 150 + i * 8 + Math.sin((cs.t + i * 30) / 10) * 6;
        drawHeart(hx, hy, ['#FF5555', '#FF55FF'][i % 2]);
      }
    }
  }
}

const C_YELLOW = '#FFFF55';

function drawHeart(x, y, c) {
  g.fillStyle = c;
  g.fillRect(x, y, 2, 2); g.fillRect(x + 3, y, 2, 2);
  g.fillRect(x - 1, y + 1, 7, 2);
  g.fillRect(x, y + 3, 5, 1);
  g.fillRect(x + 1, y + 4, 3, 1);
  g.fillRect(x + 2, y + 5, 1, 1);
}

// ------------------------------------------------------------ command exec ----

const ITEM_LOOK = {
  fizz: 'Grape fizz: purple, cold, and — to exactly one man in this city — priceless.',
  mints: 'ARCTIC BLAST breath mints. The tin hums faintly with menthol menace.',
  rose: 'A long-stemmed red rose, wrapped in Quickie Mart paper towel. Romance finds a way.',
  card: 'Earl\'s gold Inferno membership card, worn smooth by better decades. "CLASS OF \'77" is still legible.',
  locket: 'Delilah\'s gold locket, rescued from the dumpster. It smells faintly of victory and heavily of banana.',
};

function findHotspot(noun) {
  for (const hs of room().hotspots || []) {
    if (!hotspotRect(hs)) continue;
    if (nounMatch(noun, hs.names)) return hs;
  }
  return null;
}

function findInvItem(noun) {
  for (const id of S.inv) if (nounMatch(noun, ITEMS[id].names)) return id;
  return null;
}

function runHotspotVerb(hs, verb, item) {
  let fn = null;
  if (item) fn = hs.verbs['give_' + item] || hs.verbs['use_' + item];
  else fn = hs.verbs[verb];
  if (!fn) {
    if (item) { game.say('That doesn\'t seem to accomplish anything.'); return; }
    return defaultVerbMsg(verb);
  }
  const res = typeof fn === 'function' ? fn(game) : fn;
  if (typeof res === 'string') game.say(res);
}

function actOnHotspot(hs, verb, item) {
  const r = hotspotRect(hs);
  if (!r) return game.say('You don\'t see that here.');
  const near = hs.near || 36;
  if (verb === 'look' && near >= 150) return runHotspotVerb(hs, verb, item); // scenery
  if (distToRect(S.hero.x, S.hero.y, r) <= near) return runHotspotVerb(hs, verb, item);
  // too far: walk over, then do it
  const spot = clampToWalk(room(), r.x + r.w / 2, r.y + r.h + 4);
  S.hero.tx = spot.x; S.hero.ty = spot.y;
  S.pending = { hs, verb, item };
}

function defaultVerbMsg(verb) {
  const M = {
    look: 'You see nothing special. Which, in this town, is a relief.',
    take: 'It stays. You go. That\'s the arrangement.',
    talk: 'It says nothing, which puts it in the top half of your conversations tonight.',
    open: 'It doesn\'t open.',
    close: 'It doesn\'t close.',
    use: 'Nothing happens. The suit remains the most functional thing about you.',
    eat: 'You\'re saving your appetite for romance.',
    drink: 'There\'s nothing drinkable here, and Neon City has a LOW bar.',
    climb: 'The suit forbids it.',
    kill: 'Violence wrinkles polyester.',
    give: 'They don\'t want it. Story of your life, but the night is young.',
    enter: 'You can\'t go in there.',
    buy: 'Nobody\'s selling that here.',
    pay: 'You wave money around. Nobody is impressed, which is new information about money.',
    search: 'You find lint, a business card for the carpet emporium, and no dignity.',
    play: 'Nothing here takes your quarters.',
    dance: 'You bust a brief, tasteful move. The world declines to notice.',
    kiss: 'You pucker at nothing in particular. A passing pigeon files a report.',
    smell: 'Smells like Saturday night: hairspray, asphalt, and hope.',
    pet: 'It does not wish to be petted.',
    read: 'There\'s nothing to read.',
    sit: 'No time to sit. Destiny is on a schedule.',
    knock: 'You knock. Nothing answers. It\'s that kind of town.',
    swim: 'The nearest swimmable water is two counties away and closed.',
    call: 'There\'s no phone here.',
  };
  game.say(M[verb] || 'Nothing happens.');
}

function helpText() {
  const f = S.f;
  if (!f.questGiven) return 'When in doubt, ask a bartender. Sticky\'s Lounge is right there. TALK TO STICKY.';
  if (!f.cardGiven) {
    if (!game.has('fizz')) return 'Earl needs his medicine: grape fizz, two bucks, in the Quickie Mart cooler. BUY FIZZ.';
    return 'You have the fizz. Earl is at the bar in Sticky\'s. GIVE FIZZ TO EARL.';
  }
  if (!game.has('mints') && !f.mintFresh) return 'Sticky said it: fresh breath. The mart sells ARCTIC BLAST mints for a dollar.';
  if (!game.has('rose') && !f.roseGiven) return 'Sticky said it: red roses. Vince sells them for five bucks.';
  if (!f.coverPaid) {
    if (S.cash < 20) return 'The Inferno\'s cover is $20 and you\'re light. The GRAND casino has slot machines. Lucky Lucy is due.';
    return 'You\'ve got card and cash. Find Bruno outside the Inferno and PAY BOUNCER.';
  }
  if (!f.mintFresh) return 'Before you talk to anyone beautiful: EAT MINTS.';
  if (!f.roseGiven) return 'Delilah is at the tall table in the Inferno. GIVE ROSE TO DELILAH.';
  if (!f.danced) return 'She\'s waiting, champ. DANCE.';
  if (!f.lockFound) return 'Her locket is in the dumpster behind Sticky\'s. SEARCH DUMPSTER. Sorry about the suit.';
  if (!f.invited) return 'You have her locket. You know where she is. GIVE LOCKET TO DELILAH.';
  if (!f.won) return 'The Hotel Grand rooftop, on the Strip. She\'s waiting. When the moment is right: KISS DELILAH.';
  return 'You\'ve done it all. Watch the sunrise, champ.';
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      f: S.f, inv: S.inv, cash: S.cash, score: S.score, awarded: S.awarded,
      deaths: S.deaths, room: S.room, x: S.hero.x, y: S.hero.y,
    }));
    game.say('Game saved. (Type RESTORE to return to this moment of glory.)');
  } catch { game.say('The save failed. Even technology is playing hard to get tonight.'); }
}

function restoreGame() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* fall through */ }
  if (!d) return game.say('There is no saved game.');
  S = freshState();
  S.mode = 'play';
  S.f = d.f; S.inv = d.inv; S.cash = d.cash; S.score = d.score; S.awarded = d.awarded;
  S.deaths = d.deaths; S.room = d.room;
  S.hero.x = d.x; S.hero.y = d.y;
  S.lastSafe = { x: d.x, y: d.y };
  game.say('Game restored. The night continues.');
}

function execute(text) {
  if (S.mode !== 'play') return;
  const cmd = parse(text);
  if (!cmd) return;
  const { verb, noun, noun2 } = cmd;

  if (!verb) { sfx.buzz(); return game.say(`You don't know how to "${cmd.raw.split(' ')[0]}". Few do.`); }

  // meta verbs
  switch (verb) {
    case 'inv': {
      S.invOpen = true;
      return;
    }
    case 'help': return game.say(helpText());
    case 'score': return game.say(`You have ${S.score} of ${MAXSCORE} points, $${S.cash} in your pocket, and have died ${S.deaths} time${S.deaths === 1 ? '' : 's'}.`);
    case 'save': return saveGame();
    case 'restore': return restoreGame();
    case 'restart': { S = freshState(); S.mode = 'play'; introText(); return; }
    case 'mute': { const m = toggleMute(); return game.say(m ? 'Sound off.' : 'Sound on.'); }
    case 'quit': return game.say('Quit? The night is YOUNG and so are you, roughly. Close the tab if you must.');
    case 'jump': return game.say('You jump. The gold chain achieves brief, glorious orbit.');
    case 'pray': return game.say('A distant voice whispers: "Have you tried mints?"');
    case 'comb': { sfx.whistle(); return game.say('You run a comb through your hair. Somewhere in the night, a saxophone answers.'); }
    case 'xyzzy': return game.say('A hollow voice says: "Wrong genre. But the suit? The suit works."');
  }

  // verbs that route to whatever in the room can handle them
  const routed = { dance: 'dance', kiss: 'kiss', play: 'play', pay: 'pay' };
  if (routed[verb]) {
    let target = noun ? findHotspot(noun) : null;
    if (!target) {
      // nearest hotspot that supports the verb
      let bd = 1e9;
      for (const hs of room().hotspots || []) {
        const r = hotspotRect(hs);
        if (!r || !hs.verbs[verb]) continue;
        const d = distToRect(S.hero.x, S.hero.y, r);
        if (d < bd) { bd = d; target = hs; }
      }
    }
    if (target && target.verbs[verb]) return actOnHotspot(target, verb);
    if (noun && !target) return game.say(`You don't see any ${noun} here.`);
    return defaultVerbMsg(verb);
  }

  // give ITEM to TARGET
  if (verb === 'give' && noun) {
    const item = findInvItem(noun);
    if (!item) {
      if (findHotspot(noun) && noun2) return game.say('You don\'t have that to give.');
      return game.say(`You don't have any ${noun}.`);
    }
    let target = noun2 ? findHotspot(noun2) : null;
    if (!target && !noun2) {
      const hs = findHotspot(noun);
      if (hs) return game.say(`Give what to the ${noun}?`);
      return game.say(`Give the ${ITEMS[item].names[0]} to whom?`);
    }
    if (!target) return game.say(`You don't see any ${noun2} here.`);
    return actOnHotspot(target, 'give', item);
  }
  if (verb === 'give' && !noun) return game.say('Give what?');

  // use ITEM on TARGET
  if (verb === 'use' && noun && noun2) {
    const item = findInvItem(noun);
    const target = findHotspot(noun2);
    if (item && target) return actOnHotspot(target, 'use', item);
  }

  // inventory items with special behavior
  if (verb === 'eat' && noun) {
    const item = findInvItem(noun);
    if (item === 'mints') {
      if (S.f.mintFresh) return game.say('You\'re already at maximum mint. Any more and you\'d be legally a glacier.');
      S.f.mintFresh = true;
      sfx.blip();
      return game.say('You crunch an ARCTIC BLAST. Your sinuses reboot. Your eyes water. Your breath could now '
        + 'be used to preserve evidence. PERFECT.');
    }
    if (item === 'rose') return game.say('You eat the... no. NO. It cost five dollars and it\'s doing important work.');
    if (item) return game.say('You cannot eat that.');
  }
  if (verb === 'drink' && noun) {
    const item = findInvItem(noun);
    if (item === 'fizz') return game.say('It\'s Earl\'s medicine, and somewhere across town you feel him flinch. Hands off.');
  }

  // room hotspots
  if (noun) {
    const hs = findHotspot(noun);
    if (hs) return actOnHotspot(hs, verb);
    const item = findInvItem(noun);
    if (item) {
      if (verb === 'look' || verb === 'read') return game.say(ITEM_LOOK[item]);
      if (verb === 'take') return game.say('You already have it.');
      return defaultVerbMsg(verb);
    }
    // nouns that refer to yourself
    if (['self', 'myself', 'jason', 'moore', 'suit', 'leisure suit', 'me'].includes(noun)) {
      if (verb === 'look') return game.say('Jason Moore: 38, assistant regional manager of a discount carpet emporium, '
        + 'wearing the last white leisure suit in America. Tonight it fits like destiny.');
      if (verb === 'smell') return game.say(S.f.lockFound && !S.f.invited
        ? 'Drakkar Noir, hairspray, and — since the dumpster — banana. It reads as "complicated."'
        : 'Drakkar Noir and optimism, in a 60/40 blend.');
      return game.say('Best not. The suit is load-bearing.');
    }
    sfx.buzz();
    return game.say(`You don't see any ${noun} here.`);
  }

  // bare verbs
  if (verb === 'look') return game.say(room().desc);
  if (verb === 'talk') {
    let best = null, bd = 1e9;
    for (const hs of room().hotspots || []) {
      const r = hotspotRect(hs);
      if (!r || !hs.verbs.talk) continue;
      const d = distToRect(S.hero.x, S.hero.y, r);
      if (d < bd) { bd = d; best = hs; }
    }
    if (best && bd < 80) return actOnHotspot(best, 'talk');
    return game.say('You strike up a conversation with the night itself. It plays hard to get.');
  }
  return game.say(`${verb === 'take' ? 'Take' : 'Do that to'} what?`);
}

function introText() {
  game.say(
    'NEON CITY, SATURDAY NIGHT. You are JASON MOORE — 38, assistant regional manager of a discount '
    + 'carpet emporium, and owner-operator of the last white leisure suit in America.',
    'Tonight is different. Tonight you can feel it in the polyester. Tonight, you will find TRUE LOVE '
    + 'or perish in the attempt. (Statistically, the attempt.)',
    '(Walk with the ARROW KEYS or by tapping. Type things like LOOK, TALK TO STICKY, BUY FIZZ. '
    + 'Type HELP if you\'re stuck. Stay out of the road. Seriously.)',
  );
}

// ------------------------------------------------------------------- step ----

function step() {
  frame++;
  if (S.mode !== 'play') return;
  if (S.msgs.length) return;          // world pauses while a dialog is up
  if (S.pendingWin) { S.mode = 'won'; return; }
  if (S.invOpen) return;

  if (S.cutscene) { updateCutscene(); return; }

  moveHero();

  // triggers
  for (const tr of room().triggers || []) {
    const r = tr.rect;
    const h = S.hero;
    if (h.x >= r.x && h.x <= r.x + r.w && h.y >= r.y && h.y <= r.y + r.h && (!tr.when || tr.when(game))) {
      tr.fn(game);
      break;
    }
  }
}

// ----------------------------------------------------------------- render ----

function text(str, x, y, color = '#000', font = FONT, align = 'left') {
  g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'top';
  g.fillText(str, x, y);
}

function wrap(str, maxW, font = FONT) {
  g.font = font;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function drawHero() {
  const h = S.hero;
  if (S.cutscene && S.cutscene.type === 'dance') return; // the cutscene draws him
  const set = SPR.hero[h.dir] || SPR.hero.down;
  const f = h.step === 0 ? 0 : 1 + ((h.step >> 3) % 2);
  const img = set[f];
  g.drawImage(img, (h.x - img.width / 2) | 0, (h.y - img.height) | 0);
}

function drawDialog() {
  if (!S.msgs.length) return;
  const msg = S.msgs[0];
  const lines = wrap(msg, 248);
  const bh = lines.length * 10 + 24;
  const bx = 28, by = Math.max(SCENE_TOP + 8, 92 - bh / 2), bw = 264;
  g.fillStyle = '#fff'; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#AA00AA'; g.lineWidth = 2; g.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
  lines.forEach((ln, i) => text(ln, bx + 8, by + 8 + i * 10));
  text(S.msgs.length > 1 ? '· MORE ·' : '· ENTER ·', bx + bw / 2, by + bh - 10, '#AA00AA', FONT, 'center');
}

function drawInventory() {
  if (!S.invOpen) return;
  const bx = 40, by = 30, bw = 240, bh = 130;
  g.fillStyle = '#fff'; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#AA00AA'; g.lineWidth = 2; g.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
  text('— POCKET INVENTORY —', bx + bw / 2, by + 8, '#000', FONT, 'center');
  text(`cash: $${S.cash}`, bx + bw / 2, by + 20, '#555', FONT, 'center');
  if (!S.inv.length) text('lint, mostly', bx + bw / 2, by + 48, '#555', FONT, 'center');
  S.inv.forEach((id, i) => {
    const iy = by + 34 + i * 18;
    const icon = ITEMS[id].icon(game);
    g.drawImage(icon, bx + 14, iy, 16, 16);
    text(ITEMS[id].name, bx + 38, iy + 4);
    if (S.pickedItem === id) { g.strokeStyle = '#f8a800'; g.strokeRect(bx + 10, iy - 2, bw - 20, 20); }
  });
  text('tap an item to use it on things · ENTER closes', bx + bw / 2, by + bh - 12, '#AA00AA', FONT, 'center');
}

function drawStatusBar() {
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, SCENE_TOP);
  text(` Score: ${S.score}/${MAXSCORE}  $${S.cash}`, 2, 1);
  text(room().name, W / 2 + 14, 1, '#000', FONT, 'center');
  text(isMuted() ? 'OFF ' : '♪ ', W - 2, 1, '#000', FONT, 'right');
}

function drawInputLine() {
  g.fillStyle = '#000'; g.fillRect(0, SCENE_BOT + 1, W, H - SCENE_BOT - 1);
  const cursor = (frame >> 4) % 2 ? '_' : ' ';
  let shown = S.typed;
  g.font = FONT;
  while (g.measureText('>' + shown + '_').width > W - 8 && shown.length) shown = shown.slice(1);
  const hintTxt = S.pickedItem ? `[${ITEMS[S.pickedItem].names[0]} in hand — tap a target]` : '';
  text('>' + shown + cursor, 3, SCENE_BOT + 3, '#AAAAAA');
  if (hintTxt) text(hintTxt, W - 3, SCENE_BOT + 3, '#f8a800', FONT, 'right');
}

function drawTitle() {
  g.fillStyle = '#0a0a1e'; g.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 50; i++) {
    const sx = (i * 97) % W, sy = (i * 53) % 70;
    g.fillStyle = (i + (frame >> 4)) % 7 ? '#666688' : '#ffffff';
    g.fillRect(sx, sy, 1, 1);
  }
  // city skyline
  g.fillStyle = '#14142a';
  const bl = [[0, 120, 40, 60], [36, 96, 30, 84], [62, 130, 26, 50], [86, 84, 34, 96], [118, 110, 28, 70],
    [144, 70, 36, 110], [178, 104, 26, 76], [202, 90, 32, 90], [232, 122, 26, 58], [256, 100, 34, 80], [288, 128, 32, 52]];
  for (const [bx, by, bw, bh] of bl) g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#f0d888';
  for (let i = 0; i < 60; i++) {
    const b = bl[i % bl.length];
    const wx = b[0] + 4 + (i * 37) % (b[2] - 8), wy = b[1] + 5 + (i * 23) % (b[3] - 10);
    if ((i * 7 + (frame >> 6)) % 3) g.fillRect(wx, wy, 2, 2);
  }
  g.fillStyle = '#101020'; g.fillRect(0, 180, W, 20);

  // neon title
  const flick = (frame >> 3) % 24 !== 0;
  text('LEISURE SUIT', W / 2, 34, flick ? '#FF55FF' : '#663366', 'bold 24px monospace', 'center');
  text('MOORE', W / 2, 58, flick ? '#55FFFF' : '#336666', 'bold 30px monospace', 'center');
  text('~ Looking for Love in Neon City ~', W / 2, 96, '#FFFF55', 'bold 10px monospace', 'center');
  if ((frame >> 5) % 2) text('PRESS ENTER OR TAP TO BEGIN', W / 2, 150, '#55FF55', FONT, 'center');
  text('arrows walk · type commands · M mute', W / 2, 168, '#8888aa', FONT, 'center');
  text('suggested attire: polyester', W / 2, 188, '#556', FONT, 'center');
}

function drawQuiz() {
  g.fillStyle = '#0a0a1e'; g.fillRect(0, 0, W, H);
  text('— ADULTHOOD VERIFICATION —', W / 2, 16, '#FF55FF', 'bold 12px monospace', 'center');
  text('To proceed you must prove you are a', W / 2, 36, '#AAAAAA', FONT, 'center');
  text('SOPHISTICATED ADULT of DISCERNING TASTE', W / 2, 46, '#AAAAAA', FONT, 'center');
  const Q = QUIZ[S.quiz.i];
  const qlines = wrap(Q.q, 270, 'bold 10px monospace');
  qlines.forEach((ln, i) => text(ln, W / 2, 68 + i * 12, '#FFFF55', 'bold 10px monospace', 'center'));
  const oy = 68 + qlines.length * 12 + 10;
  Q.a.forEach((a, i) => {
    const yy = oy + i * 18;
    g.fillStyle = '#181830'; g.fillRect(30, yy - 3, 260, 15);
    g.strokeStyle = '#333366'; g.strokeRect(30.5, yy - 2.5, 259, 14);
    text(`${i + 1}. ${a}`, 38, yy, '#FFFFFF');
  });
  if (S.quiz.flash) {
    const fl = wrap(S.quiz.flash, 270);
    fl.forEach((ln, i) => text(ln, W / 2, oy + 60 + i * 10, '#FF5555', FONT, 'center'));
  }
  text(`question ${S.quiz.i + 1} of ${QUIZ.length} · press 1-3 or tap`, W / 2, 186, '#556', FONT, 'center');
}

function answerQuiz(n) {
  const Q = QUIZ[S.quiz.i];
  if (n < 0 || n >= Q.a.length) return;
  if (n === Q.correct) {
    sfx.award();
    S.quiz.flash = '';
    S.quiz.i++;
    if (S.quiz.i >= QUIZ.length) {
      S.mode = 'play';
      sfx.fanfare();
      introText();
    }
  } else {
    sfx.buzz();
    S.quiz.flash = Q.snark;
  }
}

function quizOptionAt(y) {
  const Q = QUIZ[S.quiz.i];
  const qlines = wrap(Q.q, 270, 'bold 10px monospace');
  const oy = 68 + qlines.length * 12 + 10;
  for (let i = 0; i < Q.a.length; i++) {
    const yy = oy + i * 18;
    if (y >= yy - 4 && y <= yy + 13) return i;
  }
  return -1;
}

function drawDead() {
  g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, W, H);
  const lines = wrap(S.deathText, 240);
  const bh = lines.length * 10 + 52;
  const bx = 32, by = 90 - bh / 2, bw = 256;
  g.fillStyle = '#000'; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#AA00AA'; g.lineWidth = 2; g.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
  text('* YOU HAVE DIED *', bx + bw / 2, by + 8, '#FF5555', 'bold 10px monospace', 'center');
  lines.forEach((ln, i) => text(ln, bx + 10, by + 24 + i * 10, '#AAAAAA'));
  text(`(Deaths so far: ${S.deaths})`, bx + bw / 2, by + bh - 24, '#555555', FONT, 'center');
  if ((frame >> 5) % 2) text('PRESS ENTER TO TRY AGAIN', bx + bw / 2, by + bh - 12, '#55FF55', FONT, 'center');
}

function drawWon() {
  g.fillStyle = '#1c1c4e'; g.fillRect(0, 0, W, 60);
  g.fillStyle = '#8a3a6a'; g.fillRect(0, 60, W, 30);
  g.fillStyle = '#c85858'; g.fillRect(0, 90, W, 25);
  g.fillStyle = '#e8904a'; g.fillRect(0, 115, W, 85);
  // floating hearts
  for (let i = 0; i < 10; i++) {
    const hy = (200 - ((frame * (0.4 + (i % 3) * 0.2) + i * 41) % 220)) | 0;
    const hx = (i * 33 + Math.sin((frame + i * 30) / 22) * 10) % W;
    drawHeart(hx, hy, ['#FF5555', '#FF55FF', '#FFFF55'][i % 3]);
  }
  text('TRUE LOVE!', W / 2, 44, '#FFFF55', 'bold 22px monospace', 'center');
  text('(and the suit survived)', W / 2, 70, '#FFFFFF', 'bold 10px monospace', 'center');
  text(`Final score: ${S.score} of ${MAXSCORE}`, W / 2, 100, '#fff', FONT, 'center');
  text(`Cash remaining: $${S.cash}`, W / 2, 112, '#fff', FONT, 'center');
  text(`Deaths along the way: ${S.deaths}${S.deaths === 0 ? ' — smooth operator!' : ''}`, W / 2, 124, '#fff', FONT, 'center');
  text('Earl sends his regards. So does the cat.', W / 2, 144, '#7a3a2a', FONT, 'center');
  if ((frame >> 5) % 2) text('PRESS ENTER TO PLAY AGAIN', W / 2, 168, '#204020', FONT, 'center');
}

function render() {
  g.clearRect(0, 0, W, H);
  if (S.mode === 'title') { drawTitle(); return; }
  if (S.mode === 'quiz') { drawQuiz(); return; }
  if (S.mode === 'won') { drawWon(); return; }

  const r = room();
  r.draw(g, frame, game);

  // y-sorted drawables: npcs, hero
  const drawables = (r.actors ? r.actors(game, frame) : []).slice();
  drawables.push({ y: S.hero.y, draw: () => drawHero() });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw(g);

  drawCutsceneFx();
  drawStatusBar();
  drawInputLine();
  drawDialog();
  drawInventory();
  if (S.mode === 'dead') drawDead();
}

// ------------------------------------------------------------------ input ----

function beginQuiz() {
  startMusic();
  S = freshState();
  S.mode = 'quiz';
}

function pressEnter() {
  if (S.mode === 'title') return beginQuiz();
  if (S.mode === 'won') { S = freshState(); return; }
  if (S.mode === 'dead') {
    S.mode = 'play';
    S.msgs = [];
    const p = clampToWalk(room(), S.lastSafe.x, S.lastSafe.y);
    S.hero.x = p.x; S.hero.y = p.y;
    S.hero.tx = S.hero.ty = null;
    return;
  }
  if (S.mode === 'quiz') return;
  if (S.msgs.length) { S.msgs.shift(); sfx.blip(); return; }
  if (S.invOpen) { S.invOpen = false; return; }
  if (S.typed.trim()) { const t = S.typed; S.typed = ''; execute(t); }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); pressEnter(); return; }
  if (S.mode === 'quiz') {
    if (['1', '2', '3'].includes(e.key)) answerQuiz(+e.key - 1);
    return;
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    if (S.mode === 'play' && !S.msgs.length && !S.invOpen) held.add(e.key);
    return;
  }
  if (e.key === 'Escape') { S.invOpen = false; S.pickedItem = null; S.typed = ''; return; }
  if (e.key === 'Backspace') { e.preventDefault(); S.typed = S.typed.slice(0, -1); return; }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // M mutes when the command line is empty; otherwise it types
    if ((e.key === 'm' || e.key === 'M') && !S.typed) { toggleMute(); return; }
    if (S.mode === 'play' && S.msgs.length === 0) S.typed += e.key.toLowerCase();
    else if (S.msgs.length && e.key === ' ') pressEnter();
  }
});
window.addEventListener('keyup', (e) => held.delete(e.key));
window.addEventListener('blur', () => held.clear());

// verb buttons (touch)
document.querySelectorAll('.vbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.verb;
    if (v === 'bag') {
      if (S.mode === 'play' && !S.msgs.length) S.invOpen = !S.invOpen;
      return;
    }
    verbMode = v;
    S.pickedItem = null;
    document.querySelectorAll('.vbtn').forEach(b => b.classList.toggle('on', b.dataset.verb === v));
  });
});

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) / rect.width * W;
  const cy = (e.clientY - rect.top) / rect.height * H;
  return { x: cx, y: cy };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  if (S.mode === 'quiz') {
    const opt = quizOptionAt(p.y);
    if (opt >= 0) answerQuiz(opt);
    return;
  }
  if (S.mode !== 'play') { pressEnter(); return; }
  if (S.msgs.length) { pressEnter(); return; }

  if (S.invOpen) {
    // pick an item from the bag
    const bx = 40, by = 30, bw = 240;
    let hit = null;
    S.inv.forEach((id, i) => {
      const iy = by + 34 + i * 18;
      if (p.x >= bx && p.x <= bx + bw && p.y >= iy - 2 && p.y <= iy + 16) hit = id;
    });
    if (hit) { S.pickedItem = hit; S.invOpen = false; sfx.blip(); }
    else S.invOpen = false;
    return;
  }
  if (S.cutscene) return;

  // find a hotspot under the tap
  let target = null;
  for (const hs of room().hotspots || []) {
    const r = hotspotRect(hs);
    if (!r) continue;
    if (p.x >= r.x - 4 && p.x <= r.x + r.w + 4 && p.y >= r.y - 4 && p.y <= r.y + r.h + 4) { target = hs; break; }
  }

  if (S.pickedItem) {
    const item = S.pickedItem;
    S.pickedItem = null;
    if (target) return actOnHotspot(target, 'give', item);
    return game.say('There\'s nothing there to use it on.');
  }

  if (verbMode === 'walk' || !target) {
    if (verbMode !== 'walk' && !target) { sfx.buzz(); return game.say('You see nothing special there.'); }
    const spot = clampToWalk(room(), p.x, Math.max(p.y, walkBounds().minY + 2));
    S.hero.tx = spot.x; S.hero.ty = spot.y;
    S.pending = null;
    return;
  }
  const verb = verbMode === 'do'
    ? (target.smart && target.smart !== 'talk' && target.smart !== 'look'
      ? target.smart
      : (target.verbs.take ? 'take' : target.smart || 'look'))
    : verbMode;
  actOnHotspot(target, verb === 'enter' ? 'enter' : verb);
}, { passive: false });

// ------------------------------------------------------------------- loop ----

function fit() {
  const vw = window.innerWidth - 8, vh = window.innerHeight - 96;
  const scale = Math.max(1, Math.min(vw / W, vh / H));
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', fit);
fit();

let last = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (!last) last = ts;
  acc += Math.min(100, ts - last);
  last = ts;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  render();
}
requestAnimationFrame(loop);

// ------------------------------------------------------------- dev hooks ----

window.__game = () => S;
window.__do = (t) => { execute(t); };
window.__tick = (n = 1) => { for (let i = 0; i < n; i++) step(); render(); };
window.__enter = pressEnter;
window.__answer = (n) => answerQuiz(n);
window.__teleport = (roomId, x = 160, y = 170) => { switchRoom(roomId, x, y); };
window.__held = held;
