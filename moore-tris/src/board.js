// The playfield well: a 10x20 grid (with a couple hidden rows above for spawn),
// collision tests, piece locking, and line-clear detection.
import { PIECES } from './pieces.js';

export const COLS = 10;
export const ROWS = 20;
export const HIDDEN = 2; // extra rows above the visible top for spawning
export const TOTAL_ROWS = ROWS + HIDDEN;

export function createGrid() {
  const g = [];
  for (let y = 0; y < TOTAL_ROWS; y++) g.push(new Array(COLS).fill(null));
  return g;
}

// Returns the list of absolute [x, y] cells a piece occupies.
export function cellsOf(piece) {
  const state = PIECES[piece.type].states[piece.rot];
  const out = [];
  for (const [cx, cy] of state) out.push([piece.x + cx, piece.y + cy]);
  return out;
}

// True if the piece at its current position collides with walls, floor, or blocks.
export function collides(grid, piece) {
  for (const [x, y] of cellsOf(piece)) {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
    if (y >= 0 && grid[y][x]) return true;
  }
  return false;
}

// Stamp a piece's color into the grid permanently.
export function lockPiece(grid, piece) {
  const color = PIECES[piece.type].color;
  for (const [x, y] of cellsOf(piece)) {
    if (y >= 0 && y < TOTAL_ROWS && x >= 0 && x < COLS) grid[y][x] = color;
  }
}

// Find full rows (returns array of row indices, top-to-bottom).
export function fullRows(grid) {
  const rows = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (grid[y].every((c) => c !== null)) rows.push(y);
  }
  return rows;
}

// Remove the given rows and drop everything above down; returns new grid.
export function clearRows(grid, rows) {
  const remove = new Set(rows);
  const kept = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (!remove.has(y)) kept.push(grid[y]);
  }
  while (kept.length < TOTAL_ROWS) kept.unshift(new Array(COLS).fill(null));
  return kept;
}

// Drop the piece straight down as far as it can go; returns the landed y.
export function dropY(grid, piece) {
  const test = { ...piece };
  while (!collides(grid, { ...test, y: test.y + 1 })) test.y++;
  return test.y;
}
