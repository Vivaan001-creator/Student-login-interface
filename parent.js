import { db } from "./Firebase.js";
import { claimParent, markLoggedIn, portalLogout } from "./portal-auth.js";

let loginFails = 0, loginLockedUntil = 0;
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { generateBillingPeriods, allocateDueStatus, findClassDoc, classKeyOf, isPaymentVerified } from "./fee-utils.js?v=3";

// ==========================================================
// Helpers
// ==========================================================
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Safe value for use inside an inline onclick="..." attribute.
function jsq(v) {
  return escapeHtml(JSON.stringify(String(v === undefined || v === null ? "" : v)));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showEmpty(emptyMsg, text) {
  if (emptyMsg) {
    emptyMsg.style.display = "block";
    emptyMsg.textContent = text;
  }
}

// classKeyOf() and findClassDoc() now live in fee-utils.js
// (shared with pay-fee.js, which needs the exact same class ->
// fee-structure lookup when independently re-verifying an
// amount before writing a payment).

// ==========================================================
// Shared month list (same as student.js / result.js, so a
// month picked here matches what's actually stored under
// students/{roll}/results/{month})
// ==========================================================
const MONTHS = [
  "June 2026", "July 2026", "August 2026", "September 2026", "October 2026",
  "November 2026", "December 2026", "January 2027", "February 2027", "March 2027",
  "April 2027", "May 2027", "June 2027", "July 2027", "August 2027", "September 2027",
  "October 2027", "November 2027", "December 2027", "January 2028"
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function currentMonthLabel() {
  const now = new Date();
  const label = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  return MONTHS.includes(label) ? label : MONTHS[0];
}

function populateMonthDropdown(selectEl, months, defaultValue) {
  selectEl.innerHTML = "";
  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    selectEl.appendChild(opt);
  });
  selectEl.value = defaultValue || months[0];
}

// Converts a "June 2026" style label into a [start, end) yyyy-mm-dd
// range, used to query the attendance subcollection (doc IDs are
// plain yyyy-mm-dd dates, same as teacher.js writes them).
function monthLabelToRange(label) {
  const parts = (label || "").split(" ");
  const monthName = parts[0];
  const year = Number(parts[1]);
  const monthIndex = MONTH_NAMES.indexOf(monthName);
  if (monthIndex === -1 || !year) return null;

  const pad = (n) => String(n).padStart(2, "0");
  const start = `${year}-${pad(monthIndex + 1)}-01`;

  const endMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
  const endYear = monthIndex === 11 ? year + 1 : year;
  const end = `${endYear}-${pad(endMonthIndex + 1)}-01`;

  return { start, end };
}

// ==========================================================
// Parent Login (Roll Number + Registered Mobile Number)
//
// Deliberately a DIFFERENT credential pair than student login
// (which uses Roll + DOB) - this is what makes the Parent
// Portal "separate from student login" per login.html's own
// description, and it doubles as the key used to find every
// sibling registered under the same contact number.
// ==========================================================
async function parentLogin() {
  const rollInput = document.getElementById("parentRoll");
  const contactInput = document.getElementById("parentContact");

  const roll = rollInput.value.trim();
  const contact = contactInput.value.trim();

  if (!roll || !contact) {
    alert("Please enter both Roll Number and Mobile Number.");
    return;
  }
  if (Date.now() < loginLockedUntil) {
    alert("Too many wrong tries. Please wait " + Math.ceil((loginLockedUntil - Date.now()) / 1000) + " seconds.");
    return;
  }

  try {
    // The proof of login is checked by the database rules, not by this page.
    const claim = await claimParent({ roll, contact });
    if (!claim.ok) {
      loginFails++;
      if (loginFails >= 5) { loginFails = 0; loginLockedUntil = Date.now() + 60000; }
      alert(claim.message);
      return;
    }
    loginFails = 0;

    const studentSnap = await getDoc(doc(db, "students", roll));
    const student = studentSnap.data() || {};

    // Record this login so it shows on the admin's Login Activity page.
    // A tracking problem must never stop the parent from logging in.
    try {
      await addDoc(collection(db, "loginLogs"), {
        role: "parent",
        refId: roll,
        name: "Parent of " + (student.name || student.studentName || roll),
        class: student.class || "",
        timestamp: serverTimestamp()
      });
    } catch (logErr) {
      console.error("Login tracking failed:", logErr);
    }

    markLoggedIn("parentLoggedIn");
    localStorage.setItem("parentContact", contact);
    localStorage.setItem("parentActiveRoll", roll);

    alert("Login successful. Welcome back!");
    window.location.href = "parent-dashboard.html";

  } catch (error) {
    console.error(error);
    alert("Could not log in right now. Please try again.");
  }
}
window.parentLogin = parentLogin;

