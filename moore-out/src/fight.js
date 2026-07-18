// Fight engine: player state, opponent pattern runner, rounds, scoring.
// Everything is frame-based (60fps) and deterministic via a seeded RNG so the
// smoke tests can script exact scenarios.

import { OPPONENTS } from './opponents.js';
import {
  drawRing, drawOpponent, drawIncomingGlove, drawPlayer, drawReferee,
  drawTrainer, drawStarIcon, drawHeart, drawSpeechBubble,
} from './sprites.js';

const PHP_MAX = 96;
const HEARTS_MAX = 10;
const ROUND_SECS = 180;
const CLOCK_RATE = 2 / 60; // accelerated 2x

function txt(c, str, x, y, color = '#fff', size = 8, align = 'left') {
  c.font = `${size}px monospace`;
  c.textAlign = align;
  c.textBaseline = 'top';
  c.fillStyle = color;
  c.fillText(str, x, y);
}

class Rng {
  constructor(s) { this.s = (s >>> 0) || 1; }
  next() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296; }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
}

const moveSide = (m) => (m.endsWith('L') ? 'L' : 'R');

export class Fight {
  constructor(sound, oppIndex, seed = 12345) {
    this.sound = sound;
    this.def = OPPONENTS[oppIndex];
    this.oppIndex = oppIndex;
    this.rng = new Rng(seed + oppIndex * 7919);

    this.player = {
      hp: PHP_MAX, hpMax: PHP_MAX,
      hearts: HEARTS_MAX, stars: 0, tired: false,
      state: 'idle', t: 0,
      punch: null,          // {hand, face, star, startup, active, recover}
      punchResolved: false,
      dodgeDir: 0,
      hurtT: 0, invuln: 0,
      downs: 0, mash: 0,
      restT: 0,             // frames without punching (heart regen)
      score: 0,
      buf: {},              // buffered taps (survive hitstop / recovery frames)
    };

    this.opp = {
      hp: this.def.hp, hpMax: this.def.hp,
      state: 'idle', t: 0,
      idleT: 50,
      combo: null, stepIdx: 0, step: null,
      resolved: false,      // this step's active hit already resolved
      stunHits: 0, stunT: 0, staggerT: 0,
      hitT: 0, hitDir: 0,   // head-snap reaction
      downs: 0, downsRound: 0,
      speech: null, speechT: 0,
      score: 0,
      getUpAtCount: 0,
    };

    this.round = 1;
    this.clock = 0;
    this.phase = 'intro';   // intro fight playerDown oppDown roundEnd corner over
    this.phaseT = 0;
    this.count = 0; this.countT = 0;
    this.hitstop = 0; this.shake = 0;
    this.slowmo = 0;        // final-KO dramatic flash
    this.banner = null; this.bannerT = 0;
    this.result = null;     // {win, method}
    this.overT = 0;
    this.announced = false;
    this.pKD = { round: 0 }; // player knockdowns this round
  }

  // ---------- helpers ----------

  say(s, t = 60) { this.opp.speech = s; this.opp.speechT = t; }
  flash(str, t = 60) { this.banner = str; this.bannerT = t; }

  pickCombo() {
    const list = this.def.combos.filter((cb) => (cb.minRound || 1) <= this.round);
    let tot = 0;
    for (const cb of list) tot += cb.w;
    let r = this.rng.next() * tot;
    for (const cb of list) { r -= cb.w; if (r <= 0) return cb; }
    return list[0];
  }

  // Test hook: begin a specific combo immediately.
  forceCombo(i) {
    const o = this.opp;
    o.combo = this.def.combos[i];
    o.stepIdx = 0;
    this.startStep();
  }

  startStep() {
    const o = this.opp;
    const step = o.combo.steps[o.stepIdx];
    o.step = step;
    o.t = 0;
    o.resolved = false;
    if (step.taunt) {
      o.state = 'taunt';
      if (step.speech) this.say(step.speech, step.taunt);
      this.sound.taunt();
    } else if (step.wait) {
      o.state = 'wait';
    } else {
      o.state = 'tell';
      if (step.speech) this.say(step.speech, step.tell + 20);
    }
  }

