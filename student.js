import { db } from "./Firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================================================
// Date helper — accepts dd-mm-yyyy OR yyyy-mm-dd and returns
// a canonical yyyy-mm-dd string so login comparison works
// regardless of which format was typed / picked.
// ==========================================================
function toISODate(value) {
  if (!value) return "";
  const str = value.trim();

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  return str;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Same helper admin.js uses for the teacher profile page, so dates
// look consistent across the admin and student sides.
function formatDateNice(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value; // not a parseable date, show as-is
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ==========================================================
// Student / Parent Login (Roll Number + Date of Birth)
//
// NOTE on security: this checks the roll+DOB pair against the
// "students" collection directly from the client — there is no
// Firebase Auth account per student. That means your Firestore
// rules must allow read access to a student doc for this check
// to work, which also means DOB alone is a soft guard, not a
// strong password. Fine for a school portal MVP; if you need
// stronger security later, the standard upgrade is a Cloud
// Function that verifies roll+DOB server-side and mints a
// custom Firebase Auth token.
// ==========================================================
async function studentLogin() {
  const rollInput = document.getElementById("studentRoll");
  const dobInput = document.getElementById("studentDob");

  const roll = rollInput.value.trim();
  const dob = dobInput.value.trim();

  if (!roll || !dob) {
    alert("Roll Number aur Date of Birth dono bharein.");
    return;
  }

  try {
    const studentSnap = await getDoc(doc(db, "students", roll));

    if (!studentSnap.exists()) {
      alert("Yeh Roll Number system mein nahi mila.");
      return;
    }

    const student = studentSnap.data();
    const storedDob = toISODate(student.dob);
    const enteredDob = toISODate(dob);

    if (!storedDob || storedDob !== enteredDob) {
      alert("Date of Birth match nahi hui. Kripya dobara try karein.");
      return;
    }

    // Login tracking — a record admin can review, plus this account's own
    // last-login shown on the student's dashboard. Never blocks the login
    // itself if tracking happens to fail (e.g. a rules/network hiccup).
    try {
      // Capture the PREVIOUS login time before we overwrite it — this is
      // what "Last Login" should show (the time before this current visit),
      // not the timestamp we're about to write for this very login.
      const previousLogin = student.lastLogin
        ? (student.lastLogin.toDate ? student.lastLogin.toDate().toISOString() : new Date(student.lastLogin).toISOString())
        : "";
      sessionStorage.setItem("previousLogin", previousLogin);

      await addDoc(collection(db, "loginLogs"), {
        role: "student",
        refId: roll,
        name: student.name || student.studentName || roll,
        class: student.class || "",
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, "students", roll), {
        lastLogin: serverTimestamp(),
        loginCount: increment(1)
      });
    } catch (logErr) {
      console.error("Login tracking failed:", logErr);
    }

    sessionStorage.setItem("studentLoggedIn", "true");
    sessionStorage.setItem("studentRoll", roll);
    window.location.href = "student-dashboard.html";

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}
window.studentLogin = studentLogin;

const studentLoginForm = document.getElementById("studentLoginForm");
if (studentLoginForm) {
  studentLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    await studentLogin();
  });
}

// ==========================================================
// Dashboard access guard
// ==========================================================
if (window.location.pathname.includes("student-dashboard.html")) {
  if (sessionStorage.getItem("studentLoggedIn") !== "true") {
    window.location.replace("student-login.html");
  }
}

// ==========================================================
// Logout
// ==========================================================
function studentLogout() {
  sessionStorage.removeItem("studentLoggedIn");
  sessionStorage.removeItem("studentRoll");
  window.location.replace("student-login.html");
}
window.studentLogout = studentLogout;

// ==========================================================
// Class → pass/max marks scale
// (mirrors the scale used in admin.js; normalizes "Class 1"
// and "1" to the same key since the Add Student form and the
// Class Management page currently store these differently)
// ==========================================================
const lowerClassKeys = ["nursery", "l.k.g", "u.k.g", "1", "2", "3", "4", "5"];

function isLowerClass(classValue) {
  const key = (classValue || "").toLowerCase().replace(/^class\s*/, "").trim();
  return lowerClassKeys.includes(key);
}

// ==========================================================
// Grade + Teacher's Comment (ported from the original
// result.js design — same percentage boundaries and wording)
// ==========================================================
function gradeForPercentage(pct) {
  if (pct >= 90) return "A1";
  if (pct >= 80) return "A2";
  if (pct >= 70) return "B1";
  if (pct >= 60) return "B2";
  if (pct >= 50) return "C1";
  if (pct >= 40) return "C2";
  if (pct >= 33) return "D";
  return "E";
}

function commentForPercentage(pct) {
  if (pct >= 90) return "Excellent performance! Keep up the good work. Stay focused and aim higher.";
  if (pct >= 80) return "Outstanding performance! Keep up the excellent work.";
  if (pct >= 70) return "Good progress! Displays a solid understanding of the lessons.";
  if (pct >= 60) return "Good effort, but needs more practice in core concepts to improve.";
  if (pct >= 50) return "An average performance. Needs to pay closer attention during lessons.";
  if (pct >= 33) return "Must focus more in class and practice regularly at home to improve scores.";
  return "Needs hard work and regular practice for better improvement.";
}

// Prints just the My Result card (see the @media print rules in
// admin.css that hide everything else while this runs).
function printResult() {
  window.print();
}
window.printResult = printResult;

// ==========================================================
// Shared month list (Result + Attendance both use this)
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

// Defaults the month picker to the current real-world month
// instead of always opening on the first entry in MONTHS.
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
// Load Profile + Result + Attendance + Notices + Fee Status
// (student-dashboard.html)
// ==========================================================
const profileBox = document.getElementById("studentProfileBox");

if (profileBox) {
  loadStudentDashboard();
}

async function loadStudentDashboard() {
  const roll = sessionStorage.getItem("studentRoll");
  if (!roll) return;

  const snap = await getDoc(doc(db, "students", roll));
  if (!snap.exists()) return;

  const student = snap.data();

  setText("dashStudentName", student.name || "-");
  setText("dashStudentRoll", roll);
  setText("dashStudentRoll2", roll);
  setText("dashStudentClass", student.class || "-");
  setText("dashStudentClass2", student.class || "-");
  setText("dashStudentSection", student.section || "-");
  setText("dashGender", student.gender || "-");
  setText("dashDob", formatDateNice(student.dob));
  setText("dashAdmissionDate", formatDateNice(student.admissionDate));
  setText("dashFatherName", student.father || "-");
  setText("dashMotherName", student.mother || "-");
  setText("dashAttendance", (student.attendance || "0") + "%");

  const previousLogin = sessionStorage.getItem("previousLogin");
  if (previousLogin) {
    const dt = new Date(previousLogin);
    setText("dashLastLogin", dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }));
  } else {
    setText("dashLastLogin", "First login");
  }

  const monthSelect = document.getElementById("resultMonth");
  if (monthSelect) {
    populateMonthDropdown(monthSelect, MONTHS, currentMonthLabel());
    monthSelect.addEventListener("change", function () {
      loadStudentResult(roll, student, this.value);
    });
    await loadStudentResult(roll, student, monthSelect.value);
  }

  const attMonthSelect = document.getElementById("attendanceMonth");
  if (attMonthSelect) {
    populateMonthDropdown(attMonthSelect, MONTHS, currentMonthLabel());
    attMonthSelect.addEventListener("change", function () {
      loadStudentAttendance(roll, this.value);
    });
    await loadStudentAttendance(roll, attMonthSelect.value);
  }

  await loadStudentFeeStatus(roll, student);
  await loadStudentNotices();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadStudentResult(roll, student, month) {
  const tableBody = document.getElementById("resultTableBody");
  const emptyMsg = document.getElementById("resultEmptyMsg");
  const summaryBox = document.getElementById("resultSummaryBox");

  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (summaryBox) summaryBox.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";
  const resultCommentBoxEl = document.getElementById("resultCommentBox");
  if (resultCommentBoxEl) resultCommentBoxEl.textContent = "";

  if (student.publishStatus !== "published") {
    showEmpty(emptyMsg, "Aapka result abhi school dwara publish nahi kiya gaya hai.");
    return;
  }

  const snap = await getDoc(doc(db, "students", roll, "results", month));

  if (!snap.exists()) {
    showEmpty(emptyMsg, month + " ke liye result abhi upload nahi hua hai.");
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  const data = snap.data();
  const lower = isLowerClass(student.class);
  const maxMarks = lower ? 50 : 60;
  const passMarks = lower ? 17 : 20;

  let total = 0;
  let obtained = 0;
  let rows = "";

  Object.entries(data).forEach(([subject, marks]) => {
    const score = Number(marks) || 0;
    total += maxMarks;
    obtained += score;
    const passed = score >= passMarks;

    rows += `
      <tr>
        <td data-label="Subject">${escapeHtml(subject)}</td>
        <td data-label="Max">${maxMarks}</td>
        <td data-label="Pass">${passMarks}</td>
        <td data-label="Marks">${score}</td>
        <td data-label="Status">
          <span class="${passed ? "status-pass" : "status-fail"}">
            ${passed ? "Pass" : "Fail"}
          </span>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = rows;

  const percentage = total > 0 ? ((obtained / total) * 100).toFixed(1) : "0.0";
  const overallPass = total > 0 && (obtained / total) * 100 >= (passMarks / maxMarks) * 100;
  const gradeValue = gradeForPercentage(Number(percentage));

  if (summaryBox) {
    summaryBox.innerHTML = `
      <div class="mini-stat-card">
        <div class="mini-stat-icon purple"><i class="fa-solid fa-square-check"></i></div>
        <div class="mini-stat-info">
          <div class="mini-stat-number">${obtained}/${total}</div>
          <div class="mini-stat-label">Total Marks</div>
        </div>
      </div>
      <div class="mini-stat-card">
        <div class="mini-stat-icon blue"><i class="fa-solid fa-chart-line"></i></div>
        <div class="mini-stat-info">
          <div class="mini-stat-number">${percentage}%</div>
          <div class="mini-stat-label">Percentage</div>
        </div>
      </div>
      <div class="mini-stat-card">
        <div class="mini-stat-icon ${overallPass ? "green" : "orange"}">
          <i class="fa-solid ${overallPass ? "fa-circle-check" : "fa-triangle-exclamation"}"></i>
        </div>
        <div class="mini-stat-info">
          <div class="mini-stat-number">${overallPass ? "Pass" : "Review"}</div>
          <div class="mini-stat-label">Overall Result</div>
        </div>
      </div>
      <div class="mini-stat-card">
        <div class="mini-stat-icon purple"><i class="fa-solid fa-award"></i></div>
        <div class="mini-stat-info">
          <div class="mini-stat-number">${gradeValue}</div>
          <div class="mini-stat-label">Grade</div>
        </div>
      </div>
    `;
  }

  const commentBox = document.getElementById("resultCommentBox");
  if (commentBox) {
    commentBox.textContent = commentForPercentage(Number(percentage));
  }
}

// ==========================================================
// Attendance (reads students/{roll}/attendance/{yyyy-mm-dd}
// docs written by the teacher's Attendance page)
// ==========================================================
async function loadStudentAttendance(roll, month) {
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
    // Plain, unfiltered collection read — this needs no composite
    // index at all. Filtering by month and sorting happens below,
    // in JS, on the (small, per-student) result set. Attendance
    // docs are keyed by yyyy-mm-dd, so string comparison works.
    const snap = await getDocs(collection(db, "students", roll, "attendance"));

    const docsInMonth = snap.docs
      .filter((docSnap) => docSnap.id >= range.start && docSnap.id < range.end)
      .sort((a, b) => (a.id < b.id ? 1 : -1)); // newest first

    if (docsInMonth.length === 0) {
      showEmpty(emptyMsg, month + " ke liye abhi tak attendance record nahi hai.");
      return;
    }

    let present = 0;
    let absent = 0;
    let rows = "";

    docsInMonth.forEach((docSnap) => {
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
    showEmpty(emptyMsg, "Attendance load nahi ho paayi: " + error.message);
  }
}

// ==========================================================
// Notice Board (reads the top-level "notices" collection,
// same one notices.html on the admin side writes to)
// ==========================================================
async function loadStudentNotices() {
  const list = document.getElementById("noticesList");
  const emptyMsg = document.getElementById("noticesEmptyMsg");

  if (!list) return;

  list.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  try {
    const noticesQuery = query(collection(db, "notices"), orderBy("date", "desc"), limit(30));
    const snap = await getDocs(noticesQuery);

    if (snap.empty) {
      showEmpty(emptyMsg, "Abhi tak koi notice nahi hai.");
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
    showEmpty(emptyMsg, "Notices load nahi ho paayi: " + error.message);
  }
}

// ==========================================================
// Fee Status (reads classes/{classId} for the fee structure
// and students/{roll}/payments for this student's own payment
// history — same data admin's Fee Management page writes)
// ==========================================================
async function loadStudentFeeStatus(roll, student) {
  const summaryBox = document.getElementById("feeSummaryBox");
  const tableBody = document.getElementById("feeTableBody");
  const emptyMsg = document.getElementById("feeEmptyMsg");

  if (!summaryBox) return;

  summaryBox.innerHTML = "";
  if (tableBody) tableBody.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  try {
    const classSnap = student.class ? await getDoc(doc(db, "classes", student.class)) : null;
    const feeAmount = classSnap && classSnap.exists() ? Number(classSnap.data().feeAmount) || 0 : 0;
    const feeFrequency = classSnap && classSnap.exists() ? (classSnap.data().feeFrequency || "-") : "-";

    const paymentsSnap = await getDocs(
      query(collection(db, "students", roll, "payments"), orderBy("date", "desc"))
    );

    let totalPaid = 0;
    let rows = "";

    paymentsSnap.forEach((p) => {
      const pay = p.data();
      totalPaid += Number(pay.amount) || 0;
      const dateText = pay.date && pay.date.toDate
        ? pay.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";
      rows += `
        <tr>
          <td data-label="Date">${dateText}</td>
          <td data-label="Amount">₹${pay.amount}</td>
          <td data-label="Mode">${escapeHtml(pay.mode || "-")}</td>
          <td data-label="Note">${escapeHtml(pay.note || "-")}</td>
        </tr>
      `;
    });

    const balance = feeAmount - totalPaid;
    const statusBadge = !feeAmount
      ? `<span class="status-inactive">Fee not set</span>`
      : balance <= 0
        ? `<span class="status-active">Paid</span>`
        : `<span class="status-inactive">Due ₹${balance}</span>`;

    summaryBox.innerHTML = `
      <div class="fee-student-summary">
        <div class="fee-student-who">
          <strong>${escapeHtml(student.name || "-")}</strong>
          <span>${escapeHtml(student.class || "-")} · Roll ${escapeHtml(roll)}</span>
        </div>
        <div class="fee-student-amounts">
          <span>Fee: ₹${feeAmount || 0} / ${escapeHtml(feeFrequency)}</span>
          <span>Paid: ₹${totalPaid}</span>
          ${statusBadge}
        </div>
      </div>
    `;

    if (tableBody) {
      tableBody.innerHTML = rows || `<tr><td colspan="4">Abhi koi payment record nahi hai.</td></tr>`;
    }

  } catch (error) {
    console.error(error);
    if (emptyMsg) showEmpty(emptyMsg, "Fee status load nahi ho paayi: " + error.message);
  }
}

function showEmpty(emptyMsg, text) {
  if (emptyMsg) {
    emptyMsg.style.display = "block";
    emptyMsg.textContent = text;
  }
}

// ==========================================================
// Sidebar hamburger + backdrop (same behaviour as admin.js,
// duplicated here so student pages don't need to load the
// full staff admin.js bundle)
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
