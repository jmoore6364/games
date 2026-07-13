// King's Quest: The Crown of Moore — a Sierra-style adventure in vanilla JS.

import { SPR } from './sprites.js';
import { ROOMS, ITEMS, AWARDS, MAXSCORE, SCENE_TOP, SCENE_BOT, clampToWalk } from './world.js';
import { parse, nounMatch } from './parser.js';
import { sfx, startMusic, toggleMute, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;
const W = 320, H = 200;
const FONT = '8px monospace';
const SAVE_KEY = 'kings-quest-save';

// ------------------------------------------------------------------ state ----

function freshState() {
  return {
    mode: 'title',            // title | play | dead | won
    room: 'throne',
    hero: { x: 160, y: 170, dir: 'down', step: 0, tx: null, ty: null },
    f: {},                    // world flags
    inv: [],
    score: 0,
    awarded: [],
    deaths: 0,
    msgs: [],                 // dialog page queue
    typed: '',
    pending: null,            // { hs, verb, item } to run on arrival
    cutscene: null,           // { type, t }
    lastSafe: { x: 160, y: 170 },
    deathText: '',
    trail: [],                // hero position history, for the goat
    goatPos: null,
    pendingWin: false,
    invOpen: false,
    pickedItem: null,         // item selected from the bag (touch flow)
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
  sfx,
  say(...pages) { S.msgs.push(...pages); },
  has(id) { return S.inv.includes(id); },
  give(id) { if (!S.inv.includes(id)) { S.inv.push(id); sfx.pickup(); } },
  remove(id) { S.inv = S.inv.filter(i => i !== id); },
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
    S.pendingWin = true;
    game.say(
      'You kneel and raise the Crown of Moore. The hall erupts — guards cheering, banners waving, '
      + 'somewhere a goat bleating (how did it get in here?).',
      'King Edmund settles the crown upon his brow and rests a hand on your shoulder. '
      + '"Sir Jason of Moore — dragon-drencher, troll-tamer, friend of goats — I name you HEIR TO THE THRONE."',
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
    S.cutscene = { type, t: 0, gx: S.goatPos ? S.goatPos.x : S.hero.x - 20, gy: S.goatPos ? S.goatPos.y : S.hero.y };
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
  S.trail = [];
  if (S.f.goatFollowing) S.goatPos = { x: p.x - 18, y: p.y };
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

  // doors
  for (const d of (room().doors || [])) {
    const r = d.rect;
    if (h.x >= r.x && h.x <= r.x + r.w && h.y >= r.y && h.y <= r.y + r.h) {
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

// ---------------------------------------------------------------- goat pal ----

function updateGoat() {
  if (!S.f.goatFollowing) { S.goatPos = null; return; }
  S.trail.push({ x: S.hero.x, y: S.hero.y });
  if (S.trail.length > 26) S.trail.shift();
  const target = S.trail[0];
  if (!S.goatPos) S.goatPos = { x: S.hero.x - 18, y: S.hero.y };
  const gp = S.goatPos;
  const d = Math.hypot(target.x - gp.x, target.y - gp.y);
  if (d > 20) {
    gp.x += (target.x - gp.x) * 0.08;
    gp.y += (target.y - gp.y) * 0.08;
  }
}

// --------------------------------------------------------------- cutscenes ----

function updateCutscene() {
  const cs = S.cutscene;
  if (!cs) return;
  cs.t++;
  if (cs.type === 'goatCharge') {
    if (cs.t === 30) sfx.bleat();
    if (cs.t === 62) sfx.roar();
    if (cs.t === 110) sfx.splash();
    if (cs.t >= 150) {
      S.cutscene = null;
      S.f.trollGone = true;
      S.f.goatFollowing = false;
      S.f.goatAtBridge = true;
      S.goatPos = null;
      game.award('troll');
      game.say(
        'The goat\'s ears snap forward. Before you can speak it is a white blur across the planks — '
        + 'WHUMP — and the troll, arms windmilling, topples backward into the gorge.',
        'A distant splash. A furious, fading "TOOOLLLL..." The goat trots to the far bank and begins '
        + 'grazing beside its new bridge. The way east is clear!',
      );
    }
  } else if (cs.type === 'dragonWake') {
    if (cs.t === 8) sfx.roar();
    if (cs.t >= 55) {
      S.cutscene = null;
      game.die('The dragon\'s eye snaps fully open. There is a sound like a furnace clearing its throat, '
        + 'a flash of orange — and Sir Jason briefly holds the kingdom record for best-done knight.');
    }
  } else if (cs.type === 'dragonDouse') {
    if (cs.t === 10) sfx.splash();
    if (cs.t === 30) sfx.steam();
    if (cs.t === 70) sfx.roar();
    if (cs.t >= 170) {
      S.cutscene = null;
      S.f.dragonGone = true;
      S.f.bucketFull = false;
      game.award('douse');
      game.say(
        'You hurl the water in a glittering arc. It catches the dragon square on the snout — the flames '
        + 'go out with a HISS and a great gout of steam.',
        'The dragon\'s eyes go wide. It pats frantically at its nose, produces only smoke, and lets out a '
        + 'mortified squeak. With one tremendous wingbeat it flees the cave, thoroughly extinguished.',
        'And there, atop the mound, sits the Crown of Moore.',
      );
    }
  }
}

function drawCutsceneFx() {
  const cs = S.cutscene;
  if (!cs) return;
  if (cs.type === 'goatCharge') {
    // the goat sprints for the troll
    const k = Math.min(1, cs.t / 60);
    const gx = cs.gx + (188 - cs.gx) * k;
    const gy = cs.gy + (150 - cs.gy) * k;
    const bob = (frame >> 2) % 2;
    g.drawImage(SPR.goatR[bob], gx | 0, (gy - 10) | 0);
  } else if (cs.type === 'dragonWake') {
    // fire jet from the snout toward the hero
    const k = Math.min(1, cs.t / 40);
    const sx = 216, sy = 110;
    const ex = sx + (S.hero.x - sx) * k, ey = sy + (S.hero.y - 8 - sy) * k;
    for (let i = 0; i < 14; i++) {
      const p = i / 14;
      const fx = sx + (ex - sx) * p + Math.sin(frame / 2 + i) * 2;
      const fy = sy + (ey - sy) * p;
      g.fillStyle = i % 3 === 0 ? '#FFFF55' : (i % 3 === 1 ? '#FF5555' : '#f07818');
      const r = 2 + p * 5;
      g.fillRect(fx - r / 2, fy - r / 2, r, r);
    }
  } else if (cs.type === 'dragonDouse') {
    if (cs.t < 30) {
      // water arc from the hero to the snout
      const k = cs.t / 30;
      for (let i = 0; i < 10; i++) {
        const p = Math.max(0, Math.min(1, k * 1.6 - i * 0.06));
        const fx = S.hero.x + (222 - S.hero.x) * p;
        const fy = (S.hero.y - 14) + (108 - (S.hero.y - 14)) * p - Math.sin(p * Math.PI) * 26;
        g.fillStyle = i % 2 ? '#5555FF' : '#55FFFF';
        g.fillRect(fx, fy, 3, 3);
      }
    } else if (cs.t < 110) {
      // steam
      for (let i = 0; i < 8; i++) {
        const a = (cs.t - 30 + i * 9) % 80;
        g.fillStyle = `rgba(255,255,255,${Math.max(0, 0.7 - a / 80)})`;
        const px = 210 + (i * 13) % 40 + Math.sin((cs.t + i * 20) / 9) * 4;
        g.beginPath(); g.arc(px, 116 - a * 0.7, 3 + a / 12, 0, 7); g.fill();
      }
    }
  }
}

// ------------------------------------------------------------ command exec ----

const ITEM_LOOK = {
  carrot: 'A crisp royal carrot. Irresistible, if you happen to be a goat.',
  mushroom: 'Red, speckled, and radiating bad intentions. Absolutely not a snack.',
  bucket: 'A sound wooden bucket.',
  crown: 'The Crown of Moore: heavy gold, older than the kingdom, and finally headed home.',
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
    look: 'You see nothing special.',
    take: 'You can\'t take that.',
    talk: 'It has nothing to say.',
    open: 'It doesn\'t open.',
    close: 'It doesn\'t close.',
    use: 'Nothing happens.',
    eat: 'You\'re not THAT hungry.',
    drink: 'There\'s nothing to drink.',
    climb: 'You can\'t climb that.',
    kill: 'Violence is rarely the answer, and never the FIRST answer.',
    give: 'They don\'t want it.',
    cross: 'There\'s nothing to cross here.',
    enter: 'You can\'t go in there.',
    fill: 'There\'s no water here.',
    throwv: 'Best not to throw that around.',
    smell: 'Smells like adventure.',
    pet: 'It does not wish to be petted.',
    read: 'There\'s nothing to read.',
    ring: 'There\'s nothing to ring.',
    swim: 'There\'s no water deep enough here. Count your blessings.',
  };
  game.say(M[verb] || 'Nothing happens.');
}

function helpText() {
  if (!S.f.questGiven) return 'Try TALK TO KING. He looks like a man with a problem.';
  if (!S.f.carrotTaken && !S.f.goatFollowing && !S.f.trollGone)
    return 'The castle courtyard grows lovely vegetables. Goats have strong opinions about vegetables.';
  if (!S.f.goatFollowing && !S.f.trollGone)
    return 'The goat in the meadow looks bribable. GIVE CARROT TO GOAT, perhaps?';
  if (!S.f.trollGone)
    return 'Bring your new four-legged friend to the bridge and watch what happens.';
  if (!S.f.bucketTaken)
    return 'Something useful glints on the lake shore, south of the meadow.';
  if (!S.f.bucketFull)
    return 'An empty bucket is only half a plan. The well or the lake can finish it.';
  if (!S.f.dragonGone)
    return 'The owl said it best: douse the dragon\'s flame. Get within range and THROW WATER AT DRAGON.';
  if (!S.f.crownTaken) return 'The crown sits unguarded in the cave. TAKE CROWN.';
  if (S.inv.includes('crown')) return 'The king awaits his crown. GIVE CROWN TO KING.';
  return 'You\'ve done it all. Enjoy the coronation.';
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      f: S.f, inv: S.inv, score: S.score, awarded: S.awarded,
      deaths: S.deaths, room: S.room, x: S.hero.x, y: S.hero.y,
    }));
    game.say('Game saved. (Type RESTORE to return to this moment.)');
  } catch { game.say('The royal scribe is out to lunch — save failed.'); }
}

function restoreGame() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* fall through */ }
  if (!d) return game.say('There is no saved game.');
  S = freshState();
  S.mode = 'play';
  S.f = d.f; S.inv = d.inv; S.score = d.score; S.awarded = d.awarded;
  S.deaths = d.deaths; S.room = d.room;
  S.hero.x = d.x; S.hero.y = d.y;
  S.lastSafe = { x: d.x, y: d.y };
  game.say('Game restored.');
}

