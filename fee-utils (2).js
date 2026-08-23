import { db } from "./Firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================================================
// Shared fee-calculation helpers
//
// Used by parent.js (to render the month-by-month Due list on
// the Parent Dashboard) AND pay-fee.js (to independently
// recompute the exact amount for one period right before
// writing a payment — never trusts an amount handed to it via
// a URL, always re-derives it from Firestore).
// ==========================================================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Normalizes "Class 3" / "class 3" / "3" all to the same key.
// Admin's Add Student form saves student.class as the full
// display text (e.g. "Class 3"), while a class document's own
// id (used by homework.classId, fee structure, etc.) is usually
// just "3" — this bridges the two everywhere it's needed.
export function classKeyOf(value) {
  return String(value || "").trim().toLowerCase().replace(/^class\s*/, "");
}

// Looks up a class document either by its exact id (fast path,
// works once data is keyed consistently) or, failing that, by
// scanning and normalizing every class id — so Fee Status still
// works correctly even when a student's class is stored as
// "Class 3" but the class document's id is "3".
export async function findClassDoc(classValue) {
  if (!classValue) return null;

  const directSnap = await getDoc(doc(db, "classes", classValue));
  if (directSnap.exists()) return directSnap.data();

  const targetKey = classKeyOf(classValue);
  const allSnap = await getDocs(collection(db, "classes"));
  const match = allSnap.docs.find((d) => classKeyOf(d.id) === targetKey);
  return match ? match.data() : null;
}

// Accepts dd-mm-yyyy OR yyyy-mm-dd (admission date can be typed
// as text or picked from the native date input, which always
// submits yyyy-mm-dd regardless of what's displayed) and returns
// a canonical yyyy-mm-dd string.
export function toISODate(value) {
  if (!value) return "";
  const str = String(value).trim();

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  return "";
}

// Builds the list of billing periods from admission date through
// the current period (inclusive), anchored to the admission
// month — NOT the calendar month/quarter/year — so a mid-year
// admission doesn't produce a lopsided first period.
//
// frequency: "Monthly" | "Quarterly" | "Annual"
// Returns: [{ key, label, amount }]
export function generateBillingPeriods(admissionDateRaw, frequency, feeAmount) {
  const admissionISO = toISODate(admissionDateRaw);
  if (!admissionISO || !feeAmount) return [];

  const [ay, am] = admissionISO.split("-").map(Number);
  if (!ay || !am) return [];

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  const monthsPerPeriod = frequency === "Quarterly" ? 3 : frequency === "Annual" ? 12 : 1;

  const totalMonthsElapsed = (cy - ay) * 12 + (cm - am) + 1;
  if (totalMonthsElapsed <= 0) return [];

  // Sanity cap so a bad/very old admission date can't generate
  // thousands of rows — 30 years of monthly periods is already
  // far more than this app will ever need.
  const periodCount = Math.min(Math.ceil(totalMonthsElapsed / monthsPerPeriod), 360);

  const periods = [];

  for (let i = 0; i < periodCount; i++) {
    const startMonthIndex0 = (am - 1) + i * monthsPerPeriod;
    const startYear = ay + Math.floor(startMonthIndex0 / 12);
    const startMonth = (startMonthIndex0 % 12) + 1;

    const endMonthIndex0 = startMonthIndex0 + monthsPerPeriod - 1;
    const endYear = ay + Math.floor(endMonthIndex0 / 12);
    const endMonth = (endMonthIndex0 % 12) + 1;

    const key = `${startYear}-${String(startMonth).padStart(2, "0")}`;
    const label = monthsPerPeriod === 1
      ? `${MONTH_NAMES[startMonth - 1]} ${startYear}`
      : `${MONTH_NAMES[startMonth - 1]} ${startYear} – ${MONTH_NAMES[endMonth - 1]} ${endYear}`;

    periods.push({ key, label, amount: feeAmount });
  }

  return periods;
}

// Walks the periods oldest-first and allocates the total amount
// paid so far against them (FIFO) — this is what lets a single
// lump-sum payment automatically clear the oldest outstanding
// period(s) without payments needing to be tagged to a specific
// month up front.
// Returns periods annotated with { status: 'paid'|'partial'|'due', amountDue }
export function allocateDueStatus(periods, totalPaid) {
  let pool = Number(totalPaid) || 0;

  return periods.map((p) => {
    let status;
    let amountDue;

    if (pool >= p.amount) {
      status = "paid";
      amountDue = 0;
      pool -= p.amount;
    } else if (pool > 0) {
      status = "partial";
      amountDue = p.amount - pool;
      pool = 0;
    } else {
      status = "due";
      amountDue = p.amount;
    }

    return { ...p, status, amountDue };
  });
}

// A payment only counts toward "Paid" if it's trusted:
//  - explicitly verified (admin approved it), or
//  - recorded directly by admin (source !== "parent_portal"),
//    since admin only logs a payment after actually seeing the
//    money (cash, bank transfer, etc.) — that's the school's
//    existing trust boundary, unchanged by this feature.
// A parent simply clicking "Maine Payment Kar Diya" on the Pay
// Now flow is NOT, by itself, proof that money moved — so those
// self-reports stay "pending" until admin confirms them, and are
// deliberately excluded from the Paid/Due calculation until then.
export function isPaymentVerified(pay) {
  if (pay.verified === true) return true;
  if (pay.verified === false) return false;
  return pay.source !== "parent_portal";
}

// Standard UPI deep link. Most UPI apps (GPay, PhonePe, Paytm,
// BHIM...) treat am= as fixed once passed this way, though this
// is ultimately controlled by whichever app the parent has
// installed, not by this website.
export function buildUpiLink({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || "School",
    am: String(amount),
    cu: "INR",
    tn: note || "School Fee"
  });
  return `upi://pay?${params.toString()}`;
}
