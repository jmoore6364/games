// World simulation: players, bombs, flames, powerups, enemies, sudden death.

import { TILE, GW, GH, T, idx } from './levels.js';

export const cellOf = (v) => (v / TILE) | 0;
export const center = (c) => c * TILE + 8;

const DIRS = [
  { dx: 1, dy: 0, arm: 'h', end: 'r' },
  { dx: -1, dy: 0, arm: 'h', end: 'l' },
  { dx: 0, dy: 1, arm: 'v', end: 'd' },
  { dx: 0, dy: -1, arm: 'v', end: 'u' },
];

export const ENEMY_SPECS = {
  balloon: { speed: 0.5, score: 100, sprite: 'e_balloon' },
  chaser: { speed: 0.65, score: 200, sprite: 'e_chaser', chase: true },
  speedy: { speed: 1.15, score: 300, sprite: 'e_speedy', straight: true },
  ghost: { speed: 0.45, score: 400, sprite: 'e_ghost', ghost: true },
  minion: { speed: 1.05, score: 100, sprite: 'e_chaser', chase: true },
  boss: { speed: 0.4, score: 5000, sprite: 'boss', boss: true, hp: 10 },
};

export class Player {
  constructor(id, color, cx, cy) {
    this.id = id;
    this.color = color;
    this.px = center(cx);
    this.py = center(cy);
    this.dir = 'down';
    this.anim = 0;
    this.moving = false;
    this.speed = 1.25;
    this.maxBombs = 1;
    this.range = 2;
    this.kick = false;
    this.remote = false;
    this.pass = false;
    this.alive = true;
    this.deadT = 0;
    this.wins = 0;
    this.isBot = false;
    this.bot = null;
    this.kickCd = 0;
  }
  get cx() { return cellOf(this.px); }
  get cy() { return cellOf(this.py); }
}

export class Enemy {
  constructor(type, cx, cy) {
    this.type = type;
    const spec = ENEMY_SPECS[type];
    this.px = center(cx);
    this.py = center(cy);
    this.tx = cx;
    this.ty = cy;
    this.dirx = 0;
    this.diry = 1;
    this.hp = spec.hp || 1;
    this.invuln = 0;
    this.dying = 0;
    this.spawnT = 0;
    this.chaseT = 0;
  }
  get cx() { return cellOf(this.px); }
  get cy() { return cellOf(this.py); }
}

export class World {
  // game: { sound, addScore(n), mode-specific hooks }
  constructor(game, arena, opts = {}) {
    this.game = game;
    this.grid = arena.grid;
    this.items = arena.items;
    this.theme = opts.theme ?? 0;
    this.mode = opts.mode || 'campaign';
    this.players = [];
    this.enemies = [];
    this.bombs = [];
    this.flames = [];
    this.breaking = [];
    this.pickups = [];
    this.exitCell = null;
    this.exitOpen = false;
    this.shake = 0;
    this.frame = 0;
    this.stats = { bombsPlaced: 0, softDestroyed: 0, chains: 0, kicks: 0 };
    this.shrinkList = null;
    this.shrinkIdx = 0;
    this.shrinkTimer = 0;
    this.exitSpawns = 0;
    this._danger = null;
    this._dangerF = -1;
  }

  // ---------- queries ----------
  tile(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return T.HARD;
    return this.grid[idx(cx, cy)];
  }
  bombAt(cx, cy) { return this.bombs.find((b) => b.cx === cx && b.cy === cy) || null; }
  pickupAt(cx, cy) { return this.pickups.find((u) => u.cx === cx && u.cy === cy) || null; }
  flameAt(cx, cy) { return this.flames.some((f) => f.cx === cx && f.cy === cy); }

  solidFor(cx, cy, ent) {
    const t = this.tile(cx, cy);
    if (t !== T.FLOOR) return true;
    const b = this.bombAt(cx, cy);
    if (b && !(ent && (ent.pass || b.walkers.has(ent)))) return true;
    return false;
  }

