// Moormings — main loop, states, camera, HUD. The sim itself lives in
// sim.js (headless); this file is the eyes, ears and mouse of the game.

import { Input } from './input.js';
import { Sound } from './audio.js';
import { initSprites, SPR, ICO, frameFor, THEMES, STEEL_COLS, BRICK_COLS } from './sprites.js';
import { Sim, W, H, EMPTY, DIRT, STEEL, BRICK, SKILLS } from './sim.js';
import { LEVELS, TIERS } from './levels.js';

const VIEW_W = 320, VIEW_H = 200;   // Amiga-ish
const WORLD_H = 160;                // world viewport height; HUD below
const LS_KEY = 'moormings.unlocked';

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

const hex2abgr = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
};

// toolbar: [rr-, rr+, 8 skills, pause, nuke, ff]
const BTN_W = 24, BTN_Y = 172, BTN_H = 26, BTN_X0 = 4;
const BTN_ICONS = [null, null, ...SKILLS, 'pause', 'nuke', 'ff'];
const SKILL_KEYS = { 1: 'climber', 2: 'floater', 3: 'bomber', 4: 'blocker', 5: 'builder', 6: 'basher', 7: 'miner', 8: 'digger' };

class Game {
  constructor() {
    this.input = new Input(canvas, VIEW_W, VIEW_H);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.unlocked = Number(localStorage.getItem(LS_KEY) || 1);
    this.levelIdx = 0;
    this.particles = [];
    this.demoFolk = [];
    for (let i = 0; i < 7; i++) this.demoFolk.push({ x: -20 - i * 34, f: i * 5 });

    // terrain render buffers
    this.tCanvas = document.createElement('canvas');
    this.tCanvas.width = W; this.tCanvas.height = H;
    this.tCtx = this.tCanvas.getContext('2d');
    this.tImg = this.tCtx.createImageData(W, H);
    this.t32 = new Uint32Array(this.tImg.data.buffer);

    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);

