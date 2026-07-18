// The Secret of Moore Island — game script: state machine, puzzle logic,
// dialogue trees, insult sword-fighting, trade chains, endgame.
// This module is 100% headless (no DOM) so the walkthrough test can drive it.

import { ROOMS, findHotspot } from './rooms.js';

// ------------------------------------------------------------ characters ----

export const NPCS = {
  hero:       { name: 'Moorebrush', color: '#ffffff' },
  narrator:   { name: '', color: '#8a94b8' },
  dockmaster: { name: 'Dockmaster Pegg', color: '#7fa8e0' },
  seagull:    { name: 'seagull', color: '#c8ccd8' },
  pirate:     { name: 'Scruffy Pirate', color: '#b0b8c8' },
  cat:        { name: 'dock cat', color: '#c8a468' },
  bartender:  { name: 'Grimble the barkeep', color: '#ffb85a' },
  council1:   { name: 'Councilpirate Edna', color: '#e08a7f' },
  council2:   { name: 'Councilpirate Bort', color: '#7fe0a8' },
  council3:   { name: 'Councilpirate Threepwood-Prime', color: '#e0d87f' },
  shopkeeper: { name: 'Ezekiel', color: '#8ae078' },
  voodoolady: { name: 'Madame Ochre', color: '#e07fe0' },
  butler:     { name: 'Fenwick the butler', color: '#b8a8e8' },
  dog:        { name: 'Biscuit', color: '#d8b060' },
  governor:   { name: 'Governor Marla Moore', color: '#ff9ab8' },
  stan:       { name: 'Stan S. Stanmoore', color: '#ffe04a' },
  mistress:   { name: 'Moira, Swordmistress of Scurvy Reef', color: '#ff6a5a' },
  hermit:     { name: 'Morris the Hermit', color: '#d8c890' },
  chief:      { name: 'Chief Cauliflower', color: '#8ac878' },
  cannibal1:  { name: 'Sous-Chef Rutabaga', color: '#a8d868' },
  cannibal2:  { name: 'Line-Cook Parsnip', color: '#78c8a0' },
  ghost1:     { name: 'ghost deckhand', color: '#70f0a0' },
  ghost2:     { name: 'ghost bosun', color: '#70f0a0' },
  lemoore:    { name: 'Captain LeMoore', color: '#40ff90' },
  percy:      { name: 'Percy the parrot', color: '#5ae0e0' },
};

// ----------------------------------------------------------------- items ----

export const ITEMS = {
  poster:     { name: 'tournament poster', look: '"GRAND INSULT SWORD-FIGHTING TOURNAMENT — all comers, all insults, no refunds." There\'s a doodle of a pirate crying.' },
  prybar:     { name: 'Stan-brand pry bar', look: 'Genuine Stan-brand! The label says "for prying yourself away from these deals." It is the only sturdy thing Stan has ever sold.' },
  plumedHat:  { name: 'plumed hat', look: 'An enormous purple hat with a feather that has its own postal code. Instant nobility.' },
  cutlass:    { name: 'rusty cutlass', look: 'A cutlass with more tetanus than edge. Perfect for fights that are 90% vocabulary.' },
  doubloon:   { name: 'shiny doubloon', look: 'One doubloon, slightly chewed. Legal tender everywhere except everywhere.' },
  mug:        { name: "Pegg's lucky mug", look: 'A pewter mug engraved "World\'s Okayest Dockmaster."' },
  fish:       { name: 'suspiciously fresh fish', look: 'It maintains unbroken eye contact. You respect that.' },
  lime:       { name: 'unripe lime', look: 'Hard as a cannonball and twice as sour. The scurvy trembles.' },
  emptyBottle:{ name: 'empty grog bottle', look: 'Empty, like the town\'s morale. Still corked, which feels optimistic.' },
  bottledFog: { name: 'bottle of genuine sea fog', look: 'Swirling grey mystery. Shake it and it mutters about shipping lanes.' },
  comb:       { name: 'silver comb', look: 'Madame Ochre\'s silver comb. It hums faintly of jasmine and mild curses.' },
  dogHair:    { name: 'hair of the dog', look: 'A generous tuft of golden fur. Biscuit has plenty more where this came from. It is everywhere, in fact.' },
  root:       { name: 'wriggling mandrake root', look: 'It squirms. It has opinions. It looks a little like the Governor, but you would never say so.' },
  elixir:     { name: 'Root Elixir of Un-Haunting', look: 'A flask that glows like a bottled sunset. Smells of root beer, limes, and dog. Three good swigs\' worth.' },
  badge:      { name: 'ghost hunter badge', look: '"OFFICIAL GHOST HUNTER (temporary, unpaid)." The Governor\'s seal is drawn on in crayon.' },
  voucher:    { name: 'Council ship voucher', look: '"Good for ONE (1) seaworthy-ish vessel. Signed, the Pirate Council." There is a grog stain shaped like doom.' },
  hotSauce:   { name: 'Scurvy Dog Inferno Sauce', look: 'The label is just a drawing of a skeleton sweating. Grimble keeps it behind three locks.' },
  banjo:      { name: 'the Sacred Banjo', look: 'Five strings, one soul. Recently worshipped, lightly seasoned.' },
  kazoo:      { name: "Morris's brass kazoo", look: 'A hermit-polished kazoo. Etched on the side: "The Melody of the Deep. Doo doo dee-doo doo."' },
  compass:    { name: 'spectral compass', look: 'Its needle points at grudges. Right now it points out to sea, quivering with resentment.' },
  percy:      { name: 'Percy the parrot', look: 'The Governor\'s prize parrot rides your shoulder, critiquing your posture.' },
  banana:     { name: 'banana', look: 'Nature\'s boomerang that doesn\'t come back. Slightly haunted? No, just ripe.' },
};

// ---------------------------------------------------------------- insults ----
// 12 all-new insult/comeback pairs. Ghost fight remaps 6 of the comebacks.

export const INSULTS = [
  { i: "You couldn't hit the ocean if you fell out of a boat!",
    c: "At least I'd make a bigger splash than your career." },
  { i: 'My blade has tasted the blood of a thousand scallywags!',
    c: "Then it's overdue for a dentist — I can smell it from here." },
  { i: "You call that a stance? I've seen jellyfish stand firmer!",
    c: 'Funny, they said they learned it watching your knees.' },
  { i: "I'll carve you up like a Sunday ham!",
    c: "You'd need to know which end of the fork to hold first." },
  { i: "When I'm done with you, you'll be bait for the crabs!",
    c: "They'd throw me back — they've got standards, unlike your crew." },
  { i: "You smell like the inside of a whale's regrets.",
    c: "That's just the wind blowing your words back at you." },
  { i: 'I once dueled three men at once, blindfolded!',
    c: "So that's how you got a face only a blindfold could love." },
  { i: 'Your sword swings slower than a Sunday sermon!',
    c: 'Yet it still got here faster than your last original thought.' },
  { i: "I'll mop the deck with your mustache!",
    c: "It'd do a better job than you've ever done at anything." },
  { i: 'Little wannabes like you should run home to mommy!',
    c: "I would, but she's busy teaching your crew to fight." },
  { i: "You're about as fearsome as a soggy biscuit!",
    c: 'Soggy from the tears you cried at our last duel, no doubt.' },
  { i: "By the time I'm through, you'll beg to walk the plank!",
    c: 'Anything to get away from your breath, admittedly.' },
];

// Ghost insults: each is answered by the comeback of INSULTS[pair].
export const GHOSTS = [
  { i: 'My spectral stench of doom shall wither your very courage!', pair: 5 },
  { i: 'I shall drag you down to the crushing dark of the bay!', pair: 0 },
  { i: 'My cursed cutlass has bitten a thousand mortal souls!', pair: 1 },
  { i: 'Time itself obeys me — I strike between the seconds!', pair: 7 },
  { i: 'I shall feast upon your soul like a Sunday banquet!', pair: 3 },
  { i: "I'll feed what's left of you to the ghost crabs of the abyss!", pair: 4 },
];

const FALLBACK = 'Oh yeah? Well... your face is dumb.';

// ------------------------------------------------------------------ state ----

export function newGame() {
  return {
    room: 'dock',
    x: 60, y: 118, face: 'r',
    inv: [],
    flags: {},
    known: [],          // indices into INSULTS the player has learned
    ghostHints: [],     // ghost insult indices the player has heard hints for
    duelSeq: 0,
    queue: [],          // pending speech {who, text}
    sfx: [],            // pending sound effect ids
    dialog: null,       // {choices:[str], handler(i)}
    duel: null,
    cutscene: 'intro',
    won: false,
  };
}

export function serialize(S) {
  const { queue, sfx, dialog, duel, cutscene, ...rest } = S;
  return JSON.stringify(rest);
}

export function restore(json) {
  const S = newGame();
  try { Object.assign(S, JSON.parse(json)); } catch { /* fresh game */ }
  S.queue = []; S.sfx = []; S.dialog = null; S.duel = null; S.cutscene = null;
  return S;
}

// ------------------------------------------------------------------ verbs ----

export const VERBS = [
  ['give', 'Give'], ['pickup', 'Pick up'], ['use', 'Use'],
  ['open', 'Open'], ['lookat', 'Look at'], ['push', 'Push'],
  ['close', 'Close'], ['talkto', 'Talk to'], ['pull', 'Pull'],
];
export const VERB_TEXT = Object.fromEntries(VERBS);

export function say(S, who, text) { S.queue.push({ who, text }); }
export function fx(S, id) { S.sfx.push(id); }
const hero = (S, t) => say(S, 'hero', t);
const has = (S, id) => S.inv.includes(id);

function addItem(S, id) { if (!has(S, id)) { S.inv.push(id); fx(S, 'pickup'); } }
function loseItem(S, id) { const i = S.inv.indexOf(id); if (i >= 0) S.inv.splice(i, 1); }

export function travel(S, room, x, y, face) {
  S.room = room; if (x != null) S.x = x; if (y != null) S.y = y; if (face) S.face = face;
  S.dialog = null;
  fx(S, 'door');
}

export function npcsInRoom(S) {
  const R = ROOMS[S.room];
  return (R.actors || []).filter(a => !a.if || a.if(S));
}

// -------------------------------------------------------------- look texts ----

