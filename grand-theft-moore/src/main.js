// main.js — browser shell: game loop, chase/first-person camera, HUD, minimap,
// state screens (title/busted/wasted/win), audio wiring, and the __gtm test
// hook. The pure simulation lives in game.js. BROWSER-ONLY.

import { Game, INTERIOR, shopOffer } from './game.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { drawStars } from './sprites.js';
import { Vehicle } from './vehicles.js';
import { P, ROAD, TILE } from './city.js';

const canvas = document.getElementById('view');
const hud = document.getElementById('hud');
const hudCtx = hud.getContext('2d');
// Responsive canvases: fill the window at devicePixelRatio so the game is
// full-screen and crisp on desktop (it used to be a fixed 880x550 box centred
// in the page). VW/VH are the logical CSS-pixel size the HUD draws in; the
// WebGL renderer reads the higher-res backing store each frame and adapts its
// viewport + projection automatically.
let VW = 880, VH = 550;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  VW = Math.max(1, Math.floor(window.innerWidth));
  VH = Math.max(1, Math.floor(window.innerHeight));
  canvas.width = Math.round(VW * dpr); canvas.height = Math.round(VH * dpr);
  hud.width = Math.round(VW * dpr); hud.height = Math.round(VH * dpr);
  hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);   // draw HUD in CSS pixels
}
resize();
addEventListener('resize', resize);

const game = new Game((Math.random() * 1e9) | 0);
const renderer = new Renderer(canvas);
// Load the real CC0 car + character glTF models in the background. This is a
// pure enhancement: loadModels() swallows every error internally and leaves the
// procedural box meshes in place if anything fails, so the game never blocks or
// breaks on a missing/corrupt asset.
renderer.loadModels();
const input = new Input(canvas);
const audio = new Audio();

let state = 'title';       // title | play | busted | wasted | win
let downTimer = 0;
let radioName = '';
let radioTimer = 0;
let toast = '';
let toastTimer = 0;

// minimap base (whole-city, north-up), precomputed once
const MM = document.createElement('canvas');
MM.width = game.city.MAP; MM.height = game.city.MAP;
(() => {
  const c = MM.getContext('2d');
  const city = game.city, M = city.MAP, im = c.createImageData(M, M);
  for (let z = 0; z < M; z++) for (let x = 0; x < M; x++) {
    const t = city.T[x + z * M]; const solid = city.H[x + z * M] > 0;
    let r, g, b;
    if (solid) { r = 60; g = 62; b = 72; }
    else if (t === TILE.ROAD) { r = 30; g = 30; b = 34; }
    else if (t === TILE.SIDEWALK) { r = 80; g = 80; b = 86; }
    else if (t === TILE.GRASS) { r = 40; g = 70; b = 42; }
    else if (t === TILE.SPECIAL) { r = 120; g = 100; b = 60; }
    else { r = 45; g = 46; b = 52; }
    const o = (x + z * M) * 4; im.data[o] = r; im.data[o + 1] = g; im.data[o + 2] = b; im.data[o + 3] = 255;
  }
  c.putImageData(im, 0, 0);
})();

