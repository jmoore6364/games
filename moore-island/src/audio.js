// All audio synthesized with WebAudio at runtime — original compositions.
// Main theme: calypso/reggae-tinged — steel-drum-ish FM pluck melody,
// offbeat skank chords, walking bass. Spooky variants for grotto/ghost ship.

let ctx = null;
let muted = false;
let musicGain = null;
let curSong = null;
let schedTimer = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  if (musicGain) musicGain.gain.value = muted ? 0 : 0.16;
  return muted;
}

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ------------------------------------------------------------ instruments ----

// steel-drum-ish: sine + strong 2nd/4th partials, fast decay, tiny pitch bend
function steel(m, when, dur, vel = 1, dest) {
  const a = ac();
  const f = midiHz(m);
  const g = a.createGain();
  g.gain.setValueAtTime(0.001, when);
  g.gain.exponentialRampToValueAtTime(0.28 * vel, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  for (const [mult, amp] of [[1, 1], [2.02, 0.55], [3.98, 0.22], [5.1, 0.1]]) {
    const o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * mult * 1.02, when);
    o.frequency.exponentialRampToValueAtTime(f * mult, when + 0.05);
    const og = a.createGain();
    og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(when); o.stop(when + dur + 0.05);
  }
  g.connect(dest);
}

// theremin-ish spooky lead: sine with slow vibrato + portamento
function theremin(m, when, dur, vel = 1, dest) {
  const a = ac();
  const o = a.createOscillator();
  o.type = 'sine';
  const f = midiHz(m);
  o.frequency.setValueAtTime(f * 0.94, when);
  o.frequency.exponentialRampToValueAtTime(f, when + 0.14);
  const lfo = a.createOscillator();
  lfo.frequency.value = 5.2;
  const lg = a.createGain(); lg.gain.value = f * 0.02;
  lfo.connect(lg).connect(o.frequency);
  const g = a.createGain();
  g.gain.setValueAtTime(0.001, when);
  g.gain.linearRampToValueAtTime(0.14 * vel, when + 0.1);
  g.gain.setValueAtTime(0.14 * vel, when + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(g).connect(dest);
  o.start(when); o.stop(when + dur + 0.1);
  lfo.start(when); lfo.stop(when + dur + 0.1);
}

function bassNote(m, when, dur, dest) {
  const a = ac();
  const o = a.createOscillator();
  o.type = 'triangle';
  o.frequency.value = midiHz(m);
  const g = a.createGain();
  g.gain.setValueAtTime(0.001, when);
  g.gain.exponentialRampToValueAtTime(0.30, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.95);
  o.connect(g).connect(dest);
  o.start(when); o.stop(when + dur);
}

function skank(ms, when, dur, dest, vol = 0.06) {
  const a = ac();
  for (const m of ms) {
    const o = a.createOscillator();
    o.type = 'square';
    o.frequency.value = midiHz(m);
    const g = a.createGain();
    g.gain.setValueAtTime(0.001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    const f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1800;
    o.connect(f).connect(g).connect(dest);
    o.start(when); o.stop(when + dur + 0.02);
  }
}

function shaker(when, dest, vol = 0.03) {
  const a = ac();
  const len = Math.floor(a.sampleRate * 0.05);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(dest);
  src.start(when);
}

// ---------------------------------------------------------------- songs ----
// chords as midi triads, melody: [note|0, beats]

const I = 0; // helper for readability in tables

const SONGS = {
  // The Moore Island Theme — bright calypso in C
  main: {
    bpm: 118, lead: steel,
    chords: [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]],
    bass: [[48, 55], [48, 55], [53, 60], [43, 50], [48, 55], [45, 52], [53, 57], [43, 55]],
    mel: [
      [72, 1], [76, 0.5], [74, 0.5], [72, 1], [67, 1],
      [69, 0.5], [72, 0.5], [76, 1], [74, 1.5], [0, 0.5],
      [77, 1], [76, 0.5], [74, 0.5], [72, 1], [69, 1],
      [67, 1], [71, 0.5], [74, 0.5], [72, 1.5], [0, 0.5],
      [72, 0.5], [72, 0.5], [76, 1], [79, 1], [76, 1],
      [74, 0.5], [72, 0.5], [69, 1], [72, 1.5], [0, 0.5],
      [77, 1], [79, 0.5], [77, 0.5], [76, 1], [74, 1],
      [72, 0.5], [71, 0.5], [67, 1], [72, 1.5], [0, 0.5],
    ],
  },
  // tavern: same bones, jauntier
  tavern: {
    bpm: 132, lead: steel,
    chords: [[57, 60, 64], [57, 60, 64], [62, 65, 69], [64, 67, 71], [57, 60, 64], [53, 57, 60], [55, 59, 62], [57, 60, 64]],
    bass: [[45, 52], [45, 52], [50, 57], [40, 47], [45, 52], [41, 48], [43, 50], [45, 52]],
    mel: [
      [69, 0.5], [72, 0.5], [76, 0.5], [72, 0.5], [69, 1], [64, 1],
      [65, 0.5], [69, 0.5], [74, 1], [72, 1.5], [0, 0.5],
      [76, 0.5], [74, 0.5], [72, 0.5], [71, 0.5], [69, 1], [67, 1],
      [64, 0.5], [67, 0.5], [71, 1], [69, 1.5], [0, 0.5],
    ],
  },
  // voodoo shack: minor, mysterious, still swaying
  voodoo: {
    bpm: 96, lead: theremin,
    chords: [[57, 60, 64], [55, 58, 62], [53, 57, 60], [56, 59, 64]],
    bass: [[45, 45], [43, 43], [41, 41], [44, 44]],
    mel: [
      [69, 2], [72, 1], [71, 1], [69, 2], [65, 2],
      [64, 1.5], [65, 0.5], [67, 2], [64, 3], [0, 1],
    ],
  },
  // sailing chart
  map: {
    bpm: 108, lead: steel,
    chords: [[62, 66, 69], [62, 66, 69], [67, 71, 74], [64, 67, 71], [62, 66, 69], [59, 62, 66], [67, 71, 74], [62, 66, 69]],
    bass: [[50, 57], [50, 57], [55, 62], [52, 59], [50, 57], [47, 54], [55, 59], [50, 57]],
    mel: [
      [74, 1.5], [76, 0.5], [78, 1], [74, 1],
      [79, 1.5], [78, 0.5], [76, 1], [74, 1],
      [71, 1], [74, 1], [78, 1], [76, 1],
      [74, 1], [73, 0.5], [74, 0.5], [76, 1.5], [0, 0.5],
    ],
  },
  // jungle / hermit / village: marimba-feel calypso in minor-major sway
  jungle: {
    bpm: 104, lead: steel,
    chords: [[55, 59, 62], [53, 57, 60], [55, 59, 62], [58, 62, 65]],
    bass: [[43, 50], [41, 48], [43, 50], [46, 53]],
    mel: [
      [67, 0.5], [70, 0.5], [74, 1], [72, 1], [70, 1],
      [67, 1], [65, 0.5], [67, 0.5], [70, 1.5], [0, 0.5],
      [74, 0.5], [72, 0.5], [70, 1], [67, 1], [70, 1],
      [72, 1], [74, 0.5], [77, 0.5], [74, 1.5], [0, 0.5],
    ],
  },
  // grotto & ghost ship: the spooky theme, theremin lead
  ghost: {
    bpm: 84, lead: theremin,
    chords: [[52, 55, 59], [50, 53, 57], [48, 52, 55], [51, 55, 58]],
    bass: [[40, 40], [38, 38], [36, 36], [39, 39]],
    mel: [
      [64, 2], [67, 1], [66, 1], [64, 2], [59, 1.5], [0, 0.5],
      [60, 1.5], [59, 0.5], [57, 2], [63, 2], [64, 1.5], [0, 0.5],
    ],
  },
  // ending fireworks: triumphant calypso
  ending: {
    bpm: 124, lead: steel,
    chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74], [60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]],
    bass: [[48, 55], [53, 60], [50, 57], [43, 50], [48, 55], [53, 60], [43, 55], [48, 48]],
    mel: [
      [76, 1], [79, 1], [84, 1.5], [83, 0.5],
      [81, 1], [79, 1], [77, 1], [76, 1],
      [74, 1], [76, 1], [77, 1.5], [76, 0.5],
      [74, 1], [71, 1], [72, 2],
    ],
  },
};

