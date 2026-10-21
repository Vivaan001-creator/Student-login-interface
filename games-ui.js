// The games screen: choosing a player, the game list, playing levels, results, badges and the leaderboard.
import { CLASSES, QUESTIONS_PER_LEVEL, checkNickname, newPlayer, gameProgress, totalStarsFor, recordLevel, recordDaily, starsForRatio, levelPointsBonus, BADGES, loadStore, saveStore, dayKey, TOTAL_GAMES, maxLevelReached } from "./games-core.js";
import { GAMES, getGame, generateLevel, dailySet } from "./games-gen.js";
import { makeSound, speak, canSpeak, confetti, starSvg, starsRow, gameIcon, badgeSvg, shapeSvg } from "./games-fx.js";
import { syncPlayer, fetchBoard, submitDaily, fetchDaily } from "./games-board.js";

const app = document.getElementById("app");
let store = loadStore(window.localStorage);
let player = store.players[store.current] || null;
const sfx = makeSound(() => store.sound !== false);
const ui = { gameCls: {}, showAll: false, boardTab: "overall", boardCls: 0 };
let timers = [];
let play = null;           // the level being played
let keyHandler = null;

const esc = (s) => String(s === undefined || s === null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const nl = (s) => esc(s).replace(/\n/g, "<br>");
const save = () => saveStore(window.localStorage, store);
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
function clearTimers() { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers = []; }
function clearKeys() { if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; } }
const isHindi = (s) => /[\u0900-\u097F]/.test(String(s));

// ---------- moving between screens (the phone's Back button works too) ----------
function navigate(view, params = {}, replace = false) {
  const st = { view, params };
  if (replace) history.replaceState(st, ""); else history.pushState(st, "");
  render(st);
}
window.addEventListener("popstate", (e) => { const st = e.state && e.state.view ? e.state : { view: player ? "hub" : "profiles", params: {} }; render(st); });

