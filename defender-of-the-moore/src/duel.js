// Defender of the Moore — SWORD DUEL, side-view fencing.
// high/mid/low attack (up/neutral/down + X) vs parry (up/neutral/down + Z).
// A landed hit shoves the foe back; parrying in the matching stance staggers
// the attacker. First to be shoved off the end (or to take enough hits) loses.

import * as S from './sprites.js';

const W = 320, H = 224;
const GROUND = 176;
const STRIP_MIN = 40, STRIP_MAX = 280;
const REACH = 46;

export class Duel {
  // opts: { her, foe, foeSkill 0..1, title, backdrop }
  constructor(opts) {
    this.her = opts.her; this.foe = opts.foe;
    this.foeSkill = opts.foeSkill ?? 0.5;
    this.title = opts.title || 'A Challenge of Honour';
    this.backdrop = opts.backdrop || 'field';
    this.p = mkF(100, 1);
    this.f = mkF(220, -1);
    this.pHits = 0; this.fHits = 0;   // solid blows landed
    this.done = false; this.win = false;
    this.phase = 'intro'; this.timer = 1.2;
    this.msg = 'Up/Down set your line — X strike, Z parry!';
    this.flash = 0; this.foeThink = 0.6;
  }

  update(dt, input, sound) {
    this.flash = Math.max(0, this.flash - dt);
    if (this.phase === 'intro') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) { this.phase = 'fight'; }
      return;
    }
    if (this.phase === 'over') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) this.done = true;
      return;
    }

    // ---- player stance & actions ----
    this.p.stance = input.down('up') ? 0 : input.down('down') ? 2 : 1;
    stepFighter(this.p, dt);
    if (input.pressed('x') && this.p.recover <= 0 && this.p.attack <= 0) startAttack(this.p, sound);
    if (input.pressed('z') && this.p.recover <= 0 && this.p.parry <= 0) startParry(this.p, sound);

    // ---- foe AI ----
    this._foeAI(dt, sound);
    stepFighter(this.f, dt);

    // ---- resolve strikes at the moment they land (windup hits 0) ----
    this._resolveStrike(this.p, this.f, sound, true);
    this._resolveStrike(this.f, this.p, sound, false);

    // ---- push off the end / hit count = win ----
    if (this.f.x >= STRIP_MAX || this.fHits >= 4) return this._end(true, 'The foe is beaten back — you have won!', sound);
    if (this.p.x <= STRIP_MIN || this.pHits >= 4) return this._end(false, 'You are driven from the field, defeated.', sound);
  }

  _foeAI(dt, sound) {
    this.foeThink -= dt;
    const f = this.f, p = this.p;
    // if the player is winding up, try to parry the matching line
    if (p.attack > 0 && p.windup <= 8 && f.parry <= 0 && f.recover <= 0) {
      if (Math.random() < this.foeSkill * 0.9) { f.stance = p.attackStance; startParry(f, sound); return; }
    }
    if (this.foeThink <= 0 && f.recover <= 0 && f.attack <= 0) {
      this.foeThink = 0.5 + Math.random() * (1.1 - this.foeSkill * 0.6);
      // choose a line; smarter foes avoid the player's likely parry
      f.stance = Math.floor(Math.random() * 3);
      startAttack(f, sound);
    }
  }

  _resolveStrike(atk, def, sound, atkIsPlayer) {
    if (atk.attack <= 0 || atk.windup > 0 || atk.resolved) return;
    atk.resolved = true;
    const dx = Math.abs(atk.x - def.x);
    const inReach = dx < REACH + 6;
    // defender parries if actively parrying in the matching stance
    const parried = def.parry > 0 && def.parryStance === atk.attackStance;
    if (!inReach) { if (sound) sound.swish(); return; }
    if (parried) {
      if (sound) sound.parry();
      atk.recover = 26; atk.stagger = 10; atk.hurt = 8;      // attacker staggered
      def.parry = 0;
      this.flash = 0.1;
    } else {
      if (sound) { sound.clash(); sound.hit(); }
      def.hurt = 12; def.x += atk.dir * 26; def.recover = 14;
      if (atkIsPlayer) this.fHits++; else this.pHits++;
      this.flash = 0.18;
    }
  }

  _end(win, msg, sound) {
    this.win = win; this.msg = msg; this.phase = 'over'; this.timer = 1.6;
    if (sound) win ? sound.fanfare() : sound.dirge();
  }

  render(ctx, frame) {
    // backdrop
    if (this.backdrop === 'dungeon') {
      ctx.fillStyle = '#1c1626'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = S.PAL.stoneD;
      for (let y = 0; y < GROUND; y += 16) for (let x = ((y / 16) % 2) * 16; x < W; x += 32) ctx.fillRect(x, y, 30, 14);
      ctx.fillStyle = '#e88030'; // torches
      for (const tx of [50, 160, 270]) { ctx.fillRect(tx, 40, 4, 10); ctx.beginPath(); ctx.arc(tx + 2, 38, 4 + Math.sin(frame * 0.5 + tx) * 1.5, 0, Math.PI * 2); ctx.fill(); }
    } else {
      S.skyGradient(ctx, W, H, '#7088b0', '#c8d0b0');
      S.drawClouds(ctx, W, H, frame * 0.15);
      // distant castle on the horizon
      ctx.fillStyle = '#6a6478'; ctx.fillRect(210, 90, 70, 40);
      ctx.fillRect(214, 78, 10, 12); ctx.fillRect(266, 78, 10, 12);
    }
    // ground
    ctx.fillStyle = this.backdrop === 'dungeon' ? '#2a2230' : S.PAL.grassD;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = this.backdrop === 'dungeon' ? '#3a3040' : S.PAL.grass;
    ctx.fillRect(0, GROUND, W, 4);
    // fighters
    S.drawFencer(ctx, this.f.x, GROUND, -1, this.foe, this.f.stance, actOf(this.f));
    S.drawFencer(ctx, this.p.x, GROUND, 1, this.her, this.p.stance, actOf(this.p));

    // HUD: hit pips + stance indicators
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < this.fHits ? this.her.color : '#00000066'; ctx.fillRect(120 + i * 12, 12, 9, 9);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(120 + i * 12, 12, 9, 9);
      ctx.fillStyle = i < this.pHits ? this.foe.color : '#00000066'; ctx.fillRect(176 + i * 12, 12, 9, 9);
      ctx.strokeRect(176 + i * 12, 12, 9, 9);
    }
    txt(ctx, 'HITS ON FOE', 96, 2, this.her.light, 8);
    // stance readout for the player
    const lines = ['HIGH', 'MID', 'LOW'];
    txt(ctx, 'LINE: ' + lines[this.p.stance], 10, 12, '#f0e0c0', 9);
    if (this.p.parry > 0) txt(ctx, 'PARRY!', 10, 24, S.PAL.gold, 9);

    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, W, H); }
    banner(ctx, this.msg);
    if (this.phase === 'intro') centerTitle(ctx, this.title, 'Blades are drawn');
    if (this.phase === 'over') centerTitle(ctx, this.win ? 'VICTORY' : 'DEFEAT', this.msg);
  }
}

