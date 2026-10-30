// Teacher designs a multiple choice test, saves it as a draft, or publishes it.
// Publishing writes the questions and the answer key to separate documents (see firestore.rules).
import { db } from "./Firebase.js";
import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp, Timestamp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { escapeHtml, tsMs, LETTERS, attemptId, fmtDuration, fmtDateTime, sameSection } from "./tests-common.js";
import { readQuestions as parsePasted, SAMPLE_TEXT, SAMPLE_CSV, buildAiPrompt } from "./question-import.js";

const $ = (id) => document.getElementById(id);
const teacherId = localStorage.getItem("teacherDocId");
const params = new URLSearchParams(window.location.search);
let testId = params.get("id") || "";
let teacherName = "";
let uid = 0;
const classSections = {};   // class id -> sections the admin set for it
let secToken = 0;

const val = (id) => String($(id).value || "").trim();
function setErr(key, msg) {
  const e = $("e_" + key), w = $("w_" + key);
  if (e) e.textContent = msg || "";
  if (w) w.classList.toggle("invalid", !!msg);
}
function toLocalInput(ms) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

// ---------- questions ----------
function addQuestion(data) {
  const k = ++uid;
  const wrap = document.createElement("section");
  wrap.className = "te-q"; wrap.setAttribute("data-q", String(k));
  let opts = "";
  for (let i = 0; i < 4; i++) {
    opts += '<div class="te-opt"><input type="radio" name="correct_' + k + '" value="' + i + '" aria-label="Option ' + LETTERS[i] + ' is the correct answer"' + (data && data.correct === i ? " checked" : "") + ">" +
      '<label class="letter" for="o_' + k + "_" + i + '">' + LETTERS[i] + '</label><input type="text" id="o_' + k + "_" + i + '" maxlength="200" placeholder="Option ' + LETTERS[i] + '" value="' + escapeHtml(data && data.options && data.options[i] || "") + '"></div>';
  }
  wrap.innerHTML = '<div class="te-q-head"><h3>Question <span class="qn"></span></h3><button type="button" class="ep-btn te-mini" data-remove>Remove</button></div>' +
    '<div class="ep-field"><label for="q_' + k + '">Question</label><textarea id="q_' + k + '" maxlength="500">' + escapeHtml(data && data.q || "") + "</textarea></div>" +
    '<fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:600;font-size:14px;margin:0 0 6px">Options. Tap the circle next to the correct one.</legend>' + opts + "</fieldset>" +
    '<p class="ep-error" role="alert" data-err></p>';
  $("questions").appendChild(wrap);
  renumber();
  return wrap;
}

function renumber() {
  [...document.querySelectorAll("#questions .te-q")].forEach((el, i) => { el.querySelector(".qn").textContent = String(i + 1); });
  updateTotals();
}

function updateTotals() {
  const n = document.querySelectorAll("#questions .te-q").length;
  const m = Math.max(0, parseInt($("f_marks").value, 10) || 0);
  $("totals").textContent = n + (n === 1 ? " question" : " questions") + " &middot; ".replace("&middot;", "|") + m + (m === 1 ? " mark" : " marks") + " each | Total " + (n * m) + " marks";
}

function readQuestions() {
  return [...document.querySelectorAll("#questions .te-q")].map((el) => {
    const k = el.getAttribute("data-q");
    const q = String(el.querySelector("textarea").value || "").trim();
    const raw = [0, 1, 2, 3].map((i) => String($("o_" + k + "_" + i).value || "").trim());
    const checked = el.querySelector('input[type=radio]:checked');
    const correctRaw = checked ? parseInt(checked.value, 10) : -1;
    const options = [], map = {};
    raw.forEach((text, i) => { if (text) { map[i] = options.length; options.push(text); } });
    return { el, q, options, correct: correctRaw >= 0 && map[correctRaw] !== undefined ? map[correctRaw] : -1, correctRaw, raw };
  });
}

