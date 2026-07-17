# Leisure Suit Moore: Looking for Love in Neon City

A Leisure-Suit-Larry-style graphic adventure homage built from scratch in vanilla
JavaScript + canvas — zero dependencies. Neon night scenes are painted with canvas
primitives, all sprites are hand-authored string-grid originals, and every sound
(including the four-on-the-floor disco loop) is synthesized with WebAudio at
runtime. Original story, characters and art; the innuendo stays firmly at
wink-and-a-gold-chain level.

You are JASON MOORE — 38, assistant regional manager of a discount carpet
emporium, and owner-operator of the last white leisure suit in America. Tonight
you will find TRUE LOVE or perish in the attempt. (Statistically, the attempt.)

## Run

```
npm start          # serves at http://localhost:8130
```

## How to play

| Input | Action |
|-------|--------|
| Arrow keys | Walk |
| Typing + Enter | Parser commands: `look`, `buy fizz`, `give fizz to earl`, `pay bouncer`, `dance`, ... |
| M | Mute (when the command line is empty) |
| Touch | Pick a verb chip (WALK/LOOK/DO/TALK), tap the scene; BAG opens inventory — tap an item, then tap a target |

Useful meta-commands: `help` (context-aware hint), `score`, `inventory`,
`save` / `restore` (localStorage), `restart`.

## Features

- The time-honored ADULTHOOD VERIFICATION quiz before play begins (guards
  nothing, delights everyone)
- Eight hand-painted rooms: Neon Street, Sticky's Lounge, the alley (and its
  fateful dumpster), the Quickie Mart, the Strip, the Grand Casino, the Inferno
  disco, and a rooftop at dawn
- Classic two-word(ish) text parser with synonyms, `give X to Y`, and plenty of
  snark for wrong answers (try `xyzzy`, `pray`, `comb hair`, `look at self`)
- Point-scored puzzle chain (60 points) with a cash economy: fizz for Earl,
  Earl's gold card for Bruno, a jackpot from Lucky Lucy, mints + a rose + one
  legendary dance for Delilah, and a locket at the bottom of a dumpster
- Faithful Sierra touches: walkable-area collision, room-edge scrolling,
  auto-walk toward whatever you interact with, and — of course — sudden
  hilarious death (traffic, dark alleys, Sticky's Special, swinging on Bruno,
  robbing the cage)
- Deaths respawn at the room entrance with inventory intact (we're not monsters)
- Tap-to-walk and verb buttons for mobile; full game playable by touch
- Save/restore, mute, original synthesized disco loop and sound effects

## Dev/test hooks (browser console)

- `__game()` — game state
- `__do('give fizz to earl')` — run a parser command
- `__tick(n)` — step n frames synchronously
- `__enter()` — press Enter (advance dialog / start)
- `__answer(n)` — answer the age quiz (0-2)
- `__teleport('disco', 160, 170)` — jump to a room
- `__held` — the held-keys set (drive walking)
