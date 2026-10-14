// entities.js — bikes, riders, and track painting, Excitebike-style. No assets.
import { W, H, HUD_H, LANES, laneBaseY, heightAt } from './track.js';

const BAND = 26;           // vertical depth of one lane strip
const SKY_Y = HUD_H;
const TRACK_TOP = laneBaseY(0);

// backdrop: bright sky, a stand of crowd, billboard wall
export function drawBackdrop(ctx, camX, time) {
  ctx.fillStyle = '#7cc4ec'; ctx.fillRect(0, SKY_Y, W, TRACK_TOP - SKY_Y);
  // distant hills
  ctx.fillStyle = '#9fd08a';
  const hs = Math.floor(camX * 0.15);
  for (let x = -40; x < W + 40; x += 80) {
    const bx = x - (hs % 80);
    ctx.beginPath(); ctx.moveTo(bx, TRACK_TOP - 18); ctx.lineTo(bx + 40, TRACK_TOP - 40);
    ctx.lineTo(bx + 80, TRACK_TOP - 18); ctx.closePath(); ctx.fill();
  }
  // grandstand
  ctx.fillStyle = '#5a4a62'; ctx.fillRect(0, TRACK_TOP - 20, W, 14);
  const cs = Math.floor(camX * 0.4);
  for (let x = -8; x < W + 8; x += 4) {
    const n = Math.abs((x + cs) * 2654435761 % 97);
    ctx.fillStyle = ['#e8c8a0', '#f0e0c0', '#d09060', '#d85858', '#5890d8', '#f0f060'][n % 6];
    ctx.fillRect(x - (cs % 4), TRACK_TOP - 18 + (n % 3) * 4, 2, 2);
  }
  // barrier wall + red billboard stripe
  ctx.fillStyle = '#e4e4ec'; ctx.fillRect(0, TRACK_TOP - 6, W, 6);
  ctx.fillStyle = '#d84444';
  const bs = Math.floor(camX * 0.9) % 56;
  for (let x = -56; x < W + 56; x += 56) ctx.fillRect(x - bs, TRACK_TOP - 5, 30, 4);
  ctx.fillStyle = '#3a3a44'; ctx.fillRect(0, TRACK_TOP, W, 1);
}

// base + alternating tints keep the four lanes readable as distinct strips
const LANE_FILL = ['#c2a86e', '#b89e64', '#c2a86e', '#b89e64'];
const LANE_TOP  = ['#dcc896', '#d4c08c', '#dcc896', '#d4c08c'];
const RAMP_FILL = '#e6d6a6', RAMP_EDGE = '#6a5428', RAMP_LIT = '#f4e8c4';

function obstaclePath(ctx, o, sx, baseY) {
  const h = o.h;
  if (o.type === 'ramp') {
    const riseW = o.w - 6;
    ctx.moveTo(sx, baseY);
    ctx.lineTo(sx + riseW, baseY - h);
    ctx.lineTo(sx + riseW, baseY);
  } else if (o.type === 'table') {
    ctx.moveTo(sx, baseY);
    ctx.lineTo(sx + 20, baseY - h);
    ctx.lineTo(sx + o.w - 20, baseY - h);
    ctx.lineTo(sx + o.w, baseY);
  } else if (o.type === 'bump') {
    ctx.moveTo(sx, baseY);
    ctx.lineTo(sx + o.w / 2, baseY - h);
    ctx.lineTo(sx + o.w, baseY);
  }
}

