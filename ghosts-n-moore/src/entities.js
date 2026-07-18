// Player, weapons, enemies, chests and the demon lord for Ghosts 'n Moore.

import { TILE, T, tileAt } from './levels.js';
import { drawSprite, drawSpriteClip, drawPoof, SPR } from './sprites.js';

export const GRAV = 0.22;
const JUMPV = -4.35;
const SPEED = 1.25;
const MAXFALL = 4.4;
const CLIMB = 1.1;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const standable = (t) => t === T.SOLID || t === T.PLAT || t === T.GRAVE || t === T.ICE ||
  t === T.LADDER; // ladder tops handled by caller
const solidT = (t) => t === T.SOLID || t === T.GRAVE || t === T.ICE;

function solidAt(g, px, py) {
  return solidT(tileAt(g, Math.floor(px / TILE), Math.floor(py / TILE)));
}

// ============================ PLAYER ============================
// Sir Moore. Silver armor, then heart-print boxers, then bones.

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 10; this.h = 20;
    this.vy = 0;
    this.face = 1;
    this.onGround = false;
    this.armor = 1;          // 2 gold, 1 silver, 0 boxers
    this.weapon = 'L';       // L lance, D dagger, T torch, A axe
    this.duckT = 0;          // polymorphed while > 0
    this.crouch = false;
    this.climbing = false;
    this.airVx = 0;          // committed at takeoff — NO air control
    this.groundVx = 0;       // for ice inertia
    this.runT = 0;
    this.throwT = 0;
    this.invuln = 0;
    this.fireCd = 0;
    this.dead = false; this.deadT = 0;
  }

  hitbox() {
    if (this.duckT > 0) return { x: this.x, y: this.y + this.h - 10, w: 10, h: 10 };
    if (this.crouch) return { x: this.x, y: this.y + this.h - 11, w: this.w, h: 11 };
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  onIce(g) {
    const r = Math.floor((this.y + this.h + 1) / TILE);
    return tileAt(g, Math.floor((this.x + this.w / 2) / TILE), r) === T.ICE;
  }

  update(game, inp) {
    const g = game.stage.g;
    if (this.dead) {
      this.deadT++;
      // the corpse settles onto the ground
      if (!this.onGround) {
        this.vy = Math.min(4, this.vy + GRAV);
        this.y += this.vy;
        if (solidAt(g, this.x + this.w / 2, this.y + this.h)) {
          this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h;
          this.onGround = true;
        }
        if (this.y > g.h * TILE + 20) this.y = g.h * TILE + 20;
      }
      return;
    }
    if (this.invuln > 0) this.invuln--;
    if (this.fireCd > 0) this.fireCd--;
    if (this.throwT > 0) this.throwT--;
    if (this.duckT > 0) {
      this.duckT--;
      if (this.duckT === 0) {
        game.addPoof(this.x + 5, this.y + this.h - 10);
        game.sound.polymorph();
      }
    }
    const isDuck = this.duckT > 0;
    const spd = isDuck ? 1.0 : SPEED;
    const lr = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);

    // ---- ladders ----
    const cx = this.x + this.w / 2;
    const colC = Math.floor(cx / TILE);
    const midRow = Math.floor((this.y + this.h * 0.6) / TILE);
    const feetRow = Math.floor((this.y + this.h + 1) / TILE);
    if (!this.climbing && !isDuck) {
      if (inp.down('up') && (tileAt(g, colC, midRow) === T.LADDER || tileAt(g, colC, feetRow) === T.LADDER)) {
        this.climbing = true;
      } else if (inp.down('down') && this.onGround && tileAt(g, colC, feetRow) === T.LADDER) {
        this.climbing = true;
        this.y += 4;
      }
      if (this.climbing) {
        this.x = colC * TILE + 8 - this.w / 2;
        this.vy = 0; this.onGround = false; this.crouch = false;
      }
    }
    if (this.climbing) {
      const ud = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
      this.y += ud * CLIMB;
      this.runT += Math.abs(ud);
      const fr = Math.floor((this.y + this.h - 2) / TILE);
      const here = tileAt(g, colC, fr);
      if (ud < 0 && here !== T.LADDER) {
        // climbed off the top — stand on the ladder's top tile
        this.y = (fr + 1) * TILE - this.h;
        this.climbing = false; this.onGround = true; this.vy = 0;
      } else if (ud > 0) {
        // reached solid ground below?
        const below = tileAt(g, colC, Math.floor((this.y + this.h + 1) / TILE));
        if (solidT(below) || (here !== T.LADDER && below !== T.LADDER)) {
          this.climbing = false;
        }
      }
      if (this.climbing) return; // no gravity, no throwing on ladders
    }

    // ---- crouch ----
    this.crouch = !isDuck && this.onGround && inp.down('down') && !lr;

    // ---- horizontal: deliberate, stiff, honest ----
    let vx = 0;
    if (this.onGround) {
      const icy = this.onIce(g);
      const want = (this.crouch ? 0 : lr * spd);
      if (icy) {
        // slippery: momentum builds and bleeds slowly
        this.groundVx += (want - this.groundVx) * 0.06;
        if (Math.abs(this.groundVx) < 0.05) this.groundVx = 0;
      } else {
        this.groundVx = want;
      }
      vx = this.groundVx;
      if (lr) this.face = lr;
      if (game.windOn) vx += game.windAx * 6; // the wind leans on you even afoot
    } else {
      // airborne: the jump is COMMITTED. Only the wind may edit the arc.
      if (game.windOn) this.airVx += game.windAx;
      vx = this.airVx;
    }
    if (vx) {
      const nx = this.x + vx;
      const edge = vx > 0 ? nx + this.w : nx;
      const box = this.hitbox();
      let blocked = false;
      for (let sy = box.y + 2; sy < this.y + this.h - 1; sy += 7) {
        if (solidAt(g, edge, sy)) blocked = true;
      }
      // when blocked we keep the committed velocity — rising past a low
      // obstacle mid-jump lets the arc carry us over it, GnG style
      if (!blocked) this.x = nx;
      if (this.onGround) this.runT++;
    }
    this.x = Math.max(0, Math.min(this.x, g.w * TILE - this.w));

    // ---- jump: direction locked at takeoff ----
    if (inp.pressed('jump') && this.onGround && !this.crouch) {
      this.vy = isDuck ? -3.2 : JUMPV;
      this.onGround = false;
      this.airVx = this.onIce(g) ? this.groundVx : lr * spd;
      if (lr) this.face = lr;
      game.sound.jump();
    }

    // ---- vertical ----
    this.vy = Math.min(MAXFALL, this.vy + GRAV);
    let ny = this.y + this.vy;
    if (this.vy < 0) {
      const hx = this.x + this.w / 2;
      if (solidAt(g, hx, ny)) { ny = (Math.floor(ny / TILE) + 1) * TILE; this.vy = 0; }
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
          if (t === T.WATER) { game.drownPlayer(); return; }
          if (!standable(t)) continue;
          if (t === T.LADDER && tileAt(g, Math.floor(sx / TILE), r - 1) === T.LADDER) continue;
          this.y = top - this.h;
          if (!this.onGround) { game.sound.land(); this.groundVx = this.airVx; }
          this.onGround = true;
          this.vy = 0;
          landed = true;
          break;
        }
      }
      if (!landed) {
        this.y = ny;
        if (this.vy > 1) this.onGround = false;
      }
    }

    // fell out of the world
    if (this.y > g.h * TILE + 8) game.killPlayer(true);

    // ---- throw ----
    if (inp.down('fire') && !isDuck && this.fireCd === 0 && !this.dead) this.throwWeapon(game);
  }

  throwWeapon(game) {
    const B = game.pbullets;
    const w = this.weapon;
    const count = B.filter((b) => !b.flame).length;
    const max = w === 'D' ? 3 : 2;
    if (count >= max) return;
    const cy = this.crouch ? this.y + this.h - 8 : this.y + 7;
    const cx = this.x + this.w / 2 + this.face * 8;
    const dmg = this.armor === 2 ? 2 : 1;
    if (w === 'L') {
      B.push({ x: cx - 6, y: cy - 2, w: 12, h: 4, vx: this.face * 4, vy: 0, dmg, kind: 'L', life: 90 });
      this.fireCd = 22;
      game.sound.throwWeapon();
    } else if (w === 'D') {
      B.push({ x: cx - 4, y: cy - 1, w: 8, h: 3, vx: this.face * 5.4, vy: 0, dmg, kind: 'D', life: 70 });
      this.fireCd = 11;
      game.sound.throwWeapon();
    } else if (w === 'T') {
      B.push({ x: cx - 3, y: cy - 3, w: 7, h: 7, vx: this.face * 2.1, vy: -3.1, grav: 0.18, dmg, kind: 'T', life: 240 });
      this.fireCd = 30;
      game.sound.torchThrow();
    } else if (w === 'A') {
      B.push({
        x: cx - 5, y: cy - 5, w: 10, h: 10, vx: this.face * 2.4, vy: -4.3, grav: 0.15,
        dmg, kind: 'A', life: 160, pierce: true, hits: new Set(), spin: 0,
      });
      this.fireCd = 26;
      game.sound.throwWeapon();
    }
    this.throwT = 14;
  }

  draw(ctx, cam, frame) {
    const sx = Math.round(this.x - 3 - cam.x), sy = Math.round(this.y - cam.y);
    if (this.dead) {
      if (this.deadT > 20) drawSprite(ctx, 'bones', sx - 1, this.y + this.h - 8 - cam.y);
      else drawSprite(ctx, this.armor > 0 ? 'k_stand' : 'b_stand', sx, sy, (this.deadT >> 2) % 2 === 0);
      return;
    }
    if (this.invuln > 0 && (frame >> 2) % 2 === 0) return;
    if (this.duckT > 0) {
      const f = (frame >> 3) % 2 ? 'duck1' : 'duck2';
      drawSprite(ctx, f, sx + 1, this.y + this.h - 10 - cam.y, this.face < 0);
      return;
    }
    const pre = this.armor === 2 ? 'gk_' : this.armor === 1 ? 'k_' : 'b_';
    let f;
    if (this.climbing) f = pre + ((this.runT >> 3) % 2 ? 'climb1' : 'climb2');
    else if (this.crouch) f = pre + 'crouch';
    else if (this.throwT > 6) f = pre + 'throw';
    else if (!this.onGround) f = pre + 'jump';
    else if (Math.abs(this.groundVx) > 0.15) f = pre + ((this.runT >> 3) % 2 ? 'run1' : 'run2');
    else f = pre + 'stand';
    if (f.endsWith('crouch')) drawSprite(ctx, f, sx, this.y + this.h - 11 - cam.y, this.face < 0);
    else drawSprite(ctx, f, sx, sy, this.face < 0 && !this.climbing);
  }
}

