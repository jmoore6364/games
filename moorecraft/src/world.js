// world.js — voxel store, terrain generation, block definitions,
// raycast picking, block edits + save-diff, and block-light flood.
// Pure logic, NO DOM references, so it runs headless under Node.

// ---------------- dimensions ----------------
export const WX = 128, WY = 64, WZ = 128;
export const WXZ = WX * WZ;

export function idx(x, y, z) { return x + z * WX + y * WXZ; }

// ---------------- block ids ----------------
export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, LOG: 5, PLANKS: 6,
  LEAVES: 7, SAND: 8, WATER: 9, COAL: 10, IRON: 11, LUMORE: 12,
  LUMITE: 13, VOIDSTONE: 14, TABLE: 15, TORCH: 16, GLASS: 17,
};

// Each block: name, solid (collision), opaque (blocks light/rays),
// hardness (mining time base seconds), tier (pick tier needed to drop),
// drop (item id dropped), light (emitted 0..15), col [r,g,b] base tint.
export const BLOCKS = [
  { name: 'air',       solid: 0, opaque: 0, hard: 0,   tier: 0, drop: 0,  light: 0,  col: [0, 0, 0] },
  { name: 'grass',     solid: 1, opaque: 1, hard: 0.6, tier: 0, drop: B.DIRT, light: 0, col: [96, 168, 74] },
  { name: 'dirt',      solid: 1, opaque: 1, hard: 0.6, tier: 0, drop: B.DIRT, light: 0, col: [134, 96, 62] },
  { name: 'stone',     solid: 1, opaque: 1, hard: 1.6, tier: 1, drop: B.COBBLE, light: 0, col: [128, 128, 132] },
  { name: 'cobble',    solid: 1, opaque: 1, hard: 2.0, tier: 1, drop: B.COBBLE, light: 0, col: [112, 112, 116] },
  { name: 'log',       solid: 1, opaque: 1, hard: 1.2, tier: 0, drop: B.LOG,  light: 0, col: [110, 82, 48] },
  { name: 'planks',    solid: 1, opaque: 1, hard: 1.0, tier: 0, drop: B.PLANKS, light: 0, col: [176, 138, 86] },
  { name: 'leaves',    solid: 1, opaque: 0, hard: 0.3, tier: 0, drop: 0,    light: 0, col: [74, 138, 58] },
  { name: 'sand',      solid: 1, opaque: 1, hard: 0.5, tier: 0, drop: B.SAND, light: 0, col: [214, 200, 148] },
  { name: 'water',     solid: 0, opaque: 0, hard: 999, tier: 9, drop: 0,    light: 0, col: [54, 92, 176] },
  { name: 'coal ore',  solid: 1, opaque: 1, hard: 2.4, tier: 1, drop: B.COAL, light: 0, col: [64, 66, 70] },
  { name: 'iron ore',  solid: 1, opaque: 1, hard: 3.0, tier: 2, drop: B.IRON, light: 0, col: [150, 132, 118] },
  { name: 'lumite ore',solid: 1, opaque: 1, hard: 4.0, tier: 3, drop: B.LUMORE, light: 9, col: [120, 150, 170] },
  { name: 'lumite',    solid: 1, opaque: 1, hard: 1.4, tier: 0, drop: B.LUMITE, light: 14, col: [128, 232, 246] },
  { name: 'void-stone',solid: 1, opaque: 1, hard: 999, tier: 9, drop: 0,    light: 0, col: [40, 36, 54] },
  { name: 'table',     solid: 1, opaque: 1, hard: 1.0, tier: 0, drop: B.TABLE, light: 0, col: [150, 110, 66] },
  { name: 'torch',     solid: 0, opaque: 0, hard: 0.1, tier: 0, drop: B.TORCH, light: 13, col: [244, 200, 90] },
  { name: 'glass',     solid: 1, opaque: 0, hard: 0.4, tier: 0, drop: 0,    light: 0, col: [198, 224, 232] },
];

