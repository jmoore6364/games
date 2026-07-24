// sprites.js — all graphics drawn procedurally on the 2D canvas. Chunky retro
// arcade look: red girders, yellow ladders, a little climbing Moore, the big
// ape Donkey Moore, brown barrels, blue oil-drum flames.

import { GIRDERS, LADDERS, surfaceY, WALL_L, WALL_R } from './level.js';

// ---- background walls / rivets ----
export function drawGirder(ctx, g) {
  const th = 8;
  ctx.save();
  ctx.lineCap = 'butt';
  // segments, skipping holes
  const segs = [];
  let start = g.xL;
  const holes = [...g.holes].sort((a, b) => a[0] - b[0]);
  for (const h of holes) { segs.push([start, h[0]]); start = h[1]; }
  segs.push([start, g.xR]);
  for (const [x0, x1] of segs) {
    if (x1 - x0 < 2) continue;
    const y0 = surfaceY(g, x0), y1 = surfaceY(g, x1);
    // steel body
    ctx.strokeStyle = '#d23c2a';
    ctx.lineWidth = th;
    ctx.beginPath(); ctx.moveTo(x0, y0 + th / 2); ctx.lineTo(x1, y1 + th / 2); ctx.stroke();
    // top highlight
    ctx.strokeStyle = '#ff7a5c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0 + 1); ctx.lineTo(x1, y1 + 1); ctx.stroke();
    // dark underside
    ctx.strokeStyle = '#7a1a10';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0 + th); ctx.lineTo(x1, y1 + th); ctx.stroke();
    // rivets
    ctx.fillStyle = '#ffd0a0';
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.floor(len / 16));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const rx = x0 + (x1 - x0) * t;
      const ry = surfaceY(g, rx) + th / 2;
      ctx.fillRect(Math.round(rx) - 1, Math.round(ry) - 1, 2, 2);
    }
  }
  ctx.restore();
}

