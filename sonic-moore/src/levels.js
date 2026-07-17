// Level construction. Terrain is authored as a continuous per-pixel-column
// height profile plus CSG ops (rects, loop rings), then rasterized into
// 16px height-map tiles (each tile = 256 layer-mask bytes) with dedup.
// Sensors in physics.js query pixel solidity; loops use two collision
// layers (bit1 = right half, bit2 = left half) with path swappers.

export const TILE = 16;
const NOG = 1 << 20; // "no ground" (bottomless pit)

// ---------------------------------------------------------------------------
// Level: rasterized tile grid + entity list
// ---------------------------------------------------------------------------

export class Level {
  constructor(b, meta) {
    this.meta = meta;
    this.hT = b.hT;
    this.wT = Math.ceil(b.gY.length / TILE);
    this.wPx = this.wT * TILE;
    this.hPx = this.hT * TILE;
    // pad ground array to tile boundary
    while (b.gY.length < this.wPx) b.gY.push(b.gY[b.gY.length - 1] ?? NOG);
    this.gY = b.gY;
    this.ents = b.ents;
    this.swappers = b.swappers;
    this.loops = b.loops;
    this.startX = b.startX ?? 48;
    this.startY = (this.gY[this.startX] === NOG ? 400 : this.gY[this.startX]) - 24;
    this.bossTrigger = b.bossTrigger ?? null;
    this.bossZone = b.bossZone ?? null;
    this.rasterize(b);
  }

  rasterize(b) {
    const { wT, hT } = this;
    this.grid = new Uint16Array(wT * hT);
    const FULL = new Uint8Array(256).fill(3);
    this.tiles = [{ m: new Uint8Array(256) }, { m: FULL }];
    const dedup = new Map();
    dedup.set('\0'.repeat(256), 0);
    dedup.set('\u0003'.repeat(256), 1);
    const gY = this.gY;

    for (let ty = 0; ty < hT; ty++) {
      const y0 = ty * TILE, y1 = y0 + TILE;
      for (let tx = 0; tx < wT; tx++) {
        const x0 = tx * TILE, x1 = x0 + TILE;
        const ops = b.ops.filter((o) => o.x0 < x1 && o.x1 > x0 && o.y0 < y1 && o.y1 > y0);
        const loops = b.loops.filter((l) => l.x0 < x1 && l.x1 > x0 && l.top < y1 && l.gy > y0);
        if (!ops.length && !loops.length) {
          // pure heightfield tile: classify fast
          let minG = Infinity, maxG = -Infinity;
          for (let x = x0; x < x1; x++) {
            const g = gY[x];
            if (g < minG) minG = g;
            if (g > maxG) maxG = g;
          }
          if (y1 <= minG) continue;               // all air
          if (y0 >= maxG) { this.grid[ty * wT + tx] = 1; continue; } // all solid
        }
        // per-pixel
        const m = new Uint8Array(256);
        let any = 0, all3 = true;
        for (let ly = 0; ly < TILE; ly++) {
          const y = y0 + ly;
          for (let lx = 0; lx < TILE; lx++) {
            const x = x0 + lx;
            let v = y >= gY[x] ? 3 : 0;
            for (const l of loops) {
              if (x >= l.x0 && x < l.x1 && y >= l.top && y < l.gy) {
                const dx = x - l.cx, dy = y - l.cy;
                const d2 = dx * dx + dy * dy;
                if (d2 < l.R * l.R) v = 0;
                else v |= (x < l.cx ? 2 : 1);
              }
            }
            for (const o of ops) {
              if (x >= o.x0 && x < o.x1 && y >= o.y0 && y < o.y1) {
                v = o.sub ? (v & ~o.mask) : (v | o.mask);
              }
            }
            m[(ly << 4) | lx] = v;
            any |= v;
            if (v !== 3) all3 = false;
          }
        }
        if (!any) continue;
        if (all3) { this.grid[ty * wT + tx] = 1; continue; }
        const key = String.fromCharCode(...m);
        let id = dedup.get(key);
        if (id === undefined) {
          id = this.tiles.length;
          this.tiles.push({ m });
          dedup.set(key, id);
        }
        this.grid[ty * wT + tx] = id;
      }
    }
  }

