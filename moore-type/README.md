# Moore-Type

An R-Type / Gradius style horizontal scrolling shoot-'em-up with a crisp
TurboGrafx-16 look (256x224 canvas). Vanilla JS + canvas + WebAudio,
zero dependencies, zero assets.

## Run

```
npm start          # serves at http://localhost:8137
```

## Controls

| Key | Action |
| --- | --- |
| Arrows / WASD | 8-direction movement |
| X / J | Fire — tap for pea shots, **hold to charge the wave beam, release to blast** |
| Z / Space | **Bank** the highlighted power-chain upgrade |
| C / K | **Force pod**: launch (when attached) / recall (when detached) |
| Enter | Pause (and menus) |
| M | Mute |

Touch devices get an on-screen d-pad plus FIRE (hold = charge), POD and BANK
buttons. Gamepad: dpad/stick, X/B fire, A bank, Y pod, Start pause.

## Power systems

Two independent power axes, one from each ancestor:

### Charge beam (R-Type)
Hold fire to fill the blue meter in the HUD; release for a piercing wave blast.
Three charge tiers — a full white meter pierces everything soft in its path.

### Force pod (R-Type, simplified)
Collect the orange **F** orb early in stage 1. The pod attaches to the front
or back of your ship, blocks enemy bullets, grinds enemies on contact, and
fires alongside you. Press **C** to launch it forward (it holds position
mid-screen as a turret), press **C** again to recall it — it reattaches front
or back depending on which side it returns from.

### Power chain (Gradius)
Destroying a complete **red** enemy chain drops an orange capsule. Each capsule
advances the selector bar in the HUD one slot:

`SPD → MIS → DBL → LAS → SHD` (wraps around)

Press **Z** to bank the highlighted upgrade:

- **SPD** — speed up (stacks to 4)
- **MIS** — ground-crawling missiles
- **DBL** — extra 45° upward shot (replaces laser)
- **LAS** — piercing laser beams instead of pea shots (replaces double)
- **SHD** — 3-hit front shield

Death costs everything (classic cruelty) and sends you back to the last
checkpoint — but if you had banked 2+ powers, a cyan **revenge capsule**
floats by after respawn, worth 2 selector advances.

## Stages

1. **Asteroid Approach** — debris belt, rock tunnels, the Core Golem
2. **The Living Corridor** — undulating organic walls, a stationary
   tailed horror with a shuttered core (you know the one)
3. **Fleet Gauntlet** — open space, hull platforms, gun after gun, the Carrier
4. **Mothership Core** — grinding crusher walls, tight shafts, and the
   three-phase Mother Core

Each stage has a mid-boss, an end boss with a destructible core weak point,
checkpoints, and its own music loop. 3 lives, 2 continues (restart at the
stage), hi-score saved to localStorage.

## Structure

- `src/main.js` — state machine, scroll camera, HUD, collisions
- `src/entities.js` — player, force pod, weapons, 8+ enemy types, bosses
- `src/levels.js` — stage terrain as compact profile strings + wave scripts
- `src/sprites.js` — procedural pixel sprites and terrain tiles
- `src/audio.js` — WebAudio synth: sfx, charge hum, 7 original chiptune tracks
- `src/input.js` — keyboard / gamepad / touch
