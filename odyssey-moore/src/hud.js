// hud.js — shared voyage HUD (crew, hull, hero HP, favor, glory) + toasts.
import { PAL, text, textShadow, font } from './gfx.js';
import { clamp } from './util.js';

function bar(ctx, x, y, w, h, frac, color, label, val) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, (w - 2) * clamp(frac, 0, 1), h - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  text(ctx, label, x + 4, y + h - 3, h - 5, '#0d0d14', 'left');
  text(ctx, val, x + w - 4, y + h - 3, h - 5, '#0d0d14', 'right');
}

export function drawHUD(ctx, W, H, st) {
  ctx.save();
  const pad = 8, bw = 128, bh = 15, gap = 4;
  // top-left cluster
  bar(ctx, pad, pad, bw, bh, st.hp / st.hpMax, PAL.hp, 'ODYSSEUS', Math.ceil(st.hp));
  bar(ctx, pad, pad + (bh + gap), bw, bh, st.crew / st.crewMax, PAL.crew, 'CREW', Math.ceil(st.crew));
  bar(ctx, pad, pad + (bh + gap) * 2, bw, bh, st.hull / st.hullMax, PAL.hull, 'HULL', Math.ceil(st.hull));
  bar(ctx, pad, pad + (bh + gap) * 3, bw, bh, st.favor / st.favorMax, PAL.favor, 'FAVOR', Math.ceil(st.favor));
  // glory top-right
  textShadow(ctx, 'GLORY ' + st.glory, W - pad, pad + 14, 16, PAL.glory, 'right');
  ctx.restore();
}

// transient centered banner text; returns nothing
export function drawToast(ctx, W, H, msg, alpha) {
  if (!msg || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1);
  font(ctx, 22, 'bold'); ctx.textAlign = 'center';
  const w = ctx.measureText(msg).width + 40;
  ctx.fillStyle = 'rgba(20,15,30,0.8)'; ctx.fillRect(W / 2 - w / 2, H * 0.16, w, 38);
  ctx.strokeStyle = PAL.bronze; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - w / 2, H * 0.16, w, 38);
  textShadow(ctx, msg, W / 2, H * 0.16 + 26, 20, PAL.gold, 'center');
  ctx.restore();
}
