// input.js — keyboard, touch d-pad, and gamepad folded into: a vector of
// held directions, a held "roll" flag, and edge-triggered actions.

const DIR_KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};
const ACT_KEYS = { Enter: 'start', KeyM: 'mute', KeyP: 'pause' };

export class Input {
  constructor() {
    this.held = { left: false, right: false, up: false, down: false };
    this.rollHeld = false;
    this.pressedNow = {};
    this._touchHeld = {};
    this._touchRoll = false;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); this.rollHeld = true; this.pressedNow.any = true; return; }
      const d = DIR_KEYS[e.code];
      if (d) { e.preventDefault(); this.held[d] = true; this.pressedNow.any = true; return; }
      const a = ACT_KEYS[e.code];
      if (a) { e.preventDefault(); this.pressedNow[a] = true; this.pressedNow.any = true; }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') { this.rollHeld = false; return; }
      const d = DIR_KEYS[e.code];
      if (d) this.held[d] = false;
    });
    window.addEventListener('blur', () => {
      this.held = { left: false, right: false, up: false, down: false };
      this.rollHeld = false; this._touchHeld = {}; this._touchRoll = false;
    });

    for (const btn of document.querySelectorAll('.tbtn')) {
      const dir = btn.dataset.dir, act = btn.dataset.act;
      const on = (e) => {
        e.preventDefault(); btn.classList.add('on'); this.pressedNow.any = true;
        if (dir) this._touchHeld[dir] = true;
        else if (act === 'roll') this._touchRoll = true;
        else if (act) this.pressedNow[act] = true;
      };
      const off = (e) => {
        e.preventDefault(); btn.classList.remove('on');
        if (dir) this._touchHeld[dir] = false;
        else if (act === 'roll') this._touchRoll = false;
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    }
  }

  poll() {
    // fold gamepad state in each frame
    const gp = navigator.getGamepads && navigator.getGamepads()[0];
    const g = { left: false, right: false, up: false, down: false };
    let gRoll = false;
    if (gp) {
      const [ax, ay] = gp.axes;
      if (ax < -0.4 || gp.buttons[14]?.pressed) g.left = true;
      if (ax > 0.4 || gp.buttons[15]?.pressed) g.right = true;
      if (ay < -0.4 || gp.buttons[12]?.pressed) g.up = true;
      if (ay > 0.4 || gp.buttons[13]?.pressed) g.down = true;
      gRoll = gp.buttons[0]?.pressed || gp.buttons[1]?.pressed;
      if (gp.buttons[9]?.pressed) this.pressedNow.start = true;
    }
    return {
      x: (this.held.right || this._touchHeld.right || g.right ? 1 : 0) -
         (this.held.left || this._touchHeld.left || g.left ? 1 : 0),
      y: (this.held.down || this._touchHeld.down || g.down ? 1 : 0) -
         (this.held.up || this._touchHeld.up || g.up ? 1 : 0),
      roll: this.rollHeld || this._touchRoll || gRoll,
    };
  }

  take(action) {
    if (this.pressedNow[action]) { this.pressedNow[action] = false; return true; }
    return false;
  }

  endFrame() { this.pressedNow = {}; }
}
