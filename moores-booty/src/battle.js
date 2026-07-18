// Moore's Booty — top-down real-time ship battle.
// Logic is headless-testable; rendering lives in main.js.
//
// Maneuver with the wind, fire broadsides (X) on a reload timer, wreck the
// enemy's sails/hull, close alongside and board (Z) to cut to a duel, or
// sink them and scoop the floating loot.

import { SHIP_CLASSES, windFactor, DIFFS } from './world.js';

export const ARENA_W = 640, ARENA_H = 448;
export const BOARD_DIST = 34;

function mkShip(x, y, a, classIdx, cannons, hull, sails) {
  const cls = SHIP_CLASSES[classIdx];
  return {
    x, y, a, classIdx,
    hull: hull ?? cls.hull, maxHull: cls.hull,
    sails: sails ?? 100,
    cannons: cannons ?? cls.cannons,
    reload: 0,
    spd: 0,
  };
}

// st: career state (for wind + diff), enemy: an AI ship record from world.js
export function createBattle(st, enemy) {
  const cls = SHIP_CLASSES[st.ship.classIdx];
  const b = {
    wind: st.wind,
    minWind: DIFFS[st.diff].minWind,
    p: mkShip(ARENA_W * 0.3, ARENA_H * 0.62, -Math.PI / 2, st.ship.classIdx, st.ship.cannons, st.ship.hull),
    e: mkShip(ARENA_W * 0.7, ARENA_H * 0.35, Math.PI / 2, enemy.classIdx),
    enemyType: enemy.type,
    enemyNation: enemy.nation,
    balls: [],
    splashes: [],
    loot: null,        // {x,y,taken} once enemy sinks
    phase: 'fight',    // fight | board | sunk | lost | escaped | looted
    t: 0,
    shake: 0,
    events: [],
  };
  if (enemy.type === 'nemesis') { b.e.hull = Math.round(b.e.hull * 1.3); b.e.maxHull = b.e.hull; }
  return b;
}

export function reloadTime(classIdx) {
  return 2.2 + classIdx * 0.35; // bigger ships roll slower broadsides
}

function fireBroadside(b, s, foe) {
  if (s.reload > 0) return false;
  s.reload = reloadTime(s.classIdx);
  const perSide = Math.max(1, Math.floor(s.cannons / 2));
  // fire from the side facing the foe
  const toFoe = Math.atan2(foe.y - s.y, foe.x - s.x);
  let side = Math.sin(toFoe - s.a) > 0 ? 1 : -1;
  const ba = s.a + side * Math.PI / 2;
  for (let i = 0; i < perSide; i++) {
    const off = (i - (perSide - 1) / 2) * 10;
    const sx = s.x + Math.cos(s.a) * off;
    const sy = s.y + Math.sin(s.a) * off;
    b.balls.push({
      x: sx, y: sy,
      vx: Math.cos(ba) * 190, vy: Math.sin(ba) * 190,
      t: 0.9, from: s,
    });
  }
  b.events.push('cannon');
  return true;
}

function damage(b, s, isPlayer) {
  s.hull -= 6 + Math.random() * 5;
  s.sails = Math.max(20, s.sails - (3 + Math.random() * 5));
  b.events.push(isPlayer ? 'hitP' : 'hitE');
  b.shake = 6;
}

export function shipSpeed(b, s) {
  const cls = SHIP_CLASSES[s.classIdx];
  return cls.speed * 0.9 * windFactor(s.a, b.wind, b.minWind) * (0.35 + 0.65 * s.sails / 100);
}

