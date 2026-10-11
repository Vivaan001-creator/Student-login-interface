import { db } from "./Firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================================================
// Session guard - supports EITHER session type that can land on
// this page: a student's own login (studentLoggedIn/studentRoll)
// or a parent's login (parentLoggedIn/parentActiveRoll, set by
// parent.js - parentActiveRoll is whichever child is currently
// selected on the Parent Dashboard's child switcher).
//
// This page is intentionally shared rather than duplicated per
// role - same Firestore reads, same print layout either way.
// ==========================================================
const isParentSession = localStorage.getItem("parentLoggedIn") === "true";
const isStudentSession = localStorage.getItem("studentLoggedIn") === "true";

if (!isParentSession && !isStudentSession) {
  alert("Session Expired. Please Login Again.");
  window.location.href = "login.html";
  throw new Error("Not Logged In");
}

const roll = isParentSession
  ? localStorage.getItem("parentActiveRoll")
  : localStorage.getItem("studentRoll");

if (!roll) {
  alert("Session Expired. Please Login Again.");
  window.location.href = isParentSession ? "parent-login.html" : "student-login.html";
  throw new Error("Roll Missing");
}

// ==========================================================
// Grading helpers - identical boundaries/wording to student.js
// so the dashboard and this print page always agree.
// ==========================================================

const classSubjects = {

"Nursery": [
        "English",
        "Math",
        "Hindi",
        "Rhymes",
        "G.K",
    ],

  "L.K.G": [
        "English",
        "Math",
        "Hindi",
        "Rhymes",
        "G.K",
    ],

  "U.K.G": [
        "English",
        "Math",
        "Hindi",
        "Rhymes",
        "G.K",
    ],
  
    "1": [
        "Science",
        "Social Studies",
        "Hindi",
        "English",
        "Math"
    ],

    "2": [
        "Science",
        "Social Studies",
        "Hindi",
        "English",
        "Math"
    ],

    "3": [
        "Science",
        "Social Studies",
        "Hindi",
        "English",
        "Math"
    ],

    "4": [
        "Science",
        "Social Studies",
        "Hindi",
        "English",
        "Math"
    ],

    "5": [
        "Science",
        "Social Studies",
        "Hindi",
        "English",
        "Math"
    ],

    "6": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ],

  "7": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
    ],

  
  "8": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ],

  "9": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ],

  "10": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ]

};

const lowerClassKeys = ["nursery", "l.k.g", "u.k.g"];

function isLowerClass(classValue) {
  const key = (classValue || "").toLowerCase().replace(/^class\s*/, "").trim();
  return lowerClassKeys.includes(key);
}

// classSubjects above uses keys like "Nursery"/"1", while
// student.class can be stored as "Class 1", "class 1", "1", etc.
// Normalize both sides the same way (used to be missing - this is
// what let stray metadata fields on the result document render as
// if they were subjects, see getSubjectsForClass()).
const classSubjectsNormalized = {};
Object.keys(classSubjects).forEach((k) => {
  const normKey = k.toLowerCase().replace(/^class\s*/, "").trim();
  classSubjectsNormalized[normKey] = classSubjects[k];
});

function getSubjectsForClass(classValue) {
  const key = (classValue || "").toLowerCase().replace(/^class\s*/, "").trim();
  return classSubjectsNormalized[key] || null;
}

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

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ==========================================================
// Month list - same list student.js uses for the dashboard,
// kept here too since this page must work stand-alone even if
// nothing set a "selected month" before navigating in.
// ==========================================================
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS = [
  "June 2026", "July 2026", "August 2026", "September 2026", "October 2026",
  "November 2026", "December 2026", "January 2027", "February 2027", "March 2027",
  "April 2027", "May 2027", "June 2027", "July 2027", "August 2027", "September 2027",
  "October 2027", "November 2027", "December 2027", "January 2028"
];

function currentMonthLabel() {
  const now = new Date();
  const label = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  return MONTHS.includes(label) ? label : MONTHS[0];
}

// ==========================================================
// DOM refs
// ==========================================================
const tableBody = document.getElementById("marksTableBody");
const monthLabel = document.getElementById("monthLabel");

// The month was already chosen on the dashboard (Results tab) -
// this page just shows that month's result, it doesn't offer a
// second place to change it. Falls back to the current month only
// if someone opens this page directly without going through the
// dashboard first.
function resolveMonth() {
  const stored = localStorage.getItem("selectedMonth");
  return stored && MONTHS.includes(stored) ? stored : currentMonthLabel();
}

let student = null;

