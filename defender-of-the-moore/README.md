# Defender of the Moore

A *Defender of the Crown* (Cinemaware, Amiga 1986) style light strategy game in
vanilla JS + canvas. No dependencies, no assets — everything is procedural pixel
art in a 16-bit-ish palette and a fully synthesized WebAudio score. You are a
Saxon-ish lord in a fractured realm: conquer the whole map turn by turn, manage
a little gold-and-army economy, weather Cinemaware events, and resolve conflicts
through four action mini-games.

```
npm start        # serves on http://localhost:8154
npm test         # headless Node tests (economy, AI, conquest, events, save)
```

## The campaign (strategy layer)

- **The realm** — twelve **territories** on a painted map of the moor, split at
  the start between your House Moore and three rival houses (Blackthorn ·
  Ashenvale · Grimwald), each colour-coded with its own heraldry. Territories
  give **income** (gold) and raise a **levy** (soldiers) each turn. Some hold a
  **castle** (must be taken by **siege**, needs a catapult); the rest are **open
  land** (a quick **field battle**). **Adjacency** — the dotted roads — decides
  who you can attack.
- **A turn** — at the start of your turn you collect income and your lands raise
  fresh soldiers, then you take **one action**: **Muster Levy** (buy soldiers
  into the selected land), **Forge Catapult** (needed for sieges), **Attack** an
  adjacent enemy land (→ a battle/siege mini-game), or **Hold Court** (end turn).
  Then the three rival lords each take a turn — they grow, and march on the
  weakest neighbour (and sometimes on you). You can **Save Chronicle** any time.
- **Events between turns** (Cinemaware flavour) — a bountiful harvest (gold), a
  Saxon raid or the grey plague (losses), a **tournament** (→ joust for gold &
  renown), the **maiden is captured** (→ a rescue raid for a marriage-alliance),
  or a **challenge of honour** (→ a sword duel).
- **Win** by conquering all twelve territories (a coronation); **lose** if your
  house is wiped from the map. Renown and a final **score** track your glory.

## The mini-games (the action)

1. **Jousting** — the signature. Side-view charge on horseback. Hold **Up/Down**
   to set your **lance height** to the foe's exposed **mark**, and press **X** to
   **couch** (brace) your lance as the gap closes. A braced, well-aimed strike
   unhorses him. Best of three passes. (Tournaments & disputes.)
2. **Sword duel** — side-view fencing. **Up/neutral/Down** sets your line
   (high/mid/low); **X** strikes, **Z** parries. A parry only works in the
   matching line and staggers the attacker; a landed hit shoves the foe back.
   Drive him off the end or land four clean blows. (Challenges & the raid guard.)
3. **Castle siege** — a catapult artillery duel. **Up/Down** sets the **angle**;
   **hold X** to wind the arm and **release** to loose; watch the boulder arc and
   smash the ramparts. The garrison fires back — press **Z** to take cover.
   Breach the walls before your host is spent.
4. **Field battle** — the quick resolution for open land. A charge-timing bar
   sweeps; press **X** in the golden band for a decisive charge, then the clash
   resolves weighted by the two army sizes. Fast, so most turns aren't a full
   set-piece.
5. **Rescue raid** — a light top-down stealth run through a keep. **Arrows** move;
   dodge the patrolling guards (or **X** to shove one aside) and reach Lady
   Rowena. Three hearts; reach her to win.

## Controls per scene

| Scene | Keys |
| --- | --- |
| Title | X / Enter new game · Z resume saved chronicle · M mute |
| New game | Up/Down choose row · Left/Right change house / difficulty · X or Enter ride forth · Z back |
| Campaign map | Arrows/WASD move the cursor between lands · X open the council menu · tap a land to select, tap again for its menu |
| Council menu | Up/Down choose · X select · Z cancel |
| Event / notice | X continue (or take up the challenge) |
| Joust | Up/Down aim lance · X couch/brace |
| Sword duel | Up/neutral/Down set line · X strike · Z parry |
| Siege | Up/Down angle · hold X power, release to fire · Z take cover |
| Field battle | X to charge in the golden band |
| Rescue raid | Arrows/WASD move · X shove a guard |

Global: **Enter** pause-ish / confirm, **M** mute. **Touch:** virtual stick +
**X**/**Z**/**MENU** buttons, and the map & menus are tappable. **Gamepad:**
standard mapping (dpad/left stick, A = X, B/Y = Z, Start = menu).

## Files

- `src/campaign.js` — territories, adjacency, economy, battle maths, rival AI,
  turn resolution, random events, save serialization. **Fully headless** (no
  DOM) so it runs and is tested under Node.
- `src/main.js` — state machine, campaign-map rendering, HUD, the council menu,
  event/notice vignettes, the quick field-battle scene, and save/load glue.
- `src/joust.js` · `src/duel.js` · `src/siege.js` · `src/raid.js` — the four
  action mini-game scenes (each a self-contained `update()`/`render()` object).
- `src/sprites.js` — procedural art: heraldic shields & charges, mounted
  jousters, foot fencers & soldiers, castles (with battle damage), catapults,
  portrait vignettes, and painterly backdrops.
- `src/audio.js` — synthesized medieval score (regal saw "brass", lute court
  variant, joust gallop, siege pounding, dungeon creep, coronation & dirge) plus
  all sound effects. **M** mutes.
- `src/input.js` — keyboard / touch / gamepad, two action buttons (X, Z).
- `tests/test.js` — Node test suite: income accrual, muster/catapult spending,
  battle odds, attack resolution & territory transfer, rival-AI legality across
  many rounds, a full scripted conquest to victory, event variety & rewards, and
  a save round-trip.

## Notes & simplifications

- Save is a single slot in `localStorage` (map ownership, gold, armies,
  catapults, turn, renown, RNG seed) written after every action.
- **Player-initiated** attacks play out as mini-games; **rival** attacks on your
  lands are auto-resolved (weighted by army sizes) and reported as a vignette, so
  turns stay quick and the mini-games stay the player's own set-pieces.
- Reinforcement is automatic each turn (lands raise a small levy up to a cap);
  mustering with gold is a burst on top, keeping the Defender-of-the-Crown pacing.
