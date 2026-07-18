// All art is generated at runtime onto offscreen canvases — no asset files.
// Sprites are drawn at a small logical resolution and scaled up with crisp
// pixels, matching the rest of the Moore Arcade's pixel style.

const PX = 3; // pre-scale factor for crispness

function mk(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w * PX; c.height = h * PX;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.scale(PX, PX);
  draw(g);
  return c;
}
function R(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); }

// --- vehicles ---------------------------------------------------------------

function carRear(body, dark, glass) {
  return mk(40, 26, (g) => {
    R(g, 2, 22, 36, 3, 'rgba(0,0,0,0.35)');            // shadow
    R(g, 3, 16, 8, 8, '#101010'); R(g, 29, 16, 8, 8, '#101010'); // tires
    R(g, 4, 20, 6, 2, '#3a3a3a'); R(g, 30, 20, 6, 2, '#3a3a3a');
    R(g, 4, 10, 32, 10, body);                          // body
    R(g, 2, 12, 4, 7, dark); R(g, 34, 12, 4, 7, dark);  // fenders
    R(g, 8, 4, 24, 7, body);                            // cabin
    R(g, 10, 5, 20, 5, glass);                          // rear window
    R(g, 5, 12, 6, 3, '#ff4a30'); R(g, 29, 12, 6, 3, '#ff4a30'); // taillights
    R(g, 16, 15, 8, 4, '#d8d8c8');                      // plate
    R(g, 4, 19, 32, 1, dark);
  });
}

function sportsRear(body, dark, stripe) {
  return mk(42, 24, (g) => {
    R(g, 3, 20, 36, 3, 'rgba(0,0,0,0.35)');
    R(g, 3, 14, 9, 8, '#101010'); R(g, 30, 14, 9, 8, '#101010');
    R(g, 4, 9, 34, 10, body);
    R(g, 2, 11, 4, 6, dark); R(g, 36, 11, 4, 6, dark);
    R(g, 6, 3, 30, 3, dark);                            // spoiler
    R(g, 8, 6, 3, 4, dark); R(g, 31, 6, 3, 4, dark);    // spoiler struts
    R(g, 11, 6, 20, 4, '#20242c');                      // window
    R(g, 18, 9, 6, 10, stripe);                         // racing stripe
    R(g, 5, 11, 5, 3, '#ff4a30'); R(g, 32, 11, 5, 3, '#ff4a30');
    R(g, 17, 14, 8, 3, '#d8d8c8');
  });
}

function truckRear() {
  return mk(44, 36, (g) => {
    R(g, 3, 32, 38, 3, 'rgba(0,0,0,0.4)');
    R(g, 3, 26, 10, 8, '#101010'); R(g, 31, 26, 10, 8, '#101010');
    R(g, 4, 2, 36, 26, '#c8c2b4');                      // box
    R(g, 4, 2, 36, 3, '#a8a294');
    R(g, 6, 8, 32, 14, '#b6b0a2');
    g.fillStyle = '#7a4420'; g.font = 'bold 6px monospace'; g.textAlign = 'center';
    g.fillText('MOORE', 22, 15); g.fillText('FREIGHT', 22, 21);
    R(g, 5, 28, 6, 3, '#ff4a30'); R(g, 33, 28, 6, 3, '#ff4a30');
    R(g, 4, 24, 36, 2, '#55503f');
  });
}

function carFront(body, dark, night) {
  return mk(40, 24, (g) => {
    R(g, 2, 20, 36, 3, 'rgba(0,0,0,0.35)');
    R(g, 3, 14, 8, 8, '#101010'); R(g, 29, 14, 8, 8, '#101010');
    R(g, 4, 9, 32, 9, body);
    R(g, 2, 11, 4, 6, dark); R(g, 34, 11, 4, 6, dark);
    R(g, 9, 3, 22, 7, body);
    R(g, 11, 4, 18, 5, '#2a3038');                      // windshield
    const head = night ? '#fff8c0' : '#e8e4d0';
    R(g, 5, 11, 6, 4, head); R(g, 29, 11, 6, 4, head);  // headlights
    if (night) {                                        // glow
      g.fillStyle = 'rgba(255,244,180,0.35)';
      g.fillRect(3, 9, 10, 8); g.fillRect(27, 9, 10, 8);
    }
    R(g, 14, 12, 12, 3, '#3a3a3a');                     // grille
  });
}

