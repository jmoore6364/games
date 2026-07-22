// input.js — keyboard, mouse-look, and touch controls. BROWSER-ONLY.
// Exposes a flat state object the game reads each frame, plus edge-triggered
// action flags that are consumed once.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseDX = 0; this.mouseDY = 0;
    this.locked = false;
    // edge events (set true for one frame)
    this._pending = {};
    // touch axes
    this.touchMove = { x: 0, y: 0 };
    this.touchLook = 0;
    this.touch = {};

    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (['w', 'a', 's', 'd', ' ', 'q', 'e', 'f', 'v', 'm', 'r', 'enter'].includes(k)) e.preventDefault();
      if (k === 'f') this._pending.enterExit = true;
      if (k === ' ') this._pending.jump = true;
      if (k === 'v') this._pending.toggleView = true;
      if (k === 'm') this._pending.mute = true;
      if (k === 'r') this._pending.radio = true;
      if (k === 'enter') this._pending.enter = true;
      if (k === 'j' || k === 'control') this._pending.action = true;
    });
    addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });

    canvas.addEventListener('click', () => {
      if (!this.locked && !this._isTouch) canvas.requestPointerLock && canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    addEventListener('mousedown', (e) => { if (e.button === 0) this._pending.action = true; });

    this._setupTouch(canvas);
  }

  _setupTouch(canvas) {
    const stick = document.getElementById('move-stick');
    const knob = document.getElementById('move-knob');
    const look = document.getElementById('look-zone');
    if (!stick) return;
    let sid = null, sox = 0, soy = 0;
    const start = (e) => {
      this._isTouch = true;
      document.getElementById('touch-ui').style.display = 'block';
      const t = e.changedTouches[0]; sid = t.identifier;
      const r = stick.getBoundingClientRect(); sox = r.left + r.width / 2; soy = r.top + r.height / 2;
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === sid) {
          let dx = t.clientX - sox, dy = t.clientY - soy;
          const mag = Math.hypot(dx, dy) || 1; const cl = Math.min(mag, 52);
          dx = dx / mag * cl; dy = dy / mag * cl;
          knob.style.transform = `translate(${dx - 26}px,${dy - 26}px)`;
          this.touchMove.x = dx / 52; this.touchMove.y = dy / 52;
        }
      }
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; this.touchMove.x = 0; this.touchMove.y = 0; knob.style.transform = 'translate(-26px,-26px)'; }
    };
    stick.addEventListener('touchstart', start); stick.addEventListener('touchmove', move); stick.addEventListener('touchend', end);

    let lid = null, lx = 0;
    look.addEventListener('touchstart', (e) => { this._isTouch = true; const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; e.preventDefault(); });
    look.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) { this.touchLook += (t.clientX - lx) * 0.15; lx = t.clientX; } e.preventDefault(); });
    look.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; });

    const bind = (id, name) => {
      const el = document.getElementById(id); if (!el) return;
      el.addEventListener('touchstart', (e) => { this._pending[name] = true; this.touch[name] = true; e.preventDefault(); });
      el.addEventListener('touchend', (e) => { this.touch[name] = false; e.preventDefault(); });
    };
    bind('b-enter', 'enterExit'); bind('b-action', 'action'); bind('b-hand', 'hand');
  }

  // consume edge event
  take(name) { const v = !!this._pending[name]; this._pending[name] = false; return v; }

  // build the per-frame control object for game.step
  frame(dt, inVehicle) {
    const k = this.keys, tm = this.touchMove;
    const forward = k['w'] || k['arrowup'] || tm.y < -0.3;
    const back = k['s'] || k['arrowdown'] || tm.y > 0.3;
    const left = k['a'] || k['arrowleft'] || tm.x < -0.3;
    const right = k['d'] || k['arrowright'] || tm.x > 0.3;
    const run = k['shift'];
    // camera turn from Q/E, mouse, or touch-look
    let camTurn = 0;
    if (k['q']) camTurn -= 1; if (k['e']) camTurn += 1;
    camTurn += this.mouseDX * 0.06;
    camTurn += this.touchLook * 0.06;
    let camPitch = 0;
    if (k['r']) camPitch += 1; if (k['t']) camPitch -= 1;
    camPitch += -this.mouseDY * 0.05;
    this.mouseDX = 0; this.mouseDY = 0; this.touchLook = 0;
    return {
      dt, forward, back, left, right, run,
      jump: this.take('jump') || this.touch.hand,
      camTurn, camPitch,
      enterExit: this.take('enterExit'),
      action: this.take('action'),
    };
  }
}
