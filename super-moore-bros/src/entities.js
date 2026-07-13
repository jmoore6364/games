import { TILE, ROWS, T, SOLID, tileAt } from './level.js';
import { SPR, drawEntity } from './sprites.js';
import { sound } from './audio.js';

// ------------------------------------------------------ tile collision ----

function scanX(e, level, tx) {
  const y0 = Math.floor(e.y / TILE);
  const y1 = Math.floor((e.y + e.h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    if (SOLID.has(tileAt(level, tx, ty))) return true;
  }
  return false;
}

function scanY(e, level, ty) {
  const x0 = Math.floor(e.x / TILE);
  const x1 = Math.floor((e.x + e.w - 0.01) / TILE);
  const hits = [];
  for (let tx = x0; tx <= x1; tx++) {
    if (SOLID.has(tileAt(level, tx, ty))) hits.push(tx);
  }
  return hits;
}

// Moves the entity by vx/vy and resolves against solid tiles.
// Sets e.onGround / e.hitWall; calls onBump(tx, ty) when the head hits a tile.
export function moveAndCollide(e, level, onBump) {
  e.hitWall = false;

  e.x += e.vx;
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / TILE);
    if (scanX(e, level, tx)) { e.x = tx * TILE - e.w; e.hitWall = 1; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TILE);
    if (scanX(e, level, tx)) { e.x = (tx + 1) * TILE; e.hitWall = -1; }
  }

  e.onGround = false;
  e.y += e.vy;
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / TILE);
    if (scanY(e, level, ty).length) { e.y = ty * TILE - e.h; e.vy = 0; e.onGround = true; }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TILE);
    const hits = scanY(e, level, ty);
    if (hits.length) {
      e.y = (ty + 1) * TILE;
      e.vy = 0;
      if (onBump) {
        // bump the tile nearest the entity's center
        const cx = (e.x + e.w / 2) / TILE;
        hits.sort((a, b) => Math.abs(a + 0.5 - cx) - Math.abs(b + 0.5 - cx));
        onBump(hits[0], ty);
      }
    }
  }
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------- player ----