function plate(g) {
  R(g, 18, 16, 8, 4, '#e0e0d0');
  g.fillStyle = '#333'; g.font = 'bold 4px monospace'; g.textAlign = 'center';
  g.fillText('MOORE', 22, 19.5);
}

function roadsterCar() { // red convertible: the balanced ride
  return mk(44, 28, (g) => {
    R(g, 3, 24, 38, 3, 'rgba(0,0,0,0.4)');
    R(g, 3, 17, 10, 9, '#0c0c0c'); R(g, 31, 17, 10, 9, '#0c0c0c'); // tires
    R(g, 4, 22, 8, 2, '#404040'); R(g, 32, 22, 8, 2, '#404040');   // treads
    R(g, 4, 11, 36, 11, '#d42222');                      // body
    R(g, 2, 13, 4, 7, '#9c1414'); R(g, 38, 13, 4, 7, '#9c1414');   // fenders
    R(g, 6, 11, 32, 2, '#f05050');                       // highlight
    R(g, 8, 5, 28, 3, '#8c1010');                        // spoiler
    R(g, 10, 8, 3, 3, '#8c1010'); R(g, 31, 8, 3, 3, '#8c1010');
    R(g, 13, 7, 18, 4, '#26202a');                       // cockpit
    R(g, 19, 2, 6, 5, '#e8b06a');                        // driver head
    R(g, 19, 1, 6, 2, '#57340f');                        // hair
    R(g, 6, 13, 6, 3, '#ff5838'); R(g, 32, 13, 6, 3, '#ff5838');   // taillights
    plate(g);
    R(g, 4, 21, 36, 1, '#7c0c0c');
  });
}

function muscleCar() { // yellow muscle: top end, handful in corners
  return mk(44, 28, (g) => {
    R(g, 2, 24, 40, 3, 'rgba(0,0,0,0.4)');
    R(g, 2, 17, 11, 9, '#0c0c0c'); R(g, 31, 17, 11, 9, '#0c0c0c'); // fat tires
    R(g, 3, 22, 9, 2, '#404040'); R(g, 32, 22, 9, 2, '#404040');
    R(g, 4, 11, 36, 11, '#e8b820');                      // body
    R(g, 1, 13, 4, 7, '#b08a10'); R(g, 39, 13, 4, 7, '#b08a10');
    R(g, 18, 11, 8, 11, '#1c1c1c');                      // center stripe
    R(g, 8, 4, 28, 8, '#e8b820');                        // roof
    R(g, 10, 5, 24, 5, '#26202a');                       // rear window
    R(g, 6, 13, 6, 3, '#ff5838'); R(g, 32, 13, 6, 3, '#ff5838');
    R(g, 8, 22, 3, 2, '#888'); R(g, 33, 22, 3, 2, '#888');         // dual exhaust
    plate(g);
    R(g, 4, 21, 36, 1, '#a07c0c');
  });
}

function compactCar() { // teal compact: quick off the line, sticks to the road
  return mk(44, 28, (g) => {
    R(g, 4, 24, 36, 3, 'rgba(0,0,0,0.4)');
    R(g, 4, 17, 9, 9, '#0c0c0c'); R(g, 31, 17, 9, 9, '#0c0c0c');
    R(g, 5, 22, 7, 2, '#404040'); R(g, 32, 22, 7, 2, '#404040');
    R(g, 5, 10, 34, 12, '#16b8c8');                      // tall boxy body
    R(g, 3, 13, 4, 7, '#0e7f8a'); R(g, 37, 13, 4, 7, '#0e7f8a');
    R(g, 8, 3, 28, 9, '#16b8c8');                        // wagon roof
    R(g, 10, 4, 24, 6, '#26202a');                       // rear window
    R(g, 9, 1, 26, 2, '#0e7f8a');                        // roof rack
    R(g, 7, 13, 6, 3, '#ff5838'); R(g, 31, 13, 6, 3, '#ff5838');
    plate(g);
    R(g, 5, 21, 34, 1, '#0a5f68');
  });
}

