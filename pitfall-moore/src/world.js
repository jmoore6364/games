// world.js — deterministic jungle generation, one screen per index (a nod to
// the original's LFSR world), plus the hazard timing cycles shared by screens.
export const W = 320, H = 224, HUD_H = 28;
export const GROUND_Y = 148;          // surface feet line
export const GROUND_BOT = 168;        // bottom of the ground strip
export const UG_FLOOR = 208;          // underground feet line
export const N_SCREENS = 20;
export const LADDER_X = 288;

export const TREASURE_TYPES = [
  { type: 'money', val: 2000 },
  { type: 'silver', val: 3000 },
  { type: 'gold', val: 4000 },
  { type: 'ring', val: 5000 },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// feature geometry (screen-local x spans)
export const HOLES = [{ x0: 82, x1: 102 }, { x0: 142, x1: 162 }, { x0: 202, x1: 222 }];
export const TAR = { x0: 112, x1: 208 };
export const QUICK = { x0: 122, x1: 198 };
export const POND = { x0: 92, x1: 228 };
export const CROC_HEADS = [{ x0: 100, x1: 126 }, { x0: 148, x1: 174 }, { x0: 196, x1: 222 }];
export const VINE = { px: 160, py: 34, len: 100 };
export const TREASURE_X = 258;
export const HAZARD_X = 200;          // snake / fire position

const FEATURES = ['log1', 'log2', 'holes', 'tar', 'quicksand', 'crocs', 'snake', 'fire'];

export function buildWorld() {
  const rng = mulberry32(0xC0FFEE);
  const screens = [];
  for (let i = 0; i < N_SCREENS; i++) {
    const r = mulberry32(i * 2654435761 + 99);
    let feature;
    if (i === 0) feature = 'log1'; // gentle start screen
    else feature = FEATURES[Math.floor(r() * FEATURES.length)];
    const ladder = i % 4 === 0;
    // underground: brick wall on ~1/3 of screens, scorpion on most
    const wall = r() < 0.35 ? (r() < 0.5 ? 104 : 212) : null;
    const scorpion = r() < 0.75;
    screens.push({ i, feature, ladder, wall, scorpion, treasure: null });
  }
  // hide treasures on 12 of the 19 non-start screens, types cycling by value
  const order = [];
  for (let i = 1; i < N_SCREENS; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let k = 0; k < 12; k++) {
    const t = TREASURE_TYPES[k % TREASURE_TYPES.length];
    screens[order[k]].treasure = { ...t, x: TREASURE_X };
  }
  return { screens };
}

// ---- shared hazard cycles (world-synchronized, like the original) ----
export function crocOpen(t) { return (t % 4.2) >= 2.6; }          // closed 2.6s, open 1.6s
export function quickOpenAmount(t) {                              // 0 closed .. 1 fully open
  const s = Math.sin(t * 0.85);
  return Math.max(0, s);
}
export function quickSpan(t) { // current open span, or null while closed
  const amt = quickOpenAmount(t);
  if (amt <= 0.02) return null;
  const cx = (QUICK.x0 + QUICK.x1) / 2;
  const half = ((QUICK.x1 - QUICK.x0) / 2) * amt;
  return { x0: cx - half, x1: cx + half };
}
export function vineAngle(t) { return 1.12 * Math.sin(t * 1.55 + 0.7); }
export function vineTip(t) {
  const a = vineAngle(t);
  return { x: VINE.px + Math.sin(a) * VINE.len, y: VINE.py + Math.cos(a) * VINE.len, a };
}

// rolling logs: continuous right-to-left, deterministic in time
export function logPositions(screen, t) {
  const n = screen.feature === 'log2' ? 2 : (screen.feature === 'log1' ? 1 : 0);
  const out = [];
  for (let k = 0; k < n; k++) {
    const speed = 58 + k * 9;
    const gap = 190 * (k + 1);
    const x = W + 20 - ((t * speed + gap + screen.i * 83) % (W + 40));
    out.push({ x, y: GROUND_Y - 6, r: 7 });
  }
  return out;
}

// scorpion patrol path, respecting a wall if present
export function scorpionX(screen, t) {
  let lo = 34, hi = 286;
  if (screen.wall != null) {
    if (screen.wall < 160) lo = screen.wall + 22; else hi = screen.wall - 22;
  }
  const mid = (lo + hi) / 2, half = (hi - lo) / 2;
  return mid + Math.sin(t * 0.55 + screen.i * 1.3) * half;
}

// what supports feet at surface height for this x? 'ground' | 'croc' | null
export function surfaceSupport(screen, x, t) {
  const f = screen.feature;
  if (f === 'holes') {
    for (const h of HOLES) if (x > h.x0 && x < h.x1) return null;
    return 'ground';
  }
  if (f === 'tar') return (x > TAR.x0 && x < TAR.x1) ? null : 'ground';
  if (f === 'quicksand') {
    const span = quickSpan(t);
    if (span && x > span.x0 && x < span.x1) return null;
    return 'ground';
  }
  if (f === 'crocs') {
    if (x > POND.x0 && x < POND.x1) {
      const open = crocOpen(t);
      for (const c of CROC_HEADS) {
        if (x > c.x0 && x < c.x1) {
          // jaws hinge at the front: the back of the head stays safe when open
          if (!open || x > c.x0 + 14) return 'croc';
          return null;
        }
      }
      return null;
    }
    return 'ground';
  }
  return 'ground';
}

// falling below the surface here: 'under' (drop to tunnel) or 'death' (sink/water)
export function fallResult(screen, x) {
  if (screen.feature === 'holes') return 'under';
  if (screen.ladder && Math.abs(x - LADDER_X) < 9) return 'under';
  return 'death';
}
