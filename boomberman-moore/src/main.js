// Boomberman Moore — states, screens, HUD, rendering, campaign + battle flow.

import { Input, initTouch, makePads, menuAction } from './input.js';
import { Sound } from './audio.js';
import {
  initSprites, drawSprite, drawFlame, drawBreak, SPR, THEMES, PLAYER_COLORS,
} from './sprites.js';
import {
  TILE, GW, GH, OFF_X, OFF_Y, T, idx,
  makeArena, STAGES, CORNERS, enemySpawnCells, spiralCells,
} from './levels.js';
import { World, Player, Enemy, ENEMY_SPECS } from './entities.js';
import { botInit, botThink } from './bots.js';

const VIEW_W = 256, VIEW_H = 224;
const HI_KEY = 'boomberman-moore-hi';
const PCOLORS = { white: '#f0f0f4', black: '#8888a0', red: '#e84838', blue: '#4878f0' };
const PNAMES = ['P1', 'P2', 'P3', 'P4'];
const PU_LIST = [
  ['pu_bombs', 'BOMB UP  +1 bomb'],
  ['pu_fire', 'FIRE UP  +1 range'],
  ['pu_speed', 'SPEED UP'],
  ['pu_kick', 'KICK  walk into bombs'],
  ['pu_remote', 'REMOTE  ACT detonates'],
  ['pu_pass', 'BOMB PASS'],
];

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
    this.pads = makePads(this.input);
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    initSprites();
    this.state = 'title';
    this.stateT = 0;
    this.frame = 0;
    this.titleSel = 0;
    this.mode = 'campaign';
    this.hi = +(localStorage.getItem(HI_KEY) || 0);
    this.setup = { count: 2, slots: ['human', 'cpu', 'cpu', 'cpu'], cursor: 0 };
    this.world = null;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  addScore(n) {
    if (this.mode !== 'campaign') return;
    this.score += n;
    if (this.score > this.hi) this.hi = this.score;
  }

  saveHi() { try { localStorage.setItem(HI_KEY, String(this.hi)); } catch { /* ignore */ } }

  // ================= campaign =================

  startCampaign() {
    this.mode = 'campaign';
    this.lives = 3;
    this.score = 0;
    this.stageIdx = 0;
    this.progress = { maxBombs: 1, range: 2, speed: 1.25, kick: false, pass: false, remote: false };
    this.beginStage();
  }

  beginStage() {
    const st = STAGES[this.stageIdx];
    const spawn = { x: 1, y: 1 };
    const arena = makeArena({ soft: st.soft, spawns: [spawn], items: st.items, exit: !st.boss });
    this.world = new World(this, arena, { theme: st.theme, mode: 'campaign' });
    const p = new Player(0, 'white', spawn.x, spawn.y);
    Object.assign(p, this.progress);
    this.world.players.push(p);
    const list = [];
    for (const [type, n] of Object.entries(st.enemies)) {
      for (let i = 0; i < n; i++) list.push(type);
    }
    const cells = enemySpawnCells(arena.grid, spawn, list.length + 2);
    list.forEach((type, i) => {
      let c = cells[i % Math.max(1, cells.length)] || { x: GW - 2, y: GH - 2 };
      if (type === 'boss') c = { x: 7, y: 7 };
      this.world.enemies.push(new Enemy(type, c.x, c.y));
    });
    this.timeLeft = st.time * 60;
    this.suddenT = 0;
    this.sound.stopMusic();
    this.setState('intro');
  }

  enterPlay() {
    this.setState('play');
    if (this.mode === 'campaign') this.sound.playMusic(THEMES[STAGES[this.stageIdx].theme].music);
    else this.sound.playMusic('battle');
  }

  updateCampaign() {
    const w = this.world;
    const p = w.players[0];
    const inp = { dx: 0, dy: 0, bomb: false, act: false };
    if (p.alive) {
      const pad = this.pads.solo;
      inp.dx = (pad.down('right') ? 1 : 0) - (pad.down('left') ? 1 : 0);
      inp.dy = (pad.down('down') ? 1 : 0) - (pad.down('up') ? 1 : 0);
      inp.bomb = pad.pressed('bomb');
      inp.act = pad.pressed('act');
    }
    w.update([inp]);

    // timer / sudden death
    if (this.timeLeft > 0) {
      this.timeLeft--;
      if (this.timeLeft === 0) {
        this.sound.playMusic('panic');
        this.sound.spawnWarn();
      }
    } else {
      this.suddenT++;
      const minions = w.enemies.filter((e) => e.type === 'minion').length;
      if (this.suddenT % 300 === 1 && minions < 10) {
        const far = CORNERS.filter((c) => Math.abs(c.x - p.cx) + Math.abs(c.y - p.cy) > 6);
        const c = far.length ? far[(Math.random() * far.length) | 0] : CORNERS[1];
        w.enemies.push(new Enemy('minion', c.x, c.y));
        this.sound.spawnWarn();
      }
    }

    // boss drops the exit where it dies
    const st = STAGES[this.stageIdx];
    if (st.boss && !w.exitCell) {
      const boss = w.enemies.find((e) => e.type === 'boss');
      if (boss && boss.dying === 1) w.exitCell = { cx: boss.cx, cy: boss.cy };
    }

    // exit opens once the field is clear
    if (!w.exitOpen && w.exitCell && w.enemies.length === 0) {
      w.exitOpen = true;
      this.sound.exitOpen();
    }

    // stage clear
    if (w.exitOpen && p.alive && p.cx === w.exitCell.cx && p.cy === w.exitCell.cy) {
      this.progress = {
        maxBombs: p.maxBombs, range: p.range, speed: p.speed,
        kick: p.kick, pass: p.pass, remote: p.remote,
      };
      this.addScore(Math.floor(this.timeLeft / 60) * 10);
      this.sound.stopMusic();
      this.sound.clearJingle();
      this.setState('clear');
      return;
    }

    // death
    if (!p.alive && p.deadT > 100) {
      this.lives--;
      this.progress.remote = false; // the detonator dies with you
      if (this.lives < 0) {
        this.saveHi();
        this.sound.stopMusic();
        this.sound.overJingle();
        this.setState('gameover');
      } else {
        this.beginStage();
      }
    }
  }

  // ================= battle =================

  startBattle() {
    this.mode = 'battle';
    this.battleCfg = this.setup.slots.slice(0, this.setup.count);
    this.wins = this.battleCfg.map(() => 0);
    this.round = 1;
    this.beginRound();
  }

  beginRound() {
    const slots = this.battleCfg;
    const spawns = CORNERS.slice(0, slots.length);
    const arena = makeArena({
      soft: 0.68,
      spawns,
      items: ['bombs', 'bombs', 'bombs', 'fire', 'fire', 'fire', 'fire',
        'speed', 'speed', 'kick', 'kick', 'remote', 'pass'],
    });
    this.world = new World(this, arena, { theme: 0, mode: 'battle' });
    slots.forEach((kind, i) => {
      const p = new Player(i, PLAYER_COLORS[i], spawns[i].x, spawns[i].y);
      if (kind === 'cpu') botInit(p);
      this.world.players.push(p);
    });
    this.roundT = 0;
    this.suddenOn = false;
    this.endT = 0;
    this.roundWinner = -1;
    this.sound.stopMusic();
    this.setState('intro');
  }

  updateBattle() {
    const w = this.world;
    const inputs = w.players.map((p, i) => {
      if (!p.alive) return { dx: 0, dy: 0, bomb: false, act: false };
      if (p.isBot) return botThink(w, p);
      const pad = this.pads.battle[i];
      return {
        dx: (pad.down('right') ? 1 : 0) - (pad.down('left') ? 1 : 0),
        dy: (pad.down('down') ? 1 : 0) - (pad.down('up') ? 1 : 0),
        bomb: pad.pressed('bomb'),
        act: pad.pressed('act'),
      };
    });
    w.update(inputs);
    this.roundT++;
    if (!this.suddenOn && this.roundT >= 60 * 60) {
      this.suddenOn = true;
      w.startShrink(spiralCells());
      this.sound.playMusic('panic');
      this.sound.spawnWarn();
    }
    const alive = w.players.filter((p) => p.alive);
    if (alive.length <= 1) {
      this.endT++;
      if (this.endT > 75) {
        const winner = alive[0] || null;
        this.roundWinner = winner ? winner.id : -1;
        if (winner) this.wins[winner.id]++;
        this.sound.stopMusic();
        if (winner && this.wins[winner.id] >= 2) {
          this.sound.victoryJingle();
          this.setState('matchEnd');
        } else {
          this.sound.winJingle();
          this.setState('roundEnd');
        }
      }
    } else {
      this.endT = 0;
    }
  }

  // ================= state machine =================

  update() {
    this.frame++;
    this.stateT++;
    this.input.pollGamepads();
    const inp = this.input;
    if (menuAction(inp, 'mute')) this.sound.toggleMute();

    switch (this.state) {
      case 'title': {
        this.sound.playMusic('title');
        if (menuAction(inp, 'up') || menuAction(inp, 'down')) {
          this.titleSel = 1 - this.titleSel;
          this.sound.menuMove();
        }
        if (menuAction(inp, 'start') || menuAction(inp, 'bomb') || menuAction(inp, 'act')) {
          this.sound.menuPick();
          if (this.titleSel === 0) this.startCampaign();
          else { this.setup.cursor = 0; this.setState('setup'); }
        }
        break;
      }
      case 'setup': {
        const s = this.setup;
        const rows = 1 + s.count + 1; // count row, slot rows, start row
        if (menuAction(inp, 'up')) { s.cursor = (s.cursor + rows - 1) % rows; this.sound.menuMove(); }
        if (menuAction(inp, 'down')) { s.cursor = (s.cursor + 1) % rows; this.sound.menuMove(); }
        const dir = (menuAction(inp, 'right') ? 1 : 0) - (menuAction(inp, 'left') ? 1 : 0);
        if (dir) {
          this.sound.menuMove();
          if (s.cursor === 0) {
            s.count = Math.min(4, Math.max(2, s.count + dir));
            s.cursor = Math.min(s.cursor, 1 + s.count);
          } else if (s.cursor <= s.count) {
            const i = s.cursor - 1;
            s.slots[i] = s.slots[i] === 'human' ? 'cpu' : 'human';
          }
        }
        if (menuAction(inp, 'start') || menuAction(inp, 'bomb') || menuAction(inp, 'act')) {
          if (s.cursor === rows - 1) {
            if (s.slots.slice(0, s.count).some((k) => k === 'human') || true) {
              this.sound.menuPick();
              this.startBattle();
            }
          } else if (s.cursor > 0) {
            const i = s.cursor - 1;
            s.slots[i] = s.slots[i] === 'human' ? 'cpu' : 'human';
            this.sound.menuMove();
          }
        }
        if (menuAction(inp, 'back')) { this.sound.menuMove(); this.setState('title'); }
        break;
      }
      case 'intro': {
        if (this.stateT >= 110 || menuAction(inp, 'start')) this.enterPlay();
        break;
      }
      case 'play': {
        if (this.pads.sys.pressed('start')) {
          this.sound.pause();
          this.setState('pause');
          break;
        }
        if (this.mode === 'campaign') this.updateCampaign();
        else this.updateBattle();
        break;
      }
      case 'pause': {
        if (this.pads.sys.pressed('start')) { this.sound.pause(); this.setState('play'); }
        break;
      }
      case 'clear': {
        if (this.stateT > 220) {
          this.stageIdx++;
          if (this.stageIdx >= STAGES.length) {
            this.saveHi();
            this.sound.victoryJingle();
            this.setState('victory');
          } else {
            this.beginStage();
          }
        }
        break;
      }
      case 'roundEnd': {
        if (this.stateT > 200) { this.round++; this.beginRound(); }
        break;
      }
      case 'matchEnd':
      case 'gameover':
      case 'victory': {
        if (this.stateT > 60 && (menuAction(inp, 'start') || menuAction(inp, 'bomb'))) {
          this.sound.menuPick();
          this.sound.stopMusic();
          this.setState('title');
        }
        break;
      }
      default: break;
    }

    this.sound.updateMusic();
    this.input.endFrame();
  }

  // ================= drawing =================

  draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    switch (this.state) {
      case 'title': this.drawTitle(); break;
      case 'setup': this.drawSetup(); break;
      case 'intro':
        this.drawArena();
        this.drawHUD();
        this.drawIntro();
        break;
      case 'play':
        this.drawArena();
        this.drawHUD();
        break;
      case 'pause':
        this.drawArena();
        this.drawHUD();
        this.overlay('PAUSE', '#f8d838');
        break;
      case 'clear':
        this.drawArena();
        this.drawHUD();
        this.overlay('STAGE CLEAR!', '#78f878');
        break;
      case 'roundEnd':
        this.drawArena();
        this.drawHUD();
        this.overlay(
          this.roundWinner >= 0 ? `${PNAMES[this.roundWinner]} WINS THE ROUND!` : 'DRAW!',
          this.roundWinner >= 0 ? PCOLORS[PLAYER_COLORS[this.roundWinner]] : '#f8f8f8',
        );
        break;
      case 'matchEnd': this.drawMatchEnd(); break;
      case 'gameover': this.drawGameOver(); break;
      case 'victory': this.drawVictory(); break;
      default: break;
    }
  }

  overlay(str, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 96, VIEW_W, 40);
    text(ctx, str, VIEW_W / 2, 110, color, 10, 'center');
  }

  drawTitle() {
    ctx.fillStyle = '#181828';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // marquee checker
    ctx.fillStyle = '#20203a';
    for (let y = 0; y < VIEW_H; y += 16) {
      for (let x = (y / 16) % 2 * 16; x < VIEW_W; x += 32) ctx.fillRect(x, y, 16, 16);
    }
    // big bomb
    const t = this.frame;
    const bob = Math.sin(t / 20) * 3;
    ctx.save();
    ctx.translate(128, 62 + bob);
    ctx.scale(3, 3);
    ctx.drawImage(SPR.bomb, -8, -8);
    ctx.restore();
    // fuse spark
    ctx.fillStyle = t % 8 < 4 ? '#f8d838' : '#f87818';
    ctx.fillRect(128 + 8 + Math.sin(t / 3) * 2, 62 + bob - 26, 4, 4);
    text(ctx, 'BOOMBERMAN', 128, 96, '#f8d838', 24, 'center');
    text(ctx, 'M O O R E', 128, 122, '#f8f8f8', 12, 'center');
    const items = ['CAMPAIGN', 'BATTLE  2-4P'];
    items.forEach((it, i) => {
      const sel = this.titleSel === i;
      text(ctx, it, 128, 148 + i * 14, sel ? '#f8d838' : '#a8a8b8', 8, 'center');
      if (sel) text(ctx, '>', 128 - it.length * 3 - 12, 148 + i * 14, '#f8d838', 8, 'left');
    });
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', 128, 184, '#78f878', 8, 'center');
    text(ctx, `HI ${String(this.hi).padStart(6, '0')}`, 128, 202, '#8888a0', 8, 'center');
    text(ctx, '© 2026 MOORE SOFT', 128, 213, '#556', 7, 'center');
  }

  drawSetup() {
    ctx.fillStyle = '#181828';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'BATTLE SETUP', 128, 14, '#f8d838', 12, 'center');
    const s = this.setup;
    const rowY = (r) => 48 + r * 20;
    const cur = s.cursor;
    text(ctx, `PLAYERS  < ${s.count} >`, 128, rowY(0), cur === 0 ? '#f8d838' : '#c8c8d8', 8, 'center');
    for (let i = 0; i < s.count; i++) {
      const y = rowY(1 + i);
      const kind = s.slots[i].toUpperCase();
      const col = PCOLORS[PLAYER_COLORS[i]];
      ctx.fillStyle = col;
      ctx.fillRect(74, y - 1, 10, 10);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(74.5, y - 0.5, 9, 9);
      const ctrl = i === 0 ? 'WASD+F/G' : i === 1 ? 'ARROWS+K/L' : `GAMEPAD ${i - 1}`;
      text(ctx, `${PNAMES[i]}  < ${kind} >`, 92, y, cur === 1 + i ? '#f8d838' : '#c8c8d8', 8, 'left');
      text(ctx, kind === 'HUMAN' ? ctrl : 'CPU BOT', 246, y, '#667', 7, 'right');
    }
    const startRow = 1 + s.count;
    text(ctx, 'START!  best of 3', 128, rowY(startRow) + 6, cur === startRow ? '#78f878' : '#c8c8d8', 9, 'center');
    text(ctx, 'sudden death: walls close in at 60s', 128, 196, '#8888a0', 7, 'center');
    text(ctx, 'ESC back', 128, 208, '#556', 7, 'center');
  }

  drawIntro() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 88, VIEW_W, 52);
    if (this.mode === 'campaign') {
      text(ctx, `STAGE ${this.stageIdx + 1}`, 128, 98, '#f8d838', 12, 'center');
      text(ctx, THEMES[STAGES[this.stageIdx].theme].name, 128, 116, '#f8f8f8', 8, 'center');
      if (STAGES[this.stageIdx].boss) text(ctx, '!! BOSS !!', 128, 128, '#e84838', 8, 'center');
    } else {
      text(ctx, `ROUND ${this.round}`, 128, 98, '#f8d838', 12, 'center');
      const tally = this.wins.map((w, i) => `${PNAMES[i]}:${w}`).join('  ');
      text(ctx, tally, 128, 118, '#f8f8f8', 8, 'center');
    }
  }

  drawArena() {
    const w = this.world;
    if (!w) return;
    const th = THEMES[w.theme];
    ctx.save();
    if (w.shake > 0) {
      ctx.translate((Math.random() * 4 - 2) | 0, (Math.random() * 4 - 2) | 0);
    }
    const brMap = new Map(w.breaking.map((b) => [idx(b.cx, b.cy), b.t]));
    // tiles
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const px = OFF_X + x * TILE, py = OFF_Y + y * TILE;
        const t = w.grid[idx(x, y)];
        ctx.fillStyle = (x + y) % 2 ? th.floor2 : th.floor;
        ctx.fillRect(px, py, TILE, TILE);
        if (t === T.HARD) drawSprite(ctx, `hard${w.theme}`, px, py);
        else if (t === T.SOFT) drawSprite(ctx, `soft${w.theme}`, px, py);
        else if (t === T.BREAK) drawBreak(ctx, px, py, w.theme, brMap.get(idx(x, y)) || 0);
        else if (y > 0 && (w.grid[idx(x, y - 1)] === T.HARD || w.grid[idx(x, y - 1)] === T.SOFT)) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(px, py, TILE, 3);
        }
      }
    }
    // exit
    if (w.exitCell) {
      const px = OFF_X + w.exitCell.cx * TILE, py = OFF_Y + w.exitCell.cy * TILE;
      drawSprite(ctx, 'exit', px, py);
      if (w.exitOpen && this.frame % 30 < 15) {
        ctx.fillStyle = 'rgba(248,216,56,0.35)';
        ctx.fillRect(px + 3, py + 4, 10, 12);
      }
    }
    // pickups
    for (const u of w.pickups) {
      const bob = Math.sin((this.frame + u.cx * 7) / 12) > 0 ? 0 : -1;
      drawSprite(ctx, `pu_${u.type}`, OFF_X + u.cx * TILE, OFF_Y + u.cy * TILE + bob);
    }
    // next crush warning
    if (w.shrinkList && w.shrinkIdx < w.shrinkList.length) {
      const c = w.shrinkList[w.shrinkIdx];
      if (this.frame % 10 < 5) {
        ctx.fillStyle = 'rgba(232,56,40,0.4)';
        ctx.fillRect(OFF_X + c.x * TILE, OFF_Y + c.y * TILE, TILE, TILE);
      }
    }
    // bombs
    for (const b of w.bombs) {
      const pulse = Math.sin(this.frame / 5) > 0 ? 0 : 1;
      const sz = TILE - pulse * 2;
      const off = pulse;
      ctx.drawImage(SPR.bomb, b.px - 8 + OFF_X + off, b.py - 8 + OFF_Y + off, sz, sz);
      if (b.remote) {
        ctx.fillStyle = this.frame % 16 < 8 ? '#e84838' : '#f8d838';
        ctx.fillRect(b.px - 1 + OFF_X, b.py - 8 + OFF_Y, 2, 2);
      } else if (b.timer < 45 && this.frame % 8 < 4) {
        ctx.fillStyle = 'rgba(248,72,24,0.35)';
        ctx.fillRect(b.px - 7 + OFF_X, b.py - 6 + OFF_Y, 13, 13);
      }
    }
    // flames
    for (const f of w.flames) {
      drawFlame(ctx, OFF_X + f.cx * TILE, OFF_Y + f.cy * TILE, f.kind, f.t);
    }
    // enemies
    for (const e of w.enemies) {
      const spec = ENEMY_SPECS[e.type];
      const ex = OFF_X + e.px, ey = OFF_Y + e.py;
      if (e.dying) {
        if (e.dying % 6 < 3) {
          const sc = Math.max(0.15, 1 - e.dying / 30);
          const half = (spec.boss ? 16 : 8) * sc;
          ctx.drawImage(SPR[spec.sprite], ex - half, ey - half, half * 2, half * 2);
        }
        continue;
      }
      if (spec.ghost) ctx.globalAlpha = 0.75;
      if (spec.boss && e.invuln > 0 && this.frame % 6 < 3) ctx.globalAlpha = 0.5;
      const half = spec.boss ? 16 : 8;
      const bob = spec.boss ? 0 : Math.sin((this.frame + e.px) / 10) * 1;
      ctx.drawImage(SPR[spec.sprite], Math.round(ex - half), Math.round(ey - half + bob));
      ctx.globalAlpha = 1;
      if (spec.boss) {
        // HP bar
        ctx.fillStyle = '#101018';
        ctx.fillRect(ex - 17, ey - 24, 34, 5);
        ctx.fillStyle = '#e84838';
        ctx.fillRect(ex - 16, ey - 23, Math.max(0, 32 * (e.hp / (spec.hp || 1))), 3);
      }
    }
    // players (sorted by y so overlaps stack nicely)
    const sorted = w.players.slice().sort((a, b) => a.py - b.py);
    for (const p of sorted) {
      const px = OFF_X + p.px - 8, py = OFF_Y + p.py - 9;
      if (!p.alive) {
        if (p.deadT < 70 && p.deadT % 8 < 4) {
          const sc = Math.max(0.2, 1 - p.deadT / 70);
          ctx.drawImage(SPR[`bm_${p.color}_down0`], OFF_X + p.px - 8 * sc, OFF_Y + p.py - 9 * sc, 16 * sc, 16 * sc);
        }
        continue;
      }
      const pose = p.dir === 'up' ? 'up' : p.dir === 'down' ? 'down' : 'side';
      const fr = p.moving ? ((p.anim >> 3) & 1) : 0;
      drawSprite(ctx, `bm_${p.color}_${pose}${fr}`, px, py, p.dir === 'left');
    }
    ctx.restore();
  }

  drawHUD() {
    const w = this.world;
    ctx.fillStyle = '#101020';
    ctx.fillRect(0, 0, VIEW_W, OFF_Y);
    if (this.mode === 'campaign') {
      text(ctx, `S${this.stageIdx + 1}`, 4, 4, '#f8d838', 8);
      text(ctx, `x${Math.max(0, this.lives)}`, 34, 4, '#f8f8f8', 8);
      ctx.drawImage(SPR.bm_white_down0, 22, 2, 12, 12);
      text(ctx, String(this.score).padStart(6, '0'), 128, 4, '#f8f8f8', 8, 'center');
      const secs = Math.ceil(this.timeLeft / 60);
      const mm = (secs / 60) | 0, ss = secs % 60;
      const flash = this.timeLeft < 1800 && this.frame % 30 < 15;
      text(
        ctx,
        this.timeLeft > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : 'HURRY!',
        220, 4, flash || this.timeLeft <= 0 ? '#e84838' : '#78f878', 8,
      );
    } else if (w) {
      let x = 4;
      w.players.forEach((p, i) => {
        ctx.fillStyle = PCOLORS[p.color];
        ctx.fillRect(x, 3, 9, 9);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x + 0.5, 3.5, 8, 8);
        if (!p.alive) {
          ctx.strokeStyle = '#e84838';
          ctx.beginPath();
          ctx.moveTo(x, 3); ctx.lineTo(x + 9, 12);
          ctx.moveTo(x + 9, 3); ctx.lineTo(x, 12);
          ctx.stroke();
        }
        text(ctx, '*'.repeat(this.wins[i]) || '-', x + 12, 4, '#f8d838', 8);
        x += 44;
      });
      if (this.suddenOn) {
        if (this.frame % 20 < 12) text(ctx, 'SUDDEN DEATH!', 252, 4, '#e84838', 8, 'right');
      } else {
        const secs = Math.max(0, 60 - ((this.roundT / 60) | 0));
        text(ctx, `0:${String(secs).padStart(2, '0')}`, 252, 4, secs <= 10 ? '#e84838' : '#78f878', 8, 'right');
      }
    }
  }

  drawMatchEnd() {
    ctx.fillStyle = '#181828';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const i = this.roundWinner;
    text(ctx, 'CHAMPION!', 128, 60, '#f8d838', 16, 'center');
    if (i >= 0) {
      ctx.save();
      ctx.translate(128, 110);
      ctx.scale(2, 2);
      ctx.drawImage(SPR[`bm_${PLAYER_COLORS[i]}_down0`], -8, -8);
      ctx.restore();
      text(ctx, `${PNAMES[i]} WINS THE MATCH`, 128, 132, PCOLORS[PLAYER_COLORS[i]], 10, 'center');
    }
    const tally = this.wins.map((n, j) => `${PNAMES[j]}:${n}`).join('  ');
    text(ctx, tally, 128, 156, '#c8c8d8', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', 128, 190, '#78f878', 8, 'center');
  }

  drawGameOver() {
    text(ctx, 'GAME OVER', 128, 80, '#e84838', 16, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, 128, 112, '#f8f8f8', 8, 'center');
    text(ctx, `HI    ${String(this.hi).padStart(6, '0')}`, 128, 126, '#f8d838', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', 128, 160, '#78f878', 8, 'center');
  }

  drawVictory() {
    ctx.fillStyle = '#181828';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'YOU BLEW UP', 128, 56, '#f8d838', 12, 'center');
    text(ctx, 'ALL 10 STAGES!', 128, 72, '#f8d838', 12, 'center');
    ctx.save();
    ctx.translate(128, 116);
    ctx.scale(2, 2);
    ctx.drawImage(SPR.bm_white_down0, -8, -8);
    ctx.restore();
    text(ctx, 'MOORE TOWN IS SAFE... FOR NOW', 128, 140, '#f8f8f8', 8, 'center');
    text(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, 128, 162, '#f8f8f8', 8, 'center');
    text(ctx, `HI    ${String(this.hi).padStart(6, '0')}`, 128, 176, '#f8d838', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', 128, 198, '#78f878', 8, 'center');
  }
}

const game = new Game();
window.game = game; // for tests / tinkering

function loop() {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
