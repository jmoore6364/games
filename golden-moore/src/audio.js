// All-synthesized "FM-flavored" audio in a 16-bit fantasy style. Every track
// is an original composition — brooding minor-key basslines, detuned saw
// leads. No Sega melodies.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "March of the Golden One" — stage loop, brooding D minor over a walking bass.
const M_FIELD = [
  62, 0, 0, 62, 65, 0, 62, 0,
  60, 0, 58, 60, 57, 0, 0, 0,
  62, 0, 0, 62, 67, 0, 65, 0,
  63, 0, 62, 60, 62, 0, 0, 0,
  65, 0, 0, 65, 69, 0, 67, 0,
  65, 0, 63, 65, 62, 0, 0, 0,
  58, 0, 60, 62, 63, 0, 62, 60,
  57, 0, 58, 0, 62, 0, 0, 0,
];
const B_FIELD = [38, 38, 45, 38, 36, 36, 43, 36, 34, 34, 41, 34, 33, 33, 36, 38];

// "Bone Tide" — later stages, darker G minor churn.
const M_DARK = [
  55, 0, 58, 0, 62, 0, 58, 55,
  54, 0, 58, 0, 61, 0, 58, 54,
  55, 0, 58, 0, 62, 0, 63, 62,
  60, 58, 55, 0, 54, 0, 55, 0,
  67, 0, 65, 63, 62, 0, 58, 0,
  66, 0, 65, 61, 58, 0, 54, 0,
  55, 0, 58, 62, 63, 62, 60, 58,
  55, 0, 54, 0, 55, 0, 0, 0,
];
const B_DARK = [31, 31, 38, 31, 30, 30, 37, 30, 31, 31, 38, 31, 26, 28, 30, 30];

// "Skull Throne" — boss battle, hammering F minor.
const M_BOSS = [
  53, 53, 56, 53, 60, 0, 58, 56,
  53, 53, 56, 53, 61, 0, 60, 58,
  53, 53, 56, 53, 60, 0, 63, 61,
  60, 58, 56, 58, 53, 0, 52, 0,
  65, 0, 63, 61, 65, 0, 63, 61,
  64, 0, 61, 58, 64, 0, 61, 58,
  60, 61, 63, 65, 66, 65, 63, 61,
  60, 0, 56, 0, 53, 0, 0, 0,
];
const B_BOSS = [41, 41, 41, 40, 41, 41, 41, 39, 41, 41, 41, 40, 37, 38, 39, 40];

// "Thief's Campfire" — bonus camp, sneaky and light.
const M_CAMP = [
  69, 0, 67, 69, 72, 0, 69, 0,
  67, 0, 64, 67, 69, 0, 0, 0,
  69, 0, 67, 69, 74, 0, 72, 0,
  71, 0, 67, 64, 69, 0, 0, 0,
];
const B_CAMP = [45, 52, 45, 52, 43, 50, 43, 50];

// "Crown of Dawn" — victory ride, A major and wide open.
const M_END = [
  69, 0, 73, 76, 81, 0, 80, 76,
  78, 0, 74, 78, 83, 0, 81, 0,
  69, 0, 73, 76, 81, 83, 85, 86,
  88, 0, 85, 0, 83, 0, 81, 0,
];
const B_END = [45, 45, 50, 50, 52, 52, 54, 54];

// "The Axe Falls" — title attract loop, slow doom in D.
const M_TITLE = [
  50, 0, 0, 0, 53, 0, 55, 0,
  56, 0, 55, 0, 53, 0, 50, 0,
  50, 0, 0, 0, 53, 0, 57, 0,
  55, 0, 53, 0, 50, 0, 0, 0,
];
const B_TITLE = [26, 26, 26, 26, 25, 25, 26, 26];

