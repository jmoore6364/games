// Defender of the Moore — CASTLE SIEGE, a catapult artillery duel.
// Set ANGLE (up/down) and POWER (hold X to wind, release to loose). Watch the
// boulder arc and smash the ramparts. The garrison's catapult fires back —
// press Z to take cover. Breach the walls before your host is spent.

import * as S from './sprites.js';

const W = 320, H = 224;
const GROUND = 188;
const G = 320;                    // gravity px/s^2
const CASTLE_X = 226, CASTLE_Y = 96, CASTLE_W = 84, CASTLE_H = 92;

export class Siege {
  // opts: { her, foe, foeSkill, title, armyAtk, armyDef }
  constructor(opts) {
    this.her = opts.her; this.foe = opts.foe;
    this.foeSkill = opts.foeSkill ?? 0.5;
    this.title = opts.title || 'The Siege';
    this.hp = 100;                 // your besieging host
    this.dmg = 0;                  // castle damage 0..1 (breach at 1)
    this.angle = 0.85;             // radians (~49 deg)
    this.power = 0; this.charging = false;
    this.boulder = null;           // {x,y,vx,vy}
    this.enemyShot = null;
    this.enemyTimer = 3;
    this.cover = 0;
    this.done = false; this.win = false;
    this.phase = 'intro'; this.timer = 1.4;
    this.msg = 'Hold X to wind the arm, release to loose!';
    this.flash = 0; this.shake = 0; this.hitFlash = 0;
    this.hits = 0; this.shots = 0;
  }

