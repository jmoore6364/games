// Moore Icarus — main loop, states, camera, HUD, shops, curses, bosses.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawTile, drawBoom, drawPoof, THEMES,
} from './sprites.js';
import { TILE, T, STAGES, WORLD_INTRO, SACRED, ENDING, tileAt, setTile } from './levels.js';
import {
  Player, spawnEnemy, updateEnemies, drawEnemies, damageEnemy,
  updatePArrows, drawPArrows, updateEBullets, drawEBullets, overlap,
} from './entities.js';
import { SHOP_ITEMS } from './shop.js';

const VIEW_W = 256, VIEW_H = 240;

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

const LS = { hi: 'mooreIcarus.hi', best: 'mooreIcarus.best' };
function loadNum(k) { const v = parseInt(localStorage.getItem(k) || '0', 10); return isNaN(v) ? 0 : v; }
function saveNum(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } }

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.hiScore = loadNum(LS.hi);
    this.bestStage = loadNum(LS.best);
    this.goSel = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / stage setup ----------------
  startRun() {
    this.lives = 3;
    this.score = 0;
    this.hearts = 0;
    this.keyCount = 0;
    this.nextLifeAt = 20000;
    this.up = { maxHp: 5, range: 0, speed: 0, triple: false, big: false, barrier: 0, feather: false };
    this.stageIdx = 0;
    this.beginStage(false);
  }

  beginStage(skipIntro) {
    const src = STAGES[this.stageIdx];
    this.stage = { ...src, g: { w: src.g.w, h: src.g.h, d: Uint8Array.from(src.g.d) } };
    this.world = src.world;
    this.enemies = [];
    this.pbullets = [];
    this.ebullets = [];
    this.booms = [];
    this.poofs = [];
    this.drops = [];
    this.spawned = new Set();
    this.shake = 0;
    this.minibossDead = false;
    this.bossDown = false;
    this.bossSpawned = false;
    this.clearT = 0;
    this.msg = null; this.msgT = 0;
    this.keyCount = 0;
    // instantiate props
    this.pots = (src.pots || []).map((p) => ({ x: p.tx * TILE, y: p.ty * TILE, w: 9, h: 9, amt: p.amt || 5, broken: false }));
    this.chests = (src.chests || []).map((c) => ({ x: c.tx * TILE, y: c.ty * TILE + 8, w: 9, h: 8, trap: c.trap, amt: c.amt || 20, open: false }));
    this.keys = (src.keys || []).map((k) => ({ x: k.tx * TILE, y: k.ty * TILE, w: 9, h: 9, got: false }));
    this.doors = (src.doors || []).map((d) => ({ x: d.tx * TILE, y: d.ty * TILE, w: 16, h: 16, kind: d.kind, needBoss: d.needBoss }));

    this.player = new Player(this, src.start.x, src.start.y);
    this.camX = 0;
    this.camY = src.vertical ? Math.max(0, src.g.h * TILE - VIEW_H) : 0;

    if (src.type === 'climb' && !skipIntro) {
      this.state = 'intro'; this.introT = 0;
    } else {
      this.enterPlay();
    }
    this.sound.stopMusic();
  }

  enterPlay() {
    this.state = 'play';
    this.paused = false;
    const th = THEMES[this.stage.theme];
    this.banner = th.name; this.bannerT = 150;
    this.sound.playMusic(this.stage.boss ? 'boss' : th.music);
    if (this.stage.boss) this.spawnBoss();
  }

  spawnBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const b = this.stage.boss;
    if (b === 'pluton') spawnEnemy(this, 'pluton', VIEW_W / 2 - 16, 40);
    else if (b === 'gyrapace') spawnEnemy(this, 'gyrapace', VIEW_W / 2 - 17, 40, { y0: 40 });
    else if (b === 'moordusa') spawnEnemy(this, 'moordusa', VIEW_W / 2 - 15, 40);
  }

  // ---------------- helpers ----------------
  addScore(n) {
    this.score += n;
    if (this.score >= this.nextLifeAt) { this.lives++; this.nextLifeAt += 20000; this.sound.oneUp(); }
    if (this.score > this.hiScore) { this.hiScore = this.score; saveNum(LS.hi, this.hiScore); }
  }

  addBoom(x, y, big) { this.booms.push({ x, y, t: 0, big }); if (big) this.shake = 8; }

  showMsg(s, t = 120) { this.msg = s; this.msgT = t; }

  onBossDown(e) {
    if (e.t === 'reaper') {
      this.minibossDead = true;
      this.addScore(3000);
      this.sound.clearJingle();
      this.showMsg('THE GATE IS OPEN', 150);
      return;
    }
    // world boss
    this.bossDown = true;
    this.clearT = 170;
    this.addScore(10000);
    this.sound.stopMusic();
    this.ebullets = [];
    this.enemies = this.enemies.filter((x) => x.boss);   // clear lingering minions
  }

  killPlayerFall() {
    const P = this.player;
    if (P.dead || P.invuln > 0) return;
    if (this.up.feather) {
      this.up.feather = false;
      P.y = this.camY + 50; P.x = Math.max(TILE, Math.min(P.x, this.stage.g.w * TILE - 2 * TILE));
      P.vy = -2; P.invuln = 90;
      this.showMsg('FEATHER SAVED YOU!', 110);
      this.sound.oneUp();
      return;
    }
    P.die();
  }

  respawn() {
    this.lives--;
    saveBestIfNeeded(this);
    if (this.lives <= 0) { this.state = 'gameover'; this.goSel = 0; this.sound.stopMusic(); return; }
    this.beginStage(true);
  }

  // ---------------- spawns (proximity streaming) ----------------
  processSpawns() {
    const st = this.stage;
    (st.spawns || []).forEach((s, i) => {
      if (this.spawned.has(i)) return;
      const sx = s.tx * TILE, sy = s.ty * TILE;
      const nearX = sx > this.camX - 48 && sx < this.camX + VIEW_W + 48;
      const nearY = sy > this.camY - 48 && sy < this.camY + VIEW_H + 48;
      if (!(nearX && nearY)) return;
      this.spawned.add(i);
      const e = spawnEnemy(this, s.t, sx, sy);
      if (e.t === 'specknose' || e.t === 'girin') e.y0 = e.y;
    });
  }

  // ---------------- doors / chests / keys / locks ----------------
  interact(inp) {
    const P = this.player;
    const hb = P.hitbox();
    // chests: auto-open on contact
    for (const c of this.chests) {
      if (c.open || !overlap(hb, c)) continue;
      c.open = true;
      if (c.trap) {
        P.egg = 480;
        this.sound.eggplant();
        this.showMsg('THE EGGPLANT WIZARD! CURSED!', 160);
        this.shake = 6;
      } else {
        this.hearts += c.amt;
        this.sound.fanfare();
        this.showMsg(`TREASURE! +${c.amt} HEARTS`, 140);
      }
    }
    // keys
    for (const k of this.keys) {
      if (k.got || !overlap(hb, k)) continue;
      k.got = true; this.keyCount++;
      this.sound.key();
      this.showMsg('GOT A KEY', 90);
    }
    // locks: unlock when adjacent and holding a key
    if (this.keyCount > 0) {
      const tx0 = Math.floor((P.x - 2) / TILE), tx1 = Math.floor((P.x + P.w + 2) / TILE);
      for (let tx = tx0; tx <= tx1; tx++) {
        for (let ty = Math.floor(P.y / TILE); ty <= Math.floor((P.y + P.h) / TILE); ty++) {
          if (tileAt(this.stage.g, tx, ty) === T.LOCK) { this.unlockDoor(tx); return; }
        }
      }
    }
    // doors: press UP while standing on the door
    P.onDoor = null;
    for (const d of this.doors) {
      if (overlap(hb, d)) { P.onDoor = d; break; }
    }
    if (P.onDoor && inp.pressed('up')) this.enterDoor(P.onDoor);
  }

  unlockDoor(tx) {
    for (let ty = 0; ty < this.stage.g.h; ty++) {
      if (tileAt(this.stage.g, tx, ty) === T.LOCK) setTile(this.stage.g, tx, ty, T.EMPTY);
    }
    this.keyCount--;
    this.sound.door();
    this.showMsg('DOOR UNLOCKED', 90);
  }

  enterDoor(d) {
    if (d.kind === 'shop') {
      this.state = 'shop'; this.shopSel = 0;
      this.sound.shopJingle();
    } else if (d.kind === 'nurse') {
      const P = this.player;
      const cured = P.egg > 0;
      P.egg = 0;
      P.hp = this.up.maxHp;
      this.sound.cure();
      this.showMsg(cured ? 'THE NURSE CURED YOU!' : 'THE NURSE HEALS YOU', 120);
    } else if (d.kind === 'exit') {
      if (d.needBoss && !this.minibossDead) { this.sound.deny(); this.showMsg('DEFEAT THE REAPER FIRST', 100); return; }
      this.sound.door();
      this.nextStage();
    }
  }

  nextStage() {
    saveBestIfNeeded(this);
    this.stageIdx++;
    if (this.stageIdx >= STAGES.length) { this.toEnding(); return; }
    this.beginStage(false);
  }

  toTreasure() {
    this.state = 'treasure'; this.treasureT = 0;
    this.treasure = SACRED[this.world];
    if (this.treasure) this.treasure.apply(this.up);
    this.sound.fanfare();
  }

  toEnding() { this.state = 'ending'; this.endT = 0; this.sound.playMusic('ending'); }

  // ---------------- play update ----------------
  updatePlay() {
    const inp = this.input;
    const st = this.stage;
    const P = this.player;

    if (inp.pressed('start')) { this.paused = !this.paused; this.sound.pause(); }
    if (this.paused) return;

    P.update(this, inp);

    // camera
    if (st.vertical) {
      // screen only ever climbs UP
      this.camY = Math.max(0, Math.min(this.camY, P.y - 140));
      this.camX = 0;
    } else if (st.type === 'boss') {
      this.camX = 0; this.camY = 0;
    } else {
      const maxX = st.g.w * TILE - VIEW_W;
      const maxY = st.g.h * TILE - VIEW_H;
      this.camX = Math.max(0, Math.min(maxX, P.x - 120));
      this.camY = maxY <= 0 ? 0 : Math.max(0, Math.min(maxY, P.y - 120));
    }

    // fell off the bottom of the world / screen
    if (!P.dead) {
      if (st.vertical && P.y > this.camY + VIEW_H + 4) this.killPlayerFall();
      else if (!st.vertical && P.y > st.g.h * TILE + 8) this.killPlayerFall();
    }
    if (P.dead && P.deadT > 70) this.respawn();

    if (!P.dead) this.interact(inp);
    if (this.state !== 'play') return;   // a door changed state this frame
    this.processSpawns();
    updateEnemies(this);
    updatePArrows(this);
    updateEBullets(this);

    // arrows vs enemies + pots
    for (const b of [...this.pbullets]) {
      for (const p of this.pots) {
        if (p.broken || !overlap(b, p)) continue;
        p.broken = true; b.dead = true;
        this.spawnHearts(p.x + 2, p.y, p.amt);
        this.sound.pop();
      }
      for (const e of [...this.enemies]) {
        if (!overlap(b, e)) continue;
        if (b.hits.has(e)) continue;
        b.hits.add(e);
        damageEnemy(this, e, b.dmg);
        if (!b.big) { b.dead = true; break; }
      }
    }
    this.pbullets = this.pbullets.filter((b) => !b.dead);

    // enemy bullets / bodies vs player
    if (!P.dead && P.invuln === 0) {
      const hb = P.hitbox();
      for (const b of this.ebullets) {
        if (overlap(b, hb)) {
          if (b.petrify) { P.egg = Math.max(P.egg, 240); this.sound.eggplant(); }
          P.hurt(1); b.hitP = true; break;
        }
      }
      this.ebullets = this.ebullets.filter((b) => !b.hitP);
      for (const e of this.enemies) {
        if (overlap(e, hb)) { P.hurt(1); break; }
      }
    }

    // heart drops
    for (const d of this.drops) {
      d.vy = Math.min(3, d.vy + 0.2); d.y += d.vy; d.t++;
      // settle on ground
      if (tileAt(this.stage.g, Math.floor((d.x + 3) / TILE), Math.floor((d.y + d.h) / TILE)) === T.SOLID) { d.vy = 0; }
      if (!P.dead && overlap(d, P.hitbox())) { this.hearts += d.amt; d.dead = true; this.sound.heart(); }
    }
    this.drops = this.drops.filter((d) => !d.dead && d.t < 600);

    // effects
    for (const bm of this.booms) bm.t++;
    this.booms = this.booms.filter((bm) => bm.t < (bm.big ? 22 : 14));
    for (const pf of this.poofs) pf.t++;
    this.poofs = this.poofs.filter((pf) => pf.t < 8);
    if (this.shake > 0) this.shake--;
    if (this.msgT > 0) this.msgT--;

    // boss cleared -> treasure or ending
    if (this.bossDown) {
      this.clearT--;
      if (this.clearT % 10 === 0 && this.clearT > 70) {
        this.addBoom(this.camX + 40 + ((this.clearT * 53) % 180), this.camY + 30 + ((this.clearT * 31) % 160), true);
        this.sound.pop();
      }
      if (this.clearT === 70) this.sound.fanfare();
      if (this.clearT <= 0) this.toTreasure();
    }
  }

  spawnHearts(x, y, amt) {
    this.drops.push({ x, y, vy: -1.5, w: 7, h: 7, amt, t: 0 });
  }

  // ---------------- rendering ----------------
  drawBackground() {
    const th = THEMES[this.stage.theme];
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, th.sky0); grad.addColorStop(1, th.sky1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const k = this.stage.theme;
    if (k === 'underworld') {
      ctx.fillStyle = 'rgba(120,60,140,0.35)';
      for (let i = 0; i < 12; i++) {
        const wy = ((i * 53 - this.camY * 0.3) % (VIEW_H + 40));
        ctx.fillRect((i * 37) % VIEW_W, (wy + VIEW_H + 40) % (VIEW_H + 40) - 20, 3, 3);
      }
    } else if (k === 'overworld' || k === 'sky') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 60 - this.camX * 0.4) % (VIEW_W + 80)) - 40;
        const cy = 20 + ((i * 41) % 120) - (this.camY * 0.2) % 40;
        ctx.beginPath();
        ctx.ellipse((cx + VIEW_W + 80) % (VIEW_W + 80) - 40, cy, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (k === 'fortress') {
      ctx.fillStyle = 'rgba(90,90,120,0.3)';
      for (let i = 0; i < 8; i++) {
        const bx = ((i * 40 - this.camX * 0.5) % (VIEW_W + 40));
        ctx.fillRect((bx + VIEW_W + 40) % (VIEW_W + 40) - 20, 20 + ((i * 29) % 160) - (this.camY * 0.5) % 40, 14, 30);
      }
    }
  }

  drawTiles() {
    const g = this.stage.g;
    const x0 = Math.floor(this.camX / TILE), x1 = Math.ceil((this.camX + VIEW_W) / TILE);
    const y0 = Math.floor(this.camY / TILE), y1 = Math.ceil((this.camY + VIEW_H) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(g, tx, ty);
        if (t === T.EMPTY) continue;
        const topOpen = tileAt(g, tx, ty - 1) !== T.SOLID;
        drawTile(ctx, t, this.stage.theme, tx * TILE - this.camX, ty * TILE - this.camY, this.frame, topOpen);
      }
    }
  }

  drawProps() {
    const cam = { x: this.camX, y: this.camY };
    for (const p of this.pots) if (!p.broken) drawSprite(ctx, 'pot', p.x - cam.x, p.y - cam.y);
    for (const c of this.chests) if (!c.open) drawSprite(ctx, 'chest', c.x - cam.x, c.y - cam.y);
    for (const k of this.keys) if (!k.got) drawSprite(ctx, 'key', k.x - cam.x + ((this.frame >> 3 & 1) ? 0 : 1) - 1, k.y - cam.y);
    for (const d of this.doors) this.drawDoor(d, cam);
    for (const d of this.drops) {
      drawSprite(ctx, 'heart', Math.round(d.x - cam.x), Math.round(d.y - cam.y));
    }
  }

  drawDoor(d, cam) {
    const x = d.x - cam.x, y = d.y - cam.y;
    if (d.kind === 'exit' && d.needBoss && !this.minibossDead) {
      ctx.fillStyle = '#3a2018'; ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = '#f83030'; ctx.fillRect(x + 6, y + 6, 4, 4);
      return;
    }
    // door frame
    const col = d.kind === 'shop' ? '#e0a030' : d.kind === 'nurse' ? '#f0a0c0' : '#40d0e0';
    ctx.fillStyle = '#201810'; ctx.fillRect(x, y - 2, 16, 18);
    ctx.fillStyle = col; ctx.fillRect(x + 2, y, 12, 16);
    ctx.fillStyle = '#201810'; ctx.fillRect(x + 6, y + 6, 4, 10);
    const label = d.kind === 'shop' ? 'SHOP' : d.kind === 'nurse' ? 'CURE' : 'EXIT';
    text(ctx, label, x + 8, y - 10, col, 7, 'center');
    // prompt when standing on it
    if (this.player && !this.player.dead && overlap(this.player.hitbox(), d) && this.frame % 40 < 26) {
      text(ctx, '↑', x + 8, y - 18, '#fff', 8, 'center');
    }
  }

  drawHUD() {
    // score + hi
    text(ctx, `${String(this.score).padStart(6, '0')}`, 4, 3, '#fff', 8);
    text(ctx, `HI ${String(this.hiScore).padStart(6, '0')}`, VIEW_W - 4, 3, '#f8d038', 8, 'right');
    // health bar
    for (let i = 0; i < this.up.maxHp; i++) {
      ctx.fillStyle = i < this.player.hp ? '#40e040' : '#204020';
      ctx.fillRect(4 + i * 6, 14, 5, 5);
    }
    // hearts currency
    drawSprite(ctx, 'heart', 4, 22);
    text(ctx, `${this.hearts}`, 14, 23, '#f8a0a0', 8);
    // lives + keys
    text(ctx, `x${this.lives}`, VIEW_W - 4, 14, '#fff', 8, 'right');
    if (this.keyCount > 0) { drawSprite(ctx, 'key', VIEW_W - 40, 21); text(ctx, `${this.keyCount}`, VIEW_W - 30, 23, '#f8d038', 8); }
    // status
    let sx = 60;
    if (this.up.barrier > 0) { text(ctx, `BARR${this.up.barrier}`, sx, 23, '#40d0e0', 7); sx += 34; }
    if (this.up.feather) { text(ctx, 'FTHR', sx, 23, '#c8e0ff', 7); sx += 30; }
    if (this.player.egg > 0) text(ctx, 'CURSED!', VIEW_W / 2, 23, '#c060e0', 8, 'center');
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawBackground();
    this.drawTiles();
    this.drawProps();
    const cam = { x: this.camX, y: this.camY };
    drawEnemies(this, ctx, cam, this.frame);
    this.player.draw(ctx, cam, this.frame);
    drawPArrows(this, ctx, cam);
    drawEBullets(this, ctx, cam);
    for (const bm of this.booms) drawBoom(ctx, bm.x - cam.x, bm.y - cam.y, bm.t, bm.big);
    for (const pf of this.poofs) drawPoof(ctx, pf.x - cam.x, pf.y - cam.y, pf.t);
    ctx.restore();

    this.drawHUD();
    if (this.bannerT > 0) { this.bannerT--; if (this.bannerT > 30 || this.frame % 8 < 5) text(ctx, this.banner, VIEW_W / 2, 54, '#f8d038', 8, 'center'); }
    if (this.msgT > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, VIEW_H - 30, VIEW_W, 16);
      text(ctx, this.msg, VIEW_W / 2, VIEW_H - 28, '#fff', 8, 'center');
    }
    if (this.bossDown && this.clearT < 70) text(ctx, 'BOSS DEFEATED', VIEW_W / 2, 100, '#fff', 10, 'center');
    if (this.paused) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); text(ctx, 'PAUSE', VIEW_W / 2, 110, '#fff', 12, 'center'); }
  }

  // ---------------- title ----------------
  drawTitle() {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#182848'); grad.addColorStop(1, '#3868a8');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 70 + this.frame * 0.3) % (VIEW_W + 80)) - 40;
      ctx.beginPath(); ctx.ellipse(cx, 150 + (i % 2) * 30, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    text(ctx, 'MOORE', VIEW_W / 2, 40, '#f8f0c0', 30, 'center');
    text(ctx, 'ICARUS', VIEW_W / 2, 72, '#f8d038', 26, 'center');
    text(ctx, 'THE WINGED HERO OF MOORE', VIEW_W / 2, 104, '#cdd', 8, 'center');
    drawSprite(ctx, 'p_stand', VIEW_W / 2 - 8, 118, false);
    if (this.frame % 60 < 40) text(ctx, this.touch ? 'TAP SHOOT TO START' : 'PRESS ENTER OR X', VIEW_W / 2, 168, '#fff', 9, 'center');
    text(ctx, `HI-SCORE ${String(this.hiScore).padStart(6, '0')}`, VIEW_W / 2, 190, '#f8d038', 8, 'center');
    if (this.bestStage > 0) {
      const bw = Math.floor(this.bestStage / 4) + 1;
      text(ctx, `BEST: WORLD ${Math.min(bw, 3)}`, VIEW_W / 2, 202, '#9ab', 8, 'center');
    }
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 222, '#668', 8, 'center');
  }

  updateTitle() {
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) this.startRun();
  }

  // ---------------- world intro ----------------
  drawIntro() {
    ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const wi = WORLD_INTRO[this.world];
    text(ctx, `WORLD ${this.world + 1}`, VIEW_W / 2, 34, '#f8d038', 10, 'center');
    text(ctx, wi.name, VIEW_W / 2, 52, '#fff', 10, 'center');
    const chars = Math.floor(this.introT / 2);
    let used = 0;
    wi.lines.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 22, 90 + i * 14, '#c8c8d8', 8);
      used += line.length;
    });
    if (this.frame % 60 < 40) text(ctx, 'PRESS X TO CLIMB', VIEW_W / 2, 200, '#9ab', 8, 'center');
  }

  updateIntro() {
    this.introT++;
    if (this.introT > 20 && (this.input.pressed('fire') || this.input.pressed('start') || this.input.pressed('jump'))) this.enterPlay();
    if (this.introT > 520) this.enterPlay();
  }

  // ---------------- shop ----------------
  drawShop() {
    this.drawPlay();
    ctx.fillStyle = 'rgba(0,0,10,0.8)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawSprite(ctx, 'merchant', 20, 40);
    text(ctx, "MERCHANT'S WARES", VIEW_W / 2, 20, '#f8d038', 10, 'center');
    drawSprite(ctx, 'heart', 150, 20);
    text(ctx, `${this.hearts}`, 162, 21, '#f8a0a0', 9);
    const items = SHOP_ITEMS;
    items.forEach((it, i) => {
      const y = 48 + i * 20;
      const sel = i === this.shopSel;
      const maxed = it.max(this);
      const color = maxed ? '#667' : sel ? '#fff' : '#aab';
      if (sel) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(44, y - 2, 208, 18); text(ctx, '▶', 46, y + 1, '#f8d038', 8); }
      text(ctx, it.name, 58, y, color, 8);
      text(ctx, maxed ? 'OWNED' : `${it.cost}`, 244, y, maxed ? '#667' : '#f8a0a0', 8, 'right');
      if (sel) text(ctx, it.desc, VIEW_W / 2, y + 9, '#9ab', 7, 'center');
    });
    const ly = 48 + items.length * 20;
    const lsel = this.shopSel === items.length;
    if (lsel) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(44, ly - 2, 208, 12); text(ctx, '▶', 46, ly, '#f8d038', 8); }
    text(ctx, 'LEAVE', 58, ly, lsel ? '#fff' : '#aab', 8);
  }

  updateShop() {
    const inp = this.input;
    const n = SHOP_ITEMS.length + 1;
    if (inp.pressed('down')) { this.shopSel = (this.shopSel + 1) % n; this.sound.door(); }
    if (inp.pressed('up')) { this.shopSel = (this.shopSel + n - 1) % n; this.sound.door(); }
    if (inp.pressed('fire') || inp.pressed('jump')) {
      if (this.shopSel === SHOP_ITEMS.length) { this.leaveShop(); return; }
      const it = SHOP_ITEMS[this.shopSel];
      if (it.max(this)) { this.sound.deny(); return; }
      if (this.hearts < it.cost) { this.sound.deny(); this.showMsg('NOT ENOUGH HEARTS', 80); return; }
      this.hearts -= it.cost; it.buy(this); this.sound.buy();
    }
    if (inp.pressed('start')) this.leaveShop();
  }

  leaveShop() {
    this.state = 'play';
    // step the player off the door so they don't re-enter instantly
    this.player.y -= 2;
    const th = THEMES[this.stage.theme];
    this.sound.playMusic(this.stage.boss ? 'boss' : th.music);
  }

  // ---------------- treasure ----------------
  drawTreasure() {
    ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // rays
    ctx.save(); ctx.translate(VIEW_W / 2, 90);
    for (let a = 0; a < 12; a++) {
      ctx.fillStyle = 'rgba(248,208,56,0.15)'; ctx.rotate(Math.PI / 6 + this.frame * 0.01);
      ctx.fillRect(0, -3, 120, 6);
    }
    ctx.restore();
    text(ctx, 'SACRED TREASURE', VIEW_W / 2, 40, '#f8d038', 10, 'center');
    drawSprite(ctx, 'chest', VIEW_W / 2 - 4, 74);
    if (this.treasure) {
      text(ctx, this.treasure.name, VIEW_W / 2, 110, '#fff', 9, 'center');
      text(ctx, this.treasure.desc, VIEW_W / 2, 128, '#9df', 8, 'center');
    }
    if (this.frame % 60 < 40) text(ctx, 'PRESS X TO CONTINUE', VIEW_W / 2, 180, '#9ab', 8, 'center');
  }

  updateTreasure() {
    this.treasureT++;
    if (this.treasureT > 30 && (this.input.pressed('fire') || this.input.pressed('start') || this.input.pressed('jump'))) {
      this.nextStage();
    }
  }

  // ---------------- game over ----------------
  drawGameOver() {
    ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 70, '#e04038', 16, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 104, '#fff', 8, 'center');
    text(ctx, `${this.goSel === 0 ? '▶' : ' '} RETRY WORLD`, VIEW_W / 2 - 4, 140, '#fff', 9, 'center');
    text(ctx, `${this.goSel === 1 ? '▶' : ' '} TITLE`, VIEW_W / 2 - 4, 156, '#fff', 9, 'center');
  }

  updateGameOver() {
    const inp = this.input;
    if (inp.pressed('up') || inp.pressed('down')) this.goSel = 1 - this.goSel;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      if (this.goSel === 0) {
        this.lives = 3; this.score = 0;
        this.stageIdx = this.world * 4;   // retry from start of the current world
        this.beginStage(false);
      } else this.state = 'title';
    }
  }

  // ---------------- ending ----------------
  drawEnding() {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#f8d038'); grad.addColorStop(1, '#e88028');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 6; i++) { const cx = ((i * 60 + this.frame * 0.4) % (VIEW_W + 80)) - 40; ctx.beginPath(); ctx.ellipse(cx, 160 + (i % 2) * 20, 24, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    drawSprite(ctx, 'p_stand', VIEW_W / 2 - 20, 120, false);
    drawSprite(ctx, 'nurse', VIEW_W / 2 + 8, 118);  // Moora, rescued
    text(ctx, 'THE GODDESS IS FREE', VIEW_W / 2, 22, '#5a3010', 11, 'center');
    const chars = Math.floor(this.endT / 2);
    let used = 0;
    ENDING.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 16, 44 + i * 11, '#3a2008', 8);
      used += line.length;
    });
    text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 200, '#5a3010', 8, 'center');
  }

  updateEnding() {
    this.endT++;
    if (this.endT > 260 && (this.input.pressed('start') || this.input.pressed('fire'))) { this.state = 'title'; this.sound.stopMusic(); }
  }

  // ---------------- frame ----------------
  tick() {
    this.frame++;
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.sound.updateMusic();
    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'intro': this.updateIntro(); this.drawIntro(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'shop': this.updateShop(); this.drawShop(); break;
      case 'treasure': this.updateTreasure(); this.drawTreasure(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'ending': this.updateEnding(); this.drawEnding(); break;
    }
    this.input.endFrame();
  }
}

function saveBestIfNeeded(g) {
  if (g.stageIdx > g.bestStage) { g.bestStage = g.stageIdx; saveNum(LS.best, g.bestStage); }
}

initSprites();
const game = new Game();
window.__game = game; // for smoke tests
window.__spawnEnemy = spawnEnemy;
window.__damage = damageEnemy;
window.__overlap = overlap;

let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 1000 / 61) return;
  last = ts;
  game.tick();
}
requestAnimationFrame(loop);
