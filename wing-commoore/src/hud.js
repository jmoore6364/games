// hud.js — cockpit frame + heads-up display drawing. Pure Canvas 2D.
const AMBER = '#ffb020';
const CYAN = '#37e0ff';
const GREEN = '#5dff8a';
const RED = '#ff4d4d';

export function drawCockpit(ctx, W, H) {
  // Dark canopy frame around a slightly inset viewport.
  const m = Math.round(H * 0.06);
  ctx.save();
  // vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // frame color
  const frame = '#0d1626';
  const edge = '#22344f';
  ctx.fillStyle = frame;
  // top and bottom dashboards
  const topH = H * 0.055, botH = H * 0.20;
  ctx.fillRect(0, 0, W, topH);
  ctx.fillRect(0, H - botH, W, botH);
  // side struts
  ctx.fillRect(0, 0, W * 0.05, H);
  ctx.fillRect(W - W * 0.05, 0, W * 0.05, H);

  // angled canopy corners (struts)
  ctx.fillStyle = frame;
  ctx.beginPath();
  ctx.moveTo(0, topH); ctx.lineTo(W * 0.22, topH); ctx.lineTo(W * 0.05, H * 0.22); ctx.lineTo(0, H * 0.30); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, topH); ctx.lineTo(W * 0.78, topH); ctx.lineTo(W * 0.95, H * 0.22); ctx.lineTo(W, H * 0.30); ctx.closePath(); ctx.fill();

  // center strut post over dashboard
  ctx.fillStyle = '#0a1220';
  ctx.fillRect(W * 0.5 - 3, H - botH, 6, botH);

  // edges highlight
  ctx.strokeStyle = edge; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.beginPath(); ctx.moveTo(0, H - botH); ctx.lineTo(W, H - botH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, topH); ctx.lineTo(W, topH); ctx.stroke();
  ctx.restore();
}

export function drawReticle(ctx, W, H, heat) {
  const cx = W / 2, cy = H * 0.5;
  ctx.save();
  ctx.strokeStyle = heat > 0.85 ? RED : CYAN;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  const r = 18;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.stroke();
  // ticks
  ctx.beginPath();
  ctx.moveTo(cx - r - 8, cy); ctx.lineTo(cx - r + 2, cy);
  ctx.moveTo(cx + r - 2, cy); ctx.lineTo(cx + r + 8, cy);
  ctx.moveTo(cx, cy - r - 8); ctx.lineTo(cx, cy - r + 2);
  ctx.moveTo(cx, cy + r - 2); ctx.lineTo(cx, cy + r + 8);
  ctx.stroke();
  ctx.restore();
  return { cx, cy };
}

// Lead indicator: where to aim to hit a moving target. pos is screen {x,y,onScreen}.
export function drawLead(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = AMBER; ctx.lineWidth = 2; ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 12, y); ctx.lineTo(x - 7, y);
  ctx.moveTo(x + 7, y); ctx.lineTo(x + 12, y);
  ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 7);
  ctx.moveTo(x, y + 7); ctx.lineTo(x, y + 12);
  ctx.stroke();
  ctx.restore();
}