export function drawLadder(ctx, l) {
  const top = surfaceY(GIRDERS[l.gHigh], l.x);
  const bot = surfaceY(GIRDERS[l.gLow], l.x);
  const w = 12;
  ctx.save();
  const railL = l.x - w / 2, railR = l.x + w / 2;
  if (l.broken) {
    // draw dashed / incomplete rungs to signal it's unusable
    ctx.strokeStyle = '#8a8a3a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(railL, top + 2); ctx.lineTo(railL, top + (bot - top) * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railR, top + 2); ctx.lineTo(railR, top + (bot - top) * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railL, bot - (bot - top) * 0.3); ctx.lineTo(railL, bot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(railR, bot - (bot - top) * 0.3); ctx.lineTo(railR, bot); ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.strokeStyle = '#f4e14a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(railL, top); ctx.lineTo(railL, bot); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(railR, top); ctx.lineTo(railR, bot); ctx.stroke();
  ctx.strokeStyle = '#c9b620';
  for (let y = top + 4; y < bot; y += 8) {
    ctx.beginPath(); ctx.moveTo(railL, y); ctx.lineTo(railR, y); ctx.stroke();
  }
  ctx.restore();
}

export function drawWalls(ctx, h) {
  // faint side pillars
  ctx.fillStyle = '#1a2a4a';
  ctx.fillRect(0, 0, WALL_L - 3, h);
  ctx.fillRect(WALL_R + 3, 0, 224 - (WALL_R + 3), h);
}

// ---- hero: a little jumping Moore ----
export function drawHero(ctx, p) {
  const x = Math.round(p.x), y = Math.round(p.y); // y = feet
  ctx.save();
  const face = p.facing; // -1 left, 1 right
  const climb = p.onLadder;
  // legs
  ctx.fillStyle = '#2a4bd0';
  if (p.jumping || climb) {
    ctx.fillRect(x - 5, y - 7, 4, 7);
    ctx.fillRect(x + 1, y - 7, 4, 7);
  } else {
    const step = (Math.floor(p.animT * 8) % 2 === 0) ? 1 : -1;
    ctx.fillRect(x - 5, y - 7, 4, 7);
    ctx.fillRect(x + 1, y - 7, 4, 6 + step);
  }
  // shoes
  ctx.fillStyle = '#7a3a10';
  ctx.fillRect(x - 6, y - 2, 5, 2);
  ctx.fillRect(x + 1, y - 2, 5, 2);
  // body / overalls
  ctx.fillStyle = '#d02a2a';
  ctx.fillRect(x - 6, y - 15, 12, 9);
  ctx.fillStyle = '#2a4bd0';
  ctx.fillRect(x - 5, y - 12, 10, 6);
  // arms
  ctx.fillStyle = '#e8b088';
  if (climb) {
    ctx.fillRect(x - 8, y - 15 + (Math.floor(p.animT * 6) % 2) * 3, 3, 5);
    ctx.fillRect(x + 5, y - 12 - (Math.floor(p.animT * 6) % 2) * 3 + 3, 3, 5);
  } else if (p.hammer > 0) {
    // one arm up holding hammer
    ctx.fillRect(x - 8, y - 15, 3, 6);
    ctx.fillRect(x + 5, y - 16, 3, 6);
  } else {
    ctx.fillRect(x - 8, y - 14, 3, 6);
    ctx.fillRect(x + 5, y - 14, 3, 6);
  }
  // head
  ctx.fillStyle = '#e8b088';
  ctx.fillRect(x - 4, y - 22, 8, 7);
  // cap
  ctx.fillStyle = '#d02a2a';
  ctx.fillRect(x - 5, y - 24, 10, 3);
  ctx.fillRect(x + face * 3, y - 22, 4, 2);
  // mustache + eye
  ctx.fillStyle = '#3a2010';
  ctx.fillRect(x - 1 + (face > 0 ? 2 : -3), y - 18, 3, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + (face > 0 ? 1 : -2), y - 20, 1, 2);
  ctx.restore();
}

export function drawHammer(ctx, x, y, up) {
  ctx.save();
  ctx.fillStyle = '#a0651f';
  ctx.fillRect(x - 1, y - 10, 2, 12); // handle
  ctx.fillStyle = '#c9cdd6';
  if (up) ctx.fillRect(x - 5, y - 14, 10, 6);
  else ctx.fillRect(x - 5, y - 2, 10, 6);
  ctx.fillStyle = '#8a8f98';
  if (up) ctx.strokeRect(x - 5, y - 14, 10, 6);
  ctx.restore();
}

export function drawHammerPickup(ctx, x, y, t) {
  const bob = Math.sin(t * 4) * 2;
  drawHammer(ctx, x, y - 6 + bob, true);
  ctx.fillStyle = 'rgba(255,255,150,' + (0.3 + 0.2 * Math.sin(t * 6)) + ')';
  ctx.fillRect(x - 6, y - 20, 12, 1);
}

// ---- Donkey Moore (the ape) ----
export function drawDK(ctx, x, y, t) {
  ctx.save();
  const beat = Math.sin(t * 3) * 1.5;
  // body
  ctx.fillStyle = '#6b3a1a';
  ctx.fillRect(x - 16, y - 2, 32, 24);
  // belly
  ctx.fillStyle = '#c99a5a';
  ctx.fillRect(x - 9, y + 2, 18, 16);
  // arms
  ctx.fillStyle = '#6b3a1a';
  ctx.fillRect(x - 24, y - 2 + beat, 8, 20);
  ctx.fillRect(x + 16, y - 2 - beat, 8, 20);
  ctx.fillStyle = '#4a2510';
  ctx.fillRect(x - 24, y + 14 + beat, 8, 5);
  ctx.fillRect(x + 16, y + 14 - beat, 8, 5);
  // head
  ctx.fillStyle = '#6b3a1a';
  ctx.fillRect(x - 13, y - 20, 26, 20);
  // face
  ctx.fillStyle = '#c99a5a';
  ctx.fillRect(x - 9, y - 10, 18, 10);
  // brow
  ctx.fillStyle = '#3a2010';
  ctx.fillRect(x - 12, y - 14, 24, 4);
  // eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 8, y - 12, 5, 4);
  ctx.fillRect(x + 3, y - 12, 5, 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 6, y - 11, 2, 2);
  ctx.fillRect(x + 5, y - 11, 2, 2);
  // nostrils
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 4, y - 4, 2, 2);
  ctx.fillRect(x + 2, y - 4, 2, 2);
  // ears
  ctx.fillStyle = '#6b3a1a';
  ctx.fillRect(x - 16, y - 16, 4, 6);
  ctx.fillRect(x + 12, y - 16, 4, 6);
  // tie
  ctx.fillStyle = '#d02a2a';
  ctx.fillRect(x - 2, y + 2, 4, 10);
  ctx.restore();
}

