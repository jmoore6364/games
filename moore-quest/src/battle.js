// Turn-based battles: command menus, speed order, skills, items, bosses.

import { drawSprite, drawWindow, SPR } from './sprites.js';
import { ENEMIES, SKILLS, GEAR, ITEMS, xpForLevel, PARTY_DEFS } from './world.js';

const rnd = (n) => (Math.random() * n) | 0;

export const eAtk = (c) => c.atk + (GEAR[c.weapon]?.atk || 0);
export const eDef = (c) => c.def + (GEAR[c.armor]?.def || 0);

export function knownSkills(c) {
  return PARTY_DEFS[c.id].skills.filter((s) => c.level >= s.lv).map((s) => s.id);
}

function text(ctx, str, x, y, color = '#fff', align = 'left') {
  ctx.font = '8px monospace';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const BG = {
  field: ['#58a838', '#79c04f'],
  swamp: ['#607048', '#75855c'],
  cave: ['#484048', '#5c545c'],
  ash: ['#787068', '#8a8278'],
  boss: ['#382838', '#4a3a4a'],
};

export class Battle {
  constructor(game, group, opts = {}) {
    this.game = game;
    this.opts = opts;
    this.isBoss = group.some((id) => ENEMIES[id].boss);
    this.bg = BG[opts.bg] || BG.field;
    this.foes = group.map((id, i) => {
      const def = ENEMIES[id];
      return {
        ...def, id, hp: def.hp, maxhp: def.hp,
        dead: false, flash: 0, shake: 0,
        letter: group.filter((g, j) => g === id && j < i).length,
      };
    });
    // layout foes
    const n = this.foes.length;
    this.foes.forEach((f, i) => {
      const w = f.boss ? 80 : 48;
      f.w = w;
      f.x = 128 - (n * 64) / 2 + i * 64 + (64 - w) / 2;
      f.y = f.boss ? 42 : 62;
    });
    this.state = 'intro';
    this.t = 0;
    this.msg = null;
    this.msgT = 0;
    this.msgWait = false;
    this.queue = [];      // planned party actions
    this.actions = [];    // resolved turn order
    this.actorIdx = 0;    // whose command we're picking
    this.cursor = 0;
    this.floaters = [];
    this.result = null;
    this.rewardText = [];
    game.save.seen = game.save.seen || {};
    for (const id of group) game.save.seen[id] = true;
    game.sound.encounter();
    if (this.isBoss) game.sound.bossRoar();
  }

  alive() { return this.game.party.filter((c) => c.hp > 0); }
  liveFoes() { return this.foes.filter((f) => !f.dead); }

  say(str, wait = false) {
    this.msg = str;
    this.msgT = 0;
    this.msgWait = wait;
  }

  // ---------------- update ----------------

  update() {
    const input = this.game.input;
    this.t++;
    for (const f of this.foes) {
      if (f.flash > 0) f.flash--;
      if (f.shake > 0) f.shake--;
    }
    this.floaters = this.floaters.filter((fl) => ++fl.t < 40);

    switch (this.state) {
      case 'intro':
        if (this.t > 40 || input.pressed('a')) {
          if (this.opts.intro) this.say(this.opts.intro, true);
          this.state = 'command';
          this.beginRound();
        }
        break;
      case 'command': this.updateCommand(input); break;
      case 'target': this.updateTarget(input); break;
      case 'skillmenu': this.updateSkillMenu(input); break;
      case 'itemmenu': this.updateItemMenu(input); break;
      case 'allymenu': this.updateAllyMenu(input); break;
      case 'resolve': this.updateResolve(input); break;
      case 'victory': this.updateVictory(input); break;
      case 'defeat':
        if (this.t > 90 && (input.pressed('a') || input.pressed('start'))) this.result = 'lose';
        break;
      case 'fled':
        if (this.t > 30) this.result = 'fled';
        break;
    }
  }

  beginRound() {
    this.queue = [];
    this.actorIdx = 0;
    this.cursor = 0;
    while (this.actorIdx < this.game.party.length && this.game.party[this.actorIdx].hp <= 0) this.actorIdx++;
    if (this.actorIdx >= this.game.party.length) this.startResolve();
  }

  currentActor() { return this.game.party[this.actorIdx]; }

  commandOptions() {
    const c = this.currentActor();
    const opts = ['FIGHT'];
    if (knownSkills(c).length) opts.push('SKILL');
    opts.push('ITEM', 'RUN');
    return opts;
  }

  updateCommand(input) {
    if (this.msgWait) {
      if (input.pressed('a')) this.msgWait = false;
      return;
    }
    const opts = this.commandOptions();
    if (input.pressed('up')) { this.cursor = (this.cursor + opts.length - 1) % opts.length; this.game.sound.cursor(); }
    if (input.pressed('down')) { this.cursor = (this.cursor + 1) % opts.length; this.game.sound.cursor(); }
    if (input.pressed('b') && this.actorIdx > 0) {
      // undo previous member's command
      let prev = this.actorIdx - 1;
      while (prev >= 0 && this.game.party[prev].hp <= 0) prev--;
      if (prev >= 0) {
        this.queue = this.queue.filter((q) => q.actor !== this.game.party[prev]);
        this.actorIdx = prev;
        this.cursor = 0;
        this.game.sound.cancel();
      }
      return;
    }
    if (input.pressed('a')) {
      const choice = opts[this.cursor];
      this.game.sound.confirm();
      if (choice === 'FIGHT') {
        this.pending = { actor: this.currentActor(), type: 'fight' };
        this.enterTarget();
      } else if (choice === 'SKILL') {
        this.state = 'skillmenu';
        this.subCursor = 0;
      } else if (choice === 'ITEM') {
        this.state = 'itemmenu';
        this.subCursor = 0;
      } else {
        this.pending = { actor: this.currentActor(), type: 'run' };
        this.commitAction();
      }
    }
  }

  enterTarget() {
    const live = this.liveFoes();
    if (live.length === 1) {
      this.pending.target = live[0];
      this.commitAction();
    } else {
      this.state = 'target';
      this.targetCursor = 0;
    }
  }

  updateTarget(input) {
    const live = this.liveFoes();
    if (input.pressed('left') || input.pressed('up')) { this.targetCursor = (this.targetCursor + live.length - 1) % live.length; this.game.sound.cursor(); }
    if (input.pressed('right') || input.pressed('down')) { this.targetCursor = (this.targetCursor + 1) % live.length; this.game.sound.cursor(); }
    if (input.pressed('b')) { this.state = 'command'; this.game.sound.cancel(); return; }
    if (input.pressed('a')) {
      this.pending.target = live[this.targetCursor];
      this.game.sound.confirm();
      this.commitAction();
    }
  }

  updateSkillMenu(input) {
    const c = this.currentActor();
    const skills = knownSkills(c);
    if (input.pressed('up')) { this.subCursor = (this.subCursor + skills.length - 1) % skills.length; this.game.sound.cursor(); }
    if (input.pressed('down')) { this.subCursor = (this.subCursor + 1) % skills.length; this.game.sound.cursor(); }
    if (input.pressed('b')) { this.state = 'command'; this.game.sound.cancel(); return; }
    if (input.pressed('a')) {
      const sk = SKILLS[skills[this.subCursor]];
      if (c.mp < sk.mp) { this.game.sound.deny(); return; }
      this.pending = { actor: c, type: 'skill', skill: skills[this.subCursor] };
      this.game.sound.confirm();
      if (sk.target === 'enemy') this.enterTarget();
      else if (sk.target === 'ally') { this.state = 'allymenu'; this.subCursor = 0; }
      else this.commitAction();
    }
  }

  updateItemMenu(input) {
    const items = this.usableItems();
    if (!items.length) { this.state = 'command'; this.game.sound.deny(); return; }
    if (input.pressed('up')) { this.subCursor = (this.subCursor + items.length - 1) % items.length; this.game.sound.cursor(); }
    if (input.pressed('down')) { this.subCursor = (this.subCursor + 1) % items.length; this.game.sound.cursor(); }
    if (input.pressed('b')) { this.state = 'command'; this.game.sound.cancel(); return; }
    if (input.pressed('a')) {
      const id = items[this.subCursor % items.length];
      const def = ITEMS[id];
      this.pending = { actor: this.currentActor(), type: 'item', item: id };
      this.game.sound.confirm();
      if (def.heal || def.mp || def.revive || def.cure) { this.state = 'allymenu'; this.subCursor = 0; }
      else this.commitAction();
    }
  }

  updateAllyMenu(input) {
    const party = this.game.party;
    if (input.pressed('up')) { this.subCursor = (this.subCursor + party.length - 1) % party.length; this.game.sound.cursor(); }
    if (input.pressed('down')) { this.subCursor = (this.subCursor + 1) % party.length; this.game.sound.cursor(); }
    if (input.pressed('b')) { this.state = 'command'; this.game.sound.cancel(); return; }
    if (input.pressed('a')) {
      this.pending.ally = party[this.subCursor];
      this.game.sound.confirm();
      this.commitAction();
    }
  }

  usableItems() {
    const inv = this.game.save.inv;
    return Object.keys(inv).filter((id) => inv[id] > 0 && !ITEMS[id]?.quest && ITEMS[id]);
  }

  commitAction() {
    this.queue.push(this.pending);
    this.pending = null;
    this.actorIdx++;
    while (this.actorIdx < this.game.party.length && this.game.party[this.actorIdx].hp <= 0) this.actorIdx++;
    this.cursor = 0;
    if (this.actorIdx >= this.game.party.length) this.startResolve();
    else this.state = 'command';
  }

  startResolve() {
    // enemies pick actions
    const acts = [...this.queue];
    for (const f of this.liveFoes()) {
      const times = f.double ? 2 : 1;
      for (let i = 0; i < times; i++) acts.push({ actor: f, type: 'enemy' });
    }
    acts.sort((a, b) => (b.actor.spd + rnd(4)) - (a.actor.spd + rnd(4)));
    this.actions = acts;
    this.state = 'resolve';
    this.actT = 0;
    this.say(null);
  }

  updateResolve(input) {
    if (input.pressed('a')) this.actT += 8; // hurry
    this.actT++;
    if (this.actT < 42) return;
    // check end conditions between actions
    if (!this.liveFoes().length) { this.startVictory(); return; }
    if (!this.alive().length) { this.startDefeat(); return; }
    const act = this.actions.shift();
    if (!act) {
      this.state = 'command';
      this.beginRound();
      return;
    }
    this.actT = 0;
    this.perform(act);
  }

  perform(act) {
    const g = this.game;
    const a = act.actor;
    // skip dead actors
    if ((act.type === 'enemy' && a.dead) || (act.type !== 'enemy' && a.hp <= 0)) { this.actT = 41; return; }
    // poison saps party members as they act
    if (act.type !== 'enemy' && a.psn) {
      const tick = Math.max(1, Math.ceil(a.maxhp * 0.06));
      a.hp = Math.max(0, a.hp - tick);
      this.floaters.push({ t: 0, x: 60 + this.game.party.indexOf(a) * 70, y: 168, str: `${tick}`, color: '#80d860' });
      if (a.hp <= 0) { g.sound.die(); this.say(`${a.name} SUCCUMBS TO POISON!`); return; }
    }

    if (act.type === 'fight') {
      let tgt = act.target;
      if (tgt.dead) tgt = this.liveFoes()[0];
      if (!tgt) { this.actT = 41; return; }
      const { dmg, crit } = this.physDamage(eAtk(a), tgt.def);
      this.hitFoe(tgt, dmg);
      crit ? g.sound.crit() : g.sound.hit();
      this.say(`${a.name} STRIKES ${this.foeName(tgt)}!${crit ? ' A HEAVY BLOW!' : ''}`);
    } else if (act.type === 'skill') {
      const sk = SKILLS[act.skill];
      if (a.mp < sk.mp) { this.actT = 41; return; }
      a.mp -= sk.mp;
      if (sk.kind === 'heal') {
        const heal = sk.pow + Math.floor(a.mag * 1.5) + rnd(4);
        const targets = sk.target === 'allies' ? this.alive() : [act.ally && act.ally.hp > 0 ? act.ally : a];
        for (const t of targets) t.hp = Math.min(t.maxhp, t.hp + heal);
        g.sound.heal();
        this.say(`${a.name} CASTS ${sk.name}! HP RESTORED.`);
      } else if (sk.kind === 'phys') {
        g.sound.crit();
        if (sk.target === 'enemies') {
          for (const f of this.liveFoes()) this.hitFoe(f, this.physDamage(Math.floor(eAtk(a) * sk.mult), f.def).dmg);
          this.say(`${a.name} USES ${sk.name}! THE GROUND SHAKES!`);
        } else {
          let tgt = act.target && !act.target.dead ? act.target : this.liveFoes()[0];
          if (tgt) this.hitFoe(tgt, this.physDamage(Math.floor(eAtk(a) * sk.mult), tgt.def).dmg);
          this.say(`${a.name} USES ${sk.name}!`);
        }
      } else {
        // fire / storm magic
        sk.kind === 'fire' ? g.sound.fire() : g.sound.storm();
        const base = sk.pow + a.mag * 2;
        if (sk.target === 'enemies') {
          for (const f of this.liveFoes()) this.hitFoe(f, Math.max(1, base - f.def + rnd(6) - 3));
          this.say(`${a.name} CASTS ${sk.name}!`);
        } else {
          let tgt = act.target && !act.target.dead ? act.target : this.liveFoes()[0];
          if (tgt) this.hitFoe(tgt, Math.max(1, base - tgt.def + rnd(6) - 3));
          this.say(`${a.name} CASTS ${sk.name}!`);
        }
      }
    } else if (act.type === 'item') {
      const inv = g.save.inv;
      if (!inv[act.item]) { this.actT = 41; return; }
      const def = ITEMS[act.item];
      const tgt = act.ally || a;
      if (def.flee) {
        inv[act.item]--;
        if (this.isBoss) { this.say('THE SMOKE CANNOT HIDE YOU HERE!'); g.sound.deny(); return; }
        g.sound.flee();
        this.say(`${a.name} THROWS A SMOKE BOMB!`);
        this.state = 'fled';
        this.t = 0;
        return;
      }
      if (def.revive) {
        if (tgt.hp > 0) { this.say('THEY ARE STILL STANDING.'); return; }
        inv[act.item]--;
        tgt.hp = Math.floor(tgt.maxhp / 2);
        g.sound.heal();
        this.say(`${tgt.name} IS BACK ON THEIR FEET!`);
        return;
      }
      if (def.cure) {
        if (!tgt.psn) { this.say('THEY ARE NOT POISONED.'); return; }
        inv[act.item]--;
        tgt.psn = false;
        g.sound.heal();
        this.say(`THE VENOM LEAVES ${tgt.name}.`);
        return;
      }
      if (tgt.hp <= 0) { this.say('IT CANNOT HELP THE FALLEN.'); return; }
      inv[act.item]--;
      if (def.heal) { tgt.hp = Math.min(tgt.maxhp, tgt.hp + def.heal); g.sound.heal(); }
      if (def.mp) { tgt.mp = Math.min(tgt.maxmp, tgt.mp + def.mp); g.sound.heal(); }
      this.say(`${a.name} USES A ${def.name}!`);
    } else if (act.type === 'run') {
      if (this.isBoss) { this.say('THERE IS NO ESCAPE!'); g.sound.deny(); return; }
      const chance = 0.55 + (a.spd - Math.max(...this.liveFoes().map((f) => f.spd))) * 0.03;
      if (Math.random() < chance) {
        g.sound.flee();
        this.say(`${a.name} LEADS THE ESCAPE!`);
        this.state = 'fled';
        this.t = 0;
      } else {
        this.say('COULD NOT ESCAPE!');
      }
    } else if (act.type === 'enemy') {
      const targets = this.alive();
      if (!targets.length) return;
      const tgt = targets[rnd(targets.length)];
      if (a.cast && Math.random() < a.cast.chance) {
        g.sound.fire();
        const dmg = Math.max(1, a.cast.pow + a.atk - eDef(tgt) + rnd(6) - 3);
        this.hitHero(tgt, dmg);
        this.say(`${this.foeName(a)} BREATHES DARK FIRE AT ${tgt.name}!`);
      } else {
        const { dmg, crit } = this.physDamage(a.atk, eDef(tgt));
        this.hitHero(tgt, dmg);
        crit ? g.sound.crit() : g.sound.hurt();
        let msg = `${this.foeName(a)} ATTACKS ${tgt.name}!`;
        if (a.poison && tgt.hp > 0 && !tgt.psn && Math.random() < a.poison) {
          tgt.psn = true;
          msg = `${tgt.name} IS POISONED!`;
        }
        this.say(msg);
      }
    }
  }

  physDamage(atk, def) {
    let dmg = Math.max(1, atk * 2 - def);
    dmg = Math.max(1, Math.floor(dmg * (0.85 + Math.random() * 0.3)));
    const crit = Math.random() < 0.08;
    if (crit) dmg = Math.floor(dmg * 1.75);
    return { dmg, crit };
  }

  hitFoe(f, dmg) {
    f.hp -= dmg;
    f.flash = 14;
    f.shake = 14;
    this.floaters.push({ t: 0, x: f.x + f.w / 2, y: f.y, str: `${dmg}`, color: '#fff' });
    if (f.hp <= 0) {
      f.dead = true;
      this.game.sound.die();
    }
  }

  hitHero(c, dmg) {
    c.hp = Math.max(0, c.hp - dmg);
    this.shakeParty = 10;
    this.floaters.push({ t: 0, x: 60 + this.game.party.indexOf(c) * 70, y: 168, str: `${dmg}`, color: '#f88' });
    if (c.hp <= 0) this.game.sound.die();
  }

  foeName(f) {
    const twins = this.foes.filter((x) => x.id === f.id).length > 1;
    return twins ? `${f.name} ${String.fromCharCode(65 + f.letter)}` : f.name;
  }

  // ---------------- outcomes ----------------

  startVictory() {
    const g = this.game;
    this.state = 'victory';
    this.t = 0;
    g.sound.victory();
    const xp = this.foes.reduce((s, f) => s + f.xp, 0);
    const gold = this.foes.reduce((s, f) => s + f.gold, 0);
    g.save.gold = Math.min(99999, g.save.gold + gold);
    this.rewardText = [`VICTORY!  ${xp} XP - ${gold} GOLD`];
    for (const c of this.alive()) {
      c.xp += xp;
      let leveled = false;
      while (c.xp >= xpForLevel(c.level + 1)) {
        c.level++;
        leveled = true;
        const gr = PARTY_DEFS[c.id].growth;
        c.maxhp += gr.hp; c.maxmp += gr.mp;
        c.atk += gr.atk; c.def += gr.def; c.spd += gr.spd; c.mag += gr.mag;
        c.hp = Math.min(c.maxhp, c.hp + gr.hp);
        c.mp = Math.min(c.maxmp, c.mp + gr.mp);
        for (const s of PARTY_DEFS[c.id].skills) {
          if (s.lv === c.level) this.rewardText.push(`${c.name} LEARNS ${SKILLS[s.id].name}!`);
        }
      }
      if (leveled) {
        this.rewardText.push(`${c.name} REACHED LEVEL ${c.level}!`);
        g.sound.levelUp();
      }
    }
    this.rewardIdx = 0;
  }

  updateVictory(input) {
    if (this.t > 20 && (input.pressed('a') || input.pressed('start'))) {
      this.rewardIdx++;
      if (this.rewardIdx >= this.rewardText.length) this.result = 'win';
      else this.game.sound.confirm();
    }
  }

  startDefeat() {
    this.state = 'defeat';
    this.t = 0;
    this.game.sound.stopMusic();
    this.game.sound.gameOver();
  }

  // ---------------- draw ----------------

  draw(ctx) {
    // backdrop
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 240);
    ctx.fillStyle = this.bg[1];
    ctx.fillRect(8, 8, 240, 128);
    ctx.fillStyle = this.bg[0];
    ctx.fillRect(8, 96, 240, 40);
    ctx.strokeStyle = '#f8f8f8';
    ctx.strokeRect(8.5, 8.5, 239, 127);

    // foes
    for (const f of this.foes) {
      if (f.dead) continue;
      if (f.flash > 0 && (this.t & 2)) continue;
      const sx = f.shake > 0 ? (this.t & 2 ? 2 : -2) : 0;
      drawSprite(ctx, f.sprite, f.x + sx, f.y, false, f.boss ? 2.5 : 2);
    }
    // intro flash
    if (this.state === 'intro' && this.t < 14 && (this.t & 2)) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(8, 8, 240, 128);
    }

    // target cursor
    if (this.state === 'target') {
      const f = this.liveFoes()[this.targetCursor];
      if (f) {
        drawSprite(ctx, 'cursor', f.x + f.w / 2 - 4, f.y - 12);
        this.drawMsgText(this.foeName(f));
      }
    }

    // floaters
    for (const fl of this.floaters) {
      text(ctx, fl.str, fl.x, fl.y - fl.t / 2, fl.color, 'center');
    }

    // message window (queued; rendered by drawParty below)
    if (this.msg && this.state !== 'target') this.drawMsgText(this.msg);

    // party status
    this.drawParty(ctx);

    // menus
    if (this.state === 'command' && !this.msgWait) this.drawCommand(ctx);
    if (this.state === 'skillmenu') this.drawSubMenu(ctx, knownSkills(this.currentActor()).map((id) => {
      const sk = SKILLS[id];
      return `${sk.name.padEnd(9)}${sk.mp}MP`;
    }));
    if (this.state === 'itemmenu') this.drawSubMenu(ctx, this.usableItems().map((id) => `${ITEMS[id].name.padEnd(10)}x${this.game.save.inv[id]}`));
    if (this.state === 'allymenu') this.drawSubMenu(ctx, this.game.party.map((c) => `${c.name.padEnd(7)}${c.hp}HP`));

    if (this.state === 'victory') {
      drawWindow(ctx, 24, 60, 208, 40);
      text(ctx, this.rewardText[Math.min(this.rewardIdx, this.rewardText.length - 1)], 128, 76, '#fff', 'center');
    }
    if (this.state === 'defeat' && this.t > 30) {
      text(ctx, 'THE PARTY HAS FALLEN...', 128, 60, '#f84020', 'center');
    }
  }

  drawMsgText(str) {
    this._pendingMsg = str; // rendered by drawParty
  }

  drawParty(ctx) {
    drawWindow(ctx, 0, 176, 256, 64);
    const sh = this.shakeParty > 0 ? ((this.shakeParty-- & 2) ? 1 : -1) : 0;
    this.game.party.forEach((c, i) => {
      const x = 14 + i * 82 + sh;
      const active = this.state === 'command' && this.currentActor() === c && !this.msgWait;
      const targeting = this.state === 'allymenu' && (this.subCursor % this.game.party.length) === i;
      text(ctx, c.name, x, 184, c.hp <= 0 ? '#886' : active || targeting ? '#f8d838' : c.psn ? '#80d860' : '#fff');
      if (c.psn && c.hp > 0) text(ctx, 'PSN', x + 50, 184, '#80d860');
      text(ctx, `HP${String(c.hp).padStart(4)}`, x, 196, c.hp <= 0 ? '#f84020' : c.hp < c.maxhp / 4 ? '#f8a800' : '#fff');
      text(ctx, `MP${String(c.mp).padStart(4)}`, x, 208, '#8890c8');
      text(ctx, `LV${String(c.level).padStart(3)}`, x, 220, '#667');
    });
    // pending message on top of the arena
    if (this._pendingMsg) {
      drawWindow(ctx, 0, 138, 256, 22);
      text(ctx, this._pendingMsg.slice(0, 30), 128, 145, '#fff', 'center');
      this._pendingMsg = null;
    }
  }

  drawCommand(ctx) {
    const opts = this.commandOptions();
    drawWindow(ctx, 0, 100, 74, 12 + opts.length * 11);
    opts.forEach((o, i) => {
      text(ctx, o, 20, 108 + i * 11, i === this.cursor ? '#f8d838' : '#fff');
      if (i === this.cursor) drawSprite(ctx, 'cursor', 8, 108 + i * 11);
    });
  }

  drawSubMenu(ctx, lines) {
    if (!lines.length) return;
    drawWindow(ctx, 60, 100, 136, 12 + lines.length * 11);
    lines.forEach((l, i) => {
      const sel = i === (this.subCursor % lines.length);
      text(ctx, l, 84, 108 + i * 11, sel ? '#f8d838' : '#fff');
      if (sel) drawSprite(ctx, 'cursor', 70, 108 + i * 11);
    });
  }
}