// ============================ PLAYER WEAPONS ============================

export function updatePBullets(game) {
  const g = game.stage.g;
  game.pbullets = game.pbullets.filter((b) => {
    b.life--;
    if (b.life <= 0) return false;
    if (b.flame) return true; // burning patch stays put
    if (b.grav) b.vy = Math.min(MAXFALL + 1, b.vy + b.grav);
    if (b.spin !== undefined) b.spin += 0.3;
    b.x += b.vx; b.y += b.vy;
    if (b.x < game.camX - 24 || b.x > game.camX + 280 || b.y > game.camY + 240) return false;
    // torches strike the ground and burn there a moment
    if (b.kind === 'T' && b.vy > 0) {
      const bx = b.x + b.w / 2, by = b.y + b.h;
      if (solidAt(g, bx, by)) {
        b.flame = true; b.vx = 0; b.vy = 0; b.life = 55;
        b.y = Math.floor(by / TILE) * TILE - 10; b.h = 10; b.w = 12; b.x = bx - 6;
        return true;
      }
    }
    if (b.kind !== 'T' && solidAt(g, b.x + b.w / 2, b.y + b.h / 2)) return false; // gravestones eat spears
    if (b.kind === 'T' && solidAt(g, b.x + b.w / 2, b.y + 2) && b.vy < 0) return false;
    return true;
  });
}

