// Input: keyboard, standard gamepad, and a touch dpad + A/B buttons.
// Pattern follows contra-moore/src/input.js.

const MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'confirm', Space: 'confirm',
  KeyX: 'cancel', KeyK: 'cancel',
  Enter: 'start', KeyM: 'mute',
};

export class Input {
  constructor() {
    this.held = {};
    this.pressedNow = {};
    this.gpHeld = {};
    this.touchHeld = {};
    this.repeatT = {};
    window.addEventListener('keydown', (e) => {
      const a = MAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!this.held[a]) this.pressedNow[a] = true;
      this.held[a] = true;
    });
    window.addEventListener('keyup', (e) => {
      const a = MAP[e.code];
      if (!a) return;
      this.held[a] = false;
    });
    window.addEventListener('blur', () => { this.held = {}; this.touchHeld = {}; });
  }

  // Standard-mapping gamepad: dpad/left stick, A=confirm, B=cancel, Start=start.
  pollGamepad() {
    const gp = navigator.getGamepads?.()?.[0];
    if (!gp) { this.gpHeld = {}; return; }
    const b = (i) => !!gp.buttons[i]?.pressed;
    const now = {
      left: b(14) || gp.axes[0] < -0.4,
      right: b(15) || gp.axes[0] > 0.4,
      down: b(13) || gp.axes[1] > 0.5,
      up: b(12) || gp.axes[1] < -0.5,
      confirm: b(0),
      cancel: b(1) || b(2),
      start: b(9),
      mute: false,
    };
    for (const a of Object.keys(now)) {
      if (now[a] && !this.gpHeld[a] && !this.held[a]) this.pressedNow[a] = true;
    }
    this.gpHeld = now;
  }

  setTouch(a, on) {
    if (on && !this.touchHeld[a]) this.pressedNow[a] = true;
    this.touchHeld[a] = on;
  }

  press(a) { this.pressedNow[a] = true; }
  down(a) { return !!(this.held[a] || this.gpHeld[a] || this.touchHeld[a]); }
  pressed(a) { return !!this.pressedNow[a]; }

  // Held-direction key repeat for cursor movement (call once per frame with dt).
  repeat(a, dt, first = 0.28, rate = 0.09) {
    if (!this.down(a)) { this.repeatT[a] = 0; return false; }
    if (this.pressed(a)) { this.repeatT[a] = -first + rate; return true; }
    this.repeatT[a] = (this.repeatT[a] || 0) + dt;
    if (this.repeatT[a] >= rate) { this.repeatT[a] -= rate; return true; }
    return false;
  }

  endFrame() { this.pressedNow = {}; }
}

// On-screen dpad + A (confirm) / B (cancel) buttons for touch devices.
export function initTouch(input) {
  const force = location.search.includes('touch=1');
  const touchy = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!touchy && !force) return false;

  const hint = document.getElementById('hint');
  if (hint) hint.remove();

  const root = document.createElement('div');
  root.id = 'touch-ui';

  const hook = (el, action) => {
    const on = (e) => {
      e.preventDefault();
      if (el.setPointerCapture && e.pointerId !== undefined) el.setPointerCapture(e.pointerId);
      input.setTouch(action, true);
      el.classList.add('on');
    };
    const off = (e) => {
      e.preventDefault();
      input.setTouch(action, false);
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  const pad = document.createElement('div');
  pad.className = 'dpad';
  for (const [dir, label, cls] of [['up', '▲', 'd-up'], ['down', '▼', 'd-down'], ['left', '◀', 'd-left'], ['right', '▶', 'd-right']]) {
    const el = document.createElement('div');
    el.className = 'tbtn dbtn ' + cls;
    el.textContent = label;
    hook(el, dir);
    pad.appendChild(el);
  }
  root.appendChild(pad);

  const mkBtn = (label, action, cls) => {
    const el = document.createElement('div');
    el.className = 'tbtn ' + cls;
    el.textContent = label;
    hook(el, action);
    root.appendChild(el);
  };
  mkBtn('B', 'cancel', 'b-b');
  mkBtn('A', 'confirm', 'b-a');
  mkBtn('MENU', 'start', 'b-start');

  document.body.appendChild(root);
  return true;
}
