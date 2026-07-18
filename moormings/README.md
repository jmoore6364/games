# Moormings

A Lemmings-style real-time puzzle game with an Amiga flavour. Little
green-haired, blue-robed moormings pour out of a hatch and march blindly
onward; you hand out jobs to carve, bridge and block a safe road to the
exit through per-pixel destructible terrain.

Vanilla JS + canvas, ES modules, zero dependencies, zero assets — all art
and audio are generated in code. The simulation is fixed-step and
deterministic, and runs headless in Node (that's how the levels are proved
solvable — see below).

## Run

```
npm start          # serves on http://localhost:8139
node verify.js     # headless proof that all 12 levels are solvable
```

## The 8 jobs

| # | Job     | Effect |
|---|---------|--------|
| 1 | Climber | Permanent. Scales vertical walls; bumps off overhangs. |
| 2 | Floater | Permanent. Umbrella — survives any fall. |
| 3 | Bomber  | 5-second countdown, "oh no!", then blows a crater (and itself). |
| 4 | Blocker | Stands arms out, turning everyone around. Freed only by bombing or removing the ground beneath. |
| 5 | Builder | Lays 12 diagonal brick steps, then shrugs. Re-assign to keep going. |
| 6 | Basher  | Tunnels horizontally until there is no terrain ahead. |
| 7 | Miner   | Digs diagonally down-forward. |
| 8 | Digger  | Digs straight down. |

Steel plates (outlined) resist all tools with a *clink*. Water drowns,
lava burns, long falls splat.

## Controls

Mouse/touch first: click a toolbar skill, then click a moorming (hover
favours plain walkers over workers, and the info line names whoever is
under the cursor). Hold the `-` / `+` buttons to change the release rate.
Drag the world, hover the screen edge, use the arrow keys, or click the
minimap to scroll.

Keyboard: `1`–`8` select skill · `P` pause · `F` fast-forward ·
`N` twice = nuke (every moorming becomes a bomber — level over) ·
`R` restart · `Esc` level select · `+`/`-` release rate · `M` mute.

Gamepad: not supported — this is a mouse game at heart.

## Levels

Progress unlocks in order and is remembered (localStorage).

**Fun**
1. Just Dig! — the classic dig-through-the-floor opener
2. A Bridge Too Far — chain builders over a water chasm
3. Hold the Line — blocker-and-bash cavern with a lava crack
4. Look Before You Leap — umbrellas or splat

**Tricky**
5. Moore Alone — one moorming does everything
6. The Iron Ceiling — find the seam the steel doesn't cover
7. Up and Over — climbers up, floaters down
8. Mine All Mine — mine to the steel, then bash along it

**Taxing**
9. Compression Chamber — 18 of 20 at a locked-high release rate
10. Steel Works — five bridges, one seam, all steel
11. The Long Way Home — every trick, 12 of 14
12. Last Orders — 60 seconds; crank the rate or lose. Nuke-proof.

Each level's intended solution is documented as a comment in
`src/levels.js`, and encoded as a scripted, condition-triggered sequence
of assignments that `verify.js` replays through the real simulation,
asserting the save quota is met.
