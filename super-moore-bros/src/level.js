export const TILE = 16;
export const ROWS = 15;

export const T = {
  EMPTY: 0, GROUND: 1, BRICK: 2, Q: 3, QM: 4, USED: 5, HARD: 6,
  PIPE_TL: 7, PIPE_TR: 8, PIPE_L: 9, PIPE_R: 10, POLE: 11, POLE_TOP: 12, COIN: 13,
  QS: 14, // looks like a brick, hides a star
  Q1: 15, // looks like a brick, hides a 1UP mushroom
  LAVA: 16, BRIDGE: 17, AXE: 18,
  QW: 19, // question block holding wings
  QI: 20, // question block holding an ice flower
};

export const SOLID = new Set([
  T.GROUND, T.BRICK, T.Q, T.QM, T.USED, T.HARD,
  T.PIPE_TL, T.PIPE_TR, T.PIPE_L, T.PIPE_R, T.QS, T.Q1, T.BRIDGE, T.QW, T.QI,
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
    piranha: (tx, h) => level.spawns.push({
      type: 'piranha', x: tx * TILE, y: 0, cx: tx * TILE + TILE, top: (13 - h) * TILE,
    }),
  };
}

export function buildLevel1() {
  const { level, set, ground, pipe, stair, spawn, piranha } = newLevel(224, '1-1', 'overworld');
  level.flagX = 198;
  level.castleX = 204;

  // ---- terrain: four ground runs with pits between ----
  ground(0, 68);
  ground(71, 85);
  ground(89, 152);
  ground(155, 223);

  // ---- opening stretch ----
  set(16, 9, T.Q);
  set(20, 9, T.BRICK); set(21, 9, T.QM); set(22, 9, T.BRICK); set(23, 9, T.Q); set(24, 9, T.Q1);
  set(22, 5, T.Q);

  pipe(28, 2);
  pipe(38, 3);
  pipe(46, 4);
  pipe(57, 4);
  piranha(46, 4);
  piranha(57, 4);

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
  piranha(176, 2);

  // ---- final staircase & flag ----
  for (let i = 0; i < 8; i++) stair(181 + i, i + 1);
  stair(189, 8);

  stair(198, 1);
  for (let y = 3; y <= 11; y++) set(198, y, T.POLE);
  set(198, 2, T.POLE_TOP);

  // ---- enemies ----
  spawn('goomba', 22);
  spawn('goomba', 34);
  spawn('goomba', 52); spawn('goomba', 54);
  spawn('goomba', 83); spawn('goomba', 85);
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
  set(52, 9, T.Q1); // secret 1UP
  for (let x = 53, i = 0; i < 4; i++, x++) { set(x, 9, T.BRICK); set(x, 8, T.COIN); }
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

export function buildLevel3() {
  const { level, set, ground, stair, spawn } = newLevel(200, '1-3', 'overworld');
  level.flagX = 181;
  level.castleX = 186;

  const plat = (a, b, y) => { for (let x = a; x <= b; x++) set(x, y, T.HARD); };
  const coins = (a, b, y) => { for (let x = a; x <= b; x++) set(x, y, T.COIN); };

  // ---- start and end are solid ground; everything between floats over the void ----
  ground(0, 15);
  ground(130, 199);

  plat(18, 22, 12);
  plat(25, 29, 11);  coins(25, 29, 9);
  plat(32, 36, 9);
  plat(39, 44, 11);
  plat(47, 51, 12);  set(49, 9, T.Q);
  plat(54, 58, 10);  coins(54, 58, 8);
  plat(61, 66, 10);
  plat(69, 73, 12);
  plat(76, 81, 11);  set(78, 8, T.QM);
  plat(84, 88, 9);   coins(84, 88, 7);
  plat(91, 96, 11);
  plat(99, 103, 12);  set(101, 9, T.Q1); // secret 1UP
  plat(106, 111, 10); coins(106, 111, 8);
  plat(114, 118, 11);
  plat(121, 126, 12);

  // ---- home stretch ----
  set(136, 9, T.Q); set(138, 9, T.QS); set(140, 9, T.Q);
  for (let i = 0; i < 8; i++) stair(165 + i, i + 1);
  stair(173, 8);
  stair(181, 1);
  for (let y = 3; y <= 11; y++) set(181, y, T.POLE);
  set(181, 2, T.POLE_TOP);

  // ---- enemies: red koopas hold the platforms, goombas roam the ground ----
  spawn('goomba', 8);
  spawn('koopared', 41);
  spawn('koopared', 63);
  spawn('goomba', 78);
  spawn('koopared', 93);
  spawn('koopared', 108);
  spawn('goomba', 139); spawn('goomba', 141);
  spawn('koopa', 148);
  spawn('goomba', 155); spawn('goomba', 157);
  level.spawns.sort((a, b) => a.x - b.x);

  for (let x = 0; x < level.width; x += 44) {
    level.decor.clouds.push({ x: x + 5, y: 2, w: 2 });
    level.decor.clouds.push({ x: x + 24, y: 4, w: 1 });
    level.decor.clouds.push({ x: x + 33, y: 1, w: 3 });
  }
  for (let x = 130; x < 195; x += 48) {
    level.decor.hills.push({ x, big: true });
    level.decor.bushes.push({ x: x + 12, w: 2 });
  }

  return level;
}

export function buildLevel4() {
  const { level, set, stair, spawn } = newLevel(168, '1-4', 'castle');
  level.timeLimit = 300;
  level.flagX = -1;      // no flagpole: the axe ends this one
  level.castleX = 164;   // walk-off target after the bridge falls

  const floor = (a, b) => { for (let x = a; x <= b; x++) { set(x, 13, T.GROUND); set(x, 14, T.GROUND); } };
  const lava = (a, b) => { for (let x = a; x <= b; x++) { set(x, 13, T.LAVA); set(x, 14, T.LAVA); } };
  const firebar = (tx, ty) => { set(tx, ty, T.HARD); level.spawns.push({ type: 'firebar', x: tx * TILE - 96, cx: tx * TILE + 8, cy: ty * TILE + 8 }); };

  // ceiling throughout
  for (let x = 0; x < 150; x++) set(x, 0, T.GROUND);

  // ---- entry hall ----
  floor(0, 30);
  firebar(18, 9);
  set(12, 9, T.Q); set(24, 9, T.QM);

  // ---- first lava crossing: stepping blocks ----
  lava(31, 38);
  set(33, 12, T.HARD); set(34, 12, T.HARD);
  set(36, 12, T.HARD); set(37, 12, T.HARD);
  floor(39, 58);
  firebar(46, 10);
  firebar(54, 8);
  set(50, 9, T.Q1); // secret 1UP before the midpoint

  // ---- low corridor over lava slots ----
  lava(59, 62);
  floor(63, 84);
  for (let x = 66; x <= 80; x++) set(x, 5, T.GROUND); // lowered ceiling shelf
  firebar(72, 9);
  set(76, 9, T.Q);

  // ---- lava lake with islands ----
  lava(85, 95);
  set(88, 11, T.HARD); set(89, 11, T.HARD);
  set(92, 11, T.HARD); set(93, 11, T.HARD);
  floor(96, 118);
  firebar(104, 9);
  firebar(112, 10);
  set(108, 9, T.QS); // star for the final gauntlet

  // ---- approach and boss bridge ----
  lava(119, 124);
  set(121, 11, T.HARD); set(122, 11, T.HARD);
  floor(125, 129);
  lava(130, 145);
  for (let x = 130; x <= 143; x++) set(x, 13, T.BRIDGE); // flush with the floor, lava below
  set(144, 12, T.AXE); set(144, 11, T.AXE);
  // wall behind the axe so nobody can leap past the trigger (open at axe height)
  for (let y = 1; y <= 10; y++) set(145, y, T.GROUND);
  level.bridge = { from: 130, to: 143, y: 13 };
  floor(146, 167);

  spawn('goomba', 42); spawn('goomba', 44);
  spawn('goomba', 101);
  spawn('boss', 138);
  level.spawns.sort((a, b) => a.x - b.x);

  return level;
}

// =================================================================
// MOORE WORLDS - the remix campaign: new themes, monsters, powers.
// =================================================================

export function buildR1() { // 2-1: moonlit run
  const { level, set, ground, pipe, stair, spawn, piranha } = newLevel(210, '2-1', 'night');
  level.flagX = 190;
  level.castleX = 196;

  ground(0, 60); ground(64, 100); ground(104, 150); ground(154, 209);

  set(14, 9, T.Q); set(16, 9, T.QW); set(18, 9, T.Q); // wings early: learn the double jump
  pipe(28, 3);
  set(34, 9, T.BRICK); set(35, 9, T.QM); set(36, 9, T.BRICK);
  for (let x = 42; x <= 46; x++) set(x, 5, T.BRICK);
  set(44, 9, T.Q);
  set(50, 8, T.COIN); set(52, 8, T.COIN); set(54, 8, T.COIN);

  pipe(70, 4); piranha(70, 4);
  set(78, 9, T.Q); set(80, 9, T.Q1); set(82, 9, T.Q);
  for (let x = 88; x <= 93; x++) { set(x, 6, T.HARD); set(x, 5, T.COIN); }

  set(110, 9, T.BRICK); set(111, 9, T.QS); set(112, 9, T.BRICK);
  pipe(120, 2);
  for (let x = 126; x <= 130; x++) set(x, 8, T.COIN);
  pipe(136, 4); piranha(136, 4);
  set(144, 9, T.QM);

  for (let i = 0; i < 7; i++) stair(164 + i, i + 1);
  stair(171, 7);
  stair(190, 1);
  for (let y = 3; y <= 11; y++) set(190, y, T.POLE);
  set(190, 2, T.POLE_TOP);

  spawn('fastgoomba', 31);
  spawn('hopper', 40);
  spawn('fastgoomba', 48); spawn('fastgoomba', 50);
  spawn('koopa', 58);
  spawn('fastgoomba', 90); spawn('fastgoomba', 92);
  spawn('hopper', 96);
  spawn('fastgoomba', 119);
  spawn('hopper', 127);
  spawn('fastgoomba', 150); spawn('fastgoomba', 152);
  spawn('koopa', 158);
  level.spawns.sort((a, b) => a.x - b.x);

  for (let x = 0; x < level.width; x += 48) {
    level.decor.hills.push({ x, big: true });
    level.decor.bushes.push({ x: x + 26, w: 2 });
    level.decor.clouds.push({ x: x + 12, y: 2, w: 2 });
  }
  return level;
}

export function buildR2() { // 2-2: frostbite fields (slippery!)
  const { level, set, ground, stair, spawn } = newLevel(200, '2-2', 'snow');
  level.friction = 0.35;
  level.flagX = 180;
  level.castleX = 186;

  ground(0, 40); ground(43, 88); ground(91, 130); ground(133, 199);

  set(14, 9, T.Q); set(16, 9, T.QI); set(18, 9, T.Q); // ice flower: freeze the spinies
  stair(26, 2); stair(27, 3);
  for (let x = 30; x <= 35; x++) set(x, 7, T.COIN);

  set(50, 9, T.BRICK); set(51, 9, T.QM); set(52, 9, T.BRICK);
  for (let x = 58; x <= 63; x++) { set(x, 6, T.HARD); set(x, 5, T.COIN); }
  set(70, 9, T.Q); set(72, 9, T.Q1);
  stair(80, 2); stair(81, 3); stair(82, 4);

  for (let x = 96; x <= 101; x++) set(x, 9, T.BRICK);
  set(98, 8, T.COIN); set(99, 8, T.COIN);
  set(108, 9, T.QS);
  stair(118, 2); stair(119, 3);
  set(124, 7, T.COIN); set(126, 7, T.COIN);

  set(140, 9, T.QI); // second chance at ice
  for (let x = 146; x <= 151; x++) { set(x, 6, T.HARD); set(x, 5, T.COIN); }

  for (let i = 0; i < 7; i++) stair(158 + i, i + 1);
  stair(165, 7);
  stair(180, 1);
  for (let y = 3; y <= 11; y++) set(180, y, T.POLE);
  set(180, 2, T.POLE_TOP);

  spawn('spiny', 24);
  spawn('goomba', 32);
  spawn('spiny', 47); spawn('spiny', 58);
  spawn('hopper', 66);
  spawn('spiny', 79);
  spawn('goomba', 98); spawn('goomba', 100);
  spawn('spiny', 124);
  spawn('hopper', 129);
  spawn('spiny', 138); spawn('spiny', 143);
  level.spawns.sort((a, b) => a.x - b.x);

  for (let x = 0; x < level.width; x += 52) {
    level.decor.hills.push({ x, big: true });
    level.decor.hills.push({ x: x + 20, big: false });
    level.decor.clouds.push({ x: x + 8, y: 2, w: 2 });
    level.decor.clouds.push({ x: x + 30, y: 4, w: 1 });
  }
  return level;
}

export function buildR3() { // 2-3: the haunted hall
  const { level, set, ground, stair, spawn } = newLevel(180, '2-3', 'ghost');
  level.flagX = 168;
  level.castleX = 173;

  for (let x = 4; x < 148; x++) set(x, 0, T.GROUND); // ceiling
  ground(0, 52); ground(56, 108); ground(112, 179);

  // candle-lit coin shelves
  for (let x = 12; x <= 17; x++) { set(x, 9, T.BRICK); set(x, 8, T.COIN); }
  set(22, 9, T.QM);
  for (let x = 28; x <= 33; x++) { set(x, 5, T.BRICK); set(x, 4, T.COIN); }
  set(40, 9, T.Q); set(42, 9, T.Q); set(44, 9, T.Q);

  set(60, 9, T.QS); // star: the only way to actually kill the shades
  for (let x = 66; x <= 71; x++) { set(x, 9, T.BRICK); set(x, 8, T.COIN); }
  for (let y = 10; y <= 12; y++) { set(78, y, T.BRICK); set(88, y, T.BRICK); }
  for (let x = 80; x <= 86; x++) set(x, 6, T.COIN);
  set(94, 5, T.BRICK); set(95, 5, T.Q1); set(96, 5, T.BRICK);
  for (let x = 93; x <= 97; x++) set(x, 9, T.BRICK);

  set(118, 9, T.Q); set(120, 9, T.QM); set(122, 9, T.Q);
  for (let x = 128; x <= 133; x++) { set(x, 7, T.BRICK); set(x, 6, T.COIN); }

  for (let i = 0; i < 6; i++) stair(150 + i, i + 1);
  stair(156, 6);
  stair(168, 1);
  for (let y = 3; y <= 11; y++) set(168, y, T.POLE);
  set(168, 2, T.POLE_TOP);

  spawn('ghost', 20);
  spawn('goomba', 30);
  spawn('ghost', 45);
  spawn('ghost', 64);
  spawn('koopa', 62);
  spawn('ghost', 84);
  spawn('ghost', 100);
  spawn('goomba', 116); spawn('goomba', 118);
  spawn('ghost', 126);
  spawn('ghost', 140);
  level.spawns.sort((a, b) => a.x - b.x);

  return level;
}

export function buildR4() { // 2-4: Snapjaw's keep
  const { level, set, stair, spawn } = newLevel(170, '2-4', 'castle');
  level.timeLimit = 300;
  level.flagX = -1;
  level.castleX = 166;

  const floor = (a, b) => { for (let x = a; x <= b; x++) { set(x, 13, T.GROUND); set(x, 14, T.GROUND); } };
  const lava = (a, b) => { for (let x = a; x <= b; x++) { set(x, 13, T.LAVA); set(x, 14, T.LAVA); } };
  const firebar = (tx, ty) => { set(tx, ty, T.HARD); level.spawns.push({ type: 'firebar', x: tx * TILE - 96, cx: tx * TILE + 8, cy: ty * TILE + 8 }); };

  for (let x = 0; x < 152; x++) set(x, 0, T.GROUND);

  floor(0, 26);
  firebar(12, 9); firebar(20, 10);
  set(16, 9, T.QW); // wings help a lot in here

  lava(27, 33);
  set(29, 12, T.HARD); set(30, 12, T.HARD);
  floor(34, 56);
  firebar(40, 8); firebar(48, 10);
  set(44, 9, T.QI);

  lava(57, 60);
  floor(61, 82);
  for (let x = 64; x <= 78; x++) set(x, 5, T.GROUND);
  firebar(70, 9);
  set(74, 9, T.Q1);

  lava(83, 93);
  set(86, 11, T.HARD); set(87, 11, T.HARD);
  set(90, 11, T.HARD); set(91, 11, T.HARD);
  floor(94, 116);
  firebar(100, 9); firebar(108, 10);
  set(104, 9, T.QS);

  lava(117, 122);
  set(119, 12, T.HARD); set(120, 12, T.HARD);
  floor(123, 127);
  lava(128, 143);
  for (let x = 128; x <= 141; x++) set(x, 13, T.BRIDGE);
  set(142, 12, T.AXE); set(142, 11, T.AXE);
  for (let y = 1; y <= 10; y++) set(143, y, T.GROUND);
  level.bridge = { from: 128, to: 141, y: 13 };
  floor(144, 169);

  spawn('spiny', 38); spawn('spiny', 52);
  spawn('goomba', 66);
  spawn('spiny', 98); spawn('spiny', 112);
  level.spawns.push({ type: 'boss2', x: 136 * TILE, y: 0 });
  level.spawns.sort((a, b) => a.x - b.x);

  return level;
}

// ------------------------------------------------------------ campaigns ----

export const CAMPAIGNS = {
  original: {
    title: 'ORIGINAL',
    levels: [buildLevel1, buildLevel2, buildLevel3, buildLevel4],
    names: ['1-1', '1-2', '1-3', '1-4'],
  },
  remix: {
    title: 'MOORE WORLDS',
    levels: [buildR1, buildR2, buildR3, buildR4],
    names: ['2-1', '2-2', '2-3', '2-4'],
  },
};

// Rebuild a playable level from plain JSON (editor / saved custom levels).
export function buildFromData(d) {
  const level = {
    width: d.width,
    name: d.name || 'CUSTOM',
    theme: d.theme || 'overworld',
    tiles: Uint8Array.from(d.tiles),
    spawns: d.spawns.map(s => ({ ...s })),
    decor: { hills: [], bushes: [], clouds: [] },
    flagX: d.flagX,
    castleX: d.castleX ?? -1,
    playerStart: d.playerStart ? { ...d.playerStart } : { x: 40, y: 176 },
    timeLimit: d.timeLimit || 400,
    friction: d.theme === 'snow' ? 0.35 : 1,
    bridge: d.bridge ? { ...d.bridge } : undefined,
  };
  if (level.theme === 'overworld' || level.theme === 'night') {
    for (let x = 0; x < level.width; x += 48) {
      level.decor.hills.push({ x, big: true });
      level.decor.bushes.push({ x: x + 26, w: 2 });
      level.decor.clouds.push({ x: x + 12, y: 2, w: 2 });
    }
  }
  return level;
}
