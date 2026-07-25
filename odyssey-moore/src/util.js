// util.js — math + small helpers shared across scenes.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

// shortest signed angle difference b-a wrapped to [-PI,PI]
export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
// turn `from` toward `to` by at most `maxStep` (radians)
export function turnToward(from, to, maxStep) {
  const d = angDiff(from, to);
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}
export function approach(cur, target, step) {
  if (cur < target) return Math.min(cur, target) === cur ? Math.min(target, cur + step) : target;
  return Math.max(target, cur - step);
}

// Response curve for analog stick: small deflections -> fine control,
// full deflection -> full output. Keeps direction, shapes magnitude.
export function curveVec(x, y, dead = 0.14, exp = 1.7) {
  const m = Math.hypot(x, y);
  if (m < dead) return { x: 0, y: 0, m: 0 };
  const norm = (m - dead) / (1 - dead);          // rescale past deadzone
  const shaped = Math.pow(clamp(norm, 0, 1), exp); // ease-in curve
  const s = shaped / m;
  return { x: x * s, y: y * s, m: shaped };
}

// Nearest entity within a forward cone (for aim assist). Returns entity or null.
export function nearestInCone(ox, oy, facing, list, halfAngle = 0.9, maxRange = 520) {
  let best = null, bestD = maxRange * maxRange;
  for (const e of list) {
    if (e.dead) continue;
    const dx = e.x - ox, dy = e.y - oy;
    const d2 = dx * dx + dy * dy;
    if (d2 > bestD) continue;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angDiff(facing, ang)) > halfAngle) continue;
    bestD = d2; best = e;
  }
  return best;
}
// Absolute nearest (used when no facing constraint desired).
export function nearest(ox, oy, list, maxRange = 1e9) {
  let best = null, bestD = maxRange * maxRange;
  for (const e of list) {
    if (e.dead) continue;
    const d2 = dist2(ox, oy, e.x, e.y);
    if (d2 < bestD) { bestD = d2; best = e; }
  }
  return best;
}
