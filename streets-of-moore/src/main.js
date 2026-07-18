// Streets of Moore — main loop, states, two-player co-op, camera-locked
// arena brawling, the freight elevator, HUD and menus.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { drawFighter } from './sprites.js';
import {
  VIEW_W, VIEW_H, GROUND_TOP, GROUND_BOT, STAGES, ENDING,
  drawBackdrop, drawGround, drawOverlay,
} from './levels.js';
import {
  Player, CHARS, spawnEnemy, damageEnemy, updateEnemies, drawEnemy,
  updateItems, drawItemEnt, updateProjectiles, drawProjectile,
  updateFx, drawFx, drawBreakableEnt, rnd,
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
const HISCORE_KEY = 'streets-of-moore-hiscore';
const CHAR_KEYS = ['axel', 'blaze'];

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.attractT = 0;
    this.hiscore = +(localStorage.getItem(HISCORE_KEY) || 0);
    this.players = [null, null];
    this.pstats = [{ score: 0, kills: 0, throws: 0 }, { score: 0, kills: 0, throws: 0 }];
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  p2Active() { return !!this.players[1]; }

  // ---------------- run / stage setup ----------------

  startRun(chars) {
    this.charKeys = chars.slice();
    this.joined = [true, !!chars[1]];
    this.lives = [3, 3];
    this.continues = 2;
    this.pstats = [{ score: 0, kills: 0, throws: 0 }, { score: 0, kills: 0, throws: 0 }];
    this.stageIdx = 0;
    this.sound.titleSting();
    this.beginStage();
  }

  makePlayer(idx, x) {
    const p = new Player(idx, this.charKeys[idx], x, (GROUND_TOP + GROUND_BOT) / 2 + idx * 14 - 7);
    return p;
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
    this.projectiles = [];
    this.breakables = (this.stage.breakables || []).map((b) => ({
      ...b, hp: b.t === 'booth' ? 3 : 2, shakeT: 0, _hit: 0,
    }));
    this.hitstop = 0;
    this.shake = 0;
    this.focus = null;
    this.focusT = 0;
    this.banner = null;
    this.bannerT = 0;
    this.paused = false;
    this.elev = this.stage.elevator ? { mode: 'run', t: 200, floor: -1, scroll: 0 } : null;
    if (this.elev) this.locked = true;
    this.players = [null, null];
    if (this.joined[0]) this.players[0] = this.makePlayer(0, 46);
    if (this.joined[1]) this.players[1] = this.makePlayer(1, 76);
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

  addScore(p, n) {
    if (!p) return;
    const s = this.pstats[p.idx];
    s.score += n;
    if (s.score > this.hiscore) this.hiscore = s.score;
  }

  addSpark(x, y, color) {
    this.fx.push({ kind: 'spark', x, y, tt: 0, life: 8, color });
  }

  dropItem(t, x, y, vz = 2) {
    this.items.push({ t, x, y: clamp(y, GROUND_TOP + 4, GROUND_BOT), z: 6, vz, age: 0 });
  }

  clampPlayer(p) {
    const lo = this.camX + 10;
    const hi = Math.min(this.camX + VIEW_W - 10, this.stage.width - 10);
    p.x = clamp(p.x, lo, hi);
  }

  bossPhase(e) {
    return e.hp > e.hpMax * 2 / 3 ? 0 : e.hp > e.hpMax / 3 ? 1 : 2;
  }

  onBossDown() {
    this.shake = 16;
  }

  // ---------------- triggers / waves ----------------

  currentTrigger() { return this.stage.triggers[this.trigIdx]; }

  hostilesAlive() {
    return this.enemies.some((e) => !e.dead && !e.gone);
  }

  startWave(trig, i) {
    this.waveIdx = i;
    for (const def of trig.waves[i]) spawnEnemy(this, def);
    if (i === 0 && trig.name) {
      this.banner = trig.name;
      this.bannerT = 130;
      if (trig.boss) this.sound.bossRoar();
    }
  }

  updateTriggers() {
    if (this.stageDone || this.elev) return;
    const trig = this.currentTrigger();
    if (!this.locked) {
      if (trig && this.camX >= trig.x - 1) {
        this.camX = trig.x;
        this.locked = true;
        this.waveDelay = 0;
        if (trig.boss) this.sound.playMusic('boss');
        this.startWave(trig, 0);
      }
      return;
    }
    if (this.hostilesAlive()) { this.waveDelay = 0; return; }
    this.waveDelay++;
    if (this.waveDelay < 40) return;
    this.waveDelay = 0;
    if (this.waveIdx + 1 < trig.waves.length) {
      this.startWave(trig, this.waveIdx + 1);
      return;
    }
    // arena cleared
    this.locked = false;
    this.trigIdx++;
    for (const p of this.players) if (p) this.addScore(p, 300);
    if (this.trigIdx >= this.stage.triggers.length) {
      this.stageDone = true;
      this.clearT = 210;
      this.sound.stageClearJingle();
      if (trig.boss) this.sound.stopMusic();
    } else {
      if (trig.boss) this.sound.playMusic(this.stage.music);
      this.sound.go();
    }
  }

  // ---------------- the freight elevator ----------------

  updateElevator() {
    const ev = this.elev;
    if (!ev || this.stageDone) return;
    if (ev.mode === 'run') {
      ev.t++;
      ev.scroll += 2.4;
      if (ev.t === 200) this.sound.tick();
      if (ev.t >= 230) {
        ev.floor++;
        const f = this.stage.floors[ev.floor];
        ev.mode = 'floor';
        this.waveIdx = 0;
        this.waveDelay = 0;
        this.startWave(f, 0);
        this.banner = f.name ? f.name : 'FLOOR ' + f.label;
        this.bannerT = 120;
        if (f.boss) this.sound.playMusic('boss');
        this.sound.go();
      }
      return;
    }
    // stopped at a floor
    const f = this.stage.floors[ev.floor];
    if (this.hostilesAlive()) { this.waveDelay = 0; return; }
    this.waveDelay++;
    if (this.waveDelay < 40) return;
    this.waveDelay = 0;
    if (this.waveIdx + 1 < f.waves.length) {
      this.startWave(f, this.waveIdx + 1);
      return;
    }
    for (const p of this.players) if (p) this.addScore(p, 300);
    if (ev.floor + 1 >= this.stage.floors.length) {
      this.stageDone = true;
      this.clearT = 210;
      this.sound.stageClearJingle();
      this.sound.stopMusic();
    } else {
      ev.mode = 'run';
      ev.t = 0;
      if (f.boss) this.sound.playMusic(this.stage.music);
    }
  }

  // ---------------- bridge holes ----------------

  inHole(x, y) {
    if (!this.stage.holes) return null;
    for (const h of this.stage.holes) {
      if (x > h.x && x < h.x + h.w && y > h.y0 && y < h.y1) return h;
    }
    return null;
  }

  ejectFromHole(ent, h) {
    ent.x = (ent.x - h.x < h.x + h.w - ent.x) ? h.x - 10 : h.x + h.w + 10;
  }

  updateHoles() {
    if (!this.stage.holes) return;
    for (const p of this.players) {
      if (!p || p.hp <= 0 || p.z > 0) continue;
      if (['down', 'getup', 'dying', 'grabbed'].includes(p.state)) {
        const h = this.inHole(p.x, p.y);
        if (h && p.state !== 'grabbed') this.ejectFromHole(p, h);
        continue;
      }
      const h = this.inHole(p.x, p.y);
      if (h) {
        if (!p.damage(this, 6, p.x + 1, true)) { this.ejectFromHole(p, h); continue; }
        this.sound.thud();
        this.addSpark(p.x, p.y - 6);
        this.ejectFromHole(p, h);
      }
    }
    for (const e of this.enemies) {
      if (e.gone || e.z > 0) continue;
      if (e.state === 'seek' && e.holeHit) e.holeHit = false;
      const h = this.inHole(e.x, e.y);
      if (!h) continue;
      if (['down', 'getup'].includes(e.state)) {
        if (!e.holeHit) {
          e.holeHit = true;
          // knocked into a hole: extra crunch
          e.hp -= 5;
          this.addSpark(e.x, e.y - 4);
          this.sound.crunch();
          e.st = Math.min(e.st, 10);
          if (e.hp <= 0 && !e.dead) {
            e.hp = 0; e.dead = true;
            this.sound.edie();
          }
        }
        this.ejectFromHole(e, h);
      } else if (!['thrown', 'grabbed', 'ride', 'intro'].includes(e.state)) {
        damageEnemy(this, e, 6, e.x + 1, { down: true, kb: 1.2 });
        this.ejectFromHole(e, h);
      }
    }
  }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;

    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (this.paused) return;

    // P2 drop-in
    if (!this.players[1] && inp.pad(1).pressed('attack')) {
      this.joined[1] = true;
      this.charKeys[1] = this.charKeys[0] === 'axel' ? 'blaze' : 'axel';
      this.lives[1] = 3;
      const p = this.makePlayer(1, this.camX + 60);
      p.invuln = 90;
      this.players[1] = p;
      this.sound.join();
    }

    if (this.hitstop > 0) { this.hitstop--; return; }

    for (const p of this.players) {
      if (p) p.update(this, inp.pad(p.idx));
    }
    updateEnemies(this);
    updateItems(this);
    updateProjectiles(this);
    updateFx(this);
    for (const b of this.breakables) if (b.shakeT > 0) b.shakeT--;
    this.breakables = this.breakables.filter((b) => !b.gone);
    this.updateHoles();

    // camera: forward-only, freezes while an arena is locked
    if (!this.locked) {
      let lead = 0;
      for (const p of this.players) if (p && p.hp > 0) lead = Math.max(lead, p.x);
      this.camX = clamp(Math.max(this.camX, lead - 130), 0, this.stage.width - VIEW_W);
    }

    this.updateTriggers();
    this.updateElevator();

    if (this.shake > 0) this.shake--;
    if (this.focusT > 0) this.focusT--;
    if (this.focus && (this.focus.gone || (this.focus.dead && this.focus.st > 30))) this.focus = null;

    // player death / respawn flow
    for (const p of this.players) {
      if (!p || p.state !== 'dying' || p.st <= 90) continue;
      const idx = p.idx;
      this.lives[idx]--;
      if (this.lives[idx] > 0) {
        const np = this.makePlayer(idx, this.camX + 50 + idx * 24);
        np.invuln = 130;
        this.players[idx] = np;
      } else {
        this.players[idx] = null;
        if (!this.players[0] && !this.players[1]) {
          if (this.continues > 0) {
            this.state = 'continue';
            this.contT = 60 * 10;
            this.sound.stopMusic();
          } else {
            this.gameOver();
          }
        }
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

  drawWorld() {
    drawBackdrop(ctx, this.stage.key, this.camX, this.frame, this.elev ? this.elev.scroll : 0);
    drawGround(ctx, this.stage.key, this.camX, this.frame, this.stage);

    const drawables = [];
    for (const b of this.breakables) drawables.push({ y: b.y, k: 'b', o: b });
    for (const e of this.enemies) drawables.push({ y: e.y, k: 'e', o: e });
    for (const it of this.items) drawables.push({ y: it.y, k: 'i', o: it });
    for (const p of this.players) if (p) drawables.push({ y: p.y, k: 'p', o: p });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) {
      if (d.k === 'e') drawEnemy(this, ctx, d.o);
      else if (d.k === 'i') drawItemEnt(this, ctx, d.o);
      else if (d.k === 'b') drawBreakableEnt(this, ctx, d.o);
      else d.o.draw(this, ctx);
    }

    for (const s of this.projectiles) drawProjectile(this, ctx, s);
    for (const f of this.fx) drawFx(this, ctx, f);
    drawOverlay(ctx, this.stage.key, this.camX, this.frame);
  }

  drawBar(x, y, w, h, frac, fill, back = '#301018') {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, Math.round(w * clamp(frac, 0, 1)), h);
  }

  drawPlayerHUD(p, idx) {
    const right = idx === 1;
    const bx = right ? VIEW_W - 74 : 8;
    const tx = right ? VIEW_W - 8 : 8;
    const align = right ? 'right' : 'left';
    if (!p && !this.joined[idx]) {
      if (this.frame % 70 < 45) text(ctx, idx === 1 ? 'P2 PRESS N' : '', tx, 4, '#8890a8', 8, align);
      return;
    }
    const name = CHARS[this.charKeys[idx]].name.split(' ')[idx === 0 ? 1 : 0];
    text(ctx, `${idx + 1}P ${CHARS[this.charKeys[idx]].name}`, tx, 4, idx === 0 ? '#f0d048' : '#48d8f0', 8, align);
    if (p) {
      this.drawBar(bx, 14, 66, 5, p.hp / p.hpMax, p.hp <= 10 && this.frame % 20 < 10 ? '#f8f0d0' : '#e02818');
    } else {
      this.drawBar(bx, 14, 66, 5, 0, '#e02818');
    }
    // lives
    for (let i = 0; i < Math.min(this.lives[idx], 5); i++) {
      ctx.fillStyle = idx === 0 ? '#f0d048' : '#48d8f0';
      ctx.fillRect(bx + i * 7, 22, 5, 5);
    }
    text(ctx, String(this.pstats[idx].score).padStart(6, '0'), tx, 30, '#e8e8f0', 8, align);
    // weapon + durability pips
    if (p && p.weapon) {
      const wx = right ? bx - 14 : bx + 72;
      ctx.fillStyle = '#a8b0c0';
      if (p.weapon.t === 'pipe') ctx.fillRect(wx, 16, 10, 2);
      else if (p.weapon.t === 'knife') { ctx.fillRect(wx, 16, 7, 2); ctx.fillStyle = '#6a4820'; ctx.fillRect(wx + 7, 16, 3, 2); }
      else { ctx.fillStyle = '#e8ecf4'; ctx.fillRect(wx, 16, 12, 2); }
      for (let i = 0; i < p.weapon.dur; i++) {
        ctx.fillStyle = '#78c848';
        ctx.fillRect(wx + i * 2, 20, 1, 2);
      }
    }
  }

  drawHUD() {
    this.drawPlayerHUD(this.players[0], 0);
    this.drawPlayerHUD(this.players[1], 1);
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 4, '#a8a0b8', 8, 'center');

    // focus enemy bar (last hit / boss)
    let f = this.focus;
    const boss = this.enemies.find((e) => (e.kind?.boss || e.kind?.miniBoss) && !e.gone);
    if (boss && !boss.dead) f = boss;
    if (f && !f.gone && (f === boss || this.focusT > 0) && f.hp > 0) {
      text(ctx, f.name, VIEW_W / 2, 13, '#f0b0b0', 8, 'center');
      this.drawBar(VIEW_W / 2 - 33, 23, 66, 4, f.hp / f.hpMax, f.kind?.boss ? '#c848f0' : '#e02818');
    }

    // elevator floor readout
    if (this.elev) {
      const f = this.stage.floors[Math.max(0, this.elev.floor + (this.elev.mode === 'run' ? 1 : 0))];
      const label = this.elev.mode === 'run' ? '. . .' : this.stage.floors[this.elev.floor]?.label || '';
      text(ctx, this.elev.mode === 'run' ? `UP ${f ? '' : ''}` : label, VIEW_W - 10, 40, '#e8c838', 8, 'right');
      if (this.elev.mode === 'run' && (this.frame >> 3) % 2) {
        ctx.fillStyle = '#e8c838';
        ctx.beginPath();
        ctx.moveTo(VIEW_W - 30, 52); ctx.lineTo(VIEW_W - 24, 44); ctx.lineTo(VIEW_W - 18, 52);
        ctx.fill();
      }
    }

    // GO arrow
    if (!this.locked && !this.stageDone && !this.elev && this.frame % 40 < 26 && this.state === 'play') {
      const trig = this.currentTrigger();
      if (trig && this.camX < trig.x - 4) {
        text(ctx, 'GO', 286, 96, '#f0d048', 12, 'center');
        ctx.fillStyle = this.frame % 40 < 13 ? '#f0d048' : '#f8f0d0';
        ctx.beginPath();
        ctx.moveTo(298, 96); ctx.lineTo(310, 102); ctx.lineTo(298, 108);
        ctx.fill();
      }
    }

    if (this.bannerT > 0) {
      this.bannerT--;
      if (this.bannerT > 30 || this.frame % 8 < 5) {
        text(ctx, this.banner, VIEW_W / 2, 64, '#f0d048', 12, 'center');
      }
    }
    if (this.stageDone && this.clearT < 170) {
      text(ctx, 'ROUND CLEAR', VIEW_W / 2, 92, '#f8f0d0', 12, 'center');
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
    ctx.fillStyle = '#06060e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // skyline
    ctx.fillStyle = '#101024';
    for (let i = 0; i < 12; i++) {
      const h = 40 + ((i * 37) % 60);
      ctx.fillRect(i * 28, 150 - h, 26, h + 74);
    }
    ctx.fillStyle = '#e8d888';
    for (let i = 0; i < 40; i++) {
      if ((i + (this.frame >> 5)) % 3 === 0) continue;
      ctx.fillRect((i * 41 + 9) % VIEW_W, 96 + (i * 13) % 100, 2, 3);
    }
    // neon title
    const flick = (this.frame >> 3) % 17 !== 0;
    text(ctx, 'STREETS OF', VIEW_W / 2, 30, flick ? '#48d8f0' : '#1c4858', 20, 'center');
    text(ctx, 'M O O R E', VIEW_W / 2, 54, flick ? '#f04898' : '#581c38', 30, 'center');
    ctx.fillStyle = flick ? 'rgba(240,72,152,0.15)' : 'rgba(240,72,152,0.04)';
    ctx.fillRect(40, 26, VIEW_W - 80, 62);

    const attract = [
      'THE SYNDICATE OWNS THE CITY.',
      'GRAB THEM. THROW THEM. INTO EACH OTHER.',
      'PIPES, KNIVES, KATANAS - ALL YOURS.',
      'X+Z CLEARS A CROWD... FOR A PRICE.',
      '2P: GRAB A FRIEND AND THE IJKL KEYS.',
    ];
    text(ctx, attract[(this.attractT >> 7) % attract.length], VIEW_W / 2, 118, '#c8c8d8', 8, 'center');

    drawFighter(ctx, 'ax', 'idle', this.frame, 60, 208, false);
    drawFighter(ctx, 'bl', 'idle', this.frame, 90, 212, false);
    drawFighter(ctx, 'pk0', 'idle', this.frame, 250, 208, true);
    drawFighter(ctx, 'br0', 'idle', this.frame, 278, 212, true);

    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP ATK TO START' : 'PUSH ENTER OR X', VIEW_W / 2, 148, '#f8f0d0', 10, 'center');
    }
    text(ctx, `HI SCORE ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 170, '#a8a0b8', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 190, '#565668', 8, 'center');
  }

  updateTitle() {
    this.attractT++;
    this.sound.playMusic('title');
    const inp = this.input;
    if (inp.pressed('start') || inp.pad(0).pressed('attack') || inp.pad(0).pressed('jump')
        || inp.pad(1).pressed('attack')) {
      this.state = 'select';
      this.sel = [0, 1];
      this.ready = [false, false];
      this.selJoin = [true, false];
      this.selT = 0;
      this.sound.go();
    }
  }

  // ---------------- character select ----------------

  updateSelect() {
    this.selT++;
    for (let i = 0; i < 2; i++) {
      const pad = this.input.pad(i);
      if (!this.selJoin[i]) {
        if (i === 1 && (pad.pressed('attack') || pad.pressed('jump'))) {
          this.selJoin[1] = true;
          this.sound.join();
        }
        continue;
      }
      if (!this.ready[i]) {
        if (pad.pressed('left') || pad.pressed('right')) {
          this.sel[i] = 1 - this.sel[i];
          this.sound.tick();
        }
        if (pad.pressed('attack') || pad.pressed('jump')) {
          this.ready[i] = true;
          this.sound.pickup();
        }
      } else if (pad.pressed('back')) {
        this.ready[i] = false;
      }
    }
    const allReady = this.ready[0] && (!this.selJoin[1] || this.ready[1]);
    if (allReady) {
      this.selGo = (this.selGo || 0) + 1;
      if (this.selGo > 50 || this.input.pressed('start')) {
        const chars = [CHAR_KEYS[this.sel[0]], this.selJoin[1] ? CHAR_KEYS[this.sel[1]] : null];
        this.startRun(chars);
      }
    } else {
      this.selGo = 0;
      if (this.input.pressed('start') && this.selJoin[0]) {
        this.ready[0] = true;
      }
    }
  }

  drawSelect() {
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'SELECT FIGHTER', VIEW_W / 2, 14, '#f0d048', 14, 'center');
    const panels = [
      { key: 'axel', x: 84 },
      { key: 'blaze', x: 236 },
    ];
    panels.forEach((pn, ci) => {
      const cd = CHARS[pn.key];
      ctx.fillStyle = '#141024';
      ctx.fillRect(pn.x - 52, 38, 104, 128);
      drawFighter(ctx, cd.actor, ['walk1', 'idle', 'walk2', 'idle'][(this.frame >> 4) % 4], this.frame, pn.x, 118, false);
      text(ctx, cd.name, pn.x, 44, '#e8e8f0', 8, 'center');
      // stat bars
      const stats = pn.key === 'axel'
        ? [['POWER', 0.9], ['SPEED', 0.55], ['REACH', 0.8]]
        : [['POWER', 0.6], ['SPEED', 0.95], ['REACH', 0.55]];
      stats.forEach(([nm, v], si) => {
        text(ctx, nm, pn.x - 46, 128 + si * 11, '#8890a8', 7);
        this.drawBar(pn.x - 8, 130 + si * 11, 48, 4, v, '#48d8f0');
      });
      text(ctx, pn.key === 'axel' ? 'BLITZ: MOORE UPPER' : 'BLITZ: LUNA KICK', pn.x, 168, '#786888', 7, 'center');
      // player cursors
      for (let i = 0; i < 2; i++) {
        if (!this.selJoin[i] || this.sel[i] !== ci) continue;
        const col = i === 0 ? '#f0d048' : '#48d8f0';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.strokeRect(pn.x - 52 - i * 4, 38 - i * 4, 104 + i * 8, 128 + i * 8);
        text(ctx, `${i + 1}P${this.ready[i] ? ' OK!' : ''}`, pn.x - 46 + i * 62, 42 + 112, col, 8);
      }
    });
    if (!this.selJoin[1] && this.frame % 60 < 40) {
      text(ctx, 'P2: PRESS N TO JOIN', VIEW_W / 2, 184, '#8890a8', 8, 'center');
    }
    const allReady = this.ready[0] && (!this.selJoin[1] || this.ready[1]);
    if (allReady) text(ctx, 'GET READY...', VIEW_W / 2, 196, '#f8f0d0', 10, 'center');
    else if (this.frame % 60 < 40) text(ctx, 'X CONFIRMS', VIEW_W / 2, 196, '#786888', 8, 'center');
  }

  // ---------------- stage intro card ----------------

  drawStory() {
    ctx.fillStyle = '#08060e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, this.stage.name, VIEW_W / 2, 36, '#8890a8', 9, 'center');
    text(ctx, this.stage.title, VIEW_W / 2, 50, '#f04898', 14, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    this.stage.story.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 44, 92 + i * 13, '#c8c8d8', 8);
      used += line.length;
    });
    if (this.frame % 60 < 40) text(ctx, 'ATTACK TO HIT THE STREET', VIEW_W / 2, 196, '#786888', 8, 'center');
  }

  updateStory() {
    this.storyT++;
    const anyPress = [0, 1].some((i) => this.input.pad(i).pressed('attack') || this.input.pad(i).pressed('jump'));
    if (this.storyT > 24 && (anyPress || this.input.pressed('start'))) this.enterPlay();
    if (this.storyT > 460) this.enterPlay();
  }

  // ---------------- continue / game over / victory ----------------

  drawContinue() {
    ctx.fillStyle = '#08060e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const secs = Math.ceil(this.contT / 60);
    text(ctx, 'CONTINUE?', VIEW_W / 2, 64, '#f04898', 16, 'center');
    text(ctx, String(secs), VIEW_W / 2, 96, '#f8f0d0', 22, 'center');
    text(ctx, `CREDITS ${this.continues}`, VIEW_W / 2, 138, '#c8c8d8', 8, 'center');
    if (this.frame % 40 < 26) text(ctx, 'PUSH ENTER OR X', VIEW_W / 2, 158, '#f8f0d0', 8, 'center');
  }

  updateContinue() {
    this.contT--;
    if (this.contT % 60 === 0 && this.contT > 0) this.sound.tick();
    const anyPress = [0, 1].some((i) => this.input.pad(i).pressed('attack') || this.input.pad(i).pressed('jump'));
    if (anyPress || this.input.pressed('start')) {
      this.continues--;
      for (let i = 0; i < 2; i++) {
        if (!this.joined[i]) continue;
        this.lives[i] = 3;
        const np = this.makePlayer(i, this.camX + 50 + i * 24);
        np.invuln = 130;
        this.players[i] = np;
      }
      this.state = 'play';
      const bossActive = this.enemies.some((e) => e.kind?.boss && !e.dead);
      this.sound.playMusic(bossActive ? 'boss' : this.stage.music);
      return;
    }
    if (this.contT <= 0) this.gameOver();
  }

  drawGameOver() {
    ctx.fillStyle = '#08060e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 76, '#e02818', 18, 'center');
    for (let i = 0; i < 2; i++) {
      if (!this.joined?.[i]) continue;
      text(ctx, `${i + 1}P SCORE ${String(this.pstats[i].score).padStart(6, '0')}`, VIEW_W / 2, 112 + i * 12, '#f8f0d0', 8, 'center');
    }
    text(ctx, `HI SCORE ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 140, '#a8a0b8', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 166, '#f8f0d0', 8, 'center');
  }

  updateGameOver() {
    if (this.input.pressed('start') || this.input.pad(0).pressed('attack')) this.state = 'title';
  }

  drawVictory() {
    drawBackdrop(ctx, 'downtown', this.storyT * 0.2, this.frame);
    drawGround(ctx, 'downtown', this.storyT * 0.2, this.frame, null);
    ctx.fillStyle = 'rgba(6,6,14,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'THE CITY IS FREE', VIEW_W / 2, 14, '#f0d048', 13, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    ENDING.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 40, 34 + i * 9, '#d8d8e8', 8);
      used += line.length;
    });
    // per-player stats
    let sy = 130;
    for (let i = 0; i < 2; i++) {
      if (!this.joined[i]) continue;
      const cd = CHARS[this.charKeys[i]];
      const st = this.pstats[i];
      drawFighter(ctx, cd.actor, 'idle', this.frame, 60, sy + 30, false);
      text(ctx, cd.name, 84, sy, i === 0 ? '#f0d048' : '#48d8f0', 8);
      text(ctx, `SCORE ${String(st.score).padStart(6, '0')}   KO ${st.kills}   THROWS ${st.throws}`, 84, sy + 11, '#c8c8d8', 8);
      sy += 34;
    }
    if (this.storyT > 300 && this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 208, '#998', 8, 'center');
  }

  updateVictory() {
    this.storyT++;
    if (this.storyT > 300 && (this.input.pressed('start') || this.input.pad(0).pressed('attack'))) {
      this.state = 'title';
      this.sound.stopMusic();
    }
  }

  // ---------------- frame ----------------

  tick() {
    this.frame++;
    this.input.pollGamepads();
    // 0 always mutes; M mutes while P2 is not in the game
    const p2kb = this.input.pad(1);
    if (this.input.pressed('mute')
        || (p2kb.pressed('jump') && p2kb.held.jump && !this.p2Active() && this.state !== 'select')) {
      this.sound.toggleMute();
    }
    this.sound.updateMusic();

    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'select': this.updateSelect(); this.drawSelect(); break;
      case 'story': this.updateStory(); this.drawStory(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'continue': this.updateContinue(); this.drawContinue(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'victory': this.updateVictory(); this.drawVictory(); break;
    }
    this.input.endFrame();
  }
}

const game = new Game();
window.__game = game; // for smoke tests
window.__spawn = (def) => spawnEnemy(game, def);
window.__dmg = (e, n, opts) => damageEnemy(game, e, n, e.x + 1, { down: true, force: true, ...opts });

let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 1000 / 61) return;
  last = ts;
  game.tick();
}
requestAnimationFrame(loop);