const parentLoginForm = document.getElementById("parentLoginForm");
if (parentLoginForm) {
  parentLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    await parentLogin();
  });
}

// ==========================================================
// Dashboard access guard
// ==========================================================
if (window.location.pathname.includes("parent-dashboard.html")) {
  if (localStorage.getItem("parentLoggedIn") !== "true") {
    window.location.replace("parent-login.html");
  }
}

// ==========================================================
// Logout
// ==========================================================
async function parentLogout() {
  await portalLogout(["parentLoggedIn", "parentContact", "parentActiveRoll"]);
  window.location.replace("parent-login.html");
}
window.parentLogout = parentLogout;

// ==========================================================
// Load Dashboard - profile, result, attendance, homework,
// notices and fee status for the currently active child, plus
// a switcher for parents with more than one child in school.
// ==========================================================
const parentDashboardBox = document.getElementById("parentDashboardBox");

if (parentDashboardBox) {
  loadParentDashboard();
}

let childrenCache = [];

async function loadParentDashboard() {
  const contact = localStorage.getItem("parentContact");
  if (!contact) return;

  // Always read fresh from Firestore - no locally-cached student
  // data - so anything Admin edits/uploads shows up here immediately.
  const childSnap = await getDocs(
    query(collection(db, "students"), where("contactNumber", "==", contact))
  );

  if (childSnap.empty) {
    alert("No student record found. Please log in again.");
    parentLogout();
    return;
  }

  childrenCache = childSnap.docs.map((d) => ({ roll: d.id, ...d.data() }));

  let activeRoll = localStorage.getItem("parentActiveRoll");
  if (!activeRoll || !childrenCache.some((c) => c.roll === activeRoll)) {
    activeRoll = childrenCache[0].roll;
    localStorage.setItem("parentActiveRoll", activeRoll);
  }

  renderChildSwitcher(activeRoll);
  await loadChildDashboard(activeRoll);
}

function renderChildSwitcher(activeRoll) {
  const section = document.getElementById("child-switch-section");
  const row = document.getElementById("childSwitchRow");
  if (!section || !row) return;

  if (childrenCache.length <= 1) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  row.innerHTML = childrenCache.map((c) => `
    <button type="button" class="child-chip ${c.roll === activeRoll ? "active" : ""}" onclick="switchChild(${jsq(c.roll)})">
      <i class="fa-solid fa-user"></i> ${escapeHtml(c.name || c.roll)}
    </button>
  `).join("");
}

async function switchChild(roll) {
  localStorage.setItem("parentActiveRoll", roll);
  renderChildSwitcher(roll);
  await loadChildDashboard(roll);
}
window.switchChild = switchChild;

// Shows whether the parent's last profile change request is waiting, approved or declined.
async function showProfileRequestStatus(roll) {
  const box = document.getElementById("profileRequestBanner");
  if (!box) return;
  const key = "profileRequest_" + roll;
  const id = localStorage.getItem(key);
  box.hidden = true;
  if (!id) return;
  try {
    const snap = await getDoc(doc(db, "profileRequests", id));
    if (!snap.exists()) { localStorage.removeItem(key); return; }
    const req = snap.data();
    const dismiss = '<button type="button" id="dismissRequestBanner">Dismiss</button>';
    if (req.status === "pending") {
      box.className = "request-banner";
      box.textContent = "Your profile changes are waiting for approval from the tuition office.";
    } else if (req.status === "approved") {
      box.className = "request-banner ok";
      box.textContent = "Your profile changes were approved and the profile is updated. ";
      box.insertAdjacentHTML("beforeend", dismiss);
    } else {
      box.className = "request-banner err";
      box.textContent = "Your profile changes were not approved." + (req.reviewNote ? " Reason: " + req.reviewNote : "") + " ";
      box.insertAdjacentHTML("beforeend", dismiss);
    }
    box.hidden = false;
    const btn = document.getElementById("dismissRequestBanner");
    if (btn) btn.addEventListener("click", () => { localStorage.removeItem(key); box.hidden = true; });
  } catch (e) {
    console.error("Could not read the profile request status:", e);
  }
}

