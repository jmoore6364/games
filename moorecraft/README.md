# Moorecraft: The Shattered Sky

A first-person **voxel sandbox** in the spirit of Minecraft, rendered entirely in
**software** on a 2D canvas — no WebGL, no Three.js, no dependencies, no external
assets. Everything (terrain, textures, mobs, sound) is procedurally generated in
vanilla JS ES modules.

Run:

```
npm start          # serves on http://localhost:8149
```

Then open the URL and **click the canvas** to capture the mouse.

---

## The Spin — "The Shattered Sky"

The world is not an endless plain. It is a cluster of **floating voxel islands**
drifting over a glowing endless **void**. Fall off the bottom and you take void
damage and respawn at the spawn island. Islands are generated from hash noise:
a grassy spawn island, a stone/ore island, a sand island, a deep ore island, a
sky-high island, and a small glowing **lumite** island.

Two signature mechanics tie into the spin:

- **The Tether** — a craftable grapple. Aim at a block within ~22 blocks and fire
  (`F`). You are pulled toward the anchor, letting you cross the gaps between
  islands without always bridging. It has a short cooldown and limited pull time,
  so it's traversal help, not free flight.
- **The Hollow** — at night, purple **void-wisp** mobs (a creeper homage) spawn in
  darkness and drift toward you. Get close and they flare red and **burst**,
  damaging you. **Light suppresses them**: torches and lumite keep an area safe,
  and daylight/bright light burns wisps away.

---

## Controls

| Action | Key |
|---|---|
| Look | Mouse (click to capture) or **Arrow keys** (fallback) |
| Move | **WASD** |
| Jump / fly up | **Space** |
| Sneak / fly down | **Shift** |
| Toggle creative flight | **Double-tap Space** (creative only) |
| Break block | **Left click / hold** |
| Place block | **Right click** |
| Select hotbar | **1–9** or **mouse wheel** |
| Open crafting | **E** (hand recipes) / right-click a Crafting Table (full set) |
| Fire tether | **F** |
| Open inventory view | **I** or **Tab** |
| Toggle minimap / radar | **N** |
| Open chest | Right-click a placed chest |
| Mute | **M** |
| Save | **Esc** or **G** (also autosaves every ~20s to the active slot) |

### Touch / mobile

On phones and tablets (auto-detected; force with `?touch=1` in the URL) the game
is **fully playable with touch alone** — no keyboard or mouse needed:

- **Title menu** — tap **NEW SURVIVAL / NEW CREATIVE / LOAD WORLD** to start.
- **Move** — left on-screen stick. **Look** — drag anywhere on the right side.
- **Right-hand buttons** — **MINE** (hold to break), **PUT** (place / open a
  targeted chest or table), **JMP** (jump / fly up), **DOWN** (fly down / sneak),
  **FLY** (toggle creative flight), **TIE** (fire tether), **CRAFT** (open/close
  crafting), **BAG** (open the inventory view), **MAP** (toggle the minimap).
- **Hotbar** — tap a slot to select it.
- **Crafting** — tap a recipe row to craft; tap **CLOSE** (or **CRAFT**) to exit.
- **Load World** — tap a saved world to play it, or **DELETE** to remove it.
- **Chest / inventory** — tap an item to move (chest ⇄ pack) or drop it.
- **Respawn** — tap anywhere on the death screen.

The desktop keyboard + pointer-lock mouse experience above is unchanged.

---

## Blocks (19 types)

air, **grass**, dirt, **stone**, cobblestone, **wood log**, planks, **leaves**,
sand, **water** (non-solid, slows you), **coal ore**, **iron ore**,
**lumite ore**, **lumite block** (glowing crystal — emits light), **void-stone**
(unbreakable bedrock), **crafting table**, **torch** (placeable light), **glass**,
**storage chest** (holds 27 item slots).

Each has distinct top/side/bottom procedural textures, a base color, a hardness,
and a required pickaxe tier.

## Crafting

Open with **E** (hand recipes: planks, sticks, table, torch) or right-click a
**Crafting Table** for the full set:

- Planks (1 log → 4), Sticks (2 planks → 4), Crafting Table (4 planks), Storage Chest (6 planks)
- Torch (coal + stick → 4)
- Wood / Stone / Iron Pickaxe (planks/cobble/ingot + sticks)
- **Iron Ingot** (iron ore → ingot) and **Glass** (sand → glass)
- **Lumite Crystal** (lumite ore → crystal), **Lumite Block** (4 crystals)
- **Tether Tool** (2 iron ingots + 1 lumite crystal + 2 sticks)

**Pickaxe tiers gate ore:** stone needs a wood pickaxe (tier 1) to drop cobble;
coal needs tier 1; iron ore needs a **stone** pickaxe (tier 2); **lumite ore**
needs an **iron** pickaxe (tier 3). Mining without the required tier is very slow
and drops nothing. Better tools mine faster.

### Documented simplifications

- **No furnace / no smelting.** Iron ore is "cold-forged" straight to an ingot and
  sand is "sun-fired" straight to glass at the crafting table. This keeps the tech
  tree short and coherent for a sandbox.
