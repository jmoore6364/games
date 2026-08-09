// Entities: player (on foot / riding the Moore Slug), rebels, gunship,
// POWs, pickups, projectiles, and the Iron Moore-den boss.

import { drawSprite, sprW, sprH, drawBoom, drawPuff, BOSS } from './sprites.js';
import { TILE, T, tileAt, solid, standable, LEVEL } from './levels.js';

const GRAV = 0.22;

export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---- terrain helpers (positions are feet-center for actors) ----
function groundBelow(x, y, dropPlanks = false) {
  // returns the y of the surface at/under (x, y) reachable by falling
  const tx = Math.floor(x / TILE);
  for (let ty = Math.max(0, Math.floor(y / TILE)); ty < LEVEL.g.h; ty++) {
    const t = tileAt(LEVEL.g, tx, ty);
    if (solid(t) || (!dropPlanks && (t === T.PLANK || t === T.BRIDGE))) return ty * TILE;
  }
  return LEVEL.g.h * TILE;
}
function solidAt(x, y) {
  return solid(tileAt(LEVEL.g, Math.floor(x / TILE), Math.floor(y / TILE)));
}

// =====================================================================
// PLAYER
// =====================================================================
export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.dir = 1;
    this.onGround = false;
    this.crouch = false;
    this.aimUp = false; this.aimDown = false;
    this.runT = 0;
    this.fireT = 0; this.fireAnim = 0;
    this.nadeAnim = 0;
    this.knifeAnim = 0;
    this.dropT = 0;
    this.weapon = 'pistol'; // pistol | H | R
    this.ammo = 0;
    this.nades = 10;
    this.state = 'alive'; // alive | dead
    this.deadT = 0;
    this.inv = 90;
    this.riding = null; // slug ref
  }

  get w() { return 12; }
  get h() { return this.crouch ? 18 : 28; }
  get box() { return { x: this.x - 6, y: this.y - this.h, w: 12, h: this.h }; }

  muzzle() {
    // world position + direction of the gun tip
    if (this.aimUp) return { x: this.x + 3 * this.dir, y: this.y - 44, dx: 0, dy: -1 };
    if (this.aimDown && !this.onGround) return { x: this.x + 2 * this.dir, y: this.y + 4, dx: 0, dy: 1 };
    const my = this.crouch ? this.y - 12 : this.y - 17;
    return { x: this.x + 13 * this.dir, y: my, dx: this.dir, dy: 0 };
  }

  update(game) {
    const inp = game.input;
    if (this.state === 'dead') {
      this.deadT++;
      this.vy += GRAV;
      this.x += this.vx; this.y += this.vy;
      const gy = groundBelow(this.x, this.y - 8);
      if (this.y > gy) { this.y = gy; this.vx *= 0.7; this.vy = 0; }
      return;
    }
    if (this.inv > 0) this.inv--;
    if (this.riding) { this.updateRiding(game); return; }

    const L = inp.down('left'), R = inp.down('right');
    this.crouch = this.onGround && inp.down('down');
    this.aimUp = inp.down('up');
    this.aimDown = !this.onGround && inp.down('down');

    const speed = 1.5;
    this.vx = 0;
    if (L && !this.crouch) { this.vx = -speed; this.dir = -1; }
    if (R && !this.crouch) { this.vx = speed; this.dir = 1; }
    if (this.crouch) { if (L) this.dir = -1; if (R) this.dir = 1; }

    // drop through planks / jump
    if (inp.pressed('jump')) {
      if (this.onGround && inp.down('down')) {
        const tx = Math.floor(this.x / TILE), ty = Math.floor((this.y + 2) / TILE);
        const t = tileAt(LEVEL.g, tx, ty);
        if (t === T.PLANK || t === T.BRIDGE) this.dropT = 12;
        else { this.vy = -4.7; this.onGround = false; }
      } else if (this.onGround) {
        this.vy = -4.7; this.onGround = false;
      }
    }

    // horizontal move with wall check at torso height; single-tile ledges
    // are climbed automatically, Metal Slug style
    const nx = this.x + this.vx;
    const lead = Math.sign(this.vx) * 6;
    if (!solidAt(nx + lead, this.y - 8) && !solidAt(nx + lead, this.y - 20)) {
      this.x = Math.max(8, Math.min(LEVEL.endX - 8, nx));
    } else if (this.onGround && this.vx !== 0 &&
               solidAt(nx + lead, this.y - 8) &&
               !solidAt(nx + lead, this.y - 20) &&
               !solidAt(nx + lead, this.y - 36) &&
               !solidAt(this.x, this.y - 36)) {
      this.x = Math.max(8, Math.min(LEVEL.endX - 8, nx));
      this.y = Math.floor((this.y - 9) / TILE) * TILE;
    }

    // vertical
    this.vy += GRAV;
    if (this.vy > 5) this.vy = 5;
    const wasAbove = this.y;
    this.y += this.vy;
    if (this.dropT > 0) this.dropT--;
    this.onGround = false;
    if (this.vy >= 0) {
      const tx = Math.floor(this.x / TILE);
      const tyA = Math.floor(wasAbove / TILE), tyB = Math.floor(this.y / TILE);
      for (let ty = tyA; ty <= tyB; ty++) {
        const t = tileAt(LEVEL.g, tx, ty);
        const isPlat = t === T.PLANK || t === T.BRIDGE;
        if ((solid(t) || (isPlat && this.dropT === 0)) && wasAbove <= ty * TILE + 4) {
          this.y = ty * TILE; this.vy = 0; this.onGround = true;
          break;
        }
      }
    }

    // board the slug
    const slug = game.slug;
    if (slug && !slug.dead && !slug.ridden &&
        Math.abs(this.x - slug.x) < 20 && Math.abs(this.y - slug.y) < 30) {
      this.riding = slug; slug.ridden = true;
      this.x = slug.x; this.y = slug.y;
      game.sound.ride();
      game.toast('METAL MOORE!');
    }

    // knife or gun
    if (this.knifeAnim > 0) this.knifeAnim--;
    if (this.nadeAnim > 0) this.nadeAnim--;
    if (this.fireT > 0) this.fireT--;
    if (this.fireAnim > 0) this.fireAnim--;

    if (inp.pressed('nade') && this.nades > 0) {
      this.nades--;
      this.nadeAnim = 14;
      game.pnades.push({
        x: this.x + 4 * this.dir, y: this.y - 24,
        vx: 2.3 * this.dir + this.vx * 0.5, vy: -3.4, t: 0, bounced: 0,
      });
      game.sound.knife();
    }

    const fireHeld = inp.down('fire');
    const firePressed = inp.pressed('fire');
    if (firePressed || fireHeld) {
      // melee takes priority when a grounded enemy is in your face
      const targetClose = firePressed && game.enemies.some((e) =>
        !e.dying && e.kind !== 'heli' &&
        Math.abs(e.y - this.y) < 24 &&
        (e.x - this.x) * this.dir > 0 && Math.abs(e.x - this.x) < 24);
      if (targetClose && this.knifeAnim === 0) {
        this.knifeAnim = 16;
        game.sound.slash();
        for (const e of game.enemies) {
          if (!e.dying && e.kind !== 'heli' &&
              Math.abs(e.y - this.y) < 26 &&
              (e.x - this.x) * this.dir > -4 && Math.abs(e.x - this.x) < 30) {
            killEnemy(game, e, this.dir);
            game.addScore(500);
          }
        }
      } else if (this.knifeAnim === 0 && this.fireT === 0) {
        const rate = this.weapon === 'H' ? 5 : this.weapon === 'R' ? 16 : (firePressed ? 7 : 11);
        if (this.weapon !== 'pistol' || firePressed || fireHeld) {
          this.shoot(game);
          this.fireT = rate;
          this.fireAnim = 6;
        }
      }
    }
    this.runT += Math.abs(this.vx) > 0 ? 1 : 0;
  }

  shoot(game) {
    const m = this.muzzle();
    if (this.weapon === 'R') {
      game.pbullets.push({ x: m.x, y: m.y, vx: m.dx * 3.4, vy: m.dy * 3.4, dmg: 5, kind: 'rocket', dir: this.dir, t: 0 });
      game.sound.rocketFire();
    } else {
      const sp = this.weapon === 'H' ? 4.6 : 4.2;
      const jitter = this.weapon === 'H' ? (Math.random() - 0.5) * 0.5 : 0;
      game.pbullets.push({
        x: m.x, y: m.y,
        vx: m.dx * sp + (m.dy ? jitter : 0), vy: m.dy * sp + (m.dx ? jitter : 0),
        dmg: 1, kind: 'bullet', t: 0,
      });
      if (this.weapon === 'H') game.sound.hmg(); else game.sound.pistol();
    }
    game.muzzles.push({ x: m.x, y: m.y, t: 0, up: !!m.dy });
    if (this.weapon !== 'pistol') {
      this.ammo--;
      if (this.ammo <= 0) { this.weapon = 'pistol'; game.toast('PISTOL'); }
    }
  }

  updateRiding(game) {
    const inp = game.input;
    const slug = this.riding;
    slug.update(game, inp);
    this.x = slug.x; this.y = slug.y;
    // dismount
    if (inp.pressed('jump') && inp.down('down')) {
      this.riding = null; slug.ridden = false;
      this.y = slug.y - 26; this.vy = -3;
      this.inv = Math.max(this.inv, 30);
    }
  }

  kill(game, fromDir = 1) {
    if (this.state === 'dead' || this.inv > 0) return;
    if (this.riding) { this.riding.hit(game, 2); return; }
    this.state = 'dead';
    this.deadT = 0;
    this.vx = -fromDir * 1.4;
    this.vy = -3.6;
    game.sound.hurt();
    game.onPlayerDeath();
  }

  draw(g, cam) {
    const x = this.x - cam.x, y = this.y - cam.y;
    if (this.state === 'dead') {
      const f = this.deadT < 14 ? 'p_die1' : this.deadT < 28 || this.vy !== 0 ? 'p_die2' : 'p_die3';
      drawSprite(g, f, x - 13, y - 17, this.dir < 0);
      return;
    }
    if (this.riding) return; // slug draws us
    if (this.inv > 0 && (this.inv >> 2) % 2) return; // blink

    const flip = this.dir < 0;
    // legs
    let legs = 'l_stand';
    if (!this.onGround) legs = 'l_jump';
    else if (this.crouch) legs = 'l_crouch';
    else if (Math.abs(this.vx) > 0) legs = `l_run${1 + Math.floor(this.runT / 5) % 6}`;
    // torso
    let torso = 't_aim';
    if (this.nadeAnim > 0) torso = 't_nade';
    else if (this.knifeAnim > 0) torso = this.knifeAnim > 11 ? 't_knife1' : this.knifeAnim > 5 ? 't_knife2' : 't_knife3';
    else if (this.aimUp) torso = this.fireAnim > 0 ? 't_upfire' : 't_up';
    else if (this.crouch) torso = 't_crouch';
    else torso = this.fireAnim > 0 ? 't_fire' : 't_aim';

    const legY = this.crouch ? y - 7 : y - 13;
    const torY = this.crouch ? y - 24 : (legY - 16);
    drawSprite(g, legs, x - 10, legY, flip);
    drawSprite(g, torso, x - 13, torY, flip);
  }
}

