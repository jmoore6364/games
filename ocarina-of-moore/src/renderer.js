// renderer.js — WebGL1 low-poly renderer for Ocarina of Moore.
// Directional + ambient (Lambert) lighting, a per-vertex emissive flag for
// self-lit glows (torches, gems), a gradient sky-box with a sun, depth buffer,
// backface culling and distance fog. All geometry procedural. SwiftShader-safe.

import { mat4, normalize, program, locations, buffer } from './gl.js';
import { Mesh } from './mesh.js';

const WHITE = new Float32Array([1, 1, 1]);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const opts = { alpha: false, antialias: true, depth: true, preserveDrawingBuffer: true };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) throw new Error('WebGL not available');
    this.gl = gl;
    this._tmp = new Float32Array(16);
    this._proj = mat4.perspective(Math.PI / 3, 1, 0.1, 400);
    this._view = mat4.identity();
    this._aspect = 0;

    const vs = `
      attribute vec3 aPos; attribute vec3 aNormal; attribute vec4 aColor;
      uniform mat4 uProj, uView, uModel; uniform vec3 uTint; uniform float uTintMix;
      varying vec3 vN; varying vec3 vCol; varying float vEmis; varying float vDist;
      void main() {
        vec4 wp = uModel * vec4(aPos, 1.0);
        vec4 vp = uView * wp;
        gl_Position = uProj * vp;
        vN = normalize((uModel * vec4(aNormal, 0.0)).xyz);
        vCol = mix(aColor.rgb, uTint, uTintMix);
        vEmis = aColor.a;
        vDist = -vp.z;
      }`;
    const fs = `
      precision mediump float;
      uniform vec3 uLightDir, uAmbient, uSun, uFogColor;
      uniform float uFogStart, uFogEnd, uAlpha, uEmisBoost, uFlash;
      varying vec3 vN; varying vec3 vCol; varying float vEmis; varying float vDist;
      void main() {
        vec3 N = normalize(vN);
        float diff = max(dot(N, uLightDir), 0.0);
        vec3 lit = vCol * (uAmbient + uSun * diff);
        lit = mix(lit, vCol * (1.2 + uEmisBoost), vEmis);
        lit += vec3(uFlash);
        float f = clamp((uFogEnd - vDist) / (uFogEnd - uFogStart), 0.0, 1.0);
        f = mix(f, 1.0, vEmis * 0.6);
        vec3 col = mix(uFogColor, lit, f);
        gl_FragColor = vec4(col, uAlpha);
      }`;
    this.prog = program(gl, vs, fs);
    this.loc = locations(gl, this.prog);

    const skvs = `
      attribute vec3 aPos; uniform mat4 uProj, uViewRot;
      varying vec3 vDir;
      void main() { vDir = aPos; vec4 p = uProj * uViewRot * vec4(aPos, 1.0); gl_Position = p.xyww; }`;
    const skfs = `
      precision mediump float;
      varying vec3 vDir; uniform vec3 uSkyTop, uSkyHor, uSunDir, uSunCol;
      void main() {
        vec3 d = normalize(vDir);
        float t = clamp(d.y * 1.4 + 0.15, 0.0, 1.0);
        vec3 col = mix(uSkyHor, uSkyTop, t);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunCol * pow(s, 180.0) * 1.2;
        col += uSunCol * pow(s, 8.0) * 0.10;
        gl_FragColor = vec4(col, 1.0);
      }`;
    this.skyProg = program(gl, skvs, skfs);
    this.skyLoc = locations(gl, this.skyProg);

    // sky cube
    const sm = new Mesh();
    sm.box(-1, -1, -1, 1, 1, 1, [0, 0, 0, 0]);
    this.sky = this._upload(sm);

    // primitive library
    const b = new Mesh(); b.boxc(0, 0, 0, 0.5, 0.5, 0.5, [1, 1, 1, 0]); this.unitBox = this._upload(b);
    const cy = new Mesh(); cy.cyl(0, 0, 0.5, -0.5, 0.5, 10, [1, 1, 1, 0], true); this.unitCyl = this._upload(cy);
    const cn = new Mesh(); cn.cone(0, 0, 0.5, 0, 1, 10, [1, 1, 1, 0]); cn.discDown(0, 0, 0.5, 0, 10, [1, 1, 1, 0]); this.unitCone = this._upload(cn);
    const sp = new Mesh(); sp.sphere(0, 0, 0, 0.5, 5, 8, [1, 1, 1, 0]); this.unitSphere = this._upload(sp);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.clearColor(0.1, 0.1, 0.1, 1);
  }

  _upload(mesh) {
    const gl = this.gl;
    return { buf: buffer(gl, mesh.data()), n: mesh.count };
  }
  uploadMesh(mesh) { return this._upload(mesh); }

  resize() {
    const c = this.canvas;
    const w = Math.max(2, c.clientWidth | 0), h = Math.max(2, c.clientHeight | 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (w * dpr) | 0, H = (h * dpr) | 0;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  }

  // light preset per area
  beginFrame(cam, L) {
    const gl = this.gl, c = this.canvas;
    const W = c.width, H = c.height;
    gl.viewport(0, 0, W, H);
    if (this._aspect !== W / H) { this._aspect = W / H; this._proj = mat4.perspective(cam.fov || Math.PI / 3, this._aspect, 0.1, 400); }

    const view = mat4.lookAt(cam.eye, cam.target, [0, 1, 0]);
    this._view = view;
    const viewRot = new Float32Array(view); viewRot[12] = viewRot[13] = viewRot[14] = 0;

    gl.clearColor(L.fog[0], L.fog[1], L.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // sky
    gl.useProgram(this.skyProg);
    const SL = this.skyLoc;
    gl.depthMask(false); gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(SL.uniform.uProj, false, this._proj);
    gl.uniformMatrix4fv(SL.uniform.uViewRot, false, viewRot);
    gl.uniform3fv(SL.uniform.uSkyTop, L.skyTop);
    gl.uniform3fv(SL.uniform.uSkyHor, L.skyHor);
    gl.uniform3fv(SL.uniform.uSunDir, L.sunDir);
    gl.uniform3fv(SL.uniform.uSunCol, L.sunCol);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sky.buf);
    gl.enableVertexAttribArray(SL.attrib.aPos);
    gl.vertexAttribPointer(SL.attrib.aPos, 3, gl.FLOAT, false, 48, 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.sky.n);
    gl.depthMask(true); gl.enable(gl.CULL_FACE);

    // world program
    gl.useProgram(this.prog);
    const U = this.loc.uniform;
    gl.uniformMatrix4fv(U.uProj, false, this._proj);
    gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uLightDir, L.sunDir);
    gl.uniform3fv(U.uAmbient, L.ambient);
    gl.uniform3fv(U.uSun, L.sunCol);
    gl.uniform3fv(U.uFogColor, L.fog);
    gl.uniform1f(U.uFogStart, L.fogStart);
    gl.uniform1f(U.uFogEnd, L.fogEnd);
    gl.uniform1f(U.uEmisBoost, L.emisBoost || 0);
    gl.uniform1f(U.uFlash, L.flash || 0);
    gl.uniform1f(U.uAlpha, 1);
    gl.uniform1f(U.uTintMix, 0);
    this._boundBuf = null;
  }

  _bind(handle) {
    if (this._boundBuf === handle.buf) return;
    const gl = this.gl, A = this.loc.attrib, ST = 48;
    gl.bindBuffer(gl.ARRAY_BUFFER, handle.buf);
    gl.enableVertexAttribArray(A.aPos); gl.vertexAttribPointer(A.aPos, 3, gl.FLOAT, false, ST, 0);
    gl.enableVertexAttribArray(A.aNormal); gl.vertexAttribPointer(A.aNormal, 3, gl.FLOAT, false, ST, 12);
    gl.enableVertexAttribArray(A.aColor); gl.vertexAttribPointer(A.aColor, 4, gl.FLOAT, false, ST, 24);
    this._boundBuf = handle.buf;
  }

  drawMesh(handle, model, opts) {
    const gl = this.gl, U = this.loc.uniform;
    this._bind(handle);
    gl.uniformMatrix4fv(U.uModel, false, model);
    if (opts && opts.tint) { gl.uniform3fv(U.uTint, opts.tint); gl.uniform1f(U.uTintMix, opts.tintMix == null ? 1 : opts.tintMix); }
    else gl.uniform1f(U.uTintMix, 0);
    gl.uniform1f(U.uAlpha, opts && opts.alpha != null ? opts.alpha : 1);
    gl.drawArrays(gl.TRIANGLES, 0, handle.n);
    if (opts && opts.tint) gl.uniform1f(U.uTintMix, 0);
  }

  // convenience primitive draws (tint = color, emis for glow via alpha handled by boost)
  _prim(handle, cx, cy, cz, yaw, sx, sy, sz, color, emis, alpha) {
    const gl = this.gl, U = this.loc.uniform;
    const m = mat4.fromTRS(cx, cy, cz, yaw || 0, sx, sy, sz);
    this._bind(handle);
    gl.uniformMatrix4fv(U.uModel, false, m);
    gl.uniform3fv(U.uTint, color); gl.uniform1f(U.uTintMix, 1);
    gl.uniform1f(U.uAlpha, alpha == null ? 1 : alpha);
    gl.drawArrays(gl.TRIANGLES, 0, handle.n);
    gl.uniform1f(U.uTintMix, 0);
  }
  drawBox(cx, cy, cz, yaw, sx, sy, sz, color, alpha) { this._prim(this.unitBox, cx, cy, cz, yaw, sx, sy, sz, color, 0, alpha); }
  drawCyl(cx, cy, cz, yaw, r, h, color, alpha) { this._prim(this.unitCyl, cx, cy, cz, yaw, r * 2, h, r * 2, color, 0, alpha); }
  drawCone(cx, cy, cz, yaw, r, h, color, alpha) { this._prim(this.unitCone, cx, cy, cz, yaw, r * 2, h, r * 2, color, 0, alpha); }
  drawSphere(cx, cy, cz, r, color, alpha) { this._prim(this.unitSphere, cx, cy, cz, 0, r * 2, r * 2, r * 2, color, 0, alpha); }

  // glowing primitive (adds strong emissive by drawing brighter + fog immunity approximated)
  drawGlow(kind, cx, cy, cz, r, color, alpha) {
    const gl = this.gl, U = this.loc.uniform;
    const handle = kind === 'sphere' ? this.unitSphere : kind === 'cyl' ? this.unitCyl : this.unitBox;
    const m = mat4.fromTRS(cx, cy, cz, 0, r * 2, r * 2, r * 2);
    this._bind(handle);
    gl.uniformMatrix4fv(U.uModel, false, m);
    // brighten toward white for a glow read
    const bright = [Math.min(1, color[0] * 1.3 + 0.15), Math.min(1, color[1] * 1.3 + 0.15), Math.min(1, color[2] * 1.3 + 0.15)];
    gl.uniform3fv(U.uTint, bright); gl.uniform1f(U.uTintMix, 1);
    gl.uniform1f(U.uAlpha, alpha == null ? 1 : alpha);
    gl.drawArrays(gl.TRIANGLES, 0, handle.n);
    gl.uniform1f(U.uTintMix, 0);
  }
}