const LOOKS = {
  // dock
  exitStreet: 'Lowtide Street: shops, taverns, and at least three kinds of smell.',
  moorehen: "The Leaky Moorehen. She's all yours: two masts, one sail, zero warranties.",
  ships: 'Tall ships slumber in the harbor, dreaming of scurvy-free crews.',
  water: 'The sea at night. Deep, dark, and up to something.',
  fogbank: 'A fat bank of sea fog loiters by the pier like it hasn\'t paid its tab.',
  moon: 'The moon. It has watched every pirate mistake ever made, and it is smirking.',
  dockTorch: 'A torch gutters bravely against the night. Union rules: one flicker per second.',
  poster: 'A poster: "GRAND INSULT SWORD-FIGHTING TOURNAMENT!" Below, smaller: "Bring your own dignity."',
  crate: 'A crate stamped "ABSOLUTELY NO CUTLASSES INSIDE." Suspiciously specific.',
  bollard: 'A mooring bollard, worn smooth by a thousand hasty getaways.',
  planks: 'Weathered planks. Each creak is a sea shanty in a minor key.',
  // street
  exitDock: 'Back to the docks, where the fog is free and so is the judgment.',
  tavernDoor: 'The Scurvy Dog Tavern. You can hear arguments about grog that no longer exists.',
  storeDoor: "Ezekiel's Emporium: \"If we don't have it, you don't need it, and stop asking.\"",
  voodooDoor: 'The voodoo shack glows faintly, like it knows something embarrassing about you.',
  archway: 'Through the arch: the Governor\'s mansion, all columns and consequence.',
  boatyardPath: 'A path lined with little flags, leading to what sounds like a sales pitch.',
  overlookPath: 'A steep path up the bluff. Someone has nailed up a sign: "SWORDMISTRESS. KNOCK FIRST. OR DON\'T. SEE IF I CARE."',
  wantedPoster: 'WANTED: Captain LeMoore, ghost. Crimes: grog theft, parrot-napping, unlicensed haunting. Reward: gratitude.',
  streetTorch: 'A civic torch. Your taxes at work, if anyone paid taxes.',
  cobbles: 'Cobblestones polished by centuries of dramatic exits.',
  // tavern
  exitTavern: 'The way out, for when the sobriety gets overwhelming.',
  council: 'The Pirate Council: Edna, Bort, and Threepwood-Prime. Between them, four eyes, five legs, and one working liver.',
  mug: 'A pewter mug on the shelf: "World\'s Okayest Dockmaster." Held hostage for an unpaid tab.',
  emptyBottle: 'An empty grog bottle. A museum piece from the before-times. Last week.',
  grogBarrels: 'Two barrels, drained to the echo. Someone has written "WHY" on one in tears.',
  fireplace: 'The fire keeps the tavern warm and the ghost stories warmer.',
  chandelier: 'A wagon-wheel chandelier. One rope holds it up. Classic foreshadowing, but no — it stays up. This is a nice tavern.',
  cookDoor: 'The kitchen door. Behind it, something hisses. Could be the cook. Could be dinner.',
  grogStain: 'A stain in the shape of your future. It is mostly regret-colored.',
  // store
  exitStore: 'Back to the street before Ezekiel invents a browsing fee.',
  limes: 'A crate of limes so unripe they are legally weapons.',
  swordRack: 'The sword display: three empty pegs and a sign, "SOLD OUT — BLAME THE TOURNAMENT."',
  crackerBarrel: 'A barrel of ship\'s crackers. The crackers are winning.',
  shelves: 'Shelves of rope, tar, lamp oil, and something labeled only "DO NOT."',
  shipBell: 'A brass bell for summoning service, judgment, or both.',
  anchor: 'A decorative anchor. Decorative like a wall is decorative: heavy and committed.',
  // voodoo
  exitVoodoo: 'The exit. The beads whisper your secrets as you go.',
  comb: 'A silver comb, laid out as if someone knew you were coming. Someone did.',
  cauldron: 'The cauldron simmers with something green that occasionally waves back.',
  skulls: 'A shelf of skulls, arranged by how surprised they look.',
  crystalBall: 'The crystal ball shows swirling mist and a preview of you making a bad decision. So, accurate.',
  chickenMobile: 'A mobile of chicken feet, swaying to music nobody is playing.',
  curtain: 'A beaded curtain leading to Madame Ochre\'s private quarters. Even curiosity has limits.',
  // mansion ext
  exitMansion: 'Back through the arch to the street.',
  mansionDoor: 'A grand mahogany door. It has looked down on better hats than yours. Most doors have.',
  mandrakePatch: 'A tidy garden bed of mandrake. The leaves flinch when you make eye contact.',
  fountain: 'A fountain shaped like Percy the parrot, spitting seawater with real disdain.',
  topiary: 'A hedge trimmed into a kraken. The gardener is either a genius or unwell. Possibly both.',
  gate: 'Wrought iron, wrought fancy. The Governor\'s initials are worked into it: "MM."',
  // mansion int
  exitParlor: 'Back to the courtyard.',
  perch: "An empty perch, still swinging faintly. Percy's absence has a shape, and the shape is judgmental.",
  portrait: 'Portraits of Governors Moore I through VI. The eyebrows thicken with each generation.',
  globe: 'A globe of the Tri-Island Sea. Someone has labeled the ocean "MORE SEA THAN NECESSARY."',
  chandelier2: 'A crystal chandelier. Each drop refracts a tiny upside-down you. All of them look nervous.',
  desk: "The Governor's desk: maps, decrees, and a half-written strongly-worded letter to a ghost.",
  // boatyard
  exitYard: 'Escape the boatyard. Stan\'s voice carries for another quarter mile.',
  bin: 'A bin labeled "LOST+FOUND." Mostly things customers lost and Stan found ways to resell.',
  wreck1: 'The "Barely Floats." The name is aspirational.',
  wreck2: 'The "Sea Colander." It has ventilation where ventilation should never be.',
  pennants: 'Rows of pennants, bleached by moonlight. They flap with the enthusiasm Stan pays them for.',
  yardSign: '"STAN\'S PREVIOUSLY-OWNED VESSELS: every boat has a story! (The story is usually \'it sank.\')"',
  // overlook
  exitBluff: 'The path back down to town. Gravity offers to help.',
  dummy: 'A training dummy with the face of someone who said "swords are easy" exactly once.',
  swordRack2: 'Practice swords, notched like a comb for a very violent giant.',
  view: 'The whole harbor glitters below: torches, masts, and one suspicious green shimmer far out at sea.',
  bigTree: 'A gnarled fig tree. Moira reportedly practices insults on it. It has heard things.',
  // ship
  wheel: "The wheel. Turn it and the whole ship follows. That's leadership.",
  gangplank: 'The gangplank ashore. It bounces exactly once more than you want it to.',
  sail: 'The sail is 40% patch, 40% ad space, 20% hope. "STAN\'S!" it screams.',
  mast: 'The mainmast. Solid oak, or at least solid oak-flavored.',
  shipCannon: 'A rusty cannon. The cannonballs were sold separately. Of course they were.',
  crowsNest: "The crow's nest. No crow. There's a waiting list.",
  shipRail: 'A railing for leaning on dramatically while the music swells.',
  // map
  mapReef: 'Scurvy Reef: home. Such as it is.',
  mapBeach: 'Moore Island: jungle, mystery, and reportedly excellent vegetarian food.',
  mapGhostShip: 'A green glow on the water. The chart just says "NOPE."',
  // jungle
  exitBeach: 'The beach, and the rowboat back to the Moorehen.',
  villagePath: 'A path marked by tiny footprints and — menus?',
  hermitPath: 'An overgrown trail. Someone rakes it nightly, then apologizes to the leaves.',
  tikiDoor: 'A carved tiki door in the rock. Its expression says "closed" in every language.',
  bananaTree: 'A banana tree, heavy with potassium and menace.',
  bananas: 'Bananas! The jungle provides.',
  flowers: 'Moonflowers, glowing softly. They bloom only at night, which around here is always.',
  idol: 'A mossy idol with an expression of eternal patience. It has seen many tourists. It waits.',
  // hermit
  exitHermit: 'Back to the jungle fork.',
  hut: 'A hut of driftwood and stubbornness. The architectural style is "Late Period Loneliness."',
  banjoStand: 'An empty banjo stand, dusted daily. The grief is well-organized.',
  campfire: 'A one-man campfire with seating for one and stories for nobody.',
  crab: 'A hermit crab. Morris says they\'re not related. The crab says nothing, pointedly.',
  shellPile: 'Coconut shells, halved. Morris was a percussionist before the loneliness. And because of it.',
  // village
  exitVillage: 'The jungle path out of Broccoli Cove.',
  menuBoard: 'Tonight\'s menu: Kelp Kebabs, Yam Surprise (the surprise is yams), and a moment of silence for the Banana Split.',
  veggieCauldron: 'A cauldron of stew. Not a single sailor in it. The yams bob apologetically.',
  huts: 'Huts shaped like a tomato, a mango, and a lime. Zoning laws here are delicious.',
  tikiTorches: 'Tiki torches burning citronella. Even the mosquitoes eat vegetarian tonight.',
  banjoShrine: 'A little shrine around a banjo. Offerings include a plectrum and half a mango.',
  // grotto
  exitGrotto: 'The crack back out to the jungle.',
  carvings1: 'Ancient carvings of ships and storms. And — deciphering slowly — boasts. Ancient boasts.',
  carvings2: 'Fresher carvings, glowing green. LeMoore has been practicing his material on this wall.',
  compassRock: 'Something glints in a crack of the rock.',
  ghostThrone: 'A throne of barnacles. From here, LeMoore commands the tides, the fog, and apparently all the grog.',
  grogCrates: 'Grog crates, emptied and stacked. The looting was tidy. Ghosts have time.',
  pool: 'A pool glowing teal from below. Something down there is bioluminescent, or just showing off.',
  // ghost ship
  exitGhost: 'Over the side, down the rope, back to the sane world.',
  hatch: 'The cargo hatch. Below decks, something glows and squawks.',
  ghostFlag: 'The flag shows a grinning mug over crossed bones. A pirate of terrible taste and worse thirst.',
  ghostRigging: 'Rigging of pale green light. The knots are tied in dimensions you don\'t have.',
  ghostWheel: 'The wheel turns itself, humming a shanty backwards.',
  ectoBarrel: 'A barrel of ectoplasm. "FREE RANGE," says the label.',
  // hold
  exitHold: 'The ladder up to the deck.',
  cage: 'A cage of green spirit-light. Inside, Percy the parrot glares with the fury of a thousand crackers denied.',
  grogHoard: "The island's entire grog supply, stacked in a smug pyramid. So it WAS LeMoore. The wanted poster will be thrilled.",
  boneChest: 'A chest of bones. Labeled "SPARES."',
  holdLantern: 'A lantern burning ghost-light. It casts shadows of things that aren\'t there. Hopefully.',
};

