# Bubble Moore

A Bubble Bobble style single-screen arcade platformer in the NES flavor.
Moore the little green dragon blows bubbles, traps monsters inside them,
and pops them into fruit across 20 rounds. Vanilla JS + canvas, ES modules,
zero dependencies, zero assets — all sprites are drawn procedurally at init
and all audio is WebAudio-synthesized chiptune.

## Run

```
npm start        # or: node server.js
```

Then open http://localhost:8132

## How to play

- Blow bubbles at monsters to trap them, then pop the bubble to turn the
  monster into fruit. Collect the fruit for points.
- **Bounce tech:** hold jump while landing on any bubble to bounce off it —
  chain bounces to reach high platforms. Touching a bubble without holding
  jump pops it (and pops chain to nearby bubbles).
- The screen wraps vertically: fall through a gap in the floor and you
  reappear at the top.
- Don't dawdle: a trapped monster escapes **angry** (faster, flashing) if
  its bubble pops on its own, and if you take too long the invincible
  **Baron von Bones** skull hunts you until the round is cleared.
- Powerups drop from above every few pops: red shoes (speed), fast bubbles,
  lollipop (longer bubble range), candy (points).
- 3 lives, extra life every 50,000 points. Hi-score is saved to
  localStorage.

## Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | Arrows / WASD | J / L |
| Jump (hold to bounce on bubbles) | Z or Space | I |
| Blow bubble | X | O |
| Pause | Enter | — |
| Mute | M | — |

Gamepads: standard mapping, pad 0 = P1, pad 1 = P2 (A jump, X/B bubble,
Start pause). Touch devices get on-screen buttons (P1 only; add `?touch=1`
to force them).

Two-player co-op: pick **2P START** on the title screen. P2 is the cyan
dragon with separate lives and score.

## Rounds

20 single-screen rounds, one new enemy family every 5 rounds:

- **1–4 (Soda Caves):** Grumble walkers — shelves, ledges, towers, first
  floor gaps.
- **5–9 (Mint Woods):** Springo jumpers join — open arenas, broken stairs,
  the great divide, islands, zigzag falls.
- **10–14 (Caramel Keep):** Puffish floaters join — sky cages, the cross,
  rings, updraft alley.
- **15–19 (Grape Towers):** Grogg spitters join — crossfire terraces, the
  hive, pressure cooker, gauntlet.
- **20:** the whole gang at once.

Clear round 20 for the win screen.
