// main.js — game loop, states, iso rendering, HUD, screens, and test hook.
import * as A from './audio.js';
import { createInput } from './input.js';
import { generateItem, makePotion, makeRng, displayName, tooltipLines, aggregateStats, sellValue, RARITY_COLOR, BASES } from './items.js';
import { genDungeon, makeVis, updateLight, findPath, isWalkable, tileAt, T } from './dungeon.js';
import { CLASSES, newPlayer, deriveStats, resolveAttack, grantXP, xpToNext, spawnMonster, monsterPoolFor, makeProjectile } from './entities.js';
import * as Spr from './sprites.js';
import { TILE_W, TILE_H, WALL_H } from './sprites.js';
import * as Save from './save.js';

const W = 512, H = 384;
const canvas = document.getElementById('game');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const BOSS_DEPTH = 5;
const TOWN_THEME = { key: 'town', floor: '#39352b', wall: '#4a4038', wallTop: '#5a4e40', accent: '#6a5a44', name: 'Moorestram' };
const FLOOR_ANCHOR_Y = TILE_H / 2 + 1;
const WALL_ANCHOR_Y = WALL_H + TILE_H / 2 + 1;

const SKILL_INFO = {
  attack: { name: 'Attack', desc: 'Melee strike' },
  cleave: { name: 'Cleave', desc: 'Hit all foes around you', cd: 0.7 },
  shoot: { name: 'Arrow', desc: 'Fire an arrow' },
  multishot: { name: 'Multishot', desc: 'Fan of arrows', mana: 6, cd: 0.9 },
  firebolt: { name: 'Firebolt', desc: 'Hurl a bolt of fire', mana: 4 },
  heal: { name: 'Heal', desc: 'Restore health', mana: 12, cd: 0.6 },
};

const game = {
  screen: 'title', overlay: null, scene: 'town', depth: 0,
  player: null, level: null, monsters: [], items: [], projectiles: [], particles: [], floaters: [], npcs: [],
  dest: null, path: null, pathI: 0, repath: 0, target: null,
  stats: null, seed: (Math.random() * 1e9) | 0,
  attackCd: 0, secCd: 0, toasts: [], showMap: false,
  vendorStock: [], selectedInv: -1, hoverItem: null, hoverRect: null,
  time: 0, camX: 0, camY: 0, shake: 0, deathTimer: 0, victoryTimer: 0, bossIntro: 0,
  input: null, hasSave: false, classPick: 0,
};

// ---- coordinate transforms -------------------------------------------------
function worldToScreen(fx, fy) { return { x: (fx - fy) * (TILE_W / 2), y: (fx + fy) * (TILE_H / 2) }; }
function screenToWorld(px, py) {
  const sx = px + game.camX, sy = py + game.camY;
  const a = sx / (TILE_W / 2), b = sy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
function updateCamera() {
  const p = game.player; if (!p) return;
  const s = worldToScreen(p.x, p.y);
  game.camX = s.x - W / 2;
  game.camY = s.y - H * 0.52;
}

// ---- level building --------------------------------------------------------
function buildTown() {
  const Wd = 26, Hd = 22;
  const grid = new Uint8Array(Wd * Hd).fill(T.WALL);
  // open plaza
  for (let y = 2; y < Hd - 2; y++) for (let x = 2; x < Wd - 2; x++) grid[y * Wd + x] = T.FLOOR;
  // a couple of decorative building blocks (walls)
  const blocks = [[3, 3, 4, 3], [19, 3, 4, 4], [3, 15, 5, 4], [18, 16, 5, 3]];
  for (const [bx, by, bw, bh] of blocks) for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) grid[y * Wd + x] = T.WALL;
  const spawn = { x: 13, y: 14 };
  const stairsDown = { x: 13, y: 4 };
  grid[stairsDown.y * Wd + stairsDown.x] = T.STAIRS_DOWN;
  const level = { depth: 0, W: Wd, H: Hd, grid, rooms: [{ x: 2, y: 2, w: Wd - 4, h: Hd - 4, cx: 13, cy: 11 }], spawn, stairsDown, stairsUp: spawn, decor: [], theme: TOWN_THEME, boss: false };
  makeVis(level); level.vis.fill(2); // town fully lit
  return level;
}

function populateTown(level) {
  game.npcs = [
    { kind: 'vendor', name: 'Griswold the Smith', x: 9, y: 10 },
    { kind: 'healer', name: 'Pipin the Healer', x: 17, y: 10 },
    { kind: 'cain', name: 'Cain the Elder', x: 13, y: 17 },
  ];
  // town braziers
  level.decor = [
    { x: 11, y: 4, type: 'brazier' }, { x: 15, y: 4, type: 'brazier' },
    { x: 6, y: 13, type: 'bones' }, { x: 20, y: 14, type: 'barrel', breakable: false },
  ];
  // regenerate vendor stock on each town visit
  const rng = makeRng((game.seed + game.player.level * 131 + game.time) >>> 0);
  game.vendorStock = [];
  for (let i = 0; i < 7; i++) game.vendorStock.push(generateItem(2 + game.player.level, rng));
  game.vendorStock.push(makePotion('health')); game.vendorStock.push(makePotion('mana'));
}

function buildDungeon(depth) {
  const boss = depth >= BOSS_DEPTH;
  const level = genDungeon(depth, game.seed + depth * 777, { boss });
  makeVis(level);
  return level;
}

function populateDungeon(level, depth) {
  const rng = makeRng((game.seed ^ (depth * 99991)) >>> 0);
  game.monsters = []; game.items = [];
  const pool = monsterPoolFor(depth);
  if (level.boss) {
    const b = spawnMonster('boss', level.stairsDown.x, level.stairsDown.y, depth);
    b.x = level.stairsDown.x; b.y = level.stairsDown.y;
    // put boss in the largest/far room center, not on stairs-down (there is no deeper)
    const far = level.rooms.reduce((a, r) => (r.w * r.h > a.w * a.h ? r : a), level.rooms[0]);
    b.x = far.cx; b.y = far.cy;
    game.monsters.push(b);
    // a few hell minions
    for (const r of level.rooms) { if (r === level.rooms[0]) continue; if (rng.chance(0.6)) game.monsters.push(spawnMonster(rng.pick(['darkone', 'hound']), r.cx + rng.int(-1, 1), r.cy + rng.int(-1, 1), depth)); }
  } else {
    for (let i = 1; i < level.rooms.length; i++) {
      const r = level.rooms[i];
      const n = rng.int(1, 3) + Math.floor(depth / 2);
      for (let k = 0; k < n; k++) {
        const mx = rng.int(r.x + 1, r.x + r.w - 2), my = rng.int(r.y + 1, r.y + r.h - 2);
        if (!isWalkable(level, mx, my)) continue;
        game.monsters.push(spawnMonster(rng.pick(pool), mx, my, depth));
      }
    }
    // mini-boss Moorcher on depth 3
    if (depth === 3) {
      const r = level.rooms[level.rooms.length - 1];
      game.monsters.push(spawnMonster('moorcher', r.cx, r.cy, depth));
    }
  }
  // scattered ground loot in rooms
  const nLoot = 2 + Math.floor(depth / 2);
  for (let i = 0; i < nLoot; i++) {
    const r = rng.pick(level.rooms.slice(1).length ? level.rooms.slice(1) : level.rooms);
    const lx = rng.int(r.x + 1, r.x + r.w - 2), ly = rng.int(r.y + 1, r.y + r.h - 2);
    if (!isWalkable(level, lx, ly)) continue;
    if (rng.chance(0.4)) dropGold(lx, ly, rng.int(depth * 5, depth * 20));
    else dropItem(generateItem(depth * 2, rng), lx, ly);
  }
}

function enterScene(scene, depth) {
  game.scene = scene; game.depth = depth;
  game.projectiles = []; game.particles = []; game.floaters = []; game.dest = null; game.path = null; game.target = null;
  game.overlay = null;
  if (scene === 'town') {
    game.level = buildTown(); populateTown(game.level);
    game.monsters = []; game.items = [];
    game.player.x = game.level.spawn.x; game.player.y = game.level.spawn.y + 1;
    A.setDrone('town');
  } else {
    game.npcs = [];
    game.level = buildDungeon(depth); populateDungeon(game.level, depth);
    game.player.x = game.level.spawn.x; game.player.y = game.level.spawn.y;
    A.setDrone(depth >= 4 ? 'hell' : 'dungeon');
    if (game.level.boss) { game.bossIntro = 2.5; A.sfx.bossRoar(); }
    game.player.depthReached = Math.max(game.player.depthReached || 0, depth);
  }
  game.stats = deriveStats(game.player);
  refreshLight();
  updateCamera();
  saveGame();
}

function refreshLight() {
  if (game.scene === 'town') { game.level.vis.fill(2); return; }
  updateLight(game.level, Math.round(game.player.x), Math.round(game.player.y), 7);
}

// ---- loot ------------------------------------------------------------------
function dropItem(item, x, y) { game.items.push({ item, x, y, bob: Math.random() * 6, gold: 0 }); }
function dropGold(x, y, amount) { game.items.push({ item: { type: 'gold', amount, rarity: 'common' }, x, y, bob: Math.random() * 6, gold: amount }); }

function rollDrop(m) {
  const rng = makeRng((Date.now() ^ (m.id * 2654435761)) >>> 0);
  const depth = Math.max(1, game.depth);
  if (m.key === 'boss') {
    // guaranteed rare + gold
    dropItem(generateItem(depth * 3 + 6, rng, { rarity: 'rare' }), m.x, m.y);
    dropGold(m.x + 0.5, m.y, 500);
    return;
  }
  if (m.elite) { dropItem(generateItem(depth * 2 + 4, rng, { rarity: rng.chance(0.5) ? 'rare' : 'magic' }), m.x, m.y); dropGold(m.x + 0.3, m.y, 100 + depth * 20); return; }
  const r = rng.next();
  if (r < 0.16) dropItem(generateItem(depth * 2, rng), m.x, m.y);
  else if (r < 0.30) dropGold(m.x, m.y, rng.int(depth * 3, depth * 12));
  else if (r < 0.42 && rng.chance(0.5)) dropItem(makePotion(rng.chance(0.6) ? 'health' : 'mana'), m.x, m.y);
}

