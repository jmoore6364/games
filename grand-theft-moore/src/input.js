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
    const ui = document.getElementById('touch-ui');
    if (!stick || !ui) return;

    // reveal the on-screen controls (idempotent)
    const reveal = () => {
      if (this._uiShown) return;
      this._uiShown = true; this._isTouch = true;
      ui.style.display = 'block';
      const hint = document.getElementById('hint'); if (hint) hint.style.display = 'none';
    };
    // feature detection: show immediately on a touch device or ?touch=1
    const touchCapable = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (typeof location !== 'undefined' && location.search.includes('touch=1'));
    if (touchCapable) reveal();

    // cache mode-swapped button groups
    this._footBtns = Array.from(document.querySelectorAll('.foot-btn'));
    this._driveBtns = Array.from(document.querySelectorAll('.drive-btn'));
    this._mode = null; // force first apply

    // --- move stick (steers when driving, walks on foot) ---
    let sid = null, sox = 0, soy = 0;
    const start = (e) => {
      reveal();
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
    stick.addEventListener('touchstart', start); stick.addEventListener('touchmove', move); stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);

    // --- look drag (camera yaw, both on foot and driving) ---
    let lid = null, lx = 0;
    look.addEventListener('touchstart', (e) => { reveal(); this._pending.enter = true; const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; e.preventDefault(); });
    look.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) { this.touchLook += (t.clientX - lx) * 0.15; lx = t.clientX; } e.preventDefault(); });
    look.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; });

    // --- tap anywhere on the canvas advances title / busted / wasted screens ---
    // (enter is only consumed by main.js while in a menu state, so this is inert during play)
    canvas.addEventListener('touchstart', (e) => { reveal(); this._pending.enter = true; }, { passive: true });

    // --- action buttons ---
    // `held` buttons keep this.touch[name] true while pressed (GAS/BRAKE/HANDBRAKE);
    // all buttons also fire an edge via _pending[name] on press (JUMP/F/HIT).
    const bind = (id, name) => {
      const el = document.getElementById(id); if (!el) return;
      el.addEventListener('touchstart', (e) => { this._pending[name] = true; this.touch[name] = true; e.preventDefault(); });
      el.addEventListener('touchend', (e) => { this.touch[name] = false; e.preventDefault(); });
      el.addEventListener('touchcancel', (e) => { this.touch[name] = false; });
    };
    bind('b-enter', 'enterExit');   // F — enter/exit (both modes)
    bind('b-jump', 'jump');         // on foot
    bind('b-action', 'action');     // on foot — HIT
    bind('b-gas', 'gas');           // driving — throttle
    bind('b-brake', 'brake');       // driving — brake / reverse
    bind('b-hand', 'hand');         // driving — handbrake
  }

  // toggle which button cluster is visible based on whether the player is driving
  _applyMode(inVehicle) {
    const mode = inVehicle ? 'drive' : 'foot';
    if (mode === this._mode || !this._footBtns) return;
    this._mode = mode;
    for (const b of this._footBtns) b.style.display = inVehicle ? 'none' : 'flex';
    for (const b of this._driveBtns) b.style.display = inVehicle ? 'flex' : 'none';
    // dropping a hidden button never fires touchend, so clear its held state
    if (inVehicle) { this.touch.jump = false; this.touch.action = false; }
    else { this.touch.gas = false; this.touch.brake = false; this.touch.hand = false; }
  }

  // consume edge event
  take(name) { const v = !!this._pending[name]; this._pending[name] = false; return v; }

  // build the per-frame control object for game.step
  frame(dt, inVehicle) {
    // show the right button cluster for on-foot vs driving
    this._applyMode(inVehicle);
    const k = this.keys, tm = this.touchMove, t = this.touch;
    // On foot: stick x/y walks. Driving: stick x steers, GAS/BRAKE buttons drive
    // (stick y still works as a fallback throttle so the stick alone can drive).
    const forward = k['w'] || k['arrowup'] || tm.y < -0.3 || !!t.gas;
    const back = k['s'] || k['arrowdown'] || tm.y > 0.3 || !!t.brake;
    const left = k['a'] || k['arrowleft'] || tm.x < -0.3;
    const right = k['d'] || k['arrowright'] || tm.x > 0.3;
    const run = k['shift'];
    // camera turn from Q/E, mouse, or touch-look (works on foot and driving)
    let camTurn = 0;
    if (k['q']) camTurn -= 1; if (k['e']) camTurn += 1;
    camTurn += this.mouseDX * 0.06;
    camTurn += this.touchLook * 0.06;
    let camPitch = 0;
    if (k['r']) camPitch += 1; if (k['t']) camPitch -= 1;
    camPitch += -this.mouseDY * 0.05;
    this.mouseDX = 0; this.mouseDY = 0; this.touchLook = 0;
    // jump on foot (edge from key/JUMP button); handbrake while driving (held HAND button)
    const jump = this.take('jump') || !!t.hand;
    return {
      dt, forward, back, left, right, run,
      jump,
      camTurn, camPitch,
      enterExit: this.take('enterExit'),
      action: this.take('action'),
    };
  }
}
