// world.js — playfield layout, level construction, frog simulation, collisions.
import { TILE, Mover, drawVehicle, drawLog, drawTurtles, drawFrog, drawFly } from './entities.js';

export { TILE };
export const W = 480, H = 560, TOP = 40;
export const COLS = 12;
export const HOME_ROW = 0;
export const MEDIAN_ROW = 6;
export const BANK_ROW = 12;
export const RIVER_ROWS = [1, 2, 3, 4, 5];
export const ROAD_ROWS = [7, 8, 9, 10, 11];
export const START_TIME = 30;      // seconds per crossing
const FROG = 30;

// five home bays centered across the width
export const BAYS = [0, 1, 2, 3, 4].map(i => ({
  cx: Math.round(W * (i + 0.5) / 5),
  hw: 28,
  filled: false,
  fly: false,
}));

export class World {
  constructor() {
    this.level = 1;
    this.movers = [];
    this.homes = BAYS.map(b => ({ cx: b.cx, hw: b.hw, filled: false, fly: false }));
    this.resetFrog();
    this.flyTimer = 4 + Math.random() * 5;
    this.t = 0;
    this.timer = START_TIME;
    this.build(1);
  }

  laneY(row) { return TOP + row * TILE; }

  resetFrog() {
    this.frog = {
      x: W / 2, row: BANK_ROW,
      dir: 0,
      hopping: false, hopT: 0, fromX: W / 2, fromRow: BANK_ROW, toX: W / 2, toRow: BANK_ROW,
      onPlatform: null,
    };
    this.furthest = BANK_ROW;
    this.timer = START_TIME;
  }

  fullReset(level) {
    this.level = level;
    this.homes.forEach(h => { h.filled = false; h.fly = false; });
    this.build(level);
    this.resetFrog();
    this.flyTimer = 4 + Math.random() * 5;
  }

  softResetFrog() { this.resetFrog(); }

  build(level) {
    const spd = 1 + (level - 1) * 0.18;   // global speed multiplier
    this.movers = [];
    // ---- road lanes (row : kind, tiles, dir, baseSpeed, count) ----
    const road = [
      { row: 11, kind: 'car',       tiles: 1, dir:  1, s: 46, n: 3 },
      { row: 10, kind: 'truck',     tiles: 2, dir: -1, s: 40, n: 2 },
      { row: 9,  kind: 'fastcar',   tiles: 1, dir:  1, s: 92, n: 2 },
      { row: 8,  kind: 'car',       tiles: 1, dir: -1, s: 58, n: 3 },
      { row: 7,  kind: 'bulldozer', tiles: 2, dir:  1, s: 68, n: 2 },
    ];
    for (const L of road) {
      const gap = W / L.n;
      for (let i = 0; i < L.n; i++) {
        this.movers.push(new Mover(L.kind, L.row, i * gap + Math.random() * 20, L.tiles, L.dir * L.s * spd, W));
      }
    }
    // ---- river lanes ----
    const river = [
      { row: 5, kind: 'log',    tiles: 3, dir: -1, s: 48, n: 2, dive: false },
      { row: 4, kind: 'turtle', tiles: 3, dir:  1, s: 44, n: 3, dive: false },
      { row: 3, kind: 'log',    tiles: 4, dir:  1, s: 38, n: 2, dive: false },
      { row: 2, kind: 'log',    tiles: 2, dir: -1, s: 66, n: 3, dive: false },
      { row: 1, kind: 'turtle', tiles: 2, dir: -1, s: 54, n: 3, dive: true  },
    ];
    for (const L of river) {
      const gap = W / L.n;
      for (let i = 0; i < L.n; i++) {
        const m = new Mover(L.kind, L.row, i * gap + Math.random() * 30, L.tiles, L.dir * L.s * spd, W);
        if (L.dive && i % 2 === 1) { m.diver = true; m.diveT = Math.random() * 5; }
        this.movers.push(m);
      }
    }
  }

