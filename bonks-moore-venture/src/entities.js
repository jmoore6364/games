// Bonk, his headbutts, the dinos and the bosses.

import { TILE, T, tileAt } from './levels.js';
import { drawSprite, drawKing, drawStars, drawGeyser } from './sprites.js';

export const BASE_GRAV = 0.22;
const JUMPV = -4.7;
const SPEED = 1.35;
const MAXFALL = 4.5;
const GLIDE_FALL = 0.55; // spin-glide descent cap

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const isSolid = (t) => t === T.SOLID || t === T.BITE || t === T.ICE;
const isStand = (t) => isSolid(t) || t === T.PLAT;

// ============================ BONK ============================

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 12; this.h = 20;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.onGround = false;
    this.groundTile = 0;
    this.swim = false;
    this.climb = false; this.climbDir = 1; this.climbCol = 0; this.chompT = 0; this.releaseT = 0;
    this.dive = false;
    this.spin = false; this.spinIdle = 0; this.spinPress = 0; this.spinT = 0;
    this.buttT = 0; this.buttHit = null;
    this.chain = 0;       // dive-bounce combo
    this.airJump = false; // restored by each dive-bounce
    this.invuln = 0; this.hurtT = 0; this.stunT = 0; this.graceT = 0; this.kb = 0;
    this.meat = 0; this.meatT = 0; // 1 = angry, 2 = rampage
    this.strokeT = 0;
    this.runT = 0;
    this.dropT = 0;
    this.dead = false; this.deadT = 0;
  }

  hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  // the head, leading the dive
  divebox() { return { x: this.x - 2, y: this.y + this.h - 13, w: this.w + 4, h: 13 }; }
  // standing headbutt arc, out in front
  buttbox() {
    return { x: this.face > 0 ? this.x + this.w - 2 : this.x - 15, y: this.y + 1, w: 17, h: 15 };
  }
  buttActive() { return this.buttT > 3 && this.buttT < 13; }

  update(game, inp) {
    const st = game.stage;
    const g = st.g;
    const grav = BASE_GRAV * (st.grav || 1);

    if (this.dead) {
      this.deadT++;
      if (this.deadT > 20) { this.vy = Math.min(MAXFALL, this.vy + grav); this.y += this.vy; }
      else this.vy = -3;
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.hurtT > 0) this.hurtT--;
    if (this.stunT > 0) this.stunT--;
    if (this.graceT > 0) this.graceT--;
    if (this.buttT > 0) this.buttT--;
    if (this.strokeT > 0) this.strokeT--;
    if (this.dropT > 0) this.dropT--;

    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const inWater = tileAt(g, Math.floor(cx / TILE), Math.floor(cy / TILE)) === T.WATER;

    // ---------------- swimming: headbutt strokes ----------------
    if (inWater) {
      if (!this.swim) {
        this.swim = true;
        this.dive = false; this.spin = false; this.climb = false;
        this.vy *= 0.35; this.chain = 0;
        game.sound.splash();
      }
      const lr = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
      const ud = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
      if (lr) this.face = lr;
      this.vx += lr * 0.1; this.vy += ud * 0.09;
      this.vx *= 0.94; this.vy *= 0.95;
      this.vy += 0.015; // gentle sink
      if (inp.pressed('bonk')) { // headbutt stroke
        this.vx += this.face * 2.1;
        if (ud) this.vy += ud * 1.4;
        this.strokeT = 14;
        game.sound.bloop();
      }
      const surface = tileAt(g, Math.floor(cx / TILE), Math.floor(cy / TILE) - 1) !== T.WATER
        && !isSolid(tileAt(g, Math.floor(cx / TILE), Math.floor(cy / TILE) - 1));
      if (inp.pressed('jump')) {
        if (surface && cy - Math.floor(cy / TILE) * TILE < 12) { this.vy = -4.4; game.sound.splash(); }
        else { this.vy -= 1.6; game.sound.bloop(); }
      }
      this.vx = Math.max(-2.2, Math.min(2.2, this.vx));
      this.vy = Math.max(-4.4, Math.min(2.2, this.vy));
      this.moveClip(g);
      this.onGround = false;
      if (tileAt(g, Math.floor((this.x + this.w / 2) / TILE), Math.floor((this.y + this.h / 2) / TILE)) !== T.WATER) {
        this.swim = false;
      }
      return;
    }
    if (this.swim) this.swim = false;

    // ---------------- teeth-climb: bite the wall, gnaw up ----------------
    if (this.climb) {
      this.vx = 0; this.vy = 0;
      // stay pinned to the wall face
      this.x = this.climbDir > 0 ? this.climbCol * TILE - this.w : (this.climbCol + 1) * TILE;
      this.face = this.climbDir;
      const rowAtHead = Math.floor((this.y + 5) / TILE);
      const rowAtFeet = Math.floor((this.y + this.h - 2) / TILE);
      if (tileAt(g, this.climbCol, rowAtHead) !== T.BITE && tileAt(g, this.climbCol, rowAtFeet) !== T.BITE) {
        this.climb = false; // gnawed off the end of the marked wall
      } else if (inp.pressed('jump')) {
        // spit and leap away
        this.climb = false;
        this.vy = -4.2; this.vx = -this.climbDir * 1.6; this.face = -this.climbDir;
        game.sound.jump();
      } else {
        if (inp.down('up')) {
          if (tileAt(g, this.climbCol, rowAtHead - 1) === T.BITE || tileAt(g, this.climbCol, rowAtHead) === T.BITE) {
            this.y -= 0.75; this.chompT++;
            if (this.chompT % 11 === 0) game.sound.chomp();
          }
          // gnawed to the top — vault onto the ledge
          if (tileAt(g, this.climbCol, Math.floor((this.y + 5) / TILE)) !== T.BITE
              && tileAt(g, this.climbCol, Math.floor((this.y + 5) / TILE) - 1) !== T.BITE
              && !isSolid(tileAt(g, this.climbCol, Math.floor((this.y + 5) / TILE) - 1))) {
            this.climb = false;
            this.vy = -4.5; this.vx = this.climbDir * 1.3;
            game.sound.jump();
          }
        } else if (inp.down('down')) {
          if (tileAt(g, this.climbCol, rowAtFeet + 1) === T.BITE) {
            this.y += 1.1; this.chompT++;
            if (this.chompT % 11 === 0) game.sound.chomp();
          } else this.climb = false; // let go off the bottom
        }
        // hold away from the wall to let go
        const away = this.climbDir > 0 ? inp.down('left') : inp.down('right');
        this.releaseT = away ? this.releaseT + 1 : 0;
        if (this.releaseT > 9) { this.climb = false; this.face = -this.climbDir; }
      }
      if (this.climb) return;
    }

    // ---------------- on land / in air ----------------
    const lr = this.stunT > 0 ? 0 : (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    if (lr) this.face = lr;
    const target = lr * SPEED * (this.dive ? 0.45 : 1);
    if (this.onGround && this.groundTile === T.ICE) {
      this.vx += (target - this.vx) * 0.055; // slippery!
    } else if (this.dive) {
      this.vx += (target - this.vx) * 0.2;
    } else {
      this.vx = target;
    }
    if (this.stunT > 0) this.vx = this.kb || 0; // hit-stun knockback
    else this.kb = 0;
    if (lr && this.onGround) this.runT++;

    // jump (and the dive-bounce restored jump)
    if (inp.pressed('jump') && this.stunT <= 0) {
      const feetRow = Math.floor((this.y + this.h + 1) / TILE);
      const under = tileAt(g, Math.floor((this.x + this.w / 2) / TILE), feetRow);
      if (this.onGround && inp.down('down') && under === T.PLAT) {
        this.dropT = 12; this.y += 2; this.vy = 1; this.onGround = false;
      } else if (this.onGround) {
        this.vy = JUMPV; this.onGround = false;
        game.sound.jump();
      } else if (this.airJump) {
        this.vy = JUMPV; this.airJump = false;
        this.dive = false; this.spin = false;
        game.sound.jump();
      }
    }

    // THE HEAD: X on ground = headbutt; in air = dive; again = spin-flutter
    if (inp.pressed('bonk') && this.stunT <= 0) {
      if (this.onGround) {
        if (this.buttT <= 0) {
          this.buttT = 16;
          this.buttHit = new Set();
          game.sound.swing();
        }
      } else if (!this.dive && !this.spin) {
        // DIVING HEADBUTT — plunge head-first
        this.dive = true;
        this.vy = Math.max(this.vy, 1.4);
        game.sound.swing();
      } else {
        // SPIN — flutter/glide, mash or hold to keep floating
        this.dive = false;
        this.spin = true;
        this.spinPress = 24;
        this.vy = Math.min(this.vy, -0.9);
        game.sound.swing();
      }
    }
    if (this.spin) {
      this.spinT++;
      const sustained = inp.down('bonk') || this.spinPress > 0;
      if (this.spinPress > 0) this.spinPress--;
      this.spinIdle = sustained ? 0 : this.spinIdle + 1;
      if (this.spinIdle > 26) { this.spin = false; this.spinIdle = 0; }
    }

    // gravity
    this.vy += grav * (this.dive ? 2.4 : 1);
    let cap = MAXFALL;
    if (this.dive) cap = 6;
    else if (this.spin && (inp.down('bonk') || this.spinPress > 0)) cap = GLIDE_FALL;
    this.vy = Math.min(cap, this.vy);

    // ---- horizontal move + BITE latch ----
    if (this.vx) {
      const nx = this.x + this.vx;
      const edge = this.vx > 0 ? nx + this.w : nx;
      const col = Math.floor(edge / TILE);
      let blocked = false, biteHit = false;
      for (let sy = this.y + 2; sy < this.y + this.h; sy += 8) {
        const t = tileAt(g, col, Math.floor(sy / TILE));
        if (isSolid(t)) { blocked = true; if (t === T.BITE) biteHit = true; }
      }
      if (!blocked) this.x = nx;
      else {
        this.x = this.vx > 0 ? col * TILE - this.w - 0.01 : (col + 1) * TILE + 0.01;
        // CLIMB WITH YOUR TEETH — chomp onto the marked wall
        if (biteHit && !this.onGround && lr === Math.sign(this.vx)) {
          this.climb = true;
          this.climbDir = Math.sign(this.vx);
          this.climbCol = col;
          this.dive = false; this.spin = false;
          this.vy = 0; this.vx = 0; this.chain = 0;
          this.chompT = 0; this.releaseT = 0;
          game.sound.chomp();
        }
      }
    }
    this.x = Math.max(0, Math.min(this.x, g.w * TILE - this.w));

    // ---- vertical move ----
    let ny = this.y + this.vy;
    const hcx = this.x + this.w / 2;
    if (this.vy < 0) {
      if (isSolid(tileAt(g, Math.floor(hcx / TILE), Math.floor(ny / TILE)))) {
        ny = (Math.floor(ny / TILE) + 1) * TILE;
        this.vy = 0;
      }
      this.onGround = false;
      this.y = ny;
    } else {
      const prevFeet = this.y + this.h;
      const feet = ny + this.h;
      let landed = false;
      const r0 = Math.floor(prevFeet / TILE), r1 = Math.floor(feet / TILE);
      for (let r = r0; r <= r1 && !landed; r++) {
        const top = r * TILE;
        if (top + 0.01 < prevFeet) continue; // must cross the top from above
        for (const sx of [this.x + 1, this.x + this.w - 1]) {
          const t = tileAt(g, Math.floor(sx / TILE), r);
          if (!isStand(t)) continue;
          if (this.dropT > 0 && t === T.PLAT) continue;
          this.y = top - this.h;
          const wasDive = this.dive;
          if (!this.onGround && !wasDive) game.sound.land();
          this.onGround = true;
          this.groundTile = t;
          this.vy = 0;
          this.spin = false;
          this.chain = 0;
          this.airJump = false;
          if (wasDive) { this.dive = false; game.groundPound(this); }
          landed = true;
          break;
        }
      }
      if (!landed) {
        this.y = ny;
        if (this.vy > 1) this.onGround = false;
      }
    }

    // lava singes
    const footT = tileAt(g, Math.floor((this.x + this.w / 2) / TILE), Math.floor((this.y + this.h - 2) / TILE));
    if (footT === T.LAVA) {
      this.vy = -5.2; this.onGround = false; this.dive = false;
      game.hurtPlayer(1);
    }
  }

  // shared clipped mover for swimming
  moveClip(g) {
    if (this.vx) {
      const nx = this.x + this.vx;
      const edge = this.vx > 0 ? nx + this.w : nx;
      const col = Math.floor(edge / TILE);
      let blocked = false;
      for (let sy = this.y + 2; sy < this.y + this.h; sy += 8) {
        if (isSolid(tileAt(g, col, Math.floor(sy / TILE)))) blocked = true;
      }
      if (!blocked) this.x = nx; else this.vx = 0;
    }
    if (this.vy) {
      const ny = this.y + this.vy;
      const edge = this.vy > 0 ? ny + this.h : ny;
      const row = Math.floor(edge / TILE);
      let blocked = false;
      for (const sx of [this.x + 1, this.x + this.w - 1]) {
        if (isSolid(tileAt(g, Math.floor(sx / TILE), row))) blocked = true;
      }
      if (!blocked) this.y = ny; else this.vy = 0;
    }
  }

  draw(ctx, cam, frame) {
    if (this.dead && this.deadT % 4 >= 2) return;
    if (this.invuln > 0 && this.meat === 0 && (frame % 4) >= 2) return;
    const x = Math.round(this.x - 3 - cam.x), y = Math.round(this.y - cam.y);
    let name = 'b_stand';
    let dy = 0, dx = 0;
    const flip = this.face < 0;
    if (this.dead) name = 'b_cry';
    else if (this.swim) name = this.strokeT > 6 ? 'b_swim2' : 'b_swim1', dx = flip ? -2 : -3;
    else if (this.climb) name = (Math.floor(frame / 6) % 2 || (this.chompT % 22 > 11)) ? 'b_climb2' : 'b_climb1';
    else if (this.hurtT > 0) name = 'b_hurt';
    else if (this.dive) name = 'b_dive';
    else if (this.spin) name = (frame >> 2) % 2 ? 'b_spin1' : 'b_spin2', dy = 4;
    else if (this.buttT > 0) name = 'b_butt', dx = this.buttActive() ? this.face * 3 : 0;
    else if (!this.onGround) name = 'b_jump';
    else if (this.runT && Math.abs(this.vx) > 0.3) name = (this.runT >> 3) % 2 ? 'b_run1' : 'b_run2';
    let pre = '';
    if (this.meat === 1) pre = (frame % 6 < 3) ? 'hot_' : '';
    else if (this.meat === 2) pre = (frame % 4 < 2) ? 'bz_' : 'hot_';
    drawSprite(ctx, pre + name, x + dx, y + dy, flip);
    if (this.stunT > 0) drawStars(ctx, this.x + this.w / 2 - cam.x, this.y - 4 - cam.y, this.stunT);
  }
}

