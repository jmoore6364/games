// Baseball Moores — all-synth WebAudio. Ballpark organ riffs, charge fanfare,
// title theme, between-innings jingle, umpire-call blips, hit crack, catch
// thump, crowd swells, HR fanfare. No assets.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// "Take Me Out (Moore- mix)" flavored original — bright ballpark organ. C major.
const M_TITLE = [
  60, 0, 64, 0, 67, 0, 72, 0, 71, 0, 67, 0, 69, 0, 0, 0,
  62, 0, 65, 0, 69, 0, 74, 0, 72, 0, 67, 0, 64, 0, 0, 0,
  60, 64, 67, 72, 76, 72, 67, 64, 65, 0, 69, 0, 67, 0, 0, 0,
  59, 0, 62, 0, 67, 0, 65, 0, 64, 0, 60, 0, 0, 0, 0, 0,
];
const B_TITLE = [36, 43, 40, 43, 41, 48, 45, 43];

// between-innings jingle — short organ run
const M_JINGLE = [67, 72, 76, 79, 76, 72, 67, 0];
const B_JINGLE = [48, 48, 43, 43];

// charge! fanfare motif
const M_CHARGE = [60, 60, 60, 64, 67];

// trophy theme — triumphant C major
const M_TROPHY = [
  60, 0, 64, 0, 67, 0, 72, 0, 71, 67, 69, 71, 72, 0, 0, 0,
  65, 0, 69, 0, 72, 0, 76, 0, 74, 72, 67, 64, 60, 0, 0, 0,
];
const B_TROPHY = [36, 36, 41, 43, 48, 43, 41, 43];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.15, lead: 'square', bassType: 'triangle', drums: true, bassPer: 4 },
  trophy: { melody: M_TROPHY, bass: B_TROPHY, stepDur: 0.16, lead: 'square', bassType: 'triangle', drums: false, bassPer: 2 },
};

