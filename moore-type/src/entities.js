// Player ship, force pod, weapons, enemies and bosses.

import { drawSprite, SPR } from './sprites.js';
import { solidAt, PLAY_H, TILE, ROWS, tileAt } from './levels.js';

export const VIEW_W = 256;

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ============================================================ player ====

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 24; this.h = 12;
    this.speedLvl = 0;
    this.double = false;
    this.laser = false;
    this.missile = false;
    this.shieldHp = 0;
    this.pod = null;           // {state:'front'|'back'|'fly'|'hold'|'return', x, y, relX}
    this.charge = 0;
    this.holdT = 0;
    this.fireCd = 0;
    this.missileCd = 0;
    this.invuln = 0;
    this.dead = false;
    this.deadT = 0;
    this.banked = 0;           // total powers banked this life (for revenge capsule)
  }

  hitbox() {
    return { x: this.x + 8, y: this.y + 4, w: 4, h: 4 };
  }

  bodybox() { // generous box for pickups
    return { x: this.x + 2, y: this.y, w: this.w - 4, h: this.h };
  }

  shieldbox() {
    return { x: this.x + this.w, y: this.y - 3, w: 6, h: this.h + 6 };
  }

  update(game, inp) {
    if (this.dead) {
      this.deadT++;
      if (game.sound.chargeOsc) game.sound.chargeStop();
      return;
    }
    const sp = 1.3 + this.speedLvl * 0.4;
    let dx = 0, dy = 0;
    if (inp.down('left')) dx -= 1;
    if (inp.down('right')) dx += 1;
    if (inp.down('up')) dy -= 1;
    if (inp.down('down')) dy += 1;
    if (dx && dy) { dx *= 0.75; dy *= 0.75; }
    this.x += dx * sp;
    this.y += dy * sp;
    this.x = clamp(this.x, game.camX + 2, game.camX + VIEW_W - this.w - 2);
    this.y = clamp(this.y, 2, PLAY_H - this.h - 2);

    // terrain kills (small hitbox)
    const hb = this.hitbox();
    if (this.invuln <= 0 && (
      solidAt(game.stage, hb.x, hb.y) || solidAt(game.stage, hb.x + hb.w, hb.y) ||
      solidAt(game.stage, hb.x, hb.y + hb.h) || solidAt(game.stage, hb.x + hb.w, hb.y + hb.h))) {
      game.killPlayer(true); // terrain ignores shield
      return;
    }
    if (this.invuln > 0) this.invuln--;

    // ---- firing / charge ----
    if (this.fireCd > 0) this.fireCd--;
    if (this.missileCd > 0) this.missileCd--;
    if (inp.pressed('fire')) { this.volley(game); this.holdT = 0; }
    if (inp.down('fire')) {
      this.holdT++;
      if (this.holdT > 12) {
        if (this.charge === 0) game.sound.chargeStart();
        this.charge = Math.min(60, this.charge + 1);
        game.sound.chargeSet(this.charge / 60);
      }
    } else {
      if (this.charge >= 20) this.fireBeam(game);
      if (this.charge > 0) game.sound.chargeStop();
      this.charge = 0;
      this.holdT = 0;
    }

    // ---- pod control ----
    if (inp.pressed('pod') && this.pod) {
      const p = this.pod;
      if (p.state === 'front' || p.state === 'back') {
        p.state = 'fly';
        p.x = this.x + this.w; p.y = this.y;
        p.targetX = p.x + 64;
        game.sound.podToggle();
      } else {
        p.state = 'return';
        game.sound.podToggle();
      }
    }
    this.updatePod(game);
  }

  volley(game) {
    if (this.fireCd > 0) return;
    this.fireCd = 9;
    const nx = this.x + this.w - 2, ny = this.y + 5;
    if (this.laser) {
      game.pbullets.push({ x: nx, y: ny, vx: 7, vy: 0, w: 16, h: 2, dmg: 2, pierce: true, hits: new Set(), laser: true });
      game.sound.laser();
    } else {
      game.pbullets.push({ x: nx, y: ny, vx: 5.5, vy: 0, w: 6, h: 2, dmg: 1 });
      game.sound.pea();
    }
    if (this.double) {
      game.pbullets.push({ x: this.x + 14, y: this.y, vx: 3.9, vy: -3.9, w: 4, h: 4, dmg: 1, diag: true });
    }
    if (this.missile && this.missileCd <= 0) {
      this.missileCd = 36;
      game.pbullets.push({ x: this.x + 6, y: this.y + 10, vx: 1.6, vy: 1.2, w: 6, h: 4, dmg: 3, missile: true });
      game.sound.missile();
    }
    if (this.pod && this.pod.state !== 'return') {
      const p = this.pod;
      const px = p.state === 'back' ? this.x - 4 : p.x + 10;
      if (this.laser) game.pbullets.push({ x: px, y: p.y + 5, vx: 7, vy: 0, w: 16, h: 2, dmg: 2, pierce: true, hits: new Set(), laser: true });
      else game.pbullets.push({ x: px, y: p.y + 5, vx: 5.5, vy: 0, w: 6, h: 2, dmg: 1 });
    }
    game.stats.shots++;
  }

  fireBeam(game) {
    const tier = this.charge >= 58 ? 3 : this.charge >= 40 ? 2 : 1;
    const h = 4 + tier * 4;
    game.pbullets.push({
      x: this.x + this.w - 2, y: this.y + 6 - h / 2, vx: 6, vy: 0,
      w: 18 + tier * 4, h, dmg: 3 + tier * 3, pierce: true, hits: new Set(), beam: tier,
    });
    game.sound.wave(tier);
    game.stats.beams++;
  }

  updatePod(game) {
    const p = this.pod;
    if (!p) return;
    if (p.state === 'front') { p.x = this.x + this.w; p.y = this.y; }
    else if (p.state === 'back') { p.x = this.x - 12; p.y = this.y; }
    else if (p.state === 'fly') {
      p.x += 4;
      if (p.x >= p.targetX) { p.state = 'hold'; p.relX = p.x - game.camX; }
    } else if (p.state === 'hold') {
      p.x = game.camX + p.relX;
    } else if (p.state === 'return') {
      const tx = this.x + this.w / 2 - 5, ty = this.y;
      const ddx = tx - p.x, ddy = ty - p.y;
      const d = Math.hypot(ddx, ddy);
      if (d < 8) {
        p.state = p.x > this.x + this.w / 2 ? 'front' : 'back';
      } else {
        p.x += (ddx / d) * 4.5;
        p.y += (ddy / d) * 4.5;
      }
    }
    p.w = 11; p.h = 11;
    // pod blocks enemy bullets
    const pr = { x: p.x - 1, y: p.y - 1, w: 13, h: 13 };
    const before = game.ebullets.length;
    game.ebullets = game.ebullets.filter((b) => !overlap(b, pr));
    if (game.ebullets.length < before) game.sound.podHit();
    // pod grinds enemies on contact
    if (game.frame % 5 === 0) {
      for (const e of game.enemies) {
        if (e.pickup || e.hp === undefined) continue;
        if (overlap(pr, e)) damageEnemy(game, e, 1);
      }
    }
  }

  draw(ctx, cam, frame) {
    if (this.dead) return;
    const sx = Math.round(this.x - cam.x), sy = Math.round(this.y);
    if (this.invuln > 0 && (frame >> 2) % 2 === 0) return;
    // engine exhaust
    ctx.fillStyle = (frame >> 1) % 2 ? '#f8d838' : '#f88820';
    ctx.fillRect(sx - 4 - (frame % 3), sy + 5, 4 + (frame % 3), 2);
    drawSprite(ctx, 'ship', sx, sy);
    if (this.shieldHp > 0) {
      ctx.fillStyle = ['', '#2090c0', '#50e8f8', '#c8f8f8'][this.shieldHp] || '#50e8f8';
      const bx = sx + this.w;
      for (let i = 0; i < 5; i++) ctx.fillRect(bx + ((i === 0 || i === 4) ? 0 : 2), sy - 3 + i * 4, 2, 3);
    }
    if (this.pod) {
      const p = this.pod;
      drawSprite(ctx, (frame >> 3) % 2 ? 'pod1' : 'pod2', Math.round(p.x - cam.x), Math.round(p.y));
    }
  }
}

