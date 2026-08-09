// All-synthesized audio. Original compositions in a brassy, march-tempo
// arcade action style (no SNK melodies).

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Original tracks (midi notes, 0 = rest, eighth notes) ----

// "One Moore Mission" — title. Bold G minor march.
const M_TITLE = [
  55, 0, 55, 0, 58, 0, 62, 0,
  63, 0, 62, 0, 58, 0, 55, 0,
  53, 0, 53, 0, 56, 0, 60, 0,
  62, 0, 60, 0, 56, 0, 53, 0,
  55, 0, 55, 0, 58, 0, 62, 0,
  65, 0, 63, 0, 62, 0, 58, 0,
  60, 0, 58, 0, 56, 0, 58, 0,
  55, 0, 0, 0, 55, 0, 0, 0,
];
const B_TITLE = [43, 0, 43, 43, 41, 0, 41, 41, 43, 0, 43, 43, 38, 38, 41, 41];

// "Green Wall Assault" — mission theme. Driving D dorian.
const M_MISSION = [
  62, 0, 62, 64, 65, 0, 64, 62,
  69, 0, 69, 0, 67, 65, 64, 65,
  62, 0, 62, 64, 65, 0, 67, 69,
  71, 0, 69, 67, 69, 0, 0, 0,
  74, 0, 72, 71, 69, 0, 71, 72,
  74, 0, 72, 71, 69, 0, 67, 65,
  64, 65, 67, 69, 71, 69, 67, 64,
  62, 0, 62, 0, 62, 0, 0, 0,
];
const B_MISSION = [50, 50, 50, 48, 46, 46, 46, 48, 50, 50, 50, 48, 45, 46, 48, 48];

// "Iron Moore-den" — boss. Grinding C phrygian.
const M_BOSS = [
  48, 0, 49, 0, 48, 0, 46, 0,
  48, 0, 51, 0, 49, 48, 46, 48,
  48, 0, 49, 0, 48, 0, 53, 0,
  51, 0, 49, 0, 48, 0, 46, 0,
  55, 0, 53, 51, 55, 0, 53, 51,
  56, 0, 55, 53, 56, 0, 55, 53,
  58, 56, 55, 53, 51, 49, 48, 46,
  48, 0, 48, 0, 48, 0, 0, 0,
];
const B_BOSS = [36, 36, 37, 37, 36, 36, 34, 34, 36, 36, 37, 37, 41, 41, 34, 34];

// "POW Camp Sunrise" — victory jingle. F major, short.
const M_WIN = [
  65, 0, 69, 0, 72, 0, 77, 0,
  76, 0, 72, 0, 74, 0, 77, 0,
  77, 0, 0, 0, 0, 0, 0, 0,
];
const B_WIN = [41, 41, 45, 45, 46, 46, 41, 41];

// "Folded Flag" — game over. Slow A minor.
const M_OVER = [
  57, 0, 0, 0, 56, 0, 0, 0,
  57, 0, 55, 0, 53, 0, 0, 0,
  52, 0, 0, 0, 0, 0, 0, 0,
];
const B_OVER = [33, 0, 32, 0, 33, 31, 29, 28];

const TRACKS = {
  title: { mel: M_TITLE, bass: B_TITLE, bpm: 132 },
  mission: { mel: M_MISSION, bass: B_MISSION, bpm: 150 },
  boss: { mel: M_BOSS, bass: B_BOSS, bpm: 158 },
  win: { mel: M_WIN, bass: B_WIN, bpm: 132, once: true },
  over: { mel: M_OVER, bass: B_OVER, bpm: 96, once: true },
};

export class Sound {
  constructor() {
    this.ac = null;
    this.muted = false;
    this.track = null;
    this.timer = null;
  }

