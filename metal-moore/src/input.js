const MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump',
  KeyX: 'fire', KeyJ: 'fire',
  KeyC: 'nade', KeyK: 'nade',
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

  // Standard-mapping gamepad: dpad/left stick, A=jump, X=fire, B=grenade.
  pollGamepad() {
    const gp = navigator.getGamepads?.()?.[0];
    if (!gp) { this.gpHeld = {}; return; }
    const b = (i) => !!gp.buttons[i]?.pressed;
    const now = {
      left: b(14) || gp.axes[0] < -0.4,
      right: b(15) || gp.axes[0] > 0.4,
      down: b(13) || gp.axes[1] > 0.5,
      up: b(12) || gp.axes[1] < -0.5,
      jump: b(0),
      fire: b(2),
      nade: b(1) || b(5),
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
  const move = (e) => {
    const r = zone.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const max = r.width / 2 - 20;
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const dead = 12;
    input.setTouch('left', dx < -dead);
    input.setTouch('right', dx > dead);
    input.setTouch('up', dy < -dead);
    input.setTouch('down', dy > dead);
  };
  zone.addEventListener('pointerdown', (e) => { pid = e.pointerId; zone.setPointerCapture(pid); move(e); });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === pid) move(e); });
  zone.addEventListener('pointerup', (e) => { if (e.pointerId === pid) clear(); });
  zone.addEventListener('pointercancel', clear);
}

export function initTouch(input) {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (!coarse) return null;
  const root = document.getElementById('touch-ui');
  initStick(input, root);
  const mk = (cls, label, action) => {
    const el = document.createElement('div');
    el.className = `tbtn ${cls}`;
    el.textContent = label;
    root.appendChild(el);
    const on = (e) => { e.preventDefault(); el.classList.add('on'); input.setTouch(action, true); };
    const off = (e) => { e.preventDefault(); el.classList.remove('on'); input.setTouch(action, false); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  };
  mk('b-fire', 'FIRE', 'fire');
  mk('b-jump', 'JMP', 'jump');
  mk('b-nade', 'BMB', 'nade');
  mk('b-start', 'START', 'start');
  return true;
}
