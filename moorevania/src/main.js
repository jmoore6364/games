// Moorevania II: Jason's Quest — main loop, states, UI.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { drawSprite, drawTile, drawBG, SPR } from './sprites.js';
import {
  TILE, ZONES, findGround, ITEMS, SHOPS, SUBS, WHIPS, RELICS,
  LEVELS, maxHpFor, atkMult, STORY, ENDING,
} from './world.js';
import {
  rects, Player, spawnEnemy, damageEnemy, updateEnemy, drawEnemy,
  updateProj, drawProj, projRect,
} from './entities.js';

const VIEW_W = 384, VIEW_H = 240;
const DAY_LEN = 120 * 60, NIGHT_LEN = 85 * 60;
const SAVE_KEY = 'moorevania2-save';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.max(1, Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H));
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
    this.titleSel = 0;
    this.storyPage = 0;
    this.banner = [];
    this.shake = 0;
    this.flash = 0;
    this.fade = 0;   // >0: fading, executes pendingWarp at peak
    this.hasSave = !!localStorage.getItem(SAVE_KEY);
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- save / new game ----------------

  freshSave() {
    return {
      lvl: 1, exp: 0, hearts: 30,
      hp: maxHpFor(1),
      whip: 0, subs: [], sub: null,
      items: { stake: 0, tonic: 0, laurel: 0, garlic: 0, ash: 0 },
      relics: [],
      flags: {},
    };
  }

  writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); this.hasSave = true; } catch { /* ignore */ }
  }

  startGame(fromSave) {
    this.save = fromSave ? JSON.parse(localStorage.getItem(SAVE_KEY)) : this.freshSave();
    if (!this.save.items) this.save.items = { stake: 0, tonic: 0, laurel: 0, garlic: 0, ash: 0 };
    if (this.save.items.garlic === undefined) this.save.items.garlic = 0; // pre-1.1 saves
    if (this.save.items.ash === undefined) this.save.items.ash = 0; // pre-1.2 saves
    this.player = new Player();
    this.clock = 0;
    this.nightBlend = 0;
    this.loadZone('hollow', 20);
    this.save.hp = maxHpFor(this.save.lvl);
    this.state = 'play';
    this.showBanner('DOLEFUL HOLLOW');
  }

  // ---------------- zone management ----------------

  loadZone(id, tx, ty) {
    const z = ZONES[id];
    this.zone = z;
    this.grid = z.map.map((r) => r.split(''));
    this.enemies = [];
    this.projs = [];
    this.pickups = [];
    this.parts = [];
    this.npcs = [];
    this.bossActive = null;
    this.bossRoom = null;
    this.spawnTimer = 0;

    for (const [type, sx, sy] of z.spawns) {
      const gy = sy !== undefined ? sy : findGround(z, sx) - 1;
      this.enemies.push(spawnEnemy(this, type, sx, gy));
    }
    for (const n of z.npcs || []) {
      this.npcs.push({ ...n, y: findGround(z, n.x) * TILE });
    }
    // doors resolved to pixel positions
    this.doors = (z.doors || []).map((d) => {
      const gy = findGround(z, d.x);
      return { ...d, px: d.x * TILE, py: gy * TILE };
    });
    // boss loot persists after the boss dies until it is claimed
    const b = z.boss;
    if (b && this.save.flags['boss_' + z.id]) {
      if (b.relic && !this.save.relics.includes(b.relic)) {
        this.pickups.push({ kind: 'orb', x: b.orbX * TILE + 2, y: b.orbY * TILE + 4, vy: 0, ttl: 1e9, relic: b.relic });
      }
      if (b.drop === 'amulet' && !this.save.flags.amulet) {
        this.pickups.push({ kind: 'amulet', x: b.orbX * TILE + 3, y: b.orbY * TILE + 6, vy: 0, ttl: 1e9 });
      }
    }
    // treasure chests
    (z.chests || []).forEach((c, i) => {
      if (!this.save.flags[`chest_${z.id}_${i}`]) {
        this.pickups.push({ kind: 'chest', x: c.x * TILE + 2, y: c.y * TILE + 7, vy: 0, ttl: 1e9, contents: c.contents, flag: `chest_${z.id}_${i}` });
      }
    });
    this.fairy = null;
    this.garlicSpot = null;

    if (tx !== undefined) {
      const gy = ty !== undefined ? ty : findGround(z, tx);
      this.player.x = tx * TILE + 3;
      this.player.y = gy * TILE - this.player.h - 0.1;
      this.player.vx = 0; this.player.vy = 0;
      this.player.lastSafe = { x: this.player.x, y: this.player.y };
      this.player.state = this.player.state === 'dead' ? 'dead' : 'normal';
    }
    this.updateCamera(true);
  }

  warp(id, tx, ty) {
    this.pendingWarp = { id, tx, ty };
    this.fade = 30;
    this.sound.door();
  }

  tile(tx, ty) {
    if (tx < 0) return this.zone.left ? '.' : '#';
    if (tx >= this.zone.w) return this.zone.right ? '.' : '#';
    if (ty < 0 || ty >= this.zone.h) return '.';
    return this.grid[ty][tx];
  }

  setTile(tx, ty, ch) {
    if (tx >= 0 && tx < this.zone.w && ty >= 0 && ty < this.zone.h) this.grid[ty][tx] = ch;
  }

  // ---------------- helpers used by entities ----------------

  get night() {
    return (this.clock % (DAY_LEN + NIGHT_LEN)) >= DAY_LEN;
  }

  addProj(pr) { this.projs.push(pr); }

  addPickup(kind, x, y) {
    this.pickups.push({ kind, x: x - 4, y: y - 4, vy: -1.5, ttl: 600 });
  }

  burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x, y,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.7) * 3,
        ttl: 20 + Math.random() * 16, color,
      });
    }
  }

  spark(x, y, color) {
    this.parts.push({ x, y, vx: (Math.random() - 0.5), vy: -0.4, ttl: 12, color });
  }

  gainExp(n) {
    if (!n) return;
    this.save.exp += n;
    while (this.save.lvl < LEVELS.length && this.save.exp >= LEVELS[this.save.lvl]) {
      this.save.lvl++;
      this.save.hp = maxHpFor(this.save.lvl);
      this.sound.levelup();
      this.showBanner(`LEVEL ${this.save.lvl}! STRENGTH FLOWS INTO YOU.`);
      this.burst(this.player.x + 5, this.player.y + 10, 14, '#f8d048');
    }
  }

  throwSub() {
    const p = this.player, s = this.save;
    if (!s.sub) return;
    const def = SUBS[s.sub];
    const cap = s.sub === 'cross' ? 1 : 2;
    const alive = this.projs.filter((x) => x.owner === 'player' && x.kind !== 'flame' && !x.dead).length;
    if (alive >= cap) return;
    if (s.hearts < def.cost) { this.sound.deny(); return; }
    s.hearts -= def.cost;
    this.sound.throwSub();
    const px = p.x + p.w / 2, py = p.y + 6;
    const dmgBase = atkMult(s.lvl);
    if (s.sub === 'dagger') this.addProj({ kind: 'dagger', owner: 'player', x: px, y: py + 2, vx: p.dir * 3.4, vy: 0, dmg: 1.2 * dmgBase });
    if (s.sub === 'axe') this.addProj({ kind: 'axe', owner: 'player', x: px, y: py, vx: p.dir * 1.7, vy: -4.6, grav: true, dmg: 3 * dmgBase });
    if (s.sub === 'holywater') this.addProj({ kind: 'holywater', owner: 'player', x: px, y: py, vx: p.dir * 1.5, vy: -2.2, grav: true, dmg: 1.4 * dmgBase });
    if (s.sub === 'cross') this.addProj({ kind: 'cross', owner: 'player', x: px, y: py + 2, vx: p.dir * 2.9, vy: 0, dir: p.dir, dmg: 2 * dmgBase });
  }

  drown() {
    const p = this.player;
    if (p.state === 'dead') return;
    this.sound.hurt();
    this.save.hp -= 12;
    this.flash = 6;
    if (this.save.hp <= 0) {
      this.save.hp = 0;
      p.state = 'dead';
      p.deadT = 0;
      this.onPlayerDead();
      return;
    }
    const safe = p.lastSafe || { x: 32, y: 0 };
    p.x = safe.x; p.y = safe.y - 2;
    p.vx = 0; p.vy = 0;
    p.invuln = 80;
    p.state = 'normal';
  }

  onPlayerDead() {
    this.deathTimer = 110;
  }

  onBossDead(e) {
    const z = this.zone;
    this.shake = 14;
    if (e.type === 'vorlok') {
      // second form rises
      const d = spawnEnemy(this, 'demon', Math.floor((e.x + e.w / 2) / TILE), Math.floor((e.y + e.h) / TILE) - 1);
      d.vy = -4;
      this.enemies.push(d);
      this.showBanner('THE COUNT SHEDS HIS FLESH!');
      return;
    }
    this.bossActive = null;
    this.save.flags['boss_' + z.id] = true;
    if (z.boss && z.boss.drop === 'amulet') {
      this.pickups.push({ kind: 'amulet', x: z.boss.orbX * TILE + 3, y: z.boss.orbY * TILE + 6, vy: 0, ttl: 1e9 });
      this.showBanner('SOMETHING GLITTERS AMONG THE BONES...');
      this.writeSave();
      return;
    }
    if (e.type === 'demon') {
      this.save.flags.won = true;
      this.endTimer = 200;
      this.showBanner('COUNT VORLOK IS NO MORE.');
      this.writeSave();
      return;
    }
    if (z.boss && z.boss.relic) {
      this.pickups.push({ kind: 'orb', x: z.boss.orbX * TILE + 2, y: z.boss.orbY * TILE + 4, vy: 0, ttl: 1e9, relic: z.boss.relic });
      this.showBanner('A RELIC ORB APPEARS...');
    }
  }

  showBanner(t) { this.banner.push({ t, ttl: 170 }); }

  // ---------------- main update ----------------

  update() {
    const inp = this.input;
    inp.pollGamepad();
    this.frame++;
    if (inp.pressed('mute')) this.sound.toggleMute();

    switch (this.state) {
      case 'title': this.updateTitle(inp); break;
      case 'story': this.updateStory(inp); break;
      case 'play': this.updatePlay(inp); break;
      case 'pause': this.updatePause(inp); break;
      case 'map': this.updateMap(inp); break;
      case 'shop': this.updateShop(inp); break;
      case 'dialog': this.updateDialog(inp); break;
      case 'church': this.updateChurch(inp); break;
      case 'gameover': this.updateGameOver(inp); break;
      case 'ending': this.updateEnding(inp); break;
    }

    // music
    const s = this.sound;
    if (this.state === 'title') s.playMusic('title');
    else if (this.state === 'ending') s.playMusic('ending');
    else if (this.state === 'story') s.playMusic('title');
    else if (this.state === 'gameover') s.stopMusic();
    else if (this.zone) {
      if (this.bossActive) s.playMusic('boss');
      else if (this.zone.indoor) s.playMusic(this.zone.music === 'cata' ? 'cata' : 'manor');
      else if (this.night) s.playMusic('night');
      else s.playMusic(this.zone.music === 'town' || this.zone.music === 'port' ? this.zone.music : 'day');
    }
    s.updateMusic();
    inp.endFrame();
  }

  updateTitle(inp) {
    const opts = this.hasSave ? 2 : 1;
    if (inp.pressed('up') || inp.pressed('down')) this.titleSel = (this.titleSel + 1) % opts;
    if (inp.pressed('start') || inp.pressed('jump') || inp.pressed('whip')) {
      this.sound.pickup();
      if (this.hasSave && this.titleSel === 1) this.startGame(true);
      else { this.state = 'story'; this.storyPage = 0; }
    }
  }

  updateStory(inp) {
    if (inp.pressed('start') || inp.pressed('jump') || inp.pressed('whip')) {
      this.sound.text();
      this.storyPage++;
      if (this.storyPage >= STORY.length) this.startGame(false);
    }
  }

  updateEnding(inp) {
    this.endT++;
    if (inp.pressed('start') || inp.pressed('jump') || inp.pressed('whip')) {
      this.sound.text();
      this.storyPage++;
      if (this.storyPage >= ENDING.length + 1) {
        localStorage.removeItem(SAVE_KEY);
        this.hasSave = false;
        this.state = 'title';
        this.titleSel = 0;
      }
    }
  }

  updateGameOver(inp) {
    if (inp.pressed('start') || inp.pressed('jump')) {
      // Simon's Quest style: death keeps everything; wake at the church.
      this.save.hp = maxHpFor(this.save.lvl);
      this.player = new Player();
      this.clock = 0;
      this.loadZone('hollow', 18);
      this.state = 'play';
      this.writeSave();
      this.showBanner('YOU WAKE IN THE CHURCH, WHOLE AGAIN.');
    }
  }

  updatePlay(inp) {
    // fades / warps
    if (this.fade > 0) {
      this.fade--;
      if (this.fade === 15 && this.pendingWarp) {
        const w = this.pendingWarp;
        this.pendingWarp = null;
        this.loadZone(w.id, w.tx, w.ty);
        this.showBanner(this.zone.name);
      }
      return;
    }

    if (this.shake > 0) this.shake--;
    if (this.flash > 0) this.flash--;

    // death flow
    if (this.player.state === 'dead') {
      this.player.update(this, inp);
      if (--this.deathTimer <= 0) this.state = 'gameover';
      return;
    }

    // victory flow
    if (this.endTimer) {
      if (--this.endTimer <= 0) {
        this.endTimer = 0;
        this.state = 'ending';
        this.storyPage = 0;
        this.endT = 0;
        return;
      }
    }

    if (inp.pressed('start')) {
      this.state = 'pause';
      this.pauseSel = 0;
      this.sound.text();
      return;
    }

    // day / night clock (frozen indoors)
    if (!this.zone.indoor) {
      const cyc = DAY_LEN + NIGHT_LEN;
      const before = this.clock % cyc;
      this.clock++;
      const now = this.clock % cyc;
      if (before < DAY_LEN && now >= DAY_LEN) {
        this.sound.nightFall();
        this.showBanner('THE NIGHT DRAPES THE LAND IN A HORRIBLE CURSE...');
      }
      if (now < before) {
        this.sound.dawn();
        this.showBanner('THE MORNING SUN VANQUISHES THE HORRIBLE NIGHT.');
      }
      const ph = now < DAY_LEN
        ? Math.max(0, 1 - (Math.min(now, 180) / 180))                  // dawn fade out
        : Math.min(1, (now - DAY_LEN) / 180);                          // dusk fade in
      this.nightBlend = ph;
    }

    if (inp.pressed('sub')) this.throwSub();

    this.player.update(this, inp);
    const p = this.player;

    // edge exits
    if (p.x < -6 && this.zone.left) {
      const to = ZONES[this.zone.left];
      this.loadZone(this.zone.left, to.w - 2);
      this.showBanner(this.zone.name);
      return;
    }
    if (p.x + p.w > this.zone.w * TILE + 6 && this.zone.right) {
      this.loadZone(this.zone.right, 1);
      this.showBanner(this.zone.name);
      return;
    }
    p.x = Math.max(-6, Math.min(p.x, this.zone.w * TILE + 6 - p.w));

    // interactions (Up at doors / NPCs)
    if (inp.pressed('up') && p.grounded && p.state === 'normal') this.tryInteract();

    // boss trigger
    const zb = this.zone.boss;
    if (zb && !this.bossActive && !this.save.flags['boss_' + this.zone.id]) {
      const tr = zb.trigger;
      const tx = Math.floor((p.x + p.w / 2) / TILE);
      const ty = Math.floor((p.y + p.h - 1) / TILE);
      if (tx >= tr.x0 && tx <= tr.x1 && ty >= tr.y0 && ty <= tr.y1) {
        const boss = spawnEnemy(this, zb.type, zb.x, zb.y);
        boss.clampRoom = (g, e) => {
          e.x = Math.max(tr.x0 * TILE, Math.min(e.x, tr.x1 * TILE - e.w));
          e.y = Math.max(tr.y0 * TILE, Math.min(e.y, tr.y1 * TILE - e.h));
        };
        this.enemies.push(boss);
        this.bossActive = boss;
        this.showBanner(zb.type === 'vorlok' ? 'COUNT VORLOK RISES!' : 'SOMETHING GUARDS THE RELIC...');
      }
    }
    if (this.bossActive) {
      // track second form for the HP bar
      if (this.bossActive.dead) {
        const d = this.enemies.find((e) => e.boss && !e.dead);
        this.bossActive = d || null;
      }
    }

    // ambient spawner
    this.updateAmbient();

    // enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!e.clampRoom) e.clampRoom = () => {};
      updateEnemy(this, e);
      // contact damage (collapsed bone piles are harmless)
      if (!e.collapsed && rects({ x: e.x, y: e.y, w: e.w, h: e.h }, p.hurtbox())) {
        p.hurt(this, e.dmg, e.x + e.w / 2);
      }
      // despawn far-away ambient enemies
      if (e.ambient && Math.abs(e.x - p.x) > VIEW_W * 1.3) e.dead = true;
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // whip strikes
    const wb = p.whipbox(this);
    if (wb) this.applyWhip(wb);

    // projectiles
    for (const pr of this.projs) {
      updateProj(this, pr);
      if (pr.dead) continue;
      const r = projRect(pr);
      if (pr.owner === 'player') {
        for (const e of this.enemies) {
          if (e.dead || e.hitT > 4) continue;
          if (rects(r, { x: e.x, y: e.y, w: e.w, h: e.h })) {
            const tick = pr.kind === 'flame' ? (pr.t % 12 === 0) : true;
            if (tick && damageEnemy(this, e, pr.dmg)) {
              if (pr.kind === 'dagger' || pr.kind === 'holywater') pr.dead = true;
            }
          }
        }
      } else {
        if (rects(r, p.hurtbox())) {
          p.hurt(this, pr.dmg, pr.x);
          pr.dead = true;
        }
        // whip can destroy enemy shots
        if (wb && rects(r, wb)) {
          pr.dead = true;
          this.burst(pr.x, pr.y, 4, '#f8d048');
          this.sound.whipHit();
        }
      }
    }
    this.projs = this.projs.filter((x) => !x.dead);

    // pickups
    for (const pk of this.pickups) {
      pk.ttl--;
      if (pk.kind !== 'orb' && pk.kind !== 'chest') {
        pk.vy = Math.min((pk.vy || 0) + 0.15, 3);
        pk.y += pk.vy;
        const ty = Math.floor((pk.y + 8) / TILE);
        const tx = Math.floor((pk.x + 4) / TILE);
        const ch = this.tile(tx, ty);
        if (ch === '#' || ch === '%' || ch === '*' || ch === '=') { pk.y = ty * TILE - 8; pk.vy = 0; }
      }
      if (rects({ x: pk.x, y: pk.y, w: 9, h: 9 }, p.hurtbox())) this.takePickup(pk);
    }
    this.pickups = this.pickups.filter((x) => x.ttl > 0 && !x.dead);

    // particles
    for (const pt of this.parts) {
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.08; pt.ttl--;
    }
    this.parts = this.parts.filter((x) => x.ttl > 0);

    // the graveyard fairy, drawn to laid garlic
    if (this.fairy && this.garlicSpot) {
      const f = this.fairy;
      f.t++;
      f.x = this.garlicSpot.x + Math.sin(f.t / 12) * 8;
      f.y = this.garlicSpot.y - 130 + Math.min(112, f.t * 0.9);
      if ((this.frame & 3) === 0) this.spark(f.x, f.y + 8, '#c8f8f8');
      if (f.t > 210) {
        this.save.hearts = Math.min(999, this.save.hearts + 20);
        if (this.save.items.laurel < ITEMS.laurel.max) this.save.items.laurel++;
        this.sound.relic();
        this.burst(f.x, f.y, 16, '#c8f8f8');
        this.showBanner('A FAIRY! WEE INGA WAS RIGHT AFTER ALL!');
        this.fairy = null;
        this.garlicSpot = null;
      }
    }

    for (const b of this.banner) b.ttl--;
    this.banner = this.banner.filter((b) => b.ttl > 0);

    this.updateCamera();
  }

  applyWhip(wb) {
    const dmg = WHIPS[this.save.whip].dmg * atkMult(this.save.lvl);
    for (const e of this.enemies) {
      if (e.dead || e.hitT > 0 || e.collapsed > 0) continue;
      if (rects(wb, { x: e.x, y: e.y, w: e.w, h: e.h })) damageEnemy(this, e, dmg);
    }
    // candles & breakables
    const tx0 = Math.floor(wb.x / TILE), tx1 = Math.floor((wb.x + wb.w) / TILE);
    const ty0 = Math.floor(wb.y / TILE), ty1 = Math.floor((wb.y + wb.h) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = this.tile(tx, ty);
        if (ch === 't') {
          this.setTile(tx, ty, '.');
          this.sound.whipHit();
          this.burst(tx * TILE + 8, ty * TILE + 8, 4, '#f8b800');
          this.addPickup(Math.random() < 0.22 ? 'bigheart' : 'heart', tx * TILE + 8, ty * TILE + 6);
        } else if (ch === '*') {
          this.setTile(tx, ty, '.');
          this.sound.breakBlock();
          this.burst(tx * TILE + 8, ty * TILE + 8, 8, '#9a6a3a');
          if (Math.random() < 0.35) this.addPickup('heart', tx * TILE + 8, ty * TILE + 6);
        }
      }
    }
  }

  takePickup(pk) {
    const s = this.save;
    switch (pk.kind) {
      case 'heart': s.hearts = Math.min(999, s.hearts + 1); this.sound.heart(); break;
      case 'bigheart': s.hearts = Math.min(999, s.hearts + 5); this.sound.heart(); break;
      case 'tonic':
        if (s.items.tonic >= ITEMS.tonic.max) { s.hearts += 3; } else s.items.tonic++;
        this.sound.pickup();
        break;
      case 'laurel':
        if (s.items.laurel >= ITEMS.laurel.max) { s.hearts += 5; } else s.items.laurel++;
        this.sound.pickup();
        break;
      case 'amulet':
        s.flags.amulet = true;
        this.sound.relic();
        this.burst(pk.x + 5, pk.y + 4, 16, '#48c8d8');
        this.showBanner('THE MOON AMULET! THE NIGHT\'S TEETH ARE DULLED.');
        this.writeSave();
        break;
      case 'chest': {
        this.sound.relic();
        this.burst(pk.x + 6, pk.y + 4, 12, '#f8d048');
        if (pk.contents === 'cross' && !s.subs.includes('cross')) {
          s.subs.push('cross');
          if (!s.sub) s.sub = 'cross';
          this.showBanner('THE GOLDEN CROSS SLEEPS HERE NO MORE!');
        } else if (pk.contents === 'bell') {
          s.flags.bell = true;
          this.showBanner('A BRONZE BELL, GREEN WITH THE LAKE.');
          if (!s.flags.quest_bell) this.showBanner('SOMEONE IN VIRETON MUST MISS THIS.');
        } else {
          s.hearts = Math.min(999, s.hearts + 30);
          this.showBanner('A HOARD OF HEARTS!');
        }
        s.flags[pk.flag] = true;
        this.writeSave();
        break;
      }
      case 'orb': {
        if (s.items.stake > 0) {
          s.items.stake--;
          const relic = RELICS.find((r) => r.id === pk.relic);
          s.relics.push(pk.relic);
          this.sound.stake();
          this.sound.relic();
          this.burst(pk.x + 6, pk.y + 6, 20, '#f8d048');
          this.showBanner(`YOU CLAIM ${relic.name}!`);
          if (s.relics.length === 3) this.showBanner('THE CASTLE GATE WILL OPEN. GO EAST.');
          this.writeSave();
        } else {
          if (this.frame % 90 === 0) this.showBanner('THE ORB RESISTS YOUR WHIP. AN OAK STAKE MIGHT CRACK IT.');
          return; // don't consume
        }
        break;
      }
    }
    pk.dead = true;
    pk.ttl = 0;
  }

  updateAmbient() {
    const z = this.zone;
    if (!z.ambient || this.bossActive) return;
    const list = this.night ? z.ambient.night : z.ambient.day;
    if (!list.length) return;
    if (++this.spawnTimer < (z.ambient.rate || 160)) return;
    this.spawnTimer = 0;
    const alive = this.enemies.filter((e) => e.ambient && !e.dead).length;
    if (alive >= z.ambient.max) return;
    const type = list[Math.floor(Math.random() * list.length)];
    const side = Math.random() < 0.5 ? -1 : 1;
    const px = this.player.x / TILE + side * (14 + Math.random() * 6);
    const tx = Math.max(2, Math.min(z.w - 3, Math.round(px)));
    if (type === 'bat' || type === 'ghost') {
      const e = spawnEnemy(this, type, tx, 3 + Math.floor(Math.random() * 4), { ambient: true });
      e.perch = false;
      e.ambient = true;
      this.enemies.push(e);
    } else {
      const gy = findGround(z, tx) - 1;
      const e = spawnEnemy(this, type, tx, gy, { ambient: true });
      e.ambient = true;
      this.enemies.push(e);
    }
  }

  tryInteract() {
    const p = this.player;
    const pcx = p.x + p.w / 2;
    for (const d of this.doors) {
      if (Math.abs(pcx - (d.px + 8)) < 14) {
        if (d.kind === 'zone') {
          if (d.lockRelics && this.save.relics.length < d.lockRelics) {
            this.sound.deny();
            this.openDialog('THE CASTLE GATE', ['CARVED ABOVE THE ARCH:', '"FANG, EYE, AND CHALICE SHALL BE', 'MY FLESH, MY SIGHT, MY THIRST."', 'THE GATE DOES NOT MOVE.']);
            return;
          }
          this.warp(d.to, d.tox, d.toy);
          return;
        }
        if (d.kind === 'shop') {
          if (this.night && !this.zone.indoor) {
            this.sound.deny();
            this.openDialog(d.label, ['LOCKED TIGHT. A VOICE HISSES:', '"NOT WHILE THE DEAD WALK. COME AT DAWN."']);
            return;
          }
          this.openShop(d.shop);
          return;
        }
        if (d.kind === 'church') {
          if (this.night) {
            this.sound.deny();
            this.openDialog('CHURCH', ['THE DOORS ARE SEALED WITH PRAYER.', 'RETURN IN DAYLIGHT.']);
            return;
          }
          this.state = 'church';
          this.churchSel = 0;
          this.sound.door();
          return;
        }
        if (d.kind === 'msg') {
          this.openDialog(d.label, [d.msg]);
          return;
        }
      }
    }
    if (!this.night) {
      for (const n of this.npcs) {
        if (Math.abs(pcx - (n.x * TILE + 8)) < 16) {
          this.openDialog(n.name, this.npcLines(n));
          return;
        }
      }
    }
  }

  // Quest NPCs pick their lines (and advance their quest) by save state.
  npcLines(n) {
    if (n.quest === 'bell') {
      const f = this.save.flags;
      if (f.whistle) {
        return ['THE BELL SITS ON MY SILL AGAIN.', 'THANK YOU, HUNTER. SAFE CROSSINGS.'];
      }
      if (f.bell) {
        f.whistle = true;
        this.sound.relic();
        this.writeSave();
        return ['...HIS BELL! OH, IT STILL SMELLS OF THE LAKE.', 'TAKE HIS FERRY WHISTLE, THEN.', 'BLOW IT IN EITHER TOWN AND THE PALE FERRY', 'WILL CARRY YOU ACROSS THE WATER.'];
      }
      f.quest_bell = true;
      return ['MY HUSBAND FERRIED THIS LAKE THIRTY YEARS.', 'THE NIGHT TOOK HIM, BELL AND ALL.', 'HIS BRONZE BELL LIES ON THE BRIDGE ISLE,', 'IN HIS OLD STRONGBOX. BRING IT HOME', 'AND HIS WHISTLE IS YOURS.'];
    }
    return n.lines;
  }

  openDialog(name, lines) {
    this.dialog = { name, lines };
    this.state = 'dialog';
    this.sound.text();
  }

  updateDialog(inp) {
    if (inp.pressed('start') || inp.pressed('jump') || inp.pressed('whip') || inp.pressed('up')) {
      this.state = 'play';
      this.sound.text();
    }
  }

  // ---------------- shop ----------------

  openShop(id) {
    this.shop = { id, sel: 0 };
    this.shopMsg = '';
    this.state = 'shop';
    this.sound.door();
  }

  shopRows() {
    const sh = SHOPS[this.shop.id];
    const rows = sh.stock
      .filter((it) => {
        const item = ITEMS[it];
        if (item.kind === 'whip') return this.save.whip < item.tier;
        if (item.kind === 'sub') return !this.save.subs.includes(it);
        return true;
      });
    rows.push('leave');
    return rows;
  }

  updateShop(inp) {
    const rows = this.shopRows();
    if (inp.pressed('up')) { this.shop.sel = (this.shop.sel + rows.length - 1) % rows.length; this.sound.text(); }
    if (inp.pressed('down')) { this.shop.sel = (this.shop.sel + 1) % rows.length; this.sound.text(); }
    this.shop.sel = Math.min(this.shop.sel, rows.length - 1);
    if (inp.pressed('start') && this.shop.sel !== rows.length - 1) { this.state = 'play'; return; }
    if (inp.pressed('jump') || inp.pressed('whip') || (inp.pressed('start') && this.shop.sel === rows.length - 1)) {
      const it = rows[this.shop.sel];
      if (it === 'leave') { this.state = 'play'; this.sound.door(); return; }
      this.buy(it);
    }
  }

  buy(id) {
    const item = ITEMS[id];
    const s = this.save;
    if (s.hearts < item.price) { this.sound.deny(); this.shopMsg = 'NOT ENOUGH HEARTS.'; return; }
    if (item.kind === 'consumable') {
      const key = id;
      if (s.items[key] >= item.max) { this.sound.deny(); this.shopMsg = 'YOU CARRY ENOUGH.'; return; }
      s.items[key]++;
    } else if (item.kind === 'sub') {
      s.subs.push(id);
      if (!s.sub) s.sub = id;
    } else if (item.kind === 'whip') {
      s.whip = item.tier;
    }
    s.hearts -= item.price;
    this.sound.buy();
    this.shopMsg = 'A FINE CHOICE.';
  }

  // ---------------- church ----------------

  updateChurch(inp) {
    if (inp.pressed('up') || inp.pressed('down')) { this.churchSel = 1 - this.churchSel; this.sound.text(); }
    if (inp.pressed('jump') || inp.pressed('whip') || inp.pressed('start')) {
      if (this.churchSel === 0) {
        this.save.hp = maxHpFor(this.save.lvl);
        this.clock = 0;
        this.nightBlend = 0;
        this.writeSave();
        this.sound.save();
        this.showBanner('YOUR WOUNDS MEND. YOUR DEEDS ARE RECORDED.');
      } else this.sound.door();
      this.state = 'play';
    }
  }

  // ---------------- pause / gear ----------------

  pauseRows() {
    const s = this.save;
    const rows = [];
    const subName = s.sub ? SUBS[s.sub].name : 'NONE';
    rows.push({ label: `SUB-WEAPON < ${subName} >`, act: 'cycle' });
    rows.push({ label: `USE MOOR TONIC  x${s.items.tonic}`, act: 'tonic' });
    rows.push({ label: `USE LAUREL      x${s.items.laurel}`, act: 'laurel' });
    rows.push({ label: `USE GARLIC      x${s.items.garlic}`, act: 'garlic' });
    rows.push({ label: `USE HOLY ASH    x${s.items.ash}`, act: 'ash' });
    if (s.flags.whistle) rows.push({ label: 'FERRY WHISTLE', act: 'whistle' });
    rows.push({ label: 'VIEW MAP', act: 'map' });
    rows.push({ label: 'RESUME', act: 'resume' });
    return rows;
  }

  updatePause(inp) {
    const rows = this.pauseRows();
    if (inp.pressed('up')) { this.pauseSel = (this.pauseSel + rows.length - 1) % rows.length; this.sound.text(); }
    if (inp.pressed('down')) { this.pauseSel = (this.pauseSel + 1) % rows.length; this.sound.text(); }
    const act = rows[this.pauseSel].act;
    if ((inp.pressed('left') || inp.pressed('right')) && act === 'cycle') this.cycleSub(inp.pressed('left') ? -1 : 1);
    if (inp.pressed('jump') || inp.pressed('whip')) {
      const s = this.save;
      if (act === 'cycle') this.cycleSub(1);
      if (act === 'resume') { this.state = 'play'; this.sound.text(); return; }
      if (act === 'tonic') {
        if (s.items.tonic > 0 && s.hp < maxHpFor(s.lvl)) {
          s.items.tonic--;
          s.hp = Math.min(maxHpFor(s.lvl), s.hp + Math.ceil(maxHpFor(s.lvl) / 2));
          this.sound.pickup();
        } else this.sound.deny();
      }
      if (act === 'laurel') {
        if (s.items.laurel > 0) {
          s.items.laurel--;
          this.player.laurelT = 300;
          this.sound.pickup();
          this.state = 'play';
        } else this.sound.deny();
      }
      if (act === 'garlic') {
        if (s.items.garlic <= 0) this.sound.deny();
        else if (this.zone.id !== 'graveyard' || !this.player.grounded) {
          this.sound.deny();
          this.state = 'play';
          this.showBanner('YOU SNIFF THE GARLIC. NOTHING HAPPENS HERE.');
          s.items.garlic--;
        } else {
          s.items.garlic--;
          this.sound.pickup();
          this.state = 'play';
          this.garlicSpot = { x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h - 6 };
          this.fairy = { t: 0 };
          this.showBanner('YOU LAY THE GARLIC ON THE GRAVES...');
        }
      }
      if (act === 'ash') {
        if (s.items.ash <= 0) this.sound.deny();
        else {
          s.items.ash--;
          this.state = 'play';
          this.flash = 8;
          this.shake = 8;
          this.sound.flame();
          let scoured = 0;
          for (const e of this.enemies) {
            if (e.dead || e.boss) continue;
            if (Math.abs(e.x + e.w / 2 - (this.camX + VIEW_W / 2)) > VIEW_W * 0.65) continue;
            if (e.type === 'crab') e.state = 1; // ash finds the flesh under the shell
            e.collapsed = 0;
            damageEnemy(this, e, 999);
            scoured++;
          }
          this.showBanner(scoured ? 'THE HOLY ASH SCOURS THE AIR!' : 'THE ASH DRIFTS AWAY, UNSPENT.');
        }
      }
      if (act === 'whistle') {
        if (this.zone.id === 'hollow' || this.zone.id === 'vireton') {
          this.state = 'play';
          this.sound.dawn();
          this.showBanner('THE PALE FERRY CARRIES YOU ACROSS THE WATER...');
          if (this.zone.id === 'hollow') this.warp('vireton', 6);
          else this.warp('hollow', 116);
        } else {
          this.sound.deny();
          this.state = 'play';
          this.showBanner('THE FERRY ONLY CALLS AT TOWN DOCKS.');
        }
      }
      if (act === 'map') { this.state = 'map'; this.sound.text(); }
    }
    if (inp.pressed('start')) { this.state = 'play'; this.sound.text(); }
  }

  updateMap(inp) {
    if (inp.pressed('start') || inp.pressed('jump') || inp.pressed('whip')) {
      this.state = 'play';
      this.sound.text();
    }
  }

  cycleSub(dir) {
    const s = this.save;
    const opts = [null, ...s.subs];
    const i = opts.indexOf(s.sub);
    s.sub = opts[(i + dir + opts.length) % opts.length];
    this.sound.text();
  }

  // ---------------- camera & render ----------------

  updateCamera(snap) {
    const p = this.player;
    if (!p) { this.camX = 0; this.camY = 0; return; }
    const tx = Math.max(0, Math.min(p.x + p.w / 2 - VIEW_W / 2, this.zone.w * TILE - VIEW_W));
    const ty = Math.max(0, Math.min(p.y + p.h / 2 - VIEW_H / 2 - 12, Math.max(0, this.zone.h * TILE - VIEW_H)));
    if (snap) { this.camX = tx; this.camY = ty; }
    else {
      this.camX += (tx - this.camX) * 0.2;
      this.camY += (ty - this.camY) * 0.2;
    }
  }

  render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    if (this.state === 'title') { this.renderTitle(); return; }
    if (this.state === 'story') { this.renderStory(STORY, 'THE CURSE OF MOORLACH'); return; }
    if (this.state === 'ending') { this.renderEnding(); return; }
    if (!this.zone) return;

    const shx = this.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
    const shy = this.shake > 0 ? (Math.random() - 0.5) * 3 : 0;
    const cx = Math.round(this.camX + shx), cy = Math.round(this.camY + shy);

    drawBG(ctx, this.zone.theme, this.camX, this.camY, this.frame, this.zone.indoor ? 0 : this.nightBlend, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-cx, -cy);

    // tiles
    const tx0 = Math.floor(cx / TILE) - 1, tx1 = tx0 + Math.ceil(VIEW_W / TILE) + 2;
    const ty0 = Math.floor(cy / TILE) - 1, ty1 = ty0 + Math.ceil(VIEW_H / TILE) + 2;
    for (let ty = Math.max(0, ty0); ty <= Math.min(this.zone.h - 1, ty1); ty++) {
      for (let tx = Math.max(0, tx0); tx <= Math.min(this.zone.w - 1, tx1); tx++) {
        const ch = this.grid[ty][tx];
        if (ch === '.') continue;
        drawTile(ctx, ch, this.zone.theme, tx * TILE, ty * TILE, this.frame, ty > 0 ? this.grid[ty - 1][tx] : undefined);
      }
    }

    // doors / buildings
    for (const d of this.doors) this.drawDoor(d);

    // npcs (hide at night outdoors)
    if (!this.night || this.zone.indoor) {
      for (const n of this.npcs) {
        const bob = Math.sin(this.frame / 30 + n.x) * 0.8;
        drawSprite(ctx, n.sprite, n.x * TILE, n.y - 18 + bob, ((this.player.x + 5) < n.x * TILE + 8));
        if (Math.abs(this.player.x + 5 - (n.x * TILE + 8)) < 16) {
          text(ctx, '▲', n.x * TILE + 4, n.y - 30 + Math.sin(this.frame / 8) * 1.5, '#f8d048', 8);
        }
      }
    }

    // pickups
    for (const pk of this.pickups) {
      const bob = pk.kind === 'orb' ? Math.sin(this.frame / 16) * 2 : 0;
      const name = { heart: 'heart_s', bigheart: 'heart_b', tonic: 'tonic', laurel: 'laurel_i', orb: 'orb', amulet: 'amulet_i', chest: 'chest' }[pk.kind];
      if (pk.kind === 'orb' && (this.frame & 15) === 0) this.spark(pk.x + 6, pk.y + 4, '#e8d8f8');
      if (pk.kind === 'amulet' && (this.frame & 15) === 0) this.spark(pk.x + 5, pk.y + 3, '#48c8d8');
      if (pk.ttl < 120 && (this.frame & 3) < 2 && pk.kind !== 'orb') continue;
      drawSprite(ctx, name, pk.x, pk.y + bob, false);
    }

    // garlic offering + fairy
    if (this.garlicSpot) drawSprite(ctx, 'garlic_i', this.garlicSpot.x - 4, this.garlicSpot.y, false);
    if (this.fairy && this.fairy.x !== undefined) drawSprite(ctx, 'fairy', this.fairy.x - 5, this.fairy.y, false);

    // entities
    for (const e of this.enemies) drawEnemy(this, ctx, e);
    this.player.draw(this, ctx);
    for (const pr of this.projs) drawProj(this, ctx, pr);

    // particles
    for (const pt of this.parts) {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, 2, 2);
    }

    ctx.restore();

    // night tint over the world
    if (!this.zone.indoor && this.nightBlend > 0) {
      ctx.fillStyle = `rgba(8,10,40,${this.nightBlend * 0.28})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,40,40,${this.flash * 0.05})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    this.renderHUD();

    // overlays
    if (this.state === 'shop') this.renderShop();
    if (this.state === 'dialog') this.renderDialog();
    if (this.state === 'church') this.renderChurch();
    if (this.state === 'pause') this.renderPause();
    if (this.state === 'map') this.renderMap();
    if (this.state === 'gameover') this.renderGameOver();

    // banners
    let by = 44;
    for (const b of this.banner) {
      const a = Math.min(1, b.ttl / 30);
      ctx.fillStyle = `rgba(0,0,0,${0.65 * a})`;
      const w = b.t.length * 6 + 16;
      ctx.fillRect(VIEW_W / 2 - w / 2, by, w, 14);
      ctx.globalAlpha = a;
      text(ctx, b.t, VIEW_W / 2, by + 3, '#f8d048', 8, 'center');
      ctx.globalAlpha = 1;
      by += 18;
    }

    // fade
    if (this.fade > 0) {
      const a = this.fade > 15 ? (30 - this.fade) / 15 : this.fade / 15;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  drawDoor(d) {
    const x = d.px, y = d.py;
    if (d.kind === 'shop' || d.kind === 'church' || d.kind === 'msg') {
      // building facade
      const wall = d.kind === 'church' ? '#b8b0a0' : '#8a7a5a';
      const roof = d.kind === 'church' ? '#5a6a8a' : '#7a3a28';
      ctx.fillStyle = wall;
      ctx.fillRect(x - 24, y - 44, 64, 44);
      ctx.fillStyle = roof;
      if (d.kind === 'church') {
        ctx.beginPath();
        ctx.moveTo(x - 30, y - 44); ctx.lineTo(x + 8, y - 66); ctx.lineTo(x + 46, y - 44);
        ctx.fill();
        ctx.fillRect(x + 4, y - 78, 8, 14);
        ctx.fillStyle = '#f8d048';
        ctx.fillRect(x + 6, y - 88, 4, 10);
        ctx.fillRect(x + 2, y - 85, 12, 3);
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 30, y - 44); ctx.lineTo(x + 8, y - 60); ctx.lineTo(x + 46, y - 44);
        ctx.fill();
      }
      // windows
      ctx.fillStyle = '#241a14';
      ctx.fillRect(x - 16, y - 34, 10, 12);
      ctx.fillRect(x + 22, y - 34, 10, 12);
      if (this.nightBlend < 0.5) {
        ctx.fillStyle = '#f8d048';
        ctx.fillRect(x - 14, y - 32, 6, 8);
        ctx.fillRect(x + 24, y - 32, 6, 8);
      }
    }
    if (d.kind === 'zone' && !this.zone.indoor) {
      // manor / castle gate
      ctx.fillStyle = '#3a3a48';
      ctx.fillRect(x - 12, y - 52, 40, 52);
      ctx.fillStyle = '#26262f';
      ctx.fillRect(x - 8, y - 46, 6, 46);
      ctx.fillRect(x + 18, y - 46, 6, 46);
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 52); ctx.lineTo(x + 8, y - 64); ctx.lineTo(x + 28, y - 52);
      ctx.fillStyle = '#3a3a48';
      ctx.fill();
    }
    // the door itself
    ctx.fillStyle = d.lockRelics && this.save.relics.length < d.lockRelics ? '#26262f' : '#4a2e18';
    ctx.fillRect(x, y - 24, 16, 24);
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(x + 1, y - 23, 14, 2);
    ctx.fillStyle = '#f8d048';
    ctx.fillRect(x + 12, y - 13, 2, 3);
    // label + prompt
    const pcx = this.player.x + this.player.w / 2;
    if (Math.abs(pcx - (x + 8)) < 26) {
      text(ctx, d.label, x + 8, y - 62, '#f8d048', 8, 'center');
      text(ctx, '▲', x + 5, y - 34 + Math.sin(this.frame / 8) * 1.5, '#f8d048', 8);
    }
  }

  renderHUD() {
    const s = this.save;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 26);

    // player hp
    text(ctx, 'PLAYER', 6, 3, '#e8e8f0', 8);
    const maxhp = maxHpFor(s.lvl);
    ctx.fillStyle = '#26262f';
    ctx.fillRect(48, 3, 90, 7);
    ctx.fillStyle = '#c03028';
    ctx.fillRect(48, 3, 90 * Math.max(0, s.hp) / maxhp, 7);

    // boss hp
    if (this.bossActive && !this.bossActive.dead) {
      text(ctx, 'ENEMY', 6, 14, '#e8e8f0', 8);
      ctx.fillStyle = '#26262f';
      ctx.fillRect(48, 15, 90, 7);
      ctx.fillStyle = '#9048c8';
      ctx.fillRect(48, 15, 90 * Math.max(0, this.bossActive.hp) / this.bossActive.maxhp, 7);
    } else {
      text(ctx, `LVL ${s.lvl}`, 6, 15, '#f8d048', 8);
      const next = s.lvl < LEVELS.length ? LEVELS[s.lvl] : null;
      text(ctx, next ? `EXP ${s.exp}/${next}` : 'EXP MAX', 48, 15, '#8a8a99', 8);
    }

    // hearts
    drawSprite(ctx, 'heart_s', 152, 4, false);
    text(ctx, String(s.hearts).padStart(3, '0'), 163, 3, '#fff', 8);

    // sub-weapon box
    ctx.strokeStyle = '#8a8a99';
    ctx.strokeRect(196.5, 2.5, 20, 20);
    if (s.sub) drawSprite(ctx, SUBS[s.sub].icon, 202, 8, false);
    text(ctx, 'SUB', 199, 27, '#556', 7);

    // consumables
    drawSprite(ctx, 'stake_i', 224, 5, false);
    text(ctx, `x${s.items.stake}`, 233, 4, '#c8a870', 8);
    drawSprite(ctx, 'tonic', 224, 15, false);
    text(ctx, `x${s.items.tonic}`, 233, 14, '#c8a870', 8);
    drawSprite(ctx, 'laurel_i', 256, 15, false);
    text(ctx, `x${s.items.laurel}`, 266, 14, '#c8a870', 8);

    // relics
    for (let i = 0; i < 3; i++) {
      const r = RELICS[i];
      ctx.globalAlpha = s.relics.includes(r.id) ? 1 : 0.18;
      drawSprite(ctx, r.icon, 258 + i * 14, 3, false);
      ctx.globalAlpha = 1;
    }

    // time of day
    const icon = this.night ? '☾' : '☀';
    text(ctx, icon, 302, 4, this.night ? '#b8c8f8' : '#f8d048', 10);
    text(ctx, WHIPS[s.whip].name, 316, 5, '#8a8a99', 7);
    text(ctx, this.zone.name, 316, 15, '#556', 7);
  }

  panel(x, y, w, h, title) {
    ctx.fillStyle = 'rgba(6,6,14,0.93)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#f8d048';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (title) text(ctx, title, x + w / 2, y + 6, '#f8d048', 8, 'center');
  }

  renderShop() {
    const sh = SHOPS[this.shop.id];
    const rows = this.shopRows();
    this.panel(40, 40, VIEW_W - 80, 168, sh.name);
    drawSprite(ctx, sh.keeper, 60, 58, false);
    text(ctx, sh.greet.slice(0, 46), 52, 84, '#8a8a99', 7);
    if (sh.greet.length > 46) text(ctx, sh.greet.slice(46), 52, 93, '#8a8a99', 7);

    drawSprite(ctx, 'heart_s', 260, 56, false);
    text(ctx, String(this.save.hearts), 272, 55, '#fff', 8);

    let y = 108;
    rows.forEach((it, i) => {
      const selected = i === this.shop.sel;
      if (selected) text(ctx, '►', 52, y, '#f8d048', 8);
      if (it === 'leave') {
        text(ctx, 'LEAVE', 64, y, selected ? '#fff' : '#8a8a99', 8);
      } else {
        const item = ITEMS[it];
        text(ctx, item.name, 64, y, selected ? '#fff' : '#8a8a99', 8);
        text(ctx, `${item.price}`, 240, y, selected ? '#f8d048' : '#8a8a99', 8);
        drawSprite(ctx, 'heart_s', 262, y + 1, false);
        if (selected) text(ctx, item.desc, VIEW_W / 2, 192, '#48c8d8', 7, 'center');
      }
      y += 12;
    });
    if (this.shopMsg) text(ctx, this.shopMsg, VIEW_W / 2, 180, '#e8b088', 7, 'center');
  }

  renderDialog() {
    const d = this.dialog;
    const h = 34 + d.lines.length * 11;
    this.panel(48, 150 - h / 2, VIEW_W - 96, h, d.name);
    d.lines.forEach((l, i) => text(ctx, l, VIEW_W / 2, 168 - h / 2 + i * 11, '#e8e8f0', 8, 'center'));
  }

  renderChurch() {
    const vir = this.zone.id === 'vireton';
    this.panel(80, 70, VIEW_W - 160, 104, vir ? 'CHAPEL OF THE DROWNED' : 'THE CHURCH OF THE HOLLOW');
    drawSprite(ctx, 'priest', 100, 88, false);
    text(ctx, vir ? 'SISTER MAREN:' : 'FATHER AMBROSE:', 126, 90, '#8a8a99', 7);
    text(ctx, vir ? '"THE LAKE GIVES BACK, IN TIME. REST."' : '"REST, HUNTER. THE LORD KEEPS WATCH."', 126, 100, '#8a8a99', 7);
    const opts = ['REST AND RECORD YOUR DEEDS', 'LEAVE'];
    opts.forEach((o, i) => {
      if (i === this.churchSel) text(ctx, '►', 108, 126 + i * 14, '#f8d048', 8);
      text(ctx, o, 120, 126 + i * 14, i === this.churchSel ? '#fff' : '#8a8a99', 8);
    });
  }

  renderPause() {
    const s = this.save;
    this.panel(52, 36, VIEW_W - 104, 176, '— GEAR —');
    const rows = this.pauseRows();
    rows.forEach((r, i) => {
      if (i === this.pauseSel) text(ctx, '►', 66, 54 + i * 13, '#f8d048', 8);
      text(ctx, r.label, 78, 54 + i * 13, i === this.pauseSel ? '#fff' : '#8a8a99', 8);
    });
    // stats column
    const sx = 232;
    text(ctx, WHIPS[s.whip].name, sx, 54, '#c8a870', 8);
    text(ctx, `LEVEL ${s.lvl}`, sx, 66, '#c8a870', 8);
    text(ctx, `HP ${s.hp}/${maxHpFor(s.lvl)}`, sx, 78, '#c8a870', 8);
    text(ctx, `STAKES x${s.items.stake}`, sx, 90, '#c8a870', 8);
    if (s.flags.amulet) {
      drawSprite(ctx, 'amulet_i', sx, 103, false);
      text(ctx, 'MOON AMULET', sx + 13, 104, '#48c8d8', 7);
    }
    if (s.flags.whistle) {
      drawSprite(ctx, 'whistle_i', sx, 116, false);
      text(ctx, 'FERRY WHISTLE', sx + 13, 116, '#c8a870', 7);
    } else if (s.flags.bell) {
      drawSprite(ctx, 'bell_i', sx, 115, false);
      text(ctx, 'BRONZE BELL', sx + 13, 116, '#f8d048', 7);
    }
    text(ctx, 'RELICS:', sx, 130, '#c8a870', 8);
    RELICS.forEach((r, i) => {
      ctx.globalAlpha = s.relics.includes(r.id) ? 1 : 0.18;
      drawSprite(ctx, r.icon, sx + (i * 16), 141, false);
      ctx.globalAlpha = 1;
    });
    text(ctx, 'SUBS: ' + (s.subs.length ? s.subs.map((x) => SUBS[x].name).join(', ') : 'NONE'), 66, 186, '#556', 7);
    text(ctx, 'GARLIC WORKS BEST WHERE THE DEAD SLEEP.', 66, 197, '#445', 7);
  }

  renderMap() {
    this.panel(24, 34, VIEW_W - 48, 180, '— THE LAND OF MOORLACH —');
    const nodes = {
      graveyard: [64, 132, 'CEMETERY'], westwood: [106, 132, 'WOODS'], hollow: [148, 132, 'HOLLOW'],
      marsh: [190, 132, 'MARSH'], bridge: [232, 132, 'BRIDGE'], vireton: [274, 132, 'VIRETON'],
      cliffs: [316, 132, 'CLIFFS'],
      castle: [340, 62, 'CASTLE'], manor1: [64, 98, 'BRAMBLEWICK'], catacombs: [64, 170, 'CATACOMBS'],
      manor2: [232, 98, 'GRIMHOLLOW'], manor3: [316, 98, 'RAVENMOOR'],
    };
    ctx.strokeStyle = '#5a5a68';
    const line = (a, b) => {
      ctx.beginPath();
      ctx.moveTo(nodes[a][0], nodes[a][1]);
      ctx.lineTo(nodes[b][0], nodes[b][1]);
      ctx.stroke();
    };
    line('graveyard', 'westwood'); line('westwood', 'hollow'); line('hollow', 'marsh');
    line('marsh', 'bridge'); line('bridge', 'vireton'); line('vireton', 'cliffs');
    line('graveyard', 'manor1'); line('graveyard', 'catacombs');
    line('bridge', 'manor2'); line('cliffs', 'manor3'); line('cliffs', 'castle');
    const relicAt = { manor1: 'fang', manor2: 'eye', manor3: 'chalice' };
    for (const [id, [x, y, label]] of Object.entries(nodes)) {
      const here = this.zone.id === id;
      ctx.fillStyle = here && (this.frame & 16) ? '#7a5a20' : '#26262f';
      ctx.fillRect(x - 10, y - 7, 20, 14);
      ctx.strokeStyle = here ? '#f8d048' : '#8a8a99';
      ctx.strokeRect(x - 10.5, y - 7.5, 21, 15);
      text(ctx, label, x, y + 10, here ? '#f8d048' : '#8a8a99', 7, 'center');
      const r = relicAt[id];
      if (r) {
        ctx.globalAlpha = this.save.relics.includes(r) ? 1 : 0.25;
        drawSprite(ctx, RELICS.find((z) => z.id === r).icon, x - 5, y - 4, false);
        ctx.globalAlpha = 1;
      }
      if (id === 'catacombs') {
        ctx.globalAlpha = this.save.flags.amulet ? 1 : 0.25;
        drawSprite(ctx, 'amulet_i', x - 5, y - 5, false);
        ctx.globalAlpha = 1;
      }
      if (id === 'hollow') text(ctx, '+', x, y - 5, '#f8d048', 9, 'center');
      if (id === 'castle') text(ctx, this.save.relics.length >= 3 ? '!' : '?', x, y - 5, '#c03028', 9, 'center');
    }
    text(ctx, 'YOU ARE IN: ' + this.zone.name, VIEW_W / 2, 196, '#48c8d8', 7, 'center');
  }

  renderGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'GAME OVER', VIEW_W / 2, 90, '#c03028', 20, 'center');
    text(ctx, 'THE HOLLOW DRAGS YOU BACK FROM THE DARK.', VIEW_W / 2, 130, '#8a8a99', 8, 'center');
    if (this.frame & 32) text(ctx, 'PRESS START', VIEW_W / 2, 156, '#f8d048', 8, 'center');
  }

  renderTitle() {
    drawBG(ctx, 'grave', this.frame * 0.2, 0, this.frame, 0.85, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'MOOREVANIA II', VIEW_W / 2, 44, '#c03028', 28, 'center');
    text(ctx, 'MOOREVANIA II', VIEW_W / 2 - 2, 42, '#f8d048', 28, 'center');
    text(ctx, "~ JASON'S QUEST ~", VIEW_W / 2, 80, '#e8e8f0', 12, 'center');

    const opts = this.hasSave ? ['NEW QUEST', 'CONTINUE'] : ['NEW QUEST'];
    opts.forEach((o, i) => {
      const sel = i === this.titleSel;
      if (sel && (this.frame & 32)) text(ctx, '►', VIEW_W / 2 - 46, 128 + i * 16, '#f8d048', 9);
      text(ctx, o, VIEW_W / 2, 128 + i * 16, sel ? '#fff' : '#8a8a99', 9, 'center');
    });

    drawSprite(ctx, 'p_idle', VIEW_W / 2 - 60, 176, false);
    drawSprite(ctx, 'zombie1', VIEW_W / 2 + 44, 178, true);
    text(ctx, 'A SIMON\'S QUEST STYLE ADVENTURE · ORIGINAL ART & MUSIC', VIEW_W / 2, 216, '#556', 7, 'center');
    text(ctx, 'M: MUTE', VIEW_W / 2, 228, '#445', 7, 'center');
    text(ctx, 'v1.2 THE DROWNED QUARTER', 6, 228, '#445', 7);
  }

  renderStory(pages, title) {
    ctx.fillStyle = '#060610';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, title, VIEW_W / 2, 30, '#c03028', 11, 'center');
    const page = pages[Math.min(this.storyPage, pages.length - 1)];
    page.forEach((l, i) => text(ctx, l, VIEW_W / 2, 78 + i * 14, '#e8e8f0', 8, 'center'));
    if (this.frame & 32) text(ctx, '— PRESS ATTACK —', VIEW_W / 2, 210, '#f8d048', 8, 'center');
    text(ctx, `${Math.min(this.storyPage + 1, pages.length)}/${pages.length}`, VIEW_W - 16, 224, '#556', 7, 'center');
  }

  renderEnding() {
    if (this.storyPage < ENDING.length) {
      drawBG(ctx, 'town', this.endT * 0.1, 0, this.frame, Math.max(0, 0.8 - this.endT / 600), VIEW_W, VIEW_H);
      ctx.fillStyle = 'rgba(0,0,10,0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const page = ENDING[this.storyPage];
      page.forEach((l, i) => text(ctx, l, VIEW_W / 2, 80 + i * 14, '#e8e8f0', 8, 'center'));
      if (this.frame & 32) text(ctx, '— PRESS ATTACK —', VIEW_W / 2, 205, '#f8d048', 8, 'center');
    } else {
      ctx.fillStyle = '#060610';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'THE END', VIEW_W / 2, 96, '#f8d048', 22, 'center');
      drawSprite(ctx, 'p_idle', VIEW_W / 2 - 8, 130, false);
      text(ctx, 'JASON BELMOORE WILL RETURN', VIEW_W / 2, 172, '#8a8a99', 8, 'center');
      if (this.frame & 32) text(ctx, 'PRESS ATTACK FOR TITLE', VIEW_W / 2, 210, '#556', 7, 'center');
    }
  }
}

const game = new Game();
window.game = game; // debug / testing hook

let last = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, ts - last);
  last = ts;
  acc += dt;
  while (acc >= 1000 / 60) {
    game.update();
    acc -= 1000 / 60;
  }
  game.render();
}
requestAnimationFrame(loop);
