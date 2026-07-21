// courses.js — the six surreal isometric courses as heightmaps + hazards.
//
// Pure data (no DOM). Each course carves a set of surface-type paths, then
// GRADES the heightmap smoothly along the (x+y) diagonal so the whole course
// tilts toward the camera: a clean planar iso slope the marble always tends to
// roll DOWN, toward the goal. Feature cells (walls, pools, pads) override on
// top. Paths are carved orthogonally so they stay 4-connected and reachable()
// in physics.js can prove each course completable.

import { TYPE } from './physics.js';

// ---- builder toolkit ----
function blank(w, h) {
  return {
    w, h,
    cells: new Int8Array(w * h).fill(TYPE.VOID),
    height: new Float32Array(w * h),
    forces: {},
    enemies: [],
    checkpoints: [],
  };
}
const I = (b, x, y) => y * b.w + x;
const inB = (b, x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h;
function set(b, x, y, t, h) {
  if (!inB(b, x, y)) return;
  b.cells[I(b, x, y)] = t;
  if (h != null) b.height[I(b, x, y)] = h;
}
function block(b, cx, cy, r, t, h) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) set(b, x, y, t, h);
}
function rect(b, x0, y0, x1, y1, t, h) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(b, x, y, t, h);
}
// Orthogonal cell-by-cell carve of a type, half-width r (keeps 4-connectivity).
function carve(b, pts, r, t = TYPE.FLOOR) {
  for (let i = 0; i < pts.length - 1; i++) {
    let [x, y] = pts[i];
    const [tx, ty] = pts[i + 1];
    block(b, x, y, r, t);
    while (x !== tx || y !== ty) {
      const dx = tx - x, dy = ty - y;
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) x += Math.sign(dx);
      else if (dy !== 0) y += Math.sign(dy);
      else x += Math.sign(dx);
      block(b, x, y, r, t);
    }
  }
}
// Smoothly tilt the whole course: height = lerp(hStart..hEnd) by (x+y).
function grade(b, hStart, hEnd) {
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (b.cells[I(b, x, y)] === TYPE.VOID) continue;
    const s = x + y; if (s < lo) lo = s; if (s > hi) hi = s;
  }
  const span = Math.max(1, hi - lo);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const c = b.cells[I(b, x, y)];
    if (c === TYPE.VOID) continue;
    b.height[I(b, x, y)] = hStart + (hEnd - hStart) * ((x + y - lo) / span);
  }
}
function addForce(b, x, y, fx, fy) {
  set(b, x, y, TYPE.ARROW);
  b.forces[I(b, x, y)] = { fx, fy };
}
function finalize(b, opts) {
  // raise wall rails above the graded floor so they read as tall pillars
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (b.cells[I(b, x, y)] !== TYPE.WALL) continue;
    let ng = 0, n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inB(b, x + dx, y + dy) && b.cells[I(b, x + dx, y + dy)] !== TYPE.VOID && b.cells[I(b, x + dx, y + dy)] !== TYPE.WALL) {
        ng += b.height[I(b, x + dx, y + dy)]; n++;
      }
    }
    b.height[I(b, x, y)] = (n ? Math.round(ng / n) : b.height[I(b, x, y)]) + 6;
  }
  // kill plane below the lowest ground
  let min = Infinity;
  for (let i = 0; i < b.cells.length; i++) if (b.cells[i] !== TYPE.VOID) min = Math.min(min, b.height[i]);
  b.killZ = (isFinite(min) ? min : 0) - 6;
  Object.assign(b, opts);
  // resolve heights of markers from the graded field
  b.start.z = b.height[I(b, Math.round(b.start.x), Math.round(b.start.y))];
  for (const cp of b.checkpoints) cp.z = b.height[I(b, Math.round(cp.x), Math.round(cp.y))];
  return b;
}

// =====================================================================
// 1 — PRACTICE. A wide, kindly ramp. Nothing to fear.
// =====================================================================
function course1() {
  const b = blank(20, 26);
  carve(b, [[3, 3], [10, 10], [16, 22]], 4);
  grade(b, 14, 1);
  block(b, 3, 3, 2, TYPE.START);
  rect(b, 13, 20, 18, 24, TYPE.GOAL);
  return finalize(b, {
    name: 'PRACTICE', theme: 0, time: 75,
    start: { x: 3, y: 3 }, goal: { cx: 16, cy: 22 }, enemies: [],
  });
}

// =====================================================================
// 2 — BEGINNER. Narrower, a launch ramp, one Steelie.
// =====================================================================
function course2() {
  const b = blank(20, 30);
  carve(b, [[3, 3], [9, 9], [9, 16], [16, 26]], 2);
  grade(b, 18, 1);
  block(b, 3, 3, 2, TYPE.START);
  rect(b, 8, 12, 10, 13, TYPE.RAMP);
  rect(b, 8, 14, 10, 14, TYPE.JUMP);
  rect(b, 14, 24, 18, 28, TYPE.GOAL);
  return finalize(b, {
    name: 'BEGINNER', theme: 1, time: 55,
    start: { x: 3, y: 3 }, goal: { cx: 16, cy: 26 },
    enemies: [{ type: 'steelie', x: 12, y: 20 }],
  });
}

