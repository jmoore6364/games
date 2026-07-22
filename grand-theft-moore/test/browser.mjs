import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const SHOT = '/tmp/claude-0/-home-user-games/c3251a85-0b25-53e4-8b22-21faaa09ec2c/scratchpad';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto('http://localhost:8156/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__gtm && window.__gtm.game);
await new Promise(r => setTimeout(r, 400));

const results = {};

// title screenshot
await page.screenshot({ path: SHOT + '/01_title.png' });

// start free-roam
await page.evaluate(() => window.__gtm.play());
await page.evaluate(() => window.__gtm.renderOnce());
await new Promise(r => setTimeout(r, 300));

// frame not flat?
results.stats0 = await page.evaluate(() => window.__gtm.frameStats());

// on-foot 3rd-person city screenshot
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: SHOT + '/02_onfoot.png' });

// move on foot: forward for a while, check pos change
const before = await page.evaluate(() => window.__gtm.snapshot());
await page.evaluate(() => window.__gtm.step(40, { forward: true }));
const after = await page.evaluate(() => window.__gtm.snapshot());
results.moved = Math.hypot(after.x - before.x, after.z - before.z);

// blocked by building: force player against a wall and push in
results.blocked = await page.evaluate(() => {
  const g = window.__gtm.game, c = g.city;
  let bx=-1,bz=-1;
  outer: for (let z=2; z<c.MAP-2; z++) for (let x=2; x<c.MAP-2; x++){
    if (c.solidAt(x,z) && !c.solidAt(x-2,z)) { bx=x; bz=z; break outer; }
  }
  g.player.inVehicle=null; g.player.x=bx-1.1; g.player.z=bz+0.5; g.camYaw=0;
  const x0=g.player.x;
  for (let i=0;i<50;i++) window.__gtm.step(1,{forward:true});
  return { x0, x1: g.player.x, bx, pass: g.player.x < bx };
});

// enter a car and drive
await page.evaluate(() => { const g=window.__gtm.game; g.player.x=g.city.playerSpawn.x; g.player.z=g.city.playerSpawn.z; window.__gtm.spawnCarNextToPlayer('sports'); });
await page.evaluate(() => window.__gtm.step(1, { enterExit: true }));
const inCar = await page.evaluate(() => window.__gtm.snapshot());
results.enteredCar = inCar.inVehicle;
const dBefore = await page.evaluate(() => { const v=window.__gtm.game.player.inVehicle; return { x:v.x, z:v.z, h:v.heading }; });
await page.evaluate(() => window.__gtm.step(50, { forward: true, right: true }));
const dAfter = await page.evaluate(() => { const v=window.__gtm.game.player.inVehicle; return { x:v.x, z:v.z, h:v.heading }; });
results.drove = Math.hypot(dAfter.x - dBefore.x, dAfter.z - dBefore.z);
results.headingChanged = Math.abs(dAfter.h - dBefore.h) > 0.05;
await page.evaluate(() => window.__gtm.renderOnce());
await page.screenshot({ path: SHOT + '/03_driving.png' });

// crime -> wanted + police
await page.evaluate(() => window.__gtm.crime(40));
await page.evaluate(() => window.__gtm.step(30, { forward: true }));
const wanted = await page.evaluate(() => window.__gtm.snapshot());
results.stars = wanted.stars;
results.police = wanted.police;
// let a police get close for a dramatic shot
await page.evaluate(() => window.__gtm.step(120, { forward: true, right: true }));
await page.evaluate(() => window.__gtm.renderOnce());
await page.screenshot({ path: SHOT + '/04_police_chase.png' });

// mission: start + complete (checkpoint dash) via teleporting through checkpoints
const cashBefore = await page.evaluate(() => window.__gtm.snapshot().cash);
results.missionCash = await page.evaluate(() => {
  const g = window.__gtm.game;
  // clear wanted to keep it clean, ensure in a car
  g.heat=0; g.stars=0;
  if (!g.player.inVehicle) window.__gtm.spawnCarNextToPlayer('sports'), g.step({dt:0.033,enterExit:true});
  g.startMission('dash');
  const cps = g.activeMission.data.cps;
  const v = g.player.inVehicle;
  for (const cp of cps) { v.x=cp.x; v.z=cp.z; g.player.x=cp.x; g.player.z=cp.z; g._tickMission(0.05); }
  return g.cash;
});
results.missionAwarded = results.missionCash > cashBefore;
// show mission marker view — put player near a mission marker, on foot
await page.evaluate(() => {
  const g = window.__gtm.game;
  if (g.player.inVehicle) g.tryEnterExit();
  const m = g.missionDefs.find(x=>!g.completedMissions[x.id]);
  if (m) { g.player.x = m.marker.x - 3; g.player.z = m.marker.z; g.camYaw = 0; }
});
await page.evaluate(() => window.__gtm.step(1, {}));
await page.evaluate(() => window.__gtm.renderOnce());
await page.screenshot({ path: SHOT + '/05_mission_marker.png' });

results.errors = errors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
