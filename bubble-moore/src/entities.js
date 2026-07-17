// Actors for Bubble Moore: players, bubbles, enemies, items, projectiles
// and the hurry-up skull. Physics is tile-based with jump-through
// platforms and vertical screen wrap.

import { TILE, GRID_H, tileAt, solidAtPx } from './levels.js';
import { drawSprite, drawBubble, drawPop } from './sprites.js';

export const VIEW_W = 256;
export const VIEW_H = GRID_H * TILE; // 224
const GRAV = 0.2;
const MAX_FALL = 3.1;
const JUMP_V = -4.6; // clears ~3.3 tiles

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function wrapY(e) {
  if (e.y >= VIEW_H) e.y -= VIEW_H;
  else if (e.y + e.h <= 0) e.y += VIEW_H;
}

// Solid sides & tops, pass-through from below (classic bubble platforming).
export function moveActor(e, g) {
  e.hitWall = false;
  // horizontal
  if (e.vx !== 0) {
    const nx = e.x + e.vx;
    const edge = e.vx > 0 ? nx + e.w : nx;
    let blocked = false;
    for (let py = e.y + 1; py < e.y + e.h; py += 6) {
      if (solidAtPx(g, edge, py)) { blocked = true; break; }
    }
    if (!blocked && solidAtPx(g, edge, e.y + e.h - 1)) blocked = true;
    if (blocked) {
      e.x = e.vx > 0
        ? Math.floor(edge / TILE) * TILE - e.w - 0.01
        : (Math.floor(edge / TILE) + 1) * TILE + 0.01;
      e.hitWall = true;
    } else {
      e.x = nx;
    }
  }
  // vertical
  if (!e.floats) e.vy = Math.min(e.vy + GRAV, MAX_FALL);
  const ny = e.y + e.vy;
  e.onGround = false;
  if (e.vy >= 0) {
    const feet0 = e.y + e.h, feet1 = ny + e.h;
    let landed = false;
    for (let rowY = Math.ceil(feet0 / TILE) * TILE; rowY <= feet1 + 0.001; rowY += TILE) {
      const ty = Math.round(rowY / TILE);
      const solid = tileAt(g, Math.floor((e.x + 1) / TILE), ty) === 1
        || tileAt(g, Math.floor((e.x + e.w - 1) / TILE), ty) === 1;
      if (solid) {
        e.y = rowY - e.h;
        e.vy = 0;
        e.onGround = true;
        landed = true;
        break;
      }
    }
    if (!landed) e.y = ny;
  } else {
    e.y = ny;
  }
  wrapY(e);
}

// ======================= PLAYER =======================

export class Player {
  constructor(idx) {
    this.idx = idx; // 0 or 1
    this.pre = idx === 1 ? 'p2' : '';
    this.w = 12; this.h = 14;
    this.lives = 3;
    this.score = 0;
    this.nextLifeAt = 50000;
    this.shoes = false; this.fastBub = false; this.range = false;
    this.gone = false; // out of lives
    this.reset(0, 0);
  }

