// The Secret of Moore Island — main loop and the SCUMM interface:
// verb grid, sentence line, inventory, floating talk text, dialogue choices,
// cutscene letterboxing, title screen, auto-save.

import { ROOMS, VIEW_W, VIEW_H, isWalkable, scaleAt, hotspotsAt } from './rooms.js';
import * as script from './script.js';
import { NPCS, ITEMS, VERBS, VERB_TEXT } from './script.js';
import { Actor, nearestWalkable } from './actors.js';
import { drawDude, drawIcon, CHARS } from './sprites.js';
import { playSong, stopMusic, playSfx, toggleMute, isMuted } from './audio.js';
import { initInput } from './input.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;
const W = 320, H = 200;
const FONT = '8px monospace';
const SAVE_KEY = 'moore-island-save';

// ------------------------------------------------------------- ui layout ----

const SENT_Y = 140, SENT_H = 12;
const PANEL_Y = 152;
const VERB_X = 2, VERB_W = 62, VERB_H = 15;
const INV_X = 193, INV_CW = 28, INV_CH = 23, INV_COLS = 4, INV_ROWS = 2;

// ------------------------------------------------------------------ state ----

let S = null;                 // script state
let mode = 'title';           // title | play | won
let hero = null;
let npcActors = [];
let lastRoom = null;
let selVerb = null;           // currently selected verb id
let pending = null;           // {verb, a} awaiting second object
let hover = null;             // {id, name, kind}
let mouse = { x: 160, y: 100 };
let speech = null;            // {who, text, timer, total, x, y, color}
let invScroll = 0;
let choiceScroll = 0;
let cut = null;               // active cutscene {id, step, timer}
let frame = 0;
let tNow = 0;
let toast = null;             // {text, timer}
let titleSel = 0;
let audioStarted = false;
let seagullTimer = 6;
let fireworks = [];
let creditsY = 0;
let lastTime = performance.now();

// ------------------------------------------------------------- cutscenes ----

const CUTS = {
  intro: {
    bg: 'card',
    steps: [
      { who: 'narrator', text: 'Deep in the Moore Sea lies Scurvy Reef: a town of pirates, one tavern, and until recently, quite a lot of grog.', d: 5 },
      { who: 'narrator', text: 'Last Tuesday, the ghost pirate CAPTAIN LeMOORE drank the island dry and stole the Governor\'s prize parrot on his way out.', d: 5.5 },
      { who: 'narrator', text: 'The Governor seeks a GHOST-HUNTER. Tonight, on a torchlit dock, a hopeful arrives...', d: 4.5 },
      { who: 'hero', text: 'I\'m Moorebrush Threepwood-Moore, and I want to be the Governor\'s ghost-hunter!', d: 4 },
    ],
  },
  vignette1: {
    bg: 'ghostship',
    steps: [
      { who: 'narrator', text: 'Meanwhile, aboard the ghost ship Rootless...', d: 3 },
      { who: 'lemoore', text: 'Two hundred years I waited, and now: EVERY drop of grog on Scurvy Reef is MINE!', d: 4.5 },
      { who: 'ghost1', text: 'And the parrot, boss. You also took a parrot.', d: 3.5 },
      { who: 'lemoore', text: 'The parrot was a POWER MOVE, Gerald.', d: 3.5 },
      { who: 'percy', text: 'AWK. Weak branding. AWK.', d: 3 },
    ],
  },
  sail: {
    bg: 'sailing',
    steps: [
      { who: 'narrator', text: 'The Leaky Moorehen puts to sea, leaking with purpose...', d: 4 },
      { who: 'hero', text: 'Adventure! Salt air! Mild structural concerns!', d: 3.5 },
    ],
  },
  vignette2: {
    bg: 'ghostship',
    steps: [
      { who: 'narrator', text: 'Meanwhile, aboard the Rootless...', d: 2.6 },
      { who: 'lemoore', text: 'My compass! Someone TOOK my spectral compass! I feel it in my beard!', d: 4 },
      { who: 'ghost2', text: 'The root-beer-smelling kid, boss. He\'s coming here next.', d: 3.5 },
      { who: 'lemoore', text: 'Good. GOOD. I haven\'t insulted anyone to death all century.', d: 4 },
    ],
  },
  confront: { bg: null, steps: [] },
  ending: { bg: null, steps: [] },
};