- Apples occasionally drop from leaves; right-click an apple (when selected) to
  eat and heal. There is no separate hunger meter — just **health** plus the
  void/Hollow danger, kept forgiving on purpose.

---

## Modes

- **Survival** — health (hearts), the Hollow at night, mine-to-craft, void damage.
  Death respawns you at the spawn island (you keep your items — forgiving sandbox).
- **Creative** — flight, a hotbar of all blocks, the tether always available, no
  mobs, no fall/void death.

**World save** to `localStorage`: the seed + a **diff** of block edits over the
generated base + inventory + player position + time + chest contents. Type digits
on the title to change the seed.

---

## Quality-of-life features

- **Named save slots (up to several worlds).** "New Survival/Creative" registers a
  fresh auto-named world ("Sky World N") and autosaves it every ~20s to its own
  slot; multiple worlds coexist independently. **LOAD WORLD** on the title lists
  each save (name · mode · in-game day · last-played) to continue or **DELETE**.
  Any legacy single `moorecraft_save_v1` is migrated into a slot on first run so
  nothing is lost. The slot index lives at `moorecraft_slots_v1`; each payload at
  `moorecraft_slot_<id>`. The save format is backward compatible (old fields still
  load; chests default to empty).
- **Minimap / radar HUD** (top-right). Samples the highest solid block on a coarse
  33×33 grid (2-block step, ~66×66 blocks) around the player, **cached and
  refreshed only a few times per second** so it costs no per-frame work. Shows the
  island footprint vs void, a facing arrow at the player, and lumite/lumite-ore as
  bright cyan points-of-interest blips. Toggle with **N** or the **MAP** touch
  button.
- **Storage chests.** Craft a **chest** (6 planks, block id 18 — appended so older
  saves/ids stay valid), place it, and right-click / target-then-**PUT** to open a
  27-slot storage UI. Tap an item to move it between your pack and the chest.
  Contents are stored **per voxel position** in the world save. **Breaking a chest
  is non-lossy:** it returns the chest block *and* spills all stored items as
  collectible drops, so nothing is ever destroyed.
- **Inventory view.** A dedicated full-pack screen (**I** / **Tab** / **BAG**
  button) listing every carried item with counts and a kinds/total summary; tap an
  item to drop one stack in front of you. The crafting-table UI is unchanged.

---

## Renderer & performance notes

- **Software voxel raycaster.** The world is a flat `Uint8Array` over a
  128×64×128 volume. For each pixel a ray is cast and DDA-traversed
  (Amanatides–Woo) until it hits a solid voxel. Faces are shaded by orientation
  (top brightest, sides mid, bottom dark) × a sampled 8×8 procedural texture ×
  lighting × distance fog toward the horizon color. Transparent blocks (water,
  glass, leaves) accumulate and let the ray continue.
- **Low internal resolution.** The scene renders to a **200×120** ImageData, then
  is blit-scaled (`image-rendering: pixelated`) to the display canvas. This is the
  retro Minecraft look *and* what makes per-pixel raycasting affordable.
- **Lighting.** Block-light (torches, lumite ore/blocks) is flooded via BFS from
  emitters and sampled per face, so torches genuinely glow and nights are dark.
  Skylight is modelled as a global day/night brightness that also tints the sky
  and fog (a deliberate simplification — mined tunnels stay lit by day; torches
  matter at night). A sun/moon disk crosses the sky and a day/night cycle runs
  ~200s.
- **Measured performance:** ~**39 fps** at 200×120 in headless SwiftShader
  (software GL, worst case). On a real GPU-composited browser it runs comfortably
  above that. If it's slow on your machine, lowering the internal resolution in
  `main.js` (`RW`, `RH`) is the main dial.

Known rough edges (honest): auto-step-up onto blocks can feel slightly abrupt;
skylight is global rather than propagated, so island undersides are lit in
daytime; the tether can occasionally miss if you're aiming at open sky; on touch
the DOWN button doubles as sneak, so it also slows walking while held on foot.

---

## Structure

```
index.html      CSS shell, canvas, touch UI, hint bar
server.js       static file server (PORT 8149)
src/main.js     loop, states, HUD, save/load, break/place/craft, test hook
src/render.js   the software voxel raycaster + sky + billboards + overlays
src/world.js    terrain gen, voxel store, block defs, raycast-pick, edits, save-diff, light
src/player.js   movement, AABB collision, camera, flight, tether
src/entities.js Hollow wisp mobs + item drops
src/craft.js    items, inventory/hotbar, recipes, crafting
src/input.js    pointer-lock mouse + keyboard + wheel + touch
src/audio.js    WebAudio synth SFX + ambient pad
src/sprites.js  procedural block textures + HUD item icons
test/           node-test.mjs (headless logic) + browser-test.mjs (Playwright)
```

Tests: `node test/node-test.mjs` (26 logic assertions) and, with the server
running, `node test/browser-test.mjs` (Playwright headless: renders a real scene,
walks, breaks, places, crafts, day/night — asserts zero console errors).
