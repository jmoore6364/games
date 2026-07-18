// Player, minor enemies, projectiles, hazards and pickups for Mega Moore.

import { TILE, T, tileAt, setTile, isSolid, isDeadly } from './levels.js';
import { SPR, drawSprite, WCOLOR } from './sprites.js';

export const GRAV = 0.25;
const MAXFALL = 6.5;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function solidT(game, tx, ty) {
  const t = tileAt(game.stage.g, tx, ty);
  if (isSolid(t)) return true;
  return game.solidExtra.has(tx + ',' + ty);
}

function collideX(game, e, dx) {
  e.x += dx;
  const y0 = Math.floor(e.y / TILE), y1 = Math.floor((e.y + e.h - 1) / TILE);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (solidT(game, tx, ty)) { e.x = tx * TILE - e.w - 0.01; return true; }
    }
  } else if (dx < 0) {
    const tx = Math.floor(e.x / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (solidT(game, tx, ty)) { e.x = tx * TILE + TILE + 0.01; return true; }
    }
  }
  return false;
}

// Returns true when grounded. Lands on jump-through platforms + ladder tops.
function collideY(game, e, dy, ridePlats = false) {
  const g = game.stage.g;
  const prevBot = e.y + e.h;
  e.y += dy;
  let grounded = false;
  const x0 = Math.floor((e.x + 1) / TILE), x1 = Math.floor((e.x + e.w - 1) / TILE);
  if (dy >= 0) {
    const ty = Math.floor((e.y + e.h) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(g, tx, ty);
      const platTop = t === T.PLAT || (t === T.LADDER && tileAt(g, tx, ty - 1) !== T.LADDER);
      if (solidT(game, tx, ty) || (platTop && prevBot <= ty * TILE + 4)) {
        e.y = ty * TILE - e.h;
        e.vy = 0;
        grounded = true;
        break;
      }
    }
    if (!grounded && ridePlats) {
      for (const p of game.platRects) {
        if (e.y + e.h >= p.y && prevBot <= p.y + 5 && e.x + e.w > p.x && e.x < p.x + p.w) {
          e.y = p.y - e.h;
          e.vy = 0;
          grounded = true;
          e.ridePlat = p.ref;
          break;
        }
      }
    }
  } else {
    const ty = Math.floor(e.y / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (solidT(game, tx, ty)) { e.y = ty * TILE + TILE + 0.01; e.vy = 0; break; }
    }
  }
  return grounded;
}

