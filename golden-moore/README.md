# Golden Moore

A Golden Axe style side-scrolling beat-'em-up in the 16-bit Sega Genesis
flavor — vanilla JS + canvas (320x224), zero dependencies, zero external
assets. All sprites are procedural pixel art baked to offscreen canvases and
all audio is WebAudio synth (detuned-saw "FM" leads over a brooding bassline).

Moore the Golden marches on Death Moore's keep to take back the stolen crown.
Walk right; at trigger points the camera locks and enemy waves pour in from
the screen edges. Clear them and the flashing **GO →** arrow sends you on.

## Run

```
npm start        # or: node server.js
```

Then open http://localhost:8133 (append `?touch=1` to force the touch UI).

## Controls

| Action | Key |
| --- | --- |
| Move (8-way on the ground plane) | Arrows / WASD |
| Attack (slash-slash-finisher combo) | X (or J) |
| Jump / jump attack (X in air) | Z (or Space) |
| Back attack | X + Z together |
| Dash / dash attack | double-tap ← or → (then X) |
| Earth magic (spends all vials) | C (or K) |
| Pause | Enter |
| Mute | M |

Gamepad (standard mapping): A jump, X/B attack, Y magic, Start pause.
Touch devices get on-screen buttons including a MAGIC button.

## The rules of the road

- **Magic** — thieves drop blue potion vials; you hold up to 6. Casting
  spends them all in one screen-clearing earthquake whose damage scales
  with vials spent.
- **Beast riding** — on Turtle Beach a raider rides a blue "chickenleg"
  beast. Knock him off, walk into the beast to mount it, tail-whip with
  attack, hop off with jump. Get hit and you're bucked off.
- **Enemies** — raider swordsmen, fast blocking bone soldiers, slow heavy
  axe brutes, and potion thieves you kick for drops — with palette-swap
  variants in later waves. Finishers and heavy hits knock enemies down;
  they are invulnerable on the floor and get back up.
- **Lives & continues** — 3 lives, 2 continues, hi-score kept in
  localStorage.

## Stages

1. **Firwood Village** — burning huts, ends vs. The Iron Brothers.
2. **Turtle Beach** — sunset sea, the great turtle, beast riding; ends vs. The Bone Lords.
3. **Night Camp** (bonus) — kick the thieves around the campfire for potions before time runs out.
4. **Castle Approach** — dusk causeway to the keep; ends vs. The Gate Wardens.
5. **The Throne of Bones** — final battle with **Death Moore**, a giant
   knight with a multi-phase health bar and ground shockwaves.
