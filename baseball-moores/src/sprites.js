// Baseball Moores — procedural chibi pixel sprites with team palette swaps,
// plus field/diamond rendering helpers. Browser-only (sim.js never imports it).

function bake(rows, pal, scale = 1) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

// ---- chibi bodies: big head, small body. 14 wide x 16 tall. ----
// c=cap J=jersey j=jersey-dark s=skin S=skin-shade p=pants e=eye k=shoe g=glove t=trim
const STAND_F1 = [
  '....cccccc....',
  '...cccccccc...',
  '...cttttttc...',
  '..cssssssssc..',
  '..seesseesse..',
  '..ssssssssss..',
  '...ssssssss...',
  '....JJJJJJ....',
  '...JJtJJtJJ...',
  '..sJJJJJJJJs..',
  '..sJJJJJJJJs..',
  '...pppppppp...',
  '...pp....pp...',
  '...pp....pp...',
  '..kkk....kkk..',
  '..............',
];
const STAND_F2 = [
  '....cccccc....',
  '...cccccccc...',
  '...cttttttc...',
  '..cssssssssc..',
  '..seesseesse..',
  '..ssssssssss..',
  '...ssssssss...',
  '....JJJJJJ....',
  '..sJJtJJtJJs..',
  '..sJJJJJJJJs..',
  '...JJJJJJJJ...',
  '...pppppppp...',
  '..pp......pp..',
  '..pp......pp..',
  '..kkk....kkk..',
  '..............',
];
const STAND_B1 = [
  '....cccccc....',
  '...cccccccc...',
  '...cccccccc...',
  '..cssssssssc..',
  '..ssssssssss..',
  '..ssssssssss..',
  '...ssssssss...',
  '....JJJJJJ....',
  '...JtJJJJtJ...',
  '..sJJJJJJJJs..',
  '..sJJJJJJJJs..',
  '...pppppppp...',
  '...pp....pp...',
  '...pp....pp...',
  '..kkk....kkk..',
  '..............',
];
const STAND_B2 = STAND_B1.map((r, i) => (i === 12 || i === 13 ? '..pp......pp..' : i === 14 ? '..kkk....kkk..' : r));
const SIDE_1 = [
  '....ccccc.....',
  '...ccccccc....',
  '...cttttcc....',
  '..csssssc.....',
  '..seessc......',
  '..sssssc......',
  '...sssss......',
  '....JJJJ......',
  '...JJJJtg.....',
  '..sJJJJJg.....',
  '..sJJJJJ......',
  '...ppppp......',
  '...pp.pp......',
  '..pp...pp.....',
  '.kkk....kk....',
  '..............',
];
const SIDE_2 = [
  '....ccccc.....',
  '...ccccccc....',
  '...cttttcc....',
  '..csssssc.....',
  '..seessc......',
  '..sssssc......',
  '...sssss......',
  '....JJJJ......',
  '...JJJJtg.....',
  '..sJJJJJg.....',
  '..sJJJJJ......',
  '...ppppp......',
  '...pppp.......',
  '...pp.pp......',
  '..kk...kkk....',
  '..............',
];
// batter stance (facing right, bat raised up-left)
const BAT_STANCE = [
  '.b....cccccc..',
  '.b...cccccccc.',
  '.b...cttttttc.',
  '.b..csssssss..',
  '.b..seesssc...',
  '.gg.sssssss...',
  '..gg.ssssss...',
  '...ggJJJJJ....',
  '...JJtJJtJ....',
  '..sJJJJJJJs...',
  '..sJJJJJJJs...',
  '...ppppppp....',
  '...pp...pp....',
  '..pp....pp....',
  '.kkk....kkk...',
  '..............',
];
const BAT_SWING = [
  '..............',
  '.....cccccc...',
  '....cccccccc..',
  '....cttttttc..',
  '...csssssss...',
  '...seessssgg..',
  '...ssssssgg.bb',
  '....JJJJgg.b..',
  '...JJtJJtJ....',
  '..sJJJJJJJs...',
  '..sJJJJJJJs...',
  '...ppppppp....',
  '..pp....pp....',
  '..pp....pp....',
  '.kkk....kkk...',
  '..............',
];
const BAT_BUNT = [
  '.....cccccc...',
  '....cccccccc..',
  '....cttttttc..',
  '...csssssss...',
  '...seesssc....',
  '..gsssssssg...',
  '..g.bbbbb..g..',
  '....JJJJJ.....',
  '...JJtJJtJ....',
  '..sJJJJJJJs...',
  '..sJJJJJJJs...',
  '...ppppppp....',
  '...pp...pp....',
  '..pp....pp....',
  '.kkk....kkk...',
  '..............',
];
// pitcher wind-up (facing down/toward camera)
const PITCH_WIND = [
  '....cccccc..g.',
  '...ccccccc gg.',
  '...cttttttcg..',
  '..cssssssssc..',
  '..seesseesse..',
  '..ssssssssss..',
  '...ssssssss...',
  '....JJJJJJ....',
  '...JJtJJtJJ...',
  '..sJJJJJJJJ...',
  '...JJJJJJJJs..',
  '...pppppppp...',
  '...pp....pp...',
  '..pp......pp..',
  '.kkk......kkk.',
  '..............',
];
const PITCH_THROW = [
  '....cccccc....',
  '...cccccccc...',
  '...cttttttc...',
  '..cssssssssc..',
  '..seesseesse..',
  '..ssssssssss..',
  '.g.ssssssss...',
  'gg..JJJJJJ....',
  '.g.JJtJJtJJ...',
  '..sJJJJJJJJs..',
  '..sJJJJJJJJs..',
  '...pppppppp...',
  '...pp....pp...',
  '..pp......pp..',
  '.kkk......kkk.',
  '..............',
];
// fielder arms-up catch
const CATCH = [
  '.g..cccccc..g.',
  'gg.cccccccc.gg',
  '.g.cttttttc.g.',
  '..cssssssssc..',
  '..seesseesse..',
  '..ssssssssss..',
  '...ssssssss...',
  '...JJJJJJJJ...',
  '..JJJtJJtJJJ..',
  '..sJJJJJJJJs..',
  '...JJJJJJJJ...',
  '...pppppppp...',
  '...pp....pp...',
  '..pp......pp..',
  '..kkk....kkk..',
  '..............',
];
const SLIDE = [
  '..............',
  '..............',
  '............cc',
  '..........ccss',
  '.........csses',
  '....JJJJJsssss',
  '..sJJJJJJJJs..',
  'ppppppJJJJ....',
  'kk.ppppp......',
  'kk............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
];

