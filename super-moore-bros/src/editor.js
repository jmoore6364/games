// In-game level builder: paint tiles and enemies, playtest, save to
// localStorage, share as JSON. DOM toolbar + canvas painting.
import { T, TILE, ROWS, setTile, tileAt } from './level.js';
import { SPR } from './sprites.js';

let ctx = null; // injected by main.js

const ed = {
  width: 120,
  theme: 'overworld',
  tiles: null,
  spawns: [],
  cam: 0,
  tool: 'ground',
  startX: 3,
  level: null, // live preview object fed to main's draw functions
  msg: '',
  msgT: 0,
  painting: false,
  erasing: false,
};

const THEMES = ['overworld', 'night', 'underground', 'ghost', 'snow', 'castle'];

const TILE_TOOLS = {
  ground: T.GROUND, brick: T.BRICK, hard: T.HARD,
  'q coin': T.Q, 'q power': T.QM, 'q star': T.QS, 'q 1up': T.Q1,
  'q wings': T.QW, 'q ice': T.QI,
  coin: T.COIN, lava: T.LAVA,
};
const SPAWN_TOOLS = ['goomba', 'fastgoomba', 'spiny', 'koopa', 'koopared', 'hopper', 'ghost'];
const OTHER_TOOLS = ['pipe 2', 'pipe 3', 'pipe 4', 'piranha', 'firebar', 'pole', 'start', 'erase'];

function flash(m) { ed.msg = m; ed.msgT = 120; }

// ------------------------------------------------------------- level data ----

function blank(width = 120) {
  ed.width = width;
  ed.tiles = new Uint8Array(width * ROWS);
  ed.spawns = [];
  ed.cam = 0;
  ed.startX = 3;
  for (let x = 0; x < width; x++) { rawSet(x, 13, T.GROUND); rawSet(x, 14, T.GROUND); }
  placePole(width - 4);
  syncPreview();
}

function rawSet(tx, ty, t) {
  if (tx >= 0 && tx < ed.width && ty >= 0 && ty < ROWS) ed.tiles[ty * ed.width + tx] = t;
}
function rawGet(tx, ty) {
  if (tx < 0 || tx >= ed.width || ty < 0 || ty >= ROWS) return T.EMPTY;
  return ed.tiles[ty * ed.width + tx];
}

function findPole() {
  for (let x = 0; x < ed.width; x++) if (rawGet(x, 7) === T.POLE) return x;
  return -1;
}

function clearPole() {
  const px = findPole();
  if (px < 0) return;
  for (let y = 2; y <= 12; y++) rawSet(px, y, T.EMPTY);
}

function placePole(tx) {
  clearPole();
  for (let y = 3; y <= 11; y++) rawSet(tx, y, T.POLE);
  rawSet(tx, 2, T.POLE_TOP);
  rawSet(tx, 12, T.HARD);
}

function syncPreview() {
  ed.level = {
    width: ed.width,
    name: 'BUILDER',
    theme: ed.theme,
    tiles: ed.tiles,
    spawns: [],
    decor: { hills: [], bushes: [], clouds: [] },
    flagX: findPole(),
    castleX: -1,
    playerStart: { x: ed.startX * TILE, y: 176 },
    timeLimit: 400,
    friction: ed.theme === 'snow' ? 0.35 : 1,
  };
}

function toJSON() {
  if (findPole() < 0) placePole(ed.width - 4);
  return {
    name: (document.getElementById('ed-name').value || 'MY LEVEL').toUpperCase().slice(0, 18),
    width: ed.width,
    theme: ed.theme,
    tiles: Array.from(ed.tiles),
    spawns: ed.spawns.map(s => ({ ...s })),
    flagX: findPole(),
    castleX: -1,
    playerStart: { x: ed.startX * TILE, y: 176 },
    timeLimit: 400,
  };
}