// ============================================================ bullets ====

export function updatePBullets(game) {
  const st = game.stage;
  for (const b of game.pbullets) {
    if (b.missile) {
      if (!b.grounded) {
        b.vy = Math.min(3, b.vy + 0.18);
        b.x += b.vx; b.y += b.vy;
        if (solidAt(st, b.x + b.w / 2, b.y + b.h + 1)) {
          b.grounded = true; b.vy = 0; b.vx = 2.4;
          b.y = ((b.y + b.h + 1) >> 3 << 3) - b.h - 0.01;
        }
      } else {
        b.x += b.vx;
        if (!solidAt(st, b.x + b.w / 2, b.y + b.h + 2)) { b.grounded = false; b.vy = 0.5; }
        if (solidAt(st, b.x + b.w, b.y + b.h / 2)) { b.dead = true; game.addBoom(b.x + b.w, b.y, false); }
      }
      if (b.y > PLAY_H + 8) b.dead = true;
    } else {
      b.x += b.vx; b.y += b.vy;
      // terrain stops shots (beams too)
      if (solidAt(st, b.x + b.w, b.y + b.h / 2)) b.dead = true;
    }
    if (b.x > game.camX + VIEW_W + 20 || b.x + b.w < game.camX - 10 || b.y < -12) b.dead = true;
  }
  game.pbullets = game.pbullets.filter((b) => !b.dead);
}

export function drawPBullets(game, ctx) {
  for (const b of game.pbullets) {
    const sx = Math.round(b.x - game.camX), sy = Math.round(b.y);
    if (b.beam) {
      // charge wave: layered crescent
      const cols = ['#50e8f8', '#f8f8f8', '#3868e8'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cols[i];
        ctx.fillRect(sx - i * 5, sy + i, b.w - i * 4, b.h - i * 2);
      }
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(sx + b.w - 6, sy + 1, 5, b.h - 2);
    } else if (b.laser) {
      ctx.fillStyle = '#f83838';
      ctx.fillRect(sx, sy, b.w, 2);
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(sx + 2, sy, b.w - 4, 1);
    } else if (b.missile) {
      ctx.fillStyle = '#b8b8c8';
      ctx.fillRect(sx, sy, b.w, b.h - 1);
      ctx.fillStyle = '#f88820';
      ctx.fillRect(sx - 2, sy + 1, 2, 2);
    } else if (b.diag) {
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(sx, sy, 3, 3);
    } else {
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(sx, sy, b.w, b.h);
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(sx + b.w - 2, sy, 2, 2);
    }
  }
}