function execute(text) {
  if (S.mode !== 'play') return;
  const cmd = parse(text);
  if (!cmd) return;
  const { verb, noun, noun2 } = cmd;

  if (!verb) { sfx.buzz(); return game.say(`You don't know how to "${cmd.raw.split(' ')[0]}".`); }

  // meta verbs
  switch (verb) {
    case 'inv': {
      S.invOpen = true;
      return;
    }
    case 'help': return game.say(helpText());
    case 'score': return game.say(`You have ${S.score} of ${MAXSCORE} points, and have died ${S.deaths} time${S.deaths === 1 ? '' : 's'}.`);
    case 'save': return saveGame();
    case 'restore': return restoreGame();
    case 'restart': { S = freshState(); S.mode = 'play'; introText(); return; }
    case 'mute': { const m = toggleMute(); return game.say(m ? 'Sound off.' : 'Sound on.'); }
    case 'quit': return game.say('You can\'t quit — you\'re the HEIR (presumptive). Close the tab if you must.');
    case 'jump': return game.say('You hop in place. Your armor jingles judgmentally.');
    case 'dance': return game.say('You perform the Daventry Shuffle. Somewhere, a minstrel weeps.');
    case 'pray': return game.say('A distant voice whispers: "Have you tried giving the goat a carrot?"');
    case 'xyzzy': return game.say('A hollow voice says, "Wrong genre, but nice try."');
  }

  // "throw water", "pour bucket on dragon", "use bucket on dragon", "douse dragon"
  const waterish = (n) => n && (n.includes('water') || n.includes('bucket') || n.includes('pail'));
  const dragonish = (n) => n && n.includes('dragon');
  if ((verb === 'throwv' && (waterish(noun) || !noun || dragonish(noun)))
      || (verb === 'use' && waterish(noun) && dragonish(noun2))
      || (verb === 'give' && waterish(noun) && dragonish(noun2))) {
    if (!game.has('bucket')) return game.say('You have no water to throw. Or a bucket, for that matter.');
    if (!S.f.bucketFull) return game.say('The bucket is empty. Wells and lakes exist for this exact reason.');
    if (S.room === 'cave' && !S.f.dragonGone) {
      game.startCutscene('dragonDouse');
      return;
    }
    if (S.room === 'cave') return game.say('The flames are already out. Save the encore.');
    S.f.bucketFull = false;
    return game.say('You pour the water out on the ground. The grass is grateful; the dragon, unbothered.');
  }

  // "fill bucket" routes to whatever watersource is in the room
  if (verb === 'fill') {
    for (const hs of room().hotspots || []) {
      if (hs.verbs.fill && hotspotRect(hs)) return actOnHotspot(hs, 'fill');
    }
    return game.say('There\'s no water here.');
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
      // "feed goat" style: giving with only a target named
      const hs = findHotspot(noun);
      if (hs) return game.say(`Give what to the ${noun}?`);
      return game.say(`Give the ${ITEMS[item].names[0]} to whom?`);
    }
    if (!target) return game.say(`You don't see any ${noun2} here.`);
    return actOnHotspot(target, 'give', item);
  }
  // "feed goat" / "show carrot"
  if (verb === 'give' && !noun) return game.say('Give what?');

  // use ITEM on TARGET
  if (verb === 'use' && noun && noun2) {
    const item = findInvItem(noun);
    const target = findHotspot(noun2);
    if (item && target) return actOnHotspot(target, 'use', item);
  }

  // eat/drink inventory items
  if (verb === 'eat' && noun) {
    const item = findInvItem(noun);
    if (item === 'mushroom') {
      return game.die('You nibble the toadstool. It tastes like burning pennies, then like nothing at all, '
        + 'then the forest floor rushes up to catch you. The warning colors were not decorative.');
    }
    if (item === 'carrot') return game.say('You could — but you have a strong feeling a certain goat would hold a grudge.');
    if (item) return game.say('You cannot eat that.');
  }
  if (verb === 'drink' && noun && noun.includes('water')) {
    if (S.f.bucketFull) return game.say('You take a long cold drink from the bucket. Plenty left.');
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
    if (['self', 'me', 'jason', 'myself', 'sir jason'].includes(noun)) {
      if (verb === 'look') return game.say('Sir Jason of Moore: good boots, better intentions, best hair in the province.');
      return game.say('Best not.');
    }
    sfx.buzz();
    return game.say(`You don't see any ${noun} here.`);
  }

  // bare verbs
  if (verb === 'look') return game.say(room().desc);
  if (verb === 'talk') {
    // talk to the nearest talkable thing
    let best = null, bd = 1e9;
    for (const hs of room().hotspots || []) {
      const r = hotspotRect(hs);
      if (!r || !hs.verbs.talk) continue;
      const d = distToRect(S.hero.x, S.hero.y, r);
      if (d < bd) { bd = d; best = hs; }
    }
    if (best && bd < 80) return actOnHotspot(best, 'talk');
    return game.say('You strike up a conversation with the scenery. It goes poorly.');
  }
  if (verb === 'swim') return defaultVerbMsg('swim');
  return game.say(`${verb === 'take' ? 'Take' : 'Do that to'} what?`);
}

