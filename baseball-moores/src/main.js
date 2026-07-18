// Baseball Moores — states, screens, and the interactive game engine.
import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, makeTeamSprites, drawFieldPlayer, drawLogo, SPR } from './sprites.js';
import {
  GameState, makeRNG, pitchPhysics, contactModel, teamDefense, PITCH_TYPES,
} from './sim.js';
import * as L from './league.js';

const W = 256, H = 224;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const PAL = {
  sky: '#5aa0e0', grass: '#3aa63a', grassD: '#2e8a2e', dirt: '#c88a4a', dirtD: '#a86a30',
  line: '#f4f4f0', wall: '#204020', night: '#0a1020', ink: '#101018',
  hud: '#101820', hudT: '#f8f8e0', gold: '#f8d838', red: '#e04030',
};

// ---- text helpers ----
function txt(s, x, y, size = 8, color = '#fff', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}
function txtO(s, x, y, size, color, align = 'left', outline = '#000') {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = outline;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(s, x + dx, y + dy);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

// ================= sprite cache per team =================
const spriteCache = new Map();
function teamSpr(team) {
  if (!spriteCache.has(team.short + JSON.stringify(team.colors))) {
    spriteCache.set(team.short + JSON.stringify(team.colors), makeTeamSprites(team.colors));
  }
  return spriteCache.get(team.short + JSON.stringify(team.colors));
}

// ================= field geometry (overhead) =================
const HOME = { x: 128, y: 196 };
const BASES_XY = [{ x: 176, y: 160 }, { x: 128, y: 128 }, { x: 80, y: 160 }]; // 1B,2B,3B
const FIELDERS = {
  P: { x: 128, y: 160 }, C: { x: 128, y: 204 }, '1B': { x: 170, y: 150 },
  '2B': { x: 146, y: 122 }, SS: { x: 108, y: 124 }, '3B': { x: 84, y: 150 },
  LF: { x: 72, y: 78 }, CF: { x: 128, y: 56 }, RF: { x: 184, y: 78 },
};
function sprayToField(spray, dist) {
  const rad = (spray * Math.PI) / 180;
  const reach = dist * 150;
  return {
    x: Math.max(14, Math.min(242, HOME.x + Math.sin(rad) * reach * 0.72)),
    y: Math.max(30, HOME.y - Math.cos(rad) * reach),
  };
}

// ================= interactive match =================
class Match {
  // control: [c0,c1] where 0=CPU,1=player1,2=player2. away=teams[0], home=teams[1]
  constructor(away, home, control, sound, opts = {}) {
    this.gs = new GameState(away, home, opts);
    this.control = control;
    this.sound = sound;
    this.rng = makeRNG((opts.seed ?? Date.now()) >>> 0);
    this.diff = opts.diff ?? 0.5;
    this.phase = 'pitch';
    this.t = 0;
    this.msg = null; this.msgT = 0;
    this.onDone = opts.onDone || null;
    this.exhibition = !!opts.exhibition;
    this.setupPitch();
    this.crowd = 0.2;
    this.fx = []; // fireworks
    this.paused = false; this.pauseIdx = 0;
    this.lastInning = 1; this.lastHalf = 0;
    this.batterAnim = 0; this.swingAnimT = -1;
    this.batBoxX = 0; // batter left/right position -1..1
  }

  batHuman() { return this.control[this.gs.half]; }
  pitHuman() { return this.control[1 - this.gs.half]; }

  setupPitch() {
    this.phase = 'pitch';
    this.t = 0;
    this.pitchReady = false;
    this.windT = 0;
    this.aimX = 0; this.aimY = 0;
    this.pType = 'fast';
    this.pitch = null;
    this.swung = false; this.swingT = -1; this.bunt = false;
    this.batBoxX = 0;
    this.contactRes = null;
    this.play = null;
    this.ballPos = null;
    // CPU pitcher pre-plan
    if (this.pitHuman() === 0) this.planCpuPitch();
    // CPU batter plan set at release
  }

  planCpuPitch() {
    const p = this.gs.effPitcher();
    const gs = this.gs;
    let wantStrike = 0.66;
    if (gs.strikes === 2) wantStrike = 0.5;
    if (gs.balls === 3) wantStrike = 0.85;
    const inZone = this.rng() < wantStrike;
    if (inZone) { this.aimX = (this.rng() - 0.5) * 1.4; this.aimY = (this.rng() - 0.5) * 1.4; }
    else {
      this.aimX = (this.rng() < 0.5 ? -1 : 1) * (1.05 + this.rng() * 0.35);
      this.aimY = (this.rng() - 0.5) * 2.2;
    }
    // pitch type weighted by curve stat
    const r = this.rng();
    const cv = p.curve / 10;
    if (r < 0.4 - cv * 0.15) this.pType = 'fast';
    else if (r < 0.6) this.pType = 'change';
    else this.pType = this.rng() < 0.5 ? 'curveL' : 'curveR';
    this.cpuThrowDelay = 24 + (this.rng() * 20 | 0);
  }

  release() {
    const p = this.gs.effPitcher();
    this.pitch = pitchPhysics({ velo: p.velo, curve: p.curve }, this.pType, 0);
    this.pitch.aimX = Math.max(-1.4, Math.min(1.4, this.aimX));
    this.pitch.aimY = Math.max(-1.4, Math.min(1.4, this.aimY));
    this.phase = 'flight';
    this.t = 0;
    this.gs.addPitch();
    this.sound.pitchWhoosh();
    // CPU batter plan
    if (this.batHuman() === 0) this.planCpuSwing();
  }

  planCpuSwing() {
    const b = this.gs.batter().bat;
    const inZone = Math.abs(this.pitch.aimX) < 0.95 && Math.abs(this.pitch.aimY) < 0.95;
    let swingProb = inZone ? 0.72 : 0.26 - b.contact * 0.012;
    if (this.gs.strikes === 2) swingProb += inZone ? 0.16 : 0.14;
    this.cpuWillSwing = this.rng() < Math.max(0.04, Math.min(0.95, swingProb));
    // timing error decreases with contact + difficulty
    const sd = 6.5 - b.contact * 0.35 - this.diff * 2;
    const err = (this.rng() + this.rng() + this.rng() - 1.5) * Math.max(1.4, sd);
    this.cpuSwingT = Math.round(this.pitch.frames + err);
    this.cpuBunt = false;
  }

  // ---------- update ----------
  step(input) {
    if (this.gs.over) return;
    if (this.paused) { this.updatePause(input); return; }
    const p1 = input.pad(1), p2 = input.pad(2);
    if (p1.pressed('start')) { this.paused = true; this.pauseIdx = 0; this.sound.menuSel(); return; }

    if (this.phase === 'pitch') this.stepPitch(input);
    else if (this.phase === 'flight') this.stepFlight(input);
    else if (this.phase === 'inplay') this.stepInplay(input);
    else if (this.phase === 'call') this.stepCall();
    else if (this.phase === 'hr') this.stepHR();
    else if (this.phase === 'inningbreak') this.stepBreak(input);

    // crowd bed
    this.crowd = Math.max(0.15, this.crowd - 0.004);
    this.sound.setCrowd(this.crowd);
    if (this.msgT > 0) this.msgT--;
  }

  humanPad(input, who) { return who === 2 ? input.pad(2) : input.pad(1); }

  stepPitch(input) {
    const who = this.pitHuman();
    if (who === 0) {
      this.windT++;
      if (this.windT >= this.cpuThrowDelay) this.release();
      return;
    }
    const pad = this.humanPad(input, who);
    // aim
    const sp = 0.045;
    if (pad.down('left')) this.aimX = Math.max(-1.35, this.aimX - sp);
    if (pad.down('right')) this.aimX = Math.min(1.35, this.aimX + sp);
    if (pad.down('up')) this.aimY = Math.max(-1.35, this.aimY - sp);
    if (pad.down('down')) this.aimY = Math.min(1.35, this.aimY + sp);
    // cycle pitch type
    if (pad.pressed('a')) {
      const i = PITCH_TYPES.indexOf(this.pType);
      this.pType = PITCH_TYPES[(i + 1) % PITCH_TYPES.length];
      this.sound.menuMove();
    }
    if (pad.pressed('b')) this.release();
  }

  stepFlight(input) {
    this.t++;
    const pitch = this.pitch;
    // steal note: (kept simple) — batter swing detection
    const batWho = this.batHuman();
    // batter movement in box + swing
    if (batWho === 0) {
      if (this.cpuWillSwing && !this.swung && this.t >= this.cpuSwingT) this.doSwing(this.cpuBunt);
    } else {
      const pad = this.humanPad(input, batWho);
      if (pad.down('left')) this.batBoxX = Math.max(-1, this.batBoxX - 0.06);
      if (pad.down('right')) this.batBoxX = Math.min(1, this.batBoxX + 0.06);
      const wantBunt = pad.down('down');
      if (pad.pressed('b') && !this.swung) this.doSwing(wantBunt);
    }
    // ball reaches plate without swing -> called pitch
    if (!this.swung && this.t >= pitch.frames + 4) {
      this.calledPitch();
    }
  }

  doSwing(bunt) {
    this.swung = true; this.swingT = this.t; this.bunt = bunt;
    this.swingAnimT = 8;
    const pitch = this.pitch;
    const timingError = this.t - pitch.frames; // 0 = perfect
    const batter = this.gs.batter().bat;
    // location mismatch: pitch height + horizontal reach vs batter box
    const mism = Math.abs(pitch.aimY) * 0.7 + Math.abs(this.batBoxX - pitch.aimX) * 0.55;
    if (bunt) {
      this.sound.bunt();
      // bunt: easy contact if timed, weak grounder
      const ok = Math.abs(timingError) < 8 && mism < 1.1 && this.rng() < 0.8;
      if (!ok) { this.resolveWhiff(); return; }
      this.contactRes = { whiff: false, foul: this.rng() < 0.3, exit: 2.2, launch: 4, spray: (this.rng() - 0.5) * 30, timingQ: 0.4, bunt: true };
      this.afterContact();
      return;
    }
    const res = contactModel(batter, pitch, timingError, mism, this.rng);
    this.contactRes = res;
    if (res.whiff) { this.resolveWhiff(); return; }
    this.sound.crack(res.timingQ);
    this.afterContact();
  }

  resolveWhiff() {
    this.sound.swingWhiff();
    const r = this.gs.strike(true);
    this.finishPA(r, 'swing');
  }

  calledPitch() {
    const pitch = this.pitch;
    const inZone = Math.abs(pitch.aimX) < 1.0 && Math.abs(pitch.aimY) < 1.0;
    let r;
    if (inZone) { r = this.gs.strike(false); this.sound.strikeCall(); this.flash('STEE-RIKE!', PAL.gold); }
    else { r = this.gs.ball(); this.sound.ballCall(); this.flash('BALL', '#a8d0f8'); }
    this.finishPA(r, 'called');
  }

  afterContact() {
    const res = this.contactRes;
    if (res.foul) {
      this.gs.foul();
      this.sound.foulTick();
      this.flash('FOUL', '#f0f0a0');
      this.setupNextPitchSoon();
      return;
    }
    // ball in play -> field view
    this.startPlay(res);
  }

  finishPA(result, kind) {
    // result: 'ball','strike','swing-strike','foul','walk','strikeout'
    if (result === 'walk') { this.sound.safeCall(); this.flash('WALK', '#a8f0a8'); this.crowd = 0.4; this.endPlayResolve(); return; }
    if (result === 'strikeout') { this.sound.outCall(); this.flash('STRIKE OUT!', PAL.red); this.endPlayResolve(); return; }
    // continue at-bat
    if (kind === 'swing') this.flash('STRIKE', PAL.gold);
    this.setupNextPitchSoon();
  }

  setupNextPitchSoon() {
    this.phase = 'call'; this.callT = 26; this.callNext = 'pitch';
  }

  // ---------- ball in play ----------
  startPlay(res) {
    this.phase = 'inplay';
    this.t = 0;
    const exit = res.exit, launch = res.launch, spray = res.spray;
    const dist = Math.max(0.08, Math.min(1.35, (exit - 2) / 4 * (0.55 + res.timingQ * 0.7)));
    const isFly = launch > 17;
    const hr = isFly && launch < 47 && dist > 1.1;
    const hang = isFly ? Math.round(20 + launch * 0.6 + dist * 16) : Math.round(9 + dist * 11);
    const land = sprayToField(spray, dist);
    // pick nearest fielder
    const posList = Object.keys(FIELDERS);
    let best = 'CF', bd = 1e9;
    for (const k of posList) {
      if (k === 'C') continue;
      const f = FIELDERS[k]; const d = Math.hypot(f.x - land.x, f.y - land.y);
      if (d < bd) { bd = d; best = k; }
    }
    this.play = {
      exit, launch, spray, dist, isFly, hr, hang, land,
      activePos: best,
      fx: FIELDERS[best].x, fy: FIELDERS[best].y,
      fielders: {}, resolved: false, ballOut: false,
    };
    for (const k of posList) this.play.fielders[k] = { x: FIELDERS[k].x, y: FIELDERS[k].y };
    this.crowd = Math.min(1, this.crowd + 0.35 + dist * 0.3);
    this.flash(hr ? '' : (isFly ? 'IN THE AIR!' : 'GROUNDER!'), '#fff');
    this.msgT = 0;
  }

  stepInplay(input) {
    const play = this.play;
    this.t++;
    const prog = Math.min(1, this.t / play.hang);
    // ball ground position
    const bx = HOME.x + (play.land.x - HOME.x) * prog;
    const by = HOME.y + (play.land.y - HOME.y) * prog;
    let z = 0;
    if (play.isFly) z = Math.sin(prog * Math.PI) * (play.launch * 0.9 + play.dist * 22);
    else z = Math.sin(prog * Math.PI) * 3;
    this.ballPos = { x: bx, y: by, z };
    // move active fielder toward landing (AI) + human control on defense
    const defWho = this.pitHuman(); // fielding side controls
    const af = play.fielders[play.activePos];
    let dx = play.land.x - af.x, dy = play.land.y - af.y;
    const d = Math.hypot(dx, dy) || 1;
    let spd = 2.5;
    if (defWho !== 0) {
      const pad = this.humanPad(input, defWho);
      let hx = 0, hy = 0;
      if (pad.down('left')) hx -= 1; if (pad.down('right')) hx += 1;
      if (pad.down('up')) hy -= 1; if (pad.down('down')) hy += 1;
      if (hx || hy) { const hn = Math.hypot(hx, hy); af.x += (hx / hn) * spd; af.y += (hy / hn) * spd; }
      else { af.x += (dx / d) * spd * 0.85; af.y += (dy / d) * spd * 0.85; }
    } else {
      af.x += (dx / d) * spd; af.y += (dy / d) * spd;
    }
    play.fdir = { x: dx, y: dy };
    if (prog >= 1 && !play.resolved) this.resolvePlay();
  }

  resolvePlay() {
    const play = this.play; play.resolved = true;
    const gs = this.gs;
    const defense = teamDefense(gs.fieldingTeam());
    const batter = gs.batter();
    const errChance = Math.max(0.01, 0.06 + (5 - defense) * 0.01);
    let outcome;
    if (play.hr) { this.doHR(); return; }
    const af = play.fielders[play.activePos];
    const fdist = Math.hypot(af.x - play.land.x, af.y - play.land.y);
    const bobble = this.rng() < errChance;
    if (play.isFly) {
      const catchR = 12 + defense * 0.9;
      const caught = fdist < catchR && !bobble && play.dist < 1.1;
      if (caught) {
        this.sound.glovePop();
        if (gs.bases[2] && gs.outs < 2 && play.dist > 0.62 && this.rng() < 0.7) {
          outcome = 'SAC'; this.flash('SAC FLY!', '#a8f0a8');
        } else { outcome = 'OUT'; this.flash(play.dist > 0.7 ? 'CAUGHT!' : 'FLY OUT!', '#fff'); this.sound.outCall(); }
      } else {
        outcome = play.dist < 0.5 ? '1B' : play.dist < 0.85 ? '2B' : '3B';
        this.hitFlash(outcome, bobble);
      }
    } else {
      const fielded = fdist < 13 + defense * 0.8;
      if (fielded && !bobble) {
        const rspeed = batter.bat.speed;
        const outAtFirst = play.dist < 0.92 && this.rng() < Math.max(0.32, Math.min(0.95, 0.8 - rspeed * 0.025 + defense * 0.012));
        if (outAtFirst) {
          if (gs.bases[0] && gs.outs < 2 && this.rng() < 0.3) { outcome = 'DP'; this.flash('DOUBLE PLAY!', PAL.gold); }
          else { outcome = 'OUT'; this.flash('OUT AT FIRST', '#fff'); }
          this.sound.outCall();
        } else { outcome = '1B'; this.hitFlash('1B', false); }
      } else {
        outcome = bobble ? 'ERROR' : (play.dist > 0.8 ? '2B' : '1B');
        this.hitFlash(outcome, bobble);
      }
    }
    const before = gs.score[gs.half];
    gs.applyOutcome(outcome, this.rng);
    if (gs.score[gs.half] > before) this.crowd = 1;
    if (gs.checkWalkoff()) { this.endGame(); return; }
    this.endPlayResolve();
  }

  hitFlash(type, err) {
    const map = { '1B': 'BASE HIT!', '2B': 'DOUBLE!', '3B': 'TRIPLE!', ERROR: 'ERROR!' };
    this.flash(map[type] || 'HIT!', type === 'ERROR' ? PAL.red : '#f8f0a0');
    this.sound.safeCall(); this.crowd = Math.min(1, this.crowd + 0.3);
  }

  doHR() {
    const gs = this.gs;
    gs.applyOutcome('HR', this.rng);
    this.phase = 'hr'; this.hrT = 0;
    this.sound.hrFanfare();
    this.crowd = 1;
    this.flash('HOME RUN!', PAL.gold);
    this.fx = [];
    for (let i = 0; i < 24; i++) this.fx.push({ x: 40 + Math.random() * 176, y: 20 + Math.random() * 80, t: Math.random() * 30, hue: Math.random() });
    gs.checkWalkoff();
  }

  stepHR() {
    this.hrT++;
    if (this.hrT % 10 === 0 && this.hrT < 70) this.sound.firework();
    for (const f of this.fx) f.t++;
    if (this.hrT > 130) {
      if (this.gs.over) { this.endGame(); return; }
      this.endPlayResolve();
    }
  }

  endPlayResolve() {
    // detect inning/half change to show line score
    const gs = this.gs;
    if (gs.over) { this.endGame(); return; }
    if (gs.inning !== this.lastInning || gs.half !== this.lastHalf) {
      // half changed
      this.lastInning = gs.inning; this.lastHalf = gs.half;
      this.reliefCheck();
      this.phase = 'inningbreak'; this.breakT = 0; this.sound.jingle();
      return;
    }
    this.phase = 'call'; this.callT = 22; this.callNext = 'pitch';
  }

  reliefCheck() {
    // auto-pull tired CPU pitcher between innings
    const gs = this.gs;
    for (const side of [0, 1]) {
      if (this.control[side] !== 0) continue; // only auto for CPU
      const p = gs.teams[side].rotation[gs.pitcherIdx[side]];
      if (gs.fatigue[side] > p.pit.stamina * 15 && gs.pitcherIdx[side] < gs.teams[side].rotation.length - 1) {
        // change on the side that just finished pitching (fielding side becomes batting)
        const wasFielding = side;
        if (wasFielding === 1 - gs.half) { /* now batting, skip */ }
      }
    }
    // simpler: pull whoever is about to pitch if exhausted
    const pside = 1 - gs.half;
    if (this.control[pside] === 0) {
      const rot = gs.teams[pside].rotation;
      if (gs.fatigue[pside] > rot[gs.pitcherIdx[pside]].pit.stamina * 15 && gs.pitcherIdx[pside] < rot.length - 1) {
        gs.changePitcher(gs.pitcherIdx[pside] + 1);
      }
    }
  }

  stepBreak(input) {
    this.breakT++;
    const p1 = input.pad(1), p2 = input.pad(2);
    if (this.breakT > 60 && (p1.pressed('b') || p2.pressed('b') || this.breakT > 150)) {
      this.setupPitch();
    }
  }

  stepCall() {
    this.callT--;
    if (this.callT <= 0) {
      if (this.gs.over) { this.endGame(); return; }
      this.setupPitch();
    }
  }

  endGame() {
    this.gs.over = true;
    if (this.onDone) this.onDone(this.gs.result());
  }

  flash(msg, color) { if (msg) { this.msg = msg; this.msgColor = color; this.msgT = 55; } }

  // ---------- pause ----------
  updatePause(input) {
    const pad = input.pad(1);
    const opts = this.pauseOpts();
    if (pad.pressed('up')) { this.pauseIdx = (this.pauseIdx + opts.length - 1) % opts.length; this.sound.menuMove(); }
    if (pad.pressed('down')) { this.pauseIdx = (this.pauseIdx + 1) % opts.length; this.sound.menuMove(); }
    if (pad.pressed('start')) { this.paused = false; return; }
    if (pad.pressed('b')) {
      const o = opts[this.pauseIdx];
      this.sound.menuSel();
      if (o.k === 'resume') this.paused = false;
      else if (o.k === 'relief') { this.doRelief(); }
      else if (o.k === 'quit') { this.paused = false; this.gs.over = true; if (this.onDone) this.onDone(this.gs.result(), true); }
    }
  }
  pauseOpts() {
    const opts = [{ k: 'resume', label: 'RESUME' }];
    const pside = 1 - this.gs.half;
    if (this.control[pside] && this.control[pside] !== 0) opts.push({ k: 'relief', label: 'CHANGE PITCHER' });
    opts.push({ k: 'quit', label: 'FORFEIT / QUIT' });
    return opts;
  }
  doRelief() {
    const gs = this.gs; const pside = 1 - gs.half;
    const next = (gs.pitcherIdx[pside] + 1) % gs.teams[pside].rotation.length;
    if (gs.changePitcher(next)) { this.flash('NEW PITCHER', '#a8d0f8'); this.paused = false; }
    else this.sound.denied();
  }

  // ================= draw =================
  draw() {
    if (this.phase === 'pitch' || this.phase === 'flight' || (this.phase === 'call' && this.callNext === 'pitch')) this.drawDuel();
    else this.drawField();
    this.drawHUD();
    if (this.phase === 'inningbreak') this.drawBreak();
    if (this.msgT > 0) this.drawMsg();
    if (this.paused) this.drawPause();
  }

  drawDuel() {
    // catcher's view: dirt + zone box, pitcher top, batter side
    ctx.fillStyle = PAL.grass; ctx.fillRect(0, 0, W, 120);
    ctx.fillStyle = PAL.grassD; for (let i = 0; i < W; i += 16) { ctx.fillRect(i, 0, 8, 120); }
    ctx.fillStyle = '#2e8a2e'; ctx.fillRect(0, 0, W, 120);
    // dirt mound area
    ctx.fillStyle = PAL.dirt; ctx.beginPath(); ctx.ellipse(128, 92, 40, 16, 0, 0, 7); ctx.fill();
    // batter's box dirt
    ctx.fillStyle = PAL.dirt; ctx.fillRect(70, 150, 116, 62);
    ctx.fillStyle = PAL.dirtD; ctx.fillRect(70, 150, 116, 3);
    // home plate
    ctx.fillStyle = PAL.line; ctx.fillRect(120, 196, 16, 8);
    // batter's boxes lines
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(84, 176, 24, 30); ctx.strokeRect(148, 176, 24, 30);

    const gs = this.gs;
    const pitchSpr = teamSpr(gs.fieldingTeam());
    const batSpr = teamSpr(gs.battingTeam());
    // pitcher (small, on mound)
    const pw = (this.phase === 'flight' && this.t < 6) ? pitchSpr.pitchThrow : pitchSpr.pitchWind;
    ctx.drawImage(pw, 120, 74);

    // strike zone box
    const zx = 128, zy = 150, zw = 22, zh = 26;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(zx - zw, zy - zh, zw * 2, zh * 2);
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.moveTo(zx - zw / 3, zy - zh); ctx.lineTo(zx - zw / 3, zy + zh);
    ctx.moveTo(zx + zw / 3, zy - zh); ctx.lineTo(zx + zw / 3, zy + zh);
    ctx.moveTo(zx - zw, zy - zh / 3); ctx.lineTo(zx + zw, zy - zh / 3);
    ctx.moveTo(zx - zw, zy + zh / 3); ctx.lineTo(zx + zw, zy + zh / 3); ctx.stroke();

    // aim reticle when pitching (human)
    if (this.phase === 'pitch') {
      const ax = zx + this.aimX * zw, ay = zy + this.aimY * zh;
      if (this.pitHuman() !== 0) {
        ctx.strokeStyle = PAL.gold; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(ax, ay, 5, 0, 7); ctx.stroke();
        ctx.fillStyle = PAL.gold; ctx.fillRect(ax - 1, ay - 1, 2, 2);
        txtO(this.pType.toUpperCase(), 128, 40, 9, PAL.gold, 'center');
        txtO('DPAD aim  A type  B pitch', 128, 216, 7, '#e0e0e0', 'center');
      }
    }

    // batter — right-handed box (left side of plate visually)
    const rhb = true;
    const bx = (rhb ? 96 : 160) + this.batBoxX * 8;
    const by = 168;
    let bs = batSpr.batStance;
    if (this.bunt && this.swung) bs = batSpr.batBunt;
    else if (this.swingAnimT > 0) { bs = batSpr.batSwing; this.swingAnimT--; }
    if (rhb) ctx.drawImage(bs, bx - 7, by - 8);
    else { ctx.save(); ctx.translate(bx + 7, by - 8); ctx.scale(-1, 1); ctx.drawImage(bs, 0, 0); ctx.restore(); }

    // catcher
    ctx.drawImage(pitchSpr.catch, 121, 200);

    // ball in flight
    if (this.phase === 'flight' && this.pitch) {
      const prog = Math.min(1.05, this.t / this.pitch.frames);
      const startX = 128, startY = 84;
      const endX = zx + this.pitch.aimX * zw, endY = zy + this.pitch.aimY * zh;
      const bow = (this.pitch.curve || 0) * Math.sin(prog * Math.PI) * 6;
      const bxp = startX + (endX - startX) * prog + bow;
      const byp = startY + (endY - startY) * prog + (this.pitch.drop || 0) * prog * prog * 8;
      const size = 3 + prog * 4;
      ctx.fillStyle = '#f8f8f0';
      ctx.beginPath(); ctx.arc(bxp, byp, size / 1.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#d84028'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  drawField() {
    // overhead diamond
    ctx.fillStyle = PAL.grass; ctx.fillRect(0, 0, W, H);
    // mow stripes
    ctx.fillStyle = PAL.grassD;
    for (let i = 0; i < 14; i++) if (i % 2) ctx.fillRect(0, i * 16, W, 8);
    // outfield wall arc
    ctx.strokeStyle = PAL.wall; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(HOME.x, HOME.y, 150, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke();
    // infield dirt diamond
    ctx.fillStyle = PAL.dirt;
    ctx.beginPath();
    ctx.moveTo(HOME.x, HOME.y);
    ctx.lineTo(BASES_XY[0].x + 6, BASES_XY[0].y);
    ctx.lineTo(BASES_XY[1].x, BASES_XY[1].y - 6);
    ctx.lineTo(BASES_XY[2].x - 6, BASES_XY[2].y);
    ctx.closePath(); ctx.fill();
    // foul lines
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(HOME.x, HOME.y); ctx.lineTo(226, 60); ctx.moveTo(HOME.x, HOME.y); ctx.lineTo(30, 60); ctx.stroke();
    // bases
    for (const b of BASES_XY) { ctx.fillStyle = PAL.line; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
    ctx.fillStyle = PAL.line; ctx.fillRect(HOME.x - 4, HOME.y - 3, 8, 6);

    const gs = this.gs;
    const defSpr = teamSpr(gs.fieldingTeam());
    const offSpr = teamSpr(gs.battingTeam());
    // fielders
    if (this.play) {
      for (const k of Object.keys(this.play.fielders)) {
        const f = this.play.fielders[k];
        const active = k === this.play.activePos;
        const fd = this.play.fdir || { x: 0, y: -1 };
        drawFieldPlayer(ctx, defSpr, f.x, f.y, active ? fd.x : 0, active ? fd.y : 1, active, this.t / 5, active && this.t % 20 < 3 ? 'catch' : '');
        if (active) { ctx.strokeStyle = PAL.gold; ctx.lineWidth = 1; ctx.strokeRect(f.x - 8, f.y - 15, 16, 17); }
      }
      // landing marker for flies
      if (this.play.isFly && !this.play.resolved) {
        const m = this.play.land;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(m.x, m.y, 6 + Math.sin(this.t * 0.3) * 2, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m.x - 8, m.y); ctx.lineTo(m.x + 8, m.y); ctx.moveTo(m.x, m.y - 8); ctx.lineTo(m.x, m.y + 8); ctx.stroke();
      }
    } else {
      for (const k of Object.keys(FIELDERS)) { const f = FIELDERS[k]; drawFieldPlayer(ctx, defSpr, f.x, f.y, 0, 1, false, 0, ''); }
    }
    // runners on base
    for (let i = 0; i < 3; i++) if (gs.bases[i]) { const b = BASES_XY[i]; drawFieldPlayer(ctx, offSpr, b.x, b.y - 2, 0, 1, false, 0, ''); }
    // batter-runner heading to first (cosmetic during inplay)
    if (this.play && !this.play.resolved) {
      const prog = Math.min(1, this.t / (this.play.hang + 4));
      const rx = HOME.x + (BASES_XY[0].x - HOME.x) * prog, ry = HOME.y + (BASES_XY[0].y - HOME.y) * prog;
      drawFieldPlayer(ctx, offSpr, rx, ry, 1, -0.3, true, this.t / 4, '');
    }
    // ball + shadow
    if (this.ballPos) {
      const b = this.ballPos;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 3, 1.5, 0, 0, 7); ctx.fill();
      ctx.drawImage(SPR.ball, Math.round(b.x - 2), Math.round(b.y - b.z - 2));
    }
    // HR fireworks
    if (this.phase === 'hr') {
      for (const f of this.fx) {
        if (f.t < 0) continue;
        const r = Math.min(14, f.t * 0.6);
        ctx.strokeStyle = `hsl(${(f.hue * 360) | 0},90%,65%)`; ctx.lineWidth = 1;
        for (let a = 0; a < 8; a++) { const ang = (a / 8) * 7; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r); ctx.stroke(); }
      }
      txtO('HOME RUN!', 128, 30, 16, PAL.gold, 'center');
    }
  }

  drawHUD() {
    const gs = this.gs;
    ctx.fillStyle = PAL.hud; ctx.fillRect(0, 0, W, 16);
    const a = gs.teams[0], h = gs.teams[1];
    txt(a.short, 4, 12, 9, a.colors.main);
    txt(String(gs.score[0]), 40, 12, 9, PAL.hudT);
    txt(h.short, 60, 12, 9, h.colors.main);
    txt(String(gs.score[1]), 96, 12, 9, PAL.hudT);
    // inning
    const arrow = gs.half === 0 ? '▲' : '▼';
    txt(arrow + gs.inning, 120, 12, 9, PAL.gold, 'center');
    // count / outs
    txt(`B${gs.balls} S${gs.strikes}`, 150, 12, 9, PAL.hudT);
    // outs dots
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < gs.outs ? PAL.red : '#405060'; ctx.fillRect(196 + i * 7, 5, 5, 5); }
    txt('OUT', 216, 12, 7, '#90a0b0');
    // bases diamond mini
    const bx = 240, by = 8;
    const drawBase = (dx, dy, on) => { ctx.save(); ctx.translate(bx + dx, by + dy); ctx.rotate(Math.PI / 4); ctx.fillStyle = on ? PAL.gold : '#405060'; ctx.fillRect(-2.5, -2.5, 5, 5); ctx.restore(); };
    drawBase(4, 0, gs.bases[0]); drawBase(0, -4, gs.bases[1]); drawBase(-4, 0, gs.bases[2]);
    // batter name strip
    if (this.phase === 'pitch' || this.phase === 'flight') {
      const b = gs.batter();
      ctx.fillStyle = 'rgba(16,24,32,0.7)'; ctx.fillRect(0, 16, 96, 10);
      txt(`AB ${b.name}`, 3, 24, 7, '#f0f0e0');
    }
  }

  drawMsg() {
    const alpha = Math.min(1, this.msgT / 20);
    ctx.globalAlpha = alpha;
    txtO(this.msg, 128, 70, 16, this.msgColor || '#fff', 'center');
    ctx.globalAlpha = 1;
  }

  drawBreak() {
    ctx.fillStyle = 'rgba(8,12,24,0.86)'; ctx.fillRect(20, 40, 216, 150);
    ctx.strokeStyle = PAL.gold; ctx.strokeRect(20, 40, 216, 150);
    const gs = this.gs;
    txtO(`END ${gs.half === 0 ? 'TOP' : 'MID'} ${gs.inning}`, 128, 58, 10, PAL.gold, 'center');
    // line score
    const inns = Math.max(gs.line[0].length, gs.line[1].length, gs.inning);
    let x0 = 34;
    txt('', x0, 78);
    const cols = Math.min(inns, 9);
    txt('TEAM', 26, 90, 8, '#c0c0d0');
    for (let i = 0; i < cols; i++) txt(String(i + 1), 74 + i * 16, 90, 7, '#c0c0d0', 'center');
    txt('R H E', 200, 90, 8, PAL.gold);
    const row = (ti, y) => {
      const t = gs.teams[ti];
      txt(t.short, 26, y, 8, t.colors.main);
      for (let i = 0; i < cols; i++) txt(gs.line[ti][i] !== undefined ? String(gs.line[ti][i]) : '-', 74 + i * 16, y, 7, '#f0f0e0', 'center');
      txt(`${gs.score[ti]} ${gs.hits[ti]} ${gs.errors[ti]}`, 200, y, 8, '#f8f8e0');
    };
    row(0, 104); row(1, 116);
    txtO('press B', 128, 176, 8, '#e0e0e0', 'center');
  }

  drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    txtO('PAUSED', 128, 70, 16, PAL.gold, 'center');
    const opts = this.pauseOpts();
    opts.forEach((o, i) => txtO((i === this.pauseIdx ? '> ' : '  ') + o.label, 128, 100 + i * 16, 9, i === this.pauseIdx ? '#fff' : '#a0a0b0', 'center'));
    const p = this.gs.currentPitcher();
    txt(`P: ${p.name}  STA ${p.pit.stamina}  used ${this.gs.pitcherLine().pitches}p`, 128, 176, 7, '#90a0b0', 'center');
  }
}

// ================= top-level game / screens =================
class Game {
  constructor() {
    this.input = new Input();
    this.sound = new Sound();
    initSprites();
    this.state = 'title';
    this.lg = L.loadLeague();
    this.match = null;
    this.menuIdx = 0;
    this.tick = 0;
    this.exhib = { away: 0, home: 5, players: 1, sel: 0 };
    this.create = { name: 'MY MOORES', color: 0, logo: 0, field: 0 };
    this.shopIdx = 0; this.shopMode = 'menu'; this.shopPlayer = 0; this.shopStat = 0;
    this.lineupIdx = 0; this.lineupPick = -1;
    this.standTab = 0;
    this.result = null;
    this._unlocked = false;
    this.installCreateKeys();
    window.__game = this;
    // ---- test hooks (harmless in normal play) ----
    window.__stepMatch = (held = [], pressed = []) => {
      if (!this.match) return null;
      const mkPad = (on) => ({ down: (a) => on && held.includes(a), pressed: (a) => on && pressed.includes(a) });
      const fake = { pad: (n) => mkPad(n === 1) };
      this.match.step(fake);
      const m = this.match, gs = m.gs;
      return {
        phase: m.phase, ballPos: !!m.ballPos, t: m.t, pitchFrames: m.pitch ? m.pitch.frames : 0,
        balls: gs.balls, strikes: gs.strikes, outs: gs.outs, inning: gs.inning, half: gs.half,
        control: m.control.slice(), score: gs.score.slice(), hr: gs.hr.slice(), over: gs.over,
      };
    };
    window.__forceHR = () => { if (this.match) this.match.doHR(); };
  }

  unlock() { if (!this._unlocked) { this.sound.unlock(); this._unlocked = true; } }

  installCreateKeys() {
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'create' || this.createField !== 'name') return;
      if (e.key === 'Backspace') { this.create.name = this.create.name.slice(0, -1); e.preventDefault(); }
      else if (/^[a-zA-Z0-9 ]$/.test(e.key) && this.create.name.length < 14) { this.create.name += e.key.toUpperCase(); }
    });
  }

  // menu helper
  menu(opts, cols = 1) {
    const p = this.input;
    if (p.pressed('up')) { this.menuIdx = (this.menuIdx + opts - 1) % opts; this.sound.menuMove(); }
    if (p.pressed('down')) { this.menuIdx = (this.menuIdx + 1) % opts; this.sound.menuMove(); }
  }

  loop() {
    this.tick++;
    this.input.poll();
    this.sound.update();
    if (this.input.pad(1).pressed('mute')) { this.sound.toggleMute(); }
    this.update();
    this.draw();
    this.input.endFrame();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    const st = this['upd_' + this.state];
    if (st) st.call(this);
  }
  draw() {
    ctx.fillStyle = PAL.night; ctx.fillRect(0, 0, W, H);
    const dr = this['draw_' + this.state];
    if (dr) dr.call(this);
    else { txt('...', 10, 20); }
  }

  go(state) { this.state = state; this.menuIdx = 0; }

  // ---------------- TITLE ----------------
  upd_title() {
    this.sound.playMusic('title');
    const p = this.input;
    if (p.pressed('b') || p.pressed('start')) { this.unlock(); this.sound.menuSel(); this.go('mode'); }
  }
  draw_title() {
    // sky + field
    ctx.fillStyle = '#204878'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3a70b0'; ctx.fillRect(0, 0, W, 90);
    // diamond
    ctx.fillStyle = PAL.grass; ctx.beginPath(); ctx.moveTo(128, 210); ctx.lineTo(236, 150); ctx.lineTo(128, 96); ctx.lineTo(20, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.dirt; ctx.beginPath(); ctx.moveTo(128, 200); ctx.lineTo(196, 158); ctx.lineTo(128, 120); ctx.lineTo(60, 158); ctx.closePath(); ctx.fill();
    for (const b of [[128, 198], [188, 156], [128, 122], [68, 156]]) { ctx.fillStyle = PAL.line; ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
    // big logo
    const bob = Math.sin(this.tick * 0.05) * 2;
    drawLogo(ctx, 'star', 128, 44 + bob, 22, { main: '#e04030', dark: '#801818', trim: PAL.gold });
    txtO('BASEBALL', 128, 40 + bob, 26, PAL.gold, 'center', '#301000');
    txtO('MOORES', 128, 66 + bob, 26, '#f8f8f0', 'center', '#301000');
    if (this.tick % 60 < 40) txtO('PRESS  X  /  START', 128, 200, 10, '#fff', 'center');
    txt('SNK-style baseball  ·  build your dynasty', 128, 216, 7, '#b0c0e0', 'center');
  }

  // ---------------- MODE SELECT ----------------
  upd_mode() {
    this.unlock();
    const opts = ['EXHIBITION', this.lg ? 'CONTINUE LEAGUE' : 'NEW LEAGUE', 'NEW LEAGUE (RESET)', 'HOW TO PLAY'];
    this.menu(opts.length);
    const p = this.input;
    if (p.pressed('b') || p.pressed('start')) {
      this.sound.menuSel();
      if (this.menuIdx === 0) { this.go('exhib'); }
      else if (this.menuIdx === 1) { if (this.lg) this.go('hub'); else this.startCreate(); }
      else if (this.menuIdx === 2) { L.clearSave(); this.lg = null; this.startCreate(); }
      else this.go('help');
    }
  }
  draw_mode() {
    txtO('SELECT MODE', 128, 40, 14, PAL.gold, 'center');
    const opts = ['EXHIBITION', this.lg ? 'CONTINUE LEAGUE' : 'NEW LEAGUE', 'NEW LEAGUE (RESET)', 'HOW TO PLAY'];
    opts.forEach((o, i) => txtO((i === this.menuIdx ? '> ' : '  ') + o, 128, 84 + i * 22, 11, i === this.menuIdx ? '#fff' : '#8090a0', 'center'));
    if (this.lg) txt(`Team: ${this.lg.userTeam.name}  $${this.lg.money}  Season ${this.lg.season}`, 128, 200, 8, '#a0d0a0', 'center');
    txt('arrows move  ·  X select', 128, 216, 7, '#7080a0', 'center');
  }

  draw_help() { this.helpScreen(); }
  upd_help() { if (this.input.pressed('b') || this.input.pressed('start')) this.go('mode'); }
  helpScreen() {
    ctx.fillStyle = '#0a1424'; ctx.fillRect(8, 8, 240, 208);
    txtO('HOW TO PLAY', 128, 26, 12, PAL.gold, 'center');
    const lines = [
      'PITCH: dpad aim, A cycles pitch type,',
      '  B throws. Curve/velo from pitcher stats.',
      'BAT: dpad move in box, B swings.',
      '  Time it! hold DOWN+B to bunt.',
      'FIELD: run to the marker, auto-catch.',
      'RUN: bases advance automatically.',
      'ENTER pause (change pitcher) · M mute.',
      '',
      'LEAGUE: win games -> prize $, spend in',
      'the SHOP to TRAIN players & buy stars.',
      'Win the pennant, take the trophy!',
    ];
    lines.forEach((l, i) => txt(l, 16, 46 + i * 14, 8, '#d0e0f0'));
    txtO('press X', 128, 208, 8, '#fff', 'center');
  }

  // ---------------- EXHIBITION SELECT ----------------
  allTeams() {
    const cpu = L.CPU_DEFS.map((d) => L.makeTeam(d, makeRNG(d.tier * 999 + 1)));
    if (this.lg) return [this.lg.userTeam, ...cpu];
    return cpu;
  }
  upd_exhib() {
    const teams = this.allTeams();
    const p = this.input;
    if (p.pressed('down')) { this.exhib.sel = (this.exhib.sel + 1) % 3; this.sound.menuMove(); }
    if (p.pressed('up')) { this.exhib.sel = (this.exhib.sel + 2) % 3; this.sound.menuMove(); }
    const adj = (d) => {
      if (this.exhib.sel === 0) this.exhib.away = (this.exhib.away + d + teams.length) % teams.length;
      else if (this.exhib.sel === 1) this.exhib.home = (this.exhib.home + d + teams.length) % teams.length;
      else this.exhib.players = this.exhib.players === 1 ? 2 : 1;
      this.sound.menuMove();
    };
    if (p.pressed('left')) adj(-1);
    if (p.pressed('right')) adj(1);
    if (p.pressed('b')) {
      if (this.exhib.away === this.exhib.home) { this.sound.denied(); return; }
      this.sound.menuSel();
      const control = this.exhib.players === 2 ? [2, 1] : [0, 1];
      this.startMatch(teams[this.exhib.away], teams[this.exhib.home], control, { exhibition: true }, (res) => { this.result = res; this.exhReturn(res); });
    }
    if (p.pressed('start')) this.go('mode');
  }
  exhReturn() { this.go('box'); this.boxReturn = 'mode'; }
  draw_exhib() {
    const teams = this.allTeams();
    txtO('EXHIBITION', 128, 30, 14, PAL.gold, 'center');
    const rows = [
      ['AWAY', teams[this.exhib.away].name, teams[this.exhib.away].colors.main],
      ['HOME', teams[this.exhib.home].name, teams[this.exhib.home].colors.main],
      ['MODE', this.exhib.players === 2 ? '2 PLAYERS' : '1P vs CPU', '#f0f0f0'],
    ];
    rows.forEach((r, i) => {
      const on = i === this.exhib.sel;
      txt((on ? '>' : ' ') + r[0], 30, 76 + i * 26, 10, on ? '#fff' : '#8090a0');
      txtO('< ' + r[1] + ' >', 150, 76 + i * 26, 10, r[2], 'center');
    });
    // matchup preview
    const a = teams[this.exhib.away], h = teams[this.exhib.home];
    drawLogo(ctx, a.logo || 'diamond', 60, 176, 12, a.colors);
    drawLogo(ctx, h.logo || 'diamond', 196, 176, 12, h.colors);
    txt('VS', 128, 180, 12, '#fff', 'center');
    txt('X start  ·  ENTER back', 128, 214, 7, '#7080a0', 'center');
  }

  // ---------------- TEAM CREATE ----------------
  startCreate() { this.go('create'); this.createField = 'name'; this.create = { name: 'MY MOORES', color: 0, logo: 0 }; }
  get createField() { return this._cf; } set createField(v) { this._cf = v; }
  upd_create() {
    const p = this.input;
    const fields = ['name', 'color', 'logo', 'done'];
    if (p.pressed('down')) { this.createField = fields[(fields.indexOf(this.createField) + 1) % fields.length]; this.sound.menuMove(); }
    if (p.pressed('up')) { this.createField = fields[(fields.indexOf(this.createField) + fields.length - 1) % fields.length]; this.sound.menuMove(); }
    if (this.createField === 'color') {
      if (p.pressed('left')) { this.create.color = (this.create.color + L.COLOR_CHOICES.length - 1) % L.COLOR_CHOICES.length; this.sound.menuMove(); }
      if (p.pressed('right')) { this.create.color = (this.create.color + 1) % L.COLOR_CHOICES.length; this.sound.menuMove(); }
    }
    if (this.createField === 'logo') {
      if (p.pressed('left')) { this.create.logo = (this.create.logo + L.LOGOS.length - 1) % L.LOGOS.length; this.sound.menuMove(); }
      if (p.pressed('right')) { this.create.logo = (this.create.logo + 1) % L.LOGOS.length; this.sound.menuMove(); }
    }
    if (this.createField === 'done' && p.pressed('b')) {
      this.sound.cash();
      const rng = makeRNG(Date.now() >>> 0);
      const team = L.makeUserTeam(this.create.name.trim() || 'My Moores', this.create.color, this.create.logo, rng);
      this.lg = L.newLeague(team, Date.now());
      L.saveLeague(this.lg);
      this.go('hub');
    }
  }
  draw_create() {
    txtO('CREATE YOUR TEAM', 128, 28, 13, PAL.gold, 'center');
    const field = this.createField;
    txt((field === 'name' ? '>' : ' ') + 'NAME', 24, 66, 10, field === 'name' ? '#fff' : '#8090a0');
    ctx.fillStyle = '#182838'; ctx.fillRect(90, 54, 150, 16);
    txt(this.create.name + (field === 'name' && this.tick % 40 < 20 ? '_' : ''), 96, 66, 10, '#fff');
    txt((field === 'color' ? '>' : ' ') + 'COLORS', 24, 100, 10, field === 'color' ? '#fff' : '#8090a0');
    const col = L.COLOR_CHOICES[this.create.color];
    ctx.fillStyle = col.main; ctx.fillRect(120, 88, 16, 16); ctx.fillStyle = col.dark; ctx.fillRect(138, 88, 16, 16); ctx.fillStyle = col.trim; ctx.fillRect(156, 88, 16, 16);
    if (field === 'color') txt('< >', 190, 100, 10, PAL.gold);
    txt((field === 'logo' ? '>' : ' ') + 'LOGO', 24, 138, 10, field === 'logo' ? '#fff' : '#8090a0');
    drawLogo(ctx, L.LOGOS[this.create.logo], 128, 130, 12, col);
    if (field === 'logo') txt('< >', 190, 138, 10, PAL.gold);
    txtO((field === 'done' ? '> PLAY BALL! <' : '  PLAY BALL!'), 128, 176, 12, field === 'done' ? '#fff' : '#90b090', 'center');
    txt('type name  ·  arrows  ·  X confirm', 128, 210, 7, '#7080a0', 'center');
  }

  // ---------------- LEAGUE HUB ----------------
  upd_hub() {
    this.sound.stopMusic();
    const done = this.lg.round >= 15;
    const champ = this.lg.champStage === 1 && !done ? false : this.lg.champStage === 1;
    const opts = this.hubOpts();
    this.menu(opts.length);
    const p = this.input;
    if (p.pressed('b') || p.pressed('start')) {
      this.sound.menuSel();
      const k = opts[this.menuIdx].k;
      if (k === 'play') this.startLeagueGame();
      else if (k === 'champ') this.startChampGame();
      else if (k === 'shop') { this.go('shop'); this.shopMode = 'menu'; }
      else if (k === 'lineup') this.go('lineup');
      else if (k === 'stand') { this.go('stand'); this.standTab = 0; }
      else if (k === 'newseason') { this.lg = L.newSeason(this.lg); L.saveLeague(this.lg); this.sound.cash(); }
      else if (k === 'trophy') this.go('trophy');
      else if (k === 'save') { L.saveLeague(this.lg); this.go('mode'); }
    }
  }
  hubOpts() {
    const lg = this.lg;
    const opts = [];
    if (lg.round < 15) opts.push({ k: 'play', label: 'PLAY NEXT GAME' });
    else if (lg.champStage === 1) opts.push({ k: 'champ', label: 'PENNANT SERIES GAME' });
    else if (lg.champStage === 2) { opts.push({ k: 'trophy', label: 'AWARDS CEREMONY' }); opts.push({ k: 'newseason', label: 'START NEXT SEASON' }); }
    opts.push({ k: 'shop', label: 'SHOP / TRAIN' });
    opts.push({ k: 'lineup', label: 'LINEUP & ROTATION' });
    opts.push({ k: 'stand', label: 'STANDINGS & STATS' });
    opts.push({ k: 'save', label: 'SAVE & QUIT' });
    return opts;
  }
  draw_hub() {
    const lg = this.lg;
    ctx.fillStyle = '#0e1a2e'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = lg.userTeam.colors.dark; ctx.fillRect(0, 0, W, 34);
    drawLogo(ctx, lg.userTeam.logo || 'diamond', 20, 17, 12, lg.userTeam.colors);
    txtO(lg.userTeam.name, 40, 15, 11, '#fff', 'left');
    txt(`Season ${lg.season}   $${lg.money}`, 40, 28, 9, PAL.gold);
    // next matchup card
    if (lg.round < 15) {
      const opp = lg.teams[L.nextOpponent(lg)];
      txt(`Game ${lg.round + 1}/15  vs`, 16, 54, 9, '#c0d0e0');
      txtO(opp.name, 16, 68, 11, opp.colors.main);
      txt(`Tier ${opp.tier}  ★`.repeat(1) + '★'.repeat(opp.tier), 16, 82, 8, PAL.gold);
    } else if (lg.champStage === 1) {
      txtO('PENNANT SERIES', 128, 58, 12, PAL.gold, 'center');
      const cs = lg.champSeries;
      txt(`vs ${lg.teams[cs.opp].name}  (${cs.wins[0]}-${cs.wins[1]})`, 128, 74, 9, '#fff', 'center');
    } else if (lg.champStage === 2) {
      txtO(lg.champion === 0 ? 'YOU WON THE PENNANT!' : 'SEASON COMPLETE', 128, 62, 11, PAL.gold, 'center');
    }
    const opts = this.hubOpts();
    opts.forEach((o, i) => txtO((i === this.menuIdx ? '> ' : '  ') + o.label, 128, 108 + i * 17, 10, i === this.menuIdx ? '#fff' : '#8090a0', 'center'));
    if (lg.lastResult) { const r = lg.lastResult; txt(`Last: ${r.won ? 'WON' : 'lost'} ${r.us}-${r.them}  +$${r.earned}`, 128, 214, 8, r.won ? '#a0f0a0' : '#f0a0a0', 'center'); }
  }

  // ---------------- LINEUP ----------------
  upd_lineup() {
    const p = this.input;
    const lg = this.lg; const t = lg.userTeam;
    if (p.pressed('start') || (p.pressed('b') && this.lineupIdx >= 9 && this.lineupPick < 0 && false)) {}
    if (p.pressed('down')) { this.lineupIdx = Math.min(12, this.lineupIdx + 1); this.sound.menuMove(); }
    if (p.pressed('up')) { this.lineupIdx = Math.max(0, this.lineupIdx - 1); this.sound.menuMove(); }
    // rows 0..8 batting order, 9..12 rotation (pick starter)
    if (p.pressed('b')) {
      if (this.lineupIdx < 9) {
        if (this.lineupPick < 0) { this.lineupPick = this.lineupIdx; this.sound.menuSel(); }
        else { // swap batting order entries
          const a = this.lineupPick, b = this.lineupIdx;
          const tmp = t.lineupIdx[a]; t.lineupIdx[a] = t.lineupIdx[b]; t.lineupIdx[b] = tmp;
          L.hydrate(t); this.lineupPick = -1; this.sound.menuSel(); L.saveLeague(lg);
        }
      } else {
        // set starter: move chosen pitcher to front of rotation
        const ri = this.lineupIdx - 9;
        if (ri < t.rotationIdx.length) {
          const pid = t.rotationIdx[ri];
          t.rotationIdx.splice(ri, 1); t.rotationIdx.unshift(pid);
          L.hydrate(t); this.sound.menuSel(); L.saveLeague(lg);
        }
      }
    }
    if (p.pressed('start')) { this.lineupPick = -1; this.go('hub'); }
  }
  draw_lineup() {
    const t = this.lg.userTeam;
    ctx.fillStyle = '#0e1a2e'; ctx.fillRect(0, 0, W, H);
    txtO('LINEUP', 66, 16, 12, PAL.gold, 'center');
    txt('B swap/set  ·  ENTER back', 178, 14, 7, '#8090a0', 'center');
    txt('# BATTER      POS PW CN SP DF', 8, 30, 7, '#a0b0c0');
    t.lineup.forEach((pl, i) => {
      const on = i === this.lineupIdx, picked = i === this.lineupPick;
      const c = picked ? PAL.gold : on ? '#fff' : '#c0d0e0';
      const b = pl.bat;
      txt(`${i + 1} ${pl.name.padEnd(12).slice(0, 12)} ${pl.pos.padEnd(3)} ${b.power} ${b.contact} ${b.speed} ${b.defense}`, 8, 42 + i * 12, 7, c);
      if (on) txt('>', 2, 42 + i * 12, 7, '#fff');
    });
    txt('ROTATION (B = set starter)  VE CV ST CO', 8, 160, 7, '#a0b0c0');
    t.rotation.forEach((pl, i) => {
      const on = (this.lineupIdx - 9) === i;
      const s = pl.pit;
      txt(`${i === 0 ? 'SP' : 'R' + i} ${pl.name.padEnd(12).slice(0, 12)} ${s.velo} ${s.curve} ${s.stamina} ${s.control}`, 8, 174 + i * 12, 7, on ? '#fff' : '#c0d0e0');
      if (on) txt('>', 2, 174 + i * 12, 7, '#fff');
    });
  }

  // ---------------- SHOP ----------------
  upd_shop() {
    const p = this.input; const lg = this.lg;
    if (this.shopMode === 'menu') {
      const opts = ['TRAIN A PLAYER', 'BUY A PROSPECT', 'BACK'];
      this.menu(opts.length);
      if (p.pressed('b')) {
        this.sound.menuSel();
        if (this.menuIdx === 0) { this.shopMode = 'train'; this.shopPlayer = 0; }
        else if (this.menuIdx === 1) { this.shopMode = 'buy'; this.shopPlayer = 0; this.rollProspects(); }
        else this.go('hub');
      }
    } else if (this.shopMode === 'train') {
      const t = lg.userTeam;
      if (p.pressed('down')) { this.shopPlayer = Math.min(13, this.shopPlayer + 1); this.sound.menuMove(); }
      if (p.pressed('up')) { this.shopPlayer = Math.max(0, this.shopPlayer - 1); this.sound.menuMove(); }
      const pl = t.players[this.shopPlayer];
      const stats = pl.kind === 'pit' ? ['velo', 'curve', 'stamina', 'control'] : ['power', 'contact', 'speed', 'defense'];
      if (p.pressed('left')) { this.shopStat = (this.shopStat + 3) % 4; this.sound.menuMove(); }
      if (p.pressed('right')) { this.shopStat = (this.shopStat + 1) % 4; this.sound.menuMove(); }
      if (p.pressed('b')) {
        if (L.train(lg, pl, stats[this.shopStat])) { this.sound.levelUp(); L.saveLeague(lg); }
        else this.sound.denied();
      }
      if (p.pressed('start')) this.shopMode = 'menu';
    } else if (this.shopMode === 'buy') {
      const t = lg.userTeam;
      if (p.pressed('down')) { this.shopPlayer = Math.min(13, this.shopPlayer + 1); this.sound.menuMove(); }
      if (p.pressed('up')) { this.shopPlayer = Math.max(0, this.shopPlayer - 1); this.sound.menuMove(); }
      if (p.pressed('left')) { this.buyTier = (this.buyTier + 2) % 3; this.rollProspects(); this.sound.menuMove(); }
      if (p.pressed('right')) { this.buyTier = (this.buyTier + 1) % 3; this.rollProspects(); this.sound.menuMove(); }
      if (p.pressed('b')) {
        const slot = t.players[this.shopPlayer];
        const role = slot.kind === 'pit' ? 'pit' : 'bat';
        const tierKey = L.PROSPECT_TIERS[this.buyTier].key;
        const pr = L.genProspect(makeRNG((Date.now() + this.shopPlayer) >>> 0), tierKey, role, slot.pos);
        if (L.buyProspect(lg, this.shopPlayer, pr, tierKey)) { this.sound.cash(); L.saveLeague(lg); }
        else this.sound.denied();
      }
      if (p.pressed('start')) this.shopMode = 'menu';
    }
  }
  rollProspects() { if (this.buyTier === undefined) this.buyTier = 0; }
  draw_shop() {
    const lg = this.lg; const t = lg.userTeam;
    ctx.fillStyle = '#141020'; ctx.fillRect(0, 0, W, H);
    txtO('SHOP', 60, 16, 12, PAL.gold, 'center');
    txt(`$${lg.money}`, 200, 16, 12, PAL.gold, 'center');
    if (this.shopMode === 'menu') {
      const opts = ['TRAIN A PLAYER', 'BUY A PROSPECT', 'BACK'];
      opts.forEach((o, i) => txtO((i === this.menuIdx ? '> ' : '  ') + o, 128, 80 + i * 24, 12, i === this.menuIdx ? '#fff' : '#8090a0', 'center'));
      txt('Win games to earn prize money.', 128, 190, 8, '#a0b0c0', 'center');
    } else if (this.shopMode === 'train') {
      const pl = t.players[this.shopPlayer];
      const stats = pl.kind === 'pit' ? ['VE', 'CV', 'ST', 'CO'] : ['PW', 'CN', 'SP', 'DF'];
      const keys = pl.kind === 'pit' ? ['velo', 'curve', 'stamina', 'control'] : ['power', 'contact', 'speed', 'defense'];
      txt('TRAIN  (up/down player, l/r stat, X buy)', 12, 34, 7, '#a0b0c0');
      // player list
      t.players.forEach((q, i) => {
        const on = i === this.shopPlayer;
        txt(`${q.name.slice(0, 11).padEnd(11)} ${q.pos}`, 12, 48 + i * 11, 7, on ? '#fff' : '#8090a0');
        if (on) txt('>', 6, 48 + i * 11, 7, '#fff');
      });
      // selected stats panel
      ctx.fillStyle = '#20182e'; ctx.fillRect(150, 44, 100, 90);
      txt(pl.name.slice(0, 12), 158, 58, 8, pl.colors ? '#fff' : '#fff');
      const grp = pl.kind === 'pit' ? pl.pit : pl.bat;
      stats.forEach((s, i) => {
        const on = i === this.shopStat;
        txt(`${s} ${grp[keys[i]]}`, 158, 74 + i * 12, 9, on ? PAL.gold : '#d0d0e0');
        if (on) { const cost = L.trainCost(pl, keys[i]); txt(`$${cost}`, 210, 74 + i * 12, 8, lg.money >= cost ? '#a0f0a0' : '#f08080'); }
      });
      txt('ENTER back', 200, 208, 7, '#8090a0', 'center');
    } else if (this.shopMode === 'buy') {
      const tier = L.PROSPECT_TIERS[this.buyTier || 0];
      txt('BUY PROSPECT (l/r tier, up/dn slot, X buy)', 12, 34, 7, '#a0b0c0');
      txtO(`< ${tier.label}  $${tier.cost} >`, 128, 50, 11, PAL.gold, 'center');
      txt('Replaces the selected roster slot:', 12, 66, 7, '#a0b0c0');
      t.players.forEach((q, i) => {
        const on = i === this.shopPlayer;
        const r = q.kind === 'pit' ? L.pitRating(q) : L.batRating(q);
        txt(`${q.name.slice(0, 12).padEnd(12)} ${q.pos.padEnd(3)} rtg ${r}`, 12, 82 + i * 9.5, 7, on ? '#fff' : '#8090a0');
        if (on) txt('>', 6, 82 + i * 9.5, 7, '#fff');
      });
      txt('ENTER back', 200, 214, 7, '#8090a0', 'center');
    }
  }

  // ---------------- STANDINGS & STATS ----------------
  upd_stand() {
    const p = this.input;
    if (p.pressed('left') || p.pressed('right')) { this.standTab = this.standTab === 0 ? 1 : 0; this.sound.menuMove(); }
    if (p.pressed('start') || p.pressed('b')) this.go('hub');
  }
  draw_stand() {
    const lg = this.lg;
    ctx.fillStyle = '#0e1a2e'; ctx.fillRect(0, 0, W, H);
    txtO(this.standTab === 0 ? 'STANDINGS' : 'STAT LEADERS', 128, 16, 12, PAL.gold, 'center');
    txt('< / > switch  ·  X back', 128, 216, 7, '#7080a0', 'center');
    if (this.standTab === 0) {
      txt('TEAM               W  L   RF  RA', 12, 34, 8, '#a0b0c0');
      const order = L.standingsOrder(lg);
      order.forEach((ti, i) => {
        const s = lg.standings[ti]; const t = lg.teams[ti];
        const c = ti === 0 ? PAL.gold : '#d0e0f0';
        txt(`${(i + 1)}. ${t.name.slice(0, 15).padEnd(15)} ${String(s.w).padStart(2)} ${String(s.l).padStart(2)}  ${String(s.rf).padStart(3)} ${String(s.ra).padStart(3)}`, 12, 50 + i * 16, 8, c);
      });
    } else {
      const ld = L.leaders(lg);
      const col = (title, arr, fmt, x, y) => {
        txt(title, x, y, 8, PAL.gold);
        arr.slice(0, 5).forEach((e, i) => txt(`${e.name.slice(0, 9).padEnd(9)} ${fmt(e)}`, x, y + 12 + i * 12, 7, '#d0e0f0'));
      };
      col('HOME RUNS', ld.hr, (e) => e.hr, 12, 40);
      col('AVG', ld.avg, (e) => '.' + (e.avg * 1000).toFixed(0).padStart(3, '0'), 12, 116);
      col('WINS', ld.w, (e) => e.w + 'W', 140, 40);
      col('STRIKEOUTS', ld.k, (e) => e.k + 'K', 140, 116);
    }
  }

  // ---------------- BOX SCORE ----------------
  draw_box() {
    const res = this.result; if (!res) { txt('...', 10, 20); return; }
    ctx.fillStyle = '#0a1424'; ctx.fillRect(0, 0, W, H);
    const gs = this.lastMatch.gs;
    const a = gs.teams[0], h = gs.teams[1];
    txtO('FINAL', 128, 20, 14, PAL.gold, 'center');
    // line score
    const cols = Math.max(gs.line[0].length, gs.line[1].length, 9);
    txt('', 0, 0);
    txt('TEAM', 12, 46, 8, '#a0b0c0');
    for (let i = 0; i < cols; i++) txt(String(i + 1), 60 + i * 15, 46, 6, '#8090a0', 'center');
    txt('R H E', 208, 46, 8, PAL.gold);
    const row = (ti, y) => {
      const t = gs.teams[ti];
      txt(t.short, 12, y, 8, t.colors.main);
      for (let i = 0; i < cols; i++) txt(gs.line[ti][i] !== undefined ? String(gs.line[ti][i]) : '-', 60 + i * 15, y, 6, '#f0f0e0', 'center');
      txt(`${gs.score[ti]} ${gs.hits[ti]} ${gs.errors[ti]}`, 208, y, 8, '#f8f8e0');
    };
    row(0, 60); row(1, 74);
    const winner = res.winner === 0 ? a : h;
    txtO(`${winner.name} WIN!`, 128, 98, 12, '#fff', 'center');
    // top hitters
    txt('BATTING LEADERS', 12, 120, 8, PAL.gold);
    let yy = 132;
    for (const ti of [0, 1]) {
      const best = gs.box[ti].bat.slice().sort((x, y2) => (y2.h * 3 + y2.hr * 4 + y2.rbi) - (x.h * 3 + x.hr * 4 + x.rbi))[0];
      if (best) { txt(`${gs.teams[ti].short} ${best.name.slice(0, 12)}: ${best.h}-${best.ab}${best.hr ? ', ' + best.hr + 'HR' : ''}${best.rbi ? ', ' + best.rbi + 'RBI' : ''}`, 12, yy, 7, '#d0e0f0'); yy += 12; }
    }
    txtO('press X', 128, 210, 9, '#fff', 'center');
    const p = this.input;
    if (p.pressed('b') || p.pressed('start')) {
      this.sound.menuSel();
      if (this.boxReturn === 'mode') this.go('mode');
      else this.go('hub');
    }
  }
  upd_box() {}

  // ---------------- TROPHY ----------------
  upd_trophy() { if (this.input.pressed('b') || this.input.pressed('start')) this.go('hub'); }
  draw_trophy() {
    const lg = this.lg;
    ctx.fillStyle = '#1a1030'; ctx.fillRect(0, 0, W, H);
    this.sound.playMusic('trophy');
    for (let i = 0; i < 30; i++) { const x = (i * 53 + this.tick) % W; ctx.fillStyle = `hsl(${(i * 40 + this.tick) % 360},80%,70%)`; ctx.fillRect(x, (i * 37) % H, 2, 2); }
    const champ = lg.teams[lg.champion >= 0 ? lg.champion : 0];
    txtO('CHAMPIONS', 128, 40, 18, PAL.gold, 'center');
    // trophy cup
    ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.moveTo(108, 80); ctx.lineTo(148, 80); ctx.lineTo(140, 110); ctx.lineTo(116, 110); ctx.closePath(); ctx.fill();
    ctx.fillRect(122, 110, 12, 14); ctx.fillRect(112, 124, 32, 6);
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(106, 90, 8, 0.5, 3.7); ctx.arc(150, 90, 8, -0.6, 2.6); ctx.stroke();
    drawLogo(ctx, champ.logo || 'diamond', 128, 150, 16, champ.colors);
    txtO(champ.name, 128, 180, 12, champ.colors.main, 'center');
    txt(lg.champion === 0 ? 'You built a dynasty!' : 'Better luck next season...', 128, 198, 8, '#d0e0f0', 'center');
    txtO('press X', 128, 214, 8, '#fff', 'center');
  }

  // ---------------- match plumbing ----------------
  startMatch(away, home, control, opts, onDone) {
    this.match = new Match(away, home, control, this.sound, { ...opts, onDone: (res, quit) => { this.lastMatch = this.match; onDone(res, quit); this.match = null; } });
    this.lastMatch = this.match;
    this.go('game');
  }
  startLeagueGame() {
    const lg = this.lg;
    const opp = lg.teams[L.nextOpponent(lg)];
    // user is home
    this.startMatch(opp, lg.userTeam, [0, 1], { seed: (lg.seed + lg.round * 101) >>> 0 }, (res, quit) => {
      if (quit) { this.go('hub'); return; }
      // build result oriented so index0=away(opp), index1=home(user); advanceRound expects userResult with box[0]=user team as away.
      // Re-map: advanceRound treats teams[0] as user (away). Our match had user as home (index1).
      const userRes = {
        score: [res.score[1], res.score[0]],
        winner: res.winner === 1 ? 0 : res.winner === 0 ? 1 : -1,
        hr: [res.hr[1], res.hr[0]], hits: [res.hits[1], res.hits[0]], errors: [res.errors[1], res.errors[0]],
        box: [res.box[1], res.box[0]], line: [res.line[1], res.line[0]], innings: res.innings,
      };
      L.advanceRound(lg, userRes);
      L.saveLeague(lg);
      this.result = res; this.boxReturn = 'hub'; this.go('box');
    });
  }
  startChampGame() {
    const lg = this.lg; const cs = lg.champSeries;
    const opp = lg.teams[cs.opp];
    this.startMatch(opp, lg.userTeam, [0, 1], { seed: (lg.seed + cs.games.length * 313) >>> 0 }, (res, quit) => {
      if (quit) { this.go('hub'); return; }
      const userRes = { score: [res.score[1], res.score[0]], winner: res.winner === 1 ? 0 : 1, box: [res.box[1], res.box[0]] };
      L.advanceChampionship(lg, userRes);
      L.saveLeague(lg);
      this.result = res; this.boxReturn = 'hub'; this.go('box');
    });
  }

  upd_game() { if (this.match) this.match.step(this.input); this.sound.playMusic(null); }
  draw_game() { if (this.match) this.match.draw(); else this.draw_hub(); }
}

// boot
const game = new Game();
initTouch(game.input);
game.loop();
