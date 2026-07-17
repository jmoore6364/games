// Player, enemies, bosses, projectiles, drops.
// Coordinates are play-area pixels (0..255 x, 0..175 y); the HUD offset
// is applied by the renderer.

import { drawSprite, SPR } from './sprites.js';
import { TILE } from './world.js';

export const PLAY_W = 256, PLAY_H = 176;

export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// True if a 12x12 walker hitbox at (x+2, y+3) collides with solids.
export function blocked(game, x, y, opts = {}) {
  const bx = x + 2, by = y + 3, bw = 12, bh = 12;
  if (bx < 0 || by < 0 || bx + bw > PLAY_W || by + bh > PLAY_H) return true;
  for (const [px, py] of [
    [bx, by], [bx + bw - 1, by], [bx, by + bh - 1], [bx + bw - 1, by + bh - 1],
    [bx + bw / 2, by], [bx + bw / 2, by + bh - 1], [bx, by + bh / 2], [bx + bw - 1, by + bh / 2],
  ]) {
    if (game.solidAt(px, py, opts)) return true;
  }
  return false;
}

const DIR_VEC = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

// ============================ PLAYER ============================

export class Player {
  constructor() {
    this.x = 120; this.y = 80;
    this.dir = 'down';
    this.attackT = 0;
    this.liftT = 0;
    this.liftItem = null;
    this.invulnT = 0;
    this.knockT = 0;
    this.kdx = 0; this.kdy = 0;
    this.anim = 0;
  }

  standAt(tx, ty) { this.x = tx * TILE; this.y = ty * TILE; }

  rect() { return { x: this.x + 2, y: this.y + 3, w: 12, h: 12 }; }

  facing() { return DIR_VEC[this.dir]; }

  // The active sword hitbox, or null.
  swordRect() {
    if (this.attackT <= 2 || this.attackT > 11) return null;
    const r = 13;
    switch (this.dir) {
      case 'up': return { x: this.x + 5, y: this.y - r + 2, w: 6, h: r };
      case 'down': return { x: this.x + 5, y: this.y + 14, w: 6, h: r };
      case 'left': return { x: this.x - r + 2, y: this.y + 6, w: r, h: 6 };
      default: return { x: this.x + 14, y: this.y + 6, w: r, h: 6 };
    }
  }

  update(game) {
    const input = game.input;
    if (this.invulnT > 0) this.invulnT--;
    if (this.liftT > 0) { this.liftT--; return; }

    if (this.knockT > 0) {
      this.knockT--;
      this.tryMove(game, this.kdx * 3.4, 0);
      this.tryMove(game, 0, this.kdy * 3.4);
      return;
    }

    if (this.attackT > 0) {
      this.attackT--;
      return;
    }

    // sword
    if (input.pressed('a') && game.save.items.sword) {
      this.attackT = 13;
      game.sound.sword();
      game.playerSwing();
      return;
    }
    // B item
    if (input.pressed('b')) game.useBItem();

    // movement
    let dx = 0, dy = 0;
    if (input.down('left')) dx = -1;
    else if (input.down('right')) dx = 1;
    if (input.down('up')) dy = -1;
    else if (input.down('down')) dy = 1;
    if (dx && dy) {
      // 4-directional like the classics: keep the newer axis
      if (this.dir === 'left' || this.dir === 'right') dx = 0; else dy = 0;
    }
    if (dx) this.dir = dx < 0 ? 'left' : 'right';
    else if (dy) this.dir = dy < 0 ? 'up' : 'down';

    if (dx || dy) {
      this.anim++;
      const sp = 1.3;
      this.tryMove(game, dx * sp, dy * sp);
    }
  }

  // Axis move with corner-cutting assist.
  tryMove(game, dx, dy) {
    if (dx) {
      if (!blocked(game, this.x + dx, this.y)) this.x += dx;
      else {
        // nudge vertically toward the nearest open corner
        for (const off of [-1, 1]) {
          if (!blocked(game, this.x + dx, this.y + off * Math.abs(dx))) {
            this.y += off * Math.abs(dx);
            break;
          }
        }
      }
    }
    if (dy) {
      if (!blocked(game, this.x, this.y + dy)) this.y += dy;
      else {
        for (const off of [-1, 1]) {
          if (!blocked(game, this.x + off * Math.abs(dy), this.y + dy)) {
            this.x += off * Math.abs(dy);
            break;
          }
        }
      }
    }
    this.x = Math.max(0, Math.min(PLAY_W - 16, this.x));
    this.y = Math.max(0, Math.min(PLAY_H - 16, this.y));
  }

