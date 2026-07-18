// Speedmoore 2 — headless pitch simulation. No DOM/canvas dependencies:
// runs in Node for AI self-play tests, and in the browser driven by main.js.
//
// World: portrait arena 320x600. Team dir = -1 attacks the TOP goal (y=0 end),
// dir = +1 attacks the BOTTOM goal. Ends swap at halftime.

export const WORLD_W = 320;
export const WORLD_H = 600;
export const WALL = 12;              // inner playfield edge
export const GOAL_X0 = 128, GOAL_X1 = 192;   // goal mouth (64 wide)
export const GOAL_DEPTH = 10;        // ball crossing y<10 / y>590 inside mouth scores
export const HALF_LEN = 90;          // seconds per half

// Side bumpers/deflectors: circles the ball ricochets off with a speed kick.
export const BUMPERS = [
  { x: 34, y: 150, r: 11 }, { x: 286, y: 150, r: 11 },
  { x: 34, y: 450, r: 11 }, { x: 286, y: 450, r: 11 },
  { x: 160, y: 150, r: 9 }, { x: 160, y: 450, r: 9 },
];

// Score multiplier stars on the side walls. Ball smacking the wall near one
// lights it; while any is lit, goals are worth double.
export const STARS = [
  { x: WALL + 2, y: 225 }, { x: WORLD_W - WALL - 2, y: 225 },
  { x: WALL + 2, y: 375 }, { x: WORLD_W - WALL - 2, y: 375 },
];
const STAR_LIT_TIME = 10;

export const DIFFICULTY = {
  easy:   { speed: 0.95, react: 0.50, aim: 0.38, shootRange: 115, tackleRange: 26, passWill: 0.35, keeper: 0.85, aggr: 0.45 },
  medium: { speed: 1.00, react: 0.26, aim: 0.20, shootRange: 145, tackleRange: 36, passWill: 0.55, keeper: 1.0, aggr: 0.7 },
  hard:   { speed: 1.05, react: 0.11, aim: 0.11, shootRange: 165, tackleRange: 48, passWill: 0.7, keeper: 1.20, aggr: 0.95 },
  // the human squad's AI teammates: always competent — the difficulty
  // setting picks the OPPONENT's strength, not your own team's.
  human:  { speed: 1.02, react: 0.12, aim: 0.12, shootRange: 158, tackleRange: 44, passWill: 0.65, keeper: 1.14, aggr: 0.85 },
};

// mulberry32 — tiny seeded PRNG so headless tests are repeatable.
export function rng32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const BASE_SPEED = 78;      // px/s field player
const PLAYER_R = 6;
const PICKUP_R = 9;
const TACKLE_HIT_R = 11;
const SLIDE_SPEED = 2.3;    // multiplier while sliding
const SLIDE_TIME = 0.32;
const SLIDE_RECOVER = 0.42;
const DOWN_TIME = 1.7;
const THROW_MIN = 175, THROW_MAX = 340;
const PASS_SPEED = 235;
const POWERUP_KINDS = ['armor', 'speed', 'magnet', 'freeze', 'coin'];

// Formation spots as [fraction of pitch length from own goal, x].
const SPOTS = {
  GK: [0.03, 160],
  DF: [[0.18, 95], [0.18, 225]],
  FW: [[0.45, 60], [0.40, 160], [0.45, 260]],
};

