// Player, enemies, bosses, projectiles. All coordinates in pixels.

import { TILE } from './world.js';
import { drawSprite, drawSpriteScaled, SPR } from './sprites.js';

export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const GRAV = 0.22, TERM = 5;

// Axis-separated tile collision against game.solid(px, py).
export function moveRect(game, e, dx, dy) {
  e.hitWall = false; e.hitHead = false;
  const wasGround = e.onGround;
  e.onGround = false;

  // horizontal
  let nx = e.x + dx;
  if (dx !== 0) {
    const edge = dx > 0 ? nx + e.w : nx;
    const ys = [e.y + 1, e.y + e.h / 2, e.y + e.h - 1];
    if (ys.some((y) => game.solid(edge, y))) {
      const tx = Math.floor(edge / TILE);
      nx = dx > 0 ? tx * TILE - e.w - 0.01 : (tx + 1) * TILE + 0.01;
      e.hitWall = true;
    }
  }
  e.x = nx;

  // vertical
  let ny = e.y + dy;
  if (dy !== 0) {
    const edge = dy > 0 ? ny + e.h : ny;
    const xs = [e.x + 1, e.x + e.w / 2, e.x + e.w - 1];
    if (xs.some((x) => game.solid(x, edge))) {
      const ty = Math.floor(edge / TILE);
      if (dy > 0) { ny = ty * TILE - e.h - 0.01; e.onGround = true; }
      else { ny = (ty + 1) * TILE + 0.01; e.hitHead = true; }
    }
  }
  e.y = ny;
  e.justLanded = e.onGround && !wasGround;
}

// ============================ PLAYER ============================

export class Player {
  constructor() {
    this.x = 0; this.y = 0;
    this.w = 10; this.h = 28;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.ball = false;
    this.onGround = false;
    this.inv = 0;
    this.cool = 0;
    this.anim = 0;
    this.spinning = false;
    this.aimUp = false;
    this.state = 'normal'; // normal | dead
    this.deadT = 0;
  }

  get rect() { return this; }

  standHere(tx, ty) {
    this.x = tx * TILE + 3;
    this.y = ty * TILE - this.h - 0.1;
    this.vx = 0; this.vy = 0;
    this.ball = false; this.h = 28;
  }

  update(game, input) {
    const s = game.save;
    if (this.state === 'dead') { this.deadT++; return; }

    // --- morph / unmorph ---
    if (!this.ball && s.items.morph && input.pressed('down') && this.onGround) {
      this.ball = true; this.h = 12; this.y += 16;
      game.sound.morph();
    } else if (this.ball && (input.pressed('up') || input.pressed('jump'))) {
      // need 2 tiles of headroom
      const top = this.y + this.h - 28;
      const clear = ![top + 1, top + 8].some((y) =>
        [this.x + 1, this.x + this.w - 1].some((x) => game.solid(x, y)));
      if (clear) {
        this.ball = false; this.y += this.h - 28; this.h = 28;
        game.sound.unmorph();
        if (input.pressed('jump')) this.vy = s.items.hijump ? -6.6 : -5.8;
      }
    }

    // --- horizontal ---
    const spd = 1.4;
    let mx = 0;
    if (input.down('left')) { mx = -spd; this.face = -1; }
    if (input.down('right')) { mx = spd; this.face = 1; }
    this.vx = mx;

    // --- jump ---
    if (!this.ball && input.pressed('jump') && this.onGround) {
      this.vy = s.items.hijump ? -6.6 : -5.8;
      this.spinning = Math.abs(mx) > 0.1;
      if (this.spinning && s.items.screw) game.sound.screw();
      else game.sound.jump();
    }
    if (!input.down('jump') && this.vy < -1.5) this.vy = -1.5;

    // --- gravity & move ---
    this.vy = Math.min(TERM, this.vy + GRAV);
    moveRect(game, this, this.vx, this.vy);
    if (this.vy > 0.5) { /* falling */ }
    if (this.onGround) { this.spinning = false; if (this.justLanded) game.sound.land(); }
    if (this.hitHead) this.vy = 0;

    this.aimUp = !this.ball && input.down('up');

    // --- fire ---
    if (this.cool > 0) this.cool--;
    if (input.down('fire') && this.cool <= 0) {
      if (this.ball) {
        if (s.items.bombs && game.projs.filter((p) => p.kind === 'bomb').length < 2 && input.pressed('fire')) {
          game.projs.push({ kind: 'bomb', x: this.x + this.w / 2 - 3, y: this.y + this.h / 2 - 3, w: 6, h: 6, fuse: 45 });
          game.sound.bombLay();
          this.cool = 10;
        }
      } else if (input.pressed('fire') || !game.missileMode) {
        this.shoot(game);
      }
    }

    // --- tile hazards ---
    this.tileHazards(game);

    this.anim += Math.abs(this.vx) > 0.1 ? 1 : 0;
    if (this.inv > 0) this.inv--;
  }

