// Entities: the hero, enemy AI, the rideable beast, items and effects.
// Coordinates: x = world x, y = ground depth (y-sorted), z = height above
// ground. Feet sit at (x, y - z) on screen.

import { drawSprite, sprSize, drawShadow, drawSlash, drawSpark } from './sprites.js';
import { GROUND_TOP, GROUND_BOT, VIEW_W } from './levels.js';

export const DEPTH_TOL = 12;
export const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inDepth = (a, b, tol = DEPTH_TOL) => Math.abs(a.y - b.y) <= tol;

// ======================= PLAYER =======================

const COMBO = [
  { startup: 5, active: 4, recover: 7, dmg: 2, kb: 1.2, down: false },
  { startup: 4, active: 4, recover: 8, dmg: 2, kb: 1.6, down: false },
  { startup: 6, active: 5, recover: 13, dmg: 4, kb: 2.8, down: true },
];

export class Player {
  constructor(x, y) {
    this.t = 'hero';
    this.x = x; this.y = y; this.z = 0; this.vz = 0; this.vx = 0;
    this.face = 1;
    this.hpMax = 30; this.hp = 30;
    this.state = 'idle'; this.st = 0;
    this.combo = 0; this.queued = false;
    this.invuln = 0;
    this.riding = null;
    this.tapDir = 0; this.tapT = 99;
    this.lastJumpF = -99; this.lastAtkF = -99;
    this.strikeId = 1;
  }

  grounded() { return this.z <= 0 && this.vz === 0; }

  update(game, inp) {
    this.st++;
    if (this.invuln > 0) this.invuln--;
    if (this.tapT < 99) this.tapT++;

    // vertical physics
    if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz;
      this.vz -= 0.3;
      if (this.z <= 0) {
        this.z = 0; this.vz = 0;
        if (this.state === 'jump' || this.state === 'jatk') { this.state = 'idle'; game.sound.land(); }
        if (this.state === 'down' || this.state === 'dying') game.sound.thud();
      }
    }

    // knockback / drift decay
    if (this.vx !== 0 && ['hurt', 'down', 'dying', 'dashatk'].includes(this.state)) {
      this.x += this.vx;
      this.vx *= 0.88;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    if (this.riding) { this.updateRiding(game, inp); game.clampPlayer(this); return; }

    switch (this.state) {
      case 'idle': case 'walk': this.updateFree(game, inp); break;
      case 'jump': this.updateAir(game, inp); break;
      case 'jatk': this.updateJatk(game, inp); break;
      case 'attack': this.updateAttack(game, inp); break;
      case 'dash': this.updateDash(game, inp); break;
      case 'dashatk':
        if (this.st >= 3 && this.st <= 9) this.strike(game, { dmg: 3, kb: 2.4, down: true, reach: 30 });
        if (this.st > 16) this.state = 'idle';
        break;
      case 'back':
        if (this.st >= 3 && this.st <= 8) this.strike(game, { dmg: 2, kb: 2, down: true, reach: 24, behind: true });
        if (this.st > 14) this.state = 'idle';
        break;
      case 'cast':
        if (this.st > 46) this.state = 'idle';
        break;
      case 'hurt':
        if (this.st > 16) { this.state = 'idle'; this.invuln = 24; }
        break;
      case 'down':
        if (this.grounded() && this.st > 46) { this.state = 'getup'; this.st = 0; }
        break;
      case 'getup':
        if (this.st > 16) { this.state = 'idle'; this.invuln = 40; }
        break;
      case 'dying': break; // main watches st
    }
    game.clampPlayer(this);
  }

  moveInput(game, inp, sx, sy) {
    let dx = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    let dy = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
    this.x += dx * sx;
    this.y = clamp(this.y + dy * sy, GROUND_TOP + 4, GROUND_BOT);
    if (dx !== 0) this.face = dx;
    return dx !== 0 || dy !== 0;
  }

