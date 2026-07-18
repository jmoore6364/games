// Moormings input — mouse/touch unified via pointer events, plus keyboard.
// Exposes canvas-space cursor position and click/drag/key callbacks;
// game logic decides what they mean.

export class Input {
  constructor(canvas, viewW, viewH) {
    this.canvas = canvas;
    this.viewW = viewW;
    this.viewH = viewH;
    this.mx = viewW / 2;
    this.my = viewH / 2;
    this.down = false;
    this.downX = 0; this.downY = 0;
    this.dragging = false;
    this.keys = new Set();
    // callbacks assigned by main
    this.onClick = null;       // (x, y) tap/click without drag
    this.onDrag = null;        // (dx) horizontal drag delta in canvas px
    this.onKey = null;         // (key, e)
    this.lastX = 0;

    canvas.addEventListener('pointerdown', (e) => {
      const p = this.toCanvas(e);
      this.down = true;
      this.dragging = false;
      this.downX = p.x; this.downY = p.y;
      this.lastX = p.x;
      this.mx = p.x; this.my = p.y;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = this.toCanvas(e);
      this.mx = p.x; this.my = p.y;
      if (this.down) {
        if (!this.dragging && Math.abs(p.x - this.downX) + Math.abs(p.y - this.downY) > 5) this.dragging = true;
        if (this.dragging && this.onDrag) this.onDrag(p.x - this.lastX, this.downY);
        this.lastX = p.x;
      }
    });
    const up = (e) => {
      if (!this.down) return;
      this.down = false;
      const p = this.toCanvas(e);
      if (!this.dragging && this.onClick) this.onClick(p.x, p.y);
      this.dragging = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => { this.down = false; this.dragging = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (this.onKey) this.onKey(e.key, e);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
  }

  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * this.viewW / r.width,
      y: (e.clientY - r.top) * this.viewH / r.height,
    };
  }

  key(k) { return this.keys.has(k); }
}
