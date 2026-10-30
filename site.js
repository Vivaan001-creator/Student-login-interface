// Shared helpers loaded on every page.
// 1. Keeps every "(c) year" in footers correct.
// 2. Replaces blocking alert() pop-ups with an on-page message that screen
//    readers announce. A message shown right before a redirect is replayed on
//    the next page so success notices are not lost.
(function () {
  var y = String(new Date().getFullYear());
  var els = document.querySelectorAll("[data-year]");
  for (var i = 0; i < els.length; i++) els[i].textContent = y;

  var KEY = "genalphaPendingToast";
  var ERROR_WORDS = /(error|fail|incorrect|invalid|wrong|cannot|can't|could not|not found|denied|too many|please|required|galat)/i;
  var host = null, timer = null, lastText = "", lastAt = 0;

  function ensureHost() {
    if (host && document.body && document.body.contains(host)) return host;
    var st = document.createElement("style");
    st.textContent =
      "#ga-toast{position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 12px);display:flex;justify-content:center;padding:0 12px;z-index:2147483000;pointer-events:none}" +
      "#ga-toast .ga-msg{pointer-events:auto;max-width:520px;width:100%;display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:12px;font:600 14px/1.45 Inter,system-ui,Arial,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.28);cursor:pointer;white-space:pre-line;word-break:break-word}" +
      "#ga-toast .ga-ok{background:#12372a;color:#e8fff4;border:1px solid #2e9e6a}" +
      "#ga-toast .ga-err{background:#4a1714;color:#fff0ee;border:1px solid #e5584f}" +
      "#ga-toast .ga-x{margin-left:auto;opacity:.8;font-weight:700}";
    document.head.appendChild(st);
    host = document.createElement("div");
    host.id = "ga-toast";
    document.body.appendChild(host);
    return host;
  }

  function show(message, silent) {
    var text = String(message === undefined || message === null ? "" : message);
    if (!text) return;
    var isErr = ERROR_WORDS.test(text);
    var h = ensureHost();
    h.innerHTML = "";
    var box = document.createElement("div");
    box.className = "ga-msg " + (isErr ? "ga-err" : "ga-ok");
    box.setAttribute("role", isErr ? "alert" : "status");
    var t = document.createElement("span");
    t.textContent = text;
    var x = document.createElement("span");
    x.className = "ga-x";
    x.setAttribute("aria-hidden", "true");
    x.textContent = "x";
    box.appendChild(t); box.appendChild(x);
    box.addEventListener("click", function () { h.innerHTML = ""; });
    h.appendChild(box);
    lastText = text; lastAt = Date.now();
    clearTimeout(timer);
    timer = setTimeout(function () { h.innerHTML = ""; }, Math.min(9000, 3500 + text.length * 45));
  }

  // Replace alert(). confirm() and prompt() are left alone because they need an answer.
  window.alert = function (m) { show(m); };
  window.showMessage = show;

  // If the page is leaving right after a message, replay it on the next page.
  window.addEventListener("pagehide", function () {
    if (lastText && Date.now() - lastAt < 1500) {
      try { sessionStorage.setItem(KEY, JSON.stringify({ t: lastText, at: Date.now() })); } catch (e) {}
    }
  });

  function replay() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      sessionStorage.removeItem(KEY);
      var o = JSON.parse(raw);
      if (o && o.t && Date.now() - o.at < 8000) show(o.t);
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", replay);
  else replay();
})();

// Register the service worker on every page so repeat visits open from cache.
(function () {
  try {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
    }
  } catch (e) {}
})();

// ga-noselect: no text selection, copy or long-press menu anywhere except typing fields.
(function () {
  function typing(t) { return t && t.closest && t.closest("input,textarea,select,[contenteditable=true]"); }
  ["selectstart", "contextmenu", "copy", "cut", "dragstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (!typing(e.target)) e.preventDefault(); }, true);
  });
})();
