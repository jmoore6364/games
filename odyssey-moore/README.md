# The Odyssey of Moore

An action-adventure retelling of Homer's *Odyssey* for the Moore Arcade. One
continuous voyage home from Troy to Ithaca, weaving three modes together — a
top-down sailing sea-map, big naval battles, and big land battles — with island
story-choices in between.

Vanilla JavaScript ES modules. **Zero dependencies, zero external assets.** All
art is drawn procedurally on Canvas 2D; all sound is synthesized with the
WebAudio API (a plucked-lyre motif plus SFX). No images, no fonts, no network.

## Run

```
PORT=8164 node server.js
```

Then open http://localhost:8164 . (`npm start` also works; default port 8164.)

## The voyage — one continuous journey

Persistent state carries across every stage: **crew** (a galley of oarsmen,
start 24), **hull** (ship health), **Odysseus HP**, **favor** (blessing of
Athena, spent on special actions) and **glory** (score). The run ends if crew,
hull, or Odysseus reaches zero. You win by reaching Ithaca and clearing the hall
of suitors.

Stages, connected by the sea-map:

1. **Ismarus / Cicones** — opening land-battle tutorial.
2. **The Lotus-Eaters** — a choice: drag the crew back, or linger (cost/benefit).
3. **The Cyclops Polyphemus** — trapped in the cave: heat the olive stake, blind
   the eye, then escape under the sheep. Taunting him earns glory but calls down
   **Poseidon's wrath** (rougher seas afterward).
4. **The Cannibal Coast** — a big naval battle against Laestrygonian raiders.
5. **Circe's Isle (Aeaea)** — a land battle against her enchanted beasts, then a
   choice.
6. **The Strait** — a sailing gauntlet: resist the **Sirens**, then thread
   **Charybdis** (the whirlpool, to port) and **Scylla** (six-headed, to
   starboard). You lose some crew to Scylla no matter what — the Homeric "least
   bad choice."
7. **Ithaca** — the finale land battle: string the great bow and cleanse the
   hall of suitors.

Roaming raider galleys wander the sea-map; sail into one and it becomes a naval
skirmish.

## Modes

- **Sea-map (overworld):** steer the galley across open sea toward the glowing
  destination island. Wind direction/strength (shown on the compass) speeds
  sailing or forces you to row against it. Reach the island to trigger its
  episode.
- **Naval battle:** top-down real-time fleet combat. **Ram** enemy galleys and
  loose **volleys** of arrows/spears (cooldown ranged attack, with aim assist).
  A ram-boost and Athena's gale (spends favor) round out your options.
- **Land battle:** control Odysseus with a **sword** (melee) and **bow** (aimed
  ranged, with aim assist and a regenerating quiver). Your surviving crew fight
  alongside you as allied units against waves of enemies.
- **Island episode:** short narrative with a 2–3 option choice that branches
  into a battle or a resource outcome.

## Controls

**Keyboard**
- Move / steer: **WASD** or **Arrow keys**
- Primary attack (sword / volley / ram-charge, continue): **Space**
- Bow / secondary: **K** (also J/F)
- Athena / special / rally: **L** (also Shift)
- Choices: **1 / 2 / 3**
- Mute: **M** &nbsp; Restart (title/end): **R**

**Touch (phone)**
- On-screen **analog stick** (bottom-left) to move/steer, with a response curve —
  small deflections give fine control, full deflection gives full speed/turn, so
  aiming and steering settle without overshoot.
- **Action buttons** (bottom-right): SWORD/VOLLEY, BOW/RAM, ATHENA. Labels change
  per mode. Aimed attacks use **auto-aim** toward the nearest enemy in a forward
  cone.
- Narrative choices appear as large tappable buttons.

The touch UI shows automatically on touch devices.

## Test hook

`window.__od` exposes state and scene jumps for headless verification:
`__od.start()`, `__od.gotoStage(i)`, `__od.jump(scene, cfg)`,
`__od.demoNaval()`, `__od.demoLand()`, `__od.demoIsland()`,
`__od.demoGauntlet()`, `__od.seaMap()`, plus live `scene`, `crew`, `hull`,
`hp`, `favor`, `glory`.

## Files

- `index.html` — canvas, responsive scaling, touch UI
- `server.js` — static file server (honors `PORT`, default 8164)
- `src/main.js` — engine, shared voyage state, scene manager, test hook
- `src/input.js` — keyboard + touch input with analog response curve
- `src/audio.js` — WebAudio lyre motif + SFX
- `src/gfx.js` — procedural Canvas art
- `src/hud.js` — shared voyage HUD
- `src/voyage.js` — the ordered sequence + narrative text
- `src/util.js` — math, aim-assist, response-curve helpers
- `src/scenes/*.js` — title, seamap, naval, land, island, cyclops, gauntlet, end