// =====================================================================
// THE MOORE SLUG
// =====================================================================
export class Slug {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.dir = 1;
    this.hp = 6;
    this.ridden = false;
    this.dead = false;
    this.treadT = 0;
    this.fireT = 0;
    this.cannonT = 0;
    this.flash = 0;
    this.aim = 0; // 0 fwd, 1 up45, 2 up90
    this.onGround = true;
  }

  get box() { return { x: this.x - 20, y: this.y - 26, w: 40, h: 26 }; }

  update(game, inp) {
    this.treadT++;
    if (this.flash > 0) this.flash--;
    if (this.fireT > 0) this.fireT--;
    if (this.cannonT > 0) this.cannonT--;
    const L = inp.down('left'), R = inp.down('right');
    this.vx = 0;
    if (L) { this.vx = -1.3; this.dir = -1; }
    if (R) { this.vx = 1.3; this.dir = 1; }
    this.aim = inp.down('up') ? (L || R ? 1 : 2) : 0;

    if (inp.pressed('jump') && !inp.down('down') && this.onGround) { this.vy = -4.2; this.onGround = false; }

    const nx = this.x + this.vx;
    if (!solidAt(nx + Math.sign(this.vx) * 20, this.y - 8)) {
      this.x = Math.max(24, Math.min(LEVEL.endX - 24, nx));
    }
    this.vy += GRAV;
    const wasY = this.y;
    this.y += this.vy;
    this.onGround = false;
    if (this.vy >= 0) {
      const gy = groundBelow(this.x, wasY - 4);
      if (this.y >= gy) { this.y = gy; this.vy = 0; this.onGround = true; }
    }

    // vulcan
    if (inp.down('fire') && this.fireT === 0) {
      this.fireT = 4;
      const a = this.aim === 2 ? -Math.PI / 2 : this.aim === 1 ? -Math.PI / 4 : 0;
      const mx = this.x + Math.cos(a) * 26 * this.dir;
      const my = this.y - 24 + Math.sin(a) * 22;
      game.pbullets.push({
        x: mx, y: my,
        vx: Math.cos(a) * 5 * this.dir + (Math.random() - 0.5) * 0.4,
        vy: Math.sin(a) * 5 + (Math.random() - 0.5) * 0.4,
        dmg: 1, kind: 'bullet', t: 0,
      });
      game.muzzles.push({ x: mx, y: my, t: 0, up: this.aim === 2 });
      game.sound.hmg();
    }
    // cannon — uses the grenade stock
    if (inp.pressed('nade') && game.player.nades > 0 && this.cannonT === 0) {
      game.player.nades--;
      this.cannonT = 24;
      game.pbullets.push({
        x: this.x + 24 * this.dir, y: this.y - 22,
        vx: 3.6 * this.dir, vy: -1.4, dmg: 6, kind: 'shell', t: 0, grav: true,
      });
      game.sound.cannon();
      game.shake(4);
    }
  }

  hit(game, dmg) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 6;
    game.sound.clank();
    if (this.hp <= 0) {
      this.dead = true;
      game.addBoom(this.x, this.y - 14, 26);
      game.shake(8);
      if (this.ridden) {
        const p = game.player;
        p.riding = null; this.ridden = false;
        p.y = this.y - 30; p.vy = -3.5; p.inv = Math.max(p.inv, 60);
      }
    }
  }

  draw(g, cam, game) {
    if (this.dead) return;
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const flip = this.dir < 0;
    const white = this.flash > 0 && (this.flash >> 1) % 2 === 0;
    const bodyF = (this.treadT >> 3) % 2 === 0 ? 'slug_body1' : 'slug_body2';
    // rider torso pokes from the hatch
    if (this.ridden && game.player.state === 'alive') {
      drawSprite(g, 't_ride', x - 13 + (flip ? 2 : -2), y - 40, flip);
    }
    const tur = this.aim === 2 ? 'slug_tur_u90' : this.aim === 1 ? 'slug_tur_u45' : 'slug_tur_f';
    drawSprite(g, tur, flip ? x - 13 : x - 12, y - 32, flip, white);
    drawSprite(g, bodyF, x - 22, y - 20, flip, white);
    if (!this.ridden && !this.dead) {
      // beckoning arrow
      const bob = Math.sin(game.frame / 12) * 3;
      g.fillStyle = '#f8d850';
      g.fillRect(x - 2, y - 48 + bob, 4, 8);
      g.fillRect(x - 5, y - 42 + bob, 10, 3);
    }
  }
}

