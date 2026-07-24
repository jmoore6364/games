// map.js — tile map level, built programmatically so dimensions & connectivity
// are guaranteed. Tile codes: 0 empty, 1 brick, 2 tech, 3 stone, 4 door, 5 exit.

export function buildLevel() {
  const W = 24, H = 24;
  const grid = new Array(W * H).fill(0);
  const set = (x, y, v) => { grid[y * W + x] = v; };
  const rect = (x0, y0, x1, y1, v) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v);
  };

  // border
  for (let x = 0; x < W; x++) { set(x, 0, 1); set(x, H - 1, 1); }
  for (let y = 0; y < H; y++) { set(0, y, 1); set(W - 1, y, 1); }

  // --- interior structure ---
  // pillars (2x2) scattered — keep open space around them
  rect(4, 4, 5, 5, 2);
  rect(4, 18, 5, 19, 3);
  rect(18, 12, 19, 13, 2);
  rect(11, 8, 12, 9, 3);

  // a partial dividing wall with a gap (creates two connected halves)
  rect(9, 3, 9, 8, 1);      // vertical wall segment
  rect(9, 11, 9, 16, 1);    // second segment, gap at rows 9-10
  rect(3, 14, 8, 14, 3);    // horizontal wall, connects to left area
  // (row 14 col 1-2 open -> passage)

  // central tech room walls (open doorways)
  rect(13, 16, 20, 16, 2);  // top wall of bottom-right room
  rect(13, 16, 13, 21, 2);  // left wall
  set(16, 16, 0);           // doorway gap into that room

  // --- EXIT room in top-right, sealed by a door ---
  // room occupies x 16..22, y 1..6
  rect(16, 1, 16, 6, 1);    // left wall
  rect(16, 6, 22, 6, 1);    // bottom wall
  set(16, 3, 4);            // DOOR entrance
  set(20, 2, 5);            // EXIT switch on far wall interior
  // (top & right of room are map border)

  // doors registry
  const doors = new Map(); // "x,y" -> { open:0, target:0, timer:0 }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y * W + x] === 4) doors.set(x + ',' + y, { open: 0, target: 0, timer: 0 });
  }

  const player = { x: 2.5, y: 2.5, dir: 0.35 }; // facing into the map

  const enemies = [
    { x: 7.5, y: 6.5 }, { x: 13.5, y: 4.5 }, { x: 6.5, y: 12.5 },
    { x: 15.5, y: 10.5 }, { x: 17.5, y: 19.5 }, { x: 11.5, y: 19.5 },
    { x: 20.5, y: 9.5 },
  ];

  const pickups = [
    { x: 3.5, y: 8.5, kind: 'health' },
    { x: 14.5, y: 13.5, kind: 'health' },
    { x: 21.5, y: 4.5, kind: 'health' },   // reward inside exit room
    { x: 6.5, y: 4.5, kind: 'ammo' },
    { x: 12.5, y: 5.5, kind: 'ammo' },
    { x: 7.5, y: 20.5, kind: 'ammo' },
    { x: 18.5, y: 18.5, kind: 'ammo' },
    { x: 21.5, y: 5.5, kind: 'ammo' },
  ];

  return { W, H, grid, doors, player, enemies, pickups };
}

// solid = blocks movement & rays (closed doors are solid)
export function isSolid(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.W || ty >= level.H) return true;
  const v = level.grid[ty * level.W + tx];
  if (v === 0) return false;
  if (v === 4) {
    const d = level.doors.get(tx + ',' + ty);
    return !(d && d.open > 0.85);
  }
  return true;
}

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.W || ty >= level.H) return 1;
  return level.grid[ty * level.W + tx];
}
