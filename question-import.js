// Reads multiple choice questions from text a teacher pasted (or a file), so they do not have to
// type each question. Understands the common layouts from Word, WhatsApp, PDFs, AI chats and Excel.
//
// Returns { questions: [{ q, options: [..up to 4], correct: index or -1, number, warnings: [..] }], warnings: [..] }

const LETTERS = "ABCD";

function normalize(raw) {
  return String(raw || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\*\*|__|`/g, "")              // bold / code marks from chat apps
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")   // markdown headings
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
}

const NUM_RE = /^\s*(?:(?:Q|Que|Ques|Question)\s*\.?\s*)?\(?(\d{1,3})\s*[\.\):\-\u2013]\s+(.*\S.*)$/i;
const OPT_RE = /^\s*[\(\[]?([A-Fa-f])[\)\]\.:\-\u2013]\s*(.*)$/;
const PRE_MARK_RE = /^\s*(?:\*+|[\u2713\u2714\u2705])\s*(?=[\(\[]?[A-Fa-f][\)\]\.:\-\u2013])/;
const ANS_RE = /^\s*(?:correct\s+)?(?:ans(?:wer)?|correct(?:\s+answer)?|right\s+answer|key|sahi\s+(?:uttar|jawab)|uttar|jawab)\s*(?:is|=|:|-|\u2013|\.)?\s*(.+)$/i;
const SKIP_RE = /^\s*(?:explanation|solution|reason|hint|note)\b\s*[:\-]/i;
const KEY_HEAD_RE = /^\s*(?:answer\s*key|ans\.?\s*key|answers?|correct\s+answers?|key)\s*[:\-]?\s*(.*)$/i;
const KEY_TOKEN_RE = /(\d{1,3})\s*[\-\.\):=\u2013]?\s*\(?([A-Da-d])\)?(?![A-Za-z])/g;
const CORRECT_MARK_RE = /(?:^\s*\*+\s*|\s*\*+\s*$|\s*[\u2713\u2714\u2705]\s*$|^\s*[\u2713\u2714\u2705]\s*|\s*[\(\[]\s*(?:correct|right|ans(?:wer)?)\s*[\)\]]\s*$)/i;

function stripCorrectMark(text) {
  const marked = CORRECT_MARK_RE.test(text);
  let t = text;
  if (marked) { let prev; do { prev = t; t = t.replace(CORRECT_MARK_RE, ""); } while (t !== prev); }
  return { text: t.trim(), marked };
}

// "7 x 8 = ? (a) 54 (b) 56 (c) 58 (d) 64" on one line becomes a question line plus four option lines.
function splitInline(line) {
  const re = /(?:^|\s)\(?([A-Da-d])[\)\.]\s+/g;
  const hits = [];
  let m;
  while ((m = re.exec(line)) !== null) hits.push({ idx: m.index + (m[0].length - m[0].trimStart().length), letter: m[1].toUpperCase(), end: re.lastIndex });
  if (hits.length < 3) return [line];
  for (let i = 0; i < hits.length; i++) if (hits[i].letter !== LETTERS[i]) return [line];
  const out = [];
  const head = line.slice(0, hits[0].idx).trim();
  if (head) out.push(head);
  hits.forEach((h, i) => out.push(h.letter + ") " + line.slice(h.end, i + 1 < hits.length ? hits[i + 1].idx : line.length).trim()));
  return out;
}

function extractKey(lines) {
  // An answer key at the end, like "Answers: 1-B 2-C 3-A", or one pair per line.
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(KEY_HEAD_RE);
    if (!m) continue;
    const rest = [m[1]].concat(lines.slice(i + 1)).join(" ");
    const tokens = [...rest.matchAll(KEY_TOKEN_RE)];
    const leftover = rest.replace(KEY_TOKEN_RE, "").replace(/[\s,;\.\-:\)\(]+/g, "");
    if (tokens.length >= 2 && leftover === "") {
      const map = {};
      tokens.forEach((t) => { map[parseInt(t[1], 10)] = t[2].toUpperCase(); });
      return { map, bodyLines: lines.slice(0, i) };
    }
  }
  return { map: null, bodyLines: lines };
}

export function parseQuestions(raw) {
  const text = normalize(raw);
  const { map: keyMap, bodyLines } = extractKey(text.split("\n"));
  const lines = [];
  bodyLines.forEach((l) => splitInline(l).forEach((x) => lines.push(x)));

  const questions = [];
  let cur = null, prevBlank = true, seq = 0;

  const startQuestion = (qText, number) => {
    seq++;
    cur = { q: qText.trim(), options: [], labels: [], marks: [], answerRaw: "", number: number || seq, warnings: [] };
    questions.push(cur);
  };
  const finished = () => cur && (cur.answerRaw || cur.options.length >= 4);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { prevBlank = true; continue; }
    const wasBlank = prevBlank; prevBlank = false;
    if (SKIP_RE.test(line)) continue;

    const num = line.match(NUM_RE);
    // Option line? (not when it is really a numbered question such as "1. ...")
    const preMarked = PRE_MARK_RE.test(line);
    const opt = (preMarked ? line.replace(PRE_MARK_RE, "") : line).match(OPT_RE);
    const ans = line.match(ANS_RE);

    if (ans && cur && !(opt && !/^\s*(?:ans|answer|key)/i.test(line))) {
      cur.answerRaw = ans[1].trim();
      continue;
    }
    if (opt && cur && !(num && cur.options.length === 0 && false)) {
      const { text: otext, marked } = stripCorrectMark(opt[2]);
      cur.options.push(otext); cur.labels.push(opt[1].toUpperCase()); cur.marks.push(marked || preMarked);
      continue;
    }
    if (num) {
      startQuestion(num[2], parseInt(num[1], 10));
      continue;
    }
    // plain text line
    if (!cur || ((wasBlank || cur.options.length >= 4) && finished()) || (wasBlank && cur.options.length >= 2) ) {
      startQuestion(line);
    } else if (cur.options.length === 0) {
      cur.q += " " + line;                      // question wrapped onto a second line
    } else if (wasBlank) {
      startQuestion(line);
    } else {
      cur.options[cur.options.length - 1] += " " + line;   // option wrapped onto a second line
    }
  }

  const warnings = [];
  questions.forEach((q, i) => {
    let correct = q.marks.indexOf(true);
    if (correct < 0 && q.answerRaw) correct = resolveAnswer(q.answerRaw, q.options, q.labels);
    if (correct < 0 && keyMap) {
      const letter = keyMap[q.number] || keyMap[i + 1];
      if (letter) correct = resolveAnswer(letter, q.options, q.labels);
    }
    if (q.options.length > 4) { q.warnings.push("More than 4 options. Only the first 4 were kept."); if (correct > 3) correct = -1; q.options = q.options.slice(0, 4); }
    if (q.options.length < 2) q.warnings.push("This question needs at least 2 options.");
    if (correct < 0 || correct >= q.options.length) { correct = -1; if (q.options.length >= 2) q.warnings.push("Choose the correct answer."); }
    q.correct = correct;
    delete q.labels; delete q.marks; delete q.answerRaw;
    if (q.q.length < 3) q.warnings.push("The question text is missing.");
  });
  if (!questions.length && String(raw || "").trim()) warnings.push("No questions were found. Check that each question has options like A) B) C) D).");
  return { questions, warnings };
}

function resolveAnswer(rawAnswer, options, labels) {
  const a = String(rawAnswer || "").trim();
  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  // "B", "(b)", "B) 56", "option B"
  let m = a.match(/^(?:option\s*)?[\(\[]?([A-Da-d])[\)\]\.:\-]?(?:\s|$)/i);
  if (m) {
    const L = m[1].toUpperCase();
    const at = labels.indexOf(L);
    if (at >= 0) return at;
    const code = LETTERS.indexOf(L);
    if (code >= 0 && code < options.length) return code;
  }
  // the text of the option, such as "56"
  const na = norm(a);
  if (na) { const at = options.findIndex((o) => norm(o) === na); if (at >= 0) return at; }
  // "2" meaning the second option (only when no option has that text)
  m = a.match(/^(?:option\s*)?([1-4])\b/i);
  if (m && parseInt(m[1], 10) <= options.length) return parseInt(m[1], 10) - 1;
  return -1;
}

// ---------- tables (CSV from Excel, or cells pasted from Excel) ----------
export function parseDelimited(raw) {
  const text = String(raw || "").replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const first = text.split("\n").find((l) => l.trim()) || "";
  const delim = first.includes("\t") ? "\t" : (first.split(";").length > first.split(",").length ? ";" : ",");
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows.filter((r) => r.some((c) => String(c).trim()));
}

export function parseTable(raw) {
  const rows = parseDelimited(raw);
  const warnings = [];
  if (!rows.length) return { questions: [], warnings: ["The file is empty."] };
  const head = rows[0].map((c) => String(c).trim().toLowerCase());
  const isQ = (h) => /^q$|question|sawal|prashn/.test(h);
  const hasHeader = head.some(isQ) || (head.some((h) => /option|choice/.test(h)) && head.some((h) => /answer|key|correct/.test(h)));
  let qi = 0, oi = [1, 2, 3, 4], ai = 5, start = 0;
  if (hasHeader) {
    start = 1;
    qi = head.findIndex(isQ);
    oi = [0, 1, 2, 3].map((n) => head.findIndex((h) => new RegExp("^(?:option|choice|opt)?\\s*[\\(_\\- ]*(?:" + LETTERS[n].toLowerCase() + "|" + (n + 1) + ")[\\)]?$").test(h) || new RegExp("(?:option|choice)\\s*[\\(_\\- ]*(?:" + LETTERS[n].toLowerCase() + "|" + (n + 1) + ")").test(h)));
    ai = head.findIndex((h) => /answer|correct|^ans|key|sahi/.test(h));
    if (qi < 0 || oi.some((x) => x < 0)) return { questions: [], warnings: ["The first row should have the columns: Question, Option A, Option B, Option C, Option D, Correct answer."] };
  }
  const questions = [];
  rows.slice(start).forEach((r, n) => {
    const q = String(r[qi] || "").trim();
    const options = oi.map((x) => String(r[x] === undefined ? "" : r[x]).trim()).filter(Boolean);
    const item = { q, options, correct: -1, number: n + 1, warnings: [] };
    const a = String(ai >= 0 && r[ai] !== undefined ? r[ai] : "").trim();
    if (a) item.correct = resolveAnswer(a, options, options.map((_, k) => LETTERS[k]));
    if (item.options.length < 2) item.warnings.push("This question needs at least 2 options.");
    else if (item.correct < 0) item.warnings.push("Choose the correct answer.");
    if (q.length < 3) item.warnings.push("The question text is missing.");
    if (q || options.length) questions.push(item);
  });
  if (!questions.length) warnings.push("No questions were found in the file.");
  return { questions, warnings };
}

function looksTabular(raw, filename) {
  if (/\.csv$/i.test(filename || "")) return true;
  const lines = String(raw || "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return false;
  if (lines.every((l) => l.split("\t").length >= 4)) return true;
  return /option|answer|choice/i.test(lines[0]) && /(?:^|[,;])\s*(?:q|question|sawal)\s*(?:[,;]|$)/i.test(lines[0]) && lines[0].split(/[,;]/).length >= 4;
}

export function readQuestions(raw, filename) {
  return looksTabular(raw, filename) ? parseTable(raw) : parseQuestions(raw);
}

// ---------- helpers for the screen ----------
export const SAMPLE_TEXT = `1. What is 7 x 8?
A) 54
B) 56
C) 58
D) 64
Answer: B