  hurt(game, dmg, sx, sy) {
    if (this.invulnT > 0 || game.save.hp <= 0) return;
    game.save.hp = Math.max(0, game.save.hp - dmg);
    this.invulnT = 60;
    this.knockT = 8;
    const ang = Math.atan2(this.y - sy, this.x - sx);
    this.kdx = Math.abs(Math.cos(ang)) > 0.5 ? Math.sign(Math.cos(ang)) : 0;
    this.kdy = Math.abs(Math.sin(ang)) > 0.5 ? Math.sign(Math.sin(ang)) : 0;
    game.sound.hurt();
  }

  draw(ctx, game) {
    if (this.invulnT > 0 && (game.frame & 2)) return;
    if (this.liftT > 0) {
      drawSprite(ctx, 'm_lift', this.x, this.y);
      if (this.liftItem) {
        const c = SPR[this.liftItem];
        if (c) ctx.drawImage(c, Math.round(this.x + 8 - c.width / 2), Math.round(this.y - c.height + 2));
      }
      return;
    }
    const white = game.save.items.sword === 2;
    if (this.attackT > 0) {
      // sword thrust
      const swName = (this.dir === 'up' || this.dir === 'down')
        ? (white ? 'wsword_up' : 'sword_up') : (white ? 'wsword_side' : 'sword_side');
      const ext = this.attackT > 2 && this.attackT <= 11;
      if (ext) {
        if (this.dir === 'up') drawSprite(ctx, swName, this.x, this.y - 12);
        else if (this.dir === 'down') drawSprite(ctx, swName, this.x, this.y + 12, false, true);
        else if (this.dir === 'right') drawSprite(ctx, swName, this.x + 10, this.y);
        else drawSprite(ctx, swName, this.x - 10, this.y, true);
      }
      const pose = this.dir === 'up' ? 'm_up1' : this.dir === 'down' ? 'm_down1' : 'm_side1';
      drawSprite(ctx, pose, this.x, this.y, this.dir === 'left');
      return;
    }
    const f = (this.anim >> 3) & 1;
    const name = this.dir === 'up' ? `m_up${f + 1}` : this.dir === 'down' ? `m_down${f + 1}` : `m_side${f + 1}`;
    drawSprite(ctx, name, this.x, this.y, this.dir === 'left');
  }
}

// ============================ ENEMIES ============================

export const CONTACT_DMG = {
  spitter: 1, hopper: 1, burrower: 1, grunt: 1, lurker: 1, ghost: 1,
  bat: 1, gel: 1, zol: 1, stalfos: 1, knight: 2, hexer: 1, trap: 2,
  thornmaw: 2, gravemaw: 2, hexlord: 2, vexmoor: 3,
};

const HP = {
  spitter: 1, hopper: 2, burrower: 2, grunt: 2, lurker: 2, ghost: 3,
  bat: 1, gel: 1, zol: 2, stalfos: 2, knight: 4, hexer: 3, trap: Infinity,
  thornmaw: 10, gravemaw: 12, hexlord: 10, vexmoor: 16,
};

const rnd = (n) => (Math.random() * n) | 0;
const DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];

export function spawnEnemy(game, type, tx, ty) {
  const e = {
    type, x: tx * TILE, y: ty * TILE,
    hp: HP[type], t: rnd(60), state: 0,
    dx: 0, dy: 0, stun: 0, hurtT: 0, anim: rnd(9),
    home: { x: tx * TILE, y: ty * TILE },
  };
  const d = DIRS4[rnd(4)];
  e.dx = d[0]; e.dy = d[1];
  if (type === 'burrower' || type === 'lurker') { e.state = 'buried'; e.t = 40 + rnd(80); }
  if (type === 'trap') e.state = 'idle';
  return e;
}

