// Stage definitions, arena trigger data, breakables and parallax backdrops.

export const VIEW_W = 320;
export const VIEW_H = 224;
export const GROUND_TOP = 148; // top of the walkable ground band
export const GROUND_BOT = 210; // bottom of the walkable ground band

// spawn shorthand: t kind, v palette variant, side -1 left / 1 right
const pk = (v, side, o = {}) => ({ t: 'punk', v, side, ...o });
const br = (v, side) => ({ t: 'brawler', v, side });
const sg = (v, side) => ({ t: 'thrower', v, side });
const el = (v, side) => ({ t: 'whip', v, side });
const fb = (v, side) => ({ t: 'fat', v, side });
const bk = (v, side) => ({ t: 'biker', v, side });
const kb = (v, side) => ({ t: 'kickboxer', v, side });

// breakable shorthand: type, x, y, drop item
const B = (t, x, y, drop) => ({ t, x, y, drop });

export const STAGES = [
  {
    name: 'ROUND 1', title: 'DOWNTOWN NIGHT', key: 'downtown', width: 1440, music: 'club1',
    story: ['Rain on neon. The Syndicate', 'runs Moore City now, and the', 'police stopped answering.', '', 'Two fighters did not.'],
    breakables: [
      B('booth', 210, 160, 'apple'), B('crate', 470, 195, 'money'),
      B('booth', 700, 158, 'pipe'), B('crate', 1000, 200, 'chicken'),
      B('barrel', 1210, 170, 'money'),
    ],
    triggers: [
      { x: 130, waves: [[pk(0, 1), pk(0, 1)], [pk(0, -1), pk(0, 1, { knife: true })]] },
      { x: 420, waves: [[br(0, 1), pk(0, -1)], [sg(0, 1), pk(1, 1)]] },
      { x: 740, waves: [[sg(0, 1), pk(1, -1), pk(1, 1)], [br(0, 1), br(0, -1)]] },
      { x: 1120, name: 'BIG MOORLEY', boss: true, waves: [[fb(0, 1)], [pk(1, -1), pk(1, 1)]] },
    ],
  },
  {
    name: 'ROUND 2', title: 'THE BRIDGE', key: 'bridge', width: 1460, music: 'club2',
    story: ['The harbor bridge, half-built', 'and full of holes. Syndicate', 'bikers use it as a race track.', '', 'Mind the gaps.'],
    holes: [
      { x: 560, w: 56, y0: GROUND_TOP + 2, y1: GROUND_TOP + 34 },
      { x: 940, w: 64, y0: GROUND_BOT - 34, y1: GROUND_BOT },
    ],
    breakables: [
      B('crate', 300, 165, 'knife'), B('barrel', 640, 195, 'apple'),
      B('crate', 860, 160, 'money'), B('barrel', 1180, 185, 'chicken'),
    ],
    triggers: [
      { x: 140, waves: [[pk(1, 1), pk(0, -1)], [bk(0, 1)]] },
      { x: 480, waves: [[sg(0, 1), br(1, -1)], [pk(1, 1), pk(1, -1), pk(0, 1)]] },
      { x: 800, waves: [[el(0, 1), pk(1, -1)], [br(1, 1), sg(0, -1)]] },
      { x: 1130, name: 'HELL RIDERS', boss: true, waves: [[bk(1, 1), bk(1, -1)], [br(1, 1)]] },
    ],
  },
  {
    name: 'ROUND 3', title: 'AMUSEMENT PIER', key: 'pier', width: 1460, music: 'club3',
    story: ['A pirate ship rots in the bay', 'behind the shuttered funfair.', 'The Syndicate collects the', 'ticket money now.', 'Closing time.'],
    breakables: [
      B('crate', 260, 195, 'apple'), B('barrel', 520, 165, 'money'),
      B('crate', 780, 200, 'katana'), B('barrel', 1050, 170, 'chicken'),
      B('crate', 1230, 195, 'moneybag'),
    ],
    triggers: [
      { x: 140, waves: [[el(0, 1), pk(2, -1)], [pk(2, 1), pk(1, -1), sg(1, 1)]] },
      { x: 460, waves: [[fb(1, 1), pk(2, -1)], [el(0, 1), el(0, -1)]] },
      { x: 800, waves: [[br(2, 1), sg(1, -1), pk(2, 1)]] },
      { x: 1130, name: 'MOORAI', boss: true, waves: [[kb(0, 1)], [el(1, -1), pk(2, 1)]] },
    ],
  },
  {
    name: 'ROUND 4', title: 'FREIGHT ELEVATOR', key: 'elevator', width: 320, music: 'club2',
    elevator: true,
    story: ['The only way up Syndicate', 'Tower is the freight elevator.', '', 'It stops at every floor.', 'So does the welcome party.'],
    breakables: [
      B('crate', 50, 200, 'apple'), B('crate', 276, 198, 'knife'),
    ],
    floors: [
      { label: '1F', waves: [[pk(1, 1), pk(1, -1)], [sg(0, 1), pk(2, -1)]] },
      { label: '9F', waves: [[br(1, 1), br(1, -1)], [el(0, 1), pk(2, -1)]] },
      { label: '17F', waves: [[pk(2, 1), pk(2, -1), sg(1, 1)], [br(2, -1), el(1, 1)]] },
      { label: 'ROOF', name: 'PENTHOUSE GUARD', boss: true, waves: [[kb(1, 1), sg(1, -1)]] },
    ],
    triggers: [],
  },
  {
    name: 'FINAL ROUND', title: 'SYNDICATE TOWER', key: 'tower', width: 1360, music: 'club3',
    story: ['Top floor. White carpet,', 'stolen art, a long oak desk.', '', 'Mr. Moore X is expecting you.', 'He is not worried.'],
    breakables: [
      B('crate', 250, 195, 'chicken'), B('barrel', 560, 165, 'money'),
      B('crate', 820, 198, 'moneybag'),
    ],
    triggers: [
      { x: 140, waves: [[br(2, 1), pk(2, -1)], [el(1, 1), sg(1, -1)]] },
      { x: 450, waves: [[kb(0, 1), br(2, -1)]] },
      { x: 720, name: 'MOORE SHADOW', boss: true, waves: [[{ t: 'mirror', side: 1 }]] },
      { x: 1020, name: 'MR. MOORE X', boss: true, waves: [[{ t: 'moorex', side: 1 }], [pk(2, -1), pk(2, 1)]] },
    ],
  },
];