  shoot(game) {
    const s = game.save;
    const missile = game.missileMode && s.missiles > 0;
    if (game.missileMode && s.missiles <= 0) { game.sound.deny(); this.cool = 14; return; }
    if (!missile && game.projs.filter((p) => p.kind === 'beam').length >= 3) return;

    let px, py, vx = 0, vy = 0;
    if (this.aimUp) {
      px = this.x + this.w / 2 - 2;
      py = this.y - 4;
      vy = -5;
    } else {
      px = this.face === 1 ? this.x + this.w : this.x - 4;
      py = this.y + 7;
      vx = 5 * this.face;
    }
    if (missile) {
      s.missiles--;
      game.projs.push({ kind: 'missile', x: px, y: py, w: 5, h: 5, vx: vx * 0.6, vy: vy * 0.6, life: 90, dmg: 10 });
      game.sound.missile();
      this.cool = 14;
    } else {
      const wave = !!s.items.wave && s.beam === 'wave';
      const ice = !!s.items.ice && !wave;
      const life = wave ? 50 : s.items.long ? 70 : 13;
      game.projs.push({ kind: 'beam', ice, wave, x: px, y: py, w: 4, h: 4, vx, vy, life, dmg: wave ? 2 : 1 });
      if (wave) game.sound.shootWave();
      else if (ice) game.sound.shootIce();
      else game.sound.shoot();
      this.cool = 8;
    }
  }

  tileHazards(game) {
    // sample a few points inside the body
    const pts = [
      [this.x + 2, this.y + this.h - 2], [this.x + this.w - 2, this.y + this.h - 2],
      [this.x + this.w / 2, this.y + this.h / 2],
    ];
    for (const [x, y] of pts) {
      const ch = game.tileAtPx(x, y);
      if (ch === '^') { game.hurtPlayer(20, x, true); return; }
      if (ch === '~') { game.lavaHurt(); return; }
    }
  }

