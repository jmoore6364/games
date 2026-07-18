// All-synthesized club-flavored audio: driving 4/4 kick, offbeat hats,
// 16th-note bassline arpeggios and detuned-saw leads — the Genesis dance
// sound. Every pattern is an original composition; no Sega melodies.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Patterns are 16th-note steps. melody: 32 or 64 steps (0 = rest).
// bass: 16-step arpeggio loop (per bar). All original.

// "Neon Rain" — stage 1 club driver, A minor.
const T_CLUB1 = {
  bpm: 126,
  bass: [45, 0, 45, 57, 45, 0, 57, 45, 43, 0, 43, 55, 43, 0, 55, 43],
  bass2: [41, 0, 41, 53, 41, 0, 53, 41, 43, 0, 43, 55, 43, 0, 55, 43],
  melody: [
    69, 0, 0, 72, 0, 0, 76, 0, 0, 74, 72, 0, 69, 0, 0, 0,
    67, 0, 0, 71, 0, 0, 74, 0, 76, 0, 74, 71, 67, 0, 0, 0,
    69, 0, 0, 72, 0, 0, 76, 0, 79, 0, 76, 74, 72, 0, 0, 0,
    74, 0, 72, 0, 71, 0, 69, 0, 67, 0, 0, 0, 64, 0, 0, 0,
  ],
  lead: 'sawtooth',
};

// "Girder Funk" — bridge / elevator, D minor with a stabbier bass.
const T_CLUB2 = {
  bpm: 132,
  bass: [38, 0, 50, 38, 0, 38, 50, 0, 38, 0, 50, 38, 41, 0, 53, 41],
  bass2: [36, 0, 48, 36, 0, 36, 48, 0, 43, 0, 55, 43, 41, 0, 53, 41],
  melody: [
    62, 0, 65, 0, 69, 0, 65, 0, 62, 0, 0, 0, 60, 62, 0, 0,
    58, 0, 62, 0, 65, 0, 62, 0, 67, 0, 65, 0, 62, 0, 0, 0,
    62, 0, 65, 0, 69, 0, 70, 0, 69, 0, 65, 0, 62, 0, 0, 0,
    60, 0, 62, 0, 65, 0, 67, 0, 65, 0, 62, 0, 58, 0, 0, 0,
  ],
  lead: 'square',
};

// "Pier Pressure" — amusement pier / tower, E minor rave chords.
const T_CLUB3 = {
  bpm: 128,
  bass: [40, 0, 40, 52, 40, 0, 52, 0, 38, 0, 38, 50, 38, 0, 50, 0],
  bass2: [36, 0, 36, 48, 36, 0, 48, 0, 43, 0, 43, 55, 43, 0, 55, 0],
  melody: [
    76, 0, 0, 0, 76, 0, 74, 0, 71, 0, 0, 0, 69, 0, 71, 0,
    74, 0, 0, 0, 74, 0, 71, 0, 67, 0, 0, 0, 64, 0, 67, 0,
    76, 0, 0, 0, 76, 0, 74, 0, 79, 0, 0, 0, 78, 0, 74, 0,
    71, 0, 74, 0, 76, 0, 74, 0, 71, 0, 67, 0, 64, 0, 0, 0,
  ],
  lead: 'sawtooth',
};

// "Mr. X's Floor" — boss hammering, C minor, half-step menace.
const T_BOSS = {
  bpm: 140,
  bass: [36, 36, 0, 36, 39, 0, 36, 0, 36, 36, 0, 36, 35, 0, 36, 0],
  bass2: [41, 41, 0, 41, 44, 0, 41, 0, 43, 43, 0, 43, 42, 0, 43, 0],
  melody: [
    72, 0, 72, 0, 75, 0, 72, 0, 77, 0, 75, 0, 72, 0, 71, 0,
    72, 0, 72, 0, 75, 0, 79, 0, 78, 0, 75, 0, 72, 0, 0, 0,
    80, 0, 79, 0, 77, 0, 75, 0, 74, 0, 75, 0, 77, 0, 75, 0,
    72, 0, 71, 0, 72, 0, 75, 0, 72, 0, 0, 0, 0, 0, 0, 0,
  ],
  lead: 'sawtooth',
};

