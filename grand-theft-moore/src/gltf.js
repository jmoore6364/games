// gltf.js — a minimal, dependency-free glTF 2.0 loader for STATIC meshes.
//
// It parses a binary `.glb` (12-byte header + JSON chunk + BIN chunk) or a
// `.gltf` JSON with an external / data-URI `.bin`, walks the node hierarchy to
// bake each node's world transform into the geometry, and extracts — per mesh
// primitive — POSITION, NORMAL (flat normals computed when absent), TEXCOORD_0
// (optional) and the material baseColorFactor as a per-vertex colour.
//
// Skinning and animation are intentionally IGNORED: the mesh is emitted in its
// stored (rest / authored) pose, transformed only by the static node tree.
//
// Output is a single interleaved, NON-indexed triangle soup matching the
// renderer's vertex format exactly:  pos3, nrm3, col4, uv2  (12 floats / 48 B).
//
// The loader never throws on a "normal" file; callers should still wrap it in
// try/catch so any unexpected asset falls back to procedural meshes.
// BROWSER-ONLY (uses fetch); pure data otherwise.

const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const COMP_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

// ---- tiny column-major mat4 helpers ------------------------------------
function m4mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function m4fromNode(n) {
  if (n.matrix) return Float32Array.from(n.matrix);
  const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return new Float32Array([
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ]);
}
function m4point(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}
function m4dir(m, p) {   // upper-3x3 only (no translation)
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2],
  ];
}
const IDENT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

// ---- .glb container parse ----------------------------------------------
function parseGLB(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a glb (bad magic)');
  const len = dv.getUint32(8, true);
  let off = 12, json = null, bin = null;
  while (off < len) {
    const clen = dv.getUint32(off, true), ctype = dv.getUint32(off + 4, true);
    off += 8;
    if (ctype === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, off, clen)));
    else if (ctype === 0x004e4942) bin = new Uint8Array(arrayBuffer, off, clen);
    off += clen;
  }
  if (!json) throw new Error('glb has no JSON chunk');
  return { json, bin };
}

// resolve every buffer to a Uint8Array (BIN chunk, data-URI, or external file)
async function resolveBuffers(gltf, bin, baseUrl) {
  const out = [];
  for (const b of gltf.buffers || []) {
    if (b.uri == null) { out.push(bin); continue; }
    if (b.uri.startsWith('data:')) {
      const comma = b.uri.indexOf(',');
      const bytes = atob(b.uri.slice(comma + 1));
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      out.push(arr);
    } else {
      const res = await fetch(new URL(b.uri, baseUrl).href);
      out.push(new Uint8Array(await res.arrayBuffer()));
    }
  }
  return out;
}

function readAccessor(gltf, buffers, idx) {
  const acc = gltf.accessors[idx];
  const nc = NUM[acc.type];
  const TA = COMP[acc.componentType];
  const csize = COMP_SIZE[acc.componentType];
  const out = new Float32Array(acc.count * nc);
  if (acc.bufferView == null) return out;   // sparse-only / zero-filled
  const bv = gltf.bufferViews[acc.bufferView];
  const buf = buffers[bv.buffer];
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || csize * nc;
  const norm = acc.normalized;
  for (let i = 0; i < acc.count; i++) {
    const el = new TA(buf.buffer, buf.byteOffset + base + i * stride, nc);
    for (let c = 0; c < nc; c++) {
      let v = el[c];
      if (norm) {   // normalized integer -> float
        if (TA === Uint8Array) v /= 255; else if (TA === Uint16Array) v /= 65535;
        else if (TA === Int8Array) v = Math.max(v / 127, -1); else if (TA === Int16Array) v = Math.max(v / 32767, -1);
      }
      out[i * nc + c] = v;
    }
  }
  return out;
}

function readIndices(gltf, buffers, idx) {
  const acc = gltf.accessors[idx];
  const TA = COMP[acc.componentType];
  const bv = gltf.bufferViews[acc.bufferView];
  const buf = buffers[bv.buffer];
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  return new TA(buf.buffer, buf.byteOffset + base, acc.count);
}

