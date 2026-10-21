// Question makers that draw from word and fact banks: Word Master, Spelling Bee, Word Scramble, Hindi Varnamala,
// Science Explorer, GK Master, Treasure Hunt, Match the Pair and Memory Cards.
// "seen" holds the ids of items shown recently, so a level avoids repeating them until the bank is used up.
import { choice, numberChoice, pickFresh, bandOf } from "./games-util.js";
import { ANTONYMS, SYNONYMS, WORD_KINDS, ADJECTIVES, SPELLINGS, BEE_WORDS, SCRAMBLE_WORDS, HINDI_VOWELS, HINDI_CONSONANTS } from "./games-words.js";
import { SCIENCE, GK, STATE_CAPITALS, COUNTRY_CAPITALS, RIDDLES, MATCH_SETS } from "./games-facts.js";

const reachFor = (cls, level) => cls + Math.floor(level / 8);

// Chooses `count` entries from a pool of { id, make } without repeating recent ones when possible.
function drawFromPool(rng, pool, count, seen) {
  const fresh = pool.filter((p) => !(seen && seen.has(p.id))), stale = pool.filter((p) => seen && seen.has(p.id));
  const picked = rng.shuffle(fresh).slice(0, count);
  if (picked.length < count) picked.push(...rng.shuffle(stale).slice(0, count - picked.length));
  return picked;
}

// ================= Word Master =================
export function makeWordMaster({ rng, cls, level, seen }) {
  const reach = reachFor(cls, level);
  const ant = ANTONYMS.map((e, i) => ({ e, i })).filter((x) => Number(x.e[2]) <= reach);
  const syn = SYNONYMS.map((e, i) => ({ e, i })).filter((x) => Number(x.e[2]) <= reach);
  const spell = SPELLINGS.map((e, i) => ({ e, i })).filter((x) => Number(x.e[3]) <= reach);
  const kinds = WORD_KINDS.map((e, i) => ({ e, i })).filter((x) => Number(x.e[3]) <= reach);
  const adjs = ADJECTIVES.map((e, i) => ({ e, i })).filter((x) => Number(x.e[2]) <= reach);
  const pool = [];
  ant.forEach(({ e, i }) => pool.push({ id: "wm:a" + i, make: () => {
    const related = new Set([e[0], e[1]]);
    ANTONYMS.forEach((x) => { if (x.includes(e[0]) || x.includes(e[1])) { related.add(x[0]); related.add(x[1]); } });
    const cands = rng.shuffle([...new Set(ANTONYMS.map((x) => x[1]).concat(ANTONYMS.map((x) => x[0])))].filter((w) => !related.has(w)));
    return choice(rng, "What is the opposite of " + e[0].toUpperCase() + "?", e[1], cands.slice(0, 3), { meta: { style: "opposite" } });
  } }));
  syn.forEach(({ e, i }) => pool.push({ id: "wm:s" + i, make: () => {
    const related = new Set([e[0], e[1]]);
    SYNONYMS.forEach((x) => { if (x.includes(e[0]) || x.includes(e[1])) { related.add(x[0]); related.add(x[1]); } });
    ANTONYMS.forEach((x) => { if (x.includes(e[0])) { related.add(x[0]); related.add(x[1]); } });
    const cands = rng.shuffle([...new Set(SYNONYMS.map((x) => x[1]).concat(ANTONYMS.map((x) => x[0])))].filter((w) => !related.has(w)));
    return choice(rng, "Which word means the same as " + e[0].toUpperCase() + "?", e[1], cands.slice(0, 3), { meta: { style: "synonym" } });
  } }));
  spell.forEach(({ e, i }) => pool.push({ id: "wm:p" + i, make: () => choice(rng, "Which word is spelt correctly?", e[0], [e[1], e[2]], { meta: { style: "spelling" } }) }));
  kinds.forEach(({ e, i }) => pool.push({ id: "wm:k" + i, make: () => choice(rng, "In the sentence \u201C" + e[0] + "\u201D what kind of word is " + e[1].toUpperCase() + "?", e[2] === "noun" ? "Noun" : "Verb", ["Noun", "Verb", "Adjective", "Adverb"].filter((x) => x.toLowerCase() !== e[2]), { meta: { style: "kind" } }) }));
  adjs.forEach(({ e, i }) => pool.push({ id: "wm:j" + i, make: () => choice(rng, "In the sentence \u201C" + e[0] + "\u201D what kind of word is " + e[1].toUpperCase() + "?", "Adjective", ["Noun", "Verb", "Adverb"], { meta: { style: "kind" } }) }));
  const picked = drawFromPool(rng, pool, 5, seen);
  return { type: "quiz", questions: picked.map((p) => p.make()), used: picked.map((p) => p.id) };
}

