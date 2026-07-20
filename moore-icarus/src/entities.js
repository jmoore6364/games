// Pit-Moore, his arrows, and every enemy and boss in Moore Icarus.

import { TILE, T, tileAt } from './levels.js';
import { drawSprite, SPR } from './sprites.js';

export const GRAV = 0.25;
const JUMPV = -5.3;      // ~3.5 tiles of height
const SPEED = 1.5;       // ~4 tiles of jump distance
const MAXFALL = 5.2;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const isSolid = (t) => t === T.SOLID || t === T.LOCK;
const isPlat = (t) => t === T.PLAT || t === T.SPRING;

function solidAt(g, px, py) { return isSolid(tileAt(g, Math.floor(px / TILE), Math.floor(py / TILE))); }

// ============================ PLAYER ============================

export class Player {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;
    this.w = 10; this.h = 14;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.onGround = false;
    this.crouch = false;
    this.hp = game.up.maxHp;
    this.invuln = 60;
    this.fireCd = 0;
    this.runT = 0;
    this.dead = false; this.deadT = 0;
    this.egg = 0;            // eggplant curse timer
    this.muzzle = 0;
    this.onSpring = false;
    this.onDoor = null;      // door object currently standing on
  }

  hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  hurt(dmg = 1) {
    if (this.dead || this.invuln > 0) return;
    const g = this.game;
    if (g.up.barrier > 0) { g.up.barrier--; this.invuln = 60; g.sound.ehit(); return; }
    this.hp -= dmg;
    this.invuln = 70;
    g.sound.hurt();
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
    this.vy = -3.5; this.vx = -this.face * 0.6;
    this.game.sound.die();
  }

  update(game, inp) {
    const g = game.stage.g;
    if (this.muzzle > 0) this.muzzle--;
    if (this.dead) {
      this.deadT++;
      this.vy = Math.min(MAXFALL, this.vy + GRAV);
      this.y += this.vy; this.x += this.vx;
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.egg > 0) this.egg--;
    if (this.fireCd > 0) this.fireCd--;

    const lr = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    if (lr) this.face = lr;
    this.crouch = this.onGround && inp.down('down') && !lr;
    this.upAim = inp.down('up') && !this.crouch && !lr && this.onGround;

    // ---- horizontal (full air control) ----
    this.vx = this.crouch ? 0 : lr * SPEED;
    if (this.vx) this.moveX(g, this.vx);
    // clamp to level bounds
    this.x = Math.max(1, Math.min(this.x, g.w * TILE - 1 - this.w));

    // ---- jump ----
    if (inp.pressed('jump') && this.onGround) {
      // drop through a platform when holding down
      const feetRow = Math.floor((this.y + this.h + 1) / TILE);
      const under = tileAt(g, Math.floor(this.cx() / TILE), feetRow);
      if (inp.down('down') && under === T.PLAT) {
        this.y += 3; this.vy = 1; this.onGround = false;
      } else {
        this.vy = JUMPV; this.onGround = false;
        game.sound.jump();
      }
    }
    // variable jump height
    if (this.vy < -2 && !inp.down('jump')) this.vy = -2;

    // ---- vertical ----
    this.vy = Math.min(MAXFALL, this.vy + GRAV);
    this.moveY(g);

    // ---- spring / spikes / door detection ----
    this.checkTiles(game);

    // ---- shooting ----
    if (inp.pressed('fire') && this.fireCd === 0 && this.egg === 0) this.shoot(game, inp);

    if (this.onGround) this.runT += Math.abs(this.vx) > 0 ? 1 : 0;
  }

  moveX(g, vx) {
    const nx = this.x + vx;
    const edge = vx > 0 ? nx + this.w : nx;
    let blocked = false;
    for (let sy = this.y + 1; sy < this.y + this.h; sy += 6) {
      if (solidAt(g, edge, sy)) blocked = true;
    }
    if (solidAt(g, edge, this.y + this.h - 1)) blocked = true;
    if (!blocked) this.x = nx;
  }

  moveY(g) {
    const ny = this.y + this.vy;
    if (this.vy > 0) {
      // falling — check feet
      const feetY = ny + this.h;
      const row = Math.floor(feetY / TILE);
      let landed = false;
      for (const sx of [this.x + 2, this.x + this.w - 2]) {
        const col = Math.floor(sx / TILE);
        const t = tileAt(g, col, row);
        const top = row * TILE;
        // platforms/springs only catch when feet were above them
        if (isSolid(t)) { landed = true; }
        else if (isPlat(t) && (this.y + this.h) <= top + 4) { landed = true; }
      }
      if (landed) {
        this.y = row * TILE - this.h;
        if (!this.onGround) this.game && null;
        this.vy = 0; this.onGround = true;
      } else { this.y = ny; this.onGround = false; }
    } else {
      // rising — head bump
      const headY = ny;
      const row = Math.floor(headY / TILE);
      let bump = false;
      for (const sx of [this.x + 2, this.x + this.w - 2]) {
        if (isSolid(tileAt(g, Math.floor(sx / TILE), row))) bump = true;
      }
      if (bump) { this.y = (row + 1) * TILE; this.vy = 0; }
      else { this.y = ny; this.onGround = false; }
    }
  }

  checkTiles(game) {
    const g = game.stage.g;
    const fx = Math.floor(this.cx() / TILE);
    const fy = Math.floor((this.y + this.h - 1) / TILE);
    const foot = tileAt(g, fx, fy + 1);
    this.onSpring = false;
    if (this.onGround && foot === T.SPRING) {
      this.onSpring = true;
      if (game.frame % 20 === 0 && this.hp < game.up.maxHp) {
        this.hp++; game.sound.spring();
      }
    }
    // spikes anywhere overlapping body
    for (let sy = this.y; sy < this.y + this.h; sy += 6) {
      for (let sx = this.x; sx < this.x + this.w; sx += 6) {
        if (tileAt(g, Math.floor(sx / TILE), Math.floor(sy / TILE)) === T.SPIKE) { this.hurt(1); return; }
      }
    }
  }

  shoot(game, inp) {
    const up = inp.down('up') && !this.crouch;
    const u = game.up;
    const speed = 3.2 + u.speed * 0.9;
    const range = 46 + u.range * 26;
    const dmg = 1 + (u.big ? 1 : 0);
    const big = u.big;
    const mk = (vx, vy, ox, oy) => game.pbullets.push({
      x: this.cx() + ox - (big ? 3 : 2), y: this.cy() + oy - (big ? 3 : 2),
      w: big ? 6 : 4, h: big ? 6 : 4, vx, vy, dmg, big,
      dist: 0, maxDist: range, hits: new Set(),
    });
    if (up) {
      mk(0, -speed, 0, -8);
      if (u.triple) { mk(-1.1, -speed, -2, -6); mk(1.1, -speed, 2, -6); }
    } else {
      const dir = this.face;
      const oy = this.crouch ? 4 : 0;
      mk(dir * speed, 0, dir * 8, oy);
      if (u.triple) { mk(dir * speed, -1.1, dir * 6, oy - 3); mk(dir * speed, 1.1, dir * 6, oy + 3); }
    }
    this.fireCd = 12;
    this.muzzle = 4;
    u.big ? game.sound.shootBig() : game.sound.shoot();
  }

  draw(ctx, cam, frame) {
    if (this.invuln > 0 && (frame >> 1) % 2 === 0 && !this.dead) return;
    const sx = Math.round(this.x - cam.x - 3);
    const sy = Math.round(this.y - cam.y - 2);
    let name = 'p_stand';
    if (this.egg > 0) name = 'p_egg';
    else if (this.dead) name = 'p_hurt';
    else if (!this.onGround) name = 'p_jump';
    else if (this.crouch) name = 'p_crouch';
    else if (this.upAim) name = 'p_up';
    else if (Math.abs(this.vx) > 0.1) name = ((this.runT >> 2) % 2) ? 'p_run1' : 'p_run2';
    drawSprite(ctx, name, sx, sy, this.face < 0 && this.egg === 0);
    if (this.muzzle > 0 && this.egg === 0) {
      ctx.fillStyle = '#fff8d8';
      const mx = this.upAim ? this.cx() - cam.x - 1 : this.cx() - cam.x + this.face * 8 - 1;
      const my = this.upAim ? this.y - cam.y - 6 : this.cy() - cam.y - 1;
      ctx.fillRect(mx, my, 3, 3);
    }
  }
}

