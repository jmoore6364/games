// Procedural pixel art. Fighters are drawn paper-doll style: every actor
// shares one humanoid pose library (rect lists in a local space, feet at
// origin, facing right) and gets its own palette + body tweaks — the
// Genesis palette-swap trick, computed live. Items, weapons, breakables
// and FX are small rect compositions. All original art.

// Palette keys: h hair, s skin, t top, T top shade, p pants, P pants shade,
// k boots, a accent, d dark detail, g glove.

export const ACTORS = {
  // heroes
  ax: { pal: { h: '#c87828', s: '#f0b078', t: '#f0f0f4', T: '#b8bcd0', p: '#3858c8', P: '#26408e', k: '#7a3820', a: '#f0d048', d: '#201408', g: '#d8d8e0' } },
  bl: { pal: { h: '#f0d048', s: '#f0b088', t: '#d82850', T: '#981038', p: '#d82850', P: '#981038', k: '#c03050', a: '#f0d048', d: '#201408', g: '#f0b088' }, female: true },
  // dark mirror versions for the tower doppelganger
  axd: { pal: { h: '#404858', s: '#8890a8', t: '#485068', T: '#303848', p: '#283050', P: '#182038', k: '#181c28', a: '#c03050', d: '#0a0a12', g: '#586078' } },
  bld: { pal: { h: '#404858', s: '#8890a8', t: '#583048', T: '#3a2030', p: '#583048', P: '#3a2030', k: '#281828', a: '#c03050', d: '#0a0a12', g: '#8890a8' }, female: true },
  // punks (Galsia): tee + jeans
  pk0: { pal: { h: '#402818', s: '#e8a870', t: '#c8b048', T: '#907c28', p: '#4858a0', P: '#303f78', k: '#282018', a: '#903020', d: '#181008', g: '#e8a870' } },
  pk1: { pal: { h: '#c8c8d0', s: '#e8a870', t: '#38a058', T: '#207040', p: '#404048', P: '#282830', k: '#181818', a: '#903020', d: '#181008', g: '#e8a870' } },
  pk2: { pal: { h: '#a83028', s: '#d89868', t: '#7838b8', T: '#502078', p: '#383040', P: '#201c28', k: '#181018', a: '#c8a030', d: '#181008', g: '#d89868' } },
  // brawlers (Donovan): bald, vest
  br0: { pal: { h: '#e8a870', s: '#e8a870', t: '#d87828', T: '#a05018', p: '#385838', P: '#243c24', k: '#282018', a: '#303030', d: '#181008', g: '#c04028' }, bald: true },
  br1: { pal: { h: '#c89060', s: '#c89060', t: '#3878c8', T: '#20508e', p: '#484038', P: '#302a22', k: '#181410', a: '#303030', d: '#181008', g: '#d8d048' }, bald: true },
  br2: { pal: { h: '#b88858', s: '#b88858', t: '#b83048', T: '#801c30', p: '#303038', P: '#1c1c22', k: '#101014', a: '#303030', d: '#181008', g: '#e8e8f0' }, bald: true },
  // throwers (Signal): tall, cap, tracksuit
  sg0: { pal: { h: '#e8d048', s: '#906040', t: '#e85828', T: '#a83818', p: '#e85828', P: '#a83818', k: '#f0f0f0', a: '#e8d048', d: '#181008', g: '#906040' }, cap: true },
  sg1: { pal: { h: '#48c8e8', s: '#906040', t: '#2888c8', T: '#185c90', p: '#2888c8', P: '#185c90', k: '#f0f0f0', a: '#48c8e8', d: '#181008', g: '#906040' }, cap: true },
  // whip women (Electra)
  el0: { pal: { h: '#282830', s: '#f0b088', t: '#282838', T: '#181820', p: '#282838', P: '#181820', k: '#902838', a: '#c83048', d: '#181008', g: '#f0b088' }, female: true },
  el1: { pal: { h: '#c03048', s: '#f0b088', t: '#402848', T: '#281830', p: '#402848', P: '#281830', k: '#c8a030', a: '#d8b038', d: '#181008', g: '#f0b088' }, female: true },
  // fat fire-breather
  fb0: { pal: { h: '#584838', s: '#e8a878', t: '#38a078', T: '#207050', p: '#405888', P: '#2a3c60', k: '#302418', a: '#c8a030', d: '#181008', g: '#e8a878' }, fat: true },
  fb1: { pal: { h: '#804828', s: '#d89868', t: '#b84838', T: '#803020', p: '#383848', P: '#242430', k: '#241a10', a: '#c8a030', d: '#181008', g: '#d89868' }, fat: true },
  // biker
  bk0: { pal: { h: '#181820', s: '#e0a070', t: '#282830', T: '#16161e', p: '#383848', P: '#22222c', k: '#101014', a: '#c83028', d: '#101008', g: '#584838' } },
  bk1: { pal: { h: '#181820', s: '#c89060', t: '#682828', T: '#421818', p: '#303040', P: '#1c1c28', k: '#101014', a: '#d8b038', d: '#101008', g: '#584838' } },
  // kickboxer mini-boss
  kb0: { pal: { h: '#282018', s: '#d09058', t: '#d09058', T: '#a06838', p: '#c83048', P: '#8e1c30', k: '#e8e0d0', a: '#f0d048', d: '#181008', g: '#c82838' }, bald: true },
  kb1: { pal: { h: '#282018', s: '#e8a870', t: '#e8a870', T: '#b87848', p: '#3048b8', P: '#1e3080', k: '#e8e0d0', a: '#f0d048', d: '#181008', g: '#2838c8' }, bald: true },
  // Mr. Moore X: white suit, cigar
  mx: { pal: { h: '#c8c8c8', s: '#e0a878', t: '#e8e8e8', T: '#b0b0c0', p: '#e8e8e8', P: '#b0b0c0', k: '#282828', a: '#c83028', d: '#181008', g: '#e0a878' }, big: true },
};

