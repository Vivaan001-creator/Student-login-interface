// Notifications for every logged-in dashboard.
//   - Asks once (Yes / No) before the browser's own permission prompt.
//   - Student and parent dashboards get a bell: a blinking red dot means a new
//     notice or app update. Opening the bell shows them and clears the dot.
//   - New features listed in whats-new.json are highlighted once per device.
//   - Update checks read whats-new.json, so uploading a new version of that file
//     is what tells every device "something changed".
// Limit: this works while the app or browser tab is alive. Notifications to a
// phone that has the app fully closed need a push server (see the report).
import { db } from "./Firebase.js";
import { collection, query, orderBy, limit, where, onSnapshot, doc, getDoc }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { fmtDateTime, fmtDuration } from "./tests-common.js";

const marker = document.querySelector("script[data-notify-role]");
const ROLE = marker ? marker.getAttribute("data-notify-role") : "";
const HAS_BELL = ROLE === "student" || ROLE === "parent";
const BELL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';

const K = {
  ask: "ga_n_ask",
  seenNotices: "ga_n_seen_" + ROLE,
  version: "ga_n_version_" + ROLE,
  versionNotified: "ga_n_vnotified_" + ROLE,
  features: "ga_n_features_" + ROLE,
  noticeNotified: "ga_n_nnotified_" + ROLE,
  testNotified: "ga_n_tnotified_" + ROLE
};

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s === undefined || s === null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const tsMs = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : (v && v.toDate ? v.toDate().getTime() : 0));
const dateText = (ms) => ms ? new Date(ms).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const supported = "Notification" in window;
const permission = () => (supported ? Notification.permission : "unsupported");

// ---------- state ----------
let notices = [];            // { id, title, description, time }
let tests = [];              // { id, subject, title, startAt, durationMinutes, totalMarks, time }  (published tests for this class)
let firstTestsDone = false;
let seenTs = read(K.seenNotices, 0);
if (!seenTs) { seenTs = Date.now(); write(K.seenNotices, seenTs); } // old notices on a new device are not "new"
let site = null;             // parsed whats-new.json
let loadedVersion = null;    // version the page loaded with
let needsReload = false;
let bell = null, dotEl = null, bellNavDot = null;
let panelOpen = false;
let firstSnapshotDone = false;

const unseenNotices = () => notices.filter((n) => n.time > seenTs);
const unseenTests = () => tests.filter((t) => t.time > seenTs);
const TESTS_PAGE = ROLE === "parent" ? "parent-tests.html" : "student-tests.html";
const versionUnseen = () => !!(site && site.version && read(K.version, null) !== site.version);

// ---------- small UI helpers ----------
function toast(text) {
  document.querySelectorAll(".ga-toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "ga-toast"; t.setAttribute("role", "status"); t.textContent = text;
  t.addEventListener("click", () => t.remove());
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

// ---------- system notifications ----------
async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("sw.js"); } catch (e) { return null; }
}

async function showSystem(title, body, tag, url) {
  if (permission() !== "granted") return false;
  try {
    if ("serviceWorker" in navigator) {
      await registerSW();
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, tag, icon: "icon-192.png", badge: "favicon-32.png", data: { url: url || "./login.html" } });
      return true;
    }
    new Notification(title, { body, tag, icon: "icon-192.png" });
    return true;
  } catch (e) { return false; }
}

// ---------- dot / badge ----------
function updateDot() {
  const count = (HAS_BELL ? unseenNotices().length + unseenTests().length : 0) + (versionUnseen() ? 1 : 0);
  if (bell && dotEl) {
    dotEl.hidden = count === 0;
    bell.setAttribute("aria-label", count ? "Notifications, " + count + " new" : "Notifications");
  }
  const nav = document.querySelector('[data-bn-tab="notices"] .bn-icon-wrap');
  if (nav) {
    const has = unseenNotices().length > 0;
    if (has && !bellNavDot) { nav.style.position = "relative"; bellNavDot = document.createElement("span"); bellNavDot.className = "ga-bn-dot"; bellNavDot.setAttribute("aria-hidden", "true"); nav.appendChild(bellNavDot); }
    if (!has && bellNavDot) { bellNavDot.remove(); bellNavDot = null; }
  }
  renderBanner();
}