// ============================ ARROWS ============================

export function updatePArrows(game) {
  for (const b of game.pbullets) {
    b.x += b.vx; b.y += b.vy;
    b.dist += Math.hypot(b.vx, b.vy);
    // stop on solid walls
    if (solidAt(game.stage.g, b.x + b.w / 2, b.y + b.h / 2)) b.dead = true;
  }
  game.pbullets = game.pbullets.filter((b) => !b.dead && b.dist < b.maxDist);
}

export function drawPArrows(game, ctx, cam) {
  for (const b of game.pbullets) {
    const x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y);
    ctx.fillStyle = b.big ? '#f8e070' : '#f8f0c0';
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = '#c89818';
    // little tail
    ctx.fillRect(x - Math.sign(b.vx) * 2, y + b.h / 2 - 1, 2, 2);
  }
}

// ============================ ENEMY BULLETS ============================

export function updateEBullets(game) {
  for (const b of game.ebullets) {
    b.x += b.vx; b.y += b.vy; b.t = (b.t || 0) + 1;
    if (b.grav) b.vy += GRAV * 0.4;
  }
  game.ebullets = game.ebullets.filter((b) =>
    b.t < 360 &&
    b.x > game.camX - 20 && b.x < game.camX + 276 &&
    b.y > game.camY - 20 && b.y < game.camY + 260);
}

