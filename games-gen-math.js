// Question makers that build new questions from rules, so levels never run out:
// Math Challenge, Speed Maths, Table Champion, Brain Puzzle, Fraction Pizza, Money Master and Clock Master.
// Every maths question carries meta.expr (a plain expression that equals the right answer) so it can be double checked.
import { choice, numberChoice, NAMES, THINGS, gcd, esc, rupees } from "./games-util.js";

const grow = (L, start, cap, per) => Math.min(cap, start + Math.floor(L * per));
const pickWeighted = (rng, entries) => {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rng.next() * total;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[0][0];
};
const nm = (rng) => rng.pick(NAMES);
const thing = (rng) => rng.pick(THINGS);

// ================= Math Challenge =================
export function mathQuestion(rng, cls, level, mode = "full") {
  const L = level;
  const mental = mode === "mental";
  let type;
  const W = [];
  switch (cls) {
    case 1: W.push(["add", 40], ["sub", 40], ["missing", 12]); if (!mental) W.push(["word", 6 + L / 2]); if (L >= 15) W.push(["tens", 12]); break;
    case 2: W.push(["add", 25], ["sub", 25], ["missing", 12]); if (L >= 3) W.push(["mul", 18]); if (!mental) W.push(["word", 18]); break;
    case 3: W.push(["add", 15], ["sub", 15], ["mul", 20], ["missing", 10]); if (L >= 3) W.push(["div", 16]); if (!mental) W.push(["word", 22]); break;
    case 4: W.push(["add", 12], ["sub", 12], ["mul", 20], ["div", 15], ["missing", 8]); if (L >= 4 && !mental) W.push(["bodmas", 12]); if (!mental) W.push(["word", 22]); break;
    case 5: W.push(["decimal", 14], ["mul", 14], ["div", 10], ["missing", 5]); if (L >= 3) W.push(["percent", 10]); if (!mental) W.push(["bodmas", 14], ["word", 18]); break;
    default: W.push(["negative", 14], ["mul", 8], ["power", 10]); if (L >= 2) W.push(["percent", 14], ["equation", 14]); if (L >= 6) W.push(["lcmhcf", 9]); if (!mental) W.push(["bodmas", 10], ["word", 14]);
  }
  type = pickWeighted(rng, W);

  // number sizes by class and level
  const lim = { 1: grow(L, 8, 20, 0.5), 2: grow(L, 30, 100, 3), 3: grow(L, 100, 999, 35), 4: grow(L, 1000, 9999, 250), 5: grow(L, 500, 9999, 150), 6: grow(L, 100, 5000, 80) }[cls];
  const tableMax = { 1: 5, 2: 5, 3: 10, 4: 12, 5: 12, 6: 15 }[cls];

  if (type === "add") {
    const a = rng.int(1, lim), b = rng.int(1, cls === 1 ? Math.min(lim, 20 - 0) : lim);
    const ans = a + b; const s = cls === 1 && ans > 20 ? 0 : 1;
    if (!s) return mathQuestion(rng, cls, level, mode);
    return numberChoice(rng, a + " + " + b + " = ?", ans, { min: 0, extra: { meta: { expr: a + " + " + b } } });
  }
  if (type === "sub") {
    const a = rng.int(2, lim), b = rng.int(1, a);
    return numberChoice(rng, a + " \u2212 " + b + " = ?", a - b, { min: 0, extra: { meta: { expr: a + " - " + b } } });
  }
  if (type === "tens") {
    const a = rng.int(1, 9) * 10 + rng.int(0, 9), t = rng.int(1, 5) * 10;
    return rng.chance(0.5) ? numberChoice(rng, a + " + " + t + " = ?", a + t, { min: 0, step: 10, extra: { meta: { expr: a + " + " + t } } })
      : numberChoice(rng, (a + t) + " \u2212 " + t + " = ?", a, { min: 0, step: 10, extra: { meta: { expr: (a + t) + " - " + t } } });
  }
  if (type === "missing") {
    if (cls >= 3 && rng.chance(0.5)) {
      const a = rng.int(2, tableMax), b = rng.int(2, tableMax);
      return numberChoice(rng, a + " \u00D7 ? = " + (a * b), b, { min: 1, extra: { meta: { expr: (a * b) + " / " + a } } });
    }
    const m = Math.min(lim, cls === 1 ? 20 : lim);
    const a = rng.int(1, m - 1), c = rng.int(a + 1, m);
    return rng.chance(0.5) ? numberChoice(rng, a + " + ? = " + c, c - a, { min: 0, extra: { meta: { expr: c + " - " + a } } })
      : numberChoice(rng, "? + " + a + " = " + c, c - a, { min: 0, extra: { meta: { expr: c + " - " + a } } });
  }
  if (type === "mul") {
    let a, b;
    if (cls === 2) { a = rng.pick([2, 3, 4, 5, 10]); b = rng.int(1, 10); }
    else if (cls === 3) { a = rng.int(2, 10); b = rng.int(1, 10); }
    else if (cls === 4) { a = rng.int(2, L >= 4 && !mental ? 99 : 12); b = rng.int(2, L >= 4 && !mental ? 9 : 12); }
    else if (cls === 5) { a = rng.int(11, grow(L, 30, 99, 2)); b = rng.int(2, L >= 6 && !mental ? 25 : 9); }
    else { a = rng.int(12, grow(L, 40, 120, 3)); b = rng.int(3, 20); }
    return numberChoice(rng, a + " \u00D7 " + b + " = ?", a * b, { min: 0, step: a >= 10 ? 10 : 1, extra: { meta: { expr: a + " * " + b } } });
  }
  if (type === "div") {
    const b = rng.int(2, cls <= 3 ? 10 : 12), q = rng.int(2, cls <= 3 ? 10 : cls === 4 ? grow(L, 12, 99, 1) : 99);
    return numberChoice(rng, (b * q) + " \u00F7 " + b + " = ?", q, { min: 1, extra: { meta: { expr: (b * q) + " / " + b } } });
  }
  if (type === "decimal") {
    const a = rng.int(11, grow(L, 90, 990, 20)) / 10, b = rng.int(11, grow(L, 90, 990, 20)) / 10;
    if (rng.chance(0.5)) { const ans = Math.round((a + b) * 10) / 10; return numberChoice(rng, a + " + " + b + " = ?", ans, { min: 0, step: 0.1, extra: { meta: { expr: a + " + " + b } } }); }
    const hi = Math.max(a, b), lo = Math.min(a, b); const ans = Math.round((hi - lo) * 10) / 10;
    return numberChoice(rng, hi + " \u2212 " + lo + " = ?", ans, { min: 0, step: 0.1, extra: { meta: { expr: hi + " - " + lo } } });
  }
  if (type === "percent") {
    const p = rng.pick(cls === 5 ? [10, 20, 25, 50] : [5, 10, 15, 20, 25, 30, 40, 50, 75]);
    const base = rng.pick(cls === 5 ? [40, 60, 80, 100, 120, 200, 400] : [40, 60, 80, 120, 160, 200, 240, 300, 400, 600, 800]);
    const ans = (p * base) / 100;
    return numberChoice(rng, p + "% of " + base + " = ?", ans, { min: 0, step: p === 5 ? 1 : 5, extra: { meta: { expr: "(" + p + " / 100) * " + base } } });
  }
  if (type === "negative") {
    const a = rng.int(-grow(L, 8, 40, 1), grow(L, 8, 40, 1)), b = rng.int(-grow(L, 8, 40, 1), grow(L, 8, 40, 1));
    const fa = a < 0 ? "(" + a + ")" : String(a), fb = b < 0 ? "(" + b + ")" : String(b);
    if (rng.chance(0.5)) return numberChoice(rng, fa + " + " + fb + " = ?", a + b, { extra: { meta: { expr: fa + " + " + fb } } });
    return numberChoice(rng, fa + " \u2212 " + fb + " = ?", a - b, { extra: { meta: { expr: fa + " - " + fb } } });
  }
  if (type === "power") {
    const kind = rng.pick(L >= 5 ? ["sq", "sq", "cube", "root"] : ["sq", "root"]);
    if (kind === "sq") { const n = rng.int(2, grow(L, 12, 25, 0.5)); return numberChoice(rng, n + "\u00B2 = ?", n * n, { min: 1, step: n, extra: { meta: { expr: n + " * " + n } } }); }
    if (kind === "cube") { const n = rng.int(2, 9); return numberChoice(rng, n + "\u00B3 = ?", n * n * n, { min: 1, step: n, extra: { meta: { expr: n + " * " + n + " * " + n } } }); }
    const n = rng.int(2, grow(L, 12, 25, 0.5)); return numberChoice(rng, "\u221A" + (n * n) + " = ?", n, { min: 1, extra: { meta: { expr: String(n) } } });
  }
  if (type === "equation") {
    const x = rng.int(2, grow(L, 12, 40, 1)), a = rng.int(2, 15);
    if (rng.chance(0.5)) return numberChoice(rng, "x + " + a + " = " + (x + a) + ".  x = ?", x, { min: 0, extra: { meta: { expr: (x + a) + " - " + a } } });
    const m = rng.int(2, 9);
    return numberChoice(rng, m + "x = " + (m * x) + ".  x = ?", x, { min: 0, extra: { meta: { expr: (m * x) + " / " + m } } });
  }
  if (type === "lcmhcf") {
    const a = rng.pick([4, 6, 8, 9, 10, 12, 15, 18, 20]), b = rng.pick([4, 6, 8, 9, 10, 12, 15, 18, 20]);
    if (a === b) return mathQuestion(rng, cls, level, mode);
    const g = gcd(a, b);
    return rng.chance(0.5) ? numberChoice(rng, "HCF of " + a + " and " + b + " = ?", g, { min: 1, extra: { meta: { expr: String(g) } } })
      : numberChoice(rng, "LCM of " + a + " and " + b + " = ?", (a * b) / g, { min: 1, step: g, extra: { meta: { expr: "(" + a + " * " + b + ") / " + g } } });
  }
  if (type === "bodmas") {
    const a = rng.int(2, 20), b = rng.int(2, 9), c = rng.int(2, 9);
    if (rng.chance(0.5)) return numberChoice(rng, a + " + " + b + " \u00D7 " + c + " = ?", a + b * c, { min: 0, extra: { meta: { expr: a + " + " + b + " * " + c } } });
    return numberChoice(rng, "(" + a + " + " + b + ") \u00D7 " + c + " = ?", (a + b) * c, { min: 0, step: c, extra: { meta: { expr: "(" + a + " + " + b + ") * " + c } } });
  }
  // word problems
  const n1 = nm(rng), t = thing(rng);
  const kind = rng.pick(cls === 1 ? ["add", "sub"] : cls === 2 ? ["add", "sub", "mul"] : ["add", "sub", "mul", "div"]);
  if (kind === "add") { const a = rng.int(2, Math.min(lim, 400)), b = rng.int(2, Math.min(lim, 400)); return numberChoice(rng, n1 + " has " + a + " " + t + " and gets " + b + " more. How many " + t + " does " + n1 + " have now?", a + b, { min: 0, extra: { meta: { expr: a + " + " + b } } }); }
  if (kind === "sub") { const a = rng.int(5, Math.min(lim, 500)), b = rng.int(1, a - 1); return numberChoice(rng, n1 + " has " + a + " " + t + " and gives away " + b + ". How many are left?", a - b, { min: 0, extra: { meta: { expr: a + " - " + b } } }); }
  if (kind === "mul") { const a = rng.int(2, cls === 2 ? 5 : 10), b = rng.int(2, cls <= 3 ? 10 : 25); return numberChoice(rng, "There are " + a + " boxes with " + b + " " + t + " in each box. How many " + t + " are there in all?", a * b, { min: 0, extra: { meta: { expr: a + " * " + b } } }); }
  const share = rng.int(2, 9), each = rng.int(2, cls <= 3 ? 10 : 30);
  return numberChoice(rng, n1 + " shares " + (share * each) + " " + t + " equally among " + share + " friends. How many does each friend get?", each, { min: 1, extra: { meta: { expr: (share * each) + " / " + share } } });
}

