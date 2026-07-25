// title.js — intro screen, wine-dark sea vibe.
import { drawSea, drawGalley, PAL, textShadow, text, wrap, font } from '../gfx.js';

export default class TitleScene {
  constructor(G) { this.G = G; this.t = 0; }
  enter() {
    this.t = 0;
    this.G.audio.setMode('calm');
    this.G.setButtons({ a: 'SET&nbsp;SAIL', b: '', c: '' });
  }
  update(dt) {
    this.t += dt;
    const { input, G } = this;
    if (input.consume('a') || input.consume('start')) { G.audio.ensure(); G.startVoyage(); }
  }
  get input() { return this.G.input; }
  draw(ctx) {
    const { W, H } = this.G;
    drawSea(ctx, W, H, this.t, true);
    // a lone galley crossing
    const gx = (this.t * 26) % (W + 160) - 80;
    drawGalley(ctx, gx, H * 0.62, 0, 1.1, { moving: true, oarPhase: this.t * 6 });
    // sun low on the horizon
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = PAL.skyLow;
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.26, 46, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    // title
    ctx.textAlign = 'center';
    textShadow(ctx, 'THE ODYSSEY', W / 2, H * 0.34, 58, PAL.gold, 'center');
    textShadow(ctx, 'OF MOORE', W / 2, H * 0.46, 42, PAL.terracotta, 'center');
    // framing text
    const lines = wrap(ctx, 'Troy is fallen. Ten years of war are done. Now Odysseus of Moore must cross the wine-dark sea to reach his island of Ithaca — past Cyclops and Sirens, storms and suitors.', W * 0.66, 15);
    font(ctx, 15, 'normal'); ctx.fillStyle = '#e7dcc2';
    let y = H * 0.56;
    for (const l of lines) { ctx.fillText(l, W / 2, y); y += 20; }

    // prompt
    const blink = 0.5 + 0.5 * Math.sin(this.t * 4);
    ctx.globalAlpha = blink;
    textShadow(ctx, this.G.isTouch ? 'Tap  SET SAIL' : 'Press  ENTER / SPACE  to set sail', W / 2, H * 0.8, 20, PAL.marble, 'center');
    ctx.globalAlpha = 1;
    text(ctx, this.G.isTouch ? 'Stick to steer · buttons to fight' : 'WASD/Arrows move · SPACE attack · K bow/volley · L pray · M mute',
      W / 2, H * 0.9, 12, '#9fb2c8', 'center', 'normal');
  }
}
