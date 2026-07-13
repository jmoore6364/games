// Level analysis shared by the editor (live feedback while painting) and the
// npm-test validator: structural checks plus a walk of the movement graph
// (walk, climb, hang, fall, dig-and-drop) proving gold and exit are reachable.
import { COLS, ROWS } from './levels.js';

export const LEGAL_CHARS = new Set([' ', '#', '@', 'H', '-', 'T', 'X', '$', 'P', 'G']);

// structural char at (x,y): entities and gold behave like empty space
export function structAt(rows, x, y, revealed) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return '@';
  let c = rows[y][x];
  if (c === '$' || c === 'P' || c === 'G') c = ' ';
  if (c === 'X') c = revealed ? 'H' : ' ';
  return c;
}

export function isSupport(rows, x, y, revealed) {
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

// Full analysis of a level's rows (array of ROWS strings of COLS chars).
// Returns { ok, problems: [msg...], badGold: [[x,y]...], gold, guards }.
export function analyze(rows) {
  const problems = [];
  const badGold = [];

  if (!Array.isArray(rows) || rows.length !== ROWS ||
      rows.some(r => typeof r !== 'string' || r.length !== COLS)) {
    return { ok: false, problems: [`LEVEL MUST BE ${COLS}x${ROWS}`], badGold, gold: 0, guards: 0 };
  }
  for (let y = 0; y < ROWS; y++) {
    for (const c of rows[y]) {
      if (!LEGAL_CHARS.has(c)) {
        return { ok: false, problems: [`ILLEGAL CHAR '${c}' IN ROW ${y}`], badGold, gold: 0, guards: 0 };
      }
    }
  }

  const find = ch => {
    const out = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push([x, y]); }));
    return out;
  };
  const players = find('P'), golds = find('$'), guards = find('G'), exits = find('X');

  if (players.length === 0) problems.push('NO START - PLACE P');
  if (players.length > 1) problems.push('MORE THAN ONE START');
  if (golds.length === 0) problems.push('NO GOLD - PLACE $');
  if (exits.length === 0) problems.push('NO EXIT - PLACE X');

  if (exits.length) {
    if (!exits.some(([, y]) => y === 0)) problems.push('EXIT NEVER REACHES TOP ROW');
    for (const [x, y] of exits) {
      if (y > 0 && structAt(rows, x, y - 1, true) !== 'H') {
        problems.push(`EXIT AT ${x},${y} BLOCKED ABOVE`);
        break;
      }
    }
  }

  for (const [x, y] of golds) {
    if (!isSupport(rows, x, y, false)) { problems.push(`FLOATING GOLD AT ${x},${y}`); break; }
  }
  for (const [x, y] of [...players, ...guards]) {
    if (!isSupport(rows, x, y, false)) { problems.push(`FLOATING SPAWN AT ${x},${y}`); break; }
  }

  if (players.length === 1) {
    const [px, py] = players[0];
    const pre = reachable(rows, px, py, false);
    for (const [x, y] of golds) {
      if (!pre.has(x + ',' + y)) badGold.push([x, y]);
    }
    if (badGold.length) problems.push(`${badGold.length} GOLD UNREACHABLE`);
    if (exits.length && exits.some(([, y]) => y === 0)) {
      const post = reachable(rows, px, py, true);
      if (![...post].some(k => k.endsWith(',0'))) problems.push('EXIT UNREACHABLE');
    }
  }

  return { ok: problems.length === 0, problems, badGold, gold: golds.length, guards: guards.length };
}