  hop(dir) {
    const f = this.frog;
    if (f.hopping) return false;
    let nx = f.x, nrow = f.row;
    if (dir === 0) nrow = Math.max(HOME_ROW, f.row - 1);       // up
    else if (dir === 2) nrow = Math.min(BANK_ROW, f.row + 1);  // down
    else if (dir === 1) nx = Math.min(W - FROG / 2, f.x + TILE); // right
    else if (dir === 3) nx = Math.max(FROG / 2, f.x - TILE);   // left
    f.dir = dir;
    if (nx === f.x && nrow === f.row) return false;
    f.hopping = true; f.hopT = 0;
    f.fromX = f.x; f.fromRow = f.row; f.toX = nx; f.toRow = nrow;
    f.onPlatform = null;
    return true;
  }

  // returns event: null | {type:'home',bay,fly} | {type:'death',cause}
  update(dt) {
    this.t += dt;
    for (const m of this.movers) m.update(dt);

    // fly bonus spawn/despawn on a random empty bay
    this.flyTimer -= dt;
    if (this.flyTimer <= 0) {
      const anyFly = this.homes.some(h => h.fly);
      if (anyFly) {
        this.homes.forEach(h => h.fly = false);
        this.flyTimer = 5 + Math.random() * 6;
      } else {
        const empty = this.homes.filter(h => !h.filled);
        if (empty.length) { empty[(Math.random() * empty.length) | 0].fly = true; this.flyTimer = 4 + Math.random() * 3; }
        else this.flyTimer = 4;
      }
    }

    const f = this.frog;
    if (f.hopping) {
      f.hopT += dt / 0.1;
      if (f.hopT >= 1) {
        f.hopT = 1; f.hopping = false; f.x = f.toX; f.row = f.toRow;
        return this._land();
      }
      return null;
    }

    // resting: ride platform if on a river lane
    if (RIVER_ROWS.includes(f.row)) {
      const p = this._platformUnder();
      if (p) {
        f.onPlatform = p;
        f.x += p.speed * dt;
        if (f.x < FROG / 2 - 4 || f.x > W - FROG / 2 + 4) return { type: 'death', cause: 'drown' };
        f.x = Math.max(FROG / 2, Math.min(W - FROG / 2, f.x));
      } else {
        return { type: 'death', cause: 'splash' };
      }
    }

    // timer
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = 0; return { type: 'death', cause: 'timeout' }; }
    return null;
  }

  // evaluate consequences of landing on a tile
  _land() {
    const f = this.frog;
    if (ROAD_ROWS.includes(f.row)) {
      if (this._vehicleHit()) return { type: 'death', cause: 'squash' };
    } else if (RIVER_ROWS.includes(f.row)) {
      const p = this._platformUnder();
      if (!p) return { type: 'death', cause: 'splash' };
      f.onPlatform = p;
    } else if (f.row === HOME_ROW) {
      // must be inside an empty bay
      let hit = -1;
      for (let i = 0; i < this.homes.length; i++) {
        const h = this.homes[i];
        if (Math.abs(f.x - h.cx) <= h.hw && !h.filled) { hit = i; break; }
      }
      if (hit >= 0) {
        const gotFly = this.homes[hit].fly;
        this.homes[hit].filled = true; this.homes[hit].fly = false;
        return { type: 'home', bay: hit, fly: gotFly };
      }
      return { type: 'death', cause: 'squash' }; // hit the hedge
    }
    return null;
  }

  _vehicleHit() {
    const f = this.frog;
    const fx = f.x, fy = this.laneY(f.row) + TILE / 2;
    for (const m of this.movers) {
      if (m.lane !== f.row) continue;
      const r = m.rect(TOP);
      if (fx > r.x + 3 && fx < r.x + r.w - 3 && fy > r.y && fy < r.y + r.h) return true;
    }
    return false;
  }

  _platformUnder() {
    const f = this.frog;
    const fx = f.x, fy = this.laneY(f.row) + TILE / 2;
    for (const m of this.movers) {
      if (m.lane !== f.row) continue;
      if (m.kind === 'turtle' && m.submerged) continue;
      const r = m.rect(TOP);
      if (fx > r.x + 4 && fx < r.x + r.w - 4 && fy > r.y && fy < r.y + r.h) return m;
    }
    return null;
  }

  allHome() { return this.homes.every(h => h.filled); }

  frogScreen() {
    const f = this.frog;
    let x = f.x, row = f.row, lift = 0;
    if (f.hopping) {
      const e = f.hopT;
      x = f.fromX + (f.toX - f.fromX) * e;
      row = f.fromRow + (f.toRow - f.fromRow) * e;
      lift = Math.sin(e * Math.PI) * 8;
    }
    return { x, y: this.laneY(row) + TILE / 2 - lift, dir: f.dir };
  }

  // ---------------- rendering ----------------
  drawBackground(ctx) {
    // start bank + median grass
    ctx.fillStyle = '#123a1c'; ctx.fillRect(0, this.laneY(BANK_ROW), W, TILE);
    ctx.fillStyle = '#123a1c'; ctx.fillRect(0, this.laneY(MEDIAN_ROW), W, TILE);
    // grass texture dots
    ctx.fillStyle = 'rgba(30,90,40,0.6)';
    for (const r of [BANK_ROW, MEDIAN_ROW]) {
      const y = this.laneY(r);
      for (let i = 0; i < W; i += 10) ctx.fillRect(i + ((r * 7 + i) % 4), y + 6 + ((i * 3) % 26), 3, 3);
    }
    // road
    const roadTop = this.laneY(ROAD_ROWS[0]);
    ctx.fillStyle = '#26282e'; ctx.fillRect(0, roadTop, W, TILE * ROAD_ROWS.length);
    // lane dashes
    ctx.fillStyle = '#c9c04a';
    for (const r of ROAD_ROWS) {
      if (r === ROAD_ROWS[0]) continue;
      const y = this.laneY(r);
      for (let i = 8; i < W; i += 34) ctx.fillRect(i, y - 2, 18, 3);
    }
    // curb lines top & bottom of road
    ctx.fillStyle = '#e8e8ea';
    ctx.fillRect(0, roadTop - 2, W, 2);
    ctx.fillRect(0, roadTop + TILE * ROAD_ROWS.length, W, 2);
    // river
    const rivTop = this.laneY(RIVER_ROWS[0]);
    const rivH = TILE * RIVER_ROWS.length;
    ctx.fillStyle = '#123a6b'; ctx.fillRect(0, rivTop, W, rivH);
    // water shimmer bands
    ctx.fillStyle = 'rgba(60,120,190,0.4)';
    for (let r = 0; r < RIVER_ROWS.length; r++) {
      const y = rivTop + r * TILE;
      for (let i = 0; i < W; i += 22) {
        const off = Math.sin((this.t * 1.5) + i * 0.3 + r) * 2;
        ctx.fillRect(i + (r % 2 ? 8 : 0), y + 14 + off, 12, 2);
      }
    }
    // home row (hedge) with bays
    const hy = this.laneY(HOME_ROW);
    ctx.fillStyle = '#0f6b32'; ctx.fillRect(0, hy, W, TILE);
    ctx.fillStyle = '#0b5527';
    for (let i = 0; i < W; i += 8) ctx.fillRect(i, hy + ((i % 16) ? 4 : 10), 5, 6);
    // bays (darker docks)
    for (const h of this.homes) {
      ctx.fillStyle = '#0a2c56';
      ctx.fillRect(h.cx - h.hw, hy, h.hw * 2, TILE);
      ctx.fillStyle = 'rgba(120,200,255,0.15)';
      ctx.fillRect(h.cx - h.hw, hy + TILE - 4, h.hw * 2, 4);
    }
  }

  drawMovers(ctx) {
    // river platforms first (below frog), then vehicles
    for (const m of this.movers) {
      if (m.kind === 'log') drawLog(ctx, m, TOP);
      else if (m.kind === 'turtle') drawTurtles(ctx, m, TOP);
    }
    for (const m of this.movers) {
      if (m.kind === 'log' || m.kind === 'turtle') continue;
      drawVehicle(ctx, m, TOP);
    }
  }

  drawHomes(ctx) {
    const hy = this.laneY(HOME_ROW);
    for (const h of this.homes) {
      if (h.filled) {
        drawFrog(ctx, h.cx, hy + TILE / 2, FROG - 4, 0, 0);
      } else if (h.fly) {
        drawFly(ctx, h.cx, hy + TILE / 2, this.t);
      }
    }
  }

  drawFrog(ctx, squashT = 0) {
    const s = this.frogScreen();
    drawFrog(ctx, s.x, s.y, FROG, s.dir, squashT);
  }

  frogSize() { return FROG; }
}
