// Shared helpers for the Test feature (teacher, student and parent sides).
//
// Firestore layout
//   tests/{testId}             details shown on the card (no questions)
//   testQuestions/{testId}     questions and options only, readable once the test has started
//   testKeys/{testId}          the correct answers, readable once the test has started
//   testAttempts/{testId_roll} one submitted attempt per student. Created once, never edited.
// A score is never stored. It is always worked out from the saved answers and the key,
// so nobody can change their own marks.
import { db } from "./Firebase.js";
import {
  doc, getDoc, getDocs, collection, query, where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export function escapeHtml(str) {
  return String(str === undefined || str === null ? "" : str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function classKeyOf(value) {
  return String(value || "").trim().toLowerCase().replace(/^class\s*/, "");
}

export function normText(v) {
  return String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function toISODate(value) {
  if (!value) return "";
  const str = String(value).trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return str;
}

export function lastTenDigits(v) {
  return String(v || "").replace(/\D/g, "").slice(-10);
}

export function fmtDuration(min) {
  const m = Number(min) || 0;
  const h = Math.floor(m / 60), r = m % 60;
  if (h && r) return `${h} hr ${r} min`;
  if (h) return `${h} hr`;
  return `${r} min`;
}

export function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

export function fmtDateTime(ts) {
  const d = toDate(ts);
  if (!d) return "-";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtCountdown(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function attemptId(testId, roll) { return `${testId}_${roll}`; }

export async function getTest(testId) {
  const s = await getDoc(doc(db, "tests", testId));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function getAttempt(testId, roll) {
  const s = await getDoc(doc(db, "testAttempts", attemptId(testId, roll)));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function getQuestions(testId) {
  const s = await getDoc(doc(db, "testQuestions", testId));
  return s.exists() ? (s.data().questions || []) : [];
}

export async function getKey(testId) {
  const s = await getDoc(doc(db, "testKeys", testId));
  return s.exists() ? (s.data().answers || []) : [];
}

// All published or closed tests for one class, newest start first.
export async function getTestsForClass(classValue) {
  const snap = await getDocs(query(collection(db, "tests"), where("status", "in", ["published", "closed"])));
  const key = classKeyOf(classValue);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => classKeyOf(t.classKey || t.classId) === key);
  list.sort((a, b) => (toDate(b.startAt)?.getTime() || 0) - (toDate(a.startAt)?.getTime() || 0));
  return list;
}

// answers is {"0": 2, "3": 1}; key is [2, 0, 1, 1]. Returns counts and marks.
export function grade(answers, key, marksPerQuestion) {
  let correct = 0, wrong = 0, skipped = 0;
  for (let i = 0; i < key.length; i++) {
    const a = answers ? answers[String(i)] : undefined;
    if (a === undefined || a === null) skipped++;
    else if (Number(a) === Number(key[i])) correct++;
    else wrong++;
  }
  const per = Number(marksPerQuestion) || 0;
  return { correct, wrong, skipped, total: key.length, score: correct * per, max: key.length * per };
}

const LETTERS = ["A", "B", "C", "D"];
export { LETTERS };

// Full review: every option, the student's pick, and the right answer.
export function renderReview(container, questions, key, answers) {
  container.innerHTML = questions.map((q, i) => {
    const picked = answers ? answers[String(i)] : undefined;
    const right = Number(key[i]);
    const opts = (q.options || []).map((o, oi) => {
      let cls = "";
      if (oi === right) cls = "right";
      else if (picked !== undefined && Number(picked) === oi) cls = "wrong";
      const tag = oi === right ? ' <i class="fa-solid fa-check"></i>' : (cls === "wrong" ? ' <i class="fa-solid fa-xmark"></i>' : "");
      return `<div class="t-choice ${cls}" style="cursor:default;"><span class="key">${LETTERS[oi]}</span><span>${escapeHtml(o)}${tag}</span></div>`;
    }).join("");
    let note = "";
    if (picked === undefined) note = `<div class="t-hint" style="margin-top:4px;">Not answered</div>`;
    else if (Number(picked) === right) note = `<div class="t-hint" style="margin-top:4px;color:#1f9a68;font-weight:700;">Correct</div>`;
    else note = `<div class="t-hint" style="margin-top:4px;color:#d9453a;font-weight:700;">Wrong</div>`;
    return `<div class="t-take-q" style="user-select:text;-webkit-user-select:text;"><div class="qtext">${i + 1}. ${escapeHtml(q.q)}</div>${opts}${note}</div>`;
  }).join("");
}
