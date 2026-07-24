// audio.js — all sound synthesized live via WebAudio. No asset files.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._wakaFlip = false;
    this._sirenOsc = null;
    this._sirenGain = null;
    this._sirenOn = false;
  }

  // Must be resumed from a user gesture on most browsers.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _blip(type, f0, f1, dur, vol = 0.3, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // The waka-waka: alternate two short tones as Moore-Man chomps a dot.
  waka() {
    if (!this.ctx || this.muted) return;
    this._wakaFlip = !this._wakaFlip;
    const f = this._wakaFlip ? 320 : 180;
    this._blip('square', f, f * 0.6, 0.06, 0.22);
  }

  pellet() {
    if (!this.ctx || this.muted) return;
    this._blip('square', 140, 120, 0.14, 0.28);
  }

  // Rising arpeggio when a frightened ghost is eaten.
  eatGhost(combo = 0) {
    if (!this.ctx || this.muted) return;
    const base = 300 + combo * 120;
    this._blip('square', base, base * 2.4, 0.18, 0.32, 0);
    this._blip('square', base * 1.5, base * 3, 0.14, 0.28, 0.05);
  }

  fruit() {
    if (!this.ctx || this.muted) return;
    this._blip('triangle', 520, 880, 0.12, 0.3, 0);
    this._blip('triangle', 700, 1200, 0.12, 0.3, 0.08);
  }

  extend() {
    if (!this.ctx || this.muted) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this._blip('square', n, n, 0.1, 0.28, i * 0.08));
  }

  // Descending death jingle.
  death() {
    if (!this.ctx || this.muted) return;
    for (let i = 0; i < 8; i++) {
      const f = 660 - i * 62;
      this._blip('sawtooth', f, f * 0.7, 0.12, 0.3, i * 0.11);
    }
  }

  // The Ready! intro fanfare.
  intro() {
    if (!this.ctx || this.muted) return;
    const seq = [
      [392, 0.0], [523, 0.12], [659, 0.24], [784, 0.36],
      [659, 0.5], [784, 0.62], [988, 0.78],
    ];
    seq.forEach(([f, w]) => this._blip('square', f, f, 0.12, 0.26, w));
  }

  // Continuous background siren; frequency rises as dots are eaten.
  startSiren() {
    if (!this.ctx || this._sirenOn) return;
    this._sirenGain = this.ctx.createGain();
    this._sirenGain.gain.value = 0.0;
    this._sirenOsc = this.ctx.createOscillator();
    this._sirenOsc.type = 'sawtooth';
    this._sirenOsc.frequency.value = 55;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    this._sirenOsc.connect(lp); lp.connect(this._sirenGain);
    this._sirenGain.connect(this.master);
    this._sirenOsc.start();
    this._sirenOn = true;
  }

  // progress 0..1 across a level; mode adjusts timbre.
  updateSiren(progress, active, mode = 'normal') {
    if (!this._sirenOn || !this.ctx) return;
    const g = this._sirenGain.gain;
    const now = this.ctx.currentTime;
    if (!active || this.muted) {
      g.setTargetAtTime(0.0, now, 0.05);
      return;
    }
    g.setTargetAtTime(0.05, now, 0.1);
    let base = 50 + progress * 34;
    if (mode === 'fright') base = 30;
    // Warble.
    const warble = base + Math.sin(now * 12) * 6;
    this._sirenOsc.frequency.setTargetAtTime(warble, now, 0.02);
  }

  stopSiren() {
    if (!this._sirenOn) return;
    try { this._sirenOsc.stop(); } catch {}
    this._sirenOn = false;
    this._sirenOsc = null;
    this._sirenGain = null;
  }
}