  updateFree(game, inp) {
    const moving = this.moveInput(game, inp, 1.5, 1.1);
    this.state = moving ? 'walk' : 'idle';
    if (this.state === 'walk' && this.st > 1e5) this.st = 0;

    // dash: double-tap left/right
    for (const d of [-1, 1]) {
      const a = d < 0 ? 'left' : 'right';
      if (inp.pressed(a)) {
        if (this.tapDir === d && this.tapT < 16) {
          this.state = 'dash'; this.st = 0; this.face = d;
          game.sound.dash();
        }
        this.tapDir = d; this.tapT = 0;
      }
    }
    if (this.state === 'dash') return;

    if (inp.pressed('jump')) {
      this.lastJumpF = game.frame;
      if (game.frame - this.lastAtkF <= 4) { this.startBack(game); return; }
      // mount a free beast if standing next to one
      this.vz = 4.6; this.z = 0.1; this.state = 'jump'; this.st = 0;
      game.sound.jump();
      return;
    }
    if (inp.pressed('attack')) {
      this.lastAtkF = game.frame;
      if (inp.down('jump') || game.frame - this.lastJumpF <= 4) { this.startBack(game); return; }
      this.startAttack(game, 0);
      return;
    }
    // walk into a riderless beast to mount it
    if (this.grounded()) {
      for (const e of game.enemies) {
        if (e.t !== 'beast' || e.rider || e.mountCool > 0) continue;
        if (Math.abs(e.x - this.x) < 16 && Math.abs(e.y - this.y) < 10) {
          this.riding = e; e.rider = this;
          this.state = 'idle'; game.sound.mount();
          break;
        }
      }
    }
  }

  startAttack(game, comboIdx) {
    this.state = 'attack'; this.st = 0;
    this.combo = comboIdx; this.queued = false;
    this.strikeId++;
    if (comboIdx === 2) game.sound.slashBig(); else game.sound.slash();
  }

  startBack(game) {
    this.state = 'back'; this.st = 0; this.strikeId++;
    this.vz = 0; this.z = 0;
    game.sound.slash();
  }

  updateAttack(game, inp) {
    const c = COMBO[this.combo];
    if (inp.pressed('attack') && this.st > c.startup) this.queued = true;
    if (this.st >= c.startup && this.st < c.startup + c.active) {
      this.strike(game, { dmg: c.dmg, kb: c.kb, down: c.down, reach: this.combo === 2 ? 30 : 26 });
      this.x += this.face * 0.4;
    }
    if (this.st >= c.startup + c.active + c.recover) {
      if (this.queued && this.combo < 2) this.startAttack(game, this.combo + 1);
      else { this.state = 'idle'; this.combo = 0; }
    }
  }

  updateAir(game, inp) {
    this.moveInput(game, inp, 1.1, 0.7);
    if (inp.pressed('attack')) {
      this.state = 'jatk'; this.st = 0; this.strikeId++;
      game.sound.slash();
    }
  }

  updateJatk(game, inp) {
    this.x += this.face * 0.8;
    if (this.st >= 2 && this.z > 2) this.strike(game, { dmg: 3, kb: 1.8, down: true, reach: 26 });
  }

  updateDash(game, inp) {
    this.x += this.face * 2.9;
    const a = this.face < 0 ? 'left' : 'right';
    if (inp.pressed('attack')) {
      this.state = 'dashatk'; this.st = 0; this.strikeId++;
      this.vx = this.face * 2.4;
      game.sound.slashBig();
      return;
    }
    if (inp.pressed('jump')) {
      this.vz = 4.4; this.z = 0.1; this.state = 'jump'; this.st = 0;
      game.sound.jump();
      return;
    }
    if (!inp.down(a) || this.st > 40) this.state = 'idle';
  }

