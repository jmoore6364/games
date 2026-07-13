// Deterministic checks of the core mechanics on a synthetic level:
// dig -> guard falls in + drops carried gold -> climbs out -> kills player;
// hole seals on trapped guard -> dies + respawns; player sealed in hole dies;
// collect gold -> exit reveals -> climb out the top -> won. Run via npm test.
import { Game } from '../src/game.js';

const TEST_LEVEL = {
  name: 'TEST',
  rows: [
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X                           ',
    'X    P        $     G       ',
    '############################',
    '@@@@@@@@@@@@@@@@@@@@@@@@@@@@',
  ],
};

const DT = 1 / 60;
const IDLE = { dx: 0, dy: 0, digL: false, digR: false };
let checks = 0, failures = 0;

function assert(cond, msg) {
  checks++;
  if (!cond) { failures++; console.error(`  FAIL ${msg}`); }
  else console.log(`  ok   ${msg}`);
}

// run until predicate true or timeout (simulated seconds); ctlFn per frame
function runUntil(g, pred, secs, ctlFn) {
  const events = [];
  for (let f = 0; f < secs * 60; f++) {
    g.update(DT, ctlFn ? ctlFn(g) : IDLE);
    events.push(...g.drainEvents());
    if (pred(g, events)) return events;
  }
  return null;
}

function levelNoGuard() {
  return { name: 'TEST', rows: TEST_LEVEL.rows.map(r => r.replace('G', ' ')) };
}

// --- scenario 1: dig, guard grabs gold en route, trapped, drops it, escapes, kills ---
{
  const g = new Game(TEST_LEVEL);
  g.update(DT, { ...IDLE, digR: true });
  assert(g.holes.has('6,14'), 'digging right opens a hole below-right');
  let ev = runUntil(g, (_, e) => e.includes('trap'), 8);
  assert(ev, 'chasing guard falls into the hole and is trapped');
  const guard = g.guards[0];
  assert(guard.trapped && guard.cx === 6 && guard.cy === 14, 'guard is trapped inside the hole cell');
  assert(!guard.carrying && g.gold.has('6,13'), 'guard picked up gold en route and dropped it on the rim');
  ev = runUntil(g, gg => gg.status === 'dead', 8);
  assert(ev && g.deathCause === 'guard', 'guard climbs out and catches the idle player');
}

// --- scenario 2: hole seals on the trapped guard -> guard dies, respawns up top ---
{
  const g = new Game(TEST_LEVEL);
  g.update(DT, { ...IDLE, digR: true });
  runUntil(g, () => g.guards[0].trapped, 8);
  const hole = g.holes.get('6,14');
  assert(hole, 'hole still open when guard is trapped');
  hole.age = 6.95; // fast-forward to just before sealing
  const ev = runUntil(g, (_, e) => e.includes('guardDie'), 2);
  assert(ev, 'sealing hole kills the trapped guard');
  assert(runUntil(g, gg => !gg.guards[0].dead && gg.guards[0].cy <= 2, 4),
    'guard respawns near the top of the screen');
  assert(g.gold.size + g.carried === 1, 'gold is conserved through guard death');
}

// --- scenario 3: player caught in his own sealing hole dies ---
{
  const g = new Game(levelNoGuard());
  g.update(DT, { ...IDLE, digR: true });
  runUntil(g, gg => gg.digT <= 0, 1);
  runUntil(g, gg => gg.player.cx === 6 && gg.player.cy === 14 && !gg.player.moving, 3,
    gg => (gg.player.cy < 14 ? { ...IDLE, dx: 1 } : IDLE));
  assert(g.player.cx === 6 && g.player.cy === 14, 'player can walk into his own hole');
  const ev = runUntil(g, gg => gg.status === 'dead', 9);
  assert(ev && g.deathCause === 'sealed', 'hole seals over the player and kills him');
}

// --- scenario 4: collect all gold -> ladder reveals -> climb out the top -> won ---
{
  const g = new Game(levelNoGuard());
  let ev = runUntil(g, (_, e) => e.includes('reveal'), 6, gg => ({ ...IDLE, dx: 1 }));
  assert(ev, 'collecting the last gold reveals the hidden ladder');
  assert(g.at(0, 5) === 'H', 'hidden ladder cells now behave as ladder');
  ev = runUntil(g, gg => gg.status === 'won', 20,
    gg => (gg.player.cx > 0 ? { ...IDLE, dx: -1 } : { ...IDLE, dy: -1 }));
  assert(ev && ev.includes('win'), 'climbing the revealed ladder to the top wins the level');
}

console.log(failures ? `\n${failures}/${checks} mechanic checks failed` : `\nall ${checks} mechanic checks passed`);
process.exit(failures ? 1 : 0);
