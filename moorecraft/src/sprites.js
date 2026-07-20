// sprites.js — procedural block-face textures (sampled by the raycaster)
// and HUD item icons / mob art. Browser-side (uses canvas for HUD icons).

import { B, BLOCKS } from './world.js';
import { I } from './craft.js';

export const TS = 8; // texture tile size

function h2(x, y, s) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (s * 83492791);
  h = (h ^ (h >> 13)) >>> 0;
  return (h % 1000) / 1000;
}
function shade(col, f) {
  return [
    Math.max(0, Math.min(255, col[0] * f)),
    Math.max(0, Math.min(255, col[1] * f)),
    Math.max(0, Math.min(255, col[2] * f)),
  ];
}

// TEX[id] = { top, side, bottom } each Uint8ClampedArray(TS*TS*3)
export const TEX = [];

function makeTile(fn) {
  const a = new Uint8ClampedArray(TS * TS * 3);
  for (let v = 0; v < TS; v++)
    for (let u = 0; u < TS; u++) {
      const c = fn(u, v);
      const o = (v * TS + u) * 3;
      a[o] = c[0]; a[o + 1] = c[1]; a[o + 2] = c[2];
    }
  return a;
}

// Gemlike face shading: a smooth vertical gradient (polished sheen up top,
// shadow at the base) plus a couple of crystalline facet seams, so blocks read
// as cut crystal instead of noise speckle. `amp` controls surface grain.
function gem(base, seed, amp = 0.06, tintTop = 0, tintBot = 0) {
  return makeTile((u, v) => {
    // vertical polish gradient
    let f = 1.14 - (v / (TS - 1)) * 0.4;
    // crystalline facet seams (diagonals)
    const dseam = (u - v + TS) % TS;
    if (dseam === 2) f += 0.16;          // bright cut edge
    else if (dseam === 5) f += 0.08;
    if ((u + v) % TS === 1) f -= 0.1;    // dark cleft
    // fine grain
    f += (h2(u, v, seed) - 0.5) * amp;
    const c = shade(base, f);
    if (tintTop && v < 2) { c[0] += tintTop; c[1] += tintTop; c[2] += tintTop; }
    if (tintBot && v > TS - 3) { c[0] -= tintBot; c[1] -= tintBot; c[2] -= tintBot; }
    return c;
  });
}