async function loadChildDashboard(roll) {
  const child = childrenCache.find((c) => c.roll === roll);
  if (!child) return;

  setText("dashChildName", child.name || "-");
  setText("dashChildRoll", roll);
  setText("dashChildRoll2", roll);
  setText("dashChildClass", child.class || "-");
  setText("dashChildClass2", child.class || "-");
  setText("dashFatherName", child.father || "-");
  setText("dashMotherName", child.mother || "-");
  showProfileRequestStatus(roll);
  setText("dashAttendance", (child.attendance || "0") + "%");

  const monthSelect = document.getElementById("resultMonth");
  if (monthSelect) {
    populateMonthDropdown(monthSelect, MONTHS, currentMonthLabel());
  }

  const attMonthSelect = document.getElementById("attendanceMonth");
  if (attMonthSelect) {
    populateMonthDropdown(attMonthSelect, MONTHS, currentMonthLabel());
    attMonthSelect.onchange = () => loadChildAttendance(roll, attMonthSelect.value);
    await loadChildAttendance(roll, attMonthSelect.value);
  }

  await loadChildHomework(child);
  await loadChildFeeStatus(roll, child);
  await loadNotices();
}

// ==========================================================
// Attendance (reads students/{roll}/attendance/{yyyy-mm-dd}
// docs written by the teacher's Attendance page)
// ==========================================================
async function loadChildAttendance(roll, month) {
  const summaryBox = document.getElementById("attendanceSummaryBox");
  const tableBody = document.getElementById("attendanceTableBody");
  const emptyMsg = document.getElementById("attendanceEmptyMsg");

  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (summaryBox) summaryBox.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  const range = monthLabelToRange(month);
  if (!range) return;

  try {
    // BUG FIX: a where()+where()+orderBy() range query on documentId()
    // was asking Firestore for a composite index that doesn't exist in
    // this project ("Could not load attendance: The query requires
    // an index..."). A single student's attendance subcollection is
    // tiny (one doc per school day), so instead of requiring an index,
    // fetch the whole subcollection once and filter/sort in JS.
    const allSnap = await getDocs(collection(db, "students", roll, "attendance"));

    const docsInRange = allSnap.docs
      .filter((d) => d.id >= range.start && d.id < range.end)
      .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

    if (docsInRange.length === 0) {
      showEmpty(emptyMsg, "No attendance record for " + month + " yet.");
      return;
    }

    let present = 0;
    let absent = 0;
    let rows = "";

    docsInRange.forEach((docSnap) => {
      const status = docSnap.data().status || "Present";
      if (status === "Present") present++; else absent++;

      const dateText = new Date(docSnap.id + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      });

      rows += `
        <tr>
          <td data-label="Date">${dateText}</td>
          <td data-label="Status">
            <span class="${status === "Present" ? "status-active" : "status-inactive"}">${escapeHtml(status)}</span>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = rows;

    const total = present + absent;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

    if (summaryBox) {
      summaryBox.innerHTML = `
        <div class="mini-stat-card">
          <div class="mini-stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
          <div class="mini-stat-info">
            <div class="mini-stat-number">${present}</div>
            <div class="mini-stat-label">Present</div>
          </div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-icon orange"><i class="fa-solid fa-circle-xmark"></i></div>
          <div class="mini-stat-info">
            <div class="mini-stat-number">${absent}</div>
            <div class="mini-stat-label">Absent</div>
          </div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-icon blue"><i class="fa-solid fa-chart-line"></i></div>
          <div class="mini-stat-info">
            <div class="mini-stat-number">${percentage}%</div>
            <div class="mini-stat-label">Attendance</div>
          </div>
        </div>
      `;
    }

  } catch (error) {
    console.error(error);
    showEmpty(emptyMsg, "Could not load attendance: " + error.message);
  }
}

// ==========================================================
// Homework (reads the top-level "homework" collection the
// same way teacher.js writes it - scoped to the child's class,
// matched with the same normalized key used across the app so
// "Class 3" on the student and "3" on the homework doc still
// match up)
// ==========================================================
async function loadChildHomework(child) {
  const list = document.getElementById("homeworkList");
  const emptyMsg = document.getElementById("homeworkEmptyMsg");

  if (!list) return;

  list.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  if (!child.class) {
    showEmpty(emptyMsg, "Class is not set, so homework cannot be shown.");
    return;
  }

  try {
    const allSnap = await getDocs(collection(db, "homework"));
    const targetKey = classKeyOf(child.class);

    const matching = allSnap.docs
      .filter((d) => classKeyOf(d.data().classId) === targetKey)
      .map((d) => d.data())
      .sort((a, b) => {
        const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });

    if (matching.length === 0) {
      showEmpty(emptyMsg, "No homework has been given yet.");
      return;
    }

    list.innerHTML = matching.map((hw) => `
      <div class="homework-item">
        <div class="homework-tag">
          <span class="subject">${escapeHtml(hw.subject || "-")}</span>
          <span class="due">${escapeHtml(hw.dueDate || "")}</span>
        </div>
        <div class="homework-body">
          <h4>${escapeHtml(hw.title || "Homework")}</h4>
          <p>${escapeHtml(hw.description || "")}</p>
        </div>
      </div>
    `).join("");

  } catch (error) {
    console.error(error);
    showEmpty(emptyMsg, "Could not load homework: " + error.message);
  }
}

// ==========================================================
// Notice Board (reads the top-level "notices" collection,
// same one notices.html on the admin side writes to - school-
// wide, so it's identical regardless of which child is active)
// ==========================================================
async function loadNotices() {
  const list = document.getElementById("noticesList");
  const emptyMsg = document.getElementById("noticesEmptyMsg");

  if (!list) return;

  list.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  try {
    const noticesQuery = query(collection(db, "notices"), orderBy("date", "desc"), limit(30));
    const snap = await getDocs(noticesQuery);

    if (snap.empty) {
      showEmpty(emptyMsg, "No notices yet.");
      return;
    }

    let html = "";

    snap.forEach((docSnap) => {
      const n = docSnap.data();
      const dateText = n.date && n.date.toDate
        ? n.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";

      html += `
        <div class="notice-item">
          <div class="notice-tag">
            <i class="fa-regular fa-bell"></i>
            <span class="date">${dateText}</span>
          </div>
          <div class="notice-body">
            <h4>${escapeHtml(n.title || "-")}</h4>
            <p>${escapeHtml(n.description || "")}</p>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;

  } catch (error) {
    console.error(error);
    showEmpty(emptyMsg, "Could not load notices: " + error.message);
  }
}

// ==========================================================
// Fee Status (reads classes/{classId} for the fee structure
// and students/{roll}/payments for this child's own payment
// history - same data admin's Fee Management page writes)
// ==========================================================
async function loadChildFeeStatus(roll, child) {
  const summaryBox = document.getElementById("feeSummaryBox");
  const dueBox = document.getElementById("feeDueBox");
  const tableBody = document.getElementById("feeTableBody");
  const emptyMsg = document.getElementById("feeEmptyMsg");

  if (!summaryBox) return;

  summaryBox.innerHTML = "";
  if (dueBox) dueBox.innerHTML = "";
  if (tableBody) tableBody.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  try {
    const classData = await findClassDoc(child.class);
    const feeAmount = classData ? Number(classData.feeAmount) || 0 : 0;
    const feeFrequency = classData ? (classData.feeFrequency || "Monthly") : "Monthly";

    const paymentsSnap = await getDocs(
      query(collection(db, "students", roll, "payments"), orderBy("date", "desc"))
    );

    let totalPaid = 0;
    const pendingByPeriod = {};
    let rows = "";

    paymentsSnap.forEach((p) => {
      const pay = p.data();
      const amt = Number(pay.amount) || 0;
      const trusted = isPaymentVerified(pay);

      if (trusted) {
        totalPaid += amt;
      } else if (pay.periodKey) {
        pendingByPeriod[pay.periodKey] = (pendingByPeriod[pay.periodKey] || 0) + amt;
      }

      const dateText = pay.date && pay.date.toDate
        ? pay.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";
      const statusTag = trusted
        ? ""
        : ` <span class="status-inactive" style="margin-left:6px;">Pending Verification</span>`;
      rows += `
        <tr>
          <td data-label="Date">${dateText}</td>
          <td data-label="Amount">₹${pay.amount}</td>
          <td data-label="Mode">${escapeHtml(pay.mode || "-")}</td>
          <td data-label="Note">${escapeHtml(pay.note || "-")}${statusTag}</td>
        </tr>
      `;
    });

    // Month-by-month due, anchored to admission date - falls back
    // to the old single lump-sum view if admission date isn't set,
    // since there's nothing to anchor a month-wise breakdown to.
    const periods = generateBillingPeriods(child.admissionDate, feeFrequency, feeAmount);
    const periodsWithStatus = allocateDueStatus(periods, totalPaid).map((p) => {
      // A self-reported payment sitting in Firestore for this exact
      // period, not yet trusted, shows as its own "pending" state -
      // NOT paid (that's the whole point) and not plain "due" either,
      // so a parent doesn't get prompted to pay twice.
      if (p.status !== "paid" && pendingByPeriod[p.key] > 0) {
        return { ...p, status: "pending" };
      }
      return p;
    });
    const outstanding = periodsWithStatus.filter((p) => p.status === "due" || p.status === "partial");

    let overallBadge;
    if (!feeAmount) {
      overallBadge = `<span class="status-inactive">Fee not set</span>`;
    } else if (outstanding.length === 0 && periodsWithStatus.some((p) => p.status === "pending")) {
      overallBadge = `<span class="status-inactive">Verification Pending</span>`;
    } else if (outstanding.length === 0) {
      overallBadge = `<span class="status-active">All Paid</span>`;
    } else {
      const totalDue = outstanding.reduce((sum, p) => sum + p.amountDue, 0);
      overallBadge = `<span class="status-inactive">Due ₹${totalDue}</span>`;
    }

    summaryBox.innerHTML = `
      <div class="fee-student-summary">
        <div class="fee-student-who">
          <strong>${escapeHtml(child.name || "-")}</strong>
          <span>${escapeHtml(child.class || "-")} · Roll ${escapeHtml(roll)}</span>
        </div>
        <div class="fee-student-amounts">
          <span>Fee: ₹${feeAmount || 0} / ${escapeHtml(feeFrequency)}</span>
          <span>Paid (Verified): ₹${totalPaid}</span>
          ${overallBadge}
        </div>
      </div>
    `;

    if (dueBox) {
      if (!feeAmount) {
        dueBox.innerHTML = "";
      } else if (periods.length === 0) {
        // No admission date on file - can't anchor a month-wise
        // breakdown, so just note that plainly instead of guessing.
        dueBox.innerHTML = `<p class="result-empty-msg">Admission date is not set, so month-wise dues cannot be shown. Please contact the tuition office.</p>`;
      } else {
        dueBox.innerHTML = periodsWithStatus.map((p) => {
          if (p.status === "paid") {
            return `
              <div class="fee-period-row paid">
                <div>
                  <div class="fee-period-label">${escapeHtml(p.label)}</div>
                  <div class="fee-period-amount">₹${p.amount}</div>
                </div>
                <span class="status-active"><i class="fa-solid fa-circle-check"></i> Paid</span>
              </div>
            `;
          }
          if (p.status === "pending") {
            return `
              <div class="fee-period-row pending">
                <div>
                  <div class="fee-period-label">${escapeHtml(p.label)}</div>
                  <div class="fee-period-amount">₹${p.amount}</div>
                </div>
                <span class="status-inactive"><i class="fa-solid fa-hourglass-half"></i> Verification Pending</span>
              </div>
            `;
          }
          const badge = p.status === "partial"
            ? `<span class="status-inactive">Partially Paid - Due ₹${p.amountDue}</span>`
            : `<span class="status-inactive">Due ₹${p.amountDue}</span>`;
          return `
            <div class="fee-period-row ${p.status}">
              <div>
                <div class="fee-period-label">${escapeHtml(p.label)}</div>
                <div class="fee-period-amount">₹${p.amount}</div>
              </div>
              <div class="fee-period-status">
                ${badge}
                <button type="button" class="btn-pay-now" onclick="goToPayFee(${jsq(roll)}, ${jsq(p.key)})">
                  <i class="fa-solid fa-indian-rupee-sign"></i> Pay Now
                </button>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    if (tableBody) {
      tableBody.innerHTML = rows || `<tr><td colspan="4">No payment records yet.</td></tr>`;
    }

  } catch (error) {
    console.error(error);
    if (emptyMsg) showEmpty(emptyMsg, "Could not load fee status: " + error.message);
  }
}

// Hands off to the dedicated payment page. Only roll + which
// period is passed - the amount is deliberately NOT sent here;
// pay-fee.html re-derives it fresh from Firestore itself so it
// can never be tampered with via the URL.
function goToPayFee(roll, periodKey) {
  window.location.href = `pay-fee.html?roll=${encodeURIComponent(roll)}&period=${encodeURIComponent(periodKey)}`;
}
window.goToPayFee = goToPayFee;

// ==========================================================
// Sidebar hamburger + backdrop (same behaviour as student.js /
// teacher.js / admin.js)
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("expanded");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
  }

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("expanded");
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle("active");
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", closeSidebar);
  }
});
