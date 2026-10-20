// Shared by every online test page: formatting, the test card, and the report view.
import { escapeHtml } from "./profile-utils.js";
export { escapeHtml };

export const tsMs = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : (v && typeof v.toDate === "function" ? v.toDate().getTime() : (typeof v === "number" ? v : 0)));
export const LETTERS = ["A", "B", "C", "D"];
export const attemptId = (testId, roll) => testId + "_" + roll;

export function fmtDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if (h && r) return h + " hr " + r + " min";
  if (h) return h + (h === 1 ? " hr" : " hr");
  return r + " min";
}

export function fmtDateTime(ms) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtDay(ms) {
  return ms ? new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return d + "d " + h + "h";
  if (h) return h + "h " + String(m).padStart(2, "0") + "m";
  return m + "m " + String(sec).padStart(2, "0") + "s";
}

export const marksText = (test) => (test.totalMarks || 0) + (test.totalMarks === 1 ? " mark" : " marks");

// Score is worked out from the student's answers and the key, so it never needs to be stored.
export function gradeAnswers(answers, key, marksPerQuestion) {
  let correct = 0, wrong = 0, skipped = 0;
  (key || []).forEach((right, i) => {
    const a = answers && answers[i] !== undefined ? answers[i] : -1;
    if (a === -1 || a === null) skipped++;
    else if (a === right) correct++;
    else wrong++;
  });
  return { correct, wrong, skipped, score: correct * (marksPerQuestion || 0) };
}

// open: 'upcoming' | 'live' | 'closed'
export function openState(test, now) {
  const start = tsMs(test.startAt), end = tsMs(test.endAt);
  if (now < start) return "upcoming";
  if (now > end) return "closed";
  return "live";
}

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// One test card. Subject in bold, then time and marks in small text, an arrow on the right.
// info = { href, canGo, statusText, statusClass }
export function testCardHTML(test, info) {
  const go = info.canGo
    ? '<a class="t-go" href="' + escapeHtml(info.href) + '" aria-label="' + escapeHtml(info.label) + '">' + ARROW + "</a>"
    : '<span class="t-go off" role="img" aria-label="' + escapeHtml(info.label) + ' (not available yet)">' + ARROW + "</span>";
  return '<article class="t-card ' + escapeHtml(info.statusClass || "") + '" data-test="' + escapeHtml(info.id) + '">' +
    '<div class="t-main"><h3 class="t-subject">' + escapeHtml(test.subject || "Test") + "</h3>" +
    '<p class="t-meta">' + escapeHtml(fmtDuration(test.durationMinutes)) + " &middot; " + escapeHtml(marksText(test)) + "</p>" +
    (test.title ? '<p class="t-title">' + escapeHtml(test.title) + "</p>" : "") +
    '<p class="t-start">Starts ' + escapeHtml(fmtDateTime(tsMs(test.startAt))) + "</p>" +
    '<p class="t-status" data-status>' + escapeHtml(info.statusText || "") + "</p></div>" + go + "</article>";
}

// Result view used by the student, the parent and the teacher.
export function reportHTML({ test, paper, key, submission }) {
  const questions = (paper && paper.questions) || [];
  const answers = (submission && submission.answers) || [];
  const mpq = test.marksPerQuestion || 0;
  const g = gradeAnswers(answers, key, mpq);
  const total = test.totalMarks || questions.length * mpq;
  const pct = total ? Math.round((g.score / total) * 100) : 0;
  let html = '<section class="t-summary" aria-label="Score summary"><p class="t-score"><span>' + g.score + '</span> / ' + total + ' marks</p>' +
    '<p class="t-pct">' + pct + '%</p>' +
    '<ul class="t-counts"><li><strong>' + g.correct + '</strong> correct</li><li><strong>' + g.wrong + '</strong> wrong</li><li><strong>' + g.skipped + '</strong> not answered</li></ul></section>';
  questions.forEach((q, i) => {
    const right = key ? key[i] : -1, mine = answers[i] !== undefined ? answers[i] : -1;
    const verdict = mine === -1 ? "skipped" : (mine === right ? "right" : "wrong");
    const verdictText = verdict === "right" ? "Correct" : (verdict === "wrong" ? "Wrong" : "Not answered");
    html += '<article class="t-q ' + verdict + '"><header><h3>Question ' + (i + 1) + '</h3><span class="t-verdict ' + verdict + '">' + verdictText + (verdict === "right" ? " +" + mpq : "") + "</span></header>" +
      '<p class="t-qtext">' + escapeHtml(q.q) + "</p><ul class=\"t-options\">";
    (q.options || []).forEach((opt, k) => {
      const isRight = k === right, isMine = k === mine;
      const tag = isRight ? '<em class="tag ok">Correct answer</em>' : (isMine ? '<em class="tag bad">Your answer</em>' : "");
      const extra = isRight && isMine ? '<em class="tag mine">Your answer</em>' : "";
      html += '<li class="' + (isRight ? "is-right" : (isMine ? "is-wrong" : "")) + '"><b>' + LETTERS[k] + '.</b> <span>' + escapeHtml(opt) + "</span>" + tag + extra + "</li>";
    });
    html += "</ul></article>";
  });
  return html;
}
