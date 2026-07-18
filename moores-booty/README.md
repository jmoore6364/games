# Moore's Booty

A Sid Meier's *Pirates!* (Amiga/C64 era) style open-world pirate sandbox in
vanilla JS + canvas. No dependencies, no assets — procedural pixel art and a
fully synthesized WebAudio soundtrack (concertina-square-wave sea shanties,
filtered-noise surf, cannon and steel).

```
npm start        # serves on http://localhost:8145
npm test         # headless Node tests (economy, wind, duel, battle, career loop)
```

## The career

Start broke in a sloop in 1660. Capitán El Moorro took your family's estate;
take it back. Trade or raid your way up to a frigate, earn letters of marque
and promotions from friendly governors, collect the 4 fragments of the
treasure map, dig up the Lost Treasure of Moore on the deserted isle, then hunt
El Moorro's black galleon and beat him in a duel for the **true ending**.
Retire at any port to see your career score.

## Systems

- **The Caribbean** — a scrolling 1280x896 top-down map: islands, 13 ports
  belonging to 4 nations (England red, Spain gold, France blue, Holland
  orange), reef hazards (they grind your hull), and a global wind that slowly
  rotates. Sailing with the wind is fast; beating into it is slow — trimming
  your course to the wind rose is the core sailing skill. Merchants, war
  galleons and pirates sail their own routes; touch a ship for an encounter,
  touch a port to dock.
- **Time & crew** — days pass while sailing; crew eats food from the hold;
  morale decays at sea and collapses when starving. You get one warning; then
  mutiny maroons you (forced retirement).
- **Ship battle** — real-time top-down: steer with the wind, X fires a
  broadside (your cannon count sets the weight, ship class sets the reload),
  hits wreck hull and sails. Close alongside and press Z to board (cuts to a
  duel); sink her instead and loot floats; sail off the arena edge to flee.
- **Sword duel** — side-view fencing on a deck. Hold up/neutral/down for
  high/mid/low; X attacks (telegraphed windup), Z parries **in the matching
  stance** (the stance is latched when you raise the blade). A parried
  attacker staggers; landed hits shove the loser down the deck — off the end
  is defeat. Resolves boardings and the final nemesis fight. Your fencing
  slows with age after 10 years at sea; the Toledo blade helps.
- **Trade** — 5 goods (food, sugar, rum, spice, cannon), prices vary by
  nation/port and drift over the days. Buy low, sell high; hold size depends
  on ship class.
- **Port** — Governor (letters of marque vs his enemies → legal raiding;
  captures earn promotions + land grants; hostile nations' forts fire on you
  instead), Tavern (hire crew, buy rumors, map fragments, a fine sword),
  Shipwright (repair, add cannons, buy sloop/brigantine/frigate/galleon —
  speed vs guns vs cargo), plus the market, saving, and retirement.
- **Treasure** — 4 map fragments (tavern purchases or captured captains)
  reveal a red X on the deserted isle. Anchor off it, press X to go ashore,
  walk the beach and dig at the X.
- **Nemesis** — El Moorro's black galleon roams the map; tavern rumors track
  him. Board him and win the duel for the true ending. Career score = gold +
  land + rank honours + treasure + nemesis, shown at retirement.
- **Difficulty** (new game) — scales enemy blade speed/skill, price markup,
  and how hard the wind punishes upwind sailing. Save game: single slot in
  localStorage, from any port menu.

## Controls per screen

| Screen | Keys |
| --- | --- |
| Menus / messages | arrows move, X or Enter select, Z back |
| Title / new game | type your name, arrows change nation & difficulty, Enter begin |
| Sailing | arrows/WASD steer (8-way), X go ashore (at the isle), Enter pause, M mute |
| Encounter | choose Attack / Sail on |
| Battle | left/right steer, X broadside, Z board (alongside), edge = flee |
| Duel | up/down stance, left/right footwork, X attack, Z parry |
| Trade | up/down good, X buy, Z sell, hold left/right for x10, Enter back |
| Beach | arrows walk, X dig, Enter back to ship |

Touch: virtual stick + Z/X/MENU buttons. Gamepad: standard mapping (dpad/left
stick, A = X, B/X = Z, Start = menu). M mutes all audio.

## Files

- `src/world.js` — map generation, wind model, economy, career state, AI
  ships, save serialization (headless).
- `src/battle.js` — sea battle simulation (headless).
- `src/duel.js` — fencing simulation + test strategies (headless).
- `src/port.js` — governor/tavern/shipwright/save logic (headless).
- `src/main.js` — state machine, rendering, HUD, all screens.
- `src/sprites.js` / `src/audio.js` / `src/input.js` — procedural art,
  synth music, input (keyboard/touch/gamepad).
- `tests/test.js` — Node test suite incl. a full programmatic career loop.
