// game.js — gameplay: player, third-person + lock-on camera, combat (sword,
// spin, shield, roll), items (bow/arrows, bombs), enemies + boss AI, dungeon
// puzzles (block/switch, bow-crystal, keys, doors), pickups, area transitions
// and the win state. Renders all dynamic entities as composed low-poly boxes.

import { mat4 } from './gl.js';
import { buildVillage, buildField, buildDungeon, LIGHTS } from './world.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function angLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU) - Math.PI;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

// palette
const C = {
  tunic: [0.20, 0.55, 0.24], tunicD: [0.14, 0.42, 0.18], skin: [0.90, 0.74, 0.58],
  cap: [0.18, 0.5, 0.22], boot: [0.35, 0.24, 0.14], sword: [0.85, 0.88, 0.95],
  hilt: [0.7, 0.6, 0.2], shield: [0.55, 0.25, 0.22], shieldRim: [0.8, 0.75, 0.35],
  blin: [0.45, 0.55, 0.30], blinD: [0.32, 0.42, 0.22], club: [0.4, 0.28, 0.16],
  bat: [0.25, 0.20, 0.30], eye: [0.95, 0.85, 0.2],
  boss: [0.45, 0.30, 0.32], bossD: [0.30, 0.18, 0.22], bossEye: [0.95, 0.35, 0.25],
  flame: [1.0, 0.6, 0.15], flameC: [1.0, 0.85, 0.4],
  gate: [0.55, 0.45, 0.25], stone: [0.30, 0.28, 0.34], door: [0.45, 0.30, 0.18],
  chest: [0.55, 0.38, 0.18], chestLid: [0.7, 0.55, 0.25], gold: [0.95, 0.8, 0.25],
  crystal: [0.4, 0.85, 0.95], crystalOff: [0.9, 0.3, 0.35],
  heart: [0.95, 0.25, 0.30], relic: [0.55, 0.85, 0.95],
};
const RUPEE_COL = { green: [0.3, 0.9, 0.4], blue: [0.35, 0.6, 0.95], red: [0.95, 0.4, 0.4] };
const RUPEE_VAL = { green: 1, blue: 5, red: 20 };

export class Game {
  constructor(renderer, input, audio) {
    this.r = renderer; this.input = input; this.audio = audio;
    this.mode = 'title';       // title|play|dialogue|shop|win|gameover|paused
    this.areas = {};
    this.cur = null;
    this.time = 0;
    this.msg = null; this.msgT = 0;
    this.flash = 0;
    this.dialogue = null; this.shop = null;
    this.player = {
      x: 0, y: 0, z: 6, yaw: Math.PI / 2, vx: 0, vz: 0,
      hearts: 3, maxHearts: 3, rupees: 0, arrows: 0, bombs: 0,
      smallkeys: 0, hasBow: false, hasBossKey: false, hasRelic: false,
      item: 'bombs', invuln: 0, hurtT: 0,
      atk: 0, atkType: 'slash', charge: 0, spinReady: false,
      roll: 0, rollDir: [1, 0], rollCd: 0, blocking: false, anim: 0, dead: false,
    };
    this.cam = { yaw: Math.PI / 2, pitch: 0.5, dist: 8, curYaw: Math.PI / 2, curPitch: 0.5, eye: [0, 5, 12], target: [0, 1, 0] };
    this.lock = null;          // locked enemy/boss ref
    this.enemies = []; this.projectiles = []; this.pickups = []; this.effects = [];
    this.dyn = null;           // dynamic dungeon object state
    this.boss = null;
    this.won = false;
  }

  // ---- area management ----------------------------------------------------
  ensureArea(name) {
    if (this.areas[name]) return this.areas[name];
    const a = name === 'village' ? buildVillage(this.r)
      : name === 'field' ? buildField(this.r) : buildDungeon(this.r);
    this.areas[name] = a;
    return a;
  }

  setArea(name, spawnKey) {
    const a = this.ensureArea(name);
    this.cur = a;
    this.enemies = []; this.projectiles = []; this.effects = [];
    this.lock = null; this.boss = null;
    // pickups (fresh copy so respawn on revisit is fine for demo)
    this.pickups = (a.pickups || []).map(p => ({ ...p, taken: false, bob: Math.random() * TAU }));
    // dynamic dungeon objects
    if (name === 'dungeon') this._initDungeon(a);
    else this.dyn = null;
    // enemies
    for (const e of (a.enemies || [])) this.spawnEnemy(e.kind, e.x, e.z);
    // spawn player
    const s = a.spawns[spawnKey] || Object.values(a.spawns)[0];
    this.player.x = s.x; this.player.z = s.z; this.player.y = 0; this.player.yaw = s.yaw;
    // Camera sits BEHIND the player looking forward: eye = player - dir(camYaw)*dist,
    // so camYaw must equal the player's facing (not the opposite).
    this.cam.yaw = s.yaw; this.cam.curYaw = this.cam.yaw;
    this.audio.setTrack(name === 'dungeon' ? 'dungeon' : name === 'village' ? 'village' : 'overworld');
  }

  _initDungeon(a) {
    this.dyn = {
      gates: a.gates.map(g => ({ ...g })),
      blocks: a.blocks.map(b => ({ ...b })),
      switches: a.switches.map(s => ({ ...s })),
      crystals: a.crystals.map(c => ({ ...c })),
      lockedDoors: a.lockedDoors.map(d => ({ ...d })),
      bossDoor: { ...a.bossDoor },
      chests: a.chests.map(c => ({ ...c })),
      cracked: (a.cracked || []).map(c => ({ ...c, gone: false })),
      torches: a.torches, bossSpawned: false, relicSpawned: false,
    };
  }

  startGame() {
    this.mode = 'play';
    this.won = false;
    Object.assign(this.player, {
      hearts: 3, maxHearts: 3, rupees: 0, arrows: 0, bombs: 0, smallkeys: 0,
      hasBow: false, hasBossKey: false, hasRelic: false, item: 'bombs', dead: false,
    });
    this.setArea('village', 'start');
    this.showMsg('Moore Village', 2.2);
    this.audio.resume();
  }

  showMsg(t, dur) { this.msg = t; this.msgT = dur || 2.0; }

  // ---- spawns -------------------------------------------------------------
  spawnEnemy(kind, x, z) {
    const base = { kind, x, y: kind === 'bat' ? 1.6 : 0, z, yaw: 0, vx: 0, vz: 0, state: 'idle', timer: 0, anim: Math.random() * TAU, hurt: 0, dead: false, aggro: false, kb: 0 };
    if (kind === 'bat') Object.assign(base, { hp: 2, maxhp: 2 });
    else Object.assign(base, { hp: 3, maxhp: 3 });
    this.enemies.push(base);
    return base;
  }

  spawnBoss() {
    const a = this.cur;
    const p = a.boss;
    this.boss = {
      x: p.x, y: 0, z: p.z, yaw: -Math.PI / 2, hp: 12, maxhp: 12, phase: 1,
      state: 'idle', timer: 1.2, eyeOpen: 0, eyeTimer: 2.5, legPhase: 0, dead: false, hurt: 0,
      vx: 0, vz: 0, addCd: 6,
    };
    if (this.dyn) this.dyn.bossSpawned = true;
    this.audio.setTrack('boss');
    this.audio.sfx('roar');
    this.showMsg('Gohma-Moore awakens!', 2.5);
    this.lock = this.boss;
    return this.boss;
  }

  // ---- test helpers -------------------------------------------------------
  teleport(area, key) { this.mode = 'play'; this.setArea(area, key || Object.keys(this.ensureArea(area).spawns)[0]); }
  toField() { this.teleport('field', 'fromVillage'); }
  toDungeon() { this.player.hasBow = true; this.player.smallkeys = 1; this.teleport('dungeon', 'entry'); }
  toBoss() {
    this.player.hasBow = true; this.player.arrows = 30; this.player.hasBossKey = true;
    this.teleport('dungeon', 'boss');
    if (this.dyn) { this.dyn.bossDoor.locked = false; }
    this.spawnBoss();
  }

