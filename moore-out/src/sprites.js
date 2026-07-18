// Procedural pixel-flavored art for Moore-Out!! All drawing is parametric so
// each opponent gets many expressive poses (idle, telegraphs, punches, hurt,
// dizzy, KO) from one rig. All original art.

function px(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function disc(c, x, y, r, col) {
  c.fillStyle = col;
  c.beginPath();
  c.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  c.fill();
}

// ---------------- ring & crowd ----------------

export function drawRing(c, frame) {
  // arena darkness + crowd
  px(c, 0, 0, 256, 100, '#101018');
  // crowd dots (deterministic scatter, slow flicker)
  for (let i = 0; i < 190; i++) {
    const x = (i * 37 + ((i * i) % 13) * 5) % 256;
    const y = 18 + ((i * 53) % 78);
    if (y > 96) continue;
    const tw = ((i * 7 + (frame >> 4)) % 11) === 0;
    const cols = ['#5a4a6a', '#6a5a4a', '#4a5a6a', '#6a4a4a', '#50606a'];
    c.fillStyle = tw ? '#c8c8d8' : cols[i % cols.length];
    c.fillRect(x, y, 2, 2);
  }
  // spotlights
  c.fillStyle = 'rgba(255,240,200,0.05)';
  c.beginPath(); c.moveTo(60, 0); c.lineTo(10, 100); c.lineTo(120, 100); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(196, 0); c.lineTo(136, 100); c.lineTo(246, 100); c.closePath(); c.fill();

  // mat
  px(c, 0, 100, 256, 140, '#3a7a52');
  px(c, 0, 100, 256, 4, '#2a5a3c');
  px(c, 24, 128, 208, 84, '#4a8a62');
  // MO logo on mat
  c.fillStyle = '#2a5a3c';
  c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
  c.fillText('MO', 128, 150);

  // corner posts
  px(c, 6, 60, 8, 60, '#284058');
  px(c, 242, 60, 8, 60, '#284058');
  px(c, 6, 58, 8, 5, '#d84040');
  px(c, 242, 58, 8, 5, '#4060d8');
  // back ropes
  for (let i = 0; i < 3; i++) {
    const y = 68 + i * 15;
    px(c, 10, y, 236, 3, ['#d84848', '#e8e8e8', '#4878e8'][i]);
    px(c, 10, y + 3, 236, 1, 'rgba(0,0,0,0.35)');
  }
}

// ---------------- opponent rig ----------------
// pose: { bob, leanX, leanY, armL, armR: {mode, t}, expr, headX, headY,
//         flashL, flashR, down, downT, sweat, tintWhite }
// arm modes: guard | low | back | up | windup | punchlow | dangle

function armPos(mode, t, side, cx, ty) {
  // returns [shoulderX, shoulderY, gloveX, gloveY, gr]
  const s = side; // -1 screen-left, +1 screen-right
  const sx = cx + s * 24, sy = ty + 10;
  const P = {
    guard: [cx + s * 17, ty + 26, 8],
    low: [cx + s * 27, ty + 48, 8],
    back: [cx + s * (34 + 14 * t), ty + 14 - 6 * t, 9],
    up: [cx + s * 24, ty - 26 - 8 * t, 9],
    windup: [cx + s * (10 + 26 * t), ty + 40 + 12 * t, 9],
    punchlow: [cx + s * 8, ty + 52, 9],
    dangle: [cx + s * 28, ty + 60, 8],
  };
  const [gx, gy, gr] = P[mode] || P.guard;
  return [sx, sy, gx, gy, gr];
}

function drawArm(c, cfg, mode, t, side, cx, ty, flash, frame) {
  const [sx, sy, gx, gy, gr] = armPos(mode, t || 0, side, cx, ty);
  // chunky limb: interpolated discs
  for (let i = 1; i <= 3; i++) {
    const k = i / 4;
    disc(c, sx + (gx - sx) * k, sy + (gy - sy) * k, 6.5 - k, cfg.skin);
  }
  const fl = flash && (frame % 6 < 3);
  disc(c, gx, gy, gr, fl ? '#f8f8f8' : cfg.gloves);
  disc(c, gx - 2, gy - 2, gr * 0.4, fl ? '#f8f8f8' : cfg.glovesHi);
}

function drawFace(c, cfg, hx, hy, expr, frame) {
  // hx,hy = head center. head is ~30 wide, 32 tall
  const hw = 15;
  // head base
  px(c, hx - hw, hy - 16, hw * 2, 30, cfg.skin);
  px(c, hx - hw + 2, hy + 10, hw * 2 - 4, 6, cfg.skinShade); // jaw shade
  // ears
  px(c, hx - hw - 3, hy - 2, 4, 8, cfg.skin);
  px(c, hx + hw - 1, hy - 2, 4, 8, cfg.skin);
  // hair
  if (cfg.hairstyle === 'flat') {
    px(c, hx - hw, hy - 20, hw * 2, 7, cfg.hair);
    px(c, hx - hw, hy - 16, 4, 8, cfg.hair);
    px(c, hx + hw - 4, hy - 16, 4, 8, cfg.hair);
  } else if (cfg.hairstyle === 'spike') {
    for (let i = 0; i < 5; i++) px(c, hx - hw + 2 + i * 6, hy - 22 - (i % 2) * 3, 4, 8, cfg.hair);
  } else if (cfg.hairstyle === 'slick') {
    px(c, hx - hw, hy - 19, hw * 2, 6, cfg.hair);
    px(c, hx + hw - 5, hy - 21, 6, 4, cfg.hair);
  } else if (cfg.hairstyle === 'crown') {
    px(c, hx - hw + 1, hy - 24, hw * 2 - 2, 8, '#f8d838');
    for (let i = 0; i < 4; i++) px(c, hx - hw + 2 + i * 8, hy - 29, 4, 6, '#f8d838');
    px(c, hx - 4, hy - 23, 4, 4, '#d84040');
  } else if (cfg.hairstyle === 'bald') {
    px(c, hx - hw, hy - 18, hw * 2, 4, cfg.skin);
  }

  const blink = expr === 'blink' || expr === 'hurt';
  const eyeY = hy - 6;
  const drawEye = (ex, closed, winkStar) => {
    if (closed) {
      px(c, ex - 3, eyeY + 2, 7, 2, '#101010');
    } else {
      px(c, ex - 3, eyeY, 7, 6, '#f8f8f8');
      const look = expr === 'angry' ? 0 : Math.sin(frame / 90) > 0.6 ? 1 : 0;
      px(c, ex - 1 + look, eyeY + 1, 3, 4, '#101010');
    }
    if (winkStar) {
      c.fillStyle = '#f8d838';
      c.font = '8px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('★', ex, eyeY - 8);
    }
  };

  if (expr === 'ko') {
    // X eyes
    c.strokeStyle = '#101010'; c.lineWidth = 2;
    for (const ex of [hx - 7, hx + 7]) {
      c.beginPath();
      c.moveTo(ex - 3, eyeY - 2); c.lineTo(ex + 3, eyeY + 4);
      c.moveTo(ex + 3, eyeY - 2); c.lineTo(ex - 3, eyeY + 4);
      c.stroke();
    }
  } else if (expr === 'dizzy') {
    drawEye(hx - 7, true); drawEye(hx + 7, true);
    // orbiting stars
    for (let i = 0; i < 3; i++) {
      const a = frame / 8 + i * 2.1;
      c.fillStyle = '#f8d838';
      c.font = '9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('★', hx + Math.cos(a) * 20, hy - 24 + Math.sin(a) * 5);
    }
  } else if (expr === 'wink') {
    drawEye(hx - 7, false); drawEye(hx + 7, true, true);
  } else {
    drawEye(hx - 7, blink); drawEye(hx + 7, blink);
  }

  // brows
  if (expr === 'angry' || expr === 'grin') {
    px(c, hx - 11, eyeY - 5, 8, 2, '#101010');
    px(c, hx + 3, eyeY - 5, 8, 2, '#101010');
    c.save(); c.translate(hx, eyeY - 4);
    c.restore();
  }

  // features
  if (cfg.feature === 'monocle') {
    c.strokeStyle = '#f8d838'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(hx + 7, eyeY + 2, 6, 0, Math.PI * 2); c.stroke();
    px(c, hx + 12, eyeY + 6, 1, 10, '#f8d838');
  } else if (cfg.feature === 'shades' && expr !== 'ko' && expr !== 'dizzy' && expr !== 'wink') {
    px(c, hx - 12, eyeY - 2, 24, 7, '#181828');
    px(c, hx - 12, eyeY - 2, 24, 2, '#3838a8');
  } else if (cfg.feature === 'shades' && expr === 'wink') {
    // shades pushed up for the wink — THE tell
    px(c, hx - 12, eyeY - 12, 24, 5, '#181828');
  }
  if (cfg.mustache) {
    px(c, hx - 8, hy + 4, 16, 3, cfg.hair);
    px(c, hx - 10, hy + 3, 3, 3, cfg.hair);
    px(c, hx + 7, hy + 3, 3, 3, cfg.hair);
  }

  // nose + mouth
  px(c, hx - 2, hy + 1, 4, 4, cfg.skinShade);
  const my = hy + 9;
  if (expr === 'grin' || expr === 'wink') {
    px(c, hx - 6, my, 12, 4, '#101010');
    px(c, hx - 5, my, 10, 2, '#f8f8f8');
  } else if (expr === 'hurt' || expr === 'dizzy') {
    px(c, hx - 4, my - 1, 8, 6, '#101010');
    px(c, hx - 3, my, 6, 4, '#a83030');
  } else if (expr === 'ko') {
    px(c, hx - 5, my + 1, 10, 2, '#101010');
  } else if (expr === 'angry') {
    px(c, hx - 6, my, 12, 3, '#101010');
  } else {
    px(c, hx - 5, my + 1, 10, 2, '#803030');
  }
}

export function drawOpponent(c, cfg, pose, frame) {
  const cx = 128 + (pose.leanX || 0);
  const feet = 206;

  if (pose.down) {
    // sprawled on the mat
    const t = Math.min(1, pose.downT || 1);
    const ly = 196 - 8 * Math.sin(t * Math.PI);
    px(c, cx - 40, ly, 80, 14, cfg.skin);
    px(c, cx - 14, ly - 2, 30, 16, cfg.trunks);
    disc(c, cx + 46, ly + 6, 12, cfg.skin);
    drawFace2Small(c, cfg, cx + 46, ly + 4);
    disc(c, cx - 52, ly + 8, 7, cfg.gloves);
    disc(c, cx + 20, ly + 16, 7, cfg.gloves);
    return;
  }

  const crouch = pose.leanY || 0;
  const bob = pose.bob || 0;
  const ty = 112 + crouch + bob; // torso top y
  const hx = cx + (pose.headX || 0);
  const hy = ty - 14 + (pose.headY || 0);

  // legs
  px(c, cx - 17, feet - 40 + crouch * 0.4, 13, 40 - crouch * 0.4, cfg.skinShade);
  px(c, cx + 4, feet - 40 + crouch * 0.4, 13, 40 - crouch * 0.4, cfg.skinShade);
  px(c, cx - 20, feet - 4, 18, 6, cfg.boots || '#282838');
  px(c, cx + 2, feet - 4, 18, 6, cfg.boots || '#282838');

  // trunks
  px(c, cx - 22, ty + 46 + crouch * 0.2, 44, 22, cfg.trunks);
  px(c, cx - 22, ty + 46 + crouch * 0.2, 44, 5, cfg.trunksAccent);

  // torso
  px(c, cx - 23, ty, 46, 50, cfg.skin);
  px(c, cx - 23, ty, 6, 50, cfg.skinShade);
  px(c, cx + 17, ty, 6, 50, cfg.skinShade);
  // pecs / belly line
  px(c, cx - 14, ty + 16, 12, 2, cfg.skinShade);
  px(c, cx + 2, ty + 16, 12, 2, cfg.skinShade);
  px(c, cx - 1, ty + 20, 2, 22, cfg.skinShade);
  if (cfg.feature === 'armor') {
    px(c, cx - 21, ty + 4, 42, 38, '#8890a0');
    px(c, cx - 21, ty + 4, 42, 4, '#b8c0d0');
    px(c, cx - 21, ty + 16, 42, 3, '#686f80');
    px(c, cx - 21, ty + 28, 42, 3, '#686f80');
    for (let i = 0; i < 4; i++) px(c, cx - 16 + i * 10, ty + 8, 3, 3, '#586070');
  }
  if (cfg.sash) {
    c.fillStyle = cfg.sash;
    c.beginPath();
    c.moveTo(cx - 23, ty + 2); c.lineTo(cx - 13, ty + 2);
    c.lineTo(cx + 23, ty + 44); c.lineTo(cx + 13, ty + 44);
    c.closePath(); c.fill();
  }

  // sweat drops when hurt/tired
  if (pose.sweat) {
    c.fillStyle = '#a8d8f8';
    for (let i = 0; i < 3; i++) {
      const sy2 = (frame * 2 + i * 23) % 40;
      px(c, hx - 24 + i * 24, hy - 12 + sy2, 2, 4, '#a8d8f8');
    }
  }

  // head
  drawFace(c, cfg, hx, hy, pose.expr || 'idle', frame);

  // arms over torso
  drawArm(c, cfg, pose.armL?.mode || 'guard', pose.armL?.t, -1, cx, ty, pose.flashL, frame);
  drawArm(c, cfg, pose.armR?.mode || 'guard', pose.armR?.t, 1, cx, ty, pose.flashR, frame);

  // stun / hit white flash overlay
  if (pose.tintWhite) {
    c.save();
    c.globalAlpha = 0.45;
    px(c, cx - 26, hy - 24, 52, feet - hy + 24, '#f8f8f8');
    c.restore();
  }
}

function drawFace2Small(c, cfg, x, y) {
  px(c, x - 4, y - 2, 8, 2, cfg.hair === cfg.skin ? '#101010' : cfg.hair);
  px(c, x - 5, y + 2, 3, 2, '#101010');
  px(c, x + 2, y + 2, 3, 2, '#101010');
  px(c, x - 3, y + 7, 6, 2, '#101010');
}

// incoming punch: big glove flying toward the camera
export function drawIncomingGlove(c, cfg, side, t, high, frame) {
  // t 0..1 across active frames
  const s = side === 'L' ? -1 : 1;
  const x0 = 128 + s * 22, y0 = 122;
  const x1 = 128 + s * 26, y1 = high ? 168 : 196;
  const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
  const r = 9 + t * 17;
  disc(c, x, y, r, cfg.gloves);
  disc(c, x - r * 0.3, y - r * 0.3, r * 0.4, cfg.glovesHi);
  px(c, x - r * 0.6, y + r * 0.5, r * 1.2, r * 0.4, cfg.glovesDark || 'rgba(0,0,0,0.3)');
}

// ---------------- player (Little Moore, seen from behind) ----------------
// p: { ox, oy, pose, t, tired, alpha, guardUp }

export function drawPlayer(c, p, frame) {
  const cx = 128 + (p.ox || 0);
  const base = 244 + (p.oy || 0);
  const skin = p.tired ? '#f8a8b8' : '#e8b088';
  const skinSh = p.tired ? '#d88898' : '#c08858';
  const glove = '#38b848';
  const gloveHi = '#78e888';
  const hair = '#181818';
  const singlet = p.tired ? '#7a3050' : '#203078';
  const singletHi = p.tired ? '#9a5070' : '#3048a8';
  const shorts = '#182058';

  c.save();
  c.globalAlpha = p.alpha ?? 0.9;

  if (p.pose === 'down') {
    // slumped on the mat, low in frame
    px(c, cx - 30, 214, 60, 12, singlet);
    px(c, cx - 30, 224, 60, 4, skin);
    px(c, cx - 10, 208, 20, 9, hair);
    disc(c, cx - 36, 222, 6, glove);
    disc(c, cx + 34, 220, 6, glove);
    c.restore();
    return;
  }

  const duckY = p.pose === 'duck' || p.pose === 'block' ? 16 : 0;
  const y = base + duckY;
  const lean = p.pose === 'dodgeL' ? -10 : p.pose === 'dodgeR' ? 10 : 0;

  // torso: green-trimmed singlet over skin shoulders
  px(c, cx - 22 + lean, y - 58, 44, 44, skin);
  px(c, cx - 22 + lean, y - 58, 44, 5, skinSh);
  px(c, cx - 17 + lean, y - 52, 34, 38, singlet);
  px(c, cx - 17 + lean, y - 52, 34, 4, singletHi);
  px(c, cx - 17 + lean, y - 52, 3, 38, singletHi);
  px(c, cx - 1 + lean, y - 48, 2, 30, '#141c48'); // seam
  // shorts hint at bottom edge
  px(c, cx - 22 + lean, y - 16, 44, 12, shorts);
  px(c, cx - 22 + lean, y - 16, 44, 3, '#48c858');
  // head (back of head)
  px(c, cx - 12 + lean * 1.4, y - 78, 24, 24, skin);
  px(c, cx - 12 + lean * 1.4, y - 80, 24, 14, hair);
  px(c, cx - 10 + lean * 1.4, y - 68, 20, 3, hair);

  // gloves
  const punchT = p.t || 0;
  const face = p.pose === 'faceL' || p.pose === 'faceR' || p.pose === 'star';
  const drawGlove = (side, punching) => {
    const s = side === 'L' ? -1 : 1;
    if (punching) {
      // thrust up toward opponent; shrinks as it goes "away"
      const gy = y - 62 - punchT * (face ? 78 : 52);
      const gx = cx + s * (18 - punchT * 8);
      const r = 10 - punchT * 3.5;
      disc(c, gx, gy, r, glove);
      disc(c, gx - 2, gy - 2, r * 0.4, gloveHi);
    } else if (p.pose === 'block' || p.guardUp) {
      disc(c, cx + s * 12 + lean, y - 72, 9, glove);
    } else {
      disc(c, cx + s * 26 + lean, y - 40, 9, glove);
      disc(c, cx + s * 26 - 2 + lean, y - 42, 3, gloveHi);
    }
  };
  const punchingL = p.pose === 'jabL' || p.pose === 'faceL' || (p.pose === 'star' && frame % 2 === 0);
  const punchingR = p.pose === 'jabR' || p.pose === 'faceR' || p.pose === 'star';
  drawGlove('L', punchingL);
  drawGlove('R', punchingR);

  c.restore();
}

// ---------------- referee Moore Mario ----------------

export function drawReferee(c, x, y, frame, counting) {
  // small guy: red M cap, white shirt, mustache
  px(c, x - 7, y - 30, 14, 8, '#d83030'); // cap
  px(c, x - 9, y - 24, 18, 2, '#d83030');
  c.fillStyle = '#f8f8f8'; c.font = 'bold 7px monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
  c.fillText('M', x, y - 30);
  px(c, x - 6, y - 22, 12, 10, '#e8b088'); // face
  px(c, x - 4, y - 19, 2, 2, '#101010');
  px(c, x + 2, y - 19, 2, 2, '#101010');
  px(c, x - 5, y - 15, 10, 3, '#403020'); // mustache
  px(c, x - 8, y - 12, 16, 16, '#f0f0f8'); // shirt
  px(c, x - 2, y - 12, 4, 3, '#181830'); // bow tie
  px(c, x - 8, y + 4, 7, 10, '#3040a0'); // slacks
  px(c, x + 1, y + 4, 7, 10, '#3040a0');
  // counting arm chops
  const chop = counting && (frame % 30 < 15);
  px(c, x + 7, y - 11, 4, chop ? 12 : 6, '#f0f0f8');
  disc(c, x + 9, y - 11 + (chop ? 12 : 6), 3, '#e8b088');
  px(c, x - 11, y - 11, 4, 8, '#f0f0f8');
}

// ---------------- corner trainer (Moore Louis) ----------------

export function drawTrainer(c, x, y) {
  px(c, x - 10, y - 34, 20, 6, '#282838'); // flat cap
  px(c, x - 8, y - 28, 16, 14, '#c89868'); // face
  px(c, x - 5, y - 24, 2, 2, '#101010');
  px(c, x + 3, y - 24, 2, 2, '#101010');
  px(c, x - 4, y - 18, 8, 2, '#101010');
  px(c, x - 11, y - 14, 22, 22, '#c8c8d0'); // sweater
  c.fillStyle = '#888898'; c.font = '6px monospace'; c.textAlign = 'center'; c.textBaseline = 'top';
  c.fillText('MOORE', x, y - 8);
  px(c, x - 13, y - 12, 4, 14, '#c8c8d0');
  px(c, x + 9, y - 12, 4, 14, '#c8c8d0');
  disc(c, x - 11, y + 4, 3, '#c89868');
  disc(c, x + 11, y + 4, 3, '#c89868');
}

// ---------------- portrait (VS card / career) ----------------

export function drawPortrait(c, cfg, x, y, scale, expr, frame) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  // shoulders
  px(c, -24, 14, 48, 18, cfg.skin);
  if (cfg.feature === 'armor') px(c, -24, 16, 48, 16, '#8890a0');
  if (cfg.sash) px(c, -24, 14, 12, 18, cfg.sash);
  drawFace(c, cfg, 0, 0, expr || 'angry', frame || 0);
  c.restore();
}

// ---------------- UI bits ----------------

export function drawStarIcon(c, x, y, on) {
  c.fillStyle = on ? '#f8d838' : '#3a3a4a';
  c.font = '10px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('★', x, y);
}

export function drawHeart(c, x, y, on) {
  const col = on ? '#f85878' : '#3a3a4a';
  px(c, x, y, 2, 2, col);
  px(c, x + 3, y, 2, 2, col);
  px(c, x, y + 1, 5, 2, col);
  px(c, x + 1, y + 3, 3, 1, col);
  px(c, x + 2, y + 4, 1, 1, col);
}

export function drawSpeechBubble(c, cx, cy, str) {
  c.font = '8px monospace';
  const w = Math.max(30, str.length * 5 + 10);
  const x = Math.max(4, Math.min(252 - w, cx - w / 2));
  c.fillStyle = '#f8f8f8';
  c.fillRect(x, cy - 14, w, 14);
  c.beginPath();
  c.moveTo(cx - 4, cy); c.lineTo(cx + 4, cy); c.lineTo(cx, cy + 6);
  c.closePath(); c.fill();
  c.fillStyle = '#101010';
  c.textAlign = 'center'; c.textBaseline = 'top';
  c.fillText(str, x + w / 2, cy - 11);
}
