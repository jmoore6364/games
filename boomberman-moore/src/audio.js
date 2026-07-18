// All-synthesized chiptune audio. Every track is an original composition
// in a bouncy 8-bit arcade style (no Hudson melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original compositions (midi note numbers, 0 = rest, eighth notes) ----

// "Boom Town" — title screen, big grin fanfare swing. C major.
const M_TITLE = [
  60, 0, 64, 0, 67, 0, 64, 67,
  72, 0, 0, 71, 69, 0, 67, 0,
  65, 0, 69, 0, 72, 0, 69, 72,
  74, 0, 72, 71, 67, 0, 0, 0,
  60, 0, 64, 0, 67, 0, 64, 67,
  72, 0, 0, 74, 76, 0, 74, 72,
  71, 0, 69, 67, 65, 67, 69, 71,
  72, 0, 0, 0, 0, 0, 0, 0,
];
const B_TITLE = [48, 0, 48, 48, 43, 0, 43, 43, 41, 0, 41, 41, 43, 43, 47, 47];

// "Fuse & Bounce" — campaign loop, springy and cheerful. G major.
const M_PLAY = [
  67, 0, 67, 71, 74, 0, 71, 0,
  72, 0, 69, 0, 66, 0, 62, 0,
  67, 0, 67, 71, 74, 0, 76, 0,
  74, 0, 71, 0, 67, 0, 0, 0,
  65, 0, 65, 69, 72, 0, 69, 0,
  71, 0, 67, 0, 64, 0, 62, 0,
  60, 62, 64, 66, 67, 69, 71, 72,
  74, 0, 71, 0, 67, 0, 0, 0,
];
const B_PLAY = [43, 43, 47, 47, 48, 48, 43, 43, 41, 41, 43, 43, 36, 38, 40, 41];

// "Crossfire Party" — battle mode, driving and mischievous. E minor.
const M_BATTLE = [
  64, 0, 64, 66, 67, 0, 67, 69,
  71, 0, 71, 0, 67, 0, 64, 0,
  64, 0, 64, 66, 67, 0, 67, 69,
  71, 0, 74, 0, 71, 0, 67, 0,
  72, 0, 72, 71, 69, 0, 69, 67,
  66, 0, 66, 67, 69, 0, 71, 0,
  72, 71, 69, 67, 66, 64, 62, 64,
  66, 0, 67, 0, 64, 0, 0, 0,
];
const B_BATTLE = [40, 40, 40, 40, 43, 43, 43, 43, 40, 40, 40, 40, 38, 38, 42, 42];

// "Big Bad Balloon" — boss battle, heavy stomp. D minor.
const M_BOSS = [
  50, 0, 50, 53, 50, 0, 56, 55,
  50, 0, 50, 53, 57, 0, 55, 53,
  50, 0, 50, 53, 50, 0, 58, 57,
  55, 0, 53, 0, 50, 0, 0, 0,
  62, 0, 61, 58, 62, 0, 61, 58,
  60, 0, 58, 55, 60, 0, 58, 55,
  57, 58, 60, 61, 62, 61, 60, 58,
  57, 0, 55, 0, 50, 0, 0, 0,
];
const B_BOSS = [38, 38, 38, 37, 38, 38, 38, 36, 38, 38, 38, 37, 33, 34, 36, 37];

// "Walls Closing" — sudden death: battle theme up a fourth, double time.
const M_PANIC = M_BATTLE.map((m) => (m ? m + 5 : 0));
const B_PANIC = B_BATTLE.map((m) => (m ? m + 5 : 0));

const TRACKS = {
  title: { melody: M_TITLE, bass: B_TITLE, stepDur: 0.14, lead: 'square', drums: true },
  play: { melody: M_PLAY, bass: B_PLAY, stepDur: 0.13, lead: 'square', drums: true },
  battle: { melody: M_BATTLE, bass: B_BATTLE, stepDur: 0.115, lead: 'square', drums: true },
  panic: { melody: M_PANIC, bass: B_PANIC, stepDur: 0.085, lead: 'square', drums: true },
  boss: { melody: M_BOSS, bass: B_BOSS, stepDur: 0.11, lead: 'sawtooth', drums: true },
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

  jingle(seq, stepDur = 0.13) {
    if (!this.ctx) return;
    seq.forEach((m, i) => {
      if (m) {
        this.tone('square', midi(m), 0, stepDur + 0.02, 0.5, i * stepDur);
        this.tone('square', midi(m) * 1.005, 0, stepDur + 0.02, 0.3, i * stepDur + 0.02);
      }
    });
    this.jingleUntil = this.ctx.currentTime + seq.length * stepDur + 0.4;
  }

  // "Area clear!" — stage clear fanfare, original.
  clearJingle() { this.jingle([67, 71, 74, 79, 0, 78, 79, 0, 83]); }
  // Round won in battle.
  winJingle() { this.jingle([64, 68, 71, 76, 0, 76, 0, 80], 0.11); }
  // Campaign complete.
  victoryJingle() { this.jingle([60, 64, 67, 72, 0, 71, 72, 74, 76, 0, 79, 0, 84], 0.14); }
  // Game over dirge.
  overJingle() { this.jingle([62, 0, 58, 0, 55, 0, 50, 0, 49, 0, 50], 0.16); }

  // ---- sfx ----
  place() { this.tone('square', 320, 160, 0.07, 0.3); }
  tick() { this.tone('square', 1400, 0, 0.03, 0.18); }
  boom() {
    this.noise(0.28, 0.55, 600);
    this.noise(0.16, 0.4, 2200);
    this.tone('sine', 110, 30, 0.35, 0.7);
  }
  powerup() { [660, 880, 1100, 1320].forEach((f, i) => this.tone('square', f, 0, 0.07, 0.3, i * 0.055)); }
  badpower() { this.tone('sawtooth', 500, 120, 0.3, 0.3); }
  die() { this.tone('sawtooth', 500, 60, 0.5, 0.45); this.noise(0.28, 0.3, 600); }
  ehit() { this.tone('triangle', 300, 90, 0.16, 0.35); this.noise(0.08, 0.22, 900); }
  bossHit() { this.tone('sawtooth', 250, 90, 0.2, 0.4); this.noise(0.1, 0.3, 500); }
  kick() { this.tone('square', 240, 480, 0.07, 0.28); }
  bump() { this.noise(0.04, 0.2, 500); }
  exitOpen() { [880, 1100, 880, 1320].forEach((f, i) => this.tone('square', f, 0, 0.08, 0.3, i * 0.09)); }
  crush() { this.noise(0.12, 0.4, 300); this.tone('square', 140, 50, 0.15, 0.4); }
  menuMove() { this.tone('square', 900, 0, 0.04, 0.2); }
  menuPick() { this.tone('square', 700, 1050, 0.08, 0.28); }
  pause() { this.tone('square', 1000, 0, 0.05, 0.25); this.tone('square', 700, 0, 0.05, 0.25, 0.08); }
  spawnWarn() { this.tone('sawtooth', 200, 400, 0.2, 0.3); }
  detonateClick() { this.tone('square', 1800, 900, 0.04, 0.25); }
}
