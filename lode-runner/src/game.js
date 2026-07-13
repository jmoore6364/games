// Core simulation: cell-tweened movement (decisions happen at cell centers,
// like the original), digging with regenerating holes, guard chase AI (BFS
// over the same movement rules), gold carrying, hidden exit ladders.
import { COLS, ROWS } from './levels.js';

const SPD = {
  player: { walk: 6.2, climb: 5.2, rope: 5.6, fall: 11.5 },
  guard: { walk: 4.7, climb: 4.0, rope: 4.2, fall: 9.0 },
};
const DIG_TIME = 0.32;       // player is busy swinging
const HOLE_LIFE = 6.5;       // open, from dig start
const HOLE_CLOSE = 0.5;      // flicker warning before it seals
const TRAP_STUN = 2.4;       // guard struggle time before climbing out
const SPAWN_GRACE = 0.9;     // respawned guards are harmless briefly
const KILL_DIST = 0.58;

const key = (x, y) => x + ',' + y;

function makeEnt(kind, x, y) {
  return {
    kind, cx: x, cy: y, tx: x, ty: y, prog: 0, moving: false, move: 'walk',
    x, y, face: 1, anim: Math.random() * 10,
    // guard-only fields
    trapped: false, escT: 0, escaping: 0, carrying: false, dead: false,
    respawnT: 0, grace: 0, path: null, pathT: 0,
    pathTarget: null,
  };
}

