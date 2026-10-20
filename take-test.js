// The test screen for a student.
//   1. The student verifies name, father's name, date of birth and mobile number.
//   2. The questions appear and the timer runs. The timer starts from a server time saved
//      once in testAttempts, so leaving and coming back cannot reset it.
//   3. If the student leaves the screen (other app, other tab, back, reload) the answers and
//      the verification are erased and they must verify again. The timer keeps running.
//   4. Submit saves the answers once. The answer key for that student can be read only after that.
import { db } from "./Firebase.js";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml, tsMs, fmtDateTime, fmtDuration, fmtCountdown, marksText, openState, LETTERS, attemptId, reportHTML } from "./tests-common.js";
import { normalizeMobile, toISODateInput } from "./profile-utils.js";

const $ = (id) => document.getElementById(id);
const testId = new URLSearchParams(window.location.search).get("id");
const roll = localStorage.getItem("studentRoll");
const aid = testId && roll ? attemptId(testId, roll) : "";
const LEFT_KEY = "ga_test_left_" + aid;
const GRACE_MS = 2 * 60000;

let student = null, test = null, attempt = null, paper = null;
let answers = [], phase = "loading", timerId = null, submitting = false, deadline = 0;
let failCount = 0, lockedUntil = 0;

const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

function show(which) {
  ["pageLoading", "blocked", "verifyForm", "testView", "resultView"].forEach((id) => { $(id).hidden = id !== which; });
  window.scrollTo(0, 0);
}

function block(title, text) {
  phase = "blocked";
  $("blockedTitle").textContent = title; $("blockedText").textContent = text ? " " + text : "";
  show("blocked");
}

function setErr(key, msg) {
  const e = $("e_" + key), w = $("w_" + key);
  if (e) e.textContent = msg || ""; if (w) w.classList.toggle("invalid", !!msg);
}

// ---------- verification ----------
function showVerify(notice) {
  phase = "verify";
  ["name", "father", "dob", "mobile"].forEach((k) => { $("f_" + k).value = ""; setErr(k, ""); });
  $("e_form").textContent = "";
  const n = $("vNotice");
  n.hidden = !notice; n.textContent = notice || "";
  let info = (test.subject || "Test") + " | " + fmtDuration(test.durationMinutes) + " | " + marksText(test);
  if (attempt) info += " | Your timer is already running";
  $("vInfo").textContent = info;
  $("verifyBtn").disabled = false;
  show("verifyForm");
  $("f_name").focus();
}

function checkDetails() {
  const typed = { name: norm($("f_name").value), father: norm($("f_father").value), dob: $("f_dob").value, mobile: normalizeMobile($("f_mobile").value) };
  ["name", "father", "dob", "mobile"].forEach((k) => setErr(k, ""));
  let missing = false;
  if (!typed.name) { setErr("name", "Enter your name."); missing = true; }
  if (!typed.father) { setErr("father", "Enter your father's name."); missing = true; }
  if (!typed.dob) { setErr("dob", "Choose your date of birth."); missing = true; }
  if (!typed.mobile) { setErr("mobile", "Enter the registered mobile number."); missing = true; }
  if (missing) return null;
  const s = student;
  const ok = typed.name === norm(s.name || s.studentName)
    && typed.father === norm(s.father)
    && typed.dob === toISODateInput(s.dob)
    && typed.mobile === normalizeMobile(s.contactNumber);
  return ok;
}

$("verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("e_form").textContent = "";
  if (Date.now() < lockedUntil) { $("e_form").textContent = "Too many wrong tries. Wait " + Math.ceil((lockedUntil - Date.now()) / 1000) + " seconds and try again."; return; }
  const result = checkDetails();
  if (result === null) return;
  if (!result) {
    failCount++;
    if (failCount >= 5) { failCount = 0; lockedUntil = Date.now() + 60000; $("e_form").textContent = "Too many wrong tries. Wait 60 seconds and try again."; }
    else $("e_form").textContent = "These details do not match our records. Check them and try again.";
    return;
  }
  failCount = 0;
  $("verifyBtn").disabled = true;
  await startTest();
});

