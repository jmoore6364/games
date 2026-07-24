// Keyboard + on-screen touch controls.
// Exposes `held` flags (for DAS auto-repeat of move/soft-drop, polled by main)
// and an `emit`-style callback for discrete actions (rotate, hard drop, hold...).
export function createInput(onAction) {
  const held = { left: false, right: false, down: false };

  const KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down',
    ArrowUp: 'rotateCW', KeyX: 'rotateCW', KeyZ: 'rotateCCW',
    Space: 'hardDrop', KeyC: 'hold', Enter: 'start',
    KeyM: 'mute', KeyP: 'pause', Escape: 'pause',
  };

  function press(action) {
    if (action === 'left') { held.left = true; onAction('left'); }
    else if (action === 'right') { held.right = true; onAction('right'); }
    else if (action === 'down') { held.down = true; onAction('softDropStart'); }
    else onAction(action);
  }
  function release(action) {
    if (action === 'left') held.left = false;
    else if (action === 'right') held.right = false;
    else if (action === 'down') { held.down = false; onAction('softDropEnd'); }
  }

  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return; // ignore OS key-repeat; we do our own DAS
    press(a);
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    release(a);
  });

  // Touch buttons — elements carry data-action attributes.
  function bindTouch() {
    const btns = document.querySelectorAll('[data-action]');
    btns.forEach((btn) => {
      const action = btn.getAttribute('data-action');
      const down = (e) => {
        e.preventDefault();
        btn.classList.add('on');
        press(action);
      };
      const up = (e) => {
        e.preventDefault();
        btn.classList.remove('on');
        release(action);
      };
      btn.addEventListener('touchstart', down, { passive: false });
      btn.addEventListener('touchend', up, { passive: false });
      btn.addEventListener('touchcancel', up, { passive: false });
      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);
      btn.addEventListener('mouseleave', (e) => { if (btn.classList.contains('on')) up(e); });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTouch);
  } else {
    bindTouch();
  }

  return { held };
}
