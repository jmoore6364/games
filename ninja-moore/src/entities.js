// Player, enemies, bosses and projectiles for Ninja Moore.

import { drawSprite, drawSlashArc, drawFlame, SPR } from './sprites.js';
import { TILE, T, tileAt } from './levels.js';

export const NINPO_COST = { star: 3, wind: 5, fire: 5, jump: 8 };
export const NINPO_NAME = { star: 'THROWING STAR', wind: 'WINDMILL SHURIKEN', fire: 'FIRE WHEEL', jump: 'JUMP-SLASH' };

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const solidAt = (g, px, py) => tileAt(g, Math.floor(px / TILE), Math.floor(py / TILE)) === T.SOLID;

// ============================= PLAYER =============================

const GRAV = 0.24, RUN = 1.6, JUMP = -4.7, WJUMP_VX = 2.3, MAXFALL = 4.4, AIRCAP = 2.4;

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 10; this.h = 20;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.onGround = false;
    this.cling = 0;        // -1 wall on left, 1 wall on right, 0 none
    this.clingLock = 0;    // frames before re-cling allowed after wall jump
    this.crouch = false;
    this.slashT = 0;
    this.spin = false;     // jump-and-slash ninpo active
    this.hurtT = 0;
    this.invuln = 0;
    this.dead = false;
    this.deadT = 0;
    this.hp = 16;
    this.sp = 10;
    this.ninpo = 'star';
    this.dropT = 0;        // drop through platforms
    this.animT = 0;
  }

  hitbox() { return { x: this.x + 1, y: this.y + 2, w: this.w - 2, h: this.h - 4 }; }

  slashBox() {
    if (this.slashT <= 0 || this.slashT > 9) return null;
    if (this.spin) return null;
    const yOff = this.crouch ? this.h - 12 : 2;
    return {
      x: this.face > 0 ? this.x + this.w - 2 : this.x - 18,
      y: this.y + yOff, w: 20, h: 14,
    };
  }

  spinBox() {
    if (!this.spin) return null;
    return { x: this.x - 6, y: this.y - 4, w: this.w + 12, h: this.h + 8 };
  }

  update(game, inp) {
    const g = game.scene.g;
    this.animT++;
    if (this.invuln > 0) this.invuln--;
    if (this.clingLock > 0) this.clingLock--;
    if (this.wjT > 0) this.wjT--;
    if (this.slashT > 0) this.slashT--;
    if (this.dropT > 0) this.dropT--;

    if (this.dead) {
      this.deadT++;
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      this.y += this.vy;
      return;
    }

    const dir = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);

    if (this.hurtT > 0) {
      // fixed knockback: no control until it ends
      this.hurtT--;
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      this.moveX(g, this.vx, false);
      this.moveY(g, this.vy);
      return;
    }

    // ---- wall cling ----
    if (this.cling !== 0) {
      const wx = this.cling > 0 ? this.x + this.w + 1 : this.x - 1;
      const attached = solidAt(g, wx, this.y + 6) || solidAt(g, wx, this.y + this.h - 4);
      if (!attached || this.onGround) this.cling = 0;
    }
    if (this.cling !== 0) {
      this.vx = 0; this.vy = 0;
      this.face = -this.cling; // face away from wall
      if (inp.pressed('jump')) {
        // jump away; steer back mid-air for the same-wall climb tech
        this.vx = this.cling === 1 ? -WJUMP_VX : WJUMP_VX;
        this.vy = JUMP + 0.1;
        this.cling = 0;
        this.clingLock = 7;
        this.wjT = 16; // wall jumps are full, fixed height (the climb tech relies on it)
        game.sound.wallKick();
      } else if (inp.down('down') && inp.pressed('fire')) {
        this.cling = 0; // let go
      }
      // ninpo cast from wall not allowed; slash not allowed — pure NG cling
      if (this.cling !== 0) return;
    }

    // ---- ground / air control ----
    this.crouch = this.onGround && inp.down('down');
    if (this.onGround) {
      this.vx = this.crouch ? 0 : dir * RUN;
      if (dir !== 0 && !this.crouch) this.face = dir;
      if (inp.pressed('jump')) {
        if (this.crouch && this.standsOnPlat(g)) {
          this.dropT = 12; // drop through platform
        } else {
          this.vy = JUMP;
          this.onGround = false;
          game.sound.jump();
        }
      }
    } else {
      // snappy air control, momentum preserved
      if (dir !== 0) {
        this.vx += dir * 0.25;
        this.vx = Math.max(-AIRCAP, Math.min(AIRCAP, this.vx));
        this.face = dir;
      }
      if (!inp.down('jump') && this.vy < -2 && !(this.wjT > 0)) this.vy = -2; // variable jump height
    }

    // ---- attacks ----
    if (inp.pressed('fire') && this.slashT <= 0 && !this.spin) {
      if (inp.down('up')) castNinpo(game, this);
      else { this.slashT = 12; game.sound.slash(); }
    }

    // ---- physics ----
    this.vy = Math.min(MAXFALL, this.vy + GRAV);
    const hitWall = this.moveX(g, this.vx, true);
    this.moveY(g, this.vy);

    // wall cling on contact (the signature)
    if (hitWall !== 0 && !this.onGround && this.clingLock <= 0 && !this.spin) {
      this.cling = hitWall;
      this.vx = 0; this.vy = 0;
      game.sound.wallGrab();
    }
    if (this.onGround && this.spin) this.spin = false;
  }

  standsOnPlat(g) {
    const fy = Math.floor((this.y + this.h + 1) / TILE);
    const t1 = tileAt(g, Math.floor((this.x + 1) / TILE), fy);
    const t2 = tileAt(g, Math.floor((this.x + this.w - 1) / TILE), fy);
    return (t1 === T.PLAT || t2 === T.PLAT) && t1 !== T.SOLID && t2 !== T.SOLID;
  }

  // returns -1/1 if blocked by a wall on that side
  moveX(g, dx, care) {
    this.x += dx;
    const dirs = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    if (dirs === 0) return 0;
    const edge = dirs > 0 ? this.x + this.w : this.x;
    for (const py of [this.y + 2, this.y + this.h / 2, this.y + this.h - 2]) {
      if (solidAt(g, edge, py)) {
        const tx = Math.floor(edge / TILE);
        this.x = dirs > 0 ? tx * TILE - this.w - 0.01 : (tx + 1) * TILE + 0.01;
        if (care) this.vx = 0;
        return dirs;
      }
    }
    return 0;
  }

  moveY(g, dy) {
    const wasBottom = this.y + this.h;
    this.y += dy;
    this.onGround = false;
    if (dy >= 0) {
      const fy = this.y + this.h;
      const ty = Math.floor(fy / TILE);
      for (const px of [this.x + 1, this.x + this.w - 1]) {
        const t = tileAt(g, Math.floor(px / TILE), ty);
        if (t === T.SOLID ||
            (t === T.PLAT && this.dropT <= 0 && wasBottom <= ty * TILE + 4)) {
          this.y = ty * TILE - this.h;
          this.vy = 0;
          this.onGround = true;
          return;
        }
      }
    } else {
      for (const px of [this.x + 1, this.x + this.w - 1]) {
        if (solidAt(g, px, this.y)) {
          this.y = (Math.floor(this.y / TILE) + 1) * TILE + 0.01;
          this.vy = 0;
          return;
        }
      }
    }
  }

  draw(ctx, cam, frame) {
    const fx = this.x - cam.x - 3, fy = this.y - cam.y;
    if (this.invuln > 0 && !this.dead && (frame >> 2) % 2 === 0) return;
    const flip = this.face < 0;
    if (this.dead || this.hurtT > 0) { drawSprite(ctx, 'p_hurt', fx, fy, flip); return; }
    if (this.spin) { drawSprite(ctx, 'p_jump', fx, fy + 3, (frame >> 2) % 2 === 0); }
    else if (this.cling !== 0) drawSprite(ctx, 'p_cling', fx, fy + 2, this.cling < 0);
    else if (!this.onGround) drawSprite(ctx, 'p_jump', fx, fy + 3, flip);
    else if (this.crouch) drawSprite(ctx, 'p_crouch', fx, fy + this.h - 11, flip);
    else if (this.slashT > 0) drawSprite(ctx, 'p_slash', fx, fy, flip);
    else if (Math.abs(this.vx) > 0.1) drawSprite(ctx, (this.animT >> 3) % 2 ? 'p_run1' : 'p_run2', fx, fy, flip);
    else drawSprite(ctx, 'p_stand', fx, fy, flip);

    // katana slash arc
    if (this.slashT > 0 && this.slashT <= 9 && !this.spin) {
      const cy = this.y - cam.y + (this.crouch ? this.h - 6 : 8);
      drawSlashArc(ctx, this.x - cam.x + (this.face > 0 ? this.w + 6 : -11), cy, this.face, 9 - this.slashT);
    }
    if (this.spin) {
      ctx.strokeStyle = (frame % 4 < 2) ? '#fff' : '#a8d8f8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x - cam.x + this.w / 2, this.y - cam.y + this.h / 2, 15, frame * 0.8, frame * 0.8 + 4.4);
      ctx.stroke();
    }
  }
}