function policeCar(phase) { // rear view, lightbar alternates by phase
  return mk(42, 28, (g) => {
    R(g, 3, 24, 36, 3, 'rgba(0,0,0,0.4)');
    R(g, 3, 16, 9, 9, '#0c0c0c'); R(g, 30, 16, 9, 9, '#0c0c0c');
    R(g, 4, 10, 34, 11, '#e8e8ec');                      // white body
    R(g, 2, 12, 4, 7, '#b8b8c0'); R(g, 36, 12, 4, 7, '#b8b8c0');
    R(g, 4, 17, 34, 4, '#1a1a20');                       // black lower band
    R(g, 8, 4, 26, 7, '#e8e8ec');                        // roof
    R(g, 10, 5, 22, 5, '#26202a');                       // rear window
    // lightbar
    R(g, 13, 1, 16, 3, '#22222a');
    R(g, 13, 1, 8, 3, phase ? '#ff2020' : '#5a0a0a');
    R(g, 21, 1, 8, 3, phase ? '#101060' : '#2040ff');
    if (phase) { g.fillStyle = 'rgba(255,60,60,0.4)'; g.fillRect(9, 0, 12, 6); }
    else { g.fillStyle = 'rgba(60,90,255,0.4)'; g.fillRect(21, 0, 12, 6); }
    R(g, 5, 12, 5, 3, '#ff4a30'); R(g, 32, 12, 5, 3, '#ff4a30');
    g.fillStyle = '#1a1a20'; g.font = 'bold 5px monospace'; g.textAlign = 'center';
    g.fillText('POLICE', 21, 15);
  });
}

function ghostCar() { // pale spectre of the roadster
  return mk(44, 28, (g) => {
    g.globalAlpha = 0.55;
    R(g, 3, 17, 10, 9, '#3a4a5a'); R(g, 31, 17, 10, 9, '#3a4a5a');
    R(g, 4, 11, 36, 11, '#9fd8e8');
    R(g, 2, 13, 4, 7, '#6fa8b8'); R(g, 38, 13, 4, 7, '#6fa8b8');
    R(g, 8, 5, 28, 3, '#6fa8b8');
    R(g, 13, 7, 18, 4, '#4a6a7a');
    R(g, 19, 2, 6, 5, '#cfeaf4');
    R(g, 6, 13, 6, 3, '#e8ffff'); R(g, 32, 13, 6, 3, '#e8ffff');
    R(g, 18, 16, 8, 4, '#cfeaf4');
    g.globalAlpha = 1;
  });
}

// --- scenery ----------------------------------------------------------------

function palm() {
  return mk(48, 64, (g) => {
    R(g, 22, 24, 5, 40, '#8a5a2a');
    R(g, 23, 24, 2, 40, '#a8743c');
    g.fillStyle = '#2f9e44';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      g.save(); g.translate(24, 22); g.rotate(a);
      g.fillRect(0, -2, 20, 5);
      g.restore();
    }
    R(g, 21, 18, 7, 7, '#237a34');
    R(g, 20, 22, 3, 3, '#c99a3f'); R(g, 26, 23, 3, 3, '#c99a3f'); // coconuts
  });
}

function pineBush(dry) {
  return mk(26, 18, (g) => {
    const c1 = dry ? '#a8853c' : '#2f7d3a', c2 = dry ? '#8f6f30' : '#256630';
    R(g, 3, 8, 20, 9, c2);
    R(g, 6, 4, 14, 8, c1);
    R(g, 10, 2, 6, 4, c1);
  });
}

function pine() {
  return mk(36, 52, (g) => {
    R(g, 16, 42, 4, 10, '#6b4a26');                      // trunk
    g.fillStyle = '#2a6b3c';
    const tier = (y, half) => {
      g.beginPath();
      g.moveTo(18, y - 12); g.lineTo(18 - half, y); g.lineTo(18 + half, y);
      g.closePath(); g.fill();
    };
    tier(44, 15); tier(34, 12); tier(24, 9); tier(15, 6);
    g.fillStyle = '#e8f2f8';                             // snow dusting
    R(g, 10, 42, 6, 2, '#e8f2f8'); R(g, 22, 42, 6, 2, '#e8f2f8');
    R(g, 12, 32, 5, 2, '#e8f2f8'); R(g, 20, 32, 5, 2, '#e8f2f8');
    R(g, 14, 22, 8, 2, '#e8f2f8');
    R(g, 16, 3, 4, 3, '#e8f2f8');
  });
}

