// world.js — procedural construction of the three areas (village, overworld
// field, dungeon). Each builder bakes static scenery into one GPU mesh and
// returns collision volumes, area transitions, and descriptors for the dynamic
// gameplay objects (NPCs, enemies, pickups, chests, doors, switches, blocks)
// that game.js instantiates.

import { Mesh, addTree, addRock, addBush, addHouse } from './mesh.js';

// ---- lighting presets ------------------------------------------------------
export const LIGHTS = {
  village: {
    skyTop: [0.28, 0.52, 0.85], skyHor: [0.72, 0.82, 0.92], fog: [0.72, 0.82, 0.92],
    ambient: [0.55, 0.55, 0.58], sunCol: [0.75, 0.72, 0.60], sunDir: norm([0.5, 0.85, 0.35]),
    fogStart: 40, fogEnd: 120, emisBoost: 0.4,
  },
  field: {
    skyTop: [0.24, 0.5, 0.88], skyHor: [0.68, 0.82, 0.94], fog: [0.70, 0.84, 0.94],
    ambient: [0.52, 0.55, 0.55], sunCol: [0.82, 0.80, 0.68], sunDir: norm([0.4, 0.82, 0.42]),
    fogStart: 55, fogEnd: 170, emisBoost: 0.3,
  },
  dungeon: {
    skyTop: [0.03, 0.03, 0.06], skyHor: [0.06, 0.06, 0.10], fog: [0.04, 0.04, 0.06],
    ambient: [0.30, 0.28, 0.36], sunCol: [0.30, 0.27, 0.22], sunDir: norm([0.3, 0.7, 0.2]),
    fogStart: 18, fogEnd: 58, emisBoost: 1.1,
  },
  boss: {
    skyTop: [0.08, 0.02, 0.03], skyHor: [0.16, 0.05, 0.06], fog: [0.07, 0.03, 0.04],
    ambient: [0.34, 0.24, 0.26], sunCol: [0.42, 0.24, 0.20], sunDir: norm([0.2, 0.7, 0.3]),
    fogStart: 22, fogEnd: 64, emisBoost: 1.0,
  },
};
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }

// deterministic hash rng
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// grassy ground grid with slight per-tile color variance + optional path/pond
function addGround(M, x0, z0, x1, z1, tile, base, rng, opts) {
  opts = opts || {};
  for (let x = x0; x < x1; x += tile) {
    for (let z = z0; z < z1; z += tile) {
      const r = rng();
      let c = [base[0] + (r - 0.5) * 0.06, base[1] + (r - 0.5) * 0.08, base[2] + (r - 0.5) * 0.05, 0];
      const cx = x + tile / 2, cz = z + tile / 2;
      if (opts.path && Math.abs(cx - opts.path.x) < opts.path.w) c = [0.55, 0.45, 0.30, 0];
      if (opts.pond) { const d = Math.hypot(cx - opts.pond.x, cz - opts.pond.z); if (d < opts.pond.r) continue; }
      M.quad([x, 0, z], [x, 0, z + tile], [x + tile, 0, z + tile], [x + tile, 0, z], c);
    }
  }
}

