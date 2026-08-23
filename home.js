import { db } from "./Firebase.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  getCountFromServer,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================
// Helpers
// ==========================
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ==========================
// Nav: shadow on scroll
// ==========================
const nav = document.getElementById("hpNav");

function updateNavShadow() {
  if (!nav) return;
  if (window.scrollY > 12) nav.classList.add("hp-scrolled");
  else nav.classList.remove("hp-scrolled");
}
window.addEventListener("scroll", updateNavShadow);
updateNavShadow();

// ==========================
// Mobile menu toggle
// ==========================
const menu = document.getElementById("hpMenu");
const navToggle = document.getElementById("hpNavToggle");
const navBackdrop = document.getElementById("hpNavBackdrop");

function closeMobileMenu() {
  menu?.classList.remove("open");
  navBackdrop?.classList.remove("open");
}

navToggle?.addEventListener("click", () => {
  menu?.classList.toggle("open");
  navBackdrop?.classList.toggle("open");
});
navBackdrop?.addEventListener("click", closeMobileMenu);
menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMobileMenu));

// ==========================
// Scroll reveal
// ==========================
const revealEls = document.querySelectorAll(".hp-reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in-view"));
}

// ==========================
// School Profile (name, principal, address, phone, email, website)
// ==========================
async function loadSchoolInfo() {
  try {
    const snap = await getDoc(doc(db, "settings", "schoolProfile"));
    if (!snap.exists()) return;

    const data = snap.data();

    if (data.principalName) {
      setText("principalNameText", data.principalName);
    }

    if (data.schoolAddress) {
      setText("contactAddress", data.schoolAddress);
      const footerAddrSpan = document.querySelector("#footerAddress span");
      if (footerAddrSpan) footerAddrSpan.textContent = data.schoolAddress;
    }
    if (data.schoolPhone) {
      setText("contactPhone", data.schoolPhone);
      const footerPhoneSpan = document.querySelector("#footerPhone span");
      if (footerPhoneSpan) footerPhoneSpan.textContent = data.schoolPhone;
    }
    if (data.schoolEmail) {
      setText("contactEmail", data.schoolEmail);
      const footerEmailSpan = document.querySelector("#footerEmail span");
      if (footerEmailSpan) footerEmailSpan.textContent = data.schoolEmail;
    }
    if (data.schoolWebsite) {
      setText("contactWebsite", data.schoolWebsite);
    }

    const mapFrame = document.getElementById("contactMap");
    if (mapFrame && (data.schoolAddress || data.schoolName)) {
      const q = encodeURIComponent(data.schoolAddress || data.schoolName);
      mapFrame.src = `https://www.google.com/maps?q=${q}&output=embed`;
    }

  } catch (error) {
    console.error("Could not load school profile:", error);
  }
}

loadSchoolInfo();

// ==========================
// Hero stats (live counts)
// ==========================
async function loadStat(collectionName, elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  try {
    const snap = await getCountFromServer(collection(db, collectionName));
    el.textContent = snap.data().count;
  } catch (error) {
    try {
      const snap = await getDocs(collection(db, collectionName));
      el.textContent = snap.size;
    } catch (innerError) {
      el.textContent = "0";
    }
  }
}

loadStat("students", "statStudents");
loadStat("teachers", "statTeachers");
loadStat("classes", "statClasses");

// ==========================
// Academic wings (grouped from real class data)
// ==========================
const wingMeta = [
  { name: "Primary Wing", icon: "fa-graduation-cap", color: "purple" },
  { name: "Middle Wing", icon: "fa-calculator", color: "blue" },
  { name: "Secondary Wing", icon: "fa-flask", color: "green" },
  { name: "Senior Wing", icon: "fa-star", color: "orange" }
];

