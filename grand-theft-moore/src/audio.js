// audio.js — WebAudio synth: engine hum (pitches with speed), siren, tyre
// screech, crashes, ped hits, cash/mission stings, and two switchable "radio"
// loops. BROWSER-ONLY. M mutes. All procedural, zero assets.

export class Audio {
  constructor() {
    this.ok = false; this.muted = false;
    this.ctx = null; this.master = null;
    this.engineOsc = null; this.sirenOsc = null;
    this.radioIdx = 0; this.radioGain = null; this.radioNodes = [];
    this._radioTimer = 0;
  }
  init() {
    if (this.ok) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.6; this.master.connect(this.ctx.destination);
    // engine
    this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0; this.engineGain.connect(this.master);
    this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 60;
    this.engineOsc.connect(this.engineGain); this.engineOsc.start();
    // siren
    this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0; this.sirenGain.connect(this.master);
    this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'square'; this.sirenOsc.frequency.value = 700;
    this.sirenOsc.connect(this.sirenGain); this.sirenOsc.start();
    this.sirenLFO = this.ctx.createOscillator(); this.sirenLFO.frequency.value = 2;
    this.sirenLFOgain = this.ctx.createGain(); this.sirenLFOgain.gain.value = 220;
    this.sirenLFO.connect(this.sirenLFOgain); this.sirenLFOgain.connect(this.sirenOsc.frequency); this.sirenLFO.start();
    // radio
    this.radioGain = this.ctx.createGain(); this.radioGain.gain.value = 0; this.radioGain.connect(this.master);
    this.ok = true;
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.6; return this.muted; }

  // called each frame: engine + siren levels
  update(dt, { driving, speed, maxSpeed, stars }) {
    if (!this.ok || this.muted) return;
    const eg = this.engineGain, eo = this.engineOsc;
    if (driving) {
      const sp = Math.min(1, Math.abs(speed) / (maxSpeed || 20));
      eo.frequency.setTargetAtTime(55 + sp * 200, this.ctx.currentTime, 0.05);
      eg.gain.setTargetAtTime(0.12 + sp * 0.06, this.ctx.currentTime, 0.1);
    } else {
      eg.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    const sv = stars > 0 ? Math.min(0.14, 0.05 + stars * 0.02) : 0;
    this.sirenGain.gain.setTargetAtTime(sv, this.ctx.currentTime, 0.2);
    this.sirenLFO.frequency.setTargetAtTime(1.5 + stars * 0.5, this.ctx.currentTime, 0.2);
    // radio auto-fade
    if (this.radioOn) this.radioGain.gain.setTargetAtTime(0.14, this.ctx.currentTime, 0.3);
    else this.radioGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }

  _ping(freq, dur, type = 'square', vol = 0.3) {
    if (!this.ok || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  }
  _noise(dur, vol = 0.3, hp = 800) {
    if (!this.ok || this.muted) return;
    const t = this.ctx.currentTime, n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }

  event(type) {
    switch (type) {
      case 'carjack': this._ping(220, 0.15, 'sawtooth', 0.2); break;
      case 'enter': this._ping(330, 0.08, 'square', 0.15); break;
      case 'exit': this._ping(260, 0.08, 'square', 0.12); break;
      case 'crash': this._noise(0.35, 0.5, 200); this._ping(90, 0.2, 'sawtooth', 0.3); break;
      case 'bump': this._noise(0.15, 0.3, 300); break;
      case 'splat': this._noise(0.18, 0.35, 250); this._ping(140, 0.1, 'triangle', 0.2); break;
      case 'punch': this._noise(0.08, 0.3, 500); break;
      case 'missionStart': this._ping(523, 0.1); this._ping(659, 0.1); break;
      case 'missionComplete': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._ping(f, 0.18, 'square', 0.25), i * 110)); break;
      case 'missionFail': [400, 300, 200].forEach((f, i) => setTimeout(() => this._ping(f, 0.2, 'sawtooth', 0.25), i * 140)); break;
      case 'wasted': [300, 220, 160, 110].forEach((f, i) => setTimeout(() => this._ping(f, 0.4, 'sawtooth', 0.3), i * 220)); break;
      case 'busted': [200, 260, 200, 260].forEach((f, i) => setTimeout(() => this._ping(f, 0.3, 'square', 0.25), i * 180)); break;
      case 'cash': this._ping(880, 0.08); this._ping(1320, 0.12); break;
      case 'wantedUp': this._ping(660, 0.1, 'square', 0.25); this._ping(440, 0.15, 'square', 0.2); break;
    }
  }

  toggleRadio() {
    this.radioOn = !this.radioOn;
    this.radioIdx = (this.radioIdx + 1) % this._stations().length;
    this._startStation();
    return this.radioOn ? this._stations()[this.radioIdx].name : 'RADIO OFF';
  }
  _stations() {
    return [
      { name: 'MOORE FM', notes: [0, 3, 7, 10, 7, 3], tempo: 0.22, type: 'square' },
      { name: 'VICE WAVE', notes: [0, 4, 7, 12, 7, 4, 2], tempo: 0.28, type: 'sawtooth' },
    ];
  }
  _startStation() {
    this._radioSeq = 0;
  }
  radioTick(dt) {
    if (!this.ok || this.muted || !this.radioOn) return;
    this._radioTimer -= dt;
    if (this._radioTimer <= 0) {
      const st = this._stations()[this.radioIdx];
      this._radioTimer = st.tempo;
      const note = st.notes[this._radioSeq % st.notes.length]; this._radioSeq++;
      const freq = 220 * Math.pow(2, note / 12);
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); o.type = st.type; o.frequency.value = freq;
      const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.radioGain); o.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + st.tempo * 0.9);
      o.start(t); o.stop(t + st.tempo);
      // bass
      const b = this.ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = freq / 2;
      const bg = this.ctx.createGain(); bg.gain.value = 0.12; bg.connect(this.radioGain); b.connect(bg);
      bg.gain.exponentialRampToValueAtTime(0.001, t + st.tempo);
      b.start(t); b.stop(t + st.tempo);
    }
  }
}
