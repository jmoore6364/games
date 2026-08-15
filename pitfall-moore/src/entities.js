// entities.js — procedural sprites and screen painting. No image assets.
import {
  W, H, HUD_H, GROUND_Y, GROUND_BOT, UG_FLOOR, LADDER_X,
  HOLES, TAR, QUICK, POND, CROC_HEADS, VINE, TREASURE_X, HAZARD_X,
  crocOpen, quickOpenAmount, vineTip, logPositions, scorpionX,
} from './world.js';

// ---------- background / screen ----------
export function drawScreen(ctx, screen, t) {
  // jungle backdrop
  ctx.fillStyle = '#2f8a36'; ctx.fillRect(0, HUD_H, W, GROUND_Y - HUD_H);
  // tree trunks
  ctx.fillStyle = '#4a3014';
  for (let k = 0; k < 5; k++) {
    const tx = 26 + k * 68 + ((screen.i * 29) % 17);
    ctx.fillRect(tx, 56, 12, GROUND_Y - 56);
    ctx.fillRect(tx - 5, 78 + (k % 3) * 16, 5, 4);
    ctx.fillRect(tx + 12, 66 + ((k + 1) % 3) * 18, 5, 4);
  }
  // canopy scallops
  ctx.fillStyle = '#155018'; ctx.fillRect(0, HUD_H, W, 26);
  ctx.fillStyle = '#1e6b24';
  for (let x = 0; x < W; x += 20) {
    ctx.fillRect(x, HUD_H, 20, 18 + ((x / 20) % 2) * 6);
  }
  // ground strip
  ctx.fillStyle = '#c8a050'; ctx.fillRect(0, GROUND_Y, W, GROUND_BOT - GROUND_Y);
  ctx.fillStyle = '#3fae3c'; ctx.fillRect(0, GROUND_Y, W, 3);
  ctx.fillStyle = '#a88338';
  for (let x = 6; x < W; x += 34) ctx.fillRect(x, GROUND_Y + 9, 12, 3);

  // underground corridor
  ctx.fillStyle = '#000'; ctx.fillRect(0, GROUND_BOT, W, H - GROUND_BOT);
  ctx.fillStyle = '#8a4014'; ctx.fillRect(0, UG_FLOOR, W, 10);
  ctx.fillStyle = '#5a2a0c';
  for (let x = 0; x < W; x += 22) {
    ctx.fillRect(x + (Math.floor(UG_FLOOR / 5) % 2 ? 0 : 11), UG_FLOOR, 2, 5);
    ctx.fillRect(x + 11, UG_FLOOR + 5, 2, 5);
  }
  ctx.fillStyle = '#301608'; ctx.fillRect(0, UG_FLOOR + 10, W, H - UG_FLOOR - 10);

  // underground wall
  if (screen.wall != null) drawBrickWall(ctx, screen.wall, GROUND_BOT, UG_FLOOR - GROUND_BOT);

  // feature cutouts in the ground strip
  const f = screen.feature;
  if (f === 'holes') {
    ctx.fillStyle = '#000';
    for (const h of HOLES) ctx.fillRect(h.x0, GROUND_Y, h.x1 - h.x0, GROUND_BOT - GROUND_Y);
  } else if (f === 'tar') {
    ctx.fillStyle = '#000'; ctx.fillRect(TAR.x0, GROUND_Y, TAR.x1 - TAR.x0, GROUND_BOT - GROUND_Y);
    ctx.fillStyle = '#181c22'; ctx.fillRect(TAR.x0, GROUND_Y + 2, TAR.x1 - TAR.x0, 6);
    const sh = 0.25 + 0.15 * Math.sin(t * 2);
    ctx.fillStyle = `rgba(120,140,170,${sh})`;
    ctx.fillRect(TAR.x0 + 14, GROUND_Y + 3, 24, 2); ctx.fillRect(TAR.x1 - 44, GROUND_Y + 4, 20, 2);
  } else if (f === 'quicksand') {
    const open = quickOpenAmount(t);
    const wHalf = ((QUICK.x1 - QUICK.x0) / 2) * open;
    const cx = (QUICK.x0 + QUICK.x1) / 2;
    if (open > 0.02) {
      ctx.fillStyle = '#6a5426';
      ctx.fillRect(cx - wHalf, GROUND_Y, wHalf * 2, GROUND_BOT - GROUND_Y);
      ctx.fillStyle = '#8a7036';
      ctx.fillRect(cx - wHalf, GROUND_Y + 2, wHalf * 2, 5);
    }
  } else if (f === 'crocs') {
    ctx.fillStyle = '#2444b0'; ctx.fillRect(POND.x0, GROUND_Y, POND.x1 - POND.x0, GROUND_BOT - GROUND_Y);
    ctx.fillStyle = '#3a5cd8'; ctx.fillRect(POND.x0, GROUND_Y + 2, POND.x1 - POND.x0, 4);
    const open = crocOpen(t);
    for (const c of CROC_HEADS) drawCroc(ctx, c.x0, GROUND_Y, c.x1 - c.x0, open);
  } else if (f === 'snake') {
    drawSnake(ctx, HAZARD_X, GROUND_Y, t);
  } else if (f === 'fire') {
    drawFire(ctx, HAZARD_X, GROUND_Y, t);
  }

  // vine over the tar pit
  if (f === 'tar') {
    const tip = vineTip(t);
    ctx.strokeStyle = '#7a5a22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(VINE.px, VINE.py); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    ctx.fillStyle = '#3f8a2c'; ctx.fillRect(tip.x - 3, tip.y - 3, 6, 6);
    ctx.fillStyle = '#2a6a1e'; ctx.fillRect(VINE.px - 4, HUD_H, 8, 10);
  }

  // ladder
  if (screen.ladder) {
    ctx.fillStyle = '#000'; ctx.fillRect(LADDER_X - 9, GROUND_Y, 18, GROUND_BOT - GROUND_Y);
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(LADDER_X - 8, GROUND_Y, 2, UG_FLOOR - GROUND_Y);
    ctx.fillRect(LADDER_X + 6, GROUND_Y, 2, UG_FLOOR - GROUND_Y);
    for (let y = GROUND_Y + 5; y < UG_FLOOR; y += 8) ctx.fillRect(LADDER_X - 8, y, 16, 2);
  }

  // rolling logs
  for (const l of logPositions(screen, t)) drawLog(ctx, l.x, l.y);

  // scorpion
  if (screen.scorpion) drawScorpion(ctx, scorpionX(screen, t), UG_FLOOR, t);
}

