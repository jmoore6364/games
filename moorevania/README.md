# Moorevania II: Jason's Quest

A Castlevania II: Simon's Quest–style action-adventure in vanilla JS + canvas.
Original art, music, world, and story — no assets or melodies borrowed.

## The story

A generation after Sir Aldric Belmoore struck down Count Vorlok, the count's
dying curse rots the land of Moorlach. Jason Belmoore, last of the hunter
line, must pull three sealed relics — the Fang, the Eye, and the Chalice —
from three cursed manors, carry them to the castle ruin, and destroy the
Count forever.

## Features

- **Interconnected world**: a town, four overworld regions, three manors, and
  a final castle, linked by walk-off edges and gates.
- **Day/night cycle**: at night the dead hit harder (and drop more hearts),
  townsfolk vanish, and every shop bars its door.
- **Adventure economy**: hearts are currency. Buy whip upgrades, sub-weapons
  (dagger, axe, holy water, golden cross), tonics, laurels, and the oak
  stakes you need to crack relic orbs.
- **RPG leveling**: experience from kills raises your level, health, and
  whip damage.
- **Shops & NPCs**: an apothecary, a smith, a marsh hermit, a very suspicious
  trader inside the castle, and townsfolk offering hints (some of them lies,
  as tradition demands).
- **Four bosses**: the Bat Lord, the Reaper of Grimhollow, the Bone Dragon,
  and Count Vorlok himself — twice.
- **Saving**: rest at the church to record your deeds (localStorage).
  Death returns you to the church with everything you've earned.

## Controls

| Action | Keys |
| --- | --- |
| Move / crouch / climb | Arrows or WASD |
| Jump | Z or Space |
| Whip | X or J |
| Sub-weapon | C or K (or Up + whip) |
| Enter doors / talk | Up |
| Pause / gear menu | Enter |
| Mute | M |

Gamepad (standard mapping) and touch controls are supported.

## Run

```
npm start   # serves at http://localhost:8126
```

Or open through the arcade index at the repo root.