// ---- pose library ----
// Returns rect list [[palKey, x, y, w, h], ...] in local space:
// feet center at (0,0), facing +x, y negative = up.

function rects(pose, f, b) {
  const R = [];
  const P = (c, x, y, w, h) => R.push([c, x, y, w, h]);
  const fem = b.female;
  const fat = b.fat;

  const head = (dx, dy = 0) => {
    if (b.cap) { P('a', dx - 4, -31 + dy, 8, 2); P('a', dx + 3, -29 + dy, 3, 1); }
    else if (!b.bald) { P('h', dx - 4, -31 + dy, 8, 3); P('h', dx - 4, -28 + dy, 2, 4); if (fem) P('h', dx - 5, -28 + dy, 2, 6); }
    P('s', dx - 3, -28 + dy, 6, 5);
    P('d', dx + 1, -27 + dy, 1, 1);
    if (b.big) { P('d', dx + 2, -25 + dy, 3, 1); } // cigar
  };
  const torso = (dx, dy = 0) => {
    const w = fat ? 14 : fem ? 7 : 9;
    P('t', dx - w / 2, -23 + dy, w, 7);
    P('T', dx - w / 2, -16 + dy, w, 3);
    P('a', dx - w / 2, -13 + dy, w, 1);
  };
  const legsStand = () => {
    if (fem) {
      P('p', -4, -12, 8, 3);
      P('s', -3, -9, 2, 6); P('s', 2, -9, 2, 6);
      P('k', -4, -3, 4, 3); P('k', 1, -3, 4, 3);
    } else {
      P('p', -4, -12, 3, 8); P('p', 1, -12, 3, 8);
      P('k', -5, -4, 4, 4); P('k', 1, -4, 4, 4);
      if (fat) { P('p', -7, -12, 3, 8); P('p', 4, -12, 3, 8); P('k', -8, -4, 4, 4); P('k', 4, -4, 4, 4); }
    }
  };
  const legsWalk = (ph) => {
    const o = ph ? 2 : -2;
    P('p', -4 - o, -12, 3, 8); P('p', 1 + o, -12, 3, 8);
    P('k', -5 - o, -4, 4, 4); P('k', 1 + o, -4, 4, 4);
    if (fem) P('p', -4, -12, 8, 3);
    if (fat) { P('p', -7, -12, 4, 9); P('p', 4, -12, 4, 9); }
  };
  const armRest = (dy = 0) => { P('s', -6, -22 + dy, 2, 7); P('s', 4 + (fat ? 3 : 0), -22 + dy, 2, 7); };

  switch (pose) {
    case 'idle': {
      const bob = (f >> 4) % 2;
      head(0, bob * 0.5 | 0); torso(0, bob ? 1 : 0); armRest(bob ? 1 : 0); legsStand();
      break;
    }
    case 'walk1': head(0); torso(0); armRest(); legsWalk(0); break;
    case 'walk2': head(0); torso(0); armRest(); legsWalk(1); break;
    case 'run1': head(2); torso(1); P('s', -6, -21, 2, 6); P('s', 5, -23, 2, 6); legsWalk(0); break;
    case 'run2': head(2); torso(1); P('s', -6, -23, 2, 6); P('s', 5, -21, 2, 6); legsWalk(1); break;
    case 'jab':
      head(1); torso(1); P('s', -6, -22, 2, 6);
      P('s', 3, -22, 6, 2); P('g', 9, -23, 3, 3);
      legsWalk(0);
      break;
    case 'jab2':
      head(1); torso(1); P('s', -6, -22, 2, 6);
      P('s', 3, -21, 7, 2); P('g', 10, -22, 3, 3);
      legsWalk(1);
      break;
    case 'hook':
      head(2); torso(1);
      P('s', -5, -23, 8, 2); P('g', 3, -25, 3, 3); // arm swung across, high
      P('s', -6, -20, 2, 5);
      legsWalk(0);
      break;
    case 'upper':
      head(1, -2); torso(1, -1);
      P('s', 4, -30, 2, 8); P('g', 3, -33, 3, 3); // arm straight up
      P('s', -6, -21, 2, 6);
      legsWalk(1);
      break;
    case 'kick':
      head(-1); torso(-1); armRest();
      P('p', -3, -12, 3, 8); P('k', -4, -4, 4, 4); // standing leg
      P('p', 1, -14, 8, 3); P('k', 9, -15, 4, 4); // extended leg
      if (fem) { R.length = 0; head(-1); torso(-1); armRest(); P('p', -4, -12, 6, 3); P('s', -3, -9, 2, 6); P('k', -4, -3, 4, 3); P('s', 1, -14, 8, 2); P('k', 9, -15, 4, 4); }
      break;
    case 'knee':
      head(0); torso(0);
      P('s', -6, -22, 2, 5); P('s', 4, -22, 2, 5);
      P('p', -3, -12, 3, 8); P('k', -4, -4, 4, 4);
      P('p', 2, -14, 4, 5); P('k', 3, -10, 4, 4); // raised knee
      break;
    case 'jump':
      head(0, 2); torso(0, 2); armRest(2);
      P('p', -4, -10, 3, 5); P('p', 1, -10, 3, 5);
      P('k', -5, -6, 4, 4); P('k', 1, -6, 4, 4);
      break;
    case 'jkick':
      head(-2, 4); torso(-1, 4);
      P('s', -7, -19, 2, 5); P('s', 4, -21, 3, 2);
      P('p', -5, -9, 4, 4); P('k', -6, -5, 4, 3); // tucked back leg
      P('p', 1, -10, 8, 3); P('k', 9, -11, 4, 4); // extended kick
      break;
    case 'jpunch':
      head(0, 2); torso(0, 2);
      P('s', 3, -20, 6, 2); P('g', 9, -21, 3, 3);
      P('s', -6, -20, 2, 6);
      P('p', -4, -10, 3, 6); P('p', 1, -10, 3, 6);
      P('k', -5, -5, 4, 3); P('k', 1, -5, 4, 3);
      break;
    case 'hurt':
      head(-2); torso(-1);
      P('s', -7, -24, 2, 6); P('s', 5, -24, 2, 6);
      legsWalk(0);
      break;
    case 'down': // lying on back, head to -x
      P('h', -12, -4, 4, 3);
      P('s', -10, -5, 4, 3);
      P('t', -6, -6, 9, 4);
      P('p', 3, -5, 7, 3);
      P('k', 9, -6, 4, 3);
      break;
    case 'grabhold': // both arms forward, gripping
      head(1); torso(1);
      P('s', 2, -22, 7, 2); P('s', 2, -18, 7, 2);
      legsWalk(0);
      break;
    case 'grabbed':
      head(-1, 1); torso(0, 1);
      P('s', -7, -25, 2, 6); P('s', 5, -25, 2, 6);
      legsWalk(1);
      break;
    case 'throw':
      head(2, -1); torso(1);
      P('s', 3, -26, 7, 2); P('s', 3, -20, 6, 2);
      P('p', -5, -12, 3, 8); P('k', -6, -4, 4, 4);
      P('p', 2, -12, 3, 8); P('k', 2, -4, 4, 4);
      break;
    case 'suplex': // arched back
      head(-4, 6); torso(-2, 4);
      P('s', -8, -26, 2, 7); P('s', 2, -26, 2, 7);
      P('p', -1, -12, 3, 8); P('k', -2, -4, 4, 4);
      P('p', 3, -12, 3, 8); P('k', 3, -4, 4, 4);
      break;
    case 'special1':
      head(0); torso(0);
      P('s', -12, -22, 7, 2); P('g', -14, -23, 3, 3);
      P('s', 5, -22, 7, 2); P('g', 11, -23, 3, 3);
      legsWalk(0);
      break;
    case 'special2':
      head(0); torso(0);
      P('s', -10, -26, 6, 2); P('g', -13, -27, 3, 3);
      P('s', 4, -18, 7, 2); P('g', 10, -19, 3, 3);
      legsWalk(1);
      break;
    case 'block':
      head(0); torso(0);
      P('s', 2, -24, 3, 9); P('g', 1, -26, 4, 3);
      P('s', -4, -21, 3, 7);
      legsStand();
      break;
    case 'wind': // arm cocked way back
      head(-1); torso(-1);
      P('s', -9, -24, 5, 2); P('g', -11, -25, 3, 3);
      P('s', 3, -21, 3, 5);
      legsWalk(0);
      break;
    case 'swing': // weapon swing / haymaker follow-through
      head(2); torso(1);
      P('s', 3, -23, 7, 2); P('g', 9, -24, 3, 3);
      P('s', -6, -20, 2, 5);
      legsWalk(1);
      break;
    case 'stab':
      head(1); torso(1);
      P('s', 3, -19, 7, 2); P('g', 9, -20, 3, 3);
      P('s', -6, -22, 2, 6);
      legsWalk(0);
      break;
    case 'whip':
      head(1); torso(1);
      P('s', 2, -26, 6, 2); P('g', 7, -27, 3, 3);
      P('s', -6, -22, 2, 6);
      legsWalk(0);
      break;
    case 'breathe':
      head(3, 1); torso(1);
      P('d', 6, -26, 3, 2); // open mouth
      P('s', -7, -22, 2, 6); P('s', 5, -22, 2, 6);
      legsStand();
      break;
    case 'charge':
      head(3, 2); torso(2, 1);
      P('s', 6, -22, 5, 2); P('s', -8, -20, 4, 2);
      legsWalk((f >> 2) % 2);
      break;
    case 'crouch':
      head(1, 8); torso(0, 8);
      P('s', 3, -14, 5, 2);
      P('p', -4, -6, 4, 3); P('p', 2, -6, 4, 3);
      P('k', -5, -3, 4, 3); P('k', 2, -3, 4, 3);
      break;
    case 'ride': // seated on bike
      head(2, 6); torso(1, 7);
      P('s', 4, -17, 5, 2);
      P('p', 0, -10, 6, 3); P('k', 3, -7, 4, 3);
      break;
    case 'shoot':
      head(1); torso(1);
      P('s', 3, -22, 6, 2);
      P('s', -6, -22, 2, 6);
      legsStand();
      break;
    case 'flip': // desk-flip pose: both arms up high
      head(0, -2); torso(0, -1);
      P('s', -7, -30, 2, 8); P('s', 5, -30, 2, 8);
      legsWalk(0);
      break;
    default:
      head(0); torso(0); armRest(); legsStand();
  }
  return R;
}

