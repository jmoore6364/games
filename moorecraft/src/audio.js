// audio.js — all-synthesized WebAudio SFX + ambient pad. No assets.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.padGain = null;
    this.padOscs = [];
    this.night = false;
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    this._startPad();
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
    return this.muted;
  }
  _now() { return this.ctx ? this.ctx.currentTime : 0; }

  _blip(freq, dur, type = 'square', vol = 0.3, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  _noise(dur, vol = 0.3, filterFreq = 1200, hp = false) {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }

  footstep(mat = 0) {
    this._noise(0.09, 0.14, 400 + mat * 200);
    this._blip(70 + mat * 20, 0.06, 'sine', 0.12);
  }
  breakBlock(hard = 1) {
    this._noise(0.14, 0.3, 900 / hard);
    this._blip(220 / hard, 0.12, 'square', 0.18, 90 / hard);
  }
  mine() { this._noise(0.05, 0.1, 1600, true); }
  place() { this._blip(180, 0.08, 'square', 0.2, 260); this._noise(0.05, 0.1, 600); }
  craft() { this._blip(523, 0.1, 'triangle', 0.25); setTimeout(() => this._blip(784, 0.14, 'triangle', 0.25), 90); }
  pickup() { this._blip(660, 0.06, 'square', 0.15, 990); }
  tetherZip() { this._blip(300, 0.28, 'sawtooth', 0.22, 900); }
  hollowHiss() { this._noise(0.4, 0.18, 2400, true); }
  hollowBurst() { this._noise(0.4, 0.5, 500); this._blip(120, 0.4, 'sawtooth', 0.35, 40); }
  hurt() { this._blip(200, 0.2, 'sawtooth', 0.3, 80); }
  heal() { this._blip(440, 0.1, 'sine', 0.2, 660); }
  dayBird() { this._blip(1200, 0.05, 'sine', 0.12, 1800); setTimeout(() => this._blip(1600, 0.05, 'sine', 0.1, 1400), 60); }

  _startPad() {
    if (!this.ctx) return;
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.06;
    this.padGain.connect(this.master);
    // three detuned oscillators, chord shifts by day/night
    const base = [130.8, 164.8, 196.0]; // C E G
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = base[i];
      const g = this.ctx.createGain(); g.gain.value = 0.5;
      o.connect(g); g.connect(this.padGain); o.start();
      this.padOscs.push(o);
    }
  }
  setNight(isNight) {
    if (this.night === isNight || !this.ctx) return;
    this.night = isNight;
    const day = [130.8, 164.8, 196.0];   // C major-ish, warm
    const night = [123.5, 146.8, 185.0]; // darker, eerie
    const chord = isNight ? night : day;
    const t = this._now();
    this.padOscs.forEach((o, i) => o.frequency.exponentialRampToValueAtTime(chord[i], t + 2));
    if (this.padGain) this.padGain.gain.linearRampToValueAtTime(isNight ? 0.08 : 0.05, t + 2);
  }
}
