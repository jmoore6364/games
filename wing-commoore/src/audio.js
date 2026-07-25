// audio.js — all sound via WebAudio, fully procedural.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engine = null;
    this.engineGain = null;
    this.engineOsc = null;
    this.abNoiseGain = null;
    this.lockOsc = null;
    this.lockGain = null;
  }
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this._buildEngine();
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.9; }

  _buildEngine() {
    const c = this.ctx;
    // low engine hum: two detuned saws + lowpass
    this.engineGain = c.createGain();
    this.engineGain.gain.value = 0.0;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520;
    this.engineOsc = c.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    const osc2 = c.createOscillator();
    osc2.type = 'sawtooth'; osc2.frequency.value = 60.7;
    this._engineOsc2 = osc2;
    this.engineOsc.connect(lp); osc2.connect(lp);
    lp.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start(); osc2.start();

    // afterburner noise
    const nb = this._noiseBuffer();
    this.abNoise = c.createBufferSource();
    this.abNoise.buffer = nb; this.abNoise.loop = true;
    const abf = c.createBiquadFilter(); abf.type = 'bandpass'; abf.frequency.value = 900; abf.Q.value = 0.7;
    this.abNoiseGain = c.createGain(); this.abNoiseGain.gain.value = 0;
    this.abNoise.connect(abf); abf.connect(this.abNoiseGain); this.abNoiseGain.connect(this.master);
    this.abNoise.start();
  }
  _noiseBuffer() {
    const c = this.ctx, len = c.sampleRate * 1.2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  // throttle 0..1, afterburner bool
  engineUpdate(throttle, ab) {
    if (!this.ctx) return;
    const g = 0.05 + throttle * 0.12 + (ab ? 0.05 : 0);
    this.engineGain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.1);
    const f = 52 + throttle * 90 + (ab ? 55 : 0);
    this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08);
    this._engineOsc2.frequency.setTargetAtTime(f * 1.012, this.ctx.currentTime, 0.08);
    this.abNoiseGain.gain.setTargetAtTime(ab ? 0.16 : 0.0, this.ctx.currentTime, 0.06);
  }

  _blip({ f0, f1, dur, type = 'square', gain = 0.25, glide = 'exp' }) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type;
    const g = c.createGain();
    o.frequency.setValueAtTime(f0, t);
    if (glide === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    else o.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  _noiseBurst({ dur = 0.4, gain = 0.4, f = 400, type = 'lowpass', q = 1 }) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this._noiseBuffer();
    const fil = c.createBiquadFilter(); fil.type = type; fil.frequency.value = f; fil.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fil); fil.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  laser() { this._blip({ f0: 1400, f1: 260, dur: 0.16, type: 'sawtooth', gain: 0.16 }); }
  enemyLaser() { this._blip({ f0: 700, f1: 180, dur: 0.16, type: 'square', gain: 0.09 }); }
  missile() {
    this._blip({ f0: 220, f1: 620, dur: 0.5, type: 'sawtooth', gain: 0.2 });
    this._noiseBurst({ dur: 0.5, gain: 0.18, f: 700, type: 'bandpass', q: 0.8 });
  }
  lock() { this._blip({ f0: 1600, f1: 1600, dur: 0.06, type: 'sine', gain: 0.12 }); }
  lockDone() { this._blip({ f0: 2000, f1: 2600, dur: 0.14, type: 'sine', gain: 0.16 }); }
  explosion(big = false) {
    this._noiseBurst({ dur: big ? 0.9 : 0.55, gain: big ? 0.55 : 0.4, f: big ? 260 : 380, type: 'lowpass', q: 1.2 });
    this._blip({ f0: big ? 160 : 240, f1: 40, dur: big ? 0.7 : 0.45, type: 'triangle', gain: 0.22 });
  }
  hit() { this._noiseBurst({ dur: 0.14, gain: 0.24, f: 1200, type: 'bandpass', q: 1.4 }); }
  shieldDown() { this._blip({ f0: 500, f1: 120, dur: 0.4, type: 'square', gain: 0.2 }); }
  alarm() { this._blip({ f0: 880, f1: 660, dur: 0.18, type: 'square', gain: 0.14 }); }
  whoosh() { this._noiseBurst({ dur: 0.5, gain: 0.3, f: 500, type: 'bandpass', q: 0.5 }); }
  warp() { this._blip({ f0: 300, f1: 1500, dur: 0.6, type: 'sine', gain: 0.16, glide: 'exp' }); }
  ui() { this._blip({ f0: 660, f1: 990, dur: 0.08, type: 'square', gain: 0.12 }); }
}
