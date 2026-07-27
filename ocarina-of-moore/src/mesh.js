// mesh.js — procedural low-poly geometry. Interleaved vertex format matches the
// renderer's attributes: pos3 / normal3 / color4 / uv2  = 12 floats (stride 48).
// The 4th color channel (alpha) is an EMISSIVE flag baked per-vertex (0 = fully
// lit by scene lighting, 1 = self-lit / glowing). Everything is built in code.

import { normalize, cross } from './gl.js';

export class Mesh {
  constructor() { this.v = []; }

  _tri(a, b, c, n, col) {
    const P = this.v, e = col[3] || 0;
    P.push(a[0], a[1], a[2], n[0], n[1], n[2], col[0], col[1], col[2], e, 0, 0);
    P.push(b[0], b[1], b[2], n[0], n[1], n[2], col[0], col[1], col[2], e, 0, 0);
    P.push(c[0], c[1], c[2], n[0], n[1], n[2], col[0], col[1], col[2], e, 0, 0);
  }

  tri(a, b, c, col) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = normalize(cross(u, w));
    this._tri(a, b, c, n, col);
  }

  // quad a->b->c->d CCW as seen from the front; normal auto from a,b,c.
  quad(a, b, c, d, col) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = normalize(cross(u, w));
    this._tri(a, b, c, n, col);
    this._tri(a, c, d, n, col);
  }

  // axis-aligned box, all 6 faces outward.
  box(x0, y0, z0, x1, y1, z1, col) {
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col); // +x
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col); // -x
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col); // +z
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col); // -z
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], col); // +y
    this.quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], col); // -y
  }

  // box centered at (cx,cy,cz) with half-extents.
  boxc(cx, cy, cz, hx, hy, hz, col) {
    this.box(cx - hx, cy - hy, cz - hz, cx + hx, cy + hy, cz + hz, col);
  }

  // vertical cylinder side wall + optional caps.
  cyl(cx, cz, r, y0, y1, segs, col, caps) {
    const TAU = Math.PI * 2;
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      const c0 = Math.cos(a0) * r, s0 = Math.sin(a0) * r;
      const c1 = Math.cos(a1) * r, s1 = Math.sin(a1) * r;
      this.quad([cx + c1, y0, cz + s1], [cx + c0, y0, cz + s0],
                [cx + c0, y1, cz + s0], [cx + c1, y1, cz + s1], col);
    }
    if (caps) { this.discUp(cx, cz, r, y1, segs, col); this.discDown(cx, cz, r, y0, segs, col); }
  }

  discUp(cx, cz, r, y, segs, col) {
    const TAU = Math.PI * 2, n = [0, 1, 0], c = [cx, y, cz];
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      this._tri(c, [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r],
                   [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], n, col);
    }
  }
  discDown(cx, cz, r, y, segs, col) {
    const TAU = Math.PI * 2, n = [0, -1, 0], c = [cx, y, cz];
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      this._tri(c, [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r],
                   [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], n, col);
    }
  }

  // cone / pyramid roof, apex up.
  cone(cx, cz, r, y0, apexY, segs, col) {
    const TAU = Math.PI * 2, apex = [cx, apexY, cz];
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      const p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
      this.tri(p1, p0, apex, col);
    }
  }

  // low-poly sphere (lat/long), centered at (cx,cy,cz).
  sphere(cx, cy, cz, r, rings, segs, col) {
    for (let i = 0; i < rings; i++) {
      const la0 = Math.PI * (i / rings - 0.5), la1 = Math.PI * ((i + 1) / rings - 0.5);
      const y0 = Math.sin(la0), y1 = Math.sin(la1);
      const rr0 = Math.cos(la0), rr1 = Math.cos(la1);
      for (let j = 0; j < segs; j++) {
        const lo0 = TAU2 * j / segs, lo1 = TAU2 * (j + 1) / segs;
        const c0 = Math.cos(lo0), s0 = Math.sin(lo0), c1 = Math.cos(lo1), s1 = Math.sin(lo1);
        const A = [cx + rr0 * c0 * r, cy + y0 * r, cz + rr0 * s0 * r];
        const B = [cx + rr0 * c1 * r, cy + y0 * r, cz + rr0 * s1 * r];
        const C = [cx + rr1 * c1 * r, cy + y1 * r, cz + rr1 * s1 * r];
        const D = [cx + rr1 * c0 * r, cy + y1 * r, cz + rr1 * s0 * r];
        // normals radial (smooth-ish) — use face normal for flat look
        this.quad(A, B, C, D, col);
      }
    }
  }

  // append another mesh's raw vertices (already interleaved).
  append(other) { for (let i = 0; i < other.v.length; i++) this.v.push(other.v[i]); }

  data() { return new Float32Array(this.v); }
  get count() { return this.v.length / 12; }
}