export function fireAimed(game, x, y, speed, spread = 0) {
  const P = game.player;
  if (P.dead) return;
  const dx = (P.x + 10) - x, dy = (P.y + 6) - y;
  const a = Math.atan2(dy, dx) + spread;
  game.ebullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, w: 4, h: 4 });
  game.sound.eshoot();
}

export function fireRing(game, x, y, n, speed, a0 = 0) {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    game.ebullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, w: 4, h: 4 });
  }
  game.sound.eshoot();
}

export function updateEBullets(game) {
  const st = game.stage;
  const P = game.player;
  const shield = (!P.dead && P.shieldHp > 0) ? P.shieldbox() : null;
  for (const b of game.ebullets) {
    if (b.grav) b.vy += b.grav;
    b.x += b.vx; b.y += b.vy;
    if (solidAt(st, b.x + 2, b.y + 2)) b.dead = true;
    if (b.x < game.camX - 16 || b.x > game.camX + VIEW_W + 16 || b.y < -16 || b.y > PLAY_H + 16) b.dead = true;
    if (shield && !b.dead && overlap(b, shield)) {
      b.dead = true;
      P.shieldHp--;
      game.sound.shieldHit();
    }
  }
  game.ebullets = game.ebullets.filter((b) => !b.dead);
}

export function drawEBullets(game, ctx, frame) {
  for (const b of game.ebullets) {
    const sx = Math.round(b.x - game.camX), sy = Math.round(b.y);
    ctx.fillStyle = (frame >> 2) % 2 ? '#f83838' : '#f8b0b0';
    ctx.fillRect(sx, sy, 4, 4);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(sx + 1, sy + 1, 2, 2);
  }
}

// ============================================================ enemies ====

let chainSeq = 1;

export function spawnEnemy(game, t, x, y, opts = {}) {
  const e = { t, x, y, vx: 0, vy: 0, hp: 1, w: 12, h: 10, born: game.frame, flash: 0, score: 100, ...opts };
  switch (t) {
    case 'sine': e.hp = 1; e.score = 150; e.baseY = y; break;
    case 'zako': e.w = 8; e.h = 8; e.score = 100; e.baseY = y; break;
    case 'turret': e.hp = 4; e.w = 12; e.h = 9; e.score = 300; e.aim = Math.PI; break;
    case 'rusher': e.hp = 1; e.w = 14; e.h = 8; e.vx = -3.2; e.score = 150; e.baseY = y; break;
    case 'crawler': e.hp = 3; e.w = 12; e.h = 10; e.score = 250; break;
    case 'orb': e.hp = 8; e.w = 14; e.h = 12; e.score = 800; e.vx = -0.45; e.baseY = y; break;
    case 'orbbit': e.hp = 2; e.w = 8; e.h = 8; e.score = 100; break;
    case 'homer': e.hp = 5; e.w = 16; e.h = 12; e.vx = -0.5; e.score = 400; break;
    case 'hmissile': e.hp = 1; e.w = 8; e.h = 6; e.score = 50; e.a = Math.PI; e.sp = 2.0; break;
    case 'crusher': e.hp = 1; e.armored = true; e.blockShots = true; e.w = 14; e.h = opts.h || 56; e.dir = 1; e.score = 0; break;
    case 'capsule': e.pickup = true; e.w = 12; e.h = 10; e.vx = 0.6; e.baseY = y; break;
    case 'capsuleR': e.pickup = true; e.w = 12; e.h = 10; e.vx = 0.6; e.baseY = y; break;
    case 'podItem': e.pickup = true; e.w = 12; e.h = 10; e.vx = 0.6; e.baseY = y; break;
    // mid-bosses (screen-riding)
    case 'mid1': e.hp = 45; e.w = 30; e.h = 22; e.score = 3000; e.sx = 270; break;
    case 'mid2': e.hp = 45; e.w = 26; e.h = 20; e.score = 3000; break;
    case 'mid3': e.hp = 26; e.w = 24; e.h = 16; e.score = 1500; e.sx = 272; break;
    case 'mid4': e.hp = 35; e.w = 24; e.h = 24; e.score = 3000; e.sx = 272; break;
    // bosses
    case 'b1core': e.hp = 45; e.w = 16; e.h = 16; e.score = 10000; e.core = true; break;
    case 'b1rock': e.hp = 6; e.w = 10; e.h = 10; e.score = 200; break;
    case 'b2body': e.hp = 1; e.armored = true; e.blockShots = true; e.w = 70; e.h = 64; e.score = 0; break;
    case 'b2seg': e.hp = 1; e.armored = true; e.blockShots = true; e.w = 9; e.h = 9; e.score = 0; break;
    case 'b2core': e.hp = 50; e.w = 16; e.h = 16; e.score = 12000; e.core = true; break;
    case 'b3hull': e.hp = 1; e.armored = true; e.blockShots = true; e.score = 0; break;
    case 'b3turret': e.hp = 20; e.w = 14; e.h = 12; e.score = 1000; break;
    case 'b3core': e.hp = 45; e.w = 16; e.h = 16; e.score = 14000; e.core = true; break;
    case 'b4core': e.hp = 100; e.w = 20; e.h = 20; e.score = 20000; e.core = true; break;
    case 'b4pod': e.hp = 12; e.w = 12; e.h = 12; e.score = 500; break;
  }
  game.enemies.push(e);
  return e;
}

