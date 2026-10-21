// Small helpers shared by the question generators.

// Builds a multiple choice question. Wrong answers are de-duplicated and the options are shuffled.
export function choice(rng, prompt, correct, wrongs, extra = {}) {
  const seen = new Set([String(correct)]);
  const opts = [String(correct)];
  for (const w of wrongs) { const t = String(w); if (!seen.has(t) && t !== "") { seen.add(t); opts.push(t); } if (opts.length === 4) break; }
  const shuffled = rng.shuffle(opts);
  return { input: "choice", prompt, options: shuffled, answer: shuffled.indexOf(String(correct)), ...extra };
}

// Number options near the right answer: small slips such as off by one, off by ten, or swapped digits.
export function numberChoice(rng, prompt, answer, { min = -Infinity, step = 1, fmt = String, extra = {} } = {}) {
  const want = new Set([answer]);
  const deltas = rng.shuffle([1, -1, 2, -2, 3, -3, 10, -10, step, -step, 2 * step, -2 * step, 5, -5, 100, -100]);
  for (const d of deltas) { const v = Math.round((answer + d) * 1000) / 1000; if (v >= min && !want.has(v)) want.add(v); if (want.size === 4) break; }
  const s = String(answer);
  if (want.size < 4 && s.length >= 2) { const sw = Number(s.slice(0, -2) + s.slice(-1) + s.slice(-2, -1)); if (Number.isFinite(sw) && sw >= min) want.add(sw); }
  let bump = 4; while (want.size < 4) { const v = answer + bump * step; if (v >= min) want.add(v); bump++; }
  const opts = rng.shuffle([...want].slice(0, 4));
  const idx = opts.indexOf(answer);
  return { input: "choice", prompt, options: opts.map(fmt), answer: idx, ...extra };
}

export const NAMES = ["Ravi", "Sita", "Aman", "Priya", "Kabir", "Meena", "Arjun", "Isha", "Rohan", "Anaya", "Dev", "Riya", "Kunal", "Tara", "Vikram", "Nisha"];
export const THINGS = ["apples", "pencils", "marbles", "books", "stickers", "balloons", "mangoes", "toffees", "coins", "flowers", "pens", "cards"];

// Picks items that were not used recently. Returns the chosen items and their ids so they can be remembered.
export function pickFresh(rng, items, count, seenSet, prefix) {
  const fresh = [], stale = [];
  items.forEach((it, i) => ((seenSet && seenSet.has(prefix + i)) ? stale : fresh).push(i));
  const chosen = rng.shuffle(fresh).slice(0, count);
  if (chosen.length < count) chosen.push(...rng.shuffle(stale).slice(0, count - chosen.length));
  return chosen.map((i) => ({ item: items[i], id: prefix + i }));
}

export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const rupees = (n) => "\u20B9" + n;
export const bandOf = (cls) => (cls <= 2 ? "a" : cls <= 4 ? "b" : "c");
