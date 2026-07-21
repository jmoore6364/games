// Defender of the Moore — headless campaign tests.
// income, muster, catapults, battle odds, attack resolution & transfer,
// rival AI legality, a full scripted conquest, events, and save round-trip.

import * as C from '../src/campaign.js';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}`); }
}

// ---------------- map sanity ----------------
console.log('== map ==');
{
  const st = C.newGame({ seed: 1, diff: 1 });
  ok(st.terr.length === 12, `12 territories (${st.terr.length})`);
  for (let f = 0; f < 4; f++) ok(C.ownedBy(st, f).length === 3, `faction ${f} starts with 3 lands`);
  // adjacency symmetric & valid
  let sym = true;
  for (const t of st.terr) for (const n of C.neighborsOf(t.id)) if (!C.neighborsOf(n).includes(t.id)) sym = false;
  ok(sym, 'adjacency graph is symmetric');
  // connected: BFS reaches all 12
  const seen = new Set([0]); const q = [0];
  while (q.length) { const cur = q.pop(); for (const n of C.neighborsOf(cur)) if (!seen.has(n)) { seen.add(n); q.push(n); } }
  ok(seen.size === 12, `map is fully connected (${seen.size}/12)`);
  ok(st.terr.some((t) => t.castle) && st.terr.some((t) => !t.castle), 'mix of castles and open land');
  ok(st.terr.every((t) => t.army >= 1), 'every territory garrisoned');
}

// ---------------- income accrues ----------------
console.log('== economy ==');
{
  const st = C.newGame({ seed: 2, diff: 1 });
  const g0 = st.gold[0];
  const inc = C.totalIncome(st, 0);
  const got = C.collectIncome(st, 0);
  ok(got === inc && st.gold[0] === g0 + inc, `income accrues (+${inc} gold)`);
  // free levy raised some soldiers
  const st2 = C.newGame({ seed: 2, diff: 1 });
  st2.terr.filter((t) => t.owner === 0).forEach((t) => { t.army = 5; });
  const a0 = C.totalArmy(st2, 0);
  C.collectIncome(st2, 0);
  ok(C.totalArmy(st2, 0) > a0, 'free levy raises fresh soldiers each turn');
}

// ---------------- muster / catapult spend gold ----------------
console.log('== muster ==');
{
  const st = C.newGame({ seed: 3, diff: 1 });
  st.gold[0] = 100;
  const home = C.ownedBy(st, 0)[0];
  const a0 = home.army; const g0 = st.gold[0];
  const added = C.musterSoldiers(st, 0, home.id, 1);
  ok(added === C.MUSTER_BATCH && home.army === a0 + C.MUSTER_BATCH, `muster adds ${C.MUSTER_BATCH} soldiers`);
  ok(st.gold[0] === g0 - C.MUSTER_BATCH * C.SOLDIER_COST, 'muster spends gold');
  // cannot muster with no gold
  st.gold[0] = 0;
  ok(C.musterSoldiers(st, 0, home.id, 1) === 0, 'no muster without gold');
  // catapult
  st.gold[0] = C.CATAPULT_COST;
  ok(C.buyCatapult(st, 0) && st.catapults[0] === 1 && st.gold[0] === 0, 'catapult bought & paid for');
  ok(!C.buyCatapult(st, 0), 'cannot buy catapult when broke');
}

// ---------------- battle maths ----------------
console.log('== battle ==');
{
  ok(C.battleOdds(50, 10) > 0.8, 'big army usually wins');
  ok(C.battleOdds(10, 50) < 0.2, 'small army usually loses');
  ok(Math.abs(C.battleOdds(20, 20) - 0.5) < 1e-9, 'even armies are 50/50');
  ok(C.battleOdds(20, 20, 8) < 0.5, 'siege bonus favours the defender');
  // auto-resolve produces bounded losses and a boolean outcome
  const st = C.newGame({ seed: 9 });
  const res = C.autoResolveBattle(st, 30, 20);
  ok(typeof res.win === 'boolean' && res.atkLosses <= 30 && res.defLosses <= 20, 'auto-resolve bounded');
}

// ---------------- attack resolution transfers a territory ----------------
console.log('== attack ==');
{
  const st = C.newGame({ seed: 4, diff: 1 });
  // find a player territory adjacent to an enemy
  const targets = C.attackableTargets(st, 0);
  ok(targets.length > 0, 'player has adjacent enemy targets at start');
  const toId = targets[0];
  const from = C.launchPoints(st, 0, toId).sort((a, b) => st.terr[b].army - st.terr[a].army)[0];
  st.terr[from].army = 40;                    // give a strong host
  const foeBefore = st.terr[toId].owner;
  ok(foeBefore !== 0, 'target starts enemy-owned');
  // canAttack respects castle/catapult rule
  if (st.terr[toId].castle) { ok(!C.canAttack(st, 0, from, toId), 'cannot siege a castle without a catapult'); st.catapults[0] = 1; }
  ok(C.canAttack(st, 0, from, toId), 'attack is legal from an adjacent stronger land');
  C.applyAttackResult(st, from, toId, true);
  ok(st.terr[toId].owner === 0, 'winning an attack transfers the territory');
  ok(st.terr[toId].army >= 1, 'conquered land holds a garrison');

  // a losing attack does NOT transfer
  const st2 = C.newGame({ seed: 5, diff: 1 });
  const tg = C.attackableTargets(st2, 0)[0];
  const fr = C.launchPoints(st2, 0, tg)[0];
  const owner0 = st2.terr[tg].owner;
  C.applyAttackResult(st2, fr, tg, false);
  ok(st2.terr[tg].owner === owner0, 'a repelled attack keeps the land with its owner');
}

// ---------------- rival AI takes legal actions ----------------
console.log('== rival AI ==');
{
  const st = C.newGame({ seed: 6, diff: 2 });
  for (let round = 0; round < 40; round++) {
    C.collectIncome(st, 0);
    const news = C.runRivalTurns(st);
    // invariants: territory owners always valid, armies >= 1, total lands == 12
    let total = 0;
    for (const t of st.terr) { ok0(t.owner >= 0 && t.owner < 4, 'owner in range'); ok0(t.army >= 1, 'army >= 1'); total++; }
    ok0(total === 12, '12 lands preserved');
    if (news.some((n) => n.kind === 'attack')) { /* attacks happen */ }
    if (C.checkVictory(st)) break;
    st.turn++;
  }
  ok(true, 'rival AI ran 40 rounds without illegal state');
  // did rivals ever actually attack / grow?
  const st3 = C.newGame({ seed: 8, diff: 2 });
  let sawAttack = false, sawGrow = false;
  for (let i = 0; i < 60; i++) { const n = C.rivalTurn(st3, 1 + (i % 3)); if (n && n.kind === 'attack') sawAttack = true; if (n && (n.kind === 'muster' || n.kind === 'catapult')) sawGrow = true; }
  ok(sawAttack, 'rivals launch attacks');
  ok(sawGrow, 'rivals grow their forces');
}
let hiddenFail = 0;
function ok0(cond) { if (!cond) hiddenFail++; }

// ---------------- full scripted conquest ----------------
console.log('== conquest ==');
{
  const st = C.newGame({ seed: 11, diff: 0 });
  st.catapults[0] = 3;         // enough siege engines for the castles
  let steps = 0;
  while (!st.terr.every((t) => t.owner === 0) && steps < 200) {
    steps++;
    const targets = C.attackableTargets(st, 0);
    if (!targets.length) break;
    const toId = targets[0];
    const from = C.launchPoints(st, 0, toId).sort((a, b) => st.terr[b].army - st.terr[a].army)[0];
    st.terr[from].army = Math.max(st.terr[from].army, 40);   // muster a decisive host
    C.applyAttackResult(st, from, toId, true);               // win the mini-game
  }
  ok(st.terr.every((t) => t.owner === 0), `whole realm conquered in ${steps} assaults`);
  ok(C.checkVictory(st) === 'win', 'checkVictory reports a win');
  ok(!st.alive[1] && !st.alive[2] && !st.alive[3], 'all rivals eliminated');
}

// ---------------- defeat condition ----------------
console.log('== defeat ==');
{
  const st = C.newGame({ seed: 12 });
  for (const t of st.terr) if (t.owner === 0) t.owner = 1;    // lose every land
  C.refreshAlive(st);
  ok(C.checkVictory(st) === 'lose', 'losing all territories is a defeat');
}

// ---------------- events ----------------
console.log('== events ==');
{
  const st = C.newGame({ seed: 13, diff: 1 }); st.turn = 5;
  let win = 0, saw = {};
  for (let i = 0; i < 400; i++) { const ev = C.rollEvent(st); if (ev) { saw[ev.type] = true; if (ev.interactive) win++; } }
  ok(Object.keys(saw).length >= 3, `variety of events fired (${Object.keys(saw).join(',')})`);
  // interactive resolution grants rewards on a win
  const t1 = C.newGame({ seed: 1 }); const g0 = t1.gold[0];
  const r = C.resolveEvent(t1, { type: 'tournament', reward: { gold: 60, renown: 30 } }, true);
  ok(t1.gold[0] === g0 + 60 && t1.renown === 30 && r.text.length > 0, 'winning a tournament pays out');
  const t2 = C.newGame({ seed: 1 });
  C.resolveEvent(t2, { type: 'maiden', reward: { renown: 45, muster: 12 } }, true);
  ok(t2.maidenSaved && t2.renown === 45, 'rescuing the maiden sets the alliance flag');
}

// ---------------- save round-trip ----------------
console.log('== save ==');
{
  const st = C.newGame({ seed: 21, diff: 2 });
  st.gold[0] = 333; st.renown = 77; st.catapults[0] = 2; st.turn = 9;
  st.terr[5].owner = 0; st.terr[5].army = 44; st.maidenSaved = true;
  const json = C.serialize(st);
  const st2 = C.deserialize(json);
  ok(st2.gold[0] === 333 && st2.renown === 77 && st2.turn === 9, 'scalar state round-trips');
  ok(st2.terr[5].owner === 0 && st2.terr[5].army === 44, 'territory state round-trips');
  ok(st2.maidenSaved === true && st2.catapults[0] === 2, 'flags & catapults round-trip');
  // deterministic rng carries so the campaign continues identically
  const a = C.rollEvent(st); const b = C.rollEvent(st2);
  ok(JSON.stringify(a) === JSON.stringify(b), 'rng seed round-trips (same next event)');
}

if (hiddenFail) { fail += hiddenFail; console.error(`FAIL  ${hiddenFail} rival-AI invariant checks`); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
