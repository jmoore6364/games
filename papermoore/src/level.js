// Per-day street generation: houses (subscriber flags), hazard placement,
// bundle drops and the BMX bonus course. Difficulty escalates across the week.

import { LAYOUT } from './sprites.js';

const L = LAYOUT;
export const DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

// deterministic-ish RNG so a given day/difficulty plays consistently
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// cumulative hazard variety by day index (0..6)
const UNLOCK = [
  ['car', 'hydrant', 'jogger'],
  ['dog', 'cone'],
  ['skater', 'drain'],
  ['cat', 'trike'],
  ['mower', 'drunk'],
  ['dancer', 'tombstone', 'construct'],
  ['car2', 'reaper'],
];

const HAZ_SPD = {
  car: 1.9, car2: 2.1, skater: 1.7, jogger: 0.9, cat: 1.7, drunk: 0.7,
  trike: 1.4, mower: 1.2, dancer: 0, dog: 0, reaper: 0,
};
const CROSSING = new Set(['jogger', 'cat', 'drunk']);
const ROADSTATIC = new Set(['hydrant', 'cone', 'drain', 'tombstone', 'construct']);

export function buildDay(dayIndex, difficulty, subCount) {
  const rnd = rng(1000 + dayIndex * 97 + { easy: 1, medium: 2, hard: 3 }[difficulty] * 31);
  const dMul = { easy: 0.8, medium: 1, hard: 1.25 }[difficulty];

  const subs = Math.max(4, Math.min(16, subCount));
  const nonsubs = 4 + dayIndex + (difficulty === 'hard' ? 2 : 0);
  const total = subs + nonsubs;

  // decide which slots are subscribers (spread them out)
  const flags = [];
  for (let i = 0; i < total; i++) flags.push(i < subs);
  for (let i = flags.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [flags[i], flags[j]] = [flags[j], flags[i]];
  }

  const spacing = 62 - dayIndex * 1.5;
  const houses = [];
  let v = 150;
  for (let i = 0; i < total; i++) {
    houses.push({
      side: i % 2 === 0 ? 'L' : 'R',
      v,
      subscriber: flags[i],
      hue: Math.floor(rnd() * 6),
      delivered: false,
      windowBroken: false,
      boarded: false,
      scored: false,
    });
    v += spacing + rnd() * 16;
  }
  const streetLen = v + 150;

  // hazards
  const types = [];
  for (let d = 0; d <= dayIndex; d++) types.push(...UNLOCK[d]);
  const hazards = [];
  const count = Math.round((7 + dayIndex * 3) * dMul);
  for (let i = 0; i < count; i++) {
    const kind = types[Math.floor(rnd() * types.length)];
    const hv = 130 + rnd() * (streetLen - 220);
    let wx, opt = { spd: HAZ_SPD[kind] };
    if (CROSSING.has(kind)) {
      opt.wxMin = L.ROAD_L - 4; opt.wxMax = L.ROAD_R + 4;
      wx = rnd() < 0.5 ? opt.wxMin : opt.wxMax;
      opt.dir = wx < L.CENTER ? 1 : -1;
    } else if (ROADSTATIC.has(kind)) {
      wx = L.ROAD_L + 6 + rnd() * (L.ROAD_R - L.ROAD_L - 12);
    } else if (kind === 'dog' || kind === 'reaper') {
      wx = L.ROAD_L + rnd() * (L.ROAD_R - L.ROAD_L);
    } else {
      // lane movers
      wx = L.ROAD_L + 6 + rnd() * (L.ROAD_R - L.ROAD_L - 12);
    }
    hazards.push({ kind, wx, v: hv, opt });
  }

  // bundles to refill papers
  const bundles = [];
  const bcount = 3 + Math.floor(dayIndex / 3);
  for (let i = 0; i < bcount; i++) {
    bundles.push({ wx: L.ROAD_L + 8 + rnd() * (L.ROAD_R - L.ROAD_L - 16), v: 200 + (i + 1) * (streetLen / (bcount + 1)) });
  }

  const scrollBase = (0.95 + dayIndex * 0.11) * dMul;

  // BMX bonus course
  const bmx = buildBmx(dayIndex, rnd);

  return { dayIndex, name: DAY_NAMES[dayIndex], houses, hazards, bundles, streetLen, scrollBase, bmx };
}

function buildBmx(dayIndex, rnd) {
  const len = 900 + dayIndex * 120;
  const items = [];
  let v = 120;
  const kinds = ['ramp', 'barrier', 'water', 'star'];
  while (v < len - 120) {
    const r = rnd();
    let kind;
    if (r < 0.32) kind = 'ramp';
    else if (r < 0.58) kind = 'barrier';
    else if (r < 0.78) kind = 'water';
    else kind = 'star';
    const wx = L.ROAD_L - 24 + rnd() * (L.ROAD_R - L.ROAD_L + 48);
    items.push({ kind, wx, v });
    v += 70 + rnd() * 70;
  }
  return { len, items, base: 2.0 + dayIndex * 0.12 };
}