  blockedForBomb(cx, cy) {
    if (this.tile(cx, cy) !== T.FLOOR) return true;
    if (this.bombAt(cx, cy)) return true;
    if (this.pickupAt(cx, cy)) return true;
    if (this.exitCell && this.exitCell.cx === cx && this.exitCell.cy === cy) return true;
    for (const p of this.players) if (p.alive && p.cx === cx && p.cy === cy) return true;
    for (const e of this.enemies) if (!e.dying && e.cx === cx && e.cy === cy) return true;
    return false;
  }

  // ---------- player movement (lane-based, with corner assist) ----------
  movePlayer(p, dx, dy) {
    if (dx && dy) {
      if (p.dir === 'left' || p.dir === 'right') dx = 0; else dy = 0;
    }
    if (!dx && !dy) { p.moving = false; return; }
    p.moving = true;
    p.anim++;
    if (dx) { p.dir = dx > 0 ? 'right' : 'left'; this.axisMove(p, 'x', Math.sign(dx)); }
    else { p.dir = dy > 0 ? 'down' : 'up'; this.axisMove(p, 'y', Math.sign(dy)); }
  }

  axisMove(p, ax, s) {
    const sp = p.speed, r = 6;
    const along = ax === 'x' ? p.px : p.py;
    const perp = ax === 'x' ? p.py : p.px;
    const curA = cellOf(along), curP = cellOf(perp);
    const solidAP = (a, b) => (ax === 'x' ? this.solidFor(a, b, p) : this.solidFor(b, a, p));
    let pos = along + s * sp;
    let assisted = false;
    let bumpCell = null;
    const leadCell = cellOf(pos + s * r);
    if (leadCell !== curA) {
      const pc0 = cellOf(perp - r), pc1 = cellOf(perp + r);
      const s0 = solidAP(leadCell, pc0), s1 = solidAP(leadCell, pc1);
      if (s0 && s1) {
        pos = s > 0 ? leadCell * TILE - r : (leadCell + 1) * TILE + r;
        bumpCell = [leadCell, curP];
      } else if (s0 || s1) {
        // corner assist: slide sideways toward the open gap
        const openP = s0 ? pc1 : pc0;
        if (openP !== curP && !solidAP(curA, openP)) {
          const target = center(openP);
          const d = target - perp;
          const mv = Math.sign(d) * Math.min(Math.abs(d), sp);
          if (ax === 'x') p.py += mv; else p.px += mv;
          assisted = true;
        }
        pos = s > 0 ? Math.min(pos, leadCell * TILE - r) : Math.max(pos, (leadCell + 1) * TILE + r);
        if (solidAP(leadCell, curP)) bumpCell = [leadCell, curP];
      }
    }
    if (ax === 'x') p.px = pos; else p.py = pos;
    if (!assisted) {
      // auto-center on the lane
      const d = center(curP) - (ax === 'x' ? p.py : p.px);
      if (d) {
        const mv = Math.sign(d) * Math.min(Math.abs(d), sp);
        if (ax === 'x') p.py += mv; else p.px += mv;
      }
    }
    // kick: walking into a stationary bomb
    if (bumpCell && p.kick && p.kickCd <= 0) {
      const bx = ax === 'x' ? bumpCell[0] : bumpCell[1];
      const by = ax === 'x' ? bumpCell[1] : bumpCell[0];
      const bomb = this.bombAt(bx, by);
      if (bomb && !bomb.moving) {
        const kdx = ax === 'x' ? s : 0, kdy = ax === 'x' ? 0 : s;
        if (!this.blockedForBomb(bx + kdx, by + kdy)) {
          bomb.moving = { dx: kdx, dy: kdy };
          bomb.walkers.clear();
          p.kickCd = 12;
          this.stats.kicks++;
          this.game.sound.kick();
        }
      }
    }
  }

