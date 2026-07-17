# Boomberman Moore

An NES/TurboGrafx-flavored Bomberman-style grid arcade game. Vanilla JS + canvas,
zero dependencies, zero assets — all pixel art and chiptune audio are generated in code.

```
npm start        # serves on http://localhost:8136
```

## Modes

- **Campaign (1P)** — 10 stages. Bomb the soft blocks, kill every enemy, then find
  the exit hidden under a soft block. 3:00 timer per stage; run out and sudden-death
  chasers pour in. Stage 10 is a boss: the Balloon King (HP bar, spawns minions),
  which drops the exit where it dies. 3 lives, score, hi-score in localStorage.
  Blasting the open exit spits out angry minions — classic rules.
- **Battle (2–4P local)** — last one standing, best of 3. Any mix of humans and CPU
  bots per slot (setup screen). After 60 seconds sudden death begins: the walls
  close in as an inward spiral of crushing blocks. Dying drops about half of your
  collected powerups back onto the field.

## Controls

| Player | Move | Bomb | Action |
| --- | --- | --- | --- |
| P1 | WASD | F | G |
| P2 | Arrow keys | K (or X) | L (or Z) |
| P3 | Gamepad 0 dpad/stick | B/X button | A button |
| P4 | Gamepad 1 dpad/stick | B/X button | A button |

In the 1P campaign the hero answers to *both* keyboard clusters (WASD+F/G and
Arrows+X/Z) plus gamepad 0 and the touch UI.

- **Enter** — start / pause. **Esc** — back (menus). **M** — mute.
- Touch devices get an on-screen dpad + BOMB + ACT (controls P1). Force it with `?touch=1`.
- Menus can be driven from any keyboard cluster or gamepad.

## Powerups (from soft blocks)

| Icon | Effect |
| --- | --- |
| Bomb Up | +1 concurrent bomb |
| Fire Up | +1 blast range |
| Speed Up | walk faster |
| Kick | walk into a bomb to send it sliding; it stops at the first obstacle |
| Remote | bombs no longer fuse — Bomb places, **Action** detonates (lost on death) |
| Bomb Pass | walk through bombs |

Bombs fuse in ~2.5 s, blast in a cross, are stopped by hard blocks, destroy soft
blocks at first contact, and chain-detonate any bomb the blast touches.

## Files

- `src/main.js` — state machine, screens, HUD, rendering
- `src/entities.js` — world sim: movement (with corner-rounding assist), bombs,
  flames, chains, powerups, enemies, sudden-death shrink
- `src/bots.js` — CPU bot AI (danger map + BFS pathing, escape-checked bombing)
- `src/levels.js` — grid/arena generation, campaign stage configs
- `src/sprites.js` — procedural pixel sprites and tiles
- `src/audio.js` — WebAudio synth music + SFX
- `src/input.js` — multi-player keyboard/gamepad/touch input
