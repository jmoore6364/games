// audio.js — tiny WebAudio sound engine, procedural blips. Zero assets.
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }
  _ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  }
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  _tone(freq, dur, type = 'square', vol = 0.5, slideTo = null, delay = 0) {
    if (this.muted) return;
    this._ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  _noise(dur, vol = 0.5, delay = 0, cutoff = 1400) {
    if (this.muted) return;
    this._ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }
  candy()  { this._tone(700, 0.07, 'square', 0.35, 1100); this._tone(1100, 0.09, 'square', 0.3, 1500, 0.06); }
  flower() { [880, 1175, 1568].forEach((f, i) => this._tone(f, 0.1, 'sine', 0.3, null, i * 0.06)); }
  piece()  { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.12, 'square', 0.4, null, i * 0.09)); }
  crystal(){ this._tone(1400, 0.16, 'sine', 0.3, 2200); this._tone(1900, 0.2, 'sine', 0.25, 2600, 0.1); }
  sense()  { this._tone(600, 0.14, 'sine', 0.3, 1200); this._tone(1200, 0.18, 'sine', 0.25, 600, 0.12); }
  fall()   { this._tone(500, 0.4, 'square', 0.35, 120); this._noise(0.25, 0.4, 0.3); }
  levitate(){ this._tone(300, 0.16, 'sine', 0.22, 520); }
  riseDone(){ [392, 523, 659].forEach((f, i) => this._tone(f, 0.1, 'triangle', 0.35, null, i * 0.07)); }
  agent()  { this._tone(190, 0.22, 'sawtooth', 0.42, 90); this._tone(140, 0.22, 'sawtooth', 0.35, 70, 0.16); }
  siren()  { this._tone(600, 0.18, 'square', 0.3, 900); this._tone(900, 0.18, 'square', 0.3, 600, 0.18); }
  elliott(){ [523, 659, 880, 1047].forEach((f, i) => this._tone(f, 0.1, 'triangle', 0.35, null, i * 0.07)); }
  call() { // touch-tone dialing, then a warm answering swell
    const dial = [941, 852, 697, 770, 852, 941, 697];
    dial.forEach((f, i) => this._tone(f, 0.09, 'sine', 0.3, null, i * 0.11));
    this._tone(220, 0.8, 'triangle', 0.28, 440, 0.9);
    this._tone(330, 0.8, 'triangle', 0.24, 660, 0.95);
  }
  shipComing() { this._tone(80, 0.9, 'sawtooth', 0.3, 160); this._tone(120, 0.9, 'sine', 0.25, 240, 0.1); }
  shipLand()   { this._tone(240, 0.6, 'sine', 0.3, 60); this._noise(0.5, 0.3, 0.1, 600); }
  beam()   { this._tone(400, 0.3, 'sine', 0.28, 900); this._tone(900, 0.35, 'sine', 0.24, 1600, 0.25); }
  win() {
    const seq = [392, 523, 659, 784, 659, 784, 1047, 1319];
    seq.forEach((f, i) => this._tone(f, 0.16, 'square', 0.4, null, i * 0.12));
  }
  wilt()   { this._tone(400, 0.7, 'sawtooth', 0.35, 60); }
  revive() { [262, 330, 392, 523].forEach((f, i) => this._tone(f, 0.14, 'triangle', 0.35, null, i * 0.1)); }
  gameOver() {
    const seq = [440, 392, 349, 262, 196];
    seq.forEach((f, i) => this._tone(f, 0.3, 'sawtooth', 0.38, null, i * 0.18));
  }
}