function render(st) {
  clearTimers(); clearKeys(); play = null;
  document.body.classList.toggle("g-playing", false);
  if (!player && st.view !== "profiles") st = { view: "profiles", params: {} };
  const views = { profiles: viewProfiles, hub: viewHub, game: viewGame, play: (p) => viewGame({ id: p.id }), daily: viewDaily, board: viewBoard, badges: viewBadges };
  (views[st.view] || viewHub)(st.params || {});
  renderHeaderChip();
  const h = app.querySelector("h1, h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
}

function renderHeaderChip() {
  const chip = document.getElementById("playerChip"), snd = document.getElementById("soundBtn");
  if (chip) chip.innerHTML = player ? '<button type="button" class="g-chipbtn" data-act="switch" aria-label="Switch player. Playing as ' + esc(player.nickname) + '">' + esc(player.nickname) + " &middot; Class " + player.cls + "</button>" : "";
  if (snd) { snd.setAttribute("aria-pressed", store.sound !== false ? "true" : "false"); snd.textContent = store.sound !== false ? "Sound on" : "Sound off"; }
}

// ---------- choose or create a player ----------
function viewProfiles() {
  const players = Object.values(store.players).sort((a, b) => b.points - a.points);
  app.innerHTML = '<section class="g-card"><h1>' + (players.length ? "Who is playing?" : "Welcome to Learning Games") + "</h1>" +
    (players.length ? '<ul class="g-players">' + players.map((p) => '<li><button type="button" class="g-playerbtn" data-act="playAs" data-id="' + esc(p.id) + '"><strong>' + esc(p.nickname) + "</strong><span>Class " + p.cls + " &middot; " + p.stars + " stars &middot; " + p.points + " points</span></button>" +
      '<button type="button" class="g-link" data-act="removePlayer" data-id="' + esc(p.id) + '" aria-label="Remove player ' + esc(p.nickname) + '">Remove</button></li>').join("") + "</ul>" : "<p>Play fun games, win stars and badges, and climb the leaderboard.</p>") +
    '<form id="newPlayer" novalidate><h2>' + (players.length ? "New player" : "Make your player") + '</h2>' +
    '<label for="nick">Nickname</label><input id="nick" type="text" maxlength="14" autocomplete="off" autocapitalize="words" aria-describedby="nickHelp nickErr"><p class="g-help" id="nickHelp">Use a nickname, not your real name. Never share your phone number or address.</p><p class="g-err" id="nickErr" role="alert"></p>' +
    '<fieldset class="g-fieldset"><legend>Your class</legend><div class="g-chips">' + CLASSES.map((c) => '<label class="g-chip"><input type="radio" name="cls" value="' + c + '"><span>Class ' + c + "</span></label>").join("") + '</div><p class="g-err" id="clsErr" role="alert"></p></fieldset>' +
    '<button type="submit" class="g-btn primary">Start playing</button></form>' +
    '<p class="g-help">Your progress is saved on this device. The leaderboard shows only your nickname, class and scores.</p></section>';
}

// ---------- the home screen with all games ----------
function viewHub() {
  const st = player.stats;
  const classTotals = (g) => totalStarsFor(player, g.id, player.cls);
  const today = dayKey(), doneToday = st.dailyDone[today] !== undefined;
  app.innerHTML = '<section class="g-hub"><h1>Hi, ' + esc(player.nickname) + "!</h1>" +
    '<p class="g-sub">Class ' + player.cls + ". Pick a game and start playing.</p>" +
    '<div class="g-stats" role="list"><div role="listitem"><b>' + player.points + "</b><span>Points</span></div><div role=\"listitem\"><b>" + player.stars + "</b><span>Stars</span></div><div role=\"listitem\"><b>" + Object.keys(player.badges).length + "</b><span>Badges</span></div><div role=\"listitem\"><b>" + st.streak + "</b><span>Day streak</span></div></div>" +
    '<button type="button" class="g-daily" data-act="openDaily">' + gameIcon("daily", "#b45309", 48) + '<span><strong>Daily Quiz Battle</strong><small>' + (doneToday ? "Done today. Score " + st.dailyDone[today] + ". Come back tomorrow!" : "10 new questions every day. Play now!") + "</small></span></button>" +
    '<div class="g-grid">' + GAMES.map((g) => '<button type="button" class="g-game" data-act="openGame" data-id="' + g.id + '" style="--accent:' + g.color + '">' + gameIcon(g.icon, g.color, 52) + "<strong>" + esc(g.name) + "</strong><small>" + esc(g.learn) + "</small><em>" + (classTotals(g) ? classTotals(g) + " stars" : "New") + "</em></button>").join("") + "</div>" +
    '<div class="g-bottom"><button type="button" class="g-btn" data-act="openBoard">Leaderboard</button><button type="button" class="g-btn" data-act="openBadges">My badges</button></div></section>';
}

// ---------- one game: choose a class and a level ----------
function classChips(selected, act) {
  return '<div class="g-chips" role="radiogroup" aria-label="Choose a class">' + CLASSES.map((c) => '<button type="button" role="radio" aria-checked="' + (c === selected) + '" class="g-chip' + (c === selected ? " on" : "") + '" data-act="' + act + '" data-cls="' + c + '"><span>Class ' + c + "</span></button>").join("") + "</div>";
}

function viewGame(params) {
  const g = getGame(params.id);
  const cls = ui.gameCls[g.id] || player.cls;
  const p = gameProgress(player, g.id, cls);
  const first = ui.showAll ? 1 : Math.max(1, p.unlocked - 17), last = p.unlocked + 2;
  let levels = "";
  for (let n = first; n <= last; n++) {
    const s = p.stars[n] || 0, locked = n > p.unlocked;
    levels += '<button type="button" class="g-level' + (n === p.unlocked ? " now" : "") + '" data-act="startLevel" data-id="' + g.id + '" data-level="' + n + '"' + (locked ? ' disabled aria-label="Level ' + n + ', locked"' : ' aria-label="Level ' + n + (s ? ", " + s + " stars" : "") + '"') + "><b>" + n + "</b>" + (locked ? '<span class="g-lock" aria-hidden="true">Locked</span>' : starsRow(s, 14)) + "</button>";
  }
  app.innerHTML = '<section class="g-gamepage" style="--accent:' + g.color + '"><button type="button" class="g-back" data-act="back">&larr; All games</button>' +
    '<div class="g-gamehead">' + gameIcon(g.icon, g.color, 64) + "<div><h1>" + esc(g.name) + "</h1><p>" + esc(g.learn) + "</p></div></div>" +
    "<h2>Choose your class</h2>" + classChips(cls, "gameClass") +
    '<p class="g-sub">Class ' + cls + ": " + totalStarsFor(player, g.id, cls) + " stars collected. Levels never end, and every level has new questions.</p>" +
    '<button type="button" class="g-btn primary big" data-act="startLevel" data-id="' + g.id + '" data-level="' + p.unlocked + '">Play level ' + p.unlocked + "</button>" +
    "<h2>Levels</h2>" + (first > 1 ? '<button type="button" class="g-link" data-act="showAll">Show earlier levels</button>' : "") +
    '<div class="g-levels">' + levels + "</div></section>";
}

// ---------- starting a level ----------
function startLevel(gameId, cls, level) {
  const p = gameProgress(player, gameId, cls);
  p.att = p.att || {};
  const attempt = (p.att[level] = (p.att[level] || 0) + 1);
  const key = gameId + cls;
  const lv = generateLevel(gameId, cls, level, attempt, player.id, new Set(player.seen[key] || []));
  if (lv.used) player.seen[key] = (player.seen[key] || []).concat(lv.used).slice(-120);
  save();
  const st = { view: "play", params: { id: gameId } };
  if (history.state && history.state.view === "play") history.replaceState(st, ""); else history.pushState(st, "");
  runLevel(lv);
}

function runLevel(lv) {
  clearTimers(); clearKeys();
  document.body.classList.add("g-playing");
  play = { lv, qi: 0, correct: 0, streak: 0, points: 0, locked: false, typed: "", placed: [], dots: [] };
  if (lv.type === "quiz") renderQuestion();
  else if (lv.type === "match") startMatch();
  else if (lv.type === "memory") startMemory();
  else if (lv.type === "maze") startMaze();
}

const rich = (s) => nl(s).replace(/([\u0900-\u097F]+)/g, '<span lang="hi" class="g-hi">$1</span>');
const GOOD = ["Correct!", "Great!", "Well done!", "Super!", "Awesome!", "Brilliant!"];
const answerText = (q) => (q.input === "choice" ? q.options[q.answer] : String(q.answer).toUpperCase());

function topBar(extra = "") {
  const lv = play.lv, title = lv.daily ? "Daily Quiz" : "Level " + lv.level;
  return '<div class="g-topbar"><button type="button" class="g-quit" data-act="quit">Exit</button><span class="g-lvl">' + esc(title) + '</span><span class="g-pts" aria-live="off">Score ' + play.points + "</span></div>" + extra;
}

function dotsHtml(total) {
  return '<div class="g-dots" role="img" aria-label="Question ' + (play.qi + 1) + " of " + total + '">' + Array.from({ length: total }, (_, i) => '<i class="' + (i < play.dots.length ? (play.dots[i] ? "ok" : "bad") : i === play.qi ? "now" : "") + '"></i>').join("") + "</div>";
}

// ---------- quiz questions ----------
function renderQuestion() {
  const lv = play.lv, q = lv.questions[play.qi], total = lv.questions.length;
  play.locked = false; play.typed = ""; play.placed = []; play.deadline = 0;
  let input = "";
  if (q.input === "choice") input = '<div class="g-options" role="group" aria-label="Answer choices">' + q.options.map((o, i) => '<button type="button" class="g-opt" data-act="pick" data-i="' + i + '"' + (isHindi(o) ? ' lang="hi"' : "") + '><span class="g-key" aria-hidden="true">' + (i + 1) + "</span><span>" + esc(o) + "</span></button>").join("") + "</div>";
  else if (q.input === "number") input = '<div class="g-numdisp" id="typed" aria-live="polite" aria-label="Your answer">&nbsp;</div><div class="g-pad" role="group" aria-label="Number pad">' + ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"].map((k) => '<button type="button" class="g-padkey ' + (k === "ok" ? "okkey" : "") + '" data-act="padkey" data-k="' + k + '" aria-label="' + (k === "back" ? "Delete" : k === "ok" ? "Check answer" : k) + '">' + (k === "back" ? "&#9003;" : k === "ok" ? "OK" : k) + "</button>").join("") + "</div>";
  else if (q.input === "letters") input = '<div class="g-slots" id="typed" aria-live="polite">' + Array.from({ length: q.length }, () => "<i></i>").join("") + '</div><div class="g-kb" role="group" aria-label="Letters">' + ["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row) => '<div class="g-kbrow">' + row.split("").map((c) => '<button type="button" class="g-kbkey" data-act="kb" data-k="' + c + '" aria-label="' + c + '">' + c.toUpperCase() + "</button>").join("") + "</div>").join("") + '</div><div class="g-row"><button type="button" class="g-btn" data-act="kbback">Delete</button><button type="button" class="g-btn primary" data-act="kbok">Check</button></div>';
  else if (q.input === "tiles") input = '<div class="g-slots tiles" id="typed" aria-live="polite">' + Array.from({ length: q.answer.length }, () => '<button type="button" class="g-slot" data-act="untile" tabindex="-1" aria-label="empty"></button>').join("") + '</div><div class="g-tiles" role="group" aria-label="Letters to use">' + q.letters.map((c, i) => '<button type="button" class="g-tile" data-act="tile" data-i="' + i + '">' + esc(c.toUpperCase()) + "</button>").join("") + '</div><div class="g-row"><button type="button" class="g-btn" data-act="tileclear">Clear</button><button type="button" class="g-btn primary" data-act="tileok">Check</button></div>';

  const extra = q.input === "letters" ? '<div class="g-row center"><button type="button" class="g-btn" data-act="listen">' + (canSpeak() ? "Listen again" : "Hint: first letter") + '</button></div><p class="g-clue">Clue: ' + esc(q.clue) + "</p>" : q.input === "tiles" ? (q.emoji ? '<div class="g-bigemoji" role="img" aria-label="picture clue">' + q.emoji + "</div>" : "") + '<p class="g-clue">Clue: ' + esc(q.clue) + "</p>" : "";
  app.innerHTML = '<section class="g-play' + (lv.path ? " treasure" : "") + '">' + topBar(dotsHtml(total) + (q.time ? '<div class="g-timer" role="timer" aria-label="Time left"><i id="tbar"></i><span id="tnum">' + q.time + "</span></div>" : "")) +
    '<div class="g-qcard" lang="' + (lv.lang === "hi" ? "en" : "en") + '">' + (q.story ? '<p class="g-story">' + esc(q.story) + "</p>" : "") + (lv.daily ? '<p class="g-story">Daily question ' + (play.qi + 1) + " of " + total + "</p>" : "") +
    '<h2 class="g-prompt">' + rich(q.prompt) + "</h2>" + (q.html || "") + extra + input + "</div>" +
    '<div class="g-feedback" id="fb" role="status" aria-live="polite"></div><div class="g-nextwrap"><button type="button" class="g-btn primary big" id="nextBtn" data-act="next" hidden>Next</button></div></section>';
  if (q.input === "letters" && q.speak) later(() => speak(q.speak), 350);
  if (q.time) startQuestionTimer(q);
  armKeys();
  const first = app.querySelector(".g-opt, .g-padkey, .g-kbkey, .g-tile"); if (first && q.input === "choice") first.focus({ preventScroll: true });
}

function startQuestionTimer(q) {
  play.deadline = Date.now() + q.time * 1000;
  const bar = document.getElementById("tbar"), num = document.getElementById("tnum");
  const t = setInterval(() => {
    if (play.locked) { clearInterval(t); return; }
    const left = Math.max(0, play.deadline - Date.now());
    if (bar) bar.style.width = (left / (q.time * 1000)) * 100 + "%";
    if (num) num.textContent = Math.ceil(left / 1000);
    if (left <= 0) { clearInterval(t); timeUp(); }
  }, 100);
  timers.push(t);
}
function timeUp() { if (!play || play.locked) return; settle(false, null, "Time is up!"); }

function checkTyped(q) {
  if (q.input === "number") return play.typed === String(q.answer);
  if (q.input === "letters") return play.typed.toLowerCase() === q.answer;
  return play.placed.map((i) => q.letters[i]).join("") === q.answer;
}

// Marks the answer, gives points and shows feedback.
function settle(correct, pickedIndex, note) {
  const lv = play.lv, q = lv.questions[play.qi];
  if (play.locked) return;
  play.locked = true;
  let gain = 0;
  if (correct) {
    play.streak++; play.correct++;
    gain = 10 + Math.min(play.streak - 1, 5) * 2;
    if (q.time) gain += Math.round((Math.max(0, play.deadline - Date.now()) / (q.time * 1000)) * 5);
    sfx.correct();
  } else { play.streak = 0; sfx.wrong(); }
  play.points += gain; play.dots.push(correct);
  const fb = document.getElementById("fb");
  fb.className = "g-feedback " + (correct ? "ok" : "bad");
  fb.innerHTML = correct ? "<strong>" + GOOD[(play.qi + play.correct) % GOOD.length] + "</strong> +" + gain + " points" + (play.streak >= 3 ? " &middot; " + play.streak + " in a row!" : "")
    : "<strong>" + esc(note || "Not quite.") + "</strong> The answer is <b>" + esc(answerText(q)) + "</b>.";
  if (q.input === "choice") {
    app.querySelectorAll(".g-opt").forEach((b, i) => { b.disabled = true; if (i === q.answer) b.classList.add("ok"); else if (i === pickedIndex) b.classList.add("bad"); });
  } else { app.querySelectorAll(".g-padkey, .g-kbkey, .g-tile, .g-slot, #kbok, .g-row .g-btn").forEach((b) => { b.disabled = true; }); }
  const dots = app.querySelectorAll(".g-dots i"); if (dots[play.qi]) dots[play.qi].className = correct ? "ok" : "bad";
  const pts = app.querySelector(".g-pts"); if (pts) pts.textContent = "Score " + play.points;
  const next = document.getElementById("nextBtn"); next.hidden = false; next.textContent = play.qi + 1 < lv.questions.length ? "Next" : "Finish";
  next.focus({ preventScroll: true });
  if (correct) later(() => { if (play && play.locked && play.qi === lv.questions.indexOf(q)) nextQuestion(); }, 1300);
}

function nextQuestion() {
  if (!play || !play.locked) return;
  if (play.qi + 1 < play.lv.questions.length) { play.qi++; renderQuestion(); } else finishQuiz();
}

// Keyboard shortcuts for computers: 1 to 4, digits, letters, Backspace and Enter.
function armKeys() {
  clearKeys();
  keyHandler = (e) => {
    if (!play || play.lv.type !== "quiz" || e.ctrlKey || e.metaKey || e.altKey) return;
    const q = play.lv.questions[play.qi];
    if (play.locked) { if (e.key === "Enter") nextQuestion(); return; }
    if (q.input === "choice" && /^[1-4]$/.test(e.key) && Number(e.key) <= q.options.length) { const i = Number(e.key) - 1; settle(i === q.answer, i); }
    else if (q.input === "number") { if (/^\d$/.test(e.key)) typeDigit(e.key); else if (e.key === "Backspace") backDigit(); else if (e.key === "Enter") submitTyped(); }
    else if (q.input === "letters") { if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toLowerCase()); else if (e.key === "Backspace") backLetter(); else if (e.key === "Enter") submitTyped(); }
  };
  document.addEventListener("keydown", keyHandler);
}

function showTyped() {
  const q = play.lv.questions[play.qi], el = document.getElementById("typed");
  if (!el) return;
  if (q.input === "number") el.textContent = play.typed || "\u00A0";
  else if (q.input === "letters") { const slots = el.querySelectorAll("i"); slots.forEach((s, i) => { s.textContent = (play.typed[i] || "").toUpperCase(); }); }
}
function typeDigit(d) { if (play.typed.length < 6) { play.typed += d; sfx.click(); showTyped(); } }
function backDigit() { play.typed = play.typed.slice(0, -1); showTyped(); }
function typeLetter(c) { const q = play.lv.questions[play.qi]; if (play.typed.length < q.length) { play.typed += c; sfx.click(); showTyped(); } }
function backLetter() { play.typed = play.typed.slice(0, -1); showTyped(); }
function submitTyped() { const q = play.lv.questions[play.qi]; if (play.locked || !play.typed) return; settle(checkTyped(q), null); }

function placeTile(i) {
  const q = play.lv.questions[play.qi];
  if (play.locked || play.placed.includes(i) || play.placed.length >= q.answer.length) return;
  play.placed.push(i); sfx.click(); showTiles();
  if (play.placed.length === q.answer.length) later(() => { if (play && !play.locked) settle(checkTyped(q), null); }, 250);
}
function removeTile(slot) { if (play.locked || slot >= play.placed.length) return; play.placed.splice(slot, 1); showTiles(); }
function showTiles() {
  const q = play.lv.questions[play.qi];
  app.querySelectorAll(".g-slot").forEach((s, i) => { const idx = play.placed[i]; s.textContent = idx === undefined ? "" : q.letters[idx].toUpperCase(); s.setAttribute("aria-label", idx === undefined ? "empty" : "letter " + q.letters[idx] + ", tap to remove"); s.tabIndex = idx === undefined ? -1 : 0; });
  app.querySelectorAll(".g-tile").forEach((t) => { t.disabled = play.placed.includes(Number(t.dataset.i)); });
}

// ---------- the end of a level ----------
function finishQuiz() {
  const lv = play.lv, total = lv.questions.length;
  if (lv.daily) return finishDaily();
  const stars = starsForRatio(play.correct / total);
  const gained = play.points + levelPointsBonus(stars);
  const badges = recordLevel(player, { game: lv.game, cls: lv.cls, level: lv.level, stars, points: gained });
  save(); syncPlayer(player);
  showResult({ stars, gained, line: "You got " + play.correct + " of " + total + " right.", badges });
}

function finishDaily() {
  const lv = play.lv, total = lv.questions.length;
  const score = play.points + (play.correct === total ? 20 : 0);
  const r = recordDaily(player, score, lv.date);
  save(); syncPlayer(player);
  submitDaily(player, lv.date, score);
  document.body.classList.remove("g-playing"); clearTimers(); clearKeys();
  const st = player.stats;
  app.innerHTML = '<section class="g-result"><h1>Daily Quiz done!</h1><p class="g-line">You got ' + play.correct + " of " + total + " right.</p><p class=\"g-gain\">+" + score + " points</p><p>Day streak: <b>" + st.streak + "</b></p>" + badgeList(r.newBadges) +
    '<div class="g-bottom"><button type="button" class="g-btn primary" data-act="openBoard" data-tab="daily">Today\'s leaderboard</button><button type="button" class="g-btn" data-act="goHub">Home</button></div></section>';
  if (play.correct >= 8) confetti(app); sfx.level(); play = null;
}

const badgeList = (list) => (list && list.length ? '<div class="g-newbadges"><h2>New badge' + (list.length > 1 ? "s" : "") + "!</h2>" + list.map((b) => '<div class="g-badgeitem">' + badgeSvg(true, 44) + "<span><strong>" + esc(b.name) + "</strong><small>" + esc(b.desc) + "</small></span></div>").join("") + "</div>" : "");

function showResult({ stars, gained, line, badges }) {
  const lv = play.lv, passed = stars >= 1;
  document.body.classList.remove("g-playing"); clearTimers(); clearKeys();
  const head = stars === 3 ? "Perfect!" : stars === 2 ? "Great job!" : stars === 1 ? "Good try!" : "Keep practising!";
  app.innerHTML = '<section class="g-result"><h1>' + head + '</h1><div class="g-bigstars" aria-label="' + stars + ' out of 3 stars">' + [0, 1, 2].map((i) => '<span class="pop" style="animation-delay:' + i * 0.25 + 's">' + starSvg(i < stars, 64) + "</span>").join("") + "</div>" +
    '<p class="g-line">' + esc(line) + '</p><p class="g-gain">+' + gained + " points</p>" +
    (passed ? "<p>Level " + lv.level + " complete. Level " + (lv.level + 1) + " is open.</p>" : "<p>Get at least 60 out of 100 to open the next level. Try again with new questions!</p>") + badgeList(badges) +
    '<div class="g-bottom">' + (passed ? '<button type="button" class="g-btn primary" data-act="startLevel" data-id="' + lv.game + '" data-level="' + (lv.level + 1) + '" data-cls="' + lv.cls + '">Next level</button>' : "") +
    '<button type="button" class="g-btn' + (passed ? "" : " primary") + '" data-act="startLevel" data-id="' + lv.game + '" data-level="' + lv.level + '" data-cls="' + lv.cls + '">Try again</button><button type="button" class="g-btn" data-act="openGame" data-id="' + lv.game + '">All levels</button></div></section>';
  if (stars === 3) { confetti(app); sfx.level(); } else if (stars > 0) sfx.star(); else sfx.wrong();
  play = null;
}

// ---------- Match the Pair ----------
const shuffleArr = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
function faceHtml(face) {
  if (String(face).startsWith("shape:")) return shapeSvg(String(face).slice(6), 54);
  const plain = /^[\u0000-\u024F]*$/.test(String(face));
  return plain ? "<span class=\"g-ftext\">" + esc(face) + "</span>" : '<span class="g-emoji" role="img">' + esc(face) + "</span>";
}

function startMatch() {
  const lv = play.lv;
  play.match = { left: shuffleArr(lv.pairs.map((p, i) => ({ i, face: p.left }))), right: shuffleArr(lv.pairs.map((p, i) => ({ i, face: p.right }))), selL: -1, selR: -1, done: new Set(), mistakes: 0 };
  const card = (side, it, pos) => '<button type="button" class="g-mcard" data-act="mcard" data-side="' + side + '" data-pos="' + pos + '" aria-pressed="false">' + faceHtml(it.face) + "</button>";
  app.innerHTML = '<section class="g-play">' + topBar() + '<h2 class="g-prompt">' + esc(lv.title) + ": tap one on the left, then its match on the right.</h2>" +
    '<p class="g-sub" id="mstat" aria-live="polite">Matched 0 of ' + lv.pairs.length + " &middot; Mistakes 0</p>" +
    '<div class="g-match"><div class="g-col" role="group" aria-label="Left side">' + play.match.left.map((it, p) => card("L", it, p)).join("") + '</div><div class="g-col" role="group" aria-label="Right side">' + play.match.right.map((it, p) => card("R", it, p)).join("") + "</div></div></section>";
}

function pickMatchCard(side, pos) {
  const m = play.match, arr = side === "L" ? m.left : m.right, item = arr[pos];
  if (!item || m.done.has(item.i)) return;
  if (side === "L") m.selL = m.selL === pos ? -1 : pos; else m.selR = m.selR === pos ? -1 : pos;
  sfx.click();
  if (m.selL >= 0 && m.selR >= 0) {
    const a = m.left[m.selL], b = m.right[m.selR];
    if (a.i === b.i) { m.done.add(a.i); play.points += 10; sfx.correct(); m.selL = m.selR = -1; }
    else {
      m.mistakes++; sfx.wrong();
      const bad = [app.querySelector('[data-side="L"][data-pos="' + m.selL + '"]'), app.querySelector('[data-side="R"][data-pos="' + m.selR + '"]')];
      bad.forEach((b) => b && b.classList.add("shake")); later(() => bad.forEach((b) => b && b.classList.remove("shake")), 500);
      m.selL = m.selR = -1;
    }
  }
  app.querySelectorAll(".g-mcard").forEach((b) => {
    const s = b.dataset.side, p = Number(b.dataset.pos), it = (s === "L" ? m.left : m.right)[p], matched = m.done.has(it.i), selected = (s === "L" ? m.selL : m.selR) === p;
    b.classList.toggle("matched", matched); b.classList.toggle("sel", selected); b.disabled = matched; b.setAttribute("aria-pressed", selected ? "true" : "false");
  });
  const n = play.lv.pairs.length;
  document.getElementById("mstat").innerHTML = "Matched " + m.done.size + " of " + n + " &middot; Mistakes " + m.mistakes;
  const pts = app.querySelector(".g-pts"); if (pts) pts.textContent = "Score " + play.points;
  if (m.done.size === n) later(finishMatch, 500);
}

function finishMatch() {
  const lv = play.lv, n = lv.pairs.length, mis = play.match.mistakes;
  const stars = mis === 0 ? 3 : mis <= Math.ceil(n / 2) ? 2 : mis <= n * 2 ? 1 : 0;
  const gained = Math.max(n * 3, n * 10 - mis * 3) + levelPointsBonus(stars);
  const badges = recordLevel(player, { game: lv.game, cls: lv.cls, level: lv.level, stars, points: gained });
  save(); syncPlayer(player);
  showResult({ stars, gained, line: "You matched all " + n + " pairs with " + mis + (mis === 1 ? " mistake." : " mistakes."), badges });
}

// ---------- Memory Cards ----------
function startMemory() {
  const lv = play.lv, cols = lv.cards.length <= 6 ? 3 : lv.cards.length <= 16 ? 4 : 5;
  play.mem = { flipped: [], matched: new Set(), moves: 0, lock: false };
  app.innerHTML = '<section class="g-play">' + topBar() + '<h2 class="g-prompt">Find the matching cards.</h2><p class="g-sub" id="mstat" aria-live="polite">Moves 0 &middot; Pairs found 0 of ' + lv.pairs + "</p>" +
    '<div class="g-memory" style="--cols:' + cols + '">' + lv.cards.map((c, i) => '<button type="button" class="g-mem" data-act="flip" data-i="' + i + '" aria-label="Card ' + (i + 1) + ', face down"></button>').join("") + "</div></section>";
}

function paintMemory() {
  const lv = play.lv, m = play.mem;
  app.querySelectorAll(".g-mem").forEach((b) => {
    const i = Number(b.dataset.i), shown = m.flipped.includes(i) || m.matched.has(lv.cards[i].pair);
    b.classList.toggle("up", shown); b.classList.toggle("matched", m.matched.has(lv.cards[i].pair)); b.disabled = m.matched.has(lv.cards[i].pair);
    const face = lv.cards[i].face;
    b.innerHTML = shown ? '<span class="g-mface' + (String(face).length > 4 ? " small" : "") + '">' + faceHtml(face) + "</span>" : "";
    b.setAttribute("aria-label", "Card " + (i + 1) + (shown ? ", " + face : ", face down"));
  });
  document.getElementById("mstat").innerHTML = "Moves " + m.moves + " &middot; Pairs found " + m.matched.size + " of " + lv.pairs;
}

function flipCard(i) {
  const lv = play.lv, m = play.mem;
  if (m.lock || m.flipped.includes(i) || m.matched.has(lv.cards[i].pair)) return;
  m.flipped.push(i); sfx.click(); paintMemory();
  if (m.flipped.length < 2) return;
  m.moves++; m.lock = true;
  const [a, b] = m.flipped;
  if (lv.cards[a].pair === lv.cards[b].pair) {
    m.matched.add(lv.cards[a].pair); m.flipped = []; m.lock = false; sfx.correct(); paintMemory();
    if (m.matched.size === lv.pairs) later(finishMemory, 600);
  } else { later(() => { sfx.wrong(); m.flipped = []; m.lock = false; paintMemory(); }, 850); }
}

function finishMemory() {
  const lv = play.lv, P = lv.pairs, moves = play.mem.moves;
  const stars = moves <= Math.ceil(P * 1.5) ? 3 : moves <= Math.ceil(P * 2.4) ? 2 : 1;
  const gained = Math.max(P * 4, P * 12 - Math.max(0, moves - P) * 2) + levelPointsBonus(stars);
  const badges = recordLevel(player, { game: lv.game, cls: lv.cls, level: lv.level, stars, points: gained });
  save(); syncPlayer(player);
  showResult({ stars, gained, line: "You found all " + P + " pairs in " + moves + " moves.", badges });
}

// ---------- Maze ----------
function startMaze() {
  const lv = play.lv, CELL = 24, pad = 4, W = lv.cols * CELL + pad * 2, H = lv.rows * CELL + pad * 2;
  let walls = "";
  for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
    const x = pad + c * CELL, y = pad + r * CELL, cell = lv.cells[r][c];
    if (!cell.n) walls += "M" + x + "," + y + "h" + CELL;
    if (!cell.w) walls += "M" + x + "," + y + "v" + CELL;
    if (r === lv.rows - 1 && !cell.s) walls += "M" + x + "," + (y + CELL) + "h" + CELL;
    if (c === lv.cols - 1 && !cell.e) walls += "M" + (x + CELL) + "," + y + "v" + CELL;
  }
  play.maze = { r: 0, c: 0, moves: 0, CELL, pad };
  const ex = pad + (lv.cols - 1) * CELL + CELL / 2, ey = pad + (lv.rows - 1) * CELL + CELL / 2;
  app.innerHTML = '<section class="g-play">' + topBar() + '<h2 class="g-prompt">Help the dot reach the red flag.</h2><p class="g-sub" id="mstat" aria-live="polite">Moves 0</p>' +
    '<div class="g-mazewrap" id="mazewrap"><svg class="g-maze" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="A maze. Use the arrow buttons to move the dot to the red flag."><rect width="' + W + '" height="' + H + '" fill="#fff8e6"/><path d="' + walls + '" stroke="#244" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
    '<g transform="translate(' + ex + "," + ey + ')"><path d="M-4 7V-7l9 3.5-9 3.5" fill="#d6402c" stroke="#8a1c0e" stroke-width="1"/></g><circle id="dot" r="' + CELL * 0.28 + '" fill="#1f6fd1" stroke="#0c3a73" stroke-width="2" cx="' + (pad + CELL / 2) + '" cy="' + (pad + CELL / 2) + '"/></svg></div>' +
    '<div class="g-dpad" role="group" aria-label="Move"><button type="button" class="g-dp up" data-act="mv" data-d="n" aria-label="Up">&#9650;</button><button type="button" class="g-dp left" data-act="mv" data-d="w" aria-label="Left">&#9664;</button><button type="button" class="g-dp right" data-act="mv" data-d="e" aria-label="Right">&#9654;</button><button type="button" class="g-dp down" data-act="mv" data-d="s" aria-label="Down">&#9660;</button></div></section>';
  keyHandler = (e) => { const map = { ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e", w: "n", s: "s", a: "w", d: "e" }; if (map[e.key]) { e.preventDefault(); moveMaze(map[e.key]); } };
  document.addEventListener("keydown", keyHandler);
  let sx = 0, sy = 0;
  const wrap = document.getElementById("mazewrap");
  wrap.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  wrap.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; moveMaze(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : (dy > 0 ? "s" : "n")); }, { passive: true });
}

