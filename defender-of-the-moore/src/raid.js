// Defender of the Moore — RESCUE RAID, a light top-down stealth run.
// Steal through the keep, past patrolling guards, and reach Lady Rowena. Bump a
// guard and you lose a heart (X to shove one aside briefly). Reach her to win.

import * as S from './sprites.js';

const W = 320, H = 224;
const PLAY_TOP = 30, PLAY_BOT = 200;

export class Raid {
  // opts: { her, foe, foeSkill, title }
  constructor(opts) {
    this.her = opts.her; this.foe = opts.foe;
    this.foeSkill = opts.foeSkill ?? 0.5;
    this.title = opts.title || 'The Rescue';
    this.px = 24; this.py = 150;
    this.hearts = 3;
    this.maiden = { x: 296, y: 60 };
    this.done = false; this.win = false;
    this.phase = 'intro'; this.timer = 1.4;
    this.msg = 'Reach the lady — avoid the guards! X to shove.';
    this.flash = 0; this.invuln = 0; this.shoveCd = 0;
    // guards patrol vertical/horizontal lanes
    const sp = 40 + this.foeSkill * 34;
    this.guards = [
      { x: 120, y: 80, dx: 0, dy: sp, min: 46, max: 150, stun: 0 },
      { x: 200, y: 150, dx: 0, dy: -sp, min: 46, max: 160, stun: 0 },
      { x: 160, y: 60, dx: sp, dy: 0, min: 90, max: 250, stun: 0 },
    ];
    // simple wall blocks for flavour + light maze
    this.walls = [
      { x: 80, y: 30, w: 8, h: 90 },
      { x: 160, y: 110, w: 8, h: 90 },
      { x: 240, y: 30, w: 8, h: 96 },
    ];
  }