const NPC_LOOKS = {
  dockmaster: 'Dockmaster Pegg: beard like frayed rope, eyes like a man whose mug is elsewhere.',
  seagull: 'A seagull with the confident posture of a tiny landlord.',
  pirate: 'A scruffy pirate pacing the street, muttering comebacks and grading them out of ten.',
  cat: 'The dock cat. It owns this street and, by extension, you.',
  bartender: 'Grimble polishes a glass that will never again know grog. A single tear seasons it.',
  council1: 'Councilpirate Edna. Her earrings are tiny anchors. Her stare is a large one.',
  council2: 'Councilpirate Bort. He is mostly beard. The beard is mostly crumbs.',
  council3: 'Councilpirate Threepwood-Prime, allegedly a distant relative. He denies it in writing.',
  shopkeeper: 'Ezekiel: apron, spectacles, and the moral flexibility of a fine merchant.',
  voodoolady: 'Madame Ochre sees your past, your future, and your search history.',
  butler: 'Fenwick the butler, starched from soul to socks.',
  dog: 'Biscuit, the Governor\'s golden retriever. Security level: enthusiastic.',
  governor: 'Governor Marla Moore. She could fence, file taxes, and end you, in the same afternoon.',
  stan: 'Stan S. Stanmoore! Plaid jacket, arms like semaphore, sincerity sold separately.',
  mistress: 'Moira, Swordmistress of Scurvy Reef. Her ponytail has beaten better pirates than you.',
  hermit: 'Morris the Hermit: beard to the knees, loneliness to the horizon.',
  chief: 'Chief Cauliflower wears a ceremonial mask carved like a head of cauliflower. It is tremendous.',
  cannibal1: 'Sous-Chef Rutabaga, sharpening a carrot with another carrot.',
  cannibal2: 'Line-Cook Parsnip, plating moss like it owes him money.',
  ghost1: 'A ghost deckhand, mopping the same plank for two hundred years. Job security.',
  ghost2: 'The ghost bosun. He points at things. The things glow. It\'s a whole system.',
  lemoore: 'Captain LeMoore: beard of green fire, coat of drowned velvet, breath of stolen grog.',
  percy: 'Percy the parrot, prize of the Governor, hostage of the hour.',
};

// ------------------------------------------------------- generic responses ----

const GENERIC = {
  pickup: ["I'd rather not lug that around.", "It's staying put.", 'My pockets have standards.'],
  open: ["It doesn't open.", 'Locked, stuck, or philosophically opposed.', "There's nothing to open there."],
  close: ["It's as closed as it's going to get.", "I can't close that.", 'Closing that would solve nothing. Unusual, for me.'],
  push: ["It won't budge.", 'I push. The universe pushes back. Stalemate.', "Pushing that achieves surprisingly little."],
  pull: ["I can't pull that.", 'It resists my mighty tugging.', 'No. It has tenure.'],
  use: ["I can't use that.", "That doesn't seem to do anything.", 'Nice try. No.'],
  talkto: ["It has nothing to say.", 'We had a lovely chat about the weather. One-sided.', "I talk. It listens. We've all had worse conversations."],
  give: ["I don't think it wants that.", "It politely declines.", 'No thanks. Even inanimate objects have limits.'],
  lookat: ['Nothing special about it.', "It's exactly what it looks like."],
};
let genIdx = 0;
function generic(S, verb) {
  const arr = GENERIC[verb] || GENERIC.use;
  hero(S, arr[genIdx++ % arr.length]);
}

// ------------------------------------------------- wrong-combo red herrings ----
// bespoke funny responses for plausible-but-wrong Use X with Y / Give X to Y.

const COMBOS = {
  'use fish cauldron': "Madame Ochre's cauldron sniffs. \"Pescatarian potions are down the street,\" it burbles.",
  'use fish cat': 'The cat weighs the fish, then me, and concludes we are both beneath it. It takes a nap instead.',
  'use fish fogbank': 'I wave the fish at the fog. The fog now smells of fish. The town thanks me.',
  'use fish fireplace': 'Grilled fish? Tempting, but this fish has plans. I can tell by the eyes.',
  'give fish dog': "Biscuit sniffs the fish, then looks at me with deep betrayal. Dogs of this caliber eat organic.",
  'use banana dog': 'Biscuit catches it, gums it thoughtfully, and returns it 40% worse.',
  'give banana chief': '"A banana?!" gasps the Chief. "TOO SOON. The Split is still fresh in our hearts."',
  'give banana percy': "Percy eyes the banana. \"WRONG FRUIT. WRONG FRUIT,\" he screams. Everyone's a critic.",
  'use banana percy': "Percy eyes the banana. \"WRONG FRUIT. WRONG FRUIT,\" he screams. Everyone's a critic.",
  'use prybar grogBarrels': "I pry open a barrel. It contains one (1) echo and two (2) fumes. Mystery solved: still no grog.",
  'use prybar gate': 'The gate is iron. The pry bar is Stan-brand. I know who wins, and it hurts.',
  'use prybar dog': "Absolutely not. Biscuit is a good boy and also technically law enforcement.",
  'use cutlass dummy': 'I get three solid hits in before remembering: the tournament is insults, and the dummy is undefeated at silence.',
  'use cutlass pirate': 'He tuts. "Blades down, lips up. This is civilization."',
  'use cutlass sail': "Cut my own sail? Stan would charge me for the ventilation upgrade.",
  'use cutlass mistress': 'Moira parries with her eyebrows alone. "Words first, wannabe."',
  'use kazoo council': 'I play a stirring kazoo solo. The Council awards it "most legal noise of the evening."',
  'use kazoo percy': 'Percy imitates the kazoo perfectly, then imitates me imitating the kazoo. Devastating.',
  'use kazoo mistress': 'Moira closes her eyes. "Every note is an insult. I almost respect it."',
  'use comb hermit': '"Comb the beard?" Morris backs away. "She and I have an understanding."',
  'use comb cat': 'The cat allows exactly one stroke, then invoices me with its eyes.',
  'use comb topiary': 'I comb the kraken hedge. It looks 4% more dashing. The mansion applauds silently.',
  'use elixir cauldron': 'Madame Ochre yelps: "Do NOT double-brew! Last time it rained frogs for a week. The frogs still write to me."',
  'use elixir grogBarrels': "Refill the barrels with elixir? Tavern folk have suffered enough.",
  'give elixir bartender': 'Grimble sniffs it. "Root beer?! What do I look like, a soda jerk?" He hands it back with tongs.',
  'use doubloon crystalBall': 'I press the doubloon to the crystal ball. It shows a vision of me having one fewer doubloon. Prophecy averted.',
  'use mug grogBarrels': 'I hold the mug under the tap. The barrel produces a single sigh, freshly aged.',
  'use bottledFog fireplace': 'Fog plus fire equals a very confused chimney. I decline the physics.',
  'use lime emptyBottle': 'Homemade limeade? The lime bounces out of the bottle in protest. Not ripe. Not ready. Not interested.',
  'use poster wantedPoster': "I hold my poster next to the wanted poster. LeMoore is wanted, I'm wanting. The symmetry is grim.",
  'use compass wheel': 'The spectral compass spins in furious circles. Home is not a grudge, apparently.',
  'use plumedHat dog': 'Biscuit in a plumed hat: objectively magnificent. But he shakes it off. Some are born casual.',
  'use hotSauce veggieCauldron': 'Sous-Chef Rutabaga blocks me with a ladle. "Seasoning is EARNED. Give it to the Chief properly."',
  'give hotSauce bartender': 'Grimble clutches it. "You take that BACK out of my tavern before it unionizes the bar snacks."',
  'use root dog': 'The mandrake and Biscuit scream at each other. It ends in mutual respect and a little drool.',
  'use banjo campfire': 'Burn the SACRED BANJO? An entire village would write ballads about my villainy. On a replacement banjo.',
  'use fish moorehen': "Fish, meet boat. Boat, fish. Nothing happens, but it's good they met.",
  'use doubloon stan': 'Stan bites the doubloon, waves it around. "This covers the down payment on the down payment on the brochure!"',
  'give doubloon stan': 'Stan bites the doubloon, waves it around. "This covers the down payment on the down payment on the brochure!"',
};

function tryCombo(S, verb, a, b) {
  const key = `${verb === 'give' ? 'give' : 'use'} ${a} ${b}`;
  if (COMBOS[key]) { say(S, 'hero', COMBOS[key]); return true; }
  const rkey = `${verb === 'give' ? 'give' : 'use'} ${b} ${a}`;
  if (COMBOS[rkey]) { say(S, 'hero', COMBOS[rkey]); return true; }
  return false;
}

// ------------------------------------------------------------ duel engine ----

export function knownPairs(S) { return S.known; }

function learnPair(S, idx) {
  if (!S.known.includes(idx)) S.known.push(idx);
}

export function startDuel(S, foe) {
  S.duel = { foe, me: 0, them: 0, mode: null, cur: null, gwrong: 0 };
  fx(S, 'clash');
  if (foe === 'pirate') {
    say(S, 'pirate', 'En garde! Or as we say on Scurvy Reef: prepare to be described!');
  } else if (foe === 'mistress') {
    say(S, 'mistress', 'Rules are simple, wannabe: I talk, you limp home. Three touches.');
  } else if (foe === 'lemoore') {
    say(S, 'lemoore', 'You dare board the Rootless? Then duel me, mortal — tongue against TONGUE OF THE GRAVE.');
  }
  duelNext(S);
}

function duelNext(S) {
  const d = S.duel;
  if (!d) return;
  // win/lose checks
  const target = d.foe === 'lemoore' ? 4 : 3;
  if (d.me >= target) return duelEnd(S, true);
  if (d.them >= target) return duelEnd(S, false);
  if (d.foe === 'pirate' && d.mode === 'foeAttack') return duelPlayerAttack(S);
  return duelFoeAttack(S);
}

function duelFoeAttack(S) {
  const d = S.duel;
  d.mode = 'foeAttack';
  let pairIdx, text;
  if (d.foe === 'lemoore') {
    const order = [2, 0, 4, 1, 5, 3];
    d.gidx = order[(d.me + d.them) % order.length];
    text = GHOSTS[d.gidx].i;
    pairIdx = GHOSTS[d.gidx].pair;
  } else if (d.foe === 'mistress') {
    pairIdx = S.known[S.duelSeq++ % S.known.length];
    text = INSULTS[pairIdx].i;
  } else {
    // scruffy pirate teaches: prefers insults you don't know yet
    pairIdx = INSULTS.findIndex((p, i) => !S.known.includes(i));
    if (pairIdx < 0) pairIdx = S.duelSeq++ % INSULTS.length;
    text = INSULTS[pairIdx].i;
  }
  d.cur = pairIdx;
  say(S, d.foe, text);
  fx(S, 'swish');
  const options = S.known.map(k => INSULTS[k].c);
  options.push(FALLBACK);
  S.dialog = {
    tag: 'duel',
    choices: options,
    handler: (i) => {
      const right = i < S.known.length && S.known[i] === pairIdx;
      hero(S, options[i]);
      if (right) {
        d.me++; fx(S, 'clash');
        say(S, d.foe, d.foe === 'lemoore' ? 'GRRR. A palpable spectral hit.' :
          d.foe === 'mistress' ? 'Hm. Not terrible.' : 'Ow! Right in the reputation!');
      } else {
        d.them++; fx(S, 'thud');
        if (d.foe === 'pirate') {
          say(S, 'pirate', `Ha! Touch to me. What you were fishing for was: "${INSULTS[pairIdx].c}"`);
          say(S, 'pirate', 'First lesson\'s free. The rest are also free. It\'s a hobby.');
        } else if (d.foe === 'mistress') {
          say(S, 'mistress', 'Tsk. The correct answer existed, and that was not it.');
        } else {
          say(S, 'lemoore', 'HA! Your tongue is as dull as your future is short.');
        }
      }
      if (d.foe !== 'lemoore') learnPair(S, pairIdx); // you heard the exchange — you learn it
      duelNext(S);
    },
  };
}

