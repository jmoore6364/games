# Diablmoore

A **Diablo 1 style isometric action-RPG dungeon crawler**, built in vanilla JavaScript
ES modules with zero dependencies and zero external assets. All art, animation and music
are generated procedurally to offscreen canvases and the WebAudio synth. Descend from the
gothic town of **Moorestram** through five levels of increasing dread and slay **Diablmoore,
the Moor Lord**.

Canvas is 512x384, mouse-driven, scaled to fit the window.

## Run

```
node server.js          # serves on http://localhost:8152
# then open the URL in a browser
```

Tests:

```
node test/node-test.mjs      # headless unit tests (dungeon/pathfinding/combat/items/save)
node test/browser-test.mjs   # headless Chromium end-to-end + screenshots (needs server running)
```

## Controls

- **Left-click** — move; click a monster to attack (melee walks up, ranged/caster fires at it);
  click an item to pick it up; click an NPC to talk; click stairs to use them. **Hold** to keep
  moving / attacking toward the cursor.
- **Right-click** — cast your **secondary skill** toward the cursor.
- **1 – 4** — quaff the potion in that belt slot (also click the belt, or click an orb to
  drink the matching potion type).
- **I** or **C** — open the inventory + character sheet.
- **Tab** — toggle the automap.
- **Esc / Enter** — close menus.
- **M** — mute/unmute.
- Touch: tap to move/attack, on-screen **I / C / 1** buttons. Two-finger tap = secondary skill.
  (Touch support is basic — right-click/aim skills are best on desktop.)

## Classes

| Class | Start Str/Dex/Mag/Vit | Primary (L) | Secondary (R) | Style |
|-------|----------------------|-------------|----------------|-------|
| **Warrior**  | 30 / 20 / 10 / 25 | Attack (melee) | **Cleave** — hits every foe around you | Tanky bruiser, big HP |
| **Rogue**    | 20 / 30 / 15 / 20 | Arrow (ranged) | **Multishot** — a fan of arrows | Ranged, kite and shoot |
| **Sorcerer** | 15 / 20 / 35 / 15 | **Firebolt** (mana) | **Heal** — restore health | Glass cannon, mana-driven |

All three classes are fully playable. Weapons are usable by any class, but each class's damage
scales off its key attribute (Warrior=Str, Rogue=Dex, Sorcerer=Magic).

## Systems

**Stats & combat.** Four attributes — Strength, Dexterity, Magic, Vitality — drive derived
stats: `maxHP`, `maxMana`, weapon **Damage**, **Armor Class**, and **To-Hit %**. An attack rolls
to-hit as `clamp(5%..95%, (attackerToHit − targetAC) / 100)`; on a hit it rolls damage in the
weapon's range (6% chance to crit for double). Floating numbers show every hit, crit, miss and
XP gain.

**Progression.** Kills grant XP; the curve is `xpToNext(level) = 60 · level · 1.28^(level−1)`.
Each level grants **+5 stat points** to allocate on the character sheet and refills your orbs.

**Loot & rarity.** Monsters, barrels and sarcophagi drop items on the ground, glowing by rarity:
- **White** common (no affixes)
- **Blue** magic (1–2 affixes)
- **Gold** rare (3–5 affixes)

**Affixes** are prefixes/suffixes rolled onto magic and rare gear: `+damage`, `+armor`,
`+Strength/Dexterity/Magic/Vitality`, `+% to hit`, `+life`, `+mana`, `+% resist`. Equipped gear
changes your derived stats live. Magic/rare drops appear as **Unidentified** and give **no affix
bonus** until **Cain the Elder** identifies them in town.

**Items & inventory.** Weapons (dagger/sword/axe/mace/bow/longbow/staff), armor
(helm/body/shield), rings and amulets, potions, and gold. The inventory screen has an equipment
paperdoll plus a grid; click an item to equip (or drink), right-click an equipped item to remove.
Hover anything — on the ground or in the bag — for a Diablo-style tooltip listing its affixes.

**Dungeon.** Rooms + connecting corridors with doors, generated procedurally and guaranteed fully
connected (spawn can reach every floor tile and the stairs, verified in tests). A* pathfinding
(8-directional, no corner cutting) drives all movement. Fog of war: unexplored tiles are black,
explored tiles dim, and a torch light radius reveals what's currently visible. Themes shift as
you descend: **Crypt → Catacombs → Caves → Hell**.

**Depth & bosses.** Depths 1–4 are normal dungeon levels of rising danger; **The Moorcher**
(a Butcher-style mini-boss) lurks on depth 3. Depth 5 is **Hell**, home of the final boss
**Diablmoore, the Moor Lord**, who chases you, melees hard, and unleashes expanding novas of
hellfire that intensify as his health drops. Killing him wins the game.

**Town (Moorestram).** A safe hub with three NPCs:
- **Griswold the Smith** — vendor; buy gear and potions, sell your loot.
- **Pipin the Healer** — fully restores HP and mana, free.
- **Cain the Elder** — identifies all your unidentified items, free.

Stairs in the town cathedral descend into the dungeon; stairs-up in the dungeon climb back
toward town. (Dungeon levels regenerate each time you dive, Diablo-style.)

**Death rule (deliberately forgiving).** When you fall in the dungeon you see a *"You Have Died"*
screen, then rise again in Moorestram at full health, **keeping your level, gold, and all items**
— you lose nothing. Death costs you your current dive, not your character.

**Save.** Your character (class, level, XP, stats, gold, full equipment + inventory + belt, and
deepest depth reached) is saved to `localStorage` on every meaningful change. The title screen
offers **Continue** when a save exists.

**Audio.** WebAudio synthesises everything: brooding dark-ambient drones (a melancholy town
chord, a lower dungeon drone, a dissonant Hell drone), plus sword swings, monster hits/deaths,
spell casts, bow twangs, distinct pickup "clings" for gold/potions/gear, a level-up fanfare,
potion glugs, door creaks, the boss roar, and a victory theme. Press **M** to mute.

## Structure

```
index.html      canvas + touch overlay + boot
server.js        static file server (PORT 8152)
src/main.js      loop, states, iso rendering, HUD/orbs, all screens, town/vendor logic, test hook
src/input.js     mouse + keyboard + touch
src/audio.js     WebAudio drones + sfx
src/sprites.js   procedural iso tiles, walls, decor, creatures, items
src/dungeon.js   procedural generation, fog/light (LOS), A* pathfinding, connectivity
src/entities.js  classes, derived stats, combat rolls, monsters + AI, projectiles, XP curve
src/items.js     bases, affixes, rarity, item generation, stat aggregation, tooltips
src/save.js      localStorage persistence + serialization
test/node-test.mjs     headless unit tests
test/browser-test.mjs  headless Chromium E2E + screenshots
```

## Known simplifications / rough edges

- Inventory is a flat 40-slot grid rather than Diablo's shaped grid-Tetris (items occupy one cell).
- Weapons have no hard class restriction (any class may wield any weapon; damage scales by the
  class's key attribute).
- Dungeon levels regenerate on each dive rather than persisting per-depth.
- Touch controls are minimal (no aimed skills); desktop mouse is the primary target.
- Monster variety is six types plus two bosses; there is one guaranteed final boss encounter.