  update(dt, input, sound) {
    this.flash = Math.max(0, this.flash - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2);
    this.shake = Math.max(0, this.shake - dt * 3);
    this.cover = Math.max(0, this.cover - dt);
    if (this.phase === 'intro') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) this.phase = 'aim';
      return;
    }
    if (this.phase === 'over') {
      this.timer -= dt;
      if (this.timer <= 0 || input.pressed('x')) this.done = true;
      return;
    }

    // aiming (only when no boulder in flight)
    if (!this.boulder) {
      if (input.down('up')) this.angle = Math.min(1.4, this.angle + dt * 0.7);
      if (input.down('down')) this.angle = Math.max(0.25, this.angle - dt * 0.7);
      if (input.down('x')) { this.charging = true; this.power = Math.min(1, this.power + dt * 0.9); }
      else if (this.charging) { this._fire(sound); }
    }
    if (input.pressed('z')) this.cover = 0.9;   // brace for incoming

    // player boulder physics
    if (this.boulder) {
      const b = this.boulder;
      b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      // impact vs castle box
      if (b.x >= CASTLE_X && b.x <= CASTLE_X + CASTLE_W && b.y >= CASTLE_Y) {
        this._impact(b.x, b.y, sound); this.boulder = null;
      } else if (b.y >= GROUND) {
        if (sound) sound.thud();
        this.shake = 0.4; this.msg = 'Short! Adjust your aim.'; this.boulder = null;
      } else if (b.x > W + 20) { this.boulder = null; this.msg = 'Over the walls! Ease the power.'; }
    }

    // enemy return fire
    this.enemyTimer -= dt;
    if (this.enemyTimer <= 0 && !this.enemyShot) {
      this.enemyShot = { x: CASTLE_X + 10, y: CASTLE_Y + 6, vx: -(120 + Math.random() * 30), vy: -140, warn: 0.0 };
      this.enemyTimer = 3.2 - this.foeSkill * 1.4 + Math.random();
      if (sound) sound.launch();
    }
    if (this.enemyShot) {
      const e = this.enemyShot;
      e.vy += G * dt; e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.y >= GROUND - 6 && e.x < 90) {
        // lands near your engine
        let d = 10 + Math.random() * 8;
        if (this.cover > 0) { d *= 0.35; if (sound) sound.select(); }
        this.hp = Math.max(0, this.hp - d);
        if (sound) sound.thud();
        this.shake = 0.6; this.hitFlash = 0.5;
        this.enemyShot = null;
        this.msg = this.cover > 0 ? 'You duck behind the mantlet!' : 'Their stone smashes your lines!';
      } else if (e.y >= GROUND || e.x < -10) { this.enemyShot = null; }
    }

    // win / lose
    if (this.dmg >= 1) return this._end(true, 'The wall is breached — into the castle!', sound);
    if (this.hp <= 0) return this._end(false, 'Your host is broken. The siege is lifted.', sound);
  }

  _fire(sound) {
    this.charging = false;
    const speed = 150 + this.power * 190;
    this.boulder = { x: 52, y: GROUND - 20, vx: Math.cos(this.angle) * speed, vy: -Math.sin(this.angle) * speed };
    this.power = 0; this.shots++;
    if (sound) sound.launch();
  }

  _impact(x, y, sound) {
    this.hits++;
    // more damage the lower on the wall (undermining) and the more central
    const depth = (y - CASTLE_Y) / CASTLE_H;
    const gain = 0.1 + depth * 0.14;
    this.dmg = Math.min(1, this.dmg + gain);
    this.hitFlash = 0.4; this.shake = 0.5; this.flash = 0.15;
    this.msg = `A hit! The ramparts crack (${Math.round(this.dmg * 100)}%).`;
    if (sound) { sound.crumble(); }
  }

  _end(win, msg, sound) {
    this.win = win; this.msg = msg; this.phase = 'over'; this.timer = 1.8;
    if (sound) win ? sound.fanfare() : sound.dirge();
  }

  render(ctx, frame) {
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 6 : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 3 : 0;
    ctx.save(); ctx.translate(sx, sy);
    // dramatic sky
    S.skyGradient(ctx, W, H, '#c86840', '#e8b060');
    S.drawClouds(ctx, W, H, frame * 0.1);
    // hills
    ctx.fillStyle = '#4a5a3a'; ctx.beginPath(); ctx.moveTo(0, 150); ctx.quadraticCurveTo(160, 110, 320, 150); ctx.lineTo(320, GROUND); ctx.lineTo(0, GROUND); ctx.fill();
    // the castle on its motte
    ctx.fillStyle = '#5a6a48'; ctx.fillRect(CASTLE_X - 14, GROUND - 20, CASTLE_W + 40, 40);
    S.drawCastle(ctx, CASTLE_X, CASTLE_Y, CASTLE_W, CASTLE_H, this.foe, this.dmg);
    // ground
    ctx.fillStyle = S.PAL.moorD; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = S.PAL.moor; ctx.fillRect(0, GROUND, W, 4);

    // your catapult
    S.drawCatapult(ctx, 52, GROUND - 4, this.charging ? (0.2 + this.power * 0.9) : this.angle, this.her);
    // a few of your soldiers behind it
    for (let i = 0; i < 4; i++) S.drawSoldier(ctx, 14 + i * 8, GROUND, 1, this.her);

    // boulders
    if (this.boulder) { ctx.fillStyle = '#5a5048'; ctx.beginPath(); ctx.arc(this.boulder.x, this.boulder.y, 4, 0, Math.PI * 2); ctx.fill(); }
    if (this.enemyShot) {
      ctx.fillStyle = '#3a3230'; ctx.beginPath(); ctx.arc(this.enemyShot.x, this.enemyShot.y, 4, 0, Math.PI * 2); ctx.fill();
      // incoming warning
      txt(ctx, 'INCOMING! Z=cover', 60, 40, '#ffd050', 9, 'center');
    }

    // aim guide arc when charging
    if (!this.boulder && (this.charging || this.phase === 'aim')) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([2, 3]); ctx.beginPath();
      const spd = 150 + (this.charging ? this.power : 0.5) * 190;
      let px = 52, py = GROUND - 20, vx = Math.cos(this.angle) * spd, vy = -Math.sin(this.angle) * spd;
      ctx.moveTo(px, py);
      for (let i = 0; i < 22; i++) { vy += G * 0.05; px += vx * 0.05; py += vy * 0.05; if (py > GROUND) break; ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
    }

    // HUD gauges
    // power meter
    ctx.fillStyle = '#00000088'; ctx.fillRect(10, 150, 10, 34);
    ctx.fillStyle = this.power > 0.85 ? '#e04030' : S.PAL.gold; ctx.fillRect(10, 184 - this.power * 34, 10, this.power * 34);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(10, 150, 10, 34);
    txt(ctx, 'PWR', 6, 140, '#fff', 8);
    txt(ctx, 'ANG ' + Math.round(this.angle * 57) + '°', 26, 150, '#fff', 8);

    ctx.restore();

    // top HUD: wall breach + your host
    bar(ctx, 8, 8, 120, 8, this.dmg, '#c04030', 'BREACH');
    bar(ctx, W - 128, 8, 120, 8, this.hp / 100, this.her.color, 'HOST');
    if (this.hitFlash > 0) { ctx.fillStyle = `rgba(200,40,30,${this.hitFlash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,240,200,${this.flash})`; ctx.fillRect(0, 0, W, H); }

    banner(ctx, this.msg);
    if (this.phase === 'intro') centerTitle(ctx, this.title, 'Bring down the walls');
    if (this.phase === 'over') centerTitle(ctx, this.win ? 'BREACH!' : 'REPULSED', this.msg);
  }
}

function bar(ctx, x, y, w, h, v, col, label) {
  ctx.fillStyle = '#00000099'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  txt(ctx, label, x, y - 9, '#f0e0c0', 8);
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
