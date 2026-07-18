// All-synthesized WebAudio chiptune. Every track is an original composition
// in a moonlit minor-key arcade-horror style (no Capcom melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Moonrise Over Moore Manor" — title, tolling and patient. D minor.
const M_TITLE = [
  50, 0, 0, 0, 53, 0, 0, 0,
  57, 0, 55, 0, 53, 0, 50, 0,
  50, 0, 0, 0, 53, 0, 57, 0,
  58, 0, 57, 0, 53, 0, 0, 0,
  50, 0, 0, 0, 53, 0, 0, 0,
  57, 0, 58, 0, 60, 0, 61, 0,
  60, 0, 58, 0, 57, 0, 53, 0,
  50, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [38, 0, 38, 0, 34, 0, 34, 0, 38, 0, 38, 0, 33, 0, 34, 0];

// "Six Feet Shallow" — the graveyard march. D minor, restless.
// Reused for the Crystal Caves as a slower triangle-lead variation.
const M_GRAVE = [
  50, 0, 53, 0, 57, 0, 53, 0,
  58, 0, 57, 0, 53, 50, 0, 0,
  50, 0, 53, 0, 57, 0, 60, 0,
  58, 0, 57, 0, 55, 53, 0, 0,
  50, 0, 53, 0, 57, 0, 53, 0,
  58, 0, 60, 0, 61, 0, 60, 58,
  57, 0, 55, 0, 57, 0, 61, 0,
  62, 0, 57, 0, 50, 0, 0, 0,
];
const B_GRAVE = [38, 38, 38, 0, 34, 34, 34, 0, 36, 36, 36, 0, 33, 33, 34, 0];

// "Rickety Bones" — the forest, skittering. E minor.
// Reused for the Castle Walls as a faster, grimmer variation.
const M_FOREST = [
  52, 0, 55, 56, 55, 0, 52, 0,
  59, 0, 58, 0, 55, 0, 52, 0,
  52, 0, 55, 56, 55, 0, 59, 0,
  60, 0, 59, 0, 56, 0, 52, 0,
  57, 0, 60, 61, 60, 0, 57, 0,
  64, 0, 63, 0, 60, 0, 57, 0,
  55, 56, 58, 59, 61, 0, 62, 0,
  64, 0, 59, 0, 52, 0, 0, 0,
];
const B_FOREST = [40, 0, 40, 40, 36, 0, 36, 36, 40, 0, 40, 40, 35, 35, 36, 0];

// "Frostbitten Chapel" — ice village, glassy bells. A minor.
const M_ICE = [
  69, 0, 72, 0, 76, 0, 72, 0,
  77, 0, 76, 0, 72, 0, 69, 0,
  68, 0, 71, 0, 76, 0, 71, 0,
  77, 0, 76, 0, 71, 0, 68, 0,
  69, 0, 72, 0, 76, 0, 79, 0,
  81, 0, 79, 0, 77, 0, 76, 0,
  74, 0, 72, 0, 71, 0, 72, 0,
  69, 0, 0, 0, 0, 0, 0, 0,
];
const B_ICE = [45, 0, 45, 0, 41, 0, 41, 0, 44, 0, 44, 0, 40, 0, 41, 0];

// "Astamoore Rises" — the throne and its lord. G minor, all teeth.
const M_BOSS = [
  55, 55, 0, 55, 58, 0, 55, 54,
  55, 55, 0, 55, 61, 0, 60, 58,
  55, 55, 0, 55, 58, 0, 61, 62,
  63, 0, 62, 0, 61, 58, 55, 0,
  63, 0, 61, 0, 63, 0, 61, 0,
  62, 0, 60, 0, 62, 0, 60, 0,
  58, 60, 61, 62, 63, 62, 61, 60,
  58, 0, 55, 0, 54, 0, 55, 0,
];
const B_BOSS = [43, 43, 43, 42, 43, 43, 43, 41, 43, 43, 43, 42, 38, 39, 41, 42];

// "Dawn Over the Ruins" — true ending, at last. F major.
const M_END = [
  65, 0, 69, 0, 72, 0, 77, 0,
  76, 0, 72, 0, 74, 0, 72, 0,
  65, 0, 69, 0, 72, 0, 77, 0,
  79, 0, 77, 0, 76, 0, 72, 0,
  70, 0, 74, 0, 77, 0, 81, 0,
  79, 0, 77, 0, 76, 0, 74, 0,
  72, 74, 76, 77, 79, 0, 81, 0,
  77, 0, 0, 0, 0, 0, 0, 0,
];
const B_END = [41, 0, 45, 0, 46, 0, 48, 0, 41, 0, 46, 0, 48, 46, 41, 0];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.16, lead: 'square', drums: false, toll: true },
  grave: { melody: M_GRAVE, bass: B_GRAVE, stepDur: 0.135, lead: 'square', drums: true },
  caves: { melody: M_GRAVE, bass: B_GRAVE, stepDur: 0.165, lead: 'triangle', drums: true }, // graveyard variation
  forest: { melody: M_FOREST, bass: B_FOREST, stepDur: 0.125, lead: 'square', drums: true },
  castle: { melody: M_FOREST, bass: B_FOREST, stepDur: 0.105, lead: 'sawtooth', drums: true }, // forest variation
  ice: { melody: M_ICE, bass: B_ICE, stepDur: 0.15, lead: 'triangle', drums: true },
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
      if (m) this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.92, tr.lead === 'sawtooth' ? 0.32 : 0.5, when, this.musicGain);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.4, 0.62, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.28, 800, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.14, 6000, when, this.musicGain);
      }
      if (tr.toll && i % 32 === 0) {
        // distant bell over the title
        this.tone('sine', midi(62), midi(61.9), 1.6, 0.4, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // The iconic-feel title sting — rising minor arpeggio into a toll.
  titleSting() {
    if (!this.ctx) return;
    const seq = [50, 53, 57, 62, 61, 62];
    seq.forEach((m, i) => this.tone('square', midi(m), 0, 0.14, 0.4, i * 0.11));
    this.tone('sine', midi(38), 0, 1.4, 0.5, seq.length * 0.11);
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.11 + 0.7;
  }

  // Stage clear fanfare, original.
  clearJingle() {
    if (!this.ctx) return;
    const seq = [57, 60, 64, 69, 0, 68, 69, 0, 72];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.14, 0.5, i * 0.12);
        this.tone('square', midi(m) * 1.005, 0, 0.14, 0.3, i * 0.12 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.12 + 0.4;
  }

  // Death — the bones-collapse jingle, a sad little descent.
  dieJingle() {
    if (!this.ctx) return;
    const seq = [62, 61, 58, 57, 53, 50, 45, 38];
    seq.forEach((m, i) => this.tone('square', midi(m), 0, 0.13, 0.42, i * 0.1));
    this.noise(0.2, 0.3, 900, seq.length * 0.1);
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.1 + 0.5;
  }

  // Map vignette flourish.
  mapJingle() {
    if (!this.ctx) return;
    const seq = [50, 57, 53, 58, 57, 62];
    seq.forEach((m, i) => this.tone('triangle', midi(m), 0, 0.2, 0.45, i * 0.16));
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.16 + 0.3;
  }

  // ---- sfx ----
  throwWeapon() { this.tone('square', 700, 1400, 0.06, 0.2); this.noise(0.04, 0.12, 3000); }
  torchThrow() { this.noise(0.12, 0.2, 1800); this.tone('sawtooth', 300, 500, 0.1, 0.12); }
  ehit() { this.noise(0.04, 0.3, 1600); }
  clink() { this.tone('square', 1900, 1500, 0.05, 0.2); }
  jump() { this.tone('square', 220, 420, 0.08, 0.12); }
  land() { this.noise(0.04, 0.16, 400); }
  // Armor knocked off — clattering metal on stone.
  armorClatter() {
    for (let i = 0; i < 5; i++) {
      this.tone('square', 2200 - i * 300, 1400 - i * 200, 0.05, 0.3, i * 0.07);
      this.noise(0.04, 0.22, 3500 - i * 400, i * 0.07);
    }
  }
  armorOn() { [440, 660, 880, 1100].forEach((f, i) => this.tone('square', f, 0, 0.08, 0.3, i * 0.06)); }
  goldOn() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.32, i * 0.06)); }
  quack() {
    this.tone('square', 480, 300, 0.09, 0.35);
    this.tone('square', 430, 260, 0.1, 0.3, 0.12);
  }
  polymorph() { for (let i = 0; i < 6; i++) this.tone('triangle', 600 + i * 220, 0, 0.08, 0.25, i * 0.04); }
  magicBolt() { this.tone('sawtooth', 900, 250, 0.2, 0.2); }
  groan() { // zombie rising from the dirt
    this.tone('sawtooth', 90, 55, 0.5, 0.32);
    this.noise(0.4, 0.22, 250);
  }
  ghostWail() { this.tone('sine', 500, 900, 0.4, 0.14); this.tone('sine', 505, 910, 0.4, 0.1, 0.05); }
  boneThrow() { this.tone('square', 500, 800, 0.07, 0.15); }
  seedSpit() { this.tone('square', 350, 600, 0.08, 0.16); }
  swoop() { this.tone('sawtooth', 1200, 500, 0.18, 0.14); }
  roar() { this.tone('sawtooth', 190, 70, 0.45, 0.45); this.noise(0.35, 0.3, 350); }
  chestUp() { this.tone('triangle', 200, 400, 0.25, 0.3); this.noise(0.15, 0.18, 600); }
  chestOpen() { this.tone('square', 500, 1000, 0.12, 0.25); this.tone('square', 1000, 1500, 0.1, 0.2, 0.1); }
  collect() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.09, 0.3, 0.07); }
  oneUp() { [660, 880, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.08)); }
  boom() { this.noise(0.22, 0.5, 700); this.tone('square', 200, 40, 0.2, 0.35); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 200, 28, 0.9, 0.5, 0.1);
  }
  timerLow() { this.tone('square', 1100, 0, 0.06, 0.3); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  windGust() { this.noise(0.5, 0.12, 900); }
  stalactite() { this.noise(0.08, 0.25, 2200); }
}
