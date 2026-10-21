// Core logic for the learning games: random numbers, nickname rules, stars, points, badges and saved progress.
// Pure functions only (no page code) so they can be tested on their own.

export const CLASSES = [1, 2, 3, 4, 5, 6];
export const QUESTIONS_PER_LEVEL = 5;
export const STORE_KEY = "ga_games_v1";

// ---------- random numbers (the same seed always gives the same questions) ----------
export function hashSeed(str) {
  let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) * 4294967296 + (h1 >>> 0) >>> 0;
}

export function makeRng(seed) {
  let a = (typeof seed === "number" ? seed : hashSeed(seed)) >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; },
    sample: (arr, n) => rng.shuffle(arr).slice(0, n)
  };
  return rng;
}

// ---------- dates ----------
export const dayKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export function daysBetween(a, b) {
  const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

// ---------- nickname rules ----------
const BAD = ["fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "slut", "porn", "sex", "nude", "chut", "gand", "randi", "bhosd", "madarc", "behenc", "lund", "harami", "kutta", "kamina", "saala", "idiot", "stupid", "hate", "kill", "die", "ugly", "fat"];
export function cleanNickname(raw) { return String(raw || "").replace(/\s+/g, " ").trim(); }
export function checkNickname(raw) {
  const name = cleanNickname(raw);
  if (name.length < 3) return { ok: false, name, message: "Your nickname needs at least 3 letters." };
  if (name.length > 14) return { ok: false, name, message: "Your nickname can have at most 14 letters." };
  if (!/^[A-Za-z][A-Za-z0-9_ ]*$/.test(name)) return { ok: false, name, message: "Use only English letters, numbers and _ . Start with a letter." };
  if ((name.match(/\d/g) || []).length > 4) return { ok: false, name, message: "Please use fewer numbers in your nickname." };
  const flat = name.toLowerCase().replace(/[^a-z]/g, "");
  if (BAD.some((w) => flat.includes(w))) return { ok: false, name, message: "Please choose a kind and friendly nickname." };
  return { ok: true, name, message: "" };
}

// ---------- levels, stars and points ----------
export function starsForRatio(ratio) { return ratio >= 1 ? 3 : ratio >= 0.8 ? 2 : ratio >= 0.6 ? 1 : 0; }
export const levelPointsBonus = (stars) => stars * 15;

// ---------- the player ----------
export function newPlayer(nickname, cls, now = Date.now()) {
  return {
    id: "p" + hashSeed(nickname + "|" + cls + "|" + now + "|" + Math.random()).toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    nickname: cleanNickname(nickname), cls, createdAt: now,
    points: 0, stars: 0, badges: {}, progress: {}, seen: {},
    stats: { levels: 0, perfect: 0, tried: {}, classesPlayed: {}, dailyCount: 0, streak: 0, bestStreak: 0, lastDaily: "", dailyDone: {} }
  };
}

export function gameProgress(player, game, cls) {
  const g = (player.progress[game] = player.progress[game] || {});
  return (g[cls] = g[cls] || { unlocked: 1, stars: {}, plays: 0 });
}

// The highest level the player has passed (with at least 1 star) in a game, in any class.
export const maxLevelReached = (player, game) => {
  const g = player.progress[game] || {};
  let m = 0;
  Object.keys(g).forEach((c) => Object.keys(g[c].stars || {}).forEach((l) => { if (g[c].stars[l] >= 1) m = Math.max(m, Number(l)); }));
  return m;
};

export function totalStarsFor(player, game, cls) {
  const p = (player.progress[game] || {})[cls];
  return p ? Object.keys(p.stars || {}).reduce((s, l) => s + p.stars[l], 0) : 0;
}

// Saves the result of one finished level. Returns the badges that were just earned.
export function recordLevel(player, { game, cls, level, stars, points }) {
  const p = gameProgress(player, game, cls);
  const best = p.stars[level] || 0;
  if (stars > best) { player.stars += stars - best; p.stars[level] = stars; }
  if (stars >= 1 && level + 1 > p.unlocked) p.unlocked = level + 1;
  p.plays++;
  player.points += Math.max(0, points);
  player.stats.levels++;
  if (stars === 3) player.stats.perfect++;
  player.stats.tried[game] = true;
  player.stats.classesPlayed[cls] = true;
  return awardBadges(player);
}

export function recordDaily(player, score, date = dayKey()) {
  const st = player.stats;
  if (st.dailyDone[date] !== undefined) return { first: false, newBadges: [] };
  st.dailyDone[date] = score;
  st.dailyCount++;
  st.streak = st.lastDaily && daysBetween(st.lastDaily, date) === 1 ? st.streak + 1 : 1;
  st.bestStreak = Math.max(st.bestStreak, st.streak);
  st.lastDaily = date;
  const keep = Object.keys(st.dailyDone).sort().slice(-40);
  const trimmed = {}; keep.forEach((k) => { trimmed[k] = st.dailyDone[k]; });
  st.dailyDone = trimmed;
  player.points += score;
  return { first: true, newBadges: awardBadges(player) };
}

// ---------- badges ----------
const GAME_IDS = ["math", "speed", "tables", "wordmaster", "match", "science", "gk", "brain", "scramble", "hindi", "spelling", "fraction", "money", "clock", "memory", "daily", "treasure"];
export const TOTAL_GAMES = GAME_IDS.length;
const lvl = (id, n) => (pl) => maxLevelReached(pl, id) >= n;
export const BADGES = [
  { id: "first", name: "First Steps", desc: "Finish your first level.", test: (p) => p.stats.levels >= 1 },
  { id: "stars10", name: "Star Collector", desc: "Collect 10 stars.", test: (p) => p.stars >= 10 },
  { id: "stars50", name: "Star Hunter", desc: "Collect 50 stars.", test: (p) => p.stars >= 50 },
  { id: "stars150", name: "Star Master", desc: "Collect 150 stars.", test: (p) => p.stars >= 150 },
  { id: "pts500", name: "Point Pro", desc: "Score 500 points.", test: (p) => p.points >= 500 },
  { id: "pts2500", name: "Point Champion", desc: "Score 2,500 points.", test: (p) => p.points >= 2500 },
  { id: "pts10000", name: "Point Legend", desc: "Score 10,000 points.", test: (p) => p.points >= 10000 },
  { id: "perfect5", name: "Perfect Five", desc: "Get 3 stars on 5 levels.", test: (p) => p.stats.perfect >= 5 },
  { id: "perfect25", name: "Super Star", desc: "Get 3 stars on 25 levels.", test: (p) => p.stats.perfect >= 25 },
  { id: "explorer", name: "Explorer", desc: "Try 5 different games.", test: (p) => Object.keys(p.stats.tried).length >= 5 },
  { id: "allgames", name: "Game Master", desc: "Try every game.", test: (p) => GAME_IDS.every((g) => p.stats.tried[g] || g === "daily" && p.stats.dailyCount > 0) },
  { id: "hopper", name: "Class Hopper", desc: "Play in 3 different classes.", test: (p) => Object.keys(p.stats.classesPlayed).length >= 3 },
  { id: "mathwhiz", name: "Maths Whiz", desc: "Reach level 10 in Math Challenge.", test: lvl("math", 10) },
  { id: "speedster", name: "Speedster", desc: "Reach level 10 in Speed Maths.", test: lvl("speed", 10) },
  { id: "tablechamp", name: "Table Champion", desc: "Reach level 10 in Table Champion.", test: lvl("tables", 10) },
  { id: "wordwizard", name: "Word Wizard", desc: "Reach level 10 in Word Master.", test: lvl("wordmaster", 10) },
  { id: "spellbee", name: "Spelling Star", desc: "Reach level 10 in Spelling Bee.", test: lvl("spelling", 10) },
  { id: "unscramble", name: "Unscrambler", desc: "Reach level 10 in Word Scramble.", test: lvl("scramble", 10) },
  { id: "scientist", name: "Little Scientist", desc: "Reach level 10 in Science Explorer.", test: lvl("science", 10) },
  { id: "gkgenius", name: "GK Genius", desc: "Reach level 10 in GK Master.", test: lvl("gk", 10) },
  { id: "puzzlepro", name: "Puzzle Pro", desc: "Reach level 10 in Brain Puzzle.", test: lvl("brain", 10) },
  { id: "hindihero", name: "Hindi Hero", desc: "Reach level 10 in Hindi Varnamala.", test: lvl("hindi", 10) },
  { id: "timekeeper", name: "Time Keeper", desc: "Reach level 10 in Clock Master.", test: lvl("clock", 10) },
  { id: "moneywiz", name: "Money Wizard", desc: "Reach level 10 in Money Master.", test: lvl("money", 10) },
  { id: "pizzapro", name: "Pizza Pro", desc: "Reach level 10 in Fraction Pizza.", test: lvl("fraction", 10) },
  { id: "memoryace", name: "Memory Ace", desc: "Reach level 10 in Memory Cards.", test: lvl("memory", 10) },
  { id: "matchmaker", name: "Match Maker", desc: "Reach level 10 in Match the Pair.", test: lvl("match", 10) },
  { id: "treasure", name: "Treasure Hunter", desc: "Reach level 10 in Treasure Hunt.", test: lvl("treasure", 10) },
  { id: "level25", name: "Level 25 Hero", desc: "Reach level 25 in any game.", test: (p) => GAME_IDS.some((g) => maxLevelReached(p, g) >= 25) },
  { id: "level50", name: "Unstoppable", desc: "Reach level 50 in any game.", test: (p) => GAME_IDS.some((g) => maxLevelReached(p, g) >= 50) },
  { id: "daily1", name: "Daily Starter", desc: "Play your first Daily Quiz Battle.", test: (p) => p.stats.dailyCount >= 1 },
  { id: "daily7", name: "Week Warrior", desc: "Play the Daily Quiz 7 days in a row.", test: (p) => p.stats.bestStreak >= 7 }
];

export function awardBadges(player) {
  const fresh = [];
  BADGES.forEach((b) => { if (!player.badges[b.id] && b.test(player)) { player.badges[b.id] = Date.now(); fresh.push(b); } });
  return fresh;
}

// ---------- saving on the device ----------
export function emptyStore() { return { players: {}, current: "", sound: true }; }
export function loadStore(storage) {
  try { const raw = storage.getItem(STORE_KEY); const s = raw ? JSON.parse(raw) : null; return s && s.players ? s : emptyStore(); } catch (e) { return emptyStore(); }
}
export function saveStore(storage, store) { try { storage.setItem(STORE_KEY, JSON.stringify(store)); return true; } catch (e) { return false; } }