  draw(ctx, game, camX, camY) {
    if (this.state === 'dead') return;
    if (this.inv > 0 && (game.frame & 3) < 2) return;
    const pre = game.save.items.varia ? 'v_' : 'p_';
    const x = this.x - 3 - camX;
    let name, y;
    if (this.ball) {
      name = pre + (Math.floor(this.x / 8) % 2 ? 'ball1' : 'ball2');
      y = this.y - 0 - camY;
    } else if (!this.onGround && this.spinning) {
      name = pre + (Math.floor(game.frame / 4) % 2 ? 'spin1' : 'spin2');
      y = this.y + 6 - camY;
      if (game.save.items.screw) {
        ctx.strokeStyle = `rgba(160,240,255,${0.35 + 0.25 * ((game.frame >> 2) & 1)})`;
        ctx.beginPath();
        ctx.arc(x + 8, y + 6, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (!this.onGround) {
      name = pre + (this.aimUp ? 'up' : 'jump');
      y = this.y - (this.aimUp ? 4 : 0) - camY;
    } else if (Math.abs(this.vx) > 0.1) {
      if (this.aimUp) { name = pre + 'up'; y = this.y - 4 - camY; }
      else {
        const f = ['run1', 'run2', 'run3', 'run2'][Math.floor(this.anim / 6) % 4];
        name = pre + f;
        y = this.y + 4 - camY;
      }
    } else {
      name = pre + (this.aimUp ? 'up' : 'stand');
      y = this.y - (this.aimUp ? 4 : 0) - camY;
    }
    drawSprite(ctx, name, x, y, this.face === -1);
  }
}

// ============================ PLAYER PROJECTILES ============================

export function updateProjs(game) {
  const { projs } = game;
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];

    if (p.kind === 'bomb') {
      if (--p.fuse <= 0) {
        game.explode(p.x + 3, p.y + 3);
        projs.splice(i, 1);
      }
      continue;
    }

    if (p.kind === 'missile') { p.vx *= 1.08; p.vy *= 1.08; }
    p.x += p.vx; p.y += p.vy;
    p.life--;

    let dead = p.life <= 0;
    if (!dead) {
      if (p.wave) game.waveTouchWorld(p); // pierces walls, still trips doors
      else if (game.shotHitsWorld(p)) dead = true;
    }

    if (!dead) {
      // enemies
      const pr = { x: p.x, y: p.y, w: p.w, h: p.h };
      for (const e of game.enemies) {
        if (e.dead || e.noHit) continue;
        if (overlap(pr, e)) {
          damageEnemy(game, e, p);
          dead = true;
          break;
        }
      }
    }
    if (dead) projs.splice(i, 1);
  }
}

export function drawProjs(ctx, game, camX, camY) {
  for (const p of game.projs) {
    const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
    if (p.kind === 'bomb') {
      ctx.fillStyle = (p.fuse & 4) ? '#f8d838' : '#e07820';
      ctx.fillRect(x, y, 6, 6);
      ctx.fillStyle = '#b02818';
      ctx.fillRect(x + 1, y + 1, 4, 4);
    } else if (p.kind === 'missile') {
      ctx.fillStyle = '#f84020';
      ctx.fillRect(x, y, 5, 5);
      ctx.fillStyle = '#a8a8b8';
      ctx.fillRect(x - Math.sign(p.vx) * 3, y + 1, 3, 3);
    } else if (p.wave) {
      const off = Math.sin((p.life + game.frame) * 0.9) * 3;
      const vert = p.vx === 0;
      ctx.fillStyle = '#c060e0';
      ctx.fillRect(x + (vert ? off : 0), y + (vert ? 0 : off), 4, 4);
      ctx.fillRect(x - (vert ? off : 0), y - (vert ? 0 : off), 4, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 1, y + 1, 2, 2);
    } else {
      ctx.fillStyle = p.ice ? '#40d8d8' : '#f8d838';
      ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 1, y + 1, 2, 2);
    }
  }
}

// ============================ ENEMIES ============================

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // normals by orientation

export function spawnEnemy(game, type, tx, ty) {
  const e = {
    type, x: tx * TILE, y: ty * TILE, w: 14, h: 12,
    vx: 0, vy: 0, hp: 2, dmg: 8, t: Math.floor(Math.random() * 90),
    frozen: 0, flash: 0, dead: false,
  };
  switch (type) {
    case 'zoomer': e.hp = 2; e.dmg = 8; e.o = 0; e.d = 1; e.w = 12; e.h = 12;
      // snap to the floor below
      while (!game.solid(e.x + 6, e.y + e.h + 1) && e.y < game.room.h * TILE) e.y += 4;
      break;
    case 'skree': e.hp = 2; e.dmg = 10; e.phase = 'hang'; e.w = 12; e.h = 14; break;
    case 'ripper': e.hp = 1; e.dmg = 8; e.vx = 0.8; e.w = 14; e.h = 6; e.beamProof = true; break;
    case 'waver': e.hp = 2; e.dmg = 8; e.vx = 0.6; e.w = 14; e.h = 8; break;
    case 'hopper': e.hp = 4; e.dmg = 12; e.w = 14; e.h = 12; e.wait = 30; break;
    case 'squeept': e.hp = 3; e.dmg = 10; e.baseY = e.y; e.w = 12; e.h = 10; e.vy = 0; e.wait = 60 + (tx % 40); break;
    case 'rio': e.hp = 3; e.dmg = 10; e.homeY = e.y; e.phase = 'hover'; e.w = 14; e.h = 8; break;
    case 'phazoid': e.hp = 20; e.dmg = 0; e.w = 14; e.h = 14; e.latched = false; e.missileOnly = true; break;
    case 'rinka': e.hp = 1; e.dmg = 12; e.w = 8; e.h = 8; break;
    case 'gorluk': return spawnGorluk(e, tx, ty);
    case 'skyrax': return spawnSkyrax(e, tx, ty);
    case 'overmind': return spawnOvermind(e, tx, ty);
  }
  return e;
}

