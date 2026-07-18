// Shining Moore — unit classes, growths, weapons, spells, XP/levels.
// Headless module: no DOM, usable from Node for the autoplayer suite.

export const SPELLS = {
  blaze1: { name: 'BLAZE 1', mp: 2, rng: 2, aoe: 0, pow: 8, kind: 'dmg' },
  blaze2: { name: 'BLAZE 2', mp: 5, rng: 2, aoe: 1, pow: 12, kind: 'dmg' },
  blaze3: { name: 'BLAZE 3', mp: 8, rng: 3, aoe: 1, pow: 19, kind: 'dmg' },
  heal1: { name: 'HEAL 1', mp: 3, rng: 1, aoe: 0, pow: 10, kind: 'heal' },
  heal2: { name: 'HEAL 2', mp: 5, rng: 3, aoe: 0, pow: 18, kind: 'heal' },
  heal3: { name: 'HEAL 3', mp: 8, rng: 3, aoe: 0, pow: 34, kind: 'heal' },
  aura1: { name: 'AURA 1', mp: 7, rng: 0, aoe: 2, pow: 9, kind: 'heal' },
  egress: { name: 'EGRESS', mp: 4, rng: 0, aoe: 0, pow: 0, kind: 'egress' },
  breath: { name: 'DARK BREATH', mp: 0, rng: 3, aoe: 1, pow: 15, kind: 'dmg' },
};

// Weapon tiers per weapon family. Shops unlock higher tiers as the story advances.
export const WEAPONS = {
  sword1: { name: 'SHORT SWORD', fam: 'sword', atk: 4, rng: [1, 1], cost: 0 },
  sword2: { name: 'MIDDLE SWORD', fam: 'sword', atk: 8, rng: [1, 1], cost: 120 },
  sword3: { name: 'STEEL SWORD', fam: 'sword', atk: 13, rng: [1, 1], cost: 320 },
  sword4: { name: 'SWORD OF LIGHT', fam: 'sword', atk: 19, rng: [1, 1], cost: 700 },
  lance1: { name: 'WOOD LANCE', fam: 'lance', atk: 5, rng: [1, 1], cost: 0 },
  lance2: { name: 'BRONZE LANCE', fam: 'lance', atk: 9, rng: [1, 1], cost: 130 },
  lance3: { name: 'STEEL LANCE', fam: 'lance', atk: 14, rng: [1, 1], cost: 340 },
  lance4: { name: 'CHROME LANCE', fam: 'lance', atk: 20, rng: [1, 1], cost: 720 },
  bow1: { name: 'SHORT BOW', fam: 'bow', atk: 5, rng: [2, 3], cost: 0 },
  bow2: { name: 'LONG BOW', fam: 'bow', atk: 9, rng: [2, 3], cost: 130 },
  bow3: { name: 'STEEL ARROW', fam: 'bow', atk: 14, rng: [2, 3], cost: 340 },
  bow4: { name: 'ELVEN ARROW', fam: 'bow', atk: 19, rng: [2, 3], cost: 700 },
  axe1: { name: 'HAND AXE', fam: 'axe', atk: 6, rng: [1, 1], cost: 0 },
  axe2: { name: 'BATTLE AXE', fam: 'axe', atk: 10, rng: [1, 1], cost: 140 },
  axe3: { name: 'BROAD AXE', fam: 'axe', atk: 15, rng: [1, 1], cost: 360 },
  axe4: { name: 'GREAT AXE', fam: 'axe', atk: 21, rng: [1, 1], cost: 740 },
  rod1: { name: 'WOOD ROD', fam: 'rod', atk: 2, rng: [1, 1], cost: 0 },
  rod2: { name: 'BRONZE ROD', fam: 'rod', atk: 5, rng: [1, 1], cost: 90 },
  rod3: { name: 'FLAIL', fam: 'rod', atk: 9, rng: [1, 1], cost: 260 },
  rod4: { name: 'HOLY STAFF', fam: 'rod', atk: 13, rng: [1, 1], cost: 560 },
  spear1: { name: 'WING SPEAR', fam: 'spear', atk: 4, rng: [1, 1], cost: 0 },
  spear2: { name: 'SKY LANCE', fam: 'spear', atk: 8, rng: [1, 1], cost: 130 },
  spear3: { name: 'STORM PIKE', fam: 'spear', atk: 13, rng: [1, 1], cost: 340 },
  spear4: { name: 'GALE HALBERD', fam: 'spear', atk: 19, rng: [1, 1], cost: 720 },
  claw1: { name: 'IRON CLAW', fam: 'claw', atk: 3, rng: [1, 1], cost: 0 },
  claw2: { name: 'STEEL CLAW', fam: 'claw', atk: 7, rng: [1, 1], cost: 110 },
  claw3: { name: 'MOON FANG', fam: 'claw', atk: 12, rng: [1, 1], cost: 300 },
  claw4: { name: 'GHOUL TALON', fam: 'claw', atk: 18, rng: [1, 1], cost: 640 },
};