  solidAt(x, y, layer = 1) {
    if (x < 0 || x >= this.wPx) return y > 0 && y < this.hPx; // side walls
    if (y < 0 || y >= this.hPx) return false;
    const t = this.grid[(y >> 4) * this.wT + (x >> 4)];
    if (!t) return false;
    if (t === 1) return true;
    return (this.tiles[t].m[((y & 15) << 4) | (x & 15)] & layer) !== 0;
  }

  maskAt(x, y) {
    if (x < 0 || y < 0 || x >= this.wPx || y >= this.hPx) return 0;
    const t = this.grid[(y >> 4) * this.wT + (x >> 4)];
    if (!t) return 0;
    if (t === 1) return 3;
    return this.tiles[t].m[((y & 15) << 4) | (x & 15)];
  }

  groundAt(x) {
    return this.gY[Math.max(0, Math.min(this.wPx - 1, Math.round(x)))];
  }
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

class Builder {
  constructor(hTiles = 32, baseY = 416) {
    this.hT = hTiles;
    this.gY = [];
    this.curY = baseY;
    this.ops = [];
    this.loops = [];
    this.ents = [];
    this.swappers = [];
  }

  get x() { return this.gY.length; }

  col(y, n = 1) { for (let i = 0; i < n; i++) this.gY.push(Math.round(y)); }
  flat(nT) { this.col(this.curY, nT * TILE); }
  flatPx(n) { this.col(this.curY, n); }
  gap(nT) { for (let i = 0; i < nT * TILE; i++) this.gY.push(NOG); }

  // linear slope over dx px, changing ground height by dy px (negative = up)
  slope(dx, dy) {
    const y0 = this.curY;
    for (let i = 0; i < dx; i++) this.gY.push(Math.round(y0 + (dy * i) / dx));
    this.curY = y0 + dy;
  }

  // smooth cosine bump rising h px then returning (h>0 = hill up)
  hill(w, h) {
    const y0 = this.curY;
    for (let i = 0; i < w; i++) {
      this.gY.push(Math.round(y0 - h * 0.5 * (1 - Math.cos((2 * Math.PI * i) / w))));
    }
  }

  // full runnable loop resting on current ground
  loop(R = 48, pad = 16) {
    const gy = this.curY;
    const cx = this.x + R + pad;
    const cy = gy - R;
    const top = cy - R - pad;
    this.flatPx(2 * (R + pad));
    this.loops.push({ cx, cy, R, gy, top, x0: cx - R - pad, x1: cx + R + pad });
    // path swappers: crossing rightward -> layer 1, leftward -> layer 2
    this.swappers.push({ x: cx - R - pad - 40, y0: top - 64, y1: gy + 12 });
    this.swappers.push({ x: cx + R + pad + 40, y0: top - 64, y1: gy + 12 });
    this.swappers.push({ x: cx, y0: top - 64, y1: cy });
    return { cx, cy, R, gy };
  }

  rect(x0, y0, w, h, mask = 3, sub = false) {
    this.ops.push({ x0, y0, x1: x0 + w, y1: y0 + h, mask, sub });
  }

  e(t, x, y, p = {}) { this.ents.push({ t, x: Math.round(x), y: Math.round(y), ...p }); }

  gnd(x) { return this.gY[Math.max(0, Math.min(this.gY.length - 1, Math.round(x)))]; }

  ringRow(x, y, n, dx = 22) { for (let i = 0; i < n; i++) this.e('ring', x + i * dx, y); }
  ringArc(x, y, n, dx, peak) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.e('ring', x + i * dx, y - peak * Math.sin(Math.PI * t));
    }
  }
}

// ---------------------------------------------------------------------------
// Reusable chunk patterns
// ---------------------------------------------------------------------------

