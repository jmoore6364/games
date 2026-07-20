// Bike (the Papermoore), thrown papers, hazards and paper bundles.

import {
  proj, LAYOUT, BIKE_RV, RV_MAX, VIEW_W,
  drawSprite, drawCentered, drawObstacle, drawShadow,
} from './sprites.js';

const L = LAYOUT;
const P_GRAV = 0.14;

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ============================ BIKE ============================

export class Bike {
  constructor() {
    this.wx = L.CENTER;
    this.vx = 0;
    this.speed = 1.0;
    this.papers = 10;
    this.lastSide = 'R';
    this.throwCd = 0;
    this.throwAnim = 0;
    this.crash = false; this.crashT = 0;
    this.invuln = 0;
    this.pedal = 0;
    this.z = 0; this.vz = 0;          // used in the BMX bonus (bunny-hop)
    this.hop = false;
  }

  reset() {
    this.wx = L.CENTER; this.vx = 0; this.crash = false; this.crashT = 0;
    this.invuln = 90; this.z = 0; this.vz = 0; this.hop = false; this.throwAnim = 0;
  }

  // returns a thrown Paper or null
  update(game, inp, base) {
    if (this.throwCd > 0) this.throwCd--;
    if (this.throwAnim > 0) this.throwAnim--;
    if (this.invuln > 0) this.invuln--;

    if (this.crash) {
      this.crashT--;
      this.speed = Math.max(0, this.speed - 0.05);
      if (this.crashT <= 0) { this.crash = false; this.invuln = 100; }
      return null;
    }

    // steer with momentum
    const lr = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    if (lr) { this.vx += lr * 0.34; this.lastSide = lr > 0 ? 'R' : 'L'; }
    else this.vx *= 0.8;
    this.vx = clamp(this.vx, -2.4, 2.4);
    this.wx += this.vx;
    if (this.wx < L.LANE_L) { this.wx = L.LANE_L; this.vx = 0; }
    if (this.wx > L.LANE_R) { this.wx = L.LANE_R; this.vx = 0; }

    // speed modulation
    let target = base;
    if (inp.down('up')) target = base * 1.9;
    else if (inp.down('down')) target = base * 0.34;
    this.speed += (target - this.speed) * 0.08;
    this.pedal += this.speed * 0.14;

    // throw a paper
    let paper = null;
    if (inp.pressed('throw') && this.throwCd === 0 && this.papers > 0) {
      const side = inp.down('left') ? 'L' : inp.down('right') ? 'R' : this.lastSide;
      paper = new Paper(this.wx, game.camV + BIKE_RV, side);
      this.papers--;
      this.throwCd = 10;
      this.throwAnim = 12;
    }
    return paper;
  }

  // BMX variant: lateral dodge + bunny-hop
  updateBmx(game, inp, base) {
    if (this.throwAnim > 0) this.throwAnim--;
    if (this.invuln > 0) this.invuln--;
    if (this.crash) {
      this.crashT--;
      if (this.crashT <= 0) { this.crash = false; this.invuln = 80; }
      return;
    }
    const lr = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    if (lr) { this.vx += lr * 0.4; this.lastSide = lr > 0 ? 'R' : 'L'; }
    else this.vx *= 0.8;
    this.vx = clamp(this.vx, -2.8, 2.8);
    this.wx += this.vx;
    this.wx = clamp(this.wx, L.ROAD_L - 30, L.ROAD_R + 30);
    this.speed += (base - this.speed) * 0.05;
    this.pedal += this.speed * 0.16;
    // hop
    if (!this.hop && (inp.pressed('throw') || inp.pressed('up'))) {
      this.hop = true; this.vz = 3.2; game.sound.hop();
    }
    if (this.hop) {
      this.z += this.vz; this.vz -= 0.24;
      if (this.z <= 0) { this.z = 0; this.hop = false; this.vz = 0; game.sound.land(); }
    }
  }

  draw(ctx, camV, frame) {
    const p = proj(this.wx, BIKE_RV);
    const flick = this.invuln > 0 && !this.crash && frame % 6 < 3;
    if (flick) return;
    drawShadow(ctx, p.x, p.y, 9);
    const y = p.y - this.z;
    if (this.crash) {
      drawSprite(ctx, 'bikeCrash', p.x - 10, y - 22, false);
      return;
    }
    let name = 'bike1';
    let flip = false;
    if (this.throwAnim > 0) {
      name = 'bikeThrow';
      flip = this.lastSide === 'L';
    } else if (this.vx < -0.6) { name = 'bikeLean'; flip = false; }
    else if (this.vx > 0.6) { name = 'bikeLean'; flip = true; }
    else name = (Math.floor(this.pedal) % 2 === 0) ? 'bike1' : 'bike2';
    drawSprite(ctx, name, p.x - 10, y - 24, flip);
  }
}

