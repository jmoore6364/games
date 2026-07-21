// Headless logic tests for StarMoore. Run: node test/node-test.mjs
import { Sim, PLAYER, ENEMY, UNITS, BUILDINGS } from '../src/sim.js';
import { pathfind } from '../src/pathfind.js';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') { if (cond) { pass++; console.log('  ok  ' + name + (extra ? '  ' + extra : '')); } else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } }
function run(sim, secs, dt = 1 / 15) { for (let t = 0; t < secs; t += dt) sim.step(dt); }

// ---------- A* ----------
{
  const w = 10, h = 10;
  const blocked = () => false;
  const p = pathfind(w, h, 0, 0, 9, 9, blocked);
  ok('A* finds a path on open grid', p && p.length > 0, `len=${p ? p.length : 'null'}`);
  ok('A* path ends at goal', p && p[p.length - 1].x === 9 && p[p.length - 1].y === 9);
  // wall across the middle with no gap -> blocked
  const wallBlocked = (x, y) => x === 5; // full vertical wall column
  const p2 = pathfind(w, h, 0, 0, 9, 9, wallBlocked);
  ok('A* returns null when fully walled off', p2 === null);
  // wall with a gap -> path exists and routes around
  const gapBlocked = (x, y) => x === 5 && y !== 0;
  const p3 = pathfind(w, h, 0, 5, 9, 5, gapBlocked);
  ok('A* routes around a wall with a gap', p3 && p3.length > 0);
}

// ---------- economy: harvest cycle raises resources ----------
{
  const sim = new Sim({ seed: 7, difficulty: 'normal' });
  sim.ai = null; // disable AI for economy isolation
  const before = sim.res[PLAYER].m;
  const workers = sim.units.filter(u => u.side === PLAYER && u.type === 'worker');
  const node = sim.resources.find(n => n.kind === 'moore' && n.tx < 32);
  ok('found starting workers', workers.length === 5);
  ok('found a moore node', !!node);
  for (const w of workers) sim.commandGather(w, node);
  run(sim, 30);
  ok('harvesting raised moorerals', sim.res[PLAYER].m > before, `before=${before} after=${sim.res[PLAYER].m}`);
  ok('node was depleted somewhat', node.amount < 1200);
}

// ---------- building: cost deducted + completes after build time ----------
{
  const sim = new Sim({ seed: 3 });
  sim.ai = null;
  sim.res[PLAYER].m = 500;
  const wk = sim.units.find(u => u.side === PLAYER && u.type === 'worker');
  const base = sim.playerBase;
  // find a valid spot near base
  let spot = null;
  for (let r = 4; r < 12 && !spot; r++)
    for (let a = 0; a < 12 && !spot; a++) {
      const tx = Math.round(base.tx + Math.cos(a) * r), ty = Math.round(base.ty + Math.sin(a) * r);
      if (sim.canPlace(PLAYER, 'depot', tx, ty)) spot = { tx, ty };
    }
  const mBefore = sim.res[PLAYER].m;
  const site = sim.orderBuild(wk, 'depot', spot.tx, spot.ty);
  ok('build order created a construction site', !!site && !site.complete);
  ok('build deducted moorerals', sim.res[PLAYER].m === mBefore - BUILDINGS.depot.cost.m, `now=${sim.res[PLAYER].m}`);
  run(sim, BUILDINGS.depot.buildTime + 6);
  const done = sim.buildings.find(b => b.id === site.id);
  ok('depot completed after its build time', done && done.complete, `prog=${done ? done.buildProg.toFixed(1) : '?'}`);
}

