# StarMoore

A StarCraft-style **real-time strategy** game for the browser. Gather **moorerals**,
mine **gas**, build a base, tech up, raise an army, and grind the enemy AI's base into
rubble. Top-down 2D, mouse-driven, with fog of war, a minimap, pathfinding, supply,
build/train queues, and a competent economy-building AI opponent.

Vanilla JavaScript ES modules. **Zero dependencies, zero external assets** — all art is
procedural pixel art on a canvas, all sound is WebAudio synthesis.

## Run

```bash
node server.js        # serves on http://localhost:8155
# then open the URL in a browser
```

## How to play

You start with a **Command Base** and 5 **Moorers** (workers). Beat the enemy by
destroying **all** of their buildings before they destroy all of yours.

**Core loop:** gather moorerals → build supply + production → train an army → attack.

### Controls (desktop mouse is the primary target)
- **Left-click** select · **Left-drag** box-select · **Shift+click** add/remove
- **Double-click** a unit selects all of that type on screen
- **Right-click** context command: move · attack an enemy · gather a moweral/gas node
- **A** attack-move (then click a point) · **S** stop · **H** hold position
- **Ctrl+0–9** set control group · **0–9** recall it (recenters camera)
- **Arrow keys** / **screen-edge mouse** / **click-drag the minimap** to scroll the camera
- **Enter** pause · **M** mute · **` (backtick)** toggle fast-forward
- With a worker selected, **Q W E R T** pick a building to place (then click a valid tile)
- Bottom **command card** buttons do everything the hotkeys do (all clickable)

### Economy & building
- Workers auto-loop: right-click a **moweral** patch (cyan crystals) and they mine and
  return to the nearest base. Build a **Refinery** on a **gas geyser** (green vent), then
  send workers there for gas.
- Buildings are placed by the player: pick one from the command card, then click a tile.
  A **ghost preview** shows green (valid) / red (invalid). A worker walks over and the
  structure self-builds over time (and can be attacked while under construction).
- **Supply**: units cost supply; you can't train past your cap. Build **Supply Pylons**
  to raise it. The HUD shows current/max.

### Units (light rock-paper-scissors)
| Unit | Role | Notes |
|------|------|-------|
| Moorer | worker | gathers, builds; weak |
| Moorine | cheap ranged infantry | good in numbers |
| Moraider | armored melee | tanky, beats infantry up close |
| Siege Moore | heavy ranged (splash) | slow, shreds clumped units; needs a Factory |

### Buildings
Command Base (workers + drop-off + supply) · Supply Pylon · Barracks (Moorine, Moraider)
· Refinery (gas) · Factory (Siege Moore; requires Barracks) · Moore Turret (static defense).

## Modes
- **Skirmish** vs the AI, pick **Easy / Normal / Hard**. Symmetric map: each side gets a
  base, workers, a moweral line, and a geyser.
- **Campaign** — a 3-mission escalation: *First Contact* (build & survive), *Counterstrike*
  (destroy an outpost), *The Moore Bastion* (crack a fortified, turreted stronghold). Beat
  a mission and press **N** for the next.

## The AI
Runs the same economy: mines moorerals + gas, expands supply, builds a Barracks →
Refinery → Factory, trains a mixed army, defends its base, and launches attack waves that
grow over time. Difficulty scales worker count, wave size, tempo, and (on Hard) income. It
will beat a player who does nothing.

## Tests
- **Headless logic:** `node test/node-test.mjs` — A* (path found / blocked / routed
  around), harvest economy, build cost + completion, supply-gated training, combat &
  death, win/lose on building destruction, and the AI building an economy + army + attacking.
- **Browser (Playwright):** `node test/browser-test.mjs` — drives the real page via the
  `window.__sm` hook (gather, build, train, box-select + attack-move, force a battle and a
  win), asserts zero console errors, and writes screenshots.

## Notes / honest limitations
- Pathfinding is grid A* with local push-apart steering. Units route around rocks and
  buildings; large blobs squeezing through one-tile gaps can jostle briefly but recover.
- The AI is competent, not brilliant: it follows a fixed build order and wave timer rather
  than reading your composition. It defends when you poke its base and presses attacks, but
  it won't out-micro you.
- Touch support is minimal (tap-select / tap-command); RTS on a phone is genuinely hard —
  desktop mouse is the intended experience.
