// Entities: the two fighters, the enemy roster, weapons, items, breakables
// and projectiles. Coordinates: x = world x, y = ground depth (y-sorted),
// z = height above ground. Feet sit at (x, y - z) on screen.

import {
  drawFighter, drawHeldWeapon, drawItem, drawBreakable, drawBike,
  drawShadow, drawSlash, drawSpark, drawRing, drawFlame, drawKnifeProj, drawBullet,
} from './sprites.js';
import { GROUND_TOP, GROUND_BOT, VIEW_W } from './levels.js';

export const DEPTH_TOL = 11;
export const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inDepth = (a, b, tol = DEPTH_TOL) => Math.abs(a.y - b.y) <= tol;

let nextId = 1;

// ======================= CHARACTERS =======================
// X,X,X,X = jab, jab, hook, finisher. Hold FORWARD on the finisher for a
// launcher (juggle), hold DOWN on hit 3 for a sweep.

export const CHARS = {
  axel: {
    key: 'axel', actor: 'ax', name: 'MOORE HAMMER', mirror: 'axd',
    hpMax: 56, spd: 1.5, spdY: 1.05, reach: 26, jumpV: 4.4,
    combo: [
      { su: 4, act: 4, rec: 6, dmg: 3, kb: 1.0, pose: 'jab' },
      { su: 4, act: 4, rec: 7, dmg: 3, kb: 1.2, pose: 'jab2' },
      { su: 5, act: 4, rec: 9, dmg: 4, kb: 1.6, pose: 'hook', heavy: true },
      { su: 5, act: 5, rec: 13, dmg: 6, kb: 3.0, pose: 'upper', down: true, heavy: true },
    ],
    grabDmg: 3, throwDmg: 10, blitz: 'upper', blitzName: 'MOORE UPPER',
    airDmg: 5, backDmg: 4, specDmg: 8,
  },
  blaze: {
    key: 'blaze', actor: 'bl', name: 'LUNA MOORE', mirror: 'bld',
    hpMax: 46, spd: 1.85, spdY: 1.25, reach: 22, jumpV: 4.7,
    combo: [
      { su: 3, act: 3, rec: 5, dmg: 2, kb: 0.9, pose: 'jab' },
      { su: 3, act: 3, rec: 6, dmg: 3, kb: 1.0, pose: 'jab2' },
      { su: 4, act: 4, rec: 8, dmg: 3, kb: 1.4, pose: 'kick', heavy: true },
      { su: 4, act: 5, rec: 11, dmg: 5, kb: 2.6, pose: 'kick', down: true, heavy: true },
    ],
    grabDmg: 2, throwDmg: 8, blitz: 'flykick', blitzName: 'LUNA KICK',
    airDmg: 5, backDmg: 3, specDmg: 7,
  },
};

export const WEAPONS = {
  pipe: { dmg: 6, dur: 8, down: true, reach: 30, heavy: true },
  knife: { dmg: 5, dur: 6, down: false, reach: 24, throwable: true },
  katana: { dmg: 8, dur: 10, down: true, reach: 36, heavy: true },
};

const GRABBABLE = ['seek', 'wind', 'hurt', 'block'];
const COMBO_LINK = 20; // frames after a hit ends in which X continues the chain

// ======================= PLAYER =======================

export class Player {
  constructor(idx, charKey, x, y) {
    this.id = nextId++;
    this.t = 'hero';
    this.idx = idx;
    this.charKey = charKey;
    this.cd = CHARS[charKey];
    this.x = x; this.y = y; this.z = 0; this.vz = 0; this.vx = 0;
    this.face = 1;
    this.hpMax = this.cd.hpMax; this.hp = this.hpMax;
    this.state = 'idle'; this.st = 0;
    this.combo = 0; this.queued = false; this.comboLink = 0;
    this.invuln = 0;
    this.weapon = null;       // { t, dur }
    this.grab = null;         // enemy held by us
    this.backGrab = false;
    this.grabT = 0; this.grabHits = 0;
    this.grabbedBy = null;    // enemy holding us
    this.tapDir = 0; this.tapT = 99;
    this.lastJumpF = -99; this.lastAtkF = -99;
    this.strikeId = 1;
    this.jatkPose = 'jkick';
    this.specHit = false;
  }

  tag() { return this.idx + ':' + this.strikeId; }
  grounded() { return this.z <= 0 && this.vz === 0; }
  fwdHeld(pad) { return pad.down(this.face > 0 ? 'right' : 'left'); }
  backHeld(pad) { return pad.down(this.face > 0 ? 'left' : 'right'); }

  update(game, pad) {
    this.st++;
    if (this.invuln > 0) this.invuln--;
    if (this.tapT < 99) this.tapT++;
    if (this.comboLink > 0) this.comboLink--; else if (this.state !== 'attack') this.combo = 0;

    // vertical physics
    if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz;
      this.vz -= 0.3;
      if (this.z <= 0) {
        this.z = 0; this.vz = 0;
        if (this.state === 'jump' || this.state === 'jatk') { this.state = 'idle'; game.sound.land(); }
        else if (this.state === 'blitz' && this.cd.blitz === 'flykick') { this.state = 'idle'; }
        else if (this.state === 'down' || this.state === 'dying') game.sound.thud();
      }
    }

    // knockback drift
    if (this.vx !== 0 && ['hurt', 'down', 'dying'].includes(this.state)) {
      this.x += this.vx;
      this.vx *= 0.88;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    switch (this.state) {
      case 'idle': case 'walk': this.updateFree(game, pad); break;
      case 'run': this.updateRun(game, pad); break;
      case 'jump': this.updateAir(game, pad); break;
      case 'jatk': this.updateJatk(game, pad); break;
      case 'attack': this.updateAttack(game, pad); break;
      case 'blitz': this.updateBlitz(game, pad); break;
      case 'back':
        if (this.st >= 3 && this.st <= 8) this.strike(game, { dmg: this.cd.backDmg, kb: 2, down: true, reach: 22, behind: true });
        if (this.st > 13) this.state = 'idle';
        break;
      case 'special': this.updateSpecial(game, pad); break;
      case 'grab': this.updateGrab(game, pad); break;
      case 'grabatk':
        if (this.st === 3) this.grabStrike(game);
        if (this.st > 10) this.state = this.grab ? 'grab' : 'idle';
        break;
      case 'vault':
        if (this.st === 4 && this.grab) {
          this.x = this.grab.x + this.face * 13;
          this.face = -this.face;
          this.backGrab = true;
          this.grabT = 0;
          game.sound.jump();
        }
        if (this.st > 9) this.state = this.grab ? 'grab' : 'idle';
        break;
      case 'throw':
        if (this.st === 5 && this.grab) this.releaseThrow(game, 'slam');
        if (this.st > 16) this.state = 'idle';
        break;
      case 'suplex':
        if (this.st === 6 && this.grab) this.releaseThrow(game, 'suplex');
        if (this.st > 20) this.state = 'idle';
        break;
      case 'pickup':
        if (this.st > 11) this.state = 'idle';
        break;
      case 'grabbed': this.updateGrabbed(game, pad); break;
      case 'hurt':
        if (this.st > 15) { this.state = 'idle'; this.invuln = 20; }
        break;
      case 'down':
        if (this.grounded() && this.st > 44) { this.state = 'getup'; this.st = 0; }
        break;
      case 'getup':
        if (this.st > 15) { this.state = 'idle'; this.invuln = 45; } // wake-up invulnerability
        break;
      case 'dying': break; // main watches st
    }
    game.clampPlayer(this);
  }

  moveInput(game, pad, sx, sy) {
    const dx = (pad.down('right') ? 1 : 0) - (pad.down('left') ? 1 : 0);
    const dy = (pad.down('down') ? 1 : 0) - (pad.down('up') ? 1 : 0);
    this.x += dx * sx;
    this.y = clamp(this.y + dy * sy, GROUND_TOP + 4, GROUND_BOT);
    if (dx !== 0) this.face = dx;
    return dx !== 0 || dy !== 0;
  }

