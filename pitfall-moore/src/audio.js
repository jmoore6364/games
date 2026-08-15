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
  jump()    { this._tone(300, 0.12, 'square', 0.32, 620); }
  vine() {  // the swing yodel
    this._tone(392, 0.12, 'square', 0.35, 523);
    this._tone(523, 0.12, 'square', 0.35, 659, 0.1);
    this._tone(659, 0.16, 'square', 0.35, 523, 0.2);
  }
  treasure() { [659, 784, 1047, 1319].forEach((f, i) => this._tone(f, 0.11, 'square', 0.4, null, i * 0.08)); }
  fall()    { this._tone(500, 0.35, 'square', 0.3, 140); this._noise(0.15, 0.35, 0.3, 800); }
  hit()     { this._tone(180, 0.15, 'sawtooth', 0.4, 110); }
  death()   { this._tone(440, 0.9, 'sawtooth', 0.4, 55); }
  climb()   { this._tone(600, 0.05, 'square', 0.2, 700); }
  tick()    { this._tone(1000, 0.05, 'sine', 0.25); }
  win() {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    seq.forEach((f, i) => this._tone(f, 0.15, 'square', 0.4, null, i * 0.11));
  }
  gameOver() {
    const seq = [392, 349, 294, 262, 196];
    seq.forEach((f, i) => this._tone(f, 0.28, 'sawtooth', 0.38, null, i * 0.17));
  }
}