export class Match {
  // opts: { home:{name,stats,human,difficulty}, away:{...}, seed, halfLen }
  constructor(opts = {}) {
    this.rand = rng32(opts.seed ?? ((Math.random() * 1e9) | 0));
    this.halfLen = opts.halfLen ?? HALF_LEN;
    this.events = [];
    this.time = 0;
    this.half = 1;
    this.clock = this.halfLen;
    this.state = 'kickoff';       // kickoff | play | goal | halftime | fulltime
    this.stateT = 0.9;
    this.starLit = 0;             // seconds remaining on multiplier
    this.litStars = new Set();
    this.powerups = [];
    this.powerupT = 5;
    this.coins = 0;               // collected by human team (league money)
    this.hitstopReq = 0;

    this.teams = [0, 1].map((ti) => {
      const src = ti === 0 ? (opts.home || {}) : (opts.away || {});
      const stats = { attack: 0, defence: 0, speed: 0, armor: 0, ...(src.stats || {}) };
      return {
        i: ti,
        name: src.name || (ti === 0 ? 'HOME' : 'AWAY'),
        human: !!src.human,
        diff: src.human ? DIFFICULTY.human : DIFFICULTY[src.difficulty || 'medium'],
        stats,
        dir: ti === 0 ? -1 : 1,   // home attacks top first half
        score: 0,
        knockdowns: 0,
        goals: 0,
        possession: 0,
        freeze: 0,
      };
    });

    this.players = [];
    for (const team of this.teams) {
      const mk = (role, spot, idx) => this.players.push({
        id: this.players.length, team: team.i, role, spot, idx,
        x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: team.dir,
        down: 0, injured: 0, armor: 100,
        slide: 0, slideVx: 0, slideVy: 0, recover: 0, slideCd: 0,
        boost: 0, magnet: 0, holdT: 0,
        reactT: this.rand() * 0.3, target: null, wantSlide: false,
        runPhase: this.rand() * 6,
      });
      mk('GK', SPOTS.GK, 0);
      SPOTS.DF.forEach((s, i) => mk('DF', s, i));
      SPOTS.FW.forEach((s, i) => mk('FW', s, i));
    }

    this.ball = {
      x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0,
      carrier: -1, power: 0, noPick: -1, noPickT: 0,
    };

    this.controlled = this.teams[0].human ? this.pickNearestFielder(0) : -1;
    this.switchCd = 0;
    this.charge = -1;             // human throw power ramp, -1 = not charging
    this.idleT = 0;               // no-input time: controlled player autopilots when AFK

    this.placeFormation();
    this.emit({ t: 'whistle' });
  }

  emit(e) { this.events.push(e); }
  drainEvents() { const e = this.events; this.events = []; return e; }

  ownGoalY(team) { return team.dir === -1 ? WORLD_H : 0; }
  attackGoalY(team) { return team.dir === -1 ? 0 : WORLD_H; }

  spotPos(p, shift = 0) {
    const team = this.teams[p.team];
    const [f, sx] = p.spot;
    const ff = clamp(f + shift, 0.02, 0.9);
    const gy = this.ownGoalY(team);
    return { x: sx, y: gy + team.dir * ff * WORLD_H };
  }

  placeFormation(kickTeam = -1) {
    for (const p of this.players) {
      const pos = this.spotPos(p);
      p.x = pos.x; p.y = pos.y; p.vx = p.vy = 0;
      p.fx = 0; p.fy = this.teams[p.team].dir;
      p.down = 0; p.slide = 0; p.recover = 0;
    }
    this.ball.x = WORLD_W / 2; this.ball.y = WORLD_H / 2;
    this.ball.vx = this.ball.vy = 0;
    this.ball.carrier = -1; this.ball.power = 0; this.ball.noPickT = 0;
    if (kickTeam >= 0) {
      // conceding team restarts with the ball: centre forward at the spot
      const fw = this.players.find((p) => p.team === kickTeam && p.role === 'FW' && p.idx === 1);
      if (fw) {
        fw.x = WORLD_W / 2; fw.y = WORLD_H / 2 - this.teams[kickTeam].dir * 10;
        this.ball.carrier = fw.id;
        if (this.teams[0].human && kickTeam === 0) { this.controlled = fw.id; this.switchCd = 0.5; }
      }
    }
  }

  maxSpeed(p) {
    const team = this.teams[p.team];
    let s = BASE_SPEED * (1 + team.stats.speed * 0.055);
    if (!team.human || p.id !== this.controlled) s *= team.diff.speed;
    if (p.role === 'GK') s *= 1.06 * team.diff.keeper / team.diff.speed;
    if (p.injured > 0) s *= 0.5;
    if (p.boost > 0) s *= 1.38;
    if (this.ball.carrier === p.id) s *= 0.92;
    return s;
  }

  pickNearestFielder(ti) {
    let best = -1, bd = 1e9;
    for (const p of this.players) {
      if (p.team !== ti || p.role === 'GK' || p.down > 0) continue;
      const d = dist(p, this.ball);
      if (d < bd) { bd = d; best = p.id; }
    }
    return best;
  }

  // ------------------------------------------------------------------
  // main step. input (for the human team) is:
  //   { mx, my, passPressed, throwPressed, throwHeld, throwReleased }
  step(dt, input) {
    this.time += dt;
    this.events.length = 0 === this.events.length ? 0 : this.events.length; // keep queue
    if (this.state === 'fulltime') return;

    if (this.starLit > 0) {
      this.starLit -= dt;
      if (this.starLit <= 0) { this.starLit = 0; this.litStars.clear(); }
    }
    for (const t of this.teams) if (t.freeze > 0) t.freeze -= dt;

    if (this.state === 'kickoff' || this.state === 'goal') {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        if (this.state === 'goal') {
          this.placeFormation(this.kickTeam ?? -1);
          this.state = 'kickoff'; this.stateT = 0.8; this.emit({ t: 'whistle' });
        } else this.state = 'play';
      }
      if (this.state !== 'play') return;
    }
    if (this.state === 'halftime') return;

