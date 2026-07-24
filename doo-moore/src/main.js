// main.js — Doo-Moore: DOOM-style raycaster FPS. Orchestration, game loop,
// player, weapon viewmodel, HUD, and screens.
import { Raycaster } from './raycaster.js';
import { buildTextures } from './textures.js';
import { buildLevel, isSolid, tileAt } from './map.js';
import { Enemy, Fireball, lineOfSight } from './entities.js';
import { Audio } from './audio.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const wrap = document.getElementById('wrap');
const ray = new Raycaster(canvas);
const audio = new Audio();
const input = new Input(canvas);
let tex = null;

const DISP = { w: 640, h: 400 };
let quality = 0.55;           // internal-resolution scale (adaptive)
let frameAvg = 16;

const game = {
  state: 'title',            // title | play | dead | clear
  level: null,
  player: null,
  enemies: [],
  fireballs: [],
  pickups: [],
  kills: 0,
  time: 0,
  // weapon
  ammo: 24,
  fireCd: 0,
  recoil: 0,
  muzzle: 0,
  bob: 0,
  moving: false,
  // player feedback
  damageFlash: 0,
  shake: 0,
  pickupFlash: 0,
  face: 'idle',
  faceTimer: 0,
};

function newGame() {
  const lv = buildLevel();
  game.level = lv;
  game.player = { x: lv.player.x, y: lv.player.y, dir: lv.player.dir, health: 100 };
  game.enemies = lv.enemies.map(e => new Enemy(e.x, e.y));
  game.pickups = lv.pickups.map(p => ({ ...p, taken: false, bob: Math.random() * 6 }));
  game.fireballs = [];
  game.kills = 0;
  game.ammo = 24;
  game.fireCd = 0; game.recoil = 0; game.muzzle = 0; game.bob = 0;
  game.damageFlash = 0; game.shake = 0; game.pickupFlash = 0;
  game.face = 'idle'; game.faceTimer = 0;
  game.time = 0;
}

function startGame() {
  audio.ensure();
  audio.startAmbient();
  if (!game.level || game.state !== 'play') newGame();
  game.state = 'play';
}

// -------------------- input wiring --------------------
input.onFire = () => {
  if (game.state === 'title') { startGame(); return; }
  if (game.state === 'play') fire();
};
input.onUse = () => {
  if (game.state === 'play') useAction();
};
input.onRestart = () => {
  if (game.state === 'dead' || game.state === 'clear') { newGame(); game.state = 'play'; }
};
input.onMute = () => { audio.setMuted(!audio.muted); };

// -------------------- weapon / combat --------------------
function fire() {
  if (game.fireCd > 0) return;
  if (game.ammo <= 0) { audio.pistol(); game.fireCd = 0.25; return; } // click, no shot
  audio.ensure();
  game.ammo--;
  game.fireCd = 0.5;
  game.recoil = 1;
  game.muzzle = 0.08;
  audio.shotgun();
  // shotgun: several hitscan pellets with spread
  const pellets = 5;
  const p = game.player;
  for (let i = 0; i < pellets; i++) {
    const spread = (Math.random() - 0.5) * 0.16;
    const ang = p.dir + spread;
    hitscan(p.x, p.y, ang, 9);
  }
}

function hitscan(ox, oy, ang, dmg) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const maxR = 16;
  let best = null, bestT = Infinity;
  for (const e of game.enemies) {
    if (e.state === 'dead') continue;
    // project enemy onto ray
    const rx = e.x - ox, ry = e.y - oy;
    const t = rx * dx + ry * dy;
    if (t < 0 || t > maxR) continue;
    const px = ox + dx * t, py = oy + dy * t;
    const perp = Math.hypot(e.x - px, e.y - py);
    if (perp < 0.42 && t < bestT) {
      // ensure no wall between
      if (lineOfSight(game.level, ox, oy, e.x, e.y)) { best = e; bestT = t; }
    }
  }
  // also ensure a wall isn't closer than the enemy
  if (best) {
    const wallT = wallDist(ox, oy, dx, dy, maxR);
    if (wallT < bestT) best = null;
  }
  if (best) best.hurt(dmg, combatCtx());
}

