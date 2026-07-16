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

- **Five areas**: the Blue Caverns, the Molten Vein, Gorluk's Den, Skyrax's
  Roost, and the Hive — 26 rooms of shafts, corridors, and lava.
- **Powerups**: Morph Ball, Missiles, Bombs, Long Beam, Ice Beam, Hi-Jump
  Boots, Varia Suit, 4 Energy Tanks, 7 missile packs.
- **Doors**: blue doors open to any shot; red doors demand a missile; the Hive
  gate opens only when both titans have fallen.
- **Phazoids** are immune to beams — freeze them with the Ice Beam and finish
  them with missiles. If one latches on, shake it off (mash jump) or bomb it.
- Destroy the Overmind and you have 2:30 to reach the surface before the
  planet comes down. Your gunship is waiting.

Progress saves automatically (localStorage) at elevators, items, and boss
kills. The pause screen gives you a hint about where to go next.