    this.input.onClick = (x, y) => this.click(x, y);
    this.input.onDrag = (dx, downY) => {
      if (this.state === 'play' && downY < WORLD_H) this.camX -= dx;
    };
    this.input.onKey = (k, e) => this.keydown(k, e);
  }

  // ---------------- level lifecycle ----------------

  startLevel(idx) {
    this.levelIdx = idx;
    const level = LEVELS[idx];
    this.sim = new Sim(level);
    this.theme = THEMES[level.theme];
    this.camX = Math.max(0, Math.min(W - VIEW_W, level.hatch.x - VIEW_W / 2));
    this.selectedSkill = null;
    this.paused = false;
    this.ff = false;
    this.nukeArm = 0;
    this.endWait = 0;
    this.particles = [];
    this.hovered = -1;
    this.firstSpawn = true;
    this.buildLUTs(level);
    this.state = 'play';
    this.sound.playMusic(level.id % 2 ? 'tune1' : 'tune2');
  }

  buildLUTs(level) {
    const th = THEMES[level.theme];
    const dirt = th.dirt.map(hex2abgr), top = hex2abgr(th.top);
    const steel = STEEL_COLS.map(hex2abgr), brick = BRICK_COLS.map(hex2abgr);
    this.lutDirt = new Uint32Array(W * H);
    this.lutSteel = new Uint32Array(W * H);
    this.lutBrick = new Uint32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const h = (x * 7 + y * 13 + ((x >> 3) * 5) ^ (y >> 2)) & 15;
        this.lutDirt[i] = dirt[h & 3];
        this.lutSteel[i] = ((x & 7) === 0 || (y & 7) === 0) ? steel[2] : steel[(h >> 2) & 1];
        this.lutBrick[i] = brick[(x >> 1) & 1];
      }
    }
    this.lutTop = top;
  }

  // ---------------- input handling ----------------

  keydown(k, e) {
    const s = this.sound;
    if (k === 'm' || k === 'M') { s.toggleMute(); return; }
    if (this.state === 'title') { if (k === 'Enter' || k === ' ') this.toSelect(); return; }
    if (this.state === 'select') {
      if (k === 'Escape') this.state = 'title';
      return;
    }
    if (this.state === 'results') {
      if (k === 'Enter') this.resultsAction(this.lastWon ? 'next' : 'retry');
      if (k === 'Escape') this.toSelect();
      return;
    }
    if (this.state !== 'play') return;
    if (SKILL_KEYS[k]) { this.selectedSkill = SKILL_KEYS[k]; s.uiClick(); }
    else if (k === 'p' || k === 'P') { this.paused = !this.paused; s.uiClick(); }
    else if (k === 'f' || k === 'F') { this.ff = !this.ff; s.uiClick(); }
    else if (k === 'n' || k === 'N') this.pressNuke();
    else if (k === 'r' || k === 'R') this.startLevel(this.levelIdx);
    else if (k === 'Escape') this.toSelect();
    else if (k === '+' || k === '=') this.sim.setRate(this.sim.rate + 1);
    else if (k === '-' || k === '_') this.sim.setRate(this.sim.rate - 1);
  }

  pressNuke() {
    if (this.nukeArm > 0) { this.sim.nuke(); this.nukeArm = 0; }
    else { this.nukeArm = 75; this.sound.uiClick(); }
  }

  toSelect() {
    this.state = 'select';
    this.sound.playMusic('tune1');
  }

  click(x, y) {
    const s = this.sound;
    if (this.state === 'title') { this.toSelect(); return; }
    if (this.state === 'select') { this.clickSelect(x, y); return; }
    if (this.state === 'results') { this.clickResults(x, y); return; }
    if (this.state !== 'play') return;

    // toolbar
    if (y >= BTN_Y && y < BTN_Y + BTN_H && x >= BTN_X0 && x < BTN_X0 + 13 * BTN_W) {
      const b = Math.floor((x - BTN_X0) / BTN_W);
      if (b >= 2 && b <= 9) { this.selectedSkill = SKILLS[b - 2]; s.uiClick(); }
      else if (b === 10) { this.paused = !this.paused; s.uiClick(); }
      else if (b === 11) this.pressNuke();
      else if (b === 12) { this.ff = !this.ff; s.uiClick(); }
      return; // rr-/rr+ handled as held buttons in update()
    }
    // minimap jump
    if (y >= 160 && y < 172 && x >= 222) {
      this.camX = Math.max(0, Math.min(W - VIEW_W, (x - 222) / 96 * W - VIEW_W / 2));
      return;
    }
    // world click — assign selected skill to hovered moorming
    if (y < WORLD_H) {
      const idx = this.pickMoorming(x + this.camX, y);
      if (idx >= 0 && this.selectedSkill) {
        if (this.sim.assign(idx, this.selectedSkill)) s.pop();
        else s.deny();
      }
    }
  }

  pickMoorming(wx, wy) {
    let best = -1, bestWalker = -1;
    for (const m of this.sim.moormings) {
      if (!this.sim.active(m)) continue;
      if (Math.abs(m.x - wx) <= 5 && wy >= m.y - 14 && wy <= m.y + 3) {
        if (best < 0) best = m.id;
        // workers last: prefer plain walkers/fallers under the cursor
        if (bestWalker < 0 && (m.job === 'walker' || m.job === 'faller')) bestWalker = m.id;
      }
    }
    return bestWalker >= 0 ? bestWalker : best;
  }

  clickSelect(x, y) {
    for (let i = 0; i < LEVELS.length; i++) {
      const bx = 26 + (i % 4) * 70, by = 52 + Math.floor(i / 4) * 48;
      if (x >= bx && x < bx + 64 && y >= by && y < by + 26) {
        if (i + 1 <= this.unlocked) { this.sound.uiClick(); this.startLevel(i); }
        else this.sound.deny();
        return;
      }
    }
  }

  clickResults(x, y) {
    if (y >= 128 && y < 148) {
      if (x < 110) this.resultsAction('retry');
      else if (x < 210) { if (this.lastWon) this.resultsAction('next'); }
      else this.toSelect();
    }
  }

  resultsAction(a) {
    if (a === 'retry') this.startLevel(this.levelIdx);
    else if (a === 'next') {
      if (this.levelIdx + 1 < LEVELS.length) this.startLevel(this.levelIdx + 1);
      else this.state = 'title';
    }
  }

  // ---------------- per-frame update ----------------

  update() {
    this.frame++;
    if (this.state !== 'play') return;
    const sim = this.sim, inp = this.input;

    if (this.nukeArm > 0) this.nukeArm--;

    // held release-rate buttons
    if (inp.down && !inp.dragging && inp.my >= BTN_Y && inp.my < BTN_Y + BTN_H) {
      const b = Math.floor((inp.mx - BTN_X0) / BTN_W);
      if ((b === 0 || b === 1) && this.frame % 3 === 0) {
        sim.setRate(sim.rate + (b === 0 ? -1 : 1));
      }
    }
    // minimap scrub
    if (inp.down && inp.my >= 160 && inp.my < 172 && inp.mx >= 222) {
      this.camX = (inp.mx - 222) / 96 * W - VIEW_W / 2;
    }
    // scrolling: arrows + edge hover
    if (inp.key('ArrowLeft')) this.camX -= 5;
    if (inp.key('ArrowRight')) this.camX += 5;
    if (inp.my < WORLD_H && !inp.down) {
      if (inp.mx < 6) this.camX -= 4;
      else if (inp.mx > VIEW_W - 6) this.camX += 4;
    }
    this.camX = Math.max(0, Math.min(W - VIEW_W, this.camX));

    // hover pick
    this.hovered = (inp.my < WORLD_H) ? this.pickMoorming(inp.mx + this.camX, inp.my) : -1;

    // sim ticks
    const steps = this.paused ? 0 : (this.ff ? 4 : 1);
    for (let i = 0; i < steps; i++) {
      sim.tick();
      this.handleEvents();
      if (sim.finished) break;
    }

    if (sim.finished) {
      this.endWait++;
      if (this.endWait > 75) {
        this.lastWon = sim.won;
        if (sim.won) {
          this.unlocked = Math.max(this.unlocked, LEVELS[this.levelIdx].id + 1);
          localStorage.setItem(LS_KEY, String(this.unlocked));
          this.sound.winJingle();
        } else this.sound.loseJingle();
        this.sound.stopMusic();
        this.state = 'results';
      }
    }

    // particles
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.t--;
    }
    this.particles = this.particles.filter((p) => p.t > 0);
  }

  handleEvents() {
    const s = this.sound;
    for (const e of this.sim.events) {
      switch (e.t) {
        case 'spawn':
          if (this.firstSpawn) { s.letsgo(); this.firstSpawn = false; }
          else s.spawnBlip();
          break;
        case 'assign': break; // pop played on click
        case 'ohno': s.ohno(); break;
        case 'boom': s.boom(); this.burst(e.x, e.y, 24, ['#f8d838', '#f08838', '#a86048', '#58e858']); break;
        case 'splat': s.splat(); this.burst(e.x, e.y - 2, 8, ['#58e858', '#4868f0']); break;
        case 'drown': case 'burn': s.drown(); break;
        case 'yippee': s.yippee(); break;
        case 'clink': s.clink(); this.burst(e.x, e.y, 4, ['#f8f8f8', '#f8d838']); break;
        case 'chip': s.chip(); break;
        case 'brick': s.brick(); break;
        case 'shrug': s.shrug(); break;
        case 'brolly': s.brolly(); break;
        case 'tick': s.tick(); break;
      }
    }
    this.sim.events.length = 0;
  }

  burst(x, y, n, cols) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -Math.random() * 2.2 - 0.4,
        t: 20 + Math.random() * 22 | 0,
        c: cols[(Math.random() * cols.length) | 0],
      });
    }
  }

  // ---------------- drawing ----------------

  draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.state === 'title') this.drawTitle();
    else if (this.state === 'select') this.drawSelect();
    else if (this.state === 'play') this.drawPlay();
    else if (this.state === 'results') { this.drawPlay(); this.drawResults(); }
  }

  drawSky(th) {
    for (let i = 0; i < 8; i++) {
      const f = i / 7;
      const mix = (a, b) => Math.round(a + (b - a) * f);
      const c0 = parseInt(th.sky0.slice(1), 16), c1 = parseInt(th.sky1.slice(1), 16);
      ctx.fillStyle = `rgb(${mix(c0 >> 16, c1 >> 16)},${mix((c0 >> 8) & 255, (c1 >> 8) & 255)},${mix(c0 & 255, c1 & 255)})`;
      ctx.fillRect(0, i * 20, VIEW_W, 20);
    }
    // distant hills, light parallax
    ctx.fillStyle = th.hill;
    const off = this.camX ? this.camX * 0.3 : 0;
    for (let x = 0; x < VIEW_W; x += 4) {
      const wx = x + off;
      const hgt = 34 + Math.sin(wx * 0.02) * 14 + Math.sin(wx * 0.053 + 2) * 8;
      ctx.fillRect(x, WORLD_H - hgt, 4, hgt);
    }
  }

  renderTerrain() {
    const t = this.sim.terrain, d = this.t32;
    for (let i = 0; i < t.length; i++) {
      const v = t[i];
      if (v === EMPTY) { d[i] = 0; continue; }
      if (v === DIRT) d[i] = (i >= W && t[i - W] === EMPTY) ? this.lutTop : this.lutDirt[i];
      else if (v === STEEL) d[i] = this.lutSteel[i];
      else d[i] = this.lutBrick[i];
    }
    this.tCtx.putImageData(this.tImg, 0, 0);
  }

  drawPlay() {
    const sim = this.sim, level = sim.level, cam = this.camX | 0;
    this.drawSky(this.theme);

    // hazards behind terrain
    for (const hz of level.hazards) this.drawHazard(hz, cam);

    this.renderTerrain();
    ctx.drawImage(this.tCanvas, cam, 0, VIEW_W, WORLD_H, 0, 0, VIEW_W, WORLD_H);

    // steel zone markers (subtle corner ticks)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    for (const o of level.terrain) {
      if (o.op !== 'steel') continue;
      ctx.strokeRect(o.x - cam + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    }

    this.drawHatch(level.hatch, cam);
    this.drawExit(level.exit, cam);

    // moormings
    for (const m of sim.moormings) {
      if (!m.alive) continue;
      const name = frameFor(m, sim.tick_);
      const spr = SPR[name][m.dir < 0 ? 1 : 0];
      const sx = m.x - 4 - cam, sy = m.y - 13;
      if (sx < -10 || sx > VIEW_W + 10) continue;
      if (m.id === this.hovered) {
        ctx.strokeStyle = '#f8f8f8';
        ctx.strokeRect(sx - 1.5, sy + 1.5, 11, 12);
      }
      ctx.drawImage(spr, sx, sy);
      if (m.bombTick >= 0) {
        text(ctx, String(Math.ceil(m.bombTick / 60)), m.x - cam, sy - 7, '#f8f8f8', 7, 'center');
      }
    }

    // particles
    for (const p of this.particles) {
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - cam, p.y, 1.5, 1.5);
    }

    this.drawHUD();
    this.drawCursor();

    if (this.paused) text(ctx, 'PAUSED', VIEW_W / 2, 70, '#f8f8f8', 14, 'center');
    if (this.nukeArm > 0 && (this.frame >> 2) % 2) text(ctx, 'NUKE? PRESS AGAIN', VIEW_W / 2, 84, '#f04838', 9, 'center');
  }

  drawHazard(hz, cam) {
    const t = this.frame;
    if (hz.type === 'water') {
      ctx.fillStyle = '#1c50c0';
      ctx.fillRect(hz.x - cam, hz.y, hz.w, H - hz.y);
      ctx.fillStyle = '#4880e8';
      for (let x = 0; x < hz.w; x += 4) {
        const dy = Math.sin((x + hz.x + t * 0.8) * 0.15) * 1.5;
        ctx.fillRect(hz.x + x - cam, hz.y + 1 + dy, 4, 2);
      }
    } else {
      ctx.fillStyle = '#c03810';
      ctx.fillRect(hz.x - cam, hz.y, hz.w, H - hz.y);
      ctx.fillStyle = '#f8a030';
      for (let x = 0; x < hz.w; x += 3) {
        const dy = Math.sin((x + hz.x) * 0.9 + t * 0.12) * 1.8;
        ctx.fillRect(hz.x + x - cam, hz.y + 1 + dy, 3, 2);
      }
    }
  }

  drawHatch(hatch, cam) {
    const x = hatch.x - cam, y = hatch.y;
    ctx.fillStyle = '#584838';
    ctx.fillRect(x - 9, y - 8, 18, 4);
    ctx.fillStyle = '#786048';
    ctx.fillRect(x - 7, y - 6, 14, 3);
    // trapdoor leaves swing
    ctx.fillStyle = '#403020';
    const sw = ((this.frame >> 3) & 1) ? 5 : 6;
    ctx.fillRect(x - 7, y - 4, sw, 2);
    ctx.fillRect(x + 7 - sw, y - 4, sw, 2);
  }

  drawExit(exit, cam) {
    const x = exit.x - cam, y = exit.y;
    ctx.fillStyle = '#302418';
    ctx.fillRect(x - 7, y - 16, 14, 16);
    ctx.fillStyle = '#100c08';
    ctx.fillRect(x - 5, y - 13, 10, 13);
    ctx.fillStyle = '#584838';
    ctx.fillRect(x - 9, y - 18, 18, 3);
    // beckoning glow
    const g = 96 + Math.sin(this.frame * 0.1) * 48;
    ctx.fillStyle = `rgb(${g | 0},${(g * 0.9) | 0},40)`;
    ctx.fillRect(x - 3, y - 11, 6, 9);
    // flag
    ctx.fillStyle = '#786048';
    ctx.fillRect(x + 8, y - 26, 1, 10);
    ctx.fillStyle = '#f04838';
    ctx.fillRect(x + 9, y - 26 + (((this.frame >> 4) & 1)), 5, 3);
  }

  drawHUD() {
    const sim = this.sim;
    ctx.fillStyle = '#181824';
    ctx.fillRect(0, 160, VIEW_W, 40);

    // info line
    let info = '';
    if (this.hovered >= 0) {
      const m = sim.moormings[this.hovered];
      if (m && this.sim.active(m)) {
        const tags = (m.climber ? 'C' : '') + (m.floater ? 'F' : '') + (m.bombTick >= 0 ? 'B' : '');
        info = m.job.toUpperCase() + (tags ? ` +${tags}` : '');
      }
    }
    text(ctx, info, 4, 162, '#8ee860', 7);
    const tl = Math.max(0, Math.ceil(sim.timeLeft / 60));
    const mm = Math.floor(tl / 60), ss = String(tl % 60).padStart(2, '0');
    text(ctx, `OUT ${sim.moormings.filter((m) => m.alive).length}  IN ${sim.saved}/${sim.level.quota}  ${mm}-${ss}`, 116, 162, '#e8e8f0', 7);

    // minimap
    ctx.fillStyle = '#000';
    ctx.fillRect(221, 160, 98, 11);
    ctx.drawImage(this.tCanvas, 0, 0, W, H, 222, 160.5, 96, 10);
    ctx.fillStyle = '#58e858';
    for (const m of sim.moormings) {
      if (!m.alive) continue;
      ctx.fillRect(222 + m.x / W * 96, 160.5 + m.y / H * 10 - 1, 1, 1);
    }
    ctx.strokeStyle = '#f8f8f8';
    ctx.strokeRect(222 + this.camX / W * 96 + 0.5, 160.5, VIEW_W / W * 96, 10);

    // toolbar buttons
    for (let b = 0; b < 13; b++) {
      const bx = BTN_X0 + b * BTN_W;
      const icon = BTN_ICONS[b];
      const isSel = b >= 2 && b <= 9 && this.selectedSkill === SKILLS[b - 2];
      const isOn = (b === 10 && this.paused) || (b === 12 && this.ff) || (b === 11 && this.nukeArm > 0);
      ctx.fillStyle = isSel ? '#38507a' : isOn ? '#6a3030' : '#282838';
      ctx.fillRect(bx, BTN_Y, BTN_W - 1, BTN_H);
      ctx.strokeStyle = isSel ? '#f8d838' : '#484858';
      ctx.strokeRect(bx + 0.5, BTN_Y + 0.5, BTN_W - 2, BTN_H - 1);
      if (b === 0 || b === 1) {
        text(ctx, b === 0 ? '-' : '+', bx + 11, BTN_Y + 2, '#e8e8f0', 10, 'center');
        text(ctx, String(b === 0 ? sim.minRate : sim.rate), bx + 11, BTN_Y + 15, '#8ee860', 8, 'center');
      } else {
        ctx.drawImage(ICO[icon], bx + 6, BTN_Y + 3);
        if (b >= 2 && b <= 9) {
          const n = sim.skills[SKILLS[b - 2]] | 0;
          text(ctx, String(n), bx + 11, BTN_Y + 15, n > 0 ? '#f8f8f8' : '#666', 8, 'center');
        }
      }
    }
  }

  drawCursor() {
    const { mx, my } = this.input;
    if (my >= WORLD_H) return;
    ctx.strokeStyle = this.hovered >= 0 ? '#f8d838' : '#f8f8f8';
    ctx.beginPath();
    ctx.moveTo(mx - 6, my + 0.5); ctx.lineTo(mx - 2, my + 0.5);
    ctx.moveTo(mx + 3, my + 0.5); ctx.lineTo(mx + 7, my + 0.5);
    ctx.moveTo(mx + 0.5, my - 6); ctx.lineTo(mx + 0.5, my - 2);
    ctx.moveTo(mx + 0.5, my + 3); ctx.lineTo(mx + 0.5, my + 7);
    ctx.stroke();
  }

  // ---------------- title / select / results ----------------

  drawTitle() {
    this.drawSky(THEMES.moss);
    // ground strip
    ctx.fillStyle = '#3e7a2e';
    ctx.fillRect(0, 150, VIEW_W, 50);
    ctx.fillStyle = '#8ee860';
    ctx.fillRect(0, 150, VIEW_W, 2);

    text(ctx, 'MOORMINGS', VIEW_W / 2 + 2, 34, '#103018', 30, 'center');
    text(ctx, 'MOORMINGS', VIEW_W / 2, 32, '#58e858', 30, 'center');
    text(ctx, 'oh no! more walking!', VIEW_W / 2, 66, '#a8c0f0', 9, 'center');

    // marching demo
    for (const f of this.demoFolk) {
      f.x += 0.25;
      if (f.x > VIEW_W + 12) f.x = -14;
      const spr = SPR[((this.frame + f.f) >> 3) & 1 ? 'walk1' : 'walk2'][0];
      ctx.drawImage(spr, f.x | 0, 150 - 13);
    }

    if ((this.frame >> 5) % 2) text(ctx, 'CLICK TO START', VIEW_W / 2, 106, '#f8f8f8', 10, 'center');
    text(ctx, 'save the little green-haired folk', VIEW_W / 2, 176, '#556', 7, 'center');
    text(ctx, 'M mute - Esc menus', VIEW_W / 2, 188, '#556', 7, 'center');
  }

  drawSelect() {
    this.drawSky(THEMES.crystal);
    text(ctx, 'CHOOSE A LEVEL', VIEW_W / 2, 8, '#f8f8f8', 12, 'center');
    for (let t = 0; t < 3; t++) {
      text(ctx, TIERS[t].toUpperCase(), 26, 40 + t * 48, ['#8ee860', '#a8c0f0', '#f0a060'][t], 8);
    }
    for (let i = 0; i < LEVELS.length; i++) {
      const bx = 26 + (i % 4) * 70, by = 52 + Math.floor(i / 4) * 48;
      const open = i + 1 <= this.unlocked;
      const done = i + 1 < this.unlocked;
      ctx.fillStyle = open ? '#283850' : '#1a1a22';
      ctx.fillRect(bx, by, 64, 26);
      ctx.strokeStyle = open ? '#4868a0' : '#333';
      ctx.strokeRect(bx + 0.5, by + 0.5, 63, 25);
      text(ctx, String(i + 1) + (done ? ' *' : ''), bx + 4, by + 3, open ? '#f8d838' : '#555', 8);
      const words = LEVELS[i].title.split(' ');
      let line = '', ln = 0;
      for (const wd of words) {
        if ((line + ' ' + wd).trim().length > 11) { text(ctx, line.trim(), bx + 4, by + 12 + ln * 7, open ? '#c8d0e0' : '#444', 6); line = wd; ln++; }
        else line += ' ' + wd;
      }
      if (line.trim() && ln < 2) text(ctx, line.trim(), bx + 4, by + 12 + ln * 7, open ? '#c8d0e0' : '#444', 6);
    }
    text(ctx, '* = rescued', VIEW_W / 2, 190, '#556', 7, 'center');
  }

  drawResults() {
    const sim = this.sim, level = sim.level;
    ctx.fillStyle = 'rgba(8,8,16,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const won = this.lastWon;
    text(ctx, won ? 'ALL SAFE ENOUGH!' : 'OH DEAR...', VIEW_W / 2, 34, won ? '#58e858' : '#f04838', 16, 'center');
    text(ctx, level.title, VIEW_W / 2, 58, '#a8c0f0', 9, 'center');
    text(ctx, `You saved ${sim.saved} of ${level.spawn}`, VIEW_W / 2, 78, '#f8f8f8', 10, 'center');
    text(ctx, `You needed ${level.quota}`, VIEW_W / 2, 92, '#c8d0e0', 9, 'center');
    if (won && level.id >= LEVELS.length) {
      text(ctx, 'THE MOOR IS SAVED! THANK YOU!', VIEW_W / 2, 110, '#f8d838', 9, 'center');
    }
    const opts = won
      ? (level.id >= LEVELS.length ? ['RETRY', '', 'MENU'] : ['RETRY', 'NEXT', 'MENU'])
      : ['RETRY', '', 'MENU'];
    const xs = [55, 160, 265];
    for (let i = 0; i < 3; i++) {
      if (!opts[i]) continue;
      ctx.fillStyle = '#283850';
      ctx.fillRect(xs[i] - 36, 128, 72, 20);
      ctx.strokeStyle = '#4868a0';
      ctx.strokeRect(xs[i] - 35.5, 128.5, 71, 19);
      text(ctx, opts[i], xs[i], 133, '#f8f8f8', 9, 'center');
    }
    text(ctx, won ? 'Enter = next' : 'Enter = retry', VIEW_W / 2, 160, '#556', 7, 'center');
  }
}

// ---------------- boot ----------------

initSprites();
const game = new Game();
window.__game = game;   // exposed for automated tests

let last = performance.now(), acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= 1000 / 60) {
    game.update();
    acc -= 1000 / 60;
  }
  game.sound.updateMusic();
  game.draw();
}
requestAnimationFrame(loop);
