// sprites.js — all art is procedural pixel drawing, same palette family as
// the Jimoore character sheet (characters/jimoore/).

export const PAL = {
  outline: '#16161c',
  fur: '#8a8f98',
  furDark: '#6d727c',
  belly: '#c8ccd4',
  face: '#eef0f4',
  mask: '#23232c',
  nose: '#101014',
  ear: '#e8a0a0',
  gold: '#f8a800',
};

function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); }

function ball(g, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
    px(g, cx - w, cy + y, w * 2 + 1, 1, c);
  }
}

// ---- Jimoore (16x16, anchored at top-left) -------------------------------

export function drawJimoore(g, x, y, dir, frame, rolling, hidden) {
  g.save();
  g.translate(x | 0, y | 0);
  if (hidden) g.globalAlpha = 0.45;
  if (rolling) {
    ball(g, 8, 9, 6, PAL.outline);
    ball(g, 8, 9, 5, PAL.fur);
    const a = frame * 0.45;
    for (let i = 0; i < 3; i++) {
      const ang = a + (i * Math.PI * 2) / 3;
      px(g, 8 + Math.cos(ang) * 3 - 1, 9 + Math.sin(ang) * 3 - 1, 2, 2, PAL.mask);
    }
    ball(g, 8, 9, 2, PAL.belly);
    g.restore();
    return;
  }
  const step = (frame >> 3) % 2;
  const flip = dir === 'left';
  if (flip) { g.translate(16, 0); g.scale(-1, 1); }

  if (dir === 'up') {
    // back view: all fur, tail nub low
    ball(g, 8, 9, 6, PAL.outline);
    ball(g, 8, 9, 5, PAL.furDark);
    ball(g, 8, 10, 4, PAL.fur);
    px(g, 5, 3, 2, 2, PAL.outline); px(g, 9, 3, 2, 2, PAL.outline);
    px(g, 7, 12, 3, 3, PAL.furDark); px(g, 7, 12, 3, 1, PAL.outline);
    px(g, step ? 4 : 5, 14, 2, 2, PAL.outline);
    px(g, step ? 10 : 9, 14, 2, 2, PAL.outline);
  } else if (dir === 'down') {
    ball(g, 8, 9, 6, PAL.outline);
    ball(g, 8, 9, 5, PAL.fur);
    ball(g, 8, 12, 3, PAL.belly);
    px(g, 4, 2, 2, 2, PAL.outline); px(g, 5, 3, 1, 1, PAL.ear);
    px(g, 10, 2, 2, 2, PAL.outline); px(g, 10, 3, 1, 1, PAL.ear);
    ball(g, 8, 10, 3, PAL.face);
    px(g, 4, 6, 8, 2, PAL.mask);
    px(g, 5, 6, 1, 1, '#fff'); px(g, 10, 6, 1, 1, '#fff');
    px(g, 7, 9, 2, 1, PAL.nose);
    px(g, step ? 4 : 5, 14, 2, 2, PAL.outline);
    px(g, step ? 10 : 9, 14, 2, 2, PAL.outline);
  } else {
    // side profile (right; left is mirrored)
    px(g, 1, 10, 3, 3, PAL.outline);            // tail nub
    px(g, 2, 11, 1, 1, PAL.furDark);
    ball(g, 8, 9, 6, PAL.outline);
    ball(g, 8, 9, 5, PAL.furDark);
    ball(g, 9, 10, 4, PAL.fur);
    ball(g, 10, 12, 2, PAL.belly);
    px(g, 7, 2, 3, 2, PAL.outline); px(g, 8, 3, 1, 1, PAL.ear);
    ball(g, 13, 8, 2, PAL.outline);             // snout
    px(g, 12, 7, 2, 2, PAL.face);
    px(g, 8, 5, 6, 2, PAL.mask);
    px(g, 10, 5, 1, 1, '#fff');
    px(g, 14, 7, 1, 1, PAL.nose);
    px(g, step ? 5 : 6, 14, 2, 2, PAL.outline);
    px(g, step ? 11 : 10, 14, 2, 2, PAL.outline);
  }
  g.restore();
}

// ---- enemies -------------------------------------------------------------

export function drawCat(g, x, y, dir, frame, stunned) {
  g.save();
  g.translate(x | 0, y | 0);
  if (dir === 'left') { g.translate(16, 0); g.scale(-1, 1); }
  const body = '#2e2836', dark = '#201c28', eye = '#c9e84c';
  const step = (frame >> 3) % 2;
  // tail
  px(g, 1, 6 + (step ? 1 : 0), 2, 5, body);
  // body low + head right
  px(g, 3, 8, 9, 5, body);
  px(g, 10, 5, 5, 5, body);
  px(g, 10, 3, 2, 2, dark); px(g, 13, 3, 2, 2, dark); // ears
  if (stunned) {
    px(g, 11, 6, 1, 1, '#fff'); px(g, 13, 6, 1, 1, '#fff');
    const a = frame * 0.3;
    px(g, 12 + Math.cos(a) * 4, 2 + Math.sin(a) * 1.5, 1, 1, PAL.gold);
    px(g, 12 - Math.cos(a) * 4, 2 - Math.sin(a) * 1.5, 1, 1, PAL.gold);
  } else {
    px(g, 11, 6, 1, 2, eye); px(g, 13, 6, 1, 2, eye);
  }
  px(g, step ? 3 : 4, 13, 2, 2, dark);
  px(g, step ? 9 : 8, 13, 2, 2, dark);
  g.restore();
}

