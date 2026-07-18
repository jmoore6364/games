// All-synthesized chiptune audio. Every track is an original composition
// in an urgent, minor-key 8-bit ninja-action style (no Tecmo melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Moonlit Blade" — title screen, a vow under the moon. A minor.
const M_TITLE = [
  57, 0, 0, 57, 0, 0, 60, 0,
  64, 0, 0, 62, 60, 0, 62, 0,
  57, 0, 0, 57, 0, 0, 60, 0,
  65, 0, 64, 62, 64, 0, 0, 0,
  69, 0, 67, 65, 64, 0, 62, 60,
  62, 0, 64, 62, 60, 0, 59, 0,
  57, 0, 0, 60, 59, 0, 56, 0,
  57, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [45, 45, 45, 44, 43, 43, 41, 41, 45, 45, 45, 44, 40, 40, 44, 44];

// "Neon Gauntlet" — city streets at night, full sprint. E minor.
const M_CITY = [
  64, 0, 64, 67, 69, 0, 67, 64,
  71, 0, 69, 67, 69, 67, 64, 0,
  64, 0, 64, 67, 69, 0, 71, 72,
  74, 0, 72, 71, 72, 71, 69, 0,
  76, 0, 74, 72, 71, 0, 72, 74,
  76, 74, 72, 71, 69, 0, 67, 69,
  71, 69, 67, 64, 62, 64, 67, 69,
  71, 72, 71, 67, 64, 0, 0, 0,
];
const B_CITY = [40, 40, 40, 38, 43, 43, 43, 38, 40, 40, 40, 38, 45, 45, 47, 47];

// "Talon Pass" — mountain wind and wings. D minor.
const M_MTN = [
  62, 0, 65, 62, 69, 0, 65, 62,
  70, 0, 69, 67, 65, 0, 67, 0,
  62, 0, 65, 62, 69, 0, 72, 0,
  74, 0, 72, 70, 69, 0, 67, 0,
  65, 67, 69, 70, 72, 0, 70, 69,
  67, 69, 70, 72, 74, 0, 72, 0,
  70, 0, 69, 67, 65, 0, 64, 65,
  67, 65, 62, 60, 62, 0, 0, 0,
];
const B_MTN = [50, 50, 50, 48, 46, 46, 46, 48, 50, 50, 50, 48, 53, 53, 45, 45];

// "Thousand Falls" — the vertical climb, rising arpeggios. E minor.
const M_FALLS = [
  52, 55, 59, 64, 67, 64, 59, 55,
  52, 55, 59, 64, 67, 0, 71, 0,
  50, 54, 57, 62, 66, 62, 57, 54,
  50, 54, 57, 62, 66, 0, 69, 0,
  52, 55, 59, 64, 67, 71, 76, 0,
  74, 71, 67, 64, 62, 59, 55, 59,
  64, 0, 62, 0, 59, 0, 57, 0,
  55, 57, 59, 62, 64, 0, 0, 0,
];
const B_FALLS = [40, 40, 40, 40, 38, 38, 38, 38, 40, 40, 43, 43, 45, 45, 47, 47];

// "Steel Serpent" — the military base, cold pistons. C minor.
const M_BASE = [
  60, 0, 60, 63, 60, 0, 65, 63,
  60, 0, 60, 63, 67, 0, 65, 63,
  60, 0, 60, 63, 60, 0, 65, 67,
  68, 0, 67, 65, 63, 0, 65, 0,
  67, 0, 68, 67, 65, 0, 63, 65,
  67, 0, 68, 67, 65, 63, 62, 63,
  60, 63, 67, 70, 68, 0, 67, 0,
  65, 0, 63, 0, 60, 0, 0, 0,
];
const B_BASE = [36, 36, 36, 36, 39, 39, 34, 34, 36, 36, 36, 36, 32, 32, 34, 34];

// "Bonehouse" — catacombs, slow dread. A minor, low.
const M_CATA = [
  57, 0, 0, 57, 60, 0, 57, 0,
  56, 0, 0, 56, 57, 0, 0, 0,
  57, 0, 0, 57, 60, 0, 63, 0,
  62, 0, 60, 0, 57, 0, 0, 0,
  55, 0, 57, 58, 60, 0, 58, 57,
  55, 0, 57, 58, 62, 0, 60, 58,
  57, 0, 58, 57, 56, 0, 57, 0,
  53, 0, 56, 0, 57, 0, 0, 0,
];
const B_CATA = [33, 33, 33, 33, 32, 32, 32, 32, 31, 31, 31, 31, 32, 32, 32, 32];

// "Gate of Demons" — the fortress gauntlet. E phrygian.
const M_FORT = [
  64, 65, 64, 62, 64, 0, 67, 64,
  65, 64, 62, 64, 65, 0, 68, 65,
  64, 65, 64, 62, 64, 0, 71, 68,
  67, 65, 64, 62, 64, 0, 0, 0,
  64, 0, 76, 0, 75, 0, 72, 0,
  71, 0, 72, 71, 68, 0, 65, 0,
  64, 65, 67, 68, 71, 68, 67, 65,
  64, 62, 61, 62, 64, 0, 0, 0,
];
const B_FORT = [40, 40, 41, 41, 40, 40, 43, 43, 40, 40, 41, 41, 44, 44, 43, 43];

// "Blade to Blade" — boss battle, no mercy. G minor.
const M_BOSS = [
  55, 0, 58, 55, 62, 0, 61, 58,
  55, 0, 58, 55, 63, 0, 62, 58,
  55, 0, 58, 55, 62, 0, 65, 62,
  66, 65, 63, 62, 63, 62, 58, 55,
  67, 0, 65, 63, 62, 0, 63, 65,
  67, 0, 70, 67, 65, 63, 62, 0,
  58, 60, 62, 63, 65, 63, 62, 60,
  58, 57, 55, 54, 55, 0, 0, 0,
];
const B_BOSS = [43, 43, 43, 42, 43, 43, 41, 41, 43, 43, 43, 42, 39, 39, 42, 42];

// "The Demon Moore" — final battle, chromatic menace. D minor.
const M_FINAL = [
  50, 0, 50, 51, 50, 0, 56, 0,
  50, 0, 50, 51, 53, 0, 51, 0,
  50, 0, 50, 51, 50, 0, 56, 57,
  59, 0, 57, 56, 53, 0, 51, 53,
  62, 0, 59, 56, 62, 0, 59, 56,
  63, 0, 60, 57, 63, 0, 60, 57,
  62, 59, 57, 56, 53, 56, 51, 53,
  50, 51, 50, 47, 50, 0, 0, 0,
];
const B_FINAL = [38, 38, 38, 38, 37, 37, 37, 37, 38, 38, 38, 38, 44, 44, 43, 43];

// "Whispers of the Statue" — cutscenes, sparse and grave. A minor.
const M_CUT = [
  57, 0, 0, 0, 60, 0, 0, 0,
  59, 0, 0, 0, 55, 0, 0, 0,
  57, 0, 0, 0, 60, 0, 62, 0,
  64, 0, 0, 0, 0, 0, 0, 0,
  65, 0, 0, 0, 64, 0, 0, 0,
  62, 0, 0, 0, 59, 0, 0, 0,
  57, 0, 0, 0, 56, 0, 0, 0,
  57, 0, 0, 0, 0, 0, 0, 0,
];
const B_CUT = [45, 0, 41, 0, 43, 0, 40, 0, 45, 0, 41, 0, 44, 0, 45, 0];

// "First Light" — ending, dawn over the city. F major.
const M_END = [
  65, 0, 69, 0, 72, 0, 76, 77,
  74, 0, 72, 0, 70, 0, 69, 0,
  65, 0, 69, 0, 72, 0, 77, 0,
  76, 0, 74, 72, 74, 0, 0, 0,
  70, 0, 74, 0, 77, 0, 76, 74,
  72, 0, 76, 0, 79, 0, 77, 76,
  77, 0, 74, 0, 72, 0, 70, 69,
  65, 0, 0, 0, 0, 0, 0, 0,
];
const B_END = [41, 41, 45, 45, 46, 46, 48, 48, 46, 46, 41, 41, 48, 48, 41, 41];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.15, lead: 'square', drums: true },
  city: { melody: M_CITY, bass: B_CITY, stepDur: 0.105, lead: 'square', drums: true },
  mountain: { melody: M_MTN, bass: B_MTN, stepDur: 0.11, lead: 'square', drums: true },
  falls: { melody: M_FALLS, bass: B_FALLS, stepDur: 0.115, lead: 'square', drums: true },
  base: { melody: M_BASE, bass: B_BASE, stepDur: 0.11, lead: 'square', drums: true },
  catacombs: { melody: M_CATA, bass: B_CATA, stepDur: 0.135, lead: 'triangle', drums: true },
  fortress: { melody: M_FORT, bass: B_FORT, stepDur: 0.1, lead: 'square', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.1, lead: 'square', drums: true },
  final: { melody: M_FINAL, bass: B_FINAL, stepDur: 0.095, lead: 'sawtooth', drums: true },
  cutscene: { melody: M_CUT, bass: B_CUT, stepDur: 0.22, lead: 'triangle', drums: false },
  ending: { melody: M_END, bass: B_END, stepDur: 0.16, lead: 'square', drums: false },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.jingleUntil = 0; // music pauses while a jingle plays
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
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.2;
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

  // Call every frame; schedules ahead.
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

  // "Act clear" fanfare, original.
  clearJingle() {
    if (!this.ctx) return;
    const seq = [57, 60, 64, 69, 0, 67, 69, 0, 72];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.15, 0.5, i * 0.12);
        this.tone('square', midi(m) * 1.005, 0, 0.15, 0.3, i * 0.12 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.12 + 0.4;
  }

  // Cutscene opening sting — two grim chords.
  sting() {
    if (!this.ctx) return;
    for (const [m, w] of [[45, 0], [52, 0], [57, 0], [44, 0.55], [51, 0.55], [56, 0.55]]) {
      this.tone('triangle', midi(m), 0, 0.5, 0.5, w);
      this.tone('square', midi(m + 12), 0, 0.45, 0.2, w + 0.03);
    }
    this.jingleUntil = this.ctx.currentTime + 1.2;
  }

  // ---- sfx ----
  slash() { this.noise(0.06, 0.3, 5200); this.tone('square', 2200, 700, 0.05, 0.16); }
  slashHit() { this.noise(0.05, 0.35, 2200); this.tone('square', 1500, 1100, 0.06, 0.22); }
  clang() { this.tone('square', 2400, 2100, 0.08, 0.25); this.noise(0.04, 0.2, 6000); }
  ninpoStar() { this.tone('square', 1400, 500, 0.09, 0.25); this.noise(0.04, 0.15, 4000); }
  ninpoWind() { this.tone('square', 700, 1400, 0.14, 0.22); this.tone('square', 1400, 700, 0.14, 0.18, 0.1); }
  ninpoFire() { this.noise(0.25, 0.35, 1800); this.tone('sawtooth', 300, 900, 0.2, 0.25); }
  ninpoJump() { this.tone('square', 500, 1600, 0.22, 0.25); this.noise(0.12, 0.2, 3000, 0.05); }
  hurt() { this.tone('sawtooth', 350, 120, 0.2, 0.4); this.noise(0.1, 0.3, 900); }
  ehit() { this.noise(0.04, 0.3, 1600); }
  edie() { this.noise(0.12, 0.35, 1000); this.tone('square', 600, 150, 0.12, 0.25); }
  lantern() { this.tone('square', 1800, 2600, 0.06, 0.25); this.noise(0.05, 0.2, 5000); }
  pickup() { this.tone('square', 880, 1320, 0.07, 0.3); }
  spirit() { this.tone('square', 990, 1480, 0.06, 0.28); this.tone('square', 1480, 1980, 0.08, 0.24, 0.05); }
  health() { this.tone('square', 660, 880, 0.1, 0.3); this.tone('square', 880, 1100, 0.12, 0.3, 0.09); }
  oneUp() { [660, 880, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.08)); }
  jump() { this.tone('square', 300, 520, 0.06, 0.1); }
  wallGrab() { this.noise(0.03, 0.25, 2400); this.tone('square', 900, 700, 0.04, 0.15); }
  wallKick() { this.tone('square', 400, 800, 0.07, 0.16); }
  land() { this.noise(0.04, 0.18, 400); }
  screech() { this.tone('sawtooth', 1500, 2300, 0.18, 0.22); this.tone('sawtooth', 1900, 2600, 0.14, 0.15, 0.1); }
  shot() { this.tone('square', 750, 220, 0.06, 0.2); }
  lob() { this.tone('square', 300, 600, 0.12, 0.2); }
  boom() { this.noise(0.22, 0.5, 700); this.tone('square', 200, 40, 0.2, 0.35); }
  fireJet() { this.noise(0.18, 0.2, 2200); }
  die() { this.tone('sawtooth', 400, 60, 0.5, 0.5); this.noise(0.3, 0.35, 500); }
  tick() { this.tone('square', 1100, 0, 0.04, 0.2); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  blip() { this.tone('square', 1650, 0, 0.025, 0.12); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
}
