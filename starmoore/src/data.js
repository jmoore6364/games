// StarMoore — game data (pure, no DOM). Costs in {m: moorerals, g: gas}.
// Distances/positions are in TILE units. Time in seconds.

export const TILE = 20;         // pixels per tile (render only)
export const MAP_W = 64;
export const MAP_H = 64;

// Terrain codes
export const T = { GRASS: 0, ROCK: 1, DIRT: 2 };

// Sides
export const PLAYER = 0;
export const ENEMY = 1;

// ---- Unit definitions ----
// speed = tiles/sec, range in tiles, sight in tiles, cd = attack cooldown sec.
// splash = area radius (tiles) for area damage (0 = single target).
export const UNITS = {
  worker: {
    name: 'Moorer', hp: 45, dmg: 4, range: 0.9, cd: 1.2, speed: 3.0,
    sight: 6, armor: 0, supply: 1, cost: { m: 50, g: 0 }, buildTime: 12,
    from: 'base', radius: 0.34, worker: true, splash: 0,
  },
  moorine: {
    name: 'Moorine', hp: 48, dmg: 6, range: 4.6, cd: 0.85, speed: 3.2,
    sight: 8, armor: 0, supply: 1, cost: { m: 50, g: 0 }, buildTime: 15,
    from: 'barracks', radius: 0.34, ranged: true, splash: 0,
  },
  moraider: {
    name: 'Moraider', hp: 100, dmg: 11, range: 0.95, cd: 1.0, speed: 3.5,
    sight: 7, armor: 2, supply: 2, cost: { m: 75, g: 25 }, buildTime: 20,
    from: 'barracks', radius: 0.38, splash: 0,
  },
  siege: {
    name: 'Siege Moore', hp: 140, dmg: 22, range: 6.2, cd: 2.0, speed: 2.2,
    sight: 9, armor: 1, supply: 3, cost: { m: 150, g: 100 }, buildTime: 30,
    from: 'factory', radius: 0.46, ranged: true, splash: 1.4,
  },
};

// ---- Building definitions ----
// w/h in tiles. provides = supply granted. dropoff = accepts resources.
export const BUILDINGS = {
  base: {
    name: 'Command Base', hp: 1500, w: 3, h: 3, sight: 10, provides: 10,
    dropoff: true, cost: { m: 400, g: 0 }, buildTime: 60, trains: ['worker'],
    armor: 2,
  },
  depot: {
    name: 'Supply Pylon', hp: 400, w: 2, h: 2, sight: 4, provides: 8,
    cost: { m: 100, g: 0 }, buildTime: 18, trains: [], armor: 1,
  },
  barracks: {
    name: 'Barracks', hp: 850, w: 3, h: 2, sight: 6, provides: 0,
    cost: { m: 150, g: 0 }, buildTime: 32, trains: ['moorine', 'moraider'],
    armor: 1,
  },
  refinery: {
    name: 'Refinery', hp: 500, w: 2, h: 2, sight: 4, provides: 0,
    cost: { m: 75, g: 0 }, buildTime: 20, trains: [], onGeyser: true, armor: 1,
  },
  factory: {
    name: 'Factory', hp: 950, w: 3, h: 2, sight: 6, provides: 0,
    cost: { m: 150, g: 100 }, buildTime: 44, trains: ['siege'],
    requires: 'barracks', armor: 1,
  },
  turret: {
    name: 'Moore Turret', hp: 480, w: 1, h: 1, sight: 8, provides: 0,
    cost: { m: 100, g: 0 }, buildTime: 22, trains: [], armor: 2,
    dmg: 9, range: 6.5, cd: 0.8, ranged: true, splash: 0,
  },
};

// What a selected worker can build (order matters for command card)
export const WORKER_BUILDS = ['depot', 'barracks', 'refinery', 'factory', 'turret'];

// Resource node yields
export const MOORE_PER_TRIP = 8;
export const GAS_PER_TRIP = 8;
export const HARVEST_TIME = 1.8;     // seconds to fill cargo
export const MOORE_NODE_AMOUNT = 1200;
export const GAS_NODE_AMOUNT = 2500;

export const START_MOORE = 50;
export const START_GAS = 0;
export const SUPPLY_MAX = 40;        // hard cap

export const DIFFICULTY = {
  easy:   { workerTarget: 8,  armyStep: 4,  waveBase: 3, incomeMul: 1.0, thinkMul: 1.6, firstWave: 90 },
  normal: { workerTarget: 12, armyStep: 5,  waveBase: 4, incomeMul: 1.0, thinkMul: 1.0, firstWave: 60 },
  hard:   { workerTarget: 16, armyStep: 6,  waveBase: 6, incomeMul: 1.25, thinkMul: 0.7, firstWave: 40 },
};
