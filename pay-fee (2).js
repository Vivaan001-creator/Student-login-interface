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
// Session guard — this page only makes sense inside a parent
// session (it always returns to parent-dashboard.html).
// ==========================================================
if (sessionStorage.getItem("parentLoggedIn") !== "true") {
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
    renderState("fa-triangle-exclamation", "Payment link theek nahi hai. Dashboard se dobara try karein.");
    return;
  }

  let studentSnap;
  try {
    studentSnap = await getDoc(doc(db, "students", roll));
  } catch (error) {
    console.error(error);
    renderState("fa-triangle-exclamation", "Data load nahi ho paaya: " + escapeHtml(error.message));
    return;
  }

  if (!studentSnap.exists()) {
    renderState("fa-triangle-exclamation", "Student record nahi mila.");
    return;
  }

  const student = studentSnap.data();

  // Re-derive everything fresh from Firestore — the amount is
  // NEVER read from the URL, so it can't be edited by changing
  // the link.
  const classData = await findClassDoc(student.class);
  const feeAmount = classData ? Number(classData.feeAmount) || 0 : 0;
  const feeFrequency = classData ? (classData.feeFrequency || "Monthly") : "Monthly";

  if (!feeAmount) {
    renderState("fa-triangle-exclamation", "Is class ke liye fee abhi set nahi hui hai. School office se sampark karein.");
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
    renderState("fa-circle-info", "Yeh billing period nahi mila.");
    return;
  }

  if (period.status === "paid") {
    content.innerHTML = `
      <div class="pay-card">
        <div class="pay-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div class="pay-who">${escapeHtml(student.name || roll)} · Roll ${escapeHtml(roll)}</div>
        <div class="pay-period">${escapeHtml(period.label)}</div>
        <p class="pay-confirm-hint">Yeh payment already ho chuka hai — kuch aur karne ki zaroorat nahi.</p>
        <a href="parent-dashboard.html" class="pay-back" style="justify-content:center;">
          <i class="fa-solid fa-arrow-left"></i> Dashboard par jaayein
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
        <p class="pay-confirm-hint">Aap is month ka payment pehle hi report kar chuke hain. School admin verify karne ke baad yeh "Paid" dikhega.</p>
        <a href="parent-dashboard.html" class="pay-back" style="justify-content:center;">
          <i class="fa-solid fa-arrow-left"></i> Dashboard par jaayein
        </a>
      </div>
    `;
    return;
  }

  const amountDue = period.amountDue;

  // Payment settings (UPI VPA) — admin-configured, read-only here.
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
        <div class="pay-period">${escapeHtml(period.label)} — Due ₹${amountDue}</div>
        <p class="pay-confirm-hint">School ne abhi online (UPI) payment set up nahi kiya hai. Kripya school office mein sampark karke payment karein.</p>
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
      <div class="pay-amount-lock"><i class="fa-solid fa-lock"></i> Yeh amount fixed hai, isko edit nahi kiya ja sakta</div>

      <a class="btn-upi" id="upiPayBtn" href="${upiLink}">
        <i class="fa-solid fa-mobile-screen-button"></i> Pay ₹${amountDue} via UPI App
      </a>

      <div class="pay-divider"><span class="line"></span><span>PHIR</span><span class="line"></span></div>

      <p class="pay-confirm-hint">
        UPI app mein payment poora karne ke baad hi neeche wala button dabayein. Yeh payment turant "Paid" nahi dikhega —
        <strong>school admin verify karega</strong> (apne bank/UPI statement se match karke), uske baad hi status "Paid" mein badlega.
      </p>

      <button type="button" class="btn-confirm-paid" id="confirmPaidBtn" disabled>
        <i class="fa-solid fa-paper-plane"></i> Payment Report Karein (Verification ke liye)
      </button>

      <a href="parent-dashboard.html" class="pay-cancel">Cancel, Dashboard par vaapas jaayein</a>
    </div>
  `;

  const upiBtn = document.getElementById("upiPayBtn");
  const confirmBtn = document.getElementById("confirmPaidBtn");

  // Soft nudge: the report step only unlocks after the parent has
  // actually opened the UPI app at least once from this page. This
  // is NOT a security check (clicking the link doesn't prove the
  // payment went through) — the real safeguard is that this write
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
        note: `Self-reported via Parent Portal — ${period.label}`,
        source: "parent_portal",
        periodKey: period.key,
        verified: false,
        recordedAt: Timestamp.now()
      });

      content.innerHTML = `
        <div class="pay-card">
          <div class="pay-icon" style="background:#d97706;"><i class="fa-solid fa-hourglass-half"></i></div>
          <div class="pay-period">Payment Reported</div>
          <p class="pay-confirm-hint">${escapeHtml(period.label)} ka ₹${amountDue} payment report ho gaya hai. School admin verify karne ke baad yeh "Paid" dikhega. Dashboard par redirect kiya ja raha hai...</p>
        </div>
      `;

      setTimeout(() => {
        window.location.href = "parent-dashboard.html";
      }, 2000);

    } catch (error) {
      console.error(error);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Payment Report Karein (Verification ke liye)`;
      alert("Payment report nahi ho paaya: " + error.message);
    }
  });
}

init();
