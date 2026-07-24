// input.js — keyboard + on-screen touch d-pad. Emits directional hop intents.
export class Input {
  constructor() {
    this.handlers = { up: [], down: [], left: [], right: [], start: [], mute: [] };
    this._bindKeys();
    this._bindTouch();
  }
  on(evt, fn) { if (this.handlers[evt]) this.handlers[evt].push(fn); }
  _emit(evt) { (this.handlers[evt] || []).forEach(fn => fn()); }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      let k = e.key;
      if (k === ' ') k = 'Enter';
      switch (k) {
        case 'ArrowUp': case 'w': case 'W': this._emit('up'); e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': this._emit('down'); e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A': this._emit('left'); e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': this._emit('right'); e.preventDefault(); break;
        case 'Enter': this._emit('start'); e.preventDefault(); break;
        case 'm': case 'M': this._emit('mute'); break;
      }
    }, { passive: false });
  }

  _bindTouch() {
    const bind = (id, evt) => {
      const el = document.getElementById(id);
      if (!el) return;
      const fire = (e) => { e.preventDefault(); this._emit(evt); };
      el.addEventListener('touchstart', fire, { passive: false });
      el.addEventListener('mousedown', fire);
    };
    bind('d-up', 'up'); bind('d-down', 'down');
    bind('d-left', 'left'); bind('d-right', 'right');
    bind('d-start', 'start');
    // reveal touch UI on first touch device interaction
    const showTouch = () => {
      const t = document.getElementById('touch');
      if (t) t.style.display = 'block';
      window.removeEventListener('touchstart', showTouch);
    };
    window.addEventListener('touchstart', showTouch, { passive: true });
  }
}
