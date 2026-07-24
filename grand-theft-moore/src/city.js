// city.js — procedural city generation, heightfield + tile map, collision
// queries, spawn/road data, and minimap projection. PURE LOGIC (no DOM).
//
// The city is a grid of road corridors with building blocks in between.
// A heightfield array H (building top height, 0 = open) and a tile-type
// array T back both rendering and collision. Everything derives from a seed.

export const TILE = { ROAD: 0, SIDEWALK: 1, BUILDING: 2, GRASS: 3, SPECIAL: 4 };

export const P = 30;      // block period (units)
export const ROAD = 12;   // road corridor width
export const SW = 3;      // sidewalk ring width inside a block
export const NB = 8;      // blocks per side
export const LOT = P - ROAD; // building lot width (18)

// enterable shops: themed names + glowing sign colours (rgb 0..1)
const SHOP_NAMES = [
  'MOORE-MART', 'AMMU-MOORE', 'BURGER MOORE', 'MOORE LIQUOR', '24/7 MOORE',
  "PAY 'N' SPRAY", 'MOORE THREADS', 'PIZZA MOORE', 'MOORE COFFEE', 'EL MOORE TACOS',
];
const SHOP_COLS = [
  [1.0, 0.30, 0.25], [0.20, 0.80, 1.0], [1.0, 0.75, 0.20], [0.60, 0.42, 1.0],
  [0.30, 1.0, 0.55], [1.0, 0.42, 0.70], [0.92, 0.90, 0.28], [1.0, 0.55, 0.15],
  [0.55, 0.85, 1.0], [1.0, 0.35, 0.45],
];
// interior theme per shop (parallel to SHOP_NAMES) — drives the fittings
const SHOP_KINDS = [
  'grocery', 'guns', 'food', 'liquor', 'convenience',
  'garage', 'clothing', 'food', 'cafe', 'food',
];

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export class City {
  constructor(seed = 1234) {
    this.seed = seed;
    this.MAP = NB * P;            // world size in units (square)
    const M = this.MAP;
    this.H = new Uint16Array(M * M);   // building top height (0 = open ground)
    this.T = new Uint8Array(M * M);    // tile type
    this.blockKind = {};               // "bx,bz" -> 'building'|'park'|'garage'|'hospital'
    this._gen();
  }

  // ---- generation -------------------------------------------------------
  _gen() {
    const M = this.MAP, rnd = mulberry32(this.seed);
    // pick special blocks (garage + hospital) among interior blocks
    const gi = 1 + Math.floor(rnd() * (NB - 2));
    const gj = 1 + Math.floor(rnd() * (NB - 2));
    let hi, hj;
    do { hi = 1 + Math.floor(rnd() * (NB - 2)); hj = 1 + Math.floor(rnd() * (NB - 2)); }
    while (hi === gi && hj === gj);
    this.garageBlock = [gi, gj];
    this.hospitalBlock = [hi, hj];

    for (let bz = 0; bz < NB; bz++) {
      for (let bx = 0; bx < NB; bx++) {
        let kind = 'building';
        if (bx === gi && bz === gj) kind = 'garage';
        else if (bx === hi && bz === hj) kind = 'hospital';
        else if (hash2(bx, bz, this.seed) < 0.12) kind = 'park';
        this.blockKind[bx + ',' + bz] = kind;
        // building height for this block (used for the whole footprint)
        let h = 0;
        if (kind === 'building') h = 6 + Math.floor(hash2(bx * 7 + 3, bz * 13 + 1, this.seed) * 26);
        else if (kind === 'garage' || kind === 'hospital') h = 8;
        // rasterize this block's cells
        const ox = bx * P, oz = bz * P;
        for (let lz = 0; lz < P; lz++) {
          for (let lx = 0; lx < P; lx++) {
            const x = ox + lx, z = oz + lz;
            if (x >= M || z >= M) continue;
            const inRoadX = lx < ROAD, inRoadZ = lz < ROAD;
            const idx = x + z * M;
            if (inRoadX || inRoadZ) { this.T[idx] = TILE.ROAD; continue; }
            // inside the block: sidewalk ring / interior footprint
            const ix = lx - ROAD, iz = lz - ROAD; // 0..LOT-1
            const edge = ix < SW || ix >= LOT - SW || iz < SW || iz >= LOT - SW;
            if (edge) { this.T[idx] = TILE.SIDEWALK; continue; }
            if (kind === 'park') { this.T[idx] = TILE.GRASS; continue; }
            // building footprint
            this.T[idx] = (kind === 'garage' || kind === 'hospital') ? TILE.SPECIAL : TILE.BUILDING;
            this.H[idx] = h;
          }
        }
      }
    }
    this._buildSpawns(rnd);
  }

  _blockCenter(bx, bz) {
    // center of the lot interior (world units)
    return { x: bx * P + ROAD + LOT / 2, z: bz * P + ROAD + LOT / 2 };
  }

  _buildSpawns(rnd) {
    // road network as a lane graph is implicit; we expose road-center lines.
    // parking spots: along sidewalks next to roads.
    this.parking = [];
    for (let bz = 0; bz < NB; bz++) {
      for (let bx = 0; bx < NB; bx++) {
        // a couple parking spots on the road just outside each block corner
        const rx = bx * P + ROAD * 0.5, rz = bz * P + ROAD * 0.5;
        this.parking.push({ x: bx * P + ROAD + 2, z: bz * P + ROAD * 0.5, axis: 'x' });
        this.parking.push({ x: bx * P + ROAD * 0.5, z: bz * P + ROAD + 2, axis: 'z' });
      }
    }
    // garage & hospital world markers (on the road in front of the block)
    const g = this._blockCenter(this.garageBlock[0], this.garageBlock[1]);
    this.garage = { x: g.x, z: this.garageBlock[1] * P + ROAD * 0.5 };
    const h = this._blockCenter(this.hospitalBlock[0], this.hospitalBlock[1]);
    this.hospital = { x: h.x, z: this.hospitalBlock[1] * P + ROAD * 0.5 };
    // player spawn: a road intersection near the middle
    const midK = Math.floor(NB / 2);
    this.playerSpawn = { x: midK * P + ROAD * 0.5, z: midK * P + ROAD * 0.5 };
    this._buildShops();
  }

  // enterable shops — deterministically pick ~10 building blocks and place a
  // door trigger on the street-facing (north, z=z0) sidewalk in front of each.
  _buildShops() {
    const cand = [];
    for (let bz = 0; bz < NB; bz++) for (let bx = 0; bx < NB; bx++) {
      if (this.blockKind[bx + ',' + bz] !== 'building') continue;
      cand.push({ bx, bz, r: hash2(bx * 97 + 5, bz * 57 + 11, this.seed) });
    }
    cand.sort((a, b) => a.r - b.r);
    this.shops = [];
    const n = Math.min(10, cand.length);
    for (let i = 0; i < n; i++) {
      const { bx, bz } = cand[i];
      const x0 = bx * P + ROAD + SW, x1 = bx * P + ROAD + LOT - SW;
      const z0 = bz * P + ROAD + SW, z1 = bz * P + ROAD + LOT - SW;
      const cx = (x0 + x1) / 2;
      // door on the north facade (z = z0); trigger point a bit out on the sidewalk
      this.shops.push({
        bx, bz, x0, z0, x1, z1, cx,
        door: { x: cx, z: z0 },
        doorX: cx, doorZ: z0 - 1.6,
        name: SHOP_NAMES[i % SHOP_NAMES.length], col: SHOP_COLS[i % SHOP_COLS.length],
        kind: SHOP_KINDS[i % SHOP_KINDS.length],
      });
    }
  }

  // nearest shop whose door trigger is within r of (x,z); null if none
  shopAt(x, z, r = 3.0) {
    let best = null, bd = r;
    for (const s of this.shops) {
      const d = Math.hypot(s.doorX - x, s.doorZ - z);
      if (d < bd) { best = s; bd = d; }
    }
    return best;
  }

  // ---- lane helpers -----------------------------------------------------
  // nearest road-corridor center coordinate on a given axis to value v
  nearestRoadCenter(v) {
    const k = Math.round((v - ROAD * 0.5) / P);
    const kk = Math.max(0, Math.min(NB - 1, k));
    return kk * P + ROAD * 0.5;
  }
  // is a world coordinate within a road corridor (either axis) — for AI
  onRoad(x, z) {
    const rx = ((x % P) + P) % P, rz = ((z % P) + P) % P;
    return rx < ROAD || rz < ROAD;
  }
  // lane center offset for driving on the right given travel axis+sign
  laneCenter(base, sign) {
    // base = k*P; offset a quarter into the corridor on the correct side
    return base + (sign > 0 ? ROAD * 0.72 : ROAD * 0.28);
  }

  // ---- lookups ----------------------------------------------------------
  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.MAP && z < this.MAP; }
  cell(x, z) {
    const xi = x | 0, zi = z | 0;
    if (xi < 0 || zi < 0 || xi >= this.MAP || zi >= this.MAP) return -1;
    return xi + zi * this.MAP;
  }
  heightAt(x, z) {
    const c = this.cell(x, z);
    return c < 0 ? 999 : this.H[c]; // out of bounds acts as a wall
  }
  tileAt(x, z) {
    const c = this.cell(x, z);
    return c < 0 ? TILE.BUILDING : this.T[c];
  }
  // solid for a walking/driving entity: building present, or out of bounds
  solidAt(x, z) {
    return this.heightAt(x, z) > 0;
  }

  // circle-vs-buildings: true if a circle at (x,z) r overlaps any solid cell
  blocked(x, z, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
    const z0 = Math.floor(z - r), z1 = Math.floor(z + r);
    for (let zz = z0; zz <= z1; zz++)
      for (let xx = x0; xx <= x1; xx++)
        if (this.solidAt(xx, zz)) return true;
    return false;
  }

  // line-of-sight: is there a clear (no tall building) straight line between
  // two ground points? Used by the police "lost sight" logic. Steps along
  // the segment sampling building heights up to eye height.
  lineOfSight(x0, z0, x1, z1, eyeH = 3) {
    const dx = x1 - x0, dz = z1 - z0;
    const dist = Math.hypot(dx, dz);
    const steps = Math.ceil(dist / 1.5);
    if (steps === 0) return true;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t, z = z0 + dz * t;
      if (this.heightAt(x, z) > eyeH) return false;
    }
    return true;
  }

  // ---- minimap data -----------------------------------------------------
  // returns a small tile grid (down-sampled) for HUD minimap drawing:
  // 0 open/road, 1 building, plus marker coords in world units.
  minimapProject(worldX, worldZ, size) {
    // maps world coord -> minimap pixel within [0,size)
    return {
      px: (worldX / this.MAP) * size,
      pz: (worldZ / this.MAP) * size,
    };
  }
}
