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
    const walls = new Mesh();     // textured facades
    const flat = new Mesh();      // roofs, greebles, trees (untextured)
    for (let bz = 0; bz < NB; bz++) for (let bx = 0; bx < NB; bx++) {
      const kind = city.blockKind[bx + ',' + bz];
      if (kind === 'park') continue;
      const cx = bx * P + ROAD + LOT / 2, cz = bz * P + ROAD + LOT / 2;
      const hh = city.heightAt(cx, cz);
      if (!hh) continue;
      const x0 = bx * P + ROAD + SW, x1 = bx * P + ROAD + LOT - SW;
      const z0 = bz * P + ROAD + SW, z1 = bz * P + ROAD + LOT - SW;
      const special = kind === 'garage' || kind === 'hospital';
      // building base colour (tint multiplied onto the window texture)
      let tint;
      if (kind === 'garage') tint = [0.55, 0.62, 0.72];
      else if (kind === 'hospital') tint = [0.78, 0.72, 0.72];
      else {
        const r = h2(bx * 7 + 1, bz * 13 + 5);
        tint = [0.52 + r * 0.42, 0.5 + h2(bx, bz + 9) * 0.4, 0.5 + h2(bx + 5, bz) * 0.44];
      }
      const uOff = Math.floor(h2(bx * 3, bz * 5) * 4) * 0.25;
      const vOff = Math.floor(h2(bx, bz) * 4) * 0.25;
      const div = 12;   // ~4 window bays per 12 world units
      // 4 walls (col.a=1 => multiplied by uTint set per draw... here per-vertex tint)
      const wc = [tint[0], tint[1], tint[2], 0];
      this._wall(walls, [x1, z1], [x1, z0], hh, wc, div, uOff, vOff);
      this._wall(walls, [x0, z0], [x0, z1], hh, wc, div, uOff, vOff);
      this._wall(walls, [x0, z1], [x1, z1], hh, wc, div, uOff, vOff);
      this._wall(walls, [x1, z0], [x0, z0], hh, wc, div, uOff, vOff);
      // roof
      const rc = special ? [tint[0] * 0.6, tint[1] * 0.6, tint[2] * 0.62, 0] : [0.30, 0.31, 0.34, 0];
      flat.quad([x0, hh, z0], [x0, hh, z1], [x1, hh, z1], [x1, hh, z0], rc);
      // roof greeble on taller buildings
      if (hh > 12 && !special) {
        const gx0 = x0 + 2.5, gx1 = x1 - 2.5, gz0 = z0 + 2.5, gz1 = z1 - 2.5, gh = hh + 1.6 + h2(bx, bz) * 1.5;
        flat.box(gx0, hh, gz0, gx1, gh, gz1, [0.26, 0.27, 0.30, 0]);
      }
    }
    // trees in parks
    for (const pr of props || []) {
      const th = pr.h || 3.5, tr = 0.9;
      flat.box(pr.x - 0.18, 0, pr.z - 0.18, pr.x + 0.18, th * 0.45, pr.z + 0.18, [0.36, 0.26, 0.16, 0]);
      flat.box(pr.x - tr, th * 0.4, pr.z - tr, pr.x + tr, th + 0.6, pr.z + tr, [0.20, 0.44, 0.22, 0]);
    }
    const gl = this.gl;
    this.wallsMesh = { buf: buffer(gl, walls.data()), n: walls.count };
    this.flatMesh = { buf: buffer(gl, flat.data()), n: flat.count };
    // ground plane
    const gm = new Mesh(), M = city.MAP;
    gm.quad([0, 0, 0], [0, 0, M], [M, 0, M], [M, 0, 0], [1, 1, 1, 0],
      [[0, 0], [0, 1], [1, 1], [1, 0]]);
    this.groundMesh = { buf: buffer(gl, gm.data()), n: gm.count };
    this.groundTex = texture(gl, this._makeGround(city), { repeat: false, mip: true });
    this._cityRef = city;
  }

  _wall(mesh, A, B, h, col, div, uOff, vOff) {
    const a = [A[0], 0, A[1]], b = [B[0], 0, B[1]], c = [B[0], h, B[1]], d = [A[0], h, A[1]];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    mesh.quad(a, b, c, d, col, [
      [uOff, vOff], [uOff + len / div, vOff], [uOff + len / div, vOff + h / div], [uOff, vOff + h / div],
    ]);
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

    // building walls (window texture)
    gl.bindTexture(gl.TEXTURE_2D, this._facadeTex);
    this._bind(this.wallsMesh);
    this._draw(this.wallsMesh, IDENT, WHITE, 1, 1);

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