  // ---------- bombs ----------
  placeBomb(p) {
    if (!p.alive) return false;
    const cx = p.cx, cy = p.cy;
    if (this.tile(cx, cy) !== T.FLOOR || this.bombAt(cx, cy)) return false;
    let mine = 0;
    for (const b of this.bombs) if (b.owner === p) mine++;
    if (mine >= p.maxBombs) return false;
    const b = {
      cx, cy, px: center(cx), py: center(cy),
      timer: 150, range: p.range, owner: p,
      remote: p.remote, moving: null, walkers: new Set(),
    };
    for (const q of this.players) {
      if (q.alive && q.cx === cx && q.cy === cy) b.walkers.add(q);
    }
    this.bombs.push(b);
    this.stats.bombsPlaced++;
    this.game.sound.place();
    return true;
  }

  remoteDetonate(p) {
    const b = this.bombs.find((q) => q.owner === p && q.remote);
    if (b) { this.game.sound.detonateClick(); this.detonate(b); }
  }

  updateBombs() {
    for (const b of this.bombs.slice()) {
      if (!this.bombs.includes(b)) continue;
      if (this.flameAt(b.cx, b.cy)) { this.detonate(b); continue; }
      if (b.moving) {
        const { dx, dy } = b.moving;
        b.px += dx * 2.5;
        b.py += dy * 2.5;
        b.cx = cellOf(b.px);
        b.cy = cellOf(b.py);
        const cX = center(b.cx), cY = center(b.cy);
        const passed = dx > 0 ? b.px >= cX : dx < 0 ? b.px <= cX : dy > 0 ? b.py >= cY : b.py <= cY;
        if (passed && this.blockedForBomb(b.cx + dx, b.cy + dy)) {
          b.px = cX; b.py = cY; b.moving = null;
          this.game.sound.bump();
        }
      } else {
        for (const w of [...b.walkers]) {
          if (w.cx !== b.cx || w.cy !== b.cy || !w.alive) b.walkers.delete(w);
        }
      }
      if (!b.remote) {
        b.timer--;
        if (b.timer === 60) this.game.sound.tick();
        if (b.timer <= 0) this.detonate(b);
      }
    }
  }

  detonate(b0) {
    const queue = [b0];
    const seen = new Set([b0]);
    while (queue.length) {
      const b = queue.pop();
      const i = this.bombs.indexOf(b);
      if (i < 0) continue;
      this.bombs.splice(i, 1);
      this.explodeFrom(b, seen, queue);
    }
    this.game.sound.boom();
    this.shake = 6;
  }

  explodeFrom(b, seen, queue) {
    this.addFlame(b.cx, b.cy, 'c');
    for (const d of DIRS) {
      for (let i = 1; i <= b.range; i++) {
        const x = b.cx + d.dx * i, y = b.cy + d.dy * i;
        const t = this.tile(x, y);
        if (t === T.HARD || t === T.BREAK) break;
        if (t === T.SOFT) { this.destroySoft(x, y); break; }
        this.addFlame(x, y, i === b.range ? d.end : d.arm);
        const ob = this.bombAt(x, y);
        if (ob && !seen.has(ob)) {
          seen.add(ob);
          queue.push(ob);
          this.stats.chains++;
          break;
        }
        const pu = this.pickupAt(x, y);
        if (pu && pu.age > 30) this.pickups.splice(this.pickups.indexOf(pu), 1);
        if (this.exitCell && this.exitCell.cx === x && this.exitCell.cy === y) this.exitHit();
      }
    }
  }

  addFlame(cx, cy, kind) {
    const f = this.flames.find((q) => q.cx === cx && q.cy === cy);
    if (f) { f.t = 0; if (kind === 'c') f.kind = 'c'; return; }
    this.flames.push({ cx, cy, kind, t: 0 });
  }

  destroySoft(cx, cy) {
    this.grid[idx(cx, cy)] = T.BREAK;
    this.breaking.push({ cx, cy, t: 0 });
    this.stats.softDestroyed++;
    this.game.addScore(10);
  }

