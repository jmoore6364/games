// player.js — first-person movement, AABB-vs-voxel collision, camera,
// creative flight, and the Tether grapple. Pure logic, NO DOM.

import { B, isSolid, WY } from './world.js';

export const PW = 0.6;          // player width (x/z)
export const PH = 1.8;          // player height
export const EYE = 1.62;        // eye height above feet
const HALF = PW / 2;

export class Player {
  constructor(spawn) {
    this.x = spawn.x; this.y = spawn.y; this.z = spawn.z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = -Math.PI / 4; this.pitch = -0.15;
    this.onGround = false;
    this.flying = false;
    this.creative = false;
    this.health = 20; this.maxHealth = 20;
    this.inWater = false;
    this.spawn = { ...spawn };
    this.tether = null;          // { x,y,z } anchor while pulling
    this.tetherCool = 0;
    this.hurtFlash = 0;
    this.walkPhase = 0;
    this.footTimer = 0;
    this.lastFoot = 0;
  }

  eyeX() { return this.x; }
  eyeY() { return this.y + EYE; }
  eyeZ() { return this.z; }
  forward() {
    const cp = Math.cos(this.pitch);
    return [Math.cos(this.yaw) * cp, Math.sin(this.pitch), Math.sin(this.yaw) * cp];
  }

  // collision test: is the AABB at (x,y,z) intersecting any solid voxel?
  _collides(world, x, y, z) {
    const x0 = Math.floor(x - HALF), x1 = Math.floor(x + HALF);
    const y0 = Math.floor(y), y1 = Math.floor(y + PH - 0.001);
    const z0 = Math.floor(z - HALF), z1 = Math.floor(z + HALF);
    for (let yy = y0; yy <= y1; yy++)
      for (let zz = z0; zz <= z1; zz++)
        for (let xx = x0; xx <= x1; xx++)
          if (isSolid(world.get(xx, yy, zz))) return true;
    return false;
  }

  // move one axis with sub-stepping; returns true if blocked.
  _moveAxis(world, ax, d) {
    if (d === 0) return false;
    const steps = Math.max(1, Math.ceil(Math.abs(d) / 0.2));
    const inc = d / steps;
    let blocked = false;
    for (let i = 0; i < steps; i++) {
      const nx = this.x + (ax === 0 ? inc : 0);
      const ny = this.y + (ax === 1 ? inc : 0);
      const nz = this.z + (ax === 2 ? inc : 0);
      if (!this._collides(world, nx, ny, nz)) {
        this.x = nx; this.y = ny; this.z = nz;
      } else {
        blocked = true;
        break;
      }
    }
    return blocked;
  }

  // input: {fwd,back,left,right,jump,sneak, dt}
  update(world, input, dt) {
    dt = Math.min(dt, 0.05);
    const speed = this.flying ? 9 : (input.sneak && this.onGround ? 2.2 : 5.2);
    // desired horizontal direction from yaw
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    let mf = (input.fwd ? 1 : 0) - (input.back ? 1 : 0);
    let ms = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const ml = Math.hypot(mf, ms);
    let wishX = 0, wishZ = 0;
    if (ml > 0) {
      mf /= ml; ms /= ml;
      wishX = (cy * mf - sy * ms);
      wishZ = (sy * mf + cy * ms);
    }

    // check feet-in-water for slowdown
    this.inWater = world.get(Math.floor(this.x), Math.floor(this.y + 0.2), Math.floor(this.z)) === B.WATER;
    const waterMul = this.inWater ? 0.5 : 1;

    if (this.flying) {
      this.vx = wishX * speed * waterMul;
      this.vz = wishZ * speed * waterMul;
      this.vy = 0;
      if (input.jump) this.vy = 7;
      if (input.sneak) this.vy = -7;
    } else {
      // accelerate toward wish velocity (some inertia)
      const accel = this.onGround ? 0.45 : 0.16;
      this.vx += (wishX * speed * waterMul - this.vx) * accel;
      this.vz += (wishZ * speed * waterMul - this.vz) * accel;
      // gravity
      const g = this.inWater ? 12 : 26;
      this.vy -= g * dt;
      if (this.inWater && this.vy < -3) this.vy = -3;
      if (input.jump && this.onGround) { this.vy = 8.2; this.onGround = false; }
      else if (input.jump && this.inWater) this.vy = 4;
    }

    // tether pull
    if (this.tether) {
      const dx = this.tether.x - this.x, dy = this.tether.y - (this.y + EYE), dz = this.tether.z - this.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 1.6 || this.tetherTime <= 0) {
        this.tether = null;
      } else {
        const pull = 18;
        this.vx += (dx / dist) * pull * dt * 3;
        this.vy += (dy / dist) * pull * dt * 3;
        this.vz += (dz / dist) * pull * dt * 3;
        // clamp
        const vmax = 14;
        const vl = Math.hypot(this.vx, this.vy, this.vz);
        if (vl > vmax) { this.vx *= vmax / vl; this.vy *= vmax / vl; this.vz *= vmax / vl; }
        this.tetherTime -= dt;
      }
    }

