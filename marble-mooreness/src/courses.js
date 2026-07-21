// courses.js — the six surreal isometric courses as heightmaps + hazards.
//
// Pure data (no DOM). Each course is a grid of surface-type codes and a
// parallel heightmap, built with a small carving toolkit so paths stay
// orthogonally connected (so reachable() in physics.js can prove them
// completable). Courses descend from a high START to a low GOAL: the overall
// downhill keeps the marble rolling the right way.

import { TYPE } from './physics.js';

// ---- builder toolkit ----
function blank(w, h, fill = TYPE.VOID, fh = 0) {
  const cells = new Int8Array(w * h).fill(fill);
  const height = new Int8Array(w * h).fill(fh);
  return { w, h, cells, height, forces: {}, enemies: [], checkpoints: [] };
}
function idx(b, x, y) { return y * b.w + x; }
function inB(b, x, y) { return x >= 0 && y >= 0 && x < b.w && y < b.h; }
function set(b, x, y, t, h) {
  if (!inB(b, x, y)) return;
  b.cells[idx(b, x, y)] = t;
  if (h != null) b.height[idx(b, x, y)] = h;
}
function block(b, cx, cy, r, t, h) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) set(b, x, y, t, h);
}
function rect(b, x0, y0, x1, y1, t, h) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(b, x, y, t, h);
}
// Walk cell-by-cell from a->b (orthogonal steps only => 4-connected), stamping
// a square of half-width r, with height lerped along the whole path.
function carve(b, pts, r, hStart, hEnd, t = TYPE.FLOOR) {
  // total manhattan length for height lerp
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++)
    total += Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
  let done = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    let [x, y] = pts[i];
    const [tx, ty] = pts[i + 1];
    const stamp = () => {
      const f = total ? done / total : 0;
      const h = Math.round(hStart + (hEnd - hStart) * f);
      block(b, x, y, r, t, h);
    };
    stamp();
    while (x !== tx || y !== ty) {
      const dx = tx - x, dy = ty - y;
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) x += Math.sign(dx);
      else if (dy !== 0) y += Math.sign(dy);
      else x += Math.sign(dx);
      done++;
      stamp();
    }
  }
}
function finalize(b, opts) {
  let min = Infinity;
  for (let i = 0; i < b.cells.length; i++) if (b.cells[i] !== TYPE.VOID) min = Math.min(min, b.height[i]);
  if (!isFinite(min)) min = 0;
  b.killZ = min - 6;
  return Object.assign(b, opts);
}
function addForce(b, x, y, fx, fy) {
  set(b, x, y, TYPE.ARROW);
  b.forces[idx(b, x, y)] = { fx, fy };
}

// =====================================================================
// COURSE 1 — PRACTICE. A wide, kindly ramp. Nothing to fear.
// =====================================================================
function course1() {
  const b = blank(20, 26);
  carve(b, [[3, 3], [10, 10], [16, 22]], 4, 14, 1);
  // start & goal pads
  block(b, 3, 3, 2, TYPE.START, 14);
  rect(b, 13, 20, 18, 24, TYPE.GOAL, 1);
  return finalize(b, {
    name: 'PRACTICE', theme: 0, time: 75,
    start: { x: 3, y: 3, z: 14 },
    goal: { cx: 16, cy: 22 },
  });
}

// =====================================================================
// COURSE 2 — BEGINNER. Narrower, a rolling ramp, one Steelie, edge notches.
// =====================================================================
function course2() {
  const b = blank(20, 30);
  carve(b, [[3, 3], [9, 9], [9, 16], [16, 26]], 2, 18, 1);
  block(b, 3, 3, 2, TYPE.START, 18);
  // a little ramp lump to launch over
  rect(b, 8, 12, 10, 13, TYPE.RAMP, 12);
  rect(b, 8, 14, 10, 14, TYPE.JUMP, 9);
  // goal
  rect(b, 14, 24, 18, 28, TYPE.GOAL, 1);
  return finalize(b, {
    name: 'BEGINNER', theme: 1, time: 55,
    start: { x: 3, y: 3, z: 18 },
    goal: { cx: 16, cy: 26 },
    enemies: [{ type: 'steelie', x: 12, y: 20 }],
  });
}

// =====================================================================
// COURSE 3 — INTERMEDIATE. A slime pool to skirt, a jump gap, a checkpoint.
// =====================================================================
function course3() {
  const b = blank(22, 34);
  carve(b, [[3, 3], [8, 9], [8, 17], [15, 22], [18, 30]], 2, 20, 1);
  block(b, 3, 3, 2, TYPE.START, 20);
  // slime pool sunk into the mid path (roll around the rim)
  rect(b, 7, 13, 9, 15, TYPE.SLIME, 13);
  // launch gap: jump pad, then a void notch, land on the far ledge
  rect(b, 8, 18, 8, 18, TYPE.JUMP, 12);
  set(b, 8, 19, TYPE.VOID);
  set(b, 9, 19, TYPE.VOID);
  // checkpoint on the descent
  block(b, 13, 21, 1, TYPE.CHECK, 9);
  b.checkpoints = [{ x: 13, y: 21, z: 9 }];
  rect(b, 16, 28, 20, 32, TYPE.GOAL, 1);
  return finalize(b, {
    name: 'INTERMEDIATE', theme: 2, time: 50,
    start: { x: 3, y: 3, z: 20 },
    goal: { cx: 18, cy: 30 },
    enemies: [{ type: 'steelie', x: 9, y: 11 }, { type: 'slinky', x: 16, y: 25 }],
  });
}

