/* =========================================================
   session-timer.js — shared 20-minute session-expiry system.

   Include on every LOGGED-IN page (dashboards, admin CRUD
   pages, result.html, pay-fee.html) — never on login pages
   themselves. Then call, near the bottom of the page's own
   script (after appearance.js / other init calls):

     SessionTimer.start({ flagKey: 'adminLoggedIn', loginUrl: 'admin.html' });

   For pages reachable by more than one role (result.html,
   pay-fee.html) pass an array instead:

     SessionTimer.start({ flagKeys: ['parentLoggedIn','studentLoggedIn'], loginUrl: 'student-login.html' });

   What it does:
   - If nobody is logged in, bounces to loginUrl immediately.
   - Shows a small "session expires in MM:SS" bar at the top,
     counting down from 20 minutes since this login.
   - At zero: full-screen ⚠️ overlay with a
     "Terminate All Login Sessions & Log In Again" button that
     clears sessionStorage and sends the user back to login.
   - Also re-checks on browser back/forward (bfcache) via the
     'pageshow' event, so the back button can't reopen a page
     whose session already ended.
========================================================= */
(function () {
  const SESSION_MINUTES = 20;
  const EXPIRY_KEY = "sessionExpiryAt";

  function injectStyles() {
    if (document.getElementById("session-timer-styles")) return;
    const style = document.createElement("style");
    style.id = "session-timer-styles";
    style.textContent = `
      .session-banner{
        display:flex; align-items:center; justify-content:center; gap:8px;
        padding:9px 16px; font-size:12px; font-weight:600; font-family:'Inter',sans-serif;
        background:#232c56; color:#e7e2cf; text-align:center; letter-spacing:.2px;
      }
      .session-banner.warn{ background:#7a3a1a; color:#ffe4c7; }
      .session-overlay{
        position:fixed; inset:0; z-index:500;
        background:rgba(9,12,26,.92); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        display:flex; align-items:center; justify-content:center; padding:24px;
        font-family:'Inter',sans-serif; animation:sessionFadeIn .3s ease both;
      }
      @keyframes sessionFadeIn{ from{opacity:0;} to{opacity:1;} }
      .session-card{
        background:#161d3a; border:1px solid rgba(255,255,255,.12); border-radius:24px;
        padding:40px 30px; max-width:360px; width:100%; text-align:center;
        box-shadow:0 30px 70px rgba(0,0,0,.55);
      }
      .session-card .warn-icon{ font-size:46px; margin-bottom:16px; line-height:1; }
      .session-card h2{ font-family:'Fraunces',serif; font-weight:600; font-size:20px; color:#f3ecd9; margin-bottom:10px; }
      .session-card p{ font-size:13px; color:#b7bcdc; line-height:1.6; margin-bottom:26px; }
      .session-terminate-btn{
        width:100%; border:none; cursor:pointer; padding:14px; border-radius:999px;
        background:linear-gradient(135deg,#ffb347,#ff6f61); color:#241608;
        font-weight:700; font-size:13.5px; font-family:inherit;
        box-shadow:0 4px 0 #d9691f, 0 14px 28px rgba(255,140,66,.28);
        transition:transform .15s ease;
      }
      .session-terminate-btn:hover{ transform:translateY(-2px); }
      .session-terminate-btn:active{ transform:translateY(2px); box-shadow:0 2px 0 #d9691f; }
    `;
    document.head.appendChild(style);
  }

  function formatTime(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function terminateAll(loginUrl) {
    try { sessionStorage.clear(); } catch (e) {}
    window.location.replace(loginUrl);
  }

  function showExpiredOverlay(loginUrl) {
    if (document.getElementById("sessionExpiredOverlay")) return;
    injectStyles();
    const banner = document.getElementById("sessionBanner");
    if (banner) banner.remove();

    const overlay = document.createElement("div");
    overlay.className = "session-overlay";
    overlay.id = "sessionExpiredOverlay";
    overlay.innerHTML =
      '<div class="session-card">' +
        '<div class="warn-icon">\u26A0\uFE0F</div>' +
        "<h2>Your session has expired</h2>" +
        "<p>For your security, you've been signed out after 20 minutes. Please log in again to continue.</p>" +
        '<button type="button" class="session-terminate-btn">Terminate All Login Sessions &amp; Log In Again</button>' +
      "</div>";
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    overlay.querySelector(".session-terminate-btn").addEventListener("click", function () {
      terminateAll(loginUrl);
    });
  }

  function start(opts) {
    opts = opts || {};
    const flagKeys = Array.isArray(opts.flagKeys) ? opts.flagKeys : [opts.flagKey];
    const loginUrl = opts.loginUrl;

    function isLoggedIn() {
      return flagKeys.some(function (k) { return sessionStorage.getItem(k) === "true"; });
    }
    function guardOrBounce() {
      if (!isLoggedIn()) {
        window.location.replace(loginUrl);
        return false;
      }
      return true;
    }

    if (!guardOrBounce()) return;

    let expiryAt = Number(sessionStorage.getItem(EXPIRY_KEY));
    if (!expiryAt || isNaN(expiryAt)) {
      expiryAt = Date.now() + SESSION_MINUTES * 60 * 1000;
      sessionStorage.setItem(EXPIRY_KEY, String(expiryAt));
    }

    // Already expired on arrival (e.g. tab was left open)?
    if (expiryAt - Date.now() <= 0) {
      showExpiredOverlay(loginUrl);
      return;
    }

    injectStyles();
    const banner = document.createElement("div");
    banner.className = "session-banner";
    banner.id = "sessionBanner";
    document.body.insertBefore(banner, document.body.firstChild);

    let timerId = null;
    function tick() {
      const remaining = expiryAt - Date.now();
      if (remaining <= 0) {
        if (timerId) clearInterval(timerId);
        showExpiredOverlay(loginUrl);
        return;
      }
      banner.textContent = "\u23F1\uFE0F Your session will expire in " + formatTime(remaining);
      banner.classList.toggle("warn", remaining < 2 * 60 * 1000);
    }
    tick();
    timerId = setInterval(tick, 1000);

    // Back-button / bfcache protection: re-validate every time this
    // page is shown, including when restored from history.
    window.addEventListener("pageshow", function () {
      if (!guardOrBounce()) return;
      if (expiryAt - Date.now() <= 0) showExpiredOverlay(loginUrl);
    });
  }

  window.SessionTimer = { start };
})();
