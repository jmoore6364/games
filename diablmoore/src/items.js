// items.js — item types, rarity, affixes, generation, tooltips.
// DOM-free so it can run under Node for headless tests.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeRng(seed) {
  const r = mulberry32(seed >>> 0);
  return {
    next: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
  };
}

// ---- base item definitions -------------------------------------------------
// slot: where it equips. type groups behaviour.
export const BASES = {
  // weapons
  dagger:  { name: 'Dagger',       type: 'weapon', slot: 'weapon', dmg: [1, 4],  reqStr: 0,  val: 20,  ranged: false, twoH: false, cls: 'any' },
  sword:   { name: 'Short Sword',  type: 'weapon', slot: 'weapon', dmg: [3, 8],  reqStr: 18, val: 60,  ranged: false, twoH: false, cls: 'melee' },
  axe:     { name: 'War Axe',      type: 'weapon', slot: 'weapon', dmg: [5, 12], reqStr: 30, val: 110, ranged: false, twoH: true,  cls: 'melee' },
  mace:    { name: 'Mace',         type: 'weapon', slot: 'weapon', dmg: [4, 10], reqStr: 24, val: 90,  ranged: false, twoH: false, cls: 'melee' },
  bow:     { name: 'Short Bow',    type: 'weapon', slot: 'weapon', dmg: [2, 6],  reqStr: 0,  val: 70,  ranged: true,  twoH: true,  cls: 'ranged' },
  longbow: { name: 'Long Bow',     type: 'weapon', slot: 'weapon', dmg: [4, 9],  reqStr: 0,  val: 130, ranged: true,  twoH: true,  cls: 'ranged' },
  staff:   { name: 'Staff',        type: 'weapon', slot: 'weapon', dmg: [2, 5],  reqStr: 0,  val: 80,  ranged: false, twoH: true,  cls: 'caster', wand: true },
  // armor
  cap:     { name: 'Leather Cap',  type: 'armor',  slot: 'helm',   ac: [2, 4],   reqStr: 0,  val: 25 },
  helm:    { name: 'Skull Helm',   type: 'armor',  slot: 'helm',   ac: [5, 9],   reqStr: 20, val: 70 },
  rags:    { name: 'Robe',         type: 'armor',  slot: 'body',   ac: [2, 5],   reqStr: 0,  val: 30 },
  leather: { name: 'Leather Mail', type: 'armor',  slot: 'body',   ac: [6, 12],  reqStr: 12, val: 80 },
  plate:   { name: 'Plate Mail',   type: 'armor',  slot: 'body',   ac: [14, 24], reqStr: 40, val: 200 },
  buckler: { name: 'Buckler',      type: 'armor',  slot: 'shield', ac: [3, 6],   reqStr: 10, val: 45 },
  kite:    { name: 'Kite Shield',  type: 'armor',  slot: 'shield', ac: [7, 14],  reqStr: 30, val: 120 },
  // jewellery
  ring:    { name: 'Ring',         type: 'ring',   slot: 'ring',   val: 90 },
  amulet:  { name: 'Amulet',       type: 'amulet', slot: 'amulet', val: 140 },
};