  // punish blasting the exit: it spits out angry minions (campaign classic)
  exitHit() {
    if (this.mode !== 'campaign' || this.exitSpawns >= 3) return;
    this.exitSpawns++;
    for (let i = 0; i < 3; i++) {
      this.enemies.push(new Enemy('minion', this.exitCell.cx, this.exitCell.cy));
    }
    this.game.sound.spawnWarn();
  }

  updateBreaking() {
    for (const br of this.breaking) {
      br.t++;
      if (br.t === 25) {
        const i = idx(br.cx, br.cy);
        this.grid[i] = T.FLOOR;
        const item = this.items.get(i);
        if (item) {
          this.items.delete(i);
          if (item === 'exit') this.exitCell = { cx: br.cx, cy: br.cy };
          else this.pickups.push({ cx: br.cx, cy: br.cy, type: item, age: 0 });
        }
      }
    }
    this.breaking = this.breaking.filter((br) => br.t < 25);
  }

  updateFlames() {
    for (const f of this.flames) f.t++;
    this.flames = this.flames.filter((f) => f.t < 45);
  }

  updatePickups() {
    for (const u of this.pickups) u.age++;
    for (const p of this.players) {
      if (!p.alive) continue;
      const u = this.pickupAt(p.cx, p.cy);
      if (u) {
        this.pickups.splice(this.pickups.indexOf(u), 1);
        this.applyPickup(p, u.type);
      }
    }
  }

  applyPickup(p, type) {
    if (type === 'bombs') p.maxBombs = Math.min(8, p.maxBombs + 1);
    else if (type === 'fire') p.range = Math.min(8, p.range + 1);
    else if (type === 'speed') p.speed = Math.min(2.25, p.speed + 0.25);
    else if (type === 'kick') p.kick = true;
    else if (type === 'remote') p.remote = true;
    else if (type === 'pass') p.pass = true;
    this.game.sound.powerup();
    if (this.mode === 'campaign') this.game.addScore(200);
  }

  // ---------- players update ----------
  updatePlayers(inputs) {
    this.players.forEach((p, i) => {
      if (!p.alive) { p.deadT++; return; }
      if (p.kickCd > 0) p.kickCd--;
      const inp = inputs[i] || { dx: 0, dy: 0, bomb: false, act: false };
      this.movePlayer(p, inp.dx, inp.dy);
      if (inp.bomb) this.placeBomb(p);
      if (inp.act && p.remote) this.remoteDetonate(p);
      if (this.flameAt(p.cx, p.cy)) this.killPlayer(p);
    });
  }

  killPlayer(p) {
    if (!p.alive) return;
    p.alive = false;
    p.deadT = 0;
    this.game.sound.die();
    // remote bombs revert to a normal fuse when their owner dies
    for (const b of this.bombs) {
      if (b.owner === p && b.remote) { b.remote = false; b.timer = 150; }
    }
    if (this.mode === 'battle') this.dropPowerups(p);
  }

  dropPowerups(p) {
    const drops = [];
    if (p.maxBombs > 1) drops.push('bombs');
    if (p.range > 2) drops.push('fire');
    if (p.speed > 1.25) drops.push('speed');
    if (p.kick) drops.push('kick');
    if (p.remote) drops.push('remote');
    if (p.pass) drops.push('pass');
    // partial drop: about half of what was held
    const n = Math.ceil(drops.length / 2);
    const free = [];
    for (let y = 1; y < GH - 1; y++) {
      for (let x = 1; x < GW - 1; x++) {
        if (this.tile(x, y) === T.FLOOR && !this.bombAt(x, y) && !this.pickupAt(x, y)) free.push({ x, y });
      }
    }
    for (let i = 0; i < n && free.length; i++) {
      const type = drops.splice((Math.random() * drops.length) | 0, 1)[0];
      const c = free.splice((Math.random() * free.length) | 0, 1)[0];
      this.pickups.push({ cx: c.x, cy: c.y, type, age: 0 });
    }
  }

