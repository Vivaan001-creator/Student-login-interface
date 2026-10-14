// =========================================================
// tests.js - online MCQ tests for GenAlpha.
// One module for three pages. The page says which one it is:
//   <body data-role="teacher|student|parent">
//
// Data (see firestore.rules and TESTS-FEATURE.md):
//   tests/{id}                    details: subject, start, duration, marks
//   testQuestions/{id}            questions + options   (readable after start time)
//   testKeys/{id}                 correct answers       (readable after start time)
//   tests/{id}/submissions/{roll} one result per student (create only)
// =========================================================
import { db } from "./Firebase.js";
import {
  doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where,
  serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const ROLE = document.body.dataset.role;
const app = document.getElementById("app");

// ---------- small helpers ----------
const esc = (s) => String(s === undefined || s === null ? "" : s)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const $ = (id) => document.getElementById(id);
const classKeyOf = (v) => String(v || "").trim().toLowerCase().replace(/^class\s*/, "");
const normName = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f ]/g, " ").replace(/\s+/g, " ").trim();
const digits = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const LETTERS = ["A", "B", "C", "D"];

function toISODate(value) {
  const str = String(value || "").trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return str;
}
const toDate = (ts) => (ts && ts.toDate ? ts.toDate() : new Date(ts));
const fmtWhen = (d) => d.toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
function say(id, text, kind) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.className = "msg" + (text ? " show " + (kind || "info") : "");
}
const loading = () => `<div class="empty"><div class="spinner"></div>Loading...</div>`;
const metaLine = (t) =>
  `<span><i class="fa-regular fa-clock"></i> ${fmtDur(t.durationMin)}</span>` +
  `<span><i class="fa-solid fa-star"></i> ${t.totalMarks} marks</span>` +
  `<span><i class="fa-solid fa-list-check"></i> ${t.questionCount} questions</span>`;

function testStatus(t, sub, now) {
  const start = t.startAt.getTime(), end = t.endAt.getTime();
  if (sub) return { key: "done", label: "Submitted", cls: "st-done" };
  if (now < start) return { key: "wait", label: "Upcoming", cls: "st-wait" };
  if (now <= end) return { key: "live", label: "Live now", cls: "st-live" };
  return { key: "over", label: "Not attempted", cls: "st-over" };
}

function readTest(d) {
  const x = d.data();
  return { id: d.id, ...x, startAt: toDate(x.startAt), endAt: toDate(x.endAt) };
}

// ---------- shared: review / report ----------
async function loadPaper(testId) {
  const [q, k] = await Promise.all([getDoc(doc(db, "testQuestions", testId)), getDoc(doc(db, "testKeys", testId))]);
  if (!q.exists() || !k.exists()) throw new Error("Question paper not found.");
  return { questions: q.data().questions || [], key: k.data().answers || [] };
}

function reportHtml(t, sub, paper, who) {
  const pct = t.totalMarks ? Math.round((sub.score / t.totalMarks) * 100) : 0;
  const when = sub.submittedAt ? fmtWhen(toDate(sub.submittedAt)) : "";
  let html = `
    <div class="card score-hero">
      <div class="note">${esc(who)}</div>
      <div class="q-text" style="margin:4px 0 8px">${esc(t.subject)}${t.title ? " - " + esc(t.title) : ""}</div>
      <div class="big">${sub.score}<span class="of"> / ${t.totalMarks}</span></div>
      <div class="pct">${pct}%</div>
      <div class="stat-row">
        <div class="stat g"><b>${sub.correct}</b><span>Correct</span></div>
        <div class="stat r"><b>${sub.wrong}</b><span>Wrong</span></div>
        <div class="stat"><b>${sub.skipped}</b><span>Skipped</span></div>
      </div>
      ${when ? `<div class="note" style="margin-top:12px">Submitted: ${esc(when)}${sub.auto ? " (auto-submitted when time ended)" : ""}</div>` : ""}
    </div>`;
  paper.questions.forEach((q, i) => {
    const chosen = Number.isInteger(sub.answers[i]) ? sub.answers[i] : -1;
    const right = paper.key[i];
    const opts = q.options.map((o, j) => {
      let cls = "opt static", tag = "";
      if (j === right) { cls += " right"; tag = chosen === j ? " (Your answer - Correct)" : " (Correct answer)"; }
      else if (j === chosen) { cls += " wrong"; tag = " (Your answer - Wrong)"; }
      return `<div class="${cls}"><span class="ol">${LETTERS[j]}</span><span class="ot">${esc(o)}${tag}</span></div>`;
    }).join("");
    html += `<div class="q-card"><div class="q-no">Question ${i + 1}${chosen === -1 ? " - not answered" : ""}</div>
      <div class="q-text">${esc(q.q)}</div>${opts}</div>`;
  });
  return html;
}

