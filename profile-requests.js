// Admin reviews profile changes that parents requested. Approving applies the
// change to the student record; rejecting leaves the record as it is.
import { db } from "./Firebase.js";
import { collection, doc, getDoc, getDocs, updateDoc, query, orderBy, limit, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { STUDENT_EDITABLE_KEYS, FIELD_LABELS, escapeHtml, formatDisplayDate } from "./profile-utils.js";

const $ = (id) => document.getElementById(id);

function when(ts) {
  const d = ts && ts.toDate ? ts.toDate() : null;
  return d ? d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now";
}

function show(key, v) {
  if (v === undefined || v === null || v === "") return "(empty)";
  return key === "dob" ? formatDisplayDate(v) : String(v);
}

function changeRows(req) {
  const changes = req.changes || {}, previous = req.previous || {};
  return Object.keys(changes).filter((k) => STUDENT_EDITABLE_KEYS.includes(k)).map((k) =>
    '<div class="rq-change"><span class="rq-label">' + escapeHtml(FIELD_LABELS[k] || k) + '</span>' +
    '<span class="rq-old">' + escapeHtml(show(k, previous[k])) + '</span>' +
    '<span class="rq-arrow" aria-label="changed to">&rarr;</span>' +
    '<span class="rq-new">' + escapeHtml(show(k, changes[k])) + '</span></div>'
  ).join("");
}

function pendingCard(id, req) {
  return '<article class="ep-card rq-card" data-id="' + escapeHtml(id) + '">' +
    '<h2>' + escapeHtml(req.studentName || "Student") + ' <small>Roll ' + escapeHtml(req.roll || "-") + '</small></h2>' +
    '<p class="ep-hint">Requested ' + escapeHtml(when(req.createdAt)) + '</p>' +
    '<div class="rq-changes">' + changeRows(req) + '</div>' +
    '<div class="ep-actions"><button type="button" class="ep-btn" data-act="reject">Reject</button>' +
    '<button type="button" class="ep-btn primary" data-act="approve">Approve and update</button></div></article>';
}

function historyCard(id, req) {
  const approved = req.status === "approved";
  return '<article class="ep-card rq-card rq-done">' +
    '<h2>' + escapeHtml(req.studentName || "Student") + ' <small>Roll ' + escapeHtml(req.roll || "-") + '</small> ' +
    '<span class="rq-status ' + (approved ? "ok" : "no") + '">' + (approved ? "Approved" : "Rejected") + '</span></h2>' +
    '<p class="ep-hint">Requested ' + escapeHtml(when(req.createdAt)) + (req.reviewedAt ? " &middot; Reviewed " + escapeHtml(when(req.reviewedAt)) : "") + '</p>' +
    '<div class="rq-changes">' + changeRows(req) + '</div>' +
    (req.reviewNote ? '<p class="rq-note">Reason: ' + escapeHtml(req.reviewNote) + '</p>' : "") + '</article>';
}

let cache = new Map();

async function load() {
  try {
    const snap = await getDocs(query(collection(db, "profileRequests"), orderBy("createdAt", "desc"), limit(100)));
    cache = new Map();
    const pending = [], done = [];
    snap.forEach((d) => {
      cache.set(d.id, d.data());
      (d.data().status === "pending" ? pending : done).push([d.id, d.data()]);
    });
    $("pageLoading").hidden = true;
    $("pendingSection").hidden = pending.length === 0;
    $("historySection").hidden = done.length === 0;
    $("emptyState").hidden = snap.size !== 0;
    $("pendingCount").textContent = String(pending.length);
    $("pendingList").innerHTML = pending.map(([id, r]) => pendingCard(id, r)).join("");
    $("historyList").innerHTML = done.slice(0, 30).map(([id, r]) => historyCard(id, r)).join("");
  } catch (error) {
    console.error(error);
    $("pageLoading").textContent = "Could not load the requests. Please try again.";
  }
}

async function approve(id, btn) {
  const req = cache.get(id);
  if (!req) return;
  if (!confirm("Update " + (req.studentName || "this student") + "'s profile with these changes?")) return;
  btn.disabled = true;
  try {
    const studentRef = doc(db, "students", String(req.roll));
    const studentSnap = await getDoc(studentRef);
    if (!studentSnap.exists()) { alert("This student record no longer exists."); btn.disabled = false; return; }
    // Only known profile fields are ever applied.
    const payload = {};
    Object.keys(req.changes || {}).forEach((k) => { if (STUDENT_EDITABLE_KEYS.includes(k)) payload[k] = req.changes[k]; });
    if (!Object.keys(payload).length) { alert("There is nothing valid to apply in this request."); btn.disabled = false; return; }
    await updateDoc(studentRef, payload);
    await updateDoc(doc(db, "profileRequests", id), { status: "approved", reviewedAt: serverTimestamp() });
    alert("Profile updated.");
    load();
  } catch (error) {
    console.error(error);
    btn.disabled = false;
    alert("Could not update the profile. Please try again.");
  }
}

async function reject(id, btn) {
  const req = cache.get(id);
  if (!req) return;
  const reason = prompt("Reason for rejecting (optional). The parent will see it:", "");
  if (reason === null) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "profileRequests", id), {
      status: "rejected",
      reviewNote: String(reason).trim().slice(0, 200),
      reviewedAt: serverTimestamp()
    });
    alert("Request rejected.");
    load();
  } catch (error) {
    console.error(error);
    btn.disabled = false;
    alert("Could not reject the request. Please try again.");
  }
}

$("pendingList").addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.closest("[data-id]").getAttribute("data-id");
  if (btn.getAttribute("data-act") === "approve") approve(id, btn); else reject(id, btn);
});

load();
