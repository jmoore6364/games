// The Secret of Moore Island — room definitions.
// Painterly procedural backgrounds (layered dithered gradients, silhouettes,
// torch glow) in the MI1 night-dock palette: deep blues + warm browns/oranges.
// This module is Node-safe: painters only touch the ctx they are given.

export const VIEW_W = 320, VIEW_H = 140;
export const FLOOR_Y = 136; // deepest walkable y

// ------------------------------------------------------------- paint kit ----

function rc(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function dith(g, x, y, w, h, c1, c2) {
  rc(g, x, y, w, h, c1);
  g.fillStyle = c2;
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x + ((yy ^ x) & 1); xx < x + w; xx += 2) g.fillRect(xx, yy, 1, 1);
}

// banded, dithered vertical gradient — the signature night sky
function vgrad(g, x, y, w, h, stops) {
  const n = stops.length - 1;
  const bh = h / n;
  for (let i = 0; i < n; i++) {
    const by = y + i * bh;
    rc(g, x, by | 0, w, Math.ceil(bh), stops[i]);
    dith(g, x, (by + bh * 0.62) | 0, w, Math.ceil(bh * 0.38), stops[i], stops[i + 1]);
  }
  rc(g, x, (y + h - 2) | 0, w, 2, stops[n]);
}

function seeded(seed) {
  let s = (seed * 7919 + 17) & 0x7fffffff;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

function speckle(g, seed, x, y, w, h, c, n) {
  const rnd = seeded(seed);
  g.fillStyle = c;
  for (let i = 0; i < n; i++) g.fillRect(x + (rnd() * w) | 0, y + (rnd() * h) | 0, 1, 1);
}

function stars(g, seed, y0, y1, n = 60) {
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x = (rnd() * VIEW_W) | 0, y = (y0 + rnd() * (y1 - y0)) | 0;
    g.fillStyle = rnd() > 0.8 ? '#cfe0ff' : '#6f7fae';
    g.fillRect(x, y, 1, 1);
  }
}

function moon(g, x, y, r = 9) {
  g.globalAlpha = 0.08; g.fillStyle = '#9fc8e8';
  g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill();
  g.globalAlpha = 0.12; g.fillStyle = '#bfe0f8';
  g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill();
  g.globalAlpha = 1;
  g.fillStyle = '#e8f2ff';
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = '#c8d8ec';
  g.fillRect(x - 3, y - 2, 2, 2); g.fillRect(x + 2, y + 3, 3, 2); g.fillRect(x + 1, y - 4, 2, 1);
}

function glow(g, x, y, r, color, a = 0.16) {
  for (let i = 3; i >= 1; i--) {
    g.globalAlpha = a / i;
    g.fillStyle = color;
    g.beginPath(); g.arc(x, y, r * i / 2.2, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

function flame(g, x, y, t, s = 1) {
  const f = Math.sin(t * 11 + x) * 1.4 + Math.sin(t * 23 + x * 3) * 0.8;
  glow(g, x, y - 3 * s, 16 * s + f, '#ff9a3c', 0.14);
  g.fillStyle = '#ff7a1a';
  g.beginPath();
  g.moveTo(x - 3 * s, y);
  g.quadraticCurveTo(x - 3 * s + f * 0.4, y - 6 * s, x + f * 0.5, y - 9 * s - f);
  g.quadraticCurveTo(x + 3 * s + f * 0.3, y - 5 * s, x + 3 * s, y);
  g.fill();
  g.fillStyle = '#ffd27a';
  g.beginPath();
  g.moveTo(x - 1.5 * s, y);
  g.quadraticCurveTo(x + f * 0.3, y - 4 * s - f * 0.7, x + f * 0.4, y - 5.5 * s);
  g.quadraticCurveTo(x + 1.6 * s, y - 3 * s, x + 1.5 * s, y);
  g.fill();
}

function torch(g, x, yBase, t, h = 26) {
  rc(g, x - 1, yBase - h, 3, h, '#3a2413');
  rc(g, x - 1, yBase - h, 1, h, '#1c1008');
  rc(g, x - 3, yBase - h - 2, 7, 4, '#241608');
  flame(g, x + 0.5, yBase - h - 2, t);
}

// silhouetted tall ship on the horizon
function shipSil(g, x, y, s = 1, c = '#0b1026') {
  g.fillStyle = c;
  g.beginPath(); // hull
  g.moveTo(x - 26 * s, y);
  g.quadraticCurveTo(x - 22 * s, y + 7 * s, x - 12 * s, y + 8 * s);
  g.lineTo(x + 16 * s, y + 8 * s);
  g.quadraticCurveTo(x + 26 * s, y + 6 * s, x + 30 * s, y - 2 * s);
  g.lineTo(x + 24 * s, y); g.closePath(); g.fill();
  rc(g, x - 14 * s, y - 26 * s, 1.6 * s, 26 * s, c); // masts
  rc(g, x + 4 * s, y - 32 * s, 1.6 * s, 32 * s, c);
  rc(g, x + 18 * s, y - 20 * s, 1.4 * s, 20 * s, c);
  const yard = (mx, my, w) => rc(g, mx - w / 2, my, w, 1.2 * s, c);
  yard(x - 13 * s, y - 23 * s, 18 * s); yard(x - 13 * s, y - 15 * s, 22 * s);
  yard(x + 5 * s, y - 29 * s, 20 * s); yard(x + 5 * s, y - 19 * s, 26 * s); yard(x + 5 * s, y - 9 * s, 28 * s);
  yard(x + 19 * s, y - 16 * s, 14 * s);
  g.strokeStyle = c; g.lineWidth = 0.7 * s;
  g.beginPath(); g.moveTo(x - 26 * s, y - 2 * s); g.lineTo(x - 13 * s, y - 24 * s); g.lineTo(x + 5 * s, y - 30 * s); g.lineTo(x + 30 * s, y - 3 * s); g.stroke();
}

function seaNight(g, y0, y1, t, seed = 4) {
  vgrad(g, 0, y0, VIEW_W, y1 - y0, ['#12224e', '#0d1838', '#0a1129']);
  const rnd = seeded(seed);
  for (let i = 0; i < 34; i++) {
    const y = y0 + 2 + rnd() * (y1 - y0 - 3);
    const x = (rnd() * VIEW_W + Math.sin(t * 0.8 + y) * 4 + 320) % VIEW_W;
    const w = 3 + rnd() * 10;
    g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.4 + i);
    rc(g, x, y | 0, w, 1, i % 4 ? '#3f5fa8' : '#7fa8e0');
  }
  g.globalAlpha = 1;
}

function planksH(g, y0, y1, c1 = '#4a2e18', c2 = '#3a2312', gap = 7) {
  rc(g, 0, y0, VIEW_W, y1 - y0, c1);
  for (let y = y0; y < y1; y += gap) {
    rc(g, 0, y, VIEW_W, 1, c2);
    const rnd = seeded(y * 31);
    for (let i = 0; i < 6; i++) rc(g, (rnd() * VIEW_W) | 0, y + 1 + ((rnd() * (gap - 2)) | 0), 6 + rnd() * 10, 1, '#54371e');
  }
  speckle(g, y0 * 7 + 3, 0, y0, VIEW_W, y1 - y0, '#2c1a0c', 160);
}

function crate(g, x, y, w = 22, h = 16, c = '#6b4423') {
  rc(g, x, y - h, w, h, c);
  rc(g, x, y - h, w, 2, '#8a5a2b'); rc(g, x, y - 2, w, 2, '#3a2312');
  rc(g, x, y - h, 2, h, '#8a5a2b'); rc(g, x + w - 2, y - h, 2, h, '#3a2312');
  g.strokeStyle = '#3a2312'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x + 2, y - h + 2); g.lineTo(x + w - 2, y - 2); g.moveTo(x + w - 2, y - h + 2); g.lineTo(x + 2, y - 2); g.stroke();
}

function barrel(g, x, y, w = 14, h = 18) {
  g.fillStyle = '#5a3a1e';
  g.beginPath(); g.ellipse(x + w / 2, y - h / 2, w / 2 + 1.5, h / 2, 0, 0, 7); g.fill();
  rc(g, x + 1, y - h + 3, w - 2, 2, '#2c1a0c'); rc(g, x + 1, y - 5, w - 2, 2, '#2c1a0c');
  rc(g, x + w / 2 - 1, y - h + 1, 2, h - 2, '#71482a');
}

function palm(g, x, y, s = 1, seed = 2, dark = false) {
  const rnd = seeded(seed);
  const trunk = dark ? '#1a1626' : '#4a3220';
  const leaf = dark ? '#101a2e' : '#1e4a30';
  const leaf2 = dark ? '#0c1424' : '#153822';
  g.strokeStyle = trunk; g.lineWidth = 3 * s;
  const lean = (rnd() - 0.5) * 18 * s;
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.4, y - 20 * s, x + lean, y - 38 * s); g.stroke();
  const tx = x + lean, ty = y - 38 * s;
  for (let i = 0; i < 6; i++) {
    const a = -0.3 - i * 0.5 + rnd() * 0.25;
    const lx = Math.cos(a) * 20 * s, ly = Math.sin(a) * 12 * s - 4;
    g.strokeStyle = i % 2 ? leaf : leaf2; g.lineWidth = 2.5 * s;
    g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + lx * 0.6, ty + ly * 0.2 - 6 * s, tx + lx, ty + ly + 6 * s); g.stroke();
  }
}

function building(g, x, y, w, h, wallC, roofC, trimC) {
  rc(g, x, y - h, w, h, wallC);
  speckle(g, x * 13 + w, x, y - h, w, h, trimC, w * h / 22);
  g.fillStyle = roofC;
  g.beginPath(); g.moveTo(x - 4, y - h); g.lineTo(x + w / 2, y - h - 14); g.lineTo(x + w + 4, y - h); g.closePath(); g.fill();
}

function litWindow(g, x, y, w = 10, h = 12, c = '#ffcf6a') {
  rc(g, x - 1, y - 1, w + 2, h + 2, '#241608');
  rc(g, x, y, w, h, c);
  rc(g, x + w / 2 - 0.5, y, 1, h, '#a06820'); rc(g, x, y + h / 2 - 0.5, w, 1, '#a06820');
  glow(g, x + w / 2, y + h / 2, w * 1.3, c, 0.08);
}

function doorway(g, x, y, w = 16, h = 26, c = '#2c1a0c', lit = null) {
  rc(g, x - 2, y - h - 2, w + 4, h + 2, '#1c1008');
  rc(g, x, y - h, w, h, c);
  if (lit) { rc(g, x + 1, y - h + 1, w - 2, h - 1, lit); }
}

function mountains(g, y, c, seed = 9, amp = 22) {
  const rnd = seeded(seed);
  g.fillStyle = c;
  g.beginPath(); g.moveTo(0, y);
  let x = 0;
  while (x < VIEW_W) { x += 14 + rnd() * 26; g.lineTo(x, y - rnd() * amp); }
  g.lineTo(VIEW_W, y); g.lineTo(VIEW_W, y + 40); g.lineTo(0, y + 40);
  g.closePath(); g.fill();
}

