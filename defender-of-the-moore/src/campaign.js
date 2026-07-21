// Defender of the Moore — the strategy layer.
// Territories, adjacency, economy, rival AI, turn resolution, events, save.
// Fully headless (no DOM) so it runs under Node for tests.

// ---------------- factions ----------------
// index 0 is always the human player's house at newGame time (heraldry chosen).
export const FACTIONS = [
  { key: 'moore', name: 'House Moore', lord: 'Lord Moore', adj: 'Moore',
    color: '#3468c8', dark: '#1c3c88', light: '#5c90e0', charge: 'lion', motto: 'Hold the Moor' },
  { key: 'blackthorn', name: 'House Blackthorn', lord: 'Lord Corvin', adj: 'Blackthorn',
    color: '#c03038', dark: '#801c22', light: '#e06068', charge: 'raven', motto: 'Blood and Thorn' },
  { key: 'ashenvale', name: 'House Ashenvale', lord: 'Lord Gethin', adj: 'Ashenvale',
    color: '#d0a028', dark: '#8a6810', light: '#eec860', charge: 'boar', motto: 'By Root and Ash' },
  { key: 'grimwald', name: 'House Grimwald', lord: 'Lord Ulric', adj: 'Grimwald',
    color: '#8848a8', dark: '#582470', light: '#b078d0', charge: 'wolf', motto: 'The Wolf Waits' },
];

// player may pick one of these heraldic identities for house Moore
export const HERALDRY = [
  { charge: 'lion', color: '#3468c8', dark: '#1c3c88', light: '#5c90e0', name: 'Azure Lion' },
  { charge: 'stag', color: '#2c8c54', dark: '#175a34', light: '#54c080', name: 'Verdant Stag' },
  { charge: 'sword', color: '#b02840', dark: '#741828', light: '#e05c74', name: 'Crimson Sword' },
];

export const DIFFS = [
  { name: 'Squire', startGold: 90, startArmy: 14, aiGrow: 0.85, aiAggr: 0.35, tax: 1.15 },
  { name: 'Knight', startGold: 70, startArmy: 12, aiGrow: 1.0, aiAggr: 0.5, tax: 1.0 },
  { name: 'Baron', startGold: 55, startArmy: 10, aiGrow: 1.15, aiAggr: 0.68, tax: 0.9 },
];

export const SOLDIER_COST = 4;     // gold per soldier mustered
export const MUSTER_BATCH = 10;    // soldiers per muster action
export const CATAPULT_COST = 120;  // gold per catapult

// ---------------- the realm map ----------------
// Twelve territories laid out on the campaign map (positions in canvas px,
// map area roughly x:16..304 y:34..196). owner0 = initial owner faction index.
const TERRITORIES = [
  { id: 0, name: 'Moorhaven',     x: 48,  y: 58,  castle: true,  income: 12, owner0: 0 },
  { id: 1, name: 'Thornwood',     x: 120, y: 48,  castle: false, income: 8,  owner0: 2 },
  { id: 2, name: 'Greymoor',      x: 196, y: 54,  castle: true,  income: 11, owner0: 2 },
  { id: 3, name: 'Ashford',       x: 272, y: 60,  castle: true,  income: 12, owner0: 1 },
  { id: 4, name: 'Blackfen',      x: 44,  y: 116, castle: false, income: 7,  owner0: 0 },
  { id: 5, name: "Wyvern's Rest",  x: 128, y: 110, castle: true,  income: 11, owner0: 2 },
  { id: 6, name: 'Dunmoore',      x: 208, y: 114, castle: false, income: 9,  owner0: 3 },
  { id: 7, name: 'Ravenholt',     x: 284, y: 120, castle: true,  income: 12, owner0: 1 },
  { id: 8, name: 'Highcairn',     x: 60,  y: 176, castle: false, income: 8,  owner0: 0 },
  { id: 9, name: 'Fenwick',       x: 138, y: 172, castle: false, income: 9,  owner0: 3 },
  { id: 10, name: 'Stormgate',    x: 216, y: 170, castle: true,  income: 11, owner0: 3 },
  { id: 11, name: 'Eldermoor',    x: 286, y: 176, castle: false, income: 8,  owner0: 1 },
];

