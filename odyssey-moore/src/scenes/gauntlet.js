// gauntlet.js — the strait: resist the Sirens, then thread Scylla (right) and Charybdis (left).
import { drawSea, drawGalley, drawWhirl, drawBurst, PAL, text, textShadow, wrap, font } from '../gfx.js';
import { TAU, clamp, dist, rand } from '../util.js';

const SAIL_RATE = 0.045; // progress per second

export default class GauntletScene {
  constructor(G) { this.G = G; }
  enter(cfg) {
    const G = this.G, W = G.W, H = G.H;
    this.stage = cfg.stage;
    this.t = 0; this.p = 0; this.phase = 'intro';
    this.ship = { x: W * 0.5, vx: 0, y: H * 0.78, ang: -Math.PI / 2, oar: 0 };
    this.lure = 0; this.flash = 0; this.shake = 0;
    this.scyllaMarks = [0.55, 0.64, 0.73, 0.82, 0.9, 0.97].map(v => ({ at: v, done: false }));
    this.crewLost = 0; this.snatch = 0; this.whirlHit = 0;
    this.sirenResisted = true;
    G.audio.setMode('tense');
    G.setButtons({ a: 'CONTINUE', b: '', c: '' });
    G.showChoices(null);
    this.fx = [];
  }
  get input() { return this.G.input; }

  update(dt) {
    this.t += dt; const G = this.G, input = this.input, W = G.W, H = G.H;
    if (this.flash > 0) this.flash -= dt * 2;
    if (this.shake > 0) this.shake -= dt;
    if (this.snatch > 0) this.snatch -= dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < f.life);

    if (this.phase === 'intro') {
      if (input.consume('a') || input.consume('start')) { this.phase = 'sail'; G.setButtons({ a: 'ROW', b: '', c: '' }); G.audio.ui(); }
      return;
    }
    if (this.phase === 'win') { this.winT += dt; if (this.winT > 1.8) this._finish(); return; }
    if (G.checkDeath()) return;

    const ship = this.ship;
    // advance
    const rowing = input.held.a || input.down(' ', 'w', 'arrowup');
    this.p += SAIL_RATE * (rowing ? 1.7 : 1) * dt;
    ship.oar += dt * (rowing ? 9 : 5);
    if (Math.random() < 0.15) G.audio.oar();

    // steering (left/right)
    const mv = input.moveVec();
    let steer = mv.x;
    // Siren lure while in the first stretch
    const sirens = this.p < 0.45;
    if (sirens) {
      this.lure = clamp(this.lure + (18 - Math.abs(steer) * 22) * dt, 0, 100);
      if (Math.random() < 0.1) G.audio.siren();
      // lure pulls ship toward the siren rocks (left)
      ship.vx += -(this.lure / 100) * 90 * dt;
      if (this.lure > 85) { this.sirenResisted = false; }
    } else if (this.lure > 0) this.lure = clamp(this.lure - 40 * dt, 0, 100);

    ship.vx += steer * 260 * dt;
    ship.vx *= 0.9;
    ship.x = clamp(ship.x + ship.vx * dt, 30, W - 30);
    ship.ang = -Math.PI / 2 + clamp(ship.vx / 300, -0.5, 0.5);

    // ---- Sirens rocks (left edge) ----
    if (sirens && ship.x < 64) { G.state.hull = clamp(G.state.hull - 22 * dt, 0, G.state.hullMax); this.flash = 0.4; this.shake = 0.2; }

    // ---- Charybdis whirlpool (left) in the strait ----
    if (this.p >= 0.45) {
      const wx = W * 0.26, wy = H * 0.42;
      const open = 0.5 + 0.5 * Math.sin(this.t * 1.2); // pulses
      const d = dist(ship.x, ship.y, wx, wy + H * 0.3); // whirlpool sits toward the ship lane
      const cx = W * 0.24;
      // pull toward Charybdis lane if ship drifts left
      if (ship.x < W * 0.42) {
        const pull = (1 - (ship.x - 30) / (W * 0.42 - 30)) * open;
        ship.vx -= pull * 220 * dt;
        if (ship.x < W * 0.32 && open > 0.6) {
          G.state.hull = clamp(G.state.hull - 34 * dt, 0, G.state.hullMax);
          this.flash = 0.5; this.shake = 0.35; this.whirlHit = 0.4;
          if (Math.random() < 0.2) G.audio.whirl();
        }
      }
      // ---- Scylla snatches (right cliff) — unavoidable toll ----
      for (const m of this.scyllaMarks) {
        if (!m.done && this.p >= m.at) {
          m.done = true;
          // Scylla always takes at least one; staying far right (near her cliff) risks a second
          let take = 1; if (ship.x > W * 0.78) take = 2;
          G.state.crew = Math.max(0, G.state.crew - take); this.crewLost += take;
          this.snatch = 0.5; this.shake = 0.3; G.audio.hurt();
          this._fx(W * 0.86, ship.y - 10, PAL.blood, 20, 0.6);
          G.toast('Scylla strikes — ' + take + ' lost!', 1.4);
        }
      }
    }

