// Defender of the Moore — procedural pixel art in an Amiga-ish 16-bit palette.
// Heraldic shields, knights & horses, castles, catapults, portrait vignettes,
// and painterly procedural backdrops. Everything drawn directly to a ctx; no
// assets. A tiny position-seeded PRNG keeps decorative detail stable per frame.

export const PAL = {
  ink: '#140f14',
  night: '#241a2e',
  stone: '#8c8496',
  stoneD: '#5c5468',
  stoneL: '#b4aec0',
  wood: '#7c5028',
  woodD: '#4c3018',
  woodL: '#a87844',
  gold: '#e8c040',
  goldD: '#a8801c',
  parch: '#e0cc96',
  parchD: '#b09a5c',
  skin: '#e2ac80',
  skinD: '#b07c54',
  steel: '#c8ccd8',
  steelD: '#7c8090',
  grass: '#4c9048',
  grassD: '#2c6030',
  grassL: '#74b464',
  moor: '#7c6a44',
  moorD: '#544628',
  sky1: '#3a6ca8',
  sky2: '#88b0d8',
  dusk1: '#d88860',
  dusk2: '#e8b878',
  blood: '#b02030',
  cloth: '#a02840',
  banner: '#c02838',
};

// faction/heraldry colour lookup is passed in from campaign; helpers take a
// {color, dark, light, charge} object.

function prng(seed) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 8) & 0xffff) / 0xffff; };
}

// ---------------- heraldry ----------------

export function drawShield(ctx, x, y, w, h, her, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  // shield outline (kite shape)
  const path = new Path2D();
  path.moveTo(0, 0);
  path.lineTo(w, 0);
  path.lineTo(w, h * 0.55);
  path.quadraticCurveTo(w, h * 0.9, w / 2, h);
  path.quadraticCurveTo(0, h * 0.9, 0, h * 0.55);
  path.closePath();
  ctx.fillStyle = her.color;
  ctx.fill(path);
  // shading: darker lower half
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = her.dark;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
  ctx.globalAlpha = 1;
  // a bend or chief for texture
  ctx.fillStyle = her.light;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, w, h * 0.16);
  ctx.globalAlpha = 1;
  // the charge in the centre
  drawCharge(ctx, w / 2, h * 0.5, Math.min(w, h) * 0.5, her.charge, her.light);
  ctx.restore();
  // rim
  if (!opts.noRim) {
    ctx.lineWidth = opts.rim || 1.5;
    ctx.strokeStyle = opts.rimColor || PAL.gold;
    ctx.stroke(path);
  }
  ctx.restore();
}

