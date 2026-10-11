/* =========================================================
   appearance.js - one-tap Light/Dark toggle for the whole
   GenAlpha app.

   ANDROID APP CHANGE: this used to open a small dropdown with
   three choices (System / Light / Dark). That menu was also
   getting visually clipped on pages whose header uses
   overflow:hidden (it opens upward, above the button, and got
   cut off - that's why tapping it looked like nothing
   happened). Fixed by removing the dropdown entirely: the
   button now just toggles between light and dark directly on
   tap, one icon, no panel to clip.

   Include this ONE script (as early as possible, ideally in
   <head>) on every page:
       <script src="appearance.js"></script>

   Then, wherever you want the toggle button to appear:
       Appearance.renderMenu(document.getElementById('appearanceMount'));

   (The `variant` and `{variant:'inline'|'corner'}` options from
   the old version still work as plain no-ops - pages that pass
   them keep working unchanged.)

   The chosen theme (light / dark) is saved in localStorage and
   applied on every page automatically - pick it once anywhere,
   it sticks everywhere. On a person's very first visit, before
   they've tapped the button even once, it follows the phone's
   own system light/dark setting.
========================================================= */
(function () {
  const STORAGE_KEY = 'appearance-theme'; // 'light' | 'dark' (no 'system' choice anymore - see note above)
  const root = document.documentElement;

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function getTheme() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (e) {}
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
  }

  // Apply immediately - this file must be loaded early (head) to avoid a flash.
  apply(getTheme());

  function setTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    apply(theme);
    document.dispatchEvent(new CustomEvent('appearance-changed', { detail: { theme: theme } }));
  }

  function toggle() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function injectStyles() {
    if (document.getElementById('appearance-styles')) return;
    const style = document.createElement('style');
    style.id = 'appearance-styles';
    style.textContent = `
      .appearance-btn{
        display:flex; align-items:center; justify-content:center;
        width:36px; height:36px; border-radius:50%;
        border:1px solid rgba(255,255,255,.16);
        background:rgba(255,255,255,.1);
        color:#fff;
        cursor:pointer; font-size:13px;
        transition:background .2s ease, transform .15s ease;
        -webkit-tap-highlight-color:transparent;
      }
      html[data-theme="light"] .appearance-btn.on-light-surface{
        border-color:rgba(36,31,20,.1); background:#ffffff; color:#241f14;
        box-shadow:0 6px 16px rgba(36,31,20,.08);
      }
      .appearance-btn:active{ transform:scale(.92); }
      @media (prefers-reduced-motion: reduce){ .appearance-btn{ transition:none; } }
    `;
    document.head.appendChild(style);
  }

  function renderMenu(mountEl /*, opts - accepted for backwards compatibility, unused */) {
    if (!mountEl) return;
    injectStyles();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'appearance-btn';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    mountEl.appendChild(btn);

    function refreshIcon() {
      // Icon shows what tapping it will switch TO next, which is the
      // common convention (moon while in light mode, sun while in dark).
      const theme = getTheme();
      btn.innerHTML = theme === 'dark'
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
    }
    refreshIcon();

    btn.addEventListener('click', () => {
      toggle();
      refreshIcon();
    });
  }

  window.Appearance = { getTheme: getTheme, setTheme: setTheme, toggle: toggle, renderMenu: renderMenu };
})();
