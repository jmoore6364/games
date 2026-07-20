// render.js — software voxel raycaster (DDA) for "Moorecraft: The Shattered Sky".
// Renders to a low-res ImageData then blits pixelated to the display canvas.
// Visual identity pass: colored volumetric void fog, aurora/nebula sky with twin
// moons + distant islands, cheap bloom, crystalline undersides, dangling roots /
// waterfalls, drifting particles, beveled/inked block edges, and wispy Hollow mobs.

import { WX, WY, WZ, WXZ, BLOCKS, B, isOpaque } from './world.js';
import { TEX, TS, ALPHA, drawItemIcon } from './sprites.js';

const RENDER_DIST = 62;
const TWO_PI = Math.PI * 2, INV_TWO_PI = 1 / TWO_PI;

// sky panorama resolution (azimuth x elevation)
const SPW = 256, SPH = 96;

function shash(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function svnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = shash(xi, yi, s), b = shash(xi + 1, yi, s);
  const c = shash(xi, yi + 1, s), d = shash(xi + 1, yi + 1, s);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
    this.setRes(200, 120);
    this.fov = 72 * Math.PI / 180;
    this._buildSky();
    this.particles = null;
    this._lastNow = (typeof performance !== 'undefined') ? performance.now() : 0;
  }
  setRes(w, h) {
    this.RW = w; this.RH = h;
    this.buf.width = w; this.buf.height = h;
    this.img = this.bctx.createImageData(w, h);
    this.depth = new Float32Array(w * h);
    this.bloom = new Float32Array(w * h * 3);
    this.bloom2 = new Float32Array(w * h * 3);
  }

  // ---- precomputed aurora/nebula/star panorama + distant island silhouettes ----
  _buildSky() {
    const add = new Float32Array(SPW * SPH * 3);   // additive stars + nebula (scaled by night)
    const isl = new Uint8ClampedArray(SPW * SPH * 4); // distant island silhouettes (alpha-composited)
    for (let pv = 0; pv < SPH; pv++) {
      const el = 1 - (pv / (SPH - 1)) * 2;          // +1 zenith .. -1 nadir
      for (let pu = 0; pu < SPW; pu++) {
        const az = pu / SPW;                         // 0..1
        const o = (pv * SPW + pu) * 3;
        // nebula band: soft teal->violet clouds concentrated in the upper sky
        let neb = svnoise(az * 9, (el + 1) * 5, 11) * 0.6 + svnoise(az * 20, (el + 1) * 9, 23) * 0.4;
        neb = Math.max(0, neb - 0.5) * 2;
        const bandY = Math.max(0, 1 - Math.abs(el - 0.35) * 1.7);
        neb *= bandY * bandY;
        add[o] += neb * 46; add[o + 1] += neb * 30; add[o + 2] += neb * 74;
        // stars: sparse bright dots, denser toward the zenith
        if (el > -0.05) {
          const st = shash(pu, pv, 7);
          const dens = 0.986 - el * 0.01;
          if (st > dens) {
            const b = (st - dens) / (1 - dens);
            const tw = 120 + b * 135;
            add[o] += tw * 0.82; add[o + 1] += tw * 0.9; add[o + 2] += tw;
          }
        }
      }
    }
    // distant silhouetted islands parallaxing low on the horizon
    const isles = [
      { az: 0.07, w: 0.06, h: 0.10 }, { az: 0.26, w: 0.09, h: 0.15 },
      { az: 0.43, w: 0.05, h: 0.09 }, { az: 0.61, w: 0.10, h: 0.17 },
      { az: 0.78, w: 0.06, h: 0.11 }, { az: 0.92, w: 0.07, h: 0.12 },
    ];
    for (const s of isles) {
      for (let pu = 0; pu < SPW; pu++) {
        const az = pu / SPW;
        let d = Math.abs(az - s.az); d = Math.min(d, 1 - d);
        if (d > s.w) continue;
        const nd = d / s.w;                           // 0 centre .. 1 rim
        const prof = Math.sqrt(1 - nd * nd);          // rounded dome
        const topEl = 0.01 + s.h * prof;
        const botEl = -s.h * (0.85 * prof) - 0.012;   // tapering crystal underside
        for (let pv = 0; pv < SPH; pv++) {
          const el = 1 - (pv / (SPH - 1)) * 2;
          if (el > topEl || el < botEl) continue;
          const o = (pv * SPW + pu) * 4;
          const lit = el > topEl - 0.02 ? 1 : 0;      // sunlit top rim
          isl[o] = lit ? 92 : 34; isl[o + 1] = lit ? 124 : 34; isl[o + 2] = lit ? 156 : 54;
          isl[o + 3] = el < 0 ? 150 : 210;            // underside fades into void
        }
      }
    }
    this.skyAdd = add; this.skyIsl = isl;
  }

  // env: { day, night, nightAmt, skyTop,skyHor,voidTop,voidBot,voidGlow,
  //        sunDir,sunCol, moonDirs:[{dir,col,rad}], pulse, time, entities }
  render(world, player, env) {
    const now = (typeof performance !== 'undefined') ? performance.now() : (this._lastNow + 16);
    let dt = (now - this._lastNow) / 1000; this._lastNow = now;
    if (!(dt >= 0) || dt > 0.1) dt = 0.016;

    const RW = this.RW, RH = this.RH;
    const data = this.img.data, depth = this.depth;
    const ex = player.eyeX(), ey = player.eyeY(), ez = player.eyeZ();
    const yaw = player.yaw, pitch = player.pitch;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const Fx = cy * cp, Fy = sp, Fz = sy * cp;
    const Rx = -sy, Rz = cy;
    const Ux = -cy * sp, Uy = cp, Uz = -sy * sp;
    const tx = Math.tan(this.fov / 2);
    const ty = tx * RH / RW;
    this.F = [Fx, Fy, Fz]; this.R = [Rx, 0, Rz]; this.U = [Ux, Uy, Uz];
    this.tx = tx; this.ty = ty; this.eye = [ex, ey, ez];

    const vox = world.voxels, blight = world.blockLight;
    const day = env.day;
    const nightAmt = env.nightAmt ?? (env.night ? 1 : 0);
    const pulse = env.pulse ?? 1;
    const time = env.time ?? (now / 1000);
    const skyTop = env.skyTop, skyHor = env.skyHor, voidTop = env.voidTop, voidBot = env.voidBot;
    const vg = env.voidGlow || voidBot;
    const sdx = env.sunDir[0], sdy = env.sunDir[1], sdz = env.sunDir[2];
    const sunR = env.sunCol[0], sunG = env.sunCol[1], sunB = env.sunCol[2];
    const moons = env.moonDirs || [];
    const skyAdd = this.skyAdd, skyIsl = this.skyIsl;

    for (let py = 0; py < RH; py++) {
      const cv = (1 - (py + 0.5) / RH * 2) * ty;
      const ruy = Uy * cv;
      for (let px = 0; px < RW; px++) {
        const cu = ((px + 0.5) / RW * 2 - 1) * tx;
        let dx = Fx + Rx * cu + Ux * cv;
        let dy = Fy + ruy;
        let dz = Fz + Rz * cu + Uz * cv;
        const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx *= inv; dy *= inv; dz *= inv;

        // fog target colour for this ray: horizon by default, but rays angled
        // down melt into the glowing teal->violet void.
        let fogR = skyHor[0], fogG = skyHor[1], fogB = skyHor[2];
        if (dy < 0) {
          const dn = -dy;
          fogR += (vg[0] - fogR) * dn; fogG += (vg[1] - fogG) * dn; fogB += (vg[2] - fogB) * dn;
        }

        // --- DDA ---
        let vx = Math.floor(ex), vy = Math.floor(ey), vz = Math.floor(ez);
        const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
        const tDX = Math.abs(1 / dx), tDY = Math.abs(1 / dy), tDZ = Math.abs(1 / dz);
        let tMX = dx === 0 ? 1e9 : (dx > 0 ? vx + 1 - ex : ex - vx) * tDX;
        let tMY = dy === 0 ? 1e9 : (dy > 0 ? vy + 1 - ey : ey - vy) * tDY;
        let tMZ = dz === 0 ? 1e9 : (dz > 0 ? vz + 1 - ez : ez - vz) * tDZ;
        let t = 0, nAxis = 0, nSign = 0;
        let pvx = vx, pvy = vy, pvz = vz;

        let accR = 0, accG = 0, accB = 0, trans = 1, firstT = -1;

        for (let it = 0; it < 256; it++) {
          pvx = vx; pvy = vy; pvz = vz;
          if (tMX < tMY && tMX < tMZ) { vx += stepX; t = tMX; tMX += tDX; nAxis = 0; nSign = -stepX; }
          else if (tMY < tMZ) { vy += stepY; t = tMY; tMY += tDY; nAxis = 1; nSign = -stepY; }
          else { vz += stepZ; t = tMZ; tMZ += tDZ; nAxis = 2; nSign = -stepZ; }
          if (t > RENDER_DIST) break;
          if (vx < 0 || vx >= WX || vy < 0 || vy >= WY || vz < 0 || vz >= WZ) break;
          const id = vox[vx + vz * WX + vy * WXZ];
          if (id === 0) continue;

          const hx = ex + dx * t, hy = ey + dy * t, hz = ez + dz * t;
          let u, v, tile;
          if (nAxis === 1) { u = hx - Math.floor(hx); v = hz - Math.floor(hz); tile = nSign > 0 ? TEX[id].top : TEX[id].bottom; }
          else if (nAxis === 0) { u = hz - Math.floor(hz); v = 1 - (hy - Math.floor(hy)); tile = TEX[id].side; }
          else { u = hx - Math.floor(hx); v = 1 - (hy - Math.floor(hy)); tile = TEX[id].side; }
          let tu = (u * TS) | 0; if (tu > TS - 1) tu = TS - 1; if (tu < 0) tu = 0;
          let tv = (v * TS) | 0; if (tv > TS - 1) tv = TS - 1; if (tv < 0) tv = 0;
          const to = (tv * TS + tu) * 3;
          let r = tile[to], g = tile[to + 1], b = tile[to + 2];

          // face brightness
          let fb = nAxis === 1 ? (nSign > 0 ? 1.0 : 0.5) : (nAxis === 2 ? 0.82 : 0.66);
          let bl = 0;
          if (pvx >= 0 && pvx < WX && pvy >= 0 && pvy < WY && pvz >= 0 && pvz < WZ)
            bl = blight[pvx + pvz * WX + pvy * WXZ];
          let lum = Math.max(day * 0.96 + 0.04, (bl / 15) * 1.05);
          const emit = BLOCKS[id].light;
          if (emit > 0) lum = Math.max(lum, 0.85 + emit / 15 * 0.35);
          if (lum > 1.15) lum = 1.15;
          let bright = fb * (0.14 + 0.86 * lum);

          // beveled/inked edges: dark chamfer at the cube seams (toon outline).
          const edge = u < 1 - u ? u : 1 - u; const edge2 = v < 1 - v ? v : 1 - v;
          const em2 = edge < edge2 ? edge : edge2;
          if (em2 < 0.055) bright *= 0.55;
          else if (em2 < 0.12) bright *= 0.82;

          // crystalline underside: bottom-facing exposed faces read as jagged
          // crystal with cool lumite veins instead of flat stone.
          if (nAxis === 1 && nSign < 0) {
            const vein = (((vx * 3 + vz * 5) ^ (vx >> 1)) & 7);
            const cf = 0.6 + 0.5 * ((u + v) % 0.5);
            r = r * 0.5 + 30 * cf; g = g * 0.55 + 60 * cf; b = b * 0.7 + 96 * cf;
            if (vein === 0) { g += 60; b += 90; }   // glowing crystal vein
          }

          // lumite (and emitters) pulse/glow
          if (emit >= 13) bright *= pulse;
          r *= bright; g *= bright; b *= bright;

          // glossy grass: a view-dependent specular sheen on top faces. Blinn
          // half-vector against the up normal (0,1,0), so a bright highlight
          // slides across the lawn as you look around. Gated by daylight.
          if (id === B.GRASS && nAxis === 1 && nSign > 0) {
            const vxe = -dx, vye = -dy, vze = -dz;         // view dir (toward eye)
            let hyH = 0.86 + vye, hxH = 0.35 + vxe, hzH = 0.37 + vze;
            const hlen = Math.sqrt(hxH * hxH + hyH * hyH + hzH * hzH) || 1;
            let spec = hyH / hlen; if (spec < 0) spec = 0;
            spec *= spec; spec *= spec; spec *= spec; spec *= spec; // ^16 = tight hotspot
            const sheen = spec * (0.5 * day + 0.1);
            r += 175 * sheen; g += 190 * sheen; b += 150 * sheen;
          }

          // volumetric distance fog toward the ray's fog colour
          const fogT = t / RENDER_DIST; const ff = fogT * fogT * 0.94;
          r += (fogR - r) * ff; g += (fogG - g) * ff; b += (fogB - b) * ff;

          if (firstT < 0) firstT = t;

          if (isOpaque(id)) {
            accR += trans * r; accG += trans * g; accB += trans * b; trans = 0;
            break;
          } else {
            const cover = ALPHA[id] ?? 0.5;
            accR += trans * cover * r; accG += trans * cover * g; accB += trans * cover * b;
            trans *= (1 - cover);
            if (trans < 0.05) break;
          }
        }

        // sky / void for remaining transmittance
        if (trans > 0.001) {
          let sr, sg, sb;
          if (dy >= 0) {
            const up = dy < 1 ? dy : 1; const m = Math.sqrt(up);
            sr = skyHor[0] + (skyTop[0] - skyHor[0]) * m;
            sg = skyHor[1] + (skyTop[1] - skyHor[1]) * m;
            sb = skyHor[2] + (skyTop[2] - skyHor[2]) * m;
          } else {
            const dn = -dy < 1 ? -dy : 1; const m = dn * dn;
            sr = voidTop[0] + (voidBot[0] - voidTop[0]) * m;
            sg = voidTop[1] + (voidBot[1] - voidTop[1]) * m;
            sb = voidTop[2] + (voidBot[2] - voidTop[2]) * m;
          }

          // panorama: distant islands (composite) + stars/nebula (additive)
          let az = Math.atan2(dz, dx) * INV_TWO_PI + 0.5;
          az -= Math.floor(az);
          let pui = (az * SPW) | 0; if (pui >= SPW) pui = SPW - 1;
          let pvf = (0.5 - dy * 0.5) * SPH; if (pvf < 0) pvf = 0; if (pvf > SPH - 1) pvf = SPH - 1;
          const pvi = pvf | 0;
          const pIdx = pvi * SPW + pui;
          const ia = skyIsl[pIdx * 4 + 3];
          if (ia) {
            const a = ia / 255;
            sr += (skyIsl[pIdx * 4] - sr) * a;
            sg += (skyIsl[pIdx * 4 + 1] - sg) * a;
            sb += (skyIsl[pIdx * 4 + 2] - sb) * a;
          }
          if (nightAmt > 0.02) {
            const a3 = pIdx * 3;
            sr += skyAdd[a3] * nightAmt; sg += skyAdd[a3 + 1] * nightAmt; sb += skyAdd[a3 + 2] * nightAmt;
          }

          // aurora ribbons (cheap rational falloff, animated)
          if (nightAmt > 0.03 && dy > -0.08) {
            const azr = az * TWO_PI;
            const c1 = 0.40 + 0.16 * Math.sin(azr * 2.0 + time * 0.22);
            const c2 = 0.26 + 0.12 * Math.sin(azr * 3.3 - time * 0.15 + 1.7);
            const d1 = dy - c1, d2 = dy - c2;
            let a = 1 / (1 + d1 * d1 * 130) + 0.6 / (1 + d2 * d2 * 190);
            a *= nightAmt * 0.9;
            const mix = 0.5 + 0.5 * Math.sin(azr * 1.3 + time * 0.1);
            sr += (70 + 90 * (1 - mix)) * a * 0.5;
            sg += (200 * mix + 90 * (1 - mix)) * a * 0.5;
            sb += (150 * mix + 220 * (1 - mix)) * a * 0.5;
          }

          // sun disk + glow
          const sd = dx * sdx + dy * sdy + dz * sdz;
          if (sd > 0.995) {
            const gl = (sd - 0.995) / 0.005;
            const disk = sd > 0.9985 ? 1 : gl * 0.5;
            sr += (sunR - sr) * disk; sg += (sunG - sg) * disk; sb += (sunB - sb) * disk;
          }
          // twin moons
          for (let mi = 0; mi < moons.length; mi++) {
            const m = moons[mi], md = m.dir;
            const dm = dx * md[0] + dy * md[1] + dz * md[2];
            const edge = 0.988 + (1 - m.rad) * 0.006;
            if (dm > edge) {
              const gl = (dm - edge) / (1 - edge);
              const disk = gl > 0.45 ? 1 : gl / 0.45;
              sr += (m.col[0] - sr) * disk; sg += (m.col[1] - sg) * disk; sb += (m.col[2] - sb) * disk;
            }
          }

          accR += trans * sr; accG += trans * sg; accB += trans * sb;
          if (firstT < 0) firstT = RENDER_DIST;
        }

        const o = (py * RW + px) * 4;
        data[o] = accR; data[o + 1] = accG; data[o + 2] = accB; data[o + 3] = 255;
        depth[py * RW + px] = firstT < 0 ? RENDER_DIST : firstT;
      }
    }

    // decorative props (roots / waterfalls) — cosmetic, depth-tested billboards
    if (world.props && world.props.length) this._drawProps(world.props, player, env, time);
    // floating particles
    this._drawParticles(world, player, env, dt, time);
    // entities as wispy billboards
    if (env.entities) this._drawEntities(env.entities, player, env, time);

    // cheap bloom around bright emitters (lumite / sun / moons)
    this._bloom();

    this.bctx.putImageData(this.img, 0, 0);
    const DW = this.canvas.width, DH = this.canvas.height;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buf, 0, 0, this.RW, this.RH, 0, 0, DW, DH);
  }

  // ---- bloom: bright-pass + separable blur, added back additively ----
  _bloom() {
    const RW = this.RW, RH = this.RH, data = this.img.data;
    const a = this.bloom, b = this.bloom2, N = RW * RH;
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const r = data[j], g = data[j + 1], bl = data[j + 2];
      const mx = r > g ? (r > bl ? r : bl) : (g > bl ? g : bl);
      const o = i * 3;
      if (mx > 188) {
        const w = (mx - 188) / 67;
        a[o] = r * w; a[o + 1] = g * w; a[o + 2] = bl * w;
      } else { a[o] = 0; a[o + 1] = 0; a[o + 2] = 0; }
    }
    // horizontal blur a->b (radius 2)
    for (let y = 0; y < RH; y++) {
      const row = y * RW;
      for (let x = 0; x < RW; x++) {
        const x0 = x > 1 ? x - 2 : 0, x1 = x < RW - 2 ? x + 2 : RW - 1;
        let sr = 0, sg = 0, sb = 0, c = 0;
        for (let xx = x0; xx <= x1; xx++) { const o = (row + xx) * 3; sr += a[o]; sg += a[o + 1]; sb += a[o + 2]; c++; }
        const o = (row + x) * 3; b[o] = sr / c; b[o + 1] = sg / c; b[o + 2] = sb / c;
      }
    }
    // vertical blur b->a, then add to data
    for (let x = 0; x < RW; x++) {
      for (let y = 0; y < RH; y++) {
        const y0 = y > 1 ? y - 2 : 0, y1 = y < RH - 2 ? y + 2 : RH - 1;
        let sr = 0, sg = 0, sb = 0, c = 0;
        for (let yy = y0; yy <= y1; yy++) { const o = (yy * RW + x) * 3; sr += b[o]; sg += b[o + 1]; sb += b[o + 2]; c++; }
        const i = y * RW + x, j = i * 4;
        let nr = data[j] + (sr / c) * 0.6, ng = data[j + 1] + (sg / c) * 0.6, nb = data[j + 2] + (sb / c) * 0.6;
        data[j] = nr > 255 ? 255 : nr; data[j + 1] = ng > 255 ? 255 : ng; data[j + 2] = nb > 255 ? 255 : nb;
      }
    }
  }

  // ---- floating particles: motes by day, embers near lumite, wisps at night ----
  _initParticles(player) {
    const n = 46; const arr = new Array(n);
    for (let i = 0; i < n; i++) arr[i] = this._spawnParticle(player, {});
    this.particles = arr;
  }
  _spawnParticle(player, p) {
    const R = 15;
    p.x = player.x + (Math.random() - 0.5) * 2 * R;
    p.y = player.y + (Math.random() - 0.4) * 14;
    p.z = player.z + (Math.random() - 0.5) * 2 * R;
    p.seed = Math.random() * 100;
    p.spd = 0.15 + Math.random() * 0.4;
    return p;
  }
  _drawParticles(world, player, env, dt, time) {
    if (!this.particles) this._initParticles(player);
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    const tx = this.tx, ty = this.ty;
    const night = env.night, nightAmt = env.nightAmt ?? (night ? 1 : 0);
    for (const p of this.particles) {
      // drift
      p.x += Math.sin(time * 0.5 + p.seed) * 0.25 * dt;
      p.z += Math.cos(time * 0.4 + p.seed * 1.3) * 0.25 * dt;
      p.y += (night ? p.spd : (Math.sin(time * 0.6 + p.seed) * 0.3)) * dt;
      const dxp = p.x - player.x, dzp = p.z - player.z;
      if (dxp * dxp + dzp * dzp > 20 * 20 || p.y < player.y - 12 || p.y > player.y + 16) {
        this._spawnParticle(player, p); continue;
      }
      const pr = this._proj([p.x, p.y, p.z]);
      if (pr.cz < 0.2) continue;
      const sx = (pr.cu / (pr.cz * tx) + 1) * 0.5 * RW;
      const sy = (1 - pr.cv / (pr.cz * ty)) * 0.5 * RH;
      const ix = sx | 0, iy = sy | 0;
      if (ix < 0 || ix >= RW || iy < 0 || iy >= RH) continue;
      const di = iy * RW + ix;
      if (pr.cz > depth[di] + 0.1) continue;
      // colour by context
      const bl = world.blockLight ? world.lightAt(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) : 0;
      let cr, cg, cb;
      if (bl > 8) { cr = 255; cg = 190; cb = 110; }        // ember near lumite/torch
      else if (night) { cr = 120; cg = 175; cb = 235; }    // void-wisp
      else { cr = 150; cg = 205; cb = 195; }               // daytime mote
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 3 + p.seed * 5));
      const w = (night ? 0.55 : 0.35) * tw + (bl > 8 ? 0.3 : 0);
      const j = di * 4;
      data[j] = Math.min(255, data[j] + cr * w);
      data[j + 1] = Math.min(255, data[j + 1] + cg * w);
      data[j + 2] = Math.min(255, data[j + 2] + cb * w);
    }
  }

  // ---- dangling roots / thin void-waterfalls under island rims (cosmetic) ----
  _drawProps(props, player, env, time) {
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    const tx = this.tx, ty = this.ty;
    for (const pr0 of props) {
      const ddx = pr0.x - player.x, ddz = pr0.z - player.z;
      if (ddx * ddx + ddz * ddz > 52 * 52) continue;
      const sway = Math.sin(time * 0.8 + pr0.x + pr0.z) * 0.25;
      const isFall = pr0.kind === 'fall';
      const steps = Math.max(4, (pr0.len * 2) | 0);
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const wx = pr0.x + sway * f;
        const wy = pr0.y - f * pr0.len;
        const wz = pr0.z + sway * 0.5 * f;
        const pr = this._proj([wx, wy, wz]);
        if (pr.cz < 0.25) continue;
        const sx = (pr.cu / (pr.cz * tx) + 1) * 0.5 * RW;
        const sy = (1 - pr.cv / (pr.cz * ty)) * 0.5 * RH;
        const ix = sx | 0, iy = sy | 0;
        if (ix < 0 || ix >= RW || iy < 0 || iy >= RH) continue;
        const di = iy * RW + ix;
        if (pr.cz > depth[di] + 0.3) continue;
        const j = di * 4;
        if (isFall) {
          // shimmering teal waterfall spilling into the void
          const sh = 0.55 + 0.45 * Math.sin(time * 6 + i * 1.7);
          data[j] = Math.min(255, 120 + 60 * sh);
          data[j + 1] = Math.min(255, 210 + 40 * sh);
          data[j + 2] = 255;
        } else {
          // knotty root, darker toward the tip
          const k = 1 - f * 0.55;
          data[j] = 78 * k; data[j + 1] = 56 * k; data[j + 2] = 40 * k;
        }
      }
    }
  }

  _proj(P) {
    const ex = this.eye[0], ey = this.eye[1], ez = this.eye[2];
    const vx = P[0] - ex, vy = P[1] - ey, vz = P[2] - ez;
    const cu = vx * this.R[0] + vz * this.R[2];
    const cv = vx * this.U[0] + vy * this.U[1] + vz * this.U[2];
    const cz = vx * this.F[0] + vy * this.F[1] + vz * this.F[2];
    return { cu, cv, cz };
  }

  _drawEntities(ents, player, env, time) {
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    const tx = this.tx, ty = this.ty;
    const list = [];
    for (const d of ents.drops) list.push({ x: d.x, y: d.y + 0.25, z: d.z, kind: 'drop', id: d.id });
    for (const m of ents.mobs) list.push({ x: m.x, y: m.y + 0.5, z: m.z, kind: 'mob', flash: m.flash, fuse: m.fuse, seed: (m.x * 7 + m.z * 13) });
    for (const p of list) {
      const pr = this._proj([p.x, p.y, p.z]);
      if (pr.cz < 0.15) continue;
      const sx = (pr.cu / (pr.cz * tx) + 1) * 0.5 * RW;
      const sy = (1 - pr.cv / (pr.cz * ty)) * 0.5 * RH;
      const rad = (p.kind === 'mob' ? 0.62 : 0.22) / (pr.cz) * (RH / (2 * ty));
      const r0 = Math.max(1, rad);
      if (p.kind === 'drop') {
        const col = BLOCKS[p.id < BLOCKS.length ? p.id : B.STONE].col;
        const x0 = Math.max(0, Math.floor(sx - r0)), x1 = Math.min(RW - 1, Math.ceil(sx + r0));
        const y0 = Math.max(0, Math.floor(sy - r0)), y1 = Math.min(RH - 1, Math.ceil(sy + r0));
        for (let yy = y0; yy <= y1; yy++)
          for (let xx = x0; xx <= x1; xx++) {
            const ax = (xx - sx) / r0, ay = (yy - sy) / r0;
            const rr = ax * ax + ay * ay;
            if (rr > 1) continue;
            const di = yy * RW + xx;
            if (pr.cz > depth[di] + 0.2) continue;
            const o = di * 4; const sh = rr > 0.6 ? 0.7 : 1.05;
            data[o] = Math.min(255, col[0] * sh); data[o + 1] = Math.min(255, col[1] * sh); data[o + 2] = Math.min(255, col[2] * sh);
          }
        continue;
      }
      // Hollow: a wispy, glowing, semi-transparent flame — not a cube.
      const f = Math.min(1, p.fuse || 0);
      const flick = 0.8 + 0.2 * Math.sin(time * 9 + p.seed);
      const coreR = 150 + f * 105, coreG = 150 + (p.flash > 0 ? 90 : 30) - f * 60, coreB = 245 - f * 110;
      const rx = r0 * 0.62, ryTop = r0 * 1.25, ryBot = r0 * 0.85;
      const x0 = Math.max(0, Math.floor(sx - rx - 1)), x1 = Math.min(RW - 1, Math.ceil(sx + rx + 1));
      const y0 = Math.max(0, Math.floor(sy - ryTop - 1)), y1 = Math.min(RH - 1, Math.ceil(sy + ryBot + 1));
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const rel = (yy - sy);
          const ry = rel < 0 ? ryTop : ryBot;
          // teardrop: narrows toward the top with a flickering horizontal waver
          const wav = Math.sin(yy * 0.9 + time * 6 + p.seed) * r0 * 0.14 * (rel < 0 ? -rel / ryTop : 0.2);
          const ax = (xx - sx - wav) / (rx * (rel < 0 ? (1 + rel / ryTop * 0.6) : 1));
          const ay = rel / ry;
          const rr = ax * ax + ay * ay;
          if (rr > 1) continue;
          const di = yy * RW + xx;
          if (pr.cz > depth[di] + 0.3) continue;
          const o = di * 4;
          // additive, translucent — brightest at the core, hazy at the edges
          const glow = (1 - rr) * flick;
          const a = glow * glow * 1.25;
          data[o] = Math.min(255, data[o] + coreR * a);
          data[o + 1] = Math.min(255, data[o + 1] + coreG * a);
          data[o + 2] = Math.min(255, data[o + 2] + coreB * a);
        }
      }
    }
  }

  // draw target block outline + crack overlay on the crisp display ctx
  drawOverlay(target, mineProgress, held) {
    const ctx = this.ctx, DW = this.canvas.width, DH = this.canvas.height;
    if (target) {
      const bx = target.bx, by = target.by, bz = target.bz;
      const corners = [
        [bx, by, bz], [bx + 1, by, bz], [bx + 1, by, bz + 1], [bx, by, bz + 1],
        [bx, by + 1, bz], [bx + 1, by + 1, bz], [bx + 1, by + 1, bz + 1], [bx, by + 1, bz + 1],
      ].map(c => this._projScreen(c, DW, DH));
      const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      // glowing lumite-tinted selection
      ctx.strokeStyle = 'rgba(120,238,246,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [a, b] of edges) {
        const A = corners[a], Bp = corners[b];
        if (!A || !Bp) continue;
        ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y);
      }
      ctx.stroke();
      if (mineProgress > 0.02) {
        ctx.strokeStyle = 'rgba(20,20,30,0.8)'; ctx.lineWidth = 1.5;
        const cx = corners.reduce((s, c) => s + (c ? c.x : 0), 0) / 8;
        const cy = corners.reduce((s, c) => s + (c ? c.y : 0), 0) / 8;
        const n = Math.ceil(mineProgress * 8);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = i * 2.399;
          const len = 6 + (i % 3) * 5;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        }
        ctx.stroke();
      }
    }
  }

  _projScreen(P, DW, DH) {
    const pr = this._proj(P);
    if (pr.cz <= 0.05) return null;
    return {
      x: (pr.cu / (pr.cz * this.tx) + 1) * 0.5 * DW,
      y: (1 - pr.cv / (pr.cz * this.ty)) * 0.5 * DH,
    };
  }

  // signature diamond/rune crosshair
  drawCrosshair() {
    const ctx = this.ctx, cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(150,240,246,0.9)'; ctx.lineWidth = 1.6;
    // outer diamond
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath();
    ctx.stroke();
    // rune ticks
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(0, -11);
    ctx.moveTo(0, 14); ctx.lineTo(0, 11);
    ctx.moveTo(-14, 0); ctx.lineTo(-11, 0);
    ctx.moveTo(14, 0); ctx.lineTo(11, 0);
    ctx.stroke();
    // core dot
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  drawHeld(held, player, swing) {
    if (!held) return;
    const ctx = this.ctx, DW = this.canvas.width, DH = this.canvas.height;
    const s = Math.floor(DH * 0.22);
    const bob = Math.sin(player.walkPhase) * DH * 0.012;
    const sw = Math.sin(Math.min(1, swing) * Math.PI) * DH * 0.12;
    const x = DW - s * 1.35 - sw * 0.4;
    const y = DH - s * 1.15 + bob + sw;
    ctx.save();
    ctx.globalAlpha = 0.96;
    drawItemIcon(ctx, held, x, y, s);
    ctx.restore();
  }
}