// ---- combat ----------------------------------------------------------------
function floater(x, y, text, color) { game.floaters.push({ x, y, text, color, ttl: 0.9, vy: -18 }); }
function spawnParticles(x, y, color, n, spd = 40, grav = 0) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 7, s = Math.random() * spd; game.particles.push({ x, y, vx: Math.cos(a) * s / 24, vy: Math.sin(a) * s / 24 - 0.5, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 1 + Math.random() * 2, grav }); }
}

function meleeHit(m) {
  A.sfx.swing();
  const r = resolveAttack({ tohit: game.stats.tohit, dmgMin: game.stats.dmgMin, dmgMax: game.stats.dmgMax }, m);
  if (!r.hit) { floater(m.x, m.y, 'miss', '#888'); return; }
  applyDamageToMonster(m, r.dmg, r.crit);
}
function applyDamageToMonster(m, dmg, crit) {
  m.hp -= dmg; m.hurt = 0.15; m.engaged = true;
  floater(m.x, m.y - 0.3, String(dmg), crit ? '#ffec6a' : '#fff');
  A.sfx.monsterHit(); spawnParticles(m.x, m.y - 0.4, '#a22', crit ? 8 : 4);
  if (m.hp <= 0) killMonster(m);
}
function killMonster(m) {
  if (!m.alive) return;
  m.alive = false; A.sfx.monsterDie();
  spawnParticles(m.x, m.y - 0.3, m.key === 'zombie' ? '#6a5' : '#a22', 12, 60, 0.6);
  const leveled = grantXP(game.player, m.xp);
  game.player.kills++;
  floater(m.x, m.y - 0.5, '+' + m.xp + ' xp', '#8cf');
  rollDrop(m);
  if (leveled) { A.sfx.levelup(); toast('Level ' + game.player.level + '!  +5 stat points', '#ffd54a'); game.stats = deriveStats(game.player); game.player.hp = game.stats.maxHP; game.player.mp = game.stats.maxMP; }
  if (m.key === 'boss') winGame();
}

game.monsterAttack = function (m) {
  const r = resolveAttack({ tohit: m.tohit, dmgMin: m.dmgMin, dmgMax: m.dmgMax }, { ac: game.stats.ac, resall: game.stats.resall });
  if (!r.hit) { floater(game.player.x, game.player.y - 1, 'miss', '#aaa'); return; }
  damagePlayer(r.dmg);
};
game.spawnProjectile = function (x, y, dx, dy, stat, owner, type) { game.projectiles.push(makeProjectile(x, y, dx, dy, stat, owner, type)); };

function damagePlayer(dmg) {
  game.player.hp -= dmg; A.sfx.playerHurt(); game.shake = 0.18;
  floater(game.player.x, game.player.y - 1, String(dmg), '#ff5a5a');
  spawnParticles(game.player.x, game.player.y - 0.5, '#c22', 5);
  if (game.player.hp <= 0) { game.player.hp = 0; die(); }
}

// ---- player actions --------------------------------------------------------
function primaryAt(worldPt, target) {
  const C = CLASSES[game.player.cls];
  if (game.attackCd > 0) return;
  if (C.primary === 'attack') { // warrior melee
    if (target && dist(game.player, target) <= 1.35) { meleeHit(target); game.attackCd = 0.55; }
  } else if (C.primary === 'shoot') { // rogue
    const t = target || worldPt; fireProjectile(t, 'arrow', game.stats); A.sfx.bow(); game.attackCd = 0.4;
  } else if (C.primary === 'firebolt') { // sorcerer
    if (game.player.mp < SKILL_INFO.firebolt.mana) { toast('Not enough mana', '#68f'); game.attackCd = 0.3; return; }
    const t = target || worldPt; game.player.mp -= SKILL_INFO.firebolt.mana; fireProjectile(t, 'firebolt', game.stats); A.sfx.firebolt(); game.attackCd = 0.35;
  }
}
function secondaryAt(worldPt) {
  const C = CLASSES[game.player.cls];
  if (game.secCd > 0) return;
  if (C.secondary === 'cleave') {
    A.sfx.swing(); game.secCd = SKILL_INFO.cleave.cd; game.shake = 0.1;
    for (const m of game.monsters) if (m.alive && dist(game.player, m) <= 1.8) { const r = resolveAttack({ tohit: game.stats.tohit + 20, dmgMin: game.stats.dmgMin, dmgMax: game.stats.dmgMax }, m); if (r.hit) applyDamageToMonster(m, Math.floor(r.dmg * 0.9), r.crit); }
    spawnParticles(game.player.x, game.player.y - 0.4, '#ddd', 10, 70);
  } else if (C.secondary === 'multishot') {
    if (game.player.mp < SKILL_INFO.multishot.mana) { toast('Not enough mana', '#68f'); return; }
    game.player.mp -= SKILL_INFO.multishot.mana; game.secCd = SKILL_INFO.multishot.cd; A.sfx.bow();
    const base = Math.atan2(worldPt.y - game.player.y, worldPt.x - game.player.x);
    for (let i = -2; i <= 2; i++) { const a = base + i * 0.18; game.spawnProjectile(game.player.x, game.player.y, Math.cos(a), Math.sin(a), game.stats, 'player', 'arrow'); }
  } else if (C.secondary === 'heal') {
    if (game.player.mp < SKILL_INFO.heal.mana) { toast('Not enough mana', '#68f'); return; }
    game.player.mp -= SKILL_INFO.heal.mana; game.secCd = SKILL_INFO.heal.cd; A.sfx.potion();
    const heal = 20 + game.stats.mag; game.player.hp = Math.min(game.stats.maxHP, game.player.hp + heal);
    floater(game.player.x, game.player.y - 1, '+' + heal, '#6f6'); spawnParticles(game.player.x, game.player.y - 0.5, '#6f6', 10);
  }
}
function fireProjectile(t, type, stat) {
  const dx = t.x - game.player.x, dy = t.y - game.player.y;
  game.spawnProjectile(game.player.x, game.player.y, dx, dy, stat, 'player', type);
}

// ---- item pickup / equip ---------------------------------------------------
function pickUp(g) {
  const idx = game.items.indexOf(g); if (idx < 0) return;
  game.items.splice(idx, 1);
  if (g.item.type === 'gold') { game.player.gold += g.item.amount; A.sfx.pickupGold(); toast('+' + g.item.amount + ' gold', '#ffd54a'); return; }
  if (g.item.type === 'potion') { if (addToBelt(g.item) || addToInv(g.item)) { A.sfx.pickupItem(); toast('Picked up ' + g.item.name, '#cdd'); } return; }
  if (addToInv(g.item)) { A.sfx.pickupItem(); toast('Picked up ' + displayName(g.item), RARITY_COLOR[g.item.rarity]); }
  else toast('Inventory full', '#a66');
}
function addToInv(it) { if (game.player.inv.length >= 40) return false; game.player.inv.push(it); return true; }
function addToBelt(pot) { const b = game.player.belt; for (let i = 0; i < b.length; i++) if (!b[i]) { b[i] = pot; return true; } return false; }

function equipItem(idx) {
  const it = game.player.inv[idx]; if (!it) return;
  if (it.type === 'potion') { drinkPotion(it); game.player.inv.splice(idx, 1); return; }
  const slot = it.slot; if (!slot || !(slot in game.player.equip)) return;
  const C = CLASSES[game.player.cls];
  // class weapon restriction (soft): warn but allow
  const prev = game.player.equip[slot];
  game.player.equip[slot] = it;
  game.player.inv.splice(idx, 1);
  if (prev) game.player.inv.push(prev);
  game.stats = deriveStats(game.player);
  if (game.player.hp > game.stats.maxHP) game.player.hp = game.stats.maxHP;
  A.sfx.pickupItem(); saveGame();
}
function unequip(slot) {
  const it = game.player.equip[slot]; if (!it) return;
  if (game.player.inv.length >= 40) { toast('Inventory full', '#a66'); return; }
  game.player.equip[slot] = null; game.player.inv.push(it);
  game.stats = deriveStats(game.player); A.sfx.ui(); saveGame();
}
function drinkPotion(pot) {
  if (pot.potion.kind === 'health') { game.player.hp = Math.min(game.stats.maxHP, game.player.hp + pot.potion.amount); }
  else { game.player.mp = Math.min(game.stats.maxMP, game.player.mp + pot.potion.amount); }
  A.sfx.potion(); floater(game.player.x, game.player.y - 1, pot.potion.kind === 'health' ? '+life' : '+mana', pot.potion.kind === 'health' ? '#f66' : '#6af');
}
function quaffBelt(i) { const b = game.player.belt; if (b[i]) { drinkPotion(b[i]); b[i] = null; } }

// ---- movement / update -----------------------------------------------------
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function issueWorldAction(px, py, isHold) {
  const wp = screenToWorld(px, py);
  // find monster under click
  let mon = null, best = 1e9;
  for (const m of game.monsters) { if (!m.alive) continue; if (game.level.vis[Math.round(m.y) * game.level.W + Math.round(m.x)] !== 2) continue; const d = dist(m, wp); if (d < 0.8 + m.size * 0.4 && d < best) { best = d; mon = m; } }
  if (mon) { game.dest = { kind: 'attack', entity: mon }; game.target = mon; return; }
  if (isHold) { game.dest = { kind: 'move', x: wp.x, y: wp.y }; game.target = null; return; }
  // items
  let gi = null; best = 1e9;
  for (const g of game.items) { const d = dist(g, wp); if (d < 0.9 && d < best) { best = d; gi = g; } }
  if (gi) { game.dest = { kind: 'pickup', entity: gi }; game.target = null; return; }
  // npcs (town)
  if (game.scene === 'town') { for (const n of game.npcs) { if (dist(n, wp) < 1.0) { game.dest = { kind: 'npc', entity: n }; game.target = null; return; } } }
  // decor breakable
  for (const d of game.level.decor) { if (d.breakable && !d.opened && dist(d, wp) < 0.9) { game.dest = { kind: 'break', entity: d }; game.target = null; return; } }
  // stairs
  const tx = Math.round(wp.x), ty = Math.round(wp.y), tt = tileAt(game.level, tx, ty);
  if (tt === T.STAIRS_DOWN) { game.dest = { kind: 'stairs', x: tx, y: ty, dir: 'down' }; game.target = null; return; }
  if (tt === T.STAIRS_UP && game.scene === 'dungeon') { game.dest = { kind: 'stairs', x: tx, y: ty, dir: 'up' }; game.target = null; return; }
  game.dest = { kind: 'move', x: wp.x, y: wp.y }; game.target = null;
}

