// On-screen controls for touch devices; buttons map onto the input module.
import { input } from './input.js';

for (const btn of document.querySelectorAll('#touch .tbtn')) {
  const k = btn.dataset.k;
  const down = e => { e.preventDefault(); btn.classList.add('on'); input.setTouch(k, true); };
  const up = e => { e.preventDefault(); btn.classList.remove('on'); input.setTouch(k, false); };
  btn.addEventListener('touchstart', down, { passive: false });
  btn.addEventListener('touchend', up, { passive: false });
  btn.addEventListener('touchcancel', up, { passive: false });
  btn.addEventListener('mousedown', down);
  btn.addEventListener('mouseup', up);
  btn.addEventListener('mouseleave', up);
}
