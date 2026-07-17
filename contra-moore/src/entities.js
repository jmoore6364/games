// Player, weapons, enemies, and bosses for Contra: Moore Force.

import { TILE, T, tileAt } from './levels.js';
import { drawSprite, drawSpriteRot, drawMuzzle, SPR } from './sprites.js';

export const GRAV = 0.22;
const JUMPV = -4.9;
const SPEED = 1.35;
const MAXFALL = 4.6;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const standable = (t) => t === T.SOLID || t === T.PLAT || t === T.BRIDGE || t === T.WATER;

function solidAt(g, px, py) {
  return tileAt(g, Math.floor(px / TILE), Math.floor(py / TILE)) === T.SOLID;
}

// ============================ PLAYER ============================

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 8; this.h = 21;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.onGround = false;
    this.wading = false;
    this.diving = false;
    this.prone = false;
    this.spin = false; this.spinT = 0;
    this.runT = 0;
    this.invuln = 0;
    this.barrier = 0;
    this.dead = false; this.deadT = 0;
    this.weapon = 'N';
    this.fireCd = 0;
    this.muzzle = 0; this.muzzleAt = [0, 0];
    this.dropT = 0;
  }

  hitbox() {
    if (this.prone || this.diving) return { x: this.x - 3, y: this.y + this.h - 7, w: 14, h: 7 };
    return { x: this.x, y: this.y + (this.spin ? 5 : 0), w: this.w, h: this.h - (this.spin ? 5 : 0) };
  }

  aim(inp) {
    const lr = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    if (lr) this.face = lr;
    if (this.prone) return [this.face, 0];
    if (inp.down('up')) return lr ? [this.face * 0.75, -0.75] : [0, -1];
    if (inp.down('down')) {
      if (!this.onGround && !this.wading) return lr ? [this.face * 0.75, 0.75] : [0, 1];
      if (lr) return [this.face * 0.75, 0.75];
    }
    return [this.face, 0];
  }

  update(game, inp) {
    const g = game.stage.g;
    if (this.dead) {
      this.deadT++;
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      this.y += this.vy;
      this.x += this.vx;
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.barrier > 0) this.barrier--;
    if (this.dropT > 0) this.dropT--;

    const lr = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    this.prone = this.onGround && !this.wading && inp.down('down') && !lr;
    this.diving = this.wading && inp.down('down');

    // ---- horizontal ----
    this.vx = (this.prone || this.diving) ? 0 : lr * SPEED;
    if (this.vx) {
      const nx = this.x + this.vx;
      const box = this.hitbox();
      const x0 = this.vx > 0 ? nx + this.w : nx;
      let blocked = false;
      for (let sy = box.y + 2; sy < this.y + this.h; sy += 8) {
        if (solidAt(g, x0, sy)) blocked = true;
      }
      if (!blocked) this.x = nx;
      this.runT++;
    }
    // camera never scrolls back — don't walk off the left edge
    if (!game.stage.vertical) this.x = Math.max(this.x, game.camX + 2);
    else this.x = Math.max(2, Math.min(this.x, g.w * TILE - 2 - this.w));

    // ---- jump / drop ----
    if (inp.pressed('jump') && (this.onGround || this.wading)) {
      const feetRow = Math.floor((this.y + this.h + 1) / TILE);
      const under = tileAt(g, Math.floor((this.x + this.w / 2) / TILE), feetRow);
      if (inp.down('down') && (under === T.PLAT || under === T.BRIDGE)) {
        this.dropT = 12; this.y += 2; this.vy = 1;
        this.onGround = false; this.wading = false;
      } else if (!this.diving) {
        this.vy = JUMPV;
        this.onGround = false; this.wading = false;
        this.spin = true; this.spinT = 0;
        game.sound.jump();
      }
    }

    // ---- vertical ----
    this.vy = Math.min(MAXFALL, this.vy + GRAV);
    let ny = this.y + this.vy;
    const cx = this.x + this.w / 2;
    if (this.vy < 0) {
      if (solidAt(g, cx, ny)) { ny = (Math.floor(ny / TILE) + 1) * TILE; this.vy = 0; }
      this.onGround = false; this.wading = false;
      this.y = ny;
    } else {
      const prevFeet = this.y + this.h;
      const feet = ny + this.h;
      let landed = false;
      // while wading the feet sit below the surface tile's top, so the
      // crossed-from-above scan can't re-land — pin to the surface instead
      if (this.wading) {
        const r = Math.floor((this.y + this.h - 6) / TILE);
        for (const sx of [this.x + 1, this.x + this.w - 1]) {
          if (tileAt(g, Math.floor(sx / TILE), r) === T.WATER) {
            this.y = r * TILE + 7 - this.h;
            this.vy = 0;
            landed = true;
            break;
          }
        }
        if (!landed) this.wading = false; // waded off the water's edge
      }
      const r0 = Math.floor(prevFeet / TILE), r1 = Math.floor(feet / TILE);
      for (let r = r0; r <= r1 && !landed; r++) {
        const top = r * TILE;
        if (top + 0.01 < prevFeet) continue; // must cross the top from above
        for (const sx of [this.x + 1, this.x + this.w - 1]) {
          const t = tileAt(g, Math.floor(sx / TILE), r);
          if (!standable(t)) continue;
          if (this.dropT > 0 && (t === T.PLAT || t === T.BRIDGE)) continue;
          if (t === T.WATER) {
            this.y = top + 7 - this.h;
            if (!this.wading) game.sound.splash();
            this.wading = true; this.onGround = false;
          } else {
            this.y = top - this.h;
            if (!this.onGround && this.spin) game.sound.land();
            this.onGround = true; this.wading = false;
            if (t === T.BRIDGE) game.igniteBridge(Math.floor(sx / TILE), r);
          }
          this.vy = 0; this.spin = false;
          landed = true;
          break;
        }
      }
      if (!landed) {
        this.y = ny;
        if (this.vy > 1) { this.onGround = false; this.wading = false; }
      }
    }
    if (this.spin) this.spinT++;

    // ---- fire ----
    if (this.fireCd > 0) this.fireCd--;
    if (this.muzzle > 0) this.muzzle--;
    if (inp.down('fire') && !this.diving && this.fireCd === 0) this.shoot(game, inp);
  }

  shoot(game, inp) {
    const [ax, ay] = this.aim(inp);
    const len = Math.hypot(ax, ay) || 1;
    const dx = ax / len, dy = ay / len;
    const cx = this.x + this.w / 2 + dx * 12;
    const cy = (this.prone ? this.y + this.h - 4 : this.wading ? this.y + 6 : this.y + 8) + dy * 10;
    const B = game.pbullets;
    const mk = (vx, vy, o = {}) => B.push({
      x: cx - 2, y: cy - 2, w: 4, h: 4, vx, vy, dmg: 1, type: this.weapon, life: 200, ...o,
    });
    const w = this.weapon;
    if (w === 'N') {
      if (B.filter((b) => b.type === 'N').length >= 4) return;
      mk(dx * 4, dy * 4); this.fireCd = 11; game.sound.shoot();
    } else if (w === 'M') {
      if (B.filter((b) => b.type === 'M').length >= 9) return;
      mk(dx * 4.6, dy * 4.6); this.fireCd = 6; game.sound.shoot();
    } else if (w === 'S') {
      if (B.filter((b) => b.type === 'S').length >= 15) return;
      const base = Math.atan2(dy, dx);
      for (let i = -2; i <= 2; i++) {
        const a = base + i * 0.16;
        mk(Math.cos(a) * 3.7, Math.sin(a) * 3.7);
      }
      this.fireCd = 14; game.sound.spread();
    } else if (w === 'L') {
      // a new beam recalls the old one, Contra-style
      game.pbullets = game.pbullets.filter((b) => b.type !== 'L');
      game.pbullets.push({
        x: cx - 2, y: cy - 2, w: 4, h: 4, vx: dx * 5.5, vy: dy * 5.5,
        dmg: 4, type: 'L', life: 200, pierce: true, hits: new Set(),
      });
      this.fireCd = 24; game.sound.laser();
    }
    this.muzzle = 4; this.muzzleAt = [cx, cy];
  }

  draw(ctx, cam, frame) {
    const sx = this.x - 4 - cam.x, sy = this.y - cam.y;
    if (this.dead) {
      drawSprite(ctx, 'p_dead', sx - 3, sy + 12, this.face < 0);
      return;
    }
    if (this.invuln > 0 && (frame >> 2) % 2 === 0 && this.barrier <= 0) return;
    if (this.barrier > 0 && (this.barrier > 90 || frame % 4 < 2)) {
      ctx.strokeStyle = ['#f8d838', '#40d8d8', '#f8f8f8'][frame % 3];
      ctx.beginPath();
      ctx.arc(sx + 8, sy + 10, 15, (frame / 5) % (Math.PI * 2), (frame / 5) % (Math.PI * 2) + 5);
      ctx.stroke();
    }
    if (this.diving) { drawSprite(ctx, 'p_dive', sx, sy + 8, this.face < 0); return; }
    if (this.wading) { drawSprite(ctx, 'p_wade', sx, sy, this.face < 0); }
    else if (this.spin) {
      drawSpriteRot(ctx, 'p_jump', sx + 8, sy + 11, this.face * this.spinT * 0.32);
      return; // no gun while somersaulting
    } else if (this.prone) {
      drawSprite(ctx, 'p_prone', sx - 4, this.y + this.h - 6 - cam.y, this.face < 0);
    } else if (Math.abs(this.vx) > 0) {
      const f = ['p_run1', 'p_run2', 'p_run3', 'p_run2'][(this.runT >> 3) % 4];
      drawSprite(ctx, f, sx, sy, this.face < 0);
    } else if (!this.onGround) {
      drawSprite(ctx, 'p_run2', sx, sy, this.face < 0);
    } else {
      drawSprite(ctx, 'p_stand', sx, sy, this.face < 0);
    }
    // rifle
    const [ax, ay] = this.lastAim || [this.face, 0];
    const len = Math.hypot(ax, ay) || 1;
    const dx = ax / len, dy = ay / len;
    const gx = this.x + this.w / 2 - cam.x, gy0 = this.prone ? this.y + this.h - 4 - cam.y : this.wading ? this.y + 6 - cam.y : this.y + 8 - cam.y;
    ctx.strokeStyle = '#303038';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx + dx * 2, gy0 + dy * 2);
    ctx.lineTo(gx + dx * 10, gy0 + dy * 10);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (this.muzzle > 0) drawMuzzle(ctx, this.muzzleAt[0] - cam.x, this.muzzleAt[1] - cam.y);
  }
}

