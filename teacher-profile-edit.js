// A signed-in teacher edits their own profile. The security rules only allow the
// fields listed in SAVE_KEYS, so status, subject, ID and login email stay fixed.
import { db } from "./Firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { normalizeMobile, isValidMobile, isValidEmail, toISODateInput, isPlausibleBirthDate } from "./profile-utils.js";
import { $, value, setValue, setError, clearErrors, focusFirstError, fixedRows, showForm, showLoadError } from "./profile-form.js";

const teacherId = localStorage.getItem("teacherDocId");
const KEYS = ["name", "dob", "gender", "address", "phone", "contactEmail", "qualification", "experience", "summary"];

async function init() {
  if (!teacherId) { window.location.replace("teacher-login.html"); return; }
  try {
    const snap = await getDoc(doc(db, "teachers", teacherId));
    if (!snap.exists()) { showLoadError("Teacher record not found. Please log in again."); return; }
    const t = snap.data();
    fixedRows([
      ["Teacher ID", t.employeeId || teacherId],
      ["Subject", t.subject || "-"],
      ["Status", t.status || "-"],
      ["Login email", t.email || "-"]
    ]);
    setValue("name", t.name || t.teacherName || "");
    setValue("dob", toISODateInput(t.dob));
    setValue("gender", t.gender || "");
    setValue("address", t.address || "");
    setValue("phone", normalizeMobile(t.phone));
    setValue("contactEmail", t.contactEmail || "");
    setValue("qualification", t.qualification || "");
    setValue("experience", t.experience || "");
    setValue("summary", t.summary || "");
    showForm();
  } catch (error) {
    console.error(error);
    showLoadError("Could not load your profile. Please go back and try again.");
  }
}

function validate() {
  clearErrors(KEYS);
  const problems = [];
  const bad = (k, m) => { setError(k, m); problems.push(k); };
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value("name"))) bad("name", "Enter your full name (letters only).");
  if (!isPlausibleBirthDate(value("dob"), 18, 80)) bad("dob", "Enter a valid date of birth.");
  if (!value("gender")) bad("gender", "Select a gender.");
  if (value("address").length < 10) bad("address", "Enter your full address (at least 10 characters).");
  if (!isValidMobile(value("phone"))) bad("phone", "Enter a valid 10 digit mobile number.");
  if (!isValidEmail(value("contactEmail"))) bad("contactEmail", "Enter a valid email address.");
  return problems;
}

$("editForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const problems = validate();
  if (problems.length) { focusFirstError(problems); return; }

  const btn = $("saveBtn");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "Saving...";
  try {
    await updateDoc(doc(db, "teachers", teacherId), {
      name: value("name"),
      dob: value("dob"),
      gender: value("gender"),
      address: value("address"),
      phone: normalizeMobile(value("phone")),
      contactEmail: value("contactEmail"),
      qualification: value("qualification"),
      experience: value("experience"),
      summary: value("summary")
    });
    alert("Your profile was updated.");
    window.location.href = "teacher-dashboard.html";
  } catch (error) {
    console.error(error);
    btn.disabled = false;
    btn.textContent = label;
    alert("Could not save your profile. Please check your internet connection and try again.");
  }
});

init();