    // integrate with collision, per axis
    const bx = this._moveAxis(world, 0, this.vx * dt);
    if (bx) this._tryStep(world, 0, this.vx * dt);
    const bz = this._moveAxis(world, 2, this.vz * dt);
    if (bz) this._tryStep(world, 2, this.vz * dt);
    if (bx) this.vx = 0;
    if (bz) this.vz = 0;

    const wasOnGround = this.onGround;
    const by = this._moveAxis(world, 1, this.vy * dt);
    if (by) {
      if (this.vy < 0) { this.onGround = true; this.tether = null; }
      this.vy = 0;
    } else {
      this.onGround = false;
    }

    // walk bob / footsteps
    const hv = Math.hypot(this.vx, this.vz);
    this.footstep = false;
    if (this.onGround && hv > 1.5) {
      this.walkPhase += hv * dt * 2.2;
      this.footTimer += dt;
      if (this.footTimer > 0.34) { this.footTimer = 0; this.footstep = true; }
    }

    // void damage: fell below world
    if (this.y < -4) {
      this.hurt(6);
      this.respawn();
    }

    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.tetherCool > 0) this.tetherCool -= dt;
    return { landed: !wasOnGround && this.onGround };
  }

  // auto step-up 1 block when blocked horizontally on ground
  _tryStep(world, ax, d) {
    if (!this.onGround && !this.inWater) return;
    const oy = this.y;
    // try lifting up to 1.05 blocks
    if (!this._collides(world, this.x, this.y + 1.05, this.z)) {
      const testY = this.y + 1.05;
      const nx = this.x + (ax === 0 ? Math.sign(d) * 0.25 : 0);
      const nz = this.z + (ax === 2 ? Math.sign(d) * 0.25 : 0);
      if (!this._collides(world, nx, testY, nz)) {
        // settle onto the step
        this.y = testY;
        this._moveAxis(world, ax, d);
        // drop back down to rest
        let dropped = 0;
        while (dropped < 1.2 && !this._collides(world, this.x, this.y - 0.05, this.z)) {
          this.y -= 0.05; dropped += 0.05;
        }
        this.onGround = true;
        return;
      }
    }
    this.y = oy;
  }

  toggleFly() {
    if (!this.creative) return;
    this.flying = !this.flying;
    this.vy = 0;
  }

  // fire the tether: raycast forward, anchor to a solid block within range
  fireTether(world, range = 22) {
    if (this.tetherCool > 0) return false;
    const [fx, fy, fz] = this.forward();
    const hit = world.raycastPick(this.eyeX(), this.eyeY(), this.eyeZ(), fx, fy, fz, range);
    if (!hit) return false;
    // anchor slightly outside the hit face
    this.tether = { x: hit.px + hit.nx * 0.3, y: hit.py + hit.ny * 0.3, z: hit.pz + hit.nz * 0.3 };
    this.tetherTime = 2.2;
    this.tetherCool = 0.35;
    return true;
  }

  hurt(n) {
    this.health = Math.max(0, this.health - n);
    this.hurtFlash = 0.4;
    if (this.health <= 0) { this.dead = true; }
  }
  heal(n) { this.health = Math.min(this.maxHealth, this.health + n); }

  respawn() {
    this.x = this.spawn.x; this.y = this.spawn.y + 0.2; this.z = this.spawn.z;
    this.vx = this.vy = this.vz = 0;
    this.tether = null;
    if (this.dead) { this.health = this.maxHealth; this.dead = false; }
  }
}