function oak(kind) { // autumn tree — 0 orange, 1 red, 2 gold
  const canopy = ['#e07b28', '#c8452a', '#e0a828'][kind % 3];
  const shade = ['#b85e18', '#9c3320', '#b8861a'][kind % 3];
  return mk(46, 56, (g) => {
    R(g, 20, 34, 6, 22, '#6b4a26');                      // trunk
    R(g, 21, 34, 2, 22, '#835a30');
    g.fillStyle = shade;
    g.beginPath(); g.arc(23, 24, 18, 0, 7); g.fill();
    g.fillStyle = canopy;
    g.beginPath(); g.arc(15, 20, 12, 0, 7); g.fill();
    g.beginPath(); g.arc(31, 20, 12, 0, 7); g.fill();
    g.beginPath(); g.arc(23, 13, 12, 0, 7); g.fill();
    R(g, 11, 16, 3, 3, '#f0b858'); R(g, 31, 14, 3, 3, '#f0b858'); // leaf glints
  });
}

function barn() {
  return mk(72, 54, (g) => {
    R(g, 6, 24, 60, 30, '#a83228');                      // walls
    R(g, 6, 24, 60, 4, '#8a2820');
    g.fillStyle = '#6b4a30';                             // roof
    g.beginPath(); g.moveTo(2, 24); g.lineTo(36, 6); g.lineTo(70, 24); g.closePath(); g.fill();
    g.fillStyle = '#7c5638'; g.fillRect(2, 22, 68, 3);
    R(g, 28, 34, 16, 20, '#7a231c');                     // door
    R(g, 35, 34, 2, 20, '#5a1812');
    g.strokeStyle = '#e8e0d0'; g.lineWidth = 1.5;        // white X trim
    g.beginPath(); g.moveTo(28, 34); g.lineTo(44, 54); g.moveTo(44, 34); g.lineTo(28, 54); g.stroke();
    R(g, 12, 32, 8, 8, '#e8d088'); R(g, 52, 32, 8, 8, '#e8d088');
  });
}

function willow() { // bayou moss-draped tree
  return mk(48, 60, (g) => {
    R(g, 22, 30, 5, 30, '#4a3a28');
    g.fillStyle = '#3f6b3a';
    g.beginPath(); g.arc(24, 20, 16, 0, 7); g.fill();
    g.beginPath(); g.arc(12, 24, 10, 0, 7); g.fill();
    g.beginPath(); g.arc(36, 24, 10, 0, 7); g.fill();
    g.strokeStyle = '#8a9a62'; g.lineWidth = 2;          // hanging moss
    for (let x = 8; x <= 40; x += 5) {
      g.beginPath(); g.moveTo(x, 28); g.lineTo(x + 1, 30 + 12 + (x % 3) * 5); g.stroke();
    }
  });
}

function reeds() {
  return mk(30, 28, (g) => {
    g.strokeStyle = '#7a9a4a'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = 3 + i * 3;
      g.beginPath(); g.moveTo(x, 28); g.lineTo(x + (i % 2 ? 3 : -3), 28 - 15 - (i % 3) * 4); g.stroke();
    }
    R(g, 9, 9, 2, 5, '#8a6a3a'); R(g, 18, 7, 2, 5, '#8a6a3a'); // cattails
  });
}

function deadTree() { // charred volcano snag
  return mk(40, 54, (g) => {
    R(g, 18, 18, 5, 36, '#2a2420');
    g.strokeStyle = '#2a2420'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(20, 30); g.lineTo(7, 18);
    g.moveTo(20, 26); g.lineTo(33, 11);
    g.moveTo(20, 34); g.lineTo(31, 26);
    g.moveTo(20, 21); g.lineTo(14, 7);
    g.stroke();
    g.fillStyle = 'rgba(255,120,40,0.5)'; g.fillRect(13, 50, 15, 4);
  });
}

function lavaRock() {
  return mk(40, 26, (g) => {
    R(g, 4, 12, 32, 14, '#2a2228');
    R(g, 8, 7, 22, 8, '#3a3038');
    R(g, 12, 4, 10, 4, '#443a44');
    g.fillStyle = 'rgba(255,110,40,0.32)'; g.fillRect(6, 18, 28, 6);
    g.strokeStyle = '#ff7a28'; g.lineWidth = 1.5;        // glowing cracks
    g.beginPath();
    g.moveTo(10, 24); g.lineTo(16, 16); g.lineTo(22, 22);
    g.moveTo(24, 13); g.lineTo(30, 20);
    g.stroke();
  });
}

function cactus() {
  return mk(32, 48, (g) => {
    R(g, 14, 6, 6, 42, '#3e8e41');
    R(g, 15, 6, 2, 42, '#5cb85f');
    R(g, 4, 14, 5, 14, '#3e8e41'); R(g, 4, 14, 10, 5, '#3e8e41');   // left arm
    R(g, 24, 20, 5, 12, '#3e8e41'); R(g, 19, 20, 10, 5, '#3e8e41'); // right arm
    R(g, 5, 15, 2, 12, '#5cb85f'); R(g, 25, 21, 2, 10, '#5cb85f');
  });
}