// ---------------------------------------------------------------------------
// VILLAGE
// ---------------------------------------------------------------------------
export function buildVillage(renderer) {
  const M = new Mesh();
  const rng = mulberry(101);
  addGround(M, -30, -30, 30, 34, 3, [0.30, 0.55, 0.28], rng, { path: { x: 0, w: 3 } });
  // plaza stone
  for (let x = -6; x < 6; x += 3) for (let z = -6; z < 6; z += 3)
    M.quad([x, 0.02, z], [x, 0.02, z + 3], [x + 3, 0.02, z + 3], [x + 3, 0.02, z], [0.62, 0.60, 0.55, 0]);

  const colliders = [];
  const box = (x0, z0, x1, z1) => colliders.push({ x0, z0, x1, z1 });

  // houses around plaza
  const houses = [
    [-14, -12, 8, 7, 4, [0.80, 0.68, 0.50], [0.55, 0.25, 0.20]],
    [14, -10, 8, 7, 4.5, [0.75, 0.62, 0.45], [0.45, 0.30, 0.22]],
    [-15, 12, 9, 8, 5, [0.82, 0.70, 0.52], [0.50, 0.28, 0.20]],
    [15, 14, 9, 7, 4.5, [0.78, 0.64, 0.46], [0.48, 0.26, 0.20]],
  ];
  for (const h of houses) {
    addHouse(M, h[0], h[1], h[2], h[3], h[4], h[5], h[6]);
    box(h[0] - h[2] / 2, h[1] - h[3] / 2, h[0] + h[2] / 2, h[1] + h[3] / 2);
  }
  // Shop (distinct blue roof, front counter)
  addHouse(M, 0, 22, 11, 8, 5, [0.62, 0.72, 0.85], [0.20, 0.35, 0.55]);
  box(-5.5, 18, 5.5, 26);
  // shop sign banner
  M.box(-3, 4.6, 17.7, 3, 5.4, 17.9, [0.9, 0.85, 0.4, 0.5]);

  // trees & bushes ring
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, r = 25 + rng() * 3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r + 2;
    if (Math.abs(x) < 3 && z > 20) continue;
    addTree(M, x, z, 0.9 + rng() * 0.3, rng);
    colliders.push({ cx: x, cz: z, r: 0.6 });
  }
  addBush(M, -8, 2, 1); addBush(M, 8, 3, 1.1); addBush(M, 6, -4, 0.9);

  // well in plaza
  M.cyl(0, 0, 1.2, 0, 1.0, 10, [0.5, 0.5, 0.52, 0], false);
  M.cyl(0, 0, 1.0, 0, 0.9, 10, [0.15, 0.18, 0.25, 0], false);
  colliders.push({ cx: 0, cz: 0, r: 1.3 });

  // perimeter fence-ish colliders (soft box ring)
  box(-32, -30, 32, -28); box(-32, 32, 32, 34);
  box(-32, -30, -28, 34); box(28, -30, 32, 34);

  const handle = renderer.uploadMesh(M);

  return {
    name: 'village', light: LIGHTS.village, handle, colliders,
    spawns: { start: { x: 0, z: 6, yaw: Math.PI / 2 }, fromField: { x: 0, z: 30, yaw: -Math.PI / 2 } },
    triggers: [{ x0: -3, z0: 33, x1: 3, z1: 36, to: 'field', spawn: 'fromVillage' }],
    torches: [{ x: -3, z: 3, }, { x: 3, z: 3 }, { x: -3, z: -3 }, { x: 3, z: -3 }],
    npcs: [
      { id: 'elder', x: 0, z: 10, yaw: Math.PI / 2, color: [0.7, 0.65, 0.9], name: 'Elder Moore',
        lines: ['Moore! The village relic, the Ocarina Gem, was stolen by the beast Gohma-Moore!',
                'It lurks in the Deku Dungeon north across the field.',
                'Take my blade. Press Z to lock on, then circle and strike. Bring the Gem home!'] },
      { id: 'kid', x: -6, z: -2, yaw: 0, color: [0.9, 0.7, 0.4], name: 'Village Kid',
        lines: ['Hold SHIFT to raise your shield!', 'Press X to roll out of danger!'] },
      { id: 'shopkeep', x: 0, z: 18.5, yaw: -Math.PI / 2, color: [0.4, 0.6, 0.85], name: 'Shopkeeper', shop: true,
        lines: ['Welcome! Spend your rupees on Hearts, Arrows and Bombs.'] },
    ],
    shop: [
      { item: 'heart', label: 'Refill Heart', cost: 10 },
      { item: 'arrows', label: '+5 Arrows', cost: 8 },
      { item: 'bombs', label: '+3 Bombs', cost: 12 },
      { item: 'maxheart', label: 'Heart Container', cost: 40 },
    ],
    signs: [{ x: 4, z: 30, text: 'North: Hyrule-Moore Field' }],
  };
}

