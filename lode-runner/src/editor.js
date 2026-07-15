// In-game level builder: paint tiles on the canvas, live solvability analysis
// (same movement-graph walk as npm test), playtest, save to localStorage,
// share as a URL. DOM toolbar + canvas painting, like the other arcade games.
import { COLS, ROWS } from './levels.js';
import { TILE, sprites, drawBrick, drawSolid, drawLadder, drawRope } from './sprites.js';
import { analyze } from './validate.js';
import { customLevels, storeCustomLevels, encodeShare } from './share.js';
import { VERSION } from './version.js';

let ctx = null; // injected by main.js: { canvas, g, isEditing(), onTest(def), onExit() }

const TOOLS = [
  ['#', 'BRICK'], ['@', 'SOLID'], ['H', 'LADDER'], ['-', 'ROPE'], ['T', 'TRAP'],
  ['X', 'EXIT'], ['$', 'GOLD'], ['G', 'GUARD'], ['P', 'START'], [' ', 'ERASE'],
];

const ed = {
  rows: null,      // ROWS x COLS array of char arrays
  tool: '#',
  mode: 'paint',   // 'paint' (drag paints cells) | 'box' (drag fills a rectangle)
  painting: false,
  erasing: false,
  hover: null,
  boxA: null, boxB: null, // rectangle-fill drag corners
  msg: '', msgT: 0,
  analysis: null,
  undo: [],
  openedAt: 0,     // guards against the opening tap ghost-clicking the new UI
};

function flash(m) { ed.msg = m; ed.msgT = 2.2; }

function blank() {
  ed.rows = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, () => (y === ROWS - 1 ? '@' : ' ')));
  ed.rows[ROWS - 2][1] = 'P';
  reanalyze();
}

const get = (x, y) => (x >= 0 && x < COLS && y >= 0 && y < ROWS ? ed.rows[y][x] : '@');
const set = (x, y, c) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) ed.rows[y][x] = c; };

export function rowsAsStrings() { return ed.rows.map(r => r.join('')); }

function reanalyze() { ed.analysis = analyze(rowsAsStrings()); }

function pushUndo() {
  if (!ed.rows) return;
  ed.undo.push(rowsAsStrings());
  if (ed.undo.length > 60) ed.undo.shift();
}

function popUndo() {
  const s = ed.undo.pop();
  if (!s) { flash('NOTHING TO UNDO'); return; }
  ed.rows = s.map(r => [...r]);
  reanalyze();
  flash('UNDONE');
}

// rectangle fill; used by box-drag and FILL ALL. 'P' is a single tile only.
function fillRect(x0, y0, x1, y1, tool) {
  if (tool === 'P') { flash('START IS A SINGLE TILE'); return; }
  pushUndo();
  for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(ROWS - 1, Math.max(y0, y1)); y++) {
    for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(COLS - 1, Math.max(x0, x1)); x++) {
      set(x, y, tool);
    }
  }
  reanalyze();
}

function applyTool(x, y, erase) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
  const tool = erase ? ' ' : ed.tool;
  if (tool === 'P') {
    for (let yy = 0; yy < ROWS; yy++) {
      for (let xx = 0; xx < COLS; xx++) if (ed.rows[yy][xx] === 'P') ed.rows[yy][xx] = ' ';
    }
    set(x, y, 'P');
  } else if (tool === 'X') {
    // the exit must reach the top: land the clicked cell no matter what,
    // then stamp the column upward through open air
    set(x, y, 'X');
    let yy = y - 1;
    for (; yy >= 0; yy--) {
      const c = get(x, yy);
      if (c === ' ' || c === 'X' || c === '$') set(x, yy, 'X');
      else break;
    }
    if (yy >= 0) flash('EXIT BLOCKED AT ROW ' + yy + ' - CLEAR ABOVE');
  } else {
    set(x, y, tool);
  }
  reanalyze();
}

function toJSON() {
  const name = (document.getElementById('led-name').value || 'MY LEVEL')
    .toUpperCase().slice(0, 18);
  return { name, rows: rowsAsStrings() };
}

