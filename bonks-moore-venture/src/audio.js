// All-synthesized chiptune audio in a bubbly TurboGrafx-16 mascot style.
// Every track is an original composition — bright major keys, bouncy
// square leads over round triangle bass (no Hudson melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Big Head, Bigger Heart" — title screen. C major, grinning.
const M_TITLE = [
  72, 0, 76, 72, 79, 0, 76, 79,
  84, 0, 83, 81, 79, 0, 76, 0,
  77, 0, 81, 77, 84, 0, 81, 84,
  79, 0, 77, 76, 74, 0, 72, 0,
  72, 0, 76, 72, 79, 0, 76, 79,
  84, 0, 86, 84, 83, 0, 79, 0,
  81, 79, 77, 79, 76, 74, 72, 74,
  72, 0, 0, 72, 72, 0, 0, 0,
];
const B_TITLE = [48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 55, 55, 50, 53, 48, 48];

// "Smiley Meadows" — Grasslands, skipping along. F major.
const M_GRASS = [
  65, 0, 69, 65, 72, 0, 69, 72,
  77, 0, 76, 72, 74, 72, 69, 0,
  65, 0, 69, 65, 72, 0, 74, 76,
  77, 76, 74, 72, 69, 67, 65, 0,
  70, 0, 74, 70, 77, 0, 74, 77,
  81, 0, 79, 77, 76, 74, 72, 0,
  72, 74, 76, 77, 79, 77, 76, 74,
  72, 0, 69, 0, 65, 0, 0, 0,
];
const B_GRASS = [41, 41, 45, 45, 46, 46, 48, 48, 41, 41, 46, 46, 48, 46, 41, 41];

// "Chomp the Cliffs" — Waterfall Cliffs, rising arpeggios. D major.
const M_FALLS = [
  62, 66, 69, 74, 78, 74, 69, 66,
  62, 66, 69, 74, 78, 0, 79, 0,
  64, 67, 71, 76, 79, 76, 71, 67,
  62, 66, 69, 74, 78, 0, 81, 0,
  79, 0, 78, 76, 74, 0, 76, 78,
  79, 0, 78, 76, 74, 0, 71, 69,
  67, 69, 71, 74, 76, 74, 71, 67,
  66, 0, 62, 0, 62, 0, 0, 0,
];
const B_FALLS = [38, 38, 45, 45, 43, 43, 45, 45, 38, 38, 43, 43, 45, 43, 38, 38];

// "Geyser Boogie" — Lava Crater, hot-footed. D mixolydian.
const M_LAVA = [
  62, 0, 62, 64, 65, 64, 62, 0,
  69, 0, 69, 0, 67, 65, 64, 65,
  62, 0, 62, 64, 65, 64, 62, 0,
  72, 0, 71, 69, 67, 65, 64, 0,
  74, 0, 72, 0, 69, 0, 72, 0,
  74, 0, 76, 74, 72, 69, 67, 69,
  65, 67, 69, 72, 74, 72, 69, 65,
  62, 0, 62, 0, 62, 0, 0, 0,
];
const B_LAVA = [38, 38, 38, 36, 38, 38, 38, 36, 43, 43, 41, 41, 38, 36, 38, 38];

// "Penguin Promenade" — Ice Plateau, tiptoe waltz-ish bounce. G major.
const M_ICE = [
  67, 0, 71, 74, 79, 0, 74, 71,
  72, 0, 76, 79, 83, 0, 79, 76,
  67, 0, 71, 74, 79, 0, 81, 83,
  84, 83, 81, 79, 78, 74, 71, 0,
  72, 0, 76, 72, 79, 0, 76, 79,
  83, 81, 79, 78, 79, 0, 74, 0,
  71, 72, 74, 76, 78, 79, 81, 78,
  79, 0, 74, 0, 67, 0, 0, 0,
];
const B_ICE = [43, 43, 50, 50, 48, 48, 50, 50, 43, 43, 48, 48, 50, 48, 43, 43];