// =====================================================================
// ENEMIES
// =====================================================================
let eid = 0;
export function spawnEnemy(game, t, c, plat = false) {
  const x = c * TILE + 8;
  let y = groundBelow(x, 0);
  if (plat) {
    // find the highest plank at this column
    for (let ty = 0; ty < LEVEL.g.h; ty++) {
      const tl = tileAt(LEVEL.g, c, ty);
      if (tl === T.PLANK || standable(tl)) { y = ty * TILE; break; }
    }
  }
  game.enemies.push({
    id: eid++, kind: t, x, y, vx: 0, vy: 0, dir: -1,
    hp: t === 'heli' ? 8 : 1,
    t: Math.floor(Math.random() * 40),
    dying: false, dieT: 0, walkT: 0,
    baseY: t === 'heli' ? 58 + Math.random() * 20 : y,
    flash: 0,
  });
  if (t === 'heli') {
    const e = game.enemies[game.enemies.length - 1];
    e.y = -20; e.x = c * TILE;
  }
}

export function killEnemy(game, e, fromDir = 1) {
  if (e.dying) return;
  e.dying = true;
  e.dieT = 0;
  e.vx = fromDir * 1.2;
  e.vy = -2.8;
  game.sound.eDie();
  game.addScore(100);
  if (e.kind === 'heli') {
    game.addBoom(e.x, e.y, 20);
  }
}

