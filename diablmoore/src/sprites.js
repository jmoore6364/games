// sprites.js — procedural pixel art rendered to offscreen canvases. Browser only.
export const TILE_W = 32, TILE_H = 16, WALL_H = 20;

function C(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
  return `rgb(${r},${g},${b})`;
}
// deterministic tiny rng for texture speckle
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const cache = new Map();
function cached(key, fn) { if (cache.has(key)) return cache.get(key); const v = fn(); cache.set(key, v); return v; }

// diamond path for a floor tile centered in canvas
function diamond(g, cx, cy, w, h) {
  g.beginPath();
  g.moveTo(cx, cy - h / 2); g.lineTo(cx + w / 2, cy); g.lineTo(cx, cy + h / 2); g.lineTo(cx - w / 2, cy); g.closePath();
}

export function floorTile(theme, variant = 0) {
  return cached('floor_' + theme.key + variant, () => {
    const c = C(TILE_W + 2, TILE_H + 6), g = c.getContext('2d');
    const cx = c.width / 2, cy = TILE_H / 2 + 1;
    diamond(g, cx, cy, TILE_W, TILE_H);
    g.fillStyle = theme.floor; g.fill();
    // speckle texture
    const r = rng(theme.key.length * 31 + variant * 7 + 3);
    for (let i = 0; i < 22; i++) {
      const t = r(), s = r();
      const px = cx + (t - 0.5) * TILE_W * 0.7;
      const py = cy + (s - 0.5) * TILE_H * 0.7;
      g.fillStyle = r() < 0.5 ? shade(theme.floor, 8) : shade(theme.floor, -12);
      g.fillRect(px | 0, py | 0, 1, 1);
    }
    // bevel edges (top-left lit, bottom-right dark)
    g.strokeStyle = shade(theme.floor, 14); g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - TILE_W / 2, cy); g.lineTo(cx, cy - TILE_H / 2); g.stroke();
    g.strokeStyle = shade(theme.floor, -22);
    g.beginPath(); g.moveTo(cx, cy + TILE_H / 2); g.lineTo(cx + TILE_W / 2, cy); g.stroke();
    return c;
  });
}

export function wallTile(theme) {
  return cached('wall_' + theme.key, () => {
    const c = C(TILE_W + 2, TILE_H + WALL_H + 6), g = c.getContext('2d');
    const cx = c.width / 2;
    const topY = WALL_H + TILE_H / 2 + 1; // center of top diamond baseline
    const baseY = topY; // top face center
    // left face
    g.fillStyle = shade(theme.wall, -26);
    g.beginPath();
    g.moveTo(cx - TILE_W / 2, baseY); g.lineTo(cx, baseY + TILE_H / 2);
    g.lineTo(cx, baseY + TILE_H / 2 - WALL_H); g.lineTo(cx - TILE_W / 2, baseY - WALL_H); g.closePath(); g.fill();
    // right face
    g.fillStyle = shade(theme.wall, -46);
    g.beginPath();
    g.moveTo(cx + TILE_W / 2, baseY); g.lineTo(cx, baseY + TILE_H / 2);
    g.lineTo(cx, baseY + TILE_H / 2 - WALL_H); g.lineTo(cx + TILE_W / 2, baseY - WALL_H); g.closePath(); g.fill();
    // brick lines on faces
    g.strokeStyle = shade(theme.wall, -60); g.lineWidth = 1;
    for (let yy = 0; yy < WALL_H; yy += 6) {
      g.beginPath(); g.moveTo(cx - TILE_W / 2, baseY - yy); g.lineTo(cx, baseY + TILE_H / 2 - yy); g.stroke();
      g.beginPath(); g.moveTo(cx + TILE_W / 2, baseY - yy); g.lineTo(cx, baseY + TILE_H / 2 - yy); g.stroke();
    }
    // top face (lit)
    diamond(g, cx, baseY - WALL_H + TILE_H / 2 - TILE_H / 2, TILE_W, TILE_H);
    g.save(); g.translate(0, 0);
    diamond(g, cx, baseY - WALL_H, TILE_W, TILE_H);
    g.fillStyle = theme.wallTop; g.fill();
    g.strokeStyle = shade(theme.wallTop, 20); g.stroke();
    g.restore();
    const r = rng(theme.key.length * 17 + 9);
    for (let i = 0; i < 10; i++) { g.fillStyle = shade(theme.wallTop, -14); g.fillRect((cx + (r() - 0.5) * TILE_W * 0.6) | 0, (baseY - WALL_H + (r() - 0.5) * TILE_H * 0.6) | 0, 1, 1); }
    return c;
  });
}

