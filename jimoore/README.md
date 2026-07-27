# Jimoore: Trash Bandit

Top-down stealth-arcade starring Jimoore, the very round raccoon from the
Moore Arcade character sheet (`characters/jimoore/`) — inspired by Jimothy,
Seattle's famously spherical raccoon.

## How to play

Smash every trash can, then eat every snack that spills out. Clear the yard
to advance; each alley is tougher than the last.

- **Move** — arrows / WASD (touch d-pad on mobile)
- **Trash Roll** — hold **Space** (or the ROLL button): the only way to smash
  cans, and it bowls over cats and scares rats — but it's LOUD
- **Noise** — rolling, smashing, and barking dogs fill the noise meter; past
  the white notch, the human storms out with a flashlight
- **Hide** — stand in a bush to vanish from everyone's sight
- **Cats** scratch (roll into them to stun) · **dogs** bark and chomp ·
  **big rats** steal your food before you can eat it
- Get spotted in the flashlight cone and you're **CAUGHT** — three hearts
  and it's game over

Scoring: cans 100×tier, snacks 10, stunned cat 50, chased-off rat 25, plus
end-of-level bonuses for spare hearts and a clean plate (no snacks lost to
rats).

## Run

```
npm start        # serves at http://localhost:8163
```

Vanilla JS + canvas, no dependencies. All art and sound are procedural.
