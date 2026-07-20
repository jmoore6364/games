// input.js — pointer-lock mouse look, keyboard, wheel hotbar, touch pads.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseDX = 0; this.mouseDY = 0;
    this.locked = false;
    this.wheel = 0;
    this.leftDown = false; this.rightDown = false;
    this.clickL = false; this.clickR = false;   // one-shot
    this.hotbarKey = -1;
    this.onKey = null; // callback(code)
    this.touch = { fwd: 0, side: 0, lookX: 0, lookY: 0, down: false };
    this._lastTouchTapTime = -1e9; // suppress synthetic compat-mouse events after a touch

    window.addEventListener('keydown', e => {
      if (e.repeat) { return; }
      this.keys[e.code] = true;
      if (this.onKey) this.onKey(e.code);
      if (e.code.startsWith('Digit')) this.hotbarKey = parseInt(e.code.slice(5)) - 1;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    canvas.addEventListener('mousedown', e => {
      if (performance.now() - this._lastTouchTapTime < 700) return; // ignore touch-synthesised mouse
      if (e.button === 0) { this.leftDown = true; this.clickL = true; }
      if (e.button === 2) { this.rightDown = true; this.clickR = true; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.leftDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    document.addEventListener('mousemove', e => {
      if (this.locked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  requestLock() {
    if (this.canvas.requestPointerLock) this.canvas.requestPointerLock();
  }

  // consume look delta (mouse or arrow fallback)
  lookDelta() {
    let dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0; this.mouseDY = 0;
    // arrow-key look fallback (works headless / no pointer lock)
    const s = 4;
    if (this.keys['ArrowLeft']) dx -= s;
    if (this.keys['ArrowRight']) dx += s;
    if (this.keys['ArrowUp']) dy -= s;
    if (this.keys['ArrowDown']) dy += s;
    dx += this.touch.lookX; dy += this.touch.lookY;
    this.touch.lookX = 0; this.touch.lookY = 0;
    return [dx, dy];
  }

  moveState() {
    return {
      fwd: !!this.keys['KeyW'] || this.touch.fwd > 0.3,
      back: !!this.keys['KeyS'] || this.touch.fwd < -0.3,
      left: !!this.keys['KeyA'] || this.touch.side < -0.3,
      right: !!this.keys['KeyD'] || this.touch.side > 0.3,
      jump: !!this.keys['Space'],
      sneak: !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'] || !!this.touch.down,
    };
  }

  consumeWheel() { const w = this.wheel; this.wheel = 0; return w; }
  consumeHotbar() { const h = this.hotbarKey; this.hotbarKey = -1; return h; }
  consumeClickL() { const c = this.clickL; this.clickL = false; return c; }
  consumeClickR() { const c = this.clickR; this.clickR = false; return c; }
}

// ---------------- touch controls ----------------
export function hasTouch() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
    (typeof location !== 'undefined' && location.search.includes('touch=1'));
}

// `game` is optional; when present the on-screen UI buttons and taps drive game state.
export function initTouch(input, game) {
  const ui = document.getElementById('touch-ui');
  if (!ui) return;
  if (!hasTouch()) { ui.style.display = 'none'; return; }
  ui.style.display = 'block';
  input.touchActive = true;
  const canvas = input.canvas;
  // Look sensitivity for touch drags. A finger can only travel a short
  // distance per swipe (unlike pointer-lock mouse movement, which is
  // unbounded), so touch needs a higher per-pixel factor than the mouse.
  const TOUCH_LOOK = 2.0;
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'tap menu to start · left stick move · right drag look · MINE / PUT / JMP · tap hotbar & recipes';

  const move = document.getElementById('move-stick');
  const knob = document.getElementById('move-knob');
  let moveId = null, mcx = 0, mcy = 0;
  const lookZone = document.getElementById('look-zone');
  let lookId = null, lastLX = 0, lastLY = 0;

  move.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; moveId = t.identifier;
    const r = move.getBoundingClientRect(); mcx = r.left + r.width / 2; mcy = r.top + r.height / 2;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        const dx = t.clientX - mcx, dy = t.clientY - mcy;
        const mag = Math.min(1, Math.hypot(dx, dy) / 48);
        const a = Math.atan2(dy, dx);
        input.touch.side = Math.cos(a) * mag;
        input.touch.fwd = -Math.sin(a) * mag;
        knob.style.transform = `translate(${Math.cos(a) * mag * 32 - 26}px,${Math.sin(a) * mag * 32 - 26}px)`;
      } else if (t.identifier === lookId) {
        input.touch.lookX += (t.clientX - lastLX) * TOUCH_LOOK;
        input.touch.lookY += (t.clientY - lastLY) * TOUCH_LOOK;
        lastLX = t.clientX; lastLY = t.clientY;
      }
    }
  }, { passive: false });
  lookZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; lookId = t.identifier; lastLX = t.clientX; lastLY = t.clientY;
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { moveId = null; input.touch.fwd = 0; input.touch.side = 0; knob.style.transform = 'translate(-26px,-26px)'; }
      if (t.identifier === lookId) lookId = null;
    }
  });

  // ---- action buttons ----
  const bind = (id, key) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('touchstart', e => { input.keys[key] = true; e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', e => { input.keys[key] = false; e.preventDefault(); }, { passive: false });
  };
  bind('b-jump', 'Space');          // ascend while flying / jump
  const held = (id, on, off) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('touchstart', e => { on(); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', e => { if (off) off(); e.preventDefault(); }, { passive: false });
  };
  held('b-break', () => { input.leftDown = true; input.clickL = true; }, () => { input.leftDown = false; });
  held('b-place', () => { input.rightDown = true; input.clickR = true; }, () => { input.rightDown = false; });
  held('b-down', () => { input.touch.down = true; }, () => { input.touch.down = false; });

  const tap = (id, fn) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('touchstart', e => { fn(); e.preventDefault(); }, { passive: false });
  };
  tap('b-fly', () => { if (game && game.player) game.player.toggleFly(); });
  tap('b-tether', () => { if (game && game.state === 'playing') game.fireTether(); });
  tap('b-craft', () => {
    if (!game) return;
    if (game.state === 'playing') game.openCraft(false);
    else if (game.state === 'inventory') game.state = 'playing';
  });
  tap('b-bag', () => {
    if (!game) return;
    if (game.state === 'invview') game.state = 'playing';
    else if (game.state === 'playing') game.state = 'invview';
  });
  tap('b-map', () => { if (game) game.minimapOn = !game.minimapOn; });

  // ---- tap router: route quick taps on the canvas to menu / hotbar / recipe hit-tests ----
  const pending = new Map(); // touchId -> {x,y,t}
  window.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) pending.set(t.identifier, { x: t.clientX, y: t.clientY, t: performance.now() });
  }, { passive: true });
  window.addEventListener('touchend', e => {
    input._lastTouchTapTime = performance.now(); // neutralise the compat-mouse burst that follows
    for (const t of e.changedTouches) {
      const p = pending.get(t.identifier); pending.delete(t.identifier);
      if (!p || !game || !game.uiTap) continue;
      const moved = Math.hypot(t.clientX - p.x, t.clientY - p.y);
      if (moved > 14 || performance.now() - p.t > 400) continue; // a drag, not a tap
      const r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const cx = (t.clientX - r.left) * (canvas.width / r.width);
      const cy = (t.clientY - r.top) * (canvas.height / r.height);
      game.uiTap(cx, cy);
    }
  }, { passive: true });
}
