// Teacher: how every student did in one test.
import { db } from "./Firebase.js";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, Timestamp, serverTimestamp, updateDoc }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml, tsMs, fmtDuration, fmtDateTime, fmtDay, gradeAnswers, reportHTML, attemptId, sameSection, classLabel } from "./tests-common.js";

const $ = (id) => document.getElementById(id);
const teacherId = localStorage.getItem("teacherDocId");
const testId = new URLSearchParams(window.location.search).get("id");
let ctx = null; // { test, paper, key }
const DAY = 24 * 60 * 60000;
function toLocalInput(ms) {
  const d = new Date(ms), p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

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
    // New times the teacher already gave to students who missed the test.
    const reschedBy = new Map();
    try { (await getDocs(query(collection(db, "testReschedules"), where("testId", "==", testId)))).forEach((d) => reschedBy.set(d.data().roll, d.data())); }
    catch (e) { console.error("Could not read reschedules:", e); }
    const students = (await getDocs(query(collection(db, "students"), where("class", "==", test.class)))).docs.map((d) => ({ ...d.data(), roll: d.id })).filter((s) => !test.section || sameSection(s.section, test.section));

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
      '<p class="ep-hint">' + escapeHtml(classLabel(test)) + " &middot; " + escapeHtml(fmtDay(tsMs(test.startAt))) + " &middot; " + escapeHtml(fmtDuration(test.durationMinutes)) + " &middot; " + total + " marks &middot; " + (test.questionCount || 0) + " questions</p>" +
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
    // Rescheduling is for students who missed it, so it opens once the test has started.
    const started = now >= tsMs(test.startAt);
    ctx.pending = new Map();
    $("pending").innerHTML = pending.length ? pending.map((s) => {
      const a = attemptBy.get(s.roll), r = reschedBy.get(s.roll), nm = s.name || s.studentName || s.roll;
      let state = "Not started", inProgress = false;
      if (a) { inProgress = now <= tsMs(a.startedAt) + (test.durationMinutes || 0) * 60000; state = inProgress ? "In progress" : "Started but time ended without submitting"; }
      const v = a && a.violations ? " &middot; Left the test screen " + a.violations + (a.violations === 1 ? " time" : " times") : "";
      const canPick = started && !inProgress;
      ctx.pending.set(s.roll, { name: nm, resched: r || null });
      const rs = r ? '<p class="r-meta r-resched">Rescheduled: ' + escapeHtml(fmtDateTime(tsMs(r.startAt))) + " to " + escapeHtml(fmtDateTime(tsMs(r.endAt))) + (now > tsMs(r.endAt) ? " (that time has passed)" : "") + "</p>" : "";
      const acts = (canPick ? '<button type="button" class="ep-btn te-mini" data-resched>' + (r ? "Change time" : "Reschedule") + "</button>" : "") +
        (r ? '<button type="button" class="ep-btn te-mini" data-unresched>Cancel reschedule</button>' : "") +
        (a ? '<button type="button" class="ep-btn te-mini" data-reset>Let them retake</button>' : "");
      return '<article class="r-row" data-roll="' + escapeHtml(s.roll) + '"><div class="r-top">' +
        (canPick ? '<input type="checkbox" class="r-pick" data-pick aria-label="Select ' + escapeHtml(nm) + '">' : '<span class="r-rank">-</span>') +
        '<div class="r-name">' + escapeHtml(nm) + "<small>Roll " + escapeHtml(s.roll) + "</small></div></div>" +
        '<p class="r-meta">' + state + v + "</p>" + rs + (acts ? '<div class="r-actions">' + acts + "</div>" : "") + "</article>";
    }).join("") : '<p class="t-empty">Everyone in the class has submitted.</p>';
    $("bulk").hidden = !(started && pending.some((s) => { const a = attemptBy.get(s.roll); return !a || now > tsMs(a.startedAt) + (test.durationMinutes || 0) * 60000; }));
    $("pickAll").checked = false; refreshBulk();

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

// ---------- Reschedule: give students who missed the test a new time ----------
// Same questions and same time limit. Only the students chosen here get the new time.
let rsRolls = [];

function picks() { return [...document.querySelectorAll("#pending [data-pick]")]; }
function refreshBulk() {
  const n = picks().filter((c) => c.checked).length;
  $("bulkBtn").disabled = !n;
  $("bulkBtn").textContent = n ? "Reschedule selected (" + n + ")" : "Reschedule selected";
  const all = picks();
  $("pickAll").checked = all.length > 0 && n === all.length;
}

function rsErr(key, msg) {
  $("e_" + key).textContent = msg || "";
  $("w_" + key).classList.toggle("invalid", !!msg);
}

function openSheet(rolls) {
  rsRolls = rolls;
  const names = rolls.map((r) => (ctx.pending.get(r) || {}).name || r);
  $("rsWho").textContent = names.length <= 4 ? names.join(", ") : names.length + " students";
  const first = ctx.pending.get(rolls[0]) || {};
  const old = rolls.length === 1 && first.resched ? first.resched : null;
  const startMs = old ? tsMs(old.startAt) : Math.ceil((Date.now() + 30 * 60000) / 300000) * 300000;
  $("rsStart").value = toLocalInput(startMs);
  $("rsEnd").value = toLocalInput(old ? tsMs(old.endAt) : startMs + 3 * 60 * 60000);
  rsErr("rsStart", ""); rsErr("rsEnd", ""); $("e_rsForm").textContent = "";
  $("rsSave").disabled = false;
  $("rsBack").hidden = false;
  $("rsStart").focus();
}
function closeSheet() { $("rsBack").hidden = true; rsRolls = []; }

$("rsStart").addEventListener("change", () => {
  const s = $("rsStart").value ? new Date($("rsStart").value).getTime() : NaN;
  const e = $("rsEnd").value ? new Date($("rsEnd").value).getTime() : NaN;
  if (!isNaN(s) && (isNaN(e) || e < s)) $("rsEnd").value = toLocalInput(s + 3 * 60 * 60000);
});
$("rsCancel").addEventListener("click", closeSheet);
$("rsBack").addEventListener("click", (e) => { if (e.target === $("rsBack")) closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("rsBack").hidden) closeSheet(); });

