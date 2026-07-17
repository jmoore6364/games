// The Legend of Moore — main loop, states, screens, HUD.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, drawSprite, SPR, drawOverTile, drawDungTile, DT } from './sprites.js';
import {
  TILE, OW_W, OW_H, SCREEN_TW, SCREEN_TH, START, OVERWORLD, CAVES, DUNGEONS,
  ENTRANCES, DUNGEON_EXIT, STORY, ENDING, ITEM_INFO, overWalkable, DUNG_WALK,
  validateWorld,
} from './world.js';
import {
  Player, PLAY_W, PLAY_H, overlap, spawnEnemy, updateEnemy, drawEnemy,
  enemyRect, enemyActive, damageEnemy, CONTACT_DMG,
  updateProjs, drawProjs, updateEprojs, drawEprojs, updateDrops, drawDrops,
} from './entities.js';

const VIEW_W = 256, VIEW_H = 240, HUD_H = 64;
const SAVE_KEY = 'legend-of-moore-save';
const SCROLL_T = 34;

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

const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

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
    this.dialog = null;
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
      hearts: 3, hp: 6,
      gems: 0, bombs: 0, keys: 0,
      items: {}, // sword: 1|2, boomerang, candle, map_oak, compass_oak, ...
      shards: {},
      bItem: null,
      flags: {},
      deaths: 0, time: 0,
    };
  }

  get maxHp() { return this.save.hearts * 2; }
  get shardCount() { return Object.keys(this.save.shards).length; }

  writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); this.hasSave = true; } catch { /* ignore */ }
  }

  startGame(fromSave) {
    this.save = fromSave ? JSON.parse(localStorage.getItem(SAVE_KEY)) : this.freshSave();
    if (fromSave) this.save.hp = Math.max(this.save.hp, Math.min(6, this.maxHp));
    this.player = new Player();
    this.boomerangOut = false;
    this.loc = { kind: 'over', sx: START.sx, sy: START.sy };
    this.loadOverworld(START.sx, START.sy);
    this.player.standAt(START.tx, START.ty);
    this.state = 'play';
    if (!fromSave) this.writeSave();
  }

  showBanner(str) { this.banner = str; this.bannerT = 150; }

  say(lines, then = null) {
    this.dialog = { lines, ci: 0, t: 0, then };
  }

  // ---------------- location loading ----------------

  clearField() {
    this.enemies = [];
    this.projs = [];
    this.eprojs = [];
    this.drops = [];
    this.fx = [];
    this.bombs = [];
    this.flames = [];
    this.floorItems = [];
    this.boomerangOut = false;
  }

  loadOverworld(sx, sy) {
    const s = OVERWORLD[`${sx},${sy}`];
    this.loc = { kind: 'over', sx, sy };
    this.grid = s.rows.map((r) => r.split(''));
    this.caveMap = { ...s.caves };
    this.screen = s;
    this.room = null;
    this.clearField();

    // revealed secret?
    if (s.secret && this.save.flags[`S:${sx},${sy}`]) {
      this.grid[s.secret.ty][s.secret.tx] = s.secret.type === 'burn' ? 'S' : 'c';
      this.caveMap[`${s.secret.tx},${s.secret.ty}`] = s.secret.cave;
    }
    // sealed gate
    if (this.shardCount >= 3) {
      for (let y = 0; y < SCREEN_TH; y++) {
        for (let x = 0; x < SCREEN_TW; x++) {
          if (this.grid[y][x] === 'X') this.grid[y][x] = 'V';
        }
      }
      if (sx === 2 && sy === 0 && !this.save.flags.gateOpen) {
        this.save.flags.gateOpen = true;
        this.sound.secret();
        this.showBanner('THE SEAL IS BROKEN!');
      }
    }
    // enemies
    for (const type of s.spawns) {
      const spot = type === 'lurker' ? this.randomWaterTile() : this.randomSpawnTile();
      if (spot) this.enemies.push(spawnEnemy(this, type, spot[0], spot[1]));
    }
    this.sound.playMusic('over');
  }

  loadDungeonRoom(d, rx, ry) {
    const dung = DUNGEONS[d];
    const room = dung.rooms[`${rx},${ry}`];
    this.loc = { kind: 'dung', d, rx, ry };
    this.room = room;
    this.screen = null;
    this.clearField();
    this.pushed = false;
    this.slammed = false;

    // build full 16x11 grid: wall ring + interior
    this.grid = [];
    for (let y = 0; y < SCREEN_TH; y++) {
      const row = [];
      for (let x = 0; x < SCREEN_TW; x++) {
        if (y === 0 || y === SCREEN_TH - 1 || x === 0 || x === SCREEN_TW - 1) row.push('#');
        else row.push(room.rows[y - 1][x - 1]);
      }
      this.grid.push(row);
    }
    // doors
    this.doors = [];
    for (const [dir, type] of Object.entries(room.exits)) {
      const cells = dir === 'n' ? [[7, 0], [8, 0]]
        : dir === 's' ? [[7, 10], [8, 10]]
          : dir === 'e' ? [[15, 5]] : [[0, 5]];
      this.doors.push({ dir, type, cells, edge: this.edgeKey(d, rx, ry, dir) });
    }
    // items not yet taken
    (room.items || []).forEach((it, i) => {
      const flag = `I:${d}:${rx},${ry}:${i}`;
      if (it.kind !== 'fairy' && this.save.flags[flag]) return;
      this.floorItems.push({ ...it, x: it.tx * TILE, y: it.ty * TILE, flag });
    });
    // enemies / boss
    if (room.boss) {
      if (!this.save.flags[`K:${d}`]) {
        const b = spawnEnemy(this, room.boss, 6, 2);
        this.enemies.push(b);
        this.sound.playMusic('boss');
      } else this.sound.playMusic(d === 'lair' ? 'lair' : 'dungeon');
    } else {
      for (const type of room.spawns || []) {
        const spot = type === 'trap'
          ? [[1, 1], [14, 1], [1, 9], [14, 9]][(this.enemies.length) % 4]
          : this.randomSpawnTile();
        if (spot) this.enemies.push(spawnEnemy(this, type, spot[0], spot[1]));
      }
      this.sound.playMusic(d === 'lair' ? 'lair' : 'dungeon');
    }
    if (this.enemies.length && (room.slam || room.puzzle)) {
      this.slammed = true;
      this.sound.doorShut();
    } else if (room.puzzle === 'push') {
      this.slammed = true;
    }
  }

  edgeKey(d, rx, ry, dir) {
    if (dir === 'n') return `${d}:${rx},${ry}n`;
    if (dir === 's') return `${d}:${rx},${ry + 1}n`;
    if (dir === 'e') return `${d}:${rx + 1},${ry}w`;
    return `${d}:${rx},${ry}w`;
  }

  roomSealed() {
    const alive = this.enemies.some((e) => !e.dead);
    if (this.room.puzzle === 'push' && !this.pushed) return true;
    if (this.room.slam && alive) return true;
    return false;
  }

  doorPassable(door) {
    if (door.type === 'exit') return true;
    if (this.roomSealed()) return false;
    if (door.type === 'open') return true;
    if (door.type === 'lock') return !!this.save.flags[`L:${door.edge}`];
    if (door.type === 'bomb') return !!this.save.flags[`B:${door.edge}`];
    return false;
  }

  doorAt(tx, ty) {
    if (!this.doors) return null;
    for (const d of this.doors) {
      for (const [cx, cy] of d.cells) if (cx === tx && cy === ty) return d;
    }
    return null;
  }

  enterDungeon(d) {
    this.sound.stairs();
    const dung = DUNGEONS[d];
    const [rx, ry] = dung.entry.split(',').map(Number);
    this.loadDungeonRoom(d, rx, ry);
    this.player.x = 120; this.player.y = PLAY_H - 18;
    this.player.dir = 'up';
    this.showBanner(dung.name);
    this.writeSave();
  }

  exitDungeon() {
    const [sx, sy, tx, ty] = DUNGEON_EXIT[this.loc.d];
    this.sound.stairs();
    this.loadOverworld(sx, sy);
    this.player.standAt(tx, ty);
    this.player.dir = 'down';
    this.writeSave();
  }

  enterCave(id, back) {
    this.sound.stairs();
    this.loc = { kind: 'cave', id, back };
    this.grid = null;
    this.room = null;
    this.clearField();
    this.caveT = 0;
    this.player.x = 120; this.player.y = PLAY_H - 20;
    this.player.dir = 'up';
    this.sound.stopMusic();
    const cave = CAVES[id];
    // shop / item layout
    if (cave.shop) {
      cave.shop.forEach((w, i) => {
        this.floorItems.push({ kind: w.item, shop: true, price: w.price, x: 88 + i * 32, y: 92 });
      });
    } else if (cave.gems && !this.save.flags[`C:${id}`]) {
      this.floorItems.push({ kind: 'gems', amount: cave.gems, x: 120, y: 92, flag: `C:${id}` });
    } else if (cave.give && !this.save.flags[`C:${id}`]) {
      if (!cave.needHearts || this.save.hearts >= cave.needHearts) {
        this.floorItems.push({ kind: cave.give, x: 120, y: 92, flag: `C:${id}` });
      }
    }
  }

  exitCave() {
    const { sx, sy, tx, ty } = this.loc.back;
    this.loadOverworld(sx, sy);
    this.player.standAt(tx, ty);
    this.player.dir = 'down';
    this.writeSave();
  }

  // ---------------- collision / queries ----------------

  solidAt(px, py, opts = {}) {
    if (px < 0 || py < 0 || px >= PLAY_W || py >= PLAY_H) return true;
    if (this.loc.kind === 'cave') return false;
    const tx = (px / TILE) | 0, ty = (py / TILE) | 0;
    const ch = this.grid[ty][tx];
    if (this.loc.kind === 'over') {
      return !(overWalkable(ch) || ch === 'V');
    }
    // dungeon
    const door = this.doorAt(tx, ty);
    if (door) return !this.doorPassable(door);
    if (opts.projectile) return ch === '#' || ch === 'B' || ch === 'P' || ch === 'S';
    return !DUNG_WALK.has(ch);
  }

  randomSpawnTile() {
    const p = this.player;
    for (let i = 0; i < 60; i++) {
      const tx = 1 + ((Math.random() * (SCREEN_TW - 2)) | 0);
      const ty = 1 + ((Math.random() * (SCREEN_TH - 2)) | 0);
      const ch = this.grid[ty][tx];
      const ok = this.loc.kind === 'over' ? (ch === '.' || ch === ',' || ch === 's' || ch === 'd' || ch === 'G') : ch === '.';
      if (!ok) continue;
      const dx = tx * TILE - p.x, dy = ty * TILE - p.y;
      if (dx * dx + dy * dy < 56 * 56) continue;
      return [tx, ty];
    }
    return null;
  }

  randomWaterTile() {
    const spots = [];
    for (let ty = 0; ty < SCREEN_TH; ty++) {
      for (let tx = 1; tx < SCREEN_TW - 1; tx++) {
        if (this.grid[ty][tx] === 'w') spots.push([tx, ty]);
      }
    }
    if (!spots.length) return null;
    return spots[(Math.random() * spots.length) | 0];
  }

  randomFloorTile(big = false) {
    const p = this.player;
    for (let i = 0; i < 60; i++) {
      const tx = 2 + ((Math.random() * (SCREEN_TW - (big ? 6 : 4))) | 0);
      const ty = 2 + ((Math.random() * (SCREEN_TH - (big ? 5 : 4))) | 0);
      if (this.grid[ty][tx] !== '.') continue;
      if (big && (this.grid[ty][tx + 1] !== '.' || this.grid[ty + 1][tx] !== '.')) continue;
      const dx = tx * TILE - p.x, dy = ty * TILE - p.y;
      if (dx * dx + dy * dy < (big ? 56 : 40) ** 2) continue;
      return [tx, ty];
    }
    return null;
  }

  // ---------------- items / combat ----------------

  playerSwing() {
    if (this.save.hp === this.maxHp) {
      const [dx, dy] = this.player.facing();
      this.projs.push({
        kind: 'beam', x: this.player.x + dx * 10, y: this.player.y + dy * 10,
        vx: dx * 3.5, vy: dy * 3.5, t: 0,
      });
      this.sound.beam();
    }
  }

  useBItem() {
    const s = this.save;
    const p = this.player;
    if (s.bItem === 'boomerang' && s.items.boomerang && !this.boomerangOut) {
      const [dx, dy] = p.facing();
      this.projs.push({ kind: 'boomerang', x: p.x + 4, y: p.y + 4, vx: dx * 3.2, vy: dy * 3.2, state: 'out', t: 0 });
      this.boomerangOut = true;
    } else if (s.bItem === 'bombs') {
      if (s.bombs <= 0) { this.sound.deny(); return; }
      const [dx, dy] = p.facing();
      const bx = (((p.x + 8 + dx * 18) / TILE) | 0) * TILE;
      const by = (((p.y + 8 + dy * 18) / TILE) | 0) * TILE;
      s.bombs--;
      this.bombs.push({ x: bx, y: by, t: 95 });
      this.sound.bombLay();
    } else if (s.bItem === 'candle' && s.items.candle) {
      if (this.flames.length) { this.sound.deny(); return; }
      const [dx, dy] = p.facing();
      this.flames.push({ x: p.x + dx * 14, y: p.y + dy * 14, vx: dx * 1.1, vy: dy * 1.1, t: 0 });
      this.sound.flame();
    }
  }

  autoSelectB() {
    const s = this.save;
    if (s.bItem) return;
    if (s.items.boomerang) s.bItem = 'boomerang';
    else if (s.bombs > 0) s.bItem = 'bombs';
    else if (s.items.candle) s.bItem = 'candle';
  }

  takeDrop(d) {
    if (d.dead) return;
    d.dead = true;
    const s = this.save;
    switch (d.kind) {
      case 'heart': s.hp = Math.min(this.maxHp, s.hp + 2); this.sound.heart(); break;
      case 'gem1': s.gems = Math.min(255, s.gems + 1); this.sound.gem(); break;
      case 'gem5': s.gems = Math.min(255, s.gems + 5); this.sound.gem(); break;
      case 'bomb': s.bombs = Math.min(8, s.bombs + 4); s.flags.hadBombs = true; this.sound.pickup(); this.autoSelectB(); break;
      case 'fairy': s.hp = this.maxHp; this.sound.pickup(); break;
    }
  }

  giveItem(kind, amount = 0) {
    const s = this.save;
    switch (kind) {
      case 'sword': s.items.sword = Math.max(s.items.sword || 0, 1); break;
      case 'wsword': s.items.sword = 2; break;
      case 'boomerang': s.items.boomerang = 1; break;
      case 'candle': s.items.candle = 1; break;
      case 'bombs': s.bombs = Math.min(8, s.bombs + 4); s.flags.hadBombs = true; break;
      case 'key': s.keys = Math.min(9, s.keys + 1); break;
      case 'map': s.items[`map_${this.loc.d}`] = 1; break;
      case 'compass': s.items[`compass_${this.loc.d}`] = 1; break;
      case 'container': s.hearts = Math.min(8, s.hearts + 1); s.hp = this.maxHp; break;
      case 'gems': s.gems = Math.min(255, s.gems + amount); break;
      case 'fairy': s.hp = this.maxHp; break;
      case 'shard': s.shards[this.loc.d] = true; break;
    }
    this.autoSelectB();
  }

  takeFloorItem(it) {
    if (it.dead) return;
    const s = this.save;
    if (it.shop) {
      if (it.kind === 'candle' && s.items.candle) { this.sound.deny(); return; }
      if (it.kind === 'bombs' && s.bombs >= 8) { this.sound.deny(); return; }
      if (s.gems < it.price) { this.sound.deny(); return; }
      s.gems -= it.price;
      this.giveItem(it.kind);
      this.sound.buy();
      it.dead = true;
      this.showBanner(ITEM_INFO[it.kind]);
      this.writeSave();
      return;
    }
    it.dead = true;
    if (it.flag) this.save.flags[it.flag] = true;
    this.giveItem(it.kind, it.amount);
    const p = this.player;
    switch (it.kind) {
      case 'key': this.sound.key(); break;
      case 'gems': this.sound.gem(); break;
      case 'fairy': this.sound.pickup(); break;
      case 'map': case 'compass': this.sound.pickup(); this.showBanner(ITEM_INFO[it.kind]); break;
      case 'shard':
        p.liftT = 90; p.liftItem = 'it_shard';
        this.sound.shardFanfare();
        this.showBanner(this.shardCount >= 3 ? 'THE AMULET CALLS TO MOUNT MOORE!' : 'AMULET SHARD GET!');
        break;
      case 'container':
        p.liftT = 60; p.liftItem = 'it_container';
        this.sound.itemFanfare();
        this.showBanner(ITEM_INFO.container);
        break;
      default:
        p.liftT = 60; p.liftItem = `it_${it.kind === 'wsword' ? 'wsword' : it.kind}`;
        this.sound.itemFanfare();
        this.showBanner(ITEM_INFO[it.kind] || '');
    }
    this.writeSave();
  }

  onBossDeath(e) {
    const d = this.loc.d;
    this.save.flags[`K:${d}`] = true;
    this.sound.bossDie();
    for (let i = 0; i < 5; i++) {
      this.fx.push({ kind: 'boom', x: e.x + Math.random() * 24 - 4, y: e.y + Math.random() * 24 - 4, t: -i * 6 });
    }
    if (!this.save.flags[`HC:${d}`]) {
      this.floorItems.push({ kind: 'container', x: e.x + 8, y: e.y + 8, flag: `HC:${d}` });
    }
    this.sound.playMusic(d === 'lair' ? 'lair' : 'dungeon');
    this.writeSave();
  }

  // ---------------- scrolling ----------------

  startScroll(dir) {
    const { kind } = this.loc;
    let next;
    if (kind === 'over') {
      const [dx, dy] = DIRS[dir];
      const sx = this.loc.sx + dx, sy = this.loc.sy + dy;
      if (!OVERWORLD[`${sx},${sy}`]) return;
      next = { kind: 'over', sx, sy };
    } else {
      const [dx, dy] = DIRS[dir];
      const rx = this.loc.rx + dx, ry = this.loc.ry + dy;
      if (!DUNGEONS[this.loc.d].rooms[`${rx},${ry}`]) return;
      next = { kind: 'dung', d: this.loc.d, rx, ry };
    }
    this.scroll = {
      dir, t: 0, from: this.loc, to: next,
      fromGrid: this.grid, fromDoors: this.doors, fromTheme: this.room ? DUNGEONS[this.loc.d].theme : null,
      px: this.player.x, py: this.player.y,
    };
    this.state = 'scroll';
  }

  finishScroll() {
    const to = this.scroll.to;
    const dir = this.scroll.dir;
    if (to.kind === 'over') this.loadOverworld(to.sx, to.sy);
    else this.loadDungeonRoom(to.d, to.rx, to.ry);
    const p = this.player;
    if (to.kind === 'dung') {
      if (dir === 'n') { p.x = 120; p.y = PLAY_H - 18; }
      if (dir === 's') { p.x = 120; p.y = 2; }
      if (dir === 'e') { p.x = 2; p.y = 78; }
      if (dir === 'w') { p.x = PLAY_W - 18; p.y = 78; }
    } else {
      if (dir === 'n') p.y = PLAY_H - 16.5;
      if (dir === 's') p.y = 0.5;
      if (dir === 'e') p.x = 0.5;
      if (dir === 'w') p.x = PLAY_W - 16.5;
    }
    this.scroll = null;
    this.state = 'play';
    this.writeSave();
  }

  // ---------------- update: play ----------------

  update() {
    this.frame++;
    this.input.pollGamepad();
    this.sound.updateMusic();
    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'story': this.updateStory(); break;
      case 'play': this.updatePlay(); break;
      case 'scroll': this.updateScroll(); break;
      case 'pause': this.updatePause(); break;
      case 'dead': this.updateDead(); break;
      case 'ending': this.updateEnding(); break;
    }
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.input.endFrame();
  }

  updateTitle() {
    this.sound.playMusic('title');
    if (this.input.pressed('up') || this.input.pressed('down')) {
      if (this.hasSave) this.titleSel = 1 - this.titleSel;
    }
    if (this.input.pressed('start') || this.input.pressed('a')) {
      if (this.hasSave && this.titleSel === 1) { this.startGame(true); return; }
      this.storyPage = 0;
      this.state = 'story';
    }
  }

  updateStory() {
    if (this.input.pressed('start') || this.input.pressed('a')) {
      this.storyPage++;
      if (this.storyPage >= STORY.length) this.startGame(false);
    }
  }

  updatePlay() {
    this.save.time++;
    if (this.bannerT > 0) this.bannerT--;

    // dialog freezes the world
    if (this.dialog) {
      const d = this.dialog;
      d.t++;
      const total = d.lines.join('').length;
      if (d.ci < total) {
        if (d.t % 2 === 0) { d.ci++; if (d.ci % 3 === 0) this.sound.text(); }
        if (this.input.pressed('a') || this.input.pressed('start')) d.ci = total;
      } else if (this.input.pressed('a') || this.input.pressed('start')) {
        const then = d.then;
        this.dialog = null;
        if (then) then();
      }
      return;
    }

    if (this.input.pressed('start')) {
      this.state = 'pause';
      this.pauseSel = 0;
      return;
    }

    const p = this.player;
    p.update(this);

    // edge transitions
    if (this.loc.kind !== 'cave') {
      if (p.x <= 0.4 && this.input.down('left')) { this.startScroll('w'); return; }
      if (p.x >= PLAY_W - 16.4 && this.input.down('right')) { this.startScroll('e'); return; }
      if (p.y <= 0.4 && this.input.down('up')) { this.startScroll('n'); return; }
      if (p.y >= PLAY_H - 16.4 && this.input.down('down')) {
        if (this.loc.kind === 'dung' && this.room.exits.s === 'exit') { this.exitDungeon(); return; }
        this.startScroll('s');
        return;
      }
    } else if (p.y >= PLAY_H - 18 && this.input.down('down')) {
      this.exitCave();
      return;
    }

    // tile triggers (overworld)
    if (this.loc.kind === 'over') {
      const tx = ((p.x + 8) / TILE) | 0, ty = ((p.y + 8) / TILE) | 0;
      const ch = this.grid[ty][tx];
      if (ch === 'c' || ch === 'S') {
        const id = this.caveMap[`${tx},${ty}`];
        if (id) { this.enterCave(id, { sx: this.loc.sx, sy: this.loc.sy, tx, ty: ty + 1 }); return; }
      } else if (ch === '1' || ch === '2' || ch === '3') {
        this.enterDungeon(ENTRANCES[ch]); return;
      } else if (ch === 'V') {
        this.enterDungeon('lair'); return;
      }
      // lava-free overworld; nothing else hurts by tile
    } else if (this.loc.kind === 'dung') {
      // lava hurts
      const cx = p.x + 8, cy = p.y + 11;
      if (this.grid[(cy / TILE) | 0][(cx / TILE) | 0] === 'L' && p.invulnT === 0) {
        p.hurt(this, 1, cx, cy + 8);
      }
      this.checkLockedDoors();
      this.checkPushBlock();
      // princess
      if (this.room.princess && !this.save.flags.ended) {
        const pr = { x: 120, y: 40, w: 16, h: 16 };
        if (overlap(pr, p.rect())) {
          this.say([
            'MOORE! YOU CAME.',
            'THE SHARDS... AT LAST.',
            'LET THE AMULET BE WHOLE,',
            'AND THE SHADOW BE GONE.',
          ], () => {
            this.save.flags.ended = true;
            this.writeSave();
            this.state = 'ending';
            this.endT = 0;
            this.sound.playMusic('ending');
          });
          return;
        }
      }
    }

    // cave interactions
    if (this.loc.kind === 'cave') {
      this.caveT++;
      for (const it of this.floorItems) {
        if (it.dead) continue;
        if (overlap({ x: it.x - 2, y: it.y - 2, w: 14, h: 16 }, p.rect())) this.takeFloorItem(it);
      }
      this.floorItems = this.floorItems.filter((i) => !i.dead);
      return; // no enemies/projectiles in caves
    }

    // floor items
    for (const it of this.floorItems) {
      if (it.dead) continue;
      if (overlap({ x: it.x, y: it.y, w: 14, h: 14 }, p.rect())) this.takeFloorItem(it);
    }
    this.floorItems = this.floorItems.filter((i) => !i.dead);

    // enemies
    const wasSealed = this.roomSealed && this.loc.kind === 'dung' ? this.roomSealed() : false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      updateEnemy(this, e);
      if (!enemyActive(e)) continue;
      const er = enemyRect(e);
      // contact
      if (p.invulnT === 0 && overlap(er, p.rect())) {
        p.hurt(this, CONTACT_DMG[e.type] || 1, e.x + 8, e.y + 8);
      }
      // sword
      const sr = p.swordRect();
      if (sr && e.hurtT === 0 && overlap(sr, er)) {
        damageEnemy(this, e, this.save.items.sword === 2 ? 2 : 1, 'sword', p.x, p.y);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.loc.kind === 'dung' && wasSealed && !this.roomSealed()) this.sound.doorOpen();

    updateProjs(this);
    updateEprojs(this);
    updateDrops(this);
    this.updateBombs();
    this.updateFlames();
    this.updateFx();

    // low health beep
    if (this.save.hp <= 2 && this.save.hp > 0 && this.frame % 32 === 0) this.sound.lowHp();

    if (this.save.hp <= 0) {
      this.state = 'dead';
      this.deadT = 0;
      this.deadSel = 0;
      this.save.deaths++;
      this.sound.stopMusic();
      this.sound.gameOver();
      this.writeSave();
    }
  }

  checkLockedDoors() {
    const p = this.player;
    const [dx, dy] = p.facing();
    const pressing =
      (dx < 0 && this.input.down('left')) || (dx > 0 && this.input.down('right')) ||
      (dy < 0 && this.input.down('up')) || (dy > 0 && this.input.down('down'));
    if (!pressing) return;
    const tx = ((p.x + 8 + dx * 14) / TILE) | 0;
    const ty = ((p.y + 8 + dy * 14) / TILE) | 0;
    if (tx < 0 || ty < 0 || tx >= SCREEN_TW || ty >= SCREEN_TH) return;
    const door = this.doorAt(tx, ty);
    if (door && door.type === 'lock' && !this.save.flags[`L:${door.edge}`] && !this.roomSealed()) {
      if (this.save.keys > 0) {
        this.save.keys--;
        this.save.flags[`L:${door.edge}`] = true;
        this.sound.unlock();
        this.writeSave();
      }
    }
  }

  checkPushBlock() {
    if (this.room.puzzle !== 'push' || this.pushed) return;
    const p = this.player;
    const [dx, dy] = p.facing();
    const pressing =
      (dx < 0 && this.input.down('left')) || (dx > 0 && this.input.down('right')) ||
      (dy < 0 && this.input.down('up')) || (dy > 0 && this.input.down('down'));
    if (!pressing) { this.pushT = 0; return; }
    const tx = ((p.x + 8 + dx * 12) / TILE) | 0;
    const ty = ((p.y + 8 + dy * 12) / TILE) | 0;
    if (this.grid[ty]?.[tx] === 'P') {
      this.pushT = (this.pushT || 0) + 1;
      if (this.pushT > 24) {
        const nx = tx + dx, ny = ty + dy;
        if (this.grid[ny]?.[nx] === '.') {
          this.grid[ty][tx] = '.';
          this.grid[ny][nx] = 'B';
        }
        this.pushed = true;
        this.pushT = 0;
        this.sound.push();
        this.sound.secret();
      }
    } else this.pushT = 0;
  }

  updateBombs() {
    for (const b of this.bombs) {
      b.t--;
      if (b.t <= 0) {
        b.dead = true;
        this.fx.push({ kind: 'boom', x: b.x, y: b.y, t: 0 });
        this.sound.boom();
        const cx = b.x + 8, cy = b.y + 8;
        // damage enemies
        for (const e of this.enemies) {
          if (e.dead || !enemyActive(e)) continue;
          const er = enemyRect(e);
          const ex = er.x + er.w / 2, ey = er.y + er.h / 2;
          if ((ex - cx) ** 2 + (ey - cy) ** 2 < 30 * 30) damageEnemy(this, e, 4, 'bomb', cx, cy);
        }
        // hurt the player if close
        const p = this.player;
        if ((p.x + 8 - cx) ** 2 + (p.y + 8 - cy) ** 2 < 22 * 22) p.hurt(this, 1, cx, cy);
        // overworld secret walls
        if (this.loc.kind === 'over') {
          const s = this.screen.secret;
          if (s && s.type === 'bomb' && !this.save.flags[`S:${this.loc.sx},${this.loc.sy}`]) {
            const sx = s.tx * TILE + 8, sy = s.ty * TILE + 8;
            if ((sx - cx) ** 2 + (sy - cy) ** 2 < 28 * 28) {
              this.save.flags[`S:${this.loc.sx},${this.loc.sy}`] = true;
              this.grid[s.ty][s.tx] = 'c';
              this.caveMap[`${s.tx},${s.ty}`] = s.cave;
              this.sound.secret();
              this.writeSave();
            }
          }
        } else {
          // dungeon bomb doors
          for (const d of this.doors) {
            if (d.type !== 'bomb' || this.save.flags[`B:${d.edge}`]) continue;
            for (const [tx, ty] of d.cells) {
              const sx = tx * TILE + 8, sy = ty * TILE + 8;
              if ((sx - cx) ** 2 + (sy - cy) ** 2 < 30 * 30) {
                this.save.flags[`B:${d.edge}`] = true;
                this.sound.secret();
                this.writeSave();
                break;
              }
            }
          }
        }
      }
    }
    this.bombs = this.bombs.filter((b) => !b.dead);
  }

  updateFlames() {
    for (const f of this.flames) {
      f.t++;
      if (f.t < 18) { f.x += f.vx; f.y += f.vy; }
      if (f.t > 85) f.dead = true;
      // hurt enemies
      for (const e of this.enemies) {
        if (e.dead || !enemyActive(e) || e.hurtT > 0) continue;
        if (overlap({ x: f.x, y: f.y, w: 8, h: 10 }, enemyRect(e))) {
          damageEnemy(this, e, 1, 'flame', f.x, f.y);
        }
      }
      // burn secret bushes
      if (this.loc.kind === 'over') {
        const s = this.screen.secret;
        if (s && s.type === 'burn' && !this.save.flags[`S:${this.loc.sx},${this.loc.sy}`]) {
          const bx = s.tx * TILE, by = s.ty * TILE;
          if (overlap({ x: f.x, y: f.y, w: 8, h: 10 }, { x: bx, y: by, w: 16, h: 16 })) {
            this.save.flags[`S:${this.loc.sx},${this.loc.sy}`] = true;
            this.grid[s.ty][s.tx] = 'S';
            this.caveMap[`${s.tx},${s.ty}`] = s.cave;
            this.sound.secret();
            this.writeSave();
          }
        }
      }
    }
    this.flames = this.flames.filter((f) => !f.dead);
  }

  updateFx() {
    for (const f of this.fx) {
      f.t++;
      if (f.t > (f.kind === 'boom' ? 26 : 18)) f.dead = true;
    }
    this.fx = this.fx.filter((f) => !f.dead);
  }

  updateScroll() {
    const s = this.scroll;
    s.t++;
    if (s.t >= SCROLL_T) this.finishScroll();
  }

  updatePause() {
    if (this.input.pressed('start')) { this.state = 'play'; return; }
    const owned = this.ownedBItems();
    if (owned.length) {
      const idx = Math.max(0, owned.indexOf(this.save.bItem));
      if (this.input.pressed('left')) {
        this.save.bItem = owned[(idx + owned.length - 1) % owned.length];
        this.sound.text();
      } else if (this.input.pressed('right')) {
        this.save.bItem = owned[(idx + 1) % owned.length];
        this.sound.text();
      }
      if (!this.save.bItem) this.save.bItem = owned[0];
    }
  }

  ownedBItems() {
    const s = this.save;
    const list = [];
    if (s.items.boomerang) list.push('boomerang');
    if (s.bombs > 0 || s.flags.hadBombs) list.push('bombs');
    if (s.items.candle) list.push('candle');
    return list;
  }

  updateDead() {
    this.deadT++;
    if (this.deadT < 90) return;
    if (this.input.pressed('up') || this.input.pressed('down')) this.deadSel = 1 - this.deadSel;
    if (this.input.pressed('start') || this.input.pressed('a')) {
      if (this.deadSel === 0) {
        // continue
        this.save.hp = Math.min(6, this.maxHp);
        this.writeSave();
        this.player = new Player();
        if (this.loc.kind === 'dung' ) {
          const d = this.loc.d;
          const dung = DUNGEONS[d];
          const [rx, ry] = dung.entry.split(',').map(Number);
          this.loadDungeonRoom(d, rx, ry);
          this.player.x = 120; this.player.y = PLAY_H - 18;
          this.player.dir = 'up';
        } else {
          this.loadOverworld(START.sx, START.sy);
          this.player.standAt(START.tx, START.ty);
        }
        this.state = 'play';
      } else {
        this.state = 'title';
        this.titleSel = this.hasSave ? 1 : 0;
      }
    }
  }

  updateEnding() {
    this.endT++;
    if (this.endT > 420 && this.input.pressed('start')) {
      this.state = 'title';
      this.titleSel = 1;
    }
  }

  // ---------------- drawing ----------------

  draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    switch (this.state) {
      case 'title': this.drawTitle(); return;
      case 'story': this.drawStory(); return;
      case 'ending': this.drawEnding(); return;
      case 'pause': this.drawPause(); return;
      case 'dead': this.drawDead(); return;
    }
    // play / scroll
    ctx.save();
    ctx.translate(0, HUD_H);
    ctx.beginPath();
    ctx.rect(0, 0, PLAY_W, PLAY_H);
    ctx.clip();
    if (this.state === 'scroll') this.drawScroll();
    else this.drawField();
    ctx.restore();
    this.drawHUD();
    if (this.banner && this.bannerT > 0 && this.state === 'play') {
      const alpha = Math.min(1, this.bannerT / 30);
      ctx.globalAlpha = alpha;
      text(ctx, this.banner, 128, HUD_H + 6, '#f8d838', 8, 'center');
      ctx.globalAlpha = 1;
    }
    if (this.dialog) this.drawDialog();
  }

  drawFieldTiles(grid, doors, theme, ox = 0, oy = 0) {
    for (let ty = 0; ty < SCREEN_TH; ty++) {
      for (let tx = 0; tx < SCREEN_TW; tx++) {
        const ch = grid[ty][tx];
        const x = tx * TILE + ox, y = ty * TILE + oy;
        if (theme) drawDungTile(ctx, ch, x, y, this.frame, theme);
        else drawOverTile(ctx, ch === 'V' ? '1' : ch, x, y, this.frame);
      }
    }
    if (theme && doors) {
      for (const d of doors) this.drawDoor(d, theme, ox, oy);
    }
  }

  drawDoor(door, theme, ox, oy) {
    const set = DT[theme];
    const pass = this.doorPassable(door);
    const [tx0, ty0] = door.cells[0];
    const x = tx0 * TILE + ox, y = ty0 * TILE + oy;
    const wide = door.cells.length === 2;
    const w = wide ? 32 : 16, h = 16;
    if (door.type === 'bomb' && !this.save.flags[`B:${door.edge}`]) return; // hidden: plain wall
    // opening
    ctx.fillStyle = '#101010';
    ctx.fillRect(x + (wide ? 6 : 2), y + 2, w - (wide ? 12 : 4), h - 4);
    if (pass) {
      ctx.fillStyle = set.floorColor;
      ctx.fillRect(x + (wide ? 8 : 3), y + (wide ? 4 : 3), w - (wide ? 16 : 6), h - (wide ? 4 : 6));
    } else if (door.type === 'lock' && !this.save.flags[`L:${door.edge}`]) {
      ctx.fillStyle = '#c8c8d8';
      ctx.fillRect(x + (wide ? 10 : 4), y + 4, w - (wide ? 20 : 8), 9);
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(x + w / 2 - 1, y + 6, 3, 5);
    } else {
      // sealed slab
      ctx.fillStyle = '#787888';
      ctx.fillRect(x + (wide ? 8 : 3), y + 3, w - (wide ? 16 : 6), 11);
      ctx.fillStyle = '#484858';
      ctx.fillRect(x + (wide ? 8 : 3), y + 8, w - (wide ? 16 : 6), 2);
    }
  }

  drawField() {
    const loc = this.loc;
    if (loc.kind === 'cave') { this.drawCave(); return; }
    const theme = loc.kind === 'dung' ? DUNGEONS[loc.d].theme : null;
    this.drawFieldTiles(this.grid, this.doors, theme);

    // dark rooms
    if (loc.kind === 'dung' && this.room.dark) {
      ctx.fillStyle = this.save.items.candle ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, PLAY_W, PLAY_H);
    }

    for (const it of this.floorItems) this.drawFloorItem(it);
    drawDrops(ctx, this);
    for (const b of this.bombs) {
      if (b.t > 20 || (this.frame & 2)) drawSprite(ctx, 'it_bomb', b.x + 4, b.y + 2);
    }
    for (const f of this.flames) drawSprite(ctx, (this.frame & 4) ? 'fx_flame1' : 'fx_flame2', f.x, f.y);
    for (const e of this.enemies) drawEnemy(ctx, this, e);
    if (this.room && this.room.princess && !this.save.flags.ended) drawSprite(ctx, 'np_princess', 120, 40);
    this.player.draw(ctx, this);
    drawProjs(ctx, this);
    drawEprojs(ctx, this);
    for (const f of this.fx) {
      if (f.t < 0) continue;
      if (f.kind === 'poof') drawSprite(ctx, f.t < 9 ? 'fx_poof1' : 'fx_poof2', f.x, f.y);
      else drawSprite(ctx, f.t < 13 ? 'fx_boom1' : 'fx_boom2', f.x, f.y);
    }
  }

  drawFloorItem(it) {
    const name = {
      key: 'it_key', map: 'it_map', compass: 'it_compass', boomerang: 'it_boomer',
      gems: 'it_gem5', shard: 'it_shard', fairy: 'it_fairy', container: 'it_container',
      bombs: 'it_bomb', candle: 'it_candle', sword: 'it_sword', wsword: 'it_wsword',
    }[it.kind];
    if (!name) return;
    if (it.kind === 'shard' && (this.frame & 8)) drawSprite(ctx, 'fx_sparkle', it.x + 8, it.y - 6);
    drawSprite(ctx, name, it.x, it.y);
  }

  drawCave() {
    const cave = CAVES[this.loc.id];
    // fires
    drawSprite(ctx, 'fx_fire', 80, 48, (this.frame & 8) > 0);
    drawSprite(ctx, 'fx_fire', 160, 48, (this.frame & 8) === 0);
    if (cave.npc) drawSprite(ctx, `np_${cave.npc}`, 120, 48);
    // text
    let lines = cave.text;
    if (cave.needHearts && this.save.hearts < cave.needHearts) lines = cave.denyText;
    if (cave.give && this.save.flags[`C:${this.loc.id}`]) lines = ['...'];
    if (cave.gems && this.save.flags[`C:${this.loc.id}`]) lines = ['...'];
    const shown = Math.min(this.caveT >> 1, lines.join('').length);
    let used = 0;
    lines.forEach((l, i) => {
      const n = Math.max(0, Math.min(l.length, shown - used));
      used += l.length;
      if (n > 0) text(ctx, l.slice(0, n), 128, 14 + i * 11, '#fff', 8, 'center');
    });
    // items + prices
    for (const it of this.floorItems) {
      this.drawFloorItem(it);
      if (it.shop) {
        drawSprite(ctx, 'it_gem', it.x - 8, it.y + 18);
        text(ctx, `${it.price}`, it.x + 2, it.y + 20, '#fff', 8);
      }
    }
    this.player.draw(ctx, this);
  }

  drawScroll() {
    const s = this.scroll;
    const k = s.t / SCROLL_T;
    const [dx, dy] = DIRS[s.dir];
    const ox = Math.round(-dx * k * PLAY_W), oy = Math.round(-dy * k * PLAY_H);
    // old screen
    this.drawFieldTiles(s.fromGrid, s.fromDoors, s.fromTheme, ox, oy);
    // new screen
    const to = s.to;
    let grid, theme = null, doors = null;
    if (!s.toGrid) {
      // build a static preview grid for the incoming screen
      if (to.kind === 'over') {
        const sc = OVERWORLD[`${to.sx},${to.sy}`];
        grid = sc.rows.map((r) => r.split(''));
        if (sc.secret && this.save.flags[`S:${to.sx},${to.sy}`]) {
          grid[sc.secret.ty][sc.secret.tx] = sc.secret.type === 'burn' ? 'S' : 'c';
        }
        if (this.shardCount >= 3) {
          for (let y = 0; y < SCREEN_TH; y++) for (let x = 0; x < SCREEN_TW; x++) if (grid[y][x] === 'X') grid[y][x] = 'V';
        }
      } else {
        const dung = DUNGEONS[to.d];
        const room = dung.rooms[`${to.rx},${to.ry}`];
        grid = [];
        for (let y = 0; y < SCREEN_TH; y++) {
          const row = [];
          for (let x = 0; x < SCREEN_TW; x++) {
            if (y === 0 || y === SCREEN_TH - 1 || x === 0 || x === SCREEN_TW - 1) row.push('#');
            else row.push(room.rows[y - 1][x - 1]);
          }
          grid.push(row);
        }
      }
      s.toGrid = grid;
    }
    grid = s.toGrid;
    if (to.kind === 'dung') theme = DUNGEONS[to.d].theme;
    this.drawFieldTiles(grid, null, theme, ox + dx * PLAY_W, oy + dy * PLAY_H);
    // player slides to the far edge
    const p = this.player;
    const tx = s.dir === 'e' ? 0.5 : s.dir === 'w' ? PLAY_W - 16.5 : s.px;
    const ty = s.dir === 's' ? 0.5 : s.dir === 'n' ? PLAY_H - 16.5 : s.py;
    const ix = s.px + (tx - s.px) * k + (to.kind === 'dung' ? 0 : 0);
    const iy = s.py + (ty - s.py) * k;
    const saveX = p.x, saveY = p.y;
    p.x = ix; p.y = iy;
    p.draw(ctx, this);
    p.x = saveX; p.y = saveY;
  }

  drawDialog() {
    const d = this.dialog;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(16, HUD_H + 16, 224, 12 + d.lines.length * 12);
    let used = 0;
    d.lines.forEach((l, i) => {
      const n = Math.max(0, Math.min(l.length, d.ci - used));
      used += l.length;
      if (n > 0) text(ctx, l.slice(0, n), 128, HUD_H + 22 + i * 12, '#fff', 8, 'center');
    });
  }

  // ---------------- HUD ----------------

  drawHUD() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    const s = this.save;

    // minimap
    if (this.loc.kind === 'dung') {
      const d = this.loc.d;
      const dung = DUNGEONS[d];
      text(ctx, dung.level === 9 ? 'KEEP' : `LEVEL-${dung.level}`, 8, 4, '#fff', 8);
      const hasMap = !!s.items[`map_${d}`];
      const hasCompass = !!s.items[`compass_${d}`];
      for (const key of Object.keys(dung.rooms)) {
        const [rx, ry] = key.split(',').map(Number);
        const x = 8 + rx * 9, y = 16 + ry * 7;
        const cur = rx === this.loc.rx && ry === this.loc.ry;
        if (hasMap || cur) {
          ctx.fillStyle = '#3868c8';
          ctx.fillRect(x, y, 8, 6);
        }
        if (cur && (this.frame & 16)) {
          ctx.fillStyle = '#30e030';
          ctx.fillRect(x + 2, y + 1, 4, 4);
        }
        if (hasCompass && (dung.rooms[key].items || []).some((i) => i.kind === 'shard') && (this.frame & 16)) {
          ctx.fillStyle = '#f84020';
          ctx.fillRect(x + 2, y + 1, 4, 4);
        }
      }
    } else {
      ctx.fillStyle = '#181820';
      ctx.fillRect(8, 12, OW_W * 7 + 2, OW_H * 6 + 2);
      for (let y = 0; y < OW_H; y++) {
        for (let x = 0; x < OW_W; x++) {
          ctx.fillStyle = '#303040';
          ctx.fillRect(9 + x * 7, 13 + y * 6, 6, 5);
        }
      }
      if (this.loc.kind === 'over' && (this.frame & 16)) {
        ctx.fillStyle = '#30e030';
        ctx.fillRect(10 + this.loc.sx * 7, 14 + this.loc.sy * 6, 4, 3);
      }
    }

    // counters
    drawSprite(ctx, 'it_gem', 62, 8);
    text(ctx, `x${s.gems}`, 72, 9, '#fff', 8);
    drawSprite(ctx, 'it_key', 62, 24);
    text(ctx, `x${s.keys}`, 72, 26, '#fff', 8);
    drawSprite(ctx, 'it_bomb', 62, 40);
    text(ctx, `x${s.bombs}`, 72, 42, '#fff', 8);

    // B / A boxes
    const box = (x, label, spr) => {
      ctx.strokeStyle = '#5878f8';
      ctx.strokeRect(x + 0.5, 16.5, 17, 23);
      text(ctx, label, x + 6, 6, '#fff', 8);
      if (spr) {
        const c = SPR[spr];
        if (c) ctx.drawImage(c, x + 9 - (c.width >> 1), 28 - (c.height >> 1));
      }
    };
    const bspr = { boomerang: 'it_boomer', bombs: 'it_bomb', candle: 'it_candle' }[s.bItem];
    box(104, 'B', bspr);
    box(128, 'A', s.items.sword === 2 ? 'it_wsword' : s.items.sword ? 'it_sword' : null);

    // shards
    for (let i = 0; i < 3; i++) {
      const owned = this.shardCount > i;
      ctx.globalAlpha = owned ? 1 : 0.22;
      drawSprite(ctx, 'it_shard', 104 + i * 12, 46);
      ctx.globalAlpha = 1;
    }

    // hearts
    text(ctx, '-LIFE-', 186, 6, '#f84020', 8);
    for (let i = 0; i < s.hearts; i++) {
      const x = 178 + (i % 4) * 9, y = 18 + ((i / 4) | 0) * 10;
      const full = s.hp >= (i + 1) * 2, half = s.hp === i * 2 + 1;
      if (full) drawSprite(ctx, 'it_heart', x, y);
      else if (half) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, 4, 8); ctx.clip();
        drawSprite(ctx, 'it_heart', x, y);
        ctx.restore();
        ctx.globalAlpha = 0.25;
        drawSprite(ctx, 'it_heart', x, y);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 0.25;
        drawSprite(ctx, 'it_heart', x, y);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------------- menu screens ----------------

  drawTitle() {
    // sky gradient bands
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i < 4 ? '#101028' : i < 7 ? '#182040' : '#283060';
      ctx.fillRect(0, i * 24, VIEW_W, 24);
    }
    text(ctx, 'THE LEGEND OF', 128, 46, '#f8d838', 12, 'center');
    text(ctx, 'M O O R E', 128, 66, '#f8d838', 24, 'center');
    ctx.strokeStyle = '#f8d838';
    ctx.strokeRect(40.5, 40.5, 175, 60);
    const sc = SPR.it_shard;
    if (sc) {
      ctx.save();
      ctx.translate(116, 112);
      ctx.scale(2, 2);
      ctx.drawImage(sc, 0, 0);
      ctx.restore();
    }
    if (this.hasSave) {
      text(ctx, 'NEW QUEST', 128, 156, this.titleSel === 0 ? '#fff' : '#667', 8, 'center');
      text(ctx, 'CONTINUE', 128, 170, this.titleSel === 1 ? '#fff' : '#667', 8, 'center');
      text(ctx, '>', 92, this.titleSel === 0 ? 156 : 170, '#f8d838', 8);
    } else if ((this.frame >> 5) & 1) {
      text(ctx, 'PRESS START', 128, 160, '#fff', 8, 'center');
    }
    text(ctx, 'MOORE ARCADE 2026', 128, 210, '#556', 8, 'center');
    text(ctx, 'ORIGINAL ART AND MUSIC', 128, 222, '#556', 8, 'center');
  }

  drawStory() {
    const page = STORY[this.storyPage] || [];
    page.forEach((l, i) => text(ctx, l, 128, 40 + i * 14, '#c8d0d8', 8, 'center'));
    if ((this.frame >> 5) & 1) text(ctx, 'PRESS START', 128, 210, '#fff', 8, 'center');
  }

  drawPause() {
    this.drawHUD();
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    text(ctx, 'INVENTORY', 128, HUD_H + 10, '#f8d838', 8, 'center');

    const owned = this.ownedBItems();
    text(ctx, 'USE B FOR:', 40, HUD_H + 34, '#99a', 8);
    const names = { boomerang: 'it_boomer', bombs: 'it_bomb', candle: 'it_candle' };
    owned.forEach((k, i) => {
      const x = 110 + i * 34;
      if (this.save.bItem === k) {
        ctx.strokeStyle = (this.frame & 16) ? '#f8d838' : '#c06000';
        ctx.strokeRect(x - 5.5, HUD_H + 28.5, 20, 20);
      }
      drawSprite(ctx, names[k], x, HUD_H + 32);
    });
    if (!owned.length) text(ctx, '- NONE -', 128, HUD_H + 34, '#556', 8);

    // treasures
    const ty = HUD_H + 66;
    text(ctx, 'TREASURES:', 40, ty, '#99a', 8);
    let x = 110;
    if (this.save.items.sword) { drawSprite(ctx, this.save.items.sword === 2 ? 'it_wsword' : 'it_sword', x, ty - 2); x += 16; }
    if (this.save.items.boomerang) { drawSprite(ctx, 'it_boomer', x, ty); x += 16; }
    if (this.save.items.candle) { drawSprite(ctx, 'it_candle', x, ty - 2); x += 16; }
    if (this.loc.kind === 'dung') {
      if (this.save.items[`map_${this.loc.d}`]) { drawSprite(ctx, 'it_map', x, ty - 2); x += 16; }
      if (this.save.items[`compass_${this.loc.d}`]) { drawSprite(ctx, 'it_compass', x, ty - 2); x += 16; }
    }

    // amulet
    text(ctx, 'THE AMULET OF MOORULE', 128, HUD_H + 96, '#99a', 8, 'center');
    for (let i = 0; i < 3; i++) {
      const ownedShard = this.shardCount > i;
      ctx.globalAlpha = ownedShard ? 1 : 0.2;
      ctx.save();
      ctx.translate(96 + i * 24, HUD_H + 110);
      ctx.scale(2, 2);
      ctx.drawImage(SPR.it_shard, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    text(ctx, 'ENTER TO RESUME', 128, VIEW_H - 16, '#556', 8, 'center');
  }

  drawDead() {
    if (this.deadT < 40) {
      ctx.fillStyle = `rgba(192,40,24,${(40 - this.deadT) / 60})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.deadT < 90) return;
    text(ctx, 'GAME OVER', 128, 80, '#f84020', 16, 'center');
    text(ctx, 'CONTINUE', 128, 130, this.deadSel === 0 ? '#fff' : '#667', 8, 'center');
    text(ctx, 'TITLE', 128, 146, this.deadSel === 1 ? '#fff' : '#667', 8, 'center');
    text(ctx, '>', 96, this.deadSel === 0 ? 130 : 146, '#f8d838', 8);
  }

  drawEnding() {
    const t = this.endT;
    drawSprite(ctx, 'np_princess', 108, 96);
    drawSprite(ctx, 'm_down1', 132, 96);
    if (t > 60) {
      ctx.save();
      ctx.translate(112, 48);
      ctx.scale(2, 2);
      ctx.drawImage(SPR.it_amulet, 0, 0);
      ctx.restore();
      if ((this.frame & 8) && t < 200) drawSprite(ctx, 'fx_sparkle', 120 + ((t * 7) % 24), 44 + ((t * 3) % 16));
    }
    ENDING.forEach((l, i) => {
      if (t > 120 + i * 30) text(ctx, l, 128, 130 + i * 13, '#c8d0d8', 8, 'center');
    });
    if (t > 340) {
      const s = this.save;
      text(ctx, `TIME ${Math.floor(s.time / 3600)} MIN - DEATHS ${s.deaths}`, 128, 206, '#f8d838', 8, 'center');
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
