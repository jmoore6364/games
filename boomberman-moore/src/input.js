// Multi-player input: named keyboard maps, per-index gamepads, touch UI.
// Each player slot gets a Pad that merges its sources; menus use a union pad.

const KEYMAPS = {
  // P1 (battle) / campaign primary: WASD + F bomb, G action
  p1: {
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyF: 'bomb', KeyG: 'act',
  },
  // P2 (battle) / campaign alias: arrows + K/L (X/Z kept as classic aliases)
  p2: {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyK: 'bomb', KeyL: 'act', KeyX: 'bomb', KeyZ: 'act',
  },
  sys: { Enter: 'start', KeyM: 'mute', Escape: 'back' },
};

export class Input {
  constructor() {
    this.maps = {};       // mapName -> { held:{}, pressedNow:{} }
    for (const n of Object.keys(KEYMAPS)) this.maps[n] = { held: {}, pressedNow: {} };
    this.gp = [null, null, null, null]; // per index: { held:{}, pressedNow:{} }
    for (let i = 0; i < 4; i++) this.gp[i] = { held: {}, pressedNow: {} };
    this.touch = { held: {}, pressedNow: {} };

    window.addEventListener('keydown', (e) => {
      let used = false;
      for (const n of Object.keys(KEYMAPS)) {
        const a = KEYMAPS[n][e.code];
        if (!a) continue;
        used = true;
        const m = this.maps[n];
        if (!m.held[a]) m.pressedNow[a] = true;
        m.held[a] = true;
      }
      if (used) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      for (const n of Object.keys(KEYMAPS)) {
        const a = KEYMAPS[n][e.code];
        if (a) this.maps[n].held[a] = false;
      }
    });
    window.addEventListener('blur', () => {
      for (const n of Object.keys(KEYMAPS)) this.maps[n].held = {};
      this.touch.held = {};
    });
  }

  // Standard-mapping gamepads: dpad/left stick, A=act, B/X=bomb, Start=start.
  pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < 4; i++) {
      const gp = pads && pads[i];
      const st = this.gp[i];
      if (!gp) { st.held = {}; continue; }
      const b = (k) => !!(gp.buttons[k] && gp.buttons[k].pressed);
      const now = {
        left: b(14) || gp.axes[0] < -0.4,
        right: b(15) || gp.axes[0] > 0.4,
        up: b(12) || gp.axes[1] < -0.5,
        down: b(13) || gp.axes[1] > 0.5,
        bomb: b(2) || b(1),
        act: b(0) || b(3),
        start: b(9),
      };
      for (const a of Object.keys(now)) {
        if (now[a] && !st.held[a]) st.pressedNow[a] = true;
      }
      st.held = now;
    }
  }

  setTouch(a, on) {
    if (on && !this.touch.held[a]) this.touch.pressedNow[a] = true;
    this.touch.held[a] = on;
  }

  endFrame() {
    for (const n of Object.keys(this.maps)) this.maps[n].pressedNow = {};
    for (const st of this.gp) st.pressedNow = {};
    this.touch.pressedNow = {};
  }
}

// A per-player view over some sources.
export class Pad {
  // sources: { keymaps: ['p1'], gamepad: 0|null, touch: bool }
  constructor(input, sources) {
    this.input = input;
    this.src = sources;
  }
  down(a) {
    const i = this.input;
    for (const n of this.src.keymaps || []) if (i.maps[n].held[a]) return true;
    if (this.src.gamepad != null && i.gp[this.src.gamepad].held[a]) return true;
    if (this.src.touch && i.touch.held[a]) return true;
    return false;
  }
  pressed(a) {
    const i = this.input;
    for (const n of this.src.keymaps || []) if (i.maps[n].pressedNow[a]) return true;
    if (this.src.gamepad != null && i.gp[this.src.gamepad].pressedNow[a]) return true;
    if (this.src.touch && i.touch.pressedNow[a]) return true;
    return false;
  }
}

// Standard pads used by the game.
export function makePads(input) {
  return {
    // menus / system: everyone can drive
    menu: new Pad(input, { keymaps: ['p1', 'p2', 'sys'], gamepad: null, touch: true, all: true }),
    sys: new Pad(input, { keymaps: ['sys'], gamepad: null, touch: true }),
    // campaign hero: both key clusters + gamepad 0 + touch
    solo: new Pad(input, { keymaps: ['p1', 'p2'], gamepad: 0, touch: true }),
    // battle slots
    battle: [
      new Pad(input, { keymaps: ['p1'], gamepad: null, touch: true }),
      new Pad(input, { keymaps: ['p2'], gamepad: null, touch: false }),
      new Pad(input, { keymaps: [], gamepad: 0, touch: false }),
      new Pad(input, { keymaps: [], gamepad: 1, touch: false }),
    ],
  };
}

// Union pad for menus: also listens to every gamepad start/act.
export function menuAction(input, action) {
  for (const n of ['p1', 'p2', 'sys']) if (input.maps[n].pressedNow[action]) return true;
  for (const st of input.gp) if (st.pressedNow[action]) return true;
  if (input.touch.pressedNow[action]) return true;
  return false;
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
  mkBtn('BOMB', 'bomb', 'b-bomb');
  mkBtn('ACT', 'act', 'b-act');
  mkBtn('MENU', 'start', 'b-start');

  document.body.appendChild(root);
  return true;
}