// ============================ ENEMIES ============================

const EDEF = {
  dino: { w: 14, h: 12, hp: 1, score: 100 },
  shell: { w: 16, h: 9, hp: 2, score: 200 },
  ptero: { w: 18, h: 9, hp: 1, score: 300, fly: true },
  frog: { w: 12, h: 10, hp: 1, score: 150 },
  spiky: { w: 14, h: 8, hp: 1, score: 400, spiky: true },
  fish: { w: 15, h: 7, hp: 1, score: 200, fly: true },
  cactus: { w: 12, h: 14, hp: 2, score: 300, still: true },
  penguin: { w: 12, h: 14, hp: 1, score: 200 },
  grub: { w: 26, h: 11, hp: 8, score: 2000, boss: 'mid' },
  king: { w: 44, h: 50, hp: 6, score: 10000, boss: 'final' },
};

export function spawnEnemy(game, t, x, y, opts = {}) {
  const e = {
    t, x, y, vx: 0, vy: 0, face: -1, stun: 0, flash: 0, tick: 0,
    onG: false, flip: 0, mode: 'pace', modeT: 0, y0: y, x0: x,
    ...EDEF[t], ...opts,
  };
  e.hpMax = e.hp;
  game.enemies.push(e);
  return e;
}

function eGravity(game, e) {
  const g = game.stage.g;
  const grav = BASE_GRAV * (game.stage.grav || 1);
  e.vy = Math.min(4.4, e.vy + grav);
  e.y += e.vy;
  const feet = e.y + e.h;
  const ty = Math.floor(feet / TILE);
  let landed = false;
  for (const sx of [e.x + 2, e.x + e.w - 2]) {
    const t = tileAt(g, Math.floor(sx / TILE), ty);
    if (isStand(t) && e.vy >= 0 && feet - ty * TILE <= e.vy + 4) {
      e.y = ty * TILE - e.h; e.vy = 0; landed = true;
      break;
    }
  }
  e.onG = landed;
}