function duelPlayerAttack(S) {
  const d = S.duel;
  d.mode = 'meAttack';
  const options = S.known.map(k => INSULTS[k].i);
  if (!options.length) { d.mode = 'foeAttack'; return duelFoeAttack(S); }
  S.dialog = {
    tag: 'duel',
    choices: options,
    handler: (i) => {
      const pairIdx = S.known[i];
      hero(S, INSULTS[pairIdx].i);
      fx(S, 'swish');
      // scruffy pirates flub the odd-numbered comebacks
      if (pairIdx % 2 === 0) {
        say(S, 'pirate', INSULTS[pairIdx].c);
        say(S, 'pirate', 'Touch to me! Write these down, lad.');
        d.them++; fx(S, 'thud');
      } else {
        say(S, 'pirate', 'Er... I am rubber, you are... some kind of glue?');
        hero(S, 'Touch to me!');
        d.me++; fx(S, 'clash');
      }
      learnPair(S, pairIdx);
      duelNext(S);
    },
  };
}

function duelEnd(S, playerWon) {
  const d = S.duel;
  S.duel = null;
  S.dialog = null;
  if (d.foe === 'pirate') {
    S.flags.dueledPirate = (S.flags.dueledPirate || 0) + 1;
    if (playerWon) say(S, 'pirate', 'I yield! Wounded! In the feelings!');
    else say(S, 'pirate', 'Victory is mine! But your vocabulary grows. Terrifying, honestly.');
    if (S.known.length >= 8) {
      say(S, 'pirate', 'You know what? You\'re ready. Take that mouth up the bluff and challenge Moira the Swordmistress.');
      S.flags.pirateSaysReady = true;
    } else {
      say(S, 'pirate', 'Again sometime? You still fight like you spell: badly, but with spirit.');
    }
  } else if (d.foe === 'mistress') {
    if (playerWon) {
      say(S, 'mistress', '...Well slap me with a mackerel. You WIN, wannabe.');
      say(S, 'mistress', 'Take this ribbon to the Council. Tell them Moira says your mouth is a registered weapon.');
      S.flags.trial1 = true;
      fx(S, 'award');
      say(S, 'narrator', 'TRIAL THE FIRST: COMPLETE');
    } else {
      say(S, 'mistress', 'Down you go. Come back when your tongue grows a spine.');
    }
  } else if (d.foe === 'lemoore') {
    if (playerWon) {
      say(S, 'lemoore', 'NO! Beaten! By a MOORE! The shame follows me to the afterlife — wait. NO!');
      S.flags.lemooreDefeated = true;
      S.won = true;
      S.cutscene = 'ending';
      fx(S, 'fanfare');
    } else {
      say(S, 'lemoore', 'HAH! Sharpen that tongue and return, morsel. I have eternity. You have a bedtime.');
      say(S, 'hero', 'Best of... eleven?');
    }
  }
}

// --------------------------------------------------------------- dialogues ----

function dlg(S, choices) {
  S.dialog = { tag: 'talk', choices: choices.map(c => c[0]), handler: (i) => choices[i][1](S) };
}

const bye = (S) => { S.dialog = null; };