export function makeTeamSprites(colors) {
  const pal = {
    c: colors.dark, t: colors.trim, J: colors.main, j: colors.dark,
    s: '#f0c088', S: '#c89050', e: '#201818', p: '#e8e8f0', P: '#a8a8c0',
    k: '#181820', g: '#b06828', b: '#f8f0d8',
  };
  const S = 1;
  return {
    front: [bake(STAND_F1, pal, S), bake(STAND_F2, pal, S)],
    back: [bake(STAND_B1, pal, S), bake(STAND_B2, pal, S)],
    side: [bake(SIDE_1, pal, S), bake(SIDE_2, pal, S)],
    batStance: bake(BAT_STANCE, pal, S),
    batSwing: bake(BAT_SWING, pal, S),
    batBunt: bake(BAT_BUNT, pal, S),
    pitchWind: bake(PITCH_WIND, pal, S),
    pitchThrow: bake(PITCH_THROW, pal, S),
    catch: bake(CATCH, pal, S),
    slide: bake(SLIDE, pal, S),
    // big versions for the duel view
    batStanceBig: bake(BAT_STANCE, pal, 3),
    batSwingBig: bake(BAT_SWING, pal, 3),
    batBuntBig: bake(BAT_BUNT, pal, 3),
    pitchWindBig: bake(PITCH_WIND, pal, 3),
    pitchThrowBig: bake(PITCH_THROW, pal, 3),
    catchBig: bake(CATCH, pal, 3),
    colors,
  };
}

// ---- ball ----
const BALL = ['.www.', 'wwrrw', 'wwrrw', 'wwrrw', '.www.'];
const BALLPAL = { w: '#f8f8f0', r: '#d84028' };
export const SPR = {};
export function initSprites() {
  SPR.ball = bake(BALL, BALLPAL, 1);
  SPR.ballBig = bake(BALL, BALLPAL, 2);
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
  const dx = Math.round(x - 7), dy = Math.round(y - 14);
  if (flip) {
    g.save(); g.translate(dx + 14, dy); g.scale(-1, 1); g.drawImage(img, 0, 0); g.restore();
  } else g.drawImage(img, dx, dy);
}
