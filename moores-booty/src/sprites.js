// Moore's Booty — procedural pixel art in an Amiga-ish 16-colour deck.
// Everything is baked to offscreen canvases at init; no assets.

export const PAL = {
  black: '#101018',
  navy: '#12305c',
  sea: '#1c4c8c',
  seaLight: '#2f6cb0',
  foam: '#bcd8e8',
  sand: '#e0c078',
  sandDark: '#b08c48',
  grass: '#3c8840',
  grassDark: '#205c28',
  wood: '#7c5028',
  woodDark: '#4c3018',
  sailWhite: '#e8e4d0',
  gold: '#e8b830',
  red: '#c83030',
  skin: '#e0a878',
  grey: '#8890a0',
  parch: '#d8c088',
  parchDark: '#a89058',
};

export const NATION_COLS = [
  { main: '#c83030', dark: '#801818' },  // England
  { main: '#e0b830', dark: '#906818' },  // Spain
  { main: '#4060d8', dark: '#203088' },  // France
  { main: '#e07820', dark: '#8a4410' },  // Holland
  { main: '#282830', dark: '#101014' },  // pirate / nemesis black
  { main: '#e8e4d0', dark: '#a8a490' },  // player white sails
];

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export const SPR = { sea: [], reef: [], ships: [], ports: [], portraits: {} };

// ---------------- sea / land tiles ----------------

function bakeSeaTile(frame) {
  const c = cv(32, 32);
  const g = c.getContext('2d');
  g.fillStyle = PAL.sea;
  g.fillRect(0, 0, 32, 32);
  // darker depth mottling (stable)
  g.fillStyle = PAL.navy;
  for (let i = 0; i < 6; i++) {
    const x = (i * 13 + 5) % 32, y = (i * 19 + 9) % 32;
    g.fillRect(x, y, 5, 2);
  }
  // animated wave flecks: shift with frame
  g.fillStyle = PAL.seaLight;
  for (let i = 0; i < 5; i++) {
    const x = (i * 11 + frame * 3 + 2) % 30, y = (i * 7 + frame * 2 + 3) % 30;
    g.fillRect(x, y, 6, 1);
    g.fillRect(x + 1, y + 1, 3, 1);
  }
  g.fillStyle = PAL.foam;
  for (let i = 0; i < 2; i++) {
    const x = (i * 17 + frame * 5 + 8) % 28, y = (i * 23 + frame * 4 + 6) % 28;
    g.fillRect(x, y, 3, 1);
  }
  return c;
}

function bakeReefTile(frame) {
  const c = cv(32, 32);
  const g = c.getContext('2d');
  g.drawImage(SPR.sea[frame], 0, 0);
  // pale shallows + jagged rock + breaking foam
  g.fillStyle = 'rgba(120,200,190,0.35)';
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#3c6858';
  for (let i = 0; i < 5; i++) {
    const x = (i * 9 + 4) % 26, y = (i * 13 + 5) % 26;
    g.fillRect(x, y, 4, 3);
    g.fillRect(x + 1, y - 1, 2, 1);
  }
  g.fillStyle = PAL.foam;
  for (let i = 0; i < 4; i++) {
    const x = (i * 8 + frame * 4 + 2) % 28, y = (i * 11 + frame * 3 + 3) % 28;
    g.fillRect(x, y, 5, 1);
  }
  return c;
}

function bakeLandTile() {
  const c = cv(32, 32);
  const g = c.getContext('2d');
  g.fillStyle = PAL.grass;
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = PAL.grassDark;
  for (let i = 0; i < 8; i++) {
    const x = (i * 11 + 3) % 30, y = (i * 17 + 7) % 30;
    g.fillRect(x, y, 3, 2);
  }
  g.fillStyle = '#54a050';
  for (let i = 0; i < 5; i++) {
    const x = (i * 13 + 8) % 30, y = (i * 7 + 2) % 30;
    g.fillRect(x, y, 2, 1);
  }
  return c;
}

