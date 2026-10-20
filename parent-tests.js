import { db } from "./Firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { startList } from "./tests-list.js";
import { normalizeMobile, escapeHtml } from "./profile-utils.js";

const $ = (id) => document.getElementById(id);
const roll = localStorage.getItem("parentActiveRoll");
const contact = localStorage.getItem("parentContact");

(async function init() {
  if (!roll || !contact) { window.location.replace("parent-login.html"); return; }
  try {
    const s = await getDoc(doc(db, "students", roll));
    if (!s.exists() || normalizeMobile(s.data().contactNumber) !== normalizeMobile(contact)) { window.location.replace("parent-login.html"); return; }
    const st = s.data();
    $("childLine").innerHTML = "Showing tests for <strong>" + escapeHtml(st.name || st.studentName || roll) + "</strong>, Class " + escapeHtml(st.class || "-");
    await startList({ host: $("list"), emptyEl: $("emptyState"), roll, cls: st.class, mode: "parent" });
    $("pageLoading").hidden = true; $("content").hidden = false;
  } catch (error) {
    console.error(error);
    $("pageLoading").textContent = "Could not load the tests. Please try again.";
  }
})();