export function updateEnemies(game) {
  const p = game.player;
  for (const e of game.enemies) {
    if (e.flash > 0) e.flash--;
    if (e.dying) {
      e.dieT++;
      if (e.kind === 'heli') {
        e.vy += 0.12; e.y += e.vy; e.x += e.vx;
        if (e.y > groundBelow(e.x, e.y - 10)) { game.addBoom(e.x, e.y, 24); game.shake(5); e.gone = true; }
      } else {
        e.vy += GRAV; e.x += e.vx; e.y += e.vy;
        const gy = groundBelow(e.x, e.y - 10);
        if (e.y > gy) { e.y = gy; e.vx *= 0.6; e.vy = 0; }
        if (e.dieT > 80) e.gone = true;
      }
      continue;
    }
    e.t++;
    const dx = p.x - e.x;
    const seen = Math.abs(dx) < 300;
    e.dir = dx < 0 ? -1 : 1;

    if (e.kind === 'rifle') {
      // kneel and pop shots; shuffle to hold ~120px range
      const cycle = e.t % 150;
      if (Math.abs(dx) > 150 && cycle < 50) {
        e.x += e.dir * 0.6; e.walkT++;
        e.mode = 'walk';
      } else if (seen && cycle === 70) {
        e.mode = 'aim';
      } else if (seen && cycle >= 90 && cycle < 110 && cycle % 9 === 0 && p.state === 'alive') {
        e.mode = 'fire';
        const a = Math.atan2((p.y - 14) - (e.y - 12), dx);
        game.ebullets.push({ x: e.x + e.dir * 10, y: e.y - 12, vx: Math.cos(a) * 1.7, vy: Math.sin(a) * 1.7, t: 0 });
        game.sound.pistol();
      } else if (cycle > 120) e.mode = 'stand';
    } else if (e.kind === 'knife') {
      if (seen) {
        e.x += e.dir * 1.1; e.walkT += 1.4;
        if (Math.abs(dx) < 20 && Math.abs(p.y - e.y) < 24 && e.t % 30 === 0) {
          e.mode = 'slash'; e.slashT = e.t;
          if (p.state === 'alive') p.kill(game, e.dir);
        }
      }
      // don't walk off cliffs
      const ahead = groundBelow(e.x + e.dir * 8, e.y - 4);
      if (ahead > e.y + 40) e.x -= e.dir * 1.1;
      e.y = groundBelow(e.x, e.y - 6);
    } else if (e.kind === 'nade') {
      if (seen && e.t % 130 === 0 && p.state === 'alive') {
        const dist = Math.abs(dx);
        game.enades.push({ x: e.x + e.dir * 6, y: e.y - 20, vx: e.dir * Math.min(2.6, dist / 60), vy: -3.4, t: 0 });
        e.mode = 'throw'; e.throwT = e.t;
      }
    } else if (e.kind === 'heli') {
      // descend to hover height, bob, strafe toward player, drop bombs
      if (e.y < e.baseY) e.y += 1.2;
      else e.y = e.baseY + Math.sin(e.t / 22) * 6;
      e.x += Math.sign(dx) * Math.min(0.8, Math.abs(dx) / 200);
      if (e.t % 8 === 0) game.sound.heli();
      if (Math.abs(dx) < 40 && e.t % 100 < 2 && p.state === 'alive') {
        game.enades.push({ x: e.x, y: e.y + 12, vx: 0, vy: 0.5, t: 0, bomb: true });
      }
    }

    // the slug crushes infantry it rolls into; on foot, a knife rebel
    // in contact is lethal
    if (p.state === 'alive' && !e.dying && e.kind !== 'heli') {
      if (p.riding && Math.abs(dx) < 26 && Math.abs(p.y - e.y) < 20) {
        killEnemy(game, e, e.dir * -1);
        game.sound.clank();
      } else if (!p.riding && e.kind === 'knife' &&
                 Math.abs(dx) < 10 && Math.abs(p.y - e.y) < 24) {
        p.kill(game, e.dir);
      }
    }
  }
  game.enemies = game.enemies.filter((e) => !e.gone);
}