export function doorTile(theme) {
  return cached('door_' + theme.key, () => {
    const c = C(TILE_W + 2, TILE_H + 22), g = c.getContext('2d');
    const cx = c.width / 2, cy = c.height - TILE_H / 2 - 1;
    // floor under
    diamond(g, cx, cy, TILE_W, TILE_H); g.fillStyle = shade(theme.floor, -6); g.fill();
    // arch frame
    g.fillStyle = shade(theme.accent, -20);
    g.fillRect(cx - 8, cy - 20, 16, 20);
    g.fillStyle = '#161014';
    g.fillRect(cx - 5, cy - 16, 10, 16);
    g.strokeStyle = shade(theme.accent, 10); g.lineWidth = 1; g.strokeRect(cx - 8, cy - 20, 16, 20);
    return c;
  });
}

export function stairsTile(dir, theme) {
  return cached('stairs_' + dir + '_' + theme.key, () => {
    const c = C(TILE_W + 2, TILE_H + 16), g = c.getContext('2d');
    const cx = c.width / 2, cy = c.height - TILE_H / 2 - 1;
    diamond(g, cx, cy, TILE_W, TILE_H); g.fillStyle = shade(theme.floor, -10); g.fill();
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const yy = cy - i * 3;
      const col = dir === 'down' ? shade('#0a0a10', i * 10) : shade(theme.wallTop, -i * 8);
      g.fillStyle = col;
      diamond(g, cx, yy, TILE_W * (1 - t * 0.5), TILE_H * (1 - t * 0.5)); g.fill();
    }
    // glow marker
    g.fillStyle = dir === 'down' ? 'rgba(150,60,200,0.5)' : 'rgba(120,180,255,0.4)';
    diamond(g, cx, cy, TILE_W * 0.4, TILE_H * 0.4); g.fill();
    return c;
  });
}