export function makeMath({ rng, cls, level }) {
  return { type: "quiz", questions: Array.from({ length: 5 }, () => mathQuestion(rng, cls, level)) };
}

// ================= Speed Maths (quick mental sums with a timer) =================
export function makeSpeed({ rng, cls, level }) {
  const time = Math.max(4, ({ 1: 9, 2: 9, 3: 9, 4: 10, 5: 11, 6: 12 }[cls]) - Math.floor(level / 4));
  const qs = [];
  while (qs.length < 8) {
    const q = mathQuestion(rng, cls, Math.min(level, 25), "mental");
    q.time = time; qs.push(q);
  }
  return { type: "quiz", questions: qs, timed: true };
}

// ================= Table Champion =================
export function makeTables({ rng, cls, level }) {
  const tables = { 1: [2, 5, 10], 2: [2, 3, 4, 5, 10], 3: [2, 3, 4, 5, 6, 7, 8, 9, 10], 4: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 5: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 6: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }[cls];
  // low levels use the easier tables first; later levels bring in the whole range
  const upTo = Math.min(tables.length, 3 + Math.floor(level / 2));
  const pool = tables.slice(0, upTo);
  const maxMul = cls <= 3 ? 10 : 12;
  const time = Math.max(5, 15 - Math.floor(level / 2));
  const qs = [];
  while (qs.length < 10) {
    const a = rng.pick(pool), b = rng.int(1, maxMul);
    const style = level < 3 ? "mul" : pickWeighted(rng, [["mul", 50], ["missing", 30], ...(cls >= 3 && level >= 5 ? [["div", 20]] : [])]);
    let q;
    if (style === "mul") q = { prompt: a + " \u00D7 " + b + " = ?", answer: a * b, expr: a + " * " + b };
    else if (style === "missing") q = { prompt: a + " \u00D7 ? = " + (a * b), answer: b, expr: (a * b) + " / " + a };
    else q = { prompt: (a * b) + " \u00F7 " + a + " = ?", answer: b, expr: (a * b) + " / " + a };
    qs.push({ input: "number", prompt: q.prompt, answer: String(q.answer), time, meta: { expr: q.expr } });
  }
  return { type: "quiz", questions: qs, timed: true };
}

