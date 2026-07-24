// input.js — keyboard, mouse (pointer-lock look), and on-screen touch controls.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = Object.create(null);
    this.mouseDX = 0;          // accumulated mouse look delta (consumed each frame)
    this.locked = false;
    // touch state (consumed by main loop)
    this.move = { x: 0, y: 0 };   // -1..1 strafe/forward
    this.lookDX = 0;              // touch look delta (consumed each frame)
    this.firePressed = false;     // held
    this.fireEdge = false;        // one-shot on press
    this.usePressed = false;
    this.useEdge = false;
    // event callbacks set by main
    this.onFire = null;
    this.onUse = null;
    this.onRestart = null;
    this.onMute = null;

    this._initKeyboard();
    this._initMouse();
    this._initTouch();
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
      if (!this.keys[k]) {
        // edge events
        if (k === ' ') { if (this.onFire) this.onFire(); }
        if (k === 'e') { if (this.onUse) this.onUse(); }
        if (k === 'r') { if (this.onRestart) this.onRestart(); }
        if (k === 'm') { if (this.onMute) this.onMute(); }
      }
      this.keys[k] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { this.keys = Object.create(null); });
  }

  _initMouse() {
    this.canvas.addEventListener('click', () => {
      if (!this.locked && this.canvas.requestPointerLock) this.canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.locked) this.mouseDX += e.movementX;
    });
    // desktop LMB fire while locked
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.locked) { if (this.onFire) this.onFire(); this.firePressed = true; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.firePressed = false; });
  }

  _initTouch() {
    const touchUI = document.getElementById('touch');
    if (touchUI && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      touchUI.style.display = 'block';
    }
    const stick = document.getElementById('move-stick');
    const knob = document.getElementById('move-knob');
    const look = document.getElementById('look-zone');
    const fire = document.getElementById('fire-btn');
    const use = document.getElementById('use-btn');

    // move stick
    if (stick) {
      let sid = null, ox = 0, oy = 0;
      const R = 46;
      const start = (t) => { sid = t.identifier; const r = stick.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; };
      const moveTo = (t) => {
        let dx = t.clientX - ox, dy = t.clientY - oy;
        const d = Math.hypot(dx, dy) || 1; if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        knob.style.transform = `translate(${dx - 27}px,${dy - 27}px)`;
        this.move.x = dx / R; this.move.y = dy / R;
      };
      const end = () => { sid = null; knob.style.transform = 'translate(-27px,-27px)'; this.move.x = 0; this.move.y = 0; };
      stick.addEventListener('touchstart', (e) => { e.preventDefault(); start(e.changedTouches[0]); moveTo(e.changedTouches[0]); }, { passive: false });
      stick.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === sid) moveTo(t); }, { passive: false });
      stick.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === sid) end(); }, { passive: false });
      stick.addEventListener('touchcancel', end, { passive: false });
    }

    // look zone (drag to turn)
    if (look) {
      let lid = null, lx = 0;
      look.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; }, { passive: false });
      look.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === lid) { this.lookDX += (t.clientX - lx); lx = t.clientX; } }, { passive: false });
      const lend = (e) => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; };
      look.addEventListener('touchend', lend, { passive: false });
      look.addEventListener('touchcancel', lend, { passive: false });
    }

    if (fire) {
      fire.addEventListener('touchstart', (e) => { e.preventDefault(); this.firePressed = true; if (this.onFire) this.onFire(); }, { passive: false });
      fire.addEventListener('touchend', (e) => { e.preventDefault(); this.firePressed = false; }, { passive: false });
    }
    if (use) {
      use.addEventListener('touchstart', (e) => { e.preventDefault(); if (this.onUse) this.onUse(); }, { passive: false });
    }
  }

  // consume look delta accumulated since last frame
  consumeLook() {
    const d = this.mouseDX + this.lookDX;
    this.mouseDX = 0; this.lookDX = 0;
    return d;
  }
}
