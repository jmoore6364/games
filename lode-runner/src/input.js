// Keyboard + gamepad + touch input. Directions are level-triggered (held),
// actions (dig, start, mute, restart) are edge-triggered via consume().

const held = { left: false, right: false, up: false, down: false };
const touchHeld = { left: false, right: false, up: false, down: false };
const edges = new Set();

const KEYMAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
};
const EDGEMAP = {
  z: 'digL', Z: 'digL', ',': 'digL',
  x: 'digR', X: 'digR', '.': 'digR',
  Enter: 'start', m: 'mute', M: 'mute', r: 'restart', R: 'restart',
};

const inForm = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '');

window.addEventListener('keydown', e => {
  if (inForm(e)) return;
  const dir = KEYMAP[e.key];
  if (dir) {
    held[dir] = true;
    if (!e.repeat) edges.add('nav' + dir); // one-shot edges for menu navigation
    e.preventDefault();
  }
  const act = EDGEMAP[e.key];
  if (act && !e.repeat) { edges.add(act); e.preventDefault(); }
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', e => {
  if (inForm(e)) return;
  const dir = KEYMAP[e.key];
  if (dir) held[dir] = false;
});
window.addEventListener('blur', () => {
  for (const k in held) held[k] = false;
});

// gamepad: dpad/left stick move, X/LB dig left, B/RB dig right, start = start
let padButtons = [];
function pollPad() {
  const pad = navigator.getGamepads?.()[0];
  if (!pad) return { left: false, right: false, up: false, down: false };
  const b = pad.buttons.map(x => x.pressed);
  const edge = i => b[i] && !padButtons[i];
  if (edge(2) || edge(4)) edges.add('digL');
  if (edge(1) || edge(5) || edge(0)) edges.add('digR');
  if (edge(9)) edges.add('start');
  if (edge(12)) edges.add('navup');
  if (edge(13)) edges.add('navdown');
  if (edge(14)) edges.add('navleft');
  if (edge(15)) edges.add('navright');
  padButtons = b;
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  return {
    left: b[14] || ax < -0.4, right: b[15] || ax > 0.4,
    up: b[12] || ay < -0.4, down: b[13] || ay > 0.4,
  };
}

export const input = {
  // call once per frame before reading
  poll() { this.pad = pollPad(); },
  pad: { left: false, right: false, up: false, down: false },
  held(dir) { return held[dir] || touchHeld[dir] || this.pad[dir]; },
  get dx() { return (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0); },
  get dy() { return (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0); },
  consume(action) { return edges.delete(action); },
  clearEdges() { edges.clear(); },
  setTouch(name, on) {
    if (name in touchHeld) {
      touchHeld[name] = on;
      if (on) edges.add('nav' + name);
    } else if (on) edges.add(name);
  },
};