function wallDist(ox, oy, dx, dy, maxR) {
  let t = 0;
  while (t < maxR) {
    t += 0.06;
    if (isSolid(game.level, Math.floor(ox + dx * t), Math.floor(oy + dy * t))) return t;
  }
  return maxR;
}

function combatCtx() {
  return {
    player: game.player, level: game.level, audio,
    spawnFireball: (x, y, dx, dy) => game.fireballs.push(new Fireball(x, y, dx, dy)),
    damagePlayer: (n) => damagePlayer(n),
    onKill: () => { game.kills++; },
  };
}

function damagePlayer(n) {
  if (game.state !== 'play') return;
  game.player.health -= n;
  game.damageFlash = Math.min(1, game.damageFlash + 0.6);
  game.shake = Math.min(8, game.shake + n * 0.4);
  audio.hurt();
  game.face = 'hurt'; game.faceTimer = 0.5;
  if (game.player.health <= 0) {
    game.player.health = 0;
    game.state = 'dead';
    game.face = 'dead';
    audio.death();
  }
}

function useAction() {
  const p = game.player;
  const dx = Math.cos(p.dir), dy = Math.sin(p.dir);
  for (let d = 0.4; d <= 1.6; d += 0.4) {
    const tx = Math.floor(p.x + dx * d), ty = Math.floor(p.y + dy * d);
    const t = tileAt(game.level, tx, ty);
    if (t === 5) { winLevel(); return; }
    if (t === 4) {
      const door = game.level.doors.get(tx + ',' + ty);
      if (door && door.target < 1) { door.target = 1; audio.door(); }
      return;
    }
    if (t > 0) return; // solid non-door blocks reach
  }
}

function winLevel() {
  game.state = 'clear';
  audio.levelClear();
}

// -------------------- update --------------------
function update(dt) {
  game.time += dt;
  const p = game.player;

  // timers
  if (game.fireCd > 0) game.fireCd -= dt;
  if (game.recoil > 0) game.recoil = Math.max(0, game.recoil - dt * 6);
  if (game.muzzle > 0) game.muzzle -= dt;
  if (game.damageFlash > 0) game.damageFlash = Math.max(0, game.damageFlash - dt * 1.6);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 20);
  if (game.pickupFlash > 0) game.pickupFlash = Math.max(0, game.pickupFlash - dt * 2);
  if (game.faceTimer > 0) { game.faceTimer -= dt; if (game.faceTimer <= 0 && game.state === 'play') game.face = 'idle'; }

  // turning (mouse + touch + keys)
  const lookD = input.consumeLook();
  p.dir += lookD * 0.0026;
  const turnSpeed = 2.6;
  if (input.keys['arrowleft']) p.dir -= turnSpeed * dt;
  if (input.keys['arrowright']) p.dir += turnSpeed * dt;

  // movement
  const dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
  const strafeX = -dirY, strafeY = dirX;
  let fwd = 0, str = 0;
  if (input.keys['w'] || input.keys['arrowup']) fwd += 1;
  if (input.keys['s'] || input.keys['arrowdown']) fwd -= 1;
  if (input.keys['d']) str += 1;
  if (input.keys['a']) str -= 1;
  // touch stick: y = forward (up negative), x = strafe
  fwd += -input.move.y;
  str += input.move.x;
  fwd = Math.max(-1, Math.min(1, fwd));
  str = Math.max(-1, Math.min(1, str));

  const speed = 3.1;
  let vx = (dirX * fwd + strafeX * str) * speed * dt;
  let vy = (dirY * fwd + strafeY * str) * speed * dt;
  game.moving = (Math.abs(fwd) + Math.abs(str)) > 0.05;

  const r = 0.22;
  if (!isSolid(game.level, Math.floor(p.x + vx + Math.sign(vx) * r), Math.floor(p.y))) p.x += vx;
  if (!isSolid(game.level, Math.floor(p.x), Math.floor(p.y + vy + Math.sign(vy) * r))) p.y += vy;

  // view bob
  if (game.moving) game.bob += dt * 9; else game.bob += dt * 2;

  // hold-to-fire (desktop LMB / touch fire)
  if (input.firePressed) fire();

  // doors
  for (const door of game.level.doors.values()) {
    if (door.open < door.target) door.open = Math.min(door.target, door.open + dt * 1.6);
    else if (door.open > door.target) door.open = Math.max(door.target, door.open - dt * 1.6);
  }

  // enemies
  const ctx = combatCtx();
  for (const e of game.enemies) e.update(dt, ctx);

  // fireballs
  for (const f of game.fireballs) f.update(dt, ctx);
  game.fireballs = game.fireballs.filter(f => !f.dead);

  // pickups
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 0.5) {
      if (pk.kind === 'health') {
        if (p.health >= 100) continue;
        p.health = Math.min(100, p.health + 25);
      } else {
        game.ammo += 8;
      }
      pk.taken = true;
      game.pickupFlash = 0.6;
      audio.pickup();
    }
  }
}