let songState = null;

export function playSong(id) {
  if (curSong === id) return;
  stopMusic();
  const song = SONGS[id];
  if (!song) return;
  curSong = id;
  const a = ac();
  musicGain = a.createGain();
  musicGain.gain.value = muted ? 0 : 0.16;
  musicGain.connect(a.destination);
  songState = { song, next: a.currentTime + 0.08, beat: 0, mi: 0, melNext: a.currentTime + 0.08 };
  const spb = 60 / song.bpm;
  const schedule = () => {
    if (!songState) return;
    const st = songState, sg = st.song;
    const horizon = a.currentTime + 0.9;
    while (st.next < horizon) {
      const bar = Math.floor(st.beat / 4) % sg.chords.length;
      const beatIn = st.beat % 4;
      // walking bass on 1 & 3
      if (beatIn === 0) bassNote(sg.bass[bar][0], st.next, spb * 1.8, musicGain);
      if (beatIn === 2) bassNote(sg.bass[bar][1], st.next, spb * 1.8, musicGain);
      // offbeat skank chords (the "and" of every beat)
      skank(sg.chords[bar], st.next + spb / 2, spb * 0.28, musicGain);
      // shaker eighths
      shaker(st.next, musicGain, 0.022);
      shaker(st.next + spb / 2, musicGain, 0.034);
      st.next += spb;
      st.beat++;
    }
    while (st.melNext < horizon) {
      const [m, beats] = sg.mel[st.mi];
      if (m > 0) sg.lead(m, st.melNext, Math.max(0.18, beats * spb * 0.92), 1, musicGain);
      st.melNext += beats * spb;
      st.mi = (st.mi + 1) % sg.mel.length;
    }
  };
  schedule();
  schedTimer = setInterval(schedule, 300);
}

