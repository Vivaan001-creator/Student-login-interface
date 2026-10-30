// Report for one test and one student. Shown to the student and to their parent.
import { db } from "./Firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml, tsMs, fmtDay, fmtDuration, fmtDateTime, reportHTML, attemptId, keyOpenMs } from "./tests-common.js";
import { normalizeMobile } from "./profile-utils.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const testId = params.get("id");
const isStudent = localStorage.getItem("studentLoggedIn") === "true";
const roll = isStudent ? localStorage.getItem("studentRoll") : (params.get("roll") || localStorage.getItem("parentActiveRoll"));

function say(text) { $("pageLoading").hidden = true; const m = $("message"); m.hidden = false; m.textContent = text; }

(async function init() {
  if (!testId || !roll) { window.location.replace("login.html"); return; }
  try {
    const student = await getDoc(doc(db, "students", roll));
    if (!student.exists()) { window.location.replace("login.html"); return; }
    if (!isStudent) {
      const contact = localStorage.getItem("parentContact");
      const okParent = localStorage.getItem("parentLoggedIn") === "true" && contact && normalizeMobile(student.data().contactNumber) === normalizeMobile(contact);
      if (!okParent) { window.location.replace("parent-login.html"); return; }
      $("backBtn").setAttribute("href", "parent-tests.html");
      document.querySelector(".ep-back").setAttribute("href", "parent-tests.html");
    }
    const aid = attemptId(testId, roll);
    const [tSnap, sSnap] = await Promise.all([getDoc(doc(db, "tests", testId)), getDoc(doc(db, "testSubmissions", aid))]);
    if (!tSnap.exists()) { say("This test was not found."); return; }
    if (!sSnap.exists()) { say("There is no submission for this test yet."); return; }
    const test = tSnap.data(), sub = sSnap.data();
    // The database gives out the questions and the answer key only after the test has closed for everyone.
    if (Date.now() < keyOpenMs(test)) { say("Your answers are saved. The result opens after " + fmtDateTime(keyOpenMs(test)) + "."); return; }
    let paper = { questions: [] }, key = null;
    try { const p = await getDoc(doc(db, "testPapers", testId)); if (p.exists()) paper = p.data(); } catch (e) { /* not ready */ }
    try { const k = await getDoc(doc(db, "testKeys", aid)); if (k.exists()) key = k.data().answers; } catch (e) { /* not ready */ }
    if (!key) { say("The result is not ready yet. Please check again a little later."); return; }

    const took = tsMs(sub.submittedAt) - tsMs(sub.startedAt);
    const left = sub.violations || 0;
    $("head").innerHTML = '<h2 style="margin:0">' + escapeHtml(test.subject) + (test.title ? " &middot; " + escapeHtml(test.title) : "") + "</h2>" +
      '<p class="ep-hint">' + escapeHtml(student.data().name || student.data().studentName || roll) + " &middot; Class " + escapeHtml(test.class) + " &middot; " + escapeHtml(fmtDay(tsMs(test.startAt))) + "</p>" +
      '<div class="ep-readonly-row"><span>Time allowed</span><span>' + escapeHtml(fmtDuration(test.durationMinutes)) + '</span></div>' +
      '<div class="ep-readonly-row"><span>Time taken</span><span>' + (took > 0 ? Math.max(1, Math.round(took / 60000)) + " min" : "-") + "</span></div>" +
      (left ? '<div class="ep-readonly-row"><span>Left the test screen</span><span>' + left + (left === 1 ? " time" : " times") + "</span></div>" : "");
    $("body").innerHTML = reportHTML({ test, paper, key, submission: sub });
    $("pageLoading").hidden = true; $("content").hidden = false;
  } catch (error) {
    console.error(error);
    say("Could not load the report. Please try again.");
  }
})();
