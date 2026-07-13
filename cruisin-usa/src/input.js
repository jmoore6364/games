// Keyboard + gamepad input, merged into one state object each frame.

export class Input {
  constructor() {
    this.keys = {};
    // continuous state read by the game every frame
    this.state = { left: false, right: false, accel: false, brake: false };
    // edge-triggered actions, consumed by the game
    this.pressed = {}; // start, mute, restart, left, right
    // touch overlays write here
    this.touch = { left: false, right: false, accel: false, brake: false };

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === 'enter' || k === ' ') this.pressed.start = true;
      if (k === 'm') this.pressed.mute = true;
      if (k === 'r') this.pressed.restart = true;
      if (k === 'arrowleft' || k === 'a') this.pressed.left = true;
      if (k === 'arrowright' || k === 'd') this.pressed.right = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase()) || e.key.startsWith('Arrow')) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    this.prevPadButtons = [];
  }

  poll() {
    const k = this.keys, t = this.touch;
    const s = this.state;
    s.left = !!(k['arrowleft'] || k['a'] || t.left);
    s.right = !!(k['arrowright'] || k['d'] || t.right);
    s.accel = !!(k['arrowup'] || k['w'] || t.accel);
    s.brake = !!(k['arrowdown'] || k['s'] || t.brake);

    // gamepad (standard mapping)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] || 0;
      if (ax < -0.3 || pad.buttons[14]?.pressed) s.left = true;
      if (ax > 0.3 || pad.buttons[15]?.pressed) s.right = true;
      if (pad.buttons[0]?.pressed || pad.buttons[7]?.pressed || pad.buttons[12]?.pressed) s.accel = true;
      if (pad.buttons[1]?.pressed || pad.buttons[6]?.pressed || pad.buttons[13]?.pressed) s.brake = true;
      if (pad.buttons[9]?.pressed && !this.prevPadButtons[9]) this.pressed.start = true;
      if (pad.buttons[0]?.pressed && !this.prevPadButtons[0]) this.pressed.start = true;
      if ((s.left && !this.prevPadLeft)) this.pressed.left = true;
      if ((s.right && !this.prevPadRight)) this.pressed.right = true;
      this.prevPadButtons = pad.buttons.map((b) => b.pressed);
      this.prevPadLeft = s.left; this.prevPadRight = s.right;
      break;
    }
    return s;
  }

  consume(name) {
    const v = this.pressed[name];
    this.pressed[name] = false;
    return !!v;
  }
}
