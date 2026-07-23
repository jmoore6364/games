// render.js — WebGL polygon renderer for Grand Theft Moore. Real low-poly 3D:
// procedurally-built building meshes with a repeating window texture, a baked
// textured ground plane (roads/lane-lines/sidewalks/grass), low-poly car and
// humanoid meshes, a gradient sky-box with a sun, per-vertex-normal directional
// + ambient (Lambert) lighting, a depth buffer, backface culling and distance
// fog toward the sky. All geometry and textures are generated in code — zero
// external assets. GLSL ES 1.00 (WebGL1), SwiftShader-safe. BROWSER-ONLY.

import { P, ROAD, SW, LOT, NB, TILE } from './city.js';
import { mat4, normalize, cross, texture, program, locations, buffer } from './gl.js';
import { loadModel } from './gltf.js';

const FAR = 96;            // fog end / draw distance (world units)
const FOG_START = 44;
const VFOV = 52 * Math.PI / 180;

// palette (0..1 linear-ish sRGB)
const SKY_TOP = [0.24, 0.45, 0.80];
const SKY_HOR = [0.76, 0.84, 0.92];
const FOG_COL = [0.76, 0.84, 0.92];
const AMBIENT = [0.50, 0.53, 0.60];
const SUN_LIT = [0.62, 0.60, 0.52];
const SUN_COL = [1.0, 0.95, 0.82];
const SUN_DIR = normalize([0.45, 0.82, 0.40]);
const SKIN = [0.86, 0.70, 0.55];

function h2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