function bakeSandTile() {
  const c = cv(32, 32);
  const g = c.getContext('2d');
  g.fillStyle = PAL.sand;
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = PAL.sandDark;
  for (let i = 0; i < 7; i++) {
    const x = (i * 9 + 2) % 30, y = (i * 15 + 5) % 30;
    g.fillRect(x, y, 3, 1);
  }
  return c;
}

// ---------------- ships ----------------
// Baked facing RIGHT (east); drawShip rotates. Size grows with class.

function bakeShip(classIdx, colIdx) {
  const col = NATION_COLS[colIdx];
  const L = [26, 30, 34, 36][classIdx]; // hull length
  const W = [10, 12, 13, 16][classIdx]; // hull width
  const masts = [1, 2, 3, 3][classIdx];
  const S = 40;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2;
  // hull: pointed bow (right), squared stern
  g.fillStyle = PAL.woodDark;
  g.beginPath();
  g.moveTo(cx - L / 2, cy - W / 2);
  g.lineTo(cx + L / 2 - 6, cy - W / 2);
  g.lineTo(cx + L / 2, cy);
  g.lineTo(cx + L / 2 - 6, cy + W / 2);
  g.lineTo(cx - L / 2, cy + W / 2);
  g.closePath();
  g.fill();
  g.fillStyle = PAL.wood;
  g.beginPath();
  g.moveTo(cx - L / 2 + 2, cy - W / 2 + 2);
  g.lineTo(cx + L / 2 - 7, cy - W / 2 + 2);
  g.lineTo(cx + L / 2 - 2, cy);
  g.lineTo(cx + L / 2 - 7, cy + W / 2 - 2);
  g.lineTo(cx - L / 2 + 2, cy + W / 2 - 2);
  g.closePath();
  g.fill();
  // deck line
  g.fillStyle = PAL.woodDark;
  g.fillRect(cx - L / 2 + 3, cy - 1, L - 8, 1);
  // masts + square sails (billow to the right of mast)
  const span = L - 14;
  for (let m = 0; m < masts; m++) {
    const mx = Math.round(cx - span / 2 + (masts === 1 ? span / 2 : (span * m) / (masts - 1)));
    const sw = Math.round(W * 0.9) + (m === Math.floor(masts / 2) ? 3 : 0);
    // sail: a curved rectangle athwartships
    g.fillStyle = colIdx === 4 ? '#404048' : PAL.sailWhite;
    g.fillRect(mx - 2, cy - sw / 2 - 2, 5, sw + 4);
    g.fillStyle = col.main;
    g.fillRect(mx - 2, cy - sw / 2 - 2, 5, 2);   // striped head
    g.fillRect(mx - 2, cy + sw / 2, 5, 2);
    g.fillStyle = PAL.black;
    g.fillRect(mx, cy - 1, 1, 2);                // mast
  }
  // stern flag
  g.fillStyle = col.main;
  g.fillRect(cx - L / 2 - 3, cy - 3, 4, 3);
  g.fillStyle = col.dark;
  g.fillRect(cx - L / 2 - 3, cy, 4, 3);
  if (colIdx === 4) { // jolly roger dot
    g.fillStyle = PAL.sailWhite;
    g.fillRect(cx - L / 2 - 2, cy - 2, 2, 2);
  }
  return c;
}