// -------------------- render --------------------
function buildSprites() {
  const sprites = [];
  for (const e of game.enemies) {
    sprites.push({
      x: e.x, y: e.y, frame: e.sprite(tex), ground: true,
      scale: e.state === 'dead' ? 0.55 : 0.82,
      tint: e.hitTimer > 0 ? 0.55 : 0,
    });
  }
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    sprites.push({ x: pk.x, y: pk.y, frame: tex.pickups[pk.kind], ground: true, scale: 0.42 });
  }
  for (const f of game.fireballs) {
    sprites.push({ x: f.x, y: f.y, frame: tex.fireball, ground: false, scale: 0.4 });
  }
  return sprites;
}

function render() {
  const w = DISP.w, h = DISP.h;
  const ctx = ray.ctx;

  if (game.level) {
    const pitch = (game.state === 'play')
      ? (Math.sin(game.bob) * (game.moving ? 4 : 1.5)) + (Math.random() - 0.5) * game.shake
      : 0;
    const rh = ray.RH;
    const pPitch = pitch * (rh / h);
    ray.renderWorld(game.player, game.level, tex, pPitch);
    ray.renderSprites(game.player, buildSprites(), pPitch);
    ray.blit(w, h);
  } else {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  }

  if (game.state === 'play' || game.state === 'dead') {
    drawWeapon(ctx, w, h);
    drawHUD(ctx, w, h);
  }

  // damage / pickup full-screen flashes
  if (game.damageFlash > 0) {
    ctx.fillStyle = `rgba(150,0,0,${game.damageFlash * 0.45})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (game.pickupFlash > 0) {
    ctx.fillStyle = `rgba(200,220,120,${game.pickupFlash * 0.18})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (game.state === 'title') drawTitle(ctx, w, h);
  if (game.state === 'dead') drawGameOver(ctx, w, h);
  if (game.state === 'clear') drawClear(ctx, w, h);
}

// ---- weapon viewmodel: "Moore Shotgun" (double barrel) ----
function drawWeapon(ctx, w, h) {
  const cx = w / 2;
  const bobX = Math.sin(game.bob) * (game.moving ? 10 : 3);
  const bobY = Math.abs(Math.cos(game.bob)) * (game.moving ? 10 : 3);
  const recoilY = game.recoil * 34;
  const scale = h / 400;
  const gx = cx + bobX;
  const gy = h + recoilY + bobY;

  ctx.save();
  ctx.translate(gx, gy);
  ctx.scale(scale, scale);

  // muzzle flash (behind barrels visually, above)
  if (game.muzzle > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.muzzle / 0.08);
    ctx.translate(0, -196);
    ctx.fillStyle = '#fff6c0';
    star(ctx, 0, 0, 46, 20, 8);
    ctx.fillStyle = '#ffb020';
    star(ctx, 0, 0, 30, 12, 8);
    ctx.restore();
  }

  // hands
  ctx.fillStyle = '#7a5236';
  ctx.beginPath(); ctx.roundRect(-70, -70, 46, 90, 12); ctx.fill();
  ctx.beginPath(); ctx.roundRect(24, -70, 46, 90, 12); ctx.fill();
  ctx.fillStyle = '#5f3f28';
  ctx.beginPath(); ctx.roundRect(-66, -66, 12, 60, 6); ctx.fill();
  ctx.beginPath(); ctx.roundRect(54, -66, 12, 60, 6); ctx.fill();

  // stock/body
  ctx.fillStyle = '#3a3f47';
  ctx.beginPath(); ctx.roundRect(-40, -120, 80, 120, 10); ctx.fill();
  ctx.fillStyle = '#2a2e34';
  ctx.beginPath(); ctx.roundRect(-40, -20, 80, 26, 8); ctx.fill();
  // barrels
  ctx.fillStyle = '#1f2227';
  ctx.beginPath(); ctx.roundRect(-30, -200, 24, 90, 6); ctx.fill();
  ctx.beginPath(); ctx.roundRect(6, -200, 24, 90, 6); ctx.fill();
  ctx.fillStyle = '#0c0e11';
  ctx.beginPath(); ctx.ellipse(-18, -200, 11, 6, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(18, -200, 11, 6, 0, 0, 7); ctx.fill();
  // highlight
  ctx.fillStyle = 'rgba(120,200,220,0.18)';
  ctx.fillRect(-28, -196, 4, 84); ctx.fillRect(8, -196, 4, 84);
  // little Moore "M" plate
  ctx.fillStyle = '#c8a030';
  ctx.beginPath(); ctx.roundRect(-16, -96, 32, 22, 4); ctx.fill();
  ctx.fillStyle = '#20130a'; ctx.font = 'bold 20px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('M', 0, -84);

  ctx.restore();
}

function star(ctx, cx, cy, rO, rI, pts) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 ? rI : rO;
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
}

