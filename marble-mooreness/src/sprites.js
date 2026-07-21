// sprites.js — isometric procedural art: heightfield block tiles, the marble
// (with a rolling highlight that conveys speed + spin), hazards and enemies.
// All drawn to canvas at runtime (no assets). House style: bright, clean iso.

import { TYPE } from './physics.js';

export const TILE_W = 26, TILE_H = 13, ELEV = 6;

// world (tile x,y,height z) -> screen (before camera). +x = down-right, +y = down-left.
export function worldToScreen(x, y, z = 0) {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) - z * ELEV };
}

function shade(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + d));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + d));
  const b = Math.max(0, Math.min(255, (n & 255) + d));
  return `rgb(${r},${g},${b})`;
}

// ---- per-course surreal palettes ----
export const THEMES = [
  { name: 'PRACTICE',     floor: '#5ec46a', side: '#2f7a3c', sky0: '#153018', sky1: '#0a1a0d', accent: '#eaffb0', music: 'a' },
  { name: 'BEGINNER',     floor: '#57a6e6', side: '#274f96', sky0: '#0e2140', sky1: '#050f22', accent: '#d0f0ff', music: 'b' },
  { name: 'INTERMEDIATE', floor: '#a878e0', side: '#5a389a', sky0: '#241540', sky1: '#120a22', accent: '#ffd0ff', music: 'a' },
  { name: 'AERIAL',       floor: '#b6e2f2', side: '#5f93b6', sky0: '#0a1730', sky1: '#02060f', accent: '#ffffff', music: 'b' },
  { name: 'SLIME PIT',    floor: '#9bdc4a', side: '#4f7a1e', sky0: '#1c2a10', sky1: '#0c1406', accent: '#ecff8a', music: 'a' },
  { name: 'THE GAUNTLET', floor: '#e88a44', side: '#8a3f18', sky0: '#2a1208', sky1: '#140704', accent: '#ffe0a0', music: 'b' },
];

function diamond(g, cx, cy, w = TILE_W, h = TILE_H) {
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx - w / 2, cy);
  g.closePath();
}

// Draw a single heightfield cell as an iso block: two visible side faces
// (toward the camera) down to the lower neighbours, then the shaded top.
// cx,cy = screen centre of the top diamond. dR/dD = neighbour heights toward
// +x (down-right) and +y (down-left); null => void edge (a drop).
export function drawCell(g, type, theme, cx, cy, h, dR, dD, frame) {
  const th = THEMES[theme];
  const isWall = type === TYPE.WALL;

  // side faces
  const faceDepth = (nh) => (nh == null ? Math.min(28, ELEV * 4 + h * 0.3) : Math.max(0, (h - nh) * ELEV));
  const sideBase = isWall ? shade(th.side, -30) : th.side;

  // +x face (right): between right & bottom vertices, extruded down
  const dr = faceDepth(dR);
  if (dr > 0.5) {
    g.fillStyle = shade(sideBase, dR == null ? -34 : -6);
    g.beginPath();
    g.moveTo(cx + TILE_W / 2, cy);
    g.lineTo(cx, cy + TILE_H / 2);
    g.lineTo(cx, cy + TILE_H / 2 + dr);
    g.lineTo(cx + TILE_W / 2, cy + dr);
    g.closePath();
    g.fill();
  }
  // +y face (left)
  const dd = faceDepth(dD);
  if (dd > 0.5) {
    g.fillStyle = shade(sideBase, dD == null ? -52 : -22);
    g.beginPath();
    g.moveTo(cx - TILE_W / 2, cy);
    g.lineTo(cx, cy + TILE_H / 2);
    g.lineTo(cx, cy + TILE_H / 2 + dd);
    g.lineTo(cx - TILE_W / 2, cy + dd);
    g.closePath();
    g.fill();
  }

  // ---- top surface ----
  let topCol = th.floor;
  if (isWall) topCol = shade(th.side, 30);
  else if (type === TYPE.RAMP) topCol = shade(th.floor, 8);
  if (type === TYPE.ICE) topCol = '#cfe8ff';
  if (type === TYPE.SLIME) topCol = '#7ecb2a';
  if (type === TYPE.ACID) topCol = frame % 20 < 10 ? '#b46cff' : '#8ad84a';
  if (type === TYPE.START) topCol = shade(th.floor, 18);
  if (type === TYPE.JUMP) topCol = '#ffd23c';
  if (type === TYPE.ARROW) topCol = shade(th.floor, -8);

  diamond(g, cx, cy);
  g.fillStyle = topCol;
  g.fill();

  // subtle top rim highlight (back edges catch the light)
  g.strokeStyle = shade(topCol, 34);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - TILE_W / 2, cy); g.lineTo(cx, cy - TILE_H / 2); g.lineTo(cx + TILE_W / 2, cy);
  g.stroke();

  // ---- per-type top detailing ----
  if (type === TYPE.GOAL) {
    // checkered finish
    for (let sy = -1; sy <= 1; sy++) for (let sx = -1; sx <= 1; sx++) {
      if (((sx + sy) & 1) === 0) continue;
      g.fillStyle = '#101014';
      diamond(g, cx + sx * (TILE_W / 4), cy + sy * (TILE_H / 4), TILE_W / 2.2, TILE_H / 2.2);
      g.fill();
    }
  } else if (type === TYPE.CHECK) {
    g.fillStyle = frame % 30 < 15 ? '#ffe23c' : '#ff8a3c';
    diamond(g, cx, cy - 1, TILE_W * 0.5, TILE_H * 0.5); g.fill();
  } else if (type === TYPE.ACID) {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 3; i++) {
      const p = ((frame * 0.6 + i * 33) % 24) / 24;
      g.beginPath();
      g.ellipse(cx + (i - 1) * 5, cy + Math.sin(frame * 0.2 + i) * 2, 4 * (1 - p) + 1, 2 * (1 - p) + 0.5, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else if (type === TYPE.SLIME) {
    g.fillStyle = 'rgba(220,255,120,0.5)';
    g.beginPath(); g.arc(cx + Math.sin(frame * 0.15) * 3, cy, 2, 0, Math.PI * 2); g.fill();
  } else if (type === TYPE.ICE) {
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 5, cy + 2); g.lineTo(cx + 2, cy - 3); g.stroke();
  } else if (type === TYPE.JUMP) {
    g.fillStyle = '#c8720a';
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(cx + i * 5, cy + 3); g.lineTo(cx + i * 5 - 3, cy + 1); g.lineTo(cx + i * 5 + 3, cy + 1);
      g.closePath(); g.fill();
    }
  } else if (type === TYPE.ARROW) {
    // suction ripple
    g.strokeStyle = 'rgba(120,200,255,0.7)'; g.lineWidth = 1;
    const p = (frame % 24) / 24;
    diamond(g, cx, cy, TILE_W * (0.3 + p * 0.6), TILE_H * (0.3 + p * 0.6)); g.stroke();
  }
}

