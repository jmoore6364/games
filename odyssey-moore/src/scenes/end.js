// end.js — game over / victory screen.
import { drawSea, drawIsland, drawGalley, PAL, textShadow, text, wrap, font } from '../gfx.js';

export default class EndScene {
  constructor(G) { this.G = G; }
  enter(cfg) {
    this.win = cfg.win; this.msg = cfg.msg || ''; this.t = 0;
    this.G.audio.setMode(this.win ? 'calm' : 'tense');
    this.G.setButtons({ a: this.win ? 'SAIL AGAIN' : 'TRY AGAIN', b: '', c: '' });
    this.G.showChoices(null);
  }
  get input() { return this.G.input; }
  update(dt) {
    this.t += dt;
    const G = this.G, input = this.input;
    if (input.consume('a') || input.consume('start') || input.consume('restart')) { G.audio.ui(); G.setScene('title', {}); }
  }
  draw(ctx) {
    const G = this.G, W = G.W, H = G.H;
    drawSea(ctx, W, H, this.t, !this.win);
    if (this.win) {
      drawIsland(ctx, W / 2, H * 0.36, 110, 3, { marble: true });
      const gx = W / 2 + Math.sin(this.t * 0.5) * 40;
      drawGalley(ctx, gx, H * 0.58, Math.PI, 1.1, { moving: true, oarPhase: this.t * 5 });
      textShadow(ctx, 'HOME TO ITHACA', W / 2, H * 0.2, 46, PAL.gold, 'center');
    } else {
      textShadow(ctx, 'THE VOYAGE ENDS', W / 2, H * 0.3, 44, '#d05040', 'center');
      // a sinking prow
      ctx.save(); ctx.globalAlpha = 0.7; drawGalley(ctx, W / 2, H * 0.52, 0.4, 1, { moving: false }); ctx.restore();
    }
    // message
    const lines = wrap(ctx, this.msg, W * 0.7, 16);
    font(ctx, 16, 'normal'); ctx.textAlign = 'center'; ctx.fillStyle = '#eadfc6';
    let y = H * 0.7; for (const l of lines) { ctx.fillText(l, W / 2, y); y += 22; }
    text(ctx, 'Glory earned: ' + G.state.glory, W / 2, y + 10, 18, PAL.glory, 'center');
    const blink = 0.5 + 0.5 * Math.sin(this.t * 4); ctx.globalAlpha = blink;
    textShadow(ctx, G.isTouch ? 'Tap to sail again' : 'Press SPACE / R to sail again', W / 2, H * 0.92, 16, PAL.marble, 'center');
    ctx.globalAlpha = 1;
  }
}
