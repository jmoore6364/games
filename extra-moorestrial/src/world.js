// world.js — the nine-screen valley: tile maps, pits, items, placement helpers.
export const TILE = 32, COLS = 15, ROWS = 15, SW = 3, SH = 3;
export const HUD_H = 80;

export const T = {
  GRASS: 0, GRASS2: 1, TREE: 2, ROCK: 3, PIT: 4,
  PAD: 5, CALL: 6, WALL: 7, DOOR_FBI: 8, DOOR_SCI: 9, PATH: 10,
};
export const isSolid = (t) => t === T.TREE || t === T.ROCK || t === T.WALL;

// landing pad on the north clearing, call stones on the south ridge
export const PAD_SCREEN = { sx: 1, sy: 0 };
export const PAD_RECT = { x: 6, y: 4, w: 3, h: 3 };
export const CALL_SCREEN = { sx: 1, sy: 2 };
export const CALL_RECT = { x: 6, y: 9, w: 3, h: 3 };
export const TOWN_SCREEN = { sx: 2, sy: 2 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const idx = (tx, ty) => ty * COLS + tx;

export function buildWorld(round) {
  const rng = mulberry32(round * 1013 + 77);
  const screens = [];
  const pits = [];

  for (let sy = 0; sy < SH; sy++) for (let sx = 0; sx < SW; sx++) {
    const tiles = new Uint8Array(COLS * ROWS);
    const prot = new Uint8Array(COLS * ROWS); // protected: must stay walkable grass
    for (let i = 0; i < tiles.length; i++) tiles[i] = rng() < 0.16 ? T.GRASS2 : T.GRASS;

    // world border: solid trees along the outer rim of the valley
    for (let tx = 0; tx < COLS; tx++) {
      if (sy === 0) tiles[idx(tx, 0)] = T.TREE;
      if (sy === SH - 1) tiles[idx(tx, ROWS - 1)] = rng() < 0.3 ? T.ROCK : T.TREE;
    }
    for (let ty = 0; ty < ROWS; ty++) {
      if (sx === 0) tiles[idx(0, ty)] = T.TREE;
      if (sx === SW - 1) tiles[idx(COLS - 1, ty)] = T.TREE;
    }

    // exits: keep the middle band of every shared screen edge walkable
    const band = [5, 6, 7, 8, 9];
    for (const t of band) {
      if (sy > 0) { tiles[idx(t, 0)] = T.GRASS; prot[idx(t, 0)] = 1; prot[idx(t, 1)] = 1; }
      if (sy < SH - 1) { tiles[idx(t, ROWS - 1)] = T.GRASS; prot[idx(t, ROWS - 1)] = 1; prot[idx(t, ROWS - 2)] = 1; }
      if (sx > 0) { tiles[idx(0, t)] = T.GRASS; prot[idx(0, t)] = 1; prot[idx(1, t)] = 1; }
      if (sx < SW - 1) { tiles[idx(COLS - 1, t)] = T.GRASS; prot[idx(COLS - 1, t)] = 1; prot[idx(COLS - 2, t)] = 1; }
    }

    screens.push({ sx, sy, tiles, prot, items: [] });
  }

  const S = (sx, sy) => screens[sy * SW + sx];

  // ---- landing clearing (1,0) ----
  {
    const s = S(PAD_SCREEN.sx, PAD_SCREEN.sy);
    for (let y = PAD_RECT.y - 1; y <= PAD_RECT.y + PAD_RECT.h; y++)
      for (let x = PAD_RECT.x - 1; x <= PAD_RECT.x + PAD_RECT.w; x++) {
        s.tiles[idx(x, y)] = T.GRASS; s.prot[idx(x, y)] = 1;
      }
    for (let y = PAD_RECT.y; y < PAD_RECT.y + PAD_RECT.h; y++)
      for (let x = PAD_RECT.x; x < PAD_RECT.x + PAD_RECT.w; x++)
        s.tiles[idx(x, y)] = T.PAD;
  }

  // ---- call ridge (1,2): stone circle with gaps around the call tiles ----
  {
    const s = S(CALL_SCREEN.sx, CALL_SCREEN.sy);
    for (let y = CALL_RECT.y - 2; y <= CALL_RECT.y + CALL_RECT.h + 1; y++)
      for (let x = CALL_RECT.x - 2; x <= CALL_RECT.x + CALL_RECT.w + 1; x++) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        s.tiles[idx(x, y)] = T.GRASS; s.prot[idx(x, y)] = 1;
      }
    for (let y = CALL_RECT.y; y < CALL_RECT.y + CALL_RECT.h; y++)
      for (let x = CALL_RECT.x; x < CALL_RECT.x + CALL_RECT.w; x++)
        s.tiles[idx(x, y)] = T.CALL;
    // broken ring of standing stones (leave north + east open)
    const ring = [[5, 8], [4, 10], [5, 12], [7, 13], [9, 12], [10, 8]];
    for (const [x, y] of ring) if (y < ROWS - 1) s.tiles[idx(x, y)] = T.ROCK;
  }

  // ---- town (2,2): FBI office + science lab, dirt paths, no pits ----
  {
    const s = S(TOWN_SCREEN.sx, TOWN_SCREEN.sy);
    const building = (x0, y0, x1, y1, doorX, doorTile) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.tiles[idx(x, y)] = T.WALL;
      s.tiles[idx(doorX, y1)] = doorTile;
      for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
        if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) continue;
        if (s.tiles[idx(x, y)] === T.GRASS || s.tiles[idx(x, y)] === T.GRASS2) s.prot[idx(x, y)] = 1;
      }
    };
    building(2, 2, 6, 5, 4, T.DOOR_FBI);
    building(8, 7, 12, 10, 10, T.DOOR_SCI);
    for (let y = 6; y <= 12; y++) if (s.tiles[idx(4, y)] === T.GRASS || s.tiles[idx(4, y)] === T.GRASS2) s.tiles[idx(4, y)] = T.PATH;
    for (let x = 4; x <= 10; x++) if (s.tiles[idx(x, 12)] === T.GRASS || s.tiles[idx(x, 12)] === T.GRASS2) s.tiles[idx(x, 12)] = T.PATH;
    for (let y = 11; y <= 12; y++) if (s.tiles[idx(10, y)] === T.GRASS || s.tiles[idx(10, y)] === T.GRASS2) s.tiles[idx(10, y)] = T.PATH;
  }

  // ---- random scatter: trees and rocks (never forming 2-wide barriers) ----
  for (const s of screens) {
    const isTown = s.sx === TOWN_SCREEN.sx && s.sy === TOWN_SCREEN.sy;
    const density = isTown ? 5 : 12;
    let placed = 0, tries = 0;
    while (placed < density && tries < 220) {
      tries++;
      const tx = 1 + Math.floor(rng() * (COLS - 2));
      const ty = 1 + Math.floor(rng() * (ROWS - 2));
      const i = idx(tx, ty);
      if (s.prot[i] || (s.tiles[i] !== T.GRASS && s.tiles[i] !== T.GRASS2)) continue;
      // no random solid orthogonally adjacent to a random-zone solid → no walls, always passable
      let touching = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = tx + dx, y = ty + dy;
        if (x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1) continue;
        if (isSolid(s.tiles[idx(x, y)])) { touching = true; break; }
      }
      if (touching) continue;
      s.tiles[i] = rng() < 0.7 ? T.TREE : T.ROCK;
      placed++;
    }
  }

  // ---- pits: visible 2x2 craters, well away from edges and each other ----
  const pitCounts = {
    '0,0': 3, '2,0': 3, '0,1': 2, '1,1': 2, '2,1': 2, '0,2': 3, '1,2': 1,
  };
  for (const s of screens) {
    const want = pitCounts[`${s.sx},${s.sy}`] || 0;
    let placed = 0, tries = 0;
    while (placed < want && tries < 300) {
      tries++;
      const tx = 2 + Math.floor(rng() * (COLS - 5));
      const ty = 2 + Math.floor(rng() * (ROWS - 5));
      let ok = true;
      for (let y = ty - 1; y <= ty + 2 && ok; y++) for (let x = tx - 1; x <= tx + 2 && ok; x++) {
        const i = idx(x, y);
        if (s.prot[i]) ok = false;
        else if (s.tiles[i] !== T.GRASS && s.tiles[i] !== T.GRASS2) ok = false;
      }
      if (!ok) continue;
      for (let y = ty; y < ty + 2; y++) for (let x = tx; x < tx + 2; x++) s.tiles[idx(x, y)] = T.PIT;
      pits.push({
        id: pits.length, sx: s.sx, sy: s.sy, tx, ty,
        piece: -1,
        candy: 1 + (rng() < 0.5 ? 1 : 0),
        crystal: rng() < 0.25,
        candyTaken: 0, crystalTaken: false,
      });
      placed++;
    }
  }

  // ---- hide the three phone pieces in pits on three different screens ----
  const shuffled = pits.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const usedScreens = new Set();
  let pieceNo = 0;
  for (const p of shuffled) {
    if (pieceNo >= 3) break;
    const key = `${p.sx},${p.sy}`;
    if (usedScreens.has(key)) continue;
    usedScreens.add(key);
    p.piece = pieceNo++;
  }

  // ---- surface items: candy and wilted flowers on free grass ----
  const freeCell = (s) => {
    for (let tries = 0; tries < 80; tries++) {
      const tx = 1 + Math.floor(rng() * (COLS - 2));
      const ty = 1 + Math.floor(rng() * (ROWS - 2));
      const t = s.tiles[idx(tx, ty)];
      if ((t === T.GRASS || t === T.GRASS2) && !s.items.some(it => it.tx === tx && it.ty === ty)) return { tx, ty };
    }
    return null;
  };
  for (const s of screens) {
    const isSpecial = (s.sx === PAD_SCREEN.sx && s.sy === PAD_SCREEN.sy);
    const candyN = isSpecial ? 1 : 2;
    for (let i = 0; i < candyN; i++) {
      const c = freeCell(s);
      if (c) s.items.push({ type: 'candy', tx: c.tx, ty: c.ty, taken: false });
    }
  }
  for (let i = 0; i < 8; i++) {
    const s = screens[Math.floor(rng() * screens.length)];
    const c = freeCell(s);
    if (c) s.items.push({ type: 'flower', tx: c.tx, ty: c.ty, bloom: false });
  }

  return { screens, pits, S };
}

export function tileAt(screen, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return T.TREE;
  return screen.tiles[ty * COLS + tx];
}

export function pitAt(world, sx, sy, tx, ty) {
  return world.pits.find(p => p.sx === sx && p.sy === sy &&
    tx >= p.tx && tx < p.tx + 2 && ty >= p.ty && ty < p.ty + 2) || null;
}

// nearest walkable, non-pit tile around a pit block — where levitation sets you down.
// requires 2+ open orthogonal neighbors so E.T. is never dropped into a sealed pocket
export function safeExitSpot(screen, pit) {
  const open = (x, y) => {
    const t = tileAt(screen, x, y);
    return !isSolid(t) && t !== T.PIT;
  };
  for (let r = 1; r <= 5; r++) {
    for (let y = pit.ty - r; y <= pit.ty + 1 + r; y++) {
      for (let x = pit.tx - r; x <= pit.tx + 1 + r; x++) {
        if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) continue;
        if (!open(x, y)) continue;
        const exits = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .filter(([dx, dy]) => open(x + dx, y + dy)).length;
        if (exits >= 2) return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
      }
    }
  }
  return { x: COLS * TILE / 2, y: ROWS * TILE / 2 };
}