const P = {
  start(b) {
    b.flat(12);
    b.ringRow(120, b.curY - 28, 4);
  },

  runway(b, n = 12, rings = 6) {
    const x0 = b.x;
    b.flat(n);
    if (rings) b.ringRow(x0 + 40, b.curY - 28, rings);
  },

  hillRoll(b, w = 288, h = 88, foe = true) {
    const x0 = b.x;
    b.hill(w, h);
    b.ringRow(x0 + w / 2 - 44, b.gnd(x0 + w / 2) - 30, 5);
    if (foe) b.e('crab', x0 + w + 60, b.curY - 14);
    b.flat(5);
  },

  // two rolling hills, good for building roll speed
  rollers(b) {
    const x0 = b.x;
    b.hill(224, 64);
    b.hill(192, 48);
    b.ringRow(x0 + 90, b.gnd(x0 + 112) - 26, 4);
    b.flat(3);
  },

  // climb a 45-degree slope onto a terrace, then back down 22.5
  terrace45(b, h = 96) {
    b.flat(2);
    b.slope(h, -h);           // 45 up
    const x0 = b.x;
    b.flat(8);
    b.ringRow(x0 + 16, b.curY - 28, 5);
    b.e('monitor', x0 + 100, b.curY - 12, { kind: 'ring10' });
    b.slope(h * 2, h);        // 22.5 down
    b.flat(2);
  },

  // gentle 22.5 climb and drop with a spiker on top
  ridge22(b, h = 64) {
    b.slope(h * 2, -h);
    const x0 = b.x;
    b.flat(7);
    b.e('spiker', x0 + 56, b.curY - 14);
    b.ringRow(x0 + 12, b.curY - 44, 4);
    b.slope(h * 2, h);
  },

  // downhill run into a full loop
  loopRun(b, R = 48) {
    b.flat(2);
    b.slope(144, 64);         // pick up speed downhill
    b.flat(3);
    const L = b.loop(R);
    // ring halo around the loop
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.e('ring', L.cx + Math.cos(a) * (R + 26), L.cy + Math.sin(a) * (R + 26));
    }
    b.flat(3);
    b.slope(128, -48);        // climb back out a bit
    b.flat(2);
  },

  // spring up to a high ledge with goodies
  springLedge(b) {
    const x0 = b.x;
    b.flat(16);
    const gy = b.curY;
    const ly = gy - 110;
    b.rect(x0 + 96, ly, 128, 16);              // floating ledge
    b.e('spring', x0 + 48, gy - 8, { color: 'red' });
    b.ringRow(x0 + 100, ly - 20, 5);
    b.e('monitor', x0 + 200, ly - 12, { kind: 'shield' });
    b.ringArc(x0 + 24, gy - 40, 5, 20, 40);
  },

  springHop(b) {
    const x0 = b.x;
    b.flat(10);
    b.e('spring', x0 + 70, b.curY - 8, { color: 'yellow' });
    b.ringRow(x0 + 50, b.curY - 90, 3);
  },

  spikeGauntlet(b, strips = 3) {
    b.flat(3);
    for (let i = 0; i < strips; i++) {
      const x0 = b.x;
      b.flat(6);
      b.e('spikes', x0 + 40, b.curY - 8, { w: 32 });
      b.ringRow(x0 + 34, b.curY - 60, 2, 22);
    }
    b.e('buzzer', b.x - 120, b.curY - 90);
    b.flat(4);
  },

  // bottomless pit crossed on moving platforms
  platformsOverPit(b, nT = 14) {
    const x0 = b.x, gy = b.curY;
    b.flat(2);
    b.gap(nT);
    b.flat(3);
    const px = x0 + 32;
    b.e('plat', px + 40, gy - 40, { axis: 'y', range: 34, period: 150 });
    b.e('plat', px + nT * TILE - 80, gy - 60, { axis: 'x', range: 46, period: 170 });
    b.ringArc(px + 20, gy - 70, 6, (nT * TILE - 60) / 5, 26);
    b.e('buzzer', px + nT * 8, gy - 120);
  },

  dashCorridor(b) {
    const x0 = b.x;
    b.flat(4);
    b.e('dash', x0 + 40, b.curY - 6, { dir: 1 });
    b.flat(10);
    b.hill(160, 40);
    b.hill(160, 56);
    b.ringRow(x0 + 120, b.curY - 26, 6);
    b.flat(3);
  },

  badnikRow(b) {
    const x0 = b.x;
    b.flat(16);
    b.e('crab', x0 + 70, b.curY - 14);
    b.e('spiker', x0 + 150, b.curY - 14);
    b.e('buzzer', x0 + 110, b.curY - 80);
    b.ringRow(x0 + 60, b.curY - 64, 5);
  },

  monitors(b, kinds = ['ring10', 'shoes']) {
    const x0 = b.x;
    b.flat(3 + kinds.length * 3);
    kinds.forEach((k, i) => b.e('monitor', x0 + 40 + i * 52, b.curY - 12, { kind: k }));
  },

  checkpoint(b) {
    b.flat(3);
    b.e('check', b.x - 24, b.curY - 24);
    b.flat(3);
  },

  // chem zone: covered tunnel with a dash pad, duck under
  tunnel(b, nT = 14) {
    const x0 = b.x, gy = b.curY;
    b.flat(nT);
    b.rect(x0 + 32, gy - 120, nT * TILE - 64, 72);  // roof block
    b.e('dash', x0 + 64, gy - 6, { dir: 1 });
    b.ringRow(x0 + 100, gy - 24, 5);
  },

  // chem zone: stepped vats with spikes between
  vats(b) {
    for (let i = 0; i < 3; i++) {
      const x0 = b.x;
      b.flat(6);
      b.e('spikes', x0 + 60, b.curY - 8, { w: 32 });
      b.slope(32, -32);
      b.flat(4);
      b.ringRow(b.x - 56, b.curY - 26, 3);
    }
    b.e('buzzer', b.x - 60, b.curY - 100);
    b.slope(96, 96);
    b.flat(2);
  },

  finish(b) {
    b.flat(8);
    b.e('sign', b.x, b.curY - 26);
    b.flat(16);
  },
};