function rock() {
  return mk(36, 22, (g) => {
    R(g, 4, 10, 28, 12, '#8a8478');
    R(g, 8, 5, 18, 8, '#9a948a');
    R(g, 12, 3, 8, 4, '#a6a096');
    R(g, 6, 16, 24, 6, '#77726a');
  });
}

function mesa() {
  return mk(96, 44, (g) => {
    R(g, 6, 12, 84, 32, '#b0603a');
    R(g, 0, 24, 96, 20, '#a05534');
    R(g, 12, 6, 60, 8, '#c06c42');
    R(g, 12, 6, 60, 3, '#d07c50');
    R(g, 20, 14, 4, 30, '#8f4a2c'); R(g, 52, 14, 4, 30, '#8f4a2c'); // striations
  });
}

function lamp() {
  return mk(18, 56, (g) => {
    R(g, 8, 6, 3, 50, '#55565e');
    R(g, 8, 6, 9, 3, '#55565e');
    R(g, 14, 8, 4, 3, '#ffe9a0');
    g.fillStyle = 'rgba(255,233,160,0.35)'; g.fillRect(12, 6, 8, 8);
  });
}

function building(variant, night) {
  const palettes = [
    ['#5f6672', '#4c525c'], ['#7a5f52', '#64504a'], ['#4c5a6e', '#3d4a5c'],
  ];
  const [wall, side] = palettes[variant % palettes.length];
  const H = 96, W = 64;
  return mk(W, H, (g) => {
    R(g, 4, 8, W - 8, H - 8, wall);
    R(g, 4, 8, 6, H - 8, side);
    R(g, 4, 8, W - 8, 4, side);
    for (let y = 16; y < H - 8; y += 10) {
      for (let x = 14; x < W - 10; x += 9) {
        const lit = night && ((x * 31 + y * 17 + variant * 7) % 5 < 2);
        R(g, x, y, 5, 6, lit ? '#ffd75e' : (night ? '#141824' : '#aec6d8'));
      }
    }
    if (variant === 1) { R(g, 20, 0, 4, 10, '#3a3a3a'); }           // antenna
  });
}

function billboard(text, sub, neon) {
  return mk(72, 44, (g) => {
    R(g, 10, 26, 4, 18, '#6b5334'); R(g, 58, 26, 4, 18, '#6b5334');
    R(g, 2, 2, 68, 26, neon ? '#181828' : '#f2ead2');
    g.strokeStyle = neon ? '#ff4fd8' : '#8a6a3a'; g.lineWidth = 2;
    g.strokeRect(3, 3, 66, 24);
    g.fillStyle = neon ? '#41f0ff' : '#33322e';
    g.font = 'bold 8px monospace'; g.textAlign = 'center';
    g.fillText(text, 36, 14);
    g.fillStyle = neon ? '#ff4fd8' : '#b03a2a';
    g.font = 'bold 6px monospace';
    g.fillText(sub, 36, 23);
  });
}

function arch(text, isStart) {
  return mk(140, 44, (g) => {
    R(g, 2, 6, 8, 38, '#c8c8d0'); R(g, 130, 6, 8, 38, '#c8c8d0');
    R(g, 2, 6, 8, 3, '#88889a'); R(g, 130, 6, 8, 3, '#88889a');
    R(g, 2, 4, 136, 14, isStart ? '#c81e1e' : '#1e50c8');
    // checkered strip
    for (let x = 2; x < 138; x += 4) {
      R(g, x, 16, 4, 3, ((x / 4) % 2 === 0) ? '#fff' : '#111');
    }
    g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.textAlign = 'center';
    g.fillText(text, 70, 13);
  });
}

// --- backgrounds (horizontally tileable parallax layers) ---------------------

function layer(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  return c;
}

// periodic pseudo-random per column index → tileable
function colHash(i, n, salt) {
  const k = ((i % n) + n) % n;
  const t = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453;
  return t - Math.floor(t);
}