  updateRiding(game, inp) {
    const b = this.riding; // beast physics run in updateEnemies; here we steer it
    let dx = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    let dy = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
    b.x += dx * 1.9;
    b.y = clamp(b.y + dy * 1.1, GROUND_TOP + 4, GROUND_BOT);
    if (dx !== 0) b.face = dx;
    b.moving = dx !== 0 || dy !== 0;
    this.face = b.face;
    if (inp.pressed('attack') && b.state !== 'whip') {
      b.state = 'whip'; b.st = 0; b.strikeId = (b.strikeId || 0) + 1;
      game.sound.whip();
    }
    if (inp.pressed('jump')) {
      // hop off
      this.riding = null; b.rider = null; b.mountCool = 30;
      this.z = 0.1; this.vz = 3.4; this.state = 'jump'; this.st = 0;
      game.sound.dismount();
    }
    // player body follows the beast
    this.x = b.x; this.y = b.y; this.z = 0;
  }

  // apply a melee strike against all enemies in reach (once per swing)
  strike(game, o) {
    const dir = o.behind ? -this.face : this.face;
    for (const e of game.enemies) {
      if (e.t === 'beast' || e.gone) continue;
      if (e._hit === this.strikeId) continue;
      if (!inDepth(this, e)) continue;
      const dxp = (e.x - this.x) * dir;
      if (dxp < -6 || dxp > o.reach + 8) continue;
      e._hit = this.strikeId;
      damageEnemy(game, e, o.dmg, this.x, { down: o.down, kb: o.kb });
    }
  }

  damage(game, dmg, fromX, down = false) {
    if (this.invuln > 0) return false;
    if (['hurt', 'down', 'getup', 'dying', 'cast'].includes(this.state)) return false;
    if (this.riding) {
      const b = this.riding;
      b.rider = null; this.riding = null; b.mountCool = 60; b.shy = 90;
      down = true;
      game.sound.dismount();
    }
    this.hp -= dmg;
    game.hitstop = 3;
    game.addSpark(this.x + (fromX > this.x ? 6 : -6), this.y - this.z - 16);
    const dir = this.x < fromX ? -1 : 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying'; this.st = 0; this.vz = 3; this.z = Math.max(this.z, 0.1); this.vx = dir * 1.6;
      game.sound.pdie();
    } else if (down) {
      this.state = 'down'; this.st = 0; this.vz = 2.8; this.z = Math.max(this.z, 0.1); this.vx = dir * 1.8;
      game.sound.phurt();
    } else {
      this.state = 'hurt'; this.st = 0; this.vx = dir * 1.6;
      game.sound.phurt();
    }
    return true;
  }

  draw(game, ctx) {
    const cam = game.camX;
    if (this.riding) {
      // drawn as part of the beast pass (rider on top); nothing here
      return;
    }
    let spr = 'h_idle';
    switch (this.state) {
      case 'walk': spr = ['h_walk1', 'h_idle', 'h_walk2', 'h_idle'][(this.st >> 3) % 4]; break;
      case 'attack': spr = ['h_atk1', 'h_atk2', 'h_atk3'][this.combo]; break;
      case 'back': spr = 'h_back'; break;
      case 'jump': spr = 'h_jump'; break;
      case 'jatk': spr = 'h_jatk'; break;
      case 'dash': spr = ['h_dash', 'h_walk1'][(this.st >> 2) % 2]; break;
      case 'dashatk': spr = 'h_atk1'; break;
      case 'cast': spr = 'h_cast'; break;
      case 'hurt': spr = 'h_hurt'; break;
      case 'down': case 'dying': spr = 'h_down'; break;
      case 'getup': spr = this.st < 8 ? 'h_down' : 'h_idle'; break;
    }
    if (this.invuln > 0 && this.invuln % 6 < 3 && !['down', 'getup'].includes(this.state)) return;
    const { w, h } = sprSize(spr);
    drawShadow(ctx, this.x - cam, this.y, 16);
    const white = (this.state === 'hurt' || this.state === 'dying') && this.st % 4 < 2;
    drawSprite(ctx, spr, this.x - cam - w / 2, this.y - this.z - h, this.face < 0, white);
    // slash arcs
    if (this.state === 'attack') {
      const c = COMBO[this.combo];
      if (this.st >= c.startup && this.st < c.startup + c.active + 2) {
        const t = (this.st - c.startup) / (c.active + 2);
        drawSlash(ctx, this.x - cam + this.face * 8, this.y - this.z - 14, this.face, t, this.combo === 2, '#f8f0c0');
      }
    } else if (this.state === 'dashatk' && this.st < 12) {
      drawSlash(ctx, this.x - cam + this.face * 10, this.y - this.z - 14, this.face, this.st / 12, true, '#f8f0c0');
    } else if (this.state === 'jatk') {
      drawSlash(ctx, this.x - cam + this.face * 8, this.y - this.z - 10, this.face, Math.min(1, this.st / 10), false, '#f8f0c0');
    } else if (this.state === 'back' && this.st >= 2 && this.st < 10) {
      drawSlash(ctx, this.x - cam - this.face * 8, this.y - this.z - 14, -this.face, (this.st - 2) / 8, false, '#f8f0c0');
    }
  }
}

