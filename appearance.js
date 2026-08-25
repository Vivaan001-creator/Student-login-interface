/* =========================================================
   appearance.js — shared Appearance (Light / Dark / System)
   system for the whole Home Tuition site.

   Include this ONE script (as early as possible, ideally in
   <head>) on every page:
       <script src="appearance.js"></script>

   Then, wherever you want the Appearance button to appear,
   give an element an id and call:
       Appearance.renderMenu(document.getElementById('appearanceMount'), { variant: 'corner' });
   or
       Appearance.renderMenu(document.getElementById('appearanceMount'), { variant: 'inline' });

   The chosen preference (system / light / dark) is saved in
   localStorage and applied on every page automatically —
   pick it once anywhere, it sticks everywhere.
========================================================= */
(function () {
  const STORAGE_KEY = 'appearance-theme'; // 'system' | 'light' | 'dark'
  const root = document.documentElement;

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function effectiveTheme(pref) {
    return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
  }
  function getPref() {
    try { return localStorage.getItem(STORAGE_KEY) || 'system'; }
    catch (e) { return 'system'; }
  }
  function apply(pref) {
    root.setAttribute('data-theme', effectiveTheme(pref));
  }

  // Apply immediately — this file must be loaded early (head) to avoid a flash.
  apply(getPref());

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getPref() === 'system') apply('system');
    });
  }

  function setPref(pref) {
    try { localStorage.setItem(STORAGE_KEY, pref); } catch (e) {}
    apply(pref);
    document.dispatchEvent(new CustomEvent('appearance-changed', { detail: { pref } }));
  }

  function injectStyles() {
    if (document.getElementById('appearance-styles')) return;
    const style = document.createElement('style');
    style.id = 'appearance-styles';
    style.textContent = `
      .appearance-menu{ position:relative; display:inline-block; font-family:'Inter',sans-serif; }
      .appearance-menu.corner{ position:fixed; top:18px; right:18px; z-index:200; }
      .appearance-btn{
        display:flex; align-items:center; justify-content:center;
        width:38px; height:38px; border-radius:11px;
        border:1px solid rgba(255,255,255,.16);
        background:rgba(255,255,255,.07);
        color:#f3ecd9;
        cursor:pointer; font-size:14px;
        transition:background .2s ease, transform .15s ease;
        -webkit-tap-highlight-color:transparent;
      }
      html[data-theme="light"] .appearance-menu.corner .appearance-btn{
        border-color:rgba(36,31,20,.1); background:#ffffff; color:#241f14;
        box-shadow:0 6px 16px rgba(36,31,20,.08);
      }
      .appearance-btn:hover{ transform:translateY(-2px); }
      .appearance-panel{
        position:absolute; top:calc(100% + 8px); right:0; min-width:184px;
        background:#1c2444; border:1px solid rgba(255,255,255,.12);
        border-radius:14px; padding:7px; box-shadow:0 22px 44px rgba(0,0,0,.35);
        display:none; flex-direction:column; gap:2px; z-index:201;
      }
      html[data-theme="light"] .appearance-panel{
        background:#ffffff; border-color:rgba(36,31,20,.08); box-shadow:0 22px 44px rgba(36,31,20,.16);
      }
      .appearance-menu.inline .appearance-panel{ top:auto; bottom:calc(100% + 8px); right:auto; left:0; }
      .appearance-menu.open .appearance-panel{ display:flex; }
      .appearance-option{
        display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:9px;
        border:none; background:none; cursor:pointer; font-size:12.5px; font-weight:500;
        font-family:inherit; color:#f3ecd9; text-align:left; width:100%;
        transition:background .15s ease;
      }
      html[data-theme="light"] .appearance-option{ color:#241f14; }
      .appearance-option:hover{ background:rgba(255,255,255,.08); }
      html[data-theme="light"] .appearance-option:hover{ background:rgba(36,31,20,.05); }
      .appearance-option.active{ color:#ff8c42; font-weight:700; }
      .appearance-option i{ width:15px; text-align:center; font-size:12px; }
      @media (prefers-reduced-motion: reduce){ .appearance-btn{ transition:none; } }
    `;
    document.head.appendChild(style);
  }

  function renderMenu(mountEl, opts) {
    if (!mountEl) return;
    opts = opts || {};
    injectStyles();

    const wrap = document.createElement('div');
    wrap.className = 'appearance-menu' + (opts.variant === 'inline' ? ' inline' : ' corner');
    wrap.innerHTML =
      '<button type="button" class="appearance-btn" aria-label="Appearance settings" aria-haspopup="true">' +
        '<i class="fa-solid fa-circle-half-stroke"></i>' +
      '</button>' +
      '<div class="appearance-panel" role="menu">' +
        '<button type="button" class="appearance-option" data-pref="system" role="menuitem"><i class="fa-solid fa-desktop"></i> System Default</button>' +
        '<button type="button" class="appearance-option" data-pref="light" role="menuitem"><i class="fa-solid fa-sun"></i> Light Mode</button>' +
        '<button type="button" class="appearance-option" data-pref="dark" role="menuitem"><i class="fa-solid fa-moon"></i> Dark Mode</button>' +
      '</div>';
    mountEl.appendChild(wrap);

    const btn = wrap.querySelector('.appearance-btn');
    const options = wrap.querySelectorAll('.appearance-option');

    function refreshActive() {
      const pref = getPref();
      options.forEach((o) => o.classList.toggle('active', o.dataset.pref === pref));
    }
    refreshActive();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });
    options.forEach((o) => {
      o.addEventListener('click', () => {
        setPref(o.dataset.pref);
        refreshActive();
        wrap.classList.remove('open');
      });
    });
  }

  window.Appearance = { getPref, setPref, effectiveTheme, renderMenu };
})();