function edgeOrWall(game, e) {
  const g = game.stage.g;
  const front = e.face > 0 ? e.x + e.w + 2 : e.x - 2;
  const fx = Math.floor(front / TILE);
  const midY = Math.floor((e.y + e.h / 2) / TILE);
  if (isSolid(tileAt(g, fx, midY))) return true;
  const below = tileAt(g, fx, Math.floor((e.y + e.h + 4) / TILE));
  if (e.onG && !isStand(below) && below !== T.WATER) return true;
  return false;
}

export function updateEnemies(game) {
  const P = game.player;
  for (const e of game.enemies) {
    e.tick++;
    if (e.flash > 0) e.flash--;
    // only think when near the camera
    if (e.x < game.camX - 320 || e.x > game.camX + 576) continue;
    if (e.stun > 0) {
      e.stun--;
      if (!e.fly && !e.still) { e.vx = 0; eGravity(game, e); }
      continue;
    }
    switch (e.t) {
      case 'dino':
        if (edgeOrWall(game, e)) e.face *= -1;
        e.x += e.face * 0.5;
        eGravity(game, e);
        break;
      case 'shell':
        if (e.flip > 0) { e.flip--; eGravity(game, e); break; }
        if (edgeOrWall(game, e)) e.face *= -1;
        e.x += e.face * 0.3;
        eGravity(game, e);
        break;
      case 'frog':
        if (e.onG) {
          e.vx = 0;
          if (e.tick % 75 === 0) {
            e.face = P.x > e.x ? 1 : -1;
            e.vy = -3.4; e.vx = e.face * 1.1;
          }
        }
        e.x += e.vx;
        if (edgeOrWall(game, e) && e.onG) e.face *= -1;
        eGravity(game, e);
        break;
      case 'ptero': {
        e.y = e.y0 + Math.sin(e.tick / 26) * 12;
        const dx = P.x - e.x;
        e.x += Math.sign(dx) * Math.min(0.55, Math.abs(dx) * 0.01);
        e.face = dx > 0 ? 1 : -1;
        if (Math.abs(dx) < 10 && e.tick % 90 < 2 && P.y > e.y) {
          game.ebullets.push({ kind: 'egg', x: e.x + e.w / 2 - 3, y: e.y + e.h, w: 7, h: 8, vx: 0, vy: 0.5 });
          game.sound.eshoot();
        }
        break;
      }
      case 'spiky':
        if (edgeOrWall(game, e)) e.face *= -1;
        e.x += e.face * 0.4;
        eGravity(game, e);
        break;
      case 'fish': {
        const g = game.stage.g;
        const targetY = P.swim ? P.y : e.y0;
        e.y += Math.sign(targetY - e.y) * 0.4 + Math.sin(e.tick / 18) * 0.3;
        const nx = e.x + e.face * 0.8;
        const ahead = tileAt(g, Math.floor((e.face > 0 ? nx + e.w + 2 : nx - 2) / TILE), Math.floor((e.y + e.h / 2) / TILE));
        if (ahead !== T.WATER) e.face *= -1; else e.x = nx;
        if (tileAt(g, Math.floor(e.x / TILE), Math.floor(e.y / TILE)) !== T.WATER) e.y = e.y0;
        break;
      }
      case 'cactus':
        if (Math.abs(P.x - e.x) < 130 && Math.abs(P.y - e.y) < 60 && e.tick % 110 === 0) {
          const dir = P.x > e.x ? 1 : -1;
          game.ebullets.push({ kind: 'needle', x: e.x + (dir > 0 ? e.w : -6), y: e.y + 5, w: 6, h: 3, vx: dir * 1.9, vy: 0 });
          game.ebullets.push({ kind: 'needle', x: e.x + (dir > 0 ? e.w : -6), y: e.y + 5, w: 6, h: 3, vx: dir * 1.9, vy: -0.5 });
          game.sound.eshoot();
        }
        break;
      case 'penguin':
        if (e.mode === 'slide') {
          e.modeT--;
          e.x += e.face * 1.8;
          if (edgeOrWall(game, e)) e.face *= -1;
          if (e.modeT <= 0) e.mode = 'pace';
        } else {
          if (edgeOrWall(game, e)) e.face *= -1;
          e.x += e.face * 0.4;
          if (Math.abs(P.y - e.y) < 30 && Math.abs(P.x - e.x) < 90 && e.tick % 130 === 0) {
            e.mode = 'slide'; e.modeT = 55; e.face = P.x > e.x ? 1 : -1;
            game.sound.swing();
          }
        }
        eGravity(game, e);
        break;
      case 'grub':
        if (Math.abs(P.x - e.x) > 300) break;
        if (e.mode === 'lunge') {
          e.modeT--;
          e.x += e.face * 2.1;
          if (edgeOrWall(game, e)) e.face *= -1;
          if (e.modeT <= 0) e.mode = 'pace';
        } else {
          e.face = P.x > e.x ? 1 : -1;
          e.x += e.face * 0.35;
          if (edgeOrWall(game, e)) e.x -= e.face * 0.35;
          if (e.tick % 170 === 0) { e.mode = 'lunge'; e.modeT = 42; game.sound.roar(); }
        }
        eGravity(game, e);
        break;
      case 'king': {
        if (!game.bossOn) break;
        e.modeT--;
        if (e.mode === 'pace') {
          e.face = P.x > e.x + e.w / 2 ? 1 : -1;
          e.x += e.face * 0.4;
          if (e.modeT <= 0) {
            if (e.nextJump) { e.mode = 'jump'; e.vy = -5.6; e.nextJump = false; game.sound.roar(); }
            else { e.mode = 'charge'; e.modeT = 70; e.nextJump = true; game.sound.roar(); }
          }
        } else if (e.mode === 'charge') {
          e.x += e.face * 2.0;
          if (edgeOrWall(game, e)) e.face *= -1;
          if (e.modeT <= 0) { e.mode = 'pace'; e.modeT = 80; }
        } else if (e.mode === 'jump') {
          e.x += e.face * 1.2;
          if (e.onG && e.vy === 0) {
            // the landing SHAKES THE SCREEN and staggers grounded Bonk
            e.mode = 'pace'; e.modeT = 90;
            game.shake = 12;
            game.sound.stomp();
            if (P.onGround && !P.dead) P.stunT = Math.max(P.stunT, 45);
          }
        }
        const arena0 = (game.stage.bossX ?? 0) * TILE + 8;
        e.x = Math.max(arena0, Math.min(e.x, game.stage.g.w * TILE - e.w - 40));
        eGravity(game, e);
        break;
      }
    }
  }
  game.enemies = game.enemies.filter((e) => !e.gone);
}

