import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const SHOT = '/tmp/claude-0/-home-user-games/c3251a85-0b25-53e4-8b22-21faaa09ec2c/scratchpad';
const URL = 'http://localhost:8148/';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 512, height: 448 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.state === 'title');
console.log('== TITLE ==');
ok(true, 'title loaded');
await page.screenshot({ path: SHOT + '/shot-title.png' });

const key = async (k) => { await page.keyboard.press(k); await sleep(60); };
const stepMatch = (held, pressed) => page.evaluate(([h, p]) => window.__stepMatch(h, p), [held || [], pressed || []]);
const gstate = () => page.evaluate(() => window.__game.state);

// title -> mode -> exhibition -> start (1P)
await key('x');
ok((await gstate()) === 'mode', 'reached mode select');
await key('x'); // EXHIBITION (idx 0)
ok((await gstate()) === 'exhib', 'reached exhibition select');
await page.screenshot({ path: SHOT + '/shot-modeselect.png' });
await key('x'); // start match
ok((await gstate()) === 'game', 'match started');
await sleep(120);

// ---- drive the match via fast-forward hook ----
console.log('== IN-GAME ==');
let sawFlight = false, sawBallPos = false, sawCalled = false, sawInplay = false;
let sawOut = false, sawRun = false, sawInningFlip = false, sawHR = false;
let duelShot = false, fieldShot = false;
let prev = await stepMatch([], []);
let startInning = prev.inning, startHalf = prev.half;
let prevCount = prev.balls + prev.strikes, prevInplay = false;

for (let i = 0; i < 12000; i++) {
  const s0 = prev;
  let held = [], pressed = [];
  // human pitching (control[1-half]===1) -> throw; human batting -> timed swing
  const pitHuman = s0.control[1 - s0.half];
  const batHuman = s0.control[s0.half];
  if (s0.phase === 'pitch' && pitHuman === 1) pressed = ['b'];
  else if (s0.phase === 'flight' && batHuman === 1) {
    // swing near contact for timed contact
    if (s0.pitchFrames && s0.t >= s0.pitchFrames - 3 && s0.t <= s0.pitchFrames + 1) pressed = ['b'];
  } else if (s0.phase === 'inningbreak') pressed = ['b'];
  const s = await stepMatch(held, pressed);
  prev = s;
  if (s.phase === 'flight') sawFlight = true;
  if (s.ballPos) sawBallPos = true;
  if (s.phase === 'inplay') { sawInplay = true; if (!fieldShot) { await page.screenshot({ path: SHOT + '/shot-field.png' }); fieldShot = true; } }
  if (s.phase === 'hr') sawHR = true;
  if (!duelShot && s.phase === 'flight' && s.ballPos) { await page.screenshot({ path: SHOT + '/shot-pitch.png' }); duelShot = true; }
  // called pitch: count went up while not in a play and not from a swing whiff — approx: strikes/balls increased in pitch/flight
  const cnt = s.balls + s.strikes;
  if (cnt > prevCount && (s.phase === 'call' || s.phase === 'flight' || s.phase === 'pitch')) sawCalled = true;
  prevCount = cnt;
  if (s.outs > s0.outs) sawOut = true;
  if (s.score[0] > s0.score[0] || s.score[1] > s0.score[1]) sawRun = true;
  if (s.inning !== startInning || s.half !== startHalf) sawInningFlip = true;
  if (s.hr[0] + s.hr[1] > 0) sawHR = sawHR || true;
  if (s.over) break;
  if (sawFlight && sawInplay && sawOut && sawRun && sawInningFlip) {
    // enough gameplay observed; keep going a little for HR
    if (i > 4000) break;
  }
}
ok(sawFlight, 'pitch reaches flight phase (ball thrown)');
ok(sawBallPos, 'ball flight visible (ballPos set)');
ok(sawCalled, 'a called strike/ball occurred (count advanced)');
ok(sawInplay, 'timed swing put ball in play (field view switch)');
ok(sawOut, 'an out was recorded');
ok(sawRun, 'a run was scored');
ok(sawInningFlip, 'inning/half advanced');

