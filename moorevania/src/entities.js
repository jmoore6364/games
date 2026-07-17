// Player, enemies, bosses, projectiles, pickups.
// Entities are plain objects with update(g)/draw(g, ctx); `g` is the Game.

import { drawSprite, SPR } from './sprites.js';
import { TILE, WHIPS, SUBS, atkMult } from './world.js';

export const rects = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const SOLID = (ch) => ch === '#' || ch === '%' || ch === '*';

function ladderTop(g, tx, ty) {
  return g.tile(tx, ty) === 'H' && g.tile(tx, ty - 1) !== 'H';
}

// Tile-collision movement for gravity-bound entities.
export function physics(g, e, grav = 0.32) {
  e.vy = Math.min(e.vy + grav, 6.5);

  // horizontal
  e.x += e.vx;
  if (e.vx !== 0) {
    const edgeX = e.vx > 0 ? e.x + e.w : e.x;
    const tx = Math.floor(edgeX / TILE);
    for (let ty = Math.floor(e.y / TILE); ty <= Math.floor((e.y + e.h - 1) / TILE); ty++) {
      if (SOLID(g.tile(tx, ty))) {
        e.x = e.vx > 0 ? tx * TILE - e.w - 0.01 : (tx + 1) * TILE + 0.01;
        e.hitWall = true;
        e.vx = 0;
        break;
      }
    }
  }

  // vertical
  const prevBottom = e.y + e.h;
  e.y += e.vy;
  e.grounded = false;
  if (e.vy >= 0) {
    const ty = Math.floor((e.y + e.h) / TILE);
    for (let tx = Math.floor((e.x + 1) / TILE); tx <= Math.floor((e.x + e.w - 1) / TILE); tx++) {
      const ch = g.tile(tx, ty);
      const top = ty * TILE;
      const oneWay = ch === '=' || ladderTop(g, tx, ty);
      if (SOLID(ch) || (oneWay && prevBottom <= top + 0.5 && !e.dropThrough)) {
        e.y = top - e.h;
        e.vy = 0;
        e.grounded = true;
        break;
      }
    }
  } else {
    const ty = Math.floor(e.y / TILE);
    for (let tx = Math.floor((e.x + 1) / TILE); tx <= Math.floor((e.x + e.w - 1) / TILE); tx++) {
      if (SOLID(g.tile(tx, ty))) {
        e.y = (ty + 1) * TILE + 0.01;
        e.vy = 0;
        break;
      }
    }
  }
}

// Is there floor just past the entity's leading edge? (walkers turning at ledges)
function ledgeAhead(g, e) {
  const px = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
  const tx = Math.floor(px / TILE);
  const ty = Math.floor((e.y + e.h + 2) / TILE);
  const ch = g.tile(tx, ty);
  return SOLID(ch) || ch === '=' || ch === 'H' || ch === '~';
}

// ============================== PLAYER ==============================

export class Player {
  constructor() {
    this.x = 0; this.y = 0; this.w = 10; this.h = 20;
    this.vx = 0; this.vy = 0; this.dir = 1;
    this.grounded = false;
    this.state = 'normal'; // normal | whip | hurt | climb | dead
    this.whipT = 0;
    this.crouch = false;
    this.invuln = 0;
    this.laurelT = 0;
    this.waterT = 0;
    this.animT = 0;
    this.deadT = 0;
    this.lastSafe = null;
  }

  hurtbox() {
    const c = this.crouch ? 7 : 0;
    return { x: this.x, y: this.y + c, w: this.w, h: this.h - c };
  }

  whipbox(g) {
    if (this.state !== 'whip' || this.whipT < 8 || this.whipT > 16) return null;
    const reach = WHIPS[g.save.whip].reach;
    const wy = this.y + (this.crouch ? 12 : 5);
    return this.dir > 0
      ? { x: this.x + this.w, y: wy, w: reach, h: 8 }
      : { x: this.x - reach, y: wy, w: reach, h: 8 };
  }

  hurt(g, dmg, fromX) {
    if (this.invuln > 0 || this.laurelT > 0 || this.state === 'dead' || g.state !== 'play') return;
    if (g.night && g.save.flags.amulet) dmg = Math.ceil(dmg / 2); // the Moon Amulet wards the night
    g.save.hp -= dmg;
    g.sound.hurt();
    g.shake = 6;
    if (g.save.hp <= 0) {
      g.save.hp = 0;
      this.state = 'dead';
      this.deadT = 0;
      this.vx = 0; this.vy = -4;
      g.onPlayerDead();
      return;
    }
    this.state = 'hurt';
    this.hurtT = 0;
    this.invuln = 70;
    this.crouch = false;
    this.vx = (this.x + this.w / 2 < fromX ? -1 : 1) * 2.2;
    this.vy = -2.6;
  }