export function damagePlayer(game, dmg, srcX) {
  const P = game.player;
  if (P.dead || P.invuln > 0 || P.spin) return false;
  P.hp -= dmg;
  game.sound.hurt();
  // THE knockback: fixed, brief, always the same — fair but scary near pits
  const dir = (P.x + P.w / 2) < srcX ? -1 : 1;
  P.vx = dir * 2.1;
  P.vy = -3.2;
  P.hurtT = 18;
  P.invuln = 70;
  P.cling = 0;
  P.slashT = 0;
  P.spin = false;
  P.onGround = false;
  if (P.hp <= 0) killPlayer(game);
  return true;
}

export function killPlayer(game) {
  const P = game.player;
  if (P.dead) return;
  P.dead = true;
  P.hp = Math.max(0, P.hp);
  P.vy = -3.6;
  P.vx = 0;
  game.sound.die();
  game.sound.stopMusic();
}

// ============================= NINPO =============================

function castNinpo(game, P) {
  const type = P.ninpo;
  if (!type) return;
  const cost = NINPO_COST[type];
  if (P.sp < cost) return;
  if (type === 'jump' && P.onGround) return; // airborne art only
  P.sp -= cost;
  const cx = P.x + P.w / 2, cy = P.y + 8;
  if (type === 'star') {
    game.pshots.push({ kind: 'star', x: cx, y: cy, w: 6, h: 6, vx: 4.2 * P.face, vy: 0, dmg: 1, t: 0 });
    game.sound.ninpoStar();
  } else if (type === 'wind') {
    game.pshots.push({ kind: 'wind', x: cx, y: cy, w: 10, h: 8, vx: 3.4 * P.face, vy: 0, dmg: 2, t: 0, ret: false, hits: new Set() });
    game.sound.ninpoWind();
  } else if (type === 'fire') {
    for (const a of [-0.55, 0, 0.55]) {
      game.pshots.push({
        kind: 'fire', x: cx, y: cy, w: 8, h: 8,
        vx: Math.cos(a) * 2.7 * P.face, vy: Math.sin(a) * 2.7 - 0.8, grav: 0.06, dmg: 2, t: 0,
      });
    }
    game.sound.ninpoFire();
  } else if (type === 'jump') {
    P.spin = true;
    P.slashT = 0;
    game.sound.ninpoJump();
  }
}