export function decorSprite(type, theme) {
  return cached('decor_' + type + '_' + theme.key, () => {
    const c = C(24, 30), g = c.getContext('2d');
    const cx = 12, base = 26;
    if (type === 'bones') {
      g.fillStyle = '#cfc7b3';
      g.fillRect(cx - 6, base - 3, 12, 2);
      g.fillRect(cx - 2, base - 8, 2, 8); g.fillRect(cx + 1, base - 7, 2, 7);
      g.beginPath(); g.arc(cx + 5, base - 3, 3, 0, 7); g.fill(); // skull
      g.fillStyle = '#2a2620'; g.fillRect(cx + 4, base - 4, 1, 1); g.fillRect(cx + 6, base - 4, 1, 1);
    } else if (type === 'barrel') {
      g.fillStyle = shade('#5a3d24', 0); g.fillRect(cx - 6, base - 16, 12, 16);
      g.fillStyle = shade('#5a3d24', 16); g.fillRect(cx - 6, base - 16, 4, 16);
      g.fillStyle = '#3a2716'; g.fillRect(cx - 6, base - 13, 12, 2); g.fillRect(cx - 6, base - 5, 12, 2);
      g.fillStyle = shade('#5a3d24', 22); g.fillRect(cx - 6, base - 17, 12, 2);
    } else if (type === 'sarcophagus') {
      g.fillStyle = shade(theme.accent, -6); g.fillRect(cx - 8, base - 14, 16, 14);
      g.fillStyle = shade(theme.accent, 14); g.fillRect(cx - 8, base - 18, 16, 5);
      g.fillStyle = shade(theme.accent, -30); g.fillRect(cx - 5, base - 12, 10, 10);
      g.fillStyle = '#c9c2a8'; g.beginPath(); g.arc(cx, base - 8, 3, 0, 7); g.fill(); // effigy face
    } else if (type === 'brazier') {
      g.fillStyle = '#2a2a30'; g.fillRect(cx - 1, base - 10, 2, 10);
      g.fillStyle = '#3a3a44'; g.beginPath(); g.ellipse(cx, base - 12, 6, 3, 0, 0, 7); g.fill();
      const grad = g.createRadialGradient(cx, base - 15, 1, cx, base - 15, 7);
      grad.addColorStop(0, '#ffd27a'); grad.addColorStop(0.5, '#ff7a2a'); grad.addColorStop(1, 'rgba(200,40,0,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(cx, base - 15, 7, 0, 7); g.fill();
    }
    return c;
  });
}

// ---- creatures -------------------------------------------------------------
// All billboard sprites, anchored bottom-center, lit top-left.
export function playerSprite(cls) {
  return cached('player_' + cls, () => {
    const c = C(24, 34), g = c.getContext('2d');
    const cx = 12, base = 32;
    // shadow handled at draw time
    const skin = '#c8a17a';
    const cloth = cls === 'warrior' ? '#7a2f2a' : cls === 'rogue' ? '#2f5a3a' : '#33356f';
    const cloth2 = shade(cloth, 20);
    // legs
    g.fillStyle = '#2a2420'; g.fillRect(cx - 4, base - 8, 3, 8); g.fillRect(cx + 1, base - 8, 3, 8);
    // torso / cloak
    g.fillStyle = cloth; g.fillRect(cx - 5, base - 18, 10, 11);
    g.fillStyle = cloth2; g.fillRect(cx - 5, base - 18, 3, 11);
    // shoulders
    g.fillStyle = shade(cloth, -18); g.fillRect(cx - 6, base - 18, 12, 2);
    // head
    g.fillStyle = skin; g.beginPath(); g.arc(cx, base - 21, 3.4, 0, 7); g.fill();
    g.fillStyle = shade(skin, 18); g.fillRect(cx - 3, base - 23, 2, 2);
    // hair/hood
    g.fillStyle = shade(cloth, -30); g.fillRect(cx - 3, base - 25, 6, 3);
    // class weapon
    if (cls === 'warrior') { g.fillStyle = '#cfd6dd'; g.fillRect(cx + 5, base - 26, 2, 16); g.fillStyle = '#8a6a3a'; g.fillRect(cx + 4, base - 12, 4, 2); }
    else if (cls === 'rogue') { g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx + 7, base - 16, 8, -1.1, 1.1); g.stroke(); g.strokeStyle = '#ddd'; g.beginPath(); g.moveTo(cx + 7 + 8 * Math.cos(-1.1), base - 16 + 8 * Math.sin(-1.1)); g.lineTo(cx + 7 + 8 * Math.cos(1.1), base - 16 + 8 * Math.sin(1.1)); g.stroke(); }
    else { g.fillStyle = '#6a4a2a'; g.fillRect(cx + 5, base - 28, 2, 20); const grad = g.createRadialGradient(cx + 6, base - 28, 1, cx + 6, base - 28, 5); grad.addColorStop(0, '#bfe0ff'); grad.addColorStop(1, 'rgba(80,140,255,0)'); g.fillStyle = grad; g.beginPath(); g.arc(cx + 6, base - 28, 5, 0, 7); g.fill(); }
    return c;
  });
}

