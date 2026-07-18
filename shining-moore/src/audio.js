// All-synthesized Genesis-flavored audio (detuned saw "FM brass" leads).
// Every track is an original composition. Pattern follows moore-quest/src/audio.js.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "The Shining Standard" — title. Noble brass march in C.
const M_TITLE = [
  60, 0, 64, 0, 67, 0, 72, 0,
  71, 0, 67, 0, 69, 67, 65, 64,
  62, 0, 65, 0, 69, 0, 74, 0,
  72, 0, 69, 0, 67, 0, 0, 0,
  64, 0, 67, 0, 72, 0, 76, 0,
  74, 0, 72, 0, 71, 69, 67, 65,
  64, 65, 67, 69, 71, 72, 74, 71,
  72, 0, 67, 0, 64, 0, 60, 0,
];
const B_TITLE = [36, 0, 43, 0, 41, 0, 43, 0, 40, 0, 45, 0, 43, 43, 36, 0];

// "March of the Force" — battle map. Determined stride in D minor.
const M_MAP = [
  62, 0, 62, 65, 69, 0, 65, 62,
  67, 0, 65, 63, 62, 0, 60, 0,
  62, 0, 62, 65, 69, 0, 72, 0,
  74, 0, 72, 70, 69, 0, 67, 65,
  63, 0, 67, 70, 75, 0, 70, 67,
  62, 0, 65, 69, 74, 0, 69, 65,
  63, 65, 67, 68, 69, 70, 72, 74,
  75, 0, 74, 70, 69, 0, 62, 0,
];
const B_MAP = [38, 38, 45, 38, 43, 43, 41, 43, 39, 39, 46, 39, 38, 41, 45, 45];

// "Hearth and Banner" — HQ / church. Warm hymn in F.
const M_HQ = [
  65, 0, 0, 69, 0, 0, 72, 0,
  0, 0, 74, 0, 72, 0, 69, 0,
  70, 0, 0, 74, 0, 0, 77, 0,
  0, 0, 76, 0, 74, 0, 72, 0,
  65, 0, 0, 69, 0, 0, 72, 0,
  0, 0, 77, 0, 76, 0, 74, 0,
  72, 0, 70, 0, 69, 0, 67, 0,
  65, 0, 64, 0, 65, 0, 0, 0,
];
const B_HQ = [41, 0, 48, 0, 46, 0, 50, 0, 41, 0, 48, 0, 43, 0, 41, 0];

// "The Betrayer's Crown" — boss. Grinding menace in C minor.
const M_BOSS = [
  48, 48, 0, 51, 48, 0, 54, 51,
  48, 48, 0, 51, 55, 0, 54, 51,
  47, 47, 0, 50, 47, 0, 53, 50,
  47, 48, 50, 51, 53, 54, 56, 59,
  60, 0, 56, 54, 60, 0, 56, 54,
  59, 0, 55, 53, 59, 0, 55, 53,
  60, 59, 56, 54, 53, 51, 50, 48,
  47, 0, 50, 0, 48, 0, 0, 0,
];
const B_BOSS = [36, 36, 36, 34, 36, 36, 36, 33, 35, 35, 35, 34, 32, 33, 35, 36];