function destTile() {
  const d = game.dest; if (!d) return null;
  if (d.entity) return { x: Math.round(d.entity.x), y: Math.round(d.entity.y) };
  return { x: Math.round(d.x), y: Math.round(d.y) };
}

function updatePlayer(dt) {
  const p = game.player;
  if (game.attackCd > 0) game.attackCd -= dt;
  if (game.secCd > 0) game.secCd -= dt;
  // slow mana/hp regen
  p.mp = Math.min(game.stats.maxMP, p.mp + dt * (0.6 + game.stats.mag * 0.05));
  const d = game.dest; if (!d) return;

  const C = CLASSES[p.cls];
  if (d.kind === 'attack') {
    const m = d.entity;
    if (!m || !m.alive) { game.dest = null; game.target = null; return; }
    const dd = dist(p, m);
    if (C.primary === 'attack') { // melee: approach then hit
      if (dd <= 1.35) { faceTo(m); primaryAt(m, m); return; }
    } else { // ranged/caster: fire if within range & LOS
      const range = 8;
      if (dd <= range) { faceTo(m); primaryAt(m, m); if (dd <= range - 1.5) return; }
    }
    approach(dt, { x: Math.round(m.x), y: Math.round(m.y) }, 1.1);
  } else if (d.kind === 'move') {
    const t = { x: Math.round(d.x), y: Math.round(d.y) };
    if (dist(p, d) < 0.35) { game.dest = null; return; }
    approach(dt, t, 0.25);
  } else if (d.kind === 'pickup') {
    if (!game.items.includes(d.entity)) { game.dest = null; return; }
    if (dist(p, d.entity) < 0.8) { pickUp(d.entity); game.dest = null; return; }
    approach(dt, destTile(), 0.6);
  } else if (d.kind === 'npc') {
    if (dist(p, d.entity) < 1.3) { openNpc(d.entity); game.dest = null; return; }
    approach(dt, destTile(), 1.1);
  } else if (d.kind === 'break') {
    if (dist(p, d.entity) < 1.3) { breakDecor(d.entity); game.dest = null; return; }
    approach(dt, destTile(), 1.1);
  } else if (d.kind === 'stairs') {
    if (dist(p, d) < 0.7) { game.dest = null; useStairs(d.dir); return; }
    approach(dt, { x: d.x, y: d.y }, 0.5);
  }
}

function faceTo(t) { game.player.facing = Math.atan2(t.y - game.player.y, t.x - game.player.x); }

function approach(dt, tile, stopDist) {
  const p = game.player;
  game.repath -= dt;
  const cur = { x: Math.round(p.x), y: Math.round(p.y) };
  if (!game.path || game.repath <= 0 || !game._destTileEq(tile)) {
    game.path = findPath(game.level, cur, tile, { adjacentOk: true });
    game.pathI = 1; game.repath = 0.25; game._lastTile = tile;
  }
  let step = null;
  if (game.path && game.pathI < game.path.length) step = game.path[game.pathI];
  if (!step) step = tile;
  const dx = step.x - p.x, dy = step.y - p.y, dm = Math.hypot(dx, dy) || 1;
  const speed = 3.7;
  const nx = p.x + (dx / dm) * speed * dt, ny = p.y + (dy / dm) * speed * dt;
  const rnx = Math.round(nx), rny = Math.round(ny);
  if (isWalkable(game.level, rnx, rny) || (rnx === Math.round(p.x) && rny === Math.round(p.y))) { p.x = nx; p.y = ny; }
  else if (isWalkable(game.level, rnx, Math.round(p.y))) p.x = nx;
  else if (isWalkable(game.level, Math.round(p.x), rny)) p.y = ny;
  game.player.facing = Math.atan2(dy, dx);
  if (Math.hypot(step.x - p.x, step.y - p.y) < 0.2) game.pathI++;
}
game._destTileEq = function (t) { return game._lastTile && game._lastTile.x === t.x && game._lastTile.y === t.y; };

function breakDecor(d) {
  d.opened = true; A.sfx.door();
  spawnParticles(d.x, d.y - 0.3, '#7a5a30', 10, 60, 0.7);
  const rng = makeRng((Date.now() ^ (d.x * 31 + d.y * 17)) >>> 0);
  if (rng.chance(0.6)) { if (rng.chance(0.5)) dropGold(d.x, d.y, rng.int(5, 25)); else if (rng.chance(0.5)) dropItem(makePotion(rng.chance(0.6) ? 'health' : 'mana'), d.x, d.y); else dropItem(generateItem(Math.max(1, game.depth) * 2, rng), d.x, d.y); }
}

function useStairs(dir) {
  A.sfx.stairs();
  if (dir === 'down') {
    if (game.scene === 'town') enterScene('dungeon', 1);
    else enterScene('dungeon', game.depth + 1);
  } else { // up
    if (game.depth <= 1) enterScene('town', 0);
    else enterScene('dungeon', game.depth - 1);
  }
}

function openNpc(n) {
  if (n.kind === 'vendor') { game.overlay = 'vendor'; A.sfx.ui(); }
  else if (n.kind === 'healer') { game.player.hp = game.stats.maxHP; game.player.mp = game.stats.maxMP; A.sfx.potion(); toast('Pipin heals your wounds', '#6f6'); }
  else if (n.kind === 'cain') { let c = 0; for (const it of game.player.inv) if (!it.identified && it.rarity !== 'common') { it.identified = true; c++; } for (const s in game.player.equip) { const e = game.player.equip[s]; if (e && !e.identified) { e.identified = true; c++; } } A.sfx.cast(); toast(c ? 'Cain identifies ' + c + ' item(s)' : 'Nothing to identify', '#cdd'); saveGame(); }
}

// ---- update monsters/projectiles/particles ---------------------------------
function updateWorld(dt) {
  for (const m of game.monsters) if (m.alive) updateMonsterAI(m, dt);
  game.monsters = game.monsters.filter((m) => m.alive || (m.deadT = (m.deadT || 0) + dt) < 0.5);
  updateProjectiles(dt);
  for (const f of game.floaters) { f.ttl -= dt; f.y += f.vy * dt / TILE_H; f.vy += 30 * dt; }
  game.floaters = game.floaters.filter((f) => f.ttl > 0);
  for (const pt of game.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += (pt.grav || 0) * dt; }
  game.particles = game.particles.filter((pt) => pt.life > 0);
  for (const g of game.items) g.bob += dt * 4;
  if (game.shake > 0) game.shake -= dt;
}
import { updateMonster } from './entities.js';
function updateMonsterAI(m, dt) { updateMonster(m, dt, game); }

function updateProjectiles(dt) {
  for (const pr of game.projectiles) {
    if (pr.dead) continue;
    pr.trail.push({ x: pr.x, y: pr.y }); if (pr.trail.length > 5) pr.trail.shift();
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.ttl -= dt;
    const tx = Math.round(pr.x), ty = Math.round(pr.y);
    if (pr.ttl <= 0 || tileAt(game.level, tx, ty) === T.WALL) { pr.dead = true; spawnParticles(pr.x, pr.y, pr.type === 'firebolt' || pr.type === 'hellfire' ? '#f80' : '#ccc', 5); continue; }
    if (pr.owner === 'player') {
      for (const m of game.monsters) { if (!m.alive) continue; if (dist(pr, m) < 0.5 + m.size * 0.3) { const r = resolveAttack({ tohit: pr.tohit, dmgMin: pr.dmgMin, dmgMax: pr.dmgMax }, m); if (r.hit) applyDamageToMonster(m, r.dmg, r.crit); else floater(m.x, m.y, 'miss', '#888'); pr.dead = true; break; } }
    } else {
      if (dist(pr, game.player) < 0.55) { const r = resolveAttack({ tohit: pr.tohit, dmgMin: pr.dmgMin, dmgMax: pr.dmgMax }, { ac: game.stats.ac, resall: game.stats.resall }); if (r.hit) damagePlayer(r.dmg); pr.dead = true; }
    }
  }
  game.projectiles = game.projectiles.filter((pr) => !pr.dead);
}

// ---- death / victory -------------------------------------------------------
function die() {
  A.sfx.death(); game.screen = 'gameover'; game.deathTimer = 0;
  game.player.alive = false; A.stopDrone();
}
function respawn() {
  game.player.alive = true;
  enterScene('town', 0);
  game.stats = deriveStats(game.player);
  game.player.hp = game.stats.maxHP; game.player.mp = game.stats.maxMP;
  game.screen = 'playing';
}
function winGame() {
  A.sfx.victory(); A.stopDrone(); game.screen = 'victory'; game.victoryTimer = 0;
  saveGame({ victory: true });
}

// ---- save ------------------------------------------------------------------
function saveGame(meta = {}) {
  if (!game.player) return;
  Save.save(Save.serialize(game.player, { maxDepth: game.player.depthReached, victory: meta.victory }));
}
function toast(text, color) { game.toasts.push({ text, color: color || '#ddd', ttl: 2.6 }); if (game.toasts.length > 4) game.toasts.shift(); }

// ---- stat allocation -------------------------------------------------------
function allocate(stat) {
  if (game.player.statPoints <= 0) return;
  game.player.statPoints--; game.player[stat]++;
  game.stats = deriveStats(game.player);
  game.player.hp = Math.min(game.stats.maxHP, game.player.hp + (stat === 'vit' ? 2 : 0));
  A.sfx.ui(); saveGame();
}

// =====================  RENDERING  ==========================================
function clear() { ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H); }

