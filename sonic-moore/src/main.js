// Sonic Moore — main loop, states, camera, parallax, HUD, screens.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, SPR, bakeTerrainTile, drawCentered, drawRing } from './sprites.js';
import { TILE, LEVELS } from './levels.js';
import { Player, makeEnts, updateEnts, drawEnts } from './entities.js';
import { DEG } from './physics.js';

const VIEW_W = 320, VIEW_H = 224;
const TIME_LIMIT = 10 * 60 * 60; // 10 minutes at 60fps

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

function fmtTime(frames) {
  const s = Math.floor(frames / 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.cam = { x: 0, y: 0 };
    this.shake = 0;
    this.hiscore = Number(localStorage.getItem('sonic-moore-hiscore') || 0);
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  saveHiscore() {
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
      try { localStorage.setItem('sonic-moore-hiscore', String(this.hiscore)); } catch { /* ok */ }
    }
  }

  // input adapter: during the goal sequence the player auto-runs right
  playInput() {
    if (this.autoRun) return { down: (a) => a === 'right', pressed: () => false };
    return { down: (a) => this.input.down(a), pressed: (a) => this.input.pressed(a) };
  }

  // ---------------- run / act setup ----------------

  startRun() {
    this.lives = 3;
    this.score = 0;
    this.levelIdx = 0;
    this.builtIdx = -1;
    this.beginAct();
  }

  beginAct() {
    this.levelDef = LEVELS[this.levelIdx];
    if (this.builtIdx !== this.levelIdx) {
      this.level = this.levelDef.build();
      this.builtIdx = this.levelIdx;
      this.tileCache = new Map();
    }
    this.checkpoint = null;
    this.timeOver = false;
    this.resetAct(this.level.startX, this.level.startY, 0);
    this.state = 'actcard';
    this.cardT = 0;
    this.sound.stopMusic();
    this.sound.setTempo(1);
  }

  resetAct(px, py, time) {
    this.ents = makeEnts(this.level);
    this.rings = 0;
    this.time = time;
    this.paused = false;
    this.autoRun = false;
    this.goalT = 0;
    this.bossAlive = !!this.levelDef.boss;
    this.bossActive = false;
    this.player = new Player(px, py);
    this.cam.x = Math.max(0, Math.min(px - 160, this.level.wPx - VIEW_W));
    this.cam.y = Math.max(0, Math.min(py - 112, this.level.hPx - VIEW_H));
    this.lookX = 0;
  }

  enterPlay() {
    this.state = 'play';
    this.sound.playMusic(this.levelDef.music);
  }

  respawn() {
    this.lives--;
    this.saveHiscore();
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.goT = 0;
      this.sound.stopMusic();
      this.sound.gameOverTune();
      return;
    }
    const cp = this.checkpoint;
    if (cp) this.resetAct(cp.x, cp.y - 12, this.timeOver ? 0 : cp.time);
    else this.resetAct(this.level.startX, this.level.startY, 0);
    this.timeOver = false;
    this.state = 'play';
    this.sound.setTempo(1);
    this.sound.playMusic(this.levelDef.music);
  }

  // ---------------- helpers used by entities ----------------

  addScore(n) { this.score += n; }

  addRing(n) {
    const before = this.rings;
    this.rings += n;
    this.sound.ring();
    if (Math.floor(before / 100) < Math.floor(this.rings / 100)) {
      this.lives++;
      this.sound.oneUp();
    }
  }

  scatterRings(n) {
    const p = this.player;
    let a = 101.25 * DEG, flip = false, spd = 4;
    for (let i = 0; i < n; i++) {
      if (i === 16) { spd = 2; a = 101.25 * DEG; flip = false; }
      const vx = Math.cos(a) * spd * (flip ? -1 : 1);
      const vy = -Math.sin(a) * spd;
      this.ents.push({ t: 'sring', x: p.x, y: p.y, vx, vy, tm: 0, dead: false });
      if (flip) a += 22.5 * DEG;
      flip = !flip;
    }
  }

  setCheckpoint(e) {
    this.checkpoint = { x: e.x, y: e.y, time: this.time };
  }

  startGoal(sign) {
    this.autoRun = true;
    this.goalT = 0;
    this.goalSign = sign;
    this.sound.stopMusic();
    this.sound.actClear();
  }

  bossDefeated() {
    this.bossAlive = false;
    this.bossActive = false;
    this.sound.stopMusic();
    this.sound.actClear();
    const z = this.level.bossZone;
    const sx = (z.x0 + z.x1) / 2 + 80;
    this.ents.push({
      t: 'sign', x: sx, y: this.level.groundAt(sx) - 26, hit: false, spinT: 0, dead: false,
    });
  }

  beginTally() {
    this.state = 'tally';
    this.tallyT = 0;
    const sec = Math.floor(this.time / 60);
    this.timeBonus =
      sec < 30 ? 50000 : sec < 45 ? 10000 : sec < 60 ? 5000 :
      sec < 90 ? 4000 : sec < 120 ? 3000 : sec < 180 ? 2000 : sec < 240 ? 1000 : 500;
    this.ringBonus = this.rings * 100;
    this.tallyDoneT = 0;
  }

  nextAct() {
    this.saveHiscore();
    this.levelIdx++;
    if (this.levelIdx >= LEVELS.length) {
      this.state = 'ending';
      this.endT = 0;
      this.sound.playMusic('ending');
    } else {
      this.beginAct();
    }
  }

  // ---------------- play ----------------

  updatePlay() {
    const inp = this.input;
    const P = this.player;

    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (this.paused) return;

    if (!this.autoRun && !P.dead) {
      this.time++;
      if (this.time >= TIME_LIMIT) {
        this.timeOver = true;
        P.die(this);
      }
    }

    P.update(this);

    // bottomless pit / fell off world
    if (!P.dead && P.y > this.level.hPx + 32) P.die(this);
    if (P.dead && P.deadT > 100) this.respawn();

    // boss trigger + arena lock
    if (this.bossAlive && this.level.bossTrigger != null) {
      if (!this.bossActive && P.x >= this.level.bossTrigger) this.bossActive = true;
      if (this.bossActive) {
        const z = this.level.bossZone;
        if (P.x < z.x0 + 12) { P.x = z.x0 + 12; if (P.gsp < 0) P.gsp = 0; if (P.xsp < 0) P.xsp = 0; }
        if (P.x > z.x1 - 12) { P.x = z.x1 - 12; if (P.gsp > 0) P.gsp = 0; if (P.xsp > 0) P.xsp = 0; }
      }
    }

    updateEnts(this);
    this.updateCam();
    if (this.shake > 0) this.shake--;

    if (this.autoRun) {
      this.goalT++;
      if (this.goalT > 160) this.beginTally();
    }
  }

  updateCam() {
    const P = this.player;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // horizontal look-ahead
    const desire = clamp((P.grounded ? P.gsp : P.xsp) * 9, -56, 56);
    this.lookX += clamp(desire - this.lookX, -2, 2);
    let tx = P.x + this.lookX - VIEW_W / 2;
    let x0 = 0, x1 = this.level.wPx - VIEW_W;
    if (this.bossActive) { x0 = this.level.bossZone.x0; x1 = this.level.bossZone.x1 - VIEW_W; }
    tx = clamp(tx, x0, x1);
    this.cam.x += clamp(tx - this.cam.x, -16, 16);

    // vertical
    let ty = this.cam.y;
    if (P.grounded) {
      const spd = Math.abs(P.gsp) > 8 ? 16 : 6;
      ty = this.cam.y + clamp(P.y - 112 - this.cam.y, -spd, spd);
    } else {
      if (P.y < this.cam.y + 56) ty = this.cam.y + clamp(P.y - 56 - this.cam.y, -16, 0);
      else if (P.y > this.cam.y + 168) ty = this.cam.y + clamp(P.y - 168 - this.cam.y, 0, 16);
    }
    this.cam.y = clamp(ty, 0, this.level.hPx - VIEW_H);
  }

  // ---------------- terrain & background rendering ----------------

  drawBg() {
    const cx = this.cam.x, cy = this.cam.y;
    const f = this.frame;
    if (this.levelDef.theme === 'hill') {
      ctx.fillStyle = '#3878e8'; ctx.fillRect(0, 0, VIEW_W, 90);
      ctx.fillStyle = '#58a0f0'; ctx.fillRect(0, 90, VIEW_W, 60);
      ctx.fillStyle = '#88c8f8'; ctx.fillRect(0, 150, VIEW_W, 20);
      // clouds
      ctx.fillStyle = '#f8f8f8';
      for (let i = 0; i < 6; i++) {
        const wx = ((i * 131 - cx * 0.08) % (VIEW_W + 96) + VIEW_W + 96) % (VIEW_W + 96) - 48;
        const wy = 16 + ((i * 37) % 60) - cy * 0.03;
        ctx.fillRect(wx, wy, 34, 6); ctx.fillRect(wx + 6, wy - 4, 20, 4);
      }
      // far green hills
      ctx.fillStyle = '#28a038';
      for (let i = 0; i < 8; i++) {
        const wx = ((i * 97 - cx * 0.2) % (VIEW_W + 120) + VIEW_W + 120) % (VIEW_W + 120) - 60;
        const r = 40 + ((i * 29) % 26);
        ctx.beginPath(); ctx.arc(wx, 176 - cy * 0.05, r, Math.PI, 0); ctx.fill();
      }
      // checker band
      const bandY = 172 - cy * 0.05;
      for (let x = -16; x < VIEW_W + 16; x += 16) {
        const wx = Math.floor((x + cx * 0.35) / 16);
        ctx.fillStyle = wx & 1 ? '#b07030' : '#906020';
        ctx.fillRect(x - ((cx * 0.35) % 16), bandY, 16, 14);
      }
      // water
      ctx.fillStyle = '#2050c8'; ctx.fillRect(0, bandY + 14, VIEW_W, VIEW_H);
      ctx.fillStyle = '#68a0f8';
      for (let i = 0; i < 10; i++) {
        const wx = ((i * 53 - cx * 0.5 + f * 0.3) % VIEW_W + VIEW_W) % VIEW_W;
        ctx.fillRect(wx, bandY + 22 + ((i * 31) % 30), 8, 1);
      }
    } else {
      ctx.fillStyle = '#0a0e20'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#141c38'; ctx.fillRect(0, 130, VIEW_W, VIEW_H);
      // stars / plant lights
      for (let i = 0; i < 24; i++) {
        const wx = ((i * 89 - cx * 0.1) % VIEW_W + VIEW_W) % VIEW_W;
        const wy = ((i * 47) % 110) - cy * 0.03;
        ctx.fillStyle = (i + (f >> 4)) % 5 === 0 ? '#f8e858' : '#3a4468';
        ctx.fillRect(wx, wy, 2, 2);
      }
      // towers
      for (let i = 0; i < 9; i++) {
        const wx = ((i * 71 - cx * 0.18) % (VIEW_W + 80) + VIEW_W + 80) % (VIEW_W + 80) - 40;
        const h = 60 + ((i * 43) % 70);
        ctx.fillStyle = '#1a2244';
        ctx.fillRect(wx, 190 - h - cy * 0.05, 26, h + 60);
        ctx.fillStyle = '#f8d838';
        if ((i + (f >> 5)) % 3 === 0) ctx.fillRect(wx + 8, 200 - h - cy * 0.05, 2, 2);
        ctx.fillStyle = '#e83858';
        if (i % 2) ctx.fillRect(wx + 12, 186 - h - cy * 0.05, 2, 2);
      }
      // pipes band
      ctx.fillStyle = '#202c50';
      const py = 196 - cy * 0.06;
      ctx.fillRect(0, py, VIEW_W, 8);
      ctx.fillStyle = '#2a3860';
      for (let x = 0; x < VIEW_W + 32; x += 32) {
        ctx.fillRect(x - ((cx * 0.4) % 32), py - 20, 10, 20);
      }
      // glow floor
      ctx.fillStyle = '#102840'; ctx.fillRect(0, py + 8, VIEW_W, VIEW_H);
    }
  }

  tileImg(id, topBits, parity) {
    const key = `${id}|${topBits}|${parity}`;
    let img = this.tileCache.get(key);
    if (!img) {
      img = bakeTerrainTile(this.level.tiles[id].m, this.levelDef.theme, parity, topBits);
      this.tileCache.set(key, img);
    }
    return img;
  }

  drawTiles() {
    const lv = this.level;
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE));
    const x1 = Math.min(lv.wT - 1, Math.ceil((this.cam.x + VIEW_W) / TILE));
    const y0 = Math.max(0, Math.floor(this.cam.y / TILE));
    const y1 = Math.min(lv.hT - 1, Math.ceil((this.cam.y + VIEW_H) / TILE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = lv.grid[ty * lv.wT + tx];
        if (!id) continue;
        let topBits = 0;
        const yAbove = ty * TILE - 1;
        for (let lx = 0; lx < 16; lx++) {
          if (lv.maskAt(tx * TILE + lx, yAbove)) topBits |= 1 << lx;
        }
        const img = this.tileImg(id, topBits, (tx + ty) & 1);
        ctx.drawImage(img, tx * TILE - Math.round(this.cam.x), ty * TILE - Math.round(this.cam.y));
      }
    }
  }

  drawHUD() {
    const sh = (s, x, y, c) => { text(ctx, s, x + 1, y + 1, '#102040'); text(ctx, s, x, y, c); };
    sh(`SCORE ${String(this.score).padStart(7, ' ')}`, 10, 8, '#f8d838');
    const tc = this.time > TIME_LIMIT - 3600 && this.frame % 30 < 15 ? '#f83030' : '#f8f8f8';
    sh(`TIME  ${fmtTime(this.time)}`, 10, 19, tc);
    const rc = this.rings === 0 && this.frame % 30 < 15 ? '#f83030' : '#f8d838';
    sh(`RINGS ${this.rings}`, 10, 30, rc);
    // lives
    ctx.save();
    ctx.translate(12, VIEW_H - 20);
    ctx.scale(0.5, 0.5);
    ctx.drawImage(SPR.stand, -10, -14);
    ctx.restore();
    sh(`x${this.lives}`, 22, VIEW_H - 18, '#f8f8f8');

    if (this.autoRun && this.goalT > 20) {
      text(ctx, 'ACT CLEAR!', VIEW_W / 2, 70, '#f8d838', 14, 'center');
    }
    if (this.timeOver) text(ctx, 'TIME OVER', VIEW_W / 2, 100, '#f83030', 14, 'center');
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 104, '#f8f8f8', 12, 'center');
    }
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawBg();
    this.drawTiles();
    drawEnts(this, ctx);
    this.player.draw(ctx, this.cam, this.frame);
    ctx.restore();
    this.drawHUD();
  }

  // ---------------- screens ----------------

  emblem(cx, cy, r) {
    ctx.fillStyle = '#f8c800';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b08000';
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#182878';
    ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.fill();
    // wings
    ctx.fillStyle = '#f8c800';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cx - r - 22 + i * 5, cy - 10 + i * 5, 22 - i * 4, 3);
      ctx.fillRect(cx + r + i * 5, cy - 10 + i * 5, 22 - i * 4, 3);
    }
  }

  drawTitle() {
    ctx.fillStyle = '#1848c0'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#3878e8'; ctx.fillRect(0, 0, VIEW_W, 60);
    // checkered ground strip
    for (let x = 0; x < VIEW_W; x += 16) {
      for (let y = 190; y < VIEW_H; y += 16) {
        ctx.fillStyle = ((x + y) >> 4) & 1 ? '#b07030' : '#906020';
        ctx.fillRect(x, y, 16, 16);
      }
    }
    ctx.fillStyle = '#28a038'; ctx.fillRect(0, 186, VIEW_W, 5);
    this.emblem(VIEW_W / 2, 92, 46);
    drawCentered(ctx, SPR.run[(this.frame >> 3) & 1], VIEW_W / 2 - 2, 92, false, 0);
    text(ctx, 'SONIC', VIEW_W / 2, 30, '#f8f8f8', 26, 'center');
    text(ctx, 'MOORE', VIEW_W / 2, 138, '#f8d838', 22, 'center');
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP JUMP TO START' : 'PRESS ENTER OR Z', VIEW_W / 2, 168, '#f8f8f8', 9, 'center');
    }
    text(ctx, `HI SCORE ${this.hiscore}`, VIEW_W / 2, 196, '#f8f8c0', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 210, '#a8c0f0', 8, 'center');
  }

  updateTitle() {
    this.sound.playMusic('title');
    if (this.input.pressed('start') || this.input.pressed('jump')) this.startRun();
  }

  drawActCard() {
    const d = this.levelDef;
    ctx.fillStyle = '#101838'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const t = Math.min(1, this.cardT / 30);
    const xoff = (1 - t) * 200;
    ctx.fillStyle = '#e83030'; ctx.fillRect(0, 84 - (1 - t) * 120, VIEW_W, 3);
    ctx.fillStyle = '#f8d838'; ctx.fillRect(0, 132 + (1 - t) * 120, VIEW_W, 3);
    text(ctx, d.zone, VIEW_W / 2 + xoff, 92, '#f8f8f8', 16, 'center');
    text(ctx, d.boss ? 'FINAL ACT' : `ACT ${d.act}`, VIEW_W / 2 - xoff, 114, '#f8d838', 12, 'center');
    this.emblem(40, 40, 18);
    text(ctx, 'SONIC MOORE', 40, 66, '#88a0e0', 8, 'center');
  }

  updateActCard() {
    this.cardT++;
    if (this.cardT > 120 || (this.cardT > 30 && this.input.pressed('jump'))) this.enterPlay();
  }

  drawTally() {
    this.drawPlay();
    ctx.fillStyle = 'rgba(8,16,40,0.75)';
    ctx.fillRect(24, 40, VIEW_W - 48, 140);
    const d = this.levelDef;
    text(ctx, 'MOORE GOT', VIEW_W / 2, 52, '#f8d838', 14, 'center');
    text(ctx, `THROUGH ${d.boss ? 'THE FINAL ACT' : 'ACT ' + d.act}`, VIEW_W / 2, 70, '#f8d838', 11, 'center');
    text(ctx, `TIME BONUS`, 60, 100, '#f8f8f8', 9);
    text(ctx, String(this.timeBonus), 260, 100, '#f8f8f8', 9, 'right');
    text(ctx, `RING BONUS`, 60, 116, '#f8f8f8', 9);
    text(ctx, String(this.ringBonus), 260, 116, '#f8f8f8', 9, 'right');
    text(ctx, `SCORE`, 60, 140, '#f8d838', 9);
    text(ctx, String(this.score), 260, 140, '#f8d838', 9, 'right');
  }

  updateTally() {
    this.tallyT++;
    if (this.tallyT < 60) return;
    let moved = false;
    for (let i = 0; i < 4; i++) {
      if (this.timeBonus > 0) { const d = Math.min(100, this.timeBonus); this.timeBonus -= d; this.score += d; moved = true; }
      else if (this.ringBonus > 0) { const d = Math.min(100, this.ringBonus); this.ringBonus -= d; this.score += d; moved = true; }
    }
    if (moved) {
      if (this.tallyT % 4 === 0) this.sound.tallyTick();
      this.tallyDoneT = 0;
    } else {
      if (this.tallyDoneT === 0) this.sound.tallyDone();
      this.tallyDoneT++;
      if (this.tallyDoneT > 110 || (this.tallyDoneT > 20 && this.input.pressed('jump'))) this.nextAct();
    }
  }

  drawGameOver() {
    ctx.fillStyle = '#04040a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 80, '#f83030', 18, 'center');
    text(ctx, `SCORE ${this.score}`, VIEW_W / 2, 116, '#f8f8f8', 9, 'center');
    text(ctx, `HI SCORE ${this.hiscore}`, VIEW_W / 2, 130, '#f8d838', 9, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PRESS ENTER', VIEW_W / 2, 164, '#f8f8f8', 9, 'center');
  }

  updateGameOver() {
    this.goT++;
    if (this.goT > 40 && (this.input.pressed('start') || this.input.pressed('jump'))) {
      this.state = 'title';
    }
  }

  drawEnding() {
    ctx.fillStyle = '#101838'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // sunset
    const rise = Math.min(50, this.endT / 6);
    ctx.fillStyle = '#e87828';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 240 - rise, 44, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f8d838';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 240 - rise, 28, Math.PI, 0); ctx.fill();
    for (let x = 0; x < VIEW_W; x += 16) {
      ctx.fillStyle = (x >> 4) & 1 ? '#b07030' : '#906020';
      ctx.fillRect(x, 196, 16, 28);
    }
    ctx.fillStyle = '#28a038'; ctx.fillRect(0, 192, VIEW_W, 5);
    drawCentered(ctx, SPR.stand, VIEW_W / 2, 174);
    text(ctx, 'DR. ROBOTMOORE BLASTED OFF!', VIEW_W / 2, 26, '#f8d838', 11, 'center');
    text(ctx, 'THE MOORE ISLANDS ARE FREE.', VIEW_W / 2, 44, '#c8d0f0', 9, 'center');
    text(ctx, 'SONIC MOORE — THE HERO OF SPEED', VIEW_W / 2, 60, '#c8d0f0', 9, 'center');
    text(ctx, `FINAL SCORE ${this.score}`, VIEW_W / 2, 96, '#f8f8f8', 10, 'center');
    text(ctx, `HI SCORE ${this.hiscore}`, VIEW_W / 2, 112, '#f8d838', 9, 'center');
    if (this.endT > 180 && this.frame % 60 < 40) {
      text(ctx, 'PRESS ENTER', VIEW_W / 2, 140, '#f8f8f8', 8, 'center');
    }
  }

  updateEnding() {
    this.endT++;
    if (this.endT > 180 && (this.input.pressed('start') || this.input.pressed('jump'))) {
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
      case 'actcard': this.updateActCard(); this.drawActCard(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'tally': this.updateTally(); this.drawTally(); break;
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