// ---------------------------------------------------------------------------
// OVERWORLD FIELD
// ---------------------------------------------------------------------------
export function buildField(renderer) {
  const M = new Mesh();
  const rng = mulberry(202);
  const X0 = -50, X1 = 50, Z0 = -20, Z1 = 130;
  addGround(M, X0, Z0, X1, Z1, 4, [0.32, 0.58, 0.30], rng, { path: { x: 0, w: 4 }, pond: { x: -24, z: 60, r: 12 } });

  // pond water
  M.discUp(-24, 60, 12, 0.05, 20, [0.20, 0.42, 0.70, 0.15]);

  // low hills (visual mounds)
  for (const h of [[30, 30, 8, 2.5], [-34, 95, 10, 3], [36, 90, 9, 2.6], [20, 110, 7, 2]]) {
    M.sphere(h[0], -h[3] * 0.5, h[1], h[2], 3, 8, [0.30, 0.52, 0.28, 0]);
  }

  const colliders = [];
  const enemies = [];
  const pickups = [];

  // trees, rocks scattered (with colliders), avoiding the path
  for (let i = 0; i < 46; i++) {
    const x = X0 + 4 + rng() * (X1 - X0 - 8);
    const z = Z0 + 8 + rng() * (Z1 - Z0 - 16);
    if (Math.abs(x) < 5) continue;                       // keep path clear
    if (Math.hypot(x + 24, z - 60) < 15) continue;       // pond
    if (rng() < 0.62) { addTree(M, x, z, 0.8 + rng() * 0.5, rng); colliders.push({ cx: x, cz: z, r: 0.6 }); }
    else { addRock(M, x, z, 0.7 + rng() * 0.6); colliders.push({ cx: x, cz: z, r: 0.7 }); }
  }
  // rupees & hearts along the way
  const rup = [[6, 20, 'green'], [-8, 34, 'green'], [10, 48, 'blue'], [-12, 70, 'green'], [14, 84, 'blue'], [-6, 100, 'green'], [8, 116, 'red'], [-16, 48, 'green'], [18, 62, 'green']];
  for (const r of rup) pickups.push({ type: 'rupee', color: r[2], x: r[0], z: r[1] });
  pickups.push({ type: 'heart', x: -20, z: 40 }, { type: 'heart', x: 22, z: 100 });

  // roaming Moore-blins
  const spots = [[10, 42], [-14, 58], [16, 78], [-10, 94], [6, 108], [-22, 74]];
  for (const s of spots) enemies.push({ kind: 'blin', x: s[0], z: s[1] });

  // dungeon entrance structure at north
  const ex = 0, ez = 122;
  M.box(ex - 9, 0, ez - 3, ex + 9, 9, ez + 6, [0.34, 0.30, 0.34]);   // facade
  M.box(ex - 3.2, 0, ez - 3.4, ex + 3.2, 6.5, ez - 2.6, [0.06, 0.05, 0.07]); // doorway (dark)
  M.cone(ex, ez + 1, 11, 9, 15, 4, [0.26, 0.22, 0.26]);              // roof cap
  // torch pillars flanking the door
  for (const px of [ex - 5, ex + 5]) M.cyl(px, ez - 2, 0.5, 0, 4, 8, [0.4, 0.35, 0.3, 0], false);
  colliders.push({ x0: ex - 9, z0: ez - 3, x1: ex - 3.4, z1: ez + 6 });
  colliders.push({ x0: ex + 3.4, z0: ez - 3, x1: ex + 9, z1: ez + 6 });

  // a bombable cracked boulder hiding a secret cache (west)
  // (represented as dynamic object so it can be destroyed)
  // perimeter walls
  colliders.push({ x0: X0 - 2, z0: Z0 - 2, x1: X1 + 2, z1: Z0 }); // south
  colliders.push({ x0: X0 - 2, z0: Z0, x1: X0, z1: Z1 });         // west
  colliders.push({ x0: X1, z0: Z0, x1: X1 + 2, z1: Z1 });         // east
  colliders.push({ x0: X0 - 2, z0: ez + 6, x1: X1 + 2, z1: ez + 8 }); // north behind entrance

  const handle = renderer.uploadMesh(M);
  return {
    name: 'field', light: LIGHTS.field, handle, colliders, enemies, pickups,
    spawns: {
      fromVillage: { x: 0, z: -14, yaw: Math.PI / 2 },
      fromDungeon: { x: 0, z: 116, yaw: -Math.PI / 2 },
    },
    triggers: [
      { x0: -3, z0: Z0 - 3, x1: 3, z1: Z0, to: 'village', spawn: 'fromField' },
      { x0: ex - 3, z0: ez - 2.5, x1: ex + 3, z1: ez + 1, to: 'dungeon', spawn: 'entry' },
    ],
    cracked: [{ x: -32, z: 44, secret: true, drops: ['rupee', 'rupee', 'heart'] }],
    torches: [{ x: ex - 5, z: ez - 2 }, { x: ex + 5, z: ez - 2 }],
    signs: [{ x: 4, z: -12, text: 'South: Moore Village' }, { x: 5, z: 118, text: 'Deku Dungeon' }],
  };
}

