// Donkey Moore — main loop, states, HUD, spawning, scoring.
// A Donkey Kong style girder-climbing arcade platformer. Vanilla JS + canvas.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { Player } from './player.js';
import { Barrel, Flame, Effects, aabb } from './entities.js';
import {
  VIEW_W, VIEW_H, GIRDERS, LADDERS, HAMMERS, START, OIL_DRUM, DK, LADY,
  BARREL_SPAWN, GOAL, surfaceY,
} from './level.js';
import {
  drawGirder, drawLadder, drawWalls, drawHero, drawBarrel, drawDK, drawLady,
  drawHelp, drawOilDrum, drawFlame, drawHammer, drawHammerPickup, drawPopup,
} from './sprites.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.max(1, Math.min(Math.floor(window.innerWidth / VIEW_W), Math.floor(window.innerHeight / VIEW_H)));
  canvas.style.width = `${VIEW_W * s}px`;
  canvas.style.height = `${VIEW_H * s}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function text(str, x, y, color = '#fff', size = 8, align = 'left') {
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const LS_HI = 'donkeyMoore.hi';
function loadHi() { const v = parseInt(localStorage.getItem(LS_HI) || '0', 10); return isNaN(v) ? 0 : v; }
function saveHi(v) { try { localStorage.setItem(LS_HI, String(v)); } catch { /* ignore */ } }

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';   // title | intro | play | dying | levelclear | gameover
    this.hi = loadHi();
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.frame = 0;
    this.timer = 0;
    this.player = new Player(START);
    this.barrels = [];
    this.flame = null;
    this.fx = new Effects();
    this.hammers = [];
    this.throwAnim = 0;
  }

  start() {
    this.sound.unlock();
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.sound.playMusic('intro');
    this.setupLevel();
    this.state = 'intro';
    this.introT = 2.0;
  }

  setupLevel() {
    this.player.reset(START);
    this.barrels = [];
    this.flame = new Flame();
    this.fx = new Effects();
    this.hammers = HAMMERS.map((h) => ({ gi: h.gi, x: h.x, taken: false }));
    this.bonus = 5000;
    this.bonusAcc = 0;
    this.invuln = 1.6;
    this.flameWake = Math.max(4, 7 - this.level * 0.5);
    this.spawnT = 1.2;
    this.spawnInterval = Math.max(0.85, 2.3 - this.level * 0.2);
    this.barrelSpeed = 1.1 + this.level * 0.13;
    this.diff = 1 + (this.level - 1) * 0.6;
    this.throwAnim = 0;
  }

  spawnBarrel() {
    const g = GIRDERS[BARREL_SPAWN.gi];
    const b = new Barrel(BARREL_SPAWN.x, surfaceY(g, BARREL_SPAWN.x), BARREL_SPAWN.gi, 1, this.barrelSpeed);
    b.ladderChance = 0.9 * this.diff;
    // occasional wild/blue barrel that always takes ladders (a bit faster)
    if (Math.random() < 0.18 + this.level * 0.03) { b.speed *= 1.15; b.ladderChance = 3 * this.diff; }
    this.barrels.push(b);
    this.throwAnim = 0.4;
    this.sound.tone(160, 0.12, 'sawtooth', 0.2, 90);
  }

  loseLife() {
    this.lives--;
    this.sound.setRumble(0);
    this.sound.stopMusic();
    this.sound.death();
    this.state = 'dying';
    this.timer = 1.4;
    this.player.dead = true;
    if (this.score > this.hi) { this.hi = this.score; saveHi(this.hi); }
  }

  addScore(n) {
    this.score += n;
    if (this.score > this.hi) { this.hi = this.score; saveHi(this.hi); }
  }

  update(dt) {
    this.frame++;
    this.input.pollGamepad();
    this.sound.updateMusic();

    if (this.input.pressed('mute')) {
      const m = this.sound.toggleMute();
      this.fx.popup(VIEW_W / 2, 44, m ? 'MUTE' : 'SOUND', '#8cf');
    }

    if (this.state === 'title') {
      if (this.input.pressed('start') || this.input.pressed('jump')) this.start();
    } else if (this.state === 'intro') {
      this.introT -= dt;
      this.flame && this.flame; // idle
      if (this.introT <= 0) { this.state = 'play'; this.sound.playMusic('play'); }
    } else if (this.state === 'play') {
      this.updatePlay(dt);
    } else if (this.state === 'dying') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.lives <= 0) { this.state = 'gameover'; this.timer = 0; }
        else {
          this.player.reset(START);
          this.barrels = [];
          this.flame = new Flame();
          this.bonus = 5000;
          this.invuln = 1.8;
          this.flameWake = Math.max(4, 7 - this.level * 0.5);
          this.spawnT = 1.2;
          this.state = 'play';
          this.sound.playMusic('play');
        }
      }
    } else if (this.state === 'levelclear') {
      this.timer -= dt;
      // drain bonus into score
      if (this.bonus > 0) {
        const step = Math.min(this.bonus, 200);
        this.bonus -= step; this.addScore(step);
        if (this.frame % 3 === 0) this.sound.bonusTick();
      }
      if (this.timer <= 0) {
        this.level++;
        this.setupLevel();
        this.state = 'intro';
        this.introT = 1.4;
        this.sound.playMusic('intro');
      }
    } else if (this.state === 'gameover') {
      if (this.input.pressed('start') || this.input.pressed('jump')) { this.state = 'title'; }
    }

    this.fx.update(dt);
    this.input.endFrame();
  }

  updatePlay(dt) {
    const p = this.player;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flameWake > 0) { this.flameWake -= dt; if (this.flameWake <= 0 && this.flame) this.flame.active = true; }
    const ev = p.update(dt, this.input, () => this.sound.jump());
    if (ev === 'death') { this.fx.burst(p.x, p.y - 10, '#fff'); this.loseLife(); return; }
    if (p.moving && p.onLadder && this.frame % 8 === 0) this.sound.climb();

    // spawn barrels
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnBarrel(); this.spawnT = this.spawnInterval * (0.7 + Math.random() * 0.6); }
    if (this.throwAnim > 0) this.throwAnim -= dt;

    // update barrels
    let active = 0;
    for (const b of this.barrels) {
      b.update(this.diff);
      if (b.mode === 'roll' || b.mode === 'fall') active++;
      // hammer smash
      if (p.hammer > 0) {
        const dx = Math.abs(b.x - (p.x + p.facing * 8));
        const dy = Math.abs(b.y - (p.y - 10));
        if (dx < 12 && dy < 14) {
          b.dead = true;
          this.addScore(300);
          this.fx.burst(b.x, b.y, '#ffb060');
          this.fx.popup(b.x, b.y - 8, '300', '#ffd060');
          this.sound.hammerHit();
          continue;
        }
      }
      // jump-over scoring
      if (!b.scored && p.jumping) {
        const dx = Math.abs(b.x - p.x);
        const gap = b.y - p.y;
        if (dx < 8 && gap > 4 && gap < 28) {
          b.scored = true;
          this.addScore(100);
          this.fx.popup(p.x, p.y - 24, '100', '#8cf');
          this.sound.point();
        }
      }
      // body collision -> death
      if (!p.dead) {
        const bb = { x: b.x - 6, y: b.y - 6, w: 12, h: 12 };
        if (aabb(p.bbox(), bb)) {
          if (p.hammer > 0) { b.dead = true; this.addScore(300); this.fx.burst(b.x, b.y, '#ffb060'); this.sound.hammerHit(); }
          else if (this.invuln <= 0) { this.fx.burst(p.x, p.y - 10, '#f44'); this.loseLife(); return; }
        }
      }
      // a barrel rolling into the oil drum wakes a flame
      if (b.dead && b.gi === 0 && this.flame && !this.flame.active) this.flame.active = true;
    }
    this.barrels = this.barrels.filter((b) => !b.dead);
    this.sound.setRumble(Math.min(1, active / 5));

    // flame
    if (this.flame) {
      this.flame.update(dt, p);
      const fb = { x: this.flame.x - 4, y: this.flame.y - 14, w: 8, h: 14 };
      if (this.flame.active && this.invuln <= 0 && p.hammer <= 0 && aabb(p.bbox(), fb)) {
        this.fx.burst(p.x, p.y - 10, '#4af'); this.loseLife(); return;
      }
    }

    // hammer pickups
    for (const h of this.hammers) {
      if (h.taken) continue;
      const hy = surfaceY(GIRDERS[h.gi], h.x);
      const hb = { x: h.x - 7, y: hy - 20, w: 14, h: 20 };
      if (aabb(p.bbox(), hb)) {
        h.taken = true;
        p.giveHammer(7);
        this.fx.popup(h.x, hy - 24, 'HAMMER!', '#ffd060');
        this.sound.hammerGet();
      }
    }

    // bonus timer
    this.bonusAcc += dt * 100;
    while (this.bonusAcc >= 100) { this.bonusAcc -= 100; this.bonus -= 100; this.sound.bonusTick(); }
    if (this.bonus <= 0) { this.bonus = 0; this.fx.burst(p.x, p.y - 10, '#fff'); this.loseLife(); return; }

    // win: reach the top girder near the captured character
    if (p.gi === 5 && p.x <= GOAL.x + 6 && !p.won) {
      p.won = true;
      this.state = 'levelclear';
      this.timer = 3.2;
      this.addScore(1000);
      this.sound.stopMusic();
      this.sound.setRumble(0);
      this.sound.win();
      this.fx.popup(LADY.x, LADY.y - 12, 'RESCUE!', '#ff8ac8');
    }
  }

  // ------------------------------------------------------------------ draw
  draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawWalls(ctx, VIEW_H);

    // structure
    for (const l of LADDERS) drawLadder(ctx, l);
    for (const g of GIRDERS) drawGirder(ctx, g);

    // oil drum bottom-left
    drawOilDrum(ctx, OIL_DRUM.x, surfaceY(GIRDERS[0], OIL_DRUM.x), this.timeSec());

    // Donkey Moore + lady (drawn atop the top girder)
    drawDK(ctx, DK.x, DK.y, this.timeSec());
    if (this.throwAnim > 0) { // arm-raise flash when throwing
      ctx.fillStyle = '#6b3a1a';
      ctx.fillRect(DK.x + 16, DK.y - 12, 8, 8);
    }
    // small platform under lady
    ctx.fillStyle = '#d23c2a';
    ctx.fillRect(LADY.x - 16, LADY.y + 12, 34, 5);
    ctx.fillStyle = '#ff7a5c';
    ctx.fillRect(LADY.x - 16, LADY.y + 12, 34, 1);
    drawLady(ctx, LADY.x, LADY.y, this.timeSec());
    if (this.state === 'play' || this.state === 'intro') drawHelp(ctx, LADY.x, LADY.y - 12, this.timeSec());

    // hammers
    for (const h of this.hammers) {
      if (h.taken) continue;
      drawHammerPickup(ctx, h.x, surfaceY(GIRDERS[h.gi], h.x), this.timeSec());
    }

    // barrels
    for (const b of this.barrels) drawBarrel(ctx, b);

    // flame
    if (this.flame && this.flame.active && this.state !== 'title') drawFlame(ctx, this.flame);

    // player + hammer
    if (this.state === 'play' || this.state === 'dying' || this.state === 'levelclear' || this.state === 'intro') {
      if (!(this.state === 'dying')) this.drawPlayerFull();
      else this.drawDying();
    }

    this.fx.draw(ctx, drawPopup);
    this.drawHUD();

    if (this.state === 'title') this.drawTitle();
    else if (this.state === 'intro') this.drawIntroText();
    else if (this.state === 'levelclear') text('RESCUED!  +BONUS', VIEW_W / 2, 132, '#ff8ac8', 10, 'center');
    else if (this.state === 'gameover') this.drawGameOver();
  }

  drawPlayerFull() {
    const p = this.player;
    if (this.invuln > 0 && Math.floor(this.frame / 4) % 2) return; // blink while safe
    drawHero(ctx, p);
    if (p.hammer > 0) {
      const up = p.hammerSwing < 0.5;
      drawHammer(ctx, p.x + p.facing * 7, p.y - 8, up);
    }
  }

  drawDying() {
    const p = this.player;
    const t = 1.4 - this.timer;
    ctx.save();
    ctx.translate(p.x, p.y - 10);
    ctx.rotate(t * 8);
    ctx.translate(-p.x, -(p.y - 10));
    drawHero(ctx, p);
    ctx.restore();
    if (Math.floor(t * 8) % 2) text('OUCH', p.x, p.y - 40, '#fff', 8, 'center');
  }

  drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, 22);
    text('1UP', 8, 2, '#f44', 8);
    text(String(this.score).padStart(6, '0'), 8, 11, '#fff', 8);
    text('HIGH', 92, 2, '#4cf', 8);
    text(String(this.hi).padStart(6, '0'), 92, 11, '#fff', 8);
    text('L' + this.level, 178, 2, '#fd6', 8);
    text('BONUS ' + this.bonusDisplay(), 178, 11, '#fd6', 7, 'left');
    // lives
    for (let i = 0; i < this.lives; i++) {
      const x = 150 + i * 9;
      ctx.fillStyle = '#d02a2a';
      ctx.fillRect(x, 3, 6, 5);
      ctx.fillStyle = '#e8b088';
      ctx.fillRect(x + 1, 8, 4, 3);
    }
  }

  bonusDisplay() { return this.bonus != null ? String(Math.max(0, this.bonus)) : '0'; }

  drawTitle() {
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 90, VIEW_W, 96);
    text('DONKEY', VIEW_W / 2, 100, '#ff5a3c', 22, 'center');
    text('MOORE', VIEW_W / 2, 126, '#ffd84a', 22, 'center');
    text('climb the girders  rescue the top', VIEW_W / 2, 152, '#9ab', 8, 'center');
    if (Math.floor(this.timeSec() * 2) % 2)
      text('PRESS ENTER / JUMP', VIEW_W / 2, 168, '#fff', 9, 'center');
  }

  drawIntroText() {
    if (Math.floor(this.timeSec() * 3) % 2)
      text('HOW HIGH CAN YOU GET?', VIEW_W / 2, 132, '#4cf', 9, 'center');
    text('LEVEL ' + this.level, VIEW_W / 2, 146, '#fd6', 8, 'center');
  }

  drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 96, VIEW_W, 70);
    text('GAME OVER', VIEW_W / 2, 108, '#f44', 18, 'center');
    text('SCORE ' + this.score, VIEW_W / 2, 132, '#fff', 9, 'center');
    if (Math.floor(this.timeSec() * 2) % 2)
      text('PRESS ENTER', VIEW_W / 2, 148, '#9ab', 9, 'center');
  }

  timeSec() { return this.frame / 60; }
}

const game = new Game();

// fixed-timestep loop
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  acc += dt;
  let guard = 0;
  while (acc >= STEP && guard < 5) { game.update(STEP); acc -= STEP; guard++; }
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- test hook ----
window.__dm = {
  start: () => game.start(),
  press: (a) => game.input.press(a),
  get state() { return game.state; },
  get score() { return game.score; },
  get lives() { return game.lives; },
  get level() { return game.level; },
  get barrels() { return game.barrels.length; },
  get player() { return { x: game.player.x, y: game.player.y, gi: game.player.gi, onLadder: game.player.onLadder, jumping: game.player.jumping, hammer: game.player.hammer }; },
  _game: game,
};
