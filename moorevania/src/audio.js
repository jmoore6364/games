// All-synthesized chiptune audio. Every track is an original composition
// in a gothic 8-bit style (no Konami melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Moorlach Road" — driving overworld theme, D minor.
const M_DAY = [
  62, 0, 65, 62, 69, 65, 62, 60,
  62, 0, 65, 62, 70, 69, 65, 0,
  60, 0, 64, 60, 67, 64, 60, 58,
  57, 60, 64, 60, 57, 0, 55, 57,
  62, 0, 65, 62, 69, 65, 70, 69,
  72, 70, 69, 65, 67, 64, 62, 0,
  58, 62, 65, 62, 57, 60, 64, 60,
  55, 58, 62, 58, 62, 0, 62, 0,
];
const B_DAY = [38, 38, 36, 36, 34, 33, 31, 33, 38, 38, 36, 36, 34, 33, 38, 38];

// "The Horrible Night" — slow, eerie, A minor.
const M_NIGHT = [
  57, 0, 0, 60, 59, 0, 57, 0,
  56, 0, 0, 59, 57, 0, 53, 0,
  52, 0, 55, 59, 62, 0, 59, 0,
  57, 0, 56, 0, 57, 0, 0, 0,
  53, 0, 57, 60, 65, 0, 60, 0,
  52, 0, 55, 59, 64, 0, 59, 0,
  50, 0, 53, 57, 56, 55, 53, 52,
  45, 0, 0, 0, 44, 0, 45, 0,
];
const B_NIGHT = [45, 45, 44, 44, 43, 43, 41, 44, 41, 41, 40, 40, 38, 38, 33, 32];

// "Doleful Hollow" — the town, gentle dorian waltz.
const M_TOWN = [
  64, 67, 69, 0, 71, 69, 67, 64,
  66, 67, 69, 67, 66, 62, 64, 0,
  64, 67, 69, 0, 74, 71, 69, 67,
  66, 64, 62, 64, 66, 0, 67, 0,
  69, 0, 71, 72, 74, 72, 71, 69,
  67, 0, 69, 71, 72, 0, 69, 0,
  64, 67, 69, 71, 72, 71, 69, 66,
  64, 0, 62, 0, 64, 0, 0, 0,
];
const B_TOWN = [40, 40, 45, 45, 43, 43, 47, 47, 45, 45, 43, 43, 40, 43, 45, 45];

// "Halls of Dust" — manor theme, tense arpeggios, C minor-ish.
const M_MANOR = [
  57, 60, 63, 60, 57, 60, 63, 60,
  56, 59, 63, 59, 56, 59, 63, 59,
  55, 58, 62, 58, 55, 58, 62, 58,
  56, 59, 63, 59, 64, 0, 63, 59,
  57, 60, 63, 60, 65, 63, 60, 57,
  56, 59, 63, 59, 63, 62, 59, 56,
  53, 57, 60, 57, 55, 58, 62, 58,
  56, 0, 59, 0, 57, 0, 0, 0,
];
const B_MANOR = [45, 45, 44, 44, 43, 43, 44, 44, 45, 45, 44, 44, 41, 43, 45, 45];

// "Fangs Bared" — boss battle, fast and mean.
const M_BOSS = [
  50, 53, 50, 55, 50, 56, 55, 53,
  50, 53, 50, 55, 56, 58, 56, 55,
  50, 53, 50, 55, 50, 56, 55, 53,
  58, 56, 55, 53, 50, 0, 49, 0,
  53, 56, 53, 58, 53, 59, 58, 56,
  53, 56, 53, 58, 59, 61, 59, 58,
  50, 53, 50, 55, 50, 56, 55, 53,
  46, 48, 49, 51, 50, 0, 50, 0,
];
const B_BOSS = [38, 38, 38, 38, 37, 37, 36, 37, 41, 41, 41, 41, 38, 38, 34, 37];

