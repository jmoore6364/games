// Headless browser verification + screenshots. Run: node test/browser-test.mjs
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const SHOT = '/tmp/claude-0/-home-user-games/c3251a85-0b25-53e4-8b22-21faaa09ec2c/scratchpad';
const URL = 'http://localhost:8152';

const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 620 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? '  ok  ' : 'FAIL  ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const wait = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `${SHOT}/${n}` });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction('window.__ready === true', { timeout: 8000 });
await wait(200);

// ---- title
await shot('dm-01-title.png');
console.log('captured title');

// ---- class select
await page.evaluate(() => { window.__dm.game.screen = 'classselect'; });
await wait(150); await shot('dm-02-classselect.png');
console.log('captured class select');

// ---- start as sorcerer -> town
let s = await page.evaluate(() => window.__dm.start('sorcerer'));
await wait(300);
s = await page.evaluate(() => window.__dm.state());
ok('game starts in town', s.scene === 'town' && s.screen === 'playing', JSON.stringify({ scene: s.scene, hp: s.hp }));
ok('player has HP and mana', s.hp > 0 && s.mp > 0, `hp=${s.hp} mp=${s.mp}`);
await shot('dm-03-town.png');
console.log('captured town');

// ---- movement
const p0 = await page.evaluate(() => { const p = window.__dm.game.player; return { x: p.x, y: p.y }; });
await page.evaluate(() => { window.__dm.moveTo(window.__dm.game.player.x + 4, window.__dm.game.player.y + 2); for (let i = 0; i < 60; i++) window.__dm.step(1 / 30); });
const p1 = await page.evaluate(() => { const p = window.__dm.game.player; return { x: p.x, y: p.y }; });
ok('player moves when commanded', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 1, `moved=${Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(2)}`);

// ---- descend to dungeon
const desc = await page.evaluate(() => window.__dm.descend());
await wait(200);
s = await page.evaluate(() => { window.__dm.step(1 / 30, 5); return window.__dm.state(); });
ok('descend enters dungeon depth 1', s.scene === 'dungeon' && s.depth === 1, JSON.stringify({ depth: s.depth, monsters: s.monsters }));
ok('dungeon has monsters', s.monsters > 0, `monsters=${s.monsters}`);

// spawn a couple monsters near for a lively dungeon shot, then screenshot
await page.evaluate(() => { window.__dm.spawnMonsterNear('skeleton'); window.__dm.spawnMonsterNear('fallen'); for (let i = 0; i < 20; i++) window.__dm.step(1 / 30); });
await wait(250); await shot('dm-04-dungeon.png');
console.log('captured dungeon');

// frame variation (not flat)
const fs = await page.evaluate(() => window.__dm.frameStats());
ok('dungeon scene has brightness variation', fs.range > 40, `range=${fs.range.toFixed(0)}`);
ok('dungeon scene has many colors', fs.colors > 12, `colors=${fs.colors}`);

// ---- attack a monster -> kill + xp
const atk = await page.evaluate(() => { window.__dm.spawnMonsterNear('skeleton'); return window.__dm.attackNearest(600); });
ok('attacking kills a monster', atk.killed === true);
ok('kill grants XP', atk.xpAfter !== atk.xpBefore || atk.leveled, `xp ${atk.xpBefore}->${atk.xpAfter} leveled=${atk.leveled}`);

// ---- loot + equip changes stats
const eq = await page.evaluate(() => { window.__dm.dropTestItem(); for (let i = 0; i < 5; i++) window.__dm.step(1 / 30); return window.__dm.pickupAndEquip(); });
ok('picking up + equipping changes damage', eq.ok && eq.dmgAfter !== eq.dmgBefore, JSON.stringify(eq));

// ---- potion refills
const q = await page.evaluate(() => window.__dm.quaffTest());
ok('quaffing a potion refills health', q.after > q.before, `${q.before}->${q.after}`);

// ---- inventory / character sheet
await page.evaluate(() => window.__dm.openInventory());
await wait(150);
// hover an inventory item to trigger tooltip
await page.evaluate(() => { const c = window.__dm.game && document; });
await page.evaluate(() => {
  window.__dm.game.player.inv.push(JSON.parse(JSON.stringify({ uid: 999, base: 'axe', name: 'Vicious War Axe of Vigor', type: 'weapon', slot: 'weapon', rarity: 'rare', identified: true, dmgMin: 8, dmgMax: 18, ranged: false, affixes: [{ key: 'vicious', stat: 'dmg', value: 12, isPre: true, label: '+12 damage' }, { key: 'of vigor', stat: 'life', value: 20, isPre: false, label: '+20 life' }] })));
});
await wait(120); await shot('dm-05-inventory.png');
console.log('captured inventory');
const invState = await page.evaluate(() => ({ overlay: window.__dm.game.overlay, inv: window.__dm.game.player.inv.length }));
ok('inventory overlay opens', invState.overlay === 'inventory');

// tooltip: place mouse over first inventory cell
const cell = await page.evaluate(() => { const c = window.__dm.game; const cells = (window.__hudCells = null); return null; });
await page.evaluate(() => {
  // find an inv cell rect from the drawn HUD and set input coords over it
  const cells = window.__dm.game.player.inv.length;
  // trigger a render then read HUD via re-derive is complex; set input to the grid area
  // hover the rare axe (3rd inventory cell) to show its affixes
  window.__dm.game.input.mx = 346; window.__dm.game.input.my = 64;
});
await wait(150); await shot('dm-06-tooltip.png');
console.log('captured tooltip');
await page.evaluate(() => window.__dm.closeOverlay());

// ---- boss (buff hero so it survives the fight for the demo)
await page.evaluate(() => { const p = window.__dm.game.player; p.vit = 300; p.level = 12; window.__dm.game.stats = null; });
const boss = await page.evaluate(() => window.__dm.gotoBoss());
await page.evaluate(() => { window.__dm.step(1 / 30, 6); });
await wait(120); await shot('dm-07-boss.png');
console.log('captured boss');
ok('boss level reached with boss present', boss.depth === 5 && boss.boss, JSON.stringify(boss));
const dmgB = await page.evaluate(() => window.__dm.damageBoss(80));
ok('boss takes damage', dmgB.ok && dmgB.hp < 600, `hp=${dmgB.hp}`);

// ---- kill boss -> victory
const win = await page.evaluate(() => window.__dm.killBoss());
await wait(150);
ok('killing boss triggers victory', win.ok && win.screen === 'victory', JSON.stringify(win));
await shot('dm-08-victory.png');

// ---- save round-trip in-browser
const saved = await page.evaluate(() => { return !!localStorage.getItem('diablmoore_save_v1'); });
ok('game writes a save to localStorage', saved);

console.log(`\nconsole/page errors: ${errors.length}`);
for (const e of errors) console.log('  ' + e);
ok('zero console/page errors', errors.length === 0);

console.log(`\n${fails === 0 ? 'ALL BROWSER CHECKS PASSED' : fails + ' CHECKS FAILED'}`);
await browser.close();
process.exit(fails ? 1 : 0);