function scoreAnswers(t, paper, answers) {
  let correct = 0, wrong = 0, skipped = 0;
  paper.questions.forEach((_, i) => {
    const a = answers[i];
    if (!Number.isInteger(a) || a < 0) skipped++;
    else if (a === paper.key[i]) correct++;
    else wrong++;
  });
  return { correct, wrong, skipped, score: correct * t.marksPerQuestion };
}

// =========================================================
// STUDENT and PARENT: list of tests (stat cards)
// =========================================================
let me = null;           // student document data + roll
let tests = [];          // tests for my class
let subs = {};           // testId -> submission
let tickTimer = null;

async function loadMe() {
  if (ROLE === "student") {
    const roll = localStorage.getItem("studentRoll");
    if (!roll) return null;
    const s = await getDoc(doc(db, "students", roll));
    return s.exists() ? { roll, ...s.data() } : null;
  }
  const contact = localStorage.getItem("parentContact");
  if (!contact) return null;
  const snap = await getDocs(query(collection(db, "students"), where("contactNumber", "==", contact)));
  if (snap.empty) return null;
  const kids = snap.docs.map((d) => ({ roll: d.id, ...d.data() }));
  window.__kids = kids;
  const active = localStorage.getItem("parentActiveRoll");
  return kids.find((k) => k.roll === active) || kids[0];
}

async function loadTestsForMe() {
  const snap = await getDocs(query(collection(db, "tests"), where("classKey", "==", classKeyOf(me.class))));
  tests = snap.docs.map(readTest).sort((a, b) => b.startAt - a.startAt);
  subs = {};
  await Promise.all(tests.map(async (t) => {
    try {
      const s = await getDoc(doc(db, "tests", t.id, "submissions", me.roll));
      if (s.exists()) subs[t.id] = s.data();
    } catch (e) { /* treated as not submitted */ }
  }));
}

function listView() {
  stopExamTimer();
  document.body.classList.remove("exam");
  const kidPicker = ROLE === "parent" && window.__kids && window.__kids.length > 1
    ? `<div class="card"><div class="field"><label for="kidSel">Child</label><select id="kidSel">${window.__kids.map((k) =>
        `<option value="${esc(k.roll)}" ${k.roll === me.roll ? "selected" : ""}>${esc(k.name || k.roll)}</option>`).join("")}</select></div></div>` : "";
  const intro = ROLE === "parent"
    ? `Tests of <b>${esc(me.name || me.roll)}</b> (Class ${esc(me.class)}). Tap a submitted test to see the report. The student takes the test from their own login.`
    : `Tests for Class ${esc(me.class)}. The arrow opens once the start time is reached.`;
  app.innerHTML = kidPicker + `<p class="note" style="margin:0 2px 14px">${intro}</p><div id="cards"></div>`;
  const sel = $("kidSel");
  if (sel) sel.addEventListener("change", async () => {
    localStorage.setItem("parentActiveRoll", sel.value);
    me = window.__kids.find((k) => k.roll === sel.value);
    app.innerHTML = loading();
    await loadTestsForMe();
    listView();
  });
  renderCards(true);
  tickTimer = setInterval(renderCards, 1000);
}