export function drawLane(ctx, track, lane, camX, time) {
  const baseY = laneBaseY(lane);

  // flat lane strip
  ctx.fillStyle = LANE_FILL[lane];
  ctx.fillRect(0, baseY, W, BAND);
  // lit riding surface
  ctx.fillStyle = LANE_TOP[lane];
  ctx.fillRect(0, baseY, W, 3);
  // scrolling lane dashes down the middle of the strip
  ctx.fillStyle = 'rgba(245,235,205,0.5)';
  const ds = Math.floor(camX) % 32;
  for (let x = -32; x < W + 32; x += 32) ctx.fillRect(x - ds, baseY + BAND / 2, 12, 2);
  // darker divider at the bottom of the strip
  ctx.fillStyle = '#6a5228'; ctx.fillRect(0, baseY + BAND - 1, W, 2);

  // obstacles as crisp shapes sitting on the strip
  for (const o of track.lanes[lane]) {
    const sx = o.x - camX;
    if (sx + o.w < -24 || sx > W + 24) continue;
    if (o.type === 'ramp' || o.type === 'table' || o.type === 'bump') {
      ctx.beginPath(); obstaclePath(ctx, o, sx, baseY); ctx.closePath();
      ctx.fillStyle = RAMP_FILL; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = RAMP_EDGE; ctx.stroke();
      if (o.type === 'ramp') {
        const riseW = o.w - 6;
        ctx.strokeStyle = RAMP_LIT; ctx.beginPath();
        ctx.moveTo(sx, baseY); ctx.lineTo(sx + riseW, baseY - o.h); ctx.stroke();
        ctx.fillStyle = '#5a4824'; ctx.fillRect(sx + riseW - 1, baseY - o.h, 2, o.h); // jump face
      }
    } else if (o.type === 'whoop') {
      const n = Math.round(o.w / 24);
      for (let k = 0; k < n; k++) {
        const wx = sx + k * 24;
        ctx.beginPath();
        ctx.moveTo(wx, baseY); ctx.lineTo(wx + 12, baseY - o.h); ctx.lineTo(wx + 24, baseY);
        ctx.closePath();
        ctx.fillStyle = RAMP_FILL; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = RAMP_EDGE; ctx.stroke();
      }
    } else if (o.type === 'mud') {
      ctx.fillStyle = '#4a3016'; ctx.fillRect(sx, baseY + 1, o.w, BAND - 3);
      ctx.fillStyle = '#5c3e1e';
      for (let k = 0; k < o.w; k += 11) ctx.fillRect(sx + 3 + k, baseY + 3 + (k % 2) * 4, 7, 3);
      ctx.fillStyle = '#39240f'; ctx.fillRect(sx, baseY + 1, o.w, 2);
    } else if (o.type === 'cool') {
      ctx.fillStyle = '#14616f'; ctx.fillRect(sx, baseY + 1, o.w, BAND - 3);
      const on = Math.floor(time * 5) % 2 === 0;
      ctx.fillStyle = on ? '#5ce8f8' : '#2fa8c0';
      for (let c = 0; c * 9 < o.w - 6; c++) {
        const cx = sx + 4 + c * 9;
        ctx.beginPath();
        ctx.moveTo(cx, baseY + 4); ctx.lineTo(cx + 5, baseY + BAND / 2);
        ctx.lineTo(cx, baseY + BAND - 5); ctx.lineTo(cx + 2, baseY + BAND - 5);
        ctx.lineTo(cx + 7, baseY + BAND / 2); ctx.lineTo(cx + 2, baseY + 4);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  // finish line: checkered pylons + a strip across the lane
  const fx = track.len - camX;
  if (fx > -30 && fx < W + 30) {
    for (let cy = 0; cy < Math.ceil(BAND / 5); cy++) for (let cxk = 0; cxk < 2; cxk++) {
      ctx.fillStyle = (cy + cxk) % 2 ? '#1a1a1a' : '#f0f0f0';
      ctx.fillRect(fx + cxk * 4, baseY + cy * 5, 4, 5);
    }
    ctx.fillStyle = '#e0e0e0'; ctx.fillRect(fx - 1, baseY - 24, 2, 24);
  }
}

// a bike + rider, Excitebike proportions. (x,y) = wheel-contact midpoint.
// The bike body is white; `color` tints the rider's jersey (palette-swapped racers).
export function drawBike(ctx, x, y, pitch, color, opts = {}) {
  const { frame = 0, turbo = false, crashed = false, stalled = false, flash = false } = opts;
  if (flash && Math.floor(performance.now() / 90) % 2) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  if (crashed) {
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-13, -5, 11, 5); ctx.fillRect(4, -5, 11, 5);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-12, -3, 5, 0, 7); ctx.arc(13, -3, 5, 0, 7); ctx.fill();
    const tum = Math.floor(frame * 6) % 2;
    ctx.fillStyle = color; ctx.fillRect(14, -11 + tum * 3, 7, 6);
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(16, -16 + tum * 2, 6, 5);
    ctx.restore();
    return;
  }

  ctx.rotate(-pitch);

  // wheels (big, black with a hub)
  ctx.fillStyle = '#17171a';
  ctx.beginPath(); ctx.arc(-11, -6, 6, 0, 7); ctx.arc(11, -6, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#8a8a92';
  ctx.beginPath(); ctx.arc(-11, -6, 2, 0, 7); ctx.arc(11, -6, 2, 0, 7); ctx.fill();

  // exhaust flame behind when turbocharging
  if (turbo) {
    ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.random() * 70)},50,0.85)`;
    ctx.fillRect(-20 - Math.random() * 5, -9, 7, 4);
    ctx.fillStyle = 'rgba(255,230,120,0.8)';
    ctx.fillRect(-16, -9, 4, 4);
  }

  // white bike body: belly pan, seat, fork, bars
  ctx.fillStyle = '#f2f2f6';
  ctx.fillRect(-11, -11, 22, 5);          // main frame/tank
  ctx.fillRect(-12, -8, 7, 3);            // rear guard
  ctx.fillRect(6, -15, 5, 5);             // front fork/number plate
  ctx.fillStyle = '#c0c0cc';
  ctx.fillRect(-11, -7, 22, 2);           // shadow under frame
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(10, -18, 2, 5);            // handlebar
  ctx.fillRect(-10, -14, 4, 4);           // seat hump

  // rider: jersey (color), arm to bars, bent leg, helmet
  ctx.fillStyle = color;
  ctx.fillRect(-5, -20, 9, 8);            // torso leaning forward
  ctx.fillStyle = '#20202a';
  ctx.fillRect(-4, -12, 5, 5);            // upper leg
  ctx.fillRect(-1, -9, 5, 3);             // shin toward peg
  ctx.fillStyle = color;
  ctx.fillRect(3, -17, 7, 3);             // arm reaching to bars
  // helmet (white shell, color stripe, cyan visor)
  ctx.fillStyle = '#f0f0f4'; ctx.fillRect(0, -26, 9, 7);
  ctx.fillStyle = color; ctx.fillRect(0, -26, 9, 2);
  ctx.fillStyle = '#3ad0e8'; ctx.fillRect(6, -23, 3, 3);

  if (stalled && Math.floor(frame * 8) % 2) {
    ctx.fillStyle = 'rgba(140,140,140,0.75)';
    ctx.fillRect(-6, -24, 7, 6); ctx.fillRect(-10, -28, 6, 5);
  }
  ctx.restore();
}