// ---------- validation ----------
function validate(forPublish) {
  ["subject", "class", "section", "hours", "minutes", "start", "end", "marks"].forEach((k) => setErr(k, ""));
  $("e_form").textContent = "";
  let first = null;
  const bad = (key, msg) => { setErr(key, msg); if (!first) first = $("w_" + key); };

  if (val("f_subject").length < 2) bad("subject", "Enter the subject.");
  if (!val("f_class")) bad("class", "Choose the class.");
  else if (!val("f_section")) bad("section", "Choose the section. Every test is made for one section.");
  const hours = parseInt($("f_hours").value, 10), mins = parseInt($("f_minutes").value, 10);
  if (!(hours >= 0 && hours <= 5)) bad("hours", "Hours must be 0 to 5.");
  if (!(mins >= 0 && mins <= 59)) bad("minutes", "Minutes must be 0 to 59.");
  const duration = (hours || 0) * 60 + (mins || 0);
  if (!first && (duration < 5 || duration > 300)) bad("minutes", "The test must be between 5 minutes and 5 hours long.");
  const start = $("f_start").value ? new Date($("f_start").value).getTime() : NaN;
  const end = $("f_end").value ? new Date($("f_end").value).getTime() : NaN;
  if (isNaN(start)) bad("start", "Choose when the test starts.");
  else if (forPublish && start < Date.now() - 2 * 60000) bad("start", "The start time must be now or later.");
  if (isNaN(end)) bad("end", "Choose the last time students can start.");
  else if (!isNaN(start) && end < start) bad("end", "This must be after the start time.");
  const marks = parseInt($("f_marks").value, 10);
  if (!(marks >= 1 && marks <= 20)) bad("marks", "Marks per question must be 1 to 20.");

  const qs = readQuestions();
  if (!qs.length) { $("e_form").textContent = "Add at least one question."; if (!first) first = $("addQ"); }
  if (qs.length > 100) { $("e_form").textContent = "A test can have at most 100 questions."; if (!first) first = $("addQ"); }
  qs.forEach((x, i) => {
    const err = x.el.querySelector("[data-err]");
    let msg = "";
    if (x.q.length < 3) msg = "Write the question.";
    else if (x.options.length < 2) msg = "Enter at least two options.";
    else if (new Set(x.options.map((o) => o.toLowerCase())).size !== x.options.length) msg = "Two options are the same.";
    else if (x.correctRaw < 0 || x.correct < 0) msg = "Select the correct answer (and make sure that option has text).";
    err.textContent = msg;
    if (msg && !first) first = x.el;
  });
  if (first) { first.scrollIntoView({ block: "center", behavior: "smooth" }); return null; }
  return { duration, start, end, marks, qs };
}

// ---------- save ----------
async function save(publish) {
  const v = validate(publish);
  if (!v) return;
  const btns = [$("saveDraft"), $("publishBtn")];
  btns.forEach((b) => { b.disabled = true; });
  const labelPub = $("publishBtn").textContent;
  $("publishBtn").textContent = publish ? "Publishing..." : labelPub;
  try {
    if (!testId) testId = doc(collection(db, "tests")).id;
    const existing = await getDoc(doc(db, "tests", testId));
    if (existing.exists() && existing.data().status === "published") { alert("This test is already published and cannot be changed."); btns.forEach((b) => { b.disabled = false; }); $("publishBtn").textContent = labelPub; return; }

    const meta = {
      subject: val("f_subject"), title: val("f_title"), class: val("f_class"), section: val("f_section"),
      durationMinutes: v.duration, startAt: Timestamp.fromMillis(v.start), endAt: Timestamp.fromMillis(v.end),
      // The answer key stays locked until the last student could have finished (plus 2 minutes).
      keyOpenAt: Timestamp.fromMillis(v.end + v.duration * 60000 + 2 * 60000),
      questionCount: v.qs.length, marksPerQuestion: v.marks, totalMarks: v.qs.length * v.marks,
      status: publish ? "published" : "draft",
      createdBy: teacherId, createdByName: teacherName,
      updatedAt: serverTimestamp()
    };
    if (!existing.exists()) meta.createdAt = serverTimestamp();
    if (publish) meta.publishedAt = serverTimestamp();
    await setDoc(doc(db, "tests", testId), meta, { merge: true });
    await setDoc(doc(db, "testPapers", testId), { questions: v.qs.map((x) => ({ q: x.q, options: x.options })) });
    const answers = v.qs.map((x) => x.correct);
    await setDoc(doc(db, "testKeys", testId), { testId, answers });

    if (publish) {
      // One copy of the key per student. A student can read theirs only after they submit.
      const st = await getDocs(query(collection(db, "students"), where("class", "==", meta.class)));
      for (const s of st.docs.filter((d) => sameSection(d.data().section, meta.section))) await setDoc(doc(db, "testKeys", attemptId(testId, s.id)), { testId, roll: s.id, answers });
      alert("Test published. Students in Class " + meta.class + ", Section " + meta.section + " will see it on their dashboard.");
      window.location.href = "teacher-tests.html";
    } else {
      window.history.replaceState(null, "", "teacher-test-edit.html?id=" + encodeURIComponent(testId));
      alert("Draft saved.");
      btns.forEach((b) => { b.disabled = false; });
    }
  } catch (error) {
    console.error(error);
    alert("Could not save the test. Please check your internet connection and try again.");
    btns.forEach((b) => { b.disabled = false; });
  }
  $("publishBtn").textContent = labelPub;
}