  update(g, inp) {
    this.animT++;
    if (this.invuln > 0) this.invuln--;
    if (this.laurelT > 0) this.laurelT--;

    if (this.state === 'dead') {
      this.deadT++;
      if (this.y < g.zone.h * TILE + 60) physics(g, this);
      return;
    }

    if (this.state === 'hurt') {
      this.hurtT++;
      physics(g, this);
      if (this.hurtT > 24 && this.grounded) { this.state = 'normal'; this.vx = 0; }
      this.hazards(g);
      return;
    }

    // ladder handling
    const cx = Math.floor((this.x + this.w / 2) / TILE);
    const cyMid = Math.floor((this.y + this.h / 2) / TILE);
    const cyFeet = Math.floor((this.y + this.h + 2) / TILE);
    const onLadder = g.tile(cx, cyMid) === 'H' || g.tile(cx, cyFeet) === 'H';

    if (this.state === 'climb') {
      this.vx = 0; this.vy = 0;
      let move = 0;
      if (inp.down('up')) move = -1.1;
      else if (inp.down('down')) move = 1.1;
      this.y += move;
      if (move !== 0 && this.animT % 12 === 0) g.sound.stairs();
      // land on solid floor when climbing down
      if (move > 0) {
        const fy = Math.floor((this.y + this.h) / TILE);
        const fch = g.tile(cx, fy);
        if (fch === '#' || fch === '%' || fch === '*') {
          this.y = fy * TILE - this.h;
          this.state = 'normal';
          this.grounded = true;
        }
      }
      // step off at top
      const midNow = g.tile(cx, Math.floor((this.y + this.h / 2) / TILE));
      const feetNow = g.tile(cx, Math.floor((this.y + this.h - 1) / TILE));
      if (midNow !== 'H' && feetNow !== 'H') {
        this.state = 'normal';
        this.vy = 0;
      }
      if (inp.pressed('jump')) { this.state = 'normal'; this.vy = -2; }
      this.hazards(g);
      return;
    }

    if (this.state === 'whip') {
      this.whipT++;
      if (this.grounded) this.vx = 0;
      physics(g, this);
      if (this.whipT === 8) g.sound.whip();
      if (this.whipT > 22) { this.state = 'normal'; }
      this.hazards(g);
      return;
    }

    // normal
    const inWater = g.tile(cx, cyMid) === '~' || g.tile(cx, Math.floor((this.y + this.h - 2) / TILE)) === '~';
    const speed = inWater ? 0.65 : 1.3;

    this.crouch = this.grounded && inp.down('down') && !onLadder;
    if (this.crouch) {
      this.vx = 0;
    } else if (inp.down('left')) { this.vx = -speed; this.dir = -1; }
    else if (inp.down('right')) { this.vx = speed; this.dir = 1; }
    else this.vx = 0;

    if (inp.pressed('jump') && this.grounded && !this.crouch) {
      this.vy = -5.25;
      this.grounded = false;
    }

    // grab ladder
    if (onLadder && (inp.down('up') || (inp.down('down') && !this.grounded))) {
      const feetOnLadderTop = ladderTop(g, cx, cyFeet) && this.grounded;
      if (!this.grounded || feetOnLadderTop || g.tile(cx, cyMid) === 'H') {
        this.state = 'climb';
        this.crouch = false;
        this.x = cx * TILE + (TILE - this.w) / 2;
        this.vx = 0; this.vy = 0;
        if (inp.down('down') && feetOnLadderTop) this.y += 6;
        return;
      }
    }
    // climb down through a ladder-top platform
    if (this.grounded && inp.down('down') && ladderTop(g, cx, cyFeet)) {
      this.state = 'climb';
      this.x = cx * TILE + (TILE - this.w) / 2;
      this.y += 6;
      this.vx = 0; this.vy = 0;
      return;
    }

    if (inp.pressed('whip')) {
      this.startWhip(g, inp);
    }

    physics(g, this);
    this.hazards(g);

    // remember safe footing for water-death respawn
    if (this.grounded && !inWater) {
      const under = g.tile(cx, Math.floor((this.y + this.h + 2) / TILE));
      if (under === '#' || under === '%' || under === '=') this.lastSafe = { x: this.x, y: this.y };
    }
  }

  startWhip(g, inp) {
    // Up+attack throws the sub-weapon (classic).
    if (inp.down('up') && g.save.sub) { g.throwSub(); return; }
    this.state = 'whip';
    this.whipT = 0;
  }

  hazards(g) {
    const cx = Math.floor((this.x + this.w / 2) / TILE);
    const feetY = Math.floor((this.y + this.h - 2) / TILE);
    const ch = g.tile(cx, feetY);
    const below = g.tile(cx, Math.floor((this.y + this.h + 1) / TILE));

    if (ch === '~') {
      this.waterT++;
      if (this.waterT % 50 === 0 && this.laurelT <= 0) {
        g.save.hp = Math.max(1, g.save.hp - 2);
        g.sound.hurt();
        g.flash = 4;
      }
    } else this.waterT = 0;

    if (ch === 'W' || this.y > g.zone.h * TILE + 8) {
      g.drown();
      return;
    }
    if (ch === '^' || below === '^') {
      this.hurt(g, 8, this.x + (this.dir > 0 ? -10 : 10));
    }
  }

