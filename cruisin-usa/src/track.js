// Track / course definitions for Cruis'n Moore.
// Pure data module (no DOM) so it can be unit-tested in node.

export const SEGMENT_LENGTH = 200;   // world units per road segment
export const RUMBLE_LENGTH = 3;      // segments per rumble strip stripe

const LEN = { SHORT: 15, MEDIUM: 30, LONG: 60 };
const CURVE = { EASY: 2, MEDIUM: 4, HARD: 6 };
const HILL = { LOW: 20, MEDIUM: 40, HIGH: 60 };

function easeIn(a, b, p) { return a + (b - a) * Math.pow(p, 2); }
function easeInOut(a, b, p) { return a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5); }

// deterministic RNG so scenery layout is stable (and testable)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  constructor(seed) {
    this.segments = [];
    this.rand = mulberry32(seed);
  }
  lastY() {
    const s = this.segments;
    return s.length === 0 ? 0 : s[s.length - 1].p2y;
  }
  addSegment(curve, y) {
    const n = this.segments.length;
    this.segments.push({
      index: n,
      p1y: this.lastY(),
      p2y: y,
      curve,
      sprites: [],   // { name, offset } — offset in road half-widths, +right
      cars: [],      // populated at runtime each frame
      marker: null,  // 'start' | 'checkpoint'
    });
  }
  addRoad(enter, hold, leave, curve, y) {
    const startY = this.lastY();
    const endY = startY + (y || 0) * SEGMENT_LENGTH;
    const total = enter + hold + leave;
    for (let i = 0; i < enter; i++)
      this.addSegment(easeIn(0, curve, i / enter), easeInOut(startY, endY, i / total));
    for (let i = 0; i < hold; i++)
      this.addSegment(curve, easeInOut(startY, endY, (enter + i) / total));
    for (let i = 0; i < leave; i++)
      this.addSegment(easeInOut(curve, 0, i / leave), easeInOut(startY, endY, (enter + hold + i) / total));
  }
  straight(n) { this.addRoad(n || LEN.MEDIUM, n || LEN.MEDIUM, n || LEN.MEDIUM, 0, 0); }
  hill(n, h) { this.addRoad(n, n, n, 0, h); }
  curve(n, c, h) { this.addRoad(n, n, n, c, h || 0); }
  sCurves() {
    this.addRoad(LEN.MEDIUM, LEN.MEDIUM, LEN.MEDIUM, -CURVE.EASY, 0);
    this.addRoad(LEN.MEDIUM, LEN.MEDIUM, LEN.MEDIUM, CURVE.MEDIUM, 0);
    this.addRoad(LEN.MEDIUM, LEN.MEDIUM, LEN.MEDIUM, CURVE.EASY, -HILL.LOW);
    this.addRoad(LEN.MEDIUM, LEN.MEDIUM, LEN.MEDIUM, -CURVE.EASY, HILL.MEDIUM);
    this.addRoad(LEN.MEDIUM, LEN.MEDIUM, LEN.MEDIUM, -CURVE.MEDIUM, -HILL.MEDIUM);
  }
  rollingHills() {
    this.hill(LEN.SHORT, HILL.LOW);
    this.hill(LEN.SHORT, -HILL.LOW);
    this.hill(LEN.SHORT, HILL.MEDIUM);
    this.hill(LEN.SHORT, -HILL.LOW);
    this.hill(LEN.SHORT, -HILL.MEDIUM);
  }
  downhillToEnd(n) {
    // ease elevation back to zero so the loop seam is smooth
    n = n || 120;
    const drop = -this.lastY() / SEGMENT_LENGTH;
    this.addRoad(n, n, n, -CURVE.EASY, drop);
  }
  scatter(names, density, minOff, maxOff) {
    // sprinkle roadside scenery along the whole track
    for (const seg of this.segments) {
      if (seg.sprites.length > 0) continue;      // don't bury arches/billboards
      if (this.rand() > density) continue;
      const side = this.rand() < 0.5 ? -1 : 1;
      const name = names[Math.floor(this.rand() * names.length)];
      const offset = side * (minOff + this.rand() * (maxOff - minOff));
      seg.sprites.push({ name, offset });
    }
  }
  billboards(names, every) {
    for (let i = 100; i < this.segments.length - 100; i += every) {
      const seg = this.segments[i];
      const side = (i / every) % 2 === 0 ? -1 : 1;
      seg.sprites.push({ name: names[Math.floor(this.rand() * names.length)], offset: side * 1.6 });
    }
  }
}

