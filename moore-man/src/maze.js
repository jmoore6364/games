// maze.js — the Moore-Man board: static wall layout + per-level dot/pellet state.
//
// Legend used in the template:
//   #  wall
//   .  dot        (10 pts)
//   o  power pellet (50 pts)
//   =  ghost-house door (wall for Moore-Man, passable for ghosts/eyes)
//   (space) empty walkable path (tunnel mouths, ghost house interior, start cell)
//
// The board is 28 columns x 31 rows, classic Pac-Man proportions. The single
// horizontal corridor on row 14 wraps around the left/right edges (the tunnel).

export const TILE = 8;
export const COLS = 28;
export const ROWS = 31;

const TEMPLATE = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '######.##..........##.######',
  '######.##.###==###.##.######',
  '######.##.#      #.##.######',
  '      .##.#      #.##.      ',
  '######.##.#      #.##.######',
  '######.##.########.##.######',
  '######.##..........##.######',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##................##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

// Tunnel wrap row (the only row that connects to the left/right edges).
export const TUNNEL_ROW = 14;

// Ghost house geometry (tile coords).
export const HOUSE = {
  doorRow: 12,
  doorColL: 13,
  doorColR: 14,
  insideRowTop: 13,
  insideRowBot: 15,
  insideColL: 11,
  insideColR: 16,
  // Tile just above the door where ghosts emerge / scatter-anchor for regroup.
  exit: { c: 13.5, r: 11 },
  centerY: 14,
};

// Moore-Man's spawn (centered between cols 13 and 14 on the lower corridor).
export const PAC_START = { c: 13.5, r: 23 };

// Fruit bonus appears here (just below the ghost house).
export const FRUIT_TILE = { c: 13.5, r: 17 };

export function isWallChar(ch) { return ch === '#'; }

// Build a fresh, mutable level: a wall grid (static) plus a dots grid we mutate
// as Moore-Man eats. Returns { walls, doors, dots, totalDots }.
export function buildLevel() {
  const walls = [];
  const doors = [];
  const dots = []; // 0 none, 1 dot, 2 power pellet
  let totalDots = 0;
  for (let r = 0; r < ROWS; r++) {
    const wr = new Array(COLS).fill(false);
    const dr = new Array(COLS).fill(false);
    const dt = new Array(COLS).fill(0);
    const line = TEMPLATE[r];
    for (let c = 0; c < COLS; c++) {
      const ch = line[c] || ' ';
      if (ch === '#') wr[c] = true;
      else if (ch === '=') dr[c] = true;
      else if (ch === '.') { dt[c] = 1; totalDots++; }
      else if (ch === 'o') { dt[c] = 2; totalDots++; }
    }
    walls.push(wr);
    doors.push(dr);
    dots.push(dt);
  }
  return { walls, doors, dots, totalDots };
}

// True if tile (c,r) blocks movement. forGhost lets ghosts pass the house door.
// Out-of-range columns on the tunnel row are open (they wrap); elsewhere solid.
export function isBlocked(level, c, r, forGhost) {
  if (r < 0 || r >= ROWS) return true;
  if (c < 0 || c >= COLS) return r !== TUNNEL_ROW; // tunnel edges are open
  if (level.walls[r][c]) return true;
  if (level.doors[r][c]) return !forGhost; // door: solid for Moore-Man only
  return false;
}

// Normalize a column for tunnel wrap-around.
export function wrapCol(c) {
  if (c < 0) return COLS - 1;
  if (c >= COLS) return 0;
  return c;
}