// ---------------------------------------------------------------------------
// DUNGEON
// ---------------------------------------------------------------------------
// room helper: builds walls (mesh + colliders) with doorway gaps.
function room(M, colliders, b, doors, wc, h) {
  const T = 1.0; // wall thickness
  const flr = [0.20, 0.19, 0.24, 0];
  // floor
  for (let x = b.x0; x < b.x1; x += 4) for (let z = b.z0; z < b.z1; z += 4) {
    const c = ((x + z) & 4) ? [0.19, 0.18, 0.23, 0] : [0.16, 0.15, 0.20, 0];
    const xe = Math.min(x + 4, b.x1), ze = Math.min(z + 4, b.z1);
    M.quad([x, 0, z], [x, 0, ze], [xe, 0, ze], [xe, 0, z], c);
  }
  const seg = (x0, z0, x1, z1) => { M.box(x0, 0, z0, x1, h, z1, wc); colliders.push({ x0, z0, x1, z1 }); };
  const on = (side) => doors.filter(d => d.side === side);
  // For each side build wall minus gaps
  // South (z=b.z0) & North (z=b.z1): run along x
  for (const [zc, side] of [[b.z0, 'S'], [b.z1 - T, 'N']]) {
    const gaps = on(side).map(d => [d.p - d.w / 2, d.p + d.w / 2]).sort((a, c) => a[0] - c[0]);
    let x = b.x0;
    for (const g of gaps) { if (g[0] > x) seg(x, zc, g[0], zc + T); x = g[1]; }
    if (x < b.x1) seg(x, zc, b.x1, zc + T);
  }
  // West (x=b.x0) & East (x=b.x1): run along z
  for (const [xc, side] of [[b.x0, 'W'], [b.x1 - T, 'E']]) {
    const gaps = on(side).map(d => [d.p - d.w / 2, d.p + d.w / 2]).sort((a, c) => a[0] - c[0]);
    let z = b.z0;
    for (const g of gaps) { if (g[0] > z) seg(xc, z, xc + T, g[0]); z = g[1]; }
    if (z < b.z1) seg(xc, z, xc + T, b.z1);
  }
}