  draw(g, ctx) {
    if (this.invuln > 0 && (g.frame & 3) < 2 && this.state !== 'dead') return;
    const dx = this.x - 3, dy = this.y + this.h - 22;
    let spr = 'p_idle';
    if (this.state === 'dead') spr = 'p_hurt';
    else if (this.state === 'hurt') spr = 'p_hurt';
    else if (this.state === 'climb') spr = (Math.floor(this.y / 8) & 1) ? 'p_climb1' : 'p_climb2';
    else if (this.state === 'whip') spr = this.whipT < 8 ? 'p_whip1' : 'p_whip2';
    else if (this.crouch) spr = 'p_crouch';
    else if (!this.grounded) spr = 'p_jump';
    else if (Math.abs(this.vx) > 0.1) spr = (Math.floor(this.animT / 8) & 1) ? 'p_walk1' : 'p_walk2';

    if (this.laurelT > 0 && (g.frame & 7) < 4) {
      ctx.globalAlpha = 0.7;
    }
    if (spr === 'p_crouch') drawSprite(ctx, spr, dx, this.y + this.h - 14, this.dir < 0);
    else drawSprite(ctx, spr, dx, dy, this.dir < 0);
    ctx.globalAlpha = 1;

    // the whip itself
    if (this.state === 'whip') {
      const whip = WHIPS[g.save.whip];
      const wy = this.y + (this.crouch ? 13 : 8);
      const sx = this.dir > 0 ? this.x + this.w : this.x;
      ctx.fillStyle = whip.color;
      if (this.whipT < 8) {
        // wind-up: whip dangles behind
        const bx = this.dir > 0 ? this.x - 4 : this.x + this.w;
        for (let i = 0; i < 4; i++) ctx.fillRect(bx - this.dir * i, wy - 8 + i * 3, 2, 3);
      } else if (this.whipT <= 16) {
        const reach = whip.reach;
        const segs = Math.floor(reach / 4);
        for (let i = 0; i < segs; i++) {
          const px = sx + this.dir * i * 4;
          const wob = Math.sin(i * 0.9 + this.whipT) * 1.2;
          ctx.fillRect(px, wy + wob, 3, 2);
        }
        // tip
        ctx.fillStyle = g.save.whip >= 2 ? '#e8e8f8' : whip.color;
        ctx.fillRect(sx + this.dir * (segs * 4), wy - 1, 4, 4);
        if (g.save.whip >= 3 && (g.frame & 1)) {
          ctx.fillStyle = g.save.whip === 4 ? '#c03028' : '#e85818';
          ctx.fillRect(sx + this.dir * (segs * 4) + 1, wy - 4, 2, 3);
        }
      }
    }
  }
}

// ============================== ENEMIES ==============================

const STATS = {
  zombie:    { hp: 2, dmg: 4, exp: 3, hearts: 1, w: 10, h: 20 },
  wolf:      { hp: 3, dmg: 5, exp: 6, hearts: 1, w: 20, h: 10 },
  bat:       { hp: 1, dmg: 3, exp: 3, hearts: 1, w: 12, h: 8 },
  crow:      { hp: 2, dmg: 4, exp: 5, hearts: 1, w: 10, h: 8 },
  skeleton:  { hp: 4, dmg: 5, exp: 8, hearts: 2, w: 10, h: 18 },
  ghost:     { hp: 3, dmg: 4, exp: 7, hearts: 2, w: 12, h: 12 },
  merman:    { hp: 3, dmg: 5, exp: 8, hearts: 2, w: 10, h: 16 },
  mudman:    { hp: 8, dmg: 6, exp: 10, hearts: 3, w: 13, h: 12 },
  spider:    { hp: 2, dmg: 4, exp: 5, hearts: 1, w: 12, h: 9 },
  fireskull: { hp: 3, dmg: 6, exp: 9, hearts: 2, w: 11, h: 12 },
  knight:    { hp: 12, dmg: 8, exp: 20, hearts: 4, w: 11, h: 20 },
  mummy:     { hp: 8, dmg: 7, exp: 15, hearts: 3, w: 10, h: 18 },
  redskeleton: { hp: 5, dmg: 6, exp: 12, hearts: 2, w: 10, h: 18 },
  crab:      { hp: 4, dmg: 5, exp: 8, hearts: 2, w: 14, h: 8 },
  wraith:    { hp: 4, dmg: 6, exp: 10, hearts: 2, w: 12, h: 11 },
  gravelord: { hp: 55, dmg: 9, exp: 150, hearts: 0, w: 18, h: 22, boss: true },
  batlord:   { hp: 42, dmg: 8, exp: 120, hearts: 15, w: 26, h: 15, boss: true },
  reaper:    { hp: 70, dmg: 10, exp: 220, hearts: 20, w: 18, h: 26, boss: true },
  bonedragon:{ hp: 100, dmg: 10, exp: 350, hearts: 25, w: 17, h: 12, boss: true },
  vorlok:    { hp: 110, dmg: 12, exp: 0, hearts: 0, w: 14, h: 26, boss: true },
  demon:     { hp: 95, dmg: 14, exp: 999, hearts: 0, w: 24, h: 22, boss: true },
  nyxara:    { hp: 130, dmg: 12, exp: 500, hearts: 0, w: 14, h: 24, boss: true },
};

