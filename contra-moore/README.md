# Contra: Moore Force

An NES Contra–style run-and-gun in vanilla JS + canvas. Original art, music,
levels, and story — no assets or melodies borrowed.

## The story

Year 2ØXX. The Moorlord Legion has seized the Galuga Archipelago and is
growing something under the mountain. Sgt. Moore goes in alone — one rifle,
no backup — through the jungle, up the falls, into the machine base, and
down into the hive to burn the Moorlord Heart.

## Features

- **Four areas**: the jungle perimeter (with collapsing bridges and wadeable
  rivers), a vertically scrolling waterfall climb, the Dreadnought machine
  base, and the organic Moorlord hive.
- **Run-and-gun controls**: 8-way aiming, somersault jumps, prone, drop-through
  platforms, and diving under water to slip past fire. Hold the aim-lock
  button to plant your feet and aim in all 8 directions without moving.
- **Weapons**: rifle, M machine gun, S five-way spread, L piercing laser, and
  the B barrier — carried by winged falcon capsules. Die and you're back to
  the rifle, as tradition demands.
- **One-hit deaths**, streamed enemy grunts, pop-up turrets, wall cannons,
  grenadiers, alien flyers, larvae and spawning pods.
- **Four bosses**: the fortress gate, the stone idol of the falls, the
  Dreadnought engine, and the Moorlord Heart itself.
- **Scoring** with extra lives every 30,000 points, three continues, and a
  certain famous 10-input code on the title screen for 30 lives
  (↑ ↑ ↓ ↓ ← → ← → jump fire).
- **All-original chiptune soundtrack** — seven tracks synthesized live with
  WebAudio, plus stage-clear jingles and effects.
- **Keyboard, gamepad, or touch** controls.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move / aim | arrows or WASD | d-pad / stick |
| Jump | Z or Space | A |
| Fire | X or J | X / B |
| Aim lock (stand still, aim 8-way) | C, K, or Shift | shoulder buttons |
| Prone | Down | Down |
| Drop through platform | Down + Jump | Down + A |
| Dive (in water) | Down | Down |
| Pause | Enter | Start |
| Mute | M | — |

On touch devices an on-screen joystick and buttons appear automatically
(force them with `?touch=1`). The joystick gives full 8-way aim with one
thumb — diagonals included — and LOCK is a tap-toggle there, so you can
plant your feet and aim without needing a third finger.

## Run it

```bash
npm start        # serves on http://localhost:8131
```

or open `index.html` from any static file server.
