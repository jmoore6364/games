// Validates the shipped campaign levels using the same analysis the in-game
// editor runs live (src/validate.js). Run with: npm test
import { LEVELS } from '../src/levels.js';
import { analyze } from '../src/validate.js';

let failures = 0;

LEVELS.forEach((lv, li) => {
  const a = analyze(lv.rows);
  if (a.ok) {
    console.log(`  ok   [${li + 1} ${lv.name}] ${a.gold} gold, ${a.guards} guards`);
  } else {
    failures += a.problems.length;
    for (const p of a.problems) console.error(`  FAIL [${li + 1} ${lv.name}] ${p}`);
  }
});

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log(`\nall ${LEVELS.length} levels valid`);
