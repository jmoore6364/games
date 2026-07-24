// fighter.js — Fighter state machine, moves, hit/hurtboxes, projectiles, procedural sprites.

export const FLOOR_Y = 316;      // screen y of the floor (feet rest here)
export const STAGE_W = 960;      // world width
export const VIEW_W = 640;
export const VIEW_H = 360;

// ---- Fighter definitions (two visually distinct Moore fighters) ----
export const FIGHTERS = {
  ryu: {
    id: 'ryu', name: 'RYZEN MOORE',
    gi: '#3a6ea5', giDark: '#28517d', trim: '#eef2f6', belt: '#12233a',
    skin: '#e6b088', skinDark: '#c48f66', hair: '#3a2a1a', band: '#c9302c',
    glove: '#d9451f', build: 1.0, girth: 1.0,
    fire: { core: '#e8f4ff', mid: '#5bb8ff', edge: '#1f6fd6' },
    tagline: 'Balanced. Textbook fireball & uppercut.',
  },
  ken: {
    id: 'ken', name: 'KANGA MOORE',
    gi: '#c0392b', giDark: '#8f2418', trim: '#f6e7d2', belt: '#2a1208',
    skin: '#d99a6c', skinDark: '#b47a4e', hair: '#e8c24a', band: '#2a1208',
    glove: '#7a3b12', build: 1.08, girth: 1.14,
    fire: { core: '#fff2cf', mid: '#ff9a2e', edge: '#d1490c' },
    tagline: 'Bulkier bruiser. Fiery orange special.',
  },
};

// ---- Move table (frames @ 60fps) ----
// hb: hitbox — minR/maxR forward reach from center, cy height of box center above floor, hh half-height.
const M = (o) => o;
export const MOVES = {
  pL: M({ kind: 'punch', label: 'Jab', startup: 4, active: 3, recovery: 7, dmg: 5, hitstun: 12, blockstun: 8, kb: 2.4, knockdown: false, hb: { minR: 18, maxR: 60, cy: 86, hh: 13 }, sfxHit: 'hitLight' }),
  pH: M({ kind: 'punch', label: 'Strong', startup: 7, active: 4, recovery: 15, dmg: 11, hitstun: 17, blockstun: 12, kb: 6, knockdown: false, hb: { minR: 20, maxR: 74, cy: 84, hh: 17 }, sfxHit: 'hitHeavy' }),
  kL: M({ kind: 'kick', label: 'Short', startup: 6, active: 4, recovery: 11, dmg: 7, hitstun: 13, blockstun: 9, kb: 3.6, knockdown: false, hb: { minR: 22, maxR: 70, cy: 44, hh: 17 }, sfxHit: 'hitLight' }),
  kH: M({ kind: 'kick', label: 'Roundhouse', startup: 10, active: 5, recovery: 20, dmg: 14, hitstun: 20, blockstun: 15, kb: 8.5, knockdown: true, hb: { minR: 24, maxR: 88, cy: 62, hh: 24 }, sfxHit: 'hitHeavy' }),
  sweep: M({ kind: 'kick', label: 'Sweep', startup: 9, active: 4, recovery: 20, dmg: 10, hitstun: 18, blockstun: 12, kb: 5, knockdown: true, low: true, hb: { minR: 22, maxR: 92, cy: 16, hh: 14 }, sfxHit: 'hitHeavy' }),
  airK: M({ kind: 'kick', label: 'Jump Kick', startup: 4, active: 8, recovery: 4, dmg: 9, hitstun: 16, blockstun: 10, kb: 4, knockdown: false, air: true, hb: { minR: 14, maxR: 62, cy: 40, hh: 26 }, sfxHit: 'hitLight' }),
  airP: M({ kind: 'punch', label: 'Jump Punch', startup: 4, active: 7, recovery: 4, dmg: 8, hitstun: 15, blockstun: 9, kb: 3.5, knockdown: false, air: true, hb: { minR: 12, maxR: 54, cy: 56, hh: 24 }, sfxHit: 'hitLight' }),
  fireball: M({ kind: 'special', label: 'Fireball', startup: 11, active: 2, recovery: 24, projectile: true }),
  uppercut: M({ kind: 'special', label: 'Uppercut', startup: 3, active: 12, recovery: 26, dmg: 16, hitstun: 24, blockstun: 14, kb: 5, kbUp: 9, knockdown: true, rising: true, invuln: 7, hb: { minR: 10, maxR: 54, cy: 78, hh: 44 }, sfxHit: 'hitHeavy' }),
};

