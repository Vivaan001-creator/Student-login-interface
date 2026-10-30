/* =========================================================
   session-timer.js - login guard for every protected page.

   - The page stays hidden until the check finishes.
   - Admin and teacher pages need a real Firebase sign-in. Admin pages also need the admin account.
   - Student and parent pages need the login claim that the database rules accepted
     (studentSessions / parentSessions, see portal-auth.js). Setting a flag by hand in
     the browser is not enough any more.
   - Every login lasts 12 hours. After that the person must log in again.

   IMPORTANT: this is a usability guard. The real protection for your data is
   the Firestore and Storage rules in firestore.rules and storage.rules.

   Usage:
     SessionTimer.start({ flagKey: 'adminLoggedIn', loginUrl: 'admin.html' });
     SessionTimer.start({ flagKeys: ['parentLoggedIn','studentLoggedIn'], loginUrl: 'student-login.html' });
========================================================= */
(function () {
  var ADMIN_EMAIL = "vivaan510399@gmail.com";
  var MAX_AGE_MS = 12 * 60 * 60 * 1000;
  var FIREBASE_AUTH_URL = "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
  var FIREBASE_STORE_URL = "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

  function start(opts) {
    opts = opts || {};
    var flagKeys = Array.isArray(opts.flagKeys) ? opts.flagKeys : [opts.flagKey];
    var loginUrl = opts.loginUrl;
    var needsAdmin = flagKeys.indexOf("adminLoggedIn") !== -1;
    var needsTeacher = flagKeys.indexOf("teacherLoggedIn") !== -1;
    var needsStudent = flagKeys.indexOf("studentLoggedIn") !== -1;
    var needsParent = flagKeys.indexOf("parentLoggedIn") !== -1;
    var needsFirebase = needsAdmin || needsTeacher || needsStudent || needsParent;

    var root = document.documentElement;
    var wasHidden = root.style.visibility;

    // True while at least one of the flags is set and younger than 12 hours.
    function flagOk() {
      return flagKeys.some(function (k) {
        if (localStorage.getItem(k) !== "true") return false;
        var at = Number(localStorage.getItem(k + "At"));
        if (!at) { try { localStorage.setItem(k + "At", String(Date.now())); } catch (e) {} return true; }
        return Date.now() - at < MAX_AGE_MS;
      });
    }
    function clearFlags() {
      flagKeys.forEach(function (k) { try { localStorage.removeItem(k); localStorage.removeItem(k + "At"); } catch (e) {} });
    }
    function deny() {
      clearFlags();
      window.location.replace(loginUrl);
    }
    function allow() { root.style.visibility = wasHidden; }

    if (!flagOk()) { deny(); return; }
    if (!needsFirebase) { return; }

    root.style.visibility = "hidden";
    Promise.all([import("./Firebase.js"), import(FIREBASE_AUTH_URL), import(FIREBASE_STORE_URL)])
      .then(function (mods) {
        var auth = mods[0].auth, db = mods[0].db;
        var onAuthStateChanged = mods[1].onAuthStateChanged;
        var store = mods[2];
        var unsub = onAuthStateChanged(auth, function (user) {
          unsub();
          if (!user) { deny(); return; }
          // Admin and teacher: a real email sign-in.
          if (needsAdmin || needsTeacher) {
            if (user.isAnonymous) { deny(); return; }
            if (needsAdmin && (user.email || "").toLowerCase() !== ADMIN_EMAIL) { deny(); return; }
            allow();
            return;
          }
          // Student and parent: the database must have accepted this phone's login claim.
          if (!user.isAnonymous) { deny(); return; }
          var names = [];
          if (needsStudent) names.push("studentSessions");
          if (needsParent) names.push("parentSessions");
          Promise.all(names.map(function (n) {
            return store.getDoc(store.doc(db, n, user.uid)).then(function (s) { return s.exists(); }).catch(function () { return false; });
          })).then(function (found) {
            if (found.some(Boolean)) allow(); else deny();
          });
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