// ================= Brain Puzzle =================
const CATEGORIES = {
  animals: ["dog", "cat", "horse", "cow", "lion", "tiger", "rabbit", "goat", "sheep", "elephant"],
  fruits: ["apple", "mango", "banana", "orange", "grapes", "papaya", "guava", "pear", "lemon"],
  vehicles: ["car", "bus", "train", "bicycle", "truck", "aeroplane", "scooter", "ship"],
  birds: ["parrot", "crow", "sparrow", "eagle", "peacock", "pigeon", "owl", "duck"],
  colours: ["red", "blue", "green", "yellow", "pink", "orange", "black", "white"],
  vegetables: ["potato", "carrot", "tomato", "onion", "spinach", "cabbage", "peas"],
  planets: ["Earth", "Mars", "Venus", "Jupiter", "Saturn", "Mercury"],
  furniture: ["chair", "table", "bed", "sofa", "desk", "cupboard"],
  stationery: ["pencil", "pen", "eraser", "ruler", "sharpener", "notebook"]
};
const ANALOGIES = [
  ["Bird : Fly", "Fish", "Swim", ["Run", "Jump", "Walk"]],
  ["Pen : Write", "Knife", "Cut", ["Eat", "Draw", "Sing"]],
  ["Hot : Cold", "Day", "Night", ["Sun", "Light", "Moon"]],
  ["Eye : See", "Ear", "Hear", ["Smell", "Taste", "Speak"]],
  ["Doctor : Hospital", "Teacher", "School", ["Market", "Farm", "Bank"]],
  ["Cow : Calf", "Dog", "Puppy", ["Kitten", "Cub", "Lamb"]],
  ["Hand : Glove", "Foot", "Sock", ["Hat", "Belt", "Scarf"]],
  ["Up : Down", "Left", "Right", ["Front", "Top", "Side"]],
  ["Book : Read", "Song", "Sing", ["Write", "Cook", "Paint"]],
  ["Day : Sun", "Night", "Moon", ["Rain", "Wind", "Cloud"]],
  ["Farmer : Field", "Sailor", "Ship", ["Hospital", "Class", "Court"]],
  ["Bee : Honey", "Cow", "Milk", ["Wool", "Eggs", "Silk"]]
];
const SYMBOLS = ["\uD83D\uDD34", "\uD83D\uDD35", "\uD83D\uDFE2", "\uD83D\uDFE1", "\uD83D\uDFE0", "\u2B50", "\u2764\uFE0F", "\u2B1B"];

