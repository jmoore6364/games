// render.js — software 3D city renderer. A per-pixel heightfield raycaster:
// the city is a grid where each cell has a building top-height. For each screen
// pixel we cast a ray, march the XZ grid (2D DDA), and hit building walls/roofs
// or the ground plane, with procedural window/road textures + distance fog.
// Dynamic entities (cars, peds) are drawn as depth-tested projected boxes /
// billboards on top. Renders to a small ImageData, blitted pixelated + scaled.
// BROWSER-ONLY (uses canvas/document).

import { P, ROAD, TILE } from './city.js';

const FAR = 92;          // horizontal draw distance (world units)
const DEG = Math.PI / 180;

function bhash(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
    this.fov = 68 * DEG;
    this.setRes(220, 138);
    // sky palette
    this.skyTop = [70, 120, 200];
    this.skyHor = [175, 200, 225];
    this.fog = [175, 200, 225];
    this.sun = [255, 245, 210];
    this.sunDir = this._norm([0.5, 0.7, 0.35]);
  }
  _norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  setRes(w, h) {
    this.RW = w; this.RH = h;
    this.buf.width = w; this.buf.height = h;
    this.img = this.bctx.createImageData(w, h);
    this.depth = new Float32Array(w * h); // horizontal distance per pixel
  }

  // scene: { city, eye:{x,y,z}, yaw, pitch, entities:[...], time }
  render(scene) {
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    const city = scene.city, M = city.MAP, H = city.H, T = city.T;
    const ex = scene.eye.x, ey = scene.eye.y, ez = scene.eye.z;
    const yaw = scene.yaw, pitch = scene.pitch;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // camera basis
    const Fx = cy * cp, Fy = sp, Fz = sy * cp;
    const Rx = -sy, Rz = cy;                      // right (horizontal)
    const Ux = -cy * sp, Uy = cp, Uz = -sy * sp;  // up
    const tx = Math.tan(this.fov / 2), ty = tx * RH / RW;
    this.F = [Fx, Fy, Fz]; this.R = [Rx, 0, Rz]; this.U = [Ux, Uy, Uz];
    this.tx = tx; this.ty = ty; this.eye = [ex, ey, ez];

    const skyTop = this.skyTop, skyHor = this.skyHor, fog = this.fog, sun = this.sun, sd = this.sunDir;

    for (let py = 0; py < RH; py++) {
      const cv = (1 - (py + 0.5) / RH * 2) * ty;
      for (let px = 0; px < RW; px++) {
        const cu = ((px + 0.5) / RW * 2 - 1) * tx;
        let dx = Fx + Rx * cu + Ux * cv;
        let dy = Fy + Uy * cv;
        let dz = Fz + Rz * cu + Uz * cv;
        const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx *= inv; dy *= inv; dz *= inv;

        const o = (py * RW + px) * 4;
        const di = py * RW + px;
        let r, g, b, hitDepth = FAR;
        const sh = Math.hypot(dx, dz);

        let done = false;
        if (sh > 1e-4) {
          const rx = dx / sh, rz = dz / sh;      // unit horizontal dir
          const slope = dy / sh;                 // world y per horizontal unit
          const thGround = dy < -1e-5 ? ey / (-slope) : Infinity;

          let cellX = Math.floor(ex), cellZ = Math.floor(ez);
          const stepX = rx >= 0 ? 1 : -1, stepZ = rz >= 0 ? 1 : -1;
          const tDX = Math.abs(1 / rx), tDZ = Math.abs(1 / rz);
          let tMaxX = (rx >= 0 ? (cellX + 1 - ex) : (ex - cellX)) * tDX;
          let tMaxZ = (rz >= 0 ? (cellZ + 1 - ez) : (ez - cellZ)) * tDZ;
          let thEnter = 0, lastAxis = 0, lastSign = 0;

          for (let it = 0; it < 260; it++) {
            // ground closer than continuing?
            if (dy < -1e-5 && thEnter >= thGround) break;
            if (thEnter > FAR) break;
            if (cellX < 0 || cellZ < 0 || cellX >= M || cellZ >= M) break;
            const bh = H[cellX + cellZ * M];
            const cellExit = tMaxX < tMaxZ ? tMaxX : tMaxZ;
            if (bh > 0) {
              const yEnter = ey + slope * thEnter;
              if (yEnter >= 0 && yEnter <= bh && thEnter > 0.001) {
                // WALL HIT
                const hy = yEnter;
                const hcoord = lastAxis === 0 ? (ez + rz * thEnter) : (ex + rx * thEnter);
                const col = this._wall(cellX, cellZ, lastAxis, hcoord, hy, bh, scene.time);
                const f = thEnter / FAR, ff = f * f;
                r = col[0] + (fog[0] - col[0]) * ff;
                g = col[1] + (fog[1] - col[1]) * ff;
                b = col[2] + (fog[2] - col[2]) * ff;
                hitDepth = thEnter; done = true; break;
              } else if (slope < 0 && yEnter > bh) {
                const thRoof = (bh - ey) / slope;
                if (thRoof >= thEnter && thRoof <= cellExit) {
                  const col = this._roof(cellX, cellZ, bh);
                  const f = thRoof / FAR, ff = f * f;
                  r = col[0] + (fog[0] - col[0]) * ff;
                  g = col[1] + (fog[1] - col[1]) * ff;
                  b = col[2] + (fog[2] - col[2]) * ff;
                  hitDepth = thRoof; done = true; break;
                }
              }
            }
            // advance DDA
            if (tMaxX < tMaxZ) { cellX += stepX; thEnter = tMaxX; tMaxX += tDX; lastAxis = 0; lastSign = stepX; }
            else { cellZ += stepZ; thEnter = tMaxZ; tMaxZ += tDZ; lastAxis = 1; lastSign = stepZ; }
          }

          if (!done && dy < -1e-5 && thGround < FAR) {
            const gx = ex + rx * thGround, gz = ez + rz * thGround;
            const col = this._ground(city, gx, gz);
            const f = thGround / FAR, ff = f * f;
            r = col[0] + (fog[0] - col[0]) * ff;
            g = col[1] + (fog[1] - col[1]) * ff;
            b = col[2] + (fog[2] - col[2]) * ff;
            hitDepth = thGround; done = true;
          }
        }

        if (!done) {
          // sky
          const up = dy > 0 ? dy : 0; const m = Math.sqrt(up);
          r = skyHor[0] + (skyTop[0] - skyHor[0]) * m;
          g = skyHor[1] + (skyTop[1] - skyHor[1]) * m;
          b = skyHor[2] + (skyTop[2] - skyHor[2]) * m;
          // sun glow
          const dsun = dx * sd[0] + dy * sd[1] + dz * sd[2];
          if (dsun > 0.9) {
            const gl = (dsun - 0.9) / 0.1;
            const k = dsun > 0.995 ? 1 : gl * gl * 0.6;
            r += (sun[0] - r) * k; g += (sun[1] - g) * k; b += (sun[2] - b) * k;
          }
          hitDepth = FAR;
        }

        data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
        depth[di] = hitDepth;
      }
    }

    // dynamic entities depth-composited into the buffer
    if (scene.entities) this._drawEntities(scene.entities);

    this.bctx.putImageData(this.img, 0, 0);
    const DW = this.canvas.width, DH = this.canvas.height;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buf, 0, 0, RW, RH, 0, 0, DW, DH);
  }

  // --- procedural surface colors ----------------------------------------
  _wall(cx, cz, axis, hcoord, hy, bh, time) {
    const bx = Math.floor(cx / P), bz = Math.floor(cz / P);
    const seed = bhash(bx * 3 + 1, bz * 7 + 2);
    // facade base tint per building
    let br = 120 + seed * 90, bg = 118 + bhash(bx, bz + 9) * 80, bb = 120 + bhash(bx + 5, bz) * 95;
    // window grid
    const winW = 2.2, winH = 2.2, marginU = 0.55, marginV = 0.6;
    const wu = ((hcoord % winW) + winW) % winW;
    const wv = ((hy % winH) + winH) % winH;
    const inWin = wu > marginU && wu < winW - marginU && wv > marginV && wv < winH - marginV && hy > 1.2;
    let r, g, b;
    if (inWin) {
      const wi = Math.floor(hcoord / winW), wj = Math.floor(hy / winH);
      const lit = bhash(wi * 13 + bx * 101, wj * 17 + bz * 51) > 0.62;
      if (lit) { r = 250; g = 230; b = 150; }        // lit window
      else { r = 40 + seed * 20; g = 55 + seed * 25; b = 80 + seed * 30; } // dark glass
    } else {
      r = br; g = bg; b = bb;                          // concrete frame
    }
    // face directional shading
    const fb = axis === 0 ? 0.72 : 0.9;               // x-faces darker than z-faces
    // vertical ambient: slightly brighter up high
    const amb = 0.82 + Math.min(0.18, hy / bh * 0.18);
    const k = fb * amb;
    return [r * k, g * k, b * k];
  }

  _roof(cx, cz, bh) {
    const n = bhash(cx, cz);
    const base = 90 + n * 30;
    return [base * 0.9, base * 0.92, base];
  }

  _ground(city, gx, gz) {
    const tile = city.tileAt(gx, gz);
    if (tile === TILE.ROAD) {
      // asphalt with lane markings
      let r = 46, g = 47, b = 52;
      const rxm = ((gx % P) + P) % P, rzm = ((gz % P) + P) % P;
      const inX = rxm < ROAD, inZ = rzm < ROAD;
      // center dashed line along the dominant corridor
      if (inX && !inZ) {
        if (Math.abs(rxm - ROAD * 0.5) < 0.18 && (Math.floor(gz / 2) % 2 === 0)) { r = 190; g = 170; b = 60; }
      } else if (inZ && !inX) {
        if (Math.abs(rzm - ROAD * 0.5) < 0.18 && (Math.floor(gx / 2) % 2 === 0)) { r = 190; g = 170; b = 60; }
      }
      // subtle grain
      const n = bhash(gx | 0, gz | 0) * 8 - 4;
      return [r + n, g + n, b + n];
    }
    if (tile === TILE.SIDEWALK) {
      const seam = ((gx | 0) % 3 === 0 || (gz | 0) % 3 === 0) ? -18 : 0;
      return [126 + seam, 126 + seam, 132 + seam];
    }
    if (tile === TILE.GRASS) {
      const n = bhash(gx | 0, gz | 0) * 22;
      return [45 + n * 0.4, 95 + n, 48 + n * 0.3];
    }
    if (tile === TILE.SPECIAL) {
      return [110, 96, 80];
    }
    // building footprint seen as ground (shouldn't usually happen)
    return [70, 70, 76];
  }

  // --- entities ----------------------------------------------------------
  _proj(x, y, z) {
    const vx = x - this.eye[0], vy = y - this.eye[1], vz = z - this.eye[2];
    const cu = vx * this.R[0] + vz * this.R[2];
    const cv = vx * this.U[0] + vy * this.U[1] + vz * this.U[2];
    const cz = vx * this.F[0] + vy * this.F[1] + vz * this.F[2];
    return { cu, cv, cz };
  }
  _screen(x, y, z) {
    const p = this._proj(x, y, z);
    if (p.cz <= 0.06) return null;
    return {
      x: (p.cu / (p.cz * this.tx) + 1) * 0.5 * this.RW,
      y: (1 - p.cv / (p.cz * this.ty)) * 0.5 * this.RH,
      cz: p.cz,
    };
  }

  _drawEntities(ents) {
    const ex = this.eye[0], ez = this.eye[2];
    // sort back-to-front by horizontal distance
    const list = ents.slice().sort((a, b) =>
      ((b.x - ex) ** 2 + (b.z - ez) ** 2) - ((a.x - ex) ** 2 + (a.z - ez) ** 2));
    for (const e of list) {
      const hd = Math.hypot(e.x - ex, e.z - ez);
      if (hd > FAR) continue;
      if (e.kind === 'ped') this._drawPed(e, hd);
      else this._drawCarBox(e, hd);
    }
  }

  _drawCarBox(e, hd) {
    const hw = e.w * 0.5, hl = e.l * 0.5, hh = e.h;
    const ca = Math.cos(e.heading), sa = Math.sin(e.heading);
    // 8 corners (local: length along heading = x', width = z')
    const corners = [];
    const yb = 0.15, yt = hh;
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      const lx = sx * hl, lz = sz * hw;
      const wx = e.x + ca * lx - sa * lz;
      const wz = e.z + sa * lx + ca * lz;
      corners.push([wx, wz]);
    }
    // corners index: 0(-l,-w),1(+l,-w),2(-l,+w),3(+l,+w)
    // build faces (each with 4 world pts with y)
    const P0 = corners[0], P1 = corners[1], P2 = corners[2], P3 = corners[3];
    const col = e.color;
    const faces = [
      // top (roof) — lighter
      { pts: [[P0[0], yt, P0[1]], [P1[0], yt, P1[1]], [P3[0], yt, P3[1]], [P2[0], yt, P2[1]]], c: [col[0] * 1.05, col[1] * 1.05, col[2] * 1.05] },
      // sides
      { pts: [[P0[0], yb, P0[1]], [P1[0], yb, P1[1]], [P1[0], yt, P1[1]], [P0[0], yt, P0[1]]], c: [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8] },
      { pts: [[P2[0], yb, P2[1]], [P3[0], yb, P3[1]], [P3[0], yt, P3[1]], [P2[0], yt, P2[1]]], c: [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7] },
      { pts: [[P0[0], yb, P0[1]], [P2[0], yb, P2[1]], [P2[0], yt, P2[1]], [P0[0], yt, P0[1]]], c: [col[0] * 0.9, col[1] * 0.9, col[2] * 0.9] },
      { pts: [[P1[0], yb, P1[1]], [P3[0], yb, P3[1]], [P3[0], yt, P3[1]], [P1[0], yt, P1[1]]], c: [col[0] * 0.75, col[1] * 0.75, col[2] * 0.75] },
    ];
    // draw each face, depth via face centroid horizontal distance
    for (const f of faces) {
      const scr = [];
      let ok = true, cxs = 0, czs = 0;
      for (const pt of f.pts) {
        const s = this._screen(pt[0], pt[1], pt[2]);
        if (!s) { ok = false; break; }
        scr.push(s); cxs += pt[0]; czs += pt[2];
      }
      if (!ok) continue;
      const fd = Math.hypot(cxs / 4 - this.eye[0], czs / 4 - this.eye[2]);
      this._fillQuad(scr, f.c[0], f.c[1], f.c[2], fd);
    }
    // police light bar flash
    if (e.kind === 'police' && ((this.eye && (Math.floor((e.flash || 0)) % 2) === 0))) {}
    if (e.police) {
      const lb = this._screen(e.x, yt + 0.35, e.z);
      if (lb) {
        const on = (e.flash | 0) % 2 === 0;
        this._blob(lb, on ? [255, 40, 40] : [40, 60, 255], hd, 1.4);
      }
    }
  }

  _drawPed(e, hd) {
    // camera-facing billboard: body + head, simple shading.
    // `e.y` is the height off the ground (nonzero only while the player is
    // jumping), so the billboard actually leaves the ground.
    const ey = e.y || 0;
    // ground shadow when airborne, so the hop reads clearly
    if (ey > 0.05) {
      const sh = this._screen(e.x, 0, e.z);
      if (sh) this._blob(sh, [10, 10, 14], hd, Math.max(0.6, 1.6 - ey * 0.12));
    }
    const base = this._screen(e.x, ey, e.z);
    const top = this._screen(e.x, ey + e.h, e.z);
    if (!base || !top) return;
    const down = e.state === 'down';
    let x0 = base.x, y0 = down ? base.y - 2 : top.y, y1 = base.y;
    const hpix = Math.abs(y1 - y0);
    const wpix = Math.max(1.2, hpix * (down ? 0.5 : 0.32));
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    const fd = hd;
    const bx0 = Math.floor(x0 - wpix), bx1 = Math.ceil(x0 + wpix);
    const by0 = Math.floor(Math.min(y0, y1)), by1 = Math.ceil(Math.max(y0, y1));
    for (let yy = by0; yy <= by1; yy++) {
      if (yy < 0 || yy >= RH) continue;
      const frac = (yy - Math.min(y0, y1)) / (hpix || 1);
      for (let xx = bx0; xx <= bx1; xx++) {
        if (xx < 0 || xx >= RW) continue;
        if (Math.abs(xx - x0) > wpix) continue;
        const di = yy * RW + xx;
        if (fd > depth[di] + 0.2) continue;
        // head (top ~22%) vs shirt vs pants
        let c;
        if (!down && frac < 0.22) c = [225, 190, 160];
        else if (frac < 0.6) c = e.shirt || e.color;
        else c = e.color;
        const o = di * 4;
        data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2];
        depth[di] = fd;
      }
    }
  }

  _blob(s, col, fd, rad) {
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    const r = Math.max(1, rad);
    for (let yy = Math.floor(s.y - r); yy <= s.y + r; yy++)
      for (let xx = Math.floor(s.x - r); xx <= s.x + r; xx++) {
        if (xx < 0 || xx >= RW || yy < 0 || yy >= RH) continue;
        if ((xx - s.x) ** 2 + (yy - s.y) ** 2 > r * r) continue;
        const di = yy * RW + xx;
        if (fd > depth[di] + 0.4) continue;
        const o = di * 4; data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2];
      }
  }

  // fill a convex quad (4 screen pts) with a flat color, depth-tested
  _fillQuad(s, r, g, b, fd) {
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const p of s) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); }
    minx = Math.max(0, Math.floor(minx)); maxx = Math.min(RW - 1, Math.ceil(maxx));
    miny = Math.max(0, Math.floor(miny)); maxy = Math.min(RH - 1, Math.ceil(maxy));
    if (minx > maxx || miny > maxy) return;
    // two triangles: (0,1,2) and (0,2,3)
    const tri = (a, bb, c, x, y) => {
      const d1 = (x - bb.x) * (a.y - bb.y) - (a.x - bb.x) * (y - bb.y);
      const d2 = (x - c.x) * (bb.y - c.y) - (bb.x - c.x) * (y - c.y);
      const d3 = (x - a.x) * (c.y - a.y) - (c.x - a.x) * (y - a.y);
      const neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      return !(neg && pos);
    };
    for (let yy = miny; yy <= maxy; yy++) {
      for (let xx = minx; xx <= maxx; xx++) {
        const cx = xx + 0.5, cyy = yy + 0.5;
        if (!(tri(s[0], s[1], s[2], cx, cyy) || tri(s[0], s[2], s[3], cx, cyy))) continue;
        const di = yy * RW + xx;
        if (fd > depth[di] + 0.25) continue;   // occluded by building
        const o = di * 4;
        data[o] = r; data[o + 1] = g; data[o + 2] = b;
        depth[di] = fd;
      }
    }
  }
}
