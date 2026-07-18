// Moormings — core simulation. Headless-safe: no DOM, no canvas, no Math.random.
// Terrain is a per-pixel Uint8Array; moormings are tiny state machines.
// Fixed-step (60 Hz ticks, moormings act every 4 ticks = 15 Hz, Amiga-style),
// so a level plays out identically every run.

export const W = 640;           // world width in pixels
export const H = 160;           // world height in pixels

// terrain values
export const EMPTY = 0;
export const DIRT = 1;          // destructible
export const STEEL = 2;         // indestructible — clink!
export const BRICK = 3;         // builder bricks, destructible

export const SKILLS = ['climber', 'floater', 'bomber', 'blocker', 'builder', 'basher', 'miner', 'digger'];

const ACT = 4;                  // sim ticks per action step
const SPLAT_FALL = 62;          // fall higher than this (px) without umbrella = splat
const BOMB_TICKS = 300;         // 5 s countdown
const MAX_RISE = 6;             // walkable step-up
const MAX_SNAP = 3;             // walkable step-down before falling

// ---------------- terrain building ----------------
// Levels paint terrain from primitive ops, in order. Later ops overwrite.
//  {op:'rect',  x,y,w,h, v?}          filled rect (default DIRT)
//  {op:'steel', x,y,w,h}              steel rect
//  {op:'clear', x,y,w,h}              carve rect to air
//  {op:'cut',   x,y,rx,ry}            carve ellipse to air (caverns)
//  {op:'slope', x,y,w,h,dir}          right triangle; dir 1 rises to the right
export function buildTerrain(level) {
  const t = new Uint8Array(W * H);
  for (const o of level.terrain) {
    if (o.op === 'rect' || o.op === 'steel' || o.op === 'clear') {
      const v = o.op === 'steel' ? STEEL : o.op === 'clear' ? EMPTY : (o.v ?? DIRT);
      const x1 = Math.min(W, o.x + o.w), y1 = Math.min(H, o.y + o.h);
      for (let y = Math.max(0, o.y); y < y1; y++)
        for (let x = Math.max(0, o.x); x < x1; x++) t[y * W + x] = v;
    } else if (o.op === 'cut') {
      const x0 = Math.max(0, Math.floor(o.x - o.rx)), x1 = Math.min(W - 1, Math.ceil(o.x + o.rx));
      const y0 = Math.max(0, Math.floor(o.y - o.ry)), y1 = Math.min(H - 1, Math.ceil(o.y + o.ry));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const dx = (x - o.x) / o.rx, dy = (y - o.y) / o.ry;
          if (dx * dx + dy * dy <= 1) t[y * W + x] = EMPTY;
        }
    } else if (o.op === 'slope') {
      for (let i = 0; i < o.w; i++) {
        const th = Math.round(o.h * (o.dir === 1 ? (i + 1) / o.w : (o.w - i) / o.w));
        const x = o.x + i;
        if (x < 0 || x >= W) continue;
        for (let y = o.y + o.h - th; y < o.y + o.h && y < H; y++)
          if (y >= 0) t[y * W + x] = o.v ?? DIRT;
      }
    }
  }
  return t;
}

// ---------------- moorming ----------------
let NEXT_ID = 0;
function makeMoorming(x, y) {
  return {
    id: NEXT_ID++,
    x, y,               // y = row of the ground pixel under the feet; body occupies y-10..y-1
    dir: 1,
    job: 'faller',      // walker faller floatfall climber blocker builder basher miner digger shrug ohno splat drown burn exiting
    fallDist: 0,
    climber: false, floater: false,
    bombTick: -1,       // >=0: counting down to boom
    bricks: 0,
    workTimer: 0,
    animT: 0,           // used by dying/exiting states
    alive: true,        // false once removed from play (dead or saved)
    saved: false,
  };
}

// ---------------- sim ----------------
export class Sim {
  constructor(level) {
    NEXT_ID = 0;
    this.level = level;
    this.terrain = buildTerrain(level);
    this.moormings = [];
    this.tick_ = 0;
    this.spawned = 0;
    this.saved = 0;
    this.dead = 0;
    this.minRate = level.rate;
    this.rate = level.rate;
    this.spawnTimer = 30;
    this.skills = { ...level.skills };
    for (const s of SKILLS) if (!(s in this.skills)) this.skills[s] = 0;
    this.timeLeft = level.time * 60;
    this.nuked = false;
    this.finished = false;
    this.won = false;
    this.events = [];   // {t:'boom'|..., x, y} — drained by the render/audio layer
  }