// Spawn a whole wave entry (called by main when trigger crossed).
export function spawnWave(game, wv) {
  const wx = wv.c * TILE;
  switch (wv.t) {
    case 'sine': case 'zako': {
      const id = chainSeq++;
      game.chains.set(id, { n: wv.n, killed: 0, red: !!wv.red, broken: false });
      for (let i = 0; i < wv.n; i++) {
        spawnEnemy(game, wv.t, game.camX + VIEW_W + 8 + i * (wv.t === 'sine' ? 18 : 14), wv.y, {
          chain: id, phase: -i * 0.55, red: !!wv.red,
        });
      }
      break;
    }
    case 'rusher':
      for (let i = 0; i < wv.n; i++) {
        spawnEnemy(game, 'rusher', game.camX + VIEW_W + 8 + i * 30, wv.y + (i % 2) * 14, {});
      }
      break;
    case 'turret': {
      const e = spawnEnemy(game, 'turret', wx, 0, { side: wv.side });
      placeOnSurface(game, e, wv.side);
      break;
    }
    case 'crawler': {
      const e = spawnEnemy(game, 'crawler', wx, 0, { side: wv.side });
      placeOnSurface(game, e, wv.side);
      break;
    }
    case 'orb': {
      const e = spawnEnemy(game, 'orb', game.camX + VIEW_W + 10, wv.y, {});
      for (let i = 0; i < 4; i++) spawnEnemy(game, 'orbbit', e.x, e.y, { parent: e, a: (i / 4) * Math.PI * 2 });
      break;
    }
    case 'homer': spawnEnemy(game, 'homer', game.camX + VIEW_W + 8, wv.y, {}); break;
    case 'crusher': spawnEnemy(game, 'crusher', wx, wv.y0, { y0: wv.y0, y1: wv.y1, h: wv.h }); break;
    case 'podItem': spawnEnemy(game, 'podItem', game.camX + VIEW_W + 8, wv.y, {}); break;
    case 'mid': spawnEnemy(game, 'mid' + wv.n, game.camX + VIEW_W + 20, wv.n === 2 ? 0 : 96, wv.n === 3 ? { twin: true } : {});
      if (wv.n === 3) spawnEnemy(game, 'mid3', game.camX + VIEW_W + 20, 150, { second: true });
      if (wv.n === 2) placeOnSurface(game, game.enemies[game.enemies.length - 1], 1);
      break;
  }
}

function placeOnSurface(game, e, side) {
  const tx = Math.floor((e.x + e.w / 2) / TILE);
  if (side === 1) { // floor: scan up from bottom
    let y = ROWS - 1;
    while (y > 0 && tileAt(game.stage, tx, y) === 1) y--;
    e.y = (y + 1) * TILE - e.h;
  } else { // ceiling: scan down from top
    let y = 0;
    while (y < ROWS - 1 && tileAt(game.stage, tx, y) === 1) y++;
    e.y = y * TILE;
    e.ceil = true;
  }
}

export function damageEnemy(game, e, dmg) {
  if (e.armored || (e.closed && e.core)) { game.sound.clink(); return; }
  e.hp -= dmg;
  e.flash = 4;
  if (e.hp > 0) { game.sound.ehit(); return; }
  // dead
  e.dead = true;
  game.kills++;
  game.addScore(e.score || 0);
  game.addBoom(e.x + e.w / 2, e.y + e.h / 2, e.core || e.t.startsWith('mid'));
  if (e.core || e.t.startsWith('mid')) game.sound.bigBoom(); else game.sound.boomS();
  if (e.chain !== undefined) {
    const ch = game.chains.get(e.chain);
    if (ch) {
      ch.killed++;
      if (ch.red && !ch.broken && ch.killed >= ch.n) {
        spawnEnemy(game, 'capsule', e.x, e.y, {});
        game.sound.capsule();
      }
    }
  }
  if (e.t === 'mid2') { // womb walker bursts into spores
    for (let i = 0; i < 5; i++) {
      game.ebullets.push({ x: e.x + e.w / 2, y: e.y, vx: -1.5 + i * 0.7, vy: -2.2, w: 4, h: 4, grav: 0.08 });
    }
  }
  if (e.core) game.onCoreDown(e);
}

