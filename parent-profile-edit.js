// Parent edits the child's profile. The parent is not a Firebase user, so the
// changes are sent as a request that the admin approves (see profile-requests.js).
import { db } from "./Firebase.js";
import { doc, getDoc, addDoc, collection, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { STUDENT_EDITABLE_KEYS, normalizeMobile, isValidMobile, isValidEmail,
  toISODateInput, isPlausibleBirthDate, formatDisplayDate } from "./profile-utils.js";
import { $, value, setValue, setError, clearErrors, focusFirstError, fixedRows, showForm, showLoadError } from "./profile-form.js";

const roll = localStorage.getItem("parentActiveRoll");
const contact = localStorage.getItem("parentContact");
const REQ_KEY = "profileRequest_" + roll;
const FIELD_KEYS = ["name", "dob", "gender", "previousSchool", "address", "father", "mother", "contactNumber", "altContact", "parentEmail"];
let current = null;

function currentValue(key) {
  const s = current || {};
  switch (key) {
    case "name": return String(s.name || s.studentName || "").trim();
    case "dob": return toISODateInput(s.dob);
    case "contactNumber": return normalizeMobile(s.contactNumber);
    case "altContact": return normalizeMobile(s.altContact);
    default: return String(s[key] === undefined || s[key] === null ? "" : s[key]).trim();
  }
}

function newValue(key) {
  if (key === "contactNumber" || key === "altContact") return normalizeMobile(value(key));
  return value(key);
}

function validate() {
  clearErrors(FIELD_KEYS.concat(["consent"]));
  const problems = [];
  const bad = (key, msg) => { setError(key, msg); problems.push(key); };

  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value("name"))) bad("name", "Enter the student's full name (letters only).");
  if (!isPlausibleBirthDate(value("dob"), 2, 25)) bad("dob", "Enter a valid date of birth.");
  if (!value("gender")) bad("gender", "Select a gender.");
  if (value("address").length < 10) bad("address", "Enter the full home address (at least 10 characters).");
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value("father"))) bad("father", "Enter the father's name (letters only).");
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value("mother"))) bad("mother", "Enter the mother's name (letters only).");
  if (!isValidMobile(value("contactNumber"))) bad("contactNumber", "Enter a valid 10 digit mobile number.");
  if (value("altContact")) {
    if (!isValidMobile(value("altContact"))) bad("altContact", "Enter a valid 10 digit mobile number, or leave it empty.");
    else if (normalizeMobile(value("altContact")) === normalizeMobile(value("contactNumber"))) bad("altContact", "The alternate number must be different from the registered number.");
  }
  if (!isValidEmail(value("parentEmail"))) bad("parentEmail", "Enter a valid email address.");
  if (!$("f_consent").checked) { $("e_consent").textContent = "Please confirm before sending."; problems.push("consent"); }
  return problems;
}

async function init() {
  if (!roll || !contact) { window.location.replace("parent-login.html"); return; }
  try {
    const snap = await getDoc(doc(db, "students", roll));
    if (!snap.exists()) {
      alert("No student record found. Please log in again.");
      window.location.replace("parent-login.html");
      return;
    }
    current = snap.data();
    if (normalizeMobile(current.contactNumber) !== normalizeMobile(contact)) {
      alert("Your session has expired. Please log in again.");
      window.location.replace("parent-login.html");
      return;
    }

    fixedRows([
      ["Roll number", roll],
      ["Class", current.class || "-"],
      ["Section", current.section || "-"],
      ["Admission date", current.admissionDate ? formatDisplayDate(toISODateInput(current.admissionDate)) : "-"]
    ]);

    FIELD_KEYS.forEach((k) => setValue(k, currentValue(k)));
    showForm();
    $("requestInfo").hidden = false;

    // One request at a time, so the office is not asked to approve conflicting edits.
    const savedId = localStorage.getItem(REQ_KEY);
    if (savedId) {
      try {
        const reqSnap = await getDoc(doc(db, "profileRequests", savedId));
        if (reqSnap.exists() && reqSnap.data().status === "pending") {
          const n = $("pendingNotice");
          n.hidden = false;
          n.innerHTML = "<strong>A request is waiting for approval</strong>Your earlier changes have not been reviewed yet. You can send new changes after they are approved or declined.";
          $("saveBtn").disabled = true;
        }
      } catch (e) { /* status is optional; ignore */ }
    }
  } catch (error) {
    console.error(error);
    showLoadError("Could not load the profile. Please go back and try again.");
  }
}

$("editForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const problems = validate();
  if (problems.length) { focusFirstError(problems); return; }

  const changes = {}, previous = {};
  STUDENT_EDITABLE_KEYS.forEach((k) => {
    if (!FIELD_KEYS.includes(k)) return;
    const next = newValue(k), prev = currentValue(k);
    if (next !== prev) { changes[k] = next; previous[k] = prev; }
  });

  if (!Object.keys(changes).length) {
    alert("You have not changed anything.");
    return;
  }

  const btn = $("saveBtn");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "Sending...";
  try {
    const ref = await addDoc(collection(db, "profileRequests"), {
      roll,
      studentName: currentValue("name"),
      changes,
      previous,
      status: "pending",
      createdAt: serverTimestamp(),
      requestedBy: "parent"
    });
    localStorage.setItem(REQ_KEY, ref.id);
    alert("Your changes were sent for approval. They will appear on the profile once the tuition office approves them.");
    window.location.href = "parent-dashboard.html";
  } catch (error) {
    console.error(error);
    btn.disabled = false;
    btn.textContent = label;
    alert("Could not send your changes. Please check your internet connection and try again.");
  }
});

init();