// ============================ PLAYER ============================

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 12; this.h = 21;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.hp = 28;
    this.weapon = 'P';
    this.onGround = false;
    this.climb = false;
    this.climbT = 0;
    this.slideT = 0;
    this.shootT = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.kdir = -1;
    this.dead = false;
    this.deadT = 0;
    this.ridePlat = null;
    this.autoWalk = false;
  }

  hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  standingTile(g) {
    const grid = g.stage.g;
    return tileAt(grid, Math.floor((this.x + this.w / 2) / TILE), Math.floor((this.y + this.h + 1) / TILE));
  }

  update(g, inp) {
    if (this.dead) { this.deadT++; return; }
    if (this.invuln > 0) this.invuln--;
    if (this.shootT > 0) this.shootT--;
    const grid = g.stage.g;

    // knockback state
    if (this.hurtT > 0) {
      this.hurtT--;
      this.climb = false;
      this.slideT = 0;
      this.vy += GRAV; if (this.vy > MAXFALL) this.vy = MAXFALL;
      collideX(g, this, this.kdir * 0.7);
      this.onGround = collideY(g, this, this.vy, true);
      this.checkDeadlyTiles(g);
      return;
    }

    const cx = this.x + this.w / 2;
    const txc = Math.floor(cx / TILE);

    // -------- ladders --------
    if (this.climb) {
      this.ridePlat = null;
      this.vy = 0;
      this.x = txc * TILE + 8 - this.w / 2;
      let move = 0;
      if (inp.down('up')) move = -1.2;
      else if (inp.down('down')) move = 1.2;
      if (this.shootT > 8) move = 0; // firing pauses the climb
      if (inp.down('left')) this.face = -1;
      if (inp.down('right')) this.face = 1;
      if (inp.pressed('fire')) g.firePlayer();
      if (inp.pressed('jump') && !inp.down('up')) { this.climb = false; this.vy = 0; return; }
      this.y += move;
      if (move) {
        this.climbT++;
        if (this.climbT % 14 === 7) g.sound.ladder();
      }
      const grabRow = Math.floor((this.y + 8) / TILE);
      const grabT = tileAt(grid, txc, grabRow);
      if (grabT !== T.LADDER) {
        if (move < 0 && tileAt(grid, txc, grabRow + 1) === T.LADDER) {
          // topped out: stand on the ladder head
          this.y = (grabRow + 1) * TILE - this.h;
          this.climb = false;
          this.onGround = true;
        } else if (move < 0) {
          this.climb = false;
        }
      }
      if (move > 0) {
        // reached solid ground below
        if (collideY(g, this, 0.01)) this.climb = false;
        if (tileAt(grid, txc, Math.floor((this.y + this.h - 2) / TILE)) !== T.LADDER
          && tileAt(grid, txc, Math.floor((this.y + 8) / TILE)) !== T.LADDER) this.climb = false;
      }
      this.onGround = false;
      this.checkDeadlyTiles(g);
      return;
    }

    // grab a ladder?
    if (inp.down('up') && tileAt(grid, txc, Math.floor((this.y + 8) / TILE)) === T.LADDER) {
      this.climb = true; this.climbT = 0; this.slideT = 0; return;
    }
    if (inp.down('up') && tileAt(grid, txc, Math.floor((this.y + this.h - 2) / TILE)) === T.LADDER) {
      this.climb = true; this.climbT = 0; this.slideT = 0; return;
    }
    if (inp.down('down') && this.onGround
      && tileAt(grid, txc, Math.floor((this.y + this.h + 2) / TILE)) === T.LADDER) {
      this.climb = true; this.climbT = 0; this.y += 6; return;
    }

    // -------- ride moving platforms --------
    if (this.ridePlat && this.onGround) {
      this.x += this.ridePlat.dx;
      this.y += this.ridePlat.dy;
    }
    this.ridePlat = null;

    // -------- horizontal --------
    const stand = this.standingTile(g);
    let want = 0;
    if (this.autoWalk) want = 1.2;
    else if (inp.down('left')) { want = -1.35; this.face = -1; }
    else if (inp.down('right')) { want = 1.35; this.face = 1; }
    if (want && !this.autoWalk) this.face = want > 0 ? 1 : -1;

    if (this.slideT > 0) {
      this.slideT--;
      want = 2.6 * this.face;
      if (this.slideT === 0 || !this.onGround) { this.h = 21; this.y -= 7; this.slideT = 0; }
    } else if (this.onGround && !this.autoWalk && inp.down('down') && inp.pressed('jump')) {
      this.slideT = 22;
      this.h = 14; this.y += 7;
      want = 2.6 * this.face;
      g.sound.slide();
    }

    if (this.onGround && stand === T.ICE && this.slideT === 0) {
      this.vx += (want - this.vx) * 0.06; // slippery
    } else {
      this.vx = want;
    }
    let dx = this.vx;
    if (this.onGround && stand === T.CONVL) dx -= 0.55;
    if (this.onGround && stand === T.CONVR) dx += 0.55;
    const hitWall = collideX(g, this, dx);
    if (hitWall) { this.vx = 0; if (this.slideT > 0) { this.slideT = 0; this.h = 21; this.y -= 7; } }

    // -------- vertical --------
    if (this.onGround && this.slideT === 0 && !inp.down('down') && inp.pressed('jump')) {
      this.vy = -4.75;
      this.onGround = false;
    }
    if (this.vy < -1.5 && !inp.down('jump')) this.vy = -1.5; // variable jump height
    this.vy += GRAV;
    if (this.vy > MAXFALL) this.vy = MAXFALL;
    const wasAir = !this.onGround;
    this.onGround = collideY(g, this, this.vy, true);
    if (this.onGround && wasAir && this.vy >= 0) g.sound.land();

    // -------- fire --------
    if (inp.pressed('fire') && this.slideT === 0 && !this.autoWalk) g.firePlayer();

    this.checkDeadlyTiles(g);
    if (this.y > g.stage.g.h * TILE + 8) g.killPlayer(); // pit
  }

  checkDeadlyTiles(g) {
    const grid = g.stage.g;
    const x0 = Math.floor((this.x + 2) / TILE), x1 = Math.floor((this.x + this.w - 2) / TILE);
    const y0 = Math.floor((this.y + 2) / TILE), y1 = Math.floor((this.y + this.h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isDeadly(tileAt(grid, tx, ty))) { g.killPlayer(); return; }
      }
    }
  }

  draw(ctx, cam, frame) {
    if (this.dead) return;
    if (this.invuln > 0 && (frame >> 1) % 2 === 0) return;
    const w = this.weapon;
    let name;
    if (this.hurtT > 0) name = 'p_hurt';
    else if (this.climb) name = (Math.floor(this.y / 8) % 2 === 0) ? 'p_climb1' : 'p_climb2';
    else if (this.slideT > 0) name = 'p_slide';
    else if (!this.onGround) name = 'p_jump';
    else if (Math.abs(this.vx) > 0.3) name = ['p_run1', 'p_run2', 'p_run3', 'p_run2'][(frame >> 3) % 4];
    else name = 'p_stand';
    const spr = SPR[`${name}_${w}`];
    const sx = Math.round(this.x - cam.x - (spr.width - this.w) / 2);
    const sy = Math.round(this.y - cam.y - (spr.height - this.h));
    drawSprite(ctx, `${name}_${w}`, sx, sy, this.face < 0 && !this.climb);
    // buster arm
    if (this.shootT > 6 && !this.slideT && this.hurtT === 0) {
      ctx.fillStyle = WCOLOR[w];
      const ay = this.y - cam.y + 8;
      const ax = this.face > 0 ? this.x - cam.x + this.w : this.x - cam.x - 6;
      ctx.fillRect(ax, ay, 6, 5);
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(this.face > 0 ? ax + 5 : ax, ay + 1, 1, 3);
    }
  }
}