export function drawEnemies(game, g, cam) {
  for (const e of game.enemies) {
    const x = Math.round(e.x - cam.x), y = Math.round(e.y - cam.y);
    const flip = e.dir > 0; // art faces right; rebels usually face left toward player
    const white = e.flash > 0;
    if (e.kind === 'heli') {
      const f = (game.frame >> 2) % 2 ? 'heli1' : 'heli2';
      drawSprite(g, f, x - 18, y - 12, e.dir > 0, white);
      if (e.dying && (game.frame >> 2) % 2) drawPuff(g, x, y, 0.4, 6, e.id);
      continue;
    }
    if (e.dying) {
      const f = e.dieT < 12 ? 'e_die1' : e.vy !== 0 || e.dieT < 26 ? 'e_die2' : 'e_die3';
      if (e.dieT > 60 && (e.dieT >> 2) % 2) continue; // blink out
      drawSprite(g, f, x - 11, y - 24, flip);
      continue;
    }
    let f = 'e_stand';
    if (e.kind === 'rifle') {
      if (e.mode === 'aim') f = 'e_aim';
      else if (e.mode === 'fire') f = 'e_fire';
      else if (e.mode === 'walk') f = `e_walk${1 + Math.floor(e.walkT / 6) % 3}`;
    } else if (e.kind === 'knife') {
      f = e.mode === 'slash' && e.t - e.slashT < 14 ? (e.t - e.slashT < 7 ? 'e_knife1' : 'e_knife2')
        : `e_walk${1 + Math.floor(e.walkT / 5) % 3}`;
    } else if (e.kind === 'nade') {
      f = e.mode === 'throw' && e.t - e.throwT < 20 ? 'e_nade' : 'e_stand';
    }
    drawSprite(g, f, x - 11, y - 24, flip, white);
  }
}

