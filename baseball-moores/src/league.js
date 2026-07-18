// Baseball Moores — team generation, money/shop, league season, persistence.
// Headless-safe (localStorage optional). Teams store players as a flat array
// plus index lists for lineup/rotation so they serialize cleanly.

import { simGame, makeRNG } from './sim.js';

// ---------------------------------------------------------------------
//  NAMES
// ---------------------------------------------------------------------
const FIRST = ['Moe', 'Buck', 'Cal', 'Rex', 'Gus', 'Hank', 'Duke', 'Sal', 'Vic',
  'Ace', 'Pep', 'Zeke', 'Dutch', 'Chip', 'Rocky', 'Biff', 'Lou', 'Curt', 'Ray', 'Deke',
  'Moose', 'Skip', 'Boog', 'Tank', 'Nub', 'Fitz', 'Wally', 'Jitters'];
const LAST = ['Moore', 'Slugg', 'Bunt', 'Diaz', 'Kowalski', 'Grum', 'Fielder', 'Homer',
  'Dinger', 'Steele', 'Batts', 'Palmer', 'Rusk', 'Voss', 'Kline', 'Rhodes', 'Fox',
  'Buckner', 'Crank', 'Whiff', 'Gomez', 'Otter', 'Pyle', 'Brady', 'Nunn', 'Quist'];

