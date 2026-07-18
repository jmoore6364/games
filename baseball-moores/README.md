# Baseball Moores

A Baseball Stars (NES, SNK 1989) style arcade baseball game — genuinely
playable pitch/bat/field/run action **plus** the signature team-management
meta: create a team, earn prize money, train and buy players, and grind a
persistent league season toward the pennant. Vanilla JS + Canvas, WebAudio
synth, zero dependencies, zero assets. 256×224, NES-bright palette.

## Run

```
npm start        # serves at http://localhost:8148
```
Open the URL in a browser. Or `node server.js`.

## Verify

```
npm run verify       # headless engine soak + league checks (Node)
node browsertest.mjs # full browser playthrough (needs the server running)
```

## Modes

- **Exhibition** — pick any two of the seven teams, 1P-vs-CPU or 2P local. No saving.
- **New League** — create your own team and play a 15-game season against six
  CPU rivals, then the pennant series. Everything auto-saves to localStorage.
- **Continue League** — resume your saved dynasty (team, money, standings, stats).
- **How To Play** — in-game controls reference.

## Controls

Arrows or WASD = dpad. **Z** = A button, **X** = B button. **Enter** = pause,
**M** = mute. Player 2 (2P exhibition): **IJKL** = dpad, **U** = A, **O** = B.
Standard gamepads (pad 0 = P1, pad 1 = P2) and on-screen touch controls are
also supported.

Controls change by phase, Baseball-Stars style:

| Phase | What you do |
|-------|-------------|
| **Pitching** | Dpad aims the pitch in/out/high/low (reticle in the zone). **A** cycles pitch type (fastball / curve-left / curve-right / changeup) — break & speed come from the pitcher's stats. **B** throws. Stamina drains each pitch; velocity and control fade when tired. |
| **Batting** | Dpad moves in the box (left/right coverage). **B** swings — *timing is everything*: solid contact is a ~±4-frame window. Swing early to pull, late to go opposite field; sweet timing + Power = home-run range. Hold **Down + B** to bunt. Balls/strikes/fouls are called; 4 balls = walk, 3 strikes = K. |
| **Fielding** | View switches to the overhead diamond. The nearest fielder is auto-selected and highlighted; run him to the flashing landing marker to make the catch. Weak-defense fielders bobble hard plays (errors). |
| **Baserunning** | Runners advance automatically on contact; base occupancy shows in the HUD diamond. |
| **Pause menu** | Resume, **change pitcher** (pull a tired arm for a reliever), or forfeit. |

## Team Management

- **Create a team** — name it, pick a color scheme and a logo emblem. You get a
  generated 14-man roster: 8 fielders, 4 pitchers, 2 bench bats.
- **Stats** — Batters: Power, Contact, Speed, Defense. Pitchers: Velocity,
  Curve, Stamina, Control. All 1–10.
- **Money** — win league games for prize money (bigger purses for beating
  stronger rivals). Spend it in the **Shop**:
  - **Train** a player +1 to any stat (price scales with the current level).
  - **Buy a prospect** — Rookie / Veteran / All-Star tiers replace a roster slot.
- **Lineup & Rotation** — reorder the batting order and choose your starting
  pitcher.

## League

Six CPU rivals of ascending strength — the hapless **Moore City Sandlots**, the
**Bunt Cake Bakers**, **Screwball Scallywags**, **Amoorican Dreams**, **Lovely
Moores**, and the mighty **Ghost Moores**. Play a 15-game season (opponents
cycle ~3× each) while the rest of the league plays out around you. Track the
**standings** and **stat leaders** (AVG, HR, RBI, Wins, Ks). Finish top-two to
contest the **pennant series** (best-of-3) for the trophy, then start the next
season carrying over your team and bankroll.

## Rules subset

9 innings, 3 outs, extra innings if tied, mercy rule (+10 after 5), walks,
strikeouts, doubles/triples/home runs, errors, double plays, sacrifice flies,
line score at inning breaks and a full box score at the final. Home runs get a
fireworks-and-fanfare cutaway.

## Files

- `index.html`, `server.js` (port 8148), `package.json`
- `src/main.js` — states/screens + the interactive game engine (pitch/swing
  duel, overhead fielding, HUD, all menus).
- `src/sim.js` — **headless** core: pitch physics, contact model, at-bat/inning/
  game rules, baserunning, box score, stat-driven CPU resolution, full-game sim.
- `src/league.js` — team/player generation, money, shop/training, season,
  standings, stat leaders, localStorage persistence.
- `src/input.js` — two-player keyboard/gamepad/touch input.
- `src/audio.js` — WebAudio synth (organ themes, charge fanfare, umpire blips,
  hit crack, crowd, HR fanfare).
- `src/sprites.js` — procedural chibi sprites (team palette swaps) + field art.

## Notes / simplifications

- The pitch/swing duel is fully real-time and skill-based (the heart of the
  game). Ball-in-play resolution blends the physics landing point with a
  fielder-reach race: you run the highlighted fielder to the marker to make
  catches, while hit type (single/double/triple) and errors follow the batted-
  ball quality and fielder defense. Baserunners advance automatically (with the
  rules engine handling forces, DPs, sac flies, and walk-offs) rather than being
  hand-steered — a deliberate simplification to keep the action legal and brisk.
- No injuries (per design). Championship is best-of-3.
