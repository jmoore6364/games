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

function playerCar() {
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
    R(g, 18, 16, 8, 4, '#e0e0d0');                       // plate
    g.fillStyle = '#333'; g.font = 'bold 4px monospace'; g.textAlign = 'center';
    g.fillText('MOORE', 22, 19.5);
    R(g, 4, 21, 36, 1, '#7c0c0c');
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
    player: playerCar(),
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
  };
}