let cardsSig = "";
function whenText(t, st, now) {
  if (st.key === "wait") return `Starts ${fmtWhen(t.startAt)} (in ${fmtClock(t.startAt - now)})`;
  if (st.key === "live") return `Started ${fmtWhen(t.startAt)}. Ends in ${fmtClock(t.endAt - now)}`;
  return `Was on ${fmtWhen(t.startAt)}`;
}
function renderCards(force) {
  const box = $("cards");
  if (!box) return;
  if (!tests.length) { box.innerHTML = `<div class="empty">No test has been published for this class yet.</div>`; return; }
  const now = Date.now();
  const sts = tests.map((t) => testStatus(t, subs[t.id], now));
  const sig = sts.map((x) => x.key).join(",") + "|" + tests.length;
  if (!force && sig === cardsSig && box.children.length) {
    // same state: only refresh the countdown lines, so taps are never lost to a re-render
    tests.forEach((t, i) => {
      const el = box.querySelector(`[data-when="${CSS.escape(t.id)}"]`);
      if (el) el.innerHTML = `<i class="fa-regular fa-calendar"></i> ${esc(whenText(t, sts[i], now))}`;
    });
    return;
  }
  cardsSig = sig;
  box.innerHTML = tests.map((t, i) => {
    const sub = subs[t.id], st = sts[i];
    let btn;
    if (st.key === "done") btn = `<button class="arrow-btn" data-act="report" data-id="${esc(t.id)}" aria-label="View report"><i class="fa-solid fa-chart-simple"></i></button>`;
    else if (st.key === "live" && ROLE === "student") btn = `<button class="arrow-btn" data-act="start" data-id="${esc(t.id)}" aria-label="Start test"><i class="fa-solid fa-arrow-right"></i></button>`;
    else btn = `<button class="arrow-btn" disabled aria-label="Not available"><i class="fa-solid fa-arrow-right"></i></button>`;
    const score = sub ? `<div class="tc-meta"><span><b>Score: ${sub.score} / ${t.totalMarks}</b></span></div>` : "";
    return `<div class="test-card"><div class="tc-main">
      <div class="tc-subject">${esc(t.subject)}</div>
      ${t.title ? `<div class="tc-title">${esc(t.title)}</div>` : ""}
      <div class="tc-meta">${metaLine(t)}</div>${score}
      <div class="tc-when" data-when="${esc(t.id)}"><i class="fa-regular fa-calendar"></i> ${esc(whenText(t, st, now))}</div>
      <span class="tc-state ${st.cls}">${st.label}</span></div>${btn}</div>`;
  }).join("");
}

app && app.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const t = tests.find((x) => x.id === b.dataset.id);
  if (b.dataset.act === "report" && t) openMyReport(t);
  if (b.dataset.act === "start" && t) openVerify(t);
});

async function openMyReport(t) {
  stopExamTimer();
  app.innerHTML = loading();
  try {
    const paper = await loadPaper(t.id);
    app.innerHTML = `<button class="btn ghost small" id="backList" style="margin-bottom:12px"><i class="fa-solid fa-arrow-left"></i> Back to tests</button>` +
      reportHtml(t, subs[t.id], paper, me.name || me.roll);
    $("backList").onclick = listView;
  } catch (err) {
    app.innerHTML = `<div class="msg show err">Could not load the report. ${esc(err.message)}</div><button class="btn ghost small" id="backList">Back</button>`;
    $("backList").onclick = listView;
  }
}

// =========================================================
// STUDENT: verification, exam, anti-cheat, submit
// =========================================================
let exam = null;          // { t, paper, answers[], index } while a test is on screen
let examTimer = null;
let wrongTries = 0, lockUntil = 0;
let submitting = false;