export function buildDungeon(renderer) {
  const M = new Mesh();
  const colliders = [];
  const wc = [0.26, 0.24, 0.30];
  const H = 6;

  // Room bounds (north = +z)
  const A = { x0: -9, z0: -9, x1: 9, z1: 9 };     // entry (block puzzle)
  const B = { x0: -9, z0: 17, x1: 9, z1: 35 };    // small-key room
  const C = { x0: -9, z0: 43, x1: 9, z1: 61 };    // bow room
  const D = { x0: 17, z0: 43, x1: 35, z1: 61 };   // boss-key room
  const BR = { x0: 13, z0: 70, x1: 39, z1: 98 };  // boss room
  // corridors (short connectors)
  const cAB = { x0: -3, z0: 9, x1: 3, z1: 17 };
  const cBC = { x0: -3, z0: 35, x1: 3, z1: 43 };
  const cCD = { x0: 9, z0: 49, x1: 17, z1: 55 };
  const cDBR = { x0: 22, z0: 61, x1: 30, z1: 70 };

  room(M, colliders, A, [{ side: 'S', p: 0, w: 5 }, { side: 'N', p: 0, w: 6 }], wc, H);
  room(M, colliders, B, [{ side: 'S', p: 0, w: 6 }, { side: 'N', p: 0, w: 6 }, { side: 'E', p: 26, w: 4 }], wc, H);
  room(M, colliders, C, [{ side: 'S', p: 0, w: 6 }, { side: 'E', p: 52, w: 6 }], wc, H);
  room(M, colliders, D, [{ side: 'W', p: 52, w: 6 }, { side: 'N', p: 26, w: 6 }], wc, H);
  room(M, colliders, BR, [{ side: 'S', p: 26, w: 6 }], wc, H);
  // corridor walls
  const corr = (c) => { M.box(c.x0 - 1, 0, c.z0, c.x0, H, c.z1, wc); M.box(c.x1, 0, c.z0, c.x1 + 1, H, c.z1, wc);
    colliders.push({ x0: c.x0 - 1, z0: c.z0, x1: c.x0, z1: c.z1 }, { x0: c.x1, z0: c.z0, x1: c.x1 + 1, z1: c.z1 });
    for (let x = c.x0; x < c.x1; x += 4) for (let z = c.z0; z < c.z1; z += 4)
      M.quad([x, 0, z], [x, 0, z + 4], [x + 4, 0, z + 4], [x + 4, 0, z], [0.17, 0.16, 0.21, 0]); };
  // horizontal corridor cCD runs along x
  M.box(cCD.x0, 0, cCD.z0 - 1, cCD.x1, H, cCD.z0, wc); M.box(cCD.x0, 0, cCD.z1, cCD.x1, H, cCD.z1 + 1, wc);
  colliders.push({ x0: cCD.x0, z0: cCD.z0 - 1, x1: cCD.x1, z1: cCD.z0 }, { x0: cCD.x0, z0: cCD.z1, x1: cCD.x1, z1: cCD.z1 + 1 });
  for (let x = cCD.x0; x < cCD.x1; x += 3) for (let z = cCD.z0; z < cCD.z1; z += 3)
    M.quad([x, 0, z], [x, 0, z + 3], [x + 3, 0, z + 3], [x + 3, 0, z], [0.17, 0.16, 0.21, 0]);
  corr(cAB); corr(cBC); corr(cDBR);

  // decorative wall pilasters/banners in boss room
  for (const px of [BR.x0 + 2, BR.x1 - 2]) M.box(px - 0.4, 0, BR.z1 - 1.2, px + 0.4, H, BR.z1 - 0.4, [0.20, 0.10, 0.12]);

  const handle = renderer.uploadMesh(M);

  return {
    name: 'dungeon', light: LIGHTS.dungeon, handle, colliders,
    rooms: { A, B, C, D, BR },
    spawns: { entry: { x: 0, z: -6, yaw: Math.PI / 2 }, boss: { x: 26, z: 66, yaw: Math.PI / 2 } },
    triggers: [{ x0: -3, z0: -12, x1: 3, z1: -9, to: 'field', spawn: 'fromDungeon' }],
    // dynamic objects:
    gates: [
      { id: 'G1', x: 0, z: 9.5, w: 6, axis: 'x', open: false, by: 'switchA' },      // block puzzle
      { id: 'G2', x: 9.5, z: 52, w: 6, axis: 'z', open: false, by: 'crystalC' },   // bow crystal
    ],
    blocks: [{ id: 'blk1', x: -4, z: 2, size: 1.4 }],
    switches: [{ id: 'switchA', x: 4, z: 4, r: 1.2, kind: 'floor', pressed: false, opens: 'G1' }],
    crystals: [{ id: 'crystalC', x: 8.4, y: 3.2, z: 58, r: 0.7, hit: false, opens: 'G2' }],
    lockedDoors: [{ id: 'LD1', x: 0, z: 35.5, axis: 'x', w: 6, locked: true }],
    bossDoor: { id: 'BD', x: 26, z: 61.5, axis: 'x', w: 6, locked: true },
    chests: [
      { id: 'chestKey', x: 0, z: 31, item: 'smallkey', opened: false, gated: 'G1' },
      { id: 'chestBow', x: 0, z: 57, item: 'bow', opened: false },
      { id: 'chestBoss', x: 26, z: 57, item: 'bosskey', opened: false, gated: 'G2' },
      { id: 'chestBomb', x: 7, z: 26, item: 'bombs', opened: false },
    ],
    cracked: [{ x: 8.6, z: 26, secret: true, drops: ['heart'] }],
    torches: [
      { x: -8, z: -8 }, { x: 8, z: -8 }, { x: -8, z: 34 }, { x: 8, z: 34 },
      { x: -8, z: 44 }, { x: 8, z: 60 }, { x: 18, z: 44 }, { x: 34, z: 60 },
      { x: 14, z: 71 }, { x: 38, z: 71 }, { x: 14, z: 97 }, { x: 38, z: 97 },
    ],
    enemies: [
      { kind: 'blin', x: -4, z: -4 }, { kind: 'blin', x: 4, z: 6 },
      { kind: 'blin', x: -5, z: 22 }, { kind: 'bat', x: 5, z: 28 },
      { kind: 'blin', x: -4, z: 50 }, { kind: 'bat', x: 4, z: 55 },
      { kind: 'blin', x: 22, z: 48 }, { kind: 'blin', x: 30, z: 55 }, { kind: 'bat', x: 26, z: 50 },
    ],
    boss: { x: 26, z: 86 },
    relic: { x: 26, z: 84 },
    signs: [{ x: 3, z: -7, text: 'Deku Dungeon - beware Gohma-Moore' }],
  };
}