const ADJ = {
  0: [1, 4, 5],
  1: [0, 2, 5],
  2: [1, 3, 5, 6],
  3: [2, 6, 7],
  4: [0, 5, 8],
  5: [0, 1, 2, 4, 6, 9],
  6: [2, 3, 5, 7, 9, 10],
  7: [3, 6, 11],
  8: [4, 9],
  9: [5, 6, 8, 10],
  10: [6, 9, 11],
  11: [7, 10],
};

export function neighborsOf(id) { return ADJ[id]; }

// ---------------- deterministic RNG (state-carried) ----------------
export function rand(st) {
  st.rngS = (st.rngS + 0x6D2B79F5) | 0;
  let t = st.rngS;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randi(st, n) { return Math.floor(rand(st) * n); }

// ---------------- new game ----------------
export function newGame(opts = {}) {
  const diff = opts.diff ?? 1;
  const D = DIFFS[diff];
  const st = {
    rngS: (opts.seed ?? (Date.now() & 0x7fffffff)) | 0,
    diff,
    heraldry: opts.heraldry ?? 0,
    playerName: opts.name || 'Moore',
    turn: 1,
    renown: 0,
    terr: TERRITORIES.map((t) => ({
      id: t.id, owner: t.owner0, army: 0, castle: t.castle, income: t.income,
    })),
    // per-faction resources
    gold: [0, 0, 0, 0],
    catapults: [0, 0, 0, 0],
    alive: [true, true, true, true],
    log: [],
    eventsSeen: 0,
    over: null,           // 'win' | 'lose' | null
    maidenSaved: false,
  };
  // seed armies
  for (const t of st.terr) {
    const base = t.castle ? 12 : 9;
    t.army = base + randi(st, 5);
  }
  // player boosts
  st.gold[0] = D.startGold;
  for (let f = 1; f < 4; f++) st.gold[f] = Math.round(D.startGold * 0.7);
  // give the player's home territories a slightly stronger opening host
  for (const t of st.terr) {
    if (t.owner === 0) t.army += Math.round(D.startArmy / 3);
  }
  return st;
}

// ---------------- helpers ----------------
export function terrOf(st, id) { return st.terr[id]; }
export function ownedBy(st, faction) { return st.terr.filter((t) => t.owner === faction); }
export function totalArmy(st, faction) { return ownedBy(st, faction).reduce((s, t) => s + t.army, 0); }
export function totalIncome(st, faction) { return ownedBy(st, faction).reduce((s, t) => s + t.income, 0); }

// enemy territories adjacent to any territory owned by `faction`
export function attackableTargets(st, faction) {
  const out = new Set();
  for (const t of st.terr) {
    if (t.owner !== faction) continue;
    for (const n of ADJ[t.id]) {
      if (st.terr[n].owner !== faction) out.add(n);
    }
  }
  return [...out];
}

// owned territories adjacent to a given enemy territory (possible launch points)
export function launchPoints(st, faction, targetId) {
  return ADJ[targetId].filter((n) => st.terr[n].owner === faction);
}

export function canAttack(st, faction, fromId, toId) {
  const from = st.terr[fromId], to = st.terr[toId];
  if (!from || !to) return false;
  if (from.owner !== faction) return false;
  if (to.owner === faction) return false;
  if (!ADJ[fromId].includes(toId)) return false;
  if (from.army < 2) return false;              // need a host to march
  if (to.castle && st.catapults[faction] < 1) return false; // sieges need a catapult
  return true;
}

// ---------------- economy ----------------
export function collectIncome(st, faction) {
  if (!st.alive[faction]) return 0;
  const inc = totalIncome(st, faction);
  st.gold[faction] += inc;
  // free levy: each held territory raises a few fresh soldiers up to a cap
  for (const t of st.terr) {
    if (t.owner !== faction) continue;
    const cap = t.castle ? 55 : 40;
    const grow = t.castle ? 3 : 2;
    if (t.army < cap) t.army = Math.min(cap, t.army + grow);
  }
  return inc;
}

export function musterSoldiers(st, faction, terrId, batches = 1) {
  const t = st.terr[terrId];
  if (!t || t.owner !== faction) return 0;
  let added = 0;
  for (let i = 0; i < batches; i++) {
    const cost = MUSTER_BATCH * SOLDIER_COST;
    if (st.gold[faction] < cost) break;
    st.gold[faction] -= cost;
    t.army += MUSTER_BATCH;
    added += MUSTER_BATCH;
  }
  return added;
}

export function buyCatapult(st, faction) {
  if (st.gold[faction] < CATAPULT_COST) return false;
  st.gold[faction] -= CATAPULT_COST;
  st.catapults[faction] += 1;
  return true;
}

// ---------------- battle maths ----------------
// probability the attacker wins a straight clash (used for AI + auto-resolve).
export function battleOdds(atkArmy, defArmy, siegeBonus = 0) {
  const a = Math.pow(Math.max(1, atkArmy), 1.45);
  const d = Math.pow(Math.max(1, defArmy + siegeBonus), 1.45);
  return a / (a + d);
}

// auto-resolve a clash; returns {win, atkLosses, defLosses}
export function autoResolveBattle(st, atkArmy, defArmy, siegeBonus = 0) {
  const p = battleOdds(atkArmy, defArmy, siegeBonus);
  const win = rand(st) < p;
  // losses scale with the loser's disadvantage
  const atkLosses = win
    ? Math.round(defArmy * (0.35 + rand(st) * 0.35))
    : Math.round(atkArmy * (0.55 + rand(st) * 0.35));
  const defLosses = win
    ? Math.round(defArmy * (0.6 + rand(st) * 0.4))
    : Math.round(defArmy * (0.2 + rand(st) * 0.25));
  return { win, atkLosses: Math.min(atkArmy, atkLosses), defLosses: Math.min(defArmy, defLosses) };
}

// Apply the outcome of an attack from `fromId` onto `toId`.
// `win` decides who holds the ground; the mini-game (or auto-resolve) sets it.
// Leaves a rearguard behind and marches the survivors into a conquered land.
export function applyAttackResult(st, fromId, toId, win) {
  const from = st.terr[fromId], to = st.terr[toId];
  const faction = from.owner;
  const leave = Math.max(1, Math.floor(from.army * 0.25));
  const committed = Math.max(1, from.army - leave);
  const defArmy = to.army;

  if (win) {
    const losses = Math.min(committed - 1, Math.round(defArmy * (0.45 + 0.35 * (defArmy / (committed + defArmy)))));
    const survivors = Math.max(1, committed - losses);
    from.army = leave;
    to.owner = faction;
    to.army = survivors;
  } else {
    // repelled: heavy attacker losses, defender bloodied a little
    from.army = Math.max(1, from.army - Math.round(committed * 0.55));
    to.army = Math.max(1, to.army - Math.round(defArmy * 0.18));
  }
  refreshAlive(st);
  return win;
}

export function refreshAlive(st) {
  for (let f = 0; f < 4; f++) {
    st.alive[f] = st.terr.some((t) => t.owner === f);
  }
}

export function checkVictory(st) {
  refreshAlive(st);
  if (!st.alive[0]) { st.over = 'lose'; return 'lose'; }
  if (st.terr.every((t) => t.owner === 0)) { st.over = 'win'; return 'win'; }
  return null;
}

// ---------------- rival AI ----------------
// A rival collects income then takes ONE legal action. Returns a descriptor of
// what it did (for the on-map notification), including any attack on the player.
export function rivalTurn(st, faction) {
  if (!st.alive[faction]) return null;
  collectIncome(st, faction);
  const D = DIFFS[st.diff];
  const targets = attackableTargets(st, faction).map((id) => st.terr[id]);

  // Decide: attack a weak neighbour, or grow.
  // pick the best attack: adjacent enemy with lowest army relative to our launch point
  let best = null;
  for (const to of targets) {
    const launches = launchPoints(st, faction, to.id);
    for (const lp of launches) {
      const from = st.terr[lp];
      if (from.army < 3) continue;
      if (to.castle && st.catapults[faction] < 1) continue;
      const odds = battleOdds(from.army - Math.floor(from.army * 0.25), to.army, to.castle ? 5 : 0);
      // prefer attacking the human (faction 0) a little more
      const bias = to.owner === 0 ? D.aiAggr * 0.25 : 0;
      const score = odds + bias;
      if (!best || score > best.score) best = { from: lp, to: to.id, odds, score };
    }
  }

  const wantAttack = best && (best.odds > 0.5) && (rand(st) < D.aiAggr + best.odds * 0.3);

  // if a good attack exists and we're feeling aggressive, march
  if (wantAttack) {
    const to = st.terr[best.to];
    const from = st.terr[best.from];
    const committed = Math.max(1, from.army - Math.floor(from.army * 0.25));
    const res = autoResolveBattle(st, committed, to.army, to.castle ? 5 : 0);
    const defenderWasPlayer = to.owner === 0;
    const attackedName = to.id;
    applyAttackResult(st, best.from, best.to, res.win);
    return {
      kind: 'attack', faction, from: best.from, to: attackedName,
      win: res.win, vsPlayer: defenderWasPlayer,
    };
  }

  // otherwise grow: buy a catapult if we have none and can afford, else muster
  if (st.catapults[faction] < 1 && st.gold[faction] >= CATAPULT_COST && rand(st) < 0.4) {
    buyCatapult(st, faction);
    return { kind: 'catapult', faction };
  }
  // muster into the frontier territory nearest an enemy (strongest launch spot)
  const mine = ownedBy(st, faction).filter((t) => ADJ[t.id].some((n) => st.terr[n].owner !== faction));
  const spot = (mine.length ? mine : ownedBy(st, faction)).sort((a, b) => b.army - a.army)[0];
  if (spot) musterSoldiers(st, faction, spot.id, Math.max(1, Math.round(2 * D.aiGrow)));
  return { kind: 'muster', faction, terr: spot ? spot.id : -1 };
}

// run all three rivals; collect their notifications
export function runRivalTurns(st) {
  const news = [];
  for (let f = 1; f < 4; f++) {
    const n = rivalTurn(st, f);
    if (n) news.push(n);
    if (checkVictory(st)) break;
  }
  return news;
}

// ---------------- random events ----------------
// Returns an event descriptor or null. Auto events are already applied; the
// 'interactive' flag tells main.js to launch a mini-game and then call resolve.
export function rollEvent(st) {
  // ~45% chance of an event each round; not on turn 1
  if (st.turn < 2) return null;
  if (rand(st) > 0.45) return null;
  st.eventsSeen++;
  const roll = rand(st);
  const mine = ownedBy(st, 0);

  if (roll < 0.2) {
    // windfall
    const gold = 25 + randi(st, 40);
    st.gold[0] += gold;
    return { type: 'windfall', gold, title: 'A Bountiful Harvest',
      text: `The reeves bring word of a rich harvest across the moor. The treasury swells by ${gold} gold.` };
  }
  if (roll < 0.38) {
    // saxon raid — lose gold or army
    const t = mine[randi(st, mine.length)];
    const lost = Math.max(3, Math.round(t.army * 0.3));
    t.army = Math.max(1, t.army - lost);
    return { type: 'raid', terr: t.id, lost, title: 'A Saxon Raid!',
      text: `Sea-raiders fall upon your lands. ${lost} men are lost defending the marches.` };
  }
  if (roll < 0.52) {
    // plague
    const t = mine[randi(st, mine.length)];
    const lost = Math.max(2, Math.round(t.army * 0.35));
    t.army = Math.max(1, t.army - lost);
    return { type: 'plague', terr: t.id, lost, title: 'The Grey Sickness',
      text: `A pestilence creeps through the villages. The levy of one province withers by ${lost}.` };
  }
  if (roll < 0.72) {
    // tournament -> joust
    return { type: 'tournament', interactive: 'joust', title: 'A Tournament is Called',
      text: 'A neighbouring lord holds a tourney. Ride in the lists and take his purse — or his pride.',
      reward: { gold: 60, renown: 30 } };
  }
  if (roll < 0.88) {
    // maiden captured -> rescue raid
    return { type: 'maiden', interactive: 'raid', title: 'The Maiden is Taken!',
      text: 'Fair Lady Rowena is seized and held in a rival keep. Steal in by night and free her.',
      reward: { renown: 45, muster: 12 } };
  }
  // single-combat challenge -> duel
  return { type: 'challenge', interactive: 'duel', title: 'A Challenge of Honour',
    text: 'A rival champion throws down his gauntlet. Meet him blade to blade upon the field.',
    reward: { gold: 45, renown: 35 } };
}

// resolve an interactive event after its mini-game (won = true/false)
export function resolveEvent(st, ev, won) {
  if (!ev) return { text: '' };
  if (ev.type === 'tournament') {
    if (won) { st.gold[0] += ev.reward.gold; st.renown += ev.reward.renown;
      return { text: `You unhorse your rival to a roar from the crowd! +${ev.reward.gold} gold, +${ev.reward.renown} renown.` }; }
    return { text: 'You are thrown from the saddle. The crowd groans; you keep only your bruises.' };
  }
  if (ev.type === 'maiden') {
    if (won) {
      st.maidenSaved = true; st.renown += ev.reward.renown;
      // reinforce the home castle from grateful levies
      const home = ownedBy(st, 0).find((t) => t.castle) || ownedBy(st, 0)[0];
      if (home) home.army += ev.reward.muster;
      return { text: `Lady Rowena is freed and a marriage-alliance sworn! +${ev.reward.renown} renown, fresh levies rally to your banner.` };
    }
    return { text: 'The guards drive you off; the maiden remains a captive. Shame darkens your hall.' };
  }
  if (ev.type === 'challenge') {
    if (won) { st.gold[0] += ev.reward.gold; st.renown += ev.reward.renown;
      return { text: `Your blade prevails! The champion yields. +${ev.reward.gold} gold, +${ev.reward.renown} renown.` }; }
    return { text: 'The champion beats down your guard. You withdraw, wounded and shamed.' };
  }
  return { text: '' };
}

export function scoreOf(st) {
  const land = ownedBy(st, 0).length;
  return st.renown + land * 40 + st.gold[0] + totalArmy(st, 0) * 2 + st.turn;
}

// ---------------- save / load ----------------
export function serialize(st) {
  return JSON.stringify({
    v: 1, rngS: st.rngS, diff: st.diff, heraldry: st.heraldry, playerName: st.playerName,
    turn: st.turn, renown: st.renown, terr: st.terr, gold: st.gold, catapults: st.catapults,
    alive: st.alive, over: st.over, maidenSaved: st.maidenSaved, eventsSeen: st.eventsSeen,
  });
}

export function deserialize(json) {
  const o = typeof json === 'string' ? JSON.parse(json) : json;
  return {
    rngS: o.rngS | 0, diff: o.diff, heraldry: o.heraldry ?? 0, playerName: o.playerName || 'Moore',
    turn: o.turn, renown: o.renown, terr: o.terr, gold: o.gold, catapults: o.catapults,
    alive: o.alive, log: [], eventsSeen: o.eventsSeen || 0, over: o.over || null,
    maidenSaved: !!o.maidenSaved,
  };
}

export const SAVE_KEY = 'defender-of-the-moore-save';
export function saveToStorage(st) {
  try { localStorage.setItem(SAVE_KEY, serialize(st)); return true; } catch { return false; }
}
export function loadFromStorage() {
  try { const j = localStorage.getItem(SAVE_KEY); return j ? deserialize(j) : null; } catch { return null; }
}
export function clearStorage() { try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ } }

// expose territory metadata (names/positions) for rendering
export function terrMeta(id) { return TERRITORIES[id]; }
export const TERR_META = TERRITORIES;