export function drawFighter(ctx, actor, pose, f, x, y, flip = false, white = false, scale = 1) {
  const b = ACTORS[actor];
  if (!b) return;
  const rs = rects(pose, f, b);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  if (scale !== 1) ctx.scale(scale, scale);
  for (const [c, rx, ry, rw, rh] of rs) {
    ctx.fillStyle = white ? '#ffffff' : (b.pal[c] || '#f0f');
    ctx.fillRect(Math.round(rx), Math.round(ry), rw, rh);
  }
  ctx.restore();
}

// ---- held weapons (drawn on top of the fighter) ----
// held pose: angled by whether the fighter is mid-swing.
export function drawHeldWeapon(ctx, t, x, y, face, swinging) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (face < 0) ctx.scale(-1, 1);
  if (t === 'pipe') {
    ctx.fillStyle = '#a8b0c0';
    if (swinging) ctx.fillRect(8, -24, 12, 3);
    else ctx.fillRect(4, -28, 3, 12);
    ctx.fillStyle = '#788090';
    if (swinging) ctx.fillRect(8, -22, 12, 1); else ctx.fillRect(6, -28, 1, 12);
  } else if (t === 'knife') {
    ctx.fillStyle = '#d8dce8';
    if (swinging) ctx.fillRect(9, -20, 8, 2);
    else ctx.fillRect(6, -22, 2, 6);
    ctx.fillStyle = '#6a4820';
    if (swinging) ctx.fillRect(6, -21, 3, 3); else ctx.fillRect(5, -17, 4, 3);
  } else if (t === 'katana') {
    ctx.fillStyle = '#e8ecf4';
    if (swinging) ctx.fillRect(8, -26, 18, 2);
    else ctx.fillRect(5, -34, 2, 16);
    ctx.fillStyle = '#8890b0';
    if (swinging) ctx.fillRect(8, -24, 18, 1); else ctx.fillRect(6, -34, 1, 16);
    ctx.fillStyle = '#402818';
    if (swinging) ctx.fillRect(4, -27, 4, 3); else ctx.fillRect(4, -18, 4, 4);
  }
  ctx.restore();
}

