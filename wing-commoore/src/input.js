// input.js — keyboard + on-screen touch controls.
export class Input {
  constructor() {
    this.keys = new Set();
    // analog steering from touch stick: -1..1
    this.stick = { x: 0, y: 0, active: false };
    // held buttons
    this.held = { fire: false, ab: false, aim: false };
    // one-shot edge events consumed by the game
    this.pressed = new Set(); // 'fire','missile','target','start','restart','mute','throttleUp','throttleDown'
    this._bind();
  }
  _bind() {
    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
      if (e.repeat) { return; }
      this.keys.add(k.toLowerCase());
      this._keyEdge(k, e);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', () => { this.keys.clear(); });
  }
  _keyEdge(k, e) {
    const low = k.toLowerCase();
    if (low === ' ' || low === 'spacebar') this.pressed.add('fire');
    if (low === 'm' || low === 'control') this.pressed.add('missile');
    if (low === 't') this.pressed.add('target');
    if (low === 'enter') this.pressed.add('start');
    if (low === 'r') this.pressed.add('restart');
    if (low === ';') this.pressed.add('mute');
    if (low === 'z' || low === '-') this.pressed.add('throttleDown');
    if (low === 'x' || low === '=' || low === '+') this.pressed.add('throttleUp');
    if (low === 'p') this.pressed.add('pause');
  }
  bindTouch(dom, audio) {
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
    // mouse fallback on stick
    stickEl.addEventListener('mousedown', (e) => { e.preventDefault(); sid = 'mouse'; move(e.clientX, e.clientY); const mm = (ev) => move(ev.clientX, ev.clientY); const mu = () => { end(); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); }; window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu); });

    const holdBtn = (el, name) => {
      if (!el) return;
      const on = (e) => { e.preventDefault(); this.held[name] = true; el.classList.add('act'); if (audio) audio.resume(); };
      const off = (e) => { e.preventDefault(); this.held[name] = false; el.classList.remove('act'); };
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
    // repeat an edge event while the button is held (for throttle ramp)
    const repeatBtn = (el, name) => {
      if (!el) return;
      let iv = null;
      const on = (e) => { e.preventDefault(); this.pressed.add(name); el.classList.add('act'); if (audio) audio.resume(); clearInterval(iv); iv = setInterval(() => this.pressed.add(name), 130); };
      const off = (e) => { if (e) e.preventDefault(); el.classList.remove('act'); clearInterval(iv); iv = null; };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
    };
    holdBtn(dom.fire, 'fire');
    holdBtn(dom.ab, 'ab');
    holdBtn(dom.aim, 'aim');
    tapBtn(dom.msl, 'missile');
    tapBtn(dom.target, 'target');
    repeatBtn(dom.thrUp, 'throttleUp');
    repeatBtn(dom.thrDn, 'throttleDown');
    // also let FIRE/target/start-on-tap resume audio & start
    tapBtn(dom.fire, 'startTap');
  }
  consume(name) { if (this.pressed.has(name)) { this.pressed.delete(name); return true; } return false; }
  down(...ks) { for (const k of ks) if (this.keys.has(k)) return true; return false; }
}