// inp: {left,right,up? (unused),fire,board}  dt seconds
export function stepBattle(b, inp, dt) {
  if (b.phase !== 'fight' && b.phase !== 'sunk') return b.phase;
  b.t += dt;
  b.events = [];
  if (b.shake > 0) b.shake = Math.max(0, b.shake - 30 * dt);
  const p = b.p, e = b.e;
  const pcls = SHIP_CLASSES[p.classIdx];

  // --- player ---
  if (inp.left) p.a -= pcls.turn * 0.55 * dt * Math.PI / 2;
  if (inp.right) p.a += pcls.turn * 0.55 * dt * Math.PI / 2;
  p.spd = shipSpeed(b, p);
  p.x += Math.cos(p.a) * p.spd * dt;
  p.y += Math.sin(p.a) * p.spd * dt;
  if (p.reload > 0) p.reload -= dt;
  if (inp.fire && b.phase === 'fight') fireBroadside(b, p, e);

  // escape off the arena edge
  if (p.x < -20 || p.x > ARENA_W + 20 || p.y < -20 || p.y > ARENA_H + 20) {
    if (b.phase === 'sunk' && b.loot && !b.loot.taken) { /* leaving loot behind */ }
    b.phase = b.phase === 'sunk' ? 'looted' : 'escaped';
    return b.phase;
  }

  const d = Math.hypot(p.x - e.x, p.y - e.y);

  if (b.phase === 'fight') {
    // --- enemy AI: seek broadside range, keep the wind ---
    const ecls = SHIP_CLASSES[e.classIdx];
    const toP = Math.atan2(p.y - e.y, p.x - e.x);
    let want;
    const fleeing = e.hull < e.maxHull * 0.25 && b.enemyType === 'merchant';
    if (fleeing) want = toP + Math.PI;
    else if (d > 150) want = toP;                        // close in
    else want = toP + Math.PI / 2;                        // circle for a broadside
    let da = want - e.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    e.a += Math.max(-ecls.turn * 0.5 * dt, Math.min(ecls.turn * 0.5 * dt, da));
    e.spd = shipSpeed(b, e);
    e.x += Math.cos(e.a) * e.spd * dt;
    e.y += Math.sin(e.a) * e.spd * dt;
    e.x = Math.max(16, Math.min(ARENA_W - 16, e.x));
    e.y = Math.max(16, Math.min(ARENA_H - 16, e.y));
    if (e.reload > 0) e.reload -= dt;
    // fire when roughly abeam
    if (!fleeing && d < 190 && e.reload <= 0) {
      const abeam = Math.abs(Math.sin(toP - e.a));
      if (abeam > 0.55) fireBroadside(b, e, p);
    }

    // --- boarding ---
    if (d < BOARD_DIST && inp.board) {
      b.phase = 'board';
      b.events.push('board');
      return b.phase;
    }
  } else if (b.phase === 'sunk' && b.loot && !b.loot.taken) {
    // scoop floating loot
    if (Math.hypot(p.x - b.loot.x, p.y - b.loot.y) < 26) {
      b.loot.taken = true;
      b.events.push('loot');
      b.phase = 'looted';
      return b.phase;
    }
  }

  // --- cannonballs ---
  for (const ball of b.balls) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.t -= dt;
    const tgt = ball.from === p ? e : p;
    if (b.phase === 'fight' && Math.hypot(ball.x - tgt.x, ball.y - tgt.y) < 15) {
      ball.t = 0;
      damage(b, tgt, tgt === p);
    } else if (ball.t <= 0) {
      b.splashes.push({ x: ball.x, y: ball.y, t: 0.5 });
      b.events.push('splash');
    }
  }
  b.balls = b.balls.filter((x) => x.t > 0);
  for (const sp of b.splashes) sp.t -= dt;
  b.splashes = b.splashes.filter((x) => x.t > 0);

  // --- outcomes ---
  if (b.phase === 'fight') {
    if (e.hull <= 0) {
      b.phase = 'sunk';
      b.loot = { x: e.x, y: e.y, taken: false };
      b.events.push('sink');
    } else if (p.hull <= 0) {
      b.phase = 'lost';
      b.events.push('sink');
    }
  }
  return b.phase;
}

export function boardable(b) {
  return b.phase === 'fight' && Math.hypot(b.p.x - b.e.x, b.p.y - b.e.y) < BOARD_DIST;
}
