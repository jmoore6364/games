// entities.js — classes, derived stats, combat rolls, monsters, AI, projectiles.
// Combat math is DOM-free and headless-testable.
import { aggregateStats } from './items.js';
import { findPath, isWalkable, tileAt, T } from './dungeon.js';

export const CLASSES = {
  warrior: {
    name: 'Warrior', str: 30, dex: 20, mag: 10, vit: 25,
    hpBase: 22, hpVit: 2, hpLvl: 2.5, manaBase: 5, manaMag: 0.8, manaLvl: 0.5,
    startItems: ['sword', 'leather', 'buckler'], startPotions: 3,
    primary: 'attack', secondary: 'cleave', attackAttr: 'str',
    blurb: 'Tanky melee bruiser. Cleave hits everything around you.',
  },
  rogue: {
    name: 'Rogue', str: 20, dex: 30, mag: 15, vit: 20,
    hpBase: 16, hpVit: 2, hpLvl: 1.8, manaBase: 6, manaMag: 1, manaLvl: 0.6,
    startItems: ['bow', 'leather', 'cap'], startPotions: 2,
    primary: 'shoot', secondary: 'multishot', attackAttr: 'dex',
    blurb: 'Ranged archer. Fires arrows; multishot sprays a fan.',
  },
  sorcerer: {
    name: 'Sorcerer', str: 15, dex: 20, mag: 35, vit: 15,
    hpBase: 12, hpVit: 1.6, hpLvl: 1.2, manaBase: 14, manaMag: 2, manaLvl: 1.2,
    startItems: ['staff', 'rags'], startPotions: 2,
    primary: 'firebolt', secondary: 'heal', attackAttr: 'mag',
    blurb: 'Glass-cannon caster. Firebolt to kill, heal to survive.',
  },
};

export function newPlayer(classKey) {
  const C = CLASSES[classKey];
  const p = {
    cls: classKey, level: 1, xp: 0, gold: 50,
    str: C.str, dex: C.dex, mag: C.mag, vit: C.vit,
    statPoints: 0,
    equip: { weapon: null, body: null, helm: null, shield: null, ring: null, amulet: null },
    inv: [], belt: [null, null, null, null],
    x: 0, y: 0, hp: 1, mp: 1, facing: 0, alive: true,
    kills: 0, depthReached: 0,
  };
  return p;
}

// ---- derived stats ---------------------------------------------------------
export function deriveStats(p) {
  const C = CLASSES[p.cls];
  const eq = aggregateStats(p.equip);
  const str = p.str + eq.str, dex = p.dex + eq.dex, mag = p.mag + eq.mag, vit = p.vit + eq.vit;
  const maxHP = Math.floor(C.hpBase + vit * C.hpVit + p.level * C.hpLvl + eq.life);
  const maxMP = Math.floor(C.manaBase + mag * C.manaMag + p.level * C.manaLvl + eq.mana);
  const w = p.equip.weapon;
  let dmgMin = 1, dmgMax = 2;
  if (w && w.dmgMin != null) { dmgMin = w.dmgMin; dmgMax = w.dmgMax; }
  dmgMin += eq.dmg; dmgMax += eq.dmg;
  // attribute damage bonus
  const attr = C.attackAttr === 'str' ? str : C.attackAttr === 'dex' ? dex : mag;
  const attrBonus = Math.floor(attr / 8);
  dmgMin += attrBonus; dmgMax += attrBonus;
  const ac = eq.ac + Math.floor(dex / 5);
  const tohit = 55 + dex * 0.5 + p.level * 2 + eq.tohit;
  return { str, dex, mag, vit, maxHP, maxMP, dmgMin, dmgMax, ac, tohit, resall: eq.resall,
    ranged: !!(w && w.ranged), wand: !!(w && w.wand), attr };
}

export function clampVitals(p, d) {
  if (p.hp > d.maxHP) p.hp = d.maxHP;
  if (p.mp > d.maxMP) p.mp = d.maxMP;
}