export function monsterSprite(key, color) {
  return cached('mon_' + key, () => {
    const s = key === 'boss' ? 2.0 : key === 'moorcher' ? 1.5 : 1;
    const w = Math.round(24 * s), h = Math.round(34 * s);
    const c = C(w, h), g = c.getContext('2d');
    const cx = w / 2, base = h - 2;
    const u = s; // unit scale
    if (key === 'skeleton') {
      g.fillStyle = '#e6e0cf';
      g.fillRect(cx - 1, base - 16, 2, 10); // spine
      for (let i = 0; i < 3; i++) g.fillRect(cx - 4, base - 14 + i * 3, 8, 1); // ribs
      g.fillRect(cx - 4, base - 6, 3, 6); g.fillRect(cx + 1, base - 6, 3, 6); // legs
      g.beginPath(); g.arc(cx, base - 19, 3.4, 0, 7); g.fill(); // skull
      g.fillStyle = '#301'; g.fillRect(cx - 2, base - 20, 1.4, 1.4); g.fillRect(cx + 0.6, base - 20, 1.4, 1.4);
      g.strokeStyle = '#cfcaba'; g.beginPath(); g.moveTo(cx + 3, base - 15); g.lineTo(cx + 8, base - 22); g.stroke(); // weapon arm
      g.fillStyle = '#bcb'; g.fillRect(cx + 7, base - 26, 1.5, 8);
    } else if (key === 'zombie') {
      g.fillStyle = color; g.fillRect(cx - 5, base - 16, 10, 12);
      g.fillStyle = shade(color, -22); g.fillRect(cx - 5, base - 6, 4, 6); g.fillRect(cx + 1, base - 6, 4, 6);
      g.fillStyle = shade(color, 14); g.beginPath(); g.arc(cx, base - 19, 3.6, 0, 7); g.fill();
      g.fillStyle = '#201'; g.fillRect(cx - 2, base - 20, 1.4, 1.4); g.fillRect(cx + 0.8, base - 20, 1.4, 1.4);
      g.fillStyle = shade(color, -30); g.fillRect(cx - 5, base - 12, 10, 2); // wound
      g.fillStyle = shade(color, 6); g.fillRect(cx - 7, base - 15, 3, 8); // dangling arm
    } else if (key === 'fallen') {
      g.fillStyle = color; g.beginPath(); g.arc(cx, base - 8, 5, 0, 7); g.fill();
      g.fillStyle = shade(color, 16); g.beginPath(); g.arc(cx, base - 12, 4, 0, 7); g.fill();
      g.fillStyle = '#2a0'; g.fillRect(cx - 2.5, base - 13, 1.4, 1.4); g.fillRect(cx + 1, base - 13, 1.4, 1.4);
      g.fillStyle = shade(color, -20); g.beginPath(); g.moveTo(cx - 4, base - 15); g.lineTo(cx - 6, base - 19); g.lineTo(cx - 2, base - 15); g.fill(); // horns
      g.beginPath(); g.moveTo(cx + 4, base - 15); g.lineTo(cx + 6, base - 19); g.lineTo(cx + 2, base - 15); g.fill();
    } else if (key === 'hound') {
      g.fillStyle = color; g.fillRect(cx - 7, base - 9, 14, 6); // body
      g.fillStyle = shade(color, 12); g.beginPath(); g.arc(cx + 7, base - 10, 4, 0, 7); g.fill(); // head
      g.fillStyle = '#f80'; g.fillRect(cx + 8, base - 11, 1.4, 1.4);
      g.fillStyle = shade(color, -20); g.fillRect(cx - 6, base - 3, 2, 3); g.fillRect(cx + 4, base - 3, 2, 3); // legs
      g.fillStyle = shade(color, -10); g.beginPath(); g.moveTo(cx - 7, base - 9); g.lineTo(cx - 11, base - 12); g.lineTo(cx - 7, base - 5); g.fill(); // tail
    } else if (key === 'darkone') {
      g.fillStyle = color; g.fillRect(cx - 5, base - 20, 10, 18); // robe
      g.fillStyle = shade(color, -20); g.fillRect(cx - 5, base - 20, 10, 4);
      g.fillStyle = '#120a1a'; g.beginPath(); g.arc(cx, base - 20, 4, Math.PI, 0); g.fill(); // hood shadow
      g.fillStyle = '#c0f'; g.fillRect(cx - 2, base - 20, 1.5, 1.5); g.fillRect(cx + 0.8, base - 20, 1.5, 1.5); // glowing eyes
      const grad = g.createRadialGradient(cx + 6, base - 12, 1, cx + 6, base - 12, 4); grad.addColorStop(0, '#e090ff'); grad.addColorStop(1, 'rgba(160,40,255,0)'); g.fillStyle = grad; g.beginPath(); g.arc(cx + 6, base - 12, 4, 0, 7); g.fill();
    } else if (key === 'moorcher') {
      g.fillStyle = color; g.fillRect(cx - 8 * u, base - 22 * u, 16 * u, 20 * u);
      g.fillStyle = shade(color, 16); g.beginPath(); g.arc(cx, base - 24 * u, 5 * u, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.fillRect(cx - 3 * u, base - 25 * u, 1.6 * u, 1.6 * u); g.fillRect(cx + 1.4 * u, base - 25 * u, 1.6 * u, 1.6 * u);
      g.fillStyle = '#3a0f0a'; g.fillRect(cx - 8 * u, base - 12 * u, 16 * u, 3 * u); // apron blood
      g.fillStyle = '#cfd6dd'; g.fillRect(cx + 8 * u, base - 30 * u, 3 * u, 22 * u); // cleaver
      g.fillStyle = shade('#cfd6dd', -20); g.fillRect(cx + 8 * u, base - 30 * u, 8 * u, 6 * u);
    } else if (key === 'boss') {
      // hulking demon
      g.fillStyle = color; g.fillRect(cx - 9 * u, base - 26 * u, 18 * u, 24 * u);
      g.fillStyle = shade(color, -30); g.fillRect(cx - 9 * u, base - 8 * u, 6 * u, 8 * u); g.fillRect(cx + 3 * u, base - 8 * u, 6 * u, 8 * u);
      g.fillStyle = shade(color, 20); g.beginPath(); g.arc(cx, base - 28 * u, 6 * u, 0, 7); g.fill();
      // horns
      g.fillStyle = '#1a0a08'; g.beginPath(); g.moveTo(cx - 6 * u, base - 30 * u); g.lineTo(cx - 12 * u, base - 40 * u); g.lineTo(cx - 3 * u, base - 31 * u); g.fill();
      g.beginPath(); g.moveTo(cx + 6 * u, base - 30 * u); g.lineTo(cx + 12 * u, base - 40 * u); g.lineTo(cx + 3 * u, base - 31 * u); g.fill();
      // glowing eyes + maw
      g.fillStyle = '#ffef7a'; g.fillRect(cx - 3 * u, base - 29 * u, 2 * u, 2 * u); g.fillRect(cx + 1 * u, base - 29 * u, 2 * u, 2 * u);
      const grad = g.createRadialGradient(cx, base - 16 * u, 2, cx, base - 16 * u, 12 * u); grad.addColorStop(0, 'rgba(255,120,40,0.7)'); grad.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = grad; g.fillRect(cx - 12 * u, base - 28 * u, 24 * u, 24 * u);
      // wings hint
      g.fillStyle = shade(color, -40); g.beginPath(); g.moveTo(cx - 9 * u, base - 24 * u); g.lineTo(cx - 18 * u, base - 30 * u); g.lineTo(cx - 9 * u, base - 12 * u); g.fill();
      g.beginPath(); g.moveTo(cx + 9 * u, base - 24 * u); g.lineTo(cx + 18 * u, base - 30 * u); g.lineTo(cx + 9 * u, base - 12 * u); g.fill();
    }
    return c;
  });
}

// townsfolk NPCs
export function npcSprite(kind) {
  return cached('npc_' + kind, () => {
    const c = C(24, 34), g = c.getContext('2d');
    const cx = 12, base = 32;
    const robe = kind === 'vendor' ? '#6a5030' : kind === 'healer' ? '#d8d4c8' : '#3a3550';
    g.fillStyle = robe; g.fillRect(cx - 5, base - 18, 10, 16);
    g.fillStyle = shade(robe, -20); g.fillRect(cx - 5, base - 18, 3, 16);
    g.fillStyle = '#c8a17a'; g.beginPath(); g.arc(cx, base - 21, 3.4, 0, 7); g.fill();
    g.fillStyle = '#eee'; g.fillRect(cx - 3, base - 24, 6, 3); // grey hair
    if (kind === 'vendor') { g.fillStyle = '#8a6a3a'; g.fillRect(cx - 7, base - 10, 3, 6); } // wares
    if (kind === 'healer') { g.fillStyle = '#d33'; g.fillRect(cx - 1, base - 15, 2, 6); g.fillRect(cx - 3, base - 13, 6, 2); } // cross
    if (kind === 'cain') { g.fillStyle = '#8a6a3a'; g.fillRect(cx + 5, base - 20, 1.5, 18); } // staff
    return c;
  });
}

export function itemGroundSprite(item) {
  const key = 'gitem_' + (item.type === 'potion' ? 'pot_' + item.potion.kind : item.slot + '_' + item.rarity + '_' + item.base);
  return cached(key, () => {
    const c = C(18, 18), g = c.getContext('2d');
    const cx = 9, cy = 10;
    if (item.type === 'gold') { g.fillStyle = '#ffcf3a'; for (let i = 0; i < 5; i++) g.beginPath(), g.arc(cx + (i % 3 - 1) * 3, cy + (i > 2 ? 2 : 0), 2, 0, 7), g.fill(); return c; }
    if (item.type === 'potion') { const col = item.potion.kind === 'health' ? '#d33' : '#36f'; g.fillStyle = '#222'; g.fillRect(cx - 3, cy - 5, 6, 9); g.fillStyle = col; g.fillRect(cx - 2, cy - 2, 4, 5); g.fillStyle = '#eee'; g.fillRect(cx - 1, cy - 7, 2, 2); return c; }
    drawItemIcon(g, cx, cy, item, 1);
    return c;
  });
}

// draw an item icon into ctx (used for inventory grid + ground)
export function drawItemIcon(g, cx, cy, item, scale = 1) {
  const s = scale;
  const RC = { common: '#c8c8c8', magic: '#6f8fff', rare: '#ffcf3a' };
  const metal = RC[item.rarity] || '#c8c8c8';
  if (item.type === 'potion') { const col = item.potion.kind === 'health' ? '#d33' : '#36f'; g.fillStyle = '#222'; g.fillRect(cx - 3 * s, cy - 5 * s, 6 * s, 9 * s); g.fillStyle = col; g.fillRect(cx - 2 * s, cy - 2 * s, 4 * s, 5 * s); return; }
  const b = item.base;
  if (b === 'bow' || b === 'longbow') { g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.5 * s; g.beginPath(); g.arc(cx + 3 * s, cy, 6 * s, -1.4, 1.4); g.stroke(); g.strokeStyle = metal; g.beginPath(); g.moveTo(cx + 3 * s + 6 * s * Math.cos(-1.4), cy + 6 * s * Math.sin(-1.4)); g.lineTo(cx + 3 * s + 6 * s * Math.cos(1.4), cy + 6 * s * Math.sin(1.4)); g.stroke(); }
  else if (b === 'staff') { g.fillStyle = '#6a4a2a'; g.fillRect(cx - 1 * s, cy - 6 * s, 2 * s, 12 * s); g.fillStyle = metal; g.beginPath(); g.arc(cx, cy - 6 * s, 2.5 * s, 0, 7); g.fill(); }
  else if (item.type === 'weapon') { g.strokeStyle = metal; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(cx - 4 * s, cy + 5 * s); g.lineTo(cx + 4 * s, cy - 5 * s); g.stroke(); g.fillStyle = '#8a6a3a'; g.fillRect(cx - 5 * s, cy + 3 * s, 4 * s, 2 * s); if (b === 'axe' || b === 'mace') { g.fillStyle = metal; g.beginPath(); g.arc(cx + 3 * s, cy - 4 * s, 3 * s, 0, 7); g.fill(); } }
  else if (item.slot === 'helm') { g.fillStyle = metal; g.beginPath(); g.arc(cx, cy - 1 * s, 5 * s, Math.PI, 0); g.fill(); g.fillRect(cx - 5 * s, cy - 1 * s, 10 * s, 3 * s); g.fillStyle = '#111'; g.fillRect(cx - 2 * s, cy - 1 * s, 4 * s, 2 * s); }
  else if (item.slot === 'body') { g.fillStyle = metal; g.fillRect(cx - 5 * s, cy - 5 * s, 10 * s, 10 * s); g.fillStyle = shade(RC[item.rarity] || '#888', -30); g.fillRect(cx - 5 * s, cy - 5 * s, 3 * s, 10 * s); g.fillRect(cx - 2 * s, cy - 5 * s, 4 * s, 3 * s); }
  else if (item.slot === 'shield') { g.fillStyle = metal; g.beginPath(); g.moveTo(cx, cy - 6 * s); g.lineTo(cx + 5 * s, cy - 3 * s); g.lineTo(cx, cy + 6 * s); g.lineTo(cx - 5 * s, cy - 3 * s); g.closePath(); g.fill(); g.fillStyle = shade(RC[item.rarity] || '#888', -40); g.fillRect(cx - 1 * s, cy - 3 * s, 2 * s, 6 * s); }
  else if (item.slot === 'ring') { g.strokeStyle = metal; g.lineWidth = 2 * s; g.beginPath(); g.arc(cx, cy, 4 * s, 0, 7); g.stroke(); g.fillStyle = '#6cf'; g.fillRect(cx - 1 * s, cy - 6 * s, 2 * s, 2 * s); }
  else if (item.slot === 'amulet') { g.strokeStyle = metal; g.lineWidth = 1.5 * s; g.beginPath(); g.arc(cx, cy + 1 * s, 4 * s, 0, 7); g.stroke(); g.fillStyle = '#c6f'; g.beginPath(); g.arc(cx, cy + 1 * s, 2 * s, 0, 7); g.fill(); }
}

export { shade };