function renderWorld() {
  const lvl = game.level, p = game.player;
  let sk = 0, sky = 0;
  if (game.shake > 0) { sk = (Math.random() - 0.5) * game.shake * 30; sky = (Math.random() - 0.5) * game.shake * 20; }
  ctx.save(); ctx.translate(sk, sky);

  // determine visible tile bounds
  const drawTiles = [];
  const tall = [];
  const pad = 2;
  const minX = Math.max(0, Math.round(p.x) - 20), maxX = Math.min(lvl.W - 1, Math.round(p.x) + 20);
  const minY = Math.max(0, Math.round(p.y) - 20), maxY = Math.min(lvl.H - 1, Math.round(p.y) + 20);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const vis = lvl.vis[y * lvl.W + x]; if (!vis) continue;
    const t = lvl.grid[y * lvl.W + x];
    const s = worldToScreen(x, y); const dx = s.x - game.camX, dy = s.y - game.camY;
    if (dx < -TILE_W || dx > W + TILE_W || dy < -TILE_H - WALL_H || dy > H + TILE_H) continue;
    const alpha = vis === 2 ? 1 : 0.4;
    if (t === T.WALL) { tall.push({ depth: x + y, sy: dy, alpha, kind: 'wall', dx, dy }); }
    else {
      drawTiles.push({ dx, dy, t, alpha, x, y });
      if (t === T.DOOR) tall.push({ depth: x + y, sy: dy, alpha, kind: 'door', dx, dy });
      if (t === T.STAIRS_DOWN) tall.push({ depth: x + y, sy: dy, alpha, kind: 'stairsd', dx, dy });
      if (t === T.STAIRS_UP) tall.push({ depth: x + y, sy: dy, alpha, kind: 'stairsu', dx, dy });
    }
  }
  // floor pass
  for (const f of drawTiles) {
    if (f.t === T.WALL) continue;
    ctx.globalAlpha = f.alpha;
    const spr = Spr.floorTile(lvl.theme, (f.x * 3 + f.y) % 2);
    ctx.drawImage(spr, f.dx - spr.width / 2, f.dy - FLOOR_ANCHOR_Y);
  }
  ctx.globalAlpha = 1;

  // decor (only lit tiles)
  for (const d of lvl.decor) {
    const vis = lvl.vis[d.y * lvl.W + d.x]; if (!vis) continue;
    if (d.opened && (d.type === 'barrel' || d.type === 'sarcophagus')) continue;
    const s = worldToScreen(d.x, d.y);
    tall.push({ depth: d.x + d.y + 0.1, sy: s.y - game.camY, kind: 'decor', decor: d, dx: s.x - game.camX, dy: s.y - game.camY, alpha: vis === 2 ? 1 : 0.4 });
  }
  // ground items (lit)
  for (const g of game.items) {
    const gx = Math.round(g.x), gy = Math.round(g.y); if (lvl.vis[gy * lvl.W + gx] !== 2) continue;
    const s = worldToScreen(g.x, g.y); tall.push({ depth: g.x + g.y + 0.2, sy: s.y - game.camY, kind: 'item', ground: g, dx: s.x - game.camX, dy: s.y - game.camY, alpha: 1 });
  }
  // npcs
  for (const n of game.npcs) { const s = worldToScreen(n.x, n.y); tall.push({ depth: n.x + n.y + 0.3, sy: s.y - game.camY, kind: 'npc', npc: n, dx: s.x - game.camX, dy: s.y - game.camY, alpha: 1 }); }
  // monsters (lit)
  for (const m of game.monsters) { const gx = Math.round(m.x), gy = Math.round(m.y); if (lvl.vis[gy * lvl.W + gx] !== 2 && m.key !== 'boss') continue; const s = worldToScreen(m.x, m.y); tall.push({ depth: m.x + m.y + 0.3, sy: s.y - game.camY, kind: 'mon', mon: m, dx: s.x - game.camX, dy: s.y - game.camY, alpha: m.alive ? 1 : 0.5 }); }
  // player
  { const s = worldToScreen(p.x, p.y); tall.push({ depth: p.x + p.y + 0.3, sy: s.y - game.camY, kind: 'player', dx: s.x - game.camX, dy: s.y - game.camY, alpha: 1 }); }
  // projectiles
  for (const pr of game.projectiles) { const s = worldToScreen(pr.x, pr.y); tall.push({ depth: pr.x + pr.y + 0.35, sy: s.y - game.camY, kind: 'proj', proj: pr, dx: s.x - game.camX, dy: s.y - game.camY, alpha: 1 }); }

  tall.sort((a, b) => a.depth - b.depth || a.sy - b.sy);
  for (const o of tall) drawTall(o);

  // particles
  for (const pt of game.particles) { const s = worldToScreen(pt.x, pt.y); ctx.globalAlpha = Math.max(0, pt.life / pt.max); ctx.fillStyle = pt.color; ctx.fillRect((s.x - game.camX) | 0, (s.y - game.camY - 8) | 0, pt.size, pt.size); }
  ctx.globalAlpha = 1;

  // floaters
  ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  for (const f of game.floaters) { const s = worldToScreen(f.x, f.y); ctx.globalAlpha = Math.min(1, f.ttl * 1.6); ctx.fillStyle = '#000'; ctx.fillText(f.text, s.x - game.camX + 1, s.y - game.camY - 6); ctx.fillStyle = f.color; ctx.fillText(f.text, s.x - game.camX, s.y - game.camY - 7); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';

  ctx.restore();

  // torch light overlay
  drawLightOverlay();
}

function drawTall(o) {
  ctx.globalAlpha = o.alpha;
  if (o.kind === 'wall') { const spr = Spr.wallTile(game.level.theme); ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - WALL_ANCHOR_Y); }
  else if (o.kind === 'door') { const spr = Spr.doorTile(game.level.theme); ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - (spr.height - FLOOR_ANCHOR_Y - TILE_H / 2)); }
  else if (o.kind === 'stairsd') { const spr = Spr.stairsTile('down', game.level.theme); ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - (spr.height - FLOOR_ANCHOR_Y - TILE_H / 2)); }
  else if (o.kind === 'stairsu') { const spr = Spr.stairsTile('up', game.level.theme); ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - (spr.height - FLOOR_ANCHOR_Y - TILE_H / 2)); }
  else if (o.kind === 'decor') { const spr = Spr.decorSprite(o.decor.type, game.level.theme); shadow(o.dx, o.dy, 7); ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - 26); }
  else if (o.kind === 'item') { drawGroundItem(o); }
  else if (o.kind === 'npc') { const spr = Spr.npcSprite(o.npc.kind); shadow(o.dx, o.dy, 8); ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - (spr.height - 2)); drawNameTag(o.npc.name, o.dx, o.dy - spr.height); }
  else if (o.kind === 'mon') { drawMonster(o); }
  else if (o.kind === 'player') { drawPlayer(o); }
  else if (o.kind === 'proj') { drawProjectile(o); }
  ctx.globalAlpha = 1;
}
function shadow(dx, dy, r) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(dx, dy - 1, r, r * 0.45, 0, 0, 7); ctx.fill(); }

