# Grand Theft Moore

A GTA III-style 3D open-world crime sandbox, rendered entirely in **software 3D
on a 2D canvas** — no WebGL, no Three.js, no dependencies, no asset files. All
geometry, textures, and sound are procedural. Vanilla JS ES modules.

Walk a 3D city, steal and drive cars, run from the cops as your wanted level
climbs, and pull a handful of GTA-style missions for cash.

## Run

```
node server.js        # serves on http://localhost:8156
```

Then open <http://localhost:8156> and press **ENTER**.

## Controls

| Key | Action |
| --- | --- |
| **W A S D** / arrows | Move (on foot: relative to camera · in car: throttle / brake-reverse / steer) |
| **Mouse** or **Q / E** | Turn the camera (click canvas to capture the mouse) |
| **R / T** or mouse-Y | Tilt camera up / down |
| **Shift** | Run (on foot) |
| **F** | Enter / exit (or hijack) the nearest car |
| **Space** | Handbrake (driving) / jump (on foot) |
| **J** or left-click | Punch (on foot) |
| **V** | Toggle first-person / third-person chase cam |
| **R** | Switch radio station (while the engine is on) |
| **M** | Mute |
| **ENTER** | Start · respawn after Busted/Wasted |

Touch controls (left stick / right-side look drag / on-screen buttons) appear on
touch devices.

## The renderer (software 3D)

The city is a **heightfield**: a grid where each cell stores a building
top-height (0 = open ground). `render.js` casts one ray per screen pixel and
marches the XZ grid with a 2D DDA (Amanatides–Woo style, adapted from the
Moorecraft voxel raycaster). Each ray:

- hits a **building wall** (procedural window / concrete-frame texture, some
  windows lit), a **rooftop**, or falls through to the **ground plane**
  (asphalt with dashed lane lines, sidewalks, grass, special lots);
- is blended toward a horizon **fog** color by distance to hide the draw
  distance, over a gradient **sky** with a sun glow.

Dynamic entities — traffic, police, pedestrians, and the player's car — are
drawn on top as depth-tested projected **boxes** (cars) and **billboards**
(peds), composited against the per-pixel building depth buffer so they are
correctly occluded by the city. The player's car gets a slightly nicer shaded
box with a flashing light-bar for police.

Internal resolution is ~220x138, scaled up pixelated to the display canvas
(early-3D blocky aesthetic, on purpose). Camera is a third-person chase cam
that pulls in when a building is behind you, with a first-person toggle.

**Performance:** ~48–59 fps in headless Chromium at the shipped resolution.
If it runs slow on a device, lower `setRes(...)` in `render.js` or reduce
`FAR` (draw distance).

## The wanted system (the signature)

Crimes raise a hidden **heat** value that maps to **stars** (0–5):

- run over a pedestrian: +8 · punch a ped: +6
- carjack an occupied car: +5 · ram another car hard: +3 · ram a cop: +6

At 1+ stars, police cruisers spawn near you (roughly `stars + 1` units) and
pursue — steering toward you, ramming. Break **line of sight** (buildings
block it) and stay unseen for a few seconds and the heat cools down; more stars
cool slower. Get caught on foot next to a stopped cop and you're **Busted**.
Run out of health and you're **Wasted**. Either way you respawn at the hospital
and drop a little cash.

## Missions

Walk into a yellow marker (shown in the world / on the minimap) to start one.
Four short missions, each pays cash; clear all four to win (free-roam
continues):

1. **Repo Job** — steal the marked orange car and deliver it to the garage.
2. **Checkpoint Dash** — hit 3 checkpoints before the timer runs out (in a car).
3. **Heat** — reach a 3-star wanted level, then lose the cops.
4. **Cross-Town Run** — drive to the far corner of the city and back.

## HUD

North-up **minimap** (buildings, roads, your heading arrow, mission markers,
flashing target, blue/red police blips, garage & hospital), **wanted stars**,
**cash**, **health** bar, current-vehicle + speed indicator, and a
mission-objective banner.

## Files

- `src/city.js` — procedural city gen, heightfield + tile map, collision & LOS queries, minimap data (pure).
- `src/player.js` — on-foot movement + collision (pure).
- `src/vehicles.js` — arcade car physics, traffic lane AI, police pursuit AI (pure).
- `src/entities.js` — pedestrians (wander/flee/knock-down) and props (pure).
- `src/game.js` — the whole simulation: wanted logic, missions, police spawning, enter/exit, crimes, respawn (pure, headless-testable).
- `src/render.js` — the software 3D heightfield raycaster + entity compositing (browser).
- `src/main.js` — loop, chase/FP camera, HUD, minimap, state screens, audio wiring, `__gtm` test hook (browser).
- `src/input.js` — keyboard, mouse-look, touch (browser).
- `src/audio.js` — WebAudio synth: engine, siren, radio, impacts, stings (browser).
- `src/sprites.js` — HUD star icons (browser).

## Tests

- `node test/headless.test.js` — pure-logic assertions (city/collision, car
  physics, wanted raise/decay, police pathing, enter/exit, missions, minimap).
- `node test/browser.mjs` — Playwright: loads the page (zero console errors),
  proves the 3D frame isn't a flat fill, moves/collides on foot, drives a car,
  triggers a crime → stars + police, completes a mission → cash, and writes
  screenshots.
