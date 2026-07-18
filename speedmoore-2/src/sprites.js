// Speedmoore 2 — procedural pixel art. Armored players baked per team
// palette, steel ball, arena floor, bumpers, stars, powerup tokens.
// All original art, browser-only (match.js never touches this).

import { WORLD_W, WORLD_H, WALL, GOAL_X0, GOAL_X1, BUMPERS } from './match.js';

function bake(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// ---- player bodies (12x13). a=armor A=armor dark t=trim w=visor d=dark k=boot
const FRONT_1 = [
  '....aaaa....',
  '...aaaaaa...',
  '...Awwwwd...',
  '...aaaaaa...',
  '.aaaaaaaaaa.',
  '.taaaAAaaat.',
  '.ta.aaaa.at.',
  '....aaaa....',
  '....AAAA....',
  '...aA..Aa...',
  '...aa..aa...',
  '...aa..aa...',
  '..kk....kk..',
];
const FRONT_2 = [
  '....aaaa....',
  '...aaaaaa...',
  '...Awwwwd...',
  '...aaaaaa...',
  '.aaaaaaaaaa.',
  '.taaaAAaaat.',
  '.ta.aaaa.at.',
  '....aaaa....',
  '....AAAA....',
  '...aA.Aa....',
  '..aa...aa...',
  '..aa...kk...',
  '..kk........',
];
const BACK_1 = [
  '....aaaa....',
  '...aaaaaa...',
  '...attttd...',
  '...aaaaaa...',
  '.aaaaaaaaaa.',
  '.taaAAAAaat.',
  '.ta.aaaa.at.',
  '....aaaa....',
  '....AAAA....',
  '...aA..Aa...',
  '...aa..aa...',
  '...aa..aa...',
  '..kk....kk..',
];
const BACK_2 = [
  '....aaaa....',
  '...aaaaaa...',
  '...attttd...',
  '...aaaaaa...',
  '.aaaaaaaaaa.',
  '.taaAAAAaat.',
  '.ta.aaaa.at.',
  '....aaaa....',
  '....AAAA....',
  '....aA.Aa...',
  '...aa...aa..',
  '...kk...aa..',
  '........kk..',
];
const SIDE_1 = [
  '....aaaa....',
  '...aaaaaa...',
  '...aawwwd...',
  '...aaaaaa...',
  '..aaaaaaa...',
  '..taaaaat...',
  '..taaaaat...',
  '...aaaaa....',
  '...AAAA.....',
  '...aA.Aa....',
  '..aa...aa...',
  '..aa...aa...',
  '..kk...kk...',
];
const SIDE_2 = [
  '....aaaa....',
  '...aaaaaa...',
  '...aawwwd...',
  '...aaaaaa...',
  '..aaaaaaa...',
  '..taaaaat...',
  '..taaaaat...',
  '...aaaaa....',
  '...AAAA.....',
  '....AAa.....',
  '...aa.aa....',
  '..aa...aa...',
  '..kk...kk...',
];
const LYING = [
  '................',
  '...aaaaaaaaaa...',
  '..awwaaaAAaaak..',
  '..aaaaaaaaaaak..',
  '...taaaaaaat....',
  '................',
];

const BODY_SETS = { front: [FRONT_1, FRONT_2], back: [BACK_1, BACK_2], side: [SIDE_1, SIDE_2] };

export function makeTeamSprites(colors, keeper = false) {
  const pal = {
    a: keeper ? colors.dark : colors.main,
    A: keeper ? '#181820' : colors.dark,
    t: colors.trim,
    w: keeper ? '#f85038' : '#68e8f8',
    d: '#101018',
    k: '#22222c',
  };
  const out = {};
  for (const [key, frames] of Object.entries(BODY_SETS)) {
    out[key] = frames.map((f) => bake(f, pal));
  }
  out.lying = bake(LYING, pal);
  return out;
}

// ---- ball ----
const BALL = [
  '.qqqq.',
  'qwwqqq',
  'qwqqqQ',
  'qqqqqQ',
  'qqqqQQ',
  '.qQQQ.',
];
const STAR_LIT = [
  '....y....',
  '....y....',
  '...yyy...',
  'yyyywyyyy',
  '.yyywyy..',
  '..yyyyy..',
  '.yyy.yyy.',
  '.y.....y.',
  '.........',
];
const STAR_OFF = STAR_LIT.map((r) => r.replace(/[yw]/g, 'Q'));

const TOKENS = {
  armor: [
    '.ggggggg.',
    '.gwwwwwg.',
    '.gwgggwg.',
    '.gwgwgwg.',
    '.gwgggwg.',
    '..gwwwg..',
    '...ggg...',
    '....g....',
    '.........',
  ],
  speed: [
    '.....yy..',
    '....yy...',
    '...yy....',
    '..yyyyy..',
    '....yy...',
    '...yy....',
    '..yy.....',
    '.yy......',
    '.........',
  ],
  magnet: [
    '.rr...rr.',
    '.rr...rr.',
    '.rr...rr.',
    '.rr...rr.',
    '.rrr.rrr.',
    '..rrrrr..',
    '...rrr...',
    '.ww...ww.',
    '.........',
  ],
  freeze: [
    '....c....',
    '.c..c..c.',
    '..c.c.c..',
    '...ccc...',
    'ccccwcccc',
    '...ccc...',
    '..c.c.c..',
    '.c..c..c.',
    '....c....',
  ],
  coin: [
    '..yyyyy..',
    '.yyyyyyy.',
    'yyywwyyyy',
    'yyywyyyyy',
    'yyywwyyyy',
    'yyyyywyyy',
    'yyywwyyyy',
    '.yyyyyyy.',
    '..yyyyy..',
  ],
};

const FXPAL = {
  q: '#c8c8d8', Q: '#70707e', w: '#ffffff',
  y: '#f8d838', g: '#40c848', r: '#e84030', c: '#68e8f8',
};

export const SPR = {};

export function initSprites() {
  SPR.ball = bake(BALL, FXPAL);
  SPR.starLit = bake(STAR_LIT, FXPAL);
  SPR.starOff = bake(STAR_OFF, FXPAL);
  SPR.tokens = {};
  for (const [k, rows] of Object.entries(TOKENS)) SPR.tokens[k] = bake(rows, FXPAL);
}

// ---- the arena, pre-rendered once (static parts) ----
export function buildArena() {
  const c = document.createElement('canvas');
  c.width = WORLD_W; c.height = WORLD_H;
  const g = c.getContext('2d');

  // outer steel
  g.fillStyle = '#14141c';
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // floor: brushed metal panels
  g.fillStyle = '#39394a';
  g.fillRect(WALL, WALL, WORLD_W - WALL * 2, WORLD_H - WALL * 2);
  for (let y = WALL; y < WORLD_H - WALL; y += 40) {
    for (let x = WALL; x < WORLD_W - WALL; x += 37) {
      const shade = ((x / 37 + y / 40) | 0) % 2;
      g.fillStyle = shade ? '#3d3d4f' : '#373747';
      g.fillRect(x, y, 37, 40);
      g.fillStyle = '#2c2c3a';
      g.fillRect(x, y, 37, 1);
      g.fillRect(x, y, 1, 40);
      g.fillStyle = '#585866';
      g.fillRect(x + 2, y + 2, 1, 1);
      g.fillRect(x + 34, y + 37, 1, 1);
    }
  }

  // markings
  g.strokeStyle = '#8890a0';
  g.lineWidth = 2;
  g.strokeRect(WALL + 3, WALL + 3, WORLD_W - WALL * 2 - 6, WORLD_H - WALL * 2 - 6);
  g.beginPath();
  g.moveTo(WALL + 3, WORLD_H / 2); g.lineTo(WORLD_W - WALL - 3, WORLD_H / 2);
  g.stroke();
  g.beginPath();
  g.arc(WORLD_W / 2, WORLD_H / 2, 42, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#a8b0c0';
  g.fillRect(WORLD_W / 2 - 2, WORLD_H / 2 - 2, 4, 4);
  // goal boxes
  for (const top of [true, false]) {
    const y0 = top ? WALL : WORLD_H - WALL - 70;
    g.strokeStyle = '#6870a0';
    g.strokeRect(GOAL_X0 - 26, top ? y0 : y0, GOAL_X1 - GOAL_X0 + 52, 70);
  }

  // walls: layered metal bands with bolts
  const band = (x, y, w2, h2) => {
    g.fillStyle = '#565664'; g.fillRect(x, y, w2, h2);
    g.fillStyle = '#787888'; g.fillRect(x, y, w2, 2);
    g.fillStyle = '#30303c'; g.fillRect(x, y + h2 - 2, w2, 2);
  };
  band(0, 0, WORLD_W, WALL);
  band(0, WORLD_H - WALL, WORLD_W, WALL);
  g.save();
  g.translate(0, 0);
  g.fillStyle = '#565664'; g.fillRect(0, 0, WALL, WORLD_H);
  g.fillRect(WORLD_W - WALL, 0, WALL, WORLD_H);
  g.fillStyle = '#787888'; g.fillRect(0, 0, 2, WORLD_H); g.fillRect(WORLD_W - WALL, 0, 2, WORLD_H);
  g.fillStyle = '#30303c'; g.fillRect(WALL - 2, 0, 2, WORLD_H); g.fillRect(WORLD_W - 2, 0, 2, WORLD_H);
  g.restore();
  g.fillStyle = '#9898a8';
  for (let y = 20; y < WORLD_H; y += 40) {
    g.fillRect(5, y, 2, 2); g.fillRect(WORLD_W - 7, y, 2, 2);
  }
  for (let x = 20; x < WORLD_W; x += 40) {
    g.fillRect(x, 5, 2, 2); g.fillRect(x, WORLD_H - 7, 2, 2);
  }

  // goal mouths: cut the wall open, dark cavity + chrome posts
  for (const top of [true, false]) {
    const y = top ? 0 : WORLD_H - WALL;
    g.fillStyle = '#08080c';
    g.fillRect(GOAL_X0, y, GOAL_X1 - GOAL_X0, WALL);
    // net mesh
    g.fillStyle = '#20202c';
    for (let x = GOAL_X0 + 2; x < GOAL_X1; x += 4) g.fillRect(x, y + 1, 1, WALL - 2);
    for (let yy = y + 2; yy < y + WALL; yy += 4) g.fillRect(GOAL_X0 + 1, yy, GOAL_X1 - GOAL_X0 - 2, 1);
    g.fillStyle = '#e8e8f0';
    g.fillRect(GOAL_X0 - 3, y, 3, WALL);
    g.fillRect(GOAL_X1, y, 3, WALL);
    g.fillStyle = '#f8d838';
    g.fillRect(GOAL_X0 - 3, top ? WALL - 2 : y, GOAL_X1 - GOAL_X0 + 6, 2);
  }

  // bumpers: steel domes with red caps
  for (const b of BUMPERS) {
    const grd = g.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
    grd.addColorStop(0, '#d8d8e8');
    grd.addColorStop(0.6, '#888898');
    grd.addColorStop(1, '#484858');
    g.fillStyle = grd;
    g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c02828';
    g.beginPath(); g.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f88878';
    g.beginPath(); g.arc(b.x - 1, b.y - 1, b.r * 0.18, 0, Math.PI * 2); g.fill();
  }

  return c;
}

// draw a player sprite for a facing vector
export function drawPlayer(g, spr, p, x, y, frame) {
  if (p.down > 0) {
    g.drawImage(spr.lying, (x - 8) | 0, (y - 3) | 0);
    return;
  }
  const moving = Math.abs(p.vx) + Math.abs(p.vy) > 5 || p.slide > 0;
  const fi = moving ? (Math.floor(p.runPhase) % 2) : 0;
  let img, flip = false;
  if (Math.abs(p.fx) > Math.abs(p.fy)) { img = spr.side[fi]; flip = p.fx < 0; }
  else if (p.fy < 0) img = spr.back[fi];
  else img = spr.front[fi];
  const dx = (x - 6) | 0, dy = (y - 7) | 0;
  if (flip) {
    g.save();
    g.translate(dx + 12, dy);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0);
    g.restore();
  } else {
    g.drawImage(img, dx, dy);
  }
}
