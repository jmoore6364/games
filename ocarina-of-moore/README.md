# Ocarina of Moore

A **Legend of Zelda: Ocarina of Time**-style 3D action-adventure that runs in the
browser — real WebGL third-person 3D, rendered entirely from procedural low-poly
geometry with WebAudio-synthesized music and sound. **Zero dependencies, zero
external assets** (no images, models, fonts, or network).

You are **Moore**, a young hero. The village relic — the **Ocarina Gem** — has been
stolen by the beast **Gohma-Moore**. Cross Hyrule-Moore Field, brave the Deku
Dungeon, solve its puzzles, and defeat the guardian to bring the Gem home.

## Run

```bash
node server.js          # serves on http://localhost:8165  (honors $PORT)
# or:  npm start
```

Open the URL and press **Begin Quest**.

## The vertical slice

- **Moore Village (hub)** — houses, torches, a well, NPCs you can talk to (the
  Elder gives the quest), and a **shop** where rupees buy hearts, arrows, bombs
  and heart containers.
- **Hyrule-Moore Field (overworld)** — an open grassy area with a dirt path,
  trees, rocks, hills, a pond, collectible rupees/hearts, roaming **Moore-blins**,
  and a bombable secret. Connects the village to the dungeon.
- **Deku Dungeon (one full dungeon)** — five rooms + corridors with:
  - a **block-push puzzle** (shove the block onto the floor switch to open a gate),
  - a **locked door** opened by a **Small Key**,
  - the **Hero Bow** found partway in (then *required* to progress),
  - a **bow puzzle** (shoot the crystal switch to open the next gate),
  - a **Boss Key**, a great **boss door**, and a multi-phase **boss fight**.
  - Bombs (from a chest / the shop) blow open **cracked walls** for secrets.
- Beating **Gohma-Moore** frees the Ocarina Gem → **Victory**.

## Controls

**Keyboard / mouse**
- **WASD** — move (camera-relative)
- **Mouse drag / Arrow keys** — rotate camera
- **Space** — sword slash (*hold to charge, release for a spin attack*)
- **Shift** — raise shield / block (deflects melee when facing the attacker)
- **X** — roll / dodge (brief i-frames)
- **Z** — Z-target lock-on (toggle; strafe & circle the target)
- **Q** — use item (Bow fires an aimed arrow / Bombs are thrown)
- **Tab** — cycle item · **E / Enter** — talk, read signs, open chests & doors
- **O** — play the ocarina motif · **M** — mute · **P / Esc** — pause

**Touch (phones)** — auto-detected
- Left half: floating **analog stick** (deadzone + ease-in response curve).
- Right half: **drag to rotate the camera**.
- Bottom-right buttons: **SWORD · ITEM · Z (target) · ROLL · ACT**.

## Signature mechanic — Z-targeting

Press **Z** to lock onto the nearest foe. The camera frames you and the target,
your movement becomes **strafe/circle**, and aimed items (bow) get **aim assist**
toward the lock. Tap **Z** again to release. A minimap/compass keeps you oriented.

## Tech

Real **WebGL 1** (GLSL ES 1.00, SwiftShader-safe). Flat-shaded low-poly meshes
built in code (`mesh.js`), a Lambert + ambient + fog renderer with a gradient sky
and a per-vertex emissive channel for torches/gems (`renderer.js`), a tiny
column-major mat4 math module (`gl.js`), unified keyboard/mouse/touch input
(`input.js`), a WebAudio music sequencer + SFX bank (`audio.js`), procedural area
construction (`world.js`), and all gameplay — camera, combat, AI, puzzles, boss —
in `game.js`, wired together by `main.js`.

### Files
```
server.js         static file server (PORT, default 8165)
index.html        canvas, HUD, overlays, touch UI
src/gl.js         WebGL helpers + mat4/vec3 math
src/mesh.js       procedural low-poly mesh builder + prop library
src/renderer.js   WebGL1 renderer (lighting, fog, sky, primitives)
src/input.js      keyboard / mouse / touch (analog stick response curve)
src/audio.js      synthesized themes (overworld/village/dungeon/boss) + SFX
src/world.js      village / field / dungeon construction + lighting presets
src/game.js       player, camera, lock-on, combat, items, enemies, boss, puzzles
src/main.js       boot, loop, HUD, minimap, window.__oz test hook
```

### Test hook
`window.__oz` exposes game state and helpers (`start`, `toField`, `toDungeon`,
`toBoss`, `spawnEnemy`, `spawnBoss`, `teleportPlayer`, `state()`) for headless
verification.
