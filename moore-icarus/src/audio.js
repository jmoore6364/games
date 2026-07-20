// All-synthesized chiptune. Bright, heroic 8-bit themes in the spirit of a
// classic winged-hero adventure. Every melody is an original composition.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi notes, 0 = rest, eighth notes) ----

// "Wings of Moore" — title, triumphant and bright. C major.
const M_TITLE = [
  72, 0, 76, 0, 79, 0, 76, 72,
  74, 0, 77, 0, 81, 0, 79, 77,
  76, 0, 79, 0, 84, 0, 83, 81,
  79, 0, 77, 0, 76, 0, 0, 0,
  72, 0, 76, 0, 79, 0, 76, 79,
  81, 0, 79, 77, 76, 0, 74, 72,
  74, 76, 77, 79, 81, 83, 84, 86,
  84, 0, 79, 0, 72, 0, 0, 0,
];
const B_TITLE = [48, 48, 55, 55, 53, 53, 55, 55, 50, 50, 57, 57, 55, 52, 48, 48];

// "The Long Climb" — vertical ascent, steady and hopeful. G major.
const M_CLIMB = [
  67, 0, 71, 74, 79, 0, 74, 71,
  69, 0, 72, 76, 79, 0, 76, 72,
  67, 0, 71, 74, 79, 74, 71, 74,
  71, 0, 69, 0, 67, 0, 0, 0,
  74, 0, 79, 0, 83, 0, 79, 74,
  76, 0, 81, 0, 84, 0, 81, 76,
  79, 81, 83, 84, 86, 84, 83, 81,
  79, 0, 74, 0, 67, 0, 0, 0,
];
const B_CLIMB = [43, 43, 50, 50, 47, 47, 50, 50, 45, 45, 52, 52, 50, 47, 43, 43];

// "Sky Roads" — overworld / horizontal, jaunty. D major.
const M_SKY = [
  74, 74, 78, 0, 81, 0, 78, 74,
  76, 76, 79, 0, 83, 0, 79, 76,
  74, 78, 81, 86, 85, 83, 81, 78,
  76, 0, 74, 0, 73, 0, 74, 0,
  81, 0, 83, 81, 78, 0, 81, 78,
  74, 0, 78, 74, 71, 0, 74, 78,
  81, 83, 85, 86, 88, 86, 83, 81,
  78, 0, 74, 0, 74, 0, 0, 0,
];
const B_SKY = [50, 50, 57, 57, 55, 55, 57, 57, 52, 52, 59, 57, 55, 52, 50, 50];

// "Fortress of Dread" — the maze, tense minor. A minor.
const M_FORT = [
  57, 0, 60, 0, 64, 0, 60, 57,
  56, 0, 59, 0, 62, 0, 59, 56,
  57, 0, 60, 64, 65, 64, 60, 57,
  59, 0, 57, 0, 56, 0, 0, 0,
  64, 0, 65, 64, 67, 0, 65, 64,
  60, 0, 62, 60, 64, 0, 60, 57,
  56, 57, 59, 60, 62, 60, 59, 56,
  57, 0, 57, 0, 0, 0, 0, 0,
];
const B_FORT = [45, 45, 45, 45, 44, 44, 44, 44, 45, 45, 48, 48, 40, 40, 45, 45];

// "The Reaper Wakes" — boss battle, all menace. E minor.
const M_BOSS = [
  64, 64, 67, 64, 71, 70, 67, 64,
  64, 64, 67, 64, 72, 0, 71, 67,
  64, 64, 67, 64, 71, 70, 67, 64,
  63, 65, 67, 69, 71, 0, 70, 67,
  74, 0, 71, 67, 74, 0, 71, 67,
  72, 0, 69, 65, 72, 0, 69, 65,
  71, 70, 67, 65, 64, 65, 67, 69,
  71, 0, 67, 0, 64, 0, 0, 0,
];
const B_BOSS = [40, 40, 40, 39, 40, 40, 40, 38, 40, 40, 40, 39, 35, 36, 38, 40];

