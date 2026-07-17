// Mega Moore — main loop, state machine, stage select, camera, HUD.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawTile, drawBoom, drawOrb, SPR, THEMES, WCOLOR, WNAME,
} from './sprites.js';
import { TILE, T, buildStage, tileAt, setTile } from './levels.js';
import {
  Player, firePlayer, spawnEnemy, updateEnemies, drawEnemies, damageEnemy,
  updatePBullets, drawPBullets, updateEBullets, drawEBullets,
  initHazards, updateHazards, drawHazards,
  spawnPickup, updatePickups, drawPickups, overlap,
} from './entities.js';
import { Boss, BOSSES } from './bosses.js';

const VIEW_W = 256, VIEW_H = 240;
const ORDER = ['torch', 'frost', 'gear', 'volt'];
const SAVE_KEY = 'megaMooreSaveV1';

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
    this.save = this.loadSave();
    this.selIdx = 0;
    this.curWeapon = 'P';
    this.lives = 3;
    this.score = 0;
    this.etank = 0;
    this.energy = { T: 28, F: 28, G: 28, V: 28 };
    this.paused = false;
    this.menuSel = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === 'object') return { beaten: s.beaten || {}, hiscore: s.hiscore || 0 };
    } catch { /* fresh save */ }
    return { beaten: {}, hiscore: 0 };
  }

  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch { /* private mode */ }
  }

  saveHiscore() {
    if (this.score > this.save.hiscore) { this.save.hiscore = this.score; this.persist(); }
  }

  ownedWeapons() {
    return ['P'].concat(ORDER.filter((id) => this.save.beaten[id]).map((id) => BOSSES[id].weapon));
  }

  allBeaten() { return ORDER.every((id) => this.save.beaten[id]); }

  // ---------------- run / stage setup ----------------

  startFromTitle() {
    this.lives = 3;
    this.score = 0;
    this.etank = 0;
    this.energy = { T: 28, F: 28, G: 28, V: 28 };
    this.curWeapon = 'P';
    this.state = 'select';
    this.selIdx = 0;
    this.sound.playMusic('select');
  }

  startStage(id) {
    this.stageId = id;
    this.stage = buildStage(id);
    this.enemies = [];
    this.pbullets = [];
    this.ebullets = [];
    this.pickups = [];
    this.effects = [];
    this.alive = {};
    this.armed = {};
    initHazards(this);
    this.boss = null;
    this.bossBar = 0;
    this.inRush = false;
    this.rushIdx = 0;
    this.rushDone = false;
    this.checkpointHit = false;
    this.shake = 0;
    this.spawnPlacedItems();
    this.state = 'play';
    this.respawnAt(this.stage.start);
  }

  spawnPlacedItems() {
    for (const it of this.stage.items) {
      spawnPickup(this, it.t, it.x * TILE + 3, it.r * TILE - 13, false);
    }
  }

  respawnAt(pos) {
    this.player = new Player(pos.x, pos.y);
    this.player.weapon = this.curWeapon;
    this.camX = Math.max(0, Math.min(pos.x - 120, this.maxCam()));
    this.mode = 'ready';
    this.readyT = 0;
    this.paused = false;
    this.sound.stopMusic();
  }

  respawnStage() {
    // fresh grid (doors, crumbles restored); beaten-boss / rush state kept
    const keepRush = this.rushDone;
    this.stage = buildStage(this.stageId);
    this.enemies = [];
    this.pbullets = [];
    this.ebullets = [];
    this.pickups = [];
    this.effects = [];
    this.alive = {};
    this.armed = {};
    initHazards(this);
    this.boss = null;
    this.bossBar = 0;
    this.inRush = false;
    this.rushIdx = 0;
    this.rushDone = keepRush;
    this.spawnPlacedItems();
    this.respawnAt(this.checkpointHit ? this.stage.checkpoint : this.stage.start);
  }

  maxCam() { return this.stage.g.w * TILE - VIEW_W; }

  stageMusic() { return this.stage.theme; }

  // ---------------- helpers used by entities ----------------

  firePlayer() { firePlayer(this); }

  addScore(n) { this.score += n; }

  addBoom(x, y, big) {
    this.effects.push({ t: 'boom', x, y, age: 0, big });
    if (big) this.shake = 6;
  }

  spawnDrop(x, y) {
    const r = Math.random();
    let t = null;
    if (r < 0.42) t = null;
    else if (r < 0.60) t = 'hs';
    else if (r < 0.75) t = 'ws';
    else if (r < 0.83) t = 'hb';
    else if (r < 0.91) t = 'wb';
    else if (r < 0.95) t = 'life';
    if (t) spawnPickup(this, t, x - 4, y - 8, true);
  }

  giveWeaponEnergy(amount) {
    // current weapon first, otherwise the emptiest earned weapon
    const owned = this.ownedWeapons().filter((w) => w !== 'P');
    if (!owned.length) return false;
    let target = this.player.weapon !== 'P' ? this.player.weapon : null;
    if (!target || this.energy[target] >= 28) {
      target = owned.sort((a, b) => this.energy[a] - this.energy[b])[0];
    }
    this.energy[target] = Math.min(28, this.energy[target] + amount);
    return true;
  }

  collectPickup(t) {
    const P = this.player;
    if (t === 'hs') { P.hp = Math.min(28, P.hp + 5); this.addScore(100); }
    else if (t === 'hb') { P.hp = Math.min(28, P.hp + 14); this.addScore(200); }
    else if (t === 'ws') { this.giveWeaponEnergy(5); this.addScore(100); }
    else if (t === 'wb') { this.giveWeaponEnergy(14); this.addScore(200); }
    else if (t === 'life') { this.lives++; this.sound.oneUp(); this.addScore(500); return true; }
    else if (t === 'etank') {
      if (this.etank >= 1) return false; // carry limit 1
      this.etank = 1;
      this.sound.etank();
      return true;
    }
    this.sound.item();
    return true;
  }

  hurtPlayer(dmg, srcX) {
    const P = this.player;
    if (P.dead || P.invuln > 0) return;
    if (P.slideT > 0) { P.slideT = 0; P.h = 21; P.y -= 7; }
    P.hp -= dmg;
    this.sound.phit();
    if (P.hp <= 0) { P.hp = 0; this.killPlayer(); return; }
    P.invuln = 70;
    P.hurtT = 16;
    P.kdir = (P.x + P.w / 2) < srcX ? -1 : 1;
    P.climb = false;
  }

  killPlayer() {
    const P = this.player;
    if (P.dead) return;
    P.dead = true;
    P.deadT = 0;
    P.hp = 0;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      this.effects.push({ t: 'orb', x: P.x + P.w / 2, y: P.y + P.h / 2, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, age: 0 });
    }
    this.sound.dieBoom();
    this.sound.stopMusic();
  }

  afterDeath() {
    this.lives--;
    if (this.lives <= 0) {
      this.saveHiscore();
      this.state = 'gameover';
      this.sound.stopMusic();
      return;
    }
    this.respawnStage();
  }

  // ---------------- spawns ----------------

  processSpawns() {
    this.stage.enemies.forEach((s, i) => {
      if (this.alive[i]) return;
      const px = s.x * TILE;
      if (this.armed[i] === false) {
        if (px < this.camX - 110 || px > this.camX + 366) this.armed[i] = true;
        return;
      }
      if (px > this.camX - 40 && px < this.camX + 296) {
        const e = spawnEnemy(this, s.t, px, 0);
        e.y = s.t === 'flyer' ? s.r * TILE : s.r * TILE - e.h;
        e.y0 = e.y;
        e.spawnIdx = i;
        this.alive[i] = true;
        this.armed[i] = false;
      }
    });
  }

  // ---------------- boss flow ----------------

  arenaX() { return this.inRush ? this.stage.rushX * TILE : this.stage.bossRoomX * TILE; }

  startBossFight(bossId, rush) {
    this.inRush = !!rush;
    const ax = this.arenaX();
    this.boss = new Boss(this, bossId, ax + 116, -40, ax);
    this.boss.face = -1;
    this.bossBar = 0;
    this.mode = 'intro';
    this.camX = ax;
    this.sound.playMusic('boss');
    if (rush) this.sound.teleport();
  }

  beginClear() {
    this.mode = 'clear';
    this.clearT = 0;
    this.ebullets = [];
    this.addBoom(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, true);
    this.addScore(5000);
    this.sound.bossDie();
    this.sound.stopMusic();
  }

  updateClear() {
    this.clearT++;
    const B = this.boss;
    if (this.clearT < 40 && this.clearT % 6 === 0 && B) {
      this.addBoom(B.x + B.w / 2 + (Math.random() * 40 - 20), B.y + B.h / 2 + (Math.random() * 40 - 20), false);
      this.sound.boom();
    }
    if (this.clearT === 70) this.sound.victory();
    if (this.inRush) {
      if (this.clearT === 120) {
        const ax = this.arenaX();
        spawnPickup(this, 'wb', ax + 100, 10 * TILE, false);
        spawnPickup(this, 'hb', ax + 130, 10 * TILE, false);
      }
      if (this.clearT > 150) {
        this.rushIdx++;
        const list = ORDER.filter((id) => this.save.beaten[id]);
        if (this.rushIdx < list.length) {
          this.startBossFight(list[this.rushIdx], true);
        } else {
          this.rushDone = true;
          this.inRush = false;
          this.boss = null;
          this.mode = 'play';
          this.sound.playMusic(this.stageMusic());
        }
      }
      return;
    }
    if (this.clearT > 260) {
      const bossId = this.stage.bossId;
      if (bossId === 'moorly') {
        this.saveHiscore();
        this.state = 'ending';
        this.endT = 0;
        this.sound.playMusic('ending');
      } else {
        this.save.beaten[bossId] = true;
        this.persist();
        const w = BOSSES[bossId].weapon;
        this.energy[w] = 28;
        this.curWeapon = w;
        this.newWeapon = w;
        this.state = 'weaponget';
        this.wgT = 0;
        this.sound.stopMusic();
        this.sound.weaponGet();
      }
      this.boss = null;
    }
  }

  // ---------------- play update ----------------

  updatePlay() {
    const inp = this.input;
    const P = this.player;
    const st = this.stage;

    // pause menu
    if (inp.pressed('start') && ['play', 'boss'].includes(this.mode) && !P.dead) {
      this.paused = !this.paused;
      if (this.paused) { this.menuSel = 0; this.sound.menuOpen(); } else { this.sound.pause(); }
    }
    if (this.paused) { this.updateMenu(); return; }

    if (this.mode === 'ready') {
      this.readyT++;
      if (this.readyT > 80) {
        this.mode = 'play';
        this.sound.playMusic(this.stageMusic());
      }
      return;
    }

    updateHazards(this);

    if (this.mode === 'door') { this.updateDoor(); return; }

    if (this.mode === 'intro') {
      this.boss.update(this);
      if (this.boss.state === 'wait') { this.mode = 'fill'; }
      return;
    }
    if (this.mode === 'fill') {
      this.bossBar += 0.4;
      if (this.frame % 3 === 0) this.sound.tick();
      if (this.bossBar >= 28) {
        this.bossBar = 28;
        this.mode = 'boss';
        this.boss.state = 'fight';
      }
      return;
    }
    if (this.mode === 'clear') {
      this.updateClear();
      this.updateEffectsOnly();
      updatePickups(this);
      return;
    }

    // ---- normal play / boss fight ----
    P.update(this, inp);

    // camera
    if (this.mode === 'boss' || this.inRush) {
      this.camX = this.arenaX();
      const ax = this.camX;
      P.x = Math.max(ax + 2, Math.min(ax + VIEW_W - P.w - 2, P.x));
    } else {
      this.camX = Math.max(0, Math.min(P.x + P.w / 2 - 128, this.maxCam()));
    }

    if (this.mode === 'play' && !P.dead) {
      // boss door trigger
      if (st.doorX >= 0 && P.x + P.w >= st.doorX * TILE - 2 && P.x < st.doorX * TILE) {
        this.mode = 'door';
        this.doorT = 0;
        this.enemies = [];
        this.ebullets = [];
        this.sound.door();
        this.sound.stopMusic();
      }
      // boss-rush room trigger
      if (st.rushX >= 0 && !this.rushDone && P.x > (st.rushX + 3) * TILE) {
        this.enemies = [];
        this.ebullets = [];
        this.startBossFight(ORDER.filter((id) => this.save.beaten[id])[0], true);
        this.rushIdx = 0;
      }
      // checkpoint
      if (!this.checkpointHit && P.x > st.checkpoint.x) this.checkpointHit = true;
    }

    if (this.mode === 'play') this.processSpawns();
    updateEnemies(this);
    if (this.boss && this.mode === 'boss') this.boss.update(this);
    updatePBullets(this);
    updateEBullets(this);
    updatePickups(this);

    // ---- player bullets vs enemies / boss ----
    for (const b of this.pbullets) {
      if (b.gone) continue;
      for (const e of this.enemies) {
        if (e.gone || !overlap(b, e)) continue;
        if (b.hits) { if (b.hits.has(e)) continue; b.hits.add(e); }
        const consume = damageEnemy(this, e, b);
        if (consume) { b.gone = true; break; }
      }
      if (b.gone) continue;
      const B = this.boss;
      if (B && !B.dead && B.state === 'fight') {
        if (B.orbs) {
          for (const o of B.orbs) {
            if (!o.gone && overlap(b, o)) { b.gone = true; this.sound.clink(); break; }
          }
        }
        if (!b.gone && overlap(b, B.hitbox())) {
          B.hurt(this, b);
          this.bossBar = B.hp;
          b.gone = true;
        }
      }
    }
    this.pbullets = this.pbullets.filter((b) => !b.gone);

    // ---- hostiles vs player ----
    if (!P.dead) {
      const hb = P.hitbox();
      for (const eb of this.ebullets) {
        if (overlap(eb, hb)) { this.hurtPlayer(eb.dmg, eb.x); eb.gone = true; break; }
      }
      for (const e of this.enemies) {
        if (e.frozen > 0 || e.gone) continue;
        if (overlap(e, hb)) { this.hurtPlayer(e.dmg, e.x + e.w / 2); break; }
      }
      const B = this.boss;
      if (B && !B.dead && B.state === 'fight') {
        if (overlap(B.hitbox(), hb)) this.hurtPlayer(B.contact, B.x + B.w / 2);
        if (B.orbs) {
          for (const o of B.orbs) {
            if (!o.gone && overlap(o, hb)) { this.hurtPlayer(o.dmg, o.x); o.gone = true; }
          }
        }
      }
    }

    this.updateEffectsOnly();

    // boss defeated
    if (this.boss && this.boss.dead && this.mode !== 'clear') {
      this.bossBar = 0;
      this.beginClear();
    }

    // player death
    if (P.dead && P.deadT > 140) this.afterDeath();
  }

  updateEffectsOnly() {
    for (const fx of this.effects) {
      fx.age++;
      if (fx.t === 'orb') { fx.x += fx.vx; fx.y += fx.vy; }
    }
    this.effects = this.effects.filter((fx) => fx.age < (fx.t === 'orb' ? 120 : fx.big ? 22 : 14));
    if (this.shake > 0) this.shake--;
  }

  updateDoor() {
    const P = this.player;
    const st = this.stage;
    this.doorT++;
    const dX = st.doorX;
    if (this.doorT % 8 === 0 && this.doorT <= 32) {
      setTile(st.g, dX, 12 - (this.doorT / 8 - 1), T.EMPTY);
      this.sound.tick();
    }
    if (this.doorT > 36) {
      P.autoWalk = true;
      P.update(this, this.input);
      this.camX = Math.min(this.camX + 3, this.arenaX());
      if (this.camX >= this.arenaX() && P.x > (dX + 2) * TILE) {
        // close the door behind and cue the boss
        for (let ty = 9; ty <= 12; ty++) setTile(st.g, dX, ty, T.DOOR);
        P.autoWalk = false;
        this.sound.door();
        this.startBossFight(st.bossId, false);
      }
    }
    this.updateEffectsOnly();
  }

  // ---------------- pause menu ----------------

  menuRows() {
    const rows = this.ownedWeapons().map((w) => ({ t: 'weapon', w }));
    rows.push({ t: 'etank' });
    return rows;
  }

  updateMenu() {
    const inp = this.input;
    const rows = this.menuRows();
    if (inp.pressed('up')) { this.menuSel = (this.menuSel + rows.length - 1) % rows.length; this.sound.menuMove(); }
    if (inp.pressed('down')) { this.menuSel = (this.menuSel + 1) % rows.length; this.sound.menuMove(); }
    const row = rows[this.menuSel];
    if ((inp.pressed('fire') || inp.pressed('jump')) && row.t === 'etank') {
      if (this.etank > 0 && this.player.hp < 28) {
        this.etank--;
        this.player.hp = 28;
        this.sound.etank();
      } else this.sound.buzz();
    }
    if (inp.pressed('start')) {
      if (row.t === 'weapon') {
        this.curWeapon = row.w;
        this.player.weapon = row.w;
      }
      this.paused = false;
      this.sound.pause();
    }
  }

  // ---------------- rendering: play ----------------

  drawBackground() {
    const th = THEMES[this.stage.theme];
    ctx.fillStyle = th.sky0;
    ctx.fillRect(0, 0, VIEW_W, 120);
    ctx.fillStyle = th.sky1;
    ctx.fillRect(0, 120, VIEW_W, 120);
    const k = this.stage.theme;
    if (k === 'torch') {
      ctx.fillStyle = '#4a1008';
      for (let i = 0; i < 10; i++) {
        const wx = ((i * 48 - this.camX * 0.4) % (VIEW_W + 96) + VIEW_W + 96) % (VIEW_W + 96) - 48;
        ctx.beginPath();
        ctx.moveTo(wx, 190); ctx.lineTo(wx + 24, 120 + ((i * 17) % 30)); ctx.lineTo(wx + 48, 190);
        ctx.fill();
      }
      ctx.fillStyle = '#f87018';
      for (let i = 0; i < 10; i++) {
        const yy = 220 - ((i * 53 + this.frame) % 200);
        ctx.fillRect(((i * 71 + 13) % VIEW_W), yy, 2, 2);
      }
    } else if (k === 'frost') {
      ctx.fillStyle = '#284878';
      for (let i = 0; i < 8; i++) {
        const wx = ((i * 64 - this.camX * 0.35) % (VIEW_W + 128) + VIEW_W + 128) % (VIEW_W + 128) - 64;
        ctx.beginPath();
        ctx.moveTo(wx, 200); ctx.lineTo(wx + 32, 100 + ((i * 23) % 40)); ctx.lineTo(wx + 64, 200);
        ctx.fill();
      }
      ctx.fillStyle = '#e8f4ff';
      for (let i = 0; i < 14; i++) {
        const yy = ((i * 47 + this.frame) % (VIEW_H + 10)) - 5;
        ctx.fillRect(((i * 61 + ((this.frame >> 3) % 5)) % VIEW_W), yy, 2, 2);
      }
    } else if (k === 'gear') {
      for (let i = 0; i < 4; i++) {
        const wx = ((i * 110 - this.camX * 0.3) % (VIEW_W + 160) + VIEW_W + 160) % (VIEW_W + 160) - 80;
        const cy = 60 + ((i * 47) % 100);
        ctx.fillStyle = '#26242e';
        ctx.beginPath(); ctx.arc(wx, cy, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#100e14';
        for (let tn = 0; tn < 8; tn++) {
          const a = tn * Math.PI / 4 + this.frame * 0.004 * (i % 2 ? 1 : -1);
          ctx.fillRect(wx + Math.cos(a) * 36 - 3, cy + Math.sin(a) * 36 - 3, 7, 7);
        }
      }
      ctx.fillStyle = '#f8d838';
      for (let i = 0; i < 8; i++) {
        if ((i + (this.frame >> 5)) % 3 === 0) {
          ctx.fillRect(((i * 67 - this.camX * 0.5) % VIEW_W + VIEW_W) % VIEW_W, 60 + ((i * 31) % 110), 3, 3);
        }
      }
    } else if (k === 'volt') {
      ctx.fillStyle = '#241040';
      for (let i = 0; i < 6; i++) {
        const wx = ((i * 80 - this.camX * 0.4) % (VIEW_W + 120) + VIEW_W + 120) % (VIEW_W + 120) - 60;
        ctx.fillRect(wx, 70 + ((i * 19) % 40), 12, 170);
        ctx.fillRect(wx - 8, 70 + ((i * 19) % 40), 28, 8);
      }
      if (this.frame % 40 < 4) {
        ctx.fillStyle = '#f8e858';
        const sx = (this.frame * 37) % VIEW_W;
        ctx.fillRect(sx, 40, 2, 30);
        ctx.fillRect(sx - 4, 70, 10, 2);
      }
    } else if (k === 'fortress') {
      ctx.fillStyle = '#c8c0b0';
      ctx.beginPath(); ctx.arc(200, 52, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#181018';
      ctx.beginPath(); ctx.arc(192, 46, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(210, 46, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(196, 62, 10, 5);
      ctx.fillStyle = '#241018';
      for (let i = 0; i < 5; i++) {
        const wx = ((i * 90 - this.camX * 0.25 + this.frame * 0.1) % (VIEW_W + 120)) - 60;
        ctx.fillRect(wx, 30 + i * 22, 70, 7);
      }
    }
  }

  drawTiles() {
    const g = this.stage.g;
    const x0 = Math.floor(this.camX / TILE), x1 = Math.ceil((this.camX + VIEW_W) / TILE);
    for (let ty = 0; ty < g.h; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(g, tx, ty);
        if (t === T.EMPTY) continue;
        drawTile(ctx, t, this.stage.theme, tx * TILE - this.camX, ty * TILE, this.frame);
      }
    }
  }

  drawBar(x, val, color, max = 28) {
    ctx.fillStyle = '#101018';
    ctx.fillRect(x - 1, 19, 10, 58);
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < val ? color : '#282838';
      ctx.fillRect(x, 74 - i * 2, 8, 1);
    }
  }

  drawHUD() {
    this.drawBar(18, Math.ceil(this.player.hp), '#f8e8b0');
    if (this.player.weapon !== 'P') {
      this.drawBar(30, Math.ceil(this.energy[this.player.weapon]), WCOLOR[this.player.weapon]);
    }
    if (this.boss && (this.mode === 'fill' || this.mode === 'boss')) {
      this.drawBar(232, Math.ceil(this.mode === 'fill' ? this.bossBar : this.boss.hp), '#f87070');
    }
    text(ctx, String(this.score).padStart(6, '0'), 250, 4, '#f8f8f8', 8, 'right');
    text(ctx, `REST ${this.lives}`, 16, 82, '#f8f8f8', 8);
    if (this.etank > 0) text(ctx, `E${this.etank}`, 16, 92, '#40d8f8', 8);
  }

  drawMenu() {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(28, 34, 200, 172);
    ctx.strokeStyle = '#f8f8f8';
    ctx.strokeRect(30.5, 36.5, 195, 167);
    text(ctx, 'WEAPONS', 128, 44, '#f8d838', 10, 'center');
    const rows = this.menuRows();
    rows.forEach((row, i) => {
      const y = 64 + i * 18;
      const sel = i === this.menuSel;
      if (sel) text(ctx, '>', 40, y, '#f8f8f8');
      if (row.t === 'weapon') {
        const w = row.w;
        text(ctx, WNAME[w], 52, y, sel ? '#f8f8f8' : '#a0a0b0');
        if (w !== 'P') {
          for (let j = 0; j < 28; j++) {
            ctx.fillStyle = j < this.energy[w] ? WCOLOR[w] : '#282838';
            ctx.fillRect(148 + j * 2, y + 1, 1, 7);
          }
        } else {
          text(ctx, '∞', 150, y, '#a0a0b0');
        }
      } else {
        text(ctx, `E-TANK  x${this.etank}`, 52, y, sel ? '#40d8f8' : '#307888');
        if (sel) text(ctx, 'FIRE: USE', 148, y, '#667');
      }
    });
    text(ctx, `REST ${this.lives}   SCORE ${this.score}`, 128, 186, '#99a', 8, 'center');
    text(ctx, 'ENTER: EQUIP + CLOSE', 128, 196, '#667', 8, 'center');
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawBackground();
    this.drawTiles();
    drawHazards(this, ctx);
    drawPickups(this, ctx, this.frame);
    drawEnemies(this, ctx, this.frame);
    if (this.boss) this.boss.draw(this, ctx, this.frame);
    this.player.draw(ctx, { x: this.camX, y: 0 }, this.frame);
    drawPBullets(this, ctx);
    drawEBullets(this, ctx);
    for (const fx of this.effects) {
      if (fx.t === 'boom') drawBoom(ctx, fx.x - this.camX, fx.y, fx.age, fx.big);
      else drawOrb(ctx, fx.x - this.camX, fx.y, this.frame);
    }
    ctx.restore();
    this.drawHUD();
    if (this.mode === 'ready' && (this.readyT >> 3) % 2 === 0) {
      text(ctx, 'READY', VIEW_W / 2, 110, '#f8f8f8', 10, 'center');
    }
    if (this.mode === 'boss' && this.boss && this.bossIntroName > 0) {
      this.bossIntroName--;
      text(ctx, this.boss.def.name, VIEW_W / 2, 60, '#f87070', 10, 'center');
    }
    if (this.paused) this.drawMenu();
  }

  // ---------------- title / select / weaponget / gameover / ending ----------------

  drawTitle() {
    ctx.fillStyle = '#060612';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // city skyline
    ctx.fillStyle = '#101828';
    for (let i = 0; i < 16; i++) {
      const hh = 20 + ((i * 37) % 44);
      ctx.fillRect(i * 16, VIEW_H - 30 - hh, 17, hh + 30);
    }
    ctx.fillStyle = '#f8d838';
    for (let i = 0; i < 20; i++) {
      if ((i + (this.frame >> 5)) % 4 === 0) ctx.fillRect((i * 41) % VIEW_W, VIEW_H - 30 - ((i * 23) % 40), 2, 2);
    }
    text(ctx, 'MEGA', VIEW_W / 2, 38, '#00e8d8', 34, 'center');
    text(ctx, 'MOORE', VIEW_W / 2, 74, '#f8f8f8', 26, 'center');
    text(ctx, 'THE ROBOT MASTER REBELLION', VIEW_W / 2, 108, '#8890a8', 8, 'center');
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP MENU TO START' : 'PUSH ENTER', VIEW_W / 2, 152, '#f8f8f8', 10, 'center');
    }
    text(ctx, `HI SCORE ${String(this.save.hiscore).padStart(6, '0')}`, VIEW_W / 2, 176, '#f8d838', 8, 'center');
    if (this.allBeaten()) text(ctx, '★ ALL MASTERS DEFEATED ★', VIEW_W / 2, 190, '#f87070', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 220, '#556', 8, 'center');
    drawSprite(ctx, 'p_run1_P', 24, VIEW_H - 76, false);
    drawSprite(ctx, 'bm_torch', 208, VIEW_H - 78, true);
  }

  updateTitle() {
    this.sound.playMusic('title');
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      this.startFromTitle();
    }
  }

  selectCells() {
    return [
      { id: 'torch', x: 24, y: 56 },
      { id: 'fortress', x: 104, y: 56, skull: true },
      { id: 'frost', x: 184, y: 56 },
      { id: 'gear', x: 24, y: 140 },
      { id: 'volt', x: 184, y: 140 },
    ];
  }

  updateSelect() {
    this.sound.playMusic('select');
    const inp = this.input;
    const nav = {
      0: { right: 1, down: 3 },
      1: { left: 0, right: 2, down: 4 },
      2: { left: 1, down: 4 },
      3: { up: 0, right: 4 },
      4: { left: 3, up: 2 },
    };
    for (const d of ['left', 'right', 'up', 'down']) {
      if (inp.pressed(d) && nav[this.selIdx][d] !== undefined) {
        this.selIdx = nav[this.selIdx][d];
        this.sound.menuMove();
      }
    }
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      const cell = this.selectCells()[this.selIdx];
      if (cell.skull && !this.allBeaten()) { this.sound.buzz(); return; }
      this.sound.teleport();
      this.sound.stopMusic();
      this.startStage(cell.id);
    }
  }

  drawSelect() {
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#12122a';
    for (let i = 0; i < 12; i++) ctx.fillRect(0, i * 22 + ((this.frame >> 3) % 22), VIEW_W, 1);
    text(ctx, 'SELECT STAGE', VIEW_W / 2, 16, '#f8d838', 12, 'center');
    const cells = this.selectCells();
    cells.forEach((c, i) => {
      const beaten = !!this.save.beaten[c.id];
      const locked = c.skull && !this.allBeaten();
      ctx.fillStyle = '#181830';
      ctx.fillRect(c.x, c.y, 48, 48);
      // portrait (16px art scaled 2x)
      const spr = c.skull ? SPR.port_skull : SPR[`port_${c.id}`];
      ctx.save();
      if (beaten && !c.skull) ctx.globalAlpha = 0.35;
      if (locked) ctx.globalAlpha = 0.5;
      ctx.drawImage(spr, c.x + 8, c.y + 8, 32, 32);
      ctx.restore();
      if (locked) text(ctx, '?', c.x + 24, c.y + 20, '#f8f8f8', 14, 'center');
      if (beaten && !c.skull) text(ctx, 'OK', c.x + 24, c.y + 20, '#40d8f8', 10, 'center');
      ctx.strokeStyle = i === this.selIdx && (this.frame >> 3) % 2 === 0 ? '#f8f8f8' : '#3a3a5c';
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, 47, 47);
      const name = c.skull ? 'SKULL FORT.' : BOSSES[c.id].name.split(' ')[0];
      text(ctx, name, c.x + 24, c.y + 52, i === this.selIdx ? '#f8f8f8' : '#8890a8', 8, 'center');
    });
    text(ctx, `REST ${this.lives}`, 20, 224, '#f8f8f8', 8);
    text(ctx, `HI ${String(this.save.hiscore).padStart(6, '0')}`, 128, 224, '#f8d838', 8, 'center');
    text(ctx, String(this.score).padStart(6, '0'), 236, 224, '#f8f8f8', 8, 'right');
  }

  updateWeaponGet() {
    this.wgT++;
    if (this.wgT > 90 && (this.input.pressed('start') || this.input.pressed('fire'))) {
      this.state = 'select';
      this.sound.playMusic('select');
    }
  }

  drawWeaponGet() {
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = this.newWeapon;
    // sparkle field
    ctx.fillStyle = WCOLOR[w];
    for (let i = 0; i < 12; i++) {
      const yy = ((i * 53 + this.frame * 2) % VIEW_H);
      ctx.fillRect((i * 73 + 11) % VIEW_W, yy, 2, 2);
    }
    const spr = SPR[`p_stand_${w}`];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, VIEW_W / 2 - spr.width, 66, spr.width * 2, spr.height * 2);
    ctx.restore();
    if (this.wgT > 30) text(ctx, 'WEAPON GET!', VIEW_W / 2, 30, '#f8f8f8', 12, 'center');
    if (this.wgT > 60) text(ctx, WNAME[w], VIEW_W / 2, 124, WCOLOR[w], 14, 'center');
    if (this.wgT > 90 && this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 170, '#99a', 8, 'center');
  }

  updateGameOver() {
    if (this.input.pressed('start') || this.input.pressed('fire')) {
      // continue at stage select: beaten bosses stay beaten
      this.lives = 3;
      this.energy = { T: 28, F: 28, G: 28, V: 28 };
      this.state = 'select';
      this.sound.playMusic('select');
    }
  }

  drawGameOver() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 76, '#f87070', 16, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 110, '#f8f8f8', 8, 'center');
    text(ctx, `HI    ${String(this.save.hiscore).padStart(6, '0')}`, VIEW_W / 2, 122, '#f8d838', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER TO CONTINUE', VIEW_W / 2, 160, '#f8f8f8', 8, 'center');
  }

  updateEnding() {
    this.endT++;
    if (this.endT > 300 && (this.input.pressed('start') || this.input.pressed('fire'))) {
      this.saveHiscore();
      this.state = 'title';
      this.sound.stopMusic();
    }
  }

  drawEnding() {
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const rise = Math.min(60, this.endT / 6);
    ctx.fillStyle = '#e07820';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 250 - rise, 40, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f8d838';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 250 - rise, 26, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 208, VIEW_W, 32);
    drawSprite(ctx, 'p_stand_P', VIEW_W / 2 - 8, 187, false);
    text(ctx, 'FORTRESS DESTROYED', VIEW_W / 2, 24, '#f8d838', 12, 'center');
    const lines = [
      'DR. MOORLY\'S SKULL FORTRESS',
      'CRUMBLES INTO THE SEA.',
      '',
      'THE FOUR ROBOT MASTERS ARE',
      'FREE OF HIS CONTROL AT LAST.',
      '',
      'MEGA MOORE WATCHES THE SUN',
      'RISE ON A PEACEFUL CITY.',
    ];
    const chars = Math.floor(this.endT / 2);
    let used = 0;
    lines.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 24, 56 + i * 12, '#c8c8d8', 8);
      used += line.length;
    });
    text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 170, '#f8f8f8', 8, 'center');
    if (this.endT > 300 && this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 182, '#99a', 8, 'center');
  }

  // ---------------- debug hooks (used by smoke tests) ----------------

  debugStage(id) { this.sound.muted = true; this.startStage(id); this.mode = 'play'; }
  debugToDoor() {
    this.player.x = this.stage.doorX * TILE - 40;
    this.player.y = 12 * TILE - 22;
  }
  debugWinBoss() { if (this.boss) this.boss.hp = 1; }
  debugBeatAll() { for (const id of ORDER) this.save.beaten[id] = true; this.persist(); }

  // ---------------- frame ----------------

  tick() {
    this.frame++;
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.sound.updateMusic();

    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'select': this.updateSelect(); this.drawSelect(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'weaponget': this.updateWeaponGet(); this.drawWeaponGet(); break;
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
