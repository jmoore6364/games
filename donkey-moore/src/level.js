// level.js — the classic Donkey Kong "girders" stage geometry.
// A tall single screen of slanted steel girders joined by ladders. Barrels
// roll down the slopes and zig-zag from top to bottom; the hero climbs up.

export const VIEW_W = 224;
export const VIEW_H = 256;
export const WALL_L = 10;
export const WALL_R = 214;
export const HUD_H = 30;

// Girders, index 0 = bottom .. 5 = top (Donkey Moore's platform).
// Surface line runs from (xL,yL) to (xR,yR). Alternating slopes make barrels
// zig-zag: g5 rolls right, g4 left, g3 right, g2 left, g1 right, g0 left.
// `holes` are gaps in the girder (deadly aligned pit on g2/g3).
export const GIRDERS = [
  { i: 0, xL: WALL_L, xR: WALL_R, yL: 240, yR: 236, holes: [] },                 // bottom flat-ish
  { i: 1, xL: WALL_L, xR: WALL_R, yL: 214, yR: 224, holes: [] },                 // down-right
  { i: 2, xL: WALL_L, xR: WALL_R, yL: 190, yR: 180, holes: [[94, 116]] },        // down-left, pit
  { i: 3, xL: WALL_L, xR: WALL_R, yL: 146, yR: 156, holes: [[94, 116]] },        // down-right, pit
  { i: 4, xL: WALL_L, xR: WALL_R, yL: 122, yR: 112, holes: [[150, 168]] },       // down-left
  { i: 5, xL: WALL_L, xR: 150,    yL: 82,  yR: 92,  holes: [] },                 // short top, down-right
];

// Ladders connect girder gLow -> gHigh at column x. `broken` = visual only.
export const LADDERS = [
  { gLow: 0, gHigh: 1, x: 72 },
  { gLow: 0, gHigh: 1, x: 182, broken: true },
  { gLow: 1, gHigh: 2, x: 44 },
  { gLow: 1, gHigh: 2, x: 168 },
  { gLow: 2, gHigh: 3, x: 60 },
  { gLow: 2, gHigh: 3, x: 178, broken: true },
  { gLow: 3, gHigh: 4, x: 46 },
  { gLow: 3, gHigh: 4, x: 150 },
  { gLow: 4, gHigh: 5, x: 118 },
  { gLow: 4, gHigh: 5, x: 40, broken: true },
];

// Hammer power-ups float just above a girder surface.
export const HAMMERS = [
  { gi: 1, x: 150 },
  { gi: 4, x: 150 },
];

// Hero start, oil drum, Donkey Moore, and the captured character.
export const START = { gi: 0, x: 60 };
export const OIL_DRUM = { gi: 0, x: 26 };
export const DK = { x: 44, y: 62 };          // ape sits atop the left of g5
export const LADY = { x: 78, y: 30 };        // captured character, very top
export const BARREL_SPAWN = { gi: 5, x: 40, y: 74 };
export const GOAL = { gi: 5, x: 96 };        // reach the top platform to rescue

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Surface Y of a girder at column x (clamped to its span).
export function surfaceY(g, x) {
  const cx = clamp(x, g.xL, g.xR);
  const t = (cx - g.xL) / (g.xR - g.xL);
  return g.yL + (g.yR - g.yL) * t;
}

// Is column x within girder span AND not inside a hole?
export function supportedAt(g, x) {
  if (x < g.xL - 2 || x > g.xR + 2) return false;
  for (const h of g.holes) if (x > h[0] && x < h[1]) return false;
  return true;
}

// Downhill roll direction on girder g: +1 = right, -1 = left, 0 = flat.
export function slopeDir(g) {
  const d = g.yR - g.yL;
  return d > 0.5 ? 1 : d < -0.5 ? -1 : 0;
}

// Find the girder whose supported surface is the first one at or below `y`
// under column x. Returns { g, y } or null (fell off the world).
export function girderBelow(x, y, minGi = -1) {
  let best = null;
  for (const g of GIRDERS) {
    if (g.i <= minGi) continue;
    if (!supportedAt(g, x)) continue;
    const sy = surfaceY(g, x);
    if (sy >= y - 0.5) {
      if (!best || sy < best.y) best = { g, y: sy };
    }
  }
  return best;
}

export function girderByIndex(i) { return GIRDERS[i]; }

// Ladder helpers -----------------------------------------------------------
export function ladderTop(l) { return surfaceY(GIRDERS[l.gHigh], l.x); }
export function ladderBottom(l) { return surfaceY(GIRDERS[l.gLow], l.x); }

// A ladder the hero can use from girder `gi` at column x (climbable only).
export function ladderAt(x, gi, dir) {
  for (const l of LADDERS) {
    if (l.broken) continue;
    if (Math.abs(l.x - x) > 7) continue;
    if (dir === 'up' && l.gLow === gi) return l;
    if (dir === 'down' && l.gHigh === gi) return l;
  }
  return null;
}
