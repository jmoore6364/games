# Moore-Man

A faithful Pac-Man-style maze chase for the Moore Arcade — vanilla JavaScript,
one `<canvas>`, WebAudio sound, and **zero** dependencies or asset files. Every
sprite is drawn procedurally; every sound is synthesized live.

Guide **Moore-Man** (the chomping yellow disc) around the maze, clear all the
dots, and grab a power pellet to turn the tables on the ghosts.

## Play

```
npm start        # serves at http://localhost:8157
```

Then open <http://localhost:8157/>. Any static file server works too.

## The cast

| Ghost | Color | Behavior |
| --- | --- | --- |
| **Blinkmoore** | red | Relentless chaser — targets Moore-Man's exact tile |
| **Pinkmoore** | pink | Ambusher — aims four tiles ahead of you |
| **Inkmoore** | cyan | Flanker — uses Blinkmoore's position to pincer you |
| **Clydemoore** | orange | Bashful — chases from afar, bolts to his corner up close |

Ghosts cycle between **scatter** (retreat to corners) and **chase**. Eat a power
pellet and they turn **frightened** (blue) and flee — catch them for
200 / 400 / 800 / 1600 points in a combo. Eaten ghosts return to the pen as a
pair of eyes and respawn.

## Scoring

- Dot: **10** &nbsp;&middot;&nbsp; Power pellet: **50**
- Frightened ghost: **200 → 400 → 800 → 1600** (rising combo per pellet)
- Fruit bonus: appears below the pen twice per level
- Extra life at **10,000** points

Clear every dot to advance a level. Each level the ghosts get a little faster and
the fright time a little shorter. Three lives; high score is saved locally.

## Controls

| Action | Keyboard | Touch / Gamepad |
| --- | --- | --- |
| Move | Arrows / WASD | On-screen d-pad, swipe, or d-pad/stick |
| Start / confirm | Enter / Space | START button, A |
| Pause | P | Select |
| Mute | M | — |

## Technical notes

- Single 224×288 canvas rendered at native resolution and CSS-scaled to fit the
  window (crisp pixels via `image-rendering: pixelated`).
- Fixed 60 Hz update step with an accumulator, so movement is framerate-stable.
- Grid movement with cornering; ghosts decide direction once per tile using the
  classic "minimize distance to target, no reversing" rule.
- SwiftShader-safe: plain canvas 2D, no WebGL.
- Headless test hook: `window.__mm` exposes `{ start(), state, score, lives,
  level, dotsLeft, press(dir), game, pac, ghosts }`.

## Files

- `index.html` — canvas, styles, on-screen d-pad
- `server.js` — tiny static server on port **8157**
- `src/maze.js` — board layout, tiles, level state
- `src/entities.js` — Moore-Man and ghost movement + AI + drawing
- `src/audio.js` — WebAudio sound synthesis
- `src/input.js` — keyboard, touch, swipe, gamepad
- `src/main.js` — game loop, state machine, HUD, scoring