const TALKS = {
  dockmaster(S) {
    say(S, 'dockmaster', has(S, 'mug') ? 'Is that... MY MUG?' : 'Evenin\'. Mind the fog. It follows people home.');
    const c = [];
    if (has(S, 'mug')) c.push(['Give the man his lucky mug.', (S) => { doGive(S, 'mug', 'dockmaster'); bye(S); }]);
    c.push(['What happened to all the grog?', (S) => {
      say(S, 'dockmaster', 'Ghost ship slid in on a Tuesday. Green as envy. Emptied every barrel on the island and took the Governor\'s parrot for an encore.');
      say(S, 'dockmaster', 'Captain LeMoore, that is. Terrible pirate. Worse guest.');
      bye(S);
    }]);
    c.push(['Why so glum, Dockmaster?', (S) => {
      say(S, 'dockmaster', 'Grimble\'s holdin\' me lucky mug hostage over a tab. A TAB. Forty years o\' friendship, one doubloon o\' debt.');
      say(S, 'dockmaster', 'Get it back and I\'ll owe ye. And I pay my debts! ...Eventually. Ask Grimble.');
      S.flags.knowsMugStory = true;
      bye(S);
    }]);
    c.push(['Any fish to spare?', (S) => {
      if (S.flags.mugReturned) { say(S, 'dockmaster', 'Take yer pick o\' the catch, mug-hero!'); }
      else say(S, 'dockmaster', 'For strangers? The fish and I have an exclusivity arrangement.');
      bye(S);
    }]);
    c.push(['Carry on, Dockmaster.', bye]);
    dlg(S, c);
  },

  pirate(S) {
    if (S.flags.trial1) { say(S, 'pirate', 'The champ! I tell everyone I taught you. Because I did.'); return; }
    say(S, 'pirate', 'Well, well. Fresh meat for the tournament, or just lost?');
    dlg(S, [
      ['I want to be a famous ghost-hunting pirate!', (S) => {
        say(S, 'pirate', 'Ambitious! Round here, fights are won with insults. Swords are just... dramatic punctuation.');
        say(S, 'pirate', 'Care to duel? I promise to teach while I win.');
        bye(S);
      }],
      ['Teach me to insult-fight!', (S) => {
        if (!has(S, 'cutlass')) {
          say(S, 'pirate', 'First get a sword. Any sword. It\'s a formality, like pants.');
          bye(S); return;
        }
        bye(S); startDuel(S, 'pirate');
      }],
      ['How do I win the tournament?', (S) => {
        say(S, 'pirate', `Learn the classics. Know at least eight solid comebacks, then beat Moira up on the bluff. You know ${S.known.length} of the twelve.`);
        bye(S);
      }],
      ['Farewell, scruffy stranger.', bye],
    ]);
  },

  bartender(S) {
    say(S, 'bartender', 'Welcome to the Scurvy Dog. Grog\'s off. Everything\'s off. We serve atmosphere and regret.');
    const c = [];
    c.push(['Tell me about the grog heist.', (S) => {
      say(S, 'bartender', 'LeMoore\'s ghosts drank the cellar THROUGH THE FLOOR. Didn\'t even leave a tip. Well — one. "Boo." That was the tip.');
      bye(S);
    }]);
    if (!S.flags.tabPaid) c.push(['About Pegg\'s lucky mug...', (S) => {
      say(S, 'bartender', 'One doubloon. That\'s the tab. Principle of the thing. The mug stays on the Shelf of Shame till it\'s square.');
      bye(S);
    }]);
    if (has(S, 'doubloon') && !S.flags.tabPaid) c.push(['Allow me to settle Pegg\'s tab.', (S) => { doGive(S, 'doubloon', 'bartender'); bye(S); }]);
    if (S.flags.metCannibals && !has(S, 'hotSauce') && !S.flags.banjoTraded) c.push(['I need something DANGEROUSLY spicy.', (S) => {
      say(S, 'bartender', 'Say no more.');
      say(S, 'bartender', 'The Scurvy Dog Inferno Sauce. Three drops cured a man\'s hiccups and his ability to taste. Take it OUTSIDE.');
      addItem(S, 'hotSauce');
      bye(S);
    }]);
    c.push(['A glass of atmosphere, please.', (S) => {
      say(S, 'bartender', 'Coming up.');
      say(S, 'bartender', '...');
      say(S, 'bartender', 'That\'ll be nothing. It\'s on the house. Like the roof. Which also leaks.');
      bye(S);
    }]);
    c.push(['Stay strong, Grimble.', bye]);
    dlg(S, c);
  },

  council(S) {
    if (S.flags.hasShip && S.flags.trial1 && S.flags.trial2) {
      say(S, 'council1', 'Ribbon. Elixir. And that floating apology at the docks counts as a ship.');
      say(S, 'council2', 'By the power vested in us by nobody whatsoever...');
      say(S, 'council3', 'We name ye OFFICIAL GHOST-HUNTER OF SCURVY REEF! Now GO GET OUR GROG!');
      if (!S.flags.councilBlessed) { S.flags.councilBlessed = true; fx(S, 'fanfare'); }
      return;
    }
    say(S, 'council1', 'Look what the tide coughed up.');
    dlg(S, [
      ['I want to be the Governor\'s ghost-hunter!', (S) => {
        say(S, 'council2', 'HAW! You? LeMoore would wear ye as a scarf.');
        say(S, 'council3', 'Rules are rules. Three trials, or no title:');
        say(S, 'council1', 'ONE: win the insult tournament. Beat Moira on the bluff.');
        say(S, 'council2', 'TWO: bring a genuine ghost-repelling elixir. Madame Ochre knows the recipe.');
        say(S, 'council3', 'THREE: have a ship. Hunting a ghost SHIP. On foot. Think it through, lad.');
        S.flags.trialsKnown = true;
        bye(S);
      }],
      ['Progress report, honorable Council!', (S) => {
        const t1 = S.flags.trial1 ? 'DONE' : 'not done';
        const t2 = S.flags.trial2 ? 'DONE' : 'not done';
        const t3 = S.flags.hasShip ? 'DONE' : 'not done';
        say(S, 'council1', `Tournament: ${t1}. Elixir: ${t2}. Ship: ${t3}.`);
        if (S.flags.trial1 && S.flags.trial2 && !S.flags.gotVoucher) {
          say(S, 'council2', 'Two trials down?! Bort owes me a barrel of nothing.');
          say(S, 'council3', 'Take this voucher to Stanmoore\'s boatyard. It\'s worth one ship, or Stan\'s weight in excuses.');
          addItem(S, 'voucher');
          S.flags.gotVoucher = true;
          S.cutscene = 'vignette1';
        }
        bye(S);
      }],
      ['Just admiring the council-ing.', bye],
    ]);
  },

  shopkeeper(S) {
    say(S, 'shopkeeper', 'Welcome to the Emporium! Browsing is free. Touching is a negotiation.');
    const c = [];
    c.push(['Got any swords?', (S) => {
      say(S, 'shopkeeper', 'Sold out since the tournament was announced. I\'d check any crate on this island marked "no cutlasses inside." Merchants hide inventory like that. Allegedly.');
      bye(S);
    }]);
    c.push(['I need a lime. Medicinally.', (S) => {
      say(S, 'shopkeeper', 'Limes are precious! Anti-scurvy futures are UP. But I\'d trade one for a fresh fish. I have eaten salt beef for nine hundred consecutive days.');
      S.flags.limeDealKnown = true;
      bye(S);
    }]);
    if (has(S, 'fish')) c.push(['One fresh fish, as discussed.', (S) => { doGive(S, 'fish', 'shopkeeper'); bye(S); }]);
    c.push(['What\'s the "DO NOT" jar?', (S) => {
      say(S, 'shopkeeper', 'That jar is why I no longer have a business partner. Next question.');
      bye(S);
    }]);
    c.push(['Good evening, Ezekiel.', bye]);
    dlg(S, c);
  },

  voodoolady(S) {
    if (S.flags.trial2) { say(S, 'voodoolady', 'The elixir hums on your hip, child. Go make the dead uncomfortable.'); return; }
    say(S, 'voodoolady', 'Come in, Moorebrush. Yes, I knew your name. It\'s a small island and a large crystal ball.');
    const c = [];
    c.push(['I need to repel a ghost. A big one.', (S) => {
      say(S, 'voodoolady', 'LeMoore. The root of his power is grog. So we fight root with ROOT: the Root Elixir of Un-Haunting.');
      say(S, 'voodoolady', 'Bring me: one UNRIPE LIME. One WRIGGLING MANDRAKE ROOT. One bottle of GENUINE SEA FOG. And a HAIR OF THE DOG.');
      say(S, 'hero', 'Is that last one literal?');
      say(S, 'voodoolady', 'Everything is literal if you\'re brave enough.');
      S.flags.recipeKnown = true;
      bye(S);
    }]);
    if (S.flags.recipeKnown) c.push(['Recipe status check?', (S) => {
      const need = ['lime', 'root', 'bottledFog', 'dogHair'].filter(i => !S.flags['gave_' + i]);
      if (need.length) say(S, 'voodoolady', 'Still missing: ' + need.map(i => ITEMS[i].name).join(', ') + '.');
      else say(S, 'voodoolady', 'All gathered! Hold your nose.');
      bye(S);
    }]);
    c.push(['What do you know about Moore Island?', (S) => {
      say(S, 'voodoolady', 'Jungle. A hermit who talks to a banjo that isn\'t there. A village of cannibals who went vegetarian for their cholesterol.');
      say(S, 'voodoolady', 'And under it all, a grotto that smells of old boasts. You\'ll do fine. Probably. Don\'t check the ball.');
      bye(S);
    }]);
    c.push(['Blessings on your cauldron.', bye]);
    dlg(S, c);
  },

  butler(S) {
    if (S.flags.mansionAccess) { say(S, 'butler', 'Madame is expecting you. Do try to track less destiny on the carpet.'); return; }
    if (S.flags.wearingHat) {
      say(S, 'butler', 'That HAT. Magnificent. Clearly you are a person of consequence, or at least a person of hat.');
      say(S, 'butler', 'The Governor will see you now.');
      S.flags.mansionAccess = true;
      return;
    }
    say(S, 'butler', 'The mansion receives PERSONS OF QUALITY only. Present: quality.');
    dlg(S, [
      ['I\'m a person of tremendous quality!', (S) => {
        say(S, 'butler', 'Sir is wearing a shirt with a soup memory on it.');
        say(S, 'hero', 'That\'s CHOWDER, and it was this morning, so it\'s FRESH.');
        say(S, 'butler', 'Acquire finery, then we shall speak. A proper hat covers a multitude of chowders.');
        bye(S);
      }],
      ['The Governor NEEDS a ghost hunter!', (S) => {
        say(S, 'butler', 'The Governor needs many things. A hatless chowder-pirate is not on the list.');
        bye(S);
      }],
      ['Good evening to you too.', bye],
    ]);
  },

  governor(S) {
    if (!S.flags.deputized) {
      say(S, 'governor', 'A visitor! Fenwick let you in, so either you\'re important or you\'ve found a truly excellent hat.');
      dlg(S, [
        ['Both. I\'m here about the ghost.', (S) => {
          say(S, 'governor', 'LeMoore took my Percy. My PERCY. That parrot has better manners than the entire Pirate Council.');
          say(S, 'governor', 'Bring him home and end this grogless nightmare, and the post of Governor\'s Ghost-Hunter is yours.');
          say(S, 'governor', 'Here — a badge. Temporary. Unpaid. Gloriously official.');
          addItem(S, 'badge');
          say(S, 'governor', 'And take whatever you need from the garden. Yes, even the mandrake. ESPECIALLY the mandrake. It screams at dawn.');
          S.flags.deputized = true;
          S.flags.gardenPermission = true;
          bye(S);
        }],
        ['Nice perch. Where\'s the bird?', (S) => {
          say(S, 'governor', 'Stolen. By a DEAD MAN. Do you know how embarrassing that is at Governor conferences?');
          bye(S);
        }],
        ['Just admiring the mansion.', bye],
      ]);
      return;
    }
    if (has(S, 'percy')) {
      say(S, 'governor', 'PERCY! Oh, my darling — wait. Finish the job first, hunter. The grog. The GHOST. The paperwork!');
      return;
    }
    say(S, 'governor', S.flags.won ? 'My hero. My HUNTER.' : 'Percy is still out there. So is the grog. Prioritize however you like, but say it\'s the parrot.');
  },

  stan(S) {
    if (S.flags.hasShip) {
      say(S, 'stan', 'How\'s the Moorehen treating you?! Remember: leaks are just windows for water!');
      return;
    }
    say(S, 'stan', 'WELL HELLO THERE! Stan S. Stanmoore, previously-owned vessels, previously-owned PRICES!');
    const c = [];
    if (!S.flags.gotPrybar) c.push(['Tell me about your fine vessels.', (S) => {
      say(S, 'stan', 'Fine? FINE?! These are LEGENDARY vessels! The Barely Floats! The Sea Colander! Names chosen by our legal department for accuracy!');
      say(S, 'stan', 'And because I like your face, here\'s a free promotional Stan-brand pry bar! For prying yourself away from these deals! You can\'t! Nobody can!');
      addItem(S, 'prybar');
      S.flags.gotPrybar = true;
      bye(S);
    }]);
    if (has(S, 'voucher') && !S.flags.voucherGiven) c.push(['The Council sent me. One ship, please.', (S) => { doGive(S, 'voucher', 'stan'); bye(S); }]);
    if (S.flags.voucherGiven && !S.flags.hasShip && has(S, 'poster')) c.push(['About that "advertising consideration"...', (S) => { doGive(S, 'poster', 'stan'); bye(S); }]);
    c.push(['What\'s the catch with these prices?', (S) => {
      say(S, 'stan', 'CATCH? The only catch is the fish you\'ll catch from the DECK of your NEW BOAT! Also there are several catches. They\'re in the contract. The contract is also a catch.');
      bye(S);
    }]);
    c.push(['I need to leave. Physically.', (S) => {
      say(S, 'stan', 'WAIT! Before you go — no? Going? Okay! TELL YOUR FRIENDS! Tell your ENEMIES! Tell ANYONE!');
      bye(S);
    }]);
    dlg(S, c);
  },

  mistress(S) {
    if (S.flags.trial1) { say(S, 'mistress', 'Still the only one to out-talk me. Don\'t let it go to your hat.'); return; }
    say(S, 'mistress', 'Another tournament hopeful. Say something clever or start walking.');
    dlg(S, [
      ['I challenge you, Swordmistress!', (S) => {
        if (S.known.length < 8) {
          say(S, 'mistress', `You know ${S.known.length} comeback${S.known.length === 1 ? '' : 's'}. Come back — pun intended — when you know eight. Go bother the scruffy one downtown.`);
          bye(S); return;
        }
        say(S, 'mistress', 'Eight or more in that little head? Fine. Best of five. Try not to cry on the cliff.');
        bye(S); startDuel(S, 'mistress');
      }],
      ['How did you become Swordmistress?', (S) => {
        say(S, 'mistress', 'I insulted the last Swordmaster so hard he retired to a quiet farm. Dairy. He fights like one now.');
        bye(S);
      }],
      ['Lovely bluff. Great ambience.', bye],
    ]);
  },

  hermit(S) {
    if (S.flags.hermitHelped) { say(S, 'hermit', '"...and THAT\'S the bridge section!" Sorry — me and the banjo are catching up.'); return; }
    say(S, 'hermit', 'A visitor! Sit! Mind the crab, he bites critics.');
    const c = [];
    c.push(['Why so lonely, hermit?', (S) => {
      say(S, 'hermit', 'They took my BANJO. The vegetable people. "Band practice," they said. That was TWO YEARS ago.');
      say(S, 'hermit', 'A hermit without a banjo is just a man too far from town.');
      S.flags.banjoQuestKnown = true;
      bye(S);
    }]);
    if (has(S, 'banjo')) c.push(['I believe this is yours.', (S) => { doGive(S, 'banjo', 'hermit'); bye(S); }]);
    c.push(['Know anything about LeMoore?', (S) => {
      say(S, 'hermit', 'The grotto ghost? Oh, he rehearses insults at night. The acoustics carry. Two of his favorites:');
      say(S, 'hermit', '"Time itself obeys me — I strike between the seconds!" Pfft. A slow-sword taunt in a rush costume. You answer speed with speed of WIT.');
      say(S, 'hermit', 'And "I shall feast upon your soul like a Sunday banquet!" All appetite, no table manners. Ask if he can even hold a fork.');
      if (!S.ghostHints.includes(3)) S.ghostHints.push(3);
      if (!S.ghostHints.includes(4)) S.ghostHints.push(4);
      bye(S);
    }]);
    c.push(['Be well, Morris.', bye]);
    dlg(S, c);
  },

  chief(S) {
    say(S, 'chief', S.flags.banjoTraded
      ? 'The Sauce Era has begun! Tonight: Yam Vindaloo Surprise!'
      : 'Welcome to Broccoli Cove! We are cannibals. Reformed. Vegetarian. It\'s a whole journey.');
    const c = [];
    if (!S.flags.metCannibals) c.push(['Vegetarian... cannibals?', (S) => {
      say(S, 'chief', 'We eat what the person WOULD have eaten. It\'s called ethics.');
      say(S, 'cannibal1', 'Tonight\'s special: Leg of Yam.');
      say(S, 'cannibal2', 'With a side of Finger Limes. They\'re just limes. We\'re working through some branding.');
      say(S, 'chief', 'But the menu grows STALE, traveler. Two years of yams. If you found us something with FIRE in it, we would owe you a sacred debt.');
      S.flags.metCannibals = true;
      bye(S);
    }]);
    if (S.flags.metCannibals && !S.flags.banjoTraded) c.push(['What would a "sacred debt" get me?', (S) => {
      say(S, 'chief', 'Name it. Except the ceremonial mask. And Gary. You can\'t have Gary.');
      say(S, 'hero', 'The hermit\'s banjo?');
      say(S, 'chief', 'The Sacred Banjo?! It... has been two years. And honestly none of us learned to play it. Bring the fire-food and it\'s yours.');
      bye(S);
    }]);
    if (has(S, 'hotSauce')) c.push(['Behold: Scurvy Dog Inferno Sauce.', (S) => { doGive(S, 'hotSauce', 'chief'); bye(S); }]);
    c.push(['Any local hazards I should know?', (S) => {
      say(S, 'chief', 'The tiki door in the rocks — LeMoore\'s grotto. It only opens for the Melody of the Deep. We tried knocking. It ate a spatula.');
      say(S, 'chief', 'And the ghost himself does material at open-mic volume. Two of his bits:');
      say(S, 'chief', '"My spectral stench of doom shall wither your very courage!" Stench, pfft. When something smells, the wind carries it BACK.');
      say(S, 'cannibal1', 'And "I\'ll feed what\'s left of you to the ghost crabs of the abyss!" Crabs are FUSSY eaters, friend. Very high standards.');
      if (!S.ghostHints.includes(0)) S.ghostHints.push(0);
      if (!S.ghostHints.includes(5)) S.ghostHints.push(5);
      bye(S);
    }]);
    c.push(['Compliments to the chefs.', bye]);
    dlg(S, c);
  },

  cannibal1(S) { say(S, 'cannibal1', 'Taste this moss reduction. No, don\'t. It knows what it did.'); },
  cannibal2(S) { say(S, 'cannibal2', 'We used to be terrifying. Now we\'re just terrifyingly under-seasoned.'); },

  ghost1(S) {
    say(S, 'ghost1', S.flags.elixirActive ? 'Ugh. You REEK of root beer and limes. Can\'t even haunt you properly.' : 'Boo.');
    if (!S.flags.elixirActive) say(S, 'hero', 'AAH. Okay. Fair.');
  },
  ghost2(S) { say(S, 'ghost2', 'The captain is in a MOOD. Two hundred years of hoarding grog and no cup holders.'); },

  lemoore(S) {
    if (S.flags.lemooreDefeated) { say(S, 'lemoore', '...'); return; }
    startDuel(S, 'lemoore');
  },

  percy(S) {
    if (has(S, 'percy')) { say(S, 'percy', 'AWK. Sail faster. AWK. Posture.'); return; }
    say(S, 'percy', 'AWK! Nice rescue. VERY SLOW. AWK.');
  },

  dog(S) { say(S, 'dog', 'Woof! (Biscuit accepts your fealty and sheds on it.)'); },
  cat(S) { say(S, 'cat', 'Mrow. (It means no.)'); },
  seagull(S) { say(S, 'seagull', 'SKRAA! (A demand. Everything they say is a demand.)'); },
  council1(S) { TALKS.council(S); },
  council2(S) { TALKS.council(S); },
  council3(S) { TALKS.council(S); },
};

