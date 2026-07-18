// Cinematic cutscenes, NES Ninja Gaiden style: letterboxed panels with
// large procedural pixel portraits and typewriter text. All original art.

const PW = 112, PH = 80; // portrait canvas size

function mk() {
  const c = document.createElement('canvas');
  c.width = PW; c.height = PH;
  return c;
}
const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

export const PORTRAITS = {};

function paintNinja() {
  const c = mk(), g = c.getContext('2d');
  R(g, '#0a0a18', 0, 0, PW, PH);
  R(g, '#101030', 0, 56, PW, 24);                 // rooftop
  R(g, '#183898', 26, 6, 60, 68);                 // hood mass
  R(g, '#3070e8', 30, 10, 52, 60);                // hood light
  R(g, '#183898', 34, 34, 44, 12);                // mask lower
  R(g, '#f8b088', 36, 24, 40, 10);                // eye slit skin
  R(g, '#101010', 38, 26, 36, 2);
  R(g, '#e8e8e8', 42, 26, 7, 4); R(g, '#e8e8e8', 62, 26, 7, 4);   // eyes
  R(g, '#101010', 46, 27, 3, 3); R(g, '#101010', 66, 27, 3, 3);   // pupils
  R(g, '#f82818', 26, 14, 60, 5);                 // headband
  R(g, '#f82818', 84, 16, 12, 3); R(g, '#f82818', 88, 20, 10, 3); // band tails
  R(g, '#a8a8b8', 16, 40, 5, 36);                 // sword hilt behind
  R(g, '#583818', 14, 36, 9, 7);
  return c;
}

function paintFoster() {
  const c = mk(), g = c.getContext('2d');
  R(g, '#181820', 0, 0, PW, PH);
  R(g, '#282838', 0, 60, PW, 20);
  R(g, '#303040', 22, 52, 68, 28);                // suit shoulders
  R(g, '#e8e8e8', 46, 54, 20, 26);                // shirt
  R(g, '#b02818', 52, 54, 8, 26);                 // tie
  R(g, '#f8b088', 34, 12, 44, 44);                // face
  R(g, '#583818', 30, 6, 52, 14);                 // hair
  R(g, '#583818', 30, 12, 8, 22); R(g, '#583818', 74, 12, 8, 22); // sides
  R(g, '#101010', 36, 28, 40, 10);                // sunglasses
  R(g, '#303048', 38, 30, 15, 6); R(g, '#303048', 59, 30, 15, 6); // lenses
  R(g, '#c07858', 52, 40, 8, 6);                  // nose shade
  R(g, '#101010', 48, 50, 16, 2);                 // mouth, unimpressed
  R(g, '#101010', 78, 34, 4, 4); R(g, '#404050', 80, 38, 2, 14);  // earpiece
  return c;
}

function paintVillain() {
  const c = mk(), g = c.getContext('2d');
  R(g, '#100810', 0, 0, PW, PH);
  R(g, '#903090', 20, 10, 72, 70);                // robe hood
  R(g, '#c060e0', 26, 14, 60, 60);
  R(g, '#100810', 34, 22, 44, 40);                // hood shadow
  R(g, '#d8c8b0', 42, 30, 28, 26);                // gaunt face
  R(g, '#f8d838', 44, 36, 8, 5); R(g, '#f8d838', 60, 36, 8, 5);   // glowing eyes
  R(g, '#b02818', 48, 50, 16, 2);                 // thin mouth
  R(g, '#a8a8b8', 30, 2, 8, 14); R(g, '#a8a8b8', 74, 2, 8, 14);   // horn crown
  R(g, '#a8a8b8', 40, 0, 6, 10); R(g, '#a8a8b8', 66, 0, 6, 10);
  R(g, '#f8d838', 52, 66, 8, 8);                  // amulet
  return c;
}

function paintDuel() {
  const c = mk(), g = c.getContext('2d');
  R(g, '#0a0a20', 0, 0, PW, PH);
  g.fillStyle = '#e8e8d0';
  g.beginPath(); g.arc(84, 22, 16, 0, Math.PI * 2); g.fill();     // moon
  R(g, '#101028', 0, 64, PW, 16);                 // hilltop
  R(g, '#101028', 20, 60, 30, 6); R(g, '#101028', 66, 60, 26, 6);
  // duelists (silhouettes)
  R(g, '#181838', 28, 38, 10, 26); R(g, '#181838', 26, 32, 14, 8);
  R(g, '#181838', 74, 38, 10, 26); R(g, '#181838', 72, 32, 14, 8);
  g.strokeStyle = '#a8a8b8'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(38, 46); g.lineTo(58, 34); g.stroke();  // blades crossed
  g.beginPath(); g.moveTo(74, 46); g.lineTo(54, 34); g.stroke();
  R(g, '#ffffff', 54, 32, 4, 4);                  // spark
  return c;
}

