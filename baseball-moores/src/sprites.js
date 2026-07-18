// Baseball Moores — procedural chibi pixel sprites with team palette swaps,
// plus field/diamond rendering helpers. Browser-only (sim.js never imports it).

function bake(rows, pal, scale = 1) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (!ch || ch === '.' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

// palette legend:
//  o outline   c cap-crown  d cap-brim/shade  t team-trim
//  J jersey    j jersey-shade
//  s skin      S skin-shade  e eye  w white
//  p pants     P pants-shade n belt  k shoe
//  g glove     G glove-dark  b bat   B bat-dark
//  h helmet    H helmet-dark

// ============================================================
//  OVERHEAD FIELD SPRITES  (small, ~16x17, baked at scale 1)
// ============================================================
const FRONT_1 = [
  '.....oooo.......',
  '....occcco......',
  '....occcco......',
  '....odddddo.....',
  '...ossssso......',
  '...oseesso......',
  '...osssso.......',
  '...oJJJJo.......',
  '..ojtJJtjo......',
  '..oJJJJJJo......',
  '..oJJJJJJo......',
  '...oPppPo.......',
  '...opp.po.......',
  '...opp.po.......',
  '...okk.kko......',
  '..okk...kko.....',
  '................',
];
const FRONT_2 = [
  '.....oooo.......',
  '....occcco......',
  '....occcco......',
  '....odddddo.....',
  '...ossssso......',
  '...oseesso......',
  '...osssso.......',
  '...oJJJJo.......',
  '..ojtJJtjo......',
  '..oJJJJJJo......',
  '..oJJJJJJo......',
  '...oPppPo.......',
  '..opp...po......',
  '..opp...po......',
  '..okk...kko.....',
  '...okk.kko......',
  '................',
];
const BACK_1 = [
  '.....oooo.......',
  '....occcco......',
  '....occcco......',
  '....occcco......',
  '...ossssso......',
  '...osssso.......',
  '...oJJJJo.......',
  '...oJJJJo.......',
  '..ojtJJtjo......',
  '..oJJJJJJo......',
  '..oJJJJJJo......',
  '...oPppPo.......',
  '...opp.po.......',
  '...opp.po.......',
  '...okk.kko......',
  '..okk...kko.....',
  '................',
];
const BACK_2 = [
  '.....oooo.......',
  '....occcco......',
  '....occcco......',
  '....occcco......',
  '...ossssso......',
  '...osssso.......',
  '...oJJJJo.......',
  '...oJJJJo.......',
  '..ojtJJtjo......',
  '..oJJJJJJo......',
  '..oJJJJJJo......',
  '...oPppPo.......',
  '..opp...po......',
  '..opp...po......',
  '..okk...kko.....',
  '...okk.kko......',
  '................',
];
const SIDE_1 = [
  '....oooo........',
  '...occcco.......',
  '...occcddo......',
  '..ossssco.......',
  '..oseesso.......',
  '..osssso........',
  '...ossso........',
  '...oJJJgg.......',
  '..ojJJJggo......',
  '..oJJJJo........',
  '..oJJJJo........',
  '...oPpPo........',
  '...op.po........',
  '..opp.ppo.......',
  '.okk..kko.......',
  '.okko..kko......',
  '................',
];
const SIDE_2 = [
  '....oooo........',
  '...occcco.......',
  '...occcddo......',
  '..ossssco.......',
  '..oseesso.......',
  '..osssso........',
  '...ossso........',
  '...oJJJgg.......',
  '..ojJJJggo......',
  '..oJJJJo........',
  '..oJJJJo........',
  '...oPpPo........',
  '...oppo.........',
  '...op.po........',
  '..okk.kko.......',
  '.okk...kko......',
  '................',
];
const CATCH_OH = [
  'oo..oooo..oo....',
  'ggo.occco.ogg...',
  '.gooccccoog.....',
  '...odddddo......',
  '..ossssssso.....',
  '..oseessseo.....',
  '..ossssssso.....',
  '...oJJJJJo......',
  '..ojtJJtjo......',
  '..oJJJJJJo......',
  '..oJJJJJJo......',
  '...oPppPo.......',
  '...opp.po.......',
  '...opp.po.......',
  '...okk.kko......',
  '..okk...kko.....',
  '................',
];
const SLIDE_OH = [
  '................',
  '................',
  '.............ooo',
  '...........occco',
  '..........odddso',
  '.........osseeso',
  '....ooooosssssso',
  '..ojJJJJJJJJoo..',
  '.oppppppJJJJo...',
  'okkoppppppo.....',
  'okko............',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// ============================================================
//  DUEL SPRITES  (big, baked at scale 2)
// ============================================================
// -- Batter: side profile, faces right toward the mound, bat cocked up --
const BAT_STANCE = [
  '.....oooo........',
  '....occcco.......',
  '....occcco.......',
  '....odddddo......',
  '...ossssso.......',
  '...oseewso...bB..',
  '...osssso...bB...',
  '....osso...bB....',
  '...oJJJJo.gB.....',
  '..ojtJJJggo......',
  '..oJJJJJgo.......',
  '..oJJJJJJo.......',
  '..oJjJJjJo.......',
  '...onnnno........',
  '...oppppo........',
  '...oppppo........',
  '...op..po........',
  '..opp..ppo.......',
  '..okk..kko.......',
  '..okko.okko......',
];
const BAT_SWING = [
  '.....oooo........',
  '....occcco.......',
  '....occcco.......',
  '....odddddo......',
  '...ossssso.......',
  '...oseewso.......',
  '...osssso........',
  '....osso.........',
  '...oJJJJoggbbbbBB',
  '..ojtJJJtggb.....',
  '..oJJJJJJo.......',
  '..oJJJJJJo.......',
  '..oJjJJjJo.......',
  '...onnnno........',
  '...oppppo........',
  '...opp.po........',
  '..opp..ppo.......',
  '..opp..ppo.......',
  '.okk....kko......',
  '.okko...okko.....',
];
const BAT_BUNT = [
  '.....oooo........',
  '....occcco.......',
  '....occcco.......',
  '....odddddo......',
  '...ossssso.......',
  '...oseewso.......',
  '..gsssssg........',
  '..gBbbbbbbbBg....',
  '...oJJJJo........',
  '..ojtJJJtjo......',
  '..oJJJJJJo.......',
  '..oJJJJJJo.......',
  '..oJjJJjJo.......',
  '...onnnno........',
  '...oppppo........',
  '...op..po........',
  '..opp..ppo.......',
  '..okk..kko.......',
  '..okko.okko......',
  '.................',
];
// -- Pitcher: back view on the mound, faces down toward the plate --
const PITCH_SET = [
  '....oooooo......',
  '...occcccco.....',
  '...occcccco.....',
  '...odddddddo....',
  '..osssssssso....',
  '..oJJJJJJJJo....',
  '..oJJttttJJo....',
  '.soJJJJJJJJos...',
  '.SsJJJJJJJJsS...',
  '..oJJJJJJJJo....',
  '..oJjJJJJjJo....',
  '...onnnnnno.....',
  '...opppppo......',
  '...opppppo......',
  '...opp.ppo......',
  '..okkk.kkko.....',
  '..okk...kko.....',
  '................',
  '................',
  '................',
];
const PITCH_WIND = [
  '....oooooo..sS..',
  '...occccccosS...',
  '...occccccoS....',
  '...odddddddo....',
  '..osssssssso....',
  '..oJJJJJJJJo....',
  '..oJJttttJJo....',
  '..oJJJJJJJJo....',
  '..oJJJJJJJJo....',
  '..oJjJJJJjJo....',
  '...onnnnno......',
  '...opppppo......',
  '...opp.ppo......',
  '..opp...ppo.....',
  '..okk.....o.....',
  '.okko..sS.......',
  '......Ss.........',
  '................',
  '................',
  '................',
];
const PITCH_THROW = [
  '....oooooo......',
  '...occcccco.....',
  '...occcccco.....',
  '...odddddddo....',
  '..osssssssso....',
  '..oJJJJJJJJossS.',
  '..oJJttttJJJsS..',
  '..oJJJJJJJgS....',
  '..oJJJJJJJo.....',
  '..oJjJJJJjo.....',
  '...onnnnno......',
  '...opppppo......',
  '...opppppo......',
  '...opp.ppo......',
  '..opp...ppo.....',
  '..okk...kko.....',
  '..okko.okko.....',
  '................',
  '................',
  '................',
];
// -- Catcher: back view crouch behind the plate --
const CATCHER = [
  '...oooooo.......',
  '..ohhhhhho......',
  '..oHhhhhHo......',
  '..oHHHHHHo......',
  '...osssso.......',
  '.oJJJJJJJJo.....',
  'goJttttttJo....g',
  'ggJJJJJJJJoggg..',
  'g.oJJJJJJJJo.g..',
  '.oJJJJJJJJJo....',
  '.oPPPPPPPPo.....',
  '.oPP.nn.PPo.....',
  '..oPP..PPo......',
  '..okk..kko......',
  '..okko.okko.....',
  '................',
];
// -- Umpire: back view crouch, dark blue, behind the catcher --
const UMPIRE = [
  '...oooooo.......',
  '..oHHHHHHo......',
  '..oHHHHHHo......',
  '...ossso........',
  '..oJJJJJJo......',
  '.oJJJJJJJJo.....',
  '.oJJJJJJJJo.....',
  '.oJJttttJJo.....',
  '.oJJJJJJJJo.....',
  '.oPPPPPPPPo.....',
  '..oPP..PPo......',
  '..oPP..PPo......',
  '..okk..kko......',
  '..okko.okko.....',
  '................',
  '................',
];

export function makeTeamSprites(colors) {
  const pal = {
    o: '#0b0b12', c: colors.main, d: colors.dark, t: colors.trim,
    J: colors.main, j: colors.dark,
    s: '#f4c896', S: '#d29a5e', e: '#1a1216', w: '#ffffff',
    p: '#eceff6', P: '#b6bacb', n: '#2c2c36', k: '#242430',
    g: '#9c5a2a', G: '#653714', b: '#cba24c', B: '#8a6a28',
    h: '#4a4a56', H: '#22222c',
  };
  const S1 = 1, S2 = 2;
  return {
    front: [bake(FRONT_1, pal, S1), bake(FRONT_2, pal, S1)],
    back: [bake(BACK_1, pal, S1), bake(BACK_2, pal, S1)],
    side: [bake(SIDE_1, pal, S1), bake(SIDE_2, pal, S1)],
    catch: bake(CATCH_OH, pal, S1),
    slide: bake(SLIDE_OH, pal, S1),
    // big duel sprites
    batStance: bake(BAT_STANCE, pal, S2),
    batSwing: bake(BAT_SWING, pal, S2),
    batBunt: bake(BAT_BUNT, pal, S2),
    pitchSet: bake(PITCH_SET, pal, S2),
    pitchWind: bake(PITCH_WIND, pal, S2),
    pitchThrow: bake(PITCH_THROW, pal, S2),
    catcher: bake(CATCHER, pal, S2),
    colors,
  };
}

// ---- ball ----
const BALL = ['.owwo.', 'owrrwo', 'owwrwo', 'owrrwo', 'owwwwo', '.oooo.'];
const BALLPAL = { w: '#fbfbf2', r: '#d84028', o: '#8a2418' };
export const SPR = {};
export function initSprites() {
  SPR.ball = bake(BALL, BALLPAL, 1);
  SPR.ballBig = bake(BALL, BALLPAL, 2);
  const umpPal = {
    o: '#0b0b12', J: '#2a4576', j: '#16264a', t: '#c9d2e6',
    s: '#f4c896', p: '#1c1e28', P: '#12141c', k: '#101014',
    H: '#181820', h: '#2a2a34',
  };
  SPR.umpire = bake(UMPIRE, umpPal, 2);
}

// ---- team logo emblem (drawn into a small canvas) ----
export function drawLogo(g, kind, x, y, r, colors) {
  g.save();
  g.translate(x, y);
  g.fillStyle = colors.trim;
  const pts = (n, rot = 0, inner = 0.5) => {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r * inner : r;
      const a = rot + (i * Math.PI) / n;
      g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.closePath(); g.fill();
  };
  if (kind === 'star') pts(5, -Math.PI / 2, 0.45);
  else if (kind === 'ball') {
    g.fillStyle = '#f8f8f0'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.strokeStyle = '#d84028'; g.lineWidth = Math.max(1, r * 0.12);
    g.beginPath(); g.arc(-r * 0.7, 0, r, -0.6, 0.6); g.stroke();
    g.beginPath(); g.arc(r * 0.7, 0, r, Math.PI - 0.6, Math.PI + 0.6); g.stroke();
  } else if (kind === 'bolt') {
    g.beginPath(); g.moveTo(r * 0.2, -r); g.lineTo(-r * 0.4, r * 0.1);
    g.lineTo(0, r * 0.1); g.lineTo(-r * 0.2, r); g.lineTo(r * 0.5, -r * 0.2);
    g.lineTo(0, -r * 0.2); g.closePath(); g.fill();
  } else if (kind === 'crown') {
    g.beginPath(); g.moveTo(-r, r * 0.5); g.lineTo(-r, -r * 0.3); g.lineTo(-r * 0.4, r * 0.1);
    g.lineTo(0, -r * 0.6); g.lineTo(r * 0.4, r * 0.1); g.lineTo(r, -r * 0.3);
    g.lineTo(r, r * 0.5); g.closePath(); g.fill();
  } else if (kind === 'skull') {
    g.beginPath(); g.arc(0, -r * 0.2, r * 0.7, 0, 7); g.fill();
    g.fillRect(-r * 0.4, r * 0.2, r * 0.8, r * 0.5);
    g.fillStyle = colors.dark;
    g.beginPath(); g.arc(-r * 0.3, -r * 0.2, r * 0.2, 0, 7); g.fill();
    g.beginPath(); g.arc(r * 0.3, -r * 0.2, r * 0.2, 0, 7); g.fill();
  } else if (kind === 'flame') {
    g.beginPath(); g.moveTo(0, r); g.quadraticCurveTo(-r, r * 0.2, -r * 0.3, -r * 0.3);
    g.quadraticCurveTo(0, -r * 0.1, 0, -r); g.quadraticCurveTo(r * 0.2, -r * 0.1, r * 0.4, -r * 0.3);
    g.quadraticCurveTo(r, r * 0.2, 0, r); g.fill();
  } else if (kind === 'moon') {
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.fillStyle = colors.dark; g.beginPath(); g.arc(r * 0.35, 0, r * 0.85, 0, 7); g.fill();
  } else { // diamond
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); g.fill();
  }
  g.restore();
}

// draw a small chibi in the overhead field, choosing frame by movement/facing
export function drawFieldPlayer(g, spr, x, y, fx, fy, moving, phase, pose) {
  let img, flip = false;
  if (pose === 'catch') img = spr.catch;
  else if (pose === 'slide') { img = spr.slide; flip = fx < 0; }
  else {
    const fi = moving ? (Math.floor(phase) % 2) : 0;
    if (Math.abs(fx) > Math.abs(fy) * 1.2) { img = spr.side[fi]; flip = fx < 0; }
    else if (fy < 0) img = spr.back[fi];
    else img = spr.front[fi];
  }
  const dx = Math.round(x - img.width / 2), dy = Math.round(y - img.height + 2);
  if (flip) {
    g.save(); g.translate(dx + img.width, dy); g.scale(-1, 1); g.drawImage(img, 0, 0); g.restore();
  } else g.drawImage(img, dx, dy);
}