export class Projectile {
  constructor(owner, dir, def) {
    this.owner = owner;
    this.dir = dir;
    this.def = def;
    this.x = owner.x + dir * 42;
    this.y = FLOOR_Y - 78;
    this.vx = dir * 5.2;
    this.r = 16;
    this.life = 200;
    this.dead = false;
    this.dmg = 9;
    this.hitstun = 18;
    this.blockstun = 12;
    this.kb = 6;
    this.t = 0;
  }
  update() {
    this.x += this.vx;
    this.t++;
    this.life--;
    if (this.life <= 0 || this.x < -40 || this.x > STAGE_W + 40) this.dead = true;
  }
  rect() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  draw(ctx) {
    const f = this.def.fire;
    const pulse = 1 + Math.sin(this.t * 0.4) * 0.12;
    const R = this.r * pulse;
    // trailing streaks
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.16 * (4 - i);
      ctx.fillStyle = f.mid;
      ctx.beginPath();
      ctx.ellipse(this.x - this.dir * i * 12, this.y, R * (1 - i * 0.12), R * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, R + 4);
    g.addColorStop(0, f.core);
    g.addColorStop(0.45, f.mid);
    g.addColorStop(1, f.edge);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, R + 4, 0, Math.PI * 2);
    ctx.fill();
    // spark bits
    ctx.fillStyle = f.core;
    for (let i = 0; i < 4; i++) {
      const a = this.t * 0.5 + i * 1.57;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(this.x + Math.cos(a) * R * 0.7, this.y + Math.sin(a) * R * 0.7, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export class Fighter {
  constructor(def, x, facing, side) {
    this.def = def;
    this.x = x;
    this.airY = 0;         // height above floor (>=0)
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;  // 1 right, -1 left
    this.side = side;      // 'left' | 'right' HUD side
    this.maxHp = 100;
    this.hp = 100;
    this.state = 'idle';
    this.attack = null;    // { key, move, timer, phase, hasHit }
    this.hitstun = 0;
    this.blockstun = 0;
    this.blocking = false;
    this.crouching = false;
    this.animT = 0;
    this.walkPhase = 0;
    this.grounded = true;
    this.invuln = 0;
    this.wins = 0;
    this.koTimer = 0;
    this.flashT = 0;
    this.scale = def.build;
    this.pushLock = 0;
  }

  reset(x, facing) {
    this.x = x; this.facing = facing;
    this.airY = 0; this.vx = 0; this.vy = 0;
    this.hp = this.maxHp; this.state = 'idle'; this.attack = null;
    this.hitstun = 0; this.blockstun = 0; this.blocking = false;
    this.crouching = false; this.grounded = true; this.invuln = 0;
    this.koTimer = 0; this.flashT = 0;
  }

  get busy() { return this.attack || this.hitstun > 0 || this.state === 'ko' || this.state === 'knockdown'; }
  get dead() { return this.hp <= 0; }

  height() {
    const base = 100 * this.scale;
    return this.crouching ? base * 0.62 : base;
  }

  hurtRect() {
    const feetY = FLOOR_Y - this.airY;
    const h = this.height();
    const w = 40 * this.def.girth;
    return { x: this.x - w / 2, y: feetY - h, w, h };
  }

  hitRect() {
    if (!this.attack || this.state === 'ko') return null;
    const a = this.attack;
    if (a.phase !== 'active') return null;
    const mv = a.move;
    if (!mv.hb) return null;
    const feetY = FLOOR_Y - this.airY;
    const near = this.x + this.facing * mv.hb.minR;
    const far = this.x + this.facing * mv.hb.maxR;
    const x0 = Math.min(near, far);
    const w = Math.abs(far - near);
    const yc = feetY - mv.hb.cy;
    return { x: x0, y: yc - mv.hb.hh, w, h: mv.hb.hh * 2 };
  }

  startAttack(key, mv) {
    this.attack = { key, move: mv, timer: 0, phase: 'startup', hasHit: false };
    this.crouching = false;
    if (mv.rising) { this.airY = 0.01; this.vy = 12; this.grounded = false; }
    if (mv.invuln) this.invuln = mv.invuln;
  }

  update(cmd, opp, cb) {
    this.animT++;
    if (this.flashT > 0) this.flashT--;
    if (this.invuln > 0) this.invuln--;

    // Auto-face opponent when grounded and free.
    if (this.grounded && !this.attack && this.hitstun <= 0 && this.state !== 'ko' && this.state !== 'knockdown') {
      this.facing = opp.x >= this.x ? 1 : -1;
    }

    // ---- KO / knockdown handling ----
    if (this.state === 'ko') {
      this.applyPhysics();
      return;
    }
    if (this.state === 'knockdown') {
      this.koTimer--;
      this.applyPhysics();
      if (this.koTimer <= 0 && this.grounded) {
        this.state = 'idle';
        this.hitstun = 6;
      }
      return;
    }

    if (this.hitstun > 0) {
      this.hitstun--;
      this.applyPhysics();
      if (this.hitstun <= 0 && this.grounded) this.state = 'idle';
      return;
    }

    // ---- Attack in progress ----
    if (this.attack) {
      this.advanceAttack(cb);
      this.applyPhysics();
      return;
    }

    this.blocking = false;

    // ---- Airborne (jump) ----
    if (!this.grounded) {
      this.state = 'jump';
      // air attacks
      if (cmd.pLPressed || cmd.pHPressed) { this.startAttack('airP', MOVES.airP); this.applyPhysics(); return; }
      if (cmd.kLPressed || cmd.kHPressed) { this.startAttack('airK', MOVES.airK); this.applyPhysics(); return; }
      this.applyPhysics();
      return;
    }

    // ---- Grounded actions ----
    this.crouching = cmd.down;

    // Blocking: hold away from opponent (grounded, not attacking).
    const awayHeld = cmd.moveX !== 0 && Math.sign(cmd.moveX) === -this.facing;
    this.blocking = awayHeld;

    // Specials via motion (checked by main → cmd.special flag)
    if (cmd.special === 'fireball') { this.startAttack('fireball', MOVES.fireball); this.applyPhysics(); return; }
    if (cmd.special === 'uppercut') { this.startAttack('uppercut', MOVES.uppercut); cb.sound('uppercut'); this.applyPhysics(); return; }

    // Normals
    if (cmd.pLPressed) { this.doNormal('pL', cb); return; }
    if (cmd.pHPressed) { this.doNormal('pH', cb); return; }
    if (cmd.kLPressed) { this.doNormal(cmd.down ? 'sweep' : 'kL', cb); return; }
    if (cmd.kHPressed) { this.doNormal(cmd.down ? 'sweep' : 'kH', cb); return; }

    // Jump
    if (cmd.jumpPressed) {
      this.vy = 12.2;
      this.grounded = false;
      this.airY = 0.01;
      this.vx = cmd.moveX * 3.4;
      this.state = 'jump';
      cb.sound('jump');
      this.applyPhysics();
      return;
    }

    // Movement / crouch / idle
    if (cmd.down) {
      this.state = 'crouch';
      this.vx *= 0.6;
    } else if (cmd.moveX !== 0 && !awayHeld) {
      this.state = 'walk';
      const forward = Math.sign(cmd.moveX) === this.facing;
      this.vx = cmd.moveX * (forward ? 2.7 : 2.1);
      this.walkPhase += 0.22 * (forward ? 1 : -1);
    } else if (awayHeld) {
      this.state = 'block';
      this.vx = cmd.moveX * 1.6;
      this.walkPhase += 0.16 * Math.sign(cmd.moveX);
    } else {
      this.state = 'idle';
      this.vx *= 0.5;
    }
    this.applyPhysics();
  }

  doNormal(key, cb) {
    const mv = MOVES[key];
    this.startAttack(key, mv);
    this.vx *= 0.3;
    cb.sound('whiff');
  }

  advanceAttack(cb) {
    const a = this.attack;
    a.timer++;
    const mv = a.move;
    const total = mv.startup + mv.active + mv.recovery;
    if (a.timer <= mv.startup) a.phase = 'startup';
    else if (a.timer <= mv.startup + mv.active) {
      if (a.phase !== 'active') {
        a.phase = 'active';
        if (mv.projectile) { cb.fireball(this); cb.sound('fireball'); }
      }
    } else a.phase = 'recovery';

    // friction during attack
    this.vx *= 0.86;
    if (a.timer >= total) {
      this.attack = null;
      this.state = this.grounded ? 'idle' : 'jump';
    }
  }

  applyPhysics() {
    // gravity
    if (!this.grounded || this.airY > 0) {
      this.airY += this.vy;
      this.vy -= 0.62;
      if (this.airY <= 0) {
        this.airY = 0; this.vy = 0;
        if (!this.grounded) {
          this.grounded = true;
          if (this.state === 'jump') this.state = 'idle';
          if (this.attack && this.attack.move.air) { this.attack = null; this.state = 'idle'; }
        }
      } else {
        this.grounded = false;
      }
    }
    // horizontal
    this.x += this.vx;
    if (this.grounded) this.vx *= 0.8;
    else this.vx *= 0.99;
    // clamp to stage
    const pad = 26;
    if (this.x < pad) { this.x = pad; if (this.vx < 0) this.vx = 0; }
    if (this.x > STAGE_W - pad) { this.x = STAGE_W - pad; if (this.vx > 0) this.vx = 0; }
  }

  // Called by main when this fighter is hit by a move or projectile.
  receiveHit(mv, srcFacing, cb) {
    if (this.state === 'ko') return { result: 'ignored' };
    if (this.invuln > 0) return { result: 'invuln' };

    const canBlock = this.blocking && this.grounded && this.state !== 'knockdown';
    if (canBlock) {
      const chip = Math.max(1, Math.round(mv.dmg * 0.16));
      this.hp = Math.max(0, this.hp - chip);
      this.blockstun = mv.blockstun;
      this.hitstun = mv.blockstun;
      this.state = 'block';
      this.vx = srcFacing * 2.4;
      this.flashT = 4;
      cb.sound('block');
      return { result: 'blocked', x: this.x + srcFacing * -18, y: FLOOR_Y - mv.hb.cy };
    }

    this.hp = Math.max(0, this.hp - mv.dmg);
    this.attack = null;
    this.hitstun = mv.hitstun;
    this.flashT = 6;
    this.vx = srcFacing * mv.kb;
    this.facing = -srcFacing;
    const sparkX = this.x + srcFacing * -14;
    const sparkY = FLOOR_Y - (mv.hb ? mv.hb.cy : 78) - this.airY * 0;

    if (this.hp <= 0) {
      this.state = 'knockdown';
      this.koTimer = 100000; // stays down; round handler flips to ko
      this.vy = 8; this.airY = 0.01; this.grounded = false;
      this.vx = srcFacing * (mv.kb + 3);
      cb.sound(mv.sfxHit || 'hitHeavy');
      return { result: 'ko', x: sparkX, y: sparkY, big: true };
    }

    if (mv.knockdown || mv.kbUp) {
      this.state = 'knockdown';
      this.koTimer = 46;
      this.vy = mv.kbUp || 7.5;
      this.airY = 0.01; this.grounded = false;
      cb.sound(mv.sfxHit || 'hitHeavy');
      return { result: 'knockdown', x: sparkX, y: sparkY, big: true };
    }

    this.state = 'hit';
    cb.sound(mv.sfxHit || 'hitLight');
    return { result: 'hit', x: sparkX, y: sparkY, big: mv.dmg >= 10 };
  }

  setKO() {
    this.state = 'ko';
    this.attack = null;
  }

  // ---------------- RENDERING ----------------
  draw(ctx) {
    const feetY = FLOOR_Y - this.airY;
    const cx = this.x;
    // shadow
    const shScale = 1 - this.airY / 260;
    ctx.globalAlpha = 0.28 * Math.max(0.3, shScale);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, FLOOR_Y + 2, 30 * this.def.girth * Math.max(0.4, shScale), 8 * Math.max(0.4, shScale), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const P = this.pose();
    const f = this.facing;
    const S = this.scale;
    const d = this.def;
    // transform helper: local (forward, up) -> screen
    const TX = (fx, up) => cx + f * fx;
    const TY = (fx, up) => feetY - up;

    const hipX = TX(P.hip.fx, P.hip.up), hipY = TY(P.hip.fx, P.hip.up);
    const shX = TX(P.sh.fx, P.sh.up), shY = TY(P.sh.fx, P.sh.up);
    const headX = TX(P.head.fx, P.head.up), headY = TY(P.head.fx, P.head.up);

    const legLen = 52 * S;
    const armLen = 44 * S;
    const limbW = 12 * S * d.girth;
    const armW = 10 * S;

    // feet
    const bf = { x: TX(P.backFoot.fx, 0), y: TY(0, P.backFoot.up) };
    const ff = { x: TX(P.frontFoot.fx, 0), y: TY(0, P.frontFoot.up) };
    // hands
    const bh = { x: TX(P.backHand.fx, P.backHand.up), y: TY(0, P.backHand.up) };
    const fh = { x: TX(P.frontHand.fx, P.frontHand.up), y: TY(0, P.frontHand.up) };

    const flash = this.flashT > 0 && (this.flashT % 2 === 0);

    // ---- BACK LEG ----
    this.drawLimb(ctx, hipX, hipY, bf.x, bf.y, legLen, limbW, f, +1, d.giDark, d.giDark, d.skinDark, false);
    // ---- BACK ARM ----
    this.drawLimb(ctx, shX, shY, bh.x, bh.y, armLen, armW, f, +1, d.skinDark, d.giDark, d.skinDark, true, d.glove);

    // ---- TORSO ----
    this.drawTorso(ctx, hipX, hipY, shX, shY, limbW, flash);

    // ---- FRONT LEG ----
    this.drawLimb(ctx, hipX, hipY, ff.x, ff.y, legLen, limbW * 1.02, f, -1, d.gi, d.giDark, d.skin, false);
    // ---- FRONT ARM ----
    this.drawLimb(ctx, shX, shY, fh.x, fh.y, armLen, armW, f, -1, d.skin, d.gi, d.skin, true, d.glove);

    // ---- HEAD ----
    this.drawHead(ctx, headX, headY, f, flash);

    // block sparkle
    if (this.state === 'block' && this.blockstun > 0) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#bfe3ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc((fh.x + shX) / 2, (fh.y + shY) / 2, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawTorso(ctx, hipX, hipY, shX, shY, w, flash) {
    const d = this.def;
    const gw = w * 1.9 * d.girth;
    ctx.save();
    const ang = Math.atan2(shY - hipY, shX - hipX);
    const mx = (hipX + shX) / 2, my = (hipY + shY) / 2;
    ctx.translate(mx, my);
    ctx.rotate(ang - Math.PI / 2);
    const len = Math.hypot(shX - hipX, shY - hipY);
    // gi body
    ctx.fillStyle = flash ? '#fff' : d.gi;
    roundRect(ctx, -gw / 2, -len / 2 - 6, gw, len + 14, 8);
    ctx.fill();
    // shading
    ctx.fillStyle = flash ? '#fff' : d.giDark;
    roundRect(ctx, 2, -len / 2 - 6, gw / 2 - 2, len + 14, 8);
    ctx.fill();
    // belt
    ctx.fillStyle = flash ? '#fff' : d.belt;
    ctx.fillRect(-gw / 2, len / 2 - 6, gw, 9);
    // collar/trim
    ctx.strokeStyle = flash ? '#fff' : d.trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-gw / 2 + 3, -len / 2 - 4);
    ctx.lineTo(0, -len / 2 + 8);
    ctx.lineTo(gw / 2 - 3, -len / 2 - 4);
    ctx.stroke();
    ctx.restore();
  }

  drawHead(ctx, x, y, f, flash) {
    const d = this.def;
    const S = this.scale;
    const r = 15 * S;
    // hair back
    ctx.fillStyle = flash ? '#fff' : d.hair;
    ctx.beginPath();
    ctx.arc(x - f * 3, y - 2, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    // face
    ctx.fillStyle = flash ? '#fff' : d.skin;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // jaw shadow
    ctx.fillStyle = flash ? '#fff' : d.skinDark;
    ctx.beginPath();
    ctx.ellipse(x + f * 5, y + 4, r * 0.7, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    // headband
    ctx.fillStyle = flash ? '#fff' : d.band;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - r, y - r * 0.55, r * 2, 6 * S);
    ctx.clip();
    ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // band tail
    ctx.strokeStyle = flash ? '#fff' : d.band;
    ctx.lineWidth = 3.5 * S;
    ctx.beginPath();
    ctx.moveTo(x - f * (r - 1), y - r * 0.3);
    ctx.quadraticCurveTo(x - f * (r + 10), y - r * 0.3 + Math.sin(this.animT * 0.2) * 3, x - f * (r + 16), y + 4);
    ctx.stroke();
    // eye
    ctx.fillStyle = flash ? '#333' : '#20242c';
    ctx.beginPath();
    const eyeX = x + f * 6, eyeY = y + 1;
    if (this.state === 'ko') {
      ctx.lineWidth = 2; ctx.strokeStyle = '#20242c';
      ctx.beginPath(); ctx.moveTo(eyeX - 3, eyeY - 3); ctx.lineTo(eyeX + 3, eyeY + 3);
      ctx.moveTo(eyeX + 3, eyeY - 3); ctx.lineTo(eyeX - 3, eyeY + 3); ctx.stroke();
    } else {
      ctx.ellipse(eyeX, eyeY, 2.4 * S, 3 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2-segment limb with IK; upperColor for near-torso segment, footColor for the end.
  drawLimb(ctx, rx, ry, tx, ty, len, w, facing, bend, upperColor, jointColor, endColor, isArm, gloveColor) {
    const dx = tx - rx, dy = ty - ry;
    const dist = Math.max(2, Math.min(Math.hypot(dx, dy), len - 0.5));
    const half = len / 2;
    const a = Math.atan2(dy, dx);
    // law of cosines for elbow/knee offset
    const cosA = Math.max(-1, Math.min(1, (half * half + dist * dist - half * half) / (2 * half * dist)));
    const off = Math.acos(cosA);
    const midA = a + bend * facing * off * (isArm ? 1 : -1) * -1;
    const mx = rx + Math.cos(midA) * half;
    const my = ry + Math.sin(midA) * half;
    // upper segment
    capsule(ctx, rx, ry, mx, my, w, upperColor);
    // lower segment
    capsule(ctx, mx, my, tx, ty, w * 0.86, endColor);
    // joint
    ctx.fillStyle = jointColor;
    ctx.beginPath(); ctx.arc(mx, my, w * 0.55, 0, Math.PI * 2); ctx.fill();
    // hand/foot cap
    ctx.fillStyle = gloveColor || endColor;
    ctx.beginPath(); ctx.arc(tx, ty, w * (isArm ? 0.78 : 0.7), 0, Math.PI * 2); ctx.fill();
    if (isArm) {
      ctx.fillStyle = gloveColor || endColor;
      ctx.beginPath(); ctx.arc(tx, ty, w * 0.82, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Produce joint targets in local (forward fx, up) coords.
  pose() {
    const S = this.scale;
    const t = this.animT;
    const walk = this.walkPhase;
    let hipUp = 60 * S, shUp = 96 * S, headUp = 122 * S;
    let lean = 0;
    let backFoot = { fx: -18 * S, up: 0 };
    let frontFoot = { fx: 20 * S, up: 0 };
    let backHand = { fx: -8 * S, up: 74 * S };
    let frontHand = { fx: 14 * S, up: 78 * S };
    let hipFx = 0, shFx = 2 * S;

    const breathe = Math.sin(t * 0.08) * 1.5;

    switch (this.state) {
      case 'idle': {
        hipUp += breathe;
        shUp += breathe;
        headUp += breathe;
        // guard stance
        backHand = { fx: 6 * S, up: 82 * S + breathe };
        frontHand = { fx: 22 * S, up: 74 * S + breathe };
        backFoot = { fx: -20 * S, up: 0 };
        frontFoot = { fx: 22 * S, up: 0 };
        lean = 3 * S;
        break;
      }
      case 'walk':
      case 'block': {
        const s = Math.sin(walk);
        const c = Math.cos(walk);
        hipUp += Math.abs(c) * -3 * S;
        frontFoot = { fx: (18 + s * 16) * S, up: Math.max(0, c) * 14 * S };
        backFoot = { fx: (-18 + s * 16) * S, up: Math.max(0, -c) * 14 * S };
        if (this.state === 'block') {
          backHand = { fx: 16 * S, up: 70 * S };
          frontHand = { fx: 20 * S, up: 84 * S };
          lean = -8 * S;
        } else {
          backHand = { fx: 4 * S + s * 6 * S, up: 78 * S };
          frontHand = { fx: 20 * S - s * 6 * S, up: 76 * S };
          lean = 5 * S;
        }
        break;
      }
      case 'crouch': {
        hipUp = 34 * S; shUp = 66 * S; headUp = 90 * S;
        backFoot = { fx: -24 * S, up: 0 };
        frontFoot = { fx: 24 * S, up: 0 };
        backHand = { fx: 10 * S, up: 52 * S };
        frontHand = { fx: 22 * S, up: 50 * S };
        lean = 6 * S;
        break;
      }
      case 'jump': {
        hipUp = 58 * S; shUp = 92 * S; headUp = 116 * S;
        const tuck = this.vy < 0 ? 1 : 0.4;
        backFoot = { fx: -14 * S, up: 20 * S * (1 + tuck) };
        frontFoot = { fx: 16 * S, up: 14 * S * (1 + tuck) };
        backHand = { fx: -6 * S, up: 90 * S };
        frontHand = { fx: 12 * S, up: 96 * S };
        lean = 4 * S;
        break;
      }
      case 'hit': {
        lean = -14 * S;
        hipUp = 58 * S;
        headUp = 116 * S;
        backHand = { fx: -14 * S, up: 84 * S };
        frontHand = { fx: -2 * S, up: 90 * S };
        backFoot = { fx: -24 * S, up: 0 };
        frontFoot = { fx: 10 * S, up: 4 * S };
        break;
      }
      case 'knockdown': {
        // spinning fall
        const spin = Math.min(1, (46 - Math.max(0, this.koTimer)) / 20);
        hipUp = 40 * S - spin * 10 * S;
        shUp = 70 * S - spin * 20 * S;
        headUp = 96 * S - spin * 30 * S;
        lean = -30 * S * spin;
        backFoot = { fx: -20 * S, up: 20 * S };
        frontFoot = { fx: 28 * S, up: 24 * S };
        backHand = { fx: -24 * S, up: 80 * S };
        frontHand = { fx: -10 * S, up: 86 * S };
        break;
      }
      case 'ko': {
        // lying on back
        hipUp = 16 * S; shUp = 18 * S; headUp = 20 * S;
        hipFx = -10 * S; shFx = 14 * S;
        headUp = 22 * S;
        backFoot = { fx: -34 * S, up: 8 * S };
        frontFoot = { fx: -20 * S, up: 26 * S };
        backHand = { fx: 20 * S, up: 14 * S };
        frontHand = { fx: 34 * S, up: 18 * S };
        lean = 40 * S;
        break;
      }
      case 'victory': {
        hipUp += breathe; shUp += breathe; headUp += breathe;
        backHand = { fx: 4 * S, up: 120 * S + Math.sin(t * 0.15) * 4 };
        frontHand = { fx: 18 * S, up: 96 * S };
        backFoot = { fx: -20 * S, up: 0 };
        frontFoot = { fx: 22 * S, up: 0 };
        break;
      }
    }

    // ---- attack poses override hands/feet ----
    if (this.attack) {
      const a = this.attack;
      const mv = a.move;
      const prog = a.phase === 'startup' ? a.timer / mv.startup
        : a.phase === 'active' ? 1
          : Math.max(0, 1 - (a.timer - mv.startup - mv.active) / mv.recovery);
      const ext = a.phase === 'recovery' ? prog : Math.min(1, prog);
      if (mv.kind === 'punch') {
        const reach = (mv.hb ? mv.hb.maxR : 60);
        frontHand = { fx: (10 + ext * (reach - 22)), up: (mv.hb ? mv.hb.cy : 82) };
        backHand = { fx: 4 * S, up: 78 * S };
        lean = 8 * S + ext * 6 * S;
        if (mv.rising) { // uppercut
          frontHand = { fx: 8 + ext * 20, up: 60 + ext * 60 };
          backHand = { fx: 2, up: 84 };
          lean = 2 * S;
        }
        if (mv.air) { frontHand = { fx: 10 + ext * 30, up: 60 - ext * 8 }; }
      } else if (mv.kind === 'kick') {
        const reach = (mv.hb ? mv.hb.maxR : 70);
        const kh = (mv.hb ? mv.hb.cy : 50);
        frontFoot = { fx: (14 + ext * (reach - 18)), up: kh * (mv.low ? 0.2 : 1) };
        if (mv.low) frontFoot.up = 4;
        backFoot = { fx: -20 * S, up: 0 };
        hipUp = (mv.low ? 40 : 58) * S;
        lean = -6 * S + (mv.low ? 4 : 0);
        frontHand = { fx: -4 * S, up: 82 * S };
        backHand = { fx: -12 * S, up: 76 * S };
        if (mv.air) {
          frontFoot = { fx: 12 + ext * 34, up: 34 };
          backFoot = { fx: -16, up: 30 };
        }
      } else if (mv.kind === 'special') {
        // fireball thrust
        const push = a.phase === 'startup' ? a.timer / mv.startup : 1 - (a.phase === 'recovery' ? (a.timer - mv.startup - mv.active) / mv.recovery : 0);
        hipUp = 54 * S;
        frontHand = { fx: 8 + push * 34, up: 72 };
        backHand = { fx: 4 + push * 24, up: 70 };
        lean = 4 * S + push * 6;
        frontFoot = { fx: 26 * S, up: 0 };
        backFoot = { fx: -22 * S, up: 0 };
      }
    }

    return {
      hip: { fx: hipFx, up: hipUp },
      sh: { fx: shFx + lean, up: shUp },
      head: { fx: shFx + lean * 1.1, up: headUp },
      backFoot, frontFoot, backHand, frontHand,
    };
  }
}

// ---- draw helpers ----
export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function capsule(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