function drawGroundItem(o) {
  const g = o.ground; const bob = Math.sin(g.bob) * 1.5;
  // rarity glow
  const col = g.item.type === 'gold' ? '#ffcf3a' : RARITY_COLOR[g.item.rarity] || '#ccc';
  const grad = ctx.createRadialGradient(o.dx, o.dy - 3, 1, o.dx, o.dy - 3, 12);
  grad.addColorStop(0, col + 'aa'); grad.addColorStop(1, col + '00');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(o.dx, o.dy - 3, 12, 0, 7); ctx.fill();
  shadow(o.dx, o.dy, 6);
  const spr = Spr.itemGroundSprite(g.item.type === 'gold' ? { type: 'gold' } : g.item);
  ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - 14 + bob);
}
function drawMonster(o) {
  const m = o.mon; shadow(o.dx, o.dy, 6 + m.size * 3);
  const spr = Spr.monsterSprite(m.key, m.color);
  const bob = m.alive ? Math.sin(m.anim) * 1.2 : 0;
  ctx.save();
  if (m.hurt > 0) { ctx.globalAlpha = o.alpha; }
  const flip = Math.cos(m.facing) < 0;
  if (flip) { ctx.translate(o.dx, 0); ctx.scale(-1, 1); ctx.translate(-o.dx, 0); }
  ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - (spr.height - 2) + bob);
  ctx.restore();
  if (m.hurt > 0) { ctx.globalAlpha = m.hurt * 2.5; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#f66'; ctx.fillRect(o.dx - spr.width / 2, o.dy - spr.height, spr.width, spr.height); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  // hp bar
  if (m.alive && m.hp < m.maxhp) { const bw = Math.max(14, spr.width); const f = Math.max(0, m.hp / m.maxhp); ctx.fillStyle = '#000'; ctx.fillRect(o.dx - bw / 2, o.dy - spr.height - 5, bw, 3); ctx.fillStyle = m.elite ? '#f2c94c' : '#c33'; ctx.fillRect(o.dx - bw / 2, o.dy - spr.height - 5, bw * f, 3); }
  if (m.elite) drawNameTag(m.name, o.dx, o.dy - spr.height - 6, '#f2c94c');
}
function drawPlayer(o) {
  const p = game.player; shadow(o.dx, o.dy, 7);
  const spr = Spr.playerSprite(p.cls);
  const moving = game.dest && (game.dest.kind === 'move' || game.dest.kind === 'attack' || game.dest.kind === 'pickup');
  const bob = moving ? Math.sin(game.time * 12) * 1.3 : 0;
  ctx.save();
  const flip = Math.cos(p.facing) < 0;
  if (flip) { ctx.translate(o.dx, 0); ctx.scale(-1, 1); ctx.translate(-o.dx, 0); }
  ctx.drawImage(spr, o.dx - spr.width / 2, o.dy - (spr.height - 2) + bob);
  ctx.restore();
}
function drawProjectile(o) {
  const pr = o.proj; ctx.save();
  const color = pr.type === 'arrow' ? '#e8d18a' : pr.type === 'firebolt' ? '#ff8020' : pr.type === 'hellfire' ? '#ff3010' : '#c060ff';
  // trail
  for (let i = 0; i < pr.trail.length; i++) { const tp = pr.trail[i]; const s = worldToScreen(tp.x, tp.y); ctx.globalAlpha = i / pr.trail.length * 0.5; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s.x - game.camX, s.y - game.camY - 8, 2, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (pr.type === 'arrow') { const a = Math.atan2(pr.vy, pr.vx); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.dx - Math.cos(a) * 5, o.dy - 8 - Math.sin(a) * 3); ctx.lineTo(o.dx + Math.cos(a) * 5, o.dy - 8 + Math.sin(a) * 3); ctx.stroke(); }
  else { const grad = ctx.createRadialGradient(o.dx, o.dy - 8, 1, o.dx, o.dy - 8, 6); grad.addColorStop(0, '#fff'); grad.addColorStop(0.4, color); grad.addColorStop(1, color + '00'); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(o.dx, o.dy - 8, 6, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawNameTag(name, dx, dy, color) {
  ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; const w = ctx.measureText(name).width + 4;
  ctx.fillRect(dx - w / 2, dy - 8, w, 9);
  ctx.fillStyle = color || '#dcd'; ctx.fillText(name, dx, dy - 1); ctx.textAlign = 'left';
}

function drawLightOverlay() {
  const p = game.player; const s = worldToScreen(p.x, p.y);
  const cx = s.x - game.camX, cy = s.y - game.camY - 8;
  const inner = game.scene === 'town' ? 150 : 78;
  const outer = game.scene === 'town' ? 380 : 190;
  const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  const dark = game.scene === 'town' ? 0.55 : 0.92;
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, `rgba(3,3,8,${dark * 0.5})`); g.addColorStop(1, `rgba(2,2,6,${dark})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // warm torch tint near player
  const t = ctx.createRadialGradient(cx, cy, 4, cx, cy, inner);
  t.addColorStop(0, 'rgba(255,160,60,0.10)'); t.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = t; ctx.fillRect(0, 0, W, H);
}

// =====================  HUD  ================================================
const HUD = {};
function drawHUD() {
  const p = game.player, st = game.stats;
  // top bar
  ctx.fillStyle = 'rgba(8,8,14,0.6)'; ctx.fillRect(0, 0, W, 16);
  ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#c9b98a';
  ctx.fillText(game.scene === 'town' ? 'Moorestram' : (game.level.theme.name + '  -  Depth ' + game.depth), 6, 11);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffd54a'; ctx.fillText(p.gold + ' g', W - 6, 11);
  ctx.textAlign = 'left';

  // orbs
  drawOrb(30, H - 30, 28, p.hp / st.maxHP, '#ff5a4a', '#7a1010', Math.ceil(p.hp) + '/' + st.maxHP);
  drawOrb(W - 30, H - 30, 28, p.mp / st.maxMP, '#4a7aff', '#101a7a', Math.ceil(p.mp) + '/' + st.maxMP);
  HUD.orbL = { x: 30, y: H - 30, r: 28 }; HUD.orbR = { x: W - 30, y: H - 30, r: 28 };

  // xp bar (bottom center)
  const xpW = W - 140, xpX = 70, xpY = H - 7;
  const need = xpToNext(p.level); const frac = Math.min(1, p.xp / need);
  ctx.fillStyle = '#1a1712'; ctx.fillRect(xpX, xpY, xpW, 5);
  ctx.fillStyle = '#c9a54a'; ctx.fillRect(xpX, xpY, xpW * frac, 5);
  ctx.strokeStyle = '#000'; ctx.strokeRect(xpX + 0.5, xpY + 0.5, xpW, 5);
  ctx.fillStyle = '#e8dcc0'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('Lv ' + p.level, W / 2, H - 12);

  // belt (4 potions) centered above xp bar
  const bx = W / 2 - 4 * 15, by = H - 42; HUD.belt = [];
  for (let i = 0; i < 4; i++) {
    const x = bx + i * 30, y = by;
    ctx.fillStyle = 'rgba(10,10,16,0.85)'; ctx.fillRect(x, y, 26, 26);
    ctx.strokeStyle = '#4a4038'; ctx.strokeRect(x + 0.5, y + 0.5, 26, 26);
    const pot = p.belt[i];
    if (pot) { const cx = x + 13, cy = y + 13; const col = pot.potion.kind === 'health' ? '#d33' : '#36f'; ctx.fillStyle = '#222'; ctx.fillRect(cx - 4, cy - 6, 8, 12); ctx.fillStyle = col; ctx.fillRect(cx - 3, cy - 2, 6, 7); }
    ctx.fillStyle = '#998'; ctx.font = '7px monospace'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), x + 2, y + 8);
    HUD.belt.push({ x, y, w: 26, h: 26, i });
  }
  // skill icons (primary/secondary) flanking belt
  const C = CLASSES[p.cls];
  drawSkillIcon(bx - 34, by, C.primary, 'L');
  drawSkillIcon(bx + 4 * 30 + 8, by, C.secondary, 'R');

  // buttons (Inv/Char/Map)
  HUD.btns = [];
  drawButton(W / 2 - 78, H - 42, 'I', 'inventory');
  drawButton(W / 2 + 62, H - 42, 'C', 'char');

  // toasts
  ctx.textAlign = 'center'; ctx.font = 'bold 9px monospace';
  for (let i = 0; i < game.toasts.length; i++) { const t = game.toasts[i]; ctx.globalAlpha = Math.min(1, t.ttl); ctx.fillStyle = '#000'; ctx.fillText(t.text, W / 2 + 1, 40 + i * 12 + 1); ctx.fillStyle = t.color; ctx.fillText(t.text, W / 2, 40 + i * 12); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';

  if (game.bossIntro > 0) { ctx.globalAlpha = Math.min(1, game.bossIntro); ctx.textAlign = 'center'; ctx.font = 'bold 16px serif'; ctx.fillStyle = '#d33'; ctx.fillText('DIABLMOORE AWAKENS', W / 2, H / 2 - 40); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }

  if (game.showMap) drawAutomap();
}
function drawSkillIcon(x, y, skill, key) {
  ctx.fillStyle = 'rgba(10,10,16,0.85)'; ctx.fillRect(x, y, 26, 26); ctx.strokeStyle = '#6a5030'; ctx.strokeRect(x + 0.5, y + 0.5, 26, 26);
  const cx = x + 13, cy = y + 13;
  const col = skill === 'firebolt' || skill === 'cleave' ? '#f80' : skill === 'heal' ? '#6f6' : skill === 'multishot' || skill === 'shoot' ? '#cc8' : '#ccc';
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy - 1, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#aaa'; ctx.font = '7px monospace'; ctx.fillText(key, x + 2, y + 8);
}
function drawButton(x, y, label, action) {
  ctx.fillStyle = 'rgba(10,10,16,0.85)'; ctx.fillRect(x, y, 16, 26); ctx.strokeStyle = '#4a4038'; ctx.strokeRect(x + 0.5, y + 0.5, 16, 26);
  ctx.fillStyle = '#c9b98a'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText(label, x + 8, y + 17); ctx.textAlign = 'left';
  HUD.btns.push({ x, y, w: 16, h: 26, action });
}
function drawOrb(cx, cy, r, frac, colTop, colBot, label) {
  frac = Math.max(0, Math.min(1, frac));
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  ctx.fillStyle = '#0a0a10'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const fillTop = cy + r - frac * r * 2;
  const g = ctx.createLinearGradient(0, fillTop, 0, cy + r);
  g.addColorStop(0, colTop); g.addColorStop(1, colBot);
  ctx.fillStyle = g; ctx.fillRect(cx - r, fillTop, r * 2, frac * r * 2);
  // glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.3, fillTop + 4, r * 0.4, r * 0.2, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText(label, cx, cy + 3); ctx.textAlign = 'left';
}
function drawAutomap() {
  const lvl = game.level; const scale = 3; const ox = W - lvl.W * scale - 8, oy = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ox - 2, oy - 2, lvl.W * scale + 4, lvl.H * scale + 4);
  for (let y = 0; y < lvl.H; y++) for (let x = 0; x < lvl.W; x++) {
    const vis = lvl.vis[y * lvl.W + x]; if (!vis) continue; const t = lvl.grid[y * lvl.W + x];
    ctx.fillStyle = t === T.WALL ? '#443' : t === T.STAIRS_DOWN ? '#a4f' : t === T.STAIRS_UP ? '#4af' : (vis === 2 ? '#786' : '#443a30');
    ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
  }
  ctx.fillStyle = '#fff'; ctx.fillRect(ox + Math.round(game.player.x) * scale, oy + Math.round(game.player.y) * scale, scale, scale);
  ctx.fillStyle = '#f44'; for (const m of game.monsters) if (m.alive && lvl.vis[Math.round(m.y) * lvl.W + Math.round(m.x)] === 2) ctx.fillRect(ox + Math.round(m.x) * scale, oy + Math.round(m.y) * scale, scale, scale);
}

// hover tooltip for ground items and hovered monster
function drawHoverTooltip() {
  if (game.overlay) return;
  const wp = screenToWorld(game.input.mx, game.input.my);
  let it = null;
  for (const g of game.items) if (dist(g, wp) < 0.9 && g.item.type !== 'gold' && game.level.vis[Math.round(g.y) * game.level.W + Math.round(g.x)] === 2) it = g.item;
  if (it) drawItemTooltip(it, game.input.mx + 8, game.input.my + 8);
}

// =====================  OVERLAYS  ===========================================
function panel(x, y, w, h, title) {
  ctx.fillStyle = 'rgba(6,6,10,0.95)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#6a5030'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.lineWidth = 1;
  ctx.fillStyle = '#1a140e'; ctx.fillRect(x, y, w, 16);
  ctx.fillStyle = '#e8c98a'; ctx.font = 'bold 10px serif'; ctx.textAlign = 'center'; ctx.fillText(title, x + w / 2, y + 12); ctx.textAlign = 'left';
}

function drawInventory() {
  const p = game.player;
  panel(20, 24, 220, 336, 'Character  -  ' + CLASSES[p.cls].name);
  const st = game.stats;
  // paperdoll slots
  const slots = [
    { s: 'helm', x: 110, y: 46, label: 'Head' }, { s: 'amulet', x: 150, y: 46, label: 'Amu' },
    { s: 'weapon', x: 60, y: 90, label: 'Weap' }, { s: 'body', x: 110, y: 90, label: 'Body' }, { s: 'shield', x: 160, y: 90, label: 'Shld' },
    { s: 'ring', x: 110, y: 140, label: 'Ring' },
  ];
  HUD.equipSlots = [];
  for (const sl of slots) {
    ctx.fillStyle = 'rgba(20,18,14,0.9)'; ctx.fillRect(sl.x, sl.y, 34, 34); ctx.strokeStyle = '#5a4a30'; ctx.strokeRect(sl.x + 0.5, sl.y + 0.5, 34, 34);
    ctx.fillStyle = '#776'; ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.fillText(sl.label, sl.x + 17, sl.y + 42);
    const it = p.equip[sl.s];
    if (it) { ctx.save(); ctx.strokeStyle = RARITY_COLOR[it.rarity]; ctx.strokeRect(sl.x + 1.5, sl.y + 1.5, 32, 32); Spr.drawItemIcon(ctx, sl.x + 17, sl.y + 17, it, 1.4); ctx.restore(); }
    HUD.equipSlots.push({ x: sl.x, y: sl.y, w: 34, h: 34, slot: sl.s, item: it });
  }
  ctx.textAlign = 'left';
  // stats block
  let sy = 190; ctx.font = '8px monospace';
  const rows = [['Str', st.str], ['Dex', st.dex], ['Mag', st.mag], ['Vit', st.vit], ['', ''], ['Armor', st.ac], ['Damage', st.dmgMin + '-' + st.dmgMax], ['To-Hit', Math.round(st.tohit) + '%'], ['Kills', p.kills]];
  for (const [k, v] of rows) { if (k) { ctx.fillStyle = '#9a8a6a'; ctx.fillText(k, 34, sy); ctx.fillStyle = '#e8dcc0'; ctx.textAlign = 'right'; ctx.fillText(String(v), 150, sy); ctx.textAlign = 'left'; } sy += 12; }
  if (p.statPoints > 0) {
    ctx.fillStyle = '#ffd54a'; ctx.fillText(p.statPoints + ' points to spend:', 34, sy + 2); sy += 14;
    HUD.allocBtns = [];
    const attrs = ['str', 'dex', 'mag', 'vit'];
    for (let i = 0; i < 4; i++) { const bx = 34 + i * 48, by = sy; ctx.fillStyle = '#3a2a18'; ctx.fillRect(bx, by, 42, 16); ctx.strokeStyle = '#6a5030'; ctx.strokeRect(bx + 0.5, by + 0.5, 42, 16); ctx.fillStyle = '#e8c98a'; ctx.textAlign = 'center'; ctx.fillText('+' + attrs[i].toUpperCase(), bx + 21, by + 11); ctx.textAlign = 'left'; HUD.allocBtns.push({ x: bx, y: by, w: 42, h: 16, stat: attrs[i] }); }
  } else HUD.allocBtns = [];

  // inventory grid
  panel(250, 24, 242, 336, 'Inventory  ( ' + p.inv.length + '/40 )');
  const cols = 6, cell = 36, gx = 258, gy = 48; HUD.invCells = [];
  for (let i = 0; i < p.inv.length; i++) {
    const cx = gx + (i % cols) * cell, cy = gy + Math.floor(i / cols) * cell;
    const it = p.inv[i];
    ctx.fillStyle = 'rgba(20,18,14,0.9)'; ctx.fillRect(cx, cy, 32, 32); ctx.strokeStyle = RARITY_COLOR[it.rarity] || '#444'; ctx.strokeRect(cx + 0.5, cy + 0.5, 32, 32);
    Spr.drawItemIcon(ctx, cx + 16, cy + 16, it, 1.3);
    if (!it.identified && it.rarity !== 'common') { ctx.fillStyle = '#fa4'; ctx.font = '8px monospace'; ctx.fillText('?', cx + 24, cy + 12); }
    HUD.invCells.push({ x: cx, y: cy, w: 32, h: 32, i });
  }
  ctx.fillStyle = '#877'; ctx.font = '7px monospace';
  ctx.fillText('Click item: equip / drink.  Right-click equipped: remove.', 258, 350);
  // hover tooltip
  const hv = hoverInvItem();
  if (hv) drawItemTooltip(hv.item, game.input.mx + 10, game.input.my + 6);
}
function hoverInvItem() {
  const mx = game.input.mx, my = game.input.my;
  if (HUD.invCells) for (const c of HUD.invCells) if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) return { item: game.player.inv[c.i] };
  if (HUD.equipSlots) for (const c of HUD.equipSlots) if (c.item && mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) return { item: c.item };
  return null;
}

function drawItemTooltip(item, x, y) {
  const lines = tooltipLines(item);
  ctx.font = '8px monospace';
  let wmax = 0; for (const l of lines) wmax = Math.max(wmax, ctx.measureText(l.t).width);
  const w = wmax + 14, h = lines.length * 12 + 8;
  if (x + w > W) x = W - w - 4; if (y + h > H) y = H - h - 4; if (x < 0) x = 2; if (y < 0) y = 2;
  ctx.fillStyle = 'rgba(4,4,8,0.96)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = RARITY_COLOR[item.rarity] || '#666'; ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  let ly = y + 12;
  for (const l of lines) { ctx.fillStyle = l.c; ctx.font = l.head ? 'bold 8px monospace' : '8px monospace'; ctx.fillText(l.t, x + 7, ly); ly += 12; }
}

function drawVendor() {
  const p = game.player;
  panel(30, 30, 300, 324, 'Griswold the Smith  -  Buy');
  ctx.font = '8px monospace'; HUD.buyRows = [];
  for (let i = 0; i < game.vendorStock.length; i++) {
    const it = game.vendorStock[i]; const y = 52 + i * 30;
    const hover = inRect(game.input.mx, game.input.my, 34, y - 12, 292, 26);
    ctx.fillStyle = hover ? 'rgba(60,50,30,0.6)' : 'rgba(20,18,14,0.6)'; ctx.fillRect(34, y - 12, 292, 26);
    Spr.drawItemIcon(ctx, 48, y, it, 1.1);
    ctx.fillStyle = RARITY_COLOR[it.rarity] || '#ccc'; ctx.fillText(displayName(it), 66, y - 1);
    ctx.fillStyle = '#ffd54a'; ctx.textAlign = 'right'; ctx.fillText((it.value || 30) + 'g', 322, y + 3); ctx.textAlign = 'left';
    HUD.buyRows.push({ x: 34, y: y - 12, w: 292, h: 26, i });
    if (hover) drawItemTooltip(it, game.input.mx + 10, game.input.my + 6);
  }
  // sell panel
  panel(340, 30, 156, 324, 'Sell');
  HUD.sellRows = []; ctx.font = '7px monospace';
  for (let i = 0; i < Math.min(p.inv.length, 11); i++) { const it = p.inv[i]; const y = 52 + i * 26; const hover = inRect(game.input.mx, game.input.my, 344, y - 11, 148, 24); ctx.fillStyle = hover ? 'rgba(60,30,30,0.6)' : 'rgba(20,18,14,0.6)'; ctx.fillRect(344, y - 11, 148, 24); Spr.drawItemIcon(ctx, 356, y, it, 1.0); ctx.fillStyle = RARITY_COLOR[it.rarity] || '#ccc'; ctx.fillText(displayName(it).slice(0, 16), 368, y - 1); ctx.fillStyle = '#ffd54a'; ctx.fillText('+' + sellValue(it) + 'g', 368, y + 8); HUD.sellRows.push({ x: 344, y: y - 11, w: 148, h: 24, i }); }
  ctx.fillStyle = '#ffd54a'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('Gold: ' + p.gold, W / 2, 348); ctx.textAlign = 'left';
  ctx.fillStyle = '#877'; ctx.font = '7px monospace'; ctx.fillText('Esc / I to leave', 340, 348);
}
function inRect(mx, my, x, y, w, h) { return mx >= x && mx <= x + w && my >= y && my <= y + h; }

// =====================  TITLE / SELECT / END  ==============================
function drawTitle() {
  clear();
  // vignette bg
  const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 320); g.addColorStop(0, '#1a0d0d'); g.addColorStop(1, '#050406'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7a1010'; ctx.font = 'bold 40px serif'; ctx.fillText('DIABLMOORE', W / 2 + 2, 120);
  ctx.fillStyle = '#c23020'; ctx.fillText('DIABLMOORE', W / 2, 118);
  ctx.fillStyle = '#8a7a5a'; ctx.font = 'italic 12px serif'; ctx.fillText('- descend into the depths beneath Moorestram -', W / 2, 150);
  // menu
  HUD.titleBtns = [];
  const opts = game.hasSave ? ['Continue', 'New Game'] : ['New Game'];
  for (let i = 0; i < opts.length; i++) { const y = 210 + i * 40; const hover = inRect(game.input.mx, game.input.my, W / 2 - 90, y - 18, 180, 30); ctx.fillStyle = hover ? '#3a1818' : '#1a0e0e'; ctx.fillRect(W / 2 - 90, y - 18, 180, 30); ctx.strokeStyle = '#6a2020'; ctx.strokeRect(W / 2 - 90, y - 18, 180, 30); ctx.fillStyle = '#e8c0a0'; ctx.font = 'bold 14px serif'; ctx.fillText(opts[i], W / 2, y + 2); HUD.titleBtns.push({ x: W / 2 - 90, y: y - 18, w: 180, h: 30, action: opts[i] }); }
  ctx.fillStyle = '#665'; ctx.font = '8px monospace'; ctx.fillText('Left-click move/attack  -  Right-click skill  -  1-4 potions  -  I inv  -  C char  -  Tab map  -  M mute', W / 2, H - 12);
  ctx.textAlign = 'left';
}
function drawClassSelect() {
  clear();
  const g = ctx.createRadialGradient(W / 2, 100, 20, W / 2, 200, 340); g.addColorStop(0, '#160c0c'); g.addColorStop(1, '#050406'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#c9a54a'; ctx.font = 'bold 18px serif'; ctx.fillText('Choose Thy Hero', W / 2, 40);
  const keys = ['warrior', 'rogue', 'sorcerer']; HUD.classBtns = [];
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * 155, y = 70, w = 145, h = 240; const sel = game.classPick === i;
    ctx.fillStyle = sel ? '#2a1a12' : '#120c0a'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = sel ? '#c9a54a' : '#5a4030'; ctx.lineWidth = sel ? 2 : 1; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.lineWidth = 1;
    const C = CLASSES[keys[i]];
    // big sprite
    const spr = Spr.playerSprite(keys[i]); ctx.imageSmoothingEnabled = false; ctx.drawImage(spr, x + w / 2 - spr.width, y + 20, spr.width * 2, spr.height * 2);
    ctx.fillStyle = '#e8c98a'; ctx.font = 'bold 13px serif'; ctx.fillText(C.name, x + w / 2, y + 108);
    ctx.font = '7px monospace'; ctx.fillStyle = '#bba';
    ctx.fillText('Str ' + C.str + '  Dex ' + C.dex, x + w / 2, y + 126);
    ctx.fillText('Mag ' + C.mag + '  Vit ' + C.vit, x + w / 2, y + 138);
    wrapText(C.blurb, x + 8, y + 158, w - 16, 11, '#8a9a8a');
    ctx.fillStyle = '#c9a54a'; ctx.font = '7px monospace';
    ctx.fillText('L: ' + SKILL_INFO[C.primary].name + '   R: ' + SKILL_INFO[C.secondary].name, x + w / 2, y + h - 12);
    HUD.classBtns.push({ x, y, w, h, i, key: keys[i] });
  }
  ctx.fillStyle = '#e8c0a0'; ctx.font = '10px monospace'; ctx.fillText('Click a hero to begin  (or press Enter)', W / 2, H - 14);
  ctx.textAlign = 'left';
}
function wrapText(text, x, y, maxw, lh, color) {
  ctx.font = '7px monospace'; ctx.fillStyle = color; ctx.textAlign = 'center';
  const words = text.split(' '); let line = '', cy = y; const cx = x + maxw / 2;
  for (const w of words) { const test = line + w + ' '; if (ctx.measureText(test).width > maxw && line) { ctx.fillText(line.trim(), cx, cy); line = w + ' '; cy += lh; } else line = test; }
  ctx.fillText(line.trim(), cx, cy);
}
function drawGameOver() {
  renderWorld(); ctx.fillStyle = 'rgba(20,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#c22'; ctx.font = 'bold 30px serif'; ctx.fillText('You Have Died', W / 2, H / 2 - 20);
  ctx.fillStyle = '#a98'; ctx.font = '10px monospace'; ctx.fillText('Death is not the end. Rise again in Moorestram.', W / 2, H / 2 + 8);
  const hover = inRect(game.input.mx, game.input.my, W / 2 - 90, H / 2 + 28, 180, 30);
  ctx.fillStyle = hover ? '#3a1818' : '#1a0e0e'; ctx.fillRect(W / 2 - 90, H / 2 + 28, 180, 30); ctx.strokeStyle = '#6a2020'; ctx.strokeRect(W / 2 - 90, H / 2 + 28, 180, 30);
  ctx.fillStyle = '#e8c0a0'; ctx.font = 'bold 12px serif'; ctx.fillText('Return to Moorestram', W / 2, H / 2 + 48);
  HUD.overBtn = { x: W / 2 - 90, y: H / 2 + 28, w: 180, h: 30 };
  ctx.textAlign = 'left';
}
function drawVictory() {
  clear();
  const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 340); g.addColorStop(0, '#3a1a10'); g.addColorStop(1, '#050406'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffcf3a'; ctx.font = 'bold 26px serif'; ctx.fillText('VICTORY', W / 2, 120);
  ctx.fillStyle = '#e8c0a0'; ctx.font = '11px serif'; ctx.fillText('Diablmoore, the Moor Lord, is vanquished.', W / 2, 155);
  ctx.fillText('Moorestram is safe once more.', W / 2, 175);
  const p = game.player; ctx.fillStyle = '#bba'; ctx.font = '9px monospace';
  ctx.fillText('Hero: ' + CLASSES[p.cls].name + '  -  Level ' + p.level + '  -  ' + p.kills + ' kills  -  ' + p.gold + ' gold', W / 2, 210);
  const hover = inRect(game.input.mx, game.input.my, W / 2 - 80, 250, 160, 30);
  ctx.fillStyle = hover ? '#3a2818' : '#1a120e'; ctx.fillRect(W / 2 - 80, 250, 160, 30); ctx.strokeStyle = '#c9a54a'; ctx.strokeRect(W / 2 - 80, 250, 160, 30);
  ctx.fillStyle = '#e8c98a'; ctx.font = 'bold 12px serif'; ctx.fillText('Play Again', W / 2, 270);
  HUD.victoryBtn = { x: W / 2 - 80, y: 250, w: 160, h: 30 };
  ctx.textAlign = 'left';
}

// =====================  INPUT HANDLERS  =====================================
function onLeft(px, py) {
  A.resume();
  if (game.screen === 'title') { for (const b of HUD.titleBtns || []) if (inRect(px, py, b.x, b.y, b.w, b.h)) { A.sfx.ui(); if (b.action === 'Continue') continueGame(); else { game.screen = 'classselect'; } return; } return; }
  if (game.screen === 'classselect') { for (const b of HUD.classBtns || []) if (inRect(px, py, b.x, b.y, b.w, b.h)) { game.classPick = b.i; startGame(b.key); return; } return; }
  if (game.screen === 'gameover') { if (HUD.overBtn && inRect(px, py, HUD.overBtn.x, HUD.overBtn.y, HUD.overBtn.w, HUD.overBtn.h)) { A.sfx.ui(); respawn(); } return; }
  if (game.screen === 'victory') { if (HUD.victoryBtn && inRect(px, py, HUD.victoryBtn.x, HUD.victoryBtn.y, HUD.victoryBtn.w, HUD.victoryBtn.h)) { Save.clear(); game.hasSave = false; game.screen = 'title'; } return; }
  // playing
  if (game.overlay === 'inventory') return onInvClick(px, py, false);
  if (game.overlay === 'vendor') return onVendorClick(px, py);
  // HUD hit tests
  if (HUD.belt) for (const b of HUD.belt) if (inRect(px, py, b.x, b.y, b.w, b.h)) { quaffBelt(b.i); return; }
  if (HUD.btns) for (const b of HUD.btns) if (inRect(px, py, b.x, b.y, b.w, b.h)) { toggleOverlay(b.action); return; }
  if (HUD.orbL && Math.hypot(px - HUD.orbL.x, py - HUD.orbL.y) < HUD.orbL.r) { useBeltKind('health'); return; }
  if (HUD.orbR && Math.hypot(px - HUD.orbR.x, py - HUD.orbR.y) < HUD.orbR.r) { useBeltKind('mana'); return; }
  if (py < 16) return;
  issueWorldAction(px, py, false);
}
function useBeltKind(kind) { const b = game.player.belt; for (let i = 0; i < b.length; i++) if (b[i] && b[i].potion.kind === kind) { quaffBelt(i); return; } }
function onLeftHold() { if (game.screen === 'playing' && !game.overlay && game.input.leftDown && game.input.my > 16 && game.input.my < H - 52) issueWorldAction(game.input.mx, game.input.my, true); }
function onRight(px, py) {
  A.resume();
  if (game.screen !== 'playing') return;
  if (game.overlay === 'inventory') return onInvClick(px, py, true);
  if (game.overlay) return;
  secondaryAt(screenToWorld(px, py));
}
function onInvClick(px, py, right) {
  if (HUD.invCells) for (const c of HUD.invCells) if (inRect(px, py, c.x, c.y, c.w, c.h)) { equipItem(c.i); return; }
  if (HUD.equipSlots) for (const c of HUD.equipSlots) if (c.item && inRect(px, py, c.x, c.y, c.w, c.h)) { unequip(c.slot); return; }
  if (!right && HUD.allocBtns) for (const b of HUD.allocBtns) if (inRect(px, py, b.x, b.y, b.w, b.h)) { allocate(b.stat); return; }
}
function onVendorClick(px, py) {
  if (HUD.buyRows) for (const r of HUD.buyRows) if (inRect(px, py, r.x, r.y, r.w, r.h)) { buyItem(r.i); return; }
  if (HUD.sellRows) for (const r of HUD.sellRows) if (inRect(px, py, r.x, r.y, r.w, r.h)) { sellItem(r.i); return; }
}
function buyItem(i) { const it = game.vendorStock[i]; if (!it) return; const cost = it.value || 30; if (game.player.gold < cost) { toast('Not enough gold', '#a66'); return; } if (it.type === 'potion') { if (!addToBelt(it) && !addToInv(it)) { toast('No room', '#a66'); return; } game.vendorStock[i] = makePotion(it.potion.kind); } else { if (!addToInv(it)) { toast('Inventory full', '#a66'); return; } game.vendorStock.splice(i, 1); } game.player.gold -= cost; A.sfx.pickupGold(); saveGame(); }
function sellItem(i) { const it = game.player.inv[i]; if (!it) return; game.player.gold += sellValue(it); game.player.inv.splice(i, 1); A.sfx.pickupGold(); saveGame(); }

function toggleOverlay(which) { A.sfx.ui(); game.overlay = game.overlay === which ? null : which; }

function onKey(k, e) {
  A.resume();
  if (k === 'm' || k === 'M') { const m = A.toggleMute(); toast(m ? 'Muted' : 'Sound on', '#cdd'); return; }
  if (game.screen === 'classselect') { if (k === 'Enter') startGame(['warrior', 'rogue', 'sorcerer'][game.classPick]); if (k === 'ArrowLeft') game.classPick = (game.classPick + 2) % 3; if (k === 'ArrowRight') game.classPick = (game.classPick + 1) % 3; return; }
  if (game.screen === 'title') { if (k === 'Enter') { if (game.hasSave) continueGame(); else game.screen = 'classselect'; } return; }
  if (game.screen === 'gameover') { if (k === 'Enter' || k === ' ') respawn(); return; }
  if (game.screen === 'victory') { if (k === 'Enter') { Save.clear(); game.hasSave = false; game.screen = 'title'; } return; }
  if (game.screen !== 'playing') return;
  if (k === 'i' || k === 'I') return toggleOverlay('inventory');
  if (k === 'c' || k === 'C') return toggleOverlay('inventory');
  if (k === 'Escape' || k === 'Enter') { game.overlay = null; return; }
  if (k === 'Tab') { game.showMap = !game.showMap; if (e) e.preventDefault(); return; }
  if (k >= '1' && k <= '4') { quaffBelt(parseInt(k) - 1); return; }
  if (k === ' ') { // interact / clear
    // try use stairs / npc under player
    game.dest = null;
  }
}

// =====================  GAME START  ========================================
function startGame(classKey) {
  game.player = newPlayer(classKey);
  const C = CLASSES[classKey];
  for (const bk of C.startItems) game.player.equip[BASES[bk].slot] = generateItem(1, makeRng((game.seed + bk.length) >>> 0), { baseKey: bk, rarity: 'common' });
  for (let i = 0; i < C.startPotions; i++) addToBelt(makePotion('health'));
  addToBelt(makePotion('mana'));
  game.player.inv = [generateItem(2, makeRng(game.seed + 5), { baseKey: 'ring' })];
  game.stats = deriveStats(game.player);
  game.player.hp = game.stats.maxHP; game.player.mp = game.stats.maxMP;
  game.screen = 'playing';
  enterScene('town', 0);
}
function continueGame() {
  const data = Save.load(); if (!data) { game.screen = 'classselect'; return; }
  game.player = newPlayer(data.cls); Save.deserialize(data, game.player);
  game.stats = deriveStats(game.player);
  if (!game.player.hp || game.player.hp <= 0) game.player.hp = game.stats.maxHP;
  if (game.player.mp == null) game.player.mp = game.stats.maxMP;
  game.player.alive = true;
  game.screen = 'playing';
  enterScene('town', 0);
}

// =====================  LOOP  ===============================================
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  game.time += dt;
  step(dt);
  render();
  requestAnimationFrame(frame);
}
function step(dt) {
  if (game.screen !== 'playing') return;
  if (game.bossIntro > 0) game.bossIntro -= dt;
  for (const t of game.toasts) t.ttl -= dt;
  game.toasts = game.toasts.filter((t) => t.ttl > 0);
  if (game.overlay) return; // pause world while in menus
  onLeftHold();
  updatePlayer(dt);
  refreshLight();
  updateWorld(dt);
  updateCamera();
}
function render() {
  clear();
  if (game.screen === 'title') return drawTitle();
  if (game.screen === 'classselect') return drawClassSelect();
  if (game.screen === 'gameover') return drawGameOver();
  if (game.screen === 'victory') return drawVictory();
  renderWorld();
  drawHoverTooltip();
  drawHUD();
  if (game.overlay === 'inventory') drawInventory();
  if (game.overlay === 'vendor') drawVendor();
}

// =====================  BOOT + TEST HOOK  ===================================
game.input = createInput(canvas, { leftDown: onLeft, rightDown: onRight, key: onKey, move: () => {}, wheel: () => {} });
game.hasSave = Save.hasSave();
requestAnimationFrame(frame);

// headless test hook
window.__dm = {
  game,
  ready: true,
  start(cls) { startGame(cls || 'warrior'); return { screen: game.screen, scene: game.scene }; },
  continue() { continueGame(); },
  state() {
    const p = game.player;
    return {
      screen: game.screen, overlay: game.overlay, scene: game.scene, depth: game.depth,
      px: p ? p.x : 0, py: p ? p.y : 0, hp: p ? p.hp : 0, maxHp: game.stats ? game.stats.maxHP : 0,
      mp: p ? p.mp : 0, maxMp: game.stats ? game.stats.maxMP : 0, gold: p ? p.gold : 0, level: p ? p.level : 0,
      xp: p ? p.xp : 0, kills: p ? p.kills : 0, monsters: game.monsters.filter((m) => m.alive).length,
      items: game.items.length, invCount: p ? p.inv.length : 0, statPoints: p ? p.statPoints : 0,
      dmg: game.stats ? game.stats.dmgMin + '-' + game.stats.dmgMax : '', ac: game.stats ? game.stats.ac : 0,
    };
  },
  step(dt, times = 1) { for (let i = 0; i < times; i++) step(dt); },
  moveTo(x, y) { game.dest = { kind: 'move', x, y }; },
  moveDir(dx, dy) { game.dest = { kind: 'move', x: game.player.x + dx, y: game.player.y + dy }; },
  nearestMonster() { let best = null, bd = 1e9; for (const m of game.monsters) if (m.alive) { const d = Math.hypot(m.x - game.player.x, m.y - game.player.y); if (d < bd) { bd = d; best = m; } } return best; },
  attackNearest(maxSteps = 400) {
    const m = this.nearestMonster(); if (!m) return { killed: false };
    const xp0 = game.player.xp, lvl0 = game.player.level; game.dest = { kind: 'attack', entity: m }; game.target = m;
    for (let i = 0; i < maxSteps && m.alive; i++) { game.dest = { kind: 'attack', entity: m }; step(1 / 30); }
    return { killed: !m.alive, xpBefore: xp0, xpAfter: game.player.xp, leveled: game.player.level > lvl0, level: game.player.level };
  },
  spawnMonsterNear(key) { const p = game.player; const mm = spawnMonster(key || 'skeleton', Math.round(p.x) + 1, Math.round(p.y), Math.max(1, game.depth)); mm.x = p.x + 1.2; mm.y = p.y; game.monsters.push(mm); return mm.id; },
  dropTestItem() { const bk = CLASSES[game.player.cls].primary === 'firebolt' ? 'staff' : CLASSES[game.player.cls].primary === 'shoot' ? 'longbow' : 'axe'; const it = generateItem(24, makeRng((Math.random() * 1e9) | 0), { rarity: 'rare', baseKey: bk }); it.identified = true; game._testWpn = it.uid; dropItem(it, game.player.x + 0.3, game.player.y); return it.name; },
  pickupAndEquip() {
    const dmgBefore = game.stats.dmgMax;
    // grab the specific test weapon we dropped
    let g = game.items.find((it) => it.item && it.item.uid === game._testWpn);
    if (!g) { let bd = 1e9; for (const it of game.items) { if (!it.item || it.item.type !== 'weapon') continue; const d = Math.hypot(it.x - game.player.x, it.y - game.player.y); if (d < bd) { bd = d; g = it; } } }
    if (!g) return { ok: false };
    pickUp(g);
    const idx = game.player.inv.findIndex((it) => it.uid === game._testWpn) >= 0 ? game.player.inv.findIndex((it) => it.uid === game._testWpn) : game.player.inv.findIndex((it) => it.type === 'weapon');
    if (idx >= 0) equipItem(idx);
    return { ok: true, dmgBefore, dmgAfter: game.stats.dmgMax, equipped: game.player.equip.weapon ? game.player.equip.weapon.name : null };
  },
  quaffTest() { game.player.hp = 1; const before = game.player.hp; addToBelt(makePotion('health')); useBeltKind('health'); return { before, after: game.player.hp }; },
  descend() { const d0 = game.depth; enterScene('dungeon', game.scene === 'town' ? 1 : game.depth + 1); return { from: d0, to: game.depth, monsters: game.monsters.length }; },
  gotoTown() { enterScene('town', 0); },
  openInventory() { game.overlay = 'inventory'; },
  openVendor() { enterScene('town', 0); game.overlay = 'vendor'; },
  closeOverlay() { game.overlay = null; },
  gotoBoss() { enterScene('dungeon', BOSS_DEPTH); const b = game.monsters.find((m) => m.key === 'boss'); if (b) { game.player.x = b.x + 2; game.player.y = b.y; updateCamera(); refreshLight(); } game.player.hp = game.stats.maxHP; return { depth: game.depth, boss: !!b, bossHp: b ? b.hp : 0 }; },
  damageBoss(n) { const b = game.monsters.find((m) => m.key === 'boss'); if (!b) return { ok: false }; applyDamageToMonster(b, n || 50, false); return { ok: true, hp: b.hp, alive: b.alive }; },
  killBoss() { const b = game.monsters.find((m) => m.key === 'boss'); if (!b) return { ok: false }; applyDamageToMonster(b, b.hp + 10, false); return { ok: true, screen: game.screen }; },
  frameStats() {
    const d = ctx.getImageData(0, 0, W, H).data; let mn = 255, mx = 0; const set = new Set();
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; if (l < mn) mn = l; if (l > mx) mx = l; if ((i % 64) === 0) set.add((d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5)); }
    return { min: mn, max: mx, range: mx - mn, colors: set.size };
  },
};
// =====================  MOBILE / TOUCH OVERLAY  ============================
// Casts the secondary skill (same as right-click) aimed at the nearest visible
// monster, falling back to the player's facing direction when none is in sight.
function castSecondaryTouch() {
  if (game.screen !== 'playing' || game.overlay || !game.player) return;
  A.resume();
  let target = null, best = 1e9;
  for (const m of game.monsters) {
    if (!m.alive) continue;
    if (game.level.vis[Math.round(m.y) * game.level.W + Math.round(m.x)] !== 2) continue;
    const d = dist(m, game.player); if (d < best) { best = d; target = m; }
  }
  const f = game.player.facing || 0;
  const wp = target ? { x: target.x, y: target.y } : { x: game.player.x + Math.cos(f), y: game.player.y + Math.sin(f) };
  if (target) faceTo(target);
  secondaryAt(wp);
}
function touchPotion(kind) {
  if (game.screen !== 'playing' || game.overlay || !game.player) return;
  A.resume(); useBeltKind(kind);
}
function touchToggleMap() { if (game.screen === 'playing') { A.resume(); A.sfx.ui(); game.showMap = !game.showMap; } }
function touchOverlay(which) { if (game.screen === 'playing') { A.resume(); toggleOverlay(which); } }

// Exposed so the DOM overlay (and headless tests) can drive the touch buttons.
window.__touch = {
  skill: castSecondaryTouch,
  potion: touchPotion,
  inv: () => touchOverlay('inventory'),
  char: () => touchOverlay('inventory'),
  map: touchToggleMap,
};

function setupTouchOverlay() {
  const overlay = document.getElementById('touch');
  if (!overlay) return;
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || location.search.includes('touch=1');
  if (!isTouch) return;
  overlay.style.display = 'block';
  const bind = (id, fn) => {
    const el = document.getElementById(id); if (!el) return;
    let handled = false; // swallow the synthetic click that follows a touch
    el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); handled = true; el.classList.add('act'); fn(); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('act'); }, { passive: false });
    el.addEventListener('touchcancel', () => { el.classList.remove('act'); });
    el.addEventListener('click', (e) => { e.preventDefault(); if (handled) { handled = false; return; } fn(); });
  };
  bind('tb-skill', () => window.__touch.skill());
  bind('tb-hp', () => window.__touch.potion('health'));
  bind('tb-mp', () => window.__touch.potion('mana'));
  bind('tb-i', () => window.__touch.inv());
  bind('tb-c', () => window.__touch.char());
  bind('tb-map', () => window.__touch.map());
}
setupTouchOverlay();

window.__ready = true;
