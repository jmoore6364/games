# Speedmoore 2

A Speedball 2: Brutal Deluxe style future-sports game. Two teams of six
armored players hurl a steel ball into the opposition goal on a vertically
scrolling metal arena. Violence is legal and encouraged. The crowd chants
"ICE CREAM! ICE CREAM!"

Vanilla JS + canvas, ES modules, zero dependencies, zero assets — all pixel
art and audio are generated in code.

## Run

```
npm start        # serves at http://localhost:8140
```

## Rules & scoring

- 2 x 90-second halves; teams swap ends at halftime.
- **Goal = 10 pts.** Smack the ball hard into a wall star to light the
  multiplier: while lit (8s), goals are worth **20 pts**. Ricochets off the
  side bumpers count too.
- **Knockdown = 2 pts** — aggression pays. Slide-tackle the ball carrier to
  strip the ball. Brutal hits (from behind, or on a battered player) injure:
  the victim crawls at half speed for 20 seconds (watch the ARMOR bar).
- A full-power throw (hold X until the bar maxes) makes the ball spark:
  briefly unstealable, and it flattens anyone it hits.
- After a goal, the conceding team restarts with the ball.

### Powerup tokens (run over them)

- shield — full armor repair (clears injury)
- bolt — speed boost
- magnet — bigger pickup radius
- snowflake — freeze the opposition for 2s
- coin — +5 credits (league prize money)

## Controls

- Arrows / WASD — move (8 directions)
- **Z** — pass (auto-aims the best-placed teammate, leads their run)
- **X** — with ball: hold to ramp power, release to throw.
  Without ball: slide tackle.
- **Enter** — start / pause
- **M** — mute
- Gamepad (standard mapping): dpad/stick move, A pass, X/B throw, Start pause
- Touch: virtual stick + PASS + THROW buttons

If you put the controls down, your highlighted player goes back to team AI
until you touch a control again. Control auto-switches to the fielder
nearest the ball (never while you hold the ball).

## League: The Moore League

8 teams — you are **Brutal Moore Deluxe** against Steel Fury, Turbo Hammers,
Violent Moore, Super Mashwan, Mean Machine, Raw Moosiahs and the Explosive
Lads. Single round-robin, 7 fixtures. Win = 2 pts, draw = 1.

Each match pays prize money: 20cr a win / 12 a draw / 6 a loss, plus an
aggression bonus (1cr per 3 knockdowns) and any coins scooped mid-match.
Spend credits in the TEAM SHOP on permanent squad upgrades: ATTACK,
DEFENCE, SPEED, ARMOR (4 levels each, persistent for the season).

League position, money and upgrades are saved in localStorage — close the
tab and carry on later. Top the table after round 7 for the trophy ceremony.

## Files

- `src/match.js` — headless pitch sim (players, ball, AI, scoring). Runs in
  Node with no canvas, so AI self-play can be tested from the CLI.
- `src/league.js` — fixtures, table, prize money, upgrades, persistence.
- `src/main.js` — screens, rendering, HUD, effects. `src/sprites.js`,
  `src/audio.js`, `src/input.js` — procedural art, synth audio, controls.
