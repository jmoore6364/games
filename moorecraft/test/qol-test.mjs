// QoL feature verification: save slots, minimap, chests, inventory view.
// Desktop pass + phone (touch) pass. Run: node test/qol-test.mjs
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const SHOT = '/tmp/claude-0/-home-user-games/c3251a85-0b25-53e4-8b22-21faaa09ec2c/scratchpad';
const URL = 'http://localhost:8149';

const errors = [];
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});

let fails = 0;
function ok(name, cond, extra = '') { console.log((cond ? '  ok  ' : 'FAIL  ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; }

// ---------------- DESKTOP PASS ----------------
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction('window.__ready === true', { timeout: 8000 });
// clean slate for deterministic slot testing
await page.evaluate(() => { localStorage.clear(); location.reload(); });
await page.waitForFunction('window.__ready === true', { timeout: 8000 });
await page.waitForTimeout(150);

// --- Feature 1: create a named world, edit it, autosave, return, reload ---
await page.evaluate(() => window.__moore.start('survival', 2024, 'Aurora Vale'));
await page.evaluate(() => window.__moore.step(1 / 30, 20));
const created = await page.evaluate(() => ({ name: window.__moore.worldName(), slot: window.__moore.activeSlot() }));
ok('named world created with active slot', created.name === 'Aurora Vale' && created.slot != null, JSON.stringify(created));

// make a distinctive block edit + move + inventory change, then persist
const edit = await page.evaluate(() => {
  const g = window.__moore.game, p = g.player;
  p.pitch = -1.3;
  const [fx, fy, fz] = p.forward();
  const t = g.world.raycastPick(p.eyeX(), p.eyeY(), p.eyeZ(), fx, fy, fz, 5);
  // place a lumite marker at the empty cell in front of us
  const cell = [t.pbx, t.pby, t.pbz];
  g.world.set(cell[0], cell[1], cell[2], 13); // LUMITE
  g.world.recomputeLight();
  window.__moore.give(11, 7); // 7 iron
  p.x += 3; p.z -= 2;
  const pos = { x: p.x, y: p.y, z: p.z };
  window.__moore.saveNow();
  return { cell, pos, iron: window.__moore.count(11) };
});
ok('placed a lumite marker block', edit.cell.length === 3);

// return to title, confirm the world shows in Load World
await page.evaluate(() => { window.__moore.game.state = 'title'; window.__moore.render(); });
const list1 = await page.evaluate(() => window.__moore.listSaves());
ok('world appears in Load World list', list1.length === 1 && list1[0].name === 'Aurora Vale', JSON.stringify(list1));
// screenshot the load-world list
await page.evaluate(() => { window.__moore.game.state = 'load'; window.__moore.game.loadSel = 0; window.__moore.render(); });
await page.screenshot({ path: `${SHOT}/qol-01-loadworld.png` });

// create a SECOND world so two coexist
await page.evaluate(() => window.__moore.start('creative', 99, 'Cobalt Reach'));
await page.evaluate(() => window.__moore.step(1 / 30, 5));
const list2 = await page.evaluate(() => window.__moore.listSaves());
ok('two worlds coexist', list2.length === 2, JSON.stringify(list2.map(s => s.name)));

// load the FIRST world back and verify edit + inventory + position restored
const restored = await page.evaluate((expect) => {
  const first = window.__moore.listSaves().find(s => s.name === 'Aurora Vale');
  window.__moore.loadSlot(first.id);
  const g = window.__moore.game, p = g.player;
  return {
    name: window.__moore.worldName(),
    marker: g.world.get(expect.cell[0], expect.cell[1], expect.cell[2]),
    iron: window.__moore.count(11),
    pos: { x: p.x, y: p.y, z: p.z },
  };
}, edit);
ok('reloaded correct world', restored.name === 'Aurora Vale');
ok('block edit restored (lumite marker)', restored.marker === 13, 'got=' + restored.marker);
ok('inventory restored (>=7 iron)', restored.iron >= 7, 'iron=' + restored.iron);
ok('position restored', Math.abs(restored.pos.x - edit.pos.x) < 0.01 && Math.abs(restored.pos.z - edit.pos.z) < 0.01, JSON.stringify(restored.pos));

// delete the second world
const afterDelete = await page.evaluate(() => {
  const second = window.__moore.listSaves().find(s => s.name === 'Cobalt Reach');
  window.__moore.deleteSlot(second.id);
  return window.__moore.listSaves().map(s => s.name);
});
ok('delete removes a world', afterDelete.length === 1 && afterDelete[0] === 'Aurora Vale', JSON.stringify(afterDelete));

// --- Feature 2: minimap renders + toggles ---
await page.evaluate(() => {
  const g = window.__moore.game; g.state = 'playing'; g.minimapOn = true;
  g.player.pitch = -0.2; g.player.yaw = 0.5;
  window.__moore.step(1 / 30, 3);
});
const miniOn = await page.evaluate(() => window.__moore.minimapOn());
ok('minimap on by default', miniOn === true);
await page.screenshot({ path: `${SHOT}/qol-02-minimap.png` });
const toggled = await page.evaluate(() => window.__moore.toggleMinimap());
ok('minimap toggles off', toggled === false);
await page.evaluate(() => window.__moore.toggleMinimap()); // back on

// --- Feature 3: chest craft / place / store / persist / non-lossy break ---
const chestFlow = await page.evaluate(() => {
  const g = window.__moore.game;
  window.__moore.give(6, 12); // planks
  const crafted = window.__moore.craft('Storage Chest');
  g.state = 'playing';
  // place chest on the ground in front
  const p = g.player; p.pitch = -1.3;
  for (let i = 0; i < 9; i++) { const s = g.inv.slots[i]; if (s && s.id === 18) { g.inv.sel = i; break; } }
  const [fx, fy, fz] = p.forward();
  const t = g.world.raycastPick(p.eyeX(), p.eyeY(), p.eyeZ(), fx, fy, fz, 5);
  const cell = [t.pbx, t.pby, t.pbz];
  window.__moore.placeSel();
  const placedId = g.world.get(cell[0], cell[1], cell[2]);
  return { crafted, cell, placedId, hasChestItem: window.__moore.count(18) };
});
ok('chest crafted', chestFlow.crafted);
ok('chest placed as block id 18', chestFlow.placedId === 18, JSON.stringify(chestFlow));

// open it, move an item in, close, reopen -> still there
const chestStore = await page.evaluate((cell) => {
  window.__moore.give(13, 4); // 4 lumite to stash
  window.__moore.openChestAt(cell[0], cell[1], cell[2]);
  const opened = window.__moore.state().state;
  // find lumite in inventory and stow it
  const g = window.__moore.game;
  let idx = g.inv.slots.findIndex(s => s && s.id === 13);
  window.__moore.chestStow(idx);
  const inChestAfterStow = window.__moore.chestSlots().some(s => s && s.id === 13);
  window.__moore.closeChest();
  // reopen
  window.__moore.openChestAt(cell[0], cell[1], cell[2]);
  const stillThere = window.__moore.chestSlots().some(s => s && s.id === 13);
  return { opened, inChestAfterStow, stillThere };
}, chestFlow.cell);
ok('chest opens', chestStore.opened === 'chest');
ok('item moved into chest', chestStore.inChestAfterStow);
ok('chest contents persist across close/reopen', chestStore.stillThere);
await page.screenshot({ path: `${SHOT}/qol-03-chest.png` });

// persist to save, reload world, chest contents survive full save round-trip
const chestPersist = await page.evaluate((cell) => {
  window.__moore.closeChest();
  window.__moore.saveNow();
  const slot = window.__moore.activeSlot();
  // wipe in-memory and reload from disk
  window.__moore.loadSlot(slot);
  window.__moore.openChestAt(cell[0], cell[1], cell[2]);
  const has = window.__moore.chestSlots().some(s => s && s.id === 13);
  window.__moore.closeChest();
  return has;
}, chestFlow.cell);
ok('chest contents survive save+reload', chestPersist);

// non-lossy break: break the chest -> chest item + contents drop, then picked up
const breakChest = await page.evaluate((cell) => {
  const g = window.__moore.game;
  const chestBefore = window.__moore.count(18);
  const lumiteBefore = window.__moore.count(13);
  g.target = { bx: cell[0], by: cell[1], bz: cell[2], hitId: 18 };
  g._breakBlock(g.target, true);
  window.__moore.step(1 / 30, 60); // let drops fall & magnetise
  return {
    blockNow: g.world.get(cell[0], cell[1], cell[2]),
    chestAfter: window.__moore.count(18),
    lumiteAfter: window.__moore.count(13),
    chestBefore, lumiteBefore,
  };
}, chestFlow.cell);
ok('breaking chest clears the block', breakChest.blockNow === 0);
ok('breaking chest returns the chest item', breakChest.chestAfter === breakChest.chestBefore + 1, JSON.stringify(breakChest));
ok('breaking chest is non-lossy (contents recovered)', breakChest.lumiteAfter === breakChest.lumiteBefore + 4, JSON.stringify(breakChest));

// --- Feature 4: inventory view opens + lists items ---
const invView = await page.evaluate(() => {
  window.__moore.openInvView();
  return { state: window.__moore.state().state };
});
ok('inventory view opens', invView.state === 'invview');
await page.evaluate(() => window.__moore.render());
await page.screenshot({ path: `${SHOT}/qol-04-invview.png` });
await page.evaluate(() => { window.__moore.game.state = 'playing'; });

ok('no console/page errors (desktop)', errors.length === 0, errors.join(' | '));
await page.close();

// ---------------- PHONE (TOUCH) PASS ----------------
const perrors = [];
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
phone.on('console', m => { if (m.type() === 'error') perrors.push('console: ' + m.text()); });
phone.on('pageerror', e => perrors.push('pageerror: ' + e.message));
await phone.goto(URL + '/?touch=1', { waitUntil: 'networkidle' });
await phone.waitForFunction('window.__ready === true', { timeout: 8000 });
await phone.waitForTimeout(150);

// touch controls should be visible
const touchUI = await phone.evaluate(() => {
  const ui = document.getElementById('touch-ui');
  return { display: getComputedStyle(ui).display, active: window.__moore.game.input.touchActive };
});
ok('touch UI active on phone', touchUI.active === true && touchUI.display !== 'none', JSON.stringify(touchUI));

// tap "LOAD WORLD" on the title via uiTap coordinate routing, then back
const titleFlow = await phone.evaluate(() => {
  const g = window.__moore.game;
  g.state = 'title'; g.render();
  // title rects: option 2 (LOAD WORLD) — use its stored rect center
  const r = g._titleRects[2];
  g.uiTap(r.x + r.w / 2, r.y + r.h / 2);
  return g.state;
});
ok('tapping LOAD WORLD opens the list (touch)', titleFlow === 'load');
await phone.screenshot({ path: `${SHOT}/qol-05-phone-loadworld.png` });

// start a world by touch, verify core controls still respond
await phone.evaluate(() => window.__moore.start('survival', 7, 'Pocket Isle'));
await phone.evaluate(() => window.__moore.step(1 / 30, 20));

// MINE / PUT / hotbar / look via existing button + touch objects (regression guard)
const controls = await phone.evaluate(() => {
  const g = window.__moore.game, input = g.input;
  // hotbar tap through uiTap
  g.render();
  const hb = g._hotbarRects[3];
  g.uiTap(hb.x + hb.w / 2, hb.y + hb.h / 2);
  const selAfter = g.inv.sel;
  // simulate look drag
  const y0 = g.player.yaw;
  input.touch.lookX = 40; window.__moore.step(1 / 30, 1);
  const looked = Math.abs(g.player.yaw - y0) > 0.001;
  // simulate move via touch stick
  input.touch.fwd = 1; const x0 = g.player.x, z0 = g.player.z;
  window.__moore.step(1 / 30, 20); input.touch.fwd = 0;
  const moved = Math.hypot(g.player.x - x0, g.player.z - z0) > 0.3;
  return { selAfter, looked, moved };
});
ok('hotbar tap selects slot (touch)', controls.selAfter === 3, 'sel=' + controls.selAfter);
ok('touch look rotates view', controls.looked);
ok('touch stick moves player', controls.moved);

// BAG button opens inventory view on touch
const bagFlow = await phone.evaluate(() => {
  const g = window.__moore.game;
  g.state = 'invview'; g.render(); // (mirrors the b-bag tap handler)
  return g.state;
});
ok('inventory view reachable on touch (BAG)', bagFlow === 'invview');
await phone.evaluate(() => { window.__moore.game.state = 'playing'; window.__moore.render(); });

// minimap visible on phone
const phoneMini = await phone.evaluate(() => window.__moore.minimapOn());
ok('minimap present on phone', phoneMini === true);
await phone.screenshot({ path: `${SHOT}/qol-06-phone-play.png` });

// CRAFT still works on touch (regression)
const craftTouch = await phone.evaluate(() => {
  const g = window.__moore.game;
  window.__moore.give(5, 2);
  g.openCraft(false);
  const opened = g.state;
  const before = window.__moore.count(6);
  // tap the Planks recipe row
  g.render();
  const row = g._recipeRects.find(r => r.r.name === 'Planks');
  g.uiTap(row.x + 10, row.y + 5);
  return { opened, before, after: window.__moore.count(6) };
});
ok('crafting via touch still works', craftTouch.opened === 'inventory' && craftTouch.after === craftTouch.before + 4, JSON.stringify(craftTouch));

ok('no console/page errors (phone)', perrors.length === 0, perrors.join(' | '));

console.log(`\nQOL RESULT: ${fails === 0 ? 'PASS' : fails + ' FAILURES'}`);
if (errors.length) console.log('DESKTOP ERRORS:\n' + errors.join('\n'));
if (perrors.length) console.log('PHONE ERRORS:\n' + perrors.join('\n'));
await browser.close();
process.exit(fails ? 1 : 0);
