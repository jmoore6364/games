// audio.js — WebAudio synthesized SFX + ambient rumble. No external files.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambient = null;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  _noise(dur) {
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(); s.buffer = buf; return s;
  }

  _env(node, t0, a, peak, dur) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g); g.connect(this.master);
    return g;
  }

  pistol() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this._noise(0.14);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
    n.connect(bp);
    const g = this._env(bp, t, 0.002, 0.7, 0.14); void g;
    n.start(t); n.stop(t + 0.15);
    // low thump
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    this._env(o, t, 0.002, 0.4, 0.12); o.start(t); o.stop(t + 0.13);
  }

  shotgun() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this._noise(0.3);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    n.connect(lp);
    this._env(lp, t, 0.003, 0.9, 0.3); n.start(t); n.stop(t + 0.32);
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    this._env(o, t, 0.003, 0.5, 0.22); o.start(t); o.stop(t + 0.24);
  }

  growl(freq = 90) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t); o.frequency.linearRampToValueAtTime(freq * 0.6, t + 0.35);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    // wobble
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 18; const lg = this.ctx.createGain(); lg.gain.value = 20;
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.4);
    o.connect(lp); this._env(lp, t, 0.02, 0.55, 0.4); o.start(t); o.stop(t + 0.42);
  }

  sight() { this.growl(150); }
  pain() { this.growl(200); }
  death() {
    if (!this.ctx) return;
    this.growl(120);
    const t = this.ctx.currentTime;
    const n = this._noise(0.5);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    n.connect(lp); this._env(lp, t, 0.02, 0.4, 0.5); n.start(t); n.stop(t + 0.5);
  }

  hurt() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(440, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    this._env(o, t, 0.005, 0.5, 0.22); o.start(t); o.stop(t + 0.24);
  }

  pickup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(520, t); o.frequency.setValueAtTime(780, t + 0.06); o.frequency.setValueAtTime(1040, t + 0.12);
    this._env(o, t, 0.004, 0.4, 0.2); o.start(t); o.stop(t + 0.22);
  }

  door() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this._noise(0.6);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(200, t); bp.frequency.linearRampToValueAtTime(500, t + 0.5); bp.Q.value = 2;
    n.connect(bp); this._env(bp, t, 0.05, 0.4, 0.6); n.start(t); n.stop(t + 0.62);
  }

  levelClear() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
      this._env(o, t + i * 0.12, 0.01, 0.4, 0.12 + i * 0.12 + 0.3 - i * 0.12); // simple
      const g = this.ctx.createGain(); void g;
      o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.4);
    });
  }

  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 42;
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 55;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
    const g = this.ctx.createGain(); g.gain.value = 0.12;
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master);
    o.start(); o2.start();
    this.ambient = { o, o2, g };
  }
}
