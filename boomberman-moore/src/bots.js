// CPU bot AI for battle mode: bomb soft blocks / rivals, flee blast danger,
// grab powerups, hunt survivors late round. Feeds fake inputs to the world.

import { GW, GH, T, idx } from './levels.js';
import { center } from './entities.js';

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function botInit(p) {
  p.isBot = true;
  p.bot = {
    path: null, fleeing: false, cool: 0,
    stuck: 0, lastPx: 0, lastPy: 0, wantMove: false,
  };
}

function passable(world, x, y) {
  if (world.tile(x, y) !== T.FLOOR) return false;
  if (world.bombAt(x, y)) return false;
  return true;
}

// BFS over the grid. allow(x, y, depth), isGoal(x, y, depth). Returns a path
// (array of cells, excluding the start) to the nearest goal, or null.
function bfs(world, sx, sy, allow, isGoal, maxDepth = 50) {
  const prev = new Int16Array(GW * GH).fill(-1);
  const depth = new Int16Array(GW * GH).fill(-1);
  const start = idx(sx, sy);
  depth[start] = 0;
  const q = [start];
  let goal = -1;
  while (q.length) {
    const cur = q.shift();
    const x = cur % GW, y = (cur / GW) | 0;
    const d = depth[cur];
    if (isGoal(x, y, d)) { goal = cur; break; }
    if (d >= maxDepth) continue;
    // shuffled order so bots don't all mirror each other
    const order = DIRS4.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const [dx, dy] of order) {
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= GW - 1 || ny >= GH - 1) continue;
      const ni = idx(nx, ny);
      if (depth[ni] !== -1) continue;
      if (!allow(nx, ny, d + 1)) continue;
      depth[ni] = d + 1;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  if (goal < 0) return null;
  const path = [];
  let cur = goal;
  while (cur !== start && cur >= 0) {
    path.unshift({ x: cur % GW, y: (cur / GW) | 0 });
    cur = prev[cur];
  }
  return path;
}

// How attractive is dropping a bomb at (x, y)? Soft blocks in blast + rivals in line.
function bombWorth(world, p, x, y) {
  let worth = 0;
  for (const [dx, dy] of DIRS4) {
    for (let i = 1; i <= p.range; i++) {
      const t = world.tile(x + dx * i, y + dy * i);
      if (t === T.HARD || t === T.BREAK) break;
      if (t === T.SOFT) { worth += 1; break; }
      if (world.bombAt(x + dx * i, y + dy * i)) break;
      for (const q of world.players) {
        if (q !== p && q.alive && q.cx === x + dx * i && q.cy === y + dy * i) worth += 3;
      }
    }
  }
  return worth;
}

// Would the bot survive its own bomb here? Look for a reachable cell outside
// the hypothetical blast that is not otherwise doomed.
function escapeExists(world, p, cx, cy) {
  const cells = world.blastCells({ cx, cy, range: p.range });
  const inBlast = new Set(cells.map((c) => idx(c.x, c.y)));
  const danger = world.dangerMap();
  const fpc = 16 / p.speed;
  const path = bfs(
    world, cx, cy,
    (x, y, d) => passable(world, x, y) && danger[idx(x, y)] > d * fpc + 10,
    (x, y) => !inBlast.has(idx(x, y)) && danger[idx(x, y)] === 9999,
    Math.max(4, Math.floor(130 / fpc)),
  );
  return !!path;
}

