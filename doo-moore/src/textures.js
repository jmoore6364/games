// textures.js — all art is generated procedurally to offscreen canvases,
// then converted to packed Uint32 pixel buffers (0xAABBGGRR little-endian).
// Zero external assets.

const TS = 64; // wall/sprite texture size

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Convert a canvas region to { w, h, buf:Uint32Array } (native-endian packed RGBA)
function toBuf(canvas) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { w: canvas.width, h: canvas.height, buf: new Uint32Array(img.data.buffer.slice(0)) };
}

// small seeded RNG
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ---------------- WALL TEXTURES ----------------

function brickTex() {
  const c = mkCanvas(TS, TS), g = c.getContext('2d');
  const r = rng(1234);
  g.fillStyle = '#3a1410'; g.fillRect(0, 0, TS, TS); // mortar
  const bh = 16, bw = 32;
  for (let row = 0; row < TS / bh; row++) {
    const off = (row % 2) ? bw / 2 : 0;
    for (let bx = -bw; bx < TS; bx += bw) {
      const x = bx + off + 2, y = row * bh + 2, w = bw - 3, h = bh - 3;
      const base = 90 + (r() * 40 | 0);
      g.fillStyle = `rgb(${base + 40},${base - 10},${(base - 40) | 0})`;
      g.fillRect(x, y, w, h);
      // brick speckle
      for (let s = 0; s < 10; s++) {
        const sx = x + (r() * w | 0), sy = y + (r() * h | 0);
        const d = (r() * 30 - 15) | 0;
        g.fillStyle = `rgba(${d < 0 ? 0 : 60},${0},${0},0.25)`;
        g.fillRect(sx, sy, 2, 2);
      }
      // top highlight / bottom shadow
      g.fillStyle = 'rgba(255,180,120,0.15)'; g.fillRect(x, y, w, 2);
      g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(x, y + h - 2, w, 2);
    }
  }
  return toBuf(c);
}

function techTex() {
  const c = mkCanvas(TS, TS), g = c.getContext('2d');
  g.fillStyle = '#14181c'; g.fillRect(0, 0, TS, TS);
  // panel plates
  g.fillStyle = '#1d242b'; g.fillRect(3, 3, TS - 6, TS - 6);
  g.strokeStyle = '#0a0d10'; g.lineWidth = 2;
  g.strokeRect(3, 3, TS - 6, TS - 6);
  // horizontal seams
  for (let y = 16; y < TS; y += 16) {
    g.strokeStyle = '#0a0d10'; g.beginPath(); g.moveTo(3, y); g.lineTo(TS - 3, y); g.stroke();
    g.strokeStyle = 'rgba(120,200,220,0.10)'; g.beginPath(); g.moveTo(3, y + 1); g.lineTo(TS - 3, y + 1); g.stroke();
  }
  // rivets
  g.fillStyle = '#3a4650';
  for (const [x, y] of [[8, 8], [TS - 8, 8], [8, TS - 8], [TS - 8, TS - 8]]) {
    g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
    g.fillStyle = '#0c0f12'; g.beginPath(); g.arc(x, y, 1.2, 0, 7); g.fill();
    g.fillStyle = '#3a4650';
  }
  // glowing conduit
  g.fillStyle = '#1affd0';
  g.fillRect(TS / 2 - 2, 10, 4, TS - 20);
  g.fillStyle = 'rgba(26,255,208,0.25)';
  g.fillRect(TS / 2 - 5, 10, 10, TS - 20);
  // a little screen
  g.fillStyle = '#082018'; g.fillRect(TS - 22, 18, 14, 12);
  g.fillStyle = '#39ff9e'; g.fillRect(TS - 20, 20, 2, 8); g.fillRect(TS - 16, 24, 6, 2); g.fillRect(TS - 16, 20, 2, 4);
  return toBuf(c);
}

function stoneTex() {
  const c = mkCanvas(TS, TS), g = c.getContext('2d');
  const r = rng(777);
  g.fillStyle = '#3b3f44'; g.fillRect(0, 0, TS, TS);
  // irregular stone blocks
  const cells = [[0, 0, 30, 22], [30, 0, 34, 22], [0, 22, 22, 20], [22, 22, 42, 20], [0, 42, 40, 22], [40, 42, 24, 22]];
  for (const [x, y, w, h] of cells) {
    const base = 70 + (r() * 30 | 0);
    g.fillStyle = `rgb(${base},${base + 4},${base + 8})`;
    g.fillRect(x + 1, y + 1, w - 2, h - 2);
    for (let s = 0; s < 24; s++) {
      const d = (r() * 40 - 20) | 0;
      g.fillStyle = `rgba(${base + d},${base + d + 4},${base + d + 8},0.5)`;
      g.fillRect(x + 1 + (r() * (w - 2) | 0), y + 1 + (r() * (h - 2) | 0), 2, 2);
    }
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 1, y + 1, w - 2, 1);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 1, y + h - 2, w - 2, 1);
  }
  return toBuf(c);
}

