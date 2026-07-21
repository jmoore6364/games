// Defender of the Moore — keyboard / touch / gamepad input.
// Two action buttons: X (confirm / attack) and Z (back / defend).

const MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyX: 'x', KeyL: 'x',
  KeyZ: 'z', KeyK: 'z', Space: 'x',
  Enter: 'start', KeyM: 'mute',
};

export class Input {
  constructor() {
    this.held = {};
    this.pressedNow = {};
    this.gpHeld = {};
    this.touchHeld = {};
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
    window.addEventListener('blur', () => { this.held = {}; });
  }

  // Standard-mapping gamepad: dpad/left stick, A=x, B/X=z, Start=start.
  pollGamepad() {
    const gp = navigator.getGamepads?.()?.[0];
    if (!gp) { this.gpHeld = {}; return; }
    const b = (i) => !!gp.buttons[i]?.pressed;
    const now = {
      left: b(14) || gp.axes[0] < -0.4,
      right: b(15) || gp.axes[0] > 0.4,
      down: b(13) || gp.axes[1] > 0.5,
      up: b(12) || gp.axes[1] < -0.5,
      x: b(0) || b(2),
      z: b(1) || b(3),
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
  endFrame() { this.pressedNow = {}; }
}

// Virtual joystick: one thumb, 8 directions.
function initStick(input, root) {
  const zone = document.createElement('div');
  zone.className = 'stick-zone';
  const knob = document.createElement('div');
  knob.className = 'stick-knob';
  zone.appendChild(knob);
  root.appendChild(zone);

  let pid = null;
  const clear = () => {
    pid = null;
    knob.style.transform = 'translate(-50%,-50%)';
    for (const a of ['left', 'right', 'up', 'down']) input.setTouch(a, false);
  };
  const update = (e) => {
    const r = zone.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    const max = r.width / 2;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const dirs = { left: false, right: false, up: false, down: false };
    if (d > 14) {
      const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
      if (oct === 0) dirs.right = true;
      else if (oct === 1) { dirs.right = true; dirs.down = true; }
      else if (oct === 2) dirs.down = true;
      else if (oct === 3) { dirs.left = true; dirs.down = true; }
      else if (oct === 4 || oct === -4) dirs.left = true;
      else if (oct === -3) { dirs.left = true; dirs.up = true; }
      else if (oct === -2) dirs.up = true;
      else if (oct === -1) { dirs.right = true; dirs.up = true; }
    }
    for (const k of Object.keys(dirs)) input.setTouch(k, dirs[k]);
  };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pid = e.pointerId;
    if (zone.setPointerCapture) zone.setPointerCapture(pid);
    update(e);
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    e.preventDefault();
    update(e);
  });
  zone.addEventListener('pointerup', (e) => { if (e.pointerId === pid) clear(); });
  zone.addEventListener('pointercancel', clear);
  zone.addEventListener('contextmenu', (e) => e.preventDefault());
}

// On-screen controls for touch devices (force with ?touch=1 for testing).
export function initTouch(input) {
  const force = location.search.includes('touch=1');
  const touchy = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!touchy && !force) return false;

  const hint = document.getElementById('hint');
  if (hint) hint.remove();

  const root = document.createElement('div');
  root.id = 'touch-ui';

  const mkBtn = (label, action, cls) => {
    const el = document.createElement('div');
    el.className = 'tbtn ' + cls;
    el.textContent = label;
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
    root.appendChild(el);
    return el;
  };

  initStick(input, root);
  mkBtn('X', 'x', 'b-x');
  mkBtn('Z', 'z', 'b-z');
  mkBtn('MENU', 'start', 'b-start');

  document.body.appendChild(root);
  return true;
}

// Let the map/menus be driven by tapping the canvas directly.
export function initCanvasTap(input, canvas, handler) {
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * canvas.width;
    const y = (e.clientY - r.top) / r.height * canvas.height;
    handler(x, y);
  });
}
