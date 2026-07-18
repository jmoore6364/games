// Speedmoore 2 — league: 8 teams, single round-robin (7 rounds), prize money,
// persistent team upgrades. Headless-safe: localStorage is optional.

import { simulate } from './match.js';

export const TEAMS = [
  { name: 'Brutal Moore Deluxe', short: 'MOO', human: true, tier: 'human',
    colors: { main: '#58b0e8', dark: '#2858a0', trim: '#e8e8f0' },
    stats: { attack: 0, defence: 0, speed: 0, armor: 0 } },
  { name: 'Steel Fury', short: 'STF', tier: 'hard',
    colors: { main: '#b8b8c8', dark: '#585868', trim: '#f8d838' },
    stats: { attack: 2, defence: 2, speed: 1, armor: 2 } },
  { name: 'Turbo Hammers', short: 'TUR', tier: 'medium',
    colors: { main: '#e8a020', dark: '#905810', trim: '#181818' },
    stats: { attack: 1, defence: 1, speed: 3, armor: 0 } },
  { name: 'Violent Moore', short: 'VIO', tier: 'hard',
    colors: { main: '#d02888', dark: '#701048', trim: '#f0f0f0' },
    stats: { attack: 3, defence: 1, speed: 1, armor: 2 } },
  { name: 'Super Mashwan', short: 'MSH', tier: 'hard',
    colors: { main: '#38c860', dark: '#187030', trim: '#f8d838' },
    stats: { attack: 2, defence: 2, speed: 2, armor: 1 } },
  { name: 'Mean Machine', short: 'MMC', tier: 'medium',
    colors: { main: '#c83028', dark: '#701410', trim: '#c8c8d0' },
    stats: { attack: 2, defence: 0, speed: 0, armor: 3 } },
  { name: 'Raw Moosiahs', short: 'RAW', tier: 'medium',
    colors: { main: '#8858d8', dark: '#402878', trim: '#e8e8f0' },
    stats: { attack: 1, defence: 2, speed: 1, armor: 1 } },
  { name: 'Explosive Lads', short: 'EXP', tier: 'easy',
    colors: { main: '#d8d848', dark: '#787810', trim: '#c02818' },
    stats: { attack: 1, defence: 0, speed: 1, armor: 0 } },
];

export const UPGRADES = [
  { key: 'attack', label: 'ATTACK', desc: 'harder throws + hits' },
  { key: 'defence', label: 'DEFENCE', desc: 'better marking AI' },
  { key: 'speed', label: 'SPEED', desc: 'faster squad' },
  { key: 'armor', label: 'ARMOR', desc: 'shrug off tackles' },
];
export const UPGRADE_MAX = 4;
export const upgradeCost = (level) => 15 + level * 15;

// Single round-robin via the circle method: 7 rounds x 4 matches of [a, b].
export function genFixtures() {
  const n = TEAMS.length;
  const ids = Array.from({ length: n }, (_, i) => i);
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const ms = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i], b = ids[n - 1 - i];
      ms.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(ms);
    ids.splice(1, 0, ids.pop()); // rotate all but the first
  }
  return rounds;
}

export function newLeague() {
  return {
    round: 0,                       // next round index to play (0..6, 7 = done)
    money: 20,
    upgrades: { attack: 0, defence: 0, speed: 0, armor: 0 },
    table: TEAMS.map(() => ({ p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, pts: 0 })),
    history: [],                    // one line per played player-match
    champion: -1,
  };
}

export function playerStats(lg) {
  const u = lg.upgrades;
  return { attack: u.attack, defence: u.defence, speed: u.speed, armor: u.armor };
}

// Opponent for the human team in the current round; null if league over.
export function playerFixture(lg) {
  if (lg.round >= 7) return null;
  const round = genFixtures()[lg.round];
  for (const [a, b] of round) {
    if (a === 0) return { opponent: b, home: true };
    if (b === 0) return { opponent: a, home: false };
  }
  return null;
}

function applyResult(lg, a, b, sa, sb) {
  const ta = lg.table[a], tb = lg.table[b];
  ta.p++; tb.p++;
  ta.f += sa; ta.a += sb;
  tb.f += sb; tb.a += sa;
  if (sa > sb) { ta.w++; tb.l++; ta.pts += 2; }
  else if (sb > sa) { tb.w++; ta.l++; tb.pts += 2; }
  else { ta.d++; tb.d++; ta.pts++; tb.pts++; }
}

// Advance the league one round given the human match outcome.
// playerResult: { score:[us, them], knockdowns:[us, them], coins }
export function advanceRound(lg, playerResult) {
  if (lg.round >= 7) return null;
  const fixtures = genFixtures()[lg.round];
  const fx = playerFixture(lg);
  const [us, them] = playerResult.score;

  applyResult(lg, 0, fx.opponent, us, them);

  // remaining AI fixtures: real engine, shortened halves for speed
  const seedBase = (lg.round + 1) * 7919;
  for (const [a, b] of fixtures) {
    if (a === 0 || b === 0) continue;
    const m = simulate(
      { name: TEAMS[a].short, stats: TEAMS[a].stats, difficulty: TEAMS[a].tier },
      { name: TEAMS[b].short, stats: TEAMS[b].stats, difficulty: TEAMS[b].tier },
      seedBase + a * 131 + b * 17,
      30,
    );
    const r = m.result();
    applyResult(lg, a, b, r.score[0] * 3, r.score[1] * 3); // scale 60s sim to full-match figures
  }

  // prize money: result + aggression bonus + coins scooped mid-match
  const base = us > them ? 20 : us === them ? 12 : 6;
  const aggro = Math.floor(playerResult.knockdowns[0] / 3);
  const earned = base + aggro + (playerResult.coins || 0);
  lg.money += earned;
  lg.history.push({ round: lg.round, vs: fx.opponent, us, them, earned });
  lg.round++;

  if (lg.round >= 7) lg.champion = tableOrder(lg)[0];
  return { earned, base, aggro, coins: playerResult.coins || 0 };
}

// Team indices sorted by league position.
export function tableOrder(lg) {
  return TEAMS.map((_, i) => i).sort((a, b) => {
    const ta = lg.table[a], tb = lg.table[b];
    return (tb.pts - ta.pts) || ((tb.f - tb.a) - (ta.f - ta.a)) || (tb.f - ta.f) || (a - b);
  });
}

export function buyUpgrade(lg, key) {
  const lvl = lg.upgrades[key];
  if (lvl === undefined || lvl >= UPGRADE_MAX) return false;
  const cost = upgradeCost(lvl);
  if (lg.money < cost) return false;
  lg.money -= cost;
  lg.upgrades[key] = lvl + 1;
  return true;
}

// ---- persistence (guarded so match/league run headless in Node) ----
const KEY = 'speedmoore2.league';
const hasStorage = () => {
  try { return typeof localStorage !== 'undefined' && localStorage !== null; }
  catch { return false; }
};

export function saveLeague(lg) {
  if (!hasStorage()) return;
  try { localStorage.setItem(KEY, JSON.stringify(lg)); } catch { /* full/blocked */ }
}

export function loadLeague() {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const lg = JSON.parse(raw);
    if (!lg || !Array.isArray(lg.table) || lg.table.length !== TEAMS.length) return null;
    return lg;
  } catch { return null; }
}

export function clearLeague() {
  if (hasStorage()) { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
}