export function damageEnemy(game, e, dmg, fromDir = 1) {
  if (e.dying) return;
  e.hp -= dmg;
  e.flash = 4;
  if (e.hp <= 0) killEnemy(game, e, fromDir);
}

// =====================================================================
// PROJECTILES
// =====================================================================
export function updatePBullets(game) {
  for (const b of game.pbullets) {
    b.t++;
    if (b.grav) b.vy += 0.14;
    b.x += b.vx; b.y += b.vy;
    if (b.kind === 'rocket' && b.t % 3 === 0) {
      game.puffs.push({ x: b.x - b.vx * 2, y: b.y, t: 0 });
    }
    // terrain
    if (solidAt(b.x, b.y)) {
      b.dead = true;
      if (b.kind === 'rocket' || b.kind === 'shell') explodeAt(game, b.x, b.y, b.kind === 'shell' ? 26 : 20, b.dmg);
      else game.sparks.push({ x: b.x, y: b.y, t: 0 });
      continue;
    }
    // enemies
    for (const e of game.enemies) {
      if (e.dying) continue;
      const eb = e.kind === 'heli'
        ? { x: e.x - 16, y: e.y - 10, w: 32, h: 20 }
        : { x: e.x - 7, y: e.y - 22, w: 14, h: 22 };
      if (b.x > eb.x && b.x < eb.x + eb.w && b.y > eb.y && b.y < eb.y + eb.h) {
        b.dead = true;
        if (b.kind === 'rocket' || b.kind === 'shell') explodeAt(game, b.x, b.y, b.kind === 'shell' ? 26 : 20, b.dmg);
        else { damageEnemy(game, e, b.dmg, Math.sign(b.vx) || 1); game.sparks.push({ x: b.x, y: b.y, t: 0 }); }
        break;
      }
    }
    if (b.dead) continue;
    // boss
    if (game.boss && !game.boss.dead) {
      const bb = game.boss.box;
      if (b.x > bb.x && b.x < bb.x + bb.w && b.y > bb.y && b.y < bb.y + bb.h) {
        b.dead = true;
        game.boss.hit(game, b.dmg);
        if (b.kind === 'rocket' || b.kind === 'shell') explodeAt(game, b.x, b.y, 20, 0);
        else game.sparks.push({ x: b.x, y: b.y, t: 0 });
      }
    }
    if (b.x < game.camX - 20 || b.x > game.camX + 340 || b.y < -20 || b.y > 260) b.dead = true;
  }
  game.pbullets = game.pbullets.filter((b) => !b.dead);
}

export function explodeAt(game, x, y, r, dmg) {
  game.addBoom(x, y, r);
  game.shake(3);
  for (const e of game.enemies) {
    if (e.dying) continue;
    if (Math.abs(e.x - x) < r + 10 && Math.abs((e.y - 12) - y) < r + 10) {
      damageEnemy(game, e, dmg >= 4 ? 8 : 3, Math.sign(e.x - x) || 1);
    }
  }
  if (game.boss && !game.boss.dead) {
    const bb = game.boss.box;
    if (x > bb.x - r && x < bb.x + bb.w + r && y > bb.y - r && y < bb.y + bb.h + r) {
      game.boss.hit(game, dmg);
    }
  }
  const p = game.player;
  if (p.state === 'alive' && Math.abs(p.x - x) < r && Math.abs((p.y - 14) - y) < r) {
    p.kill(game, Math.sign(p.x - x) || 1);
  }
}

