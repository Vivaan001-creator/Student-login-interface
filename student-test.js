// Student test page: wait for start time -> verify identity -> answer MCQs -> submit.
//
// Anti-cheat: the moment the student leaves this screen (switches app or tab, locks the
// phone, pulls down the notification bar, or reloads), the verification and every answer
// are erased from memory and the student must fill in the details again. Nothing about
// the answers is ever saved on the device. Only the end time of the test is remembered, so
// leaving and coming back does not give extra time.
import { db } from "./Firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  escapeHtml, classKeyOf, normText, toISODate, lastTenDigits, toDate,
  fmtDuration, fmtDateTime, fmtCountdown, attemptId, getTest, getAttempt, getQuestions, LETTERS
} from "./tests-core.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const testId = params.get("id");
const roll = localStorage.getItem("studentRoll");

if (localStorage.getItem("studentLoggedIn") !== "true" || !roll) {
  location.replace("student-login.html");
}

let test = null, student = null;
let questions = [];
let answers = {};
let active = false;      // true only while questions are on screen
let submitting = false;
let timerId = null, waitId = null;
let deadline = 0;

const deadlineKey = () => `gaTestEnd_${testId}_${roll}`;

function show(which) {
  ["sLoading", "sMsg", "sVerify", "sTest"].forEach((id) => { $(id).hidden = id !== which; });
  const running = which === "sTest";
  $("testBar").hidden = !running;
  $("normalHeader").hidden = running;
}

function showMsg(title, body, btnText, btnAction) {
  $("msgTitle").textContent = title;
  $("msgBody").textContent = body;
  $("msgCountdown").textContent = "";
  const b = $("msgBtn");
  if (btnText) { b.hidden = false; b.textContent = btnText; b.onclick = btnAction; } else { b.hidden = true; }
  show("sMsg");
}

function goDashboard() { location.replace("student-dashboard.html"); }
$("backBtn").addEventListener("click", () => { if (!active) goDashboard(); });

function reportUrl() {
  return `test-report.html?test=${encodeURIComponent(testId)}&roll=${encodeURIComponent(roll)}&role=student`;
}

// ---------- start ----------
async function init() {
  if (!testId) return showMsg("Test not found", "This test link is not valid.", "Back to dashboard", goDashboard);
  try {
    const [t, st] = await Promise.all([getTest(testId), getDoc(doc(db, "students", roll))]);
    if (!t || !st.exists()) return showMsg("Test not found", "This test is not available.", "Back to dashboard", goDashboard);
    test = t; student = st.data();
    $("hdrSubject").textContent = test.subject || "Test";
    $("hdrSub").textContent = `${fmtDuration(test.durationMin)} \u00b7 ${test.totalMarks} marks`;

    if (classKeyOf(test.classKey || test.classId) !== classKeyOf(student.class)) {
      return showMsg("Not for your class", "This test was published for a different class.", "Back to dashboard", goDashboard);
    }
    if (await getAttempt(testId, roll)) { location.replace(reportUrl()); return; }
    if (test.status !== "published") {
      return showMsg("Test closed", "This test is closed. Please contact your teacher.", "Back to dashboard", goDashboard);
    }
    waitForStart();
  } catch (e) {
    console.error(e);
    showMsg("Could not load the test", e.message, "Try again", () => location.reload());
  }
}

function waitForStart() {
  const start = toDate(test.startAt);
  const check = () => {
    if (!start || Date.now() >= start.getTime()) { clearInterval(waitId); showVerify(); return true; }
    $("msgCountdown").textContent = "Starts in " + fmtCountdown(start.getTime() - Date.now());
    return false;
  };
  if (start && Date.now() < start.getTime()) {
    showMsg("Test has not started", `This test starts on ${fmtDateTime(test.startAt)}. You cannot begin before that.`, "Back to dashboard", goDashboard);
    waitId = setInterval(check, 1000);
    check();
  } else {
    showVerify();
  }
}

// ---------- verification ----------
function showVerify(notice) {
  $("verifyIntro").textContent = "Enter your details exactly as given to the school. You will see the questions only after they match.";
  const err = $("verifyError");
  if (notice) { err.textContent = notice; err.hidden = false; } else { err.hidden = true; }
  ["vName", "vFather", "vDob", "vMobile"].forEach((id) => { $(id).value = ""; });
  show("sVerify");
}

$("verifyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("verifyError");
  const name = normText($("vName").value);
  const father = normText($("vFather").value);
  const dob = toISODate($("vDob").value);
  const mobile = lastTenDigits($("vMobile").value);

  if (!name || !father || !dob || mobile.length < 10) {
    err.textContent = "Please fill all four details.";
    err.hidden = false;
    return;
  }

  const okName = name === normText(student.name || student.studentName);
  const okFather = father === normText(student.father);
  const okDob = dob === toISODate(student.dob);
  const okMobile = mobile === lastTenDigits(student.contactNumber) || (student.altContact && mobile === lastTenDigits(student.altContact));

  if (!(okName && okFather && okDob && okMobile)) {
    err.textContent = "These details do not match the school record. Please check and try again.";
    err.hidden = false;
    return;
  }
  err.hidden = true;
  $("verifyBtn").disabled = true;
  try {
    await beginTest();
  } catch (ex) {
    console.error(ex);
    err.textContent = "Could not load the questions: " + ex.message;
    err.hidden = false;
  } finally {
    $("verifyBtn").disabled = false;
  }
});

