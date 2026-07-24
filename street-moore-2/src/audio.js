// audio.js — WebAudio synth SFX for Street Moore II. Zero asset files.
let ac = null;
let master = null;
let muted = false;

function ensure() {
  if (ac) return ac;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.6;
    master.connect(ac.destination);
  } catch (e) { ac = null; }
  return ac;
}

export function resume() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.6;
}
export function toggleMute() { setMuted(!muted); return muted; }
export function isMuted() { return muted; }

function tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
  const c = ensure(); if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.3, filterFreq = 1200, type = 'lowpass', delay = 0) {
  const c = ensure(); if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

// ---- sound events ----
export const sfx = {
  whiff() { noise(0.12, 0.18, 900, 'bandpass'); tone(220, 0.1, 'sine', 0.08, 140); },
  hitLight() { noise(0.09, 0.35, 1600, 'lowpass'); tone(180, 0.09, 'square', 0.22, 90); },
  hitHeavy() { noise(0.16, 0.5, 900, 'lowpass'); tone(110, 0.18, 'square', 0.32, 55); tone(70, 0.2, 'sine', 0.2, 40); },
  block() { noise(0.1, 0.3, 3200, 'highpass'); tone(520, 0.06, 'square', 0.12, 380); },
  fireball() { tone(680, 0.32, 'sawtooth', 0.22, 180); noise(0.3, 0.14, 700, 'bandpass'); },
  fireballHit() { noise(0.22, 0.5, 800, 'lowpass'); tone(300, 0.2, 'sawtooth', 0.28, 90); },
  jump() { tone(300, 0.16, 'sine', 0.16, 620); },
  land() { noise(0.08, 0.22, 500, 'lowpass'); },
  uppercut() { tone(260, 0.34, 'sawtooth', 0.22, 900); noise(0.2, 0.14, 1400, 'bandpass'); },
  ko() {
    tone(140, 0.6, 'sawtooth', 0.35, 50);
    noise(0.5, 0.4, 700, 'lowpass');
    tone(90, 0.8, 'sine', 0.3, 40, 0.1);
  },
  roundBell() { tone(880, 0.5, 'sine', 0.28); tone(1320, 0.5, 'sine', 0.14); tone(660, 0.5, 'sine', 0.14, null, 0.02); },
  fight() { tone(523, 0.14, 'square', 0.24); tone(784, 0.22, 'square', 0.26, null, 0.14); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'square', 0.22, null, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.2, null, i * 0.15)); },
  menu() { tone(660, 0.08, 'square', 0.16, 880); },
  crowd() { noise(0.7, 0.1, 1200, 'bandpass'); noise(0.7, 0.08, 2400, 'bandpass', 0.05); },
};
