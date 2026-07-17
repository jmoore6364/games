// All sound is synthesized with WebAudio at runtime — no audio files.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engine = null;
    this.music = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    return this.muted;
  }

  // --- engine ---------------------------------------------------------------

  startEngine() {
    if (!this.ensure() || this.engine) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    osc.connect(filter); osc2.connect(filter);
    filter.connect(gain); gain.connect(this.master);
    osc.start(); osc2.start();
    this.engine = { osc, osc2, gain, filter };
  }

  setEngine(speedPct, offroad) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    // fake gear steps for that arcade rev-drop
    const gear = Math.min(3, Math.floor(speedPct * 4));
    const within = speedPct * 4 - gear;
    const freq = 42 + within * 70 + gear * 12;
    this.engine.osc.frequency.setTargetAtTime(freq, t, 0.05);
    this.engine.osc2.frequency.setTargetAtTime(freq * 1.5 + (offroad ? 13 : 0), t, 0.05);
    this.engine.filter.frequency.setTargetAtTime(320 + speedPct * 1400, t, 0.1);
    this.engine.gain.gain.setTargetAtTime(0.05 + speedPct * 0.1 + (offroad ? 0.03 : 0), t, 0.08);
  }

  stopEngine() {
    if (!this.engine) return;
    try { this.engine.osc.stop(); this.engine.osc2.stop(); } catch { /* already stopped */ }
    this.engine = null;
  }

  // --- one-shots --------------------------------------------------------------

  blip(freq, dur, type = 'square', vol = 0.2, when = 0) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur);
  }

  noise(dur, vol = 0.3, freq = 800) {
    if (!this.ensure()) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }

  countBeep(final) { this.blip(final ? 880 : 440, final ? 0.5 : 0.18, 'square', 0.25); }
  checkpoint() { [660, 880, 1100, 1320].forEach((f, i) => this.blip(f, 0.12, 'square', 0.2, i * 0.07)); }
  bump() { this.noise(0.15, 0.35, 500); this.blip(90, 0.15, 'sawtooth', 0.3); }
  crash() {
    this.noise(0.8, 0.5, 1200);
    this.blip(60, 0.7, 'sawtooth', 0.4);
    [400, 300, 200, 120].forEach((f, i) => this.blip(f, 0.2, 'square', 0.2, i * 0.12));
  }
  skid() { this.noise(0.2, 0.12, 2200); }
  finishFanfare() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.blip(f, 0.22, 'square', 0.25, i * 0.13));
  }
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.blip(f, 0.3, 'triangle', 0.3, i * 0.25));
  }

  // --- music -------------------------------------------------------------------

  startMusic(opts = {}) {
    if (!this.ensure() || this.music) return;
    const bpm = opts.bpm || 138;
    const root = opts.root || 0; // semitone shift, varies per course
    const bass = [0, 0, 7, 0, 5, 5, 12, 5, 3, 3, 10, 3, 5, 5, 12, 7];   // semitones from A1
    const lead = [12, -1, 16, 19, -1, 16, 12, -1, 15, -1, 19, 22, 19, -1, 15, 12];
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.5;
    gainNode.connect(this.master);
    const state = { step: 0, gain: gainNode, timer: null };
    const stepDur = 60 / bpm / 2; // 8th notes
    const tick = () => {
      const t = this.ctx.currentTime;
      const s = state.step % 16;
      // bass
      this.tone(gainNode, 55 * Math.pow(2, (bass[s] + root) / 12), t, stepDur * 0.9, 'triangle', 0.24);
      // lead every other loop
      if (Math.floor(state.step / 16) % 2 === 1 && lead[s] >= 0) {
        this.tone(gainNode, 220 * Math.pow(2, (lead[s] + root) / 12), t, stepDur * 0.8, 'square', 0.07);
      }
      // hat
      if (s % 2 === 0) this.hat(gainNode, t, s % 4 === 0 ? 0.06 : 0.03);
      state.step++;
    };
    state.timer = setInterval(tick, stepDur * 1000);
    this.music = state;
  }

  tone(dest, freq, t, dur, type, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur);
  }

  hat(dest, t, vol) {
    const len = Math.floor(this.ctx.sampleRate * 0.03);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t);
  }

  stopMusic() {
    if (!this.music) return;
    clearInterval(this.music.timer);
    this.music.gain.disconnect();
    this.music = null;
  }
}