// a simple silhouetted heraldic charge, centred at (cx,cy), size s
export function drawCharge(ctx, cx, cy, s, kind, col) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = col;
  const u = s / 10;
  if (kind === 'lion') {
    // rampant lion: body + raised paw + mane
    ctx.beginPath();
    ctx.ellipse(0, u, u * 3, u * 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-u * 4, -u * 3, u * 3, u * 3);          // head
    ctx.beginPath(); ctx.arc(-u * 3, -u * 2.5, u * 2.4, 0, Math.PI * 2); ctx.fill(); // mane
    ctx.fillStyle = PAL.ink; ctx.fillRect(-u * 4, -u * 2, u, u); // eye
    ctx.fillStyle = col;
    ctx.fillRect(-u * 5, -u, u * 2, u);                  // fore paw raised
    ctx.fillRect(u * 2, u * 3, u * 1.4, u * 3);          // hind leg
    ctx.fillRect(u * 3, -u, u * 4, u);                   // tail
  } else if (kind === 'raven') {
    ctx.beginPath();
    ctx.moveTo(0, -u * 4);
    ctx.quadraticCurveTo(u * 6, -u, 0, u * 4);
    ctx.quadraticCurveTo(-u * 6, -u, 0, -u * 4);
    ctx.fill();
    ctx.fillRect(-u, -u * 5, u * 2, u * 3);              // head
    ctx.fillRect(u, -u * 4.5, u * 3, u);                 // beak
  } else if (kind === 'boar') {
    ctx.beginPath(); ctx.ellipse(0, u, u * 4.5, u * 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-u * 6, -u * 2, u * 3, u * 3);          // snout head
    ctx.fillStyle = PAL.steel; ctx.fillRect(-u * 6, u, u * 2, u); // tusk
    ctx.fillStyle = col;
    ctx.fillRect(-u * 3, -u * 3, u, u * 2);              // ear
    ctx.fillRect(u * 3, u * 3, u, u * 2.5); ctx.fillRect(-u, u * 3, u, u * 2.5); // legs
  } else if (kind === 'wolf') {
    ctx.beginPath(); ctx.ellipse(u, u, u * 4, u * 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-u * 6, -u * 3); ctx.lineTo(-u * 2, -u * 3); ctx.lineTo(-u * 3, u); ctx.lineTo(-u * 6, u); ctx.fill(); // head
    ctx.beginPath(); ctx.moveTo(-u * 6, -u * 3); ctx.lineTo(-u * 5, -u * 5); ctx.lineTo(-u * 4, -u * 3); ctx.fill(); // ear
    ctx.fillStyle = PAL.ink; ctx.fillRect(-u * 5, -u * 2, u, u);
    ctx.fillStyle = col;
    ctx.fillRect(u * 4, u * 2, u, u * 2.5); ctx.fillRect(-u, u * 2, u, u * 2.5);
    ctx.fillRect(u * 4, -u * 2, u * 3, u);               // tail
  } else if (kind === 'stag') {
    ctx.beginPath(); ctx.ellipse(0, u * 2, u * 2.4, u * 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-u, -u * 3, u * 2, u * 4);              // neck
    ctx.fillRect(-u * 1.5, -u * 5, u * 3, u * 2);        // head
    // antlers
    ctx.strokeStyle = col; ctx.lineWidth = u * 0.8;
    ctx.beginPath();
    ctx.moveTo(-u, -u * 5); ctx.lineTo(-u * 3, -u * 8); ctx.moveTo(-u * 3, -u * 8); ctx.lineTo(-u * 4.5, -u * 7);
    ctx.moveTo(u, -u * 5); ctx.lineTo(u * 3, -u * 8); ctx.moveTo(u * 3, -u * 8); ctx.lineTo(u * 4.5, -u * 7);
    ctx.stroke();
    ctx.fillRect(-u * 1.5, u * 4, u, u * 2); ctx.fillRect(u * 0.5, u * 4, u, u * 2);
  } else if (kind === 'sword') {
    ctx.fillStyle = col;
    ctx.fillRect(-u * 0.8, -u * 6, u * 1.6, u * 10);     // blade
    ctx.fillRect(-u * 3, -u * 2, u * 6, u);              // crossguard
    ctx.fillRect(-u * 0.8, u * 4, u * 1.6, u * 2);       // grip
    ctx.beginPath(); ctx.arc(0, u * 6, u * 1.2, 0, Math.PI * 2); ctx.fill(); // pommel
    ctx.beginPath(); ctx.moveTo(0, -u * 8); ctx.lineTo(-u * 0.8, -u * 6); ctx.lineTo(u * 0.8, -u * 6); ctx.fill(); // point
  } else {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------------- knights & horses ----------------

// A mounted knight for the joust. dir +1 faces right, -1 left. lance 0..1 raises
// the lance tip (0 = low, 1 = high). bob adds a gallop bounce.
export function drawJouster(ctx, x, y, dir, her, lance, bob = 0, hit = 0) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(dir, 1);
  // horse
  ctx.fillStyle = hit ? '#c86050' : '#5a4632';
  ctx.fillRect(-20, -6, 34, 14);            // body
  ctx.fillRect(-22, -2, 6, 16);             // rear leg
  ctx.fillRect(10, -2, 6, 16);              // fore leg
  ctx.fillRect(-18, 0, 5, 14);              // rear leg 2
  ctx.fillRect(4, 0, 5, 14);                // fore leg 2
  ctx.fillStyle = '#463424';
  ctx.fillRect(14, -14, 8, 12);             // neck
  ctx.fillRect(18, -18, 12, 8);             // head
  ctx.fillStyle = '#2c2018';
  ctx.fillRect(12, -14, 4, 8);              // mane
  // caparison (cloth) in house colour
  ctx.fillStyle = her.color;
  ctx.fillRect(-20, 4, 32, 8);
  ctx.fillStyle = her.dark;
  for (let i = -18; i < 12; i += 8) { ctx.beginPath(); ctx.moveTo(i, 12); ctx.lineTo(i + 4, 16); ctx.lineTo(i + 8, 12); ctx.fill(); }
  // rider body
  ctx.fillStyle = PAL.steel;
  ctx.fillRect(-6, -22, 10, 16);            // torso armour
  ctx.fillStyle = her.color;
  ctx.fillRect(-6, -22, 10, 5);             // surcoat shoulders
  ctx.fillStyle = PAL.steelD;
  ctx.fillRect(-6, -8, 5, 6); ctx.fillRect(1, -8, 5, 6); // legs
  // helm
  ctx.fillStyle = PAL.steel; ctx.fillRect(-4, -30, 9, 9);
  ctx.fillStyle = PAL.ink; ctx.fillRect(2, -27, 3, 2);   // visor slit
  ctx.fillStyle = her.light; ctx.fillRect(-4, -33, 9, 3); // plume
  // shield on arm
  drawShield(ctx, -12, -22, 8, 11, her, { noRim: true });
  // lance: pivots at shoulder, tip height set by `lance`
  const sx = 4, sy = -18;
  const tipY = sy - (lance - 0.5) * 26;
  ctx.strokeStyle = PAL.woodL; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 34, tipY); ctx.stroke();
  ctx.fillStyle = PAL.steel;
  ctx.beginPath(); ctx.moveTo(sx + 34, tipY); ctx.lineTo(sx + 30, tipY - 3); ctx.lineTo(sx + 30, tipY + 3); ctx.fill();
  // pennon
  ctx.fillStyle = her.color;
  ctx.fillRect(sx + 22, tipY - 6 + (sy - tipY) * 0.35, 6, 4);
  ctx.restore();
}