function pickDir(game, e, chase = 0.4) {
  const p = game.player;
  if (Math.random() < chase) {
    if (Math.abs(p.x - e.x) > Math.abs(p.y - e.y)) { e.dx = Math.sign(p.x - e.x); e.dy = 0; }
    else { e.dx = 0; e.dy = Math.sign(p.y - e.y) || 1; }
  } else {
    const d = DIRS4[rnd(4)];
    e.dx = d[0]; e.dy = d[1];
  }
}

function walk(game, e, speed, opts = {}) {
  const nx = e.x + e.dx * speed, ny = e.y + e.dy * speed;
  if (!blocked(game, nx, ny, opts)) { e.x = nx; e.y = ny; return true; }
  return false;
}

function shootAtPlayer(game, e, kind, speed) {
  const p = game.player;
  const ang = Math.atan2((p.y - e.y), (p.x - e.x));
  game.eprojs.push({ x: e.x + 4, y: e.y + 4, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, kind, t: 0 });
}

function shootDir(game, e, kind, speed) {
  game.eprojs.push({ x: e.x + 4, y: e.y + 4, vx: e.dx * speed, vy: e.dy * speed, kind, t: 0 });
}

export function updateEnemy(game, e) {
  e.anim++;
  if (e.hurtT > 0) e.hurtT--;
  if (e.stun > 0) { e.stun--; return; }
  e.t--;

  switch (e.type) {
    case 'spitter':
    case 'stalfos': {
      const sp = e.type === 'spitter' ? 0.55 : 0.7;
      if (!walk(game, e, sp)) pickDir(game, e);
      if (e.t <= 0) {
        pickDir(game, e, 0.5);
        e.t = 50 + rnd(70);
        if (e.type === 'spitter' && Math.random() < 0.6) shootDir(game, e, 'rock', 2.2);
      }
      break;
    }
    case 'grunt': {
      if (!walk(game, e, 0.5)) pickDir(game, e);
      if (e.t <= 0) {
        pickDir(game, e, 0.6);
        e.t = 70 + rnd(60);
        if (Math.random() < 0.55) shootDir(game, e, 'spear', 2.4);
      }
      break;
    }
    case 'knight': {
      if (!walk(game, e, 0.6)) pickDir(game, e, 0.7);
      if (e.t <= 0) { pickDir(game, e, 0.7); e.t = 40 + rnd(50); }
      break;
    }
    case 'hopper': {
      if (e.state === 0) { // resting
        if (e.t <= 0) {
          e.state = 1; e.t = 26;
          const p = game.player;
          e.dx = Math.sign(p.x - e.x + (Math.random() * 60 - 30)) || 1;
          e.dy = Math.random() < 0.5 ? -1 : 1;
        }
      } else { // hopping
        const k = e.t / 26;
        walk(game, e, 1.6 * Math.max(0.3, k));
        if (e.t <= 0) { e.state = 0; e.t = 40 + rnd(70); }
      }
      break;
    }
    case 'burrower': {
      if (e.state === 'buried') {
        // creep toward the player underground
        const p = game.player;
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        const nx = e.x + Math.cos(ang) * 0.45, ny = e.y + Math.sin(ang) * 0.45;
        if (!blocked(game, nx, ny)) { e.x = nx; e.y = ny; }
        if (e.t <= 0) { e.state = 'up'; e.t = 80; }
      } else if (e.t <= 0) { e.state = 'buried'; e.t = 90 + rnd(80); }
      break;
    }
    case 'lurker': {
      if (e.state === 'buried') {
        if (e.t <= 0) {
          const spot = game.randomWaterTile();
          if (spot) { e.x = spot[0] * TILE; e.y = spot[1] * TILE; e.state = 'up'; e.t = 85; }
          else e.t = 60;
        }
      } else {
        if (e.t === 45) shootAtPlayer(game, e, 'fire', 1.7);
        if (e.t <= 0) { e.state = 'buried'; e.t = 60 + rnd(90); }
      }
      break;
    }
    case 'ghost': {
      const p = game.player;
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += Math.cos(ang) * 0.45;
      e.y += Math.sin(ang) * 0.45;
      e.x = Math.max(0, Math.min(PLAY_W - 16, e.x));
      e.y = Math.max(0, Math.min(PLAY_H - 16, e.y));
      break;
    }
    case 'bat': {
      if (e.t <= 0) {
        e.t = 40 + rnd(60);
        const ang = Math.random() * Math.PI * 2;
        e.dx = Math.cos(ang); e.dy = Math.sin(ang);
      }
      const k = Math.sin((e.t / 40) * Math.PI);
      e.x += e.dx * 1.4 * k;
      e.y += e.dy * 1.4 * k;
      e.x = Math.max(0, Math.min(PLAY_W - 16, e.x));
      e.y = Math.max(0, Math.min(PLAY_H - 16, e.y));
      break;
    }
    case 'gel': {
      if (e.state === 0) {
        if (e.t <= 0) { e.state = 1; e.t = 14; pickDir(game, e, 0.5); }
      } else {
        walk(game, e, 1.1);
        if (e.t <= 0) { e.state = 0; e.t = 30 + rnd(40); }
      }
      break;
    }
    case 'zol': {
      if (e.state === 0) {
        if (e.t <= 0) { e.state = 1; e.t = 20; pickDir(game, e, 0.5); }
      } else {
        walk(game, e, 0.7);
        if (e.t <= 0) { e.state = 0; e.t = 45 + rnd(50); }
      }
      break;
    }
    case 'hexer': {
      if (e.t <= 0) {
        const spot = game.randomFloorTile();
        if (spot) { e.x = spot[0] * TILE; e.y = spot[1] * TILE; }
        e.t = 110 + rnd(50);
        shootAtPlayer(game, e, 'bolt', 2.0);
      }
      break;
    }
    case 'trap': {
      const p = game.player;
      if (e.state === 'idle') {
        if (Math.abs(p.x - e.x) < 10 && Math.abs(p.y - e.y) < 90) {
          e.state = 'lunge'; e.ldx = 0; e.ldy = Math.sign(p.y - e.y);
        } else if (Math.abs(p.y - e.y) < 10 && Math.abs(p.x - e.x) < 120) {
          e.state = 'lunge'; e.ldx = Math.sign(p.x - e.x); e.ldy = 0;
        }
      } else if (e.state === 'lunge') {
        const nx = e.x + e.ldx * 3, ny = e.y + e.ldy * 3;
        if (blocked(game, nx, ny)) e.state = 'return';
        else { e.x = nx; e.y = ny; }
      } else {
        const ang = Math.atan2(e.home.y - e.y, e.home.x - e.x);
        e.x += Math.cos(ang) * 0.8;
        e.y += Math.sin(ang) * 0.8;
        if (Math.abs(e.x - e.home.x) < 1.2 && Math.abs(e.y - e.home.y) < 1.2) {
          e.x = e.home.x; e.y = e.home.y; e.state = 'idle';
        }
      }
      break;
    }
    // ---- bosses ----
    case 'thornmaw': {
      if (!e.dx) e.dx = 1;
      e.x += e.dx * 0.5;
      if (e.x < 32 || e.x > PLAY_W - 64) e.dx *= -1;
      if (e.t <= 0) {
        e.t = 95;
        const p = game.player;
        const base = Math.atan2(p.y - (e.y + 16), p.x - (e.x + 16));
        for (const off of [-0.35, 0, 0.35]) {
          game.eprojs.push({
            x: e.x + 12, y: e.y + 16,
            vx: Math.cos(base + off) * 1.8, vy: Math.sin(base + off) * 1.8,
            kind: 'fire', t: 0,
          });
        }
        game.sound.bossRoar();
      }
      break;
    }
    case 'gravemaw': {
      if (!walk(game, e, 0.5, { big: true })) pickDir(game, e, 0.6);
      if (e.t <= 0) { pickDir(game, e, 0.6); e.t = 60 + rnd(60); }
      break;
    }
    case 'hexlord': {
      if (e.t <= 0) {
        const spot = game.randomFloorTile(true);
        if (spot) { e.x = spot[0] * TILE; e.y = spot[1] * TILE; }
        e.t = 120;
        const p = game.player;
        const base = Math.atan2(p.y - (e.y + 16), p.x - (e.x + 16));
        for (const off of [-0.3, 0, 0.3]) {
          game.eprojs.push({
            x: e.x + 12, y: e.y + 14,
            vx: Math.cos(base + off) * 2.1, vy: Math.sin(base + off) * 2.1,
            kind: 'bolt', t: 0,
          });
        }
      }
      break;
    }
    case 'vexmoor': {
      const enraged = e.hp <= 8;
      if (e.t <= 0) {
        const spot = game.randomFloorTile(true);
        if (spot) { e.x = spot[0] * TILE; e.y = spot[1] * TILE; }
        e.t = enraged ? 80 : 115;
        const p = game.player;
        const base = Math.atan2(p.y - (e.y + 16), p.x - (e.x + 16));
        const offs = enraged ? [-0.55, -0.18, 0.18, 0.55] : [-0.3, 0, 0.3];
        for (const off of offs) {
          game.eprojs.push({
            x: e.x + 12, y: e.y + 14,
            vx: Math.cos(base + off) * 2.2, vy: Math.sin(base + off) * 2.2,
            kind: 'bolt', t: 0,
          });
        }
        game.sound.bossRoar();
      }
      break;
    }
  }
}

