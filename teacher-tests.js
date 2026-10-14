// Teacher side of the Test feature: design and publish MCQ tests, open/close them, see every report.
import { db } from "./Firebase.js";
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where,
  serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  escapeHtml, classKeyOf, toDate, fmtDuration, fmtDateTime, getKey, grade
} from "./tests-core.js";

const $ = (id) => document.getElementById(id);
const teacherDocId = localStorage.getItem("teacherDocId");

if (localStorage.getItem("teacherLoggedIn") !== "true" || !teacherDocId) {
  location.replace("teacher-login.html");
}

let myClasses = [];
let qCount = 0;

// ---------- helpers ----------
function showView(name) {
  ["listView", "createView", "reportView"].forEach((v) => { $(v).hidden = v !== name + "View"; });
  window.scrollTo(0, 0);
}

function confirmBox(title, text, okLabel) {
  return new Promise((resolve) => {
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;
    $("confirmYes").textContent = okLabel || "OK";
    $("confirmBox").hidden = false;
    const done = (v) => { $("confirmBox").hidden = true; $("confirmYes").onclick = $("confirmNo").onclick = null; resolve(v); };
    $("confirmYes").onclick = () => done(true);
    $("confirmNo").onclick = () => done(false);
  });
}

async function loadClasses() {
  const t = await getDoc(doc(db, "teachers", teacherDocId));
  if (!t.exists() || !t.data().email) return;
  const snap = await getDocs(query(collection(db, "classes"), where("teacherEmail", "==", t.data().email)));
  myClasses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  $("fClass").innerHTML = myClasses.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.className || c.id)}</option>`).join("");
  if (!myClasses.length) $("noClass").hidden = false;
}

// ---------- list ----------
async function loadList() {
  const list = $("testList");
  try {
    const snap = await getDocs(query(collection(db, "tests"), where("postedBy", "==", teacherDocId)));
    const tests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tests.sort((a, b) => (toDate(b.startAt)?.getTime() || 0) - (toDate(a.startAt)?.getTime() || 0));
    if (!tests.length) { list.innerHTML = `<p class="t-empty">No tests yet. Tap "Create new test".</p>`; return; }
    list.innerHTML = tests.map((t) => `
      <div class="t-card" style="flex-direction:column;align-items:stretch;">
        <div class="t-main">
          <div class="t-subject">${escapeHtml(t.subject)} <span style="font-size:12px;font-weight:600;color:var(--ink-soft);">- ${escapeHtml(t.className || t.classId)}</span></div>
          ${t.title ? `<div class="t-title">${escapeHtml(t.title)}</div>` : ""}
          <div class="t-meta">${fmtDuration(t.durationMin)} &middot; ${escapeHtml(t.totalMarks)} marks &middot; ${escapeHtml(t.questionCount)} questions</div>
          <div class="t-when"><i class="fa-regular fa-clock"></i> ${escapeHtml(fmtDateTime(t.startAt))}</div>
          <span class="t-badge ${t.status === "published" ? "green" : "gray"}">${t.status === "published" ? "Published" : "Closed"}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <button class="t-btn small" data-act="report" data-id="${escapeHtml(t.id)}">Reports</button>
          <button class="t-btn ghost small" data-act="toggle" data-id="${escapeHtml(t.id)}" data-status="${escapeHtml(t.status)}">${t.status === "published" ? "Close test" : "Reopen"}</button>
          <button class="t-btn danger small" data-act="delete" data-id="${escapeHtml(t.id)}">Delete</button>
        </div>
      </div>`).join("");
    list._tests = Object.fromEntries(tests.map((t) => [t.id, t]));
  } catch (e) {
    console.error(e);
    list.innerHTML = `<p class="t-empty">Could not load tests: ${escapeHtml(e.message)}</p>`;
  }
}

$("testList").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const id = b.dataset.id;
  const t = $("testList")._tests?.[id];
  try {
    if (b.dataset.act === "report") return openReport(t);
    if (b.dataset.act === "toggle") {
      const next = b.dataset.status === "published" ? "closed" : "published";
      if (next === "closed" && !(await confirmBox("Close this test?", "Students who have not started will not be able to begin. Submitted reports stay visible.", "Close"))) return;
      await updateDoc(doc(db, "tests", id), { status: next });
      return loadList();
    }
    if (b.dataset.act === "delete") {
      if (!(await confirmBox("Delete this test?", "The questions and every student's report for this test will be deleted. This cannot be undone.", "Delete"))) return;
      const atts = await getDocs(query(collection(db, "testAttempts"), where("testId", "==", id)));
      await Promise.all(atts.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "testQuestions", id));
      await deleteDoc(doc(db, "testKeys", id));
      await deleteDoc(doc(db, "tests", id));
      return loadList();
    }
  } catch (err) {
    console.error(err);
    await confirmBox("Something went wrong", err.message, "OK");
  }
});

// ---------- create ----------
function addQuestion() {
  const n = qCount++;
  const el = document.createElement("div");
  el.className = "t-q";
  el.dataset.n = n;
  el.innerHTML = `
    <div class="t-q-head"><span class="qno"></span><button type="button" class="t-btn danger small" data-rm>Remove</button></div>
    <div class="t-field"><textarea rows="2" placeholder="Type the question" maxlength="600" data-qtext></textarea></div>
    ${["A", "B", "C", "D"].map((L, i) => `
      <div class="t-opt-row">
        <input type="radio" name="correct${n}" value="${i}" aria-label="Option ${L} is correct">
        <input type="text" placeholder="Option ${L}" maxlength="200" data-opt="${i}">
      </div>`).join("")}`;
  $("qBuilder").appendChild(el);
  renumber();
}

function renumber() {
  [...$("qBuilder").children].forEach((el, i) => { el.querySelector(".qno").textContent = "Question " + (i + 1); });
  updateTotal();
}

function updateTotal() {
  const n = $("qBuilder").children.length;
  const per = Number($("fMarks").value) || 0;
  $("totalLine").textContent = `${n} question${n === 1 ? "" : "s"} \u00d7 ${per} = ${n * per} total marks`;
}

$("qBuilder").addEventListener("click", (e) => {
  if (e.target.closest("[data-rm]")) {
    const q = e.target.closest(".t-q");
    if ($("qBuilder").children.length > 1) { q.remove(); renumber(); }
  }
});
$("fMarks").addEventListener("input", updateTotal);
$("addQBtn").addEventListener("click", addQuestion);

$("newBtn").addEventListener("click", () => {
  if (!myClasses.length) { $("noClass").hidden = false; return; }
  $("qBuilder").innerHTML = "";
  qCount = 0;
  ["fSubject", "fTitle", "fStart"].forEach((id) => { $(id).value = ""; });
  $("fHours").value = 1; $("fMins").value = 0; $("fMarks").value = 1;
  $("createError").hidden = true;
  addQuestion();
  showView("create");
});
$("cancelBtn").addEventListener("click", () => showView("list"));
$("backListBtn").addEventListener("click", () => showView("list"));

function createError(msg) { const e = $("createError"); e.textContent = msg; e.hidden = false; e.scrollIntoView({ block: "center" }); }

$("publishBtn").addEventListener("click", async () => {
  $("createError").hidden = true;
  const cls = myClasses.find((c) => c.id === $("fClass").value);
  const subject = $("fSubject").value.trim();
  const title = $("fTitle").value.trim();
  const startVal = $("fStart").value;
  const durationMin = (Number($("fHours").value) || 0) * 60 + (Number($("fMins").value) || 0);
  const per = Number($("fMarks").value);

  if (!cls) return createError("Choose a class.");
  if (!subject) return createError("Enter the subject.");
  if (!startVal) return createError("Choose the start date and time.");
  if (durationMin < 1 || durationMin > 360) return createError("Duration must be between 1 minute and 6 hours.");
  if (!(per > 0)) return createError("Marks for each question must be more than 0.");

  const questions = [], key = [];
  const cards = [...$("qBuilder").children];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const q = c.querySelector("[data-qtext]").value.trim();
    const options = [...c.querySelectorAll("[data-opt]")].map((x) => x.value.trim());
    const correct = c.querySelector("input[type=radio]:checked");
    if (!q) return createError(`Question ${i + 1}: type the question.`);
    if (options.some((o) => !o)) return createError(`Question ${i + 1}: fill all four options.`);
    if (!correct) return createError(`Question ${i + 1}: mark the correct option.`);
    questions.push({ q, options });
    key.push(Number(correct.value));
  }

  const start = new Date(startVal);
  if (isNaN(start)) return createError("The start date is not valid.");
  if (!(await confirmBox("Publish this test?", `${questions.length} questions, ${questions.length * per} marks, starts ${start.toLocaleString("en-IN")}. Students of ${cls.className || cls.id} will see it right away. You cannot edit it after publishing.`, "Publish"))) return;

  $("publishBtn").disabled = true;
  try {
    const id = doc(collection(db, "tests")).id;
    // The questions and the key are written first, so the test never appears without them.
    await setDoc(doc(db, "testQuestions", id), { postedBy: teacherDocId, questions });
    await setDoc(doc(db, "testKeys", id), { postedBy: teacherDocId, answers: key });
    await setDoc(doc(db, "tests", id), {
      classId: cls.id,
      className: cls.className || cls.id,
      classKey: classKeyOf(cls.id),
      subject,
      title,
      startAt: Timestamp.fromDate(start),
      durationMin,
      marksPerQuestion: per,
      questionCount: questions.length,
      totalMarks: questions.length * per,
      status: "published",
      postedBy: teacherDocId,
      createdAt: serverTimestamp()
    });
    showView("list");
    await loadList();
  } catch (e) {
    console.error(e);
    createError("Could not publish: " + e.message);
  } finally {
    $("publishBtn").disabled = false;
  }
});

// ---------- report ----------
async function openReport(t) {
  if (!t) return;
  showView("report");
  $("repSubject").textContent = `${t.subject} - ${t.className || t.classId}`;
  $("repMeta").textContent = `${t.title ? t.title + " \u00b7 " : ""}${fmtDuration(t.durationMin)} \u00b7 ${t.totalMarks} marks \u00b7 ${fmtDateTime(t.startAt)}`;
  $("repRows").innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;
  $("pendingBox").hidden = true;

  try {
    const [attSnap, key, stSnap] = await Promise.all([
      getDocs(query(collection(db, "testAttempts"), where("testId", "==", t.id))),
      getKey(t.id),
      getDocs(collection(db, "students"))
    ]);
    const attempts = attSnap.docs.map((d) => d.data());
    const done = new Set(attempts.map((a) => a.roll));
    const classStudents = stSnap.docs.filter((d) => classKeyOf(d.data().class) === classKeyOf(t.classKey || t.classId));

    const rows = attempts.map((a) => ({ a, r: grade(a.answers, key, t.marksPerQuestion) }));
    rows.sort((x, y) => y.r.score - x.r.score);

    const pending = classStudents.filter((d) => !done.has(d.id));
    $("repSubmitted").textContent = rows.length;
    $("repPending").textContent = pending.length;
    $("repAvg").textContent = rows.length ? (rows.reduce((s, x) => s + x.r.score, 0) / rows.length).toFixed(1) : "-";

    $("repRows").innerHTML = rows.length ? rows.map(({ a, r }) => `
      <tr>
        <td><b>${escapeHtml(a.studentName || a.roll)}</b><br><span style="font-size:11px;color:var(--ink-soft);">Roll ${escapeHtml(a.roll)}</span></td>
        <td>${r.score}/${r.max}</td>
        <td>${r.max ? Math.round((r.score / r.max) * 100) : 0}%</td>
        <td><button class="t-link" data-roll="${escapeHtml(a.roll)}">View</button></td>
      </tr>`).join("") : `<tr><td colspan="4" class="t-empty">No student has submitted yet.</td></tr>`;

    if (pending.length) {
      $("pendingBox").hidden = false;
      $("pendingList").innerHTML = pending.map((d) => `${escapeHtml(d.data().name || d.id)} <span style="color:var(--ink-soft);font-size:11.5px;">(Roll ${escapeHtml(d.id)})</span>`).join("<br>");
    }
    $("repRows")._testId = t.id;
  } catch (e) {
    console.error(e);
    $("repRows").innerHTML = `<tr><td colspan="4" class="t-empty">Could not load: ${escapeHtml(e.message)}</td></tr>`;
  }
}

$("repRows").addEventListener("click", (e) => {
  const b = e.target.closest("[data-roll]");
  if (!b) return;
  location.href = `test-report.html?test=${encodeURIComponent($("repRows")._testId)}&roll=${encodeURIComponent(b.dataset.roll)}&role=teacher`;
});

// ---------- start ----------
(async function () {
  try { await loadClasses(); } catch (e) { console.error(e); }
  await loadList();
})();
