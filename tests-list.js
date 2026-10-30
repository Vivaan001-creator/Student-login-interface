// The list of test cards, used by the student and the parent. Subject in bold, time and marks small,
// an arrow on the right. The arrow only works once the test has started.
import { db } from "./Firebase.js";
import { collection, doc, getDoc, getDocs, query, where }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { tsMs, fmtCountdown, fmtDateTime, gradeAnswers, openState, testCardHTML, attemptId, sameSection, withReschedule, keyOpenMs } from "./tests-common.js";

function stateOf(item, now) {
  if (item.sub) return "done";
  const o = openState(item.test, now);
  if (o === "upcoming") return "upcoming";
  if (item.attempt) {
    const over = now > tsMs(item.attempt.startedAt) + (item.test.durationMinutes || 0) * 60000;
    if (o === "live" || !over) return over ? "missed" : "inprogress";
    return "missed";
  }
  return o === "live" ? "live" : "closed";
}

function info(item, state, now, mode, roll) {
  const t = item.test;
  const base = { id: item.id, label: (t.subject || "Test") + " test" };
  const rs = t.rescheduled ? "Rescheduled for you. " : "";
  if (state === "upcoming") return { ...base, canGo: false, statusClass: "", statusText: rs + "Starts in " + fmtCountdown(tsMs(t.startAt) - now) };
  if (state === "live") return { ...base, canGo: mode === "student", href: "take-test.html?id=" + encodeURIComponent(item.id), statusClass: "live",
    statusText: rs + (mode === "student" ? "Open now. Tap the arrow to start. Last time to start " + fmtDateTime(tsMs(t.endAt)) : "Open now. Your child can start it from their own login.") };
  if (state === "inprogress") return { ...base, canGo: mode === "student", href: "take-test.html?id=" + encodeURIComponent(item.id), statusClass: "live",
    statusText: mode === "student" ? "In progress. Tap the arrow to continue. You will verify again." : "In progress." };
  if (state === "done") {
    let text = "Submitted. Result opens after " + fmtDateTime(keyOpenMs(t)) + ".";
    if (item.key) { const g = gradeAnswers(item.sub.answers, item.key, t.marksPerQuestion); text = "Submitted. Score " + g.score + " / " + (t.totalMarks || 0); }
    return { ...base, canGo: true, href: "test-report.html?id=" + encodeURIComponent(item.id) + "&roll=" + encodeURIComponent(roll), statusClass: "done", statusText: text, label: "Report for " + (t.subject || "test") };
  }
  if (state === "missed") return { ...base, canGo: false, statusClass: "missed", statusText: "Time ended without submitting." };
  return { ...base, canGo: false, statusClass: "missed", statusText: "Closed. Not attempted." };
}

const ORDER = { inprogress: 0, live: 0, upcoming: 1, done: 2, missed: 3, closed: 3 };

export async function startList({ host, emptyEl, roll, cls, section, mode }) {
  const snap = await getDocs(query(collection(db, "tests"), where("class", "==", cls), where("status", "==", "published")));
  const items = [];
  // A test is made for one section. Older tests have no section and are shown to the whole class.
  const mine = snap.docs.filter((d) => !d.data().section || sameSection(d.data().section, section));
  for (const d of mine) {
    const id = d.id, aid = attemptId(id, roll);
    const sSnap = await getDoc(doc(db, "testSubmissions", aid));
    const sub = sSnap.exists() ? sSnap.data() : null;
    let key = null, attempt = null;
    if (sub) { try { const k = await getDoc(doc(db, "testKeys", aid)); if (k.exists()) key = k.data().answers; } catch (e) { /* key not ready */ } }
    else if (mode === "student") { const a = await getDoc(doc(db, "testAttempts", aid)); if (a.exists()) attempt = a.data(); }
    // A student who missed the test may have been given a new time by the teacher.
    let test = d.data();
    if (!sub) { try { const r = await getDoc(doc(db, "testReschedules", aid)); if (r.exists()) test = withReschedule(test, r.data()); } catch (e) { console.warn("Could not check for a new test time. Are the latest Firestore rules published?", e); } }
    items.push({ id, test, sub, key, attempt });
  }
  let states = [];
  const render = () => {
    const now = Date.now();
    items.sort((a, b) => (ORDER[stateOf(a, now)] - ORDER[stateOf(b, now)]) || (stateOf(a, now) === "upcoming" ? tsMs(a.test.startAt) - tsMs(b.test.startAt) : tsMs(b.test.startAt) - tsMs(a.test.startAt)));
    states = items.map((it) => stateOf(it, now));
    host.innerHTML = items.map((it, i) => testCardHTML(it.test, info(it, states[i], now, mode, roll))).join("");
    if (emptyEl) emptyEl.hidden = items.length > 0;
  };
  render();
  setInterval(() => {
    const now = Date.now();
    const next = items.map((it) => stateOf(it, now));
    if (next.some((s, i) => s !== states[i])) { render(); return; }
    items.forEach((it, i) => {
      if (states[i] !== "upcoming") return;
      const el = host.querySelector('[data-test="' + CSS.escape(it.id) + '"] [data-status]');
      if (el) el.textContent = (it.test.rescheduled ? "Rescheduled for you. " : "") + "Starts in " + fmtCountdown(tsMs(it.test.startAt) - now);
    });
  }, 1000);
}
