// All sound is synthesized with WebAudio at runtime - original composition, no asset files.

let ctx = null;
let muted = false;
let musicTimer = null;
let musicGain = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  if (musicGain) musicGain.gain.value = muted ? 0 : 0.05;
  return muted;
}

function tone(freq, dur, { type = 'square', vol = 0.08, when = 0, slide = 0 } = {}) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur, { vol = 0.1, when = 0, low = 400 } = {}) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = low;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  blip()    { tone(880, 0.06, { type: 'square', vol: 0.05 }); },
  buzz()    { tone(120, 0.15, { type: 'sawtooth', vol: 0.06 }); },
  pickup()  { tone(660, 0.07); tone(880, 0.07, { when: 0.07 }); tone(1320, 0.1, { when: 0.14 }); },
  award()   { tone(523, 0.08); tone(659, 0.08, { when: 0.08 }); tone(784, 0.14, { when: 0.16 }); },
  open()    { tone(200, 0.12, { type: 'triangle', slide: 120 }); },
  doorbell(){ tone(988, 0.14, { type: 'triangle', vol: 0.06 }); tone(784, 0.22, { type: 'triangle', vol: 0.06, when: 0.15 }); },
  honk()    { tone(440, 0.16, { type: 'sawtooth', vol: 0.1 }); tone(554, 0.16, { type: 'sawtooth', vol: 0.1 }); },
  crash()   { noise(0.5, { vol: 0.18, low: 500 }); tone(90, 0.5, { type: 'sawtooth', vol: 0.1, slide: -50 }); },
  kaching() { for (let i = 0; i < 6; i++) tone(i % 2 ? 1568 : 1319, 0.06, { vol: 0.06, when: i * 0.07 }); tone(2093, 0.3, { vol: 0.06, when: 0.45 }); },
  slurp()   { tone(300, 0.25, { type: 'triangle', vol: 0.07, slide: 500 }); noise(0.15, { vol: 0.05, low: 1200, when: 0.22 }); },
  smooch()  { tone(900, 0.08, { type: 'triangle', vol: 0.08, slide: 600 }); tone(500, 0.05, { type: 'triangle', vol: 0.08, when: 0.09, slide: -200 }); },
  meow()    { tone(620, 0.28, { type: 'sawtooth', vol: 0.045, slide: -220 }); },
  scratch() { noise(0.09, { vol: 0.12, low: 2400 }); noise(0.07, { vol: 0.1, low: 1800, when: 0.11 }); },
  whistle() { tone(1200, 0.12, { type: 'sine', vol: 0.07, slide: 500 }); tone(1700, 0.18, { type: 'sine', vol: 0.07, when: 0.14, slide: -600 }); },
  death()   { tone(330, 0.2, { type: 'triangle' }); tone(262, 0.2, { type: 'triangle', when: 0.2 }); tone(220, 0.2, { type: 'triangle', when: 0.4 }); tone(147, 0.5, { type: 'triangle', when: 0.6 }); },
  fanfare() {
    const n = [523, 523, 523, 659, 784, 659, 784, 1047];
    const d = [0.12, 0.12, 0.12, 0.24, 0.12, 0.12, 0.24, 0.5];
    let t = 0;
    for (let i = 0; i < n.length; i++) { tone(n[i], d[i], { type: 'square', vol: 0.06, when: t }); t += d[i]; }
  },
};

// An original four-on-the-floor disco loop: kick, offbeat hats, octave-hopping
// funk bass, and a little string riff every fourth bar.
const BASS_BARS = [
  [33, 45, 33, 45, 33, 45, 31, 43],
  [33, 45, 33, 45, 36, 48, 38, 50],
  [36, 48, 36, 48, 35, 47, 33, 45],
  [31, 43, 31, 43, 33, 45, 28, 40],
];
const RIFF = [69, 72, 76, 74, 72, 69, 71, 64]; // dorian noodle, one per 8th
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function startMusic() {
  if (musicTimer) return;
  const a = ac();
  musicGain = a.createGain();
  musicGain.gain.value = muted ? 0 : 0.05;
  musicGain.connect(a.destination);

  const eighth = 0.22;
  let next = a.currentTime + 0.1;
  let step = 0; // eighth-note counter

  const schedule = () => {
    while (next < a.currentTime + 0.8) {
      const bar = ((step / 8) | 0) % BASS_BARS.length;
      const sub = step % 8;

      if (sub % 2 === 0) { // kick on the quarters
        const o = a.createOscillator(); const g = a.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(110, next);
        o.frequency.exponentialRampToValueAtTime(45, next + 0.1);
        g.gain.setValueAtTime(1.6, next);
        g.gain.exponentialRampToValueAtTime(0.001, next + 0.12);
        o.connect(g).connect(musicGain);
        o.start(next); o.stop(next + 0.14);
      } else if (!muted) { // hat on the off-eighths
        const len = Math.floor(a.sampleRate * 0.03);
        const buf = a.createBuffer(1, len, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = a.createBufferSource(); src.buffer = buf;
        const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
        const g = a.createGain();
        g.gain.setValueAtTime(0.5, next);
        g.gain.exponentialRampToValueAtTime(0.001, next + 0.03);
        src.connect(hp).connect(g).connect(musicGain);
        src.start(next);
      }

      { // bass
        const m = BASS_BARS[bar][sub];
        const o = a.createOscillator(); const g = a.createGain();
        o.type = 'square';
        o.frequency.value = midiHz(m);
        g.gain.setValueAtTime(0.55, next);
        g.gain.exponentialRampToValueAtTime(0.001, next + eighth * 0.9);
        o.connect(g).connect(musicGain);
        o.start(next); o.stop(next + eighth);
      }

      if (bar === 3) { // string riff over the turnaround bar
        const m = RIFF[sub];
        const o = a.createOscillator(); const g = a.createGain();
        o.type = 'triangle';
        o.frequency.value = midiHz(m);
        g.gain.setValueAtTime(0.65, next);
        g.gain.exponentialRampToValueAtTime(0.001, next + eighth * 1.6);
        o.connect(g).connect(musicGain);
        o.start(next); o.stop(next + eighth * 1.7);
      }

      next += eighth;
      step++;
    }
  };
  schedule();
  musicTimer = setInterval(schedule, 300);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (musicGain) { musicGain.disconnect(); musicGain = null; }
}
