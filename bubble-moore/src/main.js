// Bubble Moore — main loop, states, HUD. A single-screen bubble-trapping
// arcade platformer in the NES style.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, drawSprite, drawLevelTile, drawBubble, THEMES } from './sprites.js';
import { TILE, GRID_W, GRID_H, T, LEVELS, parseLevel, tileAt } from './levels.js';
import {
  Player, Bubble, Enemy, Item, Skull, overlap,
  FRUIT_FOR, VIEW_W, VIEW_H,
} from './entities.js';

const HURRY_AT = 2400;      // 40s until HURRY UP!!
const SKULL_AT = HURRY_AT + 180;
const HI_KEY = 'bubble-moore-hi';

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

const POWERUPS = ['i_shoes', 'i_fastbub', 'i_range', 'i_candy'];

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.menuSel = 0;
    this.hiscore = Number(localStorage.getItem(HI_KEY)) || 30000;
    this.titleBubbles = Array.from({ length: 14 }, (_, i) => ({
      x: 20 + (i * 37) % 216, y: (i * 53) % 224, r: 4 + (i % 3) * 3, s: 0.25 + (i % 4) * 0.12,
    }));
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / round setup ----------------

  startRun(twoP) {
    this.players = [new Player(0)];
    if (twoP) this.players.push(new Player(1));
    this.roundIdx = 0;
    this.beginRound();
  }

  beginRound() {
    const lv = parseLevel(this.roundIdx);
    this.grid = lv.grid;
    this.theme = lv.theme;
    this.starts = [lv.p1, lv.p2];
    this.enemies = lv.spawns.map((s) => new Enemy(s.t, s.x, s.y));
    this.bubbles = [];
    this.items = [];
    this.projectiles = [];
    this.texts = [];
    this.skull = new Skull();
    this.timer = 0;
    this.hurryOn = false;
    this.clearT = 0;
    this.paused = false;
    this.players.forEach((p, i) => {
      if (!p.gone) p.reset(this.starts[i].x, this.starts[i].y);
    });
    this.state = 'round';
    this.roundT = 0;
    this.sound.stopMusic();
  }

  enterPlay() {
    this.state = 'play';
    this.sound.playMusic('play');
  }

  // ---------------- helpers used by entities ----------------

  nearestPlayer(x, y) {
    let best = null, bd = 1e9;
    for (const p of this.players) {
      if (p.gone || p.dead) continue;
      const d = Math.abs(p.x - x) + Math.abs(p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  addBubble(player) {
    if (this.bubbles.filter((b) => !b.popped).length >= 12) return;
    const bx = player.x + player.w / 2 + player.face * 12;
    const by = player.y + 6;
    this.bubbles.push(new Bubble(player, bx, by, player.face));
  }

  floatText(x, y, n) {
    this.texts.push({ x, y, n, t: 0 });
  }

  enemyPopped(bubble, byPlayer) {
    const e = bubble.enemy;
    const kind = FRUIT_FOR[e.t];
    const item = new Item(kind, bubble.x - 5, bubble.y - 5);
    item.vx = (Math.random() - 0.5) * 1.4;
    this.items.push(item);
    const p = byPlayer && !byPlayer.gone ? byPlayer : this.players[0];
    p.addScore(this, 1000);
    this.floatText(bubble.x, bubble.y - 8, 1000);
    // the occasional powerup rains from above
    this.popCount = (this.popCount || 0) + 1;
    if (this.popCount % 5 === 3) {
      const kind2 = POWERUPS[(this.popCount / 5 | 0) % POWERUPS.length];
      const drop = new Item(kind2, 32 + Math.random() * (VIEW_W - 74), 4);
      drop.vy = 0.5;
      this.items.push(drop);
    }
  }

  releaseAngry(bubble) {
    const e = bubble.enemy;
    e.trapped = false;
    e.angry = true;
    e.x = Math.max(18, Math.min(VIEW_W - 32, bubble.x - e.w / 2));
    e.y = bubble.y - e.h / 2;
    e.vy = 0;
    this.enemies.push(e);
    this.sound.angry();
  }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;

    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (this.paused) return;

    for (const p of this.players) p.update(this, inp);

    // bubbles
    for (const b of this.bubbles) b.update(this);
    this.bubbles = this.bubbles.filter((b) => !(b.popped && b.popT > 8));
    // trapped enemies live inside their bubble, not in the list
    this.enemies = this.enemies.filter((e) => !e.trapped);

    for (const e of this.enemies) e.update(this);

    // projectiles
    for (const pr of this.projectiles) pr.x += pr.vx;
    this.projectiles = this.projectiles.filter((pr) => {
      if (pr.x < 12 || pr.x > VIEW_W - 12) return false;
      return tileAt(this.grid, Math.floor(pr.x / TILE), Math.floor(pr.y / TILE)) !== T.SOLID;
    });

    // items
    for (const it of this.items) it.update(this);
    for (const it of [...this.items]) {
      for (const p of this.players) {
        if (p.gone || p.dead) continue;
        if (overlap(it, p)) {
          it.collect(this, p);
          this.items = this.items.filter((x) => x !== it);
          break;
        }
      }
    }
    this.items = this.items.filter((it) => it.life > 0);

    // hostiles vs players
    for (const p of this.players) {
      if (p.gone || p.dead || p.invuln > 0) continue;
      for (const e of this.enemies) {
        if (overlap(e, p)) { p.die(this); break; }
      }
      if (!p.dead) {
        for (const pr of this.projectiles) {
          if (overlap(pr, p)) { p.die(this); break; }
        }
      }
      if (!p.dead && this.skull.on && overlap(this.skull, p)) p.die(this);
    }

    // death / respawn
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.gone || !p.dead) continue;
      if (p.deadT === 130) {
        p.loseLife();
        if (p.lives <= 0) {
          p.gone = true;
        } else {
          p.reset(this.starts[i].x, this.starts[i].y);
          // a death resets the hurry clock
          this.timer = 0;
          this.hurryOn = false;
          this.skull.deactivate();
          if (this.sound.trackName === 'hurry') this.sound.playMusic('play');
        }
      }
    }
    if (this.players.every((p) => p.gone)) {
      this.saveHi();
      this.state = 'gameover';
      this.sound.stopMusic();
      return;
    }

    // hurry-up timer
    if (this.clearT === 0) {
      this.timer++;
      if (this.timer === HURRY_AT) {
        this.hurryOn = true;
        this.sound.hurry();
        this.sound.playMusic('hurry');
      }
      if (this.timer === SKULL_AT) {
        this.skull.activate(8, 8);
        this.sound.skullSfx();
      }
    }
    this.skull.update(this);

    // floating score texts
    for (const t of this.texts) { t.t++; t.y -= 0.4; }
    this.texts = this.texts.filter((t) => t.t < 50);

    // round clear: no free enemies and none left trapped
    const anyTrapped = this.bubbles.some((b) => b.enemy);
    if (this.clearT === 0 && this.enemies.length === 0 && !anyTrapped) {
      this.clearT = 1;
      this.skull.deactivate();
      this.hurryOn = false;
      this.sound.clearJingle();
    }
    if (this.clearT > 0 && ++this.clearT > 170) {
      this.roundIdx++;
      if (this.roundIdx >= LEVELS.length) {
        this.saveHi();
        this.state = 'win';
        this.winT = 0;
        this.sound.playMusic('win');
      } else {
        this.beginRound();
      }
    }
  }

  saveHi() {
    for (const p of this.players) this.hiscore = Math.max(this.hiscore, p.score);
    localStorage.setItem(HI_KEY, String(this.hiscore));
  }

  // ---------------- rendering ----------------

  drawBackdrop() {
    const th = THEMES[this.theme];
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // faint starfield dots
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect((i * 53 + 13) % VIEW_W, (i * 37 + 29) % VIEW_H, 2, 2);
    }
  }

  drawTiles() {
    for (let ty = 0; ty < GRID_H; ty++) {
      for (let tx = 0; tx < GRID_W; tx++) {
        if (tileAt(this.grid, tx, ty) === T.SOLID) drawLevelTile(ctx, this.theme, tx * TILE, ty * TILE);
      }
    }
  }

  drawHUD() {
    const p1 = this.players[0];
    text(ctx, `1UP ${String(p1.score).padStart(6, '0')}`, 4, 2, '#38c048');
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 2, '#f8d838', 8, 'center');
    if (this.players[1]) {
      text(ctx, `2UP ${String(this.players[1].score).padStart(6, '0')}`, VIEW_W - 4, 2, '#40c8d8', 8, 'right');
    }
    // lives markers along the bottom edge
    for (let i = 0; i < Math.min(p1.lives - 1, 5); i++) {
      drawSprite(ctx, 'd_stand', 20 + i * 11, VIEW_H - 13, false, 10, 10);
    }
    if (this.players[1]) {
      for (let i = 0; i < Math.min(this.players[1].lives - 1, 5); i++) {
        drawSprite(ctx, 'd_stand_p2', VIEW_W - 30 - i * 11, VIEW_H - 13, true, 10, 10);
      }
    }
  }

  drawPlay() {
    this.drawBackdrop();
    this.drawTiles();
    for (const it of this.items) it.draw(ctx, this.frame);
    for (const e of this.enemies) e.draw(ctx, this.frame);
    for (const p of this.players) p.draw(ctx, this.frame);
    for (const b of this.bubbles) b.draw(ctx, this.frame);
    ctx.fillStyle = '#a8a8b8';
    for (const pr of this.projectiles) ctx.fillRect(pr.x - 2, pr.y - 2, 4, 4);
    this.skull.draw(ctx, this.frame);
    for (const t of this.texts) {
      if (t.t < 44 || this.frame % 4 < 2) text(ctx, String(t.n), t.x, t.y, '#f8f8a8', 7, 'center');
    }
    this.drawHUD();

    if (this.hurryOn && this.clearT === 0 && this.frame % 30 < 18) {
      text(ctx, 'HURRY UP!!', VIEW_W / 2, 96, '#f84040', 12, 'center');
    }
    if (this.clearT > 30) {
      text(ctx, this.roundIdx + 1 >= LEVELS.length ? 'ALL CLEAR!' : 'ROUND CLEAR!', VIEW_W / 2, 96, '#f8d838', 12, 'center');
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 104, '#f8f8f8', 12, 'center');
    }
  }

  drawTitleBubbles() {
    for (const b of this.titleBubbles) {
      b.y -= b.s;
      if (b.y < -10) { b.y = VIEW_H + 10; b.x = 20 + Math.random() * 216; }
      drawBubble(ctx, b.x + Math.sin((this.frame + b.x) / 40) * 3, b.y, b.r, this.frame);
    }
  }

  drawTitle() {
    ctx.fillStyle = '#000814';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawTitleBubbles();

    text(ctx, 'B U B B L E', VIEW_W / 2, 34, '#38c048', 24, 'center');
    text(ctx, 'M O O R E', VIEW_W / 2, 62, '#f8d838', 24, 'center');
    text(ctx, 'A DRAGON. A LOT OF BUBBLES.', VIEW_W / 2, 92, '#8899aa', 8, 'center');

    const opts = ['1P START', '2P START'];
    opts.forEach((o, i) => {
      const sel = this.menuSel === i;
      text(ctx, `${sel ? '>' : ' '} ${o}`, VIEW_W / 2 - 34, 122 + i * 14, sel ? '#f8f8f8' : '#667', 9);
    });
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 158, '#f8d838', 8, 'center');
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP JUMP TO START' : 'PUSH ENTER TO START', VIEW_W / 2, 176, '#f8f8f8', 8, 'center');
    }
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 208, '#556', 8, 'center');

    drawSprite(ctx, 'd_stand', 36, 130, false);
    drawSprite(ctx, 'd_stand_p2', 204, 144, true);
  }

  updateTitle() {
    const inp = this.input;
    if (inp.pressed('up') || inp.pressed('down')) {
      this.menuSel = 1 - this.menuSel;
      this.sound.bounce();
    }
    if (inp.pressed('start') || inp.pressed('jump') || inp.pressed('fire')) {
      this.startRun(this.menuSel === 1);
    }
  }

  drawRound() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, `ROUND ${this.roundIdx + 1}`, VIEW_W / 2, 92, '#f8f8f8', 14, 'center');
    text(ctx, THEMES[this.theme].name, VIEW_W / 2, 116, '#8899aa', 8, 'center');
    const newFoe = { 4: 'NEW: SPRINGO THE HOPPER', 9: 'NEW: PUFFISH THE FLOATER', 14: 'NEW: GROGG THE SPITTER' }[this.roundIdx];
    if (newFoe) text(ctx, newFoe, VIEW_W / 2, 136, '#f84040', 8, 'center');
  }

  updateRound() {
    this.roundT++;
    if (this.roundT > 100 || (this.roundT > 20 && this.input.pressed('start'))) this.enterPlay();
  }

  drawGameOver() {
    ctx.fillStyle = '#000408';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawTitleBubbles();
    text(ctx, 'GAME OVER', VIEW_W / 2, 76, '#f84040', 16, 'center');
    text(ctx, `ROUND ${this.roundIdx + 1}`, VIEW_W / 2, 104, '#8899aa', 8, 'center');
    this.players.forEach((p, i) => {
      text(ctx, `${i + 1}UP ${String(p.score).padStart(6, '0')}`, VIEW_W / 2, 120 + i * 12, i ? '#40c8d8' : '#38c048', 8, 'center');
    });
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 150, '#f8d838', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 180, '#f8f8f8', 8, 'center');
  }

  updateGameOver() {
    if (this.input.pressed('start') || this.input.pressed('fire') || this.input.pressed('jump')) {
      this.state = 'title';
    }
  }

  drawWin() {
    this.winT++;
    ctx.fillStyle = '#040014';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawTitleBubbles();
    text(ctx, 'YOU DID IT!', VIEW_W / 2, 48, '#f8d838', 16, 'center');
    text(ctx, 'ALL 20 ROUNDS CLEARED', VIEW_W / 2, 76, '#f8f8f8', 8, 'center');
    text(ctx, 'THE CAVE OF SUGAR IS FREE', VIEW_W / 2, 90, '#8899aa', 8, 'center');
    text(ctx, 'AND MOORE SLEEPS HAPPY.', VIEW_W / 2, 102, '#8899aa', 8, 'center');
    this.players.forEach((p, i) => {
      text(ctx, `${i + 1}UP ${String(p.score).padStart(6, '0')}`, VIEW_W / 2, 126 + i * 12, i ? '#40c8d8' : '#38c048', 8, 'center');
    });
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 156, '#f8d838', 8, 'center');
    const bounce = Math.abs(Math.sin(this.winT / 20)) * 10;
    drawSprite(ctx, 'd_jump', VIEW_W / 2 - 24, 178 - bounce, false);
    if (this.players[1]) drawSprite(ctx, 'd_jump_p2', VIEW_W / 2 + 8, 178 - Math.abs(Math.sin(this.winT / 20 + 1)) * 10, true);
    if (this.winT > 180 && this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 204, '#f8f8f8', 8, 'center');
  }

  updateWin() {
    if (this.winT > 180 && (this.input.pressed('start') || this.input.pressed('fire') || this.input.pressed('jump'))) {
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
      case 'round': this.updateRound(); this.drawRound(); break;
      case 'play': this.updatePlay(); if (this.state === 'play') this.drawPlay(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'win': this.updateWin(); this.drawWin(); break;
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