// ---------- sections ----------
// Sections come from the class (the admin sets them in Classes). If a class has none set, the sections its students actually have are used.
async function sectionsFor(cls) {
  if (classSections[cls] && classSections[cls].length) return classSections[cls];
  const st = await getDocs(query(collection(db, "students"), where("class", "==", cls)));
  const seen = new Map();
  st.forEach((d) => { const s = String(d.data().section || "").trim(); if (s) seen.set(s.toUpperCase(), s); });
  classSections[cls] = [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return classSections[cls];
}

async function fillSections(cls, selected) {
  const sel = $("f_section"), mine = ++secToken;
  $("e_section").textContent = "";
  if (!cls) { sel.innerHTML = '<option value="">Choose the class first</option>'; return; }
  sel.innerHTML = '<option value="">Loading sections...</option>';
  let list = [];
  try { list = await sectionsFor(cls); } catch (e) { console.error(e); }
  if (mine !== secToken) return;   // the teacher already picked another class
  if (selected && !list.some((s) => sameSection(s, selected))) list = list.concat(selected);
  if (!list.length) {
    sel.innerHTML = '<option value="">No section found</option>';
    $("e_section").textContent = "Class " + cls + " has no section yet. Ask the admin to add sections in Classes.";
    return;
  }
  sel.innerHTML = '<option value="">Select section</option>' + list.map((s) => '<option value="' + escapeHtml(s) + '">Section ' + escapeHtml(s) + "</option>").join("");
  const match = selected ? list.find((s) => sameSection(s, selected)) : "";
  sel.value = match || "";
}

// ---------- load ----------
async function init() {
  if (!teacherId) { window.location.replace("teacher-login.html"); return; }
  try {
    const t = await getDoc(doc(db, "teachers", teacherId));
    if (!t.exists()) { $("pageLoading").textContent = "Teacher record not found. Please log in again."; return; }
    teacherName = t.data().name || "";
    const cs = await getDocs(query(collection(db, "classes"), where("teacherEmail", "==", t.data().email)));
    const classes = cs.docs.map((d) => d.id);
    cs.docs.forEach((d) => { classSections[d.id] = (d.data().sections || []).map((s) => String(s).trim()).filter(Boolean); });
    let existing = null, paper = null, key = null;
    if (testId) {
      const tSnap = await getDoc(doc(db, "tests", testId));
      if (!tSnap.exists() || tSnap.data().createdBy !== teacherId) { $("pageLoading").textContent = "This test was not found."; return; }
      existing = tSnap.data();
      const pSnap = await getDoc(doc(db, "testPapers", testId)); paper = pSnap.exists() ? pSnap.data() : { questions: [] };
      const kSnap = await getDoc(doc(db, "testKeys", testId)); key = kSnap.exists() ? kSnap.data().answers : [];
      if (existing.class && !classes.includes(existing.class)) classes.push(existing.class);
    }
    if (!classes.length) { $("pageLoading").textContent = "No class is assigned to you yet. Ask the admin to assign one."; return; }
    $("f_class").innerHTML = '<option value="">Select class</option>' + classes.map((c) => '<option value="' + escapeHtml(c) + '">Class ' + escapeHtml(c) + "</option>").join("");

    if (existing && existing.status === "published") {
      $("pageLoading").hidden = true; $("lockedNotice").hidden = false;
      $("lockedReport").setAttribute("href", "teacher-test-report.html?id=" + encodeURIComponent(testId));
      const host = document.createElement("div");
      host.innerHTML = '<h2 class="t-head">' + escapeHtml(existing.subject) + ' &middot; Class ' + escapeHtml(existing.class) + (existing.section ? " &middot; Section " + escapeHtml(existing.section) : "") + "</h2>" +
        '<p class="ep-hint">' + escapeHtml(fmtDuration(existing.durationMinutes)) + " | " + existing.totalMarks + " marks | Starts " + escapeHtml(fmtDateTime(tsMs(existing.startAt))) + "</p>" +
        (paper.questions || []).map((q, i) => '<article class="t-q"><h3>Question ' + (i + 1) + '</h3><p class="t-qtext">' + escapeHtml(q.q) + '</p><ul class="t-options">' +
          q.options.map((o, k) => '<li class="' + (k === key[i] ? "is-right" : "") + '"><b>' + LETTERS[k] + ".</b> <span>" + escapeHtml(o) + "</span>" + (k === key[i] ? '<em class="tag ok">Correct answer</em>' : "") + "</li>").join("") + "</ul></article>").join("");
      $("main").appendChild(host);
      return;
    }

    if (existing) {
      $("f_subject").value = existing.subject || ""; $("f_title").value = existing.title || ""; $("f_class").value = existing.class || "";
      await fillSections(existing.class || "", existing.section || "");
      $("f_hours").value = Math.floor((existing.durationMinutes || 60) / 60); $("f_minutes").value = (existing.durationMinutes || 60) % 60;
      if (existing.startAt) $("f_start").value = toLocalInput(tsMs(existing.startAt));
      if (existing.endAt) $("f_end").value = toLocalInput(tsMs(existing.endAt));
      $("f_marks").value = existing.marksPerQuestion || 1;
      (paper.questions || []).forEach((q, i) => addQuestion({ q: q.q, options: q.options, correct: key && key[i] !== undefined ? key[i] : -1 }));
    } else {
      const now = new Date(Date.now() + 60 * 60000); now.setMinutes(0, 0, 0);
      $("f_start").value = toLocalInput(now.getTime());
      $("f_end").value = toLocalInput(now.getTime() + 90 * 60000);
      addQuestion();
      if (classes.length === 1) { $("f_class").value = classes[0]; await fillSections(classes[0], ""); }
    }
    $("pageLoading").hidden = true; $("editForm").hidden = false; updateTotals();
  } catch (error) {
    console.error(error);
    $("pageLoading").textContent = "Could not load. Please go back and try again.";
  }
}

$("addQ").addEventListener("click", () => { addQuestion(); const last = $("questions").lastElementChild; last.querySelector("textarea").focus(); });
$("questions").addEventListener("click", (e) => {
  const rm = e.target.closest("[data-remove]");
  if (!rm) return;
  if (document.querySelectorAll("#questions .te-q").length === 1) { alert("A test needs at least one question."); return; }
  if (confirm("Remove this question?")) { rm.closest(".te-q").remove(); renumber(); }
});
$("f_marks").addEventListener("input", updateTotals);
$("f_start").addEventListener("change", () => {
  // Suggest a closing time of start + duration + 30 minutes when it is not yet later than the start.
  const s = $("f_start").value ? new Date($("f_start").value).getTime() : NaN;
  const e = $("f_end").value ? new Date($("f_end").value).getTime() : NaN;
  if (!isNaN(s) && (isNaN(e) || e < s)) $("f_end").value = toLocalInput(s + 90 * 60000);
});

// ---------- adding questions faster: paste, file, or an AI ----------
let pending = [];
const isBlankBlock = (el) => !String(el.querySelector("textarea").value).trim() && [...el.querySelectorAll('input[type=text]')].every((i) => !String(i.value).trim());

function toggle(btn) {
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", open ? "false" : "true");
  $(btn.getAttribute("aria-controls")).hidden = open;
}
document.querySelectorAll(".qi-toggle").forEach((b) => b.addEventListener("click", () => toggle(b)));

function showPreview(result) {
  $("qiDone").textContent = "";
  const qs = result.questions;
  pending = qs;
  if (!qs.length) {
    $("qiPreview").hidden = false;
    $("qiSummary").textContent = (result.warnings && result.warnings[0]) || "No questions were found.";
    $("qiList").innerHTML = ""; $("qiAdd").hidden = true;
    return;
  }
  const needs = qs.filter((q) => q.warnings.length).length;
  $("qiAdd").hidden = false;
  $("qiAdd").textContent = "Add " + qs.length + (qs.length === 1 ? " question" : " questions");
  $("qiSummary").textContent = qs.length + (qs.length === 1 ? " question found" : " questions found") + (needs ? ". " + needs + (needs === 1 ? " needs" : " need") + " attention." : ". All look good.");
  $("qiList").innerHTML = qs.map((q, i) => {
    const ok = !q.warnings.length;
    const text = q.q.length > 90 ? q.q.slice(0, 90) + "..." : q.q;
    return '<li class="' + (ok ? "ok" : "warn") + '"><b>' + (i + 1) + ".</b> <span>" + escapeHtml(text) + "</span><em>" +
      (ok ? q.options.length + " options. Answer " + LETTERS[q.correct] : escapeHtml(q.warnings[0])) + "</em></li>";
  }).join("");
  $("qiPreview").hidden = false;
  $("qiPreview").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

$("qiRead").addEventListener("click", () => {
  const text = $("qiText").value;
  if (!text.trim()) { $("qiDone").textContent = "Paste your questions in the box first."; $("qiText").focus(); return; }
  showPreview(parsePasted(text));
});
$("qiExample").addEventListener("click", () => { $("qiText").value = SAMPLE_TEXT; $("qiText").focus(); });
$("qiCancel").addEventListener("click", () => { pending = []; $("qiPreview").hidden = true; });

$("qiFileInput").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (file.size > 1024 * 1024) { $("qiDone").textContent = "That file is too big. Please use a file under 1 MB."; return; }
  try { showPreview(parsePasted(await file.text(), file.name)); }
  catch (err) { console.error(err); $("qiDone").textContent = "Could not read that file. Try Save as CSV, or paste the questions instead."; }
});

