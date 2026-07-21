// input.js — mouse + keyboard + touch. Maps events to internal canvas coords.
export function createInput(canvas, handlers) {
  const state = { mx: 0, my: 0, leftDown: false, rightDown: false, overCanvas: false };

  function toCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * (canvas.width / r.width);
    const y = (clientY - r.top) * (canvas.height / r.height);
    return { x, y };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e.clientX, e.clientY); state.mx = p.x; state.my = p.y; state.overCanvas = true;
    handlers.move && handlers.move(p.x, p.y);
  });
  canvas.addEventListener('mouseleave', () => { state.overCanvas = false; state.leftDown = false; });
  canvas.addEventListener('mousedown', (e) => {
    const p = toCanvas(e.clientX, e.clientY); state.mx = p.x; state.my = p.y;
    if (e.button === 0) { state.leftDown = true; handlers.leftDown && handlers.leftDown(p.x, p.y); }
    else if (e.button === 2) { state.rightDown = true; handlers.rightDown && handlers.rightDown(p.x, p.y); }
    e.preventDefault();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) { state.leftDown = false; handlers.leftUp && handlers.leftUp(); }
    else if (e.button === 2) { state.rightDown = false; handlers.rightUp && handlers.rightUp(); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { handlers.wheel && handlers.wheel(Math.sign(e.deltaY)); e.preventDefault(); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) { handlers.keyRepeat && handlers.keyRepeat(e.key); return; }
    handlers.key && handlers.key(e.key, e);
  });
  window.addEventListener('keyup', (e) => { handlers.keyUp && handlers.keyUp(e.key); });

  // touch: tap = left action; two-finger tap = right; buttons handled in DOM overlay
  let touchTimer = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; const p = toCanvas(t.clientX, t.clientY);
    state.mx = p.x; state.my = p.y;
    if (e.touches.length >= 2) { handlers.rightDown && handlers.rightDown(p.x, p.y); }
    else { state.leftDown = true; handlers.leftDown && handlers.leftDown(p.x, p.y); }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    const t = e.changedTouches[0]; const p = toCanvas(t.clientX, t.clientY);
    state.mx = p.x; state.my = p.y; handlers.move && handlers.move(p.x, p.y);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => { state.leftDown = false; handlers.leftUp && handlers.leftUp(); e.preventDefault(); }, { passive: false });

  return state;
}