  // X+Z within a few frames of each other = defensive special
  specialInput(game, pad) {
    if (pad.pressed('special')) return true;
    if (pad.pressed('attack') && (pad.down('jump') || game.frame - this.lastJumpF <= 4)) return true;
    if (pad.pressed('jump') && (pad.down('attack') || game.frame - this.lastAtkF <= 4)) return true;
    return false;
  }

  updateFree(game, pad) {
    const moving = this.moveInput(game, pad, this.cd.spd, this.cd.spdY);
    this.state = moving ? 'walk' : 'idle';

    // walk into an enemy to auto-grab
    if (moving && this.grounded() && !this.weapon) {
      for (const e of game.enemies) {
        if (e.gone || e.dead || e.kind?.grab === false || !GRABBABLE.includes(e.state)) continue;
        if (e.z > 0) continue;
        if (Math.abs(e.x - this.x) < 15 && Math.abs(e.y - this.y) < 9) {
          const toward = (e.x - this.x) * ((pad.down('right') ? 1 : 0) - (pad.down('left') ? 1 : 0));
          if (toward < 0) continue;
          this.startGrab(game, e);
          return;
        }
      }
    }

    // double-tap left/right = run
    for (const d of [-1, 1]) {
      const a = d < 0 ? 'left' : 'right';
      if (pad.pressed(a)) {
        if (this.tapDir === d && this.tapT < 15) {
          this.state = 'run'; this.st = 0; this.face = d;
          game.sound.run();
        }
        this.tapDir = d; this.tapT = 0;
      }
    }
    if (this.state === 'run') return;

    if (this.specialInput(game, pad)) { this.startSpecial(game); return; }

    if (pad.pressed('back')) { this.state = 'back'; this.st = 0; this.strikeId++; game.sound.whoosh(); return; }

    if (pad.pressed('jump')) {
      this.lastJumpF = game.frame;
      this.vz = this.cd.jumpV; this.z = 0.1; this.state = 'jump'; this.st = 0;
      game.sound.jump();
      return;
    }

    if (pad.pressed('attack')) {
      this.lastAtkF = game.frame;
      // item under our feet? pick it up
      const it = this.itemNear(game);
      if (it) { this.doPickup(game, it); return; }
      if (this.weapon) { this.startWeaponAttack(game, pad); return; }
      const idx = this.comboLink > 0 && this.combo > 0 && this.combo < 4 ? this.combo : 0;
      this.startAttack(game, idx);
    }
  }

  updateRun(game, pad) {
    const a = this.face < 0 ? 'left' : 'right';
    this.x += this.face * 2.5;
    const dy = (pad.down('down') ? 1 : 0) - (pad.down('up') ? 1 : 0);
    this.y = clamp(this.y + dy * 0.9, GROUND_TOP + 4, GROUND_BOT);
    if (pad.pressed('attack')) {
      this.lastAtkF = game.frame;
      this.startBlitz(game);
      return;
    }
    if (pad.pressed('jump')) {
      this.lastJumpF = game.frame;
      this.vz = this.cd.jumpV; this.z = 0.1; this.state = 'jump'; this.st = 0;
      this.runJump = true;
      game.sound.jump();
      return;
    }
    if (!pad.down(a) || this.st > 90) { this.state = 'idle'; this.runJump = false; }
  }

  // ---- the four-hit chain ----
  startAttack(game, comboIdx) {
    this.state = 'attack'; this.st = 0;
    this.combo = comboIdx; this.queued = false;
    this.strikeId++;
    this.curAtk = { ...this.cd.combo[comboIdx] };
    // hold-direction variants
    if (comboIdx === 2 && game.input.pad(this.idx).down('down')) {
      this.curAtk = { su: 5, act: 5, rec: 10, dmg: 4, kb: 2, pose: 'kick', down: true, sweep: true };
    } else if (comboIdx === 3 && this.fwdHeld(game.input.pad(this.idx))) {
      this.curAtk = { ...this.curAtk, launch: 4.4, kb: 1.2, pose: 'upper' };
    }
    game.sound.whoosh();
  }

  updateAttack(game, pad) {
    const c = this.curAtk;
    if (pad.pressed('attack') && this.st > 1) { this.queued = true; this.lastAtkF = game.frame; }
    if (pad.pressed('jump') && this.st <= 4) { this.startSpecial(game); return; }
    if (this.st >= c.su && this.st < c.su + c.act) {
      const hit = this.strike(game, {
        dmg: c.dmg, kb: c.kb, down: !!c.down, launch: c.launch, reach: c.wreach || this.cd.reach,
        heavy: c.heavy, weapon: c.weaponT,
      });
      if (hit && c.weaponT) this.wearWeapon(game, hit);
      this.x += this.face * 0.4;
    }
    if (this.st >= c.su + c.act + c.rec) {
      const last = c.weaponT ? this.combo >= 1 : this.combo >= 3;
      if (this.queued && !last && !c.sweep) {
        if (c.weaponT) {
          if (this.weapon) this.startWeaponAttack(game, pad, this.combo + 1);
          else this.state = 'idle';
        } else {
          this.startAttack(game, this.combo + 1);
        }
      } else {
        this.state = 'idle';
        this.comboLink = c.sweep || last ? 0 : COMBO_LINK;
        this.combo = c.sweep || last ? 0 : this.combo + 1;
      }
    }
  }

  // ---- weapons ----
  startWeaponAttack(game, pad, chainIdx = 0) {
    const w = WEAPONS[this.weapon.t];
    if (w.throwable && (pad.down('left') || pad.down('right'))) {
      // direction+X while holding the knife = throw it
      if (pad.down('left')) this.face = -1;
      if (pad.down('right')) this.face = 1;
      game.projectiles.push({
        t: 'knife', x: this.x + this.face * 10, y: this.y, z: 14, vx: this.face * 4.6,
        by: this, dmg: 6,
      });
      this.weapon = null;
      this.state = 'attack'; this.st = 0; this.combo = 0;
      this.curAtk = { su: 2, act: 1, rec: 8, dmg: 0, kb: 0, pose: 'stab', weaponT: null, noStrike: true };
      game.sound.knifeThrow();
      return;
    }
    this.state = 'attack'; this.st = 0; this.combo = chainIdx; this.queued = false;
    this.strikeId++;
    this.curAtk = {
      su: this.weapon.t === 'knife' ? 3 : 5, act: 4, rec: this.weapon.t === 'katana' ? 12 : 9,
      dmg: w.dmg, kb: chainIdx ? 2.6 : 1.6, down: w.down || chainIdx >= 1,
      pose: this.weapon.t === 'knife' ? 'stab' : 'swing', wreach: w.reach, heavy: w.heavy, weaponT: this.weapon.t,
    };
    game.sound.whoosh();
  }

  wearWeapon(game, hits) {
    if (!this.weapon) return;
    this.weapon.dur -= hits;
    game.sound.clang();
    if (this.weapon.dur <= 0) {
      this.weapon = null;
      game.addSpark(this.x + this.face * 12, this.y - 16, '#c8d0e0');
    }
  }

  itemNear(game) {
    for (const it of game.items) {
      if (it.gone || it.z > 3) continue;
      if (it.t === 'money' || it.t === 'moneybag' || it.t === 'deskwreck') continue;
      if (Math.abs(it.x - this.x) < 11 && Math.abs(it.y - this.y) < 9) return it;
    }
    return null;
  }

