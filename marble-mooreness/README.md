# Marble Mooreness

A Marble Madness (Atari, 1984) style **isometric marble roller**. Guide a
rolling marble down six surreal isometric courses to the goal before the clock
runs out. It's all about momentum: the marble *accelerates and keeps rolling* —
slopes speed you up, edges drop you into the void, and leftover time carries
into the next race.

Vanilla JS + `<canvas>`, ES modules, **zero dependencies, zero assets**. Canvas
is 320×240, pixel-scaled.

## Run

```
npm start            # serves on http://localhost:8153
# or: node server.js
```

Open the URL. `npm test` runs the headless physics/reachability suite.

## Controls & the iso mapping

The controls are **screen-relative**, the way Marble Madness intends: you push
the direction you want the marble to go *on screen*, and the game resolves that
onto the two diagonal isometric ground axes.

| Input | Marble goes | World axes |
|-------|-------------|------------|
| **Up** / W | up the screen (away, up-course) | −x, −y |
| **Down** / S | down the screen (toward you) | +x, +y |
| **Left** / A | screen-left | −x, +y |
| **Right** / D | screen-right | +x, −y |
| **X / Space / Z** | hop (small — pop over a Slinky or a lip) | +z |
| **Enter / P** | pause |
| **M** | mute |

Diagonals combine, so holding Down+Right rolls the marble straight along one
iso edge. Because the world axes run at 45°, `world +x` renders as **down-right**
and `world +y` as **down-left** — pushing *down* (both) sends the marble toward
the camera, down the course.

- **Gamepad**: left stick / d-pad roll (analog — a half push accelerates
  gently), A/B hop, Start pauses.
- **Touch**: drag the on-screen analog stick to roll, HOP and MENU buttons.
  (Force the touch UI on desktop with `?touch=1`.)

## The physics (`src/physics.js`)

A tunable arcade **heightfield ball roller** — not a full rigid-body sim:

- Marble state is `(x, y, z)` + velocity. `x,y` are tiles on the ground plane,
  `z` is height in the same units.
- The course is a **heightmap** (float heights) + a **surface-type** grid. The
  ground height under the marble is a bilinear sample, so ramps are smooth and
  slopes give a *continuous* downhill pull (`SLOPE` force along the gradient).
- **Momentum & friction**: input adds acceleration; rolling friction bleeds
  speed (ice keeps it, slime kills it). Nothing stops instantly.
- **Gravity** governs falls and rolling off ledges. Roll onto a `VOID` cell and
  the ground vanishes — you plummet past the kill plane and respawn.
- **Walls** are solid rails: axis-separated collision bounces you off.
- **Launch pads** fling the marble into the air if crossed with speed.

All of `physics.js` and `courses.js` are DOM-free and importable in Node. The
test asserts the marble advances with momentum, coasts after input, accelerates
down slopes, falls off edges, and that **every course's goal is physically
reachable from the start** (a BFS over walkable height-steps, jump gaps
included).

## The six courses (`src/courses.js`)

Each course is graded as a smooth planar iso slope (high START → low GOAL) so
the marble always tends to roll the right way, with features layered on top.
Time is a **budget that carries over** — leftover seconds roll into the next
race, and the goal tally rewards what's left.

1. **Practice** — a wide, kindly ramp. Learn the roll.
2. **Beginner** — narrower, a launch ramp, one black **Steelie** rival marble.
3. **Intermediate** — a **slime pool** to skirt, a jump across a void gap, a checkpoint.
4. **Aerial** — narrow **catwalks over the void**; one slip and you fall. A jump across a gap.
5. **Slime Pit** — sticky goo, funnel rails, chasing **Slinkies**, a **suction wave** shoving you toward the edge, a silly ice patch.
6. **The Gauntlet** — everything at once: ice, an **acid pool**, rails, a jump, suction, Steelies + a Slinky, two checkpoints.

**Hazards & enemies**: void edges (fall), acid/slime pools (dissolve → respawn),
the ramming **Steelie**, chasing **Slinkies**, suction waves, funnels, launch
ramps, ice, and rails. Falling or getting dissolved respawns you at the last
checkpoint (or start) and shaves a little time — the clock never stops.

## Tips

- Don't fight the slope — steer *with* the downhill and tap against it to brake.
- On the aerial catwalks, feather short taps; over-accelerating flings you off.
- Slime and acid look alike: green **slime** just slows you, purple-flecked
  **acid** dissolves you. Skirt the rims.
- Grab checkpoints — they're your respawn point and worth points.
- Bank time on the easy courses; you'll need the carry-over later.

## Presentation

- Isometric procedural pixel art: heightfield **block tiles** with height-shaded
  side faces, a shaded marble with a **rolling highlight** and speed streaks,
  animated acid/slime/ice/launch tiles, a checkered goal + waving flag.
- WebAudio synth: two quirky bouncy course themes, a **continuous rolling
  rumble that rises with speed**, plus launch whoosh, plummet, splat, bump,
  checkpoint chime, goal fanfare, low-time tick, and game-over sting. `M` mutes.

## Not included / future

- **2-player co-op** (the two-marbles-racing Marble Madness signature) is left
  as future work: the single-camera scroll and shared timer are built around
  one marble, so a faithful split would need a second viewport. The input layer
  already isolates per-source state, so a second key cluster is a natural
  extension.
