// The merchant's wares. Hearts are the currency; spend them on upgrades.

export const SHOP_ITEMS = [
  {
    id: 'hp', name: 'HEALTH VESSEL', desc: '+1 MAX HEALTH', cost: 20,
    max: (g) => g.up.maxHp >= 10,
    buy: (g) => { g.up.maxHp++; g.player.hp = g.up.maxHp; },
  },
  {
    id: 'range', name: 'LONG BOW', desc: 'ARROWS FLY FARTHER', cost: 15,
    max: (g) => g.up.range >= 4,
    buy: (g) => { g.up.range++; },
  },
  {
    id: 'speed', name: 'SWIFT SHAFTS', desc: 'ARROWS FLY FASTER', cost: 15,
    max: (g) => g.up.speed >= 4,
    buy: (g) => { g.up.speed++; },
  },
  {
    id: 'triple', name: 'TRIPLE SHOT', desc: 'LOOSE THREE ARROWS', cost: 40,
    max: (g) => g.up.triple,
    buy: (g) => { g.up.triple = true; },
  },
  {
    id: 'big', name: 'HOLY TIP', desc: 'BIGGER, STRONGER ARROWS', cost: 45,
    max: (g) => g.up.big,
    buy: (g) => { g.up.big = true; },
  },
  {
    id: 'barrier', name: 'ANGEL BARRIER', desc: 'BLOCKS 3 HITS', cost: 25,
    max: () => false,
    buy: (g) => { g.up.barrier += 3; },
  },
  {
    id: 'feather', name: 'CREDIT FEATHER', desc: 'SURVIVE ONE FALL', cost: 30,
    max: (g) => g.up.feather,
    buy: (g) => { g.up.feather = true; },
  },
];