  // ---- collision ----------------------------------------------------------
  _activeColliders() {
    const list = this.cur.colliders.slice();
    if (this.dyn) {
      for (const g of this.dyn.gates) if (!g.open) list.push(this._barAABB(g));
      for (const d of this.dyn.lockedDoors) if (d.locked) list.push(this._barAABB(d));
      if (this.dyn.bossDoor.locked) list.push(this._barAABB(this.dyn.bossDoor));
      for (const b of this.dyn.blocks) list.push({ x0: b.x - b.size / 2, z0: b.z - b.size / 2, x1: b.x + b.size / 2, z1: b.z + b.size / 2, block: b });
      for (const c of this.dyn.cracked) if (!c.gone) list.push({ cx: c.x, cz: c.z, r: 0.9 });
    }
    return list;
  }
  _barAABB(g) {
    const t = 0.6;
    if (g.axis === 'x') return { x0: g.x - g.w / 2, z0: g.z - t, x1: g.x + g.w / 2, z1: g.z + t };
    return { x0: g.x - t, z0: g.z - g.w / 2, x1: g.x + t, z1: g.z + g.w / 2 };
  }

  // resolve a circle against colliders; returns {x,z, pushBlock?}
  _resolve(x, z, r, colliders, allowPush) {
    for (let iter = 0; iter < 2; iter++) {
      for (const c of colliders) {
        if (c.cx != null) {
          const dx = x - c.cx, dz = z - c.cz, d = Math.hypot(dx, dz), rr = r + c.r;
          if (d < rr && d > 0.0001) { const p = (rr - d); x += dx / d * p; z += dz / d * p; }
        } else {
          const nx = clamp(x, c.x0, c.x1), nz = clamp(z, c.z0, c.z1);
          const dx = x - nx, dz = z - nz, d = Math.hypot(dx, dz);
          if (d < r) {
            if (c.block && allowPush) { this._tryPushBlock(c.block, x, z); }
            if (d > 0.0001) { const p = (r - d); x += dx / d * p; z += dz / d * p; }
            else {
              // inside: push out along nearest edge
              const left = x - c.x0, right = c.x1 - x, top = z - c.z0, bot = c.z1 - z;
              const m = Math.min(left, right, top, bot);
              if (m === left) x = c.x0 - r; else if (m === right) x = c.x1 + r;
              else if (m === top) z = c.z0 - r; else z = c.z1 + r;
            }
          }
        }
      }
    }
    return { x, z };
  }

  _tryPushBlock(b, px, pz) {
    // push direction = from player toward block center, axis-aligned to dominant axis
    let dx = b.x - px, dz = b.z - pz;
    let mvx = 0, mvz = 0;
    if (Math.abs(dx) > Math.abs(dz)) mvx = Math.sign(dx) * 0.04; else mvz = Math.sign(dz) * 0.04;
    const nx = b.x + mvx, nz = b.z + mvz;
    // block collision vs walls (exclude blocks & dynamic)
    const walls = this.cur.colliders;
    let ok = true;
    for (const c of walls) {
      if (c.cx != null) { if (Math.hypot(nx - c.cx, nz - c.cz) < c.r + b.size / 2) { ok = false; break; } }
      else {
        const cx = clamp(nx, c.x0, c.x1), cz = clamp(nz, c.z0, c.z1);
        if (Math.abs(nx - cx) < b.size / 2 && Math.abs(nz - cz) < b.size / 2) { ok = false; break; }
      }
    }
    if (ok) { b.x = nx; b.z = nz; this._checkSwitches(); }
  }

  _checkSwitches() {
    if (!this.dyn) return;
    for (const s of this.dyn.switches) {
      let on = false;
      for (const b of this.dyn.blocks) if (Math.hypot(b.x - s.x, b.z - s.z) < s.r) on = true;
      if (Math.hypot(this.player.x - s.x, this.player.z - s.z) < s.r) on = true;
      if (on && !s.pressed) { s.pressed = true; this._openGate(s.opens); }
    }
  }
  _openGate(id) {
    const g = this.dyn.gates.find(g => g.id === id);
    if (g && !g.open) { g.open = true; this.audio.sfx('door'); this.showMsg('A gate opens!', 1.6); }
  }