// "The Hunter's Vigil" — title screen, solemn bells.
const M_TITLE = [
  57, 0, 0, 0, 60, 0, 0, 0,
  64, 0, 63, 0, 60, 0, 57, 0,
  59, 0, 0, 0, 62, 0, 0, 0,
  57, 0, 56, 0, 57, 0, 0, 0,
  53, 0, 0, 0, 57, 0, 0, 0,
  60, 0, 59, 0, 56, 0, 52, 0,
  57, 0, 60, 0, 64, 0, 63, 0,
  57, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [45, 45, 43, 43, 44, 44, 45, 45, 41, 41, 40, 40, 45, 44, 45, 45];

// "Dawn over Moorlach" — ending, hopeful major.
const M_END = [
  60, 64, 67, 72, 71, 67, 69, 0,
  65, 69, 72, 77, 76, 72, 74, 0,
  60, 64, 67, 72, 74, 76, 77, 79,
  76, 0, 74, 0, 72, 0, 0, 0,
  65, 69, 72, 76, 74, 72, 71, 69,
  67, 71, 74, 79, 77, 74, 72, 0,
  65, 67, 69, 71, 72, 74, 76, 77,
  79, 0, 76, 0, 72, 0, 0, 0,
];
const B_END = [48, 48, 53, 53, 55, 55, 48, 48, 53, 53, 55, 55, 60, 55, 48, 48];

// "Below the Quiet Ones" — the catacombs, deep and slow.
const M_CATA = [
  45, 0, 52, 0, 57, 0, 52, 0,
  45, 0, 52, 0, 58, 57, 0, 0,
  43, 0, 50, 0, 55, 0, 50, 0,
  45, 0, 52, 0, 45, 0, 0, 0,
  41, 0, 48, 0, 53, 0, 48, 0,
  43, 0, 50, 0, 55, 53, 0, 0,
  40, 0, 47, 0, 52, 0, 55, 0,
  45, 0, 0, 0, 33, 0, 0, 0,
];
const B_CATA = [33, 33, 31, 31, 29, 29, 28, 31, 33, 33, 31, 31, 28, 28, 33, 33];

// "The Drowned Quarter" — a waterlogged shanty for Vireton.
const M_PORT = [
  60, 0, 64, 67, 0, 64,
  60, 0, 64, 67, 0, 64,
  62, 0, 65, 69, 0, 65,
  62, 0, 65, 69, 0, 65,
  64, 0, 67, 72, 0, 67,
  62, 0, 65, 69, 0, 65,
  60, 0, 64, 67, 64, 62,
  60, 0, 0, 55, 0, 0,
];
const B_PORT = [36, 36, 43, 38, 38, 43, 40, 38, 36, 43, 38, 36];

const TRACKS = {
  day: { melody: M_DAY, bass: B_DAY, stepDur: 0.125, lead: 'square', drums: true },
  night: { melody: M_NIGHT, bass: B_NIGHT, stepDur: 0.185, lead: 'triangle', drums: false },
  town: { melody: M_TOWN, bass: B_TOWN, stepDur: 0.15, lead: 'square', drums: false },
  manor: { melody: M_MANOR, bass: B_MANOR, stepDur: 0.135, lead: 'square', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.105, lead: 'square', drums: true },
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.21, lead: 'triangle', drums: false },
  cata: { melody: M_CATA, bass: B_CATA, stepDur: 0.2, lead: 'triangle', drums: false },
  port: { melody: M_PORT, bass: B_PORT, stepDur: 0.155, lead: 'triangle', drums: false },
  ending: { melody: M_END, bass: B_END, stepDur: 0.16, lead: 'square', drums: false },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
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

  // ---- sfx ----
  whip() { this.noise(0.07, 0.5, 2600); this.tone('square', 600, 140, 0.07, 0.25); }
  whipHit() { this.noise(0.09, 0.6, 1200); this.tone('square', 200, 60, 0.1, 0.4); }
  hurt() { this.tone('sawtooth', 350, 90, 0.25, 0.5); this.noise(0.15, 0.3, 500); }
  enemyDie() { this.noise(0.22, 0.5, 800); this.tone('square', 300, 40, 0.25, 0.35); }
  heart() { this.tone('square', 880, 1320, 0.09, 0.35); }
  pickup() { this.tone('square', 660, 990, 0.08, 0.3); this.tone('square', 990, 1320, 0.08, 0.3, 0.08); }
  buy() { [880, 1108, 1318, 1760].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.07)); }
  deny() { this.tone('square', 160, 120, 0.18, 0.4); }
  door() { this.noise(0.18, 0.3, 300); this.tone('triangle', 140, 90, 0.2, 0.4); }
  breakBlock() { this.noise(0.16, 0.5, 700); this.tone('square', 240, 70, 0.14, 0.3); }
  throwSub() { this.tone('square', 500, 900, 0.1, 0.3); }
  flame() { this.noise(0.35, 0.4, 1800); }
  levelup() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone('square', f, 0, 0.12, 0.4, i * 0.08)); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
  nightFall() { this.tone('triangle', 220, 110, 0.7, 0.55); this.tone('triangle', 233, 110, 0.7, 0.4, 0.05); }
  dawn() { [440, 554, 659, 880].forEach((f, i) => this.tone('triangle', f, 0, 0.3, 0.4, i * 0.12)); }
  stake() { this.noise(0.12, 0.6, 900); this.tone('square', 180, 50, 0.2, 0.5); }
  relic() { [587, 740, 880, 1174, 1480].forEach((f, i) => this.tone('square', f, 0, 0.16, 0.4, i * 0.1)); }
  save() { [784, 988, 1175].forEach((f, i) => this.tone('triangle', f, 0, 0.25, 0.4, i * 0.14)); }
  text() { this.tone('square', 1200, 0, 0.02, 0.12); }
  stairs() { this.noise(0.05, 0.2, 1500); }
  land() { this.noise(0.04, 0.2, 400); }
}