const TAU2 = Math.PI * 2;

// ---------------------------------------------------------------------------
// Reusable procedural props (built into a target Mesh at a world position).
// ---------------------------------------------------------------------------

export function addTree(M, x, z, s, rng) {
  const trunk = [0.42, 0.30, 0.18, 0];
  const leaf1 = [0.16, 0.52, 0.20, 0];
  const leaf2 = [0.22, 0.62, 0.26, 0];
  M.cyl(x, z, 0.28 * s, 0, 2.2 * s, 6, trunk, false);
  M.cone(x, z, 1.7 * s, 1.4 * s, 4.6 * s, 8, leaf1);
  M.cone(x, z, 1.35 * s, 2.5 * s, 5.4 * s, 8, leaf2);
  M.cone(x, z, 0.95 * s, 3.5 * s, 6.1 * s, 8, leaf1);
}

export function addRock(M, x, z, s) {
  const c = [0.46, 0.47, 0.50, 0];
  const c2 = [0.38, 0.39, 0.43, 0];
  M.sphere(x, 0.15 * s, z, 0.9 * s, 2, 6, c);
  M.boxc(x + 0.4 * s, 0.25 * s, z - 0.3 * s, 0.35 * s, 0.3 * s, 0.35 * s, c2);
}

export function addBush(M, x, z, s) {
  const g = [0.20, 0.50, 0.22, 0];
  M.sphere(x, 0.4 * s, z, 0.6 * s, 2, 6, g);
}

// A cozy village house: box body + peaked roof + door + windows.
export function addHouse(M, x, z, w, d, h, wallCol, roofCol) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  M.box(x0, 0, z0, x1, h, z1, wallCol);
  // peaked roof (two slabs + gable-ish) using a wide flat pyramid
  const rc = roofCol;
  const ax = x, az = z, apex = h + Math.max(w, d) * 0.42;
  // roof as pyramid over footprint
  const eaves = 0.35;
  const rx0 = x0 - eaves, rx1 = x1 + eaves, rz0 = z0 - eaves, rz1 = z1 + eaves;
  const top = [ax, apex, az];
  M.tri([rx0, h, rz0], [rx1, h, rz0], top, rc);
  M.tri([rx1, h, rz0], [rx1, h, rz1], top, rc);
  M.tri([rx1, h, rz1], [rx0, h, rz1], top, rc);
  M.tri([rx0, h, rz1], [rx0, h, rz0], top, rc);
  // door (dark box on -z face)
  const dc = [0.30, 0.20, 0.12, 0];
  M.box(x - 0.5, 0.02, z0 - 0.02, x + 0.5, 1.7, z0 + 0.06, dc);
  // windows (glowing warm)
  const wc = [0.95, 0.80, 0.35, 0.6];
  M.box(x0 - 0.02, 1.6, z + 0.5, x0 + 0.04, 2.3, z + 1.3, wc);
  M.box(x1 - 0.04, 1.6, z - 1.3, x1 + 0.02, 2.3, z - 0.5, wc);
}

// A stone dungeon wall segment (baked into static mesh).
export function addWall(M, x0, z0, x1, z1, h, col) {
  M.box(Math.min(x0, x1), 0, Math.min(z0, z1), Math.max(x0, x1), h, Math.max(z0, z1), col);
}