export function damageEnemy(game, e, dmg) {
  if (e.t === 'shell' && e.flip <= 0 && dmg < 90) {
    // headbutt flips it onto its back — now it's vulnerable
    e.flip = 300; e.stun = 300;
    game.sound.bonk();
    return;
  }
  e.hp -= dmg;
  e.flash = 8;
  if (e.hp <= 0) {
    e.gone = true;
    game.addScore(e.score);
    game.effects.push({ kind: 'poof', x: e.x + e.w / 2, y: e.y + e.h / 2, t: 0 });
    game.sound.esquish();
    if (e.t === 'grub') { game.sound.bossDie(); game.addEffectText('BIG GRUB DOWN!', e.x, e.y - 12); }
    else if (e.t === 'king') game.onKingDown(e);
    else if ((e.x | 0) % 3 === 0) game.spawnItem('smiley', e.x + e.w / 2 - 5, e.y);
  } else if (e.t === 'grub' || e.t === 'king') {
    game.sound.roar();
  }
}

export function drawEnemies(game, ctx, frame) {
  for (const e of game.enemies) {
    if (e.x < game.camX - 40 || e.x > game.camX + 300) continue;
    const x = e.x - game.camX, y = e.y - game.camY;
    const flip = e.face > 0;
    if (e.flash > 0 && (frame % 4) < 2) continue;
    switch (e.t) {
      case 'dino': drawSprite(ctx, (frame >> 4) % 2 ? 'e_dino1' : 'e_dino2', x, y, flip); break;
      case 'shell': drawSprite(ctx, e.flip > 0 ? 'e_shellflip' : 'e_shell', x, y, flip); break;
      case 'ptero': drawSprite(ctx, (frame >> 3) % 2 ? 'e_ptero1' : 'e_ptero2', x, y + 1, flip); break;
      case 'frog': drawSprite(ctx, 'e_frog', x, y - 1, flip); break;
      case 'spiky': drawSprite(ctx, 'e_spiky', x, y - 1, flip); break;
      case 'fish': drawSprite(ctx, 'e_fish', x, y, flip); break;
      case 'cactus': drawSprite(ctx, 'e_cactus', x, y - 1, flip); break;
      case 'penguin': drawSprite(ctx, 'e_penguin', x, y, flip); break;
      case 'grub': drawSprite(ctx, 'e_grub', x, y - 1, flip); break;
      case 'king':
        drawKing(ctx, x - 2, y - 2, frame, !flip, e.flash > 0, e.hp <= 2);
        break;
    }
    if (e.stun > 0 && e.t !== 'shell') drawStars(ctx, e.x + e.w / 2 - game.camX, e.y - 5 - game.camY, e.stun);
  }
}

