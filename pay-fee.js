import { db } from "./Firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { generateBillingPeriods, allocateDueStatus, findClassDoc, isPaymentVerified } from "./fee-utils.js?v=3";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Standard UPI deep link. Most UPI apps (GPay, PhonePe, Paytm,
// BHIM...) treat am= as fixed once passed this way, though this
// is ultimately controlled by whichever app the parent has
// installed, not by this website.
function buildUpiLink({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || "School",
    am: String(amount),
    cu: "INR",
    tn: note || "School Fee"
  });
  return `upi://pay?${params.toString()}`;
}

// ==========================================================
// Session guard - this page only makes sense inside a parent
// session (it always returns to parent-dashboard.html).
// ==========================================================
if (localStorage.getItem("parentLoggedIn") !== "true") {
  alert("Session Expired. Please Login Again.");
  window.location.href = "parent-login.html";
  throw new Error("Not Logged In");
}

const params = new URLSearchParams(window.location.search);
const roll = params.get("roll");
const periodKey = params.get("period");

const content = document.getElementById("payContent");

function renderState(iconClass, message) {
  content.innerHTML = `
    <div class="pay-state-msg">
      <i class="fa-solid ${iconClass}"></i>
      ${message}
    </div>
  `;
}

async function init() {
  if (!roll || !periodKey) {
    renderState("fa-triangle-exclamation", "The payment link is not valid. Please try again from the dashboard.");
    return;
  }

  let studentSnap;
  try {
    studentSnap = await getDoc(doc(db, "students", roll));
  } catch (error) {
    console.error(error);
    renderState("fa-triangle-exclamation", "Could not load data: " + escapeHtml(error.message));
    return;
  }

  if (!studentSnap.exists()) {
    renderState("fa-triangle-exclamation", "Student record not found.");
    return;
  }

  const student = studentSnap.data();

  // Re-derive everything fresh from Firestore - the amount is
  // NEVER read from the URL, so it can't be edited by changing
  // the link.
  const classData = await findClassDoc(student.class);
  const feeAmount = classData ? Number(classData.feeAmount) || 0 : 0;
  const feeFrequency = classData ? (classData.feeFrequency || "Monthly") : "Monthly";

  if (!feeAmount) {
    renderState("fa-triangle-exclamation", "The fee for this class has not been set yet. Please contact the tuition office.");
    return;
  }

  const paymentsSnap = await getDocs(
    query(collection(db, "students", roll, "payments"), orderBy("date", "desc"))
  );

  let totalPaid = 0;
  let alreadyPendingAmount = 0;

  paymentsSnap.forEach((p) => {
    const pay = p.data();
    const amt = Number(pay.amount) || 0;
    if (isPaymentVerified(pay)) {
      totalPaid += amt;
    } else if (pay.periodKey === periodKey) {
      alreadyPendingAmount += amt;
    }
  });

  const periods = generateBillingPeriods(student.admissionDate, feeFrequency, feeAmount);
  const periodsWithStatus = allocateDueStatus(periods, totalPaid);
  const period = periodsWithStatus.find((p) => p.key === periodKey);

  if (!period) {
    renderState("fa-circle-info", "This billing period was not found.");
    return;
  }

  if (period.status === "paid") {
    content.innerHTML = `
      <div class="pay-card">
        <div class="pay-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div class="pay-who">${escapeHtml(student.name || roll)} · Roll ${escapeHtml(roll)}</div>
        <div class="pay-period">${escapeHtml(period.label)}</div>
        <p class="pay-confirm-hint">This payment has already been made. Nothing more to do.</p>
        <a href="parent-dashboard.html" class="pay-back" style="justify-content:center;">
          <i class="fa-solid fa-arrow-left"></i> Go to dashboard
        </a>
      </div>
    `;
    return;
  }

  if (alreadyPendingAmount >= period.amountDue) {
    content.innerHTML = `
      <div class="pay-card">
        <div class="pay-icon" style="background:#d97706;"><i class="fa-solid fa-hourglass-half"></i></div>
        <div class="pay-who">${escapeHtml(student.name || roll)} · Roll ${escapeHtml(roll)}</div>
        <div class="pay-period">${escapeHtml(period.label)}</div>
        <p class="pay-confirm-hint">You have already reported the payment for this month. It will show as "Paid" once the admin verifies it.</p>
        <a href="parent-dashboard.html" class="pay-back" style="justify-content:center;">
          <i class="fa-solid fa-arrow-left"></i> Go to dashboard
        </a>
      </div>
    `;
    return;
  }

  const amountDue = period.amountDue;

  // Payment settings (UPI VPA) - admin-configured, read-only here.
  let upiId = "";
  let payeeName = "Modern International School";
  try {
    const settingsSnap = await getDoc(doc(db, "settings", "payment"));
    if (settingsSnap.exists()) {
      upiId = settingsSnap.data().upiId || "";
      payeeName = settingsSnap.data().payeeName || payeeName;
    }
  } catch (error) {
    console.error(error);
  }

  if (!upiId) {
    content.innerHTML = `
      <div class="pay-card">
        <div class="pay-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="pay-who">${escapeHtml(student.name || roll)} · Roll ${escapeHtml(roll)}</div>
        <div class="pay-period">${escapeHtml(period.label)} - Due ₹${amountDue}</div>
        <p class="pay-confirm-hint">Online (UPI) payment has not been set up yet. Please contact the tuition office to pay.</p>
      </div>
    `;
    return;
  }

  const upiLink = buildUpiLink({
    upiId,
    payeeName,
    amount: amountDue,
    note: `${student.name || roll} Roll ${roll} - ${period.label}`
  });

  content.innerHTML = `
    <div class="pay-card">
      <div class="pay-icon"><i class="fa-solid fa-indian-rupee-sign"></i></div>
      <div class="pay-who">${escapeHtml(student.name || roll)} · ${escapeHtml(student.class || "-")} · Roll ${escapeHtml(roll)}</div>
      <div class="pay-period">${escapeHtml(period.label)}</div>

      <div class="pay-amount-label">Amount Due</div>
      <div class="pay-amount">₹${amountDue}</div>
      <div class="pay-amount-lock"><i class="fa-solid fa-lock"></i> This amount is fixed and cannot be edited</div>

      <a class="btn-upi" id="upiPayBtn" href="${upiLink}">
        <i class="fa-solid fa-mobile-screen-button"></i> Pay ₹${amountDue} via UPI App
      </a>

      <div class="pay-divider"><span class="line"></span><span>THEN</span><span class="line"></span></div>

      <p class="pay-confirm-hint">
        Press the button below only after you finish the payment in your UPI app. The payment will not show as "Paid" immediately:
        <strong>the admin will verify it</strong> against the bank or UPI statement, and only then will the status change to "Paid".
      </p>

      <button type="button" class="btn-confirm-paid" id="confirmPaidBtn" disabled>
        <i class="fa-solid fa-paper-plane"></i> Report Payment (for verification)
      </button>

      <a href="parent-dashboard.html" class="pay-cancel">Cancel, back to dashboard</a>
    </div>
  `;

  const upiBtn = document.getElementById("upiPayBtn");
  const confirmBtn = document.getElementById("confirmPaidBtn");

  // Soft nudge: the report step only unlocks after the parent has
  // actually opened the UPI app at least once from this page. This
  // is NOT a security check (clicking the link doesn't prove the
  // payment went through) - the real safeguard is that this write
  // is marked verified:false and excluded from Paid/Due math until
  // an admin confirms it.
  upiBtn.addEventListener("click", () => {
    confirmBtn.disabled = false;
  });

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    try {
      await addDoc(collection(db, "students", roll, "payments"), {
        amount: amountDue,
        date: Timestamp.now(),
        mode: "UPI",
        note: `Self-reported via Parent Portal - ${period.label}`,
        source: "parent_portal",
        periodKey: period.key,
        verified: false,
        recordedAt: Timestamp.now()
      });

      content.innerHTML = `
        <div class="pay-card">
          <div class="pay-icon" style="background:#d97706;"><i class="fa-solid fa-hourglass-half"></i></div>
          <div class="pay-period">Payment Reported</div>
          <p class="pay-confirm-hint">Your payment of ₹${amountDue} for ${escapeHtml(period.label)} has been reported. It will show as "Paid" once the admin verifies it. Taking you back to the dashboard...</p>
        </div>
      `;

      setTimeout(() => {
        window.location.href = "parent-dashboard.html";
      }, 2000);

    } catch (error) {
      console.error(error);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Report Payment (for verification)`;
      alert("Could not report the payment: " + error.message);
    }
  });
}

init();
