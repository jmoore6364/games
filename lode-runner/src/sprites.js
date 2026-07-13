// Hand-authored string-grid pixel art rendered to offscreen canvases,
// plus procedural tile painters. Tiles are 24px; sprites are 12x12 grids.

export const TILE = 24;
const PX = TILE / 12;

const FRAMES = {
  stand: [
    '....111.....',
    '....111.....',
    '.....3......',
    '...11111....',
    '..2.111.2...',
    '..2.111.2...',
    '....111.....',
    '...21112....',
    '...1...1....',
    '...1...1....',
    '...1...1....',
    '..22...22...',
  ],
  run0: [
    '....111.....',
    '....111.....',
    '.....3......',
    '..111111....',
    '.2..111.2...',
    '....111.....',
    '....1112....',
    '...11.11....',
    '..11...11...',
    '..1.....1...',
    '.22......1..',
    '.........22.',
  ],
  run1: [
    '....111.....',
    '....111.....',
    '.....3......',
    '...11111....',
    '...2111.2...',
    '....111.....',
    '....112.....',
    '....11......',
    '....11......',
    '...1.1......',
    '...1.1......',
    '..22.22.....',
  ],
  climb0: [
    '.1..111.....',
    '.1..111.....',
    '.1...3......',
    '.111111.....',
    '....111.1...',
    '....111.1...',
    '....111.....',
    '...21112....',
    '...1...1....',
    '...1..11....',
    '...1........',
    '..22........',
  ],
  climb1: [
    '....111..1..',
    '....111..1..',
    '.....3...1..',
    '....11111...',
    '.1.111......',
    '.1.111......',
    '....111.....',
    '...21112....',
    '...1...1....',
    '...11..1....',
    '.......1....',
    '......22....',
  ],
  hang0: [
    '.11.....11..',
    '.1.......1..',
    '.11111111...',
    '....111.....',
    '....111.....',
    '.....3......',
    '...1111.....',
    '...1111.....',
    '...2112.....',
    '...1..1.....',
    '...1..1.....',
    '...2..2.....',
  ],
  hang1: [
    '.11.....11..',
    '.1.......1..',
    '.11111111...',
    '....111.....',
    '....111.....',
    '.....3......',
    '...1111.....',
    '...1111.....',
    '...2112.....',
    '...1.1......',
    '..11..1.....',
    '......22....',
  ],
  fall: [
    '.1...111..1.',
    '.1...111..1.',
    '.11...3..11.',
    '..111111....',
    '....111.....',
    '....111.....',
    '...21112....',
    '...11..11...',
    '...1....1...',
    '..21....12..',
    '............',
    '............',
  ],
  dig: [
    '............',
    '....111.....',
    '....111.....',
    '.....3......',
    '..11111.....',
    '.2..111.....',
    '....111.1...',
    '...2111.1...',
    '...1..111...',
    '...1..1..2..',
    '...11....2..',
    '..22........',
  ],
};

const PLAYER_PAL = { 1: '#e8f4ff', 2: '#48a0ff', 3: '#ffd8a8' };
const GUARD_PAL = { 1: '#ff5a48', 2: '#8c1c10', 3: '#ffc890' };
const GOLD_GRID = [
  '............',
  '............',
  '............',
  '............',
  '.....11.....',
  '....1331....',
  '...113311...',
  '..11133111..',
  '.1111111111.',
  '.2222222222.',
  '............',
  '............',
];
const GOLD_PAL = { 1: '#ffd020', 2: '#a06810', 3: '#fff8c0' };

function bake(grid, pal) {
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const g = c.getContext('2d');
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) { g.fillStyle = col; g.fillRect(x * PX, y * PX, PX, PX); }
    }
  });
  return c;
}

export const sprites = { player: {}, guard: {}, gold: null };
for (const [name, grid] of Object.entries(FRAMES)) {
  sprites.player[name] = bake(grid, PLAYER_PAL);
  sprites.guard[name] = bake(grid, GUARD_PAL);
}
sprites.gold = bake(GOLD_GRID, GOLD_PAL);

export function drawSprite(ctx, img, x, y, flip) {
  if (!flip) { ctx.drawImage(img, x, y); return; }
  ctx.save();
  ctx.translate(x + TILE, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

// ---- tile painters (drawn once per frame straight to the board) ----

export function drawBrick(g, x, y) {
  g.fillStyle = '#a83820';
  g.fillRect(x, y, TILE, TILE);
  g.fillStyle = '#701c0c';
  g.fillRect(x, y + 10, TILE, 2);
  g.fillRect(x, y + 22, TILE, 2);
  g.fillRect(x + 11, y, 2, 10);
  g.fillRect(x + 5, y + 12, 2, 10);
  g.fillRect(x + 17, y + 12, 2, 10);
  g.fillStyle = '#c85838';
  g.fillRect(x, y, TILE, 2);
}

export function drawSolid(g, x, y) {
  g.fillStyle = '#687080';
  g.fillRect(x, y, TILE, TILE);
  g.fillStyle = '#8a94a8';
  g.fillRect(x, y, TILE, 3);
  g.fillRect(x, y, 3, TILE);
  g.fillStyle = '#454c5c';
  g.fillRect(x, y + TILE - 3, TILE, 3);
  g.fillRect(x + TILE - 3, y, 3, TILE);
}

export function drawLadder(g, x, y, gold) {
  g.fillStyle = gold ? '#f0d060' : '#c8d0dc';
  g.fillRect(x + 4, y, 3, TILE);
  g.fillRect(x + 17, y, 3, TILE);
  for (let ry = 3; ry < TILE; ry += 7) g.fillRect(x + 4, y + ry, 16, 2);
}

export function drawRope(g, x, y) {
  g.fillStyle = '#c8c0a8';
  g.fillRect(x, y + 4, TILE, 2);
}

// hole lifecycle: phase 'opening' (crumble down), 'open', 'closing' (flicker back)
export function drawHole(g, x, y, phase, k) {
  g.fillStyle = '#000';
  g.fillRect(x, y, TILE, TILE);
  if (phase === 'opening') {
    g.save();
    g.beginPath();
    g.rect(x, y + TILE * k, TILE, TILE * (1 - k));
    g.clip();
    drawBrick(g, x, y);
    g.restore();
  } else if (phase === 'closing' && (k * 14 | 0) % 2 === 0) {
    g.globalAlpha = 0.55;
    drawBrick(g, x, y);
    g.globalAlpha = 1;
  }
}
