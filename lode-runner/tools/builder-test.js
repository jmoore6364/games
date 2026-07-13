// Checks for the builder's live analysis (src/validate.js) and the
// share-link codec (src/share.js). Run via npm test.
import { analyze } from '../src/validate.js';
import { encodeShare, decodeShare } from '../src/share.js';

let checks = 0, failures = 0;
function assert(cond, msg) {
  checks++;
  if (!cond) { failures++; console.error(`  FAIL ${msg}`); }
  else console.log(`  ok   ${msg}`);
}

const W = 28;
const row = s => (s + ' '.repeat(W)).slice(0, W);
function makeRows(edits) { // edits: {y: rowString}
  const rows = [];
  for (let y = 0; y < 16; y++) rows.push(row(edits[y] || ''));
  return rows;
}

// a small valid level: floor, player, gold, exit column
const good = makeRows({
  0: 'X',
  1: 'X', 2: 'X', 3: 'X', 4: 'X', 5: 'X', 6: 'X', 7: 'X',
  8: 'X', 9: 'X', 10: 'X', 11: 'X', 12: 'X', 13: 'X',
  14: 'X  P    $      G            ',
  15: '@'.repeat(W),
});
{
  const a = analyze(good);
  assert(a.ok, 'valid level analyzes clean');
  assert(a.gold === 1 && a.guards === 1, 'counts gold and guards');
}

{
  const a = analyze(makeRows({ 15: '@'.repeat(W) }));
  assert(a.problems.some(p => p.includes('NO START')), 'flags missing start');
  assert(a.problems.some(p => p.includes('NO GOLD')), 'flags missing gold');
  assert(a.problems.some(p => p.includes('NO EXIT')), 'flags missing exit');
}

{
  // gold sealed inside solid blocks is unreachable
  const rows = good.map((r, y) => (y === 14 ? row('X  P   @$@     G') : r));
  const a = analyze(rows);
  assert(!a.ok && a.badGold.length === 1 && a.badGold[0][0] === 8,
    'flags walled-off gold as unreachable');
}

{
  // exit column that stops halfway never reaches the top
  const rows = good.map((r, y) => (y <= 7 ? row('') : r));
  const a = analyze(rows);
  assert(a.problems.some(p => p.includes('TOP ROW') || p.includes('BLOCKED ABOVE')),
    'flags broken exit column');
}

{
  const def = { name: 'ROUND TRIP', rows: good };
  const back = decodeShare(encodeShare(def));
  assert(back.name === 'ROUND TRIP' && back.rows.join('|') === good.join('|'),
    'share link round-trips name and rows');
  let threw = false;
  try { decodeShare('not-a-level'); } catch { threw = true; }
  assert(threw, 'decodeShare rejects garbage');
  threw = false;
  try { decodeShare(encodeShare({ name: 'BAD', rows: ['zz'] })); } catch { threw = true; }
  assert(threw, 'decodeShare rejects malformed rows');
}

console.log(failures ? `\n${failures}/${checks} builder checks failed` : `\nall ${checks} builder checks passed`);
process.exit(failures ? 1 : 0);
