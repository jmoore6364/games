// Defender of the Moore — JOUSTING, the signature scene.
// Side-view charge on horseback. Control lance HEIGHT (up/down) and couch the
// lance (X) as the gap closes. A solid, well-timed strike on the foe's mark
// unhorses him. Best-of-3 passes. Self-contained scene: update()/render().

import * as S from './sprites.js';

const W = 320, H = 224;
const GROUND = 168;

export class Joust {
  // opts: { her, foe, foeSkill 0..1, title }
  constructor(opts) {
    this.her = opts.her;
    this.foe = opts.foe;
    this.foeSkill = opts.foeSkill ?? 0.5;
    this.title = opts.title || 'The Lists';
    this.pScore = 0; this.fScore = 0;
    this.done = false; this.win = false;
    this.phase = 'intro';     // intro | charge | impact | result | matchover
    this.timer = 1.2;
    this.pass = 0;
    this.aim = 0.5;           // player lance height 0 (low) .. 1 (high)
    this.braced = false;
    this.msg = 'Best of three passes — couch your lance true!';
    this.flash = 0;
    this._startPass();
    this.result = null;
    this.shake = 0;
  }

  _startPass() {
    this.pass++;
    this.gap = 1;             // 1 = far apart, 0 = collision
    this.aim = 0.5;
    this.braced = false;
    this.band = 0.35 + Math.random() * 0.3;   // foe's exposed mark (target)
    this.bandDrift = (Math.random() - 0.5) * 0.4;
    this.foeAim = 0.5;
    this.foeTargets = 0.4 + Math.random() * 0.3;
    this.passResolved = false;
    this.pHitQ = 0; this.fHit = false;
  }