export class Game {
  constructor(levelDef) {
    this.grid = levelDef.rows.map(r => [...r].map(c => ('$PG'.includes(c) ? ' ' : c)));
    this.gold = new Set();
    this.guards = [];
    this.holes = new Map();
    this.revealed = false;
    this.carried = 0;
    this.score = 0;
    this.events = [];
    this.status = 'play';
    this.deathCause = null;
    this.digT = 0;
    levelDef.rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === '$') this.gold.add(key(x, y));
      else if (c === 'P') this.player = makeEnt('player', x, y);
      else if (c === 'G') this.guards.push(makeEnt('guard', x, y));
    }));
    this.goldTotal = this.gold.size;
  }

  // ---- board queries ----
  at(x, y) {
    if (y < 0) return ' ';
    if (x < 0 || x >= COLS || y >= ROWS) return '@';
    let c = this.grid[y][x];
    if (c === 'X') return this.revealed ? 'H' : ' ';
    if (c === '#' && this.holes.has(key(x, y))) return ' ';
    return c;
  }
  blocksWalk(x, y) { const c = this.at(x, y); return c === '#' || c === '@' || c === 'T'; }
  blocksFall(x, y) { const c = this.at(x, y); return c === '#' || c === '@'; }
  trappedGuardAt(x, y) {
    return this.guards.some(g => g.trapped && !g.dead && g.cx === x && g.cy === y);
  }
  support(x, y) {
    const c = this.at(x, y);
    if (c === 'H' || c === '-') return true;
    const b = this.at(x, y + 1);
    if (b === '#' || b === '@' || b === 'H') return true;
    return this.trappedGuardAt(x, y + 1);
  }
  guardAt(x, y, except) {
    return this.guards.some(g => g !== except && !g.dead &&
      ((g.cx === x && g.cy === y) || (g.moving && g.tx === x && g.ty === y)));
  }

  // ---- main tick ----
  update(dt, ctl) {
    if (this.status !== 'play') return;
    const p = this.player;

    // digging keeps the runner planted for a beat
    if (this.digT > 0) this.digT -= dt;
    else {
      if (ctl.digL) this.tryDig(-1);
      else if (ctl.digR) this.tryDig(1);
    }
    if (this.digT <= 0) {
      this.allowReverse(p, ctl);
      this.stepEnt(p, dt, () => this.playerDecide(ctl));
    }
    if (this.status !== 'play') return;

    for (const g of this.guards) this.updateGuard(g, dt);
    this.updateHoles(dt);
    if (this.status !== 'play') return;

    // contact kills
    for (const g of this.guards) {
      if (g.dead || g.trapped || g.grace > 0) continue;
      if (Math.abs(g.x - p.x) < KILL_DIST && Math.abs(g.y - p.y) < KILL_DIST) {
        this.kill('guard');
        return;
      }
    }
  }

  kill(cause) {
    this.status = 'dead';
    this.deathCause = cause;
    this.events.push('die');
  }

  // ---- tween movement ----
  speedFor(ent) { return SPD[ent.kind][ent.move]; }

  stepEnt(ent, dt, decide) {
    let time = dt;
    let cap = 8; // decisions per tick cap
    while (time > 0 && cap-- > 0) {
      if (!ent.moving) {
        const mv = decide();
        if (!mv) break;
        ent.tx = ent.cx + (mv.dx || 0);
        ent.ty = ent.cy + (mv.dy || 0);
        ent.move = mv.move;
        ent.moving = true;
        ent.prog = 0;
        if (mv.dx) ent.face = mv.dx;
      }
      const spd = this.speedFor(ent);
      const need = (1 - ent.prog) / spd;
      if (time >= need) {
        time -= need;
        ent.prog = 0; ent.cx = ent.tx; ent.cy = ent.ty; ent.moving = false;
        ent.anim += need * spd;
        this.onArrive(ent);
        if (this.status !== 'play') break;
      } else {
        ent.prog += spd * time;
        ent.anim += spd * time;
        time = 0;
      }
    }
    ent.x = ent.cx + (ent.tx - ent.cx) * (ent.moving ? ent.prog : 0);
    ent.y = ent.cy + (ent.ty - ent.cy) * (ent.moving ? ent.prog : 0);
  }

  // let the player reverse a horizontal or ladder move mid-tween
  allowReverse(p, ctl) {
    if (!p.moving) return;
    const mdx = p.tx - p.cx, mdy = p.ty - p.cy;
    if (mdx && ctl.dx === -mdx || (mdy && p.move === 'climb' && ctl.dy === -mdy)) {
      [p.cx, p.tx] = [p.tx, p.cx];
      [p.cy, p.ty] = [p.ty, p.cy];
      p.prog = 1 - p.prog;
      if (ctl.dx) p.face = ctl.dx;
    }
  }

  forcedFall(ent) {
    if (!this.support(ent.cx, ent.cy) && !this.blocksFall(ent.cx, ent.cy + 1)) {
      return { dy: 1, move: 'fall' };
    }
    return null;
  }

  playerDecide(ctl) {
    const p = this.player;
    const fall = this.forcedFall(p);
    if (fall) return fall;
    const here = this.at(p.cx, p.cy);
    if (ctl.dy < 0 && here === 'H' && p.cy > 0 && !this.blocksWalk(p.cx, p.cy - 1)) {
      return { dy: -1, move: 'climb' };
    }
    if (ctl.dy > 0 && !this.blocksFall(p.cx, p.cy + 1)) {
      return { dy: 1, move: this.at(p.cx, p.cy + 1) === 'H' ? 'climb' : 'fall' };
    }
    if (ctl.dx && !this.blocksWalk(p.cx + ctl.dx, p.cy)) {
      return { dx: ctl.dx, move: here === '-' ? 'rope' : 'walk' };
    }
    return null;
  }

  onArrive(ent) {
    const k = key(ent.cx, ent.cy);
    if (ent.kind === 'player') {
      if (this.gold.has(k)) {
        this.gold.delete(k);
        this.score += 250;
        this.events.push('gold');
        this.checkReveal();
      }
      if (this.revealed && ent.cy === 0) {
        this.status = 'won';
        this.events.push('win');
      }
    } else {
      if (this.gold.has(k) && !ent.carrying && !ent.trapped) {
        this.gold.delete(k);
        ent.carrying = true;
        this.carried++;
      }
      if (!ent.trapped && this.holes.has(k) && this.support(ent.cx, ent.cy)) {
        ent.trapped = true;
        ent.escT = TRAP_STUN + Math.random() * 0.6;
        ent.escaping = 0;
        this.score += 75;
        this.events.push('trap');
        if (ent.carrying) {
          ent.carrying = false;
          this.carried--;
          this.dropGold(ent.cx, ent.cy - 1);
        }
      }
      if (ent.escaping === 1) {
        // out of the hole; hop aside toward the player if possible
        const pref = this.player.cx >= ent.cx ? 1 : -1;
        let done = false;
        for (const d of [pref, -pref]) {
          if (!this.blocksWalk(ent.cx + d, ent.cy) && !this.guardAt(ent.cx + d, ent.cy, ent)) {
            ent.tx = ent.cx + d; ent.ty = ent.cy;
            ent.move = 'walk'; ent.moving = true; ent.prog = 0; ent.face = d;
            ent.escaping = 2;
            done = true;
            break;
          }
        }
        if (!done) ent.escaping = 0; // nowhere to go; gravity will decide
      } else if (ent.escaping === 2) {
        ent.escaping = 0;
      }
    }
  }

  checkReveal() {
    if (!this.revealed && this.gold.size === 0 && this.carried === 0) {
      this.revealed = true;
      this.events.push('reveal');
    }
  }

  // ---- digging & holes ----
  tryDig(dir) {
    const p = this.player;
    if (p.moving && p.move === 'fall') return; // no digging (or snapping) mid-air
    if (p.moving) { // snap to the nearest center first
      if (p.prog >= 0.5) { p.cx = p.tx; p.cy = p.ty; }
      p.moving = false; p.prog = 0;
      p.x = p.cx; p.y = p.cy;
      this.onArrive(p);
      if (this.status !== 'play') return;
    }
    const { cx, cy } = p;
    if (this.at(cx, cy) === '-' || !this.support(cx, cy)) return;
    const bx = cx + dir, by = cy + 1;
    if (this.at(bx, by) !== '#' || this.grid[by][bx] !== '#') return;
    const clr = this.at(bx, cy);
    if (clr !== ' ' && clr !== '-') return;
    if (this.gold.has(key(bx, cy))) return;
    if (this.guardAt(bx, cy, null)) return;
    this.holes.set(key(bx, by), { x: bx, y: by, age: 0 });
    this.digT = DIG_TIME;
    p.face = dir;
    this.events.push('dig');
  }

  updateHoles(dt) {
    for (const [k, h] of this.holes) {
      h.age += dt;
      if (h.age >= HOLE_LIFE + HOLE_CLOSE) {
        this.holes.delete(k);
        const p = this.player;
        if (p.cx === h.x && p.cy === h.y) { this.kill('sealed'); return; }
        for (const g of this.guards) {
          if (!g.dead && g.cx === h.x && g.cy === h.y) this.killGuard(g);
        }
      }
    }
  }

  holePhase(h) {
    if (h.age < DIG_TIME) return ['opening', h.age / DIG_TIME];
    if (h.age < HOLE_LIFE) return ['open', 0];
    return ['closing', (h.age - HOLE_LIFE) / HOLE_CLOSE];
  }

  // ---- guards ----
  updateGuard(g, dt) {
    if (g.grace > 0) g.grace -= dt;
    if (g.dead) {
      g.respawnT -= dt;
      if (g.respawnT <= 0) this.respawnGuard(g);
      return;
    }
    if (g.trapped) {
      if (!this.holes.has(key(g.cx, g.cy))) { g.trapped = false; return; } // freed early
      g.escT -= dt;
      if (g.escT <= 0 && !g.moving) {
        const p = this.player;
        const blockedByPlayer = p.cx === g.cx && p.cy === g.cy - 1;
        if (!blockedByPlayer && !this.guardAt(g.cx, g.cy - 1, g) && !this.blocksWalk(g.cx, g.cy - 1)) {
          g.trapped = false;
          g.escaping = 1;
          g.tx = g.cx; g.ty = g.cy - 1;
          g.move = 'climb'; g.moving = true; g.prog = 0;
        } else {
          g.escT = 0.4; // blocked; keep struggling
        }
      }
      if (g.moving) this.stepEnt(g, dt, () => null);
      else { g.x = g.cx; g.y = g.cy; }
      return;
    }
    this.stepEnt(g, dt, () => this.guardDecide(g));
  }

  guardDecide(g) {
    if (g.escaping) return null; // scripted moves are queued in onArrive
    const fall = this.forcedFall(g);
    if (fall) return fall;
    const step = this.chaseStep(g);
    if (!step) return null;
    const [dx, dy] = step;
    if (this.guardAt(g.cx + dx, g.cy + dy, g)) return null; // wait; don't stack
    const here = this.at(g.cx, g.cy);
    let move = 'walk';
    if (dy < 0) move = 'climb';
    else if (dy > 0) move = this.at(g.cx, g.cy + 1) === 'H' ? 'climb' : 'fall';
    else if (here === '-') move = 'rope';
    return { dx, dy, move };
  }

  // Board queries that ignore open holes: guards plan as if dug bricks were
  // still there (like the original's guards), so they walk over holes and
  // fall in. Physics (forcedFall) uses the real board.
  atNaive(x, y) {
    if (y < 0) return ' ';
    if (x < 0 || x >= COLS || y >= ROWS) return '@';
    const c = this.grid[y][x];
    return c === 'X' ? (this.revealed ? 'H' : ' ') : c;
  }
  guardMoves(x, y) {
    const out = [];
    const walkable = c => c !== '#' && c !== '@' && c !== 'T';
    const cur = this.atNaive(x, y);
    const below = this.atNaive(x, y + 1);
    const supported = cur === 'H' || cur === '-' || below === '#' || below === '@' || below === 'H';
    if (!supported && below !== '#' && below !== '@') return [[x, y + 1]];
    for (const dx of [-1, 1]) {
      if (walkable(this.atNaive(x + dx, y))) out.push([x + dx, y]);
    }
    if (cur === 'H' && y > 0 && walkable(this.atNaive(x, y - 1))) out.push([x, y - 1]);
    if (below !== '#' && below !== '@') out.push([x, y + 1]);
    return out;
  }

  chaseStep(g) {
    const p = this.player;
    const target = key(p.cx, p.cy);
    g.pathT -= 1;
    if (!g.path || g.pathTarget !== target || g.pathT <= 0) {
      g.path = this.bfs(g, p.cx, p.cy);
      g.pathTarget = target;
      g.pathT = 20; // decisions between recomputes
    }
    if (g.path && g.path.length) {
      const next = g.path[0];
      // only follow if it is still adjacent to us (we may have drifted)
      if (Math.abs(next[0] - g.cx) + Math.abs(next[1] - g.cy) === 1) {
        g.path.shift();
        return [next[0] - g.cx, next[1] - g.cy];
      }
      g.path = null;
    }
    // no path: drift toward the player when legal (falling en route is fine)
    const dx = Math.sign(p.cx - g.cx);
    if (dx && !this.blocksWalk(g.cx + dx, g.cy)) return [dx, 0];
    return null;
  }

  bfs(g, txx, tyy) {
    const startK = g.cx + ',' + g.cy;
    const prev = new Map([[startK, null]]);
    const q = [[g.cx, g.cy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === txx && y === tyy) {
        const path = [];
        let k = x + ',' + y;
        while (prev.get(k)) {
          const [px, py] = k.split(',').map(Number);
          path.unshift([px, py]);
          k = prev.get(k);
        }
        return path;
      }
      for (const [nx, ny] of this.guardMoves(x, y)) {
        const nk = nx + ',' + ny;
        if (!prev.has(nk)) { prev.set(nk, x + ',' + y); q.push([nx, ny]); }
      }
    }
    return null;
  }

  killGuard(g) {
    g.dead = true;
    g.trapped = false;
    g.moving = false;
    g.respawnT = 1.3;
    this.score += 150;
    this.events.push('guardDie');
    if (g.carrying) {
      g.carrying = false;
      this.carried--;
      this.dropGold(g.cx, g.cy - 1);
    }
  }

  respawnGuard(g) {
    const cols = [];
    for (let x = 0; x < COLS; x++) {
      if (!this.blocksWalk(x, 0) && !this.guardAt(x, 0, g)) {
        cols.push(x);
      }
    }
    // prefer columns away from the player
    const px = this.player.cx;
    cols.sort((a, b) => Math.abs(b - px) - Math.abs(a - px));
    const pick = cols.length ? cols[Math.floor(Math.random() * Math.min(4, cols.length))] : 0;
    g.dead = false;
    g.cx = g.tx = pick; g.cy = g.ty = 0;
    g.moving = false; g.prog = 0;
    g.x = g.cx; g.y = g.cy;
    g.grace = SPAWN_GRACE;
    g.path = null;
  }

  // gold dropped by a guard lands on the nearest free cell (usually the hole rim)
  dropGold(x, y) {
    const seen = new Set();
    const q = [[x, y]];
    while (q.length) {
      const [cx, cy] = q.shift();
      const k = key(cx, cy);
      if (seen.has(k)) continue;
      seen.add(k);
      if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS &&
          this.at(cx, cy) === ' ' && !this.gold.has(k) && !this.holes.has(k)) {
        this.gold.add(k);
        this.events.push('drop');
        this.checkReveal();
        return;
      }
      q.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
      if (seen.size > 120) break;
    }
    this.checkReveal();
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
}