// A foot fighter for the sword duel. stance 0 high /1 mid /2 low; act: 'idle'
// 'attack' 'parry' 'hurt'. dir +1 right / -1 left.
export function drawFencer(ctx, x, y, dir, her, stance, act) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const hurt = act === 'hurt';
  // legs
  ctx.fillStyle = PAL.steelD;
  ctx.fillRect(-6, -2, 5, 14); ctx.fillRect(2, -2, 5, 14);
  ctx.fillStyle = PAL.woodD; ctx.fillRect(-8, 11, 8, 3); ctx.fillRect(2, 11, 8, 3); // boots
  // surcoat / torso
  ctx.fillStyle = hurt ? '#d06858' : PAL.steel;
  ctx.fillRect(-7, -20, 14, 20);
  ctx.fillStyle = her.color;
  ctx.fillRect(-7, -20, 14, 8);
  drawCharge(ctx, 0, -14, 9, her.charge, her.light);
  // head + helm
  ctx.fillStyle = PAL.skin; ctx.fillRect(-4, -30, 9, 9);
  ctx.fillStyle = PAL.steelD; ctx.fillRect(-5, -31, 11, 4); // helm brim
  ctx.fillStyle = PAL.steel; ctx.fillRect(-5, -34, 11, 4);
  ctx.fillStyle = her.light; ctx.fillRect(0, -37, 3, 4);    // crest
  // shield arm (back)
  drawShield(ctx, -13, -18, 8, 11, her, { noRim: true });
  // sword arm — pose by stance/act
  ctx.strokeStyle = PAL.steel; ctx.lineWidth = 2.4;
  let hx = 7, hy = -16, tx, ty;
  const reach = act === 'attack' ? 26 : 16;
  if (stance === 0) { ty = -34; tx = hx + reach; }        // high
  else if (stance === 2) { ty = -2; tx = hx + reach; }    // low
  else { ty = -16; tx = hx + reach; }                     // mid
  if (act === 'parry') { tx = hx + 8; ty = (stance === 0 ? -32 : stance === 2 ? -4 : -16); }
  ctx.fillStyle = PAL.skin; ctx.fillRect(hx - 2, hy - 2, 5, 5); // hand
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  // guard
  ctx.strokeStyle = PAL.gold; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hx - 2, hy - 3); ctx.lineTo(hx + 2, hy + 3); ctx.stroke();
  ctx.restore();
}