const CREDITS = [
  'THE SECRET OF MOORE ISLAND',
  '',
  'starring',
  'Moorebrush Threepwood-Moore',
  '',
  'with',
  'Captain LeMoore as The Ghost',
  'Percy as Himself',
  'Stan S. Stanmoore as Stan S. Stanmoore',
  '(no other actor would take the part)',
  '',
  'insults choreographed by',
  'Moira, Swordmistress of Scurvy Reef',
  '',
  'catering by',
  'the Vegetarian Cannibals of Broccoli Cove',
  '"we cooked what you would have eaten"',
  '',
  'grog restored: 100%',
  'parrots rescued: 1',
  'dairy farmers insulted: 0 (a first)',
  '',
  'THE END',
  '',
  'click to return to the title',
];

// ------------------------------------------------------------ persistence ----

function save() {
  if (!S || S.won) return;
  try {
    S.x = hero ? hero.x : S.x;
    S.y = hero ? hero.y : S.y;
    localStorage.setItem(SAVE_KEY, script.serialize(S));
  } catch { }
}

function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }

function startGame(fromSave) {
  S = fromSave && hasSave() ? script.restore(localStorage.getItem(SAVE_KEY)) : script.newGame();
  hero = new Actor('moorebrush', S.x, S.y, S.face || 'r');
  lastRoom = null;
  selVerb = null; pending = null; speech = null; cut = null;
  invScroll = 0;
  mode = 'play';
  if (!fromSave) S.cutscene = 'intro';
  syncRoom(true);
}

// --------------------------------------------------------------- helpers ----

function text(str, x, y, color = '#fff', font = FONT, align = 'left') {
  g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'top';
  g.fillText(str, x, y);
}

function outlined(str, x, y, color, font = FONT, align = 'center') {
  g.font = font; g.textAlign = align; g.textBaseline = 'top';
  g.fillStyle = '#000';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillText(str, x + dx, y + dy);
  g.fillStyle = color;
  g.fillText(str, x, y);
}

function wrap(str, maxW, font = FONT) {
  g.font = font;
  const words = String(str).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (g.measureText(trial).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = trial;
  }
  if (cur) lines.push(cur);
  return lines;
}

function startAudio() {
  if (!audioStarted) audioStarted = true;
  updateMusic();
}

const SONG_FOR = {
  dock: 'main', street: 'main', mansionExt: 'main', mansionInt: 'main',
  overlook: 'main', boatyard: 'main',
  tavern: 'tavern', store: 'tavern',
  voodoo: 'voodoo',
  shipDeck: 'map', map: 'map',
  jungle: 'jungle', hermit: 'jungle', village: 'jungle',
  grotto: 'ghost', ghostdeck: 'ghost', ghosthold: 'ghost',
};

function updateMusic() {
  if (!audioStarted) return;
  if (mode === 'title') { playSong('main'); return; }
  if (mode === 'won') { playSong('ending'); return; }
  playSong(SONG_FOR[S.room] || 'main');
}

// ------------------------------------------------------------- room sync ----

function syncRoom(force) {
  if (!force && S.room === lastRoom) return;
  lastRoom = S.room;
  hero.x = S.x; hero.y = S.y;
  hero.stop();
  pending = null; selVerb = null;
  rebuildActors();
  updateMusic();
}

function rebuildActors() {
  npcActors = [];
  const R = ROOMS[S.room];
  for (const a of (R.actors || [])) {
    if (a.if && !a.if(S)) continue;
    const act = new Actor(a.id, a.x, a.y, a.face || 'f');
    npcActors.push(act);
  }
}

// ----------------------------------------------------------- object query ----

function sceneObjectAt(x, y) {
  if (y >= VIEW_H) return null;
  // actors first (sorted nearest/frontmost)
  const acts = [...npcActors].sort((a, b) => b.y - a.y);
  for (const a of acts) {
    const b = a.bounds(S.room);
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return { id: a.id, name: NPCS[a.id] ? NPCS[a.id].name : a.id, kind: 'npc', actor: a };
    }
  }
  const hs = hotspotsAt(S.room, S);
  for (let i = hs.length - 1; i >= 0; i--) {
    const h = hs[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
      return { id: h.id, name: h.name, kind: 'hot', hot: h };
    }
  }
  return null;
}

function invItemAt(x, y) {
  if (x < INV_X || y < PANEL_Y) return null;
  const col = Math.floor((x - INV_X) / INV_CW);
  const row = Math.floor((y - PANEL_Y) / INV_CH);
  if (col < 0 || col >= INV_COLS || row < 0 || row >= INV_ROWS) return null;
  const idx = invScroll * INV_COLS + row * INV_COLS + col;
  const id = S.inv[idx];
  if (!id) return null;
  return { id, name: ITEMS[id].name, kind: 'item' };
}

