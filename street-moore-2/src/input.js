// input.js — keyboard + touch + motion-input buffer for Street Moore II.

const MAPS = {
  arrows: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp', ' ', 'Spacebar'], down: ['ArrowDown'],
    pL: ['j', 'J'], pH: ['k', 'K'], kL: ['n', 'N'], kH: ['m', 'M'],
  },
  wasd: {
    left: ['a', 'A'], right: ['d', 'D'], up: ['w', 'W'], down: ['s', 'S'],
    pL: ['f', 'F'], pH: ['g', 'G'], kL: ['v', 'V'], kH: ['b', 'B'],
  },
};

function newState() {
  return {
    held: { left: false, right: false, up: false, down: false, pL: false, pH: false, kL: false, kH: false },
    edge: { up: false, pL: false, pH: false, kL: false, kH: false },
    dirHist: [], // {dir, t}
    lastDir: 5,
  };
}

const players = { arrows: newState(), wasd: newState() };
let frame = 0;
let enterEdge = false, muteEdge = false, pauseEdge = false;
const rawDown = new Set();

function setKey(logicalMap, key, down) {
  for (const name of ['left', 'right', 'up', 'down', 'pL', 'pH', 'kL', 'kH']) {
    if (logicalMap[name] && logicalMap[name].includes(key)) {
      const st = players[logicalMap === MAPS.arrows ? 'arrows' : 'wasd'];
      if (down && !st.held[name]) {
        if (['up', 'pL', 'pH', 'kL', 'kH'].includes(name)) st.edge[name] = true;
      }
      st.held[name] = down;
    }
  }
}

function handle(e, down) {
  const k = e.key;
  if (down && rawDown.has(k)) { /* repeat */ } else if (down) rawDown.add(k); else rawDown.delete(k);
  setKey(MAPS.arrows, k, down);
  setKey(MAPS.wasd, k, down);
  if (down) {
    if (k === 'Enter') { enterEdge = true; pauseEdge = true; }
    if (k === '0') muteEdge = true;
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(k)) e.preventDefault();
}

window.addEventListener('keydown', (e) => handle(e, true));
window.addEventListener('keyup', (e) => handle(e, false));

function numpad(st) {
  const x = (st.held.right ? 1 : 0) - (st.held.left ? 1 : 0);
  const yDown = st.held.down;
  const yUp = st.held.up && !yDown;
  if (yDown) return x < 0 ? 1 : x > 0 ? 3 : 2;
  if (yUp) return x < 0 ? 7 : x > 0 ? 9 : 8;
  return x < 0 ? 4 : x > 0 ? 6 : 5;
}

function mirror(d) { // flip horizontal for facing-left
  const m = { 1: 3, 3: 1, 4: 6, 6: 4, 7: 9, 9: 7 };
  return m[d] || d;
}

// Advance one frame: update dir history and clear per-frame edges after read.
export function beginFrame() { frame++; }

export function updateDirs() {
  for (const key of ['arrows', 'wasd']) {
    const st = players[key];
    const d = numpad(st);
    if (d !== st.lastDir) {
      st.dirHist.push({ dir: d, t: frame });
      if (st.dirHist.length > 16) st.dirHist.shift();
      st.lastDir = d;
    }
  }
}

export function readPlayer(mapName) {
  const st = players[mapName];
  return {
    moveX: (st.held.right ? 1 : 0) - (st.held.left ? 1 : 0),
    up: st.held.up, down: st.held.down,
    jumpPressed: st.edge.up,
    pLPressed: st.edge.pL, pHPressed: st.edge.pH,
    kLPressed: st.edge.kL, kHPressed: st.edge.kH,
  };
}

// Detect a special motion within recent history, relative to facing (1 right, -1 left).
export function checkMotion(mapName, facing) {
  const st = players[mapName];
  const win = 22;
  const rel = st.dirHist
    .filter((e) => frame - e.t <= win)
    .map((e) => (facing === -1 ? mirror(e.dir) : e.dir));
  // append current live direction
  const live = numpad(st);
  rel.push(facing === -1 ? mirror(live) : live);
  const seqHas = (pat) => {
    let i = 0;
    for (const d of rel) { if (d === pat[i]) { i++; if (i === pat.length) return true; } }
    return false;
  };
  // Uppercut (dragon punch) 6-2-3 : forward, down, down-forward
  if (seqHas([6, 2, 3])) return 'uppercut';
  // Fireball (QCF) 2-3-6 : down, down-forward, forward
  if (seqHas([2, 3, 6])) return 'fireball';
  return null;
}

// Clear per-frame edges (call at end of a consumed frame).
export function clearEdges() {
  for (const key of ['arrows', 'wasd']) {
    const st = players[key];
    st.edge.up = st.edge.pL = st.edge.pH = st.edge.kL = st.edge.kH = false;
  }
  enterEdge = muteEdge = pauseEdge = false;
}

export function consumeEnter() { const v = enterEdge; enterEdge = false; return v; }
export function consumeMute() { const v = muteEdge; muteEdge = false; return v; }
export function pausePressed() { return pauseEdge; }

// ---- Touch controls: synthesize key events from on-screen buttons ----
export function initTouch() {
  const ui = document.getElementById('touch-ui');
  if (!ui) return;
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) ui.style.display = 'block';
  const specialSeq = () => {
    // Emulate a fireball motion + punch for the SP button.
    const st = players.arrows;
    const t = frame;
    st.dirHist.push({ dir: 2, t: t }, { dir: 3, t: t }, { dir: 6, t: t });
    if (st.dirHist.length > 16) st.dirHist.splice(0, st.dirHist.length - 16);
    st.edge.pL = true;
  };
  ui.querySelectorAll('.tbtn').forEach((btn) => {
    const k = btn.getAttribute('data-k');
    const press = (e) => {
      e.preventDefault(); btn.classList.add('on');
      if (k === 'Special') { specialSeq(); return; }
      if (k === 'Enter') { enterEdge = true; pauseEdge = true; return; }
      const st = players.arrows;
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', j: 'pL', k: 'pH', n: 'kL', m: 'kH' };
      const name = map[k];
      if (name) { if (!st.held[name] && ['up', 'pL', 'pH', 'kL', 'kH'].includes(name)) st.edge[name] = true; st.held[name] = true; }
    };
    const release = (e) => {
      e.preventDefault(); btn.classList.remove('on');
      if (k === 'Special' || k === 'Enter') return;
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', j: 'pL', k: 'pH', n: 'kL', m: 'kH' };
      const name = map[k];
      if (name) players.arrows.held[name] = false;
    };
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    window.addEventListener('mouseup', release);
  });
}

// Test-hook helpers: inject a motion + attack programmatically.
export function injectFireball(mapName = 'arrows') {
  const st = players[mapName];
  const t = frame;
  st.dirHist.push({ dir: 2, t }, { dir: 3, t }, { dir: 6, t });
  if (st.dirHist.length > 16) st.dirHist.splice(0, st.dirHist.length - 16);
  st.edge.pL = true;
}
export function injectPress(mapName, name) { players[mapName].edge[name] = true; }
