// Headless fuzz of the core simulation: run every level with random inputs
// for a few simulated minutes and check invariants hold. Run via npm test.
import { Game } from '../src/game.js';
import { LEVELS, COLS, ROWS } from '../src/levels.js';

let failures = 0;
const DT = 1 / 60;

for (let li = 0; li < LEVELS.length; li++) {
  let deaths = 0, wins = 0, digs = 0, traps = 0, goldGot = 0;
  for (let run = 0; run < 6; run++) {
    const g = new Game(LEVELS[li]);
    let ctl = { dx: 0, dy: 0, digL: false, digR: false };
    try {
      for (let f = 0; f < 60 * 120 && g.status === 'play'; f++) {
        if (f % 13 === 0) {
          ctl = {
            dx: [-1, -1, 0, 1, 1][Math.floor(Math.random() * 5)],
            dy: [-1, 0, 0, 1][Math.floor(Math.random() * 4)],
            digL: Math.random() < 0.08,
            digR: Math.random() < 0.08,
          };
        }
        g.update(DT, ctl);
        ctl.digL = ctl.digR = false;
        for (const e of g.drainEvents()) {
          if (e === 'dig') digs++;
          if (e === 'trap') traps++;
          if (e === 'gold') goldGot++;
        }
        const p = g.player;
        if (p.x < -0.01 || p.x > COLS - 0.99 || p.y < -1.01 || p.y > ROWS - 0.99) {
          throw new Error(`player out of bounds at (${p.x.toFixed(2)},${p.y.toFixed(2)})`);
        }
        const cell = g.at(Math.round(p.x), Math.round(p.y));
        if (cell === '@') throw new Error(`player inside solid at (${p.cx},${p.cy})`);
        for (const gd of g.guards) {
          if (gd.dead) continue;
          if (gd.x < -0.01 || gd.x > COLS - 0.99 || gd.y < -0.01 || gd.y > ROWS - 0.99) {
            throw new Error(`guard out of bounds at (${gd.x.toFixed(2)},${gd.y.toFixed(2)})`);
          }
        }
        // gold conservation: on map + carried + collected == total
        if (g.gold.size + g.carried + (g.goldCollected || 0) > g.goldTotal) {
          throw new Error('gold multiplied');
        }
      }
      if (g.status === 'dead') deaths++;
      if (g.status === 'won') wins++;
    } catch (err) {
      failures++;
      console.error(`  FAIL [${li + 1} ${LEVELS[li].name}] run ${run}: ${err.message}`);
      break;
    }
  }
  console.log(`  ok   [${li + 1} ${LEVELS[li].name}] deaths=${deaths} digs=${digs} traps=${traps} gold=${goldGot}`);
}

if (failures) { console.error(`\n${failures} fuzz failure(s)`); process.exit(1); }
console.log('\nfuzz passed');