// ---------- the attempt and the questions ----------
async function ensureAttempt() {
  const ref = doc(db, "testAttempts", aid);
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { testId, roll, startedAt: serverTimestamp(), violations: 0 });
    snap = await getDoc(ref);
  }
  return snap.data();
}

async function flushViolation() {
  if (!attempt || !localStorage.getItem(LEFT_KEY)) return;
  localStorage.removeItem(LEFT_KEY);
  try { await updateDoc(doc(db, "testAttempts", aid), { violations: increment(1) }); attempt.violations = (attempt.violations || 0) + 1; }
  catch (e) { console.error("Could not record leaving the screen:", e); }
}

async function startTest() {
  try {
    attempt = await ensureAttempt();
    deadline = tsMs(attempt.startedAt) + (test.durationMinutes || 0) * 60000;
    if (Date.now() >= deadline) { block("Your time for this test has ended.", "The test was not submitted. Please tell your teacher."); return; }
    const pSnap = await getDoc(doc(db, "testPapers", testId));
    if (!pSnap.exists()) { showVerify("The questions could not be opened. Check your phone's date and time, then verify again."); return; }
    paper = pSnap.data();
    await flushViolation();
    answers = new Array((paper.questions || []).length).fill(-1);
    renderQuestions();
    phase = "test"; submitting = false;
    $("submitBtn").disabled = false;
    show("testView");
    armLeaveDetection();
    startTimer();
  } catch (error) {
    console.error(error);
    showVerify("Could not start the test. This usually means the start window has closed or the questions are not open yet. Please try again.");
  }
}

function renderQuestions() {
  $("questions").innerHTML = (paper.questions || []).map((q, i) =>
    '<div class="tt-q" role="group" aria-labelledby="qh' + i + '" data-i="' + i + '"><h3 id="qh' + i + '">Question ' + (i + 1) + " of " + paper.questions.length + "</h3>" +
    "<p>" + escapeHtml(q.q) + "</p>" +
    (q.options || []).map((o, k) => '<label class="tt-opt"><input type="radio" name="q' + i + '" value="' + k + '"><span><b>' + LETTERS[k] + ".</b> " + escapeHtml(o) + "</span></label>").join("") +
    "</div>").join("");
  updateProgress();
}

function updateProgress() {
  const done = answers.filter((a) => a !== -1).length;
  $("progress").textContent = "Answered " + done + " of " + answers.length;
}

$("questions").addEventListener("change", (e) => {
  const input = e.target.closest("input[type=radio]");
  if (!input) return;
  answers[parseInt(input.name.slice(1), 10)] = parseInt(input.value, 10);
  updateProgress();
});

// ---------- timer ----------
function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(sec).padStart(2, "0");
}

function startTimer() {
  clearInterval(timerId);
  const tick = () => {
    const left = deadline - Date.now();
    $("timer").textContent = fmtClock(left);
    $("timer").classList.toggle("low", left < 60000);
    if (left <= 0 && phase === "test") { clearInterval(timerId); submit(true); }
  };
  tick();
  timerId = setInterval(tick, 500);
}

// ---------- leaving the screen ----------
function onVisibility() { if (document.hidden) leave(); else if (phase === "verify") flushViolation(); }
function onPageHide() { leave(); }
function blockMenu(e) { if (phase === "test") e.preventDefault(); }

function armLeaveDetection() {
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("contextmenu", blockMenu);
  document.addEventListener("copy", blockMenu);
}
function disarmLeaveDetection() {
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onPageHide);
  document.removeEventListener("contextmenu", blockMenu);
  document.removeEventListener("copy", blockMenu);
}

function leave() {
  if (phase !== "test") return;
  // Erase everything the student had: the questions on screen, their answers, and the verification.
  phase = "verify";
  clearInterval(timerId);
  answers = []; paper = null;
  $("questions").innerHTML = "";
  try { localStorage.setItem(LEFT_KEY, "1"); } catch (e) { /* storage blocked */ }
  disarmLeaveDetection();
  showVerify("You left the test screen, so your answers and your verification were erased. Verify your details again to continue. Your timer kept running.");
}