// ============================ WEAPONS ============================

export const WEAPON_COST = { P: 0, T: 1, F: 1, G: 1, V: 2 };

export function firePlayer(game) {
  const P = game.player;
  const w = P.weapon;
  const cx = P.face > 0 ? P.x + P.w - 2 : P.x - 6;
  const cy = P.y + 8;
  if (w === 'P') {
    if (game.pbullets.filter((b) => b.kind === 'buster').length >= 3) return;
    game.pbullets.push({ kind: 'buster', x: cx, y: cy, w: 8, h: 6, vx: 4.2 * P.face, vy: 0, dmg: 1 });
    game.sound.pew(); P.shootT = 16;
    return;
  }
  const cost = WEAPON_COST[w];
  if (w === 'V') {
    const orbs = game.pbullets.filter((b) => b.kind === 'volt' && b.mode === 'orbit');
    if (orbs.length) { // second press: launch the shield
      orbs.forEach((o, i) => { o.mode = 'fly'; o.vx = 4 * P.face; o.vy = (i - 1) * 0.8; });
      game.sound.wfire('V'); P.shootT = 16;
      return;
    }
    if (game.energy.V < cost) { game.sound.buzz(); return; }
    game.energy.V -= cost;
    for (let i = 0; i < 3; i++) {
      game.pbullets.push({
        kind: 'volt', mode: 'orbit', ang: (i * Math.PI * 2) / 3, i,
        x: P.x, y: P.y, w: 8, h: 8, vx: 0, vy: 0, dmg: 2, t: 0,
      });
    }
    game.sound.wfire('V'); P.shootT = 16;
    return;
  }
  if (game.energy[w] < cost) { game.sound.buzz(); return; }
  if (w === 'T') {
    if (game.pbullets.filter((b) => b.kind === 'torch').length >= 2) return;
    game.energy.T -= cost;
    game.pbullets.push({ kind: 'torch', x: cx, y: cy - 4, w: 10, h: 10, vx: 2.3 * P.face, vy: -3.4, dmg: 3 });
    game.sound.wfire('T'); P.shootT = 16;
  } else if (w === 'F') {
    if (game.pbullets.filter((b) => b.kind === 'frost').length >= 4) return;
    game.energy.F -= cost;
    for (const vy of [-0.8, 0, 0.8]) {
      game.pbullets.push({ kind: 'frost', x: cx, y: cy, w: 9, h: 4, vx: 4.8 * P.face, vy, dmg: 1 });
    }
    game.sound.wfire('F'); P.shootT = 16;
  } else if (w === 'G') {
    if (game.pbullets.filter((b) => b.kind === 'gear').length >= 2) return;
    game.energy.G -= cost;
    game.pbullets.push({
      kind: 'gear', x: cx, y: cy - 3, w: 12, h: 12, vx: 3.8 * P.face, vy: 0,
      dmg: 2, dir: P.face, t: 0, pierce: true, hits: new Set(),
    });
    game.sound.wfire('G'); P.shootT = 16;
  }
}

