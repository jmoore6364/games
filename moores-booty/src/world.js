// Moore's Booty — world data, map generation, wind, economy, career state.
// This module is fully headless (no DOM) so tests can run it under Node.

export const TILE = 32;
export const MAPW = 40;   // 40*32 = 1280
export const MAPH = 28;   // 28*32 = 896
export const WORLD_W = MAPW * TILE;
export const WORLD_H = MAPH * TILE;

// tile values
export const SEA = 0, LAND = 1, REEF = 2;

export const NATIONS = [
  { key: 'england', name: 'England', color: '#c83030', dark: '#801818', adj: 'English' },
  { key: 'spain', name: 'Spain', color: '#e0b830', dark: '#906818', adj: 'Spanish' },
  { key: 'france', name: 'France', color: '#4060d8', dark: '#203088', adj: 'French' },
  { key: 'holland', name: 'Holland', color: '#e07820', dark: '#8a4410', adj: 'Dutch' },
];

// Each nation is at war with the two "adjacent" powers, allied-ish with the opposite one.
export function atWar(a, b) {
  if (a === b) return false;
  return ((a + 1) % 4 === b) || ((a + 3) % 4 === b);
}

export const GOODS = [
  { key: 'food', name: 'Food', base: 8 },
  { key: 'sugar', name: 'Sugar', base: 14 },
  { key: 'rum', name: 'Rum', base: 26 },
  { key: 'spice', name: 'Spice', base: 44 },
  { key: 'cannon', name: 'Cannon', base: 85 },
];

// nation production bias: producers sell cheap, importers pay dear.
// rows = nation, cols = goods [food, sugar, rum, spice, cannon]
const NATION_BIAS = [
  [1.0, 1.2, 0.72, 1.25, 1.05], // England: rum cheap
  [0.85, 0.7, 1.15, 1.3, 1.2],  // Spain: sugar/food cheap
  [1.1, 1.15, 1.05, 1.2, 0.75], // France: cannon cheap
  [1.15, 1.1, 1.2, 0.68, 1.05], // Holland: spice cheap
];

export const SHIP_CLASSES = [
  { key: 'sloop', name: 'Sloop', speed: 66, turn: 3.4, cannons: 4, cargo: 40, hull: 60, crewMax: 60, price: 700 },
  { key: 'brigantine', name: 'Brigantine', speed: 58, turn: 2.9, cannons: 8, cargo: 70, hull: 95, crewMax: 110, price: 2400 },
  { key: 'frigate', name: 'Frigate', speed: 54, turn: 2.5, cannons: 16, cargo: 60, hull: 135, crewMax: 180, price: 6200 },
  { key: 'galleon', name: 'Galleon', speed: 44, turn: 1.9, cannons: 12, cargo: 130, hull: 165, crewMax: 220, price: 9000 },
];

export const DIFFS = [
  { name: 'Apprentice', minWind: 0.55, eSkill: 0.25, eSpeed: 0.7, buyMul: 1.0, lootMul: 1.2 },
  { name: 'Journeyman', minWind: 0.42, eSkill: 0.45, eSpeed: 0.85, buyMul: 1.08, lootMul: 1.0 },
  { name: 'Adventurer', minWind: 0.32, eSkill: 0.65, eSpeed: 1.0, buyMul: 1.16, lootMul: 0.9 },
  { name: 'Swashbuckler', minWind: 0.24, eSkill: 0.85, eSpeed: 1.15, buyMul: 1.25, lootMul: 0.8 },
];

export const RANKS = ['Sailor', 'Captain', 'Major', 'Colonel', 'Admiral', 'Duke'];
export const RANK_REQ = [0, 2, 5, 9, 14, 20];  // captures credited to reach rank i
export const RANK_LAND = [0, 100, 300, 700, 1500, 3000]; // acres granted at each rank

// ---------------- deterministic RNG (state-carried) ----------------