function doorTex() {
  const c = mkCanvas(TS, TS), g = c.getContext('2d');
  g.fillStyle = '#5a5f66'; g.fillRect(0, 0, TS, TS);
  g.fillStyle = '#464b52'; g.fillRect(4, 2, TS - 8, TS - 4);
  // center seam
  g.fillStyle = '#23262b'; g.fillRect(TS / 2 - 1, 2, 2, TS - 4);
  // hazard stripes
  for (let i = -TS; i < TS; i += 14) {
    g.fillStyle = i % 28 === 0 ? '#e7c11a' : '#1a1a1a';
    g.beginPath();
    g.moveTo(i, 2); g.lineTo(i + 7, 2); g.lineTo(i + 7 + 12, TS - 2); g.lineTo(i + 12, TS - 2);
    g.closePath(); g.fill();
  }
  // frame
  g.strokeStyle = '#2c3036'; g.lineWidth = 4; g.strokeRect(4, 2, TS - 8, TS - 4);
  g.fillStyle = '#c8ccd2'; g.fillRect(4, 2, TS - 8, 3);
  // handle light
  g.fillStyle = '#ff4030'; g.beginPath(); g.arc(TS / 2 + 8, TS / 2, 3, 0, 7); g.fill();
  return toBuf(c);
}

function exitTex() {
  const c = mkCanvas(TS, TS), g = c.getContext('2d');
  g.fillStyle = '#062012'; g.fillRect(0, 0, TS, TS);
  g.fillStyle = '#0b3a22'; g.fillRect(3, 3, TS - 6, TS - 6);
  g.strokeStyle = '#0f5a34'; g.lineWidth = 3; g.strokeRect(3, 3, TS - 6, TS - 6);
  // glowing EXIT text
  g.fillStyle = '#26ff86';
  g.font = 'bold 20px "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#26ff86'; g.shadowBlur = 8;
  g.fillText('EXIT', TS / 2, 20);
  // down arrow
  g.beginPath();
  g.moveTo(TS / 2, TS - 8); g.lineTo(TS / 2 - 14, TS - 26); g.lineTo(TS / 2 - 5, TS - 26);
  g.lineTo(TS / 2 - 5, TS - 40); g.lineTo(TS / 2 + 5, TS - 40); g.lineTo(TS / 2 + 5, TS - 26);
  g.lineTo(TS / 2 + 14, TS - 26); g.closePath(); g.fill();
  g.shadowBlur = 0;
  return toBuf(c);
}

// ---------------- SPRITE HELPERS ----------------

// draw a sprite via a callback, return packed buffer with transparency preserved
function spriteFrom(draw, size = TS) {
  const c = mkCanvas(size, size), g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  draw(g, size);
  return toBuf(c);
}

// ---------------- IMP (demon) SPRITES ----------------
// Body drawn centered; feet near bottom. Several animation frames.

function drawImp(g, S, opt) {
  const cx = S / 2;
  const step = opt.step || 0;   // leg swing
  const arms = opt.arms || 0;   // 0 down, 1 attack raise
  const eye = opt.eye || '#ffdd22';
  const skin = opt.skin || '#7a3320';
  const skinD = opt.skinD || '#521f10';
  const belly = opt.belly || '#a9603b';

  // shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(cx, S - 5, 16, 5, 0, 0, 7); g.fill();

  // legs
  g.strokeStyle = skinD; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - 6, S - 26); g.lineTo(cx - 9 - step, S - 6);
  g.moveTo(cx + 6, S - 26); g.lineTo(cx + 9 + step, S - 6);
  g.stroke();

  // torso
  g.fillStyle = skin;
  g.beginPath(); g.ellipse(cx, S - 34, 16, 18, 0, 0, 7); g.fill();
  g.fillStyle = belly;
  g.beginPath(); g.ellipse(cx, S - 30, 9, 12, 0, 0, 7); g.fill();
  // ribs
  g.strokeStyle = skinD; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx - 7, S - 36 + i * 6); g.lineTo(cx + 7, S - 36 + i * 6); g.stroke(); }

  // arms + claws
  g.strokeStyle = skin; g.lineWidth = 7; g.lineCap = 'round';
  if (arms) {
    g.beginPath();
    g.moveTo(cx - 13, S - 42); g.lineTo(cx - 20, S - 54);
    g.moveTo(cx + 13, S - 42); g.lineTo(cx + 20, S - 54);
    g.stroke();
    // claw glow (charging)
    g.fillStyle = 'rgba(255,120,30,0.9)';
    g.beginPath(); g.arc(cx - 21, S - 56, 5, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + 21, S - 56, 5, 0, 7); g.fill();
  } else {
    g.beginPath();
    g.moveTo(cx - 13, S - 42); g.lineTo(cx - 18, S - 26);
    g.moveTo(cx + 13, S - 42); g.lineTo(cx + 18, S - 26);
    g.stroke();
  }

  // head
  g.fillStyle = skin;
  g.beginPath(); g.arc(cx, S - 56, 12, 0, 7); g.fill();
  // horns
  g.strokeStyle = '#e8dcc0'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - 8, S - 64); g.lineTo(cx - 15, S - 74);
  g.moveTo(cx + 8, S - 64); g.lineTo(cx + 15, S - 74);
  g.stroke();
  // eyes
  g.fillStyle = eye; g.shadowColor = eye; g.shadowBlur = 6;
  g.beginPath(); g.arc(cx - 5, S - 58, 3, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + 5, S - 58, 3, 0, 7); g.fill();
  g.shadowBlur = 0;
  // mouth / fangs
  g.fillStyle = '#2a0d06'; g.fillRect(cx - 6, S - 50, 12, 4);
  g.fillStyle = '#fff'; g.fillRect(cx - 5, S - 50, 2, 3); g.fillRect(cx + 3, S - 50, 2, 3);
}

