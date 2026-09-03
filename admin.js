import { db, storage, auth } from "./Firebase.js";

import {
signInWithEmailAndPassword,
signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  collection,
  collectionGroup,
  getDocs,
  getCountFromServer,
  addDoc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

import {
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    createUserWithEmailAndPassword,
    getAuth
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { generateBillingPeriods, allocateDueStatus, findClassDoc, isPaymentVerified } from "./fee-utils.js?v=3";

// ==========================
// Create a Teacher's Login Account
// (uses a secondary Firebase app instance so creating the
// account does not sign the admin out of their own session)
// ==========================

function getSecondaryAuthInstance() {

    const primaryApp = getApp();

    const secondaryApp =
        getApps().find(a => a.name === "Secondary") ||
        initializeApp(primaryApp.options, "Secondary");

    return getAuth(secondaryApp);

}

async function createTeacherLoginAccount(email, password) {

    const secondaryAuth = getSecondaryAuthInstance();

    const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
    );

    await signOut(secondaryAuth);

    return credential.user.uid;

}


// ==========================
// Default Admin Password
// ==========================


// ==========================
// Admin Login
// ==========================

async function adminLogin() {

    

    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    

    try {

        await signInWithEmailAndPassword(auth, email, password);

        // Login tracking — same record admin can review on the Login Activity
        // page, plus this account's own last-login (no per-admin Firestore
        // doc exists, so a small singleton doc holds it).
        try {
            // Capture the PREVIOUS login time before we overwrite it.
            const prevSnap = await getDoc(doc(db, "appMeta", "adminLogin"));
            const prevData = prevSnap.exists() ? prevSnap.data() : null;
            const previousLogin = prevData && prevData.lastLogin
                ? (prevData.lastLogin.toDate ? prevData.lastLogin.toDate().toISOString() : new Date(prevData.lastLogin).toISOString())
                : "";
            sessionStorage.setItem("previousLogin", previousLogin);

            await addDoc(collection(db, "loginLogs"), {
                role: "admin",
                refId: "admin",
                name: "Admin",
                timestamp: serverTimestamp()
            });
            await setDoc(doc(db, "appMeta", "adminLogin"), {
                lastLogin: serverTimestamp(),
                loginCount: increment(1)
            }, { merge: true });
        } catch (logErr) {
            console.error("Login tracking failed:", logErr);
        }

        sessionStorage.setItem("adminLoggedIn","true");


window.location.href="dashboard.html";

    } catch (error) {

        alert(error.code);
        alert(error.message);

    }

}

window.adminLogin = adminLogin;

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        await adminLogin();
    });
}


// ==========================
// Dashboard Security
// ==========================

const page = location.pathname;

if (

    page.includes("dashboard.html") ||
    page.includes("students.html") ||
    page.includes("edit-student.html") ||
    page.includes("add-student.html") ||
    page.includes("change-password.html") ||
    page.includes("teachers.html") ||
    page.includes("add-teacher.html") ||
    page.includes("edit-teacher.html") ||
    page.includes("teacher-profile.html") ||
    page.includes("school-profile.html") ||
    page.includes("classes.html") ||
    page.includes("marks-management.html") ||
    page.includes("publish-result.html") ||
    page.includes("notices.html") ||
    page.includes("gallery-management.html") ||
    page.includes("fee-management.html") ||
    page.includes("attendance-overview.html") ||
    page.includes("login-activity.html")
) {

    if (sessionStorage.getItem("adminLoggedIn") !== "true") {
        window.location.replace("admin.html");
    }

}

// ==========================
// Logout
// ==========================

async function adminLogout() {

    try {

        await signOut(auth);

        sessionStorage.clear();
        localStorage.removeItem("editRoll");
        localStorage.removeItem("editTeacherId");
        localStorage.removeItem("profileTeacherId");

        window.location.replace("admin.html");

    } catch (error) {

        alert(error.message);

    }

}

window.adminLogout = adminLogout;


// ==========================
// Console Test
// ==========================



// ==========================
// Student List
// ==========================



// ==========================
// Student Table
// ==========================
const tableBody = document.getElementById("studentTable");

if (tableBody) {

    loadStudentTable();

}

async function loadStudentTable() {

    tableBody.innerHTML = `<tr><td colspan="5">Loading students...</td></tr>`;

    const snapshot = await getDocs(
        collection(db, "students")
    );

    if (snapshot.empty) {

        tableBody.innerHTML = `<tr><td colspan="5">Abhi tak koi student add nahi hua hai. "Add New Student" par click karke shuru karein.</td></tr>`;

    } else {

        let rowsHtml = "";
        let index = 0;

        snapshot.forEach((docSnap) => {

            const student = docSnap.data();
            const classLabel = student.section
                ? `${student.class || "-"} · ${student.section}`
                : (student.class || "-");

            rowsHtml += `
              <tr style="animation-delay:${(index * 0.05).toFixed(2)}s">
                <td data-label="Roll No">${escapeHtmlAdmin(docSnap.id)}</td>
                <td data-label="Name">${escapeHtmlAdmin(student.name || "-")}</td>
                <td data-label="Father's Name">${escapeHtmlAdmin(student.father || "-")}</td>
                <td data-label="Class">${escapeHtmlAdmin(classLabel)}</td>
                <td data-label="Action">
                  <div class="action-btns">
                    <button class="btn-edit" onclick="editStudent('${docSnap.id}')">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="deleteStudent('${docSnap.id}')">
                      <i class="fa-solid fa-trash"></i> Delete
                    </button>
                  </div>
                </td>
              </tr>
            `;

            index++;

        });

        tableBody.innerHTML = rowsHtml;

    }

    // Live summary stats (Total / Boys / Girls / Classes represented)
    const totalBox = document.getElementById("totalStudents");
    const boysBox = document.getElementById("totalBoys");
    const girlsBox = document.getElementById("totalGirls");
    const classesBox = document.getElementById("totalStudentClasses");

    let boys = 0, girls = 0;
    const classSet = new Set();

    snapshot.forEach((docSnap) => {
        const s = docSnap.data();
        if (s.gender === "Male") boys++;
        else if (s.gender === "Female") girls++;
        if (s.class) classSet.add(classKeyNormalized(s.class));
    });

    if (totalBox) animateCountUp(totalBox, snapshot.size);
    if (boysBox) animateCountUp(boysBox, boys);
    if (girlsBox) animateCountUp(girlsBox, girls);
    if (classesBox) animateCountUp(classesBox, classSet.size);

}


// ==========================
// Edit Student
// ==========================

function editStudent(roll) {

    localStorage.setItem("editRoll", roll);

    window.location.href = "edit-student.html";

}

window.editStudent = editStudent;

// ==========================
// Class Subjects
// ==========================

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

// ==========================
// Load Student 
// ==========================
async function loadStudent() {

    const editRoll = localStorage.getItem("editRoll");

    if (!editRoll) return;

    const studentRef = doc(db, "students", editRoll);

    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        alert("Student not found");
        return;
    }

    const student = studentSnap.data();

    localStorage.setItem("studentClass", student.class);

    const rollField = document.getElementById("roll");
    if (rollField) rollField.value = editRoll;

    document.getElementById("studentName").value = student.name || "";
    document.getElementById("fatherName").value = student.father || "";
    document.getElementById("attendance").value = student.attendance || "";

    const motherField = document.getElementById("motherName");
    if (motherField) motherField.value = student.mother || "";

    const classField = document.getElementById("studentClass");
    if (classField) classField.value = student.class || "";

    const sectionField = document.getElementById("section");
    if (sectionField) sectionField.value = student.section || "";

    const dobField = document.getElementById("dob");
    if (dobField) dobField.value = student.dob || "";

    const genderField = document.getElementById("gender");
    if (genderField) genderField.value = student.gender || "";

    const contactField = document.getElementById("contactNumber");
    if (contactField) contactField.value = student.contactNumber || "";

    const addressField = document.getElementById("address");
    if (addressField) addressField.value = student.address || "";

    const admissionField = document.getElementById("admissionDate");
    if (admissionField) admissionField.value = student.admissionDate || "";

    const previousSchoolField = document.getElementById("previousSchool");
    if (previousSchoolField) previousSchoolField.value = student.previousSchool || "";

    // BUG FIX: edit-student.html no longer has a #month select or
    // #marksEditor (marks entry now lives on teacher-marks.html), so
    // this used to crash here with "Cannot read properties of null"
    // every time this page loaded — which also silently broke
    // saveStudent() below since the crash happened before any of
    // the form fields could be edited/saved.
    const monthSelect = document.getElementById("month");
    if (monthSelect) {
        loadMonths();
        monthSelect.value = "June 2026";
        loadSubjects(student);
        await loadMarksFromFirestore(editRoll, monthSelect.value);
        monthSelect.addEventListener("change", async function () {
            await loadMarksFromFirestore(editRoll, this.value);
        });
    }

}

// (Student count for the dashboard card is now handled once,
// in the consolidated loadDashboardStats() further below —
// this used to be a second, separate writer to the same
// #studentCount element, racing with two others.)

// ==========================
// Load Months
// ==========================

function loadMonths() {

    const month = document.getElementById("month");

    if (!month) return;

    month.innerHTML = "";

    const months = [
        "June 2026",
        "July 2026",
        "August 2026",
        "September 2026",
        "October 2026",
        "November 2026",
        "December 2026",
        "January 2027",
        "February 2027",
        "March 2027",
        "April 2027",
        "May 2027",
        "June 2027",
        "July 2027",
        "August 2027",
        "September 2027",
        "October 2027",
        "November 2027",
        "December 2027",
        "January 2028"
    ];

    months.forEach(item => {

        const option = document.createElement("option");

        option.value = item;

        option.textContent = item;

        month.appendChild(option);

    });

}

window.loadMonths = loadMonths;
if (window.location.pathname.includes("edit-student.html")) {
    loadStudent();
}

function loadSubjects(student) {

    const marksEditor = document.getElementById("marksEditor");

    if (!marksEditor) return;

    const subjects = classSubjects[student.class];

    marksEditor.innerHTML = "";

    subjects.forEach(subject => {

    const lowerClasses = [
        "Nursery",
        "L.K.G",
        "U.K.G"
    ];

    const maxMarks =
        lowerClasses.includes(student.class)
        ? 50
        : 60;

    const passMarks =
        lowerClasses.includes(student.class)
        ? 17
        : 20;

    marksEditor.innerHTML += `
    <div class="subject-row">

        <label>
            ${subject}
            <br>
            <small>
                Max : ${maxMarks}
                &nbsp;&nbsp;
                Pass : ${passMarks}
            </small>
        </label>

        <input
            type="number"
            min="0"
            max="${maxMarks}"
            value="0">

    </div>
    `;
});
}
async function loadMarksFromFirestore(roll, month) {

    const resultRef = doc(db, "students", roll, "results", month);

    const resultSnap = await getDoc(resultRef);

    if (!resultSnap.exists()) return;

    const data = resultSnap.data();

    const inputs =
        document.querySelectorAll("#marksEditor input");

    const labels =
        document.querySelectorAll("#marksEditor label");

    labels.forEach((label, index) => {

        const subject =
            label.childNodes[0].textContent.trim();

        if (data[subject] !== undefined) {

            inputs[index].value = data[subject];

        }

    });

}