function sequenceQuestion(rng, cls, L) {
  const kinds = ["arith", "arith", "missing"];
  if (cls >= 3) kinds.push("geo", "alt");
  if (cls >= 4) kinds.push("square");
  if (cls >= 5) kinds.push("fib");
  if (cls >= 6) kinds.push("cube");
  const kind = rng.pick(kinds);
  let terms, ans;
  const steps = grow(L, 4, 6, 0.2);
  if (kind === "arith" || kind === "missing") {
    const d = rng.pick(cls <= 2 ? [1, 2, 3, 5, 10] : cls <= 4 ? [2, 3, 4, 5, 6, 7, 9, 10, 11, 12] : [-3, -5, 6, 7, 8, 9, 11, 13, 15, 25]);
    const s = d > 0 ? rng.int(1, 20 + L) : rng.int(60, 120);
    terms = Array.from({ length: steps + 1 }, (_, i) => s + d * i);
    if (kind === "missing") { const at = rng.int(1, steps - 1); ans = terms[at]; terms[at] = "?"; }
    else { ans = terms.pop(); terms.push("?"); }
  } else if (kind === "geo") {
    const r = rng.pick([2, 3]), s = rng.int(1, 4);
    terms = Array.from({ length: 5 }, (_, i) => s * Math.pow(r, i)); ans = terms.pop(); terms.push("?");
  } else if (kind === "alt") {
    const a = rng.int(1, 5), b = rng.int(2, 8); let v = rng.int(1, 10); terms = [v];
    for (let i = 0; i < 6; i++) { v += i % 2 === 0 ? a : b; terms.push(v); } ans = terms.pop(); terms.push("?");
  } else if (kind === "square") {
    const s = rng.int(1, 4); terms = Array.from({ length: 5 }, (_, i) => (s + i) * (s + i)); ans = terms.pop(); terms.push("?");
  } else if (kind === "cube") {
    const s = rng.int(1, 3); terms = Array.from({ length: 4 }, (_, i) => Math.pow(s + i, 3)); ans = terms.pop(); terms.push("?");
  } else {
    const a = rng.int(1, 3), b = rng.int(1, 4); terms = [a, b]; for (let i = 0; i < 5; i++) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
    ans = terms.pop(); terms.push("?");
  }
  return numberChoice(rng, "What number comes in place of ?\n" + terms.join(",  "), ans, { min: 0, step: 1, extra: { meta: { sequence: terms.map(String), answerValue: ans } } });
}

function oddOne(rng) {
  const keys = Object.keys(CATEGORIES);
  const a = rng.pick(keys); let b = rng.pick(keys); while (b === a) b = rng.pick(keys);
  const group = rng.sample(CATEGORIES[a], 3), odd = rng.pick(CATEGORIES[b]);
  if (group.includes(odd)) return oddOne(rng);
  return choice(rng, "Which one does not belong with the others?", odd, group, { meta: { odd } });
}

function orderQuestion(rng, cls, L) {
  const n = cls <= 2 ? 3 : L > 6 ? 4 : 3;
  const people = rng.sample(NAMES, n);
  const trait = rng.pick([["taller", "tallest", "shortest"], ["older", "oldest", "youngest"], ["faster", "fastest", "slowest"], ["heavier", "heaviest", "lightest"]]);
  const facts = []; for (let i = 0; i < n - 1; i++) facts.push(people[i] + " is " + trait[0] + " than " + people[i + 1] + ".");
  const askTop = rng.chance(0.5), askMiddle = n >= 3 && rng.chance(0.3);
  const shownFacts = rng.shuffle(facts).join(" ");
  if (askMiddle) { const mid = people[Math.floor((n - 1) / 2)]; return choice(rng, shownFacts + " Who is in the middle?", mid, people.filter((p) => p !== mid), { meta: { order: people } }); }
  const target = askTop ? people[0] : people[n - 1];
  return choice(rng, shownFacts + " Who is the " + (askTop ? trait[1] : trait[2]) + "?", target, people.filter((p) => p !== target), { meta: { order: people } });
}