    if (this.p >= 1) this._win();
  }
  _fx(x, y, color, r, life) { this.fx.push({ x, y, color, r, life, t: 0 }); }

  _win() {
    if (this.phase === 'win') return;
    this.phase = 'win'; this.winT = 0;
    if (this.sirenResisted) this.G.applyEffect({ favor: 10 });
    this.G.applyEffect({ glory: 150 });
    this.G.audio.setMode('calm'); this.G.audio.victory();
  }
  _finish() {
    this.G.toast('Past the strait: ' + this.crewLost + ' lost to Scylla, the ship survives.', 3.2);
    this.G.phaseDone();
  }

  draw(ctx) {
    const G = this.G, W = G.W, H = G.H;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(this.shake * 7, -this.shake * 7), rand(this.shake * 7, -this.shake * 7));
    drawSea(ctx, W, H, this.t, true);

    const scroll = (this.p * 1400) % 90;
    // strait walls
    ctx.fillStyle = '#3a2c26';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.16, 0);
    for (let y = 0; y <= H; y += 30) ctx.lineTo(W * 0.16 + Math.sin(y * 0.05 + this.t) * 8, y);
    ctx.lineTo(0, H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W * 0.84, 0);
    for (let y = 0; y <= H; y += 30) ctx.lineTo(W * 0.84 + Math.sin(y * 0.05 - this.t) * 8, y);
    ctx.lineTo(W, H); ctx.fill();

    if (this.p < 0.45) {
      // Sirens on the left rocks
      ctx.fillStyle = '#5a4a5a';
      for (let i = 0; i < 3; i++) {
        const sy = H * 0.3 + i * 44 + Math.sin(this.t + i) * 4;
        ctx.beginPath(); ctx.ellipse(W * 0.1, sy, 7, 12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c890a0'; ctx.beginPath(); ctx.arc(W * 0.1, sy - 10, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a4a5a';
      }
      // song waves
      ctx.strokeStyle = `rgba(200,140,190,${0.15 + 0.1 * Math.sin(this.t * 3)})`; ctx.lineWidth = 2;
      for (let r = 20; r < 200; r += 26) { ctx.beginPath(); ctx.arc(W * 0.1, H * 0.42, r + (this.t * 20) % 26, -0.6, 0.6); ctx.stroke(); }
    } else {
      // Charybdis whirlpool (left lane)
      drawWhirl(ctx, W * 0.24, H * 0.55, 90 + 20 * Math.sin(this.t * 1.2), this.t);
      // Scylla cliff heads (right)
      ctx.fillStyle = '#4a3a3a';
      for (let i = 0; i < 6; i++) {
        const hy = H * 0.2 + i * 60 + Math.sin(this.t * 2 + i) * 6;
        const reach = (this.snatch > 0 ? 40 : 12) + Math.sin(this.t * 3 + i) * 6;
        ctx.beginPath(); ctx.moveTo(W * 0.9, hy); ctx.lineTo(W * 0.9 - reach, hy + 6); ctx.lineTo(W * 0.9, hy + 14); ctx.fill();
        ctx.fillStyle = '#c8402f'; ctx.beginPath(); ctx.arc(W * 0.9 - reach, hy + 6, 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a3a3a';
      }
    }

    // fx
    for (const f of this.fx) drawBurst(ctx, f.x, f.y, f.r * (1 + f.t / f.life), f.color, 1 - f.t / f.life);
    // ship
    const ship = this.ship;
    drawGalley(ctx, ship.x, ship.y, ship.ang, 1, { moving: true, oarPhase: ship.oar });
    ctx.restore();

    // ---- overlays ----
    // progress bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(W * 0.2, 16, W * 0.6, 8);
    ctx.fillStyle = PAL.gold; ctx.fillRect(W * 0.2, 16, W * 0.6 * clamp(this.p, 0, 1), 8);
    text(ctx, 'The Strait', W * 0.2, 12, 11, PAL.marble, 'left', 'normal');

    if (this.phase === 'intro') {
      const px = W * 0.12, pw = W * 0.76, py = H * 0.58, ph = H * 0.36;
      ctx.fillStyle = 'rgba(22,16,26,0.86)'; ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = PAL.bronze; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
      textShadow(ctx, this.stage.title, W / 2, py + 28, 22, PAL.gold, 'center');
      text(ctx, this.stage.subtitle, W / 2, py + 48, 13, PAL.terra2, 'center', 'normal');
      const lines = wrap(ctx, this.stage.intro, pw - 48, 14);
      font(ctx, 14, 'normal'); ctx.textAlign = 'center'; ctx.fillStyle = '#eadfc6';
      let y = py + 76; for (const l of lines) { ctx.fillText(l, W / 2, y); y += 19; }
      const blink = 0.5 + 0.5 * Math.sin(this.t * 4); ctx.globalAlpha = blink;
      textShadow(ctx, G.isTouch ? 'Tap CONTINUE' : 'Press SPACE to continue', W / 2, py + ph - 12, 13, PAL.marble, 'center');
      ctx.globalAlpha = 1;
    } else if (this.phase === 'sail') {
      if (this.p < 0.45) {
        // Siren lure meter
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(W / 2 - 90, H - 30, 180, 12);
        ctx.fillStyle = '#c890c0'; ctx.fillRect(W / 2 - 90, H - 30, 180 * (this.lure / 100), 12);
        text(ctx, 'SIREN SONG', W / 2, H - 34, 11, PAL.marble, 'center');
        textShadow(ctx, 'Steer RIGHT — resist the Sirens', W / 2, 44, 14, '#e0b0d0', 'center');
      } else {
        textShadow(ctx, '← Charybdis swallows all   ·   Scylla’s cliff →', W / 2, 44, 14, '#e6b0a0', 'center');
      }
    } else if (this.phase === 'win') {
      textShadow(ctx, 'Through the strait!', W / 2, H * 0.5, 30, PAL.gold, 'center');
    }
    if (this.flash > 0) { ctx.globalAlpha = this.flash; ctx.fillStyle = this.whirlHit > 0 ? '#4090a0' : '#a03030'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; if (this.whirlHit > 0) this.whirlHit -= 0.02; }
  }
}