    // clock
    this.clock -= dt;
    if (this.clock <= 0) {
      this.clock = 0;
      if (this.half === 1) {
        this.state = 'halftime';
        this.emit({ t: 'whistle' }); this.emit({ t: 'halftime' });
      } else {
        this.state = 'fulltime';
        this.emit({ t: 'whistle' }); this.emit({ t: 'fulltime' });
      }
      return;
    }

    this.switchCd -= dt;
    if (input) {
      const active = input.mx || input.my || input.passPressed || input.throwPressed
        || input.throwHeld || input.throwReleased;
      this.idleT = active ? 0 : this.idleT + dt;
    }
    this.updateControlSwitch();
    this.updatePowerups(dt);

    const carrier = this.ball.carrier >= 0 ? this.players[this.ball.carrier] : null;
    if (carrier) this.teams[carrier.team].possession += dt;

    for (const p of this.players) this.updatePlayer(p, dt, input);
    this.resolvePlayerCollisions();
    this.updateBall(dt);
  }

  // ------------------------------------------------------------------
  updateControlSwitch() {
    const team = this.teams[0];
    if (!team.human) return;
    const cur = this.controlled >= 0 ? this.players[this.controlled] : null;
    // never steal control from the ball carrier
    if (cur && this.ball.carrier === cur.id) return;
    const focus = this.ball.carrier >= 0 ? this.players[this.ball.carrier] : this.ball;
    const cand = this.bestSwitchCandidate(focus);
    if (cand < 0) return;
    if (!cur || cur.down > 0) { this.controlled = cand; this.switchCd = 0.5; return; }
    if (this.switchCd > 0 || cand === this.controlled) return;
    const dCur = dist(cur, focus);
    const dNew = dist(this.players[cand], focus);
    // only switch when the candidate is CLEARLY nearer (hysteresis)
    if (dNew < dCur * 0.62 - 8) {
      this.controlled = cand;
      this.switchCd = 0.5;
      this.emit({ t: 'switch' });
    }
  }

  bestSwitchCandidate(focus) {
    let best = -1, bd = 1e9;
    for (const p of this.players) {
      if (p.team !== 0 || p.role === 'GK' || p.down > 0) continue;
      const d = dist(p, focus);
      if (d < bd) { bd = d; best = p.id; }
    }
    return best;
  }

  // ------------------------------------------------------------------
  updatePlayer(p, dt, input) {
    const team = this.teams[p.team];
    p.slideCd = Math.max(0, p.slideCd - dt);
    if (p.boost > 0) p.boost -= dt;
    if (p.magnet > 0) p.magnet -= dt;
    if (p.injured > 0) {
      p.injured -= dt;
      if (p.injured <= 0) p.armor = Math.max(p.armor, 60);
    }

    if (p.down > 0) {
      p.down -= dt;
      p.vx *= 0.85; p.vy *= 0.85;
      p.x += p.vx * dt; p.y += p.vy * dt;
      this.keepInBounds(p);
      return;
    }
    if (team.freeze > 0) { p.vx = p.vy = 0; return; }

    // sliding tackle in progress
    if (p.slide > 0) {
      p.slide -= dt;
      p.x += p.slideVx * dt; p.y += p.slideVy * dt;
      this.keepInBounds(p);
      this.checkSlideHit(p);
      if (p.slide <= 0) p.recover = SLIDE_RECOVER;
      return;
    }
    if (p.recover > 0) { p.recover -= dt; p.vx = p.vy = 0; return; }

    const isHuman = team.human && p.id === this.controlled && input && this.idleT < 2.5;
    if (isHuman) this.updateHumanPlayer(p, dt, input);
    else this.updateAIPlayer(p, dt);

    p.x += p.vx * dt; p.y += p.vy * dt;
    this.keepInBounds(p);
    if (Math.abs(p.vx) + Math.abs(p.vy) > 8) {
      const m = Math.hypot(p.vx, p.vy);
      p.fx = p.vx / m; p.fy = p.vy / m;
      p.runPhase += dt * 10;
    }

    // ball pickup
    this.tryPickup(p);
  }

  tryPickup(p) {
    const b = this.ball;
    if (b.carrier >= 0 || p.down > 0 || p.slide > 0) return;
    if (b.power > 0) return;                       // power ball is unstealable
    if (b.noPickT > 0 && b.noPick === p.id) return;
    const r = PICKUP_R + (p.magnet > 0 ? 9 : 0) + (p.role === 'GK' ? 4 : 0);
    if (dist(p, b) < r) {
      b.carrier = p.id;
      b.vx = b.vy = 0;
      p.holdT = 0;
      this.emit({ t: 'pickup', team: p.team });
      if (this.teams[0].human && p.team === 0 && p.role !== 'GK') {
        this.controlled = p.id; this.switchCd = 0.5;
      }
    }
  }

  // ------------------------------------------------------------------
  updateHumanPlayer(p, dt, input) {
    const sp = this.maxSpeed(p);
    let mx = input.mx || 0, my = input.my || 0;
    const m = Math.hypot(mx, my);
    if (m > 0) { mx /= m; my /= m; }
    p.vx = mx * sp; p.vy = my * sp;

    const hasBall = this.ball.carrier === p.id;
    if (hasBall) {
      // throw: press starts the power ramp, release throws.
      if (input.throwPressed) this.charge = 0;
      if (this.charge >= 0) {
        this.charge = Math.min(1, this.charge + dt / 0.85);
        if (input.throwReleased || (!input.throwHeld && !input.throwPressed)) {
          this.throwBall(p, this.aimForHuman(p, mx, my), this.charge);
          this.charge = -1;
        }
      }
      if (input.passPressed) { this.passBall(p); this.charge = -1; }
    } else {
      this.charge = -1;
      if (input.throwPressed && p.slideCd <= 0) this.startSlide(p, mx, my);
      if (input.passPressed) {
        // no ball: pass button nudges a sprint toward the ball (harmless helper)
      }
    }
  }

  aimForHuman(p, mx, my) {
    let ax = mx, ay = my;
    if (ax === 0 && ay === 0) { ax = p.fx; ay = p.fy; }
    if (ax === 0 && ay === 0) { ax = 0; ay = this.teams[p.team].dir; }
    // gentle assist: snap toward goal mouth centre when roughly aiming at it
    const team = this.teams[p.team];
    const gy = this.attackGoalY(team);
    const gx = (GOAL_X0 + GOAL_X1) / 2;
    const toGx = gx - p.x, toGy = gy - p.y;
    const gm = Math.hypot(toGx, toGy);
    const dot = (ax * toGx + ay * toGy) / (gm || 1);
    if (dot > 0.86) {
      ax = ax * 0.4 + (toGx / gm) * 0.6;
      ay = ay * 0.4 + (toGy / gm) * 0.6;
      const n = Math.hypot(ax, ay); ax /= n; ay /= n;
    }
    return { x: ax, y: ay };
  }

  // ------------------------------------------------------------------
  // AI
  updateAIPlayer(p, dt) {
    const team = this.teams[p.team];
    const diff = team.diff;
    p.reactT -= dt;
    if (p.reactT <= 0) {
      const rt = p.role === 'GK' ? diff.react * 0.4 : diff.react;
      p.reactT = rt * (0.7 + this.rand() * 0.6);
      this.decideAI(p);
    }
    // act on current target
    const sp = this.maxSpeed(p);
    if (p.target) {
      const dx = p.target.x - p.x, dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) { p.vx = (dx / d) * sp; p.vy = (dy / d) * sp; }
      else { p.vx = p.vy = 0; }
    } else { p.vx *= 0.8; p.vy *= 0.8; }

    if (p.wantSlide && p.slideCd <= 0 && this.ball.carrier >= 0) {
      const c = this.players[this.ball.carrier];
      if (c && c.team !== p.team) {
        const d = dist(p, c);
        if (d < diff.tackleRange) {
          const lead = 0.18;
          this.startSlide(p, c.x + c.vx * lead - p.x, c.y + c.vy * lead - p.y);
        }
      }
      p.wantSlide = false;
    }
  }

  decideAI(p) {
    const team = this.teams[p.team];
    const opp = this.teams[1 - p.team];
    const diff = team.diff;
    const b = this.ball;
    const carrier = b.carrier >= 0 ? this.players[b.carrier] : null;
    p.wantSlide = false;

    if (p.role === 'GK') { this.decideKeeper(p, carrier); return; }

    // I have the ball
    if (carrier === p) { this.decideCarrier(p); return; }

    if (!carrier) {
      // loose ball: two nearest of my team chase; others shape up
      const rank = this.chaseRank(p);
      if (rank < 2) { p.target = { x: b.x + b.vx * 0.15, y: b.y + b.vy * 0.15 }; return; }
      p.target = this.shapeSpot(p, 0.05);
      return;
    }

    if (carrier.team === p.team) {
      // support: push up, spread, stay open for a pass
      const shift = p.role === 'FW' ? 0.3 : 0.12;
      const spot = this.shapeSpot(p, shift);
      // drift x toward carrier lane a little for pass options
      spot.x = clamp(spot.x * 0.75 + carrier.x * 0.25 + (this.rand() - 0.5) * 30, 24, WORLD_W - 24);
      p.target = spot;
      return;
    }

    // opponent has the ball
    const rank = this.chaseRank(p, carrier);
    if (rank < 2 || (p.role === 'DF' && rank < 3)) {
      p.target = { x: carrier.x + carrier.vx * 0.2, y: carrier.y + carrier.vy * 0.2 };
      if (dist(p, carrier) < diff.tackleRange && this.rand() < diff.aggr * diff.react * 2.4) p.wantSlide = true;
      return;
    }
    // everyone else: drop between carrier and our goal
    const gy = this.ownGoalY(team);
    p.target = {
      x: clamp((carrier.x + (GOAL_X0 + GOAL_X1) / 2) / 2 + (p.idx - 1) * 34, 24, WORLD_W - 24),
      y: gy + team.dir * clamp(Math.abs(carrier.y - gy) * 0.5, 40, 200),
    };
  }

  decideKeeper(p, carrier) {
    const team = this.teams[p.team];
    const gy = this.ownGoalY(team);
    const b = this.ball;
    const lineY = gy + team.dir * 16;
    // predict where the ball crosses our line
    let tx = b.x;
    if (Math.abs(b.vy) > 40 && Math.sign(gy - b.y) === Math.sign(b.vy)) {
      const t = (lineY - b.y) / b.vy;
      if (t > 0 && t < 1.4) tx = b.x + b.vx * t;
    }
    tx = clamp(tx, GOAL_X0 + 6, GOAL_X1 - 6);
    // rush a loose ball near goal
    if (!carrier && Math.abs(b.y - gy) < 60 && b.power <= 0) {
      p.target = { x: b.x, y: b.y };
      return;
    }
    if (carrier === p) {
      p.holdT += 0.1;
      if (p.holdT > 0.7) this.passBall(p, true);
      p.target = { x: tx, y: lineY };
      return;
    }
    p.target = { x: tx, y: lineY };
  }

  decideCarrier(p) {
    const team = this.teams[p.team];
    const diff = team.diff;
    const gy = this.attackGoalY(team);
    const gx = (GOAL_X0 + GOAL_X1) / 2;
    const dGoal = Math.hypot(gx - p.x, gy - p.y);

    // shoot? aim at the post away from the keeper, with difficulty error
    if (dGoal < diff.shootRange && this.rand() < 0.75) {
      const gk = this.players.find((q) => q.team !== p.team && q.role === 'GK');
      const far = gk && gk.x > gx ? GOAL_X0 + 10 : GOAL_X1 - 10;
      const err = (this.rand() - 0.5) * 2 * diff.aim;
      const tx = far + err * 90;
      let dx = tx - p.x, dy = gy - p.y;
      const m = Math.hypot(dx, dy); dx /= m; dy /= m;
      const power = this.rand() < 0.15 ? 1 : 0.55 + this.rand() * 0.32;
      this.throwBall(p, { x: dx, y: dy }, power);
      return;
    }

    // pressured? maybe pass
    let nearOpp = 1e9;
    for (const q of this.players) {
      if (q.team === p.team || q.down > 0) continue;
      nearOpp = Math.min(nearOpp, dist(p, q));
    }
    if (nearOpp < 34 && this.rand() < diff.passWill) {
      if (this.passBall(p)) return;
    }

    // run at goal, weaving around tacklers
    let ax = gx - p.x, ay = gy - p.y;
    const m = Math.hypot(ax, ay); ax /= m; ay /= m;
    for (const q of this.players) {
      if (q.team === p.team || q.down > 0) continue;
      const d = dist(p, q);
      if (d < 55) {
        const w = (55 - d) / 55 * 1.4;
        ax += ((p.x - q.x) / (d || 1)) * w;
        ay += ((p.y - q.y) / (d || 1)) * w * 0.4; // keep pressing forward
      }
    }
    const am = Math.hypot(ax, ay) || 1;
    p.target = {
      x: clamp(p.x + (ax / am) * 70, 22, WORLD_W - 22),
      y: clamp(p.y + (ay / am) * 70, 16, WORLD_H - 16),
    };
  }

  chaseRank(p, focus) {
    const f = focus || this.ball;
    const myD = dist(p, f);
    let rank = 0;
    for (const q of this.players) {
      if (q.team !== p.team || q === p || q.role === 'GK' || q.down > 0) continue;
      // never count the human-controlled player: AI must cover for the human,
      // not assume the human will chase.
      if (this.teams[q.team].human && q.id === this.controlled) continue;
      if (dist(q, f) < myD) rank++;
    }
    return rank;
  }

  shapeSpot(p, shift) {
    const s = this.spotPos(p, shift);
    // bias toward ball's y a bit so the shape follows play
    s.y = clamp(s.y * 0.7 + this.ball.y * 0.3, 24, WORLD_H - 24);
    return s;
  }

  // ------------------------------------------------------------------
  // actions
  startSlide(p, dx, dy) {
    let m = Math.hypot(dx, dy);
    if (m < 0.01) { dx = p.fx; dy = p.fy; m = Math.hypot(dx, dy) || 1; }
    const sp = this.maxSpeed(p) * SLIDE_SPEED;
    p.slide = SLIDE_TIME;
    p.slideVx = (dx / m) * sp;
    p.slideVy = (dy / m) * sp;
    p.slideCd = 2.6;
    this.emit({ t: 'slide' });
  }

  checkSlideHit(p) {
    const b = this.ball;
    for (const q of this.players) {
      if (q.team === p.team || q.down > 0) continue;
      if (dist(p, q) > TACKLE_HIT_R) continue;
      const hadBall = b.carrier === q.id;
      if (!hadBall && !(dist(q, b) < 20)) continue;   // only clobber near the play
      this.knockDown(q, p, 'tackle');
      if (hadBall) {
        b.carrier = -1;
        b.x = q.x; b.y = q.y;
        b.vx = p.slideVx * 0.35 + (this.rand() - 0.5) * 60;
        b.vy = p.slideVy * 0.35 + (this.rand() - 0.5) * 60;
        b.noPick = -1; b.noPickT = 0;
      }
      p.slide = 0;
      p.recover = SLIDE_RECOVER;
      return;
    }
  }

  knockDown(q, by, how) {
    const byTeam = this.teams[by.team];
    // brutal = hit from behind or victim already battered
    const hvx = q.x - by.x, hvy = q.y - by.y;
    const hm = Math.hypot(hvx, hvy) || 1;
    const fromBehind = (q.fx * hvx + q.fy * hvy) / hm > 0.25;
    const dmg = (how === 'power' ? 34 : 24) + byTeam.stats.attack * 4 - this.teams[q.team].stats.armor * 3;
    q.armor = clamp(q.armor - Math.max(10, dmg), 0, 100);
    const brutal = fromBehind || q.armor <= 0;
    q.down = brutal ? DOWN_TIME * 1.5 : DOWN_TIME;
    if (q.role === 'GK') q.down *= 0.5;   // keepers wear the heavy plate
    q.vx = hvx / hm * 40; q.vy = hvy / hm * 40;
    if (brutal && q.armor < 35) { q.injured = 20; }
    byTeam.score += 2;                    // aggression pays
    byTeam.knockdowns++;
    this.emit({ t: 'knockdown', team: by.team, brutal, x: q.x, y: q.y, how });
    if (this.ball.carrier === q.id) this.ball.carrier = -1;
    if (this.teams[0].human && this.controlled === q.id) this.switchCd = 0;
  }

  throwBall(p, aim, power01) {
    const b = this.ball;
    if (b.carrier !== p.id) return;
    const team = this.teams[p.team];
    let m = Math.hypot(aim.x, aim.y) || 1;
    const pw = clamp(power01, 0, 1);
    const speed = (THROW_MIN + (THROW_MAX - THROW_MIN) * pw) * (1 + team.stats.attack * 0.04);
    b.carrier = -1;
    b.x = p.x + (aim.x / m) * (PLAYER_R + 3);
    b.y = p.y + (aim.y / m) * (PLAYER_R + 3);
    b.vx = (aim.x / m) * speed;
    b.vy = (aim.y / m) * speed;
    b.noPick = p.id; b.noPickT = 0.4;
    b.power = pw >= 0.95 ? 1.2 : 0;       // full ramp = classic power throw
    this.emit({ t: 'throw', power: pw });
  }

  passBall(p, hoof = false) {
    const b = this.ball;
    if (b.carrier !== p.id) return false;
    const team = this.teams[p.team];
    const gy = this.attackGoalY(team);
    let best = null, bs = -1e9;
    for (const q of this.players) {
      if (q.team !== p.team || q === p || q.down > 0 || q.role === 'GK') continue;
      const d = dist(p, q);
      if (d < 20 || d > 260) continue;
      let openness = 1e9;
      for (const o of this.players) {
        if (o.team === p.team || o.down > 0) continue;
        openness = Math.min(openness, dist(q, o));
      }
      const progress = (Math.abs(p.y - gy) - Math.abs(q.y - gy)); // positive = closer to goal
      const score = progress * 1.6 + Math.min(openness, 70) - d * 0.25 + (hoof ? progress : 0);
      if (score > bs) { bs = score; best = q; }
    }
    if (!best) return false;
    // lead the runner
    const lead = 0.35;
    const tx = best.x + best.vx * lead, ty = best.y + best.vy * lead;
    let dx = tx - p.x, dy = ty - p.y;
    const m = Math.hypot(dx, dy) || 1;
    b.carrier = -1;
    b.x = p.x + (dx / m) * (PLAYER_R + 3);
    b.y = p.y + (dy / m) * (PLAYER_R + 3);
    b.vx = (dx / m) * PASS_SPEED;
    b.vy = (dy / m) * PASS_SPEED;
    b.noPick = p.id; b.noPickT = 0.4;
    b.power = 0;
    this.emit({ t: 'pass' });
    return true;
  }

  // ------------------------------------------------------------------
  updateBall(dt) {
    const b = this.ball;
    if (b.noPickT > 0) b.noPickT -= dt;
    if (b.carrier >= 0) {
      const p = this.players[b.carrier];
      b.x = p.x + p.fx * (PLAYER_R + 2);
      b.y = p.y + p.fy * (PLAYER_R + 2);
      b.vx = p.vx; b.vy = p.vy;
      return;
    }

    // friction
    const f = Math.exp(-(b.power > 0 ? 0.25 : 1.05) * dt);
    b.vx *= f; b.vy *= f;
    if (b.power > 0) {
      b.power -= dt;
      if (Math.hypot(b.vx, b.vy) < 130) b.power = 0;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const speed = Math.hypot(b.vx, b.vy);

    // goals — check before wall clamp
    if (b.x > GOAL_X0 + 3 && b.x < GOAL_X1 - 3) {
      if (b.y <= GOAL_DEPTH) { this.scoreGoal(this.teams.find((t) => t.dir === -1)); return; }
      if (b.y >= WORLD_H - GOAL_DEPTH) { this.scoreGoal(this.teams.find((t) => t.dir === 1)); return; }
    }

    // walls
    let clanged = false;
    if (b.x < WALL) { b.x = WALL; b.vx = Math.abs(b.vx) * 0.78; clanged = true; }
    if (b.x > WORLD_W - WALL) { b.x = WORLD_W - WALL; b.vx = -Math.abs(b.vx) * 0.78; clanged = true; }
    const inMouth = b.x > GOAL_X0 + 3 && b.x < GOAL_X1 - 3;
    if (!inMouth) {
      if (b.y < WALL) { b.y = WALL; b.vy = Math.abs(b.vy) * 0.78; clanged = true; }
      if (b.y > WORLD_H - WALL) { b.y = WORLD_H - WALL; b.vy = -Math.abs(b.vy) * 0.78; clanged = true; }
    }
    if (clanged && speed > 55) {
      this.emit({ t: 'clang', speed });
      // multiplier stars
      for (let i = 0; i < STARS.length; i++) {
        if (dist(b, STARS[i]) < 34 && speed > 90 && !this.litStars.has(i)) {
          this.litStars.add(i);
          this.starLit = STAR_LIT_TIME;
          this.emit({ t: 'star', i });
        }
      }
    }

    // bumpers
    for (const bp of BUMPERS) {
      const d = Math.hypot(b.x - bp.x, b.y - bp.y);
      if (d < bp.r + 3 && d > 0.01) {
        const nx = (b.x - bp.x) / d, ny = (b.y - bp.y) / d;
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
        const s = Math.max(Math.hypot(b.vx, b.vy) * 1.12, 170);
        const m = Math.hypot(b.vx, b.vy) || 1;
        b.vx = (b.vx / m) * s; b.vy = (b.vy / m) * s;
        b.x = bp.x + nx * (bp.r + 3.2);
        b.y = bp.y + ny * (bp.r + 3.2);
        this.emit({ t: 'bumper' });
      }
    }

    // power ball flattens people
    if (b.power > 0 && speed > 120) {
      const thrower = b.noPick >= 0 ? this.players[b.noPick] : null;
      for (const q of this.players) {
        if (q.down > 0) continue;
        if (thrower && q.team === thrower.team) continue;
        if (Math.hypot(q.x - b.x, q.y - b.y) < PLAYER_R + 4) {
          if (thrower) this.knockDown(q, thrower, 'power');
          else { q.down = DOWN_TIME; }
          // ball caroms off the armor — a body IS a save, but a painful one
          b.vx = -b.vx * 0.45 + (this.rand() - 0.5) * 80;
          b.vy = -b.vy * 0.45 + (this.rand() - 0.5) * 80;
          b.power = 0;
        }
      }
    }
  }

  scoreGoal(team) {
    const pts = this.starLit > 0 ? 20 : 10;
    team.score += pts;
    team.goals++;
    this.emit({ t: 'goal', team: team.i, pts, mult: this.starLit > 0 });
    this.state = 'goal';
    this.stateT = 2.0;
    this.kickTeam = 1 - team.i;
    this.starLit = 0; this.litStars.clear();
    this.ball.vx = this.ball.vy = 0; this.ball.power = 0;
    this.ball.carrier = -1;
    this.charge = -1;
  }

  startSecondHalf() {
    if (this.state !== 'halftime') return;
    this.half = 2;
    this.clock = this.halfLen;
    for (const t of this.teams) t.dir *= -1;
    this.placeFormation();
    this.state = 'kickoff';
    this.stateT = 0.9;
    this.emit({ t: 'whistle' });
  }

  // ------------------------------------------------------------------
  keepInBounds(p) {
    p.x = clamp(p.x, WALL + 2, WORLD_W - WALL - 2);
    p.y = clamp(p.y, WALL + 2, WORLD_H - WALL - 2);
    // keep field players out of goal mouths; keepers may roam their box
    for (const bp of BUMPERS) {
      const d = Math.hypot(p.x - bp.x, p.y - bp.y);
      if (d < bp.r + PLAYER_R && d > 0.01) {
        const push = (bp.r + PLAYER_R - d);
        p.x += ((p.x - bp.x) / d) * push;
        p.y += ((p.y - bp.y) / d) * push;
      }
    }
  }

  resolvePlayerCollisions() {
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i], c = this.players[j];
        if (a.down > 0 || c.down > 0) continue;
        const dx = c.x - a.x, dy = c.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < PLAYER_R * 2 && d > 0.01) {
          const push = (PLAYER_R * 2 - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          c.x += (dx / d) * push; c.y += (dy / d) * push;
        }
      }
    }
  }

  // ------------------------------------------------------------------
  updatePowerups(dt) {
    this.powerupT -= dt;
    if (this.powerupT <= 0 && this.powerups.length < 2) {
      this.powerupT = 7 + this.rand() * 5;
      const kind = POWERUP_KINDS[(this.rand() * POWERUP_KINDS.length) | 0];
      this.powerups.push({
        kind,
        x: 40 + this.rand() * (WORLD_W - 80),
        y: 90 + this.rand() * (WORLD_H - 180),
        life: 12,
      });
    }
    for (const pu of this.powerups) pu.life -= dt;
    this.powerups = this.powerups.filter((pu) => pu.life > 0);

    for (const pu of [...this.powerups]) {
      for (const p of this.players) {
        if (p.down > 0) continue;
        if (Math.hypot(p.x - pu.x, p.y - pu.y) > PICKUP_R + 2) continue;
        this.applyPowerup(p, pu.kind);
        this.powerups = this.powerups.filter((x) => x !== pu);
        break;
      }
    }
  }

  applyPowerup(p, kind) {
    const team = this.teams[p.team];
    if (kind === 'armor') { p.armor = 100; p.injured = 0; }
    else if (kind === 'speed') p.boost = 6;
    else if (kind === 'magnet') p.magnet = 8;
    else if (kind === 'freeze') { this.teams[1 - p.team].freeze = 2; this.emit({ t: 'freeze' }); }
    else if (kind === 'coin') { if (team.human) this.coins += 5; }
    this.emit({ t: 'powerup', kind, team: p.team });
  }

  // convenience for tests / result screens
  result() {
    const [a, b] = this.teams;
    return {
      score: [a.score, b.score],
      goals: [a.goals, b.goals],
      knockdowns: [a.knockdowns, b.knockdowns],
      possession: [a.possession, b.possession],
      coins: this.coins,
    };
  }
}

// Run a full AI-vs-AI match headlessly (used by tests and league quick-sim).
export function simulate(homeOpts, awayOpts, seed, halfLen = HALF_LEN) {
  const m = new Match({ home: homeOpts, away: awayOpts, seed, halfLen });
  const dt = 1 / 60;
  let guard = 0;
  const maxSteps = Math.ceil((halfLen * 2 + 120) * 60);
  while (m.state !== 'fulltime' && guard++ < maxSteps) {
    m.step(dt, homeOpts.human ? { mx: 0, my: 0 } : undefined);
    if (m.state === 'halftime') m.startSecondHalf();
    m.drainEvents();
  }
  return m;
}
