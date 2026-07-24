# Doo-Moore

A DOOM-style raycaster first-person shooter for the Moore Arcade. Pure vanilla
JavaScript ES modules, a **software column raycaster** rendering to a 2D
`<canvas>`, WebAudio sound, zero dependencies, and zero external asset files —
every wall texture, demon sprite, pickup and weapon is generated procedurally to
offscreen canvases at load time.

Rip and tear through the Moore Arcade.

## Run

```
npm start        # node server.js
```

Then open <http://localhost:8162/>. (Port 8162.)

## Controls

**Keyboard / mouse**
- **W A S D** / arrows — move & strafe
- **Mouse** — look (click the canvas to lock the pointer); **← →** also turn
- **Space** / **Left Mouse** — fire the Moore Shotgun (hold to keep firing)
- **E** — use / open doors / hit the EXIT
- **R** — restart after death or level clear
- **M** — mute

**Touch** (shown automatically on touch devices)
- Left **move stick**, right **look-drag** zone, **FIRE** button, **USE** button

## Gameplay

- Navigate a tiled dungeon of textured walls (brick, tech-panel, stone, hazard
  door, glowing EXIT) with distance-based lighting/fog, a checkered cast floor
  and a shaded ceiling.
- Blast **imp demons** — billboarded sprites that idle until they see you, then
  aggro, chase, and attack with melee swipes and ranged fireballs. They flash on
  hit and gib on death. Sprites are depth-sorted against the wall z-buffer so
  they never draw through walls.
- Grab **health** and **ammo** pickups scattered through the level.
- Open the hazard **door** (E) to reach the sealed room and hit the **EXIT** for
  **LEVEL CLEAR**. Die and it's **YOU DIED** → press R.
- HUD: health %, ammo, kill count, and a Moore face that reacts to damage.

## Architecture

| File | Role |
|------|------|
| `index.html` | Canvas, letterboxed responsive UI, on-screen touch controls |
| `server.js` | Tiny static file server (port 8162) |
| `src/main.js` | Game loop, state machine, player, weapon viewmodel, HUD, screens |
| `src/raycaster.js` | Software DDA raycaster: textured walls, floor/ceiling casting, depth-tested billboard sprites into an `ImageData` buffer |
| `src/map.js` | Programmatic tile-map level, doors, spawns (connectivity guaranteed) |
| `src/entities.js` | Imp AI (idle/chase/attack/dead), line-of-sight, fireballs |
| `src/textures.js` | Procedural wall textures, demon/pickup/fireball sprites |
| `src/audio.js` | WebAudio synth SFX + ambient rumble |
| `src/input.js` | Keyboard, pointer-lock mouse-look, touch stick/look/buttons |

## Performance

The world renders at a modest internal resolution (200–480 columns, adaptive)
into a packed 32-bit pixel buffer, then scales up to fill the window with nearest
-neighbour for a crunchy retro look. Frame time is sampled every frame and the
internal resolution auto-scales to stay smooth.

## Test hook

`window.__doo` exposes `{ start(), restart(), fire(), state, health, ammo,
kills, enemies }` for automated verification.
