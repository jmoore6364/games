// main.js — boot, game loop, HUD/overlay DOM updates, minimap, touch-button
// wiring, first-gesture audio resume, and the window.__oz test hook.

import { Renderer } from './renderer.js';
import { Input, IS_TOUCH } from './input.js';
import { Audio } from './audio.js';
import { Game } from './game.js';

const canvas = document.getElementById('c');
let renderer;
try {
  renderer = new Renderer(canvas);
} catch (err) {
  document.body.innerHTML = '<div style="color:#fff;padding:40px;font-family:sans-serif">WebGL failed to initialize: ' + err.message + '</div>';
  throw err;
}
const input = new Input(canvas);
const audio = new Audio();
const game = new Game(renderer, input, audio);

// ---- first-gesture audio ---------------------------------------------------
let audioReady = false;
function wakeAudio() { if (audioReady) return; audioReady = true; audio.init(); audio.resume(); }
window.addEventListener('pointerdown', wakeAudio, { once: false });
window.addEventListener('keydown', wakeAudio, { once: false });
window.addEventListener('touchstart', wakeAudio, { once: false });

// ---- DOM refs --------------------------------------------------------------
const el = (id) => document.getElementById(id);
const heartsEl = el('hearts'), rupeesEl = el('rupees'), keysEl = el('keys'),
  arrowsEl = el('arrows'), bombsEl = el('bombs'), itemEl = el('itembox'),
  msgEl = el('msg'), titleEl = el('title'), dlgEl = el('dialogue'),
  shopEl = el('shop'), endEl = el('endcard'), mmap = el('minimap');
const mmctx = mmap.getContext('2d');

// heart svg
function heartSVG(fill) {
  return `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.9-10-9.5C.6 8.6 2 5 5.4 5 7.5 5 9 6.4 12 9c3-2.6 4.5-4 6.6-4C22 5 23.4 8.6 22 11.5 19.5 16.1 12 21 12 21z" fill="${fill}" stroke="#5a0e12" stroke-width="1.2"/></svg>`;
}
let lastHearts = -1, lastMax = -1;
function drawHearts(h, max) {
  if (h === lastHearts && max === lastMax) return;
  lastHearts = h; lastMax = max;
  let s = '';
  for (let i = 0; i < max; i++) s += `<div class="heart">${heartSVG(i < h ? '#ff3b46' : '#3a2224')}</div>`;
  heartsEl.innerHTML = s;
}

// ---- start buttons ---------------------------------------------------------
el('playbtn').addEventListener('click', () => { wakeAudio(); game.startGame(); });
el('againbtn').addEventListener('click', () => { wakeAudio(); game.startGame(); });
el('mute').addEventListener('click', () => { wakeAudio(); const m = audio.toggleMute(); el('mute').textContent = m ? '🔇' : '🔊'; });

// ---- touch UI --------------------------------------------------------------
if (IS_TOUCH) {
  el('touch').classList.add('on');
  el('keyhint').style.display = 'none';
  const bind = (id, name) => {
    const b = el(id);
    const down = (e) => { e.preventDefault(); wakeAudio(); input.setButton(name, true); };
    const up = (e) => { e.preventDefault(); input.setButton(name, false); };
    b.addEventListener('touchstart', down, { passive: false });
    b.addEventListener('touchend', up, { passive: false });
    b.addEventListener('touchcancel', up, { passive: false });
    b.addEventListener('mousedown', down); b.addEventListener('mouseup', up);
  };
  bind('b_attack', 'attack'); bind('b_item', 'item'); bind('b_target', 'target');
  bind('b_roll', 'roll'); bind('b_action', 'action');
  el('tpause').addEventListener('click', () => input.setButton('pause', true));
  // shield: hold Z-target region? add long-press on attack? Provide block via roll double? keep block on a gesture: use two-finger? Simplest: block when action held near — skip; block available via keyboard. Provide a small block toggle by holding item? We'll map block to holding the attack button's neighbor: none.
}
const stickBase = el('stickbase'), stickKnob = el('stickknob');

// ---- minimap ---------------------------------------------------------------
function drawMinimap() {
  const d = game.mapData(); if (!d) return;
  const W = 100, H = 100;
  mmctx.clearRect(0, 0, W, H);
  const bx = d.bounds, bw = bx.x1 - bx.x0, bh = bx.z1 - bx.z0;
  const sc = Math.min(W / bw, H / bh) * 0.9;
  const ox = (W - bw * sc) / 2, oy = (H - bh * sc) / 2;
  const tx = (x) => ox + (x - bx.x0) * sc, tz = (z) => oy + (z - bx.z0) * sc;
  mmctx.fillStyle = d.area === 'dungeon' ? 'rgba(40,36,54,.5)' : 'rgba(40,80,50,.4)';
  mmctx.fillRect(ox, oy, bw * sc, bh * sc);
  for (const p of d.pts) {
    mmctx.fillStyle = p.kind === 'enemy' ? '#e05555' : p.kind === 'boss' ? '#ff3030'
      : p.kind === 'chest' ? '#e0b040' : p.kind === 'heart' ? '#ff5b76' : '#3ad36b';
    const r = p.kind === 'boss' ? 4 : 2.2;
    mmctx.beginPath(); mmctx.arc(tx(p.x), tz(p.z), r, 0, 7); mmctx.fill();
  }
  // player arrow
  const px = tx(d.player.x), pz = tz(d.player.z);
  mmctx.save(); mmctx.translate(px, pz); mmctx.rotate(d.player.yaw);
  mmctx.fillStyle = '#fff'; mmctx.beginPath();
  mmctx.moveTo(5, 0); mmctx.lineTo(-3, 3); mmctx.lineTo(-3, -3); mmctx.closePath(); mmctx.fill();
  mmctx.restore();
}