// "Waltz of the Weightless" — Moon Palace, floaty and strange. E major.
const M_MOON = [
  64, 0, 68, 71, 76, 0, 0, 0,
  75, 0, 71, 68, 64, 0, 0, 0,
  66, 0, 69, 73, 78, 0, 0, 0,
  76, 0, 73, 69, 66, 0, 0, 0,
  64, 0, 68, 71, 76, 0, 80, 0,
  83, 0, 80, 76, 71, 0, 75, 0,
  76, 0, 75, 73, 71, 69, 68, 66,
  64, 0, 0, 0, 64, 0, 0, 0,
];
const B_MOON = [40, 40, 44, 44, 42, 42, 45, 45, 40, 40, 44, 44, 47, 45, 40, 40];

// "Crown Cracker" — boss battle, teeth out. A minor but grinning.
const M_BOSS = [
  57, 57, 60, 57, 64, 63, 60, 57,
  57, 57, 60, 57, 65, 0, 64, 60,
  57, 57, 60, 57, 64, 63, 60, 57,
  55, 57, 59, 60, 62, 0, 64, 65,
  69, 0, 67, 64, 69, 0, 67, 64,
  70, 0, 69, 65, 70, 0, 69, 65,
  64, 65, 67, 69, 70, 69, 67, 65,
  64, 0, 60, 0, 57, 0, 0, 0,
];
const B_BOSS = [45, 45, 45, 43, 45, 45, 45, 41, 45, 45, 45, 43, 41, 43, 45, 45];

// "MEAT MODE" — the rampage drumbeat. Low riff, drums on every beat.
const M_RAMP = [
  45, 0, 45, 47, 48, 0, 45, 0,
  45, 0, 45, 47, 50, 0, 48, 0,
  45, 0, 45, 47, 48, 0, 45, 0,
  52, 0, 50, 48, 47, 0, 45, 0,
];
const B_RAMP = [33, 33, 33, 33, 33, 33, 36, 35];

// "Fifty Smileys" — bonus room sprint. C major, double-time.
const M_BONUS = [
  72, 76, 79, 84, 79, 76, 72, 76,
  77, 81, 84, 89, 84, 81, 77, 81,
  72, 76, 79, 84, 79, 76, 74, 77,
  79, 77, 76, 74, 72, 0, 67, 0,
];
const B_BONUS = [48, 48, 53, 53, 48, 48, 55, 55];