function patternQuestion(rng, cls, L) {
  const set = rng.sample(SYMBOLS, cls <= 2 ? 2 : 3);
  const shapes = cls <= 2 ? [[0, 1], [0, 0, 1]] : [[0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1], [0, 0, 1, 1], [0, 1, 2, 1]];
  const unit = rng.pick(shapes.filter((u) => Math.max(...u) < set.length));
  const seq = []; for (let i = 0; i < unit.length * 3 + 1; i++) seq.push(unit[i % unit.length]);
  const ans = seq.pop();
  const shown = seq.map((i) => set[i]).concat("?");
  return choice(rng, "What comes next in the pattern?\n" + shown.join("  "), set[ans], SYMBOLS.filter((s) => s !== set[ans]), { meta: { pattern: unit, answerIndex: ans } });
}

function analogyQuestion(rng) {
  const [pair, stem, ans, wrongs] = rng.pick(ANALOGIES);
  return choice(rng, pair + " :: " + stem + " : ?", ans, wrongs, { meta: { analogy: true } });
}

function codeQuestion(rng, cls, L) {
  const letters = rng.sample("ABCDEFGHIJ".split(""), 3), val = (c) => c.charCodeAt(0) - 64;
  if (rng.chance(0.5)) {
    const ans = letters.reduce((s, c) => s + val(c), 0);
    return numberChoice(rng, "If A = 1, B = 2, C = 3 and so on, what is the value of " + letters.join(" + ") + "?", ans, { min: 3, extra: { meta: { expr: letters.map((c) => val(c)).join(" + ") } } });
  }
  const word = rng.sample("ABCDE".split(""), 3).join(""); const ans = word.split("").reduce((s, c) => s + val(c), 0);
  return numberChoice(rng, "If A = 1, B = 2, C = 3 and so on, what is the total value of the letters in " + word + "?", ans, { min: 3, extra: { meta: { expr: word.split("").map((c) => val(c)).join(" + ") } } });
}

export function makeBrain({ rng, cls, level }) {
  if (level % 4 === 0) return makeMaze({ rng, cls, level });
  const makers = [() => sequenceQuestion(rng, cls, level), () => oddOne(rng), () => patternQuestion(rng, cls, level), () => orderQuestion(rng, cls, level)];
  if (cls >= 5) makers.push(() => analogyQuestion(rng), () => codeQuestion(rng, cls, level));
  const qs = [];
  for (let i = 0; i < 5; i++) qs.push(makers[(i + rng.int(0, makers.length - 1)) % makers.length]());
  return { type: "quiz", questions: qs };
}

// Maze made with a random walk that carves passages. cells[r][c] holds which sides are open.
export function makeMaze({ rng, cls, level }) {
  const size = Math.min({ 1: 4, 2: 5, 3: 6, 4: 6, 5: 7, 6: 8 }[cls] + Math.floor(level / 4), {  1: 8, 2: 9, 3: 11, 4: 12, 5: 14, 6: 15 }[cls]);
  const R = size, C = size;
  const open = Array.from({ length: R }, () => Array.from({ length: C }, () => ({ n: false, e: false, s: false, w: false })));
  const seen = Array.from({ length: R }, () => Array.from({ length: C }, () => false));
  const stack = [[0, 0]]; seen[0][0] = true;
  const dirs = [["n", -1, 0, "s"], ["e", 0, 1, "w"], ["s", 1, 0, "n"], ["w", 0, -1, "e"]];
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options = rng.shuffle(dirs).filter(([, dr, dc]) => r + dr >= 0 && r + dr < R && c + dc >= 0 && c + dc < C && !seen[r + dr][c + dc]);
    if (!options.length) { stack.pop(); continue; }
    const [d, dr, dc, back] = options[0];
    open[r][c][d] = true; open[r + dr][c + dc][back] = true; seen[r + dr][c + dc] = true; stack.push([r + dr, c + dc]);
  }
  // shortest way out, so stars can be given for taking a short path
  const dist = Array.from({ length: R }, () => Array.from({ length: C }, () => -1));
  const queue = [[0, 0]]; dist[0][0] = 0;
  while (queue.length) {
    const [r, c] = queue.shift();
    dirs.forEach(([d, dr, dc]) => { if (open[r][c][d] && dist[r + dr][c + dc] < 0) { dist[r + dr][c + dc] = dist[r][c] + 1; queue.push([r + dr, c + dc]); } });
  }
  return { type: "maze", rows: R, cols: C, cells: open, best: dist[R - 1][C - 1] };
}

