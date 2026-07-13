# Lode Runner: Moore's Gold

A classic dig-and-dash arcade puzzler homage built from scratch in vanilla
JavaScript + canvas — zero dependencies. All pixel art is hand-authored
string-grid originals and every sound is synthesized with WebAudio at runtime;
there are no asset files.

## Run

```
npm start          # serves at http://localhost:8125
npm test           # level validator + mechanics tests + simulation fuzz
```

## How to play

Collect **all the gold** on the level — including any a guard has swallowed —
and the hidden **exit ladder** appears. Climb out the top of the screen to win.

You can't jump and you can't fight. What you *can* do is **dig**: burn a hole
in the brick diagonally beside you and let gravity do the rest. Guards fall
in, get stuck, and drop the gold they're carrying — then you run across their
heads. Holes regenerate after a few seconds; anything still inside when the
brick seals is destroyed. Guards respawn at the top. You don't.

## Controls

| Key | Action |
|-----|--------|
| Arrows / WASD | Run, climb ladders, hang on ropes (down to drop) |
| Z or , | Dig left |
| X or . | Dig right |
| Enter | Start / pause |
| M | Mute |
| R | Restart level (costs a life) |

Gamepad (standard mapping: dpad/stick, X = dig left, B = dig right) and
on-screen touch controls on mobile are also supported.

## Play on mobile / add to home screen

The game is an installable PWA:

- **Android/Chrome** — open the game, then "Add to Home Screen" (or accept
  the install prompt). It launches fullscreen in landscape with its own icon.
- **iPhone/iPad Safari** — Share → "Add to Home Screen".
- Once installed it works **offline**: a service worker precaches the whole
  game (it's ~40 KB with zero external assets) and picks up new versions in
  the background on the next visit.

In a plain mobile browser tab, tapping START requests fullscreen and locks
landscape where the platform allows it. On-screen controls: d-pad on the
left, DIG buttons on the right; in landscape they float over the board so
the game gets the full screen height.

## The board

- **Bricks** — diggable; regenerate after ~7 seconds
- **Slabs** — solid stone, can't be dug
- **Ladders & ropes** — climb and hand-over-hand
- **Trap bricks** — look exactly like bricks; step on one and you fall through
- **Hidden ladders** — appear (in gold) once every last piece is collected

## The guards

Guards path-find toward you across everything you can traverse — but they
plan as if dug holes were still solid floor, so they blunder in, exactly like
the mean little men of 1983. A trapped guard drops carried gold on the rim,
struggles, and climbs back out. Guards sealed in a hole die and respawn at
the top of the screen. Trapped guards are safe to walk on; escaping ones are
not.

## Ten levels

First Job · The Dig Site · Rope Bridge · The Long Vault · Twin Towers ·
The Undercroft · Chase Loops · The Gauntlet · Sky Rig · Moore's Hoard

Progress is saved: any level you've reached can be picked as a starting point
on the title screen. Scoring: gold 250 · trapping a guard 75 · sealing one
150 · level clear 1500 + an extra man. High score persists in localStorage.

## Level builder

Pick **LEVEL BUILDER** on the title screen. Paint bricks, slabs, ladders,
ropes, trap bricks, gold, guards, the start position, and the exit — the EXIT
tool stamps the whole hidden-ladder column up to the top for you, and
right-click (or the ERASE tool) clears cells.

The builder runs the **same solvability analysis as `npm test` live while you
paint**: the status bar tells you what's missing, and any gold the runner
provably can't reach (walking, climbing, falling, and digging included) gets
a red outline until you fix it.

- **TEST** playtests instantly; death or victory drops you back in the editor
- **SAVE** keeps levels in the browser — they appear under **MY LEVELS** on
  the title screen (X deletes)
- **SHARE** copies a link; anyone who opens it gets a "PLAY SHARED" option
  on their title screen — no server, the level lives in the URL
- **COPY/PASTE** moves levels around as plain JSON

## Dev/test hooks (browser console)

```js
lodeRunner.game      // live Game instance (grid, holes, guards, player)
lodeRunner.state     // current UI state
lodeRunner.goto(n)   // jump to level n (1-based)
lodeRunner.skip()    // instantly clear the current level
```

`tools/validate-levels.js` checks every level structurally and walks the
movement graph (including dig moves) to prove all gold and the exit are
reachable. `tools/mechanics-test.js` scripts the dig/trap/escape/seal/reveal
loop end to end. `tools/fuzz.js` runs each level for minutes of random play
checking invariants (nobody leaves the board, gold is conserved).