// ============================ BULLETS ============================

export function updatePBullets(game) {
  const g = game.stage.g;
  game.pbullets = game.pbullets.filter((b) => {
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0) return false;
    if (b.x < game.camX - 8 || b.x > game.camX + 264 || b.y < game.camY - 8 || b.y > game.camY + 248) return false;
    if (solidAt(g, b.x + 2, b.y + 2)) return false;
    return true;
  });
}

export function drawPBullets(game, ctx) {
  for (const b of game.pbullets) {
    const x = b.x - game.camX, y = b.y - game.camY;
    if (b.type === 'L') {
      const len = Math.hypot(b.vx, b.vy);
      ctx.strokeStyle = '#40d8d8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + 2 - (b.vx / len) * 16, y + 2 - (b.vy / len) * 16);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#e8f8f8';
      ctx.fillRect(x + 1, y + 1, 3, 3);
    } else if (b.type === 'S') {
      ctx.fillStyle = '#e07820';
      ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(x + 1, y + 1, 2, 2);
    } else {
      ctx.fillStyle = '#f8f8e8';
      ctx.fillRect(x + 1, y, 2, 4); ctx.fillRect(x, y + 1, 4, 2);
    }
  }
}

export function fireEBullet(game, x, y, tx, ty, speed = 2.1, o = {}) {
  const d = Math.hypot(tx - x, ty - y) || 1;
  game.ebullets.push({
    x: x - 2, y: y - 2, w: 4, h: 4,
    vx: ((tx - x) / d) * speed, vy: ((ty - y) / d) * speed, life: 300, ...o,
  });
}

