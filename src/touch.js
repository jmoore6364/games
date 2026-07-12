// On-screen controls, created only on touch devices.
export function initTouch(input) {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;

  const root = document.createElement('div');
  root.id = 'touch-ui';

  const mkBtn = (label, action, cls) => {
    const el = document.createElement('div');
    el.className = 'tbtn ' + cls;
    el.textContent = label;
    const on = (e) => { e.preventDefault(); input.setTouch(action, true); el.classList.add('on'); };
    const off = (e) => { e.preventDefault(); input.setTouch(action, false); el.classList.remove('on'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    root.appendChild(el);
    return el;
  };

  mkBtn('◀', 'left', 'b-left');
  mkBtn('▶', 'right', 'b-right');
  mkBtn('▼', 'down', 'b-down');
  mkBtn('B', 'run', 'b-run');
  mkBtn('A', 'jump', 'b-jump');
  mkBtn('▮▮', 'start', 'b-start');

  document.body.appendChild(root);
}