export const ENDING = [
  'The machine gun clatters to the',
  'white carpet. Outside, the rain',
  'finally stops.',
  '',
  'By morning the arcades are loud',
  'again, the pier lights are on,',
  'and the phone booths only ever',
  'contain phones.',
  '',
  'The streets belong to Moore.',
];

// ---------------- parallax backdrops ----------------

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

const NEON = ['#f04898', '#48d8f0', '#f0d048', '#78f048', '#c868f0'];

export function drawBackdrop(ctx, key, camX, frame, elevOff = 0) {
  if (key === 'downtown') {
    skyBands(ctx, [[70, '#0a0a1e'], [40, '#141030'], [38, '#241840']]);
    // far skyline
    repeatX(camX, 0.15, 90, (sx, i) => {
      const h = 44 + ((i * 31) % 34);
      ctx.fillStyle = '#101024';
      ctx.fillRect(sx + 4, 118 - h, 66, h + 30);
      ctx.fillStyle = '#f0e090';
      for (let w = 0; w < 12; w++) {
        if ((i * 13 + w * 7) % 5 < 2) ctx.fillRect(sx + 9 + (w % 4) * 15, 124 - h + ((w >> 2) * 12), 3, 4);
      }
    });
    // near buildings with neon signs
    repeatX(camX, 0.45, 150, (sx, i) => {
      ctx.fillStyle = '#1c1430';
      ctx.fillRect(sx + 6, 58, 100, 90);
      ctx.fillStyle = '#2a2044';
      ctx.fillRect(sx + 6, 58, 100, 5);
      // windows
      ctx.fillStyle = '#383054';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) ctx.fillRect(sx + 14 + c * 18, 70 + r * 22, 9, 12);
      // flickering neon sign
      const col = NEON[Math.abs(i) % NEON.length];
      const on = ((frame >> 4) + i) % 7 !== 0;
      ctx.fillStyle = on ? col : '#302038';
      ctx.fillRect(sx + 30, 96, 46, 14);
      ctx.fillStyle = '#0e0a1c';
      ctx.fillRect(sx + 33, 99, 40, 8);
      if (on) {
        ctx.fillStyle = col;
        ctx.fillRect(sx + 36, 101, 10, 4); ctx.fillRect(sx + 50, 101, 6, 4); ctx.fillRect(sx + 60, 101, 10, 4);
      }
    });
    // wet street glow strip at horizon
    ctx.fillStyle = '#302850';
    ctx.fillRect(0, 144, VIEW_W, 4);
  } else if (key === 'bridge') {
    skyBands(ctx, [[56, '#0c1024'], [44, '#182038'], [30, '#243050']]);
    // stars
    ctx.fillStyle = '#d8e0f0';
    for (let i = 0; i < 14; i++) {
      if ((i + (frame >> 5)) % 5 === 0) continue;
      ctx.fillRect((i * 53 + 17) % VIEW_W, (i * 23) % 50, 1, 1);
    }
    // distant city across the water
    repeatX(camX, 0.1, 70, (sx, i) => {
      const h = 16 + ((i * 19) % 14);
      ctx.fillStyle = '#101a30';
      ctx.fillRect(sx + 2, 100 - h, 40, h);
      ctx.fillStyle = '#e8d888';
      if (i % 2 === 0) ctx.fillRect(sx + 8, 94 - h + 6, 2, 2);
    });
    // water
    ctx.fillStyle = '#121c34';
    ctx.fillRect(0, 100, VIEW_W, 48);
    ctx.fillStyle = '#28406a';
    for (let i = 0; i < 9; i++) {
      const wx = (i * 47 - camX * 0.2 + frame * 0.3) % (VIEW_W + 30) - 15;
      ctx.fillRect(wx, 106 + (i % 4) * 9, 18, 1);
    }
    // bridge towers + cables
    repeatX(camX, 0.5, 300, (sx) => {
      ctx.fillStyle = '#38304a';
      ctx.fillRect(sx + 130, 10, 14, 138);
      ctx.fillRect(sx + 124, 60, 26, 8);
      ctx.strokeStyle = '#4a4260';
      ctx.lineWidth = 2;
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx + 137, 14);
        ctx.quadraticCurveTo(sx + 137 + d * 80, 100, sx + 137 + d * 150, 118);
        ctx.stroke();
      }
    });
    // guard rail + construction
    ctx.fillStyle = '#403a54';
    ctx.fillRect(0, 132, VIEW_W, 6);
    repeatX(camX, 0.85, 46, (sx) => {
      ctx.fillStyle = '#403a54';
      ctx.fillRect(sx + 6, 120, 4, 14);
    });
    repeatX(camX, 0.85, 210, (sx, i) => {
      if (i % 2) return;
      ctx.fillStyle = '#f08018';
      ctx.fillRect(sx + 30, 126, 8, 8);
      ctx.fillStyle = '#f0e0d0';
      ctx.fillRect(sx + 30, 129, 8, 2);
    });
  } else if (key === 'pier') {
    skyBands(ctx, [[36, '#241848'], [30, '#482058'], [26, '#802858'], [20, '#c04850']]);
    // low sun
    ctx.fillStyle = '#f8d878';
    ctx.beginPath(); ctx.arc(240 - camX * 0.02, 100, 16, 0, Math.PI * 2); ctx.fill();
    // sea
    ctx.fillStyle = '#302458';
    ctx.fillRect(0, 108, VIEW_W, 40);
    ctx.fillStyle = '#584080';
    for (let i = 0; i < 8; i++) {
      const wx = (i * 51 - camX * 0.15 + frame * 0.35) % (VIEW_W + 40) - 20;
      ctx.fillRect(wx, 114 + (i % 3) * 9, 22, 2);
    }
    // the pirate ship, anchored out in the bay
    const shx = 170 - ((camX * 0.12) % 700);
    ctx.fillStyle = '#241626';
    ctx.beginPath();
    ctx.moveTo(shx - 44, 116); ctx.lineTo(shx + 46, 116); ctx.lineTo(shx + 36, 104); ctx.lineTo(shx - 36, 104);
    ctx.fill();
    ctx.fillRect(shx - 4, 62, 3, 44); ctx.fillRect(shx - 26, 74, 2, 32); ctx.fillRect(shx + 20, 74, 2, 32);
    ctx.fillStyle = '#584060';
    ctx.fillRect(shx - 18, 66, 26, 14); ctx.fillRect(shx - 36, 80, 18, 10);
    ctx.fillStyle = '#c03040';
    ctx.fillRect(shx - 1, 58, 10, 5);
    // ferris wheel silhouette
    repeatX(camX, 0.35, 420, (sx) => {
      const cx = sx + 300, cy = 84, r = 34;
      ctx.strokeStyle = '#3a2050';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + frame * 0.004;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
        ctx.fillStyle = NEON[k % NEON.length];
        ctx.fillRect(cx + Math.cos(a) * r - 2, cy + Math.sin(a) * r - 2, 4, 4);
      }
      ctx.fillStyle = '#3a2050';
      ctx.fillRect(cx - 6, cy + r - 4, 12, 24);
    });
    // boardwalk string lights
    ctx.strokeStyle = '#402858';
    ctx.lineWidth = 1;
    repeatX(camX, 0.8, 80, (sx, i) => {
      ctx.beginPath();
      ctx.moveTo(sx, 128); ctx.quadraticCurveTo(sx + 40, 140, sx + 80, 128);
      ctx.stroke();
      for (let k = 1; k < 4; k++) {
        ctx.fillStyle = ((frame >> 3) + i + k) % 5 ? '#f8e888' : '#584068';
        ctx.fillRect(sx + k * 20 - 1, 131 + (k === 2 ? 4 : 2), 3, 3);
      }
    });
  } else if (key === 'elevator') {
    // shaft interior; elevOff scrolls girders downward as the car rises
    skyBands(ctx, [[148, '#181420']]);
    ctx.fillStyle = '#100c18';
    ctx.fillRect(0, 0, 24, 148); ctx.fillRect(VIEW_W - 24, 0, 24, 148);
    // vertical rails
    ctx.fillStyle = '#38304a';
    ctx.fillRect(28, 0, 5, 148); ctx.fillRect(VIEW_W - 33, 0, 5, 148);
    // passing girders
    const span = 64;
    const off = ((elevOff % span) + span) % span;
    for (let y = -span + off; y < 148 + span; y += span) {
      ctx.fillStyle = '#2c2440';
      ctx.fillRect(24, y, VIEW_W - 48, 8);
      ctx.fillStyle = '#403858';
      ctx.fillRect(24, y, VIEW_W - 48, 2);
      // rivets
      ctx.fillStyle = '#181424';
      for (let x = 40; x < VIEW_W - 40; x += 24) ctx.fillRect(x, y + 3, 3, 3);
      // caged work lights between girders
      ctx.fillStyle = '#f0d048';
      ctx.fillRect(60, y + 34, 4, 4); ctx.fillRect(VIEW_W - 64, y + 34, 4, 4);
      ctx.fillStyle = 'rgba(240,208,72,0.12)';
      ctx.fillRect(50, y + 28, 24, 16); ctx.fillRect(VIEW_W - 74, y + 28, 24, 16);
    }
    // cables
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(VIEW_W / 2 - 30, 0, 3, 148); ctx.fillRect(VIEW_W / 2 + 27, 0, 3, 148);
  } else if (key === 'tower') {
    skyBands(ctx, [[148, '#1c1024']]);
    // tall windows with the city far below
    repeatX(camX, 0.3, 110, (sx, i) => {
      ctx.fillStyle = '#0a0818';
      ctx.fillRect(sx + 14, 26, 58, 112);
      // city lights outside
      ctx.fillStyle = '#c8a848';
      for (let w = 0; w < 10; w++) {
        if ((i * 11 + w * 5) % 4 === 0) continue;
        ctx.fillRect(sx + 20 + (w % 5) * 10, 104 + ((w / 5) | 0) * 12, 3, 2);
      }
      ctx.fillStyle = '#f04898';
      ctx.fillRect(sx + 30, 92, 8, 3);
      // frame
      ctx.fillStyle = '#3a2848';
      ctx.fillRect(sx + 12, 24, 4, 116); ctx.fillRect(sx + 70, 24, 4, 116);
      ctx.fillRect(sx + 12, 24, 62, 4); ctx.fillRect(sx + 12, 78, 62, 3);
    });
    // marble columns
    repeatX(camX, 0.7, 170, (sx) => {
      ctx.fillStyle = '#584868';
      ctx.fillRect(sx + 40, 20, 18, 128);
      ctx.fillStyle = '#786890';
      ctx.fillRect(sx + 43, 20, 4, 128);
      ctx.fillStyle = '#463850';
      ctx.fillRect(sx + 36, 14, 26, 8); ctx.fillRect(sx + 36, 140, 26, 8);
      // stolen art between columns
      ctx.fillStyle = '#c8a030';
      ctx.fillRect(sx + 100, 46, 34, 26);
      ctx.fillStyle = '#28183a';
      ctx.fillRect(sx + 103, 49, 28, 20);
      ctx.fillStyle = '#8858a8';
      ctx.fillRect(sx + 108, 54, 10, 10);
    });
  }
}

