// Procedural pixel art baked to offscreen canvases: the hedgehog (all
// animation frames drawn centered for easy 45-degree-snapped rotation),
// badniks, objects, plus themed terrain-tile baking from level bitmaps.

const PAL = {
  blue: '#2050e8', blueD: '#1030a0', skin: '#f0c088', skinD: '#c08850',
  red: '#e02818', redD: '#8c1008', white: '#f8f8f8', black: '#101010',
  eye: '#183828', gold: '#f8c800', goldD: '#b08000',
  metal: '#a8b0c0', metalD: '#606880', green: '#28a838', greenD: '#186020',
  purple: '#9040c0', grey: '#888898',
};

export const SPR = {};

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const s = Math.floor(Math.sqrt(r * r - y * y));
    g.fillRect(Math.round(cx - s), Math.round(cy + y), s * 2 + 1, 1);
  }
}

function ellipse(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const s = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    g.fillRect(Math.round(cx - s), Math.round(cy + y), s * 2 + 1, 1);
  }
}

function tri(g, x1, y1, x2, y2, x3, y3, c) {
  const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
  const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
  const d = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
  if (!d) return;
  g.fillStyle = c;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x2 - x) * (y3 - y) - (x3 - x) * (y2 - y)) / d;
      const b = ((x3 - x) * (y1 - y) - (x1 - x) * (y3 - y)) / d;
      const cc = 1 - a - b;
      if (a >= -0.01 && b >= -0.01 && cc >= -0.01) g.fillRect(x, y, 1, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// The hedgehog: every frame on a 40x40 canvas, character center at (20,20),
// standing feet at y=39 (height radius 19), ball radius ~13 (hrBall 14).
// All frames face RIGHT.
// ---------------------------------------------------------------------------

function shoe(g, x, y, back) {
  rect(g, x - 4, y - 3, 9, 4, PAL.red);
  rect(g, x - 4, y - 1, 9, 2, PAL.redD);
  rect(g, x - 2, y - 3, 2, 3, PAL.white);
  if (!back) px(g, x + 4, y - 2, PAL.white);
}

function leg(g, hx, hy, fx, fy, c) {
  // simple 2px-wide line from hip to foot
  const steps = Math.max(Math.abs(fx - hx), Math.abs(fy - hy));
  for (let i = 0; i <= steps; i++) {
    const x = hx + ((fx - hx) * i) / steps;
    const y = hy + ((fy - hy) * i) / steps;
    rect(g, x - 1, y, 2, 1, c);
  }
}

function hedgehogBody(g, opts = {}) {
  const cx = 20, cy = opts.cy ?? 16;
  // back spikes (three, pointing back-left)
  tri(g, cx - 4, cy - 8, cx - 16, cy - 6, cx - 4, cy - 1, PAL.blue);
  tri(g, cx - 5, cy - 2, cx - 17, cy + 2, cx - 4, cy + 5, PAL.blue);
  tri(g, cx - 5, cy + 4, cx - 14, cy + 9, cx - 3, cy + 9, PAL.blueD);
  // top spike
  tri(g, cx - 2, cy - 9, cx - 10, cy - 13, cx + 4, cy - 9, PAL.blue);
  // head/body ball
  disc(g, cx, cy - 3, 9, PAL.blue);
  disc(g, cx + 1, cy + 6, 6, PAL.blue);       // lower body
  ellipse(g, cx + 2, cy + 7, 4, 5, PAL.skin); // belly
  // muzzle + face
  ellipse(g, cx + 6, cy + 1, 4, 3, PAL.skin);
  px(g, cx + 10, cy, PAL.black);              // nose
  // eye
  rect(g, cx + 3, cy - 6, 4, 5, PAL.white);
  rect(g, cx + 6, cy - 5, 2, 3, PAL.eye);
  px(g, cx + 6, cy - 5, PAL.black);
  // ear
  tri(g, cx, cy - 11, cx + 4, cy - 11, cx + 2, cy - 8, PAL.skinD);
}

function bakeStand() {
  const [c, g] = mk(40, 40);
  hedgehogBody(g);
  leg(g, 18, 26, 16, 36, PAL.blue);
  leg(g, 22, 26, 22, 36, PAL.blue);
  shoe(g, 16, 39, true);
  shoe(g, 23, 39, false);
  rect(g, 26, 18, 3, 2, PAL.skin); // arm
  return c;
}

function bakeWalk(phase) {
  // phase 0..3: leg swing
  const [c, g] = mk(40, 40);
  const sw = Math.sin((phase / 4) * Math.PI * 2);
  hedgehogBody(g, { cy: 17 });
  const f1 = 20 + sw * 8, f2 = 20 - sw * 8;
  leg(g, 18, 27, f1 - 2, 36, PAL.blue);
  leg(g, 22, 27, f2 + 1, 36, PAL.blue);
  shoe(g, f1 - 1, 39, sw < 0);
  shoe(g, f2 + 2, 39, sw >= 0);
  rect(g, 26, 17 + sw * 2, 4, 2, PAL.skin);
  return c;
}

function bakeRun(phase) {
  // fast run: leg blur circle
  const [c, g] = mk(40, 40);
  hedgehogBody(g, { cy: 15 });
  // whirling leg blur
  ellipse(g, 20, 32, 9, 7, PAL.redD);
  ellipse(g, 20, 32, 7, 5, PAL.red);
  if (phase) {
    rect(g, 13, 28, 4, 2, PAL.white);
    rect(g, 23, 35, 4, 2, PAL.white);
  } else {
    rect(g, 23, 28, 4, 2, PAL.white);
    rect(g, 13, 35, 4, 2, PAL.white);
  }
  rect(g, 27, 14, 5, 2, PAL.skin);
  return c;
}

function bakeRoll(phase) {
  const [c, g] = mk(40, 40);
  disc(g, 20, 20, 13, PAL.blue);
  disc(g, 20, 20, 10, PAL.blueD);
  // rotating spike ticks
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + phase * 0.5;
    const x1 = 20 + Math.cos(a) * 7, y1 = 20 + Math.sin(a) * 7;
    const x2 = 20 + Math.cos(a) * 12, y2 = 20 + Math.sin(a) * 12;
    leg(g, x1, y1, x2, y2, PAL.blue);
  }
  disc(g, 20, 20, 4, PAL.skin);
  ellipse(g, 17, 16, 3, 2, PAL.white);
  return c;
}

