// Input handling: keyboard map, standard gamepad polling (pad 0 = P1,
// pad 1 = P2), and an on-screen touch UI factory. Pattern shared with
// the other Moore Arcade games.

const MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump',
  KeyX: 'fire',
  // Player 2: IJKL move, I doubles as jump, O blows bubbles.
  KeyJ: 'p2left', KeyL: 'p2right',
  KeyI: 'p2jump', KeyK: 'p2down', KeyO: 'p2fire',
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

  // Standard-mapping gamepads: dpad/left stick, A=jump, X/B=bubble, Start=start.
  // Pad index 0 drives P1 actions, pad index 1 drives the p2* actions.
  pollGamepad() {
    const pads = navigator.getGamepads?.() || [];
    const read = (gp, pre) => {
      if (!gp) return {};
      const b = (i) => !!gp.buttons[i]?.pressed;
      return {
        [pre + 'left']: b(14) || gp.axes[0] < -0.4,
        [pre + 'right']: b(15) || gp.axes[0] > 0.4,
        [pre + 'down']: b(13) || gp.axes[1] > 0.5,
        [pre + 'up']: b(12) || gp.axes[1] < -0.5,
        [pre + 'jump']: b(0),
        [pre + 'fire']: b(2) || b(1),
        start: b(9),
      };
    };
    const now = { ...read(pads[0], ''), ...read(pads[1], 'p2') };
    for (const a of Object.keys(now)) {
      if (now[a] && !this.gpHeld[a] && !this.held[a]) this.pressedNow[a] = true;
    }
    this.gpHeld = now;
  }

  // Called by the touch UI.
  setTouch(a, on) {
    if (on && !this.touchHeld[a]) this.pressedNow[a] = true;
    this.touchHeld[a] = on;
  }

  press(a) { this.pressedNow[a] = true; }

  down(a) { return !!(this.held[a] || this.gpHeld[a] || this.touchHeld[a]); }
  pressed(a) { return !!this.pressedNow[a]; }
  endFrame() { this.pressedNow = {}; }
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

  mkBtn('◀', 'left', 'b-left');
  mkBtn('▶', 'right', 'b-right');
  mkBtn('▲', 'up', 'b-up');
  mkBtn('▼', 'down', 'b-down');
  mkBtn('BUBBLE', 'fire', 'b-fire');
  mkBtn('JUMP', 'jump', 'b-jump');
  mkBtn('MENU', 'start', 'b-start');

  document.body.appendChild(root);
  return true;
}
