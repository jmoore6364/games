# Mooretroid: The Hive of Zemoor

An NES-Metroid-style exploration shooter in vanilla JS + canvas. Original art,
original chiptune music, no Nintendo assets.

Bounty hunter J. Moore drops alone into planet Zemoor to destroy the Overmind —
a hive organism breeding energy leeches called Phazoids. Two ancient titans,
Gorluk and Skyrax, guard the only gate into the Hive.

## Play

```
npm start        # serves at http://localhost:8127
```

Or serve the folder with any static file server.

## Controls

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad / stick | ◀ ▶ |
| Jump | Z / Space | A | JUMP |
| Fire | X / J | X or B | FIRE |
| Arm missiles | C / K | Y or RB | MSL |
| Morph ball / elevator | Down | Down | ▼ |
| Aim up | Up | Up | ▲ |
| Pause / status | Enter | Start | MENU |
| Mute | M | — | — |

## The mission

- **Seven areas**: the Blue Caverns, the Crystal Hollows, the Molten Vein,
  the Sunken Wreck, Gorluk's Den, Skyrax's Roost, and the Hive — 36 rooms
  of shafts, corridors, and lava.
- **Powerups**: Morph Ball, Missiles, Bombs, Long Beam, Ice Beam, Wave Beam,
  Charge Beam, Hi-Jump Boots, Varia Suit, Screw Attack, Space Jump,
  7 Energy Tanks, 12 missile packs.
- **Fifteen enemy species**, including armor-faced gravoks (shoot them from
  behind, or punch through with a charged shot), ceiling crushers (only
  vulnerable mid-slam), proximity mines, spitter plants, and leapers.
- **Living terrain**: crumble bridges that give way underfoot (and regrow),
  conveyor treads in the Wreck and Hive, slick ice floors in the Crystal
  Hollows, moving platforms over lava and spikes — and anything you freeze
  with the Ice Beam becomes a standable ice statue.
- **Charge Beam** (behind a red door in the great shaft): hold fire, release
  the storm. **Space Jump** (in the Hive): somersault again in mid-air.
- **Doors**: blue doors open to any shot; red doors demand a missile; the Hive
  gate opens only when both titans have fallen.
- **Ice Beam** shots deal normal damage and freeze anything that survives the
  hit. Phazoids are immune to beam damage — freeze them and finish with
  missiles. If one latches on, shake it off (mash jump) or bomb it.
- **The Crystal Hollows** are optional: the upper red door on the left side of
  the great shaft hides an elevator to the Screw Attack — somersault through
  enemies like they aren't there.
- **The Sunken Wreck** hides past the deep lava run below the Molten Vein: a
  dead colony ship holding the Wave Beam, whose shots pass through walls.
  With both beams, swap on the pause screen with C.
- **Automap**: press Fire on the pause screen for a map of everywhere you've
  been in the current area. Elevators are marked.
- Destroy the Overmind and you have 2:30 to reach the surface before the
  planet comes down. Your gunship is waiting — and your rank depends on your
  time and item count.

Progress saves automatically (localStorage) at elevators, items, and boss
kills. The pause screen gives you a hint about where to go next.
