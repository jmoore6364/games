// All-synthesized chiptune audio. Every track is an original composition
// in a bright 8-bit fantasy-adventure style (no Nintendo melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "The Shattered Amulet" — title screen, still and mysterious. A minor.
const M_TITLE = [
  57, 0, 0, 0, 60, 0, 64, 0,
  0, 0, 62, 0, 60, 0, 62, 0,
  57, 0, 0, 0, 60, 0, 64, 0,
  69, 0, 67, 0, 64, 0, 0, 0,
  55, 0, 0, 0, 59, 0, 62, 0,
  0, 0, 64, 0, 62, 0, 59, 0,
  57, 0, 60, 0, 64, 0, 67, 0,
  64, 0, 62, 0, 57, 0, 0, 0,
];
const B_TITLE = [33, 0, 33, 0, 31, 0, 31, 0, 29, 0, 29, 0, 28, 0, 31, 0];

// "Fields of Moorule" — overworld march, sunny and brave. F major.
const M_OVER = [
  65, 0, 65, 67, 69, 0, 69, 70,
  72, 0, 70, 69, 70, 0, 69, 67,
  65, 0, 65, 67, 69, 0, 72, 74,
  77, 0, 76, 74, 76, 0, 72, 0,
  74, 0, 72, 70, 72, 0, 70, 69,
  70, 0, 69, 67, 69, 0, 67, 65,
  64, 65, 67, 69, 70, 72, 74, 76,
  77, 0, 72, 0, 69, 0, 65, 0,
];
const B_OVER = [41, 41, 45, 45, 46, 46, 48, 48, 41, 41, 46, 46, 43, 43, 48, 48];

// "Beneath the Roots" — dungeon crawl, hollow and uneasy. D minor.
const M_DUNG = [
  50, 0, 0, 0, 53, 0, 50, 0,
  56, 0, 55, 0, 53, 0, 50, 0,
  49, 0, 0, 0, 53, 0, 49, 0,
  55, 0, 53, 0, 49, 0, 0, 0,
  50, 0, 0, 0, 53, 0, 50, 0,
  58, 0, 56, 0, 55, 0, 53, 0,
  50, 52, 53, 55, 56, 0, 53, 0,
  49, 0, 45, 0, 50, 0, 0, 0,
];
const B_DUNG = [38, 0, 38, 38, 37, 0, 37, 37, 38, 0, 38, 38, 36, 36, 37, 37];

// "Guardian of the Shard" — boss battle, fast and mean. G minor.
const M_BOSS = [
  55, 55, 58, 55, 62, 61, 58, 55,
  55, 55, 58, 55, 63, 0, 62, 58,
  54, 54, 58, 54, 61, 60, 58, 54,
  53, 55, 57, 58, 60, 0, 58, 57,
  62, 0, 61, 58, 62, 0, 61, 58,
  61, 0, 60, 56, 61, 0, 60, 56,
  60, 58, 56, 55, 53, 55, 56, 58,
  61, 0, 60, 0, 55, 0, 0, 0,
];
const B_BOSS = [43, 43, 43, 41, 43, 43, 43, 39, 43, 43, 43, 41, 38, 39, 41, 42];

// "The Shadow King's Hall" — final lair, racing dread. B minor.
const M_LAIR = [
  47, 0, 50, 54, 59, 0, 54, 50,
  46, 0, 50, 53, 58, 0, 53, 50,
  45, 0, 49, 52, 57, 0, 52, 49,
  46, 0, 50, 53, 59, 0, 58, 54,
  47, 0, 50, 54, 59, 0, 62, 0,
  61, 0, 58, 0, 54, 0, 50, 0,
  45, 47, 49, 50, 52, 54, 56, 58,
  59, 0, 54, 0, 47, 0, 0, 0,
];
const B_LAIR = [35, 35, 34, 34, 33, 33, 34, 34, 35, 35, 34, 34, 33, 34, 35, 35];