function verbAt(x, y) {
  if (x < VERB_X || x > VERB_X + VERB_W * 3 || y < PANEL_Y) return null;
  const col = Math.floor((x - VERB_X) / VERB_W);
  const row = Math.floor((y - PANEL_Y) / VERB_H);
  if (col < 0 || col > 2 || row < 0 || row > 2) return null;
  return VERBS[row * 3 + col][0];
}

// -------------------------------------------------------------- sentence ----

function sentenceText() {
  if (pending) {
    const joiner = pending.verb === 'give' ? 'to' : 'with';
    const target = hover && hover.id !== pending.a ? ' ' + hover.name : '';
    return `${VERB_TEXT[pending.verb]} ${script.nameOf(S, pending.a)} ${joiner}${target}`;
  }
  const v = selVerb ? VERB_TEXT[selVerb] : 'Walk to';
  return hover ? `${v} ${hover.name}` : v;
}

// ------------------------------------------------------------ interaction ----

function consumeFx() {
  while (S.sfx.length) playSfx(S.sfx.shift());
}

function execute(verb, a, b) {
  script.doVerb(S, verb, a, b);
  consumeFx();
  selVerb = null; pending = null; choiceScroll = 0;
  syncRoom();
  rebuildActors();
  save();
}

function walkThen(wx, wy, fn) {
  const t = nearestWalkable(S.room, wx, wy);
  hero.walkTo(S.room, t.x, t.y, () => {
    S.x = hero.x; S.y = hero.y;
    if (fn) fn();
  });
}

function actOn(obj, verb) {
  // decide the walk target
  if (obj.kind === 'item') {
    if (verb === 'walkto') verb = 'lookat';
    execute(verb, obj.id, undefined);
    return;
  }
  const wx = obj.kind === 'npc' ? obj.actor.x + (hero.x < obj.actor.x ? -28 : 28) : (obj.hot.wx != null ? obj.hot.wx : hero.x);
  const wy = obj.kind === 'npc' ? obj.actor.y + 2 : (obj.hot.wy != null ? obj.hot.wy : hero.y);
  const needWalk = S.room !== 'map' && Math.hypot(hero.x - wx, hero.y - wy) > 14;
  const go = () => {
    if (obj.kind === 'npc' && npcActors.includes(obj.actor)) hero.face = obj.actor.x > hero.x ? 'r' : 'l';
    execute(verb, pending ? pending.a : obj.id, pending ? obj.id : undefined);
  };
  if (verb === 'lookat' || !needWalk) go();
  else walkThen(wx, wy, go);
}

function handleSceneClick(p, useDefault) {
  const obj = sceneObjectAt(p.x, p.y);
  if (!obj) {
    if (S.room === 'map') return;
    // plain walk
    pending = null;
    if (!selVerb || selVerb === 'walkto') selVerb = null;
    walkThen(p.x, p.y, null);
    return;
  }
  let verb = selVerb || 'walkto';
  if (useDefault) verb = script.defaultVerb(S, obj.id);
  if (pending) {
    if (obj.id === pending.a) { execute('use', pending.a, undefined); return; }
    actOn(obj, pending.verb);
    return;
  }
  if (verb === 'give') {
    if (obj.kind !== 'item') { execute('give', obj.id, undefined); return; }
    pending = { verb: 'give', a: obj.id };
    return;
  }
  if (verb === 'use' && obj.kind === 'item') {
    pending = { verb: 'use', a: obj.id };
    return;
  }
  if (verb === 'walkto' && obj.kind === 'hot' && !obj.hot.exit && obj.hot.def !== 'walk' && S.room !== 'map') {
    // walking to a non-exit hotspot: just walk there
    walkThen(obj.hot.wx != null ? obj.hot.wx : p.x, obj.hot.wy != null ? obj.hot.wy : p.y, null);
    return;
  }
  if (S.room === 'map' && (verb === 'walkto' || verb === 'open')) verb = 'use';
  actOn(obj, verb);
}

function handleInvClick(item, useDefault) {
  let verb = selVerb;
  if (useDefault) verb = script.defaultVerb(S, item.id);
  if (pending) {
    if (item.id === pending.a) { execute('use', pending.a, undefined); return; }
    execute(pending.verb, pending.a, item.id);
    return;
  }
  if (!verb) verb = 'lookat';
  if (verb === 'give') { pending = { verb: 'give', a: item.id }; return; }
  if (verb === 'use') { pending = { verb: 'use', a: item.id }; return; }
  if (verb === 'walkto') verb = 'lookat';
  execute(verb, item.id, undefined);
}

// --------------------------------------------------------------- speech ----