// ---- ground items ----
export function drawItem(ctx, t, x, y) {
  const rx = Math.round(x), ry = Math.round(y);
  ctx.save();
  ctx.translate(rx, ry);
  switch (t) {
    case 'apple':
      ctx.fillStyle = '#d82820'; ctx.fillRect(-3, -6, 6, 5);
      ctx.fillStyle = '#f06050'; ctx.fillRect(-2, -5, 2, 2);
      ctx.fillStyle = '#385820'; ctx.fillRect(0, -8, 1, 2); ctx.fillRect(1, -8, 2, 1);
      break;
    case 'chicken':
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-7, -3, 14, 2);
      ctx.fillStyle = '#c88030'; ctx.fillRect(-5, -8, 10, 5);
      ctx.fillStyle = '#e8a850'; ctx.fillRect(-4, -7, 5, 2);
      ctx.fillStyle = '#f0ead8'; ctx.fillRect(-7, -9, 2, 3); ctx.fillRect(5, -9, 2, 3);
      break;
    case 'money':
      ctx.fillStyle = '#38a048'; ctx.fillRect(-4, -5, 8, 4);
      ctx.fillStyle = '#70d080'; ctx.fillRect(-3, -4, 6, 2);
      ctx.fillStyle = '#f0d048'; ctx.fillRect(-1, -7, 3, 3);
      break;
    case 'moneybag':
      ctx.fillStyle = '#b09048'; ctx.fillRect(-4, -7, 8, 6);
      ctx.fillStyle = '#8a6c30'; ctx.fillRect(-2, -9, 4, 3);
      ctx.fillStyle = '#f0d048'; ctx.fillRect(-1, -5, 3, 3);
      break;
    case 'pipe':
      ctx.fillStyle = '#a8b0c0'; ctx.fillRect(-8, -3, 16, 2);
      ctx.fillStyle = '#788090'; ctx.fillRect(-8, -1, 16, 1);
      break;
    case 'knife':
      ctx.fillStyle = '#d8dce8'; ctx.fillRect(-6, -2, 8, 2);
      ctx.fillStyle = '#6a4820'; ctx.fillRect(2, -2, 4, 2);
      break;
    case 'katana':
      ctx.fillStyle = '#e8ecf4'; ctx.fillRect(-11, -3, 17, 2);
      ctx.fillStyle = '#402818'; ctx.fillRect(6, -3, 5, 2);
      ctx.fillStyle = '#c8a030'; ctx.fillRect(5, -4, 2, 4);
      break;
  }
  ctx.restore();
}