  nextStep() {
    const o = this.opp;
    o.stepIdx++;
    if (o.combo && o.stepIdx < o.combo.steps.length) this.startStep();
    else this.backToIdle();
  }

  backToIdle() {
    const o = this.opp;
    o.state = 'idle';
    o.combo = null; o.step = null; o.t = 0;
    o.idleT = this.rng.int(this.def.idleMin, this.def.idleMax);
  }

  // ---------- player punch resolution ----------

  playerPunchLands() {
    const p = this.player, o = this.opp, d = this.def;
    const pu = p.punch;
    const star = pu.star, face = pu.face || star;

    // counter window: opponent just began a counterable telegraph
    if (o.state === 'tell' && o.step.counter && o.t <= d.cWin) {
      const dmg = 12;
      o.hp -= dmg;
      o.state = 'staggered';
      o.staggerT = d.counterStagger;
      o.stunHits++;
      this.registerHit(pu.hand, dmg, 200, true);
      if (p.stars < 3) { p.stars++; this.sound.starEarn(); this.flash('COUNTER! ★', 45); }
      else this.flash('COUNTER!', 45);
      return;
    }

    const vulnerable = ['recover', 'staggered', 'stunned', 'taunt'].includes(o.state);
    const bodyOpen = o.state === 'idle' && d.guard === 'face' && !face;

    if (vulnerable || bodyOpen) {
      // armored face bounce
      if (face && d.armored && o.state !== 'stunned') {
        this.sound.blockTink();
        this.loseHeart();
        this.flash('BOUNCED!', 30);
        return;
      }
      let dmg = star ? 24 : face ? Math.round(6 * d.faceMul) : 6;
      if (o.state === 'stunned') dmg = Math.round(dmg * 1.5);
      if (bodyOpen) dmg = 4;
      o.hp -= dmg;
      if (o.state === 'taunt') { o.state = 'staggered'; o.staggerT = 40; }
      if (o.state !== 'stunned') {
        o.stunHits++;
        if (o.stunHits >= d.hitsToStun && o.hp > 0) {
          o.state = 'stunned'; o.stunT = d.stunDur; o.stunHits = 0;
          this.flash('DIZZY!', 50);
        }
      }
      this.registerHit(pu.hand, dmg, star ? 300 : face ? 20 : 10, star);
      return;
    }

    if (o.state === 'down' || o.state === 'getup' || o.state === 'active') {
      this.sound.whiff();
      return;
    }

    // guarded (idle with full guard, or a committed tell)
    this.sound.blockTink();
    this.loseHeart();
    // guarded opponents punish impatience: hurry the next attack
    if (o.state === 'idle' && d.guard === 'all') o.idleT = Math.min(o.idleT, 12);
  }

  registerHit(hand, dmg, pts, heavy) {
    const o = this.opp;
    o.hitT = 14;
    o.hitDir = hand === 'L' ? 1 : -1;
    this.player.score += pts;
    this.hitstop = heavy ? 8 : 4;
    if (heavy) { this.shake = 6; this.sound.thudHeavy(); this.sound.crowdPop(0.7); }
    else this.sound.thudLight();
    if (o.hp <= 0) this.oppKnockdown();
  }

  loseHeart() {
    const p = this.player;
    p.hearts = Math.max(0, p.hearts - 1);
    if (p.hearts === 0 && !p.tired) { p.tired = true; this.sound.tired(); this.flash('TIRED!', 60); }
  }

  recoverHearts(n) {
    const p = this.player;
    p.hearts = Math.min(HEARTS_MAX, p.hearts + n);
    if (p.tired && p.hearts >= 3) { p.tired = false; this.sound.heartRecover(); }
  }

  // ---------- opponent attack resolution ----------

