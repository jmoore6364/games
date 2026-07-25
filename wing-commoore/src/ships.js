// ships.js — procedural ship models and enemy fighter AI.
import { V, makeBasis, rotAxis, reortho } from './render3d.js';

// A Kilrathi-Moore "Dralthi"-style fighter model. Local space: +z forward, +y up, +x right.
export function makeFighterModel(base = '#c8342a', accent = '#7a1710', cockpit = '#ffd27a') {
  const verts = [
    { x: 0, y: 0, z: 3.4 },      // 0 nose
    { x: -0.9, y: 0.25, z: 0.4 }, // 1 body top-left
    { x: 0.9, y: 0.25, z: 0.4 },  // 2 body top-right
    { x: -0.9, y: -0.35, z: 0.2 },// 3 body bot-left
    { x: 0.9, y: -0.35, z: 0.2 }, // 4 body bot-right
    { x: -3.2, y: -0.05, z: -0.6 },// 5 wing tip L
    { x: 3.2, y: -0.05, z: -0.6 }, // 6 wing tip R
    { x: -0.7, y: 0.1, z: -1.9 },  // 7 tail-left
    { x: 0.7, y: 0.1, z: -1.9 },   // 8 tail-right
    { x: 0, y: 0.55, z: -0.2 },    // 9 canopy top
    { x: 0, y: 0.7, z: -1.6 },     // 10 fin top
    { x: 0, y: -0.1, z: -2.0 },    // 11 tail center (engine)
  ];
  const faces = [
    // nose / hull top
    { i: [0, 2, 9], c: base, s: 1.05, two: true },
    { i: [0, 9, 1], c: base, s: 1.05, two: true },
    // canopy
    { i: [1, 9, 2], c: cockpit, s: 1.2, two: true, line: 'rgba(20,10,10,0.6)' },
    // nose sides bottom
    { i: [0, 4, 2], c: base, s: 0.9, two: true },
    { i: [0, 1, 3], c: base, s: 0.9, two: true },
    { i: [0, 3, 4], c: accent, s: 0.8, two: true },
    // wings (the signature Dralthi crescent) — top & bottom
    { i: [2, 6, 4], c: base, s: 1.0, two: true },
    { i: [1, 3, 5], c: base, s: 1.0, two: true },
    { i: [2, 4, 6], c: accent, s: 0.75, two: true },
    { i: [1, 5, 3], c: accent, s: 0.75, two: true },
    // rear body
    { i: [1, 9, 10, 7], c: base, s: 0.85, two: true },
    { i: [2, 8, 10, 9], c: base, s: 0.85, two: true },
    { i: [3, 7, 11], c: accent, s: 0.7, two: true },
    { i: [4, 11, 8], c: accent, s: 0.7, two: true },
    // engine block
    { i: [7, 8, 11], c: '#ffae52', s: 1.15, two: true },
    { i: [7, 10, 8], c: accent, s: 0.8, two: true },
  ];
  return { verts, faces, scale: 1, engine: verts[11] };
}

// A capital-ship / mothership silhouette (used for warp-in flavor, optional).
export function makeCruiserModel() {
  const verts = [
    { x: 0, y: 0, z: 8 }, { x: -3, y: 2, z: 2 }, { x: 3, y: 2, z: 2 },
    { x: -3, y: -2, z: 2 }, { x: 3, y: -2, z: 2 }, { x: -3, y: 2, z: -8 },
    { x: 3, y: 2, z: -8 }, { x: -3, y: -2, z: -8 }, { x: 3, y: -2, z: -8 },
  ];
  const c = '#4a5570', a = '#2c3346';
  const faces = [
    { i: [0, 2, 1], c, s: 1, two: true }, { i: [0, 3, 4], c: a, s: 0.8, two: true },
    { i: [1, 2, 6, 5], c, s: 1.05, two: true }, { i: [3, 7, 8, 4], c: a, s: 0.7, two: true },
    { i: [1, 5, 7, 3], c, s: 0.85, two: true }, { i: [2, 4, 8, 6], c, s: 0.85, two: true },
    { i: [5, 6, 8, 7], c: '#ff9a3a', s: 1.2, two: true },
  ];
  return { verts, faces, scale: 1 };
}

let ENEMY_ID = 1;
export function spawnEnemy(pos, opts = {}) {
  const ori = makeBasis();
  const e = {
    id: ENEMY_ID++,
    kind: 'fighter',
    name: opts.name || 'DRALTHMOORE',
    pos: V.clone(pos),
    ori,
    vel: { x: 0, y: 0, z: 0 },
    speed: opts.speed || 34,
    maxTurn: opts.maxTurn || 1.1,
    shield: opts.shield ?? 40,
    shieldMax: opts.shield ?? 40,
    hull: opts.hull ?? 55,
    hullMax: opts.hull ?? 55,
    radius: 3.4,
    model: opts.model || makeFighterModel(),
    fireCd: 0.4 + Math.random() * 0.8,
    thinkCd: 0,
    state: 'approach',
    stateCd: 0,
    jink: { x: 0, y: 0 },
    warp: 1.0, // 1 = warping in (grows), 0 = fully materialised
    dead: false,
    exploding: 0,
  };
  return e;
}

