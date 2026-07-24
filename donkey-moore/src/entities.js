// entities.js — barrels that roll down the girders (following the slopes and
// sometimes dropping down ladders), the oil-drum flame that chases the hero,
// and lightweight visual effects. Fixed 60fps stepping.

import {
  GIRDERS, LADDERS, surfaceY, supportedAt, slopeDir, girderBelow,
  ladderTop, ladderBottom, WALL_L, WALL_R, OIL_DRUM,
} from './level.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Barrel {
  constructor(x, y, gi, dir, speed) {
    this.x = x; this.y = y; this.gi = gi;
    this.dir = dir || 1;
    this.speed = speed;
    this.roll = 0;
    this.mode = 'roll';
    this.ladder = null;
    this.dead = false;
    this.fvy = 0;
    this.ladderChance = 0.35;
  }

  update(diff) {
    if (this.mode === 'roll') {
      const g = GIRDERS[this.gi];
      const sd = slopeDir(g);
      if (sd !== 0) this.dir = sd;
      const sp = this.speed * (1 + Math.abs(g.yR - g.yL) / 60);
      this.x += this.dir * sp;
      this.roll += this.dir * sp * 0.28;

      // fall through a hole?
      if (!supportedAt(g, this.x)) {
        this.mode = 'fall'; this.fvy = 1.2; return;
      }
      this.y = surfaceY(g, this.x);

      // reached a wall / girder end -> tumble to the next girder
      const atEnd = (this.dir < 0 && this.x <= g.xL + 1) || (this.dir > 0 && this.x >= g.xR - 1);
      if (atEnd) {
        // bottom girder: roll into the oil drum and vanish
        if (this.gi === 0) { this.dead = true; return; }
        this.mode = 'fall'; this.fvy = 1.2; return;
      }

      // maybe divert down a ladder
      for (const l of LADDERS) {
        if (l.broken || l.gHigh !== this.gi) continue;
        if (Math.abs(l.x - this.x) < 2.2 && Math.random() < this.ladderChance * diff * 0.02) {
          this.mode = 'ladder'; this.ladder = l; this.x = l.x; break;
        }
      }
      return;
    }

    if (this.mode === 'fall') {
      this.fvy += 0.35;
      this.y += this.fvy;
      this.roll += 0.25;
      const below = girderBelow(this.x, this.y - 6, this.gi < 0 ? -1 : -1);
      // land on first supported girder strictly below current y
      const land = girderBelow(this.x, this.y, -1);
      if (land && this.y >= land.y && land.g.i < this.gi + 1) {
        // ensure we actually descend (land on a lower girder than before if possible)
      }
      if (land && this.y >= land.y) {
        this.y = land.y; this.gi = land.g.i; this.mode = 'roll'; this.fvy = 0;
        const sd = slopeDir(land.g); if (sd !== 0) this.dir = sd;
        return;
      }
      if (this.y > 300) this.dead = true;
      void below;
      return;
    }

    if (this.mode === 'ladder') {
      const l = this.ladder;
      this.y += 1.4;
      this.roll += 0.2;
      if (this.y >= ladderBottom(l)) {
        this.y = ladderBottom(l); this.gi = l.gLow; this.mode = 'roll';
        const sd = slopeDir(GIRDERS[this.gi]); if (sd !== 0) this.dir = sd;
      }
      return;
    }
  }
}

// A wandering blue flame from the oil drum that drifts toward the hero.
export class Flame {
  constructor() {
    this.gi = 0;
    this.x = OIL_DRUM.x + 6;
    this.y = surfaceY(GIRDERS[0], this.x);
    this.dir = 1;
    this.wob = 0;
    this.t = 0;
    this.climbCd = rand(2, 4);
    this.ladder = null;
    this.mode = 'walk';
    this.active = false;   // stays by the drum until awoken
  }

  update(dt, player) {
    this.t += dt;
    this.wob = Math.sin(this.t * 12) * 2;
    if (!this.active) { this.y = surfaceY(GIRDERS[this.gi], this.x); return; }

    if (this.mode === 'climb') {
      const l = this.ladder;
      const goUp = this.targetGi > this.gi;
      this.y += goUp ? -0.7 : 0.7;
      if (goUp && this.y <= ladderTop(l)) { this.y = ladderTop(l); this.gi = l.gHigh; this.mode = 'walk'; }
      else if (!goUp && this.y >= ladderBottom(l)) { this.y = ladderBottom(l); this.gi = l.gLow; this.mode = 'walk'; }
      return;
    }

    // walk toward the player's column
    const g = GIRDERS[this.gi];
    this.dir = player.x < this.x ? -1 : 1;
    this.x += this.dir * 0.55;
    this.x = Math.max(g.xL + 2, Math.min(g.xR - 2, this.x));
    if (!supportedAt(g, this.x)) this.x -= this.dir * 0.55;
    this.y = surfaceY(g, this.x);

    // occasionally take a ladder toward the player's level
    this.climbCd -= dt;
    if (this.climbCd <= 0 && player.gi !== this.gi) {
      this.climbCd = rand(2.5, 5);
      const wantUp = player.gi > this.gi;
      for (const l of LADDERS) {
        if (l.broken) continue;
        if (wantUp && l.gLow === this.gi && Math.abs(l.x - this.x) < 20) {
          this.mode = 'climb'; this.ladder = l; this.x = l.x; this.targetGi = l.gHigh; break;
        }
        if (!wantUp && l.gHigh === this.gi && Math.abs(l.x - this.x) < 20) {
          this.mode = 'climb'; this.ladder = l; this.x = l.x; this.targetGi = l.gLow; break;
        }
      }
    }
  }
}

export class Effects {
  constructor() { this.list = []; }
  popup(x, y, txt, col) { this.list.push({ t: 'txt', x, y, txt, col, life: 0.9 }); }
  burst(x, y, col) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.list.push({ t: 'p', x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, col: col || '#ffd', life: 0.5 });
    }
  }
  update(dt) {
    for (const e of this.list) {
      e.life -= dt;
      if (e.t === 'txt') e.y -= dt * 22;
      else { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 120 * dt; }
    }
    this.list = this.list.filter((e) => e.life > 0);
  }
  draw(ctx, drawPopup) {
    for (const e of this.list) {
      if (e.t === 'txt') drawPopup(ctx, e.x, e.y, e.txt, e.col);
      else { ctx.fillStyle = e.col; ctx.globalAlpha = Math.max(0, e.life * 2); ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 2, 2); ctx.globalAlpha = 1; }
    }
  }
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