  resolveOppHit() {
    const p = this.player, o = this.opp, step = o.step;
    o.resolved = true;

    // player defense?
    const dodging = (p.state === 'dodgeL' && p.t >= 2 && p.t <= 18) ? 'left'
      : (p.state === 'dodgeR' && p.t >= 2 && p.t <= 18) ? 'right' : null;
    const ducking = p.state === 'duck';

    if ((dodging && step.avoid.includes(dodging)) || (ducking && step.avoid.includes('duck'))) {
      // clean avoid
      this.sound.dodge();
      this.recoverHearts(2);
      if (step.starOnDodge && p.stars < 3) {
        p.stars++; this.sound.starEarn(); this.flash('DODGED! ★', 50);
      }
      return;
    }

    if (p.invuln > 0) { this.sound.whiff(); return; }

    if (ducking && step.block) {
      // blocked: chip damage
      const chip = Math.max(1, Math.ceil(step.dmg / 4));
      p.hp = Math.max(0, p.hp - chip);
      this.loseHeart();
      o.score += chip * 10;
      this.sound.blockTink();
      p.hurtT = 10;
      if (p.hp <= 0) this.playerKnockdown();
      return;
    }

    // clean hit on the player
    p.hp = Math.max(0, p.hp - step.dmg);
    p.hurtT = 22;
    p.state = 'idle'; p.punch = null; // interrupted
    p.stars = Math.max(0, p.stars - 1);
    this.loseHeart();
    o.score += step.dmg * 10;
    this.hitstop = 5;
    this.shake = 4;
    this.sound.hurt();
    this.sound.crowdPop(0.5);
    if (step.kd || p.hp <= 0) this.playerKnockdown();
  }

  // ---------- knockdowns ----------

  oppKnockdown() {
    const o = this.opp;
    o.hp = 0;
    o.downs++; o.downsRound++;
    o.state = 'down'; o.t = 0;
    o.combo = null; o.step = null;
    o.speech = null;
    this.player.score += 500;
    this.phase = 'oppDown'; this.phaseT = 0;
    this.count = 0; this.countT = 0;
    this.shake = 10;
    this.sound.knockdown();
    const final = o.downsRound >= 3 || o.downs > 3;
    o.getUpAtCount = final ? 99 : this.def.getUpCounts[Math.min(o.downs - 1, 2)];
    if (o.getUpAtCount >= 99 || o.downsRound >= 3) {
      // he's not getting up — dramatic finish
      this.slowmo = 90;
      this.sound.koFlash();
    }
  }

  playerKnockdown() {
    const p = this.player;
    p.hp = Math.max(0, p.hp);
    p.downs++;
    this.pKD.round++;
    p.state = 'down'; p.t = 0; p.mash = 0; p.punch = null;
    p.stars = 0;
    this.backToIdle(); // opponent steps back to his corner
    this.phase = 'playerDown'; this.phaseT = 0;
    this.count = 0; this.countT = 0;
    this.shake = 10;
    this.sound.knockdown();
    if (this.pKD.round >= 3) {
      this.endFight(false, 'TKO');
    }
  }

  endFight(win, method) {
    this.phase = 'over';
    this.phaseT = 0; this.overT = 0;
    this.result = { win, method };
    this.opp.speech = null;
    if (win) { this.slowmo = Math.max(this.slowmo, 60); this.sound.winJingle(); this.sound.crowdPop(1); }
    else this.sound.loseJingle();
  }

  // ---------- per-frame update ----------

  update(input) {
    this.phaseT++;
    if (this.bannerT > 0) this.bannerT--;
    if (this.shake > 0) this.shake--;
    if (this.phase === 'fight') this.bufferInputs(input);
    if (this.slowmo > 0) { this.slowmo--; if (this.phaseT % 2 === 0) return; }
    if (this.hitstop > 0) { this.hitstop--; return; }

    switch (this.phase) {
      case 'intro': this.updateIntro(input); break;
      case 'fight': this.updateFight(input); break;
      case 'playerDown': this.updatePlayerDown(input); break;
      case 'oppDown': this.updateOppDown(input); break;
      case 'roundEnd': this.updateRoundEnd(); break;
      case 'corner': this.updateCorner(input); break;
      case 'over': this.overT++; break;
    }
  }

