export const TILE = 16;
export const ROWS = 15;

export const T = {
  EMPTY: 0, GROUND: 1, BRICK: 2, Q: 3, QM: 4, USED: 5, HARD: 6,
  PIPE_TL: 7, PIPE_TR: 8, PIPE_L: 9, PIPE_R: 10, POLE: 11, POLE_TOP: 12, COIN: 13,
  QS: 14, // looks like a brick, hides a star
};

export const SOLID = new Set([
  T.GROUND, T.BRICK, T.Q, T.QM, T.USED, T.HARD,
  T.PIPE_TL, T.PIPE_TR, T.PIPE_L, T.PIPE_R, T.QS,
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

function newLevel(width, name, theme) {
  const level = {
    width, name, theme,
    tiles: new Uint8Array(width * ROWS),
    spawns: [],
    decor: { hills: [], bushes: [], clouds: [] },
    flagX: 0,
    castleX: 0,
    playerStart: { x: 40, y: 176 },
    timeLimit: 400,
  };
  const set = (x, y, t) => setTile(level, x, y, t);
  return {
    level, set,
    ground: (a, b) => { for (let x = a; x <= b; x++) { set(x, 13, T.GROUND); set(x, 14, T.GROUND); } },
    pipe: (x, h) => {
      for (let y = 13 - h; y <= 12; y++) {
        if (y === 13 - h) { set(x, y, T.PIPE_TL); set(x + 1, y, T.PIPE_TR); }
        else { set(x, y, T.PIPE_L); set(x + 1, y, T.PIPE_R); }
      }
    },
    stair: (x, h) => { for (let i = 0; i < h; i++) set(x, 12 - i, T.HARD); },
    spawn: (type, tx) => level.spawns.push({ type, x: tx * TILE, y: 0 }),
  };
}

export function buildLevel1() {
  const { level, set, ground, pipe, stair, spawn } = newLevel(224, '1-1', 'overworld');
  level.flagX = 198;
  level.castleX = 204;

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
  set(100, 9, T.BRICK); set(101, 9, T.QS); // secret star brick
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
  for (let x = 0; x < level.width; x += 48) {
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

export function buildLevel2() {
  const { level, set, ground: groundRun, stair, spawn } = newLevel(184, '1-2', 'underground');
  level.flagX = 172;
  level.castleX = 177;

  // ceiling over the cave section
  for (let x = 5; x < 150; x++) set(x, 0, T.GROUND);

  // ---- terrain ----
  groundRun(0, 45);
  groundRun(48, 78);
  groundRun(82, 120);
  groundRun(124, 183);

  // ---- opening: coin shelf ----
  for (let x = 10; x <= 16; x++) { set(x, 9, T.BRICK); set(x, 8, T.COIN); }
  set(20, 9, T.Q); set(22, 9, T.QM);

  // step blocks
  stair(31, 2); stair(32, 3); stair(33, 4);

  // high shelf with coins
  for (let x = 38; x <= 43; x++) { set(x, 6, T.BRICK); set(x, 5, T.COIN); }

  // ---- after pit 1: star shelf ----
  for (let x = 52; x <= 56; x++) { set(x, 9, T.BRICK); set(x, 8, T.COIN); }
  set(58, 9, T.QS); // secret star brick
  stair(63, 2); stair(64, 2);
  for (let x = 68; x <= 71; x++) set(x, 5, T.BRICK);
  set(69, 9, T.Q); set(70, 9, T.Q);

  // ---- middle cave: brick pillars and coins ----
  for (let y = 10; y <= 12; y++) { set(86, y, T.BRICK); set(94, y, T.BRICK); }
  for (let y = 1; y <= 4; y++) { set(90, y, T.BRICK); }
  for (let x = 96; x <= 100; x++) set(x, 9, T.COIN);
  set(103, 8, T.Q); set(105, 8, T.QM);
  stair(112, 2); stair(113, 3); stair(114, 4); stair(115, 4);

  // ---- after pit 3: run to the exit ----
  set(128, 9, T.BRICK); set(129, 9, T.Q); set(130, 9, T.BRICK);
  for (let x = 136; x <= 139; x++) set(x, 9, T.COIN);

  // exit cavern opens up: final staircase & flag
  for (let i = 0; i < 8; i++) stair(155 + i, i + 1);
  stair(163, 8);
  stair(172, 1);
  for (let y = 3; y <= 11; y++) set(172, y, T.POLE);
  set(172, 2, T.POLE_TOP);

  // ---- enemies (denser than 1-1) ----
  spawn('goomba', 26);
  spawn('goomba', 36); spawn('goomba', 38);
  spawn('koopa', 44);
  spawn('goomba', 60); spawn('goomba', 62);
  spawn('koopa', 74);
  spawn('goomba', 89); spawn('goomba', 91);
  spawn('goomba', 101); spawn('goomba', 103); spawn('goomba', 105);
  spawn('koopa', 117);
  spawn('goomba', 131); spawn('goomba', 133);
  spawn('goomba', 143); spawn('goomba', 145);
  level.spawns.sort((a2, b2) => a2.x - b2.x);

  // sparse decorations only where the cave opens to the sky
  level.decor.clouds.push({ x: 154, y: 2, w: 2 }, { x: 166, y: 3, w: 1 });
  level.decor.bushes.push({ x: 167, w: 2 });

  return level;
}

export const LEVELS = [buildLevel1, buildLevel2];
export const LEVEL_NAMES = ['1-1', '1-2'];
