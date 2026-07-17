# Sonic Moore

A Sega Genesis flavored momentum platformer in the style of the 16-bit Sonic
games. Vanilla JS + canvas, ES modules, zero dependencies, zero assets —
every sprite is procedural pixel art and every sound is WebAudio synth.

Two zones — **Moore Hill Zone** and **Chemical Moore Zone** — with two acts
each, plus a final boss act against **Dr. Robotmoore** in his hover pod
(8 hits). Rings, badniks (crab / buzzer / spiker), monitors (10 rings, 1-up,
invincibility stars, speed shoes, shield), springs, dash pads, spikes,
bottomless pits, moving platforms, checkpoints, spinning goal signposts,
score tally, and a full runnable loop in every regular act.

## Run

```
npm start        # or: node server.js
```

Open http://localhost:8134 (set `PORT` to change).

## Controls

- **Arrows / WASD** — move (Down while moving = roll)
- **Z / Space** — jump (a spin — damages badniks)
- **Enter** — pause
- **M** — mute
- Touch devices get an on-screen d-pad + JUMP (force with `?touch=1`);
  standard-mapping gamepads work too.

## Physics notes

The heart of the game is a faithful implementation of the classic Sonic
movement model, in px/frame at 60fps:

- Ground speed (`gsp`) is a scalar along the surface. Slope factor is
  subtracted every frame: `gsp -= slp * sin(angle)` with `slp = 0.125`
  walking, `0.078125` rolling uphill, `0.3125` rolling downhill.
- Original constants: accel `0.046875`, decel `0.5`, friction `0.046875`,
  top speed `6`, air accel `0.09375` (2x ground), gravity `0.21875`,
  jump force `6.5`, variable jump cut at `-4`.
- Terrain is 16px tiles rasterized from continuous height profiles + CSG
  ops (rects, loop rings), each tile a 256-byte per-pixel layer-mask
  height map. Sensors query pixel solidity directly.
- Ground sensor pair (A/B at the feet), a push (wall) sensor, and the
  4-mode rotation system (floor / right wall / ceiling / left wall) let the
  player run through loops and around curves; the surface angle is measured
  numerically at the contact point.
- Loops use two collision layers (left half / right half of the ring) with
  direction-sensitive path swappers at the edges and apex, exactly in
  spirit of the originals.
- Below speed `2.5` on walls/ceilings the player falls off, with a
  30-frame control lock after slipping.
- Rolling keeps momentum downhill; landing converts air velocity to ground
  speed using the shallow/steep landing rules; players tilt to the surface
  angle in snapped 45° increments like the Genesis games.
- Getting hit scatters up to 32 rings (collectible again after a moment);
  a hit with no rings and no shield is death. 10-minute act time limit.

## Structure

```
index.html      320x224 canvas, touch UI
server.js       static server (PORT 8134)
src/main.js     game state machine, camera, parallax, HUD, screens
src/physics.js  constants, pixel sensors, mode math
src/levels.js   chunk-pattern level builder + tile rasterizer, 5 acts
src/entities.js player + rings, monitors, springs, badniks, boss, etc.
src/sprites.js  procedural pixel sprites + themed terrain tile baking
src/audio.js    WebAudio chiptune engine, original tracks + SFX
src/input.js    keyboard / gamepad / touch input
```

Levels are assembled from reusable chunk patterns (flats, 22.5°/45° slopes,
cosine hills, loops, spring ledges, spike gauntlets, platform pits, dash
corridors...), so new acts are a dozen lines each. Hi-score persists in
localStorage.
