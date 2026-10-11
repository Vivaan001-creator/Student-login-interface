/* =========================================================
   session-timer.js - login guard for every protected page.

   Old behaviour: only checked a localStorage flag. Anyone could
   open DevTools, run localStorage.setItem('adminLoggedIn','true')
   and see the admin screens.

   New behaviour:
   - The page stays hidden until the check finishes.
   - Admin and teacher pages also require a real Firebase Auth
     session. Admin pages additionally require the admin account.
   - Student and parent pages still use the flag, because those
     logins are not Firebase accounts yet (see SECURITY-REPORT.md).

   IMPORTANT: this is a usability guard. The real protection for
   your data is the Firestore and Storage rules in firestore.rules and storage.rules.

   Usage is unchanged:
     SessionTimer.start({ flagKey: 'adminLoggedIn', loginUrl: 'admin.html' });
     SessionTimer.start({ flagKeys: ['parentLoggedIn','studentLoggedIn'], loginUrl: 'student-login.html' });
========================================================= */
(function () {
  var ADMIN_EMAIL = "vivaan510399@gmail.com";
  var FIREBASE_AUTH_URL = "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

  function start(opts) {
    opts = opts || {};
    var flagKeys = Array.isArray(opts.flagKeys) ? opts.flagKeys : [opts.flagKey];
    var loginUrl = opts.loginUrl;
    var needsAdmin = flagKeys.indexOf("adminLoggedIn") !== -1;
    var needsTeacher = flagKeys.indexOf("teacherLoggedIn") !== -1;
    var needsFirebase = needsAdmin || needsTeacher;

    var root = document.documentElement;
    var wasHidden = root.style.visibility;

    function flagOk() {
      return flagKeys.some(function (k) { return localStorage.getItem(k) === "true"; });
    }
    function deny() {
      if (needsAdmin) { try { localStorage.removeItem("adminLoggedIn"); } catch (e) {} }
      if (needsTeacher) { try { localStorage.removeItem("teacherLoggedIn"); } catch (e) {} }
      window.location.replace(loginUrl);
    }
    function allow() { root.style.visibility = wasHidden; }

    if (!flagOk()) { deny(); return; }
    if (!needsFirebase) { return; }

    root.style.visibility = "hidden";
    Promise.all([import("./Firebase.js"), import(FIREBASE_AUTH_URL)])
      .then(function (mods) {
        var auth = mods[0].auth;
        var onAuthStateChanged = mods[1].onAuthStateChanged;
        var unsub = onAuthStateChanged(auth, function (user) {
          unsub();
          if (!user) { deny(); return; }
          if (needsAdmin && (user.email || "").toLowerCase() !== ADMIN_EMAIL) { deny(); return; }
          allow();
        });
      })
      .catch(function () { deny(); });

    // bfcache restores (Android back button) skip load, so re-check the flag.
    window.addEventListener("pageshow", function (e) {
      if (e.persisted && !flagOk()) { deny(); }
    });
  }

  window.SessionTimer = { start: start };
})();