function drawBrickWall(ctx, x, y, h) {
  ctx.fillStyle = '#a04818'; ctx.fillRect(x - 8, y, 16, h);
  ctx.fillStyle = '#5a2a0c';
  for (let yy = y; yy < y + h; yy += 7) {
    ctx.fillRect(x - 8, yy, 16, 1);
    ctx.fillRect(x - 1 + ((Math.floor(yy / 7) % 2) ? -4 : 4), yy, 1, 7);
  }
}

// ---------- hazards ----------
export function drawCroc(ctx, x, groundY, w, open) {
  ctx.fillStyle = '#2a8a20';
  ctx.fillRect(x, groundY - 4, w, 8);          // head at waterline
  ctx.fillRect(x + w - 8, groundY - 7, 8, 4);  // snout ridge
  ctx.fillStyle = '#f0f0e0';
  if (open) {
    ctx.fillStyle = '#801818'; ctx.fillRect(x + 2, groundY - 2, w - 8, 5);
    ctx.fillStyle = '#f0f0e0';
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 3 + k * 5, groundY - 2, 2, 2);
  }
  ctx.fillStyle = '#000'; ctx.fillRect(x + w - 6, groundY - 6, 2, 2); // eye
}

export function drawSnake(ctx, x, groundY, t) {
  const sway = Math.sin(t * 5) * 1.5;
  ctx.fillStyle = '#c8c828';
  ctx.fillRect(x - 5, groundY - 6, 10, 6);
  ctx.fillRect(x - 2 + sway, groundY - 14, 5, 9);
  ctx.fillStyle = '#e0e040'; ctx.fillRect(x - 2 + sway, groundY - 17, 6, 4);
  ctx.fillStyle = '#000'; ctx.fillRect(x + 1 + sway, groundY - 16, 1, 1);
  ctx.fillStyle = '#e05050'; ctx.fillRect(x + 4 + sway, groundY - 15, 3, 1);
}

export function drawFire(ctx, x, groundY, t) {
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 8, groundY - 3, 16, 3);
  const f = Math.floor(t * 10) % 3;
  ctx.fillStyle = '#e86820';
  ctx.fillRect(x - 6, groundY - 12 + f, 4, 9 - f);
  ctx.fillRect(x - 1, groundY - 16 + (2 - f), 4, 13 - (2 - f));
  ctx.fillRect(x + 4, groundY - 11 + f, 3, 8 - f);
  ctx.fillStyle = '#f8c838';
  ctx.fillRect(x - 3, groundY - 9, 5, 6);
}

export function drawLog(ctx, x, y) {
  ctx.fillStyle = '#7a5222'; ctx.fillRect(x - 8, y - 1, 16, 8);
  ctx.fillStyle = '#5a3a14'; ctx.fillRect(x - 8, y - 1, 16, 2); ctx.fillRect(x - 8, y + 4, 16, 2);
  ctx.fillStyle = '#9a7038'; ctx.fillRect(x - 2, y + 1, 4, 3);
}

export function drawScorpion(ctx, x, floorY, t) {
  const leg = Math.floor(t * 8) % 2;
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(x - 6, floorY - 5, 12, 4);
  ctx.fillRect(x + 5, floorY - 9, 3, 5);       // tail up
  ctx.fillRect(x + 7, floorY - 11, 3, 3);      // stinger
  ctx.fillRect(x - 9, floorY - 6, 3, 3);       // claw
  ctx.fillStyle = '#b8b8c8';
  ctx.fillRect(x - 5 + leg, floorY - 1, 2, 1); ctx.fillRect(x + 1 - leg, floorY - 1, 2, 1);
}

