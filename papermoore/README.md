# Papermoore

**EXTRA! EXTRA!** A *Paperboy* style diagonal-scrolling paper-delivery arcade
game. Ride the oblique street from upper-right to lower-left, fling papers to the
subscribers on your route, vandalize the deadbeats, and survive a week of
increasingly hectic neighborhoods — capped each day by a BMX bonus course.

Pure vanilla JS + `<canvas>`. No dependencies, no assets — every sprite, tune and
sound effect is generated at runtime.

## Story

You are the Papermoore, the finest carrier the block has ever seen. Seven days,
Monday through Sunday. Every morning the route gets longer, the traffic thicker,
the dogs meaner — and by the weekend the Grim Reaper himself is out on the
sidewalk. Keep your subscribers happy and they stay on the route. Miss their
paper and they cancel: tomorrow's block is a little emptier and a little poorer.
Deliver a flawless day and a new neighbor signs up.

## Controls

| Action | Keys | Touch |
|--------|------|-------|
| Steer left / right | ← → or A D | joystick |
| Speed up | ↑ or W | joystick up |
| Brake | ↓ or S | joystick down |
| Throw paper | **X** / Space / Z / J | THROW |
| Bunny-hop (BMX bonus) | **X** / ↑ | THROW |
| Start / confirm / pause | Enter | MENU |
| Mute | M | — |

A gamepad works too (d-pad/stick to ride, A/X to throw, Start to pause).

**Aiming a throw:** the paper flies to whichever side you're leaning — hold ← to
throw left, → to throw right, otherwise it goes toward the side you last steered.
A landing shadow shows exactly where it will come down, so time your toss as you
roll past a mailbox.

## Scoring

- **Paper in the mailbox** (perfect delivery): **500** + a sparkle.
- **Paper on the porch/lawn** of a subscriber: **250**.
- **Window smash** on a non-subscriber (vandalism, and encouraged!): **150** — the
  window shatters and gets boarded up.
- **Paper bundle** pickup: refills **+5** papers (stack holds up to 20).
- **BMX bonus:** **100** per ramp jumped, **200** per star, up to **1000** for a
  clean (crash-free) run, plus a completion bonus.

At the end of each street the **route summary** shows your whole block: green =
subscriber delivered, red = subscriber missed (cancelled), orange = window
smashed. A **perfect route** earns a new subscriber.

## Tips

- You always keep moving forward — tap **↑** to sprint past a knot of hazards, or
  **↓** to brake and line up a tricky mailbox.
- Hazards are telegraphed: they appear far up the street and rush toward you.
  Watch the lane they're in and steer around them.
- Grab every bundle — running out of papers means missed subscribers.
- Non-subscriber houses are drab and grey; subscribers are bright and tidy with a
  raised red mailbox flag. Smashing a subscriber's house does nothing good; aim
  the vandalism at the deadbeats.
- In the BMX bonus, ramps auto-launch you (or hop early with **X**); hop over
  barriers and water, and swoop up the stars.

## Run it

```
node server.js       # serves on http://localhost:8150
```

Then open <http://localhost:8150>. High score is saved in `localStorage`.