export function buildBackground(course) {
  const W = 1024, H = 200;
  let far, near;
  if (course.bg === 'ocean') {
    far = layer(W, H, (g) => {
      // distant headlands
      g.fillStyle = '#5b86b0';
      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2;
        const y = 90 - 34 * Math.max(0, Math.sin(t * 2 + 1)) - 18 * Math.max(0, Math.sin(t * 5 + 4));
        g.fillRect(x, y, 1, H - y);
      }
      // sea
      g.fillStyle = '#2a6fa8'; g.fillRect(0, 120, W, H - 120);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 90; i++) {
        g.fillRect(colHash(i, 90, 1) * W, 124 + colHash(i, 90, 2) * 60, 6 + colHash(i, 90, 3) * 10, 1);
      }
    });
    near = layer(W, H, (g) => {
      g.fillStyle = '#3f8e50';
      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2;
        const y = 150 - 22 * Math.max(0, Math.sin(t * 3 + 2)) - 12 * Math.sin(t * 7);
        g.fillRect(x, y, 1, H - y);
      }
    });
  } else if (course.bg === 'desert') {
    far = layer(W, H, (g) => {
      g.fillStyle = '#b0603a';
      const n = 8;
      for (let i = 0; i < n; i++) {
        const bx = (i / n) * W + colHash(i, n, 5) * 60;
        const bw = 70 + colHash(i, n, 6) * 90;
        const by = 60 + colHash(i, n, 7) * 40;
        g.fillRect(bx, by, bw, H - by);
        g.fillRect(bx % W - W, by, bw, H - by); // wrap
        g.fillStyle = '#c06c42'; g.fillRect(bx, by, bw, 6); g.fillRect(bx % W - W, by, bw, 6);
        g.fillStyle = '#b0603a';
      }
      g.fillStyle = '#c98d54'; g.fillRect(0, 150, W, H - 150);
    });
    near = layer(W, H, (g) => {
      g.fillStyle = '#c99a5f';
      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2;
        const y = 160 - 16 * Math.max(0, Math.sin(t * 4 + 1)) - 8 * Math.sin(t * 9 + 3);
        g.fillRect(x, y, 1, H - y);
      }
      // cacti silhouettes
      g.fillStyle = '#7a5a30';
      const n = 14;
      for (let i = 0; i < n; i++) {
        const x = colHash(i, n, 9) * W, y = 150 + colHash(i, n, 10) * 20;
        g.fillRect(x, y - 18, 4, 18); g.fillRect(x - 5, y - 12, 14, 3);
      }
    });
  } else if (course.bg === 'mountain') {
    far = layer(W, H, (g) => {
      // snowy peaks, two ridges
      for (const [color, base, amp, k, off] of [
        ['#b9cfdd', 70, 42, 3, 1.2], ['#d7e6ef', 95, 38, 5, 4.1],
      ]) {
        g.fillStyle = color;
        for (let x = 0; x < W; x++) {
          const t = (x / W) * Math.PI * 2;
          const y = base - amp * Math.abs(Math.sin(t * k + off)) - 12 * Math.sin(t * 7 + off * 2);
          g.fillRect(x, y, 1, H - y);
        }
      }
      // snow caps
      g.fillStyle = '#f3f9fc';
      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2;
        const y = 70 - 42 * Math.abs(Math.sin(t * 3 + 1.2)) - 12 * Math.sin(t * 7 + 2.4);
        if (y < 52) g.fillRect(x, y, 1, 10);
      }
    });
    near = layer(W, H, (g) => {
      // dark pine ridge with jagged treetops
      g.fillStyle = '#2e5b48';
      const cols = 128, cw = W / cols;
      for (let i = 0; i < cols; i++) {
        const y = 150 - 14 * colHash(i, cols, 21) - 10 * Math.abs(Math.sin((i / cols) * Math.PI * 6));
        g.fillRect(i * cw, y, cw, H - y);
        g.fillRect(i * cw + cw / 2 - 1, y - 6, 2, 6);    // treetop spike
      }
    });
  } else if (course.bg === 'forest') {
    far = layer(W, H, (g) => {
      // hazy rolling hills
      for (const [color, base, amp, k, off] of [
        ['#8fae7a', 96, 30, 2, 0.5], ['#7a9e68', 122, 26, 4, 3.0],
      ]) {
        g.fillStyle = color;
        for (let x = 0; x < W; x++) {
          const t = (x / W) * Math.PI * 2;
          const y = base - amp * Math.max(0, Math.sin(t * k + off)) - 10 * Math.sin(t * 6 + off);
          g.fillRect(x, y, 1, H - y);
        }
      }
    });
    near = layer(W, H, (g) => {
      // autumn tree line
      const cols = 96, cw = W / cols;
      for (let i = 0; i < cols; i++) {
        const col = ['#c8642a', '#a83e24', '#c89a2a', '#4a7a3a'][Math.floor(colHash(i, cols, 31) * 4)];
        const y = 150 - 18 * colHash(i, cols, 32);
        g.fillStyle = col;
        g.beginPath(); g.arc(i * cw + cw / 2, y, cw * 0.95, 0, 7); g.fill();
        g.fillRect(i * cw, y, cw + 1, H - y);
      }
    });
  } else if (course.bg === 'bayou') {
    far = layer(W, H, (g) => {
      // distant murky treeline
      g.fillStyle = '#3a5442';
      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2;
        const y = 100 - 20 * Math.max(0, Math.sin(t * 3 + 1)) - 12 * Math.abs(Math.sin(t * 8));
        g.fillRect(x, y, 1, H - y);
      }
      // still water
      g.fillStyle = '#4a5e48'; g.fillRect(0, 140, W, H - 140);
      g.fillStyle = 'rgba(190,205,150,0.16)';
      for (let i = 0; i < 60; i++) g.fillRect(colHash(i, 60, 41) * W, 144 + colHash(i, 60, 42) * 50, 8, 1);
    });
    near = layer(W, H, (g) => {
      // cypress silhouettes
      g.fillStyle = '#26382c';
      const n = 12;
      for (let i = 0; i < n; i++) {
        const x = colHash(i, n, 43) * W;
        g.fillRect(x, 120, 5, H - 120);
        g.beginPath(); g.arc(x + 2, 122, 14, 0, 7); g.fill();
      }
    });
  } else if (course.bg === 'volcano') {
    far = layer(W, H, (g) => {
      // ash-haze ridges
      g.fillStyle = '#3a2028';
      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2;
        const y = 112 - 30 * Math.abs(Math.sin(t * 2 + 0.6)) - 14 * Math.sin(t * 5);
        g.fillRect(x, y, 1, H - y);
      }
      // the cone
      const cx = 300;
      g.fillStyle = '#241820';
      g.beginPath(); g.moveTo(cx - 90, H); g.lineTo(cx, 30); g.lineTo(cx + 90, H); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,90,26,0.15)'; g.beginPath(); g.arc(cx, 40, 42, 0, 7); g.fill();
      g.fillStyle = '#ff5a1a';                            // crater
      g.beginPath(); g.moveTo(cx - 14, 44); g.lineTo(cx, 30); g.lineTo(cx + 14, 44); g.closePath(); g.fill();
      g.strokeStyle = '#ff7a28'; g.lineWidth = 2;         // lava flow
      g.beginPath(); g.moveTo(cx, 40); g.lineTo(cx - 8, 92); g.lineTo(cx + 4, H); g.stroke();
    });
    near = layer(W, H, (g) => {
      // charred rock ridge + embers
      g.fillStyle = '#1c161a';
      const cols = 80, cw = W / cols;
      for (let i = 0; i < cols; i++) {
        const y = 158 - 16 * colHash(i, cols, 51) - 8 * Math.abs(Math.sin(i * 0.7));
        g.fillRect(i * cw, y, cw + 1, H - y);
      }
      g.fillStyle = '#ff7a28';
      for (let i = 0; i < 40; i++) g.fillRect(colHash(i, 40, 52) * W, 150 + colHash(i, 40, 53) * 40, 2, 2);
    });
  } else { // city night
    far = layer(W, H, (g) => {
      // stars
      g.fillStyle = '#cfd8ff';
      for (let i = 0; i < 120; i++) {
        g.fillRect(colHash(i, 120, 11) * W, colHash(i, 120, 12) * 70, 1, 1);
      }
      // moon
      g.fillStyle = '#f3edd0'; g.beginPath(); g.arc(180, 40, 16, 0, 7); g.fill();
      g.fillStyle = '#0a0a24'; g.beginPath(); g.arc(187, 36, 14, 0, 7); g.fill();
      // skyline
      const cols = 32, cw = W / cols;
      for (let i = 0; i < cols; i++) {
        const bh = 40 + colHash(i, cols, 13) * 90;
        g.fillStyle = '#141230';
        g.fillRect(i * cw, H - bh, cw - 3, bh);
        for (let wy = H - bh + 6; wy < H - 6; wy += 8) {
          for (let wx = i * cw + 3; wx < (i + 1) * cw - 6; wx += 6) {
            if (colHash(wx * 7 + wy, 997, 14) < 0.4) {
              g.fillStyle = '#ffd75e'; g.fillRect(wx, wy, 2, 3);
            }
          }
        }
      }
    });
    near = layer(W, H, (g) => {
      const cols = 20, cw = W / cols;
      for (let i = 0; i < cols; i++) {
        const bh = 30 + colHash(i, cols, 15) * 60;
        g.fillStyle = '#0c0b20';
        g.fillRect(i * cw, H - bh, cw - 4, bh);
        for (let wy = H - bh + 5; wy < H - 5; wy += 7) {
          for (let wx = i * cw + 3; wx < (i + 1) * cw - 7; wx += 7) {
            if (colHash(wx * 3 + wy * 5, 991, 16) < 0.3) {
              g.fillStyle = '#7ee8ff'; g.fillRect(wx, wy, 2, 3);
            }
          }
        }
      }
    });
  }
  return { far, near };
}

