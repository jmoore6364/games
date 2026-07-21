import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const SHOT = '/tmp/claude-0/-home-user-games/c3251a85-0b25-53e4-8b22-21faaa09ec2c/scratchpad';
const URL = 'http://localhost:8155';

const errors = [];
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 520 } });
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

let fails = 0;
function ok(name, cond, extra = '') { console.log((cond ? '  ok  ' : 'FAIL  ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; }

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction('window.__sm && window.__sm.ready === true', { timeout: 8000 });
await page.waitForTimeout(200);

// title
await page.screenshot({ path: `${SHOT}/01-title.png` });
console.log('captured title');

// setup screen (click through to setup)
await page.mouse.click(400, 260);
await page.waitForTimeout(120);
await page.screenshot({ path: `${SHOT}/02-setup.png` });
console.log('captured setup');

// start skirmish via hook (deterministic seed)
const s0 = await page.evaluate(() => window.__sm.start('normal', 4242));
ok('skirmish started', s0.screen === 'playing', JSON.stringify(s0));

// select a worker and gather -> resources should rise
await page.evaluate(() => { window.__sm.selectFirstWorker(); window.__sm.gatherNearest(); });
const rBefore = await page.evaluate(() => window.__sm.res());
// also assign all workers to gather for a lively economy shot
await page.evaluate(() => {
  const g = window.__game, s = g.sim;
  for (const w of s.units.filter(u => u.side === 0 && u.type === 'worker')) {
    let best = null, bd = 1e9;
    for (const n of s.resources) { if (n.kind !== 'moore' || n.amount <= 0) continue; const d = (n.tx - w.x) ** 2 + (n.ty - w.y) ** 2 + n.occupants * 6; if (d < bd) { bd = d; best = n; } }
    if (best) s.commandGather(w, best);
  }
});
await page.evaluate(() => window.__sm.step(1 / 30, 300)); // ~10s
const rAfter = await page.evaluate(() => window.__sm.res());
ok('gathering raised moorerals', rAfter.m > rBefore.m, `m ${rBefore.m}->${rAfter.m}`);
await page.evaluate(() => { window.__sm.centerBase(); window.__game.sel = new Set([window.__sm.selectFirstWorker()]); });
await page.waitForTimeout(60);
await page.screenshot({ path: `${SHOT}/03-base-economy.png` });
console.log('captured base economy');

// building placement ghost
await page.evaluate(() => { window.__sm.selectFirstWorker(); window.__sm.setPending('barracks'); window.__game.pendingBuild = 'barracks'; });
await page.waitForTimeout(60);
await page.screenshot({ path: `${SHOT}/04-placement-ghost.png` });
console.log('captured placement ghost');
await page.evaluate(() => { window.__game.pendingBuild = null; });

// build a supply depot + barracks (resources drop, buildings appear)
const bRes = await page.evaluate(() => {
  window.__game.sim.res[0].m = 600;
  const mBefore = window.__sm.res().m;
  window.__sm.selectFirstWorker();
  const d = window.__sm.build('depot');
  const b = window.__sm.build('barracks');
  return { d, b, mBefore, mAfter: window.__sm.res().m, buildings: window.__sm.counts().buildings };
});
ok('depot + barracks build orders placed', bRes.d && bRes.b, JSON.stringify(bRes));
ok('building cost was deducted', bRes.mAfter < bRes.mBefore, `m ${bRes.mBefore}->${bRes.mAfter}`);
await page.evaluate(() => window.__sm.step(1 / 30, 1200)); // ~40s to finish buildings
const built = await page.evaluate(() => window.__game.sim.buildings.filter(b => b.side === 0 && b.complete && (b.type === 'depot' || b.type === 'barracks')).length);
ok('buildings completed over time', built >= 2, `completed=${built}`);

// train a Moorine (supply used, unit spawns)
const tRes = await page.evaluate(() => {
  window.__game.sim.res[0].m = 500;
  const supBefore = window.__sm.supply();
  const armyBefore = window.__sm.counts().army;
  const okt = window.__sm.train('moorine');
  return { okt, supBefore, armyBefore };
});
ok('moorine training accepted', tRes.okt === true, JSON.stringify(tRes.supBefore));
await page.evaluate(() => window.__sm.step(1 / 30, 500));
const armyAfter = await page.evaluate(() => window.__sm.counts().army);
ok('moorine spawned (army grew)', armyAfter > tRes.armyBefore, `army ${tRes.armyBefore}->${armyAfter}`);

// Fast-forward a real match a good while so both sides build armies and fight
await page.evaluate(() => {
  // give player a fighting force + factory tech for a good battle screenshot
  const s = window.__game.sim;
  s.res[0].m = 3000; s.res[0].g = 1500;
  window.__sm.build('refinery');
  for (let i = 0; i < 3; i++) window.__sm.build('depot');
});
await page.evaluate(() => window.__sm.step(1 / 30, 400));
await page.evaluate(() => {
  const s = window.__game.sim;
  s.res[0].m = 4000; s.res[0].g = 2000;
  window.__sm.build('factory');
  window.__sm.build('barracks'); // 2nd production line
});
await page.evaluate(() => window.__sm.step(1 / 30, 1400));
// mass train army across all production buildings, giving it time to churn out units
for (let round = 0; round < 6; round++) {
  await page.evaluate(() => {
    const s = window.__game.sim; s.res[0].m = 6000; s.res[0].g = 3000;
    for (const b of s.buildings.filter(x => x.side === 0 && x.complete && x.def.trains.length && x.type !== 'base')) {
      for (const ut of b.def.trains) s.orderTrain(b, ut);
    }
  });
  await page.evaluate(() => window.__sm.step(1 / 30, 450));
}

// box-select army and attack-move toward enemy
const amRes = await page.evaluate(() => {
  const n = window.__sm.selectArmy();
  const moved = window.__sm.attackMoveEnemy();
  return { n, moved };
});
ok('box-selected an army', amRes.n > 3, `selected=${amRes.n}`);
ok('attack-move issued to army', amRes.moved > 0, `moved=${amRes.moved}`);

// let armies clash; find a battle to screenshot (center on a mix of both sides)
let battleShot = false;
for (let i = 0; i < 40 && !battleShot; i++) {
  await page.evaluate(() => window.__sm.step(1 / 30, 60)); // 2s
  const info = await page.evaluate(() => {
    const s = window.__game.sim;
    // find a point with both player and enemy units nearby
    for (const pu of s.units.filter(u => u.side === 0 && u.type !== 'worker')) {
      const near = s.units.find(e => e.side === 1 && Math.hypot(e.x - pu.x, e.y - pu.y) < 8);
      if (near) { window.__sm.centerOn((pu.x + near.x) / 2, (pu.y + near.y) / 2); return { fight: true, proj: s.projectiles.length }; }
    }
    return { fight: false, proj: s.projectiles.length };
  });
  if (info.fight) { await page.waitForTimeout(40); battleShot = true; }
}
await page.waitForTimeout(60);
await page.screenshot({ path: `${SHOT}/05-battle.png` });
ok('a battle occurred (armies met)', battleShot);
console.log('captured battle');

// AI is producing / attacking
const ai = await page.evaluate(() => window.__sm.enemyStats());
ok('AI built an army', ai.army > 0, JSON.stringify(ai));
ok('AI launched attacks', ai.attacks > 0 || ai.attacking, JSON.stringify(ai));

// building can be destroyed -> force a win for the victory screenshot
await page.evaluate(() => { window.__sm.killEnemyBuildings(); });
await page.evaluate(() => window.__sm.step(1 / 30, 2));
await page.evaluate(() => { window.__sm.killEnemyBuildings(); window.__sm.step(1 / 30, 3); });
const w = await page.evaluate(() => window.__sm.winner());
ok('destroying all enemy buildings ends the game (player wins)', w === 0, `winner=${w}`);
await page.waitForTimeout(120);
await page.screenshot({ path: `${SHOT}/06-victory.png` });
console.log('captured victory');

// pixel variety sanity on a battle frame (not a flat mess)
const variety = await page.evaluate(() => {
  const cv = document.getElementById('game');
  const cx = cv.getContext('2d');
  const d = cx.getImageData(0, 0, 640, 304).data;
  const set = new Set(); let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 40) { const v = d[i] + d[i + 1] + d[i + 2]; min = Math.min(min, v); max = Math.max(max, v); set.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); }
  return { colors: set.size, range: max - min };
});
ok('map render has color variety (not flat)', variety.colors > 20, JSON.stringify(variety));

ok('no console/page errors', errors.length === 0, errors.slice(0, 5).join(' | '));

console.log(`\nBROWSER RESULT: ${fails === 0 ? 'PASS' : fails + ' FAILURES'}`);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
process.exit(fails ? 1 : 0);