export function isSolid(id) { return BLOCKS[id].solid === 1; }
export function isOpaque(id) { return BLOCKS[id].opaque === 1; }

// ---------------- hash noise ----------------
function hashi(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hashi(xi, yi, s), b = hashi(xi + 1, yi, s);
  const c = hashi(xi, yi + 1, s), d = hashi(xi + 1, yi + 1, s);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, s, oct = 4) {
  let f = 0, amp = 0.5, fr = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    f += amp * vnoise(x * fr, y * fr, s + i * 131);
    norm += amp; amp *= 0.5; fr *= 2;
  }
  return f / norm;
}
function noise3(x, y, z, s) {
  return (vnoise(x, y, s) + vnoise(y, z, s + 17) + vnoise(z, x, s + 41)) / 3;
}

// ---------------- world ----------------
export class World {
  constructor(seed = 1337) {
    this.seed = seed | 0;
    this.voxels = new Uint8Array(WX * WY * WZ);
    this.blockLight = new Uint8Array(WX * WY * WZ);
    this.edits = new Map();          // idx -> id (diff over generated base)
    this.emitters = new Set();       // idx of light-emitting voxels
    this.generating = false;
    this.spawn = { x: WX / 2, y: 40, z: WZ / 2 };
    this.islands = [];
  }

  inBounds(x, y, z) {
    return x >= 0 && x < WX && y >= 0 && y < WY && z >= 0 && z < WZ;
  }
  get(x, y, z) {
    if (x < 0 || x >= WX || y < 0 || y >= WY || z < 0 || z >= WZ) return 0;
    return this.voxels[x + z * WX + y * WXZ];
  }
  // raw set (records diff unless generating). Updates emitter set.
  set(x, y, z, id) {
    if (x < 0 || x >= WX || y < 0 || y >= WY || z < 0 || z >= WZ) return;
    const i = x + z * WX + y * WXZ;
    const prev = this.voxels[i];
    if (prev === id) return;
    this.voxels[i] = id;
    if (BLOCKS[prev].light > 0) this.emitters.delete(i);
    if (BLOCKS[id].light > 0) this.emitters.add(i);
    if (!this.generating) { this.edits.set(i, id); this.lightDirty = true; }
  }

  // ---------------- terrain generation ----------------
  generate() {
    this.generating = true;
    this.voxels.fill(0);
    this.edits.clear();
    this.emitters.clear();
    const s = this.seed;

    // island layout (cx,cz,cy top level, r radius, kind)
    this.islands = [
      { cx: 64, cz: 64, cy: 38, r: 26, kind: 'spawn' },
      { cx: 30, cz: 44, cy: 24, r: 17, kind: 'stone' },
      { cx: 96, cz: 40, cy: 30, r: 15, kind: 'sand' },
      { cx: 92, cz: 92, cy: 30, r: 18, kind: 'ore' },
      { cx: 46, cz: 96, cy: 50, r: 14, kind: 'sky' },
      { cx: 68, cz: 30, cy: 20, r: 12, kind: 'lumite' },
    ];

    for (const isl of this.islands) this._buildIsland(isl, s);

    // spawn point: top of spawn island centre
    const sp = this.islands[0];
    let sy = sp.cy + 6;
    while (sy > 0 && this.get(sp.cx, sy, sp.cz) === 0) sy--;
    this.spawn = { x: sp.cx + 0.5, y: sy + 1, z: sp.cz + 0.5 };

    this.generating = false;
    this.lightDirty = true;
    this.recomputeLight();
    return this;
  }

