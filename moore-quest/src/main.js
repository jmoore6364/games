// Moore Quest: The Ashen Road — roaming, towns, dialogue, menus, quests.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, drawSprite, drawWalker, drawTile, drawWindow, SPR } from './sprites.js';
import {
  TILE, W_W, W_H, WORLD, MAPS, TOWN_AT, CAVE_AT, walkable, BUMPS, START_POS,
  ITEMS, GEAR, SHOPS, PARTY_DEFS, SKILLS, ENEMIES, ZONES, TERRAIN_RATE,
  DOCKS, WORLD_BOSSES, SHIP_HOME, SEA_ENCOUNTERS, STORY, ENDING, xpForLevel, validateWorld,
} from './world.js';
import { Battle, eAtk, eDef, knownSkills } from './battle.js';

const VIEW_W = 256, VIEW_H = 240;
const SAVE_KEY = 'moore-quest-save';

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

const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

function makeChar(id, level) {
  const d = PARTY_DEFS[id];
  const c = {
    id, name: d.name, sprite: d.sprite, level, xp: xpForLevel(level),
    weapon: d.weapon, armor: d.armor,
    maxhp: d.base.hp, maxmp: d.base.mp,
    atk: d.base.atk, def: d.base.def, spd: d.base.spd, mag: d.base.mag,
  };
  for (let l = 1; l < level; l++) {
    c.maxhp += d.growth.hp; c.maxmp += d.growth.mp;
    c.atk += d.growth.atk; c.def += d.growth.def;
    c.spd += d.growth.spd; c.mag += d.growth.mag;
  }
  c.hp = c.maxhp; c.mp = c.maxmp;
  return c;
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
    this.dialog = null;
    this.banner = null;
    this.bannerT = 0;
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
      gold: 30,
      inv: { potion: 2 },
      flags: {},
      party: [makeChar('moore', 1)],
      pos: { map: 'emberwick', x: 12, y: 13, dir: 'up' },
      lastInn: { map: 'emberwick', x: 12, y: 13 },
      shipPos: null, sailing: false,
      steps: 0, time: 0, battles: 0,
    };
  }

  writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); this.hasSave = true; } catch { /* ignore */ }
  }

  get party() { return this.save.party; }

  startGame(fromSave) {
    this.save = fromSave ? JSON.parse(localStorage.getItem(SAVE_KEY)) : this.freshSave();
    const p = this.save.pos;
    this.loadMap(p.map, p.x, p.y, p.dir);
    this.state = 'roam';
    if (!fromSave) {
      this.say([
        'MAYOR ALDOUS:',
        'MOORE, LAD. THIS LANTERN',
        'HOLDS THE EVERFLAME -- THE',
        'LAST HONEST FIRE IN MOORULE.',
        'CARRY IT TO THE GREAT HEARTH',
        'ATOP THE WORLDSPIRE,',
        'AND LIGHT IT ANEW.',
      ], () => {
        this.save.flags.ember = true;
        this.sound.itemGet();
        this.say(['RECEIVED THE EVERFLAME!'], () => this.writeSave());
      });
    }
  }

  // ---------------- map handling ----------------

  mapDef() { return this.mapId === 'world' ? null : MAPS[this.mapId]; }
  mapW() { return this.mapId === 'world' ? W_W : MAPS[this.mapId].rows[0].length; }
  mapH() { return this.mapId === 'world' ? W_H : MAPS[this.mapId].rows.length; }

  rawTile(x, y) {
    if (x < 0 || y < 0 || x >= this.mapW() || y >= this.mapH()) return null;
    return this.mapId === 'world' ? WORLD[y][x] : MAPS[this.mapId].rows[y][x];
  }

  effTile(x, y) {
    let ch = this.rawTile(x, y);
    const f = this.save.flags;
    if (ch === 'B' && f.brann) ch = 'b';
    if (ch === 'M' && f.mistGone) ch = 'p';
    if (ch === 'G' && f.gateOpen) ch = 'p';
    if (ch === 'X' && f[`chest:${this.mapId}:${x},${y}`]) ch = 'x';
    return ch;
  }

  npcAt(x, y) {
    const m = this.mapDef();
    if (!m) return null;
    for (const n of this.npcs) {
      if (n.hidden) continue;
      if (n.x === x && n.y === y) return n;
    }
    return null;
  }

  isBlocked(x, y) {
    const ch = this.effTile(x, y);
    if (ch === null) return this.mapId !== 'world' && this.mapDef().kind === 'town' ? false : true;
    if (!walkable(ch)) return true;
    if (this.npcAt(x, y)) return true;
    return false;
  }

  loadMap(id, x, y, dir = 'down') {
    this.mapId = id;
    const m = this.mapDef();
    this.player = { x, y, dir, ox: 0, oy: 0, moving: false, anim: 0 };
    this.trail = [{ x, y, dir }, { x, y, dir }, { x, y, dir }, { x, y, dir }];
    this.justArrived = true;
    this.npcs = (m?.npcs || []).map((n) => ({ ...n, home: { x: n.x, y: n.y }, t: 30 + ((Math.random() * 60) | 0), dir: 'down', hidden: this.npcHidden(n) }));
    this.save.pos = { map: id, x, y, dir };
    if (id === 'world') this.save.lastWorld = { x, y };
    this.stepsSinceBattle = 0;
    this.sound.playMusic(id === 'world' ? 'over' : m.music);
    if (m?.name) this.showBanner(m.name);
  }

  npcHidden(n) {
    if (n.role === 'brann' && this.save.flags.brann) return true;
    if (n.role === 'lyra' && this.save.flags.lyra) return true;
    return false;
  }

  showBanner(str) { this.banner = str; this.bannerT = 130; }

  say(lines, then = null, choice = null) {
    this.dialog = { lines, ci: 0, t: 0, then, choice, sel: 0 };
  }

  // ---------------- update ----------------

  update() {
    this.frame++;
    this.input.pollGamepad();
    this.sound.updateMusic();
    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'story': this.updateStory(); break;
      case 'roam': this.updateRoam(); break;
      case 'menu': this.updateMenu(); break;
      case 'shop': this.updateShop(); break;
      case 'battle': this.updateBattle(); break;
      case 'gameover': this.updateGameOver(); break;
      case 'ending': this.updateEnding(); break;
    }
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.input.endFrame();
  }

  updateTitle() {
    this.sound.playMusic('title');
    if ((this.input.pressed('up') || this.input.pressed('down')) && this.hasSave) this.titleSel = 1 - this.titleSel;
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

  updateDialog() {
    const d = this.dialog;
    d.t++;
    const total = d.lines.join('').length;
    if (d.ci < total) {
      d.ci += 2;
      if (d.t % 4 === 0) this.sound.text();
      if (this.input.pressed('a')) d.ci = total;
      return;
    }
    if (d.choice) {
      if (this.input.pressed('up') || this.input.pressed('down')) { d.sel = 1 - d.sel; this.sound.cursor(); }
      if (this.input.pressed('b')) { d.sel = 1; }
      if (this.input.pressed('a') || this.input.pressed('b')) {
        const then = d.then, sel = d.sel;
        this.dialog = null;
        this.sound.confirm();
        if (then) then(sel === 0);
      }
      return;
    }
    if (this.input.pressed('a') || this.input.pressed('start')) {
      const then = d.then;
      this.dialog = null;
      if (then) then();
    }
  }

  updateRoam() {
    this.save.time++;
    if (this.bannerT > 0) this.bannerT--;
    if (this.dialog) { this.updateDialog(); return; }

    const p = this.player;
    this.updateNpcs();

    if (!p.moving) {
      if (this.input.pressed('start')) {
        this.state = 'menu';
        this.menuMode = 'root';
        this.menuSel = 0;
        this.sound.confirm();
        return;
      }
      if (this.input.pressed('a')) { this.tryInteract(); return; }

      let dir = null;
      if (this.input.down('left')) dir = 'left';
      else if (this.input.down('right')) dir = 'right';
      else if (this.input.down('up')) dir = 'up';
      else if (this.input.down('down')) dir = 'down';
      if (dir) {
        p.dir = dir;
        const [dx, dy] = DIRV[dir];
        const nx = p.x + dx, ny = p.y + dy;
        // leaving a town map by its edge
        if (this.mapId !== 'world' && this.mapDef().kind === 'town'
          && (nx < 0 || ny < 0 || nx >= this.mapW() || ny >= this.mapH())) {
          this.exitTown();
          return;
        }
        const ch = this.effTile(nx, ny);
        const s = this.save;
        if (s.sailing) {
          // at the helm: open water sails, walkable shore disembarks
          if (ch === 'w') {
            p.moving = true; p.tx = nx; p.ty = ny; p.prog = 0;
          } else if (ch !== null && walkable(ch) && !this.npcAt(nx, ny)) {
            s.sailing = false;
            s.shipPos = [p.x, p.y];
            this.sound.stairs();
            p.moving = true; p.tx = nx; p.ty = ny; p.prog = 0;
          }
          return;
        }
        // on foot: stepping onto the moored ship boards it
        if (this.mapId === 'world' && ch === 'w' && s.shipPos && s.shipPos[0] === nx && s.shipPos[1] === ny) {
          s.sailing = true;
          this.sound.stairs();
          this.showBanner('ALL ABOARD');
          p.moving = true; p.tx = nx; p.ty = ny; p.prog = 0;
          return;
        }
        if (BUMPS.has(ch)) { this.bump(ch); return; }
        if (ch === 'X') { this.openChest(nx, ny); return; }
        if (!this.isBlocked(nx, ny)) {
          p.moving = true;
          p.tx = nx; p.ty = ny;
          p.prog = 0;
        }
      }
    } else {
      p.prog += 2;
      p.anim++;
      const [dx, dy] = DIRV[p.dir];
      p.ox = dx * p.prog;
      p.oy = dy * p.prog;
      if (p.prog >= TILE) {
        this.trail.unshift({ x: p.x, y: p.y, dir: p.dir });
        this.trail.length = 4;
        p.x = p.tx; p.y = p.ty;
        p.ox = 0; p.oy = 0;
        p.moving = false;
        this.justArrived = false;
        this.save.steps++;
        this.save.pos = { map: this.mapId, x: p.x, y: p.y, dir: p.dir };
        if (this.mapId === 'world') this.save.lastWorld = { x: p.x, y: p.y };
        // poison saps the party on the march (never below 1 hp)
        if (this.save.steps % 3 === 0) {
          for (const c of this.party) {
            if (c.psn && c.hp > 1) { c.hp--; if (this.frame % 6 === 0) this.sound.text(); }
          }
        }
        this.onStep();
      }
    }
  }

  exitTown() {
    // find this town's world tile
    for (const [key, id] of Object.entries(TOWN_AT)) {
      if (id === this.mapId) {
        const [wx, wy] = key.split(',').map(Number);
        this.loadMap('world', wx, wy, 'down');
        return;
      }
    }
  }

  onStep() {
    const p = this.player;
    const ch = this.rawTile(p.x, p.y);
    const m = this.mapDef();

    if (!this.justArrived) {
      if (this.mapId === 'world' && this.save.sailing) {
        // only sea bosses trouble a ship
        const wboss = WORLD_BOSSES[`${p.x},${p.y}`];
        if (wboss && !this.save.flags[wboss.flag]) {
          this.say([wboss.text], () => this.startBattle(wboss.group, { boss: true, flag: wboss.flag }));
          return;
        }
        this.stepsSinceBattle++;
        if (this.stepsSinceBattle >= 8 && Math.random() < 1 / SEA_ENCOUNTERS.rate) {
          const group = SEA_ENCOUNTERS.groups[(Math.random() * SEA_ENCOUNTERS.groups.length) | 0];
          this.startBattle(group, { bg: 'sea' });
        }
        return;
      }
      if (this.mapId === 'world') {
        const key = `${p.x},${p.y}`;
        if (ch === 'T' && TOWN_AT[key]) {
          const town = MAPS[TOWN_AT[key]];
          this.sound.door();
          this.loadMap(town.id, town.spawn.x, town.spawn.y, 'up');
          return;
        }
        if ((ch === 'C' || ch === 'W') && CAVE_AT[key]) {
          const dung = MAPS[CAVE_AT[key]];
          const entry = Object.keys(dung.links)[0].split(',').map(Number);
          this.sound.stairs();
          this.loadMap(dung.id, entry[0], entry[1], 'down');
          return;
        }
        // ferry docks
        if (ch === 'D' && DOCKS[key]) {
          const [dx, dy] = DOCKS[key];
          this.sound.stairs();
          this.loadMap('world', dx, dy, 'down');
          this.showBanner('THE FERRY CROSSES THE BAY');
          return;
        }
        // bosses that walk the open world
        const wboss = WORLD_BOSSES[key];
        if (wboss && !this.save.flags[wboss.flag]) {
          this.say([wboss.text], () => this.startBattle(wboss.group, { boss: true, flag: wboss.flag }));
          return;
        }
      } else if (m.kind === 'dungeon') {
        const link = m.links[`${p.x},${p.y}`];
        if (link) {
          this.sound.stairs();
          if (link.map === 'world') this.loadMap('world', link.x, link.y, 'down');
          else this.loadMap(link.map, link.x, link.y, this.player.dir);
          return;
        }
        // boss trigger
        const boss = m.bosses?.[`${p.x},${p.y}`];
        if (boss && !this.save.flags[boss.flag]) {
          this.say([boss.text], () => this.startBattle(boss.group, { boss: true, flag: boss.flag }));
          return;
        }
        // the Great Hearth
        if (m.hearth && p.x === m.hearth.x && p.y === m.hearth.y && this.save.flags.weaver && !this.save.flags.ended) {
          this.say([
            'THE HEARTH TOWERS ABOVE,',
            'COLD AND DARK AS A DEAD GOD.',
            '',
            'MOORE RAISES THE LANTERN.',
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
      this.maybeEncounter(ch);
    }
  }

  bump(ch) {
    const f = this.save.flags;
    if (ch === 'B') {
      this.say(['THE OLD BRIDGE IS OUT.', 'ONLY A MASTER SMITH WITH', 'TRUE IRON COULD MEND IT.']);
    } else if (ch === 'M') {
      if (f.lyra) {
        this.sound.itemGet();
        this.say(['LYRA WHISPERS TO THE MIST --', 'AND IT PARTS LIKE A CURTAIN.'], () => {
          f.mistGone = true;
          this.writeSave();
        });
      } else {
        this.say(['A WALL OF COLD MIST.', 'NO PATH, NO STARS, NO WAY', 'THROUGH. YOU TURN BACK.']);
      }
    } else if (ch === 'G') {
      if (this.save.inv.horn) {
        this.sound.itemGet();
        this.say(['MOORE SOUNDS THE SIGNAL HORN.', 'STONE GRINDS AGAINST STONE...', 'THE GREAT GATE OPENS!'], () => {
          f.gateOpen = true;
          this.writeSave();
        });
      } else {
        this.say(['THE GREAT GATE IS SEALED.', 'CARVED ON IT: "I ANSWER ONLY', 'THE MOUNTAIN\'S VOICE."']);
      }
    }
  }

  openChest(x, y) {
    const m = this.mapDef();
    const chest = m?.chests?.[`${x},${y}`];
    if (!chest) return;
    this.save.flags[`chest:${this.mapId}:${x},${y}`] = true;
    this.sound.chest();
    if (chest.gold) {
      this.save.gold = Math.min(99999, this.save.gold + chest.gold);
      this.say([`FOUND ${chest.gold} GOLD!`]);
    } else if (GEAR[chest.item]) {
      this.giveGear(chest.item);
    } else {
      this.save.inv[chest.item] = (this.save.inv[chest.item] || 0) + 1;
      if (ITEMS[chest.item].quest) this.sound.itemGet();
      this.say([`FOUND ${ITEMS[chest.item].name}!`]);
    }
    this.writeSave();
  }

  giveGear(id) {
    const g = GEAR[id];
    let who = null;
    if (g.slot === 'weapon') {
      who = this.party.find((c) => c.id === g.who && GEAR[c.weapon].atk < g.atk);
    } else {
      who = [...this.party].sort((a, b) => GEAR[a.armor].def - GEAR[b.armor].def)[0];
      if (who && GEAR[who.armor].def >= g.def) who = null;
    }
    if (who) {
      if (g.slot === 'weapon') who.weapon = id; else who.armor = id;
      this.say([`FOUND ${g.name}!`, `${who.name} EQUIPS IT.`]);
    } else {
      const gold = Math.floor(g.price / 2) || 20;
      this.save.gold = Math.min(99999, this.save.gold + gold);
      this.say([`FOUND ${g.name}...`, `NO USE FOR IT. SOLD FOR ${gold}G.`]);
    }
  }

  maybeEncounter(ch) {
    this.stepsSinceBattle++;
    if (this.stepsSinceBattle < 8) return;
    let rate = null, groups = null, bg = 'field';
    const m = this.mapDef();
    if (this.mapId === 'world') {
      const zone = ZONES.find((z) => {
        const [x0, y0, x1, y1] = z.rect;
        return this.player.x >= x0 && this.player.x <= x1 && this.player.y >= y0 && this.player.y <= y1;
      });
      if (!zone) return;
      rate = zone.rate * (TERRAIN_RATE[ch] || 1);
      groups = zone.groups;
      bg = ch === 'S' ? 'swamp' : 'field';
      if (this.player.y < 15) bg = 'ash';
      if (this.player.y >= 61 && this.player.x >= 39) bg = 'sand';
    } else if (m.kind === 'dungeon' && m.encounters) {
      rate = m.encounters.rate;
      groups = m.encounters.groups;
      bg = 'cave';
    } else return;
    if (Math.random() < 1 / rate) {
      const group = groups[(Math.random() * groups.length) | 0];
      this.startBattle(group, { bg });
    }
  }

  startBattle(group, opts = {}) {
    this.stepsSinceBattle = 0;
    this.save.battles++;
    this.battleOpts = opts;
    this.battle = new Battle(this, group, {
      bg: opts.boss ? 'boss' : opts.bg,
      intro: opts.intro,
    });
    this.state = 'battle';
    this.sound.playMusic(opts.boss || group.some((g) => ENEMIES[g].boss) ? 'boss' : 'battle');
  }

  updateBattle() {
    this.battle.update();
    const r = this.battle.result;
    if (!r) return;
    if (r === 'lose') {
      this.state = 'gameover';
      this.goT = 0;
      return;
    }
    // win or fled
    if (r === 'win' && this.battleOpts.flag) {
      this.save.flags[this.battleOpts.flag] = true;
    }
    this.battle = null;
    this.state = 'roam';
    const m = this.mapDef();
    this.sound.playMusic(this.mapId === 'world' ? 'over' : m.music);
    this.writeSave();
  }

  updateGameOver() {
    this.goT = (this.goT || 0) + 1;
    if (this.goT > 120 && (this.input.pressed('a') || this.input.pressed('start'))) {
      // wake at the last inn, half gold
      this.save.gold = Math.floor(this.save.gold / 2);
      for (const c of this.party) { c.hp = c.maxhp; c.mp = c.maxmp; c.psn = false; }
      if (this.save.shipPos) this.save.shipPos = [...SHIP_HOME]; // the cog drifts home
      this.save.sailing = false;
      const inn = this.save.lastInn;
      this.battle = null;
      this.loadMap(inn.map, inn.x, inn.y, 'down');
      this.state = 'roam';
      this.say(['YOU WAKE BY A WARM FIRE,', 'YOUR PURSE LIGHTER...']);
      this.writeSave();
    }
  }

  updateEnding() {
    this.endT++;
    if (this.endT > 500 && this.input.pressed('start')) {
      this.state = 'title';
      this.titleSel = 1;
    }
  }

  // ---------------- NPCs & interaction ----------------

  updateNpcs() {
    for (const n of this.npcs) {
      if (n.hidden || !n.wander) continue;
      if (n.moving) {
        n.prog += 1;
        if (n.prog >= TILE) { n.x = n.tx; n.y = n.ty; n.moving = false; }
        continue;
      }
      if (--n.t > 0) continue;
      n.t = 60 + ((Math.random() * 90) | 0);
      const dirs = ['up', 'down', 'left', 'right'];
      const dir = dirs[(Math.random() * 4) | 0];
      const [dx, dy] = DIRV[dir];
      const nx = n.x + dx, ny = n.y + dy;
      n.dir = dir;
      if (Math.abs(nx - n.home.x) > 1 || Math.abs(ny - n.home.y) > 1) continue;
      if (this.isBlocked(nx, ny)) continue;
      if (nx === this.player.x && ny === this.player.y) continue;
      const ch = this.effTile(nx, ny);
      if (ch === 'F' || walkable(ch)) {
        if (!['F', '.', 'p', ','].includes(ch)) continue;
        n.moving = true; n.tx = nx; n.ty = ny; n.prog = 0;
      }
    }
  }

  tryInteract() {
    const p = this.player;
    const [dx, dy] = DIRV[p.dir];
    let tx = p.x + dx, ty = p.y + dy;
    let npc = this.npcAt(tx, ty);
    // talk across counters
    if (!npc && this.effTile(tx, ty) === 'c') npc = this.npcAt(tx + dx, ty + dy);
    if (!npc) {
      const ch = this.effTile(tx, ty);
      if (BUMPS.has(ch)) this.bump(ch);
      if (ch === 'X') this.openChest(tx, ty);
      return;
    }
    npc.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.dir] || 'down';
    this.talkTo(npc);
  }

  talkTo(npc) {
    const f = this.save.flags;
    switch (npc.role) {
      case 'mayor':
        if (!f.brann) this.say(['MAYOR ALDOUS:', 'THE ROAD NORTH LEADS TO', 'FORDWELL. THE RIVER BRIDGE', 'IS OUT -- SEEK BRANN', 'THE SMITH.']);
        else if (!f.weaver) this.say(['MAYOR ALDOUS:', 'ALL EMBERWICK PRAYS FOR', 'YOUR LANTERN, LAD.']);
        else this.say(['MAYOR ALDOUS:', 'THE SUN IS BACK, AND IT IS', 'YOUR DOING. REST, HERO.']);
        return;
      case 'brann':
        if (this.save.inv.iron) {
          this.say([
            'BRANN: STAR-IRON! WHERE --', 'THE BARROW? HA! WITH THIS',
            'I CAN MEND THE BRIDGE.',
            '...AND I AM COMING WITH YOU.',
          ], () => {
            delete this.save.inv.iron;
            f.brann = true;
            npc.hidden = true;
            const lvl = Math.max(this.party[0].level, 3);
            this.party.push(makeChar('brann', lvl));
            this.sound.levelUp();
            this.say(['BRANN JOINED THE PARTY!', '', 'THE FORDWELL BRIDGE', 'IS REPAIRED!'], () => this.writeSave());
          });
        } else {
          this.say([
            'BRANN: THE BRIDGE? AYE, I', 'COULD MEND IT -- WITH', 'STAR-IRON. THE OLD BARROW',
            'IN THE WESTERN WOODS HAS', 'SOME, IF THE BONES LET', 'YOU TAKE IT.',
          ]);
        }
        return;
      case 'lyra':
        if (this.save.inv.bloom) {
          this.say([
            'LYRA: A MOONBLOOM... THE', 'FEVER WILL BREAK BY MORNING.',
            'YOU CLIMB TOWARD THE SPIRE,', 'DON\'T YOU? THEN YOU NEED',
            'SOMEONE WHO KNOWS THE MIST.',
          ], () => {
            delete this.save.inv.bloom;
            f.lyra = true;
            npc.hidden = true;
            const lvl = Math.max(this.party[0].level, 5);
            this.party.push(makeChar('lyra', lvl));
            this.sound.levelUp();
            this.say(['LYRA JOINED THE PARTY!', '', 'SHE CAN PART THE MIST', 'NORTH OF SAGEMOOR.'], () => this.writeSave());
          });
        } else {
          this.say([
            'LYRA: HALF THE VILLAGE BURNS', 'WITH MARSH FEVER. A MOONBLOOM',
            'FROM THE MIRE CAVE WOULD', 'CURE THEM -- BUT THE MIRE', 'MAW GUARDS THE DEEP POOLS.',
          ]);
        }
        return;
      case 'hunter':
        if (f.stagDone) {
          this.say(['HUNTER: WEAR THE COAT WELL.', 'THERE WILL NOT BE ANOTHER', 'BEAST LIKE THAT ONE.']);
        } else if (f.k_stag) {
          this.say(['HUNTER: BY THE OLD OAKS...', 'YOU TOOK THE PALE STAG.', 'ITS HIDE IS YOURS BY RIGHT --', 'I ONLY ASK TO SEW IT.'], () => {
            f.stagDone = true;
            this.save.gold = Math.min(99999, this.save.gold + 200);
            this.sound.itemGet();
            this.giveGear('staghide');
            this.writeSave();
          });
        } else {
          this.say(['HUNTER: SOMETHING WALKS THE', 'EASTERN GLADE THAT NO ARROW', 'TOUCHES. A STAG, PALE AS', 'BONE, OLD AS THE WOOD.', 'FELL IT, AND I WILL MAKE', 'YOU A COAT OF LEGENDS.']);
        }
        return;
      case 'caravan':
        if (f.cargoDone) {
          this.say(['CARAVAN MASTER: TRADE FLOWS', 'AGAIN, THANKS TO YOU.']);
        } else if (this.save.inv.cargo) {
          this.say(['CARAVAN MASTER: MY STRONGBOX!', 'SEAL UNBROKEN AND ALL.', 'YOU ARE WORTH TEN GUARDS.'], () => {
            delete this.save.inv.cargo;
            f.cargoDone = true;
            this.save.gold = Math.min(99999, this.save.gold + 300);
            this.save.inv.ether = Math.min(9, (this.save.inv.ether || 0) + 2);
            this.sound.itemGet();
            this.say(['RECEIVED 300 GOLD', 'AND 2 ETHERS!'], () => this.writeSave());
          });
        } else {
          this.say(['CARAVAN MASTER: THE HUSK\'S', 'CREATURES DRAGGED MY STRONG-', 'BOX INTO THE SEPULCHER EAST', 'OF TOWN. RETURN IT SEALED', 'AND I WILL PAY HANDSOMELY.']);
        }
        return;
      case 'fisher':
        if (f.ringDone) {
          this.say(['FISHER: GRANDDAD ONCE DOVE', 'THE SUNKEN VAULT, OFF THE', 'EASTERN SANDS. NONE WHO', 'SEEK ITS KING COME BACK.']);
        } else if (this.save.inv.ring) {
          this.say(['FISHER: MY LUCKY RING! YOU', 'WALKED THE BARROW FOR AN', 'OLD MAN\'S TRINKET?', 'TAKE THIS, AND MY THANKS.'], () => {
            delete this.save.inv.ring;
            f.ringDone = true;
            this.save.gold = Math.min(99999, this.save.gold + 100);
            this.save.inv.tonic = Math.min(9, (this.save.inv.tonic || 0) + 2);
            this.sound.itemGet();
            this.say(['RECEIVED 100 GOLD', 'AND 2 TONICS!'], () => this.writeSave());
          });
        } else {
          this.say(['FISHER: LOST MY LUCKY RING', 'IN THE OLD BARROW WHEN THE', 'BONES CHASED ME OUT.', 'BRING IT BACK AND I\'LL', 'MAKE IT WORTH YOUR WHILE.']);
        }
        return;
      case 'shipwright':
        if (this.save.shipPos) {
          this.say(['HARBORMASTER: SHE HANDLES', 'LIKE A DRUNK MULE, BUT SHE', 'FLOATS. THE WHOLE SEA IS', 'YOURS NOW, LAMPLIGHTER.']);
        } else if (f.k_storm) {
          this.say(['HARBORMASTER: YOU CLEARED', 'THE LIGHT? THEN TAKE MY OLD', 'COG -- SHE\'S EARNED A BRAVER', 'HAND THAN MINE.', 'SHE\'S MOORED SOUTH OF THE', 'FERRY DOCK. STEP ABOARD AND', 'SAIL WHERE YOU PLEASE.'], () => {
            this.save.shipPos = [...SHIP_HOME];
            this.sound.itemGet();
            this.say(['RECEIVED THE OLD COG!'], () => this.writeSave());
          });
        } else {
          this.say(['HARBORMASTER: NO SHIP DARES', 'THE BAY SINCE THE LIGHTHOUSE', 'WENT STRANGE. STORMS COME', 'OUT OF IT SIDEWAYS.', 'CLEAR THE OLD LIGHT AND WE', 'WILL TALK ABOUT BOATS.']);
        }
        return;
      case 'keeper':
        if (f.gateOpen) this.say(['GATEKEEPER: THE GATE STANDS', 'OPEN. MAY YOUR LANTERN', 'OUTLAST THE ASH.']);
        else if (this.save.inv.horn) this.say(['GATEKEEPER: THE HORN! SOUND', 'IT AT THE GREAT GATE, NORTH', 'OF TOWN.']);
        else this.say(['GATEKEEPER: THE GATE ONLY', 'OPENS TO OUR SIGNAL HORN --', 'AND DUSK CULTISTS STOLE IT.', 'THEY HOLD THE OLD FORT EAST', 'OF HERE.']);
        return;
      case 'inn': {
        const price = npc.price;
        this.say([`INNKEEPER: A WARM BED AND A`, `HOT MEAL -- ${price} GOLD.`, 'STAY THE NIGHT?'], (yes) => {
          if (!yes) return;
          if (this.save.gold < price) { this.sound.deny(); this.say(['INNKEEPER: COME BACK WHEN', 'YOUR PURSE IS HEAVIER.']); return; }
          this.save.gold -= price;
          for (const c of this.party) { c.hp = c.maxhp; c.mp = c.maxmp; c.psn = false; }
          this.save.lastInn = { map: this.mapId, x: this.player.x, y: this.player.y };
          this.sound.innRest();
          this.writeSave();
          this.say(['THE NIGHT PASSES PEACEFULLY.', 'HP AND MP RESTORED.', 'PROGRESS SAVED.']);
        }, ['YES', 'NO']);
        return;
      }
      case 'shop':
        this.state = 'shop';
        this.shopId = npc.shop;
        this.shopSel = 0;
        this.sound.confirm();
        return;
      default: {
        const entry = (npc.say || []).find((s) => !s.if || f[s.if]);
        this.say(entry ? entry.text : ['...']);
      }
    }
  }

  // ---------------- shop ----------------

  updateShop() {
    const shop = SHOPS[this.shopId];
    const n = shop.stock.length;
    if (this.dialog) { this.updateDialog(); return; }
    if (this.input.pressed('up')) { this.shopSel = (this.shopSel + n - 1) % n; this.sound.cursor(); }
    if (this.input.pressed('down')) { this.shopSel = (this.shopSel + 1) % n; this.sound.cursor(); }
    if (this.input.pressed('b') || this.input.pressed('start')) { this.state = 'roam'; this.sound.cancel(); return; }
    if (this.input.pressed('a')) {
      const id = shop.stock[this.shopSel];
      const def = ITEMS[id] || GEAR[id];
      if (this.save.gold < def.price) { this.sound.deny(); this.say(['NOT ENOUGH GOLD.']); return; }
      if (ITEMS[id]) {
        if ((this.save.inv[id] || 0) >= 9) { this.sound.deny(); this.say(['YOU CANNOT CARRY MORE.']); return; }
        this.save.gold -= def.price;
        this.save.inv[id] = (this.save.inv[id] || 0) + 1;
        this.sound.buy();
        this.writeSave();
      } else {
        // gear
        let who = null;
        if (def.slot === 'weapon') {
          who = this.party.find((c) => c.id === def.who);
          if (!who) { this.sound.deny(); this.say(['NO ONE HERE CAN WIELD IT.']); return; }
          if (GEAR[who.weapon].atk >= def.atk) { this.sound.deny(); this.say([`${who.name} HAS BETTER.`]); return; }
        } else {
          who = [...this.party].sort((a, b) => GEAR[a.armor].def - GEAR[b.armor].def)[0];
          if (GEAR[who.armor].def >= def.def) { this.sound.deny(); this.say(['NO ONE NEEDS IT.']); return; }
        }
        this.save.gold -= def.price;
        if (def.slot === 'weapon') who.weapon = id; else who.armor = id;
        this.sound.buy();
        this.say([`${who.name} EQUIPS THE ${def.name}.`]);
        this.writeSave();
      }
    }
  }

  // ---------------- pause menu ----------------

  updateMenu() {
    if (this.dialog) { this.updateDialog(); return; }
    const root = ['ITEMS', 'MAP', 'BESTIARY', 'STATUS', 'SAVE', 'CLOSE'];
    if (this.menuMode === 'root') {
      const n = root.length;
      if (this.input.pressed('up')) { this.menuSel = (this.menuSel + n - 1) % n; this.sound.cursor(); }
      if (this.input.pressed('down')) { this.menuSel = (this.menuSel + 1) % n; this.sound.cursor(); }
      if (this.input.pressed('b') || this.input.pressed('start')) { this.state = 'roam'; this.sound.cancel(); return; }
      if (this.input.pressed('a')) {
        this.sound.confirm();
        const pick = root[this.menuSel];
        if (pick === 'ITEMS') { this.menuMode = 'items'; this.itemSel = 0; }
        else if (pick === 'MAP') { this.menuMode = 'map'; }
        else if (pick === 'BESTIARY') { this.menuMode = 'bestiary'; }
        else if (pick === 'STATUS') { this.menuMode = 'status'; }
        else if (pick === 'SAVE') {
          this.writeSave();
          this.sound.save();
          this.say(['PROGRESS SAVED.']);
        } else this.state = 'roam';
      }
      return;
    }
    if (this.menuMode === 'status' || this.menuMode === 'map' || this.menuMode === 'bestiary') {
      if (this.input.pressed('a') || this.input.pressed('b')) { this.menuMode = 'root'; this.sound.cancel(); }
      return;
    }
    if (this.menuMode === 'items') {
      const items = Object.keys(this.save.inv).filter((id) => this.save.inv[id] > 0);
      if (!items.length) { this.menuMode = 'root'; return; }
      if (this.input.pressed('up')) { this.itemSel = (this.itemSel + items.length - 1) % items.length; this.sound.cursor(); }
      if (this.input.pressed('down')) { this.itemSel = (this.itemSel + 1) % items.length; this.sound.cursor(); }
      if (this.input.pressed('b')) { this.menuMode = 'root'; this.sound.cancel(); return; }
      if (this.input.pressed('a')) {
        const id = items[this.itemSel % items.length];
        const def = ITEMS[id];
        if (def.quest || def.flee) { this.sound.deny(); return; }
        this.menuMode = 'itemwho';
        this.useItem = id;
        this.whoSel = 0;
        this.sound.confirm();
      }
      return;
    }
    if (this.menuMode === 'itemwho') {
      if (this.input.pressed('up')) { this.whoSel = (this.whoSel + this.party.length - 1) % this.party.length; this.sound.cursor(); }
      if (this.input.pressed('down')) { this.whoSel = (this.whoSel + 1) % this.party.length; this.sound.cursor(); }
      if (this.input.pressed('b')) { this.menuMode = 'items'; this.sound.cancel(); return; }
      if (this.input.pressed('a')) {
        const c = this.party[this.whoSel];
        const def = ITEMS[this.useItem];
        if (def.cure) {
          if (!c.psn) { this.sound.deny(); return; }
          c.psn = false;
        } else if (def.revive) {
          if (c.hp > 0) { this.sound.deny(); return; }
          c.hp = Math.floor(c.maxhp / 2);
        } else {
          if (c.hp <= 0) { this.sound.deny(); return; }
          if (def.heal) {
            if (c.hp >= c.maxhp) { this.sound.deny(); return; }
            c.hp = Math.min(c.maxhp, c.hp + def.heal);
          }
          if (def.mp) {
            if (c.mp >= c.maxmp) { this.sound.deny(); return; }
            c.mp = Math.min(c.maxmp, c.mp + def.mp);
          }
        }
        this.save.inv[this.useItem]--;
        this.sound.heal();
        if (this.save.inv[this.useItem] <= 0) this.menuMode = 'items';
      }
    }
  }

  // ---------------- drawing ----------------

  draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    switch (this.state) {
      case 'title': this.drawTitle(); return;
      case 'story': this.drawStory(); return;
      case 'battle': this.battle.draw(ctx); return;
      case 'gameover': this.drawGameOver(); return;
      case 'ending': this.drawEnding(); return;
    }
    this.drawField();
    if (this.state === 'menu') this.drawMenu();
    if (this.state === 'shop') this.drawShop();
    if (this.banner && this.bannerT > 0) {
      ctx.globalAlpha = Math.min(1, this.bannerT / 30);
      drawWindow(ctx, 64, 8, 128, 20);
      text(ctx, this.banner, 128, 14, '#f8d838', 8, 'center');
      ctx.globalAlpha = 1;
    }
    if (this.dialog) this.drawDialog();
  }

  camera() {
    const p = this.player;
    const px = p.x * TILE + p.ox, py = p.y * TILE + p.oy;
    const camX = Math.max(0, Math.min(this.mapW() * TILE - VIEW_W, px - VIEW_W / 2 + 8));
    const camY = Math.max(0, Math.min(this.mapH() * TILE - VIEW_H, py - VIEW_H / 2 + 8));
    return [Math.round(camX), Math.round(camY)];
  }

  drawField() {
    const [camX, camY] = this.camera();
    const x0 = (camX / TILE) | 0, y0 = (camY / TILE) | 0;
    for (let ty = y0; ty <= y0 + 15; ty++) {
      for (let tx = x0; tx <= x0 + 16; tx++) {
        const ch = this.effTile(tx, ty);
        drawTile(ctx, ch === null ? 'f' : ch, tx * TILE - camX, ty * TILE - camY, this.frame);
      }
    }
    // npcs
    for (const n of this.npcs) {
      if (n.hidden) continue;
      let nx = n.x * TILE, ny = n.y * TILE;
      if (n.moving) {
        const [dx, dy] = DIRV[n.dir];
        nx = (n.tx - dx) * TILE + dx * n.prog;
        ny = (n.ty - dy) * TILE + dy * n.prog;
      }
      drawWalker(ctx, n.sprite, n.dir, n.moving ? (n.prog >> 3) & 1 : 0, nx - camX, ny - camY - 2);
    }
    // the moored ship
    const s = this.save;
    if (this.mapId === 'world' && s.shipPos && !s.sailing) {
      drawSprite(ctx, (this.frame & 16) ? 'boat1' : 'boat2', s.shipPos[0] * TILE - camX, s.shipPos[1] * TILE - camY);
    }
    // party caterpillar: followers use the trail
    const p = this.player;
    if (s.sailing) {
      drawSprite(ctx, (this.frame & 16) ? 'boat1' : 'boat2', p.x * TILE + p.ox - camX, p.y * TILE + p.oy - camY);
      return;
    }
    for (let i = this.party.length - 1; i >= 1; i--) {
      const t = this.trail[i - 1];
      if (!t) continue;
      const c = this.party[i];
      let fx = t.x * TILE, fy = t.y * TILE, fdir = this.trail[i - 2]?.dir || p.dir;
      if (p.moving) {
        // slide follower toward the next trail spot
        const nt = i === 1 ? { x: p.x, y: p.y } : this.trail[i - 2];
        fx += (nt.x - t.x) * p.prog;
        fy += (nt.y - t.y) * p.prog;
        if (nt.x !== t.x || nt.y !== t.y) {
          fdir = nt.x > t.x ? 'right' : nt.x < t.x ? 'left' : nt.y > t.y ? 'down' : 'up';
        }
      }
      drawWalker(ctx, c.sprite, fdir, p.moving ? (p.anim >> 3) & 1 : 0, fx - camX, fy - camY - 2);
    }
    drawWalker(ctx, this.party[0].sprite, p.dir, p.moving ? (p.anim >> 3) & 1 : 0, p.x * TILE + p.ox - camX, p.y * TILE + p.oy - camY - 2);
  }

  drawDialog() {
    const d = this.dialog;
    const h = 18 + d.lines.length * 11;
    drawWindow(ctx, 8, VIEW_H - h - 8, 240, h);
    let used = 0;
    d.lines.forEach((l, i) => {
      const nchars = Math.max(0, Math.min(l.length, d.ci - used));
      used += l.length;
      if (nchars > 0) text(ctx, l.slice(0, nchars), 20, VIEW_H - h + i * 11, '#fff');
    });
    if (d.choice && d.ci >= d.lines.join('').length) {
      drawWindow(ctx, 196, VIEW_H - h - 40, 52, 34);
      d.choice.forEach((c, i) => {
        text(ctx, c, 214, VIEW_H - h - 30 + i * 11, i === d.sel ? '#f8d838' : '#fff');
        if (i === d.sel) drawSprite(ctx, 'cursor', 202, VIEW_H - h - 30 + i * 11);
      });
    }
  }

  drawMenu() {
    // party summary
    drawWindow(ctx, 8, 8, 156, 26 + this.party.length * 30);
    this.party.forEach((c, i) => {
      const y = 18 + i * 30;
      const sel = this.menuMode === 'itemwho' && this.whoSel === i;
      drawWalker(ctx, c.sprite, 'down', 0, 16, y - 2);
      text(ctx, `${c.name} LV${c.level}`, 38, y, sel ? '#f8d838' : c.psn ? '#80d860' : '#fff');
      if (c.psn) text(ctx, 'PSN', 120, y, '#80d860');
      text(ctx, `HP${String(c.hp).padStart(4)}/${c.maxhp}`, 38, y + 10, c.hp <= 0 ? '#f84020' : '#c8d0d8');
      text(ctx, `MP${String(c.mp).padStart(3)}/${c.maxmp}`, 110, y + 10, '#8890c8');
    });
    text(ctx, `GOLD ${this.save.gold}`, 16, 20 + this.party.length * 30, '#f8d838');

    // root menu
    const root = ['ITEMS', 'MAP', 'BESTIARY', 'STATUS', 'SAVE', 'CLOSE'];
    drawWindow(ctx, 172, 8, 76, 84);
    root.forEach((o, i) => {
      text(ctx, o, 192, 16 + i * 12, this.menuMode === 'root' && i === this.menuSel ? '#f8d838' : '#fff');
      if (this.menuMode === 'root' && i === this.menuSel) drawSprite(ctx, 'cursor', 180, 16 + i * 12);
    });

    if (this.menuMode === 'items' || this.menuMode === 'itemwho') {
      const items = Object.keys(this.save.inv).filter((id) => this.save.inv[id] > 0);
      drawWindow(ctx, 60, 96, 156, 22 + items.length * 11);
      items.forEach((id, i) => {
        const def = ITEMS[id];
        const sel = this.menuMode === 'items' && i === (this.itemSel % items.length);
        text(ctx, `${def.name.padEnd(11)}x${this.save.inv[id]}`, 84, 106 + i * 11, sel ? '#f8d838' : def.quest ? '#c8a058' : '#fff');
        if (sel) drawSprite(ctx, 'cursor', 70, 106 + i * 11);
      });
      const selId = items[this.itemSel % items.length];
      if (this.menuMode === 'items' && selId) text(ctx, ITEMS[selId].desc || '', 84, 108 + items.length * 11, '#667');
    }
    if (this.menuMode === 'status') {
      drawWindow(ctx, 24, 80, 208, 24 + this.party.length * 34);
      this.party.forEach((c, i) => {
        const y = 90 + i * 34;
        text(ctx, `${c.name}  LV${c.level}  NEXT ${Math.max(0, xpForLevel(c.level + 1) - c.xp)}XP`, 36, y, '#fff');
        text(ctx, `ATK${eAtk(c)} DEF${eDef(c)} SPD${c.spd} MAG${c.mag}`, 36, y + 11, '#c8d0d8');
        text(ctx, `${GEAR[c.weapon].name} / ${GEAR[c.armor].name}`, 36, y + 22, '#8890c8');
      });
    }
    if (this.menuMode === 'map') this.drawWorldMap();
    if (this.menuMode === 'bestiary') this.drawBestiary();
  }

  drawWorldMap() {
    drawWindow(ctx, 22, 96, 212, 142);
    const COLORS = {
      '.': '#58a838', f: '#186010', h: '#3f8828', m: '#8a7a5a', w: '#2858d8',
      s: '#e8d8a0', S: '#607048', p: '#c8a058', b: '#a87840', B: '#a87840',
      a: '#787068', A: '#383028', T: '#f84020', C: '#101010', W: '#f88018',
      G: '#f8d838', M: '#c8d2e6', d: '#d8c088', u: '#30a020', D: '#a87840',
    };
    const ox = 48, oy = 118;
    for (let y = 0; y < W_H; y++) {
      for (let x = 0; x < W_W; x++) {
        ctx.fillStyle = COLORS[WORLD[y][x]] || '#000';
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
    const lw = this.save.lastWorld || { x: START_POS.x, y: START_POS.y };
    if (this.save.shipPos && !this.save.sailing) {
      ctx.fillStyle = '#a87840';
      ctx.fillRect(ox + this.save.shipPos[0] - 1, oy + this.save.shipPos[1] - 1, 3, 3);
    }
    if (this.frame & 16) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(ox + lw.x - 1, oy + lw.y - 1, 3, 3);
    }
    text(ctx, 'MOORULE', 128, 104, '#f8d838', 8, 'center');
  }

  drawBestiary() {
    const ids = Object.keys(ENEMIES);
    const seen = this.save.seen || {};
    const count = ids.filter((id) => seen[id]).length;
    drawWindow(ctx, 12, 96, 232, 142);
    text(ctx, `BESTIARY  ${count}/${ids.length}`, 128, 104, '#f8d838', 8, 'center');
    ids.forEach((id, i) => {
      const col = (i / 10) | 0, row = i % 10;
      const name = seen[id] ? ENEMIES[id].name : '???';
      text(ctx, name, 22 + col * 76, 118 + row * 11, seen[id] ? (ENEMIES[id].boss ? '#f8a800' : '#fff') : '#556', 7);
    });
  }

  drawShop() {
    const shop = SHOPS[this.shopId];
    drawWindow(ctx, 24, 24, 208, 40 + shop.stock.length * 13);
    text(ctx, shop.name, 128, 32, '#f8d838', 8, 'center');
    shop.stock.forEach((id, i) => {
      const def = ITEMS[id] || GEAR[id];
      const sel = i === this.shopSel;
      const owned = ITEMS[id] ? `x${this.save.inv[id] || 0}` : '';
      text(ctx, `${def.name.padEnd(13)}${String(def.price).padStart(5)}G ${owned}`, 48, 48 + i * 13, sel ? '#f8d838' : '#fff');
      if (sel) drawSprite(ctx, 'cursor', 34, 48 + i * 13);
    });
    const def = ITEMS[shop.stock[this.shopSel]] || GEAR[shop.stock[this.shopSel]];
    const info = def.desc || (def.slot === 'weapon' ? `ATK +${def.atk} (${PARTY_DEFS[def.who].name})` : `DEF +${def.def}`);
    text(ctx, info, 48, 52 + shop.stock.length * 13, '#667');
    text(ctx, `GOLD ${this.save.gold}`, 48, 64 + shop.stock.length * 13, '#f8d838');
  }

  drawTitle() {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i < 5 ? '#101028' : i < 8 ? '#282048' : '#584058';
      ctx.fillRect(0, i * 20, VIEW_W, 20);
    }
    // distant spire with a dying ember
    ctx.fillStyle = '#181020';
    ctx.fillRect(200, 60, 14, 120);
    ctx.fillStyle = (this.frame & 16) ? '#f88018' : '#c02818';
    ctx.fillRect(204, 54, 6, 6);
    text(ctx, 'MOORE QUEST', 128, 52, '#f8d838', 20, 'center');
    text(ctx, '- THE ASHEN ROAD -', 128, 78, '#e07820', 8, 'center');
    ctx.strokeStyle = '#f8d838';
    ctx.strokeRect(34.5, 42.5, 187, 52);
    drawWalker(ctx, 'moore', 'right', (this.frame >> 4) & 1, 60, 150);
    drawWalker(ctx, 'brann', 'right', (this.frame >> 4) & 1, 42, 152);
    drawWalker(ctx, 'lyra', 'right', (this.frame >> 4) & 1, 24, 150);
    if (this.hasSave) {
      text(ctx, 'NEW QUEST', 128, 186, this.titleSel === 0 ? '#fff' : '#667', 8, 'center');
      text(ctx, 'CONTINUE', 128, 200, this.titleSel === 1 ? '#fff' : '#667', 8, 'center');
      text(ctx, '>', 92, this.titleSel === 0 ? 186 : 200, '#f8d838');
    } else if ((this.frame >> 5) & 1) {
      text(ctx, 'PRESS START', 128, 192, '#fff', 8, 'center');
    }
    text(ctx, 'MOORE ARCADE 2026 - ORIGINAL ART AND MUSIC', 128, 226, '#556', 8, 'center');
  }

  drawStory() {
    const page = STORY[this.storyPage] || [];
    page.forEach((l, i) => text(ctx, l, 128, 46 + i * 14, '#c8d0d8', 8, 'center'));
    if ((this.frame >> 5) & 1) text(ctx, 'PRESS START', 128, 214, '#fff', 8, 'center');
  }

  drawGameOver() {
    if (this.goT > 30) {
      text(ctx, 'THE LIGHT FADES...', 128, 90, '#f84020', 12, 'center');
      if (this.goT > 120) text(ctx, 'PRESS START', 128, 140, (this.frame >> 5) & 1 ? '#fff' : '#667', 8, 'center');
    }
  }

  drawEnding() {
    const t = this.endT;
    // sunrise
    const k = Math.min(1, t / 300);
    for (let i = 0; i < 12; i++) {
      const warm = Math.max(0, k - i * 0.05);
      const r = Math.floor(16 + warm * 220), g = Math.floor(16 + warm * 150), b = Math.floor(40 + warm * 40);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, i * 10, VIEW_W, 10);
    }
    ctx.fillStyle = '#181020';
    ctx.fillRect(118, 30, 20, 90);
    if (t > 60) {
      const glow = 4 + Math.sin(t / 10) * 2;
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(128 - glow / 2, 24 - glow / 2, glow, glow);
      ctx.fillStyle = '#f88018';
      ctx.fillRect(124, 20, 8, 8);
    }
    this.party.forEach((c, i) => drawWalker(ctx, c.sprite, 'up', (this.frame >> 4) & 1, 112 + (i - 1) * 22, 130));
    ENDING.forEach((l, i) => {
      if (t > 90 + i * 24) text(ctx, l, 128, 148 + i * 9, '#fff8e8', 8, 'center');
    });
    if (t > 460) {
      const s = this.save;
      text(ctx, `${Math.floor(s.time / 3600)} MIN - ${s.steps} STEPS - ${s.battles} BATTLES`, 128, 118, '#f8d838', 8, 'center');
      if ((this.frame >> 5) & 1) text(ctx, 'PRESS START', 128, 230, '#fff', 8, 'center');
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
