// Teacher: how every student did in one test.
import { db } from "./Firebase.js";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml, tsMs, fmtDuration, fmtDateTime, fmtDay, gradeAnswers, reportHTML, attemptId } from "./tests-common.js";

const $ = (id) => document.getElementById(id);
const teacherId = localStorage.getItem("teacherDocId");
const testId = new URLSearchParams(window.location.search).get("id");
let ctx = null; // { test, paper, key }

function mins(ms) { return ms > 0 ? Math.max(1, Math.round(ms / 60000)) + " min" : "-"; }

async function load() {
  if (!teacherId) { window.location.replace("teacher-login.html"); return; }
  if (!testId) { $("pageLoading").textContent = "No test selected."; return; }
  try {
    const tSnap = await getDoc(doc(db, "tests", testId));
    if (!tSnap.exists() || tSnap.data().createdBy !== teacherId) { $("pageLoading").textContent = "This test was not found."; return; }
    const test = tSnap.data();
    const pSnap = await getDoc(doc(db, "testPapers", testId));
    const kSnap = await getDoc(doc(db, "testKeys", testId));
    const paper = pSnap.exists() ? pSnap.data() : { questions: [] };
    const key = kSnap.exists() ? kSnap.data().answers : [];
    ctx = { test, paper, key };

    const subs = (await getDocs(query(collection(db, "testSubmissions"), where("testId", "==", testId)))).docs.map((d) => d.data());
    const atts = (await getDocs(query(collection(db, "testAttempts"), where("testId", "==", testId)))).docs.map((d) => d.data());
    const students = (await getDocs(query(collection(db, "students"), where("class", "==", test.class)))).docs.map((d) => ({ ...d.data(), roll: d.id }));

    // A student added after publishing has no key copy yet. Create it so they can see their result.
    for (const s of subs) {
      const kid = attemptId(testId, s.roll);
      const has = await getDoc(doc(db, "testKeys", kid));
      if (!has.exists()) await setDoc(doc(db, "testKeys", kid), { testId, roll: s.roll, answers: key }).catch(() => {});
    }

    const rows = subs.map((s) => ({ s, g: gradeAnswers(s.answers, key, test.marksPerQuestion), took: tsMs(s.submittedAt) - tsMs(s.startedAt) }))
      .sort((a, b) => b.g.score - a.g.score || a.took - b.took);
    let rank = 0, prev = null;
    rows.forEach((r, i) => { if (r.g.score !== prev) { rank = i + 1; prev = r.g.score; } r.rank = rank; });

    const total = test.totalMarks || 0;
    const avg = rows.length ? rows.reduce((a, r) => a + r.g.score, 0) / rows.length : 0;
    $("summary").innerHTML = '<h2 style="margin:0 0 4px">' + escapeHtml(test.subject) + (test.title ? " &middot; " + escapeHtml(test.title) : "") + "</h2>" +
      '<p class="ep-hint">Class ' + escapeHtml(test.class) + " &middot; " + escapeHtml(fmtDay(tsMs(test.startAt))) + " &middot; " + escapeHtml(fmtDuration(test.durationMinutes)) + " &middot; " + total + " marks &middot; " + (test.questionCount || 0) + " questions</p>" +
      '<div class="ep-readonly-row"><span>Submitted</span><span>' + rows.length + " of " + students.length + " students</span></div>" +
      (rows.length ? '<div class="ep-readonly-row"><span>Average</span><span>' + avg.toFixed(1) + " / " + total + '</span></div><div class="ep-readonly-row"><span>Highest</span><span>' + rows[0].g.score + " / " + total + '</span></div><div class="ep-readonly-row"><span>Lowest</span><span>' + rows[rows.length - 1].g.score + " / " + total + "</span></div>" : "");

    $("submitted").innerHTML = rows.length ? rows.map((r, i) => {
      const pct = total ? Math.round((r.g.score / total) * 100) : 0;
      const v = r.s.violations || 0;
      return '<article class="r-row" data-roll="' + escapeHtml(r.s.roll) + '"><div class="r-top"><span class="r-rank" aria-label="Rank ' + r.rank + '">' + r.rank + "</span>" +
        '<div class="r-name">' + escapeHtml(r.s.name || r.s.roll) + "<small>Roll " + escapeHtml(r.s.roll) + "</small></div>" +
        '<div class="r-score">' + r.g.score + " / " + total + "</div></div>" +
        '<p class="r-meta">' + pct + "% &middot; " + r.g.correct + " correct, " + r.g.wrong + " wrong, " + r.g.skipped + " not answered &middot; Time taken " + mins(r.took) +
        (v ? " &middot; Left the test screen " + v + (v === 1 ? " time" : " times") : "") + (r.s.auto ? " &middot; Submitted automatically when time ended" : "") + "</p>" +
        '<div class="r-actions"><button type="button" class="ep-btn te-mini" data-view>View answers</button><button type="button" class="ep-btn te-mini" data-reset>Let them retake</button></div>' +
        '<div class="r-detail" data-detail hidden></div></article>';
    }).join("") : '<p class="t-empty">Nobody has submitted yet.</p>';

    const submitted = new Set(subs.map((s) => s.roll));
    const attemptBy = new Map(atts.map((a) => [a.roll, a]));
    const now = Date.now();
    const pending = students.filter((s) => !submitted.has(s.roll)).sort((a, b) => String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true }));
    $("pending").innerHTML = pending.length ? pending.map((s) => {
      const a = attemptBy.get(s.roll);
      let state = "Not started";
      if (a) state = now > tsMs(a.startedAt) + (test.durationMinutes || 0) * 60000 ? "Started but time ended without submitting" : "In progress";
      const v = a && a.violations ? " &middot; Left the test screen " + a.violations + (a.violations === 1 ? " time" : " times") : "";
      return '<article class="r-row" data-roll="' + escapeHtml(s.roll) + '"><div class="r-top"><span class="r-rank">-</span><div class="r-name">' + escapeHtml(s.name || s.studentName || s.roll) + "<small>Roll " + escapeHtml(s.roll) + "</small></div></div>" +
        '<p class="r-meta">' + state + v + "</p>" + (a ? '<div class="r-actions"><button type="button" class="ep-btn te-mini" data-reset>Let them retake</button></div>' : "") + "</article>";
    }).join("") : '<p class="t-empty">Everyone in the class has submitted.</p>';

    ctx.subs = new Map(subs.map((s) => [s.roll, s]));
    $("pageLoading").hidden = true; $("content").hidden = false;
  } catch (error) {
    console.error(error);
    $("pageLoading").textContent = "Could not load the results. Please try again.";
  }
}

document.addEventListener("click", async (event) => {
  const view = event.target.closest("[data-view]");
  const reset = event.target.closest("[data-reset]");
  if (!view && !reset) return;
  const row = event.target.closest("[data-roll]"), roll = row.getAttribute("data-roll");
  if (view) {
    const box = row.querySelector("[data-detail]");
    if (!box.hidden) { box.hidden = true; view.textContent = "View answers"; return; }
    box.innerHTML = reportHTML({ test: ctx.test, paper: ctx.paper, key: ctx.key, submission: ctx.subs.get(roll) });
    box.hidden = false; view.textContent = "Hide answers";
    return;
  }
  if (!confirm("Let this student take the test again? Their current attempt and answers will be deleted.")) return;
  reset.disabled = true;
  try {
    const aid = attemptId(testId, roll);
    await deleteDoc(doc(db, "testSubmissions", aid)).catch(() => {});
    await deleteDoc(doc(db, "testAttempts", aid));
    alert("Done. The student can start the test again while it is still open.");
    load();
  } catch (error) { console.error(error); reset.disabled = false; alert("Could not reset. Please try again."); }
});

load();
