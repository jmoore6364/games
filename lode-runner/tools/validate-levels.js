// Structural + reachability validator for level data. Run with: npm test
// Simulates the movement rules (walk, climb, hang, fall, dig-and-drop) as a
// directed graph and checks every gold and the revealed exit are reachable.
import { LEVELS, COLS, ROWS } from '../src/levels.js';

const LEGAL = new Set([' ', '#', '@', 'H', '-', 'T', 'X', '$', 'P', 'G']);
let failures = 0;

function fail(li, msg) {
  failures++;
  console.error(`  FAIL [${li + 1} ${LEVELS[li].name}] ${msg}`);
}

// structural char at (x,y): entities and gold behave like empty space
function structAt(rows, x, y, revealed) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return '@';
  let c = rows[y][x];
  if (c === '$' || c === 'P' || c === 'G') c = ' ';
  if (c === 'X') c = revealed ? 'H' : ' ';
  return c;
}

function isSupport(rows, x, y, revealed) {
  const cur = structAt(rows, x, y, revealed);
  if (cur === 'H' || cur === '-') return true;
  const below = structAt(rows, x, y + 1, revealed);
  return below === '#' || below === '@' || below === 'H';
}

// legal moves from (x,y), including "dig the brick diagonally below and drop in"
function movesFrom(rows, x, y, revealed) {
  const out = [];
  const cur = structAt(rows, x, y, revealed);
  const below = structAt(rows, x, y + 1, revealed);
  const fallable = below !== '#' && below !== '@'; // 'T' is fall-through
  if (!isSupport(rows, x, y, revealed) && fallable) return [[x, y + 1]]; // forced fall
  for (const dx of [-1, 1]) {
    const t = structAt(rows, x + dx, y, revealed);
    if (t !== '#' && t !== '@' && t !== 'T') out.push([x + dx, y]);
  }
  if (cur === 'H') {
    const up = structAt(rows, x, y - 1, revealed);
    if (up !== '#' && up !== '@' && up !== 'T') out.push([x, y - 1]);
  }
  if (fallable) out.push([x, y + 1]);
  // digging: needs footing, not hanging on a rope, clear swing space beside
  if (cur !== '-' && isSupport(rows, x, y, revealed)) {
    for (const dx of [-1, 1]) {
      if (structAt(rows, x + dx, y + 1, revealed) === '#' &&
          structAt(rows, x + dx, y, revealed) === ' ') {
        out.push([x + dx, y + 1]);
      }
    }
  }
  return out;
}

function reachable(rows, sx, sy, revealed) {
  const seen = new Set([sx + ',' + sy]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [nx, ny] of movesFrom(rows, x, y, revealed)) {
      const k = nx + ',' + ny;
      if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}

LEVELS.forEach((lv, li) => {
  const rows = lv.rows;
  const before = failures;
  if (rows.length !== ROWS) fail(li, `has ${rows.length} rows, want ${ROWS}`);
  rows.forEach((r, y) => {
    if (r.length !== COLS) fail(li, `row ${y} has ${r.length} cols, want ${COLS}`);
    for (const c of r) if (!LEGAL.has(c)) fail(li, `row ${y} has illegal char '${c}'`);
  });
  if (failures > before) return;

  const find = ch => {
    const out = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
    return out;
  };
  const players = find('P'), golds = find('$'), guards = find('G'), exits = find('X');
  if (players.length !== 1) fail(li, `has ${players.length} player spawns, want 1`);
  if (golds.length < 1) fail(li, 'has no gold');
  if (exits.length < 1) fail(li, 'has no hidden exit ladder');

  for (const [x, y] of [...players, ...golds, ...guards]) {
    if (!isSupport(rows, x, y, false)) fail(li, `unsupported '${rows[y][x]}' at (${x},${y})`);
  }
  // hidden ladders must form column(s) reaching the top row
  if (!exits.some(([, y]) => y === 0)) fail(li, 'hidden ladder never reaches row 0');
  for (const [x, y] of exits) {
    if (y > 0 && structAt(rows, x, y - 1, true) !== 'H') {
      fail(li, `hidden ladder at (${x},${y}) has no ladder continuing above`);
    }
  }
  if (players.length !== 1) return;

  const [px, py] = players[0];
  const pre = reachable(rows, px, py, false);
  for (const [x, y] of golds) {
    if (!pre.has(x + ',' + y)) fail(li, `gold at (${x},${y}) unreachable`);
  }
  const post = reachable(rows, px, py, true);
  if (![...post].some(k => k.endsWith(',0'))) fail(li, 'exit (top row) unreachable after reveal');
  if (failures === before) console.log(`  ok   [${li + 1} ${lv.name}] ${golds.length} gold, ${guards.length} guards`);
});

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log(`\nall ${LEVELS.length} levels valid`);
