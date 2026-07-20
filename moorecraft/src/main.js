// main.js — Moorecraft: The Shattered Sky.
// Game loop, states, HUD, save/load, and the headless test hook (window.__moore).

import { World, B, BLOCKS, isSolid } from './world.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { Entities } from './entities.js';
import { Inventory, RECIPES, ITEMS, I, itemName, toolTier } from './craft.js';
import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { buildTextures, drawItemIcon } from './sprites.js';

const RW = 200, RH = 120;
const DAY_LEN = 200; // seconds per full day-night cycle
const REACH = 5;
const SAVE_KEY = 'moorecraft_save_v1';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * s)}px`;
  canvas.style.height = `${Math.floor(canvas.height * s)}px`;
}
window.addEventListener('resize', fitCanvas);

function text(str, x, y, color = '#fff', size = 12, align = 'left') {
  ctx.font = `${size}px monospace`; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}

class Game {
  constructor() {
    buildTextures();
    this.input = new Input(canvas);
    initTouch(this.input, this);
    this._touchPlay = document.getElementById('tc-play');
    this._touchShown = null;
    this.sound = new Sound();
    this.renderer = new Renderer(canvas);
    this.renderer.setRes(RW, RH);
    this.state = 'title';
    this.titleSel = 0;
    this.seed = 1337;
    this.time = DAY_LEN * 0.25; // start morning
    this.mineAcc = 0; this.mineKey = '';
    this.swing = 0; this.placeCd = 0;
    this.craftFull = false;
    this.msg = ''; this.msgT = 0;
    this.frame = 0;

    this.input.onKey = (code) => this.onKey(code);
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock, { once: false });
    window.addEventListener('pointerdown', unlock, { once: false });
    canvas.addEventListener('mousedown', () => {
      if (performance.now() - this.input._lastTouchTapTime < 700) return;
      if (this.state === 'playing' && !this.input.locked) this.input.requestLock();
    });
  }

  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }

  newWorld(mode, seed) {
    this.mode = mode;
    this.seed = seed | 0;
    this.world = new World(this.seed);
    this.world.generate();
    this.player = new Player(this.world.spawn);
    this.player.creative = mode === 'creative';
    this.entities = new Entities();
    this.inv = new Inventory();
    if (mode === 'creative') { this.inv.giveCreative(); this.player.flying = true; }
    else this.inv.giveStarter();
    this.time = DAY_LEN * 0.25;
    this.state = 'playing';
  }

  loadWorld() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      this.mode = d.mode; this.seed = d.seed;
      this.world = new World(d.seed); this.world.generate();
      this.world.loadDiff(d.diff || []);
      this.player = new Player(this.world.spawn);
      this.player.creative = d.mode === 'creative';
      this.player.x = d.px; this.player.y = d.py; this.player.z = d.pz;
      this.player.yaw = d.yaw; this.player.pitch = d.pitch;
      this.player.health = d.health ?? 20;
      this.entities = new Entities();
      this.inv = new Inventory(); this.inv.load(d.inv);
      this.time = d.time ?? DAY_LEN * 0.25;
      this.state = 'playing';
      return true;
    } catch (e) { return false; }
  }

  save() {
    if (!this.world) return;
    const p = this.player;
    const d = {
      seed: this.seed, mode: this.mode, diff: this.world.serializeDiff(),
      inv: this.inv.serialize(), px: p.x, py: p.y, pz: p.z, yaw: p.yaw, pitch: p.pitch,
      time: this.time, health: p.health,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); this.flash('Saved'); } catch {}
  }

  flash(m) { this.msg = m; this.msgT = 2; }

  onKey(code) {
    if (this.state === 'title') {
      if (code === 'ArrowUp') this.titleSel = (this.titleSel + 2) % 3;
      if (code === 'ArrowDown') this.titleSel = (this.titleSel + 1) % 3;
      if (code === 'Enter' || code === 'Space') this.titleSelect();
      return;
    }
    if (code === 'KeyM') { const m = this.sound.toggleMute(); this.flash(m ? 'Muted' : 'Sound on'); }
    if (this.state === 'playing') {
      if (code === 'KeyE') { this.openCraft(false); }
      if (code === 'Escape') { this.save(); }
      if (code === 'KeyF') this.fireTether();
      if (code === 'KeyG') this.save();
      if (code === 'KeyP') { this.player.creative = !this.player.creative; this.flash('creative ' + this.player.creative); }
    } else if (this.state === 'inventory') {
      if (code === 'KeyE' || code === 'Escape') this.state = 'playing';
    } else if (this.state === 'dead') {
      if (code === 'Enter' || code === 'Space') { this.player.respawn(); this.state = 'playing'; }
    }
  }

  titleSelect() {
    if (this.titleSel === 0) this.newWorld('survival', this.seed);
    else if (this.titleSel === 1) this.newWorld('creative', this.seed);
    else if (this.titleSel === 2) { if (!this.loadWorld()) this.newWorld('survival', this.seed); }
  }

  openCraft(full) {
    this.craftFull = full;
    this.state = 'inventory';
  }

  fireTether() {
    const held = this.inv.selId();
    const hasTether = this.inv.count(I.TETHER) > 0 || this.player.creative;
    if (!hasTether) { this.flash('need Tether tool'); return; }
    if (this.player.fireTether(this.world)) this.sound.tetherZip();
  }

  // ---------------- update ----------------
  update(dt) {
    this.frame++;
    if (this.state !== 'playing') { this._consumeUi(); return; }
    const p = this.player, w = this.world, inp = this.input;

    // look
    const [ldx, ldy] = inp.lookDelta();
    p.yaw += ldx * 0.0028;
    p.pitch -= ldy * 0.0028;
    const lim = Math.PI / 2 - 0.02;
    if (p.pitch > lim) p.pitch = lim; if (p.pitch < -lim) p.pitch = -lim;

    // hotbar select
    const w2 = inp.consumeWheel();
    if (w2) this.inv.sel = (this.inv.sel + w2 + 9) % 9;
    const hk = inp.consumeHotbar();
    if (hk >= 0 && hk < 9) this.inv.sel = hk;

    // double-tap space -> toggle fly (creative)
    if (inp.keys['Space']) {
      if (!this._spaceHeld) {
        const now = performance.now();
        if (now - (this._lastSpace || 0) < 300 && p.creative) p.toggleFly();
        this._lastSpace = now; this._spaceHeld = true;
      }
    } else this._spaceHeld = false;

    // movement
    const mv = inp.moveState();
    const r = p.update(w, mv, dt);
    if (p.footstep) this.sound.footstep(this._matUnder());
    if (r.landed) this.sound.footstep(this._matUnder());

    // targeting
    const [fx, fy, fz] = p.forward();
    this.target = w.raycastPick(p.eyeX(), p.eyeY(), p.eyeZ(), fx, fy, fz, REACH);

    // mining
    this._doMining(dt);
    // placing / table open
    this._doPlace(dt);

    // entities
    const night = this._isNight();
    this.entities.update(w, p, dt, { isNight: night, inv: this.inv, audio: this.sound });

    // day/night audio + birdsong at dawn
    this.sound.setNight(night);
    const tod = (this.time % DAY_LEN) / DAY_LEN;
    if (this._lastTod !== undefined) {
      if (this._lastTod < 0.24 && tod >= 0.24) this.sound.dayBird();
    }
    this._lastTod = tod;

    // time
    this.time += dt;

    // death
    if (p.dead || p.health <= 0) {
      if (this.mode === 'survival') { this.state = 'dead'; this.sound.hurt(); }
      else { p.health = 20; p.dead = false; p.respawn(); }
    }
    if (p.hurtFlash > 0 && !this._hurtSounded) { this.sound.hurt(); this._hurtSounded = true; }
    if (p.hurtFlash <= 0) this._hurtSounded = false;

    if (this.placeCd > 0) this.placeCd -= dt;
    if (this.swing > 0) this.swing -= dt * 3;
    if (this.msgT > 0) this.msgT -= dt;

    // autosave every ~20s
    this._saveT = (this._saveT || 0) + dt;
    if (this._saveT > 20) { this._saveT = 0; this.save(); }
  }

  _consumeUi() {
    // in inventory, clicking handled via consumeClickL against recipe rows
    if (this.state === 'inventory') {
      if (this.input.consumeClickL()) this._craftClick();
      const hk = this.input.consumeHotbar();
      if (hk >= 0 && hk < 9) this.inv.sel = hk;
    }
    this.input.consumeClickR();
  }

  _matUnder() {
    const p = this.player;
    const id = this.world.get(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z));
    return id === B.SAND ? 1 : id === B.STONE || id === B.COBBLE ? 2 : 0;
  }

  _isNight() {
    const tod = (this.time % DAY_LEN) / DAY_LEN;
    const e = -Math.cos(tod * Math.PI * 2);
    return e < -0.12;
  }

  _doMining(dt) {
    const inp = this.input, p = this.player;
    if (!inp.leftDown || !this.target) { this.mineAcc = 0; this.mineKey = ''; return; }
    const t = this.target;
    const id = t.hitId;
    const def = BLOCKS[id];
    if (def.tier >= 9 || def.hard >= 999) { return; } // unbreakable
    const key = `${t.bx},${t.by},${t.bz}`;
    if (key !== this.mineKey) { this.mineKey = key; this.mineAcc = 0; }
    const pTier = toolTier(this.inv.selId());
    const gated = def.tier > 0 && pTier < def.tier;
    if (p.creative) {
      this._breakBlock(t, true); return;
    }
    // speed: right tool faster; wrong/none slow; gated even slower
    let speed = 1 + pTier * 0.9;
    if (gated) speed = 0.35;
    this.mineAcc += dt * speed;
    if (this.frame % 6 === 0) this.sound.mine();
    this.swing = 1;
    if (this.mineAcc >= def.hard) {
      this._breakBlock(t, !gated);
      this.mineAcc = 0; this.mineKey = '';
    }
  }

  _breakBlock(t, drop) {
    const id = t.hitId;
    const def = BLOCKS[id];
    this.world.set(t.bx, t.by, t.bz, B.AIR);
    this.world.recomputeLight();
    this.sound.breakBlock(Math.max(0.4, def.hard));
    this.swing = 1;
    if (drop && def.drop && !this.player.creative) {
      this.entities.spawnDrop(t.bx + 0.5, t.by + 0.5, t.bz + 0.5, def.drop, 1);
    }
    // chance of apple from leaves
    if (id === B.LEAVES && Math.random() < 0.15) this.entities.spawnDrop(t.bx + 0.5, t.by + 0.5, t.bz + 0.5, I.APPLE, 1);
    this.target = null;
  }

  _doPlace(dt) {
    const inp = this.input, p = this.player;
    // open crafting table on click
    if (inp.consumeClickR()) {
      if (this.target && this.target.hitId === B.TABLE) { this.openCraft(true); return; }
    }
    if (!inp.rightDown || this.placeCd > 0 || !this.target) return;
    // eat apple
    const sel = this.inv.selItem();
    if (sel && ITEMS[sel.id] && ITEMS[sel.id].food) {
      if (p.health < p.maxHealth) {
        p.heal(ITEMS[sel.id].food); this.inv.remove(sel.id, 1); this.sound.heal(); this.placeCd = 0.4;
      }
      return;
    }
    const id = this.inv.selId();
    const it = ITEMS[id];
    if (!it || !it.place) return;
    const cx = this.target.pbx, cy = this.target.pby, cz = this.target.pbz;
    if (isSolid(this.world.get(cx, cy, cz))) return;
    // don't place inside player AABB
    if (this._boxHits(cx, cy, cz)) return;
    this.world.set(cx, cy, cz, it.place);
    this.world.recomputeLight();
    if (!p.creative) this.inv.remove(id, 1);
    this.sound.place(); this.swing = 1; this.placeCd = 0.18;
  }

  _boxHits(bx, by, bz) {
    const p = this.player, HALF = 0.3;
    return (bx + 1 > p.x - HALF && bx < p.x + HALF &&
            bz + 1 > p.z - HALF && bz < p.z + HALF &&
            by + 1 > p.y && by < p.y + 1.8);
  }

  // hit-test the crafting UI at canvas coords (mx,my) and act. Defaults to the
  // last mouse-click coords so desktop clicks still route through here unchanged.
  _craftClick(mx = this.input._lastClickX ?? 0, my = this.input._lastClickY ?? 0) {
    // CLOSE button
    const cr = this._closeRect;
    if (cr && mx >= cr.x && mx <= cr.x + cr.w && my >= cr.y && my <= cr.y + cr.h) { this.state = 'playing'; return; }
    // recipe rows (rects stored during draw)
    if (!this._recipeRects) return;
    for (const rr of this._recipeRects) {
      if (my >= rr.y && my <= rr.y + rr.h && mx >= rr.x && mx <= rr.x + rr.w) {
        if (this.inv.craft(rr.r)) { this.sound.craft(); this.flash('crafted ' + rr.r.name); }
        else this.flash('missing materials');
        return;
      }
    }
  }

  // route a touch tap (in canvas pixel coords) to the current UI state
  uiTap(cx, cy) {
    const hit = (r) => r && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
    if (this.state === 'title') {
      if (this._titleRects) {
        for (let i = 0; i < this._titleRects.length; i++) {
          if (hit(this._titleRects[i])) { this.titleSel = i; this.titleSelect(); return true; }
        }
      }
      return false;
    }
    if (this.state === 'dead') { this.player.respawn(); this.state = 'playing'; return true; }
    if (this.state === 'inventory') {
      // craft immediately from the tap coords (avoids cross-frame clobbering of
      // _lastClick by synthetic mouse events on some mobile browsers)
      this._craftClick(cx, cy);
      return true;
    }
    if (this.state === 'playing') {
      if (this._hotbarRects) {
        for (let i = 0; i < this._hotbarRects.length; i++) {
          if (hit(this._hotbarRects[i])) { this.inv.sel = i; return true; }
        }
      }
      return false;
    }
    return false;
  }

  // keep on-screen gameplay controls visible only while actually playing
  _syncTouchUI() {
    if (!this._touchPlay) return;
    const show = this.state === 'playing';
    if (this._touchShown !== show) {
      this._touchShown = show;
      this._touchPlay.style.display = show ? 'block' : 'none';
    }
  }

  // ---------------- environment (sky colors) ----------------
  env() {
    const tod = (this.time % DAY_LEN) / DAY_LEN;
    const e = -Math.cos(tod * Math.PI * 2); // -1 midnight .. 1 noon
    const day = Math.min(1, Math.max(0.09, e * 0.6 + 0.5));
    const night = e < -0.12;
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const dl = Math.min(1, Math.max(0, e * 0.55 + 0.5));
    const skyTop = mix([6, 8, 28], [92, 150, 232], dl);
    const skyHor = mix([26, 26, 54], [180, 208, 236], dl);
    // sunset warmth near horizon
    if (e > -0.25 && e < 0.35) { const w2 = 1 - Math.abs(e - 0.05) / 0.3; skyHor[0] += 60 * w2; skyHor[1] += 20 * w2; }
    const voidTop = mix([30, 16, 46], [40, 30, 58], dl);
    const voidBot = mix([120, 60, 180], [70, 44, 120], dl);
    // sun / moon direction
    const sa = tod * Math.PI * 2;
    let sd = [Math.sin(sa) * 0.85, -Math.cos(sa), 0.35];
    const sl = Math.hypot(sd[0], sd[1], sd[2]); sd = [sd[0] / sl, sd[1] / sl, sd[2] / sl];
    const sunCol = night ? [205, 216, 245] : [255, 244, 205];
    return { day, night, skyTop, skyHor, voidTop, voidBot, sunDir: sd, sunCol, entities: this.entities };
  }

  // ---------------- render ----------------
  render() {
    this._syncTouchUI();
    if (this.state === 'title') return this.drawTitle();
    if (!this.world) return;
    const env = this.env();
    this.renderer.render(this.world, this.player, env);
    // overlay
    const prog = this.mineKey && this.target ? Math.min(1, this.mineAcc / Math.max(0.1, BLOCKS[this.target.hitId].hard)) : 0;
    this.renderer.drawOverlay(this.target, prog, null);
    this.renderer.drawHeld(this.inv.selId(), this.player, this.swing);
    this.renderer.drawCrosshair();
    this.drawHUD(env);
    if (this.state === 'inventory') this.drawCraft();
    if (this.state === 'dead') this.drawDead();
    if (this.player.hurtFlash > 0) {
      ctx.fillStyle = `rgba(180,20,20,${0.35 * this.player.hurtFlash})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (this.msgT > 0) text(this.msg, canvas.width / 2, 40, '#ffe', 14, 'center');
  }

  drawTitle() {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#101830'); g.addColorStop(0.6, '#241848'); g.addColorStop(1, '#3a1c5a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // floating island motif
    ctx.fillStyle = '#3a2a1a';
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 110, y = 120 + Math.sin(i) * 40;
      ctx.fillStyle = '#5a8a3a'; ctx.fillRect(x, y, 60, 10);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 6, y + 10, 48, 14);
      ctx.fillStyle = '#4a3320'; ctx.fillRect(x + 16, y + 24, 28, 10);
    }
    text('MOORECRAFT', canvas.width / 2, 60, '#fff', 42, 'center');
    text('The Shattered Sky', canvas.width / 2, 108, '#9fd', 20, 'center');
    const opts = ['SURVIVAL', 'CREATIVE', this.hasSave() ? 'CONTINUE' : 'CONTINUE (no save)'];
    this._titleRects = [];
    for (let i = 0; i < 3; i++) {
      const sel = i === this.titleSel;
      const oy = 210 + i * 34;
      text((sel ? '> ' : '  ') + opts[i], canvas.width / 2, oy, sel ? '#ffd45a' : '#cde', 22, 'center');
      // generous finger-sized tap target centred on the option
      this._titleRects.push({ x: canvas.width / 2 - 170, y: oy - 6, w: 340, h: 32 });
    }
    text(`seed: ${this.seed}  (type digits to change)`, canvas.width / 2, 330, '#89a', 12, 'center');
    const help = this.input.touchActive
      ? 'tap SURVIVAL / CREATIVE / CONTINUE to begin'
      : 'WASD move / mouse look / click to break / right-click place / E craft / F tether / M mute';
    text(help, canvas.width / 2, canvas.height - 24, '#78a', 12, 'center');
  }

  drawDead() {
    ctx.fillStyle = 'rgba(20,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    text('YOU FELL TO THE HOLLOW', canvas.width / 2, canvas.height / 2 - 30, '#f88', 26, 'center');
    text(this.input.touchActive ? 'tap anywhere to respawn at the spawn island'
      : 'Enter to respawn at the spawn island', canvas.width / 2, canvas.height / 2 + 10, '#fcc', 14, 'center');
  }

  drawHUD(env) {
    const W = canvas.width, H = canvas.height;
    // hearts
    if (this.mode === 'survival') {
      for (let i = 0; i < 10; i++) {
        const full = this.player.health >= (i + 1) * 2;
        const half = !full && this.player.health >= i * 2 + 1;
        const x = 14 + i * 20, y = 14;
        ctx.fillStyle = '#400'; this._heart(x, y, 8, '#400');
        if (full) this._heart(x, y, 8, '#e33');
        else if (half) { ctx.save(); ctx.beginPath(); ctx.rect(x - 8, y - 8, 8, 18); ctx.clip(); this._heart(x, y, 8, '#e33'); ctx.restore(); }
      }
    }
    // light / danger meter
    const lvl = Math.max(this.world.lightAt(Math.floor(this.player.x), Math.floor(this.player.y + 0.5), Math.floor(this.player.z)), env.night ? 0 : Math.round(env.day * 12));
    const safe = lvl >= 8;
    text('LIGHT', 16, 40, '#bcd', 11);
    ctx.fillStyle = '#223'; ctx.fillRect(60, 40, 100, 10);
    ctx.fillStyle = safe ? '#5c5' : env.night ? '#c44' : '#cc5';
    ctx.fillRect(60, 40, 100 * Math.min(1, lvl / 15), 10);
    if (env.night && !safe) text('THE HOLLOW STIRS', 170, 39, '#f66', 11);

    // day/night clock
    const tod = (this.time % DAY_LEN) / DAY_LEN;
    const cx = W - 40, cyy = 40, rr = 22;
    ctx.strokeStyle = '#456'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cyy, rr, Math.PI, 0); ctx.stroke();
    const ang = Math.PI + tod * Math.PI * 2;
    const sxp = cx + Math.cos(ang) * rr, syp = cyy + Math.sin(ang) * rr;
    ctx.fillStyle = env.night ? '#cde' : '#fd6';
    ctx.beginPath(); ctx.arc(sxp, Math.min(cyy, syp), 5, 0, 7); ctx.fill();

    // hotbar
    const slot = 44, n = 9, bw = slot * n, bx = (W - bw) / 2, by = H - slot - 8;
    this._hotbarRects = [];
    for (let i = 0; i < n; i++) {
      const x = bx + i * slot;
      ctx.fillStyle = 'rgba(20,20,28,0.72)'; ctx.fillRect(x, by, slot - 3, slot - 3);
      ctx.strokeStyle = i === this.inv.sel ? '#fff' : '#556'; ctx.lineWidth = i === this.inv.sel ? 3 : 1.5;
      ctx.strokeRect(x, by, slot - 3, slot - 3);
      const s = this.inv.slots[i];
      if (s) {
        drawItemIcon(ctx, s.id, x + 6, by + 4, slot - 15);
        if (s.count > 1) text(String(s.count), x + slot - 7, by + slot - 18, '#fff', 12, 'right');
      }
      // tap target: full slot plus a little slack above/below for fingers
      this._hotbarRects.push({ x, y: by - 8, w: slot, h: slot + 16 });
    }
    // held tool name
    const held = this.inv.selId();
    if (held) text(itemName(held), W / 2, by - 20, '#dde', 13, 'center');
    if (this.player.tether) text('~ TETHERED ~', W / 2, by - 40, '#7ef', 12, 'center');
  }

  _heart(x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.3, x - s, y + s * 0.2);
    ctx.bezierCurveTo(x - s, y + s * 0.7, x, y + s, x, y + s * 1.1);
    ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.7, x + s, y + s * 0.2);
    ctx.bezierCurveTo(x + s, y - s * 0.3, x, y - s * 0.3, x, y + s * 0.3);
    ctx.fill();
  }

  drawCraft() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = 'rgba(10,12,22,0.86)'; ctx.fillRect(0, 0, W, H);
    text(this.craftFull ? 'CRAFTING TABLE' : 'INVENTORY & CRAFTING', W / 2, 24, '#fff', 22, 'center');
    text(this.craftFull ? '(full recipe set)' : '(hand recipes — stand at a crafting table for more)', W / 2, 52, '#9ab', 12, 'center');

    // CLOSE button (tap target for touch; also clickable with mouse)
    const clw = 74, clh = 26, clx = W - clw - 12, cly = 10;
    this._closeRect = { x: clx, y: cly, w: clw, h: clh };
    ctx.fillStyle = 'rgba(70,40,44,0.85)'; ctx.fillRect(clx, cly, clw, clh);
    ctx.strokeStyle = '#a77'; ctx.lineWidth = 1.5; ctx.strokeRect(clx, cly, clw, clh);
    text('CLOSE', clx + clw / 2, cly + 7, '#fdd', 13, 'center');

    // inventory grid (right side)
    const gx = W - 260, gy = 90;
    text('INVENTORY', gx, gy - 22, '#bcd', 13);
    for (let i = 0; i < 36; i++) {
      const c = i % 9, rw = Math.floor(i / 9);
      const x = gx + c * 28, y = gy + rw * 28;
      ctx.fillStyle = 'rgba(30,32,44,0.8)'; ctx.fillRect(x, y, 25, 25);
      ctx.strokeStyle = i < 9 ? '#668' : '#445'; ctx.strokeRect(x, y, 25, 25);
      const s = this.inv.slots[i];
      if (s) { drawItemIcon(ctx, s.id, x + 3, y + 2, 20); if (s.count > 1) text(String(s.count), x + 23, y + 13, '#fff', 10, 'right'); }
    }

    // recipe list (left)
    const list = this.craftFull ? RECIPES : RECIPES.filter(r => !r.table);
    this._recipeRects = [];
    // compact rows when the list is long so the full table fits the canvas
    const rx = 30, ry0 = 90, rh = list.length > 8 ? 22 : 30;
    const big = rh > 26;
    const icon = big ? 22 : 16;
    text(this.input.touchActive ? 'RECIPES  (tap to craft)' : 'RECIPES  (click to craft)', rx, ry0 - 22, '#bcd', 13);
    for (let i = 0; i < list.length; i++) {
      const r = list[i]; const y = ry0 + i * rh;
      const can = this.inv.canCraft(r);
      ctx.fillStyle = can ? 'rgba(40,70,50,0.7)' : 'rgba(50,40,44,0.6)';
      ctx.fillRect(rx, y, 300, rh - 4);
      ctx.strokeStyle = '#556'; ctx.strokeRect(rx, y, 300, rh - 4);
      drawItemIcon(ctx, r.out[0], rx + 4, y + 2, icon);
      text(`${r.name} x${r.out[1]}`, rx + 32, y + (big ? 4 : 2), can ? '#dfe' : '#987', big ? 13 : 11);
      const need = r.in.map(([id, n]) => `${n} ${itemName(id)}`).join(', ');
      text(need, rx + 32, y + (big ? 17 : 11), '#9ab', big ? 9 : 8);
      this._recipeRects.push({ x: rx, y, w: 300, h: rh - 4, r });
    }
    text(this.input.touchActive ? 'tap a recipe to craft · CLOSE (or CRAFT) to exit'
      : 'E / Esc to close', W / 2, H - 24, '#9ab', 13, 'center');
  }
}

