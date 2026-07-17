// All-synthesized chiptune audio. Every track is an original composition
// in a warm 8-bit road-trip-fantasy style (no Square/Enix/Origin melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "The Last Lamplighter" — title, warm and wistful. D major.
const M_TITLE = [
  62, 0, 0, 66, 69, 0, 0, 66,
  67, 0, 66, 64, 62, 0, 0, 0,
  62, 0, 0, 66, 69, 0, 0, 71,
  74, 0, 73, 71, 69, 0, 0, 0,
  67, 0, 0, 71, 74, 0, 0, 71,
  72, 0, 71, 69, 67, 0, 66, 64,
  62, 64, 66, 67, 69, 71, 73, 69,
  74, 0, 69, 0, 66, 0, 62, 0,
];
const B_TITLE = [38, 0, 45, 0, 43, 0, 45, 0, 36, 0, 43, 0, 45, 0, 45, 0];

// "The Ashen Road" — overworld, a walking song. G major.
const M_OVER = [
  67, 0, 69, 71, 74, 0, 71, 0,
  72, 0, 71, 69, 71, 0, 67, 0,
  67, 0, 69, 71, 74, 0, 76, 0,
  78, 0, 76, 74, 71, 0, 74, 0,
  79, 0, 78, 76, 74, 0, 76, 0,
  72, 0, 74, 76, 71, 0, 69, 0,
  67, 69, 71, 72, 74, 72, 71, 69,
  67, 0, 62, 0, 67, 0, 0, 0,
];
const B_OVER = [43, 43, 47, 47, 48, 48, 50, 50, 43, 43, 48, 48, 38, 38, 43, 43];

// "Hearthside" — towns, cozy and slow. C major.
const M_TOWN = [
  64, 0, 0, 67, 0, 0, 72, 0,
  0, 0, 71, 0, 67, 0, 64, 0,
  65, 0, 0, 69, 0, 0, 72, 0,
  0, 0, 71, 0, 69, 0, 65, 0,
  64, 0, 0, 67, 0, 0, 72, 0,
  0, 0, 74, 0, 72, 0, 71, 0,
  69, 0, 72, 0, 67, 0, 65, 0,
  64, 0, 62, 0, 60, 0, 0, 0,
];
const B_TOWN = [48, 0, 55, 0, 53, 0, 55, 0, 48, 0, 55, 0, 50, 0, 48, 0];

// "Under the Old Stones" — dungeons, hollow dread. E minor low.
const M_DUNG = [
  52, 0, 0, 0, 55, 0, 52, 0,
  58, 0, 57, 0, 55, 0, 52, 0,
  51, 0, 0, 0, 55, 0, 51, 0,
  57, 0, 55, 0, 51, 0, 0, 0,
  52, 0, 0, 0, 55, 0, 52, 0,
  60, 0, 58, 0, 57, 0, 55, 0,
  52, 54, 55, 57, 58, 0, 55, 0,
  51, 0, 47, 0, 52, 0, 0, 0,
];
const B_DUNG = [40, 0, 40, 40, 39, 0, 39, 39, 40, 0, 40, 40, 38, 38, 39, 39];

// "Steel and Sparks" — battle, urgent and driving. A minor.
const M_BATTLE = [
  57, 57, 60, 57, 64, 63, 60, 57,
  57, 57, 60, 57, 65, 0, 64, 60,
  56, 56, 59, 56, 63, 62, 59, 56,
  55, 57, 59, 60, 62, 0, 60, 59,
  64, 0, 63, 60, 64, 0, 63, 60,
  65, 0, 64, 60, 65, 0, 64, 60,
  62, 60, 59, 57, 55, 57, 59, 60,
  63, 0, 62, 0, 57, 0, 0, 0,
];
const B_BATTLE = [45, 45, 45, 43, 45, 45, 45, 41, 44, 44, 44, 43, 40, 41, 43, 44];

// "The Duskweaver" — boss battles, grinding menace. C minor.
const M_BOSS = [
  48, 0, 51, 54, 60, 0, 54, 51,
  47, 0, 50, 53, 59, 0, 53, 50,
  48, 0, 51, 54, 60, 0, 63, 0,
  62, 0, 59, 0, 54, 0, 51, 0,
  48, 48, 51, 48, 55, 54, 51, 48,
  47, 47, 50, 47, 56, 0, 55, 51,
  48, 50, 51, 53, 54, 56, 58, 59,
  60, 0, 54, 0, 48, 0, 0, 0,
];
const B_BOSS = [36, 36, 35, 35, 36, 36, 34, 34, 36, 36, 35, 35, 32, 34, 35, 36];