export function updatePNades(game) {
  for (const n of game.pnades) {
    n.t++;
    n.vy += 0.18;
    n.x += n.vx; n.y += n.vy;
    const gy = groundBelow(n.x, n.y - 6);
    if (n.y >= gy) {
      if (n.bounced >= 1 || n.t > 70) { n.dead = true; explodeAt(game, n.x, gy - 4, 24, 4); continue; }
      n.y = gy; n.vy *= -0.45; n.vx *= 0.7; n.bounced++;
      game.sound.nadeBounce();
    }
    if (n.t > 90) { n.dead = true; explodeAt(game, n.x, n.y, 24, 4); }
  }
  game.pnades = game.pnades.filter((n) => !n.dead);
}

export function updateEBullets(game) {
  const p = game.player;
  for (const b of game.ebullets) {
    b.t++;
    b.x += b.vx; b.y += b.vy;
    if (solidAt(b.x, b.y)) { b.dead = true; continue; }
    if (p.state === 'alive' && p.inv === 0) {
      const pb = p.riding ? p.riding.box : p.box;
      if (b.x > pb.x && b.x < pb.x + pb.w && b.y > pb.y && b.y < pb.y + pb.h) {
        b.dead = true;
        p.kill(game, Math.sign(b.vx) || 1);
      }
    }
    if (b.x < game.camX - 30 || b.x > game.camX + 350 || b.y > 260 || b.y < -30) b.dead = true;
  }
  game.ebullets = game.ebullets.filter((b) => !b.dead);

  for (const n of game.enades) {
    n.t++;
    if (!n.bomb) n.vy += 0.16; else n.vy += 0.1;
    n.x += n.vx; n.y += n.vy;
    const gy = groundBelow(n.x, n.y - 4);
    if (n.y >= gy || n.t > 110) {
      n.dead = true;
      explodeAt(game, n.x, Math.min(n.y, gy) - 4, 20, 2);
    }
  }
  game.enades = game.enades.filter((n) => !n.dead);
}

// =====================================================================
// POWs & PICKUPS
// =====================================================================
const POW_GIFTS = ['H', 'nade', 'food', 'R', 'coin'];

export function updatePows(game) {
  const p = game.player;
  for (const w of game.pows) {
    if (w.state === 'tied') {
      if (p.state === 'alive' && Math.abs(p.x - w.x) < 16 && Math.abs(p.y - w.y) < 28) {
        w.state = 'salute'; w.t = 0;
        game.sound.powFree();
        game.addScore(1000);
        const gift = POW_GIFTS[w.gift % POW_GIFTS.length];
        game.pickups.push({ type: gift, x: w.x + 10, y: w.y - 20, vy: -2.4, vx: 0.8 });
        game.toast('THANK YOU MOORE!');
      }
    } else if (w.state === 'salute') {
      if (++w.t > 70) { w.state = 'walk'; w.t = 0; }
    } else if (w.state === 'walk') {
      w.t++;
      w.x -= 0.7;
      w.y = groundBelow(w.x, w.y - 6);
      if (w.x < game.camX - 40) w.gone = true;
    }
  }
  game.pows = game.pows.filter((w) => !w.gone);

  for (const k of game.pickups) {
    k.vy += 0.15;
    k.x += k.vx || 0; k.y += k.vy;
    const gy = groundBelow(k.x, k.y - 6);
    if (k.y >= gy) { k.y = gy; k.vy = 0; k.vx = 0; }
    if (p.state === 'alive' && Math.abs(p.x - k.x) < 14 && Math.abs(p.y - k.y) < 22) {
      k.dead = true;
      game.sound.pickup();
      if (k.type === 'H') { p.weapon = 'H'; p.ammo = 200; game.toast('HEAVY MOORE GUN!'); }
      else if (k.type === 'R') { p.weapon = 'R'; p.ammo = 30; game.toast('ROCKET LAUNCHER!'); }
      else if (k.type === 'nade') { p.nades = Math.min(99, p.nades + 10); game.toast('+10 BOMBS'); }
      else { game.addScore(k.type === 'food' ? 5000 : 2000); game.toast(k.type === 'food' ? 'TASTY!' : '2000'); }
    }
  }
  game.pickups = game.pickups.filter((k) => !k.dead);
}

