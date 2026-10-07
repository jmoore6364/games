# Excitemoore

An Excitebike-style motocross time-trial for the Moore Arcade. Vanilla
JavaScript ES modules, zero dependencies, zero external assets — all graphics
are procedurally drawn on a 2D `<canvas>` and all sound (including the
speed-pitched engine drone) is synthesized with WebAudio.

## Play

```
npm start          # or: node server.js
```

Then open http://localhost:8168/

Five deterministic tracks, four lanes, a stadium crowd, and a qualifying time
to beat on each. You get **3 entries** — fail to qualify three times and the
season is over. Qualify on all five tracks to become champion.

### The rules, straight from 1984
- **Turbo** is much faster but heats the engine. Hit 100° and you stall for
  a long, humiliating moment. Ride the flashing **cool pads** to reset the
  temp gauge.
- **In the air, lean** with LEFT (nose up) / RIGHT (nose down). Land with
  your wheels matched to the slope: a mismatch is a bounce that bleeds speed,
  a bad mismatch is a wipeout.
- **Ramps** launch you off their sheer back edge; carrying turbo speed over
  any **crest** (bumps, whoops) also gets you airborne.
- **Mud** drags you to a crawl — switch lanes around it (you can only change
  lanes on flat ground).
- **Rival riders** share the track. Clip one while grounded and you crash;
  land on one from above and *they* crash.

## Controls
- **Right / D** — accelerate · **Left / A** — brake
- **Space** — turbo (watch the temp gauge)
- **Up / Down** — switch lanes (flat ground only)
- **In the air:** Left = lean back, Right = lean forward
- **Enter** — start / restart · **M** — mute
- **Gamepad** — stick/d-pad, A = turbo, Start = start
- **On-screen d-pad + TURBO + START** — touch devices (revealed on first touch)

## Files
- `index.html` — page shell, inline CSS, canvas, touch controls
- `server.js` — tiny static file server on port 8168
- `src/main.js` — bike physics (shared by player and rivals), race flow, HUD,
  autopilot (used by the test suite to prove each qualifying time is beatable),
  `window.__xb` hook
- `src/track.js` — deterministic track generation + terrain height queries
- `src/entities.js` — bikes, riders, crowd, lanes, patches
- `src/audio.js` — WebAudio sfx + continuous engine drone pitched by speed
- `src/input.js` — keyboard + touch + gamepad input

## Test hook
`window.__xb` exposes `{ game, start(), state(), pos(), hold(dir,bool),
warp(x,lane), setSpeed(v), setHeat(v), setRaceTime(t), skipCountdown(),
track(), riders(), setAutopilot(v), setAttempts(n), gotoTrack(n) }` for
automated testing.

## Tech notes
Pure Canvas 2D (SwiftShader-safe), 60fps `requestAnimationFrame` loop, fixed
320×224 internal resolution scaled responsively to fill the window with a
crisp pixel look.