// Target box around locked enemy. box:{x,y,r}. info:{name,dist,shield,hull,locking,lockProg,locked}
export function drawTargetBox(ctx, box, info) {
  const s = Math.max(14, Math.min(140, box.r));
  ctx.save();
  const col = info.locked ? RED : (info.locking ? AMBER : GREEN);
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.95;
  // corner brackets
  const x0 = box.x - s, y0 = box.y - s, x1 = box.x + s, y1 = box.y + s, c = s * 0.35;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + c); ctx.lineTo(x0, y0); ctx.lineTo(x0 + c, y0);
  ctx.moveTo(x1 - c, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + c);
  ctx.moveTo(x1, y1 - c); ctx.lineTo(x1, y1); ctx.lineTo(x1 - c, y1);
  ctx.moveTo(x0 + c, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - c);
  ctx.stroke();

  // lock reticle (growing circle) while locking
  if (info.locking && !info.locked) {
    const lr = s + 30 - info.lockProg * 26;
    ctx.globalAlpha = 0.85;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(box.x, box.y, lr, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  // label
  ctx.globalAlpha = 1;
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = col;
  ctx.textAlign = 'left';
  const lx = box.x + s + 6, ly = box.y - s;
  ctx.fillText(info.name, lx, ly + 2);
  ctx.fillText(`${Math.round(info.dist)}m`, lx, ly + 15);
  ctx.fillText(info.locked ? 'LOCKED' : (info.locking ? 'LOCK…' : 'TARGET'), lx, ly + 28);
  // small health bars under label
  bar(ctx, lx, ly + 34, 46, 4, info.shield, CYAN);
  bar(ctx, lx, ly + 41, 46, 4, info.hull, AMBER);
  ctx.restore();
}
function bar(ctx, x, y, w, h, frac, col) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

// Off-screen direction arrow pointing to target/enemy. ang in screen radians from center.
export function drawEdgeArrow(ctx, W, H, ang, col, label) {
  const cx = W / 2, cy = H * 0.5;
  const rx = W * 0.40, ry = H * 0.30;
  const x = cx + Math.cos(ang) * rx;
  const y = cy + Math.sin(ang) * ry;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = col; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (label) {
    ctx.save(); ctx.fillStyle = col; ctx.font = '9px "Courier New",monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 12); ctx.restore();
  }
}

// Shield/hull panel (front + rear shield arcs + hull bar). Bottom-left dashboard.
export function drawShields(ctx, W, H, front, rear, hull) {
  const bx = W * 0.075, by = H * 0.845, R = H * 0.058;
  ctx.save();
  ctx.font = '10px "Courier New",monospace';
  ctx.textAlign = 'center';
  // ship icon with shield arcs (front = top, rear = bottom)
  const cx = bx + R, cy = by + R;
  // hull core
  ctx.fillStyle = hull > 0.3 ? '#2a3a55' : '#552030';
  ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.42, R * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7fb0e0'; ctx.lineWidth = 1; ctx.stroke();
  // front arc (top)
  arc(ctx, cx, cy, R, -Math.PI * 0.85, -Math.PI * 0.15, front, CYAN);
  // rear arc (bottom)
  arc(ctx, cx, cy, R, Math.PI * 0.15, Math.PI * 0.85, rear, '#4d88ff');
  ctx.fillStyle = '#9fc4e8';
  ctx.fillText('FORE', cx, cy - R - 6);
  ctx.fillText('AFT', cx, cy + R + 12);
  // hull bar
  const hbx = cx + R + 10, hby = cy - 22;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fc4e8'; ctx.fillText('HULL', hbx, hby - 3);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(hbx, hby, 70, 10);
  ctx.fillStyle = hull > 0.5 ? GREEN : (hull > 0.25 ? AMBER : RED);
  ctx.fillRect(hbx, hby, 70 * Math.max(0, hull), 10);
  ctx.strokeStyle = '#456'; ctx.strokeRect(hbx, hby, 70, 10);
  ctx.fillStyle = '#9fc4e8'; ctx.font = '9px "Courier New",monospace';
  ctx.fillText(`${Math.round(hull * 100)}%`, hbx + 74, hby + 9);
  ctx.restore();
}
function arc(ctx, cx, cy, r, a0, a1, frac, col) {
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  frac = Math.max(0, Math.min(1, frac));
  if (frac > 0) {
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + (a1 - a0) * frac); ctx.stroke();
  }
}