export function buildTextures() {
  for (let id = 0; id < BLOCKS.length; id++) {
    const base = BLOCKS[id].col;
    let top, side, bottom;

    switch (id) {
      case B.GRASS: {
        const g = base;
        // Glossy grass top: a clean vertical gradient with only a whisper of
        // grain and no crystalline facet seams, so it reads as a smooth,
        // polished lawn (the renderer adds a view-dependent specular sheen).
        top = makeTile((u, v) => {
          const f = 1.16 - (v / (TS - 1)) * 0.34 + (h2(u, v, 3) - 0.5) * 0.03;
          return shade(g, f);
        });
        const dirt = BLOCKS[B.DIRT].col;
        side = makeTile((u, v) => {
          // gem gradient underneath a crisp mossy cap
          let f = 1.08 - (v / (TS - 1)) * 0.32 + (h2(u, v, 7) - 0.5) * 0.08;
          if (v < 2) return shade(g, 1.05 - v * 0.06 + h2(u, v, 5) * 0.14);
          if (v === 2 && h2(u, v, 9) > 0.45) return shade(g, 0.82);
          return shade(dirt, f);
        });
        bottom = gem(dirt, 7, 0.1);
        break;
      }
      case B.DIRT:
        top = side = bottom = gem(base, 7, 0.12);
        break;
      case B.STONE:
      case B.COBBLE: {
        const amp = id === B.COBBLE ? 0.14 : 0.07;
        top = side = bottom = makeTile((u, v) => {
          let f = 1.12 - (v / (TS - 1)) * 0.36;
          const dseam = (u - v + TS) % TS;
          if (dseam === 2) f += 0.14; else if (dseam === 4) f += 0.06;
          if (id === B.COBBLE && (u % 4 === 0 || v % 4 === 0)) f *= 0.82;
          f += (h2(u, v, id) - 0.5) * amp;
          return shade(base, f);
        });
        break;
      }
      case B.LOG: {
        const bark = base;
        side = makeTile((u, v) => {
          let f = 0.86 + Math.sin(u * 1.6) * 0.12 + (v / (TS - 1)) * -0.14 + h2(u, v, 2) * 0.16;
          return shade(bark, f);
        });
        const rings = shade(base, 1.25);
        top = makeTile((u, v) => {
          const dx = u - 3.5, dy = v - 3.5; const r = Math.sqrt(dx * dx + dy * dy);
          return shade(rings, 0.72 + (Math.sin(r * 2.4) * 0.16 + 0.14));
        });
        bottom = top;
        break;
      }
      case B.PLANKS:
        top = side = bottom = makeTile((u, v) => {
          let f = 1.06 - (v / (TS - 1)) * 0.22 + h2(u, v, 4) * 0.12;
          if (v % 4 === 3) f *= 0.76;         // plank seam
          return shade(base, f);
        });
        break;
      case B.LEAVES:
        top = side = bottom = makeTile((u, v) => {
          const n = h2(u, v, 11);
          // dappled canopy with cool sheen
          return shade(base, 0.66 + n * 0.6 + (1 - v / (TS - 1)) * 0.14);
        });
        break;
      case B.SAND:
        top = side = bottom = gem(base, 6, 0.05);
        break;
      case B.COAL:
      case B.IRON:
      case B.LUMORE: {
        const stone = BLOCKS[B.STONE].col;
        const ore = base;
        top = side = bottom = makeTile((u, v) => {
          let f = 1.1 - (v / (TS - 1)) * 0.34;
          const n = h2(u, v, id * 3);
          if (n > 0.7) {
            // embedded gem nugget — brighter, faceted
            const b2 = shade(ore, id === B.LUMORE ? 1.5 : 1.15);
            const dseam = (u - v + TS) % TS;
            return shade(b2, dseam === 2 ? 1.2 : 1.0);
          }
          return shade(stone, f + (h2(u, v, 2) - 0.5) * 0.08);
        });
        break;
      }
      case B.LUMITE:
        // bright cyan crystal — facet seams glow; render adds the live pulse.
        top = side = bottom = makeTile((u, v) => {
          let f = 1.0 + (1 - v / (TS - 1)) * 0.25;
          const dseam = (u - v + TS) % TS;
          if (dseam === 2 || dseam === 5) f += 0.35;    // glowing veins
          f += h2(u, v, 13) * 0.25;
          return shade(base, f);
        });
        break;
      case B.VOIDSTONE:
        top = side = bottom = makeTile((u, v) => {
          let f = 1.05 - (v / (TS - 1)) * 0.3 + (h2(u, v, 17) - 0.5) * 0.22;
          // faint violet sparkle
          if (h2(u, v, 29) > 0.86) return [base[0] + 40, base[1] + 20, base[2] + 70];
          return shade(base, f);
        });
        break;
      case B.TABLE: {
        side = makeTile((u, v) => {
          let f = 0.9 + h2(u, v, 4) * 0.2;
          if (v < 3 && (u === 0 || u === 7 || v === 0)) f *= 0.7; // tool motif border
          if (v < 3 && h2(u, v, 21) > 0.6) f *= 1.15;
          return shade(base, f);
        });
        top = makeTile((u, v) => {
          let f = 0.85 + h2(u, v, 8) * 0.2;
          if ((u === 3 || u === 4) && (v === 3 || v === 4)) f *= 0.6;
          return shade(base, f);
        });
        bottom = makeTile((u, v) => shade(BLOCKS[B.PLANKS].col, 0.85 + h2(u, v, 4) * 0.2));
        break;
      }
      case B.GLASS:
        top = side = bottom = makeTile((u, v) => {
          if (u === 0 || v === 0 || u === TS - 1 || v === TS - 1) return shade(base, 1.1);
          return shade(base, 0.95 + h2(u, v, 2) * 0.1);
        });
        break;
      case B.TORCH:
        top = side = bottom = makeTile((u, v) => {
          const dx = u - 3.5; if (Math.abs(dx) < 1.5 && v > 2) return shade(BLOCKS[B.PLANKS].col, 0.8);
          if (v <= 2 && Math.abs(dx) < 2) return shade(base, 1.2 + h2(u, v, 1) * 0.3);
          return [0, 0, 0];
        });
        break;
      default:
        top = side = bottom = gem(base, id, 0.1);
    }
    TEX[id] = { top, side, bottom };
  }
  return TEX;
}

