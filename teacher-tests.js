// Teacher: list of tests I created, with a way to open the designer, the results, or delete.
import { db } from "./Firebase.js";
import { collection, doc, getDoc, getDocs, query, where, deleteDoc }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml, fmtDuration, fmtDateTime, tsMs, marksText, attemptId } from "./tests-common.js";

const $ = (id) => document.getElementById(id);
const teacherId = localStorage.getItem("teacherDocId");
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

async function assignedClasses() {
  const t = await getDoc(doc(db, "teachers", teacherId));
  if (!t.exists()) return [];
  const email = t.data().email;
  const snap = await getDocs(query(collection(db, "classes"), where("teacherEmail", "==", email)));
  return snap.docs.map((d) => d.id);
}

function card(id, t) {
  const published = t.status === "published";
  const href = (published ? "teacher-test-report.html?id=" : "teacher-test-edit.html?id=") + encodeURIComponent(id);
  return '<article class="t-card" data-id="' + escapeHtml(id) + '"><div class="t-main">' +
    '<h3 class="t-subject">' + escapeHtml(t.subject || "Test") + "</h3>" +
    '<p class="t-meta">' + escapeHtml(fmtDuration(t.durationMinutes)) + " &middot; " + escapeHtml(marksText(t)) + " &middot; " + (t.questionCount || 0) + " questions</p>" +
    (t.title ? '<p class="t-title">' + escapeHtml(t.title) + "</p>" : "") +
    '<p class="t-start">Class ' + escapeHtml(t.class || "-") + " &middot; Starts " + escapeHtml(fmtDateTime(tsMs(t.startAt))) + "</p>" +
    '<p class="t-status"><span class="t-chip ' + (published ? "pub" : "") + '">' + (published ? "Published" : "Draft") + "</span></p>" +
    '<div class="r-actions"><button type="button" class="ep-btn te-mini" data-delete>Delete</button></div></div>' +
    '<a class="t-go" href="' + href + '" aria-label="' + (published ? "Open results for " : "Edit ") + escapeHtml(t.subject || "test") + '">' + ARROW + "</a></article>";
}

async function load() {
  try {
    const classes = await assignedClasses();
    if (!classes.length) { $("noClass").hidden = false; $("createBtn").setAttribute("aria-disabled", "true"); $("createBtn").style.opacity = ".5"; $("createBtn").addEventListener("click", (e) => e.preventDefault()); }
    const snap = await getDocs(query(collection(db, "tests"), where("createdBy", "==", teacherId)));
    const items = snap.docs.map((d) => ({ id: d.id, t: d.data() })).sort((a, b) => tsMs(b.t.startAt) - tsMs(a.t.startAt));
    $("pageLoading").hidden = true; $("content").hidden = false;
    $("list").innerHTML = items.map((x) => card(x.id, x.t)).join("");
    $("emptyState").hidden = items.length > 0;
  } catch (error) {
    console.error(error);
    $("pageLoading").textContent = "Could not load your tests. Please try again.";
  }
}

async function deleteTest(id) {
  const tSnap = await getDoc(doc(db, "tests", id));
  const cls = tSnap.exists() ? tSnap.data().class : "";
  const rolls = new Set();
  const subs = await getDocs(query(collection(db, "testSubmissions"), where("testId", "==", id)));
  subs.forEach((d) => rolls.add(d.data().roll));
  const atts = await getDocs(query(collection(db, "testAttempts"), where("testId", "==", id)));
  atts.forEach((d) => rolls.add(d.data().roll));
  if (cls) { const st = await getDocs(query(collection(db, "students"), where("class", "==", cls))); st.forEach((d) => rolls.add(d.id)); }
  for (const roll of rolls) {
    const aid = attemptId(id, roll);
    await deleteDoc(doc(db, "testSubmissions", aid)).catch(() => {});
    await deleteDoc(doc(db, "testAttempts", aid)).catch(() => {});
    await deleteDoc(doc(db, "testKeys", aid)).catch(() => {});
  }
  await deleteDoc(doc(db, "testKeys", id)).catch(() => {});
  await deleteDoc(doc(db, "testPapers", id)).catch(() => {});
  await deleteDoc(doc(db, "tests", id));
}

$("list").addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-delete]");
  if (!btn) return;
  const id = btn.closest("[data-id]").getAttribute("data-id");
  if (!confirm("Delete this test? Every student's result for it will be deleted too. This cannot be undone.")) return;
  btn.disabled = true;
  try { await deleteTest(id); alert("Test deleted."); load(); }
  catch (error) { console.error(error); btn.disabled = false; alert("Could not delete the test. Please try again."); }
});

if (!teacherId) window.location.replace("teacher-login.html"); else load();