function bakeSpring() {
  const [c, g] = mk(40, 40);
  hedgehogBody(g, { cy: 14 });
  rect(g, 24, 4, 3, 6, PAL.skin);  // arm up
  leg(g, 18, 24, 17, 35, PAL.blue);
  leg(g, 22, 24, 23, 35, PAL.blue);
  shoe(g, 17, 38, true);
  shoe(g, 24, 38, false);
  return c;
}

function bakeHurt() {
  const [c, g] = mk(40, 40);
  hedgehogBody(g, { cy: 16 });
  // splayed limbs
  rect(g, 8, 12, 6, 2, PAL.skin);
  rect(g, 27, 10, 6, 2, PAL.skin);
  leg(g, 17, 26, 10, 33, PAL.blue);
  leg(g, 23, 26, 30, 33, PAL.blue);
  shoe(g, 9, 36, true);
  shoe(g, 31, 36, false);
  rect(g, 25, 18, 3, 3, PAL.black); // open mouth
  return c;
}

// ---------------------------------------------------------------------------
// Badniks
// ---------------------------------------------------------------------------

function bakeCrab(phase) {
  const [c, g] = mk(36, 24);
  const o = phase ? 2 : 0;
  // legs
  leg(g, 8, 16, 4 + o, 22, PAL.redD);
  leg(g, 14, 17, 12, 22, PAL.redD);
  leg(g, 22, 17, 24, 22, PAL.redD);
  leg(g, 28, 16, 32 - o, 22, PAL.redD);
  // body
  ellipse(g, 18, 13, 11, 6, PAL.red);
  ellipse(g, 18, 12, 9, 4, '#f05838');
  // eyes on stalks
  rect(g, 12, 4, 2, 5, PAL.redD); rect(g, 22, 4, 2, 5, PAL.redD);
  disc(g, 13, 3, 2, PAL.white); disc(g, 23, 3, 2, PAL.white);
  px(g, 13, 3, PAL.black); px(g, 23, 3, PAL.black);
  // claws
  disc(g, 4, 12 - o, 4, PAL.red); disc(g, 32, 12 - o, 4, PAL.red);
  px(g, 2, 9 - o, PAL.black); px(g, 34, 9 - o, PAL.black);
  return c;
}

function bakeBuzzer(phase) {
  const [c, g] = mk(28, 20);
  // wings
  if (phase) { tri(g, 10, 8, 4, 0, 14, 6, '#c8d8f0'); tri(g, 16, 8, 22, 0, 12, 6, '#c8d8f0'); }
  else { tri(g, 10, 8, 2, 5, 14, 8, '#c8d8f0'); tri(g, 16, 8, 24, 5, 12, 8, '#c8d8f0'); }
  // body
  ellipse(g, 13, 12, 8, 5, PAL.purple);
  rect(g, 6, 10, 4, 3, '#c060e0');
  rect(g, 10, 10, 2, 5, PAL.black);
  rect(g, 14, 10, 2, 5, PAL.black);
  // eye + stinger
  disc(g, 20, 11, 3, PAL.white); px(g, 21, 11, PAL.black);
  tri(g, 4, 12, 0, 16, 7, 14, PAL.grey);
  return c;
}