function pickName(rng, used) {
  for (let t = 0; t < 40; t++) {
    const n = `${FIRST[(rng() * FIRST.length) | 0]} ${LAST[(rng() * LAST.length) | 0]}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
  const n = `Player ${used.size + 1}`; used.add(n); return n;
}

// ---------------------------------------------------------------------
//  PLAYER / TEAM GENERATION
// ---------------------------------------------------------------------
export const FIELD_POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rstat = (rng, base, spread = 1.6) =>
  clamp(Math.round(base + (rng() - 0.5) * 2 * spread), 1, 10);

function genBatter(rng, pos, base, used) {
  return {
    name: pickName(rng, used), pos, kind: 'bat',
    bat: {
      power: rstat(rng, base + (pos === '1B' || pos === 'LF' || pos === 'RF' ? 0.8 : 0)),
      contact: rstat(rng, base),
      speed: rstat(rng, base + (pos === 'CF' || pos === 'SS' || pos === '2B' ? 0.8 : 0)),
      defense: rstat(rng, base + (pos === 'SS' || pos === 'C' || pos === 'CF' ? 0.8 : 0)),
    },
  };
}
function genPitcher(rng, base, used) {
  return {
    name: pickName(rng, used), pos: 'P', kind: 'pit',
    bat: { power: rstat(rng, 2, 1), contact: rstat(rng, 2, 1), speed: rstat(rng, 3), defense: rstat(rng, 4) },
    pit: {
      velo: rstat(rng, base), curve: rstat(rng, base),
      stamina: rstat(rng, base), control: rstat(rng, base),
    },
  };
}

// Build a full 14-man roster: 8 fielders, 4 pitchers, 2 bench bats.
export function genRoster(rng, base) {
  const used = new Set();
  const players = [];
  for (const pos of FIELD_POS) players.push(genBatter(rng, pos, base, used));      // 0..7
  for (let i = 0; i < 4; i++) players.push(genPitcher(rng, base, used));            // 8..11
  players.push(genBatter(rng, 'DH', base, used));                                   // 12 bench
  players.push(genBatter(rng, 'DH', base - 0.5, used));                             // 13 bench
  return players;
}

// default lineup: 8 fielders + best bench bat as DH (9 batters), rotation = 4 P.
export function defaultLineup(players) {
  const bench = [12, 13];
  const dh = bench.sort((a, b) => batRating(players[b]) - batRating(players[a]))[0];
  return [0, 1, 2, 3, 4, 5, 6, 7, dh];
}
export function batRating(p) {
  const b = p.bat; return b.power + b.contact + b.speed + b.defense;
}
export function pitRating(p) {
  const s = p.pit; return s.velo + s.curve + s.stamina + s.control;
}

export function makeTeam(def, rng) {
  const players = genRoster(rng, def.base);
  const lineupIdx = defaultLineup(players);
  // rotation: 4 pitchers sorted best-first
  const rotationIdx = [8, 9, 10, 11].sort((a, b) => pitRating(players[b]) - pitRating(players[a]));
  const t = {
    name: def.name, short: def.short, colors: def.colors, tier: def.tier,
    isUser: !!def.isUser, players, lineupIdx, rotationIdx,
  };
  hydrate(t);
  return t;
}

// attach object refs for the sim engine
export function hydrate(t) {
  t.lineup = t.lineupIdx.map((i) => t.players[i]);
  t.rotation = t.rotationIdx.map((i) => t.players[i]);
  return t;
}

// ---------------------------------------------------------------------
//  CPU TEAM DEFINITIONS (6 rivals, ascending strength)
// ---------------------------------------------------------------------
export const CPU_DEFS = [
  { name: 'Moore City Sandlots', short: 'SAN', tier: 1, base: 3.4,
    colors: { main: '#8a9a6a', dark: '#4a5a30', trim: '#e8e8d0' } },
  { name: 'Bunt Cake Bakers', short: 'BAK', tier: 2, base: 4.2,
    colors: { main: '#e88ab0', dark: '#a03860', trim: '#fff0d8' } },
  { name: 'Screwball Scallywags', short: 'SCA', tier: 3, base: 5.0,
    colors: { main: '#d86828', dark: '#803010', trim: '#f8d060' } },
  { name: 'Amoorican Dreams', short: 'DRM', tier: 4, base: 5.8,
    colors: { main: '#3868d8', dark: '#183080', trim: '#f0f0f8' } },
  { name: 'Lovely Moores', short: 'LOV', tier: 5, base: 6.6,
    colors: { main: '#c838b8', dark: '#701068', trim: '#f8e0f8' } },
  { name: 'Ghost Moores', short: 'GHO', tier: 6, base: 7.6,
    colors: { main: '#c8c8e0', dark: '#484860', trim: '#a0f0d0' } },
];

export const LOGOS = ['star', 'ball', 'bolt', 'crown', 'skull', 'flame', 'diamond', 'moon'];
export const COLOR_CHOICES = [
  { main: '#d83838', dark: '#801818', trim: '#f8e0a0' },
  { main: '#3868d8', dark: '#183080', trim: '#f0f0f8' },
  { main: '#38b048', dark: '#186020', trim: '#f8f8d0' },
  { main: '#e8a020', dark: '#905810', trim: '#181820' },
  { main: '#9838d8', dark: '#501080', trim: '#f0e0f8' },
  { main: '#20b0b8', dark: '#106068', trim: '#f8f0d0' },
  { main: '#e85898', dark: '#a01858', trim: '#fff0f8' },
  { main: '#404048', dark: '#181820', trim: '#e85030' },
];

// user team from creation choices
export function makeUserTeam(name, colorIdx, logoIdx, rng) {
  const def = {
    name: name || 'My Moores', short: (name || 'MOO').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'MOO',
    tier: 3, base: 4.8, isUser: true, colors: COLOR_CHOICES[colorIdx % COLOR_CHOICES.length],
  };
  const t = makeTeam(def, rng);
  t.logo = LOGOS[logoIdx % LOGOS.length];
  return t;
}

// ---------------------------------------------------------------------
//  SHOP: training + prospects
// ---------------------------------------------------------------------
export function trainCost(player, statKey) {
  const val = player.kind === 'pit' && player.pit[statKey] !== undefined
    ? player.pit[statKey] : player.bat[statKey];
  return 15 + val * 12;
}
export function train(lg, playerRef, statKey) {
  const p = playerRef;
  const grp = (p.kind === 'pit' && p.pit[statKey] !== undefined) ? p.pit : p.bat;
  if (grp[statKey] === undefined || grp[statKey] >= 10) return false;
  const cost = trainCost(p, statKey);
  if (lg.money < cost) return false;
  lg.money -= cost;
  grp[statKey] += 1;
  return true;
}

export const PROSPECT_TIERS = [
  { key: 'rookie', label: 'ROOKIE', base: 4.0, cost: 60 },
  { key: 'veteran', label: 'VETERAN', base: 6.0, cost: 170 },
  { key: 'star', label: 'ALL-STAR', base: 8.0, cost: 400 },
];

// generate a prospect of a tier for a given role ('bat' or 'pit')
export function genProspect(rng, tierKey, role, pos) {
  const t = PROSPECT_TIERS.find((x) => x.key === tierKey) || PROSPECT_TIERS[0];
  const used = new Set();
  return role === 'pit' ? genPitcher(rng, t.base, used) : genBatter(rng, pos || 'DH', t.base, used);
}

// replace a roster slot index with a new player, keeping lineup/rotation valid
export function buyProspect(lg, slotIdx, prospect, tierKey) {
  const t = lg.userTeam;
  const cost = (PROSPECT_TIERS.find((x) => x.key === tierKey) || PROSPECT_TIERS[0]).cost;
  if (lg.money < cost) return false;
  lg.money -= cost;
  prospect.pos = t.players[slotIdx].pos; // inherit slot position
  t.players[slotIdx] = prospect;
  hydrate(t);
  return true;
}

// ---------------------------------------------------------------------
//  LEAGUE / SEASON
// ---------------------------------------------------------------------
const SEASON_GAMES = 15;

// team list for a league: index 0 = user, 1..6 = CPU
export function buildTeams(userTeam, rng) {
  const teams = [userTeam];
  for (const def of CPU_DEFS) teams.push(makeTeam(def, rng));
  return teams;
}

function emptyStandRow() { return { w: 0, l: 0, rf: 0, ra: 0 }; }

export function newLeague(userTeam, seed = Date.now()) {
  const rng = makeRNG(seed >>> 0);
  const teams = buildTeams(userTeam, rng);
  const schedule = [];
  for (let i = 0; i < SEASON_GAMES; i++) schedule.push(1 + (i % 6)); // opponent index
  return {
    seed: seed >>> 0,
    season: 1,
    money: 120,
    round: 0, // next game to play (0..14), 15 = regular season done
    teams,
    userTeam,
    schedule,
    standings: teams.map(emptyStandRow),
    stats: teams.map(() => ({ bat: {}, pit: {} })),
    champStage: 0, // 0 none, 1 in-series, 2 done
    champSeries: null, // { opp, wins:[u, o], games:[] }
    champion: -1,
    lastResult: null,
    history: [],
  };
}

export function nextOpponent(lg) {
  if (lg.round >= SEASON_GAMES) return -1;
  return lg.schedule[lg.round];
}

// accumulate a completed game's box score into season stats
export function accumulateStats(lg, teamIdx, box, isPitcherWin) {
  const s = lg.stats[teamIdx];
  for (const b of box.bat) {
    const line = s.bat[b.name] || (s.bat[b.name] = { ab: 0, h: 0, hr: 0, r: 0, rbi: 0, bb: 0, so: 0, d: 0, t: 0 });
    line.ab += b.ab; line.h += b.h; line.hr += b.hr; line.r += b.r;
    line.rbi += b.rbi; line.bb += b.bb; line.so += b.so; line.d += b.d; line.t += b.t;
  }
  for (const p of box.pit) {
    const line = s.pit[p.name] || (s.pit[p.name] = { outs: 0, r: 0, k: 0, bb: 0, w: 0, l: 0, hr: 0 });
    line.outs += p.outs; line.r += p.r; line.k += p.k; line.bb += p.bb; line.hr += p.hr;
  }
  if (isPitcherWin != null) {
    const starter = box.pit[0];
    const line = s.pit[starter.name] || (s.pit[starter.name] = { outs: 0, r: 0, k: 0, bb: 0, w: 0, l: 0, hr: 0 });
    if (isPitcherWin) line.w++; else line.l++;
  }
}

function applyStanding(lg, aIdx, bIdx, res) {
  const sa = lg.standings[aIdx], sb = lg.standings[bIdx];
  sa.rf += res.score[0]; sa.ra += res.score[1];
  sb.rf += res.score[1]; sb.ra += res.score[0];
  if (res.winner === 0) { sa.w++; sb.l++; }
  else { sb.w++; sa.l++; }
}

// Simulate one CPU-vs-CPU game and fold it into standings + stats.
function simAndRecord(lg, aIdx, bIdx, seed) {
  const res = simGame(lg.teams[aIdx], lg.teams[bIdx], seed);
  applyStanding(lg, aIdx, bIdx, res);
  accumulateStats(lg, aIdx, res.box[0], res.winner === 0);
  accumulateStats(lg, bIdx, res.box[1], res.winner === 1);
  return res;
}

// Advance the season by one round. `userResult` is the finished GameState result
// for the human game (score + box); if null, the user game is simulated too.
export function advanceRound(lg, userResult) {
  if (lg.round >= SEASON_GAMES) return null;
  const opp = lg.schedule[lg.round];
  const seedBase = (lg.seed ^ ((lg.round + 1) * 2654435761)) >>> 0;

  let uRes = userResult;
  if (!uRes) uRes = simGame(lg.teams[0], lg.teams[opp], seedBase);
  applyStanding(lg, 0, opp, uRes);
  accumulateStats(lg, 0, uRes.box[0], uRes.winner === 0);
  accumulateStats(lg, opp, uRes.box[1], uRes.winner === 1);

  // prize money for the user
  const won = uRes.winner === 0;
  const oppTier = lg.teams[opp].tier;
  const earned = won ? (24 + oppTier * 9) : 8;
  lg.money += earned;

  // remaining CPU teams play among themselves
  const rest = [1, 2, 3, 4, 5, 6].filter((i) => i !== opp);
  // rotate a bye based on round so each team byes roughly evenly
  const bye = rest[lg.round % rest.length];
  const playing = rest.filter((i) => i !== bye);
  for (let i = 0; i + 1 < playing.length; i += 2) {
    simAndRecord(lg, playing[i], playing[i + 1], (seedBase + i * 97 + 13) >>> 0);
  }

  lg.lastResult = { opp, us: uRes.score[0], them: uRes.score[1], won, earned };
  lg.history.push(lg.lastResult);
  lg.round++;
  if (lg.round >= SEASON_GAMES) setupChampionship(lg);
  return lg.lastResult;
}

export function standingsOrder(lg) {
  return lg.teams.map((_, i) => i).sort((a, b) => {
    const sa = lg.standings[a], sb = lg.standings[b];
    const pa = sa.w - sa.l, pb = sb.w - sb.l;
    return (sb.w - sa.w) || (pb - pa) || ((sb.rf - sb.ra) - (sa.rf - sa.ra)) || (a - b);
  });
}

function setupChampionship(lg) {
  const order = standingsOrder(lg);
  const top2 = order.slice(0, 2);
  // user must be in top 2 to contest the pennant
  if (top2.includes(0)) {
    const opp = top2.find((i) => i !== 0);
    lg.champStage = 1;
    lg.champSeries = { opp, wins: [0, 0], games: [], best: 3 };
  } else {
    // user missed the pennant — sim the CPU final for a champion, season closes
    const res = simGame(lg.teams[top2[0]], lg.teams[top2[1]], (lg.seed ^ 0x9e3779b9) >>> 0);
    lg.champion = res.winner === 0 ? top2[0] : top2[1];
    lg.champStage = 2;
  }
}

// play/record one championship game (best-of-3). userResult optional.
export function advanceChampionship(lg, userResult) {
  if (lg.champStage !== 1) return null;
  const cs = lg.champSeries;
  const opp = cs.opp;
  const seed = (lg.seed ^ ((cs.games.length + 1) * 40503)) >>> 0;
  let uRes = userResult || simGame(lg.teams[0], lg.teams[opp], seed);
  const uWon = uRes.winner === 0;
  if (uWon) cs.wins[0]++; else cs.wins[1]++;
  cs.games.push({ us: uRes.score[0], them: uRes.score[1], won: uWon });
  const need = Math.ceil(cs.best / 2);
  if (cs.wins[0] >= need) { lg.champion = 0; lg.champStage = 2; lg.money += 250; }
  else if (cs.wins[1] >= need) { lg.champion = opp; lg.champStage = 2; }
  return { uWon, wins: cs.wins.slice() };
}

// start a new season carrying over the user's team, money, and a fresh schedule
export function newSeason(lg) {
  const carriedTeam = lg.userTeam;
  const seed = (lg.seed * 1103515245 + 12345) >>> 0;
  const next = newLeague(carriedTeam, seed);
  next.season = lg.season + 1;
  next.money = lg.money + 80; // carryover + bonus pool
  return next;
}

// ---- season stat leaders ----
export function leaders(lg) {
  const bats = [], pits = [];
  for (let ti = 0; ti < lg.teams.length; ti++) {
    const s = lg.stats[ti];
    for (const [name, l] of Object.entries(s.bat)) {
      if (l.ab >= 5) bats.push({ team: lg.teams[ti].short, name, avg: l.h / l.ab, hr: l.hr, rbi: l.rbi, ...l });
    }
    for (const [name, l] of Object.entries(s.pit)) {
      pits.push({ team: lg.teams[ti].short, name, w: l.w, k: l.k, era: l.outs ? (l.r * 27) / l.outs : 0, ...l });
    }
  }
  return {
    avg: bats.slice().sort((a, b) => b.avg - a.avg).slice(0, 5),
    hr: bats.slice().sort((a, b) => b.hr - a.hr).slice(0, 5),
    rbi: bats.slice().sort((a, b) => b.rbi - a.rbi).slice(0, 5),
    w: pits.slice().sort((a, b) => b.w - a.w || b.k - a.k).slice(0, 5),
    k: pits.slice().sort((a, b) => b.k - a.k).slice(0, 5),
  };
}

// ---------------------------------------------------------------------
//  PERSISTENCE
// ---------------------------------------------------------------------
const KEY = 'baseballMoores.save';
const hasStorage = () => {
  try { return typeof localStorage !== 'undefined' && localStorage !== null; } catch { return false; }
};

// strip runtime object refs before serializing
function serialize(lg) {
  const clean = {
    ...lg,
    teams: lg.teams.map((t) => ({
      name: t.name, short: t.short, colors: t.colors, tier: t.tier,
      isUser: t.isUser, logo: t.logo, players: t.players,
      lineupIdx: t.lineupIdx, rotationIdx: t.rotationIdx,
    })),
  };
  delete clean.userTeam; // rehydrated from teams[0]
  return clean;
}

export function saveLeague(lg) {
  if (!hasStorage()) return;
  try { localStorage.setItem(KEY, JSON.stringify(serialize(lg))); } catch { /* ignore */ }
}

export function loadLeague() {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const lg = JSON.parse(raw);
    if (!lg || !Array.isArray(lg.teams)) return null;
    for (const t of lg.teams) hydrate(t);
    lg.userTeam = lg.teams[0];
    return lg;
  } catch { return null; }
}

export function clearSave() {
  if (hasStorage()) { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
}

// round-trip helper (used by tests + reused for deep clone)
export function roundTrip(lg) {
  const s = JSON.parse(JSON.stringify(serialize(lg)));
  for (const t of s.teams) hydrate(t);
  s.userTeam = s.teams[0];
  return s;
}