  updateIntro(input) {
    this.sound.setCrowd(0.25);
    if (this.phaseT === 1) this.flash(`ROUND ${this.round}`, 80);
    if (this.phaseT === 90) { this.sound.bell(); this.flash('FIGHT!', 40); }
    if (this.phaseT >= 110 || (this.phaseT > 20 && input.pressed('start'))) {
      this.phase = 'fight'; this.phaseT = 0;
    }
  }

  updateFight(input) {
    this.sound.setCrowd(0.18);
    this.clock += CLOCK_RATE;
    if (this.clock >= ROUND_SECS) { this.roundBell(); return; }
    this.updatePlayer(input);
    this.updateOpp();
  }

  roundBell() {
    const final = this.round >= 3;
    if (final) this.sound.bellFinal(); else this.sound.bell();
    this.phase = 'roundEnd'; this.phaseT = 0;
    this.player.punch = null;
    if (this.player.state !== 'down') this.player.state = 'idle';
    this.opp.combo = null; this.opp.step = null;
    if (this.opp.state !== 'down') this.opp.state = 'idle';
    this.opp.speech = null;
  }

  updateRoundEnd() {
    if (this.phaseT < 80) return;
    if (this.round >= 3) {
      // decision on points
      const win = this.player.score > this.opp.score;
      this.endFight(win, 'DECISION');
    } else {
      this.phase = 'corner'; this.phaseT = 0;
    }
  }

  updateCorner(input) {
    this.sound.setCrowd(0.08);
    const go = input.pressed('start') || input.pressed('lpunch') || input.pressed('rpunch');
    if ((this.phaseT > 45 && go) || this.phaseT > 600) {
      // next round
      this.round++;
      this.clock = 0;
      this.pKD.round = 0;
      this.opp.downsRound = 0;
      const p = this.player;
      p.hp = Math.min(p.hpMax, p.hp + 30);
      p.hearts = HEARTS_MAX; p.tired = false;
      this.opp.hp = Math.min(this.opp.hpMax, this.opp.hp + 12);
      this.backToIdle();
      this.phase = 'intro'; this.phaseT = 0;
    }
  }

  // ---------- player ----------

  // Taps are buffered for a few frames so punches queued during hitstop or
  // recovery still come out — crucial for counter -> star punch flow.
  bufferInputs(input) {
    const b = this.player.buf;
    for (const k of Object.keys(b)) { if (--b[k] <= 0) delete b[k]; }
    for (const a of ['lpunch', 'rpunch', 'star', 'left', 'right']) {
      if (input.pressed(a)) b[a] = 9;
    }
  }

  buffed(a) {
    if (this.player.buf[a]) { delete this.player.buf[a]; return true; }
    return false;
  }

  updatePlayer(input) {
    const p = this.player;
    if (p.invuln > 0) p.invuln--;
    if (p.hurtT > 0) { p.hurtT--; return; }

    // ongoing dodge
    if (p.state === 'dodgeL' || p.state === 'dodgeR') {
      p.t++;
      if (p.t > 22) p.state = 'idle';
      return;
    }

    // ongoing punch
    if (p.punch) {
      const pu = p.punch;
      p.t++;
      if (p.t === pu.startup && !p.punchResolved) {
        p.punchResolved = true;
        this.playerPunchLands();
      }
      if (p.t >= pu.startup + pu.active + pu.recover) { p.punch = null; p.state = 'idle'; }
      return;
    }

    // duck / block (hold down)
    if (input.down('down')) {
      p.state = 'duck';
      p.restT++;
      if (p.restT % 110 === 0) this.recoverHearts(1);
      return;
    } else if (p.state === 'duck') {
      p.state = 'idle';
    }

    // dodges
    if (this.buffed('left')) { p.state = 'dodgeL'; p.t = 0; return; }
    if (this.buffed('right')) { p.state = 'dodgeR'; p.t = 0; return; }

    // punches
    const wantL = this.buffed('lpunch');
    const wantR = this.buffed('rpunch');
    const wantStar = this.buffed('star');
    if (wantStar && p.stars > 0 && !p.tired) {
      p.stars--;
      p.punch = { hand: 'R', face: true, star: true, startup: 10, active: 4, recover: 22 };
      p.state = 'star'; p.t = 0; p.punchResolved = false; p.restT = 0;
      this.sound.starPunch();
      return;
    }
    if ((wantL || wantR) && !p.tired) {
      const face = input.down('up');
      p.punch = { hand: wantL ? 'L' : 'R', face, star: false, startup: 6, active: 3, recover: 13 };
      p.state = (face ? 'face' : 'jab') + (wantL ? 'L' : 'R');
      p.t = 0; p.punchResolved = false; p.restT = 0;
      return;
    }
    if ((wantL || wantR || wantStar) && p.tired) this.sound.whiff();

    p.state = 'idle';
    p.restT++;
    if (p.restT % 90 === 0) this.recoverHearts(1);
  }

