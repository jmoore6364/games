# Moore Icarus

A Kid Icarus (NES, 1986) style winged action platformer, built in vanilla
JavaScript + `<canvas>` with zero dependencies and zero external assets. Every
sprite, tile, sound and note is generated procedurally at runtime.

Play as **Pit-Moore**, a small winged angel, climbing out of the Underworld,
soaring the Overworld, and storming the Sky Temple to rescue the goddess
**Moora** from **Moordusa**, whose gaze turns heroes to stone.

## Running

```
npm start          # serves on http://localhost:8151
# or: node server.js
```

Open the URL in a browser. Works on desktop (keyboard/gamepad) and mobile
(on-screen stick + buttons appear automatically on touch devices).

## Controls

| Action | Key | Notes |
| --- | --- | --- |
| Move | Arrows / WASD | full air control while jumping |
| Jump | Z / Space | hold for a higher jump; **Down + Jump** drops through platforms |
| Shoot arrow | X (or J/K) | fires straight ahead |
| Aim up | Up + X | loose an arrow overhead |
| Crouch-shoot | Down + X | fire low while crouched |
| Enter a door | Up (while standing on a door) | shops, cure rooms, exits |
| Pause | Enter | |
| Mute | M | |

Gamepad: d-pad/stick to move, **A** jump, **X/B** shoot, **Start** pause.

## The signature: the vertical climb

Each world opens with a **vertical-scrolling climb**. The camera only ever
scrolls **UP** — once the ground below you leaves the screen it is gone, and
**falling off the bottom of the screen is instant death.** Platforms are placed
so a careful climber always has a route (no jump ever exceeds ~4 tiles across or
~3.5 tiles up). After the climb comes a horizontal stretch, then a fortress
maze, then the world boss.

## Hearts, shops and upgrades

**Hearts** are currency. Enemies drop them and pots (shoot pots to break them)
hold clusters of them. Spend hearts at a **merchant's shop** — walk onto a
`SHOP` door and press Up:

| Item | Effect | Cost |
| --- | --- | --- |
| Health Vessel | +1 max health | 20 |
| Long Bow | arrows fly farther | 15 |
| Swift Shafts | arrows fly faster | 15 |
| Triple Shot | loose three arrows at once | 40 |
| Holy Tip | bigger, stronger, piercing arrows | 45 |
| Angel Barrier | blocks the next 3 hits | 25 |
| Credit Feather | survive one fatal fall | 30 |

**Sacred Treasures** are awarded after each world boss and permanently upgrade
your bow across the rest of the run (longer/faster arrows, the triple shot, and
finally holy arrows).

## Fortresses, chests and the eggplant curse

Every world's third area is a **fortress maze**. Grab the **key** on a high
ledge to open the **locked door**, then push through to the chamber of the
**Reaper-Moore** — a cloaked mini-boss that, the moment it *sees* you, freezes,
flares red with dread, and **summons a swarm of minions**. Defeat it to open the
gate to the world boss.

Fortresses hold **treasure chests**. Some are treasure (a pile of hearts and a
triumphant fanfare)... and some are a **trap**: the **Eggplant Wizard** homage.
Open a trap chest (or get hit by Moordusa's petrifying shot) and you're turned
into a walking eggplant — **you can't shoot** until it wears off, or until you
run to a **`CURE` door** where the **nurse** turns you back. The classic troll.

**Hot springs** (the glowing cyan pools) slowly heal you while you stand in them.

## Enemies

- **Monoeye** — a floating eyeball that drifts erratically; hard to pin down.
- **Shemum** — a hopping blob.
- **Nettler** — a spiny grounded charger.
- **Specknose** — hovers, then dives at your column.
- **Keepah / McGoo** — a stationary urn that spits out minions.
- **Tamambo** — an armoured pillbug that curls up (invulnerable) when hit.
- **Girin** — a bobbing serpent head that spits slow orbs.
- **Reaper-Moore** — fortress mini-boss; summons adds on sight.
- **Bosses** — **Pluton** (Underworld skull), **Gyrapace** (Overworld diver),
  and **Moordusa** (the Medusa homage, final boss).

## Worlds

1. **The Underworld** — climb out of the pit of dread.
2. **The Overworld** — sky kingdoms and cloud fortresses.
3. **The Sky Temple** — the final ascent to Moordusa and the goddess.

Each world = **vertical climb → horizontal stretch → fortress maze → boss**.
Death restarts the current sub-area (you keep your score, hearts and upgrades);
running out of lives is Game Over, with a retry from the start of the world.

## Scoring & saves

Score comes from kills and bosses; an extra life every 20,000 points. The
**hi-score** and your **best world reached** are stored in `localStorage`.

## Files

- `index.html` — canvas (256×240), touch UI, CSS.
- `server.js` — tiny static file server (PORT 8151).
- `src/input.js` — keyboard / gamepad / touch input.
- `src/audio.js` — WebAudio chiptune (title, climb, sky, fortress, boss,
  ending themes + all SFX).
- `src/sprites.js` — procedural pixel art, tiles and effects.
- `src/entities.js` — Pit-Moore, arrows, enemies and bosses.
- `src/levels.js` — all 12 stage layouts, world intros, sacred treasures.
- `src/shop.js` — the merchant's wares.
- `src/main.js` — main loop, states, camera, HUD, shops, curses.