function moveMaze(dir) {
  if (!play || !play.maze || play.maze.done) return;
  const lv = play.lv, m = play.maze, cell = lv.cells[m.r][m.c];
  if (!cell[dir]) { sfx.wrong(); return; }
  if (dir === "n") m.r--; else if (dir === "s") m.r++; else if (dir === "e") m.c++; else m.c--;
  m.moves++; sfx.click();
  const dot = document.getElementById("dot");
  dot.setAttribute("cx", m.pad + m.c * m.CELL + m.CELL / 2); dot.setAttribute("cy", m.pad + m.r * m.CELL + m.CELL / 2);
  document.getElementById("mstat").textContent = "Moves " + m.moves;
  if (m.r === lv.rows - 1 && m.c === lv.cols - 1) { m.done = true; sfx.correct(); later(finishMaze, 500); }
}

function finishMaze() {
  const lv = play.lv, moves = play.maze.moves, best = lv.best;
  const stars = moves <= Math.ceil(best * 1.25) ? 3 : moves <= best * 2 ? 2 : 1;
  const gained = 20 + stars * 10 + levelPointsBonus(stars);
  const badges = recordLevel(player, { game: lv.game, cls: lv.cls, level: lv.level, stars, points: gained });
  save(); syncPlayer(player);
  showResult({ stars, gained, line: "You reached the flag in " + moves + " moves. The shortest way is " + best + ".", badges });
}