export function drawEBullets(game, ctx, cam) {
  for (const b of game.ebullets) {
    const x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y);
    ctx.fillStyle = b.petrify ? '#c0c0d0' : '#f86060';
    ctx.beginPath(); ctx.arc(x + b.w / 2, y + b.h / 2, b.w / 2 + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 1, y + 1, 2, 2);
  }
}

// ============================ ENEMIES ============================

const HP = {
  monoeye: 2, shemum: 1, nettler: 2, specknose: 2, keepah: 3,
  tamambo: 3, girin: 2, minion: 1,
  reaper: 12, pluton: 16, gyrapace: 20, moordusa: 26,
};

export function spawnEnemy(game, t, x, y, opts = {}) {
  const e = {
    t, x, y, w: 10, h: 10, vx: 0, vy: 0, hp: HP[t] || 2,
    face: opts.face ?? -1, timer: 0, phase: opts.phase || 0,
    boss: false, hitFlash: 0, ...opts,
  };
  // size / flags per type
  if (t === 'reaper') { e.w = 18; e.h = 22; e.boss = true; e.state = 'patrol'; e.alert = 0; }
  else if (t === 'pluton') { e.w = 32; e.h = 30; e.boss = true; }
  else if (t === 'gyrapace') { e.w = 34; e.h = 26; e.boss = true; }
  else if (t === 'moordusa') { e.w = 30; e.h = 34; e.boss = true; }
  else if (t === 'keepah') { e.w = 11; e.h = 11; }
  else if (t === 'nettler' || t === 'shemum' || t === 'tamambo') { e.w = 11; e.h = 9; e.grounded = true; }
  game.enemies.push(e);
  return e;
}

function grounded(g, e) {
  // simple gravity + floor for walkers
  e.vy = Math.min(MAXFALL, e.vy + GRAV);
  const ny = e.y + e.vy;
  const row = Math.floor((ny + e.h) / TILE);
  let land = false;
  for (const sx of [e.x + 2, e.x + e.w - 2]) {
    const t = tileAt(g, Math.floor(sx / TILE), row);
    if (isSolid(t) || isPlat(t)) land = true;
  }
  if (land && e.vy >= 0) { e.y = row * TILE - e.h; e.vy = 0; e.onGround = true; }
  else { e.y = ny; e.onGround = false; }
}

function edgeAhead(g, e) {
  // returns true if there's a wall ahead or no floor ahead (so it should turn)
  const front = e.face > 0 ? e.x + e.w + 1 : e.x - 1;
  if (solidAt(g, front, e.y + e.h - 4)) return true;
  const floorX = e.face > 0 ? e.x + e.w + 1 : e.x - 1;
  const t = tileAt(g, Math.floor(floorX / TILE), Math.floor((e.y + e.h + 2) / TILE));
  return !(isSolid(t) || isPlat(t));
}