// ---- HUD ----
function drawHUD(ctx, w, h) {
  const barH = Math.max(46, h * 0.13);
  const y = h - barH;
  // panel
  const grad = ctx.createLinearGradient(0, y, 0, h);
  grad.addColorStop(0, '#2a2622'); grad.addColorStop(1, '#15120f');
  ctx.fillStyle = grad; ctx.fillRect(0, y, w, barH);
  ctx.fillStyle = '#0a0806'; ctx.fillRect(0, y, w, 3);
  ctx.strokeStyle = '#453b30'; ctx.lineWidth = 1;
  ctx.strokeRect(0, y + 3, w, barH - 3);

  const p = game.player;
  const cy = y + barH / 2;
  const fs = Math.max(16, barH * 0.42);
  ctx.textBaseline = 'middle';

  // HEALTH (left)
  ctx.textAlign = 'left';
  ctx.font = `bold ${fs * 0.5}px "Courier New", monospace`;
  ctx.fillStyle = '#8a7f6f'; ctx.fillText('HEALTH', 16, y + barH * 0.28);
  ctx.font = `bold ${fs}px "Courier New", monospace`;
  ctx.fillStyle = p.health > 40 ? '#ff5533' : (Math.floor(game.time * 4) % 2 ? '#ff2010' : '#801008');
  ctx.fillText(Math.ceil(p.health) + '%', 16, y + barH * 0.66);

  // AMMO (right)
  ctx.textAlign = 'right';
  ctx.font = `bold ${fs * 0.5}px "Courier New", monospace`;
  ctx.fillStyle = '#8a7f6f'; ctx.fillText('AMMO', w - 16, y + barH * 0.28);
  ctx.font = `bold ${fs}px "Courier New", monospace`;
  ctx.fillStyle = game.ammo > 0 ? '#e8c040' : '#803010';
  ctx.fillText(String(game.ammo), w - 16, y + barH * 0.66);

  // KILLS (right-inner)
  ctx.textAlign = 'right';
  ctx.font = `bold ${fs * 0.5}px "Courier New", monospace`;
  ctx.fillStyle = '#8a7f6f'; ctx.fillText('KILLS', w - 120, y + barH * 0.28);
  ctx.font = `bold ${fs}px "Courier New", monospace`;
  ctx.fillStyle = '#c8d0d8'; ctx.fillText(String(game.kills), w - 120, y + barH * 0.66);

  // FACE (center)
  drawFace(ctx, w / 2, cy, barH * 0.42, p.health);
}

