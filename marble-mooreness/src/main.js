// main.js — Marble Mooreness. Loop, states, camera, iso rendering, HUD,
// entities (Steelie / Slinky), timer with carry-over, and all screens.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, worldToScreen, drawCell, drawMarble, drawShadow,
  drawSteelie, drawSlinky, THEMES, TILE_W, TILE_H, ELEV,
} from './sprites.js';
import { buildCourse, COURSES } from './courses.js';
import {
  makeMarble, stepMarble, groundInfo, accelFromScreen, cellAt, heightAtCell, TYPE, PHYS,
} from './physics.js';

const VIEW_W = 320, VIEW_H = 240;
const HI_KEY = 'marble-mooreness-hi';

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
    this.hi = parseInt(localStorage.getItem(HI_KEY) || '0', 10) || 0;
    this.camX = 0; this.camY = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / course setup ----------------
  startRun() {
    this.score = 0;
    this.timeLeft = 0;
    this.courseIdx = 0;
    this.beginCourse(0);
  }

  beginCourse(i) {
    this.courseIdx = i;
    const c = buildCourse(i);
    this.course = c;
    this.timeLeft += c.time;               // carry-over: add this race's budget
    this.spawnMarble(c.start);
    this.lastSafe = { x: c.start.x, y: c.start.y, z: c.start.z };
    this.checksHit = new Set();
    // enemies
    this.enemies = c.enemies.map((e) => {
      const g = groundInfo(c, e.x, e.y);
      return {
        type: e.type, x: e.x, y: e.y, z: g.solid ? g.h : 0,
        vx: 0, vy: 0, vz: 0, spin: 0, ox: e.x, oy: e.y, cool: 0,
      };
    });
    this.particles = [];
    this.shake = 0;
    this.stun = 0;
    this.goalT = 0;
    this.state = 'intro';
    this.introT = 0;
    this.sound.stopMusic();
    // snap camera
    const s = worldToScreen(this.marble.x, this.marble.y, this.marble.z);
    this.camX = s.x - VIEW_W / 2;
    this.camY = s.y - VIEW_H * 0.42;
  }

  spawnMarble(pos) {
    this.marble = makeMarble(pos.x, pos.y, pos.z);
  }

  enterPlay() {
    this.state = 'play';
    this.bannerT = 120;
    this.sound.playMusic(THEMES[this.course.theme].music);
  }

  addScore(n) {
    this.score += n;
    if (this.score > this.hi) { this.hi = this.score; localStorage.setItem(HI_KEY, String(this.hi)); }
  }

  respawn(reason) {
    if (reason === 'fall') this.sound.fall(); else this.sound.splat();
    this.timeLeft = Math.max(0, this.timeLeft - 3); // a small time bite
    this.spawnMarble(this.lastSafe);
    this.stun = 40;
    this.shake = 8;
    for (let i = 0; i < 10; i++) this.particles.push({
      x: this.lastSafe.x, y: this.lastSafe.y, z: this.lastSafe.z,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, vz: Math.random() * 0.4 + 0.1, t: 0,
      col: reason === 'fall' ? '#fff' : '#9bdc4a',
    });
  }

  // ---------------- play update ----------------
  updatePlay() {
    const inp = this.input;
    const c = this.course;
    const m = this.marble;

    if (inp.pressed('start')) { this.paused = !this.paused; this.sound.pause(); }
    if (this.paused) return;

    // input -> world accel (disabled briefly after a respawn)
    let ax = 0, ay = 0;
    if (this.stun > 0) { this.stun--; }
    else {
      const v = inp.moveVec();
      const a = accelFromScreen(v.x, v.y);
      ax = a.ax; ay = a.ay;
      // optional hop
      if (inp.pressed('hop') && !m.air) { m.vz = 0.42; this.sound.land(); }
    }

    const ev = stepMarble(m, c, ax, ay);
    if (ev.fell) { this.respawn('fall'); return; }
    if (ev.splat) { this.respawn('splat'); return; }
    if (ev.launched) this.sound.launch();
    if (ev.land > 0.35) this.sound.land();
    if (ev.bump) { if (this.frame % 6 === 0) this.sound.bump(); }

    // rolling rumble tracks speed
    const speed = Math.hypot(m.vx, m.vy);
    this.sound.setRoll(m.air ? 0 : speed / PHYS.MAXSPD);

    // checkpoints
    for (let i = 0; i < c.checkpoints.length; i++) {
      const cp = c.checkpoints[i];
      if (this.checksHit.has(i)) continue;
      if (Math.abs(m.x - cp.x) < 1.3 && Math.abs(m.y - cp.y) < 1.3) {
        this.checksHit.add(i);
        this.lastSafe = { x: cp.x, y: cp.y, z: cp.z };
        this.addScore(250);
        this.sound.checkpoint();
        this.floatText = { s: 'CHECKPOINT', t: 90 };
      }
    }

    // enemies
    this.updateEnemies();

    // goal?
    const g = c.goal;
    if (Math.abs(m.x - g.cx) < 1.5 && Math.abs(m.y - g.cy) < 1.5) { this.reachGoal(); return; }

    // timer
    this.timeLeft -= 1 / 60;
    if (this.timeLeft <= 10 && this.timeLeft > 0 && this.frame % 30 === 0) this.sound.tick();
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); return; }

    // camera follow (smooth, marble held a bit above centre to see ahead)
    const s = worldToScreen(m.x, m.y, m.z);
    const tgx = s.x - VIEW_W / 2, tgy = s.y - VIEW_H * 0.42;
    this.camX += (tgx - this.camX) * 0.12;
    this.camY += (tgy - this.camY) * 0.12;

    // particles
    for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vz -= 0.04; p.t++; }
    this.particles = this.particles.filter((p) => p.t < 40);
    if (this.shake > 0) this.shake--;
    if (this.bannerT > 0) this.bannerT--;
    if (this.floatText) { this.floatText.t--; if (this.floatText.t <= 0) this.floatText = null; }
  }

  updateEnemies() {
    const c = this.course, m = this.marble;
    for (const e of this.enemies) {
      const dx = m.x - e.x, dy = m.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (e.type === 'steelie') {
        // a rival marble: accelerate toward the player, obeys the same physics
        let ex = 0, ey = 0;
        if (dist < 8 && dist > 0.1) { ex = dx / dist; ey = dy / dist; }
        const ev = stepMarble(e, c, ex * 0.7, ey * 0.7);
        if (ev.fell) { // it rolled into the void — bring it back near home
          e.x = e.ox; e.y = e.oy; const g = groundInfo(c, e.ox, e.oy);
          e.z = g.solid ? g.h : 0; e.vx = e.vy = e.vz = 0;
        }
      } else { // slinky: hops toward the player, but only across solid ground
        if (e.cool > 0) e.cool--;
        if (dist < 7 && dist > 0.6 && e.cool === 0) {
          const nx = e.x + (dx / dist) * 0.4, ny = e.y + (dy / dist) * 0.4;
          const g = groundInfo(c, nx, ny);
          if (g.solid && g.type !== TYPE.VOID) { e.x = nx; e.y = ny; e.z = g.h; }
        }
        e.spin++;
      }
      // bump the player
      if (dist < 0.85 && Math.abs(m.z - e.z) < 1.4 && this.stun <= 0) {
        const push = e.type === 'steelie' ? 0.32 : 0.22;
        if (dist > 0.01) { m.vx += (dx / dist) * push; m.vy += (dy / dist) * push; }
        if (e.type === 'steelie') { e.vx *= -0.4; e.vy *= -0.4; }
        else e.cool = 30;
        if (this.frame % 8 === 0) this.sound.bump();
        this.shake = Math.max(this.shake, 4);
      }
    }
  }

  reachGoal() {
    this.sound.setRoll(0);
    this.sound.goal();
    this.sound.stopMusic();
    this.goalBonus = Math.floor(this.timeLeft) * 25;
    this.tallyLeft = Math.floor(this.timeLeft);
    this.addScore(1000);
    this.state = 'complete';
    this.completeT = 0;
  }

  gameOver() {
    this.sound.setRoll(0);
    this.sound.stopMusic();
    this.sound.gameover();
    this.state = 'gameover';
    this.goT = 0;
  }

  updateComplete() {
    this.completeT++;
    // tally remaining seconds into score
    if (this.completeT > 30 && this.tallyLeft > 0 && this.completeT % 2 === 0) {
      this.tallyLeft--;
      this.addScore(25);
      this.sound.tick();
    }
    const done = this.tallyLeft <= 0 && this.completeT > 60;
    if (done && (this.input.pressed('start') || this.input.pressed('hop') || this.completeT > 320)) {
      if (this.courseIdx + 1 >= COURSES.length) {
        this.state = 'win'; this.winT = 0; this.sound.win();
      } else {
        this.beginCourse(this.courseIdx + 1);
      }
    }
  }

  // ---------------- rendering ----------------
  drawSky() {
    const th = THEMES[this.course.theme];
    const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grd.addColorStop(0, th.sky0);
    grd.addColorStop(1, th.sky1);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // faint parallax stars/specks for the surreal void
    ctx.fillStyle = th.accent;
    for (let i = 0; i < 26; i++) {
      const px = ((i * 71 - this.camX * 0.15) % (VIEW_W + 20) + VIEW_W + 20) % (VIEW_W + 20) - 10;
      const py = ((i * 47 - this.camY * 0.15) % (VIEW_H + 20) + VIEW_H + 20) % (VIEW_H + 20) - 10;
      ctx.globalAlpha = 0.10 + (i % 3) * 0.04;
      ctx.fillRect(px, py, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawWorld() {
    const c = this.course;
    const items = [];
    // visible tiles -> render items (painter's order by x+y)
    for (let y = 0; y < c.h; y++) {
      for (let x = 0; x < c.w; x++) {
        const t = cellAt(c, x, y);
        if (t === TYPE.VOID) continue;
        const h = heightAtCell(c, x, y);
        const s = worldToScreen(x, y, h);
        const sx = s.x - this.camX, sy = s.y - this.camY;
        if (sx < -TILE_W || sx > VIEW_W + TILE_W || sy < -TILE_H || sy > VIEW_H + 40) continue;
        // neighbour heights toward camera (+x down-right, +y down-left); null=void
        const rT = cellAt(c, x + 1, y), dT = cellAt(c, x, y + 1);
        const dR = rT === TYPE.VOID ? null : heightAtCell(c, x + 1, y);
        const dD = dT === TYPE.VOID ? null : heightAtCell(c, x, y + 1);
        items.push({ d: x + y, k: 0, fn: () => drawCell(ctx, t, c.theme, sx, sy, h, dR, dD, this.frame) });
      }
    }
    // entities
    for (const e of this.enemies) {
      const gs = worldToScreen(e.x, e.y, e.z);
      const sx = gs.x - this.camX, sy = gs.y - this.camY;
      const shs = worldToScreen(e.x, e.y, groundHeight(c, e.x, e.y));
      const shy = shs.y - this.camY;
      items.push({
        d: e.x + e.y, k: 1, fn: () => {
          drawShadow(ctx, sx, shy, 6);
          if (e.type === 'steelie') drawSteelie(ctx, sx, sy - 6, 6, e.spin);
          else drawSlinky(ctx, sx, sy, this.frame);
        },
      });
    }
    // marble
    {
      const m = this.marble;
      const ms = worldToScreen(m.x, m.y, m.z);
      const sx = ms.x - this.camX, sy = ms.y - this.camY - 6;
      const gsh = worldToScreen(m.x, m.y, groundHeight(c, m.x, m.y));
      const shy = gsh.y - this.camY;
      const dir = Math.atan2((m.vx + m.vy), (m.vx - m.vy)); // screen-space travel angle
      const speed = Math.hypot(m.vx, m.vy);
      const blink = this.stun > 0 && (this.frame % 6 < 3);
      items.push({
        d: m.x + m.y + 0.01, k: 2, fn: () => {
          drawShadow(ctx, sx, shy, 6);
          if (!blink) drawMarble(ctx, sx, sy, 6, m.spin, dir, speed);
        },
      });
    }
    // goal banner marker
    {
      const g = c.goal;
      const gs = worldToScreen(g.cx, g.cy, heightAtCell(c, g.cx, g.cy));
      const sx = gs.x - this.camX, sy = gs.y - this.camY;
      items.push({ d: g.cx + g.cy - 0.01, k: 0, fn: () => this.drawGoalFlag(sx, sy) });
    }
    // particles
    for (const p of this.particles) {
      const ps = worldToScreen(p.x, p.y, p.z);
      const sx = ps.x - this.camX, sy = ps.y - this.camY;
      items.push({ d: p.x + p.y, k: 3, fn: () => { ctx.fillStyle = p.col; ctx.globalAlpha = 1 - p.t / 40; ctx.fillRect(sx - 1, sy - 1, 2, 2); ctx.globalAlpha = 1; } });
    }

    items.sort((a, b) => (a.d - b.d) || (a.k - b.k));
    for (const it of items) it.fn();
  }

  drawGoalFlag(sx, sy) {
    ctx.strokeStyle = '#f8f8f8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy - 2); ctx.lineTo(sx, sy - 22); ctx.stroke();
    ctx.fillStyle = this.frame % 20 < 10 ? '#f24444' : '#f8f8f8';
    ctx.fillRect(sx, sy - 22, 10, 7);
    ctx.fillStyle = '#101014';
    for (let i = 0; i < 3; i++) ctx.fillRect(sx + i * 3 + ((this.frame >> 3) % 2), sy - 22 + (i % 2) * 3, 2, 2);
  }

  drawHUD() {
    const c = this.course;
    // time bar
    const barW = 160;
    const frac = Math.max(0, Math.min(1, this.timeLeft / 60));
    ctx.fillStyle = '#0008'; ctx.fillRect(8, 8, barW + 2, 8);
    ctx.fillStyle = this.timeLeft <= 10 ? (this.frame % 8 < 4 ? '#f24444' : '#ffb000') : '#4ce04c';
    ctx.fillRect(9, 9, barW * frac, 6);
    text(ctx, `TIME ${Math.ceil(this.timeLeft)}`, 8, 18, '#fff', 8);
    // course indicator
    text(ctx, `RACE ${this.courseIdx + 1}/6  ${c.name}`, VIEW_W - 6, 8, THEMES[c.theme].accent, 8, 'right');
    text(ctx, `${String(this.score).padStart(7, '0')}`, VIEW_W - 6, 18, '#fff', 8, 'right');
    text(ctx, `HI ${String(this.hi).padStart(7, '0')}`, VIEW_W - 6, 28, '#889', 8, 'right');
    if (this.floatText) text(ctx, this.floatText.s, VIEW_W / 2, 40, '#ffe23c', 10, 'center');
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawSky();
    this.drawWorld();
    ctx.restore();
    this.drawHUD();
    if (this.bannerT > 0 && (this.bannerT > 30 || this.frame % 8 < 5)) {
      text(ctx, this.course.name, VIEW_W / 2, 48, THEMES[this.course.theme].accent, 14, 'center');
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 110, '#fff', 14, 'center');
      text(ctx, 'ENTER to resume  ·  M mute', VIEW_W / 2, 130, '#99a', 8, 'center');
    }
  }

  // ---------------- title ----------------
  drawTitle() {
    const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grd.addColorStop(0, '#241540'); grd.addColorStop(1, '#08040f');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // a big iso plinth + hero marble
    const cx = VIEW_W / 2, cy = 150;
    for (let i = 3; i >= 0; i--) {
      ctx.fillStyle = ['#5a389a', '#6a44b0', '#7a52c4', '#8a60d8'][i];
      ctx.beginPath();
      ctx.moveTo(cx, cy - 13 + i * 7 - 26);
      ctx.lineTo(cx + 46, cy + i * 7 - 26);
      ctx.lineTo(cx, cy + 13 + i * 7 - 26);
      ctx.lineTo(cx - 46, cy + i * 7 - 26);
      ctx.closePath(); ctx.fill();
    }
    const bob = Math.sin(this.frame * 0.05) * 3;
    drawShadow(ctx, cx, cy - 30, 16);
    drawMarble(ctx, cx, cy - 46 + bob, 16, this.frame * 0.4, 0.6, 0.3);

    text(ctx, 'MARBLE', VIEW_W / 2, 30, '#ffe23c', 30, 'center');
    text(ctx, 'MOORENESS', VIEW_W / 2, 62, '#f24444', 20, 'center');
    text(ctx, 'ROLL. TILT. DO NOT FALL.', VIEW_W / 2, 90, '#b9a8e8', 8, 'center');
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP TO START' : 'PRESS ENTER TO ROLL', VIEW_W / 2, 200, '#fff', 9, 'center');
    }
    text(ctx, `HI ${String(this.hi).padStart(7, '0')}`, VIEW_W / 2, 218, '#889', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 230, '#556', 8, 'center');
  }

  updateTitle() {
    if (this.input.pressed('start') || this.input.pressed('hop')) this.startRun();
  }

  // ---------------- intro card ----------------
  drawIntro() {
    const th = THEMES[this.course.theme];
    const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grd.addColorStop(0, th.sky0); grd.addColorStop(1, th.sky1);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, `RACE ${this.courseIdx + 1}`, VIEW_W / 2, 80, '#fff', 12, 'center');
    text(ctx, this.course.name, VIEW_W / 2, 104, th.accent, 18, 'center');
    text(ctx, `TIME BUDGET  +${this.course.time}s`, VIEW_W / 2, 134, '#b0c0d0', 9, 'center');
    text(ctx, `CARRIED TIME  ${Math.ceil(this.timeLeft)}s`, VIEW_W / 2, 148, '#8fe08f', 9, 'center');
    if (this.frame % 60 < 40) text(ctx, 'GET ROLLING!', VIEW_W / 2, 190, '#fff', 9, 'center');
  }
  updateIntro() {
    this.introT++;
    if (this.introT > 24 && (this.input.pressed('start') || this.input.pressed('hop'))) this.enterPlay();
    if (this.introT > 170) this.enterPlay();
  }

  // ---------------- complete (tally) ----------------
  drawComplete() {
    this.drawSky();
    ctx.save();
    this.drawWorld();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GOAL!', VIEW_W / 2, 60, '#ffe23c', 20, 'center');
    text(ctx, `RACE ${this.courseIdx + 1} — ${this.course.name}`, VIEW_W / 2, 90, '#fff', 8, 'center');
    text(ctx, `TIME LEFT  ${this.tallyLeft}s`, VIEW_W / 2, 118, '#8fe08f', 10, 'center');
    text(ctx, `BONUS +${this.tallyLeft * 25}`, VIEW_W / 2, 134, '#ffe23c', 9, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(7, '0')}`, VIEW_W / 2, 158, '#fff', 9, 'center');
    text(ctx, 'time carries to the next race', VIEW_W / 2, 178, '#99a', 8, 'center');
    if (this.tallyLeft <= 0 && this.completeT > 60 && this.frame % 60 < 40) {
      text(ctx, this.courseIdx + 1 >= COURSES.length ? 'PRESS TO FINISH' : 'PRESS TO CONTINUE', VIEW_W / 2, 200, '#fff', 9, 'center');
    }
  }

  // ---------------- game over ----------------
  drawGameOver() {
    ctx.fillStyle = '#08040f'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'OUT OF TIME', VIEW_W / 2, 80, '#f24444', 18, 'center');
    text(ctx, `RACE ${this.courseIdx + 1} — ${this.course.name}`, VIEW_W / 2, 108, '#fff', 8, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(7, '0')}`, VIEW_W / 2, 130, '#fff', 9, 'center');
    text(ctx, `HI ${String(this.hi).padStart(7, '0')}`, VIEW_W / 2, 144, '#889', 8, 'center');
    if (this.goT > 60 && this.frame % 60 < 40) text(ctx, 'PRESS ENTER', VIEW_W / 2, 190, '#fff', 9, 'center');
  }
  updateGameOver() {
    this.goT++;
    if (this.goT > 60 && (this.input.pressed('start') || this.input.pressed('hop'))) this.state = 'title';
  }

  // ---------------- win ----------------
  drawWin() {
    const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grd.addColorStop(0, '#152a40'); grd.addColorStop(1, '#f0a040');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const bob = Math.sin(this.frame * 0.06) * 4;
    drawShadow(ctx, VIEW_W / 2, 150, 16);
    drawMarble(ctx, VIEW_W / 2, 134 + bob, 16, this.frame * 0.3, 0.6, 0.3);
    text(ctx, 'ALL SIX RACES WON!', VIEW_W / 2, 40, '#fff', 14, 'center');
    text(ctx, 'MARBLE MOORENESS CHAMPION', VIEW_W / 2, 64, '#241540', 8, 'center');
    text(ctx, `FINAL SCORE ${String(this.score).padStart(7, '0')}`, VIEW_W / 2, 186, '#fff', 9, 'center');
    text(ctx, `TIME TO SPARE ${Math.ceil(this.timeLeft)}s`, VIEW_W / 2, 200, '#241540', 8, 'center');
    if (this.winT > 90 && this.frame % 60 < 40) text(ctx, 'PRESS ENTER', VIEW_W / 2, 220, '#241540', 9, 'center');
  }
  updateWin() {
    this.winT++;
    if (this.winT > 90 && (this.input.pressed('start') || this.input.pressed('hop'))) this.state = 'title';
  }

  // ---------------- frame ----------------
  tick() {
    this.frame++;
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.sound.updateMusic();
    if (this.state !== 'play' || this.paused) this.sound.setRoll(0);

    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'intro': this.updateIntro(); this.drawIntro(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'complete': this.updateComplete(); this.drawComplete(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'win': this.updateWin(); this.drawWin(); break;
    }
    this.input.endFrame();
  }
}

function groundHeight(c, x, y) {
  const gi = groundInfo(c, x, y);
  return gi.solid ? gi.h : (c.killZ + 2);
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
