// Node verification for the headless engine.
import { simGame, soak, makeRNG, GameState, resolveAtBat } from './src/sim.js';
import * as L from './src/league.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } };

// ---- build teams ----
const rng = makeRNG(999);
const user = L.makeUserTeam('Test Moores', 0, 0, rng);
const baseline = L.makeTeam(L.CPU_DEFS[2], makeRNG(1)); // mid tier

// ---- (1) legality + soak ----
console.log('== (1) 50-game soak (mid vs mid) ==');
let legalityFails = 0;
for (let i = 0; i < 60; i++) {
  const r = simGame(baseline, L.makeTeam(L.CPU_DEFS[2], makeRNG(i + 50)), 1000 + i);
  // legality checks
  if (r.score[0] < 0 || r.score[1] < 0) legalityFails++;
  if (r.innings < 5) legalityFails++;
  if (r.winner === -1) legalityFails++; // baseball can't tie
  // line score sums to total runs
  const la = r.line[0].reduce((a, b) => a + (b || 0), 0);
  const lh = r.line[1].reduce((a, b) => a + (b || 0), 0);
  if (la !== r.score[0] || lh !== r.score[1]) legalityFails++;
  // box score run totals match
  const boxR0 = r.box[0].bat.reduce((a, b) => a + b.r, 0);
  const boxR1 = r.box[1].bat.reduce((a, b) => a + b.r, 0);
  if (boxR0 !== r.score[0] || boxR1 !== r.score[1]) legalityFails++;
}
ok(legalityFails === 0, `legality issues: ${legalityFails}`);
const s = soak(baseline, L.makeTeam(L.CPU_DEFS[2], makeRNG(77)), 50, 5000);
console.log('  avgRuns/game(combined):', s.avgRuns.toFixed(2),
  '| avgHR:', s.avgHR.toFixed(2), '| avgHits:', s.avgHits.toFixed(1),
  '| avgErr:', s.avgErr.toFixed(2), '| runs range:', s.minRuns + '-' + s.maxRuns,
  '| avgInn:', s.avgInnings.toFixed(1));
ok(s.avgRuns >= 3 && s.avgRuns <= 12, `avgRuns out of target: ${s.avgRuns}`);
ok(s.avgHR >= 0.5 && s.avgHR <= 4, `avgHR out of target: ${s.avgHR}`);

// ---- (2) stronger team wins more ----
console.log('== (2) strong vs weak over 40 sims ==');
const strong = L.makeTeam(L.CPU_DEFS[5], makeRNG(2)); // Ghost Moores
const weak = L.makeTeam(L.CPU_DEFS[0], makeRNG(3));    // Sandlots
let strongWins = 0;
for (let i = 0; i < 40; i++) {
  const r = simGame(strong, weak, 20000 + i);
  if (r.winner === 0) strongWins++;
}
console.log('  strong win%:', (strongWins / 40 * 100).toFixed(0));
ok(strongWins / 40 > 0.7, `strong should win >70%, got ${strongWins}/40`);

// ---- (3) stat effects ----
console.log('== (3) stat effects ==');
// +Power team out-homers baseline
const powered = L.makeTeam(L.CPU_DEFS[2], makeRNG(2));
for (const p of powered.lineup) p.bat.power = Math.min(10, p.bat.power + 4);
let hrPow = 0, hrBase = 0;
for (let i = 0; i < 40; i++) {
  hrPow += simGame(powered, baseline, 30000 + i).hr[0];
  hrBase += simGame(baseline, baseline, 30000 + i).hr[0];
}
console.log('  powered HR:', hrPow, 'vs baseline HR:', hrBase);
ok(hrPow > hrBase * 1.3, `powered team should out-homer baseline (${hrPow} vs ${hrBase})`);