function advanceSpeech() {
  speech = null;
}

function flushSpeech() {
  speech = null;
  S.queue.length = 0;
}

function updateSpeech(dt) {
  if (speech) {
    speech.timer -= dt;
    if (speech.timer <= 0) speech = null;
  }
  if (!speech && S.queue.length) {
    const { who, text: txt } = S.queue.shift();
    const dur = Math.max(1.6, Math.min(7, 0.9 + txt.length * 0.055));
    speech = { who, text: txt, timer: dur, total: dur };
    if (who !== 'narrator') playSfx('blip');
  }
  // talking flags
  hero.talking = !!speech && speech.who === 'hero';
  for (const a of npcActors) a.talking = !!speech && speech.who === a.id;
}

// ----------------------------------------------------------------- input ----

initInput(canvas, {
  move(p) { mouse = p; },
  click(p, alt) {
    startAudio();
    if (mode === 'title') { titleClick(p); return; }
    if (mode === 'won') { wonClick(); return; }
    if (cut) { cutAdvance(); return; }
    if (speech) { advanceSpeech(); return; }
    if (S.dialog) { dialogClick(p); return; }
    if (p.y >= PANEL_Y) {
      const v = verbAt(p.x, p.y);
      if (v) { selVerb = v; pending = null; playSfx('blip'); return; }
      const arrow = invArrowAt(p.x, p.y);
      if (arrow) { invScroll = Math.max(0, Math.min(maxInvScroll(), invScroll + arrow)); return; }
      const item = invItemAt(p.x, p.y);
      if (item) { handleInvClick(item, alt); return; }
      return;
    }
    if (p.y < VIEW_H) handleSceneClick(p, alt);
  },
  key(k) {
    startAudio();
    if (k === 'm') { const m = toggleMute(); toast = { text: m ? 'sound off' : 'sound on', timer: 1.4 }; return; }
    if (k === 'f5') { toast = { text: 'no need — the game auto-saves', timer: 2 }; return; }
    if (mode === 'title') {
      if (k === 'ArrowUp' || k === 'ArrowDown') titleSel = hasSave() ? 1 - titleSel : 0;
      if (k === 'Enter' || k === ' ') titleStart();
      return;
    }
    if (mode === 'won') { if (k === 'Escape' || k === 'Enter') wonClick(); return; }
    if (k === 'Escape') {
      if (cut) { cutEnd(); return; }
      if (speech || S.queue.length) { flushSpeech(); return; }
      if (pending) { pending = null; selVerb = null; return; }
      return;
    }
    if (cut) { cutAdvance(); return; }
    if (speech) { advanceSpeech(); return; }
    if (S.dialog) {
      const n = parseInt(k, 10);
      if (n >= 1 && n <= 9) {
        const idx = choiceScroll + n - 1;
        if (idx < S.dialog.choices.length) pickChoice(idx);
      }
      return;
    }
    const kv = { q: 0, w: 1, e: 2, a: 3, s: 4, d: 5, z: 6, x: 7, c: 8 };
    if (k in kv) { selVerb = VERBS[kv[k]][0]; pending = null; playSfx('blip'); }
  },
});

function invArrowAt(x, y) {
  if (x < INV_X + INV_COLS * INV_CW || x > W - 2) return 0;
  if (y >= PANEL_Y && y < PANEL_Y + INV_CH) return -1;
  if (y >= PANEL_Y + INV_CH && y < PANEL_Y + INV_CH * 2) return 1;
  return 0;
}

function maxInvScroll() {
  return Math.max(0, Math.ceil(S.inv.length / INV_COLS) - INV_ROWS);
}

// --------------------------------------------------------------- dialogs ----

function dialogChoiceRects() {
  const rects = [];
  const n = Math.min(4, S.dialog.choices.length - choiceScroll);
  for (let i = 0; i < n; i++) {
    rects.push({ idx: choiceScroll + i, x: 6, y: SENT_Y + 4 + i * 11, w: W - 24, h: 11 });
  }
  return rects;
}

function dialogClick(p) {
  if (p.y < SENT_Y) return;
  // scroll arrows
  if (p.x > W - 14) {
    if (p.y < SENT_Y + 30) choiceScroll = Math.max(0, choiceScroll - 1);
    else choiceScroll = Math.min(Math.max(0, S.dialog.choices.length - 4), choiceScroll + 1);
    return;
  }
  for (const r of dialogChoiceRects()) {
    if (p.x >= r.x && p.y >= r.y && p.y < r.y + r.h) { pickChoice(r.idx); return; }
  }
}

