// Defender of the Moore — state machine, campaign map, HUD, events, save.
// A Defender of the Crown style light strategy game with Cinemaware mini-games.

import { Input, initTouch, initCanvasTap } from './input.js';
import { Sound } from './audio.js';
import * as S from './sprites.js';
import * as C from './campaign.js';
import { Joust } from './joust.js';
import { Duel } from './duel.js';
import { Siege } from './siege.js';
import { Raid } from './raid.js';

const VIEW_W = 320, VIEW_H = 224;

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

// ---- text helpers ----
function text(str, x, y, color = '#fff', size = 8, align = 'left') {
  ctx.font = `${size}px monospace`; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function panel(x, y, w, h, fill = 'rgba(20,14,20,0.9)', rim = S.PAL.gold) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function wrap(str, max) {
  const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

// heraldry object for a faction, factoring the player's chosen charge/colours
function herOf(st, faction) {
  if (faction === 0) {
    const h = C.HERALDRY[st.heraldry] || C.HERALDRY[0];
    return { color: h.color, dark: h.dark, light: h.light, charge: h.charge, name: C.FACTIONS[0].name };
  }
  const f = C.FACTIONS[faction];
  return { color: f.color, dark: f.dark, light: f.light, charge: f.charge, name: f.name };
}

// ---- quick FIELD BATTLE scene (fast real-time charge) ----
class FieldBattle {
  constructor(opts) {
    this.her = opts.her; this.foe = opts.foe;
    this.atk = opts.atk; this.def = opts.def;
    this.title = 'Field Battle';
    this.done = false; this.win = false;
    this.phase = 'intro'; this.timer = 1.2;
    this.marker = 0; this.dir = 1; this.charge = 0.5; this.locked = false;
    this.msg = 'Time your charge — X in the golden band!';
    this.adv = 0; this.flash = 0;
  }
  update(dt, input, sound) {
    this.flash = Math.max(0, this.flash - dt);
    if (this.phase === 'intro') { this.timer -= dt; if (this.timer <= 0 || input.pressed('x')) this.phase = 'aim'; return; }
    if (this.phase === 'clash') {
      this.timer -= dt; this.adv = Math.min(1, this.adv + dt * 2);
      if (this.timer <= 0) { this.phase = 'over'; this.timer = 1.6; }
      return;
    }
    if (this.phase === 'over') { this.timer -= dt; if (this.timer <= 0 || input.pressed('x')) this.done = true; return; }
    // aim: a marker sweeps a bar; X locks the charge bonus
    this.marker += this.dir * dt * 1.6;
    if (this.marker > 1) { this.marker = 1; this.dir = -1; }
    if (this.marker < 0) { this.marker = 0; this.dir = 1; }
    if (input.pressed('x') && !this.locked) {
      this.locked = true;
      const band = Math.abs(this.marker - 0.5) < 0.12 ? 1.6 : Math.abs(this.marker - 0.5) < 0.28 ? 1.2 : 0.85;
      this.charge = band;
      const p = C.battleOdds(this.atk * band, this.def);
      this.win = Math.random() < p;
      this.phase = 'clash'; this.timer = 1.4; this.flash = 0.3;
      this.msg = band > 1.4 ? 'A perfect charge — they buckle!' : band > 1 ? 'A strong charge!' : 'A ragged charge...';
      if (sound) { sound.gallop(); sound.hit(); }
    }
  }
  render(ctx2, frame) {
    S.skyGradient(ctx2, VIEW_W, VIEW_H, '#8098c0', '#c8d0a8');
    S.drawClouds(ctx2, VIEW_W, VIEW_H, frame * 0.12);
    ctx2.fillStyle = S.PAL.grassD; ctx2.fillRect(0, 150, VIEW_W, VIEW_H - 150);
    ctx2.fillStyle = S.PAL.grass; ctx2.fillRect(0, 150, VIEW_W, 5);
    // two lines of soldiers advancing
    const push = this.phase === 'clash' ? this.adv * 40 : 0;
    for (let i = 0; i < 8; i++) S.drawSoldier(ctx2, 30 + i * 10 + push, 176 + (i % 2) * 6, 1, this.win || this.phase !== 'over' ? this.her : this.her);
    for (let i = 0; i < 8; i++) S.drawSoldier(ctx2, 290 - i * 10 - push, 176 + (i % 2) * 6, -1, this.foe);
    text(`${this.atk}`, 40, 140, this.her.light, 10);
    text(`${this.def}`, 280, 140, this.foe.light, 10, 'right');
    // charge timing bar
    if (this.phase === 'aim') {
      const bx = 60, bw = 200, by = 120;
      ctx2.fillStyle = '#00000088'; ctx2.fillRect(bx, by, bw, 10);
      ctx2.fillStyle = S.PAL.gold; ctx2.fillRect(bx + bw * 0.38, by, bw * 0.24, 10);
      ctx2.fillStyle = '#fff'; ctx2.fillRect(bx + this.marker * bw - 1, by - 2, 3, 14);
      ctx2.strokeStyle = '#fff'; ctx2.lineWidth = 1; ctx2.strokeRect(bx, by, bw, 10);
    }
    if (this.flash > 0) { ctx2.fillStyle = `rgba(255,255,255,${this.flash})`; ctx2.fillRect(0, 0, VIEW_W, VIEW_H); }
    bannerLine(ctx2, this.msg);
    if (this.phase === 'intro') centerBig(ctx2, this.title, 'Meet them in the open field');
    if (this.phase === 'over') centerBig(ctx2, this.win ? 'THE FIELD IS WON' : 'ROUTED', this.msg);
  }
}
function bannerLine(c, msg) {
  c.fillStyle = 'rgba(16,10,16,0.82)'; c.fillRect(0, VIEW_H - 22, VIEW_W, 22);
  c.strokeStyle = S.PAL.gold; c.lineWidth = 1; c.strokeRect(0.5, VIEW_H - 21.5, VIEW_W - 1, 21);
  c.font = '9px monospace'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#f0e0c0';
  c.fillText(msg, VIEW_W / 2, VIEW_H - 16);
}
function centerBig(c, big, small) {
  c.fillStyle = 'rgba(16,10,16,0.55)'; c.fillRect(0, 78, VIEW_W, 60);
  c.font = '20px monospace'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = S.PAL.gold;
  c.fillText(big, VIEW_W / 2, 88);
  c.font = '9px monospace'; c.fillStyle = '#f0e0c0'; c.fillText(small, VIEW_W / 2, 116);
  c.fillStyle = '#a89a7a'; c.fillText('X to continue', VIEW_W / 2, 128);
}

// ---------------- the game ----------------
class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.st = null;
    this.scene = null;         // active mini-game
    this.pending = null;       // {kind:'attack'|'event', ...}
    this.cursor = 0;           // selected territory
    this.menu = null;          // modal action menu
    this.vignette = null;      // {title,text,portraitFaction,then}
    this.newg = { heraldry: 0, diff: 1, sel: 0 };
    this.hasSave = !!C.loadFromStorage();
    this.toast = null; this.toastT = 0;
    this.news = [];

    initCanvasTap(this.input, canvas, (x, y) => this.onTap(x, y));

    const unlock = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });

    requestAnimationFrame((t) => this.loop(t));
  }

  toastMsg(m) { this.toast = m; this.toastT = 2.2; }

  // ---- turn flow ----
  startNewGame() {
    this.st = C.newGame({ heraldry: this.newg.heraldry, diff: this.newg.diff, name: 'Moore' });
    this.cursor = this.st.terr.findIndex((t) => t.owner === 0);
    this.beginPlayerTurn(true);
    this.state = 'map';
    this.sound.playMusic('map');
  }

  beginPlayerTurn(first) {
    const st = this.st;
    if (st.over) return;
    C.collectIncome(st, 0);
    if (!first) {
      const ev = C.rollEvent(st);
      if (ev) { this.presentEvent(ev); return; }
    }
    this.state = 'map';
  }

  presentEvent(ev) {
    this.sound.eventSting();
    this.pending = { kind: 'event', ev };
    this.vignette = {
      title: ev.title, text: ev.text,
      portrait: ev.type === 'maiden' ? 'maiden' : 'lord',
      portraitFaction: 1 + (Math.random() * 3 | 0),
      interactive: ev.interactive,
    };
    this.state = 'event';
  }

  // player chose an action → resolve rivals + advance the round
  endPlayerTurn() {
    const st = this.st;
    if (C.checkVictory(st)) { this.toEnd(); return; }
    this.news = C.runRivalTurns(st);
    if (C.checkVictory(st)) { this.toEnd(); return; }
    st.turn++;
    C.saveToStorage(st);
    // report notable rival news (attacks on the player)
    const hostile = this.news.find((n) => n.kind === 'attack' && n.vsPlayer && n.win);
    if (hostile) {
      const f = C.FACTIONS[hostile.faction];
      this.vignetteThen({ title: `${f.name} Strikes!`, text: `${f.name} storms ${C.terrMeta(hostile.to).name} and tears it from your grasp!`, portraitFaction: hostile.faction },
        () => this.beginPlayerTurn(false));
      return;
    }
    this.beginPlayerTurn(false);
  }

  vignetteThen(v, then) { this.vignette = { ...v, then, portrait: v.portrait || 'lord' }; this.pending = null; this.state = 'notice'; }

  toEnd() {
    C.saveToStorage(this.st);
    if (this.st.over === 'win') { this.state = 'victory'; this.sound.playMusic('win'); this.sound.coronation(); }
    else { this.state = 'defeat'; this.sound.playMusic('lose'); this.sound.dirge(); }
  }

  // ---- launching mini-games ----
  launchAttack(fromId, toId) {
    const st = this.st;
    const from = st.terr[fromId], to = st.terr[toId];
    const her = herOf(st, 0), foe = herOf(st, to.owner);
    const atk = Math.max(1, from.army - Math.floor(from.army * 0.25));
    const def = to.army;
    const foeSkill = Math.max(0.15, Math.min(0.9, def / (atk + def) + 0.1));
    this.pending = { kind: 'attack', from: fromId, to: toId };
    if (to.castle) {
      this.scene = new Siege({ her, foe, foeSkill, title: `Siege of ${C.terrMeta(toId).name}`, armyAtk: atk, armyDef: def });
      this.state = 'siege'; this.sound.playMusic('siege');
    } else {
      this.scene = new FieldBattle({ her, foe, atk, def });
      this.state = 'field'; this.sound.playMusic('joust');
    }
  }

  launchEventGame(ev) {
    const st = this.st; const her = herOf(st, 0);
    const foeFaction = 1 + (Math.random() * 3 | 0);
    const foe = herOf(st, foeFaction);
    const foeSkill = 0.4 + st.diff * 0.15;
    if (ev.interactive === 'joust') { this.scene = new Joust({ her, foe, foeSkill, title: 'The Tournament' }); this.state = 'joust'; this.sound.playMusic('joust'); }
    else if (ev.interactive === 'duel') { this.scene = new Duel({ her, foe, foeSkill, title: 'A Duel of Honour' }); this.state = 'duel'; this.sound.playMusic('duel'); }
    else if (ev.interactive === 'raid') { this.scene = new Raid({ her, foe, foeSkill, title: 'The Rescue' }); this.state = 'raid'; this.sound.playMusic('raid'); }
  }

  onSceneDone(win) {
    const st = this.st; const p = this.pending;
    this.scene = null;
    if (p && p.kind === 'attack') {
      C.applyAttackResult(st, p.from, p.to, win);
      const to = st.terr[p.to];
      const v = win
        ? { title: 'A Province Falls', text: `${C.terrMeta(p.to).name} bows to your banner! Your host marches in.`, portraitFaction: 0 }
        : { title: 'Repulsed', text: `Your assault on ${C.terrMeta(p.to).name} is thrown back with loss.`, portraitFaction: 0 };
      if (win) { st.renown += to.castle ? 20 : 12; this.sound.fanfare(); }
      this.vignetteThen(v, () => this.endPlayerTurn());
    } else if (p && p.kind === 'event') {
      const r = C.resolveEvent(st, p.ev, win);
      this.vignetteThen({ title: win ? 'Well Fought' : 'A Bitter Day', text: r.text, portraitFaction: 0 },
        () => this.endPlayerTurn());
    } else {
      this.state = 'map';
    }
    this.sound.playMusic('map');
  }

  // ---- action menu ----
  openMenu() {
    const st = this.st; const t = st.terr[this.cursor];
    const items = [];
    const musterCost = C.MUSTER_BATCH * C.SOLDIER_COST;
    if (t.owner === 0) {
      items.push({ label: `Muster Levy  (+${C.MUSTER_BATCH})  -${musterCost}g`, act: 'muster', enabled: st.gold[0] >= musterCost });
    }
    // attack: if cursor is an enemy adjacent to one of ours
    if (t.owner !== 0) {
      const lps = C.launchPoints(st, 0, this.cursor).filter((n) => st.terr[n].army >= 2);
      const needCata = t.castle && st.catapults[0] < 1;
      items.push({ label: t.castle ? 'Lay Siege (castle)' : 'Attack (field)', act: 'attack', enabled: lps.length > 0 && !needCata,
        note: needCata ? 'need a catapult' : (lps.length ? '' : 'not adjacent to your lands') });
    }
    items.push({ label: `Forge Catapult  -${C.CATAPULT_COST}g`, act: 'catapult', enabled: st.gold[0] >= C.CATAPULT_COST });
    items.push({ label: 'Hold Court (end turn)', act: 'hold', enabled: true });
    items.push({ label: 'Save Chronicle', act: 'save', enabled: true });
    this.menu = { title: C.terrMeta(this.cursor).name, items, idx: 0 };
    this.sound.select();
  }

  doMenu(act) {
    const st = this.st; const t = st.terr[this.cursor];
    this.menu = null;
    if (act === 'muster') { C.musterSoldiers(st, 0, this.cursor, 1); this.sound.buy(); this.toastMsg('Levies mustered.'); this.endPlayerTurn(); }
    else if (act === 'catapult') { C.buyCatapult(st, 0); this.sound.buy(); this.toastMsg('A catapult is forged.'); this.endPlayerTurn(); }
    else if (act === 'hold') { this.sound.select(); this.endPlayerTurn(); }
    else if (act === 'save') { C.saveToStorage(st); this.sound.coin(); this.toastMsg('Chronicle saved.'); }
    else if (act === 'attack') {
      const lps = C.launchPoints(st, 0, this.cursor).filter((n) => st.terr[n].army >= 2).sort((a, b) => st.terr[b].army - st.terr[a].army);
      if (!lps.length) { this.sound.deny(); return; }
      this.launchAttack(lps[0], this.cursor);
    }
  }

  // ---- input: map cursor navigation ----
  moveCursor(dx, dy) {
    const st = this.st; const cur = C.terrMeta(this.cursor);
    let best = -1, bestScore = 1e9;
    for (const m of C.TERR_META) {
      if (m.id === this.cursor) continue;
      const ddx = m.x - cur.x, ddy = m.y - cur.y;
      const along = ddx * dx + ddy * dy;
      if (along <= 4) continue;
      const perp = Math.abs(ddx * dy - ddy * dx);
      const score = along + perp * 2.2;
      if (score < bestScore) { bestScore = score; best = m.id; }
    }
    if (best >= 0) { this.cursor = best; this.sound.moveCur(); }
  }

  onTap(x, y) {
    if (this.state === 'map' && !this.menu) {
      // tap a territory to select; tap again (same) to open menu
      let best = -1, bd = 24;
      for (const m of C.TERR_META) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m.id; } }
      if (best >= 0) { if (best === this.cursor) this.openMenu(); else { this.cursor = best; this.sound.moveCur(); } }
    } else if (this.menu) {
      // tap menu rows
      const bx = 90, by = 60, bw = 140, rh = 16;
      for (let i = 0; i < this.menu.items.length; i++) {
        if (x > bx && x < bx + bw && y > by + 18 + i * rh && y < by + 18 + i * rh + rh) {
          this.menu.idx = i; if (this.menu.items[i].enabled) this.doMenu(this.menu.items[i].act); else this.sound.deny();
        }
      }
    } else {
      this.input.press('x'); // let modal screens advance on tap
    }
  }

  // ---------------- main loop ----------------
  loop(t) {
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
    this.last = t; this.frame++;
    this.input.pollGamepad();
    this.update(dt);
    this.render();
    this.sound.updateMusic();
    this.input.endFrame();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  update(dt) {
    if (this.input.pressed('mute')) { const m = this.sound.toggleMute(); this.toastMsg(m ? 'Muted' : 'Sound on'); }
    if (this.toastT > 0) this.toastT -= dt;

    switch (this.state) {
      case 'title': this.updTitle(); break;
      case 'newgame': this.updNewGame(); break;
      case 'map': this.updMap(); break;
      case 'event': this.updEvent(); break;
      case 'notice': this.updNotice(); break;
      case 'joust': case 'duel': case 'siege': case 'raid': case 'field': this.updScene(dt); break;
      case 'victory': case 'defeat': if (this.input.pressed('x') || this.input.pressed('start')) { this.state = 'title'; this.sound.playMusic('title'); } break;
    }
  }

  updTitle() {
    if (this.sound.trackName !== 'title') this.sound.playMusic('title');
    if (this.input.pressed('x') || this.input.pressed('start')) { this.state = 'newgame'; this.newg.sel = 0; this.sound.select(); }
    if (this.input.pressed('z') && this.hasSave) { const s = C.loadFromStorage(); if (s) { this.st = s; this.cursor = s.terr.findIndex((t) => t.owner === 0) || 0; if (this.cursor < 0) this.cursor = 0; this.state = 'map'; this.sound.playMusic('map'); } }
  }

  updNewGame() {
    const n = this.newg;
    if (this.input.pressed('up')) { n.sel = (n.sel + 2) % 3; this.sound.moveCur(); }
    if (this.input.pressed('down')) { n.sel = (n.sel + 1) % 3; this.sound.moveCur(); }
    if (n.sel === 0) { if (this.input.pressed('left')) { n.heraldry = (n.heraldry + 2) % 3; this.sound.moveCur(); } if (this.input.pressed('right')) { n.heraldry = (n.heraldry + 1) % 3; this.sound.moveCur(); } }
    if (n.sel === 1) { if (this.input.pressed('left')) { n.diff = (n.diff + 2) % 3; this.sound.moveCur(); } if (this.input.pressed('right')) { n.diff = (n.diff + 1) % 3; this.sound.moveCur(); } }
    // X or Enter rides forth (X on the BEGIN row too); Z returns to the title
    if (this.input.pressed('x') || this.input.pressed('start')) { this.startNewGame(); this.sound.fanfare(); }
    if (this.input.pressed('z')) { this.state = 'title'; this.sound.select(); }
  }

  updMap() {
    if (this.st.over) { this.toEnd(); return; }
    if (this.menu) {
      const m = this.menu;
      if (this.input.pressed('up')) { m.idx = (m.idx + m.items.length - 1) % m.items.length; this.sound.moveCur(); }
      if (this.input.pressed('down')) { m.idx = (m.idx + 1) % m.items.length; this.sound.moveCur(); }
      if (this.input.pressed('x')) { const it = m.items[m.idx]; if (it.enabled) this.doMenu(it.act); else this.sound.deny(); }
      if (this.input.pressed('z')) { this.menu = null; this.sound.select(); }
      return;
    }
    if (this.input.pressed('left')) this.moveCursor(-1, 0);
    if (this.input.pressed('right')) this.moveCursor(1, 0);
    if (this.input.pressed('up')) this.moveCursor(0, -1);
    if (this.input.pressed('down')) this.moveCursor(0, 1);
    if (this.input.pressed('x') || this.input.pressed('start')) this.openMenu();
  }

  updEvent() {
    if (this.input.pressed('x') || this.input.pressed('start')) {
      const ev = this.pending.ev;
      if (ev.interactive) { this.launchEventGame(ev); }
      else { this.pending = null; this.state = 'map'; this.sound.select(); }
    }
  }

  updNotice() {
    if (this.input.pressed('x') || this.input.pressed('start')) {
      const then = this.vignette.then; this.vignette = null; if (then) then(); else this.state = 'map';
      this.sound.select();
    }
  }

  updScene(dt) {
    if (!this.scene) { this.state = 'map'; return; }
    this.scene.update(dt, this.input, this.sound);
    if (this.scene.done) this.onSceneDone(this.scene.win);
  }

  // ---------------- render ----------------
  render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    switch (this.state) {
      case 'title': this.rndTitle(); break;
      case 'newgame': this.rndNewGame(); break;
      case 'map': this.rndMap(); if (this.menu) this.rndMenu(); break;
      case 'event': this.rndMap(); this.rndVignette(this.vignette, true); break;
      case 'notice': this.rndMap(); this.rndVignette(this.vignette, false); break;
      case 'joust': case 'duel': case 'siege': case 'raid': case 'field': if (this.scene) this.scene.render(ctx, this.frame); break;
      case 'victory': this.rndVictory(); break;
      case 'defeat': this.rndDefeat(); break;
    }
    if (this.toastT > 0 && this.toast) {
      ctx.globalAlpha = Math.min(1, this.toastT);
      panel(VIEW_W / 2 - 60, 2, 120, 14);
      text(this.toast, VIEW_W / 2, 5, '#f0e0c0', 9, 'center');
      ctx.globalAlpha = 1;
    }
  }

  // ---- title ----
  rndTitle() {
    S.skyGradient(ctx, VIEW_W, VIEW_H, '#241636', '#5a3a5a');
    // moon
    ctx.fillStyle = '#e8e0c0'; ctx.beginPath(); ctx.arc(258, 42, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3a5a'; ctx.beginPath(); ctx.arc(252, 38, 14, 0, Math.PI * 2); ctx.fill();
    // hills
    ctx.fillStyle = '#2a2038'; ctx.beginPath(); ctx.moveTo(0, 150); ctx.quadraticCurveTo(160, 120, 320, 150); ctx.lineTo(320, 224); ctx.lineTo(0, 224); ctx.fill();
    // central castle silhouette
    S.drawCastle(ctx, 116, 96, 90, 96, herOf({ heraldry: 0 }, 0), 0);
    // crossed swords over the title
    ctx.save(); ctx.translate(160, 66);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * 0.5);
      ctx.fillStyle = S.PAL.steel; ctx.fillRect(-2, -34, 4, 46);
      ctx.fillStyle = S.PAL.gold; ctx.fillRect(-8, 10, 16, 4); ctx.fillRect(-2, 14, 4, 8);
      ctx.fillStyle = S.PAL.steelD; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(-2, -34); ctx.lineTo(2, -34); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // title text with shadow
    ctx.textAlign = 'center';
    text('DEFENDER', VIEW_W / 2 + 1, 25, '#100810', 22, 'center');
    text('DEFENDER', VIEW_W / 2, 24, S.PAL.gold, 22, 'center');
    text('of the MOORE', VIEW_W / 2 + 1, 49, '#100810', 13, 'center');
    text('of the MOORE', VIEW_W / 2, 48, '#e8c040', 13, 'center');
    if (this.frame % 60 < 40) text('Press X to take up your banner', VIEW_W / 2, 188, '#f0e0c0', 9, 'center');
    if (this.hasSave) text('Press Z to resume your chronicle', VIEW_W / 2, 202, '#c0b090', 8, 'center');
    text('A Cinemaware-style realm of strategy & steel', VIEW_W / 2, 214, '#8a7a6a', 8, 'center');
  }

  // ---- new game ----
  rndNewGame() {
    S.drawThroneRoom(ctx, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(10,6,12,0.35)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('CHOOSE YOUR HOUSE', VIEW_W / 2, 8, S.PAL.gold, 12, 'center');
    const n = this.newg;
    // heraldry row
    const her = C.HERALDRY[n.heraldry];
    panel(30, 30, 260, 62, 'rgba(20,14,20,0.9)', n.sel === 0 ? S.PAL.gold : S.PAL.stoneD);
    S.drawShield(ctx, 44, 38, 34, 46, { color: her.color, dark: her.dark, light: her.light, charge: her.charge });
    text('House Moore', 92, 40, '#f0e0c0', 11);
    text(`Blazon: ${her.name}`, 92, 56, her.light, 9);
    text('< left / right to change >', 92, 72, '#a89a7a', 8);

    // difficulty row
    const d = C.DIFFS[n.diff];
    panel(30, 98, 260, 40, 'rgba(20,14,20,0.9)', n.sel === 1 ? S.PAL.gold : S.PAL.stoneD);
    text('Difficulty:  ' + d.name, 44, 106, '#f0e0c0', 11);
    text(`Start ${d.startGold}g · rivals ${['cautious', 'bold', 'ruthless'][n.diff]}`, 44, 122, '#a89a7a', 8);

    // begin row
    panel(30, 144, 260, 26, 'rgba(20,14,20,0.9)', n.sel === 2 ? S.PAL.gold : S.PAL.stoneD);
    text('RIDE FORTH  (X / Enter)', VIEW_W / 2, 150, n.sel === 2 ? S.PAL.gold : '#f0e0c0', 11, 'center');

    text('Up/Down choose row · Z back', VIEW_W / 2, 200, '#c0b090', 8, 'center');
    // rivals preview
    for (let i = 1; i < 4; i++) { const f = C.FACTIONS[i]; S.drawShield(ctx, 40 + (i - 1) * 90, 176, 16, 22, f, { noRim: true }); text(f.name.replace('House ', ''), 60 + (i - 1) * 90, 182, f.light, 8); }
  }

  // ---- campaign map ----
  rndMap() {
    const st = this.st;
    // parchment / moor backdrop
    ctx.fillStyle = '#cdb684'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // sea border
    ctx.fillStyle = '#5c86a0'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // landmass blob
    ctx.fillStyle = '#b9a06a';
    ctx.beginPath(); ctx.moveTo(20, 30);
    ctx.bezierCurveTo(90, 14, 240, 18, 305, 40);
    ctx.bezierCurveTo(316, 90, 312, 150, 296, 196);
    ctx.bezierCurveTo(210, 210, 90, 208, 24, 194);
    ctx.bezierCurveTo(10, 150, 12, 74, 20, 30); ctx.fill();
    // moor texture speckle
    const r = mulberry(4242);
    ctx.fillStyle = '#a8905c';
    for (let i = 0; i < 120; i++) ctx.fillRect(24 + r() * 276, 30 + r() * 165, 2, 2);
    ctx.fillStyle = '#8f9a5a';
    for (let i = 0; i < 40; i++) { const x = 24 + r() * 276, y = 30 + r() * 165; ctx.beginPath(); ctx.arc(x, y, 3 + r() * 3, 0, Math.PI * 2); ctx.fill(); }
    // a river
    ctx.strokeStyle = '#6fa0c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(150, 30); ctx.bezierCurveTo(140, 90, 190, 120, 170, 200); ctx.stroke();

    // adjacency roads
    ctx.strokeStyle = 'rgba(80,60,40,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    for (const m of C.TERR_META) for (const n of C.neighborsOf(m.id)) if (n > m.id) { const b = C.terrMeta(n); ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.setLineDash([]);

    // territories
    const attackables = new Set(C.attackableTargets(st, 0));
    for (const m of C.TERR_META) {
      const t = st.terr[m.id]; const her = herOf(st, t.owner);
      // region disc
      ctx.fillStyle = her.color; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(m.x, m.y, 20, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = her.dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 20, 0, Math.PI * 2); ctx.stroke();
      // icon: castle or tents
      if (t.castle) {
        ctx.fillStyle = S.PAL.stoneL; ctx.fillRect(m.x - 8, m.y - 8, 16, 12);
        ctx.fillRect(m.x - 9, m.y - 12, 4, 5); ctx.fillRect(m.x + 5, m.y - 12, 4, 5); ctx.fillRect(m.x - 2, m.y - 13, 4, 6);
        ctx.fillStyle = S.PAL.ink; ctx.fillRect(m.x - 2, m.y - 3, 4, 7);
        ctx.fillStyle = her.light; ctx.fillRect(m.x - 1, m.y - 18, 5, 4);
        ctx.strokeStyle = S.PAL.ink; ctx.beginPath(); ctx.moveTo(m.x - 1, m.y - 13); ctx.lineTo(m.x - 1, m.y - 18); ctx.stroke();
      } else {
        ctx.fillStyle = her.light; ctx.beginPath(); ctx.moveTo(m.x - 8, m.y + 2); ctx.lineTo(m.x - 3, m.y - 8); ctx.lineTo(m.x + 2, m.y + 2); ctx.fill();
        ctx.fillStyle = her.dark; ctx.beginPath(); ctx.moveTo(m.x, m.y + 2); ctx.lineTo(m.x + 5, m.y - 6); ctx.lineTo(m.x + 10, m.y + 2); ctx.fill();
      }
      // army count banner
      ctx.fillStyle = 'rgba(16,10,16,0.8)'; ctx.fillRect(m.x - 10, m.y + 6, 20, 10);
      ctx.strokeStyle = her.light; ctx.lineWidth = 1; ctx.strokeRect(m.x - 10, m.y + 6, 20, 10);
      text(String(t.army), m.x, m.y + 7, '#f0e0c0', 8, 'center');
      // name
      text(m.name, m.x, m.y + 20, '#3a2c1a', 8, 'center');
      // attack target highlight
      if (this.menu === null && attackables.has(m.id) && this.frame % 40 < 22) { ctx.strokeStyle = '#e04030'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(m.x, m.y, 23, 0, Math.PI * 2); ctx.stroke(); }
    }
    // cursor
    const cm = C.terrMeta(this.cursor);
    ctx.strokeStyle = S.PAL.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cm.x, cm.y, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(cm.x, cm.y, 24, this.frame * 0.05, this.frame * 0.05 + 4); ctx.stroke(); ctx.setLineDash([]);

    this.rndHUD();
    this.rndTerrInfo();
  }

  rndHUD() {
    const st = this.st;
    panel(0, 0, VIEW_W, 14, 'rgba(16,10,16,0.85)', S.PAL.goldD);
    const her = herOf(st, 0);
    S.drawShield(ctx, 3, 1, 9, 12, her, { noRim: true });
    text(`Turn ${st.turn}`, 16, 3, '#f0e0c0', 8);
    text(`Gold ${st.gold[0]}`, 66, 3, S.PAL.gold, 8);
    text(`Host ${C.totalArmy(st, 0)}`, 124, 3, '#d0d8e0', 8);
    text(`Cata ${st.catapults[0]}`, 180, 3, '#c0a070', 8);
    text(`Renown ${st.renown}`, 230, 3, '#e0b0d0', 8);
    // faction territory tally on far right
    for (let f = 0; f < 4; f++) { const c = C.ownedBy(st, f).length; ctx.fillStyle = C.FACTIONS[f].color; ctx.fillRect(300 - f * 8, 4, 6, 6); }
  }

  rndTerrInfo() {
    const st = this.st; const t = st.terr[this.cursor]; const m = C.terrMeta(this.cursor);
    const her = herOf(st, t.owner);
    panel(0, VIEW_H - 26, VIEW_W, 26, 'rgba(16,10,16,0.82)', S.PAL.goldD);
    text(m.name, 6, VIEW_H - 22, S.PAL.gold, 9);
    text(`${her.name}`, 6, VIEW_H - 12, her.light, 8);
    text(`${t.castle ? 'Castle' : 'Open land'} · Army ${t.army} · Income ${t.income}g`, 120, VIEW_H - 22, '#d0c0a0', 8);
    text(t.owner === 0 ? 'X: your commands' : 'X: council / assault', 120, VIEW_H - 12, '#a89a7a', 8);
  }

  rndMenu() {
    const m = this.menu;
    const bx = 90, by = 56, bw = 150, rh = 16, bh = 22 + m.items.length * rh;
    panel(bx, by, bw, bh);
    text(m.title, bx + bw / 2, by + 4, S.PAL.gold, 10, 'center');
    for (let i = 0; i < m.items.length; i++) {
      const it = m.items[i]; const y = by + 18 + i * rh;
      if (i === m.idx) { ctx.fillStyle = 'rgba(232,192,64,0.22)'; ctx.fillRect(bx + 2, y - 1, bw - 4, rh); }
      const col = !it.enabled ? '#6a6258' : i === m.idx ? '#fff4c0' : '#e0d0a8';
      text((i === m.idx ? '▸ ' : '  ') + it.label, bx + 6, y + 2, col, 8);
      if (it.note) text(it.note, bx + bw - 6, y + 2, '#c07050', 7, 'right');
    }
    text('X select · Z cancel', bx + bw / 2, by + bh - 10, '#a89a7a', 7, 'center');
  }

  // ---- event / notice vignette ----
  rndVignette(v, interactive) {
    if (!v) return;
    ctx.fillStyle = 'rgba(8,5,10,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const bh = S.letterbox(ctx, VIEW_W, VIEW_H, 0.12);
    const her = v.portraitFaction != null ? herOf(this.st, v.portraitFaction) : null;
    // portrait
    S.drawPortrait(ctx, 20, 44, 66, 84, v.portrait === 'maiden' ? 'maiden' : 'lord', her);
    // text panel
    panel(98, 44, 208, 84);
    text(v.title, 104, 50, S.PAL.gold, 11);
    const lines = wrap(v.text, 34);
    lines.forEach((ln, i) => text(ln, 104, 66 + i * 11, '#f0e0c0', 8));
    const prompt = interactive && v.interactive ? 'X to take up the challenge' : 'X to continue';
    text(prompt, VIEW_W / 2, VIEW_H - bh + 4, '#e8c040', 9, 'center');
  }

  // ---- victory / defeat ----
  rndVictory() {
    S.skyGradient(ctx, VIEW_W, VIEW_H, '#3a2c50', '#a06a90');
    S.drawThroneRoom(ctx, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(20,10,24,0.35)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // crowned king portrait, big
    const her = herOf(this.st, 0);
    S.drawPortrait(ctx, 128, 60, 64, 84, 'lord', her);
    // crown
    ctx.fillStyle = S.PAL.gold; ctx.fillRect(140, 54, 40, 8);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(142 + i * 9, 54); ctx.lineTo(146 + i * 9, 46); ctx.lineTo(150 + i * 9, 54); ctx.fill(); }
    text('CROWNED KING OF THE MOORE', VIEW_W / 2, 20, S.PAL.gold, 12, 'center');
    text('The whole realm bends the knee. Long may you reign!', VIEW_W / 2, 156, '#f0e0c0', 8, 'center');
    text(`Renown ${this.st.renown}  ·  Score ${C.scoreOf(this.st)}  ·  Turn ${this.st.turn}`, VIEW_W / 2, 170, '#e0c8a0', 8, 'center');
    if (this.st.maidenSaved) text('Lady Rowena reigns at your side.', VIEW_W / 2, 182, '#e0a0c0', 8, 'center');
    if (this.frame % 60 < 40) text('X to return to the title', VIEW_W / 2, 202, '#c0b090', 8, 'center');
  }

  rndDefeat() {
    ctx.fillStyle = '#0c0810'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.moveTo(0, 160); ctx.quadraticCurveTo(160, 130, 320, 160); ctx.lineTo(320, 224); ctx.lineTo(0, 224); ctx.fill();
    // a broken banner
    ctx.save(); ctx.translate(160, 110); ctx.rotate(0.3);
    ctx.strokeStyle = S.PAL.woodD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, 40); ctx.stroke();
    const her = herOf(this.st, 0); ctx.fillStyle = her.dark; ctx.fillRect(0, -50, 30, 24);
    ctx.restore();
    text('YOUR HOUSE IS FALLEN', VIEW_W / 2, 40, '#c04040', 13, 'center');
    text('The banner of Moore is torn from the walls.', VIEW_W / 2, 62, '#c0a0a0', 8, 'center');
    text(`You held for ${this.st.turn} turns.  Renown ${this.st.renown}.`, VIEW_W / 2, 178, '#a89090', 8, 'center');
    if (this.frame % 60 < 40) text('X to return to the title', VIEW_W / 2, 200, '#a89090', 8, 'center');
  }
}

// small non-seeded prng for decorative map speckle
function mulberry(seed) { let s = seed >>> 0; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const game = new Game();
// test / debug hooks (harmless in normal play)
window.__game = game;
window.__DOM = { Joust, Duel, Siege, Raid, FieldBattle, C, herOf };