export function enemyRect(e) {
  if (e.type === 'thornmaw' || e.type === 'gravemaw' || e.type === 'hexlord' || e.type === 'vexmoor') {
    return { x: e.x + 3, y: e.y + 3, w: 26, h: 26 };
  }
  return { x: e.x + 3, y: e.y + 3, w: 10, h: 10 };
}

// Whether the enemy can currently be hit / deal contact damage.
export function enemyActive(e) {
  if (e.type === 'burrower' || e.type === 'lurker') return e.state !== 'buried';
  return true;
}

// dmg: sword level or other damage. kind: 'sword' | 'beam' | 'boomerang' | 'bomb' | 'flame'
export function damageEnemy(game, e, dmg, kind, sx, sy) {
  if (!enemyActive(e) || e.hurtT > 0) return false;
  if (e.type === 'trap') { game.sound.clink(); e.hurtT = 12; return false; }
  if (e.type === 'gravemaw' && kind !== 'bomb') { game.sound.clink(); e.hurtT = 12; return false; }
  if (kind === 'boomerang') {
    if (e.type === 'bat' || e.type === 'gel') { killEnemy(game, e); return true; }
    e.stun = 90; game.sound.enemyHit(); e.hurtT = 10;
    return false;
  }
  e.hp -= dmg;
  e.hurtT = 16;
  if (e.hp <= 0) { killEnemy(game, e); return true; }
  game.sound.enemyHit();
  // small knockback away from source
  if (sx !== undefined && e.type !== 'trap') {
    const ang = Math.atan2(e.y - sy, e.x - sx);
    const nx = e.x + Math.cos(ang) * 8, ny = e.y + Math.sin(ang) * 8;
    if (!blocked(game, nx, ny)) { e.x = nx; e.y = ny; }
  }
  return false;
}