function pickChoice(idx) {
  choiceScroll = 0;
  script.choose(S, idx);
  consumeFx();
  syncRoom();
  rebuildActors();
  save();
}

// -------------------------------------------------------------- cutscene ----

function checkCutscene() {
  if (S.cutscene && !cut) {
    const id = S.cutscene;
    S.cutscene = null;
    if (id === 'ending') { startEnding(); return; }
    if (id === 'confront') { return; } // speech lines carry it
    cut = { id, step: 0, timer: CUTS[id].steps[0] ? CUTS[id].steps[0].d : 0 };
    if (id === 'sail') playSfx('wave');
  }
}

function cutAdvance() {
  if (!cut) return;
  cut.step++;
  const steps = CUTS[cut.id].steps;
  if (cut.step >= steps.length) cutEnd();
  else cut.timer = steps[cut.step].d;
}

function cutEnd() { cut = null; save(); }

function updateCut(dt) {
  if (!cut) return;
  cut.timer -= dt;
  if (cut.timer <= 0) cutAdvance();
}

// ---------------------------------------------------------------- ending ----

function startEnding() {
  mode = 'won';
  creditsY = H + 10;
  fireworks = [];
  flushSpeech();
  try { localStorage.removeItem(SAVE_KEY); } catch { }
  updateMusic();
}

function wonClick() {
  mode = 'title';
  titleSel = 0;
  updateMusic();
}

function updateEnding(dt) {
  creditsY -= dt * 9;
  if (Math.random() < dt * 0.8) {
    fireworks.push({
      x: 30 + Math.random() * 260, y: 20 + Math.random() * 50,
      t: 0, hue: ['#ff9a3c', '#7fa8e0', '#8ae078', '#e07fe0', '#ffd27a'][Math.floor(Math.random() * 5)],
    });
    if (audioStarted && Math.random() < 0.6) playSfx('firework');
  }
  fireworks = fireworks.filter(f => (f.t += dt) < 1.4);
}

// ----------------------------------------------------------------- title ----

function titleRects() {
  const r = [{ id: 'new', x: W / 2 - 50, y: 150, w: 100, h: 13 }];
  if (hasSave()) r.push({ id: 'cont', x: W / 2 - 50, y: 165, w: 100, h: 13 });
  return r;
}

function titleClick(p) {
  const rs = titleRects();
  for (let i = 0; i < rs.length; i++) {
    if (p.x >= rs[i].x && p.x <= rs[i].x + rs[i].w && p.y >= rs[i].y && p.y <= rs[i].y + rs[i].h) {
      titleSel = i;
      titleStart();
      return;
    }
  }
}

function titleStart() {
  const rs = titleRects();
  const sel = rs[Math.min(titleSel, rs.length - 1)];
  startGame(sel.id === 'cont');
}

// ------------------------------------------------------------------ update ----

function update(dt) {
  tNow += dt;
  frame++;
  if (toast) { toast.timer -= dt; if (toast.timer <= 0) toast = null; }
  if (mode === 'title') return;
  if (mode === 'won') { updateEnding(dt); return; }
  syncRoom();
  checkCutscene();
  updateCut(dt);
  updateSpeech(dt);
  consumeFx();
  hero.update(dt, S.room);
  S.x = hero.x; S.y = hero.y; S.face = hero.face;
  for (const a of npcActors) a.update(dt, S.room);
  // ambient
  if (S.room === 'dock') {
    seagullTimer -= dt;
    if (seagullTimer <= 0) { seagullTimer = 7 + Math.random() * 9; if (audioStarted) playSfx('seagull'); }
  }
  if (S.won && !S.cutscene && mode === 'play' && !cut && !speech && !S.queue.length) startEnding();
}

// ------------------------------------------------------------------ render ----

function drawScene() {
  const R = ROOMS[S.room];
  g.save();
  g.beginPath(); g.rect(0, 0, W, VIEW_H); g.clip();
  R.paint(g, S, tNow);
  // draw actors + hero sorted by y
  const all = [...npcActors, hero].sort((a, b) => a.y - b.y);
  if (S.room !== 'map') {
    for (const a of all) {
      if (a === hero && ROOMS[S.room].noActor) continue;
      a.draw(g, S.room, tNow, {
        wave: a.id === 'stan' && !a.talking,
        hat: a === hero && S.flags.wearingHat ? 'plume' : null,
      });
      if (a !== hero && a.id === 'percy' && S.room === 'ghosthold') { /* percy sits in cage */ }
    }
  }
  // hover highlight name handled in sentence line
  g.restore();
}

