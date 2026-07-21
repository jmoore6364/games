// physics.js — heightfield ball roller for Marble Mooreness.
//
// Pure logic, zero DOM: importable in Node for headless tests. Models a marble
// on an isometric heightmap with momentum, rolling friction, slope force,
// gravity for falls, edge/void plummets, wall bounce, and surface effects.
//
// World units are TILES on the (x,y) ground plane; z is HEIGHT in the same
// units (1 height level = 1 unit). The renderer maps this to iso pixels.

// ---- surface type codes (shared with courses.js / sprites.js) ----
export const TYPE = {
  VOID: 0,   // no floor — roll onto it and you plummet
  FLOOR: 1,  // normal rolling surface
  RAMP: 2,   // sloped surface (height does the real work; drawn as a ramp)
  WALL: 3,   // solid rail — blocks and bounces the marble
  ACID: 4,   // acid/slime pool — dissolves the marble (splat, respawn)
  ICE: 5,    // low friction, keeps rolling
  SLIME: 6,  // high friction goo, slows you to a crawl
  JUMP: 7,   // launch pad — fling into the air if crossed with speed
  ARROW: 8,  // directional booster / suction wave (uses course.forces)
  GOAL: 9,   // finish surface
  START: 10, // start pad
  CHECK: 11, // checkpoint pad
};

// ---- tunable arcade constants (one place to tune the FEEL) ----
export const PHYS = {
  ACCEL: 0.0110,     // input acceleration (tiles/step^2)
  AIR_ACCEL: 0.0022, // reduced control while airborne
  SLOPE: 0.0165,     // downhill pull per unit gradient — the satisfying rush
  GRAV: 0.055,       // gravity for falls / airborne z (tiles/step^2)
  MAXSPD: 0.52,      // horizontal speed cap (tiles/step)
  SNAP: 0.55,        // z within this of ground -> treated as rolling
  LAUNCH: 0.62,      // vz imparted by a JUMP pad
  LAUNCH_MIN: 0.14,  // min horizontal speed to trigger a JUMP pad
  RADIUS: 0.34,      // marble radius (tiles) for wall clearance
  FRICTION: {
    [TYPE.FLOOR]: 0.940,
    [TYPE.RAMP]: 0.952,
    [TYPE.GOAL]: 0.940,
    [TYPE.START]: 0.940,
    [TYPE.CHECK]: 0.940,
    [TYPE.ICE]: 0.990,
    [TYPE.SLIME]: 0.820,
    [TYPE.ARROW]: 0.945,
    [TYPE.JUMP]: 0.955,
  },
};

// ---- grid helpers ----
export function inBounds(c, cx, cy) {
  return cx >= 0 && cy >= 0 && cx < c.w && cy < c.h;
}
export function cellAt(c, cx, cy) {
  if (!inBounds(c, cx, cy)) return TYPE.VOID;
  return c.cells[cy * c.w + cx];
}
export function heightAtCell(c, cx, cy) {
  if (!inBounds(c, cx, cy)) return 0;
  return c.height[cy * c.w + cx];
}
export function isSolid(t) { return t !== TYPE.VOID; }
export function isWall(t) { return t === TYPE.WALL; }

// Bilinear height sample. Void corners inherit the base cell's height so the
// gradient stays sane right up to an edge (no infinite cliffs in the math).
export function sampleH(c, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const baseC = Math.round(x), baseR = Math.round(y);
  const base = heightAtCell(c, baseC, baseR);
  const H = (cx, cy) => (isSolid(cellAt(c, cx, cy)) ? heightAtCell(c, cx, cy) : base);
  const h00 = H(x0, y0), h10 = H(x0 + 1, y0), h01 = H(x0, y0 + 1), h11 = H(x0 + 1, y0 + 1);
  const a = h00 * (1 - fx) + h10 * fx;
  const b = h01 * (1 - fx) + h11 * fx;
  return a * (1 - fy) + b * fy;
}