// Throttle + afterburner gauges. Bottom-right dashboard.
export function drawThrottle(ctx, W, H, throttle, abFuel, ab, speed) {
  const bx = W * 0.80, by = H * 0.80, w = W * 0.13, h = H * 0.014;
  ctx.save();
  ctx.font = '10px "Courier New",monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fc4e8';
  ctx.fillText('THROTTLE', bx, by - 4);
  gauge(ctx, bx, by, w, h, throttle, throttle > 0.98 ? AMBER : CYAN);
  ctx.fillStyle = '#9fc4e8';
  ctx.fillText('AB FUEL', bx, by + 22);
  gauge(ctx, bx, by + 26, w, h, abFuel, ab ? RED : '#5db8ff');
  ctx.fillStyle = '#9fc4e8';
  ctx.fillText(`SPD ${Math.round(speed)}`, bx, by + 50);
  if (ab) { ctx.fillStyle = RED; ctx.fillText('AFTERBURN', bx + 70, by + 50); }
  ctx.restore();
}
function gauge(ctx, x, y, w, h, frac, col) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = '#456'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
}

// Radar: circular scope centered bottom. blips: [{x,y,front,enemy}] with x,y in -1..1 (top-down),
// front boolean = in front hemisphere.
export function drawRadar(ctx, W, H, blips) {
  const cx = W / 2, cy = H * 0.885, R = H * 0.085;
  ctx.save();
  ctx.fillStyle = 'rgba(6,16,28,0.85)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2f6fa0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // rings + cross
  ctx.strokeStyle = 'rgba(80,160,220,0.35)';
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
  // player marker
  ctx.fillStyle = GREEN;
  ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx - 3, cy + 3); ctx.lineTo(cx + 3, cy + 3); ctx.closePath(); ctx.fill();
  // blips
  for (const b of blips) {
    const px = cx + b.x * R * 0.92;
    const py = cy - b.y * R * 0.92; // radar forward = up
    ctx.fillStyle = b.target ? '#ffe14d' : (b.front ? RED : '#ff9a9a');
    const s = b.front ? 3 : 2.2;
    ctx.fillRect(px - s / 2, py - s / 2, s, s);
  }
  ctx.fillStyle = '#6fb0e0'; ctx.font = '9px "Courier New",monospace'; ctx.textAlign = 'center';
  ctx.fillText('SCANNER', cx, cy + R + 11);
  ctx.restore();
}

// Top status bar: wave, kills, weapon, missiles.
export function drawTopBar(ctx, W, H, g) {
  ctx.save();
  ctx.font = 'bold 13px "Courier New",monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = AMBER;
  ctx.fillText(`WING COMMOORE`, W * 0.065, H * 0.038);
  ctx.textAlign = 'center';
  ctx.fillStyle = CYAN;
  ctx.fillText(`WAVE ${g.wave}/${g.totalWaves}   ENEMIES ${g.enemiesLeft}`, W / 2, H * 0.038);
  ctx.textAlign = 'right';
  ctx.fillStyle = GREEN;
  ctx.fillText(`KILLS ${g.kills}`, W * 0.935, H * 0.038);
  // weapon/missile readout bottom-left corner
  ctx.textAlign = 'left';
  ctx.font = '11px "Courier New",monospace';
  ctx.fillStyle = '#9fc4e8';
  const wy = H * 0.965;
  ctx.fillText(`LASERS`, W * 0.30, wy - 12);
  // gun energy bar
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(W * 0.30, wy - 8, 90, 7);
  ctx.fillStyle = g.gunHeat > 0.85 ? RED : '#ffd24d';
  ctx.fillRect(W * 0.30, wy - 8, 90 * (1 - g.gunHeat), 7);
  ctx.fillStyle = g.missiles > 0 ? '#ff9a3a' : '#775';
  ctx.fillText(`MSL x${g.missiles}`, W * 0.30, wy + 6);
  ctx.restore();
}

export function drawMessage(ctx, W, H, text, sub, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = AMBER;
  ctx.font = 'bold 34px "Courier New",monospace';
  ctx.fillText(text, W / 2, H * 0.40);
  if (sub) {
    ctx.fillStyle = CYAN;
    ctx.font = '15px "Courier New",monospace';
    ctx.fillText(sub, W / 2, H * 0.46);
  }
  ctx.restore();
}
