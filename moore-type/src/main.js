// Moore-Type — main loop, states, scroll camera, HUD, power chain.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, drawSprite, drawTile, drawBackdrop, drawBoom, THEMES } from './sprites.js';
import { TILE, ROWS, PLAY_H, STAGES, ENDING, tileAt } from './levels.js';
import {
  Player, spawnEnemy, spawnWave, spawnBoss, updateEnemies, drawEnemies, damageEnemy,
  updatePBullets, drawPBullets, updateEBullets, drawEBullets, overlap, VIEW_W,
} from './entities.js';

const VIEW_H = 224;
const SEL_NAMES = ['SPD', 'MIS', 'DBL', 'LAS', 'SHD'];

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
  c.font = `${size}px monospace`;
  c.textAlign = align;
  c.textBaseline = 'top';
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
    this.goSel = 0;
    this.hi = +(localStorage.getItem('moore-type-hi') || 0);
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  saveHi() {
    if (this.score > this.hi) this.hi = this.score;
    try { localStorage.setItem('moore-type-hi', String(this.hi)); } catch { /* private mode */ }
  }

  // ---------------- run / stage setup ----------------

  startRun() {
    this.lives = 3;
    this.score = 0;
    this.nextLifeAt = 50000;
    this.continues = 2;
    this.stageIdx = 0;
    this.sel = 0;
    this.kills = 0;
    this.stats = { shots: 0, beams: 0 };
    this.beginStage(false);
  }

  beginStage(carry) {
    this.stage = STAGES[this.stageIdx];
    this.enemies = [];
    this.pbullets = [];
    this.ebullets = [];
    this.booms = [];
    this.chains = new Map();
    this.shake = 0;
    this.spawned = new Set();
    this.camX = 0;
    const old = this.player;
    this.player = new Player(40, 96);
    if (carry && old) {
      for (const k of ['speedLvl', 'double', 'laser', 'missile', 'shieldHp', 'banked']) this.player[k] = old[k];
      if (old.pod) this.player.pod = { state: 'front', x: 0, y: 0, w: 11, h: 11 };
    }
    this.player.invuln = 90;
    this.bossOn = false;
    this.bossDown = false;
    this.bossCore = null;
    this.warned = false;
    this.warnT = 0;
    this.clearT = 0;
    this.paused = false;
    this.revengeAt = -1;
    this.state = 'intro';
    this.storyT = 0;
    this.sound.stopMusic();
  }

  enterPlay() {
    this.state = 'play';
    this.banner = THEMES[this.stage.theme].name;
    this.bannerT = 150;
    this.sound.playMusic(THEMES[this.stage.theme].music);
  }

  // ---------------- helpers used by entities ----------------

  addScore(n) {
    this.score += n;
    if (this.score > this.hi) this.hi = this.score;
    if (this.score >= this.nextLifeAt) {
      this.lives++;
      this.nextLifeAt += 50000;
      this.sound.oneUp();
    }
  }

  addBoom(x, y, big) {
    this.booms.push({ x, y, t: 0, big });
    if (big) this.shake = 8;
  }

  advanceSel(n) {
    for (let i = 0; i < n; i++) this.sel = (this.sel % 5) + 1;
  }

  bankPower() {
    if (this.sel === 0) return;
    const P = this.player;
    switch (this.sel) {
      case 1: P.speedLvl = Math.min(4, P.speedLvl + 1); break;
      case 2: P.missile = true; break;
      case 3: P.double = true; P.laser = false; break;
      case 4: P.laser = true; P.double = false; break;
      case 5: P.shieldHp = 3; break;
    }
    P.banked++;
    this.sel = 0;
    this.sound.bank();
  }

  collectPickup(e) {
    const P = this.player;
    if (e.t === 'capsule') { this.advanceSel(1); this.sound.capsule(); this.addScore(500); }
    else if (e.t === 'capsuleR') { this.advanceSel(2); this.sound.capsule(); this.addScore(1000); }
    else if (e.t === 'podItem') {
      if (P.pod) this.addScore(1000);
      else P.pod = { state: 'front', x: P.x + P.w, y: P.y, w: 11, h: 11 };
      this.sound.podToggle();
      this.addScore(500);
    }
    e.dead = true;
  }

  killPlayer() {
    const P = this.player;
    if (P.dead || P.invuln > 0) return;
    P.dead = true;
    P.deadT = 0;
    this.addBoom(P.x + 12, P.y + 6, true);
    this.sound.die();
    this.sound.chargeStop();
    if (P.banked >= 2) this.revengeAt = 1; // spawn revenge capsule on respawn
  }

  respawn() {
    this.lives--;
    this.saveHi();
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.goSel = 0;
      this.sound.stopMusic();
      return;
    }
    // find checkpoint
    let cp = 0;
    for (const c of this.stage.checkpoints) if (c <= this.camX) cp = c;
    if (this.bossOn) cp = this.stage.checkpoints[this.stage.checkpoints.length - 1];
    this.camX = Math.min(cp, this.stage.bossX - 8);
    this.enemies = [];
    this.pbullets = [];
    this.ebullets = [];
    this.chains = new Map();
    this.bossOn = false;
    this.bossCore = null;
    this.warned = false;
    this.warnT = 0;
    const hadRevenge = this.revengeAt > 0;
    this.revengeAt = -1;
    this.player = new Player(this.camX + 40, 96); // classic cruelty: powers lost
    this.player.invuln = 150;
    this.spawned = new Set();
    this.stage.waves.forEach((wv, i) => {
      if (wv.c * TILE - 288 < this.camX) this.spawned.add(i);
    });
    if (hadRevenge) spawnEnemy(this, 'capsuleR', this.camX + 180, 70, {});
    if (!this.sound.trackName) this.sound.playMusic(THEMES[this.stage.theme].music);
  }

  onCoreDown(e) {
    if (e !== this.bossCore) return; // mid-boss cores etc.
    this.bossDown = true;
    this.clearT = 210;
    this.sound.bossDie();
    this.sound.stopMusic();
    this.enemies = this.enemies.filter((m) => m.pickup);
    this.ebullets = [];
  }

  // ---------------- spawning / scroll ----------------

  processWaves() {
    this.stage.waves.forEach((wv, i) => {
      if (this.spawned.has(i)) return;
      if (this.camX >= wv.c * TILE - 288) {
        this.spawned.add(i);
        spawnWave(this, wv);
      }
    });
  }

  forceBoss() { // debug/test hook: jump to the boss fight
    this.spawned = new Set(this.stage.waves.map((_, i) => i));
    this.enemies = [];
    this.ebullets = [];
    this.camX = this.stage.bossX;
    this.player.x = this.camX + 40;
    this.warned = true;
  }

  spawnDebug(t, x, y, o) { return spawnEnemy(this, t, x, y, o || {}); }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;
    const P = this.player;

    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (this.paused) return;

    // auto-scroll
    if (!this.bossOn && !this.bossDown) {
      this.camX = Math.min(this.camX + this.stage.speed, this.stage.bossX);
      if (!this.warned && this.camX >= this.stage.bossX - 200) {
        this.warned = true;
        this.warnT = 150;
        this.sound.alarm();
      }
      if (this.camX >= this.stage.bossX) {
        this.bossOn = true;
        this.bossCore = spawnBoss(this);
        this.sound.playMusic('boss');
      }
    }
    if (this.warnT > 0) this.warnT--;

    if (inp.pressed('bank')) this.bankPower();

    P.update(this, inp);
    if (P.dead && P.deadT > 70) { this.respawn(); return; }

    this.processWaves();
    updateEnemies(this);
    updatePBullets(this);
    updateEBullets(this);

    // player bullets vs enemies
    for (const b of this.pbullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.pickup || e.dead) continue;
        if (!overlap(b, e)) continue;
        const blocked = e.armored || (e.core && e.closed);
        if (blocked) { this.sound.clink(); b.dead = true; break; }
        if (b.pierce) {
          if (b.hits.has(e)) continue;
          b.hits.add(e);
          damageEnemy(this, e, b.dmg);
        } else {
          damageEnemy(this, e, b.dmg);
          b.dead = true;
          break;
        }
      }
    }
    this.pbullets = this.pbullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);

    // pickups + hostiles vs player
    if (!P.dead) {
      const hb = P.hitbox();
      const bb = P.bodybox();
      const sb = P.shieldHp > 0 ? P.shieldbox() : null;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (e.pickup) {
          if (overlap(e, bb)) this.collectPickup(e);
          continue;
        }
        if (sb && !e.armored && !e.core && e.hp <= 4 && overlap(e, sb)) {
          damageEnemy(this, e, 99);
          P.shieldHp--;
          this.sound.shieldHit();
          continue;
        }
        if (overlap(e, hb)) { this.killPlayer(); break; }
      }
      this.enemies = this.enemies.filter((e) => !e.dead);
      if (!P.dead) {
        for (const b of this.ebullets) {
          if (overlap(b, hb)) { this.killPlayer(); break; }
        }
      }
    }

    // booms
    for (const bm of this.booms) bm.t++;
    this.booms = this.booms.filter((bm) => bm.t < (bm.big ? 22 : 14));
    if (this.shake > 0) this.shake--;

    // boss defeated → stage clear
    if (this.bossDown) {
      this.clearT--;
      if (this.clearT % 12 === 0 && this.clearT > 80) {
        this.addBoom(this.camX + 40 + ((this.clearT * 53) % 180), 20 + ((this.clearT * 31) % 160), true);
        this.sound.boom();
      }
      if (this.clearT === 80) this.sound.clearJingle();
      if (this.clearT <= 0) {
        this.stageIdx++;
        if (this.stageIdx >= STAGES.length) {
          this.state = 'victory';
          this.storyT = 0;
          this.tallied = false;
          this.sound.playMusic('ending');
          this.saveHi();
        } else {
          this.beginStage(true);
        }
      }
    }
  }

  // ---------------- rendering ----------------

  drawTiles() {
    const st = this.stage;
    const x0 = Math.floor(this.camX / TILE), x1 = Math.ceil((this.camX + VIEW_W) / TILE);
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tileAt(st, tx, ty) !== 1) continue;
        const sx = tx * TILE - Math.floor(this.camX), sy = ty * TILE;
        const openUp = tileAt(st, tx, ty - 1) !== 1;
        const openDn = tileAt(st, tx, ty + 1) !== 1;
        drawTile(ctx, st.theme, sx, sy, tx, ty, openUp, openDn, this.frame);
      }
    }
  }

  drawHUD() {
    const P = this.player;
    ctx.fillStyle = '#000810';
    ctx.fillRect(0, PLAY_H, VIEW_W, VIEW_H - PLAY_H);
    ctx.fillStyle = '#283048';
    ctx.fillRect(0, PLAY_H, VIEW_W, 1);

    text(ctx, String(this.score).padStart(7, '0'), 4, PLAY_H + 3, '#f8f8f8', 7);
    text(ctx, 'HI ' + String(this.hi).padStart(7, '0'), 66, PLAY_H + 3, '#8890b8', 7);
    // lives
    for (let i = 0; i < Math.min(this.lives - 1, 4); i++) {
      ctx.fillStyle = '#3868e8';
      ctx.fillRect(180 + i * 10, PLAY_H + 4, 7, 3);
      ctx.fillStyle = '#50e8f8';
      ctx.fillRect(184 + i * 10, PLAY_H + 3, 3, 2);
    }
    if (this.lives > 5) text(ctx, `x${this.lives - 1}`, 224, PLAY_H + 3, '#f8f8f8', 7);

    // charge meter
    ctx.fillStyle = '#283048';
    ctx.fillRect(4, PLAY_H + 13, 62, 8);
    ctx.fillStyle = '#101820';
    ctx.fillRect(5, PLAY_H + 14, 60, 6);
    const cw = Math.floor((P.charge / 60) * 60);
    if (cw > 0) {
      ctx.fillStyle = P.charge >= 58 ? '#f8f8f8' : P.charge >= 40 ? '#50e8f8' : '#2090c0';
      ctx.fillRect(5, PLAY_H + 14, cw, 6);
    }
    text(ctx, 'B', 68, PLAY_H + 13, '#50e8f8', 7);

    // Gradius selector bar
    for (let i = 0; i < 5; i++) {
      const bx = 80 + i * 35;
      const active = this.sel === i + 1;
      ctx.fillStyle = active ? '#f88820' : '#101820';
      ctx.fillRect(bx, PLAY_H + 12, 33, 10);
      ctx.strokeStyle = '#283048';
      ctx.strokeRect(bx + 0.5, PLAY_H + 12.5, 32, 9);
      const owned =
        (i === 0 && P.speedLvl > 0) || (i === 1 && P.missile) || (i === 2 && P.double) ||
        (i === 3 && P.laser) || (i === 4 && P.shieldHp > 0);
      text(ctx, SEL_NAMES[i], bx + 16, PLAY_H + 14, active ? '#101018' : owned ? '#f8d838' : '#68789a', 7, 'center');
    }
  }

  drawPlay() {
    ctx.save();
    // clip play area
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, PLAY_H);
    ctx.clip();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    drawBackdrop(ctx, this.stage.theme, this.camX, this.frame, VIEW_W, PLAY_H);
    this.drawTiles();
    drawEnemies(this, ctx, this.frame);
    this.player.draw(ctx, { x: this.camX, y: 0 }, this.frame);
    drawPBullets(this, ctx);
    drawEBullets(this, ctx, this.frame);
    for (const bm of this.booms) drawBoom(ctx, bm.x - this.camX, bm.y, bm.t, bm.big);
    ctx.restore();
    this.drawHUD();

    if (this.bannerT > 0) {
      this.bannerT--;
      if (this.bannerT > 30 || this.frame % 8 < 5) {
        text(ctx, this.banner, VIEW_W / 2, 40, '#f8d838', 9, 'center');
      }
    }
    if (this.warnT > 0 && (this.frame >> 3) % 2 === 0) {
      text(ctx, 'W A R N I N G', VIEW_W / 2, 84, '#f83838', 14, 'center');
    }
    if (this.bossDown && this.clearT < 80) {
      text(ctx, 'STAGE CLEAR', VIEW_W / 2, 88, '#f8f8f8', 12, 'center');
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIEW_W, PLAY_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 96, '#f8f8f8', 12, 'center');
    }
  }

  drawTitle() {
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // starfield
    for (let i = 0; i < 40; i++) {
      const r = ((i * 73856093) ^ 19349663) >>> 0;
      const x = ((r % 256) + this.frame * (i % 3 === 0 ? 0.6 : 0.3)) % VIEW_W;
      ctx.fillStyle = i % 3 === 0 ? '#8890b8' : '#485078';
      ctx.fillRect(VIEW_W - x, (r >> 8) % VIEW_H, i % 2 ? 1 : 2, 1);
    }
    // big planet rim
    ctx.fillStyle = '#181030';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 330, 150, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#302050';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 334, 146, 0, Math.PI * 2); ctx.fill();

    text(ctx, 'M O O R E - T Y P E', VIEW_W / 2, 46, '#50e8f8', 20, 'center');
    ctx.fillStyle = '#2090c0';
    ctx.fillRect(28, 72, 200, 2);
    text(ctx, 'DEBRIS BELT ASSAULT', VIEW_W / 2, 82, '#8890b8', 8, 'center');

    // hero ship flying by
    const shipY = 118 + Math.sin(this.frame / 40) * 6;
    ctx.fillStyle = (this.frame >> 1) % 2 ? '#f8d838' : '#f88820';
    ctx.fillRect(96, shipY + 5, 6, 2);
    drawSprite(ctx, 'ship', 102, shipY);

    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP FIRE TO LAUNCH' : 'PUSH ENTER OR FIRE', VIEW_W / 2, 156, '#f8f8f8', 9, 'center');
    }
    text(ctx, 'HI ' + String(this.hi).padStart(7, '0'), VIEW_W / 2, 178, '#f8d838', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 210, '#556', 8, 'center');
  }

  updateTitle() {
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('bank')) {
      this.startRun();
    }
  }

  drawIntro() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const th = THEMES[this.stage.theme];
    text(ctx, th.name, VIEW_W / 2, 36, '#f8d838', 10, 'center');
    text(ctx, this.stage.sub, VIEW_W / 2, 54, '#8890b8', 8, 'center');
    ctx.fillStyle = '#283048';
    ctx.fillRect(38, 68, 180, 1);
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    this.stage.story.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 30, 86 + i * 13, '#c8c8d8', 8);
      used += line.length;
    });
    if (this.frame % 60 < 40) text(ctx, 'FIRE TO LAUNCH', VIEW_W / 2, 196, '#99a', 8, 'center');
  }

  updateIntro() {
    this.storyT++;
    if (this.storyT > 24 && (this.input.pressed('fire') || this.input.pressed('start') || this.input.pressed('bank'))) {
      this.enterPlay();
    }
    if (this.storyT > 420) this.enterPlay();
  }

  drawGameOver() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 64, '#f83838', 16, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(7, '0')}`, VIEW_W / 2, 96, '#f8f8f8', 8, 'center');
    text(ctx, `HI    ${String(this.hi).padStart(7, '0')}`, VIEW_W / 2, 108, '#8890b8', 8, 'center');
    if (this.continues > 0) {
      text(ctx, `${this.goSel === 0 ? '▶' : ' '} CONTINUE (${this.continues})`, VIEW_W / 2 - 8, 144, '#f8f8f8', 9, 'center');
      text(ctx, `${this.goSel === 1 ? '▶' : ' '} END`, VIEW_W / 2 - 8, 160, '#f8f8f8', 9, 'center');
    } else {
      text(ctx, 'NO CONTINUES REMAIN', VIEW_W / 2, 144, '#99a', 8, 'center');
      if (this.frame % 60 < 40) text(ctx, 'PUSH START', VIEW_W / 2, 164, '#f8f8f8', 8, 'center');
    }
  }

  updateGameOver() {
    const inp = this.input;
    if (this.continues > 0) {
      if (inp.pressed('up') || inp.pressed('down')) this.goSel = 1 - this.goSel;
      if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('bank')) {
        if (this.goSel === 0) {
          this.continues--;
          this.lives = 3;
          this.score = 0;
          this.nextLifeAt = 50000;
          this.sel = 0;
          this.beginStage(false); // restart at stage start, powers gone
        } else {
          this.state = 'title';
        }
      }
    } else if (inp.pressed('start') || inp.pressed('fire')) {
      this.state = 'title';
    }
  }

  drawVictory() {
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 30; i++) {
      const r = ((i * 2654435761) >>> 0);
      ctx.fillStyle = i % 3 ? '#485078' : '#8890b8';
      ctx.fillRect((r % 256), ((r >> 9) % 224), 1, 1);
    }
    const shipX = Math.min(200, this.storyT * 0.8);
    ctx.fillStyle = (this.frame >> 1) % 2 ? '#f8d838' : '#f88820';
    ctx.fillRect(shipX - 6, 40 + 5, 6, 2);
    drawSprite(ctx, 'ship', shipX, 40);

    text(ctx, 'MISSION COMPLETE', VIEW_W / 2, 16, '#f8d838', 12, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    ENDING.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 20, 66 + i * 12, '#c8c8d8', 8);
      used += line.length;
    });
    if (this.storyT > 200) {
      if (!this.tallied) {
        this.tallied = true;
        this.bonus = this.lives * 5000;
        this.addScore(this.bonus);
        this.saveHi();
      }
      text(ctx, `SHIPS LEFT BONUS  ${this.bonus}`, VIEW_W / 2, 170, '#f8f8f8', 8, 'center');
      text(ctx, `FINAL SCORE ${String(this.score).padStart(7, '0')}`, VIEW_W / 2, 184, '#f8d838', 9, 'center');
      if (this.frame % 60 < 40) text(ctx, 'PUSH START', VIEW_W / 2, 206, '#99a', 8, 'center');
    }
  }

  updateVictory() {
    this.storyT++;
    if (this.storyT > 240 && (this.input.pressed('start') || this.input.pressed('fire'))) {
      this.state = 'title';
      this.sound.stopMusic();
    }
  }

  // ---------------- frame ----------------

  tick() {
    this.frame++;
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.sound.updateMusic();

    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'intro': this.updateIntro(); this.drawIntro(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'victory': this.updateVictory(); this.drawVictory(); break;
    }
    this.input.endFrame();
  }
}

initSprites();
const game = new Game();
window.__game = game; // for smoke tests

let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 1000 / 61) return;
  last = ts;
  game.tick();
}
requestAnimationFrame(loop);