async function loadWings() {
  const grid = document.getElementById("wingsGrid");
  if (!grid) return;

  try {
    const snap = await getDocs(collection(db, "classes"));
    if (snap.empty) return; // keep the static fallback cards already in the HTML

    const byWing = {};
    snap.forEach((docSnap) => {
      const c = docSnap.data();
      const wing = c.wing || "Primary Wing";
      if (!byWing[wing]) byWing[wing] = [];
      byWing[wing].push(c.className || docSnap.id);
    });

    grid.innerHTML = wingMeta.map((w) => {
      const classes = byWing[w.name] || [];
      const body = classes.length
        ? `<div class="hp-wing-classes">${classes.map((c) => `<span class="hp-wing-chip">${escapeHtml(c)}</span>`).join("")}</div>`
        : `<p class="hp-wing-note">Class details coming soon.</p>`;

      return `
        <div class="hp-wing-card">
          <div class="hp-wing-icon ${w.color}"><i class="fa-solid ${w.icon}"></i></div>
          <h4>${w.name}</h4>
          ${body}
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Could not load classes:", error);
  }
}

loadWings();

// ==========================
// Notices
// ==========================
async function loadNotices() {
  const list = document.getElementById("noticeList");
  if (!list) return;

  const fallback = [
    { title: "Admissions Open", desc: "Admissions for the new academic session are open — enquire at the school office.", day: "•", month: "Info" },
    { title: "Timings Updated", desc: "Please check the latest circular for the current school timings.", day: "•", month: "Info" },
    { title: "Parent-Teacher Meeting", desc: "The next PTM schedule will be shared through your child's class teacher.", day: "•", month: "Info" }
  ];

  function render(notices) {
    list.innerHTML = notices.map((n) => `
      <div class="hp-notice-item">
        <div class="hp-notice-date">
          <span class="d">${escapeHtml(n.day)}</span>
          <span class="m">${escapeHtml(n.month)}</span>
        </div>
        <div>
          <h4>${escapeHtml(n.title)}</h4>
          <p>${escapeHtml(n.desc)}</p>
        </div>
      </div>
    `).join("");
  }

  try {
    const notesQuery = query(collection(db, "notices"), orderBy("date", "desc"), limit(5));
    const snap = await getDocs(notesQuery);

    if (snap.empty) {
      render(fallback);
      return;
    }

    const notices = snap.docs.map((docSnap) => {
      const n = docSnap.data();
      let day = "•";
      let month = "Info";

      if (n.date && typeof n.date.toDate === "function") {
        const d = n.date.toDate();
        day = String(d.getDate());
        month = d.toLocaleString("en-US", { month: "short" });
      }

      return {
        title: n.title || "Notice",
        desc: n.description || "",
        day,
        month
      };
    });

    render(notices);

  } catch (error) {
    console.error("Could not load notices, showing defaults:", error);
    render(fallback);
  }
}

loadNotices();

// ==========================
// Gallery (falls back to the static illustrated tiles already in the HTML)
// ==========================
const galleryTileMeta = {
  "Sports Day": { icon: "fa-trophy", color: "orange" },
  "Annual Function": { icon: "fa-masks-theater", color: "pink" },
  "Science Exhibition": { icon: "fa-flask", color: "blue" },
  "Independence Day": { icon: "fa-flag", color: "green" },
  "Art & Craft": { icon: "fa-palette", color: "purple" },
  "Field Trip": { icon: "fa-bus", color: "teal" }
};

async function loadGallery() {
  const grid = document.getElementById("hpGalleryGrid");
  if (!grid) return;

  try {
    const galleryQuery = query(collection(db, "gallery"), orderBy("uploadedAt", "desc"), limit(6));
    const snap = await getDocs(galleryQuery);

    if (snap.empty) return; // keep the static illustrated tiles already in the HTML

    grid.innerHTML = snap.docs.map((docSnap) => {
      const g = docSnap.data();
      const meta = galleryTileMeta[g.category] || { icon: "fa-image", color: "purple" };
      return `
        <div class="hp-gallery-tile hp-gallery-photo-tile">
          <img src="${g.imageUrl}" alt="${escapeHtml(g.title || g.category || "Gallery photo")}" loading="lazy">
          <span><i class="fa-solid ${meta.icon}"></i> ${escapeHtml(g.category || "")}</span>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Could not load gallery:", error);
  }
}

loadGallery();

// ==========================
// Contact form
// ==========================
const contactForm = document.getElementById("contactForm");

contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("cfName").value.trim();
  const contact = document.getElementById("cfContact").value.trim();
  const message = document.getElementById("cfMessage").value.trim();
  const statusEl = document.getElementById("cfStatus");
  const submitBtn = document.getElementById("cfSubmit");

  if (!name || !contact || !message) {
    statusEl.textContent = "Please fill in all fields.";
    statusEl.className = "hp-form-status error";
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = "Sending...";
  statusEl.className = "hp-form-status";

  try {
    await addDoc(collection(db, "contactMessages"), {
      name,
      contact,
      message,
      createdAt: serverTimestamp()
    });

    statusEl.textContent = "Message sent — we'll get back to you soon.";
    statusEl.className = "hp-form-status success";
    contactForm.reset();

  } catch (error) {
    console.error(error);
    statusEl.textContent = "Something went wrong. Please try again.";
    statusEl.className = "hp-form-status error";
  } finally {
    submitBtn.disabled = false;
  }
});