function fromJSON(d) {
  ed.width = d.width;
  ed.theme = THEMES.includes(d.theme) ? d.theme : 'overworld';
  ed.tiles = Uint8Array.from(d.tiles);
  ed.spawns = (d.spawns || []).map(s => ({ ...s }));
  ed.startX = Math.floor((d.playerStart?.x ?? 48) / TILE);
  ed.cam = 0;
  document.getElementById('ed-name').value = d.name || 'MY LEVEL';
  syncPreview();
}

function savedLevels() {
  try { return JSON.parse(localStorage.getItem('smb-custom-levels') || '[]'); }
  catch { return []; }
}
function storeLevels(list) {
  localStorage.setItem('smb-custom-levels', JSON.stringify(list));
}

// ---------------------------------------------------------------- painting ----

function applyTool(tx, ty, erase) {
  if (tx < 0 || tx >= ed.width || ty < 0 || ty >= ROWS) return;
  const tool = erase ? 'erase' : ed.tool;

  if (tool === 'erase') {
    if (rawGet(tx, ty) === T.POLE || rawGet(tx, ty) === T.POLE_TOP) clearPole();
    else rawSet(tx, ty, T.EMPTY);
    ed.spawns = ed.spawns.filter(s => {
      const sx = s.type === 'firebar' ? s.cx - 8 : s.x;
      const sy = s.type === 'firebar' ? s.cy - 8 : null;
      if (Math.floor(sx / TILE) !== tx) return true;
      if (sy !== null && Math.floor(sy / TILE) !== ty) return true;
      return false;
    });
    syncPreview();
    return;
  }

  if (tool in TILE_TOOLS) {
    rawSet(tx, ty, TILE_TOOLS[tool]);
  } else if (tool.startsWith('pipe ')) {
    const h = +tool.split(' ')[1];
    for (let y = 13 - h; y <= 12; y++) {
      rawSet(tx, y, y === 13 - h ? T.PIPE_TL : T.PIPE_L);
      rawSet(tx + 1, y, y === 13 - h ? T.PIPE_TR : T.PIPE_R);
    }
  } else if (tool === 'piranha') {
    // click a pipe top to plant one
    let t = rawGet(tx, ty);
    let left = tx;
    if (t === T.PIPE_TR) left = tx - 1;
    if (rawGet(left, ty) !== T.PIPE_TL) { flash('CLICK A PIPE TOP'); return; }
    ed.spawns = ed.spawns.filter(s => !(s.type === 'piranha' && s.cx === left * TILE + TILE));
    ed.spawns.push({ type: 'piranha', x: left * TILE, cx: left * TILE + TILE, top: ty * TILE });
  } else if (tool === 'firebar') {
    rawSet(tx, ty, T.HARD);
    ed.spawns.push({ type: 'firebar', x: tx * TILE - 96, cx: tx * TILE + 8, cy: ty * TILE + 8 });
  } else if (tool === 'pole') {
    placePole(tx);
  } else if (tool === 'start') {
    ed.startX = tx;
  } else if (SPAWN_TOOLS.includes(tool)) {
    ed.spawns = ed.spawns.filter(s => !(s.type === tool && Math.floor(s.x / TILE) === tx));
    ed.spawns.push({ type: tool, x: tx * TILE, y: 0 });
  }
  syncPreview();
}

function canvasPos(ev) {
  const rect = ctx.canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (ctx.W / rect.width) + ed.cam;
  const y = (ev.clientY - rect.top) * (ctx.H / rect.height);
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}

// ------------------------------------------------------------------- DOM ----

function btn(label, onClick, cls = '') {
  const b = document.createElement('button');
  b.textContent = label;
  b.className = 'ed-btn ' + cls;
  b.addEventListener('click', onClick);
  return b;
}