// Enemy AI update. Returns {shoot:bool, dir:vec} when it decides to fire.
export function updateEnemy(e, dt, player, rng = Math.random) {
  if (e.warp > 0) {
    e.warp = Math.max(0, e.warp - dt * 0.8);
  }
  const toP = V.sub(player.pos, e.pos);
  const dist = V.len(toP);
  const dir = V.norm(toP);

  e.thinkCd -= dt;
  e.stateCd -= dt;
  // --- state selection: give the dogfight a rhythm so the player can shake them ---
  if (e.state === 'breakoff') {
    // committed to extending away — only re-engage once we've opened the range
    if (e.stateCd <= 0 || dist > 320) { e.state = 'approach'; e.stateCd = 0; }
  } else if (e.stateCd <= 0) {
    if (dist > 260) {
      e.state = 'approach';
      e.stateCd = 1.4 + rng() * 1.2;
    } else if (dist < 70) {
      // too close / just made a pass: break off and extend so the player gets room
      e.state = 'breakoff';
      e.stateCd = 1.8 + rng() * 1.6;
      e.jink = { x: (rng() * 2 - 1), y: (rng() * 2 - 1) };
    } else {
      e.state = rng() < 0.55 ? 'attack' : 'evade';
      e.stateCd = 1.0 + rng() * 1.3;
      e.jink = { x: (rng() * 2 - 1), y: (rng() * 2 - 1) };
    }
  }

  // desired facing
  let desired;
  if (e.state === 'breakoff') {
    // fly AWAY from the player, angled off to one side (a real disengagement)
    const away = V.scale(dir, -1);
    const side = V.add(V.scale(e.ori.right, e.jink.x), V.scale(e.ori.up, e.jink.y));
    desired = V.norm(V.add(away, V.scale(side, 0.6)));
  } else if (e.state === 'evade') {
    // veer off to the side while staying near
    const side = V.add(V.scale(e.ori.right, e.jink.x), V.scale(e.ori.up, e.jink.y));
    desired = V.norm(V.add(dir, V.scale(side, 1.5)));
  } else {
    // aim at player with a little wobble
    const wob = V.add(V.scale(e.ori.right, e.jink.x * 0.22), V.scale(e.ori.up, e.jink.y * 0.22));
    desired = V.norm(V.add(dir, wob));
  }

  // steer orientation toward desired — turn slower while breaking off so it truly opens the range
  const turnRate = e.state === 'breakoff' ? e.maxTurn * 0.5 : e.maxTurn;
  turnToward(e.ori, desired, turnRate * dt);

  // throttle: run hard on the break-off, ease off when right on top of the player
  let spd = e.speed;
  if (e.state === 'breakoff') spd = e.speed * 1.3;
  else if (e.state === 'evade') spd = e.speed * 1.12;
  else if (dist < 50) spd = e.speed * 0.55;
  const tvel = V.scale(e.ori.fwd, spd);
  e.vel.x += (tvel.x - e.vel.x) * Math.min(1, dt * 2);
  e.vel.y += (tvel.y - e.vel.y) * Math.min(1, dt * 2);
  e.vel.z += (tvel.z - e.vel.z) * Math.min(1, dt * 2);
  if (e.warp <= 0) {
    e.pos.x += e.vel.x * dt;
    e.pos.y += e.vel.y * dt;
    e.pos.z += e.vel.z * dt;
  }

  // shooting: only when roughly facing player and in range
  let shoot = false;
  e.fireCd -= dt;
  const facing = V.dot(e.ori.fwd, dir);
  if (e.warp <= 0 && (e.state === 'attack' || e.state === 'approach') && facing > 0.99 && dist < 220 && dist > 28 && e.fireCd <= 0) {
    shoot = true;
    e.fireCd = 1.3 + rng() * 1.5;
  }
  return { shoot, dir: e.ori.fwd, dist, facing };
}

// Rotate a basis so its forward turns toward target dir by at most maxRad.
export function turnToward(ori, target, maxRad) {
  const f = ori.fwd;
  const d = Math.max(-1, Math.min(1, V.dot(f, target)));
  const ang = Math.acos(d);
  if (ang < 1e-4) return;
  let axis = V.cross(f, target);
  const al = V.len(axis);
  if (al < 1e-6) { axis = ori.up; } else { axis = V.scale(axis, 1 / al); }
  const t = Math.min(maxRad, ang);
  ori.fwd = rotAxis(ori.fwd, axis, t);
  ori.up = rotAxis(ori.up, axis, t);
  ori.right = rotAxis(ori.right, axis, t);
  reortho(ori);
}
