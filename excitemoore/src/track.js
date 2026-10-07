// track.js — deterministic motocross track generation + terrain height queries.
export const W = 320, H = 224, HUD_H = 28, LANES = 4;
export const N_TRACKS = 5;
export const laneBaseY = (k) => 96 + k * 32;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// obstacle widths are fixed per type; heights vary a little per roll
const TYPES = {
  ramp: { w: 72 }, table: { w: 96 }, bump: { w: 24 },
  whoop: { w: 72 }, mud: { w: 56 }, cool: { w: 28 },
};

export function buildTrack(t) { // t: 0-based track index
  const rng = mulberry32(t * 7919 + 513);
  const len = 3600 + t * 500;
  const lanes = [];
  for (let k = 0; k < LANES; k++) {
    const obs = [];
    let x = 380, lastCool = 0;
    while (x < len - 420) {
      let type;
      if (x - lastCool > 1100) { type = 'cool'; }
      else {
        const roll = rng();
        if (roll < 0.20) type = 'bump';
        else if (roll < 0.40 + t * 0.03) type = 'ramp';
        else if (roll < 0.55 + t * 0.04) type = 'table';
        else if (roll < 0.68 + t * 0.05) type = 'whoop';
        else if (roll < 0.84) type = 'mud';
        else type = 'cool';
      }
      const w = TYPES[type].w;
      let h = 0;
      if (type === 'ramp') h = 20 + rng() * 8 + t * 1.5;
      else if (type === 'table') h = 15 + rng() * 6 + t;
      else if (type === 'bump') h = 9;
      else if (type === 'whoop') h = 8;
      obs.push({ x, type, w, h });
      if (type === 'cool') lastCool = x;
      x += w + (190 + rng() * 150) * Math.max(0.65, 1 - t * 0.06);
    }
    lanes.push(obs);
  }
  // CPU riders: three rivals, faster on later tracks
  const riders = [];
  const colors = ['#3a6ae8', '#2aa848', '#e8b020'];
  for (let i = 0; i < 3; i++) {
    riders.push({
      lane: (i + 1) % LANES, laneF: (i + 1) % LANES,
      x: 180 + i * 110, h: 0, vy: 0, pitch: 0,
      speed: 0, targetSpeed: 112 + rng() * 34 + t * 7,
      airborne: false, crashT: 0, color: colors[i],
      turboT: 2 + rng() * 5, laneT: 2 + rng() * 4, frame: 0,
    });
  }
  // qualify time: generous enough that a clean run cruises and a couple of
  // crashes still make it, but tight enough to punish constant overheating.
  // Verified beatable by the autopilot on every track (test-xb.js).
  const qualify = Math.ceil(len / 100) + 5;
  return { t, len, lanes, riders, qualify };
}

// height of the dirt above the lane baseline at world x
export function heightAt(track, lane, x) {
  const obs = track.lanes[lane];
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (x < o.x) break;
    if (x >= o.x + o.w) continue;
    const u = (x - o.x) / o.w;
    switch (o.type) {
      case 'ramp': { // rise, then a sheer back edge
        const riseW = o.w - 6;
        return x < o.x + riseW ? o.h * ((x - o.x) / riseW) : 0;
      }
      case 'table': {
        const edge = 20 / o.w;
        if (u < edge) return o.h * (u / edge);
        if (u > 1 - edge) return o.h * ((1 - u) / edge);
        return o.h;
      }
      case 'bump':
        return o.h * (1 - Math.abs(u - 0.5) * 2);
      case 'whoop': {
        const sub = ((x - o.x) % 24) / 24;
        return o.h * (1 - Math.abs(sub - 0.5) * 2);
      }
      default: return 0;
    }
  }
  return 0;
}

export function slopeAt(track, lane, x) {
  return (heightAt(track, lane, x + 3) - heightAt(track, lane, x - 3)) / 6;
}

// 'mud' | 'cool' | null, with the obstacle for identity
export function featureAt(track, lane, x) {
  const obs = track.lanes[lane];
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (x < o.x) break;
    if (x >= o.x + o.w) continue;
    if (o.type === 'mud' || o.type === 'cool') return o;
    return null;
  }
  return null;
}