  update(dt, input, sound) {
    this.flash = Math.max(0, this.flash - dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.phase === 'intro') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) { this.phase = 'charge'; this.timer = 0; this.msg = 'Up/Down aim — X to couch as you close!'; }
      return;
    }
    if (this.phase === 'result') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) {
        if (this.pScore >= 2 || this.fScore >= 2 || this.pass >= 5) {
          this.phase = 'matchover'; this.timer = 1.4;
          this.win = this.pScore > this.fScore;
          this.msg = this.win ? 'You are the champion of the lists!' : 'You are cast down into the dust.';
        } else { this.phase = 'charge'; this._startPass(); this.msg = 'Another pass!'; }
      }
      return;
    }
    if (this.phase === 'matchover') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) this.done = true;
      return;
    }

    // charge phase
    if (input.down('up')) this.aim = Math.min(1, this.aim + dt * 1.7);
    if (input.down('down')) this.aim = Math.max(0, this.aim - dt * 1.7);
    if (input.pressed('x')) this.braced = true;

    // close the gap; gallop sound cadence
    const speed = 0.62;
    this.gap -= dt * speed;
    if (sound && Math.random() < dt * 12) sound.gallop();

    // foe adjusts his aim toward his target as the gap closes
    this.band = Math.max(0.1, Math.min(0.9, this.band + this.bandDrift * dt));
    this.foeAim += (this.foeTargets - this.foeAim) * dt * 2;

    if (this.gap <= 0 && !this.passResolved) {
      this.passResolved = true;
      this._resolvePass(sound);
    }
  }

  _resolvePass(sound) {
    const tol = 0.16;
    const err = Math.abs(this.aim - this.band);
    const solid = this.braced && err < tol;
    this.pHitQ = solid ? 1 - err / tol : 0;
    // foe lands his blow by skill; harder foes rarely miss
    this.fHit = Math.random() < (0.35 + this.foeSkill * 0.5);
    // player's clean brace can also shrug off the foe (parry with the shield)
    if (solid && this.pHitQ > 0.6 && Math.random() < 0.5) this.fHit = false;

    let text;
    if (solid && !this.fHit) { this.pScore++; text = 'A clean strike — he reels in the saddle!'; if (sound) { sound.lanceCrack(); sound.unhorse(); sound.crowd(); } this.result = 'phit'; this.shake = 1; }
    else if (this.fHit && !solid) { this.fScore++; text = 'His lance takes you square — you nearly fall!'; if (sound) { sound.lanceCrack(); sound.unhorse(); } this.result = 'fhit'; this.shake = 1; }
    else if (solid && this.fHit) { text = 'Lances shatter on both shields — a wash!'; if (sound) sound.lanceCrack(); this.result = 'clash'; this.shake = 0.6; }
    else { text = 'Both lances swing wide. No touch.'; if (sound) sound.swish(); this.result = 'miss'; }
    this.msg = text;
    this.flash = 0.25;
    this.phase = 'result';
    this.timer = 1.6;
  }

  render(ctx, frame) {
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 5 : 0;
    ctx.save(); ctx.translate(sx, 0);
    // sky + field
    S.skyGradient(ctx, W, H, '#6aa0d8', '#bcd8ea');
    S.drawClouds(ctx, W, H, frame * 0.2);
    // distant tourney tents + crowd stand
    this._crowd(ctx, frame);
    // ground
    ctx.fillStyle = S.PAL.grass; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = S.PAL.grassD; for (let x = 0; x < W; x += 8) ctx.fillRect(x, GROUND, 4, 2);
    // the tilt barrier down the middle of the run
    ctx.fillStyle = '#d8d0c0'; ctx.fillRect(0, GROUND + 20, W, 6);
    ctx.fillStyle = '#b03038'; for (let x = 0; x < W; x += 24) ctx.fillRect(x, GROUND + 20, 12, 6);

    // knights: player from left, foe from right, closing with the gap
    const pX = 40 + (1 - this.gap) * 110;
    const fX = 280 - (1 - this.gap) * 110;
    const bob = Math.sin(frame * 0.6) * 1.5;
    // foe first (further)
    S.drawJouster(ctx, fX, GROUND + 6, -1, this.foe, this.foeAim, bob, this.result === 'fhit' && this.flash > 0 ? 0 : (this.result === 'phit' && this.flash > 0 ? 1 : 0));
    S.drawJouster(ctx, pX, GROUND + 10, 1, this.her, this.aim, -bob, this.result === 'fhit' && this.flash > 0 ? 1 : 0);

    // aim gauge (player lance height) on the left
    this._gauge(ctx, 8, 60, this.aim, this.braced, 'AIM');
    // foe's exposed mark band on the right
    this._targetBand(ctx, W - 16, 60);

    // score pips (best of 3)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.pScore ? this.her.color : '#00000055';
      ctx.fillRect(120 + i * 12, 12, 9, 9);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(120 + i * 12, 12, 9, 9);
      ctx.fillStyle = i < this.fScore ? this.foe.color : '#00000055';
      ctx.fillRect(176 + i * 12, 12, 9, 9);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(176 + i * 12, 12, 9, 9);
    }
    txt(ctx, 'YOU', 120, 2, this.her.light, 8);
    txt(ctx, 'FOE', 176, 2, this.foe.light, 8);

    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();

    // message banner
    banner(ctx, this.msg);
    if (this.phase === 'intro') centerTitle(ctx, this.title, 'A tourney is called');
    if (this.phase === 'matchover') centerTitle(ctx, this.win ? 'VICTORIOUS' : 'UNHORSED', this.msg);
  }

  _crowd(ctx, frame) {
    ctx.fillStyle = '#6a5030'; ctx.fillRect(0, GROUND - 34, W, 34);
    // striped canopy
    for (let x = 0; x < W; x += 20) { ctx.fillStyle = (x / 20) % 2 ? '#c0b0a0' : '#a03040'; ctx.fillRect(x, GROUND - 42, 20, 10); }
    // heads bobbing
    for (let i = 0; i < 26; i++) {
      const hx = 6 + i * 12; const bob = Math.sin(frame * 0.3 + i) > 0.6 ? -2 : 0;
      ctx.fillStyle = ['#e2ac80', '#c88', '#eac', '#dba'][i % 4];
      ctx.fillRect(hx, GROUND - 30 + bob, 6, 6);
      ctx.fillStyle = ['#c02838', '#3468c8', '#d0a028', '#2c8c54'][i % 4];
      ctx.fillRect(hx - 1, GROUND - 24 + bob, 8, 6);
    }
  }

  _gauge(ctx, x, y, v, braced, label) {
    ctx.fillStyle = '#00000088'; ctx.fillRect(x, y, 8, 80);
    ctx.strokeStyle = braced ? S.PAL.gold : '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 8, 80);
    const py = y + 80 - v * 80;
    ctx.fillStyle = braced ? S.PAL.gold : this.her.light;
    ctx.fillRect(x - 2, py - 2, 12, 4);
    txt(ctx, label, x - 2, y - 10, '#fff', 8);
    if (braced) txt(ctx, 'SET', x - 2, y + 82, S.PAL.gold, 8);
  }

  _targetBand(ctx, x, y) {
    ctx.fillStyle = '#00000088'; ctx.fillRect(x, y, 8, 80);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 8, 80);
    const tol = 0.16;
    const c = y + 80 - this.band * 80;
    ctx.fillStyle = this.foe.color + 'aa';
    ctx.fillRect(x, c - tol * 80, 8, tol * 160);
    ctx.fillStyle = '#fff'; ctx.fillRect(x, c - 1, 8, 2);
    txt(ctx, 'MARK', x - 6, y - 10, '#fff', 8);
  }
}

// ---- shared little text/banner helpers (kept local to each scene) ----
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
