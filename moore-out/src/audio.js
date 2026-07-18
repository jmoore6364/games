// All-synthesized chiptune audio for Moore-Out!! Every track is an original
// composition in a bouncy 8-bit boxing style (no Nintendo melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Lace 'Em Up" — title screen, big-city swagger. C major strut.
const M_TITLE = [
  60, 0, 64, 0, 67, 0, 64, 0,
  60, 0, 64, 0, 69, 67, 64, 0,
  62, 0, 65, 0, 69, 0, 65, 0,
  62, 0, 65, 0, 71, 69, 65, 0,
  60, 0, 64, 0, 67, 0, 72, 0,
  71, 0, 69, 0, 67, 0, 64, 0,
  65, 65, 64, 64, 62, 62, 59, 62,
  60, 0, 60, 0, 60, 0, 0, 0,
];
const B_TITLE = [36, 43, 36, 43, 38, 45, 38, 45, 36, 43, 41, 43, 43, 43, 36, 36];

// "Circuit Lights" — career menu, easy bounce. F major.
const M_CAREER = [
  65, 0, 69, 0, 72, 0, 69, 0,
  70, 0, 67, 0, 65, 0, 0, 0,
  64, 0, 67, 0, 70, 0, 67, 0,
  69, 0, 65, 0, 62, 0, 0, 0,
];
const B_CAREER = [41, 48, 46, 48, 41, 48, 43, 46];

// "Ring the Bell" — the fight! Driving and punchy. A minor.
const M_FIGHT = [
  57, 0, 57, 60, 62, 0, 60, 62,
  64, 0, 62, 60, 57, 0, 55, 57,
  57, 0, 57, 60, 62, 0, 64, 65,
  67, 0, 65, 64, 62, 0, 60, 62,
  69, 0, 67, 65, 64, 0, 62, 64,
  65, 0, 64, 62, 60, 0, 59, 60,
  62, 62, 64, 65, 67, 65, 64, 62,
  57, 0, 57, 0, 57, 0, 0, 0,
];
const B_FIGHT = [45, 45, 45, 43, 41, 41, 43, 44, 45, 45, 45, 43, 40, 41, 43, 43];

// "Gold Trunks" — championship fight, urgent. D minor.
const M_CHAMP = [
  62, 0, 62, 65, 67, 0, 69, 0,
  70, 69, 67, 65, 62, 0, 61, 62,
  65, 0, 65, 67, 69, 0, 70, 0,
  74, 0, 72, 70, 69, 0, 67, 65,
  62, 0, 62, 65, 67, 0, 69, 0,
  70, 69, 67, 65, 67, 0, 69, 70,
  72, 70, 69, 67, 65, 67, 61, 64,
  62, 0, 62, 0, 62, 0, 0, 0,
];
const B_CHAMP = [38, 38, 38, 36, 34, 34, 36, 37, 38, 38, 38, 36, 33, 34, 36, 36];

// "Green Glove Parade" — victory ceremony. G major, brassy.
const M_VICTORY = [
  67, 0, 71, 0, 74, 0, 79, 0,
  78, 0, 74, 0, 71, 0, 67, 0,
  69, 0, 72, 0, 76, 0, 81, 0,
  79, 0, 76, 0, 74, 0, 71, 0,
  67, 0, 71, 74, 79, 0, 78, 79,
  81, 0, 79, 78, 74, 0, 71, 74,
  79, 78, 76, 74, 72, 74, 76, 78,
  79, 0, 79, 0, 79, 0, 0, 0,
];
const B_VICTORY = [43, 50, 43, 50, 45, 52, 45, 52, 43, 50, 48, 50, 50, 50, 43, 43];