export function botThink(world, p) {
  const out = { dx: 0, dy: 0, bomb: false, act: false };
  if (!p.alive) return out;
  const bot = p.bot;
  const cx = p.cx, cy = p.cy;
  const ci = idx(cx, cy);
  const danger = world.dangerMap();
  const fpc = 16 / p.speed;
  if (bot.cool > 0) bot.cool--;

  // stuck? drop the plan and jiggle
  if (bot.wantMove && Math.abs(p.px - bot.lastPx) < 0.3 && Math.abs(p.py - bot.lastPy) < 0.3) bot.stuck++;
  else bot.stuck = 0;
  bot.lastPx = p.px; bot.lastPy = p.py;
  if (bot.stuck > 25) { bot.path = null; bot.stuck = 0; }

  const inDanger = danger[ci] < 9999;

  if (inDanger) {
    if (!bot.fleeing || world.frame % 5 === 0 || !bot.path || !bot.path.length) {
      bot.path =
        bfs(world, cx, cy,
          (x, y, d) => passable(world, x, y) && danger[idx(x, y)] > (d + 1) * fpc + 4,
          (x, y) => danger[idx(x, y)] === 9999, 40)
        || bfs(world, cx, cy,
          (x, y) => passable(world, x, y) && !world.flameAt(x, y),
          (x, y) => danger[idx(x, y)] > danger[ci] + 40, 40);
      bot.fleeing = true;
    }
  } else {
    bot.fleeing = false;

    // remote holders: detonate once clear of their own blast
    if (p.remote) {
      const mine = world.bombs.find((b) => b.owner === p && b.remote);
      if (mine) {
        const cells = world.blastCells(mine);
        if (!cells.some((c) => c.x === cx && c.y === cy)) out.act = true;
      }
    }

    // drop a bomb when standing somewhere worthwhile and escape is possible
    let mineCount = 0;
    for (const b of world.bombs) if (b.owner === p) mineCount++;
    if (bot.cool <= 0 && mineCount < p.maxBombs && bombWorth(world, p, cx, cy) > 0
        && escapeExists(world, p, cx, cy)) {
      out.bomb = true;
      bot.cool = 40;
      bot.path = null;
      return out;
    }

    // validate current step
    if (bot.path && bot.path.length) {
      const n = bot.path[0];
      if (!passable(world, n.x, n.y) || danger[idx(n.x, n.y)] < 45) bot.path = null;
    }

    // plan a new goal
    if (!bot.path || !bot.path.length) {
      let softCount = 0;
      for (let i = 0; i < world.grid.length; i++) if (world.grid[i] === T.SOFT) softCount++;
      const hunting = softCount < 10 || !!world.shrinkList;
      bot.path = bfs(world, cx, cy,
        (x, y, d) => passable(world, x, y) && danger[idx(x, y)] > (d + 2) * fpc + 20,
        (x, y, d) => {
          if (d === 0) return false;
          if (world.pickupAt(x, y)) return true;
          if (bombWorth(world, p, x, y) >= (hunting ? 1 : 1)) return true;
          if (hunting) {
            for (const q of world.players) {
              if (q !== p && q.alive && Math.abs(q.cx - x) + Math.abs(q.cy - y) <= 1) return true;
            }
          }
          return false;
        }, 50);
      // nothing to do: wander to a random nearby safe cell
      if (!bot.path) {
        const opts = DIRS4.filter(([dx, dy]) =>
          passable(world, cx + dx, cy + dy) && danger[idx(cx + dx, cy + dy)] === 9999);
        if (opts.length) {
          const [dx, dy] = opts[(Math.random() * opts.length) | 0];
          bot.path = [{ x: cx + dx, y: cy + dy }];
        }
      }
    }
  }

  // follow the path
  if (bot.path && bot.path.length) {
    const n = bot.path[0];
    const tx = center(n.x), ty = center(n.y);
    if (Math.abs(p.px - tx) <= 1 && Math.abs(p.py - ty) <= 1) {
      bot.path.shift();
    } else {
      if (Math.abs(tx - p.px) > 1) out.dx = Math.sign(tx - p.px);
      else if (Math.abs(ty - p.py) > 1) out.dy = Math.sign(ty - p.py);
    }
    bot.wantMove = !!(out.dx || out.dy);
  } else {
    bot.wantMove = false;
  }
  return out;
}