// ---- public API ---------------------------------------------------------
// Returns { vertexData:Float32Array(pos3,nrm3,col4,uv2), vertexCount, bbox:{min,max} }
export function buildFromGLTF(gltf, buffers) {
  const verts = [];          // flat list of 12-float vertices
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];

  const emit = (p, n, col, uv) => {
    for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
    verts.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], col[3], uv[0], uv[1]);
  };

  const matColor = (mi) => {
    const dflt = [0.8, 0.8, 0.8, 1];
    if (mi == null || !gltf.materials || !gltf.materials[mi]) return dflt;
    const pbr = gltf.materials[mi].pbrMetallicRoughness;
    return (pbr && pbr.baseColorFactor) ? pbr.baseColorFactor : dflt;
  };

  const primitive = (prim, world, nmat) => {
    if (!prim.attributes || prim.attributes.POSITION == null) return;
    if (prim.mode != null && prim.mode !== 4) return;   // TRIANGLES only
    const pos = readAccessor(gltf, buffers, prim.attributes.POSITION);
    const nrm = prim.attributes.NORMAL != null ? readAccessor(gltf, buffers, prim.attributes.NORMAL) : null;
    const uvA = prim.attributes.TEXCOORD_0 != null ? readAccessor(gltf, buffers, prim.attributes.TEXCOORD_0) : null;
    const col = matColor(prim.material);
    const idx = prim.indices != null ? readIndices(gltf, buffers, prim.indices) : null;
    const count = idx ? idx.length : pos.length / 3;
    const gv = (i) => { const j = idx ? idx[i] : i; return { p: m4point(world, [pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]]), n: nrm ? norm3(m4dir(nmat, [nrm[j * 3], nrm[j * 3 + 1], nrm[j * 3 + 2]])) : null, uv: uvA ? [uvA[j * 2], uvA[j * 2 + 1]] : [0, 0] }; };
    for (let i = 0; i + 2 < count; i += 3) {
      const a = gv(i), b = gv(i + 1), c = gv(i + 2);
      let na = a.n, nb = b.n, nc = c.n;
      if (!nrm) {   // flat normal from the triangle
        const u = [b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]];
        const w = [c.p[0] - a.p[0], c.p[1] - a.p[1], c.p[2] - a.p[2]];
        na = nb = nc = norm3([u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]);
      }
      emit(a.p, na, col, a.uv); emit(b.p, nb, col, b.uv); emit(c.p, nc, col, c.uv);
    }
  };

  const walk = (ni, parent) => {
    const node = gltf.nodes[ni];
    const world = m4mul(parent, m4fromNode(node));
    if (node.mesh != null && gltf.meshes[node.mesh]) {
      for (const prim of gltf.meshes[node.mesh].primitives) primitive(prim, world, world);
    }
    for (const c of node.children || []) walk(c, world);
  };

  const scene = gltf.scenes ? gltf.scenes[gltf.scene || 0] : null;
  const roots = scene ? scene.nodes : (gltf.nodes ? gltf.nodes.map((_, i) => i) : []);
  for (const ni of roots) walk(ni, IDENT4);

  if (!verts.length) throw new Error('gltf produced no triangles');
  return { vertexData: new Float32Array(verts), vertexCount: verts.length / 12, bbox: { min, max } };
}

function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

// Fetch + parse a `.glb` (or `.gltf`) at `url`.
export async function loadModel(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch ' + url + ' -> ' + res.status);
  if (url.endsWith('.gltf')) {
    const gltf = await res.json();
    const buffers = await resolveBuffers(gltf, null, url);
    return buildFromGLTF(gltf, buffers);
  }
  const ab = await res.arrayBuffer();
  const { json, bin } = parseGLB(ab);
  const buffers = await resolveBuffers(json, bin, url);
  return buildFromGLTF(json, buffers);
}