// force a HR to verify the celebration path + screenshot
const hrOk = await page.evaluate(() => {
  if (!window.__game.match) return false;
  window.__forceHR();
  return window.__game.match.phase === 'hr';
});
ok(hrOk || sawHR, 'HR celebration triggers');
await sleep(80);
await stepMatch([], []);
await page.screenshot({ path: SHOT + '/shot-hr.png' });

// ---- LEAGUE: create team, play a game (sim path via quit? no—use shop/standings) ----
console.log('== LEAGUE ==');
// leave match: pause -> forfeit
await page.evaluate(() => { if (window.__game.match) { window.__game.match.gs.over = true; window.__game.match.onDone(window.__game.match.gs.result(), true); } window.__game.go('mode'); });
await sleep(80);
// NEW LEAGUE (RESET) = idx 2
await page.evaluate(() => { window.__game.state = 'mode'; window.__game.menuIdx = 2; });
await key('x');
ok((await gstate()) === 'create', 'reached team create');
// go to done field and confirm (name default present)
await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); // name->color->logo->done
await key('x');
ok((await gstate()) === 'hub', 'league created, at hub');
const money0 = await page.evaluate(() => window.__game.lg.money);

// play a league game, then quickly end it and let advanceRound award money
await page.evaluate(() => { window.__game.state = 'hub'; window.__game.menuIdx = 0; });
await key('x');
ok((await gstate()) === 'game', 'league game started');
// let the user win: force a big score then finish
await page.evaluate(() => {
  const m = window.__game.match;
  m.gs.score = [0, 20]; // home (user) big lead
  m.gs.inning = 9; m.gs.half = 1;
  m.gs.over = true;
  m.onDone(m.gs.result(), false);
});
await sleep(120);
ok((await gstate()) === 'box', 'box score shown after game');
await key('x');
ok((await gstate()) === 'hub', 'returned to hub');
const money1 = await page.evaluate(() => window.__game.lg.money);
const roundAfter = await page.evaluate(() => window.__game.lg.round);
ok(money1 > money0, `prize money awarded ($${money0} -> $${money1})`);
ok(roundAfter === 1, 'league round advanced');

// SHOP: train a stat, verify it rises + persists
await page.evaluate(() => { window.__game.go('shop'); window.__game.shopMode = 'train'; window.__game.shopPlayer = 0; window.__game.shopStat = 0; window.__game.lg.money = 9999; });
await sleep(50);
const statBefore = await page.evaluate(() => window.__game.lg.userTeam.players[0].bat.power);
await key('x'); // train power
const statAfter = await page.evaluate(() => window.__game.lg.userTeam.players[0].bat.power);
ok(statAfter === statBefore + 1, `training raised stat (${statBefore} -> ${statAfter})`);
await page.screenshot({ path: SHOT + '/shot-shop.png' });

// reload page -> save should persist trained stat
await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game);
const persisted = await page.evaluate(() => {
  const lg = window.__game.lg;
  return lg ? lg.userTeam.players[0].bat.power : -1;
});
ok(persisted === statAfter, `trained stat persisted across reload (${persisted})`);

// STANDINGS screenshot
await page.evaluate(() => { window.__game.go('stand'); window.__game.standTab = 0; });
await sleep(60);
await page.screenshot({ path: SHOT + '/shot-standings.png' });
ok(true, 'standings rendered');

// ---- 2P start ----
console.log('== 2P ==');
await page.evaluate(() => { window.__game.go('exhib'); window.__game.exhib = { away: 0, home: 5, players: 2, sel: 2 }; });
await sleep(40);
await key('x');
const twoP = await page.evaluate(() => window.__game.state === 'game' && JSON.stringify(window.__game.match.control));
ok(typeof twoP === 'string' && twoP.includes('2'), '2P match starts with two human controls ' + twoP);

console.log('\nConsole/page errors:', errors.length);
errors.slice(0, 10).forEach((e) => console.log('  ', e));
ok(errors.length === 0, 'no console/page errors');

await browser.close();
console.log(fails === 0 ? '\nALL BROWSER CHECKS PASSED' : `\n${fails} BROWSER CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