export function rand(st) {
  // mulberry32-ish on st.rngS
  st.rngS = (st.rngS + 0x6D2B79F5) | 0;
  let t = st.rngS;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------- map generation ----------------

const ISLANDS = [
  // [cx, cy, rx, ry] in tiles — a stylized Caribbean
  [7, 5, 7.2, 3.4],    // Cuba-ish, NW
  [20, 6.5, 5.2, 2.4], // Hispaniola-ish
  [33, 5, 3.6, 2.2],   // northern Antilles
  [2.5, 16, 3.2, 5.0], // Yucatan coast, W edge
  [15.5, 13.5, 2.8, 1.9], // Jamaica-ish
  [30.5, 13, 2.2, 1.6],   // windward isle
  [37, 15.5, 2.4, 1.8],   // Barbados-ish
  [20, 27.5, 15, 3.4],    // Spanish Main, S coast
  [6.5, 24.5, 4.0, 2.2],  // SW isthmus
  [26.5, 19.5, 1.7, 1.3], // deserted treasure isle (no port)
];
const TREASURE_ISLE = 9; // index into ISLANDS

const REEF_PATCHES = [
  [11.5, 9.5, 2.2], [25, 11.5, 1.8], [33.5, 9.5, 1.7], [10.5, 19.5, 1.9], [30, 22, 1.6],
];

function buildMask() {
  const mask = new Uint8Array(MAPW * MAPH);
  for (let y = 0; y < MAPH; y++) {
    for (let x = 0; x < MAPW; x++) {
      let v = SEA;
      for (const [cx, cy, rx, ry] of ISLANDS) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        // wobble the coastline a little, deterministically
        const wob = 0.14 * Math.sin(x * 2.1 + y * 1.3) + 0.1 * Math.cos(x * 0.9 - y * 2.3);
        if (dx * dx + dy * dy <= 1 + wob) { v = LAND; break; }
      }
      if (v === SEA) {
        for (const [cx, cy, r] of REEF_PATCHES) {
          const dx = x - cx, dy = y - cy;
          const wob = 0.5 * Math.sin(x * 3.1 + y * 2.7);
          if (dx * dx + dy * dy <= r * r + wob) { v = REEF; break; }
        }
      }
      mask[y * MAPW + x] = v;
    }
  }
  return mask;
}

export function tileAt(mask, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return LAND; // world edge = land wall
  return mask[ty * MAPW + tx];
}

export function isSeaAt(mask, px, py) {
  return tileAt(mask, Math.floor(px / TILE), Math.floor(py / TILE)) !== LAND;
}

function isCoastalLand(mask, tx, ty) {
  if (tileAt(mask, tx, ty) !== LAND) return false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (tileAt(mask, tx + dx, ty + dy) === SEA) return true;
  }
  return false;
}

// snap a desired port position to the nearest coastal land tile
function snapPort(mask, tx, ty) {
  if (isCoastalLand(mask, tx, ty)) return { tx, ty };
  for (let r = 1; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (isCoastalLand(mask, tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
      }
    }
  }
  return { tx, ty };
}

const PORT_DEFS = [
  // name, nation idx, desired tile
  ['Port Royal', 0, 15, 12],
  ['Nassau', 0, 13, 3],
  ['Bridgetown', 0, 37, 14],
  ['Havana', 1, 5, 3],
  ['Santiago', 1, 11, 7],
  ['Cartagena', 1, 17, 25],
  ['Portobello', 1, 8, 24],
  ['Tortuga', 2, 17, 5],
  ['Leogane', 2, 23, 8],
  ['Martinique', 2, 31, 12],
  ['Curacao', 3, 25, 25],
  ['St. Eustatius', 3, 34, 4],
  ['Willemstad', 3, 30, 25],
];

function findTreasureSpot(mask) {
  // a land tile on the deserted isle
  const [cx, cy] = ISLANDS[TREASURE_ISLE];
  const s = snapPort(mask, Math.round(cx), Math.round(cy));
  return s;
}

export function buildWorld() {
  const mask = buildMask();
  const ports = PORT_DEFS.map(([name, nation, tx, ty], i) => {
    const p = snapPort(mask, tx, ty);
    return { i, name, nation, tx: p.tx, ty: p.ty, x: p.tx * TILE + 16, y: p.ty * TILE + 16 };
  });
  const t = findTreasureSpot(mask);
  return {
    mask, ports,
    treasure: { tx: t.tx, ty: t.ty, x: t.tx * TILE + 16, y: t.ty * TILE + 16 },
    isle: { x: ISLANDS[TREASURE_ISLE][0] * TILE, y: ISLANDS[TREASURE_ISLE][1] * TILE },
  };
}

export const WORLD = buildWorld();

// ---------------- wind ----------------

// Wind blows TOWARD wind.a. Sailing with the wind is fast, into it is slow.
export function windFactor(heading, windA, minF) {
  const d = heading - windA;
  return minF + (1 - minF) * (0.5 + 0.5 * Math.cos(d));
}

export function updateWind(st, dt) {
  // slowly rotating trade wind: drift toward a wandering target
  st.windT -= dt;
  if (st.windT <= 0) {
    st.windT = 6 + rand(st) * 8;
    st.windTarget = st.wind + (rand(st) - 0.45) * 1.4; // slight eastward bias
  }
  const d = st.windTarget - st.wind;
  st.wind += Math.sign(d) * Math.min(Math.abs(d), 0.05 * dt);
}