// transparency alpha for non-opaque blocks (0..1 coverage)
export const ALPHA = {
  [B.WATER]: 0.62, [B.GLASS]: 0.32, [B.LEAVES]: 0.85, [B.TORCH]: 1.0,
};

// ---------------- HUD item icons ----------------
function rgb(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

export function drawItemIcon(ctx, id, x, y, s) {
  if (id >= 100) return drawToolIcon(ctx, id, x, y, s);
  // block: little iso-ish shaded square
  const b = BLOCKS[id];
  const top = shade(b.col, id === B.GRASS ? 1.0 : 1.05);
  const left = shade(b.col, 0.7);
  const right = shade(b.col, 0.85);
  const q = s * 0.5;
  // top face (diamond-ish simplified to rect)
  ctx.fillStyle = rgb(top);
  ctx.fillRect(x + s * 0.18, y + s * 0.1, s * 0.64, s * 0.34);
  ctx.fillStyle = rgb(left);
  ctx.fillRect(x + s * 0.18, y + s * 0.44, s * 0.32, s * 0.46);
  ctx.fillStyle = rgb(right);
  ctx.fillRect(x + s * 0.5, y + s * 0.44, s * 0.32, s * 0.46);
}

function drawToolIcon(ctx, id, x, y, s) {
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  if (id === I.STICK) {
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.moveTo(-s * 0.22, s * 0.28); ctx.lineTo(s * 0.22, -s * 0.28); ctx.stroke();
  } else if (id === I.INGOT) {
    ctx.fillStyle = '#c8c0b4';
    ctx.fillRect(-s * 0.28, -s * 0.12, s * 0.56, s * 0.24);
  } else if (id === I.CRYSTAL) {
    ctx.fillStyle = '#7ee8f6'; ctx.beginPath();
    ctx.moveTo(0, -s * 0.3); ctx.lineTo(s * 0.22, 0); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.22, 0); ctx.closePath(); ctx.fill();
  } else if (id === I.APPLE) {
    ctx.fillStyle = '#d23b2e'; ctx.beginPath(); ctx.arc(0, s * 0.05, s * 0.28, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(0, -s * 0.05); ctx.lineTo(s * 0.06, -s * 0.28); ctx.stroke();
  } else if (id === I.TETHER) {
    ctx.strokeStyle = '#7ee8f6'; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.05, s * 0.18, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#c8c0b4';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.28, s * 0.28); ctx.stroke();
  } else {
    // pickaxe (wood/stone/iron tint)
    const headCol = id === I.WOODPICK ? '#b08a56' : id === I.STONEPICK ? '#8a8a90' : '#d8d2c6';
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = s * 0.12;
    ctx.beginPath(); ctx.moveTo(-s * 0.05, s * 0.32); ctx.lineTo(s * 0.12, -s * 0.18); ctx.stroke();
    ctx.strokeStyle = headCol; ctx.lineWidth = s * 0.12;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.05); ctx.quadraticCurveTo(s * 0.12, -s * 0.34, s * 0.32, -s * 0.02); ctx.stroke();
  }
  ctx.restore();
}