  act(a) { return this.pre ? this.pre + a : a; }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.face = this.idx === 1 ? -1 : 1;
    this.onGround = false;
    this.dead = false; this.deadT = 0;
    this.invuln = 110;
    this.cool = 0; this.blowT = 0;
    this.bounceT = 0;
  }

  loseLife() {
    this.lives--;
    // powerups are lost with the life
    this.shoes = false; this.fastBub = false; this.range = false;
  }

  update(game, inp) {
    if (this.gone) return;
    if (this.dead) {
      this.deadT++;
      this.vy = Math.min(this.vy + 0.12, 2.2);
      this.y += this.vy;
      if (this.y > VIEW_H + 20) this.y = -16;
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.cool > 0) this.cool--;
    if (this.blowT > 0) this.blowT--;
    if (this.bounceT > 0) this.bounceT--;

    const spd = this.shoes ? 1.75 : 1.3;
    const L = inp.down(this.act('left')), R = inp.down(this.act('right'));
    this.vx = (R ? spd : 0) - (L ? spd : 0);
    if (L && !R) this.face = -1;
    if (R && !L) this.face = 1;

    if (inp.pressed(this.act('jump')) && this.onGround) {
      this.vy = JUMP_V;
      game.sound.jump();
    }
    // variable jump height
    if (!inp.down(this.act('jump')) && this.vy < -1.6) this.vy = -1.6;

    // bubble bounce: falling onto a bubble with jump held springs you up
    if (this.vy > 0.4) {
      for (const b of game.bubbles) {
        if (b.popped || b.chainT > 0) continue;
        const feetX = this.x + this.w / 2, feetY = this.y + this.h;
        const dx = feetX - b.x, dy = feetY - b.y;
        if (Math.abs(dx) < b.r + 4 && dy > -b.r - 2 && dy < 4) {
          if (inp.down(this.act('jump'))) {
            this.vy = JUMP_V * 0.92;
            this.bounceT = 8;
            game.sound.bounce();
            if (!b.enemy && Math.random() < 0.25) b.startPop(game); // bouncing wears bubbles out
          } else {
            b.startPop(game, this);
          }
          break;
        }
      }
    }

    moveActor(this, game.grid);

    // blow a bubble
    if ((inp.pressed(this.act('fire')) || inp.down(this.act('fire'))) && this.cool === 0) {
      this.cool = this.fastBub ? 13 : 22;
      this.blowT = 10;
      game.addBubble(this);
      game.sound.blow();
    }

    // touching bubbles pops them (except fresh bounce)
    if (this.bounceT === 0) {
      const hb = { x: this.x, y: this.y, w: this.w, h: this.h };
      for (const b of game.bubbles) {
        if (b.popped || b.chainT > 0 || b.t < 10) continue;
        if (overlap(hb, { x: b.x - b.r + 2, y: b.y - b.r + 2, w: b.r * 2 - 4, h: b.r * 2 - 4 })) {
          b.startPop(game, this);
        }
      }
    }
  }

  addScore(game, n) {
    this.score += n;
    if (this.score >= this.nextLifeAt) {
      this.lives++;
      this.nextLifeAt += 50000;
      game.sound.oneUp();
    }
  }

  die(game) {
    if (this.dead || this.invuln > 0 || this.gone) return;
    this.dead = true;
    this.deadT = 0;
    this.vy = -3;
    game.sound.dieJingle();
  }

  draw(ctx, frame) {
    if (this.gone) return;
    if (this.invuln > 0 && !this.dead && (frame >> 2) % 2 === 0) return;
    let name = 'd_stand';
    if (this.dead) name = 'd_dead';
    else if (this.blowT > 0) name = 'd_blow';
    else if (!this.onGround) name = 'd_jump';
    else if (this.vx !== 0) name = (frame >> 3) % 2 ? 'd_walk1' : 'd_walk2';
    if (this.idx === 1) name += '_p2';
    drawSprite(ctx, name, this.x - 2, this.y - 2, this.face < 0);
  }
}

// ======================= BUBBLES =======================

export class Bubble {
  constructor(owner, x, y, dir) {
    this.owner = owner;
    this.x = x; this.y = y;
    this.r = 8;
    this.dir = dir;
    this.vx = dir * (owner.fastBub ? 4.2 : 3.1);
    this.vy = 0;
    this.t = 0;
    this.shotT = owner.range ? 34 : 19;
    this.phase = 'shot';
    this.enemy = null;
    this.life = 640;
    this.popped = false; this.popT = 0;
    this.chainT = 0; // queued chain pop
  }

  trap(game, enemy) {
    this.enemy = enemy;
    this.phase = 'float';
    this.vx = 0;
    this.life = 480;
    game.sound.trapSfx();
  }

  startPop(game, byPlayer = null) {
    if (this.popped || this.chainT > 0) return;
    this.popped = true;
    this.popT = 0;
    game.sound.pop();
    if (this.enemy) {
      game.enemyPopped(this, byPlayer || this.owner);
      this.enemy = null;
    }
    // chain-pop neighbours
    for (const b of game.bubbles) {
      if (b === this || b.popped || b.chainT > 0) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      if (d < 26) b.chainT = 5;
    }
  }