export class Sound {
  constructor() {
    this.ctx = null; this.muted = false; this.track = null;
    this.step = 0; this.nextTime = 0; this.trackName = null;
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.26;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.master);
      this.initCrowd();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.26;
    return this.muted;
  }
  tone(type, f0, f1, dur, vol = 1, when = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 1, freq = 4000, when = 0, dest = null, q = 0.7) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ---- crowd bed ----
  initCrowd() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); let v = 0;
    for (let i = 0; i < len; i++) { v = v * 0.98 + (Math.random() * 2 - 1) * 0.25; d[i] = v; }
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 620; f.Q.value = 0.5;
    this.crowdGain = this.ctx.createGain(); this.crowdGain.gain.value = 0;
    src.connect(f).connect(this.crowdGain).connect(this.master); src.start();
  }
  setCrowd(level) {
    if (!this.crowdGain) return;
    const cur = this.crowdGain.gain.value;
    this.crowdGain.gain.value = cur + (level * 0.4 - cur) * 0.05;
  }
  roar(intensity = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, dur = 1.0 + intensity * 0.9;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); let v = 0;
    for (let i = 0; i < len; i++) { v = v * 0.97 + (Math.random() * 2 - 1) * 0.3; d[i] = v; }
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 820; f.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * intensity, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master); src.start(t); src.stop(t + dur + 0.02);
  }

  // ---- music ----
  playMusic(name) {
    if (this.trackName === name) return;
    this.trackName = name; this.track = TRACKS[name] || null; this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.06;
  }
  stopMusic() { this.track = null; this.trackName = null; }
  update() {
    if (!this.ctx || !this.track || this.muted) return;
    const tr = this.track;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const i = this.step % tr.melody.length;
      const when = this.nextTime - this.ctx.currentTime;
      const m = tr.melody[i];
      if (m) {
        this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.95, 0.30, when, this.musicGain);
        this.tone('triangle', midi(m) / 2, 0, tr.stepDur * 0.9, 0.16, when, this.musicGain); // organ sub
      }
      const per = tr.bassPer || 4;
      if (i % per === 0) {
        const b = tr.bass[Math.floor(this.step / per) % tr.bass.length];
        if (b) this.tone(tr.bassType, midi(b), 0, tr.stepDur * per * 0.9, 0.5, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.tone('sine', 110, 45, 0.1, 0.6, when, this.musicGain);
        if (i % 8 === 4) this.noise(0.06, 0.25, 2000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur; this.step++;
    }
  }

  // ---- sfx ----
  crack(power = 1) { // bat on ball: sharp noise burst + tonal knock
    this.noise(0.05, 0.5 + power * 0.3, 2600, 0, null, 1.2);
    this.tone('square', 340, 180, 0.05, 0.35 + power * 0.2);
  }
  foulTick() { this.noise(0.04, 0.3, 3200, 0, null, 1.0); this.tone('square', 500, 400, 0.03, 0.15); }
  bunt() { this.noise(0.05, 0.3, 1200, 0, null, 0.8); this.tone('sine', 260, 200, 0.06, 0.2); }
  catchThump() { this.tone('sine', 200, 90, 0.09, 0.4); this.noise(0.05, 0.25, 900, 0, null, 0.6); }
  glovePop() { this.noise(0.04, 0.3, 1600, 0, null, 0.9); this.tone('square', 420, 300, 0.03, 0.15); }
  pitchWhoosh() { this.noise(0.12, 0.16, 1400, 0, null, 0.5); }
  swingWhiff() { this.noise(0.09, 0.22, 1800, 0, null, 0.6); }
  // umpire calls — synth "voice-ish" blips
  strikeCall() { this.tone('square', 300, 620, 0.08, 0.3); this.tone('square', 640, 300, 0.14, 0.3, 0.09); }
  ballCall() { this.tone('square', 400, 300, 0.13, 0.28); }
  outCall() { this.tone('square', 520, 200, 0.18, 0.32); this.tone('square', 240, 180, 0.12, 0.25, 0.12); }
  safeCall() { this.tone('square', 300, 500, 0.1, 0.3); this.tone('square', 500, 520, 0.14, 0.3, 0.09); }
  charge() { // organ "CHARGE!" then the yell
    M_CHARGE.forEach((m, i) => {
      this.tone('square', midi(m), 0, 0.13, 0.34, i * 0.11);
      this.tone('triangle', midi(m) / 2, 0, 0.13, 0.2, i * 0.11);
    });
    this.roar(0.6);
  }
  jingle() {
    M_JINGLE.forEach((m, i) => { if (m) this.tone('square', midi(m), 0, 0.12, 0.3, i * 0.1); });
    B_JINGLE.forEach((m, i) => this.tone('triangle', midi(m), 0, 0.2, 0.3, i * 0.2));
  }
  hrFanfare() {
    [60, 64, 67, 72, 76, 72, 76, 79].forEach((m, i) => {
      this.tone('square', midi(m), 0, 0.18, 0.36, i * 0.13);
      this.tone('square', midi(m) * 1.005, 0, 0.18, 0.2, i * 0.13 + 0.01);
    });
    this.roar(1.2);
  }
  firework() { this.noise(0.25, 0.3, 1200 + Math.random() * 2000, 0, null, 0.4); this.tone('sine', 1400, 400, 0.2, 0.2); }
  coin() { this.tone('square', 990, 0, 0.05, 0.3); this.tone('square', 1320, 0, 0.12, 0.3, 0.06); }
  cash() { [1320, 1100, 1470, 1760].forEach((f, i) => this.tone('square', f, 0, 0.06, 0.25, i * 0.05)); }
  menuMove() { this.tone('square', 700, 0, 0.04, 0.2); }
  menuSel() { this.tone('square', 620, 940, 0.09, 0.26); }
  denied() { this.tone('square', 220, 170, 0.15, 0.3); }
  levelUp() { [660, 880, 1100, 1320].forEach((f, i) => this.tone('square', f, 0, 0.07, 0.28, i * 0.06)); }
}
