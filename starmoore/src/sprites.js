// Procedural pixel-art sprite generation. All drawn to offscreen canvases once.
import { TILE } from './data.js';

const TEAM = [
  { main: '#4b8bff', lite: '#9dc2ff', dark: '#26508f', name: 'blue' }, // player
  { main: '#ff5a4b', lite: '#ffb0a4', dark: '#8f2b22', name: 'red' },  // enemy
];

function mk(w, h) {
  const c = (typeof document !== 'undefined')
    ? document.createElement('canvas')
    : { width: w, height: h, getContext: () => null };
  c.width = w; c.height = h;
  return c;
}

function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

// small seeded rng for texture
function rng(seed) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }

export function buildSprites() {
  const S = { units: [{}, {}], buildings: [{}, {}], terrain: {}, res: {}, misc: {} };

  // ---- terrain tiles ----
  S.terrain.grass = terrainTile('#2e5d34', '#356a3c', '#294f2e', 11);
  S.terrain.dirt = terrainTile('#6b5638', '#7a6242', '#5c4a30', 22);
  S.terrain.rock = rockTile();

  // ---- resources ----
  S.res.moore = mooreSprite();
  S.res.gas = gasSprite();

  // ---- units per side ----
  for (let side = 0; side < 2; side++) {
    const t = TEAM[side];
    S.units[side].worker = unitSprite(side, 'worker');
    S.units[side].moorine = unitSprite(side, 'moorine');
    S.units[side].moraider = unitSprite(side, 'moraider');
    S.units[side].siege = unitSprite(side, 'siege');
    S.buildings[side].base = buildingSprite(side, 'base', 3);
    S.buildings[side].depot = buildingSprite(side, 'depot', 2);
    S.buildings[side].barracks = buildingSprite(side, 'barracks', 3, 2);
    S.buildings[side].refinery = buildingSprite(side, 'refinery', 2);
    S.buildings[side].factory = buildingSprite(side, 'factory', 3, 2);
    S.buildings[side].turret = buildingSprite(side, 'turret', 1);
  }
  return S;
}

function terrainTile(base, a, b, seed) {
  const c = mk(TILE, TILE); const ctx = c.getContext('2d'); if (!ctx) return c;
  px(ctx, 0, 0, TILE, TILE, base);
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = (r() * TILE) | 0, y = (r() * TILE) | 0;
    px(ctx, x, y, 1, 1, r() < 0.5 ? a : b);
  }
  return c;
}