export function spawnEnemy(g, type, tx, ty, opts = {}) {
  const s = STATS[type];
  const e = {
    type, w: s.w, h: s.h,
    x: tx * TILE + (TILE - s.w) / 2,
    y: ty * TILE + TILE - s.h,
    vx: 0, vy: 0, dir: -1,
    hp: s.hp, maxhp: s.hp, dmg: s.dmg, exp: s.exp, hearts: s.hearts,
    boss: !!s.boss, t: 0, state: 0, hitT: 0, dead: false,
    ambient: !!opts.ambient,
  };
  if (g.night && !e.boss) {
    e.hp = e.maxhp = Math.ceil(e.hp * 2);
    e.dmg = Math.ceil(e.dmg * 1.4);
    e.hearts *= 2;
    e.exp = Math.ceil(e.exp * 1.5);
  }
  if (type === 'zombie' && opts.ambient) e.emerge = 40;
  if (type === 'bat' || type === 'crow') { e.perch = true; e.swoopT = 0; }
  if (type === 'redskeleton') { e.revives = 2; e.collapsed = 0; }
  if (type === 'spider') { e.anchorY = e.y; e.thread = 0; }
  if (type === 'batlord') { e.ax = e.x; e.ay = e.y; }
  if (type === 'bonedragon') { e.ax = e.x; e.ay = e.y; e.hist = []; }
  return e;
}

function dropLoot(g, e) {
  const r = Math.random();
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (e.boss) {
    for (let i = 0; i < 5; i++) g.addPickup('bigheart', cx - 20 + i * 10, cy - 10);
    return;
  }
  if (r < 0.08) g.addPickup('tonic', cx, cy);
  else if (r < 0.4) g.addPickup(e.hearts >= 3 ? 'bigheart' : 'heart', cx, cy);
  else if (r < 0.55 && e.hearts >= 2) g.addPickup('heart', cx, cy);
}

export function damageEnemy(g, e, dmg) {
  if (e.dead || e.spawnGrace > 0 || e.collapsed > 0) return false;
  // snapclaw shells turn every blow while hunkered down
  if (e.type === 'crab' && e.state === 0) {
    e.hitT = 4;
    g.sound.stairs();
    g.spark(e.x + e.w / 2, e.y, '#d8d8e8');
    return false;
  }
  e.hp -= dmg;
  e.hitT = 8;
  // red skeletons collapse into bones and rise again
  if (e.hp <= 0 && e.type === 'redskeleton' && e.revives > 0) {
    e.revives--;
    e.collapsed = 220;
    e.vx = 0;
    g.sound.breakBlock();
    g.burst(e.x + e.w / 2, e.y + e.h / 2, 6, '#c03028');
    return true;
  }
  if (e.hp <= 0) {
    e.dead = true;
    if (!g.save.kills) g.save.kills = {};
    g.save.kills[e.type] = (g.save.kills[e.type] || 0) + 1;
    g.sound[e.boss ? 'bossDie' : 'enemyDie']();
    g.burst(e.x + e.w / 2, e.y + e.h / 2, e.boss ? 26 : 8, '#e85818');
    dropLoot(g, e);
    g.gainExp(e.exp);
    if (e.boss) g.onBossDead(e);
  } else {
    g.sound.whipHit();
  }
  return true;
}