async function saveStudent() {

    const roll = localStorage.getItem("editRoll");

    const classField = document.getElementById("studentClass");
    const studentClass = classField && classField.value
        ? classField.value
        : localStorage.getItem("studentClass");

    const studentData = {

        name: document.getElementById("studentName").value,
        father: document.getElementById("fatherName").value,
        mother: document.getElementById("motherName")?.value || "",
        class: studentClass,
        section: document.getElementById("section")?.value || "",
        dob: document.getElementById("dob")?.value || "",
        gender: document.getElementById("gender")?.value || "",
        contactNumber: document.getElementById("contactNumber")?.value || "",
        address: document.getElementById("address")?.value || "",
        admissionDate: document.getElementById("admissionDate")?.value || "",
        previousSchool: document.getElementById("previousSchool")?.value || "",
        attendance: document.getElementById("attendance").value

        // Note: publishStatus is no longer set from here — each
        // teacher now publishes/unpublishes a student's result
        // themselves from the marks entry screen (teacher.js).
        //
        // BUG FIX: this used to also read document.getElementById("month").value
        // right here, before the try block even started. edit-student.html no
        // longer has a #month select (marks entry moved to teacher-marks.html),
        // so that line threw "Cannot read properties of null" on every single
        // click — before any alert, before any Firestore call. That's why Save
        // Changes looked like it did nothing at all. The duplicate marks/results
        // write further down (which relied on the same missing #month and
        // #marksEditor elements) has been removed for the same reason — marks
        // are saved from teacher-marks.html now, not from here.

    };

    // Keep localStorage in sync in case the class was changed here.
    localStorage.setItem("studentClass", studentClass);

    try {

        await setDoc(
            doc(db, "students", roll),
            studentData,
            { merge: true }
        );

        alert("Student data saved successfully.");

    } catch (error) {

        alert(error.message);
        console.error(error);

    }

}

window.saveStudent = saveStudent;

function searchStudent() {

    const input =
        document.getElementById("searchStudent")
        .value.toLowerCase();

    const rows =
        document.querySelectorAll("#studentTable tr");

    rows.forEach(row => {

        if (!row.cells || row.cells.length < 2) return;

        // Search across every column except the last (Action buttons)
        const searchable = Array.from(row.cells)
            .slice(0, -1)
            .map(td => td.textContent.toLowerCase())
            .join(" ");

        row.style.display = searchable.includes(input) ? "" : "none";

    });

}

window.searchStudent = searchStudent;


// ===== Add Student (Firebase) =====
async function addStudent() {
  try {
    const roll = document.getElementById("roll").value.trim();
    const name = document.getElementById("studentName").value.trim();
    const father = document.getElementById("fatherName").value.trim();
    const mother = document.getElementById("motherName")?.value.trim() || "";
    const studentClass = document.getElementById("studentClass").value;
    const section = document.getElementById("section")?.value || "";
    const dob = document.getElementById("dob")?.value.trim() || "";
    const gender = document.getElementById("gender")?.value || "";
    const contactNumber = document.getElementById("contactNumber")?.value.trim() || "";
    const address = document.getElementById("address")?.value.trim() || "";
    const admissionDate = document.getElementById("admissionDate")?.value.trim() || "";
    const previousSchool = document.getElementById("previousSchool")?.value.trim() || "";

    if (!roll || !name || !father || !mother || !studentClass || !section || !dob || !gender) {
      alert("Please fill all required fields (marked with *).");
      return;
    }

    const studentRef = doc(db, "students", roll);
    const studentSnap = await getDoc(studentRef);

    if (studentSnap.exists()) {
      alert("Roll Number already exists.");
      return;
    }

    await setDoc(studentRef, {
      name,
      father,
      mother,
      class: studentClass,
      section,
      dob,
      gender,
      contactNumber,
      address,
      admissionDate,
      previousSchool,
      attendance: "0",
      publishStatus: "unpublished"
    });

    alert("Student Added Successfully");
    window.location.href = "students.html";

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

window.addStudent = addStudent;

// ===== UI-only helpers (do not touch Firebase logic above) =====
document.addEventListener('DOMContentLoaded', function () {

  // ===== Sidebar collapse / expand (hamburger drawer) =====
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('expanded');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function () {
      sidebar.classList.toggle('expanded');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active');
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeSidebar);
  }

  // ===== Sidebar submenu toggles (Students, Teachers, or any future group) =====
  // Works for any number of .nav-parent buttons, each paired with the
  // .submenu that immediately follows it in the markup.
  document.querySelectorAll('.nav-parent').forEach(function (toggleBtn) {
    const submenu = toggleBtn.nextElementSibling;
    if (!submenu || !submenu.classList.contains('submenu')) return;

    toggleBtn.addEventListener('click', function () {
      toggleBtn.classList.toggle('expanded');
      submenu.classList.toggle('collapsed');
      const chevron = toggleBtn.querySelector('.chevron');
      if (chevron) {
        chevron.style.transform = submenu.classList.contains('collapsed')
          ? 'rotate(180deg)'
          : 'rotate(0deg)';
      }
    });
  });

  // ===== Add Student page: photo upload preview =====
  const photoUpload = document.getElementById('photoUpload');
  const uploadFilename = document.getElementById('uploadFilename');

  if (photoUpload && uploadFilename) {
    photoUpload.addEventListener('change', function () {
      if (photoUpload.files && photoUpload.files[0]) {
        uploadFilename.textContent = 'Selected: ' + photoUpload.files[0].name;
      } else {
        uploadFilename.textContent = '';
      }
    });
  }

  // ===== Cancel button resets the form (Add Student page) =====
  const form = document.getElementById('studentForm');
  const cancelBtn = form ? form.querySelector('.btn-secondary') : null;
  if (cancelBtn && form) {
    cancelBtn.addEventListener('click', function () {
      form.reset();
      if (uploadFilename) uploadFilename.textContent = '';
    });
  }
});

async function deleteStudent(roll) {

    const confirmDelete =
        confirm("Delete this student permanently?");

    if (!confirmDelete) return;

    try {

        await deleteDoc(doc(db, "students", roll));

        alert("Student Deleted Successfully");

        loadStudentTable();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}

window.deleteStudent = deleteStudent;

// ==========================
// Dashboard Statistics
//
// BUG FIX: this used to be THREE separate async functions
// (loadDashboardStats, loadSchoolStats, plus loadTeacherCount
// further below) all writing to the same #studentCount /
// #teacherCount / #classCount elements independently. Because
// each did its own network round trip, whichever one finished
// LAST won — and loadSchoolStats() always finished by hard-
// coding teacherCount to "0" and classCount to "13", no matter
// what the real data was. That's why Teacher count would
// briefly flash the real value (1) and then flip back to 0.
//
// Now there is exactly one function, one set of real Firestore
// counts, fetched in parallel, each written once.
// ==========================

// Small reusable count-up animation for any stat number element.
function animateCountUp(el, target) {
    if (!el) return;
    const finalValue = Number(target) || 0;
    const duration = 700;
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(finalValue * eased);
        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.textContent = finalValue;
        }
    }

    requestAnimationFrame(tick);
}
window.animateCountUp = animateCountUp;

async function loadDashboardStats() {

    const studentBox = document.getElementById("studentCount");
    const teacherBox = document.getElementById("teacherCount");
    const classBox = document.getElementById("classCount");
    const resultBox = document.getElementById("resultCount");

    // Only run this on a page that actually has at least one of
    // these cards (i.e. dashboard.html).
    if (!studentBox && !teacherBox && !classBox && !resultBox) return;

    try {

        const [studentSnap, teacherSnap, classSnap, publishedSnap] = await Promise.all([
            getCountFromServer(collection(db, "students")),
            getCountFromServer(collection(db, "teachers")),
            getCountFromServer(collection(db, "classes")),
            getCountFromServer(query(collection(db, "students"), where("publishStatus", "==", "published")))
        ]);

        if (studentBox) animateCountUp(studentBox, studentSnap.data().count);
        if (teacherBox) animateCountUp(teacherBox, teacherSnap.data().count);
        if (classBox) animateCountUp(classBox, classSnap.data().count);
        if (resultBox) animateCountUp(resultBox, publishedSnap.data().count);

    } catch (error) {
        console.error("Could not load dashboard stats:", error);
    }

}

loadDashboardStats();

// ==========================
// Admin's own last login (dashboard.html)
// ==========================
function loadAdminLastLogin() {
    const box = document.getElementById("dashLastLogin");
    if (!box) return;
    const previousLogin = sessionStorage.getItem("previousLogin");
    if (!previousLogin) {
        box.textContent = "First login";
        return;
    }
    const dt = new Date(previousLogin);
    box.textContent = dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
loadAdminLastLogin();

// ==========================
// Login Activity (login-activity.html) — every student, teacher
// and admin login, newest first. Also a small per-role summary.
// ==========================
async function loadLoginActivity() {
    const tableBody = document.getElementById("loginActivityTable");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4">Loading login activity...</td></tr>`;

    try {
        const q = query(collection(db, "loginLogs"), orderBy("timestamp", "desc"), limit(200));
        const snap = await getDocs(q);

        const totalBox = document.getElementById("totalLogins");
        const studentBox = document.getElementById("studentLoginCount");
        const teacherBox = document.getElementById("teacherLoginCount");
        const adminBox = document.getElementById("adminLoginCount");
        let studentCount = 0, teacherCount = 0, adminCount = 0;

        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="4">No login activity recorded yet.</td></tr>`;
            if (totalBox) totalBox.textContent = "0";
            if (studentBox) studentBox.textContent = "0";
            if (teacherBox) teacherBox.textContent = "0";
            if (adminBox) adminBox.textContent = "0";
            return;
        }

        tableBody.innerHTML = "";

        snap.forEach((docSnap) => {
            const log = docSnap.data();
            if (log.role === "student") studentCount++;
            else if (log.role === "teacher") teacherCount++;
            else if (log.role === "admin") adminCount++;

            const dt = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate() : null;
            const dtLabel = dt
                ? dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                : "Just now";

            const roleBadgeClass = log.role === "student" ? "status-active" : log.role === "teacher" ? "status-pending" : "status-admin";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td data-label="Role"><span class="${roleBadgeClass}">${escapeHtmlAdmin(log.role || "-")}</span></td>
                <td data-label="Name">${escapeHtmlAdmin(log.name || log.refId || "-")}</td>
                <td data-label="Details">${escapeHtmlAdmin(log.class ? "Class " + log.class : (log.subject || "-"))}</td>
                <td data-label="Date &amp; Time">${dtLabel}</td>
            `;
            tableBody.appendChild(row);
        });

        if (totalBox) totalBox.textContent = String(snap.size);
        if (studentBox) studentBox.textContent = String(studentCount);
        if (teacherBox) teacherBox.textContent = String(teacherCount);
        if (adminBox) adminBox.textContent = String(adminCount);

    } catch (error) {
        console.error("Could not load login activity:", error);
        tableBody.innerHTML = `<tr><td colspan="4">Could not load login activity.</td></tr>`;
    }
}
loadLoginActivity();