// "Sunset on the Smiley Sea" — ending, warm and slow. F major.
const M_END = [
  65, 0, 69, 72, 77, 0, 76, 72,
  74, 0, 72, 70, 69, 0, 72, 0,
  65, 0, 69, 72, 77, 79, 81, 0,
  84, 0, 81, 0, 77, 0, 74, 0,
  70, 74, 77, 81, 82, 81, 79, 77,
  76, 0, 79, 0, 77, 0, 72, 0,
  74, 76, 77, 79, 81, 79, 77, 76,
  77, 0, 0, 0, 77, 0, 0, 0,
];
const B_END = [41, 41, 46, 46, 48, 48, 46, 46, 41, 41, 46, 46, 48, 46, 41, 41];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.125, lead: 'square', drums: true },
  grass: { melody: M_GRASS, bass: B_GRASS, stepDur: 0.12, lead: 'square', drums: true },
  falls: { melody: M_FALLS, bass: B_FALLS, stepDur: 0.115, lead: 'square', drums: true },
  lava: { melody: M_LAVA, bass: B_LAVA, stepDur: 0.105, lead: 'square', drums: true },
  ice: { melody: M_ICE, bass: B_ICE, stepDur: 0.125, lead: 'square', drums: true },
  moon: { melody: M_MOON, bass: B_MOON, stepDur: 0.15, lead: 'triangle', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.1, lead: 'square', drums: true },
  rampage: { melody: M_RAMP, bass: B_RAMP, stepDur: 0.095, lead: 'sawtooth', drums: 'heavy' },
  bonus: { melody: M_BONUS, bass: B_BONUS, stepDur: 0.1, lead: 'square', drums: true },
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
      if (tr.drums === 'heavy') {
        // the rampage drumbeat: kick every beat, snare on the off-beats
        if (i % 4 === 0) { this.noise(0.07, 0.5, 500, when, this.musicGain); this.tone('sine', 120, 40, 0.08, 0.6, when, this.musicGain); }
        else if (i % 4 === 2) this.noise(0.05, 0.4, 3000, when, this.musicGain);
        else this.noise(0.02, 0.12, 7000, when, this.musicGain);
      } else if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.3, 900, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.16, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // "Round clear!" — happy fanfare, original.
  clearJingle() {
    if (!this.ctx) return;
    const seq = [72, 76, 79, 84, 0, 83, 84, 0, 88];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.15, 0.5, i * 0.12);
        this.tone('square', midi(m) * 1.005, 0, 0.15, 0.3, i * 0.12 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.12 + 0.4;
  }

  // Meat! The power-up fanfare that plays over the flex freeze-frame.
  meatFanfare(big) {
    if (!this.ctx) return;
    const seq = big ? [60, 64, 67, 72, 76, 79] : [60, 64, 67, 72];
    seq.forEach((m, i) => this.tone('square', midi(m), 0, 0.11, 0.55, i * 0.07));
    this.tone('triangle', midi(36), 0, 0.5, 0.7, 0);
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.07 + 0.25;
  }

  // ---- sfx ----
  bonk() { this.tone('square', 150, 40, 0.12, 0.55); this.noise(0.06, 0.35, 300); }        // satisfying low thump
  swing() { this.noise(0.05, 0.15, 2200); }
  boing() { this.tone('square', 140, 880, 0.16, 0.35); this.tone('square', 200, 1100, 0.12, 0.2, 0.03); }
  chomp() { this.tone('square', 500, 120, 0.05, 0.32); this.noise(0.03, 0.25, 1200); }
  blip() { this.tone('square', 1320, 1980, 0.06, 0.28); }
  fruit() { this.tone('square', 880, 1320, 0.08, 0.3); this.tone('square', 1320, 1760, 0.08, 0.3, 0.06); }
  bloop() { this.tone('triangle', 260, 620, 0.13, 0.3); }
  splash() { this.noise(0.15, 0.3, 1400); this.tone('triangle', 400, 150, 0.12, 0.2); }
  jump() { this.tone('square', 260, 520, 0.08, 0.14); }
  land() { this.noise(0.04, 0.16, 400); }
  shock() { this.noise(0.28, 0.5, 240); this.tone('square', 95, 28, 0.3, 0.5); }
  stunDing() { this.tone('square', 1560, 1170, 0.14, 0.18); }
  hurt() { this.tone('square', 420, 140, 0.16, 0.4); this.noise(0.06, 0.2, 900); }
  die() { [72, 68, 64, 59, 52].forEach((m, i) => this.tone('square', midi(m), 0, 0.14, 0.4, i * 0.11)); }
  esquish() { this.tone('triangle', 320, 90, 0.12, 0.32); this.noise(0.05, 0.2, 800); }
  eshoot() { this.tone('square', 900, 400, 0.06, 0.16); }
  crack() { this.noise(0.05, 0.3, 2600); }
  heart() { [76, 79, 84].forEach((m, i) => this.tone('square', midi(m), 0, 0.09, 0.3, i * 0.07)); }
  bigHeart() { [72, 76, 79, 84, 88].forEach((m, i) => this.tone('square', midi(m), 0, 0.1, 0.35, i * 0.08)); }
  oneUp() { [72, 76, 79, 84, 79, 84].forEach((m, i) => this.tone('square', midi(m), 0, 0.08, 0.32, i * 0.07)); }
  roar() { this.tone('sawtooth', 200, 55, 0.5, 0.5); this.noise(0.35, 0.35, 350); }
  stomp() { this.noise(0.12, 0.5, 300); this.tone('sine', 90, 30, 0.2, 0.6); }
  doorway() { [67, 72, 76, 79].forEach((m, i) => this.tone('triangle', midi(m), 0, 0.09, 0.35, i * 0.06)); }
  tick() { this.tone('square', 2000, 0, 0.03, 0.15); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
}
