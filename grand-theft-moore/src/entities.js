// entities.js — pedestrians (wander/flee/knocked-down) and static props.
// PURE LOGIC (no DOM).

import { TILE } from './city.js';

const PED_COLORS = [
  [60, 70, 90], [140, 60, 60], [40, 110, 90], [160, 150, 90],
  [90, 60, 120], [180, 120, 80], [50, 50, 60], [120, 130, 140],
  [200, 80, 70], [40, 70, 130], [30, 120, 120], [210, 190, 90],
];
const SKIN_TONES = [
  [250, 214, 180], [232, 186, 150], [198, 148, 110], [156, 108, 74], [110, 76, 52],
];
const HAIR_COLORS = [
  [30, 24, 20], [70, 45, 25], [120, 85, 45], [180, 150, 90], [90, 90, 96], [220, 215, 210],
];
// light-ish per-ped tint for the shared character model (0..1) so the crowd
// isn't all one outfit; kept unsaturated so it reads as varied clothing/tone.
const PED_TINTS = [
  [1.0, 0.95, 0.9], [0.78, 0.84, 1.0], [0.95, 0.82, 0.8], [0.82, 0.95, 0.86],
  [1.0, 0.9, 0.72], [0.86, 0.86, 0.92], [0.96, 0.78, 0.82], [0.8, 0.9, 0.95],
];

let PID = 1;
export class Ped {
  constructor(x, z, rng) {
    this.id = PID++;
    this.x = x; this.z = z;
    this.heading = rng() * Math.PI * 2;
    this.speed = 1.4 + rng() * 0.8;
    this.state = 'walk';        // 'walk' | 'flee' | 'down'
    this.color = PED_COLORS[(rng() * PED_COLORS.length) | 0];
    this.shirt = PED_COLORS[(rng() * PED_COLORS.length) | 0];
    this.skin = SKIN_TONES[(rng() * SKIN_TONES.length) | 0];
    this.hair = HAIR_COLORS[(rng() * HAIR_COLORS.length) | 0];
    this.tint = PED_TINTS[(rng() * PED_TINTS.length) | 0];
    // ~45% render as the colourful procedural body so the crowd looks mixed
    // rather than a street full of the one shared character model.
    this.boxPed = rng() < 0.45;
    this.changeTimer = rng() * 3;
    this.downTimer = 0;
    this.walkPhase = rng() * 6;
    this.h = 1.6 + rng() * 0.44;   // build/height variety
  }

  update(city, dt, threats, rng) {
    if (this.state === 'down') {
      this.downTimer -= dt;
      return;
    }
    // detect nearest fast threat (car / player) within radius
    let flee = null, fdist = 9;
    for (const t of threats) {
      const dx = this.x - t.x, dz = this.z - t.z;
      const d = Math.hypot(dx, dz);
      if (d < fdist && (t.speed === undefined || Math.abs(t.speed) > 2 || d < 3)) {
        flee = t; fdist = d;
      }
    }
    let spd = this.speed;
    if (flee) {
      this.state = 'flee';
      this.heading = Math.atan2(this.z - flee.z, this.x - flee.x);
      spd = this.speed * 2.4;
    } else {
      this.state = 'walk';
      this.changeTimer -= dt;
      if (this.changeTimer <= 0) {
        this.changeTimer = 1.5 + rng() * 3;
        this.heading += (rng() - 0.5) * 1.6;
      }
    }
    const step = spd * dt;
    const nx = this.x + Math.cos(this.heading) * step;
    const nz = this.z + Math.sin(this.heading) * step;
    // avoid buildings; prefer staying off building footprints
    if (!city.blocked(nx, this.z, 0.4)) this.x = nx; else this.heading += 1.3;
    if (!city.blocked(this.x, nz, 0.4)) this.z = nz; else this.heading += 1.3;
    const M = city.MAP;
    this.x = Math.max(1, Math.min(M - 1, this.x));
    this.z = Math.max(1, Math.min(M - 1, this.z));
    this.walkPhase += step * 3;
  }

  knockDown() {
    if (this.state === 'down') return false;
    this.state = 'down';
    this.downTimer = 3 + Math.random() * 2;
    return true;
  }
}

// spawn peds on sidewalks near a center point
export function spawnPeds(city, center, count, rng) {
  const peds = [];
  let tries = 0;
  while (peds.length < count && tries < count * 40) {
    tries++;
    const ang = rng() * Math.PI * 2;
    const r = 8 + rng() * 60;
    const x = center.x + Math.cos(ang) * r;
    const z = center.z + Math.sin(ang) * r;
    if (x < 2 || z < 2 || x > city.MAP - 2 || z > city.MAP - 2) continue;
    const tile = city.tileAt(x, z);
    if (tile === TILE.SIDEWALK || tile === TILE.GRASS) {
      peds.push(new Ped(x, z, rng));
    }
  }
  return peds;
}

// simple static props (trees in parks, streetlights at corners) for flavour
export function genProps(city, rng) {
  const props = [];
  const M = city.MAP;
  for (let z = 4; z < M; z += 7) {
    for (let x = 4; x < M; x += 7) {
      const t = city.tileAt(x, z);
      if (t === TILE.GRASS && rng() < 0.5) {
        props.push({ x: x + rng(), z: z + rng(), kind: 'tree', h: 3 + rng() * 2 });
      }
    }
  }
  return props;
}