// ---- HUD -------------------------------------------------------------------
function updateHUD(s) {
  titleEl.classList.toggle('hidden', s.mode !== 'title');
  const showHud = !(s.mode === 'title' || s.mode === 'win' || s.mode === 'gameover');
  el('hud').style.display = showHud ? 'block' : 'none';
  el('keyhint').style.display = (showHud && !IS_TOUCH) ? 'block' : 'none';
  drawHearts(s.hearts, s.maxHearts);
  rupeesEl.textContent = s.rupees;
  keysEl.textContent = s.smallkeys + (s.hasBossKey ? '+B' : '');
  arrowsEl.textContent = s.arrows;
  bombsEl.textContent = s.bombs;
  itemEl.innerHTML = s.item === 'bow' ? '➶<small>Bow<br>' + s.arrows + '</small>' : '💣<small>Bomb<br>' + s.bombs + '</small>';

  // message toast
  if (s.msg) { msgEl.textContent = s.msg; msgEl.classList.add('show'); }
  else msgEl.classList.remove('show');

  // dialogue
  if (s.mode === 'dialogue' && s.dialogue) {
    dlgEl.classList.remove('hidden');
    dlgEl.querySelector('.who').textContent = s.dialogue.name;
    dlgEl.querySelector('.txt').textContent = s.dialogue.lines[s.dialogue.idx];
  } else dlgEl.classList.add('hidden');

  // shop
  if (s.mode === 'shop' && s.shop) {
    shopEl.classList.remove('hidden');
    el('shopname').textContent = s.shop.name;
    el('shopnote').textContent = s.shop.note + '   (You have ' + s.rupees + ' rupees)';
    let html = '';
    s.shop.items.forEach((it, i) => {
      html += `<div class="shopitem ${i === s.shop.idx ? 'sel' : ''}"><span>${it.label}</span><span class="cost">${it.cost} 💎</span></div>`;
    });
    el('shoplist').innerHTML = html;
  } else shopEl.classList.add('hidden');

  // end cards
  if (s.mode === 'win' || s.mode === 'gameover') {
    endEl.classList.remove('hidden');
    el('endtitle').textContent = s.mode === 'win' ? '★ Victory! ★' : 'Game Over';
    el('endtitle').style.color = s.mode === 'win' ? '#ffe08a' : '#e06060';
    el('endsub').textContent = s.mode === 'win'
      ? 'Moore reclaimed the Ocarina Gem and saved the village!'
      : 'Moore has fallen... The village still needs a hero.';
  } else endEl.classList.add('hidden');

  // stick visual
  if (IS_TOUCH) {
    const si = input.stickInfo();
    if (si.active) {
      stickBase.style.display = stickKnob.style.display = 'block';
      stickBase.style.left = si.origin.x + 'px'; stickBase.style.top = si.origin.y + 'px';
      stickKnob.style.left = (si.origin.x + si.vec.x * 45) + 'px';
      stickKnob.style.top = (si.origin.y - si.vec.y * 45) + 'px';
    } else { stickBase.style.display = stickKnob.style.display = 'none'; }
  }
}

// ---- loop ------------------------------------------------------------------
let last = performance.now();
let frames = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  game.render();
  const s = game.state();
  updateHUD(s);
  if (s.mode !== 'title') drawMinimap();
  mmap.style.display = (s.mode === 'title' || s.mode === 'win' || s.mode === 'gameover') ? 'none' : 'block';
  itemEl.style.display = mmap.style.display;
  frames++;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('resize', () => renderer.resize());
renderer.resize();

// ---- test hook -------------------------------------------------------------
window.__oz = {
  game, renderer, input, audio,
  state: () => game.state(),
  frames: () => frames,
  start: () => game.startGame(),
  toField: () => game.toField(),
  toDungeon: () => game.toDungeon(),
  toBoss: () => game.toBoss(),
  teleportPlayer: (x, z) => { game.player.x = x; game.player.z = z; },
  spawnEnemy: (kind, x, z) => game.spawnEnemy(kind || 'blin', x, z),
  spawnBoss: () => game.spawnBoss(),
  hurtBoss: (n) => { if (game.boss) { game.boss.eyeOpen = 1; for (let i = 0; i < (n || 1); i++) game._hitBoss(3, false); } },
  setInput: (name, down) => input.setButton(name, down),
  ready: true,
};
console.log('Ocarina of Moore booted');
