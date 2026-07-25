// voyage.js — the ordered sequence of the Odyssey and its narrative content.
// Each stage is a node on the sea-map. type drives which scene runs.
export const VOYAGE = [
  {
    key: 'cicones', type: 'land', title: 'Ismarus', subtitle: 'City of the Cicones',
    node: { x: 260, y: 1420 },
    intro: "Fresh from fallen Troy the black ships beach at Ismarus. Sack the town — but do not linger, for the Cicones will rally their kinsmen from the hills.",
    battle: { enemy: 'cicone', waves: 2, count: [4, 6], reward: { glory: 120, favor: 8 }, tutorial: true,
      win: 'The town is yours. Take your plunder to the ships before dawn.' },
  },
  {
    key: 'lotus', type: 'island', title: 'The Lotus-Eaters', subtitle: 'Land of the drowsy flower',
    node: { x: 620, y: 1180 },
    intro: "A gentle shore. Your scouts taste the honeyed lotus and forget their home, their ship, their names. They smile and will not leave.",
    choices: [
      { label: 'Drag them back by force', text: "You bind the weeping men beneath the rowing benches and shove off at once.",
        effect: { favor: 6, glory: 40 }, toast: 'Crew saved. Athena approves.' },
      { label: 'Linger and rest a while', text: "The crew feasts on lotus. Some never wake; but the rest are strangely soothed.",
        effect: { crew: -3, hp: 20, glory: 10 }, toast: 'Lost 3 to the lotus; hero rested.' },
    ],
  },
  {
    key: 'cyclops', type: 'cyclops', title: 'The Cave of Polyphemus', subtitle: 'The Cyclops',
    node: { x: 900, y: 1440 },
    intro: "Curiosity leads you into a giant's cave. The boulder rolls shut. Polyphemus devours two men and asks your name. Sharpen the olive stake — wait until he sleeps, then strike the single eye.",
  },
  {
    key: 'laestrygonians', type: 'naval', title: 'The Cannibal Coast', subtitle: 'Laestrygonian raiders',
    node: { x: 1180, y: 1120 },
    intro: "Giant raiders hurl boulders from the cliffs and their galleys swarm the harbor mouth. Ram them, loose your volleys, and break out to open sea.",
    battle: { fleet: 4, reward: { glory: 180, favor: 12 }, win: 'You alone slip the trap and reach the wine-dark deep.' },
  },
  {
    key: 'circe', type: 'island', title: 'Aeaea', subtitle: "Circe's Isle",
    node: { x: 1460, y: 1360 },
    intro: "On Circe's isle your scouts are turned to swine and beasts. With Hermes' herb you resist her wand — but her enchanted beasts still guard the halls.",
    battle: { enemy: 'beast', waves: 2, count: [5, 6], reward: { glory: 160, favor: 10 },
      win: 'Circe yields. She restores your men and sets your course for home — past the Sirens and the strait.' },
    choices: [
      { label: 'Ask the way home', text: "Circe warns of the Sirens, of Scylla and Charybdis, and blesses your voyage.",
        effect: { favor: 14, hp: 30, crew: 2 }, toast: "Circe's blessing: favor and healed crew." },
      { label: 'Feast a year in her halls', text: "A year of ease restores the ship and men, though the gods grow impatient.",
        effect: { hull: 60, crew: 3, favor: -6, glory: 20 }, toast: 'Ship repaired; a year lost.' },
    ],
  },
  {
    key: 'strait', type: 'gauntlet', title: 'The Strait', subtitle: 'Sirens · Scylla · Charybdis',
    node: { x: 1740, y: 1120 },
    intro: "Wax in the oarsmen's ears; lash yourself to the mast. Steer the narrow strait: Charybdis swallows the sea to port, and six-headed Scylla waits to starboard. You cannot pass without loss — choose the lesser grief.",
  },
  {
    key: 'ithaca', type: 'land', title: 'Ithaca', subtitle: 'The Hall of Suitors',
    node: { x: 2020, y: 1380 },
    intro: "Home at last, in beggar's rags. The suitors crowd your hall and court your queen. String the great bow that no other man can bend — and let the reckoning begin.",
    battle: { enemy: 'suitor', waves: 3, count: [5, 6, 7], reward: { glory: 400, favor: 20 }, finale: true,
      win: 'The hall is cleansed. Odysseus is king in Ithaca once more. The Odyssey is complete.' },
  },
];