function drawSpeech() {
  if (!speech) return;
  const color = (NPCS[speech.who] || NPCS.narrator).color;
  let x = W / 2, y = 8;
  const who = speech.who;
  if (who === 'hero') { x = hero.x; y = hero.y - hero.height(S.room) - 4; }
  else {
    const a = npcActors.find(n => n.id === who);
    if (a) { x = a.x; y = a.y - a.height(S.room) - 4; }
    else if (who !== 'narrator') { x = W / 2; y = 12; }
  }
  const lines = wrap(speech.text, 220);
  y -= (lines.length - 1) * 9;
  if (y < 4) y = 4;
  for (let i = 0; i < lines.length; i++) {
    const lx = Math.max(60, Math.min(W - 60, x));
    outlined(lines[i], lx, y + i * 9, color, FONT, 'center');
  }
}

function drawSentence() {
  g.fillStyle = '#0a0a12';
  g.fillRect(0, SENT_Y, W, SENT_H);
  const s = sentenceText();
  text(s, W / 2, SENT_Y + 2, pending || selVerb ? '#ffd27a' : '#9aa4c8', FONT, 'center');
  g.textAlign = 'left';
}

function drawVerbs() {
  g.fillStyle = '#101020';
  g.fillRect(0, PANEL_Y, W, H - PANEL_Y);
  g.fillStyle = '#232340';
  g.fillRect(0, PANEL_Y - 1, W, 1);
  const KEYS = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C'];
  for (let i = 0; i < 9; i++) {
    const col = i % 3, row = (i / 3) | 0;
    const x = VERB_X + col * VERB_W, y = PANEL_Y + 1 + row * VERB_H;
    const id = VERBS[i][0];
    const hovered = mouse.x >= x && mouse.x < x + VERB_W - 2 && mouse.y >= y && mouse.y < y + VERB_H - 1;
    const active = selVerb === id || (pending && pending.verb === id);
    g.fillStyle = active ? '#3a3a68' : hovered ? '#26264a' : '#191932';
    g.fillRect(x, y, VERB_W - 2, VERB_H - 1);
    text(VERBS[i][1], x + 4, y + 4, active ? '#ffd27a' : hovered ? '#d8e0ff' : '#8a94c0');
    text(KEYS[i], x + VERB_W - 10, y + 4, '#3c4470', '7px monospace');
  }
}

function drawInventory() {
  for (let row = 0; row < INV_ROWS; row++) {
    for (let col = 0; col < INV_COLS; col++) {
      const x = INV_X + col * INV_CW, y = PANEL_Y + 1 + row * INV_CH;
      g.fillStyle = '#191926';
      g.fillRect(x, y, INV_CW - 2, INV_CH - 2);
      const idx = invScroll * INV_COLS + row * INV_COLS + col;
      const id = S.inv[idx];
      if (id) {
        const hovered = hover && hover.kind === 'item' && hover.id === id;
        if (hovered) { g.fillStyle = '#2a2a4e'; g.fillRect(x, y, INV_CW - 2, INV_CH - 2); }
        if (pending && pending.a === id) { g.strokeStyle = '#ffd27a'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, INV_CW - 3, INV_CH - 3); }
        g.save();
        g.translate(x + (INV_CW - 2 - 16) / 2, y + (INV_CH - 2 - 16) / 2);
        drawIcon(g, id, 0, 0);
        g.restore();
      }
    }
  }
  // scroll arrows
  const ax = INV_X + INV_COLS * INV_CW + 2;
  const canUp = invScroll > 0, canDown = invScroll < maxInvScroll();
  g.fillStyle = canUp ? '#8a94c0' : '#2c2c48';
  g.beginPath(); g.moveTo(ax + 6, PANEL_Y + 6); g.lineTo(ax + 1, PANEL_Y + 15); g.lineTo(ax + 11, PANEL_Y + 15); g.fill();
  g.fillStyle = canDown ? '#8a94c0' : '#2c2c48';
  g.beginPath(); g.moveTo(ax + 6, PANEL_Y + INV_CH * 2 - 5); g.lineTo(ax + 1, PANEL_Y + INV_CH * 2 - 14); g.lineTo(ax + 11, PANEL_Y + INV_CH * 2 - 14); g.fill();
}