export function killEnemy(game, e) {
  e.dead = true;
  game.fx.push({ kind: 'poof', x: e.x, y: e.y, t: 0 });
  const boss = ['thornmaw', 'gravemaw', 'hexlord', 'vexmoor'].includes(e.type);
  if (boss) game.onBossDeath(e);
  else {
    game.sound.enemyDie();
    if (e.type === 'zol') {
      for (const off of [-6, 6]) {
        const g = spawnEnemy(game, 'gel', 0, 0);
        g.x = Math.max(0, Math.min(PLAY_W - 16, e.x + off));
        g.y = e.y;
        game.enemies.push(g);
      }
    } else {
      maybeDrop(game, e.x, e.y);
    }
  }
}

function maybeDrop(game, x, y) {
  const r = Math.random();
  let kind = null;
  if (r < 0.22) kind = 'heart';
  else if (r < 0.42) kind = 'gem1';
  else if (r < 0.5) kind = 'gem5';
  else if (r < 0.58) kind = 'bomb';
  else if (r < 0.595) kind = 'fairy';
  if (kind) game.drops.push({ kind, x, y, t: 0 });
}

const EN_SPRITES = {
  spitter: ['en_spitter1', 'en_spitter2'],
  hopper: ['en_hopper1', 'en_hopper2'],
  burrower: ['en_burrower1', 'en_burrower2'],
  grunt: ['en_grunt1', 'en_grunt2'],
  lurker: ['en_lurker1', 'en_lurker2'],
  ghost: ['en_ghost1', 'en_ghost2'],
  bat: ['en_bat1', 'en_bat2'],
  gel: ['en_gel1', 'en_gel2'],
  zol: ['en_zol1', 'en_zol2'],
  stalfos: ['en_stalfos1', 'en_stalfos2'],
  knight: ['en_knight1', 'en_knight2'],
  hexer: ['en_hexer1', 'en_hexer2'],
};

