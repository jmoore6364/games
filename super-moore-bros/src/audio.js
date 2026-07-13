// All-synthesized chiptune audio. The music is an original composition
// (bouncy 8-bar loop), not the Nintendo theme.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Original melody, midi note numbers, 0 = rest. Two eighth-notes per beat.
const MELODY = [
  64, 67, 72, 67, 69, 72, 69, 67,
  64, 67, 69, 67, 64, 62, 60, 0,
  62, 65, 69, 65, 67, 71, 74, 71,
  72, 67, 64, 67, 72, 0, 0, 0,
  64, 67, 72, 67, 69, 72, 69, 67,
  76, 74, 72, 71, 69, 67, 69, 0,
  65, 69, 72, 69, 67, 71, 74, 71,
  72, 0, 67, 0, 60, 0, 0, 0,
];
const BASS = [48, 48, 45, 45, 48, 48, 43, 43, 48, 48, 45, 45, 53, 55, 48, 48];

// Original cave theme: sparse, minor, echoing.
const MELODY_CAVE = [
  57, 0, 60, 0, 64, 0, 60, 0,
  57, 0, 60, 0, 65, 64, 0, 0,
  55, 0, 59, 0, 62, 0, 59, 0,
  57, 0, 60, 0, 57, 0, 0, 0,
  53, 0, 57, 0, 60, 0, 57, 0,
  55, 0, 59, 0, 62, 60, 0, 0,
  52, 0, 55, 0, 59, 0, 62, 0,
  57, 0, 0, 0, 45, 0, 0, 0,
];
const BASS_CAVE = [45, 45, 45, 45, 43, 43, 45, 45, 41, 41, 43, 43, 40, 40, 45, 45];

// Original water waltz: slow, gentle, triangle lead.
const MELODY_WATER = [
  60, 0, 64, 67, 0, 64, 60, 0,
  62, 0, 65, 69, 0, 65, 62, 0,
  64, 0, 67, 71, 0, 67, 64, 0,
  65, 64, 62, 0, 60, 0, 0, 0,
  60, 0, 64, 67, 0, 72, 67, 0,
  69, 0, 65, 62, 0, 65, 69, 0,
  67, 0, 64, 60, 0, 64, 67, 0,
  62, 0, 60, 0, 0, 0, 0, 0,
];
const BASS_WATER = [36, 36, 38, 38, 40, 40, 41, 43, 36, 36, 41, 41, 40, 40, 36, 36];

const TRACKS = [
  { melody: MELODY, bass: BASS, stepDur: 0.135, lead: 'square' },
  { melody: MELODY_CAVE, bass: BASS_CAVE, stepDur: 0.165, lead: 'square' },
  { melody: MELODY_WATER, bass: BASS_WATER, stepDur: 0.19, lead: 'triangle' },
];

class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = false;
    this.step = 0;
    this.nextTime = 0;
    this.stepDur = 0.135;
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
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(dest || this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.6, f = 800) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(flt).connect(g).connect(this.master);
    src.start(t);
  }

  jump()    { this.tone('square', 260, 660, 0.18, 0.5); }
  bigJump() { this.tone('square', 200, 520, 0.22, 0.5); }
  coin()    { this.tone('square', 988, 988, 0.06, 0.5); this.tone('square', 1319, 1319, 0.35, 0.5, 0.06); }
  stomp()   { this.tone('square', 400, 120, 0.12, 0.6); this.noise(0.08, 0.3, 500); }
  bump()    { this.tone('square', 140, 90, 0.1, 0.6); }
  breakBrick() { this.noise(0.25, 0.7, 1200); this.tone('square', 300, 100, 0.2, 0.3); }
  powerup() {
    const notes = [60, 64, 67, 72, 76, 79, 84];
    notes.forEach((n, i) => this.tone('square', midi(n), midi(n), 0.09, 0.5, i * 0.07));
  }
  oneUp() {
    const notes = [64, 67, 76, 72, 74, 79];
    notes.forEach((n, i) => this.tone('square', midi(n), midi(n), 0.12, 0.5, i * 0.1));
  }
  fireball() { this.tone('square', 600, 200, 0.1, 0.4); }
  kick()     { this.tone('square', 500, 900, 0.08, 0.5); }
  die() {
    const notes = [72, 71, 70, 69, 67, 64, 60, 55, 48];
    notes.forEach((n, i) => this.tone('square', midi(n), midi(n), 0.12, 0.5, 0.1 + i * 0.11));
  }
  flagpole() {
    const notes = [55, 60, 64, 67, 72, 76, 79, 84];
    notes.forEach((n, i) => this.tone('square', midi(n), midi(n), 0.1, 0.5, i * 0.08));
  }
  clearFanfare() {
    const notes = [60, 64, 67, 72, 76, 79, 84, 84];
    notes.forEach((n, i) => this.tone('square', midi(n), midi(n), 0.16, 0.55, 0.2 + i * 0.14));
  }
  timeWarn() { this.tone('square', 880, 880, 0.08, 0.5); this.tone('square', 880, 880, 0.08, 0.5, 0.15); }

  startMusic(track = 0) {
    if (!this.ctx) return;
    this.track = track;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
  }
  stopMusic() { this.musicOn = false; }

  // Called every frame: schedules music notes just ahead of playback.
  update() {
    if (!this.ctx || !this.musicOn) return;
    const { melody, bass, stepDur, lead } = TRACKS[this.track || 0];
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const i = this.step % melody.length;
      const m = melody[i];
      const when = this.nextTime - this.ctx.currentTime;
      if (m) this.tone(lead || 'square', midi(m), midi(m), stepDur * 0.9, lead === 'triangle' ? 0.7 : 0.35, when, this.musicGain);
      if (i % 4 === 0) {
        const b = bass[(i / 4) % bass.length];
        this.tone('triangle', midi(b), midi(b), stepDur * 3.2, 0.8, when, this.musicGain);
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

export const sound = new Sound();