function paintStatue() {
  const c = mk(), g = c.getContext('2d');
  R(g, '#181018', 0, 0, PW, PH);
  R(g, '#302830', 36, 60, 40, 20);                // pedestal
  R(g, '#403040', 40, 56, 32, 6);
  R(g, '#504050', 46, 20, 20, 38);                // demon body
  R(g, '#504050', 30, 24, 18, 10); R(g, '#504050', 64, 24, 18, 10); // wings
  R(g, '#504050', 26, 30, 10, 16); R(g, '#504050', 76, 30, 10, 16);
  R(g, '#605060', 48, 12, 16, 12);                // head
  R(g, '#605060', 44, 8, 5, 8); R(g, '#605060', 63, 8, 5, 8);     // horns
  R(g, '#f82818', 50, 16, 4, 3); R(g, '#f82818', 58, 16, 4, 3);   // eyes
  // candles
  R(g, '#e8e8e8', 16, 66, 4, 10); R(g, '#f8d838', 16, 62, 4, 4);
  R(g, '#e8e8e8', 92, 66, 4, 10); R(g, '#f8d838', 92, 62, 4, 4);
  return c;
}

function paintDemon() {
  const c = mk(), g = c.getContext('2d');
  R(g, '#180808', 0, 0, PW, PH);
  R(g, '#b02818', 24, 12, 64, 60);                // huge face
  R(g, '#f82818', 30, 18, 52, 48);
  R(g, '#f8d838', 36, 30, 14, 8); R(g, '#f8d838', 62, 30, 14, 8); // eyes
  R(g, '#101010', 42, 32, 5, 5); R(g, '#101010', 68, 32, 5, 5);
  R(g, '#101010', 38, 52, 36, 10);                // maw
  for (let i = 0; i < 5; i++) R(g, '#e8e8e8', 40 + i * 7, 52, 4, 4);
  for (let i = 0; i < 4; i++) R(g, '#e8e8e8', 44 + i * 7, 58, 4, 4);
  R(g, '#b02818', 12, 2, 14, 22); R(g, '#b02818', 86, 2, 14, 22); // horns
  R(g, '#e07820', 16, 0, 6, 10); R(g, '#e07820', 90, 0, 6, 10);
  return c;
}

function paintDawn() {
  const c = mk(), g = c.getContext('2d');
  R(g, '#301838', 0, 0, PW, 40);
  R(g, '#803048', 0, 40, PW, 20);
  R(g, '#e07820', 0, 60, PW, 20);
  g.fillStyle = '#f8d838';
  g.beginPath(); g.arc(56, 60, 14, Math.PI, 0); g.fill();         // rising sun
  g.fillStyle = '#181020';
  for (let i = 0; i < 8; i++) R(g, '#181020', i * 15, 46 - ((i * 7) % 18), 13, 40); // skyline
  R(g, '#101018', 0, 72, PW, 8);
  // the ninja, small, watching
  R(g, '#183898', 20, 30, 6, 10); R(g, '#183898', 19, 26, 8, 5);
  R(g, '#f82818', 26, 27, 8, 2);                  // headband in the wind
  return c;
}

export function initPortraits() {
  PORTRAITS.ninja = paintNinja();
  PORTRAITS.foster = paintFoster();
  PORTRAITS.villain = paintVillain();
  PORTRAITS.duel = paintDuel();
  PORTRAITS.statue = paintStatue();
  PORTRAITS.demon = paintDemon();
  PORTRAITS.dawn = paintDawn();
}

// ---- the story: revenge, a statue, a betrayal ----
// CUTSCENES[i] plays before act i (0 = prologue); [6] = ending.

