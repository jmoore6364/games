// input.js — keyboard, on-screen d-pad, swipe, and gamepad -> a single
// "desired direction" plus edge-triggered action buttons.

const DIR_KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};
const ACT_KEYS = {
  Enter: 'start', Space: 'start',
  KeyM: 'mute',
  KeyP: 'pause',
};

export class Input {
  constructor() {
    this.dir = null;          // latest requested direction (sticky until changed)
    this._dirHeld = {};       // which direction sources are currently down
    this.pressedNow = {};     // edge-triggered actions this frame
    this._gpDir = {};
    this._gpAct = {};

    window.addEventListener('keydown', (e) => {
      const d = DIR_KEYS[e.code];
      if (d) { e.preventDefault(); this._setDir(d, true); return; }
      const a = ACT_KEYS[e.code];
      if (a) { e.preventDefault(); this.pressedNow[a] = true; }
    });
    window.addEventListener('keyup', (e) => {
      const d = DIR_KEYS[e.code];
      if (d) this._setDir(d, false);
    });
    window.addEventListener('blur', () => { this._dirHeld = {}; });
  }

  _setDir(d, on) {
    if (on) { this._dirHeld[d] = true; this.dir = d; }
    else { this._dirHeld[d] = false; }
  }

  setTouchDir(d, on) { this._setDir(d, on); }
  press(a) { this.pressedNow[a] = true; }

  pollGamepad() {
    const gp = navigator.getGamepads?.()?.[0];
    if (!gp) return;
    const b = (i) => !!gp.buttons[i]?.pressed;
    const dirs = {
      left: b(14) || gp.axes[0] < -0.4,
      right: b(15) || gp.axes[0] > 0.4,
      up: b(12) || gp.axes[1] < -0.5,
      down: b(13) || gp.axes[1] > 0.5,
    };
    for (const d of Object.keys(dirs)) {
      if (dirs[d] && !this._gpDir[d]) this.dir = d;
    }
    this._gpDir = dirs;
    const acts = { start: b(9) || b(0), pause: b(8), mute: false };
    for (const a of Object.keys(acts)) {
      if (acts[a] && !this._gpAct[a]) this.pressedNow[a] = true;
    }
    this._gpAct = acts;
  }

  pressed(a) { return !!this.pressedNow[a]; }
  endFrame() { this.pressedNow = {}; }
}

// Wire the on-screen d-pad buttons + canvas swipe to the input object.
export function initTouch(input, canvas) {
  const root = document.getElementById('touch-ui');
  if (root) {
    root.querySelectorAll('.tbtn[data-dir]').forEach((el) => {
      const d = el.getAttribute('data-dir');
      const on = (e) => { e.preventDefault(); input.setTouchDir(d, true); el.classList.add('on'); };
      const off = (e) => { e.preventDefault(); input.setTouchDir(d, false); el.classList.remove('on'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    root.querySelectorAll('.tbtn[data-act]').forEach((el) => {
      const a = el.getAttribute('data-act');
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); input.press(a); });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  // Swipe anywhere on the canvas to steer.
  let sx = 0, sy = 0, tracking = false;
  const start = (e) => { const t = e.touches ? e.touches[0] : e; sx = t.clientX; sy = t.clientY; tracking = true; };
  const move = (e) => {
    if (!tracking) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) input.dir = dx > 0 ? 'right' : 'left';
    else input.dir = dy > 0 ? 'down' : 'up';
    tracking = false;
  };
  const end = () => { tracking = false; };
  canvas.addEventListener('touchstart', start, { passive: true });
  canvas.addEventListener('touchmove', move, { passive: true });
  canvas.addEventListener('touchend', end, { passive: true });
}
