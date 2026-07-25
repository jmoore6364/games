// audio.js — procedural WebAudio: a plucked-lyre ambient motif + SFX.
export class Audio {
  constructor() {
    this.ctx = null; this.master = null; this.muted = false;
    this.musicGain = null; this._seq = null; this._mode = 'calm';
  }
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    // gentle sea-wash bed
    const nb = this._noiseBuffer(2.4);
    this._sea = this.ctx.createBufferSource(); this._sea.buffer = nb; this._sea.loop = true;
    const sf = this.ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 380;
    this._seaGain = this.ctx.createGain(); this._seaGain.gain.value = 0.05;
    this._sea.connect(sf); sf.connect(this._seaGain); this._seaGain.connect(this.master);
    this._sea.start();
    this._startMusic();
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05); }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }
  setMode(mode) { this._mode = mode; } // 'calm' | 'battle' | 'tense'

  _noiseBuffer(sec = 1) {
    const c = this.ctx, len = (c.sampleRate * sec) | 0;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  // ---- music: a slow Dorian-ish lyre arpeggio, mode changes tempo/register ----
  _startMusic() {
    const scaleCalm = [220, 246.94, 277.18, 293.66, 329.63, 392, 440];   // A dorian-ish
    const scaleTense = [220, 233.08, 261.63, 293.66, 311.13, 349.23, 415.30];
    let i = 0;
    const step = () => {
      if (!this.ctx) return;
      const battle = this._mode === 'battle';
      const tense = this._mode === 'tense';
      const scale = tense ? scaleTense : scaleCalm;
      const base = scale[i % scale.length];
      const oct = (i % 14 < 7) ? 1 : 0.5;
      this._pluck(base * (oct), battle ? 0.09 : 0.12, tense ? 'triangle' : 'sine');
      if (battle && i % 2 === 0) this._pluck(base * 0.5, 0.06, 'sawtooth'); // drum-ish low
      i++;
      const beat = battle ? 0.26 : tense ? 0.4 : 0.58;
      this._seq = setTimeout(step, beat * 1000);
    };
    step();
  }
  _pluck(freq, gain = 0.12, type = 'sine') {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.001;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const g2 = c.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.musicGain);
    o.start(t); o2.start(t); o.stop(t + 0.95); o2.stop(t + 0.95);
  }
  _blip({ f0, f1, dur, type = 'square', gain = 0.22, glide = 'exp' }) {
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
    const src = c.createBufferSource(); src.buffer = this._noiseBuffer(dur + 0.05);
    const fil = c.createBiquadFilter(); fil.type = type; fil.frequency.value = f; fil.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fil); fil.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }
  // ---- SFX ----
  oar() { this._noiseBurst({ dur: 0.16, gain: 0.12, f: 520, type: 'bandpass', q: 0.8 }); }
  wave() { this._noiseBurst({ dur: 0.6, gain: 0.08, f: 300, type: 'lowpass', q: 0.5 }); }
  bow() { this._blip({ f0: 900, f1: 300, dur: 0.14, type: 'sawtooth', gain: 0.14 }); }
  arrowHit() { this._noiseBurst({ dur: 0.1, gain: 0.16, f: 1400, type: 'bandpass', q: 1.6 }); }
  sword() { this._blip({ f0: 1700, f1: 600, dur: 0.1, type: 'square', gain: 0.12 }); this._noiseBurst({ dur: 0.08, gain: 0.14, f: 2600, type: 'highpass', q: 1 }); }
  clash() { this._blip({ f0: 2200, f1: 1400, dur: 0.08, type: 'triangle', gain: 0.1 }); }
  ram() { this._noiseBurst({ dur: 0.5, gain: 0.5, f: 200, type: 'lowpass', q: 1.4 }); this._blip({ f0: 150, f1: 40, dur: 0.4, type: 'triangle', gain: 0.24 }); }
  volley() { this._blip({ f0: 700, f1: 250, dur: 0.2, type: 'sawtooth', gain: 0.1 }); this._noiseBurst({ dur: 0.2, gain: 0.1, f: 1000, type: 'bandpass', q: 0.6 }); }
  hurt() { this._blip({ f0: 300, f1: 90, dur: 0.3, type: 'square', gain: 0.16 }); }
  sink() { this._noiseBurst({ dur: 0.9, gain: 0.4, f: 240, type: 'lowpass', q: 1 }); this._blip({ f0: 200, f1: 50, dur: 0.7, type: 'sine', gain: 0.16 }); }
  die() { this._noiseBurst({ dur: 0.3, gain: 0.3, f: 500, type: 'lowpass', q: 1 }); }
  ui() { this._blip({ f0: 520, f1: 780, dur: 0.08, type: 'triangle', gain: 0.12 }); }
  pray() { this._blip({ f0: 440, f1: 880, dur: 0.5, type: 'sine', gain: 0.12 }); this._blip({ f0: 660, f1: 1320, dur: 0.6, type: 'sine', gain: 0.08 }); }
  victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._pluck(f, 0.2, 'triangle'), i * 160)); }
  whirl() { this._noiseBurst({ dur: 0.8, gain: 0.2, f: 420, type: 'bandpass', q: 0.4 }); }
  siren() { this._blip({ f0: 660, f1: 990, dur: 0.9, type: 'sine', gain: 0.06 }); }
}