// ==========================
// Dashboard Clock
// ==========================

const dashboardClock =
    document.getElementById("dashboardClock");

if(dashboardClock){

    setInterval(()=>{

        dashboardClock.textContent =
            new Date().toLocaleString();

    },1000);

}


// ==========================
// Dashboard Loaded
// ==========================

window.addEventListener("load",()=>{

document.body.classList.add("loaded");

});

// ==========================
// Dashboard Date Time
// ==========================

const timeBox =
document.getElementById("liveDateTime");

if(timeBox){

setInterval(()=>{

const now=new Date();

timeBox.innerHTML=

now.toLocaleDateString()

+"<br>"+

now.toLocaleTimeString();

},1000);

}

// ==========================
// Add Teacher
// ==========================

async function addTeacher(){

    const teacherId =
        document.getElementById("teacherId")?.value.trim();

    const teacherName =
        document.getElementById("teacherName")?.value.trim();

    const teacherSubject =
        document.getElementById("teacherSubject").value;

    const teacherEmail =
        document.getElementById("teacherEmail").value.trim();

    const teacherPassword =
        document.getElementById("teacherPassword").value;

    if(
        !teacherId ||
        !teacherName ||
        !teacherSubject ||
        !teacherEmail ||
        !teacherPassword
    ){

        alert("Please fill all fields, including email and password (needed for Teacher Login).");

        return;

    }

    if (teacherPassword.length < 6) {
        alert("Password kam se kam 6 characters ka hona chahiye.");
        return;
    }

    try{

        // Create this teacher's login account using the exact
        // password the admin typed in the form.
        let authUid = null;

        try {
            authUid = await createTeacherLoginAccount(teacherEmail, teacherPassword);
        } catch (authError) {
            if (authError.code === "auth/email-already-in-use") {
                alert("Yeh email pehle se kisi account mein registered hai.");
                return;
            }
            console.error("Could not create teacher login account:", authError);
            alert(authError.message);
            return;
        }

        await setDoc(

            doc(db,"teachers",teacherId),

            {

    name:teacherName,

    subject:teacherSubject,

    phone:
document.getElementById("teacherPhone").value.trim(),

    email: teacherEmail,

    qualification:
document.getElementById("teacherQualification").value.trim(),

    experience:
Number(
document.getElementById("teacherExperience").value
),

    status:
document.getElementById("teacherStatus").value,

    // BUG FIX: the form has Address, Date of Joining, Date of
    // Birth and Gender fields, but none of these were ever saved —
    // they were collected on screen and then silently discarded.
    address:
document.getElementById("teacherAddress")?.value.trim() || "",

    joiningDate:
document.getElementById("teacherJoiningDate")?.value || "",

    dob:
document.getElementById("teacherDob")?.value || "",

    gender:
document.getElementById("teacherGender")?.value || "",

    // BUG FIX: employeeId was never set at creation, so a brand
    // new teacher's profile showed a blank Employee ID until
    // someone opened Edit Profile and typed one in manually.
    // Defaulting it to the Teacher ID means it's correct from
    // the moment the teacher is added.
    employeeId: teacherId,

    role: "teacher",

    ...(authUid ? { authUid } : {})

            },

            { merge: true }

        );

        alert("Teacher Added Successfully. Yeh teacher ab isi email/password se login kar sakta hai.");

        window.location.href="teachers.html";

    }

    catch(error){

        console.error(error);

        alert(error.message);

    }

}

window.addTeacher=addTeacher;



// ==========================
// Load Teacher Table
// ==========================

const teacherTable =
document.getElementById("teacherTable");

if(teacherTable){

    loadTeacherTable();

}

async function loadTeacherTable(){

    teacherTable.innerHTML = `<tr><td colspan="6">Loading teachers...</td></tr>`;

    const snapshot = await getDocs(
        collection(db,"teachers")
    );

    if (snapshot.empty) {

        teacherTable.innerHTML = `<tr><td colspan="6">Abhi tak koi teacher add nahi hua hai. "Add New Teacher" par click karke shuru karein.</td></tr>`;

    } else {

        let rowsHtml = "";
        let index = 0;

        snapshot.forEach((docSnap) => {

            const teacher = docSnap.data();
            const statusClass = teacher.status === "Active" ? "status-active" : "status-inactive";

            rowsHtml += `
              <tr style="animation-delay:${(index * 0.05).toFixed(2)}s">
                <td data-label="Teacher ID">${escapeHtmlAdmin(docSnap.id)}</td>
                <td data-label="Name">${escapeHtmlAdmin(teacher.name || "-")}</td>
                <td data-label="Subject">${escapeHtmlAdmin(teacher.subject || "-")}</td>
                <td data-label="Status"><span class="${statusClass}">${escapeHtmlAdmin(teacher.status || "-")}</span></td>
                <td data-label="Phone">${escapeHtmlAdmin(teacher.phone || "-")}</td>
                <td data-label="Action">
                  <div class="action-btns">
                    <button class="btn-view" onclick="viewTeacher('${docSnap.id}')">
                      <i class="fa-regular fa-eye"></i> View
                    </button>
                    <button class="btn-edit" onclick="editTeacher('${docSnap.id}')">
                      <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="deleteTeacher('${docSnap.id}')">
                      <i class="fa-solid fa-trash"></i> Delete
                    </button>
                  </div>
                </td>
              </tr>
            `;

            index++;

        });

        teacherTable.innerHTML = rowsHtml;

    }

    // Live summary stats (Total / Active / On Leave / Subjects covered)
    const totalBox = document.getElementById("totalTeachers");
    const activeBox = document.getElementById("totalActiveTeachers");
    const leaveBox = document.getElementById("totalOnLeaveTeachers");
    const subjectsBox = document.getElementById("totalSubjects");

    let active = 0, onLeave = 0;
    const subjectSet = new Set();

    snapshot.forEach((docSnap) => {
        const t = docSnap.data();
        if (t.status === "Active") active++;
        if (t.status === "On Leave") onLeave++;
        if (t.subject) subjectSet.add(t.subject);
    });

    if (totalBox) animateCountUp(totalBox, snapshot.size);
    if (activeBox) animateCountUp(activeBox, active);
    if (leaveBox) animateCountUp(leaveBox, onLeave);
    if (subjectsBox) animateCountUp(subjectsBox, subjectSet.size);

}


// ==========================
// View Teacher
// ==========================
function viewTeacher(id){

    localStorage.setItem(
        "profileTeacherId",
        id
    );

    window.location.href =
    "teacher-profile.html";

}

window.viewTeacher = viewTeacher;

// ==========================
// Edit Teacher
// ==========================

function editTeacher(id){

    localStorage.setItem(
        "editTeacherId",
        id
    );

    window.location.href =
    "edit-teacher.html";

}

window.editTeacher = editTeacher;

// ==========================
// Delete Teacher
// ==========================

async function deleteTeacher(id){

    const confirmDelete=

    confirm("Delete this Teacher?");

    if(!confirmDelete) return;

    try{

        await deleteDoc(

            doc(db,"teachers",id)

        );

        alert("Teacher Deleted.");

        loadTeacherTable();

    }

    catch(error){

        alert(error.message);

    }

}

window.deleteTeacher=deleteTeacher;


// ==========================
// Load Teacher
// ==========================

async function loadTeacher(){

    const id =
        localStorage.getItem(
            "editTeacherId"
        );

    if(!id) return;

    const teacherRef =
        doc(db,"teachers",id);

    const teacherSnap =
        await getDoc(teacherRef);

    if(!teacherSnap.exists()){

        alert("Teacher Not Found");

        return;

    }

    const teacher =
        teacherSnap.data();

  
    document.getElementById("teacherName").value =
        teacher.name || "";

    document.getElementById("teacherSubject").value =
        teacher.subject || "";

    document.getElementById("teacherPhone").value =
        teacher.phone || "";

    document.getElementById("teacherEmail").value =
        teacher.email || "";

    document.getElementById("teacherQualification").value =
        teacher.qualification || "";

    document.getElementById("teacherExperience").value =
        teacher.experience || "";

    document.getElementById("teacherStatus").value =
        teacher.status || "Active";

}

if(
window.location.pathname.includes(
"edit-teacher.html"
)
){

    loadTeacher();

}


// ==========================
// Search Teacher
// ==========================

function searchTeacher(){

    const keyword =
    document.getElementById("searchTeacher")
    ?.value.toLowerCase() || "";

    const rows =
    document.querySelectorAll("#teacherTable tr");

    rows.forEach(row => {

        if (!row.cells || row.cells.length < 2) return;

        // Search across every column except the last (Action buttons)
        const searchable = Array.from(row.cells)
            .slice(0, -1)
            .map(td => td.textContent.toLowerCase())
            .join(" ");

        row.style.display = searchable.includes(keyword) ? "" : "none";

    });

}

window.searchTeacher = searchTeacher;


// ==========================
// School Profile
// ==========================

async function saveSchoolProfile(){

const profile = {

    schoolName:
    document.getElementById("schoolName").value.trim(),

    principalName:
    document.getElementById("principalName").value.trim(),

    schoolAddress:
    document.getElementById("schoolAddress").value.trim(),

    schoolPhone:
    document.getElementById("schoolPhone").value.trim(),

    schoolEmail:
    document.getElementById("schoolEmail").value.trim(),

    schoolWebsite:
    document.getElementById("schoolWebsite").value.trim(),

};
      

    try{

        await setDoc(

            doc(db,"settings","schoolProfile"),

            profile

        );

        alert("School Profile Saved Successfully");

    }

    catch(error){

        alert(error.message);

    }

}

window.saveSchoolProfile=saveSchoolProfile;