// ---------------- boot + loop ----------------
const game = new Game();
fitCanvas();

// capture click coords for crafting UI
canvas.addEventListener('mousedown', e => {
  if (performance.now() - game.input._lastTouchTapTime < 700) return; // touch handled via uiTap
  const r = canvas.getBoundingClientRect();
  game.input._lastClickX = (e.clientX - r.left) * (canvas.width / r.width);
  game.input._lastClickY = (e.clientY - r.top) * (canvas.height / r.height);
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------------- headless test hook ----------------
window.__moore = {
  game,
  start(mode = 'survival', seed = 1337) { game.newWorld(mode, seed); return game.world.spawn; },
  loadSave() { return game.loadWorld(); },
  step(dt = 1 / 30, n = 1) { for (let i = 0; i < n; i++) { game.update(dt); } game.render(); },
  render() { game.render(); },
  state() {
    const p = game.player;
    return {
      x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, onGround: p.onGround,
      health: p.health, sel: game.inv.sel, selId: game.inv.selId(),
      target: game.target ? { bx: game.target.bx, by: game.target.by, bz: game.target.bz, id: game.target.hitId } : null,
      night: game._isNight(), time: game.time, flying: p.flying, tether: !!p.tether,
      state: game.state,
    };
  },
  turn(dyaw, dpitch = 0) { game.player.yaw += dyaw; game.player.pitch += dpitch; },
  setKey(code, v) { game.input.keys[code] = v; },
  clearKeys() { game.input.keys = {}; },
  count(id) { return game.inv.count(id); },
  select(i) { game.inv.sel = i; },
  give(id, n) { game.inv.add(id, n); },
  getBlock(x, y, z) { return game.world.get(x, y, z); },
  // break the current target fully (survival-timed) or instantly
  breakTarget() {
    if (!game.target) return false;
    const t = game.target;
    game._breakBlock(t, true);
    return true;
  },
  aimAndBreak() {
    const p = game.player; const [fx, fy, fz] = p.forward();
    game.target = game.world.raycastPick(p.eyeX(), p.eyeY(), p.eyeZ(), fx, fy, fz, REACH);
    return this.breakTarget();
  },
  placeSel() {
    game.input.rightDown = true; game.placeCd = 0;
    const p = game.player; const [fx, fy, fz] = p.forward();
    game.target = game.world.raycastPick(p.eyeX(), p.eyeY(), p.eyeZ(), fx, fy, fz, REACH);
    game._doPlace(0.1);
    game.input.rightDown = false;
    return true;
  },
  craft(name) { const r = RECIPES.find(x => x.name === name); return r ? game.inv.craft(r) : false; },
  openCraft(full = true) { game.openCraft(full); },
  setTime(tod) { game.time = tod * DAY_LEN; },
  fireTether() { game.fireTether(); return !!game.player.tether; },
  frameStats() {
    const d = game.renderer.img.data; let mn = 255, mx = 0, sum = 0, sum2 = 0;
    const set = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (l < mn) mn = l; if (l > mx) mx = l; sum += l; sum2 += l * l;
      if ((i % 40) === 0) set.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
    }
    const n = d.length / 4; const mean = sum / n;
    return { min: mn, max: mx, mean, variance: sum2 / n - mean * mean, colors: set.size };
  },
  spawnMob() {
    const p = game.player;
    game.entities.mobs.push({ x: p.x + 2, y: p.y, z: p.z + 2, vx: 0, vy: 0, vz: 0, hp: 10, fuse: 0 });
  },
};
window.__ready = true;
