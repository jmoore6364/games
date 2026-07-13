// On-screen controls for touch devices; buttons map onto the input module.
import { input } from './input.js';

// In a mobile browser tab, go fullscreen + landscape on the first START tap.
// Skipped when already installed to the home screen (standalone/fullscreen).
let fsTried = false;
function tryFullscreen() {
  if (fsTried) return;
  fsTried = true;
  const standalone = navigator.standalone ||
    matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  if (standalone || !document.documentElement.requestFullscreen) return;
  try {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  } catch { /* not supported (e.g. iPhone Safari) */ }
}

for (const btn of document.querySelectorAll('#touch .tbtn')) {
  const k = btn.dataset.k;
  const down = e => {
    e.preventDefault();
    btn.classList.add('on');
    if (k === 'start') tryFullscreen();
    input.setTouch(k, true);
  };
  const up = e => { e.preventDefault(); btn.classList.remove('on'); input.setTouch(k, false); };
  btn.addEventListener('touchstart', down, { passive: false });
  btn.addEventListener('touchend', up, { passive: false });
  btn.addEventListener('touchcancel', up, { passive: false });
  btn.addEventListener('mousedown', down);
  btn.addEventListener('mouseup', up);
  btn.addEventListener('mouseleave', up);
}
