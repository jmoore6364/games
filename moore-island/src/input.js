// Mouse / touch / keyboard input, mapped into 320x200 logical coordinates.

export function initInput(canvas, handlers) {
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    const cy = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
    return {
      x: (cx - r.left) * (canvas.width / r.width),
      y: (cy - r.top) * (canvas.height / r.height),
    };
  };

  let lastClick = 0;

  canvas.addEventListener('mousemove', (e) => handlers.move(pos(e)));

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const p = pos(e);
    handlers.move(p);
    if (e.button === 2) { handlers.click(p, true); return; }
    const now = performance.now();
    const dbl = now - lastClick < 320;
    lastClick = now;
    handlers.click(p, dbl);
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const p = pos(e);
    handlers.move(p);
    const now = performance.now();
    const dbl = now - lastClick < 340;
    lastClick = now;
    handlers.click(p, dbl);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F5') { e.preventDefault(); handlers.key('f5'); return; }
    handlers.key(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
}