// ---------- update banner (teacher and admin, or when a reload is needed) ----------
function renderBanner() {
  const old = document.getElementById("gaBanner");
  const show = (!HAS_BELL && versionUnseen()) || needsReload;
  if (!show) { if (old) old.remove(); return; }
  if (old) return;
  const latest = site && site.releases && site.releases[0];
  const b = document.createElement("div");
  b.id = "gaBanner"; b.className = "ga-banner"; b.setAttribute("role", "status");
  b.innerHTML = '<span><strong>' + (needsReload ? "App updated." : "What's new.") + '</strong> ' + esc(latest ? latest.title : "The app was updated.") + '</span>';
  const open = document.createElement("button"); open.type = "button"; open.className = "ga-btn primary";
  open.textContent = needsReload ? "Reload" : "See what's new";
  open.addEventListener("click", () => { if (needsReload) window.location.reload(); else openPanel(); });
  const close = document.createElement("button"); close.type = "button"; close.className = "ga-btn"; close.textContent = "Dismiss";
  close.addEventListener("click", () => { if (site) write(K.version, site.version); b.remove(); updateDot(); });
  b.appendChild(open); b.appendChild(close);
  // Sit in the page, just under the header, so it never covers the header buttons.
  const header = document.querySelector(".top-header");
  if (header) header.insertAdjacentElement("afterend", b);
  else { b.classList.add("ga-banner-fixed"); document.body.appendChild(b); }
}

// ---------- the panel ----------
function permissionRow() {
  const p = permission();
  if (p === "unsupported") return '<div class="ga-row"><span>Phone alerts need this app added to your Home Screen on iPhone, or a browser that supports notifications.</span></div>';
  if (p === "granted") return '<div class="ga-row"><span>Notifications are <strong>on</strong> for this device.</span></div>';
  if (p === "denied") return '<div class="ga-row"><span>Notifications are <strong>blocked</strong>. Turn them on in your browser or phone settings.</span></div>';
  return '<div class="ga-row"><span>Notifications are <strong>off</strong>.</span><button type="button" class="ga-btn primary" id="gaEnable">Turn on</button></div>';
}

