// Papermoore — main loop, state machine, camera, HUD, delivery + crash logic.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawCentered, drawGround, drawHouse, drawShadow,
  drawBurst, drawSparkle, proj, LAYOUT, BIKE_RV, VIEW_W, VIEW_H, RV_MAX,
} from './sprites.js';
import { Bike, Paper, Hazard, Bundle, clamp } from './entities.js';
import { buildDay, DAY_NAMES } from './level.js';

const L = LAYOUT;
const HI_KEY = 'papermoore_hi';
const DIFFS = [
  { key: 'easy', label: 'EASY', desc: 'MANY SUBSCRIBERS', subs: 12, lives: 6 },
  { key: 'medium', label: 'MEDIUM', desc: 'A FAIR ROUTE', subs: 10, lives: 5 },
  { key: 'hard', label: 'HARD', desc: 'FEW SUBSCRIBERS', subs: 8, lives: 4 },
];

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
    this.diffSel = 1;
    this.hi = parseInt(localStorage.getItem(HI_KEY) || '0', 10) || 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / day setup ----------------

  startRun() {
    const d = DIFFS[this.diffSel];
    this.difficulty = d.key;
    this.subscribers = d.subs;
    this.lives = d.lives;
    this.score = 0;
    this.day = 0;
    this.beginDay();
  }

  beginDay() {
    this.level = buildDay(this.day, this.difficulty, this.subscribers);
    this.camV = 0;
    this.bike = new Bike();
    this.bike.papers = 10;
    this.bike.invuln = 60;
    this.houses = this.level.houses;
    this.hazards = this.level.hazards.map((h) => {
      const hz = new Hazard(h.kind, h.wx, h.v, h.opt);
      hz.active = false;
      return hz;
    });
    this.bundles = this.level.bundles.map((b) => new Bundle(b.wx, b.v));
    this.papers = [];
    this.effects = [];
    this.popups = [];
    this.paused = false;
    this.state = 'dayintro';
    this.introT = 0;
  }

  enterPlay() {
    this.state = 'play';
    this.sound.playMusic(this.day >= 4 ? 'hot' : 'route');
  }

  // ---------------- helpers ----------------

  addScore(n) {
    this.score += n;
    if (this.score > this.hi) { this.hi = this.score; localStorage.setItem(HI_KEY, String(this.hi)); }
  }

  popup(text, wx, v, color) {
    const p = proj(wx, v - this.camV);
    this.popups.push({ x: p.x, y: p.y - 20, t: 0, text, color });
  }

  // ---------------- delivery ----------------

  resolveDelivery(paper) {
    const side = paper.side;
    const landV = paper.v;
    let best = null, bestD = 1e9;
    for (const h of this.houses) {
      if (h.side !== side) continue;
      const d = Math.abs(h.v - landV);
      if (d < bestD) { bestD = d; best = h; }
    }
    if (!best || bestD > 34) { return; }
    const dv = Math.abs(landV - best.v);
    if (best.subscriber) {
      if (!best.delivered) {
        if (dv < 9) {
          best.delivered = true; best.perfect = true;
          this.addScore(500); this.sound.ding();
          this.effects.push({ kind: 'sparkle', wx: best.side === 'L' ? L.L_MB : L.R_MB, v: best.v, t: 0 });
          this.popup('MAILBOX! 500', best.side === 'L' ? L.L_MB : L.R_MB, best.v, '#f8e838');
        } else if (dv < 26) {
          best.delivered = true;
          this.addScore(250); this.sound.deliver();
          this.popup('DELIVERED 250', best.side === 'L' ? L.L_MB : L.R_MB, best.v, '#a8f8a8');
        }
      } else if (dv < 26) {
        this.addScore(50); this.sound.deliver();
      }
    } else {
      if (!best.scored && dv < 24) {
        best.scored = true; best.windowBroken = true; best.boarded = true;
        this.addScore(150); this.sound.smash();
        this.effects.push({ kind: 'burst', wx: best.side === 'L' ? L.L_HOUSE : L.R_HOUSE, v: best.v, t: 0, up: 24 });
        this.popup('SMASH! 150', best.side === 'L' ? L.L_HOUSE : L.R_HOUSE, best.v, '#f88838');
        this.sound.board();
      }
    }
  }

  crashBike() {
    if (this.bike.crash || this.bike.invuln > 0) return;
    this.bike.crash = true; this.bike.crashT = 70;
    this.lives--;
    this.sound.thud();
    if (this.lives < 0) this.gameOverPending = true;
  }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;
    if (inp.pressed('start')) { this.paused = !this.paused; this.sound.pause(); }
    if (this.paused) return;

    const b = this.bike;
    const paper = b.update(this, inp, this.level.scrollBase);
    if (paper) { this.papers.push(paper); this.sound.whoosh(); }
    if (!b.crash) this.camV += b.speed;

    // papers
    for (const p of this.papers) {
      const wasLanded = p.landed;
      p.update();
      if (p.landed && !wasLanded) this.resolveDelivery(p);
    }
    this.papers = this.papers.filter((p) => !p.gone);

    // hazards
    for (const hz of this.hazards) {
      if (hz.gone) continue;
      if (!hz.active) { if (hz.v - this.camV < RV_MAX) hz.active = true; else continue; }
      hz.update(this);
      const rv = hz.v - this.camV;
      if (!b.crash && b.invuln <= 0 && Math.abs(rv - BIKE_RV) < 7 && Math.abs(hz.wx - b.wx) < hz.hitX) {
        this.crashBike();
      }
    }
    this.hazards = this.hazards.filter((h) => !h.gone);

    // bundles
    for (const bu of this.bundles) {
      if (bu.gone) continue;
      const rv = bu.v - this.camV;
      if (Math.abs(rv - BIKE_RV) < 8 && Math.abs(bu.wx - b.wx) < 10) {
        bu.gone = true; b.papers = Math.min(20, b.papers + 5);
        this.sound.pickup(); this.popup('+5 PAPERS', bu.wx, bu.v, '#f8f8f8');
      }
    }

    // effects + popups
    for (const e of this.effects) e.t++;
    this.effects = this.effects.filter((e) => e.t < (e.kind === 'burst' ? 16 : 24));
    for (const p of this.popups) { p.t++; p.y -= 0.4; }
    this.popups = this.popups.filter((p) => p.t < 50);

    // crash resolution
    if (b.crash && b.crashT <= 1 && this.gameOverPending) {
      this.state = 'gameover'; this.sound.stopMusic(); this.sound.gameover();
      return;
    }

    // reached the end of the street → BMX bonus
    if (this.camV + BIKE_RV >= this.level.streetLen) this.startBmx();
  }

  // ---------------- BMX bonus ----------------

  startBmx() {
    this.state = 'bmx';
    this.bmxV = 0;
    this.bmxItems = this.level.bmx.items.map((it) => ({ ...it, done: false }));
    this.bmxStars = 0;
    this.bmxCrashes = 0;
    this.bmxT = 0;
    this.bike.reset();
    this.bike.wx = L.CENTER;
    this.effects = []; this.popups = [];
    this.sound.fanfare();
    this.sound.playMusic('bmx');
  }

  updateBmx() {
    const inp = this.input;
    if (inp.pressed('start')) { this.paused = !this.paused; this.sound.pause(); }
    if (this.paused) return;
    const b = this.bike;
    const bmx = this.level.bmx;
    b.updateBmx(this, inp, bmx.base);
    this.bmxT++;
    if (!b.crash) this.camV = this.bmxV += b.speed;

    for (const it of this.bmxItems) {
      if (it.done) continue;
      const rv = it.v - this.bmxV;
      if (Math.abs(rv - BIKE_RV) < 7 && Math.abs(it.wx - b.wx) < 12) {
        if (it.kind === 'ramp') {
          it.done = true; if (!b.hop) { b.hop = true; b.vz = 3.6; } this.addScore(100);
          this.popup2(it.wx, it.v, 'JUMP 100', '#f8e838'); this.sound.hop();
        } else if (it.kind === 'star') {
          it.done = true; this.bmxStars++; this.addScore(200);
          this.effects.push({ kind: 'sparkle', wx: it.wx, v: it.v, t: 0 });
          this.popup2(it.wx, it.v, '200', '#f8e838'); this.sound.pickup();
        } else if ((it.kind === 'barrier' || it.kind === 'water') && b.z < 8) {
          it.done = true; this.bmxCrashes++;
          b.crash = true; b.crashT = 36; b.invuln = 60; b.speed *= 0.4;
          if (it.kind === 'water') this.sound.splash(); else this.sound.thud();
        }
      }
    }
    for (const e of this.effects) e.t++;
    this.effects = this.effects.filter((e) => e.t < 24);
    for (const p of this.popups) { p.t++; p.y -= 0.4; }
    this.popups = this.popups.filter((p) => p.t < 50);

    if (this.bmxV >= bmx.len) this.finishBmx();
  }

  popup2(wx, v, str, color) {
    const p = proj(wx, v - this.bmxV);
    this.popups.push({ x: p.x, y: p.y - 20, t: 0, text: str, color });
  }

  finishBmx() {
    let bonus = this.bmxStars * 200;
    if (this.bmxCrashes === 0) bonus += 1000;
    bonus += Math.max(0, 600 - this.bmxCrashes * 200);
    this.bmxBonus = bonus;
    this.addScore(bonus);
    this.buildSummary();
  }

  // ---------------- day summary ----------------

  buildSummary() {
    const subs = this.houses.filter((h) => h.subscriber);
    const delivered = subs.filter((h) => h.delivered).length;
    const missed = subs.length - delivered;
    const smashed = this.houses.filter((h) => !h.subscriber && h.scored).length;
    const perfect = missed === 0 && subs.length > 0;
    // subscribers cancel if missed; a perfect day earns a new subscriber
    this.subscribers = Math.max(4, this.subscribers - missed);
    if (perfect) this.subscribers = Math.min(16, this.subscribers + 1);
    this.summary = { total: subs.length, delivered, missed, smashed, perfect, bmxBonus: this.bmxBonus };
    this.state = 'summary';
    this.summaryT = 0;
    this.sound.stopMusic();
    this.sound.dayJingle();
  }

  advanceDay() {
    this.day++;
    if (this.day >= 7) {
      this.state = 'weekcomplete'; this.wcT = 0; this.sound.win();
    } else {
      this.beginDay();
    }
  }

  // ================= RENDER: PLAY =================

  drawPlay() {
    drawGround(ctx, this.camV, this.day, this.houses);

    // depth-sorted world objects (far first)
    const items = [];
    for (const h of this.houses) items.push({ z: h.v, kind: 'house', o: h });
    for (const hz of this.hazards) items.push({ z: hz.v, kind: 'haz', o: hz });
    for (const bu of this.bundles) if (!bu.gone) items.push({ z: bu.v, kind: 'bundle', o: bu });
    for (const p of this.papers) items.push({ z: p.v, kind: 'paper', o: p });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) {
      if (it.kind === 'house') drawHouse(ctx, it.o, this.camV);
      else if (it.kind === 'haz') it.o.draw(ctx, this.camV, this.frame);
      else if (it.kind === 'bundle') it.o.draw(ctx, this.camV, this.frame);
      else if (it.kind === 'paper') it.o.draw(ctx, this.camV);
    }
    this.bike.draw(ctx, this.camV, this.frame);
    this.drawEffects(this.camV);
    this.drawHUD();

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSED', VIEW_W / 2, 110, '#fff', 12, 'center');
    }
  }

  drawEffects(camV) {
    for (const e of this.effects) {
      const p = proj(e.wx, e.v - camV);
      if (e.kind === 'burst') drawBurst(ctx, p.x, p.y - (e.up || 0), e.t);
      else drawSparkle(ctx, p.x, p.y - 14, e.t);
    }
    for (const p of this.popups) {
      if (p.t % 4 < 3) text(ctx, p.text, p.x, p.y, p.color, 8, 'center');
    }
  }

  drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, VIEW_W, 12);
    text(ctx, `${String(this.score).padStart(6, '0')}`, 4, 3, '#fff');
    text(ctx, `HI ${String(this.hi).padStart(6, '0')}`, VIEW_W - 4, 3, '#f8e838', 8, 'right');
    text(ctx, DAY_NAMES[this.day], VIEW_W / 2, 3, '#a8e0f8', 8, 'center');
    // lives (bike icons)
    for (let i = 0; i < Math.max(0, this.lives); i++) {
      ctx.fillStyle = '#f83828'; ctx.fillRect(6 + i * 8, 15, 5, 3);
      ctx.fillStyle = '#101010'; ctx.fillRect(6 + i * 8, 18, 2, 2); ctx.fillRect(9 + i * 8, 18, 2, 2);
    }
    // paper stack + count
    const px = VIEW_W - 30, py = 15;
    for (let i = 0; i < Math.min(this.bike.papers, 10); i++) {
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(px + i, py - i * 0.6, 4, 5);
      ctx.fillStyle = '#bcbcc4'; ctx.fillRect(px + i, py - i * 0.6 + 4, 4, 1);
    }
    text(ctx, `x${this.bike.papers}`, VIEW_W - 4, 22, '#fff', 8, 'right');
    // subscribers remaining
    text(ctx, `SUBS ${this.subscribers}`, VIEW_W / 2, 15, '#a8f8a8', 8, 'center');
  }

  // ================= RENDER: BMX =================

  drawBmx() {
    // dirt track
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const far = proj(L.CENTER, RV_MAX);
    ctx.fillStyle = '#b8d8e8'; ctx.fillRect(0, 0, VIEW_W, Math.max(0, far.y - 8));
    ctx.fillStyle = '#3a5a2a'; ctx.fillRect(0, Math.max(0, far.y - 8), VIEW_W, 12);
    quadFill(proj(L.ROAD_L - 24, -20), proj(L.ROAD_R + 24, -20), proj(L.ROAD_R + 24, RV_MAX), proj(L.ROAD_L - 24, RV_MAX), '#a88a52');
    quadFill(proj(L.ROAD_L - 18, -20), proj(L.ROAD_R + 18, -20), proj(L.ROAD_R + 18, RV_MAX), proj(L.ROAD_L - 18, RV_MAX), '#c8a868');

    const items = [...this.bmxItems].sort((a, b) => b.v - a.v);
    for (const it of items) this.drawBmxItem(it);
    this.bike.draw(ctx, this.bmxV, this.frame);
    this.drawEffects(this.bmxV);

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, VIEW_W, 12);
    text(ctx, `${String(this.score).padStart(6, '0')}`, 4, 3, '#fff');
    text(ctx, 'BMX BONUS!', VIEW_W / 2, 3, '#f8e838', 8, 'center');
    const pct = Math.min(100, Math.floor((this.bmxV / this.level.bmx.len) * 100));
    text(ctx, `${pct}%`, VIEW_W - 4, 3, '#fff', 8, 'right');
    text(ctx, `STARS ${this.bmxStars}`, VIEW_W / 2, 15, '#f8e838', 8, 'center');
    if (this.bmxT < 120 && this.frame % 40 < 26) text(ctx, 'X = BUNNY HOP', VIEW_W / 2, 200, '#fff', 8, 'center');
    if (this.paused) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); text(ctx, 'PAUSED', VIEW_W / 2, 110, '#fff', 12, 'center'); }
  }

  drawBmxItem(it) {
    const rv = it.v - this.bmxV;
    if (rv < -30 || rv > RV_MAX) return;
    const p = proj(it.wx, rv);
    const s = clamp(1.1 - rv * 0.0032, 0.6, 1.1);
    if (it.kind === 'ramp') {
      ctx.fillStyle = '#c86828'; ctx.beginPath();
      ctx.moveTo(p.x - 12 * s, p.y); ctx.lineTo(p.x + 12 * s, p.y); ctx.lineTo(p.x + 12 * s, p.y - 12 * s); ctx.fill();
      ctx.fillStyle = '#f8f4e0'; ctx.fillRect(p.x - 10 * s, p.y - 3, 20 * s, 2);
    } else if (it.kind === 'barrier' && !it.done) {
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#f4f4f4' : '#e83030'; ctx.fillRect(p.x - 12 * s + i * 8 * s, p.y - 10 * s, 8 * s, 10 * s); }
    } else if (it.kind === 'water' && !it.done) {
      drawShadow(ctx, p.x, p.y, 14 * s);
      ctx.fillStyle = '#2878c8'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 14 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a8d8f8'; ctx.fillRect(p.x - 6 * s, p.y - 2, 5 * s, 1);
    } else if (it.kind === 'star' && !it.done) {
      drawSparkle(ctx, p.x, p.y - 8, this.frame);
    }
  }

  // ================= SCREENS =================

  drawTitleScene() {
    // a little slice of the neighborhood behind the title
    drawGround(ctx, this.frame * 0.6, 0, []);
    const p = proj(L.CENTER, BIKE_RV);
    drawShadow(ctx, p.x, p.y, 9);
    drawSprite(ctx, this.frame % 12 < 6 ? 'bike1' : 'bike2', p.x - 10, p.y - 24, false);
  }

  drawTitle() {
    this.drawTitleScene();
    ctx.fillStyle = 'rgba(10,20,30,0.35)'; ctx.fillRect(0, 0, VIEW_W, 150);
    text(ctx, 'EXTRA! EXTRA!', VIEW_W / 2, 30, '#f8e838', 9, 'center');
    text(ctx, 'PAPERMOORE', VIEW_W / 2, 48, '#f83828', 24, 'center');
    text(ctx, 'DELIVER THE NEWS. DODGE THE BLOCK.', VIEW_W / 2, 80, '#e8e8f0', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, this.touch ? 'TAP THROW TO START' : 'PRESS ENTER OR X', VIEW_W / 2, 118, '#fff', 9, 'center');
    text(ctx, `HI-SCORE ${String(this.hi).padStart(6, '0')}`, VIEW_W / 2, 224, '#a8e0f8', 8, 'center');
  }

  updateTitle() {
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('throw')) { this.sound.select(); this.state = 'select'; }
  }

  drawSelect() {
    ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'SELECT YOUR STREET', VIEW_W / 2, 34, '#f8e838', 10, 'center');
    DIFFS.forEach((d, i) => {
      const sel = i === this.diffSel;
      const y = 74 + i * 34;
      if (sel) { ctx.fillStyle = 'rgba(248,232,56,0.15)'; ctx.fillRect(30, y - 4, VIEW_W - 60, 28); }
      text(ctx, `${sel ? '▶ ' : '  '}${d.label}`, VIEW_W / 2, y, sel ? '#fff' : '#8898a8', 12, 'center');
      text(ctx, d.desc, VIEW_W / 2, y + 15, sel ? '#a8f8a8' : '#667', 8, 'center');
    });
    text(ctx, 'UP/DOWN CHOOSE  ·  X CONFIRM', VIEW_W / 2, 200, '#99a', 8, 'center');
  }

  updateSelect() {
    const inp = this.input;
    if (inp.pressed('up')) { this.diffSel = (this.diffSel + DIFFS.length - 1) % DIFFS.length; this.sound.select(); }
    if (inp.pressed('down')) { this.diffSel = (this.diffSel + 1) % DIFFS.length; this.sound.select(); }
    if (inp.pressed('throw') || inp.pressed('start')) { this.sound.select(); this.startRun(); }
  }

  drawDayIntro() {
    ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, `DAY ${this.day + 1} OF 7`, VIEW_W / 2, 60, '#a8e0f8', 9, 'center');
    text(ctx, DAY_NAMES[this.day], VIEW_W / 2, 90, '#f8e838', 20, 'center');
    text(ctx, `${this.subscribers} SUBSCRIBERS ON THE ROUTE`, VIEW_W / 2, 128, '#a8f8a8', 8, 'center');
    text(ctx, 'DELIVER TO TIDY HOUSES · SMASH THE DRAB ONES', VIEW_W / 2, 146, '#e8e8f0', 8, 'center');
    if (this.frame % 50 < 32) text(ctx, 'X TO RIDE', VIEW_W / 2, 190, '#fff', 9, 'center');
  }

  updateDayIntro() {
    this.introT++;
    if (this.introT > 20 && (this.input.pressed('throw') || this.input.pressed('start'))) this.enterPlay();
    if (this.introT > 260) this.enterPlay();
  }

  drawSummary() {
    ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const s = this.summary;
    text(ctx, `${DAY_NAMES[this.day]} COMPLETE`, VIEW_W / 2, 18, '#f8e838', 10, 'center');

    // street overview map (canonical Paperboy: every house on the block)
    const mapX = 24, mapY = 44, gap = (VIEW_W - 48) / Math.max(1, this.houses.length);
    text(ctx, 'YOUR STREET', VIEW_W / 2, 34, '#a8e0f8', 8, 'center');
    this.houses.forEach((h, i) => {
      const x = mapX + i * gap + gap / 2;
      const yTop = mapY, yBot = mapY + 40;
      const y = h.side === 'L' ? yTop : yBot;
      let col = '#5a5a64';
      if (h.subscriber) col = h.delivered ? '#40d040' : '#e83030';
      else if (h.scored) col = '#f89030';
      ctx.fillStyle = col; ctx.fillRect(x - 3, y, 6, 8);
      // roof
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.fill();
    });
    ctx.strokeStyle = '#444'; ctx.beginPath(); ctx.moveTo(mapX, mapY + 26); ctx.lineTo(VIEW_W - mapX, mapY + 26); ctx.stroke();

    text(ctx, `DELIVERED  ${s.delivered} / ${s.total}`, VIEW_W / 2, 108, '#40d040', 9, 'center');
    if (s.missed > 0) text(ctx, `CANCELLED  ${s.missed}  (SUBS LOST)`, VIEW_W / 2, 124, '#e83030', 8, 'center');
    text(ctx, `WINDOWS SMASHED  ${s.smashed}`, VIEW_W / 2, 138, '#f89030', 8, 'center');
    text(ctx, `BMX BONUS  ${s.bmxBonus}`, VIEW_W / 2, 152, '#a8e0f8', 8, 'center');
    if (s.perfect) text(ctx, 'PERFECT ROUTE! +1 SUBSCRIBER', VIEW_W / 2, 168, '#f8e838', 8, 'center');
    text(ctx, `SCORE  ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 184, '#fff', 9, 'center');
    if (this.summaryT > 30 && this.frame % 50 < 32) text(ctx, 'X TO CONTINUE', VIEW_W / 2, 210, '#fff', 8, 'center');
  }

  updateSummary() {
    this.summaryT++;
    if (this.summaryT > 30 && (this.input.pressed('throw') || this.input.pressed('start'))) this.advanceDay();
  }

  drawGameOver() {
    ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 70, '#f83828', 18, 'center');
    text(ctx, `YOU RODE TO ${DAY_NAMES[this.day]}`, VIEW_W / 2, 104, '#a8e0f8', 8, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 124, '#fff', 9, 'center');
    text(ctx, `HI-SCORE ${String(this.hi).padStart(6, '0')}`, VIEW_W / 2, 140, '#f8e838', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'X TO RETURN TO TITLE', VIEW_W / 2, 180, '#fff', 8, 'center');
  }

  updateGameOver() {
    if (this.input.pressed('throw') || this.input.pressed('start')) this.state = 'title';
  }

  drawWeekComplete() {
    ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // sunrise over the block
    const rise = Math.min(50, this.wcT / 6);
    ctx.fillStyle = '#f89030'; ctx.beginPath(); ctx.arc(VIEW_W / 2, 210 - rise, 40, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f8e838'; ctx.beginPath(); ctx.arc(VIEW_W / 2, 210 - rise, 24, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 190, VIEW_W, 50);
    text(ctx, 'SUNDAY DELIVERED!', VIEW_W / 2, 30, '#f8e838', 12, 'center');
    text(ctx, 'A FULL WEEK ON THE ROUTE.', VIEW_W / 2, 58, '#e8e8f0', 8, 'center');
    text(ctx, `${this.subscribers} LOYAL SUBSCRIBERS REMAIN.`, VIEW_W / 2, 74, '#a8f8a8', 8, 'center');
    text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 100, '#fff', 10, 'center');
    text(ctx, `HI-SCORE ${String(this.hi).padStart(6, '0')}`, VIEW_W / 2, 120, '#f8e838', 8, 'center');
    if (this.wcT > 60 && this.frame % 60 < 40) text(ctx, 'X TO RETURN TO TITLE', VIEW_W / 2, 150, '#fff', 8, 'center');
    drawSprite(ctx, this.frame % 12 < 6 ? 'bike1' : 'bike2', VIEW_W / 2 - 10, 170, false);
  }

  updateWeekComplete() {
    this.wcT++;
    if (this.wcT > 60 && (this.input.pressed('throw') || this.input.pressed('start'))) { this.state = 'title'; this.sound.stopMusic(); }
  }

  // ---------------- frame ----------------

  tick() {
    this.frame++;
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.sound.updateMusic();

    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'select': this.updateSelect(); this.drawSelect(); break;
      case 'dayintro': this.updateDayIntro(); this.drawDayIntro(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'bmx': this.updateBmx(); this.drawBmx(); break;
      case 'summary': this.updateSummary(); this.drawSummary(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'weekcomplete': this.updateWeekComplete(); this.drawWeekComplete(); break;
    }
    this.input.endFrame();
  }
}

function quadFill(a, b, c, d, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
  ctx.closePath(); ctx.fill();
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