async function loadSchoolProfile(){

    if(
        !location.pathname.includes("school-profile.html")
    ) return;

    const profileRef=
        doc(db,"settings","schoolProfile");

    const profileSnap=
        await getDoc(profileRef);

    if(!profileSnap.exists()) return;

    const data = profileSnap.data();

document.getElementById("schoolName").value =
data.schoolName || "";

document.getElementById("principalName").value =
data.principalName || "";

document.getElementById("schoolAddress").value =
data.schoolAddress || "";

document.getElementById("schoolPhone").value =
data.schoolPhone || "";

document.getElementById("schoolEmail").value =
data.schoolEmail || "";

document.getElementById("schoolWebsite").value =
data.schoolWebsite || "";

}



loadSchoolProfile();

// ==========================
// Show School Name
// ==========================

async function showSchoolName(){

    const schoolTitle =
        document.getElementById("schoolTitle");

    if(!schoolTitle) return;

    try{

        const profileSnap =
            await getDoc(
                doc(db,"settings","schoolProfile")
            );

        if(profileSnap.exists()){

            schoolTitle.textContent =
                profileSnap.data().schoolName;

          
        }

    }

    catch(error){

        console.error(error);

    }

}

showSchoolName();


// (Teacher count for the dashboard card is now handled once,
// inside the consolidated loadDashboardStats() above — this
// used to be a third, separate writer to #teacherCount.)

// ==========================
// Save Teacher Profile Details
// ==========================

async function saveTeacherProfileDetails(){

const id =
localStorage.getItem("editTeacherId");

if(!id){

alert("Teacher ID Not Found");

return;

}

await setDoc(
doc(db,"teachers",id),
{

designation:document.getElementById("profileDesignation").value,

department:document.getElementById("profileDepartment").value,

employeeId:document.getElementById("profileEmployeeId").value,

joiningDate:document.getElementById("profileJoiningDate").value,

summary:document.getElementById("profileSummary").value,

graduation:document.getElementById("profileGraduation").value,

postGraduation:document.getElementById("profilePostGraduation").value,

bed:document.getElementById("profileBed").value,

ctet:document.getElementById("profileCTET").value,

otherQualification:document.getElementById("profileOtherQualification").value,

currentSchool:document.getElementById("profileCurrentSchool").value,

previousSchool:document.getElementById("profilePreviousSchool").value,

achievement:document.getElementById("profileAchievement").value,

responsibility1:document.getElementById("responsibility1").value,

responsibility2:document.getElementById("responsibility2").value,

responsibility3:document.getElementById("responsibility3").value,

responsibility4:document.getElementById("responsibility4").value,

expertise1:document.getElementById("expertise1").value,

expertise2:document.getElementById("expertise2").value,

expertise3:document.getElementById("expertise3").value,

expertise4:document.getElementById("expertise4").value,

office:document.getElementById("profileOffice").value,

address:document.getElementById("profileAddress").value,

attendance:document.getElementById("profileAttendance").value

},

{merge:true}

);

alert("Teacher Profile Updated Successfully");

window.location.href="teacher-profile.html";

}

window.saveTeacherProfileDetails=
saveTeacherProfileDetails;

// ==========================
// Load Teacher Profile Details
// ==========================

function setTxt(id, value, fallback) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (value === undefined || value === null || value === "")
    ? (fallback !== undefined ? fallback : "-")
    : value;
}