function finalize(b, course) {
  const segments = b.segments;
  const trackLength = segments.length * SEGMENT_LENGTH;

  // start arch + checkpoint arches (3 per lap, the 3rd is the start line)
  const per = Math.floor(segments.length / 3);
  segments[0].marker = 'start';
  segments[0].sprites.push({ name: 'archStart', offset: 0 });
  const checkpoints = [];
  for (let c = 1; c < 3; c++) {
    const seg = segments[c * per];
    seg.marker = 'checkpoint';
    seg.sprites.push({ name: 'archCheck', offset: 0 });
    checkpoints.push(seg.index);
  }
  return { ...course, segments, trackLength, checkpoints };
}

// ---------------------------------------------------------------------------

function buildCoast() {
  const b = new Builder(101);
  b.straight(LEN.MEDIUM);
  b.curve(LEN.MEDIUM, CURVE.EASY, HILL.LOW);
  b.sCurves();
  b.straight(LEN.LONG);
  b.curve(LEN.MEDIUM, -CURVE.MEDIUM, 0);
  b.hill(LEN.MEDIUM, HILL.HIGH);
  b.curve(LEN.MEDIUM, CURVE.MEDIUM, -HILL.LOW);
  b.straight(LEN.MEDIUM);
  b.rollingHills();
  b.curve(LEN.LONG, -CURVE.EASY, HILL.MEDIUM);
  b.sCurves();
  b.curve(LEN.MEDIUM, CURVE.HARD, -HILL.MEDIUM);
  b.straight(LEN.LONG);
  b.downhillToEnd();
  b.scatter(['palm', 'palm', 'bush', 'rock'], 0.28, 1.25, 4.5);
  b.billboards(['billboard0', 'billboard1', 'billboard2'], 220);
  return finalize(b, {
    id: 'coast', name: 'PACIFIC COAST', bg: 'ocean', laps: 2, music: { bpm: 138, root: 0 },
    timeStart: 70, timeBonus: 26,
    sky: ['#1e8fd8', '#a8e4ff'], fog: '#a8e4ff',
    grass: ['#3fae58', '#37a050'], rumble: ['#ffffff', '#d63a3a'],
    road: ['#6e6e74', '#68686e'], lane: '#ffffff',
    night: false,
  });
}

function buildDesert() {
  const b = new Builder(202);
  b.straight(LEN.LONG);
  b.curve(LEN.LONG, -CURVE.EASY, 0);
  b.hill(LEN.MEDIUM, HILL.MEDIUM);
  b.curve(LEN.MEDIUM, CURVE.MEDIUM, -HILL.LOW);
  b.straight(LEN.LONG);
  b.sCurves();
  b.hill(LEN.LONG, HILL.HIGH);
  b.curve(LEN.MEDIUM, -CURVE.HARD, -HILL.MEDIUM);
  b.straight(LEN.MEDIUM);
  b.curve(LEN.MEDIUM, CURVE.EASY, HILL.LOW);
  b.rollingHills();
  b.curve(LEN.LONG, CURVE.EASY, 0);
  b.straight(LEN.LONG);
  b.downhillToEnd();
  b.scatter(['cactus', 'cactus', 'rock', 'mesa', 'bushDry'], 0.26, 1.3, 5.0);
  b.billboards(['billboard0', 'billboard1', 'billboard2'], 240);
  return finalize(b, {
    id: 'desert', name: 'ROUTE 66', bg: 'desert', laps: 2, music: { bpm: 124, root: -2 },
    timeStart: 70, timeBonus: 26,
    sky: ['#ff9d3c', '#ffe29a'], fog: '#ffd98f',
    grass: ['#d8a75c', '#cd9c52'], rumble: ['#ffffff', '#2c2c2c'],
    road: ['#7a7068', '#746a62'], lane: '#ffe9b0',
    night: false,
  });
}

