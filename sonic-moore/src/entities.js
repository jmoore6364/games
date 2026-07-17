// Player (classic momentum physics on top of physics.js sensors),
// rings, monitors, springs, dash pads, spikes, moving platforms,
// badniks (crab / buzzer / spiker), checkpoints, signpost and the boss.

import {
  PHYS, DIRS, rot, norm, modeOf, cast, groundSense, velFromGsp, landGsp, DEG, TAU,
} from './physics.js';
import { SPR, drawCentered, drawRing, drawMonitor, drawSpring, drawSpikes, drawCheckpoint, drawSign, drawDash, drawPlat, drawBoom, drawStars, drawShield } from './sprites.js';

export function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.gsp = 0; this.xsp = 0; this.ysp = 0;
    this.angle = 0; this.visAngle = 0;
    this.grounded = false;
    this.rolling = false;
    this.jumping = false;
    this.layer = 1;
    this.facing = 1;
    this.hlock = 0;
    this.invuln = 0;
    this.stars = 0;
    this.shoes = 0;
    this.shield = false;
    this.springT = 0;
    this.hurtAir = false;
    this.dead = false;
    this.deadT = 0;
    this.plat = null;
    this.animD = 0; // distance accumulator for animation
    this.prevX = x;
  }

  get ball() { return this.rolling || this.jumping; }
  get hr() { return this.ball ? PHYS.hrBall : PHYS.hr; }
  get topSpeed() { return this.shoes > 0 ? 12 : PHYS.top; }

  hitbox() {
    const h = this.ball ? 22 : 30;
    return { x: this.x, y: this.y, w: 15, h };
  }

  // shift center along mode-down when the height radius changes
  adjustRadius(d) {
    this.x += d * Math.sin(this.angle);
    this.y += d * Math.cos(this.angle);
  }

  startRoll(game) {
    if (this.rolling) return;
    this.rolling = true;
    this.adjustRadius(PHYS.hr - PHYS.hrBall);
    game.sound.roll();
  }

  stopRoll() {
    if (!this.rolling) return;
    this.rolling = false;
    this.adjustRadius(PHYS.hrBall - PHYS.hr);
  }

  hurt(game, srcX) {
    if (this.dead || this.invuln > 0 || this.stars > 0) return;
    if (this.shield) {
      this.shield = false;
      game.sound.hurt();
    } else if (game.rings > 0) {
      game.scatterRings(Math.min(game.rings, 32));
      game.rings = 0;
      game.sound.scatter();
    } else {
      this.die(game);
      return;
    }
    this.grounded = false;
    this.plat = null;
    this.jumping = false;
    this.stopRoll();
    this.hurtAir = true;
    this.ysp = -4;
    this.xsp = this.x < srcX ? -2 : 2;
    this.gsp = 0;
    this.angle = 0;
    this.invuln = 120;
  }

  die(game) {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.xsp = 0; this.ysp = -7;
    this.grounded = false;
    game.sound.die();
    game.sound.stopMusic();
  }

  springLaunch(str) {
    this.grounded = false;
    this.plat = null;
    this.jumping = false;
    this.stopRoll();
    this.hurtAir = false;
    this.springT = 40;
    this.ysp = -str;
    this.angle = 0;
  }

  update(game) {
    const inp = game.playInput();
    this.prevX = this.x;

    if (this.invuln > 0) this.invuln--;
    if (this.stars > 0) this.stars--;
    if (this.shoes > 0) { this.shoes--; if (this.shoes === 0) game.sound.setTempo(1); }
    if (this.springT > 0) this.springT--;

    if (this.dead) {
      this.deadT++;
      this.ysp += PHYS.grv;
      this.y += this.ysp;
      return;
    }

    if (this.grounded) this.groundStep(game, inp);
    else this.airStep(game, inp);

    // clamp inside level horizontally
    const lv = game.level;
    if (this.x < 10) { this.x = 10; if (this.gsp < 0) this.gsp = 0; if (this.xsp < 0) this.xsp = 0; }
    if (this.x > lv.wPx - 10) { this.x = lv.wPx - 10; if (this.gsp > 0) this.gsp = 0; if (this.xsp > 0) this.xsp = 0; }

    // loop layer swappers
    for (const sw of lv.swappers) {
      if (this.y < sw.y0 || this.y > sw.y1) continue;
      if (this.prevX < sw.x && this.x >= sw.x) this.layer = 1;
      else if (this.prevX > sw.x && this.x <= sw.x) this.layer = 2;
    }

    // visual rotation eases toward ground angle
    let target = this.grounded ? this.angle : 0;
    let d = target - this.visAngle;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    this.visAngle = norm(this.visAngle + d * 0.5);

    this.animD += Math.abs(this.grounded ? this.gsp : this.xsp);
  }

  groundStep(game, inp) {
    const lv = game.level;
    const sin = Math.sin(this.angle), cos = Math.cos(this.angle);
    if (this.hlock > 0) this.hlock--;

    // --- slope factor ---
    if (this.rolling) {
      const up = this.gsp * sin > 0; // fighting the slope
      this.gsp -= (up ? PHYS.slpRollUp : PHYS.slpRollDown) * sin;
    } else if (Math.abs(this.gsp) > 0.06 || Math.abs(sin) > 0.35) {
      this.gsp -= PHYS.slp * sin;
    }

    // --- input ---
    const L = inp.down('left'), R = inp.down('right');
    if (this.hlock <= 0) {
      if (this.rolling) {
        if (L && this.gsp > 0) { this.gsp -= PHYS.rollDec; if (this.gsp < 0) this.gsp = -0.5; }
        else if (R && this.gsp < 0) { this.gsp += PHYS.rollDec; if (this.gsp > 0) this.gsp = 0.5; }
        if (L && this.gsp < 0) this.facing = -1;
        if (R && this.gsp > 0) this.facing = 1;
      } else {
        if (L) {
          if (this.gsp > 0) {
            if (this.gsp > 4 && modeOf(this.angle) === 0) game.sound.skid();
            this.gsp -= PHYS.dec;
            if (this.gsp < 0) this.gsp = -0.5;
          } else if (this.gsp > -this.topSpeed) {
            this.gsp = Math.max(this.gsp - PHYS.acc, -this.topSpeed);
          }
          this.facing = -1;
        } else if (R) {
          if (this.gsp < 0) {
            if (this.gsp < -4 && modeOf(this.angle) === 0) game.sound.skid();
            this.gsp += PHYS.dec;
            if (this.gsp > 0) this.gsp = 0.5;
          } else if (this.gsp < this.topSpeed) {
            this.gsp = Math.min(this.gsp + PHYS.acc, this.topSpeed);
          }
          this.facing = 1;
        }
      }
    }
    // friction
    const frc = this.rolling ? PHYS.rollFrc : PHYS.frc;
    if (this.rolling || (!L && !R) || this.hlock > 0) {
      this.gsp -= Math.min(Math.abs(this.gsp), frc) * Math.sign(this.gsp);
    }
    if (this.gsp > PHYS.maxSpeed) this.gsp = PHYS.maxSpeed;
    if (this.gsp < -PHYS.maxSpeed) this.gsp = -PHYS.maxSpeed;

    // --- start / stop rolling ---
    if (!this.rolling && inp.down('down') && Math.abs(this.gsp) >= PHYS.minRoll) {
      this.startRoll(game);
    } else if (this.rolling && Math.abs(this.gsp) < PHYS.unroll && !this.plat) {
      this.stopRoll();
    }

    // --- jump ---
    if (inp.pressed('jump')) {
      const wasBall = this.ball;
      this.jumping = true;
      this.rolling = false;
      if (!wasBall) this.adjustRadius(PHYS.hr - PHYS.hrBall);
      const [vx, vy] = velFromGsp(this.gsp, this.angle);
      this.xsp = vx - PHYS.jmp * Math.sin(this.angle);
      this.ysp = vy - PHYS.jmp * Math.cos(this.angle);
      this.grounded = false;
      this.plat = null;
      this.angle = 0;
      game.sound.jump();
      return;
    }

    // --- move ---
    const [vx, vy] = velFromGsp(this.gsp, this.angle);
    this.xsp = vx; this.ysp = vy;
    this.x += vx;
    this.y += vy;

    // riding a moving platform: the platform entity keeps us glued
    if (this.plat) {
      this.angle = 0;
      return;
    }

    const m = modeOf(this.angle);

    // --- wall push (shallow ground only) ---
    if (Math.abs(sin) < 0.4 && Math.abs(this.gsp) > 0.1) {
      const dirIdx = this.gsp > 0 ? 1 : 3;
      const hit = cast(lv, this.layer, this.x, this.y + 4, dirIdx, PHYS.pushr + 6);
      if (hit.dist <= PHYS.pushr) {
        const push = PHYS.pushr - hit.dist;
        this.x -= DIRS[dirIdx][0] * push;
        this.gsp = 0;
      }
    }

    // --- stick to ground ---
    const sense = groundSense(lv, this.layer, this.x, this.y, m, PHYS.wr, this.hr, 32);
    const snapMax = Math.min(14, Math.abs(this.gsp) + 4);
    if (!sense || sense.dist > snapMax) {
      // ran off a ledge
      this.grounded = false;
      this.angle = 0;
      return;
    }
    this.x += DIRS[m][0] * sense.dist;
    this.y += DIRS[m][1] * sense.dist;
    this.angle = sense.angle;

    // --- slipping / falling off walls & ceilings ---
    const deg = norm(this.angle) / DEG;
    if (this.hlock <= 0 && Math.abs(this.gsp) < PHYS.fall && deg > 45 && deg < 315) {
      this.hlock = PHYS.hlock;
      if (deg > 69 && deg < 291) {
        this.grounded = false;
        const [wx, wy] = velFromGsp(this.gsp, this.angle);
        this.xsp = wx; this.ysp = wy;
        this.angle = 0;
      }
    }
  }

  airStep(game, inp) {
    const lv = game.level;

    // --- input ---
    if (!this.hurtAir) {
      if (inp.down('left')) {
        this.xsp = Math.max(this.xsp - PHYS.air, -this.topSpeed);
        this.facing = -1;
      } else if (inp.down('right')) {
        this.xsp = Math.min(this.xsp + PHYS.air, this.topSpeed);
        this.facing = 1;
      }
      // air drag
      if (this.ysp < 0 && this.ysp > -4) this.xsp *= 0.96875;
      // variable jump height
      if (this.jumping && !inp.down('jump') && this.ysp < PHYS.jmpCut) this.ysp = PHYS.jmpCut;
    }

    // --- gravity ---
    this.ysp += this.hurtAir ? 0.1875 : PHYS.grv;
    if (this.ysp > PHYS.maxFall) this.ysp = PHYS.maxFall;

    // --- move ---
    this.x += this.xsp;
    this.y += this.ysp;

    // --- walls ---
    for (const dirIdx of [1, 3]) {
      if ((dirIdx === 1 && this.xsp < 0) || (dirIdx === 3 && this.xsp > 0)) continue;
      const hit = cast(lv, this.layer, this.x, this.y, dirIdx, PHYS.pushr + 2);
      if (hit.dist <= PHYS.pushr) {
        this.x -= DIRS[dirIdx][0] * (PHYS.pushr - hit.dist);
        this.xsp = 0;
      }
    }

    // --- ceiling ---
    if (this.ysp < 0) {
      const sense = groundSense(lv, this.layer, this.x, this.y, 2, PHYS.wr, this.hr, 32);
      if (sense && sense.dist <= 0) {
        this.y += -sense.dist + 1; // push down out of the ceiling
        const deg = norm(sense.angle) / DEG;
        if ((deg > 91 && deg < 136) || (deg > 225 && deg < 269)) {
          // steep ceiling: land on it (running around a loop apex)
          this.grounded = true;
          this.angle = sense.angle;
          this.gsp = this.ysp * -Math.sign(Math.sin(sense.angle));
        } else {
          this.ysp = 0;
        }
        return;
      }
    }

    // --- floor ---
    if (this.ysp >= 0) {
      const sense = groundSense(lv, this.layer, this.x, this.y, 0, PHYS.wr, this.hr, 32);
      if (sense && sense.dist <= 0) {
        this.y += sense.dist;
        this.angle = sense.angle;
        this.gsp = landGsp(this.xsp, this.ysp, sense.angle);
        this.grounded = true;
        this.hurtAir = false;
        this.springT = 0;
        const wasBall = this.ball;
        this.jumping = false;
        this.rolling = false;
        if (wasBall) this.adjustRadius(PHYS.hrBall - PHYS.hr);
        // keep rolling if still holding down with speed
        if (inp.down('down') && Math.abs(this.gsp) >= PHYS.minRoll) this.startRoll(game);
      }
    }
  }

  draw(ctx, cam, frame) {
    if (this.invuln > 0 && !this.dead && this.invuln % 4 < 2) return;
    const sx = this.x - cam.x, sy = this.y - cam.y;
    let img, rotate = 0;
    if (this.dead || this.hurtAir) {
      img = SPR.hurt;
    } else if (this.ball) {
      const f = (this.animD * 0.35) & 3;
      img = SPR.roll[Math.floor(f)];
    } else if (!this.grounded && this.springT > 0) {
      img = SPR.spring;
    } else if (this.grounded && Math.abs(this.gsp) < 0.15) {
      img = SPR.stand;
      rotate = this.snapAngle();
    } else {
      const spd = Math.abs(this.grounded ? this.gsp : this.xsp);
      if (spd >= 5.5) {
        img = SPR.run[Math.floor(this.animD / 5) % 2];
      } else {
        img = SPR.walk[Math.floor(this.animD / 8) % 4];
      }
      rotate = this.snapAngle();
    }
    drawCentered(ctx, img, sx, sy, this.facing < 0, rotate);
    if (this.shield) drawShield(ctx, sx, sy, frame);
    if (this.stars > 0 && (this.stars > 120 || frame % 8 < 5)) drawStars(ctx, sx, sy, frame);
  }

  snapAngle() {
    const snapped = Math.round(norm(this.visAngle) / (Math.PI / 4)) * (Math.PI / 4);
    return -snapped;
  }
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export function makeEnts(level) {
  return level.ents.map((s) => {
    const e = { ...s, dead: false };
    switch (e.t) {
      case 'crab': e.w = 34; e.h = 20; e.dir = -1; e.vx = 0.4; break;
      case 'spiker': e.w = 26; e.h = 18; e.dir = -1; e.vx = 0.3; break;
      case 'buzzer': e.w = 26; e.h = 16; e.dir = -1; e.x0 = e.x; e.y0 = e.y; break;
      case 'monitor': e.w = 24; e.h = 26; e.broken = false; break;
      case 'spring': e.w = 28; e.h = 16; e.squash = 0; break;
      case 'spikes': e.h = 16; break;
      case 'dash': e.w = 28; e.h = 12; e.cool = 0; break;
      case 'plat': e.w = 48; e.h = 12; break;
      case 'check': e.active = false; break;
      case 'sign': e.hit = false; e.spinT = 0; break;
      case 'boss': e.w = 44; e.h = 30; e.hp = 8; e.st = 'wait'; e.tm = 0; e.flash = 0;
        e.y0 = e.y; e.tx = e.x; e.ty = e.y; break;
      case 'ring': e.got = false; e.gotT = 0; break;
    }
    return e;
  });
}