// ================= Fraction Pizza =================
export function pizzaSvg(n, k) {
  const cx = 60, cy = 60, r = 52, parts = [];
  parts.push('<circle cx="60" cy="60" r="56" fill="#d9902f"/>');
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = n === 1 ? "" : "M" + cx + "," + cy + " L" + x0.toFixed(2) + "," + y0.toFixed(2) + " A" + r + "," + r + " 0 " + large + " 1 " + x1.toFixed(2) + "," + y1.toFixed(2) + " Z";
    parts.push('<path d="' + d + '" fill="' + (i < k ? "#d6402c" : "#f7d58b") + '" stroke="#7a4a12" stroke-width="1.5"/>');
  }
  return '<svg class="g-svg" viewBox="0 0 120 120" role="img" aria-label="A pizza cut into ' + n + " equal slices with " + k + ' shaded"><title>Pizza with ' + k + " of " + n + ' slices shaded</title>' + parts.join("") + "</svg>";
}
const frac = (a, b) => a + "/" + b;

export function makeFraction({ rng, cls, level }) {
  const denoms = { 1: [2, 4], 2: [2, 3, 4], 3: [2, 3, 4, 5, 6, 8], 4: [2, 3, 4, 5, 6, 8, 10], 5: [3, 4, 5, 6, 8, 10, 12], 6: [3, 4, 5, 6, 8, 9, 10, 12] }[cls];
  const upTo = Math.min(denoms.length, 2 + Math.floor(level / 2));
  const pool = denoms.slice(0, upTo);
  const makers = [];
  const identify = () => {
    const n = rng.pick(pool), k = rng.int(1, n - 1);
    const wrongs = [frac(rng.int(1, n - 1), n), frac(k, n + 1 + rng.int(0, 2)), frac(n - k, n), frac(k, n - 1 > 1 ? n - 1 : n + 2)];
    return choice(rng, "What fraction of the pizza is shaded?", frac(k, n), wrongs, { html: pizzaSvg(n, k), meta: { fraction: [k, n] } });
  };
  makers.push(identify, identify);
  if (cls >= 3) makers.push(() => {
    const n = rng.pick(pool.filter((d) => d >= 3).concat([4])), a = rng.int(1, n - 1); let b = rng.int(1, n - 1); while (b === a) b = rng.int(1, n - 1);
    const bigger = a > b ? a : b;
    return choice(rng, "Which fraction is bigger?", frac(bigger, n), [frac(Math.min(a, b), n)], { meta: { compare: [a, b, n] } });
  });
  if (cls >= 4) makers.push(() => {
    const d = rng.pick([2, 3, 4, 5]), k = rng.int(1, d - 1), m = rng.int(2, 4);
    return numberChoice(rng, frac(k, d) + " = ? / " + (d * m), k * m, { min: 1, extra: { meta: { equivalent: [k, d, m] } } });
  });
  if (cls >= 5) makers.push(() => {
    const d = rng.pick([2, 3, 4, 5]), k = rng.int(1, d - 1), m = rng.int(2, 5);
    const num = k * m, den = d * m, g = gcd(num, den);
    return choice(rng, "Write " + frac(num, den) + " in its simplest form.", frac(num / g, den / g), [frac(num / g + 1, den / g), frac(num, den - 1), frac(num / g, den / g + 1), frac(num - 1, den)], { meta: { simplify: [num, den] } });
  });
  if (cls >= 5) makers.push(() => {
    const d = rng.pick([5, 6, 7, 8, 9, 10, 12]), a = rng.int(1, d - 2), b = rng.int(1, d - 1 - a);
    const sum = a + b, g = gcd(sum, d);
    return choice(rng, frac(a, d) + " + " + frac(b, d) + " = ?", frac(sum / g, d / g), [frac(sum, d + d), frac(a + b + 1, d), frac(sum / g + 1, d / g), frac(a * b, d)], { meta: { addFractions: [a, b, d] } });
  });
  if (cls >= 6) makers.push(() => {
    const d = rng.pick([2, 3, 4, 5]), m = rng.int(2, 4), a = 1, b = rng.int(1, d * m - 1);
    const num = a * m + b, den = d * m; const g = gcd(num, den);
    return choice(rng, frac(a, d) + " + " + frac(b, den) + " = ?", frac(num / g, den / g), [frac(a + b, d + den), frac(num / g + 1, den / g), frac(num, den + 1), frac(num / g, den / g + 1)], { meta: { addUnlike: [a, d, b, den] } });
  });
  const qs = []; for (let i = 0; i < 5; i++) qs.push(makers[(i + rng.int(0, makers.length - 1)) % makers.length]());
  return { type: "quiz", questions: qs };
}