export function drawEnemy(ctx, game, e) {
  if (e.hurtT > 0 && (game.frame & 2)) return;
  switch (e.type) {
    case 'trap':
      drawSprite(ctx, 'en_trap', e.x, e.y);
      return;
    case 'burrower': {
      if (e.state === 'buried') return;
      const name = e.t > 60 ? 'en_burrower1' : 'en_burrower2';
      drawSprite(ctx, name, e.x, e.y);
      return;
    }
    case 'lurker': {
      if (e.state === 'buried') return;
      const name = e.t > 70 || e.t < 15 ? 'en_lurker1' : 'en_lurker2';
      drawSprite(ctx, name, e.x, e.y);
      return;
    }
    case 'hopper': {
      drawSprite(ctx, e.state === 1 ? 'en_hopper2' : 'en_hopper1', e.x, e.y);
      return;
    }
    case 'thornmaw': drawSprite(ctx, 'bo_thornmaw', e.x, e.y + (((e.anim >> 4) & 1) ? 1 : 0)); return;
    case 'gravemaw': drawSprite(ctx, 'bo_gravemaw', e.x, e.y + (((e.anim >> 4) & 1) ? 1 : 0)); return;
    case 'hexlord': drawSprite(ctx, 'bo_hexlord', e.x, e.y + (((e.anim >> 4) & 1) ? 1 : 0)); return;
    case 'vexmoor': drawSprite(ctx, 'bo_vexmoor', e.x, e.y + (((e.anim >> 4) & 1) ? 1 : 0)); return;
    default: {
      const pair = EN_SPRITES[e.type];
      if (!pair) return;
      const f = (e.anim >> 4) & 1;
      const flip = e.dx < 0 && (e.type === 'grunt' || e.type === 'knight');
      drawSprite(ctx, pair[f], e.x, e.y, flip);
      if (e.stun > 0 && (game.frame & 4)) drawSprite(ctx, 'fx_sparkle', e.x + 4, e.y - 4);
    }
  }
}

// ============================ PROJECTILES ============================

// Player projectiles: sword beams + boomerang.
export function updateProjs(game) {
  const p = game.player;
  for (const pr of game.projs) {
    if (pr.kind === 'beam') {
      pr.x += pr.vx; pr.y += pr.vy;
      pr.t++;
      if (pr.x < -16 || pr.x > PLAY_W || pr.y < -16 || pr.y > PLAY_H) pr.dead = true;
      else if (game.solidAt(pr.x + 8, pr.y + 8, { projectile: true })) pr.dead = true;
      const rect = { x: pr.x + 4, y: pr.y + 4, w: 8, h: 8 };
      for (const e of game.enemies) {
        if (e.dead || !enemyActive(e)) continue;
        if (overlap(rect, enemyRect(e))) {
          damageEnemy(game, e, 1, 'beam', pr.x, pr.y);
          pr.dead = true;
          break;
        }
      }
    } else if (pr.kind === 'boomerang') {
      pr.t++;
      if ((pr.t & 3) === 0) game.sound.boomerang();
      if (pr.state === 'out') {
        const k = Math.max(0, 1 - pr.t / 26);
        pr.x += pr.vx * (0.6 + k * 2.4);
        pr.y += pr.vy * (0.6 + k * 2.4);
        if (pr.t >= 26 || pr.x < 0 || pr.x > PLAY_W - 8 || pr.y < 0 || pr.y > PLAY_H - 8) pr.state = 'back';
      } else {
        const cx = p.x + 4, cy = p.y + 4;
        const ang = Math.atan2(cy - pr.y, cx - pr.x);
        pr.x += Math.cos(ang) * 3.2;
        pr.y += Math.sin(ang) * 3.2;
        if (Math.abs(pr.x - cx) < 8 && Math.abs(pr.y - cy) < 8) { pr.dead = true; game.boomerangOut = false; }
      }
      const rect = { x: pr.x, y: pr.y, w: 8, h: 8 };
      for (const e of game.enemies) {
        if (e.dead || !enemyActive(e) || e.stun > 0) continue;
        if (overlap(rect, enemyRect(e))) {
          damageEnemy(game, e, 0, 'boomerang', pr.x, pr.y);
          if (pr.state === 'out') pr.state = 'back';
        }
      }
      // scoop up drops
      for (const d of game.drops) {
        if (!d.dead && overlap(rect, { x: d.x + 2, y: d.y + 2, w: 10, h: 10 })) game.takeDrop(d);
      }
    }
  }
  game.projs = game.projs.filter((pr) => !pr.dead);
}

