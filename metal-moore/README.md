# Metal Moore

A Metal Slug–style Neo Geo run-and-gun in vanilla JS + canvas, at genuine
Neo Geo-ish resolution (320×224). All pixel art is original string-grid
sprites baked to offscreen canvases, with the classic split-body trick:
the hero's legs and torso animate independently, so any run frame pairs
with any aim/fire/throw pose.

**Mission 1: The Green Wall** — fight from a jungle beachhead through an
occupied village, across the gorge bridge, past the rebel line, to the
Iron Moore-den.

## Play

```
npm start          # serves on http://localhost:8143
```

- Arrows / WASD — move, aim up, crouch
- Z / Space — jump (down+jump drops through planks / dismounts the slug)
- X — fire (point blank: knife)
- C — bomb (in the slug: cannon shell)
- M — mute · Enter — start

Gamepad and touch (virtual stick + buttons) also supported.

## The good stuff

- **The Moore Slug** — hop in the SV-001M: vulcan cannon, big shells
  (uses your bomb stock), 6 armor pips, crushes infantry, jump-capable.
- **POWs** — four bearded prisoners to free; they hand over heavy machine
  gun, rockets, bombs, or a suspiciously whole roast chicken.
- **Weapons** — pistol (tap-fire semi-auto), Heavy Moore Gun, rocket
  launcher, arcing bombs with a bounce.
- **Rebels** — riflemen who kneel and volley, knife chargers, grenadiers,
  and the R-Moore gunship dropping bombs from hover.
- **Boss** — the Iron Moore-den, an artillery crawler with a mortar
  volley, cockpit MG, and infantry reinforcements.
- One-hit deaths, Metal Slug style. Three lives, three continues.

`?sheet` on the URL shows the full baked sprite sheet.