// "The Hearth Relit" — ending, broad and golden. F major.
const M_END = [
  65, 0, 69, 0, 72, 0, 77, 0,
  76, 0, 72, 0, 74, 0, 76, 0,
  77, 0, 72, 0, 69, 0, 65, 0,
  67, 0, 69, 0, 70, 0, 72, 0,
  74, 0, 77, 0, 81, 0, 79, 0,
  77, 0, 76, 0, 74, 0, 72, 0,
  70, 72, 74, 76, 77, 79, 81, 82,
  84, 0, 81, 0, 77, 0, 0, 0,
];
const B_END = [41, 41, 45, 45, 48, 48, 46, 46, 38, 38, 43, 43, 48, 46, 41, 41];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.19, lead: 'triangle', drums: false },
  over: { melody: M_OVER, bass: B_OVER, stepDur: 0.15, lead: 'square', drums: true },
  town: { melody: M_TOWN, bass: B_TOWN, stepDur: 0.18, lead: 'triangle', drums: false },
  dungeon: { melody: M_DUNG, bass: B_DUNG, stepDur: 0.17, lead: 'square', drums: true },
  battle: { melody: M_BATTLE, bass: B_BATTLE, stepDur: 0.105, lead: 'square', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.115, lead: 'square', drums: true },
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
        this.tone('square', midi(m), 0, stepT * 1.1, 0.5, i * stepT);
        this.tone('square', midi(m) * 1.005, 0, stepT * 1.1, 0.3, i * stepT + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * stepT + tail;
  }

  victory() { this.jingle([67, 67, 67, 0, 63, 0, 65, 0, 67, 0, 65, 67], 0.11, 0.7); }
  levelUp() { this.jingle([60, 64, 67, 72, 0, 67, 72, 76], 0.1, 0.5); }
  itemGet() { this.jingle([60, 64, 67, 0, 72], 0.12, 0.5); }
  innRest() { this.jingle([72, 0, 67, 0, 64, 0, 60, 0, 62, 64, 60], 0.14, 0.6); }
  gameOver() { this.jingle([57, 0, 56, 0, 55, 0, 54, 54, 54], 0.19, 0.8); }

  // ---- sfx ----
  cursor() { this.tone('square', 1200, 0, 0.03, 0.2); }
  confirm() { this.tone('square', 880, 1320, 0.07, 0.3); }
  cancel() { this.tone('square', 500, 300, 0.08, 0.25); }
  deny() { this.tone('square', 160, 120, 0.16, 0.4); }
  buy() { this.tone('square', 800, 0, 0.06, 0.3); this.tone('square', 1200, 0, 0.08, 0.3, 0.07); }
  gold() { this.tone('square', 1320, 0, 0.05, 0.3); this.tone('square', 1760, 0, 0.08, 0.3, 0.05); }
  chest() { this.tone('square', 500, 700, 0.08, 0.3); this.tone('square', 700, 1050, 0.1, 0.3, 0.09); }
  door() { this.noise(0.12, 0.3, 1000); this.tone('square', 300, 500, 0.1, 0.2); }
  stairs() { this.tone('triangle', 300, 120, 0.4, 0.4); this.noise(0.3, 0.2, 400); }
  save() { this.jingle([72, 76, 79, 84], 0.09, 0.3); }
  hit() { this.noise(0.09, 0.5, 900); this.tone('square', 300, 120, 0.1, 0.35); }
  crit() { this.noise(0.16, 0.6, 700); this.tone('sawtooth', 400, 80, 0.2, 0.5); }
  miss() { this.noise(0.06, 0.2, 3000); }
  hurt() { this.tone('sawtooth', 350, 90, 0.2, 0.5); this.noise(0.12, 0.3, 500); }
  fire() { this.noise(0.3, 0.5, 1500); this.tone('sawtooth', 500, 150, 0.3, 0.3); }
  storm() { this.noise(0.35, 0.6, 2500); this.tone('sawtooth', 900, 100, 0.3, 0.3, 0.05); }
  heal() { this.tone('square', 660, 990, 0.1, 0.3); this.tone('square', 880, 1320, 0.12, 0.3, 0.1); }
  flee() { this.tone('square', 900, 200, 0.3, 0.3); }
  encounter() { this.noise(0.2, 0.4, 1800); this.tone('square', 200, 600, 0.25, 0.3); }
  bossRoar() { this.tone('sawtooth', 180, 60, 0.5, 0.5); this.noise(0.35, 0.4, 350, 0.05); }
  die() { this.noise(0.25, 0.5, 600); this.tone('square', 250, 40, 0.3, 0.4); }
  text() { this.tone('square', 1200, 0, 0.02, 0.1); }
}
