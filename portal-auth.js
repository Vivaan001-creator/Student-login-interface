// Sign-in for students and parents, without a server (works on the free Firebase plan).
//
// The browser signs in anonymously and then writes ONE document: studentSessions/{uid} or
// parentSessions/{uid}. The Firestore rules accept that document only when what was typed
// matches the student's record, so the document existing is the proof of login. Every rule
// for student data checks for it. A wrong guess is refused by the rules, not by this file.
//
// REQUIRED once: Firebase console > Authentication > Sign-in method > turn ON "Anonymous".
import { auth, db } from "./Firebase.js";
import { signInAnonymously, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export const LOGIN_MAX_AGE_MS = 12 * 60 * 60 * 1000;   // a student or parent login lasts 12 hours

function waitForUser() {
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (user) => { off(); resolve(user); });
  });
}

async function ensureAnonymous() {
  let user = await waitForUser();
  // A teacher or admin was signed in on this phone: sign them out first.
  if (user && !user.isAnonymous) { await signOut(auth); user = null; }
  if (!user) user = (await signInAnonymously(auth)).user;
  return user;
}

const isDenied = (e) => e && (e.code === "permission-denied" || /permission/i.test(String(e.message || "")));

function friendly(e) {
  if (e && e.code === "auth/operation-not-allowed") return "Login is not switched on yet. Please tell the tuition office (Anonymous sign-in must be enabled in Firebase).";
  if (e && e.code === "auth/network-request-failed") return "No internet connection. Please check it and try again.";
  return "Could not log in right now. Please try again.";
}

// dd-mm-yyyy or yyyy-mm-dd -> the formats a record may have been saved in
export function dobCandidates(value) {
  const str = String(value || "").trim();
  let y, m, d, mt;
  if ((mt = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = mt[1]; m = mt[2]; d = mt[3]; }
  else if ((mt = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) { d = mt[1]; m = mt[2]; y = mt[3]; }
  else return str ? [str] : [];
  const mm = m.padStart(2, "0"), dd = d.padStart(2, "0");
  return [y + "-" + mm + "-" + dd, dd + "-" + mm + "-" + y, dd + "/" + mm + "/" + y];
}

// Returns { ok: true } or { ok: false, message }
export async function claimStudent({ roll, dob, mobile }) {
  const tail = String(mobile || "").replace(/\D/g, "").slice(-4);
  if (tail.length !== 4) return { ok: false, message: "Enter the last 4 digits of the registered mobile number." };
  try {
    const user = await ensureAnonymous();
    for (const candidate of dobCandidates(dob)) {
      try {
        await setDoc(doc(db, "studentSessions", user.uid), { roll, dob: candidate, tail, createdAt: serverTimestamp() });
        return { ok: true };
      } catch (e) { if (!isDenied(e)) throw e; }
    }
    return { ok: false, message: "These details do not match. Please check them and try again." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: friendly(e) };
  }
}

export async function claimParent({ roll, contact }) {
  try {
    const user = await ensureAnonymous();
    await setDoc(doc(db, "parentSessions", user.uid), { roll, contact, createdAt: serverTimestamp() });
    return { ok: true };
  } catch (e) {
    if (isDenied(e)) return { ok: false, message: "These details do not match. Please check them and try again." };
    console.error(e);
    return { ok: false, message: friendly(e) };
  }
}

// Does this phone hold a valid student or parent login right now?
export async function hasPortalSession(kind) {
  const user = await waitForUser();
  if (!user || !user.isAnonymous) return false;
  const names = kind === "student" ? ["studentSessions"] : kind === "parent" ? ["parentSessions"] : ["studentSessions", "parentSessions"];
  for (const n of names) {
    try { if ((await getDoc(doc(db, n, user.uid))).exists()) return true; } catch (e) { /* not allowed = no session */ }
  }
  return false;
}

export function markLoggedIn(flag) {
  try { localStorage.setItem(flag, "true"); localStorage.setItem(flag + "At", String(Date.now())); } catch (e) { /* storage blocked */ }
}

export async function portalLogout(flags) {
  (flags || []).forEach((f) => { try { localStorage.removeItem(f); localStorage.removeItem(f + "At"); } catch (e) { /* ignore */ } });
  try {
    const user = auth.currentUser;
    if (user && user.isAnonymous) {
      await Promise.all([deleteDoc(doc(db, "studentSessions", user.uid)), deleteDoc(doc(db, "parentSessions", user.uid))].map((p) => p.catch(() => {})));
      await signOut(auth);
    }
  } catch (e) { /* the page is leaving anyway */ }
}