$("qiSample").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = "sample-questions.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function refreshPrompt() {
  $("qiPrompt").value = buildAiPrompt({ subject: val("f_subject"), cls: val("f_class"), topic: val("qiTopic"), count: $("qiCount").value });
}
["qiTopic", "qiCount", "f_subject", "f_class"].forEach((id) => $(id).addEventListener("input", refreshPrompt));
$("f_class").addEventListener("change", () => { fillSections(val("f_class"), ""); refreshPrompt(); });
$("qiBtnAi").addEventListener("click", refreshPrompt);
$("qiCopy").addEventListener("click", async () => {
  refreshPrompt();
  const box = $("qiPrompt");
  try { await navigator.clipboard.writeText(box.value); }
  catch (e) { box.select(); try { document.execCommand("copy"); } catch (e2) { /* the text is selected so it can be copied by hand */ } }
  $("qiCopied").textContent = "Copied. Now paste it into ChatGPT, Claude or Gemini.";
});

$("qiAdd").addEventListener("click", () => {
  if (!pending.length) return;
  const existing = [...document.querySelectorAll("#questions .te-q")];
  if (existing.length === 1 && isBlankBlock(existing[0])) existing[0].remove();
  const room = 100 - document.querySelectorAll("#questions .te-q").length;
  const take = pending.slice(0, Math.max(0, room));
  let first = null;
  take.forEach((q) => {
    const block = addQuestion({ q: q.q.slice(0, 500), options: q.options.map((o) => o.slice(0, 200)), correct: q.correct });
    if (!first) first = block;
    if (q.warnings.length) block.querySelector("[data-err]").textContent = q.warnings[0];
  });
  const needs = take.filter((q) => q.warnings.length).length;
  $("qiDone").textContent = take.length + (take.length === 1 ? " question was added below." : " questions were added below.") +
    (needs ? " " + needs + " still need" + (needs === 1 ? "s" : "") + " a correct answer or a fix." : " Check them, then publish.") +
    (take.length < pending.length ? " The test can have at most 100 questions, so the rest were skipped." : "");
  pending = []; $("qiPreview").hidden = true; $("qiText").value = "";
  if (first) first.scrollIntoView({ block: "start", behavior: "smooth" });
});

$("saveDraft").addEventListener("click", () => save(false));
$("editForm").addEventListener("submit", (e) => { e.preventDefault(); if (confirm("Publish this test? It cannot be edited after this.")) save(true); });

init();