// ================= Spelling Bee =================
export function makeSpelling({ rng, cls, level, seen }) {
  const reach = reachFor(cls, level);
  const pool = BEE_WORDS.map((e, i) => ({ e, id: "bee:" + i })).filter((x) => Number(x.e[2]) <= reach);
  const picked = drawFromPool(rng, pool.map((x) => ({ id: x.id, e: x.e })), 5, seen);
  return {
    type: "quiz",
    questions: picked.map((p) => ({ input: "letters", prompt: "Listen to the word and spell it.", clue: p.e[1], speak: p.e[0], answer: p.e[0].toLowerCase(), length: p.e[0].length, meta: { word: p.e[0] } })),
    used: picked.map((p) => p.id)
  };
}

// ================= Word Scramble =================
export function makeScramble({ rng, cls, level, seen }) {
  const reach = reachFor(cls, level);
  const pool = SCRAMBLE_WORDS.map((e, i) => ({ e, id: "scr:" + i })).filter((x) => Number(x.e[3]) <= reach);
  const picked = drawFromPool(rng, pool, 5, seen);
  return {
    type: "quiz",
    questions: picked.map((p) => {
      const word = p.e[0].toLowerCase(); let letters = word.split("");
      for (let tries = 0; tries < 10; tries++) { letters = rng.shuffle(word.split("")); if (letters.join("") !== word) break; }
      return { input: "tiles", prompt: "Arrange the letters to make a word.", letters, answer: word, clue: p.e[1], emoji: p.e[2] === "-" ? "" : p.e[2], meta: { word } };
    }),
    used: picked.map((p) => p.id)
  };
}

// ================= Hindi Varnamala =================
const HINDI_ORDER = HINDI_VOWELS.concat(HINDI_CONSONANTS).map((r) => r[0]);
export function makeHindi({ rng, cls, level, seen }) {
  const pool = level <= 4 ? HINDI_VOWELS : level <= 8 ? HINDI_VOWELS.concat(HINDI_CONSONANTS.slice(0, 14)) : HINDI_VOWELS.concat(HINDI_CONSONANTS);
  const all = HINDI_VOWELS.concat(HINDI_CONSONANTS);
  const others = (row, n) => rng.sample(all.filter((r) => r[0] !== row[0]), n);
  const makers = [];
  pool.forEach((row, i) => {
    makers.push({ id: "hi:w" + i, make: () => choice(rng, "Which word starts with the letter " + row[0] + " ?", row[1], others(row, 3).map((r) => r[1]), { optionLang: "hi", prompt_lang: "hi", meta: { style: "startsWith" } }) });
    makers.push({ id: "hi:l" + i, make: () => choice(rng, "Which letter does the word " + row[1] + " start with?", row[0], others(row, 3).map((r) => r[0]), { optionLang: "hi", meta: { style: "letterOf" } }) });
    if (row[4] !== "-") makers.push({ id: "hi:p" + i, make: () => choice(rng, "Which Hindi word matches this picture?", row[1], others(row, 3).map((r) => r[1]), { html: '<div class="g-bigemoji" role="img" aria-label="' + row[2] + '">' + row[4] + "</div>", optionLang: "hi", meta: { style: "picture" } }) });
    if (cls >= 2) makers.push({ id: "hi:m" + i, make: () => choice(rng, "What does " + row[1] + " mean in English?", row[2], others(row, 3).map((r) => r[2]), { meta: { style: "meaning" } }) });
    if (level >= 3) makers.push({ id: "hi:k" + i, make: () => choice(rng, "Is " + row[0] + " a vowel or a consonant?", row[3] === "vowel" ? "Vowel (swar)" : "Consonant (vyanjan)", [row[3] === "vowel" ? "Consonant (vyanjan)" : "Vowel (swar)"], { meta: { style: "kind" } }) });
    const at = HINDI_ORDER.indexOf(row[0]);
    if (level >= 5 && at >= 0 && at < HINDI_ORDER.length - 1) makers.push({ id: "hi:n" + i, make: () => choice(rng, "Which letter comes after " + row[0] + " in the Varnamala?", HINDI_ORDER[at + 1], rng.sample(HINDI_ORDER.filter((x) => x !== HINDI_ORDER[at + 1] && x !== row[0]), 3), { optionLang: "hi", meta: { style: "next" } }) });
  });
  const picked = drawFromPool(rng, makers, 5, seen);
  return { type: "quiz", questions: picked.map((p) => p.make()), used: picked.map((p) => p.id), lang: "hi" };
}

