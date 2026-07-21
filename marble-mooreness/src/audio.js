// audio.js — all-synthesized WebAudio. Quirky, bouncy electronic course themes
// (original), a continuous rolling rumble that rises with speed, plus launch,
// fall, splat, bump, checkpoint, goal, time-tick and game-over SFX. M mutes.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- original bouncy course tunes (eighth notes, 0 = rest) ----
const M_TITLE = [
  64, 0, 64, 66, 68, 0, 66, 64, 71, 0, 0, 68, 66, 0, 64, 0,
  62, 0, 62, 64, 66, 0, 64, 62, 69, 0, 66, 0, 64, 0, 0, 0,
];
const B_TITLE = [40, 0, 47, 0, 45, 0, 47, 0, 38, 0, 45, 0, 43, 0, 47, 0];

// "A" — springy, comic, hopping about. C major-ish.
const M_A = [
  72, 0, 67, 72, 76, 0, 72, 67, 74, 0, 69, 74, 77, 0, 74, 69,
  72, 0, 67, 72, 76, 79, 76, 72, 71, 0, 67, 64, 67, 0, 0, 0,
  69, 0, 64, 69, 72, 0, 69, 64, 71, 0, 67, 71, 74, 0, 71, 67,
  72, 76, 79, 76, 72, 67, 64, 67, 72, 0, 0, 0, 72, 0, 0, 0,
];
const B_A = [48, 55, 48, 55, 53, 60, 53, 60, 50, 57, 50, 57, 55, 55, 52, 52];

// "B" — wonky, off-kilter, slightly sinister. A dorian.
const M_B = [
  69, 0, 72, 0, 76, 74, 72, 69, 67, 0, 69, 72, 74, 0, 72, 0,
  77, 0, 76, 74, 72, 0, 69, 67, 69, 0, 72, 0, 74, 76, 77, 0,
  81, 0, 79, 77, 76, 0, 74, 72, 74, 0, 76, 74, 72, 0, 69, 0,
  67, 69, 72, 74, 76, 74, 72, 69, 69, 0, 0, 0, 69, 0, 0, 0,
];
const B_B = [45, 52, 45, 52, 43, 50, 43, 50, 48, 55, 48, 55, 45, 45, 40, 40];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.14, lead: 'square' },
  a: { melody: M_A, bass: B_A, stepDur: 0.125, lead: 'square' },
  b: { melody: M_B, bass: B_B, stepDur: 0.13, lead: 'triangle' },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.trackName = null;
    this.step = 0;
    this.nextTime = 0;
    this.jingleUntil = 0;
    this.roll = null;
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.master);
      this._buildRoll();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  // ---- continuous rolling rumble ----
  _buildRoll() {
    const len = Math.floor(this.ctx.sampleRate * 1.0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 240; flt.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(flt).connect(g).connect(this.master);
    src.start();
    this.roll = { flt, gain: g };
  }
  // speed 0..1 -> louder + higher rumble
  setRoll(speed) {
    if (!this.roll || !this.ctx) return;
    const s = Math.max(0, Math.min(1, speed));
    const t = this.ctx.currentTime;
    this.roll.gain.gain.setTargetAtTime(this.muted ? 0 : s * 0.22, t, 0.05);
    this.roll.flt.frequency.setTargetAtTime(180 + s * 520, t, 0.05);
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

  playMusic(name) {
    if (this.trackName === name) return;
    this.trackName = name;
    this.track = TRACKS[name] || null;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.06;
  }
  stopMusic() { this.track = null; this.trackName = null; }

  updateMusic() {
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
      if (m) {
        this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.9, 0.42, when, this.musicGain);
        this.tone(tr.lead, midi(m) * 1.006, 0, tr.stepDur * 0.9, 0.16, when + 0.005, this.musicGain);
      }
      if (i % 2 === 0) {
        const b = tr.bass[(this.step >> 1) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 1.8, 0.55, when, this.musicGain);
      }
      // bouncy hats
      if (i % 4 === 0) this.noise(0.04, 0.22, 1200, when, this.musicGain);
      else if (i % 2 === 1) this.noise(0.02, 0.10, 7000, when, this.musicGain);
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // ---- SFX ----
  launch() { this.tone('sawtooth', 300, 1200, 0.22, 0.3); this.noise(0.18, 0.2, 3000); }
  land() { this.noise(0.05, 0.22, 500); this.tone('square', 200, 90, 0.06, 0.16); }
  fall() { this.tone('sawtooth', 700, 40, 0.7, 0.42); this.noise(0.5, 0.25, 500); }
  splat() { this.tone('triangle', 320, 70, 0.28, 0.4); this.noise(0.2, 0.35, 900); }
  bump() { this.tone('square', 180, 90, 0.08, 0.3); this.noise(0.05, 0.2, 700); }
  checkpoint() { [72, 76, 79].forEach((m, i) => this.tone('square', midi(m), 0, 0.12, 0.35, i * 0.08)); }
  tick() { this.tone('square', 1400, 0, 0.04, 0.28); }
  select() { this.tone('square', 660, 990, 0.06, 0.3); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }

  goal() {
    const seq = [67, 72, 76, 79, 84, 0, 79, 84];
    seq.forEach((m, i) => {
      if (m) { this.tone('square', midi(m), 0, 0.16, 0.42, i * 0.12); this.tone('square', midi(m) * 1.005, 0, 0.16, 0.2, i * 0.12 + 0.02); }
    });
    if (this.ctx) this.jingleUntil = this.ctx.currentTime + seq.length * 0.12 + 0.4;
  }
  win() {
    const seq = [60, 64, 67, 72, 76, 79, 84, 0, 84, 88];
    seq.forEach((m, i) => { if (m) this.tone('square', midi(m), 0, 0.2, 0.4, i * 0.16); });
    if (this.ctx) this.jingleUntil = this.ctx.currentTime + seq.length * 0.16 + 0.5;
  }
  gameover() {
    [67, 64, 60, 55].forEach((m, i) => this.tone('sawtooth', midi(m), midi(m - 2), 0.35, 0.4, i * 0.22));
    if (this.ctx) this.jingleUntil = this.ctx.currentTime + 1.2;
  }
}
