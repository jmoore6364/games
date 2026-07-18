// Procedural pixel-art characters and item icons. No assets.
// Characters are painted parametrically so they can talk (mouth flap + head
// tilt), walk (4-phase leg cycle + arm swing), and scale with room depth.
// All painters draw with the character's FEET at (0,0), facing RIGHT for
// side poses; the caller mirrors for left.

function px(g) { return (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }; }

// ------------------------------------------------------------- char specs ----

export const CHARS = {
  moorebrush: { h: 68, skin: '#f0c8a0', hair: '#d8b04a', style: 'ponytail', shirt: '#e8e0d0', vest: '#2a3050', pants: '#3a3550', boots: '#241608', belt: '#8a5a2b' },
  pirate:     { h: 64, skin: '#d8a878', hair: '#3a2a18', style: 'bandana', band: '#a03030', shirt: '#c8c8b8', stripe: '#7a4030', pants: '#4a3a2a', boots: '#241608' },
  dockmaster: { h: 64, skin: '#d8a878', hair: '#b8b8b8', style: 'cap', band: '#2a3a5a', shirt: '#31435f', vest: '#24324a', pants: '#3a3550', boots: '#241608', beard: '#a8a8a8' },
  bartender:  { h: 62, skin: '#e0b088', hair: '#684828', style: 'bald', shirt: '#8a4030', apron: '#c8bca0', pants: '#3a3020', boots: '#241608', mustache: '#684828' },
  council1:   { h: 62, skin: '#c89878', hair: '#d8d8d8', style: 'tricorn', band: '#204a4a', shirt: '#2a6a6a', vest: '#1e4a4a', pants: '#3a3550', boots: '#241608', earring: '#ffd800' },
  council2:   { h: 60, skin: '#d8a878', hair: '#7a5a30', style: 'bandana', band: '#3a5a30', shirt: '#5a5a40', pants: '#4a3a2a', boots: '#241608', beard: '#8a6a38', bigbeard: true },
  council3:   { h: 64, skin: '#e8c098', hair: '#2a2018', style: 'tricorn', band: '#5a3a6a', shirt: '#6a4a7a', vest: '#4a3058', sash: '#d8c040', pants: '#3a3550', boots: '#241608' },
  shopkeeper: { h: 62, skin: '#e0b890', hair: '#8a8a8a', style: 'bald', shirt: '#c8c0a8', apron: '#4a6a4a', pants: '#4a4038', boots: '#3a2312', specs: true },
  voodoolady: { h: 64, skin: '#a87048', hair: '#201828', style: 'wrap', band: '#7a3aa8', dress: '#4a2a68', dress2: '#38204e', shirt: '#5a3a78', jewel: '#ffd800' },
  butler:     { h: 64, skin: '#e8c8a8', hair: '#c8c8c8', style: 'neat', shirt: '#e8e8e8', vest: '#181820', coat: '#181820', pants: '#181820', boots: '#000000', bow: '#181820' },
  governor:   { h: 64, skin: '#e8c0a0', hair: '#a83828', style: 'long', shirt: '#e8e4da', vest: '#c8c4ba', coat: '#e8e4da', pants: '#d8d4c8', boots: '#8a6a40', epaulet: '#d8c040' },
  stan:       { h: 64, skin: '#e8b890', hair: '#2a2018', style: 'neat', shirt: '#e8e8e8', plaid: ['#c8c8d8', '#8888b8'], pants: '#c8c8d8', boots: '#3a2312', grin: true },
  mistress:   { h: 66, skin: '#d8a070', hair: '#1a1210', style: 'ponytail', shirt: '#a03040', vest: '#701828', pants: '#2a2a34', boots: '#181008', sword: true },
  hermit:     { h: 60, skin: '#d8b088', hair: '#b8b0a0', style: 'wild', shirt: '#6a5a40', pants: '#5a4a34', boots: '#4a3a24', beard: '#b8b0a0', longbeard: true },
  chief:      { h: 62, skin: '#a87048', hair: '#000000', style: 'cauliflower', shirt: '#3a6a3a', skirt: '#2a5a2a', pants: '#a87048', boots: '#8a5a38' },
  cannibal1:  { h: 56, skin: '#b88050', hair: '#201810', style: 'fruit', band: '#c04030', shirt: '#b88050', skirt: '#4a7a3a', pants: '#b88050', boots: '#96683e' },
  cannibal2:  { h: 56, skin: '#a87048', hair: '#201810', style: 'fruit', band: '#c8a030', shirt: '#a87048', skirt: '#3a6a4a', pants: '#a87048', boots: '#8a5a38' },
  ghost1:     { h: 60, skin: '#a8e8c0', hair: '#70c898', style: 'bandana', band: '#2e8a5a', shirt: '#5aa87e', pants: '#3a8a62', ghost: true },
  ghost2:     { h: 62, skin: '#a8e8c0', hair: '#70c898', style: 'cap', band: '#1e5a3c', shirt: '#4a986e', vest: '#2e8a5a', pants: '#3a8a62', ghost: true },
  lemoore:    { h: 76, skin: '#b8f0c8', hair: '#40ff90', style: 'captain', band: '#0e3a24', shirt: '#1e5a3c', vest: '#143c28', coat: '#1e5a3c', pants: '#164630', ghost: true, beard: '#40ff90', firebeard: true },
};

