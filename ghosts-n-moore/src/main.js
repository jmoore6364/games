// Ghosts 'n Moore — main loop, states, camera, HUD, the double-loop trap.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawTile, drawWaterBody, drawBoom, drawPoof, THEMES,
} from './sprites.js';
import { TILE, T, STAGES, parseMap, tileAt } from './levels.js';
import {
  Player, spawnEnemy, updateEnemies, drawEnemies, damageEnemy, bossHeadBox,
  updatePBullets, drawPBullets, updateEBullets, drawEBullets, overlap,
} from './entities.js';

const VIEW_W = 256, VIEW_H = 224;
const STAGE_TIME = 180 * 60; // 3:00, and then you die

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

const FALSE_END = [
  'ASTAMOORE FALLS... BUT THE',
  'PRINCESS IS NOT HERE.',
  '',
  'THIS ROOM IS AN ILLUSION.',
  'THE TRAP DEVISED BY MOORE',
  'IS COMPLETE...',
  '',
  'GO AHEAD DAUNTLESSLY!',
  'MAKE RAPID PROGRESS!',
];

const TRUE_END = [
  'THE SECOND DEATH STICKS.',
  'ASTAMOORE CRUMBLES TO ASH',
  'AND THE THRONE WITH HIM.',
  '',
  'PRINCESS MOORE-GWYNNE IS',
  'FREE. SIR MOORE ADJUSTS',
  'HIS BOXERS WITH DIGNITY.',
  '',
  'THIS STORY IS HAPPY END.',
];

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.goSel = 0;
    this.hiScore = 0;
    try { this.hiScore = parseInt(localStorage.getItem('gnm_hiscore') || '0', 10) || 0; } catch { /* private mode */ }
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  saveHi() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      try { localStorage.setItem('gnm_hiscore', String(this.hiScore)); } catch { /* ok */ }
    }
  }

  // ---------------- run / stage setup ----------------

  startRun() {
    this.lives = 3;
    this.score = 0;
    this.nextLifeAt = 20000;
    this.continues = 3;
    this.loop = 1;           // loop 2 = the true-ending replay of stages 5-6
    this.stageIdx = 0;
    this.carryWeapon = 'L';
    this.carryArmor = 1;
    this.enterMap();
  }

  enterMap() {
    this.state = 'map';
    this.mapT = 0;
    this.sound.stopMusic();
    this.sound.mapJingle();
  }

  beginStage(fromCheckpoint = false) {
    const src = STAGES[this.stageIdx];
    this.stage = { ...src, g: parseMap(src.map) };
    this.enemies = [];
    this.pbullets = [];
    this.ebullets = [];
    this.booms = [];
    this.poofs = [];
    this.pieces = [];   // armor shrapnel
    this.leaves = [];   // wind telegraph
    this.spawned = new Set();
    this.zoneT = this.stage.zones.map(() => 0);
    this.ghostT = this.stage.ghostZones.map(() => 0);
    this.timer = STAGE_TIME;
    this.bossOn = false;
    this.bossDown = false;
    this.clearT = 0;
    this.windT = 0;
    this.windOn = false;
    this.windAx = 0;
    this.shake = 0;
    if (!fromCheckpoint) this.cpReached = false;
    const at = fromCheckpoint && this.cpReached ? this.stage.checkpoint : this.stage.start;
    this.player = new Player(at.x * TILE + 3, at.row * TILE - 20);
    this.player.weapon = this.carryWeapon;
    this.player.armor = fromCheckpoint ? 1 : this.carryArmor;
    this.camX = Math.max(0, Math.min(this.player.x - 110, this.stage.g.w * TILE - VIEW_W));
    // chests exist from the start, buried at their trigger points
    for (const c of this.stage.chests) {
      spawnEnemy(this, 'chest', c.x * TILE, c.row * TILE - 10, { item: c.item, state: 'buried' });
    }
    this.allSpawns = [...this.stage.spawns];
    if (this.loop === 2 && this.stage.extraSpawns) this.allSpawns.push(...this.stage.extraSpawns);
    this.state = 'play';
    this.paused = false;
    this.banner = THEMES[this.stage.theme].name + (this.loop === 2 ? ' · THE TRAP' : '');
    this.bannerT = 150;
    this.sound.playMusic(THEMES[this.stage.theme].music);
  }

  // ---------------- helpers used by entities ----------------

  addScore(n) {
    this.score += n;
    if (this.score >= this.nextLifeAt) {
      this.lives++;
      this.nextLifeAt += 70000;
      this.sound.oneUp();
    }
  }

  addBoom(x, y, big) {
    this.booms.push({ x, y, t: 0, big });
    if (big) this.shake = 8;
  }

  addPoof(x, y) { this.poofs.push({ x, y, t: 0 }); }

  camY = 0; // horizontal stages only

  // A hit lands on Sir Moore. Armor first, then the grave.
  hitPlayer() {
    const P = this.player;
    if (P.dead || P.invuln > 0) return;
    if (P.armor > 0) {
      // armor explodes off — pieces everywhere, dignity gone
      for (let i = 0; i < 7; i++) {
        this.pieces.push({
          x: P.x + 5, y: P.y + 6 + (i % 3) * 4,
          vx: (i % 2 ? 1 : -1) * (0.7 + (i % 4) * 0.5), vy: -2.2 - (i % 3) * 0.8,
          t: 0, gold: P.armor === 2,
        });
      }
      P.armor = 0;
      P.invuln = 100;
      this.sound.armorClatter();
    } else {
      this.killPlayer();
    }
  }

  killPlayer() {
    const P = this.player;
    if (P.dead) return;
    P.dead = true; P.deadT = 0;
    this.sound.stopMusic();
    this.sound.dieJingle();
  }

  drownPlayer() {
    const P = this.player;
    if (P.dead) return;
    P.y += 6;
    this.killPlayer();
  }

  polymorphPlayer() {
    const P = this.player;
    if (P.dead) return;
    if (P.duckT <= 0) this.addPoof(P.x + 5, P.y + 10);
    P.duckT = 480; // 8 seconds of duck
    this.sound.polymorph();
    this.sound.quack();
  }

  openChest(e) {
    if (e.opened) return;
    e.opened = true;
    this.addScore(500);
    this.sound.chestOpen();
    if (e.item === 'mage') {
      const m = spawnEnemy(this, 'mage', e.x, e.y - 34);
      this.addPoof(m.x + 7, m.y + 8);
      this.sound.magicBolt();
    } else {
      spawnEnemy(this, 'pickup', e.x + 2, e.y - 12, { item: e.item });
    }
  }

  collectPickup(e) {
    const P = this.player;
    this.sound.collect();
    if (e.item === 'armor') {
      if (P.armor === 0) { P.armor = 1; this.sound.armorOn(); }
      this.addScore(1000);
    } else if (e.item === 'gold') {
      P.armor = 2;
      this.sound.goldOn();
      this.addScore(1000);
    } else {
      P.weapon = e.item;
      this.addScore(500);
    }
  }

  onBossDown() {
    this.bossDown = true;
    this.clearT = 230;
    this.addScore(5000);
    this.sound.bossDie();
    this.sound.stopMusic();
    for (const e of this.enemies) if (!e.harmless) this.addBoom(e.x + e.w / 2, e.y + e.h / 2, false);
    this.enemies = this.enemies.filter((e) => e.harmless);
    this.ebullets = [];
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
    this.carryWeapon = this.player.weapon;
    this.beginStage(true);
  }

  // ---------------- spawn activation ----------------

  processSpawns() {
    this.allSpawns.forEach((s, i) => {
      if (this.spawned.has(i)) return;
      const sx = s.x * TILE;
      if (sx > this.camX + 288 || sx < this.camX - 40) return;
      this.spawned.add(i);
      if (s.t === 'stal') {
        spawnEnemy(this, 'stal', sx + 4, s.row * TILE, {});
        return;
      }
      const e = spawnEnemy(this, s.t, sx, 0);
      if (s.t === 'ghost' || s.t === 'demon' || s.t === 'crow') e.y = s.row * TILE - e.h - (s.t === 'ghost' ? 14 : 0);
      else e.y = s.row * TILE - e.h;
    });

    const P = this.player;
    // zombie pressure — the ground never stays quiet
    this.stage.zones.forEach((z, i) => {
      if (P.x < (z.x0 - 6) * TILE || P.x > (z.x1 + 6) * TILE || this.bossOn || this.bossDown) return;
      this.zoneT[i]++;
      const rate = Math.max(40, Math.round(z.rate * (this.loop === 2 ? 0.55 : 1)));
      if (this.zoneT[i] % rate !== rate - 1) return;
      if (this.enemies.filter((e) => e.t === 'zombie').length >= 4) return;
      const dir = (this.frame >> 4) % 2 ? 1 : -1;
      const zx = Math.floor(Math.max(z.x0, Math.min(z.x1, (P.x + dir * (90 + (this.frame % 60))) / TILE)));
      // find the ground; refuse pits
      let row = -1;
      for (let y = 1; y < this.stage.g.h; y++) {
        const t = tileAt(this.stage.g, zx, y);
        if (t === T.WATER) break;
        if (t === T.SOLID || t === T.ICE || t === T.GRAVE) { row = y; break; }
      }
      if (row < 0) return;
      spawnEnemy(this, 'zombie', zx * TILE + 3, row * TILE - 16);
    });

    // drifting ghosts
    this.stage.ghostZones.forEach((z, i) => {
      if (P.x < z.x0 * TILE || P.x > z.x1 * TILE || this.bossOn || this.bossDown) return;
      this.ghostT[i]++;
      const rate = Math.max(80, Math.round(z.rate * (this.loop === 2 ? 0.55 : 1)));
      if (this.ghostT[i] % rate !== rate - 1) return;
      if (this.enemies.filter((e) => e.t === 'ghost').length >= 3) return;
      const fromLeft = (this.frame >> 3) % 2 === 0;
      spawnEnemy(this, 'ghost', fromLeft ? this.camX - 14 : this.camX + VIEW_W + 2, this.camY + 40 + (this.frame % 80));
      this.sound.ghostWail();
    });
  }

  // ---------------- wind (stage 5) ----------------

  updateWind() {
    if (!this.stage.wind) return;
    this.windT++;
    const cyc = this.windT % 430;
    const wasOn = this.windOn;
    this.windOn = cyc >= 160 && cyc < 320;
    this.windAx = this.windOn ? -0.035 : 0;
    if (this.windOn && !wasOn) this.sound.windGust();
    // leaves telegraph the gust — and warn just before it hits
    if ((this.windOn || (cyc >= 130 && cyc < 160)) && this.frame % 4 === 0) {
      this.leaves.push({
        x: this.camX + VIEW_W + 8, y: this.camY + 10 + (this.frame * 37) % 190,
        vx: this.windOn ? -2.6 : -1.1, t: 0,
      });
    }
    for (const l of this.leaves) {
      l.t++;
      l.x += l.vx;
      l.y += Math.sin(l.t / 7) * 0.8;
    }
    this.leaves = this.leaves.filter((l) => l.x > this.camX - 16);
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

    // the clock is one more enemy
    if (!P.dead && this.clearT === 0) {
      this.timer--;
      if (this.timer <= 0) { this.timer = 0; this.killPlayer(); }
      else if (this.timer < 1800 && this.timer % 60 === 0) this.sound.timerLow();
    }

    this.updateWind();
    P.update(this, inp);

    // camera — free scroll, locked during the boss fight
    const maxCam = this.stage.g.w * TILE - VIEW_W;
    if (!this.bossOn) {
      this.camX = Math.max(0, Math.min(maxCam, P.x - 110));
    } else {
      P.x = Math.max(P.x, this.camX + 2); // no fleeing the throne room
    }

    // checkpoint
    if (!this.cpReached && P.x >= this.stage.checkpoint.x * TILE) this.cpReached = true;

    // boss trigger
    if (this.stage.bossAt && !this.bossOn && !this.bossDown && P.x >= this.stage.bossAt * TILE) {
      this.bossOn = true;
      this.camX = Math.min(maxCam, this.camX);
      spawnEnemy(this, 'boss', this.camX + 160, 42);
      this.sound.roar();
      this.shake = 10;
    }

    if (P.dead && P.deadT > 120) { this.respawn(); return; }

    this.processSpawns();
    updateEnemies(this);
    updatePBullets(this);
    updateEBullets(this);

    // player weapons vs enemies
    for (const b of [...this.pbullets]) {
      for (const e of [...this.enemies]) {
        if (e.invis || e.t === 'stal') continue;
        if (e.t === 'chest' && e.state === 'buried') continue;
        if (e.harmless && e.t !== 'chest') continue;
        if (!overlap(b, e)) continue;
        if (e.t === 'chest') {
          if (e.state !== 'buried' && !e.opened) { this.openChest(e); this.pbullets = this.pbullets.filter((x) => x !== b); }
          break;
        }
        if (e.t === 'boss' && !overlap(b, bossHeadBox(e))) {
          // body of the demon lord: sparks, no harm
          if (!b.flame) { this.sound.clink(); this.pbullets = this.pbullets.filter((x) => x !== b); }
          break;
        }
        if (b.flame) {
          if (this.frame % 10 === 0) damageEnemy(this, e, b.dmg);
        } else if (b.pierce) {
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

    // hostiles vs Sir Moore
    if (!P.dead) {
      const hb = P.hitbox();
      for (const b of [...this.ebullets]) {
        if (!overlap(b, hb)) continue;
        this.ebullets = this.ebullets.filter((x) => x !== b);
        if (b.kind === 'poly') this.polymorphPlayer();
        else this.hitPlayer();
        break;
      }
      for (const e of this.enemies) {
        if (e.harmless || e.noTouch || e.invis) continue;
        if (e.t === 'stal' && e.state !== 'fall') continue;
        if (overlap(e, hb)) { this.hitPlayer(); break; }
      }
    }

    // particles
    for (const bm of this.booms) bm.t++;
    this.booms = this.booms.filter((bm) => bm.t < (bm.big ? 22 : 14));
    for (const p of this.poofs) p.t++;
    this.poofs = this.poofs.filter((p) => p.t < 16);
    for (const pc of this.pieces) {
      pc.t++; pc.vy += 0.18; pc.x += pc.vx; pc.y += pc.vy;
    }
    this.pieces = this.pieces.filter((pc) => pc.t < 60);
    if (this.shake > 0) this.shake--;

    // stage clear — walk out the far side (or fell the demon lord)
    if (this.clearT > 0) {
      this.clearT--;
      if (this.clearT === 170) this.sound.clearJingle();
      if (this.clearT <= 0) this.advance();
      return;
    }
    if (!P.dead && !this.stage.bossAt && P.x >= this.stage.exit * TILE) {
      this.clearT = 200;
      this.addScore(1000 + Math.floor(this.timer / 60) * 10); // time bonus
      this.sound.stopMusic();
    }
  }

  advance() {
    this.carryWeapon = this.player.weapon;
    this.carryArmor = Math.max(1, this.player.armor);
    this.saveHi();
    if (this.stage.bossAt) {
      // stage 6 boss down
      if (this.loop === 1) {
        this.state = 'falseend';
        this.storyT = 0;
        this.sound.stopMusic();
      } else {
        this.state = 'trueend';
        this.storyT = 0;
        this.sound.playMusic('ending');
      }
      return;
    }
    this.stageIdx++;
    this.enterMap();
  }

  // ---------------- rendering: play ----------------

  drawBackground() {
    const th = THEMES[this.stage.theme];
    ctx.fillStyle = th.sky0;
    ctx.fillRect(0, 0, VIEW_W, 110);
    ctx.fillStyle = th.sky1;
    ctx.fillRect(0, 110, VIEW_W, 114);
    const k = this.stage.key;
    if (k === 'grave' || k === 'forest') {
      // the moon, always watching
      ctx.fillStyle = '#e8e8c8';
      ctx.beginPath(); ctx.arc(200 - this.camX * 0.05 % 40, 38, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.sky0;
      ctx.beginPath(); ctx.arc(206 - this.camX * 0.05 % 40, 34, 14, 0, Math.PI * 2); ctx.fill();
    }
    if (k === 'grave') {
      ctx.fillStyle = '#101024';
      for (let i = 0; i < 10; i++) {
        const wx = ((i * 43 - this.camX * 0.3) % (VIEW_W + 40)) - 20;
        ctx.fillRect((wx + VIEW_W + 40) % (VIEW_W + 40) - 20, 120 - (i % 3) * 8, 14, 90);
      }
      // fog
      ctx.fillStyle = 'rgba(120,130,160,0.10)';
      for (let i = 0; i < 3; i++) {
        const fx = ((this.frame / 3 + i * 90) % (VIEW_W + 60)) - 30;
        ctx.fillRect(fx - 30, 150 + i * 16, 80, 8);
      }
    } else if (k === 'forest') {
      ctx.fillStyle = '#0c1810';
      for (let i = 0; i < 16; i++) {
        const wx = i * 18 - ((this.camX * 0.4) % 18);
        const hh = 50 + Math.sin((i + Math.floor(this.camX * 0.4 / 18)) * 2.1) * 18;
        ctx.fillRect(wx, 130 - hh, 8, hh + 94);
        ctx.fillRect(wx - 5, 130 - hh, 18, 14);
      }
    } else if (k === 'ice') {
      // aurora
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['rgba(80,200,180,0.10)', 'rgba(120,140,240,0.10)', 'rgba(180,120,220,0.08)'][i];
        for (let x = 0; x < VIEW_W; x += 8) {
          const yy = 20 + i * 12 + Math.sin((x + this.frame * 1.2 + i * 40) / 30) * 8;
          ctx.fillRect(x, yy, 8, 26);
        }
      }
      // snowfall
      ctx.fillStyle = '#e8f0f8';
      for (let i = 0; i < 24; i++) {
        const sx = (i * 53 + Math.sin((this.frame + i * 17) / 40) * 14 - this.camX * 0.2) % VIEW_W;
        const sy = (i * 37 + this.frame * 0.6) % VIEW_H;
        ctx.fillRect((sx + VIEW_W) % VIEW_W, sy, 2, 2);
      }
    } else if (k === 'caves') {
      ctx.fillStyle = '#241a3c';
      for (let i = 0; i < 8; i++) {
        const wx = ((i * 57 - this.camX * 0.3) % (VIEW_W + 40)) - 20;
        ctx.beginPath();
        ctx.moveTo(wx, 224); ctx.lineTo(wx + 12, 130 + (i % 3) * 20); ctx.lineTo(wx + 24, 224);
        ctx.closePath(); ctx.fill();
      }
      // crystal glints
      ctx.fillStyle = '#b8a8e0';
      for (let i = 0; i < 10; i++) {
        if ((i + (this.frame >> 4)) % 3 !== 0) continue;
        const gx = ((i * 71 - this.camX * 0.3) % VIEW_W + VIEW_W) % VIEW_W;
        ctx.fillRect(gx, 60 + (i * 29) % 120, 2, 2);
      }
    } else if (k === 'castle') {
      ctx.fillStyle = '#e8e8c8';
      ctx.beginPath(); ctx.arc(60, 34, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#241018';
      for (let i = 0; i < 7; i++) {
        const wx = ((i * 67 - this.camX * 0.25) % (VIEW_W + 60)) - 30;
        ctx.fillRect(wx, 70 + (i % 2) * 20, 22, 200);
        ctx.fillRect(wx - 4, 66 + (i % 2) * 20, 30, 8);
      }
    } else if (k === 'throne') {
      // hellglow columns
      for (let i = 0; i < 8; i++) {
        const wx = ((i * 47 - this.camX * 0.35) % (VIEW_W + 40)) - 20;
        ctx.fillStyle = '#200a0a';
        ctx.fillRect(wx, 30, 16, 200);
        ctx.fillStyle = (i + (this.frame >> 4)) % 4 === 0 ? '#602020' : '#401414';
        ctx.fillRect(wx + 4, 60 + (i * 31) % 60, 8, 12);
      }
      ctx.fillStyle = 'rgba(220,60,20,0.07)';
      ctx.fillRect(0, 180 + Math.sin(this.frame / 20) * 6, VIEW_W, 60);
    }
  }

  drawTiles() {
    const g = this.stage.g;
    const x0 = Math.floor(this.camX / TILE), x1 = Math.ceil((this.camX + VIEW_W) / TILE);
    for (let ty = 0; ty < g.h; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(g, tx, ty);
        const sx = tx * TILE - this.camX, sy = ty * TILE;
        if (t === T.EMPTY) continue;
        if (t === T.WATER) {
          if (tileAt(g, tx, ty - 1) === T.WATER) drawWaterBody(ctx, sx, sy);
          else drawTile(ctx, 5, this.stage.theme, sx, sy, this.frame, true);
          continue;
        }
        const above = tileAt(g, tx, ty - 1);
        drawTile(ctx, t, this.stage.theme, sx, sy, this.frame, above !== T.SOLID && above !== T.ICE);
      }
    }
  }

  drawHUD() {
    text(ctx, String(this.score).padStart(6, '0'), 6, 4, '#f8f8f8');
    text(ctx, `HI ${String(Math.max(this.hiScore, this.score)).padStart(6, '0')}`, VIEW_W / 2, 4, '#a8a8c0', 8, 'center');
    // timer
    const secs = Math.ceil(this.timer / 60);
    const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, '0');
    text(ctx, `${mm}:${ss}`, 250, 4, secs <= 30 && this.frame % 30 < 15 ? '#f83030' : '#f8d838', 8, 'right');
    // lives
    for (let i = 0; i < Math.min(this.lives, 5); i++) {
      ctx.fillStyle = '#c8d4e0';
      ctx.fillRect(6 + i * 8, 15, 5, 4);
      ctx.fillStyle = '#6c7890';
      ctx.fillRect(6 + i * 8, 19, 5, 2);
    }
    if (this.lives > 5) text(ctx, `x${this.lives}`, 47, 14, '#f8f8f8');
    // weapon + armor
    const wName = { L: 'LANCE', D: 'DAGGER', T: 'TORCH', A: 'AXE' }[this.player.weapon];
    text(ctx, wName, 250, 14, '#f8d838', 8, 'right');
    const aName = this.player.duckT > 0 ? 'QUACK' : ['BOXERS', 'ARMOR', 'GOLD'][this.player.armor];
    const aCol = this.player.duckT > 0 ? '#f8f8f8' : ['#f04058', '#c8d4e0', '#f0c840'][this.player.armor];
    text(ctx, aName, VIEW_W / 2, 14, aCol, 8, 'center');
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawBackground();
    this.drawTiles();
    drawEnemies(this, ctx, this.frame);
    this.player.draw(ctx, { x: this.camX, y: 0 }, this.frame);
    drawPBullets(this, ctx, this.frame);
    drawEBullets(this, ctx, this.frame);
    for (const bm of this.booms) drawBoom(ctx, bm.x - this.camX, bm.y, bm.t, bm.big);
    for (const p of this.poofs) drawPoof(ctx, p.x - this.camX, p.y, p.t);
    for (const pc of this.pieces) {
      ctx.fillStyle = pc.gold ? '#f0c840' : '#c8d4e0';
      ctx.fillRect(Math.round(pc.x - this.camX), Math.round(pc.y), 3, 3);
    }
    for (const l of this.leaves) {
      ctx.fillStyle = (l.t >> 2) % 2 ? '#a8b060' : '#788048';
      ctx.fillRect(Math.round(l.x - this.camX), Math.round(l.y), 3, 2);
    }
    ctx.restore();
    this.drawHUD();
    if (this.bannerT > 0) {
      this.bannerT--;
      if (this.bannerT > 30 || this.frame % 8 < 5) {
        text(ctx, this.banner, VIEW_W / 2, 56, '#f8d838', 8, 'center');
      }
    }
    if (this.windOn) {
      text(ctx, '~ WIND ~', VIEW_W / 2, 30, this.frame % 16 < 10 ? '#a8b060' : '#788048', 8, 'center');
    }
    if (this.bossOn && !this.bossDown) {
      const b = this.enemies.find((e) => e.t === 'boss');
      if (b) {
        ctx.fillStyle = '#301010';
        ctx.fillRect(48, 208, 160, 6);
        ctx.fillStyle = '#e03030';
        ctx.fillRect(49, 209, Math.max(0, 158 * (b.hp / (this.loop === 2 ? 60 : 40))), 4);
      }
    }
    if (this.clearT > 0 && this.clearT < 180) {
      text(ctx, this.stage.bossAt ? 'THE DEMON FALLS' : 'STAGE CLEAR', VIEW_W / 2, 96, '#f8f8f8', 10, 'center');
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 104, '#f8f8f8', 12, 'center');
    }
  }

  // ---------------- title ----------------

  drawTitle() {
    ctx.fillStyle = '#07071a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // moon
    ctx.fillStyle = '#e8e8c8';
    ctx.beginPath(); ctx.arc(200, 44, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#07071a';
    ctx.beginPath(); ctx.arc(208, 38, 18, 0, Math.PI * 2); ctx.fill();
    // ground and stones
    ctx.fillStyle = '#101024';
    ctx.fillRect(0, 180, VIEW_W, 44);
    ctx.fillStyle = '#181834';
    for (let i = 0; i < 9; i++) {
      const gx = 8 + i * 30, gh = 10 + (i * 7) % 12;
      ctx.fillRect(gx, 180 - gh, 12, gh);
      ctx.fillRect(gx + 2, 180 - gh - 4, 8, 5);
    }
    // the big gravestone
    ctx.fillStyle = '#8a8a96';
    ctx.fillRect(34, 118, 44, 62);
    ctx.fillRect(38, 108, 36, 12);
    ctx.fillStyle = '#5a5a66';
    ctx.fillRect(34, 174, 44, 6);
    text(ctx, 'R.I.P', 56, 126, '#3a3a46', 9, 'center');
    text(ctx, 'MOORE', 56, 140, '#3a3a46', 8, 'center');
    // title
    text(ctx, "GHOSTS 'N", VIEW_W / 2, 30, '#f83030', 20, 'center');
    text(ctx, 'MOORE', VIEW_W / 2, 54, '#f8d838', 26, 'center');
    text(ctx, 'ONE KNIGHT. TWO HITS. NO MERCY.', VIEW_W / 2, 90, '#99a', 8, 'center');
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP THROW TO START' : 'PUSH ENTER OR THROW', VIEW_W / 2 + 30, 140, '#f8f8f8', 9, 'center');
    }
    text(ctx, `HI SCORE ${String(this.hiScore).padStart(6, '0')}`, VIEW_W / 2 + 30, 158, '#a8a8c0', 8, 'center');
    text(ctx, '© 19XX MOORE ARCADE', VIEW_W / 2, 196, '#556', 8, 'center');
    // knight and a zombie by the stone
    drawSprite(ctx, 'k_stand', 92, 160, true);
    drawSprite(ctx, 'zomb1', 148 + Math.sin(this.frame / 40) * 4, 164, true);
  }

  updateTitle() {
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      this.sound.titleSting();
      this.startRun();
    }
  }

  // ---------------- map vignette ----------------

  drawMap() {
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // parchment
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(16, 22, 224, 120);
    ctx.fillStyle = '#b8a880';
    ctx.fillRect(16, 22, 224, 4); ctx.fillRect(16, 138, 224, 4);
    ctx.fillRect(16, 22, 4, 120); ctx.fillRect(236, 22, 4, 120);
    ctx.fillStyle = '#c0b088';
    ctx.fillRect(28, 40, 30, 3); ctx.fillRect(180, 116, 40, 3);
    // the path
    const nodes = [[40, 116], [76, 96], [112, 112], [148, 84], [184, 100], [216, 60]];
    ctx.strokeStyle = '#8a6a40';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(nodes[0][0], nodes[0][1]);
    for (const [nx, ny] of nodes.slice(1)) ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.setLineDash([]);
    nodes.forEach(([nx, ny], i) => {
      ctx.fillStyle = i < this.stageIdx ? '#607040' : i === this.stageIdx ? '#b03030' : '#8a6a40';
      ctx.fillRect(nx - 3, ny - 3, 7, 7);
      text(ctx, String(i + 1), nx, ny + 6, '#5a4a30', 8, 'center');
    });
    // castle at the end
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(208, 36, 18, 18);
    ctx.fillRect(206, 32, 5, 8); ctx.fillRect(223, 32, 5, 8);
    // the little flag walks the road
    const from = nodes[Math.max(0, this.stageIdx - 1)];
    const to = nodes[this.stageIdx];
    const t = Math.min(1, this.mapT / 130);
    const fx = from[0] + (to[0] - from[0]) * t;
    const fy = from[1] + (to[1] - from[1]) * t - Math.abs(Math.sin(this.mapT / 6)) * 3;
    ctx.fillStyle = '#584028';
    ctx.fillRect(fx - 1, fy - 14, 2, 14);
    ctx.fillStyle = this.loop === 2 ? '#f0c840' : '#f83030';
    ctx.fillRect(fx + 1, fy - 14, 8, 5);
    // stage name + story
    const th = THEMES[STAGES[this.stageIdx].theme];
    text(ctx, th.name + (this.loop === 2 ? ' · THE TRAP' : ''), VIEW_W / 2, 150, '#f8d838', 8, 'center');
    const story = (this.loop === 2 && STAGES[this.stageIdx].story2) ? STAGES[this.stageIdx].story2 : STAGES[this.stageIdx].story;
    const chars = Math.floor(Math.max(0, this.mapT - 20) / 2);
    let used = 0;
    story.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 28, 164 + i * 9, '#c8c8d8', 8);
      used += line.length;
    });
  }

  updateMap() {
    this.mapT++;
    if (this.mapT > 40 && (this.input.pressed('fire') || this.input.pressed('start') || this.input.pressed('jump'))) {
      this.beginStage(false);
    }
    if (this.mapT > 420) this.beginStage(false);
  }

  // ---------------- game over ----------------

  drawGameOver() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawSprite(ctx, 'bones', VIEW_W / 2 - 8, 52);
    text(ctx, 'GAME OVER', VIEW_W / 2, 70, '#f83030', 16, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 96, '#f8f8f8', 8, 'center');
    if (this.score >= this.hiScore && this.score > 0) text(ctx, 'NEW HI SCORE!', VIEW_W / 2, 108, '#f8d838', 8, 'center');
    if (this.continues > 0) {
      text(ctx, `${this.goSel === 0 ? '>' : ' '} CONTINUE (${this.continues})`, VIEW_W / 2 - 8, 140, '#f8f8f8', 9, 'center');
      text(ctx, `${this.goSel === 1 ? '>' : ' '} GIVE UP`, VIEW_W / 2 - 8, 156, '#f8f8f8', 9, 'center');
      text(ctx, 'CONTINUE RESTARTS THE STAGE. SCORE RESETS.', VIEW_W / 2, 186, '#667', 8, 'center');
    } else {
      text(ctx, 'NO CONTINUES REMAIN', VIEW_W / 2, 140, '#99a', 8, 'center');
      if (this.frame % 60 < 40) text(ctx, 'PUSH START', VIEW_W / 2, 158, '#f8f8f8', 8, 'center');
    }
  }

  updateGameOver() {
    const inp = this.input;
    if (this.continues > 0) {
      if (inp.pressed('up') || inp.pressed('down')) this.goSel = 1 - this.goSel;
      if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
        if (this.goSel === 0) {
          this.continues--;
          this.lives = 3;
          this.score = 0;              // the classic tax
          this.nextLifeAt = 20000;
          this.carryArmor = 1;
          this.beginStage(false);
        } else {
          this.state = 'title';
        }
      }
    } else if (inp.pressed('start') || inp.pressed('fire')) {
      this.state = 'title';
    }
  }

  // ---------------- endings ----------------

  drawFalseEnd() {
    ctx.fillStyle = '#0a0614';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // the empty throne, flickering
    ctx.fillStyle = '#2a1420';
    ctx.fillRect(96, 60, 64, 70);
    ctx.fillRect(88, 50, 12, 80); ctx.fillRect(156, 50, 12, 80);
    if ((this.frame >> 3) % 4 === 0) {
      ctx.fillStyle = 'rgba(200,80,220,0.15)';
      ctx.fillRect(80, 40, 96, 100);
    }
    text(ctx, 'THE THRONE IS EMPTY', VIEW_W / 2, 26, '#c060e0', 10, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    FALSE_END.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 28, 140 + i * 9, '#c8c8d8', 8);
      used += line.length;
    });
  }

  updateFalseEnd() {
    this.storyT++;
    if ((this.storyT > 200 && (this.input.pressed('start') || this.input.pressed('fire'))) || this.storyT > 900) {
      this.loop = 2;
      this.stageIdx = 4; // back to the castle walls, and this time it's angry
      this.enterMap();
    }
  }

  drawTrueEnd() {
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // sunrise at last
    const rise = Math.min(60, this.storyT / 8);
    ctx.fillStyle = '#e07820';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 240 - rise, 38, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f8d838';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 240 - rise, 24, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 196, VIEW_W, 28);
    // the knight and his princess
    drawSprite(ctx, this.player && this.player.armor === 0 ? 'b_stand' : 'k_stand', 106, 176, false);
    ctx.fillStyle = '#f8d838';
    ctx.fillRect(136, 178, 10, 3); // her crown
    ctx.fillStyle = '#e890b0';
    ctx.fillRect(135, 181, 12, 15);
    text(ctx, 'TRUE ENDING', VIEW_W / 2, 20, '#f8d838', 12, 'center');
    const chars = Math.floor(this.storyT / 2);
    let used = 0;
    TRUE_END.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 28, 44 + i * 10, '#c8c8d8', 8);
      used += line.length;
    });
    text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 148, '#f8f8f8', 8, 'center');
    if (this.score >= this.hiScore) text(ctx, 'NEW HI SCORE!', VIEW_W / 2, 160, '#f8d838', 8, 'center');
  }

  updateTrueEnd() {
    this.storyT++;
    this.saveHi();
    if (this.storyT > 300 && (this.input.pressed('start') || this.input.pressed('fire'))) {
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
      case 'map': this.updateMap(); if (this.state === 'map') this.drawMap(); break;
      case 'play': this.updatePlay(); if (this.state === 'play') this.drawPlay(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'falseend': this.updateFalseEnd(); if (this.state === 'falseend') this.drawFalseEnd(); break;
      case 'trueend': this.updateTrueEnd(); this.drawTrueEnd(); break;
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
