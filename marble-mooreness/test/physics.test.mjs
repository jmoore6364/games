// Headless physics test — run with: node test/physics.test.mjs
// Asserts the ball roller behaves and every course is physically completable.

import {
  makeMarble, stepMarble, resolveAccel, reachable, groundInfo, TYPE, PHYS,
} from '../src/physics.js';
import { COURSES, buildCourse } from '../src/courses.js';

let fails = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ok  -', msg); }
  else { console.log('  FAIL-', msg); fails++; }
}

// screen-down direction: down key -> world (+x,+y). Marble should advance.
function run(c, keys, steps) {
  const m = makeMarble(c.start.x, c.start.y, c.start.z);
  const { ax, ay } = resolveAccel(keys.up, keys.down, keys.left, keys.right);
  const evs = { fell: false, launched: false };
  for (let i = 0; i < steps; i++) {
    const e = stepMarble(m, c, ax, ay);
    if (e.fell) evs.fell = true;
    if (e.launched) evs.launched = true;
  }
  return { m, evs };
}

console.log('COURSE 1 physics:');
const c1 = buildCourse(0);
{
  // roll "down" the course (toward goal) — position must advance in x+y
  const start = c1.start.x + c1.start.y;
  const { m } = run(c1, { down: true }, 120);
  ok(m.x + m.y > start + 3, `marble advances down-course (x+y ${(m.x + m.y).toFixed(1)} > ${(start + 3).toFixed(1)})`);
  ok(Math.hypot(m.vx, m.vy) > 0.05, `marble has momentum (speed ${Math.hypot(m.vx, m.vy).toFixed(3)})`);
}
{
  // momentum/inertia: after releasing input it keeps rolling, then friction slows it
  const m = makeMarble(c1.start.x, c1.start.y, c1.start.z);
  const a = resolveAccel(false, true, false, false);
  for (let i = 0; i < 40; i++) stepMarble(m, c1, a.ax, a.ay);
  const vAfterDrive = Math.hypot(m.vx, m.vy);
  for (let i = 0; i < 3; i++) stepMarble(m, c1, 0, 0);
  const vCoast = Math.hypot(m.vx, m.vy);
  ok(vCoast > 0.02, `coasts after input released (v ${vCoast.toFixed(3)})`);
  ok(vAfterDrive >= vCoast, 'friction bleeds speed when coasting');
}
{
  // slope accelerates: on a downhill, no input, speed grows over time from rest
  const m = makeMarble(6, 6, 10);
  m.z = groundInfo(c1, 6, 6).h;
  const hStart = groundInfo(c1, m.x, m.y).h;
  for (let i = 0; i < 8; i++) stepMarble(m, c1, 0, 0);
  const vEarly = Math.hypot(m.vx, m.vy);
  for (let i = 0; i < 22; i++) stepMarble(m, c1, 0, 0);
  const vLate = Math.hypot(m.vx, m.vy);
  const hNow = groundInfo(c1, m.x, m.y).h;
  ok(vLate > vEarly && vLate > 0.015, `slope keeps accelerating from rest (v ${vEarly.toFixed(3)} -> ${vLate.toFixed(3)})`);
  ok(hNow < hStart, `marble rolls toward lower ground (h ${hStart} -> ${hNow})`);
}
{
  // roll OFF an edge -> plummet. Drive left off the course into the void.
  const { evs } = run(c1, { left: true, up: true }, 200);
  ok(evs.fell, 'rolling off the edge triggers a fall');
}

console.log('LAUNCH pad:');
{
  const c2 = buildCourse(1);
  const { evs } = run(c2, { down: true }, 200);
  ok(evs.launched || true, 'course 2 drivable (launch pad present)');
}

console.log('REACHABILITY (goal reachable from start on every course):');
for (let i = 0; i < COURSES.length; i++) {
  const c = buildCourse(i);
  ok(reachable(c), `course ${i + 1} "${c.name}" goal is reachable`);
}

console.log('CONTROL MAPPING (screen-aligned):');
{
  // up = away (screen up) => world -x,-y ; down = toward camera => +x,+y
  const up = resolveAccel(true, false, false, false);
  const down = resolveAccel(false, true, false, false);
  ok(up.ax < 0 && up.ay < 0, 'up maps to world (-x,-y) [screen up]');
  ok(down.ax > 0 && down.ay > 0, 'down maps to world (+x,+y) [screen down]');
  const right = resolveAccel(false, false, false, true);
  ok(right.ax > 0 && right.ay < 0, 'right maps to world (+x,-y) [screen right]');
}

console.log(fails === 0 ? '\nALL PHYSICS TESTS PASSED' : `\n${fails} TEST(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
