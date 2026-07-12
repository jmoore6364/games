export const TILE = 16;
export const ROWS = 15;

export const T = {
  EMPTY: 0, GROUND: 1, BRICK: 2, Q: 3, QM: 4, USED: 5, HARD: 6,
  PIPE_TL: 7, PIPE_TR: 8, PIPE_L: 9, PIPE_R: 10, POLE: 11, POLE_TOP: 12, COIN: 13,
};

export const SOLID = new Set([
  T.GROUND, T.BRICK, T.Q, T.QM, T.USED, T.HARD,
  T.PIPE_TL, T.PIPE_TR, T.PIPE_L, T.PIPE_R,
]);

export function tileAt(level, tx, ty) {
  if (tx < 0 || tx >= level.width) return T.HARD; // level edges are walls
  if (ty < 0 || ty >= ROWS) return T.EMPTY;       // open sky, open pits
  return level.tiles[ty * level.width + tx];
}

export function setTile(level, tx, ty, t) {
  if (tx >= 0 && tx < level.width && ty >= 0 && ty < ROWS) {
    level.tiles[ty * level.width + tx] = t;
  }
}

export function buildLevel() {
  const width = 224;
  const level = {
    width,
    tiles: new Uint8Array(width * ROWS),
    spawns: [],
    decor: { hills: [], bushes: [], clouds: [] },
    flagX: 198,
    castleX: 204,
    playerStart: { x: 40, y: 176 },
    timeLimit: 400,
  };

  const set = (x, y, t) => setTile(level, x, y, t);
  const ground = (a, b) => { for (let x = a; x <= b; x++) { set(x, 13, T.GROUND); set(x, 14, T.GROUND); } };
  const pipe = (x, h) => {
    for (let y = 13 - h; y <= 12; y++) {
      if (y === 13 - h) { set(x, y, T.PIPE_TL); set(x + 1, y, T.PIPE_TR); }
      else { set(x, y, T.PIPE_L); set(x + 1, y, T.PIPE_R); }
    }
  };
  const stair = (x, h) => { for (let i = 0; i < h; i++) set(x, 12 - i, T.HARD); };
  const spawn = (type, tx) => level.spawns.push({ type, x: tx * TILE, y: 0 });

  // ---- terrain: four ground runs with pits between ----
  ground(0, 68);
  ground(71, 85);
  ground(89, 152);
  ground(155, 223);

  // ---- opening stretch ----
  set(16, 9, T.Q);
  set(20, 9, T.BRICK); set(21, 9, T.QM); set(22, 9, T.BRICK); set(23, 9, T.Q); set(24, 9, T.BRICK);
  set(22, 5, T.Q);

  pipe(28, 2);
  pipe(38, 3);
  pipe(46, 4);
  pipe(57, 4);

  // coins over the tall pipes stretch
  set(50, 8, T.COIN); set(51, 8, T.COIN); set(52, 8, T.COIN);

  // ---- after first pit ----
  set(77, 9, T.BRICK); set(78, 9, T.QM); set(79, 9, T.BRICK);
  for (let x = 80, i = 0; i < 8; i++, x++) set(x, 5, T.BRICK);

  // ---- long middle stretch ----
  for (let x = 91; x <= 93; x++) set(x, 5, T.BRICK);
  set(94, 5, T.Q); set(94, 9, T.BRICK);
  set(100, 9, T.BRICK); set(101, 9, T.BRICK);
  set(100, 8, T.COIN); set(101, 8, T.COIN);

  set(106, 9, T.Q); set(109, 9, T.QM); set(112, 9, T.Q);
  set(109, 5, T.Q);

  set(118, 9, T.BRICK);
  for (let x = 121; x <= 123; x++) set(x, 5, T.BRICK);

  set(128, 5, T.BRICK); set(129, 5, T.Q); set(130, 5, T.Q); set(131, 5, T.BRICK);
  set(129, 9, T.BRICK); set(130, 9, T.BRICK);

  // ---- stair pyramids ----
  for (let i = 0; i < 4; i++) stair(134 + i, i + 1);
  for (let i = 0; i < 4; i++) stair(140 + i, 4 - i);
  for (let i = 0; i < 4; i++) stair(148 + i, i + 1);
  stair(152, 4);
  for (let i = 0; i < 4; i++) stair(155 + i, 4 - i);

  pipe(163, 2);
  set(168, 9, T.COIN); set(170, 9, T.COIN); set(172, 9, T.COIN);
  pipe(176, 2);

  // ---- final staircase & flag ----
  for (let i = 0; i < 8; i++) stair(181 + i, i + 1);
  stair(189, 8);

  stair(198, 1);
  for (let y = 3; y <= 11; y++) set(198, y, T.POLE);
  set(198, 2, T.POLE_TOP);

  // ---- enemies ----
  spawn('goomba', 22);
  spawn('goomba', 41);
  spawn('goomba', 52); spawn('goomba', 54);
  spawn('goomba', 81); spawn('goomba', 83);
  spawn('koopa', 99);
  spawn('goomba', 107); spawn('goomba', 109);
  spawn('goomba', 115); spawn('goomba', 116.5);
  spawn('goomba', 126); spawn('goomba', 128);
  spawn('goomba', 168); spawn('goomba', 170);
  level.spawns.sort((a, b) => a.x - b.x);

  // ---- background decorations (repeating like the classics) ----
  for (let x = 0; x < width; x += 48) {
    level.decor.hills.push({ x: x, big: true });
    level.decor.hills.push({ x: x + 16, big: false });
    level.decor.bushes.push({ x: x + 23, w: 3 });
    level.decor.bushes.push({ x: x + 41, w: 1 });
    level.decor.clouds.push({ x: x + 8, y: 3, w: 1 });
    level.decor.clouds.push({ x: x + 19, y: 2, w: 3 });
    level.decor.clouds.push({ x: x + 36, y: 3, w: 2 });
  }

  return level;
}