// -------------------------------------------------------------- give logic ----

function doGive(S, item, npc) {
  const key = item + '>' + npc;
  const G = {
    'doubloon>bartender'(S) {
      loseItem(S, 'doubloon');
      S.flags.tabPaid = true;
      addItem(S, 'mug');
      say(S, 'bartender', 'Tab settled! Honor restored. Take the mug to that soggy old barnacle with my compliments and my invoice.');
    },
    'mug>dockmaster'(S) {
      loseItem(S, 'mug');
      S.flags.mugGone = true;
      S.flags.mugReturned = true;
      addItem(S, 'fish');
      say(S, 'dockmaster', 'Me mug! ME MUG! Lad, ye\'ve re-lucked me whole fortnight.');
      say(S, 'dockmaster', 'Here — finest fish o\' the catch. Caught it this evening. It\'s seen things. Haven\'t we all.');
    },
    'fish>shopkeeper'(S) {
      loseItem(S, 'fish');
      addItem(S, 'lime');
      say(S, 'shopkeeper', 'PROTEIN! Real, wet, judgmental protein! The lime is yours. May your gums flourish.');
    },
    'lime>voodoolady'(S) { giveIngredient(S, 'lime'); },
    'root>voodoolady'(S) { giveIngredient(S, 'root'); },
    'bottledFog>voodoolady'(S) { giveIngredient(S, 'bottledFog'); },
    'dogHair>voodoolady'(S) { giveIngredient(S, 'dogHair'); },
    'voucher>stan'(S) {
      loseItem(S, 'voucher');
      S.flags.voucherGiven = true;
      say(S, 'stan', 'A COUNCIL VOUCHER! That covers the boat, the mast, MOST of the boat, and — oh. Hmm. Says nothing about my "advertising consideration."');
      say(S, 'stan', 'Standard clause! I let a boat go, YOUR sail wears MY name. All I need is prime poster space to seal it. Got any... poster?');
    },
    'poster>stan'(S) {
      loseItem(S, 'poster');
      S.flags.hasShip = true;
      say(S, 'stan', 'TOURNAMENT-GRADE POSTER REAL ESTATE! SOLD! The Leaky Moorehen is YOURS! She\'s moored at the dock! The leak is FREE!');
      say(S, 'hero', 'Did I just get a ship for a piece of paper?');
      say(S, 'stan', 'You got a ship for TWO pieces of paper! That\'s Stanonomics!');
      say(S, 'narrator', 'TRIAL THE THIRD: COMPLETE');
      fx(S, 'award');
    },
    'hotSauce>chief'(S) {
      loseItem(S, 'hotSauce');
      S.flags.banjoTraded = true;
      addItem(S, 'banjo');
      say(S, 'chief', 'He tastes a single drop.');
      say(S, 'chief', '...');
      say(S, 'chief', 'I HAVE SEEN THE FIRE AND IT IS DELICIOUS. The Sacred Banjo is yours! GARY! Ring the dinner gourd!');
      say(S, 'cannibal2', 'All hail the Sauce-Bringer!');
    },
    'banjo>hermit'(S) {
      loseItem(S, 'banjo');
      S.flags.hermitHelped = true;
      addItem(S, 'kazoo');
      say(S, 'hermit', 'My... my BANJO. Hello, old girl. Did they feed you? They did NOT tune you.');
      say(S, 'hermit', 'Moorebrush, I owe you a song. This one\'s called the Melody of the Deep — the tune that opens the old tiki door.');
      say(S, 'narrator', 'Morris plays. The jungle goes quiet. Even the crab sways.');
      say(S, 'hermit', 'Take my kazoo — the melody\'s etched right on it. Doo doo dee-doo doo. Don\'t rush the last doo.');
      fx(S, 'melody');
    },
    'percy>governor'(S) {
      say(S, 'governor', 'Not yet! Keep him safe until the ghost is DEALT WITH. He\'s safest with someone LeMoore is actively losing to.');
    },
    'badge>governor'(S) { say(S, 'governor', 'That\'s YOUR badge. Crayon seal and all. Wear it with slightly damp pride.'); },
  };
  if (G[key]) { G[key](S); return true; }
  return false;
}

function giveIngredient(S, item) {
  loseItem(S, item);
  S.flags['gave_' + item] = true;
  const quips = {
    lime: 'A lime with ANGER in it. Perfect.',
    root: 'Ooh, a feisty one. Into the pot — don\'t listen to it beg, that\'s how they get you.',
    bottledFog: 'Genuine fog! You can tell by the attitude.',
    dogHair: 'Hair of the dog that bit precisely nobody. Biscuit is a sweetheart.',
  };
  say(S, 'voodoolady', quips[item]);
  const all = ['lime', 'root', 'bottledFog', 'dogHair'].every(i => S.flags['gave_' + i]);
  if (all) {
    say(S, 'voodoolady', 'And now... we BREW.');
    say(S, 'narrator', 'The cauldron flashes green, then root-beer brown. Somewhere, a ghost shudders.');
    addItem(S, 'elixir');
    S.flags.trial2 = true;
    say(S, 'voodoolady', 'The Root Elixir of Un-Haunting. Drink a swig and no ghost can lay a finger on you. Splash it, and ghost-things turn briefly... solid.');
    say(S, 'narrator', 'TRIAL THE SECOND: COMPLETE');
    fx(S, 'award');
  }
}

// ------------------------------------------------------------ hotspot logic ----

