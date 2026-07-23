// vehicles.js — arcade car physics, collision, traffic lane AI, police pursuit
// AI. PURE LOGIC (no DOM). Player/police cars use full physics; ambient
// traffic uses stable kinematic lane-following.

import { P, ROAD, NB } from './city.js';

export const VEHICLE_TYPES = {
  sedan:  { maxSpeed: 17, accel: 24, turn: 2.3, w: 2.0, l: 4.2, h: 1.5, mass: 1 },
  sports: { maxSpeed: 25, accel: 34, turn: 2.7, w: 1.9, l: 4.0, h: 1.2, mass: 0.8 },
  truck:  { maxSpeed: 12, accel: 17, turn: 1.6, w: 2.6, l: 6.0, h: 2.6, mass: 2 },
  van:    { maxSpeed: 15, accel: 20, turn: 1.9, w: 2.3, l: 5.0, h: 2.3, mass: 1.5 },
  police: { maxSpeed: 21, accel: 30, turn: 2.5, w: 2.1, l: 4.4, h: 1.6, mass: 1.1 },
};

const CAR_COLORS = [
  [200, 60, 55], [70, 110, 200], [220, 200, 70], [80, 170, 100],
  [180, 180, 190], [140, 90, 200], [230, 140, 60], [60, 60, 70],
  [30, 90, 80], [235, 235, 240], [120, 30, 40], [40, 50, 70],
];

let VID = 1;

export class Vehicle {
  constructor(type, x, z, heading = 0, colorIdx = 0) {
    const t = VEHICLE_TYPES[type];
    this.id = VID++;
    this.type = type;
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0;
    this.w = t.w; this.l = t.l; this.h = t.h;
    this.maxSpeed = t.maxSpeed; this.accel = t.accel; this.turnRate = t.turn; this.mass = t.mass;
    this.color = type === 'police' ? [235, 240, 245] : CAR_COLORS[colorIdx % CAR_COLORS.length];
    this.occupant = null;      // 'player' | 'ai' | null
    this.role = 'traffic';     // 'traffic' | 'police' | 'player' | 'parked'
    this.axis = Math.abs(Math.cos(heading)) > 0.5 ? 'x' : 'z';
    this.sign = (this.axis === 'x') ? (Math.cos(heading) >= 0 ? 1 : -1) : (Math.sin(heading) >= 0 ? 1 : -1);
    this.crashImpulse = 0;
    this.turnCooldown = 0;
    this.hp = 100;
    this.wheelSpin = 0;
    this.skid = 0;
  }

  get radius() { return Math.max(this.w, this.l) * 0.5; }

  // collision radius used for building tests (a touch smaller than half-length)
  _collRadius() { return this.w * 0.5 + 0.3; }

  // Full arcade physics step. input: { throttle, steer, brake, handbrake, dt }
  // Returns { crashed:bool, crashSpeed:number }
  step(city, input) {
    const dt = Math.min(input.dt, 0.05);
    let thr = input.throttle || 0, steer = input.steer || 0;
    const brake = !!input.brake, hb = !!input.handbrake;

    // longitudinal
    if (thr !== 0) this.speed += thr * this.accel * dt;
    // drag / rolling resistance / braking
    let drag = 0.9;
    if (brake) drag = 4.0;
    else if (thr === 0) drag = 1.4;
    this.speed -= this.speed * Math.min(0.9, drag * dt);
    const revMax = -this.maxSpeed * 0.4;
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if (this.speed < revMax) this.speed = revMax;

    // steering — scales in at low speed, reverses in reverse
    const sp = Math.abs(this.speed);
    const steerAuth = Math.min(1, sp / 4);
    const dir = this.speed >= 0 ? 1 : -1;
    const gripMul = hb ? 1.8 : 1;
    this.heading += steer * this.turnRate * steerAuth * dir * gripMul * dt;
    this.wheelSpin += this.speed * dt;
    this.skid = (hb && sp > 4) ? 1 : Math.max(0, this.skid - dt * 3);

    // integrate with slide collision
    const mx = Math.cos(this.heading) * this.speed * dt;
    const mz = Math.sin(this.heading) * this.speed * dt;
    const r = this._collRadius();
    let crashed = false, crashSpeed = 0;
    const nx = this.x + mx, nz = this.z + mz;
    if (!city.blocked(nx, nz, r)) {
      this.x = nx; this.z = nz;
    } else {
      // try sliding on each axis
      let moved = false;
      if (!city.blocked(this.x + mx, this.z, r)) { this.x += mx; moved = true; }
      if (!city.blocked(this.x, this.z + mz, r)) { this.z += mz; moved = true; }
      if (!moved) {
        crashed = true; crashSpeed = Math.abs(this.speed);
        this.speed *= -0.15; // bounce back a little
      } else {
        crashed = Math.abs(this.speed) > 8; crashSpeed = Math.abs(this.speed);
        this.speed *= 0.55;  // scrape slows you
      }
    }
    // world bounds
    const M = city.MAP;
    if (this.x < 1) { this.x = 1; this.speed *= -0.2; }
    if (this.x > M - 1) { this.x = M - 1; this.speed *= -0.2; }
    if (this.z < 1) { this.z = 1; this.speed *= -0.2; }
    if (this.z > M - 1) { this.z = M - 1; this.speed *= -0.2; }
    if (this.turnCooldown > 0) this.turnCooldown -= dt;
    return { crashed, crashSpeed };
  }
}