export function drawProjs(ctx, game) {
  for (const pr of game.projs) {
    if (pr.kind === 'beam') {
      const vert = pr.vy !== 0;
      const name = (game.frame & 2) ? (vert ? 'beam_up' : 'beam_side') : (vert ? 'sword_up' : 'sword_side');
      drawSprite(ctx, name, pr.x, pr.y, pr.vx < 0, pr.vy > 0);
    } else if (pr.kind === 'boomerang') {
      const r = (pr.t >> 2) & 3;
      drawSprite(ctx, 'it_boomer', pr.x, pr.y, r === 1 || r === 2, r >= 2);
    }
  }
}

// Enemy projectiles.
export function updateEprojs(game) {
  const p = game.player;
  for (const pr of game.eprojs) {
    pr.x += pr.vx; pr.y += pr.vy;
    pr.t++;
    if (pr.x < -16 || pr.x > PLAY_W + 8 || pr.y < -16 || pr.y > PLAY_H + 8) pr.dead = true;
    if (!pr.dead && overlap({ x: pr.x, y: pr.y, w: 8, h: 8 }, p.rect())) {
      const dmg = pr.kind === 'bolt' ? 2 : 1;
      p.hurt(game, dmg, pr.x, pr.y);
      pr.dead = true;
    }
  }
  game.eprojs = game.eprojs.filter((pr) => !pr.dead);
}

export function drawEprojs(ctx, game) {
  for (const pr of game.eprojs) {
    switch (pr.kind) {
      case 'rock': drawSprite(ctx, 'pr_rock', pr.x, pr.y); break;
      case 'spear':
        if (Math.abs(pr.vx) > Math.abs(pr.vy)) drawSprite(ctx, 'pr_spear_h', pr.x, pr.y, pr.vx < 0);
        else drawSprite(ctx, 'pr_spear_v', pr.x, pr.y, false, pr.vy > 0);
        break;
      case 'fire': drawSprite(ctx, (pr.t & 8) ? 'pr_fire1' : 'pr_fire2', pr.x, pr.y); break;
      case 'bolt': drawSprite(ctx, (pr.t & 4) ? 'pr_bolt1' : 'pr_bolt2', pr.x, pr.y); break;
    }
  }
}

// ============================ DROPS ============================

export function updateDrops(game) {
  const p = game.player;
  for (const d of game.drops) {
    d.t++;
    if (d.kind === 'fairy') {
      d.x += Math.sin(d.t / 14) * 0.9;
      d.y += Math.cos(d.t / 19) * 0.7;
      d.x = Math.max(0, Math.min(PLAY_W - 8, d.x));
      d.y = Math.max(0, Math.min(PLAY_H - 8, d.y));
    }
    if (d.t > 320) d.dead = true;
    if (!d.dead && overlap({ x: d.x, y: d.y, w: 8, h: 10 }, p.rect())) game.takeDrop(d);
  }
  game.drops = game.drops.filter((d) => !d.dead);
}

export function drawDrops(ctx, game) {
  for (const d of game.drops) {
    if (d.t > 240 && (game.frame & 4)) continue; // about to vanish
    const name = { heart: 'it_heart', gem1: 'it_gem', gem5: 'it_gem5', bomb: 'it_bomb', fairy: 'it_fairy' }[d.kind];
    drawSprite(ctx, name, d.x, d.y);
  }
}