function rockTile() {
  const c = mk(TILE, TILE); const ctx = c.getContext('2d'); if (!ctx) return c;
  px(ctx, 0, 0, TILE, TILE, '#3a3f47');
  const r = rng(99);
  // chunky boulders
  for (let i = 0; i < 4; i++) {
    const x = 2 + (r() * (TILE - 8)) | 0, y = 2 + (r() * (TILE - 8)) | 0;
    const s = 4 + (r() * 5) | 0;
    px(ctx, x, y, s, s, '#565c66');
    px(ctx, x, y, s, 1, '#6e747f');
    px(ctx, x, y + s - 1, s, 1, '#2a2e34');
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
  return c;
}

function mooreSprite() {
  const c = mk(TILE, TILE); const ctx = c.getContext('2d'); if (!ctx) return c;
  const crystals = [[10, 4, 6], [4, 8, 5], [13, 9, 5], [8, 11, 6]];
  for (const [cx, cy, h] of crystals) {
    ctx.fillStyle = '#2fd8e0';
    ctx.beginPath();
    ctx.moveTo(cx, cy - h); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx - 3, cy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#bff6fa';
    ctx.beginPath(); ctx.moveTo(cx, cy - h); ctx.lineTo(cx + 1, cy - 1); ctx.lineTo(cx - 1, cy - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a9aa8';
    ctx.beginPath(); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx + 1, cy - 1); ctx.closePath(); ctx.fill();
  }
  return c;
}

function gasSprite() {
  const c = mk(TILE, TILE); const ctx = c.getContext('2d'); if (!ctx) return c;
  px(ctx, 3, 5, 14, 12, '#3b5a2a');
  ctx.fillStyle = '#77c23a';
  for (const [x, y] of [[5, 8], [10, 6], [12, 11], [6, 12]]) {
    ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#b6f06a';
  ctx.beginPath(); ctx.arc(10, 8, 1.4, 0, 7); ctx.fill();
  ctx.strokeStyle = '#24361a'; ctx.strokeRect(3.5, 5.5, 13, 11);
  return c;
}

function unitSprite(side, type) {
  const t = TEAM[side];
  // draw facing up (north); rotation applied at draw time
  const sz = type === 'siege' ? 20 : type === 'moraider' ? 16 : 14;
  const c = mk(sz, sz); const ctx = c.getContext('2d'); if (!ctx) return { canvas: c, sz };
  const cx = sz / 2, cy = sz / 2;
  ctx.save();
  if (type === 'worker') {
    // rounded body + tool
    circle(ctx, cx, cy, 4.5, t.dark);
    circle(ctx, cx, cy, 3.4, t.main);
    px(ctx, cx - 1, cy - 5, 2, 3, '#d8d8a0'); // tool front
    circle(ctx, cx, cy - 0.5, 1.4, t.lite);
  } else if (type === 'moorine') {
    circle(ctx, cx, cy, 4.2, t.dark);
    circle(ctx, cx, cy, 3.2, t.main);
    px(ctx, cx - 0.8, cy - 6, 1.6, 4, '#cfcfcf'); // rifle
    circle(ctx, cx, cy - 1, 1.3, t.lite);
  } else if (type === 'moraider') {
    // bulky armored
    roundRect(ctx, cx - 5, cy - 5, 10, 10, 2, t.dark);
    roundRect(ctx, cx - 4, cy - 4, 8, 8, 2, t.main);
    px(ctx, cx - 3, cy - 6, 6, 2, '#9aa0aa'); // shoulder plate
    circle(ctx, cx, cy, 1.6, t.lite);
  } else if (type === 'siege') {
    // tank: hull + turret + barrel
    roundRect(ctx, cx - 7, cy - 6, 14, 12, 2, t.dark);
    roundRect(ctx, cx - 6, cy - 5, 12, 10, 2, t.main);
    px(ctx, cx - 7, cy - 6, 2, 12, '#2b2f36'); px(ctx, cx + 5, cy - 6, 2, 12, '#2b2f36'); // treads
    circle(ctx, cx, cy, 3.6, t.dark); circle(ctx, cx, cy, 2.8, t.lite);
    px(ctx, cx - 1, cy - 9, 2, 6, '#3a3f47'); // barrel
  }
  ctx.restore();
  return { canvas: c, sz };
}

function buildingSprite(side, type, wTiles, hTiles) {
  hTiles = hTiles || wTiles;
  const t = TEAM[side];
  const W = wTiles * TILE, H = hTiles * TILE;
  const c = mk(W, H); const ctx = c.getContext('2d'); if (!ctx) return c;
  const pad = 3;
  // base slab
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 4, t.dark);
  roundRect(ctx, pad + 2, pad + 2, W - pad * 2 - 4, H - pad * 2 - 4, 3, '#3b4250');
  const inx = pad + 4, iny = pad + 4, inw = W - pad * 2 - 8, inh = H - pad * 2 - 8;

  if (type === 'base') {
    roundRect(ctx, inx, iny, inw, inh, 3, '#4a5364');
    circle(ctx, W / 2, H / 2, W * 0.24, t.dark);
    circle(ctx, W / 2, H / 2, W * 0.19, t.main);
    circle(ctx, W / 2, H / 2, W * 0.10, t.lite);
    // corner lights
    for (const [x, y] of [[inx + 3, iny + 3], [inx + inw - 3, iny + 3], [inx + 3, iny + inh - 3], [inx + inw - 3, iny + inh - 3]]) circle(ctx, x, y, 2, t.lite);
  } else if (type === 'depot') {
    roundRect(ctx, inx, iny, inw, inh, 2, '#454d5c');
    for (let i = 0; i < 3; i++) px(ctx, inx + 2, iny + 3 + i * 6, inw - 4, 3, i % 2 ? t.main : '#5a6377');
    circle(ctx, W / 2, H / 2, 3, t.lite);
  } else if (type === 'barracks') {
    roundRect(ctx, inx, iny, inw, inh, 2, '#4a5364');
    px(ctx, W / 2 - 5, H - pad - 8, 10, 6, '#20242c'); // door
    px(ctx, inx + 2, iny + 2, inw - 4, 3, t.main);     // banner
    circle(ctx, inx + 5, iny + 6, 2, t.lite);
  } else if (type === 'refinery') {
    roundRect(ctx, inx, iny, inw, inh, 3, '#4a5364');
    circle(ctx, W / 2, H / 2, W * 0.2, '#3b5a2a');
    circle(ctx, W / 2, H / 2, W * 0.13, '#77c23a');
    // pipes
    px(ctx, inx, H / 2 - 1, inw, 2, t.main);
  } else if (type === 'factory') {
    roundRect(ctx, inx, iny, inw, inh, 2, '#4a5364');
    // saw-tooth roof
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#5a6377'; ctx.beginPath(); ctx.moveTo(inx + i * (inw / 3), iny + inh); ctx.lineTo(inx + i * (inw / 3) + inw / 6, iny + 2); ctx.lineTo(inx + (i + 1) * (inw / 3), iny + inh); ctx.fill(); }
    px(ctx, W / 2 - 6, H - pad - 7, 12, 5, '#20242c');
    px(ctx, inx + 2, iny + 1, 3, 6, '#777'); // chimney
  } else if (type === 'turret') {
    roundRect(ctx, inx, iny, inw, inh, 3, '#4a5364');
    circle(ctx, W / 2, H / 2, W * 0.26, t.dark);
    circle(ctx, W / 2, H / 2, W * 0.18, t.main);
    px(ctx, W / 2 - 1.5, iny, 3, H * 0.4, '#2b2f36'); // gun
  }
  // outline
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(pad + 0.5, pad + 0.5, W - pad * 2 - 1, H - pad * 2 - 1);
  return c;
}

function circle(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function roundRect(ctx, x, y, w, h, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
}

export { TEAM };
