// Procedural pixel art + the oblique projection for Papermoore.
// The street runs from upper-right (far) to lower-left (near); world coords are
// (wx = lateral across the street, rv = forward distance ahead of the camera).

export const VIEW_W = 256, VIEW_H = 240;

// Lateral world layout (wx). Road centered on 128.
export const LAYOUT = {
  CENTER: 128,
  ROAD_L: 104, ROAD_R: 152,
  LANE_L: 111, LANE_R: 145,      // bike clamp
  L_MB: 98, R_MB: 158,           // mailbox lateral (delivery point)
  L_HOUSE: 70, R_HOUSE: 186,     // house billboard centers
};

const PROJ = { OX: 96, XS: 0.66, SKEW: 0.72, BY: 212, FY: 1.2 };
export function proj(wx, rv) {
  return {
    x: PROJ.OX + (wx - LAYOUT.CENTER) * PROJ.XS + rv * PROJ.SKEW,
    y: PROJ.BY - rv * PROJ.FY,
  };
}
export const BIKE_RV = 18;           // fixed forward offset of the bike
export const RV_MAX = 178;           // farthest visible forward distance

// ---- palette ----
const PAL = {
  d: '#101010', q: '#c0c0c8', Q: '#70707c',
  s: '#f8c088', S: '#c88858',
  x: '#f83828', X: '#a81810',
  y: '#f8d838', o: '#c08810',
  b: '#3860d0', B: '#1c3888',
  w: '#f4f4f4', W: '#bcbcc4',
  k: '#7a4a1c', K: '#4a2c10',
  g: '#40b048', G: '#1f6820',
  c: '#40c0e0', C: '#1878a8',
  l: '#a8e0f8',
  p: '#b060e0', P: '#6a2f8a',
  r: '#e86828', R: '#a03810',
  n: '#26241f', e: '#d8d8e0',
  h: '#f08820', t: '#f8a0b0',
};

