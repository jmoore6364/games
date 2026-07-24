# Street Moore II

A Street Fighter II style 1-on-1 fighting game for the Moore Arcade. Vanilla
JavaScript ES modules, zero dependencies, zero external asset files — all
graphics are procedural 2D `<canvas>`, all sound is synthesized with WebAudio.

Two visually distinct Moore fighters square off in a best-of-3 bout on a
parallax dojo stage with a cheering crowd, hanging lanterns, and a pagoda
skyline at sunset.

## Run

```
npm start          # node server.js  → http://localhost:8161/
```

Then open http://localhost:8161/ in a browser.

## The fighters

- **RYZEN MOORE** — balanced textbook brawler in a blue gi with a red headband.
  Cyan/white fireball.
- **KANGA MOORE** — bulkier bruiser in a red gi with blond hair. Fiery orange
  fireball.

## Controls (1P vs CPU)

| Action           | Key |
|------------------|-----|
| Move / walk      | ← → |
| Crouch           | ↓ |
| Jump             | ↑ or Space |
| Block            | hold ← (away from opponent) |
| Light / Heavy Punch | J / K |
| Light / Heavy Kick  | N / M |
| Crouch + Kick    | Sweep (knockdown) |
| **Fireball**     | ↓ ↘ → + Punch (quarter-circle forward) |
| **Uppercut**     | → ↓ ↘ + Punch (dragon punch) |
| Start / Pause    | Enter |
| Mute             | 0 |

Air punch/kick are available while jumping.

## 2-Player local mode

Choose **2P LOCAL** on the title screen.

- **Player 1 (left)** — move `A`/`D`, jump `W`, crouch `S`, punches `F`/`G`,
  kicks `V`/`B`. Fireball = `S` `→(D)` roll + `F`.
- **Player 2 (right)** — arrows + `J`/`K` punch, `N`/`M` kick (same as 1P).

## Touch controls

On touch devices an on-screen D-pad plus **LP / HP / LK / HK** attack buttons
and an **SP** (special / fireball) button appear automatically, along with a
START button. Fully responsive and letterboxed to any window size.

## Gameplay

- Best-of-3 rounds, 60-second round timer, KO when a health bar empties (with
  slow-motion + screen flash), win pips (stars) per fighter, then
  **YOU WIN / YOU LOSE** and a rematch prompt.
- Distinct light/heavy punches and kicks each with their own reach, damage,
  startup, and recovery, resolved with real hitbox-vs-hurtbox collision.
- Heavy kicks, sweeps, uppercuts and dead-on fireballs cause knockdowns.
- Blocking (hold away) converts hits into small chip damage with a block spark.
- Hit sparks, knockback, hitstun, screen shake, and dust round out the feel.
- A CPU that approaches, spaces, blocks reactively, throws fireballs to zone,
  anti-airs with uppercuts, and grows more aggressive each round / when losing.

## Files

- `index.html` — canvas, inline CSS, control hints, touch UI.
- `server.js` — tiny static file server (PORT 8161).
- `src/main.js` — round flow, combat resolution, HUD, rendering, test hook.
- `src/fighter.js` — fighter state machine, move table, projectiles, sprites.
- `src/ai.js` — CPU opponent.
- `src/stage.js` — procedural parallax stage.
- `src/audio.js` — WebAudio synth SFX.
- `src/input.js` — keyboard + touch + motion-input buffer.

## Test hook

`window.__sm` exposes `{ state, round, mode, p1hp, p2hp, p1, p2, projectiles }`
plus `start(mode)`, `cmd(obj)`, `punch(heavy)`, `kick(heavy)`, `fireball()`,
`uppercut()`, `move(dir)`, and `hurt(who, dmg)` for automated verification.