// high-curve pitcher induces more misses (strikeouts)
const curvy = L.makeTeam(L.CPU_DEFS[2], makeRNG(2));
for (const p of curvy.rotation) { p.pit.curve = 10; p.pit.velo = 10; }
const flat = L.makeTeam(L.CPU_DEFS[2], makeRNG(2));
for (const p of flat.rotation) { p.pit.curve = 1; p.pit.velo = 3; }
let kCurvy = 0, kFlat = 0;
for (let i = 0; i < 40; i++) {
  // curvy team pitches to baseline (baseline is away, curvy home -> baseline SO in box[0])
  kCurvy += simGame(baseline, curvy, 40000 + i).box[0].bat.reduce((a, b) => a + b.so, 0);
  kFlat += simGame(baseline, flat, 40000 + i).box[0].bat.reduce((a, b) => a + b.so, 0);
}
console.log('  strikeouts vs high-curve:', kCurvy, 'vs flat:', kFlat);
ok(kCurvy > kFlat * 1.2, `high-curve should induce more Ks (${kCurvy} vs ${kFlat})`);

// ---- (4) league season ----
console.log('== (4) league season ==');
let lg = L.newLeague(user, 12345);
ok(lg.teams.length === 7, 'league has 7 teams');
ok(lg.money === 120, 'starting money 120');
const startMoney = lg.money;
for (let i = 0; i < 15; i++) {
  const before = lg.money;
  const r = L.advanceRound(lg); // all simulated
  ok(r !== null, `round ${i} advanced`);
}
ok(lg.round === 15, 'season completed 15 rounds');
// standings accumulated
const totalGames = lg.standings.reduce((a, r) => a + r.w + r.l, 0);
console.log('  total team-games recorded:', totalGames, '| user W-L:', lg.standings[0].w + '-' + lg.standings[0].l);
ok(totalGames > 30, 'standings accumulated games');
ok(lg.money > startMoney, `money awarded (${startMoney} -> ${lg.money})`);
const ld = L.leaders(lg);
console.log('  HR leader:', ld.hr[0] ? `${ld.hr[0].name} (${ld.hr[0].hr})` : 'none',
  '| AVG leader:', ld.avg[0] ? `${ld.avg[0].name} (.${(ld.avg[0].avg * 1000).toFixed(0).padStart(3, '0')})` : 'none',
  '| W leader:', ld.w[0] ? `${ld.w[0].name} (${ld.w[0].w})` : 'none');
ok(ld.hr.length > 0 && ld.avg.length > 0, 'stat leaders computed');
ok(lg.champStage >= 1, 'championship set up');

// ---- training + save round-trip ----
console.log('== training + persistence ==');
const trainee = lg.userTeam.players[0];
const key = 'power';
const before = trainee.bat[key];
lg.money = 9999;
const trained = L.train(lg, trainee, key);
ok(trained && lg.userTeam.players[0].bat[key] === before + 1, `training raised ${key} ${before}->${lg.userTeam.players[0].bat[key]}`);
// round-trip through JSON
const rt = L.roundTrip(lg);
ok(rt.userTeam.players[0].bat[key] === before + 1, 'trained stat persists through save round-trip');
ok(rt.teams.length === 7 && rt.userTeam.lineup.length === 9, 'teams rehydrated after load');
ok(rt.money === lg.money, 'money persists');
// buy prospect
lg.money = 9999;
const pr = L.genProspect(makeRNG(5), 'star', 'bat', 'LF');
const bought = L.buyProspect(lg, 5, pr, 'star');
ok(bought && lg.userTeam.players[5].name === pr.name, 'prospect replaces roster slot');

// ---- new season carryover ----
const s2 = L.newSeason(lg);
ok(s2.season === 2 && s2.userTeam === lg.userTeam, 'new season carries user team');
ok(s2.money > 0 && s2.round === 0, 'new season fresh schedule, money carried');

// ---- interactive-outcome path: GameState.applyOutcome sanity ----
console.log('== applyOutcome primitives ==');
const gs = new GameState(user, baseline);
gs.applyOutcome('1B'); gs.applyOutcome('HR');
ok(gs.score[0] === 2, `single then HR = 2 runs, got ${gs.score[0]}`);
ok(gs.hr[0] === 1 && gs.hits[0] === 2, 'hit/HR tallies correct');

console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