function openPanel() {
  if (panelOpen) return;
  panelOpen = true;
  const opener = document.activeElement;
  const newNoticeIds = new Set(unseenNotices().map((n) => n.id));
  const newTestIds = new Set(unseenTests().map((t) => t.id));
  const wasNewVersion = versionUnseen();

  const backdrop = document.createElement("div"); backdrop.className = "ga-backdrop";
  const sheet = document.createElement("div"); sheet.className = "ga-sheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-labelledby", "gaPanelTitle");

  const releases = (site && site.releases ? site.releases : []).slice(0, 3);
  let html = '<div class="ga-sheet-head"><h2 id="gaPanelTitle">Notifications</h2><button type="button" class="ga-close" aria-label="Close">&times;</button></div>';
  html += permissionRow();

  if (HAS_BELL) {
    html += '<div class="ga-sec">Notices</div>';
    if (!notices.length) html += '<p class="ga-empty">No notices yet.</p>';
    notices.slice(0, 10).forEach((n) => {
      html += '<div class="ga-item"><h3>' + esc(n.title || "Notice") + (newNoticeIds.has(n.id) ? '<span class="ga-new">NEW</span>' : "") + "</h3>" +
        (n.description ? "<p>" + esc(n.description) + "</p>" : "") + '<span class="ga-when">' + esc(dateText(n.time)) + "</span></div>";
    });
    html += '<button type="button" class="ga-link" id="gaViewAll">View all notices</button>';

    html += '<div class="ga-sec">Tests</div>';
    if (!tests.length) html += '<p class="ga-empty">No tests yet.</p>';
    tests.slice(0, 5).forEach((t) => {
      html += '<div class="ga-item"><h3>' + esc(t.subject || "Test") + (newTestIds.has(t.id) ? '<span class="ga-new">NEW</span>' : "") + "</h3>" +
        "<p>" + esc(fmtDuration(t.durationMinutes)) + " | " + esc(String(t.totalMarks || 0)) + " marks</p>" +
        '<span class="ga-when">Starts ' + esc(fmtDateTime(t.startMs)) + "</span></div>";
    });
    html += '<button type="button" class="ga-link" id="gaViewTests">' + (ROLE === "parent" ? "View test reports" : "View tests") + "</button>";
  }
  // Notices and tests first (what people open the bell for), release notes after.
  html += '<div class="ga-sec">App updates</div>';
  if (!releases.length) html += '<p class="ga-empty">No updates yet.</p>';
  releases.forEach((r, i) => {
    html += '<div class="ga-item"><h3>' + esc(r.title) + (i === 0 && wasNewVersion ? '<span class="ga-new">NEW</span>' : "") + '</h3>' +
      '<span class="ga-when">' + esc(dateText(Date.parse(r.date))) + '</span>' +
      (r.notes && r.notes.length ? "<ul>" + r.notes.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>" : "") +
      (i === 0 && needsReload ? '<p style="margin-top:10px"><button type="button" class="ga-btn primary" id="gaReload">Reload to update</button></p>' : "") + "</div>";
  });

  sheet.innerHTML = html;
  document.body.appendChild(backdrop); document.body.appendChild(sheet);

  const close = () => {
    if (!panelOpen) return;
    panelOpen = false; backdrop.remove(); sheet.remove(); document.removeEventListener("keydown", onKey);
    if (opener && opener.focus) opener.focus();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  backdrop.addEventListener("click", close);
  sheet.querySelector(".ga-close").addEventListener("click", close);
  const enable = sheet.querySelector("#gaEnable");
  if (enable) enable.addEventListener("click", async () => { await requestPermissionFlow(); close(); openPanel(); });
  const reload = sheet.querySelector("#gaReload");
  if (reload) reload.addEventListener("click", () => window.location.reload());
  const viewTests = sheet.querySelector("#gaViewTests");
  if (viewTests) viewTests.addEventListener("click", () => { window.location.href = TESTS_PAGE; });
  const all = sheet.querySelector("#gaViewAll");
  if (all) all.addEventListener("click", () => { close(); if (window.BottomNav && window.BottomNav.go) window.BottomNav.go("notices"); });
  sheet.querySelector(".ga-close").focus();

  // Opening the panel means the user has seen everything in it.
  seenTs = Date.now(); write(K.seenNotices, seenTs);
  if (site && site.version) write(K.version, site.version);
  updateDot();
}

// ---------- permission (Yes / No first, then the browser's own prompt) ----------
async function requestPermissionFlow() {
  if (!supported) return "unsupported";
  const result = await new Promise((resolve) => {
    try { const p = Notification.requestPermission(resolve); if (p && p.then) p.then(resolve); } catch (e) { resolve("denied"); }
  });
  write(K.ask, { state: "yes", at: Date.now(), result });
  if (result === "granted") { await registerSW(); toast("Notifications are on. You will be alerted about new notices and app updates."); }
  else if (result === "denied") toast("Notifications are blocked. You can turn them on in your browser settings.");
  return result;
}

function askPermission() {
  if (!supported || permission() !== "default") return Promise.resolve();
  const prev = read(K.ask, null);
  if (prev && prev.state === "no" && Date.now() - prev.at < 7 * 864e5) return Promise.resolve();
  return new Promise((resolve) => {
    const backdrop = document.createElement("div"); backdrop.className = "ga-backdrop";
    const sheet = document.createElement("div"); sheet.className = "ga-sheet ga-ask"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "gaAskTitle"); sheet.setAttribute("aria-describedby", "gaAskText");
    sheet.innerHTML = '<h2 id="gaAskTitle">Get notifications?</h2>' +
      '<p id="gaAskText">Allow GenAlpha to alert you about new notices and app updates on this device.</p>' +
      '<div class="ga-actions"><button type="button" class="ga-btn" id="gaNo">No</button><button type="button" class="ga-btn primary" id="gaYes">Yes</button></div>';
    document.body.appendChild(backdrop); document.body.appendChild(sheet);
    const finish = () => { backdrop.remove(); sheet.remove(); document.removeEventListener("keydown", onKey); resolve(); };
    const decline = () => { write(K.ask, { state: "no", at: Date.now() }); finish(); };
    const onKey = (e) => { if (e.key === "Escape") decline(); };
    document.addEventListener("keydown", onKey);
    sheet.querySelector("#gaNo").addEventListener("click", decline);
    sheet.querySelector("#gaYes").addEventListener("click", async () => { sheet.querySelector("#gaYes").disabled = true; await requestPermissionFlow(); finish(); });
    sheet.querySelector("#gaYes").focus();
  });
}