  // ---------- enemies ----------
  losDir(e) {
    // line of sight to any living player along a clear row/col, within 8 cells
    for (const p of this.players) {
      if (!p.alive) continue;
      if (p.cy === e.cy) {
        const s = Math.sign(p.cx - e.cx);
        if (!s) continue;
        let clear = true;
        for (let x = e.cx + s; x !== p.cx; x += s) {
          if (this.tile(x, e.cy) !== T.FLOOR || this.bombAt(x, e.cy)) { clear = false; break; }
        }
        if (clear && Math.abs(p.cx - e.cx) <= 8) return { dx: s, dy: 0 };
      }
      if (p.cx === e.cx) {
        const s = Math.sign(p.cy - e.cy);
        if (!s) continue;
        let clear = true;
        for (let y = e.cy + s; y !== p.cy; y += s) {
          if (this.tile(e.cx, y) !== T.FLOOR || this.bombAt(e.cx, y)) { clear = false; break; }
        }
        if (clear && Math.abs(p.cy - e.cy) <= 8) return { dx: 0, dy: s };
      }
    }
    return null;
  }

  enemyOpen(cx, cy, spec) {
    const t = this.tile(cx, cy);
    if (t === T.HARD || t === T.BREAK) return false;
    if (t === T.SOFT && !(spec.ghost || spec.boss)) return false;
    if (this.bombAt(cx, cy)) return false;
    if (this.flameAt(cx, cy)) return false;
    return true;
  }

  chooseEnemyDir(e, spec) {
    const opts = [];
    for (const d of DIRS) {
      if (this.enemyOpen(e.cx + d.dx, e.cy + d.dy, spec)) opts.push(d);
    }
    if (!opts.length) { e.tx = e.cx; e.ty = e.cy; return; }
    let pick = null;
    if (spec.chase) {
      const los = this.losDir(e);
      if (los) pick = opts.find((d) => d.dx === los.dx && d.dy === los.dy) || null;
    }
    if (!pick) {
      const keep = opts.find((d) => d.dx === e.dirx && d.dy === e.diry);
      const keepChance = spec.straight ? 0.95 : 0.72;
      if (keep && Math.random() < keepChance) pick = keep;
      else pick = opts[(Math.random() * opts.length) | 0];
    }
    e.dirx = pick.dx; e.diry = pick.dy;
    e.tx = e.cx + pick.dx; e.ty = e.cy + pick.dy;
  }