  update(game) {
    this.t++;
    if (this.popped) { this.popT++; return; }
    if (this.chainT > 0 && --this.chainT === 0) { this.startPop(game, this.owner); return; }

    const g = game.grid;
    if (this.phase === 'shot') {
      this.x += this.vx;
      if (solidAtPx(g, this.x + Math.sign(this.vx) * this.r, this.y)) {
        this.x -= this.vx;
        this.phase = 'float';
        this.vx = 0;
      } else if (this.t >= this.shotT) {
        this.phase = 'float';
        this.vx = 0;
      }
      // trap enemies while the bubble is fresh
      for (const e of game.enemies) {
        if (e.trapped || e.dying) continue;
        if (Math.abs(e.x + e.w / 2 - this.x) < this.r + 5 && Math.abs(e.y + e.h / 2 - this.y) < this.r + 5) {
          e.trapped = true;
          this.trap(game, e);
          break;
        }
      }
    } else {
      // float upward, wobble, gather under ceilings
      this.vy = Math.max(this.vy - 0.03, this.enemy ? -0.42 : -0.5);
      const wob = Math.sin(this.t / 14) * 0.25;
      let nx = this.x + wob;
      if (!solidAtPx(g, nx + Math.sign(wob) * this.r, this.y)) this.x = nx;
      let ny = this.y + this.vy;
      if (ny - this.r < 2) { ny = this.r + 2; this.vy = 0; }
      if (this.vy < 0 && solidAtPx(g, this.x, ny - this.r)) { this.vy = 0; }
      else this.y = ny;
      // gentle separation from other bubbles
      for (const b of game.bubbles) {
        if (b === this || b.popped) continue;
        const dx = this.x - b.x, dy = this.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.01 && d < this.r + b.r - 2) {
          this.x += (dx / d) * 0.4;
          this.y += (dy / d) * 0.4;
        }
      }
      this.x = Math.max(this.r + 17, Math.min(VIEW_W - this.r - 17, this.x));
    }

    if (--this.life <= 0) {
      if (this.enemy) {
        game.releaseAngry(this);
        this.enemy = null;
      }
      this.startPop(game);
    }
  }

  draw(ctx, frame) {
    if (this.popped) { drawPop(ctx, this.x, this.y, this.popT); return; }
    if (this.enemy) {
      const spr = ENEMY_SPRITES[this.enemy.t][0] + (this.life < 120 && (frame >> 2) % 2 ? '_angry' : '');
      drawSprite(ctx, spr, this.x - 6, this.y - 6, this.enemy.face < 0, 12, 12);
    }
    drawBubble(ctx, this.x, this.y, this.r, this.t, this.enemy ? '#c8f8b8' : '#a8e8f8', this.enemy && this.life < 120);
  }
}

// ======================= ENEMIES =======================

const ENEMY_SPRITES = {
  walker: ['e_walk1', 'e_walk2'],
  jumper: ['e_jump1', 'e_jump2'],
  floater: ['e_float1', 'e_float2'],
  spitter: ['e_spit1', 'e_spit2'],
};

export const FRUIT_FOR = { walker: 'f_banana', jumper: 'f_orange', floater: 'f_melon', spitter: 'f_gem' };
export const FRUIT_VALUE = { f_banana: 700, f_orange: 1000, f_melon: 2000, f_gem: 3000 };

export class Enemy {
  constructor(t, x, y) {
    this.t = t;
    this.x = x; this.y = y;
    this.w = 13; this.h = 13;
    this.vx = 0; this.vy = 0;
    this.face = Math.random() < 0.5 ? -1 : 1;
    this.angry = false;
    this.trapped = false;
    this.dying = false;
    this.floats = t === 'floater';
    this.restT = 30 + Math.floor(Math.random() * 40);
    this.spitT = 90 + Math.floor(Math.random() * 80);
    this.pauseT = 0;
    if (this.floats) {
      this.vx = this.face * 0.55;
      this.vy = 0.4;
    }
  }

  speed() {
    const base = { walker: 0.55, jumper: 0, floater: 0.55, spitter: 0.42 }[this.t];
    return this.angry ? base * 1.7 : base;
  }