// ============================ ENEMY SHOTS ============================

export function updateEBullets(game) {
  const g = game.stage.g;
  for (const b of game.ebullets) {
    if (b.kind === 'egg') b.vy = Math.min(3.4, b.vy + 0.14);
    b.x += b.vx; b.y += b.vy;
    const t = tileAt(g, Math.floor((b.x + b.w / 2) / TILE), Math.floor((b.y + b.h / 2) / TILE));
    if (isSolid(t) || t === T.LAVA) {
      b.gone = true;
      if (b.kind === 'egg') { game.effects.push({ kind: 'poof', x: b.x + 3, y: b.y + 4, t: 6 }); game.sound.crack(); }
    }
    if (b.x < game.camX - 60 || b.x > game.camX + 320 || b.y > g.h * TILE + 40) b.gone = true;
  }
  game.ebullets = game.ebullets.filter((b) => !b.gone);
}

export function drawEBullets(game, ctx) {
  for (const b of game.ebullets) {
    if (b.kind === 'egg') drawSprite(ctx, 'i_egg', b.x - game.camX, b.y - game.camY);
    else {
      ctx.fillStyle = '#207828';
      ctx.fillRect(b.x - game.camX, b.y - game.camY, b.w, b.h);
      ctx.fillStyle = '#a8e8b8';
      ctx.fillRect(b.x - game.camX + (b.vx > 0 ? b.w - 2 : 0), b.y - game.camY + 1, 2, 1);
    }
  }
}