export function updatePShots(game) {
  const g = game.scene.g;
  const P = game.player;
  for (const s of game.pshots) {
    s.t++;
    if (s.kind === 'fire') s.vy += s.grav;
    if (s.kind === 'wind') {
      if (!s.ret && s.t > 34) { s.ret = true; s.hits.clear(); }
      if (s.ret) {
        const dx = (P.x + P.w / 2) - s.x, dy = (P.y + 8) - s.y;
        const d = Math.hypot(dx, dy) || 1;
        s.vx = (dx / d) * 3.8; s.vy = (dy / d) * 3.8;
        if (d < 10) s.gone = true;
      }
    }
    s.x += s.vx; s.y += s.vy;
    if (s.kind !== 'wind' && solidAt(g, s.x + s.w / 2, s.y + s.h / 2)) s.gone = true;
    if (s.x < game.camX - 40 || s.x > game.camX + 296 || s.y > game.camY + 280 || s.y < game.camY - 60) s.gone = true;
  }
  game.pshots = game.pshots.filter((s) => !s.gone);
}

export function drawPShots(game, ctx, frame) {
  for (const s of game.pshots) {
    const x = s.x - game.camX, y = s.y - game.camY;
    if (s.kind === 'star') drawSprite(ctx, (frame >> 2) % 2 ? 'pr_star1' : 'pr_star2', x - 2, y - 2);
    else if (s.kind === 'wind') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(frame * 0.5);
      ctx.drawImage(SPR.pr_wind1, -4, -3);
      ctx.restore();
    } else if (s.kind === 'fire') drawSprite(ctx, 'pr_fire', x - 3, y - 3);
  }
}

// ============================= ENEMIES =============================

let idc = 0;

export function spawnEnemy(game, t, x, y, opts = {}) {
  const base = { t, x, y, vx: 0, vy: 0, face: -1, hp: 1, dmg: 2, score: 200, tm: 0, id: idc++ };
  const specs = {
    knife: { w: 12, h: 16, hp: 1, score: 200 },
    club: { w: 12, h: 17, hp: 2, score: 300 },
    dog: { w: 16, h: 11, hp: 1, score: 200 },
    hawk: { w: 16, h: 11, hp: 1, dmg: 2, score: 300, fly: true },
    gunner: { w: 14, h: 14, hp: 2, score: 300 },
    gren: { w: 12, h: 16, hp: 2, score: 300 },
    bat: { w: 12, h: 8, hp: 1, dmg: 1, score: 150, fly: true },
    jet: { w: 16, h: 8, hp: 999, dmg: 2, score: 0, noHit: true, harmless: true },
    eninja: { w: 12, h: 19, hp: 4, dmg: 3, score: 800 },
    lantern: { w: 10, h: 10, hp: 1, dmg: 0, score: 50, noTouch: true },
    // bosses
    butch: { w: 22, h: 23, hp: 28, dmg: 3, score: 5000, boss: true },
    razorbeak: { w: 30, h: 22, hp: 24, dmg: 3, score: 5000, boss: true, fly: true },
    kage: { w: 14, h: 22, hp: 30, dmg: 3, score: 5000, boss: true },
    blisk: { w: 18, h: 24, hp: 36, dmg: 3, score: 6000, boss: true },
    malek: { w: 18, h: 25, hp: 30, dmg: 2, score: 6000, boss: true },
    d_giant: { w: 24, h: 30, hp: 36, dmg: 4, score: 5000, boss: true },
    d_head: { w: 20, h: 16, hp: 24, dmg: 3, score: 5000, boss: true, fly: true },
    d_heart: { w: 16, h: 17, hp: 16, dmg: 3, score: 10000, boss: true, fly: true },
  };
  const e = { ...base, ...(specs[t] || {}), ...opts };
  game.enemies.push(e);
  return e;
}