const WALK_MAX = 1.4, RUN_MAX = 2.5, ACCEL = 0.07, RUN_ACCEL = 0.1;
const DECEL = 0.1, SKID = 0.3, AIR_ACCEL = 0.06;
const JUMP_V = 6.7, GRAV_HOLD = 0.28, GRAV = 0.8, MAX_FALL = 6.5;

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.size = 0;          // 0 small, 1 big, 2 fire
    this.w = 10; this.h = 14;
    this.facing = 1;
    this.onGround = false;
    this.state = 'normal';  // normal | die | flag | walkoff
    this.invuln = 0;
    this.growTimer = 0;
    this.animT = 0;
    this.skidding = false;
    this.crouching = false;
    this.dieTimer = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.starTimer = 0;
    this.wings = false; // grants one mid-air jump; lost on damage
    this.airJumps = 0;
  }

  setSize(size) {
    const bottom = this.y + this.h;
    this.size = size;
    this.h = (size > 0 && !this.crouching) ? 27 : 14;
    this.w = size > 0 ? 12 : 10;
    this.y = bottom - this.h;
  }

  hurt(game) {
    if (this.invuln > 0 || this.state !== 'normal') return;
    if (this.wings) { // wings absorb one hit
      this.wings = false;
      this.invuln = 130;
      sound.tone('square', 500, 150, 0.3, 0.5);
    } else if (this.size > 0) {
      this.setSize(0);
      this.invuln = 130;
      this.growTimer = 40;
      sound.tone('square', 500, 150, 0.3, 0.5);
    } else {
      this.die(game);
    }
  }

  die(game) {
    if (this.state === 'die') return;
    this.state = 'die';
    this.dieTimer = 0;
    this.vy = -7;
    this.vx = 0;
    sound.stopMusic();
    sound.die();
    game.onPlayerDeath();
  }

  // kind: 'mushroom' | 'fire' | 'ice' | 'wings'
  powerUp(game, kind = 'mushroom') {
    if (kind === 'wings') {
      this.wings = true;
    } else if (this.size === 0) {
      this.setSize(1);
      this.growTimer = 40;
    } else if (kind === 'fire') {
      this.size = 2;
      this.growTimer = 40;
    } else if (kind === 'ice') {
      this.size = 3;
      this.growTimer = 40;
    }
    game.addScore(1000, this.x, this.y);
    sound.powerup();
  }

  update(input, game) {
    const level = game.level;

    if (this.state === 'die') {
      this.dieTimer++;
      if (this.dieTimer > 20) {
        this.vy = Math.min(this.vy + 0.4, MAX_FALL);
        this.y += this.vy;
      }
      return;
    }

    if (this.state === 'axe') { // frozen while the bridge falls
      this.vy = Math.min(this.vy + GRAV, MAX_FALL);
      moveAndCollide(this, level);
      return;
    }

    if (this.state === 'flag') {
      // slide down the pole
      this.y += 2;
      const groundY = 12 * TILE - this.h;
      if (this.y >= groundY) {
        this.y = groundY;
        this.state = 'walkoff';
        this.facing = 1;
      }
      return;
    }

    if (this.state === 'walkoff') {
      this.vx = 1.2;
      this.vy = Math.min(this.vy + GRAV, MAX_FALL);
      moveAndCollide(this, level);
      this.animT += 1.5;
      if (this.x > (game.level.castleX + 2) * TILE) {
        this.hidden = true;
        this.vx = 0;
      }
      return;
    }

    if (this.invuln > 0) this.invuln--;
    if (this.growTimer > 0) this.growTimer--;
    if (this.starTimer > 0) this.starTimer--;

    // ---- horizontal ----
    const left = input.down('left'), right = input.down('right');
    const run = input.down('run');
    const max = run ? RUN_MAX : WALK_MAX;
    const acc = this.onGround ? (run ? RUN_ACCEL : ACCEL) : AIR_ACCEL;
    let dir = 0;
    if (left && !right) dir = -1;
    if (right && !left) dir = 1;

    // crouch (big only, on ground)
    const wantCrouch = input.down('down') && this.size > 0 && this.onGround;
    if (wantCrouch !== this.crouching) {
      this.crouching = wantCrouch;
      const bottom = this.y + this.h;
      this.h = wantCrouch ? 14 : 27;
      this.y = bottom - this.h;
    }
    if (this.crouching) dir = 0;

    // slippery themes (ice) shrink ground friction
    const fric = level.friction ?? 1;
    const decel = DECEL * fric, skid = Math.max(0.08, SKID * fric);

    this.skidding = false;
    if (dir !== 0) {
      this.facing = dir;
      if (this.vx * dir < 0 && this.onGround) {
        this.vx += dir * skid;
        this.skidding = true;
      } else if (Math.abs(this.vx) < max) {
        this.vx = Math.abs(this.vx + dir * acc) > max ? dir * max : this.vx + dir * acc;
      } else if (this.onGround) {
        this.vx -= Math.sign(this.vx) * decel; // ran out of run boost
      }
    } else if (this.onGround) {
      if (Math.abs(this.vx) <= decel) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * decel;
    }

    // ---- jump (with small buffer + coyote time; wings add one air jump) ----
    if (this.onGround) this.airJumps = this.wings ? 1 : 0;
    this.coyote = this.onGround ? 5 : Math.max(0, this.coyote - 1);
    this.jumpBuf = input.pressed('jump') ? 5 : Math.max(0, this.jumpBuf - 1);
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -(JUMP_V + Math.abs(this.vx) * 0.35);
      this.coyote = 0;
      this.jumpBuf = 0;
      this.size > 0 ? sound.bigJump() : sound.jump();
    } else if (this.jumpBuf > 0 && this.airJumps > 0 && this.vy > -3) {
      this.vy = -6;
      this.airJumps--;
      this.jumpBuf = 0;
      sound.jump();
      game.entities.push(
        new Puff(this.x - 2, this.y + this.h - 2, -0.8),
        new Puff(this.x + this.w, this.y + this.h - 2, 0.8));
    }

    // ---- gravity: hold jump to float higher ----
    const g = (this.vy < 0 && input.down('jump')) ? GRAV_HOLD : GRAV;
    this.vy = Math.min(this.vy + g, MAX_FALL);

    moveAndCollide(this, level, (tx, ty) => game.bumpTile(tx, ty, this));
    if (this.hitWall) this.vx = 0;

    // don't walk behind the camera
    if (this.x < game.cam) { this.x = game.cam; this.vx = Math.max(0, this.vx); }

    // ---- fireballs / iceballs ----
    if (this.size >= 2 && input.pressed('run')) {
      const active = game.entities.filter(e => e instanceof Fireball && !e.dead).length;
      if (active < 2) {
        game.entities.push(new Fireball(
          this.x + this.w / 2 + this.facing * 6, this.y + 4, this.facing, this.size === 3));
        sound.fireball();
      }
    }

    // kick up dust while skidding
    if (this.skidding && this.onGround && (game.frame & 3) === 0) {
      game.entities.push(new Puff(this.x + this.w / 2 - 1, this.y + this.h - 3, -this.facing * 0.5));
    }

    this.animT += Math.abs(this.vx) * 0.6;
  }

  sprite() {
    const set = this.size === 0
      ? (this.growTimer > 0 && (this.growTimer & 4) ? SPR.heroBig : SPR.heroSmall)
      : this.size === 2 ? SPR.heroBigFire
      : this.size === 3 ? SPR.heroBigIce
      : (this.growTimer > 0 && (this.growTimer & 4) ? SPR.heroSmall : SPR.heroBig);
    let frame;
    if (this.state === 'die') frame = set.jump;
    else if (this.crouching && set.crouch) frame = set.crouch;
    else if (!this.onGround && this.state === 'normal') frame = set.jump;
    else if (this.skidding) frame = set.skid;
    else if (Math.abs(this.vx) > 0.1 || this.state === 'walkoff') {
      frame = (this.animT / 6 | 0) % 2 ? set.walk1 : set.walk2;
    } else frame = set.idle;
    return frame[this.facing < 0 ? 'l' : 'r'];
  }

  draw(g, camX) {
    if (this.hidden) return;
    if (this.invuln > 0 && (this.invuln & 4)) return; // blink
    if (this.wings) {
      // flapping wing behind the hero
      const w = SPR.wing[this.facing < 0 ? 'r' : 'l'];
      const flap = this.onGround ? 0 : Math.round(Math.sin(this.animT) * 2);
      g.drawImage(w,
        Math.round(this.x + (this.facing < 0 ? this.w - 2 : -6) - camX),
        Math.round(this.y + 2 + flap));
    }
    if (this.starTimer > 0) {
      // rainbow flicker; slows to a blink as it wears off
      const fast = this.starTimer > 120 || (this.starTimer & 8);
      if (fast) g.filter = `hue-rotate(${(this.starTimer * 37) % 360}deg) saturate(2)`;
      drawEntity(g, this.sprite(), this, camX);
      g.filter = 'none';
      return;
    }
    drawEntity(g, this.sprite(), this, camX);
  }
}

