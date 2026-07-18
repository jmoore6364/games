// Moore's Booty — all-synthesized WebAudio: concertina-style square-wave sea
// shanties (original tunes), filtered-noise wave ambience, cannon and steel.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "The Parchment Rose" — title, an old chart unrolled. D dorian, slow.
const M_TITLE = [
  62, 0, 0, 65, 0, 0, 69, 0,
  67, 0, 65, 0, 62, 0, 0, 0,
  60, 0, 0, 64, 0, 0, 67, 0,
  69, 0, 67, 0, 65, 0, 0, 0,
  62, 0, 0, 65, 0, 0, 69, 0,
  72, 0, 70, 0, 69, 0, 67, 0,
  65, 0, 67, 0, 62, 0, 60, 0,
  62, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [38, 0, 45, 0, 36, 0, 43, 0, 38, 0, 45, 0, 41, 0, 38, 0];

// "Bound for Tortuga" — sailing shanty #1, a rolling 6/8 feel. G major.
const M_SAIL1 = [
  67, 0, 67, 71, 0, 71, 74, 0,
  74, 72, 71, 72, 0, 71, 69, 0,
  67, 0, 67, 71, 0, 71, 74, 0,
  76, 0, 74, 72, 71, 0, 69, 0,
  71, 0, 72, 74, 0, 74, 76, 0,
  78, 0, 76, 74, 72, 0, 71, 0,
  69, 0, 71, 72, 71, 69, 66, 0,
  67, 0, 67, 0, 67, 0, 0, 0,
];
const B_SAIL1 = [43, 43, 47, 47, 48, 48, 50, 50, 43, 43, 47, 47, 50, 45, 43, 43];

// "The Salted Moore" — sailing shanty #2, minor and wind-bitten. A minor.
const M_SAIL2 = [
  57, 0, 60, 0, 64, 0, 60, 0,
  62, 0, 60, 59, 57, 0, 0, 0,
  57, 0, 60, 0, 64, 0, 65, 0,
  64, 0, 62, 60, 59, 0, 0, 0,
  60, 0, 62, 64, 65, 0, 64, 62,
  64, 0, 62, 60, 59, 0, 57, 0,
  55, 0, 57, 59, 60, 59, 57, 55,
  57, 0, 57, 0, 57, 0, 0, 0,
];
const B_SAIL2 = [45, 45, 45, 43, 41, 41, 43, 43, 45, 45, 45, 43, 40, 40, 45, 45];

// "Ten Leagues Out" — sailing shanty #3, bright reaching jig. C major.
const M_SAIL3 = [
  60, 64, 67, 0, 67, 65, 64, 0,
  62, 65, 69, 0, 69, 67, 65, 0,
  64, 67, 72, 0, 72, 71, 69, 0,
  67, 0, 65, 64, 62, 0, 0, 0,
  60, 64, 67, 0, 72, 0, 71, 0,
  69, 0, 67, 0, 65, 0, 64, 0,
  62, 64, 65, 67, 69, 67, 65, 62,
  60, 0, 60, 0, 60, 0, 0, 0,
];
const B_SAIL3 = [36, 36, 43, 43, 41, 41, 43, 43, 36, 36, 43, 43, 41, 43, 36, 36];

// "Rum for the Crew" — tavern, sloshing and warm. F major bounce.
const M_TAVERN = [
  65, 0, 69, 65, 70, 0, 69, 67,
  65, 0, 69, 72, 70, 69, 67, 0,
  65, 0, 69, 65, 70, 0, 72, 74,
  72, 0, 70, 69, 65, 0, 0, 0,
  74, 0, 72, 70, 72, 0, 70, 69,
  70, 0, 69, 67, 69, 0, 67, 65,
  64, 65, 67, 69, 70, 72, 74, 76,
  77, 0, 72, 0, 65, 0, 0, 0,
];
const B_TAVERN = [41, 48, 45, 48, 46, 48, 45, 48, 41, 48, 45, 48, 48, 46, 41, 41];

// "Iron & Brine" — sea battle, guns run out. D minor pounding.
const M_BATTLE = [
  50, 0, 50, 53, 50, 0, 57, 55,
  50, 0, 50, 53, 58, 0, 57, 53,
  50, 0, 50, 53, 50, 0, 48, 49,
  50, 0, 53, 0, 55, 0, 57, 0,
  62, 0, 60, 58, 62, 0, 60, 58,
  57, 0, 55, 53, 57, 0, 55, 53,
  58, 57, 55, 53, 50, 53, 55, 57,
  50, 0, 50, 0, 50, 0, 0, 0,
];
const B_BATTLE = [38, 38, 38, 38, 36, 36, 36, 36, 38, 38, 38, 38, 33, 33, 36, 36];

// "Crossed Steel" — duelling, tense fencing figure. E minor.
const M_DUEL = [
  64, 0, 67, 64, 71, 0, 67, 64,
  63, 0, 66, 63, 69, 0, 66, 63,
  64, 0, 67, 64, 71, 0, 74, 0,
  72, 71, 69, 67, 66, 0, 63, 0,
  64, 0, 67, 71, 76, 0, 74, 71,
  72, 0, 69, 66, 71, 0, 67, 64,
  62, 63, 64, 66, 67, 69, 71, 72,
  71, 0, 64, 0, 64, 0, 0, 0,
];
const B_DUEL = [40, 0, 40, 40, 39, 0, 39, 39, 40, 0, 40, 40, 35, 35, 39, 39];

// "The Governor's Garden" — retirement / true ending, home at last. F major.
const M_END = [
  65, 0, 69, 72, 77, 0, 76, 72,
  74, 0, 72, 70, 69, 0, 65, 0,
  65, 0, 69, 72, 77, 0, 79, 81,
  82, 0, 81, 79, 77, 0, 0, 0,
  70, 74, 77, 0, 76, 72, 69, 0,
  72, 76, 79, 0, 77, 74, 70, 0,
  69, 70, 72, 74, 77, 76, 74, 72,
  77, 0, 77, 0, 77, 0, 0, 0,
];
const B_END = [41, 0, 48, 0, 46, 0, 48, 0, 41, 0, 46, 0, 48, 46, 41, 41];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.19, lead: 'square', drums: false },
  sail1: { melody: M_SAIL1, bass: B_SAIL1, stepDur: 0.15, lead: 'square', drums: true },
  sail2: { melody: M_SAIL2, bass: B_SAIL2, stepDur: 0.16, lead: 'square', drums: true },
  sail3: { melody: M_SAIL3, bass: B_SAIL3, stepDur: 0.14, lead: 'square', drums: true },
  tavern: { melody: M_TAVERN, bass: B_TAVERN, stepDur: 0.13, lead: 'square', drums: true },
  battle: { melody: M_BATTLE, bass: B_BATTLE, stepDur: 0.115, lead: 'square', drums: true },
  duel: { melody: M_DUEL, bass: B_DUEL, stepDur: 0.125, lead: 'square', drums: true },
  ending: { melody: M_END, bass: B_END, stepDur: 0.16, lead: 'square', drums: false },
};