export function drawDog(g, x, y, dir, frame, chasing) {
  g.save();
  g.translate(x | 0, y | 0);
  if (dir === 'left') { g.translate(18, 0); g.scale(-1, 1); }
  const body = '#8a5a30', dark = '#5f3c1c', tongue = '#e05a6a';
  const step = (frame >> 3) % 2;
  px(g, 0, 5 + (step ? 1 : 0), 3, 3, body);        // tail
  px(g, 2, 6, 11, 7, body);                        // body
  px(g, 10, 2, 7, 6, body);                        // head
  px(g, 10, 1, 2, 4, dark); px(g, 15, 1, 2, 4, dark); // floppy ears
  px(g, 12, 4, 1, 2, chasing ? '#ff4040' : '#241608');
  px(g, 15, 4, 1, 2, chasing ? '#ff4040' : '#241608');
  px(g, 16, 6, 2, 2, dark);                        // snout
  if (chasing) px(g, 16, 8, 2, 3, tongue);
  px(g, step ? 3 : 4, 13, 2, 3, dark);
  px(g, step ? 10 : 9, 13, 2, 3, dark);
  g.restore();
}

export function drawRat(g, x, y, dir, frame, eating) {
  g.save();
  g.translate(x | 0, y | 0);
  if (dir === 'left') { g.translate(12, 0); g.scale(-1, 1); }
  const body = '#7a7570', dark = '#575350', tail = '#c78e8e';
  const step = (frame >> 2) % 2;
  px(g, 0, 8, 3, 1, tail);
  px(g, 2, 5 + (eating && step ? 1 : 0), 7, 5, body);
  px(g, 7, 4, 4, 4, body);
  px(g, 7, 3, 2, 2, dark);
  px(g, 9, 5, 1, 1, '#1a1216');
  px(g, 11, 6, 1, 1, tail);                        // nose
  px(g, step ? 3 : 4, 10, 2, 1, dark);
  px(g, step ? 7 : 6, 10, 2, 1, dark);
  g.restore();
}

export function drawHuman(g, x, y, dir, frame) {
  g.save();
  g.translate(x | 0, y | 0);
  const skin = '#d9a179', hair = '#4a3423', pj = '#4a6a9c', pjDark = '#37517a',
    slip = '#7a4a4a';
  const step = (frame >> 3) % 2;
  const flip = dir === 'left';
  if (flip) { g.translate(16, 0); g.scale(-1, 1); }
  // legs
  px(g, 4, 18 + (step ? 1 : 0), 3, 4, pjDark);
  px(g, 9, 18 + (step ? 0 : 1), 3, 4, pjDark);
  px(g, 3, 22, 4, 2, slip); px(g, 9, 22, 4, 2, slip);
  // robe
  px(g, 3, 9, 10, 10, pj);
  px(g, 7, 9, 2, 10, pjDark);
  // arm with flashlight, out front
  px(g, 12, 11, 3, 2, pj);
  px(g, 14, 10, 2, 3, '#3a3a44');
  px(g, 16, 10, 1, 3, PAL.gold);
  // head
  px(g, 4, 2, 8, 7, skin);
  px(g, 3, 1, 10, 3, hair); px(g, 3, 2, 2, 4, hair);
  px(g, 7, 5, 1, 1, '#2a2a2a'); px(g, 10, 5, 1, 1, '#2a2a2a');
  px(g, 7, 4, 2, 1, hair); px(g, 10, 4, 2, 1, hair); // angry brows
  px(g, 8, 7, 3, 1, '#8a5252');
  g.restore();
}

// ---- world objects -------------------------------------------------------

const CAN_STYLES = [
  { body: '#4a8a4a', lid: '#3a6a3a', shade: '#356835' },   // plastic
  { body: '#9aa2ae', lid: '#7a828e', shade: '#6d747f' },   // metal
  { body: '#4a4e5c', lid: '#33363f', shade: '#33363f' },   // heavy
];