function eGrav(game, e) {
  const g = game.scene.g;
  e.vy = Math.min(4.2, e.vy + GRAV);
  e.y += e.vy;
  const ty = Math.floor((e.y + e.h) / TILE);
  for (const px of [e.x + 1, e.x + e.w - 1]) {
    const t = tileAt(g, Math.floor(px / TILE), ty);
    if (t === T.SOLID || (t === T.PLAT && e.vy > 0 && e.y + e.h - e.vy <= ty * TILE + 4)) {
      e.y = ty * TILE - e.h;
      e.vy = 0;
      e.grounded = true;
      return;
    }
  }
  e.grounded = false;
}

function eWalk(game, e, sp) {
  const g = game.scene.g;
  e.x += sp * e.face;
  // turn at walls or ledges
  const edge = e.face > 0 ? e.x + e.w + 1 : e.x - 1;
  if (solidAt(g, edge, e.y + e.h / 2) ||
      (e.grounded && tileAt(g, Math.floor(edge / TILE), Math.floor((e.y + e.h + 4) / TILE)) === T.EMPTY &&
       tileAt(g, Math.floor(edge / TILE), Math.floor((e.y + e.h + 4) / TILE) + 1) === T.EMPTY)) {
    e.face *= -1;
  }
}

const facePlayer = (game, e) => { e.face = (game.player.x + 5 > e.x + e.w / 2) ? 1 : -1; };

function shoot(game, e, kind, vx, vy, o = {}) {
  game.eshots.push({ kind, x: e.x + e.w / 2, y: e.y + (o.yo ?? 6), w: o.w ?? 8, h: o.h ?? 5, vx, vy, dmg: o.dmg ?? 2, grav: o.grav ?? 0, t: 0 });
}

// ---- per-type updates ----