function buildToolbar() {
  const bar = document.createElement('div');
  bar.id = 'editor-ui';
  bar.style.display = 'none';

  const tools = document.createElement('div');
  tools.className = 'ed-row';
  const allTools = [...Object.keys(TILE_TOOLS), ...OTHER_TOOLS.filter(t => t !== 'erase'), ...SPAWN_TOOLS, 'erase'];
  for (const t of allTools) {
    const b = btn(t.toUpperCase(), () => {
      ed.tool = t;
      tools.querySelectorAll('.ed-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    }, t === ed.tool ? 'sel' : '');
    tools.appendChild(b);
  }
  bar.appendChild(tools);

  const actions = document.createElement('div');
  actions.className = 'ed-row';

  const name = document.createElement('input');
  name.id = 'ed-name';
  name.value = 'MY LEVEL';
  name.maxLength = 18;
  name.spellcheck = false;
  actions.appendChild(name);

  actions.appendChild(btn('THEME', (e) => {
    ed.theme = THEMES[(THEMES.indexOf(ed.theme) + 1) % THEMES.length];
    e.target.textContent = 'THEME: ' + ed.theme.toUpperCase();
    syncPreview();
  }));
  actions.appendChild(btn('W-', () => resize(-20)));
  actions.appendChild(btn('W+', () => resize(20)));
  actions.appendChild(btn('▶ PLAY', () => {
    hideBar();
    ctx.startCustomLevel(toJSON(), true);
  }, 'go'));
  actions.appendChild(btn('SAVE', () => {
    const data = toJSON();
    const list = savedLevels().filter(l => l.name !== data.name);
    list.push(data);
    storeLevels(list);
    refreshLoad();
    flash('SAVED ' + data.name);
  }));

  const load = document.createElement('select');
  load.id = 'ed-load';
  load.addEventListener('change', () => {
    const list = savedLevels();
    const found = list.find(l => l.name === load.value);
    if (found) { fromJSON(found); flash('LOADED'); }
    load.selectedIndex = 0;
  });
  actions.appendChild(load);

  actions.appendChild(btn('COPY', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(toJSON()));
      flash('LEVEL JSON COPIED');
    } catch { flash('CLIPBOARD BLOCKED'); }
  }));
  actions.appendChild(btn('PASTE', () => {
    document.getElementById('ed-import').style.display = 'flex';
  }));
  actions.appendChild(btn('NEW', () => { blank(120); flash('FRESH LEVEL'); }));
  actions.appendChild(btn('EXIT', () => { hideBar(); ctx.exit(); }, 'warn'));
  bar.appendChild(actions);

  document.body.appendChild(bar);

  // import modal
  const modal = document.createElement('div');
  modal.id = 'ed-import';
  modal.innerHTML = '<div class="ed-modal"><p>Paste level JSON:</p><textarea></textarea><div></div></div>';
  const bwrap = modal.querySelector('div div');
  bwrap.appendChild(btn('IMPORT', () => {
    try {
      fromJSON(JSON.parse(modal.querySelector('textarea').value));
      modal.style.display = 'none';
      flash('IMPORTED');
    } catch { flash('BAD JSON'); }
  }));
  bwrap.appendChild(btn('CANCEL', () => { modal.style.display = 'none'; }));
  document.body.appendChild(modal);

  // canvas painting
  ctx.canvas.addEventListener('pointerdown', (ev) => {
    if (ctx.game.state !== 'editor') return;
    ed.painting = true;
    ed.erasing = ev.button === 2;
    const { tx, ty } = canvasPos(ev);
    applyTool(tx, ty, ed.erasing);
  });
  ctx.canvas.addEventListener('pointermove', (ev) => {
    if (ctx.game.state !== 'editor' || !ed.painting) return;
    const { tx, ty } = canvasPos(ev);
    applyTool(tx, ty, ed.erasing);
  });
  window.addEventListener('pointerup', () => { ed.painting = false; });
  ctx.canvas.addEventListener('contextmenu', (ev) => {
    if (ctx.game.state === 'editor') ev.preventDefault();
  });
}