function jungleWall(g, x, y0, w, h, seed, c1 = '#0f2a1c', c2 = '#163a26', c3 = '#1e4a30') {
  rc(g, x, y0, w, h, c1);
  const rnd = seeded(seed);
  for (let i = 0; i < w / 3; i++) {
    const bx = x + rnd() * w, by = y0 + rnd() * h;
    g.fillStyle = [c1, c2, c3][(i % 3)];
    g.beginPath(); g.ellipse(bx, by, 4 + rnd() * 7, 3 + rnd() * 5, 0, 0, 7); g.fill();
  }
}

function firepit(g, x, y, t) {
  rc(g, x - 10, y - 2, 20, 3, '#22150a');
  g.fillStyle = '#3a2312';
  for (let i = 0; i < 5; i++) rc(g, x - 8 + i * 3.4, y - 4, 3, 3, i % 2 ? '#3a2312' : '#241608');
  flame(g, x, y - 3, t, 1.3);
}

// ---------------------------------------------------------------- rooms ----
// hotspots: {id, name, x,y,w,h, wx,wy(walk target), def(ault verb), face}
// exits are hotspots with exit:{room,x,y}
// actor placements: {id, x, y, face} with optional if(S)

export const ROOMS = {

  // ======================================================== SCURVY REEF ====
  dock: {
    name: 'the Scurvy Reef docks',
    horizon: 86, sMin: 0.62,
    walk: [[6, 96, 308, 40], [128, 88, 120, 12]],
    actors: [
      { id: 'dockmaster', x: 258, y: 108, face: 'l' },
      { id: 'seagull', x: 36, y: 90 },
    ],
    hotspots: [
      { id: 'exitStreet', name: 'the town', x: 300, y: 60, w: 20, h: 70, wx: 308, wy: 120, def: 'walk', exit: { room: 'street', x: 22, y: 120 } },
      { id: 'moorehen', name: 'The Leaky Moorehen', x: 96, y: 34, w: 66, h: 54, wx: 138, wy: 92, def: 'use', if: S => S.flags.hasShip },
      { id: 'ships', name: 'distant ships', x: 180, y: 40, w: 90, h: 34, wx: 200, wy: 96, def: 'lookat' },
      { id: 'water', name: 'the sea', x: 0, y: 74, w: 130, h: 18, wx: 60, wy: 100, def: 'lookat' },
      { id: 'fogbank', name: 'bank of sea fog', x: 0, y: 56, w: 72, h: 22, wx: 24, wy: 100, def: 'lookat' },
      { id: 'moon', name: 'the moon', x: 270, y: 6, w: 26, h: 22, wx: 250, wy: 110, def: 'lookat' },
      { id: 'dockTorch', name: 'torch', x: 118, y: 52, w: 12, h: 40, wx: 128, wy: 102, def: 'lookat' },
      { id: 'poster', name: 'tattered poster', x: 296, y: 76, w: 18, h: 20, wx: 296, wy: 112, def: 'pickup', if: S => !S.inv.includes('poster') },
      { id: 'crate', name: 'nailed-shut crate', x: 176, y: 96, w: 26, h: 20, wx: 172, wy: 120, def: 'open' },
      { id: 'bollard', name: 'mooring bollard', x: 148, y: 106, w: 10, h: 12, wx: 158, wy: 118, def: 'lookat' },
      { id: 'planks', name: 'weathered planks', x: 30, y: 122, w: 80, h: 14, wx: 70, wy: 128, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 66, ['#04060f', '#081026', '#101d44', '#1c3468']);
      stars(g, 11, 0, 44, 70);
      moon(g, 283, 16, 9);
      // far shore + anchored ships
      mountains(g, 66, '#0a0f24', 5, 12);
      shipSil(g, 210, 62, 0.9); shipSil(g, 262, 64, 0.6);
      if (S && S.flags.hasShip) { // the Moorehen, moored at the pier
        shipSil(g, 128, 66, 1.05, '#141a34');
        rc(g, 104, 38, 46, 26, '#2c2418'); // patched sail w/ Stan ad
        rc(g, 104, 38, 46, 2, '#1a1408');
        g.fillStyle = '#c8a040'; g.font = '7px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
        g.fillText('STAN\'S!', 127, 46);
      }
      seaNight(g, 66, 96, t, 4);
      // fog bank drifting at left
      const fx = Math.sin(t * 0.3) * 5;
      g.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? '#26314e' : '#303c5c';
        g.beginPath(); g.ellipse(30 + i * 16 + fx, 66 + i * 4, 34 - i * 4, 7, 0, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      // pier
      planksH(g, 96, VIEW_H);
      rc(g, 0, 94, VIEW_W, 3, '#2c1a0c');
      for (let x = 12; x < VIEW_W; x += 46) { rc(g, x, 96, 5, 44, '#33200f'); rc(g, x, 96, 2, 44, '#1e1206'); }
      // upper pier arm to ship
      planksH(g, 86, 96, '#412818', '#301d0d');
      // props
      crate(g, 176, 116); barrel(g, 210, 118);
      rc(g, 146, 104, 12, 12, '#241608'); rc(g, 147, 102, 10, 3, '#3a2312'); // bollard
      g.strokeStyle = '#241608'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(152, 104); g.quadraticCurveTo(140, 96, 132, 74); g.stroke(); // mooring rope
      torch(g, 128, 100, t, 34); torch(g, 236, 100, t + 3, 34);
      // poster on shed wall right
      rc(g, 288, 60, 32, 52, '#33200f'); rc(g, 288, 60, 32, 3, '#1e1206'); rc(g, 288, 58, 32, 3, '#452c14');
      if (!S || !S.inv.includes('poster')) {
        rc(g, 295, 74, 18, 22, '#c8b890'); rc(g, 297, 77, 14, 2, '#5a4a30');
        rc(g, 297, 81, 14, 1, '#7a6a48'); rc(g, 297, 84, 12, 1, '#7a6a48'); rc(g, 297, 87, 13, 1, '#7a6a48');
      }
    },
  },

  street: {
    name: 'Lowtide Street',
    horizon: 84, sMin: 0.6,
    walk: [[8, 96, 304, 40], [40, 88, 240, 12]],
    actors: [
      { id: 'pirate', x: 210, y: 116, face: 'l', if: S => !S.flags.trial1 },
      { id: 'cat', x: 60, y: 100 },
    ],
    hotspots: [
      { id: 'exitDock', name: 'the docks', x: 0, y: 60, w: 16, h: 70, wx: 12, wy: 120, def: 'walk', exit: { room: 'dock', x: 296, y: 120 } },
      { id: 'tavernDoor', name: 'The Scurvy Dog Tavern', x: 34, y: 56, w: 24, h: 34, wx: 46, wy: 96, def: 'open', exit: { room: 'tavern', x: 160, y: 126 } },
      { id: 'storeDoor', name: 'Ezekiel\'s Emporium', x: 130, y: 60, w: 20, h: 30, wx: 140, wy: 96, def: 'open', exit: { room: 'store', x: 160, y: 126 } },
      { id: 'voodooDoor', name: 'glowing voodoo shack', x: 208, y: 62, w: 20, h: 28, wx: 218, wy: 96, def: 'open', exit: { room: 'voodoo', x: 160, y: 126 } },
      { id: 'archway', name: 'archway to the mansion', x: 302, y: 54, w: 18, h: 76, wx: 308, wy: 118, def: 'walk', exit: { room: 'mansionExt', x: 24, y: 122 } },
      { id: 'boatyardPath', name: 'path to Stanmoore\'s boatyard', x: 258, y: 76, w: 34, h: 16, wx: 272, wy: 90, def: 'walk', exit: { room: 'boatyard', x: 36, y: 124 } },
      { id: 'overlookPath', name: 'steep path up the bluff', x: 74, y: 74, w: 30, h: 16, wx: 88, wy: 90, def: 'walk', exit: { room: 'overlook', x: 30, y: 126 } },
      { id: 'wantedPoster', name: 'WANTED poster', x: 164, y: 66, w: 16, h: 20, wx: 170, wy: 98, def: 'lookat' },
      { id: 'streetTorch', name: 'street torch', x: 240, y: 56, w: 10, h: 36, wx: 244, wy: 100, def: 'lookat' },
      { id: 'cobbles', name: 'cobblestones', x: 20, y: 116, w: 90, h: 20, wx: 60, wy: 124, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 60, ['#04060f', '#0a1330', '#16234f']);
      stars(g, 21, 0, 40, 46);
      // rooftops silhouette behind
      mountains(g, 58, '#0a0f24', 31, 16);
      // buildings row
      building(g, 24, 90, 48, 40, '#3a2a18', '#241608', '#2c1e0e'); // tavern
      doorway(g, 34, 90, 24, 34, '#1c1008', '#54360f');
      litWindow(g, 58, 62, 10, 10);
      g.fillStyle = '#d8b060'; g.font = '6px monospace'; g.textAlign = 'center';
      rc(g, 26, 50, 44, 10, '#241608'); g.fillText('SCURVY DOG', 48, 52);
      building(g, 118, 90, 44, 34, '#41301c', '#2c1a0c', '#332210');
      doorway(g, 130, 90, 20, 30, '#241608');
      litWindow(g, 152, 66, 8, 10, '#ffb85a');
      rc(g, 120, 52, 40, 9, '#241608'); g.fillStyle = '#c8a468'; g.fillText('EMPORIUM', 140, 54);
      building(g, 200, 90, 38, 30, '#2a1e30', '#1a1020', '#231830'); // voodoo — purplish
      doorway(g, 208, 90, 20, 28, '#180e20', '#7a3aa8');
      glow(g, 218, 78, 16, '#b060ff', 0.10);
      // bluff path (left) and boatyard path (right)
      dith(g, 74, 76, 32, 14, '#2c2418', '#3a3020');
      dith(g, 256, 78, 38, 12, '#2c2418', '#3a3020');
      // archway right
      rc(g, 300, 50, 20, 80, '#241a10');
      g.fillStyle = '#0e1830'; g.beginPath(); g.arc(320, 96, 16, Math.PI / 2, Math.PI * 1.5); g.fill();
      // street
      dith(g, 0, 96, VIEW_W, 44, '#33281a', '#2a2014');
      const rnd = seeded(77);
      for (let i = 0; i < 90; i++) {
        const x = rnd() * VIEW_W, y = 98 + rnd() * 38, w = 4 + rnd() * 5;
        rc(g, x, y, w, 2.5, i % 3 ? '#3e3220' : '#241c10');
      }
      rc(g, 0, 94, VIEW_W, 3, '#1c140a');
      // wanted poster on wall
      rc(g, 163, 65, 18, 22, '#c0b088'); rc(g, 165, 67, 14, 3, '#4a3a20');
      rc(g, 167, 72, 10, 8, '#4a5a4a'); rc(g, 166, 82, 12, 1, '#6a5a38');
      torch(g, 244, 92, t, 34); torch(g, 96, 92, t + 1.7, 32);
    },
  },

  tavern: {
    name: 'The Scurvy Dog Tavern',
    horizon: 88, sMin: 0.68,
    walk: [[16, 98, 288, 38], [120, 90, 120, 12]],
    actors: [
      { id: 'bartender', x: 62, y: 96, face: 'r' },
      { id: 'council1', x: 236, y: 104, face: 'l' },
      { id: 'council2', x: 266, y: 110, face: 'l' },
      { id: 'council3', x: 292, y: 104, face: 'l' },
    ],
    hotspots: [
      { id: 'exitTavern', name: 'the street', x: 146, y: 118, w: 36, h: 20, wx: 162, wy: 130, def: 'walk', exit: { room: 'street', x: 46, y: 106 } },
      { id: 'council', name: 'the Pirate Council', x: 224, y: 60, w: 84, h: 48, wx: 218, wy: 116, def: 'talkto' },
      { id: 'mug', name: 'lucky mug', x: 30, y: 56, w: 12, h: 10, wx: 44, wy: 104, def: 'pickup', if: S => !S.inv.includes('mug') && !S.flags.mugGone },
      { id: 'emptyBottle', name: 'empty grog bottle', x: 130, y: 82, w: 8, h: 12, wx: 132, wy: 106, def: 'pickup', if: S => !S.inv.includes('emptyBottle') },
      { id: 'grogBarrels', name: 'grog barrels', x: 92, y: 70, w: 34, h: 30, wx: 104, wy: 106, def: 'open' },
      { id: 'fireplace', name: 'fireplace', x: 180, y: 62, w: 30, h: 34, wx: 190, wy: 106, def: 'lookat' },
      { id: 'chandelier', name: 'wheel chandelier', x: 140, y: 6, w: 44, h: 18, wx: 160, wy: 110, def: 'lookat' },
      { id: 'cookDoor', name: 'kitchen door', x: 6, y: 60, w: 16, h: 34, wx: 20, wy: 102, def: 'open' },
      { id: 'grogStain', name: 'suspicious stain', x: 210, y: 118, w: 22, h: 10, wx: 216, wy: 128, def: 'lookat' },
    ],
    paint(g, S, t) {
      // warm wood interior
      vgrad(g, 0, 0, VIEW_W, 96, ['#241407', '#33200f', '#41301c']);
      // beams
      for (let x = 30; x < VIEW_W; x += 70) rc(g, x, 0, 6, 96, '#1c1008');
      rc(g, 0, 26, VIEW_W, 4, '#1c1008');
      // chandelier
      rc(g, 158, 0, 3, 12, '#241608');
      g.fillStyle = '#2c1a0c'; g.beginPath(); g.ellipse(160, 16, 22, 5, 0, 0, 7); g.fill();
      for (let i = -2; i <= 2; i++) flame(g, 160 + i * 9, 13, t + i, 0.55);
      glow(g, 160, 14, 30, '#ffb85a', 0.06);
      // bar at left
      rc(g, 8, 66, 74, 34, '#54371e'); rc(g, 8, 64, 74, 4, '#6b4423'); rc(g, 8, 96, 74, 4, '#2c1a0c');
      rc(g, 10, 34, 70, 26, '#1c1008'); // shelf
      for (let i = 0; i < 6; i++) rc(g, 14 + i * 11, 40 + (i % 2) * 8, 5, 12, ['#3f5fa8', '#7a3aa8', '#8a5a2b'][i % 3]);
      if (!S || (!S.inv.includes('mug') && !S.flags.mugGone)) { rc(g, 30, 56, 10, 8, '#b0b8c8'); rc(g, 40, 58, 3, 4, '#b0b8c8'); }
      // grog barrels
      barrel(g, 92, 100, 15, 26); barrel(g, 109, 100, 15, 26);
      g.fillStyle = '#c04030'; g.font = '5px monospace'; g.textAlign = 'center'; g.fillText('EMPTY', 108, 80);
      // fireplace
      rc(g, 178, 60, 34, 38, '#332210'); rc(g, 184, 68, 22, 28, '#140a04');
      flame(g, 195, 94, t, 1.6); glow(g, 195, 84, 26, '#ff9a3c', 0.09);
      // council table
      g.fillStyle = '#4a2e18'; g.beginPath(); g.ellipse(264, 104, 44, 12, 0, 0, 7); g.fill();
      rc(g, 226, 104, 6, 20, '#33200f'); rc(g, 296, 104, 6, 20, '#33200f');
      rc(g, 246, 96, 8, 6, '#b0b8c8'); rc(g, 270, 94, 8, 6, '#b0b8c8'); // tankards
      // one lonely bottle on a small table
      rc(g, 122, 92, 22, 4, '#3a2312'); rc(g, 128, 96, 4, 12, '#2c1a0c');
      if (!S || !S.inv.includes('emptyBottle')) { rc(g, 130, 82, 6, 10, '#2e6a48'); rc(g, 132, 78, 2, 5, '#2e6a48'); }
      // floor
      planksH(g, 98, VIEW_H, '#3a2312', '#2c1a0c');
      // door (exit) as floor mat + light
      dith(g, 146, 120, 36, 16, '#54371e', '#41301c');
      // kitchen door
      doorway(g, 6, 94, 16, 34, '#241608');
      rc(g, 208, 120, 24, 8, '#2a1a20');
    },
  },

  store: {
    name: "Ezekiel's Emporium",
    horizon: 90, sMin: 0.7,
    walk: [[20, 100, 280, 36]],
    actors: [{ id: 'shopkeeper', x: 236, y: 100, face: 'l' }],
    hotspots: [
      { id: 'exitStore', name: 'the street', x: 140, y: 120, w: 40, h: 18, wx: 160, wy: 130, def: 'walk', exit: { room: 'street', x: 140, y: 106 } },
      { id: 'limes', name: 'crate of limes', x: 258, y: 76, w: 26, h: 16, wx: 250, wy: 108, def: 'pickup' },
      { id: 'swordRack', name: 'sword display', x: 24, y: 44, w: 36, h: 34, wx: 40, wy: 104, def: 'lookat' },
      { id: 'crackerBarrel', name: 'cracker barrel', x: 74, y: 84, w: 18, h: 22, wx: 86, wy: 110, def: 'open' },
      { id: 'shelves', name: 'crowded shelves', x: 108, y: 34, w: 90, h: 48, wx: 150, wy: 104, def: 'lookat' },
      { id: 'shipBell', name: 'brass ship bell', x: 218, y: 40, w: 14, h: 14, wx: 220, wy: 104, def: 'use' },
      { id: 'anchor', name: 'decorative anchor', x: 288, y: 46, w: 22, h: 40, wx: 284, wy: 110, def: 'pull' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 100, ['#2c1e10', '#3a2a18', '#463320']);
      for (let x = 10; x < VIEW_W; x += 84) rc(g, x, 0, 5, 100, '#241608');
      // shelves wall
      rc(g, 106, 32, 96, 52, '#2c1a0c');
      for (let r = 0; r < 3; r++) {
        rc(g, 108, 44 + r * 16, 92, 2, '#54371e');
        const rnd = seeded(r * 5 + 2);
        for (let i = 0; i < 8; i++) {
          const x = 110 + i * 11;
          g.fillStyle = ['#8a5a2b', '#3f5fa8', '#5a7a3a', '#a04030', '#b0985a'][(i + r) % 5];
          g.fillRect(x, 36 + r * 16 - rnd() * 3, 7, 8 + rnd() * 3);
        }
      }
      // sword display (empty pegs)
      rc(g, 22, 42, 40, 38, '#241608'); rc(g, 24, 44, 36, 34, '#3a2a14');
      for (let i = 0; i < 3; i++) { rc(g, 28, 50 + i * 10, 4, 3, '#54371e'); rc(g, 52, 50 + i * 10, 4, 3, '#54371e'); }
      g.fillStyle = '#c8a468'; g.font = '5px monospace'; g.textAlign = 'center'; g.fillText('SOLD OUT', 42, 60);
      // counter
      rc(g, 216, 84, 96, 20, '#54371e'); rc(g, 216, 82, 96, 3, '#6b4423');
      // limes crate on counter
      crate(g, 256, 92, 28, 14, '#5a3a1e');
      g.fillStyle = '#7ab840';
      for (let i = 0; i < 6; i++) g.fillRect(259 + (i % 3) * 8, 80 + ((i / 3) | 0) * 5, 5, 4);
      // bell
      rc(g, 222, 38, 3, 6, '#241608'); g.fillStyle = '#c8a030';
      g.beginPath(); g.moveTo(218, 52); g.quadraticCurveTo(223, 38, 228, 52); g.closePath(); g.fill();
      // anchor
      g.strokeStyle = '#6a6f7a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(298, 48); g.lineTo(298, 80); g.moveTo(288, 72); g.quadraticCurveTo(298, 86, 308, 72); g.moveTo(292, 54); g.lineTo(304, 54); g.stroke();
      // cracker barrel
      barrel(g, 74, 106, 18, 24);
      // lamps
      litWindow(g, 66, 30, 8, 8, '#ffcf6a'); litWindow(g, 246, 28, 8, 8, '#ffcf6a');
      planksH(g, 100, VIEW_H, '#41301c', '#33200f');
      dith(g, 140, 122, 40, 14, '#54371e', '#41301c');
    },
  },

  voodoo: {
    name: 'the House of Mystic Moorings',
    horizon: 92, sMin: 0.7,
    walk: [[24, 100, 272, 34]],
    actors: [{ id: 'voodoolady', x: 232, y: 98, face: 'l' }],
    hotspots: [
      { id: 'exitVoodoo', name: 'the street', x: 140, y: 120, w: 40, h: 16, wx: 160, wy: 130, def: 'walk', exit: { room: 'street', x: 218, y: 106 } },
      { id: 'comb', name: 'silver comb', x: 186, y: 84, w: 12, h: 8, wx: 190, wy: 108, def: 'pickup', if: S => !S.inv.includes('comb') },
      { id: 'cauldron', name: 'bubbling cauldron', x: 60, y: 76, w: 34, h: 28, wx: 80, wy: 110, def: 'lookat' },
      { id: 'skulls', name: 'shelf of skulls', x: 24, y: 30, w: 60, h: 30, wx: 46, wy: 104, def: 'lookat' },
      { id: 'crystalBall', name: 'crystal ball', x: 148, y: 70, w: 18, h: 16, wx: 152, wy: 106, def: 'lookat' },
      { id: 'chickenMobile', name: 'chicken-foot mobile', x: 120, y: 6, w: 30, h: 26, wx: 132, wy: 104, def: 'lookat' },
      { id: 'curtain', name: 'beaded curtain', x: 282, y: 40, w: 24, h: 56, wx: 278, wy: 108, def: 'open' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 100, ['#140a20', '#1e1030', '#2a1a40']);
      speckle(g, 3, 0, 0, VIEW_W, 60, '#4a2a70', 60);
      // skull shelf
      rc(g, 22, 28, 64, 34, '#1a1024');
      for (let i = 0; i < 4; i++) {
        const x = 28 + i * 15;
        rc(g, x, 36, 10, 9, '#c8c0a8'); rc(g, x + 1, 39, 3, 3, '#140a20'); rc(g, x + 6, 39, 3, 3, '#140a20');
        rc(g, x + 2, 44, 6, 2, '#8a8268');
      }
      glow(g, 54, 40, 20, '#b060ff', 0.06);
      // cauldron
      g.fillStyle = '#101018'; g.beginPath(); g.ellipse(77, 92, 20, 12, 0, 0, 7); g.fill();
      rc(g, 59, 82, 36, 12, '#181820');
      g.fillStyle = '#40d870'; g.beginPath(); g.ellipse(77, 82, 16, 4, 0, 0, 7); g.fill();
      for (let i = 0; i < 3; i++) {
        const bp = (t * 1.3 + i * 0.7) % 1;
        g.globalAlpha = 1 - bp; g.fillStyle = '#70f0a0';
        g.fillRect(69 + i * 8, 78 - bp * 14, 3, 3);
      }
      g.globalAlpha = 1;
      flame(g, 77, 104, t, 0.8); glow(g, 77, 80, 22, '#40d870', 0.08);
      // crystal ball table
      rc(g, 142, 84, 30, 20, '#2a1a40'); rc(g, 142, 82, 30, 3, '#3a2a54');
      g.fillStyle = '#8ab0ff'; g.beginPath(); g.arc(157, 76, 8, 0, 7); g.fill();
      g.fillStyle = '#c8e0ff'; g.fillRect(153, 71, 3, 3);
      glow(g, 157, 76, 14, '#8ab0ff', 0.1);
      if (!S || !S.inv.includes('comb')) { rc(g, 186, 84, 11, 3, '#c8ccd8'); for (let i = 0; i < 5; i++) rc(g, 187 + i * 2, 87, 1, 4, '#c8ccd8'); }
      // chicken-foot mobile
      rc(g, 134, 0, 2, 10, '#54371e');
      g.strokeStyle = '#c8a468'; g.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        const a = Math.sin(t * 0.8 + i) * 0.2;
        const x = 135 + i * 12 + a * 8;
        g.beginPath(); g.moveTo(135, 10); g.lineTo(x, 22); g.stroke();
        g.fillStyle = '#d8a040'; g.fillRect(x - 2, 22, 4, 6);
        g.fillRect(x - 4, 27, 3, 2); g.fillRect(x + 1, 27, 3, 2);
      }
      // beaded curtain
      for (let i = 0; i < 6; i++) {
        const x = 284 + i * 4;
        for (let y = 40; y < 96; y += 4) rc(g, x + (((y >> 2) + i) & 1), y, 2, 3, i % 2 ? '#7a3aa8' : '#b060ff');
      }
      // candles
      rc(g, 110, 88, 4, 10, '#d8d0b8'); flame(g, 112, 87, t + 2, 0.5);
      rc(g, 262, 84, 4, 12, '#d8d0b8'); flame(g, 264, 83, t + 4, 0.5);
      planksH(g, 100, VIEW_H, '#2a1a2e', '#20121e', 8);
      dith(g, 140, 122, 40, 14, '#3a2a44', '#2a1a2e');
    },
  },

  mansionExt: {
    name: "the Governor's mansion",
    horizon: 84, sMin: 0.6,
    walk: [[10, 94, 300, 42]],
    actors: [
      { id: 'butler', x: 216, y: 96, face: 'l' },
      { id: 'dog', x: 120, y: 112, face: 'r' },
    ],
    hotspots: [
      { id: 'exitMansion', name: 'the street', x: 0, y: 60, w: 16, h: 76, wx: 12, wy: 122, def: 'walk', exit: { room: 'street', x: 300, y: 118 } },
      { id: 'mansionDoor', name: 'mansion door', x: 226, y: 54, w: 22, h: 38, wx: 226, wy: 98, def: 'open', exit: { room: 'mansionInt', x: 160, y: 126 }, gated: true },
      { id: 'mandrakePatch', name: 'mandrake patch', x: 44, y: 96, w: 34, h: 14, wx: 60, wy: 116, def: 'lookat' },
      { id: 'fountain', name: 'parrot-shaped fountain', x: 150, y: 62, w: 34, h: 34, wx: 160, wy: 108, def: 'lookat' },
      { id: 'topiary', name: 'topiary shaped like a kraken', x: 96, y: 56, w: 30, h: 38, wx: 106, wy: 104, def: 'lookat' },
      { id: 'gate', name: 'wrought-iron gate', x: 12, y: 60, w: 22, h: 36, wx: 30, wy: 108, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 58, ['#04060f', '#0a1330', '#18265a']);
      stars(g, 41, 0, 40, 40);
      moon(g, 42, 18, 8);
      // mansion facade right
      rc(g, 196, 30, 124, 66, '#3a3450');
      rc(g, 196, 30, 124, 4, '#282440');
      g.fillStyle = '#282440'; g.beginPath(); g.moveTo(192, 30); g.lineTo(258, 10); g.lineTo(324, 30); g.closePath(); g.fill();
      for (let i = 0; i < 3; i++) litWindow(g, 206 + i * 38, 42, 12, 14, '#ffdf9a');
      doorway(g, 226, 92, 22, 38, '#1a1626');
      rc(g, 222, 50, 2, 44, '#d8d4e8'); rc(g, 252, 50, 2, 44, '#d8d4e8'); // columns
      rc(g, 218, 92, 40, 4, '#c8c4d8');
      // garden
      dith(g, 0, 94, VIEW_W, 46, '#16301e', '#1e402a');
      // hedge along back
      jungleWall(g, 0, 74, 196, 22, 8, '#12301c', '#183c24', '#204a2c');
      // gate at left
      g.strokeStyle = '#2a2a34'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(14 + i * 5, 60); g.lineTo(14 + i * 5, 96); g.stroke(); }
      rc(g, 12, 62, 24, 2, '#2a2a34'); rc(g, 12, 88, 24, 2, '#2a2a34');
      // topiary kraken
      g.fillStyle = '#1e4a30';
      g.beginPath(); g.ellipse(111, 70, 13, 12, 0, 0, 7); g.fill();
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.moveTo(104 + i * 5, 80);
        g.quadraticCurveTo(100 + i * 6 + Math.sin(i * 2) * 6, 88, 102 + i * 6, 94); g.lineTo(106 + i * 5, 82); g.fill();
      }
      rc(g, 105, 66, 3, 3, '#0c2414'); rc(g, 114, 66, 3, 3, '#0c2414');
      // fountain: stone parrot spitting water
      g.fillStyle = '#8a8aa0'; g.beginPath(); g.ellipse(167, 92, 20, 6, 0, 0, 7); g.fill();
      rc(g, 163, 70, 8, 22, '#7a7a90');
      g.fillStyle = '#9a9ab0'; g.beginPath(); g.arc(167, 66, 6, 0, 7); g.fill();
      rc(g, 172, 64, 5, 3, '#8a8aa0'); // beak
      g.strokeStyle = '#7fa8e0'; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const p = (t * 1.5 + i / 3) % 1;
        g.globalAlpha = 1 - p;
        g.beginPath(); g.moveTo(177, 65 + p * 20); g.lineTo(179 + p * 6, 68 + p * 22); g.stroke();
      }
      g.globalAlpha = 1;
      // mandrake patch
      dith(g, 42, 96, 38, 14, '#241a10', '#2c2014');
      g.fillStyle = '#4a8a3a';
      for (let i = 0; i < 5; i++) {
        const x = 48 + i * 7;
        g.fillRect(x, 96 - 3, 1, 4); g.fillRect(x - 2, 94, 5, 2);
      }
      torch(g, 190, 96, t, 30); torch(g, 262, 96, t + 2, 30);
      // path
      dith(g, 0, 112, VIEW_W, 10, '#3a3020', '#2c2418');
    },
  },

  mansionInt: {
    name: 'the mansion parlor',
    horizon: 92, sMin: 0.72,
    walk: [[24, 100, 272, 34]],
    actors: [{ id: 'governor', x: 226, y: 100, face: 'l' }],
    hotspots: [
      { id: 'exitParlor', name: 'the courtyard', x: 140, y: 120, w: 40, h: 16, wx: 160, wy: 130, def: 'walk', exit: { room: 'mansionExt', x: 226, y: 104 } },
      { id: 'perch', name: 'empty parrot perch', x: 150, y: 48, w: 20, h: 44, wx: 156, wy: 106, def: 'lookat' },
      { id: 'portrait', name: 'portrait of Governors past', x: 52, y: 26, w: 30, h: 38, wx: 64, wy: 104, def: 'lookat' },
      { id: 'globe', name: 'globe of the Tri-Island Sea', x: 100, y: 72, w: 22, h: 26, wx: 110, wy: 108, def: 'use' },
      { id: 'chandelier2', name: 'crystal chandelier', x: 200, y: 4, w: 40, h: 22, wx: 214, wy: 108, def: 'lookat' },
      { id: 'desk', name: 'governor\'s desk', x: 252, y: 78, w: 52, h: 22, wx: 258, wy: 110, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 100, ['#2a2440', '#332c4e', '#3c345c']);
      // wainscoting
      rc(g, 0, 76, VIEW_W, 24, '#41301c'); rc(g, 0, 76, VIEW_W, 3, '#54371e');
      // portrait
      rc(g, 48, 22, 38, 46, '#8a6a20'); rc(g, 52, 26, 30, 38, '#241830');
      rc(g, 60, 34, 14, 12, '#d8b090'); rc(g, 58, 46, 18, 14, '#5a2a2a'); // a stern ancestor
      rc(g, 62, 38, 3, 2, '#241830'); rc(g, 69, 38, 3, 2, '#241830'); rc(g, 63, 43, 8, 1, '#8a5a4a');
      // chandelier
      rc(g, 219, 0, 2, 8, '#c8c4d8');
      g.fillStyle = '#d8d4ec'; g.beginPath(); g.ellipse(220, 12, 20, 4, 0, 0, 7); g.fill();
      for (let i = -2; i <= 2; i++) { rc(g, 219 + i * 8, 8, 2, 5, '#e8e4f8'); flame(g, 220 + i * 8, 8, t + i, 0.4); }
      glow(g, 220, 10, 26, '#ffe0a0', 0.07);
      // parrot perch
      rc(g, 158, 50, 3, 44, '#8a6a20');
      rc(g, 146, 50, 28, 3, '#8a6a20');
      g.strokeStyle = '#8a6a20'; g.lineWidth = 2; g.beginPath(); g.arc(160, 42, 9, 0.3, Math.PI - 0.3); g.stroke();
      // globe
      rc(g, 108, 88, 8, 10, '#41301c');
      g.fillStyle = '#2a5a8a'; g.beginPath(); g.arc(112, 80, 10, 0, 7); g.fill();
      g.fillStyle = '#4a8a4a'; g.fillRect(106, 76, 6, 4); g.fillRect(114, 82, 6, 3); g.fillRect(110, 71, 4, 3);
      g.strokeStyle = '#c8a030'; g.lineWidth = 1; g.beginPath(); g.arc(112, 80, 11, -0.6, 2.2); g.stroke();
      // desk
      rc(g, 250, 82, 56, 20, '#54371e'); rc(g, 250, 80, 56, 3, '#6b4423');
      rc(g, 258, 74, 12, 6, '#e8e0c8'); rc(g, 284, 72, 4, 8, '#241608'); // papers, quill
      // rug
      g.fillStyle = '#7a2a3a'; g.beginPath(); g.ellipse(160, 118, 70, 14, 0, 0, 7); g.fill();
      g.strokeStyle = '#c8a030'; g.beginPath(); g.ellipse(160, 118, 62, 11, 0, 0, 7); g.stroke();
      planksH(g, 100, VIEW_H, '#4a3524', '#3a2814');
      g.fillStyle = '#7a2a3a'; g.beginPath(); g.ellipse(160, 118, 70, 14, 0, 0, 7); g.fill();
      g.strokeStyle = '#c8a030'; g.lineWidth = 1; g.beginPath(); g.ellipse(160, 118, 62, 11, 0, 0, 7); g.stroke();
      dith(g, 140, 124, 40, 12, '#41301c', '#33200f');
    },
  },

  boatyard: {
    name: "Stan's Previously-Owned Vessels",
    horizon: 82, sMin: 0.6,
    walk: [[12, 94, 296, 42]],
    actors: [{ id: 'stan', x: 232, y: 104, face: 'l' }],
    hotspots: [
      { id: 'exitYard', name: 'the street', x: 0, y: 60, w: 16, h: 76, wx: 12, wy: 122, def: 'walk', exit: { room: 'street', x: 272, y: 96 } },
      { id: 'bin', name: 'lost-and-found bin', x: 60, y: 92, w: 26, h: 20, wx: 78, wy: 118, def: 'open' },
      { id: 'wreck1', name: 'the "Barely Floats"', x: 96, y: 44, w: 60, h: 46, wx: 120, wy: 104, def: 'lookat' },
      { id: 'wreck2', name: 'the "Sea Colander"', x: 170, y: 52, w: 50, h: 38, wx: 186, wy: 104, def: 'lookat' },
      { id: 'pennants', name: 'sun-bleached pennants', x: 40, y: 20, w: 240, h: 16, wx: 160, wy: 110, def: 'lookat' },
      { id: 'yardSign', name: 'enormous sign', x: 244, y: 18, w: 66, h: 30, wx: 258, wy: 106, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 62, ['#04060f', '#0a1330', '#16234f', '#23386e']);
      stars(g, 61, 0, 34, 40);
      seaNight(g, 62, 80, t, 6);
      // beached wreck silhouettes
      g.fillStyle = '#141a2e';
      g.beginPath(); g.moveTo(96, 90); g.quadraticCurveTo(126, 96, 156, 88); g.lineTo(150, 62); g.quadraticCurveTo(126, 54, 104, 60); g.closePath(); g.fill();
      rc(g, 124, 30, 3, 34, '#141a2e');
      rc(g, 110, 42, 30, 2, '#141a2e');
      g.fillStyle = '#1a2238';
      g.beginPath(); g.moveTo(170, 90); g.quadraticCurveTo(196, 96, 220, 86); g.lineTo(214, 64); g.quadraticCurveTo(192, 58, 174, 66); g.closePath(); g.fill();
      rc(g, 192, 38, 3, 28, '#1a2238');
      // holes in the Sea Colander
      g.fillStyle = '#0a1129'; g.fillRect(184, 72, 6, 6); g.fillRect(200, 76, 5, 5); g.fillRect(176, 78, 4, 4);
      // big sign
      rc(g, 252, 42, 4, 54, '#33200f'); rc(g, 296, 42, 4, 54, '#33200f');
      rc(g, 242, 16, 70, 32, '#c8a030'); rc(g, 244, 18, 66, 28, '#241608');
      g.fillStyle = '#ffd27a'; g.font = '7px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText("STAN'S", 277, 21);
      g.font = '5px monospace';
      g.fillText('PREVIOUSLY-OWNED', 277, 31); g.fillText('VESSELS', 277, 38);
      glow(g, 277, 30, 30, '#ffcf6a', 0.06);
      // pennant string
      g.strokeStyle = '#54371e'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(20, 30); g.quadraticCurveTo(160, 44, 300, 26); g.stroke();
      for (let i = 0; i < 14; i++) {
        const x = 26 + i * 20, y = 31 + Math.sin((x / 300) * Math.PI) * 10;
        g.fillStyle = ['#a04030', '#c8a030', '#3f5fa8', '#5a7a3a'][i % 4];
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 1); g.lineTo(x + 4, y + 9); g.closePath(); g.fill();
      }
      // sand lot
      dith(g, 0, 84, VIEW_W, 56, '#3a3222', '#2e2818');
      speckle(g, 15, 0, 86, VIEW_W, 50, '#4a4230', 120);
      // lost-and-found bin
      crate(g, 58, 112, 30, 18, '#5a4423');
      g.fillStyle = '#c8a468'; g.font = '4px monospace'; g.fillText('LOST+FOUND', 73, 100);
      torch(g, 30, 92, t, 30); torch(g, 288, 100, t + 1, 30);
    },
  },

  overlook: {
    name: 'the bluff overlook',
    horizon: 80, sMin: 0.6,
    walk: [[16, 92, 288, 44]],
    actors: [{ id: 'mistress', x: 244, y: 104, face: 'l' }],
    hotspots: [
      { id: 'exitBluff', name: 'the path down', x: 0, y: 70, w: 18, h: 66, wx: 14, wy: 122, def: 'walk', exit: { room: 'street', x: 88, y: 96 } },
      { id: 'dummy', name: 'training dummy', x: 150, y: 62, w: 24, h: 42, wx: 162, wy: 112, def: 'lookat' },
      { id: 'swordRack2', name: 'rack of practice swords', x: 196, y: 68, w: 30, h: 30, wx: 204, wy: 110, def: 'lookat' },
      { id: 'view', name: 'view of the harbor', x: 20, y: 30, w: 200, h: 28, wx: 90, wy: 100, def: 'lookat' },
      { id: 'bigTree', name: 'gnarled fig tree', x: 62, y: 24, w: 44, h: 62, wx: 84, wy: 100, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 58, ['#04060f', '#0a1330', '#16234f']);
      stars(g, 71, 0, 36, 56); moon(g, 260, 14, 8);
      // harbor far below
      seaNight(g, 58, 74, t, 8);
      shipSil(g, 70, 62, 0.4); shipSil(g, 150, 64, 0.3);
      speckle(g, 73, 20, 66, 120, 6, '#ffcf6a', 12); // town lights
      // cliff edge
      g.fillStyle = '#231a10';
      g.beginPath(); g.moveTo(0, 88); g.lineTo(40, 80); g.lineTo(120, 84); g.lineTo(240, 78); g.lineTo(320, 84); g.lineTo(320, 140); g.lineTo(0, 140); g.closePath(); g.fill();
      dith(g, 0, 92, VIEW_W, 48, '#2c2214', '#231a10');
      speckle(g, 75, 0, 92, VIEW_W, 46, '#3a2e1c', 130);
      // gnarled tree
      g.strokeStyle = '#1c1008'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(84, 92); g.quadraticCurveTo(78, 60, 88, 40); g.stroke();
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(86, 58); g.quadraticCurveTo(102, 48, 110, 36); g.moveTo(84, 48); g.quadraticCurveTo(70, 40, 64, 30); g.stroke();
      g.fillStyle = '#14301e';
      g.beginPath(); g.ellipse(88, 30, 26, 13, 0, 0, 7); g.fill();
      g.fillStyle = '#1c422a';
      g.beginPath(); g.ellipse(76, 24, 14, 8, 0, 0, 7); g.fill();
      // training dummy
      rc(g, 160, 66, 4, 40, '#54371e');
      rc(g, 150, 72, 24, 4, '#54371e');
      g.fillStyle = '#8a7a58'; g.beginPath(); g.arc(162, 62, 6, 0, 7); g.fill();
      rc(g, 154, 76, 16, 14, '#6a5a3a');
      g.fillStyle = '#a04030'; g.fillRect(159, 60, 2, 2); g.fillRect(165, 60, 2, 2);
      speckle(g, 91, 152, 74, 20, 18, '#3a2e1c', 24); // sword nicks
      // sword rack
      rc(g, 196, 70, 3, 28, '#33200f'); rc(g, 224, 70, 3, 28, '#33200f'); rc(g, 196, 70, 30, 3, '#33200f');
      for (let i = 0; i < 4; i++) { rc(g, 201 + i * 6, 74, 2, 20, '#8a8fa0'); rc(g, 200 + i * 6, 92, 4, 3, '#54371e'); }
      torch(g, 140, 96, t, 30); torch(g, 280, 98, t + 2.4, 30);
    },
  },

  // ============================================================= AT SEA ====
  shipDeck: {
    name: 'aboard The Leaky Moorehen',
    horizon: 82, sMin: 0.66,
    walk: [[24, 94, 272, 40]],
    actors: [],
    hotspots: [
      { id: 'wheel', name: "ship's wheel", x: 240, y: 62, w: 30, h: 34, wx: 236, wy: 108, def: 'use' },
      { id: 'gangplank', name: 'gangplank ashore', x: 6, y: 88, w: 28, h: 30, wx: 26, wy: 116, def: 'walk', exit: { room: 'dock', x: 140, y: 100 }, if: S => !S.flags.atSea },
      { id: 'sail', name: 'patched sail', x: 120, y: 4, w: 80, h: 54, wx: 160, wy: 104, def: 'lookat' },
      { id: 'mast', name: 'mainmast', x: 154, y: 30, w: 12, h: 66, wx: 172, wy: 108, def: 'lookat' },
      { id: 'shipCannon', name: 'rusty cannon', x: 66, y: 76, w: 34, h: 22, wx: 88, wy: 112, def: 'use' },
      { id: 'crowsNest', name: "crow's nest", x: 146, y: 0, w: 28, h: 16, wx: 168, wy: 106, def: 'lookat' },
      { id: 'shipRail', name: 'railing', x: 0, y: 68, w: 60, h: 12, wx: 40, wy: 104, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 66, ['#050914', '#0b142e', '#152452']);
      stars(g, 81, 0, 46, 60); moon(g, 36, 16, 8);
      seaNight(g, 66, 88, t, 12);
      // deck
      planksH(g, 88, VIEW_H, '#4a2e18', '#3a2312');
      g.fillStyle = '#2c1a0c'; g.beginPath(); g.moveTo(0, 88); g.lineTo(320, 84); g.lineTo(320, 88); g.lineTo(0, 92); g.fill();
      // rail
      for (let x = 4; x < 130; x += 18) rc(g, x, 70, 4, 20, '#33200f');
      rc(g, 0, 68, 130, 4, '#54371e');
      for (let x = 210; x < 320; x += 18) rc(g, x, 70, 4, 20, '#33200f');
      rc(g, 210, 68, 110, 4, '#54371e');
      // mast + sail
      rc(g, 158, 0, 6, 98, '#3a2312'); rc(g, 158, 0, 2, 98, '#241608');
      rc(g, 120, 8, 80, 3, '#241608');
      g.fillStyle = '#b0a488';
      g.beginPath(); g.moveTo(122, 11); g.quadraticCurveTo(160, 22 + Math.sin(t) * 2, 198, 11); g.lineTo(194, 52); g.quadraticCurveTo(160, 60, 126, 52); g.closePath(); g.fill();
      g.fillStyle = '#8a8068'; g.fillRect(140, 26, 12, 10); g.fillRect(168, 38, 10, 8); // patches
      g.fillStyle = '#a04030'; g.font = '6px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText("STAN'S!", 160, 30);
      // crow's nest
      rc(g, 148, 2, 24, 8, '#33200f'); rc(g, 148, 0, 24, 3, '#54371e');
      // wheel
      rc(g, 250, 78, 5, 22, '#33200f');
      g.strokeStyle = '#6b4423'; g.lineWidth = 3;
      const wob = S && S.flags.atSea ? Math.sin(t * 1.2) * 0.3 : 0;
      g.beginPath(); g.arc(252, 72, 12, 0, 7); g.stroke();
      g.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 4 + wob;
        g.beginPath(); g.moveTo(252 - Math.cos(a) * 15, 72 - Math.sin(a) * 15); g.lineTo(252 + Math.cos(a) * 15, 72 + Math.sin(a) * 15); g.stroke();
      }
      // cannon
      rc(g, 68, 88, 26, 10, '#2a2a34'); rc(g, 60, 84, 20, 8, '#34343e');
      rc(g, 70, 96, 8, 8, '#33200f'); rc(g, 86, 96, 8, 8, '#33200f');
      // gangplank when docked
      if (!S || !S.flags.atSea) { rc(g, 2, 92, 34, 6, '#54371e'); rc(g, 2, 96, 34, 2, '#33200f'); }
      // lantern
      rc(g, 300, 60, 6, 8, '#241608'); flame(g, 303, 64, t, 0.6); glow(g, 303, 62, 16, '#ffb85a', 0.08);
    },
  },

  map: {
    name: 'the open sea',
    horizon: 20, sMin: 1, noActor: true,
    walk: [[0, 0, 320, 140]],
    actors: [],
    hotspots: [
      { id: 'mapReef', name: 'Scurvy Reef', x: 18, y: 84, w: 58, h: 40, wx: 40, wy: 100, def: 'use' },
      { id: 'mapBeach', name: 'Moore Island landing', x: 196, y: 40, w: 50, h: 34, wx: 210, wy: 50, def: 'use' },
      { id: 'mapGhostShip', name: 'anchored ghost ship', x: 258, y: 96, w: 46, h: 30, wx: 270, wy: 104, def: 'use', if: S => S.flags.ghostShipFound },
    ],
    paint(g, S, t) {
      // a captain's chart
      rc(g, 0, 0, VIEW_W, VIEW_H, '#0a1129');
      vgrad(g, 0, 0, VIEW_W, VIEW_H, ['#101d40', '#0d1734', '#0a1129']);
      speckle(g, 99, 0, 0, VIEW_W, VIEW_H, '#1c2c58', 300);
      // compass rose
      g.strokeStyle = '#2c3e6e'; g.lineWidth = 1;
      g.beginPath(); g.arc(160, 70, 26, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(160, 40); g.lineTo(160, 100); g.moveTo(130, 70); g.lineTo(190, 70); g.stroke();
      g.fillStyle = '#3c5088'; g.font = '6px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('N', 160, 32);
      // Scurvy Reef (bottom-left island)
      g.fillStyle = '#2c2418';
      g.beginPath(); g.ellipse(46, 104, 32, 16, 0, 0, 7); g.fill();
      g.fillStyle = '#3a3020'; g.beginPath(); g.ellipse(40, 100, 20, 9, 0, 0, 7); g.fill();
      speckle(g, 103, 26, 94, 40, 14, '#ffcf6a', 10);
      palm(g, 66, 102, 0.5, 3, true);
      g.fillStyle = '#c8a468'; g.font = '5px monospace';
      g.fillText('SCURVY REEF', 46, 124);
      // Moore Island (top-right, bigger, jungly)
      g.fillStyle = '#16301e';
      g.beginPath(); g.ellipse(226, 54, 42, 22, -0.2, 0, 7); g.fill();
      g.fillStyle = '#1e402a'; g.beginPath(); g.ellipse(232, 48, 26, 12, 0, 0, 7); g.fill();
      g.fillStyle = '#2c2418'; g.beginPath(); g.ellipse(204, 62, 12, 5, 0, 0, 7); g.fill(); // beach
      palm(g, 216, 44, 0.5, 5, true); palm(g, 244, 48, 0.45, 7, true);
      g.fillStyle = '#8ac878'; g.fillText('MOORE ISLAND', 228, 80);
      // ghost ship anchorage
      if (S && S.flags.ghostShipFound) {
        glow(g, 280, 106, 20, '#40d870', 0.12);
        shipSil(g, 280, 104, 0.5, '#1e5a3c');
        g.fillStyle = '#70f0a0'; g.fillText('??? ', 280, 122);
      }
      // your ship marker sails between
      const sx = S && S.flags.mapShipX != null ? S.flags.mapShipX : 96;
      const sy = S && S.flags.mapShipY != null ? S.flags.mapShipY : 88;
      shipSil(g, sx, sy + Math.sin(t * 1.4) * 1.5, 0.35, '#c8a468');
      // dotted route
      g.fillStyle = '#3c5088';
      for (let i = 0; i < 14; i++) {
        const p = i / 13;
        g.fillRect(70 + p * 120, 96 - p * 40 + Math.sin(p * 6) * 6, 2, 2);
      }
      g.fillStyle = '#6f7fae'; g.font = '6px monospace';
      g.fillText('~ chart of the Moore Sea ~', 160, 6);
    },
  },

  // ======================================================== MOORE ISLAND ====
  jungle: {
    name: 'a jungle fork',
    horizon: 84, sMin: 0.62,
    walk: [[14, 94, 292, 42], [120, 86, 90, 12]],
    actors: [],
    hotspots: [
      { id: 'exitBeach', name: 'back to the beach', x: 0, y: 66, w: 16, h: 70, wx: 12, wy: 122, def: 'walk', exit: { room: 'map', x: 0, y: 0 } },
      { id: 'villagePath', name: 'path with tiny footprints', x: 288, y: 66, w: 32, h: 60, wx: 300, wy: 116, def: 'walk', exit: { room: 'village', x: 30, y: 122 } },
      { id: 'hermitPath', name: 'overgrown trail', x: 128, y: 76, w: 40, h: 16, wx: 148, wy: 90, def: 'walk', exit: { room: 'hermit', x: 160, y: 128 } },
      { id: 'tikiDoor', name: 'carved tiki door', x: 210, y: 48, w: 30, h: 44, wx: 218, wy: 100, def: 'open', exit: { room: 'grotto', x: 40, y: 122 }, gated: true },
      { id: 'bananaTree', name: 'banana tree', x: 52, y: 20, w: 34, h: 70, wx: 68, wy: 104, def: 'lookat' },
      { id: 'bananas', name: 'bunch of bananas', x: 64, y: 40, w: 14, h: 14, wx: 68, wy: 104, def: 'pickup', if: S => !S.inv.includes('banana') },
      { id: 'flowers', name: 'moonflowers', x: 96, y: 100, w: 30, h: 14, wx: 108, wy: 118, def: 'lookat' },
      { id: 'idol', name: 'mossy stone idol', x: 172, y: 66, w: 20, h: 28, wx: 178, wy: 102, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 50, ['#04060f', '#081a2e', '#0e2a3e']);
      stars(g, 111, 0, 30, 30);
      jungleWall(g, 0, 30, VIEW_W, 64, 12);
      // canopy overhang
      jungleWall(g, 0, 0, VIEW_W, 26, 13, '#0a2014', '#0f2a1c', '#12301e');
      // banana tree
      palm(g, 68, 96, 1.1, 21);
      g.fillStyle = '#c8b840';
      if (!S || !S.inv.includes('banana')) for (let i = 0; i < 4; i++) g.fillRect(66 + i * 3, 42 + (i % 2) * 3, 3, 8);
      palm(g, 290, 92, 0.9, 23); palm(g, 132, 88, 0.7, 25);
      // tiki door in rock face
      rc(g, 200, 44, 52, 50, '#2c2822');
      speckle(g, 117, 200, 44, 52, 50, '#3a362e', 60);
      const open = S && S.flags.tikiOpen;
      rc(g, 212, 50, 26, 42, open ? '#0c0a14' : '#4a3a22');
      if (!open) {
        g.fillStyle = '#2c2014';
        rc(g, 216, 56, 6, 6, '#2c2014'); rc(g, 228, 56, 6, 6, '#2c2014'); // eyes
        rc(g, 218, 70, 14, 4, '#2c2014'); // mouth
        for (let i = 0; i < 5; i++) rc(g, 214 + i * 5, 84, 3, 6, '#2c2014'); // teeth
        rc(g, 222, 46, 6, 8, '#5a4a2c');
      } else glow(g, 225, 70, 18, '#40d870', 0.1);
      // idol
      rc(g, 174, 70, 16, 24, '#3a4a3a');
      rc(g, 177, 74, 4, 4, '#1a2a1a'); rc(g, 184, 74, 4, 4, '#1a2a1a'); rc(g, 178, 84, 8, 3, '#1a2a1a');
      speckle(g, 119, 174, 70, 16, 24, '#4a6a4a', 20);
      // ground
      dith(g, 0, 92, VIEW_W, 48, '#1c2814', '#16200f');
      speckle(g, 121, 0, 94, VIEW_W, 44, '#26361c', 160);
      // paths
      dith(g, 126, 78, 44, 12, '#2c2418', '#3a3020');
      dith(g, 282, 70, 38, 60, '#2c2418', '#3a3020');
      // moonflowers
      g.fillStyle = '#b8c8ff';
      for (let i = 0; i < 5; i++) {
        const x = 98 + i * 6, y = 104 + (i % 2) * 5;
        g.fillRect(x, y, 3, 3); g.fillStyle = '#e8f0ff'; g.fillRect(x + 1, y + 1, 1, 1); g.fillStyle = '#b8c8ff';
      }
      glow(g, 110, 106, 14, '#b8c8ff', 0.06);
      // fireflies
      for (let i = 0; i < 6; i++) {
        const fx = 60 + ((i * 47) % 220) + Math.sin(t * 0.9 + i * 2) * 8;
        const fy = 60 + ((i * 31) % 50) + Math.cos(t * 0.7 + i) * 5;
        g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1);
        rc(g, fx, fy, 1.5, 1.5, '#d8f090');
      }
      g.globalAlpha = 1;
    },
  },

  hermit: {
    name: "the hermit's clearing",
    horizon: 86, sMin: 0.66,
    walk: [[20, 96, 280, 40]],
    actors: [{ id: 'hermit', x: 226, y: 102, face: 'l' }],
    hotspots: [
      { id: 'exitHermit', name: 'the jungle', x: 140, y: 122, w: 40, h: 16, wx: 160, wy: 130, def: 'walk', exit: { room: 'jungle', x: 148, y: 96 } },
      { id: 'hut', name: 'driftwood hut', x: 42, y: 34, w: 70, h: 60, wx: 76, wy: 106, def: 'lookat' },
      { id: 'banjoStand', name: 'empty banjo stand', x: 170, y: 74, w: 16, h: 22, wx: 176, wy: 108, def: 'lookat' },
      { id: 'campfire', name: 'campfire', x: 128, y: 84, w: 24, h: 18, wx: 116, wy: 112, def: 'lookat' },
      { id: 'crab', name: 'hermit crab', x: 268, y: 116, w: 14, h: 10, wx: 258, wy: 124, def: 'lookat' },
      { id: 'shellPile', name: 'pile of coconut shells', x: 30, y: 108, w: 26, h: 14, wx: 48, wy: 122, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 46, ['#04060f', '#0a1a2c', '#10283c']);
      stars(g, 131, 0, 30, 34); moon(g, 288, 16, 7);
      jungleWall(g, 0, 26, VIEW_W, 68, 32);
      // driftwood hut
      g.fillStyle = '#4a3a26';
      g.beginPath(); g.moveTo(40, 94); g.lineTo(52, 40); g.lineTo(102, 36); g.lineTo(112, 94); g.closePath(); g.fill();
      g.strokeStyle = '#2c2014'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(46 + i * 13, 92); g.lineTo(54 + i * 11, 40); g.stroke(); }
      rc(g, 64, 66, 20, 28, '#1a1208'); // dark doorway
      rc(g, 50, 30, 24, 12, '#3a2e1c'); // wonky chimney
      // banjo stand
      rc(g, 176, 78, 3, 20, '#54371e'); rc(g, 170, 78, 16, 3, '#54371e');
      // campfire
      firepit(g, 140, 100, t);
      glow(g, 140, 92, 30, '#ff9a3c', 0.1);
      // log seat
      rc(g, 108, 104, 30, 8, '#4a3220'); rc(g, 108, 104, 30, 2, '#5a4030');
      // sand + shells
      dith(g, 0, 94, VIEW_W, 46, '#3a3222', '#2e2818');
      speckle(g, 133, 0, 96, VIEW_W, 42, '#4a4230', 110);
      g.fillStyle = '#b0a488';
      for (let i = 0; i < 6; i++) g.fillRect(32 + (i % 3) * 8, 110 + ((i / 3) | 0) * 5, 5, 4);
      // crab scuttles
      const cx = 268 + Math.sin(t * 0.7) * 10;
      rc(g, cx, 120, 8, 4, '#c86a3a'); rc(g, cx + 1, 118, 2, 2, '#c86a3a'); rc(g, cx + 5, 118, 2, 2, '#c86a3a');
      for (let i = 0; i < 3; i++) { rc(g, cx - 1 + i * 4, 124, 1, 2, '#a04a24'); }
      palm(g, 300, 94, 0.9, 33); palm(g, 20, 90, 0.7, 35);
    },
  },

  village: {
    name: 'the village of Broccoli Cove',
    horizon: 84, sMin: 0.64,
    walk: [[16, 94, 288, 42]],
    actors: [
      { id: 'chief', x: 236, y: 102, face: 'l' },
      { id: 'cannibal1', x: 274, y: 112, face: 'l' },
      { id: 'cannibal2', x: 206, y: 116, face: 'r' },
    ],
    hotspots: [
      { id: 'exitVillage', name: 'the jungle', x: 0, y: 66, w: 16, h: 70, wx: 12, wy: 122, def: 'walk', exit: { room: 'jungle', x: 296, y: 118 } },
      { id: 'menuBoard', name: 'menu board', x: 56, y: 54, w: 34, h: 40, wx: 72, wy: 106, def: 'lookat' },
      { id: 'veggieCauldron', name: 'cauldron of stew', x: 118, y: 74, w: 34, h: 26, wx: 136, wy: 112, def: 'lookat' },
      { id: 'huts', name: 'fruit-shaped huts', x: 150, y: 28, w: 120, h: 50, wx: 190, wy: 104, def: 'lookat' },
      { id: 'tikiTorches', name: 'tiki torches', x: 96, y: 48, w: 12, h: 46, wx: 104, wy: 106, def: 'lookat' },
      { id: 'banjoShrine', name: 'shrine of the Sacred Banjo', x: 24, y: 60, w: 26, h: 34, wx: 40, wy: 106, def: 'lookat', if: S => !S.flags.banjoTraded },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 46, ['#04060f', '#0a1a2c', '#10283c']);
      stars(g, 141, 0, 28, 30);
      jungleWall(g, 0, 24, VIEW_W, 68, 42);
      // fruit-shaped huts
      const hut = (x, y, r, c1, c2, stem) => {
        g.fillStyle = c1; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = c2; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, 7); g.fill();
        rc(g, x - 5, y + r - 14, 10, 14, '#1a1208');
        if (stem) rc(g, x - 1, y - r - 5, 3, 6, '#2c4a1c');
      };
      hut(180, 62, 20, '#8a3a2a', '#a04a34', true);   // tomato hut
      hut(232, 56, 24, '#c8a030', '#d8b848', false);  // mango hut
      hut(282, 64, 18, '#5a7a3a', '#6a8a48', true);   // lime hut
      // menu board
      rc(g, 68, 88, 4, 10, '#33200f');
      rc(g, 54, 52, 38, 40, '#241608'); rc(g, 56, 54, 34, 36, '#3a2e1a');
      g.fillStyle = '#d8c890'; g.font = '4px monospace'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText('TODAY:', 58, 56);
      g.fillText('-KELP KEBABS', 58, 62); g.fillText('-YAM SURPRISE', 58, 68);
      g.fillText('-BANANA SPLIT', 58, 74); g.fillText(' (the banana', 58, 80); g.fillText('  left us)', 58, 86);
      // stew cauldron
      g.fillStyle = '#101018'; g.beginPath(); g.ellipse(135, 92, 19, 11, 0, 0, 7); g.fill();
      rc(g, 118, 82, 34, 11, '#181820');
      g.fillStyle = '#a08a30'; g.beginPath(); g.ellipse(135, 82, 15, 4, 0, 0, 7); g.fill();
      g.fillStyle = '#c8a840'; g.fillRect(128, 79, 4, 3); g.fillRect(140, 80, 5, 3); // floating yams
      flame(g, 135, 102, t + 1, 0.9);
      // banjo shrine
      if (!S || !S.flags.banjoTraded) {
        rc(g, 26, 62, 24, 32, '#3a2e1a'); rc(g, 28, 64, 20, 28, '#241608');
        // little banjo
        g.fillStyle = '#c8a468'; g.beginPath(); g.arc(38, 84, 6, 0, 7); g.fill();
        rc(g, 37, 68, 2, 12, '#8a6a30'); rc(g, 35, 66, 6, 4, '#8a6a30');
        g.fillStyle = '#f0e8d0'; g.beginPath(); g.arc(38, 84, 3.5, 0, 7); g.fill();
        glow(g, 38, 82, 12, '#ffd27a', 0.08);
      }
      // tiki torches
      torch(g, 102, 92, t, 40); torch(g, 160, 94, t + 1.3, 36); torch(g, 300, 96, t + 2.1, 38);
      // ground
      dith(g, 0, 92, VIEW_W, 48, '#2a2414', '#221c0e');
      speckle(g, 143, 0, 94, VIEW_W, 44, '#3a3220', 140);
      // veggie garden rows
      for (let i = 0; i < 3; i++) {
        rc(g, 20, 120 + i * 5, 60, 2, '#1c2814');
        g.fillStyle = '#4a8a3a';
        for (let x = 24; x < 76; x += 8) g.fillRect(x, 118 + i * 5, 3, 3);
      }
    },
  },

  grotto: {
    name: "LeMoore's grotto",
    horizon: 84, sMin: 0.66,
    walk: [[20, 94, 280, 42]],
    actors: [],
    hotspots: [
      { id: 'exitGrotto', name: 'the jungle', x: 0, y: 66, w: 16, h: 70, wx: 14, wy: 122, def: 'walk', exit: { room: 'jungle', x: 218, y: 104 } },
      { id: 'carvings1', name: 'ancient carvings', x: 56, y: 40, w: 40, h: 34, wx: 72, wy: 104, def: 'lookat' },
      { id: 'carvings2', name: 'fresher carvings', x: 116, y: 44, w: 36, h: 30, wx: 130, wy: 104, def: 'lookat' },
      { id: 'compassRock', name: 'something glinting', x: 196, y: 88, w: 18, h: 12, wx: 200, wy: 112, def: 'pickup', if: S => !S.inv.includes('compass') },
      { id: 'ghostThrone', name: 'barnacled throne', x: 244, y: 52, w: 40, h: 44, wx: 248, wy: 108, def: 'lookat' },
      { id: 'grogCrates', name: 'empty grog crates', x: 160, y: 76, w: 34, h: 24, wx: 172, wy: 110, def: 'open' },
      { id: 'pool', name: 'glowing pool', x: 24, y: 106, w: 52, h: 22, wx: 84, wy: 118, def: 'lookat' },
    ],
    paint(g, S, t) {
      // cave: cool blues with eerie green glow
      vgrad(g, 0, 0, VIEW_W, VIEW_H, ['#060a16', '#0a1222', '#101c30']);
      // stalactites
      g.fillStyle = '#0a0e1c';
      for (let i = 0; i < 12; i++) {
        const x = 10 + i * 27, h = 12 + ((i * 37) % 22);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 9, 0); g.lineTo(x + 4, h); g.closePath(); g.fill();
      }
      // rock walls
      g.fillStyle = '#141a2c';
      g.beginPath(); g.moveTo(0, 30); g.lineTo(40, 44); g.lineTo(30, 90); g.lineTo(0, 96); g.fill();
      g.beginPath(); g.moveTo(320, 26); g.lineTo(290, 46); g.lineTo(300, 92); g.lineTo(320, 96); g.fill();
      speckle(g, 151, 0, 20, VIEW_W, 76, '#1e2840', 200);
      // carvings panels
      rc(g, 54, 38, 44, 38, '#1a2238'); rc(g, 56, 40, 40, 34, '#101828');
      g.strokeStyle = '#4a6a8a'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(60, 48); g.lineTo(70, 44); g.lineTo(80, 50); g.moveTo(62, 58); g.lineTo(90, 58); g.moveTo(64, 66); g.lineTo(76, 62); g.stroke();
      rc(g, 114, 42, 40, 34, '#1a2238'); rc(g, 116, 44, 36, 30, '#101828');
      g.strokeStyle = '#70f0a0';
      g.beginPath(); g.moveTo(120, 52); g.lineTo(134, 48); g.moveTo(122, 60); g.lineTo(146, 60); g.moveTo(120, 68); g.lineTo(140, 66); g.stroke();
      glow(g, 134, 58, 20, '#40d870', 0.06);
      // throne of barnacles
      rc(g, 248, 56, 34, 42, '#22303c');
      rc(g, 244, 52, 8, 46, '#2a3a48'); rc(g, 278, 52, 8, 46, '#2a3a48');
      speckle(g, 153, 244, 52, 42, 46, '#3c5460', 60);
      g.fillStyle = '#4a6a5a';
      for (let i = 0; i < 8; i++) g.fillRect(248 + (i * 11) % 32, 58 + (i * 7) % 36, 3, 3);
      // floor (before the props that sit on it)
      dith(g, 0, 96, VIEW_W, 44, '#182030', '#121826');
      speckle(g, 155, 0, 98, VIEW_W, 40, '#243048', 130);
      // grog crates
      crate(g, 158, 112, 24, 16, '#3a3a2a'); crate(g, 174, 108, 22, 14, '#44442e');
      g.fillStyle = '#8a8a5a'; g.font = '4px monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('GROG', 170, 100);
      // glowing pool
      g.fillStyle = '#0e3a4a'; g.beginPath(); g.ellipse(50, 118, 30, 11, 0, 0, 7); g.fill();
      g.fillStyle = '#1a6a6a'; g.beginPath(); g.ellipse(50, 118, 24, 8, 0, 0, 7); g.fill();
      for (let i = 0; i < 4; i++) {
        g.globalAlpha = 0.4 + 0.3 * Math.sin(t * 2 + i * 1.6);
        rc(g, 34 + i * 9, 115 + (i % 2) * 4, 5, 1.5, '#40d8c8');
      }
      g.globalAlpha = 1;
      glow(g, 50, 116, 30, '#20a898', 0.09);
      // compass glint
      if (!S || !S.inv.includes('compass')) {
        rc(g, 198, 94, 10, 6, '#2a4a3a');
        g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
        rc(g, 201, 92, 3, 3, '#a0ffd0');
        g.globalAlpha = 1;
      }
      glow(g, 264, 90, 24, '#40d870', 0.05);
    },
  },

  // ========================================================== GHOST SHIP ====
  ghostdeck: {
    name: "the ghost ship 'Rootless'",
    horizon: 82, sMin: 0.64,
    walk: [[20, 92, 280, 44]],
    actors: [
      { id: 'ghost1', x: 74, y: 100, face: 'r' },
      { id: 'ghost2', x: 268, y: 108, face: 'l' },
      { id: 'lemoore', x: 176, y: 98, face: 'l', if: S => S.flags.lemooreOnDeck },
    ],
    hotspots: [
      { id: 'exitGhost', name: 'over the side', x: 0, y: 70, w: 16, h: 66, wx: 14, wy: 120, def: 'walk', exit: { room: 'map', x: 0, y: 0 } },
      { id: 'hatch', name: 'cargo hatch', x: 196, y: 108, w: 34, h: 20, wx: 222, wy: 124, def: 'open', exit: { room: 'ghosthold', x: 60, y: 122 }, gated: true },
      { id: 'ghostFlag', name: 'spectral flag', x: 146, y: 0, w: 30, h: 24, wx: 160, wy: 104, def: 'lookat' },
      { id: 'ghostRigging', name: 'glowing rigging', x: 40, y: 10, w: 60, h: 50, wx: 70, wy: 100, def: 'lookat' },
      { id: 'ghostWheel', name: 'haunted wheel', x: 280, y: 58, w: 28, h: 32, wx: 272, wy: 106, def: 'use' },
      { id: 'ectoBarrel', name: 'barrel of ectoplasm', x: 116, y: 88, w: 18, h: 24, wx: 130, wy: 116, def: 'open' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, 64, ['#020408', '#061020', '#0a1c30']);
      stars(g, 161, 0, 40, 50);
      // green mist
      for (let i = 0; i < 5; i++) {
        g.globalAlpha = 0.10;
        g.fillStyle = '#1e6a4a';
        const mx = ((i * 90 + t * 6) % 400) - 40;
        g.beginPath(); g.ellipse(mx, 60 + i * 6, 50, 9, 0, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      seaNight(g, 64, 86, t, 16);
      // spectral deck
      planksH(g, 86, VIEW_H, '#1c3028', '#142420');
      g.globalAlpha = 0.16; rc(g, 0, 86, VIEW_W, 54, '#40d870'); g.globalAlpha = 1;
      // masts and glowing rigging
      rc(g, 158, 0, 6, 92, '#14241c');
      g.strokeStyle = '#2e8a5a'; g.lineWidth = 1;
      g.globalAlpha = 0.7;
      g.beginPath(); g.moveTo(40, 60); g.lineTo(160, 8); g.moveTo(70, 66); g.lineTo(160, 20); g.moveTo(280, 62); g.lineTo(162, 8); g.moveTo(250, 68); g.lineTo(162, 22); g.stroke();
      g.globalAlpha = 1;
      // torn ghost sail
      g.fillStyle = '#1e4a3c';
      g.globalAlpha = 0.8;
      g.beginPath(); g.moveTo(118, 14); g.quadraticCurveTo(160, 24 + Math.sin(t * 1.3) * 3, 202, 14);
      g.lineTo(196, 44); g.lineTo(184, 38); g.lineTo(172, 50); g.lineTo(156, 40); g.lineTo(140, 52); g.lineTo(124, 42); g.closePath(); g.fill();
      g.globalAlpha = 1;
      // flag: grinning mug-and-crossbones
      rc(g, 146, 0, 2, 18, '#14241c');
      g.fillStyle = '#0c1c14'; g.fillRect(148, 2, 26, 14);
      g.fillStyle = '#70f0a0'; g.fillRect(156, 5, 8, 6); g.fillRect(158, 12, 4, 2);
      // hatch
      rc(g, 196, 110, 34, 18, S && S.flags.hatchOpen ? '#04140c' : '#1a2e24');
      rc(g, 194, 108, 38, 3, '#2e4a3c'); rc(g, 194, 126, 38, 3, '#2e4a3c');
      if (S && S.flags.hatchOpen) glow(g, 213, 118, 16, '#40d870', 0.12);
      // ecto barrel
      barrel(g, 116, 112, 16, 22);
      g.globalAlpha = 0.5; rc(g, 117, 92, 14, 4, '#70f0a0'); g.globalAlpha = 1;
      // haunted wheel
      rc(g, 290, 74, 4, 18, '#14241c');
      g.strokeStyle = '#2e8a5a'; g.lineWidth = 2;
      g.beginPath(); g.arc(292, 70, 10, 0, 7); g.stroke();
      const wa = t * 2.2;
      g.beginPath(); g.moveTo(292 - Math.cos(wa) * 13, 70 - Math.sin(wa) * 13); g.lineTo(292 + Math.cos(wa) * 13, 70 + Math.sin(wa) * 13); g.stroke();
      glow(g, 292, 70, 14, '#40d870', 0.08);
      // rails
      for (let x = 8; x < 130; x += 20) rc(g, x, 72, 3, 16, '#1a2e24');
      rc(g, 0, 70, 132, 3, '#2e4a3c');
      for (let x = 240; x < 320; x += 20) rc(g, x, 72, 3, 16, '#1a2e24');
      rc(g, 240, 70, 80, 3, '#2e4a3c');
    },
  },

  ghosthold: {
    name: 'the hold of the Rootless',
    horizon: 88, sMin: 0.7,
    walk: [[22, 96, 276, 40]],
    actors: [{ id: 'percy', x: 232, y: 96, face: 'l', if: S => !S.inv.includes('percy') }],
    hotspots: [
      { id: 'exitHold', name: 'the ladder up', x: 40, y: 52, w: 22, h: 50, wx: 52, wy: 106, def: 'walk', exit: { room: 'ghostdeck', x: 222, y: 118 } },
      { id: 'cage', name: 'spirit cage', x: 210, y: 42, w: 44, h: 56, wx: 216, wy: 110, def: 'open' },
      { id: 'grogHoard', name: "the island's entire grog supply", x: 96, y: 58, w: 90, h: 42, wx: 130, wy: 110, def: 'lookat' },
      { id: 'boneChest', name: 'chest of bones', x: 268, y: 84, w: 34, h: 22, wx: 268, wy: 116, def: 'open' },
      { id: 'holdLantern', name: 'ghostly lantern', x: 150, y: 6, w: 14, h: 18, wx: 152, wy: 106, def: 'lookat' },
    ],
    paint(g, S, t) {
      vgrad(g, 0, 0, VIEW_W, VIEW_H, ['#04100a', '#081810', '#0c2016']);
      // ribs of the hull
      g.strokeStyle = '#143024'; g.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        const x = 20 + i * 56;
        g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x - 10, 70, x + 6, 140); g.stroke();
      }
      // ladder
      rc(g, 42, 50, 3, 52, '#2e4a3c'); rc(g, 58, 50, 3, 52, '#2e4a3c');
      for (let y = 56; y < 100; y += 9) rc(g, 42, y, 19, 2, '#2e4a3c');
      glow(g, 52, 46, 12, '#40d870', 0.08);
      // grog hoard — glorious pyramid of barrels
      for (let r = 0; r < 3; r++)
        for (let i = 0; i <= 3 - r; i++)
          barrel(g, 100 + i * 20 + r * 10, 100 - r * 16, 17, 18);
      g.fillStyle = '#ffd27a'; g.font = '5px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('GROG', 138, 46);
      glow(g, 138, 80, 40, '#ffb85a', 0.05);
      // spirit cage
      const cageC = S && S.flags.cageSolid ? '#c8ccd8' : '#2e8a5a';
      g.strokeStyle = cageC; g.lineWidth = 2;
      g.beginPath(); g.arc(232, 56, 22, Math.PI, 0); g.stroke();
      for (let i = 0; i < 6; i++) {
        g.beginPath(); g.moveTo(210 + i * 8.8, 56); g.lineTo(210 + i * 8.8, 98); g.stroke();
      }
      rc(g, 208, 96, 48, 4, S && S.flags.cageSolid ? '#8a8fa0' : '#1e5a3c');
      if (!S || !S.flags.cageOpen) rc(g, 228, 68, 8, 12, S && S.flags.cageSolid ? '#8a8fa0' : '#2e8a5a'); // lock
      glow(g, 232, 72, 26, S && S.flags.cageSolid ? '#c8ccd8' : '#40d870', 0.07);
      // bone chest
      rc(g, 266, 88, 36, 20, '#22303c'); rc(g, 266, 86, 36, 4, '#2e4250');
      g.fillStyle = '#c8c0a8'; g.fillRect(274, 82, 6, 4); g.fillRect(286, 80, 8, 5);
      // lantern
      rc(g, 156, 0, 2, 8, '#2e4a3c');
      rc(g, 150, 8, 14, 16, '#14241c'); rc(g, 152, 10, 10, 12, '#70f0a0');
      glow(g, 157, 16, 22, '#70f0a0', 0.1);
      // floor
      planksH(g, 96, VIEW_H, '#12281c', '#0c1c14', 8);
      g.globalAlpha = 0.1; rc(g, 0, 96, VIEW_W, 44, '#40d870'); g.globalAlpha = 1;
    },
  },
};

// walkability helper (shared by pathfinding + click handling)
export function isWalkable(room, x, y) {
  const R = ROOMS[room];
  if (!R) return false;
  for (const [bx, by, bw, bh] of R.walk)
    if (x >= bx && x < bx + bw && y >= by && y < by + bh) return true;
  return false;
}

export function scaleAt(room, y) {
  const R = ROOMS[room];
  if (!R || R.noActor) return 1;
  const t = Math.max(0, Math.min(1, (y - R.horizon) / (FLOOR_Y - R.horizon)));
  return R.sMin + (1 - R.sMin) * t;
}

export function hotspotsAt(room, S) {
  const R = ROOMS[room];
  if (!R) return [];
  return R.hotspots.filter(h => !h.if || h.if(S));
}

export function findHotspot(room, S, id) {
  return hotspotsAt(room, S).find(h => h.id === id) || null;
}