// =====================================================================
// 3 — INTERMEDIATE. Slime pool, a launch gap, a checkpoint.
// =====================================================================
function course3() {
  const b = blank(22, 34);
  carve(b, [[3, 3], [8, 9], [8, 17], [15, 22], [18, 30]], 2);
  grade(b, 20, 1);
  block(b, 3, 3, 2, TYPE.START);
  rect(b, 7, 13, 9, 15, TYPE.SLIME);
  rect(b, 15, 18, 16, 19, TYPE.JUMP);
  set(b, 15, 20, TYPE.VOID); set(b, 16, 20, TYPE.VOID);
  block(b, 13, 21, 1, TYPE.CHECK);
  rect(b, 16, 28, 20, 32, TYPE.GOAL);
  return finalize(b, {
    name: 'INTERMEDIATE', theme: 2, time: 50,
    start: { x: 3, y: 3 }, goal: { cx: 18, cy: 30 },
    checkpoints: [{ x: 13, y: 21 }],
    enemies: [{ type: 'steelie', x: 9, y: 11 }, { type: 'slinky', x: 16, y: 25 }],
  });
}

// =====================================================================
// 4 — AERIAL. Narrow catwalks over the void; a jump across a gap.
// =====================================================================
function course4() {
  const b = blank(20, 36);
  carve(b, [[3, 3], [6, 6]], 1);
  carve(b, [[6, 6], [7, 14], [13, 18]], 0);
  block(b, 13, 18, 1, TYPE.FLOOR);
  carve(b, [[13, 22], [16, 30]], 1);
  block(b, 13, 22, 1, TYPE.FLOOR);
  grade(b, 22, 1);
  block(b, 3, 3, 1, TYPE.START);
  set(b, 13, 19, TYPE.JUMP);       // launch off the near landing
  // gap of void at (13,20),(13,21) is already void (never carved)
  block(b, 13, 22, 0, TYPE.CHECK);
  rect(b, 14, 28, 18, 33, TYPE.GOAL);
  return finalize(b, {
    name: 'AERIAL', theme: 3, time: 55,
    start: { x: 3, y: 3 }, goal: { cx: 16, cy: 30 },
    checkpoints: [{ x: 13, y: 22 }],
    enemies: [{ type: 'slinky', x: 8, y: 12 }],
  });
}

// =====================================================================
// 5 — SILLY / SLIME. Sticky goo, funnel rails, chasing Slinkies, a
// suction wave shoving you toward the edge, one silly ice patch.
// =====================================================================
function course5() {
  const b = blank(22, 32);
  carve(b, [[3, 3], [10, 10], [10, 18], [17, 28]], 3);
  grade(b, 16, 1);
  block(b, 3, 3, 2, TYPE.START);
  rect(b, 8, 9, 12, 11, TYPE.SLIME);
  rect(b, 8, 14, 8, 16, TYPE.WALL);
  rect(b, 12, 14, 12, 16, TYPE.WALL);
  for (let y = 19; y <= 22; y++) addForce(b, 11, y, -0.010, 0.004);
  rect(b, 14, 22, 16, 24, TYPE.ICE);
  block(b, 10, 18, 1, TYPE.CHECK);
  rect(b, 15, 26, 20, 30, TYPE.GOAL);
  return finalize(b, {
    name: 'SLIME PIT', theme: 4, time: 55,
    start: { x: 3, y: 3 }, goal: { cx: 17, cy: 28 },
    checkpoints: [{ x: 10, y: 18 }],
    enemies: [{ type: 'slinky', x: 10, y: 13 }, { type: 'slinky', x: 15, y: 24 }],
  });
}

// =====================================================================
// 6 — THE GAUNTLET. Everything at once. Two checkpoints.
// =====================================================================
function course6() {
  const b = blank(24, 40);
  carve(b, [[3, 3], [9, 9], [9, 15], [16, 20], [16, 27], [20, 36]], 2);
  grade(b, 24, 1);
  block(b, 3, 3, 2, TYPE.START);
  rect(b, 6, 6, 9, 8, TYPE.ICE);
  rect(b, 10, 12, 11, 14, TYPE.ACID);
  block(b, 9, 15, 1, TYPE.CHECK);
  rect(b, 16, 18, 17, 19, TYPE.JUMP);
  set(b, 16, 20, TYPE.VOID);       // (path continues at 16,21+)
  rect(b, 14, 22, 14, 26, TYPE.WALL);
  rect(b, 18, 22, 18, 26, TYPE.WALL);
  block(b, 16, 27, 1, TYPE.CHECK);
  for (let y = 30; y <= 33; y++) addForce(b, 18, y, 0.006, -0.008);
  rect(b, 18, 34, 22, 38, TYPE.GOAL);
  return finalize(b, {
    name: 'THE GAUNTLET', theme: 5, time: 65,
    start: { x: 3, y: 3 }, goal: { cx: 20, cy: 36 },
    checkpoints: [{ x: 9, y: 15 }, { x: 16, y: 27 }],
    enemies: [
      { type: 'steelie', x: 12, y: 16 },
      { type: 'slinky', x: 16, y: 23 },
      { type: 'steelie', x: 19, y: 31 },
    ],
  });
}

export const COURSES = [course1, course2, course3, course4, course5, course6];
export function buildCourse(i) { return COURSES[i](); }