export const ITEMS = {
  herb: { name: 'MEDICAL HERB', heal: 14, cost: 12 },
  potion: { name: 'HEALING DROP', heal: 40, cost: 40 },
};

// Spell learn schedule: [spellId, level].
export const CLASSES = {
  hero: {
    cls: 'SDMN', pro: 'HERO', moveType: 'foot', mov: 5, fam: 'sword', crit: 6,
    base: { hp: 15, mp: 8, atk: 6, def: 5, agi: 6 },
    growth: { hp: [2, 4], mp: [0, 2], atk: [1, 3], def: [1, 2], agi: [1, 2] },
    spells: [['egress', 1]],
  },
  knight: {
    cls: 'KNTE', pro: 'PLDN', moveType: 'horse', mov: 7, fam: 'lance', crit: 4,
    base: { hp: 14, mp: 0, atk: 7, def: 6, agi: 4 },
    growth: { hp: [2, 4], mp: [0, 0], atk: [1, 3], def: [1, 2], agi: [0, 2] },
    spells: [],
  },
  archer: {
    cls: 'ACHR', pro: 'SNIP', moveType: 'foot', mov: 5, fam: 'bow', crit: 6,
    base: { hp: 12, mp: 0, atk: 5, def: 4, agi: 5 },
    growth: { hp: [2, 3], mp: [0, 0], atk: [1, 3], def: [1, 2], agi: [1, 2] },
    spells: [],
  },
  mage: {
    cls: 'MAGE', pro: 'WIZD', moveType: 'foot', mov: 4, fam: 'rod', crit: 3,
    base: { hp: 9, mp: 10, atk: 2, def: 3, agi: 4 },
    growth: { hp: [1, 3], mp: [2, 3], atk: [0, 2], def: [0, 2], agi: [1, 2] },
    spells: [['blaze1', 1], ['blaze2', 7], ['blaze3', 13]],
  },
  healer: {
    cls: 'HEAL', pro: 'VICR', moveType: 'foot', mov: 5, fam: 'rod', crit: 3,
    base: { hp: 10, mp: 12, atk: 3, def: 3, agi: 5 },
    growth: { hp: [1, 3], mp: [2, 3], atk: [0, 2], def: [1, 2], agi: [1, 2] },
    spells: [['heal1', 1], ['heal2', 6], ['aura1', 10], ['heal3', 14]],
  },
  warrior: {
    cls: 'WARR', pro: 'GLDT', moveType: 'foot', mov: 4, fam: 'axe', crit: 5,
    base: { hp: 18, mp: 0, atk: 8, def: 7, agi: 3 },
    growth: { hp: [3, 5], mp: [0, 0], atk: [1, 3], def: [1, 3], agi: [0, 1] },
    spells: [],
  },
  birdman: {
    cls: 'BDMN', pro: 'SKYW', moveType: 'fly', mov: 6, fam: 'spear', crit: 6,
    base: { hp: 11, mp: 0, atk: 6, def: 3, agi: 7 },
    growth: { hp: [2, 3], mp: [0, 0], atk: [1, 3], def: [0, 2], agi: [1, 2] },
    spells: [],
  },
  wolf: {
    cls: 'WOLF', pro: 'WFBR', moveType: 'foot', mov: 6, fam: 'claw', crit: 18,
    base: { hp: 13, mp: 0, atk: 7, def: 4, agi: 8 },
    growth: { hp: [2, 4], mp: [0, 0], atk: [1, 3], def: [1, 2], agi: [1, 3] },
    spells: [],
  },
};

// The force of Mooregard. joinAfter: battle index after which the unit joins (-1 = start).
export const FORCE = [
  { id: 'moore', name: 'MOORE', klass: 'hero', weapon: 'sword1', joinAfter: -1, face: 'moore' },
  { id: 'gart', name: 'GART', klass: 'warrior', weapon: 'axe1', joinAfter: -1, face: 'gart' },
  { id: 'mira', name: 'MIRA', klass: 'healer', weapon: 'rod1', joinAfter: -1, face: 'mira' },
  { id: 'kael', name: 'KAEL', klass: 'knight', weapon: 'lance1', joinAfter: -1, face: 'kael' },
  { id: 'pip', name: 'PIP', klass: 'archer', weapon: 'bow1', joinAfter: 0, face: 'pip' },
  { id: 'zin', name: 'ZIN', klass: 'mage', weapon: 'rod1', joinAfter: 1, face: 'zin' },
  { id: 'sly', name: 'SLY', klass: 'wolf', weapon: 'claw1', joinAfter: 2, face: 'sly' },
  { id: 'aer', name: 'AER', klass: 'birdman', weapon: 'spear1', joinAfter: 3, face: 'aer' },
];