// --- atlas -------------------------------------------------------------------

// worldW = width in world units (road half-width is 1000 at roadWidth 2000)
export function buildSprites(night) {
  return {
    palm:          { img: palm(),                         worldW: 1500 },
    pine:          { img: pine(),                         worldW: 1300 },
    oak0:          { img: oak(0),                         worldW: 1450 },
    oak1:          { img: oak(1),                         worldW: 1450 },
    oak2:          { img: oak(2),                         worldW: 1450 },
    barn:          { img: barn(),                         worldW: 2700 },
    willow:        { img: willow(),                       worldW: 1550 },
    reeds:         { img: reeds(),                         worldW: 750 },
    deadTree:      { img: deadTree(),                     worldW: 1250 },
    lavaRock:      { img: lavaRock(),                     worldW: 1150 },
    bush:          { img: pineBush(false),                worldW: 800 },
    bushDry:       { img: pineBush(true),                 worldW: 800 },
    cactus:        { img: cactus(),                       worldW: 900 },
    rock:          { img: rock(),                         worldW: 1100 },
    mesa:          { img: mesa(),                         worldW: 3400 },
    lamp:          { img: lamp(),                         worldW: 550 },
    building0:     { img: building(0, night),             worldW: 3800 },
    building1:     { img: building(1, night),             worldW: 3800 },
    building2:     { img: building(2, night),             worldW: 3800 },
    billboard0:    { img: billboard('MOORE MOTORS', 'DRIVE ONE TODAY', false), worldW: 2400 },
    billboard1:    { img: billboard("MOE'S DINER", 'NEXT EXIT', false),        worldW: 2400 },
    billboard2:    { img: billboard('SUNSET COLA', 'ICE COLD', false),         worldW: 2400 },
    billboardNeon0:{ img: billboard('MOORE CITY', 'HOTEL - VACANCY', true),    worldW: 2400 },
    billboardNeon1:{ img: billboard('ARCADE', 'OPEN ALL NIGHT', true),         worldW: 2400 },
    archStart:     { img: arch('START / FINISH', true),   worldW: 5400, arch: true },
    archCheck:     { img: arch('CHECKPOINT', false),      worldW: 5400, arch: true },
  };
}

export function buildVehicles(night) {
  return {
    players: [roadsterCar(), muscleCar(), compactCar()],
    rivals: [
      sportsRear('#2255d4', '#173a92', '#ffffff'),
      sportsRear('#f2b820', '#b1860f', '#111111'),
      sportsRear('#28a34a', '#1b7434', '#ffffff'),
      sportsRear('#9b30d0', '#6e2094', '#ffe45e'),
      sportsRear('#e8e8e8', '#a8a8a8', '#d42222'),
      sportsRear('#ff6a1a', '#c04a0a', '#ffffff'),
      sportsRear('#16b8c8', '#0e7f8a', '#ffffff'),
    ],
    traffic: [
      carRear('#8899aa', '#5f6d7a', '#324048'),
      carRear('#b06a4a', '#7d4a32', '#324048'),
      carRear('#4a7a5a', '#33553e', '#324048'),
      truckRear(),
    ],
    oncoming: [
      carFront('#a05a68', '#703c48', night),
      carFront('#5a78a0', '#3c5270', night),
      carFront('#7a7a5a', '#55553c', night),
    ],
    police: [policeCar(0), policeCar(1)],
    ghost: ghostCar(),
  };
}