// ---------- Daily Quiz Battle ----------
function viewDaily() {
  const date = dayKey(), cls = ui.dailyCls || player.cls, done = player.stats.dailyDone[date];
  app.innerHTML = '<section class="g-gamepage" style="--accent:#b45309"><button type="button" class="g-back" data-act="goHub">&larr; All games</button><div class="g-gamehead">' + gameIcon("daily", "#b45309", 64) + "<div><h1>Daily Quiz Battle</h1><p>10 new questions every day, the same for everyone in your class.</p></div></div>" +
    "<h2>Choose your class</h2>" + classChips(cls, "dailyClass") +
    (done !== undefined ? '<div class="g-card"><p><strong>You played today!</strong> Score ' + done + ". Day streak " + player.stats.streak + ". Come back tomorrow for new questions.</p></div>" : '<button type="button" class="g-btn primary big" data-act="startDaily">Start today\'s quiz</button>') +
    '<div class="g-bottom"><button type="button" class="g-btn" data-act="openBoard" data-tab="daily">Today\'s leaderboard</button></div></section>';
}

function startDaily() {
  const date = dayKey();
  if (player.stats.dailyDone[date] !== undefined) return viewDaily();
  const lv = dailySet(ui.dailyCls || player.cls, date);
  const st = { view: "play", params: { id: "daily" } };
  history.pushState(st, "");
  runLevel(lv);
}