// --------------------------------------------------------------- enemies ----

class Enemy {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.dead = false;
    this.flipTimer = 0;   // >0: flipped/dying, no collision
    this.squashTimer = 0;
    this.freezeTimer = 0; // >0: frozen solid by an ice ball
  }
  get harmful() {
    return !this.dead && this.flipTimer === 0 && this.squashTimer === 0 && this.freezeTimer === 0;
  }
  get frozen() { return this.freezeTimer > 0; }

  baseUpdate(game) {
    if (this.flipTimer > 0) { // knocked out: fly off, no tile collision
      this.flipTimer++;
      this.vy = Math.min(this.vy + 0.35, 7);
      this.x += this.vx; this.y += this.vy;
      if (this.y > (ROWS + 2) * TILE) this.dead = true;
      return false;
    }
    if (this.freezeTimer > 0) { // statue until it thaws
      this.freezeTimer--;
      return false;
    }
    return true;
  }

  flip(game, dir = 1, score = 100) {
    this.flipTimer = 1;
    this.vy = -5;
    this.vx = dir * 1.5;
    game.addScore(score, this.x, this.y);
  }
}

export class Goomba extends Enemy {
  constructor(x, y, fast = false) {
    super(x, y, 14, 13);
    this.fast = fast;
    this.vx = fast ? -1.15 : -0.55;
    this.animT = 0;
  }
  update(game) {
    if (!this.baseUpdate(game)) return;
    if (this.squashTimer > 0) {
      if (++this.squashTimer > 32) this.dead = true;
      return;
    }
    this.vy = Math.min(this.vy + 0.4, 6);
    moveAndCollide(this, game.level);
    if (this.hitWall) this.vx = -this.vx;
    this.animT++;
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
  }
  stomp(game) {
    this.squashTimer = 1;
    this.vx = 0;
    game.addScore(100, this.x, this.y);
    sound.stomp();
  }
  draw(g, camX) {
    const set = this.fast ? SPR.goombaFast : SPR.goomba;
    if (this.flipTimer > 0) {
      const img = set[0].r;
      const x = Math.round(this.x + this.w / 2 - img.width / 2 - camX);
      const y = Math.round(this.y + this.h - img.height);
      g.save(); g.translate(x + 8, y + 8); g.scale(1, -1); g.drawImage(img, -8, -8); g.restore();
      return;
    }
    if (this.squashTimer > 0) {
      drawEntity(g, this.fast ? SPR.goombaFastFlat : SPR.goombaFlat, this, camX);
      return;
    }
    const f = set[0];
    drawEntity(g, (this.animT / (this.fast ? 7 : 12) | 0) % 2 ? f.r : f.l, this, camX);
  }
}

