// Stage definitions, arena trigger data and parallax backdrops.

export const VIEW_W = 320;
export const VIEW_H = 224;
export const GROUND_TOP = 148; // top of the walkable ground band (horizon)
export const GROUND_BOT = 210; // bottom of the walkable ground band

// spawn shorthand: t type, v palette variant, side -1 left / 1 right
const g = (v, side) => ({ t: 'grunt', v, side });
const sk = (v, side) => ({ t: 'skel', v, side });
const br = (v, side) => ({ t: 'brute', v, side });
const th = (side) => ({ t: 'thief', side });
const rider = (v, side) => ({ t: 'grunt', v, side, beast: true });

export const STAGES = [
  {
    name: 'STAGE 1', title: 'FIRWOOD VILLAGE', key: 'village', width: 1280, music: 'field',
    story: ['The village burns behind you.', 'Death Moore\'s raiders drag the', 'king\'s crown toward the sea.', '', 'Take the road. Take it back.'],
    triggers: [
      { x: 130, waves: [[g(0, 1), g(0, 1)], [g(0, -1), g(0, 1), th(1)]] },
      { x: 430, waves: [[g(0, 1), g(1, -1)], [sk(0, 1), g(1, 1)]] },
      { x: 710, waves: [[br(0, 1), g(0, -1)], [g(1, 1), g(1, -1), th(-1)]] },
      { x: 960, name: 'THE IRON BROTHERS', waves: [[br(0, 1), br(1, -1)]] },
    ],
  },
  {
    name: 'STAGE 2', title: 'TURTLE BEACH', key: 'beach', width: 1440, music: 'field',
    story: ['Across the shell-white sands,', 'the raiders ride tamed beasts.', '', 'Knock a rider from his mount', 'and the beast is yours.'],
    triggers: [
      { x: 150, waves: [[rider(1, 1), g(0, -1)]] },
      { x: 470, waves: [[sk(0, 1), sk(0, -1), th(1)], [g(1, 1), g(1, -1), g(0, 1)]] },
      { x: 800, waves: [[br(1, 1), sk(0, -1)], [g(2, 1), g(2, -1)]] },
      { x: 1120, name: 'THE BONE LORDS', waves: [[sk(1, 1), sk(1, -1), br(0, 1)]] },
    ],
  },
  {
    name: 'NIGHT CAMP', title: 'THIEVES IN THE DARK', key: 'camp', width: 320, music: 'camp',
    bonus: true, time: 780,
    story: ['You make camp for the night.', 'Little thieves creep in from', 'the dark, sacks full of magic.', '', 'Kick them. Take everything.'],
    triggers: [],
  },
  {
    name: 'STAGE 3', title: 'CASTLE APPROACH', key: 'castle', width: 1440, music: 'dark',
    story: ['The dead walk the causeway', 'to Death Moore\'s keep.', '', 'The gate is held by wardens', 'who have never lost.'],
    triggers: [
      { x: 160, waves: [[sk(0, 1), g(2, -1)], [sk(0, 1), sk(0, -1)]] },
      { x: 520, waves: [[br(0, 1), g(2, -1), th(1)], [g(2, 1), g(2, -1), sk(0, 1)]] },
      { x: 840, waves: [[sk(1, 1), sk(1, -1), g(2, 1)]] },
      { x: 1120, name: 'THE GATE WARDENS', waves: [[br(1, 1), br(1, -1), sk(1, 1)]] },
    ],
  },
  {
    name: 'FINAL STAGE', title: 'THE THRONE OF BONES', key: 'throne', width: 960, music: 'dark',
    story: ['The stolen crown sits on a', 'helm of black iron.', '', 'Death Moore rises from the', 'throne. He is very large.'],
    triggers: [
      { x: 160, waves: [[sk(1, 1), sk(1, -1)], [g(2, 1), g(2, -1), g(1, 1)]] },
      { x: 420, waves: [[br(0, 1), br(1, -1), th(-1)]] },
      { x: 640, name: 'DEATH MOORE', boss: true, waves: [[{ t: 'boss', side: 1 }]] },
    ],
  },
];

export const ENDING = [
  'The black helm splits. The crown',
  'rolls free across the stones.',
  '',
  'Moore the Golden lifts it high,',
  'and dawn comes up over the sea',
  'like a struck gong.',
  '',
  'The beasts run wild again.',
  'The thieves keep their potions.',
  'The land keeps its king.',
];

