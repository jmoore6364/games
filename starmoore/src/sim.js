// StarMoore core simulation — pure logic, no DOM/canvas. Headless-testable.
import { pathfind, nearestOpen } from './pathfind.js';
import {
  MAP_W, MAP_H, T, PLAYER, ENEMY, UNITS, BUILDINGS, WORKER_BUILDS,
  MOORE_PER_TRIP, GAS_PER_TRIP, HARVEST_TIME, MOORE_NODE_AMOUNT, GAS_NODE_AMOUNT,
  START_MOORE, START_GAS, SUPPLY_MAX, DIFFICULTY,
} from './data.js';

export { MAP_W, MAP_H, T, PLAYER, ENEMY, UNITS, BUILDINGS, WORKER_BUILDS };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  constructor(opts = {}) {
    this.seed = opts.seed || 12345;
    this.difficulty = opts.difficulty || 'normal';
    this.mapType = opts.mapType || 'clash';
    this.rng = mulberry32(this.seed);
    this.w = MAP_W; this.h = MAP_H;
    this.time = 0;
    this.nextId = 1;
    this.units = [];
    this.buildings = [];
    this.resources = [];   // {id, kind:'moore'|'gas', tx, ty, amount, refinery:buildingId|null, occ}
    this.projectiles = [];
    this.effects = [];     // visual poofs {x,y,t,life,kind}
    this.alerts = [];      // {text, t}
    this.res = [
      { m: START_MOORE, g: START_GAS },  // player
      { m: START_MOORE, g: START_GAS },  // enemy
    ];
    this.winner = null;    // null | PLAYER | ENEMY
    this.terrain = new Uint8Array(this.w * this.h);
    this.occ = new Int32Array(this.w * this.h).fill(0); // building id occupying tile (0 none)
    // fog per side
    this.fog = [new Uint8Array(this.w * this.h), new Uint8Array(this.w * this.h)];
    this.ai = null;
    this._generate();
    this._setupAI();
  }

  // ---------- map generation ----------
  _generate() {
    const { w, h } = this;
    this.terrain.fill(T.GRASS);
    const r = this.rng;
    // scattered rock clusters, point-symmetric about map centre
    const clusters = 10;
    const place = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) this.terrain[y * w + x] = v; };
    for (let c = 0; c < clusters; c++) {
      const cx = 6 + Math.floor(r() * (w - 12));
      const cy = 6 + Math.floor(r() * (h - 12));
      const sz = 2 + Math.floor(r() * 3);
      for (let dy = -sz; dy <= sz; dy++)
        for (let dx = -sz; dx <= sz; dx++) {
          if (dx * dx + dy * dy > sz * sz + 1) continue;
          if (r() < 0.35) continue;
          place(cx + dx, cy + dy, T.ROCK);
          place(w - 1 - (cx + dx), h - 1 - (cy + dy), T.ROCK); // mirror
        }
    }
    // dirt patches (cosmetic, walkable)
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * h);
      if (this.terrain[y * w + x] === T.GRASS) this.terrain[y * w + x] = T.DIRT;
    }

    // Bases: player bottom-left, enemy top-right (point symmetric)
    const pBase = { x: 9, y: h - 12 };
    const eBase = { x: w - 1 - pBase.x, y: h - 1 - pBase.y };
    this._clearArea(pBase.x, pBase.y, 5);
    this._clearArea(eBase.x, eBase.y, 5);

    const pBaseB = this._addBuilding(PLAYER, 'base', pBase.x, pBase.y, true);
    const eBaseB = this._addBuilding(ENEMY, 'base', eBase.x, eBase.y, true);
    this.playerBase = pBaseB; this.enemyBase = eBaseB;

    // moore line near each base (arc of nodes), symmetric
    const layout = [
      [-4, -3], [-2, -4], [0, -4], [2, -4], [-4, -1], [-4, 1], [4, -3], [4, -1],
    ];
    for (const [dx, dy] of layout) {
      const x = pBase.x + 1 + dx, y = pBase.y + 1 + dy;
      this._addResource('moore', x, y, MOORE_NODE_AMOUNT);
      this._addResource('moore', w - 1 - x, h - 1 - y, MOORE_NODE_AMOUNT);
    }
    // geyser near each base
    this._addResource('gas', pBase.x - 3, pBase.y + 4, GAS_NODE_AMOUNT);
    this._addResource('gas', w - 1 - (pBase.x - 3), h - 1 - (pBase.y + 4), GAS_NODE_AMOUNT);

    // starting workers
    for (let i = 0; i < 5; i++) {
      this._spawnUnit(PLAYER, 'worker', pBase.x + 1 + (i - 2) * 0.7, pBase.y + 4);
      this._spawnUnit(ENEMY, 'worker', eBase.x + 1 - (i - 2) * 0.7, eBase.y - 2);
    }
    this._recomputeFog(PLAYER);
    this._recomputeFog(ENEMY);
  }

  _clearArea(cx, cy, r) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        if (this.terrain[y * this.w + x] === T.ROCK) this.terrain[y * this.w + x] = T.GRASS;
      }
  }

  // ---------- entity creation ----------
  _addResource(kind, tx, ty, amount) {
    tx = Math.round(tx); ty = Math.round(ty);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    this.terrain[ty * this.w + tx] = T.GRASS;
    const node = { id: this.nextId++, kind, tx, ty, amount, refinery: null, occupants: 0 };
    this.resources.push(node);
    this.occ[ty * this.w + tx] = -1; // resource blocks pathing tile
    return node;
  }

  _addBuilding(side, type, tx, ty, complete = false) {
    const def = BUILDINGS[type];
    const b = {
      id: this.nextId++, side, type, tx, ty, w: def.w, h: def.h,
      hp: complete ? def.hp : Math.max(1, def.hp * 0.08), maxHp: def.hp,
      complete, buildTime: def.buildTime, buildProg: complete ? def.buildTime : 0,
      queue: [], trainProg: 0, rally: null, cd: 0, target: null,
      def,
    };
    this.buildings.push(b);
    for (let dy = 0; dy < def.h; dy++)
      for (let dx = 0; dx < def.w; dx++) {
        const x = tx + dx, y = ty + dy;
        if (x < this.w && y < this.h) this.occ[y * this.w + x] = b.id;
      }
    b.rally = { x: tx + def.w / 2, y: ty + def.h + 0.5 };
    return b;
  }

  _spawnUnit(side, type, x, y) {
    const def = UNITS[type];
    const u = {
      id: this.nextId++, side, type, x, y,
      hp: def.hp, maxHp: def.hp, def,
      order: 'idle', path: null, goal: null, target: null,
      attackMove: false, hold: false,
      cargo: 0, cargoKind: null, gatherNode: null, gatherTimer: 0, gatherState: null,
      buildSite: null, cd: 0, facing: 0, repathCd: 0, moveTimer: 0,
      dropReturn: null,
    };
    this.units.push(u);
    return u;
  }

  // ---------- queries ----------
  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  tileBlocked(tx, ty) {
    if (!this.inBounds(tx, ty)) return true;
    const i = ty * this.w + tx;
    if (this.terrain[i] === T.ROCK) return true;
    if (this.occ[i] !== 0) return true; // building or resource
    return false;
  }

  buildingAt(tx, ty) {
    if (!this.inBounds(tx, ty)) return null;
    const id = this.occ[ty * this.w + tx];
    if (id > 0) return this.buildings.find(b => b.id === id) || null;
    return null;
  }

  resourceAt(tx, ty) {
    return this.resources.find(n => n.tx === tx && n.ty === ty && n.amount > 0) || null;
  }

  getById(id) {
    return this.units.find(u => u.id === id) || this.buildings.find(b => b.id === id) || null;
  }

  supply(side) {
    let used = 0, max = 0;
    for (const u of this.units) if (u.side === side) used += u.def.supply;
    for (const b of this.buildings) if (b.side === side && b.complete) max += (b.def.provides || 0);
    return { used, max: Math.min(max, SUPPLY_MAX) };
  }

  countBuildings(side, type) {
    return this.buildings.filter(b => b.side === side && b.type === type).length;
  }
  hasBuilding(side, type) {
    return this.buildings.some(b => b.side === side && b.type === type && b.complete);
  }

  // ---------- placement ----------
  canPlace(side, type, tx, ty) {
    const def = BUILDINGS[type];
    tx = Math.round(tx); ty = Math.round(ty);
    if (def.onGeyser) {
      // must sit on a geyser (2x2 aligned to geyser tile top-left offset by -0? geyser is 1 tile; center it)
      const gx = tx, gy = ty;
      const node = this.resources.find(n => n.kind === 'gas' && n.tx >= gx && n.tx < gx + def.w && n.ty >= gy && n.ty < gy + def.h);
      if (!node) return false;
      // tiles just need to be in-bounds and not rock/building (geyser tile allowed)
      for (let dy = 0; dy < def.h; dy++)
        for (let dx = 0; dx < def.w; dx++) {
          const x = tx + dx, y = ty + dy;
          if (!this.inBounds(x, y)) return false;
          if (this.terrain[y * this.w + x] === T.ROCK) return false;
          const o = this.occ[y * this.w + x];
          if (o > 0) return false; // another building
        }
      return true;
    }
    for (let dy = 0; dy < def.h; dy++)
      for (let dx = 0; dx < def.w; dx++) {
        const x = tx + dx, y = ty + dy;
        if (!this.inBounds(x, y)) return false;
        if (this.terrain[y * this.w + x] === T.ROCK) return false;
        if (this.occ[y * this.w + x] !== 0) return false;
      }
    if (def.requires && !this.hasBuilding(side, def.requires)) return false;
    return true;
  }

  // ---------- player/order API ----------
  alert(text) {
    this.alerts.push({ text, t: this.time });
    if (this.alerts.length > 6) this.alerts.shift();
  }

  orderBuild(worker, type, tx, ty) {
    if (!worker || worker.type !== 'worker' || worker.side === undefined) return false;
    const def = BUILDINGS[type];
    tx = Math.round(tx); ty = Math.round(ty);
    if (!this.canPlace(worker.side, type, tx, ty)) return false;
    const cost = def.cost;
    const bank = this.res[worker.side];
    if (bank.m < cost.m || bank.g < (cost.g || 0)) {
      if (worker.side === PLAYER) this.alert('Not enough resources');
      return false;
    }
    bank.m -= cost.m; bank.g -= (cost.g || 0);
    // create construction site immediately
    const site = this._addBuilding(worker.side, type, tx, ty, false);
    if (def.onGeyser) {
      const node = this.resources.find(n => n.kind === 'gas' && n.tx >= tx && n.tx < tx + def.w && n.ty >= ty && n.ty < ty + def.h);
      if (node) { node.refinery = site.id; site.geyser = node.id; }
    }
    // send worker to build
    worker.order = 'build';
    worker.buildSite = site.id;
    worker.gatherNode = null; worker.cargo = 0;
    const goal = this._adjacentTile(site);
    this._setPath(worker, goal.x, goal.y);
    return site;
  }

  orderTrain(building, unitType) {
    if (!building || !building.complete) return false;
    const def = building.def;
    if (!def.trains || !def.trains.includes(unitType)) return false;
    const uDef = UNITS[unitType];
    const bank = this.res[building.side];
    if (bank.m < uDef.cost.m || bank.g < (uDef.cost.g || 0)) {
      if (building.side === PLAYER) this.alert('Not enough resources');
      return false;
    }
    const sup = this.supply(building.side);
    // count queued supply too
    let queued = 0;
    for (const b of this.buildings) if (b.side === building.side) for (const q of b.queue) queued += UNITS[q].supply;
    if (sup.used + queued + uDef.supply > sup.max) {
      if (building.side === PLAYER) this.alert('Supply blocked — build a Supply Pylon');
      return false;
    }
    if (building.queue.length >= 8) return false;
    bank.m -= uDef.cost.m; bank.g -= (uDef.cost.g || 0);
    building.queue.push(unitType);
    return true;
  }

  cancelTrain(building, i = 0) {
    if (!building || !building.queue.length) return false;
    const t = building.queue.splice(i, 1)[0];
    const uDef = UNITS[t];
    this.res[building.side].m += uDef.cost.m;
    this.res[building.side].g += (uDef.cost.g || 0);
    if (i === 0) building.trainProg = 0;
    return true;
  }

  setRally(building, x, y) {
    if (building && building.complete) building.rally = { x, y };
  }

  commandMove(units, x, y, attackMove = false) {
    for (const u of units) {
      if (u.side !== PLAYER && u._aiOverride !== true) { /* still allow */ }
      u.order = attackMove ? 'attackmove' : 'move';
      u.attackMove = attackMove;
      u.hold = false;
      u.target = null; u.gatherNode = null; u.buildSite = null;
      if (u.cargo > 0 && u.type === 'worker') { /* keep cargo, will drop later */ }
      this._setPath(u, x, y);
    }
  }

  commandStop(units) {
    for (const u of units) { u.order = 'idle'; u.path = null; u.goal = null; u.target = null; u.attackMove = false; u.hold = false; u.gatherNode = null; }
  }
  commandHold(units) {
    for (const u of units) { u.order = 'hold'; u.path = null; u.goal = null; u.target = null; u.hold = true; u.attackMove = false; }
  }

  commandAttack(units, targetId) {
    const tgt = this.getById(targetId);
    if (!tgt) return;
    for (const u of units) {
      u.order = 'attack'; u.target = targetId; u.attackMove = false; u.hold = false;
      u.gatherNode = null; u.buildSite = null;
    }
  }

  commandGather(worker, node) {
    if (worker.type !== 'worker' || !node || node.amount <= 0) return;
    if (node.kind === 'gas' && !node.refinery) return; // needs refinery
    worker.order = 'gather';
    worker.gatherNode = node.id;
    worker.gatherState = 'toNode';
    worker.buildSite = null; worker.target = null;
    const goal = this._adjacentToTile(worker, node.tx, node.ty);
    this._setPath(worker, goal.x, goal.y);
  }

  // right-click context command on a world point / entity
  commandContext(units, wx, wy, targetId) {
    const tgt = targetId ? this.getById(targetId) : null;
    if (tgt && tgt.hp !== undefined && tgt.side !== undefined && tgt.side !== units[0]?.side) {
      this.commandAttack(units, targetId); return 'attack';
    }
    // resource node?
    const tx = Math.floor(wx), ty = Math.floor(wy);
    const node = this.resourceAt(tx, ty);
    const workers = units.filter(u => u.type === 'worker');
    if (node && workers.length) {
      for (const wk of workers) this.commandGather(wk, node);
      const others = units.filter(u => u.type !== 'worker');
      if (others.length) this.commandMove(others, wx, wy, false);
      return 'gather';
    }
    this.commandMove(units, wx, wy, false);
    return 'move';
  }

  // ---------- path helpers ----------
  _setPath(u, tx, ty) {
    tx = Math.max(0, Math.min(this.w - 1, Math.floor(tx)));
    ty = Math.max(0, Math.min(this.h - 1, Math.floor(ty)));
    u.goal = { x: tx + 0.5, y: ty + 0.5 };
    const blocked = (x, y) => this._pathBlocked(x, y);
    const p = pathfind(this.w, this.h, Math.floor(u.x), Math.floor(u.y), tx, ty, blocked);
    if (p) {
      u.path = p.map(pt => ({ x: pt.x + 0.5, y: pt.y + 0.5 }));
      if (u.path.length === 0) u.path = [{ x: u.goal.x, y: u.goal.y }];
    } else {
      u.path = null;
    }
    u.repathCd = 0.5 + this.rng() * 0.4;
  }

  // pathing blocker ignores resource occupant? resources block. buildings block.
  _pathBlocked(x, y) {
    return this.tileBlocked(x, y);
  }

  _adjacentTile(building) {
    // find a walkable tile adjacent to a building
    const b = building;
    for (let r = 0; r <= b.w; r++) {
      for (let dx = -1; dx <= b.w; dx++) {
        for (const dy of [-1, b.h]) {
          const x = b.tx + dx, y = b.ty + dy;
          if (this.inBounds(x, y) && !this.tileBlocked(x, y)) return { x, y };
        }
      }
      for (let dy = -1; dy <= b.h; dy++) {
        for (const dx of [-1, b.w]) {
          const x = b.tx + dx, y = b.ty + dy;
          if (this.inBounds(x, y) && !this.tileBlocked(x, y)) return { x, y };
        }
      }
    }
    const alt = nearestOpen(this.w, this.h, b.tx, b.ty, (x, y) => this.tileBlocked(x, y));
    return alt || { x: b.tx, y: b.ty };
  }

  _adjacentToTile(fromU, tx, ty) {
    let best = null, bd = Infinity;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = tx + dx, y = ty + dy;
        if (!this.inBounds(x, y) || this.tileBlocked(x, y)) continue;
        const d = (x - fromU.x) ** 2 + (y - fromU.y) ** 2;
        if (d < bd) { bd = d; best = { x, y }; }
      }
    return best || { x: tx, y: ty };
  }

  nearestDropoff(side, x, y) {
    let best = null, bd = Infinity;
    for (const b of this.buildings) {
      if (b.side !== side || !b.complete || !b.def.dropoff) continue;
      const cx = b.tx + b.w / 2, cy = b.ty + b.h / 2;
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ---------- main tick ----------
  step(dt) {
    if (this.winner !== null) { this._updateEffects(dt); return; }
    this.time += dt;
    this._updateBuildings(dt);
    this._updateUnits(dt);
    this._separate();
    this._updateProjectiles(dt);
    this._updateEffects(dt);
    if (this.ai) this._runAI(dt);
    this._checkWin();
    // fog recompute a few times a sec is enough but do every tick for correctness at 30fps sim
    this._fogTimer = (this._fogTimer || 0) - dt;
    if (this._fogTimer <= 0) { this._recomputeFog(PLAYER); this._recomputeFog(ENEMY); this._fogTimer = 0.2; }
  }

  _updateBuildings(dt) {
    for (const b of this.buildings) {
      if (!b.complete) {
        if (b.hp <= 0) continue; // destroyed construction site — cleaned up in _updateEffects
        b.buildProg += dt;
        // construction heals up as it builds, but combat damage sticks (and can kill it)
        b.hp = Math.min(b.def.hp, b.hp + (0.92 * b.def.hp / b.buildTime) * dt);
        if (b.buildProg >= b.buildTime) {
          b.complete = true; b.hp = b.def.hp;
          if (b.side === PLAYER) this.alert(b.def.name + ' complete');
          // free the builder
          for (const u of this.units) if (u.buildSite === b.id) { u.buildSite = null; u.order = 'idle'; }
        }
        continue;
      }
      // turret combat
      if (b.def.ranged && b.def.dmg) {
        b.cd -= dt;
        const cx = b.tx + b.w / 2, cy = b.ty + b.h / 2;
        let tgt = b.target ? this.getById(b.target) : null;
        if (!tgt || tgt.hp <= 0 || this._dist(cx, cy, tgt) > b.def.range) tgt = null;
        if (!tgt) tgt = this._nearestEnemy(b.side, cx, cy, b.def.range);
        b.target = tgt ? tgt.id : null;
        if (tgt && b.cd <= 0) {
          this._fireRanged(b, cx, cy, tgt, b.def);
          b.cd = b.def.cd;
        }
        continue;
      }
      // production
      if (b.queue.length) {
        const type = b.queue[0];
        b.trainProg += dt;
        const need = UNITS[type].buildTime;
        if (b.trainProg >= need) {
          b.trainProg = 0; b.queue.shift();
          this._completeTrain(b, type);
        }
      }
    }
  }

  _completeTrain(b, type) {
    const spawn = this._adjacentTile(b);
    const u = this._spawnUnit(b.side, type, spawn.x + 0.5, spawn.y + 0.5);
    if (b.side === PLAYER) this.alert(UNITS[type].name + ' ready');
    // move to rally
    if (b.rally) {
      const node = this.resources.find(n => Math.abs(n.tx - b.rally.x) < 1.2 && Math.abs(n.ty - b.rally.y) < 1.2 && n.amount > 0);
      if (node && type === 'worker') this.commandGather(u, node);
      else this.commandMove([u], b.rally.x, b.rally.y, false);
    }
    return u;
  }

  _updateUnits(dt) {
    for (const u of this.units) {
      if (u.hp <= 0) continue;
      u.cd -= dt;
      u.repathCd -= dt;
      switch (u.order) {
        case 'idle': this._updIdle(u, dt); break;
        case 'move': this._updMove(u, dt, false); break;
        case 'attackmove': this._updMove(u, dt, true); break;
        case 'hold': this._updHold(u, dt); break;
        case 'attack': this._updAttack(u, dt); break;
        case 'gather': this._updGather(u, dt); break;
        case 'build': this._updBuild(u, dt); break;
        default: break;
      }
    }
    // remove dead
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.hp <= 0) {
        this.effects.push({ x: u.x, y: u.y, t: this.time, life: 0.5, kind: 'poof' });
        // free resource occupant
        if (u.gatherNode) { const n = this.resources.find(r => r.id === u.gatherNode); if (n && n.occupants > 0) n.occupants--; }
        this.units.splice(i, 1);
      }
    }
  }

  _updIdle(u, dt) {
    if (u.type === 'worker' && u.cargo > 0) { // resume dropoff
      this._returnCargo(u); return;
    }
    // auto-acquire nearby enemy (defensive)
    const enemy = this._nearestEnemy(u.side, u.x, u.y, u.def.sight);
    if (enemy && u.type !== 'worker') {
      u.order = 'attack'; u.target = enemy.id; u._leash = { x: u.x, y: u.y };
    }
  }

  _updMove(u, dt, atk) {
    if (atk) {
      const enemy = this._nearestEnemy(u.side, u.x, u.y, u.def.sight);
      if (enemy) { u._resume = u.goal ? { x: u.goal.x, y: u.goal.y } : null; u.order = 'attack'; u.target = enemy.id; u.attackMove = true; return; }
    }
    const arrived = this._followPath(u, dt);
    if (arrived) { u.order = 'idle'; u.attackMove = false; }
  }

  _updHold(u, dt) {
    const enemy = this._nearestEnemy(u.side, u.x, u.y, u.def.range + 0.3);
    if (enemy) this._tryAttack(u, enemy, dt);
  }

  _updAttack(u, dt) {
    let tgt = this.getById(u.target);
    if (!tgt || tgt.hp <= 0) {
      u.target = null;
      if (u.attackMove && u._resume) { u.order = 'attackmove'; this._setPath(u, u._resume.x, u._resume.y); u._resume = null; return; }
      // look for another nearby enemy
      const e = this._nearestEnemy(u.side, u.x, u.y, u.def.sight);
      if (e && u.type !== 'worker') { u.target = e.id; return; }
      u.order = 'idle'; u.path = null; return;
    }
    const d = this._dist(u.x, u.y, tgt);
    const rng = u.def.range + (tgt.w ? Math.max(tgt.w, tgt.h) / 2 : (tgt.def ? tgt.def.radius : 0));
    if (d <= rng) {
      u.path = null;
      this._tryAttack(u, tgt, dt);
    } else {
      // chase
      if (!u.path || u.repathCd <= 0) {
        const tx = tgt.tx !== undefined ? tgt.tx + (tgt.w / 2 | 0) : Math.floor(tgt.x);
        const ty = tgt.ty !== undefined ? tgt.ty + (tgt.h / 2 | 0) : Math.floor(tgt.y);
        this._setPath(u, tx, ty);
      }
      this._followPath(u, dt);
    }
  }

  _tryAttack(u, tgt, dt) {
    this._faceTo(u, tgt.x !== undefined ? tgt.x : tgt.tx + tgt.w / 2, tgt.y !== undefined ? tgt.y : tgt.ty + tgt.h / 2);
    if (u.cd > 0) return;
    u.cd = u.def.cd;
    if (u.def.ranged) {
      this._fireRanged(u, u.x, u.y, tgt, u.def);
    } else {
      this._applyDamage(tgt, u.def.dmg, u.side);
      this.effects.push({ x: (u.x + (tgt.x ?? tgt.tx)) / 2, y: (u.y + (tgt.y ?? tgt.ty)) / 2, t: this.time, life: 0.12, kind: 'hit' });
    }
  }

  _fireRanged(shooter, sx, sy, tgt, def) {
    const tx = tgt.x !== undefined ? tgt.x : tgt.tx + tgt.w / 2;
    const ty = tgt.y !== undefined ? tgt.y : tgt.ty + tgt.h / 2;
    this.projectiles.push({
      x: sx, y: sy, tx, ty, targetId: tgt.id, side: shooter.side,
      dmg: def.dmg, splash: def.splash || 0, speed: 14, life: 1.5,
      kind: def.splash ? 'shell' : 'laser',
    });
  }

  _applyDamage(tgt, dmg, fromSide) {
    const armor = (tgt.def ? tgt.def.armor : 0) || 0;
    const dealt = Math.max(1, dmg - armor);
    tgt.hp -= dealt;
    if (tgt.side === PLAYER && tgt.w) this._maybeAlert('Base under attack!', 'attackB');
    if (tgt.hp <= 0) {
      if (tgt.w !== undefined) this._onBuildingDead(tgt);
    }
  }

  _maybeAlert(text, key) {
    const now = this.time;
    if (!this._alertCd) this._alertCd = {};
    if ((this._alertCd[key] || -99) + 8 < now) { this.alert(text); this._alertCd[key] = now; }
  }

  _onBuildingDead(b) {
    b.hp = 0;
    // freed on cleanup below
  }

  _updGather(u, dt) {
    const node = this.resources.find(n => n.id === u.gatherNode);
    if (u.gatherState === 'toNode') {
      if (!node || node.amount <= 0) { u.order = 'idle'; u.gatherNode = null; return; }
      const near = Math.abs(u.x - (node.tx + 0.5)) < 1.3 && Math.abs(u.y - (node.ty + 0.5)) < 1.3;
      if (near) { u.gatherState = 'mining'; u.gatherTimer = HARVEST_TIME; u.path = null; node.occupants++; }
      else {
        const done = this._followPath(u, dt);
        if (done && !near) { const g = this._adjacentToTile(u, node.tx, node.ty); this._setPath(u, g.x, g.y); if (!u.path) { u.order = 'idle'; } }
      }
    } else if (u.gatherState === 'mining') {
      u.gatherTimer -= dt;
      if (u.gatherTimer <= 0) {
        if (node.occupants > 0) node.occupants--;
        const take = node.kind === 'moore' ? MOORE_PER_TRIP : GAS_PER_TRIP;
        const got = Math.min(take, node.amount);
        node.amount -= got;
        u.cargo = got; u.cargoKind = node.kind;
        u.gatherState = 'toDrop';
        this._returnCargo(u);
      }
    } else if (u.gatherState === 'toDrop') {
      this._returnCargo(u, dt);
    }
  }

  _returnCargo(u, dt = 1 / 30) {
    const depot = this.nearestDropoff(u.side, u.x, u.y);
    if (!depot) { u.order = 'idle'; return; }
    const near = u.x > depot.tx - 1 && u.x < depot.tx + depot.w + 1 && u.y > depot.ty - 1 && u.y < depot.ty + depot.h + 1;
    if (near) {
      this.res[u.side].m += u.cargoKind === 'moore' ? u.cargo : 0;
      this.res[u.side].g += u.cargoKind === 'gas' ? u.cargo : 0;
      u.cargo = 0;
      this.effects.push({ x: u.x, y: u.y, t: this.time, life: 0.3, kind: 'drop' });
      // go back to node if still mining order
      if (u.order === 'gather') {
        const node = this.resources.find(n => n.id === u.gatherNode);
        if (node && node.amount > 0) { u.gatherState = 'toNode'; const g = this._adjacentToTile(u, node.tx, node.ty); this._setPath(u, g.x, g.y); }
        else {
          // find another node of same kind near depot
          const alt = this._findNearbyNode(u.side, depot, u.cargoKind === 'gas' ? 'gas' : 'moore');
          if (alt) { u.gatherNode = alt.id; u.gatherState = 'toNode'; const g = this._adjacentToTile(u, alt.tx, alt.ty); this._setPath(u, g.x, g.y); }
          else u.order = 'idle';
        }
      } else u.order = 'idle';
      return;
    }
    if (!u.path || u.path.length === 0) this._setPath(u, depot.tx + depot.w, depot.ty + depot.h);
    this._followPath(u, dt);
  }

  _findNearbyNode(side, depot, kind) {
    let best = null, bd = Infinity;
    for (const n of this.resources) {
      if (n.amount <= 0 || n.kind !== kind) continue;
      if (kind === 'gas' && !n.refinery) continue;
      const d = (n.tx - depot.tx) ** 2 + (n.ty - depot.ty) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  _updBuild(u, dt) {
    const site = this.buildings.find(b => b.id === u.buildSite);
    if (!site || site.complete || site.hp <= 0) { u.buildSite = null; u.order = 'idle'; return; }
    const near = u.x > site.tx - 1.2 && u.x < site.tx + site.w + 1.2 && u.y > site.ty - 1.2 && u.y < site.ty + site.h + 1.2;
    if (near) { u.path = null; /* channel; building progresses in _updateBuildings */ }
    else {
      const done = this._followPath(u, dt);
      if (done && !near) { const g = this._adjacentTile(site); this._setPath(u, g.x, g.y); if (!u.path) u.order = 'idle'; }
    }
  }

  // move along path; returns true when arrived at final goal
  _followPath(u, dt) {
    if (!u.path || u.path.length === 0) {
      if (u.goal && u.repathCd <= 0) { this._setPath(u, u.goal.x, u.goal.y); if (!u.path) return true; }
      else return true;
    }
    if (!u.path || u.path.length === 0) return true;
    const wp = u.path[0];
    const dx = wp.x - u.x, dy = wp.y - u.y;
    const d = Math.hypot(dx, dy);
    const step = u.def.speed * dt;
    if (d <= step + 0.02) {
      u.x = wp.x; u.y = wp.y;
      u.path.shift();
      if (u.path.length === 0) return true;
    } else {
      u.x += (dx / d) * step;
      u.y += (dy / d) * step;
      this._faceTo(u, wp.x, wp.y);
    }
    return false;
  }

  _faceTo(u, x, y) { u.facing = Math.atan2(y - u.y, x - u.x); }

  // separation: push overlapping units apart (local collision)
  _separate() {
    const cell = 1.0;
    const grid = new Map();
    for (const u of this.units) {
      const k = (Math.floor(u.x / cell)) + ',' + (Math.floor(u.y / cell));
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(u);
    }
    for (const u of this.units) {
      const cx = Math.floor(u.x / cell), cy = Math.floor(u.y / cell);
      for (let gy = cy - 1; gy <= cy + 1; gy++)
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          const arr = grid.get(gx + ',' + gy); if (!arr) continue;
          for (const o of arr) {
            if (o === u || o.id <= u.id) continue;
            const dx = o.x - u.x, dy = o.y - u.y;
            let d = Math.hypot(dx, dy);
            const minD = u.def.radius + o.def.radius;
            if (d < minD && d > 0.0001) {
              const push = (minD - d) / 2;
              const nx = dx / d, ny = dy / d;
              u.x -= nx * push; u.y -= ny * push;
              o.x += nx * push; o.y += ny * push;
            } else if (d <= 0.0001) {
              u.x += (this.rng() - 0.5) * 0.1; o.x -= (this.rng() - 0.5) * 0.1;
            }
          }
        }
    }
    // keep inside walkable tiles (clamp out of rock/building)
    for (const u of this.units) {
      u.x = Math.max(0.3, Math.min(this.w - 0.3, u.x));
      u.y = Math.max(0.3, Math.min(this.h - 0.3, u.y));
      const ti = Math.floor(u.y) * this.w + Math.floor(u.x);
      if (this.terrain[ti] === T.ROCK) {
        // nudge toward previous cell (simple)
        u.x -= Math.cos(u.facing) * 0.15; u.y -= Math.sin(u.facing) * 0.15;
      }
    }
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      const tgt = this.getById(p.targetId);
      if (tgt && tgt.hp > 0) { p.tx = tgt.x !== undefined ? tgt.x : tgt.tx + tgt.w / 2; p.ty = tgt.y !== undefined ? tgt.y : tgt.ty + tgt.h / 2; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step || p.life <= 0) {
        // impact
        this.effects.push({ x: p.tx, y: p.ty, t: this.time, life: p.splash ? 0.35 : 0.12, kind: p.splash ? 'boom' : 'hit' });
        if (p.splash > 0) {
          for (const e of [...this.units, ...this.buildings]) {
            if (e.side === p.side || e.hp <= 0) continue;
            const ex = e.x !== undefined ? e.x : e.tx + e.w / 2;
            const ey = e.y !== undefined ? e.y : e.ty + e.h / 2;
            if (Math.hypot(ex - p.tx, ey - p.ty) <= p.splash) this._applyDamage(e, p.dmg, p.side);
          }
        } else if (tgt && tgt.hp > 0) {
          this._applyDamage(tgt, p.dmg, p.side);
        }
        this.projectiles.splice(i, 1);
      } else {
        p.x += dx / d * step; p.y += dy / d * step;
      }
    }
  }

  _updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
    // clean dead buildings
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      if (b.hp <= 0) {
        this.effects.push({ x: b.tx + b.w / 2, y: b.ty + b.h / 2, t: this.time, life: 0.7, kind: 'boom' });
        for (let dy = 0; dy < b.h; dy++)
          for (let dx = 0; dx < b.w; dx++) {
            const x = b.tx + dx, y = b.ty + dy;
            if (this.inBounds(x, y) && this.occ[y * this.w + x] === b.id) this.occ[y * this.w + x] = 0;
          }
        // free geyser refinery
        if (b.geyser) { const n = this.resources.find(r => r.id === b.geyser); if (n) n.refinery = null; }
        if (b.side === PLAYER) this._maybeAlert(b.def.name + ' lost!', 'lost' + b.type);
        this.buildings.splice(i, 1);
      }
    }
  }

  // ---------- targeting helpers ----------
  _dist(x, y, e) {
    const ex = e.x !== undefined ? e.x : e.tx + e.w / 2;
    const ey = e.y !== undefined ? e.y : e.ty + e.h / 2;
    return Math.hypot(ex - x, ey - y);
  }

  _nearestEnemy(side, x, y, range) {
    let best = null, bd = range;
    for (const u of this.units) {
      if (u.side === side || u.hp <= 0) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d < bd) { bd = d; best = u; }
    }
    for (const b of this.buildings) {
      if (b.side === side || b.hp <= 0) continue;
      const cx = b.tx + b.w / 2, cy = b.ty + b.h / 2;
      const d = Math.hypot(cx - x, cy - y) - Math.max(b.w, b.h) / 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ---------- fog of war ----------
  _recomputeFog(side) {
    const fog = this.fog[side];
    for (let i = 0; i < fog.length; i++) if (fog[i] === 2) fog[i] = 1; // visible -> explored
    const reveal = (cx, cy, r) => {
      const r2 = r * r;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const x = cx + dx | 0, y = cy + dy | 0;
          if (this.inBounds(x, y)) fog[y * this.w + x] = 2;
        }
    };
    for (const u of this.units) if (u.side === side && u.hp > 0) reveal(Math.floor(u.x), Math.floor(u.y), u.def.sight);
    for (const b of this.buildings) if (b.side === side && b.hp > 0) reveal(Math.floor(b.tx + b.w / 2), Math.floor(b.ty + b.h / 2), b.def.sight);
  }

  visible(side, tx, ty) {
    if (!this.inBounds(tx, ty)) return 0;
    return this.fog[side][ty * this.w + tx];
  }

  // is an entity currently seen by side
  seenBy(side, e) {
    const tx = e.tx !== undefined ? Math.floor(e.tx + e.w / 2) : Math.floor(e.x);
    const ty = e.ty !== undefined ? Math.floor(e.ty + e.h / 2) : Math.floor(e.y);
    return this.visible(side, tx, ty) === 2;
  }

  // ---------- win/lose ----------
  _checkWin() {
    if (this.winner !== null) return;
    const pB = this.buildings.some(b => b.side === PLAYER);
    const eB = this.buildings.some(b => b.side === ENEMY);
    if (!eB) this.winner = PLAYER;
    else if (!pB) this.winner = ENEMY;
  }

  // ---------- AI ----------
  _setupAI() {
    const cfg = DIFFICULTY[this.difficulty] || DIFFICULTY.normal;
    this.ai = {
      cfg, think: 0, waveNum: 0, nextWaveAt: cfg.firstWave, attacking: false,
      buildCd: 0, side: ENEMY,
    };
  }

  _runAI(dt) {
    const ai = this.ai;
    ai.think -= dt;
    if (ai.think > 0) return;
    ai.think = 1.0 * ai.cfg.thinkMul;
    const side = ENEMY;
    const bank = this.res[side];
    // income bonus (handicap)
    if (ai.cfg.incomeMul > 1) { bank.m += (ai.cfg.incomeMul - 1) * 4; }

    const myUnits = this.units.filter(u => u.side === side && u.hp > 0);
    const myWorkers = myUnits.filter(u => u.type === 'worker');
    const myArmy = myUnits.filter(u => u.type !== 'worker');
    const base = this.buildings.find(b => b.side === side && b.type === 'base');
    if (!base) return;

    // 1) keep workers gathering
    for (const wk of myWorkers) {
      if (wk.order === 'idle') {
        const node = this._bestGatherNode(side, base, wk);
        if (node) this.commandGather(wk, node);
      }
    }
    // assign a worker to gas if refinery exists and <2 on gas
    const refin = this.buildings.find(b => b.side === side && b.type === 'refinery' && b.complete);
    if (refin && refin.geyser) {
      const gasNode = this.resources.find(n => n.id === refin.geyser);
      const onGas = myWorkers.filter(w => w.gatherNode === gasNode?.id).length;
      if (gasNode && onGas < 3) {
        const wk = myWorkers.find(w => w.order === 'gather' && w.cargoKind !== 'gas' && (this.resources.find(n => n.id === w.gatherNode)?.kind === 'moore'));
        if (wk) this.commandGather(wk, gasNode);
      }
    }

    // 2) supply management
    const sup = this.supply(side);
    const buildingDepot = this.buildings.some(b => b.side === side && b.type === 'depot' && !b.complete);
    if (sup.max < SUPPLY_MAX && sup.used >= sup.max - 3 && !buildingDepot && bank.m >= 100) {
      this._aiBuild(side, 'depot', base);
    }

    // 3) tech tree / production buildings
    const nBarracks = this.buildings.filter(b => b.side === side && b.type === 'barracks').length;
    const hasRefin = this.buildings.some(b => b.side === side && b.type === 'refinery');
    const nFactory = this.buildings.filter(b => b.side === side && b.type === 'factory').length;
    const building = this.buildings.some(b => b.side === side && !b.complete && b.type !== 'depot');

    if (!building) {
      if (nBarracks === 0 && bank.m >= 150) this._aiBuild(side, 'barracks', base);
      else if (nBarracks >= 1 && !hasRefin && bank.m >= 75) this._aiBuildRefinery(side, base);
      else if (nBarracks >= 1 && nFactory === 0 && bank.m >= 160 && bank.g >= 100) this._aiBuild(side, 'factory', base);
      else if (nBarracks < 2 && myArmy.length > 6 && bank.m >= 150) this._aiBuild(side, 'barracks', base);
      // occasional defensive turret
      else if (this.buildings.filter(b => b.side === side && b.type === 'turret').length < 2 && ai.waveNum >= 1 && bank.m >= 100 && this.rng() < 0.3) this._aiBuild(side, 'turret', base);
    }

    // 4) train workers up to target
    if (myWorkers.length < ai.cfg.workerTarget && base.queue.length === 0 && base.complete) {
      this.orderTrain(base, 'worker');
    }

    // 5) train army from barracks/factory
    for (const b of this.buildings) {
      if (b.side !== side || !b.complete || b.queue.length >= 2) continue;
      if (b.type === 'barracks') {
        const pick = (this.rng() < 0.65 || bank.g < 25) ? 'moorine' : 'moraider';
        this.orderTrain(b, pick);
      } else if (b.type === 'factory') {
        this.orderTrain(b, 'siege');
      }
    }

    // 6) attacking
    const armyVal = this._armyValue(myArmy);
    ai._lastArmy = myArmy.length;
    ai._lastArmyVal = armyVal;
    const waveThreshold = ai.cfg.waveBase + ai.waveNum * ai.cfg.armyStep;

    // defend if enemy near base
    const threat = this._nearestEnemy(side, base.tx + 1.5, base.ty + 1.5, 12);
    if (threat && !ai.attacking) {
      for (const a of myArmy) if (a.order === 'idle' || a.order === 'hold') { a.order = 'attack'; a.target = threat.id; }
    }

    if (!ai.attacking && this.time >= ai.nextWaveAt && myArmy.length >= waveThreshold) {
      // launch wave
      ai.attacking = true; ai.waveNum++;
      ai.attacks = (ai.attacks || 0) + 1;
      const target = this.playerBase && this.playerBase.hp > 0 ? this.playerBase
        : this.buildings.find(b => b.side === PLAYER);
      const tx = target ? target.tx + 1 : 10, ty = target ? target.ty + 1 : 10;
      for (const a of myArmy) { a._aiOverride = true; }
      this.commandMove(myArmy, tx, ty, true);
      this.ai._waveUnits = myArmy.map(a => a.id);
    }
    if (ai.attacking) {
      // check if wave spent or arrived; regroup after
      const alive = (ai._waveUnits || []).map(id => this.units.find(u => u.id === id)).filter(u => u && u.hp > 0);
      const nearPlayer = alive.some(u => {
        const pb = this.buildings.find(b => b.side === PLAYER);
        return pb && Math.hypot(u.x - (pb.tx + 1), u.y - (pb.ty + 1)) < 14;
      });
      if (alive.length <= Math.max(1, (ai._waveUnits?.length || 1) * 0.25) || (!nearPlayer && alive.length < 2)) {
        ai.attacking = false;
        ai.nextWaveAt = this.time + 25;
        // idle survivors regroup at base
        for (const u of alive) { u.order = 'idle'; u._aiOverride = false; this.commandMove([u], base.tx + 4, base.ty + 4, false); }
      } else {
        // keep pressing: retarget stragglers
        for (const u of alive) {
          if (u.order === 'idle') {
            const t = this.buildings.find(b => b.side === PLAYER);
            if (t) this.commandMove([u], t.tx + 1, t.ty + 1, true);
          }
        }
      }
    }
  }

  _armyValue(army) {
    let v = 0;
    for (const u of army) v += (u.def.cost.m + u.def.cost.g * 1.5) * (u.hp / u.maxHp);
    return v;
  }

  _bestGatherNode(side, base, wk) {
    let best = null, bd = Infinity;
    for (const n of this.resources) {
      if (n.kind !== 'moore' || n.amount <= 0) continue;
      const d = (n.tx - base.tx) ** 2 + (n.ty - base.ty) ** 2 + n.occupants * 6;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  _aiFindPlacement(side, type, base) {
    const def = BUILDINGS[type];
    // spiral out from base looking for a valid footprint on the AI's side
    for (let r = 3; r < 22; r++) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const tx = Math.round(base.tx + Math.cos(ang) * r);
        const ty = Math.round(base.ty + Math.sin(ang) * r);
        if (this.canPlace(side, type, tx, ty)) {
          // require a bit of clearance so buildings don't wall the base off
          return { tx, ty };
        }
      }
    }
    return null;
  }

  _aiBuild(side, type, base) {
    const def = BUILDINGS[type];
    const bank = this.res[side];
    if (bank.m < def.cost.m || bank.g < (def.cost.g || 0)) return false;
    const spot = this._aiFindPlacement(side, type, base);
    if (!spot) return false;
    // pick a free worker
    const wk = this.units.find(u => u.side === side && u.type === 'worker' && u.hp > 0 && u.order !== 'build');
    if (!wk) return false;
    return !!this.orderBuild(wk, type, spot.tx, spot.ty);
  }

  _aiBuildRefinery(side, base) {
    // find AI-side geyser near base without refinery
    let best = null, bd = Infinity;
    for (const n of this.resources) {
      if (n.kind !== 'gas' || n.refinery) continue;
      const d = (n.tx - base.tx) ** 2 + (n.ty - base.ty) ** 2;
      if (d < bd && d < 400) { bd = d; best = n; }
    }
    if (!best) return false;
    const def = BUILDINGS.refinery;
    // place refinery so geyser tile is inside footprint (top-left = geyser - a bit)
    const tx = best.tx, ty = best.ty;
    const wk = this.units.find(u => u.side === side && u.type === 'worker' && u.hp > 0 && u.order !== 'build');
    if (!wk) return false;
    if (this.canPlace(side, 'refinery', tx, ty)) return !!this.orderBuild(wk, 'refinery', tx, ty);
    if (this.canPlace(side, 'refinery', tx - 1, ty - 1)) return !!this.orderBuild(wk, 'refinery', tx - 1, ty - 1);
    return false;
  }
}
