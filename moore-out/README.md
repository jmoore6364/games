# Moore-Out!!

An NES *Punch-Out!!* style pattern-recognition boxing game. You are **Little
Moore**, a small green-gloved hopeful seen from behind. Read the tells, dodge,
counter, and climb from the Minor Circuit to the World Title. Vanilla JS +
canvas, zero dependencies, all art and audio synthesized at runtime.

## Run

```
npm start        # serves at http://localhost:8138
```

Or `node server.js`. Add `?touch=1` to force on-screen touch controls.

## Controls

| Key            | Action                                    |
| -------------- | ----------------------------------------- |
| Z / X          | Left / right punch (body)                 |
| Up + Z / X     | Face punch                                |
| Left / Right   | Dodge                                     |
| Down (tap/hold)| Duck / block                              |
| Space          | STAR uppercut (needs at least one ★)      |
| Enter          | Start / pause                             |
| M              | Mute                                      |

Gamepad: d-pad dodge/duck, X = left punch, A = right punch, B/Y = star.

## How it works

- **Stars**: punch an opponent the instant he begins a telegraphed move (his
  glove flashes white) to counter him — free damage, and a ★. Spend it with
  Space for a huge uppercut.
- **Hearts**: punching a blocking opponent (and getting hit) costs hearts. At
  zero you turn pink and can't punch — dodge his attacks to recover.
- **Knockdowns**: at 0 HP you go down; mash Z/X to beat Moore Mario's count.
  Three knockdowns in one round is a TKO, either direction.
- **Rounds**: 3 rounds × 3:00 (clock runs fast). No KO after three rounds goes
  to a decision on points. Moore Louis has advice between rounds — read it,
  it's literal.

## The circuit (tell guide — mild spoilers)

<details><summary>Glass Moore</summary>
Blinks before every hook. His jabs are slow and counterable, and his body is
never guarded. A tutorial with gloves on.
</details>

<details><summary>Baron von Moore</summary>
His guard is a wall — punching it just costs hearts. Swing only during his
wind-ups (counter the flash), his misses, and his glove-kissing taunts. Duck
does not beat his uppercut; step aside instead.
</details>

<details><summary>King Mambo</summary>
Attacks on the beat of his dance: one-two-cha-cha. The Mambo Spin cannot be
blocked — dodge right, then left. Counter the crouching uppercut for stars.
</details>

<details><summary>Iron Moore</summary>
Face punches bounce off the armor until he's dizzy. He only opens up after his
Vault Slam uppercut misses — make it miss, work the body, then go upstairs.
</details>

<details><summary>Mr. Moorelight</summary>
The champ feints — defend the second twitch, not the first. When he winks,
the Lights-Out Express follows: it knocks you down in one hit, but dodging it
earns an instant ★. That star belongs in his dizzy face.
</details>