export function updateEnemy(g, e) {
  e.t++;
  if (e.hitT > 0) e.hitT--;
  const p = g.player;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
  const dx = pcx - ecx, dy = pcy - ecy;

  switch (e.type) {
    case 'zombie': {
      if (e.emerge > 0) { e.emerge--; return; }
      e.vx = Math.sign(dx) * 0.35 || 0.35;
      e.dir = Math.sign(e.vx);
      physics(g, e);
      break;
    }
    case 'crab': {
      if (e.state === 0) { // scuttling, shelled
        e.vx = (Math.sign(dx) || e.dir) * 0.5;
        e.dir = Math.sign(e.vx);
        if (e.hitWall || !ledgeAhead(g, e)) { e.vx = 0; e.hitWall = false; }
        if (e.t % 170 === 0 && Math.abs(dx) < 120) { e.state = 1; e.stateT = 0; }
      } else { // reared up to pinch: vulnerable
        e.vx = 0;
        if (++e.stateT > 70) e.state = 0;
      }
      physics(g, e);
      break;
    }
    case 'mudman': {
      e.vx = Math.sign(dx) * 0.25 || 0.25;
      e.dir = Math.sign(e.vx);
      physics(g, e);
      break;
    }
    case 'mummy': {
      e.vx = Math.sign(dx) * 0.5;
      e.dir = Math.sign(e.vx) || e.dir;
      physics(g, e);
      break;
    }
    case 'knight': {
      if (e.state === 0) {
        e.vx = e.dir * 0.3;
        if (e.hitWall || !ledgeAhead(g, e)) { e.dir *= -1; e.vx = e.dir * 0.3; }
        e.hitWall = false;
        if (Math.abs(dx) < 130 && Math.abs(dy) < 30 && e.t % 170 === 0) {
          e.dir = Math.sign(dx) || e.dir;
          g.addProj({ kind: 'spear', owner: 'enemy', x: ecx, y: e.y + 4, vx: e.dir * 2.2, vy: 0, dmg: e.dmg });
          g.sound.throwSub();
        }
      }
      physics(g, e);
      break;
    }
    case 'wolf': {
      if (e.state === 0) {
        e.vx = 0;
        if (Math.abs(dx) < 96 && Math.abs(dy) < 40) { e.state = 1; e.dir = Math.sign(dx) || 1; }
      } else {
        e.vx = e.dir * 2.1;
        if (e.grounded && e.t % 26 === 0) e.vy = -2.8;
        if (e.hitWall) { e.dir *= -1; e.hitWall = false; }
        if (Math.abs(dx) > 190) e.state = 0;
      }
      physics(g, e);
      break;
    }
    case 'skeleton': {
      e.dir = Math.sign(dx) || e.dir;
      if (e.state === 0) {
        e.vx = (Math.abs(dx) > 70 ? Math.sign(dx) : -Math.sign(dx)) * 0.4;
        if (!ledgeAhead(g, e) || e.hitWall) { e.vx = 0; e.hitWall = false; }
        if (e.t % 130 === 0 && Math.abs(dx) < 170) {
          e.state = 1; e.stateT = 0;
        }
      } else {
        e.vx = 0;
        if (++e.stateT === 12) {
          g.addProj({ kind: 'bone', owner: 'enemy', x: ecx, y: e.y, vx: Math.sign(dx) * (1 + Math.random()), vy: -3.6, dmg: e.dmg, grav: true });
          g.sound.throwSub();
        }
        if (e.stateT > 26) e.state = 0;
      }
      physics(g, e);
      break;
    }
    case 'bat': case 'crow': {
      const range = e.type === 'bat' ? 90 : 120;
      if (e.perch) {
        if (Math.abs(dx) < range && dy > -20) { e.perch = false; e.swoopT = 0; }
      } else {
        e.swoopT++;
        const sp = e.type === 'bat' ? 1.1 : 1.5;
        e.vx += Math.sign(dx) * 0.04;
        e.vx = Math.max(-sp, Math.min(sp, e.vx));
        e.vy = Math.sin(e.swoopT / 14) * 1.2 + Math.sign(dy) * 0.3;
        e.x += e.vx; e.y += e.vy;
        if (e.y < 8) e.y = 8;
      }
      break;
    }
    case 'ghost': case 'wraith': {
      // drifts through walls, always toward the player
      const sp = e.type === 'wraith' ? 1.0 : 0.55;
      const len = Math.hypot(dx, dy) || 1;
      e.x += (dx / len) * sp + (e.type === 'wraith' ? Math.sin(e.t / 9) * 0.5 : 0);
      e.y += (dy / len) * sp + Math.sin(e.t / 20) * 0.3;
      break;
    }
    case 'redskeleton': {
      if (e.collapsed > 0) {
        e.collapsed--;
        if (e.collapsed === 0) {
          e.hp = e.maxhp;
          g.burst(ecx, ecy, 6, '#e8e0c8');
          g.sound.breakBlock();
        }
        physics(g, e);
        return;
      }
      e.dir = Math.sign(dx) || e.dir;
      if (e.state === 0) {
        e.vx = Math.sign(dx) * 0.55;
        if (!ledgeAhead(g, e) || e.hitWall) { e.vx = 0; e.hitWall = false; }
        if (e.t % 100 === 0 && Math.abs(dx) < 180) { e.state = 1; e.stateT = 0; }
      } else {
        e.vx = 0;
        if (++e.stateT === 10) {
          g.addProj({ kind: 'bone', owner: 'enemy', x: ecx, y: e.y, vx: Math.sign(dx) * (1.2 + Math.random()), vy: -3.8, dmg: e.dmg, grav: true });
          g.sound.throwSub();
        }
        if (e.stateT > 22) e.state = 0;
      }
      physics(g, e);
      break;
    }
    case 'gravelord': {
      if (e.grounded && e.t % 75 === 0) {
        e.vy = -4.6;
        e.vx = Math.sign(dx) * 1.3;
        g.sound.throwSub();
      }
      if (e.grounded && e.vx !== 0 && e.t % 75 === 20) {
        e.vx = 0;
        g.shake = 6;
        for (const spread of [-0.5, 0, 0.5]) {
          g.addProj({ kind: 'bone', owner: 'enemy', x: ecx, y: e.y + 2, vx: Math.sign(dx) * 1.4 + spread, vy: -4.2, dmg: e.dmg, grav: true });
        }
      }
      physics(g, e, 0.26);
      break;
    }
    case 'merman': {
      if (e.state === 0) { // lurking in water
        e.vy = 0; e.vx = 0;
        if (e.t % 140 === 0 && Math.abs(dx) < 180) {
          e.state = 1;
          e.vy = -6.6;
          e.vx = Math.sign(dx) * 0.8;
          e.dir = Math.sign(dx) || 1;
          g.burst(ecx, e.y + 4, 5, '#78a8e8');
        }
      } else {
        e.vy += 0.28;
        e.x += e.vx; e.y += e.vy;
        if (e.state === 1 && e.vy > 0 && Math.random() < 0.02) {
          g.addProj({ kind: 'fireball', owner: 'enemy', x: ecx, y: e.y + 4, vx: Math.sign(dx) * 1.6, vy: 0, dmg: e.dmg });
        }
        // landed back in water / on ground?
        const ch = g.tile(Math.floor(ecx / TILE), Math.floor((e.y + e.h) / TILE));
        if (e.vy > 0 && (ch === '~' || ch === 'W')) { e.state = 0; e.y = Math.floor((e.y + e.h) / TILE) * TILE - e.h + 6; e.vy = 0; }
        else if (e.vy > 0 && SOLID(ch)) { e.vy = 0; e.state = 2; e.stateT = 0; e.y = Math.floor((e.y + e.h) / TILE) * TILE - e.h; }
        if (e.state === 2) { // brief walk then hop back
          e.vx = Math.sign(dx) * 0.7;
          e.x += e.vx;
          if (++e.stateT > 70) { e.state = 1; e.vy = -5; e.vx = -e.vx; }
        }
        if (e.y > g.zone.h * TILE + 20) e.dead = true;
      }
      break;
    }
    case 'spider': {
      if (e.state === 0) {
        if (Math.abs(dx) < 30 && dy > 0) { e.state = 1; }
      } else if (e.state === 1) { // descend on thread
        e.y += 1.3;
        e.thread = e.y - e.anchorY;
        if (dy < 6 || e.thread > 130) e.state = 2;
      } else if (e.state === 2) { // climb back
        e.y -= 0.9;
        if (e.y <= e.anchorY) { e.y = e.anchorY; e.state = 0; }
      }
      break;
    }
    case 'fireskull': {
      e.vx = e.vx || (Math.sign(dx) || 1) * 1.3;
      e.x += e.vx;
      e.y += Math.sin(e.t / 11) * 1.4;
      const ahead = g.tile(Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / TILE), Math.floor(ecy / TILE));
      if (SOLID(ahead)) e.vx *= -1;
      if (g.frame % 5 === 0) g.spark(ecx - e.vx * 4, ecy, '#e85818');
      break;
    }

    // ---- bosses ----
    case 'batlord': {
      if (e.state === 0) { // figure-8 around anchor
        e.x = e.ax + Math.sin(e.t / 40) * 60;
        e.y = e.ay + Math.sin(e.t / 20) * 24;
        if (e.t % 190 === 0) { e.state = 1; e.sx = e.x; e.sy = e.y; e.stateT = 0; }
        if (e.t % 260 === 130 && g.enemies.filter((x) => x.type === 'bat' && !x.dead).length < 2) {
          const nb = spawnEnemy(g, 'bat', Math.floor(ecx / TILE), Math.floor(ecy / TILE));
          nb.perch = false; nb.ambient = true;
          g.enemies.push(nb);
        }
      } else { // swoop at player and back
        e.stateT++;
        const tt = e.stateT / 46;
        if (tt <= 0.5) {
          e.x = e.sx + (pcx - e.w / 2 - e.sx) * (tt * 2);
          e.y = e.sy + (p.y - e.sy) * (tt * 2);
        } else if (tt <= 1) {
          e.x = pcx - e.w / 2 + (e.sx - (pcx - e.w / 2)) * ((tt - 0.5) * 2);
          e.y = p.y + (e.sy - p.y) * ((tt - 0.5) * 2);
        } else e.state = 0;
      }
      break;
    }
    case 'reaper': {
      e.fadeT = (e.fadeT || 0) - 1;
      if (e.t % 150 === 0) { // teleport near player
        e.x = pcx - e.w / 2 + (Math.random() * 120 - 60);
        e.y = pcy - 40 - Math.random() * 30;
        e.clampRoom(g, e);
        e.fadeT = 20;
        g.burst(e.x + e.w / 2, e.y + e.h / 2, 6, '#8a8a99');
      }
      const len = Math.hypot(dx, dy) || 1;
      e.x += (dx / len) * 0.5;
      e.y += (dy / len) * 0.35 + Math.sin(e.t / 16) * 0.4;
      if (e.t % 110 === 55) {
        g.addProj({ kind: 'sickle', owner: 'enemy', x: ecx, y: ecy, vx: (dx / len) * 2.2, vy: (dy / len) * 2.2 - 0.5, dmg: e.dmg });
        g.sound.throwSub();
      }
      break;
    }
    case 'bonedragon': {
      // head weaves; segments trail along its history
      e.x = e.ax + Math.sin(e.t / 50) * 36 + 18;
      e.y = e.ay + Math.sin(e.t / 23) * 30 + 20;
      e.hist.unshift([e.x, e.y]);
      if (e.hist.length > 60) e.hist.pop();
      if (e.t % 130 === 60) {
        const len = Math.hypot(dx, dy) || 1;
        for (const spread of [-0.35, 0, 0.35]) {
          const ang = Math.atan2(dy, dx) + spread;
          g.addProj({ kind: 'fireball', owner: 'enemy', x: ecx, y: ecy, vx: Math.cos(ang) * 1.7, vy: Math.sin(ang) * 1.7, dmg: e.dmg });
        }
        g.sound.throwSub();
      }
      break;
    }
    case 'vorlok': {
      if (e.t % 160 === 0) { // vanish, reappear
        g.burst(ecx, ecy, 10, '#9048c8');
        e.x = pcx - e.w / 2 + (Math.random() > 0.5 ? 70 : -70) + Math.random() * 30 - 15;
        e.y = e.roomY !== undefined ? e.roomY : e.y;
        e.clampRoom(g, e);
        e.dir = e.x < pcx ? 1 : -1;
      }
      e.dir = Math.sign(dx) || e.dir;
      e.vx = e.dir * 0.3;
      physics(g, e);
      if (e.t % 160 === 70) {
        for (const spread of [-0.3, 0, 0.3]) {
          g.addProj({ kind: 'fireball', owner: 'enemy', x: ecx, y: e.y + 6, vx: e.dir * Math.cos(spread) * 1.9, vy: Math.sin(spread) * 1.9, dmg: e.dmg });
        }
        g.sound.throwSub();
      }
      break;
    }
    case 'nyxara': {
      const frenzy = e.hp < e.maxhp / 2;
      const telAt = frenzy ? 100 : 140;
      if (e.t % telAt === 0) {
        g.burst(ecx, ecy, 12, '#c03028');
        e.x = pcx - e.w / 2 + (Math.random() > 0.5 ? 80 : -80) + Math.random() * 40 - 20;
        e.y = pcy - 50 - Math.random() * 30;
        e.clampRoom(g, e);
        g.burst(e.x + e.w / 2, e.y + e.h / 2, 12, '#c03028');
      }
      e.y += Math.sin(e.t / 18) * 0.5;
      e.dir = Math.sign(dx) || e.dir;
      if (e.t % (frenzy ? 90 : 110) === 55) {
        const n = frenzy ? 6 : 3;
        const base = Math.atan2(dy, dx);
        for (let i = 0; i < n; i++) {
          const ang = frenzy ? (i / n) * Math.PI * 2 : base + (i - 1) * 0.3;
          g.addProj({ kind: 'beam', owner: 'enemy', x: ecx, y: ecy, vx: Math.cos(ang) * 2.6, vy: Math.sin(ang) * 2.6, dmg: e.dmg });
        }
        g.sound.throwSub();
      }
      if (e.t % 260 === 200 && g.enemies.filter((x) => x.type === 'wraith' && !x.dead).length < 2) {
        const w = spawnEnemy(g, 'wraith', Math.floor(ecx / TILE), Math.floor(ecy / TILE));
        w.ambient = true;
        g.enemies.push(w);
      }
      break;
    }
    case 'demon': {
      if (e.grounded && e.t % 90 === 0) {
        e.vy = -6.2;
        e.vx = Math.sign(dx) * 1.6;
      }
      if (e.grounded) e.vx *= 0.8;
      physics(g, e, 0.24);
      if (e.t % 90 === 45) {
        for (const vx of [-1.2, 1.2]) {
          g.addProj({ kind: 'fireball', owner: 'enemy', x: ecx, y: e.y, vx, vy: -3.2, dmg: e.dmg, grav: true });
        }
        g.sound.throwSub();
      }
      break;
    }
  }
}

