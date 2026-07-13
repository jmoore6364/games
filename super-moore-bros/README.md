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

## Game modes

- **Original Game** — four classic worlds: 1-1 overworld, 1-2 underground,
  1-3 athletic platforms, 1-4 castle with King Snapjaw on his bridge (grab the
  axe or land eight fireballs)
- **Moore Worlds** — the remix campaign: 2-1 moonlit run (fast goombas,
  hoppers, wings), 2-2 frostbite fields (slippery ice physics, spinies, ice
  flower), 2-3 the haunted hall (shy ghosts that only drift toward you while
  you look away), 2-4 Snapjaw's Keep (more fire bars, a meaner boss)
- **Level Builder** — paint tiles, blocks, pipes, hazards, and every enemy
  onto a canvas; pick a theme (incl. night/snow/ghost); playtest instantly;
  save to the browser; share levels as copy/paste JSON. Saved levels appear
  under **My Levels** on the title screen.

## Features

- Classic feel: acceleration, skidding, run boost, variable-height jumps,
  coyote time — plus slippery friction on snow levels
- Powerups: mushroom → big, fire flower → fireballs, **ice flower → iceballs**
  (freeze enemies solid, stomp to shatter), **wings** (double jump + absorbs
  one hit), invincibility star, hidden 1UP mushrooms
- Enemies: goombas (and fast red ones), koopas with kickable shells and combo
  scoring, red koopas that hold platforms, **spinies** (never stomp), **hoppers**,
  **ghosts**, piranha plants, fire bars, and two bosses
- Question blocks, breakable bricks, secret star bricks
- Gamepad support (standard mapping) and on-screen touch controls on mobile
- Flagpole finish with height bonus, castle walk-off, time-to-score countdown
- Coins (100 = 1UP), timer, lives, HUD with a hand-made 3x5 pixel font
- High score persisted in localStorage
- Two original chiptune loops + synthesized sound effects

## Dev/test hooks (browser console)

- `__game` — game state
- `__input.held.right = true` — drive input
- `__tick(n)` — step n frames synchronously (works in hidden tabs where rAF pauses)
- `__reset()` — fresh level in play state