  doPickup(game, it) {
    this.state = 'pickup'; this.st = 0;
    it.gone = true;
    if (it.t === 'apple') {
      this.hp = Math.min(this.hpMax, this.hp + 12);
      game.addScore(this, 100); game.sound.food();
    } else if (it.t === 'chicken') {
      this.hp = this.hpMax;
      game.addScore(this, 300); game.sound.food();
    } else {
      if (this.weapon) game.dropItem(this.weapon.t, this.x - this.face * 8, this.y, 2);
      this.weapon = { t: it.t, dur: WEAPONS[it.t].dur };
      game.sound.pickup();
    }
  }

  // ---- blitz ----
  startBlitz(game) {
    this.state = 'blitz'; this.st = 0; this.strikeId++;
    game.sound.blitz();
    if (this.cd.blitz === 'flykick') {
      this.vz = 3.4; this.z = 0.1;
    }
  }

  updateBlitz(game, pad) {
    if (this.cd.blitz === 'upper') {
      if (this.st < 10) this.x += this.face * 2.7;
      if (this.st >= 2 && this.st <= 12) {
        this.strike(game, { dmg: 7, kb: 1.4, down: true, launch: 4.6, reach: 26, heavy: true });
      }
      if (this.st > 20) this.state = 'idle';
    } else {
      // flying kick: airborne, travels until landing
      this.x += this.face * 3.0;
      if (this.z > 1) this.strike(game, { dmg: 6, kb: 2.6, down: true, reach: 24, heavy: true });
      if (this.st > 60) this.state = 'idle';
    }
  }

  // ---- defensive special: invincible crowd-clear, costs health if it hits ----
  startSpecial(game) {
    this.state = 'special'; this.st = 0; this.strikeId++;
    this.invuln = Math.max(this.invuln, 30);
    this.specHit = false;
    // being grabbed? break out
    if (this.grabbedBy) {
      const e = this.grabbedBy;
      e.grabP = null; this.grabbedBy = null;
      if (e.state === 'egrab') { e.state = 'hurt'; e.st = 0; }
    }
    game.sound.special();
  }

  updateSpecial(game, pad) {
    this.invuln = Math.max(this.invuln, 2);
    if (this.st >= 3 && this.st <= 14) {
      const hit = this.strike(game, { dmg: this.cd.specDmg, kb: 2.6, down: true, radius: 32, heavy: true });
      if (hit && !this.specHit) {
        this.specHit = true;
        this.hp = Math.max(1, this.hp - 2); // the SoR2 rule: it hits, you pay
      }
    }
    if (this.st > 24) this.state = 'idle';
  }

  // ---- grabs ----
  startGrab(game, e) {
    this.state = 'grab'; this.st = 0;
    this.grab = e; this.grabT = 0; this.grabHits = 0; this.backGrab = false;
    this.face = e.x >= this.x ? 1 : -1;
    e.state = 'grabbed'; e.st = 0; e.grabber = this; e.vx = 0; e.vz = 0; e.z = 0;
    game.sound.grab();
  }

  updateGrab(game, pad) {
    const e = this.grab;
    if (!e || e.gone || e.dead || e.state !== 'grabbed') { this.grab = null; this.state = 'idle'; return; }
    // hold the enemy in front
    e.x = this.x + this.face * 13;
    e.y = this.y;
    e.face = this.backGrab ? this.face : -this.face;
    this.grabT++;
    if (this.grabT > (this.backGrab ? 190 : 130)) {
      // they wrestle free
      this.releaseGrab(game);
      this.state = 'hurt'; this.st = 6; this.vx = -this.face * 1.4;
      return;
    }
    if (this.specialInput(game, pad)) { this.releaseGrab(game); this.startSpecial(game); return; }
    if (pad.pressed('attack')) {
      this.lastAtkF = game.frame;
      if (this.backGrab || this.backHeld(pad)) { this.state = 'suplex'; this.st = 0; }
      else if (this.fwdHeld(pad)) { this.state = 'throw'; this.st = 0; }
      else { this.state = 'grabatk'; this.st = 0; this.strikeId++; }
      return;
    }
    if (pad.pressed('jump') && !this.backGrab) {
      this.lastJumpF = game.frame;
      this.state = 'vault'; this.st = 0;
    }
  }

  grabStrike(game) {
    const e = this.grab;
    if (!e) return;
    this.grabHits++;
    game.hitstop = 3;
    game.addSpark(e.x - this.face * 2, e.y - 18);
    game.sound.punchMid();
    e.hp -= this.cd.grabDmg;
    game.addScore(this, 100);
    if (e.hp <= 0 || this.grabHits >= 3) {
      // final knee sends them down
      this.releaseGrab(game);
      damageEnemy(game, e, this.cd.grabDmg, this.x, { down: true, kb: 2.2, by: this, force: true });
    }
  }

  releaseGrab(game) {
    const e = this.grab;
    if (e && e.state === 'grabbed') { e.state = 'seek'; e.st = 0; e.cool = 30; e.grabber = null; }
    if (e) e.grabber = null;
    this.grab = null; this.backGrab = false;
  }

  releaseThrow(game, kind) {
    const e = this.grab;
    this.grab = null; this.backGrab = false;
    if (!e) return;
    e.grabber = null;
    const dir = kind === 'suplex' ? -this.face : this.face;
    const scale = Math.pow(0.72, e.throwsTaken || 0); // throw damage scaling
    e.throwsTaken = (e.throwsTaken || 0) + 1;
    const dmg = Math.max(2, Math.round(this.cd.throwDmg * (kind === 'suplex' ? 1.3 : 1) * scale));
    e.hp -= dmg;
    if (e.hp <= 0) { e.hp = 0; e.dead = true; game.addScore(this, e.kind.score * (1 + (e.v || 0))); game.sound.edie(); if (e.kind.boss) game.onBossDown(e); }
    e.state = 'thrown'; e.st = 0;
    e.z = kind === 'suplex' ? 14 : 10;
    e.vz = kind === 'suplex' ? 3.6 : 2.6;
    e.vx = dir * (kind === 'suplex' ? 3.4 : 5.0);
    e.thrownTag = 'thr' + this.id + ':' + (this.strikeId++);
    game.pstats[this.idx].throws++;
    game.addScore(this, 150);
    game.hitstop = 4;
    if (kind === 'suplex') this.invuln = Math.max(this.invuln, 12);
    game.sound.throwSlam();
  }

  // ---- air ----
  updateAir(game, pad) {
    if (this.runJump) this.x += this.face * 1.6;
    this.moveInput(game, pad, 1.2, 0.7);
    if (this.specialInput(game, pad)) { /* no air special */ }
    if (pad.pressed('attack')) {
      this.lastAtkF = game.frame;
      this.state = 'jatk'; this.st = 0; this.strikeId++;
      this.jatkPose = (pad.down('left') || pad.down('right')) ? 'jkick' : 'jpunch';
      game.sound.whoosh();
    }
  }

  updateJatk(game, pad) {
    const dir = this.jatkPose === 'jkick';
    if (dir) this.x += this.face * 1.5;
    if (this.st >= 2 && this.z > 1) {
      this.strike(game, {
        dmg: this.cd.airDmg, kb: dir ? 2.4 : 1.4, down: dir, reach: dir ? 26 : 20, heavy: dir,
      });
    }
  }

