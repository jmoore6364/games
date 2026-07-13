# King's Quest: The Crown of Moore

A Sierra-style graphic adventure homage built from scratch in vanilla JavaScript +
canvas — zero dependencies. EGA-palette scenes are painted with canvas primitives,
all sprites are hand-authored string-grid originals, and every sound (including the
court-melody loop) is synthesized with WebAudio at runtime. Original story and art.

A dragon has stolen the Crown of Moore. You are Sir Jason, the kingdom's newest
(and only) knight. Get it back.

## Run

```
npm start          # serves at http://localhost:8124
```

## How to play

| Input | Action |
|-------|--------|
| Arrow keys | Walk |
| Typing + Enter | Parser commands: `look`, `take bucket`, `give carrot to goat`, `throw water at dragon`, ... |
| M | Mute (when the command line is empty) |
| Touch | Pick a verb chip (WALK/LOOK/DO/TALK), tap the scene; BAG opens inventory — tap an item, then tap a target |

Useful meta-commands: `help` (context-aware hint), `score`, `inventory`,
`save` / `restore` (localStorage), `restart`.

## Features

- Eight hand-painted rooms: throne room, courtyard, meadow, whispering forest,
  lake, troll bridge, mountain path, and the dragon's cave
- Classic two-word(ish) text parser with synonyms, `give X to Y`, and plenty of
  snark for wrong answers (try `xyzzy`, `dance`, `pray`)
- Point-scored puzzle chain (60 points): bribe a goat, let it settle the troll
  dispute, and douse a dragon's pride with a bucket of water
- Faithful Sierra touches: walkable-area collision, room-edge scrolling,
  auto-walk toward whatever you interact with, and — of course — sudden
  hilarious death (drowning, trolls, dragonfire, questionable mushrooms)
- Deaths respawn at the room entrance with inventory intact (we're not monsters)
- Tap-to-walk and verb buttons for mobile; full game playable by touch
- Save/restore, mute, original chiptune loop and synthesized sound effects

## Dev/test hooks (browser console)

- `__game()` — game state
- `__do('give carrot to goat')` — run a parser command
- `__tick(n)` — step n frames synchronously
- `__enter()` — press Enter (advance dialog / start)
- `__teleport('cave', 34, 168)` — jump to a room
- `__held` — the held-keys set (drive walking)
