// input.js — keyboard + on-screen touch controls with an analog response curve.
import { curveVec } from './util.js';

export class Input {
  constructor() {
    this.keys = new Set();
    this.stick = { x: 0, y: 0, active: false };   // raw -1..1
    this.held = { a: false, b: false, c: false };
    this.pressed = new Set();  // one-shot edges: a,b,c,start,restart,mute,choice1..3,pause
    this.dom = null;
    this._bind();
  }
  _bind() {
    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
      if (e.repeat) return;
      const low = k.toLowerCase();
      this.keys.add(low);
      this._edge(low);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', () => { this.keys.clear(); this.held.a = this.held.b = this.held.c = false; });
  }
  _edge(low) {
    if (low === ' ' || low === 'spacebar') this.pressed.add('a');
    if (low === 'j') this.pressed.add('a');
    if (low === 'k' || low === 'f') this.pressed.add('b');
    if (low === 'l' || low === 'shift') this.pressed.add('c');
    if (low === 'enter') { this.pressed.add('start'); this.pressed.add('a'); }
    if (low === 'r') this.pressed.add('restart');
    if (low === ';' || low === 'm') this.pressed.add('mute');
    if (low === 'p') this.pressed.add('pause');
    if (low === '1') this.pressed.add('choice1');
    if (low === '2') this.pressed.add('choice2');
    if (low === '3') this.pressed.add('choice3');
  }
  // Movement vector with response curve. Keyboard = full deflection.
  moveVec() {
    if (this.stick.active) return curveVec(this.stick.x, this.stick.y);
    let x = 0, y = 0;
    if (this.down('arrowleft', 'a')) x -= 1;
    if (this.down('arrowright', 'd')) x += 1;
    if (this.down('arrowup', 'w')) y -= 1;
    if (this.down('arrowdown', 's')) y += 1;
    const m = Math.hypot(x, y);
    if (m > 0) { x /= m; y /= m; }
    return { x, y, m: m > 0 ? 1 : 0 };
  }
  bindTouch(dom, audio) {
    this.dom = dom;
    const stickEl = dom.stick, nub = dom.nub;
    if (!stickEl) return;
    const setNub = (dx, dy) => { nub.style.transform = `translate(${dx}px, ${dy}px)`; };
    let sid = null;
    const rect = () => stickEl.getBoundingClientRect();
    const move = (cx, cy) => {
      const r = rect();
      const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
      let dx = cx - ox, dy = cy - oy;
      const max = r.width * 0.42;
      const d = Math.hypot(dx, dy);
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      this.stick.x = dx / max; this.stick.y = dy / max; this.stick.active = true;
      setNub(dx, dy);
    };
    const end = () => { this.stick.x = 0; this.stick.y = 0; this.stick.active = false; sid = null; setNub(0, 0); };
    stickEl.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; sid = t.identifier; move(t.clientX, t.clientY); if (audio) audio.resume(); }, { passive: false });
    stickEl.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === sid) move(t.clientX, t.clientY); }, { passive: false });
    stickEl.addEventListener('touchend', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === sid) end(); }, { passive: false });
    stickEl.addEventListener('touchcancel', (e) => { e.preventDefault(); end(); }, { passive: false });
    stickEl.addEventListener('mousedown', (e) => { e.preventDefault(); sid = 'mouse'; move(e.clientX, e.clientY); const mm = (ev) => move(ev.clientX, ev.clientY); const mu = () => { end(); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); }; window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu); });

    const holdBtn = (el, name) => {
      if (!el) return;
      const on = (e) => { e.preventDefault(); this.held[name] = true; this.pressed.add(name); el.classList.add('act'); if (audio) audio.resume(); };
      const off = (e) => { if (e) e.preventDefault(); this.held[name] = false; el.classList.remove('act'); };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
    };
    const tapBtn = (el, name) => {
      if (!el) return;
      const on = (e) => { e.preventDefault(); this.pressed.add(name); if (audio) audio.resume(); };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('mousedown', on);
    };
    holdBtn(dom.a, 'a');
    holdBtn(dom.b, 'b');
    holdBtn(dom.c, 'c');
    tapBtn(dom.c1, 'choice1');
    tapBtn(dom.c2, 'choice2');
    tapBtn(dom.c3, 'choice3');
  }
  setButtons(labels) {
    const d = this.dom; if (!d) return;
    const set = (el, txt) => { if (!el) return; if (txt) { el.style.display = 'flex'; el.innerHTML = txt; } else { el.style.display = 'none'; } };
    set(d.a, labels.a); set(d.b, labels.b); set(d.c, labels.c);
  }
  showChoices(list) {
    const d = this.dom; if (!d) return;
    const els = [d.c1, d.c2, d.c3];
    for (let i = 0; i < 3; i++) {
      if (!els[i]) continue;
      if (list && list[i]) { els[i].style.display = 'flex'; els[i].innerHTML = (i + 1) + '. ' + list[i]; }
      else els[i].style.display = 'none';
    }
    if (d.choices) d.choices.style.display = (list && list.length) ? 'flex' : 'none';
  }
  consume(name) { if (this.pressed.has(name)) { this.pressed.delete(name); return true; } return false; }
  clearEdges() { this.pressed.clear(); }
  down(...ks) { for (const k of ks) if (this.keys.has(k)) return true; return false; }
}