function bake(rows, pal = PAL) {
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

export const SPR = {};
const defs = [];
function def(name, rows) { defs.push([name, rows]); }

// ===================== THE PAPERMOORE (kid + BMX) =====================
// Seen from behind/above, riding away down the street. 20 wide.

def('bike1', [
  '.......dd...........',
  '......dllqd.........',
  '......dqqld.........',
  '.......dd...........',
  '........q...........',
  '.......xxx..........',
  '......xXXXx.........',
  '......xssssx........',
  '.....yyyyyyy........',
  '....yyoyyoyyy.......',
  '....yyoyyoyyw.......',
  '....ssyyyyss.......w',
  '.....bbbbbb........w',
  '....bb.b.bbb........',
  '...bb..b..bb........',
  '...b...b...b........',
  '..bb...q...bb.......',
  '.......q............',
  '......ddddd.........',
  '.....dqQQQqd........',
  '.....dQq.qQd........',
  '.....dqQQQqd........',
  '......ddddd.........',
  '.......dd...........',
]);

def('bike2', [
  '.......dd...........',
  '......dqqld.........',
  '......dllqd.........',
  '.......dd...........',
  '........q...........',
  '.......xxx..........',
  '......xXXXx.........',
  '......xssssx........',
  '.....yyyyyyy........',
  '....yyoyyoyyy.......',
  '....yyoyyoyyw.......',
  '....ssyyyyss.......w',
  '.....bbbbbb........w',
  '....bbb.b.bb........',
  '...bb..b...bb.......',
  '...b...b....b.......',
  '..bb...q....b.......',
  '.......q............',
  '......ddddd.........',
  '.....dqQqQqd........',
  '.....dQ.q.Qd........',
  '.....dqQqQqd........',
  '......ddddd.........',
  '.......dd...........',
]);

// Leaning (drawn flipped for the other side).
def('bikeLean', [
  '......dd............',
  '.....dllqd..........',
  '.....dqqld..........',
  '......dd............',
  '.......q............',
  '......xxx...........',
  '.....xXXXx..........',
  '.....xssssx.........',
  '....yyyyyyy.........',
  '...yyoyyoyyy........',
  '..syyoyyoyyw........',
  '..sssyyyyss.......w.',
  '....bbbbbb........w.',
  '...bb.b.bbb.........',
  '..bb..b..bb.........',
  '..b...b...b.........',
  '.bb...q...bb........',
  '......q.............',
  '.....ddddd..........',
  '....dqQQQqd.........',
  '....dQq.qQd.........',
  '....dqQQQqd.........',
  '.....ddddd..........',
  '......dd............',
]);

// Arm out flinging a paper.
def('bikeThrow', [
  '.......dd...........',
  '......dllqd.........',
  '......dqqld.........',
  '.......dd...........',
  '........q...........',
  '.......xxx..........',
  '......xXXXx.........',
  '......xssssx.s......',
  '.....yyyyyyyss.....w',
  '....yyoyyoyyy.s....w',
  '....yyoyyoyyw......w',
  '....ssyyyyss.......w',
  '.....bbbbbb.........',
  '....bb.b.bbb........',
  '...bb..b..bb........',
  '...b...b...b........',
  '..bb...q...bb.......',
  '.......q............',
  '......ddddd.........',
  '.....dqQQQqd........',
  '.....dQq.qQd........',
  '.....dqQQQqd........',
  '......ddddd.........',
  '.......dd...........',
]);

def('bikeCrash', [
  '....................',
  '..d.....xxx........d.',
  '.dqd...xXsXx.....dqd.',
  '.dqd...ssyss....dqqd.',
  '..d...yyyyyyy....dd..',
  '.....yybyyoy.b.......',
  '....b..bb..b..b......',
  '...ddddd..bb.b.......',
  '..dqQQQqd...b........',
  '..dQq.qQd..bb........',
  '..dqQQQqd...........',
  '...ddddd............',
]);

// ===================== PAPERS & BUNDLES =====================
def('paper', [
  'wwww',
  'wWWw',
  'wWWw',
  'wwww',
]);
def('bundle', [
  '.wwwwww.',
  'wWWWWWWw',
  'wwwwwwww',
  'wWWWWWWw',
  'wwwwwwww',
  'wWWWWWWw',
  'wwwwwwww',
  '.KKKKKK.',
]);

// ===================== HAZARDS =====================
// Oncoming car (points up-street). 22 wide.
def('car', [
  '...dddddddddd.....',
  '..dCCCCCCCCCCd....',
  '.dClllllllllCd...',
  '.dCllllllllllCd..',
  'dCCCCCCCCCCCCCCd.',
  'dCcCCCCCCCCCcCCd.',
  'dCCCCCCCCCCCCCCd.',
  '.ddCCCCCCCCCCdd..',
  '...dd......dd....',
]);
def('car2', [
  '...dddddddddd.....',
  '..drrrrrrrrrrd....',
  '.drlllllllllrd...',
  '.drlllllllllard..',
  'drrrrrrrrrrrrrrd.',
  'drRrrrrrrrrRrrrd.',
  'drrrrrrrrrrrrrrd.',
  '.ddrrrrrrrrrrdd..',
  '...dd......dd....',
]);

def('dog', [
  '.........k..k...',
  'kk......kkkkk...',
  '.kkkkkkkkkksk...',
  '.kkkkkkkkkkkk...',
  '..k.k....k.k...',
]);
def('cat', [
  '.p....p......',
  'ppp..ppp.....',
  '.ppppppppp...',
  '.pppppppppp..',
  '..p.p..p.p...',
]);
def('jogger', [
  '...sss....',
  '...sss....',
  '..sSSSs...',
  '.rrrrrrr..',
  'rrrrrrrrr.',
  '.rr.rr....',
  '.bb..bb...',
  '.bb..bb...',
  '.bb..bb...',
  'sbb..bbs..',
]);
def('skater', [
  '..xxx.....',
  '..xXx.....',
  '..sss.....',
  '.gggggg...',
  'gggggggg..',
  '.gg..gg...',
  '.bb..bb...',
  '.bb..bb...',
  'kkkkkkkk..',
  'q.d..d.q..',
]);
def('drunk', [
  '..kkk.....',
  '..sss.....',
  '.sSSSs....',
  'pPPPPPp...',
  '.pp.ppp...',
  '.PP..PP...',
  '.bb...bb..',
  '..bb..b...',
  '..bb..bb..',
  '.kk....k..',
]);
def('trike', [
  '...xxx....',
  '..xXXXx...',
  '..sssss...',
  '.yyyyyy...',
  '.yybyy....',
  'ddbbbbdd..',
  'dqd..dqd..',
  'dqd..dqd..',
]);
def('mower', [
  '....kk....',
  '...kssk...',
  '...kkkk...',
  '..QQQQQQ..',
  '.rrrrrrrr.',
  'rRRRRRRRRr',
  'rRRRRRRRRr',
  '.dd....dd.',
]);
def('dancer', [
  '...xxx......',
  '..xXsXx.....',
  '...ss.......',
  '.g.gggg.g...',
  'gg.gggg.gg..',
  '...gggg.....',
  '..bb..bb....',
  '.bb....bb...',
  'kk......kk..',
]);
def('reaper', [
  '....nnnn....',
  '...nnnnnn...',
  '...neennn.q.',
  '...neeen.qq.',
  '..nnnnnnnq..',
  '.nnnnnnnnq..',
  '.nnnnnnnn...',
  'nnnnnnnnnn..',
  'nnnnnnnnnn..',
  '.nnnnnnnn...',
  '..nnnnnn....',
  '..nn..nn....',
]);

export function initSprites() {
  for (const [name, rows] of defs) SPR[name] = bake(rows);
}

export function drawSprite(ctx, name, x, y, flip = false, scale = 1) {
  const c = SPR[name];
  if (!c) return;
  ctx.save();
  if (flip) {
    ctx.translate(Math.round(x) + c.width * scale, Math.round(y));
    ctx.scale(-scale, scale);
    ctx.drawImage(c, 0, 0);
  } else {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.drawImage(c, 0, 0);
  }
  ctx.restore();
}

// Draw a sprite centered at cx,cy (screen space), optional flip/scale.
export function drawCentered(ctx, name, cx, cy, flip = false, scale = 1) {
  const c = SPR[name];
  if (!c) return;
  drawSprite(ctx, name, cx - (c.width * scale) / 2, cy - c.height * scale, flip, scale);
}

// ===================== GROUND / STREET =====================

function quad(ctx, a, b, c, d, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
  ctx.closePath(); ctx.fill();
}

export function drawGround(ctx, camV, day, houses) {
  const L = LAYOUT;
  // grass everywhere
  ctx.fillStyle = day >= 6 ? '#4a5a2e' : '#4c9a3a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // distant hedge + sky sliver at the far top
  const far = proj(L.CENTER, RV_MAX);
  ctx.fillStyle = '#b8d8e8';
  ctx.fillRect(0, 0, VIEW_W, Math.max(0, far.y - 8));
  ctx.fillStyle = day >= 6 ? '#25341c' : '#2c6a24';
  ctx.fillRect(0, Math.max(0, far.y - 8), VIEW_W, 14);

  // lawns (lighter mowed strips near the road)
  quad(ctx,
    proj(L.ROAD_L - 34, -20), proj(L.ROAD_L - 4, -20),
    proj(L.ROAD_L - 4, RV_MAX), proj(L.ROAD_L - 34, RV_MAX), day >= 6 ? '#586a34' : '#58ac44');
  quad(ctx,
    proj(L.ROAD_R + 4, -20), proj(L.ROAD_R + 34, -20),
    proj(L.ROAD_R + 34, RV_MAX), proj(L.ROAD_R + 4, RV_MAX), day >= 6 ? '#586a34' : '#58ac44');

  // driveways (grey strips from road to the house front, per house)
  for (const h of houses) {
    const rv0 = h.v - 9 - camV, rv1 = h.v + 9 - camV;
    if (rv1 < -20 || rv0 > RV_MAX) continue;
    const inner = h.side === 'L' ? L.ROAD_L - 2 : L.ROAD_R + 2;
    const outer = h.side === 'L' ? L.L_HOUSE + 8 : L.R_HOUSE - 8;
    quad(ctx, proj(inner, rv0), proj(outer, rv0), proj(outer, rv1), proj(inner, rv1), '#9a9488');
  }

  // sidewalks
  quad(ctx, proj(L.ROAD_L - 4, -20), proj(L.ROAD_L, -20), proj(L.ROAD_L, RV_MAX), proj(L.ROAD_L - 4, RV_MAX), '#c8c4b8');
  quad(ctx, proj(L.ROAD_R, -20), proj(L.ROAD_R + 4, -20), proj(L.ROAD_R + 4, RV_MAX), proj(L.ROAD_R, RV_MAX), '#c8c4b8');

  // road
  quad(ctx, proj(L.ROAD_L, -20), proj(L.ROAD_R, -20), proj(L.ROAD_R, RV_MAX), proj(L.ROAD_L, RV_MAX), '#4a4a52');
  // curbs
  ctx.strokeStyle = '#dcdcd0'; ctx.lineWidth = 1;
  for (const wx of [L.ROAD_L, L.ROAD_R]) {
    const a = proj(wx, -20), b = proj(wx, RV_MAX);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // centre lane dashes, scrolling with the camera
  ctx.fillStyle = '#e8e850';
  const off = camV % 26;
  for (let v = -off; v < RV_MAX; v += 26) {
    if (v + 10 < 0) continue;
    const a = proj(L.CENTER - 1.5, v), b = proj(L.CENTER + 1.5, v);
    const c = proj(L.CENTER + 1.5, v + 11), d = proj(L.CENTER - 1.5, v + 11);
    quad(ctx, a, b, c, d, '#e8e850');
  }
}

// ===================== HOUSES =====================

const HOUSE_HUES = ['#e86868', '#68a8e8', '#e8c058', '#78c878', '#c888d8', '#e89858'];

export function drawHouse(ctx, h, camV) {
  const rv = h.v - camV;
  if (rv < -34 || rv > RV_MAX + 8) return;
  const L = LAYOUT;
  const cx0 = h.side === 'L' ? L.L_HOUSE : L.R_HOUSE;
  const p = proj(cx0, rv);
  const scale = Math.max(0.62, Math.min(1.18, 1.16 - rv * 0.0034));
  const w = 44 * scale, ht = 40 * scale;
  const x = Math.round(p.x - w / 2);
  const baseY = Math.round(p.y);
  const y = baseY - ht;

  const sub = h.subscriber;
  const wall = sub ? HOUSE_HUES[h.hue % HOUSE_HUES.length] : '#8a7f70';
  const wallDark = sub ? shade(wall, -0.28) : '#6a6155';
  const roof = sub ? '#8a3028' : '#4a4038';
  const roofDark = sub ? '#601c18' : '#332c26';

  // body
  ctx.fillStyle = wall;
  ctx.fillRect(x, y, w, ht);
  ctx.fillStyle = wallDark;
  ctx.fillRect(x, y + ht - 4 * scale, w, 4 * scale);
  // roof (triangle)
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 3 * scale, y + 2);
  ctx.lineTo(x + w / 2, y - 16 * scale);
  ctx.lineTo(x + w + 3 * scale, y + 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = roofDark;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - 16 * scale);
  ctx.lineTo(x + w + 3 * scale, y + 2);
  ctx.lineTo(x + w / 2, y + 2);
  ctx.closePath(); ctx.fill();
  // chimney
  ctx.fillStyle = '#6a5040';
  ctx.fillRect(x + w - 10 * scale, y - 12 * scale, 5 * scale, 8 * scale);

  // door (on the road-facing side)
  const doorX = h.side === 'L' ? x + w - 12 * scale : x + 6 * scale;
  ctx.fillStyle = sub ? '#5a3818' : '#3a2a1a';
  ctx.fillRect(doorX, y + ht - 15 * scale, 8 * scale, 15 * scale);
  ctx.fillStyle = '#e8d038';
  ctx.fillRect(doorX + (h.side === 'L' ? 1 * scale : 6 * scale), y + ht - 9 * scale, 1.5 * scale, 1.5 * scale);

  // windows — the near window is the vandalism target on non-subscribers
  const winY = y + 8 * scale;
  const w1x = h.side === 'L' ? x + 5 * scale : x + w - 13 * scale; // far window
  const w2x = h.side === 'L' ? x + 18 * scale : x + 6 * scale;     // near-door window
  drawWindow(ctx, w1x, winY, 8 * scale, 9 * scale, sub, false);
  drawWindow(ctx, w2x, winY, 8 * scale, 9 * scale, sub, h.boarded || h.windowBroken, h.boarded);

  // mailbox at the delivery point on the lawn
  const mb = proj(h.side === 'L' ? L.L_MB : L.R_MB, rv);
  drawMailbox(ctx, mb.x, mb.y, scale, sub, h);
}

function drawWindow(ctx, x, y, w, ht, sub, broken, boarded) {
  if (boarded) {
    ctx.fillStyle = '#7a5228';
    ctx.fillRect(x, y, w, ht);
    ctx.fillStyle = '#4a3018';
    for (let i = 0; i < 3; i++) ctx.fillRect(x, y + i * (ht / 3) + 1, w, 1);
    return;
  }
  ctx.fillStyle = '#20242c';
  ctx.fillRect(x - 1, y - 1, w + 2, ht + 2);
  if (broken) {
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(x, y, w, ht);
    // glass shards
    ctx.fillStyle = '#a8e0f8';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.4, y); ctx.lineTo(x, y + ht * 0.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w, y + ht); ctx.lineTo(x + w * 0.5, y + ht); ctx.lineTo(x + w, y + ht * 0.4); ctx.fill();
  } else {
    ctx.fillStyle = sub ? '#bfe6ff' : '#5a6a70';
    ctx.fillRect(x, y, w, ht);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x + 1, y + 1, Math.max(1, w * 0.35), Math.max(1, ht * 0.4));
    ctx.globalAlpha = 1;
  }
}

