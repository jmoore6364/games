// cyclops.js — the cave of Polyphemus: heat the stake, blind the eye, escape under the sheep.
import { PAL, text, textShadow, drawWarrior, drawSheep, drawBurst, wrap, font } from '../gfx.js';
import { TAU, clamp, dist, rand } from '../util.js';

export default class CyclopsScene {
  constructor(G) { this.G = G; }
  enter(cfg) {
    const G = this.G, W = G.W, H = G.H;
    this.stage = cfg.stage;
    this.t = 0;
    this.phase = 'intro';      // intro -> charge -> strike -> choice -> escape
    this.charge = 0; this.stir = 0; this.flash = 0; this.shake = 0;
    this.hero = { x: W * 0.5, y: H * 0.7, ang: -Math.PI / 2 };
    this.exitX = W - 40; this.hitCd = 0;
    this.hands = [
      { x: W * 0.5, y: H * 0.5, ph: 0 },
      { x: W * 0.72, y: H * 0.5, ph: 1.6 },
    ];
    G.audio.setMode('tense');
    G.setButtons({ a: 'CONTINUE', b: '', c: '' });
    G.showChoices(null);
  }
  get input() { return this.G.input; }

  update(dt) {
    this.t += dt; const G = this.G, input = this.input;
    if (this.flash > 0) this.flash -= dt * 2;
    if (this.shake > 0) this.shake -= dt;
    if (this.hitCd > 0) this.hitCd -= dt;

    if (this.phase === 'intro') {
      if (input.consume('a') || input.consume('start')) { this.phase = 'charge'; G.setButtons({ a: 'HEAT STAKE', b: '', c: '' }); G.audio.ui(); }
      return;
    }
    if (this.phase === 'charge') {
      const heating = input.held.a || input.down(' ', 'w', 'arrowup', 'j');
      if (heating) { this.charge = clamp(this.charge + 34 * dt, 0, 100); this.stir = clamp(this.stir + 10 * dt, 0, 100); if (Math.random() < 0.2) G.audio.oar(); }
      else { this.stir = clamp(this.stir - 22 * dt, 0, 100); }
      if (this.stir >= 100) { this.stir = 40; G.audio.hurt(); this.shake = 0.3; G.toast('The giant stirs!', 1.4); }
      if (this.charge >= 100) { this.phase = 'strike'; G.setButtons({ a: '', b: 'STRIKE!', c: '' }); G.toast('Stake glowing — STRIKE the eye!', 2); }
      return;
    }
    if (this.phase === 'strike') {
      if (input.consume('b') || input.consume('a')) {
        this.phase = 'choice'; this.flash = 1; this.shake = 0.5; G.audio.ram(); G.addGlory(120);
        G.setButtons({ a: '', b: '', c: '' });
        G.showChoices(['Cry out your name (Poseidon’s wrath)', 'Stay silent, slip away']);
      }
      return;
    }
    if (this.phase === 'choice') {
      let pick = -1;
      if (input.consume('choice1')) pick = 0;
      else if (input.consume('choice2')) pick = 1;
      if (pick === 0) { G.state.poseidonWrath = true; G.addGlory(80); G.toast('You taunt him! Poseidon vows revenge.', 3); this._startEscape(); }
      else if (pick === 1) { G.applyEffect({ favor: 12 }); G.toast('You keep silent. Athena favors your prudence.', 3); this._startEscape(); }
      return;
    }
    if (this.phase === 'escape') {
      const hero = this.hero;
      const mv = input.moveVec();
      if (mv.m > 0.06) { hero.x = clamp(hero.x + mv.x * 150 * dt, 20, G.W - 20); hero.y = clamp(hero.y + mv.y * 150 * dt, G.H * 0.35, G.H - 20); hero.ang = Math.atan2(mv.y, mv.x); }
      // sweeping blind hands
      for (const h of this.hands) {
        h.ph += dt * 1.6;
        h.y = G.H * 0.55 + Math.sin(h.ph) * G.H * 0.22;
        if (this.hitCd <= 0 && dist(h.x, h.y, hero.x, hero.y) < 40) {
          this.hitCd = 1.2; G.state.crew = Math.max(0, G.state.crew - 1); hero.x = clamp(hero.x - 60, 20, G.W - 20); G.audio.hurt(); this.shake = 0.3;
          G.toast('A groping hand snatches a man!', 1.4);
        }
      }
      if (hero.x >= this.exitX - 12) { if (this.stage.win || true) G.toast('You escape the cave and reach the ships.', 3); G.phaseDone(); return; }
      G.checkDeath();
    }
  }
  _startEscape() {
    const G = this.G;
    this.phase = 'escape';
    this.hero.x = 40; this.hero.y = G.H * 0.7;
    G.setButtons({ a: '', b: '', c: '' });
    G.showChoices(null);
    G.toast('Cling beneath the sheep — reach the cave mouth!', 2.4);
  }