const HOTSPOT_ACTIONS = {
  poster: {
    pickup(S) {
      addItem(S, 'poster');
      hero(S, 'Free poster! The tournament, and 20% off my next existential crisis.');
    },
  },
  crate: {
    open(S) {
      if (S.flags.crateOpen) { hero(S, 'Already pried it. The crate and I have no further business.'); return; }
      hero(S, "Nailed shut tighter than Ezekiel's purse. I'd need to pry it.");
    },
    use(S) { HOTSPOT_ACTIONS.crate.open(S); },
  },
  fogbank: {
    use(S) { hero(S, 'I cup my hands and grab some fog. It files a complaint and leaves.'); },
    pickup(S) { hero(S, 'You can\'t just TAKE fog. You need proper fog infrastructure. A bottle, say.'); },
  },
  grogBarrels: {
    open(S) { hero(S, 'I check the taps. A single molecule of grog waves back. It\'s scared and alone.'); },
  },
  mug: {
    pickup(S) {
      say(S, 'bartender', 'Ah-ah! Shelf of Shame. That mug is collateral until Pegg\'s tab is square: one doubloon.');
      hero(S, 'Held hostage over one doubloon. This town runs on drama.');
    },
  },
  emptyBottle: {
    pickup(S) { addItem(S, 'emptyBottle'); hero(S, 'One empty bottle. Somewhere, a message just lost its ride.'); },
  },
  cookDoor: {
    open(S) { say(S, 'narrator', 'From within: "OUT. SOUP SECRETS." The door remains shut.'); },
  },
  limes: {
    pickup(S) {
      say(S, 'shopkeeper', 'Ap-ap-ap! Limes are an anti-scurvy CONTROLLED SUBSTANCE. Trade only. Fresh fish, remember?');
    },
    open(S) { HOTSPOT_ACTIONS.limes.pickup(S); },
  },
  crackerBarrel: {
    open(S) { hero(S, 'Crumbs and one weevil doing lengths. I\'ll pass.'); },
  },
  shipBell: {
    use(S) { fx(S, 'bell'); say(S, 'shopkeeper', 'You rang? You\'re standing right there. We\'re already talking. The bell is for EMERGENCIES.'); },
    push(S) { HOTSPOT_ACTIONS.shipBell.use(S); },
  },
  anchor: {
    pull(S) { hero(S, 'I pull. My spine files for divorce. The anchor considers it foreplay.'); },
    pickup(S) { hero(S, 'Sure, let me just pocket 300 pounds of iron.'); },
  },
  comb: {
    pickup(S) {
      if (!S.flags.recipeKnown) { say(S, 'voodoolady', 'The comb chooses when it is needed, child. It has not chosen.'); return; }
      addItem(S, 'comb');
      say(S, 'voodoolady', 'Take it. The recipe said hair of the dog, and Biscuit LOVES a good brushing. Everyone knows Biscuit.');
    },
  },
  curtain: {
    open(S) { say(S, 'voodoolady', 'The beads say no, dear. Beads first, questions never.'); },
  },
  mandrakePatch: {
    pickup(S) { hero(S, 'I give a tug. The mandrake tugs BACK. This calls for leverage.'); },
    pull(S) { HOTSPOT_ACTIONS.mandrakePatch.pickup(S); },
    use(S) { HOTSPOT_ACTIONS.mandrakePatch.pickup(S); },
  },
  mansionDoor: {
    open(S) {
      if (S.flags.mansionAccess) return 'exit';
      say(S, 'butler', 'Ahem. The door is for PERSONS OF QUALITY. Perhaps sir would enjoy the fine public street?');
      return null;
    },
  },
  bin: {
    open(S) {
      if (S.flags.binOpened) { hero(S, 'Just flyers for the flyers now.'); return; }
      S.flags.binOpened = true;
      addItem(S, 'plumedHat');
      hero(S, 'A magnificent plumed hat! Lost by a noble, found by destiny. Which is me.');
      say(S, 'stan', 'THE HAT COMES WITH A FREE BIN VISIT! Tell your friends!');
    },
  },
  wheel: {
    use(S) {
      if (!S.flags.sailedOnce) {
        S.flags.sailedOnce = true;
        S.flags.atSea = true;
        S.cutscene = 'sail';
        say(S, 'hero', 'Moore Island, here I come. Percy, hang in there. Grog... also hang in there.');
        travel(S, 'map');
        return;
      }
      S.flags.atSea = true;
      travel(S, 'map');
      hero(S, 'Out to the open chart.');
    },
    pull(S) { HOTSPOT_ACTIONS.wheel.use(S); },
    push(S) { HOTSPOT_ACTIONS.wheel.use(S); },
  },
  shipCannon: {
    use(S) { hero(S, 'No cannonballs. Stan sold "projectile readiness" as an optional package.'); },
    open(S) { hero(S, 'A family of crabs has the deed to the barrel now.'); },
  },
  mapReef: { use(S) { S.flags.atSea = false; travel(S, 'dock', 140, 100, 'r'); hero(S, 'Home sweet Scurvy Reef.'); } },
  mapBeach: { use(S) { S.flags.atSea = false; S.flags.visitedMoore = true; travel(S, 'jungle', 20, 120, 'r'); hero(S, 'Moore Island. Even the dark is greener here.'); } },
  mapGhostShip: {
    use(S) {
      if (!S.flags.elixirActive) {
        say(S, 'narrator', 'As you row close, spectral hands push the boat back out. A voice yawns: "No solicitors."');
        hero(S, 'Right. Ghost-proofing first. Madame Ochre said DRINK the elixir.');
        travel(S, 'map');
        return;
      }
      travel(S, 'ghostdeck', 30, 116, 'r');
      say(S, 'ghost1', 'He\'s... un-hauntable. Gross. Let him through, I\'m not touching that.');
    },
  },
  bananas: {
    pickup(S) { addItem(S, 'banana'); hero(S, 'One banana, straight from the tree. Take THAT, produce economy.'); },
  },
  tikiDoor: {
    open(S) {
      if (S.flags.tikiOpen) return 'exit';
      hero(S, 'I push. I pull. I knock politely. The tiki face looks unimpressed on all three counts.');
      if (!S.flags.hermitHelped) say(S, 'narrator', 'Faint etching below the face: a line of musical notes.');
      else hero(S, 'It wants the Melody of the Deep. Good thing I\'m armed. Kazoo-armed.');
      return null;
    },
  },
  carvings1: {
    lookat(S) {
      say(S, 'narrator', 'The old carvings translate roughly: "I shall drag you down to the crushing dark of the bay!"');
      say(S, 'narrator', 'A later hand adds: "Big talk. All a dunking earns is a bigger splash."');
      if (!S.ghostHints.includes(1)) S.ghostHints.push(1);
      hero(S, 'Ancient heckling. My people have always been here.');
    },
  },
  carvings2: {
    lookat(S) {
      say(S, 'narrator', 'Fresh glowing letters: "My cursed cutlass has bitten a thousand mortal souls!" — draft seven, underlined twice.');
      say(S, 'narrator', 'In the margin, LeMoore\'s own note: "weak to dental humor??"');
      if (!S.ghostHints.includes(2)) S.ghostHints.push(2);
      hero(S, 'He annotates his own weaknesses. Adorable.');
    },
  },
  compassRock: {
    pickup(S) {
      addItem(S, 'compass');
      S.flags.ghostShipFound = true;
      hero(S, 'A spectral compass! The needle strains seaward like a dog who smelled unfinished business.');
      say(S, 'narrator', 'The anchorage of the ghost ship Rootless is now marked on your chart.');
      S.cutscene = 'vignette2';
    },
  },
  grogCrates: {
    open(S) { hero(S, 'Empty. He didn\'t even leave the complimentary hangover.'); },
  },
  pool: {
    lookat(S) { say(S, 'hero', LOOKS.pool); },
    use(S) { hero(S, 'I dip a toe. Something below dips a toe back. We agree to leave it there.'); },
  },
  hatch: {
    open(S) {
      if (!S.flags.elixirActive) {
        say(S, 'ghost2', 'Hatch is CREW ONLY. And you\'re still... squishable.');
        return null;
      }
      S.flags.hatchOpen = true;
      fx(S, 'door');
      say(S, 'ghost2', 'Ugh, fine, root-beer boy. Mind the ectoplasm on rung three.');
      return 'exit';
    },
  },
  ectoBarrel: {
    open(S) { hero(S, 'It\'s full of ectoplasm. It\'s ALL ectoplasm. Even the lid was ectoplasm. My hand regrets me.'); },
  },
  ghostWheel: {
    use(S) { say(S, 'narrator', 'The wheel spins on its own and slaps your hand away. Union ghost.'); },
  },
  cage: {
    open(S) {
      if (S.flags.cageOpen) { hero(S, 'Already open. Percy has moved to my shoulder and to criticism.'); return; }
      if (!S.flags.cageSolid) {
        hero(S, 'My hands pass straight through the spirit-bars. Percy watches me flail. "AWK. TECHNIQUE."');
        hero(S, 'Ghost-things turn solid with a splash of elixir, she said...');
        return;
      }
      S.flags.cageOpen = true;
      fx(S, 'open');
      hero(S, 'The solid latch pops right open. Physics: welcome back, old friend.');
    },
  },
  boneChest: {
    open(S) { hero(S, 'Spare bones. Sorted by mood. I close it gently and forever.'); },
  },
  gate: {
    open(S) { hero(S, 'The gate\'s not the problem. The butler is a door with opinions.'); },
  },
};

// ---------------------------------------------------------- use-with logic ----

const USE_WITH = {
  'prybar crate'(S) {
    if (S.room !== 'dock') return miss(S);
    if (S.flags.crateOpen) { hero(S, 'It\'s open. The crate has given all it has to give.'); return; }
    S.flags.crateOpen = true;
    fx(S, 'open');
    say(S, 'narrator', 'CRACK! The lid surrenders to Stan-brand leverage.');
    addItem(S, 'cutlass'); addItem(S, 'doubloon');
    hero(S, 'A rusty cutlass AND a doubloon! "Absolutely no cutlasses inside," sure. This crate lied to my face.');
  },
  'emptyBottle fogbank'(S) {
    loseItem(S, 'emptyBottle');
    addItem(S, 'bottledFog');
    fx(S, 'pickup');
    say(S, 'narrator', 'You scoop the bottle through the fog bank and cork it fast. The fog inside paces angrily.');
    hero(S, 'One bottle of genuine sea fog. The fog bank looks slightly thinner and deeply offended.');
  },
  'comb dog'(S) {
    if (has(S, 'dogHair')) { hero(S, 'Biscuit is combed to perfection already. Any more and he\'d be legally a cloud.'); return; }
    addItem(S, 'dogHair');
    fx(S, 'pickup');
    say(S, 'narrator', 'Biscuit ROLLS OVER with the enthusiasm of a barrel downhill. One brushing later...');
    hero(S, 'A whole tuft of "hair of the dog." Biscuit rates the experience five tail-wags.');
  },
  'prybar mandrakePatch'(S) {
    if (!S.flags.gardenPermission) {
      say(S, 'butler', '*polite cough at 90 decibels* The GARDEN, sir, belongs to the GOVERNOR.');
      hero(S, 'Fine, fine. Permission first. Chowder-pirates can be civilized.');
      return;
    }
    if (has(S, 'root') || S.flags.gave_root) { hero(S, 'One screaming vegetable is my lifetime limit.'); return; }
    addItem(S, 'root');
    fx(S, 'pickup');
    say(S, 'narrator', 'You lever out a mandrake. It comes free with a tiny outraged "MEEP."');
    hero(S, 'It\'s wriggling. It\'s furious. It\'s perfect.');
  },
  'kazoo tikiDoor'(S) {
    if (!S.flags.hermitHelped) {
      hero(S, 'I don\'t have anything to play a melody WITH. Or, crucially, a melody.');
      return;
    }
    if (S.flags.tikiOpen) { hero(S, 'It\'s already open. An encore seems needy.'); return; }
    S.flags.tikiOpen = true;
    fx(S, 'melody');
    say(S, 'narrator', 'Doo doo dee-doo... doo. The tiki face lights up, mutters "finally, a musician," and grinds open.');
    hero(S, 'The Melody of the Deep, as performed on brass kazoo. The classics survive anything.');
  },
  'elixir cage'(S) {
    if (S.room !== 'ghosthold') return miss(S);
    if (S.flags.cageSolid) { hero(S, 'The cage is as solid as it\'s getting.'); return; }
    S.flags.cageSolid = true;
    fx(S, 'clash');
    say(S, 'narrator', 'You splash a swig of elixir across the spirit-bars. They fizz, sulk, and turn to honest metal.');
    hero(S, 'Solid! Now it\'s just a regular cage with a regular latch and a very impatient parrot.');
    say(S, 'percy', 'AWK. FINALLY. OPEN IT.');
  },
  'elixir lemoore'(S) {
    say(S, 'lemoore', 'Splash ME? I\'m not a CAGE, I\'m a CAPTAIN. We settle this with WORDS, coward!');
  },
  'cutlass cage'(S) { hero(S, 'The blade passes through with a sad little "vwomp." Even my sword is embarrassed.'); },
  'prybar cage'(S) { hero(S, 'The pry bar phases through the spirit-bars. Stan-brand: not rated for the afterlife.'); },
  'prybar hatch'(S) { hero(S, 'It\'s not stuck, it\'s guarded. Different tool. The tool is diplomacy.'); },
  'banana bananaTree'(S) { hero(S, 'Reuniting it with the tree? Kid, you can never go home.'); },
};

function miss(S) { generic(S, 'use'); }

// --------------------------------------------------------------- inventory ----