// ---- enemy bestiary: base stats at level 1 plus per-level gains ----
export const ENEMIES = {
  gob: { name: 'GOBLIN', spr: 'gob', moveType: 'foot', mov: 5, rng: [1, 1], ai: 'nearest', crit: 3,
    base: { hp: 9, atk: 8, def: 2, agi: 3 }, per: { hp: 2.2, atk: 1.1, def: 0.6, agi: 0.5 } },
  orc: { name: 'ORC BRUTE', spr: 'orc', moveType: 'foot', mov: 4, rng: [1, 1], ai: 'weakest', crit: 4,
    base: { hp: 13, atk: 10, def: 4, agi: 2 }, per: { hp: 3, atk: 1.3, def: 0.8, agi: 0.3 } },
  earc: { name: 'DK ARCHER', spr: 'earc', moveType: 'foot', mov: 5, rng: [2, 3], ai: 'hunter', crit: 5,
    base: { hp: 9, atk: 8, def: 2, agi: 4 }, per: { hp: 2, atk: 1.2, def: 0.5, agi: 0.6 } },
  dmag: { name: 'DK MAGE', spr: 'dmag', moveType: 'foot', mov: 4, rng: [1, 1], ai: 'hunter', crit: 3,
    base: { hp: 8, atk: 4, def: 2, agi: 4 }, per: { hp: 1.8, atk: 0.6, def: 0.5, agi: 0.5 },
    spell: 'blaze1', mp: 99 },
  dpri: { name: 'DK PRIEST', spr: 'dpri', moveType: 'foot', mov: 4, rng: [1, 1], ai: 'nearest', crit: 3,
    base: { hp: 9, atk: 4, def: 3, agi: 4 }, per: { hp: 2, atk: 0.6, def: 0.6, agi: 0.5 },
    spell: 'heal2', mp: 99 },
  wolfE: { name: 'DIRE WOLF', spr: 'wolfE', moveType: 'foot', mov: 7, rng: [1, 1], ai: 'weakest', crit: 10,
    base: { hp: 10, atk: 9, def: 2, agi: 7 }, per: { hp: 2.2, atk: 1.1, def: 0.5, agi: 0.7 } },
  harp: { name: 'HARPY', spr: 'harp', moveType: 'fly', mov: 6, rng: [1, 1], ai: 'hunter', crit: 6,
    base: { hp: 10, atk: 9, def: 3, agi: 6 }, per: { hp: 2.2, atk: 1.1, def: 0.5, agi: 0.6 } },
  eknt: { name: 'DK KNIGHT', spr: 'eknt', moveType: 'horse', mov: 7, rng: [1, 1], ai: 'nearest', crit: 5,
    base: { hp: 15, atk: 11, def: 6, agi: 4 }, per: { hp: 3, atk: 1.3, def: 0.8, agi: 0.5 } },
  garg: { name: 'GARGOYLE', spr: 'garg', moveType: 'fly', mov: 5, rng: [1, 1], ai: 'nearest', crit: 4,
    base: { hp: 13, atk: 10, def: 6, agi: 4 }, per: { hp: 2.6, atk: 1.2, def: 0.8, agi: 0.4 } },
  zomb: { name: 'ZOMBIE', spr: 'zomb', moveType: 'foot', mov: 3, rng: [1, 1], ai: 'nearest', crit: 2,
    base: { hp: 16, atk: 10, def: 3, agi: 1 }, per: { hp: 3.2, atk: 1.2, def: 0.6, agi: 0.2 } },
  vex: { name: 'LD VEXMOORE', spr: 'vex', moveType: 'foot', mov: 5, rng: [1, 1], ai: 'weakest', crit: 8,
    base: { hp: 34, atk: 13, def: 8, agi: 6 }, per: { hp: 3.4, atk: 1.2, def: 0.7, agi: 0.5 },
    spell: 'blaze2', mp: 99, boss: true },
  drag: { name: 'DK MOORE DRAGON', spr: 'drag', moveType: 'fly', mov: 3, rng: [1, 2], ai: 'weakest', crit: 8,
    base: { hp: 96, atk: 17, def: 11, agi: 5 }, per: { hp: 4, atk: 1.1, def: 0.6, agi: 0.4 },
    spell: 'breath', mp: 99, boss: true, big: true, twoActions: true },
};