function spawnGorluk(e, tx, ty) {
  e.w = 40; e.h = 60; e.x = tx * TILE; e.y = 12 * TILE - e.h;
  e.hp = 70; e.dmg = 20; e.boss = true; e.flag = 'boss_gorluk';
  e.homeY = e.y;
  return e;
}
function spawnSkyrax(e, tx, ty) {
  e.w = 42; e.h = 36; e.x = tx * TILE; e.y = 12 * TILE - e.h;
  e.hp = 70; e.dmg = 20; e.boss = true; e.flag = 'boss_skyrax';
  return e;
}
function spawnOvermind(e, tx, ty) {
  e.w = 36; e.h = 30; e.x = tx * TILE - 2; e.y = 12 * TILE - 38;
  e.hp = 12; e.phase = 'glass'; e.dmg = 20; e.boss = true; e.missileOnly = true;
  e.flag = 'boss_overmind';
  return e;
}

export function damageEnemy(game, e, p) {
  const kind = p.kind, dmg = p.dmg;
  const missile = kind === 'missile';
  const bomb = kind === 'bomb';

  if (e.type === 'phazoid') {
    if (p.ice) { e.frozen = 240; e.latched = false; game.sound.freeze(); return; }
    if (missile && e.frozen > 0) { e.hp -= 10; e.flash = 6; game.sound.enemyHit(); }
    else if (bomb && e.latched) { e.latched = false; e.hp -= 3; e.flash = 6; }
    else { game.sound.clink(); return; }
  } else if (e.type === 'overmind') {
    if (!missile) { game.sound.clink(); return; }
    e.hp -= 10; e.flash = 8; game.sound.zebHit();
    if (e.phase === 'glass' && e.hp <= 0) {
      e.phase = 'brain'; e.hp = 25;
      game.addBoom(e.x + e.w / 2, e.y + e.h / 2);
      game.sound.boom();
      return;
    }
  } else if (e.beamProof && !missile && !bomb && kind !== 'screw') {
    // rippers shrug off beams, but ice still freezes them
    if (p.ice) { e.frozen = 240; game.sound.freeze(); }
    else game.sound.clink();
    return;
  } else {
    // ice shots deal normal damage and freeze whatever survives
    if (p.ice && !e.boss) { e.frozen = 240; game.sound.freeze(); }
    e.hp -= missile ? 10 : bomb ? 3 : dmg;
    e.flash = 6;
    game.sound.enemyHit();
  }

  if (e.hp <= 0) killEnemy(game, e);
}

export function killEnemy(game, e) {
  e.dead = true;
  if (e.boss) { game.bossDied(e); return; }
  game.addBoom(e.x + e.w / 2, e.y + e.h / 2);
  game.sound.enemyDie();
  game.addDrop(e.x + e.w / 2, e.y + e.h / 2);
}