const ITEM_USE = {
  elixir(S) {
    if (S.flags.elixirActive) { hero(S, 'Already un-hauntable. I taste like root beer and invincibility.'); return; }
    S.flags.elixirActive = true;
    fx(S, 'gulp');
    say(S, 'narrator', 'You take a mighty swig. Your outline goes briefly bold.');
    hero(S, 'WOO. Okay. Ghosts can\'t touch me now. Also I can taste colors. Mostly brown.');
  },
  kazoo(S) { fx(S, 'melody'); hero(S, 'Doo doo dee-doo doo. Beautiful. The nearest door remains unmoved, unless it\'s the right door.'); },
  banjo(S) { hero(S, 'I strum it once. Somewhere, a hermit\'s heart skips. Better deliver this.'); },
  cutlass(S) { hero(S, 'I swish it around menacingly. My shadow applauds.'); },
  banana(S) { hero(S, 'Eat my emergency banana? In THIS economy?'); },
  compass(S) { hero(S, has(S, 'percy') ? 'The needle now points at Percy. It holds grudges quickly.' : 'The needle points out to sea, throbbing with grudge.'); },
  plumedHat(S) {
    if (S.flags.wearingHat) { hero(S, 'The hat is ON. The hat stays on. We are a team now.'); return; }
    S.flags.wearingHat = true;
    fx(S, 'blip');
    say(S, 'narrator', 'You don the plumed hat. Somewhere, a butler feels a disturbance in decorum.');
    hero(S, 'I look like a person of QUALITY. A quality person of quality.');
  },
  badge(S) { hero(S, 'I flash the badge at nobody in particular. Official-ness intensifies.'); },
  mug(S) { hero(S, 'I raise a toast to absent grog. The mug echoes.'); },
  bottledFog(S) { hero(S, 'Uncork it HERE? This fog is a key ingredient, not a mood.'); },
  emptyBottle(S) { hero(S, 'I blow across the top. B-flat. The bottle and I should take this act to a fog bank.'); },
  fish(S) { hero(S, 'The fish and I lock eyes. We agree it\'s destined for greater trades.'); },
  poster(S) { hero(S, 'Quality poster stock. Prime advertising real estate, if you know a desperate advertiser.'); },
  prybar(S) { hero(S, 'I practice my prying stance. Textbook. The textbook is also pried open.'); },
  doubloon(S) { hero(S, 'I flip it. Heads. It\'s always heads. That\'s probably fine.'); },
  percy(S) { say(S, 'percy', 'AWK. Hands off the merchandise.'); },
};

// ------------------------------------------------------------- the verb API ----

// Resolve what an id refers to in the current context.
export function resolve(S, id) {
  if (!id) return null;
  if (S.inv.includes(id)) return { kind: 'item', id };
  const npc = npcsInRoom(S).find(a => a.id === id);
  if (npc) return { kind: 'npc', id };
  const h = findHotspot(S.room, S, id);
  if (h) return { kind: 'hot', id, hot: h };
  return null;
}

export function nameOf(S, id) {
  if (ITEMS[id] && S.inv.includes(id)) return ITEMS[id].name;
  if (NPCS[id]) return NPCS[id].name;
  const h = findHotspot(S.room, S, id);
  return h ? h.name : (ITEMS[id] ? ITEMS[id].name : id);
}

// Perform a verb. Returns true if the action produced a result.
// b is the second object for give/use-with.
export function perform(S, verb, a, b) {
  if (S.won) return false;
  const A = resolve(S, a);
  if (!A) return false;

  // ---- walk / exits
  if (verb === 'walkto' || verb === 'walk') {
    if (A.kind === 'hot' && A.hot.exit) return takeExit(S, A.hot);
    return true;
  }

  // ---- look at
  if (verb === 'lookat') {
    if (A.kind === 'item') { hero(S, ITEMS[a].look); return true; }
    if (A.kind === 'npc') { say(S, 'hero', NPC_LOOKS[a] || 'A person of the sea.'); return true; }
    const act = HOTSPOT_ACTIONS[a];
    if (act && act.lookat) { act.lookat(S); return true; }
    hero(S, LOOKS[a] || GENERIC.lookat[0]);
    return true;
  }

  // ---- talk to
  if (verb === 'talkto') {
    if (A.kind === 'npc' || (A.kind === 'hot' && a === 'council')) {
      const t = TALKS[a] || TALKS[a.replace(/\d$/, '')];
      if (t) { t(S); return true; }
      generic(S, 'talkto'); return true;
    }
    if (A.kind === 'item' && a === 'percy') { TALKS.percy(S); return true; }
    if (A.kind === 'item' && a === 'root') { say(S, 'narrator', 'The mandrake says something unrepeatable about your parentage.'); return true; }
    generic(S, 'talkto');
    return true;
  }

  // ---- give
  if (verb === 'give') {
    if (A.kind !== 'item') { hero(S, "I can only give things I'm carrying."); return true; }
    if (!b) return false;
    const B = resolve(S, b);
    if (!B) return false;
    if (B.kind === 'npc' || b === 'council') {
      if (b === 'council' || b.startsWith('council')) {
        if (a === 'badge') { say(S, 'council1', 'Crayon. Bold. We respect it.'); return true; }
        say(S, 'council2', 'Keep yer trinkets. Bring TRIALS.');
        return true;
      }
      if (doGive(S, a, b)) return true;
      if (tryCombo(S, 'give', a, b)) return true;
      const nm = NPCS[b] ? NPCS[b].name : 'They';
      say(S, 'hero', `I offer the ${ITEMS[a].name}. ${nm} politely declines.`);
      return true;
    }
    if (tryCombo(S, 'give', a, b)) return true;
    hero(S, 'It has no pockets. Or gratitude.');
    return true;
  }

  // ---- use (with)
  if (verb === 'use') {
    if (b) {
      if (!resolve(S, b)) return false;
      const key1 = `${a} ${b}`, key2 = `${b} ${a}`;
      if (USE_WITH[key1]) { USE_WITH[key1](S); return true; }
      if (USE_WITH[key2]) { USE_WITH[key2](S); return true; }
      if (tryCombo(S, 'use', a, b)) return true;
      generic(S, 'use');
      return true;
    }
    if (A.kind === 'item') {
      if (ITEM_USE[a]) { ITEM_USE[a](S); return true; }
      generic(S, 'use');
      return true;
    }
    const act = HOTSPOT_ACTIONS[a];
    if (act && act.use) {
      const r = act.use(S);
      if (r === 'exit' && A.hot && A.hot.exit) return takeExit(S, A.hot, true);
      return true;
    }
    if (A.kind === 'hot' && a === 'moorehen') { travel(S, 'shipDeck', 40, 116, 'r'); hero(S, 'Permission to come aboard myself? Granted.'); return true; }
    if (A.kind === 'npc') { hero(S, 'I try to use them. They decline to be used. HR would side with them.'); return true; }
    generic(S, 'use');
    return true;
  }

  // ---- open / close / push / pull / pickup on hotspots & npcs & items
  const act = A.kind === 'hot' ? HOTSPOT_ACTIONS[a] : null;
  if (verb === 'open' && A.kind === 'hot') {
    if (a === 'moorehen') { travel(S, 'shipDeck', 40, 116, 'r'); hero(S, 'Boarding my own ship. Still not tired of saying "my own ship."'); return true; }
    if (act && act.open) {
      const r = act.open(S);
      if (r === 'exit' && A.hot.exit) return takeExit(S, A.hot, true);
      return true;
    }
    if (A.hot.exit && !A.hot.gated) return takeExit(S, A.hot);
    generic(S, 'open');
    return true;
  }
  if (verb === 'pickup') {
    if (A.kind === 'item') { hero(S, "I've got it. It's in the... look, the pockets are abstract, okay?"); return true; }
    if (A.kind === 'npc') {
      if (a === 'percy') { hero(S, 'Not while the cage stands between us.'); return true; }
      if (a === 'dog') { say(S, 'narrator', 'You lift Biscuit. Biscuit licks your entire face in one motion. You put Biscuit down, changed.'); return true; }
      if (a === 'cat') { hero(S, 'The cat allows a two-second hold, then invoices me.'); return true; }
      if (a === 'seagull') { say(S, 'seagull', 'SKRAA!! (You do not pick up the landlord.)'); return true; }
      hero(S, 'They look heavy. And litigious.');
      return true;
    }
    if (act && act.pickup) { act.pickup(S); return true; }
    generic(S, 'pickup');
    return true;
  }
  for (const v of ['close', 'push', 'pull']) {
    if (verb === v) {
      if (act && act[v]) { act[v](S); return true; }
      if (A.kind === 'npc') {
        if (v === 'push') { hero(S, a === 'stan' ? 'I push Stan. His arms keep waving. It\'s a gyroscope thing.' : 'Shoving people is Tuesday behavior. It is not Tuesday.'); return true; }
        if (v === 'pull') { hero(S, 'I\'m not really a puller of people.'); return true; }
        hero(S, 'They are not a door.');
        return true;
      }
      generic(S, v);
      return true;
    }
  }
  return false;
}

function takeExit(S, hot, force) {
  if (hot.gated && !force) {
    // gated exits route through their open handler
    const act = HOTSPOT_ACTIONS[hot.id];
    if (act && act.open) {
      const r = act.open(S);
      if (r !== 'exit') return true;
    }
  }
  const e = hot.exit;
  travel(S, e.room, e.x, e.y);
  // leaving the hold with Percy triggers the confrontation
  if (S.room === 'ghostdeck' && has(S, 'percy') && !S.flags.lemooreDefeated && !S.flags.lemooreOnDeck) {
    S.flags.lemooreOnDeck = true;
    S.cutscene = 'confront';
    say(S, 'lemoore', 'STOP RIGHT THERE, MORTAL. That is MY hostage, on YOUR shoulder, leaving MY ship.');
    say(S, 'percy', 'AWK. Awkward.');
  }
  return true;
}

// Special: picking up Percy (npc in cage)
export function pickupPercy(S) {
  if (!S.flags.cageOpen) { hero(S, 'Not while the cage stands between us.'); return; }
  if (!has(S, 'percy')) {
    addItem(S, 'percy');
    say(S, 'percy', 'AWK. ADEQUATE RESCUE. Four stars.');
    hero(S, 'Percy hops to my shoulder and immediately starts judging my technique. We\'re bonded now.');
  }
}

// wire percy pickup into the standard verb path
const _perform = perform;
export function doVerb(S, verb, a, b) {
  if (verb === 'pickup' && a === 'percy' && S.room === 'ghosthold') { pickupPercy(S); return true; }
  if ((verb === 'talkto') && a === 'lemoore' && S.flags.lemooreOnDeck && !S.flags.lemooreDefeated && !S.duel) {
    startDuel(S, 'lemoore');
    return true;
  }
  return _perform(S, verb, a, b);
}

export function choose(S, i) {
  const d = S.dialog;
  if (!d || i < 0 || i >= d.choices.length) return false;
  const h = d.handler;
  S.dialog = null;
  h(i);
  return true;
}

// default verb for right-click / double-click
const ITEM_DEF_USE = ['elixir', 'plumedHat', 'kazoo', 'compass'];
export function defaultVerb(S, id) {
  const r = resolve(S, id);
  if (!r) return 'walkto';
  if (r.kind === 'item') return ITEM_DEF_USE.includes(id) ? 'use' : 'lookat';
  if (r.kind === 'npc') return 'talkto';
  return r.hot.def === 'walk' ? 'walkto' : (r.hot.def || 'lookat');
}