export function updateEnemies(game) {
  const P = game.player;
  const g = game.stage.g;
  for (const e of game.enemies) {
    e.timer++;
    if (e.hitFlash > 0) e.hitFlash--;
    const dxp = P.cx() - (e.x + e.w / 2);
    const dyp = P.cy() - (e.y + e.h / 2);
    switch (e.t) {
      case 'monoeye': {
        // erratic drift — sine wander plus slow homing, hard to pin down
        e.vx = Math.cos(e.timer * 0.05 + e.phase) * 0.9 + Math.sign(dxp) * 0.25;
        e.vy = Math.sin(e.timer * 0.07 + e.phase) * 0.9 + Math.sign(dyp) * 0.15;
        e.x += e.vx; e.y += e.vy;
        break;
      }
      case 'shemum': {
        grounded(g, e);
        if (e.onGround && e.timer % 55 === 0) { e.vy = -3.4; e.face = Math.sign(dxp) || e.face; }
        if (!e.onGround) e.x += e.face * 0.9;
        break;
      }
      case 'nettler': {
        grounded(g, e);
        e.face = e.face || -1;
        if (edgeAhead(g, e)) e.face *= -1;
        e.x += e.face * 1.5;
        break;
      }
      case 'specknose': {
        // hover then dive at player's column
        if (e.state !== 'dive') {
          e.y = e.y0 + Math.sin(e.timer * 0.08) * 6;
          e.x += Math.sign(dxp) * 0.5;
          if (e.timer % 90 === 60 && Math.abs(dxp) < 90) { e.state = 'dive'; e.diveT = 0; }
        } else {
          e.diveT++;
          e.vy = 2.4; e.y += e.vy; e.x += Math.sign(dxp) * 0.6;
          if (e.onGround || solidAt(g, e.x + e.w / 2, e.y + e.h + 1) || e.diveT > 60) {
            e.state = 'rise';
          }
        }
        if (e.state === 'rise') { e.y -= 2; if (e.y <= e.y0) { e.y = e.y0; e.state = ''; e.timer = 0; } }
        break;
      }
      case 'keepah': {
        // stationary; spits a minion periodically
        if (e.timer % 150 === 149) {
          const m = spawnEnemy(game, 'minion', e.x, e.y - 4, { face: Math.sign(dxp) || -1 });
          m.vy = -2; m.vx = (Math.sign(dxp) || -1) * 0.8;
          game.sound.pop();
        }
        break;
      }
      case 'minion': {
        // small flyer that drifts toward the player
        e.vx += Math.sign(dxp) * 0.03; e.vy += Math.sign(dyp) * 0.03;
        e.vx *= 0.97; e.vy *= 0.97;
        e.x += e.vx; e.y += e.vy;
        break;
      }
      case 'tamambo': {
        grounded(g, e);
        if (e.curl > 0) { e.curl--; break; }
        e.face = e.face || -1;
        if (edgeAhead(g, e)) e.face *= -1;
        e.x += e.face * 0.6;
        break;
      }
      case 'girin': {
        // bobs in place, shoots a slow orb
        e.y = e.y0 + Math.sin(e.timer * 0.06) * 10;
        if (e.timer % 120 === 90 && Math.abs(dyp) < 40) {
          const s = Math.sign(dxp) || -1;
          game.ebullets.push({ x: e.x + e.w / 2, y: e.y + 4, w: 6, h: 6, vx: s * 1.6, vy: 0, t: 0 });
          game.sound.pop();
        }
        break;
      }
      case 'reaper': updateReaper(game, e, dxp, dyp); break;
      case 'pluton': updatePluton(game, e, dxp, dyp); break;
      case 'gyrapace': updateGyrapace(game, e, dxp, dyp); break;
      case 'moordusa': updateMoordusa(game, e, dxp, dyp); break;
    }
  }
}

// ---- Reaper-Moore mini-boss: dread + summon on sight ----
function updateReaper(game, e, dxp, dyp) {
  const g = game.stage.g;
  grounded(g, e);
  const P = game.player;
  const sees = Math.abs(dyp) < 26 && Math.abs(dxp) < 140 && Math.sign(dxp) === e.face;
  if (e.state === 'patrol') {
    e.face = e.face || -1;
    if (edgeAhead(g, e)) e.face *= -1;
    e.x += e.face * 0.7;
    // face the player if roughly level to catch a sighting
    if (Math.abs(dyp) < 26 && Math.abs(dxp) < 150) e.face = Math.sign(dxp) || e.face;
    if (sees) { e.state = 'alert'; e.alert = 70; game.sound.reaper(); game.shake = 10; }
  } else if (e.state === 'alert') {
    // telegraph: freeze and flash, then summon a swarm
    e.alert--;
    if (e.alert === 0) {
      const n = 3;
      for (let i = 0; i < n; i++) {
        const m = spawnEnemy(game, 'minion', e.x + (i - 1) * 10, e.y - 6, {});
        m.vy = -2.5; m.vx = (i - 1) * 1.1;
      }
      game.sound.pop();
      e.state = 'patrol'; e.cool = 120;
    }
  }
}