// ---------------- parallax backdrops ----------------
// Each backdrop paints 0..GROUND_TOP; drawGround paints the play band.

function skyBands(ctx, bands) {
  let y = 0;
  for (const [h, c] of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(0, y, VIEW_W, h);
    y += h;
  }
}

// repeating parallax helper: calls fn(screenX, i) for each visible repeat
function repeatX(camX, factor, span, fn) {
  const off = (camX * factor) % span;
  for (let sx = -off - span; sx < VIEW_W + span; sx += span) {
    const i = Math.round((sx + off) / span);
    fn(sx, i);
  }
}

export function drawBackdrop(ctx, key, camX, frame) {
  if (key === 'village') {
    skyBands(ctx, [[50, '#68b0f0'], [40, '#8cc8f8'], [58, '#b4e0f8']]);
    // clouds
    ctx.fillStyle = '#f0f8ff';
    repeatX(camX, 0.08, 130, (sx, i) => {
      const yy = 18 + ((i * 37) % 30);
      ctx.fillRect(sx + 10, yy, 34, 7);
      ctx.fillRect(sx + 18, yy - 4, 20, 5);
    });
    // far mountains
    repeatX(camX, 0.18, 160, (sx, i) => {
      ctx.fillStyle = '#5878a8';
      const h = 34 + ((i * 23) % 18);
      ctx.beginPath();
      ctx.moveTo(sx, 118);
      ctx.lineTo(sx + 80, 118 - h);
      ctx.lineTo(sx + 160, 118);
      ctx.fill();
    });
    ctx.fillStyle = '#88a8c8';
    ctx.fillRect(0, 116, VIEW_W, 6);
    // tree line
    ctx.fillStyle = '#2c6838';
    repeatX(camX, 0.35, 26, (sx, i) => {
      const h = 14 + ((i * 11) % 8);
      ctx.fillRect(sx + 3, 122 - h, 20, h + 4);
    });
    ctx.fillStyle = '#1f5028';
    ctx.fillRect(0, 124, VIEW_W, 6);
    // village huts
    repeatX(camX, 0.6, 120, (sx, i) => {
      const burnt = i % 3 === 0;
      ctx.fillStyle = burnt ? '#584838' : '#d8b070';
      ctx.fillRect(sx + 14, 112, 52, 34);
      ctx.fillStyle = burnt ? '#382820' : '#8a5c20';
      ctx.fillRect(sx + 8, 104, 64, 10);
      ctx.fillRect(sx + 16, 98, 48, 8);
      ctx.fillStyle = '#402808';
      ctx.fillRect(sx + 34, 126, 12, 20);
      if (burnt && (frame >> 3) % 2) {
        ctx.fillStyle = '#f88030';
        ctx.fillRect(sx + 20 + ((frame >> 2) % 6), 100, 4, 6);
      }
    });
  } else if (key === 'beach') {
    skyBands(ctx, [[34, '#f8c868'], [30, '#f8a050'], [26, '#e87848'], [10, '#c85838']]);
    // low sun
    ctx.fillStyle = '#f8f0c0';
    ctx.beginPath(); ctx.arc(230 - camX * 0.02, 82, 20, 0, Math.PI * 2); ctx.fill();
    // sea
    ctx.fillStyle = '#2868b8';
    ctx.fillRect(0, 100, VIEW_W, 48);
    ctx.fillStyle = '#3880d0';
    ctx.fillRect(0, 100, VIEW_W, 8);
    // the great turtle, far out on the water
    const tx = 200 - (camX * 0.12) % 600;
    ctx.fillStyle = '#1c4058';
    ctx.beginPath(); ctx.ellipse(tx, 108, 46, 14, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(tx + 42, 100, 14, 8);
    // waves
    ctx.fillStyle = '#a8d8f0';
    for (let i = 0; i < 10; i++) {
      const wx = (i * 53 - camX * 0.25 + frame * 0.4) % (VIEW_W + 40) - 20;
      ctx.fillRect(wx, 112 + (i % 4) * 8, 22, 2);
    }
    // palms
    repeatX(camX, 0.5, 150, (sx) => {
      ctx.fillStyle = '#7a4a20';
      ctx.fillRect(sx + 60, 112, 5, 34);
      ctx.fillRect(sx + 62, 106, 4, 8);
      ctx.fillStyle = '#2c8838';
      ctx.fillRect(sx + 48, 100, 34, 6);
      ctx.fillRect(sx + 54, 94, 22, 6);
      ctx.fillRect(sx + 44, 106, 12, 4);
      ctx.fillRect(sx + 74, 106, 12, 4);
    });
  } else if (key === 'castle') {
    skyBands(ctx, [[40, '#403060'], [36, '#604880'], [34, '#906090'], [38, '#b87888']]);
    // stars in the upper dark
    ctx.fillStyle = '#e8e0f0';
    for (let i = 0; i < 12; i++) {
      if ((i + (frame >> 5)) % 4 === 0) continue;
      ctx.fillRect((i * 61 + 13) % VIEW_W, (i * 29) % 44, 2, 2);
    }
    // the keep, far off
    repeatX(camX, 0.12, 420, (sx) => {
      ctx.fillStyle = '#282044';
      ctx.fillRect(sx + 120, 62, 90, 86);
      ctx.fillRect(sx + 104, 78, 20, 70);
      ctx.fillRect(sx + 206, 78, 20, 70);
      ctx.fillRect(sx + 112, 70, 6, 10);
      ctx.fillRect(sx + 214, 70, 6, 10);
      ctx.fillRect(sx + 150, 40, 30, 24);
      ctx.fillStyle = '#f8d040';
      ctx.fillRect(sx + 136, 90, 4, 6);
      ctx.fillRect(sx + 168, 104, 4, 6);
      ctx.fillRect(sx + 190, 82, 4, 6);
    });
    // causeway parapet
    ctx.fillStyle = '#565e78';
    ctx.fillRect(0, 128, VIEW_W, 20);
    repeatX(camX, 0.55, 40, (sx) => {
      ctx.fillStyle = '#565e78';
      ctx.fillRect(sx + 4, 120, 14, 10);
      ctx.fillStyle = '#3c4258';
      ctx.fillRect(sx + 4, 128, 14, 2);
    });
    // torches
    repeatX(camX, 0.55, 160, (sx) => {
      ctx.fillStyle = '#282030';
      ctx.fillRect(sx + 80, 108, 4, 22);
      ctx.fillStyle = (frame >> 2) % 2 ? '#f8a030' : '#f8d040';
      ctx.fillRect(sx + 78, 100, 8, 9);
      ctx.fillStyle = '#f8f0a0';
      ctx.fillRect(sx + 80, 103, 4, 4);
    });
  } else if (key === 'throne') {
    skyBands(ctx, [[148, '#2c1c38']]);
    // arched hall behind
    repeatX(camX, 0.3, 110, (sx) => {
      ctx.fillStyle = '#1c1028';
      ctx.fillRect(sx + 20, 40, 60, 108);
      ctx.beginPath(); ctx.arc(sx + 50, 44, 30, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#68203a';
      ctx.fillRect(sx + 44, 54, 12, 50);
    });
    // columns
    repeatX(camX, 0.7, 130, (sx) => {
      ctx.fillStyle = '#584a78';
      ctx.fillRect(sx + 30, 30, 20, 118);
      ctx.fillStyle = '#786898';
      ctx.fillRect(sx + 33, 30, 5, 118);
      ctx.fillStyle = '#463a60';
      ctx.fillRect(sx + 26, 24, 28, 8);
      ctx.fillRect(sx + 26, 140, 28, 8);
      // banner
      ctx.fillStyle = '#8a1424';
      ctx.fillRect(sx + 86, 34, 22, 52);
      ctx.fillStyle = '#d8a030';
      ctx.fillRect(sx + 93, 50, 8, 8);
      // torch glow
      ctx.fillStyle = (frame >> 2) % 2 ? '#f8a030' : '#f8d040';
      ctx.fillRect(sx + 60, 70, 6, 8);
    });
  } else if (key === 'camp') {
    skyBands(ctx, [[148, '#0c1428']]);
    ctx.fillStyle = '#e8e8d0';
    for (let i = 0; i < 26; i++) {
      if ((i + (frame >> 4)) % 7 === 0) continue;
      ctx.fillRect((i * 47 + 9) % VIEW_W, (i * 31) % 100, 1 + (i % 2), 1 + (i % 2));
    }
    ctx.beginPath(); ctx.arc(258, 42, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c1428';
    ctx.beginPath(); ctx.arc(251, 38, 15, 0, Math.PI * 2); ctx.fill();
    // black woods
    ctx.fillStyle = '#0a2014';
    for (let i = 0; i < 14; i++) {
      const h = 26 + ((i * 17) % 20);
      ctx.fillRect(i * 24, 148 - h, 25, h);
      ctx.fillRect(i * 24 + 8, 148 - h - 10, 9, 12);
    }
  }
}

export function drawGround(ctx, key, camX, frame) {
  const gy = GROUND_TOP, gh = VIEW_H - GROUND_TOP;
  if (key === 'village') {
    ctx.fillStyle = '#a08048';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#8a6c38';
    ctx.fillRect(0, gy, VIEW_W, 6);
    ctx.fillStyle = '#b09058';
    ctx.fillRect(0, gy + 26, VIEW_W, 14);
    ctx.fillStyle = '#78562c';
    for (let i = 0; i < 22; i++) {
      const sx = (i * 67 - camX) % (VIEW_W + 40);
      const px = sx < 0 ? sx + VIEW_W + 40 : sx;
      ctx.fillRect(px - 20, gy + 8 + ((i * 29) % (gh - 14)), 8, 3);
    }
  } else if (key === 'beach') {
    ctx.fillStyle = '#e8d098';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#f0e0b0';
    ctx.fillRect(0, gy, VIEW_W, 5);
    ctx.fillStyle = '#d0b878';
    for (let i = 0; i < 26; i++) {
      const sx = (i * 53 - camX) % (VIEW_W + 40);
      const px = sx < 0 ? sx + VIEW_W + 40 : sx;
      ctx.fillRect(px - 20, gy + 6 + ((i * 23) % (gh - 10)), 6, 2);
    }
    // shells
    ctx.fillStyle = '#f8f0e0';
    for (let i = 0; i < 6; i++) {
      const sx = (i * 217 + 40 - camX) % (VIEW_W + 40);
      const px = sx < 0 ? sx + VIEW_W + 40 : sx;
      ctx.fillRect(px - 20, gy + 14 + ((i * 41) % (gh - 20)), 4, 3);
    }
  } else if (key === 'castle') {
    ctx.fillStyle = '#787c90';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#8c90a4';
    ctx.fillRect(0, gy, VIEW_W, 5);
    ctx.fillStyle = '#5c6074';
    for (let r = 0; r < 4; r++) {
      const yy = gy + 10 + r * 16;
      ctx.fillRect(0, yy, VIEW_W, 2);
      for (let i = 0; i < 8; i++) {
        const sx = (i * 48 + r * 24 - camX) % (VIEW_W + 48);
        const px = sx < 0 ? sx + VIEW_W + 48 : sx;
        ctx.fillRect(px - 24, yy - 14, 2, 14);
      }
    }
  } else if (key === 'throne') {
    ctx.fillStyle = '#443454';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#382a46';
    for (let r = 0; r < 4; r++) ctx.fillRect(0, gy + 12 + r * 16, VIEW_W, 2);
    // long red carpet
    ctx.fillStyle = '#8a1c28';
    ctx.fillRect(0, gy + 18, VIEW_W, 30);
    ctx.fillStyle = '#d8a030';
    ctx.fillRect(0, gy + 16, VIEW_W, 2);
    ctx.fillRect(0, gy + 48, VIEW_W, 2);
    ctx.fillStyle = '#6a1420';
    for (let i = 0; i < 10; i++) {
      const sx = (i * 71 - camX) % (VIEW_W + 40);
      const px = sx < 0 ? sx + VIEW_W + 40 : sx;
      ctx.fillRect(px - 20, gy + 24, 10, 3);
    }
  } else if (key === 'camp') {
    ctx.fillStyle = '#20382c';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#18301f';
    ctx.fillRect(0, gy, VIEW_W, 5);
    ctx.fillStyle = '#2c4a34';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect((i * 59 + 11) % VIEW_W, gy + 8 + ((i * 31) % (gh - 12)), 5, 2);
    }
  }
}