export function updateEnemy(game, e) {
  const P = game.player;
  if (e.flash > 0) e.flash--;
  if (e.frozen > 0) { e.frozen--; return; }
  e.t++;

  switch (e.type) {
    case 'zoomer': {
      const spd = 0.4;
      const half = 6;
      const cx = e.x + half, cy = e.y + half;
      const N = DIRS[e.o];
      const T = [-N[1] * e.d, N[0] * e.d];
      const nx = cx + T[0] * spd, ny = cy + T[1] * spd;
      const frontSolid = game.solid(nx + T[0] * half, ny + T[1] * half);
      if (frontSolid) {
        e.o = (e.o - e.d + 4) % 4; // climb the wall ahead
      } else {
        const footSolid = game.solid(nx - N[0] * (half + 2), ny - N[1] * (half + 2));
        if (footSolid) {
          e.x = nx - half; e.y = ny - half;
        } else {
          // walked past an edge: wrap around the corner
          e.o = (e.o + e.d + 4) % 4;
          e.x = nx - half - N[0] * 2 + T[0] * 2;
          e.y = ny - half - N[1] * 2 + T[1] * 2;
        }
      }
      break;
    }
    case 'skree': {
      if (e.phase === 'hang') {
        if (Math.abs(P.x - e.x) < 28 && P.y > e.y) { e.phase = 'dive'; e.vy = 0.5; }
      } else if (e.phase === 'dive') {
        e.vy = Math.min(5.5, e.vy + 0.4);
        e.vx = Math.sign(P.x - e.x) * 0.5;
        moveRect(game, e, e.vx, e.vy);
        if (e.onGround) { e.phase = 'ground'; e.gt = 26; }
      } else if (--e.gt <= 0) {
        for (const [vx, vy] of [[-1.6, -1.4], [1.6, -1.4], [-0.9, -2.2], [0.9, -2.2]]) {
          game.eprojs.push({ kind: 'shrap', x: e.x + 5, y: e.y + 5, w: 4, h: 4, vx, vy, g: 0.12, dmg: 5, life: 90 });
        }
        game.addBoom(e.x + 6, e.y + 7);
        game.sound.boom();
        e.dead = true;
      }
      break;
    }
    case 'ripper': {
      moveRect(game, e, e.vx, 0);
      if (e.hitWall) e.vx = -e.vx;
      break;
    }
    case 'waver': {
      e.vy = Math.sin(e.t * 0.07) * 1.1;
      moveRect(game, e, e.vx, e.vy);
      if (e.hitWall) e.vx = -e.vx;
      break;
    }
    case 'hopper': {
      e.vy = Math.min(TERM, e.vy + GRAV);
      moveRect(game, e, e.onGround ? 0 : e.vx, e.vy);
      if (e.hitWall) e.vx = -e.vx;
      if (e.onGround && --e.wait <= 0) {
        e.vx = (Math.sign(P.x - e.x) || 1) * 1.3;
        e.vy = -4.2;
        e.wait = 34 + (e.t % 20);
      }
      break;
    }
    case 'squeept': {
      if (e.jumping) {
        e.vy += 0.18;
        e.y += e.vy;
        if (e.y >= e.baseY) { e.y = e.baseY; e.jumping = false; e.wait = 70 + (Math.floor(e.x) % 40); }
      } else if (--e.wait <= 0) {
        e.jumping = true; e.vy = -4.6;
      }
      break;
    }
    case 'rio': {
      if (e.phase === 'hover') {
        e.y = e.homeY + Math.sin(e.t * 0.05) * 4;
        if (Math.abs(P.x - e.x) < 90 && P.y > e.y && e.t % 120 > 100) {
          e.phase = 'dive';
          e.vx = Math.sign(P.x - e.x) * 1.2;
          e.vy = 1.8;
        }
      } else if (e.phase === 'dive') {
        e.x += e.vx; e.y += e.vy;
        e.vy -= 0.045; // arcs back up
        if (e.vy < -1.6 || game.solid(e.x + 7, e.y + e.h + 2)) e.phase = 'rise';
      } else {
        e.x += e.vx * 0.6; e.y -= 1.2;
        if (e.y <= e.homeY) { e.y = e.homeY; e.phase = 'hover'; }
      }
      break;
    }
    case 'phazoid': {
      if (e.cool > 0) e.cool--;
      if (e.latched) {
        e.x = P.x - 2;
        e.y = P.y - 6;
        game.drainPlayer(e);
        // shake free with rapid jump presses (or bomb it off)
        if (game.input.pressed('jump')) e.shake = (e.shake || 0) + 1;
        if (e.shake >= 6) {
          e.latched = false; e.shake = 0; e.cool = 90;
          P.inv = Math.max(P.inv, 30);
        }
        break;
      }
      const dx = P.x + P.w / 2 - (e.x + 7), dy = P.y + P.h / 2 - (e.y + 7);
      const d = Math.hypot(dx, dy) || 1;
      const sp = 0.75;
      e.x += (dx / d) * sp + Math.sin(e.t * 0.1) * 0.3;
      e.y += (dy / d) * sp + Math.cos(e.t * 0.13) * 0.3;
      if (overlap(e, P) && e.cool <= 0 && P.state !== 'dead') {
        e.latched = true; e.shake = 0;
        game.sound.latch();
      }
      break;
    }
    case 'rinka': {
      e.x += e.vx; e.y += e.vy;
      if (game.solid(e.x + 4, e.y + 4)) e.dead = true;
      break;
    }
    case 'gorluk': updateGorluk(game, e); break;
    case 'skyrax': updateSkyrax(game, e); break;
    case 'overmind': updateOvermind(game, e); break;
  }

  // contact: screw attack tears through regular enemies, otherwise it hurts
  if (!e.dead && e.dmg > 0 && !e.latched && overlap(e, game.player)) {
    const P2 = game.player;
    if (game.save.items.screw && P2.spinning && !P2.onGround && !e.boss && e.type !== 'phazoid') {
      damageEnemy(game, e, { kind: 'screw', dmg: 5 });
    } else {
      game.hurtPlayer(e.dmg, e.x + e.w / 2);
      if (e.type === 'rinka') e.dead = true;
    }
  }

  // safety: cull anything that slipped out of the room
  const RW = game.room.w * 16, RH = game.room.h * 16;
  if (e.x < -32 || e.x > RW + 32 || e.y < -32 || e.y > RH + 32) e.dead = true;
}

