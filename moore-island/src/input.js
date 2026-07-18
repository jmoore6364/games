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
  let lastPos = { x: -99, y: -99 };

  // double-click = quick second click NEAR the first one
  const isDouble = (p, win) => {
    const now = performance.now();
    const dbl = now - lastClick < win && Math.hypot(p.x - lastPos.x, p.y - lastPos.y) < 10;
    lastClick = now;
    lastPos = p;
    return dbl;
  };

  canvas.addEventListener('mousemove', (e) => handlers.move(pos(e)));

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const p = pos(e);
    handlers.move(p);
    if (e.button === 2) { handlers.click(p, true); return; }
    handlers.click(p, isDouble(p, 320));
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const p = pos(e);
    handlers.move(p);
    handlers.click(p, isDouble(p, 360));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F5') { e.preventDefault(); handlers.key('f5'); return; }
    handlers.key(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
}