export function drawShip(ctx, x, y, a, classIdx, colIdx, sailPct = 100) {
  const spr = SPR.ships[classIdx][colIdx];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(a);
  ctx.globalAlpha = 1;
  ctx.drawImage(spr, -20, -20);
  if (sailPct < 60) { // torn sails tint
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#402818';
    ctx.fillRect(-10, -8, 20, 16);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---------------- port sprite ----------------

function bakePort(nation) {
  const col = NATION_COLS[nation];
  const c = cv(32, 32);
  const g = c.getContext('2d');
  // dock
  g.fillStyle = PAL.woodDark;
  g.fillRect(4, 24, 24, 4);
  // houses
  const hs = [[3, 12, 9, 12, '#c8b088'], [13, 9, 8, 15, '#b89878'], [22, 13, 8, 11, '#c8b088']];
  for (const [x, y, w, h, colr] of hs) {
    g.fillStyle = colr;
    g.fillRect(x, y, w, h);
    g.fillStyle = PAL.red;
    g.fillRect(x - 1, y - 3, w + 2, 4); // roof
    g.fillStyle = PAL.woodDark;
    g.fillRect(x + 2, y + h - 5, 3, 5); // door
  }
  // flagpole + nation flag
  g.fillStyle = PAL.grey;
  g.fillRect(15, 0, 1, 10);
  g.fillStyle = col.main;
  g.fillRect(16, 0, 8, 3);
  g.fillStyle = col.dark;
  g.fillRect(16, 3, 8, 3);
  return c;
}

// ---------------- portraits (40x40) ----------------

const FACE_PAL = {
  s: '#e0a878', S: '#b07850', d: '#101018', w: '#e8e4d0', k: '#403020',
  r: '#c83030', g: '#e8b830', b: '#4060d8', q: '#8890a0', p: '#d8c088',
  o: '#e07820', v: '#282830', t: '#3c8840', x: '#801818',
};

function bakeGrid(rows, scale = 2) {
  const h = rows.length, w = rows[0].length;
  const c = cv(w * scale, h * scale);
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !FACE_PAL[ch]) continue;
      g.fillStyle = FACE_PAL[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

// powdered wig, jowls, medal — the governor
const P_GOV = [
  '....qqqqqqqqqqqq....',
  '...qqqqqqqqqqqqqq...',
  '..qqqwwwwwwwwwqqq...',
  '..qqwssssssssswqq...',
  '..qqwsssssssssswq...',
  '..qwssdssssdssswq...',
  '..qwssdssssdssswqq..',
  '..qwssssssssssswqq..',
  '..qwssssSSssssswqq..',
  '..qwsssSssSsssswqq..',
  '..qqwssssssssswwqq..',
  '..qqwssxxxxssswqqq..',
  '..qqwwssssssswwqq...',
  '...qqwwssssswwqq....',
  '....rrrrrrrrrrrr....',
  '...rrrrrggrrrrrrr...',
  '..rrrrrrggrrrrrrrr..',
  '..rrrrrgggglrrrrrr..',
  '..wwrrrrggrrrrrww...',
  '..wwrrrrrrrrrrrww...',
];

// bandana, gold tooth, scar — the tavern keeper
const P_TAV = [
  '....rrrrrrrrrrr.....',
  '...rrrrrrrrrrrrr....',
  '..rrrrrrrrrrrrrrr...',
  '..rrxrrxrrxrrxrrr...',
  '..ssssssssssssss....',
  '..sssdssssssdsss....',
  '..sssdssssssdsss....',
  '..ssssssSsssssss....',
  '..sSsssssssssSss....',
  '..ssssSSSSSsssss....',
  '..sssSsssssSssss....',
  '..ssssdddddsssss....',
  '..ssssdgdgdsssss....',
  '...ssssdddsssss.....',
  '...kssssssssssk.....',
  '..kkkssssssskkkk....',
  '..vvvvvvvvvvvvvv....',
  '..vvvvvvvvvvvvvv....',
  '..vvwvvvvvvvwvvv....',
  '..vvvvvvvvvvvvvv....',
];

// black hat, scar, cruel grin — Capitán El Moorro
const P_VIL = [
  '..vvvvvvvvvvvvvvvv..',
  '.vvvvvvvvvvvvvvvvvv.',
  'vvvvvvwwvvwwvvvvvvvv',
  '.vvvvvvvvvvvvvvvvv..',
  '...vvvvvvvvvvvv.....',
  '...ssssssssssss.....',
  '...sxsdssssdsss.....',
  '...ssxdssssdsss.....',
  '...sssxssssssss.....',
  '...ssssxsSSssss.....',
  '...sSssssssssss.....',
  '...ssskkkkkksss.....',
  '...ssksssssskss.....',
  '...ssskkkkkksss.....',
  '...kssssssssssk.....',
  '..kkkkssssskkkk.....',
  '..vvvvvvvvvvvvvv....',
  '..vvgvvvvvvvvgvv....',
  '..vvvvvvvvvvvvvv....',
  '..vvvvvvvvvvvvvv....',
];

// leather apron, honest face — the shipwright
const P_SHIP = [
  '....kkkkkkkkkk......',
  '...kkkkkkkkkkkk.....',
  '..kksssssssssskk....',
  '..kssssssssssskk....',
  '..ksssdssssdsssk....',
  '..ksssdssssdsssk....',
  '..kssssssssssssk....',
  '..ksssssSSsssssk....',
  '..ksSsssssssSssk....',
  '..kssssssssssss.....',
  '..ksssSSSSSssss.....',
  '..sssssssssssss.....',
  '...sssssssssss......',
  '...ossssssssso......',
  '..ooosssssssooo.....',
  '..oooooooooooooo....',
  '..ooqoooooooqooo....',
  '..oooooooooooooo....',
  '..oooooooooooooo....',
  '..oooooooooooooo....',
];

// ---------------- fencers ----------------
// Layered-limb side-view fencer drawn procedurally each frame.
// pose: {stance:0/1/2, windup:0..1, strike:0..1, parry:bool, stun:bool,
//        hurt:bool, walk:phase}

export function drawFencer(ctx, x, y, dir, pose, cols) {
  // y = deck level (feet). dir=1 faces right.
  const g = ctx;
  const flip = (px) => x + px * dir;
  const body = cols.body, trim = cols.trim, skinC = PAL.skin, hat = cols.hat;
  const bob = Math.round(Math.sin(pose.walk * 0.4) * 1.2);
  const oy = y + (pose.stun ? 2 : 0) + bob * 0;
  const lean = pose.strike ? 3 : pose.windup > 0 ? -2 : 0;

  g.save();
  if (pose.hurt) g.globalAlpha = 0.6 + 0.4 * Math.sin(pose.walk * 2);

  // legs (simple stride)
  const stepA = Math.round(Math.sin(pose.walk) * 3);
  g.fillStyle = '#282838';
  g.fillRect(flip(-4 + stepA) - 2, oy - 12, 4, 12);
  g.fillRect(flip(2 - stepA) - 2, oy - 12, 4, 12);
  g.fillStyle = PAL.woodDark; // boots
  g.fillRect(flip(-4 + stepA) - 2, oy - 3, 5, 3);
  g.fillRect(flip(2 - stepA) - 2, oy - 3, 5, 3);

  // torso
  g.fillStyle = body;
  g.fillRect(flip(-4 + lean) - 2, oy - 26, 10, 15);
  g.fillStyle = trim; // sash
  g.fillRect(flip(-4 + lean) - 2, oy - 18, 10, 3);

  // head + hat
  const hx = flip(lean + 1);
  g.fillStyle = skinC;
  g.fillRect(hx - 3, oy - 33, 7, 7);
  g.fillStyle = PAL.black; // eye
  g.fillRect(flip(lean + 3), oy - 31, 1, 2);
  g.fillStyle = hat;
  g.fillRect(hx - 5, oy - 35, 11, 3);
  g.fillRect(hx - 3, oy - 37, 7, 2);

  // rear arm
  g.fillStyle = body;
  g.fillRect(flip(-6 + lean) - 2, oy - 25, 4, 9);

  // sword arm + blade by stance
  const sy = [oy - 30, oy - 23, oy - 15][pose.stance]; // high/mid/low
  let ext = 8; // arm extension
  if (pose.windup > 0) ext = 3;
  if (pose.strike) ext = 14;
  if (pose.parry) ext = 6;
  const ax = flip(3 + lean);
  g.fillStyle = body;
  g.fillRect(Math.min(ax, ax + dir * ext) - 1, sy + 2, Math.abs(ext) + 2, 3);
  g.fillStyle = skinC;
  g.fillRect(ax + dir * ext - 1, sy + 2, 3, 3);
  // blade
  g.fillStyle = pose.parry ? PAL.gold : '#c8d0d8';
  if (pose.parry) {
    // vertical guard
    g.fillRect(ax + dir * (ext + 2), sy - 5, 2, 14);
  } else {
    const blen = pose.strike ? 18 : 13;
    g.fillRect(Math.min(ax + dir * (ext + 1), ax + dir * (ext + 1 + blen)), sy + 3, blen, 1);
    g.fillStyle = PAL.gold; // hilt
    g.fillRect(ax + dir * (ext + 1) - 1, sy + 1, 2, 5);
  }

  g.restore();
}

// ---------------- misc bakes ----------------

function bakePalm() {
  const c = cv(24, 28);
  const g = c.getContext('2d');
  g.fillStyle = PAL.woodDark;
  g.fillRect(11, 10, 3, 18);
  g.fillStyle = PAL.wood;
  g.fillRect(12, 10, 1, 18);
  g.fillStyle = PAL.grassDark;
  for (const [dx, dy, w] of [[-9, 4, 9], [1, 4, 9], [-7, 0, 7], [3, 0, 7], [-3, -2, 6]]) {
    g.fillRect(12 + dx, 8 + dy, w, 3);
  }
  g.fillStyle = PAL.grass;
  for (const [dx, dy, w] of [[-8, 3, 7], [2, 3, 7], [-2, -1, 5]]) {
    g.fillRect(12 + dx, 8 + dy, w, 2);
  }
  return c;
}

function bakeLoot() {
  const c = cv(16, 16);
  const g = c.getContext('2d');
  g.fillStyle = PAL.wood;
  g.fillRect(3, 5, 10, 8);
  g.fillStyle = PAL.woodDark;
  g.fillRect(3, 7, 10, 1);
  g.fillRect(3, 10, 10, 1);
  g.fillStyle = PAL.gold;
  g.fillRect(5, 3, 6, 3);
  return c;
}

export function drawCompassRose(ctx, cx, cy, r, windA) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(16,16,24,0.55)';
  ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PAL.parch;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  // cardinal ticks
  ctx.fillStyle = PAL.parch;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const l = i % 2 === 0 ? 4 : 2;
    ctx.fillRect(Math.cos(a) * (r - l) - 0.5, Math.sin(a) * (r - l) - 0.5, l > 2 ? 2 : 1, l > 2 ? 2 : 1);
  }
  // wind needle
  ctx.rotate(windA);
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.moveTo(r - 2, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function initSprites() {
  for (let f = 0; f < 3; f++) SPR.sea.push(bakeSeaTile(f));
  for (let f = 0; f < 3; f++) SPR.reef.push(bakeReefTile(f));
  SPR.land = bakeLandTile();
  SPR.sand = bakeSandTile();
  for (let cls = 0; cls < 4; cls++) {
    SPR.ships.push([]);
    for (let col = 0; col < 6; col++) SPR.ships[cls].push(bakeShip(cls, col));
  }
  for (let n = 0; n < 4; n++) SPR.ports.push(bakePort(n));
  SPR.palm = bakePalm();
  SPR.loot = bakeLoot();
  SPR.portraits.governor = bakeGrid(P_GOV);
  SPR.portraits.tavern = bakeGrid(P_TAV);
  SPR.portraits.villain = bakeGrid(P_VIL);
  SPR.portraits.shipwright = bakeGrid(P_SHIP);
}