export function updatePBullets(game) {
  const P = game.player;
  for (const b of game.pbullets) {
    b.t = (b.t || 0) + 1;
    if (b.kind === 'torch') {
      b.vy += 0.16;
      b.x += b.vx; b.y += b.vy;
      const tx = Math.floor((b.x + b.w / 2) / TILE), ty = Math.floor((b.y + b.h / 2) / TILE);
      if (isSolid(tileAt(game.stage.g, tx, ty))) b.gone = true;
    } else if (b.kind === 'gear') {
      b.vx -= b.dir * 0.14;
      if (b.vx * b.dir < -4.2) b.vx = -4.2 * b.dir;
      b.x += b.vx; b.y += b.vy;
      if (b.t > 40 && b.vx * b.dir < 0) {
        // returning: vanish once it passes behind the player
        if ((b.dir > 0 && b.x < P.x - 20) || (b.dir < 0 && b.x > P.x + P.w + 20)) b.gone = true;
      }
    } else if (b.kind === 'volt') {
      if (b.mode === 'orbit') {
        b.ang += 0.14;
        b.x = P.x + P.w / 2 - 4 + Math.cos(b.ang) * 20;
        b.y = P.y + P.h / 2 - 4 + Math.sin(b.ang) * 20;
        if (b.t > 480 || P.dead) b.gone = true;
        // shield eats enemy bullets
        for (const eb of game.ebullets) {
          if (!eb.gone && overlap(b, eb)) { eb.gone = true; game.sound.clink(); }
        }
        // and boss shield orbs
        if (game.boss && game.boss.orbs) {
          for (const o of game.boss.orbs) {
            if (!o.gone && overlap(b, o)) { o.gone = true; b.gone = true; game.sound.clink(); }
          }
        }
      } else {
        b.x += b.vx; b.y += b.vy;
      }
    } else {
      b.x += b.vx; b.y += b.vy;
    }
    if (b.x < game.camX - 24 || b.x > game.camX + 280 || b.y < -24 || b.y > 264) b.gone = true;
  }
  game.pbullets = game.pbullets.filter((b) => !b.gone);
}