function fromJSON(d) {
  const a = analyze(d.rows);
  if (a.problems[0] && a.problems[0].startsWith('LEVEL MUST BE')) throw new Error('bad size');
  ed.rows = d.rows.map(r => [...r]);
  document.getElementById('led-name').value = d.name || 'MY LEVEL';
  reanalyze();
}

function canvasPos(ev) {
  const rect = ctx.canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (ctx.canvas.width / rect.width);
  const y = (ev.clientY - rect.top) * (ctx.canvas.height / rect.height);
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}

// ------------------------------------------------------------------- DOM ----

function btn(label, onClick, cls = '') {
  const b = document.createElement('button');
  b.textContent = label;
  b.className = 'led-btn ' + cls;
  b.addEventListener('click', onClick);
  return b;
}

function refreshLoad() {
  const load = document.getElementById('led-load');
  load.innerHTML = '<option>LOAD...</option>' +
    customLevels().map(l => `<option>${l.name}</option>`).join('');
}

function buildToolbar() {
  const bar = document.createElement('div');
  bar.id = 'editor-ui';
  bar.style.display = 'none';

  const tools = document.createElement('div');
  tools.className = 'led-row';
  for (const [ch, label] of TOOLS) {
    const b = btn(label, () => {
      ed.tool = ch;
      tools.querySelectorAll('.led-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    }, ch === ed.tool ? 'sel' : '');
    tools.appendChild(b);
  }
  bar.appendChild(tools);

  const actions = document.createElement('div');
  actions.className = 'led-row';

  const name = document.createElement('input');
  name.id = 'led-name';
  name.value = 'MY LEVEL';
  name.maxLength = 18;
  name.spellcheck = false;
  actions.appendChild(name);

  const boxBtn = btn('BOX: OFF', () => {
    ed.mode = ed.mode === 'box' ? 'paint' : 'box';
    boxBtn.textContent = ed.mode === 'box' ? 'BOX: ON' : 'BOX: OFF';
    boxBtn.classList.toggle('sel', ed.mode === 'box');
    flash(ed.mode === 'box' ? 'DRAG A RECTANGLE TO FILL IT' : 'PAINT MODE');
  });
  actions.appendChild(boxBtn);
  actions.appendChild(btn('FILL ALL', () => {
    if (ed.tool === 'P') { flash('START IS A SINGLE TILE'); return; }
    fillRect(0, 0, COLS - 1, ROWS - 1, ed.tool);
    flash('FILLED - UNDO TO REVERT');
  }));
  actions.appendChild(btn('UNDO', popUndo));

  actions.appendChild(btn('▶ TEST', () => {
    if (ed.analysis.problems.some(p => p.startsWith('NO START') || p.startsWith('MORE THAN'))) {
      flash('PLACE EXACTLY ONE START (P) FIRST');
      return;
    }
    hide();
    ctx.onTest(toJSON());
  }, 'go'));
  actions.appendChild(btn('SAVE', () => {
    const data = toJSON();
    const list = customLevels().filter(l => l.name !== data.name);
    list.push(data);
    storeCustomLevels(list);
    refreshLoad();
    flash('SAVED ' + data.name);
  }));

  const load = document.createElement('select');
  load.id = 'led-load';
  load.addEventListener('change', () => {
    const found = customLevels().find(l => l.name === load.value);
    if (found) { pushUndo(); fromJSON(found); flash('LOADED ' + found.name); }
    load.selectedIndex = 0;
  });
  actions.appendChild(load);

  actions.appendChild(btn('SHARE', async () => {
    try {
      const url = shareURL();
      await navigator.clipboard.writeText(url);
      flash('SHARE LINK COPIED (' + url.length + ' CHARS)');
    } catch { flash('CLIPBOARD BLOCKED'); }
  }, 'go'));
  actions.appendChild(btn('COPY', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(toJSON()));
      flash('LEVEL JSON COPIED');
    } catch { flash('CLIPBOARD BLOCKED'); }
  }));
  actions.appendChild(btn('PASTE', () => {
    document.getElementById('led-import').style.display = 'flex';
  }));
  actions.appendChild(btn('NEW', () => { pushUndo(); blank(); flash('FRESH LEVEL'); }));
  actions.appendChild(btn('CLOSE', () => { hide(); ctx.onExit(); }, 'warn'));
  bar.appendChild(actions);

  // inside #wrap so it lays out under the canvas (body is overflow:hidden)
  document.getElementById('wrap').appendChild(bar);

  // import modal
  const modal = document.createElement('div');
  modal.id = 'led-import';
  modal.innerHTML = '<div class="led-modal"><p>Paste level JSON:</p><textarea spellcheck="false"></textarea><div></div></div>';
  const bwrap = modal.querySelector('div div');
  bwrap.appendChild(btn('IMPORT', () => {
    try {
      const d = JSON.parse(modal.querySelector('textarea').value);
      pushUndo();
      fromJSON(d);
      modal.style.display = 'none';
      flash('IMPORTED');
    } catch { flash('BAD LEVEL JSON'); }
  }));
  bwrap.appendChild(btn('CANCEL', () => { modal.style.display = 'none'; }));
  document.body.appendChild(modal);

  // canvas painting / box-fill drags
  ctx.canvas.addEventListener('pointerdown', ev => {
    if (!ctx.isEditing()) return;
    if (performance.now() - ed.openedAt < 300) return; // the tap that opened us
    ev.preventDefault();
    ed.erasing = ev.button === 2;
    const { tx, ty } = canvasPos(ev);
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return;
    ed.painting = true;
    if (ed.mode === 'box') {
      ed.boxA = { tx, ty };
      ed.boxB = { tx, ty };
    } else {
      pushUndo();
      applyTool(tx, ty, ed.erasing);
    }
  });
  ctx.canvas.addEventListener('pointermove', ev => {
    if (!ctx.isEditing()) return;
    const { tx, ty } = canvasPos(ev);
    ed.hover = { tx, ty };
    if (!ed.painting) return;
    if (ed.mode === 'box') {
      if (ed.boxA) ed.boxB = { tx: Math.max(0, Math.min(COLS - 1, tx)), ty: Math.max(0, Math.min(ROWS - 1, ty)) };
    } else applyTool(tx, ty, ed.erasing);
  });
  window.addEventListener('pointerup', () => {
    if (ed.painting && ed.mode === 'box' && ed.boxA && ed.boxB) {
      fillRect(ed.boxA.tx, ed.boxA.ty, ed.boxB.tx, ed.boxB.ty, ed.erasing ? ' ' : ed.tool);
    }
    ed.boxA = ed.boxB = null;
    ed.painting = false;
  });
  ctx.canvas.addEventListener('pointerleave', () => { ed.hover = null; });
  ctx.canvas.addEventListener('contextmenu', ev => {
    if (ctx.isEditing()) ev.preventDefault();
  });
}

