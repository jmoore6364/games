// Moore's Booty — port services: governor, tavern, shipwright, trade glue,
// and the single-slot save. Logic only (headless-testable); menus render in
// main.js.

import {
  NATIONS, SHIP_CLASSES, RANKS, atWar, rand, promotionDue, promote,
  grantMarque, addFragment, nemesisRumor, moraleBoost, goodPrice, GOODS,
  WORLD, serialize, deserialize,
} from './world.js';

export const SAVE_KEY = 'moores-booty-save';

// ---------------- save / load (browser only; guarded for Node) ----------------

export function saveGame(st) {
  if (typeof localStorage === 'undefined') return false;
  localStorage.setItem(SAVE_KEY, serialize(st));
  return true;
}

export function loadGame() {
  if (typeof localStorage === 'undefined') return null;
  const json = localStorage.getItem(SAVE_KEY);
  if (!json) return null;
  try { return deserialize(json); } catch { return null; }
}

export function hasSave() {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem(SAVE_KEY);
}

// ---------------- arrival ----------------

export function canEnterPort(st, port) {
  return !st.hostile[port.nation];
}

export function onArrival(st) {
  moraleBoost(st, 10);
  st.starving = 0;
}

// ---------------- governor ----------------

// What the governor has to say / offer right now.
export function governorAudience(st, port) {
  const n = port.nation;
  const out = { lines: [], promotion: null, marqueOffers: [] };
  const gname = NATIONS[n].name;

  if (promotionDue(st, n)) {
    const p = promote(st, n);
    out.promotion = p;
    out.lines.push(`Your service to ${gname} is the talk of the court!`);
    out.lines.push(`I name you ${p.rank}, with a grant of ${p.grant} acres.`);
  } else {
    const r = st.rank[n];
    if (r > 0) out.lines.push(`Good day, ${RANKS[r]} ${st.name}.`);
    else out.lines.push(`Welcome to ${port.name}, Captain ${st.name}.`);
    const next = r < RANKS.length - 1 ? RANKS[r + 1] : null;
    if (next) {
      out.lines.push(`Bring ${gname} more prizes and a ${next}'s`);
      out.lines.push(`commission could be yours.`);
    }
  }

  for (let v = 0; v < 4; v++) {
    if (atWar(n, v) && !st.marque[n]) {
      out.marqueOffers.push(v);
    }
  }
  if (!st.marque[n]) {
    const foes = [0, 1, 2, 3].filter((v) => atWar(n, v)).map((v) => NATIONS[v].name);
    out.lines.push(`${gname} is at war with ${foes.join(' and ')}.`);
  } else {
    out.lines.push(`Your letter of marque stands. Good hunting.`);
  }
  return out;
}

export function acceptMarque(st, port) {
  grantMarque(st, port.nation);
  return `A letter of marque from ${NATIONS[port.nation].name}! Their enemies are now fair prey.`;
}

// ---------------- tavern ----------------

export const CREW_COST = 8;      // per sailor
export const ROUND_COST = 15;    // buy the house a round → rumor
export const SWORD_COST = 600;

export function fragmentCost(st) { return 150 * (st.fragments + 1); }

export function crewCapacity(st) { return SHIP_CLASSES[st.ship.classIdx].crewMax; }

export function hireCrew(st, n = 5) {
  const room = crewCapacity(st) - st.crew;
  const afford = Math.floor(st.gold / CREW_COST);
  const got = Math.max(0, Math.min(n, room, afford));
  if (got > 0) {
    st.gold -= got * CREW_COST;
    st.crew += got;
    moraleBoost(st, 2);
  }
  return got;
}

// a round of drinks buys loose talk
export function buyRumor(st) {
  if (st.gold < ROUND_COST) return null;
  st.gold -= ROUND_COST;
  moraleBoost(st, 3);
  const r = rand(st);
  if (r < 0.45 && !st.nemesisDefeated) {
    const text = nemesisRumor(st);
    st.nemesisHint = text;
    return { kind: 'nemesis', text };
  }
  // price tip: find a genuinely cheap good somewhere
  const pi = Math.floor(rand(st) * WORLD.ports.length);
  const gi = Math.floor(rand(st) * GOODS.length);
  const p = goodPrice(st, pi, gi);
  return {
    kind: 'price',
    text: `They say ${GOODS[gi].name.toLowerCase()} goes for ${p} gold in ${WORLD.ports[pi].name}.`,
  };
}

