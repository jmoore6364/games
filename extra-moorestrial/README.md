# The Extra-Moorestrial

The infamous Atari 2600 *E.T.* — done right this time. Same bones (find the
phone pieces, phone home, reach the ship), none of the pain. Vanilla JavaScript
ES modules, zero dependencies, zero external assets — all graphics are
procedurally drawn on a 2D `<canvas>` and all sound is synthesized with WebAudio.

## Play

```
npm start          # or: node server.js
```

Then open http://localhost:8166/

Wander a nine-screen valley. Three phone pieces are hidden in pits on three
different screens. Loot the pits, assemble the phone, call home from the
stone circle on the **south ridge**, then reach the **landing pad** in the
north clearing before the ship gives up waiting.

### What got fixed from 1982
- **Pits are visible craters** — you only enter one by walking onto it, never
  by grazing a screen edge.
- **Levitation works** — one tap floats you out and sets you down *beside*
  the pit. You cannot fall straight back in.
- **No aimless wandering** — the POWER button is a sense: E.T.'s finger glows
  and an arrow points to the nearest phone piece (or the ridge, or the pad),
  and marks its screen on the minimap.
- **Humans are escapable** — the FBI agent and the scientist are slower than
  you. The agent confiscates a phone piece (steal it back from the FBI office
  door in the southeast town — but that trips the alarm). The scientist hauls
  you to the lab for an energy-draining examination.
- **Energy is generous** — 9999 units, walking sips it slowly, candy restores
  a chunk, and Elliott shows up now and then to top you up and scare everyone
  off.

### Rules
- **Pits** hold candy, sometimes a zenite crystal, and maybe a phone piece.
  Falling in costs a little energy; levitating out costs a little more.
- **Call ridge:** with all 3 pieces, stand on the glowing stones and press
  POWER. The ship arrives on a countdown — it waits 14 seconds on the pad,
  then leaves (you keep the phone; call again).
- **Energy at 0:** E.T. wilts. Elliott revives you (−1 life). 3 lives.
- **Rounds:** each rescue re-hides the pieces, speeds up the humans, and
  shortens the ship's patience.

### Scoring
- +100 candy · +250 healed flower · +500 zenite crystal
- +1000 per phone piece · +500 for phoning home · +250 stealing a piece back
- Round clear: +5000 plus remaining energy as bonus

## Controls
- **Arrow keys / WASD** — move
- **Space** — POWER: sense / levitate out of a pit / call home
- **Enter** — start / restart
- **M** — mute/unmute
- **Gamepad** — stick/d-pad moves, A = POWER, Start = start
- **On-screen d-pad + POWER + START** — touch devices (revealed on first touch)

## Files
- `index.html` — page shell, inline CSS, canvas, touch controls
- `server.js` — tiny static file server on port 8166
- `src/main.js` — bootstrap, state machine, HUD, render loop, `window.__et` hook
- `src/world.js` — nine-screen valley generation, pits, items, placement helpers
- `src/entities.js` — procedural sprites (E.T., humans, ship, tiles) + human AI
- `src/audio.js` — WebAudio sound effects (dial tones, levitation, jingles)
- `src/input.js` — keyboard + touch + gamepad input

## Test hook
`window.__et` exposes `{ game, start(), state(), pos(), warp(sx,sy,tx,ty),
hold(dir,bool), action(), grantPieces(), setEnergy(n), pits() }` for automated
testing.

## Tech notes
Pure Canvas 2D (SwiftShader-safe), 60fps `requestAnimationFrame` loop, fixed
480×560 internal resolution scaled responsively to fill the window with a crisp
pixel look.