export const CUTSCENES = [
  [ // prologue
    { p: 'duel', lines: ['ONE MOONLIT NIGHT, ABOVE THE', 'CITY... KEN MOORE, MASTER OF', 'THE MOORE CLAN, WAS DEFEATED', 'IN A DUEL - AND VANISHED.'] },
    { p: 'ninja', lines: ['HIS SON FOUND ONLY A LETTER:', "'TAKE THE CLAN'S DRAGON BLADE.", 'IF I DO NOT RETURN, FOLLOW THE', "CROW TO THE CITY. AVENGE ME.'"] },
    { p: 'ninja', lines: ['TONIGHT, NINJA MOORE DESCENDS', 'INTO THE NEON STREETS.', '', 'THE HUNT BEGINS.'] },
  ],
  [ // before act II
    { p: 'foster', lines: ["'FREEZE. CIA. THE NAME IS", "FOSTER MOORE. NO RELATION -", "PROBABLY.'"] },
    { p: 'foster', lines: ["'YOUR FATHER STOLE SOMETHING", 'FROM A MAN CALLED GHIRA.', 'A STATUE. WE WANT IT TOO.', "CLIMB TALON PASS. GO ARMED.'"] },
  ],
  [ // before act III
    { p: 'villain', lines: ['ATOP THE PASS, A PALE FIGURE', 'WAITS IN THE WIND...', "'SO THE PUP CARRIES THE", "DRAGON BLADE,' GHIRA SMILES."] },
    { p: 'statue', lines: ["'TWO STATUES: LIGHT AND SHADOW.", 'JOINED, THEY WAKE A GOD.', 'YOUR FATHER TOOK ONE. CLIMB', "THE FALLS AND DIE FOR IT.'"] },
  ],
  [ // before act IV
    { p: 'statue', lines: ['MASTER KAGE FALLS. IN HIS SASH,', 'A CARVING: A DEMON, WINGS', 'FURLED. THE SHADOW STATUE.', 'ONE OF TWO.'] },
    { p: 'foster', lines: ["FOSTER: 'GHIRA'S BUYER IS THE", 'ARMY. STEEL SERPENT BASE.', "GET IN. GET IT. GET OUT.'"] },
  ],
  [ // before act V
    { p: 'foster', lines: ['IN THE VAULT - NO STATUE.', "ONLY A RADIO. FOSTER'S VOICE:", "'SORRY, KID. ORDERS. THE", "STATUES MUST WAKE.'"] },
    { p: 'villain', lines: ["'BRING ME YOUR BLOOD, AND THE", 'DEMON WAKES WHOLE. COME TO', "THE CATACOMBS, LITTLE DRAGON.'"] },
  ],
  [ // before act VI
    { p: 'villain', lines: ['GHIRA HOLDS KEN MOORE CHAINED', 'BENEATH THE FORTRESS. THE MOON', 'GOES DARK. THE STATUES SING.'] },
    { p: 'demon', lines: ["'YOUR FATHER'S SOUL FEEDS THE", 'IDOL. YOURS WILL CROWN IT.', "BEHOLD - THE DEMON MOORE.'"] },
  ],
  [ // ending
    { p: 'dawn', lines: ['THE HEART SHATTERS. THE', 'FORTRESS CRUMBLES INTO THE', 'SEA. DAWN FINDS TWO NINJAS', 'ON THE SHORE.'] },
    { p: 'ninja', lines: ["'YOU FOUGHT LIKE THE DAWN,", "SON.' KEN MOORE LIVES.", 'THE DRAGON BLADE RESTS.'] },
    { p: 'foster', lines: ['SOMEWHERE, A PHONE RINGS.', "FOSTER MOORE SMILES. 'THE", "OTHER STATUE? STILL MISSING.'", '', 'NINJA MOORE WILL RETURN.'] },
  ],
];

export class Cutscene {
  constructor(idx) {
    this.panels = CUTSCENES[idx];
    this.idx = idx;
    this.panel = 0;
    this.chars = 0;
    this.t = 0;
    this.done = false;
    this.stung = false;
  }

  total() { return this.panels[this.panel].lines.join('').length; }

  // returns true when the whole cutscene is over
  update(inp, sound) {
    this.t++;
    if (!this.stung && this.t > 4) { sound.sting(); this.stung = true; }
    const tot = this.total();
    if (this.t % 2 === 0 && this.chars < tot) {
      this.chars++;
      if (this.chars % 3 === 0) sound.blip();
    }
    if (inp.pressed('start')) { this.done = true; return true; } // Enter skips all
    if (inp.pressed('fire') || inp.pressed('jump')) {
      if (this.chars < tot) this.chars = tot;
      else {
        this.panel++;
        this.chars = 0;
        if (this.panel >= this.panels.length) { this.done = true; return true; }
      }
    }
    if (this.chars >= tot && this.t > 0 && this.tHold === undefined) this.tHold = this.t;
    if (this.chars >= tot && this.t - (this.tHold || 0) > 330) {
      this.panel++;
      this.chars = 0;
      this.tHold = undefined;
      if (this.panel >= this.panels.length) { this.done = true; return true; }
    }
    if (this.chars === 0) this.tHold = undefined;
    return false;
  }

  draw(ctx, text, frame) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 240);
    // letterbox bars
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, 256, 20);
    ctx.fillRect(0, 220, 256, 20);
    ctx.fillStyle = '#303040';
    ctx.fillRect(0, 20, 256, 1);
    ctx.fillRect(0, 219, 256, 1);

    const pn = this.panels[this.panel];
    if (!pn) return;
    // portrait, framed
    const px = (256 - PW) / 2, py = 32;
    ctx.fillStyle = '#c8c8d8';
    ctx.fillRect(px - 3, py - 3, PW + 6, PH + 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(px - 2, py - 2, PW + 4, PH + 4);
    const img = PORTRAITS[pn.p];
    if (img) ctx.drawImage(img, px, py);

    // typewriter text
    let used = 0;
    pn.lines.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, this.chars - used));
      if (take > 0) text(ctx, line.slice(0, take), 26, 130 + i * 13, '#c8c8d8', 8);
      used += line.length;
    });
    if (this.chars >= this.total() && frame % 60 < 40) {
      text(ctx, this.panel < this.panels.length - 1 ? 'SLASH: NEXT' : 'SLASH: CONTINUE', 128, 196, '#667', 8, 'center');
    }
    text(ctx, 'ENTER: SKIP', 246, 226, '#445', 8, 'right');
  }
}
