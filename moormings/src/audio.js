// Moormings audio — all-synthesized WebAudio. Two original jaunty loops in a
// cheerful Amiga-tracker mood (no Lemmings melodies), plus chirpy sfx.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// "Moor the Merrier" — bouncing C major strut. Eighth notes, 0 = rest.
const M_MERRIER = [
  60, 0, 64, 0, 67, 0, 64, 0,
  60, 0, 64, 67, 72, 0, 67, 0,
  65, 0, 69, 0, 72, 0, 69, 65,
  67, 0, 64, 0, 60, 0, 0, 0,
  60, 0, 64, 0, 67, 0, 64, 0,
  62, 0, 65, 69, 74, 0, 71, 0,
  72, 71, 69, 67, 65, 64, 62, 65,
  64, 0, 60, 0, 60, 0, 0, 0,
];
const B_MERRIER = [48, 48, 43, 43, 53, 53, 48, 48, 48, 48, 50, 50, 55, 43, 48, 48];

// "Green and Pleasant" — skipping G major jig.
const M_PLEASANT = [
  67, 0, 71, 74, 71, 0, 67, 0,
  69, 0, 72, 76, 72, 0, 69, 0,
  67, 0, 71, 74, 79, 0, 78, 76,
  74, 0, 71, 0, 67, 0, 0, 0,
  72, 0, 76, 79, 76, 0, 72, 0,
  71, 0, 74, 78, 74, 0, 71, 0,
  79, 78, 76, 74, 72, 71, 69, 71,
  67, 0, 67, 0, 67, 0, 0, 0,
];
const B_PLEASANT = [43, 43, 47, 47, 48, 48, 43, 43, 45, 45, 48, 48, 50, 50, 43, 43];

const TRACKS = {
  tune1: { melody: M_MERRIER, bass: B_MERRIER, stepDur: 0.145, lead: 'square' },
  tune2: { melody: M_PLEASANT, bass: B_PLEASANT, stepDur: 0.135, lead: 'square' },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.trackName = null;
    this.step = 0;
    this.nextTime = 0;
    this.lastChip = 0;
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.master);
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

  noise(dur, vol = 1, freq = 4000, when = 0) {
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
    if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      const i = this.step % tr.melody.length;
      const when = this.nextTime - this.ctx.currentTime;
      const m = tr.melody[i];
      if (m) this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.9, 0.42, when, this.musicGain);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.2, 0.6, when, this.musicGain);
      }
      if (i % 8 === 4) this.noise(0.03, 0.12, 6000, when);
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // ---- sfx ----
  letsgo() { [72, 76, 79, 84].forEach((m, i) => this.tone('square', midi(m), 0, 0.07, 0.3, i * 0.055)); }
  spawnBlip() { this.tone('square', 900, 1400, 0.06, 0.2); }
  pop() { this.tone('square', 500, 900, 0.05, 0.3); this.tone('square', 1000, 1600, 0.05, 0.22, 0.04); }
  deny() { this.tone('square', 300, 200, 0.09, 0.25); }
  ohno() { this.tone('square', 600, 420, 0.12, 0.35); this.tone('square', 480, 320, 0.14, 0.35, 0.13); }
  boom() { this.noise(0.25, 0.5, 600); this.tone('square', 180, 35, 0.25, 0.4); }
  splat() { this.noise(0.09, 0.4, 900); this.tone('triangle', 250, 60, 0.12, 0.35); }
  drown() { this.noise(0.18, 0.3, 1200); this.tone('triangle', 500, 150, 0.2, 0.25); }
  yippee() { [79, 84, 88, 91].forEach((m, i) => this.tone('square', midi(m), 0, 0.06, 0.28, i * 0.045)); }
  clink() { this.tone('square', 2200, 1800, 0.06, 0.3); this.tone('square', 3100, 2600, 0.04, 0.18, 0.02); }
  chip() {
    if (!this.ctx || this.ctx.currentTime - this.lastChip < 0.09) return;
    this.lastChip = this.ctx.currentTime;
    this.noise(0.025, 0.12, 2200);
  }
  brick() { this.tone('square', 700, 750, 0.04, 0.16); }
  shrug() { this.tone('square', 520, 380, 0.1, 0.2); }
  brolly() { this.tone('triangle', 350, 700, 0.12, 0.2); }
  tick() { this.tone('square', 1600, 0, 0.03, 0.3); }
  uiClick() { this.tone('square', 1100, 0, 0.03, 0.2); }
  winJingle() { [72, 76, 79, 84, 0, 83, 84].forEach((m, i) => { if (m) this.tone('square', midi(m), 0, 0.12, 0.35, i * 0.1); }); }
  loseJingle() { [64, 60, 57, 52].forEach((m, i) => this.tone('square', midi(m), 0, 0.16, 0.35, i * 0.14)); }
}