const AI = {
  knife(game, e) {
    facePlayer(game, e);
    eWalk(game, e, 0.55);
    eGrav(game, e);
  },

  club(game, e) {
    e.tm++;
    const d = Math.abs(game.player.x - e.x);
    if (d < 120) facePlayer(game, e);
    if (d < 90) eWalk(game, e, 0.35);
    eGrav(game, e);
  },

  dog(game, e) {
    e.tm++;
    const P = game.player;
    if (!e.mad) {
      if (Math.abs(P.x - e.x) < 96 && Math.abs(P.y - e.y) < 48) { e.mad = true; facePlayer(game, e); }
    } else {
      e.x += 2.4 * e.face;
      if (e.grounded && e.tm % 22 === 0) e.vy = -2.2; // bounding lope
    }
    eGrav(game, e);
  },

  hawk(game, e) {
    // swoop arc through the player's position, then climb away. Dodgeable
    // on reaction: it was telegraphed 30 frames before entering the screen.
    e.tm++;
    e.x += e.vx;
    const targY = e.tm < 55 ? e.ty : e.ty - 90;
    e.vy += (targY > e.y ? 0.16 : -0.16);
    e.vy = Math.max(-2.4, Math.min(2.6, e.vy));
    e.y += e.vy;
    if (e.x < game.camX - 60 || e.x > game.camX + 316) e.gone = true;
  },

  gunner(game, e) {
    e.tm++;
    facePlayer(game, e);
    eGrav(game, e);
    const cyc = e.tm % 120;
    e.aiming = cyc >= 55 && cyc < 90; // telegraphed: rifle glints while aiming
    if (cyc === 90 && Math.abs(game.player.x - e.x) < 220) {
      shoot(game, e, 'kunai', 2.6 * e.face, 0, { yo: 7 });
      game.sound.shot();
    }
  },

  gren(game, e) {
    e.tm++;
    facePlayer(game, e);
    eGrav(game, e);
    if (e.tm % 130 === 100 && Math.abs(game.player.x - e.x) < 200) {
      const dx = game.player.x - e.x;
      shoot(game, e, 'gren', Math.max(-2, Math.min(2, dx / 60)), -3.6, { grav: 0.14, w: 5, h: 5, yo: 2 });
      game.sound.lob();
    }
  },

  bat(game, e) {
    e.tm++;
    const P = game.player;
    if (!e.mad) {
      if (Math.abs(P.x - e.x) < 110 && P.y > e.y - 40) { e.mad = true; e.y0 = e.y; facePlayer(game, e); }
    } else {
      e.x += 1.1 * e.face;
      e.y = e.y0 + Math.sin(e.tm * 0.09) * 26 + e.tm * 0.12;
      if (e.tm % 90 === 0) facePlayer(game, e);
    }
  },

  jet(game, e) {
    // timed fire hazard: 110 off, 26 warn, 64 on
    const cyc = (game.frame + (e.phase || 0)) % 200;
    e.warm = cyc >= 110 && cyc < 136;
    e.on = cyc >= 136;
    if (cyc === 136) game.sound.fireJet();
  },

  eninja(game, e) {
    e.tm++;
    const P = game.player;
    eGrav(game, e);
    if (e.grounded) {
      if (e.tm % 75 === 0) {
        facePlayer(game, e);
        e.vy = -4.2;
        e.vx = (Math.abs(P.x - e.x) > 30 ? 1.7 : -1.2) * e.face;
      } else e.vx = 0;
      if (e.tm % 75 === 40 && Math.abs(P.x - e.x) < 60) e.slash = 10;
    }
    e.x += e.vx;
    if (e.slash > 0) e.slash--;
  },

  lantern() {}, // hangs there, waiting for the blade

  // ------------------------- BOSSES -------------------------

  butch(game, e) {
    e.tm++;
    const P = game.player;
    eGrav(game, e);
    const enraged = e.hp <= 14;
    if (e.grounded) {
      facePlayer(game, e);
      const cyc = e.tm % (enraged ? 110 : 150);
      if (cyc === 0) {
        e.vy = -5.2;
        e.vx = (P.x > e.x ? 1 : -1) * (enraged ? 2.2 : 1.7);
      } else {
        e.vx = e.face * (enraged ? 1.0 : 0.6);
      }
    }
    e.x += e.vx;
    e.x = Math.max(game.arena.x0 + 4, Math.min(game.arena.x1 - e.w - 4, e.x));
  },

  razorbeak(game, e) {
    e.tm++;
    const P = game.player;
    const cx = game.arena.x0 + 128;
    const cyc = e.tm % 190;
    if (cyc < 100) {
      // circle high, telegraph with a screech before the dive
      e.x += ((cx + Math.sin(e.tm * 0.03) * 80) - e.x) * 0.06;
      e.y += ((game.arena.top + 30 + Math.sin(e.tm * 0.07) * 12) - e.y) * 0.08;
      if (cyc === 96) { game.sound.screech(); e.dx = P.x; e.dy = P.y; }
    } else if (cyc < 145) {
      const dx = e.dx - e.x, dy = (e.dy ?? P.y) - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * 3.1;
      e.y += (dy / d) * 3.1;
    } else {
      e.y += ((game.arena.top + 30) - e.y) * 0.05;
      if (cyc === 160 && e.hp < 16) {
        shoot(game, e, 'feather', -1.6, 1.2, { w: 4, h: 4, dmg: 1 });
        shoot(game, e, 'feather', 1.6, 1.2, { w: 4, h: 4, dmg: 1 });
      }
    }
  },

  kage(game, e) {
    e.tm++;
    const P = game.player;
    eGrav(game, e);
    if (e.grounded) {
      const cyc = e.tm % 60;
      if (cyc === 0) {
        facePlayer(game, e);
        const hop = (e.hops = ((e.hops || 0) + 1) % 3);
        e.vy = hop === 2 ? -5.4 : -4.4;
        e.vx = e.face * (Math.abs(P.x - e.x) > 50 ? 2.1 : (Math.random() < 0.4 ? -1.4 : 1.6));
      } else e.vx = 0;
      if (cyc === 30 && Math.abs(P.x - e.x) < 64) e.slash = 10;
      if (cyc === 30 && Math.abs(P.x - e.x) >= 64) {
        shoot(game, e, 'star', 3 * e.face, -0.4, { w: 6, h: 6, dmg: 2 });
        game.sound.ninpoStar();
      }
    }
    e.x += e.vx;
    e.x = Math.max(game.arena.x0 + 4, Math.min(game.arena.x1 - e.w - 4, e.x));
    if (e.slash > 0) e.slash--;
  },

  blisk(game, e) {
    e.tm++;
    const P = game.player;
    eGrav(game, e);
    facePlayer(game, e);
    const cyc = e.tm % 210;
    e.aiming = (cyc >= 40 && cyc < 70) || (cyc >= 150 && cyc < 170);
    if (cyc === 70 || cyc === 76 || cyc === 82) {
      shoot(game, e, 'kunai', 2.9 * e.face, 0, { yo: 8 });
      game.sound.shot();
    }
    if (cyc === 170) {
      shoot(game, e, 'gren', Math.max(-2.2, Math.min(2.2, (P.x - e.x) / 55)), -3.8, { grav: 0.14, w: 5, h: 5, yo: 2 });
      game.sound.lob();
    }
    if (cyc >= 100 && cyc < 140) e.x += e.face * 1.1; // advance
    e.x = Math.max(game.arena.x0 + 4, Math.min(game.arena.x1 - e.w - 4, e.x));
  },

  malek(game, e) {
    e.tm++;
    const P = game.player;
    const spots = e.spots; // three perches, set at spawn
    const cyc = e.tm % 160;
    if (cyc === 0) {
      e.spot = ((e.spot || 0) + 1 + Math.floor(Math.random() * 2)) % spots.length;
      e.fade = 20;
    }
    if (e.fade > 0) {
      e.fade--;
      const s = spots[e.spot];
      e.x = s.x; e.y = s.y;
    }
    if (cyc === 60 || cyc === 90) {
      const dx = (P.x - e.x), dy = (P.y - e.y);
      const d = Math.hypot(dx, dy) || 1;
      shoot(game, e, 'orb', (dx / d) * 1.9, (dy / d) * 1.9, { w: 6, h: 6, yo: 10 });
      game.sound.lob();
    }
    if (cyc === 120 && game.enemies.filter((x) => x.t === 'bat' && !x.gone).length < 2) {
      const b = spawnEnemy(game, 'bat', e.x, e.y - 8);
      b.mad = true; b.y0 = b.y; b.face = P.x > e.x ? 1 : -1;
      game.sound.screech();
    }
  },

  d_giant(game, e) {
    e.tm++;
    const P = game.player;
    eGrav(game, e);
    if (e.grounded) {
      facePlayer(game, e);
      const cyc = e.tm % 170;
      if (cyc === 0) {
        e.vy = -4.8;
        e.vx = (P.x > e.x ? 1 : -1) * 1.4;
        e.slamming = true;
      } else e.vx = e.face * 0.45;
      if (e.slamming && e.tm > 10) {
        // landed after a jump: shockwaves both ways
        e.slamming = false;
        game.shake = 10;
        game.sound.boom();
        shoot(game, e, 'wave', 2.0, 0, { w: 10, h: 8, yo: e.h - 8 });
        shoot(game, e, 'wave', -2.0, 0, { w: 10, h: 8, yo: e.h - 8 });
      }
    }
    e.x += e.vx;
    e.x = Math.max(game.arena.x0 + 4, Math.min(game.arena.x1 - e.w - 4, e.x));
  },

  d_head(game, e) {
    e.tm++;
    const P = game.player;
    const cx = game.arena.x0 + 128;
    e.x = cx + Math.sin(e.tm * 0.022) * 92 - e.w / 2;
    e.y = game.arena.top + 46 + Math.sin(e.tm * 0.06) * 30;
    if (e.tm % 95 === 0) {
      const dx = (P.x - e.x), dy = (P.y - e.y);
      const d = Math.hypot(dx, dy) || 1;
      shoot(game, e, 'fireb', (dx / d) * 2.1, (dy / d) * 2.1, { w: 6, h: 6, yo: 8 });
      game.sound.ninpoFire();
    }
  },

  d_heart(game, e) {
    e.tm++;
    const P = game.player;
    e.x = game.arena.x0 + 120;
    e.y = game.arena.top + 60 + Math.sin(e.tm * 0.04) * 24;
    e.shielded = (e.tm % 200) < 100; // vulnerable windows
    if (e.tm % 130 === 60) {
      for (const a of [0.6, 2.5]) {
        shoot(game, e, 'orb', Math.cos(a) * 1.4, Math.sin(a) * 1.4, { w: 6, h: 6, yo: 8, dmg: 2 });
      }
      game.sound.lob();
    }
    // slow homing wisps
    for (const s of game.eshots) {
      if (s.kind === 'orb' && e.tm % 2 === 0) {
        const dx = (P.x - s.x), dy = (P.y - s.y);
        const d = Math.hypot(dx, dy) || 1;
        s.vx += (dx / d) * 0.05; s.vy += (dy / d) * 0.05;
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > 1.6) { s.vx *= 1.6 / sp; s.vy *= 1.6 / sp; }
      }
    }
  },
};

