# Bonk's Moore-venture

A TurboGrafx-16 *Bonk's Adventure* style mascot platformer: a big-headed
caveman who solves every problem with his skull. Vanilla JS + canvas,
zero dependencies, all art and music synthesized in code.

## Run

```
npm start          # serves on http://localhost:8144
```

## Controls

| Key | Action |
| --- | --- |
| Arrows / WASD | Move (Up/Down also climbs and swims) |
| Z / Space | Jump |
| X / J | **BONK** — see head moves below |
| Enter | Pause / menus |
| M | Mute |

Touch devices get a virtual stick plus BONK / JUMP / MENU buttons.
Gamepads with standard mapping work too (A = jump, X/B = bonk).

### Head moves (the whole game)

- **Headbutt** — X on the ground: a forward skull arc.
- **Diving headbutt** — jump, then X in the air: plunge down head-first.
  Land on an enemy to **bounce**; chain bounces for combo points, and
  **each bounce restores your jump**.
- **Spin-glide** — press X again in the air (or mash/hold it): Bonk
  flutters, slowing his descent for long floaty crossings.
- **Ground shockwave** — dive-headbutt the floor: a shockwave **stuns**
  nearby ground enemies (the only safe way to crack a spiky crawler).
- **Teeth-climb** — leap at a wall marked with white chomp-chevrons and
  push into it: Bonk bites on. Up/Down to gnaw along it, Z to leap off.
- **Swimming** — in water, X is a headbutt stroke; Z hops you out at the
  surface.

### Meat!

- **Small meat** — ANGRY BONK: flashing, double-strength headbutts,
  knock-back immunity, 10 seconds.
- **Big meat** — **INVINCIBLE RAMPAGE**: the screen flashes, touching
  enemies destroys them, a drumbeat takes over the music, 8 seconds.
- Eating either freezes the screen for a quick flex. Timers show as a
  meat icon + bar in the HUD.

### Collecting

- **Smileys** — 50 of them = an extra life.
- **Hearts** — 3 hearts of health (half-heart damage). Two hidden
  **heart containers** (Rounds 2 and 4) each add a heart.
- Fruit is points. Conspicuous flower doors (press Up) hide two bonus
  mini-games: *Cloud Bounce* and *Climb the Smiley Tower*.

## Rounds

1. **Grasslands** — dino country, springy flowers, first bounce chains.
2. **Waterfall Cliffs** — the teeth-climb showcase, plus a swimming pool
   with fish and an underwater squeeze.
3. **Lava Crater** — bouncy geysers boost your jumps; mid-boss **Big Grub**.
4. **Ice Plateau** — slippery floors and penguin-dinos; glide the gaps.
5. **Moon Palace** — low gravity, then the final boss
   **King Moore-Drool III**: dodge his charges and screen-shaking stomps,
   and dive-headbutt his **crown**.

Score, lives, 3 continues, and a localStorage hi-score.
