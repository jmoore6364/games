// Shining Moore — grid tactics engine. Fully headless (no DOM/canvas):
// the renderer in main.js consumes this.events; the Node autoplayer drives it directly.

import {
  SPELLS, WEAPONS, ITEMS, makeEnemy, atkOf, rangeOf, xpForHit, xpForHeal, grantXp,
} from './units.js';

// Terrain: [moveCost(foot), defBonus, name]. Horse/fly modify costs below.
export const TERRAIN = {
  '.': { cost: 1, def: 0, name: 'PLAINS', pass: true },
  'r': { cost: 0.7, def: 0, name: 'ROAD', pass: true },
  '=': { cost: 0.7, def: 0, name: 'BRIDGE', pass: true },
  'f': { cost: 2, def: 2, name: 'FOREST', pass: true },
  'h': { cost: 2, def: 3, name: 'HILLS', pass: true },
  'w': { cost: 1, def: 0, name: 'WATER', pass: false },
  '#': { cost: 1, def: 0, name: 'WALL', pass: false, solid: true },
  'T': { cost: 1, def: 3, name: 'THRONE', pass: true },
  'G': { cost: 0.7, def: 1, name: 'GATE', pass: true },
  's': { cost: 1, def: 0, name: 'SAND', pass: true },
  'F': { cost: 1, def: 0, name: 'FLOOR', pass: true },
  'c': { cost: 1, def: 1, name: 'CHURCH', pass: true },
};

export function terrainAt(map, x, y) {
  if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return TERRAIN['#'];
  return TERRAIN[map[y][x]] || TERRAIN['.'];
}

export function moveCost(map, x, y, moveType) {
  const t = terrainAt(map, x, y);
  if (t.solid) return Infinity;
  if (moveType === 'fly') return t.pass || t.name === 'WATER' ? 1 : Infinity;
  if (!t.pass) return Infinity;
  if (moveType === 'horse') {
    if (t.name === 'FOREST') return 4;
    if (t.name === 'HILLS') return 3;
  }
  return t.cost;
}