// =====================================================================
// COURSE 4 — AERIAL. Narrow catwalks over the void. One slip and you fall.
// =====================================================================
function course4() {
  const b = blank(20, 36);
  // narrow 1-wide bridge (r=0) with a couple of small landings
  carve(b, [[3, 3], [7, 7]], 1, 22, 20);          // start platform
  carve(b, [[7, 7], [7, 14], [13, 18]], 0, 20, 14); // thin catwalk
  block(b, 13, 18, 1, TYPE.FLOOR, 14);            // landing pad
  // launch across a gap
  set(b, 13, 19, TYPE.JUMP, 14);
  // gap of pure void at y=20..21, land on far side
  carve(b, [[13, 22], [16, 30]], 1, 10, 1);        // far descent to goal
  block(b, 13, 22, 1, TYPE.FLOOR, 10);
  block(b, 3, 3, 1, TYPE.START, 22);
  rect(b, 14, 28, 18, 33, TYPE.GOAL, 1);
  // checkpoint on the far landing
  block(b, 13, 22, 0, TYPE.CHECK, 10);
  b.checkpoints = [{ x: 13, y: 22, z: 10 }];
  return finalize(b, {
    name: 'AERIAL', theme: 3, time: 55,
    start: { x: 3, y: 3, z: 22 },
    goal: { cx: 16, cy: 30 },
    enemies: [{ type: 'slinky', x: 7, y: 11 }],
  });
}

// =====================================================================
// COURSE 5 — SILLY / SLIME. Sticky goo, funnel rails, chasing Slinkies,
// suction waves shoving you toward the edge.
// =====================================================================
function course5() {
  const b = blank(22, 32);
  carve(b, [[3, 3], [10, 10], [10, 18], [17, 28]], 3, 16, 1);
  block(b, 3, 3, 2, TYPE.START, 16);
  // slime slick across the middle
  rect(b, 8, 9, 12, 11, TYPE.SLIME, 11);
  // funnel: rails squeezing the path
  rect(b, 8, 14, 8, 16, TYPE.WALL, 20);
  rect(b, 12, 14, 12, 16, TYPE.WALL, 20);
  // suction wave shoving toward the left edge as you pass
  for (let y = 19; y <= 22; y++) addForce(b, 11, y, -0.010, 0.004);
  // ice patch for a laugh
  rect(b, 14, 22, 16, 24, TYPE.ICE, 6);
  rect(b, 15, 26, 20, 30, TYPE.GOAL, 1);
  block(b, 10, 18, 1, TYPE.CHECK, 6);
  b.checkpoints = [{ x: 10, y: 18, z: 6 }];
  return finalize(b, {
    name: 'SLIME PIT', theme: 4, time: 55,
    start: { x: 3, y: 3, z: 16 },
    goal: { cx: 17, cy: 28 },
    enemies: [{ type: 'slinky', x: 10, y: 13 }, { type: 'slinky', x: 15, y: 24 }],
  });
}

// =====================================================================
// COURSE 6 — THE GAUNTLET. Everything at once. Two checkpoints.
// =====================================================================
function course6() {
  const b = blank(24, 40);
  carve(b, [[3, 3], [9, 9], [9, 15], [16, 20], [16, 27], [20, 36]], 2, 24, 1);
  block(b, 3, 3, 2, TYPE.START, 24);
  // ice run early — hard to steer
  rect(b, 6, 6, 9, 8, TYPE.ICE, 20);
  // acid pool guarding the first bend
  rect(b, 10, 12, 11, 14, TYPE.ACID, 15);
  // checkpoint 1
  block(b, 9, 15, 1, TYPE.CHECK, 13);
  // launch gap over the void
  set(b, 13, 18, TYPE.JUMP, 12);
  set(b, 14, 19, TYPE.VOID);
  set(b, 13, 19, TYPE.VOID);
  // narrow rail section
  rect(b, 15, 21, 15, 25, TYPE.WALL, 20);
  rect(b, 18, 21, 18, 25, TYPE.WALL, 20);
  // checkpoint 2
  block(b, 16, 27, 1, TYPE.CHECK, 7);
  // suction wave near the finish
  for (let y = 30; y <= 33; y++) addForce(b, 18, y, 0.006, -0.008);
  rect(b, 18, 34, 22, 38, TYPE.GOAL, 1);
  b.checkpoints = [{ x: 9, y: 15, z: 13 }, { x: 16, y: 27, z: 7 }];
  return finalize(b, {
    name: 'THE GAUNTLET', theme: 5, time: 65,
    start: { x: 3, y: 3, z: 24 },
    goal: { cx: 20, cy: 36 },
    enemies: [
      { type: 'steelie', x: 12, y: 16 },
      { type: 'slinky', x: 16, y: 23 },
      { type: 'steelie', x: 19, y: 31 },
    ],
  });
}

export const COURSES = [course1, course2, course3, course4, course5, course6];
export function buildCourse(i) { return COURSES[i](); }
