// Bonk's Moore-venture — main loop, states, camera, HUD.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawTile, drawBigHead, drawPoof, drawShockwave, THEMES,
} from './sprites.js';
import { TILE, T, ROUNDS, buildBonus, tileAt } from './levels.js';
import {
  Player, spawnEnemy, updateEnemies, drawEnemies, damageEnemy,
  updateEBullets, drawEBullets, spawnItem, updateItems, drawItems, overlap,
} from './entities.js';

const VIEW_W = 256, VIEW_H = 224;
const HISCORE_KEY = 'bonks-moore-venture.hiscore';
const ENEMY_TYPES = new Set(['dino', 'shell', 'ptero', 'frog', 'spiky', 'fish', 'cactus', 'penguin', 'grub', 'king']);

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
  c.font = `bold ${size}px monospace`;
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
    this.goSel = 0;
    this.hiscore = Number(localStorage.getItem(HISCORE_KEY) || 0);
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- run / round setup ----------------

  startRun() {
    this.lives = 3;
    this.continues = 3;
    this.score = 0;
    this.smileys = 0;
    this.maxHp = 6; // 3 hearts, in halves
    this.roundIdx = 0;
    this.beginRound();
  }

  beginRound() {
    this.stage = ROUNDS[this.roundIdx];
    this.hp = this.maxHp;
    this.populate(this.stage);
    this.player = new Player(this.stage.start.x, this.stage.start.y);
    this.camX = 0; this.camY = Math.max(0, this.stage.g.h * TILE - VIEW_H);
    this.lastSafe = { x: this.stage.start.x, y: this.stage.start.y };
    this.bossOn = false;
    this.clearing = false; this.clearT = 0;
    this.freezeT = 0;
    this.shake = 0;
    this.bonusInfo = null;
    this.paused = false;
    this.state = 'round';
    this.roundT = 0;
    this.sound.stopMusic();
  }

  populate(stage) {
    this.enemies = [];
    this.items = [];
    this.ebullets = [];
    this.effects = [];
    this.texts = [];
    for (const s of stage.spawns) {
      if (ENEMY_TYPES.has(s.t)) {
        const e = spawnEnemy(this, s.t, 0, 0, s.side ? { side: s.side } : {});
        e.x = s.x * TILE; e.x0 = e.x;
        e.y = s.row * TILE - e.h; e.y0 = e.y;
      } else {
        const it = spawnItem(this, s.t, 0, 0, s.room ? { room: s.room } : {});
        it.x = s.x * TILE + (TILE - it.w) / 2;
        it.y = s.row * TILE - it.h - (it.fixed ? 0 : 4);
        if (s.t === 'geyser') { it.x = s.x * TILE + 1; it.y = s.row * TILE - it.h; }
        if (s.t === 'door' || s.t === 'goal') it.y = s.row * TILE - it.h;
      }
    }
  }

  enterPlay() {
    this.state = 'play';
    this.banner = `ROUND ${this.roundIdx + 1}  ${THEMES[this.stage.theme].name}`;
    this.bannerT = 150;
    this.sound.playMusic(THEMES[this.stage.theme].music);
  }

  // ---------------- helpers used by entities ----------------

  addScore(n) {
    this.score += n;
  }

  addSmiley() {
    this.smileys++;
    this.addScore(100);
    this.sound.blip();
    if (this.smileys % 50 === 0) { this.lives++; this.sound.oneUp(); this.addEffectText('1UP!', this.player.x, this.player.y - 10); }
  }

  collectItem(t) {
    if (t === 'smiley') this.addSmiley();
    else if (t === 'fruit') { this.addScore(1000); this.sound.fruit(); this.addEffectText('1000', this.player.x, this.player.y - 8); }
    else if (t === 'heart') { this.hp = Math.min(this.maxHp, this.hp + 2); this.sound.heart(); }
    else if (t === 'heartcont') {
      this.maxHp = Math.min(10, this.maxHp + 2);
      this.hp = this.maxHp;
      this.sound.bigHeart();
      this.addEffectText('HEART UP!', this.player.x - 10, this.player.y - 12);
    } else if (t === 'meat1') this.eatMeat(1);
    else if (t === 'meat2') this.eatMeat(2);
  }

  spawnItem(t, x, y) { const it = spawnItem(this, t, x, y); it.fixed = false; return it; }

  addEffectText(str, x, y) { this.texts.push({ str, x, y, t: 0 }); }

  rampage() { return this.player && this.player.meat === 2; }

  // MEAT POWER-UP — freeze-frame flex, then angry or full rampage
  eatMeat(size) {
    const P = this.player;
    this.freezeT = 45;
    this.addScore(500);
    this.sound.meatFanfare(size === 2);
    if (size === 2) {
      P.meat = 2; P.meatT = 480; // 8s INVINCIBLE RAMPAGE
      this.sound.playMusic('rampage');
    } else if (P.meat !== 2) {
      P.meat = 1; P.meatT = 600; // 10s angry Bonk
    }
  }

  endMeat() {
    const P = this.player;
    if (P.meat === 2 && !this.clearing) this.sound.playMusic(this.bossOn ? 'boss' : THEMES[this.stage.theme].music);
    P.meat = 0; P.meatT = 0;
  }

  // diving headbutt met the ground: SHOCKWAVE
  groundPound(P) {
    const fx = P.x + P.w / 2, fy = P.y + P.h;
    this.effects.push({ kind: 'shock', x: fx, y: fy, t: 0 });
    this.shake = Math.max(this.shake, 6);
    this.sound.shock();
    for (const e of this.enemies) {
      if (e.fly || e.t === 'king') continue;
      if (Math.abs(e.x + e.w / 2 - fx) < 70 && Math.abs(e.y + e.h - fy) < 40) {
        e.stun = Math.max(e.stun, e.t === 'grub' ? 80 : 160);
        this.sound.stunDing();
      }
    }
  }

  hurtPlayer(dmg = 1) {
    const P = this.player;
    if (P.dead || P.invuln > 0 || P.meat === 2) return;
    this.hp -= dmg;
    P.hurtT = 22;
    this.sound.hurt();
    if (P.meat === 1) {
      P.invuln = 70; // angry Bonk shrugs off knock-back
    } else {
      P.invuln = 90;
      P.stunT = Math.max(P.stunT, 13);
      P.kb = -P.face * 1.9;
      P.vy = -2.4;
      P.onGround = false;
      P.dive = false; P.climb = false;
    }
    if (this.hp <= 0) this.killPlayer();
  }

  killPlayer() {
    const P = this.player;
    if (P.dead) return;
    P.dead = true; P.deadT = 0;
    P.meat = 0; P.meatT = 0;
    this.sound.die();
    this.sound.stopMusic();
  }

  respawn() {
    this.lives--;
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.goSel = 0;
      this.saveHiscore();
      return;
    }
    if (this.bonusInfo) this.exitBonus();
    const p = new Player(this.lastSafe.x, this.lastSafe.y - 4);
    p.invuln = 130;
    this.player = p;
    this.hp = this.maxHp;
    this.sound.playMusic(this.bossOn ? 'boss' : THEMES[this.stage.theme].music);
  }

  saveHiscore() {
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
      try { localStorage.setItem(HISCORE_KEY, String(this.hiscore)); } catch { /* private mode */ }
    }
  }

  // ---------------- bonus rooms ----------------

  enterBonus(room, door) {
    const P = this.player;
    this.bonusInfo = {
      timer: 0,
      saved: {
        stage: this.stage, enemies: this.enemies, items: this.items.filter((i) => i !== door),
        ebullets: this.ebullets, px: door.x, py: door.y + door.h - P.h,
        music: this.sound.trackName,
      },
    };
    const b = buildBonus(room);
    this.stage = b;
    this.bonusInfo.timer = b.time;
    this.bonusTitle = b.title; this.bonusTitleT = 100;
    this.enemies = []; this.ebullets = []; this.effects = [];
    this.items = [];
    for (const s of b.spawns) {
      const it = spawnItem(this, s.t, 0, 0);
      it.x = s.x * TILE + (TILE - it.w) / 2;
      it.y = s.row * TILE - it.h - (it.fixed ? 0 : 4);
    }
    P.x = b.start.x; P.y = b.start.y;
    P.vx = 0; P.vy = 0; P.dive = P.spin = P.climb = P.swim = false;
    this.sound.doorway();
    this.sound.playMusic('bonus');
  }

  exitBonus() {
    const s = this.bonusInfo.saved;
    this.stage = s.stage;
    this.enemies = s.enemies; this.items = s.items; this.ebullets = s.ebullets;
    const P = this.player;
    P.x = s.px; P.y = s.py; P.vx = 0; P.vy = 0;
    P.dive = P.spin = P.climb = P.swim = false;
    this.bonusInfo = null;
    this.sound.doorway();
    this.sound.playMusic(s.music || THEMES[this.stage.theme].music);
  }

  // ---------------- bosses ----------------

  onKingDown(e) {
    this.shake = 16;
    this.sound.bossDie();
    this.addEffectText('THE CROWN CRACKS!', e.x - 20, e.y - 16);
    for (let i = 0; i < 5; i++) this.effects.push({ kind: 'poof', x: e.x + 8 + i * 9, y: e.y + 10 + (i % 3) * 12, t: -i * 3 });
    this.roundClear();
  }

  roundClear() {
    if (this.clearing) return;
    this.clearing = true;
    this.clearT = 170;
    this.addScore(2000);
    this.sound.stopMusic();
    this.sound.clearJingle();
    this.saveHiscore();
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

    // MEAT freeze-frame: he flexes, the world holds its breath
    if (this.freezeT > 0) { this.freezeT--; return; }

    P.update(this, inp);

    // meat timer
    if (P.meatT > 0) {
      P.meatT--;
      if (P.meatT <= 0) this.endMeat();
    }

    const st = this.stage;
    const W = st.g.w * TILE, H = st.g.h * TILE;

    // boss trigger + arena lock
    if (!this.bonusInfo && st.bossX && !this.bossOn && !this.clearing && P.x > st.bossX * TILE) {
      this.bossOn = true;
      this.sound.playMusic('boss');
      this.sound.roar();
      this.addEffectText('KING MOORE-DROOL III', P.x - 30, P.y - 40);
    }
    if (this.bossOn && !this.clearing) P.x = Math.max(P.x, st.bossX * TILE - 24);

    // camera
    let cx = P.x - 122;
    if (this.bossOn) cx = Math.max(cx, st.bossX * TILE - 30);
    this.camX = Math.max(0, Math.min(cx, W - VIEW_W));
    this.camY = Math.max(0, Math.min(P.y - 120, H - VIEW_H));

    // safe respawn spot
    if (!P.dead && P.onGround && P.groundTile !== T.PLAT) {
      this.lastSafe = { x: P.x, y: P.y };
    }

    // fell off the world
    if (!P.dead && P.y > H + 30) { this.hp = 0; this.killPlayer(); }
    if (P.dead && P.deadT > 75) this.respawn();

    updateEnemies(this);
    updateEBullets(this);
    updateItems(this, inp);

    // ---- Bonk vs enemies ----
    if (!P.dead) {
      const hb = P.hitbox();
      const db = P.divebox();
      const bb = P.buttbox();
      for (const e of this.enemies) {
        if (e.gone) continue;
        // DIVING HEADBUTT — bounce chains
        if (P.dive && P.vy > 0 && overlap(db, e)) {
          if (e.t === 'shell' && e.flip <= 0) {
            // the shell-back is a living bounce pad
            this.bounce(P, -7.2, e);
            this.sound.boing();
          } else if (e.t === 'spiky' && e.stun <= 0 && P.meat < 2) {
            this.hurtPlayer(1);
          } else if (e.t === 'king') {
            if (db.y + db.h < e.y + 18) { // THE CROWN — his only weak point
              damageEnemy(this, e, 1);
              this.bounce(P, -6.4, e);
              this.sound.bonk();
              this.shake = Math.max(this.shake, 5);
            } else {
              P.vy = -5; P.dive = false; P.onGround = false; P.graceT = 12;
              this.sound.bonk();
            }
          } else {
            damageEnemy(this, e, P.meat > 0 ? 4 : 2);
            this.bounce(P, -(4.4 + Math.min(P.chain, 6) * 0.35), e);
            this.sound.bonk();
          }
          continue;
        }
        // standing headbutt
        if (P.buttActive() && P.buttHit && !P.buttHit.has(e) && overlap(bb, e)) {
          P.buttHit.add(e);
          if (e.t === 'spiky' && e.stun <= 0 && P.meat < 2) this.hurtPlayer(1);
          else if (e.t === 'king') this.sound.stunDing(); // clang — only the crown cracks
          else {
            damageEnemy(this, e, P.meat === 1 ? 2 : 1);
            this.sound.bonk();
          }
          continue;
        }
        // touching
        if (!P.dive && P.graceT <= 0 && e.stun <= 0 && overlap(e, hb)) {
          if (P.meat === 2 && e.t !== 'king') damageEnemy(this, e, 99); // RAMPAGE: touch kills
          else if (P.meat < 2) this.hurtPlayer(1);
        }
      }
      // enemy shots
      for (const b of this.ebullets) {
        if (overlap(b, hb)) {
          b.gone = true;
          if (P.meat !== 2) this.hurtPlayer(1);
        }
      }
    }

    // effects & floaty text
    for (const fx of this.effects) fx.t++;
    this.effects = this.effects.filter((fx) => fx.t < 16);
    for (const tx of this.texts) { tx.t++; tx.y -= 0.4; }
    this.texts = this.texts.filter((tx) => tx.t < 70);
    if (this.shake > 0) this.shake--;

    // bonus room timer
    if (this.bonusInfo) {
      this.bonusInfo.timer--;
      if (this.bonusTitleT > 0) this.bonusTitleT--;
      const t = this.bonusInfo.timer;
      if (t <= 180 && t % 60 === 0) this.sound.tick();
      if (t <= 0) this.exitBonus();
    }

    // round clear sequence
    if (this.clearing) {
      this.clearT--;
      if (this.clearT <= 0) {
        this.roundIdx++;
        if (this.roundIdx >= ROUNDS.length) {
          this.state = 'ending';
          this.storyT = 0;
          this.saveHiscore();
          this.sound.playMusic('ending');
        } else {
          this.beginRound();
        }
      }
    }
  }

  bounce(P, v, e) {
    P.vy = v - Math.min(P.chain, 5) * 0.15; // slight height gain per chain
    P.onGround = false;
    P.dive = false;
    P.graceT = 12;
    P.chain++;
    P.airJump = true; // each bounce restores the jump
    this.addScore(100 * P.chain);
    if (P.chain >= 2) this.addEffectText(`${P.chain} CHAIN!`, e.x, e.y - 12);
  }

  // ---------------- rendering ----------------

  drawBackground() {
    const th = THEMES[this.stage.theme];
    ctx.fillStyle = th.sky0;
    ctx.fillRect(0, 0, VIEW_W, 110);
    ctx.fillStyle = th.sky1;
    ctx.fillRect(0, 110, VIEW_W, VIEW_H - 110);
    const k = this.stage.key;
    if (k === 'grass') {
      // puffy clouds + a long-necked friend in the distance
      ctx.fillStyle = '#f8f8ff';
      for (let i = 0; i < 4; i++) {
        const wx = ((i * 90 - this.camX * 0.2) % (VIEW_W + 60) + VIEW_W + 60) % (VIEW_W + 60) - 30;
        ctx.fillRect(wx, 24 + i * 14, 34, 8);
        ctx.fillRect(wx + 6, 20 + i * 14, 20, 6);
      }
      ctx.fillStyle = '#58a848';
      for (let i = 0; i < 10; i++) {
        const wx = ((i * 60 - this.camX * 0.4) % (VIEW_W + 80) + VIEW_W + 80) % (VIEW_W + 80) - 40;
        ctx.beginPath(); ctx.arc(wx, 176, 40, Math.PI, 0); ctx.fill();
      }
      // brontosaurus silhouette ambling by
      const bx = ((-this.camX * 0.3) % 500 + 500) % 500 - 120;
      ctx.fillStyle = '#3a7838';
      ctx.beginPath(); ctx.ellipse(bx + 30, 158, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(bx + 44, 128, 6, 32);
      ctx.beginPath(); ctx.arc(bx + 49, 126, 5, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'falls') {
      // the great waterfall, thundering behind everything
      for (let x = 88; x < 200; x += 8) {
        const ph = ((this.frame * 3 + x * 5 + this.camY) >> 4) % 2;
        ctx.fillStyle = ph ? '#3068a8' : '#3d7cc0';
        ctx.fillRect(x, 0, 8, VIEW_H);
      }
      ctx.fillStyle = '#a8d8f8';
      for (let i = 0; i < 8; i++) {
        const yy = ((i * 67 + this.frame * 4) % (VIEW_H + 20)) - 10;
        ctx.fillRect(96 + ((i * 41) % 96), yy, 2, 9);
      }
    } else if (k === 'lava') {
      ctx.fillStyle = '#601810';
      for (let i = 0; i < 6; i++) {
        const wx = ((i * 90 - this.camX * 0.3) % (VIEW_W + 100) + VIEW_W + 100) % (VIEW_W + 100) - 50;
        ctx.beginPath();
        ctx.moveTo(wx, 180); ctx.lineTo(wx + 40, 90 + (i % 3) * 16); ctx.lineTo(wx + 80, 180);
        ctx.fill();
      }
      ctx.fillStyle = (this.frame >> 4) % 2 ? '#f88800' : '#f8d800';
      for (let i = 0; i < 8; i++) {
        const wx = (i * 73 + ((this.frame * (1 + i % 3)) >> 1)) % VIEW_W;
        ctx.fillRect(wx, (i * 47 + this.frame) % 90, 2, 2);
      }
    } else if (k === 'ice') {
      // aurora
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['rgba(120,248,180,0.25)', 'rgba(120,180,248,0.25)', 'rgba(248,180,248,0.2)'][i];
        for (let x = 0; x < VIEW_W; x += 8) {
          const yy = 26 + i * 16 + Math.sin((x + this.frame * 1.2 + i * 40) / 30) * 8;
          ctx.fillRect(x, yy, 8, 12);
        }
      }
      ctx.fillStyle = '#d8e8f8';
      for (let i = 0; i < 7; i++) {
        const wx = ((i * 80 - this.camX * 0.35) % (VIEW_W + 120) + VIEW_W + 120) % (VIEW_W + 120) - 60;
        ctx.beginPath();
        ctx.moveTo(wx, 180); ctx.lineTo(wx + 45, 100); ctx.lineTo(wx + 90, 180);
        ctx.fill();
      }
    } else if (k === 'moon') {
      // stars + the old planet hanging above the palace
      ctx.fillStyle = '#f8f8f8';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 61) % VIEW_W, sy = (i * 47) % 200;
        if ((i + (this.frame >> 4)) % 9) ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.fillStyle = '#68c0f8';
      ctx.beginPath(); ctx.arc(200, 46, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#58a848';
      ctx.beginPath(); ctx.arc(194, 42, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(208, 52, 6, 0, Math.PI * 2); ctx.fill();
      // palace columns
      ctx.fillStyle = '#382858';
      for (let i = 0; i < 6; i++) {
        const wx = ((i * 70 - this.camX * 0.4) % (VIEW_W + 80) + VIEW_W + 80) % (VIEW_W + 80) - 40;
        ctx.fillRect(wx, 90, 16, 110);
        ctx.fillRect(wx - 4, 84, 24, 8);
      }
    } else if (k === 'bonus') {
      ctx.fillStyle = '#f8e888';
      ctx.beginPath(); ctx.arc(128, 30, 20, 0, Math.PI * 2); ctx.fill();
      drawBigHead(ctx, 128, 30, 14, 'grin', this.frame);
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
        const sx = tx * TILE - this.camX, sy = ty * TILE - this.camY;
        const above = tileAt(g, tx, ty - 1);
        const topOpen = t === T.WATER ? above !== T.WATER : above !== t && above !== T.SOLID;
        drawTile(ctx, t, this.stage.theme, sx, sy, this.frame, topOpen);
      }
    }
  }

  drawHUD() {
    const P = this.player;
    // hearts (halves)
    for (let i = 0; i < this.maxHp / 2; i++) {
      const hx = 6 + i * 11, hy = 5;
      const fill = Math.max(0, Math.min(2, this.hp - i * 2));
      ctx.fillStyle = '#402028';
      ctx.fillRect(hx, hy, 9, 8);
      if (fill > 0) {
        ctx.fillStyle = '#f83048';
        ctx.fillRect(hx, hy, fill === 2 ? 9 : 4, 8);
      }
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(hx + 1, hy + 1, 2, 2);
    }
    // smileys
    drawSprite(ctx, 'i_smiley', 6, 17);
    text(ctx, `x${this.smileys}`, 18, 18, '#f8d800');
    // lives (little Bonk heads)
    drawBigHead(ctx, 11, 37, 5, 'grin', 0);
    text(ctx, `x${this.lives}`, 20, 33, '#f8f8f8');
    // score / hi-score
    text(ctx, String(this.score).padStart(6, '0'), 250, 5, '#f8f8f8', 8, 'right');
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, 250, 15, '#a8a8c0', 7, 'right');
    // MEAT timer
    if (P.meat > 0) {
      const total = P.meat === 2 ? 480 : 600;
      drawSprite(ctx, P.meat === 2 ? 'i_meat2' : 'i_meat1', 108, 5);
      ctx.fillStyle = '#402028';
      ctx.fillRect(107, 16, 34, 4);
      ctx.fillStyle = P.meat === 2 ? ((this.frame >> 2) % 2 ? '#f8f8f8' : '#f88800') : '#f88800';
      ctx.fillRect(107, 16, Math.ceil(34 * P.meatT / total), 4);
    }
    // bonus timer
    if (this.bonusInfo) {
      const sec = Math.ceil(this.bonusInfo.timer / 60);
      text(ctx, `TIME ${sec}`, VIEW_W / 2, 5, sec <= 3 ? '#f83048' : '#f8f8f8', 10, 'center');
    }
    // dive-bounce combo
    if (P.chain >= 2) text(ctx, `${P.chain} BOUNCE!`, VIEW_W / 2, 26, '#f8d800', 9, 'center');
  }

  drawPlay() {
    ctx.save();
    if (this.shake > 0) ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    this.drawBackground();
    this.drawTiles();
    drawItems(this, ctx, this.frame);
    drawEnemies(this, ctx, this.frame);
    if (this.freezeT > 0) {
      // MEAT freeze-frame — the flex
      const P = this.player;
      if (this.freezeT > 39) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      drawSprite(ctx, (this.frame % 4 < 2 ? 'hot_' : '') + 'b_flex', P.x - 3 - this.camX, P.y - this.camY, P.face < 0);
      text(ctx, 'MEAT!', P.x - this.camX + 3, P.y - 14 - this.camY, '#f83048', 10, 'center');
    } else {
      this.player.draw(ctx, { x: this.camX, y: this.camY }, this.frame);
    }
    drawEBullets(this, ctx);
    for (const fx of this.effects) {
      if (fx.t < 0) continue;
      if (fx.kind === 'poof') drawPoof(ctx, fx.x - this.camX, fx.y - this.camY, fx.t);
      else if (fx.kind === 'shock') drawShockwave(ctx, fx.x - this.camX, fx.y - this.camY, fx.t);
    }
    for (const tx of this.texts) {
      if (tx.t % 8 < 6) text(ctx, tx.str, tx.x - this.camX, tx.y - this.camY, '#f8f8f8', 8);
    }
    ctx.restore();

    // RAMPAGE screen flash
    if (this.rampage()) {
      ctx.fillStyle = (this.frame >> 2) % 2 ? 'rgba(248,136,0,0.14)' : 'rgba(248,248,255,0.10)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    this.drawHUD();
    if (this.bannerT > 0) {
      this.bannerT--;
      if (this.bannerT > 30 || this.frame % 8 < 5) {
        text(ctx, this.banner, VIEW_W / 2, 60, '#f8d800', 9, 'center');
      }
    }
    if (this.bonusTitleT > 0 && this.bonusInfo) {
      text(ctx, this.bonusTitle, VIEW_W / 2, 48, '#f83048', 8, 'center');
    }
    if (this.clearing && this.clearT < 140) {
      text(ctx, this.roundIdx === ROUNDS.length - 1 ? 'KINGDOM SAVED!' : 'ROUND CLEAR!', VIEW_W / 2, 96, '#f8f8f8', 12, 'center');
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 104, '#f8f8f8', 12, 'center');
    }
  }

  // ---------------- title ----------------

  drawTitle() {
    ctx.fillStyle = '#68c0f8';
    ctx.fillRect(0, 0, VIEW_W, 150);
    ctx.fillStyle = '#a8e0f8';
    ctx.fillRect(0, 150, VIEW_W, 30);
    ctx.fillStyle = '#f8d800';
    ctx.beginPath(); ctx.arc(216, 34, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#58a848';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); ctx.arc(i * 34, 190, 34, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#40b048';
    ctx.fillRect(0, 188, VIEW_W, 40);

    // Bonk's HUGE head, front and center
    const bob = Math.sin(this.frame / 24) * 3;
    drawBigHead(ctx, 128, 118 + bob, 46, 'grin', this.frame);

    text(ctx, "BONK'S", VIEW_W / 2 + 1, 15, '#a01818', 26, 'center');
    text(ctx, "BONK'S", VIEW_W / 2, 14, '#f8d800', 26, 'center');
    text(ctx, 'MOORE-VENTURE', VIEW_W / 2 + 1, 43, '#a01818', 15, 'center');
    text(ctx, 'MOORE-VENTURE', VIEW_W / 2, 42, '#f8f8f8', 15, 'center');

    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP BONK TO START' : 'PUSH ENTER OR X', VIEW_W / 2, 178, '#f8f8f8', 9, 'center');
    }
    text(ctx, `HI ${String(this.hiscore).padStart(6, '0')}`, VIEW_W / 2, 196, '#183018', 8, 'center');
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 210, '#245024', 8, 'center');
  }

  updateTitle() {
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('bonk') || inp.pressed('jump')) {
      this.startRun();
    }
  }

  // ---------------- round intro card ----------------

  drawRound() {
    ctx.fillStyle = '#101020';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const th = THEMES[this.stage.theme];
    text(ctx, `ROUND ${this.roundIdx + 1}`, VIEW_W / 2, 48, '#f8d800', 16, 'center');
    text(ctx, th.name, VIEW_W / 2, 74, '#f8f8f8', 12, 'center');
    drawBigHead(ctx, 128, 130, 26, 'grin', this.frame);
    text(ctx, this.stage.tag, VIEW_W / 2, 172, '#a8a8c0', 8, 'center');
    text(ctx, `BONK x${this.lives}`, VIEW_W / 2, 194, '#f8f8f8', 9, 'center');
  }

  updateRound() {
    this.roundT++;
    if (this.roundT > 24 && (this.input.pressed('bonk') || this.input.pressed('start') || this.input.pressed('jump'))) {
      this.enterPlay();
    }
    if (this.roundT > 190) this.enterPlay();
  }

  // ---------------- game over / ending ----------------

  drawGameOver() {
    ctx.fillStyle = '#101020';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawBigHead(ctx, 128, 78, 36, 'cry', this.frame); // Bonk crying
    text(ctx, 'GAME OVER', VIEW_W / 2, 126, '#f83048', 16, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 148, '#f8f8f8', 8, 'center');
    if (this.continues > 0) {
      text(ctx, `${this.goSel === 0 ? '>' : ' '} CONTINUE (${this.continues})`, VIEW_W / 2 - 10, 172, '#f8f8f8', 9, 'center');
      text(ctx, `${this.goSel === 1 ? '>' : ' '} END`, VIEW_W / 2 - 10, 186, '#f8f8f8', 9, 'center');
    } else {
      text(ctx, 'NO CONTINUES REMAIN', VIEW_W / 2, 172, '#99a', 8, 'center');
      if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 188, '#f8f8f8', 8, 'center');
    }
  }

  updateGameOver() {
    const inp = this.input;
    if (this.continues > 0) {
      if (inp.pressed('up') || inp.pressed('down')) this.goSel = 1 - this.goSel;
      if (inp.pressed('start') || inp.pressed('bonk') || inp.pressed('jump')) {
        if (this.goSel === 0) {
          this.continues--;
          this.lives = 3;
          this.beginRound();
        } else {
          this.state = 'title';
        }
      }
    } else if (inp.pressed('start') || inp.pressed('bonk')) {
      this.state = 'title';
    }
  }

  drawEnding() {
    this.storyT++;
    // warm sunset over the smiley sea
    ctx.fillStyle = '#f88850';
    ctx.fillRect(0, 0, VIEW_W, 140);
    ctx.fillStyle = '#f8b878';
    ctx.fillRect(0, 100, VIEW_W, 40);
    const rise = Math.min(56, this.storyT / 6);
    ctx.fillStyle = '#f8d800';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 196 - rise, 34, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#4888d8';
    ctx.fillRect(0, 140, VIEW_W, 84);
    // smileys raining from a saved sky
    for (let i = 0; i < 10; i++) {
      const sx = (i * 53) % VIEW_W;
      const sy = ((i * 91 + this.storyT * (1 + (i % 3))) % 250) - 10;
      drawSprite(ctx, 'i_smiley', sx, sy);
    }
    drawBigHead(ctx, 128, 120, 34, 'grin', this.frame);
    text(ctx, 'PLANET MOOREWORLD IS SAVED!', VIEW_W / 2, 14, '#f8f8f8', 10, 'center');
    if (this.storyT > 90) text(ctx, 'KING MOORE-DROOL III LOST HIS CROWN.', VIEW_W / 2, 32, '#fff0d8', 8, 'center');
    if (this.storyT > 150) text(ctx, 'THE SMILEYS SMILE AGAIN.', VIEW_W / 2, 44, '#fff0d8', 8, 'center');
    if (this.storyT > 210) {
      text(ctx, 'THE END — BONK ON!', VIEW_W / 2, 168, '#f8d800', 12, 'center');
      text(ctx, `FINAL SCORE ${String(this.score).padStart(6, '0')}`, VIEW_W / 2, 190, '#f8f8f8', 8, 'center');
      text(ctx, `SMILEYS ${this.smileys}`, VIEW_W / 2, 202, '#f8d800', 8, 'center');
    }
  }

  updateEnding() {
    if (this.storyT > 240 && (this.input.pressed('start') || this.input.pressed('bonk'))) {
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
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'gameover': this.updateGameOver(); this.drawGameOver(); break;
      case 'ending': this.updateEnding(); this.drawEnding(); break;
    }
    this.input.endFrame();
  }
}

initSprites();
const game = new Game();
window.__game = game; // for smoke tests
window.__spawnEnemy = (t, x, y, o) => spawnEnemy(game, t, x, y, o);
window.__spawnItem = (t, x, y, o) => spawnItem(game, t, x, y, o);

let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 1000 / 61) return;
  last = ts;
  game.tick();
}
requestAnimationFrame(loop);