// ---- camera --------------------------------------------------------------
function computeCamera() {
  const g = game, p = g.player;
  // inside a shop: simple chase cam clamped to the room (no city pull-in)
  if (g.inShop) {
    const yaw = g.camYaw;
    if (g.firstPerson) return { eye: { x: p.x, y: 2.5, z: p.z }, yaw, pitch: Math.max(-1.2, Math.min(0.4, g.camPitch)) };
    const dist = 4.0, height = 2.7, hx = Math.cos(yaw), hz = Math.sin(yaw);
    const eye = {
      x: Math.max(0.4, Math.min(INTERIOR.W - 0.4, p.x - hx * dist)),
      y: height,
      z: Math.max(0.4, Math.min(INTERIOR.D - 0.4, p.z - hz * dist)),
    };
    const basePitch = Math.atan2(1.6 - height, dist);
    return { eye, yaw, pitch: Math.max(-1.25, Math.min(0.25, basePitch + g.camPitch)) };
  }
  const driving = !!p.inVehicle;
  const tx = driving ? p.inVehicle.x : p.x;
  const tz = driving ? p.inVehicle.z : p.z;
  const focusY = driving ? 1.3 : 2.0;
  const yaw = g.camYaw;
  if (g.firstPerson) {
    const eh = driving ? 1.4 : 2.7;
    return { eye: { x: tx, y: eh, z: tz }, yaw, pitch: Math.max(-1.2, Math.min(0.4, g.camPitch)) };
  }
  const dist = driving ? 8.5 : 6.5;
  const height = driving ? 3.9 : 3.1;
  const hx = Math.cos(yaw), hz = Math.sin(yaw);
  // camera pull-in against buildings
  let d = dist;
  for (let s = 1; s <= 8; s++) {
    const f = (s / 8) * dist;
    const cx = tx - hx * f, cz = tz - hz * f;
    if (g.city.solidAt(cx, cz)) { d = Math.max(1.5, f - 0.8); break; }
  }
  const eye = { x: tx - hx * d, y: height, z: tz - hz * d };
  const basePitch = Math.atan2(focusY - height, d);
  const pitch = Math.max(-1.25, Math.min(0.25, basePitch + g.camPitch));
  return { eye, yaw, pitch };
}

// ---- entity list for the renderer ---------------------------------------
function buildEntities() {
  const g = game, out = [];
  const flash = Math.floor(g.time * 5);
  // inside a shop: only the player character + the shopkeeper behind the counter
  if (g.inShop) {
    const p = g.player, c = INTERIOR.counter;
    out.push({ x: p.x, y: p.y || 0, z: p.z, h: 1.85, heading: p.heading, color: [40, 60, 110], shirt: [200, 210, 220], tint: p.outfit || undefined, state: 'walk', kind: 'ped' });
    out.push({ x: (c.x0 + c.x1) / 2, y: 0, z: INTERIOR.D - 0.9, h: 1.8, heading: -Math.PI / 2, color: [30, 40, 60], shirt: [220, 180, 60], skin: [210, 170, 140], tint: [1.0, 0.86, 0.62], state: 'walk', kind: 'ped' });
    return out;
  }
  for (const v of g.vehicles) {
    if (g.firstPerson && v === g.player.inVehicle) continue;
    out.push({
      x: v.x, z: v.z, heading: v.heading, w: v.w, l: v.l, h: v.h,
      color: v.color, kind: v.role === 'police' ? 'police' : 'car', type: v.type,
      police: v.role === 'police', flash,
      mission: v.mission,
    });
  }
  for (const ped of g.peds) {
    out.push({ x: ped.x, z: ped.z, h: ped.h, heading: ped.heading, color: ped.color, shirt: ped.shirt, skin: ped.skin, hair: ped.hair, tint: ped.tint, boxPed: ped.boxPed, state: ped.state, kind: 'ped' });
  }
  // draw the player's own character on foot in 3rd person. Pass y so the
  // mesh actually rises when jumping (was pinned to the ground). No tint -> the
  // player renders at the model's native colours.
  if (!g.player.inVehicle && !g.firstPerson) {
    out.push({ x: g.player.x, y: g.player.y || 0, z: g.player.z, h: 1.85, heading: g.player.heading, color: [40, 60, 110], shirt: [200, 210, 220], tint: g.player.outfit || undefined, state: 'walk', kind: 'ped' });
  }
  return out;
}