export function drawEnemy(g, ctx, e) {
  const f2 = Math.floor(e.t / 12) & 1;
  const flip = e.dir > 0;
  if (e.hitT > 0 && (g.frame & 1)) return;
  const dx = Math.round(e.x + e.w / 2), dy = Math.round(e.y + e.h);
  const put = (name, w, h) => drawSprite(ctx, name, dx - w / 2, dy - h, flip);

  switch (e.type) {
    case 'zombie': {
      if (e.emerge > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(e.x - 6, dy - 20 + (e.emerge / 40) * 20 - 0.5, 28, 20);
        ctx.clip();
        put(f2 ? 'zombie1' : 'zombie2', 16, 20);
        ctx.restore();
        return;
      }
      put(f2 ? 'zombie1' : 'zombie2', 16, 20);
      break;
    }
    case 'wolf': put(f2 ? 'wolf1' : 'wolf2', 24, 10); break;
    case 'crab':
      if (e.state === 1) put('crab_up', 16, 10);
      else put(f2 ? 'crab1' : 'crab2', 16, 8);
      break;
    case 'bat': put((Math.floor(e.t / 6) & 1) ? 'bat1' : 'bat2', 16, 10); break;
    case 'crow': put((Math.floor(e.t / 6) & 1) ? 'crow1' : 'crow2', 12, 9); break;
    case 'skeleton': put(f2 ? 'skeleton1' : 'skeleton2', 16, 18); break;
    case 'ghost':
      ctx.globalAlpha = 0.65 + Math.sin(e.t / 10) * 0.15;
      put('ghost', 14, 12);
      ctx.globalAlpha = 1;
      break;
    case 'wraith':
      ctx.globalAlpha = 0.75 + Math.sin(e.t / 8) * 0.15;
      put('wraith', 14, 11);
      ctx.globalAlpha = 1;
      break;
    case 'redskeleton':
      if (e.collapsed > 0) {
        if (e.collapsed < 60 && (e.t & 3) < 2) put(f2 ? 'redskel1' : 'redskel2', 16, 18);
        else put('bonepile', 16, 3);
      } else put(f2 ? 'redskel1' : 'redskel2', 16, 18);
      break;
    case 'gravelord': put((Math.floor(e.t / 10) & 1) ? 'gravelord1' : 'gravelord2', 24, 22); break;
    case 'merman': put('merman', 16, 16); break;
    case 'mudman': put(f2 ? 'mudman1' : 'mudman2', 16, 12); break;
    case 'spider': {
      if (e.state !== 0 || e.thread > 0) {
        ctx.fillStyle = '#b8b8c8';
        ctx.fillRect(dx, e.anchorY - 2, 1, e.y - e.anchorY + 4);
      }
      put('spider', 14, 10);
      break;
    }
    case 'fireskull': put((Math.floor(e.t / 5) & 1) ? 'fireskull1' : 'fireskull2', 12, 10); break;
    case 'knight': put(f2 ? 'knight1' : 'knight2', 16, 20); break;
    case 'mummy': put(f2 ? 'mummy1' : 'mummy2', 16, 17); break;
    case 'batlord': put((Math.floor(e.t / 7) & 1) ? 'batlord1' : 'batlord2', 32, 17); break;
    case 'reaper': {
      ctx.globalAlpha = e.fadeT > 0 ? 0.4 : 0.92;
      put('reaper', 24, 23);
      drawSprite(ctx, 'scythe', dx + (flip ? 6 : -18), dy - 30, flip);
      ctx.globalAlpha = 1;
      break;
    }
    case 'bonedragon': {
      for (let i = 5; i >= 1; i--) {
        const hp = e.hist[Math.min(i * 9, e.hist.length - 1)];
        if (hp) drawSprite(ctx, 'dragonseg', hp[0] + 3, hp[1] + 2, false);
      }
      // neck to anchor
      ctx.fillStyle = '#a09878';
      ctx.fillRect(e.ax - 6, e.ay + 22, 10, 8);
      put('dragonhead', 18, 12);
      break;
    }
    case 'vorlok': put((Math.floor(e.t / 14) & 1) ? 'vorlok1' : 'vorlok2', 20, 26); break;
    case 'nyxara': {
      if (g.frame % 4 === 0) g.spark(dx + (Math.random() - 0.5) * 16, dy - Math.random() * 24, '#c03028');
      put((Math.floor(e.t / 12) & 1) ? 'nyxara1' : 'nyxara2', 20, 24);
      break;
    }
    case 'demon': put((Math.floor(e.t / 8) & 1) ? 'demon1' : 'demon2', 32, 22); break;
  }
}

