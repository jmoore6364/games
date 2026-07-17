# The Legend of Moore

An NES-Zelda-style top-down action adventure in vanilla JS + canvas.
Original art, original chiptune music, no Nintendo assets.

Vexmoor, the Shadow King, has seized the castle of Moorule. Princess Seren
shattered the Golden Amulet into three shards and hid them in the dark
places of the land before being locked atop Mount Moore. A wanderer named
Moore must find the shards, break the seal, and end the shadow.

## Play

```
npm start        # serves at http://localhost:8128
```

Or serve the folder with any static file server.

## Controls

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad / stick | D-pad |
| Sword | Z / Space | A | A |
| Use B item | X / K | X or B | B |
| Pause / inventory | Enter | Start | MENU |
| Mute | M | — | — |

## The quest

- **A 30-screen overworld**: plains, deep woods, a graveyard, the mountains,
  a lake, and the southern shore — with caves, shops, and hidden secrets.
- **Three dungeons**: the Hollow Oak, the Drowned Crypt, and the Ember Maw —
  keys, locked doors, bombable walls, dark rooms, push-block puzzles, maps,
  compasses, and a guardian at the bottom of each.
- **Treasures**: the wooden and white swords, boomerang, bombs, the candle,
  heart containers, and three shards of the Amulet of Moorule.
- **Secrets**: burn suspicious bushes, bomb cracked rock faces, and master
  your sword — at full hearts it fires sword beams.
- Collect all three shards to break the seal on Mount Moore, storm
  Vexmoor's Keep, and rescue Princess Seren.

Some free advice, traveler: it's dangerous to skip the old man's cave on
the very first screen. The Gravemaw of the Drowned Crypt fears only fire
that bursts. And five hearts prove a hero worthy of a whiter blade.

Progress saves automatically (localStorage). Select your B item on the
pause screen.
