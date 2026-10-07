// entities.js — bikes, riders, and track painting. No image assets.
import { W, H, HUD_H, LANES, laneBaseY, heightAt } from './track.js';

// backdrop: sky, crowd, wall — then the four dirt lanes
export function drawBackdrop(ctx, camX, time) {
  ctx.fillStyle = '#78c0e8'; ctx.fillRect(0, HUD_H, W, 18);
  // crowd: stippled heads scrolling slowly (parallax)
  ctx.fillStyle = '#4a3a52'; ctx.fillRect(0, HUD_H + 18, W, 22);
  const cs = Math.floor(camX * 0.3);
  for (let x = -8; x < W + 8; x += 4) {
    const n = (x + cs) * 2654435761 % 97;
    ctx.fillStyle = ['#d8a878', '#e8d8b0', '#b87848', '#c84848', '#4878c8', '#e8e850'][n % 6];
    ctx.fillRect(x - (cs % 4), HUD_H + 20 + (n % 4) * 4, 2, 2);
  }
  // wall + billboard stripe
  ctx.fillStyle = '#d8d8e0'; ctx.fillRect(0, HUD_H + 40, W, 10);
  ctx.fillStyle = '#c83a3a';
  const bs = Math.floor(camX) % 64;
  for (let x = -64; x < W + 64; x += 64) ctx.fillRect(x - bs, HUD_H + 42, 32, 6);
  ctx.fillStyle = '#2a2a34'; ctx.fillRect(0, HUD_H + 50, W, 2);
}

const LANE_COLORS = ['#c09048', '#b08240', '#a07438', '#906830'];

// one lane's dirt silhouette, its patches, and the finish banner
export function drawLane(ctx, track, lane, camX, time) {
  const baseY = laneBaseY(lane);
  ctx.fillStyle = LANE_COLORS[lane];
  ctx.beginPath();
  ctx.moveTo(-10, baseY + 34);
  for (let sx = -8; sx <= W + 8; sx += 6) {
    ctx.lineTo(sx, baseY - heightAt(track, lane, camX + sx));
  }
  ctx.lineTo(W + 10, baseY + 34);
  ctx.closePath();
  ctx.fill();
  // ground line shading
  ctx.strokeStyle = 'rgba(60,35,10,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let sx = -8; sx <= W + 8; sx += 6) {
    const y = baseY - heightAt(track, lane, camX + sx);
    sx === -8 ? ctx.moveTo(sx, y) : ctx.lineTo(sx, y);
  }
  ctx.stroke();

  // patches: mud (dark), cool pads (cyan chevrons)
  for (const o of track.lanes[lane]) {
    const sx = o.x - camX;
    if (sx + o.w < -20 || sx > W + 20) continue;
    if (o.type === 'mud') {
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(sx, baseY - 3, o.w, 6);
      ctx.fillStyle = '#4a2e16';
      ctx.fillRect(sx + 6, baseY - 1, 10, 3); ctx.fillRect(sx + 28, baseY - 2, 12, 3);
    } else if (o.type === 'cool') {
      ctx.fillStyle = '#1a6a7a'; ctx.fillRect(sx, baseY - 2, o.w, 5);
      const on = Math.floor(time * 4) % 2 === 0;
      ctx.fillStyle = on ? '#58e8f8' : '#2898b0';
      for (let c = 0; c < 3; c++) {
        const cx = sx + 5 + c * 8;
        ctx.fillRect(cx, baseY - 1, 3, 3); ctx.fillRect(cx + 3, baseY - 2, 2, 2); // chevron >
      }
    }
  }

  // finish line: checkered post pair + banner across this lane
  const fx = track.len - camX;
  if (fx > -30 && fx < W + 30) {
    for (let cy = 0; cy < 3; cy++) for (let cxk = 0; cxk < 2; cxk++) {
      ctx.fillStyle = (cy + cxk) % 2 ? '#111' : '#f0f0f0';
      ctx.fillRect(fx + cxk * 4, baseY - 26 + cy * 6, 4, 6);
    }
    ctx.fillStyle = '#111'; ctx.fillRect(fx, baseY - 8, 3, 8);
  }
}

// a bike + rider; (x,y) is the wheel-contact midpoint, pitch in radians (nose-up positive)
export function drawBike(ctx, x, y, pitch, color, opts = {}) {
  const { frame = 0, turbo = false, crashed = false, stalled = false, flash = false } = opts;
  if (flash && Math.floor(performance.now() / 90) % 2) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (crashed) {
    // bike flat on its side, rider tumbling ahead
    ctx.fillStyle = '#222'; ctx.fillRect(-12, -4, 9, 4); ctx.fillRect(5, -4, 9, 4);
    ctx.fillStyle = color; ctx.fillRect(-6, -5, 12, 3);
    const tum = Math.floor(frame * 6) % 2;
    ctx.fillStyle = '#e8b070'; ctx.fillRect(16, -10 + tum * 2, 5, 5);
    ctx.fillStyle = '#d0d0d8'; ctx.fillRect(14, -5 + tum, 9, 4);
    ctx.restore();
    return;
  }
  ctx.rotate(-pitch);
  // wheels
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(-9, -4, 5, 0, Math.PI * 2); ctx.arc(9, -4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#777';
  ctx.fillRect(-10, -5, 3, 3); ctx.fillRect(8, -5, 3, 3);
  // frame
  ctx.fillStyle = color;
  ctx.fillRect(-7, -10, 14, 4);
  ctx.fillRect(4, -13, 5, 4);            // tank/bars riser
  ctx.fillStyle = '#333'; ctx.fillRect(8, -16, 2, 5); // handlebar
  // exhaust puff
  if (turbo) {
    ctx.fillStyle = `rgba(255,${160 + Math.floor(Math.random() * 60)},60,0.8)`;
    ctx.fillRect(-16 - Math.random() * 4, -9, 5, 4);
  }
  if (stalled && Math.floor(frame * 8) % 2) {
    ctx.fillStyle = 'rgba(120,120,120,0.7)'; ctx.fillRect(-4, -22, 6, 5);
  }
  // rider: legs, torso leaning forward, helmet
  ctx.fillStyle = '#d0d0d8';
  ctx.fillRect(-3, -15, 5, 6);            // leg
  ctx.fillRect(-4, -21, 7, 7);            // torso
  ctx.fillStyle = '#e8b070'; ctx.fillRect(3, -20, 4, 3); // arm to bars
  ctx.fillStyle = color === '#e03838' ? '#f0f0f0' : '#e03838';
  ctx.fillRect(-3, -26, 7, 6);            // helmet
  ctx.fillStyle = '#48d8e8'; ctx.fillRect(2, -24, 2, 3); // visor
  ctx.restore();
}