// ---- combat rolls ----------------------------------------------------------
// hit chance vs an armor class; returns 0.05..0.95
export function hitChance(tohit, targetAC) {
  const c = (tohit - targetAC) / 100;
  return Math.max(0.05, Math.min(0.95, c));
}
export function rollDamage(min, max, rng) {
  const r = rng ? rng() : Math.random();
  return Math.floor(min + r * (max - min + 1));
}
// resolve one attack; returns {hit, dmg, crit}
export function resolveAttack(atk, def, rng = Math.random) {
  const chance = hitChance(atk.tohit, def.ac || 0);
  if (rng() > chance) return { hit: false, dmg: 0, crit: false };
  const crit = rng() < 0.06;
  let dmg = rollDamage(atk.dmgMin, atk.dmgMax, rng);
  if (crit) dmg *= 2;
  if (def.resall) dmg = Math.max(1, Math.floor(dmg * (1 - def.resall / 100)));
  return { hit: true, dmg: Math.max(1, dmg), crit };
}

// ---- xp / leveling ---------------------------------------------------------
export function xpToNext(level) { return Math.floor(60 * level * Math.pow(1.28, level - 1)); }
export function grantXP(p, amount) {
  p.xp += amount;
  let leveled = 0;
  while (p.xp >= xpToNext(p.level)) { p.xp -= xpToNext(p.level); p.level++; p.statPoints += 5; leveled++; }
  return leveled;
}

// ---- monsters --------------------------------------------------------------
export const MONSTERS = {
  skeleton:  { name: 'Skeleton',      hp: 14, dmg: [2, 5],  ac: 12, tohit: 55, speed: 2.4, xp: 12, ai: 'melee',  size: 1, color: '#d8d0be' },
  zombie:    { name: 'Rotting Dead',  hp: 26, dmg: [3, 7],  ac: 6,  tohit: 45, speed: 1.3, xp: 18, ai: 'melee',  size: 1, color: '#6f8a5a' },
  fallen:    { name: 'Fallen Imp',    hp: 9,  dmg: [1, 4],  ac: 14, tohit: 60, speed: 3.2, xp: 8,  ai: 'melee',  size: 0.8, color: '#b6432f' },
  hound:     { name: 'Scavenger',     hp: 12, dmg: [2, 6],  ac: 18, tohit: 62, speed: 3.6, xp: 14, ai: 'melee',  size: 0.9, color: '#8a6b3a' },
  darkone:   { name: 'Dark Cultist',  hp: 16, dmg: [4, 9],  ac: 10, tohit: 70, speed: 2.0, xp: 22, ai: 'ranged', range: 6, size: 1, color: '#6a4a8a' },
  moorcher:  { name: 'The Moorcher',  hp: 120, dmg: [8, 16], ac: 20, tohit: 75, speed: 2.2, xp: 160, ai: 'melee', size: 1.4, color: '#c23a2a', elite: true },
};

export const BOSS = { name: 'Diablmoore, the Moor Lord', hp: 600, dmg: [14, 28], ac: 30, tohit: 90, speed: 1.9, xp: 2000, ai: 'boss', size: 1.9, color: '#d33' };

let _mid = 1;
export function spawnMonster(key, x, y, depth) {
  const M = key === 'boss' ? BOSS : MONSTERS[key];
  const scale = 1 + (depth - 1) * 0.28;
  const dmgScale = 1 + (depth - 1) * 0.18;
  const m = {
    id: _mid++, key, name: M.name, x, y, ai: M.ai, elite: !!M.elite || key === 'boss',
    hp: Math.round(M.hp * (key === 'boss' || M.elite ? 1 : scale)),
    dmgMin: Math.round(M.dmg[0] * dmgScale), dmgMax: Math.round(M.dmg[1] * dmgScale),
    ac: M.ac + Math.floor((depth - 1) * 1.5), tohit: M.tohit + (depth - 1) * 2,
    speed: M.speed, xp: Math.round(M.xp * (key === 'boss' || M.elite ? 1 : (1 + (depth - 1) * 0.4))),
    size: M.size, color: M.color, range: M.range || 0,
    path: null, pathI: 0, cd: 0, hurt: 0, facing: 0, anim: Math.random() * 6, alive: true,
    bossPhase: 0, bossTimer: 0,
  };
  m.maxhp = m.hp;
  return m;
}

// choose monster kinds valid for a depth
export function monsterPoolFor(depth) {
  if (depth <= 1) return ['skeleton', 'fallen', 'zombie'];
  if (depth === 2) return ['skeleton', 'fallen', 'zombie', 'hound'];
  if (depth === 3) return ['skeleton', 'hound', 'darkone', 'zombie'];
  return ['hound', 'darkone', 'zombie', 'fallen'];
}