  update(game) {
    const g = game.grid;
    const target = game.nearestPlayer(this.x, this.y);

    if (this.t === 'floater') {
      const sp = this.angry ? 0.95 : 0.6;
      if (target) {
        this.vx += Math.sign(target.x - this.x) * 0.012;
        this.vy += Math.sign(target.y - this.y) * 0.012;
      }
      const m = Math.hypot(this.vx, this.vy) || 1;
      if (m > sp) { this.vx = (this.vx / m) * sp; this.vy = (this.vy / m) * sp; }
      let nx = this.x + this.vx;
      if (solidAtPx(g, nx + (this.vx > 0 ? this.w : 0), this.y + this.h / 2) || nx < 16 || nx + this.w > VIEW_W - 16) {
        this.vx *= -1;
      } else this.x = nx;
      let ny = this.y + this.vy;
      if (solidAtPx(g, this.x + this.w / 2, ny + (this.vy > 0 ? this.h : 0)) || ny < 2 || ny + this.h > VIEW_H - 2) {
        this.vy *= -1;
      } else this.y = ny;
      this.face = this.vx < 0 ? -1 : 1;
      return;
    }

    if (this.t === 'jumper') {
      if (this.onGround) {
        this.vx = 0;
        if (--this.restT <= 0) {
          this.restT = this.angry ? 26 : 55;
          this.vy = this.angry ? -4.9 : -4.3;
          this.vx = (target && target.x > this.x ? 1 : -1) * (this.angry ? 1.35 : 0.95);
          this.face = this.vx < 0 ? -1 : 1;
        }
      }
      moveActor(this, g);
      if (this.hitWall) this.vx *= -1;
      return;
    }

    // walker & spitter
    if (this.pauseT > 0) { this.pauseT--; this.vx = 0; moveActor(this, g); return; }
    this.vx = this.face * this.speed();

    // at a ledge: sometimes drop down (dogged pursuit), usually turn
    if (this.onGround) {
      const aheadX = this.face > 0 ? this.x + this.w + 2 : this.x - 2;
      const groundAhead = solidAtPx(g, aheadX, this.y + this.h + 4);
      if (!groundAhead) {
        const chase = target && target.y > this.y + 8;
        if (!(chase || this.angry) || Math.random() < 0.6) { this.face *= -1; this.vx = this.face * this.speed(); }
      }
    }
    moveActor(this, g);
    if (this.hitWall) this.face *= -1;

    if (this.t === 'spitter' && this.onGround) {
      if (--this.spitT <= 0 && target && Math.abs(target.y - this.y) < 26) {
        this.face = target.x > this.x ? 1 : -1;
        this.spitT = this.angry ? 80 : 150;
        this.pauseT = 22;
        game.projectiles.push({
          x: this.x + this.w / 2, y: this.y + 4, w: 4, h: 4,
          vx: this.face * (this.angry ? 2.4 : 1.8),
        });
        game.sound.spit();
      }
    }
  }

  draw(ctx, frame) {
    const frames = ENEMY_SPRITES[this.t];
    let name = frames[(frame >> 4) % 2];
    if (this.angry && (frame >> 2) % 2 === 0) name = frames[(frame >> 4) % 2] + '_angry';
    drawSprite(ctx, name, this.x - 1, this.y - 2, this.face < 0);
  }
}

// ======================= ITEMS =======================

export const ITEM_EFFECTS = {
  i_shoes: 'shoes', i_fastbub: 'fastBub', i_range: 'range', i_candy: null,
};

export class Item {
  constructor(kind, x, y, value = 0) {
    this.kind = kind;
    this.x = x; this.y = y;
    this.w = 10; this.h = 10;
    this.vx = 0; this.vy = -1.4;
    this.life = 560;
    this.grav = true;
  }

  update(game) {
    moveActor(this, game.grid);
    if (this.onGround) this.vx = 0;
    this.life--;
  }

  collect(game, p) {
    const eff = ITEM_EFFECTS[this.kind];
    if (eff) {
      p[eff] = true;
      p.addScore(game, 800);
      game.sound.powerup();
    } else if (this.kind === 'i_candy') {
      p.addScore(game, 1500);
      game.sound.collect();
    } else {
      p.addScore(game, FRUIT_VALUE[this.kind] || 500);
      game.sound.collect();
    }
    game.floatText(this.x, this.y, this.kind === 'i_candy' ? 1500 : (FRUIT_VALUE[this.kind] || 800));
  }

  draw(ctx, frame) {
    if (this.life < 120 && (frame >> 3) % 2 === 0) return;
    drawSprite(ctx, this.kind, this.x, this.y);
  }
}

// ======================= HURRY-UP SKULL =======================

export class Skull {
  constructor() {
    this.x = -20; this.y = -20;
    this.w = 14; this.h = 13;
    this.on = false;
    this.t = 0;
  }

  activate(x, y) {
    this.on = true;
    this.x = x; this.y = y;
    this.t = 0;
  }

  deactivate() { this.on = false; }

  update(game) {
    if (!this.on) return;
    this.t++;
    const target = game.nearestPlayer(this.x, this.y);
    if (!target) return;
    const sp = Math.min(1.35, 0.7 + this.t / 1800);
    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.x += (dx / d) * sp;
    this.y += (dy / d) * sp;
  }

  draw(ctx, frame) {
    if (!this.on) return;
    if ((frame >> 3) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawSprite(ctx, 'skull', this.x - 1, this.y - 1);
      ctx.restore();
    }
    drawSprite(ctx, 'skull', this.x - 1, this.y - 1);
  }
}
