// game.js — the pure simulation core. Holds the whole world state (player,
// vehicles, peds, wanted level, missions, cash) and advances it one step at a
// time. NO DOM — fully headless-testable. main.js is the browser shell that
// feeds input, renders, and draws HUD.

import { City, TILE, P, ROAD, mulberry32 } from './city.js';
import { Player, PLAYER_R } from './player.js';
import {
  Vehicle, VEHICLE_TYPES, trafficStep, policeControl,
  vehiclesOverlap, resolveVehicleCollision,
} from './vehicles.js';
import { Ped, spawnPeds, genProps } from './entities.js';

const STAR_THRESH = [0, 6, 18, 34, 54, 78]; // heat needed for each star count

export class Game {
  constructor(seed = 20260721) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.city = new City(seed);
    this.player = new Player(this.city.playerSpawn);
    this.vehicles = [];
    this.peds = [];
    this.props = genProps(this.city, this.rng);

    this.cash = 0;
    this.heat = 0;         // wanted "score"
    this.stars = 0;
    this.coolTimer = 0;    // time since last seen by police
    this.bustTimer = 0;
    this.state = 'play';   // 'title'|'play'|'busted'|'wasted'|'win'
    this.time = 0;

    this.camYaw = 0.6;
    this.camPitch = -0.32;
    this.firstPerson = false;

    this.events = [];      // transient events for audio/hud {type,...}
    this.banner = '';      // mission-objective banner text
    this.bannerTimer = 0;

    this._spawnTraffic(14);
    this.peds = spawnPeds(this.city, this.player, 26, this.rng);