// ======================= ENEMIES =======================

const EKIND = {
  grunt: {
    hp: 7, spd: 0.85, dmg: 3, reach: 24, windT: 26, atkT: 16, cool: [50, 110],
    score: 200, down: false, spr: (v) => `g${v}_`, w: 14,
    names: ['RAIDER', 'RED RAIDER', 'DUSK RAIDER'],
  },
  skel: {
    hp: 9, spd: 1.25, dmg: 3, reach: 24, windT: 16, atkT: 13, cool: [40, 90],
    score: 300, down: false, spr: (v) => `sk${v}_`, w: 14, block: 0.4,
    names: ['BONE SOLDIER', 'BLOOD BONE'],
  },
  brute: {
    hp: 16, spd: 0.55, dmg: 6, reach: 28, windT: 40, atkT: 18, cool: [70, 130],
    score: 500, down: true, spr: (v) => `br${v}_`, w: 18,
    names: ['AXE BRUTE', 'IRON BRUTE'],
  },
  boss: {
    hp: 90, spd: 0.7, dmg: 7, reach: 40, windT: 34, atkT: 20, cool: [50, 100],
    score: 5000, down: true, spr: () => 'boss_', w: 34, boss: true,
    names: ['DEATH MOORE'],
  },
};

export function spawnEnemy(game, def) {
  const side = def.side || 1;
  const x = def.x ?? (side < 0 ? game.camX - 26 : game.camX + VIEW_W + 26);
  const y = def.y ?? rnd(GROUND_TOP + 10, GROUND_BOT - 4);

  if (def.t === 'thief') {
    const e = {
      t: 'thief', x, y, y0: y, z: 0, vz: 0, vx: 0, face: -side, dir: -side,
      hp: 4, hpMax: 4, state: 'run', st: 0, carry: 2 + (Math.random() < 0.4 ? 1 : 0),
      hostile: false, name: 'POTION THIEF', spd: 1.7, _hit: 0,
    };
    game.enemies.push(e);
    return e;
  }
  const k = EKIND[def.t];
  const v = def.v || 0;
  const e = {
    t: def.t, v, kind: k, x, y, z: 0, vz: 0, vx: 0, face: -side,
    hp: Math.round(k.hp * (1 + v * 0.3)), hpMax: Math.round(k.hp * (1 + v * 0.3)),
    spd: k.spd * (1 + v * 0.12),
    state: 'seek', st: 0, cool: rnd(20, 60), repick: 0, sidePref: -side, yJit: 0,
    hostile: true, name: k.names[Math.min(v, k.names.length - 1)],
    struck: false, _hit: 0,
  };
  game.enemies.push(e);
  if (def.beast) {
    const b = spawnBeast(game, x + side * 10, y);
    b.rider = e;
    e.riding = b;
  }
  return e;
}

export function spawnBeast(game, x, y) {
  const b = {
    t: 'beast', x, y, z: 0, vz: 0, face: -1, state: 'idle', st: 0,
    rider: null, hostile: false, moving: false, cool: 60, mountCool: 0, shy: 0,
    strikeId: 0, name: 'CHICKENLEG', _hit: 0,
  };
  game.enemies.push(b);
  return b;
}