export function drawPBullets(game, ctx, frame) {
  for (const b of game.pbullets) {
    const x = Math.round(b.x - game.camX), y = Math.round(b.y - game.camY);
    if (b.flame) {
      ctx.fillStyle = ['#f8d838', '#e07820', '#f8f8d8'][frame % 3];
      for (let i = 0; i < 4; i++) {
        const fx = x + 1 + i * 3, fh = 4 + ((frame + i * 3) % 3) * 2;
        ctx.fillRect(fx, y + 10 - fh, 2, fh);
      }
    } else if (b.kind === 'L') {
      ctx.fillStyle = '#c8d4e0';
      ctx.fillRect(x, y + 1, 12, 2);
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(b.vx > 0 ? x + 9 : x, y, 3, 4);
    } else if (b.kind === 'D') {
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(x, y, 6, 2);
      ctx.fillStyle = '#584028';
      ctx.fillRect(b.vx > 0 ? x : x + 5, y, 2, 3);
    } else if (b.kind === 'T') {
      ctx.fillStyle = ['#f8d838', '#e07820'][frame % 2];
      ctx.beginPath(); ctx.arc(x + 3, y + 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b02818';
      ctx.fillRect(x + 2, y + 2, 2, 2);
    } else if (b.kind === 'A') {
      ctx.save();
      ctx.translate(x + 5, y + 5);
      ctx.rotate(b.spin);
      ctx.fillStyle = '#a8a8b8';
      ctx.fillRect(-5, -2, 10, 4);
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillStyle = '#584028';
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  }
}

// ============================ ENEMY SHOTS ============================

export function updateEBullets(game) {
  const g = game.stage.g;
  game.ebullets = game.ebullets.filter((b) => {
    if (b.grav) b.vy = Math.min(MAXFALL, b.vy + b.grav);
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0) return false;
    if (b.x < game.camX - 20 || b.x > game.camX + 276 || b.y < game.camY - 20 || b.y > game.camY + 244) return false;
    if (solidAt(g, b.x + b.w / 2, b.y + b.h / 2)) return false;
    return true;
  });
}

export function drawEBullets(game, ctx, frame) {
  for (const b of game.ebullets) {
    const x = Math.round(b.x - game.camX), y = Math.round(b.y - game.camY);
    if (b.kind === 'bone') {
      ctx.save();
      ctx.translate(x + 3, y + 3);
      ctx.rotate(frame / 6);
      ctx.fillStyle = '#e8d8a8';
      ctx.fillRect(-4, -1, 8, 2);
      ctx.fillRect(-4, -2, 2, 4); ctx.fillRect(2, -2, 2, 4);
      ctx.restore();
    } else if (b.kind === 'seed') {
      ctx.fillStyle = '#78a860';
      ctx.beginPath(); ctx.arc(x + 2, y + 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#44603c';
      ctx.fillRect(x + 1, y + 1, 2, 2);
    } else if (b.kind === 'poly') {
      ctx.fillStyle = ['#a860d8', '#f8f8f8', '#c8a8f0'][frame % 3];
      ctx.beginPath(); ctx.arc(x + 3, y + 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(x + 2, y + 2, 2, 2);
    } else { // fire
      ctx.fillStyle = ['#f8d838', '#e07820'][frame % 2];
      ctx.beginPath(); ctx.arc(x + 3, y + 3, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b02818';
      ctx.fillRect(x + 2, y + 2, 2, 2);
    }
  }
}

export function fireEBullet(game, x, y, tx, ty, speed = 1.8, o = {}) {
  const d = Math.hypot(tx - x, ty - y) || 1;
  game.ebullets.push({
    x: x - 3, y: y - 3, w: 6, h: 6,
    vx: ((tx - x) / d) * speed, vy: ((ty - y) / d) * speed, life: 320, ...o,
  });
}

// ============================ ENEMIES ============================

export const SCORES = {
  zombie: 100, crow: 200, plant: 300, ghost: 300, skel: 400,
  demon: 1000, ogre: 2000, mage: 1000, boss: 5000,
};

export function spawnEnemy(game, t, x, y, o = {}) {
  const base = { t, x, y, vx: 0, vy: 0, hp: 1, face: -1, timer: 0, state: 0, w: 12, h: 20 };
  const e = Object.assign(base, o);
  switch (t) {
    case 'zombie': e.hp = 1; e.w = 10; e.h = 16; e.state = 'rise'; e.noTouch = true; break;
    case 'crow': e.hp = 1; e.w = 10; e.h = 8; e.state = 'perch'; break;
    case 'plant': e.hp = 3; e.w = 12; e.h = 12; break;
    case 'ghost': e.hp = 1; e.w = 12; e.h = 10; e.phase = (x >> 3) % 60; break;
    case 'skel': e.hp = 2; e.w = 10; e.h = 15; e.vx = -0.5; break;
    case 'demon': e.hp = 8; e.w = 14; e.h = 13; e.state = 'idle'; break;
    case 'ogre': e.hp = 24; e.w = 22; e.h = 28; e.x0 = x; break;
    case 'mage': e.hp = 3; e.w = 14; e.h = 16; e.noTouch = true; break;
    case 'stal': e.hp = 99; e.w = 8; e.h = 14; e.state = 'hang'; e.noTouch = false; break;
    case 'chest': e.w = 15; e.h = 10; e.noTouch = true; e.harmless = true; e.state = 'buried'; break;
    case 'pickup': e.w = 12; e.h = 10; e.noTouch = true; e.harmless = true; e.vy = -2; break;
    case 'boss': e.hp = game.loop === 2 ? 60 : 40; e.w = 40; e.h = 44; e.state = 'hover'; e.x0 = x; e.y0 = y; break;
  }
  game.enemies.push(e);
  return e;
}

function gravityWalk(game, e) {
  const g = game.stage.g;
  e.vy = Math.min(MAXFALL, e.vy + GRAV);
  if (e.vx) {
    const nx = e.x + e.vx;
    const edge = e.vx > 0 ? nx + e.w : nx;
    if (solidAt(g, edge, e.y + e.h - 4) || solidAt(g, edge, e.y + 2)) {
      e.vx = -e.vx; e.face = -e.face;
    } else e.x = nx;
  }
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
      if (t === T.LADDER && tileAt(g, Math.floor(sx / TILE), r - 1) === T.LADDER) continue;
      e.y = top - e.h; e.vy = 0; grounded = true;
      break;
    }
  }
  if (!grounded) e.y = ny;
  return grounded;
}

// Turn at ledges — skeletons prefer not to fall off the battlements.
function ledgeTurn(game, e) {
  const g = game.stage.g;
  const ahead = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
  const below = tileAt(g, Math.floor(ahead / TILE), Math.floor((e.y + e.h + 2) / TILE));
  if (!standable(below)) { e.vx = -e.vx; e.face = -e.face; }
}

export function updateEnemies(game) {
  const P = game.player;
  const px = P.x + P.w / 2, py = P.y + P.h / 2;
  const keep = [];
  for (const e of game.enemies) {
    e.timer++;
    let alive = true;
    switch (e.t) {
      case 'zombie': {
        if (e.state === 'rise') {
          if (e.timer === 1) game.sound.groan();
          if (e.timer > 55) { e.state = 'walk'; e.noTouch = false; e.vx = px < e.x ? -0.42 : 0.42; e.face = Math.sign(e.vx) || -1; }
        } else {
          gravityWalk(game, e);
          if (e.drown) { alive = false; break; }
          if (e.timer % 150 === 0) { e.vx = px < e.x ? -0.42 : 0.42; e.face = Math.sign(e.vx) || -1; }
        }
        break;
      }
      case 'crow': {
        if (e.state === 'perch') {
          if (Math.abs(px - e.x) < 76 && Math.abs(py - e.y) < 90) {
            e.state = 'swoop';
            e.vx = px < e.x ? -1.7 : 1.7;
            e.vy = -0.8;
            game.sound.swoop();
          }
        } else {
          // dive at the knight, pull up past him
          if (e.y + 4 < py && e.swooped !== true) e.vy += 0.09;
          else { e.vy -= 0.11; if (e.vy < -1.6) { e.vy = -1.6; e.swooped = true; } }
          e.x += e.vx; e.y += e.vy;
        }
        break;
      }
      case 'plant': {
        if (e.timer % 140 === 60 && Math.abs(px - e.x) < 170 && !game.bossOn) {
          const dir = px < e.x ? -1 : 1;
          game.ebullets.push({
            x: e.x + e.w / 2, y: e.y, w: 5, h: 5, kind: 'seed',
            vx: dir * (0.9 + Math.abs(px - e.x) / 260), vy: -3.3, grav: 0.16, life: 300,
          });
          game.sound.seedSpit();
        }
        break;
      }
      case 'ghost': {
        // phases in and out; drifts through everything
        const cyc = (e.timer + e.phase) % 190;
        e.invis = cyc > 120 && cyc < 175;
        e.fading = cyc > 100 && cyc <= 120;
        if (cyc === 175 && Math.abs(px - e.x) < 200) game.sound.ghostWail();
        const d = Math.hypot(px - e.x, py - e.y) || 1;
        const v = e.invis ? 0.2 : 0.5;
        e.x += ((px - e.x) / d) * v;
        e.y += ((py - 6 - e.y) / d) * v + Math.sin(e.timer / 22) * 0.3;
        break;
      }
      case 'skel': {
        gravityWalk(game, e);
        ledgeTurn(game, e);
        if (e.drown) { alive = false; break; }
        if (e.timer % 130 === 40 && Math.abs(px - e.x) < 170) {
          e.face = px < e.x ? -1 : 1;
          game.ebullets.push({
            x: e.x + e.w / 2, y: e.y, w: 6, h: 6, kind: 'bone',
            vx: (px < e.x ? -1 : 1) * (0.9 + Math.abs(px - e.x) / 240), vy: -3.5, grav: 0.17, life: 300,
          });
          game.sound.boneThrow();
        }
        break;
      }
      case 'demon': {
        // Red Moorimer: hover... swoop... dive. The old nightmare.
        e.face = px < e.x ? -1 : 1;
        if (e.state === 'idle') {
          gravityWalk(game, e);
          if (Math.abs(px - e.x) < 130) { e.state = 'rise'; game.sound.roar(); }
        } else if (e.state === 'rise') {
          e.y -= 1.1;
          e.x += Math.sign(px - e.x) * 0.4;
          if (e.y < Math.max(game.camY + 24, py - 70)) { e.state = 'hover'; e.hoverT = 0; }
        } else if (e.state === 'hover') {
          e.hoverT++;
          e.x += Math.sin(e.hoverT / 14) * 0.9 + Math.sign(px - e.x) * 0.25;
          e.y += Math.sin(e.hoverT / 9) * 0.5;
          if (e.hoverT > 65) {
            e.state = 'dive';
            const d = Math.hypot(px - e.x, py - e.y) || 1;
            e.vx = ((px - e.x) / d) * 2.7;
            e.vy = ((py - e.y) / d) * 2.7;
            game.sound.swoop();
          }
        } else if (e.state === 'dive') {
          e.x += e.vx; e.y += e.vy;
          const g2 = game.stage.g;
          if (e.y + e.h > py + 26 || solidAt(g2, e.x + e.w / 2, e.y + e.h + 2)) {
            e.state = 'rise';
          }
        }
        break;
      }
      case 'ogre': {
        gravityWalk(game, e);
        const dist = px - (e.x + e.w / 2);
        e.face = dist < 0 ? -1 : 1;
        if (e.state === 0) {
          e.vx = Math.abs(dist) > 8 && Math.abs(dist) < 120 ? Math.sign(dist) * 0.3 : 0;
          if (e.timer % 170 === 0 && Math.abs(dist) < 130) {
            e.state = 1; e.lungeT = 0; game.sound.roar();
          }
        } else {
          e.lungeT++;
          e.vx = e.face * 1.5;
          if (e.lungeT > 26) { e.state = 0; e.vx = 0; }
        }
        e.x = Math.max(e.x0 - 70, Math.min(e.x0 + 70, e.x));
        break;
      }
      case 'mage': {
        // rises from the chest, hovers, flings polymorph — then vanishes
        if (e.timer < 30) e.y -= 0.8;
        else {
          e.y += Math.sin(e.timer / 16) * 0.5;
          e.x += Math.sin(e.timer / 23) * 0.6;
          if (e.timer % 85 === 40) {
            fireEBullet(game, e.x + e.w / 2, e.y + 8, px, py, 1.5, { kind: 'poly' });
            game.sound.magicBolt();
          }
        }
        if (e.timer > 340) {
          game.addPoof(e.x + 7, e.y + 8);
          alive = false;
        }
        break;
      }
      case 'stal': {
        if (e.state === 'hang') {
          if (Math.abs(px + P.w / 2 - (e.x + 4)) < 14 && py > e.y) {
            e.state = 'shake'; e.timer = 0;
            game.sound.stalactite();
          }
        } else if (e.state === 'shake') {
          if (e.timer > 22) e.state = 'fall';
        } else {
          e.vy = Math.min(5.5, e.vy + 0.3);
          e.y += e.vy;
          if (solidAt(game.stage.g, e.x + 4, e.y + e.h)) {
            game.addBoom(e.x + 4, e.y + e.h - 4, false);
            alive = false;
          }
        }
        break;
      }
      case 'chest': {
        if (e.state === 'buried') {
          if (Math.abs(px - (e.x + 8)) < 44) {
            e.state = 'rising'; e.riseT = 0;
            game.sound.chestUp();
          }
        } else if (e.state === 'rising') {
          e.riseT++;
          if (e.riseT >= 18) e.state = 'closed';
        } else if (e.state === 'closed') {
          if (overlap(e, P.hitbox()) && !P.dead) game.openChest(e);
        }
        break;
      }
      case 'pickup': {
        // pops out of the chest, settles, waits
        gravityWalk(game, e);
        if (e.timer > 15 && overlap(e, P.hitbox()) && !P.dead) {
          game.collectPickup(e);
          alive = false;
        }
        if (e.timer > 600) alive = false;
        break;
      }
      case 'boss': {
        alive = updateBoss(game, e, px, py);
        break;
      }
    }
    // cull far off-screen strays (chests, stalactites and the boss stay)
    if (e.t !== 'chest' && e.t !== 'boss' && e.t !== 'stal' && e.t !== 'ogre') {
      if (e.x + e.w < game.camX - 60 || e.x > game.camX + 320 ||
          e.y > game.camY + 300 || e.y + e.h < game.camY - 90) alive = false;
    }
    if (alive) keep.push(e);
  }
  game.enemies = keep;
}

// Astamoore the demon lord. Weak point: the head. Everything else: spite.
function updateBoss(game, e, px, py) {
  const arenaL = game.camX + 16, arenaR = game.camX + 240 - e.w;
  if (e.state === 'hover') {
    e.x = e.x0 + Math.sin(e.timer / 55) * 62;
    e.y = e.y0 + Math.sin(e.timer / 33) * 22;
    e.x = Math.max(arenaL, Math.min(arenaR, e.x));
    const rate = game.loop === 2 ? 110 : 140;
    if (e.timer % rate === 70) {
      // fireball spread aimed at the knight
      const n = game.loop === 2 ? 5 : 3;
      const base = Math.atan2(py - (e.y + 14), px - (e.x + 9));
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.28;
        game.ebullets.push({
          x: e.x + 6, y: e.y + 10, w: 6, h: 6, kind: 'fire',
          vx: Math.cos(a) * 1.9, vy: Math.sin(a) * 1.9, life: 320,
        });
      }
      game.sound.roar();
    }
    if (e.timer % 420 === 300) { e.state = 'dive'; game.sound.swoop(); }
  } else if (e.state === 'dive') {
    // drops to the floor and sweeps across it
    const floorY = 11 * TILE - e.h;
    if (e.y < floorY) e.y += 2.2;
    else {
      if (!e.sweepVx) e.sweepVx = px < e.x ? -1.4 : 1.4;
      e.x += e.sweepVx;
      if (e.x < arenaL || e.x > arenaR) { e.state = 'up'; e.sweepVx = 0; }
    }
  } else if (e.state === 'up') {
    e.y -= 1.6;
    if (e.y <= e.y0) { e.y = e.y0; e.state = 'hover'; }
  }
  return true;
}

// The boss's vulnerable spot — the head only. Body blows just clink.
export function bossHeadBox(e) {
  return { x: e.x + 10, y: e.y + 4, w: 20, h: 14 }; // sprite drawn at 2x scale
}

export function damageEnemy(game, e, dmg) {
  if (e.harmless || e.t === 'stal') { return; }
  if (e.t === 'ghost' && (e.invis || e.fading)) { return; }
  e.hp -= dmg;
  e.flash = 4;
  if (e.hp > 0) { game.sound.ehit(); return; }
  game.addScore(SCORES[e.t] || 100);
  game.addBoom(e.x + e.w / 2, e.y + e.h / 2, e.t === 'boss' || e.t === 'ogre');
  game.sound.boom();
  if (e.t === 'boss') { game.enemies = game.enemies.filter((n) => n !== e); game.onBossDown(); return; }
  // the dead sometimes drop what they carried
  if ((e.t === 'skel' || e.t === 'demon') && (Math.floor(e.x) % 3 === 0)) {
    const drops = ['D', 'A', 'T', 'L'];
    spawnEnemy(game, 'pickup', e.x + 2, e.y, { item: drops[Math.floor(e.x / 16) % 4] });
  }
  if (e.t === 'ogre') game.ogreDown = true;
  game.enemies = game.enemies.filter((n) => n !== e);
}

// ============================ ENEMY DRAWING ============================

function drawScaled(ctx, name, x, y, scale, flip = false) {
  const c = SPR[name];
  if (!c) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(Math.round(x) + c.width * scale, Math.round(y));
    ctx.scale(-scale, scale);
  } else {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
  }
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

export function drawEnemies(game, ctx, frame) {
  for (const e of game.enemies) {
    const x = Math.round(e.x - game.camX), y = Math.round(e.y - game.camY);
    if (e.flash > 0) { e.flash--; ctx.globalAlpha = 0.5; }
    switch (e.t) {
      case 'zombie': {
        if (e.state === 'rise') {
          const px2 = Math.min(16, (e.timer / 55) * 16);
          drawSpriteClip(ctx, 'zomb1', x - 3, y + e.h - px2, px2, e.face > 0);
          // dirt spray
          ctx.fillStyle = '#2a2620';
          for (let i = 0; i < 3; i++) ctx.fillRect(x - 4 + i * 6, y + e.h - 2 - ((e.timer + i * 7) % 6), 2, 2);
        } else {
          drawSprite(ctx, (frame >> 4) % 2 ? 'zomb1' : 'zomb2', x - 3, y, e.face > 0);
        }
        break;
      }
      case 'crow': {
        if (e.state === 'perch') drawSprite(ctx, 'crow_sit', x - 1, y - 1, px2FaceCrow(game, e));
        else drawSprite(ctx, (frame >> 2) % 2 ? 'crow_fly1' : 'crow_fly2', x - 1, y, e.vx > 0);
        break;
      }
      case 'plant': {
        const open = (e.timer % 140) > 40 && (e.timer % 140) < 90;
        drawSprite(ctx, open ? 'plant1' : 'plant2', x - 2, y);
        break;
      }
      case 'ghost': {
        if (e.invis) break;
        ctx.globalAlpha = e.fading ? 0.35 : 0.8;
        drawSprite(ctx, (frame >> 3) % 2 ? 'ghost1' : 'ghost2', x - 1, y, px2FaceCrow(game, e));
        ctx.globalAlpha = 1;
        break;
      }
      case 'skel':
        drawSprite(ctx, (frame >> 3) % 2 ? 'skel1' : 'skel2', x - 3, y, e.face > 0);
        break;
      case 'demon':
        drawSprite(ctx, (frame >> 2) % 2 ? 'demon1' : 'demon2', x - 1, y, e.face > 0);
        break;
      case 'ogre':
        drawScaled(ctx, (frame >> 4) % 2 ? 'ogre1' : 'ogre2', x - 4, y - 2, 1.5, e.face > 0);
        break;
      case 'mage': {
        if (e.timer > 320) ctx.globalAlpha = 0.5;
        drawSprite(ctx, (frame >> 3) % 2 ? 'mage1' : 'mage2', x - 1, y, px2FaceCrow(game, e));
        ctx.globalAlpha = 1;
        break;
      }
      case 'stal': {
        const sx2 = e.state === 'shake' ? x + ((e.timer >> 1) % 2 ? 1 : -1) : x;
        ctx.fillStyle = '#8878b0';
        ctx.beginPath();
        ctx.moveTo(sx2, y); ctx.lineTo(sx2 + 8, y); ctx.lineTo(sx2 + 4, y + 14);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b8a8e0';
        ctx.fillRect(sx2 + 2, y + 1, 2, 7);
        break;
      }
      case 'chest': {
        if (e.state === 'buried') break;
        const rise = e.state === 'rising' ? Math.round(10 - (e.riseT / 18) * 10) : 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 1, y - 4, 18, 14); // clip at the ground line while rising
        ctx.clip();
        drawSprite(ctx, e.opened ? 'chest_open' : 'chest', x, y + rise);
        ctx.restore();
        break;
      }
      case 'pickup': {
        if (e.timer % 8 < 6 || e.timer > 500) {
          const icon = { L: 'i_lance', D: 'i_dagger', T: 'i_torch', A: 'i_axe', armor: 'i_armor', gold: 'i_gold' }[e.item];
          drawSprite(ctx, icon, x, y);
        }
        break;
      }
      case 'boss': {
        // wings, procedural, beating
        const flap = Math.sin(frame / 6) * 10;
        ctx.fillStyle = '#802818';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 16);
        ctx.lineTo(x - 18, y + 4 - flap);
        ctx.lineTo(x - 8, y + 26);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 34, y + 16);
        ctx.lineTo(x + 58, y + 4 - flap);
        ctx.lineTo(x + 48, y + 26);
        ctx.closePath(); ctx.fill();
        drawScaled(ctx, (frame >> 3) % 2 ? 'asta1' : 'asta2', x, y, 2, px2FaceCrow(game, e));
        // weak-point glint
        if ((frame >> 4) % 3 === 0) {
          ctx.fillStyle = '#f8d838';
          ctx.fillRect(x + 18 + (frame % 8), y + 2, 2, 2);
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
  }
}

function px2FaceCrow(game, e) {
  return game.player.x + game.player.w / 2 > e.x + e.w / 2;
}
