// headless.test.js — pure-logic tests (no DOM). Run: node test/headless.test.js
import { City, TILE } from '../src/city.js';
import { Vehicle } from '../src/vehicles.js';
import { Game } from '../src/game.js';

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ok  - ' + msg); }
  else { fail++; console.log('  FAIL- ' + msg); }
}
function approx(a, b, e = 1e-6) { return Math.abs(a - b) <= e; }

console.log('\n== city gen / collision ==');
{
  const c = new City(42);
  ok(c.MAP > 100, 'city has a nonzero map size (' + c.MAP + ')');
  // find a building cell and a road cell
  let solidFound = false, roadFound = false;
  for (let z = 0; z < c.MAP && !(solidFound && roadFound); z++) {
    for (let x = 0; x < c.MAP; x++) {
      if (!solidFound && c.solidAt(x, z)) { ok(c.heightAt(x, z) > 0, 'a building cell reports solid + height>0'); solidFound = true; }
      if (!roadFound && c.tileAt(x, z) === TILE.ROAD && !c.solidAt(x, z)) { ok(true, 'a road cell reports open (not solid)'); roadFound = true; }
      if (solidFound && roadFound) break;
    }
  }
  ok(solidFound && roadFound, 'city generated both buildings and roads');
  // find an interior building point and assert blocked() reports it
  let insideBuilding = false;
  outerB: for (let z = 2; z < c.MAP - 2; z++) for (let x = 2; x < c.MAP - 2; x++) {
    if (c.solidAt(x, z)) { insideBuilding = c.blocked(x + 0.5, z + 0.5, 0.6); break outerB; }
  }
  ok(insideBuilding, 'a point inside a building reports blocked()');
  ok(!c.blocked(c.playerSpawn.x, c.playerSpawn.z, 0.6), 'player spawn (road) is not blocked');
  // line of sight: adjacent open points see each other
  ok(c.lineOfSight(c.playerSpawn.x, c.playerSpawn.z, c.playerSpawn.x + 2, c.playerSpawn.z), 'LOS clear over short open span');
}

console.log('\n== car physics ==');
{
  const c = new City(7);
  const sx = c.playerSpawn.x, sz = c.playerSpawn.z;
  const v = new Vehicle('sedan', sx, sz, 0, 0);
  const before = v.x;
  for (let i = 0; i < 30; i++) v.step(c, { throttle: 1, steer: 0, dt: 0.05 });
  ok(v.speed > 3, 'throttle accelerates the car (speed=' + v.speed.toFixed(1) + ')');
  ok(v.x > before + 1, 'car moved forward along +x');
  const h0 = v.heading;
  for (let i = 0; i < 10; i++) v.step(c, { throttle: 1, steer: 1, dt: 0.05 });
  ok(!approx(v.heading, h0, 1e-3), 'steering changes heading');

  // drive a car straight into a building wall -> should be stopped/slowed
  // place a car right next to a known building, aimed at it
  let bx = -1, bz = -1;
  outer: for (let z = 2; z < c.MAP - 2; z++) for (let x = 2; x < c.MAP - 2; x++) {
    if (c.solidAt(x, z) && !c.solidAt(x - 3, z)) { bx = x; bz = z; break outer; }
  }
  const wall = new Vehicle('sedan', bx - 3, bz + 0.5, 0, 0);
  let maxX = wall.x;
  for (let i = 0; i < 80; i++) { wall.step(c, { throttle: 1, steer: 0, dt: 0.05 }); maxX = Math.max(maxX, wall.x); }
  ok(wall.x < bx, 'car cannot pass through a building (stopped before x=' + bx + ', got ' + wall.x.toFixed(1) + ')');
}

console.log('\n== wanted level ==');
{
  const g = new Game(99);
  ok(g.stars === 0, 'starts at 0 stars');
  g.crime(20);
  ok(g.stars >= 2, 'committing crime raises wanted (stars=' + g.stars + ')');
  const before = g.stars;
  // police should be requested
  g._managePolice();
  ok(g.vehicles.some(v => v.role === 'police'), 'police spawn when wanted > 0');
  // decay: no sight for a while -> heat falls
  // move player far from any cop and remove LOS by teleport into isolation
  g.player.x = 5; g.player.z = 5;
  for (const v of g.vehicles) if (v.role === 'police') { v.x = 5; v.z = g.city.MAP - 5; }
  let steps = 0;
  while (g.stars > 0 && steps < 4000) { g._updateWanted(0.05); steps++; }
  ok(g.stars < before, 'wanted decays back down when not seen (stars=' + g.stars + ')');
}

console.log('\n== police path toward player ==');
{
  const g = new Game(5);
  g.crime(40);
  g._managePolice();
  const cop = g.vehicles.find(v => v.role === 'police');
  ok(!!cop, 'have a police unit');
  if (cop) {
    // put cop on a road near player and step; distance should tend to shrink
    const d0 = Math.hypot(cop.x - g.player.x, cop.z - g.player.z);
    let minD = d0;
    for (let i = 0; i < 120; i++) {
      const ctrl = (function () { return null; })();
      g.step({ dt: 0.05 });
      const cop2 = g.vehicles.find(v => v.role === 'police');
      if (cop2) minD = Math.min(minD, Math.hypot(cop2.x - g.player.x, cop2.z - g.player.z));
    }
    ok(minD < d0, 'police close distance to the player over time (' + d0.toFixed(1) + ' -> ' + minD.toFixed(1) + ')');
  }
}