  // ---------- opponent pattern runner ----------

  updateOpp() {
    const o = this.opp, d = this.def;
    if (o.speechT > 0) { o.speechT--; if (o.speechT === 0) o.speech = null; }
    if (o.hitT > 0) o.hitT--;

    switch (o.state) {
      case 'idle':
        o.idleT--;
        if (o.idleT <= 0) {
          o.combo = this.pickCombo();
          o.stepIdx = 0;
          this.startStep();
        }
        break;
      case 'tell': {
        o.t++;
        const step = o.step;
        if (o.t >= step.tell) {
          if (step.feint) { this.sound.whiff(); this.nextStep(); }
          else { o.state = 'active'; o.t = 0; }
        }
        break;
      }
      case 'active': {
        o.t++;
        if (o.t === 2 && !o.resolved) this.resolveOppHit();
        if (this.phase !== 'fight' || !o.step) break; // knockdown ended the exchange
        if (o.t >= o.step.active) { o.state = 'recover'; o.t = 0; }
        break;
      }
      case 'recover':
        o.t++;
        if (o.t >= o.step.recover) this.nextStep();
        break;
      case 'taunt':
        o.t++;
        if (o.t >= o.step.taunt) this.nextStep();
        break;
      case 'wait':
        o.t++;
        if (o.t >= o.step.wait) this.nextStep();
        break;
      case 'staggered':
        o.staggerT--;
        if (o.staggerT <= 0) this.backToIdle();
        break;
      case 'stunned':
        o.stunT--;
        if (o.stunT <= 0) { this.backToIdle(); o.stunHits = 0; }
        break;
      case 'getup':
        o.t++;
        if (o.t > 40) this.backToIdle();
        break;
    }
  }

  // ---------- down phases ----------

  updateOppDown(input) {
    const o = this.opp;
    o.t++;
    this.sound.setCrowd(0.5);
    this.countT++;
    if (this.countT >= 50 && this.count < 10) {
      this.countT = 0;
      this.count++;
      this.sound.countBeep(this.count);
      if (this.count >= 10 || (this.count >= o.getUpAtCount && o.getUpAtCount >= 99)) {
        this.endFight(true, o.downsRound >= 3 ? 'TKO' : 'KO');
        return;
      }
      if (this.count >= o.getUpAtCount) {
        // he rises
        o.hp = Math.round(o.hpMax * this.def.downHpRestore);
        o.state = 'getup'; o.t = 0;
        o.stunHits = 0;
        this.sound.getUp();
        this.phase = 'fight'; this.phaseT = 0;
        this.player.invuln = Math.max(this.player.invuln, 20);
      }
    }
    // pause the fight clock during counts (classic)
    void input;
  }