  // apply a melee strike against enemies + breakables in reach; returns hits
  strike(game, o) {
    if (this.curAtk?.noStrike && this.state === 'attack') return 0;
    const dir = o.behind ? -this.face : this.face;
    const tag = this.tag();
    let hits = 0;
    for (const e of game.enemies) {
      if (e.gone || e._hit === tag) continue;
      if (!inDepth(this, e, o.radius ? 14 : DEPTH_TOL)) continue;
      if (o.radius) {
        if (Math.abs(e.x - this.x) > o.radius) continue;
      } else {
        const dxp = (e.x - this.x) * dir;
        if (dxp < -6 || dxp > o.reach + 8) continue;
      }
      if (Math.abs(e.z - this.z) > 26) continue;
      e._hit = tag;
      const before = e.state;
      const landed = damageEnemy(game, e, o.dmg, this.x, {
        down: o.down, kb: o.kb, launch: o.launch, heavy: o.heavy, by: this,
      });
      if (landed) hits++;
      else if (before === e.state) e._hit = null; // shrugged (invuln floor) — allow later swings
    }
    // breakables
    for (const b of game.breakables) {
      if (b.gone || b._hit === tag) continue;
      if (Math.abs(b.y - this.y) > 13) continue;
      const dxp = (b.x - this.x) * dir;
      const within = o.radius ? Math.abs(b.x - this.x) <= o.radius : (dxp > -6 && dxp < (o.reach || 24) + 10);
      if (!within) continue;
      b._hit = tag;
      hitBreakable(game, b, this);
      hits++;
    }
    return hits;
  }

  // ---- being grabbed by a thrower ----
  updateGrabbed(game, pad) {
    const e = this.grabbedBy;
    if (!e || e.gone || e.dead || e.state !== 'egrab') {
      this.grabbedBy = null; this.state = 'idle'; this.invuln = 20;
      return;
    }
    this.x = e.x + e.face * 13;
    this.y = e.y;
    this.face = -e.face;
    // grab-tech: mash jump early to break free
    if (pad.pressed('jump') && e.st < 30) {
      e.grabP = null; this.grabbedBy = null;
      e.state = 'hurt'; e.st = 0;
      this.state = 'idle'; this.invuln = 26;
      this.x -= e.face * 6;
      game.sound.tech();
      return;
    }
    if (this.specialInput(game, pad)) { this.startSpecial(game); return; }
  }

  damage(game, dmg, fromX, down = false) {
    if (this.invuln > 0) return false;
    if (['hurt', 'down', 'getup', 'dying', 'special', 'grabbed'].includes(this.state)) return false;
    if (this.grab) this.releaseGrab(game);
    this.hp -= dmg;
    game.hitstop = 3;
    game.addSpark(this.x + (fromX > this.x ? 6 : -6), this.y - this.z - 16);
    const dir = this.x < fromX ? -1 : 1;
    if (this.hp <= 0 || down || this.z > 0) {
      if (this.weapon) { game.dropItem(this.weapon.t, this.x, this.y, 2.4); this.weapon = null; }
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying'; this.st = 0; this.vz = 3; this.z = Math.max(this.z, 0.1); this.vx = dir * 1.6;
      game.sound.pdie();
    } else if (down || this.z > 0) {
      this.state = 'down'; this.st = 0; this.vz = 2.8; this.z = Math.max(this.z, 0.1); this.vx = dir * 1.8;
      game.sound.phurt();
    } else {
      this.state = 'hurt'; this.st = 0; this.vx = dir * 1.4;
      game.sound.phurt();
    }
    return true;
  }

  draw(game, ctx) {
    const cam = game.camX;
    let pose = 'idle';
    let face = this.face;
    switch (this.state) {
      case 'walk': pose = ['walk1', 'idle', 'walk2', 'idle'][(this.st >> 3) % 4]; break;
      case 'run': pose = ['run1', 'run2'][(this.st >> 2) % 2]; break;
      case 'attack': pose = this.curAtk?.pose || 'jab'; break;
      case 'blitz': pose = this.cd.blitz === 'upper' ? 'upper' : 'jkick'; break;
      case 'back': pose = 'jab2'; face = -face; break;
      case 'jump': case 'vault': pose = 'jump'; break;
      case 'jatk': pose = this.jatkPose; break;
      case 'special': pose = ['special1', 'special2'][(this.st >> 2) % 2]; break;
      case 'grab': pose = 'grabhold'; break;
      case 'grabatk': pose = 'knee'; break;
      case 'throw': pose = 'throw'; break;
      case 'suplex': pose = 'suplex'; break;
      case 'pickup': pose = 'crouch'; break;
      case 'grabbed': pose = 'grabbed'; break;
      case 'hurt': pose = 'hurt'; break;
      case 'down': case 'dying': pose = 'down'; break;
      case 'getup': pose = this.st < 8 ? 'down' : 'crouch'; break;
    }
    if (this.invuln > 0 && this.invuln % 6 < 3 && ['idle', 'walk', 'run', 'jump'].includes(this.state)) return;
    drawShadow(ctx, this.x - cam, this.y, 15);
    const white = (this.state === 'hurt' || this.state === 'dying') && this.st % 4 < 2;
    drawFighter(ctx, this.cd.actor, pose, game.frame, this.x - cam, this.y - this.z, face < 0, white);
    // held weapon
    if (this.weapon && ['idle', 'walk', 'run', 'attack', 'pickup', 'grab'].includes(this.state)) {
      const swinging = this.state === 'attack' && this.st >= (this.curAtk?.su || 4);
      drawHeldWeapon(ctx, this.weapon.t, this.x - cam, this.y - this.z, this.face, swinging);
    }
    // swing arcs
    if (this.state === 'attack' && this.curAtk && !this.curAtk.noStrike) {
      const c = this.curAtk;
      if (this.st >= c.su && this.st < c.su + c.act + 2) {
        const t = (this.st - c.su) / (c.act + 2);
        drawSlash(ctx, this.x - cam + this.face * 8, this.y - this.z - 16, this.face, t, !!c.heavy, '#f8f0c0');
      }
    } else if (this.state === 'blitz' && this.st < 12) {
      drawSlash(ctx, this.x - cam + this.face * 10, this.y - this.z - 16, this.face, this.st / 12, true, '#88d8f8');
    } else if (this.state === 'jatk' && this.st < 10) {
      drawSlash(ctx, this.x - cam + this.face * 8, this.y - this.z - 10, this.face, this.st / 10, false, '#f8f0c0');
    } else if (this.state === 'back' && this.st >= 2 && this.st < 10) {
      drawSlash(ctx, this.x - cam - this.face * 8, this.y - this.z - 16, -this.face, (this.st - 2) / 8, false, '#f8f0c0');
    }
    if (this.state === 'special') drawRing(ctx, this.x - cam, this.y - 6, this.st);
  }
}

// ======================= ENEMIES =======================

export const EKIND = {
  punk: {
    hp: 8, spd: 0.9, dmg: 3, reach: 22, windT: 22, atkT: 14, cool: [45, 100],
    score: 200, actor: (v) => 'pk' + v, names: ['GALSIMOORE', 'JACK MOORE', 'SURGEON'],
  },
  brawler: {
    hp: 15, spd: 0.62, dmg: 6, reach: 26, windT: 34, atkT: 16, cool: [60, 120],
    score: 400, down: true, actor: (v) => 'br' + v, names: ['DONOMOORE', 'Z. MOORE', 'GUDDEN'],
  },
  thrower: {
    hp: 12, spd: 1.05, dmg: 4, reach: 20, windT: 18, atkT: 13, cool: [50, 100],
    score: 500, actor: (v) => 'sg' + v, names: ['SIGNAL MOORE', 'Y. SIGNAL'], thrower: true,
  },
  whip: {
    hp: 11, spd: 1.1, dmg: 5, reach: 46, windT: 20, atkT: 13, cool: [55, 95],
    score: 500, actor: (v) => 'el' + v, names: ['ELECTRA MOORE', 'NORA MOORE'], whip: true,
  },
  fat: {
    hp: 30, spd: 0.45, dmg: 7, reach: 26, windT: 30, atkT: 16, cool: [70, 120],
    score: 800, down: true, actor: (v) => 'fb' + v, names: ['BIG MOORLEY', 'HEART MOORE'],
    fat: true, grab: false, armor: 0.7,
  },
  biker: {
    hp: 13, spd: 0.7, dmg: 5, reach: 24, windT: 26, atkT: 15, cool: [55, 110],
    score: 600, down: true, actor: (v) => 'bk' + v, names: ['ROAD MOORE', 'FOG MOORE'], biker: true,
  },
  kickboxer: {
    hp: 42, spd: 1.0, dmg: 6, reach: 28, windT: 14, atkT: 12, cool: [40, 80],
    score: 2000, down: true, actor: (v) => 'kb' + v, names: ['MOORAI', 'BAREMOORE'],
    block: 0.45, grab: false, miniBoss: true,
  },
  mirror: {
    hp: 55, spd: 1.4, dmg: 4, reach: 24, windT: 12, atkT: 12, cool: [30, 60],
    score: 3000, down: true, actor: () => 'axd', names: ['MOORE SHADOW'],
    grab: false, mirror: true, miniBoss: true,
  },
  moorex: {
    hp: 110, spd: 0.8, dmg: 8, reach: 30, windT: 22, atkT: 16, cool: [40, 80],
    score: 10000, down: true, actor: () => 'mx', names: ['MR. MOORE X'],
    grab: false, boss: true, armor: 0.75,
  },
};

