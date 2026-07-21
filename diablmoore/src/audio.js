// audio.js — WebAudio procedural sound: dark drones + sfx. Browser only, fully guarded.
let ctx = null, master = null, muted = false, droneNodes = null, curDrone = null;

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}
export function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); else ensure(); }
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; }

function env(node, gain, t0, a, d, dur, peak = 1) {
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * peak), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g); g.connect(master); return g;
}
function tone(freq, type, t0, dur, gain, a = 0.005) {
  if (!ensure() || muted) return;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
  env(o, gain, t0, a, 0.02, dur); o.start(t0); o.stop(t0 + dur + 0.02);
  return o;
}
function noise(t0, dur, gain, filterFreq, type = 'lowpass') {
  if (!ensure() || muted) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
  src.connect(f); env(f, gain, t0, 0.002, 0.01, dur); src.start(t0);
}

export const sfx = {
  swing() { const t = ctx ? ctx.currentTime : 0; noise(t, 0.12, 0.25, 900, 'bandpass'); },
  hit() { const t = ensure() ? ctx.currentTime : 0; noise(t, 0.09, 0.4, 2200, 'highpass'); tone(120, 'square', t, 0.08, 0.2); },
  monsterHit() { const t = ensure() ? ctx.currentTime : 0; tone(80, 'sawtooth', t, 0.12, 0.25); noise(t, 0.1, 0.2, 700); },
  monsterDie() { const t = ensure() ? ctx.currentTime : 0; if (!ctx) return; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.4); env(o, 0.3, t, 0.01, 0.05, 0.45); o.start(t); o.stop(t + 0.5); noise(t, 0.3, 0.2, 500); },
  playerHurt() { const t = ensure() ? ctx.currentTime : 0; tone(200, 'square', t, 0.15, 0.3); tone(150, 'square', t + 0.02, 0.15, 0.25); },
  cast() { const t = ensure() ? ctx.currentTime : 0; if (!ctx) return; const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.2); env(o, 0.22, t, 0.01, 0.05, 0.25); o.start(t); o.stop(t + 0.3); },
  firebolt() { const t = ensure() ? ctx.currentTime : 0; if (!ctx) return; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.25); env(o, 0.25, t, 0.01, 0.05, 0.3); o.start(t); o.stop(t + 0.3); noise(t, 0.2, 0.15, 1200); },
  bow() { const t = ensure() ? ctx.currentTime : 0; noise(t, 0.08, 0.3, 1600, 'bandpass'); tone(300, 'triangle', t, 0.06, 0.15); },
  pickupGold() { const t = ensure() ? ctx.currentTime : 0; tone(880, 'triangle', t, 0.06, 0.2); tone(1320, 'triangle', t + 0.05, 0.08, 0.18); },
  pickupItem() { const t = ensure() ? ctx.currentTime : 0; tone(660, 'sine', t, 0.08, 0.2); tone(990, 'sine', t + 0.06, 0.1, 0.18); },
  potion() { const t = ensure() ? ctx.currentTime : 0; if (!ctx) return; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(500, t + 0.15); env(o, 0.2, t, 0.02, 0.05, 0.25); o.start(t); o.stop(t + 0.3); },
  levelup() { const t = ensure() ? ctx.currentTime : 0; [523, 659, 784, 1047].forEach((f, i) => tone(f, 'triangle', t + i * 0.08, 0.2, 0.22)); },
  door() { const t = ensure() ? ctx.currentTime : 0; noise(t, 0.4, 0.2, 300); tone(90, 'sawtooth', t, 0.4, 0.12); },
  stairs() { const t = ensure() ? ctx.currentTime : 0; [200, 150, 100].forEach((f, i) => tone(f, 'sine', t + i * 0.1, 0.3, 0.18)); },
  bossRoar() { const t = ensure() ? ctx.currentTime : 0; if (!ctx) return; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(50, t + 1.0); env(o, 0.4, t, 0.05, 0.2, 1.4); o.start(t); o.stop(t + 1.5); noise(t, 1.2, 0.25, 400); },
  victory() { const t = ensure() ? ctx.currentTime : 0; [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 'triangle', t + i * 0.14, 0.4, 0.25)); },
  death() { const t = ensure() ? ctx.currentTime : 0; [400, 300, 200, 120].forEach((f, i) => tone(f, 'sawtooth', t + i * 0.15, 0.4, 0.22)); },
  ui() { const t = ensure() ? ctx.currentTime : 0; tone(600, 'square', t, 0.03, 0.1); },
};

// ambient drone: brooding, melancholic. mode: 'town' | 'dungeon' | 'hell'
export function setDrone(mode) {
  if (!ensure()) return;
  if (curDrone === mode) return;
  curDrone = mode;
  stopDrone();
  if (muted) return;
  const roots = { town: 110, dungeon: 82.4, hell: 61.7 };
  const root = roots[mode] || 82.4;
  const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2); g.connect(master);
  const oscs = [];
  const intervals = mode === 'town' ? [1, 1.5, 2] : mode === 'hell' ? [1, 1.0595, 1.5] : [1, 1.5, 2.02];
  intervals.forEach((mult, i) => {
    const o = ctx.createOscillator(); o.type = i === 0 ? 'sawtooth' : 'sine'; o.frequency.value = root * mult;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08 + i * 0.05;
    const lg = ctx.createGain(); lg.gain.value = root * 0.01; lfo.connect(lg); lg.connect(o.frequency);
    const og = ctx.createGain(); og.gain.value = i === 0 ? 0.5 : 0.3;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = mode === 'hell' ? 400 : 600;
    o.connect(og); og.connect(f); f.connect(g); o.start(); lfo.start(); oscs.push(o, lfo);
  });
  droneNodes = { g, oscs };
}
export function stopDrone() {
  if (droneNodes) {
    try { droneNodes.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5); droneNodes.oscs.forEach((o) => o.stop(ctx.currentTime + 0.6)); } catch {}
    droneNodes = null;
  }
}
