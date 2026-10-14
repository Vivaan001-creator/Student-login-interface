// tests-core.js - shared helpers for the online MCQ test feature.
// Data model (Firestore):
//   tests/{testId}                 meta: subject, title, classId, className, durationMin, totalMarks,
//                                  questionCount, startsAt, endsAt, postedBy, createdAt
//   tests/{testId}/paper/main      { questions: [{ q, options:[4], marks }] }   (readable only after startsAt)
//   tests/{testId}/key/main        { answers: [correctIndex, ...] }             (readable only after startsAt)
//   tests/{testId}/submissions/{roll}  { roll, name, classId, answers:[idx|-1], leaves, submittedAt }
// The score is never stored: it is always computed from the (immutable) submission + key,
// so a student cannot write a fake score.

export const LETTERS = ["A", "B", "C", "D"];

export function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? h + " hr" : "", m ? m + " min" : ""].filter(Boolean).join(" ") || "0 min";
}

export function fmtDateTime(d) {
  if (!d) return "-";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return (h ? p(h) + ":" : "") + p(m) + ":" + p(sec);
}

export function testState(test, now = Date.now()) {
  const start = toDate(test.startsAt)?.getTime() ?? 0;
  const end = toDate(test.endsAt)?.getTime() ?? 0;
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "ended";
}

// Same normalisation idea as student.js, so any date format typed/picked compares equal.
export function toISODate(value) {
  const str = String(value ?? "").trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return str;
}

export function normName(s) {
  return String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
}

export function normPhone(s) {
  const digits = String(s ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Compares what the student typed with the student record.
export function verifyDetails(student, typed) {
  return normName(student.name || student.studentName) === normName(typed.name)
    && normName(student.father) === normName(typed.father)
    && toISODate(student.dob) !== "" && toISODate(student.dob) === toISODate(typed.dob)
    && normPhone(student.contactNumber) !== "" && normPhone(student.contactNumber) === normPhone(typed.mobile);
}

export function grade(questions, keyAnswers, answers) {
  let score = 0, total = 0, correct = 0, wrong = 0, skipped = 0;
  const rows = questions.map((q, i) => {
    const marks = Number(q.marks) || 0;
    const right = Number(keyAnswers[i]);
    const chosen = Number.isInteger(answers[i]) ? answers[i] : -1;
    total += marks;
    let status;
    if (chosen < 0) { status = "skipped"; skipped++; }
    else if (chosen === right) { status = "correct"; correct++; score += marks; }
    else { status = "wrong"; wrong++; }
    return { q: q.q, options: q.options, marks, chosen, right, status };
  });
  const pct = total ? Math.round((score / total) * 1000) / 10 : 0;
  return { score, total, correct, wrong, skipped, pct, rows };
}

export function reportHTML(test, who, result, submittedAt) {
  const sub = (v) => `<div class="rev-m">${v}</div>`;
  const review = result.rows.map((r, i) => {
    const opts = r.options.map((o, oi) => {
      let cls = "";
      if (oi === r.right) cls = "right";
      else if (oi === r.chosen) cls = "wrong";
      const tag = oi === r.right ? " &#10003; Correct answer" : (oi === r.chosen ? " &#10007; Your answer" : "");
      if (!cls) return "";
      return `<div class="rev-o ${cls}">${LETTERS[oi]}. ${esc(o)}${tag}</div>`;
    }).join("");
    const earned = r.status === "correct" ? r.marks : 0;
    const note = r.status === "skipped" ? '<div class="rev-o wrong" style="background:var(--yellow-bg);color:var(--amber-shadow);border-color:transparent;">Not answered</div>' : "";
    return `<div class="rev"><div class="rev-q">Q${i + 1}. ${esc(r.q)}</div>${note}${opts}${sub(`${earned} / ${r.marks} marks`)}</div>`;
  }).join("");

  return `
    <div class="card">
      <div class="score-hero">
        <div class="score-ring" style="--p:${result.pct}"><b>${result.score}</b><span>out of ${result.total}</span></div>
        <div style="font-weight:800;font-size:16px;">${esc(who.name)}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-top:3px;">${esc(test.subject)} &middot; ${esc(test.className || "")} &middot; Roll ${esc(who.roll)}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-top:3px;">${result.pct}% &middot; Submitted ${esc(fmtDateTime(submittedAt))}</div>
      </div>
      <div class="stat-grid">
        <div class="stat g"><b>${result.correct}</b><span>Correct</span></div>
        <div class="stat r"><b>${result.wrong}</b><span>Wrong</span></div>
        <div class="stat n"><b>${result.skipped}</b><span>Not answered</span></div>
      </div>
    </div>
    <div class="card"><div class="card-title">Question-wise report</div>${review}</div>`;
}