// ============================ ITEMS ============================

const IDEF = {
  smiley: { w: 10, h: 8 },
  meat1: { w: 12, h: 6 },
  meat2: { w: 16, h: 9 },
  heart: { w: 10, h: 8 },
  heartcont: { w: 12, h: 9 },
  fruit: { w: 10, h: 9 },
  spring: { w: 16, h: 12, fixed: true },
  geyser: { w: 14, h: 4, fixed: true },
  door: { w: 20, h: 15, fixed: true },
  goal: { w: 24, h: 16, fixed: true },
};

export function spawnItem(game, t, x, y, opts = {}) {
  const it = { t, x, y, tick: (x | 0) % 60, squish: 0, ...IDEF[t], ...opts };
  game.items.push(it);
  return it;
}

export function updateItems(game, inp) {
  const P = game.player;
  const pb = P.hitbox();
  for (const it of game.items) {
    it.tick++;
    switch (it.t) {
      case 'spring': {
        if (it.squish > 0) it.squish--;
        const top = { x: it.x + 1, y: it.y - 2, w: it.w - 2, h: 8 };
        if (!P.dead && P.vy > 0.5 && overlap(top, pb) && pb.y + pb.h < it.y + 10) {
          P.vy = -7.6;
          P.dive = false; P.spin = false;
          P.onGround = false;
          it.squish = 14;
          game.sound.boing();
        }
        break;
      }
      case 'geyser': {
        const period = 200;
        const ph = it.tick % period;
        it.active = ph < 80;
        it.hgt = it.active ? Math.min(84, ph * 5) : 0;
        if (it.active && !P.dead) {
          const col = { x: it.x - 2, y: it.y - it.hgt, w: it.w + 4, h: it.hgt };
          if (overlap(col, pb)) {
            P.vy = Math.max(P.vy - 1.7, -8.4); // bouncy geyser BOOST
            P.dive = false;
            if (P.vy <= -8 && it.tick % 9 === 0) game.sound.boing();
          }
        }
        break;
      }
      case 'door':
        if (!P.dead && P.onGround && inp && inp.down('up') && overlap(it, pb) && !game.bonusInfo) {
          game.enterBonus(it.room, it);
          it.used = true;
        }
        break;
      case 'goal':
        if (!P.dead && overlap(it, pb)) game.roundClear();
        break;
      default: {
        // collectible bob
        const box = { x: it.x, y: it.y + Math.sin(it.tick / 14) * 2, w: it.w, h: it.h };
        if (!P.dead && overlap(box, pb)) {
          it.gone = true;
          game.collectItem(it.t);
        }
      }
    }
  }
  game.items = game.items.filter((it) => !it.gone && !it.used);
}

