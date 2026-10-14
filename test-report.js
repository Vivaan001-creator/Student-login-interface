// Report for one student's attempt. Opened by the student, the parent or the teacher.
//   test-report.html?test=<testId>&roll=<roll>&role=student|parent|teacher
import { db } from "./Firebase.js";
import { doc, getDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  escapeHtml, getTest, getAttempt, getQuestions, getKey, grade, renderReview, fmtDateTime
} from "./tests-core.js";

const $ = (id) => document.getElementById(id);
const p = new URLSearchParams(location.search);
const testId = p.get("test");
const roll = p.get("roll");
const role = p.get("role");

const backTo = { student: "student-dashboard.html", parent: "parent-dashboard.html", teacher: "teacher-tests.html" }[role] || "login.html";
$("backBtn").addEventListener("click", () => {
  if (role === "teacher") { location.href = backTo; return; }
  // Student and parent dashboards open on their Tests tab if they can.
  try { sessionStorage.setItem("gaOpenTab", "tests"); } catch (e) { /* ignore */ }
  location.href = backTo;
});

function fail(msg) {
  $("state").className = "t-empty";
  $("state").innerHTML = escapeHtml(msg);
}

// Who may open this report.
async function allowed() {
  if (!testId || !roll) return false;
  if (role === "student") {
    return localStorage.getItem("studentLoggedIn") === "true" && localStorage.getItem("studentRoll") === roll;
  }
  if (role === "teacher") return localStorage.getItem("teacherLoggedIn") === "true";
  if (role === "parent") {
    const contact = localStorage.getItem("parentContact");
    if (localStorage.getItem("parentLoggedIn") !== "true" || !contact) return false;
    const snap = await getDocs(query(collection(db, "students"), where("contactNumber", "==", contact)));
    return snap.docs.some((d) => d.id === roll);
  }
  return false;
}

(async function () {
  try {
    if (!(await allowed())) return fail("You do not have access to this report.");
    const [test, attempt] = await Promise.all([getTest(testId), getAttempt(testId, roll)]);
    if (!test) return fail("This test is no longer available.");
    if (!attempt) return fail("This test has not been submitted yet.");

    const [questions, key] = await Promise.all([getQuestions(testId), getKey(testId)]);
    if (!key.length) return fail("The answer key is not available yet.");

    const r = grade(attempt.answers, key, test.marksPerQuestion);
    $("hdrSub").textContent = test.subject || "";
    $("rSubject").textContent = test.subject || "Test";
    $("rTitle").textContent = test.title || "";
    $("rWho").textContent = (attempt.studentName || roll) + " \u00b7 Roll " + roll;
    $("rScore").textContent = `${r.score} / ${r.max}`;
    $("rPercent").textContent = r.max ? Math.round((r.score / r.max) * 100) + "%" : "";
    $("rCorrect").textContent = r.correct;
    $("rWrong").textContent = r.wrong;
    $("rSkipped").textContent = r.skipped;
    $("rWhen").textContent = "Submitted: " + fmtDateTime(attempt.submittedAt) + (attempt.autoSubmitted ? " (auto-submitted when time ended)" : "");
    renderReview($("review"), questions, key, attempt.answers);

    $("state").hidden = true;
    $("report").hidden = false;
  } catch (e) {
    console.error(e);
    fail("Could not load the report: " + e.message);
  }
})();