function hide() {
  document.getElementById('editor-ui').style.display = 'none';
  document.body.classList.remove('editing');
}

export function shareURL() {
  return location.origin + location.pathname + '#lvl=' + encodeShare(toJSON());
}

// ---------------------------------------------------------------- drawing ----

function drawCell(g, x, y) {
  const c = ed.rows[y][x];
  const px = x * TILE, py = y * TILE;
  if (c === '#' || c === 'T') {
    drawBrick(g, px, py);
    if (c === 'T') { // builder-only marker: trap bricks show a faint notch
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(px + 9, py + 9, 6, 6);
    }
  } else if (c === '@') drawSolid(g, px, py);
  else if (c === 'H') drawLadder(g, px, py, false);
  else if (c === '-') drawRope(g, px, py);
  else if (c === 'X') {
    g.fillStyle = 'rgba(248, 208, 96, 0.16)'; // glow so it reads on small screens
    g.fillRect(px, py, TILE, TILE);
    g.globalAlpha = 0.85;
    drawLadder(g, px, py, true);
    g.globalAlpha = 1;
  } else if (c === '$') g.drawImage(sprites.gold, px, py);
  else if (c === 'P') {
    g.globalAlpha = 0.85;
    g.drawImage(sprites.player.stand, px, py);
    g.globalAlpha = 1;
  } else if (c === 'G') g.drawImage(sprites.guard.stand, px, py);
}

