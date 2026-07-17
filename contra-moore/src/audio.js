// All-synthesized chiptune audio. Every track is an original composition
// in a hot-blooded 8-bit action style (no Konami melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "One Man Landing" — title screen, grim and resolute. D minor.
const M_TITLE = [
  50, 0, 0, 50, 0, 0, 53, 0,
  57, 0, 0, 0, 55, 0, 53, 0,
  50, 0, 0, 50, 0, 0, 58, 0,
  57, 0, 55, 0, 53, 0, 0, 0,
  50, 0, 0, 50, 0, 0, 53, 0,
  57, 0, 0, 0, 60, 0, 58, 0,
  57, 0, 55, 0, 57, 0, 53, 0,
  50, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [38, 0, 38, 38, 36, 0, 36, 36, 38, 0, 38, 38, 34, 34, 36, 36];

// "Green Hell" — jungle assault, sprinting and fearless. A minor.
const M_JUNGLE = [
  57, 0, 57, 59, 60, 0, 59, 57,
  64, 0, 64, 0, 62, 60, 59, 60,
  57, 0, 57, 59, 60, 0, 62, 64,
  65, 0, 64, 62, 64, 0, 0, 0,
  69, 0, 67, 65, 64, 0, 65, 67,
  69, 0, 67, 65, 64, 0, 62, 60,
  59, 60, 62, 64, 65, 64, 62, 59,
  57, 0, 57, 0, 57, 0, 0, 0,
];
const B_JUNGLE = [45, 45, 45, 43, 41, 41, 41, 43, 45, 45, 45, 43, 40, 41, 43, 43];

// "Up the Thunder" — waterfall climb, rising arpeggios. E minor.
const M_FALLS = [
  52, 55, 59, 62, 64, 62, 59, 55,
  52, 55, 59, 62, 64, 0, 66, 0,
  50, 54, 57, 62, 66, 62, 57, 54,
  50, 54, 57, 62, 66, 0, 67, 0,
  52, 55, 59, 64, 67, 64, 59, 55,
  57, 60, 64, 69, 72, 0, 71, 69,
  67, 0, 66, 64, 62, 0, 59, 62,
  64, 0, 64, 0, 64, 0, 0, 0,
];
const B_FALLS = [40, 40, 40, 40, 38, 38, 38, 38, 40, 40, 45, 45, 43, 43, 40, 40];

// "Iron Hollow" — the machine base, cold and pounding. C minor.
const M_BASE = [
  48, 0, 48, 51, 48, 0, 54, 53,
  48, 0, 48, 51, 55, 0, 53, 51,
  48, 0, 48, 51, 48, 0, 46, 47,
  48, 0, 51, 0, 53, 0, 55, 0,
  56, 0, 55, 53, 56, 0, 55, 53,
  58, 0, 56, 55, 58, 0, 56, 55,
  60, 0, 58, 56, 55, 53, 51, 50,
  48, 0, 48, 0, 48, 0, 0, 0,
];
const B_BASE = [36, 36, 36, 36, 34, 34, 34, 34, 36, 36, 36, 36, 31, 31, 34, 34];

// "Meat Cathedral" — the hive, wet and wrong. F# locrian-ish.
const M_HIVE = [
  54, 0, 55, 54, 0, 54, 60, 0,
  58, 0, 55, 0, 54, 0, 52, 0,
  54, 0, 55, 54, 0, 54, 61, 0,
  60, 0, 58, 0, 55, 0, 54, 0,
  50, 0, 52, 50, 0, 50, 56, 0,
  54, 0, 52, 0, 50, 0, 49, 0,
  50, 0, 52, 54, 55, 0, 58, 60,
  61, 0, 60, 0, 54, 0, 0, 0,
];
const B_HIVE = [30, 30, 30, 30, 32, 32, 32, 32, 30, 30, 30, 30, 28, 28, 30, 30];

// "Kill the Giant" — boss battle, all teeth. G minor.
const M_BOSS = [
  55, 55, 58, 55, 61, 60, 58, 55,
  55, 55, 58, 55, 62, 0, 61, 58,
  55, 55, 58, 55, 61, 60, 58, 55,
  54, 56, 58, 60, 61, 0, 60, 58,
  63, 0, 61, 58, 63, 0, 61, 58,
  62, 0, 60, 57, 62, 0, 60, 57,
  61, 60, 58, 56, 55, 56, 58, 60,
  61, 0, 60, 0, 55, 0, 0, 0,
];
const B_BOSS = [43, 43, 43, 42, 43, 43, 43, 41, 43, 43, 43, 42, 39, 40, 41, 42];

// "Sunrise Extraction" — ending, the ride home. F major.
const M_END = [
  65, 0, 69, 72, 77, 0, 76, 72,
  74, 0, 70, 74, 79, 0, 77, 0,
  65, 0, 69, 72, 77, 79, 81, 82,
  84, 0, 81, 0, 79, 0, 77, 0,
  70, 74, 77, 81, 82, 81, 79, 77,
  72, 76, 79, 82, 84, 0, 81, 79,
  77, 79, 81, 82, 84, 82, 81, 79,
  82, 0, 79, 0, 77, 0, 0, 0,
];
const B_END = [41, 41, 45, 45, 46, 46, 48, 48, 41, 41, 46, 46, 48, 46, 41, 41];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.17, lead: 'square', drums: true },
  jungle: { melody: M_JUNGLE, bass: B_JUNGLE, stepDur: 0.115, lead: 'square', drums: true },
  falls: { melody: M_FALLS, bass: B_FALLS, stepDur: 0.12, lead: 'square', drums: true },
  base: { melody: M_BASE, bass: B_BASE, stepDur: 0.125, lead: 'square', drums: true },
  hive: { melody: M_HIVE, bass: B_HIVE, stepDur: 0.15, lead: 'triangle', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.105, lead: 'square', drums: true },
  ending: { melody: M_END, bass: B_END, stepDur: 0.15, lead: 'square', drums: false },
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

  // "Area secured" — stage clear fanfare, original.
  clearJingle() {
    if (!this.ctx) return;
    const seq = [55, 58, 62, 67, 0, 65, 67, 0, 70];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.15, 0.5, i * 0.13);
        this.tone('square', midi(m) * 1.005, 0, 0.15, 0.3, i * 0.13 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.13 + 0.4;
  }

  // ---- sfx ----
  shoot() { this.tone('square', 850, 250, 0.05, 0.22); }
  spread() { this.tone('square', 700, 200, 0.08, 0.25); this.noise(0.05, 0.2, 2500); }
  laser() { this.tone('sawtooth', 1800, 300, 0.18, 0.28); this.tone('square', 2400, 600, 0.12, 0.15, 0.02); }
  eshoot() { this.tone('square', 500, 180, 0.07, 0.16); }
  lob() { this.tone('square', 300, 600, 0.12, 0.2); }
  boom() { this.noise(0.22, 0.5, 700); this.tone('square', 200, 40, 0.2, 0.35); }
  bigBoom() {
    for (let i = 0; i < 8; i++) this.noise(0.35, 0.55, 700 - i * 60, i * 0.09);
    this.tone('sawtooth', 180, 25, 1.2, 0.55, 0.1);
  }
  ehit() { this.noise(0.04, 0.3, 1600); }
  clink() { this.tone('square', 1900, 1500, 0.05, 0.2); }
  jump() { this.tone('square', 240, 460, 0.08, 0.12); }
  land() { this.noise(0.04, 0.18, 400); }
  splash() { this.noise(0.16, 0.35, 1400); this.tone('triangle', 400, 150, 0.12, 0.2); }
  die() { this.tone('sawtooth', 400, 60, 0.5, 0.5); this.noise(0.3, 0.35, 500); }
  pickupDrop() { this.tone('square', 600, 900, 0.08, 0.25); }
  collect() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.09, 0.3, 0.07); }
  oneUp() { [660, 880, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.08)); }
  squish() { this.tone('triangle', 300, 90, 0.15, 0.3); this.noise(0.08, 0.2, 800); }
  screech() { this.tone('sawtooth', 1400, 2100, 0.14, 0.15); }
  roar() { this.tone('sawtooth', 220, 90, 0.35, 0.4); this.noise(0.25, 0.3, 400); }
  konami() { [880, 1100, 1320, 1760].forEach((f, i) => this.tone('square', f, 0, 0.07, 0.35, i * 0.06)); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
}