// "Moore Streets Forever" — ending, F major and warm.
const T_END = {
  bpm: 104,
  bass: [41, 0, 48, 0, 53, 0, 48, 0, 38, 0, 45, 0, 50, 0, 45, 0],
  bass2: [39, 0, 46, 0, 51, 0, 46, 0, 43, 0, 48, 0, 55, 0, 48, 0],
  melody: [
    77, 0, 0, 0, 81, 0, 0, 0, 84, 0, 0, 81, 79, 0, 77, 0,
    79, 0, 0, 0, 77, 0, 0, 0, 74, 0, 0, 0, 0, 0, 0, 0,
    77, 0, 0, 0, 81, 0, 0, 0, 86, 0, 0, 84, 81, 0, 79, 0,
    84, 0, 0, 0, 82, 0, 79, 0, 77, 0, 0, 0, 0, 0, 0, 0,
  ],
  lead: 'sawtooth', soft: true,
};

// "Insert Coin" — title attract, tense A minor vamp.
const T_TITLE = {
  bpm: 120,
  bass: [33, 0, 45, 0, 33, 0, 45, 33, 31, 0, 43, 0, 31, 0, 43, 31],
  bass2: [29, 0, 41, 0, 29, 0, 41, 29, 31, 0, 43, 0, 31, 0, 43, 31],
  melody: [
    0, 0, 0, 0, 69, 0, 71, 0, 72, 0, 0, 0, 71, 0, 69, 0,
    64, 0, 0, 0, 0, 0, 0, 0, 67, 0, 0, 0, 69, 0, 0, 0,
    0, 0, 0, 0, 69, 0, 71, 0, 72, 0, 0, 0, 76, 0, 74, 0,
    72, 0, 71, 0, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  lead: 'square',
};

const TRACKS = {
  club1: T_CLUB1, club2: T_CLUB2, club3: T_CLUB3,
  boss: T_BOSS, ending: T_END, title: T_TITLE,
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
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.4;
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

  lead(f, dur, vol, when = 0, dest = null, type = 'sawtooth') {
    this.tone(type, f, 0, dur, vol * 0.6, when, dest);
    this.tone(type, f * 1.006, 0, dur, vol * 0.4, when, dest);
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

  // The club kick: a fast sine drop with a click on top.
  kick(when = 0, dest = null) {
    this.tone('sine', 150, 42, 0.14, 0.95, when, dest);
    this.noise(0.02, 0.25, 2500, when, dest);
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
    const stepDur = 15 / tr.bpm; // 16th note
    while (this.nextTime < this.ctx.currentTime + 0.16) {
      const i = this.step;
      const when = Math.max(0, this.nextTime - this.ctx.currentTime);
      const mel = tr.melody;
      const bar16 = i % 16;
      const useB2 = (i >> 6) % 2 === 1; // alternate bass line every 4 bars
      const bassPat = useB2 && tr.bass2 ? tr.bass2 : tr.bass;

      // drums: four-on-the-floor kick, snare on 2&4, offbeat open hats
      if (!tr.soft) {
        if (bar16 % 4 === 0) this.kick(when, this.musicGain);
        if (bar16 === 4 || bar16 === 12) this.noise(0.09, 0.4, 1600, when, this.musicGain, 0.5);
        if (bar16 % 4 === 2) this.noise(0.05, 0.22, 8000, when, this.musicGain);
        else if (bar16 % 2 === 1) this.noise(0.02, 0.1, 9000, when, this.musicGain);
      } else if (bar16 % 8 === 0) {
        this.kick(when, this.musicGain);
      }

      // 16th-note bass arpeggio
      const b = bassPat[bar16];
      if (b) {
        this.tone('square', midi(b), 0, stepDur * 0.9, 0.42, when, this.musicGain);
        this.tone('triangle', midi(b) / 2, 0, stepDur * 1.6, 0.5, when, this.musicGain);
      }

      // lead
      const m = mel[i % mel.length];
      if (m) this.lead(midi(m), stepDur * 1.7, tr.soft ? 0.5 : 0.38, when, this.musicGain, tr.lead);

      this.nextTime += stepDur;
      this.step++;
    }
  }

  // ---- jingles ----
  titleSting() {
    if (!this.ctx) return;
    this.kick(); this.kick(0.16); this.kick(0.32);
    [57, 60, 64, 69, 72].forEach((m, i) => this.lead(midi(m), 0.18, 0.5, 0.1 + i * 0.09));
    this.tone('sawtooth', midi(81), 0, 0.7, 0.4, 0.6);
    this.jingleUntil = this.ctx.currentTime + 1.5;
  }

  stageClearJingle() {
    if (!this.ctx) return;
    const seq = [64, 67, 71, 76, 0, 74, 76, 0, 79];
    seq.forEach((m, i) => { if (m) this.lead(midi(m), 0.15, 0.5, i * 0.11); });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.11 + 0.4;
  }

  // ---- sfx: punches by weight ----
  punchLight() { this.noise(0.05, 0.4, 1500); this.tone('square', 300, 120, 0.05, 0.25); }
  punchMid() { this.noise(0.06, 0.5, 1100); this.tone('square', 240, 90, 0.07, 0.32); }
  punchHeavy() { this.noise(0.09, 0.6, 750); this.tone('sine', 170, 55, 0.12, 0.6); this.tone('square', 200, 70, 0.08, 0.3); }
  whoosh() { this.noise(0.08, 0.18, 2400, 0, null, 1.5); }
  grab() { this.noise(0.06, 0.3, 900); this.tone('square', 160, 220, 0.07, 0.2); }
  throwSlam() { this.noise(0.14, 0.65, 420); this.tone('sine', 140, 40, 0.2, 0.7); }
  thud() { this.noise(0.1, 0.5, 380); this.tone('sine', 120, 45, 0.14, 0.5); }
  clang() { this.tone('square', 1900, 1300, 0.08, 0.3); this.tone('square', 2900, 2100, 0.06, 0.2, 0.01); this.noise(0.05, 0.25, 3000); }
  blockTing() { this.tone('square', 2200, 1800, 0.05, 0.22); }
  knifeThrow() { this.noise(0.1, 0.25, 3200, 0, null, 2); this.tone('sawtooth', 1200, 700, 0.08, 0.12); }
  stab() { this.noise(0.06, 0.4, 2000); this.tone('sawtooth', 700, 250, 0.06, 0.2); }
  crunch() { this.noise(0.16, 0.6, 600, 0, null, 0.4); this.noise(0.1, 0.4, 250, 0.05); this.tone('square', 140, 60, 0.12, 0.35); }
  pickup() { this.tone('square', 800, 1200, 0.06, 0.3); this.tone('square', 1200, 1600, 0.08, 0.3, 0.06); }
  food() { this.tone('square', 500, 750, 0.08, 0.3); this.tone('square', 750, 1100, 0.1, 0.3, 0.08); this.tone('square', 1100, 1500, 0.1, 0.25, 0.16); }
  coin() { this.tone('square', 1500, 0, 0.05, 0.28); this.tone('square', 2000, 0, 0.12, 0.28, 0.05); }
  special() { this.noise(0.25, 0.4, 1200, 0, null, 1.2); this.tone('sawtooth', 300, 900, 0.22, 0.3); this.tone('sawtooth', 500, 1300, 0.25, 0.2, 0.05); }
  blitz() { this.noise(0.14, 0.35, 1800); this.tone('sawtooth', 400, 950, 0.14, 0.3); }
  jump() { this.tone('square', 240, 460, 0.09, 0.12); }
  land() { this.noise(0.05, 0.2, 350); }
  run() { this.noise(0.07, 0.15, 1400); }
  phurt() { this.tone('sawtooth', 260, 110, 0.16, 0.35); this.noise(0.08, 0.3, 800); }
  pdie() { this.tone('sawtooth', 400, 50, 0.7, 0.5); this.noise(0.4, 0.4, 400); }
  edie() { this.tone('sawtooth', 320, 70, 0.3, 0.38); this.noise(0.2, 0.3, 550); }
  flame() { this.noise(0.5, 0.45, 900, 0, null, 0.3); this.tone('sawtooth', 120, 70, 0.4, 0.2); }
  gun() { this.noise(0.06, 0.55, 1300); this.tone('square', 220, 80, 0.05, 0.35); }
  bikeRev() { this.tone('sawtooth', 70, 160, 0.5, 0.4); this.noise(0.4, 0.3, 300, 0, null, 0.4); }
  bossRoar() { this.tone('sawtooth', 170, 65, 0.5, 0.5); this.noise(0.35, 0.4, 300); }
  deskFlip() { this.crunch(); this.noise(0.3, 0.5, 500, 0.1); this.tone('sine', 100, 40, 0.3, 0.6, 0.1); }
  go() { this.lead(midi(76), 0.09, 0.4); this.lead(midi(81), 0.13, 0.4, 0.09); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  tick() { this.tone('square', 880, 0, 0.05, 0.3); }
  join() { [60, 64, 67, 72].forEach((m, i) => this.tone('square', midi(m), 0, 0.08, 0.3, i * 0.06)); }
  tech() { this.tone('square', 600, 1100, 0.08, 0.3); this.noise(0.06, 0.25, 1500); }
}
