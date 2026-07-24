// stage.js — procedural side-view dojo/temple stage with parallax + crowd.
import { FLOOR_Y, STAGE_W, VIEW_W, VIEW_H } from './fighter.js';

// pre-generate crowd + lantern positions deterministically
const crowd = [];
for (let i = 0; i < 46; i++) {
  crowd.push({
    x: (i * 41 + (i % 3) * 13) % STAGE_W,
    r: 10 + (i % 4) * 2,
    hue: [ '#2a3550', '#39304e', '#4a2f3a', '#243a44', '#3a3a2a' ][i % 5],
    bob: (i % 7) * 0.9,
    sp: 0.05 + (i % 5) * 0.01,
  });
}
const lanterns = [];
for (let i = 0; i < 8; i++) lanterns.push({ x: 70 + i * 118, y: 30 + (i % 2) * 16 });

export function drawStage(ctx, cam, t) {
  // ---- sky ----
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  g.addColorStop(0, '#f4a15a');
  g.addColorStop(0.4, '#e8794f');
  g.addColorStop(0.75, '#8e4a63');
  g.addColorStop(1, '#3f2f57');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, FLOOR_Y + 4);

  // ---- sun ----
  const sunX = 200 - cam * 0.15;
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  ctx.beginPath(); ctx.arc(sunX, 120, 44, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(sunX, 120, 60, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // ---- far mountains (parallax 0.25) ----
  const p1 = -cam * 0.25;
  ctx.fillStyle = '#5b3a5e';
  drawRidge(ctx, p1, 210, 70, 320, 0.6);
  ctx.fillStyle = '#4a2f52';
  drawRidge(ctx, p1 * 1.3 + 90, 232, 54, 260, 1.3);

  // ---- mid: temple silhouette (parallax 0.5) ----
  const p2 = -cam * 0.5;
  drawTemple(ctx, 250 + p2, 150);
  drawTemple(ctx, 700 + p2, 168, 0.8);

  // ---- lanterns hanging (parallax 0.5) ----
  for (const l of lanterns) {
    const lx = l.x + p2 * 0.9;
    if (lx < -30 || lx > VIEW_W + 30) continue;
    const sway = Math.sin(t * 0.03 + l.x) * 4;
    ctx.strokeStyle = '#2a1a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sway, l.y); ctx.stroke();
    ctx.fillStyle = '#e34b3a';
    roundRectS(ctx, lx + sway - 8, l.y, 16, 22, 6);
    ctx.fillStyle = 'rgba(255,220,140,0.85)';
    ctx.fillRect(lx + sway - 4, l.y + 4, 8, 14);
  }

  // ---- crowd stands (parallax 0.65) ----
  const p3 = -cam * 0.65;
  ctx.fillStyle = '#241d33';
  ctx.fillRect(0, FLOOR_Y - 96, VIEW_W, 60);
  for (const c of crowd) {
    let sx = (c.x + p3) % STAGE_W;
    if (sx < -20) sx += STAGE_W;
    if (sx > VIEW_W + 20) continue;
    const bob = Math.sin(t * c.sp + c.bob) * 3;
    ctx.fillStyle = c.hue;
    ctx.beginPath();
    ctx.arc(sx, FLOOR_Y - 62 + bob, c.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx - c.r * 0.6, FLOOR_Y - 62 + bob, c.r * 1.2, 26);
  }

  // ---- banner ----
  ctx.fillStyle = 'rgba(20,14,26,0.85)';
  ctx.fillRect(0, FLOOR_Y - 100, VIEW_W, 8);

  // ---- floor ----
  const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, VIEW_H);
  fg.addColorStop(0, '#7a5636');
  fg.addColorStop(0.15, '#6a4a2e');
  fg.addColorStop(1, '#3d2a18');
  ctx.fillStyle = fg;
  ctx.fillRect(0, FLOOR_Y, VIEW_W, VIEW_H - FLOOR_Y);
  // floor edge highlight
  ctx.fillStyle = '#9c7a4e';
  ctx.fillRect(0, FLOOR_Y, VIEW_W, 4);
  // floor planks (scroll with camera at full speed)
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  const plankW = 64;
  const off = -(cam % plankW);
  for (let x = off; x < VIEW_W; x += plankW) {
    ctx.beginPath(); ctx.moveTo(x, FLOOR_Y + 4); ctx.lineTo(x, VIEW_H); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let y = FLOOR_Y + 20; y < VIEW_H; y += 18) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke();
  }
}

function drawRidge(ctx, off, baseY, h, span, freq) {
  ctx.beginPath();
  ctx.moveTo(-50, FLOOR_Y);
  for (let x = -50; x <= VIEW_W + 50; x += 20) {
    const y = baseY - Math.abs(Math.sin((x - off) / span * Math.PI * freq)) * h;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW_W + 50, FLOOR_Y);
  ctx.closePath();
  ctx.fill();
}

function drawTemple(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#3b2036';
  // base
  ctx.fillRect(-60, 0, 120, FLOOR_Y - y - 96);
  // pillars
  ctx.fillStyle = '#4a2942';
  for (let i = -2; i <= 2; i++) ctx.fillRect(i * 24 - 4, 0, 8, FLOOR_Y - y - 96);
  // roofs (pagoda)
  ctx.fillStyle = '#28313f';
  for (let r = 0; r < 3; r++) {
    const ry = -18 - r * 26;
    const rw = 84 - r * 18;
    ctx.beginPath();
    ctx.moveTo(-rw, ry + 18);
    ctx.lineTo(0, ry - 8);
    ctx.lineTo(rw, ry + 18);
    ctx.quadraticCurveTo(rw + 6, ry + 20, rw - 6, ry + 24);
    ctx.lineTo(-rw + 6, ry + 24);
    ctx.quadraticCurveTo(-rw - 6, ry + 20, -rw, ry + 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function roundRectS(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
