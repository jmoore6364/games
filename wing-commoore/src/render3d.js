// render3d.js — vector math, camera projection, starfield, ship-model drawing, cockpit frame.
// Pure Canvas 2D. Right-handed-ish: forward = viewing direction, right, up form the camera basis.

// ---------- vec3 helpers ----------
export const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  len: (a) => Math.hypot(a.x, a.y, a.z),
  norm: (a) => {
    const l = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / l, y: a.y / l, z: a.z / l };
  },
  clone: (a) => ({ x: a.x, y: a.y, z: a.z }),
};

// Rotate vector v around unit axis by angle t (Rodrigues).
export function rotAxis(v, axis, t) {
  const c = Math.cos(t), s = Math.sin(t);
  const d = V.dot(axis, v);
  const cr = V.cross(axis, v);
  return {
    x: v.x * c + cr.x * s + axis.x * d * (1 - c),
    y: v.y * c + cr.y * s + axis.y * d * (1 - c),
    z: v.z * c + cr.z * s + axis.z * d * (1 - c),
  };
}

// An orientation is a basis {fwd, right, up}. Keep it orthonormal.
export function makeBasis() {
  return {
    fwd: { x: 0, y: 0, z: 1 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  };
}
export function reortho(o) {
  o.fwd = V.norm(o.fwd);
  o.right = V.norm(V.cross(o.up, o.fwd));
  o.up = V.norm(V.cross(o.fwd, o.right));
}
// Rotate whole basis: pitch about right, yaw about up, roll about fwd.
export function pitch(o, t) { o.fwd = rotAxis(o.fwd, o.right, t); o.up = rotAxis(o.up, o.right, t); }
export function yaw(o, t) { o.fwd = rotAxis(o.fwd, o.up, t); o.right = rotAxis(o.right, o.up, t); }
export function roll(o, t) { o.right = rotAxis(o.right, o.fwd, t); o.up = rotAxis(o.up, o.fwd, t); }

// Transform world point into camera space relative to eye position + orientation.
export function toCam(p, eye, o) {
  const r = V.sub(p, eye);
  return { x: V.dot(r, o.right), y: V.dot(r, o.up), z: V.dot(r, o.fwd) };
}
// Perspective project a camera-space point. Returns {sx,sy,scale,vis}.
export function project(c, W, H, focal) {
  if (c.z <= 0.05) return { vis: false, sx: 0, sy: 0, scale: 0, z: c.z };
  const scale = focal / c.z;
  return {
    vis: true,
    sx: W * 0.5 + c.x * scale,
    sy: H * 0.5 - c.y * scale,
    scale,
    z: c.z,
  };
}

// ---------- Starfield ----------
export function makeStars(count, spread) {
  const s = [];
  for (let i = 0; i < count; i++) {
    s.push({
      x: (Math.random() * 2 - 1) * spread,
      y: (Math.random() * 2 - 1) * spread,
      z: (Math.random() * 2 - 1) * spread,
      b: 0.35 + Math.random() * 0.65,
    });
  }
  return s;
}

// Wrap stars in a cube around the eye so they stream past as you fly.
export function drawStars(ctx, stars, eye, o, W, H, focal, spread, vel) {
  const size2 = spread;
  for (const st of stars) {
    // relative to eye, wrap into [-spread,spread]
    let rx = st.x - eye.x, ry = st.y - eye.y, rz = st.z - eye.z;
    rx = wrap(rx, size2); ry = wrap(ry, size2); rz = wrap(rz, size2);
    // reposition star absolute so it stays wrapped next frame
    st.x = eye.x + rx; st.y = eye.y + ry; st.z = eye.z + rz;
    const cx = rx * o.right.x + ry * o.right.y + rz * o.right.z;
    const cy = rx * o.up.x + ry * o.up.y + rz * o.up.z;
    const cz = rx * o.fwd.x + ry * o.fwd.y + rz * o.fwd.z;
    if (cz <= 0.4) continue;
    const scale = focal / cz;
    const sx = W * 0.5 + cx * scale;
    const sy = H * 0.5 - cy * scale;
    if (sx < 0 || sx > W || sy < 0 || sy > H) continue;
    const depth = 1 - Math.min(1, cz / (spread * 1.6));
    const b = st.b * (0.3 + depth * 0.9);
    const px = 0.6 + depth * 1.8;
    // streak when moving fast
    if (vel > 22) {
      const cz2 = cz + vel * 0.05;
      const scale2 = focal / cz2;
      const sx2 = W * 0.5 + cx * scale2;
      const sy2 = H * 0.5 - cy * scale2;
      ctx.strokeStyle = `rgba(190,215,255,${b})`;
      ctx.lineWidth = px;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx2, sy2); ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(210,225,255,${b})`;
      ctx.fillRect(sx - px * 0.5, sy - px * 0.5, px, px);
    }
  }
}
function wrap(v, s) {
  const w = s * 2;
  v = v % w;
  if (v > s) v -= w;
  if (v < -s) v += w;
  return v;
}

// ---------- Ship model rendering ----------
// model = { verts:[{x,y,z}...], faces:[{i:[..], c:'#rgb', s?:shade}], scale }
// Draw a ship model at world pos with its own orientation basis, seen from eye/cam.
export function drawModel(ctx, model, pos, ori, eye, cam, W, H, focal, opts = {}) {
  const sc = model.scale * (opts.scale || 1);
  const light = opts.light || { x: 0.4, y: 0.6, z: -0.7 };
  // transform verts to world then to camera space
  const cv = [];
  for (const v of model.verts) {
    const wx = pos.x + (v.x * ori.right.x + v.y * ori.up.x + v.z * ori.fwd.x) * sc;
    const wy = pos.y + (v.x * ori.right.y + v.y * ori.up.y + v.z * ori.fwd.y) * sc;
    const wz = pos.z + (v.x * ori.right.z + v.y * ori.up.z + v.z * ori.fwd.z) * sc;
    const rx = wx - eye.x, ry = wy - eye.y, rz = wz - eye.z;
    cv.push({
      x: rx * cam.right.x + ry * cam.right.y + rz * cam.right.z,
      y: rx * cam.up.x + ry * cam.up.y + rz * cam.up.z,
      z: rx * cam.fwd.x + ry * cam.fwd.y + rz * cam.fwd.z,
      wx, wy, wz,
    });
  }
  // build face list with average depth, project
  const polys = [];
  for (const f of model.faces) {
    let za = 0, behind = false;
    for (const idx of f.i) { const c = cv[idx]; za += c.z; if (c.z <= 0.2) behind = true; }
    if (behind) continue;
    za /= f.i.length;
    // world-space normal for lighting & backface
    const a = cv[f.i[0]], b = cv[f.i[1]], c = cv[f.i[2]];
    // screen coords
    const pts = f.i.map((idx) => {
      const cc = cv[idx];
      const s = focal / cc.z;
      return [W * 0.5 + cc.x * s, H * 0.5 - cc.y * s];
    });
    // backface cull via screen winding (skip for thin faces flagged twosided)
    const area = signedArea(pts);
    if (!f.two && area <= 0) continue;
    // simple lighting from world normal
    const wa = cv[f.i[0]], wb = cv[f.i[1]], wc = cv[f.i[2]];
    const n = V.norm(V.cross(
      { x: wb.wx - wa.wx, y: wb.wy - wa.wy, z: wb.wz - wa.wz },
      { x: wc.wx - wa.wx, y: wc.wy - wa.wy, z: wc.wz - wa.wz }
    ));
    const ndl = V.dot(n, light);
    let lit = 0.55 + 0.45 * (f.two ? Math.abs(ndl) : Math.max(0, ndl));
    lit = Math.max(0.35, Math.min(1.15, lit * (f.s || 1)));
    polys.push({ pts, z: za, c: f.c, lit, line: f.line });
  }
  polys.sort((p, q) => q.z - p.z); // far first
  for (const p of polys) {
    ctx.beginPath();
    ctx.moveTo(p.pts[0][0], p.pts[0][1]);
    for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = shade(p.c, p.lit);
    ctx.fill();
    if (p.line) { ctx.strokeStyle = p.line; ctx.lineWidth = 1; ctx.stroke(); }
  }
  return polys.length > 0;
}
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a * 0.5;
}
// shade a #rrggbb-ish color by factor
export function shade(hex, f) {
  const c = parseHex(hex);
  const r = Math.min(255, c.r * f) | 0;
  const g = Math.min(255, c.g * f) | 0;
  const b = Math.min(255, c.b * f) | 0;
  return `rgb(${r},${g},${b})`;
}
function parseHex(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}
