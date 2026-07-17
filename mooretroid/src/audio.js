// All-synthesized chiptune audio. Every track is an original composition
// in a lonely sci-fi 8-bit style (no Nintendo melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Alone on Zemoor" — title screen, vast and desolate. A minor.
const M_TITLE = [
  45, 0, 0, 0, 0, 0, 52, 0,
  0, 0, 57, 0, 0, 0, 56, 0,
  0, 0, 0, 0, 52, 0, 0, 0,
  45, 0, 0, 0, 0, 0, 0, 0,
  44, 0, 0, 0, 0, 0, 51, 0,
  0, 0, 56, 0, 0, 0, 59, 0,
  0, 0, 57, 0, 0, 0, 52, 0,
  45, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [33, 0, 33, 33, 32, 0, 32, 32, 33, 0, 33, 33, 31, 31, 32, 32];

// "Blue Caverns" — the starting depths, driving and heroic. E minor.
const M_CAVERN = [
  64, 0, 64, 66, 67, 0, 66, 64,
  62, 0, 62, 64, 66, 0, 64, 62,
  60, 0, 60, 62, 64, 62, 60, 59,
  55, 0, 59, 0, 62, 0, 59, 0,
  64, 0, 64, 66, 67, 0, 69, 71,
  72, 0, 71, 69, 67, 0, 66, 64,
  62, 64, 66, 67, 69, 67, 66, 62,
  64, 0, 64, 0, 64, 0, 0, 0,
];
const B_CAVERN = [40, 40, 38, 38, 36, 36, 35, 38, 40, 40, 38, 38, 36, 38, 40, 40];

// "The Molten Vein" — lava depths, pulsing and uneasy. C# phrygian-ish.
const M_DEPTHS = [
  61, 0, 62, 61, 0, 61, 59, 0,
  61, 0, 62, 61, 64, 0, 62, 0,
  61, 0, 62, 61, 0, 61, 66, 0,
  64, 0, 62, 0, 61, 0, 0, 0,
  57, 0, 59, 57, 0, 57, 56, 0,
  57, 0, 59, 61, 62, 0, 61, 0,
  59, 0, 61, 59, 64, 0, 62, 61,
  59, 0, 57, 0, 56, 0, 0, 0,
];
const B_DEPTHS = [37, 37, 37, 37, 35, 35, 35, 35, 37, 37, 37, 37, 33, 33, 35, 35];

// "Den of the Old Ones" — boss lairs, slow dread. G minor low.
const M_LAIR = [
  43, 0, 0, 46, 0, 0, 43, 0,
  49, 0, 48, 0, 46, 0, 43, 0,
  43, 0, 0, 46, 0, 0, 50, 0,
  48, 0, 46, 0, 44, 0, 43, 0,
  41, 0, 0, 44, 0, 0, 41, 0,
  47, 0, 46, 0, 44, 0, 41, 0,
  43, 0, 46, 0, 48, 0, 49, 0,
  48, 0, 46, 0, 43, 0, 0, 0,
];
const B_LAIR = [31, 31, 31, 31, 29, 29, 29, 29, 31, 31, 31, 31, 28, 28, 31, 31];

// "The Hive" — final area, anxious racing arpeggios. B minor.
const M_HIVE = [
  59, 62, 66, 62, 59, 62, 66, 62,
  58, 62, 65, 62, 58, 62, 65, 62,
  57, 61, 64, 61, 57, 61, 64, 61,
  58, 62, 65, 62, 66, 0, 65, 62,
  59, 63, 66, 63, 71, 0, 69, 66,
  58, 62, 65, 62, 70, 0, 68, 65,
  57, 61, 64, 61, 69, 67, 66, 64,
  62, 0, 61, 0, 59, 0, 0, 0,
];
const B_HIVE = [35, 35, 34, 34, 33, 33, 34, 34, 35, 35, 34, 34, 33, 34, 35, 35];

// "Titan's Wrath" — boss battle, fast and mean. D minor.
const M_BOSS = [
  50, 50, 53, 50, 56, 55, 53, 50,
  50, 50, 53, 50, 57, 0, 56, 53,
  50, 50, 53, 50, 56, 55, 53, 50,
  49, 51, 53, 55, 56, 0, 55, 53,
  58, 0, 56, 53, 58, 0, 56, 53,
  57, 0, 55, 52, 57, 0, 55, 52,
  56, 55, 53, 51, 50, 51, 53, 55,
  56, 0, 55, 0, 50, 0, 0, 0,
];
const B_BOSS = [38, 38, 38, 37, 38, 38, 38, 36, 38, 38, 38, 37, 34, 35, 36, 37];

// "Countdown" — the escape, sirens and sprinting. A minor, relentless.
const M_ESCAPE = [
  69, 68, 69, 68, 69, 0, 64, 0,
  67, 66, 67, 66, 67, 0, 62, 0,
  69, 68, 69, 68, 69, 0, 72, 0,
  71, 0, 69, 0, 68, 0, 64, 0,
  69, 68, 69, 68, 69, 0, 76, 0,
  74, 73, 74, 73, 74, 0, 72, 0,
  71, 69, 68, 66, 64, 66, 68, 69,
  71, 0, 68, 0, 69, 0, 0, 0,
];
const B_ESCAPE = [45, 45, 44, 45, 43, 45, 44, 45, 45, 45, 44, 45, 41, 43, 44, 45];

// "Dawn over the Crater" — ending, hard-won triumph. C major.
const M_END = [
  60, 0, 64, 67, 72, 0, 71, 67,
  69, 0, 65, 69, 74, 0, 72, 0,
  60, 0, 64, 67, 72, 74, 76, 77,
  79, 0, 76, 0, 74, 0, 72, 0,
  65, 69, 72, 76, 77, 76, 74, 72,
  67, 71, 74, 77, 79, 0, 76, 74,
  72, 74, 76, 77, 79, 77, 76, 74,
  77, 0, 74, 0, 72, 0, 0, 0,
];
const B_END = [48, 48, 52, 52, 53, 53, 55, 55, 48, 48, 53, 53, 55, 53, 48, 48];

// "Glasslight" — the crystal hollows, chiming and still. E minor.
const M_CRYSTAL = [
  64, 0, 71, 0, 76, 0, 71, 0,
  74, 0, 71, 0, 67, 0, 64, 0,
  62, 0, 69, 0, 74, 0, 69, 0,
  71, 0, 67, 0, 64, 0, 62, 0,
  64, 0, 71, 0, 79, 0, 76, 0,
  74, 0, 76, 0, 71, 0, 67, 0,
  62, 0, 69, 0, 76, 0, 74, 0,
  64, 0, 0, 0, 64, 0, 0, 0,
];
const B_CRYSTAL = [40, 40, 45, 45, 43, 43, 38, 38, 40, 40, 45, 45, 43, 38, 40, 40];

// "Dead Hull" — the sunken wreck, groaning metal. A minor, slow.
const M_WRECK = [
  57, 0, 0, 0, 55, 0, 57, 0,
  60, 0, 57, 0, 0, 0, 52, 0,
  57, 0, 0, 0, 55, 0, 57, 0,
  63, 0, 62, 0, 60, 0, 57, 0,
  56, 0, 0, 0, 55, 0, 56, 0,
  59, 0, 56, 0, 0, 0, 52, 0,
  57, 0, 55, 0, 53, 0, 52, 0,
  50, 0, 0, 0, 45, 0, 0, 0,
];
const B_WRECK = [33, 33, 33, 33, 31, 31, 31, 31, 33, 33, 33, 33, 29, 29, 31, 31];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.22, lead: 'triangle', drums: false },
  cavern: { melody: M_CAVERN, bass: B_CAVERN, stepDur: 0.13, lead: 'square', drums: true },
  depths: { melody: M_DEPTHS, bass: B_DEPTHS, stepDur: 0.16, lead: 'square', drums: true },
  lair: { melody: M_LAIR, bass: B_LAIR, stepDur: 0.19, lead: 'triangle', drums: true },
  hive: { melody: M_HIVE, bass: B_HIVE, stepDur: 0.115, lead: 'square', drums: true },
  crystal: { melody: M_CRYSTAL, bass: B_CRYSTAL, stepDur: 0.17, lead: 'triangle', drums: false },
  wreck: { melody: M_WRECK, bass: B_WRECK, stepDur: 0.18, lead: 'square', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.105, lead: 'square', drums: true },
  escape: { melody: M_ESCAPE, bass: B_ESCAPE, stepDur: 0.1, lead: 'square', drums: true },
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

  // "A new power courses through the suit" — item fanfare, original.
  itemFanfare() {
    if (!this.ctx) return;
    const seq = [62, 66, 69, 74, 73, 69, 74, 0, 78];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.16, 0.5, i * 0.14);
        this.tone('square', midi(m) * 1.005, 0, 0.16, 0.3, i * 0.14 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.14 + 0.4;
  }

  // ---- sfx ----
  shoot() { this.tone('square', 900, 300, 0.06, 0.25); }
  shootIce() { this.tone('square', 1300, 500, 0.08, 0.25); this.tone('square', 1600, 700, 0.06, 0.15, 0.02); }
  shootWave() { this.tone('square', 700, 250, 0.09, 0.22); this.tone('square', 500, 900, 0.07, 0.15, 0.03); }
  shootCharged() { this.tone('square', 400, 1200, 0.16, 0.4); this.noise(0.12, 0.3, 3000); }
  chargeFull() { this.tone('square', 1400, 1800, 0.06, 0.2); }
  spit() { this.tone('square', 300, 150, 0.1, 0.25); this.noise(0.06, 0.2, 1000); }
  missile() { this.noise(0.2, 0.4, 2000); this.tone('sawtooth', 300, 700, 0.18, 0.2); }
  bombLay() { this.tone('square', 500, 350, 0.06, 0.25); }
  boom() { this.noise(0.25, 0.55, 600); this.tone('square', 160, 40, 0.2, 0.35); }
  door() { this.noise(0.14, 0.35, 1200); this.tone('square', 300, 700, 0.12, 0.25); }
  doorShut() { this.noise(0.1, 0.3, 700); this.tone('square', 500, 250, 0.1, 0.22); }
  hurt() { this.tone('sawtooth', 350, 90, 0.22, 0.5); this.noise(0.13, 0.3, 500); }
  enemyDie() { this.noise(0.2, 0.5, 800); this.tone('square', 300, 40, 0.22, 0.35); }
  enemyHit() { this.noise(0.05, 0.3, 1500); }
  clink() { this.tone('square', 1800, 1400, 0.05, 0.2); }
  pickup() { this.tone('square', 660, 990, 0.07, 0.3); this.tone('square', 990, 1320, 0.07, 0.3, 0.07); }
  energy() { this.tone('square', 880, 1100, 0.05, 0.25); }
  morph() { this.tone('square', 700, 250, 0.12, 0.3); }
  unmorph() { this.tone('square', 250, 700, 0.12, 0.3); }
  jump() { this.tone('square', 220, 440, 0.08, 0.12); }
  screw() { this.tone('square', 500, 1400, 0.22, 0.18); this.tone('square', 700, 1800, 0.2, 0.12, 0.05); }
  land() { this.noise(0.04, 0.2, 400); }
  freeze() { this.tone('square', 2000, 2600, 0.12, 0.3); this.tone('square', 2600, 3100, 0.1, 0.2, 0.1); }
  latch() { this.tone('sawtooth', 200, 400, 0.15, 0.3); }
  drain() { this.tone('sawtooth', 400, 200, 0.1, 0.2); }
  elevator() { this.tone('triangle', 200, 100, 0.8, 0.4); this.noise(0.7, 0.2, 300); }
  statue() { this.tone('triangle', 150, 80, 0.6, 0.5); this.noise(0.5, 0.3, 250); }
  zebHit() { this.noise(0.1, 0.4, 1000); this.tone('square', 500, 200, 0.12, 0.3); }
  alarm() { this.tone('sawtooth', 700, 500, 0.25, 0.18); }
  tick() { this.tone('square', 1500, 0, 0.03, 0.2); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
  bigBoom() {
    for (let i = 0; i < 10; i++) this.noise(0.4, 0.6, 700 - i * 50, i * 0.1);
    this.tone('sawtooth', 180, 25, 1.4, 0.6, 0.1);
  }
  refill() { this.tone('square', 700, 1050, 0.05, 0.2); }
  text() { this.tone('square', 1200, 0, 0.02, 0.12); }
  deny() { this.tone('square', 160, 120, 0.16, 0.4); }
}