// ============================== PROJECTILES ==============================

export function updateProj(g, pr) {
  pr.t = (pr.t || 0) + 1;
  if (pr.grav) pr.vy += 0.22;
  if (pr.kind === 'cross') {
    pr.vx -= pr.dir * 0.09;
    if (pr.dir > 0 ? pr.vx < -3 : pr.vx > 3) pr.dead = true;
  }
  if (pr.kind === 'flame') {
    if (pr.t > 60) pr.dead = true;
    return;
  }
  pr.x += pr.vx;
  pr.y += pr.vy;

  const tx = Math.floor(pr.x / TILE), ty = Math.floor(pr.y / TILE);
  const ch = g.tile(tx, ty);
  if (SOLID(ch)) {
    if (pr.kind === 'holywater') {
      g.addProj({ kind: 'flame', owner: 'player', x: pr.x - 6, y: ty * TILE - 14, w: 14, h: 14, dmg: pr.dmg, t: 0 });
      g.sound.flame();
    }
    if (pr.kind !== 'sickle' && pr.kind !== 'cross') pr.dead = true;
  }
  if (pr.x < -40 || pr.x > g.zone.w * TILE + 40 || pr.y > g.zone.h * TILE + 40 || pr.y < -60) pr.dead = true;
  if (pr.t > 420) pr.dead = true;
}