export function damageEnemy(game, e, dmg, fromX, opts = {}) {
  if (e.gone || e.t === 'beast') return;
  if (e.state === 'down' || e.state === 'getup') return; // floor invulnerability
  const dir = e.x < fromX ? -1 : 1;

  if (e.t === 'thief') {
    game.hitstop = 3;
    game.addSpark(e.x, e.y - 12);
    game.sound.thiefSqueak();
    const drops = Math.min(e.carry, 1 + (Math.random() < 0.4 ? 1 : 0));
    for (let i = 0; i < drops; i++) {
      game.dropItem('potion', e.x + rnd(-10, 10), clamp(e.y + rnd(-6, 6), GROUND_TOP + 4, GROUND_BOT), 2.5);
    }
    e.carry -= drops;
    if (e.carry <= 0 && Math.random() < 0.5) game.dropItem('meat', e.x, e.y, 2.5);
    e.hp -= dmg;
    game.addScore(150);
    if (e.hp <= 0 || e.carry <= 0) { e.state = 'hurt'; e.st = 0; e.spd = 2.5; e.fleeing = true; }
    else { e.state = 'hurt'; e.st = 0; }
    return;
  }

  const k = e.kind;
  // skeletons block face-on attacks
  if (!opts.pierce && k.block && (e.state === 'seek' || e.state === 'wind')
      && Math.sign(fromX - e.x) === e.face && Math.random() < k.block) {
    e.state = 'block'; e.st = 0;
    game.sound.clink();
    game.hitstop = 2;
    e.x -= Math.sign(fromX - e.x) * 2;
    game.focus = e; game.focusT = 150;
    return;
  }

  e.hp -= dmg;
  game.focus = e; game.focusT = 150;
  game.hitstop = 3;
  game.addSpark(e.x + (fromX > e.x ? 4 : -4), e.y - e.z - 14);
  game.sound.hit();

  // knock enemy riders off their beast
  let down = !!opts.down;
  if (e.riding) {
    const b = e.riding;
    b.rider = null; e.riding = null; b.mountCool = 40;
    down = true;
    game.sound.dismount();
    game.sound.beastCry();
  }

  if (e.hp <= 0) {
    e.hp = 0; e.dead = true;
    e.state = 'down'; e.st = 0; e.vz = 3; e.z = Math.max(e.z, 0.1); e.vx = dir * 2;
    game.addScore(k.score * (1 + (e.v || 0)));
    game.sound.edie();
    if (k.boss) { game.sound.bossDie(); game.onBossDown(e); }
    else if (e.t === 'brute' && Math.random() < 0.3) game.dropItem('meat', e.x, e.y, 2);
    return;
  }

  // boss super-armor: shrugs off most stagger
  if (k.boss) {
    if (down && Math.random() < 0.4) {
      e.state = 'down'; e.st = 0; e.vz = 2.4; e.z = 0.1; e.vx = dir * 1.2;
      game.sound.thud();
    } else if (Math.random() < 0.35) {
      e.state = 'hurt'; e.st = 0;
    }
    return;
  }

  if (down) {
    e.state = 'down'; e.st = 0; e.vz = 2.6; e.z = Math.max(e.z, 0.1); e.vx = dir * 1.6;
    game.sound.thud();
  } else {
    e.state = 'hurt'; e.st = 0; e.vx = dir * 1.2;
  }
}

function updateThief(game, e) {
  e.st++;
  if (e.state === 'hurt') {
    if (e.st > 18) { e.state = 'run'; e.st = 0; }
    return;
  }
  e.x += e.dir * e.spd;
  e.face = e.dir;
  e.y = clamp(e.y0 + Math.sin(e.st * 0.09) * 12, GROUND_TOP + 4, GROUND_BOT);
  // sprinkle potions as he runs
  if (!e.fleeing && e.carry > 0 && e.st % 110 === 100 && Math.random() < 0.6) {
    e.carry--;
    game.dropItem('potion', e.x, e.y, 2);
  }
  const margin = 40;
  if (e.x < game.camX - margin || e.x > game.camX + VIEW_W + margin) e.gone = true;
}