export function updateEnemies(game) {
  for (const e of game.enemies) {
    // skip far-away enemies (but never bosses)
    if (!e.boss && !game.scene.vertical && (e.x < game.camX - 80 || e.x > game.camX + 336)) continue;
    if (!e.boss && game.scene.vertical && (e.y < game.camY - 80 || e.y > game.camY + 320)) continue;
    AI[e.t]?.(game, e);
    if (!e.fly && !e.gone && e.y > game.scene.g.h * TILE + 40) e.gone = true;
  }
  game.enemies = game.enemies.filter((e) => !e.gone);
}

export function damageEnemy(game, e, dmg) {
  if (e.noHit || e.gone) return;
  if (e.t === 'd_heart' && e.shielded) { game.sound.clang(); return; }
  e.hp -= dmg;
  e.flash = 6;
  if (e.hp <= 0) {
    e.gone = true;
    game.addScore(e.score);
    if (e.t === 'lantern') {
      game.sound.lantern();
      game.spawnDrop(e.x, e.y, e.drop);
    } else {
      game.sound.edie();
      game.addBoom(e.x + e.w / 2, e.y + e.h / 2, !!e.boss);
      if (e.boss) game.onBossDown(e);
      else if (e.spawnRef) e.spawnRef.deadWait = true; // respawns on re-scroll, NG style
      // random small drops from regular enemies
      if (!e.boss && Math.random() < 0.14) game.spawnDrop(e.x, e.y, Math.random() < 0.7 ? 'sp' : 'hp');
    }
  } else {
    game.sound.slashHit();
  }
}