// ---------- leaderboard ----------
let boardToken = 0;
function viewBoard(params) {
  if (params.tab) ui.boardTab = params.tab;
  const daily = ui.boardTab === "daily";
  app.innerHTML = '<section class="g-boardpage"><button type="button" class="g-back" data-act="goHub">&larr; Back</button><h1>Leaderboard</h1>' +
    '<div class="g-tabs" role="group" aria-label="Which leaderboard"><button type="button" class="g-tab' + (!daily ? " on" : "") + '" aria-pressed="' + !daily + '" data-act="boardTab" data-tab="overall">All time</button><button type="button" class="g-tab' + (daily ? " on" : "") + '" aria-pressed="' + daily + '" data-act="boardTab" data-tab="daily">Today</button></div>' +
    '<div class="g-chips" role="group" aria-label="Show class"><button type="button" class="g-chip' + (!ui.boardCls ? " on" : "") + '" aria-pressed="' + !ui.boardCls + '" data-act="boardClass" data-cls="0"><span>All classes</span></button>' + CLASSES.map((c) => '<button type="button" class="g-chip' + (ui.boardCls === c ? " on" : "") + '" aria-pressed="' + (ui.boardCls === c) + '" data-act="boardClass" data-cls="' + c + '"><span>Class ' + c + "</span></button>").join("") + "</div>" +
    '<div id="boardList" class="g-boardlist" aria-live="polite"><p class="g-sub">Loading...</p></div></section>';
  loadBoard(++boardToken);
}

