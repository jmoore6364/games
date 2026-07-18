# Cruis'n Moore

A Cruis'n USA style pseudo-3D arcade racer built from scratch in vanilla
JavaScript + canvas — zero dependencies. The road engine is classic 90s
sprite-scaling: projected road segments with curves, hills and fog, scaled
roadside scenery, two-way traffic and rival racers. All pixel art is drawn
procedurally at runtime and every sound (engine, skids, crashes, chiptune
soundtrack) is synthesized with WebAudio; there are no asset files.

## Run

```
npm start          # serves at http://localhost:8126
npm test           # course geometry + sprite reference sanity checks
```

## How to play

Pick a course — **Pacific Coast**, **Route 66**, **Rocky Summit**, or
**Moore City Nights** — or take on the **Moore Tour**, a points
championship across all four. Then pick your ride: the balanced
**Roadster**, the fast-but-slippery **La Bomba**, or the grippy
**Moore Wagon**. Beat 7 rivals across 2 laps before the clock runs out;
checkpoints and the lap line add time. Watch for oncoming traffic in the
left lanes: a head-on hit at speed sends you into the signature Cruis'n
barrel-roll wipeout, and so does clipping a palm tree, cactus, or
building while off-road. Rear-ending same-direction traffic just costs
you speed.

Tuck in close behind another car at speed to build a **slipstream** —
the meter by the speedo fills, your top end climbs, and a full draft
flashes DRAFT! for a proper slingshot pass. Races roll random **weather**:
golden-hour skies, or rain that slickens your steering. A top-5
**leaderboard** per course is saved locally — set a time and punch in
your three initials, arcade style.

Mind the **highway patrol** parked on the shoulders: blast past a cruiser
above ~110 mph and it lights up and hunts you for ten seconds — get
caught and you're BUSTED, sitting still while the clock runs. And once
you set a course record, a translucent **ghost** of that run races you
on every attempt, with a live gap readout under the progress bar.

Press **2** on the title screen for **two-player split screen**: player 1
on arrows (top view), player 2 on WASD (bottom view), each with their own
car, timer, draft, cops, and wipeouts — you appear in each other's world,
trade paint when you touch, and the race ends in a head-to-head verdict.

## Controls

| Key | Action |
|-----|--------|
| ← → / A D | Steer (also navigates menus) |
| ↑ / W | Gas |
| ↓ / S | Brake |
| Enter | Start / continue (or tap GAS on touch) |
| 2 | Toggle two-player split screen (title screen) |
| R | Restart race |
| M | Mute |

In split screen, arrows drive player 1 and WASD drives player 2; a second
gamepad drives player 2 too.

Gamepad (standard mapping: stick/dpad to steer, A or right trigger for gas,
B or left trigger for brake) and on-screen touch controls on mobile are
also supported.

## How it works

The track is a list of fixed-length segments, each with a curve value and
elevation, projected every frame from the camera with 1/z scaling
(`src/game.js`). Curves are faked by accumulating a per-segment horizontal
drift while rendering — the same trick the arcade originals used. Rivals
rubber-band toward the player to keep races close, steer around traffic,
and race the same two laps you do; your standing is computed from actual
distance along the track. In tour mode the same seven rivals carry points
from race to race. Course layouts live in `src/track.js` (pure data,
node-testable), art in `src/sprites.js`, audio in `src/audio.js`.
