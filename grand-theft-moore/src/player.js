// player.js — on-foot player: movement relative to camera, circle-vs-building
// collision, jump/gravity, health. PURE LOGIC (no DOM).

export const PLAYER_R = 0.6;   // collision radius
export const EYE_H = 3.0;      // used only for LOS/eye reference on foot

export class Player {
  constructor(spawn) {
    this.x = spawn.x; this.y = 0; this.z = spawn.z;
    this.vy = 0;
    this.heading = 0;          // facing direction (radians), 0 = +x
    this.onGround = true;
    this.health = 100; this.maxHealth = 100;
    this.armor = 0; this.maxArmor = 100;   // body armor absorbs damage first
    this.outfit = null;                    // clothing-shop tint (null = default)
    this.cash = 0;
    this.inVehicle = null;     // Vehicle ref when driving
    this.speed = 0;            // current on-foot horizontal speed (for anim)
    this.walkPhase = 0;
    this.dead = false;
    this.busted = false;
  }

  // input: { mf, ms (normalized move axes relative to camYaw), run, jump, dt, camYaw }
  update(city, input) {
    if (this.inVehicle) { this.x = this.inVehicle.x; this.z = this.inVehicle.z; return; }
    const dt = Math.min(input.dt, 0.05);
    const spd = (input.run ? 8.5 : 5.0);
    let mf = input.mf || 0, ms = input.ms || 0;
    const ml = Math.hypot(mf, ms);
    let wishX = 0, wishZ = 0;
    if (ml > 0.01) {
      mf /= ml; ms /= ml;
      const cy = Math.cos(input.camYaw), sy = Math.sin(input.camYaw);
      // forward is along camYaw; strafe is perpendicular
      wishX = cy * mf - sy * ms;
      wishZ = sy * mf + cy * ms;
      this.heading = Math.atan2(wishZ, wishX);
    }
    const step = spd * dt;
    this.speed = ml > 0.01 ? spd : 0;
    // move per-axis with collision (slide along walls)
    if (wishX !== 0) {
      const nx = this.x + wishX * step;
      if (!city.blocked(nx, this.z, PLAYER_R)) this.x = nx;
    }
    if (wishZ !== 0) {
      const nz = this.z + wishZ * step;
      if (!city.blocked(this.x, nz, PLAYER_R)) this.z = nz;
    }
    // world bounds
    const M = city.MAP;
    this.x = Math.max(0.6, Math.min(M - 0.6, this.x));
    this.z = Math.max(0.6, Math.min(M - 0.6, this.z));
    // jump / gravity — a clearly-visible hop (was a barely-perceptible 1u)
    this.jumped = false;
    if (input.jump && this.onGround) { this.vy = 10; this.onGround = false; this.jumped = true; }
    if (!this.onGround) {
      this.vy -= 22 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.onGround = true; }
    }
    if (this.speed > 0) this.walkPhase += dt * 10;
  }

  hurt(n) {
    if (this.dead) return;
    if (this.armor > 0) { const a = Math.min(this.armor, n); this.armor -= a; n -= a; }
    this.health = Math.max(0, this.health - n);
    if (this.health <= 0) { this.health = 0; this.dead = true; }
  }
  heal(n) { this.health = Math.min(this.maxHealth, this.health + n); }
}