export function drawPows(game, g, cam) {
  for (const w of game.pows) {
    const x = Math.round(w.x - cam.x), y = Math.round(w.y - cam.y);
    let f = 'pow_tied1';
    if (w.state === 'tied') f = (game.frame >> 4) % 2 ? 'pow_tied1' : 'pow_tied2';
    else if (w.state === 'salute') f = 'pow_salute';
    else f = (game.frame >> 3) % 2 ? 'pow_walk1' : 'pow_walk2';
    drawSprite(g, f, x - 10, y - 26, w.state === 'walk');
  }
  for (const k of game.pickups) {
    const x = Math.round(k.x - cam.x), y = Math.round(k.y - cam.y);
    const bob = k.vy === 0 ? Math.sin(game.frame / 10) * 1.5 : 0;
    drawSprite(g, `pk_${k.type}`, x - 7, y - 12 + bob, false);
  }
}

// =====================================================================
// BOSS — the Iron Moore-den
// =====================================================================
export class Boss {
  constructor(x, groundY) {
    this.x = x; // left edge
    this.y = groundY; // feet
    this.hp = 80; this.maxHp = 80;
    this.t = 0;
    this.flash = 0;
    this.dead = false;
    this.dieT = 0;
    this.cannonRecoil = 0;
    this.intro = 60;
  }

  get box() {
    return { x: this.x + 6, y: this.y - BOSS.H + 4, w: BOSS.W - 16, h: BOSS.H - 8 };
  }

  hit(game, dmg) {
    if (this.dead || this.intro > 0) return;
    this.hp -= dmg;
    this.flash = 4;
    game.sound.bossHit();
    if (this.hp <= 0) {
      this.dead = true;
      this.dieT = 0;
      game.onBossDown();
    }
  }

  update(game) {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.cannonRecoil > 0) this.cannonRecoil--;
    if (this.dead) {
      this.dieT++;
      if (this.dieT % 9 === 0 && this.dieT < 110) {
        game.addBoom(this.x + 10 + Math.random() * (BOSS.W - 20), this.y - Math.random() * BOSS.H, 16 + Math.random() * 12);
        game.shake(5);
      }
      return;
    }
    if (this.intro > 0) { this.intro--; return; }
    const p = game.player;
    const phase = this.hp < this.maxHp / 2 ? 2 : 1;
    const cyc = this.t % (phase === 2 ? 190 : 250);

    // mortar volley
    if (cyc === 40 || cyc === 60 || cyc === 80 || (phase === 2 && cyc === 100)) {
      if (p.state === 'alive') {
        this.cannonRecoil = 12;
        const tx = p.x + (Math.random() - 0.5) * 50;
        const d = this.x - tx;
        game.enades.push({
          x: this.x + 8, y: this.y - 54,
          vx: -Math.max(1.2, Math.min(3.4, d / 55)), vy: -4.6, t: 0,
        });
        game.sound.cannon();
        game.shake(3);
      }
    }
    // cockpit MG spray
    if (cyc > 130 && cyc < 170 && cyc % 8 === 0 && p.state === 'alive') {
      const a = Math.atan2((p.y - 16) - (this.y - BOSS.H + 10), p.x - (this.x + 80));
      game.ebullets.push({
        x: this.x + 80, y: this.y - BOSS.H + 10,
        vx: Math.cos(a) * 2.0, vy: Math.sin(a) * 2.0, t: 0,
      });
      game.sound.pistol();
    }
    // reinforcements
    if (cyc === 200 && game.enemies.length < 4) {
      spawnEnemy(game, 'knife', Math.floor((this.x - 40) / TILE));
      spawnEnemy(game, 'rifle', Math.floor((this.x + 40) / TILE));
    }
  }

  draw(g, cam, game) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    if (this.dead && this.dieT > 120) return;
    const white = this.flash > 0;
    const treadF = BOSS.tread[(this.t >> 3) % 2];
    g.drawImage(treadF, x, y - 24);
    g.drawImage(white ? BOSS.bodyW : BOSS.body, x, y - BOSS.H + 2);
    const rec = this.cannonRecoil > 6 ? 4 : this.cannonRecoil > 0 ? 2 : 0;
    g.drawImage(BOSS.cannon, x - 34 + rec, y - 62);
    // smoke when hurt
    if (!this.dead && this.hp < this.maxHp * 0.4 && game.frame % 5 === 0) {
      game.puffs.push({ x: this.x + 90 + Math.random() * 12, y: this.y - BOSS.H, t: 0 });
    }
  }
}
