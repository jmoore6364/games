// audio.js — all sound synthesized with WebAudio. Looping background themes for
// each area, an ocarina motif, and a bank of SFX. Zero external assets.

const NOTE = {}; // name -> freq
(function () {
  const names = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
  for (let oct = 2; oct <= 6; oct++) {
    for (let i = 0; i < 12; i++) {
      const n = (oct - 4) * 12 + (i - 9); // A4 = 440
      NOTE[names[i] + oct] = 440 * Math.pow(2, n / 12);
    }
  }
})();

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.musicGain = null;
    this._track = null;
    this._loopTimer = null;
    this._step = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
  }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  _osc(freq, t, dur, type, gain, dest, glideTo) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
  }

  _noise(t, dur, gain, filterFreq, dest) {
    const c = this.ctx;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = c.createGain(); g.gain.value = gain || 0.4;
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    src.start(t); src.stop(t + dur);
  }

  // ---- SFX ---------------------------------------------------------------
  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'sword': this._noise(t, 0.16, 0.35, 3000); this._osc(700, t, 0.12, 'sawtooth', 0.12, this.sfxGain, 1400); break;
      case 'spin': this._osc(300, t, 0.4, 'sawtooth', 0.2, this.sfxGain, 900); this._noise(t, 0.4, 0.3, 2500); break;
      case 'hit': this._osc(200, t, 0.18, 'square', 0.25, this.sfxGain, 90); this._noise(t, 0.12, 0.3, 800); break;
      case 'enemyhit': this._osc(420, t, 0.12, 'square', 0.22, this.sfxGain, 160); break;
      case 'hurt': this._osc(330, t, 0.3, 'sawtooth', 0.28, this.sfxGain, 110); this._noise(t, 0.2, 0.35, 900); break;
      case 'rupee': this._osc(NOTE.E5, t, 0.09, 'triangle', 0.25); this._osc(NOTE.A5, t + 0.07, 0.12, 'triangle', 0.25); break;
      case 'heart': this._osc(NOTE.C5, t, 0.1, 'triangle', 0.25); this._osc(NOTE.E5, t + 0.09, 0.1, 'triangle', 0.25); this._osc(NOTE.G5, t + 0.18, 0.14, 'triangle', 0.25); break;
      case 'secret': { const s = [NOTE.G4, NOTE.Fs4, NOTE.Ds4, NOTE.A4, NOTE.Gs4, NOTE.E5, NOTE.Gs5, NOTE.C6]; s.forEach((f, i) => this._osc(f, t + i * 0.13, 0.16, 'triangle', 0.22)); break; }
      case 'door': this._noise(t, 0.5, 0.4, 500); this._osc(120, t, 0.5, 'square', 0.15, this.sfxGain, 60); break;
      case 'chest': { const s = [NOTE.C5, NOTE.G5, NOTE.C6]; s.forEach((f, i) => this._osc(f, t + i * 0.12, 0.2, 'triangle', 0.25)); break; }
      case 'bomb': this._noise(t, 0.6, 0.8, 400); this._osc(80, t, 0.5, 'square', 0.3, this.sfxGain, 40); break;
      case 'bow': this._noise(t, 0.12, 0.3, 2500); this._osc(900, t, 0.1, 'sine', 0.1, this.sfxGain, 1600); break;
      case 'key': this._osc(NOTE.A5, t, 0.1, 'triangle', 0.2); this._osc(NOTE.D5, t + 0.08, 0.14, 'triangle', 0.2); break;
      case 'roll': this._noise(t, 0.2, 0.25, 600); break;
      case 'block': this._osc(NOTE.A3, t, 0.12, 'square', 0.2, this.sfxGain, 300); this._noise(t, 0.08, 0.2, 4000); break;
      case 'roar': this._osc(90, t, 0.8, 'sawtooth', 0.4, this.sfxGain, 55); this._noise(t, 0.8, 0.4, 300); break;
      case 'lock': this._osc(NOTE.E5, t, 0.06, 'sine', 0.18); break;
      case 'menu': this._osc(NOTE.C5, t, 0.05, 'square', 0.15); break;
      case 'victory': { const s = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6]; s.forEach((f, i) => this._osc(f, t + i * 0.16, 0.28, 'triangle', 0.28, this.musicGain)); break; }
      case 'ocarina': { const s = [NOTE.A4, NOTE.D5, NOTE.F5, NOTE.A4, NOTE.D5, NOTE.F5]; s.forEach((f, i) => this._osc(f, t + i * 0.22, 0.3, 'sine', 0.3, this.musicGain)); break; }
    }
  }

  // ---- music sequencer ---------------------------------------------------
  setTrack(name) {
    if (this._track === name) return;
    this._track = name;
    this._step = 0;
    if (this._loopTimer) { clearInterval(this._loopTimer); this._loopTimer = null; }
    if (!this.ctx || !name) return;
    const tempo = name === 'boss' ? 150 : name === 'dungeon' ? 82 : name === 'village' ? 108 : 100;
    const spb = 60 / tempo / 2; // eighth notes
    this._loopTimer = setInterval(() => this._tick(spb), spb * 1000);
  }

  _tick(spb) {
    if (!this.ctx || this.muted) { this._step++; return; }
    const t = this.ctx.currentTime + 0.02;
    const s = this._step % 16;
    const g = this.musicGain;
    const T = this._track;
    if (T === 'overworld') {
      const mel = [NOTE.A4, NOTE.B4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.B4, NOTE.A4,
                   NOTE.G4, NOTE.A4, NOTE.B4, NOTE.D5, NOTE.C5, NOTE.B4, NOTE.A4, NOTE.G4];
      this._osc(mel[s], t, spb * 1.6, 'triangle', 0.14, g);
      if (s % 4 === 0) this._osc(NOTE.A2, t, spb * 2, 'sine', 0.16, g);
    } else if (T === 'village') {
      const mel = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5, NOTE.F5, NOTE.A5, NOTE.G5, NOTE.E5,
                   NOTE.D5, NOTE.F5, NOTE.A5, NOTE.F5, NOTE.G5, NOTE.E5, NOTE.C5, NOTE.G4];
      this._osc(mel[s], t, spb * 1.4, 'triangle', 0.13, g);
      if (s % 2 === 0) this._osc(NOTE.C3, t, spb * 1.2, 'sine', 0.12, g);
    } else if (T === 'dungeon') {
      const bass = [NOTE.D2, 0, NOTE.D2, 0, NOTE.As2, 0, NOTE.C3, 0, NOTE.D2, 0, 0, NOTE.F2, 0, NOTE.E2, 0, 0];
      if (bass[s]) this._osc(bass[s], t, spb * 1.8, 'sawtooth', 0.12, g);
      if (s === 0 || s === 9) this._osc(NOTE.D4, t, spb * 3, 'sine', 0.06, g);
      if (s % 8 === 4) this._noise(t, 0.3, 0.05, 400, g);
    } else if (T === 'boss') {
      const bass = [NOTE.E2, NOTE.E2, NOTE.G2, NOTE.E2, NOTE.As2, NOTE.E2, NOTE.C3, NOTE.B2,
                    NOTE.E2, NOTE.E2, NOTE.G2, NOTE.As2, NOTE.C3, NOTE.As2, NOTE.G2, NOTE.Fs2];
      this._osc(bass[s], t, spb * 1.2, 'sawtooth', 0.15, g);
      if (s % 2 === 0) this._osc(bass[s] * 2, t, spb * 0.8, 'square', 0.05, g);
      if (s % 4 === 0) this._noise(t, 0.1, 0.15, 3000, g);
    }
    this._step++;
  }
}