function updateGorluk(game, e) {
  const P = game.player;
  e.y = e.homeY + Math.sin(e.t * 0.03) * 3;
  // enraged below a third health: much faster volleys
  if (e.hp <= 24 && e.t % 55 === 20) {
    game.eprojs.push({ kind: 'spike', x: e.x + e.w - 4, y: e.y + 32, w: 6, h: 4, vx: 2.6, vy: -0.6, g: 0.02, dmg: 12, life: 130 });
  }
  if (e.t % 85 === 0) {
    game.eprojs.push({ kind: 'spike', x: e.x + e.w - 4, y: e.y + 24, w: 6, h: 4, vx: 2.1, vy: 0, g: 0, dmg: 12, life: 130 });
    game.eprojs.push({ kind: 'spike', x: e.x + e.w - 4, y: e.y + 40, w: 6, h: 4, vx: 1.7, vy: 0, g: 0, dmg: 12, life: 130 });
  }
  if (e.t % 140 === 70) {
    game.eprojs.push({ kind: 'spike', x: e.x + e.w - 6, y: e.y + 6, w: 6, h: 4, vx: 1.6, vy: -3.4, g: 0.11, dmg: 12, life: 160 });
    game.eprojs.push({ kind: 'spike', x: e.x + e.w - 6, y: e.y + 6, w: 6, h: 4, vx: 2.4, vy: -2.6, g: 0.11, dmg: 12, life: 160 });
  }
  void P;
}

function updateSkyrax(game, e) {
  const P = game.player;
  if (e.onGround === undefined) e.onGround = true;
  if (e.onGround) {
    if (e.rest === undefined) e.rest = 40;
    if (--e.rest <= 0) {
      const toward = Math.sign(P.x - e.x) || -1;
      e.vx = toward * (0.8 + Math.random() * 0.9);
      e.vy = -4.4;
      e.onGround = false;
      // fire spread on takeoff
      const cx = e.x + e.w / 2, cy = e.y + 12;
      const dx = P.x + 5 - cx, dy = P.y + 10 - cy;
      const d = Math.hypot(dx, dy) || 1;
      for (const sp of [-0.35, 0, 0.35]) {
        const a = Math.atan2(dy, dx) + sp;
        game.eprojs.push({ kind: 'fire', x: cx, y: cy, w: 6, h: 6, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, g: 0, dmg: 14, life: 140 });
      }
      void d;
      // enraged below a third health: barely rests between hops
      e.rest = (e.hp <= 24 ? 18 : 46) + Math.random() * 30;
    }
  } else {
    e.vy = Math.min(TERM, e.vy + 0.16);
    moveRect(game, e, e.vx, e.vy);
    if (e.hitWall) e.vx = -e.vx;
  }
}