$("rsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const start = $("rsStart").value ? new Date($("rsStart").value).getTime() : NaN;
  const end = $("rsEnd").value ? new Date($("rsEnd").value).getTime() : NaN;
  rsErr("rsStart", ""); rsErr("rsEnd", ""); $("e_rsForm").textContent = "";
  let bad = false;
  if (isNaN(start)) { rsErr("rsStart", "Choose the new start time."); bad = true; }
  else if (start < Date.now() - 2 * 60000) { rsErr("rsStart", "The new start time must be now or later."); bad = true; }
  if (isNaN(end)) { rsErr("rsEnd", "Choose the last time to start."); bad = true; }
  else if (!isNaN(start) && end < start) { rsErr("rsEnd", "This must be after the new start time."); bad = true; }
  if (bad) return;
  $("rsSave").disabled = true;
  let done = 0;
  for (const roll of rsRolls) {
    try {
      const aid = attemptId(testId, roll);
      await setDoc(doc(db, "testReschedules", aid), { testId, roll, startAt: Timestamp.fromMillis(start), endAt: Timestamp.fromMillis(end), updatedAt: serverTimestamp() });
      // Someone who started earlier but never submitted begins fresh, with a new timer.
      await deleteDoc(doc(db, "testAttempts", aid)).catch(() => {});
      done++;
    } catch (error) { console.error(error); }
  }
  // The answer key must stay locked until the rescheduled students could also have finished.
  if (done) {
    try {
      const t = ctx.test, dur = (t.durationMinutes || 0) * 60000;
      const wanted = end + dur + 2 * 60000;
      const current = t.keyOpenAt ? tsMs(t.keyOpenAt) : tsMs(t.endAt) + dur;
      if (wanted > current) await updateDoc(doc(db, "tests", testId), { keyOpenAt: Timestamp.fromMillis(wanted) });
    } catch (error) { console.error("Could not move the answer key time:", error); }
  }
  closeSheet();
  alert(done === rsRolls.length || !rsRolls.length ? "Done. The new time is saved. The student sees it on their Tests page." : done + " saved. The others could not be saved. Please try again.");
  load();
});

document.addEventListener("change", (event) => {
  if (event.target.closest("[data-pick]")) refreshBulk();
  if (event.target.id === "pickAll") { picks().forEach((c) => { c.checked = event.target.checked; }); refreshBulk(); }
});

document.addEventListener("click", async (event) => {
  const one = event.target.closest("[data-resched]"), cancel = event.target.closest("[data-unresched]");
  if (event.target.closest("#bulkBtn")) {
    const rolls = picks().filter((c) => c.checked).map((c) => c.closest("[data-roll]").getAttribute("data-roll"));
    if (rolls.length) openSheet(rolls);
    return;
  }
  if (one) { openSheet([one.closest("[data-roll]").getAttribute("data-roll")]); return; }
  if (cancel) {
    if (!confirm("Cancel the new time for this student? They will not be able to take the test unless the original time is still open.")) return;
    cancel.disabled = true;
    try { await deleteDoc(doc(db, "testReschedules", attemptId(testId, cancel.closest("[data-roll]").getAttribute("data-roll")))); load(); }
    catch (error) { console.error(error); cancel.disabled = false; alert("Could not cancel. Please try again."); }
  }
});

load();