// ---------- the test ----------
async function beginTest() {
  questions = await getQuestions(testId);
  if (!questions.length) throw new Error("This test has no questions yet.");
  answers = {};

  let end = Number(sessionStorage.getItem(deadlineKey()) || 0);
  if (!end) {
    end = Date.now() + Number(test.durationMin) * 60000;
    sessionStorage.setItem(deadlineKey(), String(end));
  }
  deadline = end;

  if (Date.now() >= deadline) {
    // Time already ran out earlier (the student left and came back after the end).
    await submitNow(true);
    return;
  }

  renderQuestions();
  $("barSubject").textContent = test.subject || "Test";
  updateCount();
  show("sTest");
  window.scrollTo(0, 0);
  active = true;
  startTimer();
}

function renderQuestions() {
  $("qWrap").innerHTML = questions.map((q, i) => `
    <div class="t-take-q">
      <div class="qtext">${i + 1}. ${escapeHtml(q.q)}</div>
      ${(q.options || []).map((o, oi) => `
        <button type="button" class="t-choice" data-q="${i}" data-o="${oi}">
          <span class="key">${LETTERS[oi]}</span><span>${escapeHtml(o)}</span>
        </button>`).join("")}
    </div>`).join("");
}

$("qWrap").addEventListener("click", (e) => {
  const b = e.target.closest(".t-choice");
  if (!b || !active) return;
  const qi = b.dataset.q, oi = Number(b.dataset.o);
  answers[qi] = oi;
  b.parentElement.querySelectorAll(".t-choice").forEach((x) => x.classList.toggle("sel", x === b));
  updateCount();
});

function updateCount() {
  $("barCount").textContent = `${Object.keys(answers).length} of ${questions.length} answered`;
}

function startTimer() {
  clearInterval(timerId);
  const tick = () => {
    const left = deadline - Date.now();
    if (left <= 0) { clearInterval(timerId); $("timer").textContent = "00:00"; submitNow(true); return; }
    const s = Math.floor(left / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    $("timer").textContent = (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    $("timer").classList.toggle("low", left < 5 * 60000);
  };
  tick();
  timerId = setInterval(tick, 1000);
}

// ---------- anti-cheat ----------
function leftTheTest() {
  if (!active || submitting) return;
  active = false;
  clearInterval(timerId);
  answers = {};
  questions = [];
  $("qWrap").innerHTML = "";
  showVerify("You left the test screen, so your verification and all your answers were erased. Fill in your details again to continue. The timer did not stop.");
}
document.addEventListener("visibilitychange", () => { if (document.hidden) leftTheTest(); });
window.addEventListener("pagehide", leftTheTest);
window.addEventListener("blur", leftTheTest);
document.addEventListener("contextmenu", (e) => { if (active) e.preventDefault(); });

// ---------- submit ----------
$("submitBtn").addEventListener("click", () => {
  if (!active) return;
  const left = questions.length - Object.keys(answers).length;
  $("confirmText").textContent = left
    ? `You have not answered ${left} question${left > 1 ? "s" : ""}. You cannot change anything after submitting.`
    : "You have answered every question. You cannot change anything after submitting.";
  $("confirmBox").hidden = false;
});
$("confirmNo").addEventListener("click", () => { $("confirmBox").hidden = true; });
$("confirmYes").addEventListener("click", () => { $("confirmBox").hidden = true; submitNow(false); });

async function submitNow(auto) {
  if (submitting) return;
  submitting = true;
  active = false;           // stop the leave-detection while we save
  clearInterval(timerId);
  const err = $("submitError");
  err.hidden = true;
  $("submitBtn").disabled = true;
  try {
    await setDoc(doc(db, "testAttempts", attemptId(testId, roll)), {
      testId,
      roll,
      studentName: student.name || student.studentName || roll,
      classKey: classKeyOf(student.class),
      answers,
      autoSubmitted: !!auto,
      submittedAt: serverTimestamp()
    });
    sessionStorage.removeItem(deadlineKey());
    location.replace(reportUrl());
  } catch (e) {
    console.error(e);
    // A saved attempt already exists, so just show its report.
    try { if (await getAttempt(testId, roll)) { location.replace(reportUrl()); return; } } catch (x) { /* ignore */ }
    submitting = false;
    $("submitBtn").disabled = false;
    if (Object.keys(answers).length || questions.length) {
      active = true;
      err.textContent = "Could not submit: " + e.message + ". Check your internet and tap Submit again.";
      err.hidden = false;
      if (Date.now() < deadline) startTimer();
    } else {
      showMsg("Could not submit", e.message, "Try again", () => location.reload());
    }
  }
}

init();