function introText() {
  game.say(
    'THE CROWN OF MOORE — In the small green kingdom of Moore, on a morning that smelled of rain '
    + 'and baking bread, a dragon crashed through the throne room window and made off with the royal crown.',
    'You are SIR JASON, newest and (currently) only knight of the realm. The king is waiting. '
    + '(Walk with the ARROW KEYS or by tapping. Type things like LOOK, TALK TO KING, TAKE BUCKET. '
    + 'Type HELP if you\'re stuck.)',
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
  updateGoat();

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
  const set = SPR.hero[h.dir] || SPR.hero.down;
  const f = h.step === 0 ? 0 : 1 + ((h.step >> 3) % 2);
  const img = set[f];
  g.drawImage(img, (h.x - img.width / 2) | 0, (h.y - img.height) | 0);
}

function drawGoatFollower() {
  if (!S.goatPos || S.cutscene) return;
  const gp = S.goatPos;
  const facingRight = S.hero.x >= gp.x;
  const set = facingRight ? SPR.goatR : SPR.goat;
  const bob = (frame >> 4) % 2;
  return { y: gp.y, draw: (gg) => gg.drawImage(set[bob], (gp.x - 8) | 0, (gp.y - 11) | 0) };
}

function drawDialog() {
  if (!S.msgs.length) return;
  const msg = S.msgs[0];
  const lines = wrap(msg, 248);
  const bh = lines.length * 10 + 24;
  const bx = 28, by = Math.max(SCENE_TOP + 8, 92 - bh / 2), bw = 264;
  g.fillStyle = '#fff'; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#AA0000'; g.lineWidth = 2; g.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
  lines.forEach((ln, i) => text(ln, bx + 8, by + 8 + i * 10));
  text(S.msgs.length > 1 ? '· MORE ·' : '· ENTER ·', bx + bw / 2, by + bh - 10, '#AA0000', FONT, 'center');
}

function drawInventory() {
  if (!S.invOpen) return;
  const bx = 40, by = 30, bw = 240, bh = 130;
  g.fillStyle = '#fff'; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#AA0000'; g.lineWidth = 2; g.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
  text('— YOU ARE CARRYING —', bx + bw / 2, by + 8, '#000', FONT, 'center');
  if (!S.inv.length) text('absolutely nothing', bx + bw / 2, by + 40, '#555', FONT, 'center');
  S.inv.forEach((id, i) => {
    const iy = by + 24 + i * 20;
    const icon = ITEMS[id].icon(game);
    g.drawImage(icon, bx + 14, iy, 16, 16);
    text(ITEMS[id].name + (id === 'bucket' ? (S.f.bucketFull ? ' (full of water)' : ' (empty)') : ''), bx + 38, iy + 4);
    if (S.pickedItem === id) { g.strokeStyle = '#f8a800'; g.strokeRect(bx + 10, iy - 2, bw - 20, 20); }
  });
  text('tap an item to use it on things · ENTER closes', bx + bw / 2, by + bh - 12, '#AA0000', FONT, 'center');
}

function drawStatusBar() {
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, SCENE_TOP);
  text(` Score: ${S.score} of ${MAXSCORE}`, 2, 1);
  text(room().name, W / 2, 1, '#000', FONT, 'center');
  text(isMuted() ? 'Sound: OFF ' : 'Sound: on ', W - 2, 1, '#000', FONT, 'right');
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
  g.fillStyle = '#000018'; g.fillRect(0, 0, W, H);
  // night sky + stars
  for (let i = 0; i < 60; i++) {
    const sx = (i * 97) % W, sy = (i * 53) % 90;
    g.fillStyle = (i + (frame >> 4)) % 7 ? '#8888aa' : '#ffffff';
    g.fillRect(sx, sy, 1, 1);
  }
  // moon
  g.fillStyle = '#ffffcc'; g.beginPath(); g.arc(262, 34, 14, 0, 7); g.fill();
  g.fillStyle = '#000018'; g.beginPath(); g.arc(256, 30, 12, 0, 7); g.fill();
  // castle silhouette
  g.fillStyle = '#101040';
  g.fillRect(0, 120, W, 80);
  g.fillRect(90, 78, 140, 60);
  g.fillRect(76, 64, 26, 74); g.fillRect(218, 64, 26, 74);
  g.fillRect(72, 56, 34, 8); g.fillRect(214, 56, 34, 8);
  g.fillRect(150, 52, 20, 86); g.fillRect(146, 44, 28, 8);
  for (let x = 92; x < 228; x += 14) g.fillRect(x, 70, 8, 8);
  // lit window
  g.fillStyle = '#ffd800'; g.fillRect(157, 62, 6, 9);

  text("KING'S QUEST", W / 2, 96, '#ffd800', 'bold 22px monospace', 'center');
  text('~ The Crown of Moore ~', W / 2, 122, '#ffffff', 'bold 10px monospace', 'center');
  if ((frame >> 5) % 2) text('PRESS ENTER OR TAP TO BEGIN', W / 2, 156, '#55FF55', FONT, 'center');
  text('arrows walk · type commands · M mute', W / 2, 176, '#8888aa', FONT, 'center');
}