function drawImpDead(g, S, phase) {
  const cx = S / 2;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(cx, S - 5, 20, 6, 0, 0, 7); g.fill();
  if (phase === 0) {
    // crumpling
    g.fillStyle = '#6a2c1a';
    g.beginPath(); g.ellipse(cx, S - 16, 18, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#8a1010';
    g.beginPath(); g.arc(cx - 6, S - 18, 5, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + 8, S - 22, 4, 0, 7); g.fill();
    g.fillStyle = '#521f10';
    g.beginPath(); g.arc(cx + 2, S - 24, 8, 0, 7); g.fill();
  } else {
    // flat gib pile
    g.fillStyle = '#5a2416';
    g.beginPath(); g.ellipse(cx, S - 8, 22, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#8a1010';
    for (const [dx, dy, rr] of [[-12, 0, 4], [-2, -3, 5], [10, 1, 4], [4, 2, 6], [16, -1, 3]]) {
      g.beginPath(); g.arc(cx + dx, S - 8 + dy, rr, 0, 7); g.fill();
    }
    g.fillStyle = '#e8dcc0'; // bone
    g.fillRect(cx - 4, S - 12, 3, 8); g.fillRect(cx + 6, S - 10, 2, 6);
  }
}

function buildImpFrames() {
  const base = { skin: '#7a3320', skinD: '#521f10', belly: '#a9603b', eye: '#ffdd22' };
  return {
    walk: [
      spriteFrom((g, S) => drawImp(g, S, { ...base, step: 4 })),
      spriteFrom((g, S) => drawImp(g, S, { ...base, step: -4 })),
    ],
    attack: spriteFrom((g, S) => drawImp(g, S, { ...base, arms: 1, eye: '#ff5a1a' })),
    hit: spriteFrom((g, S) => drawImp(g, S, { ...base, skin: '#c85a30', belly: '#e08050', eye: '#ffffff' })),
    dead: [
      spriteFrom((g, S) => drawImpDead(g, S, 0)),
      spriteFrom((g, S) => drawImpDead(g, S, 1)),
    ],
  };
}

// ---------------- PROJECTILE (fireball) ----------------
function buildFireball() {
  return spriteFrom((g, S) => {
    const cx = S / 2, cy = S / 2;
    g.fillStyle = 'rgba(255,120,20,0.25)';
    g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.fill();
    g.fillStyle = '#ff6a10';
    g.beginPath(); g.arc(cx, cy, 13, 0, 7); g.fill();
    g.fillStyle = '#ffc020';
    g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
    g.fillStyle = '#fff4c0';
    g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
  }, 40);
}

// ---------------- PICKUPS ----------------
function buildPickups() {
  const health = spriteFrom((g, S) => {
    const cx = S / 2;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx, S - 8, 12, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#e8ede8'; g.fillRect(cx - 12, S - 34, 24, 22);
    g.strokeStyle = '#b7bdb7'; g.lineWidth = 2; g.strokeRect(cx - 12, S - 34, 24, 22);
    g.fillStyle = '#d81028'; // red cross
    g.fillRect(cx - 3, S - 32, 6, 18); g.fillRect(cx - 9, S - 26, 18, 6);
  }, TS);
  const ammo = spriteFrom((g, S) => {
    const cx = S / 2;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx, S - 8, 12, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#7a5a20'; g.fillRect(cx - 12, S - 28, 24, 16);
    g.strokeStyle = '#c8a840'; g.lineWidth = 2; g.strokeRect(cx - 12, S - 28, 24, 16);
    g.fillStyle = '#e8c040';
    for (let i = 0; i < 4; i++) { g.fillRect(cx - 10 + i * 6, S - 26, 4, 12); }
    g.fillStyle = '#fff'; g.font = 'bold 8px monospace'; g.textAlign = 'center';
    g.fillText('AMMO', cx, S - 32);
  }, TS);
  return { health, ammo };
}

export function buildTextures() {
  // wall index matches map tile codes: 1 brick, 2 tech, 3 stone, 4 door, 5 exit
  const walls = [null, brickTex(), techTex(), stoneTex(), doorTex(), exitTex()];
  return {
    walls,
    imp: buildImpFrames(),
    fireball: buildFireball(),
    pickups: buildPickups(),
    TS,
  };
}
