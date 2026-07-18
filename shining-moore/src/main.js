// Shining Moore — Genesis-style tactical RPG. Rendering + UI state machine.
// All battle rules live in battle.js (headless); this file presents them.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, drawTile, drawWindow, makeEmblem, SPR, FACES, TILE } from './sprites.js';
import {
  FORCE, CLASSES, WEAPONS, ITEMS, SPELLS, makeUnit, promote, PROMO_LEVEL,
  atkOf, rangeOf,
} from './units.js';
import { Battle, terrainAt } from './battle.js';
import {
  BATTLES, OPENING, SCENES, ENDING, HQ_TALK, shopStock, SAVE_KEY, DIFFICULTIES,
  reviveCost, validateCampaign,
} from './campaign.js';

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

function text(str, x, y, color = '#fff', size = 8, align = 'left') {
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.time = 0;
    this.titleSel = 0;
    this.diffSel = 1;
    this.banner = null;
    this.bannerT = 0;
    this.fast = false;
    this.emblem = makeEmblem();
    this.hasSave = !!localStorage.getItem(SAVE_KEY);
    const errs = validateCampaign();
    if (errs.length) console.warn('campaign errors:', errs);
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- save ----------------
  freshSave(diffIdx) {
    return {
      version: 1, difficulty: diffIdx, battleIdx: 0, gold: 50,
      inv: { herb: 2, potion: 0 }, flags: {},
      roster: FORCE.filter((f) => f.joinAfter === -1).map((f) => makeUnit(f, 1)),
    };
  }

  writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); this.hasSave = true; } catch { /* ignore */ }
  }

  get roster() { return this.save.roster; }
  diffScale() { return DIFFICULTIES[this.save.difficulty].scale; }

  showBanner(msg, t = 1.6) { this.banner = msg; this.bannerT = t; }

  // ---------------- scenes (dialogue) ----------------
  playScene(lines, cb) {
    this.scene = { lines, i: 0, chars: 0, done: cb };
    this.state = 'scene';
  }

  updScene(dt) {
    const sc = this.scene;
    const [, , line] = sc.lines[sc.i];
    if (sc.chars < line.length) {
      sc.chars += dt * 45;
      if ((this.frame & 3) === 0) this.sound.text();
      if (this.input.pressed('confirm') || this.input.pressed('cancel')) sc.chars = line.length;
    } else if (this.input.pressed('confirm') || this.input.pressed('cancel')) {
      this.sound.confirm();
      sc.i++;
      sc.chars = 0;
      if (sc.i >= sc.lines.length) { const cb = sc.done; this.scene = null; cb(); }
    }
  }

  drawScene() {
    const sc = this.scene;
    const [face, name, line] = sc.lines[sc.i];
    drawWindow(ctx, 8, 148, 304, 68);
    if (FACES[face]) {
      drawWindow(ctx, 14, 120, 40, 40);
      ctx.drawImage(FACES[face], 18, 124, 32, 32);
    }
    text(name, 60, 126, '#f8d838', 10);
    const shown = line.slice(0, Math.floor(sc.chars));
    this.wrapText(shown, 18, 158, 284, 10);
    if (sc.chars >= line.length && (this.frame & 16)) text('▼', 300, 204, '#f8d838', 8);
  }

  wrapText(str, x, y, w, lh) {
    const words = str.split(' ');
    let line = '', yy = y;
    const maxChars = Math.floor(w / 6);
    for (const wd of words) {
      if ((line + ' ' + wd).trim().length > maxChars) {
        text(line.trim(), x, yy, '#fff', 8); yy += lh; line = wd;
      } else line += ' ' + wd;
    }
    text(line.trim(), x, yy, '#fff', 8);
  }

  // ---------------- battle setup ----------------
  startBattle() {
    const idx = this.save.battleIdx;
    const def = BATTLES[idx];
    const active = this.roster.filter((u) => !u.down);
    this.engine = new Battle(def, active, { diff: this.diffScale() });
    this.bdef = def;
    this.cam = { x: 0, y: 0 };
    this.cursor = { x: def.deploy[0][0], y: def.deploy[0][1] };
    this.state = 'battle';
    this.bs = 'intro';
    this.bsT = 1.8;
    this.anim = null;
    this.moveTiles = null;
    this.inspectU = null;
    this.floaties = [];
    this.sound.playMusic(def.music === 'boss' ? 'boss' : 'map');
  }

  currentUnit() { return this.engine.current(); }

  focusCam(x, y, snap = false) {
    const tx = clamp(x * TILE + TILE / 2 - VIEW_W / 2, 0, this.engine.w * TILE - VIEW_W);
    const ty = clamp(y * TILE + TILE / 2 - (VIEW_H - 24) / 2, 0, this.engine.h * TILE - (VIEW_H - 24));
    if (snap) { this.cam.x = tx; this.cam.y = ty; }
    else { this.cam.x += (tx - this.cam.x) * 0.18; this.cam.y += (ty - this.cam.y) * 0.18; }
  }

  // Begin the current unit's turn (player → move mode; enemy → AI).
  nextTurnFlow() {
    if (this.engine.result) { this.endBattle(); return; }
    const u = this.currentUnit();
    if (!u) { this.endBattle(); return; }
    if (u.side === 'enemy') {
      this.engine.runAITurn();
      this.playEvents(() => this.nextTurnFlow());
    } else {
      this.bs = 'move';
      this.moveOrigin = { x: u.x, y: u.y };
      this.moveTiles = this.engine.reachable(u);
      this.cursor = { x: u.x, y: u.y };
      this.showBanner(u.name, 0.8);
    }
  }

  // ---------------- event animation ----------------
  playEvents(cb) {
    const evs = this.engine.events.splice(0);
    const steps = [];
    for (const ev of evs) {
      if (ev.t === 'stay' || ev.t === 'round') continue;
      steps.push(ev);
      const ups = ev.levelUps || [];
      for (const up of ups) {
        steps.push({ t: 'levelup', id: ev.xpTo || ev.a || ev.id, up });
      }
    }
    if (!steps.length) { cb(); return; }
    this.anim = { steps, i: 0, t: 0, cb, started: false };
    this.bs = 'anim';
  }

  animStep() { return this.anim.steps[this.anim.i]; }

  updAnim(dt) {
    const a = this.anim;
    const ev = a.steps[a.i];
    if (!ev) { const cb = a.cb; this.anim = null; cb(); return; }
    const spd = this.fast ? 3 : 1;
    if (!a.started) { a.started = true; a.t = 0; this.beginStep(ev); }
    a.t += dt * spd;
    const skip = this.input.pressed('confirm') || this.input.pressed('cancel');
    if (this.stepDone(ev, a.t) || (skip && this.stepSkippable(ev))) {
      this.finishStep(ev);
      a.i++; a.started = false;
    }
  }

  stepSkippable(ev) { return ev.t === 'combat' || ev.t === 'spell' || ev.t === 'levelup'; }

  beginStep(ev) {
    const E = this.engine;
    const findU = (id) => E.units.find((u) => u.id === id);
    if (ev.t === 'move') {
      this.mover = { u: findU(ev.id), path: ev.path, prog: 0 };
      if (this.mover.u.side === 'enemy') this.sound.footstep();
    } else if (ev.t === 'combat') {
      const au = findU(ev.a), du = findU(ev.d);
      this.cutin = { a: au, d: du, rounds: ev.rounds, ri: -1, xp: ev.xp, xpTo: ev.xpTo || (au.side === 'player' ? au.id : null), slide: 0 };
      this.sound.sting();
    } else if (ev.t === 'spell') {
      const u = findU(ev.id);
      this.spellFx = { ev, u };
      if (ev.kind === 'heal') this.sound.heal();
      else if (ev.spell === 'breath') this.sound.breath();
      else this.sound.blaze();
      for (const r of ev.results) {
        this.addFloaty(findU(r.id), r.dmg != null ? `${r.dmg}` : `+${r.heal}`, r.dmg != null ? '#f8f858' : '#58f858');
      }
    } else if (ev.t === 'die') {
      this.sound.die();
      this.showBanner(`${ev.name} FALLS!`, 0.9);
    } else if (ev.t === 'wake') {
      const u = findU(ev.id);
      this.sound.wake();
      if (u) this.addFloaty(u, '!', '#f84020');
    } else if (ev.t === 'levelup') {
      this.sound.levelUp();
      this.lvPanel = { u: findU(ev.id), up: ev.up };
    } else if (ev.t === 'item') {
      this.sound.heal();
      const tu = findU(ev.target);
      if (tu) this.addFloaty(tu, `+${ev.heal}`, '#58f858');
    } else if (ev.t === 'egress') {
      this.sound.egress();
      this.showBanner('EGRESS!', 1.2);
    } else if (ev.t === 'end') {
      this.showBanner(ev.why, 1.6);
    }
  }

  stepDur(ev) {
    switch (ev.t) {
      case 'move': return (ev.path.length - 1) * 0.07 + 0.05;
      case 'combat': return 1.1 + ev.rounds.length * 1.05 + (ev.xp ? 0.7 : 0);
      case 'spell': return 1.2;
      case 'die': return 0.5;
      case 'wake': return 0.35;
      case 'levelup': return 1.8;
      case 'item': return 0.6;
      case 'egress': return 1.0;
      case 'end': return 1.4;
      default: return 0.2;
    }
  }

  stepDone(ev, t) { return t >= this.stepDur(ev); }

  finishStep(ev) {
    if (ev.t === 'move') this.mover = null;
    if (ev.t === 'combat') this.cutin = null;
    if (ev.t === 'spell') this.spellFx = null;
    if (ev.t === 'levelup') this.lvPanel = null;
  }

  addFloaty(u, txt, color) {
    if (!u) return;
    this.floaties.push({ x: u.x * TILE + TILE / 2, y: u.y * TILE - 4, txt, color, t: 0 });
  }

  // ---------------- battle end ----------------
  endBattle() {
    const res = this.engine.result;
    const idx = this.save.battleIdx;
    if (res === 'victory') {
      this.save.gold += this.engine.goldEarned;
      this.state = 'victory';
      this.vT = 0;
      this.sound.stopMusic();
      this.sound.victory();
    } else if (res === 'defeat') {
      this.save.gold = Math.floor(this.save.gold / 2);
      // the hero always crawls back to HQ (no softlock)
      const hero = this.roster.find((u) => u.id === 'moore');
      if (hero) { hero.down = false; hero.hp = hero.maxhp; }
      this.state = 'defeat';
      this.vT = 0;
      this.sound.stopMusic();
      this.sound.defeat();
    } else { // egress — keep XP, back to HQ
      this.enterHQ();
      this.showBanner('THE FORCE RETURNS TO HQ', 1.6);
    }
    this.writeSave();
  }

  afterVictory() {
    const idx = this.save.battleIdx;
    const post = SCENES['post' + idx];
    const goNext = () => {
      // joins + promo flag
      for (const fd of FORCE) {
        if (fd.joinAfter === idx && !this.roster.find((u) => u.id === fd.id)) {
          const avg = Math.round(this.roster.reduce((s, u) => s + u.level, 0) / this.roster.length);
          const nu = makeUnit(fd, Math.max(1, avg));
          this.roster.push(nu);
          this.showBanner(`${nu.name} JOINS THE FORCE!`, 2);
        }
      }
      if (idx >= 3) this.save.flags.promo = true;
      if (idx >= BATTLES.length - 1) {
        this.state = 'ending'; this.endScroll = -VIEW_H; this.sound.playMusic('ending');
      } else {
        this.save.battleIdx = idx + 1;
        this.writeSave();
        this.enterHQ();
      }
    };
    if (post) this.playScene(post, goNext); else goNext();
  }

  // ---------------- HQ ----------------
  enterHQ() {
    this.state = 'hq';
    this.hqSel = 0;
    this.sub = null;
    this.sound.playMusic('hq');
    this.writeSave();
  }

  hqOptions() { return ['TALK', 'SHOP', 'CHURCH', 'SAVE', 'DEPART']; }

  updHQ() {
    const inp = this.input;
    if (this.sub === 'shop') { this.updShop(); return; }
    if (this.sub === 'church') { this.updChurch(); return; }
    const opts = this.hqOptions();
    if (inp.pressed('up')) { this.hqSel = (this.hqSel + opts.length - 1) % opts.length; this.sound.cursor(); }
    if (inp.pressed('down')) { this.hqSel = (this.hqSel + 1) % opts.length; this.sound.cursor(); }
    if (inp.pressed('confirm')) {
      this.sound.confirm();
      const o = opts[this.hqSel];
      if (o === 'TALK') {
        const talk = HQ_TALK[Math.min(this.save.battleIdx, HQ_TALK.length - 1)];
        const lines = Object.entries(talk)
          .filter(([id]) => this.roster.find((u) => u.id === id && !u.down) || id === 'moore')
          .map(([id, ln]) => [id, (FORCE.find((f) => f.id === id) || { name: id.toUpperCase() }).name, ln]);
        if (lines.length) this.playScene(lines, () => { this.state = 'hq'; });
      } else if (o === 'SHOP') {
        this.sub = 'shop'; this.shopSel = 0;
      } else if (o === 'CHURCH') {
        this.sub = 'church'; this.chSel = 0;
      } else if (o === 'SAVE') {
        this.writeSave(); this.sound.save(); this.showBanner('PROGRESS SAVED', 1.4);
      } else if (o === 'DEPART') {
        const idx = this.save.battleIdx;
        const pre = SCENES['pre' + idx];
        const go = () => { this.sound.stopMusic(); this.startBattle(); };
        if (pre) this.playScene(pre, go); else go();
      }
    }
  }

  shopList() {
    const stock = shopStock(this.save.battleIdx);
    const rows = [];
    for (const w of stock.weapons) {
      const wd = WEAPONS[w];
      for (const u of this.roster) {
        if (CLASSES[u.klass].fam === wd.fam && WEAPONS[u.weapon].atk < wd.atk) {
          rows.push({ kind: 'weapon', id: w, name: `${wd.name} +${wd.atk - WEAPONS[u.weapon].atk}ATK`, who: u, cost: wd.cost });
        }
      }
    }
    for (const it of stock.items) {
      rows.push({ kind: 'item', id: it, name: ITEMS[it].name, cost: ITEMS[it].cost });
    }
    rows.push({ kind: 'exit', name: 'LEAVE SHOP', cost: 0 });
    return rows;
  }

  updShop() {
    const inp = this.input;
    const rows = this.shopList();
    this.shopSel = clamp(this.shopSel, 0, rows.length - 1);
    if (inp.pressed('up')) { this.shopSel = (this.shopSel + rows.length - 1) % rows.length; this.sound.cursor(); }
    if (inp.pressed('down')) { this.shopSel = (this.shopSel + 1) % rows.length; this.sound.cursor(); }
    if (inp.pressed('cancel')) { this.sub = null; this.sound.cancel(); return; }
    if (inp.pressed('confirm')) {
      const r = rows[this.shopSel];
      if (r.kind === 'exit') { this.sub = null; this.sound.cancel(); return; }
      if (this.save.gold < r.cost) { this.sound.deny(); this.showBanner('NOT ENOUGH GOLD', 1); return; }
      this.save.gold -= r.cost;
      if (r.kind === 'weapon') { r.who.weapon = r.id; }
      else this.save.inv[r.id] = (this.save.inv[r.id] || 0) + 1;
      this.sound.buy();
      this.writeSave();
    }
  }

  churchList() {
    const rows = [];
    for (const u of this.roster) {
      if (u.down) rows.push({ kind: 'revive', u, name: `RAISE ${u.name}`, cost: reviveCost(u) });
    }
    if (this.save.flags.promo) {
      for (const u of this.roster) {
        if (!u.down && !u.promoted && u.level >= PROMO_LEVEL) {
          rows.push({ kind: 'promote', u, name: `PROMOTE ${u.name}`, cost: 0 });
        }
      }
    }
    rows.push({ kind: 'exit', name: 'LEAVE CHURCH', cost: 0 });
    return rows;
  }

  updChurch() {
    const inp = this.input;
    const rows = this.churchList();
    this.chSel = clamp(this.chSel, 0, rows.length - 1);
    if (inp.pressed('up')) { this.chSel = (this.chSel + rows.length - 1) % rows.length; this.sound.cursor(); }
    if (inp.pressed('down')) { this.chSel = (this.chSel + 1) % rows.length; this.sound.cursor(); }
    if (inp.pressed('cancel')) { this.sub = null; this.sound.cancel(); return; }
    if (inp.pressed('confirm')) {
      const r = rows[this.chSel];
      if (r.kind === 'exit') { this.sub = null; this.sound.cancel(); return; }
      if (this.save.gold < r.cost) { this.sound.deny(); this.showBanner('NOT ENOUGH GOLD', 1); return; }
      if (r.kind === 'revive') {
        this.save.gold -= r.cost;
        r.u.down = false; r.u.hp = r.u.maxhp;
        this.sound.heal(); this.showBanner(`${r.u.name} RETURNS!`, 1.4);
      } else {
        promote(r.u);
        this.sound.promo(); this.showBanner(`${r.u.name} BECOMES ${r.u.cls}!`, 2);
      }
      this.writeSave();
    }
  }

  // ---------------- battle input ----------------
  updBattle(dt) {
    const inp = this.input;
    const E = this.engine;
    if (inp.pressed('start')) {
      this.fast = !this.fast;
      this.showBanner(this.fast ? 'FAST MODE ON' : 'FAST MODE OFF', 1);
    }
    if (this.bs === 'intro') {
      this.bsT -= dt;
      this.focusCam(this.cursor.x, this.cursor.y, this.bsT > 1.7);
      if (this.bsT <= 0 || inp.pressed('confirm')) this.nextTurnFlow();
      return;
    }
    if (this.bs === 'anim') {
      const f = this.mover ? this.mover.u : this.cutin ? this.cutin.d : this.spellFx ? this.spellFx.ev.center : null;
      if (f) this.focusCam(f.x, f.y);
      this.updAnim(dt);
      return;
    }

    const u = this.currentUnit();
    if (!u) { this.endBattle(); return; }

    // cursor movement (menu states don't move cursor)
    if (this.bs === 'move' || this.bs === 'spellTarget') {
      let mvd = false;
      if (inp.repeat('left', dt) && this.cursor.x > 0) { this.cursor.x--; mvd = true; }
      if (inp.repeat('right', dt) && this.cursor.x < E.w - 1) { this.cursor.x++; mvd = true; }
      if (inp.repeat('up', dt) && this.cursor.y > 0) { this.cursor.y--; mvd = true; }
      if (inp.repeat('down', dt) && this.cursor.y < E.h - 1) { this.cursor.y++; mvd = true; }
      if (mvd) this.sound.cursor();
      this.focusCam(this.cursor.x, this.cursor.y);
    } else {
      this.focusCam(u.x, u.y);
    }

    if (this.bs === 'move') {
      if (this.inspectU) {
        if (inp.pressed('cancel') || inp.pressed('confirm')) { this.inspectU = null; this.sound.cancel(); }
        return;
      }
      if (inp.pressed('cancel')) {
        const over = E.at(this.cursor.x, this.cursor.y);
        if (over) { this.inspectU = over; this.sound.confirm(); }
        return;
      }
      if (inp.pressed('confirm')) {
        const k = this.cursor.x + this.cursor.y * E.w;
        if (this.moveTiles.has(k)) {
          this.sound.confirm();
          E.doMove(u, this.cursor.x, this.cursor.y);
          this.playEvents(() => { this.bs = 'menu'; this.menuSel = 0; });
        } else this.sound.deny();
      }
      return;
    }

    if (this.bs === 'menu') {
      const opts = this.menuOptions(u);
      if (inp.pressed('up')) { this.menuSel = (this.menuSel + opts.length - 1) % opts.length; this.sound.cursor(); }
      if (inp.pressed('down')) { this.menuSel = (this.menuSel + 1) % opts.length; this.sound.cursor(); }
      if (inp.pressed('cancel')) {
        // undo move
        u.x = this.moveOrigin.x; u.y = this.moveOrigin.y;
        this.moveTiles = E.reachable(u);
        this.cursor = { x: u.x, y: u.y };
        this.bs = 'move';
        this.sound.cancel();
        return;
      }
      if (inp.pressed('confirm')) {
        const o = opts[this.menuSel];
        this.sound.confirm();
        if (o === 'ATTACK') {
          this.targets = E.targetsFor(u);
          this.tSel = 0;
          this.bs = 'target';
        } else if (o === 'MAGIC') {
          this.spSel = 0;
          this.bs = 'spellPick';
        } else if (o === 'ITEM') {
          this.itSel = 0;
          this.bs = 'itemPick';
        } else { // STAY
          E.actStay(u);
          this.playEvents(() => this.nextTurnFlow());
        }
      }
      return;
    }

    if (this.bs === 'target') {
      if (!this.targets.length) { this.bs = 'menu'; return; }
      if (inp.pressed('left') || inp.pressed('up')) { this.tSel = (this.tSel + this.targets.length - 1) % this.targets.length; this.sound.cursor(); }
      if (inp.pressed('right') || inp.pressed('down')) { this.tSel = (this.tSel + 1) % this.targets.length; this.sound.cursor(); }
      if (inp.pressed('cancel')) { this.bs = 'menu'; this.sound.cancel(); return; }
      if (inp.pressed('confirm')) {
        this.sound.confirm();
        E.actAttack(u, this.targets[this.tSel]);
        this.playEvents(() => this.nextTurnFlow());
      }
      return;
    }

    if (this.bs === 'spellPick') {
      const sps = u.spells;
      if (!sps.length) { this.bs = 'menu'; return; }
      if (inp.pressed('up')) { this.spSel = (this.spSel + sps.length - 1) % sps.length; this.sound.cursor(); }
      if (inp.pressed('down')) { this.spSel = (this.spSel + 1) % sps.length; this.sound.cursor(); }
      if (inp.pressed('cancel')) { this.bs = 'menu'; this.sound.cancel(); return; }
      if (inp.pressed('confirm')) {
        const spId = sps[this.spSel];
        const sp = SPELLS[spId];
        if (u.mp < sp.mp) { this.sound.deny(); return; }
        this.sound.confirm();
        if (sp.kind === 'egress' || sp.rng === 0) {
          E.actSpell(u, spId, u.x, u.y);
          this.playEvents(() => this.nextTurnFlow());
        } else {
          this.castSpell = spId;
          this.cursor = { x: u.x, y: u.y };
          this.bs = 'spellTarget';
        }
      }
      return;
    }

    if (this.bs === 'spellTarget') {
      const sp = SPELLS[this.castSpell];
      if (inp.pressed('cancel')) { this.bs = 'spellPick'; this.sound.cancel(); return; }
      if (inp.pressed('confirm')) {
        if (man(this.cursor, u) <= sp.rng) {
          this.sound.confirm();
          E.actSpell(u, this.castSpell, this.cursor.x, this.cursor.y);
          this.playEvents(() => this.nextTurnFlow());
        } else this.sound.deny();
      }
      return;
    }

    if (this.bs === 'itemPick') {
      const its = Object.keys(this.save.inv).filter((k) => this.save.inv[k] > 0);
      if (!its.length) { this.bs = 'menu'; this.sound.deny(); return; }
      this.itSel = clamp(this.itSel, 0, its.length - 1);
      if (inp.pressed('up')) { this.itSel = (this.itSel + its.length - 1) % its.length; this.sound.cursor(); }
      if (inp.pressed('down')) { this.itSel = (this.itSel + 1) % its.length; this.sound.cursor(); }
      if (inp.pressed('cancel')) { this.bs = 'menu'; this.sound.cancel(); return; }
      if (inp.pressed('confirm')) {
        this.castItem = its[this.itSel];
        this.itTargets = this.engine.alive('player').filter((p) => man(p, u) <= 1);
        this.itTSel = 0;
        this.bs = 'itemTarget';
        this.sound.confirm();
      }
      return;
    }

    if (this.bs === 'itemTarget') {
      const ts = this.itTargets;
      if (inp.pressed('left') || inp.pressed('up')) { this.itTSel = (this.itTSel + ts.length - 1) % ts.length; this.sound.cursor(); }
      if (inp.pressed('right') || inp.pressed('down')) { this.itTSel = (this.itTSel + 1) % ts.length; this.sound.cursor(); }
      if (inp.pressed('cancel')) { this.bs = 'itemPick'; this.sound.cancel(); return; }
      if (inp.pressed('confirm')) {
        this.sound.confirm();
        E.actItem(u, this.castItem, ts[this.itTSel], this.save.inv);
        this.playEvents(() => this.nextTurnFlow());
      }
    }
  }

  menuOptions(u) {
    const opts = [];
    if (this.engine.targetsFor(u).length) opts.push('ATTACK');
    if (u.spells.length && u.spells.some((s) => u.mp >= SPELLS[s].mp)) opts.push('MAGIC');
    if (Object.values(this.save.inv).some((n) => n > 0)) opts.push('ITEM');
    opts.push('STAY');
    return opts;
  }

  // ---------------- battle drawing ----------------
  drawBattle() {
    const E = this.engine;
    const camX = Math.round(this.cam.x), camY = Math.round(this.cam.y);
    const wf = Math.floor(this.time * 2) % 2;
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(-camX, -camY + 20);
    for (let y = y0; y <= y0 + Math.ceil(VIEW_H / TILE); y++) {
      for (let x = x0; x <= x0 + Math.ceil(VIEW_W / TILE); x++) {
        if (x < 0 || y < 0 || x >= E.w || y >= E.h) continue;
        drawTile(ctx, E.map[y][x], x * TILE, y * TILE, wf);
      }
    }

    // move range highlight
    if (this.bs === 'move' && this.moveTiles) {
      ctx.fillStyle = 'rgba(72,144,248,0.4)';
      for (const t of this.moveTiles.values()) ctx.fillRect(t.x * TILE + 1, t.y * TILE + 1, TILE - 2, TILE - 2);
    }
    // spell range + aoe
    if (this.bs === 'spellTarget') {
      const u = this.currentUnit();
      const sp = SPELLS[this.castSpell];
      ctx.fillStyle = 'rgba(248,72,72,0.28)';
      for (let y = 0; y < E.h; y++) {
        for (let x = 0; x < E.w; x++) {
          if (Math.abs(x - u.x) + Math.abs(y - u.y) <= sp.rng) ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
        }
      }
      if (man(this.cursor, u) <= sp.rng) {
        ctx.fillStyle = sp.kind === 'heal' ? 'rgba(88,248,88,0.5)' : 'rgba(248,160,32,0.55)';
        for (const t of E.aoeTiles(this.cursor.x, this.cursor.y, sp.aoe)) {
          ctx.fillRect(t.x * TILE + 1, t.y * TILE + 1, TILE - 2, TILE - 2);
        }
      }
    }
    // attack target highlight
    if (this.bs === 'target' && this.targets.length) {
      const tg = this.targets[this.tSel];
      ctx.fillStyle = 'rgba(248,64,32,0.5)';
      ctx.fillRect(tg.x * TILE, tg.y * TILE, TILE, TILE);
    }
    // item target highlight
    if (this.bs === 'itemTarget' && this.itTargets.length) {
      const tg = this.itTargets[this.itTSel];
      ctx.fillStyle = 'rgba(88,248,88,0.5)';
      ctx.fillRect(tg.x * TILE, tg.y * TILE, TILE, TILE);
    }

    // units (y-sorted)
    const units = E.units.filter((v) => !v.down).slice().sort((p, q) => p.y - q.y);
    for (const v of units) {
      let px = v.x * TILE + 4, py = v.y * TILE + 4;
      if (this.mover && this.mover.u === v && this.mover.path.length > 1) {
        const p = this.mover.path;
        const prog = clamp(this.anim.t / 0.07, 0, p.length - 1);
        const i = Math.min(p.length - 2, Math.floor(prog));
        const f = prog - i;
        const ax = p[i].x + (p[i + 1].x - p[i].x) * f;
        const ay = p[i].y + (p[i + 1].y - p[i].y) * f;
        px = ax * TILE + 4; py = ay * TILE + 4;
      }
      const bob = ((this.frame >> 4) & 1) && v === this.currentUnit() ? -1 : 0;
      const key = v.side === 'player' ? v.klass + (v.promoted ? '_p' : '') : v.spr;
      const spr = SPR[key] || SPR.gob;
      if (v.big) ctx.drawImage(spr, v.x * TILE - 4, v.y * TILE - 10);
      else ctx.drawImage(spr, Math.round(px), Math.round(py) + bob);
      // hp pips for damaged units
      if (v.hp < v.maxhp) {
        ctx.fillStyle = '#101010';
        ctx.fillRect(px - 1, py - 3, 18, 3);
        ctx.fillStyle = v.side === 'player' ? '#58f858' : '#f84020';
        ctx.fillRect(px, py - 2, Math.max(1, Math.round(17 * v.hp / v.maxhp)), 1);
      }
      // dormant enemies drawn dimmer
      if (v.side === 'enemy' && !v.awake && !v.boss) {
        ctx.fillStyle = 'rgba(16,16,32,0.25)';
        ctx.fillRect(v.x * TILE + 2, v.y * TILE + 2, TILE - 4, TILE - 4);
      }
    }

    // defend markers
    if (this.bdef.objective === 'defend') {
      ctx.strokeStyle = (this.frame & 16) ? '#f8d838' : '#f84020';
      for (const [x, y] of this.bdef.defendTiles) ctx.strokeRect(x * TILE + 2.5, y * TILE + 2.5, TILE - 5, TILE - 5);
    }

    // cursor
    if (this.bs === 'move' || this.bs === 'spellTarget') {
      const cx = this.cursor.x * TILE, cy = this.cursor.y * TILE;
      ctx.strokeStyle = (this.frame & 8) ? '#f8f858' : '#f8f8f8';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 1, cy + 1, TILE - 2, TILE - 2);
      ctx.lineWidth = 1;
    }

    // floaties
    for (const f of this.floaties) {
      text(f.txt, f.x, f.y - f.t * 14, f.color, 10, 'center');
    }
    ctx.restore();

    this.drawTurnStrip();
    this.drawBattleHud();
    if (this.cutin) this.drawCutin();
    if (this.spellFx) this.drawSpellBanner();
    if (this.lvPanel) this.drawLevelUp();
    if (this.inspectU) this.drawInspect(this.inspectU);
    if (this.bs === 'intro') this.drawIntro();
  }

  drawTurnStrip() {
    const ups = this.engine.upcoming(8);
    ctx.fillStyle = 'rgba(8,8,24,0.85)';
    ctx.fillRect(0, 0, VIEW_W, 20);
    text('NEXT', 2, 6, '#8890b8', 8);
    ups.forEach((v, i) => {
      const x = 30 + i * 22;
      ctx.fillStyle = i === 0 ? '#f8d838' : '#303860';
      ctx.fillRect(x - 1, 1, 18, 18);
      const img = v.side === 'player' ? FACES[v.face] : (SPR[v.spr] || SPR.gob);
      ctx.drawImage(img, 0, 0, img.width, Math.min(img.height, img.width), x, 2, 16, 16);
    });
  }

  drawBattleHud() {
    const u = this.currentUnit();
    if (['move', 'menu', 'target', 'spellPick', 'spellTarget', 'itemPick', 'itemTarget'].includes(this.bs) && u) {
      // current unit panel
      drawWindow(ctx, 2, 178, 108, 44);
      text(u.name, 8, 184, '#f8d838', 8);
      text(u.cls + ' L' + u.level, 8, 194, '#8890b8', 8);
      text(`HP ${u.hp}/${u.maxhp}`, 8, 204, '#fff', 8);
      if (u.maxmp) text(`MP ${u.mp}/${u.maxmp}`, 60, 204, '#68b8f8', 8);
      // terrain info under cursor
      const t = terrainAt(this.engine.map, this.cursor.x, this.cursor.y);
      drawWindow(ctx, 232, 190, 86, 32);
      text(t.name, 238, 196, '#fff', 8);
      text('DEF +' + t.def, 238, 206, '#8890b8', 8);
    }
    if (this.bs === 'menu') {
      const opts = this.menuOptions(u);
      drawWindow(ctx, 240, 30, 76, 14 + opts.length * 12);
      opts.forEach((o, i) => {
        text(o, 258, 38 + i * 12, i === this.menuSel ? '#f8d838' : '#fff', 8);
        if (i === this.menuSel) text('▶', 246, 38 + i * 12, '#f8d838', 8);
      });
    }
    if (this.bs === 'spellPick') {
      const sps = u.spells;
      drawWindow(ctx, 216, 30, 100, 14 + sps.length * 12);
      sps.forEach((s, i) => {
        const sp = SPELLS[s];
        const can = u.mp >= sp.mp;
        text(`${sp.name} ${sp.mp}`, 234, 38 + i * 12, i === this.spSel ? '#f8d838' : can ? '#fff' : '#555', 8);
        if (i === this.spSel) text('▶', 222, 38 + i * 12, '#f8d838', 8);
      });
    }
    if (this.bs === 'itemPick') {
      const its = Object.keys(this.save.inv).filter((k) => this.save.inv[k] > 0);
      drawWindow(ctx, 196, 30, 120, 14 + its.length * 12);
      its.forEach((k, i) => {
        text(`${ITEMS[k].name} x${this.save.inv[k]}`, 214, 38 + i * 12, i === this.itSel ? '#f8d838' : '#fff', 8);
        if (i === this.itSel) text('▶', 202, 38 + i * 12, '#f8d838', 8);
      });
    }
  }

  drawIntro() {
    drawWindow(ctx, 30, 80, 260, 60);
    text(this.bdef.name, VIEW_W / 2, 92, '#f8d838', 12, 'center');
    const lines = this.bdef.intro.split('\n');
    lines.forEach((l, i) => text(l, VIEW_W / 2, 110 + i * 11, '#fff', 8, 'center'));
  }

  drawCutin() {
    const c = this.cutin;
    const t = this.anim.t;
    const slide = clamp(t / 0.25, 0, 1);
    const py = 56;
    const H = 104;
    // determine visible round
    const roundAt = (tt) => clamp(Math.floor((tt - 0.5) / 1.05), -1, c.rounds.length - 1);
    const ri = roundAt(t);
    ctx.save();
    ctx.globalAlpha = slide;
    // backdrop by terrain
    const back = { PLAINS: '#3878c8', FOREST: '#184818', HILLS: '#584828', BRIDGE: '#284878', CHURCH: '#383858', FLOOR: '#303040', SAND: '#705838', ROAD: '#3878c8', GATE: '#303040' }[this.bdef.terrainName] || '#283858';
    ctx.fillStyle = '#101838'; ctx.fillRect(0, py - 4, VIEW_W, H + 8);
    ctx.fillStyle = back; ctx.fillRect(0, py, VIEW_W, H - 26);
    ctx.fillStyle = '#204818'; ctx.fillRect(0, py + H - 40, VIEW_W, 14);
    ctx.fillStyle = '#f8d838'; ctx.fillRect(0, py - 4, VIEW_W, 2); ctx.fillRect(0, py + H + 2, VIEW_W, 2);

    const drawSide = (v, x, flip) => {
      const key = v.side === 'player' ? v.klass + (v.promoted ? '_p' : '') : v.spr;
      const spr = SPR[key] || SPR.gob;
      const s = v.big ? 2 : 3;
      ctx.save();
      ctx.translate(x, py + H - 40 - spr.height * s + 10);
      if (flip) { ctx.scale(-1, 1); ctx.drawImage(spr, -spr.width * s, 0, spr.width * s, spr.height * s); }
      else ctx.drawImage(spr, 0, 0, spr.width * s, spr.height * s);
      ctx.restore();
    };
    // shake on impact
    let shake = 0;
    if (ri >= 0) {
      const rt = t - 0.5 - ri * 1.05;
      if (rt > 0.2 && rt < 0.45 && !c.rounds[ri].miss) shake = Math.sin(rt * 90) * 2;
    }
    drawSide(c.d, 46 + (shake || 0), false);
    drawSide(c.a, VIEW_W - 46 - (c.a.big ? 64 : 48), true);

    // name plates + hp bars (hp shown steps down round by round)
    const plate = (v, x) => {
      drawWindow(ctx, x, py + H - 24, 130, 24);
      text(v.name, x + 6, py + H - 18, '#fff', 8);
      let pending = 0;
      c.rounds.forEach((r, idx) => { if (idx > ri && !r.miss && r.by !== v.id) pending += r.dmg; });
      const hp = Math.min(v.maxhp, v.hp + pending);
      ctx.fillStyle = '#101010'; ctx.fillRect(x + 66, py + H - 16, 58, 5);
      ctx.fillStyle = v.side === 'player' ? '#58f858' : '#f84020';
      ctx.fillRect(x + 67, py + H - 15, Math.max(0, Math.round(56 * hp / v.maxhp)), 3);
    };
    plate(c.d, 6);
    plate(c.a, VIEW_W - 136);

    // round results: damage numbers / MISS / CRITICAL
    for (let i = 0; i <= ri; i++) {
      const r = c.rounds[i];
      const isCounterOnA = r.by === c.d.id;
      const x = isCounterOnA ? VIEW_W - 100 : 100;
      const age = t - 0.5 - i * 1.05 - 0.2;
      if (age < 0 || age > 0.9) continue;
      const yy = py + 16 - age * 10;
      if (r.miss) text('MISS', x, yy, '#8890b8', 10, 'center');
      else {
        if (r.crit) text('CRITICAL!', x, yy - 10, '#f84020', 8, 'center');
        text(String(r.dmg), x, yy, '#f8f858', 14, 'center');
      }
    }
    // xp readout at the end
    if (c.xp && c.xpTo && t > 0.5 + c.rounds.length * 1.05) {
      text(`EXP +${c.xp}`, VIEW_W / 2, py + 8, '#f8d838', 10, 'center');
    }
    ctx.restore();
  }

  drawSpellBanner() {
    const ev = this.spellFx.ev;
    drawWindow(ctx, 90, 24, 140, 20);
    text(ev.name, VIEW_W / 2, 30, ev.kind === 'heal' ? '#58f858' : '#f8a020', 9, 'center');
    // flash affected tiles
    const camX = Math.round(this.cam.x), camY = Math.round(this.cam.y);
    if ((this.frame & 4) && ev.kind === 'dmg') {
      ctx.fillStyle = 'rgba(248,160,32,0.5)';
      for (const tl of ev.tiles) {
        ctx.fillRect(tl.x * TILE - camX, tl.y * TILE - camY + 20, TILE, TILE);
      }
    }
  }

  drawLevelUp() {
    const { u, up } = this.lvPanel;
    drawWindow(ctx, 60, 60, 200, 92);
    ctx.drawImage(FACES[u.face] || FACES.moore, 70, 72, 32, 32);
    text(`${u.name} LEVEL ${up.level}!`, 110, 72, '#f8d838', 10);
    const g = up.gains;
    text(`HP+${g.hp} MP+${g.mp}`, 110, 88, '#fff', 8);
    text(`ATK+${g.atk} DEF+${g.def} AGI+${g.agi}`, 110, 100, '#fff', 8);
    if (up.learned && up.learned.length) text(`LEARNED ${SPELLS[up.learned[0]].name}!`, 110, 112, '#68b8f8', 8);
    text('LEVEL UP!', 70, 132, '#f8d838', 12);
  }

  drawInspect(u) {
    drawWindow(ctx, 60, 40, 200, 130);
    const img = u.side === 'player' ? FACES[u.face] : (SPR[u.spr] || SPR.gob);
    ctx.drawImage(img, 0, 0, img.width, Math.min(img.height, img.width), 70, 52, 32, 32);
    text(u.name, 110, 52, '#f8d838', 10);
    text((u.cls || u.name.slice(0, 4)) + '  LV ' + u.level, 110, 66, '#8890b8', 8);
    text(`HP ${u.hp}/${u.maxhp}`, 110, 80, '#fff', 8);
    if (u.maxmp) text(`MP ${u.mp}/${u.maxmp}`, 180, 80, '#68b8f8', 8);
    text(`ATK ${atkOf(u)}  DEF ${u.def}  AGI ${u.agi}`, 70, 96, '#fff', 8);
    text(`MOV ${u.mov}  ${u.moveType.toUpperCase()}`, 70, 108, '#fff', 8);
    if (u.side === 'player') {
      text(WEAPONS[u.weapon].name, 70, 120, '#f8a020', 8);
      text(`EXP ${u.xp}/100`, 70, 132, '#8890b8', 8);
      if (u.spells.length) text(u.spells.map((s) => SPELLS[s].name).join(' '), 70, 144, '#68b8f8', 8);
    } else {
      const [lo, hi] = rangeOf(u);
      text(`RANGE ${lo}-${hi}`, 70, 120, '#f8a020', 8);
      text(u.awake ? 'ALERTED' : 'DORMANT', 70, 132, u.awake ? '#f84020' : '#8890b8', 8);
    }
    text('X: CLOSE', 200, 156, '#8890b8', 8);
  }

  // ---------------- non-battle drawing ----------------
  drawTitle() {
    ctx.fillStyle = '#101838'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // starfield sparkle
    for (let i = 0; i < 40; i++) {
      const x = (i * 53) % VIEW_W, y = (i * 97) % 120;
      ctx.fillStyle = (i + (this.frame >> 4)) % 5 ? '#283058' : '#8890b8';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.drawImage(this.emblem, VIEW_W / 2 - 48, 18, 96, 128);
    text('SHINING', VIEW_W / 2, 44, '#f8d838', 22, 'center');
    text('MOORE', VIEW_W / 2, 70, '#f8f8f8', 22, 'center');
    text('A MOOREGARD TACTICS TALE', VIEW_W / 2, 150, '#8890b8', 8, 'center');
    const opts = this.hasSave ? ['NEW GAME', 'CONTINUE'] : ['NEW GAME'];
    opts.forEach((o, i) => {
      text(o, VIEW_W / 2, 170 + i * 14, i === this.titleSel ? '#f8d838' : '#fff', 10, 'center');
      if (i === this.titleSel) text('▶', VIEW_W / 2 - 50, 170 + i * 14, '#f8d838', 10);
    });
    text('Z:OK  X:BACK  M:MUTE', VIEW_W / 2, 212, '#556', 8, 'center');
  }

  drawDifficulty() {
    ctx.fillStyle = '#101838'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawWindow(ctx, 60, 50, 200, 120);
    text('CHOOSE YOUR TRIAL', VIEW_W / 2, 62, '#f8d838', 10, 'center');
    DIFFICULTIES.forEach((d, i) => {
      text(d.name, VIEW_W / 2, 90 + i * 18, i === this.diffSel ? '#f8d838' : '#fff', 10, 'center');
      if (i === this.diffSel) text('▶', 90, 90 + i * 18, '#f8d838', 10);
    });
    text('ENEMY STRENGTH x' + DIFFICULTIES[this.diffSel].scale, VIEW_W / 2, 150, '#8890b8', 8, 'center');
  }

  drawScroll(lines, scroll, title) {
    ctx.fillStyle = '#04040c'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (title) text(title, VIEW_W / 2, 20, '#f8d838', 14, 'center');
    lines.forEach((l, i) => {
      const y = 40 + i * 12 - scroll;
      if (y > -10 && y < VIEW_H) text(l, VIEW_W / 2, y, '#fff', 8, 'center');
    });
  }

  drawHQ() {
    // simple HQ interior
    ctx.fillStyle = '#302840'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#484060';
    for (let y = 100; y < VIEW_H; y += 12) ctx.fillRect(0, y, VIEW_W, 1);
    ctx.fillStyle = '#181828'; ctx.fillRect(0, 0, VIEW_W, 60);
    ctx.fillStyle = '#f8d838'; ctx.fillRect(0, 60, VIEW_W, 2);
    text('HEADQUARTERS OF THE SHINING FORCE', VIEW_W / 2, 8, '#f8d838', 9, 'center');
    text('NEXT: ' + BATTLES[this.save.battleIdx].name, VIEW_W / 2, 24, '#fff', 8, 'center');
    text(`GOLD ${this.save.gold}   HERBS ${this.save.inv.herb || 0}   DROPS ${this.save.inv.potion || 0}`, VIEW_W / 2, 40, '#8890b8', 8, 'center');
    // roster row
    this.roster.forEach((u, i) => {
      const x = 20 + i * 36;
      if (FACES[u.face]) {
        ctx.globalAlpha = u.down ? 0.35 : 1;
        ctx.drawImage(FACES[u.face], x, 70, 24, 24);
        ctx.globalAlpha = 1;
      }
      text('L' + u.level, x + 12, 96, u.down ? '#f84020' : '#8890b8', 8, 'center');
    });

    if (this.sub === 'shop') { this.drawShop(); return; }
    if (this.sub === 'church') { this.drawChurch(); return; }

    const opts = this.hqOptions();
    drawWindow(ctx, 110, 112, 100, 16 + opts.length * 14);
    opts.forEach((o, i) => {
      text(o, 132, 122 + i * 14, i === this.hqSel ? '#f8d838' : '#fff', 9);
      if (i === this.hqSel) text('▶', 118, 122 + i * 14, '#f8d838', 9);
    });
  }

  drawShop() {
    const rows = this.shopList();
    drawWindow(ctx, 20, 104, 280, 116);
    text('WEAPON & ITEM SHOP', 30, 110, '#f8d838', 8);
    text(`GOLD ${this.save.gold}`, 290, 110, '#f8d838', 8, 'right');
    const top = clamp(this.shopSel - 5, 0, Math.max(0, rows.length - 6));
    rows.slice(top, top + 6).forEach((r, i) => {
      const gi = top + i;
      const label = r.kind === 'weapon' ? `${r.name} (${r.who.name})` : r.name;
      text(label, 44, 124 + i * 14, gi === this.shopSel ? '#f8d838' : '#fff', 8);
      if (r.cost) text(r.cost + 'G', 290, 124 + i * 14, gi === this.shopSel ? '#f8d838' : '#8890b8', 8, 'right');
      if (gi === this.shopSel) text('▶', 32, 124 + i * 14, '#f8d838', 8);
    });
  }

  drawChurch() {
    const rows = this.churchList();
    drawWindow(ctx, 20, 104, 280, 116);
    text('CHURCH OF MOOREGARD', 30, 110, '#f8d838', 8);
    text(`GOLD ${this.save.gold}`, 290, 110, '#f8d838', 8, 'right');
    rows.slice(0, 6).forEach((r, i) => {
      text(r.name, 44, 124 + i * 14, i === this.chSel ? '#f8d838' : '#fff', 8);
      if (r.cost) text(r.cost + 'G', 290, 124 + i * 14, '#8890b8', 8, 'right');
      if (i === this.chSel) text('▶', 32, 124 + i * 14, '#f8d838', 8);
    });
    if (rows.length === 1) text('ALL SOULS ARE WELL.', 44, 150, '#8890b8', 8);
  }

  // ---------------- main update ----------------
  update(dt) {
    const inp = this.input;
    inp.pollGamepad();
    if (inp.pressed('mute')) {
      const m = this.sound.toggleMute();
      this.showBanner(m ? 'SOUND OFF' : 'SOUND ON', 0.8);
    }

    switch (this.state) {
      case 'title': {
        this.sound.playMusic('title');
        const n = this.hasSave ? 2 : 1;
        if (inp.pressed('up') || inp.pressed('down')) { this.titleSel = (this.titleSel + 1) % n; this.sound.cursor(); }
        if (inp.pressed('confirm') || inp.pressed('start')) {
          this.sound.confirm();
          if (this.titleSel === 1 && this.hasSave) {
            try {
              this.save = JSON.parse(localStorage.getItem(SAVE_KEY));
              this.enterHQ();
            } catch { this.state = 'difficulty'; }
          } else {
            this.state = 'difficulty';
          }
        }
        break;
      }
      case 'difficulty':
        if (inp.pressed('up')) { this.diffSel = (this.diffSel + 2) % 3; this.sound.cursor(); }
        if (inp.pressed('down')) { this.diffSel = (this.diffSel + 1) % 3; this.sound.cursor(); }
        if (inp.pressed('cancel')) { this.state = 'title'; this.sound.cancel(); }
        if (inp.pressed('confirm')) {
          this.sound.confirm();
          this.save = this.freshSave(this.diffSel);
          this.state = 'opening';
          this.openScroll = -VIEW_H + 60;
        }
        break;
      case 'opening':
        this.openScroll += dt * 18;
        if (inp.pressed('confirm') || this.openScroll > OPENING.length * 12 + 60) {
          this.sound.confirm();
          this.enterHQ();
        }
        break;
      case 'scene': this.updScene(dt); break;
      case 'hq': this.updHQ(); break;
      case 'battle': this.updBattle(dt); break;
      case 'victory':
        this.vT += dt;
        if (this.vT > 1.2 && (inp.pressed('confirm') || this.vT > 4)) { this.sound.confirm(); this.afterVictory(); }
        break;
      case 'defeat':
        this.vT += dt;
        if (this.vT > 1.2 && (inp.pressed('confirm') || this.vT > 5)) {
          this.sound.confirm();
          this.enterHQ();
          this.showBanner('THE FORCE REGROUPS AT HQ', 1.8);
        }
        break;
      case 'ending': {
        const cap = ENDING.length * 12 - 90;
        this.endScroll = Math.min(this.endScroll + dt * 16, cap);
        if (this.endScroll >= cap && inp.pressed('confirm')) {
          this.sound.confirm(); this.state = 'title'; this.titleSel = 0;
        }
        break;
      }
    }

    // floaties age
    for (const f of this.floaties || []) f.t += dt;
    if (this.floaties) this.floaties = this.floaties.filter((f) => f.t < 1);
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner = null; }
    this.sound.updateMusic();
    inp.endFrame();
  }

  draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    switch (this.state) {
      case 'title': this.drawTitle(); break;
      case 'difficulty': this.drawDifficulty(); break;
      case 'opening': this.drawScroll(OPENING, this.openScroll, 'SHINING MOORE'); break;
      case 'scene':
        if (this.engine && this.engine.result == null) this.drawBattle();
        else if (this.state === 'scene') { ctx.fillStyle = '#101020'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
        this.drawScene();
        break;
      case 'hq': this.drawHQ(); break;
      case 'battle': this.drawBattle(); break;
      case 'victory':
        this.drawBattle();
        drawWindow(ctx, 80, 88, 160, 48);
        text('VICTORY!', VIEW_W / 2, 100, '#f8d838', 16, 'center');
        text(`GOLD +${this.engine.goldEarned}`, VIEW_W / 2, 120, '#fff', 8, 'center');
        break;
      case 'defeat':
        this.drawBattle();
        drawWindow(ctx, 70, 88, 180, 48);
        text('THE FORCE FALLS...', VIEW_W / 2, 100, '#f84020', 12, 'center');
        text('HALF YOUR GOLD IS LOST', VIEW_W / 2, 118, '#8890b8', 8, 'center');
        break;
      case 'ending': this.drawScroll(ENDING, this.endScroll, ''); break;
    }
    if (this.banner) {
      const w = Math.max(120, this.banner.length * 7 + 24);
      drawWindow(ctx, (VIEW_W - w) / 2, 4, w, 20);
      text(this.banner, VIEW_W / 2, 10, '#f8d838', 9, 'center');
    }
  }
}

initSprites();
const game = new Game();
window.game = game; // exposed for tests / tinkering
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.frame++;
  game.time += dt;
  game.update(dt);
  game.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