export function updateEBullets(game) {
  const g = game.stage.g;
  game.ebullets = game.ebullets.filter((b) => {
    if (b.grav) b.vy = Math.min(MAXFALL, b.vy + GRAV * 0.8);
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0) return false;
    if (b.x < game.camX - 16 || b.x > game.camX + 272 || b.y < game.camY - 16 || b.y > game.camY + 256) return false;
    if (solidAt(g, b.x + 2, b.y + 2)) {
      if (b.grav) game.addBoom(b.x + 2, b.y + 2, false);
      return false;
    }
    return true;
  });
}

export function drawEBullets(game, ctx, frame) {
  for (const b of game.ebullets) {
    const x = b.x - game.camX, y = b.y - game.camY;
    if (b.grav) { // grenade
      ctx.fillStyle = '#587838';
      ctx.fillRect(x, y, 4, 5);
      ctx.fillStyle = '#f8d838';
      if (frame % 8 < 4) ctx.fillRect(x + 1, y - 1, 2, 1);
    } else if (b.fire) {
      ctx.fillStyle = ['#f8d838', '#e07820'][frame % 2];
      ctx.beginPath(); ctx.arc(x + 2, y + 2, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#f8f8f8';
      ctx.beginPath(); ctx.arc(x + 2, y + 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b02818';
      ctx.fillRect(x + 1, y + 1, 2, 2);
    }
  }
}

// ============================ ENEMIES ============================

const SCORES = {
  runner: 100, rifle: 200, turret: 500, cannon: 500, lobber: 300,
  flyer: 150, larva: 100, pod: 500, roller: 500, capsule: 500,
  b_gun: 1000, b_core: 3000, b_idol: 5000, b_tank: 5000, b_heart: 5000, b_mouth: 1000,
};

export function spawnEnemy(game, t, x, y, o = {}) {
  const base = { t, x, y, vx: 0, vy: 0, hp: 1, face: -1, timer: 0, state: 0, w: 12, h: 20 };
  const e = Object.assign(base, o);
  switch (t) {
    case 'runner': e.vx = e.face * 1.1; e.hp = 1; break;
    case 'rifle': e.hp = 2; e.w = 12; e.h = 14; e.timer = 40 + ((x >> 4) % 5) * 13; break;
    case 'turret': e.hp = 6; e.w = 20; e.h = 16; break;
    case 'cannon': e.hp = 10; e.w = 16; e.h = 20; break;
    case 'lobber': e.hp = 2; e.timer = 50; break;
    case 'flyer': e.hp = 1; e.w = 14; e.h = 8; e.t0 = Math.floor(x + y); break;
    case 'larva': e.hp = 1; e.w = 12; e.h = 6; e.vx = e.face * 0.7; break;
    case 'pod': e.hp = 10; e.w = 18; e.h = 18; e.timer = 60; break;
    case 'roller': e.hp = 6; e.w = 16; e.h = 16; e.vx = -1.6; break;
    case 'capsule': e.hp = 1; e.w = 16; e.h = 10; e.noTouch = true; break;
    case 'pickup': e.w = 14; e.h = 10; e.noTouch = true; e.harmless = true; break;
    case 'nest': e.harmless = true; e.noTouch = true; e.invis = true; e.timer = 30; break;
    // boss parts
    case 'b_gun': e.hp = 14; e.w = 16; e.h = 16; e.boss = true; break;
    case 'b_core': e.hp = 30; e.w = 16; e.h = 24; e.boss = true; break;
    case 'b_idol': e.hp = 55; e.w = 44; e.h = 44; e.boss = true; break;
    case 'b_tank': e.hp = 70; e.w = 56; e.h = 44; e.boss = true; break;
    case 'b_heart': e.hp = 80; e.w = 22; e.h = 26; e.boss = true; break;
    case 'b_mouth': e.hp = 18; e.w = 16; e.h = 14; e.boss = true; break;
  }
  game.enemies.push(e);
  return e;
}

function gravityWalk(game, e, jumps = false) {
  const g = game.stage.g;
  e.vy = Math.min(MAXFALL, e.vy + GRAV);
  // horizontal
  if (e.vx) {
    const nx = e.x + e.vx;
    const edge = e.vx > 0 ? nx + e.w : nx;
    if (solidAt(g, edge, e.y + e.h - 4) || solidAt(g, edge, e.y + 4)) {
      e.vx = -e.vx; e.face = -e.face;
    } else e.x = nx;
  }
  // vertical
  const prevFeet = e.y + e.h;
  let ny = e.y + e.vy;
  const feet = ny + e.h;
  let grounded = false;
  const r0 = Math.floor(prevFeet / TILE), r1 = Math.floor(feet / TILE);
  for (let r = r0; r <= r1 && !grounded; r++) {
    const top = r * TILE;
    if (top + 0.01 < prevFeet) continue;
    for (const sx of [e.x + 2, e.x + e.w - 2]) {
      const t = tileAt(g, Math.floor(sx / TILE), r);
      if (t === T.WATER) { e.drown = true; }
      if (!standable(t) || t === T.WATER) continue;
      e.y = top - e.h; e.vy = 0; grounded = true;
      break;
    }
  }
  if (!grounded) e.y = ny;
  else if (e.drownPending) e.drown = true;
  return grounded;
}

export function updateEnemies(game) {
  const P = game.player;
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  const keep = [];
  for (const e of game.enemies) {
    e.timer++;
    let alive = true;
    switch (e.t) {
      case 'runner': {
        const grounded = gravityWalk(game, e);
        if (e.drown) { game.sound.splash(); game.addBoom(e.x + 6, e.y + 16, false); alive = false; break; }
        if (grounded && e.timer % 90 === ((e.x >> 4) % 7) * 9 && Math.abs(px - e.x) < 90) {
          e.vy = -3.6; // hop
        }
        break;
      }
      case 'rifle': {
        gravityWalk(game, e);
        e.face = px < e.x ? -1 : 1;
        if (e.timer % 130 === 0 && Math.abs(px - e.x) < 200) e.burst = 3;
        if (e.burst > 0 && e.timer % 14 === 0) {
          e.burst--;
          fireEBullet(game, e.x + e.w / 2, e.y + 4, px, py);
          game.sound.eshoot();
        }
        break;
      }
      case 'turret': {
        // pop-up cycle: closed 70, open 110
        const cyc = e.timer % 180;
        e.open = cyc > 70;
        if (e.open && cyc % 45 === 0) {
          const oy = e.ceil ? e.y + e.h : e.y;
          fireEBullet(game, e.x + e.w / 2, oy + (e.ceil ? -4 : 4), px, py, 1.9);
          game.sound.eshoot();
        }
        break;
      }
      case 'cannon': {
        const dir = e.side || -1;
        if (e.timer % 150 < 45 && e.timer % 15 === 0) {
          fireEBullet(game, e.x + e.w / 2 + dir * 10, e.y + 6, e.x + dir * 100, e.y + 6, 2.4);
          game.sound.eshoot();
        }
        break;
      }
      case 'lobber': {
        gravityWalk(game, e);
        e.face = px < e.x ? -1 : 1;
        if (e.timer % 120 === 0 && Math.abs(px - e.x) < 190 || (game.stage.vertical && e.timer % 120 === 0 && Math.abs(py - e.y) < 200)) {
          game.ebullets.push({
            x: e.x + e.w / 2, y: e.y, w: 4, h: 5,
            vx: (px > e.x ? 1 : -1) * (0.8 + Math.abs(px - e.x) / 220),
            vy: -3.4, grav: true, life: 300,
          });
          game.sound.lob();
        }
        break;
      }
      case 'flyer': {
        // swoop toward the player with a sine wobble
        const d = Math.hypot(px - (e.x + 7), py - (e.y + 4)) || 1;
        e.vx += ((px - e.x) / d) * 0.06;
        e.vy += ((py - e.y) / d) * 0.05;
        e.vx = Math.max(-1.6, Math.min(1.6, e.vx));
        e.vy = Math.max(-1.2, Math.min(1.2, e.vy));
        e.x += e.vx;
        e.y += e.vy + Math.sin((game.frame + e.t0) / 9) * 0.7;
        break;
      }
      case 'larva': {
        gravityWalk(game, e);
        if (e.drown) { alive = false; break; }
        e.face = px < e.x ? -1 : 1;
        e.vx = e.face * 0.7;
        if (e.timer % 100 === 20 && Math.abs(px - e.x) < 60) e.vy = -2.8;
        break;
      }
      case 'pod': {
        const larvae = game.enemies.filter((n) => n.t === 'larva' && n.from === e).length;
        if (e.timer % 140 === 0 && larvae < 2 && Math.abs(px - e.x) < 220) {
          const kid = spawnEnemy(game, 'larva', e.x + 3, e.y - 8, { face: px < e.x ? -1 : 1 });
          kid.from = e;
          game.sound.squish();
        }
        break;
      }
      case 'roller': {
        gravityWalk(game, e);
        if (!e.vx) e.vx = -1.6;
        break;
      }
      case 'capsule': {
        e.x += 1.5;
        e.y = e.y0 + Math.sin(e.timer / 18) * 22;
        if (e.x > game.camX + 280) alive = false;
        break;
      }
      case 'pickup': {
        gravityWalk(game, e);
        if (overlap(e, P.hitbox()) && !P.dead) {
          game.collect(e.d);
          alive = false;
        }
        break;
      }
      case 'nest': {
        const flyers = game.enemies.filter((n) => n.t === 'flyer').length;
        if (e.timer % 150 === 0 && flyers < 4) {
          spawnEnemy(game, 'flyer', game.camX + (px > game.camX + 128 ? 8 : 240), game.camY + 40);
          game.sound.screech();
        }
        break;
      }
      // ---------------- boss parts ----------------
      case 'b_gun': {
        if (e.timer % 110 === e.phase * 40 % 110 && e.timer > 60) {
          fireEBullet(game, e.x + 4, e.y + e.h / 2, px, py, 2.0);
          game.sound.eshoot();
        }
        break;
      }
      case 'b_core': {
        // the gate core spits three-way bursts once its guns are gone
        const guns = game.enemies.filter((n) => n.t === 'b_gun').length;
        if (guns === 0 && e.timer % 90 === 0) {
          for (const a of [-0.4, 0, 0.4]) {
            game.ebullets.push({
              x: e.x, y: e.y + e.h / 2, w: 4, h: 4,
              vx: -2 * Math.cos(a), vy: 2 * Math.sin(a), life: 300,
            });
          }
          game.sound.eshoot();
        }
        break;
      }
      case 'b_idol': {
        // stone face: spits fireball fans, calls flyers
        if (e.timer % 130 < 40) e.mouth = true; else e.mouth = false;
        if (e.timer % 130 === 20) {
          for (const a of [-0.5, -0.15, 0.15, 0.5]) {
            game.ebullets.push({
              x: e.x + e.w / 2, y: e.y + e.h - 8, w: 4, h: 4, fire: true,
              vx: Math.sin(a) * 2.2, vy: Math.cos(a) * 2.2, life: 300,
            });
          }
          game.sound.roar();
        }
        if (e.timer % 260 === 130 && game.enemies.filter((n) => n.t === 'flyer').length < 3) {
          spawnEnemy(game, 'flyer', e.x + e.w / 2, e.y + e.h + 4);
          game.sound.screech();
        }
        break;
      }
      case 'b_tank': {
        // dreadnought: creeps left and right, aimed volleys + mortar shells
        e.x = e.x0 + Math.sin(e.timer / 90) * 14;
        if (e.timer % 100 < 30 && e.timer % 15 === 0) {
          fireEBullet(game, e.x + 6, e.y + 14, px, py, 2.3);
          game.sound.eshoot();
        }
        if (e.timer % 170 === 80) {
          game.ebullets.push({
            x: e.x + 20, y: e.y - 4, w: 4, h: 5,
            vx: -1.6 - (e.timer % 340 === 80 ? 0.7 : 0), vy: -4, grav: true, life: 400,
          });
          game.sound.lob();
        }
        break;
      }
      case 'b_heart': {
        e.pulse = 1 + Math.sin(e.timer / 12) * 0.12;
        if (e.timer % 140 === 0) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + e.timer / 140;
            game.ebullets.push({
              x: e.x + e.w / 2, y: e.y + e.h / 2, w: 4, h: 4, fire: true,
              vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, life: 300,
            });
          }
          game.sound.roar();
        }
        break;
      }
      case 'b_mouth': {
        if (e.timer % 190 === e.phase * 60 && game.enemies.filter((n) => n.t === 'flyer' || n.t === 'larva').length < 4) {
          spawnEnemy(game, 'flyer', e.x, e.y + 6);
          game.sound.screech();
        }
        break;
      }
    }
    // cull off-screen (never cull boss parts or spawners tied to the arena)
    if (!e.boss && e.t !== 'nest' && e.t !== 'capsule') {
      if (e.x + e.w < game.camX - 48 || e.x > game.camX + 340 ||
          e.y > game.camY + 300 || e.y + e.h < game.camY - 80) alive = false;
    }
    if (alive) keep.push(e);
  }
  game.enemies = keep;
}

