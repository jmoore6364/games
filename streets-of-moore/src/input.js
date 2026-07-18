// Two-player input: per-player "pads" that merge a keyboard cluster with a
// gamepad. P1 = arrows/WASD + X/Z/C (gamepad 0). P2 = IJKL + N/M/B cluster
// (gamepad 1). Global keys: Enter start/pause, 0 mute (M also mutes while
// P2 has not joined — once P2 is in, M is their jump button).

const P1_MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyX: 'attack', KeyZ: 'jump', Space: 'jump', KeyC: 'back',
};

const P2_MAP = {
  KeyJ: 'left', KeyL: 'right', KeyI: 'up', KeyK: 'down',
  KeyN: 'attack', KeyM: 'jump', KeyB: 'back',
};

const GLOBAL_MAP = { Enter: 'start', Digit0: 'mute' };

// One logical controller. Merges keyboard + one gamepad.
class Pad {
  constructor() {
    this.held = {};
    this.pressedNow = {};
    this.gpHeld = {};
    this.touchHeld = {};
  }

  key(a, on) {
    if (on && !this.held[a]) this.pressedNow[a] = true;
    this.held[a] = on;
  }

  setTouch(a, on) {
    if (on && !this.touchHeld[a]) this.pressedNow[a] = true;
    this.touchHeld[a] = on;
  }

  // Standard-mapping gamepad: dpad/left stick, A=jump, X/B=attack,
  // Y=special-ish (mapped to back), shoulders=back attack, Start=start.
  poll(gp) {
    if (!gp) { this.gpHeld = {}; return; }
    const b = (i) => !!gp.buttons[i]?.pressed;
    const now = {
      left: b(14) || gp.axes[0] < -0.4,
      right: b(15) || gp.axes[0] > 0.4,
      down: b(13) || gp.axes[1] > 0.5,
      up: b(12) || gp.axes[1] < -0.5,
      jump: b(0),
      attack: b(2) || b(1),
      back: b(3) || b(4) || b(5),
      start: b(9),
    };
    for (const a of Object.keys(now)) {
      if (now[a] && !this.gpHeld[a] && !this.held[a]) this.pressedNow[a] = true;
    }
    this.gpHeld = now;
  }

  down(a) { return !!(this.held[a] || this.gpHeld[a] || this.touchHeld[a]); }
  pressed(a) { return !!this.pressedNow[a]; }
  press(a) { this.pressedNow[a] = true; }
  endFrame() { this.pressedNow = {}; }
}

export class Input {
  constructor() {
    this.pads = [new Pad(), new Pad()];
    this.global = new Pad();
    window.addEventListener('keydown', (e) => {
      const g = GLOBAL_MAP[e.code];
      const a1 = P1_MAP[e.code];
      const a2 = P2_MAP[e.code];
      if (!g && !a1 && !a2) return;
      e.preventDefault();
      if (e.repeat) return;
      if (g) this.global.key(g, true);
      if (a1) this.pads[0].key(a1, true);
      if (a2) this.pads[1].key(a2, true);
    });
    window.addEventListener('keyup', (e) => {
      const g = GLOBAL_MAP[e.code];
      if (g) this.global.key(g, false);
      const a1 = P1_MAP[e.code];
      if (a1) this.pads[0].key(a1, false);
      const a2 = P2_MAP[e.code];
      if (a2) this.pads[1].key(a2, false);
    });
    window.addEventListener('blur', () => {
      this.global.held = {};
      for (const p of this.pads) p.held = {};
    });
  }

  pad(i) { return this.pads[i]; }

  pollGamepads() {
    const gps = navigator.getGamepads?.() || [];
    this.pads[0].poll(gps[0] || null);
    this.pads[1].poll(gps[1] || null);
    // gamepad Start feeds the global start action too
    for (const p of this.pads) {
      if (p.pressedNow.start) this.global.pressedNow.start = true;
    }
  }

  pressed(a) { return this.global.pressed(a); }
  down(a) { return this.global.down(a); }

  endFrame() {
    this.global.endFrame();
    for (const p of this.pads) p.endFrame();
  }
}

// On-screen controls for touch devices (force with ?touch=1). P1 only.
export function initTouch(input) {
  const force = location.search.includes('touch=1');
  const touchy = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!touchy && !force) return false;

  const hint = document.getElementById('hint');
  if (hint) hint.remove();

  const root = document.createElement('div');
  root.id = 'touch-ui';
  const pad = input.pad(0);

  const mkBtn = (label, action, cls, global = false) => {
    const el = document.createElement('div');
    el.className = 'tbtn ' + cls;
    el.textContent = label;
    const tgt = global ? input.global : pad;
    const on = (e) => {
      e.preventDefault();
      if (el.setPointerCapture && e.pointerId !== undefined) el.setPointerCapture(e.pointerId);
      tgt.setTouch(action, true);
      el.classList.add('on');
    };
    const off = (e) => {
      e.preventDefault();
      tgt.setTouch(action, false);
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    root.appendChild(el);
    return el;
  };

  mkBtn('◀', 'left', 'b-left');
  mkBtn('▶', 'right', 'b-right');
  mkBtn('▲', 'up', 'b-up');
  mkBtn('▼', 'down', 'b-down');
  mkBtn('ATK', 'attack', 'b-attack');
  mkBtn('JUMP', 'jump', 'b-jump');
  mkBtn('SPEC', 'special', 'b-spec');
  mkBtn('BACK', 'back', 'b-back');
  mkBtn('MENU', 'start', 'b-start', true);

  document.body.appendChild(root);
  return true;
}