function resize(d) {
  const w = Math.max(40, Math.min(400, ed.width + d));
  const next = new Uint8Array(w * ROWS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < Math.min(w, ed.width); x++) next[y * w + x] = ed.tiles[y * ed.width + x];
  }
  if (w > ed.width) { // extend the floor
    for (let x = ed.width; x < w; x++) { next[13 * w + x] = T.GROUND; next[14 * w + x] = T.GROUND; }
  }
  ed.width = w;
  ed.tiles = next;
  ed.spawns = ed.spawns.filter(s => s.x < w * TILE);
  if (findPole() < 0) placePole(w - 4);
  syncPreview();
  flash('WIDTH ' + w);
}

function refreshLoad() {
  const load = document.getElementById('ed-load');
  load.innerHTML = '<option>LOAD...</option>' +
    savedLevels().map(l => `<option>${l.name}</option>`).join('');
}

function hideBar() { document.getElementById('editor-ui').style.display = 'none'; }

// ---------------------------------------------------------------- public ----

export const editor = {
  show() {
    if (!ed.tiles) blank(120);
    syncPreview();
    document.getElementById('editor-ui').style.display = 'flex';
    refreshLoad();
  },

  update() {
    const input = ctx.input;
    if (input.down('right')) ed.cam += 4;
    if (input.down('left')) ed.cam -= 4;
    ed.cam = Math.max(0, Math.min(ed.cam, ed.width * TILE - ctx.W));
    if (ed.msgT > 0) ed.msgT--;
  },

  draw() {
    const g = ctx.g;
    // reuse the game renderer on our preview level
    ctx.game.level = ed.level;
    ctx.game.cam = ed.cam;
    ctx.drawBackground();
    ctx.drawTiles();

    // spawn markers
    for (const s of ed.spawns) {
      if (s.type === 'firebar') {
        for (let i = 0; i < 5; i++) {
          g.drawImage(SPR.fireball, Math.round(s.cx - 3 + i * 5 - ed.cam), Math.round(s.cy - 3 - i * 5));
        }
        continue;
      }
      if (s.type === 'piranha') {
        g.drawImage(SPR.piranha, Math.round(s.cx - 8 - ed.cam), s.top - 20);
        continue;
      }
      const img =
        s.type === 'spiny' ? SPR.spiny
        : s.type === 'fastgoomba' ? SPR.goombaFast[0].l
        : s.type === 'koopa' ? SPR.koopa[0].l
        : s.type === 'koopared' ? SPR.koopaRed[0].l
        : s.type === 'hopper' ? SPR.hopper[0].l
        : s.type === 'ghost' ? SPR.ghost
        : SPR.goomba[0].l;
      // rest markers on the first solid tile in their column
      const tx = Math.floor(s.x / TILE);
      let ty = 13;
      for (let y = 0; y < ROWS; y++) if (rawGet(tx, y) !== T.EMPTY) { ty = y; break; }
      const gy = s.type === 'ghost' ? 8 * TILE : ty * TILE - img.height;
      g.drawImage(img, Math.round(s.x - ed.cam), gy);
    }

    // player start marker
    const hero = SPR.heroSmall.idle.r;
    g.globalAlpha = 0.7;
    g.drawImage(hero, Math.round(ed.startX * TILE - ed.cam), 13 * TILE - 16);
    g.globalAlpha = 1;

    // faint grid
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let x = TILE - (ed.cam % TILE); x < ctx.W; x += TILE) g.fillRect(x, 0, 1, ctx.H);
    for (let y = TILE; y < ctx.H; y += TILE) g.fillRect(0, y, ctx.W, 1);

    // HUD strip
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, ctx.W, 10);
    ctx.drawText(g, 'TOOL ' + ed.tool.toUpperCase(), 4, 2, '#f8d048');
    ctx.drawText(g, 'X' + Math.floor(ed.cam / TILE), 150, 2, '#ffffff');
    ctx.drawText(g, ed.theme.toUpperCase(), 190, 2, '#b8c8ff');
    if (ed.msgT > 0) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(0, 220, ctx.W, 12);
      ctx.drawText(g, ed.msg, 6, 222, '#f8d048');
    }
  },
};

export function initEditor(context) {
  ctx = context;
  buildToolbar();
}
