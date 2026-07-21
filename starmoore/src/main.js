// StarMoore — main: screens, input, game loop, test hooks.
import { Sim, PLAYER, ENEMY, UNITS, BUILDINGS } from './sim.js';
import { TILE, MAP_W, MAP_H, WORKER_BUILDS } from './data.js';
import { buildSprites } from './sprites.js';
import { Audio } from './audio.js';
import { Renderer, commandButtons, VIEW_W, VIEW_H, HUD_Y, MM, SCREEN_W, SCREEN_H } from './render.js';

const CAMPAIGN = [
  { name: 'First Contact', desc: 'Build a base and survive the raiders.', difficulty: 'easy', fortified: false },
  { name: 'Counterstrike', desc: 'Destroy the enemy outpost.', difficulty: 'normal', fortified: false },
  { name: 'The Moore Bastion', desc: 'Break a fortified stronghold.', difficulty: 'hard', fortified: true },
];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.sprites = buildSprites();
    this.audio = new Audio();
    this.screen = 'title';
    this.sim = null;
    this.renderer = null;
    this.mode = 'skirmish';
    this.campaignIdx = 0;
    this.setup = { difficulty: 'normal', map: 'clash' };

    this.sel = new Set();
    this.selList = [];
    this.groups = Array.from({ length: 10 }, () => []);
    this.pendingBuild = null;
    this.awaitAttack = false;
    this.drag = null;
    this.mouse = { x: 0, y: 0 };
    this.mouseW = { x: 0, y: 0 };
    this.keys = {};
    this.mmDragging = false;
    this._lastClick = { t: 0, id: null };
    this.acc = 0;
    this.last = 0;
    this.result = null;

    this._bindEvents();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ---------------- lifecycle ----------------
  startSkirmish(difficulty = 'normal', seed = null, fortified = false) {
    this.mode = 'skirmish';
    this._start(difficulty, seed, fortified);
  }
  startCampaign(idx = 0, seed = null) {
    this.mode = 'campaign';
    this.campaignIdx = idx;
    const m = CAMPAIGN[idx];
    this._start(m.difficulty, seed, m.fortified);
  }
  _start(difficulty, seed, fortified) {
    this.sim = new Sim({ seed: seed || (Date.now() & 0xffffff), difficulty });
    if (fortified) this._fortifyEnemy();
    this.renderer = new Renderer(this.ctx, this.sim, this.sprites);
    this.renderer.centerOn(this.sim.playerBase.tx + 1.5, this.sim.playerBase.ty + 1.5);
    this.sel.clear(); this.selList = []; this.pendingBuild = null; this.awaitAttack = false;
    this.groups = Array.from({ length: 10 }, () => []);
    this.result = null;
    this.screen = 'playing';
    this.audio.resume();
    this.audio.startMusic();
  }
  _fortifyEnemy() {
    // give the AI a head-start bastion: extra depot, barracks, turrets, and army
    const s = this.sim, base = s.enemyBase;
    const tryB = (type, dx, dy) => { const tx = base.tx + dx, ty = base.ty + dy; if (s.canPlace(ENEMY, type, tx, ty)) { const b = s._addBuilding(ENEMY, type, tx, ty, true); return b; } return null; };
    tryB('depot', -3, 0); tryB('barracks', 3, 0); tryB('turret', 0, 4); tryB('turret', 4, 2); tryB('turret', -2, -3);
    s.res[ENEMY].m += 300;
    for (let i = 0; i < 4; i++) s._spawnUnit(ENEMY, 'moorine', base.tx + 1 + i * 0.5, base.ty + 3);
  }

  // ---------------- main loop ----------------
  _loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0);
    this.last = t;
    if (this.screen === 'playing') {
      this._edgeScroll(dt);
      this.acc += dt * (this.keys['fast'] ? 3 : 1);
      const STEP = 1 / 30;
      let n = 0;
      while (this.acc >= STEP && n < 6) { this.sim.step(STEP); this.acc -= STEP; n++; this._postStep(); }
      this._rebuildSel();
      this._checkResult();
    }
    this._render();
    requestAnimationFrame((tt) => this._loop(tt));
  }

  _postStep() {
    const s = this.sim;
    // sound cues from sim events (cheap heuristics)
    for (const p of s.projectiles) if (!p._snd) { p._snd = 1; if (p.kind === 'shell') this.audio.cannon(); else this.audio.laser(); }
    for (const e of s.effects) if (!e._snd) { e._snd = 1; if (e.kind === 'boom') this.audio.explosion(); else if (e.kind === 'drop') this.audio.drop(); }
    const a = s.alerts[s.alerts.length - 1];
    if (a && a !== this._lastAlert) {
      this._lastAlert = a;
      if (/under attack|lost/i.test(a.text)) this.audio.alert();
      else if (/ready|complete/i.test(a.text)) this.audio.ready();
    }
  }

  _checkResult() {
    if (this.sim.winner !== null && !this.result) {
      this.result = this.sim.winner;
      this.audio.stopMusic();
      if (this.sim.winner === PLAYER) { this.screen = 'victory'; this.audio.win(); }
      else { this.screen = 'defeat'; this.audio.lose(); }
    }
  }

  // ---------------- selection helpers ----------------
  _rebuildSel() {
    this.selList = [];
    for (const id of this.sel) {
      const e = this.sim.getById(id);
      if (e && e.hp > 0) this.selList.push(e);
      else this.sel.delete(id);
    }
    // sort: put a representative unit type first (units before buildings)
    this.selList.sort((a, b) => (a.w ? 1 : 0) - (b.w ? 1 : 0));
  }

  _entityAt(wx, wy) {
    const s = this.sim;
    // buildings first
    for (const b of s.buildings) {
      if (b.side === ENEMY && !s.seenBy(PLAYER, b)) continue;
      if (wx >= b.tx && wx < b.tx + b.w && wy >= b.ty && wy < b.ty + b.h) return b;
    }
    let best = null, bd = 0.9;
    for (const u of s.units) {
      if (u.side === ENEMY && !s.seenBy(PLAYER, u)) continue;
      const d = Math.hypot(u.x - wx, u.y - wy);
      if (d < bd + u.def.radius) { bd = d; best = u; }
    }
    return best;
  }

  _selectedUnits() { return this.selList.filter(e => e.w === undefined && e.side === PLAYER); }

  // ---------------- input ----------------
  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', (e) => this._onDown(e));
    c.addEventListener('mousemove', (e) => this._onMove(e));
    window.addEventListener('mouseup', (e) => this._onUp(e));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup', (e) => this._onKey(e, false));
    c.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
    // touch (basic)
    c.addEventListener('touchstart', (e) => this._onTouch(e), { passive: false });
    c.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) * (SCREEN_W / r.width);
    const sy = (e.clientY - r.top) * (SCREEN_H / r.height);
    return { x: sx, y: sy };
  }

  _onDown(e) {
    const p = this._pos(e);
    this.mouse = p;
    this.audio.resume();
    if (this.screen === 'title') { this.screen = 'setup'; return; }
    if (this.screen === 'setup') { this._setupClick(p); return; }
    if (this.screen === 'victory' || this.screen === 'defeat') { this._resultClick(p); return; }
    if (this.screen === 'paused') { this.screen = 'playing'; return; }
    if (this.screen !== 'playing') return;

    // HUD region?
    if (p.y >= HUD_Y) {
      if (e.button === 0) this._hudClick(p);
      return;
    }
    // minimap is inside HUD, handled above.
    const wx = this.renderer.s2wx(p.x), wy = this.renderer.s2wy(p.y);
    this.mouseW = { x: wx, y: wy };

    if (e.button === 2) { // right click command
      this._rightCommand(wx, wy);
      this.pendingBuild = null; this.awaitAttack = false;
      return;
    }
    // left button
    if (this.pendingBuild) { this._placeBuild(wx, wy, e.shiftKey); return; }
    if (this.awaitAttack) { this._issueAttackMove(wx, wy); this.awaitAttack = false; return; }
    // begin drag / select
    this.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, shift: e.shiftKey, moved: false };
  }

  _onMove(e) {
    const p = this._pos(e);
    this.mouse = p;
    if (this.screen !== 'playing') return;
    if (p.y < HUD_Y) this.mouseW = { x: this.renderer.s2wx(p.x), y: this.renderer.s2wy(p.y) };
    if (this.drag) {
      this.drag.x1 = p.x; this.drag.y1 = p.y;
      if (Math.hypot(p.x - this.drag.x0, p.y - this.drag.y0) > 4) this.drag.moved = true;
    }
    if (this.mmDragging && p.y >= HUD_Y) this._minimapTo(p);
  }

  _onUp(e) {
    if (this.screen !== 'playing') { this.mmDragging = false; return; }
    if (this.mmDragging) { this.mmDragging = false; return; }
    if (!this.drag) return;
    const d = this.drag; this.drag = null;
    if (d.moved) { this._boxSelect(d, d.shift); }
    else {
      // single click select
      const wx = this.renderer.s2wx(d.x0), wy = this.renderer.s2wy(d.y0);
      this._clickSelect(wx, wy, d.shift, d.x0, d.y0);
    }
  }

  _boxSelect(d, shift) {
    const x0 = Math.min(d.x0, d.x1), y0 = Math.min(d.y0, d.y1);
    const x1 = Math.max(d.x0, d.x1), y1 = Math.max(d.y0, d.y1);
    if (!shift) this.sel.clear();
    let any = false;
    for (const u of this.sim.units) {
      if (u.side !== PLAYER) continue;
      const sx = this.renderer.w2sx(u.x), sy = this.renderer.w2sy(u.y);
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) { this.sel.add(u.id); any = true; }
    }
    // box selecting drops buildings; if only buildings would be in box, ignore
    if (any) this.audio.select();
    this._rebuildSel();
  }

  _clickSelect(wx, wy, shift, sx, sy) {
    const e = this._entityAt(wx, wy);
    const now = performance.now();
    if (!e) { if (!shift) { this.sel.clear(); this._rebuildSel(); } return; }
    // double-click: select all of type on screen
    if (this._lastClick.id === e.id && now - this._lastClick.t < 350 && e.w === undefined) {
      this.sel.clear();
      for (const u of this.sim.units) {
        if (u.side !== e.side || u.type !== e.type) continue;
        const usx = this.renderer.w2sx(u.x), usy = this.renderer.w2sy(u.y);
        if (usx >= 0 && usx <= VIEW_W && usy >= 0 && usy <= VIEW_H) this.sel.add(u.id);
      }
    } else if (shift) {
      if (this.sel.has(e.id)) this.sel.delete(e.id); else this.sel.add(e.id);
    } else {
      this.sel.clear(); this.sel.add(e.id);
    }
    this._lastClick = { t: now, id: e.id };
    this.audio.select();
    this._rebuildSel();
  }

  _rightCommand(wx, wy) {
    const units = this._selectedUnits();
    // rally set for selected building
    const bsel = this.selList.filter(e => e.w !== undefined && e.side === PLAYER && e.complete);
    if (bsel.length && !units.length) {
      for (const b of bsel) this.sim.setRally(b, wx, wy);
      this.audio.command(); return;
    }
    if (!units.length) return;
    const tgt = this._entityAt(wx, wy);
    const r = this.sim.commandContext(units, wx, wy, tgt ? tgt.id : null);
    this.audio.command();
  }

  _issueAttackMove(wx, wy) {
    const units = this._selectedUnits();
    if (!units.length) return;
    this.sim.commandMove(units, wx, wy, true);
    this.audio.command();
  }

  _placeBuild(wx, wy, shift) {
    const type = this.pendingBuild;
    const def = BUILDINGS[type];
    const tx = Math.floor(wx - def.w / 2 + 0.5), ty = Math.floor(wy - def.h / 2 + 0.5);
    const worker = this._selectedUnits().find(u => u.type === 'worker') ||
      this.sim.units.find(u => u.side === PLAYER && u.type === 'worker' && u.hp > 0);
    if (!worker) { this.pendingBuild = null; return; }
    const site = this.sim.orderBuild(worker, type, tx, ty);
    if (site) { this.audio.place(); if (!shift) this.pendingBuild = null; }
    else this.audio.alert();
  }

  _hudClick(p) {
    // minimap?
    if (p.x >= MM.x - 2 && p.x <= MM.x + MM.s + 2 && p.y >= MM.y - 2 && p.y <= MM.y + MM.s + 2) {
      this.mmDragging = true; this._minimapTo(p); return;
    }
    // command card buttons
    const btns = commandButtons(this.sim, this.selList, this);
    for (const b of btns) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        if (b.enabled) this._cardAction(b.act);
        return;
      }
    }
  }

  _minimapTo(p) {
    const tx = (p.x - MM.x) / this.renderer.mmScale;
    const ty = (p.y - MM.y) / this.renderer.mmScale;
    this.renderer.centerOn(tx, ty);
  }

  _cardAction(act) {
    if (act.startsWith('build:')) { this.pendingBuild = act.slice(6); this.awaitAttack = false; this.audio.command(); return; }
    if (act.startsWith('train:')) {
      const ut = act.slice(6);
      const b = this.selList.find(e => e.w !== undefined && e.def.trains && e.def.trains.includes(ut));
      if (b) { const okr = this.sim.orderTrain(b, ut); this.audio[okr ? 'command' : 'alert'](); }
      return;
    }
    const units = this._selectedUnits();
    switch (act) {
      case 'move': this.awaitAttack = false; break; // move handled by right-click; button is a hint
      case 'stop': this.sim.commandStop(units); this.audio.command(); break;
      case 'hold': this.sim.commandHold(units); this.audio.command(); break;
      case 'attack': this.awaitAttack = true; this.audio.command(); break;
      case 'rally': /* next right-click sets rally */ break;
      case 'cancelq': { const b = this.selList.find(e => e.w !== undefined && e.queue && e.queue.length); if (b) this.sim.cancelTrain(b, b.queue.length - 1); this.audio.command(); break; }
    }
  }

  _onKey(e, down) {
    const k = e.key;
    if (down && (k === 'm' || k === 'M')) { const muted = this.audio.toggleMute(); return; }
    if (this.screen === 'title' && down) { this.screen = 'setup'; return; }
    if (this.screen === 'victory' || this.screen === 'defeat') { if (down && (k === 'Enter' || k === ' ')) this.screen = 'title'; return; }
    if (this.screen === 'paused') { if (down && (k === 'Enter' || k === 'Escape')) this.screen = 'playing'; return; }
    if (this.screen !== 'playing') return;

    if (k === 'ArrowLeft') this.keys.left = down;
    else if (k === 'ArrowRight') this.keys.right = down;
    else if (k === 'ArrowUp') this.keys.up = down;
    else if (k === 'ArrowDown') this.keys.down = down;

    if (!down) return;
    if (k === 'Enter') { this.screen = 'paused'; return; }
    if (k === 'Escape') { this.pendingBuild = null; this.awaitAttack = false; return; }
    const units = this._selectedUnits();
    if (k === 'a' || k === 'A') { if (units.length) this.awaitAttack = true; }
    else if (k === 's' || k === 'S') { this.sim.commandStop(units); this.audio.command(); }
    else if (k === 'h' || k === 'H') { this.sim.commandHold(units); this.audio.command(); }
    else if (k === '`') { this.keys.fast = !this.keys.fast; }
    else if (k >= '0' && k <= '9') {
      const g = parseInt(k, 10);
      if (e.ctrlKey || e.metaKey) { this.groups[g] = [...this.sel]; this.audio.command(); }
      else { this.sel = new Set(this.groups[g].filter(id => this.sim.getById(id))); this._rebuildSel(); if (this.selList.length) { this.audio.select(); const f = this.selList[0]; this.renderer.centerOn(f.x ?? f.tx, f.y ?? f.ty); } }
    }
    // build hotkeys when a worker is selected: q/w/e/r/t
    if (units.some(u => u.type === 'worker')) {
      const map = { q: 0, w: 1, e: 2, r: 3, t: 4 };
      if (k.toLowerCase() in map) { const bt = WORKER_BUILDS[map[k.toLowerCase()]]; if (bt) this.pendingBuild = bt; }
    }
  }

  _onTouch(e) {
    e.preventDefault();
    if (!e.touches.length) return;
    const t = e.touches[0];
    const fake = { clientX: t.clientX, clientY: t.clientY, button: 0, shiftKey: false };
    this._touchStart = this._pos(fake);
    this._onDown(fake);
  }
  _onTouchEnd(e) {
    e.preventDefault();
    if (this._touchStart) {
      const fake = { clientX: 0, clientY: 0 };
      this._onUp({ button: 0 });
    }
  }

  _edgeScroll(dt) {
    const sp = 18 * dt;
    const r = this.renderer;
    if (this.keys.left) r.cam.x -= sp * 2;
    if (this.keys.right) r.cam.x += sp * 2;
    if (this.keys.up) r.cam.y -= sp * 2;
    if (this.keys.down) r.cam.y += sp * 2;
    const m = this.mouse, edge = 12;
    if (m.x >= 0 && m.y >= 0 && m.y < HUD_Y) {
      if (m.x < edge) r.cam.x -= sp * 2;
      else if (m.x > SCREEN_W - edge) r.cam.x += sp * 2;
      if (m.y < edge) r.cam.y -= sp * 2;
      else if (m.y > HUD_Y - edge && m.y < HUD_Y) r.cam.y += sp * 2;
    }
    r.clampCam();
  }

  // ---------------- render ----------------
  _render() {
    const ctx = this.ctx;
    if (this.screen === 'title') return this._drawTitle();
    if (this.screen === 'setup') return this._drawSetup();
    if (this.screen === 'playing' || this.screen === 'paused') {
      this.renderer.draw({
        selected: this.sel, selList: this.selList, pendingBuild: this.pendingBuild,
        drag: this.drag && this.drag.moved ? this.drag : null, mouseW: this.mouseW,
      });
      if (this.awaitAttack) { ctx.fillStyle = '#ff6a4a'; ctx.font = '11px monospace'; ctx.fillText('ATTACK-MOVE: click target', 220, 34); }
      if (this.screen === 'paused') this._overlay('PAUSED', 'Press Enter to resume');
    }
    if (this.screen === 'victory') { this._drawGameFaded(); this._overlay('VICTORY', 'The enemy base is rubble.  Enter → menu', '#7dff9d'); }
    if (this.screen === 'defeat') { this._drawGameFaded(); this._overlay('DEFEAT', 'Your base has fallen.  Enter → menu', '#ff7d7d'); }
  }

  _drawGameFaded() {
    this.renderer.draw({ selected: this.sel, selList: this.selList, pendingBuild: null, drag: null, mouseW: this.mouseW });
  }

  _bg() {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    g.addColorStop(0, '#0a1226'); g.addColorStop(1, '#05070d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // starfield
    ctx.fillStyle = '#dfe8ff';
    let s = 1234;
    for (let i = 0; i < 90; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const x = s % SCREEN_W; s = (s * 1103515245 + 12345) & 0x7fffffff; const y = s % SCREEN_H; const b = (s % 100) / 100; ctx.globalAlpha = 0.2 + b * 0.6; ctx.fillRect(x, y, 1, 1); }
    ctx.globalAlpha = 1;
  }

  _drawTitle() {
    const ctx = this.ctx; this._bg();
    ctx.textAlign = 'center';
    // logo
    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = '#0c1830'; ctx.fillText('STARMOORE', SCREEN_W / 2 + 2, 132 + 2);
    const g = ctx.createLinearGradient(0, 90, 0, 150);
    g.addColorStop(0, '#8fd0ff'); g.addColorStop(1, '#3a7bd5');
    ctx.fillStyle = g; ctx.fillText('STARMOORE', SCREEN_W / 2, 132);
    ctx.strokeStyle = '#1a3a6a'; ctx.lineWidth = 1; ctx.strokeText('STARMOORE', SCREEN_W / 2, 132);
    ctx.font = '13px monospace'; ctx.fillStyle = '#7fa8d8';
    ctx.fillText('a real-time strategy of moorerals and war', SCREEN_W / 2, 162);
    // little marching units decoration
    for (let i = 0; i < 6; i++) {
      const spr = this.sprites.units[i % 2][['worker', 'moorine', 'siege'][i % 3]];
      ctx.drawImage(spr.canvas, SCREEN_W / 2 - 90 + i * 32, 200);
    }
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = (Math.sin(Date.now() / 300) > 0) ? '#ffdf7a' : '#c9a94a';
    ctx.fillText('CLICK or press any key to begin', SCREEN_W / 2, 300);
    ctx.font = '10px monospace'; ctx.fillStyle = '#5a6a80';
    ctx.fillText('L-click / drag select · R-click command · A attack · S stop · H hold · M mute', SCREEN_W / 2, 360);
    ctx.textAlign = 'left';
  }

  _drawSetup() {
    const ctx = this.ctx; this._bg();
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#8fd0ff';
    ctx.fillText('SKIRMISH SETUP', SCREEN_W / 2, 56);
    this._setupBtns = [];
    const addBtn = (label, x, y, w, h, active, act) => {
      ctx.fillStyle = active ? '#2c4a6a' : '#1a2230';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = active ? '#5aa8ff' : '#3a4658'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = active ? '#dfeaf5' : '#93a3b5'; ctx.font = 'bold 13px monospace';
      ctx.fillText(label, x + w / 2, y + h / 2 + 4);
      this._setupBtns.push({ x, y, w, h, act });
    };
    ctx.font = '12px monospace'; ctx.fillStyle = '#93a3b5';
    ctx.fillText('Difficulty', SCREEN_W / 2, 100);
    addBtn('EASY', 160, 112, 100, 34, this.setup.difficulty === 'easy', 'diff:easy');
    addBtn('NORMAL', 270, 112, 100, 34, this.setup.difficulty === 'normal', 'diff:normal');
    addBtn('HARD', 380, 112, 100, 34, this.setup.difficulty === 'hard', 'diff:hard');
    ctx.fillStyle = '#93a3b5'; ctx.fillText('Mode', SCREEN_W / 2, 176);
    addBtn('SKIRMISH', 200, 188, 110, 34, this.mode === 'skirmish', 'mode:skirmish');
    addBtn('CAMPAIGN', 330, 188, 110, 34, this.mode === 'campaign', 'mode:campaign');
    if (this.mode === 'campaign') {
      ctx.fillStyle = '#c9b26a'; ctx.font = '11px monospace';
      const m = CAMPAIGN[this.campaignIdx];
      ctx.fillText(`Mission ${this.campaignIdx + 1}/3: ${m.name} — ${m.desc}`, SCREEN_W / 2, 244);
      addBtn('◀', 200, 258, 30, 28, false, 'mprev');
      addBtn('▶', 410, 258, 30, 28, false, 'mnext');
    }
    addBtn('START', 250, 320, 140, 40, true, 'start');
    ctx.font = '10px monospace'; ctx.fillStyle = '#5a6a80';
    ctx.fillText('Easy: slow, small waves · Normal: balanced · Hard: fast, big waves + income', SCREEN_W / 2, 382);
    ctx.textAlign = 'left';
  }

  _setupClick(p) {
    for (const b of (this._setupBtns || [])) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        const a = b.act;
        if (a.startsWith('diff:')) this.setup.difficulty = a.slice(5);
        else if (a === 'mode:skirmish') this.mode = 'skirmish';
        else if (a === 'mode:campaign') this.mode = 'campaign';
        else if (a === 'mprev') this.campaignIdx = (this.campaignIdx + 2) % 3;
        else if (a === 'mnext') this.campaignIdx = (this.campaignIdx + 1) % 3;
        else if (a === 'start') {
          if (this.mode === 'campaign') this.startCampaign(this.campaignIdx);
          else this.startSkirmish(this.setup.difficulty);
        }
        return;
      }
    }
  }

  _resultClick(p) { this.screen = 'title'; }

  _overlay(title, sub, col = '#ffffff') {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4,7,13,0.72)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px monospace'; ctx.fillStyle = col;
    ctx.fillText(title, SCREEN_W / 2, SCREEN_H / 2 - 6);
    ctx.font = '13px monospace'; ctx.fillStyle = '#b8c4d4';
    ctx.fillText(sub, SCREEN_W / 2, SCREEN_H / 2 + 28);
    if (this.mode === 'campaign' && this.result === PLAYER && this.campaignIdx < 2) {
      ctx.fillStyle = '#ffdf7a'; ctx.fillText('Press N for next mission', SCREEN_W / 2, SCREEN_H / 2 + 48);
    }
    ctx.textAlign = 'left';
  }
}

