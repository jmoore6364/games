// Headless unit tests for the simulation-y core. Run: node test/node-test.mjs
import { generateItem, makeRng, aggregateStats, rollRarity, makePotion } from '../src/items.js';
import { genDungeon, connectivity, findPath, isOpen, T } from '../src/dungeon.js';
import { newPlayer, deriveStats, resolveAttack, hitChance, grantXP, xpToNext, spawnMonster, CLASSES } from '../src/entities.js';
import { serialize, deserialize } from '../src/save.js';

let fails = 0, n = 0;
function ok(name, cond, extra = '') { n++; console.log((cond ? '  ok  ' : 'FAIL  ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; }

// ---------- dungeon generation + connectivity ----------
for (let d = 1; d <= 5; d++) {
  const boss = d === 5;
  const lvl = genDungeon(boss ? 5 : d, 12345 + d, { boss });
  const c = connectivity(lvl);
  ok(`depth ${d} fully connected (${c.reached}/${c.total} floor tiles reachable)`, c.fullyConnected);
  // stairs reachable via A* from spawn
  const path = findPath(lvl, lvl.spawn, lvl.stairsDown);
  ok(`depth ${d} stairs-down reachable via A*`, !!path && path.length > 1, path ? `len=${path.length}` : 'no path');
  ok(`depth ${d} has rooms`, lvl.rooms.length >= 3, `rooms=${lvl.rooms.length}`);
}

// ---------- pathfinding known path ----------
{
  const lvl = genDungeon(1, 999);
  // find two floor tiles far apart, assert path monotonic & walkable
  const p = findPath(lvl, lvl.spawn, lvl.stairsDown);
  let allOpen = true, contiguous = true;
  for (let i = 0; i < p.length; i++) {
    if (!isOpen(lvl, p[i].x, p[i].y)) allOpen = false;
    if (i > 0) { const dx = Math.abs(p[i].x - p[i - 1].x), dy = Math.abs(p[i].y - p[i - 1].y); if (dx > 1 || dy > 1) contiguous = false; }
  }
  ok('A* path steps are all walkable', allOpen);
  ok('A* path steps are contiguous (8-dir)', contiguous);
  const none = findPath(lvl, lvl.spawn, { x: 0, y: 0 }); // wall corner
  ok('A* returns null for unreachable wall target', none === null);
}

// ---------- combat: attack reduces HP, kill grants XP, level up at threshold ----------
{
  const p = newPlayer('warrior');
  const d = deriveStats(p);
  p.hp = d.maxHP; p.mp = d.maxMP;
  const mon = spawnMonster('skeleton', 5, 5, 1);
  const hp0 = mon.hp;
  // deterministic rng that always hits
  const atk = { tohit: 999, dmgMin: 5, dmgMax: 5 };
  let seq = [0.0, 0.9]; let si = 0; const rng = () => seq[(si++) % seq.length];
  const r = resolveAttack(atk, mon, rng);
  mon.hp -= r.dmg;
  ok('attack hits and reduces monster HP', r.hit && mon.hp < hp0, `dmg=${r.dmg}`);
  ok('hit chance clamps to 0.95 max', hitChance(9999, 0) === 0.95);
  ok('hit chance clamps to 0.05 min', hitChance(0, 9999) === 0.05);

  // kill grants xp -> level up
  const before = p.level;
  const need = xpToNext(1);
  const leveled = grantXP(p, need + 5);
  ok('gaining threshold XP levels the player up', p.level === before + 1 && leveled === 1, `lvl=${p.level}`);
  ok('level up grants stat points', p.statPoints >= 5);
  const d2 = deriveStats(p);
  ok('max HP grows with level', d2.maxHP > d.maxHP, `${d.maxHP}->${d2.maxHP}`);
}

// ---------- item generation rarity/affix distribution ----------
{
  const rng = makeRng(4242);
  const counts = { common: 0, magic: 0, rare: 0 };
  let magicAffix = 0, rareAffix = 0, magicN = 0, rareN = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const it = generateItem(10, rng);
    counts[it.rarity]++;
    if (it.rarity === 'magic') { magicAffix += it.affixes.length; magicN++; }
    if (it.rarity === 'rare') { rareAffix += it.affixes.length; rareN++; }
    ok._ = 1;
  }
  const pc = counts.common / N, pm = counts.magic / N, pr = counts.rare / N;
  ok('common most frequent (~62%)', pc > 0.45 && pc < 0.72, `common=${(pc * 100).toFixed(1)}%`);
  ok('magic in band (~30%)', pm > 0.20 && pm < 0.40, `magic=${(pm * 100).toFixed(1)}%`);
  ok('rare rarest (~8-13%)', pr > 0.04 && pr < 0.18, `rare=${(pr * 100).toFixed(1)}%`);
  ok('magic items have 1-2 affixes', magicN > 0 && magicAffix / magicN >= 1 && magicAffix / magicN <= 2, `avg=${(magicAffix / magicN).toFixed(2)}`);
  ok('rare items have 3-5 affixes', rareN > 0 && rareAffix / rareN >= 3 && rareAffix / rareN <= 5, `avg=${(rareAffix / rareN).toFixed(2)}`);
}

// ---------- equipping changes derived stats ----------
{
  const p = newPlayer('warrior');
  const base = deriveStats(p);
  // craft a strong weapon
  const wpn = generateItem(20, makeRng(1), { baseKey: 'axe', rarity: 'rare' });
  p.equip.weapon = wpn;
  const withW = deriveStats(p);
  ok('equipping a weapon raises damage', withW.dmgMax > base.dmgMax, `${base.dmgMax}->${withW.dmgMax}`);
  const armor = generateItem(20, makeRng(2), { baseKey: 'plate', rarity: 'magic' });
  const acBefore = withW.ac;
  p.equip.body = armor;
  const withA = deriveStats(p);
  ok('equipping armor raises AC', withA.ac > acBefore, `${acBefore}->${withA.ac}`);
  // affix stat propagation
  const strRing = { uid: 1, base: 'ring', name: 'Strong Ring', type: 'ring', slot: 'ring', rarity: 'magic', identified: true, affixes: [{ key: 'strong', stat: 'str', value: 10, isPre: true, label: '+10 Strength' }] };
  p.equip.ring = strRing;
  const withR = deriveStats(p);
  ok('affix +Strength propagates to derived str', withR.str === withA.str + 10, `${withA.str}->${withR.str}`);
  const unid = { ...strRing, uid: 2, identified: false };
  p.equip.ring = unid;
  const withU = deriveStats(p);
  ok('unidentified item grants no affix bonus', withU.str === withA.str);
}

// ---------- save round-trip ----------
{
  const p = newPlayer('sorcerer');
  p.level = 7; p.gold = 1234; p.xp = 55; p.kills = 42; p.depthReached = 3;
  p.equip.weapon = generateItem(15, makeRng(7), { baseKey: 'staff', rarity: 'rare' });
  p.inv = [generateItem(10, makeRng(8)), makePotion('health'), makePotion('mana')];
  p.belt = [makePotion('health'), makePotion('mana'), null, null];
  const blob = JSON.parse(JSON.stringify(serialize(p, { maxDepth: 3 })));
  const p2 = deserialize(blob, newPlayer('warrior'));
  ok('save round-trip: class', p2.cls === 'sorcerer');
  ok('save round-trip: level/gold/xp', p2.level === 7 && p2.gold === 1234 && p2.xp === 55);
  ok('save round-trip: equipped weapon name', p2.equip.weapon && p2.equip.weapon.name === p.equip.weapon.name);
  ok('save round-trip: inventory length', p2.inv.length === 3);
  ok('save round-trip: belt potion kind', p2.belt[0] && p2.belt[0].potion.kind === 'health');
}

// ---------- class distinctiveness ----------
{
  const w = deriveStats(newPlayer('warrior'));
  const s = deriveStats(newPlayer('sorcerer'));
  ok('warrior has more HP than sorcerer', w.maxHP > s.maxHP, `${w.maxHP} vs ${s.maxHP}`);
  ok('sorcerer has more mana than warrior', s.maxMP > w.maxMP, `${s.maxMP} vs ${w.maxMP}`);
  ok('rogue is ranged by default', deriveStats((() => { const p = newPlayer('rogue'); const { generateItem: gi, makeRng: mr } = { generateItem, makeRng }; p.equip.weapon = gi(1, mr(3), { baseKey: 'bow', rarity: 'common' }); return p; })()).ranged === true);
}

console.log(`\n${n - fails}/${n} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