export function drawGround(ctx, key, camX, frame, stage) {
  const gy = GROUND_TOP, gh = VIEW_H - GROUND_TOP;
  if (key === 'downtown') {
    ctx.fillStyle = '#2c2c3c';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#3a3a4e';
    ctx.fillRect(0, gy, VIEW_W, 4);
    // wet asphalt neon reflections
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(${[240, 72, 152][0]},${72 + i * 8},${152},0.10)`;
      const sx = (i * 173 + 60 - camX) % (VIEW_W + 60);
      const px = sx < 0 ? sx + VIEW_W + 60 : sx;
      ctx.fillRect(px - 30, gy + 8 + (i * 17) % (gh - 20), 26, 10);
    }
    // sidewalk cracks / manholes
    ctx.fillStyle = '#22222e';
    for (let i = 0; i < 14; i++) {
      const sx = (i * 97 - camX) % (VIEW_W + 40);
      const px = sx < 0 ? sx + VIEW_W + 40 : sx;
      ctx.fillRect(px - 20, gy + 10 + ((i * 37) % (gh - 16)), 12, 3);
    }
  } else if (key === 'bridge') {
    ctx.fillStyle = '#4a4456';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#5a5468';
    ctx.fillRect(0, gy, VIEW_W, 4);
    // lane paint
    ctx.fillStyle = '#c8b848';
    for (let i = 0; i < 8; i++) {
      const sx = (i * 70 - camX) % (VIEW_W + 60);
      const px = sx < 0 ? sx + VIEW_W + 60 : sx;
      ctx.fillRect(px - 30, gy + 30, 34, 3);
    }
    // rivet lines
    ctx.fillStyle = '#3a3444';
    for (let r = 0; r < 3; r++) ctx.fillRect(0, gy + 14 + r * 18, VIEW_W, 2);
    // holes
    if (stage?.holes) {
      for (const h of stage.holes) {
        const px = h.x - camX;
        if (px < -h.w - 20 || px > VIEW_W + 20) continue;
        ctx.fillStyle = '#08070c';
        ctx.fillRect(px, h.y0, h.w, h.y1 - h.y0);
        ctx.fillStyle = '#151221';
        ctx.fillRect(px + 3, h.y0 + 3, h.w - 6, h.y1 - h.y0 - 6);
        // hazard stripe border
        for (let s = 0; s < h.w; s += 8) {
          ctx.fillStyle = s % 16 === 0 ? '#e8c838' : '#26202e';
          ctx.fillRect(px + s, h.y0 - 3, 8, 3);
          ctx.fillRect(px + s, h.y1, 8, 3);
        }
      }
    }
  } else if (key === 'pier') {
    ctx.fillStyle = '#7a5830';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#8a6838';
    ctx.fillRect(0, gy, VIEW_W, 4);
    // boardwalk planks
    ctx.fillStyle = '#684a26';
    for (let r = 0; r < 5; r++) ctx.fillRect(0, gy + 10 + r * 13, VIEW_W, 2);
    for (let i = 0; i < 12; i++) {
      const sx = (i * 61 - camX) % (VIEW_W + 40);
      const px = sx < 0 ? sx + VIEW_W + 40 : sx;
      ctx.fillRect(px - 20, gy + 6 + (i % 5) * 13, 2, 11);
    }
  } else if (key === 'elevator') {
    // the car floor: steel plate
    ctx.fillStyle = '#3c3848';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#4c4860';
    ctx.fillRect(0, gy, VIEW_W, 4);
    ctx.fillStyle = '#2c2838';
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 11; i++) {
        ctx.fillRect(16 + i * 28 + (r % 2) * 14, gy + 12 + r * 14, 10, 3);
      }
    }
    // car walls
    ctx.fillStyle = '#28243a';
    ctx.fillRect(0, gy, 12, gh); ctx.fillRect(VIEW_W - 12, gy, 12, gh);
    ctx.fillStyle = '#e8c838';
    ctx.fillRect(0, gy, 12, 3); ctx.fillRect(VIEW_W - 12, gy, 12, 3);
  } else if (key === 'tower') {
    ctx.fillStyle = '#c8c0cc';
    ctx.fillRect(0, gy, VIEW_W, gh);
    ctx.fillStyle = '#d8d2dc';
    ctx.fillRect(0, gy, VIEW_W, 4);
    // long white carpet with red border
    ctx.fillStyle = '#e8e4ec';
    ctx.fillRect(0, gy + 16, VIEW_W, 34);
    ctx.fillStyle = '#a82838';
    ctx.fillRect(0, gy + 14, VIEW_W, 2); ctx.fillRect(0, gy + 50, VIEW_W, 2);
    ctx.fillStyle = '#b0a8b8';
    for (let i = 0; i < 10; i++) {
      const sx = (i * 79 - camX) % (VIEW_W + 40);
      const px = sx < 0 ? sx + VIEW_W + 40 : sx;
      ctx.fillRect(px - 20, gy + 26, 12, 2);
    }
  }
}

// Weather / foreground overlay drawn after entities (neon rain).
export function drawOverlay(ctx, key, camX, frame) {
  if (key !== 'downtown') return;
  ctx.save();
  for (let i = 0; i < 34; i++) {
    const seed = i * 97;
    const speed = 7 + (i % 3) * 2;
    const x = (seed * 13 - camX * 0.9 + frame * 1.4) % (VIEW_W + 30) - 15;
    const y = (seed + frame * speed) % (VIEW_H + 20) - 10;
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(160,200,255,0.5)' : 'rgba(110,140,200,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + 7);
    ctx.stroke();
  }
  ctx.restore();
}
