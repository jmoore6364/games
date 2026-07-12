# Super Moore Bros

A classic side-scrolling platformer homage built from scratch in vanilla JavaScript +
canvas — zero dependencies. All pixel art is hand-authored string-grid originals and
the chiptune soundtrack is an original composition (everything is synthesized with
WebAudio at runtime; there are no asset files).

## Run

```
npm start          # serves at http://localhost:8123
```

## Controls

| Key | Action |
|-----|--------|
| Arrows / WASD | Move (down to crouch when big) |
| Z / Space | Jump (hold for higher jumps) |
| X / Shift | Run · throw fireballs (fire form) |
| Enter | Start / pause |
| M | Mute |

## Features

- Classic feel: acceleration, skidding, run boost, variable-height jumps, coyote time
- Three worlds: 1-1 overworld, 1-2 underground (dark cave, blue-brick tileset,
  its own music), 1-3 athletic (floating platforms over the void, red koopas
  that hold their ground) — powerup size carried between levels
- Question blocks (coins + powerups), breakable bricks with shard particles,
  secret star bricks and hidden 1UP mushrooms
- Mushroom → big, fire flower → fireballs, invincibility star (rainbow flicker,
  plows through enemies)
- Goombas, koopas with kickable spinning shells and combo scoring, piranha
  plants in pipes (retract when you approach; can't be stomped)
- Gamepad support (standard mapping) and on-screen touch controls on mobile
- Flagpole finish with height bonus, castle walk-off, time-to-score countdown
- Coins (100 = 1UP), timer, lives, HUD with a hand-made 3x5 pixel font
- High score persisted in localStorage
- Original 8-bar chiptune loop + synthesized sound effects

## Dev/test hooks (browser console)

- `__game` — game state
- `__input.held.right = true` — drive input
- `__tick(n)` — step n frames synchronously (works in hidden tabs where rAF pauses)
- `__reset()` — fresh level in play state