function updateBeast(game, e, player) {
  e.st++;
  if (e.mountCool > 0) e.mountCool--;
  if (e.shy > 0) e.shy--;

  if (e.state === 'whip') {
    // tail whip strike window
    if (e.st >= 3 && e.st <= 10) {
      const owner = e.rider;
      if (owner === player) {
        for (const en of game.enemies) {
          if (en.t === 'beast' || en.gone || en._hit === ('b' + e.strikeId)) continue;
          if (!inDepth(e, en)) continue;
          const dxp = (en.x - e.x) * e.face;
          if (dxp < -4 || dxp > 38) continue;
          en._hit = 'b' + e.strikeId;
          damageEnemy(game, en, 3, e.x, { down: true, kb: 2.2 });
        }
      } else if (owner) {
        const dxp = (player.x - e.x) * e.face;
        if (dxp > -4 && dxp < 38 && inDepth(e, player) && player.z < 14) {
          if (player.damage(game, 4, e.x, true)) { /* hit */ }
        }
      }
    }
    if (e.st > 18) { e.state = 'idle'; e.st = 0; }
    return;
  }

  if (e.rider && e.rider.t === 'hero') return; // steered from Player.updateRiding

  if (e.rider) {
    // enemy cavalry AI
    const r = e.rider;
    r.x = e.x; r.y = e.y; r.z = 10;
    const dx = player.x - e.x, dy = player.y - e.y;
    const want = 30;
    e.face = dx > 0 ? 1 : -1;
    if (Math.abs(dx) > want) { e.x += Math.sign(dx) * 1.1; e.moving = true; } else e.moving = false;
    if (Math.abs(dy) > 4) { e.y += Math.sign(dy) * 0.8; e.moving = true; }
    e.y = clamp(e.y, GROUND_TOP + 4, GROUND_BOT);
    if (e.cool > 0) e.cool--;
    if (e.cool <= 0 && Math.abs(dx) < 40 && Math.abs(dy) < 10 && !['down', 'dying', 'getup'].includes(player.state)) {
      e.state = 'whip'; e.st = 0; e.strikeId++;
      e.cool = rnd(80, 140);
      game.sound.whip();
    }
  } else {
    // riderless: idle shuffle, drift away from the player a little when shy
    e.moving = false;
    if (e.shy > 0 && Math.abs(player.x - e.x) < 40) {
      e.x += Math.sign(e.x - player.x) * 0.6;
      e.moving = true;
    }
  }
}