export class Spiny extends Goomba {
  // Spiked shell: never stomp it. Fireballs, ice, shells, and stars only.
  constructor(x, y) {
    super(x, y, false);
    this.spiky = true;
    this.vx = -0.5;
  }
  draw(g, camX) {
    if (this.flipTimer > 0) {
      const img = SPR.spiny;
      const x = Math.round(this.x + this.w / 2 - 8 - camX), y = Math.round(this.y + this.h - 16);
      g.save(); g.translate(x + 8, y + 8); g.scale(1, -1); g.drawImage(img, -8, -8); g.restore();
      return;
    }
    drawEntity(g, SPR.spiny, this, camX);
  }
}

export class Hopper extends Enemy {
  // Bouncy yellow shell-hopper: springs toward the hero.
  constructor(x, y) {
    super(x, y, 14, 14);
    this.vx = -0.5;
    this.animT = 0;
  }
  update(game) {
    if (!this.baseUpdate(game)) return;
    this.vy = Math.min(this.vy + 0.3, 6);
    if (this.onGround && game.frame % 55 === 0) {
      this.vy = -4.6;
      this.vx = game.player.x > this.x ? 0.9 : -0.9;
    }
    moveAndCollide(this, game.level);
    if (this.hitWall) this.vx = -this.vx;
    this.animT++;
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
  }
  stomp(game) {
    this.flipTimer = 1;
    this.vy = -3;
    this.vx = 0;
    game.addScore(150, this.x, this.y);
    sound.stomp();
  }
  draw(g, camX) {
    const f = SPR.hopper[this.onGround ? 0 : 1];
    if (this.flipTimer > 0) {
      const img = f.l;
      const x = Math.round(this.x - camX), y = Math.round(this.y);
      g.save(); g.translate(x + 8, y + 8); g.scale(1, -1); g.drawImage(img, -8, -12); g.restore();
      return;
    }
    drawEntity(g, this.vx > 0 ? f.r : f.l, this, camX);
  }
}