function drawDead() {
  g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(0, 0, W, H);
  const lines = wrap(S.deathText, 240);
  const bh = lines.length * 10 + 52;
  const bx = 32, by = 90 - bh / 2, bw = 256;
  g.fillStyle = '#000'; g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#AA0000'; g.lineWidth = 2; g.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
  text('* YOU HAVE DIED *', bx + bw / 2, by + 8, '#FF5555', 'bold 10px monospace', 'center');
  lines.forEach((ln, i) => text(ln, bx + 10, by + 24 + i * 10, '#AAAAAA'));
  text(`(Deaths so far: ${S.deaths})`, bx + bw / 2, by + bh - 24, '#555555', FONT, 'center');
  if ((frame >> 5) % 2) text('PRESS ENTER TO TRY AGAIN', bx + bw / 2, by + bh - 12, '#55FF55', FONT, 'center');
}

function drawWon() {
  g.fillStyle = '#000030'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const sx = (i * 83) % W, sy = (i * 61) % H;
    g.fillStyle = ['#ffd800', '#FF5555', '#55FF55', '#55FFFF'][(i + (frame >> 3)) % 4];
    g.fillRect(sx, sy, 2, 2);
  }
  g.save();
  g.translate(W / 2 - 20, 30);
  g.scale(4, 4);
  g.drawImage(SPR.crown, 0, 0);
  g.restore();
  text('LONG LIVE SIR JASON,', W / 2, 78, '#ffd800', 'bold 14px monospace', 'center');
  text('HEIR OF MOORE!', W / 2, 94, '#ffd800', 'bold 14px monospace', 'center');
  text(`Final score: ${S.score} of ${MAXSCORE}`, W / 2, 122, '#fff', FONT, 'center');
  text(`Deaths along the way: ${S.deaths}${S.deaths === 0 ? ' — flawless!' : ''}`, W / 2, 134, '#fff', FONT, 'center');
  text('The goat sends its regards.', W / 2, 152, '#8888aa', FONT, 'center');
  if ((frame >> 5) % 2) text('PRESS ENTER TO PLAY AGAIN', W / 2, 172, '#55FF55', FONT, 'center');
}

