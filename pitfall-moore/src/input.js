// input.js — held-key movement state + tap events, keyboard / touch / gamepad.
export class Input {
  constructor() {
    this.held = { up: false, down: false, left: false, right: false, action: false };
    this.handlers = { start: [], mute: [], action: [] };
    this._padPrev = { action: false, start: false };
    this._bindKeys();
    this._bindTouch();
  }
  on(evt, fn) { if (this.handlers[evt]) this.handlers[evt].push(fn); }
  _emit(evt) { (this.handlers[evt] || []).forEach(fn => fn()); }

  _bindKeys() {
    const map = (k) => {
      switch (k) {
        case 'ArrowUp': case 'w': case 'W': return 'up';
        case 'ArrowDown': case 's': case 'S': return 'down';
        case 'ArrowLeft': case 'a': case 'A': return 'left';
        case 'ArrowRight': case 'd': case 'D': return 'right';
        case ' ': return 'action';
        default: return null;
      }
    };
    window.addEventListener('keydown', (e) => {
      const dir = map(e.key);
      if (dir) {
        if (dir === 'action' && !this.held.action) this._emit('action');
        this.held[dir] = true;
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') { this._emit('start'); e.preventDefault(); }
      else if (e.key === 'm' || e.key === 'M') this._emit('mute');
    }, { passive: false });
    window.addEventListener('keyup', (e) => {
      const dir = map(e.key);
      if (dir) { this.held[dir] = false; e.preventDefault(); }
    }, { passive: false });
    window.addEventListener('blur', () => {
      for (const k of Object.keys(this.held)) this.held[k] = false;
    });
  }

  _bindTouch() {
    const hold = (id, dir) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => {
        e.preventDefault();
        if (dir === 'action' && !this.held.action) this._emit('action');
        this.held[dir] = true;
      };
      const off = (e) => { e.preventDefault(); this.held[dir] = false; };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', (e) => { this.held[dir] = false; });
    };
    hold('d-up', 'up'); hold('d-down', 'down');
    hold('d-left', 'left'); hold('d-right', 'right');
    hold('d-act', 'action');
    const st = document.getElementById('d-start');
    if (st) {
      const fire = (e) => { e.preventDefault(); this._emit('start'); };
      st.addEventListener('touchstart', fire, { passive: false });
      st.addEventListener('mousedown', fire);
    }
    const showTouch = () => {
      const t = document.getElementById('touch');
      if (t) t.style.display = 'block';
      window.removeEventListener('touchstart', showTouch);
    };
    window.addEventListener('touchstart', showTouch, { passive: true });
  }

  // poll gamepad each frame; merges into held state and fires tap events on edges
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && (pads[0] || pads[1] || pads[2] || pads[3]);
    if (!gp) return;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    this.gpHeld = {
      up: ay < -0.45 || b(12), down: ay > 0.45 || b(13),
      left: ax < -0.45 || b(14), right: ax > 0.45 || b(15),
      action: b(0) || b(1),
    };
    if (this.gpHeld.action && !this._padPrev.action) this._emit('action');
    const start = b(9) || b(8);
    if (start && !this._padPrev.start) this._emit('start');
    this._padPrev.action = this.gpHeld.action;
    this._padPrev.start = start;
  }

  dir() {
    const g = this.gpHeld || {};
    return {
      up: this.held.up || !!g.up, down: this.held.down || !!g.down,
      left: this.held.left || !!g.left, right: this.held.right || !!g.right,
      action: this.held.action || !!g.action,
    };
  }
}