// health bar + (when present) a blue armor bar stacked above it, bottom-right
function drawVitals(ctx) {
  const p = game.player, hbw = 160, hbx = VW - hbw - 16, hby = VH - 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(hbx, hby, hbw, 14);
  ctx.fillStyle = '#c33'; ctx.fillRect(hbx, hby, hbw * (p.health / p.maxHealth), 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(hbx, hby, hbw, 14);
  if (p.armor > 0) {
    const aby = hby - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(hbx, aby, hbw, 8);
    ctx.fillStyle = '#5cf'; ctx.fillRect(hbx, aby, hbw * (p.armor / p.maxArmor), 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(hbx, aby, hbw, 8);
  }
}

// ---- HUD -----------------------------------------------------------------
function drawHUD(ctx) {
  const g = game;
  ctx.save();
  ctx.font = '14px monospace'; ctx.textBaseline = 'top';

  // inside a shop: name + interior hints + health/cash (no minimap/stars)
  if (g.inShop) {
    ctx.textAlign = 'center';
    // dark plate behind the name + hint so they stay readable over the interior
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(VW / 2 - 220, 8, 440, 66);
    ctx.font = 'bold 24px monospace'; ctx.fillStyle = g.inShop.col
      ? `rgb(${g.inShop.col.map(c => Math.round(c * 255)).join(',')})` : '#ffd23a';
    ctx.fillText(g.inShop.name, VW / 2, 20);
    ctx.font = '14px monospace'; ctx.fillStyle = '#cde';
    const offer = shopOffer(g.inShop.kind);
    ctx.fillText('F: exit    J: ' + offer.label + ' $' + offer.price, VW / 2, 52);
    // cash
    ctx.textAlign = 'right'; ctx.fillStyle = '#3d3'; ctx.font = 'bold 22px monospace';
    ctx.fillText('$' + g.cash, VW - 16, 40);
    // health + armor
    drawVitals(ctx);
    if (toastTimer > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.fillText(toast, VW / 2, 96); }
    ctx.textAlign = 'left'; ctx.restore(); return;
  }
  // minimap
  const mmSize = 150, mx = 12, my = VH - mmSize - 12;
  const view = 130; // world units shown across the minimap
  const p = g.player;
  const cx = p.inVehicle ? p.inVehicle.x : p.x;
  const cz = p.inVehicle ? p.inVehicle.z : p.z;
  ctx.save();
  ctx.beginPath(); ctx.rect(mx, my, mmSize, mmSize); ctx.clip();
  ctx.fillStyle = '#111'; ctx.fillRect(mx, my, mmSize, mmSize);
  const sc = mmSize / view;
  // blit city portion centered on player
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(MM, cx - view / 2, cz - view / 2, view, view, mx, my, mmSize, mmSize);
  const toMM = (wx, wz) => ({ x: mx + (wx - (cx - view / 2)) * sc, y: my + (wz - (cz - view / 2)) * sc });
  // mission markers
  for (const m of g.markers()) {
    const s = toMM(m.x, m.z);
    ctx.fillStyle = m.kind === 'target' ? (Math.floor(g.time * 4) % 2 ? '#fff' : '#ffd23a') : '#ffd23a';
    ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill();
  }
  // police blips
  for (const v of g.vehicles) if (v.role === 'police') {
    const s = toMM(v.x, v.z);
    ctx.fillStyle = Math.floor(g.time * 6) % 2 ? '#4a7bff' : '#ff3a3a';
    ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
  }
  // shop blips (small green dollar-squares)
  for (const sh of g.city.shops || []) {
    const s = toMM(sh.doorX != null ? sh.doorX : sh.door.x, sh.doorZ != null ? sh.doorZ : sh.door.z);
    ctx.fillStyle = '#2ecc71'; ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
  }
  // hospital + garage
  const gs = toMM(g.city.garage.x, g.city.garage.z); ctx.fillStyle = '#5cf'; ctx.fillRect(gs.x - 3, gs.y - 3, 6, 6);
  const hs = toMM(g.city.hospital.x, g.city.hospital.z); ctx.fillStyle = '#f5a'; ctx.fillRect(hs.x - 3, hs.y - 3, 6, 6);
  // player arrow
  const ps = toMM(cx, cz);
  const hd = p.inVehicle ? p.inVehicle.heading : p.heading;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(ps.x + Math.cos(hd) * 6, ps.y + Math.sin(hd) * 6);
  ctx.lineTo(ps.x + Math.cos(hd + 2.5) * 5, ps.y + Math.sin(hd + 2.5) * 5);
  ctx.lineTo(ps.x + Math.cos(hd - 2.5) * 5, ps.y + Math.sin(hd - 2.5) * 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, mmSize, mmSize);

  // wanted stars (top-right)
  drawStars(ctx, VW - 5 * 22 - 16, 14, g.stars);

  // cash
  ctx.fillStyle = '#3d3'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'right';
  ctx.fillText('$' + g.cash, VW - 16, 40);

  // health bar (bottom-right)
  ctx.textAlign = 'left';
  drawVitals(ctx);

  // vehicle indicator + speed
  ctx.font = '12px monospace'; ctx.fillStyle = '#cde';
  if (g.player.inVehicle) {
    const v = g.player.inVehicle;
    const kmh = Math.abs(v.speed) * 7 | 0;
    ctx.fillText(v.type.toUpperCase() + '  ' + kmh + ' km/h', 12, VH - mmSize - 34);
  } else {
    ctx.fillText('ON FOOT', 12, VH - mmSize - 34);
  }

  // mission banner
  if (g.bannerTimer > 0 && g.banner) {
    ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(VW / 2 - 260, 60, 520, 30);
    ctx.fillStyle = '#ffd23a'; ctx.fillText(g.banner, VW / 2, 66);
  } else if (g.activeMission) {
    ctx.textAlign = 'center'; ctx.font = '14px monospace'; ctx.fillStyle = '#ffd23a';
    ctx.fillText(g.activeMission.objective, VW / 2, 12);
  }

  // radio / toast
  if (radioTimer > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#8cf'; ctx.font = '13px monospace'; ctx.fillText('♪ ' + radioName, VW / 2, VH - 24); }
  if (toastTimer > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.fillText(toast, VW / 2, 96); }

  ctx.textAlign = 'left'; ctx.restore();
}

function overlay(ctx, title, sub, col) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = col; ctx.font = 'bold 64px monospace'; ctx.fillText(title, VW / 2, VH / 2 - 60);
  ctx.fillStyle = '#eee'; ctx.font = '18px monospace';
  const lines = sub.split('\n');
  lines.forEach((l, i) => ctx.fillText(l, VW / 2, VH / 2 + 10 + i * 26));
  ctx.textAlign = 'left'; ctx.restore();
}

// ---- weather -------------------------------------------------------------
// A simple clear<->rain cycle. `wet` (0..1) ramps between states and is passed
// to the renderer (overcast sky/fog/light) and drives the 2D rain overlay.
const weather = { mode: 'clear', wet: 0, timer: 18, flash: 0, strikeCool: 8, reflash: 0, thunder: 0 };
const RAIN = Array.from({ length: 260 }, () => ({
  x: Math.random(), y: Math.random(), l: 0.5 + Math.random() * 0.6, s: 0.7 + Math.random() * 0.9,
}));
function updateWeather(dt) {
  weather.timer -= dt;
  if (weather.timer <= 0) {
    if (weather.mode === 'clear') { weather.mode = 'rain'; weather.timer = 14 + Math.random() * 16; toast = 'RAIN MOVING IN'; toastTimer = 2.5; }
    else { weather.mode = 'clear'; weather.timer = 22 + Math.random() * 28; toast = 'SKIES CLEARING'; toastTimer = 2.5; }
  }
  const target = weather.mode === 'rain' ? 1 : 0;
  weather.wet += (target - weather.wet) * Math.min(1, dt * 0.5);
  // lightning during heavier rain: a flash (with a quick second flicker) and
  // a rolling thunder clap a beat later.
  weather.flash = Math.max(0, weather.flash - dt * 4.0);
  if (weather.reflash > 0) { weather.reflash -= dt; if (weather.reflash <= 0) weather.flash = 0.85; }
  if (weather.wet > 0.55) {
    weather.strikeCool -= dt;
    if (weather.strikeCool <= 0) {
      weather.flash = 1; weather.reflash = 0.09;
      weather.strikeCool = 7 + Math.random() * 12;
      weather.thunder = 0.5 + Math.random() * 0.9;   // delay before the clap
    }
  }
  if (weather.thunder > 0) { weather.thunder -= dt; if (weather.thunder <= 0) { weather.thunder = 0; audio.event('thunder'); } }
}
function drawRain(ctx, wet, t) {
  if (wet < 0.03) return;
  const n = Math.floor(RAIN.length * wet), slant = 0.26;
  ctx.strokeStyle = 'rgba(190,205,230,' + (0.30 * wet).toFixed(3) + ')';
  ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const d = RAIN[i];
    const yy = ((d.y + t * d.s) % 1) * VH;
    const xx = (((d.x - t * d.s * slant * 0.35) % 1) + 1) % 1 * VW;
    const len = d.l * 26;
    ctx.moveTo(xx, yy); ctx.lineTo(xx - slant * len, yy + len);
  }
  ctx.stroke();
}

// ---- loop ----------------------------------------------------------------
let last = performance.now();
let fpsSmooth = 60, frames = 0, fpsAccum = 0, fpsShown = 60;

function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (!(dt > 0) || dt > 0.1) dt = 0.016;
  fpsAccum += dt; frames++;
  if (fpsAccum > 0.5) { fpsShown = Math.round(frames / fpsAccum); frames = 0; fpsAccum = 0; }

  const ctrl = input.frame(dt, !!game.player.inVehicle);
  // global toggles
  if (input.take('toggleView')) game.firstPerson = !game.firstPerson;
  if (input.take('mute')) { const m = audio.toggleMute(); toast = m ? 'MUTED' : 'SOUND ON'; toastTimer = 1.2; }
  if (input.take('radio')) { radioName = audio.toggleRadio(); radioTimer = 2; }

  if (state === 'title') {
    if (input.take('enter')) { state = 'play'; game.state = 'play'; audio.init(); audio.resume(); }
    // slow orbit camera on title
    game.camYaw += dt * 0.15;
  } else if (state === 'play') {
    game.step(ctrl);
    // handle events -> audio + toasts
    for (const ev of game.events) {
      audio.event(ev.type);
      if (ev.type === 'missionComplete') { audio.event('cash'); toast = 'MISSION PASSED  +$' + ev.cash; toastTimer = 3; }
      if (ev.type === 'wantedUp') { toast = 'WANTED LEVEL UP'; toastTimer = 1.5; }
      if (ev.type === 'respray') { audio.event('cash'); toast = 'RESPRAYED · WANTED CLEARED'; toastTimer = 2.5; }
      if (ev.type === 'enterShop') { toast = 'WELCOME TO ' + ev.name; toastTimer = 2.5; }
      if (ev.type === 'buy') { audio.event('cash'); toast = ev.label + ' BOUGHT'; toastTimer = 2.5; }
      if (ev.type === 'buyFail') { toast = ev.reason === 'cash' ? 'NOT ENOUGH CASH' : 'ALREADY MAXED OUT'; toastTimer = 2; }
    }
    if (game.state === 'busted') { state = 'busted'; downTimer = 2.5; audio.event('busted'); }
    else if (game.state === 'wasted') { state = 'wasted'; downTimer = 2.5; audio.event('wasted'); }
    else if (game.state === 'win') { state = 'win'; }
  } else if (state === 'busted' || state === 'wasted') {
    downTimer -= dt;
    if (downTimer <= 0 && input.take('enter')) { game.respawnAfterDown(); state = 'play'; }
    if (downTimer <= -0.01 && (input.keys['enter'])) { game.respawnAfterDown(); state = 'play'; }
  }

  // audio per-frame
  const drv = !!game.player.inVehicle;
  audio.update(dt, { driving: drv, speed: drv ? game.player.inVehicle.speed : 0, maxSpeed: drv ? game.player.inVehicle.maxSpeed : 20, stars: game.stars });
  audio.radioTick(dt);
  if (radioTimer > 0) radioTimer -= dt;
  if (toastTimer > 0) toastTimer -= dt;
  updateWeather(dt);

  // render 3D (WebGL) then the 2D HUD overlay on top
  const cam = computeCamera();
  if (game.inShop) {
    renderer.renderInterior({ eye: cam.eye, yaw: cam.yaw, pitch: cam.pitch, entities: buildEntities(), shop: game.inShop });
  } else {
    renderer.render({ city: game.city, eye: cam.eye, yaw: cam.yaw, pitch: cam.pitch, entities: buildEntities(), props: game.props, time: game.time, wet: weather.wet, flash: weather.flash });
  }
  const ctx = hudCtx;
  ctx.clearRect(0, 0, VW, VH);
  if (!game.inShop) drawRain(ctx, weather.wet, game.time);
  if (weather.flash > 0.01 && !game.inShop) { ctx.fillStyle = 'rgba(232,240,255,' + (weather.flash * 0.28).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }

  if (state === 'title') {
    overlay(ctx, 'GRAND THEFT MOORE', 'A software-3D crime sandbox\n\nPress ENTER to hit the streets', '#ffd23a');
  } else {
    drawHUD(ctx);
    if (state === 'busted') overlay(ctx, 'BUSTED', 'The cops got you.\nPress ENTER to continue', '#4a7bff');
    else if (state === 'wasted') overlay(ctx, 'WASTED', 'You died.\nPress ENTER to respawn at the hospital', '#c33');
    else if (state === 'win') overlay(ctx, 'CITY CLEARED', 'All missions complete. You own these streets.\nFree-roam continues.', '#3d3');
  }
  // fps
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px monospace'; ctx.textAlign = 'right';
  ctx.fillText(fpsShown + ' fps', VW - 8, VH - 14); ctx.textAlign = 'left';

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- test hook -----------------------------------------------------------
window.__gtm = {
  game, renderer, input,
  play() { state = 'play'; game.state = 'play'; },
  isPlaying() { return state === 'play'; },
  step(n, over) {
    const base = { dt: 0.033, forward: false, back: false, left: false, right: false, run: false, jump: false, camTurn: 0, camPitch: 0, enterExit: false, action: false };
    for (let i = 0; i < n; i++) game.step(Object.assign({}, base, over || {}));
  },
  setWet(w) { weather.mode = w > 0.5 ? 'rain' : 'clear'; weather.wet = w; weather.timer = 999; },
  strikeLightning() { weather.flash = 1; },
  renderOnce() {
    const cam = computeCamera();
    if (game.inShop) renderer.renderInterior({ eye: cam.eye, yaw: cam.yaw, pitch: cam.pitch, entities: buildEntities(), shop: game.inShop });
    else renderer.render({ city: game.city, eye: cam.eye, yaw: cam.yaw, pitch: cam.pitch, entities: buildEntities(), props: game.props, time: game.time, wet: weather.wet, flash: weather.flash });
    return true;
  },
  // teleport the player to the nearest shop door and enter it (test helper)
  enterNearestShop() {
    const p = game.player;
    let best = null, bd = 1e9;
    for (const s of game.city.shops) { const d = Math.hypot(s.doorX - p.x, s.doorZ - p.z); if (d < bd) { best = s; bd = d; } }
    if (!best) return false;
    p.x = best.doorX; p.z = best.doorZ; p.inVehicle = null;
    game.tryEnterExit();
    return !!game.inShop;
  },
  shops() { return game.city.shops; },
  buyHealth() { return game.inShop ? game._tryBuy() : false; },
  // analyze the GL framebuffer: distinct-ish colors + variance (to prove the
  // 3D actually drew, not a flat fill)
  frameStats() { return renderer.frameStats(); },
  spawnCarNextToPlayer(type = 'sedan') {
    const p = game.player;
    const v = new Vehicle(type, p.x + 1.5, p.z, 0, 1); v.role = 'parked'; v.occupant = null;
    game.vehicles.push(v); return v;
  },
  snapshot() {
    const p = game.player;
    return {
      state, x: p.x, z: p.z, health: p.health, cash: game.cash, stars: game.stars,
      heat: game.heat, inVehicle: !!p.inVehicle, inShop: game.inShop ? game.inShop.name : null,
      police: game.vehicles.filter(v => v.role === 'police').length,
      vehicles: game.vehicles.length, peds: game.peds.length,
      activeMission: game.activeMission ? game.activeMission.def.id : null,
    };
  },
  crime(p) { game.crime(p); },
  startMission(id) { return game.startMission(id); },
};