function drawDialog() {
  g.fillStyle = '#080810';
  g.fillRect(0, SENT_Y, W, H - SENT_Y);
  g.fillStyle = '#232340'; g.fillRect(0, SENT_Y, W, 1);
  const d = S.dialog;
  const rects = dialogChoiceRects();
  for (const r of rects) {
    const hovered = mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h;
    const str = `${r.idx + 1}. ${d.choices[r.idx]}`;
    const font = str.length > 62 ? '7px monospace' : FONT;
    text(str, r.x, r.y + 2, hovered ? '#ffd27a' : '#b8c0e0', font);
  }
  if (d.choices.length > 4) {
    const canUp = choiceScroll > 0, canDown = choiceScroll < d.choices.length - 4;
    g.fillStyle = canUp ? '#8a94c0' : '#2c2c48';
    g.beginPath(); g.moveTo(W - 8, SENT_Y + 8); g.lineTo(W - 12, SENT_Y + 14); g.lineTo(W - 4, SENT_Y + 14); g.fill();
    g.fillStyle = canDown ? '#8a94c0' : '#2c2c48';
    g.beginPath(); g.moveTo(W - 8, H - 6); g.lineTo(W - 12, H - 12); g.lineTo(W - 4, H - 12); g.fill();
  }
}

function drawDuelStatus() {
  if (!S.duel) return;
  const d = S.duel;
  const target = d.foe === 'lemoore' ? 4 : 3;
  const label = (n, c) => { let s = ''; for (let i = 0; i < target; i++) s += i < n ? '■' : '□'; return s; };
  outlined(`YOU ${label(d.me)}   ${label(d.them)} FOE`, W / 2, VIEW_H - 12, '#ffd27a', FONT, 'center');
}

function drawCursor() {
  if (mode !== 'play') return;
  const { x, y } = mouse;
  g.fillStyle = hover ? '#ffd27a' : '#e8e8f8';
  g.fillRect(x - 4, y - 0.5, 3, 1); g.fillRect(x + 2, y - 0.5, 3, 1);
  g.fillRect(x - 0.5, y - 4, 1, 3); g.fillRect(x - 0.5, y + 2, 1, 3);
  g.fillRect(x - 0.5, y - 0.5, 1, 1);
}

function drawCut() {
  const c = CUTS[cut.id];
  // background
  if (c.bg === 'card') {
    g.fillStyle = '#04060f'; g.fillRect(0, 0, W, H);
    ROOMS.dock.paint(g, S, tNow);
    g.fillStyle = 'rgba(2,4,10,0.72)'; g.fillRect(0, 0, W, VIEW_H);
  } else if (c.bg === 'ghostship') {
    g.fillStyle = '#020408'; g.fillRect(0, 0, W, H);
    ROOMS.ghostdeck.paint(g, null, tNow);
    // big LeMoore center-stage
    g.save();
    g.translate(160, 124); g.scale(1.25, 1.25);
    drawDude(g, 'lemoore', { face: 'f', t: tNow, talk: cutSpeaker() === 'lemoore' });
    g.restore();
    g.save();
    g.translate(70, 116);
    drawDude(g, 'ghost1', { face: 'r', t: tNow, talk: cutSpeaker() === 'ghost1' });
    g.restore();
    g.save();
    g.translate(250, 118); g.scale(-1, 1);
    drawDude(g, 'ghost2', { face: 'r', t: tNow, talk: cutSpeaker() === 'ghost2' });
    g.restore();
  } else if (c.bg === 'sailing') {
    g.fillStyle = '#050914'; g.fillRect(0, 0, W, H);
    ROOMS.map.paint(g, S, tNow);
  } else {
    drawScene();
  }
  // letterbox
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, 16);
  g.fillRect(0, VIEW_H - 4, W, H - VIEW_H + 4);
  const step = c.steps[cut.step];
  if (step) {
    const color = (NPCS[step.who] || NPCS.narrator).color;
    const lines = wrap(step.text, 280);
    for (let i = 0; i < lines.length; i++) {
      outlined(lines[i], W / 2, VIEW_H + 8 + i * 10, color, FONT, 'center');
    }
  }
  text('click to continue · Esc to skip', W - 4, H - 9, '#3c4470', '7px monospace', 'right');
  g.textAlign = 'left';
}

function cutSpeaker() {
  if (!cut) return null;
  const st = CUTS[cut.id].steps[cut.step];
  return st ? st.who : null;
}

