// All-synthesized chiptune audio for Bubble Moore. Every track is an
// original composition in a sunny 8-bit arcade style (no Taito melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Bubble Dream" — title screen, drowsy and warm. F major.
const M_TITLE = [
  65, 0, 69, 0, 72, 0, 69, 0,
  74, 0, 72, 69, 67, 0, 65, 0,
  65, 0, 69, 0, 72, 0, 74, 76,
  77, 0, 74, 0, 72, 0, 0, 0,
  70, 0, 74, 0, 77, 0, 74, 0,
  72, 0, 76, 0, 79, 0, 76, 0,
  77, 74, 72, 70, 69, 70, 72, 74,
  72, 0, 65, 0, 65, 0, 0, 0,
];
const B_TITLE = [41, 41, 45, 45, 46, 46, 48, 48, 38, 38, 43, 43, 41, 48, 41, 41];

// "Bounce Parade" — gameplay loop, cheerful and springy. C major.
const M_PLAY = [
  72, 0, 76, 0, 79, 0, 76, 0,
  81, 79, 76, 0, 72, 0, 74, 76,
  77, 0, 81, 0, 84, 0, 81, 79,
  77, 76, 74, 0, 76, 0, 0, 0,
  72, 0, 76, 0, 79, 0, 76, 0,
  81, 79, 76, 0, 84, 0, 83, 81,
  79, 77, 76, 74, 72, 74, 76, 77,
  79, 0, 72, 0, 72, 0, 0, 0,
];
const B_PLAY = [48, 48, 43, 43, 41, 41, 43, 43, 48, 48, 45, 45, 41, 43, 48, 48];

// "Sugar Rooftops" — victory, everyone gets fruit. C major.
const M_WIN = [
  72, 74, 76, 77, 79, 0, 79, 0,
  81, 0, 79, 0, 77, 0, 76, 0,
  74, 76, 77, 79, 81, 0, 81, 0,
  83, 0, 81, 0, 79, 0, 0, 0,
  84, 0, 83, 81, 79, 0, 77, 76,
  77, 79, 81, 83, 84, 0, 84, 0,
  84, 83, 81, 79, 77, 76, 74, 76,
  72, 0, 72, 0, 72, 0, 0, 0,
];
const B_WIN = [48, 48, 53, 53, 55, 55, 48, 48, 50, 50, 55, 55, 53, 55, 48, 48];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.16, lead: 'square', drums: false },
  play: { melody: M_PLAY, bass: B_PLAY, stepDur: 0.115, lead: 'square', drums: true },
  hurry: { melody: M_PLAY, bass: B_PLAY, stepDur: 0.082, lead: 'square', drums: true },
  win: { melody: M_WIN, bass: B_WIN, stepDur: 0.14, lead: 'square', drums: false },
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
      if (m) this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.92, 0.45, when, this.musicGain);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.4, 0.6, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.24, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.13, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // "Round clear" — bubbly ascending fanfare, original.
  clearJingle() {
    if (!this.ctx) return;
    const seq = [72, 76, 79, 84, 0, 83, 84, 0, 88];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.14, 0.5, i * 0.12);
        this.tone('square', midi(m) * 1.005, 0, 0.14, 0.3, i * 0.12 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.12 + 0.4;
  }

  // Sad little death tune, original.
  dieJingle() {
    if (!this.ctx) return;
    const seq = [76, 72, 69, 65, 0, 64, 65, 0, 60];
    seq.forEach((m, i) => {
      if (m) this.tone('square', midi(m), 0, 0.13, 0.45, i * 0.11);
    });
    this.noise(0.25, 0.2, 700, 0.1);
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.11 + 0.35;
  }

  // ---- sfx ----
  blow() { this.tone('square', 320, 760, 0.09, 0.25); this.noise(0.05, 0.12, 3200); }
  pop() { this.tone('square', 1200, 400, 0.06, 0.3); this.noise(0.04, 0.25, 2600); }
  trapSfx() { this.tone('triangle', 500, 250, 0.14, 0.3); this.tone('square', 700, 900, 0.08, 0.16, 0.02); }
  jump() { this.tone('square', 260, 540, 0.09, 0.16); }
  bounce() { this.tone('square', 520, 940, 0.07, 0.2); }
  collect() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.09, 0.3, 0.07); }
  powerup() { [660, 830, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.08, 0.3, i * 0.06)); }
  oneUp() { [660, 880, 990, 1320, 1760].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.32, i * 0.08)); }
  angry() { this.tone('sawtooth', 300, 120, 0.25, 0.3); this.noise(0.1, 0.2, 900); }
  spit() { this.tone('square', 480, 180, 0.08, 0.18); }
  hurry() { [1100, 0, 1100, 0, 1400].forEach((f, i) => { if (f) this.tone('square', f, 0, 0.09, 0.35, i * 0.09); }); }
  skullSfx() { this.tone('sawtooth', 180, 320, 0.3, 0.25); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
}
