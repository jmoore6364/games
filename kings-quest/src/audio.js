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
  blip()   { tone(880, 0.06, { type: 'square', vol: 0.05 }); },
  buzz()   { tone(120, 0.15, { type: 'sawtooth', vol: 0.06 }); },
  pickup() { tone(660, 0.07); tone(880, 0.07, { when: 0.07 }); tone(1320, 0.1, { when: 0.14 }); },
  award()  { tone(523, 0.08); tone(659, 0.08, { when: 0.08 }); tone(784, 0.14, { when: 0.16 }); },
  open()   { tone(200, 0.12, { type: 'triangle', slide: 120 }); },
  splash() { noise(0.35, { vol: 0.12, low: 900 }); },
  bleat()  { tone(392, 0.09, { type: 'sawtooth', vol: 0.05 }); tone(370, 0.09, { type: 'sawtooth', vol: 0.05, when: 0.1 }); tone(392, 0.14, { type: 'sawtooth', vol: 0.05, when: 0.2 }); },
  roar()   { noise(0.7, { vol: 0.16, low: 300 }); tone(80, 0.6, { type: 'sawtooth', vol: 0.08, slide: -30 }); },
  steam()  { noise(0.9, { vol: 0.1, low: 2500 }); },
  death()  { tone(330, 0.2, { type: 'triangle' }); tone(262, 0.2, { type: 'triangle', when: 0.2 }); tone(220, 0.2, { type: 'triangle', when: 0.4 }); tone(147, 0.5, { type: 'triangle', when: 0.6 }); },
  fanfare() {
    const n = [523, 523, 523, 659, 784, 659, 784, 1047];
    const d = [0.12, 0.12, 0.12, 0.24, 0.12, 0.12, 0.24, 0.5];
    let t = 0;
    for (let i = 0; i < n.length; i++) { tone(n[i], d[i], { type: 'square', vol: 0.06, when: t }); t += d[i]; }
  },
};

// A short original minor-key court melody, looped quietly under play.
const MELODY = [
  // [midi note or 0=rest, beats]
  [69, 1], [72, 1], [71, 1], [69, 1], [64, 2], [67, 2],
  [69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [71, 2],
  [72, 1], [74, 1], [76, 1], [72, 1], [71, 1], [67, 1], [69, 2],
  [64, 1], [67, 1], [71, 1], [69, 1], [69, 4], [0, 2],
];
const BASS = [45, 45, 40, 43, 45, 41, 43, 45]; // one per 4 beats
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function startMusic() {
  if (musicTimer) return;
  const a = ac();
  musicGain = a.createGain();
  musicGain.gain.value = muted ? 0 : 0.05;
  musicGain.connect(a.destination);

  const beat = 0.28;
  let next = a.currentTime + 0.1;
  let mi = 0, beatCount = 0;

  const schedule = () => {
    while (next < a.currentTime + 0.8) {
      const [m, beats] = MELODY[mi];
      if (m > 0) {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = 'triangle';
        o.frequency.value = midiHz(m);
        g.gain.setValueAtTime(0.9, next);
        g.gain.exponentialRampToValueAtTime(0.001, next + beats * beat * 0.95);
        o.connect(g).connect(musicGain);
        o.start(next); o.stop(next + beats * beat);
      }
      if (beatCount % 4 === 0) {
        const b = BASS[(beatCount / 4) % BASS.length];
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = 'sine';
        o.frequency.value = midiHz(b);
        g.gain.setValueAtTime(0.8, next);
        g.gain.exponentialRampToValueAtTime(0.001, next + 4 * beat * 0.9);
        o.connect(g).connect(musicGain);
        o.start(next); o.stop(next + 4 * beat);
      }
      next += beats * beat;
      beatCount += beats;
      mi = (mi + 1) % MELODY.length;
    }
  };
  schedule();
  musicTimer = setInterval(schedule, 300);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (musicGain) { musicGain.disconnect(); musicGain = null; }
}