// ================= Money Master =================
const NOTE_COLOURS = { 10: "#c98a4b", 20: "#e8903a", 50: "#4aa3c7", 100: "#5aa86b", 200: "#e8b73a", 500: "#8f9aa6" };
export function moneySvg(items) {
  const w = 56, h = 40, gap = 6, perRow = 5, rows = Math.ceil(items.length / perRow);
  const width = Math.min(items.length, perRow) * (w + gap), height = rows * (h + gap);
  const parts = items.map((it, i) => {
    const x = (i % perRow) * (w + gap), y = Math.floor(i / perRow) * (h + gap);
    if (it.type === "coin") return '<g transform="translate(' + x + "," + y + ')"><circle cx="' + (w / 2) + '" cy="' + (h / 2) + '" r="18" fill="#e3c25a" stroke="#8a6d1d" stroke-width="2"/><text x="' + (w / 2) + '" y="' + (h / 2 + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#4a3a08">\u20B9' + it.value + "</text></g>";
    return '<g transform="translate(' + x + "," + y + ')"><rect width="' + w + '" height="' + h + '" rx="4" fill="' + NOTE_COLOURS[it.value] + '" stroke="#244" stroke-width="1.5"/><text x="' + (w / 2) + '" y="' + (h / 2 + 5) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#12202b">\u20B9' + it.value + "</text></g>";
  });
  const label = items.map((it) => (it.type === "coin" ? "coin" : "note") + " of " + it.value + " rupees").join(", ");
  return '<svg class="g-svg wide" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + esc(label) + '"><title>' + esc(label) + "</title>" + parts.join("") + "</svg>";
}

export function makeMoney({ rng, cls, level }) {
  const coins = [1, 2, 5, 10], notes = [10, 20, 50, 100, 200, 500];
  const qs = [];
  const totalQ = () => {
    const count = Math.min(7, 2 + Math.floor(level / 3) + (cls > 2 ? 1 : 0));
    const items = [];
    for (let i = 0; i < count; i++) {
      const useNote = cls >= 2 && rng.chance(level > 3 ? 0.5 : 0.3);
      items.push(useNote ? { type: "note", value: rng.pick(cls <= 2 ? [10, 20, 50] : cls <= 4 ? [10, 20, 50, 100] : notes) } : { type: "coin", value: rng.pick(coins) });
    }
    const sum = items.reduce((s, it) => s + it.value, 0);
    return numberChoice(rng, "How much money is there in all?", sum, { min: 1, step: 1, fmt: rupees, extra: { html: moneySvg(items), meta: { expr: items.map((i) => i.value).join(" + ") } } });
  };
  const changeQ = () => {
    const price = rng.int(3, Math.min(95, 20 + level * 3)), pay = rng.pick([10, 20, 50, 100].filter((p) => p > price));
    const n1 = nm(rng);
    return numberChoice(rng, n1 + " buys a toy for " + rupees(price) + " and pays " + rupees(pay) + ". How much change does " + n1 + " get back?", pay - price, { min: 1, fmt: rupees, extra: { meta: { expr: pay + " - " + price } } });
  };
  const billQ = () => {
    const qty = rng.int(2, 9), each = rng.pick([5, 8, 10, 12, 15, 20, 25]);
    return numberChoice(rng, qty + " notebooks cost " + rupees(each) + " each. What is the total cost?", qty * each, { min: 1, fmt: rupees, step: 5, extra: { meta: { expr: qty + " * " + each } } });
  };
  const needQ = () => {
    const have = rng.int(20, 90), price = have + rng.int(5, 60);
    return numberChoice(rng, "Anaya has " + rupees(have) + ". A book costs " + rupees(price) + ". How much more money does she need?", price - have, { min: 1, fmt: rupees, extra: { meta: { expr: price + " - " + have } } });
  };
  const discountQ = () => {
    const price = rng.pick([200, 300, 400, 500, 800, 1000]), p = rng.pick([10, 20, 25, 50]);
    return numberChoice(rng, "A bag costs " + rupees(price) + ". There is a discount of " + p + "%. How much do you pay?", price - (price * p) / 100, { min: 1, fmt: rupees, step: 10, extra: { meta: { expr: price + " - (" + price + " * " + p + " / 100)" } } });
  };
  const profitQ = () => {
    const cost = rng.int(5, 40) * 10, gain = rng.int(1, 8) * 10;
    return numberChoice(rng, "A shopkeeper buys a toy for " + rupees(cost) + " and sells it for " + rupees(cost + gain) + ". What is the profit?", gain, { min: 1, fmt: rupees, step: 10, extra: { meta: { expr: (cost + gain) + " - " + cost } } });
  };
  const makers = [totalQ, totalQ];
  if (cls >= 2) makers.push(changeQ);
  if (cls >= 3) makers.push(billQ, needQ);
  if (cls >= 5) makers.push(discountQ);
  if (cls >= 6) makers.push(profitQ);
  for (let i = 0; i < 5; i++) qs.push(makers[(i + rng.int(0, makers.length - 1)) % makers.length]());
  return { type: "quiz", questions: qs };
}

// ================= Clock Master =================
export function clockSvg(h, m) {
  const parts = ['<circle cx="60" cy="60" r="56" fill="#fff8e6" stroke="#244" stroke-width="3"/>'];
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    parts.push('<text x="' + (60 + 43 * Math.cos(a)).toFixed(1) + '" y="' + (60 + 43 * Math.sin(a) + 5).toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="700" fill="#12202b">' + i + "</text>");
  }
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * 2 * Math.PI - Math.PI / 2, long = i % 5 === 0, r0 = long ? 50 : 53;
    parts.push('<line x1="' + (60 + r0 * Math.cos(a)).toFixed(1) + '" y1="' + (60 + r0 * Math.sin(a)).toFixed(1) + '" x2="' + (60 + 56 * Math.cos(a) * 0.98).toFixed(1) + '" y2="' + (60 + 56 * Math.sin(a) * 0.98).toFixed(1) + '" stroke="#244" stroke-width="' + (long ? 2 : 1) + '"/>');
  }
  const ha = (((h % 12) + m / 60) / 12) * 2 * Math.PI - Math.PI / 2, ma = (m / 60) * 2 * Math.PI - Math.PI / 2;
  parts.push('<line x1="60" y1="60" x2="' + (60 + 26 * Math.cos(ha)).toFixed(1) + '" y2="' + (60 + 26 * Math.sin(ha)).toFixed(1) + '" stroke="#12202b" stroke-width="5" stroke-linecap="round"/>');
  parts.push('<line x1="60" y1="60" x2="' + (60 + 38 * Math.cos(ma)).toFixed(1) + '" y2="' + (60 + 38 * Math.sin(ma)).toFixed(1) + '" stroke="#d6402c" stroke-width="3" stroke-linecap="round"/>');
  parts.push('<circle cx="60" cy="60" r="4" fill="#12202b"/>');
  return '<svg class="g-svg" viewBox="0 0 120 120" role="img" aria-label="A clock showing ' + h + ":" + String(m).padStart(2, "0") + '"><title>Clock face</title>' + parts.join("") + "</svg>";
}
export const fmtTime = (h, m) => ((h + 11) % 12 + 1) + ":" + String(m).padStart(2, "0");

