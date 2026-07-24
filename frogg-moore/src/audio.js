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
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  }
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  // low-level tone
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
  _noise(dur, vol = 0.5, delay = 0) {
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
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }
  hop()    { this._tone(520, 0.09, 'square', 0.35, 900); }
  splash() { this._noise(0.35, 0.5); this._tone(300, 0.3, 'sine', 0.3, 90); }
  squash() { this._noise(0.18, 0.6); this._tone(140, 0.25, 'sawtooth', 0.4, 60); }
  timeout(){ this._tone(220, 0.3, 'sawtooth', 0.35, 110); }
  home() {  // little arrival jingle
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => this._tone(f, 0.13, 'square', 0.4, null, i * 0.08));
  }
  fly()  { this._tone(880, 0.06, 'sine', 0.3, 1400); this._tone(1200, 0.08, 'sine', 0.3, 1700, 0.06); }
  levelClear() {
    const seq = [523, 587, 659, 784, 880, 1047, 1319];
    seq.forEach((f, i) => this._tone(f, 0.14, 'square', 0.4, null, i * 0.1));
  }
  gameOver() {
    const seq = [440, 392, 349, 262];
    seq.forEach((f, i) => this._tone(f, 0.28, 'sawtooth', 0.4, null, i * 0.16));
  }
}
