// Moormings — 12 levels across 3 tiers. Headless-safe (pure data + helpers).
//
// Terrain ops (see sim.js buildTerrain): rect / steel / clear / cut / slope.
// World is 640x160. y grows downward. A moorming's y is the ground pixel
// under its feet. Falls > ~62px splat. Step-up max 6px, builders climb 1px
// per 2px forward, 12 bricks per builder (24px reach).
//
// Every level carries a `solution`: a scripted, condition-triggered sequence
// of assignments that verify.js replays headlessly to prove the save quota
// is reachable. Conditions: fire when moorming `m` (or `watch`) is within
// 3px of `x` (optionally matching `dir`/`y`), or at tick `at`, or when
// `savedAtLeast` moormings have exited. Commands retry until they succeed.

export const TIERS = ['Fun', 'Tricky', 'Taxing'];

export const LEVELS = [

  // ============================== FUN ==============================

  {
    // 1 — the classic "dig through the floor" intro. Moormings pace a
    // floating meadow slab penned in by two rock nubs. Solution: assign one
    // digger anywhere mid-slab (script: at x=220). Everyone funnels down the
    // shaft, drops 30px to the valley floor, strolls right to the door.
    id: 1, tier: 0, title: 'Just Dig!', theme: 'moss',
    rate: 50, spawn: 10, quota: 8, time: 240,
    skills: { digger: 10 },
    hatch: { x: 200, y: 80 }, exit: { x: 500, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 120, y: 96, w: 200, h: 30 },
      { op: 'rect', x: 120, y: 86, w: 8, h: 10 },
      { op: 'rect', x: 312, y: 86, w: 8, h: 10 },
    ],
    hazards: [],
    solution: [
      { m: 0, skill: 'digger', x: 220 },
    ],
  },

  {
    // 2 — the builder-bridge chasm. A water gulf (280..323) splits two
    // plateaus. Solution: moorming 0 builds two chained bridges from the lip
    // (assigned at x=274, re-assigned on the shrug at x=299); moorming 1 is
    // a blocker at x=150 holding the crowd; once the pioneer reaches x=340
    // on the far side the blocker is bombed and the crowd crosses. Lose 1.
    id: 2, tier: 0, title: 'A Bridge Too Far', theme: 'moss',
    rate: 30, spawn: 15, quota: 10, time: 300,
    skills: { builder: 3, blocker: 1, bomber: 1 },
    hatch: { x: 60, y: 80 }, exit: { x: 560, y: 100 },
    terrain: [
      { op: 'rect', x: 0, y: 100, w: 280, h: 60 },
      { op: 'rect', x: 316, y: 100, w: 324, h: 60 },
    ],
    hazards: [{ x: 280, y: 150, w: 36, h: 10, type: 'water' }],
    solution: [
      { m: 1, skill: 'blocker', x: 150 },
      { m: 0, skill: 'builder', x: 274 },
      { m: 0, skill: 'builder', x: 299 },
      { m: 1, skill: 'bomber', watch: 0, x: 340 },
    ],
  },

  {
    // 3 — the blocker-and-bash cavern. The crowd drops into a walled cave
    // with a lava crack in the floor to the left. Solution: moorming 0
    // bashes the right wall (assigned at x=396); moorming 1 bounces off the
    // unfinished tunnel face, is made a blocker on the way back (x=266,
    // facing left) so nobody reaches the lava, and is bombed once 13 are
    // home. Everyone else follows the tunnel out. Lose at most 1.
    id: 3, tier: 0, title: 'Hold the Line', theme: 'moss',
    rate: 40, spawn: 15, quota: 10, time: 300,
    skills: { blocker: 2, basher: 2, bomber: 2 },
    hatch: { x: 300, y: 90 }, exit: { x: 560, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 180, y: 60, w: 20, h: 80 },
      { op: 'rect', x: 400, y: 60, w: 80, h: 80 },
      { op: 'rect', x: 180, y: 60, w: 300, h: 15 },
      { op: 'clear', x: 220, y: 140, w: 30, h: 20 },
    ],
    hazards: [{ x: 220, y: 150, w: 30, h: 10, type: 'lava' }],
    solution: [
      { m: 0, skill: 'basher', x: 396, dir: 1 },
      { m: 1, skill: 'blocker', x: 266, dir: -1 },
      { m: 1, skill: 'bomber', savedAtLeast: 13 },
    ],
  },

  {
    // 4 — floater school. The hatch ledge ends in an 80px drop: certain
    // splat without an umbrella. Solution: give every moorming a floater as
    // it crosses x=130 on the ledge. They drift down and walk to the door.
    id: 4, tier: 0, title: 'Look Before You Leap', theme: 'moss',
    rate: 50, spawn: 15, quota: 12, time: 240,
    skills: { floater: 15 },
    hatch: { x: 110, y: 40 }, exit: { x: 500, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 80, y: 60, w: 70, h: 10 },
      { op: 'rect', x: 80, y: 50, w: 8, h: 10 },
    ],
    hazards: [],
    solution: Array.from({ length: 15 }, (_, i) => ({ m: i, skill: 'floater', x: 130 })),
  },

  // ============================ TRICKY =============================

  {
    // 5 — "one moorming does everything". A single moorming, saved or bust.
    // Solution: dig through the start slab at x=200 into the crawlspace,
    // walk out right, chain THREE builders over the lava gap (x=312, then
    // re-assign at the shrugs at x=337 and x=361), then bash the far wall
    // (x=446) and stroll home.
    id: 5, tier: 1, title: 'Moore Alone', theme: 'crystal',
    rate: 50, spawn: 1, quota: 1, time: 300,
    skills: { digger: 1, builder: 3, basher: 1 },
    hatch: { x: 60, y: 60 }, exit: { x: 580, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 0, y: 80, w: 240, h: 80 },
      { op: 'clear', x: 0, y: 120, w: 240, h: 20 },
      { op: 'rect', x: 232, y: 70, w: 8, h: 10 },
      { op: 'clear', x: 320, y: 140, w: 50, h: 20 },
      { op: 'rect', x: 450, y: 90, w: 24, h: 50 },
    ],
    hazards: [{ x: 320, y: 150, w: 50, h: 10, type: 'lava' }],
    solution: [
      { m: 0, skill: 'digger', x: 200 },
      { m: 0, skill: 'builder', x: 312 },
      { m: 0, skill: 'builder', x: 337 },
      { m: 0, skill: 'builder', x: 361 },
      { m: 0, skill: 'basher', x: 446, dir: 1 },
    ],
  },

  {
    // 6 — steel lesson. The crowd is penned on a mesa. A steel plate
    // (x 400..520 at y 100) shields the buried exit hall except at its
    // flanks. Solution: dig at x=390 (left of the plate — digging over the
    // plate just clinks and wastes nothing but time). Everyone funnels
    // through the shaft into the hall and out. Two diggers = one spare try.
    id: 6, tier: 1, title: 'The Iron Ceiling', theme: 'crystal',
    rate: 50, spawn: 14, quota: 10, time: 240,
    skills: { digger: 2 },
    hatch: { x: 450, y: 54 }, exit: { x: 470, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 360, y: 84, w: 200, h: 76 },
      { op: 'clear', x: 380, y: 116, w: 160, h: 24 },
      { op: 'steel', x: 400, y: 106, w: 120, h: 10 },
      { op: 'steel', x: 360, y: 74, w: 8, h: 10 },
      { op: 'steel', x: 552, y: 74, w: 8, h: 10 },
    ],
    hazards: [],
    solution: [
      { m: 0, skill: 'digger', x: 390, dir: -1 },
    ],
  },

  {
    // 7 — athletes only. A 100px tower splits the map; the far side is a
    // 100px drop. Solution: make every moorming a climber AND a floater as
    // it walks out (both assigned around x=150). They scale the tower, walk
    // its top, and parachute off the far edge to the door.
    id: 7, tier: 1, title: 'Up and Over', theme: 'crystal',
    rate: 60, spawn: 12, quota: 10, time: 240,
    skills: { climber: 12, floater: 12 },
    hatch: { x: 80, y: 100 }, exit: { x: 520, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 300, y: 40, w: 30, h: 120 },
    ],
    hazards: [],
    solution: Array.from({ length: 12 }, (_, i) => [
      { m: i, skill: 'climber', x: 150 },
      { m: i, skill: 'floater', x: 150 },
    ]).flat(),
  },

  {
    // 8 — miner + basher, and steel used as a tool. Solution: moorming 0
    // mines down-forward from the shelf lip (x=254) into the massif until
    // the buried steel floor clinks the pick away (~x=290, y=136). It walks
    // back up its own tunnel, bounces, returns, and is given a basher at the
    // tunnel foot facing right (x=290) — carving a level gallery along the
    // steel clear through the massif. The whole crowd follows the tunnels.
    id: 8, tier: 1, title: 'Mine All Mine', theme: 'crystal',
    rate: 50, spawn: 12, quota: 11, time: 360,
    skills: { miner: 2, basher: 2 },
    hatch: { x: 60, y: 80 }, exit: { x: 560, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 0, y: 100, w: 260, h: 60 },
      { op: 'rect', x: 260, y: 60, w: 220, h: 80 },
      { op: 'steel', x: 260, y: 136, w: 220, h: 8 },
    ],
    hazards: [],
    solution: [
      { m: 0, skill: 'miner', x: 254, dir: 1 },
      { m: 0, skill: 'basher', x: 290, dir: 1, y: 136 },
    ],
  },

  // ============================ TAXING =============================

  {
    // 9 — crowd-control under a firehose. Release rate is locked high; lava
    // pits flank the map; only 2 may be lost (and the blocker is 1).
    // Solution: moorming 0 rides the full loop (right off the platform is
    // walled, so the flow spills LEFT toward lava) and becomes the blocker
    // at x=180 facing left. Moorming 1 turns at the blocker and bashes the
    // wall base at x=396. Everyone else follows through to the door; the
    // blocker is bombed once 19 are home. Saves 19/20.
    id: 9, tier: 2, title: 'Compression Chamber', theme: 'inferno',
    rate: 80, spawn: 20, quota: 18, time: 240,
    skills: { blocker: 1, basher: 1, bomber: 1 },
    hatch: { x: 320, y: 80 }, exit: { x: 500, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 240, y: 100, w: 160, h: 10 },
      { op: 'rect', x: 400, y: 60, w: 20, h: 80 },
      { op: 'clear', x: 80, y: 140, w: 60, h: 20 },
      { op: 'clear', x: 560, y: 140, w: 60, h: 20 },
    ],
    hazards: [
      { x: 80, y: 150, w: 60, h: 10, type: 'lava' },
      { x: 560, y: 150, w: 60, h: 10, type: 'lava' },
    ],
    solution: [
      { m: 0, skill: 'blocker', x: 180, dir: -1 },
      { m: 1, skill: 'basher', x: 396, dir: 1, y: 140 },
      { m: 0, skill: 'bomber', savedAtLeast: 19 },
    ],
  },

  {
    // 10 — steel world; only one dirt seam gives in. Solution: dig the seam
    // at x=151 (everything else clinks). Moorming 1 becomes a blocker at
    // x=210 holding the crowd on the steel floor. The pioneer chains
    // builders: two from x=252 arc exactly over the 20px steel stub (the
    // second bridge's bricks clear its top by 3px), then THREE from x=372
    // to span the lava pool, touching down at x=447. Once the pioneer is
    // home the blocker is bombed and the crowd walks the road. Lose 1.
    id: 10, tier: 2, title: 'Steel Works', theme: 'inferno',
    rate: 45, spawn: 12, quota: 10, time: 300,
    skills: { digger: 1, builder: 5, blocker: 1, bomber: 1 },
    hatch: { x: 100, y: 60 }, exit: { x: 540, y: 140 },
    terrain: [
      { op: 'steel', x: 0, y: 140, w: 640, h: 20 },
      { op: 'steel', x: 60, y: 90, w: 120, h: 10 },
      { op: 'rect', x: 146, y: 90, w: 12, h: 10 },
      { op: 'steel', x: 300, y: 120, w: 20, h: 20 },
    ],
    hazards: [{ x: 400, y: 130, w: 40, h: 10, type: 'lava' }],
    solution: [
      { m: 0, skill: 'digger', x: 151 },
      { m: 1, skill: 'blocker', x: 210, dir: 1 },
      { m: 0, skill: 'builder', x: 252 },
      { m: 0, skill: 'builder', x: 277 },
      { m: 0, skill: 'builder', x: 372 },
      { m: 0, skill: 'builder', x: 397 },
      { m: 0, skill: 'builder', x: 421 },
      { m: 1, skill: 'bomber', savedAtLeast: 1 },
    ],
  },

  {
    // 11 — every trick on the walk home, with a 12-of-14 quota. Solution:
    // moorming 1 blocks at x=110 while the pioneer bashes the near wall
    // (x=146), lays three bridges over the lava gap (x=232 / 257 / 281),
    // bashes into the massif crawlway at x=356, and walks out. When the
    // pioneer clears the massif (x=520) the blocker is bombed and 12
    // followers walk the finished road. Lose only the blocker.
    id: 11, tier: 2, title: 'The Long Way Home', theme: 'inferno',
    rate: 40, spawn: 14, quota: 12, time: 300,
    skills: { basher: 2, builder: 3, blocker: 1, bomber: 1 },
    hatch: { x: 70, y: 90 }, exit: { x: 580, y: 140 },
    terrain: [
      { op: 'rect', x: 0, y: 140, w: 640, h: 20 },
      { op: 'rect', x: 150, y: 90, w: 30, h: 50 },
      { op: 'clear', x: 240, y: 140, w: 50, h: 20 },
      { op: 'rect', x: 360, y: 70, w: 140, h: 70 },
      { op: 'clear', x: 390, y: 112, w: 110, h: 28 },
    ],
    hazards: [{ x: 240, y: 150, w: 50, h: 10, type: 'lava' }],
    solution: [
      { m: 1, skill: 'blocker', x: 110 },
      { m: 0, skill: 'basher', x: 146, dir: 1 },
      { m: 0, skill: 'builder', x: 232 },
      { m: 0, skill: 'builder', x: 257 },
      { m: 0, skill: 'builder', x: 281 },
      { m: 0, skill: 'basher', x: 356, dir: 1 },
      { m: 1, skill: 'bomber', watch: 0, x: 520 },
    ],
  },

  {
    // 12 — the finale. 18 of 20 must live, so the nuke is off the table, and
    // the 60s clock cannot be beaten at the minimum release rate — you must
    // crank the rate to 99 at once, then dig the deck just right of the
    // drop point (x=344) before the crowd disperses. Strays bounce off the deck
    // stub at x=400 and fall into the shaft; on the lower level a steel
    // fence at x=296 turns left-walkers away from the lava lake. Saves 20.
    id: 12, tier: 2, title: 'Last Orders', theme: 'inferno',
    rate: 20, spawn: 20, quota: 18, time: 60,
    skills: { digger: 2, blocker: 2 },
    hatch: { x: 330, y: 80 }, exit: { x: 560, y: 140 },
    terrain: [
      { op: 'rect', x: 280, y: 140, w: 360, h: 20 },
      { op: 'rect', x: 0, y: 100, w: 640, h: 12 },
      { op: 'rect', x: 400, y: 80, w: 12, h: 20 },
      { op: 'steel', x: 296, y: 120, w: 8, h: 20 },
    ],
    hazards: [{ x: 0, y: 150, w: 280, h: 10, type: 'lava' }],
    solution: [
      { rate: 99, at: 2 },
      { m: 0, skill: 'digger', x: 344 },
    ],
  },
];