// ---------- supply gating on training ----------
{
  const sim = new Sim({ seed: 5 });
  sim.ai = null;
  sim.res[PLAYER].m = 2000; sim.res[PLAYER].g = 2000;
  // build a barracks instantly (cheat: place + force complete)
  const base = sim.playerBase;
  let spot = null;
  for (let r = 5; r < 14 && !spot; r++)
    for (let a = 0; a < 16 && !spot; a++) {
      const tx = Math.round(base.tx + Math.cos(a * 0.4) * r), ty = Math.round(base.ty + Math.sin(a * 0.4) * r);
      if (sim.canPlace(PLAYER, 'barracks', tx, ty)) spot = { tx, ty };
    }
  const rax = sim.orderBuild(sim.units.find(u => u.side === PLAYER && u.type === 'worker'), 'barracks', spot.tx, spot.ty);
  rax.complete = true; rax.hp = rax.def.hp; rax.buildProg = rax.buildTime;
  // fill supply near cap by training many marines; base supply=10, 5 workers used already =5
  const sup0 = sim.supply(PLAYER);
  ok('start supply is base value', sup0.max === 10, `max=${sup0.max}`);
  let trained = 0;
  for (let i = 0; i < 20; i++) if (sim.orderTrain(rax, 'moorine')) trained++;
  const queuedSupply = 5 /*workers*/ + trained;
  ok('training is supply-gated (cannot exceed cap)', queuedSupply <= sup0.max, `queued+used=${queuedSupply} cap=${sup0.max}`);
  ok('some marines queued before cap', trained > 0 && trained < 20, `trained=${trained}`);
  // now add a supply depot -> cap rises -> can train more
  let dspot = null;
  for (let r = 3; r < 14 && !dspot; r++)
    for (let a = 0; a < 16 && !dspot; a++) {
      const tx = Math.round(base.tx - Math.cos(a * 0.5) * r), ty = Math.round(base.ty - Math.sin(a * 0.5) * r);
      if (sim.canPlace(PLAYER, 'depot', tx, ty)) dspot = { tx, ty };
    }
  const dep = sim.orderBuild(sim.units.find(u => u.side === PLAYER && u.type === 'worker' && u.order !== 'build'), 'depot', dspot.tx, dspot.ty);
  dep.complete = true; dep.hp = dep.def.hp;
  const supAfter = sim.supply(PLAYER);
  ok('supply cap increased after depot', supAfter.max === 18, `max=${supAfter.max}`);
  const moreTrained = sim.orderTrain(rax, 'moorine');
  ok('can train again after raising supply', moreTrained === true);
}

// ---------- combat: HP reduced and a unit dies ----------
{
  const sim = new Sim({ seed: 9 });
  sim.ai = null;
  // spawn a player marine and an enemy worker next to each other in open ground
  const a = sim._spawnUnit(PLAYER, 'moorine', 32, 40);
  const b = sim._spawnUnit(ENEMY, 'worker', 34, 40);
  const hp0 = b.hp;
  sim.commandAttack([a], b.id);
  run(sim, 3);
  ok('combat reduced target HP', b.hp < hp0, `hp ${hp0}->${b.hp}`);
  run(sim, 12);
  const dead = !sim.units.find(u => u.id === b.id);
  ok('sustained combat killed the target', dead);
}

// ---------- win/lose: destroying all buildings ----------
{
  const sim = new Sim({ seed: 11 });
  sim.ai = null;
  // kill all enemy buildings
  for (const bld of sim.buildings.filter(b => b.side === ENEMY)) bld.hp = 0;
  sim.step(0.1);
  ok('player wins when enemy has no buildings', sim.winner === PLAYER, `winner=${sim.winner}`);

  const sim2 = new Sim({ seed: 12 });
  sim2.ai = null;
  for (const bld of sim2.buildings.filter(b => b.side === PLAYER)) bld.hp = 0;
  sim2.step(0.1);
  ok('player loses when it has no buildings', sim2.winner === ENEMY, `winner=${sim2.winner}`);
}

// ---------- AI: builds economy + army + attacks ----------
{
  const sim = new Sim({ seed: 21, difficulty: 'normal' });
  // disable player from doing anything; just let AI run vs idle player
  const armySamples = [];
  let sawAttack = false;
  for (let t = 0; t < 200; t += 1 / 10) {
    sim.step(1 / 10);
    if (Math.abs((t % 20)) < 0.1) armySamples.push(sim.units.filter(u => u.side === ENEMY && u.type !== 'worker').length);
    if (sim.ai.attacking) sawAttack = true;
  }
  const enemyWorkers = sim.units.filter(u => u.side === ENEMY && u.type === 'worker').length;
  const enemyArmy = sim.units.filter(u => u.side === ENEMY && u.type !== 'worker').length;
  const enemyBuildings = sim.buildings.filter(u => u.side === ENEMY).length;
  ok('AI trained extra workers', enemyWorkers > 5, `workers=${enemyWorkers}`);
  ok('AI constructed production buildings', enemyBuildings >= 2, `buildings=${enemyBuildings}`);
  ok('AI built an army', enemyArmy > 0, `army=${enemyArmy}`);
  ok('AI army grew over time', armySamples[armySamples.length - 1] >= armySamples[1] || enemyArmy > 3, `samples=${armySamples.join(',')}`);
  ok('AI launched at least one attack wave', sawAttack || (sim.ai.attacks || 0) > 0, `attacks=${sim.ai.attacks || 0}`);
}

// ---------- AI beats a passive player (long run) ----------
{
  const sim = new Sim({ seed: 33, difficulty: 'normal' });
  for (let t = 0; t < 600 && sim.winner === null; t += 1 / 8) sim.step(1 / 8);
  ok('AI eventually beats a do-nothing player', sim.winner === ENEMY, `winner=${sim.winner} time=${sim.time.toFixed(0)}`);
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
