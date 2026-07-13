// All sound is synthesized at runtime with WebAudio — no asset files.
let ctx = null;
let muted = localStorage.getItem('lodeRunner.muted') === '1';
let musicTimer = null, musicStep = 0, musicNext = 0;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ f, f1, t0, dur, type = 'square', vol = 0.12 }) {
  const a = ac(), o = a.createOscillator(), g = a.createGain();
  const start = t0 ?? a.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(f, start);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start); o.stop(start + dur + 0.02);
}

function noise(dur, vol = 0.1, fc = 900) {
  const a = ac(), len = Math.max(1, (dur * a.sampleRate) | 0);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = fc;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start();
}

const N = { A2: 110, C3: 130.8, D3: 146.8, E3: 164.8, G3: 196, A3: 220, C4: 261.6, D4: 293.7, E4: 329.6, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880 };
const BASS = ['A2', 0, 'E3', 0, 'A2', 0, 'G3', 0, 'A2', 0, 'E3', 0, 'C3', 0, 'D3', 0,
              'A2', 0, 'E3', 0, 'A2', 0, 'G3', 0, 'C3', 0, 'D3', 0, 'E3', 0, 'E3', 0];
const LEAD = ['A4', 0, 'C5', 'E5', 0, 'D5', 'C5', 0, 'A4', 0, 'G4', 'A4', 'C5', 0, 'A4', 0,
              'A4', 0, 'C5', 'E5', 0, 'G5', 'E5', 0, 'D5', 'C5', 'D5', 0, 'E5', 0, 0, 0];
const STEP = 0.22;

function scheduleMusic() {
  const a = ac();
  while (musicNext < a.currentTime + 0.3) {
    const i = musicStep % 32;
    if (BASS[i]) tone({ f: N[BASS[i]], t0: musicNext, dur: STEP * 0.9, type: 'triangle', vol: 0.07 });
    if (LEAD[i]) tone({ f: N[LEAD[i]], t0: musicNext, dur: STEP * 0.8, type: 'square', vol: 0.028 });
    musicStep++; musicNext += STEP;
  }
}

export const audio = {
  get muted() { return muted; },
  unlock() { ac(); },
  toggleMute() {
    muted = !muted;
    localStorage.setItem('lodeRunner.muted', muted ? '1' : '0');
    if (muted) this.stopMusic(); else this.startMusic();
    return muted;
  },
  startMusic() {
    if (muted || musicTimer) return;
    musicNext = ac().currentTime + 0.05; musicStep = 0;
    scheduleMusic();
    musicTimer = setInterval(scheduleMusic, 100);
  },
  stopMusic() { clearInterval(musicTimer); musicTimer = null; },

  dig() { if (!muted) { noise(0.18, 0.14, 700); tone({ f: 160, f1: 70, dur: 0.15, type: 'triangle', vol: 0.1 }); } },
  gold() { if (!muted) { tone({ f: 880, dur: 0.07, vol: 0.09 }); tone({ f: 1318, t0: ac().currentTime + 0.07, dur: 0.12, vol: 0.09 }); } },
  trap() { if (!muted) { tone({ f: 110, f1: 55, dur: 0.2, type: 'triangle', vol: 0.14 }); noise(0.12, 0.08, 400); } },
  guardDie() { if (!muted) tone({ f: 300, f1: 900, dur: 0.25, type: 'sawtooth', vol: 0.07 }); },
  die() { if (!muted) tone({ f: 500, f1: 55, dur: 0.7, type: 'sawtooth', vol: 0.12 }); },
  reveal() {
    if (muted) return;
    [523, 659, 784, 1047].forEach((f, i) => tone({ f, t0: ac().currentTime + i * 0.09, dur: 0.14, vol: 0.09 }));
  },
  win() {
    if (muted) return;
    [440, 554, 659, 880, 659, 880, 1109].forEach((f, i) =>
      tone({ f, t0: ac().currentTime + i * 0.12, dur: 0.16, vol: 0.1 }));
  },
  gameOver() {
    if (muted) return;
    [330, 262, 196, 131].forEach((f, i) =>
      tone({ f, t0: ac().currentTime + i * 0.22, dur: 0.3, type: 'triangle', vol: 0.12 }));
  },
};
