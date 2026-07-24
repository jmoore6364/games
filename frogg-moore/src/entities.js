// entities.js — moving objects (vehicles, logs, turtles) + procedural sprite drawing.
// Everything is drawn with canvas primitives in a chunky retro pixel style.

export const TILE = 40;

// ---- helpers -------------------------------------------------------------
function px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

// A moving actor that scrolls horizontally and wraps around the field.
export class Mover {
  constructor(kind, lane, x, tiles, speed, worldW) {
    this.kind = kind;       // 'car','truck','fastcar','bulldozer','log','turtle'
    this.lane = lane;       // playfield row index
    this.x = x;             // left px
    this.w = tiles * TILE;  // width px
    this.speed = speed;     // px/sec (sign = direction)
    this.worldW = worldW;
    this.tiles = tiles;
    // turtle diving cycle
    this.diver = false;
    this.diveT = Math.random() * 4;
    this.submerged = false;
  }
  y(top) { return top + this.lane * TILE; }
  update(dt) {
    this.x += this.speed * dt;
    const span = this.worldW + this.w + TILE * 2;
    if (this.speed > 0 && this.x > this.worldW + TILE) this.x -= span;
    if (this.speed < 0 && this.x < -this.w - TILE) this.x += span;
    if (this.diver) {
      this.diveT += dt;
      // 5.2s cycle: submerged for ~1.4s
      const t = this.diveT % 5.2;
      this.submerged = t > 3.8;
    }
  }
  rect(top) { return { x: this.x, y: this.y(top), w: this.w, h: TILE }; }
}

// ---- vehicle sprites -----------------------------------------------------
export function drawVehicle(ctx, m, top) {
  const y = m.y(top), x = m.x, w = m.w, h = TILE;
  const dir = m.speed >= 0 ? 1 : -1;
  const bodyPad = 5;
  const by = y + bodyPad, bh = h - bodyPad * 2;
  if (m.kind === 'truck' || m.kind === 'bulldozer') {
    const cab = m.kind === 'bulldozer' ? '#f6c945' : '#d8dbe0';
    const trailer = m.kind === 'bulldozer' ? '#e2a80f' : '#8b5a2b';
    // trailer
    px(ctx, x + 3, by, w - TILE - 2, bh, trailer);
    px(ctx, x + 3, by, w - TILE - 2, 4, 'rgba(255,255,255,0.18)');
    // cab at leading edge
    const cx = dir > 0 ? x + w - TILE + 2 : x + 2;
    px(ctx, cx, by, TILE - 6, bh, cab);
    px(ctx, cx + (dir > 0 ? 4 : TILE - 18), by + 5, 12, 9, '#2a3d63'); // window
    // wheels
    px(ctx, x + 6, y + h - 6, 8, 5, '#111');
    px(ctx, x + w - 16, y + h - 6, 8, 5, '#111');
    px(ctx, x + w * 0.5 - 4, y + h - 6, 8, 5, '#111');
  } else {
    let col = '#39d0e6', top2 = '#7fe9f6';
    if (m.kind === 'fastcar') { col = '#ec4b5a'; top2 = '#ff8f9a'; }
    if (m.kind === 'car') { col = '#f0d24a'; top2 = '#fff0a0'; }
    // body
    px(ctx, x + 4, by, w - 8, bh, col);
    // roof
    px(ctx, x + w * 0.30, by - 3, w * 0.42, 8, top2);
    // windshield
    const wx = dir > 0 ? x + w * 0.58 : x + w * 0.30;
    px(ctx, wx, by + 3, w * 0.16, 8, '#22314f');
    // headlight
    const hx = dir > 0 ? x + w - 7 : x + 3;
    px(ctx, hx, by + bh * 0.4, 4, 5, '#fff7c0');
    // wheels
    px(ctx, x + 8, y + h - 6, 9, 5, '#111');
    px(ctx, x + w - 17, y + h - 6, 9, 5, '#111');
  }
}

