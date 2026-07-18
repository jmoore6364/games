// Baseball Moores — headless simulation core.
// Fully DOM-free: pitch physics, contact model, at-bat/inning/game rules,
// baserunning, box score, and stat-driven CPU resolution. Imported by both
// the browser game (main.js) and the league engine (league.js), and runnable
// standalone in Node for verification.

// ---- seedable RNG (mulberry32) ----
export function makeRNG(seed) {
  let s = (seed >>> 0) || 1;
  return function rng() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const PITCH_TYPES = ['fast', 'curveL', 'curveR', 'change'];

// =====================================================================
//  PHYSICS (used by the interactive game for animated pitches + contact)
// =====================================================================

// Pitch flight parameters given a pitcher + chosen type. Returns how the
// ball travels from mound to plate: forward speed and lateral curve.
export function pitchPhysics(pitcher, type, tired = 0) {
  const velo = clamp(pitcher.velo - tired * 3, 1, 10);
  const curveStat = pitcher.curve;
  // frames the pitch takes to reach the plate (faster velo = fewer frames)
  const frames = Math.round(42 - velo * 1.7); // velo10 ~25f, velo1 ~40f
  let curve = 0, drop = 0;
  if (type === 'curveL') curve = -(0.6 + curveStat * 0.16);
  else if (type === 'curveR') curve = (0.6 + curveStat * 0.16);
  else if (type === 'change') { curve = 0; drop = 0.5 + curveStat * 0.05; }
  return { frames, curve, drop, velo, type };
}

// Contact model. timingError in frames (0 = perfect); swingY/pitchY in the
// [-1,1] zone coordinate. Returns whether contact happened and, if so, the
// batted-ball vector. Solid-contact window is ~+/-4 frames.
export function contactModel(batter, pitch, timingError, gapY, rng) {
  const ae = Math.abs(timingError);
  // vertical mismatch between swing plane and pitch also hurts
  const heightMiss = Math.abs(gapY);
  // whiff if wildly early/late or way off the pitch height
  const contactSkill = 0.5 + batter.contact * 0.04; // .54..0.9
  const windowMiss = clamp((ae - 4) / 9, 0, 1);      // 0 within 4f, 1 by 13f
  const missChance = clamp(windowMiss * 0.9 + heightMiss * 0.5 - (contactSkill - 0.6), 0, 0.97);
  if (rng() < missChance) return { whiff: true };
  // quality: 1 at perfect timing, falls off
  const timingQ = clamp(1 - ae / 10, 0, 1) * clamp(1 - heightMiss * 0.6, 0.2, 1);
  const foul = timingQ < 0.28 || (rng() < 0.22 && timingQ < 0.6);
  // exit speed from power + quality
  const exit = 2.2 + batter.power * 0.28 * (0.4 + timingQ * 0.9) + timingQ * 1.6;
  // launch angle: sweet timing lifts the ball; early/late flatten or pop up
  let launch = 12 + timingQ * 22 - ae * 1.2;
  if (timingError < -6) launch += 22; // very late -> pop up
  launch = clamp(launch + (rng() - 0.5) * 10, -12, 62);
  // spray: early (negative err) = pull, late = opposite field
  const spray = clamp(timingError * 4 + (rng() - 0.5) * 12, -46, 46);
  return { whiff: false, foul, exit, launch, spray, timingQ };
}

// =====================================================================
//  TEAM / PLAYER STAT HELPERS
// =====================================================================

export function teamDefense(team) {
  const f = team.lineup.map((p) => p.bat?.defense ?? 5);
  return f.reduce((a, b) => a + b, 0) / f.length;
}
export function teamSpeed(team) {
  const f = team.lineup.map((p) => p.bat?.speed ?? 5);
  return f.reduce((a, b) => a + b, 0) / f.length;
}

// =====================================================================
//  GAME STATE — rules, count, bases, score, box score
// =====================================================================

function blankBatLine(p) {
  return { name: p.name, pos: p.pos, ab: 0, r: 0, h: 0, rbi: 0, hr: 0, bb: 0, so: 0, d: 0, t: 0 };
}
function blankPitLine(p) {
  return { name: p.name, outs: 0, r: 0, h: 0, hr: 0, bb: 0, k: 0, bf: 0, pitches: 0, w: 0, l: 0, sv: 0 };
}

export class GameState {
  constructor(away, home, opts = {}) {
    this.teams = [away, home]; // 0 = away (bats top), 1 = home (bats bottom)
    this.maxInnings = opts.maxInnings || 9;
    this.mercy = opts.mercy ?? 10;
    this.inning = 1;
    this.half = 0; // 0 top (away batting), 1 bottom (home batting)
    this.outs = 0;
    this.balls = 0;
    this.strikes = 0;
    this.bases = [null, null, null]; // 1st, 2nd, 3rd
    this.score = [0, 0];
    this.hits = [0, 0];
    this.errors = [0, 0];
    this.hr = [0, 0];
    this.lob = [0, 0];
    this.line = [[], []]; // runs per inning per team
    this.batIndex = [0, 0];
    this.pitcherIdx = [0, 0];
    this.fatigue = [0, 0]; // pitch-count fatigue units
    this.box = [
      { bat: away.lineup.map(blankBatLine), pit: [blankPitLine(away.rotation[0])] },
      { bat: home.lineup.map(blankBatLine), pit: [blankPitLine(home.rotation[0])] },
    ];
    this.over = false;
    this.log = [];
    this.lastPlay = null;
  }

  battingTeam() { return this.teams[this.half]; }
  fieldingTeam() { return this.teams[1 - this.half]; }
  batter() { return this.battingTeam().lineup[this.batIndex[this.half]]; }
  currentPitcher() {
    const t = this.fieldingTeam();
    return t.rotation[this.pitcherIdx[1 - this.half]] || t.rotation[0];
  }
  pitcherLine() {
    const side = 1 - this.half;
    const arr = this.box[side].pit;
    return arr[arr.length - 1];
  }
  // effective (fatigue-adjusted) pitcher stats
  effPitcher() {
    const p = this.currentPitcher();
    const side = 1 - this.half;
    const t = clamp(this.fatigue[side] / Math.max(1, p.pit.stamina * 14), 0, 1);
    return {
      velo: clamp(p.pit.velo - t * 4, 1, 10),
      curve: p.pit.curve,
      control: clamp(p.pit.control - t * 3, 1, 10),
      stamina: p.pit.stamina,
      tired: t,
      ref: p,
    };
  }
  changePitcher(idx) {
    const side = 1 - this.half;
    const t = this.fieldingTeam();
    if (idx < 0 || idx >= t.rotation.length) return false;
    if (idx === this.pitcherIdx[side]) return false;
    this.pitcherIdx[side] = idx;
    this.fatigue[side] = 0;
    this.box[side].pit.push(blankPitLine(t.rotation[idx]));
    return true;
  }

  batLine() { return this.box[this.half].bat[this.batIndex[this.half]]; }

  addPitch() {
    const side = 1 - this.half;
    this.fatigue[side] += 1;
    this.pitcherLine().pitches++;
  }

  resetCount() { this.balls = 0; this.strikes = 0; }

  nextBatter() {
    this.batIndex[this.half] = (this.batIndex[this.half] + 1) % 9;
    this.resetCount();
  }

  // ---- primitive outcomes ----
  ball() {
    this.balls++;
    if (this.balls >= 4) { this.walk(); return 'walk'; }
    return 'ball';
  }
  strike(swinging) {
    this.strikes++;
    if (this.strikes >= 3) { this.strikeout(); return 'strikeout'; }
    return swinging ? 'swing-strike' : 'strike';
  }
  foul() {
    if (this.strikes < 2) this.strikes++;
    return 'foul';
  }

  walk() {
    this.batLine().bb++;
    this.pitcherLine().bb++;
    this.pitcherLine().bf++;
    // force advance
    const b = this.batter();
    if (this.bases[0]) {
      if (this.bases[1]) {
        if (this.bases[2]) this._score(this.bases[2]);
        this.bases[2] = this.bases[1];
      }
      this.bases[1] = this.bases[0];
    }
    this.bases[0] = b;
    this.lastPlay = { type: 'BB', batter: b };
    this.nextBatter();
  }

  strikeout() {
    this.batLine().ab++;
    this.batLine().so++;
    this.pitcherLine().k++;
    this.pitcherLine().bf++;
    this.recordOut(1);
    this.lastPlay = { type: 'K', batter: this.batter() };
    if (!this._halfDone()) this.nextBatter();
  }

  _score(runner, earned = true) {
    this.score[this.half]++;
    const idx = this.line[this.half];
    idx[this.inning - 1] = (idx[this.inning - 1] || 0) + 1;
    // find runner's batline to credit run
    const bl = this.box[this.half].bat.find((x) => x.name === runner.name);
    if (bl) bl.r++;
    this.pitcherLine().r++;
  }

  recordOut(n) {
    this.outs += n;
    for (let i = 0; i < n; i++) this.pitcherLine().outs++;
    if (this.outs >= 3) this._endHalf();
  }

  _halfDone() { return this.outs >= 3 || this.over; }

  // Apply a batted-ball / plate outcome. type in:
  // '1B','2B','3B','HR','OUT','DP','ERROR','FC','SAC'
  // opts: { rng, sent } — for extra-base advancement.
  applyOutcome(type, rng = Math.random) {
    const b = this.batter();
    const bl = this.batLine();
    const pl = this.pitcherLine();
    pl.bf++;
    let rbi = 0;

    if (type === 'HR') {
      bl.ab++; bl.h++; bl.hr++; pl.h++; pl.hr++;
      this.hits[this.half]++; this.hr[this.half]++;
      let runs = 1;
      for (let i = 0; i < 3; i++) { if (this.bases[i]) { this._score(this.bases[i]); this.bases[i] = null; runs++; } }
      this._score(b);
      rbi = runs;
      bl.rbi += rbi;
      this.lastPlay = { type: 'HR', batter: b, runs };
      this.nextBatter();
      return { type, runs };
    }

    if (type === 'ERROR') {
      // batter reaches, no AB charged as hit; runners advance one
      bl.ab++;
      this.errors[1 - this.half]++;
      this._advanceRunners(1, b, rng, true);
      this.lastPlay = { type: 'E', batter: b };
      this.nextBatter();
      return { type, runs: 0 };
    }

    if (type === '1B' || type === '2B' || type === '3B') {
      bl.ab++; bl.h++; pl.h++;
      this.hits[this.half]++;
      const bases = type === '1B' ? 1 : type === '2B' ? 2 : 3;
      if (type === '2B') bl.d++;
      if (type === '3B') bl.t++;
      rbi = this._advanceRunners(bases, b, rng, false);
      bl.rbi += rbi;
      this.lastPlay = { type, batter: b, rbi };
      this.nextBatter();
      return { type, runs: rbi };
    }

    if (type === 'DP') {
      bl.ab++;
      // batter out + lead runner out
      let outs = 1;
      if (this.bases[0] && this.outs < 2) {
        this.bases[0] = null; outs = 2;
      }
      this.recordOut(outs);
      this.lastPlay = { type: outs === 2 ? 'DP' : 'OUT', batter: b };
      if (!this._halfDone()) this.nextBatter();
      return { type, runs: 0, outs };
    }

    if (type === 'SAC') {
      // productive out: batter out, runners advance one
      bl.ab++;
      const scored = this._advanceRunners(1, null, rng, false);
      bl.rbi += scored;
      this.recordOut(1);
      this.lastPlay = { type: 'OUT', batter: b };
      if (!this._halfDone()) this.nextBatter();
      return { type, runs: scored };
    }

    // plain OUT / FC
    bl.ab++;
    this.recordOut(1);
    this.lastPlay = { type: 'OUT', batter: b };
    if (!this._halfDone()) this.nextBatter();
    return { type: 'OUT', runs: 0 };
  }

  // advance existing runners by `bases`, place batter (if any) at `bases`.
  // returns RBI count (runs that score). extraOK gives fast runners a bonus base.
  _advanceRunners(bases, batter, rng, isError) {
    let runs = 0;
    // process from 3rd down to 1st
    const spd = 0.5; // neutral
    const newBases = [null, null, null];
    for (let i = 2; i >= 0; i--) {
      const r = this.bases[i];
      if (!r) continue;
      let adv = bases;
      // on a single, runners sometimes take an extra base
      if (!isError && bases === 1 && rng() < 0.25 + (r.bat?.speed ?? 5) * 0.03) adv = 2;
      const dest = i + adv;
      if (dest >= 3) { this._score(r); runs++; }
      else newBases[dest] = r;
    }
    this.bases = newBases;
    if (batter) {
      const bd = Math.min(bases, 3);
      if (bd >= 3 && bases >= 4) { this._score(batter); runs++; }
      else this.bases[bd - 1] = batter;
    }
    // count RBI only for non-error scoring
    return isError ? 0 : runs;
  }

  _endHalf() {
    // count LOB
    for (const r of this.bases) if (r) this.lob[this.half]++;
    this.bases = [null, null, null];
    this.outs = 0;
    this.resetCount();
    // ensure line array has an entry for this inning
    if (this.line[this.half][this.inning - 1] === undefined) this.line[this.half][this.inning - 1] = 0;

    // check game-ending conditions
    if (this._checkOver()) { this.over = true; return; }

    if (this.half === 0) {
      this.half = 1;
    } else {
      this.half = 0;
      this.inning++;
    }
  }

  _checkOver() {
    const [a, h] = this.score;
    // mercy rule after 5 full innings
    if (this.inning >= 5 && this.half === 1 && Math.abs(a - h) >= this.mercy) return true;
    if (this.inning >= this.maxInnings) {
      if (this.half === 0 && h > a) return true; // home leads, skip bottom
      if (this.half === 1 && a !== h) return true; // end of game, not tied
    }
    // walk-off: home takes lead in bottom of 9th+ (handled live via scoring, but
    // double-check here)
    if (this.inning >= this.maxInnings && this.half === 1 && h > a) return true;
    return false;
  }

  // called after a run scores to check walk-off
  checkWalkoff() {
    if (this.inning >= this.maxInnings && this.half === 1 && this.score[1] > this.score[0]) {
      this.bases = [null, null, null];
      this.over = true;
      return true;
    }
    return false;
  }

  result() {
    const winner = this.score[1] > this.score[0] ? 1 : this.score[0] > this.score[1] ? 0 : -1;
    return {
      score: [this.score[0], this.score[1]],
      hits: this.hits.slice(),
      errors: this.errors.slice(),
      hr: this.hr.slice(),
      line: [this.line[0].slice(), this.line[1].slice()],
      winner,
      innings: this.inning,
      box: this.box,
    };
  }
}

// =====================================================================
//  STAT-DRIVEN AT-BAT RESOLUTION (headless / CPU)
// =====================================================================

// Resolve one full plate appearance using the stat model. Returns the outcome
// string. Mutates state via primitives. `diff` scales CPU quality (0..1).
export function resolveAtBat(state, rng, diff = 0.5) {
  const pit = state.effPitcher();
  const batter = state.batter();
  const bat = batter.bat;
  const defense = teamDefense(state.fieldingTeam());
  let guard = 0;
  while (guard++ < 30) {
    state.addPitch();
    // pitcher intent
    let wantStrike = 0.66;
    if (state.strikes === 2) wantStrike = 0.52;
    if (state.balls === 3) wantStrike = 0.86;
    const intent = rng() < wantStrike;
    const ctrl = pit.control / 10;
    const inZone = intent
      ? rng() < (0.60 + ctrl * 0.30)
      : rng() < (0.10 + (1 - ctrl) * 0.12);

    // batter swing decision
    const disc = bat.contact;
    let swingProb = inZone ? 0.70 : 0.28 - disc * 0.012;
    if (state.strikes === 2) swingProb += inZone ? 0.15 : 0.16; // protect
    swingProb = clamp(swingProb, 0.05, 0.95);
    const swing = rng() < swingProb;

    if (!swing) {
      const r = inZone ? state.strike(false) : state.ball();
      if (r === 'walk' || r === 'strikeout') return r;
      continue;
    }

    // contact vs whiff
    let contactChance = 0.54 + bat.contact * 0.030 - pit.velo * 0.020 - pit.curve * 0.015
      + (inZone ? 0.13 : -0.15);
    contactChance = clamp(contactChance, 0.22, 0.93);
    if (rng() > contactChance) {
      const r = state.strike(true);
      if (r === 'strikeout') return r;
      continue;
    }

    // contact made — foul or in play
    const foulChance = inZone ? 0.33 : 0.44;
    if (rng() < foulChance) {
      state.foul();
      continue;
    }

    // ball in play — resolve
    return resolveInPlay(state, batter, pit, defense, rng);
  }
  // safety fallback
  return state.applyOutcome('OUT', rng).type;
}

function resolveInPlay(state, batter, pit, defense, rng) {
  const bat = batter.bat;
  const pf = bat.power / 10;
  // home run
  const hrChance = 0.013 + pf * 0.050 - (pit.velo - 5) * 0.002;
  if (rng() < clamp(hrChance, 0.004, 0.14)) return state.applyOutcome('HR', rng).type;

  // hit vs out (BABIP-like)
  const babip = clamp(0.255 + bat.contact * 0.007 + bat.speed * 0.004 - (defense - 5) * 0.013, 0.15, 0.40);
  if (rng() < babip) {
    // hit type
    const r = rng();
    let type = '1B';
    if (r < 0.028 + bat.speed * 0.006) type = '3B';
    else if (r < 0.22 + pf * 0.08) type = '2B';
    return state.applyOutcome(type, rng).type;
  }

  // out — maybe error, maybe double play
  const errChance = clamp(0.018 + (5 - defense) * 0.006, 0.006, 0.09);
  if (rng() < errChance) return state.applyOutcome('ERROR', rng).type;
  if (state.bases[0] && state.outs < 2 && rng() < 0.14) return state.applyOutcome('DP', rng).type;
  if (state.bases[2] && state.outs < 2 && rng() < 0.14) return state.applyOutcome('SAC', rng).type;
  return state.applyOutcome('OUT', rng).type;
}

// =====================================================================
//  FULL GAME SIMULATION
// =====================================================================

export function simGame(away, home, seed, opts = {}) {
  const rng = typeof seed === 'function' ? seed : makeRNG(seed);
  const state = new GameState(away, home, opts);
  const diff = opts.diff ?? 0.5;
  let guard = 0;
  while (!state.over && guard++ < 400) {
    resolveAtBat(state, rng, diff);
    // relief: pull tired starter headlessly
    const side = 1 - state.half;
    const p = state.currentPitcher();
    if (state.fatigue[side] > p.pit.stamina * 15 && state.pitcherIdx[side] < away.rotation.length - 1) {
      // pick next fresh arm in rotation
      state.changePitcher(state.pitcherIdx[side] + 1);
    }
    if (state.over) break;
  }
  // decisions (W/L) — simple: pitcher of record
  const res = state.result();
  return res;
}

// Convenience: soak-test aggregate
export function soak(teamA, teamB, n, seed0 = 12345) {
  let runs = 0, hr = 0, aWins = 0, hits = 0, err = 0, maxR = 0, minR = 999, innSum = 0;
  for (let i = 0; i < n; i++) {
    const r = simGame(teamA, teamB, seed0 + i * 2654435761);
    const tot = r.score[0] + r.score[1];
    runs += tot; hr += r.hr[0] + r.hr[1]; hits += r.hits[0] + r.hits[1];
    err += r.errors[0] + r.errors[1]; innSum += r.innings;
    maxR = Math.max(maxR, tot); minR = Math.min(minR, tot);
    if (r.winner === 0) aWins++;
  }
  return {
    games: n, avgRuns: runs / n, avgHR: hr / n, avgHits: hits / n,
    avgErr: err / n, aWinPct: aWins / n, maxRuns: maxR, minRuns: minR,
    avgInnings: innSum / n,
  };
}