export const PROMO_LEVEL = 10;

// ---------------- helpers ----------------

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const roll = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));

export function makeUnit(def, level = 1, rng = Math.random) {
  const k = CLASSES[def.klass];
  const u = {
    id: def.id, name: def.name, klass: def.klass, cls: k.cls, face: def.face,
    side: 'player', level: 1, xp: 0, promoted: false,
    moveType: k.moveType, mov: k.mov, crit: k.crit,
    maxhp: k.base.hp, maxmp: k.base.mp, atk: k.base.atk, def: k.base.def, agi: k.base.agi,
    weapon: def.weapon, spells: [], kills: 0, down: false,
  };
  for (let l = 2; l <= level; l++) applyLevel(u, rng);
  u.level = level;
  learnSpells(u);
  u.hp = u.maxhp; u.mp = u.maxmp;
  return u;
}

function applyLevel(u, rng) {
  const g = CLASSES[u.klass].growth;
  const gains = {
    hp: roll(rng, g.hp), mp: roll(rng, g.mp), atk: roll(rng, g.atk),
    def: roll(rng, g.def), agi: roll(rng, g.agi),
  };
  u.maxhp += gains.hp; u.maxmp += gains.mp;
  u.atk += gains.atk; u.def += gains.def; u.agi += gains.agi;
  return gains;
}

export function learnSpells(u) {
  const learned = [];
  for (const [sp, lv] of CLASSES[u.klass].spells) {
    if (u.level >= lv && !u.spells.includes(sp)) { u.spells.push(sp); learned.push(sp); }
  }
  return learned;
}

// Grant XP; returns array of {level, gains, learned} for each level gained.
export function grantXp(u, amount, rng = Math.random) {
  const ups = [];
  u.xp += amount;
  while (u.xp >= 100) {
    u.xp -= 100;
    u.level++;
    const gains = applyLevel(u, rng);
    u.hp = Math.min(u.maxhp, u.hp + gains.hp);
    u.mp = Math.min(u.maxmp, u.mp + gains.mp);
    const learned = learnSpells(u);
    ups.push({ level: u.level, gains, learned });
  }
  return ups;
}

export function promote(u) {
  u.promoted = true;
  u.cls = CLASSES[u.klass].pro;
  u.mov += 1;
  u.maxhp += 4; u.maxmp += (u.maxmp > 0 ? 4 : 0);
  u.atk += 3; u.def += 3; u.agi += 2;
  u.hp = u.maxhp; u.mp = u.maxmp;
  learnSpells(u);
}

export function makeEnemy(spec, idx, diff = 1, rng = Math.random) {
  const t = ENEMIES[spec.t];
  const lv = spec.lv || 1;
  const st = (k) => Math.round((t.base[k] + t.per[k] * (lv - 1)) * (k === 'hp' || k === 'atk' ? diff : 1));
  const u = {
    id: 'e' + idx, name: t.name, type: spec.t, spr: t.spr, side: 'enemy',
    level: lv, moveType: t.moveType, mov: t.mov, rng: t.rng, ai: spec.ai || t.ai, crit: t.crit,
    maxhp: st('hp'), atk: st('atk'), def: st('def'), agi: st('agi'),
    maxmp: t.mp || 0, spell: t.spell || null,
    x: spec.x, y: spec.y, aggro: spec.aggro ?? 4, awake: spec.aggro === 99,
    boss: !!t.boss, big: !!t.big, twoActions: !!t.twoActions, noMove: !!spec.noMove,
    down: false,
  };
  u.hp = u.maxhp; u.mp = u.maxmp;
  return u;
}

// Effective attack power (unit atk + weapon).
export function atkOf(u) {
  return u.atk + (u.weapon ? WEAPONS[u.weapon].atk : 0);
}
export function rangeOf(u) {
  return u.side === 'enemy' ? u.rng : WEAPONS[u.weapon].rng;
}

// XP for dealing dmg to / killing a target, scaled down when overleveled.
export function xpForHit(u, target, dmg, kill) {
  const tl = target.level || 1;
  let xp = kill ? 34 + tl * 7 : Math.min(30, 6 + Math.floor(dmg * 2));
  const over = u.level - tl - 2;
  if (over > 0) xp = Math.max(1, Math.floor(xp / (1 + over * 0.5)));
  return Math.min(95, xp);
}

export function xpForHeal(u, amount) {
  return Math.min(24, 10 + Math.floor(amount / 2));
}
