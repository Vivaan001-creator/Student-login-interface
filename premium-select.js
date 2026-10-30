/* premium-select.js - turns a native <select> into a premium bottom-sheet picker.
   The real <select> stays in the page (same .value, same 'change' event, same form validation),
   so existing page scripts keep working unchanged.
   Usage: PremiumSelect.enhance(document.getElementById('regClass'), { title: 'Select class' }); */
(function () {
  function css() {
    if (document.getElementById('ps-styles')) return;
    var s = document.createElement('style'); s.id = 'ps-styles';
    s.textContent =
      '.ps-native{position:absolute!important;opacity:0;pointer-events:none;width:1px!important;height:1px!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important}' +
      '.ps-btn{width:100%;display:flex;align-items:center;gap:8px;text-align:left;padding:12px 38px 12px 14px;border-radius:14px;border:1.5px solid var(--input-border,var(--ep-line,rgba(127,127,127,.35)));background:var(--input-bg,var(--ep-field,rgba(127,127,127,.12)));color:var(--ink,var(--ep-ink,inherit));font:500 14px Inter,system-ui,sans-serif;cursor:pointer;min-height:46px;position:relative;box-sizing:border-box;transition:border-color .2s,box-shadow .2s}' +
      '.ps-btn:hover,.ps-btn:focus-visible,.ps-btn.open{border-color:#ffb347;box-shadow:0 0 0 4px rgba(255,179,71,.18);outline:none}' +
      '.ps-btn::after{content:"";position:absolute;right:15px;top:50%;width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-70%) rotate(45deg);opacity:.6;pointer-events:none}' +
      '.ps-btn.has-icon{padding-left:38px}.input-wrap .select-chevron{display:none}' +
      '.ps-btn .ps-ph{color:var(--ink-soft,#aab0d4);opacity:.85}' +
      '.ps-back{position:fixed;inset:0;z-index:2147483000;background:rgba(6,9,22,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .22s}' +
      '.ps-back.show{opacity:1}' +
      '.ps-sheet{width:100%;max-width:520px;max-height:78vh;display:flex;flex-direction:column;border-radius:28px 28px 0 0;background:#141b3a;color:#f3ecd9;border:1px solid rgba(255,255,255,.12);border-bottom:0;box-shadow:0 -30px 80px rgba(0,0,0,.55);transform:translateY(100%);transition:transform .3s cubic-bezier(.16,.84,.44,1);padding-bottom:env(safe-area-inset-bottom,0px)}' +
      '.ps-back.show .ps-sheet{transform:none}' +
      'html[data-theme=light] .ps-sheet{background:#fffaf0;color:#241f14;border-color:rgba(36,31,20,.1)}' +
      '.ps-grab{width:44px;height:5px;border-radius:9px;background:rgba(255,255,255,.22);margin:10px auto 4px}' +
      'html[data-theme=light] .ps-grab{background:rgba(36,31,20,.18)}' +
      '.ps-title{font:600 18px Fraunces,Georgia,serif;padding:8px 22px 12px}' +
      '.ps-list{overflow:auto;padding:0 12px 14px;display:grid;gap:8px;-webkit-overflow-scrolling:touch}' +
      '.ps-opt{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:15px 18px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:inherit;font:500 16px Inter,system-ui,sans-serif;cursor:pointer;text-align:left;min-height:52px;transition:background .15s,border-color .15s,transform .1s}' +
      'html[data-theme=light] .ps-opt{border-color:rgba(36,31,20,.1);background:#fff}' +
      '.ps-opt:active{transform:scale(.98)}' +
      '.ps-opt.sel{border-color:#ffb347;background:linear-gradient(135deg,rgba(255,179,71,.22),rgba(255,111,97,.14));font-weight:700}' +
      '.ps-opt .ps-tick{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;border:2px solid rgba(255,255,255,.25);flex-shrink:0}' +
      'html[data-theme=light] .ps-opt .ps-tick{border-color:rgba(36,31,20,.25)}' +
      '.ps-opt.sel .ps-tick{background:linear-gradient(135deg,#ffb347,#ff8c42);border-color:transparent;color:#241608}';
    document.head.appendChild(s);
  }
  function enhance(sel, opts) {
    if (!sel || sel.dataset.psDone) return; sel.dataset.psDone = '1'; css();
    opts = opts || {};
    var wrap = sel.parentNode, btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ps-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    sel.classList.add('ps-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    var w0 = sel.offsetWidth, pw = wrap.offsetWidth, cs = getComputedStyle(sel);
    if (wrap.querySelector('.input-icon')) btn.classList.add('has-icon');
    if (wrap.querySelector('.select-chevron')) btn.classList.add('no-chev'), btn.style.setProperty('--x', '1');
    if (w0 && pw && pw - w0 > 8) { btn.style.width = w0 + 'px'; btn.style.flex = cs.flex; }
    if (cs.fontSize) btn.style.fontSize = cs.fontSize;
    wrap.insertBefore(btn, sel.nextSibling);
    function label() {
      var o = sel.options[sel.selectedIndex];
      if (!o || !o.value) btn.innerHTML = '<span class="ps-ph"></span>', btn.firstChild.textContent = (sel.options[0] && sel.options[0].text) || 'Select';
      else btn.textContent = o.text;
    }
    label(); sel.addEventListener('change', label);
    // keep label right when page scripts set .value / .selectedIndex or rebuild options
    ['value', 'selectedIndex'].forEach(function (k) {
      var d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, k);
      if (d && d.set) Object.defineProperty(sel, k, { configurable: true, get: function () { return d.get.call(this); }, set: function (v) { d.set.call(this, v); label(); } });
    });
    new MutationObserver(label).observe(sel, { childList: true, subtree: true, attributes: true });
    function open() {
      var back = document.createElement('div'); back.className = 'ps-back';
      var sheet = document.createElement('div'); sheet.className = 'ps-sheet';
      sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
      var grab = document.createElement('div'); grab.className = 'ps-grab';
      var title = document.createElement('div'); title.className = 'ps-title';
      title.textContent = opts.title || (sel.options[0] && !sel.options[0].value ? sel.options[0].text : 'Select');
      var list = document.createElement('div'); list.className = 'ps-list';
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.value) return;
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'ps-opt' + (o.selected ? ' sel' : '');
        var t = document.createElement('span'); t.textContent = o.text;
        var k = document.createElement('span'); k.className = 'ps-tick'; k.innerHTML = o.selected ? '<i class="fa-solid fa-check"></i>' : '';
        b.appendChild(t); b.appendChild(k);
        b.onclick = function () { sel.value = o.value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); close(); };
        list.appendChild(b);
      });
      sheet.appendChild(grab); sheet.appendChild(title); sheet.appendChild(list); back.appendChild(sheet);
      document.body.appendChild(back); btn.classList.add('open');
      requestAnimationFrame(function () { back.classList.add('show'); });
      function close() { back.classList.remove('show'); btn.classList.remove('open'); document.removeEventListener('keydown', esc); setTimeout(function () { back.remove(); btn.focus(); }, 250); }
      function esc(e) { if (e.key === 'Escape') close(); }
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
      document.addEventListener('keydown', esc);
      var cur = list.querySelector('.sel'); if (cur) cur.scrollIntoView({ block: 'center' });
    }
    btn.addEventListener('click', open);
  }
  function auto() {
    document.querySelectorAll('select').forEach(function (sel) {
      if (sel.multiple || sel.size > 1 || sel.dataset.psDone || sel.dataset.monthPickerEnhanced || sel.hasAttribute('data-ps-skip')) return;
      if (sel.hidden || getComputedStyle(sel).display === 'none') return;
      enhance(sel);
    });
  }
  var t; function later() { clearTimeout(t); t = setTimeout(auto, 60); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  window.PremiumSelect = { enhance: enhance, auto: auto };
})();