export function updateEnemies(game) {
  const player = game.player;
  for (const e of game.enemies) {
    if (e.gone) continue;

    // shared physics
    if (e.z > 0 || e.vz !== 0) {
      e.z += e.vz; e.vz -= 0.3;
      if (e.z <= 0) { e.z = 0; e.vz = 0; }
    }
    if (e.vx) {
      e.x += e.vx; e.vx *= 0.86;
      if (Math.abs(e.vx) < 0.1) e.vx = 0;
    }

    if (e.t === 'thief') { updateThief(game, e); continue; }
    if (e.t === 'beast') { updateBeast(game, e, player); continue; }

    e.st++;
    const k = e.kind;

    if (e.dead) {
      if (e.st > 44) e.gone = true;
      continue;
    }
    if (e.riding) { e.face = e.riding.face; continue; } // beast AI moves the pair

    switch (e.state) {
      case 'seek': {
        e.repick--;
        if (e.repick <= 0) {
          e.repick = rnd(45, 100);
          const near = e.x < player.x ? -1 : 1;
          e.sidePref = Math.random() < 0.3 ? -near : near; // sometimes circle behind
          e.yJit = rnd(-8, 8);
        }
        const tx = player.x + e.sidePref * (k.reach - 2);
        const ty = clamp(player.y + e.yJit, GROUND_TOP + 4, GROUND_BOT);
        if (Math.abs(tx - e.x) > 2) e.x += Math.sign(tx - e.x) * e.spd;
        if (Math.abs(ty - e.y) > 1.5) e.y += Math.sign(ty - e.y) * e.spd * 0.8;
        e.face = player.x > e.x ? 1 : -1;
        if (e.cool > 0) e.cool--;
        const dxp = (player.x - e.x) * e.face;
        if (e.cool <= 0 && dxp > 0 && dxp < k.reach + 6 && Math.abs(player.y - e.y) < 10
            && !['down', 'dying', 'getup'].includes(player.state)) {
          e.state = 'wind'; e.st = 0;
        }
        break;
      }
      case 'wind': {
        let wt = k.windT;
        if (k.boss) wt -= game.bossPhase(e) * 8;
        if (e.st >= wt) { e.state = 'atk'; e.st = 0; e.struck = false; game.sound.slash(); }
        break;
      }
      case 'atk': {
        if (e.st < 8) e.x += e.face * (k.boss ? 1.6 : 1.1);
        if (!e.struck && e.st >= 2 && e.st <= k.atkT - 4) {
          const dxp = (player.x - e.x) * e.face;
          if (dxp > -4 && dxp < k.reach + 8 && inDepth(e, player) && player.z < 16) {
            e.struck = true;
            player.damage(game, k.dmg, e.x, k.down);
          }
        }
        if (e.st >= k.atkT) {
          e.state = 'seek';
          e.cool = rnd(k.cool[0], k.cool[1]) / (k.boss ? 1 + game.bossPhase(e) * 0.4 : 1);
          // Death Moore phase 2+: hurls a ground shockwave after a swing
          if (k.boss && game.bossPhase(e) >= 1 && Math.random() < 0.5) {
            game.shots.push({ x: e.x + e.face * 24, y: e.y, vx: e.face * 2.6, t: 0 });
            game.sound.bossRoar();
          }
        }
        break;
      }
      case 'hurt':
        if (e.st > 14) { e.state = 'seek'; e.cool = Math.max(e.cool, rnd(16, 40)); }
        break;
      case 'block':
        if (e.st > 14) { e.state = 'seek'; e.cool = Math.min(e.cool, 8); }
        break;
      case 'down':
        if (e.z <= 0 && e.st > 55) { e.state = 'getup'; e.st = 0; }
        break;
      case 'getup':
        if (e.st > 18) {
          e.state = 'seek';
          e.cool = rnd(24, 60);
          if (k.boss && game.bossPhase(e) >= 1) game.sound.bossRoar();
        }
        break;
    }
    e.y = clamp(e.y, GROUND_TOP + 4, GROUND_BOT);

    // gentle separation so enemies do not stack
    for (const o of game.enemies) {
      if (o === e || o.gone || o.t === 'thief' || o.t === 'beast' || o.dead) continue;
      if (Math.abs(o.x - e.x) < 12 && Math.abs(o.y - e.y) < 7) {
        e.x += e.x < o.x ? -0.4 : 0.4;
        e.y += e.y < o.y ? -0.25 : 0.25;
      }
    }
  }
  game.enemies = game.enemies.filter((e) => !e.gone);
}

// ---------------- enemy drawing ----------------