export function spawnEnemy(game, def) {
  const side = def.side || 1;
  const x = def.x ?? (side < 0 ? game.camX - 26 : game.camX + VIEW_W + 26);
  const y = def.y ?? rnd(GROUND_TOP + 10, GROUND_BOT - 4);
  const k = EKIND[def.t];
  const v = Math.min(def.v || 0, 2);
  const e = {
    id: nextId++,
    t: def.t, v, kind: k, x, y, z: 0, vz: 0, vx: 0, face: -side,
    hp: Math.round(k.hp * (1 + v * 0.35)), hpMax: Math.round(k.hp * (1 + v * 0.35)),
    spd: k.spd * (1 + v * 0.15),
    state: 'seek', st: 0, cool: rnd(20, 60), repick: 0, sidePref: -side, yJit: 0,
    hostile: true, name: k.names[Math.min(v, k.names.length - 1)],
    struck: false, _hit: 0, invuln: 0, throwsTaken: 0, juggleN: 0,
    knife: !!def.knife,
  };
  if (k.biker) {
    e.state = 'ride';
    e.vx = -side * 3.0;
    e.x = side < 0 ? game.camX - 40 : game.camX + VIEW_W + 40;
    e.rideHit = {};
    game.sound.bikeRev();
  }
  if (k.mirror) {
    const p = game.players.find((pl) => pl && pl.hp > 0) || game.players[0];
    e.actorOverride = p ? CHARS[p.charKey].mirror : 'axd';
  }
  if (k.boss) { e.state = 'intro'; e.st = 0; e.introX = x; }
  game.enemies.push(e);
  return e;
}

export function damageEnemy(game, e, dmg, fromX, opts = {}) {
  if (e.gone) return false;
  if (e.invuln > 0 && !opts.force) return false;
  const airborne = e.z > 0;
  if ((e.state === 'down' || e.state === 'getup') && !airborne && !opts.force) return false;
  if (e.state === 'intro') return false;
  const dir = e.x < fromX ? -1 : 1;
  const k = e.kind;

  // kickboxer guard: blocks face-on attacks, then counters
  if (!opts.pierce && !opts.force && k.block && (e.state === 'seek' || e.state === 'wind')
      && Math.sign(fromX - e.x) === e.face && Math.random() < k.block) {
    e.state = 'block'; e.st = 0;
    game.sound.blockTing();
    game.hitstop = 2;
    e.x -= Math.sign(fromX - e.x) * 2;
    game.focus = e; game.focusT = 150;
    return false;
  }

  // juggle: airborne bodies can be hit again, with damage scaling
  let mult = 1;
  if (airborne && (e.state === 'down' || e.state === 'thrown')) {
    e.juggleN++;
    mult = Math.max(0.3, 0.7 - e.juggleN * 0.1);
    if (e.juggleN <= 3) { e.vz = Math.max(e.vz, 2.2); e.vx = dir * 1.6; }
  }

  e.hp -= Math.max(1, Math.round(dmg * mult));
  game.focus = e; game.focusT = 150;
  game.hitstop = opts.heavy ? 5 : 3;
  game.addSpark(e.x + (fromX > e.x ? 4 : -4), e.y - e.z - 16);
  if (opts.heavy) game.sound.punchHeavy();
  else if (dmg >= 4) game.sound.punchMid();
  else game.sound.punchLight();

  // interrupted while holding a player
  if (e.grabP) {
    const p = e.grabP;
    e.grabP = null;
    if (p.grabbedBy === e) { p.grabbedBy = null; p.state = 'idle'; p.invuln = 20; }
  }
  // interrupted while being held by a player: stay held unless downed
  const heldBy = e.grabber;

  if (e.hp <= 0) {
    e.hp = 0; e.dead = true;
    if (heldBy) { heldBy.grab = null; heldBy.state = heldBy.state === 'grab' ? 'idle' : heldBy.state; e.grabber = null; }
    e.state = 'down'; e.st = 0; e.vz = Math.max(3, opts.launch || 0); e.z = Math.max(e.z, 0.1); e.vx = dir * 2;
    if (opts.by) { game.addScore(opts.by, k.score * (1 + (e.v || 0))); game.pstats[opts.by.idx].kills++; }
    game.sound.edie();
    if (k.boss || k.miniBoss) game.onBossDown(e);
    if (e.knife) { e.knife = false; game.dropItem('knife', e.x, e.y, 2.4); }
    return true;
  }

  // heavy armor: bosses and the fat man shrug off most stagger
  if (k.armor && Math.random() < k.armor && !airborne) {
    return true;
  }

  const down = !!opts.down || airborne;
  if (down) {
    if (heldBy) { heldBy.grab = null; if (heldBy.state === 'grab') heldBy.state = 'idle'; e.grabber = null; }
    e.state = 'down'; e.st = 0;
    e.vz = opts.launch ? opts.launch : Math.max(2.6, e.vz);
    if (!opts.launch) e.juggleN = 0;
    e.z = Math.max(e.z, 0.1); e.vx = dir * (opts.kb || 1.6);
    if (e.knife) { e.knife = false; game.dropItem('knife', e.x, e.y, 2.4); }
    game.sound.thud();
  } else if (e.state !== 'grabbed') {
    e.state = 'hurt'; e.st = 0; e.vx = dir * (opts.kb || 1.2);
  }
  return true;
}

function nearestPlayer(game, e) {
  let best = null, bd = 1e9;
  for (const p of game.players) {
    if (!p || p.hp <= 0 || ['dying', 'down', 'getup'].includes(p.state)) continue;
    const d = Math.abs(p.x - e.x) + Math.abs(p.y - e.y) * 2;
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) {
    for (const p of game.players) {
      if (p && p.hp > 0) { best = p; break; }
    }
  }
  return best;
}

function enemyStrikePlayers(game, e, reach, dmg, down, tol = DEPTH_TOL) {
  for (const p of game.players) {
    if (!p || p.hp <= 0) continue;
    const dxp = (p.x - e.x) * e.face;
    if (dxp > -4 && dxp < reach + 8 && inDepth(e, p, tol) && p.z < 16) {
      if (p.damage(game, dmg, e.x, down)) return p;
    }
  }
  return null;
}