// ---------------- economy ----------------

function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// price of a good at a port on a given day. Deterministic; drifts over time.
export function goodPrice(st, portIdx, goodIdx) {
  const port = WORLD.ports[portIdx];
  const g = GOODS[goodIdx];
  const bias = NATION_BIAS[port.nation][goodIdx];
  const ph = hash2(portIdx * 7 + 3, goodIdx * 13 + 1) * Math.PI * 2;
  const drift = 1 + 0.28 * Math.sin(st.day * 0.075 + ph) + 0.12 * Math.sin(st.day * 0.021 + ph * 1.7);
  const local = 0.9 + 0.2 * hash2(portIdx, goodIdx * 31);
  return Math.max(2, Math.round(g.base * bias * drift * local));
}

export function buyPrice(st, portIdx, goodIdx) {
  return Math.max(2, Math.round(goodPrice(st, portIdx, goodIdx) * DIFFS[st.diff].buyMul));
}
export function sellPrice(st, portIdx, goodIdx) {
  return goodPrice(st, portIdx, goodIdx);
}

export function cargoTotal(st) {
  return st.cargo.reduce((a, b) => a + b, 0);
}
export function cargoMax(st) {
  return SHIP_CLASSES[st.ship.classIdx].cargo;
}

export function buyGood(st, portIdx, goodIdx, qty) {
  const price = buyPrice(st, portIdx, goodIdx);
  const canHold = cargoMax(st) - cargoTotal(st);
  const canAfford = Math.floor(st.gold / price);
  const n = Math.min(qty, canHold, canAfford);
  if (n <= 0) return 0;
  st.gold -= n * price;
  st.cargo[goodIdx] += n;
  return n;
}

export function sellGood(st, portIdx, goodIdx, qty) {
  const price = sellPrice(st, portIdx, goodIdx);
  const n = Math.min(qty, st.cargo[goodIdx]);
  if (n <= 0) return 0;
  st.gold += n * price;
  st.cargo[goodIdx] -= n;
  return n;
}

// ---------------- career state ----------------

export function newGame(opts = {}) {
  const nation = opts.nation ?? 0;
  const diff = opts.diff ?? 1;
  const home = WORLD.ports.find((p) => p.nation === nation) || WORLD.ports[0];
  const st = {
    name: opts.name || 'Moore',
    nation, diff,
    rngS: (opts.seed ?? 1234567) | 0,
    gold: 100,
    day: 0,
    dayFrac: 0,
    year0: 1660,
    ship: { classIdx: 0, hull: SHIP_CLASSES[0].hull, sails: 100, cannons: SHIP_CLASSES[0].cannons },
    crew: 25,
    morale: 75,
    cargo: GOODS.map((g) => (g.key === 'food' ? 30 : 0)),
    x: 0, y: 0, heading: 0, sailing: false,
    wind: Math.PI, windTarget: Math.PI, windT: 5,
    marque: [false, false, false, false],   // licensed by nation i
    hostile: [false, false, false, false],  // nation i refuses you entry / attacks
    captures: [0, 0, 0, 0],                 // capture credit with nation i
    rank: [0, 0, 0, 0],                     // rank idx with nation i
    land: 0,                                // acres granted
    fragments: 0,
    treasureFound: false,
    nemesisDefeated: false,
    nemesisHint: null,
    fineSword: false,
    starving: 0,
    mutinyWarned: false,
    mutiny: false,
    retired: false,
    plunders: 0,
    ships: [],
  };
  // start just off the coast of the home port
  const spot = findSeaNear(st, home.tx, home.ty);
  st.x = spot.x; st.y = spot.y;
  spawnAiShips(st);
  return st;
}

export function findSeaNear(st, tx, ty) {
  for (let r = 1; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = tx + dx, ny = ty + dy;
        if (tileAt(WORLD.mask, nx, ny) === SEA) {
          return { x: nx * TILE + 16, y: ny * TILE + 16 };
        }
      }
    }
  }
  return { x: tx * TILE, y: ty * TILE };
}