  solid(x, y) {
    if (x < 0 || x >= W) return true;    // world edges are walls
    if (y < 0 || y >= H) return false;
    return this.terrain[y * W + x] > 0;
  }
  val(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return EMPTY;
    return this.terrain[y * W + x];
  }

  // remove destructible pixels in inclusive rect; reports steel touched
  removeRect(x0, y0, x1, y1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    let removed = 0, steel = 0;
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        const v = this.terrain[y * W + x];
        if (v === STEEL) steel++;
        else if (v !== EMPTY) { this.terrain[y * W + x] = EMPTY; removed++; }
      }
    return { removed, steel };
  }

  scanRect(x0, y0, x1, y1) {   // count solids without removing
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    let any = 0, steel = 0;
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        const v = this.terrain[y * W + x];
        if (v === STEEL) steel++;
        else if (v !== EMPTY) any++;
      }
    return { any, steel };
  }

  removeCircle(cx, cy, r) {
    let removed = 0;
    for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r && this.terrain[y * W + x] !== STEEL && this.terrain[y * W + x] !== EMPTY) {
          this.terrain[y * W + x] = EMPTY; removed++;
        }
      }
    return removed;
  }

  addPixel(x, y, v) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    if (this.terrain[y * W + x] === EMPTY) this.terrain[y * W + x] = v;
  }

  ev(t, x, y) { this.events.push({ t, x: x | 0, y: y | 0 }); }

  spawnInterval() { return 16 + Math.floor((99 - this.rate) * 1.6); }
  setRate(r) { this.rate = Math.max(this.minRate, Math.min(99, r)); }

  active(m) { return m.alive && m.job !== 'splat' && m.job !== 'drown' && m.job !== 'burn' && m.job !== 'exiting'; }

  nuke() {
    if (this.nuked) return;
    this.nuked = true;
    let i = 0;
    for (const m of this.moormings) {
      if (this.active(m) && m.bombTick < 0) { m.bombTick = BOMB_TICKS + i * 10; i++; }
    }
    this.ev('ohno', 0, 0);
  }

  assign(idx, skill) {
    const m = this.moormings[idx];
    if (!m || !this.active(m)) return false;
    if ((this.skills[skill] | 0) <= 0) return false;
    if (skill === 'climber') {
      if (m.climber) return false;
      m.climber = true;
    } else if (skill === 'floater') {
      if (m.floater) return false;
      m.floater = true;
    } else if (skill === 'bomber') {
      if (m.bombTick >= 0) return false;
      m.bombTick = BOMB_TICKS;
    } else {
      // ground jobs — blockers only accept bomber; airborne can't take them
      if (m.job === skill) return false;
      if (!['walker', 'shrug', 'builder', 'basher', 'miner', 'digger'].includes(m.job)) return false;
      if (skill === 'blocker' && !this.solid(m.x, m.y)) return false;
      m.job = skill;
      m.workTimer = 0;
      if (skill === 'builder') m.bricks = 12;
    }
    this.skills[skill]--;
    this.ev('assign', m.x, m.y);
    return true;
  }

  // ---------------- per-tick ----------------
  tick() {
    if (this.finished) return;
    this.tick_++;
    if (this.timeLeft > 0) this.timeLeft--;

    // spawning
    if (!this.nuked && this.spawned < this.level.spawn) {
      if (--this.spawnTimer <= 0) {
        this.spawnTimer = this.spawnInterval();
        const m = makeMoorming(this.level.hatch.x, this.level.hatch.y);
        this.moormings.push(m);
        this.spawned++;
        this.ev('spawn', m.x, m.y);
      }
    }

    // blockers list for this tick
    this.blockers = this.moormings.filter((m) => this.active(m) && m.job === 'blocker');

    for (const m of this.moormings) {
      if (!m.alive) continue;
      // bomb countdown runs every tick
      if (m.bombTick >= 0 && this.active(m)) {
        m.bombTick--;
        if (m.bombTick === 60 && m.job !== 'blocker' && m.job !== 'faller' && m.job !== 'floatfall' && m.job !== 'climber') {
          m.job = 'ohno';
          this.ev('ohno', m.x, m.y);
        }
        if (m.bombTick <= 0) { this.explode(m); continue; }
      }
      if (this.tick_ % ACT === 0) this.act(m);
    }

    // level end?
    const anyActive = this.moormings.some((m) => m.alive);
    const allOut = this.nuked || this.spawned >= this.level.spawn;
    if ((allOut && !anyActive && this.spawned > 0) || this.timeLeft <= 0) {
      this.finished = true;
      this.won = this.saved >= this.level.quota;
      this.ev('end', 0, 0);
    }
    // low-time tick sfx
    if (this.timeLeft > 0 && this.timeLeft <= 600 && this.timeLeft % 60 === 0) this.ev('tick', 0, 0);
  }

  explode(m) {
    this.ev('boom', m.x, m.y - 4);
    this.removeCircle(m.x, m.y - 4, 9);
    m.alive = false;
    m.bombTick = -1;
    this.dead++;
  }

  kill(m, how) {   // how: splat | drown | burn
    m.job = how;
    m.animT = 0;
    this.ev(how, m.x, m.y);
  }

  act(m) {
    switch (m.job) {
      case 'splat': case 'drown': case 'burn':
        if (++m.animT >= 8) { m.alive = false; this.dead++; }
        return;
      case 'exiting':
        if (++m.animT >= 7) { m.alive = false; }
        return;
      case 'ohno': return;
      case 'shrug':
        if (++m.animT >= 6) m.job = 'walker';
        return;
      case 'walker': this.walkStep(m); break;
      case 'faller': case 'floatfall': this.fallStep(m); break;
      case 'climber': this.climbStep(m); break;
      case 'blocker':
        if (!this.solid(m.x, m.y)) { m.job = 'faller'; m.fallDist = 0; }
        return;
      case 'builder': this.buildStep(m); break;
      case 'basher': this.bashStep(m); break;
      case 'miner': this.mineStep(m); break;
      case 'digger': this.digStep(m); break;
    }
    this.checkZones(m);
  }

  blockedAt(nx, ny, self) {
    for (const b of this.blockers) {
      if (b === self) continue;
      if (Math.abs(nx - b.x) <= 3 && Math.abs(ny - b.y) <= 9) return true;
    }
    return false;
  }

  checkZones(m) {
    if (m.job === 'splat' || m.job === 'drown' || m.job === 'burn' || m.job === 'exiting' || !m.alive) return;
    // fell out of the world
    if (m.y >= H - 1) { m.alive = false; this.dead++; this.ev('splat', m.x, H - 2); return; }
    // hazards
    for (const hz of this.level.hazards) {
      if (m.x >= hz.x && m.x < hz.x + hz.w && m.y - 2 >= hz.y && m.y - 2 < hz.y + hz.h) {
        this.kill(m, hz.type === 'water' ? 'drown' : 'burn');
        return;
      }
    }
    // exit
    const e = this.level.exit;
    if (m.job !== 'faller' && m.job !== 'floatfall' && m.job !== 'climber' && m.job !== 'blocker' &&
        Math.abs(m.x - e.x) <= 4 && m.y >= e.y - 6 && m.y <= e.y + 3) {
      m.job = 'exiting';
      m.animT = 0;
      this.saved++;
      this.ev('yippee', m.x, m.y);
    }
  }

  walkStep(m) {
    const dir = m.dir;
    const nx = m.x + dir;
    if (nx < 2 || nx > W - 3) { m.dir = -dir; return; }
    if (this.blockedAt(nx, m.y, m)) { m.dir = -dir; return; }
    let ny = m.y;
    let rise = 0;
    while (rise <= MAX_RISE + 1 && this.solid(nx, ny - 1)) { ny--; rise++; }
    if (rise > MAX_RISE) {
      if (m.climber) { m.job = 'climber'; return; }
      m.dir = -dir;
      return;
    }
    if (!this.solid(nx, ny)) {
      let drop = 1;
      while (drop <= MAX_SNAP && !this.solid(nx, ny + drop)) drop++;
      if (drop > MAX_SNAP && !this.solid(nx, ny + drop)) {
        m.x = nx; m.fallDist = 0; m.job = 'faller';
        return;
      }
      ny += drop;
    }
    m.x = nx; m.y = ny;
  }

  fallStep(m) {
    if (m.floater && m.job === 'faller' && m.fallDist > 16) {
      m.job = 'floatfall';
      this.ev('brolly', m.x, m.y);
    }
    const speed = m.job === 'floatfall' ? 2 : 3;
    for (let i = 0; i < speed; i++) {
      if (this.solid(m.x, m.y + 1)) {
        // landed — normalize so m.y is the ground pixel row
        m.y += 1;
        if (m.fallDist > SPLAT_FALL && m.job !== 'floatfall') { this.kill(m, 'splat'); return; }
        m.job = 'walker';
        m.fallDist = 0;
        return;
      }
      m.y++;
      m.fallDist++;
      if (m.y >= H - 1) return; // checkZones will handle the void
    }
  }

  climbStep(m) {
    const wx = m.x + m.dir;
    // ceiling above own head — bump off, fall away from wall
    if (this.solid(m.x, m.y - 11)) { m.dir = -m.dir; m.job = 'faller'; m.fallDist = 0; return; }
    // wall ended near the top — hoist over
    if (!this.solid(wx, m.y - 10)) {
      m.x = wx;
      let yy = m.y - 10;
      while (yy < m.y && !this.solid(m.x, yy)) yy++;
      m.y = yy;
      m.job = 'walker';
      return;
    }
    m.y -= 1;
    if (m.y < 2) { m.dir = -m.dir; m.job = 'faller'; m.fallDist = 0; }
  }

  buildStep(m) {
    m.workTimer++;
    if (m.workTimer % 6) return;
    if (m.bricks <= 0) { m.job = 'shrug'; m.animT = 0; this.ev('shrug', m.x, m.y); return; }
    const dir = m.dir;
    // bumped head or ran into a wall — turn back into a walker
    if (this.solid(m.x + dir, m.y - 1) || this.solid(m.x + 2 * dir, m.y - 1) || this.solid(m.x, m.y - 10)) {
      m.dir = -dir; m.job = 'walker';
      return;
    }
    for (let i = 1; i <= 4; i++) this.addPixel(m.x + dir * i, m.y - 1, BRICK);
    m.bricks--;
    this.ev('brick', m.x, m.y);
    m.x += 2 * dir;
    m.y -= 1;
  }

  bashStep(m) {
    m.workTimer++;
    if (m.workTimer % 3) return;
    const dir = m.dir;
    // steel in the bash face?
    const face = this.scanRect(m.x + dir, m.y - 9, m.x + dir * 4, m.y - 1);
    if (face.steel > 0) { this.ev('clink', m.x + dir * 3, m.y - 4); m.dir = -dir; m.job = 'walker'; return; }
    // done? nothing left ahead
    const ahead = this.scanRect(m.x + dir, m.y - 9, m.x + dir * 9, m.y - 1);
    if (ahead.any === 0) { m.job = 'walker'; return; }
    this.removeRect(m.x + dir, m.y - 10, m.x + dir * 4, m.y - 1);
    this.ev('chip', m.x + dir * 2, m.y - 4);
    m.x += 2 * dir;
    if (!this.solid(m.x, m.y)) {
      let drop = 1;
      while (drop <= MAX_SNAP && !this.solid(m.x, m.y + drop)) drop++;
      if (drop > MAX_SNAP && !this.solid(m.x, m.y + drop)) { m.fallDist = 0; m.job = 'faller'; return; }
      m.y += drop;
    }
  }

  mineStep(m) {
    m.workTimer++;
    if (m.workTimer % 3) return;
    const dir = m.dir;
    const x0 = m.x + dir, x1 = m.x + dir * 6;
    const face = this.scanRect(x0, m.y - 8, x1, m.y + 1);
    if (face.steel > 0) { this.ev('clink', m.x + dir * 3, m.y - 2); m.dir = -dir; m.job = 'walker'; return; }
    if (face.any === 0) { m.job = 'walker'; return; }
    this.removeRect(x0, m.y - 8, x1, m.y + 1);
    this.ev('chip', m.x + dir * 3, m.y);
    m.x += 2 * dir;
    m.y += 2;
    if (!this.solid(m.x, m.y)) {
      let drop = 1;
      while (drop <= MAX_SNAP && !this.solid(m.x, m.y + drop)) drop++;
      if (drop > MAX_SNAP && !this.solid(m.x, m.y + drop)) { m.fallDist = 0; m.job = 'faller'; return; }
      m.y += drop;
    }
  }

  digStep(m) {
    m.workTimer++;
    if (m.workTimer % 2) return;
    const row = this.scanRect(m.x - 4, m.y, m.x + 4, m.y);
    if (row.steel > 0) { this.ev('clink', m.x, m.y); m.job = 'walker'; return; }
    if (row.any === 0) { m.fallDist = 0; m.job = 'faller'; return; }
    this.removeRect(m.x - 4, m.y, m.x + 4, m.y);
    this.ev('chip', m.x, m.y);
    m.y += 1;
    if (!this.solid(m.x, m.y)) { m.fallDist = 0; m.job = 'faller'; }
  }
}