export function updateEnemies(game) {
  for (const e of game.enemies) {
    if (e.gone) continue;

    // shared physics
    if (e.z > 0 || e.vz !== 0) {
      e.z += e.vz; e.vz -= 0.3;
      if (e.z <= 0) {
        e.z = 0; e.vz = 0;
        if (e.state === 'thrown') {
          e.state = 'down'; e.st = 0;
          game.sound.thud();
          game.addSpark(e.x, e.y - 4);
          game.shake = Math.max(game.shake, 3);
        }
      }
    }
    if (e.vx && ['hurt', 'down', 'thrown'].includes(e.state)) {
      e.x += e.vx; e.vx *= 0.88;
      if (Math.abs(e.vx) < 0.1) e.vx = 0;
    }
    if (e.invuln > 0) e.invuln--;

    e.st++;
    const k = e.kind;

    if (e.dead) {
      if (e.state !== 'thrown' && e.st > 46) e.gone = true;
      if (e.state === 'thrown') thrownCollide(game, e);
      continue;
    }

    const P = nearestPlayer(game, e);

    switch (e.state) {
      case 'grabbed': break; // positioned by the grabbing player
      case 'thrown': thrownCollide(game, e); break;

      case 'intro': { // Mr. Moore X: the desk flip
        if (e.st === 50) {
          game.sound.deskFlip();
          game.shake = 14;
          game.items.push({ t: 'deskwreck', x: e.x - e.face * 6, y: e.y + 6, z: 0, vz: 3.2, vx: -e.face * 1.4, age: 0 });
        }
        if (e.st > 90) { e.state = 'seek'; e.st = 0; game.sound.bossRoar(); }
        break;
      }

      case 'ride': { // biker: rides across, dismounts near the player
        e.x += e.vx;
        if (P) e.y += clamp(P.y - e.y, -0.9, 0.9);
        e.face = e.vx > 0 ? 1 : -1;
        // clothesline anyone in the way
        for (const p of game.players) {
          if (!p || p.hp <= 0 || e.rideHit[p.idx]) continue;
          if (Math.abs(p.x - e.x) < 14 && inDepth(e, p) && p.z < 14) {
            if (p.damage(game, k.dmg, e.x - e.vx * 4, true)) e.rideHit[p.idx] = true;
          }
        }
        const pastP = P && (e.x - P.x) * Math.sign(e.vx) > 50;
        const inView = e.x > game.camX + 30 && e.x < game.camX + VIEW_W - 30;
        if ((pastP && inView) || e.st > 160) {
          // dismount: the bike skids on without him
          game.fx.push({ kind: 'bike', x: e.x, y: e.y + 2, vx: e.vx * 1.4, tt: 0, life: 60 });
          e.state = 'seek'; e.st = 0; e.cool = 30;
          game.addSpark(e.x, e.y - 8);
        }
        break;
      }

      case 'seek': {
        if (!P) { e.face = -1; break; }
        e.repick--;
        if (e.repick <= 0) {
          e.repick = rnd(40, 90);
          const near = e.x < P.x ? -1 : 1;
          e.sidePref = Math.random() < 0.3 ? -near : near;
          e.yJit = rnd(-8, 8);
        }
        const wantDist = k.whip ? 38 : k.thrower ? 10 : k.reach - 4;
        const tx = P.x + e.sidePref * wantDist;
        const ty = clamp(P.y + e.yJit, GROUND_TOP + 4, GROUND_BOT);
        if (Math.abs(tx - e.x) > 2) e.x += Math.sign(tx - e.x) * e.spd;
        if (Math.abs(ty - e.y) > 1.5) e.y += Math.sign(ty - e.y) * e.spd * 0.8;
        e.face = P.x > e.x ? 1 : -1;
        if (e.cool > 0) e.cool--;
        const dxp = (P.x - e.x) * e.face;
        const pReady = !['down', 'dying', 'getup'].includes(P.state);

        if (k.thrower && e.cool <= 0 && dxp > 0 && dxp < 18 && Math.abs(P.y - e.y) < 9
            && pReady && P.grounded() && P.invuln <= 0 && !P.grabbedBy && P.state !== 'special' && P.state !== 'grabbed') {
          // grabs YOU — mash jump to tech out
          e.state = 'egrab'; e.st = 0;
          e.grabP = P;
          P.state = 'grabbed'; P.st = 0; P.grabbedBy = e;
          if (P.grab) P.releaseGrab(game);
          game.sound.grab();
          break;
        }
        if (k.fat && e.cool <= 0 && pReady) {
          if (dxp > 55 && dxp < 130 && Math.abs(P.y - e.y) < 12) { e.state = 'chargewind'; e.st = 0; break; }
          if (dxp > 0 && dxp < 42 && Math.abs(P.y - e.y) < 10) { e.state = 'breathwind'; e.st = 0; break; }
        }
        if (k.boss && e.cool <= 0 && pReady) {
          const phase = game.bossPhase(e);
          if (dxp > 60 || Math.random() < 0.5 + phase * 0.2) { e.state = 'shoot'; e.st = 0; e.shots = 0; e.bursts = 3 + phase; break; }
          e.state = 'wind'; e.st = 0;
          break;
        }
        if (k.mirror && e.cool <= 0 && pReady) {
          if (dxp > 60 && dxp < 140 && Math.random() < 0.35) { e.state = 'mblitz'; e.st = 0; e.struckTag = {}; break; }
          if (dxp > 0 && dxp < k.reach + 4 && Math.abs(P.y - e.y) < 10) { e.state = 'mcombo'; e.st = 0; e.mhits = 0; break; }
          break;
        }
        if (e.cool <= 0 && dxp > 0 && dxp < k.reach + 6 && Math.abs(P.y - e.y) < 10 && pReady) {
          e.state = 'wind'; e.st = 0;
        }
        break;
      }

      case 'wind': {
        let wt = k.windT;
        if (e.fastWind) wt = 6;
        if (k.boss) wt -= game.bossPhase(e) * 5;
        if (e.st >= wt) {
          e.state = 'atk'; e.st = 0; e.struck = false; e.fastWind = false;
          game.sound.whoosh();
        }
        break;
      }

      case 'atk': {
        if (e.st < 6) e.x += e.face * (k.boss ? 1.5 : 1.0);
        if (!e.struck && e.st >= 2 && e.st <= k.atkT - 3) {
          const dmg = e.knife ? k.dmg + 1 : k.dmg;
          const who = enemyStrikePlayers(game, e, k.reach, dmg, !!k.down);
          if (who) { e.struck = true; if (e.knife) game.sound.stab(); }
        }
        if (e.st >= k.atkT) {
          e.state = 'seek';
          e.cool = rnd(k.cool[0], k.cool[1]) * (1 - (e.v || 0) * 0.15);
        }
        break;
      }

      // ---- thrower: holds you, then hurls you ----
      case 'egrab': {
        const p = e.grabP;
        if (!p || p.hp <= 0 || p.grabbedBy !== e) { e.grabP = null; e.state = 'seek'; e.cool = 40; break; }
        if (e.st >= 42) {
          // the throw
          e.grabP = null;
          p.grabbedBy = null;
          p.invuln = 0;
          p.state = 'idle';
          if (p.damage(game, k.dmg + 4, e.x, true)) {
            p.vx = e.face * 4.2; p.vz = 3.6; p.z = Math.max(p.z, 0.2);
          }
          e.state = 'throwpose'; e.st = 0;
          game.sound.throwSlam();
        }
        break;
      }
      case 'throwpose':
        if (e.st > 16) { e.state = 'seek'; e.cool = rnd(80, 130); }
        break;

      // ---- fat man ----
      case 'chargewind':
        if (e.st > 26) { e.state = 'charge'; e.st = 0; e.chargeHit = {}; game.sound.whoosh(); }
        break;
      case 'charge': {
        e.x += e.face * 3.0;
        for (const p of game.players) {
          if (!p || p.hp <= 0 || e.chargeHit[p.idx]) continue;
          if (Math.abs(p.x - e.x) < 16 && inDepth(e, p) && p.z < 14) {
            if (p.damage(game, k.dmg, e.x - e.face * 8, true)) e.chargeHit[p.idx] = true;
          }
        }
        if (e.st > 34 || e.x < game.camX + 8 || e.x > game.camX + VIEW_W - 8) {
          e.state = 'seek'; e.cool = rnd(k.cool[0], k.cool[1]);
        }
        break;
      }
      case 'breathwind':
        if (e.st > 24) { e.state = 'breathe'; e.st = 0; e.breathHit = {}; game.sound.flame(); }
        break;
      case 'breathe': {
        if (e.st > 6 && e.st < 34) {
          for (const p of game.players) {
            if (!p || p.hp <= 0 || e.breathHit[p.idx]) continue;
            const dxp = (p.x - e.x) * e.face;
            if (dxp > 4 && dxp < 48 && inDepth(e, p, 13) && p.z < 18) {
              if (p.damage(game, k.dmg - 1, e.x, true)) e.breathHit[p.idx] = true;
            }
          }
        }
        if (e.st > 40) { e.state = 'seek'; e.cool = rnd(k.cool[0], k.cool[1]); }
        break;
      }

      // ---- kickboxer block/counter ----
      case 'block':
        if (e.st > 9) { e.state = 'wind'; e.st = 0; e.fastWind = true; }
        break;

      // ---- mirror shadow: runs your own combo back at you ----
      case 'mcombo': {
        const times = [4, 10, 16, 24];
        const dmgs = [3, 3, 4, 6];
        const ti = times.indexOf(e.st);
        if (ti >= 0) {
          e.x += e.face * 2;
          enemyStrikePlayers(game, e, k.reach, dmgs[ti], ti === 3);
          game.sound.whoosh();
        }
        if (e.st > 30) { e.state = 'seek'; e.cool = rnd(k.cool[0], k.cool[1]); }
        break;
      }
      case 'mblitz': {
        if (e.st < 12) e.x += e.face * 2.6;
        if (e.st >= 2 && e.st <= 13) enemyStrikePlayers(game, e, 24, 6, true);
        if (e.st > 20) { e.state = 'seek'; e.cool = rnd(40, 80); }
        break;
      }

      // ---- Mr. Moore X: machine-gun spread ----
      case 'shoot': {
        if (P) e.face = P.x > e.x ? 1 : -1;
        if (e.st % 26 === 8 && e.shots < e.bursts) {
          e.shots++;
          game.sound.gun(); game.sound.gun();
          for (let i = -2; i <= 2; i++) {
            game.projectiles.push({
              t: 'bullet', x: e.x + e.face * 12, y: e.y + i * 1.5, z: 14,
              vx: e.face * 3.4, vy: i * 0.5, dmg: 4,
            });
          }
          game.addSpark(e.x + e.face * 14, e.y - e.z - 14);
        }
        if (e.shots >= e.bursts && e.st % 26 === 24) {
          e.state = 'seek'; e.cool = rnd(30, 60) - game.bossPhase(e) * 10;
        }
        break;
      }

      case 'hurt':
        if (e.st > 14) { e.state = 'seek'; e.cool = Math.max(e.cool, rnd(14, 36)); }
        break;
      case 'down':
        if (e.z <= 0 && e.st > 52) { e.state = 'getup'; e.st = 0; e.juggleN = 0; }
        break;
      case 'getup':
        if (e.st > 16) {
          e.state = 'seek';
          e.cool = rnd(20, 55);
          e.invuln = 26; // wake-up invulnerability
          if ((k.boss || k.miniBoss) && game.bossPhase(e) >= 1) game.sound.bossRoar();
        }
        break;
    }

    if (!['ride', 'thrown'].includes(e.state)) e.y = clamp(e.y, GROUND_TOP + 4, GROUND_BOT);

    // gentle separation
    if (['seek', 'wind'].includes(e.state)) {
      for (const o of game.enemies) {
        if (o === e || o.gone || o.dead || !['seek', 'wind'].includes(o.state)) continue;
        if (Math.abs(o.x - e.x) < 12 && Math.abs(o.y - e.y) < 7) {
          e.x += e.x < o.x ? -0.4 : 0.4;
          e.y += e.y < o.y ? -0.25 : 0.25;
        }
      }
    }
  }
  game.enemies = game.enemies.filter((e) => !e.gone);
}