export function yearsPassed(st) { return Math.floor(st.day / 360); }
export function dateStr(st) {
  const y = st.year0 + Math.floor(st.day / 360);
  const m = Math.floor((st.day % 360) / 30);
  const d = (st.day % 30) + 1;
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MO[m]} ${d}, ${y}`;
}

// player duel windup penalty from aging: skill declines after 10 years at sea
export function agePenalty(st) {
  return Math.min(10, Math.max(0, yearsPassed(st) - 10));
}

// one day of sea time: crew eats, morale drifts
export function nextDay(st) {
  st.day++;
  const eaten = Math.max(1, Math.ceil(st.crew / 12));
  const fi = 0; // food index
  if (st.cargo[fi] >= eaten) {
    st.cargo[fi] -= eaten;
    st.starving = 0;
    st.morale -= 0.4; // slow grumbling at sea
  } else {
    st.cargo[fi] = 0;
    st.starving++;
    st.morale -= 6;
  }
  st.morale = Math.max(0, Math.min(100, st.morale));
  if (st.morale <= 30 && !st.mutinyWarned) {
    st.mutinyWarned = true;
    return 'warning';
  }
  if (st.morale > 45) st.mutinyWarned = false;
  if (st.morale <= 5 || st.starving >= 12) {
    st.mutiny = true;
    return 'mutiny';
  }
  return null;
}

export function moraleBoost(st, n) {
  st.morale = Math.min(100, st.morale + n);
}

// ---------------- raiding legality, promotion ----------------

export function isLegalTarget(st, victimNation) {
  for (let n = 0; n < 4; n++) {
    if (st.marque[n] && atWar(n, victimNation)) return true;
  }
  return false;
}

// called when the player captures/sinks a ship of victimNation
export function recordCapture(st, victimNation) {
  const legal = isLegalTarget(st, victimNation);
  if (!legal) {
    st.hostile[victimNation] = true;
    if (victimNation === st.nation) st.hostile[st.nation] = true;
  }
  for (let n = 0; n < 4; n++) {
    if (st.marque[n] && atWar(n, victimNation)) st.captures[n]++;
  }
  return legal;
}

// governor checks: is a promotion due with nation n?
export function promotionDue(st, n) {
  const r = st.rank[n];
  return r < RANKS.length - 1 && st.captures[n] >= RANK_REQ[r + 1];
}

export function promote(st, n) {
  if (!promotionDue(st, n)) return null;
  st.rank[n]++;
  const grant = RANK_LAND[st.rank[n]] - RANK_LAND[st.rank[n] - 1];
  st.land += grant;
  return { rank: RANKS[st.rank[n]], grant };
}

export function grantMarque(st, n) {
  st.marque[n] = true;
}

// ---------------- treasure ----------------

export function addFragment(st) {
  if (st.fragments < 4) st.fragments++;
  return st.fragments;
}
export function treasureKnown(st) { return st.fragments >= 4; }

export const TREASURE_GOLD = 20000;

// dig at world position (beach scene translates its local spot to this)
export function digTreasure(st) {
  if (!treasureKnown(st) || st.treasureFound) return 0;
  st.treasureFound = true;
  st.gold += TREASURE_GOLD;
  moraleBoost(st, 40);
  return TREASURE_GOLD;
}

export function nearTreasureIsle(st) {
  return Math.hypot(st.x - WORLD.treasure.x, st.y - WORLD.treasure.y) < TILE * 4.5;
}

// ---------------- nemesis ----------------

export function defeatNemesis(st) {
  st.nemesisDefeated = true;
  st.gold += 5000;
  moraleBoost(st, 50);
}

// ---------------- career score ----------------

export const TITLES = [
  [0, 'Beggar'], [1500, 'Barkeeper'], [4000, 'Innkeeper'], [9000, 'Planter'],
  [16000, 'Merchant'], [26000, 'Mayor'], [40000, 'Governor'], [60000, "King's Advisor"],
];

export function careerScore(st) {
  const rankPts = st.rank.reduce((a, b) => a + b, 0) * 1500;
  const score = Math.floor(st.gold / 2) + st.land * 4 + rankPts
    + (st.treasureFound ? 12000 : 0) + (st.nemesisDefeated ? 15000 : 0);
  let title = TITLES[0][1];
  for (const [min, t] of TITLES) if (score >= min) title = t;
  return {
    score, title,
    gold: st.gold, land: st.land, rankPts,
    treasure: st.treasureFound, nemesis: st.nemesisDefeated,
    years: yearsPassed(st),
  };
}

// ---------------- AI ships ----------------

const SHIP_TYPES = ['merchant', 'war', 'pirate', 'nemesis'];

function randPort(st) {
  return WORLD.ports[Math.floor(rand(st) * WORLD.ports.length)];
}

export function spawnAiShips(st) {
  st.ships = [];
  const mk = (type, nation, classIdx) => {
    const from = randPort(st);
    const to = randPort(st);
    const spot = findSeaNear(st, from.tx, from.ty);
    const s = {
      type, nation, classIdx,
      x: spot.x, y: spot.y, a: rand(st) * Math.PI * 2,
      target: to.i, stuck: 0, grace: 0,
      gold: 0, cargoGold: 0,
    };
    rollLoot(st, s);
    st.ships.push(s);
    return s;
  };
  for (let i = 0; i < 8; i++) mk('merchant', Math.floor(rand(st) * 4), rand(st) < 0.6 ? 0 : 3);
  for (let i = 0; i < 3; i++) mk('war', Math.floor(rand(st) * 4), rand(st) < 0.5 ? 2 : 3);
  for (let i = 0; i < 2; i++) mk('pirate', -1, rand(st) < 0.5 ? 0 : 1);
  if (!st.nemesisDefeated) mk('nemesis', -1, 3);
}

export function rollLoot(st, s) {
  const base = { merchant: 120, war: 350, pirate: 250, nemesis: 2000 }[s.type] || 100;
  s.gold = Math.round((base / 2 + rand(st) * base) * DIFFS[st.diff].lootMul);
  s.cargoGold = Math.round(rand(st) * base * 0.8);
}

// simple steering with land avoidance; ships sail their trade routes
export function updateAiShips(st, dt) {
  for (const s of st.ships) {
    if (s.grace > 0) s.grace -= dt;
    const cls = SHIP_CLASSES[s.classIdx];
    const port = WORLD.ports[s.target >= 0 ? s.target : 0];
    let goal;
    if (s.type === 'pirate' || s.type === 'nemesis') {
      // lurk: circle a wander point, chase player lightly if close
      const dp = Math.hypot(st.x - s.x, st.y - s.y);
      if (dp < 180 && s.type === 'nemesis') goal = { x: st.x, y: st.y };
      else if (dp < 140) goal = { x: st.x, y: st.y };
      else goal = { x: port.x, y: port.y };
    } else {
      goal = { x: port.x, y: port.y };
    }
    const want = Math.atan2(goal.y - s.y, goal.x - s.x);
    let da = want - s.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    s.a += Math.max(-1.8 * dt, Math.min(1.8 * dt, da));
    // land avoidance: probe ahead
    const spd = cls.speed * 0.55 * windFactor(s.a, st.wind, 0.5);
    let tries = 0;
    while (tries < 8) {
      const px = s.x + Math.cos(s.a) * 40;
      const py = s.y + Math.sin(s.a) * 40;
      if (isSeaAt(WORLD.mask, px, py)) break;
      s.a += 0.5; tries++;
    }
    const nx = s.x + Math.cos(s.a) * spd * dt;
    const ny = s.y + Math.sin(s.a) * spd * dt;
    if (isSeaAt(WORLD.mask, nx, ny)) { s.x = nx; s.y = ny; s.stuck = 0; }
    else s.stuck += dt;
    if (s.stuck > 4) { // hopeless: pick a new destination
      s.target = randPort(st).i; s.stuck = 0; s.a += Math.PI;
    }
    // reached destination → new route
    if (Math.hypot(s.x - port.x, s.y - port.y) < TILE * 2 && s.type !== 'nemesis') {
      s.target = randPort(st).i;
      rollLoot(st, s);
    }
  }
}

// remove a ship after battle and eventually respawn a replacement
export function removeShip(st, s) {
  const i = st.ships.indexOf(s);
  if (i >= 0) st.ships.splice(i, 1);
  if (s.type !== 'nemesis') {
    // replacement sails from a random port
    const from = randPort(st);
    const spot = findSeaNear(st, from.tx, from.ty);
    const ns = {
      type: s.type, nation: s.type === 'pirate' ? -1 : Math.floor(rand(st) * 4),
      classIdx: s.classIdx,
      x: spot.x, y: spot.y, a: rand(st) * Math.PI * 2,
      target: randPort(st).i, stuck: 0, grace: 8,
      gold: 0, cargoGold: 0,
    };
    rollLoot(st, ns);
    st.ships.push(ns);
  }
}

export function nemesisShip(st) {
  return st.ships.find((s) => s.type === 'nemesis') || null;
}

// where is El Moorro? (tavern rumor)
export function nemesisRumor(st) {
  const n = nemesisShip(st);
  if (!n) return 'El Moorro has not been seen of late...';
  let best = null, bd = 1e9;
  for (const p of WORLD.ports) {
    const d = Math.hypot(p.x - n.x, p.y - n.y);
    if (d < bd) { bd = d; best = p; }
  }
  return `El Moorro's black galleon was sighted near ${best.name}!`;
}

// ---------------- save / load ----------------

export function serialize(st) {
  return JSON.stringify(st);
}

export function deserialize(json) {
  const st = JSON.parse(json);
  // basic sanity
  if (!st.ship || !Array.isArray(st.cargo)) throw new Error('bad save');
  return st;
}
