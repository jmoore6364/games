# Shining Moore

A Sega Genesis flavored, Shining Force style tactical RPG. Vanilla JS + canvas,
zero dependencies, all art and music generated in code.

```
npm start   # serves on http://localhost:8146
```

## Controls

- Arrows / WASD — move cursor / navigate menus
- Z / Space — confirm (hold during combat to skip cut-ins)
- X — cancel / inspect unit under cursor
- Enter — toggle FAST battle mode
- M — mute
- Touch: on-screen d-pad + A (confirm) / B (cancel) / MENU
- Gamepad: standard mapping (A confirm, B cancel, Start fast mode)

## The Force

| Name  | Class | Notes |
|-------|-------|-------|
| MOORE | SDMN → HERO | The hero. If he falls the battle is lost. Knows EGRESS (retreat, keep XP). |
| GART  | WARR → GLDT | Axe tank. Slow, hits hard. |
| MIRA  | HEAL → VICR | HEAL 1-3, AURA. Earns XP by healing. |
| KAEL  | KNTE → PLDN | Mounted lance. High move, slowed badly by forest/hills. |
| PIP   | ACHR → SNIP | Bow, range 2-3. Cannot counter adjacent — can counter at range 2. |
| ZIN   | MAGE → WIZD | BLAZE 1-3 with growing area of effect. Fragile. |
| SLY   | WOLF → WFBR | Werewolf brawler. Fast, very high crit. |
| AER   | BDMN → SKYW | Flyer. Ignores terrain, crosses water. Fragile. |

Units that reach level 10 can be **promoted** at the church once the ancient
rite is restored (after battle 4). Fallen units are not dead — revive them at
the church for gold.

## Campaign — 8 battles

1. **Defend the Gate** — hold the gate tiles; a breach is defeat
2. **Cross the Bridge** — a river chokepoint
3. **Forest Ambush** — wolves in the deep woods
4. **Seize the Church** — drive out the walking dead
5. **Mountain Pass** — cliffs and water gaps where flyers shine
6. **Castle Courtyard** — reclaim the castle
7. **The Throne Room** — Lord Vexmoore waits on the throne
8. **The Dark Summit** — the Dark Moore Dragon: two actions per round and a
   breath AoE

Between battles: HQ — talk to companions, shop (weapon tiers unlock as the
story advances), church (revive / promote), save (localStorage), depart.

## Tactics notes

- Terrain matters: forest +2 DEF (slow), hills +3 DEF (slower), roads are
  fast, water blocks everyone but flyers.
- Turn order is per-unit by agility (Shining Force style), shown in the
  portrait strip at the top.
- Enemies are dormant until you enter their aggro radius — pull small groups.
- Enemy archers keep their distance; some enemies hunt your healer first.
- Counterattacks land whenever the attacker stands inside the defender's
  weapon range (at 60% power).
