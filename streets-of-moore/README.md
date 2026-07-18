# Streets of Moore

A Streets of Rage 2 style side-scrolling beat-'em-up in the 16-bit Sega
Genesis flavor — vanilla JS + canvas (320x224), zero dependencies, zero
external assets. All sprites are procedural pixel art (a shared paper-doll
pose library with palette-swap actors) and all audio is WebAudio synth —
driving four-on-the-floor club tracks with 16th-note bassline arpeggios.

The Syndicate owns Moore City. Two fighters walk right and disagree.

## Run

```
npm start        # or: node server.js
```

Then open http://localhost:8142 (append `?touch=1` to force the touch UI).

## Controls

| Action | P1 | P2 |
| --- | --- | --- |
| Move (8-way) | Arrows / WASD | I J K L |
| Attack | X | N |
| Jump | Z (or Space) | M |
| Back attack | C | B |
| Defensive special | X+Z together | N+M together |
| Run | double-tap ← or → | double-tap J or L |
| Blitz | run + Attack | run + Attack |
| Pause | Enter | Enter |
| Mute | 0 (M also mutes until P2 joins) | — |

Gamepads (standard mapping): P1 = pad 0, P2 = pad 1. A jump, X/B attack,
Y/shoulders back attack, attack+jump together = defensive special, Start pause.

**P2 drop-in:** press N (or pad-1 attack) at the character select or at any
time during play. Friendly fire is off.

## Movelist — MOORE HAMMER (balanced, hits hard)

| Move | Input | Notes |
| --- | --- | --- |
| Combo: jab, jab, hook, finisher | X, X, X, X | 4th hit knocks down |
| Launcher finisher | hold →(facing) on 4th X | launches for a juggle |
| Sweep | hold ↓ on 3rd X | early knockdown, ends chain |
| Back attack | C | hits behind you, knockdown |
| Neutral air | Z, then X | short jump punch |
| Directional air | Z + ←/→, then X | flying kick, knockdown |
| Blitz: MOORE UPPER | double-tap →, X | dashing uppercut, launches |
| Defensive special | X+Z together | invincible spin — **costs a sliver of HP if it hits** (breaks enemy grabs too) |
| Grab | walk into an enemy | automatic |
| Grab strikes | X while grabbing | 3 knees, third knocks down |
| Forward slam | hold →(facing) + X in grab | throws them **into** other enemies |
| Back suplex | hold ← + X in grab (or X after vault) | biggest throw damage |
| Vault | Z while grabbing | flip to a back-grab |

## Movelist — LUNA MOORE (faster, shorter reach)

Same command list; her chain is quicker with kicks for hits 3–4, her
finisher hits a little lighter, and her blitz is different:

| Move | Input | Notes |
| --- | --- | --- |
| Blitz: LUNA KICK | double-tap →, X | flying kick across half the screen |

Throw damage scales down each time the same enemy is thrown. Downed bodies
are invulnerable on the floor and briefly invulnerable on wake-up —
juggle launched enemies *before* they land instead.

## Weapons

Knocked from breakables and from knife punks. Stand over one and press X.

| Weapon | Swing | Extra |
| --- | --- | --- |
| Pipe | heavy, knockdown | 8 durability |
| Knife | fast stab | hold ←/→ + X to **throw it** (one shot, pierces) |
| Katana | long reach, knockdown | 10 durability |

You drop your weapon when knocked down. Weapons break when the pips run out.

## Breakables & pickups

Crates, barrels and phone booths crack open in 2–3 hits (thrown enemies
smash them instantly): apple = small heal, roast chicken = full heal,
money = 500, moneybag = 1000. Money is scooped by walking over it.

## Enemies

Galsimoore punks (some with knives), Donomoore brawlers (haymakers),
Signal throwers (**they grab and throw YOU — mash Z to tech out**),
Electra whip women (range), Big Moorley fire-breathers (charges + flame
cone), Road Moore bikers (ride in, dismount), Moorai kickboxers
(block and counter — throws and blitzes get through), a mirror-match
shadow, and Mr. Moore X with a machine-gun spread and a desk-flip
entrance. Palette swaps escalate HP and aggression.

## Stages

1. **Downtown Night** — neon rain, phone booths, ends vs. Big Moorley.
2. **The Bridge** — construction holes are knockdown hazards for
   everyone — knock enemies in. Ends vs. the Hell Riders.
3. **Amusement Pier** — pirate ship in the bay, ferris wheel; ends vs.
   Moorai the kickboxer.
4. **Freight Elevator** — vertical arena; a wave at every floor stop,
   Penthouse Guard at the roof.
5. **Syndicate Tower** — your own shadow at the door, then **Mr. Moore X**.

3 lives each, 2 shared continues, hi-score in localStorage. M (or 0) mutes.