function bakeSpiker(phase) {
  const [c, g] = mk(28, 22);
  // spikes on TOP: do not jump on this one
  for (let i = 0; i < 4; i++) tri(g, 4 + i * 6, 8, 7 + i * 6, 0, 10 + i * 6, 8, PAL.metal);
  ellipse(g, 14, 13, 11, 6, PAL.green);
  ellipse(g, 14, 12, 9, 4, '#40c850');
  disc(g, 8, 13, 2, PAL.white); px(g, 8, 13, PAL.black);
  disc(g, 20, 13, 2, PAL.white); px(g, 20, 13, PAL.black);
  // treads
  const o = phase ? 1 : 0;
  rect(g, 4, 19, 20, 3, PAL.black);
  for (let i = 0; i < 5; i++) px(g, 5 + i * 4 + o, 20, PAL.grey);
  return c;
}

function bakeBossPod(phase) {
  const [c, g] = mk(48, 40);
  // dome glass
  ellipse(g, 24, 12, 12, 10, '#78c8e8');
  ellipse(g, 24, 12, 10, 8, '#a8e0f0');
  // Dr. Robotmoore
  disc(g, 24, 12, 6, PAL.skin);
  rect(g, 18, 8, 12, 3, '#802010');       // shades
  rect(g, 19, 14, 10, 3, '#a04818');      // the moustache
  rect(g, 17, 15, 3, 2, '#a04818'); rect(g, 28, 15, 3, 2, '#a04818');
  // hull
  ellipse(g, 24, 24, 20, 9, PAL.metal);
  ellipse(g, 24, 23, 18, 7, '#c8d0e0');
  rect(g, 6, 22, 36, 2, '#e84828');
  // underside + jets
  ellipse(g, 24, 29, 14, 4, PAL.metalD);
  const f = phase ? 3 : 0;
  tri(g, 14, 32, 18, 32, 16, 38 + f, '#f8a828');
  tri(g, 30, 32, 34, 32, 32, 38 + f, '#f8a828');
  return c;
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

export function initSprites() {
  SPR.stand = bakeStand();
  SPR.walk = [bakeWalk(0), bakeWalk(1), bakeWalk(2), bakeWalk(3)];
  SPR.run = [bakeRun(0), bakeRun(1)];
  SPR.roll = [bakeRoll(0), bakeRoll(1), bakeRoll(2), bakeRoll(3)];
  SPR.spring = bakeSpring();
  SPR.hurt = bakeHurt();
  SPR.crab = [bakeCrab(0), bakeCrab(1)];
  SPR.buzzer = [bakeBuzzer(0), bakeBuzzer(1)];
  SPR.spiker = [bakeSpiker(0), bakeSpiker(1)];
  SPR.boss = [bakeBossPod(0), bakeBossPod(1)];
}

// Draw an image centered at (x,y), optionally x-flipped and rotated (rad).
export function drawCentered(ctx, img, x, y, flip = false, angle = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle) ctx.rotate(angle);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Objects (drawn immediately, cheap)
// ---------------------------------------------------------------------------

export function drawRing(ctx, x, y, frame) {
  const ph = (frame >> 3) & 3;
  const rx = [6, 4, 2, 4][ph];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = PAL.gold;
  for (let yy = -6; yy <= 6; yy++) {
    const s = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / 36)));
    ctx.fillRect(-s, yy, s * 2 + 1, 1);
  }
  if (rx > 2) {
    ctx.fillStyle = '#302000';
    for (let yy = -3; yy <= 3; yy++) {
      const s = Math.floor((rx - 3) * Math.sqrt(Math.max(0, 1 - (yy * yy) / 12)));
      if (rx - 3 > 0) ctx.fillRect(-s, yy, s * 2 + 1, 1);
    }
  }
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(-1, -5, 2, 2);
  ctx.restore();
}

