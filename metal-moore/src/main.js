// Metal Moore — main loop, states, camera, world rendering, HUD.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawTileId, drawBoom, drawPuff, drawSky, drawClouds,
  drawRidge, drawJungleWall, SPR, HUT, PAL, hashNoise,
} from './sprites.js';
import { TILE, T, LEVEL, tileAt, groundYpx } from './levels.js';
import {
  Player, Slug, Boss, spawnEnemy, updateEnemies, drawEnemies,
  updatePBullets, updatePNades, updateEBullets, updatePows, drawPows,
} from './entities.js';

const VIEW_W = 320, VIEW_H = 224;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H) * 2) / 2);
  canvas.style.width = `${Math.floor(VIEW_W * s)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * s)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function text(c, str, x, y, color = '#fff', size = 8, align = 'left') {
  c.font = `bold ${size}px monospace`;
  c.textAlign = align;
  c.textBaseline = 'top';
  c.fillStyle = '#1a140f';
  c.fillText(str, x + 1, y + 1);
  c.fillStyle = color;
  c.fillText(str, x, y);
}

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  startRun() {
    this.lives = 3;
    this.continues = 3;
    this.score = 0;
    this.beginMission();
  }

  beginMission() {
    this.enemies = [];
    this.pbullets = [];
    this.pnades = [];
    this.ebullets = [];
    this.enades = [];
    this.booms = [];
    this.sparks = [];
    this.puffs = [];
    this.muzzles = [];
    this.pickups = [];
    this.toasts = [];
    this.spawned = new Set();
    this.shakeT = 0;
    this.camX = 0;
    this.player = new Player(LEVEL.start.x, LEVEL.start.y);
    this.player.y = groundYpx(Math.floor(LEVEL.start.x / TILE));
    this.slug = new Slug(LEVEL.slugCol * TILE + 8, groundYpx(LEVEL.slugCol));
    this.boss = null;
    this.bossLocked = false;
    this.clearT = 0;
    this.pows = LEVEL.pows.map((c, i) => ({
      x: c * TILE + 8, y: groundYpx(c), state: 'tied', t: 0, gift: i,
    }));
    this.state = 'mission';
    this.sound.playMusic('mission');
  }

  // ---- hooks used by entities ----
  addBoom(x, y, size = 16) {
    this.booms.push({ x, y, size, t: 0, seed: 1 + (this.frame % 97) });
    this.sound.boom();
  }
  addScore(n) { this.score += n; }
  shake(n) { this.shakeT = Math.max(this.shakeT, n); }
  toast(msg) { this.toasts.push({ msg, t: 0 }); }
  onPlayerDeath() {}
  onBossDown() {
    this.addScore(10000);
    this.sound.stopMusic();
  }

  // ---------------- update ----------------
  update() {
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();

    if (this.state === 'title') {
      this.sound.playMusic('title');
      if (this.input.pressed('start') || this.input.pressed('fire')) {
        this.startRun();
      }
    } else if (this.state === 'mission') {
      this.updateMission();
    } else if (this.state === 'dead-wait') {
      if (--this.deadWaitT <= 0) {
        if (this.lives > 0) {
          this.lives--;
          this.respawn();
        } else if (this.continues > 0) {
          this.state = 'continue';
          this.continueT = 60 * 10;
        } else {
          this.gameOver();
        }
      }
      this.updateWorld(false);
    } else if (this.state === 'continue') {
      if (--this.continueT <= 0) this.gameOver();
      if (this.input.pressed('start') || this.input.pressed('fire')) {
        this.continues--;
        this.lives = 2;
        this.score = this.score; // keep score, Metal Slug style
        this.respawn();
      }
    } else if (this.state === 'victory') {
      this.clearT++;
      this.updateWorld(false);
      if (this.clearT === 130) this.sound.playMusic('win');
      if (this.clearT > 420 && (this.input.pressed('start') || this.input.pressed('fire'))) {
        this.state = 'title';
        this.sound.stopMusic();
      }
    } else if (this.state === 'gameover') {
      if (this.input.pressed('start') || this.input.pressed('fire')) {
        this.state = 'title';
        this.sound.stopMusic();
      }
    }
    this.input.endFrame();
    this.frame++;
  }

  respawn() {
    const p = this.player;
    p.state = 'alive';
    p.deadT = 0;
    p.inv = 150;
    p.weapon = 'pistol';
    p.nades = Math.max(p.nades, 10);
    p.x = Math.max(24, Math.min(p.x, LEVEL.endX - 24));
    p.y = 0;
    p.vy = 0;
    // put him back on solid ground near where he fell
    p.y = (() => {
      for (let ty = 0; ty < LEVEL.g.h; ty++) {
        const t = tileAt(LEVEL.g, Math.floor(p.x / TILE), ty);
        if (t !== T.EMPTY) return ty * TILE;
      }
      return 176;
    })();
    this.state = 'mission';
  }

  gameOver() {
    this.state = 'gameover';
    this.sound.playMusic('over');
  }

  updateMission() {
    const p = this.player;
    p.update(this);
    if (p.state === 'dead' && p.deadT === 1) {
      this.deadWaitT = 100;
      this.state = 'dead-wait';
    }

    // camera: follow, lock at boss arena
    const lock = this.bossLocked ? LEVEL.bossLockX - VIEW_W : LEVEL.endX - VIEW_W;
    let target = p.x - VIEW_W * 0.38;
    this.camX = Math.max(0, Math.min(this.bossLocked ? LEVEL.bossLockX : lock, target));
    if (this.bossLocked) {
      this.camX = LEVEL.bossLockX;
      if (p.x < this.camX + 10) { p.x = this.camX + 10; }
    }

    // spawn zones
    for (let i = 0; i < LEVEL.zones.length; i++) {
      const z = LEVEL.zones[i];
      if (!this.spawned.has(i) && this.camX + VIEW_W > z.x) {
        this.spawned.add(i);
        for (const s of z.spawns) spawnEnemy(this, s.t, s.c, s.plat);
      }
    }
    // boss trigger
    if (!this.boss && p.x > LEVEL.bossLockX - 60) {
      this.bossLocked = true;
      this.boss = new Boss(LEVEL.bossX - 60, groundYpx(Math.floor(LEVEL.bossX / TILE)));
      this.sound.playMusic('boss');
      this.toast('THE IRON MOORE-DEN');
    }

    this.updateWorld(true);

    if (this.boss && this.boss.dead && this.boss.dieT > 130 && this.state === 'mission') {
      this.state = 'victory';
      this.clearT = 0;
    }
  }

  updateWorld(active) {
    if (this.slug && !this.slug.dead && !this.slug.ridden) {
      // parked slug still settles with gravity
    }
    if (active || this.state === 'dead-wait') {
      updateEnemies(this);
      updatePBullets(this);
      updatePNades(this);
      updateEBullets(this);
      updatePows(this);
      if (this.boss) this.boss.update(this);
    }
    for (const b of this.booms) b.t++;
    this.booms = this.booms.filter((b) => b.t < 46);
    for (const s of this.sparks) s.t++;
    this.sparks = this.sparks.filter((s) => s.t < 8);
    for (const s of this.puffs) s.t++;
    this.puffs = this.puffs.filter((s) => s.t < 30);
    for (const m of this.muzzles) m.t++;
    this.muzzles = this.muzzles.filter((m) => m.t < 5);
    for (const t of this.toasts) t.t++;
    this.toasts = this.toasts.filter((t) => t.t < 110);
    if (this.shakeT > 0) this.shakeT--;
  }

  // ---------------- draw ----------------
  draw() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.state === 'title') { this.drawTitle(); return; }
    if (this.state === 'gameover') { this.drawGameOver(); return; }

    const cam = {
      x: Math.round(this.camX + (this.shakeT ? (Math.random() - 0.5) * this.shakeT : 0)),
      y: this.shakeT ? (Math.random() - 0.5) * this.shakeT * 0.6 : 0,
    };

    // --- background ---
    drawSky(ctx, VIEW_W, VIEW_H, this.frame);
    drawClouds(ctx, cam.x, VIEW_W, this.frame);
    drawRidge(ctx, cam.x, VIEW_W, VIEW_H);
    drawJungleWall(ctx, cam.x, VIEW_W, VIEW_H, 176 - cam.y);

    // --- props behind tiles ---
    for (const pr of LEVEL.props) {
      const px = pr.c * TILE - cam.x;
      if (px < -90 || px > VIEW_W + 40) continue;
      const gy = groundYpx(pr.c) - cam.y;
      if (pr.t === 'hut') ctx.drawImage(HUT.c, Math.round(px - 20), Math.round(gy - HUT.H));
      else if (pr.t === 'palm') drawSprite(ctx, 'palm', px - 10, gy - 25, false);
      else drawSprite(ctx, pr.t, px - 8, gy - (pr.t === 'bush' ? 10 : pr.t === 'sign' ? 12 : pr.t === 'fence' ? 10 : 12), false);
    }

    // --- tiles (plank platforms get support legs down to the ground) ---
    const c0 = Math.floor(cam.x / TILE) - 1, c1 = c0 + Math.ceil(VIEW_W / TILE) + 2;
    for (let tx = c0; tx <= c1; tx++) {
      for (let ty = 0; ty < LEVEL.g.h; ty++) {
        const t = tileAt(LEVEL.g, tx, ty);
        if (t === T.PLANK) {
          const runEnd = tileAt(LEVEL.g, tx - 1, ty) !== T.PLANK || tileAt(LEVEL.g, tx + 1, ty) !== T.PLANK;
          if (runEnd) {
            let gy = (ty + 1) * TILE;
            while (gy < LEVEL.g.h * TILE && tileAt(LEVEL.g, tx, Math.floor(gy / TILE)) === T.EMPTY) gy += TILE;
            const x0 = tx * TILE - cam.x + (tileAt(LEVEL.g, tx - 1, ty) !== T.PLANK ? 2 : 10);
            ctx.fillStyle = PAL.d; ctx.fillRect(x0, ty * TILE + 4 - cam.y, 4, gy - ty * TILE - 4);
            ctx.fillStyle = PAL.P; ctx.fillRect(x0 + 1, ty * TILE + 4 - cam.y, 2, gy - ty * TILE - 4);
          }
        }
        if (t !== T.EMPTY) drawTileId(ctx, t, tx * TILE - cam.x, ty * TILE - cam.y);
      }
    }

    // --- actors ---
    drawPows(this, ctx, cam);
    if (this.slug) this.slug.draw(ctx, cam, this);
    drawEnemies(this, ctx, cam);
    if (this.boss) this.boss.draw(ctx, cam, this);
    this.player.draw(ctx, cam);

    // --- projectiles ---
    for (const b of this.pbullets) {
      const x = Math.round(b.x - cam.x), y = Math.round(b.y - cam.y);
      if (b.kind === 'rocket') drawSprite(ctx, 'rocket', b.vx < 0 ? x - 2 : x - 10, y - 3, b.vx < 0);
      else if (b.kind === 'shell') drawSprite(ctx, 'shell', x - 4, y - 3, false);
      else drawSprite(ctx, 'pbullet', x - 2, y - 2, false);
    }
    for (const n of this.pnades) {
      drawSprite(ctx, (n.t >> 3) % 2 ? 'grenade1' : 'grenade2', n.x - cam.x - 4, n.y - cam.y - 8, false);
    }
    for (const b of this.ebullets) {
      drawSprite(ctx, (b.t >> 2) % 2 ? 'ebullet1' : 'ebullet2', b.x - cam.x - 3, b.y - cam.y - 3, false);
    }
    for (const n of this.enades) {
      drawSprite(ctx, n.bomb ? 'shell' : ((n.t >> 3) % 2 ? 'grenade1' : 'grenade2'), n.x - cam.x - 4, n.y - cam.y - 6, false);
    }

    // --- fx ---
    for (const m of this.muzzles) {
      drawSprite(ctx, m.t < 2 ? 'muzzle1' : 'muzzle2', m.x - cam.x - 4, m.y - cam.y - 3, false);
    }
    for (const s of this.sparks) {
      ctx.fillStyle = s.t < 4 ? '#fffbe6' : '#f6851f';
      ctx.fillRect(s.x - cam.x - 1, s.y - cam.y - 1, 3, 3);
    }
    for (const s of this.puffs) drawPuff(ctx, s.x - cam.x, s.y - cam.y, s.t / 30, 5, 1);
    for (const b of this.booms) drawBoom(ctx, b.x - cam.x, b.y - cam.y, b.t / 46, b.size, b.seed);

    this.drawHud();

    if (this.state === 'continue') this.drawContinue();
    if (this.state === 'victory') this.drawVictory();
  }

  drawHud() {
    text(ctx, `${this.score}`.padStart(7, '0'), 6, 5, '#f8e4b0', 10);
    // lives as little heads
    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = '#7c4a20'; ctx.fillRect(6 + i * 10, 19, 7, 4);
      ctx.fillStyle = '#f4b98e'; ctx.fillRect(6 + i * 10, 23, 7, 4);
    }
    const p = this.player;
    const wname = p.riding ? 'VULCAN' : p.weapon === 'H' ? 'HEAVY' : p.weapon === 'R' ? 'ROCKET' : 'PISTOL';
    const wammo = p.weapon === 'pistol' && !p.riding ? '∞' : p.riding && p.weapon === 'pistol' ? '∞' : `${p.ammo}`;
    text(ctx, `${wname} ${wammo}`, VIEW_W - 6, 5, '#f8d850', 8, 'right');
    text(ctx, `BOMB x${p.nades}`, VIEW_W - 6, 16, '#9adf60', 8, 'right');
    if (p.riding) text(ctx, `SLUG ${'▮'.repeat(Math.max(0, p.riding.hp))}`, VIEW_W - 6, 27, '#63cfe8', 8, 'right');

    // boss health
    if (this.boss && !this.boss.dead) {
      const w = 120;
      const k = Math.max(0, this.boss.hp / this.boss.maxHp);
      ctx.fillStyle = '#1a140f'; ctx.fillRect(VIEW_W / 2 - w / 2 - 2, VIEW_H - 16, w + 4, 9);
      ctx.fillStyle = '#5c1616'; ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 14, w, 5);
      ctx.fillStyle = '#dc3c2c'; ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 14, Math.round(w * k), 5);
    }

    // toasts
    let ty = 40;
    for (const t of this.toasts) {
      const a = t.t < 90 ? 1 : (110 - t.t) / 20;
      ctx.globalAlpha = Math.max(0, a);
      text(ctx, t.msg, VIEW_W / 2, ty, '#f8e4b0', 10, 'center');
      ctx.globalAlpha = 1;
      ty += 13;
    }
  }

  drawTitle() {
    drawSky(ctx, VIEW_W, VIEW_H, this.frame);
    drawClouds(ctx, this.frame * 0.6, VIEW_W, this.frame);
    drawRidge(ctx, this.frame * 0.35, VIEW_W, VIEW_H);
    drawJungleWall(ctx, this.frame * 0.7, VIEW_W, VIEW_H, 200);
    ctx.fillStyle = 'rgba(20,14,8,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // big chunky logo
    const bounce = Math.min(0, -80 + this.frame * 2);
    text(ctx, 'METAL', VIEW_W / 2, 46 + bounce, '#f8d850', 34, 'center');
    text(ctx, 'MOORE', VIEW_W / 2, 80 + bounce, '#dc3c2c', 34, 'center');
    text(ctx, 'MISSION 1: THE GREEN WALL', VIEW_W / 2, 124, '#f8e4b0', 9, 'center');
    if ((this.frame >> 5) % 2) text(ctx, 'PRESS START / ENTER', VIEW_W / 2, 152, '#fff', 10, 'center');
    text(ctx, 'ARROWS/WASD MOVE · Z/SPACE JUMP · X FIRE · C BOMB', VIEW_W / 2, 190, '#c8b898', 7, 'center');
    text(ctx, 'RIDE THE MOORE SLUG · RESCUE THE POWs', VIEW_W / 2, 202, '#c8b898', 7, 'center');

    // strolling hero
    const hx = (this.frame * 0.8) % (VIEW_W + 60) - 30;
    drawSprite(ctx, `l_run${1 + Math.floor(this.frame / 5) % 6}`, hx - 10, 214 - 13, false);
    drawSprite(ctx, 't_aim', hx - 13, 214 - 29, false);
  }

  drawContinue() {
    ctx.fillStyle = 'rgba(10,6,4,0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const sec = Math.ceil(this.continueT / 60);
    text(ctx, 'CONTINUE?', VIEW_W / 2, 80, '#f8d850', 20, 'center');
    text(ctx, `${sec}`, VIEW_W / 2, 110, '#fff', 26, 'center');
    text(ctx, `CREDITS ${this.continues}  ·  PRESS START`, VIEW_W / 2, 150, '#f8e4b0', 9, 'center');
  }

  drawVictory() {
    if (this.clearT < 90) return;
    const a = Math.min(1, (this.clearT - 90) / 40);
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#0a0604';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
    text(ctx, 'MISSION COMPLETE', VIEW_W / 2, 70, '#f8d850', 16, 'center');
    if (this.clearT > 180) {
      text(ctx, `SCORE  ${this.score}`, VIEW_W / 2, 104, '#fff', 10, 'center');
      text(ctx, `POWs RESCUED  ${LEVEL.pows.length - this.pows.filter((w) => w.state === 'tied').length}/${LEVEL.pows.length}`, VIEW_W / 2, 120, '#9adf60', 10, 'center');
    }
    if (this.clearT > 420 && (this.clearT >> 5) % 2) {
      text(ctx, 'PRESS START', VIEW_W / 2, 160, '#fff', 10, 'center');
    }
  }

  drawGameOver() {
    ctx.fillStyle = '#0a0604';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 90, '#dc3c2c', 24, 'center');
    text(ctx, `SCORE ${this.score}`, VIEW_W / 2, 130, '#f8e4b0', 10, 'center');
    if ((this.frame >> 5) % 2) text(ctx, 'PRESS START', VIEW_W / 2, 160, '#fff', 9, 'center');
  }
}

// ---- sprite sheet debug view (?sheet) ----
function drawSheet() {
  const names = Object.keys(SPR);
  const SC = 4;
  canvas.width = 1240; canvas.height = 1600;
  canvas.style.width = '1240px'; canvas.style.height = '1600px';
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#303840';
  ctx.fillRect(0, 0, 1240, 1600);
  let x = 4, y = 4, rowH = 0;
  ctx.font = '7px monospace';
  for (const n of names) {
    const c = SPR[n];
    const w = c.width * SC, h = c.height * SC;
    if (x + w + 4 > 1240) { x = 4; y += rowH + 14; rowH = 0; }
    ctx.drawImage(c, x, y + 8, w, h);
    ctx.fillStyle = '#cde';
    ctx.fillText(n, x, y + 6);
    x += w + 10;
    rowH = Math.max(rowH, h);
  }
}

initSprites();

if (new URLSearchParams(location.search).has('sheet')) {
  drawSheet();
} else {
  const game = new Game();
  window.__game = game;
  let acc = 0, last = performance.now();
  const STEP = 1000 / 60;
  function loop(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) { game.update(); acc -= STEP; }
    game.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