2. Which of these is a prime number?
A) 9
B) 15
C) 17
D) 21
Answer: C

3. What is the capital of India?
A) Mumbai
B) New Delhi
C) Kolkata
D) Chennai
Answer: B`;

export const SAMPLE_CSV = 'Question,Option A,Option B,Option C,Option D,Correct answer\n' +
  '"What is 7 x 8?",54,56,58,64,B\n' +
  '"Which of these is a prime number?",9,15,17,21,C\n' +
  '"What is the capital of India?",Mumbai,New Delhi,Kolkata,Chennai,B\n';

export function buildAiPrompt({ subject, cls, topic, count }) {
  const n = Math.max(1, Math.min(50, parseInt(count, 10) || 10));
  const what = (topic ? 'on the topic "' + topic + '"' : "") + (subject ? (topic ? " in " : "on ") + 'the subject "' + subject + '"' : "");
  return "Write " + n + " multiple choice questions " + (what ? what + " " : "") + (cls ? "for Class " + cls + " students" : "for school students") + ".\n\n" +
    "Rules:\n" +
    "- Each question has exactly 4 options labelled A, B, C and D, and only ONE correct option.\n" +
    "- Use simple, clear language that students of this class understand.\n" +
    "- Make the wrong options believable, not silly.\n" +
    "- Put the correct option in different positions (not always B).\n" +
    "- Reply with ONLY the questions in the exact format below. No introduction, no explanations, no extra text.\n\n" +
    "Format (leave one blank line between questions):\n\n" +
    "1. Question text here?\nA) First option\nB) Second option\nC) Third option\nD) Fourth option\nAnswer: B\n\n" +
    "2. Next question?\nA) ...\nB) ...\nC) ...\nD) ...\nAnswer: C";
}