// ---------- feature highlight (once per device) ----------
function visible(el) { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; }

async function waitFor(selector, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const el = document.querySelector(selector);
    if (el && visible(el)) return el;
    await sleep(250);
  }
  return null;
}

function spotlight(feature, el) {
  return new Promise((resolve) => {
    const seen = new Set(read(K.features, []));
    let finished = false;
    const tag = document.createElement("span"); tag.className = "ga-new-tag"; tag.textContent = "NEW"; tag.setAttribute("aria-hidden", "true");
    const pop = document.createElement("div"); pop.className = "ga-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "New feature: " + feature.title);
    pop.innerHTML = "<h3>" + esc(feature.title) + "</h3><p>" + esc(feature.text) + '</p><button type="button" class="ga-btn primary">Got it</button>';
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";
    el.classList.add("ga-spot"); el.appendChild(tag); document.body.appendChild(pop);

    const place = () => {
      const r = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, m = 12;
      let top = r.bottom + 14;
      if (top + ph > window.innerHeight - m) top = Math.max(m, r.top - ph - 14);
      let left = Math.min(Math.max(m, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - m);
      pop.style.top = top + "px"; pop.style.left = left + "px";
    };
    const done = () => {
      if (finished) return; finished = true;
      seen.add(feature.id); write(K.features, [...seen]);  // saved at once, so leaving the page cannot repeat it
      el.classList.remove("ga-spot"); tag.remove(); pop.remove();
      window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey); el.removeEventListener("click", done, true);
      resolve();
    };
    const onKey = (e) => { if (e.key === "Escape") done(); };
    el.scrollIntoView({ block: "center", behavior: "auto" });
    place();
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey); el.addEventListener("click", done, true);
    pop.querySelector("button").addEventListener("click", done);
    pop.querySelector("button").focus({ preventScroll: true });
    setTimeout(done, 15000); // not left on screen forever
  });
}

async function runHighlights() {
  if (!site || !site.features) return;
  const seen = new Set(read(K.features, []));
  const list = site.features.filter((f) => (!f.roles || f.roles.includes(ROLE)) && !seen.has(f.id));
  for (const f of list) {
    const el = await waitFor(f.target, 4000);
    if (!el) continue;
    await spotlight(f, el);
    await sleep(400);
  }
}

