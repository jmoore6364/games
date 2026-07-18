// All-synthesized chiptune audio, TurboGrafx-ish square/wave timbres.
// Every track is an original composition (no Irem/Konami melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Launch Deck" — title, wide and expectant. A minor.
const M_TITLE = [
  57, 0, 60, 0, 64, 0, 60, 0,
  59, 0, 62, 0, 65, 0, 62, 0,
  57, 0, 60, 0, 64, 0, 67, 0,
  65, 64, 62, 0, 60, 0, 0, 0,
  57, 0, 60, 0, 64, 0, 60, 0,
  59, 0, 62, 0, 65, 0, 69, 0,
  67, 0, 65, 64, 65, 0, 62, 0,
  64, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [45, 0, 45, 45, 43, 0, 43, 43, 45, 0, 45, 45, 41, 41, 43, 43];

// "Debris Run" — stage 1, asteroid approach. Driving E minor.
const M_ST1 = [
  64, 0, 64, 66, 67, 0, 66, 64,
  71, 0, 71, 0, 69, 67, 66, 67,
  64, 0, 64, 66, 67, 0, 69, 71,
  72, 0, 71, 69, 71, 0, 0, 0,
  76, 0, 74, 72, 71, 0, 72, 74,
  76, 0, 74, 72, 71, 0, 69, 67,
  66, 67, 69, 71, 72, 71, 69, 66,
  64, 0, 64, 0, 64, 0, 0, 0,
];
const B_ST1 = [52, 52, 52, 50, 48, 48, 48, 50, 52, 52, 52, 50, 47, 48, 50, 50];

// "Vein Cathedral" — stage 2, the organic corridor. Slithering C# minor.
const M_ST2 = [
  61, 0, 62, 61, 0, 61, 67, 0,
  65, 0, 62, 0, 61, 0, 59, 0,
  61, 0, 62, 61, 0, 61, 68, 0,
  67, 0, 65, 0, 62, 0, 61, 0,
  57, 0, 59, 57, 0, 57, 63, 0,
  61, 0, 59, 0, 57, 0, 56, 0,
  57, 0, 59, 61, 62, 0, 65, 67,
  68, 0, 67, 0, 61, 0, 0, 0,
];
const B_ST2 = [37, 37, 37, 37, 39, 39, 39, 39, 37, 37, 37, 37, 35, 35, 37, 37];

// "Steel Rain" — stage 3, the fleet gauntlet. Punchy D minor.
const M_ST3 = [
  62, 62, 0, 62, 65, 0, 62, 0,
  67, 0, 65, 0, 62, 0, 60, 62,
  62, 62, 0, 62, 65, 0, 69, 0,
  70, 0, 69, 67, 65, 0, 62, 0,
  74, 0, 72, 70, 69, 0, 70, 72,
  74, 0, 72, 70, 69, 0, 67, 65,
  67, 65, 64, 65, 67, 69, 70, 72,
  74, 0, 69, 0, 62, 0, 0, 0,
];
const B_ST3 = [38, 38, 38, 36, 34, 34, 34, 36, 38, 38, 38, 36, 33, 34, 36, 36];

// "Iron Womb" — stage 4, mothership interior. Grinding B minor.
const M_ST4 = [
  59, 0, 59, 62, 59, 0, 65, 64,
  59, 0, 59, 62, 66, 0, 64, 62,
  59, 0, 59, 62, 59, 0, 57, 58,
  59, 0, 62, 0, 64, 0, 66, 0,
  67, 0, 66, 64, 67, 0, 66, 64,
  69, 0, 67, 66, 69, 0, 67, 66,
  71, 0, 69, 67, 66, 64, 62, 61,
  59, 0, 59, 0, 59, 0, 0, 0,
];
const B_ST4 = [47, 47, 47, 47, 45, 45, 45, 45, 47, 47, 47, 47, 42, 42, 45, 45];

// "Red Alert" — boss battle, sirens and teeth. G minor.
const M_BOSS = [
  55, 55, 58, 55, 61, 60, 58, 55,
  55, 55, 58, 55, 62, 0, 61, 58,
  55, 55, 58, 55, 61, 60, 58, 55,
  54, 56, 58, 60, 61, 0, 60, 58,
  63, 0, 61, 58, 63, 0, 61, 58,
  62, 0, 60, 57, 62, 0, 60, 57,
  61, 60, 58, 56, 55, 56, 58, 60,
  61, 0, 60, 0, 55, 0, 0, 0,
];
const B_BOSS = [43, 43, 43, 42, 43, 43, 43, 41, 43, 43, 43, 42, 39, 40, 41, 42];

// "Long Way Home" — victory roll. F major.
const M_END = [
  65, 0, 69, 72, 77, 0, 76, 72,
  74, 0, 70, 74, 79, 0, 77, 0,
  65, 0, 69, 72, 77, 79, 81, 82,
  84, 0, 81, 0, 79, 0, 77, 0,
  70, 74, 77, 81, 82, 81, 79, 77,
  72, 76, 79, 82, 84, 0, 81, 79,
  77, 79, 81, 82, 84, 82, 81, 79,
  82, 0, 79, 0, 77, 0, 0, 0,
];
const B_END = [41, 41, 45, 45, 46, 46, 48, 48, 41, 41, 46, 46, 48, 46, 41, 41];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.15, lead: 'square', drums: true },
  st1: { melody: M_ST1, bass: B_ST1, stepDur: 0.115, lead: 'square', drums: true },
  st2: { melody: M_ST2, bass: B_ST2, stepDur: 0.145, lead: 'triangle', drums: true },
  st3: { melody: M_ST3, bass: B_ST3, stepDur: 0.11, lead: 'square', drums: true },
  st4: { melody: M_ST4, bass: B_ST4, stepDur: 0.125, lead: 'sawtooth', drums: true },
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
    this.chargeOsc = null;
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

  // "Stage clear" fanfare, original.
  clearJingle() {
    if (!this.ctx) return;
    const seq = [57, 60, 64, 69, 0, 67, 69, 0, 72];
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.15, 0.5, i * 0.13);
        this.tone('square', midi(m) * 1.005, 0, 0.15, 0.3, i * 0.13 + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * 0.13 + 0.4;
  }

  // ---- charge hum: a persistent rising oscillator while fire is held ----
  chargeStart() {
    if (!this.ctx || this.chargeOsc) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 90;
    g.gain.value = 0.05;
    o.connect(g).connect(this.master);
    o.start();
    this.chargeOsc = o;
    this.chargeGain = g;
  }

  chargeSet(level) { // level 0..1
    if (!this.chargeOsc) return;
    this.chargeOsc.frequency.value = 90 + level * 620;
    this.chargeGain.gain.value = 0.04 + level * 0.06;
  }

  chargeStop() {
    if (!this.chargeOsc) return;
    const t = this.ctx.currentTime;
    this.chargeGain.gain.setValueAtTime(this.chargeGain.gain.value, t);
    this.chargeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    this.chargeOsc.stop(t + 0.06);
    this.chargeOsc = null;
    this.chargeGain = null;
  }

  // ---- sfx ----
  pea() { this.tone('square', 900, 300, 0.045, 0.18); }
  laser() { this.tone('sawtooth', 1700, 400, 0.1, 0.22); this.tone('square', 2200, 700, 0.07, 0.12, 0.01); }
  wave(tier) { // charge release
    this.tone('sawtooth', 300 + tier * 120, 60, 0.35, 0.5);
    this.noise(0.2, 0.4, 1800);
    this.tone('square', 1400, 200, 0.25, 0.3, 0.02);
  }
  missile() { this.noise(0.09, 0.2, 2600); this.tone('square', 500, 200, 0.1, 0.12); }
  eshoot() { this.tone('square', 480, 170, 0.06, 0.14); }
  boomS() { this.noise(0.12, 0.35, 1200); this.tone('square', 300, 60, 0.1, 0.2); }
  boom() { this.noise(0.22, 0.5, 700); this.tone('square', 200, 40, 0.2, 0.35); }
  bigBoom() {
    for (let i = 0; i < 8; i++) this.noise(0.35, 0.55, 700 - i * 60, i * 0.09);
    this.tone('sawtooth', 180, 25, 1.2, 0.55, 0.1);
  }
  ehit() { this.noise(0.03, 0.25, 1700); }
  clink() { this.tone('square', 1900, 1500, 0.05, 0.2); }
  capsule() { this.tone('square', 700, 1050, 0.07, 0.3); this.tone('square', 1050, 1400, 0.08, 0.3, 0.06); }
  bank() { [740, 932, 1108, 1480].forEach((f, i) => this.tone('square', f, 0, 0.08, 0.32, i * 0.06)); }
  podToggle() { this.tone('square', 500, 1000, 0.09, 0.25); this.tone('square', 1000, 1400, 0.07, 0.2, 0.08); }
  podHit() { this.tone('square', 1600, 1200, 0.04, 0.18); }
  shieldHit() { this.tone('square', 1200, 500, 0.08, 0.25); this.noise(0.05, 0.2, 3000); }
  die() { this.tone('sawtooth', 400, 60, 0.5, 0.5); this.noise(0.3, 0.35, 500); }
  oneUp() { [660, 880, 990, 1320].forEach((f, i) => this.tone('square', f, 0, 0.09, 0.3, i * 0.08)); }
  alarm() { // boss approach siren
    for (let i = 0; i < 4; i++) {
      this.tone('sawtooth', 500, 900, 0.28, 0.3, i * 0.32);
      this.tone('sawtooth', 900, 500, 0.28, 0.3, i * 0.32 + 0.28);
    }
  }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  bossDie() {
    for (let i = 0; i < 6; i++) this.noise(0.3, 0.5, 500 - i * 60, i * 0.12);
    this.tone('sawtooth', 220, 30, 0.9, 0.5, 0.1);
  }
}