// ---- affixes ---------------------------------------------------------------
// stat keys understood by aggregateStats(): dmg, tohit, ac, str, dex, mag, vit, life, mana, resall
export const PREFIXES = [
  { key: 'jagged',   stat: 'dmg',  min: 1, max: 4,  label: (v) => `+${v} damage`,          on: ['weapon'] },
  { key: 'sharp',    stat: 'dmg',  min: 3, max: 9,  label: (v) => `+${v} damage`,          on: ['weapon'] },
  { key: 'vicious',  stat: 'dmg',  min: 6, max: 15, label: (v) => `+${v} damage`,          on: ['weapon'] },
  { key: 'sturdy',   stat: 'ac',   min: 3, max: 8,  label: (v) => `+${v} armor`,           on: ['armor'] },
  { key: 'plated',   stat: 'ac',   min: 8, max: 18, label: (v) => `+${v} armor`,           on: ['armor'] },
  { key: 'strong',   stat: 'str',  min: 2, max: 6,  label: (v) => `+${v} Strength`,        on: ['weapon', 'armor', 'ring', 'amulet'] },
  { key: 'dextrous', stat: 'dex',  min: 2, max: 6,  label: (v) => `+${v} Dexterity`,       on: ['weapon', 'armor', 'ring', 'amulet'] },
  { key: 'arcane',   stat: 'mag',  min: 2, max: 6,  label: (v) => `+${v} Magic`,           on: ['weapon', 'armor', 'ring', 'amulet'] },
  { key: 'hale',     stat: 'vit',  min: 2, max: 6,  label: (v) => `+${v} Vitality`,        on: ['armor', 'ring', 'amulet'] },
];
export const SUFFIXES = [
  { key: 'of precision', stat: 'tohit', min: 5,  max: 20, label: (v) => `+${v}% to hit`,        on: ['weapon', 'ring', 'amulet'] },
  { key: 'of the fox',   stat: 'dex',   min: 3,  max: 8,  label: (v) => `+${v} Dexterity`,      on: ['weapon', 'armor', 'ring', 'amulet'] },
  { key: 'of vigor',     stat: 'life',  min: 8,  max: 25, label: (v) => `+${v} life`,           on: ['armor', 'ring', 'amulet'] },
  { key: 'of the mind',  stat: 'mana',  min: 8,  max: 25, label: (v) => `+${v} mana`,           on: ['weapon', 'armor', 'ring', 'amulet'] },
  { key: 'of warding',   stat: 'resall',min: 5,  max: 20, label: (v) => `+${v}% resist`,        on: ['armor', 'ring', 'amulet'] },
  { key: 'of the bear',  stat: 'str',   min: 3,  max: 8,  label: (v) => `+${v} Strength`,       on: ['weapon', 'armor', 'ring', 'amulet'] },
  { key: 'of giants',    stat: 'life',  min: 20, max: 45, label: (v) => `+${v} life`,           on: ['armor', 'amulet'] },
];

export const RARITY_COLOR = { common: '#d8d8d8', magic: '#6f8fff', rare: '#ffcf3a', unique: '#c76b2a' };

// Intended rarity distribution (documented + asserted in tests):
//   common ~62%, magic ~30%, rare ~8%  (rare drifts up ~+0.3%/ilvl)
export function rollRarity(rng, ilvl = 1) {
  const rareChance = Math.min(0.22, 0.08 + ilvl * 0.003);
  const magicChance = 0.30;
  const r = rng.next();
  if (r < rareChance) return 'rare';
  if (r < rareChance + magicChance) return 'magic';
  return 'common';
}

let _uid = 1;
export function itemUID() { return _uid++; }

function affixFits(a, type) { return a.on.includes(type); }

export function generateItem(ilvl, rng, opts = {}) {
  ilvl = Math.max(1, ilvl | 0);
  // choose base
  let baseKeys = Object.keys(BASES);
  if (opts.baseKey) baseKeys = [opts.baseKey];
  const key = opts.baseKey || rng.pick(baseKeys);
  const B = BASES[key];
  const rarity = opts.rarity || rollRarity(rng, ilvl);
  const item = {
    uid: itemUID(), base: key, name: B.name, type: B.type, slot: B.slot,
    rarity, ilvl, identified: rarity === 'common', affixes: [],
    ranged: !!B.ranged, twoH: !!B.twoH, wand: !!B.wand, reqStr: B.reqStr || 0,
    cls: B.cls || 'any',
  };
  // base rolls scale slightly with ilvl
  if (B.dmg) {
    const bonus = Math.floor(ilvl / 3);
    item.dmgMin = B.dmg[0] + bonus;
    item.dmgMax = B.dmg[1] + bonus + rng.int(0, 2);
  }
  if (B.ac) {
    const bonus = Math.floor(ilvl / 2);
    item.ac = rng.int(B.ac[0], B.ac[1]) + bonus;
  }
  item.value = B.val;

  const nAffix = rarity === 'common' ? 0 : rarity === 'magic' ? rng.int(1, 2) : rng.int(3, 5);
  const pool = { pre: PREFIXES.filter((a) => affixFits(a, item.type)), suf: SUFFIXES.filter((a) => affixFits(a, item.type)) };
  const usedStats = new Set();
  let usedPre = false, usedSuf = false;
  for (let i = 0; i < nAffix; i++) {
    // alternate prefix/suffix, magic caps at 1 each
    let list, isPre;
    if (rarity === 'magic') {
      if (!usedPre && (usedSuf || rng.chance(0.5))) { list = pool.pre; isPre = true; }
      else { list = pool.suf; isPre = false; }
    } else {
      isPre = rng.chance(0.5); list = isPre ? pool.pre : pool.suf;
    }
    const candidates = list.filter((a) => !usedStats.has(a.stat) || rarity === 'rare');
    if (!candidates.length) continue;
    const a = rng.pick(candidates);
    const value = rng.int(a.min, a.max);
    item.affixes.push({ key: a.key, stat: a.stat, value, isPre, label: a.label(value) });
    usedStats.add(a.stat);
    if (isPre) usedPre = true; else usedSuf = true;
    item.value += value * 12;
  }
  buildName(item);
  return item;
}

