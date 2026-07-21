// input.js — keyboard / gamepad / touch. Roll directions are screen-relative;
// physics.resolveAccel() turns them into iso-world acceleration. A touch
// analog stick and a hop button round it out.

const MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyX: 'hop', Space: 'hop', KeyZ: 'hop',
  Enter: 'start', KeyP: 'start',
  KeyM: 'mute',
};

export class Input {
  constructor() {
    this.held = {};
    this.pressedNow = {};
    this.gpHeld = {};
    this.touchHeld = {};
    this.axis = { x: 0, y: 0 }; // analog stick / gamepad, magnitude 0..1
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

  pollGamepad() {
    const gp = navigator.getGamepads?.()?.[0];
    if (!gp) { this.gpHeld = {}; this.gpAxis = null; return; }
    const b = (i) => !!gp.buttons[i]?.pressed;
    const ax = Math.abs(gp.axes[0]) > 0.18 ? gp.axes[0] : 0;
    const ay = Math.abs(gp.axes[1]) > 0.18 ? gp.axes[1] : 0;
    this.gpAxis = (ax || ay) ? { x: ax, y: ay } : null;
    const now = {
      left: b(14) || gp.axes[0] < -0.4,
      right: b(15) || gp.axes[0] > 0.4,
      down: b(13) || gp.axes[1] > 0.4,
      up: b(12) || gp.axes[1] < -0.4,
      hop: b(0) || b(1),
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
  setAxis(x, y) { this.touchAxis = (x || y) ? { x, y } : null; }

  press(a) { this.pressedNow[a] = true; }
  down(a) { return !!(this.held[a] || this.gpHeld[a] || this.touchHeld[a]); }
  pressed(a) { return !!this.pressedNow[a]; }

  // Analog vector in SCREEN space (x right, y down), magnitude 0..1. Falls back
  // to digital keys mapped to the four screen directions.
  moveVec() {
    const src = this.touchAxis || this.gpAxis;
    if (src) {
      const m = Math.hypot(src.x, src.y);
      return m > 1 ? { x: src.x / m, y: src.y / m } : { x: src.x, y: src.y };
    }
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    return { x, y };
  }

  endFrame() { this.pressedNow = {}; }
}

// Virtual analog stick (drag to roll) + hop + menu buttons.
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
    input.setAxis(0, 0);
  };
  const update = (e) => {
    const r = zone.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    const max = r.width / 2;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    input.setAxis(dx / max, dy / max);
  };
  zone.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; zone.setPointerCapture?.(pid); update(e); });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === pid) { e.preventDefault(); update(e); } });
  zone.addEventListener('pointerup', (e) => { if (e.pointerId === pid) clear(); });
  zone.addEventListener('pointercancel', clear);
  zone.addEventListener('contextmenu', (e) => e.preventDefault());
}

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
    const on = (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); input.setTouch(action, true); el.classList.add('on'); };
    const off = (e) => { e.preventDefault(); input.setTouch(action, false); el.classList.remove('on'); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    root.appendChild(el);
    return el;
  };
  initStick(input, root);
  mkBtn('HOP', 'hop', 'b-hop');
  mkBtn('MENU', 'start', 'b-start');
  document.body.appendChild(root);
  return true;
}