// -------------------------------------------------------------- humanoid ----

// pose: { face:'r'|'f'|'b', walkPhase:0..1|null, talk:bool, t:time, wave:bool, hat:'plume'|null }
export function drawDude(g, id, pose) {
  const c = CHARS[id];
  if (!c) return;
  const r = px(g);
  const h = c.h;
  const t = pose.t || 0;
  const face = pose.face || 'f';
  const legH = h * 0.34, torsoH = h * 0.36, headH = h * 0.30;
  const hipY = -legH, shoY = -legH - torsoH, headY = shoY - headH;
  const W = h * 0.30; // torso width
  const ghost = c.ghost;

  if (ghost) g.globalAlpha = 0.88;

  // shadow
  if (!ghost) {
    g.globalAlpha = 0.25; r(-W * 0.7, -2, W * 1.4, 3, '#000'); g.globalAlpha = 1;
  }

  // ---- legs / ghost tail
  if (ghost) {
    // wispy tail
    g.fillStyle = c.pants;
    g.beginPath();
    g.moveTo(-W / 2, hipY);
    g.lineTo(W / 2, hipY);
    const wob = Math.sin(t * 3) * 2;
    g.lineTo(W * 0.3 + wob, hipY + legH * 0.5);
    g.lineTo(0, hipY + legH * 0.75 - wob);
    g.lineTo(-W * 0.3 - wob, hipY + legH * 0.55);
    g.closePath(); g.fill();
  } else {
    const lw = Math.max(2, W * 0.32);
    if (pose.walkPhase != null && face !== 'f' && face !== 'b') {
      const p = Math.sin(pose.walkPhase * Math.PI * 2);
      const q = Math.sin(pose.walkPhase * Math.PI * 2 + Math.PI);
      // near leg
      r(-lw / 2 + q * legH * 0.28, hipY, lw, legH - Math.max(0, -q) * 3, c.pants);
      r(-lw / 2 + q * legH * 0.28 - 1, -4 - Math.max(0, -q) * 3, lw + 2, 4, c.boots);
      // far leg (darker)
      r(-lw / 2 + p * legH * 0.28, hipY, lw, legH - Math.max(0, -p) * 3, shade(c.pants));
      r(-lw / 2 + p * legH * 0.28 - 1, -4 - Math.max(0, -p) * 3, lw + 2, 4, shade(c.boots));
    } else if (pose.walkPhase != null) {
      const p = Math.sin(pose.walkPhase * Math.PI * 2);
      r(-W * 0.42, hipY, lw, legH - Math.max(0, p) * 3, c.pants);
      r(W * 0.42 - lw, hipY, lw, legH - Math.max(0, -p) * 3, shade(c.pants));
      r(-W * 0.42 - 1, -4 - Math.max(0, p) * 3, lw + 2, 4, c.boots);
      r(W * 0.42 - lw - 1, -4 - Math.max(0, -p) * 3, lw + 2, 4, c.boots);
    } else {
      r(-W * 0.42, hipY, lw, legH, c.pants);
      r(W * 0.42 - lw, hipY, lw, legH, shade(c.pants));
      r(-W * 0.42 - 1, -4, lw + 2, 4, c.boots);
      r(W * 0.42 - lw - 1, -4, lw + 2, 4, c.boots);
    }
    // skirt / dress overrides legs
    if (c.dress) {
      g.fillStyle = c.dress;
      g.beginPath(); g.moveTo(-W * 0.55, hipY - 2); g.lineTo(W * 0.55, hipY - 2);
      g.lineTo(W * 0.75, -1); g.lineTo(-W * 0.75, -1); g.closePath(); g.fill();
      r(-W * 0.55, -3, W * 1.3, 3, c.dress2 || shade(c.dress));
    }
    if (c.skirt) {
      g.fillStyle = c.skirt;
      g.beginPath(); g.moveTo(-W * 0.55, hipY - 2); g.lineTo(W * 0.55, hipY - 2);
      g.lineTo(W * 0.62, hipY + legH * 0.5); g.lineTo(-W * 0.62, hipY + legH * 0.5); g.closePath(); g.fill();
      // leaf fringe
      g.fillStyle = shade(c.skirt);
      for (let i = -2; i <= 2; i++) r(i * W * 0.22 - 1, hipY + legH * 0.45, 3, 4, shade(c.skirt));
    }
  }

  // ---- torso
  r(-W / 2, shoY, W, torsoH, c.shirt);
  if (c.stripe) for (let y = shoY + 2; y < hipY - 2; y += 5) r(-W / 2, y, W, 2, c.stripe);
  if (c.vest) { r(-W / 2, shoY, W * 0.3, torsoH, c.vest); r(W / 2 - W * 0.3, shoY, W * 0.3, torsoH, c.vest); }
  if (c.apron) { r(-W * 0.32, shoY + torsoH * 0.3, W * 0.64, torsoH * 0.68, c.apron); }
  if (c.sash) { g.fillStyle = c.sash; g.beginPath(); g.moveTo(-W / 2, shoY + 2); g.lineTo(-W / 2 + 4, shoY); g.lineTo(W / 2, hipY - 4); g.lineTo(W / 2 - 4, hipY); g.closePath(); g.fill(); }
  if (c.belt) { r(-W / 2, hipY - 3, W, 3, c.belt); r(-2, hipY - 3, 4, 3, '#ffd800'); }
  if (c.plaid) { // Stan's jacket
    r(-W / 2 - 1, shoY, W + 2, torsoH, c.plaid[0]);
    g.fillStyle = c.plaid[1];
    for (let x = -W / 2; x < W / 2 + 2; x += 4) r(x, shoY, 1.5, torsoH, c.plaid[1]);
    for (let y = shoY; y < hipY; y += 4) r(-W / 2 - 1, y, W + 2, 1.5, c.plaid[1]);
    r(-1.5, shoY, 3, torsoH * 0.6, '#e8e8e8'); // shirt + tie
    r(-1, shoY + 2, 2, torsoH * 0.5, '#a03040');
  }
  if (c.epaulet) { r(-W / 2 - 2, shoY, 5, 3, c.epaulet); r(W / 2 - 3, shoY, 5, 3, c.epaulet); }
  if (c.bow) { r(-2, shoY + 1, 4, 2, '#fff'); r(-3, shoY, 2, 4, c.bow); r(1, shoY, 2, 4, c.bow); }

  // ---- arms
  const armW = Math.max(2, W * 0.24), armL = torsoH * 0.9;
  const sleeve = c.plaid ? c.plaid[0] : (c.coat || c.shirt);
  if (pose.wave) {
    // Stan-style double arm wave
    for (const side of [-1, 1]) {
      g.save();
      g.translate(side * (W / 2), shoY + 2);
      g.rotate(side * (Math.sin(t * 6 + (side > 0 ? 0 : 1.3)) * 0.7 - 1.9));
      r(-armW / 2, 0, armW, armL * 0.9, sleeve);
      r(-armW / 2, armL * 0.9, armW, 3, c.skin);
      g.restore();
    }
  } else if (pose.walkPhase != null && face !== 'f' && face !== 'b') {
    const sw = Math.sin(pose.walkPhase * Math.PI * 2 + Math.PI) * 0.5;
    g.save(); g.translate(0, shoY + 2); g.rotate(sw);
    r(-armW / 2, 0, armW, armL * 0.85, sleeve); r(-armW / 2, armL * 0.85, armW, 3, c.skin);
    g.restore();
  } else {
    r(-W / 2 - armW + 1, shoY + 2, armW, armL * 0.85, shade(sleeve));
    r(W / 2 - 1, shoY + 2, armW, armL * 0.85, sleeve);
    r(-W / 2 - armW + 1, shoY + 2 + armL * 0.85, armW, 3, shade(c.skin));
    r(W / 2 - 1, shoY + 2 + armL * 0.85, armW, 3, c.skin);
  }
  // sword at hip (mistress + anyone with sword)
  if (c.sword) { r(W * 0.4, hipY - 6, 2, 14, '#b8bcc8'); r(W * 0.35, hipY - 7, 5, 3, '#8a5a2b'); }

  // ---- head (with talk tilt)
  const tilt = pose.talk ? Math.sin(t * 7) * 1.4 : 0;
  const hw = W * 0.78, hh = headH * 0.72;
  const hx = -hw / 2 + (face === 'r' ? 1.5 : 0) + tilt * 0.4;
  const hy = headY + headH * 0.22 + (pose.talk ? Math.abs(Math.sin(t * 7)) * -1 : 0);
  // neck
  r(-2, shoY - 3, 4, 4, c.skin);
  r(hx, hy, hw, hh, c.skin);
  // face features
  if (face === 'b') {
    r(hx, hy, hw, hh, c.hair);
  } else if (face === 'r') {
    // profile: eye + nose
    r(hx + hw - 4, hy + hh * 0.32, 2, 2.5, '#201008');
    r(hx + hw - 1, hy + hh * 0.5, 2, 3, c.skin); // nose
    const mouthOpen = pose.talk && Math.sin(t * 14) > 0;
    r(hx + hw - 4, hy + hh * 0.72, 3, mouthOpen ? 3 : 1.5, mouthOpen ? '#5a2018' : '#8a5040');
  } else {
    r(hx + hw * 0.22, hy + hh * 0.34, 2.5, 2.5, '#201008');
    r(hx + hw * 0.62, hy + hh * 0.34, 2.5, 2.5, '#201008');
    if (c.specs) { g.strokeStyle = '#e8e8e8'; g.lineWidth = 1; g.strokeRect(hx + hw * 0.16, hy + hh * 0.28, 4.5, 4); g.strokeRect(hx + hw * 0.56, hy + hh * 0.28, 4.5, 4); }
    const mouthOpen = pose.talk && Math.sin(t * 14) > 0;
    if (c.grin && !pose.talk) r(hx + hw * 0.25, hy + hh * 0.68, hw * 0.5, 2.5, '#fff');
    else r(hx + hw * 0.32, hy + hh * 0.7, hw * 0.36, mouthOpen ? 3.5 : 1.5, mouthOpen ? '#5a2018' : '#8a5040');
    if (c.earring) r(hx - 1, hy + hh * 0.5, 2, 3, c.earring);
  }
  // mustache / beard
  if (c.mustache && face !== 'b') r(hx + hw * 0.22, hy + hh * 0.6, hw * 0.56, 2, c.mustache);
  if (c.beard && face !== 'b') {
    const bl = c.longbeard ? h * 0.42 : (c.bigbeard ? h * 0.2 : h * 0.09);
    g.fillStyle = c.beard;
    g.beginPath();
    g.moveTo(hx + 1, hy + hh * 0.55);
    g.lineTo(hx + hw - 1, hy + hh * 0.55);
    g.lineTo(hx + hw * 0.7, hy + hh + bl);
    g.lineTo(hx + hw * 0.3, hy + hh + bl);
    g.closePath(); g.fill();
    if (c.firebeard) { // LeMoore's beard of green fire
      g.fillStyle = '#a0ffc8';
      for (let i = 0; i < 4; i++) {
        const fx2 = hx + hw * (0.25 + i * 0.18), fl = Math.sin(t * 9 + i * 2) * 3;
        r(fx2, hy + hh + bl - 4 + fl, 2, 5, '#a0ffc8');
      }
    }
  }
  // ---- hair / hats
  const style = pose.hat === 'plume' ? 'plume' : c.style;
  switch (style) {
    case 'ponytail':
      r(hx - 1, hy - 2, hw + 2, hh * 0.32, c.hair);
      r(hx - 1, hy, 2, hh * 0.5, c.hair);
      if (face !== 'f') r(hx - 4, hy + 2, 4, hh * 0.9, c.hair); // tail behind
      else r(hx + hw - 1, hy + 2, 3, hh * 0.8, c.hair);
      break;
    case 'bandana':
      r(hx - 1, hy - 2, hw + 2, hh * 0.34, c.band);
      r(hx - 3, hy + 2, 3, hh * 0.4, c.band); // knot tails
      break;
    case 'cap':
      r(hx - 1, hy - 2, hw + 2, hh * 0.3, c.band);
      r(hx + (face === 'r' ? hw - 3 : -2), hy + hh * 0.24, 6, 2, shade(c.band));
      break;
    case 'tricorn':
      r(hx - 3, hy - 1, hw + 6, 3, '#1a1208');
      r(hx, hy - 5, hw, 5, '#241a0c');
      break;
    case 'captain':
      r(hx - 4, hy - 2, hw + 8, 3, '#0e3a24');
      r(hx - 1, hy - 8, hw + 2, 7, '#143c28');
      r(hx + hw / 2 - 2, hy - 7, 4, 4, '#40ff90'); // skull cockade
      break;
    case 'bald':
      r(hx, hy - 1, hw, 2, c.skin);
      r(hx - 1, hy + 1, 2, hh * 0.3, c.hair); r(hx + hw - 1, hy + 1, 2, hh * 0.3, c.hair);
      break;
    case 'wrap':
      r(hx - 1, hy - 5, hw + 2, hh * 0.45 + 5, c.band);
      r(hx + 2, hy - 8, hw - 4, 4, shade(c.band));
      if (c.jewel) r(hx + hw / 2 - 1, hy - 2, 3, 3, c.jewel);
      break;
    case 'neat':
      r(hx - 1, hy - 2, hw + 2, hh * 0.26, c.hair);
      break;
    case 'long':
      r(hx - 2, hy - 2, hw + 4, hh * 0.3, c.hair);
      r(hx - 3, hy, 3, hh * 1.4, c.hair); r(hx + hw, hy, 3, hh * 1.4, c.hair);
      break;
    case 'wild':
      r(hx - 2, hy - 3, hw + 4, hh * 0.4, c.hair);
      for (let i = 0; i < 5; i++) r(hx - 2 + i * (hw + 2) / 4, hy - 5 - (i % 2) * 2, 2, 4, c.hair);
      break;
    case 'cauliflower': { // ceremonial mask
      g.fillStyle = '#e8e8d8';
      g.beginPath(); g.arc(hx + hw / 2, hy + hh * 0.3, hw * 0.75, 0, 7); g.fill();
      g.fillStyle = '#d8d8c0';
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.arc(hx + hw / 2 + Math.cos(a) * hw * 0.5, hy + hh * 0.3 + Math.sin(a) * hw * 0.5, 4, 0, 7); g.fill(); }
      r(hx + hw / 2 - hw * 0.35, hy + hh * 0.9, hw * 0.7, 3, '#4a7a3a'); // leaf collar
      r(hx + hw * 0.28, hy + hh * 0.2, 3, 3, '#1a1a10'); r(hx + hw * 0.6, hy + hh * 0.2, 3, 3, '#1a1a10');
      break;
    }
    case 'fruit':
      r(hx - 1, hy - 2, hw + 2, hh * 0.3, c.hair);
      g.fillStyle = c.band; g.beginPath(); g.arc(hx + hw / 2, hy - 4, 4, 0, 7); g.fill();
      r(hx + hw / 2 - 1, hy - 9, 2, 3, '#2a5a2a');
      break;
    case 'plume':
      r(hx - 3, hy - 2, hw + 6, 3, '#5a3a7a');
      r(hx - 1, hy - 7, hw + 2, 6, '#6a4a8a');
      g.fillStyle = '#d8b0ff';
      g.beginPath(); g.moveTo(hx + hw - 2, hy - 6); g.quadraticCurveTo(hx + hw + 8, hy - 16, hx + hw + 12, hy - 8); g.quadraticCurveTo(hx + hw + 6, hy - 8, hx + hw + 2, hy - 3); g.fill();
      break;
  }
  // ghost glow
  if (ghost) {
    g.globalAlpha = 0.2;
    g.fillStyle = '#40ff90';
    g.beginPath(); g.ellipse(0, (shoY + headY) / 2, W * 1.1, (torsoH + headH) * 0.75, 0, 0, 7); g.fill();
    g.globalAlpha = 1;
  }
  g.globalAlpha = 1;
}

