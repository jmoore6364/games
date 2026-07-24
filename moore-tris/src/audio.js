// All sound via WebAudio, generated procedurally. No asset files.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let masterGain = null;
  let arpTimer = null;
  let arpStep = 0;
  let arpGain = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.6;
      masterGain.connect(ctx.destination);
      arpGain = ctx.createGain();
      arpGain.gain.value = 0.10;
      arpGain.connect(masterGain);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'square', vol = 0.3, when = 0) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const sounds = {
    move() { tone(220, 0.04, 'square', 0.12); },
    rotate() { tone(330, 0.05, 'square', 0.14); },
    softdrop() { tone(160, 0.03, 'square', 0.08); },
    harddrop() {
      tone(140, 0.06, 'sawtooth', 0.2);
      tone(90, 0.12, 'sine', 0.2, 0.02);
    },
    lock() { tone(180, 0.06, 'triangle', 0.18); },
    hold() { tone(400, 0.06, 'sine', 0.16); },
    clear(lines) {
      const base = 440;
      for (let i = 0; i < lines; i++) {
        tone(base + i * 120, 0.10, 'square', 0.22, i * 0.05);
      }
    },
    tetris() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => tone(n, 0.14, 'square', 0.26, i * 0.06));
      notes.forEach((n, i) => tone(n * 1.5, 0.12, 'triangle', 0.14, 0.28 + i * 0.05));
    },
    levelup() {
      [392, 523, 659, 784].forEach((n, i) => tone(n, 0.12, 'triangle', 0.22, i * 0.07));
    },
    gameover() {
      [392, 330, 262, 196].forEach((n, i) => tone(n, 0.25, 'sawtooth', 0.22, i * 0.14));
    },
  };

  // Light background arpeggio loop (a Korobeiniki-flavoured pattern).
  const ARP = [
    659, 494, 523, 587, 523, 494, 440, 440,
    523, 659, 587, 523, 494, 494, 523, 587,
    659, 523, 440, 440, 0, 0, 0, 0,
  ];
  function startArp() {
    if (arpTimer) return;
    const stepDur = 180; // ms
    arpTimer = setInterval(() => {
      if (muted) { arpStep = (arpStep + 1) % ARP.length; return; }
      const c = ensure();
      if (!c) return;
      const f = ARP[arpStep % ARP.length];
      arpStep++;
      if (f > 0) {
        const t0 = c.currentTime;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.10, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + stepDur / 1000 * 0.9);
        osc.connect(g);
        g.connect(arpGain);
        osc.start(t0);
        osc.stop(t0 + stepDur / 1000);
      }
    }, stepDur);
  }
  function stopArp() {
    if (arpTimer) { clearInterval(arpTimer); arpTimer = null; }
  }

  return {
    ...sounds,
    resume() { ensure(); },
    startArp() { ensure(); startArp(); },
    stopArp,
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
  };
}