export function drawEnemy(game, ctx, e) {
  const cam = game.camX;
  if (e.riding) return; // riders are drawn on the beast's back
  if (e.t === 'thief') {
    const spr = e.state === 'hurt' ? 'th_hurt' : ['th_run1', 'th_run2'][(game.frame >> 3) % 2];
    const { w, h } = sprSize(spr);
    drawShadow(ctx, e.x - cam, e.y, 12);
    drawSprite(ctx, spr, e.x - cam - w / 2, e.y - e.z - h, e.face < 0, e.state === 'hurt' && e.st % 4 < 2);
    return;
  }
  if (e.t === 'beast') {
    let spr = 'beast_stand';
    if (e.state === 'whip') spr = 'beast_whip';
    else if (e.moving) spr = ['beast_walk1', 'beast_stand', 'beast_walk2', 'beast_stand'][(game.frame >> 3) % 4];
    const { w, h } = sprSize(spr);
    drawShadow(ctx, e.x - cam, e.y, 26);
    drawSprite(ctx, spr, e.x - cam - w / 2, e.y - e.z - h, e.face < 0);
    // whip arc
    if (e.state === 'whip' && e.st >= 2 && e.st <= 12) {
      drawSlash(ctx, e.x - cam + e.face * 16, e.y - 10, e.face, (e.st - 2) / 10, true, '#88e8f8');
    }
    // rider drawn on the beast's back
    const r = e.rider;
    if (r) {
      const spr2 = r.t === 'hero' ? 'h_ride' : e.rider.kind.spr(r.v) + 'idle';
      const s2 = sprSize(spr2);
      const bob = e.moving ? ((game.frame >> 3) % 2) : 0;
      drawSprite(ctx, spr2, e.x - cam - s2.w / 2 - e.face * 2, e.y - s2.h - 5 + bob, e.face < 0);
    }
    return;
  }

  const k = e.kind;
  const base = k.spr(e.v || 0);
  let spr = base + 'idle';
  const moving = e.state === 'seek';
  if (moving) spr = [base + 'walk1', base + 'idle', base + 'walk2', base + 'idle'][(game.frame >> 3) % 4];
  else if (e.state === 'wind') spr = base + 'wind';
  else if (e.state === 'atk') spr = base + 'atk';
  else if (e.state === 'hurt') spr = base + 'hurt';
  else if (e.state === 'block') spr = base + 'block';
  else if (e.state === 'down') spr = base + 'down';
  else if (e.state === 'getup') spr = e.st < 9 ? base + 'down' : base + 'idle';

  if (e.dead && e.st > 20 && e.st % 4 < 2) return; // death flicker
  const { w, h } = sprSize(spr);
  drawShadow(ctx, e.x - cam, e.y, k.boss ? 30 : 16);
  const white = (e.state === 'hurt' && e.st % 4 < 2)
    || (e.state === 'wind' && e.st % 8 < 3) // telegraph flash
    || (e.dead && e.st % 6 < 3);
  drawSprite(ctx, spr, e.x - cam - w / 2, e.y - e.z - h, e.face < 0, white);
  if (e.state === 'atk' && e.st < 10) {
    drawSlash(ctx, e.x - cam + e.face * (k.boss ? 20 : 8), e.y - e.z - (k.boss ? 24 : 12), e.face, e.st / 10, k.boss, '#d8d8e8');
  }
}

// ---------------- items ----------------

export function updateItems(game) {
  const p = game.player;
  for (const it of game.items) {
    it.age++;
    if (it.z > 0 || it.vz !== 0) {
      it.z += it.vz; it.vz -= 0.25;
      if (it.z <= 0) {
        it.z = 0;
        if (Math.abs(it.vz) > 1) { it.vz = -it.vz * 0.4; } else it.vz = 0;
      }
    }
    if (it.age > 999) { it.gone = true; continue; }
    if (it.z <= 2 && !['down', 'dying'].includes(p.state)
        && Math.abs(p.x - it.x) < 11 && Math.abs(p.y - it.y) < 9 && p.z < 6) {
      it.gone = true;
      if (it.t === 'potion') {
        game.vials = Math.min(6, game.vials + 1);
        game.addScore(100);
        game.sound.potion();
      } else {
        p.hp = Math.min(p.hpMax, p.hp + 12);
        game.addScore(100);
        game.sound.meat();
      }
    }
  }
  game.items = game.items.filter((it) => !it.gone);
}

export function drawItem(game, ctx, it) {
  if (it.age > 880 && (it.age >> 2) % 2) return; // expiring flicker
  const spr = it.t;
  const { w, h } = sprSize(spr);
  drawShadow(ctx, it.x - game.camX, it.y, 8);
  drawSprite(ctx, spr, it.x - game.camX - w / 2, it.y - it.z - h, false);
}

// ---------------- fx ----------------

export function updateFx(game) {
  for (const f of game.fx) f.tt++;
  game.fx = game.fx.filter((f) => f.tt < f.life);
}

export function drawFx(game, ctx, f) {
  if (f.kind === 'spark') drawSpark(ctx, f.x - game.camX, f.y, f.tt);
}