// ================= Science Explorer and GK Master =================
function bankPool(rng, bank, prefix, cls, level) {
  const base = bandOf(cls), order = ["a", "b", "c"], at = order.indexOf(base);
  const bands = new Set([base]);
  if (level >= 6 && at < 2) bands.add(order[at + 1]);
  if (level >= 4 && at > 0) bands.add(order[at - 1]);
  if (level >= 14) order.forEach((b) => bands.add(b));
  let pool = bank.map((e, i) => ({ e, id: prefix + i })).filter((x) => bands.has(x.e[0]));
  if (pool.length < 14) pool = bank.map((e, i) => ({ e, id: prefix + i }));
  return pool;
}

export function makeScience({ rng, cls, level, seen }) {
  const pool = bankPool(rng, SCIENCE, "sci:", cls, level).map((x) => ({ id: x.id, make: () => choice(rng, x.e[1], x.e[2], [x.e[3], x.e[4], x.e[5]], { meta: { bank: "science" } }) }));
  const picked = drawFromPool(rng, pool, 5, seen);
  return { type: "quiz", questions: picked.map((p) => p.make()), used: picked.map((p) => p.id) };
}

export function makeGK({ rng, cls, level, seen }) {
  const pool = bankPool(rng, GK, "gk:", cls, level).map((x) => ({ id: x.id, make: () => choice(rng, x.e[1], x.e[2], [x.e[3], x.e[4], x.e[5]], { meta: { bank: "gk" } }) }));
  if (cls >= 3 || level >= 10) {
    STATE_CAPITALS.forEach((s, i) => {
      pool.push({ id: "gk:sc" + i, make: () => choice(rng, "What is the capital of " + s[0] + "?", s[1], rng.sample(STATE_CAPITALS.filter((x) => x[1] !== s[1]).map((x) => x[1]), 3), { meta: { bank: "states" } }) });
      if (cls >= 4) pool.push({ id: "gk:cs" + i, make: () => choice(rng, s[1] + " is the capital of which state?", s[0], rng.sample(STATE_CAPITALS.filter((x) => x[1] !== s[1]).map((x) => x[0]), 3), { meta: { bank: "states" } }) });
    });
  }
  if (cls >= 5 || level >= 12) {
    COUNTRY_CAPITALS.forEach((c, i) => pool.push({ id: "gk:cc" + i, make: () => choice(rng, "What is the capital of " + c[0] + "?", c[1], rng.sample(COUNTRY_CAPITALS.filter((x) => x[1] !== c[1]).map((x) => x[1]), 3), { meta: { bank: "countries" } }) }));
  }
  const picked = drawFromPool(rng, pool, 5, seen);
  return { type: "quiz", questions: picked.map((p) => p.make()), used: picked.map((p) => p.id) };
}

// ================= Treasure Hunt =================
const SCENES = ["the jungle", "a mountain path", "a sandy island", "a dark cave", "the desert", "an old castle", "a river bank", "a pirate ship"];
const FACTS = [["days in a week", 7], ["colours in a rainbow", 7], ["sides of a triangle", 3], ["sides of a square", 4], ["legs of a cat", 4], ["fingers on one hand", 5], ["wheels of a bicycle", 2], ["months in a year", 12], ["continents of the world", 7], ["players in a cricket team", 11], ["hours in a day", 24], ["minutes in an hour", 60], ["planets in the solar system", 8], ["letters in the English alphabet", 26], ["rings in the Olympic symbol", 5], ["legs of a spider", 8]];

function numberClue(rng, cls) {
  const small = FACTS.filter((f) => f[1] <= (cls <= 2 ? 12 : 60));
  const a = rng.pick(small); let b = rng.pick(small); while (b === a) b = rng.pick(small);
  const ops = cls <= 2 ? ["add"] : cls <= 4 ? ["add", "sub", "mul"] : ["add", "sub", "mul"];
  const op = rng.pick(ops);
  const hi = a[1] >= b[1] ? a : b, lo = hi === a ? b : a;
  if (op === "add") return numberChoice(rng, "Add the number of " + a[0] + " and the number of " + b[0] + ". What number opens the lock?", a[1] + b[1], { min: 0, extra: { meta: { expr: a[1] + " + " + b[1] } } });
  if (op === "sub") return numberChoice(rng, "Take the number of " + lo[0] + " away from the number of " + hi[0] + ". What number opens the lock?", hi[1] - lo[1], { min: 0, extra: { meta: { expr: hi[1] + " - " + lo[1] } } });
  const x = FACTS.filter((f) => f[1] <= 12 && f !== a)[0], y = rng.pick(FACTS.filter((f) => f[1] <= 8));
  const p = rng.pick(FACTS.filter((f) => f[1] <= 8)), q2 = rng.pick(FACTS.filter((f) => f[1] <= 8 && f !== p));
  return numberChoice(rng, "Multiply the number of " + p[0] + " by the number of " + q2[0] + ". What number opens the lock?", p[1] * q2[1], { min: 0, extra: { meta: { expr: p[1] + " * " + q2[1] } } });
}