// a thrown body is a weapon: it knocks down whatever it lands on
function thrownCollide(game, e) {
  if (e.z <= 0) return;
  for (const o of game.enemies) {
    if (o === e || o.gone || o.dead || ['down', 'thrown', 'grabbed', 'getup'].includes(o.state)) continue;
    if (o._hit === e.thrownTag) continue;
    if (Math.abs(o.x - e.x) < 14 && Math.abs(o.y - e.y) < 12 && o.z < 20) {
      o._hit = e.thrownTag;
      damageEnemy(game, o, 6, e.x - Math.sign(e.vx || 1) * 8, { down: true, kb: 2.2, force: false, heavy: true });
      // the flying body loses some momentum
      e.vx *= 0.75;
    }
  }
  for (const b of game.breakables) {
    if (b.gone || b._hit === e.thrownTag) continue;
    if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 13) {
      b._hit = e.thrownTag;
      b.hp = 0;
      breakOpen(game, b);
    }
  }
}

// ---------------- enemy drawing ----------------

export function drawEnemy(game, ctx, e) {
  const cam = game.camX;
  const k = e.kind;
  const actor = e.actorOverride || k.actor(e.v || 0);
  let pose = 'idle';
  switch (e.state) {
    case 'seek': pose = ['walk1', 'idle', 'walk2', 'idle'][(game.frame >> 3) % 4]; break;
    case 'wind': pose = 'wind'; break;
    case 'atk': pose = e.knife ? 'stab' : k.whip ? 'whip' : k.down ? 'swing' : 'jab'; break;
    case 'hurt': pose = 'hurt'; break;
    case 'block': pose = 'block'; break;
    case 'down': pose = e.z > 0 ? 'hurt' : 'down'; break;
    case 'thrown': pose = 'hurt'; break;
    case 'getup': pose = e.st < 8 ? 'down' : 'crouch'; break;
    case 'grabbed': pose = 'grabbed'; break;
    case 'egrab': pose = 'grabhold'; break;
    case 'throwpose': pose = 'throw'; break;
    case 'ride': pose = 'ride'; break;
    case 'chargewind': pose = 'wind'; break;
    case 'charge': pose = 'charge'; break;
    case 'breathwind': case 'breathe': pose = 'breathe'; break;
    case 'mcombo': pose = ['jab', 'jab2', 'hook', 'upper'][Math.min(3, (e.st / 7) | 0)]; break;
    case 'mblitz': pose = 'upper'; break;
    case 'shoot': pose = 'shoot'; break;
    case 'intro': pose = e.st < 50 ? 'idle' : 'flip'; break;
  }
  if (e.dead && e.st > 20 && e.st % 4 < 2) return; // death flicker
  const scale = k.boss ? 1.2 : k.fat ? 1.12 : 1;
  drawShadow(ctx, e.x - cam, e.y, k.fat ? 24 : k.boss ? 22 : 15);
  if (e.state === 'ride') drawBike(ctx, e.x - cam, e.y - e.z, e.face, game.frame);
  const white = (e.state === 'hurt' && e.st % 4 < 2)
    || (e.state === 'wind' && e.st % 8 < 3)
    || (e.dead && e.st % 6 < 3)
    || (e.invuln > 0 && e.invuln % 6 < 3);
  drawFighter(ctx, actor, pose, game.frame, e.x - cam, e.y - e.z - (e.state === 'ride' ? 8 : 0), e.face < 0, white, scale);

  // held knife
  if (e.knife && ['seek', 'wind', 'atk'].includes(e.state)) {
    drawHeldWeapon(ctx, 'knife', e.x - cam, e.y - e.z, e.face, e.state === 'atk');
  }
  // whip lash
  if (k.whip && e.state === 'atk' && e.st < 12) {
    const t = e.st / 12;
    const len = 10 + t * 38;
    ctx.strokeStyle = '#d8b048';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(e.x - cam + e.face * 8, e.y - e.z - 25);
    ctx.quadraticCurveTo(
      e.x - cam + e.face * (8 + len * 0.6), e.y - e.z - 28 + Math.sin(t * 9) * 6,
      e.x - cam + e.face * (8 + len), e.y - e.z - 14 + Math.sin(t * 7) * 4,
    );
    ctx.stroke();
  }
  // flame breath
  if (e.state === 'breathe' && e.st > 4 && e.st < 36) {
    drawFlame(ctx, e.x - cam + e.face * 10, e.y - e.z - 22, e.face, Math.min(1, e.st / 16), game.frame);
  }
  // Mr. X's gun
  if ((e.state === 'shoot' || e.state === 'seek' || e.state === 'wind' || e.state === 'atk') && k.boss) {
    ctx.save();
    ctx.translate(Math.round(e.x - cam), Math.round(e.y - e.z));
    if (e.face < 0) ctx.scale(-1, 1);
    ctx.fillStyle = '#303038';
    ctx.fillRect(8, -26, 12, 3);
    ctx.fillRect(8, -23, 3, 4);
    ctx.restore();
  }
  // the boss's desk, pre-flip
  if (e.state === 'intro' && e.st < 50) {
    const dx = e.x - cam - e.face * 18;
    ctx.fillStyle = '#6a4820';
    ctx.fillRect(dx - 16, e.y - 22, 32, 6);
    ctx.fillStyle = '#8a6030';
    ctx.fillRect(dx - 16, e.y - 22, 32, 2);
    ctx.fillStyle = '#503418';
    ctx.fillRect(dx - 14, e.y - 16, 4, 16); ctx.fillRect(dx + 10, e.y - 16, 4, 16);
  }
  // wind telegraph
  if (e.state === 'wind' || e.state === 'chargewind' || e.state === 'breathwind') {
    if ((e.st >> 2) % 2) {
      ctx.fillStyle = '#f84848';
      ctx.fillRect(Math.round(e.x - cam) - 1, Math.round(e.y - e.z) - 36 - (k.boss ? 6 : 0), 3, 3);
    }
  }
}

