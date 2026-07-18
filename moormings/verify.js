// Headless solvability verification: replays each level's scripted solution
// through the real sim and asserts the save quota is met.
//   node verify.js            — run all 12 levels
//   node verify.js 3          — run level 3 only
//   node verify.js 3 --trace  — run level 3, printing a per-second trace

import { Sim } from './src/sim.js';
import { LEVELS } from './src/levels.js';

const args = process.argv.slice(2);
const only = args.find((a) => /^\d+$/.test(a));
const trace = args.includes('--trace');

function condMet(cmd, sim) {
  if (cmd.at !== undefined) return sim.tick_ >= cmd.at;
  if (cmd.savedAtLeast !== undefined) return sim.saved >= cmd.savedAtLeast;
  const w = sim.moormings[cmd.watch !== undefined ? cmd.watch : cmd.m];
  if (!w || !w.alive) return false;
  if (cmd.x !== undefined && Math.abs(w.x - cmd.x) > (cmd.tol ?? 3)) return false;
  if (cmd.y !== undefined && Math.abs(w.y - cmd.y) > 4) return false;
  if (cmd.dir !== undefined && w.dir !== cmd.dir) return false;
  return true;
}

function runLevel(level) {
  const sim = new Sim(level);
  const pending = level.solution.map((c) => ({ ...c, done: false }));
  const maxTicks = level.time * 60 + 1200;
  const log = [];
  while (!sim.finished && sim.tick_ < maxTicks) {
    for (const cmd of pending) {
      if (cmd.done || !condMet(cmd, sim)) continue;
      if (cmd.rate !== undefined) { sim.setRate(cmd.rate); cmd.done = true; }
      else if (cmd.nuke) { sim.nuke(); cmd.done = true; }
      else if (sim.assign(cmd.m, cmd.skill)) {
        cmd.done = true;
        log.push(`  t=${(sim.tick_ / 60).toFixed(1)}s assign m${cmd.m} ${cmd.skill} @x=${sim.moormings[cmd.m].x}`);
      }
    }
    sim.tick();
    sim.events.length = 0;
    if (trace && sim.tick_ % 60 === 0) {
      const ms = sim.moormings.filter((m) => m.alive)
        .map((m) => `m${m.id}:${m.job.slice(0, 4)}(${m.x},${m.y})${m.dir > 0 ? '>' : '<'}`).join(' ');
      console.log(`t=${sim.tick_ / 60}s saved=${sim.saved} dead=${sim.dead} | ${ms}`);
    }
  }
  const unfired = pending.filter((c) => !c.done).length;
  const pass = sim.won && sim.finished;
  const line = `L${String(level.id).padStart(2)} ${level.title.padEnd(22)} saved ${String(sim.saved).padStart(2)}/${level.spawn} need ${level.quota}  t=${Math.round(sim.tick_ / 60)}s  ${pass ? 'PASS' : 'FAIL'}${unfired ? ` (${unfired} cmds never fired)` : ''}`;
  console.log(line);
  if (!pass || trace) log.forEach((l) => console.log(l));
  return pass;
}

let allPass = true;
for (const level of LEVELS) {
  if (only && level.id !== Number(only)) continue;
  if (!runLevel(level)) allPass = false;
}
console.log(allPass ? 'ALL LEVELS SOLVABLE' : 'SOME LEVELS FAILED');
process.exit(allPass ? 0 : 1);