const TRACKS = {
  field: { melody: M_FIELD, bass: B_FIELD, stepDur: 0.135, lead: 'sawtooth', drums: true },
  dark: { melody: M_DARK, bass: B_DARK, stepDur: 0.13, lead: 'sawtooth', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.105, lead: 'sawtooth', drums: true },
  camp: { melody: M_CAMP, bass: B_CAMP, stepDur: 0.14, lead: 'square', drums: true },
  ending: { melody: M_END, bass: B_END, stepDur: 0.15, lead: 'sawtooth', drums: false },
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.2, lead: 'sawtooth', drums: true },
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
      this.musicGain.gain.value = 0.42;
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

  // Detuned saw pair — the poor man's FM patch.
  lead(f, dur, vol, when = 0, dest = null, type = 'sawtooth') {
    this.tone(type, f, 0, dur, vol * 0.6, when, dest);
    this.tone(type, f * 1.007, 0, dur, vol * 0.4, when, dest);
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
      if (m) this.lead(midi(m), tr.stepDur * 0.92, 0.42, when, this.musicGain, tr.lead);
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) {
          this.tone('square', midi(b), 0, tr.stepDur * 3.2, 0.4, when, this.musicGain);
          this.tone('triangle', midi(b) / 2, 0, tr.stepDur * 3.6, 0.55, when, this.musicGain);
        }
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.06, 0.32, 700, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.15, 6000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  // Dramatic title sting: a low power-chord slam and a rising cry.
  titleSting() {
    if (!this.ctx) return;
    this.tone('sawtooth', midi(26), 0, 1.2, 0.6);
    this.tone('sawtooth', midi(33), 0, 1.2, 0.5);
    this.noise(0.5, 0.5, 300);
    [50, 53, 57, 62].forEach((m, i) => this.lead(midi(m), 0.22, 0.5, 0.35 + i * 0.16));
    this.tone('sawtooth', midi(62), midi(62), 0.9, 0.45, 1.0);
    this.jingleUntil = this.ctx.currentTime + 2.0;
  }

  stageClearJingle() {
    if (!this.ctx) return;
    const seq = [57, 60, 64, 69, 0, 67, 69, 0, 72];
    seq.forEach((m, i) => { if (m) this.lead(midi(m), 0.16, 0.5, i * 0.12); });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.12 + 0.4;
  }

  // ---- sfx ----
  slash() { this.noise(0.07, 0.3, 2600); this.tone('sawtooth', 900, 300, 0.06, 0.14); }
  slashBig() { this.noise(0.1, 0.4, 1800); this.tone('sawtooth', 500, 120, 0.12, 0.25); }
  hit() { this.noise(0.06, 0.45, 1100); this.tone('square', 220, 90, 0.07, 0.3); }
  clink() { this.tone('square', 2100, 1600, 0.06, 0.25); this.tone('square', 3100, 2400, 0.04, 0.15, 0.01); }
  thud() { this.noise(0.12, 0.5, 350); this.tone('sine', 130, 50, 0.16, 0.5); }
  grunt() { this.tone('sawtooth', 200, 90, 0.14, 0.3); this.noise(0.1, 0.3, 600); }
  edie() { this.tone('sawtooth', 330, 60, 0.35, 0.4); this.noise(0.22, 0.35, 500); }
  phurt() { this.tone('sawtooth', 260, 110, 0.18, 0.35); this.noise(0.1, 0.3, 800); }
  pdie() { this.tone('sawtooth', 400, 50, 0.7, 0.5); this.noise(0.4, 0.4, 400); }
  jump() { this.tone('square', 220, 430, 0.09, 0.12); }
  land() { this.noise(0.05, 0.2, 350); }
  dash() { this.noise(0.1, 0.2, 1500); }
  potion() { this.tone('square', 700, 1050, 0.07, 0.3); this.tone('square', 1050, 1400, 0.09, 0.3, 0.07); }
  meat() { this.tone('square', 500, 750, 0.08, 0.3); this.tone('square', 750, 1000, 0.1, 0.3, 0.08); }
  fizzle() { this.tone('square', 300, 150, 0.12, 0.2); }
  magic(n = 1) {
    // earth magic: rumble that scales with vials spent
    for (let i = 0; i < 3 + n; i++) this.noise(0.4, 0.5, 220 - i * 18, i * 0.09);
    this.tone('sawtooth', 90, 28, 1.0 + n * 0.12, 0.6);
    this.tone('square', 55, 30, 1.2 + n * 0.1, 0.5, 0.1);
    for (let i = 0; i < n; i++) this.tone('square', 600 + i * 120, 200, 0.2, 0.25, 0.25 + i * 0.1);
  }
  mount() { this.tone('square', 300, 620, 0.12, 0.3); this.tone('sawtooth', 500, 250, 0.15, 0.2, 0.1); }
  dismount() { this.tone('sawtooth', 600, 200, 0.16, 0.3); this.noise(0.1, 0.3, 500); }
  whip() { this.noise(0.09, 0.4, 2000); this.tone('sawtooth', 700, 180, 0.1, 0.2); }
  beastCry() { this.tone('sawtooth', 500, 900, 0.15, 0.25); this.tone('sawtooth', 900, 400, 0.2, 0.2, 0.12); }
  thiefSqueak() { this.tone('square', 1200, 1800, 0.08, 0.25); this.tone('square', 1800, 1300, 0.08, 0.2, 0.08); }
  go() { this.lead(midi(74), 0.1, 0.4); this.lead(midi(79), 0.14, 0.4, 0.1); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  tick() { this.tone('square', 880, 0, 0.05, 0.3); }
  bossRoar() { this.tone('sawtooth', 180, 70, 0.5, 0.5); this.noise(0.35, 0.4, 300); }
  bossDie() {
    for (let i = 0; i < 7; i++) this.noise(0.32, 0.5, 520 - i * 55, i * 0.11);
    this.tone('sawtooth', 200, 26, 1.1, 0.55, 0.1);
  }
  hiScore() { [69, 73, 76, 81].forEach((m, i) => this.lead(midi(m), 0.12, 0.4, i * 0.1)); }
}