// ---------------- breakables ----------------

export function hitBreakable(game, b, by) {
  b.hp--;
  b.shakeT = 6;
  game.hitstop = Math.max(game.hitstop, 2);
  game.addSpark(b.x, b.y - 10, '#c8a878');
  if (b.hp <= 0) breakOpen(game, b, by);
  else game.sound.punchMid();
}

export function breakOpen(game, b, by) {
  if (b.gone) return;
  b.gone = true;
  game.sound.crunch();
  game.shake = Math.max(game.shake, 2);
  for (let i = 0; i < 4; i++) game.addSpark(b.x + rnd(-8, 8), b.y - rnd(2, 20), '#a8825a');
  if (by) game.addScore(by, 100);
  if (b.drop) game.dropItem(b.drop, b.x, b.y, 2.6);
}

export function drawBreakableEnt(game, ctx, b) {
  const jx = b.shakeT > 0 ? ((b.shakeT % 2) * 2 - 1) : 0;
  drawShadow(ctx, b.x - game.camX, b.y, b.t === 'booth' ? 20 : 16);
  drawBreakable(ctx, b.t, b.x - game.camX + jx, b.y, b.hp, game.frame);
}

// ---------------- items ----------------

export function updateItems(game) {
  for (const it of game.items) {
    it.age++;
    if (it.z > 0 || it.vz !== 0) {
      it.z += it.vz; it.vz -= 0.25;
      if (it.vx) it.x += it.vx;
      if (it.z <= 0) {
        it.z = 0; it.vx = 0;
        if (Math.abs(it.vz) > 1) { it.vz = -it.vz * 0.4; } else it.vz = 0;
      }
    }
    if (it.t === 'deskwreck') continue; // scenery now
    if (it.age > 1400) { it.gone = true; continue; }
    // money is scooped up by walking over it
    if ((it.t === 'money' || it.t === 'moneybag') && it.z <= 2) {
      for (const p of game.players) {
        if (!p || p.hp <= 0 || ['down', 'dying'].includes(p.state)) continue;
        if (Math.abs(p.x - it.x) < 11 && Math.abs(p.y - it.y) < 9 && p.z < 6) {
          it.gone = true;
          game.addScore(p, it.t === 'money' ? 500 : 1000);
          game.sound.coin();
          break;
        }
      }
    }
  }
  game.items = game.items.filter((it) => !it.gone);
}

export function drawItemEnt(game, ctx, it) {
  if (it.t !== 'deskwreck' && it.age > 1250 && (it.age >> 2) % 2) return;
  if (it.t === 'deskwreck') {
    const dx = it.x - game.camX;
    ctx.fillStyle = '#503418';
    ctx.fillRect(dx - 17, it.y - it.z - 8, 34, 4);
    ctx.fillStyle = '#6a4820';
    ctx.fillRect(dx - 15, it.y - it.z - 20, 5, 14); ctx.fillRect(dx + 10, it.y - it.z - 20, 5, 14);
    return;
  }
  drawShadow(ctx, it.x - game.camX, it.y, 8);
  drawItem(ctx, it.t, it.x - game.camX, it.y - it.z);
}

// ---------------- projectiles ----------------

export function updateProjectiles(game) {
  for (const s of game.projectiles) {
    s.x += s.vx;
    if (s.vy) s.y += s.vy;
    s.tt = (s.tt || 0) + 1;
    if (s.t === 'knife') {
      for (const e of game.enemies) {
        if (e.gone || e.dead || ['down', 'getup', 'thrown', 'grabbed'].includes(e.state)) continue;
        if (Math.abs(e.x - s.x) < 10 && Math.abs(e.y - s.y) < 12 && e.z < 22) {
          s.gone = true;
          damageEnemy(game, e, s.dmg, s.x - s.vx * 4, { down: true, kb: 2, pierce: true, by: s.by, heavy: true });
          break;
        }
      }
      if (!s.gone) {
        for (const b of game.breakables) {
          if (b.gone) continue;
          if (Math.abs(b.x - s.x) < 12 && Math.abs(b.y - s.y) < 13) {
            s.gone = true;
            hitBreakable(game, b, s.by);
            break;
          }
        }
      }
    } else if (s.t === 'bullet') {
      for (const p of game.players) {
        if (!p || p.hp <= 0) continue;
        if (Math.abs(p.x - s.x) < 6 && Math.abs(p.y - s.y) < 8 && p.z < 18) {
          if (p.damage(game, s.dmg, s.x - s.vx * 4, false)) { s.gone = true; break; }
        }
      }
    }
    if (s.x < game.camX - 40 || s.x > game.camX + VIEW_W + 40 || s.tt > 240) s.gone = true;
  }
  game.projectiles = game.projectiles.filter((s) => !s.gone);
}

export function drawProjectile(game, ctx, s) {
  if (s.t === 'knife') drawKnifeProj(ctx, s.x - game.camX, s.y - s.z, s.tt);
  else drawBullet(ctx, s.x - game.camX, s.y - s.z);
}

// ---------------- fx ----------------

export function updateFx(game) {
  for (const f of game.fx) {
    f.tt++;
    if (f.kind === 'bike') { f.x += f.vx; f.vx *= 0.97; }
  }
  game.fx = game.fx.filter((f) => f.tt < f.life);
}

export function drawFx(game, ctx, f) {
  if (f.kind === 'spark') drawSpark(ctx, f.x - game.camX, f.y, f.tt, f.color);
  else if (f.kind === 'bike') {
    drawBike(ctx, f.x - game.camX, f.y, f.vx > 0 ? 1 : -1, game.frame);
    if (f.tt % 3 === 0) drawSpark(ctx, f.x - game.camX - Math.sign(f.vx) * 10, f.y, f.tt % 8, '#c8c8d8');
  }
}
