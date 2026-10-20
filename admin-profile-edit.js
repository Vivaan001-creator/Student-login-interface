// The admin edits their own profile. It is stored in appMeta/adminProfile, which
// only the admin can read or write.
import { db, auth } from "./Firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { normalizeMobile, isValidMobile, isValidEmail, toISODateInput, isPlausibleBirthDate } from "./profile-utils.js";
import { $, value, setValue, setError, clearErrors, focusFirstError, fixedRows, showForm, showLoadError } from "./profile-form.js";

const KEYS = ["name", "dob", "gender", "address", "phone", "contactEmail", "about"];
const ref = doc(db, "appMeta", "adminProfile");

function start(user) {
  fixedRows([["Login email", user.email || "-"], ["Role", "Admin"]]);
  getDoc(ref).then((snap) => {
    const p = snap.exists() ? snap.data() : {};
    setValue("name", p.name || "");
    setValue("dob", toISODateInput(p.dob));
    setValue("gender", p.gender || "");
    setValue("address", p.address || "");
    setValue("phone", normalizeMobile(p.phone));
    setValue("contactEmail", p.contactEmail || user.email || "");
    setValue("about", p.about || "");
    showForm();
  }).catch((error) => {
    console.error(error);
    showLoadError("Could not load your profile. Please go back and try again.");
  });
}

const unsub = onAuthStateChanged(auth, (user) => {
  unsub();
  if (!user) { window.location.replace("admin.html"); return; }
  start(user);
});

function validate() {
  clearErrors(KEYS);
  const problems = [];
  const bad = (k, m) => { setError(k, m); problems.push(k); };
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u.test(value("name"))) bad("name", "Enter your full name (letters only).");
  if (!isPlausibleBirthDate(value("dob"), 18, 90)) bad("dob", "Enter a valid date of birth.");
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
    await setDoc(ref, {
      name: value("name"),
      dob: value("dob"),
      gender: value("gender"),
      address: value("address"),
      phone: normalizeMobile(value("phone")),
      contactEmail: value("contactEmail"),
      about: value("about"),
      updatedAt: serverTimestamp()
    }, { merge: true });
    alert("Your profile was updated.");
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error(error);
    btn.disabled = false;
    btn.textContent = label;
    alert("Could not save your profile. Please check your internet connection and try again.");
  }
});