console.log('\n== enter / exit vehicle ==');
{
  const g = new Game(3);
  const p = g.player;
  // place a parked car right next to the player
  const v = new Vehicle('sedan', p.x + 1.2, p.z, 0, 0); v.role = 'parked'; v.occupant = null;
  g.vehicles.push(v);
  ok(!p.inVehicle, 'starts on foot');
  g.tryEnterExit();
  ok(p.inVehicle === v && v.occupant === 'player', 'entering a car toggles control into it');
  g.tryEnterExit();
  ok(!p.inVehicle && v.occupant === null, 'exiting a car returns control on foot');
}

console.log('\n== carjack raises wanted ==');
{
  const g = new Game(11);
  const p = g.player;
  const v = new Vehicle('sedan', p.x + 1.2, p.z, 0, 0); v.role = 'traffic'; v.occupant = 'ai';
  g.vehicles.push(v);
  const s0 = g.stars;
  g.tryEnterExit();
  ok(g.stars >= s0 && g.heat > 0, 'carjacking an occupied car raises heat');
}

console.log('\n== run over ped raises wanted ==');
{
  const g = new Game(21);
  const p = g.player;
  const v = new Vehicle('sports', p.x, p.z, 0, 0); v.role = 'player'; v.occupant = 'player';
  p.inVehicle = v; v.speed = 10;
  // put a ped right in front
  g.peds.length = 0;
  const ped = { x: v.x + 0.3, z: v.z, state: 'walk', h: 1.8, knockDown() { if (this.state === 'down') return false; this.state = 'down'; this.downTimer = 3; return true; }, downTimer: 0, update() {} };
  g.peds.push(ped);
  const h0 = g.heat;
  g._playerImpacts(0.05);
  ok(ped.state === 'down', 'ped is knocked down when run over');
  ok(g.heat > h0, 'running over a ped raises heat');
}

console.log('\n== mission state machine ==');
{
  const g = new Game(77);
  ok(g.startMission('dash'), 'can start a mission');
  ok(g.activeMission && g.activeMission.def.id === 'dash', 'mission is active');
  const cash0 = g.cash;
  // teleport a driven car through each checkpoint
  const p = g.player;
  const v = new Vehicle('sports', 0, 0, 0, 0); v.role = 'player'; v.occupant = 'player';
  p.inVehicle = v;
  for (const cp of g.activeMission.data.cps) {
    v.x = cp.x; v.z = cp.z; p.x = cp.x; p.z = cp.z;
    g._tickMission(0.05);
  }
  ok(!g.activeMission, 'mission completes after all checkpoints');
  ok(g.cash === cash0 + 220, 'completing the mission awards cash (' + g.cash + ')');
  ok(g.completedMissions.dash === true, 'mission marked completed');

  // repo mission: steal target then deliver
  const g2 = new Game(78);
  g2.startMission('repo');
  const car = g2.activeMission.data.car;
  ok(!!car, 'repo mission spawns a target car');
  g2.player.inVehicle = car; car.role = 'player'; car.occupant = 'player';
  g2._tickMission(0.05);
  ok(g2.activeMission.phase === 1, 'repo advances to delivery phase after stealing target');
  car.x = g2.city.garage.x; car.z = g2.city.garage.z;
  g2.player.x = car.x; g2.player.z = car.z;
  g2._tickMission(0.05);
  ok(g2.completedMissions.repo === true, 'repo completes on delivery to garage');
}

console.log('\n== full step smoke (on foot moves, blocked by building) ==');
{
  const g = new Game(1);
  const p = g.player;
  const x0 = p.x;
  for (let i = 0; i < 20; i++) g.step({ dt: 0.03, forward: true });
  ok(Math.hypot(p.x - x0, p.z - g.city.playerSpawn.z) > 0.5 || p.x !== x0, 'player moves on foot with forward input');
  // shove player against a building and try to walk in
  let bx = -1, bz = -1;
  outer: for (let z = 2; z < g.city.MAP - 2; z++) for (let x = 2; x < g.city.MAP - 2; x++) {
    if (g.city.solidAt(x, z) && !g.city.solidAt(x - 2, z)) { bx = x; bz = z; break outer; }
  }
  p.x = bx - 1.2; p.z = bz + 0.5; g.camYaw = 0; // facing +x into wall
  const bxBefore = p.x;
  for (let i = 0; i < 40; i++) g.step({ dt: 0.03, forward: true });
  ok(p.x < bx, 'player cannot walk through a building (x=' + p.x.toFixed(2) + ' < ' + bx + ')');
}

console.log('\n== minimap projection ==');
{
  const c = new City(2);
  const pr = c.minimapProject(c.MAP / 2, c.MAP / 2, 100);
  ok(approx(pr.px, 50, 0.001) && approx(pr.pz, 50, 0.001), 'minimap projects world center to minimap center');
}

console.log('\n========================================');
console.log('  PASS: ' + pass + '   FAIL: ' + fail);
console.log('========================================\n');
process.exit(fail ? 1 : 0);