// ---- breakables ----
export function drawBreakable(ctx, t, x, y, hp, frame) {
  const rx = Math.round(x), ry = Math.round(y);
  ctx.save();
  ctx.translate(rx, ry);
  if (t === 'crate') {
    ctx.fillStyle = '#8a6030'; ctx.fillRect(-9, -16, 18, 16);
    ctx.fillStyle = '#a87c40'; ctx.fillRect(-8, -15, 16, 14);
    ctx.fillStyle = '#6a4820'; ctx.fillRect(-9, -9, 18, 2); ctx.fillRect(-1, -16, 2, 16);
    if (hp <= 1) { ctx.fillStyle = '#402808'; ctx.fillRect(-6, -13, 2, 5); ctx.fillRect(3, -8, 4, 2); }
  } else if (t === 'barrel') {
    ctx.fillStyle = '#7a4a20'; ctx.fillRect(-8, -18, 16, 18);
    ctx.fillStyle = '#94582a'; ctx.fillRect(-6, -17, 12, 16);
    ctx.fillStyle = '#484858'; ctx.fillRect(-8, -15, 16, 2); ctx.fillRect(-8, -6, 16, 2);
    if (hp <= 1) { ctx.fillStyle = '#2a1808'; ctx.fillRect(-3, -14, 2, 7); }
  } else if (t === 'booth') {
    ctx.fillStyle = '#204898'; ctx.fillRect(-10, -36, 20, 36);
    ctx.fillStyle = '#2860c0'; ctx.fillRect(-9, -35, 18, 34);
    ctx.fillStyle = '#a8d8f0'; ctx.fillRect(-7, -30, 14, 16);
    ctx.fillStyle = '#78a8c8'; ctx.fillRect(-7, -30, 14, 2);
    ctx.fillStyle = '#183050'; ctx.fillRect(-2, -30, 1, 16);
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(-6, -35, 12, 3);
    if (hp <= 1) {
      ctx.fillStyle = '#0c1830';
      ctx.fillRect(-5, -28, 3, 8); ctx.fillRect(2, -22, 3, 6);
    }
  }
  ctx.restore();
}