function drawMailbox(ctx, x, y, scale, sub, h) {
  const s = scale;
  // post
  ctx.fillStyle = '#5a4028';
  ctx.fillRect(Math.round(x - 1), Math.round(y - 9 * s), 2, 9 * s);
  // box
  ctx.fillStyle = h.delivered ? '#78c878' : (sub ? '#d8d8e0' : '#8a8a92');
  ctx.fillRect(Math.round(x - 4 * s), Math.round(y - 15 * s), 8 * s, 6 * s);
  ctx.fillStyle = '#40404a';
  ctx.fillRect(Math.round(x - 4 * s), Math.round(y - 15 * s), 8 * s, 1);
  // flag — up for a subscriber awaiting delivery
  ctx.fillStyle = sub && !h.delivered ? '#e83030' : '#707078';
  ctx.fillRect(Math.round(x + 4 * s), Math.round(y - 16 * s), 2, sub && !h.delivered ? 5 * s : 2);
}

// ===================== STATIC OBSTACLES =====================

export function drawObstacle(ctx, type, cx, cy, scale = 1) {
  const s = scale;
  if (type === 'hydrant') {
    ctx.fillStyle = '#d83028'; ctx.fillRect(cx - 3 * s, cy - 10 * s, 6 * s, 10 * s);
    ctx.fillStyle = '#f05040'; ctx.fillRect(cx - 4 * s, cy - 12 * s, 8 * s, 3 * s);
    ctx.fillStyle = '#a01810'; ctx.fillRect(cx - 5 * s, cy - 6 * s, 2 * s, 2 * s); ctx.fillRect(cx + 3 * s, cy - 6 * s, 2 * s, 2 * s);
  } else if (type === 'cone') {
    ctx.fillStyle = '#f08820'; ctx.beginPath();
    ctx.moveTo(cx, cy - 11 * s); ctx.lineTo(cx - 5 * s, cy); ctx.lineTo(cx + 5 * s, cy); ctx.fill();
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(cx - 4 * s, cy - 6 * s, 8 * s, 2 * s);
  } else if (type === 'drain') {
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(cx - 7 * s, cy - 4 * s, 14 * s, 6 * s);
    ctx.fillStyle = '#101014';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 6 * s + i * 3.5 * s, cy - 3 * s, 1.5 * s, 4 * s);
  } else if (type === 'tombstone') {
    ctx.fillStyle = '#9aa0a8'; ctx.fillRect(cx - 5 * s, cy - 12 * s, 10 * s, 12 * s);
    ctx.beginPath(); ctx.arc(cx, cy - 12 * s, 5 * s, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#6a7078'; ctx.fillRect(cx - 2 * s, cy - 9 * s, 4 * s, 1); ctx.fillRect(cx - 3 * s, cy - 7 * s, 6 * s, 1);
  } else if (type === 'construct') {
    ctx.fillStyle = '#e8b820'; ctx.fillRect(cx - 8 * s, cy - 8 * s, 16 * s, 4 * s);
    ctx.fillStyle = '#101010';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 8 * s + i * 4 * s, cy - 8 * s); ctx.lineTo(cx - 5 * s + i * 4 * s, cy - 4 * s); ctx.lineTo(cx - 8 * s + i * 4 * s, cy - 4 * s); ctx.fill(); }
    ctx.fillStyle = '#c89818'; ctx.fillRect(cx - 8 * s, cy - 4 * s, 2 * s, 4 * s); ctx.fillRect(cx + 6 * s, cy - 4 * s, 2 * s, 4 * s);
  }
}

// ===================== EFFECTS =====================

export function drawShadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawBurst(ctx, x, y, t) {
  const cols = ['#fff8d0', '#f8d838', '#f89828'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 2 + t * 1.3;
    ctx.fillStyle = cols[i % 3];
    ctx.fillRect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r - 1, 2, 2);
  }
}

export function drawSparkle(ctx, x, y, t) {
  ctx.fillStyle = t % 4 < 2 ? '#fff8d0' : '#f8d838';
  ctx.fillRect(x - 1, y - 5, 2, 10);
  ctx.fillRect(x - 5, y - 1, 10, 2);
}

// ---- helpers ----
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + r * amt)));
  g = Math.max(0, Math.min(255, Math.round(g + g * amt)));
  b = Math.max(0, Math.min(255, Math.round(b + b * amt)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