export function damageEnemy(game, e, dmg) {
  if (e.harmless) return;
  if (e.t === 'turret' && !e.open) { game.sound.clink(); return; }
  if (e.t === 'b_idol' && !e.mouth) { game.sound.clink(); return; }
  e.hp -= dmg;
  e.flash = 4;
  if (e.hp > 0) { game.sound.ehit(); return; }
  game.addScore(SCORES[e.t] || 100);
  if (e.t === 'capsule') {
    game.sound.pickupDrop();
    spawnEnemy(game, 'pickup', e.x + 2, e.y, { d: e.d });
  } else if (e.boss) {
    game.addBoom(e.x + e.w / 2, e.y + e.h / 2, true);
    game.sound.boom();
    game.onBossPartDown(e);
  } else {
    game.addBoom(e.x + e.w / 2, e.y + e.h / 2, false);
    game.sound.boom();
  }
  game.enemies = game.enemies.filter((n) => n !== e);
}

// ============================ ENEMY DRAWING ============================

export function drawEnemies(game, ctx, frame) {
  for (const e of game.enemies) {
    if (e.invis) continue;
    const x = Math.round(e.x - game.camX), y = Math.round(e.y - game.camY);
    if (e.flash > 0) { e.flash--; ctx.globalAlpha = 0.5; }
    switch (e.t) {
      case 'runner': {
        const f = (frame >> 3) % 2 === 0 ? 'e_run1' : 'e_run2';
        drawSprite(ctx, f, x - 2, y + e.h - 18, e.vx < 0);
        break;
      }
      case 'rifle':
        drawSprite(ctx, 'e_rifle', x - 2, y, e.face < 0);
        break;
      case 'lobber':
        drawSprite(ctx, 'e_lobber', x - 2, y + e.h - 18, e.face < 0);
        break;
      case 'turret': {
        ctx.fillStyle = '#585868';
        if (e.ceil) ctx.fillRect(x, y, e.w, 5); else ctx.fillRect(x, y + e.h - 5, e.w, 5);
        if (e.open) {
          ctx.fillStyle = '#a8a8b8';
          ctx.beginPath(); ctx.arc(x + e.w / 2, y + e.h / 2, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b02818';
          ctx.beginPath(); ctx.arc(x + e.w / 2, y + e.h / 2, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f8d838';
          ctx.fillRect(x + e.w / 2 - 1, y + e.h / 2 - 1, 2, 2);
        } else {
          ctx.fillStyle = '#787888';
          ctx.beginPath(); ctx.arc(x + e.w / 2, e.ceil ? y + 5 : y + e.h - 5, 7, e.ceil ? 0 : Math.PI, e.ceil ? Math.PI : 0); ctx.fill();
        }
        break;
      }
      case 'cannon': {
        const dir = e.side || -1;
        ctx.fillStyle = '#585868';
        ctx.fillRect(x, y + 4, e.w, e.h - 4);
        ctx.fillStyle = '#787888';
        ctx.fillRect(x + 2, y, e.w - 4, 8);
        ctx.fillStyle = '#303038';
        ctx.fillRect(dir < 0 ? x - 6 : x + e.w - 2, y + 4, 8, 5);
        ctx.fillStyle = '#b02818';
        if ((frame >> 3) % 2) ctx.fillRect(x + e.w / 2 - 2, y + 10, 4, 4);
        break;
      }
      case 'flyer':
        drawSprite(ctx, (frame >> 2) % 2 ? 'e_flyer1' : 'e_flyer2', x - 1, y - 1, e.vx > 0);
        break;
      case 'larva':
        drawSprite(ctx, (frame >> 3) % 2 ? 'e_larva1' : 'e_larva2', x - 2, y - 1, e.face > 0);
        break;
      case 'pod': {
        const p = 1 + Math.sin(frame / 14) * 0.1;
        ctx.fillStyle = '#903858';
        ctx.beginPath(); ctx.ellipse(x + 9, y + 12, 9 * p, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e07898';
        ctx.beginPath(); ctx.ellipse(x + 9, y + 10, 5 * p, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f8f8d8';
        ctx.fillRect(x + 8, y + 8, 2, 3);
        break;
      }
      case 'roller': {
        ctx.fillStyle = '#787888';
        ctx.beginPath(); ctx.arc(x + 8, y + 8, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a8a8b8';
        const a0 = frame / 6;
        for (let i = 0; i < 6; i++) {
          const a = a0 + (i * Math.PI) / 3;
          ctx.fillRect(x + 8 + Math.cos(a) * 8 - 1, y + 8 + Math.sin(a) * 8 - 1, 3, 3);
        }
        ctx.fillStyle = '#b02818';
        ctx.beginPath(); ctx.arc(x + 8, y + 8, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'capsule': {
        drawSprite(ctx, 'pickup', x, y + Math.sin(frame / 6) * 1.5);
        break;
      }
      case 'pickup': {
        drawSprite(ctx, 'pickup', x, y);
        ctx.fillStyle = '#101010';
        ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(e.d, x + 8, y + 6);
        break;
      }
      // ---------------- bosses ----------------
      case 'b_gun': {
        ctx.fillStyle = '#585868'; ctx.fillRect(x, y, e.w, e.h);
        ctx.fillStyle = '#303038'; ctx.fillRect(x - 6, y + 5, 10, 6);
        ctx.fillStyle = '#b02818'; ctx.fillRect(x + 5, y + 5, 6, 6);
        break;
      }
      case 'b_core': {
        ctx.fillStyle = '#787888'; ctx.fillRect(x - 2, y - 2, e.w + 4, e.h + 4);
        ctx.fillStyle = (frame >> 3) % 2 ? '#f8d838' : '#e07820';
        ctx.fillRect(x + 2, y + 4, e.w - 4, e.h - 8);
        ctx.fillStyle = '#b02818';
        ctx.fillRect(x + 5, y + 8, e.w - 10, e.h - 16);
        break;
      }
      case 'b_idol': {
        ctx.fillStyle = '#607080'; ctx.fillRect(x - 4, y - 4, e.w + 8, e.h + 8);
        ctx.fillStyle = '#8a9ab0'; ctx.fillRect(x, y, e.w, e.h);
        // eyes
        ctx.fillStyle = (frame >> 4) % 2 ? '#b02818' : '#f82818';
        ctx.fillRect(x + 8, y + 10, 8, 6); ctx.fillRect(x + e.w - 16, y + 10, 8, 6);
        // mouth
        ctx.fillStyle = e.mouth ? '#f8d838' : '#303a48';
        ctx.fillRect(x + 12, y + e.h - 16, e.w - 24, e.mouth ? 12 : 5);
        if (e.mouth) {
          ctx.fillStyle = '#b02818';
          ctx.fillRect(x + 16, y + e.h - 12, e.w - 32, 6);
        }
        ctx.fillStyle = '#404a58';
        ctx.fillRect(x + 4, y + 22, 6, 10); ctx.fillRect(x + e.w - 10, y + 22, 6, 10);
        break;
      }
      case 'b_tank': {
        ctx.fillStyle = '#484858'; ctx.fillRect(x, y + 8, e.w, e.h - 14);
        ctx.fillStyle = '#686878'; ctx.fillRect(x + 6, y, e.w - 12, 12);
        ctx.fillStyle = '#303038';
        ctx.fillRect(x - 8, y + 12, 14, 7); // cannon
        // treads
        ctx.fillStyle = '#282830'; ctx.fillRect(x - 2, y + e.h - 8, e.w + 4, 8);
        ctx.fillStyle = '#787888';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(x + 4 + i * 10 + (frame % 10 < 5 ? 0 : 2), y + e.h - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // glowing core
        ctx.fillStyle = (frame >> 3) % 2 ? '#f82818' : '#f8d838';
        ctx.fillRect(x + 4, y + 14, 10, 10);
        ctx.fillStyle = '#f8f8d8'; ctx.fillRect(x + 7, y + 17, 4, 4);
        break;
      }
      case 'b_heart': {
        const p = e.pulse || 1;
        ctx.fillStyle = '#b04868';
        ctx.beginPath(); ctx.ellipse(x + 11, y + 13, 12 * p, 14 * p, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f82848';
        ctx.beginPath(); ctx.ellipse(x + 11, y + 12, 8 * p, 10 * p, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f8a8b8';
        ctx.fillRect(x + 7, y + 6, 4, 5);
        // veins into the wall
        ctx.strokeStyle = '#903858';
        ctx.lineWidth = 2;
        for (const dy of [-6, 4, 14]) {
          ctx.beginPath(); ctx.moveTo(x + 18, y + 13 + dy / 2); ctx.lineTo(x + 30, y + 13 + dy); ctx.stroke();
        }
        ctx.lineWidth = 1;
        break;
      }
      case 'b_mouth': {
        ctx.fillStyle = '#903858'; ctx.fillRect(x, y, e.w, e.h);
        ctx.fillStyle = '#481828';
        ctx.fillRect(x + 3, y + 4, e.w - 6, e.h - 8);
        ctx.fillStyle = '#f8f8d8';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(x + 3 + i * 4, y + 4, 2, 3);
          ctx.fillRect(x + 4 + i * 4, y + e.h - 7, 2, 3);
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