function killBadnik(game, e) {
  e.dead = true;
  game.addScore(100);
  game.ents.push({ t: 'boom', x: e.x, y: e.y, tm: 0 });
  game.sound.pop();
}

function badnikTouch(game, e) {
  const p = game.player;
  if (p.dead) return;
  const hb = p.hitbox();
  if (!overlap(e.x, e.y, e.w, e.h, hb.x, hb.y, hb.w, hb.h)) return;
  if (p.stars > 0) { killBadnik(game, e); return; }
  if (p.ball) {
    // spiker has spikes on top: bouncing on it hurts, roll into its side
    if (e.t === 'spiker' && p.y < e.y - 6 && !p.grounded) {
      p.hurt(game, e.x);
      return;
    }
    killBadnik(game, e);
    if (!p.grounded && p.ysp > 0) p.ysp = Math.max(-p.ysp, -7);
    return;
  }
  p.hurt(game, e.x);
}

const TYPES = {
  ring: {
    update(e, g) {
      if (e.got) { e.gotT++; if (e.gotT > 14) e.dead = true; return; }
      const p = g.player;
      if (p.dead) return;
      if (overlap(e.x, e.y, 16, 16, p.x, p.y, 16, p.hr * 2)) {
        e.got = true;
        g.addRing(1);
      }
    },
    draw(e, g, ctx, x, y) {
      if (!e.got) drawRing(ctx, x, y, g.frame);
      else {
        ctx.fillStyle = '#fff8c0';
        const r = e.gotT * 0.8;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + e.gotT * 0.3;
          ctx.fillRect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r - 1, 2, 2);
        }
      }
    },
  },

  sring: { // scattered ring
    update(e, g) {
      e.tm++;
      e.vy += 0.09375;
      e.x += e.vx; e.y += e.vy;
      if (e.vy > 0 && g.level.solidAt(Math.round(e.x), Math.round(e.y + 8), 3)) {
        e.vy *= -0.75; e.vx *= 0.98;
        e.y -= 2;
      }
      if (e.tm > 256 || e.y > g.level.hPx + 20) { e.dead = true; return; }
      const p = g.player;
      if (e.tm > 60 && !p.dead && overlap(e.x, e.y, 14, 14, p.x, p.y, 16, p.hr * 2)) {
        e.dead = true;
        g.addRing(1);
      }
    },
    draw(e, g, ctx, x, y) {
      if (e.tm > 200 && e.tm % 4 < 2) return;
      drawRing(ctx, x, y, g.frame + e.tm);
    },
  },

  monitor: {
    update(e, g) {
      if (e.broken) return;
      const p = g.player;
      if (p.dead) return;
      const hb = p.hitbox();
      if (!overlap(e.x, e.y, e.w, e.h, hb.x, hb.y, hb.w, hb.h)) return;
      const smashing = p.stars > 0 || (p.ball && (p.grounded ? Math.abs(p.gsp) > 1 : true));
      if (smashing) {
        e.broken = true;
        g.ents.push({ t: 'boom', x: e.x, y: e.y - 6, tm: 0 });
        g.sound.monitor();
        g.addScore(100);
        if (!p.grounded && p.ysp > 0) p.ysp = Math.max(-p.ysp * 0.9, -6);
        const P = g.player;
        if (e.kind === 'ring10') g.addRing(10);
        else if (e.kind === 'oneup') { g.lives++; g.sound.oneUp(); }
        else if (e.kind === 'stars') P.stars = 1200;
        else if (e.kind === 'shoes') { P.shoes = 1200; g.sound.setTempo(1.3); }
        else if (e.kind === 'shield') { P.shield = true; g.sound.shieldUp(); }
      } else if (p.grounded) {
        // solid box: push the player out sideways
        if (p.x < e.x) p.x = e.x - e.w / 2 - 9;
        else p.x = e.x + e.w / 2 + 9;
        p.gsp = 0;
      }
    },
    draw(e, g, ctx, x, y) { drawMonitor(ctx, x, y, e.kind, e.broken, g.frame); },
  },

  spring: {
    update(e, g) {
      if (e.squash > 0) e.squash--;
      const p = g.player;
      if (p.dead) return;
      const top = e.y - 16;
      const feet = p.y + p.hr;
      if (Math.abs(p.x - e.x) < 20 && p.ysp >= -0.1 && feet >= top - 6 && feet <= top + 14 && p.y < e.y) {
        const str = e.color === 'red' ? 16 : 10;
        p.springLaunch(str);
        p.y = top - PHYS.hr; // standing radius after launch pose
        e.squash = 12;
        g.sound.spring();
      }
    },
    draw(e, g, ctx, x, y) { drawSpring(ctx, x, y, e.color, e.squash); },
  },

  spikes: {
    update(e, g) {
      const p = g.player;
      if (p.dead) return;
      const hb = p.hitbox();
      if (overlap(e.x, e.y - 8, e.w, 14, hb.x, hb.y, hb.w, hb.h)) p.hurt(g, e.x);
    },
    draw(e, g, ctx, x, y) { drawSpikes(ctx, x, y, e.w); },
  },

  dash: {
    update(e, g) {
      if (e.cool > 0) e.cool--;
      const p = g.player;
      if (p.dead || !p.grounded || e.cool > 0) return;
      if (Math.abs(p.x - e.x) < 18 && Math.abs(p.y + p.hr - e.y) < 26) {
        if (e.dir > 0 ? p.gsp < 12 : p.gsp > -12) {
          p.gsp = 12 * e.dir;
          p.facing = e.dir;
          p.hlock = 8;
          e.cool = 30;
          g.sound.dash();
        }
      }
    },
    draw(e, g, ctx, x, y) { drawDash(ctx, x, y, e.dir, g.frame); },
  },

  plat: {
    pos(e, frame) {
      const ph = Math.sin((frame * TAU) / e.period) * e.range;
      return e.axis === 'x' ? [e.x + ph, e.y] : [e.x, e.y + ph];
    },
    update(e, g) {
      const [ox, oy] = TYPES.plat.pos(e, g.frame);
      const [pxv, pyv] = TYPES.plat.pos(e, g.frame - 1);
      const dx = ox - pxv, dy = oy - pyv;
      const p = g.player;
      if (p.dead) { e.cx = ox; e.cy = oy; return; }
      const top = oy - 6;
      const feet = p.y + p.hr;
      if (p.plat === e) {
        if (Math.abs(p.x - ox) < 30 && p.grounded) {
          p.x += dx;
          p.y = top - p.hr;
        } else {
          p.plat = null;
          p.grounded = false;
        }
      } else if (!p.grounded && p.ysp >= 0 && Math.abs(p.x - ox) < 28) {
        const prevFeet = feet - p.ysp - dy;
        if (feet >= top - 2 && prevFeet <= top + 6) {
          p.plat = e;
          p.grounded = true;
          p.jumping = false;
          p.rolling = false;
          p.angle = 0;
          p.gsp = landGsp(p.xsp, p.ysp, 0);
          p.y = top - PHYS.hr;
          p.hurtAir = false;
          p.springT = 0;
        }
      }
      e.cx = ox; e.cy = oy;
    },
    draw(e, g, ctx) {
      const [ox, oy] = TYPES.plat.pos(e, g.frame);
      drawPlat(ctx, ox - g.cam.x, oy - g.cam.y, g.levelDef.theme);
    },
  },

  crab: {
    update(e, g) {
      e.tm = (e.tm || 0) + 1;
      const nx = e.x + e.dir * e.vx;
      const frontX = Math.round(nx + e.dir * 14);
      const wall = g.level.solidAt(frontX, Math.round(e.y), 3);
      const drop = cast(g.level, 3, frontX, Math.round(e.y), 0, 26);
      if (wall || drop.dist > 24) e.dir *= -1;
      else e.x = nx;
      const gd = cast(g.level, 3, Math.round(e.x), Math.round(e.y), 0, 26);
      if (gd.dist <= 26) e.y += gd.dist - 10;
      badnikTouch(g, e);
    },
    draw(e, g, ctx, x, y) { drawCentered(ctx, SPR.crab[(g.frame >> 4) & 1], x, y); },
  },

  spiker: {
    update(e, g) {
      const nx = e.x + e.dir * e.vx;
      const frontX = Math.round(nx + e.dir * 12);
      const wall = g.level.solidAt(frontX, Math.round(e.y), 3);
      const drop = cast(g.level, 3, frontX, Math.round(e.y), 0, 26);
      if (wall || drop.dist > 24) e.dir *= -1;
      else e.x = nx;
      const gd = cast(g.level, 3, Math.round(e.x), Math.round(e.y), 0, 26);
      if (gd.dist <= 26) e.y += gd.dist - 9;
      badnikTouch(g, e);
    },
    draw(e, g, ctx, x, y) { drawCentered(ctx, SPR.spiker[(g.frame >> 3) & 1], x, y, e.dir > 0); },
  },

  buzzer: {
    update(e, g) {
      e.x += e.dir * 1.0;
      if (Math.abs(e.x - e.x0) > 90) e.dir *= -1;
      e.y = e.y0 + Math.sin(g.frame * 0.09 + e.x0) * 10;
      badnikTouch(g, e);
    },
    draw(e, g, ctx, x, y) { drawCentered(ctx, SPR.buzzer[(g.frame >> 2) & 1], x, y, e.dir > 0); },
  },

  check: {
    update(e, g) {
      const p = g.player;
      if (!e.active && !p.dead && Math.abs(p.x - e.x) < 14 && Math.abs(p.y - e.y) < 40) {
        e.active = true;
        g.setCheckpoint(e);
        g.sound.checkpoint();
      }
    },
    draw(e, g, ctx, x, y) { drawCheckpoint(ctx, x, y, e.active, g.frame); },
  },

  sign: {
    update(e, g) {
      if (e.hit) { if (e.spinT > 0) e.spinT--; return; }
      const p = g.player;
      if (!p.dead && g.state === 'play' && !g.bossAlive && p.x >= e.x) {
        e.hit = true;
        e.spinT = 120;
        g.startGoal(e);
      }
    },
    draw(e, g, ctx, x, y) { drawSign(ctx, x, y, e.spinT, g.frame); },
  },

  boss: {
    update(e, g) {
      const p = g.player;
      if (e.st === 'wait') {
        if (g.bossActive) { e.st = 'fight'; e.tm = 0; }
        return;
      }
      if (e.st === 'dying') {
        e.tm++;
        if (e.tm % 8 === 0 && e.tm < 90) {
          g.ents.push({
            t: 'boom',
            x: e.x + ((e.tm * 37) % 40) - 20,
            y: e.y + ((e.tm * 23) % 26) - 13,
            tm: 0,
          });
          g.sound.pop();
        }
        if (e.tm > 90) { e.y -= 2; e.x += 1.5; }
        if (e.tm > 170) { e.st = 'gone'; e.dead = true; g.bossDefeated(e); }
        return;
      }
      // fight
      e.tm++;
      if (e.flash > 0) e.flash--;
      const z = g.level.bossZone;
      const cxm = (z.x0 + z.x1) / 2;
      const ph = e.tm % 320;
      if (ph < 140) {
        // hover, drifting side to side
        e.tx = cxm + Math.sin(e.tm * 0.02) * 110;
        e.ty = e.y0;
      } else if (ph === 140) {
        // aim a swoop through the player's position
        e.swx0 = e.x;
        e.swx1 = p.x < cxm ? z.x1 - 60 : z.x0 + 60;
        e.dip = g.level.groundAt(cxm) - 34;
      } else if (ph < 240) {
        const s = (ph - 140) / 100;
        e.tx = e.swx0 + (e.swx1 - e.swx0) * s;
        e.ty = e.y0 + (e.dip - e.y0) * Math.sin(Math.PI * s);
      } else {
        e.tx = e.swx1;
        e.ty = e.y0;
      }
      e.x += (e.tx - e.x) * 0.08;
      e.y += (e.ty - e.y) * 0.08;

      // contact
      if (p.dead) return;
      const hb = p.hitbox();
      if (overlap(e.x, e.y, e.w, e.h, hb.x, hb.y, hb.w, hb.h)) {
        if ((p.ball || p.stars > 0) && e.flash <= 0) {
          e.hp--;
          e.flash = 35;
          g.sound.bossHit();
          g.shake = 6;
          g.addScore(100);
          if (!p.grounded) { p.ysp = p.ysp > 0 ? -p.ysp : Math.min(p.ysp, -3); p.xsp *= -0.6; }
          else p.gsp *= -0.7;
          if (e.hp <= 0) {
            e.st = 'dying';
            e.tm = 0;
            g.addScore(1000);
          }
        } else if (!p.ball && p.stars <= 0) {
          p.hurt(g, e.x);
        }
      }
    },
    draw(e, g, ctx, x, y) {
      if (e.st === 'gone') return;
      if (e.flash > 0 && e.flash % 4 < 2) return;
      drawCentered(ctx, SPR.boss[(g.frame >> 3) & 1], x, y);
      if (e.st === 'fight') {
        // hp pips
        for (let i = 0; i < e.hp; i++) {
          ctx.fillStyle = '#f83030';
          ctx.fillRect(x - 24 + i * 6, y - 28, 4, 4);
        }
      }
    },
  },

  boom: {
    update(e, g) { e.tm++; if (e.tm > 22) e.dead = true; },
    draw(e, g, ctx, x, y) { drawBoom(ctx, x, y, e.tm); },
  },
};

export function updateEnts(game) {
  const cx = game.cam.x;
  for (const e of game.ents) {
    if (e.dead) continue;
    // active window: on-screen plus margin (booms/boss/sring always active)
    if (e.t !== 'boom' && e.t !== 'boss' && e.t !== 'sring' && e.t !== 'plat') {
      if (e.x < cx - 64 || e.x > cx + 384) continue;
    }
    TYPES[e.t]?.update(e, game);
  }
  game.ents = game.ents.filter((e) => !e.dead || e.t === 'monitor');
}

export function drawEnts(game, ctx) {
  const { x: cx, y: cy } = game.cam;
  for (const e of game.ents) {
    if (e.dead && e.t !== 'monitor') continue;
    if (e.t !== 'plat' && (e.x < cx - 80 || e.x > cx + 400 || e.y < cy - 120 || e.y > cy + 340)) continue;
    TYPES[e.t]?.draw(e, game, ctx, Math.round(e.x - cx), Math.round(e.y - cy));
  }
}