export function drawMonitor(ctx, x, y, kind, broken, frame) {
  const L = Math.round(x - 12), T = Math.round(y - 13);
  if (broken) {
    ctx.fillStyle = PAL.metalD; ctx.fillRect(L + 2, T + 18, 20, 8);
    ctx.fillStyle = '#303040'; ctx.fillRect(L + 4, T + 20, 16, 4);
    return;
  }
  ctx.fillStyle = PAL.metalD; ctx.fillRect(L, T, 24, 22);
  ctx.fillStyle = PAL.metal; ctx.fillRect(L + 1, T + 1, 22, 18);
  ctx.fillStyle = '#182030'; ctx.fillRect(L + 4, T + 3, 16, 13);
  ctx.fillStyle = PAL.metalD;
  ctx.fillRect(L + 3, T + 22, 4, 4); ctx.fillRect(L + 17, T + 22, 4, 4);
  const cx = L + 12, cy = T + 9;
  if (frame % 40 < 32) {
    if (kind === 'ring10') {
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === 'oneup') {
      ctx.fillStyle = PAL.blue; ctx.fillRect(cx - 4, cy - 4, 8, 6);
      ctx.fillStyle = PAL.skin; ctx.fillRect(cx, cy - 2, 4, 3);
    } else if (kind === 'stars') {
      ctx.fillStyle = '#f8f858';
      ctx.fillRect(cx - 1, cy - 5, 2, 10); ctx.fillRect(cx - 5, cy - 1, 10, 2);
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
    } else if (kind === 'shoes') {
      ctx.fillStyle = PAL.red; ctx.fillRect(cx - 5, cy - 1, 10, 4);
      ctx.fillStyle = PAL.white; ctx.fillRect(cx - 1, cy - 1, 2, 4);
    } else if (kind === 'shield') {
      ctx.strokeStyle = '#40a0f8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#40a0f8'; ctx.fillRect(cx - 1, cy - 1, 3, 3);
    }
  }
}

export function drawSpring(ctx, x, y, color, squash) {
  const L = Math.round(x - 14), T = Math.round(y);
  const top = color === 'red' ? PAL.red : PAL.gold;
  const h = squash > 0 ? 4 : 10;
  ctx.fillStyle = PAL.metalD;
  ctx.fillRect(L + 4, T - 2, 20, 4);
  // coil
  ctx.fillStyle = PAL.grey;
  for (let i = 1; i <= 3; i++) ctx.fillRect(L + 7, T - 2 - (h * i) / 3, 14, 2);
  ctx.fillStyle = top;
  ctx.fillRect(L, T - h - 6, 28, 6);
  ctx.fillStyle = '#fff';
  ctx.fillRect(L + 2, T - h - 5, 24, 1);
}

export function drawSpikes(ctx, x, y, w) {
  const L = Math.round(x - w / 2), T = Math.round(y - 8);
  for (let i = 0; i < w; i += 8) {
    ctx.fillStyle = PAL.metal;
    ctx.beginPath();
    ctx.moveTo(L + i, T + 16); ctx.lineTo(L + i + 4, T); ctx.lineTo(L + i + 8, T + 16);
    ctx.fill();
    ctx.fillStyle = PAL.metalD;
    ctx.fillRect(L + i + 3, T + 4, 2, 12);
  }
  ctx.fillStyle = PAL.metalD; ctx.fillRect(L, T + 14, w, 3);
}

export function drawCheckpoint(ctx, x, y, active, frame) {
  const X = Math.round(x), B = Math.round(y + 24);
  ctx.fillStyle = PAL.metalD; ctx.fillRect(X - 2, B - 40, 4, 40);
  ctx.fillStyle = PAL.grey; ctx.fillRect(X - 1, B - 40, 1, 40);
  ctx.fillStyle = PAL.metalD; ctx.fillRect(X - 6, B - 2, 12, 2);
  const c = active ? (frame % 16 < 8 ? '#f83808' : '#f8a808') : '#2040c0';
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.arc(X, B - 44, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, B - 46, 2, 2);
}

export function drawSign(ctx, x, y, spinT, frame) {
  const X = Math.round(x), B = Math.round(y + 26);
  ctx.fillStyle = PAL.metalD; ctx.fillRect(X - 2, B - 30, 4, 30);
  // spinning plate
  const ph = spinT > 0 ? Math.cos(frame * 0.6) : 1;
  const w = Math.max(2, Math.abs(ph) * 24);
  const showFace = spinT <= 0 || ph > 0;
  ctx.fillStyle = showFace ? '#f0e0b0' : '#c04020';
  ctx.fillRect(X - w / 2, B - 46, w, 16);
  ctx.strokeStyle = PAL.metalD; ctx.strokeRect(X - w / 2 + 0.5, B - 45.5, w - 1, 15);
  if (showFace && w > 12) {
    // tiny hedgehog face
    ctx.fillStyle = PAL.blue; ctx.fillRect(X - 5, B - 43, 10, 8);
    ctx.fillStyle = PAL.skin; ctx.fillRect(X, B - 40, 4, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, B - 42, 3, 3);
  } else if (!showFace && w > 12) {
    ctx.fillStyle = '#f8d838'; ctx.fillRect(X - 4, B - 42, 8, 8);
    ctx.fillStyle = '#802010'; ctx.fillRect(X - 4, B - 38, 8, 2);
  }
}