function stopExamTimer() { if (examTimer) { clearInterval(examTimer); examTimer = null; } if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

function openVerify(t, note) {
  stopExamTimer();
  exam = null;
  document.body.classList.remove("exam");
  app.innerHTML = `
    <button class="btn ghost small" id="backList" style="margin-bottom:12px"><i class="fa-solid fa-arrow-left"></i> Back</button>
    <div class="card">
      <div class="card-title">Verify your details</div>
      <div class="q-text" style="margin-bottom:4px">${esc(t.subject)}${t.title ? " - " + esc(t.title) : ""}</div>
      <div class="tc-meta" style="margin:0 0 14px;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--ink-soft)">${metaLine(t)}</div>
      <div id="vMsg" class="msg"></div>
      <div class="form-grid">
        <div class="field full"><label for="vName">Student's name</label><input id="vName" type="text" autocomplete="off"></div>
        <div class="field full"><label for="vFather">Father's name</label><input id="vFather" type="text" autocomplete="off"></div>
        <div class="field"><label for="vDob">Date of birth</label><input id="vDob" type="date"></div>
        <div class="field"><label for="vMobile">Mobile number</label><input id="vMobile" type="tel" inputmode="numeric" autocomplete="off"></div>
      </div>
      <p class="note" style="margin-bottom:14px">After verification the questions open. If you leave this screen (another app, tab or the home button) your answers are erased and you must verify again.</p>
      <button class="btn block" id="vGo"><i class="fa-solid fa-shield-halved"></i> Verify and start</button>
    </div>`;
  if (note) say("vMsg", note, "err");
  $("backList").onclick = listView;
  $("vGo").onclick = () => verifyAndStart(t);
  tickTimer = setInterval(() => {
    if (Date.now() > t.endAt.getTime()) { stopExamTimer(); app.innerHTML = `<div class="msg show err">This test has ended.</div><button class="btn ghost small" id="backList">Back</button>`; $("backList").onclick = listView; }
  }, 1000);
}

async function verifyAndStart(t) {
  const now = Date.now();
  if (now < lockUntil) { say("vMsg", `Too many wrong attempts. Try again in ${Math.ceil((lockUntil - now) / 1000)} seconds.`, "err"); return; }
  if (now < t.startAt.getTime()) { say("vMsg", "The test has not started yet.", "err"); return; }
  if (now > t.endAt.getTime()) { say("vMsg", "The test time is over.", "err"); return; }
  const name = $("vName").value, father = $("vFather").value, dob = $("vDob").value, mob = $("vMobile").value;
  if (!name.trim() || !father.trim() || !dob || !digits(mob)) { say("vMsg", "Please fill all four details.", "err"); return; }

  const okName = normName(name) === normName(me.name);
  const okFather = normName(father) === normName(me.father);
  const okDob = toISODate(dob) === toISODate(me.dob);
  const okMob = digits(mob) !== "" && (digits(mob) === digits(me.contactNumber) || (me.altContact && digits(mob) === digits(me.altContact)));
  if (!(okName && okFather && okDob && okMob)) {
    wrongTries++;
    if (wrongTries >= 5) { lockUntil = Date.now() + 60000; wrongTries = 0; }
    say("vMsg", "These details do not match the school record. Please check and try again.", "err");
    return;
  }
  wrongTries = 0;
  $("vGo").disabled = true;
  say("vMsg", "Verified. Opening questions...", "ok");
  try {
    const q = await getDoc(doc(db, "testQuestions", t.id));
    if (!q.exists()) throw new Error("Questions not found.");
    startExam(t, { questions: q.data().questions || [] });
  } catch (err) {
    $("vGo").disabled = false;
    const denied = err && (err.code === "permission-denied");
    say("vMsg", denied ? "The test has not started yet on the server clock. Please wait a moment and try again." : "Could not load the questions. " + err.message, "err");
  }
}

function startExam(t, paper) {
  stopExamTimer();
  exam = { t, paper, answers: new Array(paper.questions.length).fill(-1) };
  document.body.classList.add("exam");
  renderExam();
  examTimer = setInterval(examTick, 500);
  examTick();
  armCheatGuard();
}

function renderExam() {
  const { t, paper, answers } = exam;
  app.innerHTML = `
    <div class="exam-bar"><div class="eb-title">${esc(t.subject)}</div><div class="eb-time" id="eTime">--:--</div></div>
    <div id="examBody">
      <div id="eMsg" class="msg"></div>
      ${paper.questions.map((q, i) => `
        <div class="q-card"><div class="q-no">Question ${i + 1} of ${paper.questions.length}</div>
          <div class="q-text">${esc(q.q)}</div>
          ${q.options.map((o, j) => `<button type="button" class="opt${answers[i] === j ? " sel" : ""}" data-q="${i}" data-o="${j}"><span class="ol">${LETTERS[j]}</span><span class="ot">${esc(o)}</span></button>`).join("")}
        </div>`).join("")}
      <div id="confirmBox"></div>
      <button class="btn block" id="eSubmit"><i class="fa-solid fa-paper-plane"></i> Submit test</button>
    </div>`;
  $("examBody").addEventListener("click", (e) => {
    const o = e.target.closest(".opt");
    if (!o || !exam) return;
    const qi = +o.dataset.q, oi = +o.dataset.o;
    exam.answers[qi] = oi;
    o.parentElement.querySelectorAll(".opt").forEach((x) => x.classList.toggle("sel", x === o));
  });
  $("eSubmit").onclick = askConfirm;
}

function askConfirm() {
  if (!exam) return;
  const left = exam.answers.filter((a) => a < 0).length;
  $("confirmBox").innerHTML = `<div class="card"><div class="q-text">Submit now?</div>
    <p class="note">${left ? `${left} question(s) are still not answered. ` : ""}You cannot change answers after submitting.</p>
    <div class="row-actions"><button class="btn" id="yesSub">Yes, submit</button><button class="btn ghost" id="noSub">Go back</button></div></div>`;
  $("yesSub").onclick = () => finishExam(false);
  $("noSub").onclick = () => { $("confirmBox").innerHTML = ""; };
  $("confirmBox").scrollIntoView({ behavior: "smooth", block: "center" });
}

function examTick() {
  if (!exam) return;
  const left = exam.t.endAt.getTime() - Date.now();
  const el = $("eTime");
  if (el) { el.textContent = fmtClock(left); el.classList.toggle("low", left < 5 * 60 * 1000); }
  if (left <= 0) finishExam(true);
}

// ---- anti-cheat: leaving the test screen erases verification and answers ----
let guardArmed = false;
function onLeave() { if (exam && !submitting) cheatReset(); }
function onVis() { if (document.hidden) onLeave(); }
function armCheatGuard() {
  if (guardArmed) return;
  guardArmed = true;
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onLeave);
  window.addEventListener("blur", onLeave);
}
function cheatReset() {
  const t = exam.t;
  exam = null;                       // answers and questions are dropped from memory
  stopExamTimer();
  app.innerHTML = "";                // questions are removed from the screen
  if (Date.now() > t.endAt.getTime()) {
    document.body.classList.remove("exam");
    app.innerHTML = `<div class="msg show err">You left the test screen and the time is over.</div>`;
    return;
  }
  openVerify(t, "You left the test screen, so your verification and all answers were erased. Fill in your details again to restart.");
}