export function makeTreasure({ rng, cls, level, seen }) {
  const base = bandOf(cls), order = ["a", "b", "c"], at = order.indexOf(base);
  const bands = new Set([base]); if (level >= 5 && at < 2) bands.add(order[at + 1]); if (level >= 3 && at > 0) bands.add(order[at - 1]);
  let riddles = RIDDLES.map((e, i) => ({ e, id: "rid:" + i })).filter((x) => bands.has(x.e[0]));
  if (riddles.length < 8) riddles = RIDDLES.map((e, i) => ({ e, id: "rid:" + i }));
  const picked = drawFromPool(rng, riddles.map((x) => ({ id: x.id, e: x.e })), 3, seen);
  const questions = [];
  picked.forEach((p) => questions.push(choice(rng, p.e[1], p.e[2], [p.e[3], p.e[4], p.e[5]], { meta: { riddle: true } })));
  const extras = Math.min(2, 5 - questions.length);
  for (let i = 0; i < extras; i++) questions.splice(rng.int(0, questions.length), 0, numberClue(rng, cls));
  const scene = SCENES[(level - 1) % SCENES.length];
  questions.forEach((q, i) => { q.story = "Clue " + (i + 1) + " of " + questions.length + ". You are in " + scene + "."; });
  return { type: "quiz", questions, used: picked.map((p) => p.id), path: true, scene };
}

// ================= Match the Pair =================
export function makeMatch({ rng, cls, level }) {
  let sets = Object.entries(MATCH_SETS).filter(([, s]) => cls >= s.min && cls <= s.max);
  if (!sets.length) sets = Object.entries(MATCH_SETS);
  const [id, set] = rng.pick(sets);
  const n = Math.min(3 + Math.floor((level - 1) / 2), cls <= 2 ? 6 : 8, set.rows.length);
  const rows = rng.sample(set.rows, n);
  return { type: "match", title: set.title, setId: id, pairs: rows.map((r) => ({ left: r[0], right: r[1] })) };
}

// ================= Memory Cards =================
export function makeMemory({ rng, cls, level }) {
  const n = Math.min(3 + Math.floor((level - 1) / 2), 10);
  let faces; // [faceA, faceB] for each pair
  if (cls <= 2) {
    const pool = []; ["fruits", "animals", "vehicles"].forEach((k) => MATCH_SETS[k].rows.forEach((r) => pool.push(r[0])));
    faces = rng.sample(pool, n).map((e) => [e, e]);
  } else if (cls <= 4) {
    const mode = rng.pick(["emoji", "numbers"]);
    if (mode === "emoji") faces = rng.sample(MATCH_SETS.animals.rows.concat(MATCH_SETS.fruits.rows), n).map((r) => [r[0], r[1]]);
    else faces = rng.sample(MATCH_SETS.numbers.rows, Math.min(n, 10)).map((r) => [r[0], r[1]]);
  } else {
    const mode = rng.pick(["expr", "frac"]);
    if (mode === "expr") {
      const seenVals = new Set(), out = [];
      while (out.length < n) { const a = rng.int(2, 12), b = rng.int(2, 12), v = a * b; if (seenVals.has(v)) continue; seenVals.add(v); out.push([a + " \u00D7 " + b, String(v)]); }
      faces = out;
    } else {
      const table = [["1/2", "0.5"], ["1/4", "0.25"], ["3/4", "0.75"], ["1/5", "0.2"], ["2/5", "0.4"], ["3/5", "0.6"], ["4/5", "0.8"], ["1/10", "0.1"], ["7/10", "0.7"], ["9/10", "0.9"]];
      faces = rng.sample(table, Math.min(n, table.length));
    }
  }
  const count = faces.length;
  const cards = [];
  faces.forEach(([a, b], i) => { cards.push({ pair: i, face: a }); cards.push({ pair: i, face: b }); });
  return { type: "memory", pairs: count, cards: rng.shuffle(cards).map((c, i) => ({ ...c, index: i })) };
}