// ---- monster AI step -------------------------------------------------------
// game provides: level, player(px,py), spawnProjectile(), dealToPlayer()
export function updateMonster(m, dt, game) {
  if (!m.alive) return;
  if (m.hurt > 0) m.hurt -= dt;
  m.anim += dt * 6;
  const px = game.player.x, py = game.player.y;
  const dx = px - m.x, dy = py - m.y;
  const dist = Math.hypot(dx, dy);
  m.facing = Math.atan2(dy, dx);
  if (m.cd > 0) m.cd -= dt;

  // only act when player is within awareness or already engaged
  const aware = dist < 9 || m.engaged;
  if (!aware) return;
  m.engaged = true;

  if (m.key === 'boss') return updateBoss(m, dt, game, dist, dx, dy);

  if (m.ai === 'ranged' && dist <= (m.range || 6) && dist > 1.2) {
    // stand and shoot
    if (m.cd <= 0) {
      const a = Math.atan2(dy, dx);
      game.spawnProjectile(m.x, m.y, Math.cos(a), Math.sin(a), { dmgMin: m.dmgMin, dmgMax: m.dmgMax, tohit: m.tohit }, 'monster', 'bolt');
      m.cd = 1.6;
    }
    return;
  }

  const reach = 0.55 + m.size * 0.5;
  if (dist <= reach) {
    // melee attack
    if (m.cd <= 0) { game.monsterAttack(m); m.cd = 1.0 / (m.speed * 0.5); }
    return;
  }
  // move toward player (step along a short path; recompute occasionally)
  moveTowardTile(m, px, py, dt, game);
}

function moveTowardTile(m, tx, ty, dt, game) {
  const level = game.level;
  const gx = Math.round(m.x), gy = Math.round(m.y);
  const tgx = Math.round(tx), tgy = Math.round(ty);
  m.repath = (m.repath || 0) - dt;
  if (!m.path || m.repath <= 0 || m.pathI >= (m.path ? m.path.length : 0)) {
    m.path = findPath(level, { x: gx, y: gy }, { x: tgx, y: tgy }, { adjacentOk: true });
    m.pathI = 1; m.repath = 0.5 + Math.random() * 0.4;
  }
  let target = null;
  if (m.path && m.pathI < m.path.length) target = m.path[m.pathI];
  if (!target) { // fallback: straight-line nudge
    target = { x: tgx, y: tgy };
  }
  const ddx = target.x - m.x, ddy = target.y - m.y;
  const d = Math.hypot(ddx, ddy) || 1;
  const step = m.speed * dt;
  const nx = m.x + (ddx / d) * step, ny = m.y + (ddy / d) * step;
  if (isWalkable(level, Math.round(nx), Math.round(ny)) || (Math.round(nx) === Math.round(m.x) && Math.round(ny) === Math.round(m.y))) {
    m.x = nx; m.y = ny;
  }
  if (Math.hypot(target.x - m.x, target.y - m.y) < 0.2) m.pathI++;
}

function updateBoss(m, dt, game, dist, dx, dy) {
  m.bossTimer -= dt;
  const reach = 1.4;
  // phase escalates as hp drops
  m.bossPhase = m.hp < m.maxhp * 0.33 ? 2 : m.hp < m.maxhp * 0.66 ? 1 : 0;
  if (m.bossTimer <= 0) {
    // ranged nova: fire a ring of bolts
    const n = 6 + m.bossPhase * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + m.anim * 0.2;
      game.spawnProjectile(m.x, m.y, Math.cos(a), Math.sin(a), { dmgMin: m.dmgMin, dmgMax: m.dmgMax, tohit: m.tohit }, 'monster', 'hellfire');
    }
    m.bossTimer = 3.2 - m.bossPhase * 0.6;
  }
  if (dist <= reach) {
    if (m.cd <= 0) { game.monsterAttack(m); m.cd = 0.9; }
  } else {
    moveTowardTile(m, game.player.x, game.player.y, dt, game);
  }
}

// ---- projectiles -----------------------------------------------------------
export function makeProjectile(x, y, dirx, diry, stat, owner, type) {
  const speed = type === 'arrow' ? 11 : type === 'firebolt' ? 9 : 7;
  const d = Math.hypot(dirx, diry) || 1;
  return { x, y, vx: (dirx / d) * speed, vy: (diry / d) * speed, dmgMin: stat.dmgMin, dmgMax: stat.dmgMax,
    tohit: stat.tohit, owner, type, ttl: 2.2, dead: false, trail: [] };
}
