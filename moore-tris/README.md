# Moore-tris

A Tetris-style block-stacking puzzle for the Moore Arcade. Vanilla JavaScript ES
modules, a single 2D `<canvas>`, WebAudio sound — zero dependencies, zero asset
files. Everything is drawn and synthesized procedurally.

## Run

```
npm start          # node server.js
```

Then open http://localhost:8158/

## How to play

Clear horizontal lines by filling all 10 columns of a row. Clearing more rows at
once scores more; a 4-line clear is a **TETRIS**. The stack falls faster as you
level up (every 10 lines). Game ends when a new piece can no longer enter the
well.

### Controls

| Action | Keys |
| --- | --- |
| Move left / right | ← → |
| Rotate clockwise | ↑ or X |
| Rotate counter-clockwise | Z |
| Soft drop | ↓ |
| Hard drop | Space |
| Hold piece | C |
| Start / restart | Enter |
| Pause | P or Esc |
| Mute audio | M |

On touch devices, on-screen buttons mirror every control.

## Features

- Standard 10×20 well and the 7 tetrominoes in their classic colors.
- SRS rotation with wall kicks (separate I-piece kick table).
- 7-bag randomizer, a 3-piece NEXT queue, and HOLD (once per piece).
- Ghost piece showing the landing position.
- Lock delay with reset-on-move (capped).
- Scoring: Single 40 / Double 100 / Triple 300 / Tetris 1200, all × (level+1),
  plus soft-drop (+1/cell) and hard-drop (+2/cell) bonuses.
- Level-up every 10 lines with faster gravity; line-clear flash effect.
- Persistent high score (localStorage).
- Procedural WebAudio: move, rotate, lock, line-clear, tetris, level-up, game
  over, and a light background arpeggio loop (toggle with M).

## Files

- `index.html` — page shell, inline CSS, canvas, touch buttons.
- `server.js` — tiny static file server on port 8158.
- `src/pieces.js` — tetromino data, rotation states, wall kicks, 7-bag.
- `src/board.js` — grid, collision, locking, line clears.
- `src/audio.js` — WebAudio sound engine.
- `src/input.js` — keyboard + touch input.
- `src/main.js` — game state, loop, rendering, HUD, test hook.

## Test hook

`window.__mt` exposes `start()`, `state`, `score`, `lines`, `level`, `piece`,
`grid`, plus `spawn(type)`, `moveTo(x)`, `rotateCW/CCW()`, `softStep()`,
`nudgeDown(n)`, `hardDrop()`, and `hold()` for automated verification.
