// Contra: Moore Force — main loop, states, camera, HUD.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawTile, drawWaterBody, drawBoom, THEMES,
} from './sprites.js';
import { TILE, T, STAGES, ENDING, tileAt, setTile } from './levels.js';
import {
  Player, spawnEnemy, updateEnemies, drawEnemies, damageEnemy,
  updatePBullets, drawPBullets, updateEBullets, drawEBullets, overlap,
} from './entities.js';

const VIEW_W = 256, VIEW_H = 240;
const KONAMI = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'jump', 'fire'];

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
    this.konamiIdx = 0;
    this.konamiOn = false;
    this.goSel = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / stage setup ----------------

  startRun() {
    this.lives = this.konamiOn ? 30 : 3;
    this.score = 0;
    this.nextLifeAt = 30000;
    this.continues = 3;
    this.stageIdx = 0;
    this.beginStage();
  }

  beginStage() {
    const src = STAGES[this.stageIdx];
    // fresh grid copy so exploded bridges come back on retry
    this.stage = { ...src, g: { w: src.g.w, h: src.g.h, d: Uint8Array.from(src.g.d) } };
    this.enemies = [];
    this.pbullets = [];
    this.ebullets = [];
    this.booms = [];
    this.fuses = [];
    this.shake = 0;
    this.spawned = new Set();
    this.zoneT = this.stage.zones.map(() => 0);
    this.camX = 0;
    this.camY = this.stage.vertical ? this.stage.g.h * TILE - VIEW_H : 0;
    this.player = new Player(this.stage.start.x, this.stage.start.y);
    this.lastSafe = { x: this.stage.start.x, y: this.stage.start.y };
    this.bossOn = false;
    this.bossDown = false;
    this.clearT = 0;
    this.waterTop = [];
    for (let x = 0; x < this.stage.g.w; x++) {
      this.waterTop[x] = -1;
      for (let y = 0; y < this.stage.g.h; y++) {
        if (tileAt(this.stage.g, x, y) === T.WATER) { this.waterTop[x] = y; break; }
      }
    }
    this.state = 'story';
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
    if (this.score >= this.nextLifeAt) {
      this.lives++;
      this.nextLifeAt += 30000;
      this.sound.oneUp();
    }
  }

  addBoom(x, y, big) {
    this.booms.push({ x, y, t: 0, big });
    if (big) this.shake = 8;
  }

  collect(d) {
    this.sound.collect();
    this.addScore(500);
    if (d === 'B') this.player.barrier = 540;
    else this.player.weapon = d;
  }

  igniteBridge(tx, ty) {
    if (this.fuses.some((f) => f.tx === tx && f.ty === ty)) return;
    this.fuses.push({ tx, ty, t: 0 });
  }

  updateFuses() {
    for (const f of this.fuses) {
      f.t++;
      if (f.t === 40) {
        setTile(this.stage.g, f.tx, f.ty, T.EMPTY);
        this.addBoom(f.tx * TILE + 8, f.ty * TILE + 4, false);
        this.sound.boom();
        for (const nx of [f.tx - 1, f.tx + 1]) {
          if (tileAt(this.stage.g, nx, f.ty) === T.BRIDGE) this.igniteBridge(nx, f.ty);
        }
      }
    }
    this.fuses = this.fuses.filter((f) => f.t < 40);
  }

  onBossPartDown(part) {
    const vital = { wall: 'b_core', idol: 'b_idol', tank: 'b_tank', heart: 'b_heart' }[this.stage.boss];
    if (part.t !== vital) return;
    this.bossDown = true;
    this.clearT = 200;
    this.addScore(10000);
    this.sound.bossDie();
    this.sound.stopMusic();
    // remove remaining hostiles in a shower of fire
    for (const e of this.enemies) if (!e.harmless) this.addBoom(e.x + e.w / 2, e.y + e.h / 2, false);
    this.enemies = this.enemies.filter((e) => e.harmless && e.t !== 'nest');
    this.ebullets = [];
  }

  killPlayer() {
    if (this.player.dead || this.player.invuln > 0 || this.player.barrier > 0) return;
    this.player.dead = true;
    this.player.vy = -3.2;
    this.player.vx = -this.player.face * 0.6;
    this.sound.die();
  }

  respawn() {
    this.lives--;
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.goSel = 0;
      this.sound.stopMusic();
      return;
    }
    const p = new Player(this.lastSafe.x, this.lastSafe.y - 6);
    p.invuln = 130;
    this.player = p;
  }

  // ---------------- boss spawning ----------------

  triggerBoss() {
    this.bossOn = true;
    this.sound.playMusic('boss');
    const g = this.stage.g;
    const right = g.w * TILE;
    if (this.stage.boss === 'wall') {
      const bx = 221 * TILE;
      spawnEnemy(this, 'b_gun', bx - 16, 56, { phase: 0 });
      spawnEnemy(this, 'b_gun', bx - 16, 120, { phase: 1 });
      spawnEnemy(this, 'b_core', bx - 20, 11 * TILE - 24);
    } else if (this.stage.boss === 'idol') {
      spawnEnemy(this, 'b_idol', (VIEW_W - 44) / 2, 24);
    } else if (this.stage.boss === 'tank') {
      spawnEnemy(this, 'b_tank', right - 100, 12 * TILE - 44, { x0: right - 100 });
    } else if (this.stage.boss === 'heart') {
      const wx = 189 * TILE;
      spawnEnemy(this, 'b_heart', wx - 26, 96);
      spawnEnemy(this, 'b_mouth', wx - 18, 40, { phase: 0 });
      spawnEnemy(this, 'b_mouth', wx - 18, 118, { phase: 2 });
    }
  }

  // ---------------- spawn activation ----------------

  processSpawns() {
    const st = this.stage;
    st.spawns.forEach((s, i) => {
      if (this.spawned.has(i)) return;
      let go = false;
      if (s.t === 'capsule') {
        go = st.vertical ? this.camY <= (s.scrollY ?? 0) : s.x * TILE < this.camX + 300 && s.x * TILE > this.camX + 200;
        if (go) {
          this.spawned.add(i);
          const e = spawnEnemy(this, 'capsule', this.camX - 18, this.camY + 56, { d: s.d });
          e.y0 = e.y;
        }
        return;
      }
      if (st.vertical) {
        go = s.row * TILE < this.camY + 270 && s.row * TILE > this.camY - 40;
      } else {
        go = s.x * TILE < this.camX + 288 && s.x * TILE > this.camX - 32;
      }
      if (!go) return;
      this.spawned.add(i);
      if (s.t === 'flyernest') { spawnEnemy(this, 'nest', s.x * TILE, 0); return; }
      const e = spawnEnemy(this, s.t, s.x * TILE, 0, s.side ? { side: s.side } : {});
      if (s.ceil) { e.ceil = true; e.y = s.row * TILE; }
      else e.y = s.row * TILE - e.h;
      if (s.t === 'cannon' && !s.side) e.side = -1;
    });

    // streamed runners / flyers
    this.stage.zones.forEach((z, i) => {
      let active;
      if (z.flyer) active = this.camY > (z.y0 ?? 0) && this.camY < (z.y1 ?? 1e9) && !this.bossOn;
      else active = this.camX > (z.x0 - 14) * TILE && this.camX < z.x1 * TILE && !this.bossOn;
      if (!active) return;
      this.zoneT[i]++;
      if (this.zoneT[i] % z.rate !== z.rate - 1) return;
      if (z.flyer) {
        if (this.enemies.filter((e) => e.t === 'flyer').length < 3) {
          const fx = 40 + ((this.frame * 37) % 176);
          spawnEnemy(this, 'flyer', fx, this.camY - 12);
          this.sound.screech();
        }
        return;
      }
      const fromLeft = (this.frame % 4 === 0);
      const sx = fromLeft ? this.camX - 14 : this.camX + VIEW_W + 2;
      const col = Math.floor((sx + 7) / TILE);
      let row = -1;
      for (let y = 1; y < this.stage.g.h; y++) {
        const t = tileAt(this.stage.g, col, y);
        if (t === T.WATER) break;
        if (t === T.SOLID || t === T.PLAT || t === T.BRIDGE) { row = y; break; }
      }
      if (row < 0) return;
      spawnEnemy(this, 'runner', sx, row * TILE - 20, { face: fromLeft ? 1 : -1, vx: fromLeft ? 1.1 : -1.1 });
    });
  }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;
    const st = this.stage;
    const P = this.player;

    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (this.paused) return;

    P.update(this, inp);
    if (!P.dead) P.lastAim = P.aim(inp);

    // camera (forward-only, Contra style)
    if (st.vertical) {
      this.camY = Math.max(0, Math.min(this.camY, P.y - 132));
      if (!this.bossOn && !this.bossDown && this.camY <= 4) { this.camY = 0; this.triggerBoss(); }
    } else {
      const lockX = st.g.w * TILE - VIEW_W;
      this.camX = Math.min(lockX, Math.max(this.camX, P.x - 108));
      if (!this.bossOn && !this.bossDown && this.camX >= lockX - 2) { this.camX = lockX; this.triggerBoss(); }
    }

    // record a safe respawn point
    if (!P.dead && (P.onGround || P.wading) && P.y < st.g.h * TILE - 8) {
      this.lastSafe = { x: P.x, y: P.y };
    }

    // fell off the world
    if (!P.dead && P.y > this.camY + VIEW_H + 12) this.killPlayer();
    if (P.dead && P.deadT === 1) { /* freeze bullets a beat */ }
    if (P.dead && P.deadT > 80) this.respawn();

    this.processSpawns();
    this.updateFuses();
    updateEnemies(this);
    updatePBullets(this);
    updateEBullets(this);

    // player bullets vs enemies
    for (const b of [...this.pbullets]) {
      for (const e of [...this.enemies]) {
        if (e.harmless || e.invis) continue;
        if (!overlap(b, e)) continue;
        if (b.pierce) {
          if (b.hits.has(e)) continue;
          b.hits.add(e);
          damageEnemy(this, e, b.dmg);
        } else {
          damageEnemy(this, e, b.dmg);
          this.pbullets = this.pbullets.filter((x) => x !== b);
          break;
        }
      }
    }

    // hostiles vs player
    if (!P.dead && !P.diving) {
      const hb = P.hitbox();
      for (const b of this.ebullets) {
        if (overlap(b, hb)) { this.killPlayer(); break; }
      }
      for (const e of this.enemies) {
        if (e.harmless || e.noTouch || e.invis) continue;
        if (overlap(e, hb)) { this.killPlayer(); break; }
      }
    }

    // booms
    for (const bm of this.booms) bm.t++;
    this.booms = this.booms.filter((bm) => bm.t < (bm.big ? 22 : 14));
    if (this.shake > 0) this.shake--;

    // boss defeated → stage clear
    if (this.bossDown) {
      this.clearT--;
      if (this.clearT % 12 === 0 && this.clearT > 60) {
        this.addBoom(this.camX + 40 + ((this.clearT * 53) % 180), this.camY + 30 + ((this.clearT * 31) % 160), true);
        this.sound.boom();
      }
      if (this.clearT === 60) this.sound.clearJingle();
      if (this.clearT <= 0) {
        this.stageIdx++;
        if (this.stageIdx >= STAGES.length) {
          this.state = 'ending';
          this.storyT = 0;
          this.sound.playMusic('ending');
        } else {
          this.beginStage();
        }
      }
    }
  }

  // ---------------- rendering ----------------

  drawBackground() {
    const th = THEMES[this.stage.theme];
    ctx.fillStyle = th.sky0;
    ctx.fillRect(0, 0, VIEW_W, 120);
    ctx.fillStyle = th.sky1;
    ctx.fillRect(0, 120, VIEW_W, 120);
    const k = this.stage.key;
    if (k === 'jungle') {
      ctx.fillStyle = '#0f2818';
      for (let i = 0; i < 18; i++) {
        const wx = i * 16 - ((this.camX * 0.4) % 16);
        const hh = 34 + Math.sin((i + Math.floor(this.camX * 0.4 / 16)) * 1.7) * 12;
        ctx.fillRect(wx, 128 - hh, 17, hh + 60);
      }
    } else if (k === 'falls') {
      // the waterfall itself, always thundering down mid-screen
      for (let x = 72; x < 184; x += 8) {
        const ph = ((this.frame * 3 + x * 5 + this.camY) >> 4) % 2;
        ctx.fillStyle = ph ? '#28507e' : '#356094';
        ctx.fillRect(x, 0, 8, VIEW_H);
      }
      ctx.fillStyle = '#a8d8f8';
      for (let i = 0; i < 8; i++) {
        const yy = ((i * 67 + this.frame * 3) % (VIEW_H + 20)) - 10;
        ctx.fillRect(80 + ((i * 41) % 96), yy, 2, 8);
      }
    } else if (k === 'base') {
      ctx.fillStyle = '#181026';
      for (let i = 0; i < 10; i++) {
        const wx = i * 32 - ((this.camX * 0.5) % 32);
        ctx.fillRect(wx, 40 + ((i * 13) % 30), 20, 200);
      }
      ctx.fillStyle = '#f8d838';
      for (let i = 0; i < 14; i++) {
        const wx = (i * 47 - this.camX * 0.5) % VIEW_W;
        if ((i + (this.frame >> 5)) % 3 === 0) ctx.fillRect((wx + VIEW_W) % VIEW_W, 60 + ((i * 29) % 120), 2, 2);
      }
    } else if (k === 'hive') {
      for (let i = 0; i < 7; i++) {
        const wx = ((i * 53 - this.camX * 0.4) % (VIEW_W + 60)) - 30;
        const p = 1 + Math.sin((this.frame + i * 20) / 30) * 0.15;
        ctx.fillStyle = '#2a0c20';
        ctx.beginPath();
        ctx.ellipse((wx + VIEW_W + 60) % (VIEW_W + 60) - 30, 50 + ((i * 37) % 140), 26 * p, 34 * p, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawTiles() {
    const g = this.stage.g;
    const x0 = Math.floor(this.camX / TILE), x1 = Math.ceil((this.camX + VIEW_W) / TILE);
    const y0 = Math.floor(this.camY / TILE), y1 = Math.ceil((this.camY + VIEW_H) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(g, tx, ty);
        const sx = tx * TILE - this.camX, sy = ty * TILE - this.camY;
        if (t === T.EMPTY) {
          if (this.waterTop[tx] >= 0 && ty > this.waterTop[tx]) drawWaterBody(ctx, sx, sy);
          continue;
        }
        const topOpen = tileAt(g, tx, ty - 1) !== T.SOLID;
        drawTile(ctx, t, this.stage.theme, sx, sy, this.frame, topOpen);
      }
    }
  }

  drawHUD() {
    text(ctx, `${String(this.score).padStart(6, '0')}`, 6, 4, '#f8f8f8');
    for (let i = 0; i < Math.min(this.lives, 6); i++) {
      ctx.fillStyle = '#f82818';
      ctx.fillRect(6 + i * 8, 15, 5, 3);
      ctx.fillStyle = '#f8b088';
      ctx.fillRect(6 + i * 8, 18, 5, 4);
    }
    if (this.lives > 6) text(ctx, `x${this.lives}`, 54, 14, '#f8f8f8');
    const w = this.player.weapon;
    text(ctx, w === 'N' ? 'R' : w, 250, 4, '#f8d838', 8, 'right');
    if (this.player.barrier > 0) text(ctx, 'B', 250, 14, '#40d8d8', 8, 'right');
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawBackground();
    this.drawTiles();
    drawEnemies(this, ctx, this.frame);
    this.player.draw(ctx, { x: this.camX, y: this.camY }, this.frame);
    drawPBullets(this, ctx);
    drawEBullets(this, ctx, this.frame);
    for (const bm of this.booms) drawBoom(ctx, bm.x - this.camX, bm.y - this.camY, bm.t, bm.big);
    ctx.restore();
    this.drawHUD();
    if (this.bannerT > 0) {
      this.bannerT--;
      if (this.bannerT > 30 || this.frame % 8 < 5) {
        text(ctx, this.banner, VIEW_W / 2, 60, '#f8d838', 8, 'center');
      }
    }
    if (this.bossDown && this.clearT < 60) {
      text(ctx, 'AREA SECURED', VIEW_W / 2, 100, '#f8f8f8', 10, 'center');
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 110, '#f8f8f8', 12, 'center');
    }
  }

  drawTitle() {
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // jungle silhouette
    ctx.fillStyle = '#0f2818';
    for (let i = 0; i < 17; i++) {
      const hh = 20 + Math.sin(i * 1.9) * 10;
      ctx.fillRect(i * 16, VIEW_H - 40 - hh, 17, hh + 40);
    }
    // big setting sun
    ctx.fillStyle = '#b02818';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 150, 46, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e07820';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 150, 34, Math.PI, 0); ctx.fill();

    text(ctx, 'C O N T R A', VIEW_W / 2, 46, '#f82818', 26, 'center');
    text(ctx, 'MOORE FORCE', VIEW_W / 2, 78, '#f8d838', 14, 'center');
    text(ctx, 'ONE SOLDIER. NO BACKUP.', VIEW_W / 2, 100, '#99a', 8, 'center');
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP FIRE TO START' : 'PUSH ENTER OR FIRE', VIEW_W / 2, 176, '#f8f8f8', 9, 'center');
    }
    if (this.konamiOn) text(ctx, '30 LIVES — MOORE CODE ARMED', VIEW_W / 2, 192, '#40d8d8', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 220, '#556', 8, 'center');

    drawSprite(ctx, 'p_run1', 30, VIEW_H - 66, false);
    drawSprite(ctx, 'e_run1', 210, VIEW_H - 62, true);
  }

  updateTitle() {
    const inp = this.input;
    for (const a of ['up', 'down', 'left', 'right', 'jump', 'fire', 'start']) {
      if (!inp.pressed(a)) continue;
      if (a === KONAMI[this.konamiIdx]) {
        this.konamiIdx++;
        if (this.konamiIdx === KONAMI.length) {
          this.konamiOn = true;
          this.konamiIdx = 0;
          this.sound.konami();
          return;
        }
        if (a === 'jump' || a === 'fire') return; // still entering the code
      } else {
        this.konamiIdx = a === 'up' ? 1 : 0;
      }
      if (a === 'start' || a === 'fire' || a === 'jump') {
        this.startRun();
      }
    }
  }

  drawStory() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const th = THEMES[this.stage.theme];
    text(ctx, th.name, VIEW_W / 2, 40, '#f8d838', 9, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    this.stage.story.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 24, 80 + i * 14, '#c8c8d8', 8);
      used += line.length;
    });
    if (this.frame % 60 < 40) text(ctx, 'FIRE TO DEPLOY', VIEW_W / 2, 200, '#99a', 8, 'center');
  }

  updateStory() {
    this.storyT++;
    if (this.storyT > 30 && (this.input.pressed('fire') || this.input.pressed('start') || this.input.pressed('jump'))) {
      this.enterPlay();
    }
    if (this.storyT > 480) this.enterPlay();
  }

  drawGameOver() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 70, '#f82818', 16, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 100, '#f8f8f8', 8, 'center');
    if (this.continues > 0) {
      text(ctx, `${this.goSel === 0 ? '▶' : ' '} CONTINUE (${this.continues})`, VIEW_W / 2 - 8, 140, '#f8f8f8', 9, 'center');
      text(ctx, `${this.goSel === 1 ? '▶' : ' '} END`, VIEW_W / 2 - 8, 156, '#f8f8f8', 9, 'center');
    } else {
      text(ctx, 'NO CONTINUES REMAIN', VIEW_W / 2, 140, '#99a', 8, 'center');
      if (this.frame % 60 < 40) text(ctx, 'PUSH START', VIEW_W / 2, 160, '#f8f8f8', 8, 'center');
    }
  }

  updateGameOver() {
    const inp = this.input;
    if (this.continues > 0) {
      if (inp.pressed('up') || inp.pressed('down')) this.goSel = 1 - this.goSel;
      if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
        if (this.goSel === 0) {
          this.continues--;
          this.lives = this.konamiOn ? 30 : 3;
          this.score = 0;
          this.nextLifeAt = 30000;
          this.beginStage();
        } else {
          this.state = 'title';
        }
      }
    } else if (inp.pressed('start') || inp.pressed('fire')) {
      this.state = 'title';
    }
  }

  drawEnding() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // sunrise
    const rise = Math.min(60, this.storyT / 8);
    ctx.fillStyle = '#e07820';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 250 - rise, 40, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f8d838';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 250 - rise, 26, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 210, VIEW_W, 30);
    drawSprite(ctx, 'p_stand', VIEW_W / 2 - 8, 188, false);

    text(ctx, 'MISSION COMPLETE', VIEW_W / 2, 26, '#f8d838', 12, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    ENDING.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 16, 52 + i * 12, '#c8c8d8', 8);
      used += line.length;
    });
    text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 180, '#f8f8f8', 8, 'center');
  }

  updateEnding() {
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
      case 'story': this.updateStory(); this.drawStory(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'ending': this.updateEnding(); this.drawEnding(); break;
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
