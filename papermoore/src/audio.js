// All-synthesized WebAudio. Original bouncy, whistleable tunes in a bright
// arcade style, plus the paper-route sound effects.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Extra! Extra!" — title, jaunty and proud. G major.
const M_TITLE = [
  67, 0, 71, 0, 74, 0, 71, 67,
  69, 0, 67, 0, 64, 0, 0, 0,
  62, 0, 67, 0, 71, 0, 67, 62,
  66, 0, 67, 0, 69, 0, 0, 0,
  71, 0, 74, 0, 76, 74, 71, 67,
  69, 71, 72, 71, 69, 0, 67, 0,
  74, 0, 71, 0, 67, 0, 62, 0,
  67, 0, 0, 0, 67, 0, 0, 0,
];
const B_TITLE = [43, 0, 43, 47, 48, 0, 48, 43, 45, 0, 45, 45, 43, 43, 43, 43];

// "Paper Route" — the street theme, bouncy pedal-along groove. C major.
const M_ROUTE = [
  72, 0, 72, 76, 79, 0, 76, 72,
  74, 0, 74, 77, 74, 0, 71, 0,
  72, 0, 72, 76, 79, 0, 81, 79,
  77, 0, 76, 74, 72, 0, 0, 0,
  76, 0, 79, 0, 81, 79, 77, 76,
  74, 0, 77, 0, 79, 0, 76, 0,
  72, 74, 76, 77, 79, 77, 76, 74,
  72, 0, 0, 0, 72, 0, 0, 0,
];
const B_ROUTE = [36, 36, 43, 36, 41, 41, 40, 41, 38, 38, 43, 38, 43, 43, 43, 43];

// "Hot Route" — later-week street, faster and edgier. A minor.
const M_HOT = [
  69, 0, 69, 72, 76, 0, 72, 69,
  71, 0, 71, 74, 71, 0, 69, 0,
  69, 0, 72, 76, 79, 0, 76, 72,
  74, 0, 72, 71, 69, 0, 0, 0,
  76, 0, 79, 0, 81, 79, 76, 74,
  72, 0, 76, 0, 79, 0, 76, 0,
  69, 72, 76, 79, 81, 79, 76, 72,
  69, 0, 0, 0, 69, 0, 0, 0,
];
const B_HOT = [45, 45, 52, 45, 43, 43, 50, 43, 41, 41, 48, 41, 40, 40, 40, 40];

// "Ramp It Up" — BMX bonus, breathless and fun. D major.
const M_BMX = [
  74, 0, 78, 81, 74, 0, 78, 81,
  76, 0, 79, 83, 76, 0, 79, 83,
  74, 78, 81, 86, 85, 81, 78, 74,
  76, 79, 83, 79, 76, 0, 0, 0,
  81, 0, 81, 83, 85, 0, 83, 81,
  78, 0, 78, 81, 78, 0, 74, 0,
  74, 78, 81, 85, 86, 85, 81, 78,
  74, 0, 0, 0, 74, 0, 0, 0,
];
const B_BMX = [50, 50, 57, 50, 45, 45, 52, 45, 47, 47, 54, 47, 45, 45, 45, 45];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.15, lead: 'square', drums: true },
  route: { melody: M_ROUTE, bass: B_ROUTE, stepDur: 0.135, lead: 'square', drums: true },
  hot: { melody: M_HOT, bass: B_HOT, stepDur: 0.12, lead: 'square', drums: true },
  bmx: { melody: M_BMX, bass: B_BMX, stepDur: 0.11, lead: 'square', drums: true },
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

  noise(dur, vol = 1, freq = 4000, when = 0, dest = null, type = 'bandpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = 0.7;
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
      if (m) {
        this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.9, 0.42, when, this.musicGain);
        this.tone('triangle', midi(m), 0, tr.stepDur * 0.9, 0.18, when, this.musicGain);
      }
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

  // "Day complete" jingle — bright and satisfied.
  dayJingle() {
    if (!this.ctx) return;
    const seq = [72, 76, 79, 84, 0, 81, 84, 0, 88];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.14, 0.42, i * 0.13);
        this.tone('triangle', midi(m), 0, 0.14, 0.2, i * 0.13);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.13 + 0.4;
  }

  // "Bonus fanfare" — for the BMX course start.
  fanfare() {
    if (!this.ctx) return;
    const seq = [67, 72, 76, 79, 76, 79, 84];
    seq.forEach((m, i) => this.tone('square', midi(m), 0, 0.12, 0.4, i * 0.1));
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.1 + 0.3;
  }

  // ---- sfx ----
  whoosh() { this.tone('sine', 900, 300, 0.14, 0.2); this.noise(0.1, 0.12, 3000, 0, null, 'highpass'); }
  ding() { this.tone('square', 1568, 0, 0.08, 0.32); this.tone('square', 2093, 0, 0.14, 0.28, 0.06); }
  deliver() { this.tone('square', 880, 0, 0.07, 0.3); this.tone('square', 1320, 0, 0.1, 0.3, 0.06); }
  smash() { this.noise(0.18, 0.5, 2600, 0, null, 'highpass'); this.tone('square', 1400, 300, 0.06, 0.18); }
  board() { this.tone('square', 300, 160, 0.09, 0.2); this.noise(0.05, 0.15, 1200); }
  thud() { this.noise(0.22, 0.5, 500); this.tone('square', 180, 40, 0.22, 0.4); }
  bark() { this.tone('sawtooth', 420, 180, 0.09, 0.3); this.tone('sawtooth', 500, 220, 0.07, 0.25, 0.11); }
  bell() { this.tone('square', 2200, 1800, 0.05, 0.22); this.tone('square', 2600, 2100, 0.05, 0.18, 0.05); }
  pickup() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.09, 0.3, 0.07); }
  hop() { this.tone('square', 300, 620, 0.09, 0.18); }
  land() { this.noise(0.05, 0.2, 500); }
  splash() { this.noise(0.18, 0.4, 1400); this.tone('triangle', 400, 150, 0.12, 0.2); }
  oneUp() { [660, 880, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.08)); }
  select() { this.tone('square', 700, 0, 0.05, 0.25); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  gameover() { [72, 68, 65, 60, 56].forEach((m, i) => this.tone('square', midi(m), 0, 0.2, 0.35, i * 0.16)); }
  win() { [72, 76, 79, 84, 88, 84, 88, 91].forEach((m, i) => this.tone('square', midi(m), 0, 0.16, 0.35, i * 0.14)); }
}