  unlock() {
    if (this.ac) return;
    this.ac = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ac.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ac.destination);
    if (this.pendingTrack) this.playMusic(this.pendingTrack);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // ---- music sequencer ----
  playMusic(name) {
    if (!this.ac) { this.pendingTrack = name; return; }
    if (this.track === name) return;
    this.stopMusic();
    const t = TRACKS[name];
    if (!t) return;
    this.track = name;
    let step = 0;
    const stepDur = 60 / t.bpm / 2; // eighth notes
    const tick = () => {
      if (this.track !== name) return;
      const i = step % t.mel.length;
      const m = t.mel[i];
      if (m) this.note(midi(m), stepDur * 0.9, 'square', 0.16);
      const bi = step % t.bass.length;
      const b = t.bass[bi];
      if (b) this.note(midi(b), stepDur * 0.95, 'triangle', 0.22);
      // drums: kick on beat, snare-noise on offbeat pairs
      if (i % 4 === 0) this.kick();
      else if (i % 4 === 2) this.noiseHit(0.05, 2400, 0.08);
      step++;
      if (t.once && step >= t.mel.length) { this.track = null; return; }
      this.timer = setTimeout(tick, stepDur * 1000);
    };
    tick();
  }

  stopMusic() {
    this.track = null;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  note(freq, dur, type = 'square', vol = 0.2) {
    if (!this.ac || this.muted) return;
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ac.currentTime + dur);
  }

  sweep(f0, f1, dur, type = 'square', vol = 0.2) {
    if (!this.ac || this.muted) return;
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, this.ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), this.ac.currentTime + dur);
    g.gain.setValueAtTime(vol, this.ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ac.currentTime + dur);
  }

  noiseHit(dur, freq = 1000, vol = 0.3) {
    if (!this.ac || this.muted) return;
    const n = Math.floor(this.ac.sampleRate * dur);
    const buf = this.ac.createBuffer(1, n, this.ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    const f = this.ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = this.ac.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }

  kick() {
    this.sweep(120, 40, 0.1, 'sine', 0.5);
  }

  // ---- sfx ----
  pistol() { this.noiseHit(0.06, 1800, 0.25); this.sweep(700, 220, 0.05, 'square', 0.12); }
  hmg() { this.noiseHit(0.05, 1400, 0.3); this.sweep(500, 160, 0.05, 'sawtooth', 0.14); }
  rocketFire() { this.noiseHit(0.25, 700, 0.3); this.sweep(200, 90, 0.3, 'sawtooth', 0.2); }
  cannon() { this.noiseHit(0.3, 400, 0.5); this.sweep(150, 50, 0.35, 'square', 0.3); }
  knife() { this.sweep(1200, 2400, 0.06, 'square', 0.15); }
  slash() { this.noiseHit(0.08, 3000, 0.2); }
  boom() { this.noiseHit(0.5, 220, 0.55); this.sweep(180, 45, 0.5, 'triangle', 0.4); }
  boomSmall() { this.noiseHit(0.2, 500, 0.3); }
  nadeBounce() { this.note(300, 0.05, 'square', 0.12); }
  pickup() { this.note(880, 0.07, 'square', 0.2); setTimeout(() => this.note(1318, 0.12, 'square', 0.2), 70); }
  powFree() { this.note(659, 0.09, 'square', 0.2); setTimeout(() => this.note(880, 0.09, 'square', 0.2), 90); setTimeout(() => this.note(1108, 0.15, 'square', 0.2), 180); }
  hurt() { this.sweep(900, 100, 0.4, 'sawtooth', 0.3); }
  eDie() { this.sweep(600, 150, 0.25, 'square', 0.2); }
  heli() { this.noiseHit(0.1, 300, 0.12); }
  ride() { this.sweep(80, 240, 0.3, 'sawtooth', 0.25); }
  clank() { this.noiseHit(0.08, 900, 0.3); this.note(220, 0.1, 'square', 0.15); }
  bossHit() { this.noiseHit(0.1, 700, 0.3); this.sweep(400, 120, 0.12, 'square', 0.2); }
}
