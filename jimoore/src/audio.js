// audio.js — tiny WebAudio synth for all sound effects. No assets.

export class Audio {
  constructor() {
    this.muted = false;
    this.ctx = null;
  }

  _ac() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggleMute() { this.muted = !this.muted; return this.muted; }

  _tone(freq, dur, { type = 'square', vol = 0.12, slide = 0, delay = 0 } = {}) {
    const ac = this._ac();
    if (!ac || this.muted) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const gn = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn).connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  _noise(dur, { vol = 0.2, delay = 0, low = false } = {}) {
    const ac = this._ac();
    if (!ac || this.muted) return;
    const t0 = ac.currentTime + delay;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gn = ac.createGain();
    gn.gain.setValueAtTime(vol, t0);
    let node = src;
    if (low) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 700;
      src.connect(f); node = f;
    }
    node.connect(gn).connect(ac.destination);
    src.start(t0);
  }

  eat() { this._tone(880, 0.07, { vol: 0.09 }); this._tone(1320, 0.06, { vol: 0.07, delay: 0.05 }); }
  smash(tier) {
    this._noise(0.18 + tier * 0.06, { vol: 0.22, low: true });
    this._tone(110 - tier * 15, 0.2, { type: 'triangle', vol: 0.18, slide: -60 });
  }
  clank() { this._tone(620, 0.05, { vol: 0.1 }); this._noise(0.05, { vol: 0.08 }); }
  roll() { /* handled as loop-lite: short ticks from main */ this._noise(0.03, { vol: 0.025, low: true }); }
  meow() { this._tone(660, 0.22, { type: 'sawtooth', vol: 0.07, slide: 260 }); }
  bark() { this._tone(140, 0.1, { type: 'square', vol: 0.14, slide: -40 }); this._tone(120, 0.1, { vol: 0.12, delay: 0.13, slide: -30 }); }
  squeak() { this._tone(1500, 0.07, { vol: 0.06, slide: 300 }); }
  scratch() { this._noise(0.12, { vol: 0.16 }); this._tone(300, 0.15, { type: 'sawtooth', vol: 0.1, slide: -120 }); }
  alert() { this._tone(392, 0.12, { vol: 0.13 }); this._tone(784, 0.2, { vol: 0.13, delay: 0.13 }); }
  doorSlam() { this._noise(0.12, { vol: 0.2, low: true }); }
  caught() { for (let i = 0; i < 4; i++) this._tone(500 - i * 90, 0.14, { vol: 0.12, delay: i * 0.12 }); }
  clear() { const n = [523, 659, 784, 1047]; n.forEach((f, i) => this._tone(f, 0.16, { vol: 0.11, delay: i * 0.11 })); }
  gameOver() { const n = [392, 330, 262, 196]; n.forEach((f, i) => this._tone(f, 0.3, { type: 'triangle', vol: 0.12, delay: i * 0.25 })); }
}
