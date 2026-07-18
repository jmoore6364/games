// Baseball Moores — input for two players. Actions: left/right/up/down,
// a (Z / send / pitch-type), b (X / swing / throw / confirm), start, mute.
// P1: Arrows or WASD + Z/X. P2: IJKL + U/O. Gamepads 0 and 1.

const MAP1 = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'a', KeyX: 'b', Space: 'b', KeyC: 'a',
  Enter: 'start', KeyM: 'mute',
};
const MAP2 = {
  KeyJ: 'left', KeyL: 'right', KeyI: 'up', KeyK: 'down',
  KeyU: 'a', KeyO: 'b',
};

class Pad {
  constructor(map, gpIndex) {
    this.map = map; this.gpIndex = gpIndex;
    this.held = {}; this.pressedNow = {}; this.gpHeld = {}; this.touchHeld = {};
  }
  key(code, down) {
    const a = this.map[code];
    if (!a) return false;
    if (down) { if (!this.held[a]) this.pressedNow[a] = true; this.held[a] = true; }
    else this.held[a] = false;
    return true;
  }
  pollGamepad() {
    const gp = navigator.getGamepads?.()?.[this.gpIndex];
    if (!gp) { this.gpHeld = {}; return; }
    const bt = (i) => !!gp.buttons[i]?.pressed;
    const now = {
      left: bt(14) || gp.axes[0] < -0.4, right: bt(15) || gp.axes[0] > 0.4,
      up: bt(12) || gp.axes[1] < -0.4, down: bt(13) || gp.axes[1] > 0.4,
      a: bt(0) || bt(3), b: bt(2) || bt(1), start: bt(9), mute: false,
    };
    for (const k of Object.keys(now)) {
      if (now[k] && !this.gpHeld[k] && !this.held[k]) this.pressedNow[k] = true;
    }
    this.gpHeld = now;
  }
  setTouch(a, on) { if (on && !this.touchHeld[a]) this.pressedNow[a] = true; this.touchHeld[a] = on; }
  press(a) { this.pressedNow[a] = true; }
  down(a) { return !!(this.held[a] || this.gpHeld[a] || this.touchHeld[a]); }
  pressed(a) { return !!this.pressedNow[a]; }
  endFrame() { this.pressedNow = {}; }
}

export class Input {
  constructor() {
    this.p1 = new Pad(MAP1, 0);
    this.p2 = new Pad(MAP2, 1);
    window.addEventListener('keydown', (e) => {
      let used = this.p1.key(e.code, true);
      used = this.p2.key(e.code, true) || used;
      if (used) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.p1.key(e.code, false); this.p2.key(e.code, false);
    });
    window.addEventListener('blur', () => { this.p1.held = {}; this.p2.held = {}; });
  }
  poll() { this.p1.pollGamepad(); this.p2.pollGamepad(); }
  endFrame() { this.p1.endFrame(); this.p2.endFrame(); }
  // player n (1 or 2)
  pad(n) { return n === 2 ? this.p2 : this.p1; }
  // menu convenience (either player, P1 primary)
  down(a) { return this.p1.down(a) || this.p2.down(a); }
  pressed(a) { return this.p1.pressed(a) || this.p2.pressed(a); }
}

// ---- touch UI: dpad + A/B + MENU. Wires into P1. ----
function initStick(pad, root) {
  const zone = document.createElement('div');
  zone.className = 'stick-zone';
  const knob = document.createElement('div'); knob.className = 'stick-knob';
  zone.appendChild(knob); root.appendChild(zone);
  let pid = null;
  const clear = () => {
    pid = null; knob.style.transform = 'translate(-50%,-50%)';
    for (const a of ['left', 'right', 'up', 'down']) pad.setTouch(a, false);
  };
  const update = (e) => {
    const r = zone.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy), max = r.width / 2;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const dirs = { left: false, right: false, up: false, down: false };
    if (d > 14) {
      const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
      if (oct === 0) dirs.right = true;
      else if (oct === 1) { dirs.right = dirs.down = true; }
      else if (oct === 2) dirs.down = true;
      else if (oct === 3) { dirs.left = dirs.down = true; }
      else if (oct === 4 || oct === -4) dirs.left = true;
      else if (oct === -3) { dirs.left = dirs.up = true; }
      else if (oct === -2) dirs.up = true;
      else if (oct === -1) { dirs.right = dirs.up = true; }
    }
    for (const k of Object.keys(dirs)) pad.setTouch(k, dirs[k]);
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
  const hint = document.getElementById('hint'); if (hint) hint.remove();
  const root = document.createElement('div'); root.id = 'touch-ui';
  const pad = input.p1;
  const mkBtn = (label, action, cls) => {
    const el = document.createElement('div'); el.className = 'tbtn ' + cls; el.textContent = label;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); pad.setTouch(action, true); el.classList.add('on'); });
    const off = (e) => { e.preventDefault(); pad.setTouch(action, false); el.classList.remove('on'); };
    el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    root.appendChild(el); return el;
  };
  initStick(pad, root);
  mkBtn('B', 'b', 'b-fire');
  mkBtn('A', 'a', 'b-jump');
  mkBtn('MENU', 'start', 'b-start');
  document.body.appendChild(root);
  return true;
}