function drawFace(ctx, cx, cy, r, health) {
  ctx.save();
  ctx.translate(cx, cy);
  // frame
  ctx.fillStyle = '#0a0806'; ctx.fillRect(-r - 6, -r - 6, (r + 6) * 2, (r + 6) * 2);
  // head
  ctx.fillStyle = health <= 0 ? '#6a5a4a' : '#d9a066';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2; ctx.stroke();
  // hair
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.95, Math.PI, 0); ctx.fill();
  const hurt = game.face === 'hurt' || health < 40;
  const dead = health <= 0;
  // eyes
  ctx.fillStyle = '#fff';
  const ex = r * 0.42, ey = -r * 0.05, es = r * 0.22;
  ctx.beginPath(); ctx.arc(-ex, ey, es, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ex, ey, es, 0, 7); ctx.fill();
  ctx.fillStyle = dead ? '#a00' : '#201008';
  if (dead) {
    ctx.font = `bold ${r}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('x', -ex, ey); ctx.fillText('x', ex, ey);
  } else {
    const look = Math.sin(game.time * 2) * es * 0.4;
    ctx.beginPath(); ctx.arc(-ex + look, ey, es * 0.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + look, ey, es * 0.5, 0, 7); ctx.fill();
  }
  // brow
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  if (hurt) { ctx.moveTo(-ex - es, ey - es * 0.9); ctx.lineTo(-ex + es, ey - es * 1.4); ctx.moveTo(ex - es, ey - es * 1.4); ctx.lineTo(ex + es, ey - es * 0.9); }
  else { ctx.moveTo(-ex - es, ey - es * 1.1); ctx.lineTo(-ex + es, ey - es * 1.1); ctx.moveTo(ex - es, ey - es * 1.1); ctx.lineTo(ex + es, ey - es * 1.1); }
  ctx.stroke();
  // mouth / mustache
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(-r * 0.4, r * 0.28, r * 0.8, r * 0.16);
  ctx.strokeStyle = '#5a1a10'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  ctx.beginPath();
  if (dead) { ctx.moveTo(-r * 0.3, r * 0.62); ctx.lineTo(r * 0.3, r * 0.62); }
  else if (hurt) { ctx.arc(0, r * 0.72, r * 0.3, Math.PI * 1.15, Math.PI * 1.85); }
  else { ctx.arc(0, r * 0.45, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); }
  ctx.stroke();
  ctx.restore();
}

// ---- screens ----
function centerText(ctx, txt, x, y, size, color, glow) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${size}px "Courier New", monospace`;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size * 0.4; }
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
  ctx.shadowBlur = 0;
}