export function updateEnemies(game) {
  const P = game.player;
  const f = game.frame;
  for (const e of game.enemies) {
    if (e.flash > 0) e.flash--;
    const age = f - e.born;
    switch (e.t) {
      case 'sine':
        e.x -= 1.2;
        e.y = clamp(e.baseY + Math.sin(age * 0.07 + e.phase) * 26, 6, PLAY_H - 16);
        break;
      case 'zako':
        e.x -= 1.8;
        e.y = clamp(e.baseY + Math.sin(age * 0.12 + e.phase) * 12, 6, PLAY_H - 14);
        if (age > 60 && !P.dead) e.baseY += Math.sign(P.y - e.baseY) * 0.3;
        break;
      case 'turret': {
        if (!P.dead) e.aim = Math.atan2((P.y + 6) - (e.y + 4), (P.x + 10) - (e.x + 6));
        const sx = e.x - game.camX;
        if (sx > 24 && sx < 236 && age % 110 === 60) {
          fireAimed(game, e.x + 6, e.y + (e.ceil ? 8 : 1), 1.7);
          if (game.stageIdx >= 2) fireAimed(game, e.x + 6, e.y + (e.ceil ? 8 : 1), 1.7, 0.25);
        }
        break;
      }
      case 'rusher':
        e.x += e.vx;
        e.y = e.baseY + Math.sin(age * 0.05) * 6;
        break;
      case 'crawler': {
        e.x -= 0.8;
        placeOnSurface(game, e, e.side);
        if (age % 140 === 100 && Math.abs(e.x - P.x) < 200) {
          game.ebullets.push({ x: e.x + 4, y: e.y + (e.side === 1 ? -2 : e.h), vx: -0.6, vy: e.side === 1 ? -1.6 : 1.6, w: 4, h: 4, grav: e.side === 1 ? 0.05 : -0.05 });
          game.sound.eshoot();
        }
        break;
      }
      case 'orb':
        e.x += e.vx;
        e.y = clamp(e.baseY + Math.sin(age * 0.03) * 14, 20, PLAY_H - 30);
        if (age % 130 === 90) fireRing(game, e.x + 7, e.y + 6, 6, 1.3, age * 0.1);
        break;
      case 'orbbit':
        if (!e.parent || e.parent.dead) { e.dead = true; break; }
        e.a += 0.045;
        e.x = e.parent.x + 3 + Math.cos(e.a) * 19;
        e.y = e.parent.y + 2 + Math.sin(e.a) * 19;
        break;
      case 'homer':
        e.x += e.vx;
        e.y += Math.sin(age * 0.04) * 0.5;
        if (age % 100 === 70 && game.enemies.filter((m) => m.t === 'hmissile' && !m.dead).length < 2) {
          spawnEnemy(game, 'hmissile', e.x, e.y + 4, {});
          game.sound.missile();
        }
        break;
      case 'hmissile': {
        if (!P.dead) {
          const want = Math.atan2((P.y + 6) - e.y, (P.x + 10) - e.x);
          let d = want - e.a;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          e.a += clamp(d, -0.04, 0.04);
        }
        e.x += Math.cos(e.a) * e.sp;
        e.y += Math.sin(e.a) * e.sp;
        if (age > 260 || solidAt(game.stage, e.x + 4, e.y + 3)) { e.dead = true; game.addBoom(e.x + 4, e.y + 3, false); }
        break;
      }
      case 'crusher':
        e.y += e.dir * 0.9;
        if (e.y > e.y1) { e.y = e.y1; e.dir = -1; }
        if (e.y < e.y0) { e.y = e.y0; e.dir = 1; }
        break;
      case 'capsule': case 'capsuleR': case 'podItem':
        e.x += e.vx;
        e.y = clamp(e.baseY + Math.sin(age * 0.05) * 8, 6, PLAY_H - 14);
        break;
      case 'mid1': {
        if (e.sx > 208) e.sx -= 1;
        e.x = game.camX + e.sx;
        e.y = 90 + Math.sin(age * 0.02) * 58;
        if (age % 80 === 40) for (const s of [-0.35, 0, 0.35]) fireAimed(game, e.x, e.y + 10, 1.8, s);
        if (age > 1200) { e.x += 2; e.sx += 2; if (e.sx > 300) e.dead = true; }
        break;
      }
      case 'mid2': {
        const targetX = game.camX + 190;
        e.x += clamp(targetX - e.x, -1.4, 0.6);
        placeOnSurface(game, e, 1);
        if (age % 70 === 40) {
          game.ebullets.push({ x: e.x + 6, y: e.y, vx: -1.3, vy: -2.6, w: 4, h: 4, grav: 0.08 });
          game.sound.eshoot();
        }
        break;
      }
      case 'mid3': {
        if (e.sx > 200) e.sx -= 1.2;
        e.x = game.camX + e.sx + Math.sin(age * 0.03) * 14;
        e.y = (e.second ? 150 : 26) + Math.sin(age * 0.045) * 10;
        if (age % 65 === (e.second ? 50 : 20)) fireAimed(game, e.x + 4, e.y + 8, 1.9);
        break;
      }
      case 'mid4': {
        if (e.sx > 204) e.sx -= 1;
        e.x = game.camX + e.sx;
        if (!P.dead) e.y += clamp((P.y - 6) - e.y, -0.8, 0.8);
        e.closed = (age % 170) < 100;
        e.armored = e.closed;
        if (age % 170 === 100) { // opening: cross burst
          for (const [vx, vy] of [[-2, 0], [-1.4, -1.4], [-1.4, 1.4], [0, -2], [0, 2]]) {
            game.ebullets.push({ x: e.x, y: e.y + 10, vx, vy, w: 4, h: 4 });
          }
          game.sound.eshoot();
        }
        break;
      }
      // ---------------- bosses ----------------
      case 'b1core': {
        if (age % 100 === 50) fireRing(game, e.x + 8, e.y + 8, 8, 1.3, age * 0.07);
        const rocks = game.enemies.filter((m) => m.t === 'b1rock' && !m.dead).length;
        if (rocks < 3 && age % 80 === 20) for (const s of [-0.3, 0, 0.3]) fireAimed(game, e.x + 8, e.y + 8, 1.8, s);
        break;
      }
      case 'b1rock':
        if (!e.parent || e.parent.dead) { e.dead = true; break; }
        e.a += 0.018;
        e.x = e.parent.x + 3 + Math.cos(e.a) * 36;
        e.y = clamp(e.parent.y + 3 + Math.sin(e.a) * 36, 4, PLAY_H - 14);
        break;
      case 'b2body':
        if (age % 80 === 30) { fireAimed(game, e.x + 10, e.y + 14, 1.7); fireAimed(game, e.x + 10, e.y + 14, 1.7, 0.3); }
        if (age % 150 === 100) spawnEnemy(game, 'zako', e.x + 4, e.y + 30, { chain: -1, phase: 0, baseY: e.y + 30 });
        break;
      case 'b2seg': {
        const b = e.base;
        e.x = b.x - 16 - e.i * 11 + Math.sin(f * 0.03 + e.i * 0.5) * 7;
        e.y = b.y - 30 + Math.sin(f * 0.013 + e.i * 0.45) * (8 + e.i * 7);
        if (e.coreRef && e.coreRef.dead) e.dead = true;
        break;
      }
      case 'b2core':
        e.closed = (age % 210) >= 120;
        break;
      case 'b3turret':
        if (age % 90 === (e.top ? 30 : 70)) { fireAimed(game, e.x + 6, e.y + 6, 1.8); fireAimed(game, e.x + 6, e.y + 6, 1.8, 0.28); }
        break;
      case 'b3core': {
        const guards = game.enemies.filter((m) => m.t === 'b3turret' && !m.dead).length;
        e.closed = guards > 0;
        if (e.closed && age % 90 === 45) {
          spawnEnemy(game, 'zako', e.x, e.y + 4, { chain: -1, phase: 0, baseY: e.y + 4 });
        }
        if (!e.closed && age % 110 === 55) fireRing(game, e.x + 8, e.y + 8, 8, 1.4, age * 0.05);
        break;
      }
      case 'b4core': {
        const phase = e.hp > 66 ? 1 : e.hp > 33 ? 2 : 3;
        e.phase = phase;
        if (phase === 1 && age % 110 === 55) fireRing(game, e.x + 10, e.y + 10, 10, 1.2, age * 0.04);
        if (phase === 2) {
          if (age % 80 === 40) fireRing(game, e.x + 10, e.y + 10, 10, 1.5, age * 0.06);
          if (age % 150 === 100) spawnEnemy(game, 'hmissile', e.x, e.y + 8, {});
        }
        if (phase === 3) {
          if (age % 70 === 35) { fireRing(game, e.x + 10, e.y + 10, 8, 1.5, 0); fireRing(game, e.x + 10, e.y + 10, 8, 1.5, 0.39); }
          if (age % 60 === 20) for (const s of [-0.25, 0, 0.25]) fireAimed(game, e.x + 10, e.y + 10, 2.0, s);
          if (age % 160 === 80) spawnEnemy(game, 'rusher', game.camX + VIEW_W + 8, 30 + (age % 140), {});
        }
        break;
      }
      case 'b4pod':
        if (!e.parent || e.parent.dead) { e.dead = true; break; }
        e.a += 0.02 + (e.parent.phase || 1) * 0.005;
        e.x = e.parent.x + 4 + Math.cos(e.a) * 42;
        e.y = clamp(e.parent.y + 4 + Math.sin(e.a) * 42, 4, PLAY_H - 16);
        if (age % 130 === (e.i * 30) % 130) fireAimed(game, e.x + 6, e.y + 6, 1.6);
        break;
    }
    // chain bookkeeping when a member escapes
    if (e.chain !== undefined && e.chain !== -1 && e.x + e.w < game.camX - 8) {
      const ch = game.chains.get(e.chain);
      if (ch) ch.broken = true;
    }
    // cull far offscreen left (not boss parts / mids)
    if (!e.t.startsWith('b') && !e.t.startsWith('mid') && e.x + e.w < game.camX - 48) e.dead = true;
  }
  game.enemies = game.enemies.filter((e) => !e.dead);
}