export function drawItems(game, ctx, frame) {
  for (const it of game.items) {
    if (it.x < game.camX - 48 || it.x > game.camX + 300) continue;
    const x = it.x - game.camX;
    const y = it.y - game.camY + (it.fixed ? 0 : Math.sin(it.tick / 14) * 2);
    switch (it.t) {
      case 'smiley': drawSprite(ctx, 'i_smiley', x, y - 1); break;
      case 'meat1': drawSprite(ctx, 'i_meat1', x, y); break;
      case 'meat2': drawSprite(ctx, 'i_meat2', x, y - 2); break;
      case 'heart': drawSprite(ctx, 'i_heart', x, y); break;
      case 'heartcont': drawSprite(ctx, 'i_heartcont', x, y - 2); break;
      case 'fruit': drawSprite(ctx, 'i_fruit', x, y - 1); break;
      case 'spring': drawSprite(ctx, it.squish > 0 ? 'i_spring2' : 'i_spring1', x, y); break;
      case 'door': {
        drawSprite(ctx, 'i_door', x, y - 11);
        if ((frame % 50) < 30) {
          ctx.fillStyle = '#f8f8f8';
          ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('UP!', x + 10, y - 20);
        }
        break;
      }
      case 'goal': {
        const bob = Math.sin(it.tick / 20) * 2;
        drawSprite(ctx, 'i_goal', x, y - 14 + bob);
        break;
      }
      case 'geyser':
        if (it.active && it.hgt > 4) drawGeyser(ctx, x, y, it.hgt, frame);
        // bubbling vent
        ctx.fillStyle = '#a8e0f8';
        if (!it.active && (frame >> 3) % 2) ctx.fillRect(x + 4, y - 2, 3, 2);
        ctx.fillStyle = '#584850';
        ctx.fillRect(x - 2, y, it.w + 4, 4);
        break;
    }
  }
}
