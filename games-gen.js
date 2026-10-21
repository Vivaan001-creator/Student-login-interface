// The list of games, and the one function the screen calls to get a level.
import { hashSeed, makeRng, dayKey } from "./games-core.js";
import { makeMath, makeSpeed, makeTables, makeBrain, makeFraction, makeMoney, makeClock } from "./games-gen-math.js";
import { makeWordMaster, makeSpelling, makeScramble, makeHindi, makeScience, makeGK, makeTreasure, makeMatch, makeMemory } from "./games-gen-lang.js";

// colour is the accent colour of the card, icon names the picture drawn on it.
export const GAMES = [
  { id: "math", name: "Math Challenge", learn: "Add, subtract, multiply and divide", color: "#1f6fd1", icon: "plus", make: makeMath },
  { id: "speed", name: "Speed Maths", learn: "Quick mental calculation against the clock", color: "#c2410c", icon: "bolt", make: makeSpeed },
  { id: "tables", name: "Table Champion", learn: "Multiplication tables with a timer", color: "#0f766e", icon: "times", make: makeTables },
  { id: "wordmaster", name: "Word Master", learn: "Spelling, opposites, synonyms, nouns and verbs", color: "#b4237a", icon: "book", make: makeWordMaster },
  { id: "match", name: "Match the Pair", learn: "Match pictures, words and numbers", color: "#4d7c0f", icon: "link", make: makeMatch },
  { id: "science", name: "Science Explorer", learn: "Plants, animals, body, space and nature", color: "#047857", icon: "flask", make: makeScience },
  { id: "gk", name: "GK Master", learn: "India, states, capitals and the world", color: "#b45309", icon: "globe", make: makeGK },
  { id: "brain", name: "Brain Puzzle", learn: "Patterns, logic, number puzzles and mazes", color: "#be123c", icon: "puzzle", make: makeBrain },
  { id: "scramble", name: "Word Scramble", learn: "Put the letters in the right order", color: "#7c4a03", icon: "shuffle", make: makeScramble },
  { id: "hindi", name: "Hindi Varnamala", learn: "Hindi letters and words", color: "#b91c1c", icon: "letter", make: makeHindi },
  { id: "spelling", name: "Spelling Bee", learn: "Listen and spell English words", color: "#1d4ed8", icon: "bee", make: makeSpelling },
  { id: "fraction", name: "Fraction Pizza", learn: "Fractions made easy", color: "#c2410c", icon: "pizza", make: makeFraction },
  { id: "money", name: "Money Master", learn: "Counting money and change", color: "#15803d", icon: "coin", make: makeMoney },
  { id: "clock", name: "Clock Master", learn: "Telling the time", color: "#0e7490", icon: "clock", make: makeClock },
  { id: "memory", name: "Memory Cards", learn: "Memory and concentration", color: "#334155", icon: "cards", make: makeMemory },
  { id: "treasure", name: "Treasure Hunt", learn: "Solve clues to find the treasure", color: "#a16207", icon: "map", make: makeTreasure }
];
export const getGame = (id) => GAMES.find((g) => g.id === id);

// Builds one level. The same inputs always give the same questions; a new attempt gives new ones.
export function generateLevel(gameId, cls, level, attempt = 0, who = "", seen = null) {
  const game = getGame(gameId);
  if (!game) throw new Error("Unknown game " + gameId);
  const rng = makeRng(hashSeed([gameId, cls, level, attempt, who].join("|")));
  const out = game.make({ rng, cls, level, seen });
  out.game = gameId; out.cls = cls; out.level = level;
  return out;
}

// Daily Quiz Battle: the same 10 questions for every child of a class on a given day.
const DAILY_MIX = ["math", "wordmaster", "science", "gk", "brain", "math", "science", "gk", "fraction", "wordmaster"];
export function dailySet(cls, date = dayKey()) {
  const swap = cls <= 2 ? { fraction: "clock" } : cls === 3 ? { fraction: "money" } : {};
  const questions = [];
  DAILY_MIX.forEach((g, i) => {
    const id = swap[g] || g;
    const lvl = 3 + (hashSeed(date) % 5);
    let q = null;
    for (let t = 0; t < 8 && !q; t++) {
      // some levels are not question levels (a Brain Puzzle maze), so move to the next level when that happens
      const lv = generateLevel(id, cls, lvl + t, 0, "daily|" + date + "|" + i + "|" + t);
      q = (lv.questions || []).find((x) => x.input === "choice" || x.input === "number") || null;
    }
    if (q) { q.from = id; questions.push(q); }
  });
  return { type: "quiz", questions, game: "daily", cls, level: 1, daily: true, date };
}
