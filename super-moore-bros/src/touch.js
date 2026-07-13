// On-screen controls for touch devices (force with ?touch=1 for testing).
// Pointer events so they also work with mouse/pen, and capture so a finger
// sliding off a button doesn't leave it stuck down.
export function initTouch(input) {
  const force = location.search.includes('touch=1');
  const touchy = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!touchy && !force) return;

  const hint = document.getElementById('hint');
  if (hint) hint.remove();

  const root = document.createElement('div');
  root.id = 'touch-ui';

  const mkBtn = (label, action, cls) => {
    const el = document.createElement('div');
    el.className = 'tbtn ' + cls;
    el.textContent = label;
    const on = (e) => {
      e.preventDefault();
      if (el.setPointerCapture && e.pointerId !== undefined) el.setPointerCapture(e.pointerId);
      input.setTouch(action, true);
      el.classList.add('on');
    };
    const off = (e) => {
      e.preventDefault();
      input.setTouch(action, false);
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    root.appendChild(el);
    return el;
  };

  mkBtn('◀', 'left', 'b-left');
  mkBtn('▶', 'right', 'b-right');
  mkBtn('▼', 'down', 'b-down');
  mkBtn('B', 'run', 'b-run');
  mkBtn('A', 'jump', 'b-jump');
  mkBtn('▶▶', 'start', 'b-start');

  document.body.appendChild(root);
}
