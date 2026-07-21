// Canvas renderer + HUD layout for StarMoore.
import { TILE, MAP_W, MAP_H, T, PLAYER, ENEMY, UNITS, BUILDINGS, WORKER_BUILDS } from './data.js';
import { TEAM } from './sprites.js';

export const VIEW_W = 640, VIEW_H = 304;    // map viewport
export const SCREEN_W = 640, SCREEN_H = 400;
export const HUD_Y = 304, HUD_H = 96;
export const MM = { x: 6, y: 310, s: 86 };  // minimap
export const CARD = { x0: 374, y0: 310, cols: 4, cw: 64, ch: 26, gap: 2 };

export class Renderer {
  constructor(ctx, sim, sprites) {
    this.ctx = ctx; this.sim = sim; this.S = sprites;
    this.cam = { x: 0, y: 0 }; // top-left in tile units
    this.mmScale = MM.s / MAP_W;
  }
  clampCam() {
    const maxX = MAP_W - VIEW_W / TILE, maxY = MAP_H - VIEW_H / TILE;
    this.cam.x = Math.max(0, Math.min(maxX, this.cam.x));
    this.cam.y = Math.max(0, Math.min(maxY, this.cam.y));
  }
  centerOn(tx, ty) { this.cam.x = tx - VIEW_W / TILE / 2; this.cam.y = ty - VIEW_H / TILE / 2; this.clampCam(); }
  w2sx(wx) { return (wx - this.cam.x) * TILE; }
  w2sy(wy) { return (wy - this.cam.y) * TILE; }
  s2wx(sx) { return sx / TILE + this.cam.x; }
  s2wy(sy) { return sy / TILE + this.cam.y; }

  draw(state) {
    const ctx = this.ctx, sim = this.sim;
    ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    this._terrain();
    this._resources();
    this._buildings(state);
    this._units(state);
    this._projectiles();
    this._effects();
    this._fog();
    this._placement(state);
    this._dragBox(state);
    ctx.restore();
    this._hud(state);
  }

