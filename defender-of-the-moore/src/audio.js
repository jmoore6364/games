// Defender of the Moore — fully synthesized WebAudio: a stately medieval score
// (regal saw "brass", triangle bass, noise drums), a lute court variant for the
// map, plus joust/sword/catapult/fanfare sound effects. No assets.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Banner of the Moore" — title theme, regal and broad. D minor, brassy.
const M_TITLE = [
  62, 0, 62, 0, 65, 0, 69, 0, 67, 0, 65, 0, 62, 0, 0, 0,
  57, 0, 60, 0, 62, 0, 65, 0, 64, 0, 62, 0, 57, 0, 0, 0,
  69, 0, 69, 0, 72, 0, 74, 0, 72, 0, 69, 0, 65, 0, 0, 0,
  62, 0, 65, 0, 69, 0, 74, 0, 72, 71, 69, 0, 62, 0, 0, 0,
];
const B_TITLE = [38, 0, 45, 0, 41, 0, 45, 0, 33, 0, 40, 0, 36, 0, 40, 0,
  41, 0, 48, 0, 45, 0, 41, 0, 38, 0, 45, 0, 42, 0, 45, 0];

// "The Council Table" — map / court theme, a courtly lute pavane. G minor-ish.
const M_MAP = [
  67, 0, 70, 72, 0, 70, 67, 0, 65, 0, 67, 0, 62, 0, 0, 0,
  67, 0, 70, 72, 0, 74, 75, 0, 74, 72, 70, 0, 67, 0, 0, 0,
  63, 0, 67, 70, 0, 67, 63, 0, 62, 0, 63, 0, 58, 0, 0, 0,
  67, 0, 72, 0, 70, 67, 65, 0, 67, 0, 67, 0, 67, 0, 0, 0,
];
const B_MAP = [43, 0, 43, 0, 48, 0, 43, 0, 41, 0, 41, 0, 43, 0, 43, 0,
  39, 0, 39, 0, 43, 0, 39, 0, 43, 0, 43, 0, 43, 0, 43, 0];

// "The Lists" — joust, a galloping fanfare. C major, driving.
const M_JOUST = [
  60, 64, 67, 72, 67, 64, 60, 64, 62, 65, 69, 65, 62, 0, 0, 0,
  60, 64, 67, 72, 72, 71, 69, 67, 65, 0, 67, 0, 60, 0, 0, 0,
  67, 72, 76, 72, 67, 0, 69, 71, 72, 0, 71, 69, 67, 0, 0, 0,
  60, 64, 67, 72, 74, 0, 71, 0, 72, 0, 60, 0, 60, 0, 0, 0,
];
const B_JOUST = [36, 36, 43, 43, 36, 36, 43, 43, 41, 41, 45, 45, 43, 43, 43, 43];

// "Crossed Steel" — sword duel, tense minor. E minor.
const M_DUEL = [
  64, 0, 67, 64, 71, 0, 67, 64, 63, 0, 66, 63, 69, 0, 66, 63,
  64, 0, 67, 64, 71, 0, 74, 0, 72, 71, 69, 67, 66, 0, 63, 0,
  64, 0, 67, 71, 76, 0, 74, 71, 72, 0, 69, 66, 71, 0, 67, 64,
  62, 63, 64, 66, 67, 69, 71, 72, 71, 0, 64, 0, 64, 0, 0, 0,
];
const B_DUEL = [40, 0, 40, 40, 39, 0, 39, 39, 40, 0, 40, 40, 35, 35, 39, 39];

// "The Siege" — catapult assault, heavy and grim. D minor pounding.
const M_SIEGE = [
  50, 0, 50, 0, 53, 0, 50, 0, 57, 0, 55, 0, 53, 0, 0, 0,
  50, 0, 50, 0, 53, 0, 55, 0, 58, 0, 57, 0, 53, 0, 0, 0,
  62, 0, 60, 58, 62, 0, 60, 58, 57, 0, 55, 53, 50, 0, 0, 0,
  50, 0, 53, 0, 57, 0, 62, 0, 60, 0, 53, 0, 50, 0, 0, 0,
];
const B_SIEGE = [38, 38, 38, 38, 36, 36, 36, 36, 38, 38, 38, 38, 33, 33, 36, 36];

