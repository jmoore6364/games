// Golden Moore — main loop, states, camera-locked arena brawling, HUD.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, drawSprite, drawRock } from './sprites.js';
import {
  VIEW_W, VIEW_H, GROUND_TOP, GROUND_BOT, STAGES, ENDING,
  drawBackdrop, drawGround,
} from './levels.js';
import {
  Player, spawnEnemy, damageEnemy, updateEnemies, drawEnemy,
  updateItems, drawItem, updateFx, drawFx, rnd,
} from './entities.js';

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

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HISCORE_KEY = 'golden-moore-hiscore';

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.attractT = 0;
    this.hiscore = +(localStorage.getItem(HISCORE_KEY) || 0);
    this.score = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / stage setup ----------------

  startRun() {
    this.lives = 3;
    this.continues = 2;
    this.score = 0;
    this.vials = 1;
    this.stageIdx = 0;
    this.sound.titleSting();
    this.beginStage();
  }

  beginStage() {
    this.stage = STAGES[this.stageIdx];
    this.camX = 0;
    this.locked = false;
    this.trigIdx = 0;
    this.waveIdx = 0;
    this.waveDelay = 0;
    this.stageDone = false;
    this.clearT = 0;
    this.enemies = [];
    this.items = [];
    this.fx = [];
    this.shots = [];
    this.magic = null;
    this.hitstop = 0;
    this.shake = 0;
    this.focus = null;
    this.focusT = 0;
    this.banner = null;
    this.bannerT = 0;
    this.goPulse = 0;
    this.paused = false;
    this.bonusT = this.stage.bonus ? this.stage.time : 0;
    this.thiefTick = 0;
    this.player = new Player(60, (GROUND_TOP + GROUND_BOT) / 2);
    this.state = 'story';
    this.storyT = 0;
    this.sound.stopMusic();
  }

  enterPlay() {
    this.state = 'play';
    this.banner = this.stage.title;
    this.bannerT = 140;
    this.sound.playMusic(this.stage.music);
  }

  // ---------------- helpers used by entities ----------------

  addScore(n) {
    this.score += n;
    if (this.score > this.hiscore) this.hiscore = this.score;
  }

  addSpark(x, y) {
    this.fx.push({ kind: 'spark', x, y, tt: 0, life: 8 });
  }

  dropItem(t, x, y, vz = 2) {
    this.items.push({ t, x, y: clamp(y, GROUND_TOP + 4, GROUND_BOT), z: 6, vz, age: 0 });
  }

  clampPlayer(p) {
    const o = p.riding || p;
    const lo = this.camX + 10;
    const hi = Math.min(this.camX + VIEW_W - 10, this.stage.width - 10);
    o.x = clamp(o.x, lo, hi);
    if (p.riding) { p.x = o.x; p.y = o.y; }
  }

  bossPhase(e) {
    return e.hp > e.hpMax * 2 / 3 ? 0 : e.hp > e.hpMax / 3 ? 1 : 2;
  }

  onBossDown() {
    this.shake = 20;
  }

  // ---------------- magic ----------------

  castMagic() {
    if (this.vials <= 0 || this.magic) { this.sound.fizzle(); return; }
    const n = this.vials;
    this.vials = 0;
    const rocks = [];
    const count = 5 + n * 2;
    for (let i = 0; i < count; i++) {
      rocks.push({
        x: this.camX + 14 + (i * (VIEW_W - 28)) / (count - 1) + rnd(-8, 8),
        y: rnd(GROUND_TOP + 8, GROUND_BOT),
        delay: i % 2 === 0 ? i : count - i,
      });
    }
    this.magic = { t: 0, n, rocks };
    this.player.state = 'cast';
    this.player.st = 0;
    this.shake = 10 + n * 2;
    this.sound.magic(n);
  }

  updateMagic() {
    const m = this.magic;
    if (!m) return;
    m.t++;
    if (m.t === 14) {
      const dmg = 5 + m.n * 3;
      for (const e of this.enemies) {
        if (e.gone || e.t === 'beast') continue;
        if (e.x < this.camX - 16 || e.x > this.camX + VIEW_W + 16) continue;
        damageEnemy(this, e, dmg, this.player.x, { down: true, pierce: true });
      }
      this.shake = Math.max(this.shake, 12);
    }
    if (m.t > 54) this.magic = null;
  }

  // ---------------- triggers / waves ----------------

  currentTrigger() { return this.stage.triggers[this.trigIdx]; }

  hostilesAlive() {
    return this.enemies.some((e) => e.hostile && !e.dead && !e.gone);
  }

  startWave(i) {
    const trig = this.currentTrigger();
    this.waveIdx = i;
    for (const def of trig.waves[i]) spawnEnemy(this, def);
    if (i === 0 && trig.name) {
      this.banner = trig.name;
      this.bannerT = 120;
      if (trig.boss) this.sound.bossRoar();
    }
  }

  updateTriggers() {
    if (this.stage.bonus || this.stageDone) return;
    const trig = this.currentTrigger();
    if (!this.locked) {
      if (trig && this.camX >= trig.x - 1) {
        this.camX = trig.x;
        this.locked = true;
        this.waveDelay = 0;
        if (trig.boss) this.sound.playMusic('boss');
        this.startWave(0);
      }
      return;
    }
    // locked: wait for the wave to fall
    if (this.hostilesAlive()) { this.waveDelay = 0; return; }
    this.waveDelay++;
    if (this.waveDelay < 40) return;
    this.waveDelay = 0;
    if (this.waveIdx + 1 < trig.waves.length) {
      this.startWave(this.waveIdx + 1);
      return;
    }
    // arena cleared
    this.locked = false;
    this.trigIdx++;
    this.addScore(300);
    if (this.trigIdx >= this.stage.triggers.length) {
      this.stageDone = true;
      this.clearT = 210;
      this.sound.stageClearJingle();
      if (trig.boss) this.sound.stopMusic();
    } else {
      this.sound.go();
    }
  }

  // ---------------- bonus camp ----------------

  updateBonus() {
    this.bonusT--;
    this.thiefTick--;
    const thieves = this.enemies.filter((e) => e.t === 'thief').length;
    if (this.bonusT > 140 && this.thiefTick <= 0 && thieves < 5) {
      this.thiefTick = 55;
      spawnEnemy(this, { t: 'thief', side: Math.random() < 0.5 ? -1 : 1 });
    }
    if (this.bonusT <= 0 && !this.stageDone) {
      this.stageDone = true;
      this.clearT = 160;
      this.sound.stageClearJingle();
    }
  }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;
    const P = this.player;

    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (this.paused) return;

    if (this.hitstop > 0) { this.hitstop--; return; } // freeze-frame on impact

    // magic cast input
    if (inp.pressed('magic') && !['hurt', 'down', 'getup', 'dying', 'cast'].includes(P.state)) {
      this.castMagic();
    }

    P.update(this, inp);
    this.updateMagic();
    updateEnemies(this);
    updateItems(this);
    updateFx(this);

    // boss shockwaves
    for (const s of this.shots) {
      s.t++;
      s.x += s.vx;
      if (!s.gone && Math.abs(s.x - P.x) < 10 && Math.abs(s.y - P.y) < 12 && P.z < 10) {
        if (P.damage(this, 4, s.x - s.vx * 4, true)) s.gone = true;
      }
      if (s.t > 240 || s.x < this.camX - 40 || s.x > this.camX + VIEW_W + 40) s.gone = true;
    }
    this.shots = this.shots.filter((s) => !s.gone);

    // camera: forward-only, freezes while an arena is locked
    if (!this.locked) {
      this.camX = clamp(Math.max(this.camX, P.x - 130), 0, this.stage.width - VIEW_W);
    }

    this.updateTriggers();
    if (this.stage.bonus) this.updateBonus();

    if (this.shake > 0) this.shake--;
    if (this.focusT > 0) this.focusT--;
    if (this.focus && (this.focus.gone || (this.focus.dead && this.focus.st > 30))) this.focus = null;

    // player death flow
    if (P.state === 'dying' && P.st > 90) {
      this.lives--;
      if (this.lives > 0) {
        const np = new Player(this.camX + 50, (GROUND_TOP + GROUND_BOT) / 2);
        np.invuln = 130;
        this.player = np;
      } else if (this.continues > 0) {
        this.state = 'continue';
        this.contT = 60 * 10;
        this.sound.stopMusic();
      } else {
        this.gameOver();
      }
    }

    // stage clear countdown
    if (this.stageDone) {
      this.clearT--;
      if (this.clearT <= 0) {
        this.stageIdx++;
        if (this.stageIdx >= STAGES.length) {
          this.state = 'victory';
          this.storyT = 0;
          localStorage.setItem(HISCORE_KEY, String(this.hiscore));
          this.sound.playMusic('ending');
        } else {
          this.beginStage();
        }
      }
    }
  }

  gameOver() {
    this.state = 'gameover';
    localStorage.setItem(HISCORE_KEY, String(this.hiscore));
    this.sound.stopMusic();
    this.sound.pdie();
  }

  // ---------------- rendering ----------------

  drawShot(s) {
    const sx = s.x - this.camX;
    ctx.fillStyle = '#8a6030';
    for (let i = 0; i < 4; i++) {
      const h = 4 + ((s.t * 3 + i * 5) % 6);
      ctx.fillRect(Math.round(sx - 6 + i * 4), Math.round(s.y - h), 3, h);
    }
    ctx.fillStyle = '#c8a060';
    ctx.fillRect(Math.round(sx - 4), Math.round(s.y - 3), 8, 2);
  }

  drawCampfire() {
    const fx = 160 - this.camX, fy = 176;
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(fx - 10, fy - 3, 20, 4);
    ctx.fillRect(fx - 7, fy - 5, 14, 3);
    const f = this.frame;
    ctx.fillStyle = '#f86818';
    ctx.fillRect(fx - 6, fy - 12 - (f % 6 > 2 ? 2 : 0), 12, 9);
    ctx.fillStyle = '#f8b030';
    ctx.fillRect(fx - 4, fy - 10 - ((f >> 1) % 4), 8, 7);
    ctx.fillStyle = '#f8e880';
    ctx.fillRect(fx - 2, fy - 7 - (f % 4), 4, 4);
    // ember sparks
    ctx.fillStyle = '#f8a030';
    for (let i = 0; i < 3; i++) {
      const yy = (f * 1.5 + i * 17) % 30;
      ctx.fillRect(fx - 5 + ((i * 7 + (f >> 2)) % 10), fy - 12 - yy, 1, 2);
    }
  }

  drawWorld() {
    drawBackdrop(ctx, this.stage.key, this.camX, this.frame);
    drawGround(ctx, this.stage.key, this.camX, this.frame);
    if (this.stage.key === 'camp') this.drawCampfire();

    // y-sorted entities: enemies + items + player
    const drawables = [];
    for (const e of this.enemies) drawables.push({ y: e.y + (e.rider ? 0.1 : 0), k: 'e', o: e });
    for (const it of this.items) drawables.push({ y: it.y, k: 'i', o: it });
    if (!this.player.riding) drawables.push({ y: this.player.y, k: 'p', o: this.player });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) {
      if (d.k === 'e') drawEnemy(this, ctx, d.o);
      else if (d.k === 'i') drawItem(this, ctx, d.o);
      else d.o.draw(this, ctx);
    }

    for (const s of this.shots) this.drawShot(s);
    for (const f of this.fx) drawFx(this, ctx, f);

    // earth magic
    if (this.magic) {
      const m = this.magic;
      if (m.t < 8) {
        ctx.fillStyle = `rgba(248,232,160,${0.5 - m.t * 0.06})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      for (const r of m.rocks) {
        const tt = m.t - r.delay;
        if (tt > 0 && tt < 38) drawRock(ctx, r.x - this.camX, r.y, tt, 28 + m.n * 5);
      }
    }
  }

  drawBar(x, y, w, h, frac, fill, back = '#301018') {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, Math.round(w * clamp(frac, 0, 1)), h);
  }

  drawHUD() {
    const P = this.player;
    text(ctx, 'MOORE', 8, 4, '#f8d820');
    this.drawBar(8, 14, 64, 5, P.hp / P.hpMax, P.hp <= 8 && this.frame % 20 < 10 ? '#f8f0d0' : '#e02818');
    // lives
    for (let i = 0; i < Math.min(this.lives, 5); i++) {
      ctx.fillStyle = '#f8d820';
      ctx.fillRect(8 + i * 7, 23, 5, 3);
      ctx.fillStyle = '#f0b078';
      ctx.fillRect(8 + i * 7, 26, 5, 3);
    }
    // magic vials
    for (let i = 0; i < this.vials; i++) {
      ctx.fillStyle = '#48a8f8';
      ctx.fillRect(8 + i * 7, 32, 5, 6);
      ctx.fillStyle = '#e8f0f8';
      ctx.fillRect(9 + i * 7, 32, 3, 1);
    }
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, 160, 4, '#f8f0d0', 8, 'center');
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, 160, 13, '#a8a0b8', 8, 'center');

    // focus enemy bar (last hit / boss)
    let f = this.focus;
    const boss = this.enemies.find((e) => e.kind?.boss && !e.gone);
    if (boss && !boss.dead) f = boss;
    if (f && !f.gone && this.focusT >= 0 && (f === boss || this.focusT > 0) && f.hp > 0) {
      text(ctx, f.name, 312, 4, '#f0b0b0', 8, 'right');
      if (f.kind?.boss) {
        // multi-phase boss bar: three stacked segments of 30
        const segs = 3, per = f.hpMax / segs;
        const full = Math.floor(f.hp / per);
        const rem = (f.hp - full * per) / per;
        const colors = ['#e02818', '#e08018', '#8828d8'];
        this.drawBar(248, 14, 64, 5, full >= segs ? 1 : rem, colors[Math.min(full, segs - 1)]);
        text(ctx, `x${Math.max(1, full + (rem > 0 ? 1 : 0))}`, 240, 13, '#f0b0b0', 8, 'right');
      } else {
        this.drawBar(248, 14, 64, 5, f.hp / f.hpMax, '#e02818');
      }
    }

    // GO arrow
    if (!this.locked && !this.stageDone && !this.stage.bonus && this.frame % 40 < 26 && this.state === 'play') {
      const trig = this.currentTrigger();
      if (trig && this.camX < trig.x - 4) {
        text(ctx, 'GO', 286, 96, '#f8d820', 12, 'center');
        ctx.fillStyle = this.frame % 40 < 13 ? '#f8d820' : '#f8f0d0';
        ctx.beginPath();
        ctx.moveTo(298, 96); ctx.lineTo(310, 102); ctx.lineTo(298, 108);
        ctx.fill();
      }
    }

    // bonus timer
    if (this.stage.bonus && !this.stageDone) {
      text(ctx, `TIME ${String(Math.ceil(this.bonusT / 60)).padStart(2, '0')}`, 312, 4, '#f8f0d0', 8, 'right');
    }

    if (this.bannerT > 0) {
      this.bannerT--;
      if (this.bannerT > 30 || this.frame % 8 < 5) {
        text(ctx, this.banner, VIEW_W / 2, 64, '#f8d820', 12, 'center');
      }
    }
    if (this.stageDone && this.clearT < 170) {
      text(ctx, this.stage.bonus ? 'CAMP RAIDED' : 'AREA CLEARED', VIEW_W / 2, 92, '#f8f0d0', 12, 'center');
    }
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    }
    this.drawWorld();
    ctx.restore();
    this.drawHUD();
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 104, '#f8f0d0', 14, 'center');
    }
  }

  // ---------------- title ----------------

  drawTitle() {
    ctx.fillStyle = '#140a10';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // ember sky
    ctx.fillStyle = '#3a1420';
    ctx.fillRect(0, 90, VIEW_W, 60);
    ctx.fillStyle = '#5c1c24';
    ctx.fillRect(0, 118, VIEW_W, 32);
    // sun
    ctx.fillStyle = '#c83818';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 150, 42, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e87828';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 150, 30, Math.PI, 0); ctx.fill();
    // ridge
    ctx.fillStyle = '#0c0608';
    for (let i = 0; i < 21; i++) {
      const hh = 18 + Math.sin(i * 1.7) * 9;
      ctx.fillRect(i * 16, 150 - hh, 17, hh + 74);
    }

    text(ctx, 'G O L D E N', VIEW_W / 2, 34, '#f8d820', 30, 'center');
    text(ctx, 'M O O R E', VIEW_W / 2, 66, '#e8a010', 24, 'center');
    text(ctx, 'AN AXE-AGE LEGEND', VIEW_W / 2, 94, '#c8a878', 8, 'center');

    const attract = [
      'DEATH MOORE TOOK THE CROWN.',
      'ONE BARBARIAN WANTS IT BACK.',
      'RIDE THE BEAST. KICK THE THIEVES.',
      'SPEND YOUR VIALS. SHAKE THE EARTH.',
    ];
    text(ctx, attract[(this.attractT >> 7) % attract.length], VIEW_W / 2, 130, '#d8c8a8', 8, 'center');

    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP ATK TO START' : 'PUSH ENTER OR X', VIEW_W / 2, 166, '#f8f0d0', 10, 'center');
    }
    text(ctx, `HI SCORE ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 186, '#a8a0b8', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 208, '#665', 8, 'center');

    drawSprite(ctx, 'h_idle', 34, VIEW_H - 62, false);
    drawSprite(ctx, 'g1_idle', 262, VIEW_H - 58, true);
    drawSprite(ctx, 'sk0_idle', 286, VIEW_H - 56, true);
  }

  updateTitle() {
    this.attractT++;
    this.sound.playMusic('title');
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('attack') || inp.pressed('jump')) {
      this.startRun();
    }
  }

  // ---------------- stage intro card ----------------

  drawStory() {
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, this.stage.name, VIEW_W / 2, 36, '#c8a878', 9, 'center');
    text(ctx, this.stage.title, VIEW_W / 2, 50, '#f8d820', 14, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    this.stage.story.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 44, 92 + i * 13, '#d8c8b8', 8);
      used += line.length;
    });
    if (this.frame % 60 < 40) text(ctx, 'ATTACK TO MARCH', VIEW_W / 2, 196, '#998', 8, 'center');
  }

  updateStory() {
    this.storyT++;
    if (this.storyT > 24 && (this.input.pressed('attack') || this.input.pressed('start') || this.input.pressed('jump'))) {
      this.enterPlay();
    }
    if (this.storyT > 460) this.enterPlay();
  }

  // ---------------- continue / game over / victory ----------------

  drawContinue() {
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const secs = Math.ceil(this.contT / 60);
    text(ctx, 'CONTINUE?', VIEW_W / 2, 64, '#f8d820', 16, 'center');
    text(ctx, String(secs), VIEW_W / 2, 96, '#f8f0d0', 22, 'center');
    text(ctx, `CREDITS ${this.continues}`, VIEW_W / 2, 138, '#d8c8b8', 8, 'center');
    if (this.frame % 40 < 26) text(ctx, 'PUSH ENTER OR X', VIEW_W / 2, 158, '#f8f0d0', 8, 'center');
  }

  updateContinue() {
    this.contT--;
    if (this.contT % 60 === 0 && this.contT > 0) this.sound.tick();
    if (this.input.pressed('start') || this.input.pressed('attack') || this.input.pressed('jump')) {
      this.continues--;
      this.lives = 3;
      const np = new Player(this.camX + 50, (GROUND_TOP + GROUND_BOT) / 2);
      np.invuln = 130;
      this.player = np;
      this.state = 'play';
      this.sound.playMusic(this.currentTrigger()?.boss && this.locked ? 'boss' : this.stage.music);
      return;
    }
    if (this.contT <= 0) this.gameOver();
  }

  drawGameOver() {
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 76, '#e02818', 18, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 112, '#f8f0d0', 8, 'center');
    text(ctx, `HI SCORE ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 126, '#a8a0b8', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 160, '#f8f0d0', 8, 'center');
  }

  updateGameOver() {
    if (this.input.pressed('start') || this.input.pressed('attack')) this.state = 'title';
  }

  drawVictory() {
    drawBackdrop(ctx, 'throne', 0, this.frame);
    drawGround(ctx, 'throne', 0, this.frame);
    ctx.fillStyle = 'rgba(10,6,8,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawSprite(ctx, 'h_idle', VIEW_W / 2 - 9, 150, false);
    // the crown, held high
    ctx.fillStyle = '#f8d820';
    ctx.fillRect(VIEW_W / 2 - 6, 140 - Math.min(14, this.storyT / 10), 12, 5);
    ctx.fillRect(VIEW_W / 2 - 6, 137 - Math.min(14, this.storyT / 10), 3, 4);
    ctx.fillRect(VIEW_W / 2 - 1, 137 - Math.min(14, this.storyT / 10), 3, 4);
    ctx.fillRect(VIEW_W / 2 + 4, 137 - Math.min(14, this.storyT / 10), 3, 4);

    text(ctx, 'THE CROWN RETURNS', VIEW_W / 2, 18, '#f8d820', 13, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    ENDING.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 40, 40 + i * 10, '#e8d8c8', 8);
      used += line.length;
    });
    text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 196, '#f8f0d0', 8, 'center');
    if (this.storyT > 300 && this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 210, '#998', 8, 'center');
  }

  updateVictory() {
    this.storyT++;
    if (this.storyT > 300 && (this.input.pressed('start') || this.input.pressed('attack'))) {
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
      case 'continue': this.updateContinue(); this.drawContinue(); break;
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
