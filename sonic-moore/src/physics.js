// Classic Sonic-style physics core: constants, pixel-solidity sensors,
// mode rotation helpers and the grounded/airborne movement steps.
//
// Conventions (screen coords, y grows DOWN):
//   angle θ (radians): 0 = flat floor, π/2 = right wall (running up it),
//   π = ceiling, 3π/2 = left wall. Increases as the player runs
//   counterclockwise around the inside of a loop moving right.
//   xsp = gsp*cos(θ), ysp = -gsp*sin(θ).
//   Surface normal (pointing into open air) N = (-sinθ, -cosθ).
//   Slope factor: gsp -= slp * sin(θ) each frame.

export const PHYS = {
  acc: 0.046875,        // ground acceleration
  dec: 0.5,             // deceleration (braking)
  frc: 0.046875,        // friction
  top: 6,               // top running speed
  slp: 0.125,           // slope factor while walking
  slpRollUp: 0.078125,  // slope factor rolling uphill
  slpRollDown: 0.3125,  // slope factor rolling downhill
  rollFrc: 0.0234375,   // rolling friction
  rollDec: 0.125,       // rolling deceleration
  minRoll: 1.03,        // min speed to start a roll
  unroll: 0.5,          // speed below which a roll ends
  air: 0.09375,         // air acceleration (2x ground)
  grv: 0.21875,         // gravity
  jmp: 6.5,             // jump force
  jmpCut: -4,           // released-early jump cap
  maxFall: 16,
  maxSpeed: 16,
  fall: 2.5,            // fall off walls/ceilings below this speed
  hlock: 30,            // control lock frames after slipping
  wr: 9,                // width radius (feet sensors)
  hr: 19,               // height radius standing
  hrBall: 14,           // height radius rolling/jumping
  pushr: 10,            // push (wall) radius
};

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// Scan directions: 0=down 1=right 2=up 3=left (matches mode index).
export const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

// Rotate a vector expressed in floor-mode space into mode m space.
// m: 0 floor, 1 right wall, 2 ceiling, 3 left wall.
export function rot(vx, vy, m) {
  switch (m & 3) {
    case 0: return [vx, vy];
    case 1: return [vy, -vx];
    case 2: return [-vx, -vy];
    default: return [-vy, vx];
  }
}

export function norm(a) {
  a %= TAU;
  return a < 0 ? a + TAU : a;
}

export function modeOf(angle) {
  return Math.round(norm(angle) / (Math.PI / 2)) & 3;
}

// ---------------------------------------------------------------------------
// Sensors against a level's pixel solidity.
// level must expose: solidAt(x, y, layerMask) -> bool, wPx, hPx.
// ---------------------------------------------------------------------------

// Cast from (x,y) along DIRS[dir]. Returns distance (in px) from the anchor
// to the first solid pixel: 0 means the anchor itself is solid & the surface
// is right here; negative means the anchor is buried that many px deep;
// positive means open gap of that many px. Also returns the surface pixel.
// If nothing found within max, dist = max + 1.
export function cast(level, layer, x, y, dir, max = 32) {
  x = Math.round(x); y = Math.round(y);
  const [dx, dy] = DIRS[dir];
  if (level.solidAt(x, y, layer)) {
    // regress until we exit the solid, surface = last solid pixel
    let px = x, py = y, d = 0;
    for (let i = 0; i < max; i++) {
      const nx = px - dx, ny = py - dy;
      if (!level.solidAt(nx, ny, layer)) return { dist: d, sx: px, sy: py };
      px = nx; py = ny; d--;
    }
    return { dist: -max, sx: px, sy: py };
  }
  let px = x, py = y;
  for (let i = 1; i <= max; i++) {
    px += dx; py += dy;
    if (level.solidAt(px, py, layer)) return { dist: i, sx: px, sy: py };
  }
  return { dist: max + 1, sx: 0, sy: 0 };
}

// Measure the surface angle at a found surface pixel, scanning along dir
// (the mode's "down"). Samples the surface height 4px to either side and
// derives the local tangent; returns an absolute angle in radians.
export function surfaceAngle(level, layer, sx, sy, dir) {
  const m = dir; // dir index == mode index
  const [ux, uy] = rot(1, 0, m);   // local "right along surface"
  const [dx, dy] = DIRS[dir];
  const sample = (off) => {
    // start 8px back (into open air) from the surface pixel, scan 16
    const ox = sx + ux * off - dx * 8;
    const oy = sy + uy * off - dy * 8;
    for (let i = 0; i <= 16; i++) {
      if (level.solidAt(Math.round(ox + dx * i), Math.round(oy + dy * i), layer)) return i;
    }
    return 8; // off a ledge: pretend flat
  };
  const dMinus = sample(-4);
  const dPlus = sample(4);
  let dh = dMinus - dPlus;
  if (dh > 12) dh = 12; else if (dh < -12) dh = -12;
  return norm(m * (Math.PI / 2) + Math.atan2(dh, 8));
}

// Ground sensor pair A/B for an actor standing at (x,y) with the given
// radii in mode m. Returns { dist, angle } for the closest surface, or null.
export function groundSense(level, layer, x, y, m, wr, hr, max = 32) {
  const [ax, ay] = rot(-wr, hr, m);
  const [bx, by] = rot(wr, hr, m);
  const A = cast(level, layer, x + ax, y + ay, m, max);
  const B = cast(level, layer, x + bx, y + by, m, max);
  const win = A.dist <= B.dist ? A : B;
  if (win.dist > max) return null;
  return { dist: win.dist, angle: surfaceAngle(level, layer, win.sx, win.sy, m), sx: win.sx, sy: win.sy };
}

// Push (wall) sensor from the actor center along world direction dir.
export function wallSense(level, layer, x, y, dir, max) {
  return cast(level, layer, x, y, dir, max);
}

// Decompose ground speed into world velocity.
export function velFromGsp(gsp, angle) {
  return [gsp * Math.cos(angle), -gsp * Math.sin(angle)];
}

// Landing: convert air velocity into ground speed per classic rules.
export function landGsp(xsp, ysp, angle) {
  const a = norm(angle);
  const deg = a / DEG;
  const flat = deg <= 23 || deg >= 337;
  const shallow = (deg > 23 && deg <= 45) || (deg >= 315 && deg < 337);
  if (flat) return xsp;
  const s = Math.sin(a);
  if (shallow) {
    return Math.abs(xsp) > Math.abs(ysp) ? xsp : ysp * 0.5 * -Math.sign(s);
  }
  return Math.abs(xsp) > Math.abs(ysp) ? xsp : ysp * -Math.sign(s);
}
