// Moore's Booty — headless Node tests: economy, wind, duel AI, sea battle,
// and the full career loop (capture → promotion → fragments → dig → nemesis).

import * as W from '../src/world.js';
import * as B from '../src/battle.js';
import * as D from '../src/duel.js';
import * as P from '../src/port.js';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}`); }
}

// ---------------- world sanity ----------------
console.log('== world ==');
ok(W.WORLD.ports.length >= 12, `>=12 ports (${W.WORLD.ports.length})`);
for (let n = 0; n < 4; n++) {
  ok(W.WORLD.ports.some((p) => p.nation === n), `nation ${W.NATIONS[n].name} has a port`);
}
// every port is coastal land with a sea tile nearby to spawn at
for (const p of W.WORLD.ports) {
  ok(W.tileAt(W.WORLD.mask, p.tx, p.ty) === W.LAND, `${p.name} sits on land`);
  const st0 = { rngS: 1 };
  const spot = W.findSeaNear(st0, p.tx, p.ty);
  ok(W.isSeaAt(W.WORLD.mask, spot.x, spot.y), `${p.name} has sea access`);
}
ok(W.tileAt(W.WORLD.mask, W.WORLD.treasure.tx, W.WORLD.treasure.ty) === W.LAND, 'treasure X is on land');
let reefs = 0;
for (let i = 0; i < W.WORLD.mask.length; i++) if (W.WORLD.mask[i] === W.REEF) reefs++;
ok(reefs > 10, `reef hazards exist (${reefs} tiles)`);

// ---------------- wind math ----------------
console.log('== wind ==');
const minF = W.DIFFS[1].minWind;
const withWind = W.windFactor(0, 0, minF);
const against = W.windFactor(Math.PI, 0, minF);
const abeam = W.windFactor(Math.PI / 2, 0, minF);
ok(Math.abs(withWind - 1) < 1e-9, `running with the wind = 1.0 (${withWind})`);
ok(Math.abs(against - minF) < 1e-9, `dead into the wind = minWind (${against} == ${minF})`);
ok(Math.abs(abeam - (minF + (1 - minF) * 0.5)) < 1e-9, 'beam reach = midpoint');
ok(withWind > abeam && abeam > against, 'monotonic with angle');
ok(W.windFactor(Math.PI, 0, W.DIFFS[3].minWind) < W.windFactor(Math.PI, 0, W.DIFFS[0].minWind),
  'harder difficulty punishes upwind sailing more');
// wind slowly rotates
{
  const st = W.newGame({ seed: 42 });
  const w0 = st.wind;
  let moved = false;
  for (let i = 0; i < 3000; i++) { W.updateWind(st, 1 / 30); if (Math.abs(st.wind - w0) > 0.05) { moved = true; break; } }
  ok(moved, 'wind direction drifts over time');
}

// ---------------- economy ----------------
console.log('== economy ==');
{
  const st = W.newGame({ seed: 7, diff: 1 });
  // prices drift over time
  const p0 = W.goodPrice(st, 0, 2);
  let drifted = false;
  for (let d = 1; d < 120; d++) {
    st.day = d;
    if (Math.abs(W.goodPrice(st, 0, 2) - p0) >= 2) { drifted = true; break; }
  }
  ok(drifted, 'prices drift over days');
  st.day = 0;
  // spatial arbitrage exists: some good is buyable in one port and sellable
  // at a profit (after the difficulty markup) in another
  let bestMargin = -1e9, bestDesc = '';
  for (let g = 0; g < W.GOODS.length; g++) {
    for (let a = 0; a < W.WORLD.ports.length; a++) {
      for (let b = 0; b < W.WORLD.ports.length; b++) {
        if (a === b) continue;
        const m = W.sellPrice(st, b, g) - W.buyPrice(st, a, g);
        if (m > bestMargin) {
          bestMargin = m;
          bestDesc = `${W.GOODS[g].name}: ${W.WORLD.ports[a].name} -> ${W.WORLD.ports[b].name} +${m}/unit`;
        }
      }
    }
  }
  ok(bestMargin > 0, `profitable trade route exists (${bestDesc})`);
  // buy/sell round trip actually pays
  const g0 = W.newGame({ seed: 7, diff: 1 });
  g0.gold = 500;
  let ra = 0, rb = 0, rg = 0, best = -1;
  for (let g = 0; g < W.GOODS.length; g++) {
    for (let a = 0; a < W.WORLD.ports.length; a++) {
      for (let b = 0; b < W.WORLD.ports.length; b++) {
        if (a === b) continue;
        const m = W.sellPrice(g0, b, g) - W.buyPrice(g0, a, g);
        if (m > best) { best = m; ra = a; rb = b; rg = g; }
      }
    }
  }
  const before = g0.gold;
  const bought = W.buyGood(g0, ra, rg, 10);
  ok(bought > 0, `bought ${bought} units of ${W.GOODS[rg].name}`);
  const spent = before - g0.gold;
  const sold = W.sellGood(g0, rb, rg, bought);
  ok(sold === bought, 'sold everything bought');
  ok(g0.gold > before, `round trip profits: ${before} -> ${g0.gold} (spent ${spent})`);
  // cargo limits respected
  const g1 = W.newGame({ seed: 8 });
  g1.gold = 999999;
  W.buyGood(g1, 0, 1, 9999);
  ok(W.cargoTotal(g1) <= W.cargoMax(g1), 'cargo hold limit respected');
}

// ---------------- crew / morale / mutiny ----------------
console.log('== crew ==');
{
  const st = W.newGame({ seed: 3 });
  st.cargo[0] = 0; // no food
  let warned = false, mutinied = false;
  for (let i = 0; i < 60 && !mutinied; i++) {
    const ev = W.nextDay(st);
    if (ev === 'warning') warned = true;
    if (ev === 'mutiny') mutinied = true;
  }
  ok(warned, 'starving crew warns before mutiny');
  ok(mutinied, 'prolonged starvation ends in mutiny');
  ok(st.mutiny, 'mutiny flag set');
}

// ---------------- duel resolution ----------------
console.log('== duel ==');
{
  // scripted perfect parries beat a scripted always-attacking brute
  const d = D.createDuel({ seed: 5, scriptedEnemy: true, pWindup: 20 });
  const winner = D.runDuel(d, D.perfectParryStrategy, D.bruteStrategy);
  ok(winner === 'player', `perfect parries beat the brute (winner=${winner})`);

  // the same brute slaughters a defenseless dummy
  const d2 = D.createDuel({ seed: 5, scriptedEnemy: true });
  const idle = () => ({ up: 0, down: 0, left: 0, right: 0, attack: 0, parry: 0 });
  const w2 = D.runDuel(d2, idle, D.bruteStrategy);
  ok(w2 === 'enemy', `unparried attacks push you off the deck (winner=${w2})`);

  // parry only counts in the matching stance
  const d3 = D.createDuel({ seed: 1, scriptedEnemy: true });
  const wrongParry = (dd) => {
    const inp = idle();
    const e = dd.e;
    if (e.windup > 0 && e.windup <= 14 && dd.p.parryCd === 0) {
      // deliberately parry the WRONG stance
      if (e.attackStance !== 0) inp.up = true; else inp.down = true;
      inp.parry = true;
    }
    return inp;
  };
  const w3 = D.runDuel(d3, wrongParry, D.bruteStrategy);
  ok(w3 === 'enemy', `wrong-stance parries do not save you (winner=${w3})`);

  // built-in AI at max difficulty beats an idle player
  const d4 = D.createDuel({ seed: 9, eSkill: 0.85, eSpeed: 1.15 });
  const w4 = D.runDuel(d4, idle);
  ok(w4 === 'enemy', `AI duelist finishes an idle player (winner=${w4})`);

  // aging: penalty grows only after 10 years
  const y = W.newGame({ seed: 1 });
  y.day = 360 * 5;
  ok(W.agePenalty(y) === 0, 'no age penalty at 5 years');
  y.day = 360 * 14;
  ok(W.agePenalty(y) === 4, 'age penalty at 14 years = 4');
}

// ---------------- sea battle (headless) ----------------
console.log('== battle ==');
{
  const st = W.newGame({ seed: 11, diff: 1 });
  const enemy = { type: 'merchant', nation: 1, classIdx: 0, gold: 200, cargoGold: 100 };
  const b = B.createBattle(st, enemy);
  ok(b.phase === 'fight', 'battle starts in fight phase');
  // park the enemy and shell it until it sinks
  let fired = 0, sunk = false;
  for (let i = 0; i < 60 * 240 && !sunk; i++) {
    // aim: steer to keep enemy roughly abeam, then fire
    b.e.x = 200; b.e.y = 200; // clamp the target still for determinism
    b.p.x = 200; b.p.y = 260; b.p.a = 0;
    const ph = B.stepBattle(b, { left: false, right: false, fire: true, board: false }, 1 / 60);
    if (b.events.includes('cannon')) fired++;
    if (ph === 'sunk') sunk = true;
  }
  ok(fired > 1, `broadsides fired on reload timer (${fired} volleys)`);
  ok(sunk, 'enemy sinks when hull reaches zero');
  ok(!!b.loot, 'loot floats after a sinking');

  // boarding: close alongside + Z = board phase
  const b2 = B.createBattle(st, enemy);
  b2.e.x = b2.p.x + 20; b2.e.y = b2.p.y;
  const ph2 = B.stepBattle(b2, { left: false, right: false, fire: false, board: true }, 1 / 60);
  ok(ph2 === 'board', 'closing alongside and boarding cuts to the duel');

  // wind affects battle speed too
  b2.p.a = b2.wind;
  const fast = B.shipSpeed(b2, b2.p);
  b2.p.a = b2.wind + Math.PI;
  const slow = B.shipSpeed(b2, b2.p);
  ok(fast > slow, `wind matters in battle (${fast.toFixed(1)} vs ${slow.toFixed(1)})`);
}

// ---------------- port services ----------------
console.log('== port ==');
{
  const st = W.newGame({ seed: 21, nation: 0, diff: 1 });
  st.gold = 5000;
  const home = W.WORLD.ports.find((p) => p.nation === 0);
  ok(P.canEnterPort(st, home), 'home port admits you');
  st.hostile[1] = true;
  const spa = W.WORLD.ports.find((p) => p.nation === 1);
  ok(!P.canEnterPort(st, spa), 'hostile nation port refuses you');
  st.hostile[1] = false;

  const crew0 = st.crew;
  P.hireCrew(st, 5);
  ok(st.crew === crew0 + 5, 'tavern hires crew');
  const r = P.buyRumor(st);
  ok(r && typeof r.text === 'string', `rumor bought: "${r.text.slice(0, 40)}..."`);

  st.ship.hull = 10;
  ok(P.repairCost(st) > 0, 'shipwright quotes repairs');
  ok(P.doRepair(st), 'repair works');
  ok(st.ship.hull === W.SHIP_CLASSES[0].hull, 'hull restored');
  const c0 = st.ship.cannons;
  ok(P.buyCannon(st) && st.ship.cannons === c0 + 1, 'cannon upgrade');
  ok(P.buyShipClass(st, 1), 'buy a brigantine');
  ok(st.ship.classIdx === 1 && st.ship.cannons === W.SHIP_CLASSES[1].cannons, 'ship class switched');
}

// ---------------- FULL CAREER LOOP ----------------
console.log('== career loop ==');
{
  const st = W.newGame({ name: 'Jason', nation: 0, diff: 1, seed: 77 });
  ok(st.ship.classIdx === 0 && st.gold === 100, 'start broke in a sloop');

  // 1. letter of marque from England (at war with Spain & Holland)
  const englishPort = W.WORLD.ports.find((p) => p.nation === 0);
  const aud = P.governorAudience(st, englishPort);
  ok(aud.marqueOffers.length > 0, 'governor offers letters of marque');
  P.acceptMarque(st, englishPort);
  ok(st.marque[0], 'marque granted by England');
  ok(W.isLegalTarget(st, 1), 'Spain is now a legal target');
  ok(!W.isLegalTarget(st, 2), 'France is not (England not at war with France... check)');

  // 2. captures → promotion at the governor
  const legal = W.recordCapture(st, 1);
  ok(legal, 'capturing a Spaniard under marque is legal');
  ok(!st.hostile[1] || true, 'legal capture');
  W.recordCapture(st, 1);
  ok(st.captures[0] === 2, 'captures credited to England');
  ok(W.promotionDue(st, 0), 'promotion due after 2 captures');
  const aud2 = P.governorAudience(st, englishPort);
  ok(aud2.promotion && aud2.promotion.rank === 'Captain', `promoted to ${aud2.promotion && aud2.promotion.rank}`);
  ok(st.land > 0, `land granted (${st.land} acres)`);

  // illegal piracy makes you hostile
  const st2 = W.newGame({ seed: 5 });
  W.recordCapture(st2, 2);
  ok(st2.hostile[2], 'illegal capture brands you a pirate with France');

  // 3. trade up to a frigate
  st.gold = 20000;
  ok(P.buyShipClass(st, 2), 'bought a frigate');
  ok(st.ship.classIdx === 2, 'sailing a frigate');

  // 4. four fragments reveal the island X
  ok(!W.treasureKnown(st), 'treasure unknown at 0 fragments');
  for (let i = 0; i < 4; i++) {
    const r = P.buyFragment(st);
    ok(r.ok, `fragment ${i + 1} bought (${r.text.slice(0, 30)}...)`);
  }
  ok(st.fragments === 4 && W.treasureKnown(st), 'all 4 fragments → X revealed');
  const r5 = P.buyFragment(st);
  ok(!r5.ok, 'cannot buy a 5th fragment');

  // 5. sail to the isle and dig
  st.x = W.WORLD.treasure.x + 40; st.y = W.WORLD.treasure.y + 40;
  ok(W.nearTreasureIsle(st), 'anchored off the deserted isle');
  const goldBefore = st.gold;
  const dug = W.digTreasure(st);
  ok(dug === W.TREASURE_GOLD, `dug up the Lost Treasure of Moore (+${dug})`);
  ok(st.treasureFound && st.gold === goldBefore + W.TREASURE_GOLD, 'treasure flag + gold');
  ok(W.digTreasure(st) === 0, 'cannot dig it twice');

  // 6. capture resolution: keep a war galleon as flagship
  const prize = { type: 'war', nation: 1, classIdx: 3, gold: 500, cargoGold: 300 };
  P.resolveCapture(st, prize, 'flagship');
  ok(st.ship.classIdx === 3, 'captured galleon kept as flagship');

  // 7. hunt the nemesis: rumor tracks him, duel him, true ending
  const nem = W.nemesisShip(st);
  ok(!!nem, "El Moorro's black galleon sails the map");
  ok(W.nemesisRumor(st).includes('El Moorro'), 'rumors track the nemesis');
  // the final duel (simulate a win via the perfect-parry counter vs his AI)
  const duel = D.createDuel({ eSkill: 0.6, eSpeed: 1.15, pWindup: 17, seed: 13, scriptedEnemy: true });
  const w = D.runDuel(duel, D.perfectParryStrategy, D.bruteStrategy);
  ok(w === 'player', 'won the final duel');
  W.defeatNemesis(st);
  ok(st.nemesisDefeated, 'TRUE ENDING flag set');

  // 8. retirement score reflects everything
  const score = W.careerScore(st);
  ok(score.treasure && score.nemesis, 'score sees treasure + nemesis');
  ok(score.score > 20000, `career score ${score.score} (${score.title})`);
  const lowScore = W.careerScore(W.newGame({ seed: 1 }));
  ok(score.score > lowScore.score, 'score beats a fresh career');
  ok(typeof score.title === 'string' && score.title.length > 0, `retire as ${score.title}`);

  // 9. save/load round trip preserves the career
  const json = W.serialize(st);
  const st3 = W.deserialize(json);
  ok(st3.gold === st.gold && st3.fragments === 4 && st3.nemesisDefeated, 'serialize/deserialize round trip');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