async function loadBoard(token) {
  const list = document.getElementById("boardList"), daily = ui.boardTab === "daily";
  try {
    let rows;
    if (daily) rows = await fetchDaily(dayKey(), 100);
    else { await syncPlayer(player, true); rows = await fetchBoard(100); }
    if (token !== boardToken || !document.getElementById("boardList")) return;
    if (ui.boardCls) rows = rows.filter((r) => r.cls === ui.boardCls);
    if (!rows.length) { list.innerHTML = '<p class="g-sub">' + (daily ? "Nobody has played today's quiz yet. Be the first!" : "No players yet. Play a level to get on the board!") + "</p>"; return; }
    const medal = (i) => (i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : i + 1 + "th");
    list.innerHTML = '<ol class="g-rank">' + rows.slice(0, 50).map((r, i) => '<li class="' + (r.id === player.id ? "me" : "") + '"><span class="g-rk">' + medal(i) + '</span><span class="g-nm">' + esc(r.nickname) + "<small>Class " + esc(r.cls) + "</small></span><span class=\"g-sc\"><b>" + esc(daily ? r.score : r.points) + "</b><small>" + (daily ? "points today" : esc(r.stars) + " stars") + "</small></span></li>").join("") + "</ol>";
    const mine = rows.findIndex((r) => r.id === player.id);
    if (mine < 0) list.insertAdjacentHTML("beforeend", '<p class="g-sub">You are not in the top 50 yet. Keep playing!</p>');
  } catch (e) {
    console.error(e);
    if (token === boardToken && list) list.innerHTML = '<p class="g-err">The leaderboard needs the internet and could not load right now. Please try again later.</p>';
  }
}

