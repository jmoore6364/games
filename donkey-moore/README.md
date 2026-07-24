# Donkey Moore

A Donkey Kong style girder-climbing arcade platformer for the Moore Arcade.
Vanilla JavaScript ES modules, zero dependencies, zero asset files — everything
(graphics and sound) is generated procedurally on a 2D `<canvas>` with WebAudio.

## Play

```
npm start        # or: node server.js
```

Then open http://localhost:8160/

The big ape **Donkey Moore** sits at the top of a tower of slanted red steel
girders, next to a captured character. He hurls **barrels** that roll down the
girders, follow the slopes, and sometimes drop down ladders. You are the little
climbing hero, **Moore**, starting bottom-left. Run, climb the yellow ladders,
and **jump** the barrels to reach the top and rescue the captive.

- Jumping over a barrel scores **100**.
- Grab a **HAMMER** to smash barrels for a few seconds (**300** each) — but you
  can't climb or jump while swinging it.
- A blue **flame** wanders up from the oil drum and chases you. Touching a
  barrel, a flame, or letting the **BONUS** timer hit zero costs a life.
- Reach the top for a **RESCUE!** and the bonus is added to your score. Each loop
  is a little harder: more barrels, faster, more ladder drops.
- Watch out for the deadly **pit** in the middle girders — a fall too far is
  fatal. The dim, dashed ladders are broken and cannot be climbed.

3 lives, high score is saved locally.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | ← → / A D | ◀ ▶ |
| Climb ladders | ↑ ↓ / W S | ▲ ▼ |
| Jump | Space / Z / X | JUMP |
| Start / Restart | Enter | START |
| Mute | M | MUTE |

Gamepad (standard mapping) and on-screen touch controls are both supported. The
view scales and letterboxes to fill any window.

## Files

- `index.html` — canvas, responsive letterboxed dark UI, on-screen touch pad.
- `server.js` — tiny static file server on port **8160**.
- `src/main.js` — game loop, states, HUD, spawning, scoring, test hook.
- `src/level.js` — girder/ladder geometry, surface & collision helpers.
- `src/player.js` — hero movement, climbing, jumping, hammer, fall detection.
- `src/entities.js` — barrels (slope + ladder logic), flame, effects.
- `src/sprites.js` — all procedural graphics.
- `src/audio.js` — synthesized WebAudio music and SFX.
- `src/input.js` — keyboard, gamepad, and touch input.

## Test hook

`window.__dm` exposes `{ start(), press(action), state, score, lives, level,
barrels, player }` for smoke tests.