  update(dt, input, sound) {
    this.flash = Math.max(0, this.flash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.shoveCd = Math.max(0, this.shoveCd - dt);
    if (this.phase === 'intro') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) this.phase = 'run';
      return;
    }
    if (this.phase === 'over') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) this.done = true;
      return;
    }

    // move
    const sp = 78 * dt;
    let nx = this.px, ny = this.py;
    if (input.down('left')) nx -= sp;
    if (input.down('right')) nx += sp;
    if (input.down('up')) ny -= sp;
    if (input.down('down')) ny += sp;
    nx = Math.max(10, Math.min(W - 10, nx));
    ny = Math.max(PLAY_TOP + 6, Math.min(PLAY_BOT - 6, ny));
    if (!this._hitsWall(nx, this.py)) this.px = nx;
    if (!this._hitsWall(this.px, ny)) this.py = ny;
    if (sound && (input.down('left') || input.down('right') || input.down('up') || input.down('down')) && Math.random() < dt * 8) sound.step();

    // shove
    if (input.pressed('x') && this.shoveCd <= 0) {
      this.shoveCd = 1.2;
      for (const g of this.guards) if (Math.hypot(g.x - this.px, g.y - this.py) < 26) { g.stun = 1.2; if (sound) sound.hit(); }
    }

    // guards
    for (const g of this.guards) {
      if (g.stun > 0) { g.stun -= dt; continue; }
      g.x += g.dx * dt; g.y += g.dy * dt;
      if (g.dy) { if (g.y < g.min || g.y > g.max) g.dy *= -1; }
      if (g.dx) { if (g.x < g.min || g.x > g.max) g.dx *= -1; }
      // light homing when player is near their lane
      if (Math.abs(g.x - this.px) < 40 && Math.abs(g.y - this.py) < 40) {
        const a = Math.atan2(this.py - g.y, this.px - g.x);
        g.x += Math.cos(a) * this.foeSkill * 22 * dt;
        g.y += Math.sin(a) * this.foeSkill * 22 * dt;
      }
      if (this.invuln <= 0 && Math.hypot(g.x - this.px, g.y - this.py) < 14) {
        this.hearts--; this.invuln = 1.2; this.flash = 0.4;
        this.px = Math.max(12, this.px - 26);   // knocked back toward the entrance
        if (sound) sound.alarm();
        this.msg = this.hearts > 0 ? 'A guard spots you — back!' : '';
      }
    }

    if (Math.hypot(this.maiden.x - this.px, this.maiden.y - this.py) < 16) return this._end(true, 'You reach the lady and steal away into the night!', sound);
    if (this.hearts <= 0) return this._end(false, 'The guards seize you. The rescue has failed.', sound);
  }

  _hitsWall(x, y) {
    for (const wl of this.walls) if (x > wl.x - 8 && x < wl.x + wl.w + 8 && y > wl.y - 8 && y < wl.y + wl.h + 8) return true;
    return false;
  }

  _end(win, msg, sound) {
    this.win = win; this.msg = msg; this.phase = 'over'; this.timer = 1.8;
    if (sound) win ? sound.fanfare() : sound.dirge();
  }

  render(ctx, frame) {
    // dungeon floor
    ctx.fillStyle = '#241c2a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2e2636';
    for (let y = PLAY_TOP; y < PLAY_BOT; y += 20) for (let x = ((y / 20) % 2) * 20; x < W; x += 40) ctx.fillRect(x, y, 18, 18);
    // border walls
    ctx.fillStyle = S.PAL.stoneD; ctx.fillRect(0, PLAY_TOP - 8, W, 8); ctx.fillRect(0, PLAY_BOT, W, 8);
    ctx.fillStyle = S.PAL.stone; ctx.fillRect(0, PLAY_TOP - 8, W, 2);
    // inner walls
    for (const wl of this.walls) { ctx.fillStyle = S.PAL.stoneD; ctx.fillRect(wl.x, wl.y, wl.w, wl.h); ctx.fillStyle = S.PAL.stone; ctx.fillRect(wl.x, wl.y, wl.w, 2); }
    // entrance + exit markers
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(6, 140, 10, 22);
    // maiden in her cell (top-right), a soft torch glow
    ctx.fillStyle = 'rgba(230,180,120,0.25)'; ctx.beginPath(); ctx.arc(this.maiden.x, this.maiden.y, 26, 0, Math.PI * 2); ctx.fill();
    this._maiden(ctx, this.maiden.x, this.maiden.y, frame);
    // guards
    for (const g of this.guards) this._guard(ctx, g);
    // player (a cloaked figure)
    if (!(this.invuln > 0 && (frame % 6 < 3))) this._hero(ctx, this.px, this.py);

    // HUD hearts
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < this.hearts ? '#e04858' : '#40303a'; heart(ctx, 10 + i * 14, 12); }
    if (this.flash > 0) { ctx.fillStyle = `rgba(220,40,60,${this.flash})`; ctx.fillRect(0, 0, W, H); }
    banner(ctx, this.msg);
    if (this.phase === 'intro') centerTitle(ctx, this.title, 'Into the keep by night');
    if (this.phase === 'over') centerTitle(ctx, this.win ? 'RESCUED!' : 'CAUGHT', this.msg);
  }

  _hero(ctx, x, y) {
    ctx.fillStyle = '#2a2a3a'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); // cloak
    ctx.fillStyle = this.her.color; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = S.PAL.skin; ctx.fillRect(x - 2, y - 8, 4, 4);
  }
  _guard(ctx, g) {
    if (g.stun > 0) { ctx.fillStyle = '#888'; }
    ctx.fillStyle = g.stun > 0 ? '#6a6a70' : this.foe.color;
    ctx.fillRect(g.x - 6, g.y - 8, 12, 16);
    ctx.fillStyle = this.foe.dark; ctx.fillRect(g.x - 6, g.y - 8, 12, 4);
    ctx.fillStyle = S.PAL.skin; ctx.fillRect(g.x - 3, g.y - 12, 6, 5);
    ctx.fillStyle = S.PAL.steel; ctx.fillRect(g.x - 4, g.y - 14, 8, 3);
    // spear
    ctx.strokeStyle = S.PAL.woodL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g.x + 7, g.y - 14); ctx.lineTo(g.x + 7, g.y + 8); ctx.stroke();
    if (g.stun > 0) txt(ctx, '*', g.x - 2, g.y - 22, '#ffd050', 10);
  }
  _maiden(ctx, x, y, frame) {
    ctx.fillStyle = S.PAL.cloth; ctx.fillRect(x - 6, y - 4, 12, 14);
    ctx.fillStyle = S.PAL.skin; ctx.beginPath(); ctx.arc(x, y - 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5a2c'; ctx.fillRect(x - 7, y - 10, 3, 14); ctx.fillRect(x + 4, y - 10, 3, 14);
    ctx.fillStyle = S.PAL.gold; ctx.fillRect(x - 5, y - 13, 10, 2);
    // cell bars
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
    for (let bx = x - 12; bx <= x + 12; bx += 5) { ctx.beginPath(); ctx.moveTo(bx, y - 20); ctx.lineTo(bx, y + 12); ctx.stroke(); }
  }
}

function heart(ctx, x, y) { ctx.beginPath(); ctx.moveTo(x + 4, y + 8); ctx.lineTo(x, y + 3); ctx.arc(x + 2, y + 3, 2, Math.PI, 0); ctx.arc(x + 6, y + 3, 2, Math.PI, 0); ctx.lineTo(x + 4, y + 8); ctx.fill(); }
function txt(ctx, s, x, y, c = '#fff', size = 8, align = 'left') {
  ctx.font = `${size}px monospace`; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = c; ctx.fillText(s, x, y);
}
function banner(ctx, msg) {
  ctx.fillStyle = 'rgba(16,10,16,0.82)'; ctx.fillRect(0, H - 22, W, 22);
  ctx.strokeStyle = S.PAL.gold; ctx.lineWidth = 1; ctx.strokeRect(0.5, H - 21.5, W - 1, 21);
  txt(ctx, msg, W / 2, H - 16, '#f0e0c0', 9, 'center');
}
function centerTitle(ctx, big, small) {
  ctx.fillStyle = 'rgba(16,10,16,0.55)'; ctx.fillRect(0, 78, W, 60);
  txt(ctx, big, W / 2, 88, S.PAL.gold, 20, 'center');
  txt(ctx, small, W / 2, 116, '#f0e0c0', 9, 'center');
  txt(ctx, 'X to continue', W / 2, 128, '#a89a7a', 8, 'center');
}
