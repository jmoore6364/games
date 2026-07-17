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

### v1.1 — Secrets of Moorlach

- **The Catacombs**: a hidden dungeon beneath the cemetery crypt, home to
  reviving red skeletons, wraiths, and the Gravelord — who guards the
  **Moon Amulet** (halves damage taken at night) and a sealed treasure
  vault holding the Golden Cross.
- **The garlic secret**: buy garlic at the apothecary, lay it on the
  graves, and see whether Wee Inga was lying.
- **World map**: view the land of Moorlach (and your relic progress) from
  the gear menu.
- Wraiths now haunt the cemetery at night. Old saves keep working.

### v1.2 — The Drowned Quarter

- **Vireton**: a second, half-sunken town between the Bonebridge and the
  cliffs — flooded streets, plank walks, a chapel (heal + save on the east
  side of the world), and the Fish Exchange, which sells **Holy Ash**
  (scours every lesser monster off the screen).
- **Snapclaw crabs**: their shells turn every blow — strike when they rear
  up to pinch.
- **The Ferryman's Bell**: Widow Petra's side quest. Recover her husband's
  bell from the strongbox on the bridge isle and earn the **Ferry Whistle**
  — fast travel between the two towns from the gear menu.
- The world map now shows Vireton; old saves keep working.

### v1.3 — The Blood Moon

- **Bestiary**: the gear menu now tracks every monster you slay — kill
  counts, lore, and boss records across 21 entries.
- **The Moon Well**: the old well on the Whispering Woods hill opens only
  at night, and only for one who carries the Moon Amulet. At the bottom
  waits **Nyxara, the Blood Moon Hag** — the hardest fight in the game.
- **The Blood Whip**: Nyxara's hoard. The final whip tier — long, brutal,
  and it drinks: every landed blow restores a sliver of your health.
- Old saves keep working; kill counts start fresh.

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