// ============================================================ drawing ====

const SPRITE_OF = {
  sine: 'sine', turret: 'turret', rusher: 'rusher', crawler: 'crawler',
  orb: 'orbcore', homer: 'homer', zako: 'zako', hmissile: 'emissile',
  capsule: 'capsule', capsuleR: 'capsuleR', podItem: 'podItem',
};

export function drawEnemies(game, ctx, frame) {
  for (const e of game.enemies) {
    const sx = Math.round(e.x - game.camX), sy = Math.round(e.y);
    if (sx > VIEW_W + 24 || sx + e.w < -24) continue;
    switch (e.t) {
      case 'sine': drawSprite(ctx, e.red ? 'sineR' : 'sine', sx, sy, true); break;
      case 'zako': drawSprite(ctx, 'zako', sx, sy); break;
      case 'turret': {
        if (e.ceil) drawSprite(ctx, 'turret', sx, sy); // sprite is symmetric enough
        else drawSprite(ctx, 'turret', sx, sy);
        // barrel
        ctx.fillStyle = '#b8b8c8';
        for (let i = 3; i < 9; i += 2) {
          ctx.fillRect(sx + 5 + Math.round(Math.cos(e.aim) * i), sy + 4 + Math.round(Math.sin(e.aim) * i), 2, 2);
        }
        break;
      }
      case 'rusher': drawSprite(ctx, 'rusher', sx, sy, true); break;
      case 'crawler': drawSprite(ctx, 'crawler', sx, sy); break;
      case 'orb': drawSprite(ctx, 'orbcore', sx, sy); break;
      case 'orbbit': {
        ctx.fillStyle = '#c868f8';
        ctx.fillRect(sx, sy + 2, 8, 4);
        ctx.fillRect(sx + 2, sy, 4, 8);
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(sx + 3, sy + 3, 2, 2);
        break;
      }
      case 'homer': drawSprite(ctx, 'homer', sx, sy, true); break;
      case 'hmissile': {
        const flip = Math.cos(e.a) < 0;
        drawSprite(ctx, 'emissile', sx, sy, flip);
        ctx.fillStyle = (frame >> 1) % 2 ? '#f8d838' : '#f88820';
        ctx.fillRect(flip ? sx + e.w : sx - 2, sy + 2, 2, 2);
        break;
      }
      case 'crusher': {
        ctx.fillStyle = '#686878';
        ctx.fillRect(sx, sy, e.w, e.h);
        ctx.fillStyle = '#b8b8c8';
        ctx.fillRect(sx + 1, sy + 1, e.w - 2, 2);
        ctx.fillRect(sx + 1, sy + e.h - 3, e.w - 2, 2);
        ctx.fillStyle = '#f8d838';
        for (let yy = 4; yy < e.h - 4; yy += 8) ctx.fillRect(sx + 3, sy + yy, 3, 3);
        ctx.fillStyle = '#101018';
        for (let yy = 8; yy < e.h - 4; yy += 8) ctx.fillRect(sx + 8, sy + yy, 3, 3);
        break;
      }
      case 'capsule': drawSprite(ctx, (frame >> 3) % 2 ? 'capsule' : 'capsule', sx, sy); break;
      case 'capsuleR': drawSprite(ctx, 'capsuleR', sx, sy); break;
      case 'podItem': drawSprite(ctx, 'podItem', sx, sy); break;
      case 'mid1': {
        ctx.fillStyle = '#7828a8';
        ctx.fillRect(sx, sy + 4, e.w, e.h - 8);
        ctx.fillStyle = '#c868f8';
        ctx.fillRect(sx + 4, sy, e.w - 8, e.h);
        ctx.fillStyle = '#f8d838';
        ctx.fillRect(sx + 2, sy + e.h / 2 - 3, 6, 6);
        ctx.fillStyle = '#101018';
        ctx.fillRect(sx + 3, sy + e.h / 2 - 2, 4, 4);
        break;
      }
      case 'mid2': {
        ctx.fillStyle = '#187830';
        ctx.fillRect(sx, sy + 4, e.w, e.h - 4);
        ctx.fillStyle = '#48d858';
        ctx.fillRect(sx + 2, sy, e.w - 4, e.h - 2);
        ctx.fillStyle = '#f83838';
        ctx.fillRect(sx + 4, sy + 6, 5, 5);
        ctx.fillStyle = '#101018';
        for (let i = 0; i < e.w - 4; i += 6) ctx.fillRect(sx + 2 + i, sy + e.h - 2, 4, 2);
        break;
      }
      case 'mid3': {
        ctx.fillStyle = '#283048';
        ctx.fillRect(sx, sy + 3, e.w, e.h - 6);
        ctx.fillStyle = '#68789a';
        ctx.fillRect(sx + 3, sy, e.w - 6, e.h);
        ctx.fillStyle = '#f83838';
        ctx.fillRect(sx + 1, sy + e.h / 2 - 2, 5, 4);
        break;
      }
      case 'mid4': {
        ctx.fillStyle = '#183828';
        ctx.fillRect(sx + 6, sy, e.w - 6, e.h);
        ctx.fillStyle = '#488870';
        ctx.fillRect(sx + 8, sy + 2, e.w - 10, e.h - 4);
        // front plate
        ctx.fillStyle = e.closed ? '#b8b8c8' : '#500a30';
        ctx.fillRect(sx, sy + 2, 6, e.h - 4);
        if (!e.closed) {
          ctx.fillStyle = (frame >> 2) % 2 ? '#f83838' : '#f8b0b0';
          ctx.fillRect(sx + 8, sy + e.h / 2 - 3, 6, 6);
        }
        break;
      }
      case 'b1core':
        drawSprite(ctx, (frame >> 3) % 2 ? 'coreOpen' : 'coreOpen', sx, sy);
        break;
      case 'b1rock': {
        ctx.fillStyle = '#4a4038';
        ctx.fillRect(sx, sy + 2, e.w, e.h - 4);
        ctx.fillRect(sx + 2, sy, e.w - 4, e.h);
        ctx.fillStyle = '#a89880';
        ctx.fillRect(sx + 2, sy + 2, 4, 3);
        break;
      }
      case 'b2body': {
        // organic mass filling the right side
        ctx.fillStyle = '#500a30';
        ctx.fillRect(sx, sy, e.w + 40, e.h + 60);
        ctx.fillStyle = '#881848';
        for (let i = 0; i < 6; i++) {
          const p = 1 + Math.sin((frame + i * 17) / 25) * 0.12;
          ctx.beginPath();
          ctx.ellipse(sx + 16 + (i % 2) * 26, sy + 8 + i * 12, 14 * p, 9 * p, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // head
        ctx.fillStyle = '#b83868';
        ctx.beginPath(); ctx.ellipse(sx + 8, sy + 12, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f8d838';
        ctx.fillRect(sx + 1, sy + 9, 4, 3);
        break;
      }
      case 'b2seg': {
        ctx.fillStyle = '#881848';
        ctx.beginPath(); ctx.arc(sx + 4, sy + 4, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e858a8';
        ctx.fillRect(sx + 2, sy + 2, 3, 3);
        break;
      }
      case 'b2core':
        drawSprite(ctx, e.closed ? 'coreClosed' : 'coreOpen', sx, sy);
        break;
      case 'b3hull': {
        ctx.fillStyle = '#283048';
        ctx.fillRect(sx, sy, e.w, e.h);
        ctx.fillStyle = '#485068';
        ctx.fillRect(sx + 2, sy + 2, e.w - 4, e.h - 4);
        ctx.fillStyle = '#98a8c8';
        for (let i = 4; i < e.w - 4; i += 10) ctx.fillRect(sx + i, sy + 3, 2, 2);
        break;
      }
      case 'b3turret': {
        ctx.fillStyle = '#404858';
        ctx.fillRect(sx, sy, e.w, e.h);
        ctx.fillStyle = '#f83838';
        ctx.fillRect(sx + 2, sy + 4, 5, 5);
        ctx.fillStyle = '#b8b8c8';
        ctx.fillRect(sx - 4, sy + 5, 5, 2);
        break;
      }
      case 'b3core':
        drawSprite(ctx, e.closed ? 'coreClosed' : 'coreOpen', sx, sy);
        break;
      case 'b4core': {
        const spr = SPR[e.closed ? 'coreClosed' : 'coreOpen'];
        if (spr) ctx.drawImage(spr, sx, sy, 20, 20);
        // pulsing aura
        ctx.fillStyle = (frame >> 2) % 2 ? '#f83838' : '#f88820';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + frame * 0.05;
          ctx.fillRect(sx + 9 + Math.round(Math.cos(a) * 15), sy + 9 + Math.round(Math.sin(a) * 15), 2, 2);
        }
        break;
      }
      case 'b4pod': {
        ctx.fillStyle = '#2a5848';
        ctx.fillRect(sx, sy + 2, e.w, e.h - 4);
        ctx.fillRect(sx + 2, sy, e.w - 4, e.h);
        ctx.fillStyle = '#78c8a0';
        ctx.fillRect(sx + 3, sy + 3, e.w - 6, e.h - 6);
        ctx.fillStyle = '#f83838';
        ctx.fillRect(sx + 4, sy + 4, 4, 4);
        break;
      }
    }
    if (e.flash > 0 && !e.pickup) {
      ctx.fillStyle = 'rgba(248,248,248,0.6)';
      ctx.fillRect(sx, sy, e.w, e.h);
    }
  }
}

// ============================================================ boss setup ====

export function spawnBoss(game) {
  const bx = game.stage.bossX;
  let core;
  switch (game.stage.boss) {
    case 'golem': {
      core = spawnEnemy(game, 'b1core', bx + 182, 88, {});
      for (let i = 0; i < 6; i++) {
        spawnEnemy(game, 'b1rock', core.x, core.y, { parent: core, a: (i / 6) * Math.PI * 2 });
      }
      break;
    }
    case 'dobker': {
      const body = spawnEnemy(game, 'b2body', bx + 186, 8, {});
      core = spawnEnemy(game, 'b2core', bx + 172, 96, {});
      for (let i = 0; i < 9; i++) {
        spawnEnemy(game, 'b2seg', bx + 170, 160, { base: { x: bx + 196, y: 176 }, i, coreRef: core });
      }
      body.coreRef = core;
      break;
    }
    case 'carrier': {
      // hull slabs: top, bottom, back
      spawnEnemy(game, 'b3hull', bx + 168, 48, { w: 88, h: 22 });
      spawnEnemy(game, 'b3hull', bx + 168, 130, { w: 88, h: 22 });
      spawnEnemy(game, 'b3hull', bx + 216, 70, { w: 40, h: 60 });
      spawnEnemy(game, 'b3turret', bx + 170, 36, { top: true });
      spawnEnemy(game, 'b3turret', bx + 170, 152, {});
      core = spawnEnemy(game, 'b3core', bx + 184, 92, {});
      break;
    }
    case 'mother': {
      core = spawnEnemy(game, 'b4core', bx + 190, 90, {});
      for (let i = 0; i < 4; i++) {
        spawnEnemy(game, 'b4pod', core.x, core.y, { parent: core, a: (i / 4) * Math.PI * 2, i });
      }
      break;
    }
  }
  return core;
}
