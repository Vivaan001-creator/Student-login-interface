// Tests tab for the student and parent dashboards.
// <script type="module" src="tests-list.js" data-tests-role="student|parent"></script>
import { db } from "./Firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  escapeHtml, getTestsForClass, getAttempt, getKey, grade, toDate,
  fmtDuration, fmtDateTime, fmtCountdown
} from "./tests-core.js";

const role = (document.currentScript && document.currentScript.dataset.testsRole) ||
  document.querySelector("script[data-tests-role]")?.dataset.testsRole || "student";
const box = document.getElementById("testsList");
let ticker = null;
let busy = false;

function activeRoll() {
  return role === "parent" ? localStorage.getItem("parentActiveRoll") : localStorage.getItem("studentRoll");
}

async function render() {
  if (!box || busy) return;
  const roll = activeRoll();
  if (!roll) { box.innerHTML = `<p class="t-empty">Please log in again.</p>`; return; }
  busy = true;
  clearInterval(ticker);
  box.innerHTML = `<p class="t-empty">Loading tests...</p>`;
  try {
    const stSnap = await getDoc(doc(db, "students", roll));
    if (!stSnap.exists()) { box.innerHTML = `<p class="t-empty">Student record not found.</p>`; return; }
    const student = stSnap.data();
    if (!student.class) { box.innerHTML = `<p class="t-empty">Class is not set, so tests cannot be shown.</p>`; return; }

    const tests = await getTestsForClass(student.class);
    if (!tests.length) { box.innerHTML = `<p class="t-empty">No tests have been published yet.</p>`; return; }

    const rows = await Promise.all(tests.map(async (t) => {
      const attempt = await getAttempt(t.id, roll);
      let result = null;
      if (attempt) {
        try { result = grade(attempt.answers, await getKey(t.id), t.marksPerQuestion); } catch (e) { result = null; }
      }
      return { t, attempt, result };
    }));

    box.innerHTML = rows.map(({ t, attempt, result }) => {
      const start = toDate(t.startAt);
      const meta = `${fmtDuration(t.durationMin)} &middot; ${escapeHtml(t.totalMarks)} marks`;
      let badge = "", action = "";
      if (attempt) {
        badge = result
          ? `<span class="t-badge green">Score ${result.score}/${result.max}</span>`
          : `<span class="t-badge green">Submitted</span>`;
        action = `<button type="button" class="t-arrow" data-report="${escapeHtml(t.id)}" aria-label="View report"><i class="fa-solid fa-chart-simple"></i></button>`;
      } else if (t.status === "closed") {
        badge = `<span class="t-badge gray">Closed - not attempted</span>`;
      } else if (role === "student") {
        action = `<button type="button" class="t-arrow" data-start="${escapeHtml(t.id)}" data-at="${start ? start.getTime() : 0}" aria-label="Start test" disabled><i class="fa-solid fa-arrow-right"></i></button>`;
        badge = `<div class="t-countdown" data-cd="${start ? start.getTime() : 0}"></div>`;
      } else {
        badge = `<span class="t-badge">${start && start > new Date() ? "Upcoming" : "Not attempted yet"}</span>`;
      }
      return `<div class="t-card">
        <div class="t-main">
          <div class="t-subject">${escapeHtml(t.subject)}</div>
          ${t.title ? `<div class="t-title">${escapeHtml(t.title)}</div>` : ""}
          <div class="t-meta">${meta}</div>
          <div class="t-when"><i class="fa-regular fa-clock"></i> ${role === "student" && !attempt ? "Starts" : "Start"}: ${escapeHtml(fmtDateTime(t.startAt))}</div>
          ${badge}
        </div>
        ${action}
      </div>`;
    }).join("");

    box.querySelectorAll("[data-report]").forEach((b) => b.addEventListener("click", () => {
      location.href = `test-report.html?test=${encodeURIComponent(b.dataset.report)}&roll=${encodeURIComponent(roll)}&role=${role}`;
    }));
    box.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", () => {
      if (b.disabled) return;
      location.href = `student-test.html?id=${encodeURIComponent(b.dataset.start)}`;
    }));

    // The arrow stays disabled until the start time. Checked every second.
    const tick = () => {
      const now = Date.now();
      box.querySelectorAll("[data-start]").forEach((b) => {
        const at = Number(b.dataset.at) || 0;
        const open = now >= at;
        b.disabled = !open;
        const cd = b.closest(".t-card")?.querySelector("[data-cd]");
        if (cd) cd.textContent = open ? "Test is live - tap the arrow to begin" : "Starts in " + fmtCountdown(at - now);
      });
    };
    tick();
    ticker = setInterval(tick, 1000);
  } catch (e) {
    console.error(e);
    box.innerHTML = `<p class="t-empty">Could not load tests: ${escapeHtml(e.message)}</p>`;
  } finally {
    busy = false;
  }
}

// Load when the Tests tab is opened (this also picks up a child switched by a parent).
window.addEventListener("bottomnav:change", (e) => { if (e.detail && e.detail.id === "tests") render(); });

// Opened straight onto the Tests tab, or a parent switched child while it is showing.
const testsPanel = document.querySelector('[data-tab-section="tests"]');
if (testsPanel && !testsPanel.hidden) render();
document.addEventListener("click", (e) => {
  if (e.target.closest(".child-chip")) setTimeout(() => { if (testsPanel && !testsPanel.hidden) render(); }, 400);
});