export function drawPBullets(game, ctx) {
  for (const b of game.pbullets) {
    const x = Math.round(b.x - game.camX), y = Math.round(b.y);
    if (b.kind === 'buster') {
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(x, y + 1, 8, 4);
      ctx.fillStyle = '#00e8d8';
      ctx.fillRect(x + 1, y + 2, 6, 2);
    } else if (b.kind === 'torch') {
      const ph = (game.frame >> 2) % 2;
      ctx.fillStyle = ph ? '#f8d838' : '#f87018';
      ctx.beginPath(); ctx.arc(x + 5, y + 5, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ph ? '#f87018' : '#f8d838';
      ctx.beginPath(); ctx.arc(x + 5, y + 5, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (b.kind === 'frost') {
      ctx.fillStyle = '#a8e8f8';
      ctx.fillRect(x, y, 9, 4);
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(b.vx > 0 ? x + 5 : x, y + 1, 4, 2);
    } else if (b.kind === 'gear') {
      ctx.save();
      ctx.translate(x + 6, y + 6);
      ctx.rotate((game.frame % 16) * 0.4);
      ctx.fillStyle = '#f8b040';
      for (let i = 0; i < 4; i++) { ctx.fillRect(-7, -2, 14, 4); ctx.rotate(Math.PI / 4); }
      ctx.fillStyle = '#606870';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (b.kind === 'volt') {
      ctx.fillStyle = (game.frame >> 1) % 2 ? '#f8e858' : '#f8f8f8';
      ctx.fillRect(x, y + 2, 8, 4);
      ctx.fillRect(x + 2, y, 4, 8);
    }
  }
}

// ============================ ENEMY BULLETS ============================

export function updateEBullets(game) {
  for (const b of game.ebullets) {
    b.t = (b.t || 0) + 1;
    if (b.kind === 'torch' || b.kind === 'bomb') {
      b.vy += 0.15;
      b.x += b.vx; b.y += b.vy;
      const tx = Math.floor((b.x + b.w / 2) / TILE), ty = Math.floor((b.y + b.h) / TILE);
      if (isSolid(tileAt(game.stage.g, tx, ty))) {
        b.gone = true;
        if (b.kind === 'bomb') {
          game.addBoom(b.x + 4, b.y + 4, false);
          for (const vx of [-1.8, 1.8]) {
            game.ebullets.push({ x: b.x, y: b.y - 2, w: 6, h: 6, vx, vy: -1, dmg: 3, kind: 'shot' });
          }
        }
      }
    } else if (b.kind === 'gear') {
      b.vx -= b.dir * 0.1;
      if (b.vx * b.dir < -3.6) b.vx = -3.6 * b.dir;
      b.x += b.vx; b.y += b.vy;
      if (b.t > 200) b.gone = true;
    } else {
      b.x += b.vx; b.y += b.vy;
    }
    if (b.x < game.camX - 40 || b.x > game.camX + 296 || b.y < -40 || b.y > 280) b.gone = true;
  }
  game.ebullets = game.ebullets.filter((b) => !b.gone);
}

export function drawEBullets(game, ctx) {
  for (const b of game.ebullets) {
    const x = Math.round(b.x - game.camX), y = Math.round(b.y);
    if (b.kind === 'torch') {
      ctx.fillStyle = (game.frame >> 2) % 2 ? '#f87018' : '#f8d838';
      ctx.beginPath(); ctx.arc(x + b.w / 2, y + b.h / 2, b.w / 2, 0, Math.PI * 2); ctx.fill();
    } else if (b.kind === 'ice') {
      ctx.fillStyle = '#c8ecf8';
      ctx.fillRect(x, y, b.w, b.h);
    } else if (b.kind === 'gear') {
      ctx.save();
      ctx.translate(x + b.w / 2, y + b.h / 2);
      ctx.rotate((game.frame % 16) * 0.4);
      ctx.fillStyle = '#a8a8b8';
      for (let i = 0; i < 4; i++) { ctx.fillRect(-6, -2, 12, 4); ctx.rotate(Math.PI / 4); }
      ctx.restore();
    } else if (b.kind === 'bolt') {
      ctx.fillStyle = (game.frame >> 1) % 2 ? '#f8e858' : '#f8f8f8';
      ctx.fillRect(x, y + 1, 8, 3);
      ctx.fillRect(x + 2, y - 1, 3, 7);
    } else if (b.kind === 'bomb') {
      ctx.fillStyle = '#585868';
      ctx.beginPath(); ctx.arc(x + 4, y + 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f82818';
      ctx.fillRect(x + 3, y - 2, 2, 2);
    } else {
      ctx.fillStyle = '#f8d838';
      ctx.beginPath(); ctx.arc(x + b.w / 2, y + b.h / 2, b.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e07820';
      ctx.beginPath(); ctx.arc(x + b.w / 2, y + b.h / 2, b.w / 2 - 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ============================ MINOR ENEMIES ============================

const EDEFS = {
  walker: { w: 14, h: 9, hp: 2, dmg: 3, score: 200 },
  hopper: { w: 14, h: 9, hp: 2, dmg: 3, score: 300 },
  flyer: { w: 14, h: 7, hp: 1, dmg: 3, score: 300 },
  met: { w: 14, h: 7, hp: 2, dmg: 3, score: 300 },
  shieldwalker: { w: 14, h: 11, hp: 3, dmg: 4, score: 500 },
  spawner: { w: 16, h: 12, hp: 5, dmg: 3, score: 800 },
  ling: { w: 8, h: 5, hp: 1, dmg: 2, score: 100 },
};

export function spawnEnemy(game, t, x, y, extra = {}) {
  const d = EDEFS[t];
  const e = { t, x, y, w: d.w, h: d.h, hp: d.hp, dmg: d.dmg, score: d.score,
    vx: 0, vy: 0, face: -1, timer: 0, frozen: 0, y0: y, ...extra };
  game.enemies.push(e);
  return e;
}

function enemyGravity(game, e) {
  e.vy += GRAV;
  if (e.vy > MAXFALL) e.vy = MAXFALL;
  return collideY(game, e, e.vy);
}

function edgeAhead(game, e) {
  const tx = Math.floor((e.face > 0 ? e.x + e.w + 2 : e.x - 2) / TILE);
  const ty = Math.floor((e.y + e.h + 2) / TILE);
  return !solidT(game, tx, ty) && tileAt(game.stage.g, tx, ty) !== T.PLAT;
}

export function updateEnemies(game) {
  const P = game.player;
  for (const e of game.enemies) {
    if (e.frozen > 0) { e.frozen--; continue; }
    e.timer++;
    const dir = P.x > e.x ? 1 : -1;
    switch (e.t) {
      case 'walker': {
        const grounded = enemyGravity(game, e);
        if (grounded) {
          if (edgeAhead(game, e) || collideX(game, e, e.face * 0.5)) e.face = -e.face;
        }
        break;
      }
      case 'hopper': {
        const grounded = enemyGravity(game, e);
        if (grounded) {
          e.vx = 0;
          if (e.timer > 55) { e.timer = 0; e.face = dir; e.vy = -3.6; e.vx = 1.25 * dir; }
        }
        collideX(game, e, e.vx);
        break;
      }
      case 'flyer': {
        e.face = e.startDir || (e.startDir = dir);
        e.x += 1.15 * e.startDir;
        e.y = e.y0 + Math.sin(e.timer * 0.07) * 22;
        break;
      }
      case 'met': {
        enemyGravity(game, e);
        const c = e.timer % 170;
        e.closed = c < 95;
        e.face = dir;
        if (c === 110) {
          for (const [vx, vy] of [[2.2, 0], [1.8, -1.4], [1.8, 1.4]]) {
            game.ebullets.push({ x: e.x + 4, y: e.y + 2, w: 6, h: 6, vx: vx * dir, vy, dmg: 3, kind: 'shot' });
          }
          game.sound.pew();
        }
        break;
      }
      case 'shieldwalker': {
        const grounded = enemyGravity(game, e);
        e.raise = e.timer % 150 > 105 ? 1 : 0;
        if (!e.raise) {
          e.face = dir;
          if (grounded && !edgeAhead(game, e)) collideX(game, e, e.face * 0.4);
        } else if (e.timer % 150 === 120) {
          game.ebullets.push({ x: e.x + (dir > 0 ? e.w : -6), y: e.y + 3, w: 6, h: 6, vx: 2.4 * dir, vy: 0, dmg: 3, kind: 'shot' });
          game.sound.pew();
        }
        break;
      }
      case 'spawner': {
        enemyGravity(game, e);
        if (e.timer % 140 === 100 && game.enemies.filter((x) => x.t === 'ling').length < 3) {
          spawnEnemy(game, 'ling', e.x + 4, e.y + e.h - 6, { face: dir });
          game.sound.tick();
        }
        break;
      }
      case 'ling': {
        const grounded = enemyGravity(game, e);
        if (grounded) {
          e.face = dir;
          if (collideX(game, e, e.face * 1.1)) e.face = -e.face;
        }
        break;
      }
    }
    // fell into a pit / lava: quietly remove
    if (e.y > game.stage.g.h * TILE + 16) e.gone = true;
  }
  // despawn far offscreen; re-arm their spawn points
  for (const e of game.enemies) {
    if (e.gone) continue;
    if (e.x < game.camX - 96 || e.x > game.camX + 352) {
      e.gone = true;
      if (e.spawnIdx !== undefined) game.alive[e.spawnIdx] = false;
    }
  }
  game.enemies = game.enemies.filter((e) => !e.gone);
}

// bullet -> enemy. Returns true if the bullet should be consumed.
export function damageEnemy(game, e, b) {
  if (e.t === 'met' && e.closed) { game.sound.clink(); return true; }
  if (e.t === 'shieldwalker' && !e.raise && e.frozen <= 0) {
    const fromFront = (b.vx > 0 && e.face < 0) || (b.vx < 0 && e.face > 0);
    if (fromFront) { game.sound.clink(); return true; }
  }
  if (b.kind === 'frost' && e.t !== 'spawner') e.frozen = 110;
  e.hp -= b.dmg;
  game.sound.ehit();
  if (e.hp <= 0) {
    e.gone = true;
    if (e.spawnIdx !== undefined) game.alive[e.spawnIdx] = false;
    game.addBoom(e.x + e.w / 2, e.y + e.h / 2, false);
    game.addScore(e.score);
    game.spawnDrop(e.x + e.w / 2, e.y);
  }
  return !b.pierce;
}

export function drawEnemies(game, ctx, frame) {
  for (const e of game.enemies) {
    const x = e.x - game.camX, y = e.y;
    let name = null, flip = e.face > 0;
    const ph = (frame >> 4) % 2;
    switch (e.t) {
      case 'walker': name = ph ? 'e_walker1' : 'e_walker2'; break;
      case 'hopper': name = 'e_hopper'; break;
      case 'flyer': name = (frame >> 3) % 2 ? 'e_flyer1' : 'e_flyer2'; break;
      case 'met': name = e.closed ? 'e_met_closed' : 'e_met_open'; break;
      case 'shieldwalker': name = e.raise ? 'e_shield2' : 'e_shield1'; break;
      case 'spawner': name = 'e_spawner'; flip = false; break;
      case 'ling': name = 'e_ling'; break;
    }
    if (!name) continue;
    const spr = SPR[name];
    drawSprite(ctx, name, Math.round(x - (spr.width - e.w) / 2), Math.round(y - (spr.height - e.h)), flip);
    if (e.frozen > 0) {
      ctx.fillStyle = 'rgba(160,224,248,0.55)';
      ctx.fillRect(Math.round(x) - 2, Math.round(y - (spr.height - e.h)) - 2, spr.width + 4, spr.height + 4);
    }
  }
}

// ============================ HAZARDS ============================

export function initHazards(game) {
  const st = game.stage;
  game.hz = {
    flames: st.flames.map((f) => ({ ...f })),
    crushers: st.crushers.map((c) => ({ ...c, y: 9 * TILE })),
    plats: st.plats.map((p) => ({ ...p, px: p.x * TILE, py: p.y * TILE, dx: 0, dy: 0, t: 0 })),
    beams: st.beams.map((b) => ({ ...b })),
    crumbles: st.crumbles.map((c) => ({ ...c, state: 0, t: 0 })),
    appear: st.appear.map((a) => ({ ...a })),
  };
  game.solidExtra = new Set();
  game.platRects = [];
}

export function updateHazards(game) {
  const hz = game.hz;
  const P = game.player;
  const f = game.frame;
  game.solidExtra.clear();
  game.platRects.length = 0;

  // flame pillars
  for (const fl of hz.flames) {
    const t = (f + fl.off) % 160;
    fl.h = 0;
    if (t >= 30 && t < 95) fl.h = Math.min(60, (t - 30) * 8);
    else if (t >= 95 && t < 110) fl.h = Math.max(0, 60 - (t - 95) * 6);
    if (fl.h > 4 && !P.dead) {
      const rect = { x: fl.x * TILE + 3, y: 14 * TILE - fl.h, w: 10, h: fl.h };
      if (overlap(rect, P.hitbox())) game.hurtPlayer(5, rect.x);
    }
  }

  // crushers
  for (const c of hz.crushers) {
    const t = (f + c.off) % 170;
    const top = 9 * TILE, bot = 13 * TILE - 32;
    if (t < 60) c.y = top;
    else if (t < 68) c.y = top + (bot - top) * (t - 60) / 8;
    else if (t < 105) c.y = bot;
    else c.y = bot - (bot - top) * Math.min(1, (t - 105) / 55);
    if (!P.dead) {
      const rect = { x: c.x * TILE + 1, y: c.y, w: 14, h: 32 };
      if (overlap(rect, P.hitbox())) game.hurtPlayer(8, rect.x + 40 * (P.x < rect.x ? 1 : -1));
    }
  }

  // moving platforms
  for (const p of hz.plats) {
    p.t += p.sp;
    const off = Math.sin(p.t + p.ph) * p.range;
    const nx = p.axis === 'x' ? p.x * TILE + off : p.x * TILE;
    const ny = p.axis === 'y' ? p.y * TILE + off : p.y * TILE;
    p.dx = nx - p.px; p.dy = ny - p.py;
    p.px = nx; p.py = ny;
    game.platRects.push({ x: nx, y: ny, w: 32, h: 8, ref: p });
  }

  // beam barriers
  for (const b of hz.beams) {
    const t = (f + b.off) % (b.on + b.offd);
    b.active = t < b.on;
    if (b.active && !P.dead) {
      const rect = b.dir === 'h'
        ? { x: b.x * TILE, y: b.y * TILE, w: b.len * TILE, h: TILE }
        : { x: b.x * TILE + 4, y: b.y * TILE, w: 8, h: b.len * TILE };
      if (overlap(rect, P.hitbox())) game.hurtPlayer(6, P.x - P.face * 20);
    }
  }

  // crumbling ice blocks
  for (const c of hz.crumbles) {
    if (c.state === 1) {
      c.t++;
      if (c.t > 130) { c.state = 0; c.t = 0; }
      continue;
    }
    game.solidExtra.add(c.x + ',' + c.y);
    const feetTx = Math.floor((P.x + P.w / 2) / TILE);
    const feetTy = Math.floor((P.y + P.h + 1) / TILE);
    if (P.onGround && feetTx === c.x && feetTy === c.y) {
      c.t++;
      if (c.t > 25) { c.state = 1; c.t = 0; game.sound.ehit(); }
    } else if (c.t > 0) c.t--;
  }

  // appearing block groups
  for (const a of hz.appear) {
    const n = a.blocks.length;
    const cycle = n * a.period + 2 * a.period;
    a.vis = [];
    a.blocks.forEach(([bx, by], i) => {
      const t = ((f - i * a.period) % cycle + cycle) % cycle;
      const on = t < 2.5 * a.period;
      a.vis[i] = on;
      if (on) game.solidExtra.add(bx + ',' + by);
    });
  }
}

export function drawHazards(game, ctx) {
  const hz = game.hz;
  const cam = game.camX;
  const f = game.frame;

  for (const fl of hz.flames) {
    const x = fl.x * TILE - cam;
    if (x < -20 || x > 276) continue;
    const t = (f + fl.off) % 160;
    if (t >= 10 && t < 30) { // warning bubble
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(x + 6, 14 * TILE - 4, 4, 4);
    }
    if (fl.h > 0) {
      const ph = (f >> 2) % 2;
      ctx.fillStyle = ph ? '#f87018' : '#e05010';
      ctx.fillRect(x + 3, 14 * TILE - fl.h, 10, fl.h);
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(x + 6, 14 * TILE - fl.h + 2, 4, Math.max(0, fl.h - 4));
    }
  }

  for (const c of hz.crushers) {
    const x = c.x * TILE - cam;
    if (x < -20 || x > 276) continue;
    ctx.fillStyle = '#585868';
    ctx.fillRect(x + 6, 9 * TILE - 16, 4, c.y - (9 * TILE - 16)); // chain
    ctx.fillStyle = '#888890';
    ctx.fillRect(x, c.y, 16, 28);
    ctx.fillStyle = '#3c3c44';
    ctx.fillRect(x, c.y + 4, 16, 2);
    ctx.fillRect(x, c.y + 22, 16, 2);
    ctx.fillStyle = '#c8c8d8';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 4, c.y + 28); ctx.lineTo(x + i * 4 + 2, c.y + 32); ctx.lineTo(x + i * 4 + 4, c.y + 28);
      ctx.fill();
    }
  }

  for (const p of hz.plats) {
    const x = p.px - cam;
    if (x < -40 || x > 276) continue;
    ctx.fillStyle = '#a8a8b0';
    ctx.fillRect(Math.round(x), Math.round(p.py), 32, 3);
    ctx.fillStyle = '#3c3c44';
    ctx.fillRect(Math.round(x), Math.round(p.py) + 3, 32, 5);
    ctx.fillStyle = '#f8b040';
    ctx.fillRect(Math.round(x) + 2, Math.round(p.py) + 4, 3, 3);
    ctx.fillRect(Math.round(x) + 27, Math.round(p.py) + 4, 3, 3);
  }

  for (const b of hz.beams) {
    const x = b.x * TILE - cam, y = b.y * TILE;
    if (x < -300 || x > 300) continue;
    // emitter
    ctx.fillStyle = '#585868';
    if (b.dir === 'h') { ctx.fillRect(x - 6, y + 2, 6, 12); ctx.fillRect(x + b.len * TILE, y + 2, 6, 12); }
    else { ctx.fillRect(x + 2, y - 6, 12, 6); }
    if (b.active) {
      const ph = (f >> 1) % 2;
      ctx.fillStyle = ph ? '#f8e858' : '#f8f8f8';
      if (b.dir === 'h') ctx.fillRect(x, y + 6, b.len * TILE, 4);
      else ctx.fillRect(x + 6, y, 4, b.len * TILE);
    }
  }

  for (const c of hz.crumbles) {
    if (c.state === 1) continue;
    const x = c.x * TILE - cam;
    if (x < -20 || x > 276) continue;
    const shake = c.t > 12 ? (f % 2) : 0;
    ctx.fillStyle = '#a0d8f0';
    ctx.fillRect(x + shake, c.y * TILE, 16, 16);
    ctx.fillStyle = '#e8f8ff';
    ctx.fillRect(x + shake, c.y * TILE, 16, 3);
    ctx.fillStyle = '#4880c0';
    ctx.fillRect(x + shake, c.y * TILE + 13, 16, 3);
    ctx.fillRect(x + shake + 7, c.y * TILE + 3, 2, 10);
  }

  for (const a of hz.appear) {
    a.blocks.forEach(([bx, by], i) => {
      if (!a.vis[i]) return;
      const x = bx * TILE - cam;
      if (x < -20 || x > 276) return;
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(x, by * TILE, 16, 16);
      ctx.fillStyle = '#40d8f8';
      ctx.fillRect(x + 2, by * TILE + 2, 12, 12);
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(x + 5, by * TILE + 5, 6, 6);
    });
  }
}

// ============================ PICKUPS ============================

const PK = {
  hs: { spr: 'pk_hs', w: 7, h: 6 },
  hb: { spr: 'pk_hb', w: 11, h: 9 },
  ws: { spr: 'pk_ws', w: 7, h: 6 },
  wb: { spr: 'pk_wb', w: 11, h: 9 },
  life: { spr: 'pk_life', w: 12, h: 9 },
  etank: { spr: 'pk_etank', w: 10, h: 10 },
};

export function spawnPickup(game, t, x, y, temp = false) {
  game.pickups.push({ t, x, y, w: PK[t].w, h: PK[t].h, vy: 0, temp, age: 0 });
}

export function updatePickups(game) {
  const P = game.player;
  for (const p of game.pickups) {
    p.age++;
    if (p.temp && p.age > 380) { p.gone = true; continue; }
    p.vy += GRAV; if (p.vy > 5) p.vy = 5;
    collideY(game, p, p.vy);
    if (p.y > game.stage.g.h * TILE + 16) { p.gone = true; continue; }
    if (!P.dead && overlap(p, P.hitbox())) {
      if (game.collectPickup(p.t)) p.gone = true;
    }
  }
  game.pickups = game.pickups.filter((p) => !p.gone);
}

export function drawPickups(game, ctx, frame) {
  for (const p of game.pickups) {
    if (p.temp && p.age > 300 && (frame >> 2) % 2 === 0) continue;
    drawSprite(ctx, PK[p.t].spr, Math.round(p.x - game.camX), Math.round(p.y));
  }
}
