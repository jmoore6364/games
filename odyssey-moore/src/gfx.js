// gfx.js — procedural Canvas 2D art. Greek/Aegean palette, no external assets.
import { TAU } from './util.js';

export const PAL = {
  seaDeep: '#141d3a', seaMid: '#1c2f52', seaLip: '#2f4d78', seaFoam: '#8fb7cf',
  wine: '#3a1c37', wine2: '#5a2540',
  sky: '#e9d8b8', skyLow: '#f2c98a',
  terracotta: '#c8683c', terra2: '#e08a4a',
  bronze: '#c79a4b', bronze2: '#8a6a2f',
  wood: '#7a5230', wood2: '#5a3a20',
  sail: '#efe4c8', sailShade: '#d8c8a2',
  marble: '#efe7d2', land: '#b7a06a', landDk: '#8a7548', beach: '#e3d3a2',
  olive: '#5a6b3a', oliveDk: '#3d4a26',
  blood: '#a5352f', ink: '#12111a',
  athena: '#8fd8c8', gold: '#ffd870',
  hp: '#d6534a', crew: '#e0b040', hull: '#c98a4a', favor: '#6fd8c8', glory: '#ffd870',
};

export function font(ctx, size, weight = 'bold') {
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Georgia", serif`;
}
export function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  font(ctx, size, weight);
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
export function textShadow(ctx, str, x, y, size, color, align = 'left') {
  font(ctx, size, 'bold'); ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
// word-wrap paragraph, returns lines
export function wrap(ctx, str, maxW, size) {
  font(ctx, size, 'normal');
  const words = str.split(' '); const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------- sea background with animated waves ----------
export function drawSea(ctx, W, H, t, wine = false) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (wine) { g.addColorStop(0, PAL.wine); g.addColorStop(0.5, '#241436'); g.addColorStop(1, PAL.seaDeep); }
  else { g.addColorStop(0, PAL.seaMid); g.addColorStop(0.55, PAL.seaDeep); g.addColorStop(1, '#0d1428'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawWaves(ctx, W, H, t);
}
export function drawWaves(ctx, W, H, t, density = 1) {
  ctx.save();
  ctx.strokeStyle = PAL.seaLip; ctx.lineWidth = 1.4;
  const rows = Math.ceil(H / 46);
  for (let r = 0; r < rows; r++) {
    const y = r * 46 + 24;
    const ph = t * 0.9 + r * 0.7;
    ctx.globalAlpha = 0.18 + 0.10 * Math.sin(r * 1.3 + t);
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 34 / density) {
      const yy = y + Math.sin((x * 0.03) + ph) * 4;
      if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // sparse foam flecks
  ctx.globalAlpha = 0.5; ctx.fillStyle = PAL.seaFoam;
  for (let i = 0; i < 26 * density; i++) {
    const x = (i * 137.5 + t * 22) % W;
    const y = (i * 83.3 + Math.sin(i + t) * 10) % H;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

// ---------- a galley (top-down). x,y center; a=heading angle; s=scale ----------
export function drawGalley(ctx, x, y, a, s, opt = {}) {
  const oarPhase = opt.oarPhase || 0;
  const sail = opt.sail !== false;
  const hull = opt.hull || PAL.wood;
  const flash = opt.flash || 0;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  // wake
  if (opt.moving) {
    ctx.globalAlpha = 0.25; ctx.fillStyle = PAL.seaFoam;
    ctx.beginPath(); ctx.ellipse(-42 * s, 0, 16 * s, 10 * s, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // oars
  ctx.strokeStyle = '#caa26a'; ctx.lineWidth = Math.max(1, 1.6 * s);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const ox = i * 6 * s;
    const swing = Math.sin(oarPhase + i * 0.6) * 5 * s;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(ox, side * 9 * s);
      ctx.lineTo(ox + swing, side * 20 * s);
      ctx.stroke();
    }
  }
  // hull (pointed prow at +x)
  ctx.beginPath();
  ctx.moveTo(34 * s, 0);
  ctx.quadraticCurveTo(20 * s, -12 * s, -20 * s, -10 * s);
  ctx.quadraticCurveTo(-34 * s, -6 * s, -34 * s, 0);
  ctx.quadraticCurveTo(-34 * s, 6 * s, -20 * s, 10 * s);
  ctx.quadraticCurveTo(20 * s, 12 * s, 34 * s, 0);
  ctx.closePath();
  const hg = ctx.createLinearGradient(0, -12 * s, 0, 12 * s);
  hg.addColorStop(0, PAL.wood2); hg.addColorStop(0.5, hull); hg.addColorStop(1, PAL.wood2);
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1, 1.4 * s); ctx.stroke();
  // painted eye on the prow (apotropaic)
  ctx.fillStyle = PAL.marble; ctx.beginPath(); ctx.ellipse(24 * s, -5 * s, 3.2 * s, 2.2 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(24.5 * s, -5 * s, 1.2 * s, 0, TAU); ctx.fill();
  // deck stripe
  ctx.strokeStyle = PAL.bronze; ctx.lineWidth = Math.max(1, 1 * s);
  ctx.beginPath(); ctx.moveTo(-24 * s, 0); ctx.lineTo(30 * s, 0); ctx.stroke();
  // curved stern ornament (aphlaston)
  ctx.strokeStyle = PAL.bronze2; ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath(); ctx.moveTo(-34 * s, 0); ctx.quadraticCurveTo(-44 * s, -8 * s, -38 * s, -16 * s); ctx.stroke();
  // mast + sail
  if (sail) {
    ctx.fillStyle = '#4a3018'; ctx.fillRect(-2 * s, -4 * s, 4 * s, 8 * s);
    ctx.save();
    ctx.translate(2 * s, 0);
    const bow = Math.sin(oarPhase * 0.5) * 2 * s;
    ctx.beginPath();
    ctx.moveTo(-2 * s, -14 * s); ctx.quadraticCurveTo(16 * s + bow, -8 * s, 20 * s + bow, 0);
    ctx.quadraticCurveTo(16 * s + bow, 8 * s, -2 * s, 14 * s); ctx.closePath();
    const sg = ctx.createLinearGradient(-2 * s, 0, 20 * s, 0);
    sg.addColorStop(0, PAL.sailShade); sg.addColorStop(1, PAL.sail);
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = PAL.terracotta; ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath(); ctx.moveTo(9 * s, -10 * s); ctx.lineTo(9 * s, 10 * s); ctx.stroke();
    ctx.restore();
  }
  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 36 * s, 14 * s, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// enemy pirate galley (darker, red sail)
export function drawEnemyShip(ctx, x, y, a, s, flash = 0) {
  drawGalley(ctx, x, y, a, s, { hull: '#4a2e2e', moving: true, sail: true, flash, oarPhase: (x + y) * 0.05 });
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#7a2620';
  ctx.beginPath(); ctx.moveTo(0, -13 * s); ctx.quadraticCurveTo(18 * s, -7 * s, 22 * s, 0);
  ctx.quadraticCurveTo(18 * s, 7 * s, 0, 13 * s); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------- an island (top-down blob) ----------
export function drawIsland(ctx, x, y, r, seed = 1, opt = {}) {
  ctx.save(); ctx.translate(x, y);
  const pts = 14;
  const rr = (i) => r * (0.82 + 0.18 * Math.sin(i * 2.3 + seed) * Math.cos(i * 1.7 + seed));
  // beach ring
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) { const a = i / pts * TAU; const R = rr(i) * 1.14; const px = Math.cos(a) * R, py = Math.sin(a) * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fillStyle = PAL.beach; ctx.fill();
  // land
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) { const a = i / pts * TAU; const R = rr(i); const px = Math.cos(a) * R, py = Math.sin(a) * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
  const lg = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  lg.addColorStop(0, PAL.land); lg.addColorStop(1, PAL.landDk);
  ctx.fillStyle = opt.color || lg; ctx.fill();
  // olive dots / rocks
  for (let i = 0; i < 7; i++) {
    const a = i * 1.7 + seed; const R = r * (0.2 + 0.5 * ((i * 37) % 10) / 10);
    ctx.fillStyle = i % 2 ? PAL.olive : PAL.oliveDk;
    ctx.beginPath(); ctx.arc(Math.cos(a) * R, Math.sin(a) * R, r * 0.09, 0, TAU); ctx.fill();
  }
  if (opt.marble) { // a temple mark
    ctx.fillStyle = PAL.marble; ctx.fillRect(-r * 0.16, -r * 0.16, r * 0.32, r * 0.24);
    ctx.fillStyle = PAL.terracotta; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.16); ctx.lineTo(0, -r * 0.32); ctx.lineTo(r * 0.2, -r * 0.16); ctx.fill();
  }
  ctx.restore();
}

// ---------- a hoplite / warrior sprite (top-down-ish). team colors ----------
export function drawWarrior(ctx, x, y, a, s, opt = {}) {
  const skin = opt.skin || '#d9a066';
  const cloth = opt.cloth || PAL.terracotta;
  const shield = opt.shield || PAL.bronze;
  const flash = opt.flash || 0;
  ctx.save(); ctx.translate(x, y);
  // shadow
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 6 * s, 10 * s, 4 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.rotate(a + Math.PI / 2);
  // body / tunic
  ctx.fillStyle = cloth; ctx.beginPath(); ctx.ellipse(0, 2 * s, 6 * s, 8 * s, 0, 0, TAU); ctx.fill();
  // shield (round hoplon) to the left
  ctx.fillStyle = shield; ctx.beginPath(); ctx.arc(-6 * s, 0, 6 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = PAL.bronze2; ctx.lineWidth = 1.4 * s; ctx.stroke();
  ctx.fillStyle = PAL.bronze2; ctx.beginPath(); ctx.arc(-6 * s, 0, 2 * s, 0, TAU); ctx.fill();
  // weapon (spear/sword forward = up after rotate)
  if (opt.weapon !== 'none') {
    ctx.strokeStyle = opt.weapon === 'sword' ? '#e8e8ee' : '#caa26a'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(4 * s, 0); ctx.lineTo(4 * s + (opt.swing || 0) * s, -(opt.weapon === 'sword' ? 12 : 18) * s); ctx.stroke();
  }
  // head + helmet crest
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -5 * s, 3.4 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = shield; ctx.beginPath(); ctx.arc(0, -6 * s, 3.6 * s, Math.PI, TAU); ctx.fill();
  if (opt.crest) { ctx.fillStyle = opt.crest; ctx.fillRect(-1 * s, -12 * s, 2 * s, 6 * s); }
  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 10 * s, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// beast (Circe) — wolfish quadruped blob
export function drawBeast(ctx, x, y, a, s, flash = 0) {
  ctx.save(); ctx.translate(x, y);
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 6 * s, 11 * s, 4 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.rotate(a);
  ctx.fillStyle = '#6b5138'; ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 6 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4a3826'; ctx.beginPath(); ctx.arc(10 * s, 0, 4 * s, 0, TAU); ctx.fill(); // head
  ctx.fillStyle = '#d63'; ctx.beginPath(); ctx.arc(12 * s, -1.5 * s, 1.1 * s, 0, TAU); ctx.arc(12 * s, 1.5 * s, 1.1 * s, 0, TAU); ctx.fill(); // eyes
  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 12 * s, 7 * s, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export function drawArrow(ctx, x, y, a, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 1.6 * s;
  ctx.beginPath(); ctx.moveTo(-7 * s, 0); ctx.lineTo(6 * s, 0); ctx.stroke();
  ctx.fillStyle = '#e8e8ee'; ctx.beginPath(); ctx.moveTo(6 * s, 0); ctx.lineTo(2 * s, -2 * s); ctx.lineTo(2 * s, 2 * s); ctx.fill();
  ctx.strokeStyle = '#c8683c'; ctx.beginPath(); ctx.moveTo(-7 * s, 0); ctx.lineTo(-9 * s, -2 * s); ctx.moveTo(-7 * s, 0); ctx.lineTo(-9 * s, 2 * s); ctx.stroke();
  ctx.restore();
}

// whirlpool (Charybdis)
export function drawWhirl(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < 4; i++) {
    const rr = r * (1 - i * 0.22);
    ctx.strokeStyle = `rgba(120,180,200,${0.5 - i * 0.1})`; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let a = 0; a < TAU * 1.4; a += 0.2) {
      const R = rr * (1 - a / (TAU * 3)) - i * 3;
      const px = Math.cos(a + t * 2 + i) * R, py = Math.sin(a + t * 2 + i) * R;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(10,20,30,0.8)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, TAU); ctx.fill();
  ctx.restore();
}

// a sheep (Cyclops escape)
export function drawSheep(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.ellipse(0, 0, 9 * s, 6 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4a4038'; ctx.beginPath(); ctx.arc(8 * s, 0, 3 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#4a4038'; ctx.lineWidth = 1.4 * s;
  ctx.beginPath(); ctx.moveTo(-4 * s, 5 * s); ctx.lineTo(-4 * s, 8 * s); ctx.moveTo(4 * s, 5 * s); ctx.lineTo(4 * s, 8 * s); ctx.stroke();
  ctx.restore();
}

// small explosion / splash burst
export function drawBurst(ctx, x, y, r, color = '#ffd870', alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill();
  ctx.restore();
}

// compass rose pointing toward angle `a`
export function drawCompass(ctx, x, y, r, a, wind) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,25,45,0.7)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = PAL.bronze; ctx.lineWidth = 2; ctx.stroke();
  // N marker
  text(ctx, 'N', 0, -r + 12, 10, PAL.marble, 'center');
  // wind arrow (thin, athena)
  if (wind != null) {
    ctx.save(); ctx.rotate(wind); ctx.strokeStyle = PAL.athena; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(0, -r * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-3, -r * 0.4); ctx.lineTo(3, -r * 0.4); ctx.fill(); ctx.restore();
  }
  // bearing needle (gold) toward destination
  ctx.rotate(a); ctx.fillStyle = PAL.gold;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.78); ctx.lineTo(-4, 0); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
