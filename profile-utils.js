// Small helpers shared by the profile edit pages and the admin approval page.

export const STUDENT_EDITABLE_KEYS = [
  "name", "father", "mother", "dob", "gender",
  "contactNumber", "altContact", "parentEmail", "address", "previousSchool"
];

export const FIELD_LABELS = {
  name: "Student name",
  father: "Father's name",
  mother: "Mother's name",
  dob: "Date of birth",
  gender: "Gender",
  contactNumber: "Registered mobile number",
  altContact: "Alternate mobile number",
  parentEmail: "Parent email",
  address: "Address",
  previousSchool: "Previous school"
};

export function escapeHtml(str) {
  return String(str === undefined || str === null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Keep only digits; drop a leading country code so +91 98765 43210 becomes 9876543210.
export function normalizeMobile(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export function isValidMobile(value) {
  return /^[6-9]\d{9}$/.test(normalizeMobile(value));
}

export function isValidEmail(value) {
  return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(String(value || "").trim());
}

// Accepts yyyy-mm-dd or dd-mm-yyyy (or with /) and returns yyyy-mm-dd, or "".
export function toISODateInput(value) {
  if (!value) return "";
  let v = value;
  if (v && typeof v.toDate === "function") v = v.toDate().toISOString().slice(0, 10);
  const str = String(v).trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  return "";
}

export function isPlausibleBirthDate(iso, minAge, maxAge) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age--;
  return age >= minAge && age <= maxAge;
}

export function formatDisplayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "-";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