export function buyFragment(st) {
  if (st.fragments >= 4) return { ok: false, text: 'You hold the whole chart already.' };
  const cost = fragmentCost(st);
  if (st.gold < cost) return { ok: false, text: `The old sailor wants ${cost} gold for it.` };
  st.gold -= cost;
  const n = addFragment(st);
  const text = n >= 4
    ? 'The last piece! The X marks a deserted isle east of Jamaica!'
    : `A torn corner of an old chart... (${n}/4 fragments)`;
  return { ok: true, text, fragments: n };
}

export function buyFineSword(st) {
  if (st.fineSword) return { ok: false, text: 'You already carry the finest steel.' };
  if (st.gold < SWORD_COST) return { ok: false, text: `The smith wants ${SWORD_COST} gold.` };
  st.gold -= SWORD_COST;
  st.fineSword = true;
  return { ok: true, text: 'A Toledo blade! Your lunges reach farther.' };
}

// ---------------- shipwright ----------------

export const REPAIR_PER_PT = 2;
export const CANNON_COST = 60;

export function repairCost(st) {
  const cls = SHIP_CLASSES[st.ship.classIdx];
  return Math.max(0, Math.ceil((cls.hull - st.ship.hull) * REPAIR_PER_PT));
}

export function doRepair(st) {
  const cost = repairCost(st);
  if (cost === 0 || st.gold < cost) return false;
  st.gold -= cost;
  st.ship.hull = SHIP_CLASSES[st.ship.classIdx].hull;
  st.ship.sails = 100;
  return true;
}

export function maxCannons(st) {
  return SHIP_CLASSES[st.ship.classIdx].cannons + 4;
}

export function buyCannon(st) {
  if (st.ship.cannons >= maxCannons(st) || st.gold < CANNON_COST) return false;
  st.gold -= CANNON_COST;
  st.ship.cannons++;
  return true;
}

export function tradeInValue(st) {
  return Math.floor(SHIP_CLASSES[st.ship.classIdx].price * 0.5);
}

export function shipSwapCost(st, classIdx) {
  return Math.max(0, SHIP_CLASSES[classIdx].price - tradeInValue(st));
}

export function buyShipClass(st, classIdx) {
  if (classIdx === st.ship.classIdx) return false;
  const cost = shipSwapCost(st, classIdx);
  if (st.gold < cost) return false;
  st.gold -= cost;
  const cls = SHIP_CLASSES[classIdx];
  st.ship = { classIdx, hull: cls.hull, sails: 100, cannons: cls.cannons };
  st.crew = Math.min(st.crew, cls.crewMax);
  // cargo beyond the new hold is jettisoned, food last
  let total = st.cargo.reduce((a, b) => a + b, 0);
  for (let g = GOODS.length - 1; g >= 0 && total > cls.cargo; g--) {
    const dump = Math.min(st.cargo[g], total - cls.cargo);
    st.cargo[g] -= dump; total -= dump;
  }
  return true;
}

// ---------------- prize resolution (after boarding wins) ----------------

export function prizeValue(classIdx) {
  return Math.floor(SHIP_CLASSES[classIdx].price * 0.45);
}

// choice: 'flagship' | 'prize' | 'plunder'
export function resolveCapture(st, enemy, choice) {
  let msg = '';
  st.gold += enemy.gold;
  st.plunders++;
  moraleBoost(st, 12);
  if (choice === 'flagship') {
    const cls = SHIP_CLASSES[enemy.classIdx];
    st.ship = { classIdx: enemy.classIdx, hull: Math.ceil(cls.hull * 0.7), sails: 70, cannons: cls.cannons };
    st.crew = Math.min(st.crew, cls.crewMax);
    msg = `You take the ${cls.name} as your flagship!`;
  } else if (choice === 'prize') {
    const v = prizeValue(enemy.classIdx);
    st.gold += v;
    msg = `A prize crew sails her off — ${v} gold.`;
  } else {
    st.gold += enemy.cargoGold;
    msg = `You strip her holds (+${enemy.cargoGold} gold) and scuttle her.`;
  }
  return msg;
}

// captured captains sometimes carry map fragments
export function captainSpoils(st, enemy) {
  if (enemy.type === 'nemesis') return null;
  const r = rand(st);
  if (st.fragments < 4 && (enemy.type === 'war' ? r < 0.5 : r < 0.25)) {
    const n = addFragment(st);
    return n >= 4
      ? 'In the captain\'s coat: the LAST map fragment! The X is revealed!'
      : `In the captain's coat: a treasure map fragment! (${n}/4)`;
  }
  if (r < 0.5 && !st.nemesisDefeated) {
    const text = nemesisRumor(st);
    st.nemesisHint = text;
    return text;
  }
  return null;
}