// "Dawn over Moorule" — ending, bells and sunrise. C major.
const M_END = [
  60, 0, 64, 0, 67, 0, 72, 0,
  71, 0, 67, 0, 69, 0, 71, 0,
  72, 0, 67, 0, 64, 0, 60, 0,
  62, 0, 64, 0, 65, 0, 67, 0,
  69, 0, 72, 0, 76, 0, 74, 0,
  72, 0, 71, 0, 69, 0, 67, 0,
  65, 67, 69, 71, 72, 74, 76, 77,
  79, 0, 76, 0, 72, 0, 0, 0,
];
const B_END = [48, 48, 52, 52, 55, 55, 53, 53, 45, 45, 50, 50, 55, 53, 48, 48];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.21, lead: 'triangle', drums: false },
  over: { melody: M_OVER, bass: B_OVER, stepDur: 0.135, lead: 'square', drums: true },
  dungeon: { melody: M_DUNG, bass: B_DUNG, stepDur: 0.17, lead: 'square', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.105, lead: 'square', drums: true },
  lair: { melody: M_LAIR, bass: B_LAIR, stepDur: 0.12, lead: 'square', drums: true },
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
        if (i % 8 === 0) this.noise(0.05, 0.28, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.15, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // "You got a treasure!" — item fanfare, original.
  itemFanfare() {
    if (!this.ctx) return;
    const seq = [60, 64, 67, 0, 72];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, i === 4 ? 0.5 : 0.15, 0.5, i * 0.13);
        this.tone('square', midi(m) * 1.005, 0, i === 4 ? 0.5 : 0.15, 0.3, i * 0.13 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + 1.3;
  }

  // "A shard of the Amulet!" — the big one.
  shardFanfare() {
    if (!this.ctx) return;
    const seq = [62, 66, 69, 74, 0, 73, 69, 74, 78];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, i === 8 ? 0.6 : 0.16, 0.5, i * 0.15);
        this.tone('square', midi(m) * 1.005, 0, i === 8 ? 0.6 : 0.16, 0.3, i * 0.15 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.15 + 0.7;
  }

  // A secret is revealed — rising chime, original.
  secret() {
    if (!this.ctx) return;
    const seq = [67, 71, 74, 79, 83];
    seq.forEach((m, i) => this.tone('square', midi(m), 0, 0.1, 0.45, i * 0.08));
    this.jingleUntil = this.ctx.currentTime + 0.7;
  }

  gameOver() {
    if (!this.ctx) return;
    const seq = [57, 0, 56, 0, 55, 0, 54, 54, 54];
    seq.forEach((m, i) => { if (m) this.tone('square', midi(m), 0, 0.22, 0.5, i * 0.19); });
    this.jingleUntil = this.ctx.currentTime + 2.0;
  }

  // ---- sfx ----
  sword() { this.tone('square', 700, 200, 0.09, 0.3); this.noise(0.05, 0.2, 3000); }
  beam() { this.tone('square', 900, 1500, 0.12, 0.25); this.tone('square', 1200, 1800, 0.1, 0.15, 0.03); }
  clink() { this.tone('square', 1800, 1400, 0.05, 0.25); }
  enemyHit() { this.noise(0.05, 0.3, 1500); this.tone('square', 400, 200, 0.06, 0.25); }
  enemyDie() { this.noise(0.18, 0.45, 800); this.tone('square', 300, 40, 0.2, 0.35); }
  hurt() { this.tone('sawtooth', 350, 90, 0.22, 0.5); this.noise(0.13, 0.3, 500); }
  heart() { this.tone('square', 880, 1320, 0.08, 0.3); }
  gem() { this.tone('square', 1320, 0, 0.05, 0.3); this.tone('square', 1760, 0, 0.08, 0.3, 0.05); }
  key() { this.tone('square', 1050, 0, 0.06, 0.3); this.tone('square', 1400, 0, 0.1, 0.3, 0.06); }
  unlock() { this.tone('square', 500, 350, 0.08, 0.3); this.noise(0.1, 0.3, 1200, 0.06); }
  doorShut() { this.noise(0.12, 0.4, 500); this.tone('square', 200, 90, 0.14, 0.35); }
  doorOpen() { this.noise(0.14, 0.35, 900); this.tone('square', 250, 500, 0.12, 0.25); }
  bombLay() { this.tone('square', 500, 350, 0.06, 0.25); }
  boom() { this.noise(0.3, 0.6, 600); this.tone('square', 160, 40, 0.25, 0.4); }
  boomerang() { this.tone('square', 1000, 800, 0.04, 0.12); }
  flame() { this.noise(0.2, 0.3, 1800); this.tone('sawtooth', 300, 150, 0.15, 0.15); }
  stairs() { this.tone('triangle', 300, 120, 0.5, 0.4); this.noise(0.4, 0.2, 400); }
  push() { this.noise(0.15, 0.3, 300); this.tone('triangle', 120, 80, 0.16, 0.4); }
  pickup() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.07, 0.3, 0.07); }
  buy() { this.tone('square', 800, 0, 0.06, 0.3); this.tone('square', 600, 0, 0.08, 0.3, 0.07); }
  text() { this.tone('square', 1200, 0, 0.02, 0.12); }
  deny() { this.tone('square', 160, 120, 0.16, 0.4); }
  lowHp() { this.tone('square', 1450, 0, 0.05, 0.2); }
  splash() { this.noise(0.15, 0.3, 1200); }
  bossRoar() { this.tone('sawtooth', 180, 60, 0.5, 0.5); this.noise(0.35, 0.4, 350, 0.05); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
}