  updatePlayerDown(input) {
    const p = this.player;
    p.t++;
    this.sound.setCrowd(0.45);
    if (this.result) return; // TKO already called
    // mash to get up
    if (input.pressed('lpunch') || input.pressed('rpunch')) {
      p.mash += 8;
      this.sound.getUp();
    }
    this.countT++;
    if (this.countT >= 50) {
      this.countT = 0;
      this.count++;
      if (this.count >= 10) { this.endFight(false, 'KO'); return; }
      this.sound.countBeep(this.count);
    }
    if (p.mash >= 60 && this.count >= 1) {
      // back on his feet
      p.state = 'idle'; p.t = 0;
      p.hp = Math.max(p.hp, Math.round(p.hpMax * 0.4));
      p.hearts = 5; p.tired = false;
      p.invuln = 70;
      this.phase = 'fight'; this.phaseT = 0;
      this.backToIdle();
      this.sound.heartRecover();
    }
  }

  // ================= drawing =================

  oppPose(frame) {
    const o = this.opp, d = this.def;
    const pose = { armL: { mode: 'guard' }, armR: { mode: 'guard' }, expr: 'idle' };
    const beat = Math.sin(frame / 14);

    if (o.state === 'down') {
      pose.down = true; pose.downT = Math.min(1, o.t / 20);
      return pose;
    }

    // baseline idle motion
    pose.bob = Math.sin(frame / 20) * 2;
    if (d.dance && (o.state === 'idle' || o.state === 'tell')) {
      pose.leanX = beat * 7;
      pose.bob = Math.abs(beat) * -4 + 2;
    }
    if (frame % 160 < 8 && o.state === 'idle') pose.expr = 'blink';

    const step = o.step;
    const side = step && step.m ? moveSide(step.m) : 'R';
    const armKey = side === 'L' ? 'armL' : 'armR';

    switch (o.state) {
      case 'tell': {
        const k = Math.min(1, o.t / Math.max(1, step.tell * 0.6));
        const isUpper = step.m.startsWith('upper') || step.m === 'special';
        const isHook = step.m.startsWith('hook') || step.m.startsWith('spin');
        pose[armKey] = { mode: isUpper ? 'windup' : isHook ? 'back' : 'back', t: isHook ? k : k * 0.7 };
        if (isUpper) { pose.leanY = 10 * k; pose[armKey] = { mode: 'windup', t: k }; }
        if (step.m.startsWith('spin')) pose.leanX = (side === 'L' ? -14 : 14) * k;
        if (step.m === 'special') {
          pose.armL = { mode: 'up', t: k }; pose.armR = { mode: 'windup', t: k };
          pose.leanY = 8 * k;
        }
        // telegraph accents
        const inWin = step.counter && o.t <= d.cWin;
        if (inWin) { if (side === 'L') pose.flashL = true; else pose.flashR = true; }
        if (step.m === 'special') { pose.flashL = pose.flashR = inWin; }
        pose.expr = step.tellWink ? 'wink' : step.tellBlink ? 'blink' : 'angry';
        break;
      }
      case 'active': {
        pose[armKey] = { mode: 'punchlow', t: 1 };
        pose.expr = 'angry';
        pose.leanY = step.m.startsWith('upper') ? 4 : 0;
        break;
      }
      case 'recover':
        pose[armKey] = { mode: 'dangle', t: 1 };
        pose.expr = o.resolved ? 'idle' : 'blink';
        pose.leanY = 4;
        if (step && step.recover > 60) { pose.expr = 'hurt'; pose.sweat = true; pose.leanY = 8; }
        break;
      case 'staggered':
        pose.armL = { mode: 'dangle' }; pose.armR = { mode: 'dangle' };
        pose.expr = 'hurt'; pose.leanY = -3;
        pose.headX = Math.sin(frame / 3) * (o.staggerT > 30 ? 2 : 0);
        break;
      case 'stunned':
        pose.armL = { mode: 'dangle' }; pose.armR = { mode: 'dangle' };
        pose.expr = 'dizzy';
        pose.leanX = Math.sin(frame / 9) * 6;
        pose.sweat = true;
        break;
      case 'taunt':
        pose.armR = { mode: 'up', t: 1 };
        pose.expr = 'grin';
        pose.bob = Math.sin(frame / 6) * 2;
        break;
      case 'getup':
        pose.leanY = Math.max(0, 40 - o.t);
        pose.expr = 'hurt';
        break;
      case 'win':
        pose.armL = { mode: 'up', t: 1 }; pose.armR = { mode: 'up', t: 1 };
        pose.expr = 'grin';
        pose.bob = Math.sin(frame / 8) * 3;
        break;
    }

    // hit reaction overrides
    if (o.hitT > 0) {
      pose.headX = o.hitDir * (o.hitT > 7 ? 6 : 3);
      pose.headY = -2;
      pose.expr = 'hurt';
      if (o.hitT > 10) pose.tintWhite = true;
    }
    return pose;
  }