// ---------- treasures ----------
export function drawTreasure(ctx, x, groundY, type, t) {
  const bob = Math.sin(t * 3) * 1.2;
  const y = groundY - 8 + bob;
  if (type === 'money') {
    ctx.fillStyle = '#d8b868'; ctx.fillRect(x - 5, y - 4, 10, 10);
    ctx.fillStyle = '#8a6a2a'; ctx.fillRect(x - 3, y - 6, 6, 3);
    ctx.fillStyle = '#3a5a2a'; ctx.fillRect(x - 1, y - 1, 2, 5);
  } else if (type === 'silver') {
    ctx.fillStyle = '#c0c8d8'; ctx.fillRect(x - 7, y, 14, 6);
    ctx.fillStyle = '#e8ecf4'; ctx.fillRect(x - 7, y, 14, 2);
  } else if (type === 'gold') {
    ctx.fillStyle = '#e8b820'; ctx.fillRect(x - 7, y, 14, 6);
    ctx.fillStyle = '#f8d858'; ctx.fillRect(x - 7, y, 14, 2);
  } else { // ring
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(x - 5, y - 2, 10, 3); ctx.fillRect(x - 5, y + 3, 10, 2);
    ctx.fillRect(x - 5, y - 2, 2, 7); ctx.fillRect(x + 3, y - 2, 2, 7);
    ctx.fillStyle = '#48d8e8'; ctx.fillRect(x - 2, y - 5, 4, 4);
  }
}

// ---------- Pitfall Moore himself ----------
// mode: 'run' | 'stand' | 'jump' | 'climb' | 'swing' | 'sink'
export function drawHarry(ctx, x, y, opts = {}) {
  const { mode = 'stand', frame = 0, facing = 1, flash = false } = opts;
  if (flash && Math.floor(performance.now() / 90) % 2) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));   // (x,y) = feet center
  if (facing < 0) ctx.scale(-1, 1);

  // bright shirt + dark pants so Harry pops against the jungle greens
  const skin = '#f0c088', shirt = '#e8e0c8', pants = '#2a3a8a', hat = '#c87828';
  const f2 = Math.floor(frame) % 2;

  if (mode === 'climb') {
    ctx.fillStyle = pants; ctx.fillRect(-4, -8, 8, 6);
    ctx.fillStyle = shirt; ctx.fillRect(-4, -15, 8, 7);
    ctx.fillStyle = skin;
    ctx.fillRect(-7, -14 - f2 * 4, 3, 5); ctx.fillRect(4, -18 + f2 * 4, 3, 5);
    ctx.fillRect(-3, -20, 6, 5);
    ctx.fillStyle = hat; ctx.fillRect(-4, -22, 8, 3);
    ctx.fillStyle = pants;
    ctx.fillRect(-4, -2 - f2 * 3, 3, 2 + f2 * 3); ctx.fillRect(1, -5 + f2 * 3, 3, 5 - f2 * 3);
  } else if (mode === 'swing') {
    ctx.fillStyle = skin; ctx.fillRect(-2, -22, 4, 6);      // arms up
    ctx.fillStyle = shirt; ctx.fillRect(-4, -16, 8, 8);
    ctx.fillStyle = skin; ctx.fillRect(-3, -21, 6, 5);
    ctx.fillStyle = hat; ctx.fillRect(-4, -22, 8, 3);
    ctx.fillStyle = pants; ctx.fillRect(-4, -8, 8, 5);
    ctx.fillStyle = pants; ctx.fillRect(-4, -3, 3, 3); ctx.fillRect(2, -4, 3, 4);
  } else if (mode === 'sink') {
    ctx.fillStyle = shirt; ctx.fillRect(-4, -8, 8, 5);
    ctx.fillStyle = skin; ctx.fillRect(-3, -13, 6, 5);
    ctx.fillStyle = hat; ctx.fillRect(-4, -15, 8, 3);
    ctx.fillStyle = skin; ctx.fillRect(-7, -14, 3, 4); ctx.fillRect(4, -14, 3, 4);
  } else {
    // legs
    ctx.fillStyle = pants;
    if (mode === 'run') {
      ctx.fillRect(-5 + f2 * 3, -6, 4, 6); ctx.fillRect(1 - f2 * 3, -6, 4, 6);
    } else if (mode === 'jump') {
      ctx.fillRect(-5, -7, 4, 5); ctx.fillRect(2, -5, 4, 5);
    } else {
      ctx.fillRect(-4, -6, 3, 6); ctx.fillRect(1, -6, 3, 6);
    }
    // torso
    ctx.fillStyle = shirt; ctx.fillRect(-4, -14, 8, 8);
    // arm
    ctx.fillStyle = skin;
    ctx.fillRect(2, -13 + (mode === 'run' ? f2 * 2 : 0), 3, 5);
    // head + hat
    ctx.fillStyle = skin; ctx.fillRect(-3, -19, 6, 5);
    ctx.fillStyle = hat; ctx.fillRect(-4, -21, 8, 3); ctx.fillRect(2, -20, 3, 2);
    ctx.fillStyle = '#000'; ctx.fillRect(1, -18, 1, 1);
  }
  ctx.restore();
}
