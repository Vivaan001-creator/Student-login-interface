/* =========================================================
   month-picker.js — turns an already-populated <select> of
   "Month YYYY" options into a nicer calendar-style dropdown,
   grouped by year.

   The underlying <select> stays fully functional (same .value,
   same 'change' event) — so any existing page script that reads
   or listens to it keeps working with ZERO changes. This is a
   pure visual enhancement, safe to add anywhere.

   Usage (after the page script that populates the select, or
   any time — a MutationObserver keeps it in sync automatically):
       MonthPicker.enhance(document.getElementById('resultMonth'));
========================================================= */
(function () {
  function injectStyles() {
    if (document.getElementById('month-picker-styles')) return;
    const style = document.createElement('style');
    style.id = 'month-picker-styles';
    style.textContent = `
      .mp-wrap{ position:relative; width:100%; font-family:'Inter',sans-serif; }
      .mp-btn{
        width:100%; display:flex; align-items:center; gap:10px; text-align:left;
        padding:12px 14px; border-radius:12px; border:1.5px solid rgba(36,31,20,.1);
        background:#f7f2e4; color:#241f14; font-size:13.5px; font-family:inherit;
        cursor:pointer; transition:border-color .2s ease;
      }
      html[data-theme="dark"] .mp-btn{ background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.14); color:#f3ecd9; }
      .mp-btn:hover{ border-color:#ff8c42; }
      .mp-btn i.fa-calendar{ color:#ff8c42; font-size:13px; }
      .mp-label{ flex:1; font-weight:600; }
      .mp-chevron{ font-size:10px; color:#7a715c; transition:transform .2s ease; }
      html[data-theme="dark"] .mp-chevron{ color:#b7bcdc; }
      .mp-wrap.open .mp-chevron{ transform:rotate(180deg); }
      .mp-panel{
        display:none; position:absolute; top:calc(100% + 8px); left:0; z-index:60;
        min-width:260px; max-height:280px; overflow-y:auto;
        background:#ffffff; border:1px solid rgba(36,31,20,.08); border-radius:16px;
        padding:12px; box-shadow:0 24px 48px rgba(36,31,20,.18);
      }
      html[data-theme="dark"] .mp-panel{ background:#1c2444; border-color:rgba(255,255,255,.12); box-shadow:0 24px 48px rgba(0,0,0,.4); }
      .mp-wrap.open .mp-panel{ display:block; }
      .mp-year-label{ font-size:11px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:#ff8c42; margin:8px 0 6px; }
      .mp-year-block:first-child .mp-year-label{ margin-top:0; }
      .mp-grid{ display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; }
      .mp-tile{
        border:none; border-radius:9px; padding:9px 4px; font-size:12px; font-weight:600;
        background:#f7f2e4; color:#241f14; cursor:pointer; transition:background .15s ease, color .15s ease;
      }
      html[data-theme="dark"] .mp-tile{ background:rgba(255,255,255,.05); color:#f3ecd9; }
      .mp-tile:hover{ background:#eee3cc; }
      html[data-theme="dark"] .mp-tile:hover{ background:rgba(255,255,255,.1); }
      .mp-tile.active{ background:linear-gradient(135deg, #ffb347, #ff6f61); color:#241608; }
    `;
    document.head.appendChild(style);
  }

  function enhance(selectEl) {
    if (!selectEl || selectEl.dataset.monthPickerEnhanced) return;
    selectEl.dataset.monthPickerEnhanced = '1';
    injectStyles();

    selectEl.style.position = 'absolute';
    selectEl.style.opacity = '0';
    selectEl.style.pointerEvents = 'none';
    selectEl.style.width = '1px';
    selectEl.style.height = '1px';
    selectEl.tabIndex = -1;

    const wrap = document.createElement('div');
    wrap.className = 'mp-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mp-btn';
    btn.innerHTML =
      '<i class="fa-regular fa-calendar"></i>' +
      '<span class="mp-label">Select month</span>' +
      '<i class="fa-solid fa-chevron-down mp-chevron"></i>';
    const panel = document.createElement('div');
    panel.className = 'mp-panel';

    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    wrap.appendChild(btn);
    wrap.appendChild(panel);

    function refreshLabel() {
      const opt = selectEl.options[selectEl.selectedIndex];
      btn.querySelector('.mp-label').textContent = opt ? opt.textContent : 'Select month';
    }

    function build() {
      panel.innerHTML = '';
      const groups = {};
      const order = [];
      Array.from(selectEl.options).forEach((o) => {
        const parts = o.textContent.trim().split(' ');
        const year = parts[parts.length - 1];
        if (!groups[year]) { groups[year] = []; order.push(year); }
        groups[year].push({ label: parts.slice(0, -1).join(' '), value: o.value, text: o.textContent });
      });
      order.forEach((year) => {
        const block = document.createElement('div');
        block.className = 'mp-year-block';
        const yl = document.createElement('div');
        yl.className = 'mp-year-label';
        yl.textContent = year;
        block.appendChild(yl);
        const grid = document.createElement('div');
        grid.className = 'mp-grid';
        groups[year].forEach((item) => {
          const tile = document.createElement('button');
          tile.type = 'button';
          tile.className = 'mp-tile' + (item.value === selectEl.value ? ' active' : '');
          tile.textContent = item.label.slice(0, 3);
          tile.title = item.text;
          tile.addEventListener('click', () => {
            selectEl.value = item.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            refreshLabel();
            panel.querySelectorAll('.mp-tile').forEach((t) => t.classList.remove('active'));
            tile.classList.add('active');
            wrap.classList.remove('open');
          });
          grid.appendChild(tile);
        });
        block.appendChild(grid);
        panel.appendChild(block);
      });
    }

    build();
    refreshLabel();

    // page script may populate/change the <select> after (or repeatedly) — stay in sync
    new MutationObserver(() => { build(); refreshLabel(); }).observe(selectEl, { childList: true });
    selectEl.addEventListener('change', refreshLabel);

    btn.addEventListener('click', (e) => { e.stopPropagation(); wrap.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });
  }

  window.MonthPicker = { enhance };
})();