export function drawCan(g, x, y, tier, hp, maxHp, shake, frame) {
  g.save();
  const wob = shake > 0 ? Math.sin(frame * 1.2) * 1.5 : 0;
  g.translate((x + wob) | 0, y | 0);
  const s = CAN_STYLES[tier - 1];
  px(g, 3, 4, 10, 11, PAL.outline);
  px(g, 4, 5, 8, 9, s.body);
  px(g, 4, 5, 2, 9, s.shade);
  px(g, 2, 2, 12, 3, PAL.outline);
  px(g, 3, 3, 10, 1, s.lid);
  px(g, 7, 1, 2, 2, s.lid);                        // handle
  if (tier === 3) { px(g, 6, 8, 4, 4, '#8a8232'); px(g, 7, 10, 2, 2, '#3a3520'); } // padlock
  // dents as damage
  const dents = maxHp - hp;
  if (dents >= 1) px(g, 9, 7, 2, 2, s.shade);
  if (dents >= 2) px(g, 5, 11, 3, 2, s.shade);
  g.restore();
}

const FOOD = [
  ['#eef0f4', '#c8ccd4'],   // fish bone
  ['#d24a4a', '#7a2e2e'],   // apple core
  ['#f0c040', '#c98a04'],   // pizza
  ['#b07a3a', '#8a5a20'],   // cookie
];

export function drawFood(g, x, y, kind, frame) {
  const bob = Math.sin(frame * 0.15 + kind) > 0 ? 1 : 0;
  g.save();
  g.translate(x | 0, (y - bob) | 0);
  const [a, b] = FOOD[kind % FOOD.length];
  if (kind % 4 === 0) {                            // fish bone
    px(g, 0, 2, 6, 1, a); px(g, 1, 1, 1, 3, a); px(g, 3, 1, 1, 3, a); px(g, 5, 1, 2, 3, b);
  } else if (kind % 4 === 1) {                     // apple core
    px(g, 1, 0, 3, 5, a); px(g, 1, 1, 1, 3, b); px(g, 2, 0, 1, 1, '#3a6a2a');
  } else if (kind % 4 === 2) {                     // pizza slice
    px(g, 0, 0, 5, 2, a); px(g, 1, 2, 3, 2, a); px(g, 2, 4, 1, 1, a); px(g, 1, 1, 1, 1, b); px(g, 3, 2, 1, 1, b);
  } else {                                         // cookie
    px(g, 0, 0, 4, 4, a); px(g, 1, 1, 1, 1, b); px(g, 2, 2, 1, 1, b);
  }
  g.restore();
}

// ---- tiles ---------------------------------------------------------------

export function drawTile(g, ch, x, y, frame) {
  switch (ch) {
    case '#': {                                    // fence planks
      px(g, x, y, 16, 16, '#5f4326');
      px(g, x, y + 2, 16, 1, '#4a3118'); px(g, x, y + 8, 16, 1, '#4a3118');
      px(g, x, y + 13, 16, 1, '#4a3118');
      px(g, x + 7, y, 2, 16, '#6f5233');
      break;
    }
    case 'H': {                                    // house brick
      px(g, x, y, 16, 16, '#6d4a4a');
      px(g, x, y + 7, 16, 1, '#553636'); px(g, x, y + 15, 16, 1, '#553636');
      px(g, x + 7, y, 1, 8, '#553636'); px(g, x + 3, y + 8, 1, 8, '#553636');
      px(g, x + 11, y + 8, 1, 8, '#553636');
      break;
    }
    case 'D': {                                    // door
      px(g, x, y, 16, 16, '#4a3118');
      px(g, x + 2, y, 12, 16, '#6f5233');
      px(g, x + 11, y + 8, 2, 2, PAL.gold);
      break;
    }
    case 'W': {                                    // junk planter
      px(g, x, y, 16, 16, '#2a3b28');
      px(g, x + 1, y + 1, 14, 14, '#57606a');
      px(g, x + 2, y + 2, 12, 3, '#6b747e');
      px(g, x + 3, y + 8, 4, 4, '#454e58'); px(g, x + 9, y + 6, 5, 6, '#454e58');
      break;
    }
    case ',': {                                    // dirt path
      px(g, x, y, 16, 16, '#8a744e');
      px(g, x + 3, y + 4, 2, 1, '#79643f'); px(g, x + 10, y + 10, 3, 1, '#79643f');
      px(g, x + 6, y + 13, 2, 1, '#9a8460');
      break;
    }
    default: {                                     // grass
      px(g, x, y, 16, 16, '#2a3b28');
      px(g, x + 2, y + 3, 1, 2, '#354a32'); px(g, x + 9, y + 6, 1, 2, '#354a32');
      px(g, x + 13, y + 12, 1, 2, '#354a32'); px(g, x + 5, y + 11, 1, 2, '#223020');
    }
  }
}

export function drawBush(g, x, y, frame) {
  const sway = Math.sin(frame * 0.05 + x) > 0 ? 1 : 0;
  ball(g, x + 8, y + 9, 7, '#1c2a1a');
  ball(g, x + 8 + sway, y + 8, 6, '#2f5228');
  ball(g, x + 5 + sway, y + 7, 3, '#3c6832');
  ball(g, x + 11, y + 9, 3, '#3c6832');
}