export const editor = {
  show() {
    if (!ed.rows) blank();
    reanalyze();
    ed.openedAt = performance.now();
    const bar = document.getElementById('editor-ui');
    bar.style.display = 'flex';
    // the tap that opened the editor must not ghost-click a button that
    // reflows in under the finger (mobile taps fire click after layout)
    bar.style.pointerEvents = 'none';
    setTimeout(() => { bar.style.pointerEvents = ''; }, 400);
    document.body.classList.add('editing');
    refreshLoad();
  },

  update(dt) { if (ed.msgT > 0) ed.msgT -= dt; },

  draw() {
    const g = ctx.g;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const boardH = ROWS * TILE;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawCell(g, x, y);

    // faint grid
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = TILE; x < W; x += TILE) g.fillRect(x, 0, 1, boardH);
    for (let y = TILE; y < boardH; y += TILE) g.fillRect(0, y, W, 1);

    // unreachable gold markers
    g.strokeStyle = '#ff4040';
    g.lineWidth = 2;
    for (const [x, y] of ed.analysis.badGold) {
      g.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
    }

    // hover cursor
    if (ed.hover && ed.hover.ty < ROWS) {
      g.strokeStyle = '#f8d848';
      g.lineWidth = 1;
      g.strokeRect(ed.hover.tx * TILE + 0.5, ed.hover.ty * TILE + 0.5, TILE - 1, TILE - 1);
    }

    // box-fill drag preview
    if (ed.boxA && ed.boxB) {
      const bx = Math.min(ed.boxA.tx, ed.boxB.tx) * TILE;
      const by = Math.min(ed.boxA.ty, ed.boxB.ty) * TILE;
      const bw = (Math.abs(ed.boxB.tx - ed.boxA.tx) + 1) * TILE;
      const bh = (Math.abs(ed.boxB.ty - ed.boxA.ty) + 1) * TILE;
      g.fillStyle = ed.erasing ? 'rgba(255,80,80,0.22)' : 'rgba(248,216,72,0.22)';
      g.fillRect(bx, by, bw, bh);
      g.strokeStyle = ed.erasing ? '#ff5050' : '#f8d848';
      g.lineWidth = 2;
      g.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    }

    // status bar
    g.fillStyle = '#101018';
    g.fillRect(0, boardH, W, H - boardH);
    g.font = '700 14px monospace';
    g.textAlign = 'left';
    const a = ed.analysis;
    if (ed.msgT > 0) {
      g.fillStyle = '#f8d848';
      g.fillText(ed.msg, 10, boardH + 21);
    } else if (a.ok) {
      g.fillStyle = '#58f898';
      g.fillText(`READY - ${a.gold} GOLD, ${a.guards} GUARDS - HIT TEST`, 10, boardH + 21);
    } else {
      g.fillStyle = '#ffa040';
      g.fillText(a.problems[0] + (a.problems.length > 1 ? ` (+${a.problems.length - 1} MORE)` : ''), 10, boardH + 21);
    }
    g.textAlign = 'right';
    g.fillStyle = '#667';
    g.fillText(`BUILDER ${VERSION} - RIGHT-CLICK ERASES`, W - 10, boardH + 21);
    g.textAlign = 'left';
  },

  // dev/test hooks
  get rows() { return ed.rows && rowsAsStrings(); },
  get analysis() { return ed.analysis; },
  get tool() { return ed.tool; },
  setTool(t) { ed.tool = t; },
  paint(x, y) { applyTool(x, y, false); },
  loadDef(d) { fromJSON(d); },
};

export function initEditor(context) {
  ctx = context;
  buildToolbar();
}