    this._setupMissions();
  }

  // ---- setup ------------------------------------------------------------
  _spawnTraffic(n) {
    const c = this.city;
    let tries = 0;
    while (this.vehicles.filter(v => v.role === 'traffic').length < n && tries < n * 40) {
      tries++;
      // pick a road lane point
      const k = Math.floor(this.rng() * 8);
      const j = Math.floor(this.rng() * 8);
      const alongX = this.rng() < 0.5;
      let x, z, heading, axis, sign;
      if (alongX) {
        z = j * P + ROAD * 0.5 + (this.rng() < 0.5 ? ROAD * 0.22 : -ROAD * 0.22) + ROAD * 0.5;
        z = j * P + (this.rng() < 0.5 ? ROAD * 0.72 : ROAD * 0.28);
        x = k * P + ROAD + this.rng() * 12;
        sign = this.rng() < 0.5 ? 1 : -1; axis = 'x';
        heading = sign > 0 ? 0 : Math.PI;
      } else {
        x = k * P + (this.rng() < 0.5 ? ROAD * 0.72 : ROAD * 0.28);
        z = j * P + ROAD + this.rng() * 12;
        sign = this.rng() < 0.5 ? 1 : -1; axis = 'z';
        heading = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      if (c.blocked(x, z, 1.5)) continue;
      const dp = Math.hypot(x - this.player.x, z - this.player.z);
      if (dp < 8) continue;
      const types = ['sedan', 'sedan', 'sports', 'truck'];
      const t = types[(this.rng() * types.length) | 0];
      const v = new Vehicle(t, x, z, heading, (this.rng() * 8) | 0);
      v.role = 'traffic'; v.occupant = 'ai'; v.axis = axis; v.sign = sign;
      this.vehicles.push(v);
    }
    // a few parked cars near player spawn for immediate stealing
    for (let i = 0; i < 4; i++) {
      const spot = this.city.parking[(this.rng() * this.city.parking.length) | 0];
      if (!spot) break;
      if (this.city.blocked(spot.x, spot.z, 1.5)) continue;
      const t = ['sedan', 'sports', 'truck'][(this.rng() * 3) | 0];
      const v = new Vehicle(t, spot.x, spot.z, spot.axis === 'x' ? 0 : Math.PI / 2, (this.rng() * 8) | 0);
      v.role = 'parked'; v.occupant = null;
      this.vehicles.push(v);
    }
  }

  // ---- wanted system ----------------------------------------------------
  crime(pts) {
    this.heat = Math.min(100, this.heat + pts);
    this.coolTimer = 0;
    this._recalcStars();
  }
  _recalcStars() {
    let s = 0;
    for (let i = 1; i < STAR_THRESH.length; i++) if (this.heat >= STAR_THRESH[i]) s = i;
    if (s > this.stars) this.events.push({ type: 'wantedUp', stars: s });
    this.stars = s;
  }

  _updateWanted(dt) {
    // any police with line of sight to player?
    const px = this.player.x, pz = this.player.z;
    let seen = false;
    for (const v of this.vehicles) {
      if (v.role !== 'police') continue;
      const d = Math.hypot(v.x - px, v.z - pz);
      if (d < 55 && this.city.lineOfSight(v.x, v.z, px, pz, 3)) { seen = true; break; }
    }
    if (this.stars > 0) {
      if (seen) { this.coolTimer = 0; }
      else {
        this.coolTimer += dt;
        // decay after ~4s of no sight; faster with fewer stars
        if (this.coolTimer > 4) {
          this.heat -= (2.5 + (6 - this.stars)) * dt;
          if (this.heat < 0) this.heat = 0;
          this._recalcStars();
        }
      }
    } else {
      this.heat = Math.max(0, this.heat - dt);
    }
    this._managePolice();
  }

  _managePolice() {
    const want = this.stars; // desired number of active police units
    let cops = this.vehicles.filter(v => v.role === 'police');
    if (this.stars === 0) {
      // stand down: remove police
      if (cops.length) this.vehicles = this.vehicles.filter(v => v.role !== 'police');
      return;
    }
    const desired = Math.min(6, want + 1);
    while (cops.length < desired) {
      const v = this._spawnPoliceNearPlayer();
      if (!v) break;
      this.vehicles.push(v);
      cops = this.vehicles.filter(x => x.role === 'police');
    }
  }

  _spawnPoliceNearPlayer() {
    const c = this.city, px = this.player.x, pz = this.player.z;
    for (let t = 0; t < 30; t++) {
      const ang = this.rng() * Math.PI * 2;
      const r = 34 + this.rng() * 20;
      let x = px + Math.cos(ang) * r;
      let z = pz + Math.sin(ang) * r;
      // snap onto nearest road lane
      x = Math.max(2, Math.min(c.MAP - 2, x));
      z = Math.max(2, Math.min(c.MAP - 2, z));
      // find a nearby open road cell
      if (!c.onRoad(x, z) || c.blocked(x, z, 1.6)) {
        x = c.nearestRoadCenter(x); // may still be blocked; check
      }
      if (c.blocked(x, z, 1.6)) continue;
      const heading = Math.atan2(pz - z, px - x);
      const v = new Vehicle('police', x, z, heading, 0);
      v.role = 'police'; v.occupant = 'ai';
      return v;
    }
    return null;
  }

  // ---- enter / exit vehicles -------------------------------------------
  tryEnterExit() {
    const p = this.player;
    if (p.inVehicle) {
      // exit
      const v = p.inVehicle;
      p.inVehicle = null;
      // drop player beside the car
      const ox = Math.cos(v.heading + Math.PI / 2), oz = Math.sin(v.heading + Math.PI / 2);
      let nx = v.x + ox * (v.w * 0.5 + 1), nz = v.z + oz * (v.w * 0.5 + 1);
      if (this.city.blocked(nx, nz, PLAYER_R)) { nx = v.x - ox * (v.w * 0.5 + 1); nz = v.z - oz * (v.w * 0.5 + 1); }
      p.x = nx; p.z = nz;
      v.occupant = null; v.role = 'parked'; v.speed *= 0.3;
      this.events.push({ type: 'exit' });
      return true;
    }
    // find nearest vehicle within reach
    let best = null, bd = 3.2;
    for (const v of this.vehicles) {
      if (v.role === 'police') continue; // can't casually hijack a moving cop here
      const d = Math.hypot(v.x - p.x, v.z - p.z);
      if (d < bd) { best = v; bd = d; }
    }
    if (!best) return false;
    const wasOccupied = best.occupant === 'ai';
    p.inVehicle = best;
    best.occupant = 'player'; best.role = 'player';
    if (wasOccupied) { this.crime(5); this.events.push({ type: 'carjack' }); }
    else this.events.push({ type: 'enter' });
    // keep traffic count up
    return true;
  }

  // steal a police car too (for evasion) — separate explicit action if adjacent
  // (used by AI-agnostic gameplay); folded into tryEnterExit is enough here.

  // ---- missions ---------------------------------------------------------
  _setupMissions() {
    const c = this.city;
    // marker positions: pick some road spots around the map
    const g = c.garage, h = c.hospital;
    this.missionDefs = [
      {
        id: 'repo', name: 'Repo Job', cash: 250,
        marker: { x: c.playerSpawn.x + P, z: c.playerSpawn.z },
        blurb: 'Steal the marked car and bring it to the garage.',
      },
      {
        id: 'dash', name: 'Checkpoint Dash', cash: 220,
        marker: { x: c.playerSpawn.x, z: c.playerSpawn.z + P },
        blurb: 'Hit all 3 checkpoints before the timer runs out.',
      },
      {
        id: 'heat', name: 'Heat', cash: 320,
        marker: { x: c.playerSpawn.x - P, z: c.playerSpawn.z },
        blurb: 'Get a 3-star wanted level and then lose the cops.',
      },
      {
        id: 'airport', name: 'Cross-Town Run', cash: 180,
        marker: { x: c.playerSpawn.x, z: c.playerSpawn.z - P },
        blurb: 'Drive to the far side of the city and back.',
      },
    ];
    this.completedMissions = {};
    this.activeMission = null;
  }

  availableMissionAt(x, z, r = 4) {
    for (const m of this.missionDefs) {
      if (this.completedMissions[m.id]) continue;
      if (this.activeMission) continue;
      if (Math.hypot(m.marker.x - x, m.marker.z - z) < r) return m;
    }
    return null;
  }

  startMission(id) {
    const def = this.missionDefs.find(m => m.id === id);
    if (!def || this.activeMission || this.completedMissions[id]) return false;
    const c = this.city;
    const am = { def, phase: 0, timer: 0, data: {}, objective: '' };
    if (id === 'repo') {
      // spawn a distinctive target car a bit away on a road
      const sp = c.parking[(this.rng() * c.parking.length) | 0];
      const tv = new Vehicle('sports', sp.x, sp.z, 0, 2);
      tv.role = 'parked'; tv.occupant = null; tv.mission = 'repo'; tv.color = [235, 120, 30];
      this.vehicles.push(tv);
      am.data.car = tv;
      am.objective = 'Steal the marked (orange) car.';
    } else if (id === 'dash') {
      am.data.cps = [
        { x: c.playerSpawn.x + 3 * P, z: c.playerSpawn.z + P },
        { x: c.playerSpawn.x + 3 * P, z: c.playerSpawn.z + 4 * P },
        { x: c.playerSpawn.x, z: c.playerSpawn.z + 4 * P },
      ];
      am.data.idx = 0; am.timer = 60;
      am.objective = 'Checkpoint 1 of 3 — GO!';
    } else if (id === 'heat') {
      am.phase = 0; am.objective = 'Cause trouble — reach 3 stars.';
      this.crime(20); // kickstart the heat
    } else if (id === 'airport') {
      am.data.far = { x: c.MAP - ROAD, z: c.MAP - ROAD };
      am.data.back = { x: c.playerSpawn.x, z: c.playerSpawn.z };
      am.phase = 0;
      am.objective = 'Drive to the far corner of the city.';
    }
    this.activeMission = am;
    this.banner = def.name + ': ' + am.objective;
    this.bannerTimer = 4;
    this.events.push({ type: 'missionStart' });
    return true;
  }

  _tickMission(dt) {
    const am = this.activeMission;
    if (!am) return;
    const p = this.player, c = this.city;
    const id = am.def.id;
    const px = p.inVehicle ? p.inVehicle.x : p.x;
    const pz = p.inVehicle ? p.inVehicle.z : p.z;

    if (id === 'repo') {
      if (am.phase === 0) {
        if (p.inVehicle === am.data.car) {
          am.phase = 1; am.objective = 'Deliver it to the garage.';
          this._setBanner(am);
        }
      } else if (am.phase === 1) {
        if (p.inVehicle !== am.data.car) { /* still need to be in it */ }
        if (Math.hypot(c.garage.x - px, c.garage.z - pz) < 6 && p.inVehicle === am.data.car) {
          this._completeMission(am); return;
        }
      }
    } else if (id === 'dash') {
      am.timer -= dt;
      if (am.timer <= 0) { this._failMission(am, 'Out of time!'); return; }
      const cp = am.data.cps[am.data.idx];
      if (Math.hypot(cp.x - px, cp.z - pz) < 6) {
        am.data.idx++;
        if (am.data.idx >= am.data.cps.length) { this._completeMission(am); return; }
        am.objective = 'Checkpoint ' + (am.data.idx + 1) + ' of 3 — ' + Math.ceil(am.timer) + 's';
        this._setBanner(am);
      } else {
        am.objective = 'Checkpoint ' + (am.data.idx + 1) + ' of 3 — ' + Math.ceil(am.timer) + 's';
      }
    } else if (id === 'heat') {
      if (am.phase === 0) {
        am.objective = 'Reach 3 stars (' + this.stars + '/3).';
        if (this.stars >= 3) { am.phase = 1; am.objective = 'Now LOSE the cops!'; this._setBanner(am); }
      } else if (am.phase === 1) {
        am.objective = 'Lose the cops! Stars: ' + this.stars;
        if (this.stars === 0) { this._completeMission(am); return; }
      }
    } else if (id === 'airport') {
      if (am.phase === 0) {
        if (Math.hypot(am.data.far.x - px, am.data.far.z - pz) < 8) {
          am.phase = 1; am.objective = 'Now get back to the start.'; this._setBanner(am);
        }
      } else {
        if (Math.hypot(am.data.back.x - px, am.data.back.z - pz) < 8) { this._completeMission(am); return; }
      }
    }
  }

  _setBanner(am) { this.banner = am.def.name + ': ' + am.objective; this.bannerTimer = 4; }
  _completeMission(am) {
    this.completedMissions[am.def.id] = true;
    this.cash += am.def.cash;
    this.banner = 'MISSION PASSED: ' + am.def.name + '  +$' + am.def.cash;
    this.bannerTimer = 5;
    this.events.push({ type: 'missionComplete', cash: am.def.cash });
    if (am.data.car) am.data.car.mission = null;
    this.activeMission = null;
    if (Object.keys(this.completedMissions).length >= this.missionDefs.length) {
      this.state = 'win';
      this.events.push({ type: 'win' });
    }
  }
  _failMission(am, why) {
    this.banner = 'MISSION FAILED: ' + (why || am.def.name);
    this.bannerTimer = 4;
    this.events.push({ type: 'missionFail' });
    if (am.data.car) { am.data.car.mission = null; }
    this.activeMission = null;
  }

  // marker list for HUD / world icons
  markers() {
    const out = [];
    for (const m of this.missionDefs) {
      if (this.completedMissions[m.id]) continue;
      if (this.activeMission && this.activeMission.def.id === m.id) continue;
      out.push({ x: m.marker.x, z: m.marker.z, kind: 'mission', id: m.id });
    }
    const am = this.activeMission;
    if (am) {
      if (am.def.id === 'repo') {
        if (am.phase === 0 && am.data.car) out.push({ x: am.data.car.x, z: am.data.car.z, kind: 'target' });
        else out.push({ x: this.city.garage.x, z: this.city.garage.z, kind: 'target' });
      } else if (am.def.id === 'dash' && am.data.cps[am.data.idx]) {
        const cp = am.data.cps[am.data.idx];
        out.push({ x: cp.x, z: cp.z, kind: 'target' });
      } else if (am.def.id === 'airport') {
        const t = am.phase === 0 ? am.data.far : am.data.back;
        out.push({ x: t.x, z: t.z, kind: 'target' });
      }
    }
    return out;
  }

  // ---- death / bust -----------------------------------------------------
  _respawnAtHospital() {
    const p = this.player;
    if (p.inVehicle) { p.inVehicle.occupant = null; p.inVehicle.role = 'parked'; p.inVehicle = null; }
    p.x = this.city.hospital.x; p.z = this.city.hospital.z;
    p.health = p.maxHealth; p.dead = false; p.busted = false;
    this.heat = 0; this.stars = 0; this.coolTimer = 0;
    this.vehicles = this.vehicles.filter(v => v.role !== 'police');
    const loss = Math.min(this.cash, 100);
    this.cash -= loss;
    if (this.activeMission) this._failMission(this.activeMission, 'You blew it');
  }

  // ---- main step --------------------------------------------------------
  // input: { dt, forward, back, left, right, run, jump, camTurn, camPitch,
  //          enterExit, action }
  step(input) {
    const dt = Math.min(input.dt || 0.016, 0.05);
    this.time += dt;
    this.events.length = 0;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    if (this.state !== 'play') {
      // busted/wasted screens are handled by main; sim frozen except timers
      return;
    }

    const p = this.player;

    // camera control
    if (input.camTurn) this.camYaw += input.camTurn * 2.4 * dt;
    if (input.camPitch) this.camPitch = Math.max(-1.2, Math.min(0.2, this.camPitch + input.camPitch * dt));

    // enter/exit (edge-triggered by caller)
    if (input.enterExit) this.tryEnterExit();

    if (p.inVehicle) {
      // driving control
      const v = p.inVehicle;
      let throttle = 0;
      if (input.forward) throttle = 1;
      else if (input.back) { if (v.speed > 0.5) throttle = 0; else throttle = -1; }
      const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const brake = input.back && v.speed > 0.5;
      const res = v.step(this.city, { throttle, steer, brake, handbrake: input.jump, dt });
      if (res.crashed && res.crashSpeed > 9) {
        this.events.push({ type: 'crash', speed: res.crashSpeed });
        p.hurt(res.crashSpeed * 0.4);
      }
      // camera eases behind the car
      let d = v.heading - this.camYaw;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.camYaw += d * Math.min(1, 5 * dt);
      p.x = v.x; p.z = v.z;
    } else {
      // on-foot
      const mf = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      const ms = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      p.update(this.city, { mf, ms, run: input.run, jump: input.jump, dt, camYaw: this.camYaw });
      // punch/attack
      if (input.action) this._punch();
    }

    // update traffic + police
    this._updateVehicles(dt);
    // update peds
    this._updatePeds(dt);
    // vehicle-vs-vehicle
    this._vehicleCollisions();
    // player (vehicle) running over peds & bumping cars
    this._playerImpacts(dt);

    // wanted / police management
    this._updateWanted(dt);

    // mission auto-start on marker proximity (on foot)
    if (!this.activeMission && !p.inVehicle) {
      const m = this.availableMissionAt(p.x, p.z);
      if (m) this.startMission(m.id);
    }
    this._tickMission(dt);

    // busted: on foot, near police, slow
    this._checkBusted(dt);

    // death
    if (p.health <= 0 && this.state === 'play') {
      this.state = 'wasted';
      this.events.push({ type: 'wasted' });
    }
  }

  _updateVehicles(dt) {
    for (const v of this.vehicles) {
      v.slow = false;
      if (v.role === 'traffic') {
        // slow if something close ahead
        for (const o of this.vehicles) {
          if (o === v) continue;
          const dx = o.x - v.x, dz = o.z - v.z;
          const fwdx = Math.cos(v.heading), fwdz = Math.sin(v.heading);
          const along = dx * fwdx + dz * fwdz;
          if (along > 0 && along < 7 && Math.hypot(dx, dz) < 6) { v.slow = true; break; }
        }
        trafficStep(v, this.city, dt, this.rng);
      } else if (v.role === 'police') {
        const ctrl = policeControl(v, this.player.x, this.player.z, dt);
        ctrl.dt = dt;
        v.step(this.city, ctrl);
      }
    }
  }

  _updatePeds(dt) {
    const threats = [];
    if (this.player.inVehicle) threats.push(this.player.inVehicle);
    else threats.push({ x: this.player.x, z: this.player.z, speed: this.player.speed });
    for (const v of this.vehicles) if (Math.abs(v.speed) > 3) threats.push(v);
    for (const ped of this.peds) ped.update(this.city, dt, threats, this.rng);
    // respawn downed peds after their timer as fresh peds near player
    for (let i = 0; i < this.peds.length; i++) {
      const ped = this.peds[i];
      if (ped.state === 'down' && ped.downTimer <= 0) {
        const fresh = spawnPeds(this.city, this.player, 1, this.rng)[0];
        if (fresh) this.peds[i] = fresh;
      }
    }
  }

  _vehicleCollisions() {
    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const a = this.vehicles[i], b = this.vehicles[j];
        if (vehiclesOverlap(a, b)) {
          const impact = resolveVehicleCollision(a, b);
          const pv = this.player.inVehicle;
          if ((a === pv || b === pv) && impact > 8) {
            this.events.push({ type: 'bump', speed: impact });
            const other = a === pv ? b : a;
            if (other.role === 'police') this.crime(6);
            else this.crime(3);
          }
        }
      }
    }
  }

  _playerImpacts(dt) {
    const pv = this.player.inVehicle;
    // run over peds
    const actor = pv ? pv : { x: this.player.x, z: this.player.z, speed: this.player.speed };
    const spd = Math.abs(actor.speed || 0);
    for (const ped of this.peds) {
      if (ped.state === 'down') continue;
      const d = Math.hypot(ped.x - actor.x, ped.z - actor.z);
      const reach = pv ? (pv.w * 0.5 + 0.7) : 1.0;
      if (d < reach && (pv ? spd > 2 : false)) {
        if (ped.knockDown()) {
          this.events.push({ type: 'splat' });
          this.crime(8);
          if (pv) pv.speed *= 0.9;
        }
      }
    }
  }

  _punch() {
    const p = this.player;
    const fx = Math.cos(p.heading), fz = Math.sin(p.heading);
    for (const ped of this.peds) {
      if (ped.state === 'down') continue;
      const dx = ped.x - p.x, dz = ped.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.2 && (dx * fx + dz * fz) > 0) {
        ped.knockDown();
        this.events.push({ type: 'punch' });
        this.crime(6);
        break;
      }
    }
  }

  _checkBusted(dt) {
    const p = this.player;
    if (p.inVehicle || this.stars === 0) { this.bustTimer = 0; return; }
    let near = false;
    for (const v of this.vehicles) {
      if (v.role !== 'police') continue;
      if (Math.hypot(v.x - p.x, v.z - p.z) < 3.5 && Math.abs(v.speed) < 4) { near = true; break; }
    }
    if (near) {
      this.bustTimer += dt;
      if (this.bustTimer > 1.2) {
        this.state = 'busted';
        this.events.push({ type: 'busted' });
      }
    } else this.bustTimer = Math.max(0, this.bustTimer - dt);
  }

  // called by main after a busted/wasted screen to resume
  respawnAfterDown() {
    this._respawnAtHospital();
    this.state = 'play';
  }
}
