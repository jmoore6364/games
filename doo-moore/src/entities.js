// entities.js — enemies (imps), their AI, and projectiles.
import { isSolid } from './map.js';

export function lineOfSight(level, x0, y0, x1, y1) {
  // step along the ray; if we hit a solid tile before reaching target, no LOS.
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.ceil(dist / 0.1);
  const sx = dx / steps, sy = dy / steps;
  let x = x0, y = y0;
  for (let i = 0; i < steps; i++) {
    x += sx; y += sy;
    if (isSolid(level, Math.floor(x), Math.floor(y))) return false;
  }
  return true;
}

export class Enemy {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.hp = 30;
    this.state = 'idle';     // idle | chase | attack | dead
    this.anim = Math.random() * 2;
    this.hitTimer = 0;       // flash white when hit
    this.deadTimer = 0;
    this.deadPhase = 0;
    this.attackCd = 1 + Math.random();
    this.speed = 1.5;
    this.radius = 0.3;
    this.alive = true;
    this.pain = 0;           // brief stagger
  }

  hurt(dmg, ctx) {
    if (this.state === 'dead') return;
    this.hp -= dmg;
    this.hitTimer = 0.12;
    if (this.hp <= 0) {
      this.state = 'dead'; this.alive = false; this.deadTimer = 0; this.deadPhase = 0;
      if (ctx && ctx.audio) ctx.audio.death();
      if (ctx) ctx.onKill();
    } else {
      this.pain = 0.25;
      if (this.state === 'idle') this.state = 'chase';
      if (ctx && ctx.audio && Math.random() < 0.6) ctx.audio.pain();
    }
  }

  update(dt, ctx) {
    this.anim += dt;
    if (this.hitTimer > 0) this.hitTimer -= dt;

    if (this.state === 'dead') {
      this.deadTimer += dt;
      if (this.deadTimer > 0.18) this.deadPhase = 1;
      return;
    }

    const p = ctx.player;
    const ddx = p.x - this.x, ddy = p.y - this.y;
    const distToPlayer = Math.hypot(ddx, ddy);
    const canSee = distToPlayer < 12 && lineOfSight(ctx.level, this.x, this.y, p.x, p.y);

    if (this.state === 'idle') {
      if (canSee) { this.state = 'chase'; if (ctx.audio) ctx.audio.sight(); }
      else return;
    }

    if (this.pain > 0) { this.pain -= dt; return; } // stagger, no move this frame

    this.attackCd -= dt;

    // melee
    if (distToPlayer < 1.1) {
      if (this.attackCd <= 0) {
        this.attackCd = 1.1;
        ctx.damagePlayer(9 + Math.random() * 6, 'melee');
      }
      return;
    }

    // ranged fireball
    if (canSee && distToPlayer < 9 && this.attackCd <= 0) {
      this.attackCd = 1.6 + Math.random() * 0.8;
      const d = distToPlayer || 1;
      const spread = (Math.random() - 0.5) * 0.15;
      const nx = ddx / d, ny = ddy / d;
      const cos = Math.cos(spread), sin = Math.sin(spread);
      ctx.spawnFireball(this.x, this.y, nx * cos - ny * sin, nx * sin + ny * cos);
      return;
    }

    // chase (move toward player, slide along walls)
    if (canSee || this.state === 'chase') {
      const d = distToPlayer || 1;
      const mvx = (ddx / d) * this.speed * dt;
      const mvy = (ddy / d) * this.speed * dt;
      this._tryMove(ctx.level, mvx, mvy);
    }
  }

  _tryMove(level, mvx, mvy) {
    const r = this.radius;
    const nx = this.x + mvx;
    if (!isSolid(level, Math.floor(nx + Math.sign(mvx) * r), Math.floor(this.y))) this.x = nx;
    const ny = this.y + mvy;
    if (!isSolid(level, Math.floor(this.x), Math.floor(ny + Math.sign(mvy) * r))) this.y = ny;
  }

  // pick sprite frame from textures.imp
  sprite(tex) {
    const imp = tex.imp;
    if (this.state === 'dead') return imp.dead[this.deadPhase];
    if (this.hitTimer > 0) return imp.hit;
    if (this.pain > 0) return imp.attack; // arms up (about to strike / staggered)
    const frame = (Math.floor(this.anim * 4) % 2);
    return imp.walk[frame];
  }
}

export class Fireball {
  constructor(x, y, dx, dy) {
    this.x = x; this.y = y;
    this.dx = dx; this.dy = dy;
    this.speed = 4.2;
    this.life = 5;
    this.dead = false;
    this.anim = 0;
  }
  update(dt, ctx) {
    this.anim += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const mvx = this.dx * this.speed * dt, mvy = this.dy * this.speed * dt;
    if (isSolid(ctx.level, Math.floor(this.x + mvx), Math.floor(this.y + mvy))) { this.dead = true; return; }
    this.x += mvx; this.y += mvy;
    const p = ctx.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < 0.4) {
      this.dead = true;
      ctx.damagePlayer(10 + Math.random() * 8, 'fire');
    }
  }
}
