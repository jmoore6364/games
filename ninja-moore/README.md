# Ninja Moore

An NES *Ninja Gaiden* style cinematic action platformer. Vanilla JS + canvas,
zero dependencies, all art and music synthesized at runtime.

```sh
npm start        # serves on http://localhost:8143
```

## Controls

| Key | Action |
| --- | --- |
| Arrows / WASD | Move, crouch (Down) |
| Z / Space | Jump (hold for height). Down+Jump drops through platforms |
| X / J | Katana slash (works crouched) |
| Up + X | Cast equipped ninpo (costs spirit points) |
| Enter | Pause / skip cutscene |
| M | Mute |

**Wall cling** is the signature move: touch any wall in midair and you stick.
Jump off the wall to leap away — steer back in with air control to re-grab the
same wall a little higher (the classic NG1 wall-climb tech), or bounce between
parallel walls to climb shafts. The whole of Act III's waterfall shaft is
climbable with wall jumps alone.

Getting hit knocks you back hard with a fixed, brief knockback and grants
invulnerability frames afterward. Pits are telegraphed with striped edges.
Hawks announce themselves with a screech and a flashing edge arrow half a
second before they enter the screen.

Slash lanterns to open them: spirit points, health, ninpo arts, 1-ups, and
time bonuses hide inside.

## Ninpo (Up + X)

| Art | Cost | Effect |
| --- | --- | --- |
| Throwing Star | 3 | Fast straight shot |
| Windmill Shuriken | 5 | Pierces and returns to your hand |
| Art of the Fire Wheel | 5 | Three arcing fireballs |
| Jump-and-Slash | 8 | Invincible spinning slash while airborne |

## Acts

1. **City Streets** — thugs and dogs in the neon night. Boss: Butch the Blade
2. **Talon Pass** — the hawks. You'll hear them first. Boss: Razorbeak
3. **Thousand Falls** — the vertical wall-jump climb. Boss: Master Kage
4. **Steel Serpent Base** — gunners and grenadiers. Boss: Col. Blisk
5. **The Bonehouse** — bats and fire jets in the catacombs. Boss: Malek the Hollow
6. **Demon Fortress** — the gauntlet, then the Demon Moore: armored giant,
   detached head, and the heart core

Mid-act checkpoints; die at a boss and you restart at the boss (NG3 style).
Continues are unlimited and restart the act. Hi-score is kept in localStorage.