function shade(col) {
  // quick darken of #rrggbb
  if (!col || col[0] !== '#') return col;
  const n = parseInt(col.slice(1), 16);
  const d = (v) => Math.max(0, ((v * 3 / 4) | 0));
  return `rgb(${d(n >> 16 & 255)},${d(n >> 8 & 255)},${d(n & 255)})`;
}

// ------------------------------------------------------------- creatures ----

export function drawCreature(g, id, pose) {
  const r = px(g);
  const t = pose.t || 0;
  if (id === 'dog') { // Biscuit, golden retriever
    const wag = Math.sin(t * 8) * 3;
    g.globalAlpha = 0.25; r(-10, -2, 22, 3, '#000'); g.globalAlpha = 1;
    r(-10, -14, 18, 9, '#d8b060'); // body
    r(-12, -12 + wag * 0.4, 4, 2, '#d8b060'); // tail wag
    r(4, -20, 9, 8, '#d8b060'); // head
    r(11, -17, 4, 3, '#c8a050'); // snout
    r(13, -16, 2, 2, '#201008'); // nose
    r(6, -19, 2, 2, '#201008'); // eye
    r(3, -22, 3, 4, '#b89040'); r(10, -22, 3, 4, '#b89040'); // ears
    const p = pose.walkPhase != null ? Math.sin(pose.walkPhase * 6.28) * 2 : 0;
    r(-8 + p, -6, 3, 6, '#c8a050'); r(2 - p, -6, 3, 6, '#c8a050');
    if (pose.talk && Math.sin(t * 12) > 0) r(11, -14, 3, 2, '#e07a7a'); // tongue
  } else if (id === 'cat') {
    g.globalAlpha = 0.25; r(-6, -1, 13, 2, '#000'); g.globalAlpha = 1;
    r(-6, -8, 10, 5, '#3a3a44');
    r(2, -12, 6, 5, '#3a3a44');
    r(2, -14, 2, 3, '#3a3a44'); r(6, -14, 2, 3, '#3a3a44');
    r(4, -11, 1.5, 1.5, '#c8e040');
    const tw = Math.sin(t * 2) * 3;
    r(-8, -10 + tw * 0.5, 2, 5, '#3a3a44');
    r(-5, -3, 2, 3, '#32323c'); r(0, -3, 2, 3, '#32323c');
  } else if (id === 'seagull') {
    const hop = Math.abs(Math.sin(t * 3)) * 1.5;
    g.globalAlpha = 0.25; r(-5, -1, 10, 2, '#000'); g.globalAlpha = 1;
    r(-5, -8 - hop, 9, 5, '#e0e4ea');
    r(-6, -7 - hop, 4, 3, '#b8bcc8'); // wing
    r(3, -11 - hop, 4, 4, '#e0e4ea');
    r(6, -10 - hop, 3, 1.5, '#e0a030'); // beak
    r(4, -10.5 - hop, 1.5, 1.5, '#201008');
    r(-2, -3 - hop, 1.5, 3 + hop, '#e0a030'); r(1, -3 - hop, 1.5, 3 + hop, '#e0a030');
  } else if (id === 'percy') {
    // proud green-and-red parrot
    const bob = Math.sin(t * 2.5) * 1;
    g.globalAlpha = 0.2; r(-4, -1, 9, 2, '#000'); g.globalAlpha = 1;
    r(-4, -12 + bob, 8, 8, '#3aa04a'); // body
    r(-6, -10 + bob, 3, 6, '#2a8a3a'); // wing
    r(1, -17 + bob, 6, 6, '#c83a3a'); // head
    r(6, -15 + bob, 3, 2, '#e8c040'); // beak
    r(3, -15.5 + bob, 1.5, 1.5, '#101010');
    r(-7, -6 + bob, 4, 2, '#2a6ac8'); // tail feathers
    r(-9, -5 + bob, 4, 2, '#c8c83a');
    r(-1, -4 + bob, 1.5, 4, '#8a8a30'); r(2, -4 + bob, 1.5, 4, '#8a8a30');
    if (pose.talk && Math.sin(t * 14) > 0) r(6, -14 + bob, 3, 2, '#a08020');
  }
}

