# Wing Commoore

A Wing Commander style first-person space-combat flight sim for the Moore Arcade.
Pilot a Moore fighter from the cockpit, dogfight waves of red **Kilrathi Moore**
fighters, and clear the sector. Vanilla JavaScript ES modules, **zero dependencies,
zero external assets** — every pixel is drawn procedurally to a 2D `<canvas>` and
every sound is synthesized with WebAudio.

## Run

```bash
node server.js
# open http://localhost:8163/
```

`npm start` also works. Requires Node 18+ (uses ES modules).

## How to play

Get a target in your reticle, use the **amber lead indicator** to lead your shots,
and blast the enemy shields down then the hull. Hold a target steady in your sights
to build a **missile lock**, then launch. Clear all 4 wings to win. Lose all hull and
it's game over.

### Controls (keyboard)

| Action | Keys |
| --- | --- |
| Pitch (nose up/down) | Up/Down arrows or W / S |
| Yaw (turn left/right) | Left/Right arrows or A / D |
| Roll | Q / E |
| Throttle down / up | Z / X (or - / +) |
| Fire lasers | Space |
| Launch missile | M or Ctrl |
| Cycle target | T |
| Afterburner | Shift (hold) |
| Restart (after game over) | R |
| Mute | ; |
| Launch mission | Enter |

### Touch controls

On touch devices an on-screen **flight stick** (bottom-left) steers pitch/yaw, and
**FIRE / MSL / AFTBURN / TGT** buttons (bottom-right) handle weapons, afterburner and
target cycling.

## Features

- **True 3D flight** — 3D world points are transformed by the ship's orientation basis
  and perspective-projected to 2D. A wrapping 3D starfield conveys translation and
  rotation, streaking during afterburn.
- **Filled-polygon ship models** with per-face lighting, depth sorting and engine glow,
  drawn as scaling models with correct depth ordering (no raycaster).
- **Combat** — twin laser cannons with heat/overheat, tracking missiles with a growing
  lock reticle + lock tone, evasive enemy AI that chases and shoots back, shields +
  armor and multi-stage explosions.
- **Cockpit HUD** — canopy frame with struts, center gun reticle, lead/aim indicator,
  fore/aft shield arcs + hull bar, throttle + afterburner-fuel gauges, circular radar
  scanner with front/rear blips, target box (name / distance / shield / hull), missile
  count, gun-energy bar, kill count, and directional "enemy behind you" arrows.
- **Structure** — title/briefing screen, 4 escalating waves that warp in, "WING CLEAR"
  interludes, MISSION COMPLETE / MISSION FAILED end screens.
- **Audio** — engine hum that pitches with throttle, laser/missile fire, lock tone,
  explosions, hit/shield-down alarms, afterburner whoosh — all WebAudio, no files.

## Files

- `index.html` — canvas, letterboxed dark UI, on-screen touch controls.
- `server.js` — tiny static file server on port **8163**.
- `src/main.js` — game loop, physics, combat, waves, rendering orchestration.
- `src/render3d.js` — vec3 math, camera projection, starfield, ship-model drawing.
- `src/ships.js` — procedural ship models and enemy fighter AI.
- `src/hud.js` — cockpit frame + heads-up display drawing.
- `src/audio.js` — WebAudio synthesis.
- `src/input.js` — keyboard + touch input.

## Test hook

`window.__wc` exposes `{ state, hull, kills, wave, enemies }` plus
`start()`, `fire()`, `launchMissile()`, `spawnEnemyAhead()`, `forceLock()` and `game`
for headless verification.