// What is under the marble at (x,y)?
export function groundInfo(c, x, y) {
  const cx = Math.round(x), cy = Math.round(y);
  const t = cellAt(c, cx, cy);
  if (!isSolid(t) || t === TYPE.WALL) return { solid: false, type: t, cx, cy, h: -Infinity };
  return { solid: true, type: t, cx, cy, h: sampleH(c, x, y) };
}

export function makeMarble(x, y, z) {
  return { x, y, z: z == null ? 0 : z, vx: 0, vy: 0, vz: 0, spin: 0, air: false, dead: false };
}

// Advance one fixed step. `ax,ay` are the requested acceleration direction in
// WORLD axes (already resolved from screen input by the caller), each in
// roughly [-1,1]. Returns an events object the caller reacts to.
export function stepMarble(m, c, ax, ay) {
  const ev = { fell: false, splat: false, launched: false, land: 0, bump: false };

  const gi = groundInfo(c, m.x, m.y);
  const onGround = gi.solid && m.z <= gi.h + PHYS.SNAP;
  m.air = !onGround;

  if (onGround) {
    m.z = gi.h;
    if (m.vz < 0) m.vz = 0;

    // slope force: roll downhill, fight uphill
    const e = 0.5;
    const gradx = (sampleH(c, m.x + e, m.y) - sampleH(c, m.x - e, m.y)) / (2 * e);
    const grady = (sampleH(c, m.x, m.y + e) - sampleH(c, m.x, m.y - e)) / (2 * e);
    m.vx -= PHYS.SLOPE * gradx;
    m.vy -= PHYS.SLOPE * grady;

    // player input
    m.vx += ax * PHYS.ACCEL;
    m.vy += ay * PHYS.ACCEL;

    // directional force fields (arrows / suction waves)
    if (gi.type === TYPE.ARROW && c.forces) {
      const f = c.forces[gi.cy * c.w + gi.cx];
      if (f) { m.vx += f.fx; m.vy += f.fy; }
    }

    // surface friction
    const fr = PHYS.FRICTION[gi.type] ?? PHYS.FRICTION[TYPE.FLOOR];
    m.vx *= fr;
    m.vy *= fr;

    // launch pads
    if (gi.type === TYPE.JUMP && Math.hypot(m.vx, m.vy) > PHYS.LAUNCH_MIN) {
      m.vz = PHYS.LAUNCH;
      m.air = true;
      ev.launched = true;
    }

    // acid / slime pool dissolves the marble
    if (gi.type === TYPE.ACID) ev.splat = true;
  } else {
    m.vz -= PHYS.GRAV;
    m.vx += ax * PHYS.AIR_ACCEL;
    m.vy += ay * PHYS.AIR_ACCEL;
  }

  // horizontal speed cap
  const sp = Math.hypot(m.vx, m.vy);
  if (sp > PHYS.MAXSPD) { m.vx *= PHYS.MAXSPD / sp; m.vy *= PHYS.MAXSPD / sp; }

  // integrate x/y with axis-separated wall collision (bounces off rails)
  moveAxis(m, c, 'x', ev);
  moveAxis(m, c, 'y', ev);

  // integrate z, then land on ground below
  m.z += m.vz;
  const g2 = groundInfo(c, m.x, m.y);
  if (g2.solid && m.z <= g2.h) {
    if (m.vz < -0.22) ev.land = -m.vz;
    m.z = g2.h;
    m.vz = 0;
    if (g2.type === TYPE.ACID) ev.splat = true;
  }

  // spin bookkeeping for the rolling highlight
  m.spin += sp;

  // plummeted off the world
  if (m.z < c.killZ) ev.fell = true;

  return ev;
}

