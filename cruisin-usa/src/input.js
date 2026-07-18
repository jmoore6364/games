// Keyboard + gamepad input. poll(1) merges everything into one state (arrows,
// WASD, touch, any pad). poll(2) splits: P1 = arrows + touch + pad #1,
// P2 = WASD + pad #2.

export class Input {
  constructor() {
    this.keys = {};
    // continuous state of player 1, kept for compatibility
    this.state = { left: false, right: false, accel: false, brake: false };
    // edge-triggered actions, consumed by the game
    this.pressed = {}; // start, mute, restart, left, right, up, down, two
    // touch overlays write here
    this.touch = { left: false, right: false, accel: false, brake: false };

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === 'enter' || k === ' ') this.pressed.start = true;
      if (k === 'm') this.pressed.mute = true;
      if (k === 'r') this.pressed.restart = true;
      if (k === '2') this.pressed.two = true;
      if (k === 'arrowleft' || k === 'a') this.pressed.left = true;
      if (k === 'arrowright' || k === 'd') this.pressed.right = true;
      if (k === 'arrowup' || k === 'w') this.pressed.up = true;
      if (k === 'arrowdown' || k === 's') this.pressed.down = true;
      if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    this.prevPadButtons = [];
    this.prevPadLeft = false;
    this.prevPadRight = false;
  }

  applyPad(pad, s) {
    if (!pad) return;
    const ax = pad.axes[0] || 0;
    if (ax < -0.3 || pad.buttons[14]?.pressed) s.left = true;
    if (ax > 0.3 || pad.buttons[15]?.pressed) s.right = true;
    if (pad.buttons[0]?.pressed || pad.buttons[7]?.pressed || pad.buttons[12]?.pressed) s.accel = true;
    if (pad.buttons[1]?.pressed || pad.buttons[6]?.pressed || pad.buttons[13]?.pressed) s.brake = true;
  }

  poll(n = 1) {
    const k = this.keys, t = this.touch;
    const s1 = {
      left: !!(k['arrowleft'] || t.left),
      right: !!(k['arrowright'] || t.right),
      accel: !!(k['arrowup'] || t.accel),
      brake: !!(k['arrowdown'] || t.brake),
    };
    const s2 = {
      left: !!k['a'], right: !!k['d'], accel: !!k['w'], brake: !!k['s'],
    };

    const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pads = [];
    for (const pad of rawPads) { if (pad) pads.push(pad); if (pads.length >= 2) break; }
    this.applyPad(pads[0], s1);
    if (n === 2) this.applyPad(pads[1], s2);

    // pad menu edges (first pad only)
    const pad = pads[0];
    if (pad) {
      if (pad.buttons[9]?.pressed && !this.prevPadButtons[9]) this.pressed.start = true;
      if (pad.buttons[0]?.pressed && !this.prevPadButtons[0]) this.pressed.start = true;
      if (s1.left && !this.prevPadLeft) this.pressed.left = true;
      if (s1.right && !this.prevPadRight) this.pressed.right = true;
      this.prevPadButtons = pad.buttons.map((b) => b.pressed);
      this.prevPadLeft = s1.left;
      this.prevPadRight = s1.right;
    }

    if (n === 1) {
      s1.left = s1.left || s2.left;
      s1.right = s1.right || s2.right;
      s1.accel = s1.accel || s2.accel;
      s1.brake = s1.brake || s2.brake;
    }
    this.state = s1;
    return [s1, s2];
  }

  consume(name) {
    const v = this.pressed[name];
    this.pressed[name] = false;
    return !!v;
  }
}