// ---------------- boot + test hook ----------------
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game;

// campaign next-mission key
window.addEventListener('keydown', (e) => {
  if ((e.key === 'n' || e.key === 'N') && game.screen === 'victory' && game.mode === 'campaign' && game.campaignIdx < 2) {
    game.startCampaign(game.campaignIdx + 1);
  }
});

// headless/browser test hook
window.__sm = {
  game,
  ready: true,
  start(difficulty = 'normal', seed = 4242) { game.startSkirmish(difficulty, seed); return { screen: game.screen, units: game.sim.units.length }; },
  startCampaign(i = 0, seed = 4242) { game.startCampaign(i, seed); return { screen: game.screen }; },
  screen() { return game.screen; },
  sim() { return game.sim; },
  step(dt = 1 / 30, n = 1) { for (let i = 0; i < n; i++) game.sim.step(dt); game._rebuildSel(); game._checkResult(); return game.sim.time; },
  res() { return { m: game.sim.res[PLAYER].m, g: game.sim.res[PLAYER].g }; },
  supply() { return game.sim.supply(PLAYER); },
  counts(side = PLAYER) {
    const s = game.sim;
    return {
      workers: s.units.filter(u => u.side === side && u.type === 'worker').length,
      army: s.units.filter(u => u.side === side && u.type !== 'worker').length,
      buildings: s.buildings.filter(b => b.side === side).length,
    };
  },
  selectFirstWorker() {
    const w = game.sim.units.find(u => u.side === PLAYER && u.type === 'worker');
    game.sel = new Set([w.id]); game._rebuildSel(); return w.id;
  },
  gatherNearest() {
    const w = game._selectedUnits().find(u => u.type === 'worker') || game.sim.units.find(u => u.side === PLAYER && u.type === 'worker');
    let best = null, bd = 1e9;
    for (const n of game.sim.resources) { if (n.kind !== 'moore' || n.amount <= 0) continue; const d = (n.tx - w.x) ** 2 + (n.ty - w.y) ** 2; if (d < bd) { bd = d; best = n; } }
    game.sim.commandGather(w, best); return best.id;
  },
  build(type, near = true) {
    const w = game._selectedUnits().find(u => u.type === 'worker') || game.sim.units.find(u => u.side === PLAYER && u.type === 'worker' && u.order !== 'build');
    const base = game.sim.playerBase; const def = BUILDINGS[type];
    if (type === 'refinery') {
      const gz = game.sim.resources.find(n => n.kind === 'gas' && n.tx < 32);
      for (const [dx, dy] of [[0, 0], [-1, -1], [0, -1], [-1, 0]]) if (game.sim.canPlace(PLAYER, 'refinery', gz.tx + dx, gz.ty + dy)) return !!game.sim.orderBuild(w, 'refinery', gz.tx + dx, gz.ty + dy);
      return false;
    }
    for (let r = 3; r < 16; r++) for (let a = 0; a < 20; a++) {
      const tx = Math.round(base.tx + Math.cos(a * 0.5) * r), ty = Math.round(base.ty + Math.sin(a * 0.5) * r);
      if (game.sim.canPlace(PLAYER, type, tx, ty)) return !!game.sim.orderBuild(w, type, tx, ty);
    }
    return false;
  },
  forceComplete(type) {
    const b = game.sim.buildings.filter(x => x.side === PLAYER && x.type === type).pop();
    if (b) { b.complete = true; b.hp = b.def.hp; b.buildProg = b.buildTime; }
    return !!b;
  },
  train(type) {
    const b = game.sim.buildings.find(x => x.side === PLAYER && x.complete && x.def.trains && x.def.trains.includes(type));
    if (!b) return false; return game.sim.orderTrain(b, type);
  },
  selectArmy() {
    game.sel = new Set(game.sim.units.filter(u => u.side === PLAYER && u.type !== 'worker').map(u => u.id));
    game._rebuildSel(); return game.selList.length;
  },
  attackMoveEnemy() {
    const units = game._selectedUnits();
    const eb = game.sim.enemyBase || game.sim.buildings.find(b => b.side === ENEMY);
    game.sim.commandMove(units, eb.tx + 1, eb.ty + 1, true); return units.length;
  },
  enemyStats() {
    const s = game.sim;
    return { army: s.units.filter(u => u.side === ENEMY && u.type !== 'worker').length, attacks: s.ai ? (s.ai.attacks || 0) : 0, attacking: s.ai ? s.ai.attacking : false, buildings: s.buildings.filter(b => b.side === ENEMY).length };
  },
  winner() { return game.sim.winner; },
  centerBase() { game.renderer.centerOn(game.sim.playerBase.tx + 1.5, game.sim.playerBase.ty + 1.5); },
  centerOn(tx, ty) { game.renderer.centerOn(tx, ty); },
  killEnemyBuildings() { for (const b of game.sim.buildings.filter(b => b.side === ENEMY)) b.hp = 0; },
  setPending(type) {
    game.pendingBuild = type;
    const s = game.sim, base = s.playerBase, def = BUILDINGS[type];
    // find a valid placement so the ghost shows a green (valid) preview
    let found = { x: base.tx + 6, y: base.ty };
    outer: for (let r = 4; r < 12; r++) for (let a = 0; a < 16; a++) {
      const tx = Math.round(base.tx + Math.cos(a * 0.5) * r), ty = Math.round(base.ty + Math.sin(a * 0.5) * r);
      if (s.canPlace(PLAYER, type, tx, ty)) { found = { x: tx + def.w / 2, y: ty + def.h / 2 }; break outer; }
    }
    game.mouseW = found;
  },
};
