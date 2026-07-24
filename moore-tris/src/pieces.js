// Tetromino definitions, rotation states (SRS), colors, wall kicks, and a 7-bag randomizer.
// Grid convention: x increases right, y increases DOWNWARD. Kick tables below are
// already expressed in this y-down convention.

// Each piece has: a base color, a bounding-box size, and 4 rotation states.
// A state is a list of [x, y] occupied cells within the bounding box.
export const PIECES = {
  I: {
    color: '#31c7ef',
    size: 4,
    states: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
  },
  O: {
    color: '#f7d308',
    size: 2,
    states: [
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
    ],
  },
  T: {
    color: '#ad4d9c',
    size: 3,
    states: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  S: {
    color: '#42b642',
    size: 3,
    states: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  Z: {
    color: '#ef2029',
    size: 3,
    states: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
  },
  J: {
    color: '#3155ef',
    size: 3,
    states: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
  },
  L: {
    color: '#ef8f1f',
    size: 3,
    states: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  },
};

export const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Wall-kick offset tables (y-down). Key is `${from}${to}` rotation index.
export const KICKS = {
  JLSTZ: {
    '01': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '10': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '12': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '21': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '23': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '32': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '30': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '03': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  },
  I: {
    '01': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '10': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '12': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '21': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '23': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '32': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '30': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '03': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  },
  O: {
    '01': [[0, 0]], '10': [[0, 0]], '12': [[0, 0]], '21': [[0, 0]],
    '23': [[0, 0]], '32': [[0, 0]], '30': [[0, 0]], '03': [[0, 0]],
  },
};

export function kicksFor(type, from, to) {
  const table = type === 'I' ? KICKS.I : type === 'O' ? KICKS.O : KICKS.JLSTZ;
  return table[`${from}${to}`] || [[0, 0]];
}

// 7-bag randomizer: yields all 7 types in random order, then refills.
export function createBag() {
  let bag = [];
  const refill = () => {
    bag = TYPES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  };
  return {
    next() {
      if (bag.length === 0) refill();
      return bag.shift();
    },
  };
}

// Spawn column so the piece appears centered near the top of a 10-wide well.
export function spawnX(type) {
  return type === 'I' || type === 'O' ? 3 : 3;
}
