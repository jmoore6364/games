// A small Sierra-style two-word(ish) parser: verb + noun (+ "to/on" + noun2).

const VERBS = {
  look:    ['look', 'examine', 'l', 'x', 'inspect', 'view', 'watch'],
  read:    ['read'],
  take:    ['take', 'get', 'grab', 'pick', 'pickup', 'steal', 'catch'],
  talk:    ['talk', 'speak', 'ask', 'greet', 'hello', 'hi', 'say'],
  give:    ['give', 'offer', 'show', 'feed', 'hand'],
  open:    ['open'],
  close:   ['close', 'shut'],
  use:     ['use'],
  fill:    ['fill', 'scoop', 'dip'],
  throwv:  ['throw', 'pour', 'splash', 'douse', 'dump', 'toss', 'empty'],
  eat:     ['eat', 'taste', 'bite'],
  drink:   ['drink', 'sip'],
  cross:   ['cross'],
  enter:   ['enter', 'go', 'exit', 'leave', 'walk'],
  climb:   ['climb'],
  swim:    ['swim', 'wade', 'dive'],
  ring:    ['ring'],
  pet:     ['pet', 'pat', 'hug'],
  smell:   ['smell', 'sniff'],
  kill:    ['kill', 'attack', 'fight', 'hit', 'punch', 'kick', 'stab'],
  inv:     ['inventory', 'inv', 'i', 'items'],
  help:    ['help', 'hint', 'hints'],
  save:    ['save'],
  restore: ['restore', 'load'],
  restart: ['restart'],
  score:   ['score', 'points'],
  mute:    ['mute', 'sound', 'music'],
  jump:    ['jump', 'hop'],
  dance:   ['dance'],
  pray:    ['pray'],
  xyzzy:   ['xyzzy', 'plugh'],
  quit:    ['quit'],
};

const VERB_OF = {};
for (const [v, words] of Object.entries(VERBS)) for (const w of words) VERB_OF[w] = v;

const FILLER = new Set(['the', 'a', 'an', 'at', 'my', 'some', 'that', 'this', 'up', 'around',
  'of', 'in', 'into', 'onto', 'please']);

// Returns { verb, noun, noun2, raw } or null if gibberish.
export function parse(text) {
  const raw = text.trim().toLowerCase().replace(/[^a-z0-9 ']/g, '');
  if (!raw) return null;
  let words = raw.split(/\s+/);

  const verb = VERB_OF[words[0]];
  if (!verb) return { verb: null, noun: null, noun2: null, raw };
  words = words.slice(1);

  // split off "to X" / "on X" / "with X" as the indirect object
  let noun2 = null;
  for (const prep of ['to', 'on', 'with', 'for']) {
    const i = words.indexOf(prep);
    if (i >= 0) {
      noun2 = words.slice(i + 1).filter(w => !FILLER.has(w)).join(' ') || null;
      words = words.slice(0, i);
      break;
    }
  }
  let noun = words.filter(w => !FILLER.has(w)).join(' ') || null;
  // "talk TO king", "look AT owl": no direct object means the indirect one is the target
  if (!noun && noun2) { noun = noun2; noun2 = null; }
  return { verb, noun, noun2, raw };
}

// Match a spoken noun against a list of names ("billy goat" matches "goat").
export function nounMatch(noun, names) {
  if (!noun) return false;
  for (const n of names) {
    if (noun === n) return true;
    if (noun.endsWith(' ' + n) || n.endsWith(' ' + noun)) return true;
    if (noun.includes(n)) return true;
  }
  return false;
}
