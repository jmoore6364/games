// Grid A* pathfinding with diagonal movement (no corner cutting).
// isBlocked(tx, ty) -> true if the tile cannot be entered.
// Returns array of {x, y} tile coordinates (waypoints, excluding start), or null.

export function pathfind(w, h, sx, sy, gx, gy, isBlocked, maxNodes = 6000) {
  sx |= 0; sy |= 0; gx |= 0; gy |= 0;
  if (sx === gx && sy === gy) return [];
  if (gx < 0 || gy < 0 || gx >= w || gy >= h) return null;

  // If goal blocked, retarget to nearest walkable neighbour of goal.
  if (isBlocked(gx, gy)) {
    const alt = nearestOpen(w, h, gx, gy, isBlocked);
    if (!alt) return null;
    gx = alt.x; gy = alt.y;
    if (sx === gx && sy === gy) return [];
  }

  const size = w * h;
  const idx = (x, y) => y * w + x;
  const gScore = new Float64Array(size).fill(Infinity);
  const fScore = new Float64Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const start = idx(sx, sy);
  gScore[start] = 0;
  fScore[start] = octile(sx, sy, gx, gy);

  // simple binary heap on fScore
  const heap = [start];
  const inHeap = new Uint8Array(size);
  inHeap[start] = 1;
  const less = (a, b) => fScore[a] < fScore[b];
  function push(n) {
    heap.push(n); inHeap[n] = 1;
    let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (less(heap[i], heap[p])) { [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } else break; }
  }
  function pop() {
    const top = heap[0]; const last = heap.pop(); inHeap[top] = 0;
    if (heap.length) {
      heap[0] = last; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let s = i;
        if (l < heap.length && less(heap[l], heap[s])) s = l;
        if (r < heap.length && less(heap[r], heap[s])) s = r;
        if (s === i) break; [heap[i], heap[s]] = [heap[s], heap[i]]; i = s; }
    }
    return top;
  }

  const goal = idx(gx, gy);
  let expanded = 0;
  const DIRS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142],
  ];

  while (heap.length) {
    const cur = pop();
    if (cur === goal) return reconstruct(came, cur, w);
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++expanded > maxNodes) return null;
    const cx = cur % w, cy = (cur / w) | 0;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (isBlocked(nx, ny)) continue;
      // no corner cutting on diagonals
      if (dx !== 0 && dy !== 0) {
        if (isBlocked(cx + dx, cy) || isBlocked(cx, cy + dy)) continue;
      }
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const tg = gScore[cur] + cost;
      if (tg < gScore[ni]) {
        came[ni] = cur;
        gScore[ni] = tg;
        fScore[ni] = tg + octile(nx, ny, gx, gy);
        if (!inHeap[ni]) push(ni);
        else push(ni); // lazy: allow duplicate, closed guard handles it
      }
    }
  }
  return null;
}

function octile(x0, y0, x1, y1) {
  const dx = Math.abs(x0 - x1), dy = Math.abs(y0 - y1);
  return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy);
}

function reconstruct(came, cur, w) {
  const path = [];
  while (came[cur] !== -1) {
    path.push({ x: cur % w, y: (cur / w) | 0 });
    cur = came[cur];
  }
  path.reverse();
  return path;
}

// BFS ring outward to find nearest non-blocked tile to (gx,gy)
export function nearestOpen(w, h, gx, gy, isBlocked, maxR = 12) {
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = gx + dx, y = gy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (!isBlocked(x, y)) return { x, y };
      }
    }
  }
  return null;
}