// "Palace of Moora" — ending, radiant. F major.
const M_END = [
  77, 0, 81, 84, 89, 0, 88, 84,
  86, 0, 82, 86, 91, 0, 89, 0,
  77, 0, 81, 84, 89, 91, 93, 94,
  96, 0, 93, 0, 91, 0, 89, 0,
  82, 86, 89, 93, 94, 93, 91, 89,
  84, 88, 91, 94, 96, 0, 93, 91,
  89, 91, 93, 94, 96, 94, 93, 91,
  94, 0, 91, 0, 89, 0, 0, 0,
];
const B_END = [53, 53, 57, 57, 58, 58, 60, 60, 53, 53, 58, 58, 60, 58, 53, 53];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.15, lead: 'square', drums: true },
  climb: { melody: M_CLIMB, bass: B_CLIMB, stepDur: 0.14, lead: 'square', drums: true },
  sky: { melody: M_SKY, bass: B_SKY, stepDur: 0.13, lead: 'square', drums: true },
  fort: { melody: M_FORT, bass: B_FORT, stepDur: 0.135, lead: 'triangle', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.11, lead: 'square', drums: true },
  ending: { melody: M_END, bass: B_END, stepDur: 0.15, lead: 'square', drums: false },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.jingleUntil = 0;
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
      if (m) this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.92, 0.42, when, this.musicGain);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.4, 0.6, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.28, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.14, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // ---- jingles ----
  shopJingle() {
    if (!this.ctx) return;
    const seq = [72, 76, 79, 84, 0, 81, 84, 88];
    seq.forEach((m, i) => { if (m) this.tone('square', midi(m), 0, 0.13, 0.4, i * 0.11); });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.11 + 0.3;
  }

  fanfare() {
    if (!this.ctx) return;
    const seq = [67, 72, 76, 79, 84, 0, 88, 91];
    seq.forEach((m, i) => {
      if (m) { this.tone('square', midi(m), 0, 0.15, 0.45, i * 0.12); this.tone('square', midi(m) * 1.005, 0, 0.15, 0.25, i * 0.12 + 0.02); }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.12 + 0.4;
  }

  clearJingle() {
    if (!this.ctx) return;
    const seq = [67, 71, 74, 79, 0, 78, 79, 0, 84];
    seq.forEach((m, i) => { if (m) this.tone('square', midi(m), 0, 0.15, 0.45, i * 0.13); });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.13 + 0.4;
  }

  // ---- sfx ----
  shoot() { this.tone('square', 900, 1500, 0.06, 0.2); }
  shootBig() { this.tone('square', 700, 1400, 0.09, 0.26); this.tone('triangle', 500, 900, 0.08, 0.15); }
  ehit() { this.noise(0.04, 0.28, 1600); }
  pop() { this.tone('triangle', 500, 120, 0.1, 0.28); this.noise(0.06, 0.2, 1200); }
  heart() { this.tone('square', 780, 1180, 0.07, 0.28); this.tone('square', 1180, 1560, 0.08, 0.2, 0.06); }
  jump() { this.tone('square', 300, 560, 0.08, 0.14); }
  land() { this.noise(0.03, 0.14, 400); }
  hurt() { this.tone('sawtooth', 320, 90, 0.18, 0.35); this.noise(0.08, 0.2, 500); }
  die() { this.tone('sawtooth', 440, 60, 0.55, 0.45); this.noise(0.3, 0.32, 500); }
  spring() { this.tone('triangle', 400, 1200, 0.2, 0.3); }
  door() { this.tone('square', 500, 300, 0.12, 0.22); }
  key() { this.tone('square', 1000, 1500, 0.06, 0.28); this.tone('square', 1500, 2000, 0.08, 0.2, 0.07); }
  buy() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.09, 0.3, 0.07); }
  deny() { this.tone('square', 300, 200, 0.12, 0.28); }
  eggplant() {
    // wobbly descending curse sting
    for (let i = 0; i < 5; i++) this.tone('sawtooth', 500 - i * 60, 300 - i * 40, 0.14, 0.22, i * 0.09);
    this.tone('triangle', 200, 120, 0.5, 0.2, 0.1);
  }
  cure() { [72, 76, 79, 84].forEach((m, i) => this.tone('square', midi(m), 0, 0.1, 0.3, i * 0.09)); }
  reaper() { this.tone('sawtooth', 180, 70, 0.5, 0.4); this.noise(0.35, 0.25, 350); }
  bossHit() { this.noise(0.06, 0.32, 900); this.tone('square', 200, 120, 0.08, 0.2); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.45, 520 - i * 60, i * 0.12);
    this.tone('sawtooth', 240, 30, 0.9, 0.45, 0.1);
  }
  oneUp() { [660, 880, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.08)); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.22); this.tone('square', 700, 0, 0.05, 0.22, 0.08); }
}