  _buildIsland(isl, s) {
    const { cx, cz, cy, r, kind } = isl;
    const R = r + 4;
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const x = cx + dx, z = cz + dz;
        if (x < 1 || x >= WX - 1 || z < 1 || z >= WZ - 1) continue;
        const d = Math.sqrt(dx * dx + dz * dz);
        const warp = 0.7 + 0.5 * fbm(x * 0.09, z * 0.09, s + isl.cy);
        const edge = r * warp;
        if (d >= edge) continue;
        const t = 1 - d / edge;                 // 1 centre -> 0 rim
        const surf = cy + Math.round(3 * (fbm(x * 0.13, z * 0.13, s + 7) - 0.5) * 2);
        // lens thickness: thick centre, thin rim
        const thick = 2 + Math.round(t * (r * 0.55));
        const bottom = surf - thick;
        for (let y = bottom; y <= surf; y++) {
          if (y < 1 || y >= WY) continue;
          let id = B.STONE;
          const depth = surf - y;
          if (y === surf) id = (kind === 'sand') ? B.SAND : B.GRASS;
          else if (depth <= 3) id = (kind === 'sand') ? B.SAND : B.DIRT;
          else id = B.STONE;
          // ore veins in stone via 3d noise
          if (id === B.STONE) {
            const nv = noise3(x * 0.28, y * 0.28, z * 0.28, s + 3);
            if (kind === 'lumite' && noise3(x * 0.3, y * 0.3, z * 0.3, s + 91) > 0.66) id = B.LUMORE;
            else if (nv > 0.66 && depth > 4) id = B.IRON;
            else if (nv > 0.58 && depth > 2) id = B.COAL;
            if (kind === 'ore' && noise3(x * 0.3, y * 0.3, z * 0.3, s + 55) > 0.6 && depth > 3) id = B.IRON;
          }
          this.set(x, y, z, id);
        }
        // void-stone core at very bottom
        if (bottom - 1 >= 1 && t > 0.35) this.set(x, bottom - 1, z, B.VOIDSTONE);

        // ponds: low flat spots near centre on grass islands
        if ((kind === 'spawn' || kind === 'sky') && t > 0.45) {
          const pn = fbm(x * 0.11 + 40, z * 0.11 + 40, s + 21);
          if (pn < 0.34) {
            this.set(x, surf, z, B.WATER);
            this.set(x, surf - 1, z, B.SAND);
          }
        }
      }
    }
    this._scatterTrees(isl, s);
    if (kind === 'lumite') this._scatterLumite(isl, s);
  }

  _scatterTrees(isl, s) {
    const { cx, cz, r } = isl;
    if (isl.kind === 'sand' || isl.kind === 'lumite') return;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const x = cx + dx, z = cz + dz;
        if (!this.inBounds(x, 0, z)) continue;
        if (hashi(x, z, s + 900) > 0.975) {
          // find surface
          let y = WY - 1;
          while (y > 0 && this.get(x, y, z) === 0) y--;
          if (this.get(x, y, z) !== B.GRASS) continue;
          this._tree(x, y + 1, z, s + x * 7 + z);
        }
      }
    }
  }
  _tree(x, y, z, s) {
    const h = 4 + Math.floor(hashi(x, z, s) * 3);
    for (let i = 0; i < h; i++) this.set(x, y + i, z, B.LOG);
    const top = y + h;
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -2; dz <= 2; dz++) {
          const rr = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (rr > 3) continue;
          const bx = x + dx, by = top + dy, bz = z + dz;
          if (this.get(bx, by, bz) === 0) this.set(bx, by, bz, B.LEAVES);
        }
    this.set(x, top + 1, z, B.LEAVES);
  }
  _scatterLumite(isl, s) {
    // surface lumite crystals so the island glows
    const { cx, cz, r } = isl;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        const x = cx + dx, z = cz + dz;
        if (!this.inBounds(x, 0, z)) continue;
        if (hashi(x, z, s + 500) > 0.94) {
          let y = WY - 1; while (y > 0 && this.get(x, y, z) === 0) y--;
          if (this.get(x, y, z) !== 0) this.set(x, y + 1, z, B.LUMITE);
        }
      }
  }

  // ---------------- lighting (block light flood) ----------------
  recomputeLight() {
    const bl = this.blockLight;
    bl.fill(0);
    // queue of [x,y,z,level]
    const qx = [], qy = [], qz = [], ql = [];
    for (const i of this.emitters) {
      const y = Math.floor(i / WXZ), rem = i - y * WXZ;
      const z = Math.floor(rem / WX), x = rem - z * WX;
      const lv = BLOCKS[this.voxels[i]].light;
      if (bl[i] < lv) { bl[i] = lv; qx.push(x); qy.push(y); qz.push(z); ql.push(lv); }
    }
    let head = 0;
    while (head < qx.length) {
      const x = qx[head], y = qy[head], z = qz[head], l = ql[head]; head++;
      if (l <= 1) continue;
      const nl = l - 1;
      const nb = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
      for (let k = 0; k < 6; k++) {
        const nx = x + nb[k][0], ny = y + nb[k][1], nz = z + nb[k][2];
        if (nx < 0 || nx >= WX || ny < 0 || ny >= WY || nz < 0 || nz >= WZ) continue;
        const ni = nx + nz * WX + ny * WXZ;
        if (isOpaque(this.voxels[ni])) continue;
        if (bl[ni] >= nl) continue;
        bl[ni] = nl;
        qx.push(nx); qy.push(ny); qz.push(nz); ql.push(nl);
      }
    }
    this.lightDirty = false;
  }
  lightAt(x, y, z) {
    if (x < 0 || x >= WX || y < 0 || y >= WY || z < 0 || z >= WZ) return 0;
    return this.blockLight[x + z * WX + y * WXZ];
  }

  // ---------------- raycast picking (single ray) ----------------
  // returns { bx,by,bz, face, nx,ny,nz, dist, hitId, px,py,pz,
  //           pbx,pby,pbz (empty cell before hit) } or null
  raycastPick(ox, oy, oz, dx, dy, dz, maxDist = 6, wantWater = false) {
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDX = Math.abs(1 / dx), tDY = Math.abs(1 / dy), tDZ = Math.abs(1 / dz);
    let tMX = dx === 0 ? Infinity : ((dx > 0 ? x + 1 - ox : ox - x) * tDX);
    let tMY = dy === 0 ? Infinity : ((dy > 0 ? y + 1 - oy : oy - y) * tDY);
    let tMZ = dz === 0 ? Infinity : ((dz > 0 ? z + 1 - oz : oz - z) * tDZ);
    let nx = 0, ny = 0, nz = 0, t = 0;
    // remember previous cell (the air cell we place into)
    let px = x, py = y, pz = z;
    for (let iter = 0; iter < 512; iter++) {
      px = x; py = y; pz = z;
      if (tMX < tMY && tMX < tMZ) { x += stepX; t = tMX; tMX += tDX; nx = -stepX; ny = 0; nz = 0; }
      else if (tMY < tMZ) { y += stepY; t = tMY; tMY += tDY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; t = tMZ; tMZ += tDZ; nx = 0; ny = 0; nz = -stepZ; }
      if (t > maxDist) return null;
      if (x < 0 || x >= WX || y < 0 || y >= WY || z < 0 || z >= WZ) return null;
      const id = this.voxels[x + z * WX + y * WXZ];
      if (id === 0) continue;
      if (id === B.WATER && !wantWater) continue;
      return {
        bx: x, by: y, bz: z, face: (nx ? 'x' : ny ? 'y' : 'z'),
        nx, ny, nz, dist: t, hitId: id,
        px: ox + dx * t, py: oy + dy * t, pz: oz + dz * t,
        pbx: px, pby: py, pbz: pz,
      };
    }
    return null;
  }

  // ---------------- save-diff ----------------
  serializeDiff() {
    const arr = [];
    for (const [i, id] of this.edits) arr.push(i, id);
    return arr;
  }
  loadDiff(arr) {
    this.generating = false;
    for (let i = 0; i < arr.length; i += 2) {
      const index = arr[i], id = arr[i + 1];
      const y = Math.floor(index / WXZ), rem = index - y * WXZ;
      const z = Math.floor(rem / WX), x = rem - z * WX;
      this.set(x, y, z, id);
    }
    this.recomputeLight();
  }
}