function bossShoot(game, e, vx, vy, opts = {}) {
  game.ebullets.push({ x: e.x + e.w / 2 - 3, y: e.y + e.h / 2 - 3, w: 6, h: 6, vx, vy, t: 0, ...opts });
}

function updatePluton(game, e, dxp, dyp) {
  // floating skull: drifts, fires spreads
  if (!e.x0) e.x0 = e.x;
  e.x = e.x0 + Math.sin(e.timer * 0.02) * 40;
  e.y = 40 + Math.sin(e.timer * 0.035) * 14;
  if (e.timer % 100 === 60) {
    const s = Math.sign(dxp) || 1;
    for (let a = -1; a <= 1; a++) bossShoot(game, e, s * 1.8, a * 0.9);
    game.sound.pop();
  }
}

function updateGyrapace(game, e, dxp, dyp) {
  if (!e.x0) { e.x0 = e.x; e.y0 = e.y; }
  if (e.state === 'dive') {
    e.diveT++;
    e.y += 2.6; e.x += Math.sign(e.tx - e.x) * 1.4;
    if (e.diveT > 46) { e.state = ''; }
  } else if (e.state === 'rise') {
    e.y -= 2.4; if (e.y <= e.y0) { e.y = e.y0; e.state = ''; e.timer = 0; }
  } else {
    e.x = e.x0 + Math.sin(e.timer * 0.03) * 60;
    if (e.timer % 130 === 90) { e.state = 'dive'; e.diveT = 0; e.tx = game.player.cx(); }
    if (e.timer % 130 === 45) bossShoot(game, e, Math.sign(dxp) * 1.6, 1.4, { grav: true });
  }
  if (e.state === 'dive' && e.diveT === 46) e.state = 'rise';
}

function updateMoordusa(game, e, dxp, dyp) {
  // Medusa homage: hovers, fires petrifying shots and snake spreads
  if (!e.x0) e.x0 = e.x;
  e.x = e.x0 + Math.sin(e.timer * 0.018) * 34;
  e.y = 34 + Math.sin(e.timer * 0.03) * 10;
  if (e.timer % 90 === 50) {
    const s = Math.sign(dxp) || 1;
    bossShoot(game, e, s * 2.0, 0, { petrify: true });
    game.sound.pop();
  }
  if (e.timer % 150 === 120) {
    for (let a = -2; a <= 2; a++) bossShoot(game, e, a * 0.7, 1.4, { grav: true });
  }
}

export function damageEnemy(game, e, dmg) {
  if (e.t === 'tamambo' && e.curl > 0) return;      // curled = armored
  if (e.t === 'reaper' && e.state === 'alert') { /* still takes damage */ }
  e.hp -= dmg;
  e.hitFlash = 4;
  game.sound.ehit();
  if (e.t === 'tamambo') { e.curl = 40; }            // curls up when hit
  if (e.hp <= 0) killEnemy(game, e);
}

function killEnemy(game, e) {
  game.enemies = game.enemies.filter((x) => x !== e);
  game.poofs.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, t: 0 });
  if (e.boss) { game.sound.bossDie(); game.onBossDown(e); return; }
  game.sound.pop();
  const pts = { minion: 50, shemum: 100, monoeye: 150, nettler: 150, specknose: 200, girin: 200, keepah: 300, tamambo: 250 };
  game.addScore(pts[e.t] || 100);
  // heart drop
  if (e.t !== 'minion' && Math.random() < 0.7) {
    const amt = e.t === 'keepah' || e.t === 'tamambo' ? 5 : (Math.random() < 0.3 ? 5 : 1);
    game.drops.push({ x: e.x + e.w / 2 - 3, y: e.y, vy: -1.5, w: 7, h: 7, amt, t: 0 });
  }
}

export function drawEnemies(game, ctx, cam, frame) {
  for (const e of game.enemies) {
    const x = Math.round(e.x - cam.x), y = Math.round(e.y - cam.y);
    if (e.hitFlash > 0 && (frame & 1)) { drawFlash(ctx, e, x, y); continue; }
    if (e.boss) { drawBoss(ctx, e, x, y, frame); continue; }
    const spr = SPR[e.t];
    if (spr) {
      // center the 11px sprite roughly on the hitbox
      drawSprite(ctx, e.t, x - Math.floor((spr.width - e.w) / 2), y - Math.floor((spr.height - e.h) / 2), e.face > 0);
    } else {
      ctx.fillStyle = '#e04040'; ctx.fillRect(x, y, e.w, e.h);
    }
  }
}

