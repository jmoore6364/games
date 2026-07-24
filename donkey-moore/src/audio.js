// audio.js — fully synthesized WebAudio. Intro march, jump/point/hammer/death
// SFX, and a continuous barrel-rumble that rises with the number of barrels.
// M toggles mute.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// little intro march (eighth notes; 0 = rest)
const INTRO = [
  48, 0, 52, 0, 55, 0, 60, 0, 55, 0, 60, 0, 64, 0, 0, 0,
  53, 0, 57, 0, 60, 0, 65, 0, 55, 0, 59, 0, 62, 0, 67, 0,
];
// bouncy gameplay loop
const PLAY_MEL = [
  72, 0, 76, 79, 72, 0, 76, 0, 74, 0, 77, 81, 74, 0, 77, 0,
  71, 0, 74, 79, 71, 0, 74, 0, 72, 76, 79, 76, 72, 0, 0, 0,
];
const PLAY_BASS = [36, 0, 43, 0, 36, 0, 43, 0, 38, 0, 45, 0, 41, 0, 43, 0];

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.roll = null;
    this.music = null;      // { name, step, next }
    this.stepDur = 0.15;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.28;
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
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.28;
    return this.muted;
  }

  _now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone(freq, dur, type = 'square', vol = 0.3, slideTo = null) {
    if (!this.ctx) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.3, filterFreq = 1200) {
    if (!this.ctx) return;
    const t = this._now();
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t);
  }

  jump() { this.tone(320, 0.18, 'square', 0.25, 640); }
  point() { this.tone(880, 0.08, 'square', 0.3); setTimeout(() => this.tone(1320, 0.1, 'square', 0.3), 70); }
  hammerHit() { this.noise(0.12, 0.4, 900); this.tone(180, 0.1, 'sawtooth', 0.25, 90); }
  hammerGet() { for (let i = 0; i < 4; i++) setTimeout(() => this.tone(midi(72 + i * 3), 0.09, 'square', 0.3), i * 60); }
  climb() { this.tone(520, 0.04, 'square', 0.12); }
  death() {
    const seq = [64, 60, 57, 53, 48, 44];
    seq.forEach((m, i) => setTimeout(() => this.tone(midi(m), 0.16, 'triangle', 0.3, midi(m) * 0.9), i * 130));
  }
  win() {
    const seq = [60, 64, 67, 72, 76, 79, 84];
    seq.forEach((m, i) => setTimeout(() => this.tone(midi(m), 0.14, 'square', 0.32), i * 110));
  }
  bonusTick() { this.tone(1200, 0.03, 'square', 0.12); }

  // ---- continuous barrel rumble ----
  _buildRoll() {
    const n = Math.floor(this.ctx.sampleRate * 1.0);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 120; f.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start();
    this.roll = { gain: g, filter: f };
  }
  setRumble(level) { // level 0..1
    if (!this.roll) return;
    const t = this._now();
    this.roll.gain.gain.setTargetAtTime(Math.min(0.18, level * 0.18), t, 0.1);
    this.roll.filter.frequency.setTargetAtTime(90 + level * 90, t, 0.1);
  }

  // ---- music sequencer ----
  playMusic(name) {
    if (!this.ctx) return;
    this.music = { name, step: 0, next: this._now() + 0.05 };
    this.stepDur = name === 'intro' ? 0.16 : 0.135;
  }
  stopMusic() { this.music = null; }
  updateMusic() {
    if (!this.music || !this.ctx) return;
    const m = this.music;
    while (this._now() + 0.1 >= m.next) {
      const mel = m.name === 'intro' ? INTRO : PLAY_MEL;
      const bass = m.name === 'intro' ? null : PLAY_BASS;
      const note = mel[m.step % mel.length];
      if (note) this._seqNote(midi(note), this.stepDur * 0.9, 'square', 0.14, m.next);
      if (bass) { const bn = bass[m.step % bass.length]; if (bn) this._seqNote(midi(bn), this.stepDur * 0.9, 'triangle', 0.12, m.next); }
      m.step++;
      m.next += this.stepDur;
      if (m.name === 'intro' && m.step >= INTRO.length) { this.music = null; break; }
    }
  }
  _seqNote(freq, dur, type, vol, when) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(when); o.stop(when + dur + 0.02);
  }
}