// ---- vertex mesh builder (interleaved: pos3 nrm3 col4 uv2 = 12 floats) ----
class Mesh {
  constructor() { this.v = []; }
  _tri(a, b, c, n, col, ua, ub, uc) {
    const P = this.v;
    P.push(a[0], a[1], a[2], n[0], n[1], n[2], col[0], col[1], col[2], col[3], ua[0], ua[1]);
    P.push(b[0], b[1], b[2], n[0], n[1], n[2], col[0], col[1], col[2], col[3], ub[0], ub[1]);
    P.push(c[0], c[1], c[2], n[0], n[1], n[2], col[0], col[1], col[2], col[3], uc[0], uc[1]);
  }
  // quad a->b->c->d CCW as seen from the front; normal auto from a,b,c.
  quad(a, b, c, d, col, uv) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = normalize(cross(u, w));
    uv = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
    this._tri(a, b, c, n, col, uv[0], uv[1], uv[2]);
    this._tri(a, c, d, n, col, uv[0], uv[2], uv[3]);
  }
  // axis-aligned box (all 6 faces), uniform color, uv=0
  box(x0, y0, z0, x1, y1, z1, col) {
    const z = [[0, 0], [0, 0], [0, 0], [0, 0]];
    // +x, -x
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, z);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, z);
    // +z, -z
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, z);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, z);
    // +y (top), -y (bottom)
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], col, z);
    this.quad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], col, z);
  }
  // ---- extra architectural primitives (all outward-facing, cull-safe) ----
  // thin protruding ledge / cornice ring around a footprint (overhang oh)
  ledge(x0, z0, x1, z1, y, thick, oh, col) {
    this.box(x0 - oh, y, z0 - oh, x1 + oh, y + thick, z1 + oh, col);
  }
  // vertical cylinder side wall, outward faces; textured (u around, v vertical/vScale)
  cyl(cx, cz, r, y0, y1, segs, col, uRep, vScale) {
    uRep = uRep || 1; vScale = vScale || Math.max(0.001, y1 - y0);
    const TAU = Math.PI * 2;
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      const xs = cx + Math.cos(a1) * r, zs = cz + Math.sin(a1) * r; // start (clockwise)
      const xe = cx + Math.cos(a0) * r, ze = cz + Math.sin(a0) * r; // end
      const A = [xs, y0, zs], B = [xe, y0, ze], C = [xe, y1, ze], D = [xs, y1, zs];
      const u0 = (i + 1) / segs * uRep, u1 = i / segs * uRep;
      const v1 = (y1 - y0) / vScale;
      this.quad(A, B, C, D, col, [[u0, 0], [u1, 0], [u1, v1], [u0, v1]]);
    }
  }
  // horizontal disc fan facing +y at height y
  discUp(cx, cz, r, y, segs, col) {
    const TAU = Math.PI * 2, n = [0, 1, 0], c = [cx, y, cz], z0 = [0, 0];
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      const p0 = [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r];
      this._tri(c, p1, p0, n, col, z0, z0, z0);
    }
  }
  // cone / dome roof, apex up, outward faces
  cone(cx, cz, r, y0, apexY, segs, col) {
    const TAU = Math.PI * 2, apex = [cx, apexY, cz], z0 = [0, 0];
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      const p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
      const u = [p0[0] - p1[0], p0[1] - p1[1], p0[2] - p1[2]];
      const w = [apex[0] - p1[0], apex[1] - p1[1], apex[2] - p1[2]];
      const nrm = normalize(cross(u, w));
      this._tri(p1, p0, apex, nrm, col, z0, z0, z0);
    }
  }
  // flat arched window/opening on a wall face, facing -z (front) or -x (side).
  // A rectangle topped by a polygonal semicircle, laid in a wall plane slightly
  // proud of the wall so it reads as a recessed dark opening. axis: 'z' or 'x'.
  arch(axis, along0, along1, planeCoord, y0, yTop, segs, col) {
    const cxA = (along0 + along1) / 2, r = (along1 - along0) / 2, z0 = [0, 0];
    if (axis === 'z') {
      const zf = planeCoord, n = [0, 0, -1];
      // rectangle (facing -z)
      this.quad([along1, y0, zf], [along0, y0, zf], [along0, yTop, zf], [along1, yTop, zf], col, [z0, z0, z0, z0]);
      // semicircle fan above yTop
      const c = [cxA, yTop, zf];
      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI * i / segs, a1 = Math.PI * (i + 1) / segs;
        const p0 = [cxA - Math.cos(a0) * r, yTop + Math.sin(a0) * r, zf];
        const p1 = [cxA - Math.cos(a1) * r, yTop + Math.sin(a1) * r, zf];
        this._tri(c, p0, p1, n, col, z0, z0, z0);
      }
    } else {
      const xf = planeCoord, n = [-1, 0, 0];
      this.quad([xf, y0, along0], [xf, y0, along1], [xf, yTop, along1], [xf, yTop, along0], col, [z0, z0, z0, z0]);
      const c = [xf, yTop, cxA];
      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI * i / segs, a1 = Math.PI * (i + 1) / segs;
        const p0 = [xf, yTop + Math.sin(a0) * r, cxA - Math.cos(a0) * r];
        const p1 = [xf, yTop + Math.sin(a1) * r, cxA - Math.cos(a1) * r];
        this._tri(c, p0, p1, n, col, z0, z0, z0);
      }
    }
  }
  data() { return new Float32Array(this.v); }
  get count() { return this.v.length / 12; }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const opts = { alpha: false, antialias: true, depth: true, preserveDrawingBuffer: true };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) throw new Error('WebGL not available');
    this.gl = gl;

    // --- world program ---------------------------------------------------
    const vs = `
      attribute vec3 aPos; attribute vec3 aNormal; attribute vec4 aColor; attribute vec2 aUV;
      uniform mat4 uProj, uView, uModel; uniform vec3 uTint;
      varying vec3 vN; varying vec4 vColor; varying vec2 vUV; varying float vDist;
      void main() {
        vec4 wp = uModel * vec4(aPos, 1.0);
        vec4 vp = uView * wp;
        gl_Position = uProj * vp;
        vN = normalize((uModel * vec4(aNormal, 0.0)).xyz);
        vColor = vec4(aColor.rgb * mix(vec3(1.0), uTint, aColor.a), aColor.a);
        vUV = aUV;
        vDist = -vp.z;
      }`;
    const fs = `
      precision mediump float;
      uniform sampler2D uTex; uniform float uTexMix; uniform float uAlpha;
      uniform vec3 uLightDir, uAmbient, uSun, uFogColor; uniform float uFogStart, uFogEnd;
      varying vec3 vN; varying vec4 vColor; varying vec2 vUV; varying float vDist;
      void main() {
        vec3 base = vColor.rgb;
        if (uTexMix > 0.0) base *= mix(vec3(1.0), texture2D(uTex, vUV).rgb, uTexMix);
        vec3 N = normalize(vN);
        float diff = max(dot(N, uLightDir), 0.0);
        vec3 lit = base * (uAmbient + uSun * diff);
        float f = clamp((uFogEnd - vDist) / (uFogEnd - uFogStart), 0.0, 1.0);
        vec3 col = mix(uFogColor, lit, f);
        gl_FragColor = vec4(col, uAlpha);
      }`;
    this.prog = program(gl, vs, fs);
    this.loc = locations(gl, this.prog);

    // --- sky program -----------------------------------------------------
    const skvs = `
      attribute vec3 aPos; uniform mat4 uProj, uViewRot;
      varying vec3 vDir;
      void main() { vDir = aPos; vec4 p = uProj * uViewRot * vec4(aPos, 1.0); gl_Position = p.xyww; }`;
    const skfs = `
      precision mediump float;
      varying vec3 vDir; uniform vec3 uSkyTop, uSkyHor, uSunDir, uSunCol;
      void main() {
        vec3 d = normalize(vDir);
        float t = clamp(d.y * 1.5, 0.0, 1.0);
        vec3 col = mix(uSkyHor, uSkyTop, t);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunCol * pow(s, 260.0) * 1.3;
        col += uSunCol * pow(s, 9.0) * 0.16;
        gl_FragColor = vec4(col, 1.0);
      }`;
    this.skyProg = program(gl, skvs, skfs);
    this.skyLoc = locations(gl, this.skyProg);

    // --- static meshes ---------------------------------------------------
    this._buildUnitBox();
    this._buildSky();
    this._facadeTex = texture(gl, this._makeFacade(), { repeat: true, mip: true });
    this._brickTex = texture(gl, this._makeBrick(), { repeat: true, mip: true });
    this._glassTex = texture(gl, this._makeGlass(), { repeat: true, mip: true });
    this._stoneTex = texture(gl, this._makeStone(), { repeat: true, mip: true });

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);

    this._proj = mat4.perspective(VFOV, canvas.width / canvas.height, 0.1, 600);
    this._cityRef = null;

    // Real downloaded CC0 glTF models. Null until loadModels() resolves; the
    // draw code falls back to procedural box meshes whenever they are null, so
    // a missing/broken asset never breaks the game.
    this.carModel = null;
    this.charModel = null;
  }

  // ---- CC0 glTF model loading (enhancement; degrades to boxes) -----------
  // Fetches models/car.glb + models/character.glb, bakes an orientation +
  // ground-centring transform into a GL buffer compatible with the world
  // program, and records the oriented bounding size for per-entity scaling.
  // Any failure leaves the corresponding model null (procedural fallback).
  async loadModels(base = 'models/') {
    await Promise.all([
      this._tryLoad(base + 'car.glb', { yaw0: Math.PI / 2, tintAlpha: 0.45 })
        .then(m => { this.carModel = m; console.log('[gtm] car model loaded: ' + m.n + ' verts'); })
        .catch(e => console.warn('[gtm] car model unavailable, using procedural fallback:', e.message)),
      this._tryLoad(base + 'character.glb', { yaw0: Math.PI / 2, tintAlpha: 0.0 })
        .then(m => { this.charModel = m; console.log('[gtm] character model loaded: ' + m.n + ' verts'); })
        .catch(e => console.warn('[gtm] character model unavailable, using procedural fallback:', e.message)),
    ]);
  }

  async _tryLoad(url, opts) {
    const raw = await loadModel(url);
    return this._prepModel(raw, opts);
  }

  // Bake: rotate about Y by yaw0 (so the model's forward axis -> world +x, the
  // game's heading-0 direction), centre in x/z, drop feet to y=0, and stamp a
  // tint-mask alpha into every vertex colour. Returns { buf, n, size:[sx,sy,sz] }
  // where size is the oriented bounding box (used to scale onto v.l/v.w/v.h).
  _prepModel(raw, { yaw0 = 0, tintAlpha = 0 }) {
    const src = raw.vertexData, n = raw.vertexCount;
    const out = new Float32Array(src.length);
    const c = Math.cos(yaw0), s = Math.sin(yaw0);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    // pass 1: rotate pos + normal, find oriented bbox
    for (let i = 0; i < n; i++) {
      const o = i * 12;
      const px = src[o], py = src[o + 1], pz = src[o + 2];
      const rx = px * c + pz * s, rz = -px * s + pz * c;
      out[o] = rx; out[o + 1] = py; out[o + 2] = rz;
      const nx = src[o + 3], ny = src[o + 4], nz = src[o + 5];
      out[o + 3] = nx * c + nz * s; out[o + 4] = ny; out[o + 5] = -nx * s + nz * c;
      out[o + 6] = src[o + 6]; out[o + 7] = src[o + 7]; out[o + 8] = src[o + 8]; out[o + 9] = tintAlpha;
      out[o + 10] = src[o + 10]; out[o + 11] = src[o + 11];
      if (rx < min[0]) min[0] = rx; if (rx > max[0]) max[0] = rx;
      if (py < min[1]) min[1] = py; if (py > max[1]) max[1] = py;
      if (rz < min[2]) min[2] = rz; if (rz > max[2]) max[2] = rz;
    }
    // pass 2: centre x/z, drop to ground (min-y -> 0)
    const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, gy = min[1];
    for (let i = 0; i < n; i++) { const o = i * 12; out[o] -= cx; out[o + 1] -= gy; out[o + 2] -= cz; }
    const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    // guard against a degenerate model
    for (let k = 0; k < 3; k++) if (!(size[k] > 1e-4)) throw new Error('degenerate model bbox');
    return { buf: buffer(this.gl, out), n, size };
  }

  // ---- static geometry --------------------------------------------------
  _buildUnitBox() {
    const m = new Mesh();
    m.box(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, [1, 1, 1, 1]);
    this.unitBox = { buf: buffer(this.gl, m.data()), n: m.count };
  }

  _buildSky() {
    const s = 1;
    const p = [
      // 6 faces of a cube, pos only, wound so we see it from inside (cull front)
      -s, -s, -s, s, -s, -s, s, s, -s, -s, -s, -s, s, s, -s, -s, s, -s,
      -s, -s, s, s, s, s, s, -s, s, -s, -s, s, -s, s, s, s, s, s,
      -s, -s, -s, -s, s, s, -s, s, -s, -s, -s, -s, -s, -s, s, -s, s, s,
      s, -s, -s, s, s, -s, s, s, s, s, -s, -s, s, s, s, s, -s, s,
      -s, s, -s, s, s, -s, s, s, s, -s, s, -s, s, s, s, -s, s, s,
      -s, -s, -s, s, -s, s, s, -s, -s, -s, -s, -s, -s, -s, s, s, -s, s,
    ];
    this.sky = { buf: buffer(this.gl, new Float32Array(p)), n: p.length / 3 };
  }

  _makeFacade() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#b4b2ac'; g.fillRect(0, 0, S, S);          // concrete
    const cell = 64, margin = 12, ws = cell - margin * 2;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = i * cell, y = j * cell;
      // spandrel / frame shading
      g.fillStyle = '#9a988f'; g.fillRect(x + 5, y + 5, cell - 10, cell - 10);
      const r = h2(i * 13 + 7, j * 29 + 3);
      const lit = r > 0.72;
      if (lit) g.fillStyle = '#ffe9a0';
      else { const v = 40 + Math.floor(r * 30); g.fillStyle = `rgb(${v},${v + 12},${v + 30})`; }
      g.fillRect(x + margin, y + margin, ws, ws);
      // mullion
      g.strokeStyle = 'rgba(20,20,24,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x + cell / 2, y + margin); g.lineTo(x + cell / 2, y + cell - margin);
      g.moveTo(x + margin, y + cell / 2); g.lineTo(x + cell - margin, y + cell / 2); g.stroke();
    }
    return c;
  }

  // brick / brownstone: red-brown brick field with mortar + punched windows.
  _makeBrick() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#4a3630'; g.fillRect(0, 0, S, S);            // mortar
    const bh = 8, bw = 32;
    for (let y = 0; y < S; y += bh) {
      const off = ((y / bh) & 1) ? bw / 2 : 0;
      for (let x = -bw; x < S; x += bw) {
        const r = h2((x / 4) | 0, (y / 4) | 0);
        const rr = 120 + r * 46, gg = 60 + r * 26, bb = 46 + r * 20;
        g.fillStyle = `rgb(${rr | 0},${gg | 0},${bb | 0})`;
        g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
      }
    }
    const cell = 64, margin = 14, ws = cell - margin * 2;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = i * cell, y = j * cell;
      // stone lintel + sill
      g.fillStyle = '#cabca0'; g.fillRect(x + margin - 3, y + margin - 4, ws + 6, 4);
      g.fillRect(x + margin - 4, y + cell - margin, ws + 8, 5);
      const r = h2(i * 13 + 71, j * 29 + 13);
      if (r > 0.7) g.fillStyle = '#ffe9a0';
      else { const v = 34 + Math.floor(r * 26); g.fillStyle = `rgb(${v},${v + 10},${v + 26})`; }
      g.fillRect(x + margin, y + margin, ws, cell - margin * 2);
      g.strokeStyle = 'rgba(20,16,14,0.55)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x + cell / 2, y + margin); g.lineTo(x + cell / 2, y + cell - margin); g.stroke();
    }
    return c;
  }

  // glass curtain wall: bluish panes with strong horizontal + vertical mullions.
  _makeGlass() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#2a3846'; g.fillRect(0, 0, S, S);           // dark frame
    const cw = 32, chh = 32;
    for (let j = 0; j < S / chh; j++) for (let i = 0; i < S / cw; i++) {
      const x = i * cw, y = j * chh;
      const r = h2(i * 17 + 3, j * 11 + 9);
      // vertical reflective gradient per pane, bluish
      const grd = g.createLinearGradient(x, y, x, y + chh);
      const base = 70 + r * 60;
      grd.addColorStop(0, `rgb(${(base * 0.7) | 0},${(base * 0.95) | 0},${(base * 1.2) | 0})`);
      grd.addColorStop(0.5, `rgb(${(base * 1.1) | 0},${(base * 1.3) | 0},${(base * 1.6) | 0})`);
      grd.addColorStop(1, `rgb(${(base * 0.6) | 0},${(base * 0.8) | 0},${(base * 1.05) | 0})`);
      g.fillStyle = grd; g.fillRect(x + 2, y + 2, cw - 3, chh - 3);
      if (r > 0.85) { g.fillStyle = 'rgba(255,240,190,0.5)'; g.fillRect(x + 2, y + 2, cw - 3, chh - 3); }
    }
    // heavier structural mullions every 2 cells
    g.strokeStyle = 'rgba(18,26,34,0.9)'; g.lineWidth = 3;
    for (let k = 0; k <= S; k += cw * 2) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, S); g.stroke(); }
    for (let k = 0; k <= S; k += chh * 2) { g.beginPath(); g.moveTo(0, k); g.lineTo(S, k); g.stroke(); }
    return c;
  }

  // stone / masonry: tan ashlar blocks with rectangular windows.
  _makeStone() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#6f6656'; g.fillRect(0, 0, S, S);           // joints
    const bh = 16, bw = 32;
    for (let y = 0; y < S; y += bh) {
      const off = ((y / bh) & 1) ? bw / 2 : 0;
      for (let x = -bw; x < S; x += bw) {
        const r = h2((x / 6) | 0 + 5, (y / 6) | 0 + 2);
        const v = 150 + r * 40;
        g.fillStyle = `rgb(${v | 0},${(v - 10) | 0},${(v - 34) | 0})`;
        g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
      }
    }
    const cell = 64, margin = 16, ws = cell - margin * 2;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = i * cell, y = j * cell;
      g.fillStyle = '#4a4640'; g.fillRect(x + margin - 3, y + margin - 3, ws + 6, cell - margin * 2 + 6);
      const r = h2(i * 23 + 41, j * 19 + 7);
      if (r > 0.72) g.fillStyle = '#ffe9a0';
      else { const v = 30 + Math.floor(r * 24); g.fillStyle = `rgb(${v},${v + 8},${v + 22})`; }
      g.fillRect(x + margin, y + margin, ws, cell - margin * 2);
      // keystone highlight on top
      g.fillStyle = '#d8ccb0'; g.fillRect(x + cell / 2 - 4, y + margin - 6, 8, 6);
    }
    return c;
  }

  _makeGround(city) {
    const M = city.MAP, R = 1024, s = R / M;
    const c = document.createElement('canvas'); c.width = c.height = R;
    const g = c.getContext('2d');
    const img = g.createImageData(R, R), d = img.data;
    for (let py = 0; py < R; py++) {
      const wz = py / s;
      for (let px = 0; px < R; px++) {
        const wx = px / s;
        const t = city.tileAt(wx, wz);
        let r, gg, b;
        const n = (h2(px >> 1, py >> 1) - 0.5) * 12;
        if (t === TILE.ROAD) { r = 44 + n; gg = 45 + n; b = 50 + n; }
        else if (t === TILE.SIDEWALK) {
          const seam = ((wx | 0) % 3 === 0 || (wz | 0) % 3 === 0) ? -16 : 0;
          r = 132 + seam + n * 0.4; gg = 132 + seam + n * 0.4; b = 138 + seam + n * 0.4;
        } else if (t === TILE.GRASS) { r = 46 + n * 0.4; gg = 96 + n; b = 50 + n * 0.4; }
        else if (t === TILE.SPECIAL) { r = 120 + n; gg = 104 + n; b = 82 + n; }
        else { r = 52; gg = 52; b = 58; }   // under buildings (hidden)
        const o = (px + py * R) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // dashed lane lines down the centre of every road corridor
    g.strokeStyle = 'rgba(200,180,70,0.85)'; g.lineWidth = Math.max(1.5, s * 0.32);
    g.setLineDash([s * 2.2, s * 2.4]);
    for (let k = 0; k < NB; k++) {
      const cc = (k * P + ROAD * 0.5) * s;
      g.beginPath(); g.moveTo(cc, 0); g.lineTo(cc, R); g.stroke();
      g.beginPath(); g.moveTo(0, cc); g.lineTo(R, cc); g.stroke();
    }
    return c;
  }

  _buildCity(city, props) {
    // one textured mesh per facade material + one flat (untextured) mesh for
    // all decorative geometry (ledges, roofs, railings, rooftop clutter, ...).
    const M = {
      facade: new Mesh(), brick: new Mesh(), glass: new Mesh(), stone: new Mesh(),
    };
    const flat = new Mesh();
    for (let bz = 0; bz < NB; bz++) for (let bx = 0; bx < NB; bx++) {
      const kind = city.blockKind[bx + ',' + bz];
      if (kind === 'park') continue;
      const cx = bx * P + ROAD + LOT / 2, cz = bz * P + ROAD + LOT / 2;
      const hh = city.heightAt(cx, cz);
      if (!hh) continue;
      const x0 = bx * P + ROAD + SW, x1 = bx * P + ROAD + LOT - SW;
      const z0 = bz * P + ROAD + SW, z1 = bz * P + ROAD + LOT - SW;
      // deterministic per-building hash stream
      const H = (s) => h2(bx * 137 + s * 31 + 7, bz * 211 + s * 53 + 3);
      this._buildBuilding(M, flat, { bx, bz, kind, x0, z0, x1, z1, hh, H });
    }
    // trees in parks
    for (const pr of props || []) {
      const th = pr.h || 3.5, tr = 0.9;
      flat.box(pr.x - 0.18, 0, pr.z - 0.18, pr.x + 0.18, th * 0.45, pr.z + 0.18, [0.36, 0.26, 0.16, 0]);
      flat.box(pr.x - tr, th * 0.4, pr.z - tr, pr.x + tr, th + 0.6, pr.z + tr, [0.20, 0.44, 0.22, 0]);
    }
    const gl = this.gl;
    const tri = (m, tex) => ({ buf: buffer(gl, m.data()), n: m.count, tex });
    this.matMeshes = [
      tri(M.facade, this._facadeTex), tri(M.brick, this._brickTex),
      tri(M.glass, this._glassTex), tri(M.stone, this._stoneTex),
    ];
    this.flatMesh = { buf: buffer(gl, flat.data()), n: flat.count };
    // ground plane
    const gm = new Mesh(), MM = city.MAP;
    gm.quad([0, 0, 0], [0, 0, MM], [MM, 0, MM], [MM, 0, 0], [1, 1, 1, 0],
      [[0, 0], [0, 1], [1, 1], [1, 0]]);
    this.groundMesh = { buf: buffer(gl, gm.data()), n: gm.count };
    this.groundTex = texture(gl, this._makeGround(city), { repeat: false, mip: true });
    this._cityRef = city;
  }

  // textured wall segment between heights y0..y1 (uv v tracks world height)
  _wallSeg(mesh, A, B, y0, y1, col, div, uOff, vOff) {
    const a = [A[0], y0, A[1]], b = [B[0], y0, B[1]], c = [B[0], y1, B[1]], d = [A[0], y1, A[1]];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const v0 = vOff + y0 / div, v1 = vOff + y1 / div;
    mesh.quad(a, b, c, d, col, [[uOff, v0], [uOff + len / div, v0], [uOff + len / div, v1], [uOff, v1]]);
  }

  // 4 textured walls of a rectangular prism (footprint x0..x1 / z0..z1)
  _facWalls(mesh, x0, z0, x1, z1, y0, y1, col, div, uOff, vOff) {
    this._wallSeg(mesh, [x1, z1], [x1, z0], y0, y1, col, div, uOff, vOff);
    this._wallSeg(mesh, [x0, z0], [x0, z1], y0, y1, col, div, uOff, vOff);
    this._wallSeg(mesh, [x0, z1], [x1, z1], y0, y1, col, div, uOff, vOff);
    this._wallSeg(mesh, [x1, z0], [x0, z0], y0, y1, col, div, uOff, vOff);
  }

  // low wall ringing a flat roof (four thin boxes on the inside edge)
  _parapet(flat, x0, z0, x1, z1, y, ph, col) {
    const t = 0.35;
    flat.box(x0, y, z0, x1, y + ph, z0 + t, col);
    flat.box(x0, y, z1 - t, x1, y + ph, z1, col);
    flat.box(x0, y, z0 + t, x0 + t, y + ph, z1 - t, col);
    flat.box(x1 - t, y, z0 + t, x1, y + ph, z1 - t, col);
  }

  // balcony protruding toward -z (street) from a z-face; slab + 3-sided railing
  _balconyZ(flat, xa, xb, z, fy, depth, slabCol, railCol) {
    const st = 0.16, zf = z - depth, ry = fy + st, rh = 0.62, t = 0.07;
    flat.box(xa, fy, zf, xb, fy + st, z, slabCol);              // slab
    flat.box(xa, ry, zf, xb, ry + rh, zf + t, railCol);          // front rail wall
    flat.box(xa, ry, zf, xa + t, ry + rh, z, railCol);           // side
    flat.box(xb - t, ry, zf, xb, ry + rh, z, railCol);           // side
    flat.box(xa, ry + rh - t, zf, xb, ry + rh, z, railCol);      // top cap rail
  }
  _balconyX(flat, za, zb, x, fy, depth, slabCol, railCol) {
    const st = 0.16, xf = x - depth, ry = fy + st, rh = 0.62, t = 0.07;
    flat.box(xf, fy, za, x, fy + st, zb, slabCol);
    flat.box(xf, ry, za, xf + t, ry + rh, zb, railCol);
    flat.box(xf, ry, za, x, ry + rh, za + t, railCol);
    flat.box(xf, ry, zb - t, x, ry + rh, zb, railCol);
    flat.box(xf, ry + rh - t, za, x, ry + rh, zb, railCol);
  }

  // water tower: tank on 4 legs with a conical cap
  _waterTower(flat, cx, cz, y0) {
    const wood = [0.34, 0.24, 0.17, 0], dark = [0.18, 0.13, 0.10, 0];
    const legH = 1.5, r = 0.85, lx = r * 0.6;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      flat.box(cx + sx * lx - 0.08, y0, cz + sz * lx - 0.08, cx + sx * lx + 0.08, y0 + legH, cz + sz * lx + 0.08, dark);
    const t0 = y0 + legH, th = 1.7;
    flat.cyl(cx, cz, r, t0, t0 + th, 9, wood, 1, 1);
    flat.discUp(cx, cz, r, t0 + th, 9, wood);
    flat.cone(cx, cz, r * 1.02, t0 + th, t0 + th + 0.8, 9, dark);
  }

  // varied rooftop clutter: water tower / AC boxes / stair bulkhead / antenna
  _roofClutter(flat, x0, z0, x1, z1, top, H) {
    const w = x1 - x0, d = z1 - z0;
    const metal = [0.5, 0.52, 0.55, 0], dark = [0.22, 0.23, 0.26, 0];
    if (H(11) > 0.45 && w > 5 && d > 5) this._waterTower(flat, x0 + 1.4 + H(12) * (w - 3), z0 + 1.4 + H(13) * (d - 3), top);
    // stair bulkhead
    if (H(14) > 0.4) {
      const bw = 1.6 + H(15) * 1.2, bd = 1.4 + H(16) * 1.0;
      const bx = x0 + 1 + H(17) * Math.max(0.1, w - bw - 2), bz = z0 + 1 + H(18) * Math.max(0.1, d - bd - 2);
      flat.box(bx, top, bz, bx + bw, top + 1.4 + H(19) * 0.8, bz + bd, dark);
    }
    // AC boxes
    const nAC = 1 + Math.floor(H(20) * 3);
    for (let k = 0; k < nAC; k++) {
      const aw = 0.7 + H(21 + k) * 0.9, ad = 0.7 + H(31 + k) * 0.9;
      const ax = x0 + 0.8 + H(41 + k) * Math.max(0.1, w - aw - 1.6);
      const az = z0 + 0.8 + H(51 + k) * Math.max(0.1, d - ad - 1.6);
      flat.box(ax, top, az, ax + aw, top + 0.4 + H(61 + k) * 0.4, az + ad, metal);
    }
    // antenna / mast
    if (H(22) > 0.55) {
      const ax = x0 + w * (0.3 + H(23) * 0.4), az = z0 + d * (0.3 + H(24) * 0.4);
      flat.box(ax - 0.06, top, az - 0.06, ax + 0.06, top + 2.5 + H(25) * 2.5, az + 0.06, dark);
    }
  }

  // ---- per-building archetype dispatch ----------------------------------
  _buildBuilding(M, flat, b) {
    const { bx, bz, kind, x0, z0, x1, z1, hh, H } = b;
    const div = 12, uOff = Math.floor(H(1) * 4) * 0.25, vOff = 0;
    b.div = div; b.uOff = uOff; b.vOff = vOff;
    const ROOF = [0.30, 0.31, 0.34, 0];
    if (kind === 'garage' || kind === 'hospital') {
      const special = kind === 'garage' ? [0.58, 0.64, 0.74] : [0.86, 0.80, 0.80];
      b.tint = special; b.roofCol = [special[0] * 0.55, special[1] * 0.55, special[2] * 0.56, 0];
      this._archSpecial(M, flat, b);
      return;
    }
    // choose archetype from height + hash
    const r = H(2);
    let arch;
    if (hh >= 22) arch = r < 0.5 ? 'deco' : 'glass';
    else if (hh >= 15) arch = r < 0.34 ? 'glass' : (r < 0.6 ? 'classical' : (r < 0.78 ? 'deco' : 'cylinder'));
    else if (hh >= 10) arch = r < 0.24 ? 'classical' : (r < 0.46 ? 'brownstone' : (r < 0.66 ? 'mixed' : (r < 0.78 ? 'cylinder' : 'simple')));
    else arch = r < 0.42 ? 'brownstone' : (r < 0.74 ? 'mixed' : 'simple');
    b.roofCol = ROOF;
    ({ deco: this._archDeco, glass: this._archGlass, classical: this._archClassical,
       cylinder: this._archCylinder, brownstone: this._archBrownstone,
       mixed: this._archMixed, simple: this._archSimple })[arch].call(this, M, flat, b);
  }

  // --- 1. brownstone / rowhouse (brick, stoop, sills, cornice, balconies) --
  _archBrownstone(M, flat, b) {
    const { x0, z0, x1, z1, hh, H, div, uOff, vOff } = b;
    const t = 0.86 + H(3) * 0.18;
    const wc = [t, t * 0.94, t * 0.9, 0];
    this._facWalls(M.brick, x0, z0, x1, z1, 0, hh, wc, div, uOff, vOff);
    flat.quad([x0, hh, z0], [x0, hh, z1], [x1, hh, z1], [x1, hh, z0], b.roofCol);
    const trim = [0.74, 0.70, 0.60, 0];
    // stoop at the -z (street) front, centred
    const scx = (x0 + x1) / 2;
    flat.box(scx - 1.1, 0, z0 - 1.4, scx + 1.1, 0.9, z0, [0.55, 0.50, 0.44, 0]);
    flat.box(scx - 1.3, 0, z0 - 1.0, scx - 1.15, 1.5, z0, [0.5, 0.45, 0.4, 0]);
    flat.box(scx + 1.15, 0, z0 - 1.0, scx + 1.3, 1.5, z0, [0.5, 0.45, 0.4, 0]);
    // window sills on the -z and -x faces, per floor
    const floors = Math.max(1, Math.floor(hh / 3));
    for (let f = 1; f < floors; f++) {
      const y = f * 3;
      flat.box(x0 + 0.3, y - 0.12, z0 - 0.18, x1 - 0.3, y, z0 + 0.02, trim);
      flat.box(x0 - 0.18, y - 0.12, z0 + 0.3, x0 + 0.02, y, z1 - 0.3, trim);
    }
    // cornice ring near the top + a mid band
    this._parapetLedge(flat, x0, z0, x1, z1, hh - 0.9, trim);
    flat.ledge(x0, z0, x1, z1, hh - 0.35, 0.35, 0.28, trim);
    // balconies on a couple upper floors, street side
    const rail = [0.2, 0.19, 0.18, 0];
    for (let f = 2; f < floors; f++) {
      if (H(70 + f) > 0.55) this._balconyZ(flat, (x0 + x1) / 2 - 1.4, (x0 + x1) / 2 + 1.4, z0, f * 3, 1.0, [0.5, 0.46, 0.42, 0], rail);
    }
    if (hh > 9) this._roofClutter(flat, x0, z0, x1, z1, hh, H);
  }

  // helper: cornice as an overhanging box just under the roofline
  _parapetLedge(flat, x0, z0, x1, z1, y, col) {
    flat.ledge(x0, z0, x1, z1, y, 0.55, 0.45, col);
  }

  // --- 2. art-deco stepped tower (setbacks, pilasters, parapet, spire) -----
  _archDeco(M, flat, b) {
    const { x0, z0, x1, z1, hh, H, div, uOff, vOff } = b;
    const t = 0.72 + H(3) * 0.2;
    const wc = [t, t * 0.98, t * 0.9, 0];
    const stops = [0, hh * 0.55, hh * 0.82, hh];
    let ix0 = x0, iz0 = z0, ix1 = x1, iz1 = z1;
    const inset = Math.min(1.5, (x1 - x0) * 0.14);
    for (let s = 0; s < 3; s++) {
      const y0 = stops[s], y1 = stops[s + 1];
      this._facWalls(M.facade, ix0, iz0, ix1, iz1, y0, y1, wc, div, uOff, vOff);
      // shelf/roof of this tier
      flat.quad([ix0, y1, iz0], [ix0, y1, iz1], [ix1, y1, iz1], [ix1, y1, iz0], b.roofCol);
      this._parapet(flat, ix0, iz0, ix1, iz1, y1, 0.6, [t * 0.8, t * 0.78, t * 0.72, 0]);
      // corner pilasters up this tier
      const pc = [t * 0.85, t * 0.82, t * 0.72, 0], pw = 0.5;
      for (const [px, pz] of [[ix0, iz0], [ix1 - pw, iz0], [ix0, iz1 - pw], [ix1 - pw, iz1 - pw]])
        flat.box(px - 0.12, y0, pz - 0.12, px + pw + 0.12, y1, pz + pw + 0.12, pc);
      ix0 += inset; iz0 += inset; ix1 -= inset; iz1 -= inset;
      if (ix1 - ix0 < 2) break;
    }
    // spire / mast on top centre
    const scx = (x0 + x1) / 2, scz = (z0 + z1) / 2;
    flat.box(scx - 0.7, hh, scz - 0.7, scx + 0.7, hh + 1.2, scz + 0.7, [t * 0.7, t * 0.68, t * 0.62, 0]);
    flat.cone(scx, scz, 0.7, hh + 1.2, hh + 2.2, 8, [0.5, 0.5, 0.54, 0]);
    flat.box(scx - 0.09, hh + 2.2, scz - 0.09, scx + 0.09, hh + 5.5, scz + 0.09, [0.3, 0.3, 0.33, 0]);
  }

  // --- 3. modern glass office (curtain wall, ledge bands, rooftop mech) -----
  _archGlass(M, flat, b) {
    const { x0, z0, x1, z1, hh, H, div, uOff, vOff } = b;
    const t = 0.86 + H(3) * 0.16;
    const wc = [t * 0.9, t * 0.97, t, 0];
    const setback = hh > 20 && H(4) > 0.4;
    const bodyTop = setback ? hh * 0.86 : hh;
    this._facWalls(M.glass, x0, z0, x1, z1, 0, bodyTop, wc, div * 0.8, uOff, vOff);
    flat.quad([x0, bodyTop, z0], [x0, bodyTop, z1], [x1, bodyTop, z1], [x1, bodyTop, z0], b.roofCol);
    // thin spandrel ledge bands every few floors
    const band = [t * 0.5, t * 0.55, t * 0.6, 0];
    for (let y = 4; y < bodyTop - 1; y += 4) flat.ledge(x0, z0, x1, z1, y, 0.18, 0.12, band);
    if (setback) {
      const i = Math.min(2, (x1 - x0) * 0.18);
      this._facWalls(M.glass, x0 + i, z0 + i, x1 - i, z1 - i, bodyTop, hh, wc, div * 0.8, uOff, vOff);
      flat.quad([x0 + i, hh, z0 + i], [x0 + i, hh, z1 - i], [x1 - i, hh, z1 - i], [x1 - i, hh, z0 + i], b.roofCol);
      this._parapet(flat, x0 + i, z0 + i, x1 - i, z1 - i, hh, 0.6, band);
    } else {
      this._parapet(flat, x0, z0, x1, z1, hh, 0.6, band);
    }
    this._roofClutter(flat, x0, z0, x1, z1, setback ? hh : bodyTop, H);
  }

  // --- 4. classical masonry (arched windows + entrance, base course) -------
  _archClassical(M, flat, b) {
    const { x0, z0, x1, z1, hh, H, div, uOff, vOff } = b;
    const t = 0.88 + H(3) * 0.12;
    const wc = [t, t * 0.98, t * 0.92, 0];
    this._facWalls(M.stone, x0, z0, x1, z1, 0, hh, wc, div, uOff, vOff);
    flat.quad([x0, hh, z0], [x0, hh, z1], [x1, hh, z1], [x1, hh, z0], b.roofCol);
    const stone = [0.78, 0.74, 0.64, 0], dark = [0.10, 0.12, 0.15, 0];
    // base course ledge between ground floor and upper floors
    flat.ledge(x0, z0, x1, z1, 3.4, 0.4, 0.3, stone);
    // heavy cornice + parapet at top
    flat.ledge(x0, z0, x1, z1, hh - 1.0, 0.7, 0.5, stone);
    this._parapet(flat, x0, z0, x1, z1, hh, 0.7, stone);
    // arched windows across the -z (street) face, one upper row
    const span = x1 - x0, n = Math.max(2, Math.floor(span / 3.2)), ww = span / n * 0.62;
    const wy = 4.6, wh = Math.min(2.6, hh - wy - 2);
    if (wh > 1) for (let i = 0; i < n; i++) {
      const c = x0 + (i + 0.5) * span / n;
      flat.arch('z', c - ww / 2, c + ww / 2, z0 - 0.04, wy, wy + wh, 5, dark);
      flat.box(c - ww / 2 - 0.1, wy - 0.18, z0 - 0.16, c + ww / 2 + 0.1, wy, z0 + 0.02, stone); // sill
    }
    // arched entrance, centre ground, street side
    const ecx = (x0 + x1) / 2;
    flat.arch('z', ecx - 1.1, ecx + 1.1, z0 - 0.05, 0, 2.4, 6, dark);
    flat.box(ecx - 1.35, 0, z0 - 0.2, ecx + 1.35, 0.25, z0, stone);
    if (hh > 10) this._roofClutter(flat, x0, z0, x1, z1, hh, H);
  }

  // --- 5. cylindrical / rounded accent tower with domed or conical roof ----
  _archCylinder(M, flat, b) {
    const { x0, z0, x1, z1, hh, H, div, uOff, vOff } = b;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const r = Math.min(x1 - x0, z1 - z0) / 2;
    const t = 0.8 + H(3) * 0.2;
    const useGlass = H(4) > 0.5;
    const mat = useGlass ? M.glass : M.stone;
    const wc = useGlass ? [t * 0.9, t * 0.97, t, 0] : [t, t * 0.98, t * 0.9, 0];
    const segs = 22;
    // optional square base for the "rounded corner over a plinth" read
    const baseH = H(5) > 0.5 ? Math.min(4, hh * 0.25) : 0;
    if (baseH > 0) {
      this._facWalls(mat, x0, z0, x1, z1, 0, baseH, wc, div, uOff, vOff);
      flat.ledge(x0, z0, x1, z1, baseH, 0.3, 0.25, [t * 0.7, t * 0.68, t * 0.62, 0]);
    }
    mat.cyl(cx, cz, r, baseH, hh, segs, wc, 6, div);
    // ledge rings
    flat.discUp(cx, cz, r + 0.25, baseH + 0.0, segs, [t * 0.7, t * 0.68, t * 0.62, 0]);
    if (hh > 12) { const my = hh * 0.55; flat.cyl(cx, cz, r + 0.22, my - 0.2, my + 0.2, segs, [t * 0.7, t * 0.68, t * 0.62, 0], 6, 0.4); }
    // domed or conical roof
    flat.cyl(cx, cz, r, hh, hh + 0.35, segs, [0.4, 0.4, 0.44, 0], 6, 0.35); // parapet band
    if (H(6) > 0.5) flat.cone(cx, cz, r * 1.02, hh + 0.35, hh + r * 1.4, segs, [0.36, 0.3, 0.5, 0]);       // conical
    else { flat.cone(cx, cz, r * 1.02, hh + 0.35, hh + r * 0.9, segs, [0.42, 0.44, 0.5, 0]); }              // shallow dome-ish
    flat.box(cx - 0.08, hh + 0.35 + r * 0.9, cz - 0.08, cx + 0.08, hh + 0.35 + r * 1.6, cz + 0.08, [0.3, 0.3, 0.33, 0]);
  }

  // --- 6. mixed-use (glass storefront + awning, brick above, balconies) ----
  _archMixed(M, flat, b) {
    const { x0, z0, x1, z1, hh, H, div, uOff, vOff } = b;
    const t = 0.86 + H(3) * 0.18;
    const brickC = [t, t * 0.9, t * 0.86, 0], glassC = [0.85, 0.93, 0.98, 0];
    const shopH = Math.min(3.6, hh * 0.4);
    // glass shopfront base
    this._facWalls(M.glass, x0, z0, x1, z1, 0, shopH, glassC, div * 0.7, uOff, vOff);
    // brick residential above
    this._facWalls(M.brick, x0, z0, x1, z1, shopH, hh, brickC, div, uOff, vOff);
    flat.quad([x0, hh, z0], [x0, hh, z1], [x1, hh, z1], [x1, hh, z0], b.roofCol);
    // storefront cornice / band at top of shop
    const trim = [0.66, 0.6, 0.52, 0];
    flat.ledge(x0, z0, x1, z1, shopH, 0.3, 0.3, trim);
    // awning over the street-side shopfront (angled colored quad)
    const awn = [[0.72, 0.24, 0.2], [0.2, 0.45, 0.3], [0.24, 0.3, 0.55]][Math.floor(H(7) * 3)];
    const ac = [awn[0], awn[1], awn[2], 0];
    const ay = shopH - 0.4, adepth = 1.5;
    flat.quad([x1 - 0.3, ay, z0], [x0 + 0.3, ay, z0], [x0 + 0.3, ay - 0.5, z0 - adepth], [x1 - 0.3, ay - 0.5, z0 - adepth], ac);
    flat.quad([x0 + 0.3, ay, z0], [x1 - 0.3, ay, z0], [x1 - 0.3, ay - 0.5, z0 - adepth], [x0 + 0.3, ay - 0.5, z0 - adepth], [ac[0] * 0.7, ac[1] * 0.7, ac[2] * 0.7, 0]);
    // cornice at top
    this._parapetLedge(flat, x0, z0, x1, z1, hh - 0.7, trim);
    this._parapet(flat, x0, z0, x1, z1, hh, 0.5, trim);
    // a couple balconies on upper floors
    const rail = [0.22, 0.2, 0.19, 0], floors = Math.floor(hh / 3);
    for (let f = 2; f < floors; f++) if (H(80 + f) > 0.5) {
      const mid = (x0 + x1) / 2;
      this._balconyZ(flat, mid - 1.5, mid + 1.5, z0, f * 3, 1.0, [0.5, 0.46, 0.42, 0], rail);
    }
    if (hh > 10) this._roofClutter(flat, x0, z0, x1, z1, hh, H);
  }

  // --- 7. simple box (kept plain so the skyline isn't overwhelming) --------
  _archSimple(M, flat, b) {
    const { x0, z0, x1, z1, hh, H, div, uOff, vOff } = b;
    const r = H(3);
    const tint = [0.52 + r * 0.42, 0.5 + H(4) * 0.4, 0.5 + H(5) * 0.44];
    const wc = [tint[0], tint[1], tint[2], 0];
    this._facWalls(M.facade, x0, z0, x1, z1, 0, hh, wc, div, uOff, vOff);
    flat.quad([x0, hh, z0], [x0, hh, z1], [x1, hh, z1], [x1, hh, z0], b.roofCol);
    flat.ledge(x0, z0, x1, z1, hh - 0.3, 0.3, 0.2, [0.34, 0.34, 0.37, 0]);
    this._parapet(flat, x0, z0, x1, z1, hh, 0.45, [0.32, 0.33, 0.36, 0]);
    if (hh > 12) this._roofClutter(flat, x0, z0, x1, z1, hh, H);
  }

  // --- special buildings: garage / hospital, recognizable tint + detail ----
  _archSpecial(M, flat, b) {
    const { x0, z0, x1, z1, hh, kind, H, div, uOff, vOff } = b;
    const tint = b.tint, wc = [tint[0], tint[1], tint[2], 0];
    this._facWalls(M.facade, x0, z0, x1, z1, 0, hh, wc, div, uOff, vOff);
    flat.quad([x0, hh, z0], [x0, hh, z1], [x1, hh, z1], [x1, hh, z0], b.roofCol);
    const trim = [tint[0] * 0.7, tint[1] * 0.7, tint[2] * 0.72, 0];
    if (kind === 'garage') {
      // horizontal parking-deck bands
      for (let y = 2.5; y < hh - 0.5; y += 2.5) flat.ledge(x0, z0, x1, z1, y, 0.25, 0.22, trim);
    } else {
      // hospital: base course + a rooftop mechanical penthouse
      flat.ledge(x0, z0, x1, z1, 3.2, 0.35, 0.28, trim);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      flat.box(cx - 1.6, hh, cz - 1.6, cx + 1.6, hh + 1.6, cz + 1.6, trim);
    }
    this._parapet(flat, x0, z0, x1, z1, hh, 0.55, trim);
    this._roofClutter(flat, x0, z0, x1, z1, hh, H);
  }

  // ---- attribute wiring -------------------------------------------------
  _bind(mesh, hasUV) {
    const gl = this.gl, L = this.loc.attrib, ST = 48;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    gl.enableVertexAttribArray(L.aPos); gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, ST, 0);
    if (L.aNormal >= 0) { gl.enableVertexAttribArray(L.aNormal); gl.vertexAttribPointer(L.aNormal, 3, gl.FLOAT, false, ST, 12); }
    if (L.aColor >= 0) { gl.enableVertexAttribArray(L.aColor); gl.vertexAttribPointer(L.aColor, 4, gl.FLOAT, false, ST, 24); }
    if (L.aUV >= 0) { gl.enableVertexAttribArray(L.aUV); gl.vertexAttribPointer(L.aUV, 2, gl.FLOAT, false, ST, 40); }
  }

  _draw(mesh, model, tint, texMix, alpha) {
    const gl = this.gl, U = this.loc.uniform;
    gl.uniformMatrix4fv(U.uModel, false, model);
    gl.uniform3fv(U.uTint, tint || WHITE);
    gl.uniform1f(U.uTexMix, texMix || 0);
    gl.uniform1f(U.uAlpha, alpha == null ? 1 : alpha);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
  }

  // draw a scaled/translated unit box in a parent model frame (dynamic parts)
  _boxIn(parent, cx, cy, cz, dx, dy, dz, tint, alpha) {
    const local = mat4.fromTRS(cx, cy, cz, 0, dx, dy, dz);
    const model = mat4.multiply(parent, local, this._tmp);
    const gl = this.gl, U = this.loc.uniform;
    gl.uniformMatrix4fv(U.uModel, false, model);
    gl.uniform3fv(U.uTint, tint);
    gl.uniform1f(U.uAlpha, alpha == null ? 1 : alpha);
    gl.drawArrays(gl.TRIANGLES, 0, this.unitBox.n);
  }

  // ---- frame ------------------------------------------------------------
  render(scene) {
    const gl = this.gl, city = scene.city;
    if (this._cityRef !== city) this._buildCity(city, scene.props);
    this._tmp = this._tmp || new Float32Array(16);

    const W = this.canvas.width, H = this.canvas.height;
    gl.viewport(0, 0, W, H);
    if (this._aspect !== W / H) { this._aspect = W / H; this._proj = mat4.perspective(VFOV, this._aspect, 0.1, 600); }

    const e = scene.eye, yaw = scene.yaw, pitch = scene.pitch;
    const cp = Math.cos(pitch);
    const fwd = [Math.cos(yaw) * cp, Math.sin(pitch), Math.sin(yaw) * cp];
    const eye = [e.x, e.y, e.z];
    const view = mat4.lookAt(eye, [eye[0] + fwd[0], eye[1] + fwd[1], eye[2] + fwd[2]], [0, 1, 0]);
    const viewRot = new Float32Array(view); viewRot[12] = viewRot[13] = viewRot[14] = 0;

    gl.clearColor(SKY_HOR[0], SKY_HOR[1], SKY_HOR[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // --- sky --------------------------------------------------------------
    gl.useProgram(this.skyProg);
    const SL = this.skyLoc;
    gl.depthMask(false); gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(SL.uniform.uProj, false, this._proj);
    gl.uniformMatrix4fv(SL.uniform.uViewRot, false, viewRot);
    gl.uniform3fv(SL.uniform.uSkyTop, SKY_TOP); gl.uniform3fv(SL.uniform.uSkyHor, SKY_HOR);
    gl.uniform3fv(SL.uniform.uSunDir, SUN_DIR); gl.uniform3fv(SL.uniform.uSunCol, SUN_COL);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sky.buf);
    gl.enableVertexAttribArray(SL.attrib.aPos);
    gl.vertexAttribPointer(SL.attrib.aPos, 3, gl.FLOAT, false, 12, 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.sky.n);
    gl.depthMask(true); gl.enable(gl.CULL_FACE);

    // --- world program setup ---------------------------------------------
    gl.useProgram(this.prog);
    const U = this.loc.uniform;
    gl.uniformMatrix4fv(U.uProj, false, this._proj);
    gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uLightDir, SUN_DIR);
    gl.uniform3fv(U.uAmbient, AMBIENT);
    gl.uniform3fv(U.uSun, SUN_LIT);
    gl.uniform3fv(U.uFogColor, FOG_COL);
    gl.uniform1f(U.uFogStart, FOG_START);
    gl.uniform1f(U.uFogEnd, FAR);
    gl.uniform1i(U.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);

    // ground (textured)
    gl.bindTexture(gl.TEXTURE_2D, this.groundTex);
    this._bind(this.groundMesh);
    this._draw(this.groundMesh, IDENT, WHITE, 1, 1);

    // building walls, one draw per facade material texture
    for (const mm of this.matMeshes) {
      if (!mm.n) continue;
      gl.bindTexture(gl.TEXTURE_2D, mm.tex);
      this._bind(mm);
      this._draw(mm, IDENT, WHITE, 1, 1);
    }

    // roofs / greebles / trees (flat)
    this._bind(this.flatMesh);
    this._draw(this.flatMesh, IDENT, WHITE, 0, 1);

    // --- dynamic entities -------------------------------------------------
    gl.uniform1f(U.uTexMix, 0);
    this._bind(this.unitBox);
    const ents = scene.entities || [];
    const ex = eye[0], ez = eye[2];
    // shadows first (blended, no depth write)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    for (const en of ents) {
      if ((en.x - ex) ** 2 + (en.z - ez) ** 2 > FAR * FAR) continue;
      if (en.kind === 'ped') {
        const parent = mat4.fromTRS(en.x, 0, en.z, en.heading || 0, 1, 1, 1);
        this._boxIn(parent, 0, 0.03, 0, 0.85, 0.02, 0.85, SHADOW, 0.32);
      } else {
        const parent = mat4.fromTRS(en.x, 0, en.z, en.heading || 0, 1, 1, 1);
        this._boxIn(parent, 0, 0.03, 0, en.l * 1.05, 0.02, en.w * 1.05, SHADOW, 0.34);
      }
    }
    gl.disable(gl.BLEND); gl.depthMask(true);
    // bodies
    for (const en of ents) {
      if ((en.x - ex) ** 2 + (en.z - ez) ** 2 > FAR * FAR) continue;
      if (en.kind === 'ped') this._drawPed(en);
      else this._drawCar(en);
    }
  }

  _drawCar(e) {
    const l = e.l, w = e.w, h = e.h;
    const tint = [e.color[0] / 255, e.color[1] / 255, e.color[2] / 255];
    const parent = mat4.fromTRS(e.x, 0, e.z, e.heading || 0, 1, 1, 1);

    // --- real CC0 car model (scaled onto the vehicle's l/w/h box) ---------
    if (this.carModel) {
      const m = this.carModel;
      const scl = mat4.fromTRS(0, 0, 0, 0, l / m.size[0], h / m.size[1], w / m.size[2]);
      this._tmp2 = mat4.multiply(parent, scl, this._tmp2 || new Float32Array(16));
      this._bind(m);
      this._draw(m, this._tmp2, tint, 0, 1);
      if (e.police) {
        this._bind(this.unitBox);
        const on = ((e.flash | 0) % 2) === 0;
        const top = h * 0.94;
        this._boxIn(parent, l * 0.02, top, -w * 0.2, 0.34, 0.22, 0.3, on ? RED : BLUE);
        this._boxIn(parent, l * 0.02, top, w * 0.2, 0.34, 0.22, 0.3, on ? BLUE : RED);
      }
      return;
    }

    // --- procedural box fallback -----------------------------------------
    this._bind(this.unitBox);
    const bodyH = Math.max(0.5, h * 0.55), bodyY = 0.32 + bodyH / 2;
    // body
    this._boxIn(parent, 0, bodyY, 0, l * 0.96, bodyH, w, tint);
    // cabin / glasshouse (slightly back, narrower) — dark glass
    const cabH = Math.max(0.45, h * 0.5), cabY = 0.32 + bodyH + cabH / 2 - 0.05;
    this._boxIn(parent, -l * 0.05, cabY, 0, l * 0.5, cabH, w * 0.86, GLASS);
    // wheels
    const wx = l * 0.33, wz = w * 0.52, wy = 0.32;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this._boxIn(parent, sx * wx, wy, sz * wz, 0.7, 0.62, 0.32, WHEEL);
    }
    // police light bar
    if (e.police) {
      const on = ((e.flash | 0) % 2) === 0;
      const top = 0.32 + bodyH + cabH + 0.12;
      this._boxIn(parent, l * 0.02, top, -w * 0.2, 0.34, 0.22, 0.3, on ? RED : BLUE);
      this._boxIn(parent, l * 0.02, top, w * 0.2, 0.34, 0.22, 0.3, on ? BLUE : RED);
    }
  }

  _drawPed(e) {
    const y = e.y || 0;
    const parent = mat4.fromTRS(e.x, y, e.z, e.heading || 0, 1, 1, 1);

    // --- real CC0 character model (upright peds + player; y carries jump) --
    if (this.charModel && e.state !== 'down') {
      const m = this.charModel;
      const sc = (e.h || 1.8) / m.size[1];
      const scl = mat4.fromTRS(0, 0, 0, 0, sc, sc, sc);
      this._tmp3 = mat4.multiply(parent, scl, this._tmp3 || new Float32Array(16));
      this._bind(m);
      this._draw(m, this._tmp3, WHITE, 0, 1);
      return;
    }

    // --- procedural box fallback (also used for knocked-down peds) --------
    this._bind(this.unitBox);
    const pants = [e.color[0] / 255, e.color[1] / 255, e.color[2] / 255];
    const shirt = [(e.shirt || e.color)[0] / 255, (e.shirt || e.color)[1] / 255, (e.shirt || e.color)[2] / 255];
    if (e.state === 'down') {
      this._boxIn(parent, 0, 0.2, 0, 1.3, 0.34, 0.55, shirt);
      this._boxIn(parent, 0.72, 0.2, 0, 0.32, 0.32, 0.4, SKIN);
      return;
    }
    this._boxIn(parent, 0, 0.46, 0, 0.34, 0.92, 0.36, pants);   // legs
    this._boxIn(parent, 0, 1.2, 0, 0.46, 0.68, 0.36, shirt);    // torso
    this._boxIn(parent, 0, 1.7, 0, 0.34, 0.34, 0.34, SKIN);     // head
  }

  // ---- test-hook helpers ------------------------------------------------
  frameStats() {
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height;
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0, sum2 = 0; const buckets = new Set(); const n = W * H;
    for (let i = 0; i < n; i++) {
      const o = i * 4; const lum = px[o] * 0.3 + px[o + 1] * 0.59 + px[o + 2] * 0.11;
      sum += lum; sum2 += lum * lum;
      buckets.add((px[o] >> 4) * 256 + (px[o + 1] >> 4) * 16 + (px[o + 2] >> 4));
    }
    const mean = sum / n; return { mean, variance: sum2 / n - mean * mean, distinct: buckets.size, n };
  }
}

const WHITE = new Float32Array([1, 1, 1]);
const IDENT = mat4.identity();
const SHADOW = new Float32Array([0.04, 0.04, 0.06]);
const GLASS = new Float32Array([0.28, 0.33, 0.42]);
const WHEEL = new Float32Array([0.08, 0.08, 0.09]);
const RED = new Float32Array([1.0, 0.15, 0.12]);
const BLUE = new Float32Array([0.2, 0.35, 1.0]);
