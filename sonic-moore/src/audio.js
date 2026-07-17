// All-synthesized Genesis-flavored audio. Every track is an original
// composition (no Sega melodies). Melodies are midi note numbers,
// 0 = rest, in eighth-note steps.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// "Ring Road" — title screen. Bright and heroic. C major.
const M_TITLE = [
  72, 0, 76, 79, 84, 0, 83, 79,
  81, 0, 79, 76, 79, 0, 0, 0,
  72, 0, 76, 79, 84, 0, 86, 84,
  88, 0, 86, 84, 86, 0, 0, 0,
];
const B_TITLE = [48, 48, 55, 55, 53, 53, 55, 55];

// "Checker Sprint" — Moore Hill Zone. Upbeat, rolling. F major.
const M_HILL = [
  77, 0, 81, 0, 84, 0, 81, 84,
  86, 0, 84, 81, 84, 0, 81, 77,
  77, 0, 81, 0, 84, 0, 86, 88,
  89, 0, 88, 86, 84, 0, 0, 0,
  82, 0, 86, 0, 89, 0, 86, 89,
  91, 0, 89, 86, 89, 0, 86, 82,
  84, 0, 88, 0, 91, 0, 89, 88,
  86, 84, 82, 81, 77, 0, 0, 0,
];
const B_HILL = [41, 41, 48, 41, 46, 46, 53, 46, 41, 41, 48, 41, 43, 43, 48, 48];

// "Vat Runner" — Chemical Moore Zone. Slinky minor funk. G minor.
const M_CHEM = [
  67, 0, 70, 67, 74, 0, 72, 70,
  72, 0, 70, 67, 65, 0, 67, 0,
  67, 0, 70, 67, 74, 0, 75, 77,
  79, 0, 77, 75, 74, 0, 72, 70,
  74, 0, 77, 74, 79, 0, 77, 75,
  77, 0, 75, 72, 70, 0, 72, 0,
  67, 70, 72, 74, 75, 74, 72, 70,
  67, 0, 65, 0, 67, 0, 0, 0,
];
const B_CHEM = [43, 43, 43, 46, 43, 43, 41, 41, 43, 43, 43, 46, 38, 38, 41, 42];

// "Egg Pod Panic" — boss. Pounding. D minor.
const M_BOSS = [
  62, 62, 65, 62, 68, 0, 67, 65,
  62, 62, 65, 62, 69, 0, 68, 65,
  62, 62, 65, 62, 68, 0, 70, 68,
  67, 65, 67, 68, 65, 0, 62, 0,
];
const B_BOSS = [38, 38, 38, 37, 38, 38, 38, 36];

// "Sunset Over Moore Hill" — ending. Warm. C major.
const M_END = [
  76, 0, 79, 84, 88, 0, 86, 84,
  81, 0, 84, 86, 88, 0, 0, 0,
  76, 0, 79, 84, 88, 0, 91, 88,
  86, 0, 84, 81, 84, 0, 0, 0,
];
const B_END = [48, 52, 45, 50, 41, 45, 43, 47];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.13, lead: 'square', drums: true },
  hill: { melody: M_HILL, bass: B_HILL, stepDur: 0.115, lead: 'square', drums: true },
  chem: { melody: M_CHEM, bass: B_CHEM, stepDur: 0.125, lead: 'sawtooth', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.105, lead: 'square', drums: true },
  ending: { melody: M_END, bass: B_END, stepDur: 0.16, lead: 'triangle', drums: false },
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
    this.tempo = 1;
    this.ringFlip = false;
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.45;
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

  setTempo(t) { this.tempo = t; }

  updateMusic() {
    if (!this.ctx || !this.track || this.muted) return;
    if (this.ctx.currentTime < this.jingleUntil) {
      this.nextTime = Math.max(this.nextTime, this.jingleUntil + 0.1);
      return;
    }
    const tr = this.track;
    const stepDur = tr.stepDur / this.tempo;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      const i = this.step % tr.melody.length;
      const when = this.nextTime - this.ctx.currentTime;
      const m = tr.melody[i];
      if (m) this.tone(tr.lead, midi(m), 0, stepDur * 0.92, 0.42, when, this.musicGain);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, stepDur * 3.4, 0.62, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.32, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.16, 6000, when, this.musicGain);
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }

  jingle(seq, stepLen = 0.12, type = 'square') {
    if (!this.ctx) return;
    seq.forEach((m, i) => {
      if (m) {
        this.tone(type, midi(m), 0, stepLen * 1.2, 0.45, i * stepLen);
        this.tone(type, midi(m) * 2.003, 0, stepLen, 0.18, i * stepLen + 0.015);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * stepLen + 0.35;
  }

  actClear() { this.jingle([72, 72, 72, 76, 0, 79, 76, 79, 84], 0.13); }
  oneUp() { this.jingle([76, 79, 84, 0, 83, 88], 0.09); }
  gameOverTune() { this.jingle([64, 0, 63, 0, 62, 0, 57, 0, 0, 55], 0.16, 'triangle'); }

  // ---- sfx ----
  ring() {
    // the classic two-note sparkle
    this.ringFlip = !this.ringFlip;
    const base = this.ringFlip ? 987.8 : 987.8;
    this.tone('square', base, 0, 0.06, 0.3);
    this.tone('square', 1318.5, 0, 0.22, 0.32, 0.055);
  }
  jump() { this.tone('square', 320, 780, 0.16, 0.28); }
  roll() { this.tone('sawtooth', 500, 160, 0.16, 0.2); this.noise(0.1, 0.14, 2000); }
  skid() { this.noise(0.15, 0.22, 3200); }
  spring() { this.tone('square', 180, 950, 0.22, 0.35); this.tone('triangle', 90, 500, 0.2, 0.3, 0.01); }
  dash() { this.noise(0.25, 0.3, 1200); this.tone('sawtooth', 200, 900, 0.25, 0.25); }
  pop() { this.noise(0.18, 0.45, 900); this.tone('square', 400, 60, 0.18, 0.3); }
  hurt() { this.tone('sawtooth', 500, 120, 0.3, 0.4); }
  scatter() {
    for (let i = 0; i < 8; i++) {
      this.tone('square', 1200 + ((i * 313) % 500), 700, 0.09, 0.2, i * 0.02);
    }
  }
  monitor() { this.pop(); this.tone('square', 660, 990, 0.12, 0.3, 0.05); }
  shieldUp() { this.tone('sine', 300, 700, 0.3, 0.35); }
  checkpoint() { this.tone('square', 880, 0, 0.09, 0.3); this.tone('square', 1174, 0, 0.16, 0.3, 0.1); }
  bossHit() { this.noise(0.08, 0.4, 2500); this.tone('square', 240, 80, 0.15, 0.35); }
  die() { this.tone('sawtooth', 400, 50, 0.6, 0.5); this.noise(0.3, 0.3, 600); }
  splash() { this.noise(0.15, 0.3, 1500); }
  tallyTick() { this.tone('square', 1100, 0, 0.03, 0.2); }
  tallyDone() { this.jingle([79, 84, 88], 0.09); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
}