function render() {
  g.clearRect(0, 0, W, H);
  if (S.mode === 'title') { drawTitle(); return; }
  if (S.mode === 'won') { drawWon(); return; }

  const r = room();
  r.draw(g, frame, game);

  // y-sorted drawables: npcs, goat, hero
  const drawables = (r.actors ? r.actors(game, frame) : []).slice();
  const goat = drawGoatFollower();
  if (goat && S.room !== 'bridge') drawables.push(goat);
  if (goat && S.room === 'bridge' && !S.cutscene) drawables.push(goat);
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

function beginGame() {
  startMusic();
  sfx.fanfare();
  S = freshState();
  S.mode = 'play';
  introText();
}

function pressEnter() {
  if (S.mode === 'title') return beginGame();
  if (S.mode === 'won') { S = freshState(); return; }
  if (S.mode === 'dead') {
    S.mode = 'play';
    S.msgs = [];
    const p = clampToWalk(room(), S.lastSafe.x, S.lastSafe.y);
    S.hero.x = p.x; S.hero.y = p.y;
    S.hero.tx = S.hero.ty = null;
    S.f.trollTries = 0;
    return;
  }
  if (S.msgs.length) { S.msgs.shift(); sfx.blip(); return; }
  if (S.invOpen) { S.invOpen = false; return; }
  if (S.typed.trim()) { const t = S.typed; S.typed = ''; execute(t); }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); pressEnter(); return; }
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
  if (S.mode !== 'play') { pressEnter(); return; }
  if (S.msgs.length) { pressEnter(); return; }

  if (S.invOpen) {
    // pick an item from the bag
    const bx = 40, by = 30, bw = 240;
    let hit = null;
    S.inv.forEach((id, i) => {
      const iy = by + 24 + i * 20;
      if (p.x >= bx && p.x <= bx + bw && p.y >= iy - 2 && p.y <= iy + 18) hit = id;
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
  const verb = verbMode === 'do' ? (target.smart && target.smart !== 'talk' && target.smart !== 'look' ? target.smart : (target.verbs.take ? 'take' : target.smart || 'look')) : verbMode;
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
window.__teleport = (roomId, x = 160, y = 170) => { switchRoom(roomId, x, y); };
window.__held = held;
