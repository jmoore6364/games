// input.js — unified keyboard / mouse / touch input.
// Exposes a per-frame movement vector (camera-relative applied by the game),
// accumulated camera-rotation deltas, and edge/held button queries. Touch adds
// dual floating analog sticks with a response curve — left = move/strafe,
// right = turn + look up/down — and virtual action buttons wired from the DOM.

export const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// logical actions
const ACTIONS = ['attack', 'block', 'roll', 'item', 'target', 'action', 'ocarina', 'pause', 'mute', 'cycle', 'start'];

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.key = {};                 // held keys by action
    this._edge = {};               // edge (pressed-this-frame) by action
    this.move = { x: 0, y: 0 };    // stick vector, y+ = forward
    this._kmove = { x: 0, y: 0 };  // keyboard-derived move
    this.camDX = 0; this.camDY = 0;
    this._btnHeld = {};            // virtual buttons held
    this._btnEdge = {};

    this._keymap = {
      'KeyW': 'up', 'KeyS': 'down', 'KeyA': 'left', 'KeyD': 'right',
      'Space': 'attack', 'KeyJ': 'attack',
      'ShiftLeft': 'block', 'ShiftRight': 'block',
      'KeyX': 'roll',
      'KeyQ': 'item', 'KeyL': 'item',
      'KeyZ': 'target', 'Tab': 'cycle',
      'KeyE': 'action', 'Enter': 'action',
      'KeyO': 'ocarina',
      'KeyP': 'pause', 'Escape': 'pause',
      'KeyM': 'mute',
      'ArrowLeft': 'camL', 'ArrowRight': 'camR', 'ArrowUp': 'camU', 'ArrowDown': 'camD',
    };
    this._dir = { up: false, down: false, left: false, right: false };
    this._cam = { camL: false, camR: false, camU: false, camD: false };

    this._bindKeys();
    this._bindMouse();
    if (IS_TOUCH) this._bindTouch();
  }

  _act(name, down) {
    if (down && !this.key[name]) this._edge[name] = true;
    this.key[name] = down;
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      const m = this._keymap[e.code];
      if (!m) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (m in this._dir) { this._dir[m] = true; return; }
      if (m in this._cam) { this._cam[m] = true; return; }
      this._act(m, true);
    });
    window.addEventListener('keyup', (e) => {
      const m = this._keymap[e.code];
      if (!m) return;
      if (m in this._dir) { this._dir[m] = false; return; }
      if (m in this._cam) { this._cam[m] = false; return; }
      this._act(m, false);
    });
  }

  _bindMouse() {
    const c = this.canvas;
    let dragging = false, lx = 0, ly = 0;
    c.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.camDX += (e.clientX - lx) * 0.01;
      this.camDY += (e.clientY - ly) * 0.012;
      lx = e.clientX; ly = e.clientY;
    });
  }

  _bindTouch() {
    const c = this.canvas;
    this._stickId = null; this._stick2Id = null;
    this._stickOrigin = { x: 0, y: 0 };
    this._stickVec = { x: 0, y: 0 };
    this.stickActive = false;
    this._stick2Origin = { x: 0, y: 0 };
    this._stick2Vec = { x: 0, y: 0 };
    this.stick2Active = false;

    const half = () => window.innerWidth / 2;
    const R = 55;
    const clampVec = (dx, dy) => ({ x: Math.max(-1, Math.min(1, dx / R)), y: Math.max(-1, Math.min(1, -dy / R)) });

    c.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < half() && this._stickId === null) {
          this._stickId = t.identifier;
          this._stickOrigin = { x: t.clientX, y: t.clientY };
          this.stickActive = true;
        } else if (t.clientX >= half() && this._stick2Id === null) {
          this._stick2Id = t.identifier;
          this._stick2Origin = { x: t.clientX, y: t.clientY };
          this.stick2Active = true;
        }
      }
      e.preventDefault();
    }, { passive: false });

    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._stickId) {
          this._stickVec = clampVec(t.clientX - this._stickOrigin.x, t.clientY - this._stickOrigin.y);
        } else if (t.identifier === this._stick2Id) {
          this._stick2Vec = clampVec(t.clientX - this._stick2Origin.x, t.clientY - this._stick2Origin.y);
        }
      }
      e.preventDefault();
    }, { passive: false });

    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._stickId) { this._stickId = null; this._stickVec = { x: 0, y: 0 }; this.stickActive = false; }
        if (t.identifier === this._stick2Id) { this._stick2Id = null; this._stick2Vec = { x: 0, y: 0 }; this.stick2Active = false; }
      }
    };
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);
  }

  // DOM virtual buttons call this
  setButton(name, down) {
    if (down && !this._btnHeld[name]) this._btnEdge[name] = true;
    this._btnHeld[name] = down;
  }

  // response curve: deadzone + ease-in exponent, direction preserved
  static curve(x, y) {
    const mag = Math.hypot(x, y);
    if (mag < 0.12) return { x: 0, y: 0 };
    const dz = (mag - 0.12) / 0.88;
    const c = Math.min(1, dz);
    const eased = Math.pow(c, 1.8);
    const inv = eased / mag;
    return { x: x * inv, y: y * inv };
  }

  // called once at the start of each game update
  sample() {
    // keyboard move
    let kx = (this._dir.right ? 1 : 0) - (this._dir.left ? 1 : 0);
    let ky = (this._dir.up ? 1 : 0) - (this._dir.down ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); kx /= l; ky /= l; }

    if (IS_TOUCH && this.stickActive) {
      const c = Input.curve(this._stickVec.x, this._stickVec.y);
      this.move.x = c.x; this.move.y = c.y;
    } else {
      this.move.x = kx; this.move.y = ky;
    }

    // arrow-key camera rotation
    if (this._cam.camL) this.camDX -= 0.045;
    if (this._cam.camR) this.camDX += 0.045;
    if (this._cam.camU) this.camDY -= 0.03;
    if (this._cam.camD) this.camDY += 0.03;

    // right stick: rate-based turn (x) and look up/down (y), stick up = look up
    if (IS_TOUCH && this.stick2Active) {
      const c = Input.curve(this._stick2Vec.x, this._stick2Vec.y);
      this.camDX += c.x * 0.055;
      this.camDY -= c.y * 0.035;
    }
  }

  // consume accumulated camera delta
  camDelta() {
    const d = { dx: this.camDX, dy: this.camDY };
    this.camDX = 0; this.camDY = 0;
    return d;
  }

  pressed(name) {
    return !!this._edge[name] || !!this._btnEdge[name];
  }
  held(name) {
    return !!this.key[name] || !!this._btnHeld[name];
  }

  // clear edge flags — call at END of frame
  endFrame() {
    this._edge = {};
    this._btnEdge = {};
  }

  stickInfo() {
    return { active: this.stickActive, origin: this._stickOrigin, vec: this._stickVec };
  }

  stick2Info() {
    return { active: this.stick2Active, origin: this._stick2Origin, vec: this._stick2Vec };
  }
}