export function buildName(item) {
  const B = BASES[item.base];
  let name = B.name;
  if (item.rarity !== 'common' && item.affixes.length) {
    const pre = item.affixes.find((a) => a.isPre);
    const suf = item.affixes.find((a) => !a.isPre);
    if (pre) name = cap(pre.key) + ' ' + name;
    if (suf) name = name + ' ' + suf.key;
  }
  item.name = name;
  return name;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function makePotion(kind) {
  const amt = kind === 'health' ? 45 : 35;
  return { uid: itemUID(), base: 'potion', name: kind === 'health' ? 'Healing Potion' : 'Mana Potion',
    type: 'potion', slot: 'belt', rarity: 'common', identified: true, potion: { kind, amount: amt },
    value: kind === 'health' ? 30 : 30, affixes: [] };
}

// display name honours identification
export function displayName(item) {
  if (!item) return '';
  if (item.type === 'potion') return item.name;
  if (!item.identified && item.rarity !== 'common') return 'Unidentified ' + BASES[item.base].name;
  return item.name;
}

// aggregate equipment bonuses into a stat delta object
export function aggregateStats(equip) {
  const s = { dmg: 0, tohit: 0, ac: 0, str: 0, dex: 0, mag: 0, vit: 0, life: 0, mana: 0, resall: 0, dmgMin: 0, dmgMax: 0 };
  for (const slot in equip) {
    const it = equip[slot];
    if (!it) continue;
    if (it.dmgMin != null) { s.dmgMin += it.dmgMin; s.dmgMax += it.dmgMax; }
    if (it.ac != null) s.ac += it.ac;
    if (!it.identified) continue; // unidentified items give no affix bonuses
    for (const a of it.affixes) if (s[a.stat] != null) s[a.stat] += a.value;
  }
  return s;
}

export function sellValue(item) {
  let v = item.value || 10;
  if (!item.identified && item.rarity !== 'common') v = Math.floor(v * 0.4);
  return Math.max(1, Math.floor(v * 0.35));
}

export function tooltipLines(item) {
  const lines = [];
  const name = displayName(item);
  lines.push({ t: name, c: RARITY_COLOR[item.rarity] || '#fff', head: true });
  if (item.type === 'potion') { lines.push({ t: item.potion.kind === 'health' ? `Restores ${item.potion.amount} life` : `Restores ${item.potion.amount} mana`, c: '#bcd' }); return lines; }
  const B = BASES[item.base];
  if (item.dmgMin != null) lines.push({ t: `Damage: ${item.dmgMin} - ${item.dmgMax}${item.ranged ? '  (ranged)' : ''}`, c: '#cdd' });
  if (item.ac != null) lines.push({ t: `Armor: ${item.ac}`, c: '#cdd' });
  if (B.reqStr) lines.push({ t: `Requires ${B.reqStr} Str`, c: '#a99' });
  if (!item.identified && item.rarity !== 'common') { lines.push({ t: 'Unidentified', c: '#a67' }); }
  else for (const a of item.affixes) lines.push({ t: a.label, c: '#6f8fff' });
  return lines;
}