// "Dawn Over Mooregard" — ending. Broad and golden in G.
const M_END = [
  67, 0, 71, 0, 74, 0, 79, 0,
  78, 0, 74, 0, 76, 0, 78, 0,
  79, 0, 74, 0, 71, 0, 67, 0,
  69, 0, 71, 0, 72, 0, 74, 0,
  76, 0, 79, 0, 83, 0, 81, 0,
  79, 0, 78, 0, 76, 0, 74, 0,
  72, 74, 76, 78, 79, 81, 83, 84,
  86, 0, 83, 0, 79, 0, 0, 0,
];
const B_END = [43, 43, 47, 47, 50, 50, 48, 48, 40, 40, 45, 45, 50, 48, 43, 43];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.16, lead: 'brass', drums: true },
  map: { melody: M_MAP, bass: B_MAP, stepDur: 0.13, lead: 'brass', drums: true },
  hq: { melody: M_HQ, bass: B_HQ, stepDur: 0.18, lead: 'triangle', drums: false },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.115, lead: 'saw', drums: true },
  ending: { melody: M_END, bass: B_END, stepDur: 0.17, lead: 'brass', drums: false },
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

  // Genesis-ish "FM brass": two detuned saws with a soft attack.
  brass(f, dur, vol = 1, when = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    for (const det of [0, 4]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = Math.max(20, f);
      o.detune.value = det;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vol * 0.28, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(dest || this.master);
      o.start(t); o.stop(t + dur + 0.02);
    }
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
      if (m) {
        if (tr.lead === 'brass') this.brass(midi(m), tr.stepDur * 1.9, 0.9, when, this.musicGain);
        else if (tr.lead === 'saw') this.tone('sawtooth', midi(m), 0, tr.stepDur * 0.92, 0.4, when, this.musicGain);
        else this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.92, 0.5, when, this.musicGain);
      }
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.4, 0.62, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.26, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.14, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  jingle(seq, stepT = 0.13, tail = 0.5) {
    if (!this.ctx) return;
    seq.forEach((m, i) => {
      if (m) {
        this.brass(midi(m), stepT * 2, 0.9, i * stepT);
        this.tone('square', midi(m) * 2, 0, stepT * 0.9, 0.15, i * stepT);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * stepT + tail;
  }

  victory() { this.jingle([67, 67, 67, 0, 63, 0, 65, 0, 67, 0, 65, 67], 0.11, 0.7); }
  levelUp() { this.jingle([60, 64, 67, 72, 0, 67, 72, 76], 0.1, 0.5); }
  promo() { this.jingle([60, 64, 67, 72, 76, 79, 84, 0, 79, 84, 88], 0.11, 0.7); }
  defeat() { this.jingle([57, 0, 56, 0, 55, 0, 54, 54, 54], 0.19, 0.8); }

  // Combat cut-in sting.
  sting() {
    if (!this.ctx) return;
    this.tone('sawtooth', 220, 110, 0.16, 0.4);
    this.tone('sawtooth', 277, 138, 0.16, 0.35, 0.02);
    this.noise(0.12, 0.3, 1400, 0.02);
  }

  // ---- sfx ----
  cursor() { this.tone('square', 1200, 0, 0.03, 0.2); }
  confirm() { this.tone('square', 880, 1320, 0.07, 0.3); }
  cancel() { this.tone('square', 500, 300, 0.08, 0.25); }
  deny() { this.tone('square', 160, 120, 0.16, 0.4); }
  buy() { this.tone('square', 800, 0, 0.06, 0.3); this.tone('square', 1200, 0, 0.08, 0.3, 0.07); }
  footstep() { this.noise(0.03, 0.12, 2500); }
  hit() { this.noise(0.09, 0.5, 900); this.tone('square', 300, 120, 0.1, 0.35); }
  crit() { this.noise(0.16, 0.6, 700); this.tone('sawtooth', 400, 80, 0.2, 0.5); }
  miss() { this.noise(0.06, 0.2, 3000); }
  blaze() { this.noise(0.3, 0.5, 1500); this.tone('sawtooth', 500, 150, 0.3, 0.3); }
  breath() { this.tone('sawtooth', 180, 50, 0.5, 0.5); this.noise(0.45, 0.5, 500, 0.05); }
  heal() { this.tone('square', 660, 990, 0.1, 0.3); this.tone('square', 880, 1320, 0.12, 0.3, 0.1); }
  egress() { this.tone('square', 400, 1600, 0.4, 0.3); this.noise(0.3, 0.2, 2000, 0.05); }
  die() { this.noise(0.25, 0.5, 600); this.tone('square', 250, 40, 0.3, 0.4); }
  wake() { this.tone('square', 200, 600, 0.12, 0.3); }
  save() { this.jingle([72, 76, 79, 84], 0.09, 0.3); }
  text() { this.tone('square', 1200, 0, 0.02, 0.1); }
}