// A small foot soldier icon (for army banners / field battle).
export function drawSoldier(ctx, x, y, dir, her) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.fillStyle = PAL.steel; ctx.fillRect(-3, -12, 6, 12);
  ctx.fillStyle = her.color; ctx.fillRect(-3, -12, 6, 5);
  ctx.fillStyle = PAL.skin; ctx.fillRect(-2, -17, 5, 5);
  ctx.fillStyle = PAL.steelD; ctx.fillRect(-3, -18, 7, 3);
  // spear
  ctx.strokeStyle = PAL.woodL; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(4, -22); ctx.lineTo(4, 2); ctx.stroke();
  ctx.fillStyle = PAL.steel; ctx.fillRect(3, -24, 3, 3);
  ctx.restore();
}

// ---------------- castle ----------------

// A castle keep. dmg 0..1 knocks stones out of the walls & towers.
export function drawCastle(ctx, x, y, w, h, her, dmg = 0) {
  const r = prng(777);
  ctx.save();
  ctx.translate(x, y);
  // main wall
  ctx.fillStyle = PAL.stone;
  ctx.fillRect(0, h * 0.4, w, h * 0.6);
  ctx.fillStyle = PAL.stoneD;
  ctx.fillRect(0, h * 0.4, w, 3);
  // stone courses
  ctx.strokeStyle = PAL.stoneD; ctx.lineWidth = 1;
  for (let yy = h * 0.4 + 6; yy < h; yy += 6) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
  // battlements along the top
  ctx.fillStyle = PAL.stone;
  for (let bx = 0; bx < w; bx += 10) {
    if ((bx / 10) % 2 === 0) ctx.fillRect(bx, h * 0.4 - 6, 8, 8);
  }
  // towers
  const towerW = w * 0.22;
  for (const tx of [0, w - towerW]) {
    ctx.fillStyle = PAL.stoneL; ctx.fillRect(tx, h * 0.18, towerW, h * 0.82);
    ctx.fillStyle = PAL.stoneD; ctx.fillRect(tx, h * 0.18, towerW, 3);
    for (let bx = tx; bx < tx + towerW; bx += 8) if (((bx - tx) / 8) % 2 === 0) ctx.fillStyle = PAL.stoneL, ctx.fillRect(bx, h * 0.18 - 6, 6, 8);
    // conical roof + pennant
    ctx.fillStyle = her.dark;
    ctx.beginPath(); ctx.moveTo(tx - 2, h * 0.18 - 6); ctx.lineTo(tx + towerW / 2, h * 0.02); ctx.lineTo(tx + towerW + 2, h * 0.18 - 6); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx + towerW / 2, h * 0.02); ctx.lineTo(tx + towerW / 2, -8); ctx.stroke();
    ctx.fillStyle = her.color; ctx.fillRect(tx + towerW / 2, -8, 8, 5);
    // arrow-slit
    ctx.fillStyle = PAL.ink; ctx.fillRect(tx + towerW / 2 - 1, h * 0.4, 3, 8);
  }
  // gatehouse
  ctx.fillStyle = PAL.woodD;
  ctx.fillRect(w / 2 - 7, h * 0.62, 14, h * 0.38);
  ctx.strokeStyle = PAL.wood; ctx.lineWidth = 1;
  for (let yy = h * 0.62; yy < h; yy += 5) { ctx.beginPath(); ctx.moveTo(w / 2 - 7, yy); ctx.lineTo(w / 2 + 7, yy); ctx.stroke(); }
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(w / 2, h * 0.66, 7, Math.PI, 0); ctx.fill();
  // battle damage: rubble gaps
  if (dmg > 0) {
    ctx.fillStyle = PAL.ink;
    const holes = Math.floor(dmg * 14);
    for (let i = 0; i < holes; i++) {
      const hx = r() * (w - 8), hy = h * 0.2 + r() * h * 0.7, s = 4 + r() * 5;
      ctx.globalAlpha = 0.85; ctx.fillRect(hx, hy, s, s);
    }
    ctx.globalAlpha = 1;
    // smoke if heavily damaged
    if (dmg > 0.5) {
      ctx.fillStyle = 'rgba(40,40,50,0.5)';
      for (let i = 0; i < 6; i++) ctx.beginPath(), ctx.arc(w * 0.3 + r() * w * 0.4, h * 0.1 - r() * 14, 4 + r() * 5, 0, Math.PI * 2), ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------- catapult ----------------
export function drawCatapult(ctx, x, y, armAngle, her) {
  ctx.save(); ctx.translate(x, y);
  // wheels
  ctx.fillStyle = PAL.woodD;
  ctx.beginPath(); ctx.arc(-8, 6, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, 6, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.wood;
  ctx.beginPath(); ctx.arc(-8, 6, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, 6, 3, 0, Math.PI * 2); ctx.fill();
  // frame
  ctx.fillStyle = PAL.wood; ctx.fillRect(-12, 0, 26, 5);
  ctx.strokeStyle = PAL.woodL; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(2, -12); ctx.lineTo(12, 2); ctx.stroke();
  // throwing arm
  ctx.save(); ctx.translate(2, -2); ctx.rotate(-armAngle);
  ctx.strokeStyle = PAL.woodL; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, 0); ctx.stroke();
  ctx.fillStyle = her.color; ctx.beginPath(); ctx.arc(-18, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------------- portrait vignettes ----------------
// A stylised lord/lady bust inside an arched frame, for events & rivals.
export function drawPortrait(ctx, x, y, w, h, kind, her) {
  ctx.save(); ctx.translate(x, y);
  // arched stone frame
  ctx.fillStyle = PAL.stoneD; ctx.fillRect(-3, -3, w + 6, h + 6);
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  // background wash
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, her ? her.dark : '#3a2c40'); grad.addColorStop(1, PAL.ink);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  if (kind === 'maiden') {
    // shoulders + gown
    ctx.fillStyle = PAL.cloth; ctx.fillRect(cx - 16, h - 22, 32, 22);
    ctx.fillStyle = '#d05c78'; ctx.fillRect(cx - 10, h - 22, 20, 6);
    // neck + face
    ctx.fillStyle = PAL.skin; ctx.fillRect(cx - 4, h - 30, 8, 10);
    ctx.beginPath(); ctx.ellipse(cx, h - 34, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    // long hair
    ctx.fillStyle = '#8a5a2c'; ctx.fillRect(cx - 12, h - 44, 5, 30); ctx.fillRect(cx + 7, h - 44, 5, 30);
    ctx.fillRect(cx - 11, h - 46, 22, 8);
    // eyes + circlet
    ctx.fillStyle = PAL.ink; ctx.fillRect(cx - 5, h - 36, 2, 2); ctx.fillRect(cx + 3, h - 36, 2, 2);
    ctx.fillStyle = PAL.gold; ctx.fillRect(cx - 10, h - 45, 20, 2);
    ctx.fillStyle = PAL.blood; ctx.fillRect(cx - 2, h - 28, 4, 2); // lips
  } else {
    // a lord / rival champion: helm or crowned head in house colour
    ctx.fillStyle = her ? her.color : '#6a5a3a';
    ctx.fillRect(cx - 18, h - 24, 36, 24);          // shoulders / mantle
    ctx.fillStyle = her ? her.dark : '#4a3c22';
    ctx.fillRect(cx - 18, h - 24, 36, 5);
    ctx.fillStyle = PAL.skin; ctx.fillRect(cx - 4, h - 30, 8, 8);
    // helm or head
    ctx.fillStyle = PAL.steel; ctx.fillRect(cx - 9, h - 44, 18, 16);
    ctx.fillStyle = PAL.ink; ctx.fillRect(cx - 6, h - 38, 12, 3);  // visor slit
    ctx.fillStyle = her ? her.light : PAL.gold;
    ctx.fillRect(cx - 2, h - 50, 5, 8);              // plume
    // beard hint
    ctx.fillStyle = PAL.skinD; ctx.fillRect(cx - 5, h - 30, 10, 3);
  }
  ctx.restore();
  // gold arch frame
  ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

// ---------------- backdrops ----------------

export function skyGradient(ctx, w, h, top, bot) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

export function drawClouds(ctx, w, h, t) {
  const r = prng(9);
  ctx.fillStyle = 'rgba(240,240,250,0.55)';
  for (let i = 0; i < 6; i++) {
    const cx = (r() * w + t * (6 + i * 2)) % (w + 60) - 30;
    const cy = 10 + r() * (h * 0.35);
    const s = 8 + r() * 12;
    ctx.beginPath();
    ctx.arc(cx, cy, s, 0, Math.PI * 2);
    ctx.arc(cx + s, cy + 2, s * 0.8, 0, Math.PI * 2);
    ctx.arc(cx - s, cy + 3, s * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// throne room / council backdrop
export function drawThroneRoom(ctx, w, h) {
  ctx.fillStyle = '#2a1f2e'; ctx.fillRect(0, 0, w, h);
  // stone wall blocks
  ctx.fillStyle = PAL.stoneD;
  for (let y = 0; y < h; y += 16) for (let x = ((y / 16) % 2) * 16; x < w; x += 32) ctx.fillRect(x, y, 30, 14);
  // arched windows with light
  for (const wx of [w * 0.18, w * 0.5, w * 0.82]) {
    ctx.fillStyle = '#5a7ab0';
    ctx.fillRect(wx - 12, 20, 24, 44);
    ctx.beginPath(); ctx.arc(wx, 20, 12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = PAL.stone; ctx.fillRect(wx - 1, 20, 2, 44);
  }
  // banners hanging
  for (const bx of [w * 0.32, w * 0.68]) {
    ctx.fillStyle = PAL.banner; ctx.fillRect(bx - 8, 8, 16, 60);
    ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.arc(bx, 34, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.banner; ctx.beginPath(); ctx.moveTo(bx - 8, 68); ctx.lineTo(bx, 62); ctx.lineTo(bx + 8, 68); ctx.fill();
  }
  // floor
  ctx.fillStyle = '#3a2c34'; ctx.fillRect(0, h - 28, w, 28);
  ctx.fillStyle = '#2a1e26'; for (let x = 0; x < w; x += 20) ctx.fillRect(x, h - 28, 1, 28);
}

// letterbox bars + centred title lines
export function letterbox(ctx, w, h, frac = 0.16) {
  const bh = Math.round(h * frac);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(0, 0, w, bh);
  ctx.fillRect(0, h - bh, w, bh);
  return bh;
}