// ---- the biker's bike ----
export function drawBike(ctx, x, y, face, frame) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (face < 0) ctx.scale(-1, 1);
  ctx.fillStyle = '#181820';
  ctx.fillRect(-12, -7, 7, 7); ctx.fillRect(7, -7, 7, 7); // wheels
  ctx.fillStyle = '#404050';
  ctx.fillRect(-10, -5, 3, 3); ctx.fillRect(9, -5, 3, 3);
  ctx.fillStyle = '#c83028';
  ctx.fillRect(-9, -12, 18, 4); // body
  ctx.fillStyle = '#e85838';
  ctx.fillRect(-9, -12, 18, 1);
  ctx.fillStyle = '#a8b0c0';
  ctx.fillRect(9, -17, 2, 6); ctx.fillRect(6, -17, 6, 2); // bars
  ctx.fillStyle = (frame >> 2) % 2 ? '#f0d048' : '#f8f0a0';
  ctx.fillRect(13, -11, 2, 2); // headlamp
  ctx.restore();
}

// ---- fx ----
export function drawShadow(ctx, cx, cy, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(cy), w / 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSlash(ctx, x, y, face, t, big = false, color = '#f8f0d0') {
  const r = big ? 20 : 14;
  const a0 = face > 0 ? -1.5 + t * 1.6 : Math.PI + 1.5 - t * 1.6;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9 - t * 0.5;
  ctx.lineWidth = big ? 3 : 2;
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a0 + 0.9 * (face > 0 ? 1 : -1), face < 0);
  ctx.stroke();
  ctx.globalAlpha = 0.5 - t * 0.3;
  ctx.beginPath();
  ctx.arc(x, y, r - 4, a0, a0 + 0.7 * (face > 0 ? 1 : -1), face < 0);
  ctx.stroke();
  ctx.restore();
}

export function drawSpark(ctx, x, y, t, color = '#f8c040') {
  const r = 2 + t * 1.5;
  ctx.fillStyle = t < 2 ? '#fff8e0' : color;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + t * 0.5;
    ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 3, 3);
  }
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
}

// Defensive-special shockwave ring.
export function drawRing(ctx, x, y, t) {
  const r = 4 + t * 3;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t / 12);
  ctx.strokeStyle = '#88d8f8';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y - 10, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#f0f0ff';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y - 10, r - 2, (r - 2) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// Fat man's flame cone. t 0..1 over the breath.
export function drawFlame(ctx, x, y, face, t, frame) {
  const len = 12 + t * 30;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (face < 0) ctx.scale(-1, 1);
  for (let i = 0; i < len; i += 4) {
    const spread = 2 + (i / len) * 9;
    const jig = ((frame * 3 + i * 7) % 5) - 2;
    ctx.fillStyle = i % 8 < 4 ? '#f86818' : '#f8b030';
    ctx.fillRect(i, -spread + jig, 4, spread * 2);
    if (i % 12 === 0) { ctx.fillStyle = '#f8e880'; ctx.fillRect(i, -1 + jig, 3, 3); }
  }
  ctx.restore();
}

export function drawKnifeProj(ctx, x, y, frame) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate((frame % 8) * (Math.PI / 4));
  ctx.fillStyle = '#d8dce8'; ctx.fillRect(-5, -1, 7, 2);
  ctx.fillStyle = '#6a4820'; ctx.fillRect(2, -1, 3, 2);
  ctx.restore();
}

export function drawBullet(ctx, x, y) {
  ctx.fillStyle = '#f8e880';
  ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 2);
  ctx.fillStyle = '#f89030';
  ctx.fillRect(Math.round(x) - 3, Math.round(y), 2, 1);
}