// ---------------------------------------------------------------------------
// Acts
// ---------------------------------------------------------------------------

function assemble(plan, hTiles = 32, baseY = 416) {
  const b = new Builder(hTiles, baseY);
  for (const step of plan) {
    if (typeof step === 'function') step(b);
    else P[step[0]](b, ...step.slice(1));
  }
  return b;
}

function buildMH1() {
  const b = assemble([
    ['start'], ['runway', 10], ['hillRoll'], ['badnikRow'], ['checkpoint'],
    ['rollers'], ['loopRun'], ['springHop'], ['terrace45'],
    ['checkpoint'], ['spikeGauntlet', 2], ['dashCorridor'],
    ['monitors', ['ring10', 'shield']], ['finish'],
  ]);
  return new Level(b, {});
}

function buildMH2() {
  const b = assemble([
    ['start'], ['rollers'], ['ridge22'], ['checkpoint'],
    ['platformsOverPit', 12], ['hillRoll', 320, 104], ['loopRun', 52],
    ['checkpoint'], ['springLedge'], ['badnikRow'], ['spikeGauntlet', 3],
    ['dashCorridor'], ['monitors', ['shoes', 'stars']], ['finish'],
  ]);
  return new Level(b, {});
}

function buildCM1() {
  const b = assemble([
    ['start'], ['runway', 8], ['tunnel'], ['vats'], ['checkpoint'],
    ['platformsOverPit', 14], ['loopRun'], ['badnikRow'],
    ['checkpoint'], ['spikeGauntlet', 3], ['springLedge'],
    ['dashCorridor'], ['monitors', ['ring10', 'oneup']], ['finish'],
  ]);
  return new Level(b, {});
}

function buildCM2() {
  const b = assemble([
    ['start'], ['tunnel', 16], ['ridge22', 80], ['checkpoint'],
    ['vats'], ['loopRun', 52], ['platformsOverPit', 16],
    ['checkpoint'], ['spikeGauntlet', 4], ['badnikRow'], ['springHop'],
    ['dashCorridor'], ['monitors', ['stars', 'ring10']], ['finish'],
  ]);
  return new Level(b, {});
}

function buildBoss() {
  const b = assemble([
    ['start'], ['runway', 10, 8], ['monitors', ['ring10']], ['runway', 30, 0],
  ]);
  b.bossTrigger = 620;
  b.bossZone = { x0: 620, x1: 620 + 320 };
  b.e('boss', 620 + 240, b.curY - 104);
  b.flat(14);
  return new Level(b, {});
}

export const LEVELS = [
  { zone: 'MOORE HILL ZONE', act: 1, theme: 'hill', music: 'hill', build: buildMH1 },
  { zone: 'MOORE HILL ZONE', act: 2, theme: 'hill', music: 'hill', build: buildMH2 },
  { zone: 'CHEMICAL MOORE ZONE', act: 1, theme: 'chem', music: 'chem', build: buildCM1 },
  { zone: 'CHEMICAL MOORE ZONE', act: 2, theme: 'chem', music: 'chem', build: buildCM2 },
  { zone: 'CHEMICAL MOORE ZONE', act: 3, theme: 'chem', music: 'boss', boss: true, build: buildBoss },
];
