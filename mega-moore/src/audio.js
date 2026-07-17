// Mega Moore — all-synthesized NES-style chiptune audio. Every track is an
// original composition in a bright 8-bit robot-action style (no Capcom melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// Loop A: "Steel Runner" — driving action loop. E minor. Reused across stages
// at different tempos / transpositions.
const M_A = [
  64, 0, 67, 64, 71, 0, 69, 67,
  69, 0, 67, 66, 67, 0, 64, 0,
  64, 0, 67, 64, 71, 0, 74, 71,
  72, 0, 71, 69, 71, 0, 0, 0,
  76, 0, 74, 72, 71, 0, 72, 74,
  76, 0, 74, 72, 71, 0, 69, 67,
  69, 71, 72, 74, 76, 0, 72, 0,
  71, 0, 67, 0, 64, 0, 0, 0,
];
const B_A = [40, 40, 47, 47, 45, 45, 43, 43, 40, 40, 47, 47, 38, 38, 43, 43];

// Loop B: "Crystal Circuit" — bouncy, hopeful. A minor / C major.
const M_B = [
  69, 0, 0, 69, 72, 0, 69, 0,
  76, 0, 74, 72, 74, 0, 72, 0,
  69, 0, 0, 69, 72, 0, 69, 0,
  74, 72, 71, 69, 71, 0, 0, 0,
  71, 0, 72, 74, 76, 0, 76, 0,
  77, 0, 76, 74, 72, 0, 74, 76,
  81, 0, 79, 77, 76, 0, 72, 0,
  74, 0, 71, 0, 69, 0, 0, 0,
];
const B_B = [45, 45, 52, 52, 41, 41, 48, 48, 43, 43, 50, 50, 45, 45, 45, 45];

