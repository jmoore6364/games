# Mega Moore

An NES *Mega Man 2* style run-and-gun platformer in vanilla JS + canvas.
Zero dependencies, zero assets — all pixel art and chiptune audio are
generated procedurally at runtime.

Defeat the four Robot Masters in any order, steal their weapons, then storm
the Skull Fortress: survive a boss-rush refight room and take down Dr. Moorly.

## Run

```sh
npm start          # serves at http://localhost:8135
# or: node server.js
```

## Controls

| Input | Action |
| --- | --- |
| Arrows / WASD | Move, aim ladders |
| Z / Space | Jump (hold for higher jumps) |
| Down + Jump | Slide |
| X / J | Fire current weapon |
| Up / Down | Grab and climb ladders (you can shoot from them) |
| Enter | Pause menu: pick a weapon with arrows, Enter equips + closes. FIRE on the E-TANK row uses it (full health refill, carry max 1) |
| M | Mute |

Touch controls appear automatically on touch devices (`?touch=1` to force).
Gamepads with standard mapping work too.

## Robot Masters and weapons

| Stage | Gimmicks | Weapon earned |
| --- | --- | --- |
| Torch Moore | Rising flame pillars, lava pits | **Torch Wave** — arcing fireball |
| Frost Moore | Slippery ice, crumbling ice blocks, appearing-block bridge | **Frost Shard** — fast triple icicle, freezes most enemies |
| Gear Moore | Conveyor belts, ceiling crushers, moving platforms | **Gear Cutter** — boomerang gear, pierces |
| Volt Moore | Timed beam barriers, ladder towers | **Volt Shield** — rotating shield; press fire again to launch it |

## Weakness cycle

Each boss takes **3x damage** from one earned weapon:

```
Frost Shard  →  TORCH MOORE
Gear Cutter  →  FROST MOORE
Volt Shield  →  GEAR MOORE
Torch Wave   →  VOLT MOORE
Gear Cutter  →  DR. MOORLY
```

(So the classic route is: beat anyone with the Buster — Torch is a fair
first pick — then follow the chain.)

## Other notes

- Buster has a 3-shot on-screen limit; special weapons drain energy bars
  (refill from enemy drops and pickups).
- Mid-stage checkpoint in every stage; spikes and lava are instant death.
- 3 lives; game over lets you continue at stage select — beaten bosses stay
  beaten. Beaten-boss progress and hi-score persist in `localStorage`.
- After all four masters fall, the Skull Fortress unlocks in the middle of
  the stage-select grid: it contains a boss-rush refight room, then
  Dr. Moorly himself.
- One E-Tank is hidden in each Robot Master stage.