// ---- ambient traffic: stable kinematic lane following ------------------
// Keeps to a lane center on the cross axis, cruises along its travel axis,
// turns at intersections. Roads form a continuous grid so straight travel is
// always clear; buildings are only hit if lanes drift, which we prevent.
export function trafficStep(car, city, dt, rng) {
  const cruise = car.maxSpeed * 0.55;
  // ease speed to cruise (traffic can slow via car.slow set by game)
  const target = car.slow ? cruise * 0.2 : cruise;
  car.speed += (target - car.speed) * Math.min(1, 3 * dt);

  const along = car.axis;                 // 'x' or 'z'
  const cross = along === 'x' ? 'z' : 'x';
  // corridor index on the cross axis and desired lane center
  const cbase = Math.max(0, Math.min(NB - 1, Math.round(car[cross] / P))) * P;
  const laneOff = car.sign > 0 ? ROAD * 0.72 : ROAD * 0.28;
  const targetCross = cbase + laneOff;

  // advance along travel axis
  car[along] += car.sign * car.speed * dt;
  // ease toward lane center on cross axis
  car[cross] += (targetCross - car[cross]) * Math.min(1, 5 * dt);

  // heading for rendering
  const baseAng = along === 'x' ? (car.sign > 0 ? 0 : Math.PI) : (car.sign > 0 ? Math.PI / 2 : -Math.PI / 2);
  const crossErr = (targetCross - car[cross]);
  car.heading = baseAng + (along === 'x' ? car.sign * crossErr * 0.1 : -car.sign * crossErr * 0.1);

  // world bounds -> turn around
  const M = city.MAP;
  const edge = 6;
  if (car[along] < edge || car[along] > M - edge) {
    car.sign *= -1;
    car[along] = Math.max(edge, Math.min(M - edge, car[along]));
    car.turnCooldown = 1.2;
    return;
  }

  // intersection turning: when passing near an intersection center on the
  // travel axis (the perpendicular road corridor), sometimes turn.
  if (car.turnCooldown <= 0) {
    const alongMod = ((car[along] % P) + P) % P;
    // intersection center of the along-corridor is around ROAD*0.5
    if (Math.abs(alongMod - ROAD * 0.5) < 0.6) {
      if (rng() < 0.35) {
        // turn onto the perpendicular corridor
        const newAxis = cross;
        const newSign = rng() < 0.5 ? 1 : -1;
        car.axis = newAxis; car.sign = newSign;
        car.turnCooldown = 2.5;
      } else {
        car.turnCooldown = 1.5;
      }
    }
  }
}

// ---- police pursuit AI --------------------------------------------------
// Steer toward the target (player). Returns physics input for Vehicle.step.
export function policeControl(car, tx, tz, dt) {
  const dx = tx - car.x, dz = tz - car.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dz, dx);
  // shortest angular difference
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 1.6));
  // throttle: chase hard, ease off if pointing away sharply or very close
  let throttle = 1;
  if (Math.abs(diff) > 2.2) throttle = 0.5;        // need to turn around
  if (dist < 6) throttle = 0.65;                    // don't overshoot too hard
  return { throttle, steer, brake: false, handbrake: Math.abs(diff) > 2.4, dt };
}

// axis-aligned-ish overlap test between two vehicles (circle approx)
export function vehiclesOverlap(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  const rr = (a.w * 0.5 + a.l * 0.4) * 0.7 + (b.w * 0.5 + b.l * 0.4) * 0.7;
  return dx * dx + dz * dz < rr * rr;
}

// push two overlapping vehicles apart and bleed speed; returns impact speed
export function resolveVehicleCollision(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  let d = Math.hypot(dx, dz) || 0.001;
  const nx = dx / d, nz = dz / d;
  const impact = Math.abs(a.speed) + Math.abs(b.speed);
  const push = (a.radius + b.radius) * 0.5 - d * 0.5 + 0.1;
  if (push > 0) {
    a.x += nx * push * 0.5; a.z += nz * push * 0.5;
    b.x -= nx * push * 0.5; b.z -= nz * push * 0.5;
  }
  a.speed *= 0.6; b.speed *= 0.6;
  return impact;
}
