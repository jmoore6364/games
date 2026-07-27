// gl.js — minimal hand-written WebGL1 helpers + a tiny column-major mat4/vec3
// math module. Zero dependencies. Adapted from the proven grand-theft-moore
// renderer. SwiftShader-safe GLSL ES 1.00. BROWSER-ONLY.

// ---- vec3 ---------------------------------------------------------------
export function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }

// ---- mat4 (column-major Float32Array[16]) -------------------------------
export const mat4 = {
  identity() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },

  multiply(a, b, out) {
    out = out || new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  },

  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  },

  lookAt(eye, center, up) {
    const f = normalize([center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]]);
    const s = normalize(cross(f, up));
    const u = cross(s, f);
    return new Float32Array([
      s[0], u[0], -f[0], 0,
      s[1], u[1], -f[1], 0,
      s[2], u[2], -f[2], 0,
      -dot(s, eye), -dot(u, eye), dot(f, eye), 1,
    ]);
  },

  // Model matrix = Translate * RotateY(yaw) * Scale.
  // Heading convention: yaw 0 = +x;  x' = cos*x - sin*z,  z' = sin*x + cos*z.
  fromTRS(tx, ty, tz, yaw, sx, sy, sz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return new Float32Array([
      c * sx, 0, s * sx, 0,
      0, sy, 0, 0,
      -s * sz, 0, c * sz, 0,
      tx, ty, tz, 1,
    ]);
  },
};

// ---- program / buffer helpers ------------------------------------------
export function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    throw new Error('shader compile failed: ' + log + '\n' + src);
  }
  return sh;
}

export function program(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('program link failed: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

export function locations(gl, prog) {
  const loc = { attrib: {}, uniform: {} };
  const na = gl.getProgramParameter(prog, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) {
    const info = gl.getActiveAttrib(prog, i);
    loc.attrib[info.name] = gl.getAttribLocation(prog, info.name);
  }
  const nu = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) {
    const info = gl.getActiveUniform(prog, i);
    loc.uniform[info.name] = gl.getUniformLocation(prog, info.name);
  }
  return loc;
}

export function buffer(gl, data, target) {
  const b = gl.createBuffer();
  gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
  gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return b;
}