// "The Dungeon" — rescue raid, creeping and low. A minor.
const M_RAID = [
  57, 0, 0, 60, 0, 0, 59, 0, 57, 0, 0, 0, 55, 0, 0, 0,
  57, 0, 0, 60, 0, 64, 0, 0, 62, 0, 60, 0, 59, 0, 0, 0,
  53, 0, 0, 57, 0, 0, 56, 0, 55, 0, 0, 0, 52, 0, 0, 0,
  57, 0, 59, 0, 60, 0, 62, 0, 60, 0, 57, 0, 57, 0, 0, 0,
];
const B_RAID = [45, 0, 45, 0, 45, 0, 45, 0, 41, 0, 41, 0, 40, 0, 40, 0];

// "Coronation" — victory, triumphant. C major fanfare.
const M_WIN = [
  60, 64, 67, 72, 0, 72, 76, 0, 74, 72, 71, 72, 0, 67, 0, 0,
  65, 69, 72, 77, 0, 76, 74, 0, 72, 0, 71, 0, 72, 0, 0, 0,
  72, 0, 76, 0, 79, 0, 84, 0, 83, 81, 79, 77, 76, 0, 72, 0,
  60, 64, 67, 72, 76, 79, 84, 0, 72, 0, 60, 0, 60, 0, 0, 0,
];
const B_WIN = [36, 0, 43, 0, 48, 0, 43, 0, 41, 0, 48, 0, 43, 0, 43, 0,
  36, 0, 43, 0, 48, 0, 43, 0, 43, 0, 48, 0, 36, 0, 36, 0];