// "Blue Bomber of Moore" — title. Heroic, wide. C major.
const M_TITLE = [
  60, 0, 64, 67, 72, 0, 0, 71,
  72, 0, 74, 0, 67, 0, 0, 0,
  65, 0, 69, 72, 77, 0, 0, 76,
  77, 0, 79, 0, 72, 0, 0, 0,
  69, 0, 72, 76, 81, 0, 79, 77,
  76, 0, 74, 72, 74, 0, 71, 67,
  72, 0, 71, 0, 69, 0, 67, 0,
  60, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [48, 48, 48, 48, 53, 53, 53, 53, 45, 45, 45, 45, 43, 43, 48, 48];

// "Skull Circuit Showdown" — boss battle. G minor, relentless.
const M_BOSS = [
  55, 55, 58, 55, 61, 0, 60, 58,
  55, 55, 58, 55, 62, 0, 61, 58,
  55, 55, 58, 55, 61, 0, 60, 58,
  54, 56, 58, 60, 61, 0, 62, 0,
  63, 0, 61, 58, 63, 0, 61, 58,
  62, 0, 60, 57, 62, 0, 60, 57,
  61, 60, 58, 56, 55, 56, 58, 60,
  61, 0, 62, 0, 55, 0, 0, 0,
];
const B_BOSS = [43, 43, 43, 42, 43, 43, 43, 41, 43, 43, 43, 42, 39, 40, 41, 42];

// "Circuits at Dawn" — ending. F major, warm.
const M_END = [
  65, 0, 69, 72, 77, 0, 76, 72,
  74, 0, 72, 70, 72, 0, 69, 0,
  65, 0, 69, 72, 77, 79, 81, 82,
  84, 0, 81, 0, 79, 0, 77, 0,
  70, 74, 77, 81, 82, 81, 79, 77,
  72, 76, 79, 82, 84, 0, 81, 79,
  77, 79, 81, 82, 84, 82, 81, 79,
  82, 0, 79, 0, 77, 0, 0, 0,
];
const B_END = [41, 41, 45, 45, 46, 46, 48, 48, 41, 41, 46, 46, 48, 46, 41, 41];

// Stage themes reuse loops A and B at distinct tempo / key, per the NES
// tradition of tight cartridge budgets.
const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.15, tr: 0, lead: 'square', drums: true },
  select: { melody: M_B, bass: B_B, stepDur: 0.16, tr: -3, lead: 'triangle', drums: false },
  torch: { melody: M_A, bass: B_A, stepDur: 0.115, tr: 0, lead: 'square', drums: true },
  gear: { melody: M_A, bass: B_A, stepDur: 0.098, tr: -2, lead: 'square', drums: true },
  fortress: { melody: M_A, bass: B_A, stepDur: 0.135, tr: -5, lead: 'square', drums: true },
  frost: { melody: M_B, bass: B_B, stepDur: 0.13, tr: 2, lead: 'square', drums: true },
  volt: { melody: M_B, bass: B_B, stepDur: 0.105, tr: -1, lead: 'square', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.105, tr: 0, lead: 'square', drums: true },
  ending: { melody: M_END, bass: B_END, stepDur: 0.15, tr: 0, lead: 'square', drums: false },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.trackName = null;
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
      if (m) this.tone(tr.lead, midi(m + tr.tr), 0, tr.stepDur * 0.92, 0.5, when, this.musicGain);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b + tr.tr), 0, tr.stepDur * 3.4, 0.62, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.3, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.16, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // ---- jingles (block music while playing) ----

  // Weapon get! Rising, glittering. Original.
  weaponGet() {
    if (!this.ctx) return;
    const seq = [60, 64, 67, 72, 0, 71, 72, 76, 79, 0, 84, 0, 84];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.16, 0.45, i * 0.14);
        this.tone('square', midi(m) * 2.003, 0, 0.12, 0.2, i * 0.14 + 0.03);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.14 + 0.5;
  }

  // Stage clear / boss down victory fanfare. Original.
  victory() {
    if (!this.ctx) return;
    const seq = [55, 60, 64, 67, 0, 65, 67, 0, 72];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.15, 0.5, i * 0.13);
        this.tone('square', midi(m) * 1.005, 0, 0.15, 0.3, i * 0.13 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.13 + 0.4;
  }

  // ---- sfx ----
  pew() { this.tone('square', 880, 320, 0.06, 0.22); }
  wfire(k) {
    if (k === 'T') { this.tone('sawtooth', 300, 700, 0.14, 0.25); this.noise(0.08, 0.15, 1800); }
    else if (k === 'F') { this.tone('square', 1400, 2200, 0.08, 0.2); this.tone('square', 1800, 2600, 0.06, 0.15, 0.03); }
    else if (k === 'G') { this.tone('square', 500, 260, 0.12, 0.22); this.tone('square', 260, 500, 0.12, 0.18, 0.1); }
    else if (k === 'V') { this.tone('sawtooth', 200, 1200, 0.12, 0.22); }
    else this.pew();
  }
  ehit() { this.noise(0.04, 0.3, 1600); }
  clink() { this.tone('square', 1900, 1500, 0.05, 0.2); }
  phit() { this.tone('sawtooth', 500, 120, 0.2, 0.35); this.noise(0.08, 0.2, 900); }
  land() { this.noise(0.04, 0.18, 400); }
  ladder() { this.tone('square', 700, 0, 0.03, 0.08); }
  slide() { this.noise(0.09, 0.15, 2400); }
  door() { this.tone('square', 90, 220, 0.5, 0.35); this.noise(0.4, 0.25, 300); }
  tick() { this.tone('square', 1100, 0, 0.04, 0.25); }
  menuMove() { this.tone('square', 900, 0, 0.04, 0.2); }
  menuOpen() { this.tone('square', 660, 990, 0.06, 0.25); }
  buzz() { this.tone('sawtooth', 160, 110, 0.18, 0.3); }
  item() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.09, 0.3, 0.07); }
  oneUp() { [660, 880, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.08)); }
  etank() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('square', f, 0, 0.08, 0.3, i * 0.07)); }
  boom() { this.noise(0.22, 0.5, 700); this.tone('square', 200, 40, 0.2, 0.35); }
  dieBoom() {
    // MM-style death: ring of pops
    for (let i = 0; i < 6; i++) this.tone('square', 700 - i * 70, 0, 0.09, 0.3, i * 0.07);
    this.noise(0.35, 0.4, 600, 0.05);
  }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
  teleport() { this.tone('square', 1800, 200, 0.25, 0.3); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
}