export const SHANTIES = ['sail1', 'sail2', 'sail3'];

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.jingleUntil = 0; // music pauses while a jingle plays
    this.wavesGain = null;
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
      this.startWaves();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.2;
    return this.muted;
  }

  // looping surf: filtered noise with a slow swell LFO
  startWaves() {
    const c = this.ctx;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.4;
    this.wavesGain = c.createGain();
    this.wavesGain.gain.value = 0;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.16;
    const lfoG = c.createGain();
    lfoG.gain.value = 140;
    lfo.connect(lfoG).connect(f.frequency);
    src.connect(f).connect(this.wavesGain).connect(this.master);
    src.start(); lfo.start();
  }

  setWaves(on) {
    if (!this.wavesGain) return;
    const t = this.ctx.currentTime;
    this.wavesGain.gain.cancelScheduledValues(t);
    this.wavesGain.gain.linearRampToValueAtTime(on ? 0.35 : 0, t + 0.8);
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

  // Call every frame; schedules ahead. Concertina feel: lead doubled with a
  // slightly detuned partner, like reeds.
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
        this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.92, 0.42, when, this.musicGain);
        this.tone(tr.lead, midi(m) * 1.006, 0, tr.stepDur * 0.92, 0.22, when, this.musicGain);
      }
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.4, 0.6, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.05, 0.22, 700, when, this.musicGain);
        else if (i % 4 === 2) this.noise(0.03, 0.1, 5000, when, this.musicGain);
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  jingle(seq, stepT = 0.12) {
    if (!this.ctx) return;
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, 0.16, 0.5, i * stepT);
        this.tone('square', midi(m) * 1.005, 0, 0.16, 0.3, i * stepT + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * stepT + 0.4;
  }

  // safe harbor bells
  portJingle() { this.jingle([72, 76, 79, 0, 76, 79, 84], 0.11); }
  // gold in the sand
  treasureFanfare() { this.jingle([65, 69, 72, 77, 0, 72, 77, 0, 81, 0, 84], 0.13); }
  // blades drawn
  duelSting() { this.jingle([64, 0, 63, 0, 71], 0.09); }
  promotionFanfare() { this.jingle([67, 71, 74, 79, 0, 74, 79, 83], 0.12); }

  // ---- sfx ----
  cannon() { this.noise(0.3, 0.6, 500); this.tone('square', 140, 35, 0.25, 0.4); }
  splash() { this.noise(0.14, 0.3, 1600); this.tone('triangle', 380, 140, 0.1, 0.15); }
  crunch() { this.noise(0.22, 0.5, 900); this.tone('sawtooth', 220, 60, 0.2, 0.3); }
  sink() {
    for (let i = 0; i < 5; i++) this.noise(0.3, 0.4, 900 - i * 140, i * 0.12);
    this.tone('triangle', 300, 60, 1.0, 0.35, 0.1);
  }
  clash() { this.tone('square', 2200, 1400, 0.06, 0.28); this.noise(0.05, 0.25, 5000); }
  parry() { this.tone('square', 2800, 2200, 0.09, 0.3); this.tone('square', 1900, 1500, 0.07, 0.2, 0.03); }
  swish() { this.noise(0.08, 0.12, 3000); }
  grunt() { this.tone('sawtooth', 200, 90, 0.14, 0.3); }
  coin() { this.tone('square', 1320, 0, 0.06, 0.25); this.tone('square', 1760, 0, 0.09, 0.25, 0.05); }
  buy() { this.tone('square', 880, 1100, 0.07, 0.25); }
  sellSfx() { this.tone('square', 1100, 880, 0.07, 0.25); }
  select() { this.tone('square', 900, 0, 0.05, 0.2); }
  moveCur() { this.tone('square', 600, 0, 0.04, 0.12); }
  deny() { this.tone('square', 220, 180, 0.12, 0.25); }
  creak() { this.tone('sawtooth', 90, 60, 0.3, 0.1); }
  dig() { this.noise(0.12, 0.3, 800); this.tone('triangle', 160, 90, 0.1, 0.2); }
  bell() { this.tone('square', 1560, 1540, 0.4, 0.2); }
  mutinyDrum() { this.noise(0.2, 0.5, 400); this.noise(0.2, 0.4, 300, 0.25); this.noise(0.3, 0.5, 250, 0.5); }
}
