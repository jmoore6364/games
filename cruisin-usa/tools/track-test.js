// Sanity checks for the course builder (node-runnable, no DOM).
import { buildCourses, SEGMENT_LENGTH } from '../src/track.js';

// sprite names game.js can resolve — keep in sync with sprites.js atlas
const KNOWN_SPRITES = new Set([
  'palm', 'bush', 'bushDry', 'cactus', 'rock', 'mesa', 'lamp',
  'building0', 'building1', 'building2',
  'billboard0', 'billboard1', 'billboard2', 'billboardNeon0', 'billboardNeon1',
  'archStart', 'archCheck',
]);

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.error(`  FAIL: ${msg}`); }
}

const courses = buildCourses();
check(courses.length >= 3, 'at least 3 courses');

for (const c of courses) {
  console.log(`course ${c.id} (${c.name}): ${c.segments.length} segments, ${(c.trackLength / SEGMENT_LENGTH / 60).toFixed(0)}s per lap at top speed`);
  check(c.segments.length > 500, `${c.id}: has a meaningful track length`);
  check(c.trackLength === c.segments.length * SEGMENT_LENGTH, `${c.id}: trackLength consistent`);
  check(c.laps >= 1 && c.timeStart > 0 && c.timeBonus > 0, `${c.id}: race params sane`);
  check(c.checkpoints.length === 2, `${c.id}: two checkpoints per lap`);

  let prevY = 0;
  c.segments.forEach((s, i) => {
    check(Number.isFinite(s.curve), `${c.id} seg ${i}: finite curve`);
    check(Number.isFinite(s.p1y) && Number.isFinite(s.p2y), `${c.id} seg ${i}: finite elevation`);
    check(s.p1y === prevY, `${c.id} seg ${i}: elevation continuous`);
    prevY = s.p2y;
    for (const sp of s.sprites) {
      check(KNOWN_SPRITES.has(sp.name), `${c.id} seg ${i}: unknown sprite '${sp.name}'`);
      if (!sp.name.startsWith('arch')) {
        check(Math.abs(sp.offset) > 1.1, `${c.id} seg ${i}: scenery '${sp.name}' off the road (offset ${sp.offset})`);
      }
    }
  });
  // loop seam: last segment must return elevation to zero(ish)
  const endY = c.segments[c.segments.length - 1].p2y;
  check(Math.abs(endY) < SEGMENT_LENGTH * 2, `${c.id}: elevation returns to ~0 at loop seam (got ${endY.toFixed(1)})`);
  check(c.segments[0].marker === 'start', `${c.id}: start marker on segment 0`);
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall track checks passed');