  // ---- main update --------------------------------------------------------
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.input.sample();
    if (this.msgT > 0) this.msgT -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.5);

    if (this.input.pressed('mute')) { const m = this.audio.toggleMute(); this.showMsg(m ? 'Muted' : 'Sound on', 1); }

    if (this.mode === 'title') { if (this.input.pressed('action') || this.input.pressed('attack') || this.input.pressed('start')) this.startGame(); this.input.endFrame(); return; }
    if (this.mode === 'win' || this.mode === 'gameover') {
      if (this.input.pressed('action') || this.input.pressed('start')) { this.mode = 'title'; }
      this.input.endFrame(); return;
    }
    if (this.mode === 'dialogue') { this._updateDialogue(); this.input.endFrame(); return; }
    if (this.mode === 'shop') { this._updateShop(); this.input.endFrame(); return; }
    if (this.mode === 'paused') { if (this.input.pressed('pause')) this.mode = 'play'; this.input.endFrame(); return; }

    if (this.input.pressed('pause')) { this.mode = 'paused'; this.input.endFrame(); return; }
    if (this.input.pressed('ocarina')) this.audio.sfx('ocarina');

    this._updatePlay(dt);
    this.input.endFrame();
  }

  _updatePlay(dt) {
    const p = this.player;
    // timers
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.rollCd > 0) p.rollCd -= dt;

    this._updateLock();
    this._updateItemSelect();
    this._updateMovement(dt);
    this._updateCombat(dt);
    this.updateCamera(dt);
    this._updateEnemies(dt);
    this._updateBoss(dt);
    this._updateProjectiles(dt);
    this._updatePickups(dt);
    this._updateEffects(dt);
    this._updateTriggers();
    if (this.input.pressed('action')) this._interact();
    this._checkSwitches();
  }

  _updateLock() {
    if (this.input.pressed('target')) {
      if (this.lock) { this.lock = null; }
      else {
        const t = this._nearestTarget();
        if (t) { this.lock = t; this.audio.sfx('lock'); }
      }
    }
    if (this.lock && (this.lock.dead || this.lock.hp <= 0)) this.lock = null;
    // drop lock if target far
    if (this.lock) { const d = Math.hypot(this.lock.x - this.player.x, this.lock.z - this.player.z); if (d > 24) this.lock = null; }
  }
  _nearestTarget() {
    const p = this.player; let best = null, bd = 16;
    const cands = this.boss && !this.boss.dead ? this.enemies.concat([this.boss]) : this.enemies;
    for (const e of cands) {
      if (e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  _updateItemSelect() {
    if (this.input.pressed('cycle')) {
      const opts = [];
      if (this.player.hasBow) opts.push('bow');
      opts.push('bombs');
      if (opts.length) {
        let i = opts.indexOf(this.player.item);
        this.player.item = opts[(i + 1) % opts.length];
        this.audio.sfx('menu');
        this.showMsg('Item: ' + (this.player.item === 'bow' ? 'Bow' : 'Bombs'), 1);
      }
    }
  }

  _updateMovement(dt) {
    const p = this.player, inp = this.input;
    // rolling: locked dash with i-frames
    if (p.roll > 0) {
      p.roll -= dt;
      const sp = 11 * (p.roll / 0.38);
      this._move(p.rollDir[0] * sp * dt, p.rollDir[1] * sp * dt);
      p.anim += dt * 10;
      return;
    }
    p.blocking = inp.held('block') && p.atk <= 0;

    const mv = inp.move;
    const mag = Math.hypot(mv.x, mv.y);
    // camera basis
    const cy = this.cam.curYaw;
    const fwd = [Math.cos(cy), Math.sin(cy)];
    const right = [Math.cos(cy + Math.PI / 2), Math.sin(cy + Math.PI / 2)];
    let wx = 0, wz = 0;
    if (this.lock) {
      // strafe relative to target
      const tx = this.lock.x - p.x, tz = this.lock.z - p.z;
      const tl = Math.hypot(tx, tz) || 1;
      const tf = [tx / tl, tz / tl];
      const tr = [tf[1], -tf[0]];
      wx = tf[0] * mv.y + tr[0] * mv.x;
      wz = tf[1] * mv.y + tr[1] * mv.x;
      p.yaw = Math.atan2(tf[1], tf[0]);
    } else {
      wx = fwd[0] * mv.y + right[0] * mv.x;
      wz = fwd[1] * mv.y + right[1] * mv.x;
      if (mag > 0.05) p.yaw = Math.atan2(wz, wx);
    }
    let speed = 6.2;
    if (p.blocking) speed = 2.2;
    if (p.atk > 0) speed = 1.5;
    const step = speed * dt * Math.min(1, mag);
    if (mag > 0.02) this._move(wx * step, wz * step);
    p.anim += dt * (mag > 0.05 ? 9 : 0);
    if (mag <= 0.05) p.anim = 0;

    // roll trigger
    if (inp.pressed('roll') && p.rollCd <= 0 && p.roll <= 0) {
      let dx = wx, dz = wz;
      if (Math.hypot(dx, dz) < 0.1) { dx = Math.cos(p.yaw); dz = Math.sin(p.yaw); }
      const l = Math.hypot(dx, dz) || 1;
      p.rollDir = [dx / l, dz / l];
      p.roll = 0.38; p.rollCd = 0.6; p.invuln = Math.max(p.invuln, 0.35);
      this.audio.sfx('roll');
    }
  }

  _move(dx, dz) {
    const p = this.player;
    const cols = this._activeColliders();
    let nx = p.x + dx, nz = p.z + dz;
    const res = this._resolve(nx, nz, 0.45, cols, true);
    p.x = res.x; p.z = res.z;
  }

  _updateCombat(dt) {
    const p = this.player, inp = this.input;
    if (p.atk > 0) p.atk -= dt;

    // charge for spin
    if (inp.held('attack') && p.roll <= 0 && !p.blocking) {
      p.charge += dt;
      if (p.charge > 0.55) p.spinReady = true;
    }
    if (inp.pressed('attack') && p.atk <= 0 && p.roll <= 0 && !p.blocking) {
      this._doSlash();
    }
    // release: spin if charged
    if (!inp.held('attack')) {
      if (p.spinReady && p.atk <= 0.15) { this._doSpin(); }
      p.charge = 0; p.spinReady = false;
    }

    // item use
    if (inp.pressed('item') && p.atk <= 0 && p.roll <= 0) this._useItem();
  }

  _doSlash() {
    const p = this.player;
    p.atk = 0.28; p.atkType = 'slash';
    this.audio.sfx('sword');
    this._meleeHit(2.3, Math.PI * 0.7, 2);
  }
  _doSpin() {
    const p = this.player;
    p.atk = 0.45; p.atkType = 'spin'; p.charge = 0; p.spinReady = false;
    this.audio.sfx('spin');
    this._meleeHit(3.0, Math.PI * 2, 3);
    this.effects.push({ kind: 'ring', x: p.x, y: 0.3, z: p.z, t: 0.4, max: 0.4 });
  }
  _meleeHit(range, arc, dmg) {
    const p = this.player;
    const fx = Math.cos(p.yaw), fz = Math.sin(p.yaw);
    const targets = this.boss && !this.boss.dead ? this.enemies.concat([this.boss]) : this.enemies;
    for (const e of targets) {
      if (e.dead || e.hp <= 0) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      const er = e === this.boss ? 3.2 : 0.9;
      if (d > range + er) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (arc < TAU && dot < Math.cos(arc / 2)) continue;
      if (e === this.boss) this._hitBoss(dmg, true);
      else this._hurtEnemy(e, dmg, dx, dz);
    }
    this.effects.push({ kind: 'slash', x: p.x + fx, y: 1, z: p.z + fz, yaw: p.yaw, t: 0.18, max: 0.18 });
  }

  _hurtEnemy(e, dmg, dx, dz) {
    e.hp -= dmg; e.hurt = 0.18; e.aggro = true;
    const d = Math.hypot(dx, dz) || 1;
    e.kb = 0.6; e.kbx = dx / d; e.kbz = dz / d;
    this.audio.sfx('enemyhit');
    if (e.hp <= 0) { e.dead = true; this._enemyDeath(e); }
  }
  _enemyDeath(e) {
    this.effects.push({ kind: 'poof', x: e.x, y: 0.8, z: e.z, t: 0.3, max: 0.3 });
    if (this.lock === e) this.lock = null;
    // drops
    const r = Math.random();
    if (r < 0.4) this.pickups.push({ type: 'rupee', color: r < 0.1 ? 'blue' : 'green', x: e.x, z: e.z, bob: 0, taken: false });
    else if (r < 0.55 && this.player.hearts < this.player.maxHearts) this.pickups.push({ type: 'heart', x: e.x, z: e.z, bob: 0, taken: false });
  }

  _useItem() {
    const p = this.player;
    if (p.item === 'bow') {
      if (!p.hasBow) { this.showMsg('No bow yet', 1); return; }
      if (p.arrows <= 0) { this.showMsg('No arrows!', 1); this.audio.sfx('menu'); return; }
      p.arrows--; p.atk = 0.2;
      this.audio.sfx('bow');
      // aim toward lock or nearest, else facing
      let dir = [Math.cos(p.yaw), 0, Math.sin(p.yaw)];
      const t = this.lock || this._nearestTarget();
      if (t) { const dx = t.x - p.x, dy = (t === this.boss ? 2 : 1.2) - 1.2, dz = t.z - p.z; const l = Math.hypot(dx, dy, dz) || 1; dir = [dx / l, dy / l, dz / l]; }
      this.projectiles.push({ kind: 'arrow', x: p.x + dir[0] * 0.6, y: 1.2, z: p.z + dir[2] * 0.6, vx: dir[0] * 26, vy: dir[1] * 26, vz: dir[2] * 26, life: 1.6 });
    } else { // bombs
      if (p.bombs <= 0) { this.showMsg('No bombs!', 1); this.audio.sfx('menu'); return; }
      p.bombs--;
      const fx = Math.cos(p.yaw), fz = Math.sin(p.yaw);
      this.projectiles.push({ kind: 'bomb', x: p.x + fx, y: 0.6, z: p.z + fz, vx: fx * 5, vy: 4, vz: fz * 5, fuse: 1.6 });
      this.audio.sfx('menu');
    }
  }

  _updateProjectiles(dt) {
    for (const pr of this.projectiles) {
      if (pr.dead) continue;
      if (pr.kind === 'arrow') {
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt; pr.life -= dt;
        // hit enemies
        const targets = this.boss && !this.boss.dead ? this.enemies.concat([this.boss]) : this.enemies;
        for (const e of targets) {
          if (e.dead || e.hp <= 0) continue;
          const er = e === this.boss ? 2.6 : 0.8;
          if (Math.hypot(e.x - pr.x, e.z - pr.z) < er && Math.abs((e === this.boss ? 1.8 : 1) - pr.y) < 2.2) {
            if (e === this.boss) this._hitBoss(3, false, pr);
            else this._hurtEnemy(e, 3, pr.vx, pr.vz);
            pr.dead = true; break;
          }
        }
        if (pr.dead) continue;
        // hit crystal switches
        if (this.dyn) for (const cr of this.dyn.crystals) {
          if (!cr.hit && Math.hypot(cr.x - pr.x, cr.z - pr.z) < 1.0 && Math.abs(cr.y - pr.y) < 1.0) {
            cr.hit = true; pr.dead = true; this._openGate(cr.opens); this.audio.sfx('secret');
          }
        }
        // hit walls
        if (!pr.dead) { const res = this._resolve(pr.x, pr.z, 0.2, this.cur.colliders, false); if (res.x !== pr.x || res.z !== pr.z) pr.dead = true; }
        if (pr.life <= 0) pr.dead = true;
      } else if (pr.kind === 'bomb') {
        pr.vy -= 16 * dt;
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt;
        if (pr.y < 0.3) { pr.y = 0.3; pr.vx *= 0.4; pr.vz *= 0.4; pr.vy = 0; }
        pr.fuse -= dt;
        if (pr.fuse <= 0) { this._explode(pr.x, pr.z); pr.dead = true; }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  _explode(x, z) {
    this.audio.sfx('bomb');
    this.effects.push({ kind: 'boom', x, y: 0.6, z, t: 0.4, max: 0.4 });
    this.flash = 0.5;
    const R = 3.4;
    const targets = this.boss && !this.boss.dead ? this.enemies.concat([this.boss]) : this.enemies;
    for (const e of targets) {
      if (e.dead || e.hp <= 0) continue;
      if (Math.hypot(e.x - x, e.z - z) < R) {
        if (e === this.boss) this._hitBoss(2, false);
        else this._hurtEnemy(e, 4, e.x - x, e.z - z);
      }
    }
    // cracked walls
    if (this.dyn) for (const c of this.dyn.cracked) {
      if (!c.gone && Math.hypot(c.x - x, c.z - z) < R + 0.6) { c.gone = true; this._breakCracked(c); }
    }
    if (this.cur.cracked) for (const c of this.cur.cracked) {
      if (!c.gone && Math.hypot(c.x - x, c.z - z) < R + 0.6) { c.gone = true; this._breakCracked(c); }
    }
    // damage player if close
    const p = this.player;
    if (Math.hypot(p.x - x, p.z - z) < R && p.invuln <= 0) this._hurtPlayer(1, p.x - x, p.z - z);
  }
  _breakCracked(c) {
    this.audio.sfx('secret'); this.showMsg('Secret found!', 1.6);
    for (const d of (c.drops || [])) {
      if (d === 'heart') this.pickups.push({ type: 'heart', x: c.x + (Math.random() - 0.5), z: c.z + (Math.random() - 0.5) * 0.5, bob: 0, taken: false });
      else this.pickups.push({ type: 'rupee', color: 'blue', x: c.x + (Math.random() - 0.5) * 2, z: c.z + (Math.random() - 0.5), bob: 0, taken: false });
    }
  }

  // ---- enemies ------------------------------------------------------------
  _updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.hurt > 0) e.hurt -= dt;
      e.anim += dt * 6;
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1;
      if (d < 9) e.aggro = true;
      if (e.aggro) e.yaw = Math.atan2(dz, dx);

      if (e.kb > 0) { e.kb -= dt * 3; this._moveEnemy(e, e.kbx * 6 * dt, e.kbz * 6 * dt); continue; }

      if (e.kind === 'bat') {
        // erratic flight, dive
        e.y = 1.4 + Math.sin(e.anim * 1.3) * 0.5;
        if (e.aggro) {
          const sp = 3.4;
          this._moveEnemy(e, dx / d * sp * dt + Math.cos(e.anim * 2) * 0.4 * dt, dz / d * sp * dt + Math.sin(e.anim * 2) * 0.4 * dt);
          if (d < 1.2 && p.invuln <= 0) this._hurtPlayer(1, -dx, -dz);
        }
      } else { // blin
        if (!e.aggro) continue;
        if (e.state === 'idle' || e.state === 'chase') {
          if (d > 1.7) { const sp = 2.6; this._moveEnemy(e, dx / d * sp * dt, dz / d * sp * dt); e.state = 'chase'; }
          else { e.state = 'windup'; e.timer = 0.45; }
        } else if (e.state === 'windup') {
          e.timer -= dt;
          if (e.timer <= 0) { e.state = 'strike'; e.timer = 0.25; }
        } else if (e.state === 'strike') {
          e.timer -= dt;
          if (e.timer > 0.12 && d < 2.2) {
            if (p.blocking && this._facing(p, e)) { this.audio.sfx('block'); e.kb = 0.4; e.kbx = -dx / d; e.kbz = -dz / d; e.state = 'chase'; }
            else if (p.invuln <= 0) this._hurtPlayer(1, -dx, -dz);
          }
          if (e.timer <= 0) { e.state = 'cool'; e.timer = 0.5; }
        } else if (e.state === 'cool') { e.timer -= dt; if (e.timer <= 0) e.state = 'chase'; }
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead || e.hurt > -1);
    this.enemies = this.enemies.filter(e => !e.dead);
  }
  _moveEnemy(e, dx, dz) {
    const cols = this.cur.colliders;
    const res = this._resolve(e.x + dx, e.z + dz, 0.5, cols, false);
    e.x = res.x; e.z = res.z;
  }
  _facing(p, e) {
    const fx = Math.cos(p.yaw), fz = Math.sin(p.yaw);
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
    return (fx * dx + fz * dz) / d > 0.2;
  }

  // ---- boss ---------------------------------------------------------------
  _updateBoss(dt) {
    const b = this.boss; if (!b || b.dead) return;
    const p = this.player;
    b.legPhase += dt * 4;
    if (b.hurt > 0) b.hurt -= dt;
    const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz) || 1;
    b.yaw = angLerp(b.yaw, Math.atan2(dz, dx), 0.05);

    // eye open/close cycle
    b.eyeTimer -= dt;
    if (b.eyeTimer <= 0) {
      if (b.eyeOpen > 0) { b.eyeOpen = 0; b.eyeTimer = b.phase === 2 ? 1.6 : 2.4; }
      else { b.eyeOpen = 1; b.eyeTimer = b.phase === 2 ? 2.4 : 1.6; }
    }

    // phase transition
    if (b.phase === 1 && b.hp <= b.maxhp / 2) { b.phase = 2; this.audio.sfx('roar'); this.flash = 0.6; this.showMsg('Gohma-Moore enrages!', 2); b.eyeOpen = 1; b.eyeTimer = 2.4; }

    b.addCd -= dt;
    b.timer -= dt;
    const speed = b.phase === 2 ? 3.2 : 2.0;

    if (b.state === 'idle') {
      // slow approach
      if (d > 4.5) this._moveBoss(b, dx / d * speed * dt, dz / d * speed * dt);
      if (b.timer <= 0) { b.state = Math.random() < 0.5 ? 'charge' : 'spit'; b.timer = 1.0; b.cx = dx / d; b.cz = dz / d; }
      // spawn adds
      if (b.addCd <= 0 && this.enemies.filter(e => !e.dead).length < 3) { b.addCd = b.phase === 2 ? 5 : 8; const a = this.spawnEnemy('bat', b.x + (Math.random() - 0.5) * 4, b.z + 2); a.aggro = true; }
    } else if (b.state === 'charge') {
      // lunge toward stored dir
      this._moveBoss(b, b.cx * speed * 2.2 * dt, b.cz * speed * 2.2 * dt);
      if (d < 3.4 && p.invuln <= 0) this._hurtPlayer(b.phase === 2 ? 2 : 1, -dx, -dz);
      if (b.timer <= 0) { b.state = 'idle'; b.timer = b.phase === 2 ? 0.8 : 1.4; }
    } else if (b.state === 'spit') {
      if (b.phase === 2 && b.timer > 0.4 && b.timer < 0.5) {
        // fire projectile
        const l = Math.hypot(dx, dz) || 1;
        this.projectiles.push({ kind: 'arrow', boss: true, x: b.x, y: 2, z: b.z, vx: dx / l * 12, vy: 0, vz: dz / l * 12, life: 2 });
      }
      if (b.timer <= 0) { b.state = 'idle'; b.timer = 1.2; }
    }

    // contact damage
    if (d < 3.0 && p.invuln <= 0 && b.state !== 'charge') this._hurtPlayer(1, -dx, -dz);
  }
  _moveBoss(b, dx, dz) {
    const res = this._resolve(b.x + dx, b.z + dz, 2.4, this.cur.colliders, false);
    b.x = res.x; b.z = res.z;
  }
  _hitBoss(dmg, melee, pr) {
    const b = this.boss; if (!b || b.dead) return;
    if (b.eyeOpen > 0) {
      // weak point: arrows do full, sword does 1 when very close
      const real = melee ? 1 : dmg;
      b.hp -= real; b.hurt = 0.2; this.flash = 0.3;
      this.audio.sfx('hit');
      if (b.hp <= 0) this._bossDeath();
    } else {
      // armored — deflect
      this.audio.sfx('block');
    }
  }
  _bossDeath() {
    const b = this.boss; b.dead = true;
    this.audio.sfx('roar'); this.audio.sfx('victory');
    this.flash = 1;
    this.effects.push({ kind: 'boom', x: b.x, y: 2, z: b.z, t: 0.8, max: 0.8 });
    this.lock = null;
    // spawn relic
    if (this.dyn) { this.dyn.relicSpawned = true; }
    this.showMsg('The Ocarina Gem is freed!', 3);
  }

  // ---- pickups & interact -------------------------------------------------
  _updatePickups(dt) {
    const p = this.player;
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      pk.bob = (pk.bob || 0) + dt * 3;
      if (Math.hypot(pk.x - p.x, pk.z - p.z) < 1.0) {
        pk.taken = true;
        if (pk.type === 'rupee') { p.rupees += RUPEE_VAL[pk.color || 'green']; this.audio.sfx('rupee'); }
        else if (pk.type === 'heart') { p.hearts = Math.min(p.maxHearts, p.hearts + 1); this.audio.sfx('heart'); }
      }
    }
    this.pickups = this.pickups.filter(p => !p.taken);
    // boss relic pickup
    if (this.dyn && this.dyn.relicSpawned && !p.hasRelic) {
      const rp = this.cur.relic;
      if (Math.hypot(rp.x - p.x, rp.z - p.z) < 1.8) { p.hasRelic = true; this._win(); }
    }
  }

  _interact() {
    const p = this.player;
    // NPCs / shop
    if (this.cur.npcs) for (const n of this.cur.npcs) {
      if (Math.hypot(n.x - p.x, n.z - p.z) < 2.2) {
        if (n.shop) { this._openShop(n); return; }
        this.dialogue = { name: n.name, lines: n.lines.slice(), idx: 0 };
        this.mode = 'dialogue'; this.audio.sfx('menu'); return;
      }
    }
    // signs
    if (this.cur.signs) for (const s of this.cur.signs) {
      if (Math.hypot(s.x - p.x, s.z - p.z) < 2.0) { this.dialogue = { name: 'Sign', lines: [s.text], idx: 0 }; this.mode = 'dialogue'; this.audio.sfx('menu'); return; }
    }
    if (!this.dyn) return;
    // chests
    for (const c of this.dyn.chests) {
      if (!c.opened && Math.hypot(c.x - p.x, c.z - p.z) < 2.0) { this._openChest(c); return; }
    }
    // locked doors
    for (const d of this.dyn.lockedDoors) {
      if (d.locked && Math.hypot(d.x - p.x, d.z - p.z) < 2.4) {
        if (p.smallkeys > 0) { p.smallkeys--; d.locked = false; this.audio.sfx('door'); this.showMsg('Opened a locked door', 1.6); }
        else this.showMsg('It needs a small key', 1.6);
        return;
      }
    }
    const bd = this.dyn.bossDoor;
    if (bd.locked && Math.hypot(bd.x - p.x, bd.z - p.z) < 2.6) {
      if (p.hasBossKey) { bd.locked = false; this.audio.sfx('door'); this.showMsg('The boss door opens...', 2); }
      else this.showMsg('A great lock. You need the Boss Key.', 2);
      return;
    }
  }

  _openChest(c) {
    c.opened = true; this.audio.sfx('chest');
    const p = this.player;
    switch (c.item) {
      case 'smallkey': p.smallkeys++; this.showMsg('Got a Small Key!', 2); this.audio.sfx('key'); break;
      case 'bow': p.hasBow = true; p.arrows += 20; p.item = 'bow'; this.showMsg('Got the Hero Bow! (20 arrows) — press Q', 3); this.audio.sfx('secret'); break;
      case 'bosskey': p.hasBossKey = true; this.showMsg('Got the Boss Key!', 2.5); this.audio.sfx('secret'); break;
      case 'bombs': p.bombs += 5; if (!p.hasBombs) p.hasBombs = true; this.showMsg('Got Bombs! (x5) — cycle with Tab', 3); this.audio.sfx('key'); break;
    }
  }

  _openShop(n) {
    this.shop = { items: this.cur.shop.slice(), idx: 0, name: n.name, note: n.lines[0] };
    this.mode = 'shop'; this.audio.sfx('menu');
  }
  _updateShop() {
    const s = this.shop, inp = this.input, p = this.player;
    if (inp.pressed('pause') || inp.pressed('target')) { this.mode = 'play'; this.shop = null; return; }
    if (inp.pressed('roll') || (inp.move.y < -0.5 && !s._nav)) { s.idx = (s.idx + 1) % s.items.length; s._nav = true; this.audio.sfx('menu'); }
    else if (inp.pressed('cycle') || (inp.move.y > 0.5 && !s._nav)) { s.idx = (s.idx - 1 + s.items.length) % s.items.length; s._nav = true; this.audio.sfx('menu'); }
    if (Math.abs(inp.move.y) < 0.3) s._nav = false;
    if (inp.pressed('action') || inp.pressed('attack')) {
      const it = s.items[s.idx];
      if (p.rupees < it.cost) { this.showMsg('Not enough rupees', 1.4); this.audio.sfx('menu'); return; }
      p.rupees -= it.cost;
      if (it.item === 'heart') p.hearts = Math.min(p.maxHearts, p.hearts + 1);
      else if (it.item === 'arrows') p.arrows += 5;
      else if (it.item === 'bombs') { p.bombs += 3; p.hasBombs = true; }
      else if (it.item === 'maxheart') { p.maxHearts++; p.hearts = p.maxHearts; }
      this.audio.sfx('rupee'); this.showMsg('Purchased ' + it.label, 1.4);
    }
  }
  _updateDialogue() {
    const inp = this.input, d = this.dialogue;
    if (inp.pressed('action') || inp.pressed('attack')) {
      d.idx++;
      if (d.idx >= d.lines.length) {
        this.mode = 'play'; this.dialogue = null;
        // elder gives the sword-quest nudge (no state needed)
      } else this.audio.sfx('menu');
    }
  }

  _hurtPlayer(dmg, kx, kz) {
    const p = this.player;
    if (p.invuln > 0 || p.roll > 0) return;
    p.hearts -= dmg; p.invuln = 1.1; p.hurtT = 0.3;
    const l = Math.hypot(kx, kz) || 1;
    this._move(kx / l * 0.8, kz / l * 0.8);
    this.audio.sfx('hurt');
    if (p.hearts <= 0) { p.hearts = 0; this._gameover(); }
  }
  _gameover() { this.mode = 'gameover'; this.audio.setTrack(null); }
  _win() { this.mode = 'win'; this.won = true; this.audio.setTrack(null); this.audio.sfx('victory'); this.showMsg('You saved Moore Village!', 4); }

  // ---- triggers -----------------------------------------------------------
  _updateTriggers() {
    const p = this.player;
    for (const t of (this.cur.triggers || [])) {
      if (p.x > t.x0 && p.x < t.x1 && p.z > t.z0 && p.z < t.z1) {
        this.setArea(t.to, t.spawn);
        this.showMsg(t.to === 'field' ? 'Hyrule-Moore Field' : t.to === 'dungeon' ? 'Deku Dungeon' : 'Moore Village', 2);
        return;
      }
    }
    // dungeon: spawn boss when entering boss room
    if (this.dyn && !this.dyn.bossSpawned) {
      const br = this.cur.rooms.BR;
      if (p.x > br.x0 && p.x < br.x1 && p.z > br.z0 + 4 && p.z < br.z1) this.spawnBoss();
    }
  }

  // ---- camera -------------------------------------------------------------
  updateCamera(dt) {
    const p = this.player, cam = this.cam;
    const cd = this.input.camDelta();
    if (this.lock && this.lock && !this.lock.dead) {
      const tx = this.lock.x - p.x, tz = this.lock.z - p.z;
      const desired = Math.atan2(tz, tx);
      cam.yaw = desired;
      cam.pitch = clamp(cam.pitch + cd.dy, 0.15, 0.9);
    } else {
      cam.yaw += cd.dx;
      cam.pitch = clamp(cam.pitch + cd.dy, 0.12, 1.1);
      // Auto-follow: once the camera's been left alone briefly, gently swing it to
      // trail behind the hero's direction of travel (OoT-style recenter). Dragging
      // the camera (or arrow-key look) pauses it so you can still look around.
      const mv = this.input.move;
      const dragging = Math.abs(cd.dx) > 1e-4 || Math.abs(cd.dy) > 1e-4;
      this._camIdle = dragging ? 0 : (this._camIdle || 0) + dt;
      // only trail when moving forward-ish, so pure strafing/backing doesn't spin it
      if (this._camIdle > 0.5 && mv.y > 0.2) {
        cam.yaw = angLerp(cam.yaw, p.yaw, Math.min(1, dt * 2.5));
      }
    }
    cam.curYaw = angLerp(cam.curYaw, cam.yaw, this.lock ? 0.12 : 0.15);
    cam.curPitch = lerp(cam.curPitch, cam.pitch, 0.15);

    const cy = cam.curYaw, cp = cam.curPitch;
    const dist = cam.dist;
    let ex = p.x - Math.cos(cy) * Math.cos(cp) * dist;
    let ez = p.z - Math.sin(cy) * Math.cos(cp) * dist;
    let ey = p.y + 2.2 + Math.sin(cp) * dist;
    // keep camera out of walls (pull in if blocked)
    const res = this._resolve(ex, ez, 0.6, this.cur.colliders, false);
    ex = res.x; ez = res.z;
    cam.eye = [ex, ey, ez];
    // look target: between player and lock
    let tx = p.x, ty = p.y + 1.3, tz = p.z;
    if (this.lock && !this.lock.dead) {
      tx = lerp(p.x, this.lock.x, 0.35); tz = lerp(p.z, this.lock.z, 0.35);
      ty = p.y + 1.3;
    }
    cam.target = [tx, ty, tz];
  }

  // ---- data for HUD / minimap --------------------------------------------
  mapData() {
    const pts = [];
    for (const e of this.enemies) if (!e.dead) pts.push({ x: e.x, z: e.z, kind: 'enemy' });
    if (this.boss && !this.boss.dead) pts.push({ x: this.boss.x, z: this.boss.z, kind: 'boss' });
    for (const pk of this.pickups) if (!pk.taken) pts.push({ x: pk.x, z: pk.z, kind: pk.type });
    if (this.dyn) for (const c of this.dyn.chests) if (!c.opened) pts.push({ x: c.x, z: c.z, kind: 'chest' });
    let bounds = { x0: -35, z0: -35, x1: 35, z1: 40 };
    if (this.cur.name === 'field') bounds = { x0: -50, z0: -20, x1: 50, z1: 130 };
    if (this.cur.name === 'dungeon') bounds = { x0: -12, z0: -12, x1: 42, z1: 100 };
    return { area: this.cur.name, player: { x: this.player.x, z: this.player.z, yaw: this.player.yaw }, pts, bounds };
  }

  state() {
    const p = this.player;
    return {
      mode: this.mode, area: this.cur ? this.cur.name : null,
      hearts: p.hearts, maxHearts: p.maxHearts, rupees: p.rupees, arrows: p.arrows,
      bombs: p.bombs, smallkeys: p.smallkeys, hasBow: p.hasBow, hasBossKey: p.hasBossKey,
      hasRelic: p.hasRelic, item: p.item, locked: !!this.lock,
      pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
      enemies: this.enemies.filter(e => !e.dead).length,
      boss: this.boss ? { hp: this.boss.hp, max: this.boss.maxhp, phase: this.boss.phase, dead: this.boss.dead } : null,
      dialogue: this.dialogue, shop: this.shop, msg: this.msgT > 0 ? this.msg : null,
      won: this.won,
    };
  }

  _updateEffects(dt) {
    for (const e of this.effects) e.t -= dt;
    this.effects = this.effects.filter(e => e.t > 0);
  }

  // ---- render -------------------------------------------------------------
  render() {
    this.r.resize();
    if (!this.cur) { this._renderTitleBg(); return; }
    const base = (this.boss && !this.boss.dead) ? LIGHTS.boss : this.cur.light;
    const L = Object.assign({}, base, { flash: this.flash });
    this.r.beginFrame({ eye: this.cam.eye, target: this.cam.target, fov: Math.PI / 3 }, L);
    // static scenery
    this.r.drawMesh(this.cur.handle, mat4.identity(), null);
    this._drawDynamic();
    this._drawEntities();
  }
  _renderTitleBg() {
    // simple sky + ground for the title canvas
    const L = LIGHTS.village;
    this.r.beginFrame({ eye: [0, 3, 10], target: [0, 2, 0], fov: Math.PI / 3 }, L);
  }

  _drawDynamic() {
    const r = this.r, t = this.time;
    // torches (both dungeon dyn and area meta)
    const torches = (this.cur.torches || []).concat(this.dyn ? [] : []);
    for (const tc of torches) {
      r.drawCyl(tc.x, 0, tc.z, 0, 0.16, 2.2, [0.35, 0.28, 0.2]);
      const fl = 0.35 + Math.sin(t * 12 + tc.x) * 0.08;
      r.drawGlow('sphere', tc.x, 2.3 + Math.sin(t * 9 + tc.z) * 0.05, tc.z, fl, C.flame);
      r.drawGlow('sphere', tc.x, 2.5, tc.z, fl * 0.6, C.flameC);
    }
    if (!this.dyn) {
      // village well cover glow, field pond sparkle — minimal
      // field/village cracked boulders
      if (this.cur.cracked) for (const c of this.cur.cracked) if (!c.gone) {
        r.drawBox(c.x, 0, c.z, 0, 1.8, 2.0, 1.8, [0.42, 0.4, 0.44]);
        r.drawBox(c.x, 1.0, c.z + 0.9, 0, 1.2, 0.8, 0.15, [0.2, 0.18, 0.2]); // crack
      }
      return;
    }
    const d = this.dyn;
    // gates (bars)
    for (const g of d.gates) if (!g.open) this._drawGate(g, C.gate);
    for (const dr of d.lockedDoors) if (dr.locked) this._drawDoor(dr, C.door, true);
    if (d.bossDoor.locked) this._drawDoor(d.bossDoor, [0.5, 0.15, 0.18], true, true);
    // blocks
    for (const b of d.blocks) { r.drawBox(b.x, b.size / 2, b.z, 0, b.size, b.size, b.size, [0.5, 0.42, 0.3]); r.drawBox(b.x, b.size, b.z, 0, b.size * 0.9, 0.12, b.size * 0.9, [0.35, 0.3, 0.22]); }
    // switches
    for (const s of d.switches) { const c = s.pressed ? [0.4, 0.9, 0.4] : [0.8, 0.7, 0.3]; r.drawCyl(s.x, s.pressed ? 0.06 : 0.14, s.z, 0, s.r * 0.8, s.pressed ? 0.12 : 0.28, c); }
    // crystals (bow targets)
    for (const c of d.crystals) {
      const col = c.hit ? [0.4, 0.9, 0.5] : C.crystalOff;
      r.drawGlow('sphere', c.x, c.y, c.z, 0.5 + Math.sin(t * 4) * 0.05, col);
      r.drawBox(c.x, c.y, c.z, t, 0.35, 0.9, 0.35, col);
    }
    // chests
    for (const c of d.chests) this._drawChest(c);
    // cracked walls
    for (const c of d.cracked) if (!c.gone) { r.drawBox(c.x, 1.6, c.z, 0, 1.0, 3.2, 1.0, [0.3, 0.28, 0.34]); r.drawBox(c.x + 0.5, 1.6, c.z, 0, 0.1, 2.0, 0.6, [0.12, 0.1, 0.14]); }
    // relic
    if (d.relicSpawned && !this.player.hasRelic) {
      const rp = this.cur.relic;
      r.drawGlow('sphere', rp.x, 1.4 + Math.sin(t * 3) * 0.15, rp.z, 0.5, C.relic);
      r.drawGlow('box', rp.x, 1.4 + Math.sin(t * 3) * 0.15, rp.z, 0.3, C.relic);
    }
  }

  _drawGate(g, col) {
    const r = this.r, n = 5;
    for (let i = 0; i <= n; i++) {
      if (g.axis === 'x') { const x = g.x - g.w / 2 + g.w * i / n; r.drawCyl(x, 2.5, g.z, 0, 0.12, 5, col); }
      else { const z = g.z - g.w / 2 + g.w * i / n; r.drawCyl(g.x, 2.5, z, 0, 0.12, 5, col); }
    }
    if (g.axis === 'x') r.drawBox(g.x, 5, g.z, 0, g.w, 0.4, 0.3, col); else r.drawBox(g.x, 5, g.z, 0, 0.3, 0.4, g.w, col);
  }
  _drawDoor(d, col, locked, boss) {
    const r = this.r;
    if (d.axis === 'x') r.drawBox(d.x, 2.6, d.z, 0, d.w, 5.2, 0.5, col);
    else r.drawBox(d.x, 2.6, d.z, 0, 0.5, 5.2, d.w, col);
    if (locked) { const cc = boss ? C.gold : [0.85, 0.75, 0.3]; r.drawBox(d.x, 2.4, d.z + (d.axis === 'x' ? 0.35 : 0), 0, 0.5, 0.6, 0.5, cc); }
  }
  _drawChest(c) {
    const r = this.r;
    const col = c.opened ? [0.4, 0.32, 0.2] : C.chest;
    r.drawBox(c.x, 0.45, c.z, 0, 1.1, 0.9, 0.8, col);
    if (!c.opened) { r.drawBox(c.x, 1.0, c.z, 0, 1.1, 0.35, 0.85, C.chestLid); r.drawBox(c.x, 0.7, c.z + 0.42, 0, 0.25, 0.3, 0.08, C.gold); }
    else r.drawBox(c.x, 1.15, c.z - 0.3, -0.6, 1.1, 0.35, 0.85, [0.3, 0.24, 0.16]);
  }

  _drawEntities() {
    const r = this.r, t = this.time;
    // pickups
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const y = 0.6 + Math.sin((pk.bob || 0)) * 0.15;
      if (pk.type === 'rupee') { const c = RUPEE_COL[pk.color || 'green']; r.drawBox(pk.x, y, pk.z, t * 2, 0.3, 0.55, 0.2, c); }
      else { r.drawBox(pk.x, y, pk.z, t * 2, 0.4, 0.4, 0.2, C.heart); r.drawBox(pk.x, y + 0.12, pk.z, t * 2, 0.2, 0.2, 0.24, C.heart); }
    }
    // npcs
    if (this.cur.npcs) for (const n of this.cur.npcs) this._drawNPC(n);
    // signs
    if (this.cur.signs) for (const s of this.cur.signs) { r.drawCyl(s.x, 0.6, s.z, 0, 0.08, 1.2, [0.4, 0.28, 0.16]); r.drawBox(s.x, 1.3, s.z, 0, 1.0, 0.6, 0.1, [0.6, 0.45, 0.28]); }
    // enemies
    for (const e of this.enemies) if (!e.dead) this._drawEnemy(e);
    // boss
    if (this.boss && !this.boss.dead) this._drawBoss(this.boss);
    // projectiles
    for (const pr of this.projectiles) {
      if (pr.kind === 'arrow') { const c = pr.boss ? [0.9, 0.4, 0.3] : [0.85, 0.8, 0.5]; r.drawBox(pr.x, pr.y, pr.z, Math.atan2(pr.vz, pr.vx), 0.5, 0.08, 0.08, c); }
      else { r.drawSphere(pr.x, pr.y, pr.z, 0.3, [0.15, 0.15, 0.18]); if (Math.sin(t * 30) > 0) r.drawGlow('sphere', pr.x, pr.y + 0.35, pr.z, 0.08, [1, 0.5, 0.2]); }
    }
    // effects
    for (const e of this.effects) {
      const k = 1 - e.t / e.max;
      if (e.kind === 'slash') r.drawBox(e.x, e.y, e.z, e.yaw, 1.6 * (0.5 + k), 0.1, 1.2, [0.9, 0.95, 1.0]);
      else if (e.kind === 'poof') r.drawGlow('sphere', e.x, e.y + k, e.z, 0.5 * (1 - k) + 0.2, [0.8, 0.8, 0.9]);
      else if (e.kind === 'boom') { r.drawGlow('sphere', e.x, e.y, e.z, 0.5 + k * 3, [1, 0.6, 0.2]); r.drawGlow('sphere', e.x, e.y, e.z, 0.3 + k * 2, [1, 0.9, 0.5]); }
      else if (e.kind === 'ring') r.drawGlow('cyl', e.x, 0.2, e.z, 2 + k * 1.5, [0.8, 0.9, 1]);
    }
    // player
    this._drawHero();
    // lock reticle
    if (this.lock && !this.lock.dead) {
      const y = this.lock === this.boss ? 4.5 : 2.0;
      r.drawGlow('box', this.lock.x, y + Math.sin(t * 6) * 0.1, this.lock.z, 0.35, [1, 1, 0.5]);
    }
  }

  _limb(x, y, z, yaw, sx, sy, sz, col) { this.r.drawBox(x, y, z, yaw, sx, sy, sz, col); }

  _drawHero() {
    const p = this.player, r = this.r;
    if (p.invuln > 0 && Math.floor(this.time * 20) % 2 === 0 && p.hurtT > 0) return; // hurt blink
    const yaw = p.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    const swing = Math.sin(p.anim) * 0.5;
    const bx = p.x, bz = p.z, by = p.roll > 0 ? 0.4 : 0.55;
    const fwd = (fx, fy) => [bx + c * fx - s * fy, bz + s * fx + c * fy];
    // legs
    let lp = fwd(0, 0.18), rp = fwd(0, -0.18);
    r.drawBox(lp[0], 0.28 + Math.max(0, swing) * 0.1, lp[1], yaw, 0.22, 0.55, 0.24, C.boot);
    r.drawBox(rp[0], 0.28 + Math.max(0, -swing) * 0.1, rp[1], yaw, 0.22, 0.55, 0.24, C.boot);
    // torso
    r.drawBox(bx, by + 0.55, bz, yaw, 0.62, 0.72, 0.44, C.tunic);
    r.drawBox(bx, by + 0.2, bz, yaw, 0.66, 0.3, 0.48, C.tunicD);
    // head + cap
    r.drawBox(bx, by + 1.15, bz, yaw, 0.4, 0.4, 0.4, C.skin);
    r.drawCone(bx, by + 1.35, bz, yaw, 0.32, 0.7, C.cap);
    // arms (swing)
    let al = fwd(0.05, 0.36), ar = fwd(0.05, -0.36);
    const armYL = by + 0.6 - swing * 0.1, armYR = by + 0.6 + swing * 0.1;
    r.drawBox(al[0], armYL, al[1], yaw, 0.18, 0.5, 0.18, C.tunic);
    // sword arm — swings on attack
    let atkA = 0;
    if (p.atk > 0) atkA = p.atkType === 'spin' ? this.time * 25 : (0.28 - p.atk) / 0.28 * 2 - 1;
    const sc = Math.cos(yaw + atkA), ss = Math.sin(yaw + atkA);
    r.drawBox(ar[0], armYR, ar[1], yaw, 0.18, 0.5, 0.18, C.tunic);
    // shield (left) when blocking
    if (p.blocking) { const shp = [bx + c * 0.3 - s * 0.45, bz + s * 0.3 + c * 0.45]; r.drawBox(shp[0], by + 0.6, shp[1], yaw, 0.12, 0.7, 0.6, C.shield); r.drawBox(shp[0], by + 0.6, shp[1], yaw, 0.14, 0.4, 0.35, C.shieldRim); }
    else { const shp = [bx - c * 0.15 - s * 0.42, bz - s * 0.15 + c * 0.42]; r.drawBox(shp[0], by + 0.55, shp[1], yaw, 0.1, 0.55, 0.45, C.shield); }
    // sword
    const handX = ar[0] + Math.cos(yaw + atkA) * 0.4, handZ = ar[1] + Math.sin(yaw + atkA) * 0.4;
    if (p.atk > 0 || true) {
      const swy = by + 0.6 + (p.atk > 0 ? 0.3 : 0.0);
      r.drawBox(handX, swy, handZ, yaw + atkA, 0.12, 1.0, 0.12, C.sword);
      r.drawBox(handX, swy - 0.45, handZ, yaw + atkA, 0.3, 0.12, 0.12, C.hilt);
    }
  }

  _drawNPC(n) {
    const r = this.r, yaw = n.yaw || 0, bob = Math.sin(this.time * 2 + n.x) * 0.03;
    r.drawBox(n.x, 0.3, n.z + 0.12, yaw, 0.22, 0.6, 0.24, [0.3, 0.25, 0.2]);
    r.drawBox(n.x, 0.3, n.z - 0.12, yaw, 0.22, 0.6, 0.24, [0.3, 0.25, 0.2]);
    r.drawBox(n.x, 0.85 + bob, n.z, yaw, 0.6, 0.7, 0.42, n.color);
    r.drawBox(n.x, 1.35 + bob, n.z, yaw, 0.4, 0.4, 0.4, C.skin);
    if (n.shop) r.drawBox(n.x, 1.7 + bob, n.z, yaw, 0.45, 0.2, 0.45, [0.3, 0.3, 0.4]);
    else r.drawCone(n.x, 1.55 + bob, n.z, yaw, 0.28, 0.4, [0.5, 0.4, 0.6]);
    // "talk" indicator when near
    if (Math.hypot(n.x - this.player.x, n.z - this.player.z) < 2.2)
      r.drawGlow('box', n.x, 2.1 + Math.sin(this.time * 5) * 0.08, n.z, 0.14, [0.4, 0.9, 1]);
  }

  _drawEnemy(e) {
    const r = this.r, yaw = e.yaw, col = e.hurt > 0 ? [1, 0.8, 0.8] : (e.kind === 'bat' ? C.bat : C.blin);
    if (e.kind === 'bat') {
      r.drawSphere(e.x, e.y, e.z, 0.35, col);
      const wf = Math.sin(e.anim * 3) * 0.6;
      r.drawBox(e.x + Math.cos(yaw + 1.6) * 0.4, e.y, e.z + Math.sin(yaw + 1.6) * 0.4, yaw + wf, 0.5, 0.08, 0.4, col);
      r.drawBox(e.x + Math.cos(yaw - 1.6) * 0.4, e.y, e.z + Math.sin(yaw - 1.6) * 0.4, yaw - wf, 0.5, 0.08, 0.4, col);
      r.drawGlow('box', e.x + Math.cos(yaw) * 0.25, e.y + 0.05, e.z + Math.sin(yaw) * 0.25, 0.08, C.eye);
    } else {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const sw = Math.sin(e.anim) * 0.3;
      r.drawBox(e.x + c * 0 - s * 0.15, 0.28, e.z + s * 0 + c * 0.15, yaw, 0.22, 0.5, 0.22, C.blinD);
      r.drawBox(e.x + c * 0 + s * 0.15, 0.28, e.z + s * 0 - c * 0.15, yaw, 0.22, 0.5, 0.22, C.blinD);
      r.drawBox(e.x, 0.85, e.z, yaw, 0.6, 0.7, 0.44, col);
      r.drawBox(e.x, 1.35, e.z, yaw, 0.42, 0.42, 0.42, col);
      // snout + eyes
      r.drawBox(e.x + c * 0.28, 1.32, e.z + s * 0.28, yaw, 0.2, 0.18, 0.3, C.blinD);
      r.drawGlow('box', e.x + c * 0.22 - s * 0.12, 1.42, e.z + s * 0.22 + c * 0.12, 0.05, C.eye);
      r.drawGlow('box', e.x + c * 0.22 + s * 0.12, 1.42, e.z + s * 0.22 - c * 0.12, 0.05, C.eye);
      // club
      const raise = e.state === 'windup' ? 1.2 : e.state === 'strike' ? -0.3 : 0.3;
      const hx = e.x + c * 0.5 - s * (-0.35), hz = e.z + s * 0.5 + c * (-0.35);
      r.drawBox(hx, 1.1 + raise, hz, yaw, 0.16, 0.8, 0.16, C.club);
      r.drawBox(hx + c * 0.1, 1.5 + raise, hz + s * 0.1, yaw, 0.3, 0.3, 0.3, [0.3, 0.2, 0.12]);
    }
  }

  _drawBoss(b) {
    const r = this.r, yaw = b.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    const col = b.hurt > 0 ? [1, 0.7, 0.6] : (b.phase === 2 ? [0.55, 0.22, 0.24] : C.boss);
    // body dome
    r.drawSphere(b.x, 2.2, b.z, 2.4, col);
    r.drawBox(b.x, 1.0, b.z, yaw, 4.2, 2.0, 3.6, C.bossD);
    // legs (6)
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? 1 : -1;
      const off = (i % 3 - 1) * 1.3;
      const lift = Math.sin(b.legPhase + i) * 0.3;
      const lx = b.x + c * off - s * (side * 2.6), lz = b.z + s * off + c * (side * 2.6);
      r.drawBox(lx, 1.2 + lift, lz, yaw + side * 0.5, 0.4, 2.2, 0.4, C.bossD);
      r.drawBox(lx, 0.3, lz, yaw, 0.35, 0.6, 0.35, C.bossD);
    }
    // the eye (weak point)
    const ex = b.x + c * 2.2, ez = b.z + s * 2.2, ey = 2.5;
    if (b.eyeOpen > 0) {
      r.drawGlow('sphere', ex, ey, ez, 0.9, C.bossEye);
      r.drawGlow('sphere', ex, ey, ez, 0.5, [1, 0.8, 0.3]);
      r.drawBox(ex + c * 0.4, ey, ez + s * 0.4, yaw, 0.2, 0.3, 0.3, [0.1, 0, 0]); // pupil
    } else {
      // armored shell over eye
      r.drawSphere(ex, ey, ez, 0.95, [0.3, 0.28, 0.3]);
      r.drawBox(ex, ey, ez, yaw, 0.3, 1.4, 1.4, [0.25, 0.23, 0.26]);
    }
    // mandibles
    r.drawBox(b.x + c * 1.8 - s * 0.7, 0.8, b.z + s * 1.8 + c * 0.7, yaw + 0.3, 1.2, 0.4, 0.4, C.bossD);
    r.drawBox(b.x + c * 1.8 + s * 0.7, 0.8, b.z + s * 1.8 - c * 0.7, yaw - 0.3, 1.2, 0.4, 0.4, C.bossD);
  }
}