function buildRockies() {
  const b = new Builder(404);
  b.straight(LEN.MEDIUM);
  b.hill(LEN.MEDIUM, HILL.HIGH);            // the long climb
  b.curve(LEN.MEDIUM, -CURVE.MEDIUM, HILL.LOW);
  b.curve(LEN.SHORT, CURVE.HARD, -HILL.LOW); // switchback
  b.curve(LEN.SHORT, -CURVE.HARD, HILL.LOW);
  b.sCurves();
  b.hill(LEN.LONG, HILL.HIGH);
  b.curve(LEN.MEDIUM, CURVE.MEDIUM, -HILL.MEDIUM);
  b.rollingHills();
  b.curve(LEN.SHORT, -CURVE.HARD, -HILL.LOW); // downhill switchback
  b.curve(LEN.SHORT, CURVE.HARD, -HILL.LOW);
  b.straight(LEN.MEDIUM);
  b.curve(LEN.LONG, CURVE.EASY, -HILL.MEDIUM);
  b.sCurves();
  b.straight(LEN.LONG);
  b.downhillToEnd();
  b.scatter(['pine', 'pine', 'pine', 'rock', 'bush'], 0.3, 1.25, 4.5);
  b.billboards(['billboard0', 'billboard1', 'billboard2'], 230);
  return finalize(b, {
    id: 'rockies', name: 'ROCKY SUMMIT', bg: 'mountain', laps: 2, music: { bpm: 132, root: 3 },
    timeStart: 70, timeBonus: 26,
    sky: ['#6db7dd', '#dff0f8'], fog: '#dff0f8',
    grass: ['#eef4f8', '#e0e9f0'], rumble: ['#d84040', '#ffffff'],
    road: ['#5c5c66', '#565660'], lane: '#ffffff',
    night: false,
  });
}

function buildCity() {
  const b = new Builder(303);
  b.straight(LEN.MEDIUM);
  b.curve(LEN.MEDIUM, CURVE.MEDIUM, 0);
  b.straight(LEN.SHORT);
  b.curve(LEN.MEDIUM, -CURVE.MEDIUM, 0);
  b.sCurves();
  b.straight(LEN.LONG);
  b.curve(LEN.SHORT, CURVE.HARD, HILL.LOW);
  b.curve(LEN.SHORT, -CURVE.HARD, -HILL.LOW);
  b.straight(LEN.MEDIUM);
  b.hill(LEN.MEDIUM, HILL.MEDIUM);   // bridge climb
  b.curve(LEN.MEDIUM, CURVE.EASY, -HILL.MEDIUM);
  b.sCurves();
  b.curve(LEN.LONG, -CURVE.EASY, 0);
  b.straight(LEN.LONG);
  b.downhillToEnd();
  b.scatter(['building0', 'building1', 'building2', 'lamp'], 0.34, 1.35, 3.6);
  b.billboards(['billboardNeon0', 'billboardNeon1'], 200);
  return finalize(b, {
    id: 'city', name: 'MOORE CITY NIGHTS', bg: 'city', laps: 2, music: { bpm: 148, root: -4 },
    timeStart: 65, timeBonus: 25,
    sky: ['#07071e', '#2a1450'], fog: '#1a1038',
    grass: ['#20222e', '#1c1e2a'], rumble: ['#c9c9d4', '#5a5a70'],
    road: ['#3c3c46', '#383842'], lane: '#ffd23c',
    night: true,
  });
}

export function buildCourses() {
  return [buildCoast(), buildDesert(), buildRockies(), buildCity()];
}