function updateOvermind(game, e) {
  // Stationary; rinka spawners are handled by the room. Track phase.
  if (e.phase === 'glass' && e.hp <= 0) { /* handled in damage */ }
}

export function drawEnemy(ctx, game, e, camX, camY) {
  const x = Math.round(e.x - camX), y = Math.round(e.y - camY);
  const f2 = Math.floor(game.frame / 8) % 2;

  if (e.flash > 0 && (game.frame & 2)) return;
  ctx.save();
  if (e.frozen > 0) {
    ctx.globalAlpha = 0.9;
    ctx.filter = 'saturate(0.2) brightness(1.6)';
  }

  switch (e.type) {
    case 'zoomer': {
      ctx.translate(x + 6, y + 6);
      ctx.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][e.o]);
      drawSprite(ctx, f2 ? 'zoomer1' : 'zoomer2', -8, -4);
      break;
    }
    case 'skree':
      drawSprite(ctx, f2 ? 'skree1' : 'skree2', x - 2, y);
      break;
    case 'ripper':
      drawSprite(ctx, 'ripper', x - 1, y - 1, e.vx < 0);
      break;
    case 'waver':
      drawSprite(ctx, f2 ? 'waver1' : 'waver2', x - 1, y - 1, e.vx < 0);
      break;
    case 'hopper':
      drawSprite(ctx, e.onGround ? 'hopper1' : 'hopper2', x - 1, y - 2);
      break;
    case 'squeept':
      drawSprite(ctx, 'squeept', x, y, false);
      break;
    case 'rio':
      drawSprite(ctx, f2 ? 'rio1' : 'rio2', x - 1, y);
      break;
    case 'phazoid':
      drawSprite(ctx, f2 ? 'phazoid1' : 'phazoid2', x - 1, y - 2);
      break;
    case 'rinka':
      drawSprite(ctx, 'rinka', x, y);
      break;
    case 'gorluk':
      drawSpriteScaled(ctx, 'gorluk', x - 4, y - 2, 2, true);
      break;
    case 'skyrax':
      drawSpriteScaled(ctx, 'skyrax', x - 3, y - 2, 2, false);
      break;
    case 'overmind': {
      // vitrine
      ctx.fillStyle = '#284858';
      ctx.fillRect(x - 8, y - 10, e.w + 16, e.h + 18);
      ctx.fillStyle = '#101820';
      ctx.fillRect(x - 5, y - 7, e.w + 10, e.h + 12);
      drawSpriteScaled(ctx, 'overmind', x + 2, y + 2, 2);
      if (e.phase === 'glass') {
        ctx.fillStyle = 'rgba(120,200,255,0.35)';
        ctx.fillRect(x - 5, y - 7, e.w + 10, e.h + 12);
        ctx.fillStyle = 'rgba(220,245,255,0.5)';
        ctx.fillRect(x - 3, y - 5, 3, e.h + 8);
      }
      break;
    }
  }
  ctx.restore();
}

// ============================ ENEMY PROJECTILES ============================

export function updateEprojs(game) {
  const list = game.eprojs;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.vy += p.g || 0;
    p.x += p.vx; p.y += p.vy;
    p.life--;
    let dead = p.life <= 0;
    if (!dead && p.kind !== 'spike' && game.solid(p.x + p.w / 2, p.y + p.h / 2)) dead = true;
    if (!dead && game.player.inv <= 0 && overlap(p, game.player)) {
      game.hurtPlayer(p.dmg, p.x);
      dead = true;
    }
    if (dead) list.splice(i, 1);
  }
}

export function drawEprojs(ctx, game, camX, camY) {
  for (const p of game.eprojs) {
    const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
    if (p.kind === 'fire') {
      ctx.fillStyle = (game.frame & 4) ? '#f86818' : '#f8d030';
      ctx.fillRect(x, y, 6, 6);
    } else if (p.kind === 'spike') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(x, y, 6, 4);
      ctx.fillStyle = '#909098';
      ctx.fillRect(x + (p.vx > 0 ? 4 : 0), y + 1, 2, 2);
    } else {
      ctx.fillStyle = '#f8a030';
      ctx.fillRect(x, y, 4, 4);
    }
  }
}