function drawTitle() {
  g.fillStyle = '#04060f'; g.fillRect(0, 0, W, H);
  // the reference night dock, full-bleed
  ROOMS.dock.paint(g, null, tNow);
  g.fillStyle = 'rgba(3,5,12,0.45)'; g.fillRect(0, 0, W, VIEW_H);
  g.fillStyle = '#04060f'; g.fillRect(0, VIEW_H, W, H - VIEW_H);
  // twinkle
  outlined('The Secret of', W / 2, 30, '#c8d0f0', 'bold 12px monospace', 'center');
  outlined('MOORE ISLAND', W / 2, 44, '#ffd27a', 'bold 21px monospace', 'center');
  outlined('a nautical adventure in insults', W / 2, 68, '#8a94b8', FONT, 'center');
  const rs = titleRects();
  const labels = { new: 'NEW GAME', cont: 'CONTINUE' };
  rs.forEach((r, i) => {
    const hov = mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
    if (hov) titleSel = i;
    const on = titleSel === i;
    outlined(`${on ? '▸ ' : ''}${labels[r.id]}${on ? ' ◂' : ''}`, W / 2, r.y + 2, on ? '#ffd27a' : '#9aa4c8', FONT, 'center');
  });
  text('right-click / double-click = smart verb · M mute · Esc skips', W / 2, 186, '#3c4470', '7px monospace', 'center');
  g.textAlign = 'left';
}

function drawEnding() {
  g.fillStyle = '#04060f'; g.fillRect(0, 0, W, H);
  ROOMS.dock.paint(g, S, tNow);
  // fireworks over the harbor
  for (const f of fireworks) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = f.t * 34;
      const fade = Math.max(0, 1 - f.t / 1.3);
      g.globalAlpha = fade;
      g.fillStyle = f.hue;
      g.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.8 + f.t * f.t * 12, 2, 2);
    }
  }
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(2,4,10,0.35)'; g.fillRect(0, 0, W, H);
  // celebrating silhouettes on the pier
  g.save(); g.translate(70, 128); drawDude(g, 'moorebrush', { face: 'f', t: tNow, hat: 'plume' }); g.restore();
  g.save(); g.translate(110, 126); drawDude(g, 'governor', { face: 'f', t: tNow }); g.restore();
  g.save(); g.translate(145, 130); drawDude(g, 'mistress', { face: 'f', t: tNow }); g.restore();
  g.save(); g.translate(185, 128); drawDude(g, 'stan', { face: 'f', t: tNow, wave: true }); g.restore();
  // credits
  for (let i = 0; i < CREDITS.length; i++) {
    const y = creditsY + i * 12;
    if (y < -10 || y > H + 10) continue;
    const line = CREDITS[i];
    const big = i === 0 || line === 'THE END';
    outlined(line, W / 2, y, big ? '#ffd27a' : '#c8d0f0', big ? 'bold 10px monospace' : FONT, 'center');
  }
  if (creditsY + CREDITS.length * 12 < 60) creditsY = H + 10;
  g.textAlign = 'left';
}

function render() {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (mode === 'title') { drawTitle(); drawCursor2(); return; }
  if (mode === 'won') { drawEnding(); drawCursor2(); return; }
  if (cut) { drawCut(); drawCursor2(); return; }
  drawScene();
  drawDuelStatus();
  drawSpeech();
  if (S.dialog && !speech) {
    drawDialog();
  } else {
    drawSentence();
    drawVerbs();
    drawInventory();
  }
  if (toast) outlined(toast.text, W / 2, VIEW_H - 24, '#ffd27a', FONT, 'center');
  drawCursor();
  g.textAlign = 'left';
}

function drawCursor2() {
  const { x, y } = mouse;
  g.fillStyle = '#e8e8f8';
  g.fillRect(x - 4, y - 0.5, 3, 1); g.fillRect(x + 2, y - 0.5, 3, 1);
  g.fillRect(x - 0.5, y - 4, 1, 3); g.fillRect(x - 0.5, y + 2, 1, 3);
}

// -------------------------------------------------------------- main loop ----

function tick(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  // hover query each frame
  if (mode === 'play' && S && !cut && !S.dialog) {
    hover = mouse.y < VIEW_H ? sceneObjectAt(mouse.x, mouse.y) : invItemAt(mouse.x, mouse.y);
  } else hover = null;
  if (S) update(dt);
  else update(dt);
  render();
  requestAnimationFrame(tick);
}

// fit canvas to window (integer-ish scaling, pixelated)
function fit() {
  const vw = window.innerWidth - 8, vh = window.innerHeight - 30;
  const scale = Math.max(1, Math.min(vw / W, vh / H));
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', fit);
fit();

requestAnimationFrame(tick);

// tiny debug/testing handle (used by the headless browser verification)
window.MI = {
  get S() { return S; },
  get mode() { return mode; },
  get speech() { return speech ? speech.text : null; },
  get cut() { return cut ? cut.id : null; },
  sentence: () => (S && !S.dialog ? sentenceText() : ''),
  go(room, x, y) { if (S) { script.travel(S, room, x, y); S.sfx.length = 0; } },
};