  playerParams() {
    const p = this.player;
    const d = { pose: 'idle', t: 0, tired: p.tired, ox: 0, oy: 0, alpha: 0.88 };
    if (p.state === 'down') { d.pose = 'down'; return d; }
    if (p.state === 'dodgeL') { d.pose = 'dodgeL'; d.ox = -Math.sin(Math.min(1, p.t / 20) * Math.PI) * 40; }
    else if (p.state === 'dodgeR') { d.pose = 'dodgeR'; d.ox = Math.sin(Math.min(1, p.t / 20) * Math.PI) * 40; }
    else if (p.state === 'duck') d.pose = 'duck';
    else if (p.punch) {
      d.pose = p.state === 'star' ? 'star' : p.state;
      const pu = p.punch;
      const total = pu.startup + pu.active;
      d.t = p.t < total ? Math.min(1, p.t / pu.startup) : Math.max(0, 1 - (p.t - total) / pu.recover);
    }
    if (p.hurtT > 0) { d.ox = Math.sin(p.hurtT) * 4; d.oy = 3; }
    return d;
  }

  draw(c, frame) {
    const p = this.player, o = this.opp, d = this.def;
    c.save();
    if (this.shake > 0) c.translate((frame % 2) * 2 - 1, ((frame >> 1) % 2) * 2 - 1);

    drawRing(c, frame);

    // opponent
    drawOpponent(c, d.cfg, this.phase === 'over' && !this.result.win
      ? { armL: { mode: 'up', t: 1 }, armR: { mode: 'up', t: 1 }, expr: 'grin', bob: Math.sin(frame / 8) * 3 }
      : this.oppPose(frame), frame);

    // incoming glove
    if (o.state === 'active' && o.step && o.step.m && !o.step.feint) {
      const t = Math.min(1, o.t / Math.max(1, o.step.active));
      drawIncomingGlove(c, d.cfg, o.step.m === 'special' ? 'R' : moveSide(o.step.m), t, o.step.high, frame);
    }

    // referee during counts
    if (this.phase === 'oppDown' || this.phase === 'playerDown') {
      drawReferee(c, 52, 178, frame, true);
      if (this.count > 0) {
        txt(c, String(this.count), 52, 120, '#f8f8f8', 24, 'center');
      }
    }

    // player (in front, semi-transparent so the opponent stays visible)
    drawPlayer(c, this.playerParams(), frame);

    // speech bubble
    if (o.speech && o.state !== 'down') {
      drawSpeechBubble(c, 128 + (this.oppPose(frame).leanX || 0), 52, o.speech);
    }

    c.restore();

    // KO slow flash
    if (this.slowmo > 0 && (this.slowmo >> 2) % 2 === 0) {
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fillRect(0, 0, 256, 240);
    }

    this.drawHUD(c, frame);

    // phase overlays
    if (this.phase === 'corner') this.drawCorner(c, frame);
    if (this.phase === 'playerDown' && !this.result) {
      txt(c, 'MASH Z / X !!', 128, 148, frame % 10 < 6 ? '#f8d838' : '#f88838', 10, 'center');
      c.fillStyle = '#181828'; c.fillRect(88, 164, 80, 8);
      c.fillStyle = '#f8d838'; c.fillRect(90, 166, Math.min(76, (p.mash / 60) * 76), 4);
    }
    if (this.phase === 'over') this.drawOver(c, frame);

    if (this.bannerT > 0 && (this.bannerT > 20 || frame % 6 < 4)) {
      txt(c, this.banner, 128, 92, '#f8d838', 12, 'center');
    }
  }

