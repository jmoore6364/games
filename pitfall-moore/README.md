# Pitfall Moore

A Pitfall!-style jungle flip-screen adventure for the Moore Arcade. Vanilla
JavaScript ES modules, zero dependencies, zero external assets — all graphics
are procedurally drawn on a 2D `<canvas>` and all sound is synthesized with
WebAudio.

## Play

```
npm start          # or: node server.js
```

Then open http://localhost:8167/

Run, jump, and swing through a 20-screen looping jungle. **12 treasures** are
scattered across the screens — collect them all before the **12-minute clock**
runs out. Below the jungle floor runs an underground tunnel: each tunnel exit
**skips two screens** instead of one, but scorpions patrol it and brick walls
block some passages.

### The jungle (every screen is deterministic, like the original's LFSR world)
- **Rolling logs** — jump them; a hit costs 100 points, not a life.
- **Black holes** — fall in and you drop to the tunnel (−100 points).
- **Tar pits** — always deadly; swing across on the pendulum vine (touch it
  in mid-air to grab, jump to let go with its momentum).
- **Quicksand** — yawns open and shut; cross while it's closed.
- **Croc ponds** — hop across three croc heads. When the jaws open, only the
  back of each head is safe footing.
- **Snakes and campfires** — deadly; jump over them.
- **Scorpions** — patrol the tunnels; jumpable, but the ceiling is low.
- **Ladders** — every 4th screen connects the surface to the tunnel.

### Scoring
- Start with 2000 points (a hit or hole costs 100, floor at 0)
- Money bag +2000 · silver bar +3000 · gold bar +4000 · diamond ring +5000
- Collect all 12 treasures: victory + 5 points per second remaining
- 3 lives; deaths (crocs, tar, quicksand, snake, fire, scorpion) respawn you
  at the left edge of the same screen

## Controls
- **Arrow keys / WASD** — run; up/down climb ladders
- **Space** — jump (also releases the vine)
- **Enter** — start / restart
- **M** — mute/unmute
- **Gamepad** — stick/d-pad moves, A = jump, Start = start
- **On-screen d-pad + JUMP + START** — touch devices (revealed on first touch)

## Files
- `index.html` — page shell, inline CSS, canvas, touch controls
- `server.js` — tiny static file server on port 8167
- `src/main.js` — bootstrap, physics, state machine, HUD, `window.__pf` hook
- `src/world.js` — deterministic screen generation + hazard timing cycles
- `src/entities.js` — procedural sprites and screen painting
- `src/audio.js` — WebAudio sound effects (vine yodel, treasure jingle, …)
- `src/input.js` — keyboard + touch + gamepad input

## Test hook
`window.__pf` exposes `{ game, start(), state(), pos(), hold(dir,bool),
warp(screen,x,under), screens(), setTime(t), setLives(n), collectAllBut(n) }`
for automated testing.

## Tech notes
Pure Canvas 2D (SwiftShader-safe), 60fps `requestAnimationFrame` loop, fixed
320×224 internal resolution scaled responsively to fill the window with a
crisp pixel look.