// ============================ PAPER ============================

export class Paper {
  constructor(wx, v, side) {
    this.wx = wx; this.v = v; this.side = side;
    const target = side === 'L' ? L.L_MB : L.R_MB;
    this.flightT = 20;
    this.vx = (target - wx) / this.flightT;
    this.vv = 0.9;
    this.z = 6; this.vz = 1.1;
    this.t = 0;
    this.landed = false;
    this.landWx = target;
  }

  update() {
    if (this.landed) { this.deadT = (this.deadT || 0) + 1; return; }
    this.t++;
    this.wx += this.vx;
    this.v += this.vv;
    this.z += this.vz; this.vz -= P_GRAV;
    if (this.t >= this.flightT || this.z <= 0) {
      this.z = 0; this.landed = true; this.landWx = this.wx;
    }
  }

  draw(ctx, camV) {
    const rv = this.v - camV;
    const p = proj(this.wx, rv);
    // landing shadow shows exactly where it comes down
    drawShadow(ctx, p.x, p.y, 3);
    if (this.landed && this.deadT > 12) return;
    drawSprite(ctx, 'paper', p.x - 2, p.y - this.z - 4, false);
  }

  get gone() { return this.landed && this.deadT > 16; }
}

// ============================ HAZARDS ============================

const STATIC = new Set(['hydrant', 'cone', 'drain', 'tombstone', 'construct']);

export class Hazard {
  constructor(kind, wx, v, opt = {}) {
    this.kind = kind;
    this.wx = wx; this.v = v;
    this.spd = opt.spd ?? 0;
    this.dir = opt.dir ?? 1;
    this.wxMin = opt.wxMin ?? (L.ROAD_L - 6);
    this.wxMax = opt.wxMax ?? (L.ROAD_R + 6);
    this.seed = Math.random() * 100;
    this.deadly = kind === 'reaper';
    this.hitX = opt.hitX ?? 9;
    this.barked = false;
    this.gone = false;
  }

  update(game) {
    const b = game.bike;
    const rv = this.v - game.camV;
    switch (this.kind) {
      case 'car': case 'car2':
        this.v -= this.spd; break;               // oncoming, rushes down-street
      case 'skater':
        this.v -= this.spd;
        this.wx += Math.sin((game.frame + this.seed) * 0.09) * 1.0; break;
      case 'trike': case 'mower':
        this.v -= this.spd * 0.4; break;          // slow movers
      case 'jogger': case 'cat': case 'drunk':    // cross / weave
        this.wx += this.dir * this.spd;
        if (this.wx < this.wxMin) { this.wx = this.wxMin; this.dir = 1; }
        if (this.wx > this.wxMax) { this.wx = this.wxMax; this.dir = -1; }
        this.v -= 0.35; break;
      case 'dancer':
        this.wx += Math.sin((game.frame + this.seed) * 0.12) * 1.2; break;
      case 'dog':
        this.wx += Math.sign(b.wx - this.wx) * 0.6;
        this.v -= 1.05;
        if (!this.barked && rv < 60 && rv > 40) { this.barked = true; game.sound.bark(); }
        break;
      case 'reaper':
        this.wx += Math.sign(b.wx - this.wx) * 0.34;
        this.v -= 0.55; break;
      default: break;                              // static obstacles: camera passes them
    }
    if (this.v - game.camV < -44) this.gone = true;
  }

  hits(bike) {
    if (bike.z > 6) return false;                  // hopped over (BMX)
    const rv = this.v - (bike.camV ?? 0);
    return false; // real check done in game with camV
  }

  draw(ctx, camV, frame) {
    const rv = this.v - camV;
    if (rv < -44 || rv > RV_MAX + 10) return;
    const p = proj(this.wx, rv);
    const scale = clamp(1.1 - rv * 0.0032, 0.6, 1.1);
    if (STATIC.has(this.kind)) { drawObstacle(ctx, this.kind, p.x, p.y, scale); return; }
    drawShadow(ctx, p.x, p.y, 7 * scale);
    const flip = this.dir < 0 || (this.kind === 'dog' && this.wx > L.CENTER);
    let name = this.kind;
    if (name === 'car2') name = 'car2';
    drawCentered(ctx, name, p.x, p.y, flip, scale);
  }
}

// ============================ BUNDLE ============================

export class Bundle {
  constructor(wx, v) { this.wx = wx; this.v = v; this.gone = false; this.bob = Math.random() * 6; }
  draw(ctx, camV, frame) {
    const rv = this.v - camV;
    if (rv < -20 || rv > RV_MAX) return;
    const p = proj(this.wx, rv);
    drawShadow(ctx, p.x, p.y, 5);
    const bob = Math.sin((frame + this.bob * 10) * 0.15) * 1.5;
    drawCentered(ctx, 'bundle', p.x, p.y - bob, false, 1);
  }
}
