// sprites.js — HUD icon drawing helpers (stars, cash, health, vehicle badge)
// on the crisp display canvas. BROWSER-ONLY (canvas 2D).

export function drawStar(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) { ctx.fillStyle = '#ffd23a'; ctx.fill(); ctx.strokeStyle = '#7a5b00'; ctx.lineWidth = 1.2; ctx.stroke(); }
  else { ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.2; ctx.stroke(); }
}

export function drawStars(ctx, x, y, n, max = 5) {
  for (let i = 0; i < max; i++) drawStar(ctx, x + i * 22, y, 9, i < n);
}