export function drawDash(ctx, x, y, dir, frame) {
  const L = Math.round(x - 14), T = Math.round(y - 4);
  ctx.fillStyle = '#282830'; ctx.fillRect(L, T, 28, 8);
  const on = (frame >> 2) % 3;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === on ? '#f8e838' : '#907808';
    const bx = dir > 0 ? L + 3 + i * 9 : L + 21 - i * 9;
    ctx.beginPath();
    ctx.moveTo(bx, T + 1); ctx.lineTo(bx + 5 * dir, T + 4); ctx.lineTo(bx, T + 7);
    ctx.fill();
  }
}

export function drawPlat(ctx, x, y, theme) {
  const L = Math.round(x - 24), T = Math.round(y - 6);
  if (theme === 'hill') {
    ctx.fillStyle = '#a86830'; ctx.fillRect(L, T, 48, 12);
    ctx.fillStyle = '#c08040'; ctx.fillRect(L + 2, T + 2, 44, 8);
    ctx.fillStyle = PAL.green; ctx.fillRect(L, T, 48, 3);
  } else {
    ctx.fillStyle = '#38405c'; ctx.fillRect(L, T, 48, 12);
    ctx.fillStyle = '#525a78'; ctx.fillRect(L + 2, T + 2, 44, 8);
    ctx.fillStyle = '#40d8e8'; ctx.fillRect(L, T, 48, 2);
  }
}

export function drawBoom(ctx, x, y, t) {
  const r = 2 + t * 0.9;
  ctx.fillStyle = t % 4 < 2 ? '#f8e838' : '#f88028';
  ctx.beginPath(); ctx.arc(x, y, Math.max(1, r - t * 0.4), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.2;
    ctx.fillRect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r - 1, 2, 2);
  }
}

export function drawStars(ctx, x, y, frame) {
  for (let i = 0; i < 4; i++) {
    const a = frame * 0.18 + (i * Math.PI) / 2;
    const sx = x + Math.cos(a) * 18, sy = y + Math.sin(a * 1.3) * 16;
    ctx.fillStyle = i % 2 ? '#f8f858' : '#f8f8f8';
    ctx.fillRect(sx - 1, sy - 3, 2, 6);
    ctx.fillRect(sx - 3, sy - 1, 6, 2);
  }
}

export function drawShield(ctx, x, y, frame) {
  ctx.strokeStyle = frame % 8 < 4 ? 'rgba(64,160,248,0.8)' : 'rgba(120,200,248,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
}

// ---------------------------------------------------------------------------
// Terrain tiles: bake a 16x16 canvas per (tile id, theme, parity, topBits)
// ---------------------------------------------------------------------------

export const THEMES = {
  hill: { name: 'MOORE HILL ZONE' },
  chem: { name: 'CHEMICAL MOORE ZONE' },
};

export function bakeTerrainTile(m, theme, parity, topBits) {
  const [c, g] = mk(16, 16);
  for (let ly = 0; ly < 16; ly++) {
    for (let lx = 0; lx < 16; lx++) {
      const v = m[(ly << 4) | lx];
      if (!v) continue;
      const above1 = ly > 0 ? m[((ly - 1) << 4) | lx] : (topBits >> lx) & 1;
      const above2 = ly > 1 ? m[((ly - 2) << 4) | lx] : above1;
      let col;
      if (theme === 'hill') {
        if (!above1) col = '#30d048';
        else if (!above2) col = '#18a030';
        else {
          const ck = (((lx >> 3) ^ (ly >> 3) ^ parity) & 1);
          col = ck ? '#c08040' : '#a86830';
          if ((lx * 7 + ly * 13) % 29 === 0) col = '#8a5424';
        }
      } else {
        if (!above1) col = '#58e8e0';
        else if (!above2) col = '#2890a0';
        else {
          const ck = (((lx >> 3) ^ (ly >> 3) ^ parity) & 1);
          col = ck ? '#4a5270' : '#3e4560';
          if (lx % 8 === 3 && ly % 8 === 4) col = '#68729a';
        }
      }
      g.fillStyle = col;
      g.fillRect(lx, ly, 1, 1);
    }
  }
  return c;
}