async function finishExam(auto) {
  if (!exam || submitting) return;
  submitting = true;
  const { t, paper, answers } = exam;
  const btn = $("eSubmit"); if (btn) btn.disabled = true;
  try {
    const kd = await getDoc(doc(db, "testKeys", t.id));
    if (!kd.exists()) throw new Error("Answer key not found.");
    const full = { questions: paper.questions, key: kd.data().answers || [] };
    const r = scoreAnswers(t, full, answers);
    const rec = {
      roll: me.roll, studentName: me.name || me.roll, className: me.class || "",
      answers, score: r.score, total: t.totalMarks, correct: r.correct, wrong: r.wrong, skipped: r.skipped,
      auto: !!auto, submittedAt: serverTimestamp()
    };
    await setDoc(doc(db, "tests", t.id, "submissions", me.roll), rec);
    subs[t.id] = { ...rec, submittedAt: Timestamp.now() };
    exam = null; submitting = false;
    stopExamTimer();
    document.body.classList.remove("exam");
    app.innerHTML = `<button class="btn ghost small" id="backList" style="margin-bottom:12px"><i class="fa-solid fa-arrow-left"></i> Back to tests</button>` +
      `<div class="msg show ok">Test submitted${auto ? " automatically because the time ended" : ""}. Your report is below.</div>` +
      reportHtml(t, subs[t.id], full, me.name || me.roll);
    $("backList").onclick = listView;
  } catch (err) {
    submitting = false;
    const b = $("eSubmit"); if (b) b.disabled = false;
    const denied = err && err.code === "permission-denied";
    say("eMsg", denied ? "Could not submit: the test window has closed or this test was already submitted." : "Could not submit. Check your internet and press Submit again. " + err.message, "err");
    if ($("eMsg")) $("eMsg").scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// =========================================================
// TEACHER: design, publish, results
// =========================================================
let ctx = null;          // { teacherId, myClasses }
let draft = [];          // questions being designed
let editing = -1;

async function teacherContext() {
  const id = localStorage.getItem("teacherDocId");
  if (!id) return null;
  const t = await getDoc(doc(db, "teachers", id));
  if (!t.exists()) return null;
  const teacher = t.data();
  let myClasses = [];
  if (teacher.email) {
    const cs = await getDocs(query(collection(db, "classes"), where("teacherEmail", "==", teacher.email)));
    myClasses = cs.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return { teacherId: id, teacher, myClasses };
}

function teacherHome() {
  document.body.classList.remove("exam");
  const classOpts = ctx.myClasses.map((c) => `<option value="${esc(c.id)}">${esc(c.className || c.id)}</option>`).join("");
  const subj = ctx.teacher.subject ? esc(ctx.teacher.subject) : "";
  app.innerHTML = `
    ${ctx.myClasses.length ? "" : `<div class="msg show info">No class is assigned to you yet. Ask the admin to assign a class before publishing a test.</div>`}
    <div class="card">
      <div class="card-title">Design a new test</div>
      <div id="tMsg" class="msg"></div>
      <div class="form-grid">
        <div class="field"><label for="tClass">Class</label><select id="tClass">${classOpts}</select></div>
        <div class="field"><label for="tSubject">Subject</label><input id="tSubject" type="text" value="${subj}" placeholder="e.g. Science"></div>
        <div class="field full"><label for="tTitle">Test name (optional)</label><input id="tTitle" type="text" placeholder="e.g. Unit Test 1"></div>
        <div class="field"><label for="tStart">Start date and time</label><input id="tStart" type="datetime-local"></div>
        <div class="field"><label for="tDur">Time (minutes)</label><input id="tDur" type="number" min="5" max="300" value="60"></div>
        <div class="field"><label for="tMarks">Marks per question</label><input id="tMarks" type="number" min="1" max="20" value="1"></div>
        <div class="field"><label>Total marks</label><input id="tTotal" type="text" value="0" readonly></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Add MCQ question</div>
      <div id="qMsg" class="msg"></div>
      <div class="form-grid">
        <div class="field full"><label for="qText">Question</label><textarea id="qText" rows="3" maxlength="600"></textarea></div>
        ${LETTERS.map((L, i) => `<div class="field full"><label for="qo${i}">Option ${L}</label>
          <div class="radio-row"><input type="radio" name="qCorrect" id="qr${i}" value="${i}" aria-label="Option ${L} is correct"><input id="qo${i}" type="text" maxlength="250"></div></div>`).join("")}
      </div>
      <p class="note" style="margin-bottom:12px">Select the round button next to the correct option.</p>
      <button class="btn" id="qAdd"><i class="fa-solid fa-plus"></i> <span id="qAddLbl">Add question</span></button>
    </div>
    <div class="card">
      <div class="card-title">Questions (<span id="qCount">0</span>)</div>
      <div id="qList"></div>
      <button class="btn block" id="tPublish" style="margin-top:14px"><i class="fa-solid fa-upload"></i> Publish test</button>
    </div>
    <div class="card">
      <div class="card-title">Published tests</div>
      <div id="tList">${loading()}</div>
    </div>`;
  const d = new Date(Date.now() + 3600000); d.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  $("tStart").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  $("tMarks").oninput = updateTotal;
  $("qAdd").onclick = addQuestion;
  $("tPublish").onclick = publishTest;
  renderDraft();
  loadMyTests();
}

function updateTotal() {
  const m = parseInt($("tMarks").value, 10) || 0;
  $("tTotal").value = String(m * draft.length);
}

function addQuestion() {
  const q = $("qText").value.trim();
  const options = LETTERS.map((_, i) => $("qo" + i).value.trim());
  const picked = document.querySelector('input[name="qCorrect"]:checked');
  if (!q) return say("qMsg", "Write the question.", "err");
  if (options.some((o) => !o)) return say("qMsg", "Fill all four options.", "err");
  if (new Set(options.map((o) => o.toLowerCase())).size < 4) return say("qMsg", "Two options are the same. Make each option different.", "err");
  if (!picked) return say("qMsg", "Select the correct option.", "err");
  if (draft.length >= 100 && editing < 0) return say("qMsg", "A test can have at most 100 questions.", "err");
  const item = { q, options, correct: +picked.value };
  if (editing >= 0) { draft.splice(editing, 0, item); editing = -1; $("qAddLbl").textContent = "Add question"; }
  else draft.push(item);
  $("qText").value = ""; LETTERS.forEach((_, i) => { $("qo" + i).value = ""; $("qr" + i).checked = false; });
  say("qMsg", "");
  renderDraft();
}

function renderDraft() {
  $("qCount").textContent = draft.length;
  updateTotal();
  $("qList").innerHTML = draft.length ? draft.map((x, i) => `
    <div class="q-mini"><div class="qm-body"><b>${i + 1}.</b> ${esc(x.q)}<br>
      ${x.options.map((o, j) => `${LETTERS[j]}) ${esc(o)}`).join(" &nbsp; ")}<br><small>Correct: ${LETTERS[x.correct]}</small></div>
      <div class="row-actions" style="margin:0"><button class="btn ghost small" data-edit="${i}" aria-label="Edit question ${i + 1}"><i class="fa-solid fa-pen"></i></button>
      <button class="btn danger small" data-del="${i}" aria-label="Remove question ${i + 1}"><i class="fa-solid fa-trash"></i></button></div></div>`).join("")
    : `<div class="empty">No questions added yet.</div>`;
  $("qList").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { draft.splice(+b.dataset.del, 1); renderDraft(); });
  $("qList").querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => {
    if (editing >= 0) return say("qMsg", "Finish the question you are editing first.", "err");
    const i = +b.dataset.edit, x = draft[i];
    draft.splice(i, 1); editing = i;
    $("qText").value = x.q; x.options.forEach((o, j) => { $("qo" + j).value = o; });
    $("qr" + x.correct).checked = true;
    $("qAddLbl").textContent = "Save question";
    renderDraft();
    $("qText").scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

async function publishTest() {
  const cls = ctx.myClasses.find((c) => c.id === $("tClass").value);
  const subject = $("tSubject").value.trim();
  const title = $("tTitle").value.trim();
  const startVal = $("tStart").value;
  const dur = parseInt($("tDur").value, 10);
  const mpq = parseInt($("tMarks").value, 10);
  if (editing >= 0) return say("tMsg", "Finish editing the question first (press Save question).", "err");
  if (!cls) return say("tMsg", "Choose a class.", "err");
  if (!subject) return say("tMsg", "Enter the subject.", "err");
  if (!startVal) return say("tMsg", "Choose the start date and time.", "err");
  const startAt = new Date(startVal);
  if (isNaN(startAt) || startAt.getTime() < Date.now() - 60000) return say("tMsg", "Start time must not be in the past.", "err");
  if (!(dur >= 5 && dur <= 300)) return say("tMsg", "Time must be between 5 and 300 minutes.", "err");
  if (!(mpq >= 1 && mpq <= 20)) return say("tMsg", "Marks per question must be between 1 and 20.", "err");
  if (!draft.length) return say("tMsg", "Add at least one question.", "err");

  const btn = $("tPublish"); btn.disabled = true; say("tMsg", "Publishing...", "info");
  const ref = doc(collection(db, "tests"));
  const endAt = new Date(startAt.getTime() + dur * 60000);
  try {
    await setDoc(ref, {
      subject, title, classId: cls.id, className: cls.className || cls.id, classKey: classKeyOf(cls.className || cls.id),
      startAt: Timestamp.fromDate(startAt), endAt: Timestamp.fromDate(endAt), durationMin: dur,
      marksPerQuestion: mpq, questionCount: draft.length, totalMarks: mpq * draft.length,
      postedBy: ctx.teacherId, createdAt: serverTimestamp()
    });
    try {
      await setDoc(doc(db, "testQuestions", ref.id), { questions: draft.map((x) => ({ q: x.q, options: x.options })) });
      await setDoc(doc(db, "testKeys", ref.id), { answers: draft.map((x) => x.correct) });
    } catch (inner) {
      try { await deleteDoc(ref); } catch (e) { /* ignore */ }
      throw inner;
    }
    draft = [];
    say("tMsg", "Test published. Students of the class can see it now.", "ok");
    $("tSubject").value = ctx.teacher.subject || ""; $("tTitle").value = "";
    renderDraft(); await loadMyTests();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    say("tMsg", "Could not publish. " + err.message, "err");
  }
  btn.disabled = false;
}

async function loadMyTests() {
  const box = $("tList");
  try {
    const snap = await getDocs(query(collection(db, "tests"), where("postedBy", "==", ctx.teacherId)));
    const list = snap.docs.map(readTest).sort((a, b) => b.startAt - a.startAt);
    if (!list.length) { box.innerHTML = `<div class="empty">You have not published any test yet.</div>`; return; }
    const now = Date.now();
    box.innerHTML = list.map((t) => {
      const st = now < t.startAt ? ["Upcoming", "st-wait"] : now <= t.endAt ? ["Live now", "st-live"] : ["Finished", "st-done"];
      return `<div class="q-mini"><div class="qm-body"><b>${esc(t.subject)}</b>${t.title ? " - " + esc(t.title) : ""}<br>
        <span class="note">Class ${esc(t.className)} | ${fmtWhen(t.startAt)} | ${fmtDur(t.durationMin)} | ${t.totalMarks} marks</span><br>
        <span class="tc-state ${st[1]}">${st[0]}</span>
        <div class="row-actions"><button class="btn small" data-res="${esc(t.id)}"><i class="fa-solid fa-chart-simple"></i> Results</button>
        <button class="btn danger small" data-rm="${esc(t.id)}"><i class="fa-solid fa-trash"></i> Delete</button></div>
        <div id="rm-${esc(t.id)}"></div></div></div>`;
    }).join("");
    const byId = Object.fromEntries(list.map((t) => [t.id, t]));
    box.querySelectorAll("[data-res]").forEach((b) => b.onclick = () => teacherResults(byId[b.dataset.res]));
    box.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => confirmDelete(byId[b.dataset.rm]));
  } catch (err) {
    box.innerHTML = `<div class="msg show err">Could not load tests. ${esc(err.message)}</div>`;
  }
}

function confirmDelete(t) {
  const slot = $("rm-" + t.id);
  slot.innerHTML = `<div class="msg show err" style="margin-top:10px">Delete this test and all student results? This cannot be undone.
    <div class="row-actions"><button class="btn danger small" id="rmYes-${esc(t.id)}">Yes, delete</button><button class="btn ghost small" id="rmNo-${esc(t.id)}">Cancel</button></div></div>`;
  $("rmNo-" + t.id).onclick = () => { slot.innerHTML = ""; };
  $("rmYes-" + t.id).onclick = async () => {
    try {
      const subsSnap = await getDocs(collection(db, "tests", t.id, "submissions"));
      await Promise.all(subsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "testQuestions", t.id));
      await deleteDoc(doc(db, "testKeys", t.id));
      await deleteDoc(doc(db, "tests", t.id));
      loadMyTests();
    } catch (err) { slot.innerHTML = `<div class="msg show err">Could not delete. ${esc(err.message)}</div>`; }
  };
}

async function teacherResults(t) {
  app.innerHTML = loading();
  window.scrollTo({ top: 0 });
  try {
    const [subSnap, stuSnap] = await Promise.all([
      getDocs(collection(db, "tests", t.id, "submissions")),
      getDocs(collection(db, "students"))
    ]);
    const done = subSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.score - a.score || String(a.studentName).localeCompare(b.studentName));
    const doneRolls = new Set(done.map((s) => s.id));
    const missing = stuSnap.docs.filter((d) => classKeyOf(d.data().class) === t.classKey && !doneRolls.has(d.id));
    const avg = done.length ? (done.reduce((a, s) => a + s.score, 0) / done.length) : 0;
    const high = done.length ? done[0].score : 0;
    app.innerHTML = `
      <button class="btn ghost small" id="backT" style="margin-bottom:12px"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div class="card"><div class="card-title">${esc(t.subject)}${t.title ? " - " + esc(t.title) : ""}</div>
        <div class="note">Class ${esc(t.className)} | ${fmtWhen(t.startAt)} | ${t.totalMarks} marks</div>
        <div class="stat-row"><div class="stat"><b>${done.length}</b><span>Submitted</span></div>
          <div class="stat"><b>${avg.toFixed(1)}</b><span>Average</span></div>
          <div class="stat g"><b>${high}</b><span>Highest</span></div></div></div>
      <div class="card"><div class="card-title">Student results</div>
        ${done.length ? `<div class="table-wrap"><table class="res-table"><thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Marks</th><th></th></tr></thead><tbody>
          ${done.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.studentName)}</td><td>${esc(s.id)}</td><td class="num">${s.score} / ${t.totalMarks}</td>
          <td><button class="btn ghost small" data-view="${esc(s.id)}">View</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No student has submitted yet.</div>`}
      </div>
      ${missing.length ? `<div class="card"><div class="card-title">Not attempted (${missing.length})</div>
        <div class="note">${missing.map((d) => esc(d.data().name || d.id)).join(", ")}</div></div>` : ""}`;
    $("backT").onclick = teacherHome;
    const bySub = Object.fromEntries(done.map((s) => [s.id, s]));
    app.querySelectorAll("[data-view]").forEach((b) => b.onclick = async () => {
      const s = bySub[b.dataset.view];
      app.innerHTML = loading();
      try {
        const paper = await loadPaper(t.id);
        app.innerHTML = `<button class="btn ghost small" id="backR" style="margin-bottom:12px"><i class="fa-solid fa-arrow-left"></i> Back to results</button>` +
          reportHtml(t, s, paper, `${s.studentName} (Roll ${s.id})`);
        $("backR").onclick = () => teacherResults(t);
      } catch (err) { app.innerHTML = `<div class="msg show err">${esc(err.message)}</div>`; }
    });
  } catch (err) {
    app.innerHTML = `<div class="msg show err">Could not load results. ${esc(err.message)}</div><button class="btn ghost small" id="backT">Back</button>`;
    $("backT").onclick = teacherHome;
  }
}

// =========================================================
// boot
// =========================================================
(async function init() {
  if (!app) return;
  app.innerHTML = loading();
  try {
    if (ROLE === "teacher") {
      ctx = await teacherContext();
      if (!ctx) { app.innerHTML = `<div class="msg show err">Teacher record not found. Please log in again.</div>`; return; }
      teacherHome();
      return;
    }
    me = await loadMe();
    if (!me) { app.innerHTML = `<div class="msg show err">Student record not found. Please log in again.</div>`; return; }
    await loadTestsForMe();
    listView();
  } catch (err) {
    app.innerHTML = `<div class="msg show err">Could not load tests. ${esc(err.message)}</div>`;
  }
})();