async function init() {
  let studentSnap;

  try {
    studentSnap = await getDoc(doc(db, "students", roll));
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-row">Could not load data: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!studentSnap.exists()) {
    alert("Student data not found.");
    window.location.href = isParentSession ? "parent-login.html" : "student-login.html";
    return;
  }

  student = studentSnap.data();

  document.getElementById("studentName").textContent = student.name || "-";
  document.getElementById("studentRoll").textContent = roll;
  document.getElementById("studentClass").textContent = student.class || "-";
  document.getElementById("fatherName").textContent = student.father || "-";
  document.getElementById("studentSection").textContent = student.section || "-";
  document.getElementById("attendance").textContent = (student.attendance || "0") + "%";

  const month = resolveMonth();
  monthLabel.textContent = month;
  await loadResult(month);
}

async function loadResult(month) {
  tableBody.innerHTML = `<tr><td colspan="5" class="empty-row">Loading...</td></tr>`;
  document.getElementById("totalMarks").textContent = "-";
  document.getElementById("percentage").textContent = "-";
  document.getElementById("grade").textContent = "-";
  document.getElementById("comment").textContent = "-";

  if ((student.publishStatus || "unpublished") !== "published") {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-row">The result has not been published yet.</td></tr>`;
    return;
  }

  let resultSnap;
  try {
    resultSnap = await getDoc(doc(db, "students", roll, "results", month));
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-row">Could not load result: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!resultSnap.exists()) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-row">The result for ${escapeHtml(month)} has not been uploaded yet.</td></tr>`;
    return;
  }

  const data = resultSnap.data();

  // BUG FIX: this used to be Object.entries(data), which rendered
  // EVERY field stored on the result document as if it were a
  // subject - including bookkeeping fields the teacher's marks-entry
  // page also saves on the same doc (updatedBy, updatedAt,
  // studentRoll, etc). A Firestore Timestamp shown as "marks" is
  // where the huge garbled numbers in the total/percentage came
  // from. Now we only ever look up the real subjects for this
  // student's class (same list classes.html / teacher-marks.html
  // use), in the correct fixed order, defaulting to 0 for any
  // subject not yet entered.
  const validSubjectNames = getSubjectsForClass(student.class);
  const subjects = validSubjectNames
    ? validSubjectNames.map((s) => [s, data[s] !== undefined ? data[s] : 0])
    : Object.entries(data).filter(([key]) =>
        !["updatedBy", "updatedAt", "studentRoll", "publishedAt", "publishedBy", "publishStatus"].includes(key)
      );

  if (subjects.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-row">No subject marks found for ${escapeHtml(month)}.</td></tr>`;
    return;
  }

  const lower = isLowerClass(student.class);
  const maxMarks = lower ? 50 : 60;
  const passMarks = lower ? 17 : 20;

  let total = 0;
  let obtained = 0;
  let rows = "";

  subjects.forEach(([subject, marks]) => {
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
        <td data-label="Status"><span class="${passed ? "status-pass" : "status-fail"}">${passed ? "Pass" : "Fail"}</span></td>
      </tr>
    `;
  });

  tableBody.innerHTML = rows;

  const percentage = total > 0 ? ((obtained / total) * 100).toFixed(2) : "0.00";

  document.getElementById("totalMarks").textContent = `${obtained} / ${total}`;
  document.getElementById("percentage").textContent = `${percentage}%`;
  document.getElementById("grade").textContent = gradeForPercentage(Number(percentage));
  document.getElementById("comment").textContent = commentForPercentage(Number(percentage));
}

init();

// ==========================================================
// Header actions
// ==========================================================
function printResult() {
  window.print();
}

function downloadPDF() {
  window.print();
}

function logoutStudent() {
  if (isParentSession) {
    localStorage.removeItem("parentLoggedIn");
    localStorage.removeItem("parentContact");
    localStorage.removeItem("parentActiveRoll");
    window.location.replace("parent-login.html");
  } else {
    localStorage.removeItem("studentLoggedIn");
    localStorage.removeItem("studentRoll");
    window.location.replace("student-login.html");
  }
}

function goToDashboard() {
  window.location.href = isParentSession ? "parent-dashboard.html" : "student-dashboard.html";
}

window.printResult = printResult;
window.downloadPDF = downloadPDF;
window.logoutStudent = logoutStudent;
window.goToDashboard = goToDashboard;

// Stops the browser back button from re-showing a cached result
// after logout.
history.pushState(null, null, location.href);
window.addEventListener("popstate", function () {
  history.pushState(null, null, location.href);
});