  drawHUD(c, frame) {
    const p = this.player, o = this.opp;
    c.fillStyle = 'rgba(4,6,12,0.85)';
    c.fillRect(0, 0, 256, 30);
    // player HP
    txt(c, 'MOORE', 6, 2, '#88e898', 7);
    c.fillStyle = '#181828'; c.fillRect(6, 11, 72, 6);
    c.fillStyle = p.hp < p.hpMax * 0.25 ? '#f84848' : '#48d858';
    c.fillRect(7, 12, Math.max(0, (p.hp / p.hpMax)) * 70, 4);
    // hearts
    for (let i = 0; i < HEARTS_MAX; i++) drawHeart(c, 6 + i * 7, 20, i < p.hearts);
    // stars
    for (let i = 0; i < 3; i++) drawStarIcon(c, 88 + i * 10, 24, i < p.stars);

    // opponent HP
    txt(c, this.def.name, 250, 2, '#f89888', 7, 'right');
    c.fillStyle = '#181828'; c.fillRect(178, 11, 72, 6);
    c.fillStyle = '#f86848';
    c.fillRect(179, 12, Math.max(0, o.hp / o.hpMax) * 70, 4);
    // opponent knockdown pips
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i < o.downsRound ? '#f8d838' : '#3a3a4a';
      c.fillRect(214 + i * 8, 20, 5, 4);
    }
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i < this.pKD.round ? '#f84848' : '#3a3a4a';
      c.fillRect(130 + i * 8, 24, 5, 4);
    }

    // round / clock / score
    const secs = Math.max(0, ROUND_SECS - this.clock);
    const mm = Math.floor(secs / 60), ss = String(Math.floor(secs % 60)).padStart(2, '0');
    txt(c, `R${this.round}  ${mm}:${ss}`, 128, 2, '#f8f8f8', 8, 'center');
    txt(c, String(p.score).padStart(6, '0'), 128, 12, '#f8d838', 8, 'center');
    void frame;
  }

  drawCorner(c, frame) {
    c.fillStyle = 'rgba(4,6,12,0.82)';
    c.fillRect(0, 0, 256, 240);
    txt(c, `END OF ROUND ${this.round}`, 128, 34, '#f8d838', 10, 'center');
    drawTrainer(c, 42, 120);
    txt(c, 'MOORE LOUIS:', 74, 84, '#88e898', 8);
    // word-wrap advice
    const advice = this.def.advice[Math.min(this.round - 1, 2)];
    const words = advice.split(' ');
    let line = '', y = 100;
    c.font = '8px monospace';
    for (const w of words) {
      const t2 = line ? line + ' ' + w : w;
      if (t2.length > 21) { txt(c, line, 74, y, '#e8e8e8', 8); line = w; y += 12; }
      else line = t2;
    }
    if (line) txt(c, line, 74, y, '#e8e8e8', 8);
    txt(c, `SCORE ${this.player.score}  VS  ${this.opp.score}`, 128, 190, '#99a', 8, 'center');
    if (frame % 60 < 40) txt(c, 'PUNCH OR ENTER FOR NEXT ROUND', 128, 210, '#f8f8f8', 8, 'center');
  }

  drawOver(c, frame) {
    const r = this.result;
    if (this.overT > 30) {
      c.fillStyle = 'rgba(4,6,12,0.55)';
      c.fillRect(0, 60, 256, 90);
      const big = r.method === 'DECISION' ? (r.win ? 'DECISION WIN' : 'DECISION LOSS') : r.method + '!!';
      txt(c, big, 128, 80, r.win ? '#f8d838' : '#f85858', 20, 'center');
      txt(c, r.win ? 'LITTLE MOORE WINS!' : `${this.def.name} WINS`, 128, 110, '#f8f8f8', 9, 'center');
      if (this.overT > 90 && frame % 60 < 40) txt(c, 'PUSH ENTER', 128, 132, '#99a', 8, 'center');
    }
  }
}