// ---- river platform sprites ---------------------------------------------
export function drawLog(ctx, m, top) {
  const y = m.y(top), x = m.x, w = m.w;
  const py = y + 6, ph = TILE - 12;
  px(ctx, x + 2, py, w - 4, ph, '#6e4a2a');
  px(ctx, x + 2, py, w - 4, 4, '#8a5f38');
  px(ctx, x + 2, py + ph - 3, w - 4, 3, '#4d3319');
  // bark rings on the ends
  px(ctx, x + 3, py, 6, ph, '#5a3b22');
  px(ctx, x + w - 9, py, 6, ph, '#5a3b22');
  px(ctx, x + 4, py + ph * 0.5 - 3, 4, 6, '#7a5535');
  // wood grain streaks
  for (let i = 1; i < m.tiles * 2; i++) {
    px(ctx, x + 10 + i * 16, py + 6, 8, 2, 'rgba(60,40,20,0.5)');
  }
}

export function drawTurtles(ctx, m, top) {
  const y = m.y(top);
  for (let i = 0; i < m.tiles; i++) {
    const cx = m.x + i * TILE + TILE / 2;
    const cy = y + TILE / 2 + 1;
    if (m.submerged) {
      // ripple only
      ctx.strokeStyle = 'rgba(180,230,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    const diving = m.diver && (m.diveT % 5.2) > 3.2; // about to dive: peek
    const shell = diving ? '#2f7d3a' : '#3fa14b';
    // shell
    ctx.fillStyle = shell;
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c7136';
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
    // shell plates
    px(ctx, cx - 3, cy - 3, 6, 6, '#57c065');
    px(ctx, cx - 9, cy - 1, 4, 3, '#57c065');
    px(ctx, cx + 5, cy - 1, 4, 3, '#57c065');
    // head
    px(ctx, cx - 3, cy - 15, 6, 5, '#3fa14b');
  }
}

// ---- frog ----------------------------------------------------------------
export function drawFrog(ctx, cx, cy, size, dir, squashT) {
  // dir: 0 up,1 right,2 down,3 left. squashT>0 during death squish
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dir * Math.PI / 2);
  let s = size / 2;
  if (squashT > 0) { ctx.scale(1 + squashT * 0.6, Math.max(0.15, 1 - squashT)); }
  const green = '#5ad24a', dk = '#2f8a2a', lite = '#8bf07a';
  // hind legs
  px(ctx, -s, s * 0.2, 6, 8, dk);
  px(ctx, s - 6, s * 0.2, 6, 8, dk);
  px(ctx, -s - 1, s * 0.55, 8, 5, green);
  px(ctx, s - 7, s * 0.55, 8, 5, green);
  // front legs
  px(ctx, -s + 2, -s * 0.8, 5, 7, dk);
  px(ctx, s - 7, -s * 0.8, 5, 7, dk);
  // body
  ctx.fillStyle = green;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, -4, -s * 0.4, 8, 10, lite);
  // eyes (up = leading edge)
  px(ctx, -s * 0.55, -s * 0.75, 7, 7, green);
  px(ctx, s * 0.55 - 7, -s * 0.75, 7, 7, green);
  px(ctx, -s * 0.5, -s * 0.72, 4, 4, '#0a0a0a');
  px(ctx, s * 0.5 - 4, -s * 0.72, 4, 4, '#0a0a0a');
  px(ctx, -s * 0.5, -s * 0.72, 2, 2, '#fff');
  px(ctx, s * 0.5 - 2, -s * 0.72, 2, 2, '#fff');
  ctx.restore();
}

// ---- fly / bonus insect --------------------------------------------------
export function drawFly(ctx, cx, cy, t) {
  const wob = Math.sin(t * 14) * 2;
  px(ctx, cx - 5, cy - 3 + wob, 10, 7, '#1a1a1a');
  // wings
  ctx.fillStyle = 'rgba(220,230,255,0.75)';
  ctx.beginPath(); ctx.ellipse(cx - 6, cy - 4 + wob, 5, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 6, cy - 4 + wob, 5, 3, 0.5, 0, Math.PI * 2); ctx.fill();
  px(ctx, cx - 4, cy - 1 + wob, 2, 2, '#c02020'); // eye
}