function moveAxis(m, c, axis, ev) {
  const v = axis === 'x' ? m.vx : m.vy;
  const old = m[axis];
  m[axis] = old + v;
  // sample the cell in front, offset by radius in the travel direction
  const rx = axis === 'x' ? Math.sign(v) * PHYS.RADIUS : 0;
  const ry = axis === 'y' ? Math.sign(v) * PHYS.RADIUS : 0;
  const t = cellAt(c, Math.round(m[axis] + (axis === 'x' ? rx : 0)), Math.round(m.y + (axis === 'y' ? ry : 0)));
  // resolve using the marble's leading edge only for the moving axis
  const cx = Math.round(m.x + rx), cy = Math.round(m.y + ry);
  if (isWall(cellAt(c, cx, cy))) {
    m[axis] = old;
    if (axis === 'x') m.vx *= -0.32; else m.vy *= -0.32;
    ev.bump = true;
  }
}

// Screen-relative input -> world acceleration. Classic Marble Madness scheme:
// the iso ground axes run diagonally, so "up" on the pad sends the marble up
// the screen (away, up the course), "down" sends it toward the camera.
//   world +x  -> screen down-right     world +y -> screen down-left
// up = (-x,-y), down = (+x,+y), left = (-x,+y), right = (+x,-y)
export function resolveAccel(up, down, left, right) {
  let sx = 0, sy = 0;
  if (up) sy -= 1;
  if (down) sy += 1;
  if (left) sx -= 1;
  if (right) sx += 1;
  return accelFromScreen(sx, sy);
}

// General analog mapping: a SCREEN-space intent vector (x right, y down) ->
// world acceleration on the iso ground plane. Magnitude is preserved (so a
// half-pushed stick accelerates gently), clamped to 1.
//   world +x -> screen (down-right)   world +y -> screen (down-left)
//   => wx = (sx+sy)/2 , wy = (sy-sx)/2
export function accelFromScreen(sx, sy) {
  let ax = (sx + sy) / 2;
  let ay = (sy - sx) / 2;
  const m = Math.hypot(ax, ay);
  if (m > 1e-6) {
    const clamp = Math.min(1, Math.hypot(sx, sy));
    ax = (ax / m) * clamp;
    ay = (ay / m) * clamp;
  }
  return { ax, ay };
}

// Reachability proof: BFS from start cell to goal cell, stepping to any
// non-void, non-wall neighbour whose height rises by at most `climb` (you can
// always roll DOWN any distance, but only roll UP small steps). Used by the
// headless test to assert every course is physically completable.
export function reachable(c, climb = 2.2, jumpSpan = 3) {
  const startC = Math.round(c.start.x), startR = Math.round(c.start.y);
  const goalC = c.goal.cx, goalR = c.goal.cy;
  const seen = new Uint8Array(c.w * c.h);
  const q = [[startC, startR]];
  seen[startR * c.w + startC] = 1;
  const N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const [x, y] = q.shift();
    if (Math.abs(x - goalC) <= 1 && Math.abs(y - goalR) <= 1) return true;
    const hHere = heightAtCell(c, x, y);
    const here = cellAt(c, x, y);
    for (const [dx, dy] of N) {
      const nx = x + dx, ny = y + dy;
      const t = cellAt(c, nx, ny);
      // walk to a solid, non-wall, climbable neighbour
      if (inBounds(c, nx, ny) && !seen[ny * c.w + nx] && t !== TYPE.VOID && t !== TYPE.WALL
          && heightAtCell(c, nx, ny) - hHere <= climb) {
        seen[ny * c.w + nx] = 1;
        q.push([nx, ny]);
      }
      // launch pad: fling straight over a void gap to the first landing
      if (here === TYPE.JUMP && t === TYPE.VOID) {
        for (let s = 2; s <= jumpSpan; s++) {
          const lx = x + dx * s, ly = y + dy * s;
          if (!inBounds(c, lx, ly)) break;
          const lt = cellAt(c, lx, ly);
          if (lt === TYPE.VOID) continue;
          if (lt !== TYPE.WALL && !seen[ly * c.w + lx]) { seen[ly * c.w + lx] = 1; q.push([lx, ly]); }
          break;
        }
      }
    }
  }
  return false;
}