function formatDateNice(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value; // not a parseable date, show as-is
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

async function loadTeacherProfileDetails(){

const id =
localStorage.getItem("profileTeacherId");

if(!id) return;

const snap=
await getDoc(
doc(db,"teachers",id)
);

if(!snap.exists()) return;

const teacher=
snap.data();

// ---- Hero card ----
setTxt("profileName", teacher.name, "Unnamed Teacher");
setTxt("profileRoleLine", teacher.subject ? `${teacher.subject} Teacher` : "Teacher");
setTxt("profileEmployeeId", teacher.employeeId, "-");
setTxt("profilePhone", teacher.phone, "-");
setTxt("profileEmail", teacher.email, "-");

const heroAvatarImg = document.getElementById("profileAvatarImg");
const heroAvatarInitial = document.getElementById("profileAvatarInitial");
if (teacher.photoURL && heroAvatarImg) {
  heroAvatarImg.src = teacher.photoURL;
  heroAvatarImg.style.display = "block";
  if (heroAvatarInitial) heroAvatarInitial.style.display = "none";
} else if (heroAvatarInitial) {
  heroAvatarInitial.textContent = (teacher.name || "?").trim().charAt(0).toUpperCase();
  heroAvatarInitial.style.display = "flex";
  if (heroAvatarImg) heroAvatarImg.style.display = "none";
}

const statusEl = document.getElementById("profileStatus");
if (statusEl) {
  const status = teacher.status || "Active";
  statusEl.textContent = status;
  statusEl.className = status === "Active" ? "status-pill status-active"
    : status === "On Leave" ? "status-pill status-onleave"
    : "status-pill status-inactive";
}

// ---- Personal Information card ----
setTxt("piFullName", teacher.name, "-");
setTxt("piDob", formatDateNice(teacher.dob));
setTxt("piGender", teacher.gender, "-");
setTxt("profileQualification", teacher.qualification, "-");
setTxt("profileExperience", teacher.experience !== undefined && teacher.experience !== "" ? `${teacher.experience} Years` : "-");
setTxt("profileJoiningDate", formatDateNice(teacher.joiningDate));
setTxt("profileAddress", teacher.address, "-");
setTxt("piStatus", teacher.status, "Active");

// ---- Professional Information card ----
setTxt("prEmployeeId", teacher.employeeId, "-");
setTxt("profileDepartment", teacher.department, "-");
setTxt("profileSubject", teacher.subject, "-");
setTxt("prEmail", teacher.email, "-");
setTxt("prMobile", teacher.phone, "-");
// profileAssigned (Classes Assigned) is filled in by computeTeacherStats()
// below, once we know which classes actually match this teacher's email —
// BUG FIX: this used to just repeat the teacher's subject here, which
// isn't the same thing as which classes they're assigned to.

// ---- Retained detail sections further down the page ----
setTxt("profileDesignation", teacher.designation, "-");
setTxt("profileSummary", teacher.summary, "-");
setTxt("profileGraduation", teacher.graduation, "-");
setTxt("profilePostGraduation", teacher.postGraduation, "-");
setTxt("profileBed", teacher.bed, "-");
setTxt("profileCTET", teacher.ctet, "-");
setTxt("profileOtherQualification", teacher.otherQualification, "-");
setTxt("profileCurrentSchool", teacher.currentSchool, "-");
setTxt("profilePreviousSchool", teacher.previousSchool, "-");
setTxt("profileAchievement", teacher.achievement, "-");
setTxt("responsibility1", teacher.responsibility1, "-");
setTxt("responsibility2", teacher.responsibility2, "-");
setTxt("responsibility3", teacher.responsibility3, "-");
setTxt("responsibility4", teacher.responsibility4, "-");
setTxt("expertise1", teacher.expertise1, "-");
setTxt("expertise2", teacher.expertise2, "-");
setTxt("expertise3", teacher.expertise3, "-");
setTxt("expertise4", teacher.expertise4, "-");
setTxt("profileOffice", teacher.office, "-");
setTxt("profileAttendance", teacher.attendance ? `${teacher.attendance}` : "-");

// Live stats + activity feed (separate async calls so a slow/failed
// one doesn't block the rest of the page from rendering)
computeTeacherStats(id, teacher);
loadRecentActivities(id);

}

if(
window.location.pathname.includes(
"teacher-profile.html"
)
){

loadTeacherProfileDetails();

}

// ==========================
// Teacher Profile — live stat cards
// (Classes Assigned / Students / Attendance / Assignments / Rating)
// ==========================
async function computeTeacherStats(id, teacher) {

  const statClasses = document.getElementById("statClasses");
  const statStudents = document.getElementById("statStudents");
  const statAttendance = document.getElementById("statAttendance");
  const statAssignments = document.getElementById("statAssignments");
  const statRating = document.getElementById("statRating");

  try {

    // Classes this teacher is the class-teacher for (matched by email,
    // same join used everywhere else in this app — see loadClassesTable).
    let classIds = [];
    let classNames = [];

    if (teacher.email) {
      const classSnap = await getDocs(
        query(collection(db, "classes"), where("teacherEmail", "==", teacher.email))
      );
      classIds = classSnap.docs.map(d => d.id);
      classNames = classSnap.docs.map(d => d.data().className || d.id);
    }

    if (statClasses) animateCountUp(statClasses, classIds.length);

    // BUG FIX: "Classes Assigned" in Professional Information used to
    // just repeat the subject. Now it lists the real assigned classes.
    setTxt("profileAssigned", classNames.length ? classNames.join(", ") : "-");

    // Students across those classes (reuses the same normalized class-key
    // matching as the rest of the admin panel, e.g. "Class 3" vs "3").
    if (classIds.length > 0) {
      const studentSnap = await getDocs(collection(db, "students"));
      const targetKeys = new Set(classIds.map(classKeyNormalized));
      const studentCount = studentSnap.docs.filter(d => targetKeys.has(classKeyNormalized(d.data().class))).length;
      if (statStudents) animateCountUp(statStudents, studentCount);
    } else if (statStudents) {
      statStudents.textContent = "0";
    }

    // Assignments (homework) posted by this teacher.
    const hwSnap = await getDocs(
      query(collection(db, "homework"), where("postedBy", "==", id))
    );
    if (statAssignments) animateCountUp(statAssignments, hwSnap.size);

  } catch (error) {
    console.error("Could not compute teacher stats:", error);
  }

  // Attendance % — this is the value admin sets from Edit Profile
  // (there's no separate attendance-tracking system for teachers yet).
  if (statAttendance) {
    statAttendance.textContent = teacher.attendance ? `${teacher.attendance}%` : "-";
  }

  // Rating — no rating system exists yet, so this only shows something
  // once a "rating" field is present on the teacher doc; otherwise it
  // honestly shows "New" rather than making up a number.
  if (statRating) {
    statRating.textContent = teacher.rating ? `${teacher.rating}` : "New";
  }

}

// ==========================
// Teacher Profile — Recent Activities
// Built from real actions (attendance marked, homework posted, marks
// updated) instead of being hardcoded. Each source is queried and
// failed independently — a missing Firestore index on one type (the
// console will offer a one-click link to create it the first time
// this runs) won't blank out the whole feed.
// ==========================
function timeAgoLabel(dateObj) {
  if (!dateObj) return "";
  const diffMs = Date.now() - dateObj.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

async function loadRecentActivities(teacherId) {

  const list = document.getElementById("recentActivitiesList");
  if (!list) return;

  list.innerHTML = `<p class="activity-empty">Loading recent activity...</p>`;

  const entries = [];

  // Attendance marked
  try {
    const attSnap = await getDocs(
      query(collectionGroup(db, "attendance"), where("markedBy", "==", teacherId), orderBy("markedAt", "desc"), limit(3))
    );
    for (const d of attSnap.docs) {
      const a = d.data();
      const ts = a.markedAt?.toDate ? a.markedAt.toDate() : null;
      let classLabel = "";
      if (a.studentRoll) {
        try {
          const sSnap = await getDoc(doc(db, "students", a.studentRoll));
          if (sSnap.exists()) classLabel = sSnap.data().class ? `Class ${sSnap.data().class}` : "";
        } catch (e) { /* ignore lookup failure, still show the entry */ }
      }
      entries.push({
        icon: "fa-solid fa-clipboard-check",
        color: "green",
        title: "Marked Attendance",
        sub: classLabel,
        date: ts,
      });
    }
  } catch (error) {
    console.warn("Recent Activities: attendance query needs a Firestore index (check console for a create-index link):", error);
  }

  // Homework / assignments posted
  try {
    const hwSnap = await getDocs(
      query(collection(db, "homework"), where("postedBy", "==", teacherId), orderBy("createdAt", "desc"), limit(3))
    );
    hwSnap.forEach((d) => {
      const hw = d.data();
      const ts = hw.createdAt?.toDate ? hw.createdAt.toDate() : null;
      entries.push({
        icon: "fa-solid fa-file-lines",
        color: "blue",
        title: "Added Assignment",
        sub: hw.className ? `Class ${hw.className}` : "",
        date: ts,
      });
    });
  } catch (error) {
    console.warn("Recent Activities: homework query needs a Firestore index (check console for a create-index link):", error);
  }

  // Marks updated
  try {
    const resSnap = await getDocs(
      query(collectionGroup(db, "results"), where("updatedBy", "==", teacherId), orderBy("updatedAt", "desc"), limit(3))
    );
    for (const d of resSnap.docs) {
      const r = d.data();
      const ts = r.updatedAt?.toDate ? r.updatedAt.toDate() : null;
      let classLabel = "";
      if (r.studentRoll) {
        try {
          const sSnap = await getDoc(doc(db, "students", r.studentRoll));
          if (sSnap.exists()) classLabel = sSnap.data().class ? `Class ${sSnap.data().class}` : "";
        } catch (e) { /* ignore lookup failure, still show the entry */ }
      }
      entries.push({
        icon: "fa-solid fa-pen-to-square",
        color: "orange",
        title: "Updated Marks",
        sub: classLabel,
        date: ts,
      });
    }
  } catch (error) {
    console.warn("Recent Activities: results query needs a Firestore index (check console for a create-index link):", error);
  }

  if (entries.length === 0) {
    list.innerHTML = `<p class="activity-empty">No recent activity yet.</p>`;
    return;
  }

  entries.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  list.innerHTML = entries.slice(0, 4).map((e) => `
    <div class="activity-row">
      <div class="activity-icon ${e.color}"><i class="${e.icon}"></i></div>
      <div class="activity-body">
        <strong>${escapeHtmlAdmin(e.title)}</strong>
        <span>${escapeHtmlAdmin(e.sub || "-")}</span>
      </div>
      <span class="activity-time">${escapeHtmlAdmin(timeAgoLabel(e.date))}</span>
    </div>
  `).join("");

}

// ==========================
// Teacher Profile — Change Password
// Sends the same kind of reset link the teacher's own
// "Change Password" button sends, just triggered by the admin.
// ==========================
async function changeTeacherPassword() {

  const id = localStorage.getItem("profileTeacherId");
  if (!id) return;

  try {
    const snap = await getDoc(doc(db, "teachers", id));
    if (!snap.exists() || !snap.data().email) {
      alert("Teacher email not found.");
      return;
    }
    const email = snap.data().email;
    await sendPasswordResetEmail(auth, email);
    alert("Password reset link bhej diya gaya hai: " + email);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.changeTeacherPassword = changeTeacherPassword;

// ==========================
// Teacher Profile — Photo Upload
// Same Storage + Firestore pattern as the Gallery uploader:
// upload the file, get its download URL, save that URL on the
// teacher's doc, then refresh the avatar on screen immediately.
// ==========================
function triggerTeacherPhotoUpload() {
  const input = document.getElementById("photoUploadInput");
  if (input) input.click();
}
window.triggerTeacherPhotoUpload = triggerTeacherPhotoUpload;

async function uploadTeacherProfilePhoto(fileInput) {

  const id = localStorage.getItem("profileTeacherId");
  const file = fileInput.files && fileInput.files[0];
  if (!id || !file) return;

  const cameraBtn = document.getElementById("avatarCameraBtn");
  const originalHtml = cameraBtn ? cameraBtn.innerHTML : "";
  if (cameraBtn) { cameraBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; cameraBtn.disabled = true; }

  try {

    const storagePath = `teacherPhotos/${id}_${Date.now()}_${file.name}`;
    const fileRef = ref(storage, storagePath);

    await uploadBytes(fileRef, file);
    const photoURL = await getDownloadURL(fileRef);

    await setDoc(doc(db, "teachers", id), { photoURL }, { merge: true });

    const heroAvatarImg = document.getElementById("profileAvatarImg");
    const heroAvatarInitial = document.getElementById("profileAvatarInitial");
    if (heroAvatarImg) {
      heroAvatarImg.src = photoURL;
      heroAvatarImg.style.display = "block";
    }
    if (heroAvatarInitial) heroAvatarInitial.style.display = "none";

  } catch (error) {
    console.error(error);
    alert(error.message);
  } finally {
    if (cameraBtn) { cameraBtn.innerHTML = originalHtml; cameraBtn.disabled = false; }
    fileInput.value = "";
  }

}
window.uploadTeacherProfilePhoto = uploadTeacherProfilePhoto;

function editTeacherProfile(){

const id =
localStorage.getItem("profileTeacherId");

localStorage.setItem(
"editTeacherId",
id
);

window.location.href =
"edit-teacher.html";

}

window.editTeacherProfile =
editTeacherProfile;

async function loadEditTeacher(){

const id = localStorage.getItem("editTeacherId");

console.log(id);

if(!id){
    alert("Teacher ID Not Found");
    return;
}

const snap = await getDoc(
    doc(db,"teachers",id)
);

if(!snap.exists()){
    alert("Teacher Not Found");
    return;
}

const teacher = snap.data();

    document.getElementById("profileDesignation").value =
    teacher.designation || "";

    document.getElementById("profileDepartment").value =
    teacher.department || "";

    document.getElementById("profileEmployeeId").value =
    teacher.employeeId || "";

    document.getElementById("profileJoiningDate").value =
    teacher.joiningDate || "";

    document.getElementById("profileSummary").value =
    teacher.summary || "";

    document.getElementById("profileGraduation").value =
    teacher.graduation || "";

    document.getElementById("profilePostGraduation").value =
    teacher.postGraduation || "";

    document.getElementById("profileBed").value =
    teacher.bed || "";

    document.getElementById("profileCTET").value =
    teacher.ctet || "";

    document.getElementById("profileOtherQualification").value =
    teacher.otherQualification || "";

    document.getElementById("profileCurrentSchool").value =
    teacher.currentSchool || "";

    document.getElementById("profilePreviousSchool").value =
    teacher.previousSchool || "";

    document.getElementById("profileAchievement").value =
    teacher.achievement || "";

    document.getElementById("responsibility1").value =
    teacher.responsibility1 || "";

    document.getElementById("responsibility2").value =
    teacher.responsibility2 || "";

    document.getElementById("responsibility3").value =
    teacher.responsibility3 || "";

    document.getElementById("responsibility4").value =
    teacher.responsibility4 || "";

    document.getElementById("expertise1").value =
    teacher.expertise1 || "";

    document.getElementById("expertise2").value =
    teacher.expertise2 || "";

    document.getElementById("expertise3").value =
    teacher.expertise3 || "";

    document.getElementById("expertise4").value =
    teacher.expertise4 || "";

    document.getElementById("profileOffice").value =
    teacher.office || "";

    document.getElementById("profileAddress").value =
    teacher.address || "";

    document.getElementById("profileAttendance").value =
    teacher.attendance || "";
  
document.getElementById("profileName").value =
teacher.name || "";

document.getElementById("profileSubject").value =
teacher.subject || "";

document.getElementById("profilePhone").value =
teacher.phone || "";

document.getElementById("profileEmail").value =
teacher.email || "";

document.getElementById("profileExperience").value =
teacher.experience || "";

document.getElementById("profileStatus").value =
teacher.status || "Active";
  
}
if(
window.location.pathname.includes(
"edit-teacher.html"
)){
    loadEditTeacher();
}

async function loadResultCount(){

const box =
document.getElementById("resultCount");

if(!box) return;

const snapshot =
await getDocs(collection(db,"results"));

box.textContent =
snapshot.size;

}

loadResultCount();


const btn = document.getElementById("resetBtn");

if (btn) {

    btn.addEventListener("click", async (e) => {

        e.preventDefault();

        const email = document
            .getElementById("resetEmail")
            .value
            .trim();

        if (!email) {
            alert("Enter Email");
            return;
        }

        // SECURITY: this page is the ADMIN's forgot-password flow only.
        // Only the registered admin email may receive a reset link — otherwise
        // anyone could type in any teacher's (or a guessed) email here and
        // trigger a password-reset email against that account. Reject before
        // ever calling Firebase.
        const ADMIN_EMAIL = "vivaan510399@gmail.com";
        if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            alert("Invalid email. Password reset is only available for the registered admin account.");
            return;
        }

        try {

            await sendPasswordResetEmail(auth, email);

            alert("Reset Link Sent Successfully");

        } catch (error) {

            console.log(error);

            alert(error.code);

        }

    });

}


// ==========================
// Class Wing Icons (visual only)
// ==========================

const wingIcons = {
  "Primary Wing": "fa-graduation-cap",
  "Middle Wing": "fa-calculator",
  "Secondary Wing": "fa-flask",
  "Senior Wing": "fa-star"
};

let editingClassId = null;
let allClassRows = []; // cached for search filtering

// ==========================
// Load Classes Table + Stats
// ==========================

const classesTableBody = document.getElementById("classesTable");

if (classesTableBody) {
  loadClassesTable();
}

// BUG FIX — "Total Students" on All Classes was always 0:
// Add Student's Class <select> options (e.g. "Class 3") have no
// explicit value="", so the browser submits the option's visible
// text, and student.class gets saved as the full string "Class 3".
// The class document's own id/key (set via "Class Key" in Add New
// Class) is usually just "3". "Class 3" !== "3", so the exact-match
// lookup below always missed. This normalizer strips "Class "
// (any case) and trims, so both sides compare on the same key —
// works for existing students too, no data migration needed.
function classKeyNormalized(value) {
  return String(value || "").trim().toLowerCase().replace(/^class\s*/, "");
}
window.classKeyNormalized = classKeyNormalized;

async function loadClassesTable() {

  classesTableBody.innerHTML = `<tr><td colspan="5">Loading classes...</td></tr>`;

  const classSnap = await getDocs(collection(db, "classes"));
  const studentSnap = await getDocs(collection(db, "students"));

  // Count students per class key (normalized so "Class 3" and "3" match)
  const studentCounts = {};
  studentSnap.forEach((s) => {
    const cls = classKeyNormalized(s.data().class);
    studentCounts[cls] = (studentCounts[cls] || 0) + 1;
  });

  allClassRows = [];
  let totalSections = 0;
  let totalStudents = 0;
  let activeCount = 0;

  classSnap.forEach((docSnap) => {
    const c = docSnap.data();
    const classId = docSnap.id;
    const sections = c.sections || [];
    const studentCount = studentCounts[classKeyNormalized(classId)] || 0;

    totalSections += sections.length;
    totalStudents += studentCount;
    if (c.status === "Active") activeCount++;

    allClassRows.push({ id: classId, ...c, studentCount });
  });

  renderClassRows(allClassRows);

  const totalClassesBox = document.getElementById("totalClasses");
  const totalSectionsBox = document.getElementById("totalSections");
  const totalStudentsBox = document.getElementById("totalClassStudents");
  const activeClassesBox = document.getElementById("activeClasses");

  if (totalClassesBox) totalClassesBox.textContent = classSnap.size;
  if (totalSectionsBox) totalSectionsBox.textContent = totalSections;
  if (totalStudentsBox) totalStudentsBox.textContent = totalStudents;
  if (activeClassesBox) activeClassesBox.textContent = activeCount;
}

window.loadClassesTable = loadClassesTable;

function renderClassRows(rows) {

  if (!classesTableBody) return;

  if (rows.length === 0) {
    classesTableBody.innerHTML = `<tr><td colspan="5">No classes found. Click "Add New Class" to create one.</td></tr>`;
    return;
  }

  classesTableBody.innerHTML = "";

  rows.forEach((c, index) => {

    const icon = wingIcons[c.wing] || "fa-book";
    const sections = c.sections || [];

    const sectionBadges = sections.length
      ? sections.map(s => `<span class="section-badge">${s}</span>`).join(" ")
      : `<span class="section-badge">-</span>`;

    const row = document.createElement("tr");
    row.style.animationDelay = (index * 0.05) + "s";

    row.innerHTML = `
      <td data-label="Class">
        <div class="class-name-cell">
          <div class="class-icon-badge"><i class="fa-solid ${icon}"></i></div>
          <div class="class-name-text">
            <strong>${c.className || c.id}</strong>
            <small>${c.wing || ""}</small>
          </div>
        </div>
      </td>

      <td data-label="Section(s)">${sectionBadges}</td>

      <td data-label="Class Teacher" class="teacher-cell">
        <strong>${c.teacherName || "-"}</strong>
        <small>${c.teacherEmail || ""}</small>
      </td>

      <td data-label="Total Students">${c.studentCount}</td>

      <td data-label="Action">
        <div class="action-btns">
          <button class="btn-view" onclick="viewClass('${c.id}')">
            <i class="fa-regular fa-eye"></i> View
          </button>
          <button class="btn-edit" onclick="openClassModal('${c.id}')">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="btn-delete" onclick="deleteClass('${c.id}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </td>
    `;

    classesTableBody.appendChild(row);

  });

}

// ==========================
// Search / Filter
// ==========================

function searchClass() {

  const input = document.getElementById("searchClass").value.toLowerCase();

  const filtered = allClassRows.filter(c =>
    (c.className || c.id).toLowerCase().includes(input) ||
    (c.teacherName || "").toLowerCase().includes(input)
  );

  renderClassRows(filtered);

}

window.searchClass = searchClass;

// ==========================
// Add / Edit Modal
// ==========================

async function openClassModal(classId) {

  editingClassId = classId || null;

  const backdrop = document.getElementById("classModalBackdrop");
  const title = document.getElementById("classModalTitle");
  const keyInput = document.getElementById("classKey");

  document.getElementById("classForm").reset();

  if (editingClassId) {

    title.textContent = "Edit Class";
    keyInput.disabled = true;

    const snap = await getDoc(doc(db, "classes", editingClassId));

    if (snap.exists()) {
      const c = snap.data();
      keyInput.value = editingClassId;
      document.getElementById("className").value = c.className || "";
      document.getElementById("classWing").value = c.wing || "Primary Wing";
      document.getElementById("classSections").value = (c.sections || []).join(", ");
      document.getElementById("classTeacherName").value = c.teacherName || "";
      document.getElementById("classTeacherEmail").value = c.teacherEmail || "";
      document.getElementById("classStatus").value = c.status || "Active";
    }

  } else {

    title.textContent = "Add New Class";
    keyInput.disabled = false;

  }

  backdrop.classList.add("open");

}

window.openClassModal = openClassModal;

function closeClassModal() {
  document.getElementById("classModalBackdrop").classList.remove("open");
  editingClassId = null;
}

window.closeClassModal = closeClassModal;

// Close modal on backdrop click (not when clicking inside the box)
const classModalBackdropEl = document.getElementById("classModalBackdrop");
if (classModalBackdropEl) {
  classModalBackdropEl.addEventListener("click", function (e) {
    if (e.target === classModalBackdropEl) closeClassModal();
  });
}

// ==========================
// Save (Add or Update) Class
// ==========================

async function saveClass() {

  const classKey = document.getElementById("classKey").value.trim();
  const className = document.getElementById("className").value.trim();
  const wing = document.getElementById("classWing").value;
  const sectionsRaw = document.getElementById("classSections").value.trim();
  const teacherName = document.getElementById("classTeacherName").value.trim();
  const teacherEmail = document.getElementById("classTeacherEmail").value.trim();
  const status = document.getElementById("classStatus").value;

  if (!classKey || !className) {
    alert("Please fill Class Key and Display Name.");
    return;
  }

  const sections = sectionsRaw
    ? sectionsRaw.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const classData = {
    className,
    wing,
    sections,
    teacherName,
    teacherEmail,
    status
  };

  try {

    await setDoc(doc(db, "classes", classKey), classData, { merge: true });

    closeClassModal();
    await loadClassesTable();

    alert(editingClassId ? "Class updated successfully." : "Class added successfully.");

  } catch (error) {

    console.error(error);
    alert(error.message);

  }

}

window.saveClass = saveClass;

// ==========================
// View Class
// ==========================

async function viewClass(classId) {

  const snap = await getDoc(doc(db, "classes", classId));

  if (!snap.exists()) {
    alert("Class not found.");
    return;
  }

  const c = snap.data();

  alert(
    `${c.className}\n` +
    `Wing: ${c.wing || "-"}\n` +
    `Sections: ${(c.sections || []).join(", ") || "-"}\n` +
    `Class Teacher: ${c.teacherName || "-"} (${c.teacherEmail || "-"})\n` +
    `Status: ${c.status || "-"}`
  );

}

window.viewClass = viewClass;

// ==========================
// Delete Class
// ==========================

async function deleteClass(classId) {

  const confirmDelete = confirm("Delete this class permanently?");

  if (!confirmDelete) return;

  try {

    await deleteDoc(doc(db, "classes", classId));

    alert("Class deleted successfully.");

    loadClassesTable();

  } catch (error) {

    console.error(error);
    alert(error.message);

  }

}

window.deleteClass = deleteClass;

// ==========================
// Shared helper
// ==========================
// ==========================
// Admin — Change Password (change-password.html)
// Same pattern as changeTeacherPassword(): send a Firebase reset
// link, this time to the admin's own registered email. No arbitrary
// email input here — admin is already authenticated, so it always
// targets their own account.
// ==========================
async function changeAdminPassword() {
    const ADMIN_EMAIL = "vivaan510399@gmail.com";
    const btn = document.getElementById("changePasswordBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
    try {
        await sendPasswordResetEmail(auth, ADMIN_EMAIL);
        alert("Password reset link sent to " + ADMIN_EMAIL + ". Check your inbox.");
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Password Reset Link'; }
    }
}
window.changeAdminPassword = changeAdminPassword;

// ==========================
// Publish Result — admin overview (publish-result.html)
// Marks are entered per-teacher on teacher-marks.html; this page just
// gives admin visibility into every student's publish status, with an
// override toggle for convenience (same students/{roll}.publishStatus
// field teacher-marks.html already uses).
// ==========================
async function loadPublishOverview() {
    const tableBody = document.getElementById("publishOverviewTable");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="5"><div class="loading-state"><div class="spinner"></div>Loading students...</div></td></tr>`;

    try {
        const snap = await getDocs(collection(db, "students"));

        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="5">No students found.</td></tr>`;
            return;
        }

        const rows = [];
        snap.forEach((docSnap) => {
            const s = docSnap.data();
            rows.push({ roll: docSnap.id, name: s.name || s.studentName || "-", cls: s.class || "-", status: s.publishStatus || "unpublished" });
        });
        rows.sort((a, b) => (a.cls > b.cls ? 1 : a.cls < b.cls ? -1 : Number(a.roll) - Number(b.roll)));

        tableBody.innerHTML = "";
        rows.forEach((r) => {
            const row = document.createElement("tr");
            const isPublished = r.status === "published";
            row.innerHTML = `
                <td data-label="Roll No.">${escapeHtmlAdmin(r.roll)}</td>
                <td data-label="Name">${escapeHtmlAdmin(r.name)}</td>
                <td data-label="Class">${escapeHtmlAdmin(r.cls)}</td>
                <td data-label="Status"><span class="${isPublished ? "status-active" : "status-inactive"}">${isPublished ? "Published" : "Unpublished"}</span></td>
                <td data-label="Action">
                    <div class="action-btns">
                        <button class="${isPublished ? "btn-delete" : "btn-view"}" onclick="toggleStudentPublish('${r.roll}', '${isPublished ? "unpublished" : "published"}')">
                            <i class="fa-solid ${isPublished ? "fa-eye-slash" : "fa-upload"}"></i> ${isPublished ? "Unpublish" : "Publish"}
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Could not load publish overview:", error);
        tableBody.innerHTML = `<tr><td colspan="5">Could not load students.</td></tr>`;
    }
}
loadPublishOverview();

async function toggleStudentPublish(roll, newStatus) {
    try {
        await setDoc(doc(db, "students", roll), { publishStatus: newStatus }, { merge: true });
        loadPublishOverview();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}
window.toggleStudentPublish = toggleStudentPublish;

function searchPublishOverview() {
    const input = document.getElementById("searchPublishOverview")?.value.toLowerCase() || "";
    document.querySelectorAll("#publishOverviewTable tr").forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(input) ? "" : "none";
    });
}
window.searchPublishOverview = searchPublishOverview;

// ==========================
// Marks & Subjects — read-only reference (marks-management.html)
// classSubjects / max-marks live as constants in this file (not
// Firestore), so this page just displays what's currently configured.
// ==========================
function loadMarksReference() {
    const box = document.getElementById("marksReferenceGrid");
    if (!box) return;

    const lowerClasses = ["Nursery", "L.K.G", "U.K.G"];
    box.innerHTML = "";

    Object.keys(classSubjects).forEach((cls) => {
        const isLower = lowerClasses.includes(cls);
        const max = isLower ? 50 : 60;
        const pass = isLower ? 17 : 20;
        const card = document.createElement("div");
        card.className = "ref-card";
        card.innerHTML = `
            <div class="ref-card-header">
                <span class="ref-class-name">Class ${escapeHtmlAdmin(cls)}</span>
                <span class="ref-marks-pill">${max} marks &middot; pass ${pass}</span>
            </div>
            <div class="ref-subjects">${classSubjects[cls].map((s) => `<span class="ref-subject-chip">${escapeHtmlAdmin(s)}</span>`).join("")}</div>
        `;
        box.appendChild(card);
    });
}
loadMarksReference();

function escapeHtmlAdmin(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// =========================================================
// NOTICE MANAGEMENT (notices.html)
// =========================================================

let editingNoticeId = null;
let allNoticeRows = [];

const noticesTableBody = document.getElementById("noticesTable");

if (noticesTableBody) {
  loadNoticesTable();
}

async function loadNoticesTable() {

  noticesTableBody.innerHTML = `<tr><td colspan="4">Loading notices...</td></tr>`;

  try {

    const noticesQuery = query(collection(db, "notices"), orderBy("date", "desc"));
    const snap = await getDocs(noticesQuery);

    allNoticeRows = [];
    snap.forEach((docSnap) => {
      allNoticeRows.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderNoticeRows(allNoticeRows);

  } catch (error) {
    console.error(error);
    noticesTableBody.innerHTML = `<tr><td colspan="4">Could not load notices.</td></tr>`;
  }

}
window.loadNoticesTable = loadNoticesTable;

function renderNoticeRows(rows) {

  if (!noticesTableBody) return;

  if (rows.length === 0) {
    noticesTableBody.innerHTML = `<tr><td colspan="4">No notices yet. Click "Add Notice" to create one.</td></tr>`;
    return;
  }

  noticesTableBody.innerHTML = "";

  rows.forEach((n, index) => {

    const dateText = n.date && n.date.toDate
      ? n.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "-";

    const shortDesc = (n.description || "").slice(0, 60) + ((n.description || "").length > 60 ? "…" : "");

    const row = document.createElement("tr");
    row.style.animationDelay = (index * 0.05) + "s";

    row.innerHTML = `
      <td data-label="Title">
        <div class="class-name-cell">
          <div class="class-icon-badge"><i class="fa-regular fa-bell"></i></div>
          <div class="class-name-text">
            <strong>${escapeHtmlAdmin(n.title || "-")}</strong>
          </div>
        </div>
      </td>
      <td data-label="Date">${dateText}</td>
      <td data-label="Description">${escapeHtmlAdmin(shortDesc)}</td>
      <td data-label="Action">
        <div class="action-btns">
          <button class="btn-edit" onclick="openNoticeModal('${n.id}')">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="btn-delete" onclick="deleteNotice('${n.id}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </td>
    `;

    noticesTableBody.appendChild(row);

  });

}

function searchNotice() {
  const input = document.getElementById("searchNotice").value.toLowerCase();
  const filtered = allNoticeRows.filter(n =>
    (n.title || "").toLowerCase().includes(input) ||
    (n.description || "").toLowerCase().includes(input)
  );
  renderNoticeRows(filtered);
}
window.searchNotice = searchNotice;

function openNoticeModal(noticeId) {

  editingNoticeId = noticeId || null;

  const backdrop = document.getElementById("noticeModalBackdrop");
  const title = document.getElementById("noticeModalTitle");

  document.getElementById("noticeForm").reset();

  if (editingNoticeId) {

    title.textContent = "Edit Notice";

    const existing = allNoticeRows.find(n => n.id === editingNoticeId);
    if (existing) {
      document.getElementById("noticeTitle").value = existing.title || "";
      document.getElementById("noticeDescription").value = existing.description || "";
      if (existing.date && existing.date.toDate) {
        document.getElementById("noticeDate").value = existing.date.toDate().toISOString().slice(0, 10);
      }
    }

  } else {
    title.textContent = "Add Notice";
    document.getElementById("noticeDate").value = new Date().toISOString().slice(0, 10);
  }

  backdrop.classList.add("open");

}
window.openNoticeModal = openNoticeModal;

function closeNoticeModal() {
  document.getElementById("noticeModalBackdrop").classList.remove("open");
  editingNoticeId = null;
}
window.closeNoticeModal = closeNoticeModal;

const noticeModalBackdropEl = document.getElementById("noticeModalBackdrop");
if (noticeModalBackdropEl) {
  noticeModalBackdropEl.addEventListener("click", function (e) {
    if (e.target === noticeModalBackdropEl) closeNoticeModal();
  });
}

async function saveNotice() {

  const title = document.getElementById("noticeTitle").value.trim();
  const description = document.getElementById("noticeDescription").value.trim();
  const dateValue = document.getElementById("noticeDate").value;

  if (!title || !dateValue) {
    alert("Please fill Title and Date.");
    return;
  }

  const noticeData = {
    title,
    description,
    date: Timestamp.fromDate(new Date(dateValue))
  };

  try {

    if (editingNoticeId) {
      await setDoc(doc(db, "notices", editingNoticeId), noticeData, { merge: true });
    } else {
      await addDoc(collection(db, "notices"), noticeData);
    }

    closeNoticeModal();
    await loadNoticesTable();

    alert(editingNoticeId ? "Notice updated successfully." : "Notice added successfully.");

  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.saveNotice = saveNotice;

async function deleteNotice(noticeId) {

  const confirmDelete = confirm("Delete this notice permanently?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "notices", noticeId));
    alert("Notice deleted successfully.");
    loadNoticesTable();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.deleteNotice = deleteNotice;

// =========================================================
// GALLERY MANAGEMENT (gallery-management.html)
// =========================================================

let allGalleryRows = [];

const galleryGridBox = document.getElementById("galleryGrid");

if (galleryGridBox) {
  loadGalleryGrid();
}

async function loadGalleryGrid() {

  galleryGridBox.innerHTML = `<p class="no-class-msg">Loading gallery...</p>`;

  try {

    const galleryQuery = query(collection(db, "gallery"), orderBy("uploadedAt", "desc"));
    const snap = await getDocs(galleryQuery);

    allGalleryRows = [];
    snap.forEach((docSnap) => {
      allGalleryRows.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderGalleryGrid(allGalleryRows);

  } catch (error) {
    console.error(error);
    galleryGridBox.innerHTML = `<p class="no-class-msg">Could not load gallery.</p>`;
  }

}
window.loadGalleryGrid = loadGalleryGrid;

function renderGalleryGrid(rows) {

  if (!galleryGridBox) return;

  if (rows.length === 0) {
    galleryGridBox.innerHTML = `<p class="no-class-msg">Abhi koi photo upload nahi hui. "Add Photo" par click karke shuru karein.</p>`;
    return;
  }

  galleryGridBox.innerHTML = rows.map((g) => `
    <div class="gallery-thumb">
      <img src="${g.imageUrl}" alt="${escapeHtmlAdmin(g.title || g.category || "Gallery photo")}" loading="lazy">
      <div class="gallery-thumb-overlay">
        <span class="gallery-thumb-category">${escapeHtmlAdmin(g.category || "")}</span>
        <button class="gallery-thumb-delete" onclick="deleteGalleryPhoto('${g.id}')" aria-label="Delete photo">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      ${g.title ? `<div class="gallery-thumb-caption">${escapeHtmlAdmin(g.title)}</div>` : ""}
    </div>
  `).join("");

}

function openGalleryModal() {
  document.getElementById("galleryForm").reset();
  document.getElementById("galleryModalBackdrop").classList.add("open");
}
window.openGalleryModal = openGalleryModal;

function closeGalleryModal() {
  document.getElementById("galleryModalBackdrop").classList.remove("open");
}
window.closeGalleryModal = closeGalleryModal;

const galleryModalBackdropEl = document.getElementById("galleryModalBackdrop");
if (galleryModalBackdropEl) {
  galleryModalBackdropEl.addEventListener("click", function (e) {
    if (e.target === galleryModalBackdropEl) closeGalleryModal();
  });
}

async function saveGalleryPhoto() {

  const category = document.getElementById("galleryCategory").value;
  const title = document.getElementById("galleryTitle").value.trim();
  const fileInput = document.getElementById("galleryFile");
  const file = fileInput.files[0];

  if (!category || !file) {
    alert("Please choose a category and an image.");
    return;
  }

  const saveBtn = document.getElementById("gallerySaveBtn");
  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : "";
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = "Uploading..."; }

  try {

    const storagePath = `gallery/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, storagePath);

    await uploadBytes(fileRef, file);
    const imageUrl = await getDownloadURL(fileRef);

    await addDoc(collection(db, "gallery"), {
      category,
      title,
      imageUrl,
      storagePath,
      uploadedAt: Timestamp.now()
    });

    closeGalleryModal();
    await loadGalleryGrid();

    alert("Photo added to gallery successfully.");

  } catch (error) {
    console.error(error);
    alert(error.message);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
  }

}
window.saveGalleryPhoto = saveGalleryPhoto;

async function deleteGalleryPhoto(galleryId) {

  const confirmDelete = confirm("Delete this photo permanently?");
  if (!confirmDelete) return;

  try {

    const existing = allGalleryRows.find(g => g.id === galleryId);

    await deleteDoc(doc(db, "gallery", galleryId));

    if (existing && existing.storagePath) {
      try {
        await deleteObject(ref(storage, existing.storagePath));
      } catch (storageError) {
        console.warn("Could not delete file from storage:", storageError);
      }
    }

    alert("Photo deleted successfully.");
    loadGalleryGrid();

  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.deleteGalleryPhoto = deleteGalleryPhoto;

// =========================================================
// FEE MANAGEMENT (fee-management.html)
// =========================================================

// ----- Payment Settings (School UPI ID for the Parent Portal's
// Pay Now button — stored once, shared by every student) -----

const schoolUpiIdField = document.getElementById("schoolUpiId");

if (schoolUpiIdField) {
  loadPaymentSettings();
}

async function loadPaymentSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "payment"));
    if (snap.exists()) {
      const data = snap.data();
      const upiField = document.getElementById("schoolUpiId");
      const nameField = document.getElementById("schoolPayeeName");
      if (upiField) upiField.value = data.upiId || "";
      if (nameField) nameField.value = data.payeeName || "";
    }
  } catch (error) {
    console.error("Could not load payment settings:", error);
  }
}

async function savePaymentSettings() {
  const upiId = document.getElementById("schoolUpiId").value.trim();
  const payeeName = document.getElementById("schoolPayeeName").value.trim();

  if (!upiId) {
    alert("Please enter a UPI ID.");
    return;
  }

  try {
    await setDoc(doc(db, "settings", "payment"), {
      upiId,
      payeeName: payeeName || "Modern International School"
    }, { merge: true });

    alert("Payment settings saved successfully.");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}
window.savePaymentSettings = savePaymentSettings;

let allFeeClassRows = [];

const feeClassesTableBody = document.getElementById("feeClassesTable");

if (feeClassesTableBody) {
  loadFeeClassesTable();
}

async function loadFeeClassesTable() {

  feeClassesTableBody.innerHTML = `<tr><td colspan="4">Loading classes...</td></tr>`;

  try {

    const snap = await getDocs(collection(db, "classes"));

    allFeeClassRows = [];
    snap.forEach((docSnap) => {
      allFeeClassRows.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderFeeClassRows(allFeeClassRows);

  } catch (error) {
    console.error(error);
    feeClassesTableBody.innerHTML = `<tr><td colspan="4">Could not load classes.</td></tr>`;
  }

}
window.loadFeeClassesTable = loadFeeClassesTable;

function renderFeeClassRows(rows) {

  if (!feeClassesTableBody) return;

  if (rows.length === 0) {
    feeClassesTableBody.innerHTML = `<tr><td colspan="4">Pehle "All Classes" page se classes add karein.</td></tr>`;
    return;
  }

  feeClassesTableBody.innerHTML = "";

  rows.forEach((c, index) => {

    const row = document.createElement("tr");
    row.style.animationDelay = (index * 0.05) + "s";

    row.innerHTML = `
      <td data-label="Class">
        <div class="class-name-cell">
          <div class="class-icon-badge"><i class="fa-solid fa-graduation-cap"></i></div>
          <div class="class-name-text">
            <strong>${escapeHtmlAdmin(c.className || c.id)}</strong>
            <small>${escapeHtmlAdmin(c.wing || "")}</small>
          </div>
        </div>
      </td>
      <td data-label="Fee Amount">${c.feeAmount ? "₹" + c.feeAmount : "-"}</td>
      <td data-label="Frequency">${escapeHtmlAdmin(c.feeFrequency || "-")}</td>
      <td data-label="Action">
        <div class="action-btns">
          <button class="btn-edit" onclick="openFeeStructureModal('${c.id}')">
            <i class="fa-solid fa-pen"></i> Set Fee
          </button>
        </div>
      </td>
    `;

    feeClassesTableBody.appendChild(row);

  });

}

function openFeeStructureModal(classId) {

  const cls = allFeeClassRows.find(c => c.id === classId);
  if (!cls) return;

  document.getElementById("feeStructureClassId").value = classId;
  document.getElementById("feeStructureClassName").textContent = cls.className || classId;
  document.getElementById("feeStructureAmount").value = cls.feeAmount || "";
  document.getElementById("feeStructureFrequency").value = cls.feeFrequency || "Monthly";

  document.getElementById("feeStructureModalBackdrop").classList.add("open");

}
window.openFeeStructureModal = openFeeStructureModal;

function closeFeeStructureModal() {
  document.getElementById("feeStructureModalBackdrop").classList.remove("open");
}
window.closeFeeStructureModal = closeFeeStructureModal;

const feeStructureModalBackdropEl = document.getElementById("feeStructureModalBackdrop");
if (feeStructureModalBackdropEl) {
  feeStructureModalBackdropEl.addEventListener("click", function (e) {
    if (e.target === feeStructureModalBackdropEl) closeFeeStructureModal();
  });
}

async function saveFeeStructure() {

  const classId = document.getElementById("feeStructureClassId").value;
  const amount = Number(document.getElementById("feeStructureAmount").value);
  const frequency = document.getElementById("feeStructureFrequency").value;

  if (!classId || !amount) {
    alert("Please enter a valid fee amount.");
    return;
  }

  try {

    await setDoc(doc(db, "classes", classId), {
      feeAmount: amount,
      feeFrequency: frequency
    }, { merge: true });

    closeFeeStructureModal();
    await loadFeeClassesTable();

    alert("Fee structure updated successfully.");

  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.saveFeeStructure = saveFeeStructure;

// ==========================
// Student Fee Ledger
// ==========================

let currentFeeStudentRoll = null;

async function searchFeeStudent() {

  const roll = document.getElementById("feeStudentRoll").value.trim();
  const resultBox = document.getElementById("feeStudentResult");

  if (!roll) {
    alert("Please enter a Roll Number.");
    return;
  }

  resultBox.style.display = "block";
  resultBox.innerHTML = `<p class="no-class-msg">Searching...</p>`;

  try {

    const studentSnap = await getDoc(doc(db, "students", roll));

    if (!studentSnap.exists()) {
      resultBox.innerHTML = `<p class="no-class-msg">Roll Number "${escapeHtmlAdmin(roll)}" ka koi student nahi mila.</p>`;
      currentFeeStudentRoll = null;
      return;
    }

    const student = studentSnap.data();
    currentFeeStudentRoll = roll;

    const classData = await findClassDoc(student.class);
    const feeAmount = classData ? Number(classData.feeAmount) || 0 : 0;
    const feeFrequency = classData ? (classData.feeFrequency || "Monthly") : "Monthly";

    const paymentsSnap = await getDocs(
      query(collection(db, "students", roll, "payments"), orderBy("date", "desc"))
    );

    let totalPaid = 0;
    const pendingByPeriod = {};
    let paymentRowsHtml = "";

    if (paymentsSnap.empty) {
      paymentRowsHtml = `<tr><td colspan="4">Abhi koi payment record nahi hai.</td></tr>`;
    } else {
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

        const actionCell = trusted
          ? ""
          : `
            <div class="action-btns" style="margin-top:6px;">
              <button class="btn-edit" onclick="verifyPayment('${roll}', '${p.id}')"><i class="fa-solid fa-check"></i> Verify</button>
              <button class="btn-delete" onclick="rejectPayment('${roll}', '${p.id}')"><i class="fa-solid fa-xmark"></i> Reject</button>
            </div>
          `;
        const noteText = trusted
          ? escapeHtmlAdmin(pay.note || "-")
          : `${escapeHtmlAdmin(pay.note || "-")} <span class="status-inactive">Pending Verification</span>${actionCell}`;

        paymentRowsHtml += `
          <tr>
            <td data-label="Date">${dateText}</td>
            <td data-label="Amount">₹${pay.amount}</td>
            <td data-label="Mode">${escapeHtmlAdmin(pay.mode || "-")}</td>
            <td data-label="Note">${noteText}</td>
          </tr>
        `;
      });
    }

    // Month-by-month due, anchored to admission date — same logic
    // (and same fee-utils.js module) the Parent Portal uses, so
    // admin and parent never disagree on what's outstanding. Only
    // VERIFIED payments count as totalPaid here — a parent simply
    // clicking through the Pay Now flow does not, by itself, clear
    // a due period until admin verifies it below.
    const periods = generateBillingPeriods(student.admissionDate, feeFrequency, feeAmount);
    const periodsWithStatus = allocateDueStatus(periods, totalPaid).map((p) => {
      if (p.status !== "paid" && pendingByPeriod[p.key] > 0) {
        return { ...p, status: "pending" };
      }
      return p;
    });
    const outstanding = periodsWithStatus.filter((p) => p.status === "due" || p.status === "partial");

    let statusBadge;
    if (!feeAmount) {
      statusBadge = `<span class="status-inactive">Fee not set</span>`;
    } else if (outstanding.length === 0 && periodsWithStatus.some((p) => p.status === "pending")) {
      statusBadge = `<span class="status-inactive">Verification Pending</span>`;
    } else if (outstanding.length === 0) {
      statusBadge = `<span class="status-active">All Paid</span>`;
    } else {
      const totalDue = outstanding.reduce((sum, p) => sum + p.amountDue, 0);
      statusBadge = `<span class="status-inactive">Due ₹${totalDue}</span>`;
    }

    let dueListHtml = "";
    if (feeAmount && periods.length === 0) {
      dueListHtml = `<p class="no-class-msg">Admission Date set nahi hai, isliye month-wise due nahi dikhaya ja sakta. Edit Student se add karein.</p>`;
    } else if (feeAmount && periodsWithStatus.length) {
      dueListHtml = `
        <h3 class="form-section-title" style="font-size:13.5px;margin-top:16px;">Month-wise Status</h3>
        ${periodsWithStatus.map((p) => {
          if (p.status === "paid") {
            return `
              <div class="fee-period-row paid">
                <div>
                  <div class="fee-period-label">${escapeHtmlAdmin(p.label)}</div>
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
                  <div class="fee-period-label">${escapeHtmlAdmin(p.label)}</div>
                  <div class="fee-period-amount">₹${p.amount}</div>
                </div>
                <span class="status-inactive"><i class="fa-solid fa-hourglass-half"></i> Verification Pending</span>
              </div>
            `;
          }
          const badge = p.status === "partial"
            ? `<span class="status-inactive">Partially Paid — Due ₹${p.amountDue}</span>`
            : `<span class="status-inactive">Due ₹${p.amountDue}</span>`;
          return `
            <div class="fee-period-row ${p.status}">
              <div>
                <div class="fee-period-label">${escapeHtmlAdmin(p.label)}</div>
                <div class="fee-period-amount">₹${p.amount}</div>
              </div>
              ${badge}
            </div>
          `;
        }).join("")}
      `;
    }

    resultBox.innerHTML = `
      <div class="fee-student-summary">
        <div class="fee-student-who">
          <strong>${escapeHtmlAdmin(student.name || roll)}</strong>
          <span>${escapeHtmlAdmin(student.class || "-")} · Roll ${escapeHtmlAdmin(roll)}</span>
        </div>
        <div class="fee-student-amounts">
          <span>Fee: ₹${feeAmount || 0} / ${escapeHtmlAdmin(feeFrequency)}</span>
          <span>Paid (Verified): ₹${totalPaid}</span>
          ${statusBadge}
        </div>
        <button class="btn-add-class" onclick="openPaymentModal()">
         