// "The Dirge" — defeat, slow and mournful. D minor.
const M_LOSE = [
  62, 0, 0, 0, 60, 0, 0, 0, 58, 0, 0, 0, 57, 0, 0, 0,
  55, 0, 0, 0, 57, 0, 0, 0, 53, 0, 0, 0, 0, 0, 0, 0,
];
const B_LOSE = [38, 0, 0, 0, 36, 0, 0, 0, 33, 0, 0, 0, 31, 0, 0, 0];

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.17, lead: 'sawtooth', drums: true },
  map: { melody: M_MAP, bass: B_MAP, stepDur: 0.18, lead: 'triangle', drums: false },
  joust: { melody: M_JOUST, bass: B_JOUST, stepDur: 0.11, lead: 'sawtooth', drums: true },
  duel: { melody: M_DUEL, bass: B_DUEL, stepDur: 0.125, lead: 'square', drums: true },
  siege: { melody: M_SIEGE, bass: B_SIEGE, stepDur: 0.14, lead: 'sawtooth', drums: true },
  raid: { melody: M_RAID, bass: B_RAID, stepDur: 0.15, lead: 'triangle', drums: false },
  win: { melody: M_WIN, bass: B_WIN, stepDur: 0.16, lead: 'sawtooth', drums: true },
  lose: { melody: M_LOSE, bass: B_LOSE, stepDur: 0.28, lead: 'triangle', drums: false },
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
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
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

  noise(dur, vol = 1, freq = 4000, when = 0, dest = null, type = 'bandpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ---- music scheduler ----
  playMusic(name) {
    if (this.trackName === name) return;
    this.trackName = name;
    this.track = TRACKS[name] || null;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.06;
  }

  stopMusic() { this.track = null; this.trackName = null; }

  updateMusic() {
    if (!this.ctx || !this.track || this.muted) return;
    if (this.ctx.currentTime < this.jingleUntil) {
      this.nextTime = Math.max(this.nextTime, this.jingleUntil + 0.1);
      return;
    }
    const tr = this.track;
    while (this.nextTime < this.ctx.currentTime + 0.16) {
      const i = this.step % tr.melody.length;
      const when = this.nextTime - this.ctx.currentTime;
      const m = tr.melody[i];
      if (m) {
        // "brass" = saw + a fifth doubling; softer for triangle/square
        this.tone(tr.lead, midi(m), 0, tr.stepDur * 0.95, 0.34, when, this.musicGain);
        if (tr.lead === 'sawtooth') this.tone('sawtooth', midi(m) * 1.5, 0, tr.stepDur * 0.7, 0.12, when, this.musicGain);
        else this.tone(tr.lead, midi(m) * 1.005, 0, tr.stepDur * 0.9, 0.16, when, this.musicGain);
      }
      if (i % 4 === 0) {
        const b = tr.bass[(this.step >> 2) % tr.bass.length];
        if (b) this.tone('triangle', midi(b), 0, tr.stepDur * 3.6, 0.6, when, this.musicGain);
      }
      if (tr.drums) {
        if (i % 8 === 0) this.noise(0.06, 0.3, 200, when, this.musicGain, 'lowpass'); // kick/tabor
        else if (i % 4 === 2) this.noise(0.03, 0.12, 6000, when, this.musicGain);      // tick
      }
      this.nextTime += tr.stepDur;
      this.step++;
    }
  }

  jingle(seq, stepT = 0.12, type = 'sawtooth') {
    if (!this.ctx) return;
    seq.forEach((m, i) => {
      if (m) {
        this.tone(type, midi(m), 0, 0.18, 0.45, i * stepT);
        this.tone(type, midi(m) * 1.5, 0, 0.12, 0.14, i * stepT + 0.01);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * stepT + 0.4;
  }

  // ---- stings / fanfares ----
  eventSting() { this.jingle([64, 0, 67, 0, 71], 0.1); }
  fanfare() { this.jingle([67, 71, 74, 79, 0, 74, 79, 83], 0.11); }
  coronation() { this.jingle([60, 64, 67, 72, 0, 72, 76, 79, 0, 84], 0.14); }
  dirge() { this.jingle([62, 0, 60, 0, 57, 0, 0, 53], 0.22, 'triangle'); }

  // ---- sfx ----
  gallop() { this.noise(0.05, 0.22, 300, 0, null, 'lowpass'); this.tone('triangle', 90, 60, 0.06, 0.18); }
  lanceCrack() { this.noise(0.12, 0.5, 1400); this.tone('square', 300, 90, 0.14, 0.4); this.tone('sawtooth', 180, 60, 0.18, 0.3); }
  unhorse() { this.noise(0.3, 0.4, 500, 0, null, 'lowpass'); this.tone('sawtooth', 200, 50, 0.35, 0.35); }
  crowd() { this.noise(0.5, 0.25, 900); this.noise(0.5, 0.18, 1500, 0.1); }
  clash() { this.tone('square', 2200, 1400, 0.06, 0.28); this.noise(0.05, 0.25, 5000); }
  parry() { this.tone('square', 2900, 2200, 0.09, 0.3); this.tone('square', 1900, 1500, 0.07, 0.2, 0.03); }
  swish() { this.noise(0.08, 0.12, 3000); }
  hit() { this.tone('sawtooth', 220, 90, 0.14, 0.32); this.noise(0.06, 0.2, 800); }
  launch() { this.tone('sawtooth', 400, 180, 0.18, 0.3); this.noise(0.08, 0.2, 500, 0, null, 'lowpass'); }
  thud() { this.noise(0.18, 0.5, 260, 0, null, 'lowpass'); this.tone('triangle', 120, 50, 0.2, 0.3); }
  crumble() { for (let i = 0; i < 4; i++) this.noise(0.16, 0.4, 600 - i * 90, i * 0.06, null, 'lowpass'); this.tone('sawtooth', 160, 50, 0.4, 0.25); }
  coin() { this.tone('square', 1320, 0, 0.06, 0.25); this.tone('square', 1760, 0, 0.09, 0.25, 0.05); }
  buy() { this.tone('square', 880, 1100, 0.07, 0.25); }
  select() { this.tone('square', 900, 0, 0.05, 0.2); }
  moveCur() { this.tone('square', 620, 0, 0.04, 0.12); }
  deny() { this.tone('square', 220, 180, 0.12, 0.25); }
  step() { this.noise(0.05, 0.14, 400, 0, null, 'lowpass'); }
  alarm() { this.tone('square', 780, 900, 0.1, 0.3); this.tone('square', 900, 780, 0.1, 0.3, 0.12); }
}
