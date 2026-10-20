import { db } from "./Firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { startList } from "./tests-list.js";

const $ = (id) => document.getElementById(id);
const roll = localStorage.getItem("studentRoll");

(async function init() {
  if (!roll) { window.location.replace("student-login.html"); return; }
  try {
    const s = await getDoc(doc(db, "students", roll));
    if (!s.exists()) { window.location.replace("student-login.html"); return; }
    await startList({ host: $("list"), emptyEl: $("emptyState"), roll, cls: s.data().class, mode: "student" });
    $("pageLoading").hidden = true; $("content").hidden = false;
  } catch (error) {
    console.error(error);
    $("pageLoading").textContent = "Could not load your tests. Please try again.";
  }
})();
