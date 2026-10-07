// audio.js — WebAudio sfx + a continuous engine drone pitched by speed. Zero assets.
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
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
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.engineGain) this.engineGain.gain.value = 0;
    return this.muted;
  }
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
  // continuous engine — call every frame
  engine(speed, turbo, airborne, off) {
    if (!this.ctx) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const t = this.ctx.currentTime;
    const freq = 42 + speed * 0.75 + (turbo ? 26 : 0) + (airborne ? 18 : 0)
      + Math.sin(t * 31) * 3;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.05);
    const vol = (this.muted || off) ? 0 : (speed > 2 ? 0.055 : 0.028);
    this.engineGain.gain.setTargetAtTime(vol, t, 0.08);
  }
  beep(final = false) { this._tone(final ? 880 : 440, final ? 0.35 : 0.14, 'square', 0.45); }
  jump()    { this._tone(240, 0.18, 'square', 0.25, 520); }
  land()    { this._noise(0.08, 0.3, 0, 700); }
  bounce()  { this._tone(200, 0.12, 'square', 0.3, 120); this._noise(0.1, 0.3, 0, 800); }
  crash()   { this._noise(0.4, 0.55, 0, 1100); this._tone(300, 0.5, 'sawtooth', 0.4, 60); }
  overheat(){ this._noise(0.6, 0.4, 0, 2400); this._tone(160, 0.5, 'sawtooth', 0.3, 60, 0.1); }
  cool()    { this._tone(1050, 0.1, 'sine', 0.3, 1500); }
  rideover(){ this._tone(500, 0.1, 'square', 0.3, 250); this._noise(0.1, 0.3); }
  finish()  { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.13, 'square', 0.4, null, i * 0.1)); }
  fail()    { [392, 330, 262].forEach((f, i) => this._tone(f, 0.25, 'sawtooth', 0.35, null, i * 0.18)); }
  champion() {
    const seq = [523, 659, 784, 659, 784, 1047, 784, 1047, 1319];
    seq.forEach((f, i) => this._tone(f, 0.16, 'square', 0.42, null, i * 0.12));
  }
}
