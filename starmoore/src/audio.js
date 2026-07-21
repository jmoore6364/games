// WebAudio synth — all sound generated, no assets.
export class Audio {
  constructor() {
    this.ctx = null; this.muted = false; this.master = null;
    this.musicOn = false; this._musicNodes = []; this._lastPlay = {};
  }
  _ensure() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  }
  resume() { this._ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; }

  _tone(freq, dur, type = 'square', vol = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  _noise(dur, vol = 0.2, filterFreq = 1200, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }
  _throttle(key, ms) { const now = performance.now(); if ((this._lastPlay[key] || 0) + ms > now) return false; this._lastPlay[key] = now; return true; }

  select() { if (this._throttle('sel', 60)) this._tone(660, 0.06, 'square', 0.12); }
  command() { if (this._throttle('cmd', 60)) { this._tone(520, 0.05, 'square', 0.12); this._tone(720, 0.05, 'square', 0.1, null, 0.05); } }
  laser() { if (this._throttle('las', 45)) this._tone(880, 0.08, 'sawtooth', 0.08, 300); }
  cannon() { if (this._throttle('can', 80)) { this._tone(140, 0.12, 'square', 0.16, 60); this._noise(0.1, 0.12, 800); } }
  explosion() { if (this._throttle('exp', 60)) { this._noise(0.35, 0.28, 700); this._tone(90, 0.3, 'square', 0.15, 40); } }
  place() { this._tone(200, 0.14, 'square', 0.2, 120); this._noise(0.12, 0.12, 500); }
  ready() { this._tone(700, 0.1, 'square', 0.14); this._tone(1050, 0.12, 'square', 0.14, null, 0.09); }
  drop() { if (this._throttle('drp', 90)) this._tone(420, 0.04, 'triangle', 0.06); }
  alert() { if (this._throttle('alr', 500)) { this._tone(440, 0.15, 'sawtooth', 0.18); this._tone(370, 0.2, 'sawtooth', 0.18, null, 0.16); } }
  win() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.25, 'square', 0.2, null, i * 0.13)); }
  lose() { [400, 330, 262, 196].forEach((f, i) => this._tone(f, 0.3, 'sawtooth', 0.2, null, i * 0.16)); }

  startMusic() {
    this._ensure(); if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const bass = [55, 55, 73.4, 65.4]; // A1 A1 D2 C2 — brooding
    let step = 0;
    const loop = () => {
      if (!this.musicOn || !this.ctx) return;
      const f = bass[step % bass.length];
      if (!this.muted) {
        this._tone(f, 0.9, 'triangle', 0.10);
        this._tone(f * 2, 0.5, 'sine', 0.04, null, 0.05);
        if (step % 2 === 0) this._tone(f * 3, 0.3, 'sine', 0.03, null, 0.25);
      }
      step++;
      this._musicTimer = setTimeout(loop, 900);
    };
    loop();
  }
  stopMusic() { this.musicOn = false; if (this._musicTimer) clearTimeout(this._musicTimer); }
}