// ---- the marble ----
// Shaded sphere with a rotating highlight ring + trailing streaks when fast.
export function drawMarble(g, sx, sy, r, spin, dir, speed, base = '#f24444', hi = '#ffd0d0') {
  // motion streaks
  if (speed > 0.16) {
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      g.beginPath();
      g.moveTo(sx - Math.cos(dir) * (r + i * 2), sy - Math.sin(dir) * (r + i * 2) * 0.6);
      g.lineTo(sx - Math.cos(dir) * (r + i * 3.5), sy - Math.sin(dir) * (r + i * 3.5) * 0.6);
      g.stroke();
    }
  }
  // body
  const grd = g.createRadialGradient(sx - r * 0.35, sy - r * 0.45, r * 0.2, sx, sy, r);
  grd.addColorStop(0, hi);
  grd.addColorStop(0.45, base);
  grd.addColorStop(1, shade(base, -70));
  g.fillStyle = grd;
  g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
  // rolling band: a speckle that orbits with spin so the ball reads as rotating
  const ang = spin * 0.5;
  for (let i = 0; i < 5; i++) {
    const a = ang + i * (Math.PI * 2 / 5);
    const rr = r * 0.62;
    const px = sx + Math.cos(a) * rr;
    const py = sy + Math.sin(a) * rr * 0.7;
    const vis = 0.4 + 0.6 * Math.max(0, Math.cos(a - Math.PI / 4));
    g.fillStyle = `rgba(255,255,255,${0.10 + vis * 0.25})`;
    g.beginPath(); g.arc(px, py, 1.3, 0, Math.PI * 2); g.fill();
  }
  // glint
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.arc(sx - r * 0.38, sy - r * 0.42, r * 0.22, 0, Math.PI * 2); g.fill();
  // outline
  g.strokeStyle = shade(base, -90); g.lineWidth = 1;
  g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke();
}

export function drawShadow(g, sx, sy, r) {
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath(); g.ellipse(sx, sy, r * 0.9, r * 0.45, 0, 0, Math.PI * 2); g.fill();
}

// ---- enemies ----
export function drawSteelie(g, sx, sy, r, spin) {
  drawMarble(g, sx, sy, r, spin, 0, 0, '#3a3f4a', '#aab0be');
}
export function drawSlinky(g, sx, sy, frame) {
  // a bouncing green coil with eyes
  const bob = Math.sin(frame * 0.2) * 2;
  g.fillStyle = '#2fbf3a';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(sx, sy - i * 3 - bob * (i / 4), 6 - i * 0.6, 3 - i * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = i % 2 ? '#2fbf3a' : '#5fe05a';
  }
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(sx - 2, sy - 11 - bob, 1.6, 0, Math.PI * 2); g.arc(sx + 2, sy - 11 - bob, 1.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#000';
  g.beginPath(); g.arc(sx - 2, sy - 11 - bob, 0.8, 0, Math.PI * 2); g.arc(sx + 2, sy - 11 - bob, 0.8, 0, Math.PI * 2); g.fill();
}

export function initSprites() { /* nothing to prebake — all drawn live */ }
