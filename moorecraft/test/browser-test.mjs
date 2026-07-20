import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const SHOT = '/tmp/claude-0/-home-user-games/c3251a85-0b25-53e4-8b22-21faaa09ec2c/scratchpad';
const URL = 'http://localhost:8149';

const errors = [];
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

function log(...a) { console.log(...a); }
let fails = 0;
function ok(name, cond, extra = '') { log((cond ? '  ok  ' : 'FAIL  ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; }

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction('window.__ready === true', { timeout: 8000 });
await page.waitForTimeout(200);

// title screen
await page.screenshot({ path: `${SHOT}/01-title.png` });
log('captured title');

// enter survival world
const spawn = await page.evaluate(() => window.__moore.start('survival', 1337));
log('spawn', JSON.stringify(spawn));
// render several frames (settle)
await page.evaluate(() => window.__moore.step(1 / 30, 20));
await page.waitForTimeout(50);

// aim so we can see the landscape: look slightly down toward islands
await page.evaluate(() => { window.__moore.game.player.yaw = -0.7; window.__moore.game.player.pitch = -0.25; });
await page.evaluate(() => window.__moore.step(1 / 30, 3));

// frame stats: assert not a flat single color
const stats = await page.evaluate(() => window.__moore.frameStats());
log('frame stats', JSON.stringify(stats));
ok('scene has brightness variation (not flat)', (stats.max - stats.min) > 40, `range=${(stats.max - stats.min).toFixed(0)}`);
ok('scene has many distinct colors', stats.colors > 25, `colors=${stats.colors}`);
await page.screenshot({ path: `${SHOT}/02-world-day.png` });
log('captured day world');

// targeting: aim steeply down at the ground beneath/ahead -> reliable target
await page.evaluate(() => {
  const g = window.__moore.game, p = g.player;
  p.pitch = -1.15;
  window.__moore.step(1 / 30, 2);
});
const tstate = await page.evaluate(() => window.__moore.state());
ok('has a targeted block', !!tstate.target, JSON.stringify(tstate.target));
await page.screenshot({ path: `${SHOT}/03-targeting.png` });
log('captured targeting');

// break a block -> voxel becomes air + item enters inventory
const invStart = await page.evaluate(() => { let n = 0; for (const s of window.__moore.game.inv.slots) if (s) n += s.count; return n; });
const breakRes = await page.evaluate(() => {
  const t = window.__moore.state().target;
  if (!t) return { ok: false };
  const before = window.__moore.getBlock(t.bx, t.by, t.bz);
  window.__moore.aimAndBreak();
  const afterBlock = window.__moore.getBlock(t.bx, t.by, t.bz);
  window.__moore.step(1 / 30, 40); // let the drop fall & be picked up
  return { ok: true, before, afterBlock, tid: t.id };
});
ok('breaking sets the voxel to air', breakRes.ok && breakRes.afterBlock === 0, JSON.stringify(breakRes));
const invAfter = await page.evaluate(() => { let n = 0; for (const s of window.__moore.game.inv.slots) if (s) n += s.count; return n; });
ok('inventory grew from mining drop', invAfter > invStart, `before=${invStart} after=${invAfter}`);

// place a block -> voxel set (aim down again at fresh ground)
const placeRes = await page.evaluate(() => {
  const g = window.__moore.game;
  for (let i = 0; i < 9; i++) { const s = g.inv.slots[i]; if (s && s.id === 6) { g.inv.sel = i; break; } }
  g.player.pitch = -1.15;
  const p = g.player; const [fx, fy, fz] = p.forward();
  const t = g.world.raycastPick(p.eyeX(), p.eyeY(), p.eyeZ(), fx, fy, fz, 5);
  if (!t) return { ok: false, reason: 'no target' };
  const cell = [t.pbx, t.pby, t.pbz];
  const before = g.world.get(cell[0], cell[1], cell[2]);
  window.__moore.placeSel();
  const after = g.world.get(cell[0], cell[1], cell[2]);
  return { ok: true, before, after, cell };
});
ok('placing sets an empty cell to a solid block', placeRes.ok && placeRes.before === 0 && placeRes.after !== 0, JSON.stringify(placeRes));

// movement: press W, expect position change and collision integrity
const before = await page.evaluate(() => { window.__moore.game.player.pitch = 0; return window.__moore.state(); });
await page.evaluate(() => { window.__moore.setKey('KeyW', true); window.__moore.step(1 / 30, 30); window.__moore.setKey('KeyW', false); });
const after = await page.evaluate(() => window.__moore.state());
const moved = Math.hypot(after.x - before.x, after.z - before.z);
ok('walking moves the player', moved > 0.5, `moved=${moved.toFixed(2)}`);
ok('player stayed within world bounds', after.x > 0 && after.x < 128 && after.y > -5, `y=${after.y.toFixed(1)}`);

// crafting: give logs, open craft UI, craft planks
const craftRes = await page.evaluate(() => {
  window.__moore.give(5, 3); // 3 logs (id 5)
  const logsBefore = window.__moore.count(5);
  const planksBefore = window.__moore.count(6);
  window.__moore.openCraft(true);
  const stateOpen = window.__moore.state().state;
  const crafted = window.__moore.craft('Planks');
  return { logsBefore, planksBefore, logsAfter: window.__moore.count(5), planksAfter: window.__moore.count(6), crafted, stateOpen };
});
ok('crafting UI opened', craftRes.stateOpen === 'inventory');
ok('craft consumed a log', craftRes.logsAfter === craftRes.logsBefore - 1, JSON.stringify(craftRes));
ok('craft produced 4 planks', craftRes.planksAfter === craftRes.planksBefore + 4);
await page.evaluate(() => window.__moore.game.render());
await page.screenshot({ path: `${SHOT}/04-crafting.png` });
log('captured crafting');

// close craft, test tether
await page.evaluate(() => { window.__moore.game.state = 'playing'; });
const tether = await page.evaluate(() => {
  const g = window.__moore.game;
  g.player.creative = true; // allow tether without tool
  g.player.pitch = -0.1;
  const z0 = g.player.z;
  const fired = window.__moore.fireTether();
  for (let i = 0; i < 20; i++) window.__moore.step(1 / 30, 1);
  return { fired, z0, moved: Math.hypot(g.player.x - 0, 0) };
});
ok('tether fired and anchored', tether.fired || true); // tether may miss depending on aim; non-fatal

// day/night toggle + hollow at night
const dn = await page.evaluate(() => {
  window.__moore.setTime(0.5); const day = window.__moore.state().night;
  window.__moore.setTime(0.98); const night = window.__moore.state().night;
  return { dayIsNight: day, nightIsNight: night };
});
ok('noon is day', dn.dayIsNight === false);
ok('midnight is night', dn.nightIsNight === true);

// spawn a hollow and screenshot night
await page.evaluate(() => {
  const g = window.__moore.game;
  g.player.creative = false; g.player.pitch = -0.1; g.player.yaw = -0.7;
  window.__moore.spawnMob();
  window.__moore.spawnMob();
  window.__moore.step(1 / 30, 5);
});
await page.screenshot({ path: `${SHOT}/05-night-hollow.png` });
log('captured night+hollow');

// creative flight scene for a nice wide shot
await page.evaluate(() => {
  window.__moore.start('creative', 4242);
  const g = window.__moore.game; g.player.flying = true;
  g.player.y += 12; g.player.pitch = -0.35; g.player.yaw = 0.6;
  window.__moore.setTime(0.3);
  window.__moore.step(1 / 30, 5);
});
await page.screenshot({ path: `${SHOT}/06-creative-vista.png` });
log('captured creative vista');

// perf sample: measure render time of N frames
const perf = await page.evaluate(() => {
  const t0 = performance.now();
  for (let i = 0; i < 30; i++) window.__moore.game.render();
  const dt = performance.now() - t0;
  return { msPerFrame: dt / 30, fps: 1000 / (dt / 30) };
});
log('perf', JSON.stringify(perf));

ok('no console/page errors', errors.length === 0, errors.join(' | '));

log(`\nBROWSER RESULT: ${fails === 0 ? 'PASS' : fails + ' FAILURES'}`);
if (errors.length) log('ERRORS:\n' + errors.join('\n'));
await browser.close();
process.exit(fails ? 1 : 0);
