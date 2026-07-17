// Robot Master and Dr. Moorly boss AI for Mega Moore.
// Every boss runs a repeating hand-authored pattern; each takes 3x damage
// from one specific earned weapon (see WEAK / README weakness chart).

import { TILE } from './levels.js';
import { SPR, drawSprite } from './sprites.js';
import { overlap, GRAV } from './entities.js';

export const BOSSES = {
  torch: { name: 'TORCH MOORE', weapon: 'T', weak: 'F', spr: 'bm_torch' },
  frost: { name: 'FROST MOORE', weapon: 'F', weak: 'G', spr: 'bm_frost' },
  gear: { name: 'GEAR MOORE', weapon: 'G', weak: 'V', spr: 'bm_gear' },
  volt: { name: 'VOLT MOORE', weapon: 'V', weak: 'T', spr: 'bm_volt' },
  moorly: { name: 'DR. MOORLY', weapon: null, weak: 'G', spr: 'moorly' },
};

// base damage per player weapon vs bosses (x3 when it is the weakness)
const WDMG = { P: 1, T: 2, F: 1, G: 2, V: 2 };

export class Boss {
  constructor(game, id, x, y) {
    this.id = id;
    this.def = BOSSES[id];
    this.x = x; this.y = y;
    this.w = id === 'moorly' ? 28 : 16;
    this.h = id === 'moorly' ? 24 : 21;
    this.hp = 28;
    this.maxHp = 28;
    this.vx = 0; this.vy = 0;
    this.face = -1;
    this.state = 'fall'; // fall -> wait (intro) -> fight
    this.t = 0;
    this.phase = 0;
    this.iv = 0;
    this.orbs = null;
    this.dead = false;
    this.contact = 6;
  }

  hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  hurt(game, b) {
    if (this.iv > 0 || this.dead || this.state !== 'fight') { game.sound.clink(); return; }
    if (this.id === 'volt' && this.orbs && this.orbs.length) { game.sound.clink(); return; }
    const kind = { buster: 'P', torch: 'T', frost: 'F', gear: 'G', volt: 'V' }[b.kind] || 'P';
    const dmg = WDMG[kind] * (kind === this.def.weak ? 3 : 1);
    this.hp -= dmg;
    this.iv = 20;
    game.sound.ehit();
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  arena(game) {
    const x0 = game.stage.bossRoomX * TILE;
    return { x0: x0 + 4, x1: x0 + 240 - this.w - 4, floor: 13 * TILE };
  }

  landGround() {
    if (this.y + this.h >= 13 * TILE) {
      this.y = 13 * TILE - this.h;
      this.vy = 0;
      return true;
    }
    return false;
  }

  update(game) {
    if (this.iv > 0) this.iv--;
    this.t++;
    const P = game.player;
    const A = this.arena(game);
    const dir = P.x + P.w / 2 > this.x + this.w / 2 ? 1 : -1;

    if (this.state === 'fall') {
      this.vy += GRAV * 1.6;
      this.y += this.vy;
      if (this.landGround()) { this.state = 'wait'; game.sound.land(); }
      return;
    }
    if (this.state !== 'fight') return;

    switch (this.id) {
      case 'torch': this.aiTorch(game, A, dir); break;
      case 'frost': this.aiFrost(game, A, dir); break;
      case 'gear': this.aiGear(game, A, dir); break;
      case 'volt': this.aiVolt(game, A, dir); break;
      case 'moorly': this.aiMoorly(game, A, dir); break;
    }
  }

  // Small hop x2, big leap over the player, then a volley of arcing fire.
  aiTorch(game, A, dir) {
    const grounded = this.grounded;
    this.vy += GRAV;
    this.x += this.vx; this.y += this.vy;
    this.x = Math.max(A.x0, Math.min(A.x1, this.x));
    this.grounded = this.landGround();
    if (this.grounded) {
      this.vx = 0;
      if (this.t > 40) {
        this.t = 0;
        this.face = dir;
        this.phase = (this.phase + 1) % 3;
        if (this.phase < 2) { // short hop toward the player
          this.vy = -3.4; this.vx = 1.4 * dir;
        } else { // big leap + landing volley
          this.vy = -5.2; this.vx = 2.1 * dir;
          this.volley = true;
        }
      }
      if (!grounded && this.volley) { // just landed from the big leap
        this.volley = false;
        for (const [vx, vy] of [[2.0, -4.2], [2.8, -3.4]]) {
          game.ebullets.push({ kind: 'torch', x: this.x + 4, y: this.y + 2, w: 9, h: 9, vx: vx * this.face, vy, dmg: 4 });
        }
        game.sound.wfire('T');
      }
    }
  }

  // Slide dash across the floor, icicle fan, then a shard-raining jump.
  aiFrost(game, A, dir) {
    this.vy += GRAV;
    this.y += this.vy;
    const onFloor = this.landGround();
    if (this.phase === 0) { // wait
      if (this.t > 30 && onFloor) { this.phase = 1; this.t = 0; this.face = dir; this.dashV = 3.1 * dir; }
    } else if (this.phase === 1) { // dash
      this.x += this.dashV;
      if (this.x <= A.x0 || this.x >= A.x1 || this.t > 70) {
        this.x = Math.max(A.x0, Math.min(A.x1, this.x));
        this.phase = 2; this.t = 0; this.face = dir;
      }
    } else if (this.phase === 2) { // icicle fan
      if (this.t === 16) {
        for (const vy of [-1.2, 0, 1.2]) {
          game.ebullets.push({ kind: 'ice', x: this.x + 4, y: this.y + 6, w: 9, h: 4, vx: 3.2 * this.face, vy, dmg: 3 });
        }
        game.sound.wfire('F');
      }
      if (this.t > 40) { this.phase = 3; this.t = 0; this.vy = -4.6; this.vx = 1.3 * dir; this.face = dir; }
    } else if (this.phase === 3) { // shard-raining jump
      this.x += this.vx;
      this.x = Math.max(A.x0, Math.min(A.x1, this.x));
      if (this.t === 14) {
        for (const vx of [-1.4, 1.4]) {
          game.ebullets.push({ kind: 'ice', x: this.x + 4, y: this.y + this.h, w: 6, h: 8, vx, vy: 2.6, dmg: 3 });
        }
        game.sound.wfire('F');
      }
      if (onFloor && this.t > 20) { this.phase = 0; this.t = 0; this.vx = 0; }
    }
  }

  // Two boomerang gears at head/knee height, then a dashing leap across.
  aiGear(game, A, dir) {
    this.vy += GRAV;
    this.x += this.vx; this.y += this.vy;
    this.x = Math.max(A.x0, Math.min(A.x1, this.x));
    const onFloor = this.landGround();
    if (onFloor) this.vx = 0;
    if (this.phase === 0 && onFloor) {
      this.face = dir;
      if (this.t === 30 || this.t === 62) {
        const high = this.t === 30;
        game.ebullets.push({
          kind: 'gear', x: this.x + 4, y: this.y + (high ? 0 : 12), w: 11, h: 11,
          vx: 3.2 * dir, vy: 0, dir, dmg: 4,
        });
        game.sound.wfire('G');
      }
      if (this.t > 100) { this.phase = 1; this.t = 0; }
    } else if (this.phase === 1 && onFloor) { // dash leap
      this.face = dir;
      this.vy = -3.8; this.vx = 2.6 * dir;
      this.phase = 2; this.t = 0;
    } else if (this.phase === 2 && onFloor && this.t > 6) {
      this.phase = 0; this.t = 0;
    }
  }

  // Teleport between posts, spin up a bolt shield, then launch it.
  aiVolt(game, A, dir) {
    this.vy += GRAV;
    this.y += this.vy;
    this.landGround();
    if (this.orbs) {
      for (const o of this.orbs) {
        if (o.gone) continue;
        if (o.mode === 'orbit') {
          o.ang += 0.13;
          o.x = this.x + this.w / 2 - 4 + Math.cos(o.ang) * 22;
          o.y = this.y + this.h / 2 - 4 + Math.sin(o.ang) * 22;
        } else {
          o.x += o.vx; o.y += o.vy;
          if (o.x < game.camX - 30 || o.x > game.camX + 286) o.gone = true;
        }
      }
      this.orbs = this.orbs.filter((o) => !o.gone);
      if (!this.orbs.length) this.orbs = null;
    }
    if (this.phase === 0) { // materialized, wait then shield up
      this.face = dir;
      if (this.t > 26) {
        this.t = 0; this.phase = 1;
        this.orbs = [];
        for (let i = 0; i < 3; i++) {
          this.orbs.push({ mode: 'orbit', ang: (i * Math.PI * 2) / 3, x: this.x, y: this.y, w: 8, h: 8, dmg: 4 });
        }
        game.sound.wfire('V');
      }
    } else if (this.phase === 1) { // shield spinning (deflects shots)
      this.face = dir;
      if (this.t > 85) {
        this.t = 0; this.phase = 2;
        const P = game.player;
        if (this.orbs) {
          for (const o of this.orbs) {
            const a = Math.atan2((P.y + 8) - o.y, (P.x + 6) - o.x);
            o.mode = 'fly'; o.vx = Math.cos(a) * 3.4; o.vy = Math.sin(a) * 3.4;
          }
        }
        game.sound.wfire('V');
      }
    } else if (this.phase === 2) { // vanish and teleport
      if (this.t === 30) game.sound.teleport();
      if (this.t > 44) {
        const spots = [A.x0 + 12, A.x0 + 104, A.x1 - 12];
        this.x = spots[(spots.indexOf(this.telePrev) + 1 + ((this.t % 2))) % 3] || spots[0];
        this.telePrev = this.x;
        this.y = 6 * TILE; this.vy = 0;
        this.phase = 0; this.t = 0;
        game.sound.teleport();
      }
    }
  }

  // Skull machine: hovers in a sine, swoops at the player, drops bombs.
  aiMoorly(game, A, dir) {
    const speed = this.hp <= 14 ? 1.45 : 1; // phase 2: enraged
    const cx = A.x0 + 104;
    if (this.phase === 0) { // hover
      this.hover = (this.hover || 0) + 0.03 * speed;
      this.x = cx + Math.sin(this.hover) * 88;
      this.y = 3 * TILE + Math.sin(this.hover * 2.3) * 10;
      this.face = dir;
      if (this.t > (this.hp <= 14 ? 90 : 140)) {
        this.t = 0; this.phase = 1;
        this.swoopX = game.player.x;
      }
      if (this.t % 52 === 26) {
        game.ebullets.push({ kind: 'bomb', x: this.x + this.w / 2 - 4, y: this.y + this.h, w: 8, h: 8, vx: 0, vy: 1, dmg: 4 });
      }
    } else if (this.phase === 1) { // swoop down
      const tx = this.swoopX, ty = 10 * TILE;
      this.x += Math.max(-2.6, Math.min(2.6, (tx - this.x) * 0.08)) * speed;
      this.y += (ty - this.y) * 0.06 * speed;
      if (this.t > 55) {
        this.t = 0; this.phase = 2;
        const P = game.player;
        const n = this.hp <= 14 ? 4 : 3;
        for (let i = 0; i < n; i++) {
          const a = Math.atan2((P.y + 8) - this.y, (P.x + 6) - this.x) + (i - (n - 1) / 2) * 0.28;
          game.ebullets.push({ kind: 'shot', x: this.x + this.w / 2, y: this.y + this.h / 2, w: 7, h: 7, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6, dmg: 4 });
        }
        game.sound.pew();
      }
    } else if (this.phase === 2) { // rise back up
      this.y += (3 * TILE - this.y) * 0.05 * speed;
      if (this.t > 50) { this.t = 0; this.phase = 0; }
    }
  }

  draw(game, ctx, frame) {
    if (this.dead) return;
    if (this.iv > 0 && (frame >> 1) % 2 === 0) return;
    if (this.id === 'volt' && this.state === 'fight' && this.phase === 2 && this.t > 30) {
      // teleporting: beam of light
      ctx.fillStyle = (frame >> 1) % 2 ? '#f8e858' : '#f8f8f8';
      ctx.fillRect(this.x + this.w / 2 - 2 - game.camX, 0, 4, 232);
      return;
    }
    const spr = SPR[this.def.spr];
    const sx = Math.round(this.x - game.camX - (spr.width - this.w) / 2);
    const sy = Math.round(this.y - (spr.height - this.h) + (this.id === 'moorly' ? 4 : 0));
    drawSprite(ctx, this.def.spr, sx, sy, this.face > 0);
    if (this.orbs) {
      for (const o of this.orbs) {
        ctx.fillStyle = (frame >> 1) % 2 ? '#f8e858' : '#f8f8f8';
        ctx.fillRect(Math.round(o.x - game.camX), Math.round(o.y + 2), 8, 4);
        ctx.fillRect(Math.round(o.x - game.camX + 2), Math.round(o.y), 4, 8);
      }
    }
  }
}