export function drawLady(ctx, x, y, t) {
  ctx.save();
  const blink = (Math.floor(t * 1.5) % 6 === 0);
  // dress
  ctx.fillStyle = '#e85aa8';
  ctx.fillRect(x - 5, y, 10, 12);
  ctx.fillRect(x - 6, y + 8, 12, 4);
  // body/arms
  ctx.fillStyle = '#f0c0a0';
  ctx.fillRect(x - 6, y + 1, 2, 6);
  ctx.fillRect(x + 4, y + 1, 2, 6);
  // head
  ctx.fillStyle = '#f0c0a0';
  ctx.fillRect(x - 4, y - 8, 8, 8);
  // hair
  ctx.fillStyle = '#ffd84a';
  ctx.fillRect(x - 5, y - 10, 10, 4);
  ctx.fillRect(x - 6, y - 8, 2, 6);
  ctx.fillRect(x + 4, y - 8, 2, 6);
  // face
  ctx.fillStyle = '#000';
  if (!blink) { ctx.fillRect(x - 2, y - 5, 1, 2); ctx.fillRect(x + 1, y - 5, 1, 2); }
  ctx.fillStyle = '#d02a2a';
  ctx.fillRect(x - 1, y - 2, 2, 1);
  ctx.restore();
}

// "HELP!" bubble above the captured character
export function drawHelp(ctx, x, y, t) {
  if (Math.floor(t * 2) % 2) return;
  ctx.fillStyle = '#fff';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('HELP!', x, y);
}

// ---- barrel ----
export function drawBarrel(ctx, b) {
  const x = Math.round(b.x), y = Math.round(b.y);
  ctx.save();
  ctx.translate(x, y);
  const r = 7;
  // body
  ctx.fillStyle = '#b5651d';
  ctx.beginPath(); ctx.ellipse(0, 0, r, r - 1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a4a14';
  ctx.fillRect(-r, -2, r * 2, 4);
  ctx.fillStyle = '#d98a3a';
  ctx.fillRect(-r, -r + 1, r * 2, 2);
  // bands rotate with roll
  const rot = b.roll || 0;
  ctx.strokeStyle = '#5a2f0c';
  ctx.lineWidth = 1.5;
  for (let k = -1; k <= 1; k++) {
    const a = rot + k * 1.6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, -r + 1);
    ctx.lineTo(Math.cos(a) * r, r - 1);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3a1e08';
  ctx.beginPath(); ctx.ellipse(0, 0, r, r - 1, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ---- oil drum + flame ----
export function drawOilDrum(ctx, x, y, t) {
  ctx.save();
  ctx.fillStyle = '#1e6ad0';
  ctx.fillRect(x - 9, y - 18, 18, 18);
  ctx.fillStyle = '#0e3f80';
  ctx.fillRect(x - 9, y - 14, 18, 2);
  ctx.fillRect(x - 9, y - 6, 18, 2);
  ctx.fillStyle = '#ffd84a';
  ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('OIL', x, y - 8);
  // little flames on top
  const f = Math.sin(t * 10);
  ctx.fillStyle = '#ff8a1e';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 18);
  ctx.lineTo(x - 3, y - 24 - f);
  ctx.lineTo(x, y - 19);
  ctx.lineTo(x + 3, y - 25 + f);
  ctx.lineTo(x + 6, y - 18);
  ctx.fill();
  ctx.fillStyle = '#ffe14a';
  ctx.fillRect(x - 2, y - 21, 4, 3);
  ctx.restore();
}

export function drawFlame(ctx, fl) {
  const x = Math.round(fl.x), y = Math.round(fl.y);
  const w = fl.wob;
  ctx.save();
  ctx.fillStyle = '#1e7ad0';
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.quadraticCurveTo(x - 8, y - 10, x - 2 + w, y - 16);
  ctx.quadraticCurveTo(x - 4, y - 8, x, y);
  ctx.quadraticCurveTo(x + 4, y - 9, x + 2 - w, y - 15);
  ctx.quadraticCurveTo(x + 8, y - 9, x + 6, y);
  ctx.fill();
  ctx.fillStyle = '#8ad0ff';
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.quadraticCurveTo(x - 4, y - 6, x + w, y - 10);
  ctx.quadraticCurveTo(x + 4, y - 6, x + 3, y);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 3, y - 8, 2, 2);
  ctx.fillRect(x + 1, y - 8, 2, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 3, y - 7, 1, 1);
  ctx.fillRect(x + 2, y - 7, 1, 1);
  ctx.restore();
}

// score popup
export function drawPopup(ctx, x, y, txt, col) {
  ctx.fillStyle = col || '#fff';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(txt, Math.round(x), Math.round(y));
}