function drawFlash(ctx, e, x, y) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 2, y - 2, e.w + 4, e.h + 4);
}

function drawBoss(ctx, e, x, y, frame) {
  const cx = x + e.w / 2, cy = y + e.h / 2;
  if (e.t === 'reaper') {
    const alert = e.state === 'alert';
    // cloaked reaper — dread aura when alert
    if (alert && (frame >> 1 & 1)) { ctx.fillStyle = 'rgba(200,40,60,0.25)'; ctx.fillRect(x - 8, y - 8, e.w + 16, e.h + 16); }
    ctx.fillStyle = alert ? '#3a1020' : '#201028';
    ctx.beginPath();
    ctx.moveTo(cx, y); ctx.lineTo(x + e.w, y + 8); ctx.lineTo(x + e.w - 1, y + e.h);
    ctx.lineTo(x + 1, y + e.h); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill();
    // hood opening / face
    ctx.fillStyle = '#000'; ctx.fillRect(x + 4, y + 4, e.w - 8, 10);
    ctx.fillStyle = alert ? '#f83030' : '#c0203a';
    ctx.fillRect(x + 5, y + 7, 3, 3); ctx.fillRect(x + e.w - 8, y + 7, 3, 3);
    // scythe
    ctx.strokeStyle = '#d0d0d8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + e.w, y + 2); ctx.lineTo(x + e.w + 5 * e.face, y - 4); ctx.stroke();
  } else if (e.t === 'pluton') {
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath(); ctx.arc(cx, cy, e.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#101018';
    ctx.beginPath(); ctx.arc(cx - 7, cy - 3, 4, 0, Math.PI * 2); ctx.arc(cx + 7, cy - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0203a'; ctx.fillRect(cx - 8, cy - 4, 2, 2); ctx.fillRect(cx + 6, cy - 4, 2, 2);
    ctx.fillStyle = '#101018'; ctx.fillRect(cx - 6, cy + 6, 12, 3);
    for (let i = -1; i < 2; i++) ctx.fillRect(cx + i * 4 - 1, cy + 6, 1, 4);
  } else if (e.t === 'gyrapace') {
    ctx.fillStyle = '#c8c0f0';
    ctx.beginPath(); ctx.ellipse(cx, cy, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    // wings
    ctx.fillStyle = '#9088d0';
    const wf = Math.sin(frame * 0.2) * 4;
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x - 8, cy - 8 + wf); ctx.lineTo(x + 4, cy + 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + e.w, cy); ctx.lineTo(x + e.w + 8, cy - 8 + wf); ctx.lineTo(x + e.w - 4, cy + 4); ctx.fill();
    ctx.fillStyle = '#f8d038'; ctx.fillRect(cx - 8, cy - 2, 4, 4); ctx.fillRect(cx + 4, cy - 2, 4, 4);
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 7, cy - 1, 2, 2); ctx.fillRect(cx + 5, cy - 1, 2, 2);
  } else if (e.t === 'moordusa') {
    // snake-haired head
    ctx.fillStyle = '#7aa060';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + Math.sin(frame * 0.06 + i) * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx + Math.cos(a) * 16, cy - 4 + Math.sin(a) * 16);
      ctx.lineWidth = 3; ctx.strokeStyle = '#5a8048'; ctx.stroke();
    }
    ctx.fillStyle = '#e8d8c0';
    ctx.beginPath(); ctx.ellipse(cx, cy, e.w / 2 - 2, e.h / 2 - 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c02040'; ctx.fillRect(cx - 8, cy - 2, 5, 4); ctx.fillRect(cx + 3, cy - 2, 5, 4);
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 6, cy - 1, 2, 2); ctx.fillRect(cx + 5, cy - 1, 2, 2);
    ctx.fillRect(cx - 4, cy + 6, 8, 2);
  }
  // boss hp pips
  if (e.boss) {
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 6, e.w + 2, 3);
    ctx.fillStyle = '#f83030'; ctx.fillRect(x, y - 5, (e.w) * (e.hp / (HP[e.t])), 1);
  }
}