export function drawActorSprite(g, id, pose) {
  if (id === 'dog' || id === 'cat' || id === 'seagull' || id === 'percy') drawCreature(g, id, pose);
  else drawDude(g, id, pose);
}

// ------------------------------------------------------------ item icons ----
// each icon paints into a 16x16 box at (0,0)

const ICONS = {
  poster(g, r) { r(2, 1, 12, 14, '#c8b890'); r(4, 3, 8, 2, '#5a4a30'); r(4, 7, 8, 1, '#7a6a48'); r(4, 9, 6, 1, '#7a6a48'); r(4, 11, 7, 1, '#7a6a48'); },
  prybar(g, r) { r(3, 12, 10, 2, '#8a8fa0'); r(2, 10, 4, 3, '#a8adc0'); r(11, 3, 2, 10, '#8a8fa0'); r(10, 2, 4, 3, '#a8adc0'); },
  plumedHat(g, r) { r(1, 10, 14, 3, '#5a3a7a'); r(4, 5, 8, 6, '#6a4a8a'); g.fillStyle = '#d8b0ff'; g.beginPath(); g.moveTo(11, 5); g.quadraticCurveTo(16, 0, 15, 7); g.quadraticCurveTo(13, 6, 11, 7); g.fill(); },
  cutlass(g, r) { g.save(); g.translate(8, 8); g.rotate(-0.78); r(-1, -8, 2, 11, '#b8bcc8'); r(-3, 3, 6, 2, '#8a5a2b'); r(-1, 5, 2, 3, '#6b4423'); g.restore(); r(3, 3, 2, 2, '#8a6a3a'); },
  doubloon(g, r) { g.fillStyle = '#ffd800'; g.beginPath(); g.arc(8, 8, 6, 0, 7); g.fill(); g.fillStyle = '#c8a030'; g.beginPath(); g.arc(8, 8, 4, 0, 7); g.fill(); r(7, 5, 2, 6, '#ffd800'); },
  mug(g, r) { r(3, 4, 8, 9, '#b0b8c8'); r(11, 6, 3, 5, '#b0b8c8'); r(12, 7, 1, 3, '#4a5568'); r(4, 5, 6, 2, '#d0d8e8'); },
  fish(g, r) { r(2, 7, 9, 4, '#7a9ab0'); g.fillStyle = '#7a9ab0'; g.beginPath(); g.moveTo(11, 9); g.lineTo(15, 5); g.lineTo(15, 13); g.fill(); r(4, 8, 2, 2, '#101820'); r(2, 9, 9, 1, '#5a7a90'); },
  lime(g, r) { g.fillStyle = '#7ab840'; g.beginPath(); g.arc(8, 9, 5, 0, 7); g.fill(); g.fillStyle = '#9ad860'; g.beginPath(); g.arc(6, 7, 2, 0, 7); g.fill(); r(7, 2, 2, 3, '#4a7a2a'); },
  emptyBottle(g, r) { r(6, 6, 4, 8, '#2e6a48'); r(7, 2, 2, 5, '#2e6a48'); r(6.5, 1, 3, 2, '#8a6a3a'); r(7, 7, 1, 6, '#4a8a60'); },
  bottledFog(g, r) { r(6, 6, 4, 8, '#4a5568'); r(7, 2, 2, 5, '#4a5568'); r(6.5, 1, 3, 2, '#8a6a3a'); g.fillStyle = '#a8b0c8'; g.beginPath(); g.arc(8, 10, 1.6, 0, 7); g.arc(7.4, 8, 1.2, 0, 7); g.fill(); },
  comb(g, r) { r(3, 5, 10, 3, '#c8ccd8'); for (let i = 0; i < 5; i++) r(4 + i * 2, 8, 1, 4, '#c8ccd8'); },
  dogHair(g, r) { g.strokeStyle = '#d8b060'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(4 + i * 2, 12); g.quadraticCurveTo(6 + i * 2, 6, 4.5 + i * 2, 3); g.stroke(); } },
  root(g, r) { r(6, 3, 4, 7, '#b08a58'); r(4, 9, 3, 4, '#b08a58'); r(9, 9, 3, 5, '#a07a48'); r(7, 1, 2, 3, '#4a8a3a'); r(5, 0, 2, 2, '#4a8a3a'); r(9, 0, 2, 2, '#4a8a3a'); r(6.5, 5, 1.5, 1.5, '#3a2812'); r(8.5, 5, 1.5, 1.5, '#3a2812'); },
  elixir(g, r) { r(5, 5, 6, 9, '#6a3a1e'); r(6.5, 2, 3, 4, '#6a3a1e'); r(6, 1, 4, 2, '#8a6a3a'); g.fillStyle = '#ffb85a'; r(6, 7, 4, 6, '#ffb85a'); g.globalAlpha = 0.6; g.fillStyle = '#fff0c0'; r(6, 7, 2, 2, '#fff0c0'); g.globalAlpha = 1; },
  badge(g, r) { g.fillStyle = '#c8a030'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? 4 : 7; const x = 8 + Math.cos(a) * rad, y = 8 + Math.sin(a) * rad; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill(); r(6.5, 6.5, 3, 3, '#ffd800'); },
  voucher(g, r) { r(2, 3, 12, 10, '#e8e0c8'); r(4, 5, 8, 1, '#5a4a30'); r(4, 7, 8, 1, '#5a4a30'); r(4, 9, 5, 1, '#5a4a30'); r(10, 10, 3, 3, '#a03030'); },
  hotSauce(g, r) { r(6, 4, 4, 10, '#c83a1e'); r(7, 1, 2, 4, '#8a2812'); r(5, 8, 6, 3, '#e8e0c8'); g.fillStyle = '#c83a1e'; g.font = '3px monospace'; r(6, 9, 1, 1, '#c83a1e'); r(8, 9, 2, 1, '#c83a1e'); },
  banjo(g, r) { g.fillStyle = '#c8a468'; g.beginPath(); g.arc(6, 10, 5, 0, 7); g.fill(); g.fillStyle = '#f0e8d0'; g.beginPath(); g.arc(6, 10, 3, 0, 7); g.fill(); r(9, 2, 2, 8, '#8a6a30'); r(8, 1, 4, 3, '#6a4a20'); g.strokeStyle = '#e8e8e8'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(6, 10); g.lineTo(10, 2); g.stroke(); },
  kazoo(g, r) { r(2, 7, 11, 3, '#c8a030'); g.fillStyle = '#c8a030'; g.beginPath(); g.moveTo(13, 7); g.lineTo(15, 8.5); g.lineTo(13, 10); g.fill(); r(6, 5, 3, 3, '#a88020'); r(7, 6, 1, 1, '#3a2812'); },
  compass(g, r) { g.fillStyle = '#2e8a5a'; g.beginPath(); g.arc(8, 8, 6.5, 0, 7); g.fill(); g.fillStyle = '#0c1c14'; g.beginPath(); g.arc(8, 8, 5, 0, 7); g.fill(); g.fillStyle = '#70f0a0'; g.beginPath(); g.moveTo(8, 3.5); g.lineTo(9.5, 8); g.lineTo(8, 12.5); g.lineTo(6.5, 8); g.fill(); },
  percy(g, r) { r(5, 6, 6, 6, '#3aa04a'); r(7, 2, 5, 5, '#c83a3a'); r(11, 4, 3, 2, '#e8c040'); r(9, 3.5, 1.5, 1.5, '#101010'); r(2, 8, 4, 2, '#2a6ac8'); r(1, 10, 4, 2, '#c8c83a'); r(6, 12, 1.5, 3, '#8a8a30'); r(9, 12, 1.5, 3, '#8a8a30'); },
  banana(g, r) { g.strokeStyle = '#e8d040'; g.lineWidth = 3; g.beginPath(); g.arc(8, 5, 6, 0.5, 2.6); g.stroke(); r(2, 8, 2, 2, '#8a6a20'); },
};

export function drawIcon(g, id, x, y) {
  g.save();
  g.translate(x, y);
  const r = px(g);
  if (ICONS[id]) ICONS[id](g, r);
  else { r(3, 3, 10, 10, '#8a8fa0'); }
  g.restore();
}
