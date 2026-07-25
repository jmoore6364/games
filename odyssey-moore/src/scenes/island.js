// island.js — narrative episode: intro text and branching choices.
import { drawSea, drawIsland, PAL, text, textShadow, wrap, font } from '../gfx.js';

export default class IslandScene {
  constructor(G) { this.G = G; }
  enter(cfg) {
    const G = this.G;
    this.stage = cfg.stage;
    this.phase = cfg.phase; // 'intro' | 'choice'
    this.t = 0;
    this.sub = this.phase === 'choice' ? 'choosing' : 'intro';
    this.resultText = '';
    G.audio.setMode('calm');
    if (this.sub === 'choosing') {
      G.setButtons({ a: '', b: '', c: '' });
      G.showChoices(this.stage.choices.map(c => c.label));
    } else {
      G.showChoices(null);
      G.setButtons({ a: 'CONTINUE', b: '', c: '' });
    }
  }
  get input() { return this.G.input; }

  update(dt) {
    this.t += dt;
    const G = this.G, input = this.input;
    if (this.sub === 'intro') {
      if (input.consume('a') || input.consume('start')) { G.audio.ui(); G.phaseDone(); }
    } else if (this.sub === 'choosing') {
      const ch = this.stage.choices;
      let pick = -1;
      if (input.consume('choice1')) pick = 0;
      else if (input.consume('choice2')) pick = 1;
      else if (input.consume('choice3')) pick = 2;
      if (pick >= 0 && pick < ch.length) this._choose(ch[pick]);
    } else if (this.sub === 'result') {
      if (input.consume('a') || input.consume('start')) { G.audio.ui(); G.phaseDone(); }
    }
  }
  _choose(c) {
    const G = this.G;
    G.applyEffect(c.effect);
    if (c.effect && c.effect.crew < 0) G.audio.hurt(); else G.audio.pray();
    if (c.toast) G.toast(c.toast, 3);
    this.resultText = c.text;
    this.sub = 'result';
    G.showChoices(null);
    G.setButtons({ a: 'CONTINUE', b: '', c: '' });
    G.checkDeath();
  }

  draw(ctx) {
    const G = this.G, W = G.W, H = G.H;
    drawSea(ctx, W, H, this.t, false);
    // island illustration
    drawIsland(ctx, W * 0.5, H * 0.32, 92, 2.3, { marble: true });
    // parchment panel
    const px = W * 0.12, pw = W * 0.76, py = H * 0.52, ph = H * 0.4;
    ctx.fillStyle = 'rgba(22,18,30,0.82)'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = PAL.bronze; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);

    textShadow(ctx, this.stage.title, W / 2, py + 30, 24, PAL.gold, 'center');
    text(ctx, this.stage.subtitle, W / 2, py + 50, 14, PAL.terra2, 'center', 'normal');

    const body = this.sub === 'result' ? this.resultText : this.stage.intro;
    const lines = wrap(ctx, body, pw - 48, 15);
    font(ctx, 15, 'normal'); ctx.textAlign = 'center'; ctx.fillStyle = '#eadfc6';
    let y = py + 82;
    for (const l of lines) { ctx.fillText(l, W / 2, y); y += 21; }

    if (this.sub === 'choosing') {
      const ch = this.stage.choices;
      let cy = y + 8;
      font(ctx, 15, 'bold'); ctx.textAlign = 'center';
      for (let i = 0; i < ch.length; i++) {
        ctx.fillStyle = 'rgba(60,45,30,0.7)';
        const bw = pw - 80, bx = W / 2 - bw / 2;
        ctx.fillRect(bx, cy - 16, bw, 24);
        ctx.strokeStyle = PAL.bronze2; ctx.strokeRect(bx, cy - 16, bw, 24);
        ctx.fillStyle = PAL.marble;
        ctx.fillText((i + 1) + '.  ' + ch[i].label, W / 2, cy);
        cy += 32;
      }
      if (!G.isTouch) text(ctx, 'Press 1 / 2 / 3 to choose', W / 2, py + ph - 12, 12, '#9fb2c8', 'center', 'normal');
    } else {
      const blink = 0.5 + 0.5 * Math.sin(this.t * 4); ctx.globalAlpha = blink;
      textShadow(ctx, G.isTouch ? 'Tap CONTINUE' : 'Press SPACE / ENTER to continue', W / 2, py + ph - 14, 14, PAL.marble, 'center');
      ctx.globalAlpha = 1;
    }
  }
}