// ---------- submit and result ----------
async function submit(auto) {
  if (submitting || phase !== "test") return;
  if (!auto) {
    const left = answers.filter((a) => a === -1).length;
    if (!confirm("Submit your test now?" + (left ? " You have " + left + " unanswered question" + (left === 1 ? "." : "s.") : "") + " You cannot change answers after this.")) return;
  }
  submitting = true; $("submitBtn").disabled = true; clearInterval(timerId);
  try {
    const fresh = await getDoc(doc(db, "testAttempts", aid));
    await setDoc(doc(db, "testSubmissions", aid), {
      testId, roll, name: String(student.name || student.studentName || roll).slice(0, 120), class: test.class,
      answers: answers.slice(), startedAt: attempt.startedAt, submittedAt: serverTimestamp(),
      violations: fresh.exists() ? (fresh.data().violations || 0) : (attempt.violations || 0), auto: !!auto
    });
    phase = "result";
    disarmLeaveDetection();
    await showResult(auto);
  } catch (error) {
    console.error(error);
    submitting = false; $("submitBtn").disabled = false;
    alert(auto ? "Time is up, but your test could not be sent. Check your internet and tap Submit test now." : "Could not submit. Check your internet connection and try again.");
  }
}

$("submitBtn").addEventListener("click", () => submit(false));

async function showResult(auto) {
  let key = null;
  try { const k = await getDoc(doc(db, "testKeys", aid)); if (k.exists()) key = k.data().answers; } catch (e) { /* key not ready */ }
  const sub = (await getDoc(doc(db, "testSubmissions", aid))).data();
  $("resultNote").textContent = (auto ? " Time ended, so your test was submitted automatically." : "") + (key ? "" : " Your result will be ready after your teacher checks the test.");
  $("resultBody").innerHTML = key ? reportHTML({ test, paper: paper || { questions: [] }, key, submission: sub }) : "";
  if (key && (!paper || !paper.questions)) {
    // The paper was erased only if the student left; reload it for the report.
    try { const p = await getDoc(doc(db, "testPapers", testId)); if (p.exists()) $("resultBody").innerHTML = reportHTML({ test, paper: p.data(), key, submission: sub }); } catch (e) { /* ignore */ }
  }
  show("resultView");
}

// ---------- start up ----------
async function init() {
  if (!roll || !testId) { window.location.replace("student-tests.html"); return; }
  try {
    const sSnap = await getDoc(doc(db, "students", roll));
    if (!sSnap.exists()) { window.location.replace("student-login.html"); return; }
    student = sSnap.data();
    const tSnap = await getDoc(doc(db, "tests", testId));
    if (!tSnap.exists() || tSnap.data().status !== "published" || tSnap.data().class !== student.class) { block("This test is not available.", "Go back and choose a test from your list."); return; }
    test = tSnap.data();

    const done = await getDoc(doc(db, "testSubmissions", aid));
    if (done.exists()) { window.location.replace("test-report.html?id=" + encodeURIComponent(testId)); return; }

    const now = Date.now(), start = tsMs(test.startAt);
    if (openState(test, now) === "upcoming") {
      const update = () => {
        const left = start - Date.now();
        if (left <= 0) { clearInterval(wait); init(); return; }
        $("blockedTitle").textContent = "This test has not started yet.";
        $("blockedText").textContent = " It starts at " + fmtDateTime(start) + ". Starts in " + fmtCountdown(left) + ".";
      };
      phase = "blocked"; show("blocked");
      const wait = setInterval(update, 1000); update();
      return;
    }

    const aSnap = await getDoc(doc(db, "testAttempts", aid));
    if (aSnap.exists()) {
      attempt = aSnap.data();
      if (Date.now() > tsMs(attempt.startedAt) + (test.durationMinutes || 0) * 60000 + GRACE_MS) { block("Your time for this test has ended.", "The test was not submitted. Please tell your teacher."); return; }
    } else if (openState(test, Date.now()) === "closed") {
      block("This test is closed.", "The last time to start was " + fmtDateTime(tsMs(test.endAt)) + ".");
      return;
    }
    showVerify(localStorage.getItem(LEFT_KEY) ? "You left the test screen earlier, so your answers were erased. Verify your details again to continue." : "");
  } catch (error) {
    console.error(error);
    block("Could not load the test.", "Please go back and try again.");
  }
}

init();
