# Moore Quest: The Ashen Road

A top-down JRPG in the Ultima / Dragon Quest / Final Fantasy tradition —
vanilla JS + canvas, original world, original art, original chiptune music.

The sun of Moorule is not a star. It is a fire — the Great Hearth, kindled
atop the Worldspire in the eldest days. Now the Duskweaver has wrapped it
in threads of shadow, and the lamps of the land are going out one by one.
Moore, a small-town lamplighter, carries the last honest flame up the
long road north.

## Play

```
npm start        # serves at http://localhost:8129
```

Or serve the folder with any static file server.

## Controls

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad / stick | D-pad |
| Confirm / talk | Z / Space | A | A |
| Cancel | X | B | B |
| Menu | Enter | Start | MENU |
| Mute | M | — | — |

## The road

- **A 96x64-tile continuous overworld** — grasslands, deep woods, a river,
  swamps, hills, mountains, and the ashlands — with a scrolling camera,
  roads, and random encounters by terrain.
- **Four towns** (Emberwick, Fordwell, Sagemoor, Highcairn) full of
  townsfolk whose gossip changes as the story moves — plus inns that heal
  and save, item shops, and smithies with three tiers of gear.
- **Five dungeons** — the Hollow Barrow, the Mire Cave, Duskhold Fort, the
  three floors of the Worldspire, and (for the brave) the optional Sunken
  Vault beneath the eastern sands, where the Drowned King guards the best
  gear in the game.
- **A party of three**: Moore the lamplighter (fire magic), Brann the
  smith (joins when you bring him star-iron to mend the Fordwell bridge),
  and Lyra the hedge-witch (joins when you cure Sagemoor's marsh fever —
  and she alone can part the mist pass).
- **Turn-based battles**: Fight / Skill / Item / Run, enemy groups, speed
  order, crits, 15 monsters and 5 bosses, XP, levels, learned skills,
  gold, and equipment. Swamp things poison — carry antidotes, or let the
  venom sap you with every step.
- **A world map and a bestiary** on the pause menu, and a fisherman in
  Fordwell who lost something in the Barrow and pays well for its return.
- **A quest chain that opens the map**: fix the bridge, part the mist,
  recover the stolen signal horn to open the Great Gate, then climb the
  Worldspire, face the Duskweaver, and relight the Great Hearth.

Falling in battle is not the end — you wake at the last inn you slept in,
with a lighter purse. Save at any inn, or anywhere from the menu.