// ---------- badges ----------
function viewBadges() {
  const earned = Object.keys(player.badges).length;
  app.innerHTML = '<section class="g-badgepage"><button type="button" class="g-back" data-act="goHub">&larr; Back</button><h1>My badges</h1><p class="g-sub">' + earned + " of " + BADGES.length + " badges earned.</p>" +
    '<ul class="g-badges">' + BADGES.map((b) => { const got = !!player.badges[b.id]; return '<li class="' + (got ? "got" : "") + '">' + badgeSvg(got, 56) + "<strong>" + esc(b.name) + "</strong><small>" + esc(b.desc) + '</small><em>' + (got ? "Earned" : "Locked") + "</em></li>"; }).join("") + "</ul></section>";
}

// ---------- clicks, forms and start up ----------
const actions = {
  playAs: (el) => { player = store.players[el.dataset.id]; store.current = player.id; save(); navigate("hub"); },
  removePlayer: (el) => {
    const p = store.players[el.dataset.id];
    if (p && confirm("Remove " + p.nickname + " from this device? Their saved progress on this device will be deleted.")) {
      delete store.players[p.id]; if (store.current === p.id) { store.current = ""; player = null; } save(); render({ view: "profiles", params: {} });
    }
  },
  switch: () => navigate("profiles"),
  goHub: () => navigate("hub"),
  back: () => history.back(),
  openGame: (el) => { ui.showAll = false; navigate("game", { id: el.dataset.id }); },
  gameClass: (el) => { const g = history.state.params.id; ui.gameCls[g] = Number(el.dataset.cls); ui.showAll = false; render({ view: "game", params: { id: g } }); },
  showAll: () => { ui.showAll = true; render({ view: "game", params: history.state.params }); },
  startLevel: (el) => { const id = el.dataset.id; startLevel(id, Number(el.dataset.cls) || ui.gameCls[id] || player.cls, Number(el.dataset.level)); },
  quit: () => { if (confirm("Leave this level? Your answers in this level will not be saved.")) history.back(); },
  pick: (el) => { if (play && !play.locked) { const q = play.lv.questions[play.qi], i = Number(el.dataset.i); settle(i === q.answer, i); } },
  padkey: (el) => { const k = el.dataset.k; if (k === "back") backDigit(); else if (k === "ok") submitTyped(); else typeDigit(k); },
  kb: (el) => typeLetter(el.dataset.k),
  kbback: () => backLetter(),
  kbok: () => submitTyped(),
  listen: () => { const q = play.lv.questions[play.qi]; if (canSpeak()) speak(q.speak); else { const fb = document.getElementById("fb"); fb.className = "g-feedback"; fb.textContent = "The word starts with " + q.answer[0].toUpperCase() + " and has " + q.answer.length + " letters."; } },
  tile: (el) => placeTile(Number(el.dataset.i)),
  untile: (el) => { const slots = [...app.querySelectorAll(".g-slot")]; removeTile(slots.indexOf(el)); },
  tileclear: () => { if (!play.locked) { play.placed = []; showTiles(); } },
  tileok: () => { const q = play.lv.questions[play.qi]; if (!play.locked && play.placed.length) settle(checkTyped(q), null); },
  next: () => nextQuestion(),
  mcard: (el) => pickMatchCard(el.dataset.side, Number(el.dataset.pos)),
  flip: (el) => flipCard(Number(el.dataset.i)),
  mv: (el) => moveMaze(el.dataset.d),
  openDaily: () => navigate("daily"),
  dailyClass: (el) => { ui.dailyCls = Number(el.dataset.cls); render({ view: "daily", params: {} }); },
  startDaily: () => startDaily(),
  openBoard: (el) => navigate("board", { tab: el.dataset.tab || ui.boardTab }),
  boardTab: (el) => { ui.boardTab = el.dataset.tab; render({ view: "board", params: {} }); },
  boardClass: (el) => { ui.boardCls = Number(el.dataset.cls); render({ view: "board", params: {} }); },
  openBadges: () => navigate("badges"),
  sound: () => { store.sound = store.sound === false; save(); renderHeaderChip(); if (store.sound) sfx.click(); }
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "newPlayer") return;
  e.preventDefault();
  const nick = checkNickname(document.getElementById("nick").value), clsInput = e.target.querySelector('input[name="cls"]:checked');
  document.getElementById("nickErr").textContent = nick.ok ? "" : nick.message;
  document.getElementById("clsErr").textContent = clsInput ? "" : "Please choose your class.";
  if (!nick.ok || !clsInput) return;
  const cls = Number(clsInput.value);
  let p = Object.values(store.players).find((x) => x.cls === cls && x.nickname.toLowerCase() === nick.name.toLowerCase());
  if (!p) { p = newPlayer(nick.name, cls); store.players[p.id] = p; }
  player = p; store.current = p.id; save(); navigate("hub");
});

document.addEventListener("visibilitychange", () => { if (document.hidden && player) { save(); syncPlayer(player); } });
window.addEventListener("pagehide", () => { if (player) save(); });

(function start() {
  renderHeaderChip();
  const first = history.state && history.state.view && history.state.view !== "play" ? history.state : { view: player ? "hub" : "profiles", params: {} };
  history.replaceState(first, "");
  render(first);
})();