function drawTitle(ctx, w, h) {
  ctx.fillStyle = 'rgba(6,3,2,0.55)'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const s = Math.min(w / 9, h / 5);
  // title with a hellish gradient
  const g = ctx.createLinearGradient(0, h * 0.22, 0, h * 0.42);
  g.addColorStop(0, '#ffd23a'); g.addColorStop(0.5, '#ff5a1a'); g.addColorStop(1, '#a01008');
  ctx.save();
  ctx.font = `bold ${s}px "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#1a0604';
  ctx.strokeText('DOO-MOORE', cx, h * 0.30);
  ctx.shadowColor = '#ff3000'; ctx.shadowBlur = 24;
  ctx.fillStyle = g; ctx.fillText('DOO-MOORE', cx, h * 0.30);
  ctx.restore();
  centerText(ctx, 'RIP AND TEAR THROUGH THE MOORE ARCADE', cx, h * 0.46, Math.max(12, s * 0.16), '#e8c8a0');
  if (Math.floor(game.time * 2) % 2) {
    centerText(ctx, 'CLICK or PRESS SPACE to ENTER', cx, h * 0.66, Math.max(14, s * 0.2), '#ffd23a', '#ff5000');
  }
  centerText(ctx, 'WASD move · mouse/←→ look · SPACE fire · E use · R restart', cx, h * 0.82, Math.max(10, s * 0.12), '#9a8a70');
}

function drawGameOver(ctx, w, h) {
  ctx.fillStyle = 'rgba(60,0,0,0.5)'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, s = Math.min(w / 8, h / 4);
  centerText(ctx, 'YOU DIED', cx, h * 0.4, s, '#ff2010', '#800000');
  centerText(ctx, `KILLS: ${game.kills}`, cx, h * 0.55, s * 0.28, '#e8c8a0');
  if (Math.floor(game.time * 2) % 2)
    centerText(ctx, 'PRESS R TO RESTART', cx, h * 0.68, s * 0.3, '#ffd23a', '#ff5000');
}

function drawClear(ctx, w, h) {
  ctx.fillStyle = 'rgba(0,30,10,0.55)'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, s = Math.min(w / 8, h / 4);
  centerText(ctx, 'LEVEL CLEAR', cx, h * 0.38, s, '#26ff86', '#0a6030');
  const total = game.enemies.length;
  centerText(ctx, `DEMONS SLAIN: ${game.kills} / ${total}`, cx, h * 0.55, s * 0.26, '#c8ffd8');
  if (Math.floor(game.time * 2) % 2)
    centerText(ctx, 'PRESS R FOR ANOTHER ROUND', cx, h * 0.7, s * 0.28, '#ffd23a', '#ff5000');
}

// -------------------- resize / loop --------------------
function resize() {
  let cw = wrap.clientWidth || window.innerWidth;
  let ch = wrap.clientHeight || window.innerHeight;
  const cap = 1280;
  let scaleDown = 1;
  if (cw > cap) scaleDown = cap / cw;
  DISP.w = Math.max(320, Math.floor(cw * scaleDown));
  DISP.h = Math.max(200, Math.floor(ch * scaleDown));
  canvas.width = DISP.w; canvas.height = DISP.h;
  applyQuality();
}

function applyQuality() {
  let rw = Math.floor(DISP.w * quality);
  const maxCols = 480, minCols = 200;
  rw = Math.max(minCols, Math.min(maxCols, rw));
  const rh = Math.floor(rw * DISP.h / DISP.w);
  ray.resize(rw, rh);
}

let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  frameAvg = frameAvg * 0.9 + (dt * 1000) * 0.1;

  if (game.state === 'play') update(dt);
  else game.time += dt; // keep animations/blink alive on menus

  render();

  // adaptive resolution
  if (frameAvg > 26 && quality > 0.35) { quality -= 0.02; applyQuality(); }
  else if (frameAvg < 15 && quality < 0.85) { quality += 0.01; applyQuality(); }

  requestAnimationFrame(loop);
}

// -------------------- boot --------------------
function boot() {
  tex = buildTextures();
  newGame();
  game.state = 'title';
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
}

// test hook
window.__doo = {
  start() { startGame(); },
  restart() { newGame(); game.state = 'play'; },
  fire() { fire(); },
  get state() { return game.state; },
  get health() { return game.player ? game.player.health : 0; },
  get ammo() { return game.ammo; },
  get kills() { return game.kills; },
  get enemies() { return game.enemies.length; },
  _game: game,
};

boot();
