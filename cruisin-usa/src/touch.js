// On-screen touch controls, shown only on touch devices.

export function setupTouch(input) {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;

  const wrap = document.createElement('div');
  wrap.id = 'touch-controls';
  wrap.innerHTML = `
    <div class="tc-group tc-left">
      <button class="tc-btn" data-act="left">&#9664;</button>
      <button class="tc-btn" data-act="right">&#9654;</button>
    </div>
    <div class="tc-group tc-right">
      <button class="tc-btn tc-brake" data-act="brake">BRAKE</button>
      <button class="tc-btn tc-gas" data-act="accel">GAS</button>
    </div>`;
  document.body.appendChild(wrap);

  const set = (act, on) => {
    input.touch[act] = on;
    if (on && (act === 'left' || act === 'right')) input.pressed[act] = true;
    if (on) input.pressed.start = true; // any tap advances menus
  };

  for (const btn of wrap.querySelectorAll('.tc-btn')) {
    const act = btn.dataset.act;
    const on = (e) => { e.preventDefault(); set(act, true); btn.classList.add('on'); };
    const off = (e) => { e.preventDefault(); input.touch[act] = false; btn.classList.remove('on'); };
    btn.addEventListener('touchstart', on, { passive: false });
    btn.addEventListener('touchend', off, { passive: false });
    btn.addEventListener('touchcancel', off, { passive: false });
  }
}
