# Frogg-Moore

A Frogger-style road-and-river crossing arcade game for the Moore Arcade.
Vanilla JavaScript ES modules, zero dependencies, zero external assets — all
graphics are procedurally drawn on a 2D `<canvas>` and all sound is synthesized
with WebAudio.

## Play

```
npm start          # or: node server.js
```

Then open http://localhost:8159/

Guide the frog from the bottom bank, across five lanes of traffic, over a median,
and across a river of logs and diving turtles to fill all **5 home bays** at the
top. Clear all five to advance to a faster level.

### Rules
- **Road:** touching any vehicle squashes the frog.
- **River:** water is deadly — you must ride logs and turtles. The frog moves
  *with* the platform and drowns if carried off-screen. Some turtles dive
  underwater periodically; don't be standing on one when it submerges.
- **Homes:** land inside an empty bay to score; hitting the hedge kills you.
- **Timer:** each crossing is against a countdown bar. Let it run out and you die.
- **Fly bonus:** an insect occasionally lands on an empty bay — reach it for +200.

### Scoring
- +10 per row of forward progress
- +50 for reaching a home (plus time bonus)
- +200 fly bonus
- +1000 for clearing a level
- 5 lives.

## Controls
- **Arrow keys** or **WASD** — hop one tile
- **Enter** (or **Space**) — start / restart
- **M** — mute/unmute
- **On-screen d-pad + START** — touch devices (revealed on first touch)

## Files
- `index.html` — page shell, inline CSS, canvas, touch d-pad
- `server.js` — tiny static file server on port 8159
- `src/main.js` — bootstrap, state machine, HUD, render loop, `window.__fm` hook
- `src/world.js` — playfield layout, level building, frog simulation, collisions
- `src/entities.js` — moving actors + procedural sprite drawing
- `src/audio.js` — WebAudio sound effects (hop, splash, squash, jingles)
- `src/input.js` — keyboard + touch input

## Test hook
`window.__fm` exposes `{ start(), hop(dir), state, score, lives, level, frog }`
for automated testing (dir: 0=up, 1=right, 2=down, 3=left).

## Tech notes
Pure Canvas 2D (SwiftShader-safe), 60fps `requestAnimationFrame` loop, fixed
480×560 internal resolution scaled responsively to fill the window with a crisp
pixel look.