// touch hitbox — some enemies extend when attacking
export function enemyHitboxes(e) {
  const boxes = [{ x: e.x, y: e.y, w: e.w, h: e.h, dmg: e.dmg }];
  if ((e.t === 'eninja' || e.t === 'kage') && e.slash > 0) {
    boxes.push({ x: e.face > 0 ? e.x + e.w : e.x - 16, y: e.y + 2, w: 16, h: 14, dmg: e.dmg });
  }
  if (e.t === 'jet') {
    if (e.on) boxes[0] = { x: e.x + 3, y: e.y - 38, w: 10, h: 44, dmg: e.dmg };
    else boxes.length = 0;
  }
  return boxes;
}

export function drawEnemies(game, ctx, frame) {
  for (const e of game.enemies) {
    const x = e.x - game.camX, y = e.y - game.camY;
    if (x < -48 || x > 300 || y < -60 || y > 300) continue;
    const fl = e.face > 0;
    const blink = e.flash > 0 && (frame % 2 === 0);
    if (e.flash > 0) e.flash--;
    if (blink) continue;
    switch (e.t) {
      case 'knife': drawSprite(ctx, (frame >> 3) % 2 ? 'e_knife1' : 'e_knife2', x - 2, y, fl); break;
      case 'club': drawSprite(ctx, (frame >> 3) % 2 ? 'e_club1' : 'e_club2', x - 2, y, fl); break;
      case 'dog': drawSprite(ctx, (frame >> 2) % 2 ? 'e_dog1' : 'e_dog2', x - 1, y - 1, fl); break;
      case 'hawk': drawSprite(ctx, (frame >> 2) % 2 ? 'e_hawk1' : 'e_hawk2', x - 1, y - 2, e.vx > 0); break;
      case 'gunner':
        drawSprite(ctx, 'e_gun', x - 1, y, fl);
        if (e.aiming && frame % 8 < 4) { ctx.fillStyle = '#fff'; ctx.fillRect(fl ? x + e.w + 1 : x - 3, y + 7, 2, 2); }
        break;
      case 'gren': drawSprite(ctx, 'e_gren', x - 2, y, fl); break;
      case 'bat': drawSprite(ctx, (frame >> 2) % 2 ? 'e_bat1' : 'e_bat2', x, y, fl); break;
      case 'jet': {
        ctx.fillStyle = '#585868';
        ctx.fillRect(x, y + 2, 16, 5);
        if (e.warm && frame % 6 < 3) { ctx.fillStyle = '#f8d838'; ctx.fillRect(x + 5, y - 2, 6, 4); }
        if (e.on) drawFlame(ctx, x, y - 38, 40, frame);
        break;
      }
      case 'eninja':
        drawSprite(ctx, e.grounded ? 'e_ninja1' : 'e_ninja2', x - 2, y, fl);
        if (e.slash > 0) drawSlashArc(ctx, x + (fl ? e.w + 8 : -10), y + 8, e.face, 9 - Math.min(9, e.slash), true);
        break;
      case 'lantern':
        drawSprite(ctx, 'lantern', x, y);
        if (frame % 30 < 15) { ctx.fillStyle = 'rgba(248,216,56,0.25)'; ctx.fillRect(x - 2, y - 2, 14, 14); }
        break;
      case 'butch': drawSprite(ctx, 'b_butch', x - 2, y - 6, fl); break;
      case 'razorbeak': drawSprite(ctx, (frame >> 2) % 2 ? 'e_hawk1' : 'e_hawk2', x - 2, y - 3, e.face > 0, 2); break;
      case 'kage':
        drawSprite(ctx, e.grounded ? 'e_ninja1' : 'e_ninja2', x - 1, y + 2, fl);
        if (e.slash > 0) drawSlashArc(ctx, x + (fl ? e.w + 8 : -10), y + 8, e.face, 9 - Math.min(9, e.slash), true);
        break;
      case 'blisk':
        drawSprite(ctx, 'b_blisk', x - 1, y - 2, fl);
        if (e.aiming && frame % 8 < 4) { ctx.fillStyle = '#f82818'; ctx.fillRect(fl ? x + e.w + 2 : x - 4, y + 8, 3, 3); }
        break;
      case 'malek': {
        if (e.fade > 0 && frame % 2 === 0) break;
        drawSprite(ctx, 'b_malek', x - 1, y - 3, fl);
        break;
      }
      case 'd_giant': drawSprite(ctx, 'b_giant', x - 3, y - 4, fl); break;
      case 'd_head': drawSprite(ctx, 'b_head', x, y - 1, fl); break;
      case 'd_heart': {
        const pump = (frame >> 3) % 2 ? 0 : 1;
        drawSprite(ctx, 'b_heart', x - pump, y - pump, false, 1 + pump * 0.12);
        if (e.shielded) {
          ctx.strokeStyle = frame % 6 < 3 ? '#c060e0' : '#903090';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + e.w / 2, y + e.h / 2, 16, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
    }
  }
}

// ---------------- enemy shots ----------------

export function updateEShots(game) {
  const g = game.scene.g;
  for (const s of game.eshots) {
    s.t++;
    if (s.grav) s.vy += s.grav;
    s.x += s.vx; s.y += s.vy;
    if (s.kind === 'wave') {
      // shockwave hugs the ground
      const ty = Math.floor((s.y + s.h + 2) / TILE);
      if (tileAt(g, Math.floor((s.x + s.w / 2) / TILE), ty) !== T.SOLID) s.vy = Math.min(3, s.vy + 0.3);
      else { s.y = ty * TILE - s.h; s.vy = 0; }
      if (s.t > 130) s.gone = true;
    } else if (s.kind === 'gren') {
      if (solidAt(g, s.x + s.w / 2, s.y + s.h)) {
        s.gone = true;
        game.addBoom(s.x + s.w / 2, s.y + s.h / 2, false);
        game.sound.boom();
      }
    } else if (s.kind !== 'orb' && solidAt(g, s.x + s.w / 2, s.y + s.h / 2)) {
      s.gone = true;
    }
    if (s.kind === 'orb' && s.t > 340) s.gone = true;
    if (s.x < game.camX - 40 || s.x > game.camX + 296 || s.y > game.camY + 280 || s.y < game.camY - 60) s.gone = true;
  }
  game.eshots = game.eshots.filter((s) => !s.gone);
}

export function drawEShots(game, ctx, frame) {
  for (const s of game.eshots) {
    const x = s.x - game.camX, y = s.y - game.camY;
    if (s.kind === 'kunai') drawSprite(ctx, 'pr_kunai', x - 2, y - 1, s.vx < 0);
    else if (s.kind === 'gren') drawSprite(ctx, 'pr_gren', x, y);
    else if (s.kind === 'star') drawSprite(ctx, (frame >> 2) % 2 ? 'pr_star1' : 'pr_star2', x - 1, y - 1);
    else if (s.kind === 'orb') drawSprite(ctx, 'pr_orb', x, y);
    else if (s.kind === 'feather') drawSprite(ctx, 'pr_feather', x, y);
    else if (s.kind === 'fireb') drawSprite(ctx, 'pr_fire', x - 1, y - 1);
    else if (s.kind === 'wave') {
      ctx.fillStyle = frame % 4 < 2 ? '#f85818' : '#f8d838';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + i * 3, y + 8 - (i % 2) * 4 - 4, 3, 8);
    }
  }
}

// ---------------- item drops ----------------

const DROP_SPR = { sp: 'it_sp', SP: 'it_SP', hp: 'it_hp', '1up': 'it_1up', time: 'it_time', star: 'it_star', wind: 'it_wind', fire: 'it_fire', jump: 'it_jump' };

export function updateDrops(game) {
  const g = game.scene.g;
  for (const d of game.drops) {
    d.t++;
    if (!d.rest) {
      d.vy = Math.min(2.4, d.vy + 0.12);
      d.y += d.vy;
      const ty = Math.floor((d.y + 8) / TILE);
      const tt = tileAt(g, Math.floor((d.x + 4) / TILE), ty);
      if (tt === T.SOLID || tt === T.PLAT) { d.y = ty * TILE - 8; d.rest = true; }
      if (d.y > g.h * TILE) d.gone = true;
    }
    if (d.t > 600) d.gone = true;
    if (overlap({ x: d.x, y: d.y, w: 8, h: 8 }, game.player.hitbox())) {
      d.gone = true;
      game.collectDrop(d.kind);
    }
  }
  game.drops = game.drops.filter((d) => !d.gone);
}

export function drawDrops(game, ctx, frame) {
  for (const d of game.drops) {
    if (d.t > 480 && frame % 6 < 3) continue; // about to expire
    drawSprite(ctx, DROP_SPR[d.kind] || 'it_sp', d.x - game.camX, d.y - game.camY + (d.rest ? Math.sin(frame * 0.1) : 0));
  }
}