export class Ghost extends Enemy {
  // Shy shade: drifts toward you only while you look away. Star kills it.
  constructor(x, y) {
    super(x, y, 13, 13);
    this.spiky = true;   // touching it always hurts (no stomping a ghost)
    this.noFire = true;  // fire and ice pass through
    this.animT = 0;
    this.homeY = y;
  }
  update(game) {
    if (!this.baseUpdate(game)) return;
    const p = game.player;
    const ghostIsRight = this.x + this.w / 2 > p.x + p.w / 2;
    const playerLooking = (p.facing > 0) === ghostIsRight;
    this.chasing = !playerLooking && p.state === 'normal';
    if (this.chasing) {
      const dx = p.x + p.w / 2 - (this.x + this.w / 2);
      const dy = p.y + p.h / 2 - (this.y + this.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      this.x += (dx / d) * 0.62;
      this.y += (dy / d) * 0.62;
      this.faceLeft = dx < 0;
    }
    this.animT++;
    this.y += Math.sin(this.animT / 24) * 0.15; // idle bob
  }
  draw(g, camX) {
    g.globalAlpha = this.chasing ? 0.9 : 0.55; // fades shy when watched
    drawEntity(g, this.faceLeft ? SPR.ghost : SPR.ghostFlip, this, camX);
    g.globalAlpha = 1;
  }
}

export class Koopa extends Enemy {
  constructor(x, y, red = false) {
    super(x, y, 14, 14);
    this.vx = -0.5;
    this.red = red;    // red koopas turn around at platform edges
    this.mode = 'walk'; // walk | shell | spin
    this.animT = 0;
    this.wakeTimer = 0;
    this.graceTimer = 0; // player can't be hurt by shell just after kicking
    this.comboCount = 0;
  }
  get harmful() {
    return super.harmful && !(this.mode === 'shell') && this.graceTimer === 0;
  }
  update(game) {
    if (!this.baseUpdate(game)) return;
    if (this.graceTimer > 0) this.graceTimer--;
    if (this.mode === 'shell') {
      this.vx = 0;
      if (++this.wakeTimer > 360) { this.mode = 'walk'; this.vx = -0.5; }
    }
    this.vy = Math.min(this.vy + 0.4, 6);
    // red koopas stop at ledges (only while calmly walking)
    if (this.red && this.mode === 'walk' && this.onGround) {
      const aheadX = this.vx < 0 ? this.x - 1 : this.x + this.w + 1;
      const below = tileAt(game.level, Math.floor(aheadX / TILE), Math.floor((this.y + this.h + 2) / TILE));
      if (!SOLID.has(below)) this.vx = -this.vx;
    }
    moveAndCollide(this, game.level);
    if (this.hitWall) {
      this.vx = -this.vx;
      if (this.mode === 'spin') sound.bump();
    }
    if (this.mode === 'spin') {
      // spinning shell kills other enemies
      for (const e of game.entities) {
        if (e !== this && e instanceof Enemy && e.harmful && overlaps(this, e)) {
          this.comboCount = Math.min(this.comboCount + 1, 4);
          e.flip(game, Math.sign(this.vx) || 1, 200 * Math.pow(2, this.comboCount - 1));
          sound.kick();
        }
      }
    }
    this.animT++;
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
  }
  stomp(game) {
    if (this.mode === 'walk') {
      this.mode = 'shell';
      this.vx = 0;
      this.wakeTimer = 0;
      game.addScore(100, this.x, this.y);
    } else if (this.mode === 'spin') {
      this.mode = 'shell';
      this.vx = 0;
      this.wakeTimer = 0;
      game.addScore(200, this.x, this.y);
    }
    sound.stomp();
  }
  kick(game, dir) {
    this.mode = 'spin';
    this.vx = dir * 3.2;
    this.graceTimer = 16;
    this.comboCount = 0;
    game.addScore(200, this.x, this.y);
    sound.kick();
  }
  draw(g, camX) {
    if (this.mode !== 'walk') { drawEntity(g, this.red ? SPR.shellRed : SPR.shell, this, camX); return; }
    const f = (this.red ? SPR.koopaRed : SPR.koopa)[(this.animT / 10 | 0) % 2];
    drawEntity(g, this.vx > 0 ? f.r : f.l, this, camX);
  }
}

export class Piranha extends Enemy {
  // Lives in a pipe: pipeTopY is the pixel y of the pipe's top edge.
  constructor(pipeCenterX, pipeTopY) {
    super(pipeCenterX - 6, pipeTopY, 12, 0);
    this.centerX = pipeCenterX;
    this.pipeTopY = pipeTopY;
    this.extent = 0;        // how far out (0..MAX)
    this.phase = 'hidden';  // hidden | rising | out | sinking
    this.phaseT = 30;
    this.drawUnder = true;  // rendered behind the pipe tiles
  }
  get MAX() { return 22; }
  get harmful() { return super.harmful && this.extent > 4; }
  get stompable() { return false; }
  update(game) {
    if (!this.baseUpdate(game)) return;
    this.phaseT--;
    if (this.phase === 'hidden' && this.phaseT <= 0) {
      // stay down while the player is near (or approaching) the pipe mouth
      const p = game.player;
      const near = Math.abs(p.x + p.w / 2 - this.centerX) < 64;
      if (!near) { this.phase = 'rising'; this.phaseT = 44; }
      else this.phaseT = 20;
    } else if (this.phase === 'rising') {
      this.extent = Math.min(this.MAX, this.extent + 0.5);
      if (this.phaseT <= 0) { this.phase = 'out'; this.phaseT = 65; }
    } else if (this.phase === 'out' && this.phaseT <= 0) {
      this.phase = 'sinking'; this.phaseT = 44;
    } else if (this.phase === 'sinking') {
      this.extent = Math.max(0, this.extent - 0.5);
      if (this.phaseT <= 0) { this.phase = 'hidden'; this.phaseT = 100; }
    }
    // hitbox tracks the exposed part
    this.y = this.pipeTopY - this.extent;
    this.h = this.extent;
  }
  flip(game, dir = 1, score = 200) {
    super.flip(game, dir, score);
    this.h = 20; // give the corpse a body so the fling is visible
  }
  draw(g, camX) {
    if (this.flipTimer > 0) {
      const img = SPR.piranha;
      const x = Math.round(this.centerX - 8 - camX), y = Math.round(this.y);
      g.save(); g.translate(x + 8, y + 10); g.scale(1, -1); g.drawImage(img, -8, -10); g.restore();
      return;
    }
    if (this.extent <= 0) return;
    const img = SPR.piranha;
    const src = Math.round(this.extent);
    g.drawImage(img, 0, 0, 16, src, Math.round(this.centerX - 8 - camX), Math.round(this.pipeTopY - src), 16, src);
  }
}

export class FireBar {
  // Rotating chain of flames around a pivot block. Indestructible hazard.
  constructor(cx, cy) {
    this.cx = cx; this.cy = cy;
    this.angle = Math.PI * 0.75;
    this.balls = 5;
    this.dead = false;
    this.x = cx; this.y = cy; this.w = 0; this.h = 0; // never culled by position
  }
  update() { this.angle += 0.035; }
  // returns true if any flame ball overlaps the rect
  hits(r) {
    for (let i = 1; i < this.balls; i++) {
      const bx = this.cx + Math.cos(this.angle) * i * 7;
      const by = this.cy + Math.sin(this.angle) * i * 7;
      if (bx + 3 > r.x && bx - 3 < r.x + r.w && by + 3 > r.y && by - 3 < r.y + r.h) return true;
    }
    return false;
  }
  draw(g, camX) {
    for (let i = 0; i < this.balls; i++) {
      const bx = this.cx + Math.cos(this.angle) * i * 7;
      const by = this.cy + Math.sin(this.angle) * i * 7;
      g.drawImage(SPR.fireball, Math.round(bx - 3 - camX), Math.round(by - 3));
    }
  }
}

export class Boss extends Enemy {
  // King Snapjaw: paces his bridge, hops now and then. 8 fireballs or the axe.
  constructor(x, y, bridge, opts = {}) {
    super(x, y, 20, 19);
    this.vx = -(opts.speed ?? 0.4);
    this.bridge = bridge; // {fromPx, toPx}
    this.hp = opts.hp ?? 8;
    this.hopEvery = opts.hopEvery ?? 70;
    this.animT = 0;
    this.hopT = 90;
    this.falling = false;
  }
  get harmful() { return super.harmful && !this.falling; }
  update(game) {
    if (this.falling) { // bridge is out: down he goes
      this.vy = Math.min(this.vy + 0.3, 5);
      this.y += this.vy;
      if (this.y > (ROWS + 2) * TILE) this.dead = true;
      return;
    }
    if (!this.baseUpdate(game)) return;
    this.vy = Math.min(this.vy + 0.35, 6);
    if (--this.hopT <= 0 && this.onGround) { this.vy = -3.6; this.hopT = this.hopEvery + (this.animT % 60); }
    moveAndCollide(this, game.level);
    if (this.hitWall) this.vx = -this.vx;
    if (this.x < this.bridge.fromPx) { this.x = this.bridge.fromPx; this.vx = Math.abs(this.vx); }
    if (this.x + this.w > this.bridge.toPx) { this.x = this.bridge.toPx - this.w; this.vx = -Math.abs(this.vx); }
    // face the hero
    this.vx = Math.abs(this.vx) * (game.player.x > this.x ? 1 : -1);
    this.animT++;
  }
  hit(game) { // fireball damage
    if (--this.hp <= 0) this.flip(game, 1, 5000);
    else game.addScore(100, this.x, this.y);
  }
  stomp() { /* can't be squashed */ }
  draw(g, camX) {
    if (this.flipTimer > 0 || this.falling) {
      const img = SPR.boss.l;
      const x = Math.round(this.x + this.w / 2 - 12 - camX), y = Math.round(this.y + this.h - 18);
      g.save(); g.translate(x + 12, y + 10); g.scale(1, -1); g.drawImage(img, -12, -10); g.restore();
      return;
    }
    drawEntity(g, this.vx > 0 ? SPR.boss.r : SPR.boss.l, this, camX);
  }
}

// ----------------------------------------------------------------- items ----

export class Mushroom {
  constructor(tx, ty, oneUp = false) {
    this.x = tx * TILE + 1; this.y = ty * TILE;
    this.w = 14; this.h = 13;
    this.vx = 0; this.vy = 0;
    this.rise = 16;
    this.oneUp = oneUp;
    this.dead = false;
  }
  update(game) {
    if (this.rise > 0) { this.y -= 0.5; this.rise -= 0.5; if (this.rise <= 0) this.vx = 1; return; }
    this.vy = Math.min(this.vy + 0.4, 6);
    moveAndCollide(this, game.level);
    if (this.hitWall) this.vx = -this.vx;
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
  }
  collect(game) {
    this.dead = true;
    if (this.oneUp) {
      game.lives++;
      game.popups.push(new Popup('1UP!', this.x, this.y - 12));
      sound.oneUp();
    } else {
      game.player.powerUp(game);
    }
  }
  draw(g, camX) { drawEntity(g, this.oneUp ? SPR.mushroom1up : SPR.mushroom, this, camX); }
}

export class FireFlower {
  constructor(tx, ty, ice = false) {
    this.x = tx * TILE + 1; this.y = ty * TILE;
    this.w = 14; this.h = 13;
    this.rise = 16;
    this.ice = ice;
    this.dead = false;
  }
  update() { if (this.rise > 0) { this.y -= 0.5; this.rise -= 0.5; } }
  collect(game) {
    this.dead = true;
    game.player.powerUp(game, this.ice ? 'ice' : 'fire');
  }
  draw(g, camX) { drawEntity(g, this.ice ? SPR.iceFlower : SPR.flower, this, camX); }
}

export class WingsItem {
  // Floats out of its block then drifts down slowly, swaying.
  constructor(tx, ty) {
    this.x = tx * TILE + 1; this.y = ty * TILE;
    this.w = 14; this.h = 12;
    this.rise = 16;
    this.t = 0;
    this.dead = false;
  }
  update(game) {
    if (this.rise > 0) { this.y -= 0.5; this.rise -= 0.5; return; }
    this.t++;
    this.x += Math.sin(this.t / 30) * 0.6;
    this.vy = 0.4;
    moveAndCollide(this, game.level);
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
  }
  collect(game) {
    this.dead = true;
    game.player.powerUp(game, 'wings');
  }
  draw(g, camX) { drawEntity(g, SPR.wingsItem, this, camX); }
}

export class Star {
  constructor(tx, ty) {
    this.x = tx * TILE + 1; this.y = ty * TILE;
    this.w = 14; this.h = 14;
    this.vx = 0; this.vy = 0;
    this.rise = 16;
    this.dead = false;
  }
  update(game) {
    if (this.rise > 0) { this.y -= 0.5; this.rise -= 0.5; if (this.rise <= 0) this.vx = 1.4; return; }
    this.vy = Math.min(this.vy + 0.25, 5);
    moveAndCollide(this, game.level);
    if (this.onGround) this.vy = -4.2; // bounce
    if (this.hitWall) this.vx = -this.vx;
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
  }
  collect(game) {
    this.dead = true;
    game.player.starTimer = 620;
    game.addScore(1000, this.x, this.y);
    sound.powerup();
  }
  draw(g, camX) { drawEntity(g, SPR.star, this, camX); }
}

export class CoinPop {
  constructor(tx, ty) {
    this.x = tx * TILE + 1; this.y = ty * TILE - 2;
    this.w = 14; this.h = 14;
    this.vy = -5;
    this.t = 0;
    this.dead = false;
  }
  update() {
    this.vy += 0.35;
    this.y += this.vy;
    if (++this.t > 26) this.dead = true;
  }
  draw(g, camX) {
    const img = SPR.coin[(this.t / 4 | 0) % 3];
    g.drawImage(img, Math.round(this.x - camX), Math.round(this.y));
  }
}

export class Fireball {
  constructor(x, y, dir, ice = false) {
    this.x = x; this.y = y;
    this.w = 6; this.h = 6;
    this.vx = dir * 3.4; this.vy = 1;
    this.ice = ice; // iceballs freeze instead of kill
    this.dead = false;
    this.t = 0;
  }
  update(game) {
    this.vy = Math.min(this.vy + 0.35, 6);
    moveAndCollide(this, game.level);
    if (this.onGround) this.vy = -2.8;
    if (this.hitWall) { this.dead = true; return; }
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
    if (this.x < game.cam - 8 || this.x > game.cam + 264) this.dead = true;
    this.t++;
    for (const e of game.entities) {
      if (!(e instanceof Enemy) || e.dead || e.flipTimer > 0) continue;
      if (e.noFire) continue; // ghosts shrug it off
      if (!overlaps(this, e)) continue;
      if (e instanceof Boss) {
        e.hit(game);
      } else if (e.frozen) {
        e.flip(game, Math.sign(this.vx) || 1, 200); // shatter
      } else if (this.ice) {
        e.freezeTimer = 300;
        e.vx = 0;
        game.addScore(100, e.x, e.y);
      } else if (e.harmful) {
        e.flip(game, Math.sign(this.vx) || 1, 200);
      } else {
        continue;
      }
      sound.kick();
      this.dead = true;
      return;
    }
  }
  draw(g, camX) {
    g.save();
    g.translate(Math.round(this.x + 3 - camX), Math.round(this.y + 3));
    g.rotate((this.t / 4 | 0) * Math.PI / 2);
    g.drawImage(this.ice ? SPR.iceball : SPR.fireball, -3, -3);
    g.restore();
  }
}

export class Shard { // brick fragments
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dead = false;
  }
  update() {
    this.vy += 0.3;
    this.x += this.vx; this.y += this.vy;
    if (this.y > (ROWS + 2) * TILE) this.dead = true;
  }
  draw(g, camX) {
    g.fillStyle = '#c85820';
    g.fillRect(Math.round(this.x - camX), Math.round(this.y), 4, 4);
    g.fillStyle = '#78290c';
    g.fillRect(Math.round(this.x - camX) + 1, Math.round(this.y) + 1, 2, 2);
  }
}

export class Puff { // little dust cloud (skids, stomps)
  constructor(x, y, vx = 0) {
    this.x = x; this.y = y; this.vx = vx;
    this.t = 0;
    this.dead = false;
  }
  update() {
    this.x += this.vx;
    this.y -= 0.3;
    if (++this.t > 14) this.dead = true;
  }
  draw(g, camX) {
    const s = this.t < 7 ? 3 : 2;
    g.fillStyle = this.t < 5 ? '#ffffff' : '#c8c8d8';
    g.fillRect(Math.round(this.x - camX), Math.round(this.y), s, s);
  }
}

export class Popup { // floating score text
  constructor(text, x, y) {
    this.text = String(text);
    this.x = x; this.y = y;
    this.t = 0;
    this.dead = false;
  }
  update() {
    this.y -= 0.7;
    if (++this.t > 40) this.dead = true;
  }
}

export { Enemy };
