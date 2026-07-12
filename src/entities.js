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
    if (this.size > 0) {
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

  powerUp(game) {
    if (this.size === 0) {
      this.setSize(1);
      this.growTimer = 40;
    } else if (this.size === 1) {
      this.size = 2;
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

    this.skidding = false;
    if (dir !== 0) {
      this.facing = dir;
      if (this.vx * dir < 0 && this.onGround) {
        this.vx += dir * SKID;
        this.skidding = true;
      } else if (Math.abs(this.vx) < max) {
        this.vx = Math.abs(this.vx + dir * acc) > max ? dir * max : this.vx + dir * acc;
      } else if (this.onGround) {
        this.vx -= Math.sign(this.vx) * DECEL; // ran out of run boost
      }
    } else if (this.onGround) {
      if (Math.abs(this.vx) <= DECEL) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * DECEL;
    }

    // ---- jump (with small buffer + coyote time) ----
    this.coyote = this.onGround ? 5 : Math.max(0, this.coyote - 1);
    this.jumpBuf = input.pressed('jump') ? 5 : Math.max(0, this.jumpBuf - 1);
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -(JUMP_V + Math.abs(this.vx) * 0.35);
      this.coyote = 0;
      this.jumpBuf = 0;
      this.size > 0 ? sound.bigJump() : sound.jump();
    }

    // ---- gravity: hold jump to float higher ----
    const g = (this.vy < 0 && input.down('jump')) ? GRAV_HOLD : GRAV;
    this.vy = Math.min(this.vy + g, MAX_FALL);

    moveAndCollide(this, level, (tx, ty) => game.bumpTile(tx, ty, this));
    if (this.hitWall) this.vx = 0;

    // don't walk behind the camera
    if (this.x < game.cam) { this.x = game.cam; this.vx = Math.max(0, this.vx); }

    // ---- fireballs ----
    if (this.size === 2 && input.pressed('run')) {
      const active = game.entities.filter(e => e instanceof Fireball && !e.dead).length;
      if (active < 2) {
        game.entities.push(new Fireball(
          this.x + this.w / 2 + this.facing * 6, this.y + 4, this.facing));
        sound.fireball();
      }
    }

    this.animT += Math.abs(this.vx) * 0.6;
  }

  sprite() {
    const set = this.size === 0
      ? (this.growTimer > 0 && (this.growTimer & 4) ? SPR.heroBig : SPR.heroSmall)
      : this.size === 2 ? SPR.heroBigFire
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
  }
  get harmful() { return !this.dead && this.flipTimer === 0 && this.squashTimer === 0; }

  baseUpdate(game) {
    if (this.flipTimer > 0) { // knocked out: fly off, no tile collision
      this.flipTimer++;
      this.vy = Math.min(this.vy + 0.35, 7);
      this.x += this.vx; this.y += this.vy;
      if (this.y > (ROWS + 2) * TILE) this.dead = true;
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
  constructor(x, y) {
    super(x, y, 14, 13);
    this.vx = -0.55;
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
    if (this.flipTimer > 0) {
      const img = SPR.goomba[0].r;
      const x = Math.round(this.x + this.w / 2 - img.width / 2 - camX);
      const y = Math.round(this.y + this.h - img.height);
      g.save(); g.translate(x + 8, y + 8); g.scale(1, -1); g.drawImage(img, -8, -8); g.restore();
      return;
    }
    if (this.squashTimer > 0) { drawEntity(g, SPR.goombaFlat, this, camX); return; }
    const f = SPR.goomba[0];
    drawEntity(g, (this.animT / 12 | 0) % 2 ? f.r : f.l, this, camX);
  }
}

export class Koopa extends Enemy {
  constructor(x, y) {
    super(x, y, 14, 14);
    this.vx = -0.5;
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
    if (this.mode !== 'walk') { drawEntity(g, SPR.shell, this, camX); return; }
    const f = SPR.koopa[(this.animT / 10 | 0) % 2];
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

// ----------------------------------------------------------------- items ----

export class Mushroom {
  constructor(tx, ty) {
    this.x = tx * TILE + 1; this.y = ty * TILE;
    this.w = 14; this.h = 13;
    this.vx = 0; this.vy = 0;
    this.rise = 16;
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
    game.player.powerUp(game);
  }
  draw(g, camX) { drawEntity(g, SPR.mushroom, this, camX); }
}

export class FireFlower {
  constructor(tx, ty) {
    this.x = tx * TILE + 1; this.y = ty * TILE;
    this.w = 14; this.h = 13;
    this.rise = 16;
    this.dead = false;
  }
  update() { if (this.rise > 0) { this.y -= 0.5; this.rise -= 0.5; } }
  collect(game) {
    this.dead = true;
    game.player.powerUp(game);
  }
  draw(g, camX) { drawEntity(g, SPR.flower, this, camX); }
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
  constructor(x, y, dir) {
    this.x = x; this.y = y;
    this.w = 6; this.h = 6;
    this.vx = dir * 3.4; this.vy = 1;
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
      if (e instanceof Enemy && e.harmful && overlaps(this, e)) {
        e.flip(game, Math.sign(this.vx) || 1, 200);
        sound.kick();
        this.dead = true;
        return;
      }
    }
  }
  draw(g, camX) {
    g.save();
    g.translate(Math.round(this.x + 3 - camX), Math.round(this.y + 3));
    g.rotate((this.t / 4 | 0) * Math.PI / 2);
    g.drawImage(SPR.fireball, -3, -3);
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
