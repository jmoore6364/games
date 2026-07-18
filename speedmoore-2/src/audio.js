// Speedmoore 2 — all-synthesized WebAudio: metallic arena sfx, crowd noise
// bed, and original Amiga-flavoured industrial-funk loops.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest) ----

// "Chrome Anthem" — title screen. Big, metallic, swaggering. E minor.
const M_TITLE = [
  64, 0, 0, 64, 62, 0, 64, 0,
  67, 0, 64, 0, 62, 0, 59, 0,
  64, 0, 0, 64, 62, 0, 64, 0,
  71, 0, 69, 0, 67, 0, 64, 0,
  72, 0, 71, 0, 69, 0, 67, 0,
  69, 0, 67, 0, 64, 0, 62, 0,
  64, 67, 71, 74, 71, 67, 64, 62,
  64, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [28, 28, 0, 28, 31, 0, 28, 26, 28, 28, 0, 28, 24, 24, 26, 26];

// "Steel Groove" — match loop. Driving industrial funk, E minor.
// Bass walks and snaps; the lead is a cold Amiga arpeggio.
const M_MATCH = [
  52, 55, 59, 64, 59, 55, 52, 55,
  50, 54, 57, 62, 57, 54, 50, 54,
  52, 55, 59, 64, 59, 55, 52, 55,
  55, 59, 62, 67, 62, 59, 55, 52,
  52, 55, 59, 64, 59, 55, 52, 55,
  50, 54, 57, 62, 57, 54, 50, 54,
  48, 52, 55, 60, 55, 52, 48, 52,
  50, 54, 57, 62, 64, 62, 59, 55,
];
const B_MATCH = [
  28, 0, 28, 40, 0, 28, 31, 0,
  26, 0, 26, 38, 0, 26, 29, 0,
  28, 0, 28, 40, 0, 28, 33, 31,
  24, 0, 24, 36, 0, 26, 28, 31,
];

// "Podium Chrome" — trophy ceremony. Triumphant. C major.
const M_TROPHY = [
  60, 0, 64, 0, 67, 0, 72, 0,
  71, 0, 67, 0, 69, 0, 71, 0,
  72, 0, 67, 64, 65, 0, 64, 62,
  60, 0, 62, 64, 67, 0, 0, 0,
];
const B_TROPHY = [36, 36, 41, 41, 43, 43, 36, 36];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.14, lead: 'square', bassType: 'sawtooth', drums: true },
  match: { melody: M_MATCH, bass: B_MATCH, stepDur: 0.115, lead: 'square', bassType: 'sawtooth', drums: true, bassPerStep: 2 },
  trophy: { melody: M_TROPHY, bass: B_TROPHY, stepDur: 0.16, lead: 'square', bassType: 'triangle', drums: false },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.crowdTarget = 0;
    this.lastKlaxon = 0;
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.42;
      this.musicGain.connect(this.master);
      this.initCrowd();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
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

  noise(dur, vol = 1, freq = 4000, when = 0, dest = null, q = 0.7) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ---- crowd: a looping filtered-noise bed whose level follows the action ----
  initCrowd() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v = v * 0.98 + (Math.random() * 2 - 1) * 0.25; // brownish murmur
      d[i] = v;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5;
    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0;
    src.connect(f).connect(this.crowdGain).connect(this.master);
    src.start();
  }

  // level 0..1, call every frame during a match
  setCrowd(level) {
    this.crowdTarget = level;
    if (!this.crowdGain) return;
    const cur = this.crowdGain.gain.value;
    this.crowdGain.gain.value = cur + (level * 0.5 - cur) * 0.04;
  }

  // one-shot swell on top of the bed (big hits, goals)
  roar(intensity = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = 1.1 + intensity * 0.8;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) { v = v * 0.97 + (Math.random() * 2 - 1) * 0.3; d[i] = v; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * intensity, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
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

  updateMusic() {
    if (!this.ctx || !this.track || this.muted) return;
    const tr = this.track;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      const i = this.step % tr.melody.length;
      const when = this.nextTime - this.ctx.currentTime;
      const m = tr.melody[i];
      if (m) {
        this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.9, 0.34, when, this.musicGain);
        // cold chorus detune — the Amiga shimmer
        this.tone(tr.lead, midi(m) * 1.006, 0, tr.stepDur * 0.9, 0.17, when + 0.01, this.musicGain);
      }
      const per = tr.bassPerStep || 4;
      if (i % per === 0) {
        const b = tr.bass[Math.floor(this.step / per) % tr.bass.length];
        if (b) this.tone(tr.bassType, midi(b), 0, tr.stepDur * per * 0.85, 0.6, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) { this.tone('sine', 120, 40, 0.1, 0.7, when, this.musicGain); }
        if (i % 8 === 4) this.noise(0.07, 0.3, 1800, when, this.musicGain);
        if (i % 2 === 1) this.noise(0.02, 0.12, 8000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // ---- sfx ----
  // ball on wall: metallic clang — two detuned high partials + ring
  clang(hard = 1) {
    const v = 0.2 + 0.25 * Math.min(1, hard);
    this.tone('square', 2100, 1400, 0.09, v);
    this.tone('triangle', 3170, 2300, 0.14, v * 0.7, 0.005);
    this.noise(0.04, v * 0.5, 5200);
  }
  bumper() {
    this.tone('square', 900, 1800, 0.09, 0.35);
    this.tone('triangle', 2400, 3200, 0.12, 0.25, 0.02);
    this.noise(0.05, 0.2, 4000);
  }
  whoosh(power = 0.5) {
    this.noise(0.16 + power * 0.12, 0.3 + power * 0.25, 1500 + power * 1200, 0, null, 0.4);
  }
  pass() { this.noise(0.1, 0.22, 2000, 0, null, 0.5); this.tone('triangle', 500, 700, 0.06, 0.15); }
  crunch(brutal = false) {
    this.noise(0.12, 0.55, 900, 0, null, 0.4);
    this.tone('sine', 120, 45, 0.18, 0.6, 0.01);
    if (brutal) { this.noise(0.2, 0.5, 500, 0.05, null, 0.4); this.tone('sawtooth', 90, 30, 0.3, 0.5, 0.06); }
  }
  pickup() { this.tone('square', 620, 880, 0.05, 0.2); }
  slideSfx() { this.noise(0.12, 0.2, 900, 0, null, 0.4); }
  klaxon() {
    this.lastKlaxon = Date.now();
    for (let i = 0; i < 3; i++) {
      this.tone('sawtooth', 392, 0, 0.24, 0.5, i * 0.32);
      this.tone('sawtooth', 311, 0, 0.24, 0.5, i * 0.32 + 0.16);
    }
  }
  whistle() {
    this.tone('square', 2350, 2250, 0.14, 0.3);
    this.tone('square', 2350, 2280, 0.3, 0.3, 0.18);
  }
  starDing() {
    this.tone('square', 1320, 0, 0.09, 0.3);
    this.tone('square', 1980, 0, 0.14, 0.3, 0.07);
  }
  powerup() { [880, 1100, 1470].forEach((f, i) => this.tone('square', f, 0, 0.07, 0.3, i * 0.06)); }
  coin() { this.tone('square', 990, 0, 0.05, 0.3); this.tone('square', 1320, 0, 0.12, 0.3, 0.06); }
  freeze() { this.tone('sawtooth', 1800, 200, 0.4, 0.3); this.noise(0.3, 0.2, 6000); }
  switchTick() { this.tone('square', 1500, 0, 0.03, 0.12); }
  menuMove() { this.tone('square', 800, 0, 0.04, 0.2); }
  menuSel() { this.tone('square', 660, 990, 0.08, 0.25); }
  denied() { this.tone('square', 220, 180, 0.15, 0.3); }
  cash() { [1320, 1100, 1470, 1760].forEach((f, i) => this.tone('square', f, 0, 0.06, 0.25, i * 0.05)); }
  fanfare() {
    [60, 64, 67, 72, 0, 71, 72, 76].forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.16, 0.4, i * 0.14);
        this.tone('square', midi(m) * 1.005, 0, 0.16, 0.25, i * 0.14 + 0.02);
      }
    });
  }
}