export function drawProj(g, ctx, pr) {
  const x = Math.round(pr.x), y = Math.round(pr.y);
  switch (pr.kind) {
    case 'dagger': drawSprite(ctx, 'dagger_i', x - 5, y - 2, pr.vx < 0); break;
    case 'axe': {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(pr.t / 5);
      drawSprite(ctx, 'axe_i', -5, -4, false);
      ctx.restore();
      break;
    }
    case 'holywater': drawSprite(ctx, 'holy_i', x - 4, y - 4, false); break;
    case 'cross': {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(pr.t / 4);
      drawSprite(ctx, 'cross_i', -4, -4, false);
      ctx.restore();
      break;
    }
    case 'flame': {
      const h = 10 + Math.sin(pr.t / 2 + x) * 4;
      ctx.fillStyle = (g.frame & 2) ? '#e85818' : '#f8b800';
      ctx.fillRect(x, y + 14 - h, 4, h);
      ctx.fillRect(x + 5, y + 14 - h * 0.7, 4, h * 0.7);
      ctx.fillRect(x + 10, y + 14 - h * 0.9, 4, h * 0.9);
      break;
    }
    case 'bone': {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(pr.t / 6);
      drawSprite(ctx, 'bone', -4, -2, false);
      ctx.restore();
      break;
    }
    case 'sickle': {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(pr.t / 4);
      drawSprite(ctx, 'sickle', -4, -3, false);
      ctx.restore();
      break;
    }
    case 'spear': drawSprite(ctx, 'spear', x - 6, y - 1, pr.vx < 0); break;
    case 'fireball': {
      ctx.fillStyle = (g.frame & 2) ? '#e85818' : '#f8b800';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, 7);
      ctx.fill();
      if (g.frame % 3 === 0) g.spark(x - pr.vx * 3, y - pr.vy * 3, '#e85818');
      break;
    }
    case 'beam': {
      ctx.strokeStyle = (g.frame & 2) ? '#c03028' : '#f8d0d0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - pr.vx * 3, y - pr.vy * 3);
      ctx.lineTo(x + pr.vx * 2, y + pr.vy * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      break;
    }
  }
}

export function projRect(pr) {
  if (pr.kind === 'flame') return { x: pr.x, y: pr.y, w: 14, h: 14 };
  const s = pr.kind === 'axe' || pr.kind === 'cross' ? 9 : 7;
  return { x: pr.x - s / 2, y: pr.y - s / 2, w: s, h: s };
}