// ---------- updates ----------
async function fetchSite() {
  try {
    const res = await fetch("whats-new.json?cb=" + Date.now(), { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
}

async function checkForUpdate() {
  const fresh = await fetchSite();
  if (!fresh || !fresh.version) return;
  site = fresh;
  if (loadedVersion === null) loadedVersion = fresh.version;
  else if (fresh.version !== loadedVersion) needsReload = true;
  updateDot();
  // Tell the user once per version, as a system notification when the app is in the background.
  if (versionUnseen() && read(K.versionNotified, null) !== fresh.version && document.hidden) {
    const latest = fresh.releases && fresh.releases[0];
    const sent = await showSystem("GenAlpha was updated", latest ? latest.title : "See what's new.", "update-" + fresh.version, "./login.html");
    if (sent) write(K.versionNotified, fresh.version);
  }
}

// ---------- notices ----------
function startNotices() {
  const q = query(collection(db, "notices"), orderBy("date", "desc"), limit(30));
  onSnapshot(q, (snap) => {
    notices = snap.docs.map((d) => {
      const n = d.data();
      return { id: d.id, title: n.title || "", description: n.description || "", time: tsMs(n.createdAt) || tsMs(n.date) };
    }).sort((a, b) => b.time - a.time);

    if (firstSnapshotDone) {
      const notified = read(K.noticeNotified, []);
      snap.docChanges().forEach((c) => {
        if (c.type !== "added" || notified.includes(c.doc.id)) return;
        const n = c.doc.data();
        notified.push(c.doc.id);
        const title = n.title || "New notice";
        if (document.hidden) showSystem("New notice", title, "notice-" + c.doc.id, "./" + (ROLE === "parent" ? "parent-dashboard.html" : "student-dashboard.html"));
        else toast("New notice: " + title);
      });
      write(K.noticeNotified, notified.slice(-50));
    }
    firstSnapshotDone = true;
    updateDot();
  }, (error) => console.error("Notice updates stopped:", error));
}

// ---------- new tests (published by a teacher for this student's class) ----------
async function startTests() {
  const roll = ROLE === "parent" ? localStorage.getItem("parentActiveRoll") : localStorage.getItem("studentRoll");
  if (!roll) return;
  let cls = ROLE === "student" ? localStorage.getItem("studentClass") : "";
  if (!cls) {
    try { const s = await getDoc(doc(db, "students", roll)); cls = s.exists() ? s.data().class : ""; } catch (e) { return; }
  }
  if (!cls) return;
  const q = query(collection(db, "tests"), where("class", "==", cls), where("status", "==", "published"));
  onSnapshot(q, (snap) => {
    tests = snap.docs.map((d) => {
      const t = d.data();
      return { id: d.id, subject: t.subject || "", durationMinutes: t.durationMinutes, totalMarks: t.totalMarks,
        startMs: tsMs(t.startAt), time: tsMs(t.publishedAt) || tsMs(t.createdAt) };
    }).sort((a, b) => b.time - a.time);

    if (firstTestsDone) {
      const notified = read(K.testNotified, []);
      snap.docChanges().forEach((c) => {
        if (c.type !== "added" || notified.includes(c.doc.id)) return;
        const t = c.doc.data();
        notified.push(c.doc.id);
        const subject = t.subject || "Test";
        const when = fmtDateTime(tsMs(t.startAt));
        if (document.hidden) showSystem("New test: " + subject, "Starts " + when, "test-" + c.doc.id, "./" + TESTS_PAGE);
        else toast("New test: " + subject + ", starts " + when);
      });
      write(K.testNotified, notified.slice(-50));
    }
    firstTestsDone = true;
    updateDot();
  }, (error) => console.error("Test updates stopped:", error));
}

// ---------- start ----------
async function main() {
  if (!ROLE) return;
  if (HAS_BELL) {
    const actions = document.querySelector(".header-actions");
    if (actions) {
      bell = document.createElement("button"); bell.type = "button"; bell.id = "gaBell"; bell.className = "header-icon-btn ga-bell";
      bell.setAttribute("aria-label", "Notifications"); bell.setAttribute("aria-haspopup", "dialog");
      bell.innerHTML = BELL_SVG + '<span class="ga-dot" aria-hidden="true" hidden></span>';
      dotEl = bell.querySelector(".ga-dot");
      bell.addEventListener("click", openPanel);
      actions.insertBefore(bell, actions.firstChild);
    }
    startNotices();
    startTests();
    window.addEventListener("bottomnav:change", (e) => {
      if (e.detail && e.detail.id === "notices") { seenTs = Date.now(); write(K.seenNotices, seenTs); updateDot(); }
    });
  }

  if (permission() === "granted") registerSW();

  await checkForUpdate();
  setInterval(checkForUpdate, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForUpdate(); });

  await sleep(1200);
  await askPermission();   // permission first, then the highlights
  await runHighlights();
}

main().catch((e) => console.error("Notifications could not start:", e));
