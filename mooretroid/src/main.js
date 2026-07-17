// Mooretroid — main loop, states, rooms, UI.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawSpriteScaled, drawTile, drawDoor, drawBoom, THEMES,
} from './sprites.js';
import {
  TILE, ROOMS, SOLID, ITEM_INFO, STORY, ENDING, hintFor, validateWorld,
} from './world.js';
import {
  Player, spawnEnemy, updateEnemy, drawEnemy, damageEnemy,
  updateProjs, drawProjs, updateEprojs, drawEprojs, overlap,
} from './entities.js';

const VIEW_W = 256, VIEW_H = 240;
const SAVE_KEY = 'mooretroid-save';
const ESCAPE_FRAMES = 150 * 60;
const TOTAL_ITEMS = 24;

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
    this.titleSel = 0;
    this.storyPage = 0;
    this.banner = null;
    this.bannerT = 0;
    this.shake = 0;
    this.missileMode = false;
    this.escapeTimer = 0;
    this.hasSave = !!localStorage.getItem(SAVE_KEY);
    const errs = validateWorld();
    if (errs.length) console.warn('world errors:', errs);
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- save ----------------

  freshSave() {
    return {
      energy: 99, tanks: 0,
      missiles: 0, maxMissiles: 0,
      items: {}, flags: {}, doors: {},
      spawn: { room: 'b_start', tx: 24, ty: 12 },
      time: 0, deaths: 0,
    };
  }

  get maxEnergy() { return 99 + this.save.tanks * 100; }

  writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); this.hasSave = true; } catch { /* ignore */ }
  }

  startGame(fromSave) {
    this.save = fromSave
      ? JSON.parse(localStorage.getItem(SAVE_KEY))
      : this.freshSave();
    if (fromSave) this.save.energy = Math.min(this.maxEnergy, Math.max(50, this.save.energy));
    this.player = new Player();
    this.missileMode = false;
    this.escapeTimer = this.save.flags.escape && !this.save.flags.ended ? ESCAPE_FRAMES : 0;
    const sp = this.save.spawn;
    this.loadRoom(sp.room);
    this.player.standHere(sp.tx, sp.ty);
    this.state = 'play';
    this.lastTheme = null;
    this.showBanner(THEMES[this.room.theme].name);
    this.lastTheme = this.room.theme;
    if (!fromSave) this.writeSave();
  }

  showBanner(str) { this.banner = str; this.bannerT = 130; }

  // ---------------- room management ----------------

  loadRoom(id) {
    const r = ROOMS[id];
    this.room = r;
    this.grid = r.map.map((row) => row.split(''));
    this.enemies = [];
    this.projs = [];
    this.eprojs = [];
    this.drops = [];
    this.booms = [];
    this.zebs = [];
    this.spawnersT = [];

    // doors (built from exits)
    this.doors = r.exits.map((e) => {
      const x = e.side === 'left' ? 0 : r.w - 1;
      const key = `${r.id}:${e.side}:${e.y}`;
      return {
        side: e.side, x, y: e.y, to: e.to,
        red: !!e.red && !this.save.doors[key], key,
        lockFlag: e.flag || null,
        openT: 0, timer: 0, opening: false,
      };
    });
    this.doorMap = {};
    for (const d of this.doors) {
      for (let dy = 0; dy < 3; dy++) this.doorMap[`${d.x},${d.y + dy}`] = d;
    }

    // hive gate: opens once both titans are down
    if (r.gate && this.save.flags.boss_gorluk && this.save.flags.boss_skyrax) {
      for (let y = r.gate.y0; y <= r.gate.y1; y++) this.grid[y][r.gate.tx] = '.';
    }

    for (const [type, tx, ty] of r.spawns) {
      this.enemies.push(spawnEnemy(this, type, tx, ty));
    }
    if (r.boss && !this.save.flags['boss_' + r.boss.kind]) {
      this.enemies.push(spawnEnemy(this, r.boss.kind, r.boss.tx, 0));
    }
    for (const z of r.zebs) {
      if (!this.save.flags.boss_overmind) {
        this.zebs.push({ tx: z.tx, x: z.tx * TILE + 4, y: 3 * TILE, w: 8, h: 9 * TILE, hp: 4, max: 4, regen: 0 });
      }
    }
    if (r.rinkaSpawners.length && !this.save.flags.boss_overmind) {
      this.spawnersT = r.rinkaSpawners.map((s, i) => ({ ...s, t: i * 30 }));
    }

    this.items = r.items.filter((it) => !this.save.items[it.id]);

    if (!this.save.visited) this.save.visited = {};
    if (!this.save.visited[r.id]) { this.save.visited[r.id] = true; this.writeSave(); }

    this.updateCamera(true);
    this.setMusic();
  }

  setMusic() {
    if (this.escapeTimer > 0) { this.sound.playMusic('escape'); return; }
    const bossAlive = this.enemies?.some((e) => e.boss && !e.dead);
    this.sound.playMusic(bossAlive ? 'boss' : this.room.music);
  }

  // ---------------- physics queries ----------------

  tileAt(tx, ty) {
    if (ty < 0 || ty >= this.room.h) return '#';
    if (tx < 0 || tx >= this.room.w) return '.';
    return this.grid[ty][tx];
  }

  tileAtPx(x, y) { return this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)); }

  solid(x, y) {
    if (x < 0 || x >= this.room.w * TILE) return false; // transitions catch these
    if (y < 0 || y >= this.room.h * TILE) return true;
    for (const z of this.zebs) {
      if (z.hp > 0 && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return true;
    }
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const ch = this.grid[ty][tx];
    if (ch === 'D' || ch === 'R') {
      const d = this.doorMap[`${tx},${ty}`];
      return !d || d.openT < 1;
    }
    return SOLID.has(ch);
  }

  setTile(tx, ty, ch) {
    if (tx >= 0 && tx < this.room.w && ty >= 0 && ty < this.room.h) this.grid[ty][tx] = ch;
  }

  // A player shot meets the world. Returns true if the shot dies.
  shotHitsWorld(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (cx < -8 || cx > this.room.w * TILE + 8 || cy < -8 || cy > this.room.h * TILE + 8) return true;

    for (const z of this.zebs) {
      if (z.hp > 0 && cx >= z.x - 2 && cx < z.x + z.w + 2 && cy >= z.y && cy < z.y + z.h) {
        if (p.kind === 'missile') {
          z.hp--; z.regen = 0;
          this.sound.zebHit();
          if (z.hp <= 0) { this.addBoom(z.x + 4, cy); this.sound.boom(); }
        } else this.sound.clink();
        return true;
      }
    }

    const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
    const ch = this.tileAt(tx, ty);
    if (ch === 'D' || ch === 'R') {
      const d = this.doorMap[`${tx},${ty}`];
      if (!d) return true;
      if (d.openT >= 1) return false;
      this.tryOpenDoor(d, p.kind);
      return true;
    }
    if (ch === '*') {
      if (p.kind === 'missile') {
        this.breakStar(tx, ty);
      } else this.sound.clink();
      return true;
    }
    if (SOLID.has(ch)) return true;
    return false;
  }

  // Wave shots pierce the world but still trip doors they pass through.
  waveTouchWorld(p) {
    const tx = Math.floor((p.x + p.w / 2) / TILE), ty = Math.floor((p.y + p.h / 2) / TILE);
    const ch = this.tileAt(tx, ty);
    if (ch === 'D' || ch === 'R') {
      const d = this.doorMap[`${tx},${ty}`];
      if (d && d.openT <= 0) this.tryOpenDoor(d, 'beam');
    }
  }

  breakStar(tx, ty) {
    this.setTile(tx, ty, '.');
    this.addBoom(tx * TILE + 8, ty * TILE + 8);
    this.sound.boom();
  }

  tryOpenDoor(d, kind) {
    if (d.openT > 0) return;
    if (d.lockFlag && !this.save.flags[d.lockFlag]) { this.sound.clink(); return; }
    if (d.red) {
      if (kind !== 'missile') { this.sound.clink(); return; }
      d.red = false;
      this.save.doors[d.key] = 1;
      this.writeSave();
    }
    d.opening = true;
    d.timer = 210;
    this.sound.door();
  }

  updateDoors() {
    const P = this.player;
    for (const d of this.doors) {
      if (d.opening && d.openT < 1) { d.openT = Math.min(1, d.openT + 0.12); continue; }
      if (d.openT >= 1) {
        const inDoor = P.x < (d.x + 2) * TILE && P.x + P.w > (d.x - 1) * TILE;
        if (--d.timer <= 0 && !inDoor) {
          d.opening = false;
          d.openT = 0;
          this.sound.doorShut();
        }
      }
    }
  }

  // ---------------- combat helpers ----------------

  explode(x, y) {
    this.addBoom(x, y);
    this.sound.boom();
    // break bombable tiles
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.tileAt(tx + dx, ty + dy) === '*') this.breakStar(tx + dx, ty + dy);
      }
    }
    // open blue doors
    for (const d of this.doors) {
      const dxp = (d.x + 0.5) * TILE - x, dyp = (d.y + 1.5) * TILE - y;
      if (Math.hypot(dxp, dyp) < 28) this.tryOpenDoor(d, 'beam');
    }
    // hurt enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      const ex = e.x + e.w / 2 - x, ey = e.y + e.h / 2 - y;
      if (Math.hypot(ex, ey) < 26) damageEnemy(this, e, { kind: 'bomb', dmg: 3 });
    }
    // bomb jump
    const P = this.player;
    const px = P.x + P.w / 2 - x, py = P.y + P.h / 2 - y;
    if (Math.hypot(px, py) < 24) P.vy = Math.min(P.vy, -3.6);
  }

  hurtPlayer(dmg, fromX, spike = false) {
    const P = this.player;
    if (P.state === 'dead' || P.inv > 0) return;
    if (this.save.items.varia) dmg = Math.ceil(dmg / 2);
    this.save.energy -= dmg;
    P.inv = 60;
    P.vx = fromX > P.x + P.w / 2 ? -1.8 : 1.8;
    P.vy = spike ? -3.4 : -2.4;
    P.y -= 1;
    this.sound.hurt();
    this.shake = 6;
    if (this.save.energy <= 0) this.killPlayer();
  }

  lavaHurt() {
    if (this.player.state === 'dead') return;
    if (this.frame % 10 === 0) {
      this.save.energy -= this.save.items.varia ? 2 : 4;
      if (this.frame % 30 === 0) this.sound.hurt();
      if (this.save.energy <= 0) this.killPlayer();
    }
  }

  drainPlayer(e) {
    if (this.player.state === 'dead') { e.latched = false; return; }
    if (this.frame % 4 === 0) {
      this.save.energy -= 1;
      if (this.frame % 24 === 0) this.sound.drain();
      if (this.save.energy <= 0) { e.latched = false; this.killPlayer(); }
    }
  }

  killPlayer() {
    this.save.energy = 0;
    const P = this.player;
    P.state = 'dead';
    P.deadT = 0;
    for (let i = 0; i < 5; i++) {
      this.addBoom(P.x + 5 + (Math.random() - 0.5) * 20, P.y + 14 + (Math.random() - 0.5) * 24);
    }
    this.sound.bossDie();
    this.sound.stopMusic();
  }

  bossDied(e) {
    for (let i = 0; i < 7; i++) {
      this.addBoom(e.x + Math.random() * e.w, e.y + Math.random() * e.h, true);
    }
    this.sound.bossDie();
    this.save.flags[e.flag] = true;
    if (e.flag === 'boss_overmind') {
      this.save.flags.escape = true;
      this.escapeTimer = ESCAPE_FRAMES;
      this.zebs = [];
      this.spawnersT = [];
      this.enemies = this.enemies.filter((x) => x === e);
      this.showBanner('EMERGENCY! EVACUATE!');
      this.sound.bigBoom();
    } else {
      this.showBanner('THE TITAN FALLS');
    }
    this.writeSave();
    this.setMusic();
  }

  addBoom(x, y, big = false) { this.booms.push({ x, y, t: 0, big }); }

  addDrop(x, y) {
    const r = Math.random();
    if (r < 0.32) this.drops.push({ kind: 'energy', x: x - 3, y: y - 3, w: 6, h: 5, vy: -1, ttl: 420 });
    else if (r < 0.52 && this.save.maxMissiles > 0) this.drops.push({ kind: 'missile', x: x - 3, y: y - 3, w: 5, h: 5, vy: -1, ttl: 420 });
  }

  // ---------------- transitions ----------------

  tryTransition() {
    const P = this.player;
    const midY = (P.y + P.h / 2) / TILE;
    let side = null;
    if (P.x + P.w < 4) side = 'left';
    else if (P.x > this.room.w * TILE - 4) side = 'right';
    if (!side) return;

    let best = null, bestD = 1e9;
    for (const e of this.room.exits) {
      if (e.side !== side) continue;
      const d = Math.abs(e.y + 1.5 - midY);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) { P.x = Math.max(0, Math.min(P.x, this.room.w * TILE - P.w)); return; }

    const target = ROOMS[best.to];
    const back = target.exits.find((o) => o.to === this.room.id && o.side !== side);
    this.pendingRoom = { id: best.to, back };
    this.fade = 20;
    this.state = 'doorfade';
  }

  finishTransition() {
    const { id, back } = this.pendingRoom;
    const wasTheme = this.room.theme;
    const P = this.player;
    const ballWas = P.ball;
    this.loadRoom(id);
    const r = this.room;
    if (back) {
      P.x = back.side === 'left' ? TILE + 4 : (r.w - 1) * TILE - P.w - 4;
      P.y = (back.y + 3) * TILE - P.h - 0.1;
      const d = this.doors.find((dd) => dd.side === back.side && dd.y === back.y);
      if (d) { d.opening = true; d.openT = 1; d.timer = 120; }
    }
    P.vx = 0; P.vy = 0; P.ball = ballWas;
    if (r.theme !== wasTheme) this.showBanner(THEMES[r.theme].name);
    this.updateCamera(true);
  }

  tryElevator() {
    const P = this.player;
    if (!P.onGround) return;
    const footX = Math.floor((P.x + P.w / 2) / TILE);
    const footY = Math.floor((P.y + P.h + 2) / TILE);
    for (const el of this.room.elevators) {
      if (footY === el.ty && footX >= el.tx && footX < el.tx + el.tw) {
        this.pendingElevator = el;
        this.fade = 45;
        this.state = 'elevator';
        this.sound.elevator();
        return;
      }
    }
  }

  finishElevator() {
    const el = this.pendingElevator;
    const fromId = this.room.id;
    const wasTheme = this.room.theme;
    this.loadRoom(el.to);
    // land on the reciprocal pad
    const target = this.room.elevators.find((o) => o.to === fromId) || this.room.elevators[0];
    this.player.standHere(target.tx + 1, target.ty);
    this.save.spawn = { room: this.room.id, tx: target.tx + 1, ty: target.ty };
    this.save.energy = Math.max(this.save.energy, 1);
    this.writeSave();
    if (this.room.theme !== wasTheme) this.showBanner(THEMES[this.room.theme].name);
    this.updateCamera(true);
  }

  // ---------------- camera ----------------

  updateCamera(snap = false) {
    const P = this.player;
    const tx = Math.max(0, Math.min(P.x + P.w / 2 - VIEW_W / 2, this.room.w * TILE - VIEW_W));
    const ty = Math.max(0, Math.min(P.y + P.h / 2 - VIEW_H / 2, this.room.h * TILE - VIEW_H));
    if (snap) { this.camX = tx; this.camY = ty; return; }
    this.camX += (tx - this.camX) * 0.2;
    this.camY += (ty - this.camY) * 0.2;
    if (Math.abs(tx - this.camX) < 0.6) this.camX = tx;
    if (Math.abs(ty - this.camY) < 0.6) this.camY = ty;
  }

  // ---------------- update ----------------

  update() {
    const inp = this.input;
    inp.pollGamepad();
    if (inp.pressed('mute')) this.sound.toggleMute();
    this.frame++;
    if (this.bannerT > 0) this.bannerT--;
    if (this.shake > 0) this.shake--;

    switch (this.state) {
      case 'title': this.updateTitle(inp); break;
      case 'story': this.updateStory(inp); break;
      case 'play': this.updatePlay(inp); break;
      case 'pause':
        if (inp.pressed('start')) { this.state = 'play'; }
        if (inp.pressed('fire') || inp.pressed('left') || inp.pressed('right')) {
          this.pauseView = this.pauseView === 'map' ? 'status' : 'map';
          this.sound.text();
        }
        if (inp.pressed('sel') && this.save.items.ice && this.save.items.wave) {
          this.save.beam = this.save.beam === 'wave' ? 'ice' : 'wave';
          this.writeSave();
          this.sound.refill();
        }
        break;
      case 'item': this.updateItemGet(inp); break;
      case 'doorfade':
        if (--this.fade === 10) this.finishTransition();
        if (this.fade <= 0) this.state = 'play';
        break;
      case 'elevator':
        if (--this.fade === 22) this.finishElevator();
        if (this.fade <= 0) this.state = 'play';
        break;
      case 'gameover': this.updateGameOver(inp); break;
      case 'ending': this.updateEnding(inp); break;
    }
    this.sound.updateMusic();
    inp.endFrame();
  }

  updateTitle(inp) {
    this.sound.playMusic('title');
    const opts = this.hasSave ? 2 : 1;
    if (inp.pressed('up') || inp.pressed('down')) this.titleSel = (this.titleSel + 1) % opts;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      this.sound.pickup();
      if (this.titleSel === 1 && this.hasSave) { this.startGame(true); }
      else { this.storyPage = 0; this.state = 'story'; }
    }
  }

  updateStory(inp) {
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      this.storyPage++;
      this.sound.text();
      if (this.storyPage >= STORY.length) this.startGame(false);
    }
  }

  updatePlay(inp) {
    const P = this.player;

    if (P.state === 'dead') {
      P.deadT++;
      if (P.deadT === 1) { /* already exploded */ }
      if (P.deadT > 100) {
        this.save.deaths++;
        this.writeSave();
        this.state = 'gameover';
        this.gameoverSel = 0;
      }
      this.updateFx();
      return;
    }

    if (inp.pressed('start')) { this.state = 'pause'; this.pauseView = 'status'; this.sound.text(); return; }
    if (inp.pressed('sel') && this.save.maxMissiles > 0) {
      this.missileMode = !this.missileMode;
      this.sound.refill();
    }

    this.save.time++;

    // escape countdown
    if (this.escapeTimer > 0) {
      this.escapeTimer--;
      if (this.escapeTimer % 60 === 0 && this.escapeTimer < 15 * 60) this.sound.tick();
      if (this.escapeTimer % 130 === 0) this.sound.alarm();
      if (this.escapeTimer <= 0) { this.killPlayer(); return; }
    }

    if (inp.pressed('down') && !P.ball && P.onGround) {
      this.tryElevator();
      if (this.state !== 'play') return;
    }
    P.update(this, inp);
    if (this.state !== 'play') return;

    this.updateDoors();
    this.tryTransition();
    if (this.state !== 'play') return;

    // enemies
    for (const e of this.enemies) if (!e.dead) updateEnemy(this, e);
    this.enemies = this.enemies.filter((e) => !e.dead);

    // rinka spawners
    const rinkaCount = this.enemies.filter((e) => e.type === 'rinka').length;
    for (const s of this.spawnersT) {
      if (++s.t > 95 && rinkaCount < 4) {
        s.t = 0;
        const e = spawnEnemy(this, 'rinka', s.tx, s.ty);
        const dx = P.x + 5 - e.x, dy = P.y + 14 - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.vx = (dx / d) * 1.4; e.vy = (dy / d) * 1.4;
        this.enemies.push(e);
      }
    }

    // zebetite regen
    for (const z of this.zebs) {
      if (z.hp > 0 && z.hp < z.max && ++z.regen > 260) { z.regen = 0; z.hp++; }
    }

    updateProjs(this);
    updateEprojs(this);
    this.updateFx();
    this.updateDrops();
    this.updateItems();

    // ship = ending
    if (this.room.ship) {
      const s = this.room.ship;
      const shipRect = { x: s.tx * TILE, y: 10 * TILE, w: 64, h: 32 };
      if (overlap(shipRect, P)) this.startEnding();
    }

    this.updateCamera();
  }

  updateFx() {
    for (let i = this.booms.length - 1; i >= 0; i--) {
      const b = this.booms[i];
      b.t += 0.06;
      if (b.t >= 1) this.booms.splice(i, 1);
    }
  }

  updateDrops() {
    const P = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.vy = Math.min(2.4, d.vy + 0.15);
      if (!this.solid(d.x + 3, d.y + d.h + d.vy)) d.y += d.vy; else d.vy = 0;
      if (--d.ttl <= 0) { this.drops.splice(i, 1); continue; }
      if (overlap(d, P)) {
        if (d.kind === 'energy') {
          this.save.energy = Math.min(this.maxEnergy, this.save.energy + 5);
          this.sound.energy();
        } else {
          this.save.missiles = Math.min(this.save.maxMissiles, this.save.missiles + 2);
          this.sound.refill();
        }
        this.drops.splice(i, 1);
      }
    }
  }

  updateItems() {
    const P = this.player;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const r = { x: it.tx * TILE, y: it.ty * TILE, w: 16, h: 16 };
      if (!overlap(r, P)) continue;
      this.items.splice(i, 1);
      this.save.items[it.id] = true;
      if (it.kind === 'mpack') {
        this.save.maxMissiles += 5;
        this.save.missiles = Math.min(this.save.maxMissiles, this.save.missiles + 5);
      } else if (it.kind === 'etank') {
        this.save.tanks++;
        this.save.energy = this.maxEnergy;
      } else {
        this.save.items[it.kind] = true;
        // last-collected beam becomes active; swap any time on the pause screen
        if (it.kind === 'ice') this.save.beam = 'ice';
        if (it.kind === 'wave') this.save.beam = 'wave';
      }
      this.writeSave();
      this.itemGot = it;
      this.itemT = 170;
      this.state = 'item';
      this.sound.itemFanfare();
    }
  }

  updateItemGet() {
    if (--this.itemT <= 0) this.state = 'play';
  }

  updateGameOver(inp) {
    this.sound.stopMusic();
    if (inp.pressed('up') || inp.pressed('down')) this.gameoverSel = 1 - this.gameoverSel;
    if (inp.pressed('start') || inp.pressed('fire') || inp.pressed('jump')) {
      this.sound.pickup();
      if (this.gameoverSel === 0) this.startGame(true);
      else { this.state = 'title'; this.titleSel = 0; }
    }
  }

  startEnding() {
    this.state = 'ending';
    this.endT = 0;
    this.escapeTimer = 0;
    this.save.flags.ended = true;
    this.writeSave();
    this.sound.playMusic('ending');
  }

  updateEnding(inp) {
    this.endT++;
    if (this.endT > 420 && (inp.pressed('start') || inp.pressed('fire'))) {
      this.state = 'title';
      this.titleSel = 0;
    }
  }

  // ---------------- draw ----------------

  draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    switch (this.state) {
      case 'title': this.drawTitle(); break;
      case 'story': this.drawStory(); break;
      case 'play':
      case 'pause':
      case 'item':
      case 'doorfade':
      case 'elevator':
      case 'gameover':
        this.drawPlay();
        if (this.state === 'pause') this.drawPause();
        if (this.state === 'item') this.drawItemGet();
        if (this.state === 'gameover') this.drawGameOver();
        if (this.state === 'doorfade' || this.state === 'elevator') {
          const f = this.fade;
          const half = this.state === 'elevator' ? 22 : 10;
          const total = this.state === 'elevator' ? 45 : 20;
          const a = f > half ? (total - f) / (total - half) : f / half;
          ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, a)).toFixed(2)})`;
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
        break;
      case 'ending': this.drawEnding(); break;
    }
  }

  drawStars(seedShift = 0) {
    for (let i = 0; i < 60; i++) {
      const x = (i * 97 + seedShift) % VIEW_W;
      const y = (i * 61) % VIEW_H;
      const tw = (i + (this.frame >> 4)) % 5 === 0;
      ctx.fillStyle = tw ? '#8890a0' : '#485060';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  drawTitle() {
    this.drawStars();
    // planet
    ctx.fillStyle = '#182878';
    ctx.beginPath();
    ctx.arc(128, 330, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2848b0';
    ctx.beginPath();
    ctx.arc(120, 336, 142, 0, Math.PI * 2);
    ctx.fill();

    text(ctx, 'M O O R E T R O I D', 129, 61, '#301808', 20, 'center');
    text(ctx, 'M O O R E T R O I D', 128, 58, '#f8a800', 20, 'center');
    text(ctx, 'THE HIVE OF ZEMOOR', 128, 88, '#40d8d8', 9, 'center');

    const opts = this.hasSave ? ['NEW MISSION', 'CONTINUE'] : ['NEW MISSION'];
    opts.forEach((o, i) => {
      const sel = this.titleSel === i;
      text(ctx, (sel ? '> ' : '  ') + o, 128, 140 + i * 16, sel ? '#fff' : '#8890a0', 10, 'center');
    });
    if ((this.frame >> 5) & 1) text(ctx, 'PRESS START', 128, 196, '#f8a800', 8, 'center');
    text(ctx, 'ORIGINAL GAME - NO NINTENDO ASSETS', 128, 226, '#485060', 7, 'center');
  }

  drawStory() {
    this.drawStars();
    const page = STORY[this.storyPage] || [];
    page.forEach((line, i) => {
      text(ctx, line, 128, 70 + i * 14, '#c8d0d8', 8, 'center');
    });
    if ((this.frame >> 5) & 1) text(ctx, '- FIRE TO CONTINUE -', 128, 200, '#f8a800', 8, 'center');
  }

  drawPlay() {
    const r = this.room;
    const camX = Math.round(this.camX + (this.shake ? (Math.random() - 0.5) * 4 : 0));
    const camY = Math.round(this.camY + (this.shake ? (Math.random() - 0.5) * 3 : 0));
    const theme = THEMES[r.theme];

    if (r.sky) this.drawStars(31);

    // tiles
    const tx0 = Math.max(0, Math.floor(camX / TILE));
    const ty0 = Math.max(0, Math.floor(camY / TILE));
    const tx1 = Math.min(r.w - 1, Math.ceil((camX + VIEW_W) / TILE));
    const ty1 = Math.min(r.h - 1, Math.ceil((camY + VIEW_H) / TILE));
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = this.grid[ty][tx];
        if (ch === '.' || ch === 'D' || ch === 'R') continue;
        drawTile(ctx, ch, tx * TILE - camX, ty * TILE - camY, tx, ty, theme, this.frame);
      }
    }

    // doors
    for (const d of this.doors) {
      const locked = d.lockFlag && !this.save.flags[d.lockFlag];
      const color = locked ? 'grey' : d.red ? 'red' : 'blue';
      const px = d.x * TILE - camX, py = d.y * TILE - camY;
      if (px > -20 && px < VIEW_W + 20) {
        if (locked) {
          ctx.fillStyle = '#404048';
          ctx.fillRect(d.side === 'left' ? px : px + 8, py, 8, 48);
        } else {
          drawDoor(ctx, px, py, color, d.openT, d.side === 'left' ? 1 : -1);
        }
      }
    }

    // zebetites
    for (const z of this.zebs) {
      if (z.hp <= 0) continue;
      const px = z.x - camX;
      const pulse = 1 + Math.sin(this.frame * 0.15) * 0.5;
      ctx.fillStyle = z.hp < z.max ? '#a04838' : '#e04838';
      ctx.fillRect(px, z.y - camY, z.w, z.h);
      ctx.fillStyle = '#f8a890';
      ctx.fillRect(px + 2, z.y - camY, 2, z.h);
      ctx.fillStyle = `rgba(248,220,180,${0.2 * pulse})`;
      ctx.fillRect(px - 2, z.y - camY, z.w + 4, z.h);
    }

    // statues
    if (r.statues) {
      for (const s of r.statues) {
        const lit = this.save.flags[s.boss];
        ctx.save();
        if (!lit) ctx.filter = 'grayscale(1) brightness(0.6)';
        drawSpriteScaled(ctx, s.boss === 'boss_gorluk' ? 'statue_g' : 'statue_s', s.tx * TILE - camX, 12 * TILE - 18 - camY, 2);
        ctx.restore();
      }
    }

    // ship
    if (r.ship) {
      drawSpriteScaled(ctx, 'ship', r.ship.tx * TILE - camX, 12 * TILE - 24 - camY, 2);
    }

    // items
    for (const it of this.items) {
      const bob = Math.sin(this.frame * 0.08 + it.tx) * 2;
      const name = { morph: 'i_morph', mpack: 'i_missile', bombs: 'i_bombs', long: 'i_long', ice: 'i_ice', hijump: 'i_hijump', varia: 'i_varia', etank: 'i_etank', screw: 'i_screw', wave: 'i_wave' }[it.kind];
      if ((this.frame >> 3) % 4 !== 3) drawSprite(ctx, name, it.tx * TILE - camX, it.ty * TILE + bob - camY);
    }

    // drops
    for (const d of this.drops) {
      if (d.ttl < 90 && (this.frame & 3) < 2) continue;
      drawSprite(ctx, d.kind === 'energy' ? 'pu_energy' : 'pu_missile', d.x - camX, d.y - camY);
    }

    for (const e of this.enemies) drawEnemy(ctx, this, e, camX, camY);
    this.player.draw(ctx, this, camX, camY);
    drawProjs(ctx, this, camX, camY);
    drawEprojs(ctx, this, camX, camY);

    for (const b of this.booms) drawBoom(ctx, b.x - camX, b.y - camY, b.t, b.big);

    this.drawHUD();
  }

  drawHUD() {
    const s = this.save;
    // energy
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, 20);
    const cur = s.energy % 100;
    const full = Math.floor(s.energy / 100);
    text(ctx, 'EN', 8, 6, '#f8a800', 8);
    text(ctx, String(s.energy <= 0 ? 0 : cur).padStart(2, '0'), 26, 6, '#fff', 8);
    for (let i = 0; i < s.tanks; i++) {
      ctx.fillStyle = i < full ? '#f86868' : '#484858';
      ctx.fillRect(8 + i * 8, 1, 6, 4);
    }
    if (s.maxMissiles > 0) {
      const hot = this.missileMode;
      text(ctx, 'MSL', 60, 6, hot ? '#f84020' : '#8890a0', 8);
      text(ctx, String(s.missiles).padStart(2, '0'), 88, 6, hot ? '#fff' : '#8890a0', 8);
      if (hot) { ctx.fillStyle = '#f84020'; ctx.fillRect(56, 7, 2, 7); }
    }
    // boss bar
    const boss = this.enemies.find((e) => e.boss);
    if (boss) {
      const maxHp = boss.type === 'overmind' ? (boss.phase === 'glass' ? 12 : 25) : 70;
      ctx.fillStyle = '#484858';
      ctx.fillRect(150, 7, 98, 6);
      ctx.fillStyle = '#c03040';
      ctx.fillRect(151, 8, Math.max(0, 96 * boss.hp / maxHp), 4);
    }
    // escape timer
    if (this.escapeTimer > 0) {
      const t = Math.ceil(this.escapeTimer / 60);
      const mm = String(Math.floor(t / 60)).padStart(2, '0');
      const ss = String(t % 60).padStart(2, '0');
      const flash = this.escapeTimer % 60 < 30;
      text(ctx, `ESCAPE ${mm}:${ss}`, 128, 26, flash ? '#f84020' : '#fff', 10, 'center');
    }
    // banner
    if (this.bannerT > 0 && this.banner) {
      const a = Math.min(1, this.bannerT / 30);
      ctx.globalAlpha = a;
      text(ctx, this.banner, 128, 40, '#f8a800', 10, 'center');
      ctx.globalAlpha = 1;
    }
  }

  drawPause() {
    ctx.fillStyle = 'rgba(4,4,12,0.88)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.pauseView === 'map') { this.drawMapPage(); return; }
    const s = this.save;
    text(ctx, '- STATUS -', 128, 20, '#f8a800', 12, 'center');

    const both = s.items.ice && s.items.wave;
    const mark = (b) => (both ? (b ? ' *' : '') : '');
    const gear = [
      ['MORPH BALL', s.items.morph], ['BOMBS', s.items.bombs],
      ['LONG BEAM', s.items.long], ['ICE BEAM' + mark(s.beam !== 'wave'), s.items.ice],
      ['HI-JUMP', s.items.hijump], ['VARIA SUIT', s.items.varia],
      ['SCREW ATTACK', s.items.screw], ['WAVE BEAM' + mark(s.beam === 'wave'), s.items.wave],
    ];
    gear.forEach(([name, got], i) => {
      const x = i % 2 === 0 ? 40 : 140;
      const y = 44 + Math.floor(i / 2) * 13;
      text(ctx, (got ? '+ ' : '- ') + name, x, y, got ? '#48c848' : '#484858', 8);
    });
    text(ctx, `ENERGY TANKS ${s.tanks}`, 40, 100, '#f86868', 8);
    text(ctx, `MISSILES ${s.missiles}/${s.maxMissiles}`, 140, 100, '#c8d0d8', 8);
    if (both) text(ctx, '* ACTIVE BEAM - PRESS C TO SWAP', 128, 112, '#40d8d8', 7, 'center');

    const time = Math.floor(s.time / 3600);
    text(ctx, `AREA: ${THEMES[this.room.theme].name}`, 128, 126, '#8890a0', 8, 'center');
    text(ctx, `TIME ${time} MIN   DEATHS ${s.deaths}`, 128, 138, '#8890a0', 8, 'center');

    text(ctx, 'INTEL:', 128, 158, '#40d8d8', 8, 'center');
    this.wrapText(hintFor(s), 128, 170, '#c8d0d8', 8, 30);
    text(ctx, 'FIRE: MAP   START: RESUME', 128, 214, '#f8a800', 8, 'center');
  }

  drawMapPage() {
    const area = this.room.mapArea || this.room.theme;
    const theme = THEMES[area];
    text(ctx, `- MAP: ${theme.name} -`, 128, 20, '#f8a800', 10, 'center');

    const rooms = Object.values(ROOMS).filter((r) => (r.mapArea || r.theme) === area && r.mapPos);
    const seen = rooms.filter((r) => this.save.visited?.[r.id]);
    if (!seen.length) { text(ctx, 'NO DATA', 128, 110, '#484858', 10, 'center'); return; }

    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of rooms) {
      x0 = Math.min(x0, r.mapPos[0]); y0 = Math.min(y0, r.mapPos[1]);
      x1 = Math.max(x1, r.mapPos[0] + r.mapW); y1 = Math.max(y1, r.mapPos[1] + r.mapH);
    }
    const cw = Math.min(20, Math.floor(216 / (x1 - x0)));
    const chh = Math.min(16, Math.floor(150 / (y1 - y0)));
    const ox = Math.round(128 - ((x1 - x0) * cw) / 2);
    const oy = Math.round(118 - ((y1 - y0) * chh) / 2);

    for (const r of seen) {
      const px = ox + (r.mapPos[0] - x0) * cw;
      const py = oy + (r.mapPos[1] - y0) * chh;
      const w = r.mapW * cw, h = r.mapH * chh;
      ctx.fillStyle = theme.lo;
      ctx.fillRect(px + 1, py + 1, w - 2, h - 2);
      ctx.strokeStyle = theme.hi;
      ctx.strokeRect(px + 1.5, py + 1.5, w - 3, h - 3);
      if (r.elevators.length) {
        ctx.fillStyle = '#e8e858';
        ctx.fillRect(px + w / 2 - 2, py + h / 2 - 2, 4, 4);
      }
      if (r.id === this.room.id && (this.frame >> 4) & 1) {
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(px + 1.5, py + 1.5, w - 3, h - 3);
      }
    }
    text(ctx, '▪ ELEVATOR   ▯ YOU ARE HERE', 128, 196, '#8890a0', 7, 'center');
    text(ctx, 'FIRE: STATUS   START: RESUME', 128, 214, '#f8a800', 8, 'center');
  }

  wrapText(str, cx, y, color, size, maxChars) {
    const words = str.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) {
        text(ctx, line.trim(), cx, yy, color, size, 'center');
        line = w; yy += 11;
      } else line += ' ' + w;
    }
    if (line.trim()) text(ctx, line.trim(), cx, yy, color, size, 'center');
  }

  drawItemGet() {
    const info = ITEM_INFO[this.itemGot.kind];
    ctx.fillStyle = 'rgba(4,4,12,0.7)';
    ctx.fillRect(0, 84, VIEW_W, 64);
    text(ctx, info.name, 128, 96, '#f8a800', 12, 'center');
    text(ctx, info.desc, 128, 118, '#c8d0d8', 8, 'center');
  }

  drawGameOver() {
    ctx.fillStyle = 'rgba(4,4,12,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'MISSION FAILED', 128, 70, '#f84020', 14, 'center');
    ['CONTINUE', 'QUIT TO TITLE'].forEach((o, i) => {
      const sel = this.gameoverSel === i;
      text(ctx, (sel ? '> ' : '  ') + o, 128, 120 + i * 16, sel ? '#fff' : '#8890a0', 10, 'center');
    });
  }

  drawEnding() {
    this.drawStars(11);
    const t = this.endT;
    // ground
    ctx.fillStyle = '#182878';
    ctx.fillRect(0, 200, VIEW_W, 40);
    // ship lifts off
    const shipY = t < 120 ? 168 : Math.max(-40, 168 - (t - 120) * 0.8);
    drawSpriteScaled(ctx, 'ship', 96, shipY, 2);
    if (t > 120 && shipY > -30) {
      ctx.fillStyle = (this.frame & 4) ? '#f8d030' : '#f86818';
      ctx.fillRect(112, shipY + 26, 8, 10);
      ctx.fillRect(136, shipY + 26, 8, 10);
    }
    if (t > 100) {
      const lines = ENDING;
      lines.forEach((l, i) => {
        if (t > 140 + i * 30) text(ctx, l, 128, 60 + i * 13, '#c8d0d8', 8, 'center');
      });
    }
    if (t > 420) {
      const s = this.save;
      const got = Object.keys(s.items).filter((k) => ITEM_INFO[k] || k.match(/^(m\d|etank\d)/)).length;
      const pct = Math.min(100, Math.round(100 * got / TOTAL_ITEMS));
      const mins = Math.floor(s.time / 3600);
      let rank = 'ROOKIE HUNTER';
      if (pct >= 100) rank = mins <= 75 ? 'LEGEND OF ZEMOOR' : 'PERFECT HUNTER';
      else if (pct >= 75) rank = 'VETERAN HUNTER';
      else if (mins <= 45) rank = 'SPEED DEMON';
      text(ctx, `CLEAR TIME ${mins} MIN  -  ITEMS ${pct}%`, 128, 172, '#f8a800', 8, 'center');
      text(ctx, `RANK: ${rank}`, 128, 186, '#40d8d8', 9, 'center');
      if ((this.frame >> 5) & 1) text(ctx, 'PRESS START', 128, 224, '#fff', 8, 'center');
    }
  }
}

// ---------------- boot ----------------

initSprites();
const game = new Game();
window.__game = game; // for automated testing

let last = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (!last) last = ts;
  acc += Math.min(100, ts - last);
  last = ts;
  const STEP = 1000 / 60;
  while (acc >= STEP) {
    game.update();
    acc -= STEP;
  }
  game.draw();
}
requestAnimationFrame(loop);