  draw(ctx) {
    const G = this.G, W = G.W, H = G.H;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(this.shake * 7, -this.shake * 7), rand(this.shake * 7, -this.shake * 7));
    // cave background
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#241d24'); g.addColorStop(1, '#0e0a10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // fire glow
    ctx.fillStyle = 'rgba(200,90,40,0.10)'; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.9, 220, 0, TAU); ctx.fill();
    // exit light (right)
    if (this.phase === 'escape') { const eg = ctx.createRadialGradient(W, H * 0.6, 10, W, H * 0.6, 160); eg.addColorStop(0, 'rgba(230,220,180,0.5)'); eg.addColorStop(1, 'rgba(230,220,180,0)'); ctx.fillStyle = eg; ctx.fillRect(W - 200, 0, 200, H); }

    this._drawGiant(ctx, W, H);

    if (this.phase === 'escape') {
      // sheep + hero clinging
      for (const h of this.hands) { ctx.fillStyle = '#7a5a44'; ctx.beginPath(); ctx.arc(h.x, h.y, 26, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.arc(h.x, h.y, 18, 0, TAU); ctx.fill(); }
      drawSheep(ctx, this.hero.x, this.hero.y + 6, 1.4);
      drawWarrior(ctx, this.hero.x, this.hero.y - 4, this.hero.ang, 0.85, { cloth: PAL.terracotta, shield: PAL.gold, crest: PAL.blood, weapon: 'none' });
      // exit marker
      textShadow(ctx, 'EXIT →', W - 30, H * 0.4, 16, PAL.gold, 'right');
    }
    ctx.restore();

    // panels / prompts
    if (this.phase === 'intro') this._panel(ctx, this.stage.intro, 'Ready the stake');
    else if (this.phase === 'charge') {
      this._bar(ctx, 'STAKE HEAT', this.charge, PAL.terra2, H - 74);
      this._bar(ctx, 'GIANT STIRS', this.stir, '#c85040', H - 48);
      textShadow(ctx, G.isTouch ? 'Hold HEAT STAKE — but do not wake him' : 'Hold SPACE to heat the stake — but do not wake him', W / 2, 40, 15, PAL.marble, 'center');
    } else if (this.phase === 'strike') {
      const blink = 0.5 + 0.5 * Math.sin(this.t * 8); ctx.globalAlpha = blink;
      textShadow(ctx, G.isTouch ? 'Tap STRIKE!' : 'Press K to STRIKE the eye!', W / 2, H * 0.5, 30, PAL.gold, 'center');
      ctx.globalAlpha = 1;
    } else if (this.phase === 'choice') {
      this._choicePanel(ctx);
    } else if (this.phase === 'escape') {
      textShadow(ctx, G.isTouch ? 'Stick right to the exit — dodge the hands' : 'Move to the exit — dodge the groping hands', W / 2, 34, 14, PAL.marble, 'center');
    }
    if (this.flash > 0) { ctx.globalAlpha = this.flash; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  _drawGiant(ctx, W, H) {
    const blinded = this.phase === 'choice' || this.phase === 'escape';
    const asleep = this.phase === 'intro' || this.phase === 'charge';
    ctx.save(); ctx.translate(W * 0.5, H * 0.34);
    // body
    ctx.fillStyle = '#6a5240'; ctx.beginPath(); ctx.ellipse(0, 40, 120, 90, 0, 0, TAU); ctx.fill();
    // head
    ctx.fillStyle = '#7a614a'; ctx.beginPath(); ctx.arc(0, -40, 64, 0, TAU); ctx.fill();
    // beard
    ctx.fillStyle = '#4a3a2c'; ctx.beginPath(); ctx.arc(0, -12, 46, 0, Math.PI); ctx.fill();
    // single eye
    if (blinded) {
      ctx.strokeStyle = '#a5352f'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-22, -58); ctx.lineTo(22, -42); ctx.moveTo(22, -58); ctx.lineTo(-22, -42); ctx.stroke();
      ctx.fillStyle = '#3a0a0a'; ctx.beginPath(); ctx.arc(0, -50, 8, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = '#efe7d2'; ctx.beginPath(); ctx.ellipse(0, -50, asleep ? 16 : 20, asleep ? 4 : 16, 0, 0, TAU); ctx.fill();
      if (!asleep) { ctx.fillStyle = '#3a6a4a'; ctx.beginPath(); ctx.arc(0, -50, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, -50, 4, 0, TAU); ctx.fill(); }
      if (asleep) { ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -50); ctx.lineTo(16, -50); ctx.stroke(); }
    }
    // Z's when asleep
    if (asleep) { text(ctx, 'z z z', 60, -80 + Math.sin(this.t * 2) * 3, 18, 'rgba(220,220,240,0.5)', 'left'); }
    ctx.restore();
  }
  _bar(ctx, label, val, color, y) {
    const G = this.G, W = G.W;
    const bw = 200, bx = W / 2 - bw / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(bx, y, bw, 16);
    ctx.fillStyle = color; ctx.fillRect(bx + 1, y + 1, (bw - 2) * clamp(val / 100, 0, 1), 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, 15);
    text(ctx, label, bx + 6, y + 12, 10, '#0d0d14', 'left');
  }
  _panel(ctx, body, title) {
    const G = this.G, W = G.W, H = G.H;
    const px = W * 0.12, pw = W * 0.76, py = H * 0.62, ph = H * 0.32;
    ctx.fillStyle = 'rgba(20,15,22,0.85)'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = PAL.bronze; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
    textShadow(ctx, this.stage.title, W / 2, py + 26, 20, PAL.gold, 'center');
    const lines = wrap(ctx, body, pw - 48, 14);
    font(ctx, 14, 'normal'); ctx.textAlign = 'center'; ctx.fillStyle = '#eadfc6';
    let y = py + 52; for (const l of lines) { ctx.fillText(l, W / 2, y); y += 19; }
    const blink = 0.5 + 0.5 * Math.sin(this.t * 4); ctx.globalAlpha = blink;
    textShadow(ctx, G.isTouch ? 'Tap CONTINUE' : 'Press SPACE to continue', W / 2, py + ph - 12, 13, PAL.marble, 'center');
    ctx.globalAlpha = 1;
  }
  _choicePanel(ctx) {
    const G = this.G, W = G.W, H = G.H;
    const px = W * 0.1, pw = W * 0.8, py = H * 0.66, ph = H * 0.3;
    ctx.fillStyle = 'rgba(20,15,22,0.88)'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = PAL.bronze; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
    textShadow(ctx, 'Blinded, Polyphemus bellows for his father Poseidon.', W / 2, py + 26, 15, PAL.gold, 'center');
    const opts = ['1.  Cry out your name  (glory, but Poseidon’s wrath)', '2.  Stay silent, slip away  (Athena’s favor)'];
    font(ctx, 15, 'bold'); ctx.textAlign = 'center';
    let cy = py + 62;
    for (let i = 0; i < opts.length; i++) {
      const bw = pw - 60, bx = W / 2 - bw / 2;
      ctx.fillStyle = 'rgba(60,45,30,0.7)'; ctx.fillRect(bx, cy - 16, bw, 26);
      ctx.strokeStyle = PAL.bronze2; ctx.strokeRect(bx, cy - 16, bw, 26);
      ctx.fillStyle = PAL.marble; ctx.fillText(opts[i], W / 2, cy + 1); cy += 36;
    }
    if (!G.isTouch) text(ctx, 'Press 1 or 2', W / 2, py + ph - 10, 12, '#9fb2c8', 'center', 'normal');
  }
}
