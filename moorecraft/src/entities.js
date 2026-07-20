// entities.js — item drops and "The Hollow" void-wisp mobs.
// Logic is DOM-free. Billboard drawing takes a render buffer + projector.

import { isSolid, B } from './world.js';
import { ITEMS } from './craft.js';

export class Entities {
  constructor() {
    this.drops = [];   // {x,y,z,vy,id,count,age,pick}
    this.mobs = [];    // {x,y,z,vx,vy,vz,hp,fuse,flash}
    this.spawnTimer = 0;
    this.bursts = [];  // {x,y,z,age} visual
  }

  spawnDrop(x, y, z, id, count = 1) {
    this.drops.push({ x, y, z, vy: 2 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.5, id, count, age: 0 });
  }

  _settle(world, e, dt, r = 0.2) {
    e.vy -= 22 * dt;
    e.x += (e.vx || 0) * dt; e.z += (e.vz || 0) * dt;
    const ny = e.y + e.vy * dt;
    if (isSolid(world.get(Math.floor(e.x), Math.floor(ny), Math.floor(e.z)))) {
      e.vy = 0; e.vx = 0; e.vz = 0;
      e.y = Math.floor(ny) + 1;
    } else e.y = ny;
    if (e.vx) e.vx *= 0.9; if (e.vz) e.vz *= 0.9;
    if (e.y < -8) return false;
    return true;
  }

  update(world, player, dt, opts) {
    const { isNight, inv, audio } = opts;
    // drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      this._settle(world, d, dt);
      // pickup
      const dx = d.x - player.x, dy = d.y - (player.y + 0.9), dz = d.z - player.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      // magnetise toward player when close
      if (d.age > 0.4 && d2 < 6.25) {
        const m = 6 * dt;
        d.x -= dx * m; d.y -= dy * m * 0.5; d.z -= dz * m;
      }
      if (d.age > 0.4 && d2 < 1.7) {
        const left = inv.add(d.id, d.count);
        if (audio) audio.pickup();
        if (left <= 0) { this.drops.splice(i, 1); continue; }
        d.count = left;
      }
      if (d.y < -8) this.drops.splice(i, 1);
    }

    // mob spawning at night, in darkness, near player
    this.spawnTimer -= dt;
    if (isNight && this.spawnTimer <= 0 && this.mobs.length < 8) {
      this.spawnTimer = 2.5 + Math.random() * 2;
      this._trySpawn(world, player);
    }

    // mob update
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      m.flash = Math.max(0, (m.flash || 0) - dt);
      // daylight or bright light kills wisps
      if (!isNight || world.lightAt(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z)) > 7) {
        m.hp -= dt * 8;
        m.flash = 0.1;
      }
      if (m.hp <= 0) { this.mobs.splice(i, 1); continue; }
      // drift toward player
      const dx = player.x - m.x, dy = (player.y + 0.9) - m.y, dz = player.z - m.z;
      const dist = Math.hypot(dx, dy, dz);
      const spd = 2.4;
      m.vx = (dx / dist) * spd;
      m.vz = (dz / dist) * spd;
      // gentle vertical hover toward player
      m.vy = Math.max(-4, Math.min(4, dy * 1.5));
      // move with light collision
      const nx = m.x + m.vx * dt, nz = m.z + m.vz * dt, ny = m.y + m.vy * dt;
      if (!isSolid(world.get(Math.floor(nx), Math.floor(m.y), Math.floor(m.z)))) m.x = nx;
      if (!isSolid(world.get(Math.floor(m.x), Math.floor(m.y), Math.floor(nz)))) m.z = nz;
      if (!isSolid(world.get(Math.floor(m.x), Math.floor(ny), Math.floor(m.z)))) m.y = ny;
      // fuse / burst when close
      if (dist < 1.5) {
        m.fuse = (m.fuse || 0) + dt;
        m.flash = 0.15;
        if (audio && !m.hissed) { audio.hollowHiss(); m.hissed = true; }
        if (m.fuse > 1.1) {
          player.hurt(6);
          this.bursts.push({ x: m.x, y: m.y, z: m.z, age: 0 });
          if (audio) audio.hollowBurst();
          this.mobs.splice(i, 1);
        }
      } else {
        m.fuse = Math.max(0, (m.fuse || 0) - dt * 0.5);
        m.hissed = false;
      }
      if (m.y < -8) this.mobs.splice(i, 1);
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      this.bursts[i].age += dt;
      if (this.bursts[i].age > 0.5) this.bursts.splice(i, 1);
    }
  }

  _trySpawn(world, player) {
    for (let tries = 0; tries < 6; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 12;
      const x = Math.floor(player.x + Math.cos(ang) * r);
      const z = Math.floor(player.z + Math.sin(ang) * r);
      // find a surface near player's height
      for (let y = Math.floor(player.y) + 6; y > Math.floor(player.y) - 8; y--) {
        if (isSolid(world.get(x, y, z)) && world.get(x, y + 1, z) === 0 && world.get(x, y + 2, z) === 0) {
          if (world.lightAt(x, y + 1, z) > 6) break; // too bright
          this.mobs.push({ x: x + 0.5, y: y + 1, z: z + 0.5, vx: 0, vy: 0, vz: 0, hp: 10, fuse: 0 });
          return;
        }
      }
    }
  }

  clear() { this.drops.length = 0; this.mobs.length = 0; this.bursts.length = 0; }
}