export function makeClock({ rng, cls, level }) {
  const stepFor = () => (cls === 1 ? (level < 4 ? 60 : 30) : cls === 2 ? (level < 4 ? 30 : 15) : cls === 3 ? (level < 5 ? 15 : 5) : cls === 4 ? 5 : 1);
  const read = () => {
    const step = stepFor(); const h = rng.int(1, 12), m = step === 60 ? 0 : rng.int(0, Math.floor(59 / step)) * step;
    const wrongs = [fmtTime(h, (m + 30) % 60), fmtTime(((h + 11) % 12) + 1, m), fmtTime(h % 12 + 1, m), fmtTime(m === 0 ? (h % 12) + 1 : h, m === 0 ? 30 : (m + 15) % 60), fmtTime(m % 12 === 0 ? 12 : Math.max(1, m / 5 | 0), h * 5 % 60)];
    return choice(rng, "What time does the clock show?", fmtTime(h, m), wrongs, { html: clockSvg(h, m), meta: { time: [h, m] } });
  };
  const after = () => {
    const h = rng.int(1, 12), m = rng.int(0, 11) * 5, add = rng.pick([10, 15, 20, 25, 30, 40, 45, 50, 75, 90]);
    const total = h * 60 + m + add, nh = Math.floor(total / 60) % 12, nm2 = total % 60;
    const ans = fmtTime(nh === 0 ? 12 : nh, nm2);
    return choice(rng, "The clock shows " + fmtTime(h, m) + ". What time will it be after " + add + " minutes?", ans, [fmtTime(nh === 0 ? 12 : nh, (nm2 + 10) % 60), fmtTime(((nh + 1) % 12) || 12, nm2), fmtTime(nh === 0 ? 12 : nh, (nm2 + 50) % 60), fmtTime(((nh + 11) % 12) || 12, nm2)], { html: clockSvg(h, m), meta: { after: [h, m, add] } });
  };
  const duration = () => {
    const sh = rng.int(1, 11), sm = rng.pick([0, 15, 30, 45]), dm = rng.pick([40, 55, 70, 85, 100, 115, 130]);
    const tot = sh * 60 + sm + dm, eh = Math.floor(tot / 60), em = tot % 60;
    const hrs = Math.floor(dm / 60), mins = dm % 60;
    const fmt = (hh, mm) => (hh ? hh + " hour" + (hh > 1 ? "s " : " ") : "") + (mm ? mm + " minutes" : "").trim();
    const ans = fmt(hrs, mins).trim();
    const wrongs = [fmt(hrs, (mins + 10) % 60).trim(), fmt(hrs + 1, mins).trim(), fmt(Math.max(0, hrs - 1), (mins + 20) % 60).trim(), fmt(hrs, (mins + 40) % 60).trim()].filter((x) => x);
    return choice(rng, "A film starts at " + fmtTime(sh, sm) + " and ends at " + fmtTime(eh, em) + ". How long is the film?", ans, wrongs, { meta: { duration: [sh, sm, dm] } });
  };
  const convert = () => {
    const h24 = rng.int(13, 23), m = rng.pick([0, 15, 30, 45]);
    const ans = (h24 - 12) + ":" + String(m).padStart(2, "0") + " PM";
    return choice(rng, "What is " + h24 + ":" + String(m).padStart(2, "0") + " in 12-hour time?", ans, [(h24 - 12) + ":" + String(m).padStart(2, "0") + " AM", (h24 - 11) + ":" + String(m).padStart(2, "0") + " PM", h24 + ":" + String(m).padStart(2, "0") + " PM"], { meta: { convert: [h24, m] } });
  };
  const makers = [read, read];
  if (cls >= 4 && level >= 2) makers.push(after);
  if (cls >= 5) makers.push(duration);
  if (cls >= 6) makers.push(convert);
  const qs = []; for (let i = 0; i < 5; i++) qs.push(makers[(i + rng.int(0, makers.length - 1)) % makers.length]());
  return { type: "quiz", questions: qs };
}
