// player.js — the little climbing hero "Moore": running on girders, climbing
// ladders, jumping arcs, and the hammer power-up. Solid platform + ladder
// collision, plus fall-too-far detection.

import {
  GIRDERS, surfaceY, supportedAt, girderBelow, ladderAt,
  ladderTop, ladderBottom, WALL_L, WALL_R,
} from './level.js';

const RUN = 1.15;
const CLIMB = 1.0;
const JUMP_V = -3.5;
const GRAV = 0.22;
const FALL_DEATH = 52;   // fall farther than this = death

export class Player {
  constructor(start) {
    this.reset(start);
  }

  reset(start) {
    this.gi = start.gi;
    this.x = start.x;
    this.y = surfaceY(GIRDERS[start.gi], start.x);
    this.facing = 1;
    this.onLadder = false;
    this.ladder = null;
    this.jumping = false;
    this.vy = 0;
    this.takeoffY = this.y;
    this.animT = 0;
    this.moving = false;
    this.hammer = 0;        // seconds remaining
    this.hammerSwing = 0;   // phase
    this.dead = false;
    this.won = false;
    this.jumpedThisArc = false;
  }

  bbox() {
    return { x: this.x - 6, y: this.y - 22, w: 12, h: 22 };
  }

  // hammer head rectangle (or null)
  hammerBox() {
    if (this.hammer <= 0) return null;
    const up = this.hammerSwing < 0.5;
    const hx = this.x + this.facing * 6;
    if (up) return { x: hx - 6, y: this.y - 30, w: 12, h: 10 };
    return { x: hx - 6, y: this.y - 12, w: 14, h: 12 };
  }

  // dt in seconds; input is the Input instance. Returns event string or null.
  update(dt, input, onJump) {
    if (this.dead || this.won) return null;
    this.animT += dt;
    if (this.hammer > 0) {
      this.hammer -= dt;
      this.hammerSwing = (this.hammerSwing + dt * 3) % 1;
      if (this.hammer < 0) this.hammer = 0;
    }

    const left = input.down('left');
    const right = input.down('right');
    const up = input.down('up');
    const dn = input.down('down');
    const wantJump = input.pressed('jump');
    this.moving = false;

    // ---------- climbing on a ladder ----------
    if (this.onLadder) {
      const l = this.ladder;
      const top = ladderTop(l), bot = ladderBottom(l);
      let vy = 0;
      if (up) vy = -CLIMB;
      else if (dn) vy = CLIMB;
      this.y += vy;
      this.moving = vy !== 0;
      this.animT += Math.abs(vy) * 0.02;
      if (this.y <= top) {          // reached upper girder
        this.y = top; this.gi = l.gHigh; this.onLadder = false; this.ladder = null;
      } else if (this.y >= bot) {   // back down to lower girder
        this.y = bot; this.gi = l.gLow; this.onLadder = false; this.ladder = null;
      }
      return null;
    }

    // ---------- airborne (jump or fall) ----------
    if (this.jumping) {
      // air control
      if (left) { this.x -= RUN * 0.85; this.facing = -1; }
      if (right) { this.x += RUN * 0.85; this.facing = 1; }
      this.x = Math.max(WALL_L, Math.min(WALL_R, this.x));
      this.vy += GRAV;
      this.y += this.vy;
      if (this.vy >= 0) {
        const below = girderBelow(this.x, this.y, -1);
        if (below && this.y >= below.y) {
          this.y = below.y;
          this.gi = below.g.i;
          this.jumping = false;
          this.vy = 0;
          const fell = this.y - this.takeoffY;
          if (fell > FALL_DEATH) { this.dead = true; return 'death'; }
        }
      }
      if (this.y > 300) { this.dead = true; return 'death'; }
      return null;
    }

    // ---------- grounded on a girder ----------
    const g = GIRDERS[this.gi];

    // mount ladders
    if (up) {
      const l = ladderAt(this.x, this.gi, 'up');
      if (l) { this.onLadder = true; this.ladder = l; this.x = l.x; this.y -= CLIMB; return null; }
    }
    if (dn) {
      const l = ladderAt(this.x, this.gi, 'down');
      if (l) { this.onLadder = true; this.ladder = l; this.x = l.x; this.y += CLIMB; return null; }
    }

    // run (blocked while swinging the hammer? classic lets you walk, not jump)
    if (left) { this.x -= RUN; this.facing = -1; this.moving = true; }
    if (right) { this.x += RUN; this.facing = 1; this.moving = true; }
    this.x = Math.max(WALL_L, Math.min(WALL_R, this.x));

    // support check: if we walked over a hole / off a short girder, fall
    if (!supportedAt(g, this.x)) {
      this.jumping = true; this.vy = 0.5; this.takeoffY = this.y;
      return null;
    }
    this.y = surfaceY(g, this.x);

    // jump (not while holding the hammer)
    if (wantJump && this.hammer <= 0) {
      this.jumping = true;
      this.vy = JUMP_V;
      this.takeoffY = this.y;
      this.jumpedThisArc = false;
      if (onJump) onJump();
    }
    return null;
  }

  giveHammer(seconds) { this.hammer = seconds; this.hammerSwing = 0; }
}