function mkF(x, dir) {
  return { x, dir, stance: 1, attack: 0, windup: 0, attackStance: 1, parry: 0, parryStance: 1,
    recover: 0, stagger: 0, hurt: 0, resolved: false };
}
function startAttack(f, sound) { f.attack = 22; f.windup = 12; f.attackStance = f.stance; f.resolved = false; if (sound) sound.swish(); }
function startParry(f, sound) { f.parry = 16; f.parryStance = f.stance; if (sound) sound.select(); }
function stepFighter(f, dt) {
  const s = dt * 60;
  if (f.windup > 0) f.windup = Math.max(0, f.windup - s);
  if (f.attack > 0) { f.attack = Math.max(0, f.attack - s); if (f.attack === 0) f.resolved = false; }
  if (f.parry > 0) f.parry = Math.max(0, f.parry - s);
  if (f.recover > 0) f.recover = Math.max(0, f.recover - s);
  if (f.stagger > 0) f.stagger = Math.max(0, f.stagger - s);
  if (f.hurt > 0) f.hurt = Math.max(0, f.hurt - s);
  f.x = Math.max(STRIP_MIN - 4, Math.min(STRIP_MAX + 4, f.x));
}
function actOf(f) {
  if (f.hurt > 0) return 'hurt';
  if (f.parry > 0) return 'parry';
  if (f.attack > 0) return 'attack';
  return 'idle';
}

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
