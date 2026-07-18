# The Secret of Moore Island

A SCUMM-style point-and-click pirate adventure in the spirit of the 1990
classics — verb grid, sentence line, inventory icons, insult sword-fighting,
and a night dock lit by torches. All-new story, puzzles, and insults.
Vanilla JS + canvas, zero dependencies, zero asset files: every background,
sprite, and note of calypso is generated procedurally at runtime.

## The setup (no spoilers)

Scurvy Reef has two problems. First: the ghost pirate **Captain LeMoore**
has stolen the island's **entire supply of grog**. Second: he also took the
Governor's **prize parrot**, which everyone agrees was a power move.

You are **Moorebrush Threepwood-Moore**, a wannabe pirate who wants the
job of Governor's Ghost-Hunter. The Pirate Council demands three trials:

1. **Win the insult sword-fighting tournament** — fights here are won with
   words; swords are dramatic punctuation.
2. **Obtain a genuine ghost-repelling elixir** — the Voodoo Lady knows the
   recipe; the ingredients know how to hide.
3. **Get a ship** — preferably one that mostly floats. Ask for Stan.

Then it's off across the Moore Sea: jungle paths, a lonely hermit, a
village of vegetarian cannibals, a grotto full of rehearsed boasts, and a
final battle of ghost-themed insults aboard the *Rootless*.

No deaths. No dead ends. Roughly 90 minutes of piracy.

## Running it

```
npm start        # serves on http://localhost:8147
npm test         # headless full-walkthrough verification (Node, no browser)
```

## The interface

The screen is split MI-style: the scene on top, a **sentence line**, then
**nine verbs** and your **inventory**.

- Click a **verb**, then an **object** — the sentence line builds
  "Use rusty cutlass with…" style commands. Give and Use ask for a second
  object. Hovering anything shows its name in the sentence line.
- Click the ground to **walk**; Moorebrush pathfinds and scales with depth.
  He'll walk over to things before fiddling with them.
- **Right-click or double-click** performs the smart default verb:
  walk to open ground, look at scenery, talk to people, pick up items.
- **Talking** opens numbered dialogue choices at the bottom. Choices can
  unlock new topics. Insult duels use the same menu — pick your comeback.
- **Look at everything.** Everything has an opinion.
- Use an inventory item **on itself** (click it twice with Use) to use it
  on yourself — drinking, wearing, playing, that sort of thing.

### Controls

| Input | Action |
| --- | --- |
| Left click / tap | walk, execute sentence, advance dialogue |
| Right click / double-click | smart default verb |
| Q W E / A S D / Z X C | verb hotkeys (grid order) |
| 1–9 | dialogue choices |
| Esc | skip line / cutscene, cancel sentence |
| M | mute |
| F5 | reassurance (the game auto-saves continuously) |

Progress is saved to localStorage after every action; the title screen
offers **Continue** whenever a voyage is in progress.

## Structure

```
index.html            canvas shell (320x200, scaled pixelated)
server.js             static server, PORT 8147
src/main.js           game loop, SCUMM UI, dialogue/cutscene renderers, saves
src/rooms.js          17 rooms: painterly backgrounds, walk-boxes, hotspots
src/script.js         headless game logic: puzzles, dialogue trees, insults
src/actors.js         pathfinding, walk/talk animation, depth scaling
src/sprites.js        procedural characters (68px hero!) and item icons
src/audio.js          WebAudio calypso engine + spooky variants + SFX
src/input.js          mouse / touch / keyboard
tests/walkthrough.js  complete headless solution with dead-end invariants
```