  updateEnemies() {
    for (const e of this.enemies.slice()) {
      if (e.dying) {
        e.dying++;
        if (e.dying > 30) this.enemies.splice(this.enemies.indexOf(e), 1);
        continue;
      }
      const spec = ENEMY_SPECS[e.type];
      if (e.invuln > 0) e.invuln--;
      // boss spawns minions
      if (spec.boss) {
        e.spawnT++;
        const minions = this.enemies.filter((q) => q.type === 'minion' && !q.dying).length;
        if (e.spawnT > 360 && minions < 4) {
          e.spawnT = 0;
          this.enemies.push(new Enemy('minion', e.cx, e.cy));
          this.game.sound.spawnWarn();
        }
      }
      // walk toward target cell
      const tx = center(e.tx), ty = center(e.ty);
      const dx = tx - e.px, dy = ty - e.py;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist <= spec.speed) {
        e.px = tx; e.py = ty;
        if (spec.boss && this.tile(e.cx, e.cy) === T.SOFT) this.destroySoft(e.cx, e.cy);
        this.chooseEnemyDir(e, spec);
        // if heading into soft as boss, crush it on entry
        if (spec.boss && this.tile(e.tx, e.ty) === T.SOFT) this.destroySoft(e.tx, e.ty);
      } else {
        e.px += Math.sign(dx) * Math.min(Math.abs(dx), spec.speed);
        e.py += Math.sign(dy) * Math.min(Math.abs(dy), spec.speed);
      }
      // flames
      if (this.flameAt(e.cx, e.cy)) {
        if (spec.boss) {
          if (e.invuln <= 0) {
            e.hp--;
            e.invuln = 90;
            this.game.sound.bossHit();
            if (e.hp <= 0) {
              e.dying = 1;
              this.game.addScore(spec.score);
              this.game.sound.ehit();
            }
          }
        } else {
          e.dying = 1;
          this.game.addScore(spec.score);
          this.game.sound.ehit();
        }
        if (e.dying) continue;
      }
      // touch kills players
      const rad = spec.boss ? 14 : 10;
      for (const p of this.players) {
        if (p.alive && Math.abs(p.px - e.px) < rad && Math.abs(p.py - e.py) < rad) {
          this.killPlayer(p);
        }
      }
    }
  }

  // ---------- battle sudden death: walls close in ----------
  startShrink(list) {
    this.shrinkList = list;
    this.shrinkIdx = 0;
    this.shrinkTimer = 0;
  }

  updateShrink() {
    if (!this.shrinkList || this.shrinkIdx >= this.shrinkList.length) return;
    this.shrinkTimer++;
    if (this.shrinkTimer < 20) return;
    this.shrinkTimer = 0;
    const c = this.shrinkList[this.shrinkIdx++];
    if (this.tile(c.x, c.y) === T.HARD) return;
    const i = idx(c.x, c.y);
    this.grid[i] = T.HARD;
    this.items.delete(i);
    this.breaking = this.breaking.filter((b) => b.cx !== c.x || b.cy !== c.y);
    this.pickups = this.pickups.filter((u) => u.cx !== c.x || u.cy !== c.y);
    this.flames = this.flames.filter((f) => f.cx !== c.x || f.cy !== c.y);
    const bomb = this.bombAt(c.x, c.y);
    if (bomb) this.bombs.splice(this.bombs.indexOf(bomb), 1);
    for (const p of this.players) {
      if (p.alive && p.cx === c.x && p.cy === c.y) this.killPlayer(p);
    }
    for (const e of this.enemies) {
      if (!e.dying && e.cx === c.x && e.cy === c.y) e.dying = 1;
    }
    this.game.sound.crush();
    this.shake = Math.max(this.shake, 2);
  }

  // ---------- danger map (bots + AI) ----------
  blastCells(b) {
    const cells = [{ x: b.cx, y: b.cy }];
    for (const d of DIRS) {
      for (let i = 1; i <= b.range; i++) {
        const x = b.cx + d.dx * i, y = b.cy + d.dy * i;
        const t = this.tile(x, y);
        if (t !== T.FLOOR) break;
        cells.push({ x, y });
        const ob = this.bombAt(x, y);
        if (ob && ob !== b) break;
      }
    }
    return cells;
  }

  // frames until each cell becomes deadly (9999 = safe)
  dangerMap() {
    if (this._danger && this._dangerF === this.frame) return this._danger;
    const map = new Float64Array(GW * GH).fill(9999);
    for (const f of this.flames) map[idx(f.cx, f.cy)] = 0;
    const entries = this.bombs.map((b) => ({ b, t: b.remote ? 40 : b.timer }));
    for (let pass = 0; pass < 3; pass++) {
      for (const e of entries) {
        const cells = this.blastCells(e.b);
        for (const c of cells) {
          const i = idx(c.x, c.y);
          if (e.t < map[i]) map[i] = e.t;
          for (const e2 of entries) {
            if (e2.b.cx === c.x && e2.b.cy === c.y && e.t < e2.t) e2.t = e.t;
          }
        }
      }
    }
    // imminent crush cells
    if (this.shrinkList) {
      for (let k = 0; k < 3; k++) {
        const c = this.shrinkList[this.shrinkIdx + k];
        if (c) map[idx(c.x, c.y)] = Math.min(map[idx(c.x, c.y)], (20 - this.shrinkTimer) + k * 20);
      }
    }
    this._danger = map;
    this._dangerF = this.frame;
    return map;
  }

  // ---------- frame ----------
  update(inputs) {
    this.frame++;
    this.updateShrink();
    this.updatePlayers(inputs);
    this.updateBombs();
    this.updateFlames();
    this.updateBreaking();
    this.updatePickups();
    this.updateEnemies();
    if (this.shake > 0) this.shake--;
  }
}