// "Hometown Lights" — credits, warm and slow. C major.
const M_CREDITS = [
  72, 0, 0, 71, 0, 0, 67, 0,
  69, 0, 67, 0, 64, 0, 0, 0,
  65, 0, 0, 67, 0, 0, 69, 0,
  67, 0, 64, 0, 60, 0, 0, 0,
  72, 0, 0, 74, 0, 0, 76, 0,
  74, 0, 72, 0, 69, 0, 71, 0,
  72, 0, 71, 0, 69, 0, 65, 67,
  67, 0, 0, 0, 60, 0, 0, 0,
];
const B_CREDITS = [36, 43, 45, 43, 41, 48, 43, 48, 36, 43, 45, 47, 41, 43, 36, 43];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.13, lead: 'square', drums: true },
  career: { melody: M_CAREER, bass: B_CAREER, stepDur: 0.15, lead: 'square', drums: true },
  fight: { melody: M_FIGHT, bass: B_FIGHT, stepDur: 0.12, lead: 'square', drums: true },
  champ: { melody: M_CHAMP, bass: B_CHAMP, stepDur: 0.105, lead: 'square', drums: true },
  victory: { melody: M_VICTORY, bass: B_VICTORY, stepDur: 0.14, lead: 'square', drums: true },
  credits: { melody: M_CREDITS, bass: B_CREDITS, stepDur: 0.17, lead: 'triangle', drums: false },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.jingleUntil = 0; // music pauses while a jingle plays
    this.crowdGain = null;
    this.crowdLevel = 0;
    this.crowdTarget = 0;
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.master);
      // crowd: looping filtered noise, gain driven per-frame
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.5;
      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.value = 0;
      src.connect(f).connect(this.crowdGain).connect(this.master);
      src.start();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.2;
    return this.muted;
  }

  // crowd ambience: base 0..1, call every frame during fights
  setCrowd(base) { this.crowdTarget = base; }
  crowdPop(amount = 0.8) { this.crowdLevel = Math.max(this.crowdLevel, amount); }
  updateCrowd() {
    if (!this.crowdGain) return;
    this.crowdLevel += (this.crowdTarget - this.crowdLevel) * 0.02;
    if (this.crowdLevel > this.crowdTarget) this.crowdLevel -= 0.004;
    this.crowdGain.gain.value = Math.max(0, Math.min(1, this.crowdLevel)) * 0.5;
  }

  tone(type, f0, f1, dur, vol = 1, when = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 1, freq = 4000, when = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ---- music ----
  playMusic(name) {
    if (this.trackName === name) return;
    this.trackName = name;
    this.track = TRACKS[name] || null;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.06;
  }

  stopMusic() { this.track = null; this.trackName = null; }

  // Call every frame; schedules ahead.
  updateMusic() {
    this.updateCrowd();
    if (!this.ctx || !this.track || this.muted) return;
    if (this.ctx.currentTime < this.jingleUntil) {
      this.nextTime = Math.max(this.nextTime, this.jingleUntil + 0.1);
      return;
    }
    const tr = this.track;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      const i = this.step % tr.melody.length;
      const when = this.nextTime - this.ctx.currentTime;
      const m = tr.melody[i];
      if (m) this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.92, 0.5, when, this.musicGain);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.4, 0.62, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.3, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.16, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // "Winner!" fanfare jingle — pauses music while it plays.
  winJingle() {
    if (!this.ctx) return;
    const seq = [60, 64, 67, 72, 0, 71, 72, 0, 76];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.16, 0.5, i * 0.13);
        this.tone('square', midi(m) * 1.005, 0, 0.16, 0.3, i * 0.13 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.13 + 0.4;
  }

  loseJingle() {
    if (!this.ctx) return;
    [55, 54, 53, 48].forEach((m, i) => this.tone('triangle', midi(m), 0, 0.3, 0.5, i * 0.28));
    this.jingleUntil = this.ctx.currentTime + 1.5;
  }

  // ---- sfx ----
  thudLight() { this.noise(0.06, 0.4, 500); this.tone('triangle', 180, 70, 0.07, 0.5); }
  thudHeavy() { this.noise(0.12, 0.55, 350); this.tone('triangle', 140, 45, 0.14, 0.7); this.tone('square', 90, 40, 0.1, 0.3); }
  whiff() { this.noise(0.08, 0.22, 2600); }
  dodge() { this.noise(0.1, 0.25, 1600); this.tone('sine', 500, 900, 0.08, 0.12); }
  blockTink() { this.tone('square', 1300, 900, 0.05, 0.25); this.noise(0.04, 0.2, 3000); }
  hurt() { this.noise(0.08, 0.4, 700); this.tone('sawtooth', 200, 90, 0.12, 0.35); }
  bell() {
    for (const dt of [0, 0.35, 0.7]) {
      this.tone('square', 1560, 0, 0.3, 0.5, dt);
      this.tone('square', 2340, 0, 0.25, 0.25, dt);
    }
  }
  bellFinal() {
    for (let i = 0; i < 6; i++) { this.tone('square', 1560, 0, 0.18, 0.45, i * 0.14); this.tone('square', 2340, 0, 0.14, 0.2, i * 0.14); }
  }
  knockdown() {
    this.noise(0.3, 0.6, 250);
    this.tone('sawtooth', 130, 30, 0.4, 0.6);
    this.crowdPop(1);
  }
  countBeep(n) {
    // referee count: two-tone voice-ish beep, pitch rises with urgency
    this.tone('square', 320 + n * 14, 250 + n * 14, 0.09, 0.4);
    this.tone('square', 210, 190, 0.07, 0.25, 0.09);
  }
  getUp() { this.tone('square', 300, 700, 0.15, 0.3); }
  starEarn() { [880, 1100, 1760].forEach((f, i) => this.tone('square', f, 0, 0.08, 0.35, i * 0.06)); }
  starPunch() { this.tone('square', 200, 900, 0.12, 0.4); this.noise(0.16, 0.6, 400, 0.06); this.tone('triangle', 120, 40, 0.2, 0.7, 0.06); }
  tired() { this.tone('triangle', 400, 150, 0.35, 0.3); }
  heartRecover() { this.tone('square', 700, 1050, 0.07, 0.2); }
  taunt() { this.tone('square', 500, 350, 0.08, 0.2); this.tone('square', 600, 400, 0.08, 0.2, 0.1); }
  koFlash() { this.tone('sawtooth', 80, 30, 0.8, 0.6); this.noise(0.5, 0.6, 200); this.crowdPop(1); }
  select() { this.tone('square', 880, 0, 0.06, 0.3); }
  confirm() { this.tone('square', 660, 990, 0.1, 0.3); this.tone('square', 990, 1320, 0.1, 0.3, 0.08); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
}