  _terrain() {
    const ctx = this.ctx, sim = this.sim, S = this.S;
    const x0 = Math.floor(this.cam.x), y0 = Math.floor(this.cam.y);
    const x1 = Math.ceil(this.cam.x + VIEW_W / TILE), y1 = Math.ceil(this.cam.y + VIEW_H / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
        const vis = sim.fog[PLAYER][ty * MAP_W + tx];
        if (vis === 0) continue; // unexplored -> black (bg)
        const terr = sim.terrain[ty * MAP_W + tx];
        const img = terr === T.ROCK ? S.terrain.rock : terr === T.DIRT ? S.terrain.dirt : S.terrain.grass;
        ctx.drawImage(img, Math.round(this.w2sx(tx)), Math.round(this.w2sy(ty)));
      }
    }
  }

  _resources() {
    const ctx = this.ctx, sim = this.sim, S = this.S;
    for (const n of sim.resources) {
      if (n.amount <= 0) continue;
      if (sim.fog[PLAYER][n.ty * MAP_W + n.tx] === 0) continue;
      ctx.drawImage(n.kind === 'moore' ? S.res.moore : S.res.gas, Math.round(this.w2sx(n.tx)), Math.round(this.w2sy(n.ty)));
    }
  }

  _buildings(state) {
    const ctx = this.ctx, sim = this.sim, S = this.S;
    for (const b of sim.buildings) {
      const seen = b.side === PLAYER || sim.seenBy(PLAYER, b);
      if (!seen && !state.explored) {
        // show if explored tile even if not currently visible? buildings persist once seen — simple: only if visible or player
      }
      if (b.side === ENEMY && !sim.seenBy(PLAYER, b)) continue;
      const sx = this.w2sx(b.tx), sy = this.w2sy(b.ty);
      const img = S.buildings[b.side][b.type];
      // selection ring
      if (state.selected && state.selected.has(b.id)) {
        ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, b.w * TILE - 2, b.h * TILE - 2);
      }
      if (!b.complete) {
        // construction: draw dim + scanlines + progress
        ctx.globalAlpha = 0.55; ctx.drawImage(img, sx, sy); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(90,150,255,0.15)';
        const p = b.buildProg / b.buildTime;
        ctx.fillRect(sx, sy + (b.h * TILE) * (1 - p), b.w * TILE, (b.h * TILE) * p);
        ctx.strokeStyle = 'rgba(120,180,255,0.5)'; ctx.strokeRect(sx + 0.5, sy + 0.5, b.w * TILE - 1, b.h * TILE - 1);
      } else {
        ctx.drawImage(img, sx, sy);
      }
      // health bar if damaged or selected
      if (b.hp < b.maxHp || (state.selected && state.selected.has(b.id))) {
        this._bar(sx + 2, sy - 4, b.w * TILE - 4, 3, b.hp / b.maxHp);
      }
      // production progress pip
      if (b.complete && b.queue.length) {
        const p = b.trainProg / UNITS[b.queue[0]].buildTime;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx + 2, sy + b.h * TILE - 5, b.w * TILE - 4, 3);
        ctx.fillStyle = '#ffd24a'; ctx.fillRect(sx + 2, sy + b.h * TILE - 5, (b.w * TILE - 4) * p, 3);
      }
      // rally flag
      if (b.complete && b.side === PLAYER && state.selected && state.selected.has(b.id) && b.rally) {
        const rx = this.w2sx(b.rally.x), ry = this.w2sy(b.rally.y);
        ctx.strokeStyle = '#7dff7d'; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - 8); ctx.stroke();
        ctx.fillStyle = '#7dff7d'; ctx.fillRect(rx, ry - 8, 5, 3);
      }
    }
  }

  _units(state) {
    const ctx = this.ctx, sim = this.sim, S = this.S;
    for (const u of sim.units) {
      if (u.side === ENEMY && !sim.seenBy(PLAYER, u)) continue;
      const sx = this.w2sx(u.x), sy = this.w2sy(u.y);
      if (sx < -20 || sy < -20 || sx > VIEW_W + 20 || sy > VIEW_H + 20) continue;
      const sel = state.selected && state.selected.has(u.id);
      const spr = S.units[u.side][u.type];
      if (sel) {
        ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(sx, sy + 2, u.def.radius * TILE + 3, u.def.radius * TILE + 1.5, 0, 0, 7); ctx.stroke();
      }
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy + 3, spr.sz * 0.32, spr.sz * 0.18, 0, 0, 7); ctx.fill();
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(u.facing + Math.PI / 2);
      ctx.drawImage(spr.canvas, -spr.sz / 2, -spr.sz / 2);
      ctx.restore();
      // cargo indicator
      if (u.cargo > 0) { ctx.fillStyle = u.cargoKind === 'gas' ? '#8de23a' : '#2fd8e0'; ctx.fillRect(sx + spr.sz * 0.3, sy - spr.sz * 0.4, 3, 3); }
      // health bar
      if (u.hp < u.maxHp || sel) this._bar(sx - spr.sz * 0.4, sy - spr.sz * 0.5 - 3, spr.sz * 0.8, 2.5, u.hp / u.maxHp);
    }
  }

  _bar(x, y, w, h, frac) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.fillStyle = frac > 0.5 ? '#4ce04c' : frac > 0.25 ? '#e0d24c' : '#e04c4c';
    ctx.fillRect(x, y, w * Math.max(0, frac), h);
  }

  _projectiles() {
    const ctx = this.ctx, sim = this.sim;
    for (const p of sim.projectiles) {
      const sx = this.w2sx(p.x), sy = this.w2sy(p.y);
      if (p.kind === 'shell') {
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, 7); ctx.fill();
      } else {
        ctx.strokeStyle = p.side === PLAYER ? '#bfe6ff' : '#ffd0c0'; ctx.lineWidth = 1.5;
        const a = Math.atan2(p.ty - p.y, p.tx - p.x);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(a) * 6, sy - Math.sin(a) * 6); ctx.stroke();
      }
    }
  }

  _effects() {
    const ctx = this.ctx, sim = this.sim;
    for (const e of sim.effects) {
      const sx = this.w2sx(e.x), sy = this.w2sy(e.y);
      const life = e.life;
      if (e.kind === 'boom') {
        const r = (0.7 - life) * 30 + 4;
        ctx.fillStyle = `rgba(255,${140 + Math.random() * 60 | 0},40,${Math.min(1, life * 2)})`;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, r), 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,230,120,${Math.min(1, life * 1.5)})`;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, r * 0.5), 0, 7); ctx.fill();
      } else if (e.kind === 'poof') {
        ctx.fillStyle = `rgba(180,180,190,${life * 1.5})`;
        ctx.beginPath(); ctx.arc(sx, sy, (0.5 - life) * 14 + 2, 0, 7); ctx.fill();
      } else if (e.kind === 'hit') {
        ctx.fillStyle = `rgba(255,240,180,${life * 6})`;
        ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, 7); ctx.fill();
      } else if (e.kind === 'drop') {
        ctx.fillStyle = `rgba(120,240,255,${life * 2})`; ctx.font = '8px monospace';
        ctx.fillText('+', sx, sy - (0.3 - life) * 20);
      }
    }
  }

  _fog() {
    const ctx = this.ctx, sim = this.sim;
    const x0 = Math.floor(this.cam.x), y0 = Math.floor(this.cam.y);
    const x1 = Math.ceil(this.cam.x + VIEW_W / TILE), y1 = Math.ceil(this.cam.y + VIEW_H / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
        const vis = sim.fog[PLAYER][ty * MAP_W + tx];
        if (vis === 2) continue;
        ctx.fillStyle = vis === 0 ? '#05070b' : 'rgba(5,8,14,0.5)';
        ctx.fillRect(Math.round(this.w2sx(tx)), Math.round(this.w2sy(ty)), TILE + 1, TILE + 1);
      }
    }
  }

  _placement(state) {
    if (!state.pendingBuild) return;
    const ctx = this.ctx, sim = this.sim;
    const def = BUILDINGS[state.pendingBuild];
    const tx = Math.floor(state.mouseW.x - def.w / 2 + 0.5), ty = Math.floor(state.mouseW.y - def.h / 2 + 0.5);
    const okp = sim.canPlace(PLAYER, state.pendingBuild, tx, ty) &&
      sim.res[PLAYER].m >= def.cost.m && sim.res[PLAYER].g >= (def.cost.g || 0);
    const sx = this.w2sx(tx), sy = this.w2sy(ty);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(this.S.buildings[PLAYER][state.pendingBuild], sx, sy);
    ctx.globalAlpha = 1;
    ctx.fillStyle = okp ? 'rgba(80,255,120,0.25)' : 'rgba(255,70,70,0.3)';
    ctx.fillRect(sx, sy, def.w * TILE, def.h * TILE);
    ctx.strokeStyle = okp ? '#5aff78' : '#ff4646'; ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, def.w * TILE - 1, def.h * TILE - 1);
  }

  _dragBox(state) {
    if (!state.drag) return;
    const ctx = this.ctx, d = state.drag;
    const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
    ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.fillStyle = 'rgba(120,255,120,0.08)'; ctx.fillRect(x, y, w, h);
  }

  // ---------- HUD ----------
  _hud(state) {
    const ctx = this.ctx, sim = this.sim;
    // top resource bar
    ctx.fillStyle = 'rgba(8,12,20,0.82)'; ctx.fillRect(0, 0, SCREEN_W, 20);
    ctx.font = 'bold 12px monospace'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2fd8e0'; ctx.fillText('◆', 10, 11);
    ctx.fillStyle = '#dfeaf5'; ctx.fillText(String(Math.floor(sim.res[PLAYER].m)), 24, 11);
    ctx.fillStyle = '#8de23a'; ctx.fillText('❋', 92, 11);
    ctx.fillStyle = '#dfeaf5'; ctx.fillText(String(Math.floor(sim.res[PLAYER].g)), 106, 11);
    const sup = sim.supply(PLAYER);
    ctx.fillStyle = sup.used >= sup.max ? '#ff6a5a' : '#c9b26a'; ctx.fillText('⬢', 172, 11);
    ctx.fillStyle = sup.used >= sup.max ? '#ff9a8a' : '#dfeaf5';
    ctx.fillText(`${sup.used}/${sup.max}`, 186, 11);
    // timer + difficulty
    ctx.textAlign = 'right'; ctx.fillStyle = '#8a97a8';
    const mm = Math.floor(sim.time / 60), ss = Math.floor(sim.time % 60);
    ctx.fillText(`${sim.difficulty}  ${mm}:${ss < 10 ? '0' : ''}${ss}`, SCREEN_W - 8, 11);
    ctx.textAlign = 'left';

    // latest alert
    if (sim.alerts.length) {
      const a = sim.alerts[sim.alerts.length - 1];
      if (sim.time - a.t < 3.5) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(SCREEN_W / 2 - 110, 24, 220, 16);
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffce54';
        ctx.font = '11px monospace'; ctx.fillText(a.text, SCREEN_W / 2, 32); ctx.textAlign = 'left';
      }
    }

    // bottom HUD panel
    ctx.fillStyle = '#141922'; ctx.fillRect(0, HUD_Y, SCREEN_W, HUD_H);
    ctx.fillStyle = '#20283440'; ctx.fillRect(0, HUD_Y, SCREEN_W, 2);
    ctx.strokeStyle = '#2b3646'; ctx.strokeRect(0.5, HUD_Y + 0.5, SCREEN_W - 1, HUD_H - 1);

    this._minimap();
    this._selectionPanel(state);
    this._commandCard(state);
  }

  _minimap() {
    const ctx = this.ctx, sim = this.sim, sc = this.mmScale;
    ctx.fillStyle = '#05070b'; ctx.fillRect(MM.x - 2, MM.y - 2, MM.s + 4, MM.s + 4);
    // terrain (downsample)
    const img = ctx.getImageData ? null : null;
    for (let ty = 0; ty < MAP_H; ty += 1) {
      for (let tx = 0; tx < MAP_W; tx += 1) {
        const vis = sim.fog[PLAYER][ty * MAP_W + tx];
        if (vis === 0) continue;
        const terr = sim.terrain[ty * MAP_W + tx];
        let col = terr === T.ROCK ? '#4a515c' : terr === T.DIRT ? '#5c4a30' : '#2e5d34';
        ctx.fillStyle = col;
        ctx.fillRect(MM.x + tx * sc, MM.y + ty * sc, sc + 0.6, sc + 0.6);
        if (vis === 1) { ctx.fillStyle = 'rgba(5,8,14,0.45)'; ctx.fillRect(MM.x + tx * sc, MM.y + ty * sc, sc + 0.6, sc + 0.6); }
      }
    }
    // resources
    for (const n of sim.resources) {
      if (n.amount <= 0 || sim.fog[PLAYER][n.ty * MAP_W + n.tx] === 0) continue;
      ctx.fillStyle = n.kind === 'moore' ? '#2fd8e0' : '#8de23a';
      ctx.fillRect(MM.x + n.tx * sc, MM.y + n.ty * sc, sc + 1, sc + 1);
    }
    // buildings + units
    for (const b of sim.buildings) {
      if (b.side === ENEMY && !sim.seenBy(PLAYER, b)) continue;
      ctx.fillStyle = TEAM[b.side].main;
      ctx.fillRect(MM.x + b.tx * sc, MM.y + b.ty * sc, Math.max(2, b.w * sc), Math.max(2, b.h * sc));
    }
    for (const u of sim.units) {
      if (u.side === ENEMY && !sim.seenBy(PLAYER, u)) continue;
      ctx.fillStyle = u.side === PLAYER ? '#9dc2ff' : '#ffb0a4';
      ctx.fillRect(MM.x + u.x * sc - 0.5, MM.y + u.y * sc - 0.5, 1.6, 1.6);
    }
    // camera viewport rect
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.strokeRect(MM.x + this.cam.x * sc, MM.y + this.cam.y * sc, (VIEW_W / TILE) * sc, (VIEW_H / TILE) * sc);
    ctx.strokeStyle = '#3a4658'; ctx.strokeRect(MM.x - 2.5, MM.y - 2.5, MM.s + 5, MM.s + 5);
  }

  _selectionPanel(state) {
    const ctx = this.ctx, sim = this.sim;
    const px0 = 100, py0 = HUD_Y + 6;
    if (!state.selList || !state.selList.length) {
      ctx.fillStyle = '#5a6678'; ctx.font = '10px monospace';
      ctx.fillText('Select a unit or building', px0, py0 + 30);
      return;
    }
    const list = state.selList;
    const primary = list[0];
    const def = primary.def;
    const isB = primary.w !== undefined;
    ctx.fillStyle = '#cfe0f0'; ctx.font = 'bold 11px monospace';
    ctx.fillText(def.name + (list.length > 1 ? ` x${list.length}` : ''), px0, py0 + 6);
    ctx.font = '9px monospace'; ctx.fillStyle = '#93a3b5';
    if (isB) {
      ctx.fillText(`HP ${Math.ceil(primary.hp)}/${primary.maxHp}`, px0, py0 + 20);
      if (!primary.complete) ctx.fillText(`Building ${(primary.buildProg / primary.buildTime * 100 | 0)}%`, px0, py0 + 32);
      else if (primary.queue && primary.queue.length) ctx.fillText(`Queue: ${primary.queue.length}`, px0, py0 + 32);
    } else {
      ctx.fillText(`HP ${Math.ceil(primary.hp)}/${primary.maxHp}  DMG ${def.dmg}`, px0, py0 + 20);
      ctx.fillText(`AR ${def.armor}  RNG ${def.range.toFixed(1)}`, px0, py0 + 32);
    }
    // grid of selected unit icons
    if (list.length > 1) {
      let gx = px0, gy = py0 + 42;
      for (let i = 0; i < Math.min(list.length, 24); i++) {
        const u = list[i];
        ctx.fillStyle = TEAM[u.side].main; ctx.fillRect(gx, gy, 8, 8);
        ctx.strokeStyle = '#0a0d12'; ctx.strokeRect(gx + 0.5, gy + 0.5, 8, 8);
        // hp tint
        ctx.fillStyle = '#4ce04c'; ctx.fillRect(gx, gy + 8, 8 * (u.hp / u.maxHp), 1.5);
        gx += 10; if (gx > 360) { gx = px0; gy += 12; }
      }
    }
    // building queue icons
    if (isB && primary.queue && primary.queue.length) {
      let gx = px0 + 130, gy = py0 + 4;
      for (let i = 0; i < primary.queue.length; i++) {
        ctx.fillStyle = '#2a3340'; ctx.fillRect(gx, gy, 12, 12);
        ctx.fillStyle = TEAM[primary.side].lite; ctx.fillRect(gx + 2, gy + 2, 8, 8);
        if (i === 0) { ctx.fillStyle = '#ffd24a'; ctx.fillRect(gx, gy + 12, 12 * (primary.trainProg / UNITS[primary.queue[0]].buildTime), 2); }
        gx += 15; if (gx > 360) { gx = px0 + 130; gy += 16; }
      }
    }
  }

  _commandCard(state) {
    const ctx = this.ctx;
    const btns = commandButtons(this.sim, state.selList, state);
    state._cardBtns = btns;
    for (const b of btns) {
      const hot = state.pendingBuild && b.act === 'build:' + state.pendingBuild;
      ctx.fillStyle = b.enabled ? (hot ? '#2c4a6a' : '#2a3340') : '#1b2029';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = hot ? '#5aa8ff' : '#3a4658'; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.fillStyle = b.enabled ? '#dfeaf5' : '#5a6678';
      ctx.font = 'bold 9px monospace'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + 4, b.y + 8);
      if (b.hot) { ctx.fillStyle = '#ffce54'; ctx.font = '7px monospace'; ctx.fillText('[' + b.hot + ']', b.x + 4, b.y + b.h - 6); }
      if (b.cost) { ctx.fillStyle = '#7fd6dd'; ctx.font = '7px monospace'; ctx.textAlign = 'right'; ctx.fillText(b.cost, b.x + b.w - 3, b.y + b.h - 6); ctx.textAlign = 'left'; }
    }
    ctx.textBaseline = 'alphabetic';
  }
}

// Returns command-card buttons based on current selection. Shared by input for hit-testing.
export function commandButtons(sim, selList, state) {
  const btns = [];
  const slot = (c, r, label, act, opts = {}) => {
    btns.push({
      x: CARD.x0 + c * (CARD.cw + CARD.gap), y: CARD.y0 + r * (CARD.ch + CARD.gap),
      w: CARD.cw, h: CARD.ch, label, act, enabled: opts.enabled !== false, hot: opts.hot, cost: opts.cost,
    });
  };
  if (!selList || !selList.length) return btns;
  const primary = selList[0];
  const isB = primary.w !== undefined;
  const mine = primary.side === PLAYER;
  if (!mine) return btns;

  if (isB) {
    if (primary.complete && primary.def.trains && primary.def.trains.length) {
      let i = 0;
      for (const ut of primary.def.trains) {
        const u = UNITS[ut];
        const afford = sim.res[PLAYER].m >= u.cost.m && sim.res[PLAYER].g >= (u.cost.g || 0);
        slot(i % CARD.cols, Math.floor(i / CARD.cols), 'Tr ' + u.name.split(' ')[0].slice(0, 6), 'train:' + ut,
          { enabled: afford, cost: u.cost.g ? `${u.cost.m}/${u.cost.g}` : `${u.cost.m}`, hot: (i + 1) });
        i++;
      }
      slot(3, 2, 'Rally', 'rally', {});
      if (primary.queue && primary.queue.length) slot(2, 2, 'Cancel', 'cancelq', {});
    }
  } else {
    const anyWorker = selList.some(u => u.type === 'worker');
    // common unit commands
    slot(0, 0, 'Move', 'move', { hot: 'M' });
    slot(1, 0, 'Stop', 'stop', { hot: 'S' });
    slot(2, 0, 'Hold', 'hold', { hot: 'H' });
    slot(3, 0, 'Attack', 'attack', { hot: 'A' });
    if (anyWorker) {
      let i = 0;
      for (const bt of WORKER_BUILDS) {
        const d = BUILDINGS[bt];
        const afford = sim.res[PLAYER].m >= d.cost.m && sim.res[PLAYER].g >= (d.cost.g || 0);
        const reqOk = !d.requires || sim.hasBuilding(PLAYER, d.requires);
        slot(i % CARD.cols, 1 + Math.floor(i / CARD.cols), d.name.split(' ')[0].slice(0, 7), 'build:' + bt,
          { enabled: afford && reqOk, cost: d.cost.g ? `${d.cost.m}/${d.cost.g}` : `${d.cost.m}` });
        i++;
      }
    }
  }
  return btns;
}
