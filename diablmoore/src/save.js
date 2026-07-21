// save.js — localStorage persistence + serialization. DOM-free serialize/deserialize.
const KEY = 'diablmoore_save_v1';

// serialize the persistent parts of a character
export function serialize(p, meta = {}) {
  return {
    v: 1, cls: p.cls, level: p.level, xp: p.xp, gold: p.gold,
    str: p.str, dex: p.dex, mag: p.mag, vit: p.vit, statPoints: p.statPoints,
    equip: p.equip, inv: p.inv, belt: p.belt,
    hp: p.hp, mp: p.mp, kills: p.kills,
    depthReached: p.depthReached || 0,
    maxDepth: meta.maxDepth || p.depthReached || 0,
    victory: !!meta.victory,
  };
}
export function deserialize(data, p) {
  if (!data) return p;
  Object.assign(p, {
    cls: data.cls, level: data.level, xp: data.xp, gold: data.gold,
    str: data.str, dex: data.dex, mag: data.mag, vit: data.vit, statPoints: data.statPoints || 0,
    equip: data.equip || p.equip, inv: data.inv || [], belt: data.belt || [null, null, null, null],
    hp: data.hp, mp: data.mp, kills: data.kills || 0, depthReached: data.depthReached || 0,
  });
  return p;
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function load() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function clear() { try { localStorage.removeItem(KEY); } catch {} }
export function hasSave() { return !!load(); }
