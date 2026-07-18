// Moore's Booty — sword duel, Pirates! style side-view fencing.
// Pure logic core (headless-testable); rendering lives in main.js/sprites.js.
//
// Mechanics:
//  - stance: 0 high / 1 mid / 2 low (hold up / neutral / hold down)
//  - X attacks in current stance after a telegraphed windup
//  - Z parries in current stance for a short window
//  - a parried attacker is stunned and shoved back; a landed hit shoves the
//    defender back along the deck; step off the end = lose.

export const DECK = 240;      // logical deck length
export const EDGE = 14;       // fall off past this margin
export const REACH = 40;      // strike range
export const PARRY_WIN = 16;  // frames a parry stays active
export const PARRY_CD = 10;   // cooldown after a parry window
export const STUN_PARRIED = 34;
export const STUN_HIT = 12;
export const PUSH_HIT = 20;
export const PUSH_PARRIED = 6;

function rand(d) {
  d.rngS = (d.rngS + 0x6D2B79F5) | 0;
  let t = d.rngS;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function mkFighter(x, dir) {
  return {
    x, dir,            // dir: +1 faces right, -1 faces left
    stance: 1,
    windup: 0,         // frames until strike lands (attack telegraph)
    windupLen: 0,
    attackStance: 1,
    parryStance: 1,    // latched when the parry is raised
    strike: 0,         // frames of visible lunge after strike resolves
    parry: 0,          // active parry frames
    parryCd: 0,
    stun: 0,
    hurt: 0,           // flash timer
  };
}

// opts: { eSkill 0..1 parry chance, eSpeed windup multiplier (bigger=faster),
//         pWindup player windup frames, aggro attacks/second-ish, seed,
//         scriptedEnemy: if true the AI never acts on its own (tests drive it) }
export function createDuel(opts = {}) {
  const d = {
    p: mkFighter(80, 1),
    e: mkFighter(DECK - 80, -1),
    t: 0,
    winner: null,     // 'player' | 'enemy'
    rngS: (opts.seed ?? 99) | 0,
    eSkill: opts.eSkill ?? 0.45,
    eWindup: Math.max(12, Math.round(26 / (opts.eSpeed ?? 0.85))),
    pWindup: opts.pWindup ?? 20,
    pReach: REACH + (opts.fineSword ? 8 : 0),
    aggro: opts.aggro ?? 0.022,   // per-frame chance the AI starts an attack
    scriptedEnemy: !!opts.scriptedEnemy,
    aiTimer: 30,
    events: [],       // per-step: 'clang','hit','swish' — for sfx
  };
  return d;
}

function stanceFrom(inp) {
  if (inp.up) return 0;
  if (inp.down) return 2;
  return 1;
}

function dist(d) { return Math.abs(d.p.x - d.e.x); }

// resolve one fighter's attack landing against the defender
function resolveStrike(d, atk, def, reach) {
  if (Math.abs(atk.x - def.x) > reach) { d.events.push('swish'); return; }
  if (def.parry > 0 && def.parryStance === atk.attackStance) {
    // parried! attacker reels
    atk.stun = STUN_PARRIED;
    atk.x -= atk.dir * PUSH_PARRIED;
    d.events.push('clang');
  } else {
    def.x += atk.dir * PUSH_HIT;
    def.stun = STUN_HIT;
    def.hurt = 14;
    def.parry = 0;
    d.events.push('hit');
  }
}

function stepFighter(d, f, foe, inp, windupLen, reach) {
  if (f.stun > 0) { f.stun--; return; }
  f.stance = stanceFrom(inp);
  if (f.parryCd > 0) f.parryCd--;
  if (f.parry > 0) f.parry--;
  if (f.strike > 0) f.strike--;

  if (f.windup > 0) {
    f.windup--;
    if (f.windup === 0) {
      f.strike = 10;
      resolveStrike(d, f, foe, reach);
    }
    return; // committed: no walking or parrying mid-swing
  }

  if (inp.attack) {
    f.windup = windupLen;
    f.windupLen = windupLen;
    f.attackStance = f.stance;
  } else if (inp.parry && f.parryCd === 0) {
    f.parry = PARRY_WIN;
    f.parryCd = PARRY_WIN + PARRY_CD;
    f.parryStance = f.stance;
  } else {
    if (inp.left) f.x -= 1.4;
    if (inp.right) f.x += 1.4;
  }
}

// simple telegraphing AI: picks a stance, waits, lunges; parries what it reads
function enemyAI(d) {
  const e = d.e, p = d.p;
  const inp = { up: false, down: false, left: false, right: false, attack: false, parry: false };
  if (e.stun > 0 || e.windup > 0) return inp;

  // read the player's telegraph and try to parry it
  if (p.windup > 0 && p.windup < 12 && dist(d) < d.pReach + 12 && e.parryCd === 0) {
    if (rand(d) < d.eSkill) {
      if (p.attackStance === 0) inp.up = true;
      else if (p.attackStance === 2) inp.down = true;
      inp.parry = true;
      return inp;
    }
  }

  // close distance
  if (dist(d) > REACH - 6) {
    if (e.x > p.x) inp.left = true; else inp.right = true;
  }
  // don't get backed off the deck: push forward harder near the edge
  const nearEdge = (e.dir === -1 && e.x > DECK - EDGE - 30) || (e.dir === 1 && e.x < EDGE + 30);

  d.aiTimer--;
  if ((d.aiTimer <= 0 || nearEdge) && dist(d) < REACH + 14) {
    const r = rand(d);
    inp.up = r < 0.33;
    inp.down = r >= 0.66;
    inp.attack = true;
    d.aiTimer = Math.round(30 + rand(d) * 70);
  }
  return inp;
}

// one 60fps step. pin = player input {up,down,left,right,attack,parry}
// ein = optional scripted enemy input (tests / cutscenes)
export function stepDuel(d, pin, ein = null) {
  if (d.winner) return d.winner;
  d.t++;
  d.events = [];
  const einp = ein || (d.scriptedEnemy ? { up: 0, down: 0, left: 0, right: 0, attack: 0, parry: 0 } : enemyAI(d));

  stepFighter(d, d.p, d.e, pin, d.pWindup, d.pReach);
  stepFighter(d, d.e, d.p, einp, d.eWindup, REACH);

  if (d.p.hurt > 0) d.p.hurt--;
  if (d.e.hurt > 0) d.e.hurt--;

  // keep them from walking through each other
  if (d.e.x - d.p.x < 16 && d.p.x < d.e.x) {
    const mid = (d.p.x + d.e.x) / 2;
    d.p.x = mid - 8; d.e.x = mid + 8;
  }

  if (d.p.x < EDGE || d.p.x > DECK - EDGE) d.winner = 'enemy';
  else if (d.e.x < EDGE || d.e.x > DECK - EDGE) d.winner = 'player';
  return d.winner;
}

// Headless convenience: run a whole duel with strategy callbacks.
// pStrat/eStrat: (d) => input. Returns winner or 'draw' after maxT.
export function runDuel(d, pStrat, eStrat = null, maxT = 60 * 120) {
  while (!d.winner && d.t < maxT) {
    const pin = pStrat(d);
    const ein = eStrat ? eStrat(d) : null;
    stepDuel(d, pin, ein);
  }
  return d.winner || 'draw';
}

// The classic counter-fencer: parry every telegraphed attack in its stance,
// then punish the stun with a mid attack. Used by tests.
export function perfectParryStrategy(d) {
  const inp = { up: false, down: false, left: false, right: false, attack: false, parry: false };
  const e = d.e, p = d.p;
  if (p.windup > 0) return inp; // committed
  if (e.windup > 0 && e.windup <= PARRY_WIN - 2 && p.parryCd === 0) {
    if (e.attackStance === 0) inp.up = true;
    else if (e.attackStance === 2) inp.down = true;
    inp.parry = true;
    return inp;
  }
  if (e.stun > d.pWindup + 2) {
    if (Math.abs(p.x - e.x) <= d.pReach - 4) { inp.attack = true; return inp; }
    if (p.x < e.x) inp.right = true; else inp.left = true;
    return inp;
  }
  // hold ground just inside reach, ready to parry
  if (Math.abs(p.x - e.x) > REACH + 6) { if (p.x < e.x) inp.right = true; else inp.left = true; }
  return inp;
}

// A scripted brute that only ever attacks mid as fast as it can.
export function bruteStrategy(d) {
  const inp = { up: false, down: false, left: false, right: false, attack: false, parry: false };
  const e = d.e;
  if (e.stun > 0 || e.windup > 0) return inp;
  if (Math.abs(d.p.x - e.x) > REACH - 4) { if (e.x > d.p.x) inp.left = true; else inp.right = true; return inp; }
  inp.attack = true;
  return inp;
}
