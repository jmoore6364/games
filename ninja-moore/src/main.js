// Ninja Moore — main loop, states, camera, HUD, act flow.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, drawSprite, drawTile, drawBoom, THEMES, SPR } from './sprites.js';
import { TILE, T, ACTS, tileAt } from './levels.js';
import {
  Player, spawnEnemy, updateEnemies, drawEnemies, damageEnemy, enemyHitboxes,
  updatePShots, drawPShots, updateEShots, drawEShots, updateDrops, drawDrops,
  damagePlayer, killPlayer, overlap, NINPO_COST, NINPO_NAME,
} from './entities.js';
import { initPortraits, Cutscene } from './story.js';

const VIEW_W = 256, VIEW_H = 240;
const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

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

const NINPO_ICON = { star: 'it_star', wind: 'it_wind', fire: 'it_fire', jump: 'it_jump' };

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.hiScore = Number(localStorage.getItem('ninja-moore-hi') || 0);
    this.score = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / act / scene setup ----------------

  startRun() {
    this.lives = 3;
    this.score = 0;
    this.actIdx = 0;
    this.carrySp = 10;
    this.carryNinpo = 'star';
    this.playCutscene(0);
  }

  playCutscene(idx) {
    this.state = 'story';
    this.cut = new Cutscene(idx);
    this.cutIdx = idx;
    this.sound.playMusic('cutscene');
  }

  afterCutscene() {
    if (this.cutIdx >= 6) { this.state = 'ending'; this.endT = 0; this.saveHi(); this.sound.playMusic('ending'); return; }
    this.actIdx = this.cutIdx;
    this.beginScene(0);
  }

  beginScene(sceneIdx, opts = {}) {
    this.act = ACTS[this.actIdx];
    this.sceneIdx = sceneIdx;
    this.scene = this.act.scenes[sceneIdx];
    this.resetSceneState(opts);
    this.state = 'actcard';
    this.cardT = 0;
    this.sound.stopMusic();
  }

  // (re)build all runtime entities for the current scene
  resetSceneState(opts = {}) {
    const sc = this.scene;
    this.enemies = [];
    this.pshots = [];
    this.eshots = [];
    this.drops = [];
    this.booms = [];
    this.shake = 0;
    this.timeLeft = sc.time;
    this.playFrames = 0;
    this.toast = null; this.toastT = 0;

    // spawn records for dynamic enemies; jets are eternal fixtures
    this.spawnRecs = [];
    for (const s of sc.spawns) {
      if (s.t === 'jet') {
        const e = spawnEnemy(this, 'jet', s.x * TILE, s.row * TILE - 8, { phase: s.phase || 0 });
        e.eternal = true;
      } else {
        this.spawnRecs.push({ ...s, inst: null });
      }
    }
    for (const l of sc.lanterns) {
      spawnEnemy(this, 'lantern', l.x * TILE + 3, l.row * TILE + 2, { drop: l.drop, eternal: true });
    }

    // hawk spawner
    this.hawkT = 0;
    this.hawkTele = 0; // telegraph countdown (frames); hawk enters at 0
    this.hawkSide = 1;
    this.hawkY = 0;

    this.bossStarted = false;
    this.bossReached = opts.atBoss || false;
    this.bossDown = false;
    this.clearT = 0;
    this.pendingForm = null;
    this.formT = 0;

    // player placement
    let px = sc.startX, py = sc.startY;
    if (opts.atBoss && sc.boss) {
      px = sc.boss.lockX + 12;
      py = sc.boss.floor * TILE - 20;
    } else if (opts.atCheckpoint) {
      if (sc.vertical && sc.checkpointPos) { px = sc.checkpointPos.x; py = sc.checkpointPos.y; }
      else if (!sc.vertical && sc.checkpointX) { px = sc.checkpointX; py = 0; py = this.floorYAt(px) - 20; }
    }
    this.player = new Player(px, py);
    this.player.invuln = 90;
    this.player.sp = this.carrySp;
    this.player.ninpo = this.carryNinpo;
    this.checkpointHit = opts.atCheckpoint || false;

    // camera
    if (sc.vertical) {
      this.camX = 0;
      this.camY = Math.max(0, Math.min(sc.g.h * TILE - VIEW_H, py - 130));
    } else {
      this.camY = 0;
      this.camX = Math.max(0, Math.min(sc.g.w * TILE - VIEW_W, px - 120));
      if (opts.atBoss && sc.boss) this.camX = sc.boss.lockX;
    }

    // pit edge warnings (telegraphed pits)
    this.colFloor = [];
    for (let x = 0; x < sc.g.w; x++) {
      let f = false;
      for (let y = 0; y < sc.g.h; y++) if (tileAt(sc.g, x, y) === T.SOLID) { f = true; break; }
      this.colFloor[x] = f;
    }
  }

  floorYAt(px) {
    const g = this.scene.g;
    const tx = Math.floor(px / TILE);
    for (let y = 0; y < g.h; y++) {
      if (tileAt(g, tx, y) === T.SOLID || tileAt(g, tx, y) === T.PLAT) return y * TILE;
    }
    return 12 * TILE;
  }

  enterPlay() {
    this.state = 'play';
    this.paused = false;
    const isFinalBoss = this.bossStarted && this.actIdx === 5;
    this.sound.playMusic(isFinalBoss ? 'final' : this.bossStarted ? 'boss' : THEMES[this.act.theme].music);
  }

  saveHi() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem('ninja-moore-hi', String(this.hiScore));
    }
  }

  // ---------------- helpers used by entities ----------------

  addScore(n) { this.score += n; }

  addBoom(x, y, big) {
    this.booms.push({ x, y, t: 0, big });
    if (big) this.shake = 8;
  }

  spawnDrop(x, y, kind) {
    if (!kind) return;
    this.drops.push({ x, y, vy: -1.2, kind, t: 0, rest: false });
  }

  collectDrop(kind) {
    const P = this.player;
    if (kind === 'sp') { P.sp = Math.min(99, P.sp + 5); this.sound.spirit(); this.setToast('SPIRIT +5'); }
    else if (kind === 'SP') { P.sp = Math.min(99, P.sp + 20); this.sound.spirit(); this.setToast('SPIRIT +20'); }
    else if (kind === 'hp') { P.hp = Math.min(16, P.hp + 6); this.sound.health(); this.setToast('RECOVERY'); }
    else if (kind === '1up') { this.lives++; this.sound.oneUp(); this.setToast('1UP'); }
    else if (kind === 'time') { this.timeLeft += 50; this.sound.pickup(); this.setToast('TIME +50'); }
    else if (NINPO_COST[kind]) {
      P.ninpo = kind;
      this.carryNinpo = kind;
      this.sound.pickup();
      this.setToast(NINPO_NAME[kind]);
    }
    this.addScore(200);
  }

  setToast(s) { this.toast = s; this.toastT = 90; }

  onBossDown(e) {
    this.eshots = [];
    if (e.t === 'd_giant') { this.pendingForm = 'd_head'; this.formT = 70; this.sound.bossDie(); return; }
    if (e.t === 'd_head') { this.pendingForm = 'd_heart'; this.formT = 70; this.sound.bossDie(); return; }
    this.bossDown = true;
    this.clearT = 210;
    this.sound.bossDie();
    this.sound.stopMusic();
    for (const en of this.enemies) if (!en.boss && !en.eternal) en.gone = true;
  }

  // ---------------- spawning ----------------

  processSpawns() {
    const sc = this.scene;
    for (const s of this.spawnRecs) {
      const pos = sc.vertical ? s.row * TILE : s.x * TILE;
      const cam0 = sc.vertical ? this.camY : this.camX;
      const span = sc.vertical ? VIEW_H : VIEW_W;
      const inRange = pos > cam0 - 64 && pos < cam0 + span + 64;
      if (s.inst) {
        if (s.inst.gone && !inRange) s.inst = null; // may respawn on re-scroll, NG style
        continue;
      }
      if (!inRange || this.bossStarted) continue;
      // don't spawn right on top of the player
      if (Math.abs(s.x * TILE - this.player.x) < 40 && Math.abs(s.row * TILE - this.player.y) < 48) continue;
      const e = spawnEnemy(this, s.t, s.x * TILE, 0, {});
      e.y = s.t === 'bat' ? s.row * TILE : s.row * TILE - e.h;
      e.face = this.player.x > e.x ? 1 : -1;
      e.spawnRef = s;
      s.inst = e;
    }

    // hawks: zone-based, telegraphed 30 frames (500ms) before entry
    const hz = sc.hawk;
    if (hz && !this.bossStarted && !this.player.dead) {
      const ptx = this.player.x / TILE;
      const inZone = ptx >= hz.x0 && ptx <= hz.x1;
      const hawkAlive = this.enemies.some((e) => e.t === 'hawk');
      if (this.hawkTele > 0) {
        this.hawkTele--;
        if (this.hawkTele === 0) {
          const P = this.player;
          const x = this.hawkSide > 0 ? this.camX - 18 : this.camX + VIEW_W + 2;
          const e = spawnEnemy(this, 'hawk', x, this.hawkY, {});
          e.vx = 1.9 * this.hawkSide;
          e.ty = P.y + 4; // swoop through the player's height
          e.face = this.hawkSide;
        }
      } else if (inZone && !hawkAlive) {
        this.hawkT++;
        if (this.hawkT >= hz.rate) {
          this.hawkT = 0;
          this.hawkTele = 30; // the fairness window: screech + arrow first
          this.hawkSide = this.player.face >= 0 ? 1 : -1; // enters from behind-ish edge, flies ahead
          this.hawkY = Math.max(this.camY + 40, this.player.y - 40);
          this.sound.screech();
        }
      }
    }
  }

  triggerBoss() {
    const sc = this.scene;
    this.bossStarted = true;
    this.bossReached = true;
    this.camX = sc.boss.lockX;
    const fy = sc.boss.floor * TILE;
    this.arena = { x0: sc.boss.lockX + 4, x1: sc.boss.lockX + VIEW_W - 4, top: this.camY, floorY: fy };
    for (const e of this.enemies) if (!e.eternal) e.gone = true;
    this.eshots = [];
    const bx = sc.boss.lockX + 190;
    const b = this.act.boss;
    if (b === 'butch') spawnEnemy(this, 'butch', bx, fy - 23);
    else if (b === 'razorbeak') spawnEnemy(this, 'razorbeak', bx, this.camY + 40);
    else if (b === 'kage') spawnEnemy(this, 'kage', bx, fy - 22);
    else if (b === 'blisk') spawnEnemy(this, 'blisk', bx, fy - 24);
    else if (b === 'malek') {
      const e = spawnEnemy(this, 'malek', bx, fy - 25);
      e.spots = [
        { x: sc.boss.lockX + 26, y: fy - 25 },
        { x: sc.boss.lockX + 106, y: fy - 89 },
        { x: sc.boss.lockX + 196, y: fy - 89 },
      ];
      e.spot = 0;
    } else if (b === 'demon') spawnEnemy(this, 'd_giant', bx, fy - 30);
    this.sound.playMusic(this.actIdx === 5 ? 'final' : 'boss');
  }

  bossAlive() { return this.enemies.find((e) => e.boss && !e.gone); }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;
    const sc = this.scene;
    const P = this.player;

    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (this.paused) return;
    this.playFrames++;

    // timer
    if (!this.bossDown && this.playFrames % 60 === 0 && !P.dead) {
      this.timeLeft--;
      if (this.timeLeft <= 10 && this.timeLeft > 0) this.sound.tick();
      if (this.timeLeft <= 0) killPlayer(this);
    }

    P.update(this, inp);
    if (P.slashT === 12) P.slashId = (P.slashId || 0) + 1; // a fresh swing hits everyone once

    // camera
    if (sc.vertical) {
      this.camY = Math.max(0, Math.min(sc.g.h * TILE - VIEW_H, P.y - 130));
    } else if (this.bossStarted) {
      this.camX = sc.boss.lockX;
    } else {
      this.camX = Math.max(0, Math.min(sc.g.w * TILE - VIEW_W, P.x - 120));
    }

    // checkpoints
    if (!sc.vertical && sc.checkpointX && P.x >= sc.checkpointX && !this.checkpointHit) {
      this.checkpointHit = true;
      this.setToast('CHECKPOINT');
    }
    if (sc.vertical && sc.checkpointY && P.y <= sc.checkpointY && !this.checkpointHit) {
      this.checkpointHit = true;
      this.setToast('CHECKPOINT');
    }

    // pits (telegraphed by striped edges): falling out kills
    if (!P.dead && P.y > sc.g.h * TILE + 8) killPlayer(this);

    // boss trigger
    if (sc.boss && !this.bossStarted && !this.bossDown && P.x > sc.boss.trigger) this.triggerBoss();

    // scene exit
    if (!sc.boss || this.bossDown) {
      const out = sc.vertical ? P.y < sc.exitY : P.x > sc.g.w * TILE - 24;
      if (out && !P.dead && !this.bossDown) this.nextScene();
    }

    // demon form transitions
    if (this.pendingForm) {
      this.formT--;
      if (this.formT <= 0) {
        const fy = sc.boss.floor * TILE;
        const t = this.pendingForm;
        this.pendingForm = null;
        const e = spawnEnemy(this, t, sc.boss.lockX + 120, t === 'd_giant' ? fy - 30 : this.camY + 50);
        e.face = -1;
        this.setToast(t === 'd_head' ? 'THE HEAD RISES' : 'THE HEART BEATS');
      }
    }

    this.processSpawns();
    updateEnemies(this);
    updatePShots(this);
    updateEShots(this);
    updateDrops(this);

    // ---- combat: katana / spin / ninpo vs enemies ----
    const slash = P.slashBox();
    const spin = P.spinBox();
    for (const e of [...this.enemies]) {
      if (e.gone || e.noHit) continue;
      const ebox = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (slash && e.lastSlash !== P.slashId && overlap(slash, ebox)) {
        e.lastSlash = P.slashId;
        damageEnemy(this, e, 1);
      }
      if (spin && (!e.lastSpin || this.frame - e.lastSpin > 14) && overlap(spin, ebox)) {
        e.lastSpin = this.frame;
        damageEnemy(this, e, 1);
      }
      for (const s of this.pshots) {
        if (s.gone || e.gone) continue;
        if (!overlap(s, ebox)) continue;
        if (s.kind === 'star') { s.gone = true; damageEnemy(this, e, s.dmg); }
        else if (!s.hits) { s.hits = new Set(); s.hits.add(e.id); damageEnemy(this, e, s.dmg); }
        else if (!s.hits.has(e.id)) { s.hits.add(e.id); damageEnemy(this, e, s.dmg); }
      }
    }

    // ---- hostiles vs player ----
    if (!P.dead) {
      const hb = P.hitbox();
      for (const s of [...this.eshots]) {
        if (overlap(s, hb)) {
          if (damagePlayer(this, s.dmg, s.x)) s.gone = true;
        }
      }
      for (const e of this.enemies) {
        if (e.gone || e.t === 'lantern') continue;
        for (const box of enemyHitboxes(e)) {
          if (overlap(box, hb)) { damagePlayer(this, box.dmg, e.x + e.w / 2); break; }
        }
      }
      this.eshots = this.eshots.filter((s) => !s.gone);
    }

    // death → respawn
    if (P.dead && P.deadT > 90) this.respawn();

    // booms
    for (const bm of this.booms) bm.t++;
    this.booms = this.booms.filter((bm) => bm.t < (bm.big ? 22 : 14));
    if (this.shake > 0) this.shake--;
    if (this.toastT > 0) this.toastT--;

    // boss defeated → act clear
    if (this.bossDown) {
      this.clearT--;
      if (this.clearT === 150) {
        this.sound.clearJingle();
        const bonus = Math.max(0, this.timeLeft) * 10;
        this.addScore(bonus);
        this.setToast(`TIME BONUS ${bonus}`);
      }
      if (this.clearT <= 0) {
        this.carrySp = Math.min(99, this.player.sp + 10);
        this.saveHi();
        this.playCutscene(this.actIdx + 1);
      }
    }
  }

  nextScene() {
    this.carrySp = this.player.sp;
    this.carryNinpo = this.player.ninpo;
    this.beginScene(this.sceneIdx + 1);
  }

  respawn() {
    this.lives--;
    if (this.lives < 0) {
      this.state = 'continue';
      this.goSel = 0;
      this.saveHi();
      this.sound.stopMusic();
      return;
    }
    // NG3 rule: die at the boss, restart at the boss
    if (this.bossReached && this.scene.boss) this.resetSceneState({ atBoss: true });
    else this.resetSceneState({ atCheckpoint: this.checkpointHit });
    this.player.hp = 16;
    this.enterPlay();
  }

  useContinue() {
    this.lives = 3;
    this.carrySp = 10;
    // unlimited continues; restart the act (boss checkpoint is kept via death respawns only)
    this.beginScene(0);
  }

  // ---------------- rendering ----------------

  drawBackground() {
    const th = THEMES[this.act.theme];
    ctx.fillStyle = th.sky0;
    ctx.fillRect(0, 0, VIEW_W, 130);
    ctx.fillStyle = th.sky1;
    ctx.fillRect(0, 130, VIEW_W, 110);
    const k = this.act.theme;
    if (k === 'city') {
      ctx.fillStyle = '#e8e8d0';
      ctx.beginPath(); ctx.arc(200 - (this.camX * 0.05) % 40, 40, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141430';
      for (let i = 0; i < 12; i++) {
        const wx = ((i * 44 - this.camX * 0.35) % (VIEW_W + 60) + VIEW_W + 60) % (VIEW_W + 60) - 30;
        const hh = 60 + ((i * 37) % 60);
        ctx.fillRect(wx, 200 - hh, 30, hh + 40);
        ctx.fillStyle = '#f8d838';
        for (let j = 0; j < 4; j++) {
          if ((i * 7 + j * 3) % 3 === 0) ctx.fillRect(wx + 5 + (j % 2) * 12, 210 - hh + ((j * 13) % 40), 3, 4);
        }
        ctx.fillStyle = '#141430';
      }
    } else if (k === 'mountain') {
      ctx.fillStyle = '#e8e8d0';
      ctx.beginPath(); ctx.arc(70, 36, 14, 0, Math.PI * 2); ctx.fill();
      for (const [c, sp, base] of [['#2a2040', 0.2, 110], ['#3a2c50', 0.4, 150]]) {
        ctx.fillStyle = c;
        for (let i = 0; i < 8; i++) {
          const wx = ((i * 70 - this.camX * sp) % (VIEW_W + 140) + VIEW_W + 140) % (VIEW_W + 140) - 70;
          ctx.beginPath();
          ctx.moveTo(wx, 240);
          ctx.lineTo(wx + 45, base - ((i * 23) % 40));
          ctx.lineTo(wx + 90, 240);
          ctx.fill();
        }
      }
    } else if (k === 'falls') {
      // the waterfall, always thundering
      const x0 = this.scene.vertical ? 96 : 60, x1 = this.scene.vertical ? 160 : 190;
      for (let x = x0; x < x1; x += 8) {
        const ph = ((this.frame * 3 + x * 5 + this.camY) >> 4) % 2;
        ctx.fillStyle = ph ? '#28507e' : '#356094';
        ctx.fillRect(x, 0, 8, VIEW_H);
      }
      ctx.fillStyle = '#a8d8f8';
      for (let i = 0; i < 9; i++) {
        const yy = ((i * 67 + this.frame * 4 - this.camY) % (VIEW_H + 20) + VIEW_H + 20) % (VIEW_H + 20) - 10;
        ctx.fillRect(x0 + 8 + ((i * 41) % (x1 - x0 - 16)), yy, 2, 9);
      }
    } else if (k === 'base') {
      ctx.fillStyle = '#181c28';
      for (let i = 0; i < 10; i++) {
        const wx = ((i * 40 - this.camX * 0.4) % (VIEW_W + 40) + VIEW_W + 40) % (VIEW_W + 40) - 20;
        ctx.fillRect(wx, 30 + ((i * 13) % 24), 24, 210);
      }
      ctx.fillStyle = '#f82818';
      for (let i = 0; i < 8; i++) {
        const wx = ((i * 61 - this.camX * 0.4) % VIEW_W + VIEW_W) % VIEW_W;
        if ((i + (this.frame >> 4)) % 4 === 0) ctx.fillRect(wx, 50 + ((i * 29) % 100), 3, 3);
      }
    } else if (k === 'catacombs') {
      ctx.fillStyle = '#241424';
      for (let i = 0; i < 14; i++) {
        const wx = ((i * 26 - this.camX * 0.3) % (VIEW_W + 26) + VIEW_W + 26) % (VIEW_W + 26) - 13;
        ctx.beginPath();
        ctx.moveTo(wx, 30);
        ctx.lineTo(wx + 8, 60 + ((i * 17) % 40));
        ctx.lineTo(wx + 16, 30);
        ctx.fill();
      }
      ctx.fillStyle = '#181018';
      ctx.fillRect(0, 0, VIEW_W, 32);
    } else if (k === 'fortress') {
      ctx.fillStyle = '#b02818';
      ctx.beginPath(); ctx.arc(190, 44, 20, 0, Math.PI * 2); ctx.fill(); // blood moon
      ctx.fillStyle = '#200a10';
      for (let i = 0; i < 8; i++) {
        const wx = ((i * 56 - this.camX * 0.35) % (VIEW_W + 56) + VIEW_W + 56) % (VIEW_W + 56) - 28;
        ctx.fillRect(wx, 90 + ((i * 19) % 30), 36, 160);
        for (let j = 0; j < 3; j++) ctx.fillRect(wx + j * 14, 80 + ((i * 19) % 30), 8, 14);
      }
    }
  }

  drawTiles() {
    const g = this.scene.g;
    const x0 = Math.floor(this.camX / TILE), x1 = Math.ceil((this.camX + VIEW_W) / TILE);
    const y0 = Math.floor(this.camY / TILE), y1 = Math.ceil((this.camY + VIEW_H) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(g, tx, ty);
        if (t === T.EMPTY) continue;
        const sx = tx * TILE - this.camX, sy = ty * TILE - this.camY;
        const topOpen = tileAt(g, tx, ty - 1) !== T.SOLID;
        const interior = t === T.SOLID && !topOpen &&
          tileAt(g, tx - 1, ty) === T.SOLID && tileAt(g, tx + 1, ty) === T.SOLID &&
          tileAt(g, tx, ty + 1) === T.SOLID;
        drawTile(ctx, t, this.act.theme, sx, sy, this.frame, topOpen, interior);
        // pit edge stripes: telegraph the drop
        if (!this.scene.vertical && t === T.SOLID && topOpen) {
          const leftPit = tx > 0 && !this.colFloor[tx - 1];
          const rightPit = tx < g.w - 1 && !this.colFloor[tx + 1];
          if (leftPit || rightPit) {
            ctx.fillStyle = '#f8d838';
            for (let i = 0; i < 3; i++) ctx.fillRect(sx + (leftPit ? i * 5 : 16 - 3 - i * 5), sy, 3, 3);
            ctx.fillStyle = '#101010';
            for (let i = 0; i < 2; i++) ctx.fillRect(sx + (leftPit ? 3 + i * 5 : 16 - 6 - i * 5), sy, 2, 3);
          }
        }
      }
    }
  }

  drawHawkTelegraph() {
    if (this.hawkTele <= 0) return;
    const y = this.hawkY - this.camY;
    const x = this.hawkSide > 0 ? 6 : VIEW_W - 14;
    if (this.frame % 6 < 3) {
      ctx.fillStyle = '#f82818';
      ctx.beginPath();
      if (this.hawkSide > 0) { ctx.moveTo(x + 8, y); ctx.lineTo(x, y - 5); ctx.lineTo(x, y + 5); }
      else { ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 5); ctx.lineTo(x + 8, y + 5); }
      ctx.fill();
      text(ctx, '!', this.hawkSide > 0 ? x + 11 : x - 5, y - 4, '#f82818', 8);
    }
  }

  drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, VIEW_W, 30);
    text(ctx, `${String(this.score).padStart(6, '0')}`, 6, 3, '#f8f8f8');
    text(ctx, `TIME ${Math.max(0, this.timeLeft)}`, 108, 3, this.timeLeft <= 20 && this.frame % 30 < 15 ? '#f82818' : '#f8f8f8');
    text(ctx, `ACT ${this.act.num}-${this.sceneIdx + 1}`, 250, 3, '#f8d838', 8, 'right');

    // HP bar, 16 units NES style
    text(ctx, 'NINJA', 6, 14, '#f8b088');
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i < this.player.hp ? '#40d8d8' : '#28303a';
      ctx.fillRect(40 + i * 5, 15, 4, 5);
    }
    const boss = this.bossAlive();
    if (boss) {
      text(ctx, 'ENEMY', 6, 22, '#f88');
      const maxHp = { butch: 28, razorbeak: 24, kage: 30, blisk: 36, malek: 30, d_giant: 36, d_head: 24, d_heart: 16 }[boss.t] || 16;
      const units = Math.ceil((boss.hp / maxHp) * 16);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i < units ? '#f82818' : '#28303a';
        ctx.fillRect(40 + i * 5, 23, 4, 5);
      }
    } else {
      // spirit + ninpo + lives
      drawSprite(ctx, NINPO_ICON[this.player.ninpo] || 'it_star', 128, 22);
      text(ctx, `SP ${String(this.player.sp).padStart(2, '0')}`, 138, 22, '#c060e0');
      text(ctx, `REST ${Math.max(0, this.lives)}`, 250, 22, '#f8f8f8', 8, 'right');
    }
    if (this.toastT > 0 && this.toast) {
      text(ctx, this.toast, VIEW_W / 2, 44, this.frame % 8 < 5 ? '#f8d838' : '#fff', 8, 'center');
    }
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawBackground();
    this.drawTiles();
    drawEnemies(this, ctx, this.frame);
    drawDrops(this, ctx, this.frame);
    this.player.draw(ctx, { x: this.camX, y: this.camY }, this.frame);
    drawPShots(this, ctx, this.frame);
    drawEShots(this, ctx, this.frame);
    for (const bm of this.booms) drawBoom(ctx, bm.x - this.camX, bm.y - this.camY, bm.t, bm.big);
    this.drawHawkTelegraph();
    ctx.restore();
    this.drawHUD();
    if (this.bossDown && this.clearT < 150) {
      text(ctx, 'ACT CLEAR', VIEW_W / 2, 100, '#f8d838', 12, 'center');
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 110, '#f8f8f8', 12, 'center');
    }
  }

  // ---------------- title ----------------

  drawTitle() {
    ctx.fillStyle = '#070714';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // huge moon
    ctx.fillStyle = '#f0f0d8';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 108, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8d8c0';
    ctx.beginPath(); ctx.arc(VIEW_W / 2 - 18, 94, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(VIEW_W / 2 + 22, 122, 6, 0, Math.PI * 2); ctx.fill();
    // rooftops; the center one is tall enough to stand against the moon
    ctx.fillStyle = '#0c0c1c';
    for (let i = 0; i < 9; i++) {
      const hh = i === 4 ? 76 : 30 + ((i * 29) % 34);
      ctx.fillRect(i * 30, VIEW_H - 34 - hh, 31, hh + 34);
      ctx.fillRect(i * 30 + 4, VIEW_H - 40 - hh, 22, 6);
    }
    // the ninja on the tallest roof, silhouetted on the moon
    drawSprite(ctx, 'p_stand', VIEW_W / 2 - 9, 110, false);

    text(ctx, 'NINJA', VIEW_W / 2 + 1, 27, '#101010', 30, 'center');
    text(ctx, 'NINJA', VIEW_W / 2, 26, '#f82818', 30, 'center');
    text(ctx, 'M O O R E', VIEW_W / 2 + 1, 59, '#101010', 16, 'center');
    text(ctx, 'M O O R E', VIEW_W / 2, 58, '#f8d838', 16, 'center');
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP SLASH TO START' : 'PUSH ENTER OR SLASH', VIEW_W / 2, 172, '#f8f8f8', 9, 'center');
    }
    text(ctx, `HI SCORE ${String(this.hiScore).padStart(6, '0')}`, VIEW_W / 2, 192, '#99a', 8, 'center');
    text(ctx, 'A CINEMATIC ACTION STORY', VIEW_W / 2, 206, '#556', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 224, '#556', 8, 'center');
  }

  updateTitle() {
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) this.startRun();
  }

  // ---------------- act card ----------------

  drawActCard() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const n = ROMAN[this.act.num];
    text(ctx, `ACT ${this.act.num}-${this.sceneIdx + 1}`, VIEW_W / 2, 92, '#f8f8f8', 16, 'center');
    text(ctx, THEMES[this.act.theme].name, VIEW_W / 2, 118, '#f8d838', 9, 'center');
    text(ctx, `${'●'.repeat(n)}${'○'.repeat(6 - n)}`, VIEW_W / 2, 140, '#556', 8, 'center');
    text(ctx, `REST ${Math.max(0, this.lives)}`, VIEW_W / 2, 158, '#99a', 8, 'center');
  }

  updateActCard() {
    this.cardT++;
    if (this.cardT > 110 || (this.cardT > 20 && (this.input.pressed('fire') || this.input.pressed('start')))) {
      this.enterPlay();
    }
  }

  // ---------------- continue / ending ----------------

  drawContinue() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'THE NINJA FALLS...', VIEW_W / 2, 64, '#f82818', 12, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 96, '#f8f8f8', 8, 'center');
    text(ctx, `${this.goSel === 0 ? '▶' : ' '} CONTINUE (RESTART ACT)`, VIEW_W / 2 - 4, 132, '#f8f8f8', 9, 'center');
    text(ctx, `${this.goSel === 1 ? '▶' : ' '} SURRENDER`, VIEW_W / 2 - 4, 148, '#f8f8f8', 9, 'center');
    text(ctx, 'A NINJA NEVER TRULY DIES', VIEW_W / 2, 190, '#556', 8, 'center');
  }

  updateContinue() {
    const inp = this.input;
    if (inp.pressed('up') || inp.pressed('down')) this.goSel = 1 - this.goSel;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      if (this.goSel === 0) this.useContinue();
      else { this.state = 'title'; this.sound.stopMusic(); }
    }
  }

  drawEnding() {
    this.endT++;
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const rise = Math.min(70, this.endT / 6);
    ctx.fillStyle = '#e07820';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 250 - rise, 42, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f8d838';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 250 - rise, 27, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 206, VIEW_W, 34);
    drawSprite(ctx, 'p_stand', VIEW_W / 2 - 20, 186, false);
    drawSprite(ctx, 'e_ninja1', VIEW_W / 2 + 6, 187, true);
    text(ctx, 'THE DEMON SLEEPS', VIEW_W / 2, 40, '#f8d838', 14, 'center');
    text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 80, '#f8f8f8', 9, 'center');
    text(ctx, `HI SCORE    ${String(this.hiScore).padStart(6, '0')}`, VIEW_W / 2, 96, '#99a', 9, 'center');
    if (this.endT > 180 && this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 150, '#f8f8f8', 8, 'center');
  }

  updateEnding() {
    if (this.endT > 180 && (this.input.pressed('start') || this.input.pressed('fire'))) {
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
      case 'story':
        if (this.cut.update(this.input, this.sound)) this.afterCutscene();
        else this.cut.draw(ctx, text, this.frame);
        break;
      case 'actcard': this.updateActCard(); this.drawActCard(); break;
      case 'play': this.updatePlay(); if (this.state === 'play') this.drawPlay(); break;
      case 'continue': this.updateContinue(); this.drawContinue(); break;
      case 'ending': this.updateEnding(); this.drawEnding(); break;
    }
    this.input.endFrame();
  }
}

initSprites();
initPortraits();
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
