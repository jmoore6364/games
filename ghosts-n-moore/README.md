# Ghosts 'n Moore

A Ghosts 'n Goblins style arcade platformer. Brutally fair, small scope, big
atmosphere. Vanilla JS + canvas, zero dependencies, zero assets — all pixel art
and audio are synthesized at runtime.

## Run

```
npm start          # serves at http://localhost:8141
```

## Controls

| Key | Action |
| --- | --- |
| Arrows / WASD | Move, crouch (Down), climb ladders (Up/Down) |
| Z / Space | Jump — **committed**: direction is locked at takeoff, no air control |
| X / J | Throw weapon (max 2 on screen, 3 for dagger) |
| Enter | Pause / menus |
| M | Mute |

Touch devices get a virtual stick plus THROW / JUMP / MENU buttons
(force with `?touch=1`). Standard-mapping gamepads work too.

## The armor system

Sir Moore starts in **silver armor**. One hit knocks it off — pieces fly, and he
carries on in his heart-print boxers. A second hit leaves a tidy pile of bones.
Armor pickups (from chests) restore the silver suit. The **golden armor** chest
upgrade doubles your weapon damage — until something touches you.

Getting hit by the magician's sparkling bolt instead turns you into a **duck**
for 8 seconds: small, fast-ish, and completely unable to fight.

## Weapons

Pickups swap your current weapon — choose your poison, literally:

- **Lance** — default. Straight, medium speed, dependable.
- **Dagger** — fast, short cooldown, 3 on screen. The best. Take it.
- **Torch** — lobbed arc, briefly burns the ground where it lands. Awkward.
  The classic trap weapon; enjoy regretting the swap.
- **Axe** — heavy arc, pierces through enemies, flight path best described
  as "opinionated".

## Chests

Chests rise from the ground at fixed spots. Inside: a weapon, armor, golden
armor — or an **evil magician** whose blast polymorphs you into the duck.
Opening chests is a gamble. That's the point.

## Stages

1. **The Graveyard** — zombies rise forever; gravestones block your throws.
2. **Forest of Fear** — crows, spitting plants, rickety planks over black water.
3. **Ice Village** — slippery roofs, drifting ghosts, an ogre holding the gate.
4. **Crystal Caves** — ladders, falling stalactites, bone-throwing skeletons.
5. **Castle Walls** — wind gusts shove your committed jumps. Watch the leaves;
   jump only when they rest.
6. **Demon Throne** — the gauntlet, then **Astamoore** the demon lord.
   Aim for the head. The body only clinks.

The flying demon **Red Moorimer** (hover… swoop… dive) haunts stages 2, 4
and 5. He is exactly as unpleasant as you remember.

## Classic cruelty, fairly applied

- **3:00 timer** per stage. It runs out, you die. Armor doesn't help.
- Death sends you back to the stage start, or the **midpoint checkpoint**
  if you reached it. Fresh silver armor, timer reset, enemies reset.
- 3 lives; extra life at 20,000 points and every 70,000 after.
- 3 continues. A continue restarts the current stage and **resets your score**.
- Hi-score is kept in localStorage.

## The true ending (spoilers)

Beating Astamoore the first time is a lie. *"THE TRAP DEVISED BY MOORE IS
COMPLETE... GO AHEAD DAUNTLESSLY!"* — you replay stages **5 and 6** with more
enemies and a meaner boss. Beat him again for the true ending. This is an
homage; the original made you replay the whole game. Count your blessings.

## Files

- `src/main.js` — state machine, camera, HUD, map vignette, endings
- `src/entities.js` — player (armor / duck / committed jumps), enemies, boss
- `src/levels.js` — stage tilemaps as compact strings + spawn/chest/checkpoint data
- `src/sprites.js` — procedural pixel sprites (armored / boxers / duck frames)
- `src/audio.js` — WebAudio synth: original spooky loops + all SFX
- `src/input.js` — keyboard / touch / gamepad
