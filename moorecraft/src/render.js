// render.js — software voxel raycaster (DDA), textured, fogged, day/night sky.
// Renders to a low-res ImageData then blits pixelated to the display canvas.
// Also draws entity billboards, target outline, mining cracks, crosshair,
// and the held-item viewmodel.

import { WX, WY, WZ, WXZ, BLOCKS, B, isOpaque } from './world.js';
import { TEX, TS, ALPHA, drawItemIcon } from './sprites.js';

const RENDER_DIST = 62;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
    this.setRes(200, 120);
    this.fov = 72 * Math.PI / 180;
  }
  setRes(w, h) {
    this.RW = w; this.RH = h;
    this.buf.width = w; this.buf.height = h;
    this.img = this.bctx.createImageData(w, h);
    this.depth = new Float32Array(w * h);
  }

  // env: { day (0..1), skyTop,skyHor,voidTop,voidBot: [r,g,b], sunDir:[x,y,z], sunCol:[r,g,b], night:bool }
  render(world, player, env) {
    const RW = this.RW, RH = this.RH;
    const data = this.img.data, depth = this.depth;
    const ex = player.eyeX(), ey = player.eyeY(), ez = player.eyeZ();
    const yaw = player.yaw, pitch = player.pitch;
    // camera basis
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const Fx = cy * cp, Fy = sp, Fz = sy * cp;
    const Rx = -sy, Rz = cy;                     // R = (-sin,0,cos)
    const Ux = -cy * sp, Uy = cp, Uz = -sy * sp;
    const tx = Math.tan(this.fov / 2);
    const ty = tx * RH / RW;
    this.F = [Fx, Fy, Fz]; this.R = [Rx, 0, Rz]; this.U = [Ux, Uy, Uz];
    this.tx = tx; this.ty = ty; this.eye = [ex, ey, ez];

    const vox = world.voxels, blight = world.blockLight;
    const day = env.day;
    const skyTop = env.skyTop, skyHor = env.skyHor, voidTop = env.voidTop, voidBot = env.voidBot;
    const sdx = env.sunDir[0], sdy = env.sunDir[1], sdz = env.sunDir[2];
    const sunR = env.sunCol[0], sunG = env.sunCol[1], sunB = env.sunCol[2];

    for (let py = 0; py < RH; py++) {
      const cv = (1 - (py + 0.5) / RH * 2) * ty;
      // ray dir y depends only on row
      const ruy = Uy * cv;
      for (let px = 0; px < RW; px++) {
        const cu = ((px + 0.5) / RW * 2 - 1) * tx;
        let dx = Fx + Rx * cu + Ux * cv;
        let dy = Fy + ruy;
        let dz = Fz + Rz * cu + Uz * cv;
        const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
        dx *= inv; dy *= inv; dz *= inv;

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

          // hit position
          const hx = ex + dx * t, hy = ey + dy * t, hz = ez + dz * t;
          // texture uv by face
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
          // light from the air cell we stepped from
          let bl = 0;
          if (pvx >= 0 && pvx < WX && pvy >= 0 && pvy < WY && pvz >= 0 && pvz < WZ)
            bl = blight[pvx + pvz * WX + pvy * WXZ];
          let lum = Math.max(day * 0.96 + 0.04, (bl / 15) * 1.05);
          const emit = BLOCKS[id].light;
          if (emit > 0) lum = Math.max(lum, 0.85 + emit / 15 * 0.35);
          if (lum > 1.15) lum = 1.15;
          let bright = fb * (0.14 + 0.86 * lum);
          // subtle edge/grid darkening
          if (u < 0.045 || u > 0.955 || v < 0.045 || v > 0.955) bright *= 0.8;
          r *= bright; g *= bright; b *= bright;

          // distance fog toward horizon color
          const fogT = t / RENDER_DIST; const ff = fogT * fogT;
          const hr = skyHor[0], hg = skyHor[1], hb = skyHor[2];
          r = r + (hr - r) * ff * 0.9;
          g = g + (hg - g) * ff * 0.9;
          b = b + (hb - b) * ff * 0.9;

          if (firstT < 0) firstT = t;

          if (isOpaque(id)) {
            accR += trans * r; accG += trans * g; accB += trans * b; trans = 0;
            break;
          } else {
            const cover = ALPHA[id] ?? 0.5;
            accR += trans * cover * r; accG += trans * cover * g; accB += trans * cover * b;
            trans *= (1 - cover);
            if (trans < 0.05) { break; }
            // continue through transparent block
          }
        }

        // add sky / void for remaining transmittance
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
          // celestial disk + glow
          const sd = dx * sdx + dy * sdy + dz * sdz;
          if (sd > 0.9965) {
            const gl = (sd - 0.9965) / (1 - 0.9965);
            sr += (sunR - sr) * gl; sg += (sunG - sg) * gl; sb += (sunB - sb) * gl;
          }
          accR += trans * sr; accG += trans * sg; accB += trans * sb;
          if (firstT < 0) firstT = RENDER_DIST;
        }

        const o = (py * RW + px) * 4;
        data[o] = accR; data[o + 1] = accG; data[o + 2] = accB; data[o + 3] = 255;
        depth[py * RW + px] = firstT < 0 ? RENDER_DIST : firstT;
      }
    }

    // entities as billboards into the low-res buffer (depth-tested)
    if (env.entities) this._drawEntities(env.entities, player, env);

    this.bctx.putImageData(this.img, 0, 0);
    const DW = this.canvas.width, DH = this.canvas.height;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buf, 0, 0, this.RW, this.RH, 0, 0, DW, DH);
  }

  _proj(P) {
    const ex = this.eye[0], ey = this.eye[1], ez = this.eye[2];
    const vx = P[0] - ex, vy = P[1] - ey, vz = P[2] - ez;
    const cu = vx * this.R[0] + vz * this.R[2];
    const cv = vx * this.U[0] + vy * this.U[1] + vz * this.U[2];
    const cz = vx * this.F[0] + vy * this.F[1] + vz * this.F[2];
    return { cu, cv, cz };
  }

  _drawEntities(ents, player, env) {
    const RW = this.RW, RH = this.RH, data = this.img.data, depth = this.depth;
    const tx = this.tx, ty = this.ty;
    const list = [];
    for (const d of ents.drops) list.push({ x: d.x, y: d.y + 0.25, z: d.z, kind: 'drop', id: d.id });
    for (const m of ents.mobs) list.push({ x: m.x, y: m.y + 0.5, z: m.z, kind: 'mob', flash: m.flash, fuse: m.fuse });
    for (const p of list) {
      const pr = this._proj([p.x, p.y, p.z]);
      if (pr.cz < 0.15) continue;
      const sx = (pr.cu / (pr.cz * tx) + 1) * 0.5 * RW;
      const sy = (1 - pr.cv / (pr.cz * ty)) * 0.5 * RH;
      const rad = (p.kind === 'mob' ? 0.5 : 0.22) / (pr.cz) * (RH / (2 * ty));
      const r0 = Math.max(1, rad);
      let cr, cg, cb;
      if (p.kind === 'drop') {
        const col = BLOCKS[p.id < BLOCKS.length ? p.id : B.STONE].col;
        cr = col[0]; cg = col[1]; cb = col[2];
      } else {
        // wisp: purple/cyan glow, redder as fuse builds
        const f = Math.min(1, (p.fuse || 0));
        cr = 120 + f * 120; cg = 60 + (p.flash > 0 ? 120 : 40); cb = 180 - f * 80;
      }
      const x0 = Math.max(0, Math.floor(sx - r0)), x1 = Math.min(RW - 1, Math.ceil(sx + r0));
      const y0 = Math.max(0, Math.floor(sy - r0)), y1 = Math.min(RH - 1, Math.ceil(sy + r0));
      for (let yy = y0; yy <= y1; yy++)
        for (let xx = x0; xx <= x1; xx++) {
          const ddx = (xx - sx) / r0, ddy = (yy - sy) / r0;
          const rr = ddx * ddx + ddy * ddy;
          if (rr > 1) continue;
          const di = yy * RW + xx;
          if (pr.cz > depth[di] + 0.2) continue; // behind terrain
          const o = di * 4;
          if (p.kind === 'mob') {
            const glow = 1 - rr * 0.6;
            data[o] = Math.min(255, cr * glow); data[o + 1] = Math.min(255, cg * glow); data[o + 2] = Math.min(255, cb * glow);
          } else {
            const sh = rr > 0.6 ? 0.6 : 1;
            data[o] = cr * sh; data[o + 1] = cg * sh; data[o + 2] = cb * sh;
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
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [a, b] of edges) {
        const A = corners[a], Bp = corners[b];
        if (!A || !Bp) continue;
        ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y);
      }
      ctx.stroke();
      // crack lines proportional to progress
      if (mineProgress > 0.02) {
        ctx.strokeStyle = 'rgba(20,20,20,0.8)'; ctx.lineWidth = 1.5;
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

  drawCrosshair() {
    const ctx = this.ctx, cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
    ctx.stroke();
  }

  // held item viewmodel bottom-right of the 3D view
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