export function terrainDef(map, u) {
  if (u.moveType === 'fly') return 0; // flyers hover above land effects
  return terrainAt(map, u.x, u.y).def;
}

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export class Battle {
  // def: battle definition from campaign.js; force: array of player units (mutated: xp persists)
  constructor(def, force, opts = {}) {
    this.def = def;
    this.map = def.map;
    this.w = def.map[0].length;
    this.h = def.map.length;
    this.rng = opts.rng || Math.random;
    this.diff = opts.diff || 1;
    this.events = [];
    this.turnCount = 0;
    this.result = null; // 'victory' | 'defeat' | 'egress'
    this.goldEarned = 0;

    this.units = [];
    force.forEach((u, i) => {
      const p = def.deploy[i] || def.deploy[def.deploy.length - 1];
      u.x = p[0]; u.y = p[1];
      u.hp = u.maxhp; u.mp = u.maxmp;
      u.down = false;
      this.units.push(u);
    });
    def.enemies.forEach((spec, i) => {
      this.units.push(makeEnemy(spec, i, this.diff, this.rng));
    });

    this.round = 0;
    this.queue = [];
    this.qi = 0;
    this.nextRound();
  }

  alive(side) { return this.units.filter((u) => !u.down && (!side || u.side === side)); }
  at(x, y) { return this.units.find((u) => !u.down && u.x === x && u.y === y) || null; }

  nextRound() {
    this.round++;
    const order = this.alive().slice().sort((a, b) => (b.agi + this.rng()) - (a.agi + this.rng()));
    this.queue = [];
    for (const u of order) {
      this.queue.push(u.id);
      if (u.twoActions) this.queue.push(u.id);
    }
    this.qi = 0;
    this.events.push({ t: 'round', n: this.round });
  }

  current() {
    while (this.qi < this.queue.length) {
      const u = this.units.find((x) => x.id === this.queue[this.qi]);
      if (u && !u.down) return u;
      this.qi++;
    }
    return null;
  }

  // Portrait strip: upcoming actors (current first).
  upcoming(n = 8) {
    const out = [];
    for (let i = this.qi; i < this.queue.length && out.length < n; i++) {
      const u = this.units.find((x) => x.id === this.queue[i]);
      if (u && !u.down) out.push(u);
    }
    return out;
  }

  endTurn() {
    this.checkEnd();
    if (this.result) return;
    this.qi++;
    this.turnCount++;
    if (!this.current()) this.nextRound();
  }

  // ---------- movement (uniform-cost search over terrain costs) ----------
  reachable(u) {
    const best = new Map();
    const key = (x, y) => x + y * this.w;
    best.set(key(u.x, u.y), 0);
    const open = [{ x: u.x, y: u.y, c: 0 }];
    while (open.length) {
      open.sort((a, b) => a.c - b.c);
      const cur = open.shift();
      if (cur.c > best.get(key(cur.x, cur.y))) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        const occ = this.at(nx, ny);
        if (occ && occ.side !== u.side) continue; // enemies block; allies can be passed
        const c = cur.c + moveCost(this.map, nx, ny, u.moveType);
        if (c > u.mov + 1e-9) continue;
        const k = key(nx, ny);
        if (best.has(k) && best.get(k) <= c) continue;
        best.set(k, c);
        open.push({ x: nx, y: ny, c });
      }
    }
    // cannot END on an occupied tile (other than own)
    const tiles = new Map();
    for (const [k, c] of best) {
      const x = k % this.w, y = (k / this.w) | 0;
      const occ = this.at(x, y);
      if (occ && occ !== u) continue;
      tiles.set(k, { x, y, c });
    }
    return tiles;
  }

  // Path for the walk animation: greedy backtrack through the cost field.
  path(u, tiles, tx, ty) {
    const key = (x, y) => x + y * this.w;
    // rebuild full cost field (tiles excludes occupied stopovers)
    const field = new Map();
    field.set(key(u.x, u.y), 0);
    const open = [{ x: u.x, y: u.y, c: 0 }];
    while (open.length) {
      open.sort((a, b) => a.c - b.c);
      const cur = open.shift();
      if (cur.c > field.get(key(cur.x, cur.y))) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        const occ = this.at(nx, ny);
        if (occ && occ.side !== u.side) continue;
        const c = cur.c + moveCost(this.map, nx, ny, u.moveType);
        if (c > u.mov + 1e-9) continue;
        const k = key(nx, ny);
        if (field.has(k) && field.get(k) <= c) continue;
        field.set(k, c);
        open.push({ x: nx, y: ny, c });
      }
    }
    const p = [{ x: tx, y: ty }];
    let cx = tx, cy = ty;
    let guard = 200;
    while ((cx !== u.x || cy !== u.y) && guard-- > 0) {
      let best = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        const k = key(nx, ny);
        if (!field.has(k)) continue;
        const need = field.get(k) + moveCost(this.map, cx, cy, u.moveType);
        if (Math.abs(need - field.get(key(cx, cy))) < 1e-6) {
          if (!best || field.get(k) < best.c) best = { x: nx, y: ny, c: field.get(k) };
        }
      }
      if (!best) break;
      p.unshift({ x: best.x, y: best.y });
      cx = best.x; cy = best.y;
    }
    return p;
  }

  doMove(u, x, y) {
    if (u.x === x && u.y === y) return;
    const tiles = this.reachable(u);
    const t = tiles.get(x + y * this.w);
    if (!t) return;
    const p = this.path(u, tiles, x, y);
    u.x = x; u.y = y;
    this.events.push({ t: 'move', id: u.id, path: p });
  }

  // ---------- targeting ----------
  inRange(u, target, rng) {
    const [lo, hi] = rng || rangeOf(u);
    const d = manhattan(u, target);
    return d >= lo && d <= hi;
  }

  targetsFor(u) {
    const foes = this.alive(u.side === 'player' ? 'enemy' : 'player');
    return foes.filter((f) => this.inRange(u, f));
  }

  aoeTiles(cx, cy, radius) {
    const out = [];
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (Math.abs(x - cx) + Math.abs(y - cy) <= radius) out.push({ x, y });
      }
    }
    return out;
  }

  // ---------- combat ----------
  hitChance(a, d) {
    let hc = 90 + (a.agi - d.agi) * 3;
    if (d.moveType === 'fly' && a.side) hc -= 5;
    return Math.max(55, Math.min(99, hc));
  }

  physDamage(a, d) {
    const base = atkOf(a) - (d.def + terrainDef(this.map, d));
    const v = Math.floor(this.rng() * 3);
    return Math.max(1, base + v);
  }

  // One attack (with counter). Emits a 'combat' event for the cut-in.
  actAttack(u, target) {
    const rounds = [];
    const strike = (a, d, counter) => {
      const r = { by: a.id, vs: d.id, counter, miss: false, crit: false, dmg: 0, hpAfter: d.hp, kill: false };
      if (this.rng() * 100 >= this.hitChance(a, d)) {
        r.miss = true;
      } else {
        let dmg = this.physDamage(a, d);
        if (this.rng() * 100 < a.crit) { r.crit = true; dmg = Math.floor(dmg * 1.8) + 1; }
        if (counter) dmg = Math.max(1, Math.floor(dmg * 0.6));
        d.hp = Math.max(0, d.hp - dmg);
        r.dmg = dmg; r.hpAfter = d.hp;
        if (d.hp === 0) { r.kill = true; this.killUnit(d); }
      }
      rounds.push(r);
      return r;
    };

    const r1 = strike(u, target, false);
    // counter if defender survives and attacker stands in defender's weapon range
    if (!target.down && this.inRange(target, u)) {
      strike(target, u, true);
    }

    const ev = { t: 'combat', a: u.id, d: target.id, rounds, xp: 0, levelUps: [], goldDrop: 0 };
    if (u.side === 'player') {
      const xp = r1.miss ? 1 : xpForHit(u, target, r1.dmg, r1.kill);
      ev.xp = xp;
      ev.levelUps = grantXp(u, xp, this.rng);
      if (r1.kill) { u.kills++; ev.goldDrop = 5 + (target.level || 1) * 3; this.goldEarned += ev.goldDrop; }
    } else {
      // counter XP for the player defender
      const rc = rounds.find((r) => r.counter);
      if (rc && !target.down && target.side === 'player' && !rc.miss) {
        ev.xp = xpForHit(target, u, rc.dmg, rc.kill);
        ev.levelUps = grantXp(target, ev.xp, this.rng);
        ev.xpTo = target.id;
        if (rc.kill) { target.kills++; ev.goldDrop = 5 + (u.level || 1) * 3; this.goldEarned += ev.goldDrop; }
      }
    }
    this.events.push(ev);
    this.checkEnd();
    if (!this.result) this.endTurn();
    return ev;
  }

  spellDamage(sp, caster, d) {
    const v = Math.floor(this.rng() * 4);
    const dmg = sp.pow + v + Math.floor((caster.level || 1) / 3) - Math.floor((d.def + terrainDef(this.map, d)) / 4);
    return Math.max(2, dmg);
  }

  actSpell(u, spellId, tx, ty) {
    const sp = SPELLS[spellId];
    if (!sp || u.mp < sp.mp) return null;
    u.mp -= sp.mp;
    if (sp.kind === 'egress') {
      this.events.push({ t: 'egress', id: u.id });
      this.result = 'egress';
      return { t: 'egress' };
    }
    const center = sp.rng === 0 ? { x: u.x, y: u.y } : { x: tx, y: ty };
    const tiles = this.aoeTiles(center.x, center.y, sp.aoe);
    const results = [];
    let totalXp = 0;
    for (const t of tiles) {
      const v = this.at(t.x, t.y);
      if (!v) continue;
      if (sp.kind === 'dmg' && v.side !== u.side) {
        const dmg = this.spellDamage(sp, u, v);
        v.hp = Math.max(0, v.hp - dmg);
        const kill = v.hp === 0;
        if (kill) this.killUnit(v);
        results.push({ id: v.id, dmg, hpAfter: v.hp, kill });
        if (u.side === 'player') {
          totalXp += xpForHit(u, v, dmg, kill);
          if (kill) { u.kills++; const g = 5 + (v.level || 1) * 3; this.goldEarned += g; }
        }
      } else if (sp.kind === 'heal' && v.side === u.side && v.hp < v.maxhp) {
        const amt = Math.min(v.maxhp - v.hp, sp.pow + Math.floor(this.rng() * 4));
        v.hp += amt;
        results.push({ id: v.id, heal: amt, hpAfter: v.hp });
        if (u.side === 'player') totalXp += xpForHeal(u, amt);
      }
    }
    if (sp.kind === 'heal' && results.length === 0 && u.side === 'player') totalXp = 3;
    const ev = {
      t: 'spell', id: u.id, spell: spellId, name: sp.name, kind: sp.kind,
      center, tiles, results, xp: Math.min(95, totalXp), levelUps: [],
    };
    if (u.side === 'player' && ev.xp > 0) ev.levelUps = grantXp(u, ev.xp, this.rng);
    this.events.push(ev);
    this.checkEnd();
    if (!this.result) this.endTurn();
    return ev;
  }

  actItem(u, itemId, target, inventory) {
    const it = ITEMS[itemId];
    if (!it || !inventory[itemId]) return null;
    inventory[itemId]--;
    const amt = Math.min(target.maxhp - target.hp, it.heal);
    target.hp += amt;
    const ev = { t: 'item', id: u.id, item: itemId, name: it.name, target: target.id, heal: amt };
    this.events.push(ev);
    this.endTurn();
    return ev;
  }

  actStay(u) {
    this.events.push({ t: 'stay', id: u.id });
    this.endTurn();
  }

  killUnit(u) {
    u.down = true;
    this.events.push({ t: 'die', id: u.id, name: u.name, side: u.side });
  }

  checkEnd() {
    if (this.result) return;
    const hero = this.units.find((u) => u.id === 'moore');
    if (hero && hero.down) { this.result = 'defeat'; this.events.push({ t: 'end', result: 'defeat', why: 'MOORE HAS FALLEN...' }); return; }
    if (this.alive('player').length === 0) { this.result = 'defeat'; this.events.push({ t: 'end', result: 'defeat', why: 'THE FORCE IS ROUTED...' }); return; }
    const foes = this.alive('enemy');
    if (this.def.objective === 'boss') {
      if (!foes.some((u) => u.boss)) { this.win(); return; }
    }
    if (foes.length === 0) { this.win(); return; }
    if (this.def.objective === 'defend' && this.def.defendTiles) {
      for (const f of foes) {
        if (this.def.defendTiles.some(([x, y]) => f.x === x && f.y === y)) {
          this.result = 'defeat';
          this.events.push({ t: 'end', result: 'defeat', why: 'THE GATE IS BREACHED...' });
          return;
        }
      }
    }
  }

  win() {
    this.result = 'victory';
    this.goldEarned += this.def.gold;
    this.events.push({ t: 'end', result: 'victory', why: 'VICTORY!' });
  }

  // ---------- enemy AI ----------
  wakeCheck(u) {
    if (u.awake) return true;
    for (const p of this.alive('player')) {
      if (manhattan(u, p) <= u.aggro) { u.awake = true; break; }
    }
    // damage wakes
    if (u.hp < u.maxhp) u.awake = true;
    if (u.awake) this.events.push({ t: 'wake', id: u.id });
    return u.awake;
  }

  pickTarget(u) {
    const foes = this.alive('player');
    if (!foes.length) return null;
    if (u.ai === 'weakest') {
      return foes.slice().sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp || manhattan(u, a) - manhattan(u, b))[0];
    }
    if (u.ai === 'hunter') {
      const pri = (f) => (f.klass === 'healer' ? 0 : f.klass === 'mage' ? 1 : 2);
      return foes.slice().sort((a, b) => pri(a) - pri(b) || manhattan(u, a) - manhattan(u, b))[0];
    }
    return foes.slice().sort((a, b) => manhattan(u, a) - manhattan(u, b))[0];
  }

  // Perform the whole turn for the current AI unit.
  runAITurn() {
    const u = this.current();
    if (!u || u.side !== 'enemy' || this.result) { this.endTurn(); return; }
    if (!this.wakeCheck(u)) { this.actStay(u); return; }

    // enemy healer: heal most wounded ally in reach
    if (u.spell === 'heal2') {
      const sp = SPELLS.heal2;
      const hurt = this.alive('enemy').filter((a) => a !== u && a.hp < a.maxhp * 0.7);
      if (hurt.length) {
        hurt.sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp);
        const tgt = hurt[0];
        const tiles = u.noMove ? new Map([[u.x + u.y * this.w, { x: u.x, y: u.y, c: 0 }]]) : this.reachable(u);
        for (const t of tiles.values()) {
          if (Math.abs(t.x - tgt.x) + Math.abs(t.y - tgt.y) <= sp.rng) {
            this.doMove(u, t.x, t.y);
            this.actSpell(u, 'heal2', tgt.x, tgt.y);
            return;
          }
        }
      }
    }

    const target = this.pickTarget(u);
    if (!target) { this.actStay(u); return; }
    const tiles = u.noMove
      ? new Map([[u.x + u.y * this.w, { x: u.x, y: u.y, c: 0 }]])
      : this.reachable(u);

    // enemy mage: blaze the densest cluster reachable
    if (u.spell && u.spell.startsWith('blaze') || u.spell === 'breath') {
      const sp = SPELLS[u.spell];
      let best = null;
      for (const t of tiles.values()) {
        for (const p of this.alive('player')) {
          const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
          if (d > sp.rng) continue;
          const hits = this.aoeTiles(p.x, p.y, sp.aoe)
            .map((q) => this.at(q.x, q.y))
            .filter((v) => v && v.side === 'player').length;
          const score = hits * 10 - t.c;
          if (!best || score > best.score) best = { tile: t, tx: p.x, ty: p.y, score };
        }
      }
      if (best && (best.score >= 20 || u.boss || this.rng() < 0.7)) {
        this.doMove(u, best.tile.x, best.tile.y);
        this.actSpell(u, u.spell, best.tx, best.ty);
        return;
      }
    }

    // attack tiles: reachable tiles from which target is in weapon range
    const [lo, hi] = u.rng;
    let bestAtk = null;
    for (const t of tiles.values()) {
      const d = Math.abs(t.x - target.x) + Math.abs(t.y - target.y);
      if (d < lo || d > hi) continue;
      // ranged units prefer max distance; all prefer terrain def
      const score = terrainAt(this.map, t.x, t.y).def * 2 + (hi > 1 ? d * 3 : 0) - t.c * 0.1;
      if (!bestAtk || score > bestAtk.score) bestAtk = { t, score };
    }
    if (bestAtk) {
      this.doMove(u, bestAtk.t.x, bestAtk.t.y);
      this.actAttack(u, target);
      return;
    }

    if (u.noMove) { this.actStay(u); return; }

    // approach: pick reachable tile closest to target (ranged: closest to ideal ring)
    let bestMove = null;
    for (const t of tiles.values()) {
      const d = Math.abs(t.x - target.x) + Math.abs(t.y - target.y);
      const want = hi > 1 ? Math.abs(d - hi) : d;
      const score = -want * 10 - t.c + terrainAt(this.map, t.x, t.y).def;
      if (!bestMove || score > bestMove.score) bestMove = { t, score };
    }
    if (bestMove && (bestMove.t.x !== u.x || bestMove.t.y !== u.y)) {
      this.doMove(u, bestMove.t.x, bestMove.t.y);
    }
    this.actStay(u);
  }
}