export function stopMusic() {
  curSong = null;
  songState = null;
  if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
  if (musicGain) { try { musicGain.disconnect(); } catch { } musicGain = null; }
}

// ------------------------------------------------------------------- sfx ----

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

function noise(dur, { vol = 0.1, when = 0, low = 400, hi = 0 } = {}) {
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
  f.type = hi ? 'highpass' : 'lowpass'; f.frequency.value = hi || low;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  blip() { tone(880, 0.05, { vol: 0.04 }); },
  door() { tone(180, 0.14, { type: 'triangle', slide: -60, vol: 0.07 }); noise(0.08, { vol: 0.04, low: 500, when: 0.03 }); },
  open() { tone(160, 0.1, { type: 'triangle', slide: 130 }); tone(320, 0.08, { type: 'triangle', when: 0.09 }); },
  pickup() { tone(660, 0.06); tone(880, 0.06, { when: 0.06 }); tone(1320, 0.09, { when: 0.12 }); },
  clash() { noise(0.09, { vol: 0.1, hi: 2400 }); tone(2400, 0.1, { type: 'triangle', vol: 0.06, slide: -900 }); tone(3100, 0.07, { type: 'triangle', vol: 0.04, when: 0.01, slide: -1200 }); },
  swish() { noise(0.12, { vol: 0.05, hi: 1800 }); },
  thud() { tone(110, 0.12, { type: 'sine', vol: 0.12, slide: -40 }); noise(0.06, { vol: 0.05, low: 300 }); },
  bell() { tone(1560, 0.5, { type: 'triangle', vol: 0.06 }); tone(2340, 0.3, { type: 'sine', vol: 0.03 }); },
  gulp() { tone(300, 0.08, { type: 'sine', slide: -140, vol: 0.07 }); tone(180, 0.1, { type: 'sine', slide: 120, vol: 0.07, when: 0.1 }); },
  melody() { // the kazoo riff: doo doo dee-doo doo
    const seq = [[523, 0.18], [523, 0.18], [659, 0.14], [587, 0.2], [523, 0.34]];
    let t = 0;
    for (const [f, d] of seq) { tone(f, d, { type: 'sawtooth', vol: 0.05 }); tone(f * 1.01, d, { type: 'square', vol: 0.02, when: t }); t += d + 0.04; }
    let t2 = 0;
    for (const [f, d] of seq) { tone(f, d, { type: 'sawtooth', vol: 0.05, when: t2 }); t2 += d + 0.04; }
  },
  award() { tone(523, 0.09); tone(659, 0.09, { when: 0.09 }); tone(784, 0.09, { when: 0.18 }); tone(1047, 0.2, { when: 0.27 }); },
  fanfare() {
    const n = [523, 659, 784, 1047, 784, 1047];
    const d = [0.12, 0.12, 0.12, 0.3, 0.14, 0.5];
    let t = 0;
    for (let i = 0; i < n.length; i++) { tone(n[i], d[i], { type: 'square', vol: 0.06, when: t }); tone(n[i] / 2, d[i], { type: 'triangle', vol: 0.05, when: t }); t += d[i]; }
  },
  seagull() { tone(1400, 0.12, { type: 'sawtooth', vol: 0.025, slide: -500 }); tone(1500, 0.1, { type: 'sawtooth', vol: 0.02, when: 0.16, slide: -600 }); },
  wave() { noise(1.4, { vol: 0.02, low: 700 }); },
  firework() { tone(500, 0.5, { type: 'sine', vol: 0.03, slide: 700 }); noise(0.4, { vol: 0.1, low: 2500, when: 0.5 }); tone(300, 0.4, { type: 'sine', vol: 0.05, when: 0.5, slide: -180 }); },
};

export function playSfx(id) { if (sfx[id]) sfx[id](); }
