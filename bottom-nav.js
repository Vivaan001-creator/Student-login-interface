/* =========================================================
   bottom-nav.js - floating 5-icon bottom tab bar for the
   Android app shell (GenAlpha redesign).

   TWO MODES:

   1) SAME-PAGE TABS (Student, Parent) - tabs switch which
      [data-tab-section] is visible, no page reload:

     BottomNav.init({
       mountId: 'bottomNav',
       default: 'home',
       tabs: [
         { id: 'home', icon: 'fa-house', label: 'Home' },
         { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' }
       ]
     });

   2) CROSS-PAGE LINKS (Teacher, Admin) - each tab is a real
      page; give it href instead of id, and the tab matching
      the current filename lights up automatically:

     BottomNav.init({
       mountId: 'bottomNav',
       tabs: [
         { href: 'teacher-dashboard.html', icon: 'fa-house', label: 'Home' },
         { href: 'teacher-attendance.html', icon: 'fa-calendar-check', label: 'Attendance' }
       ]
     });

   A tabs array is link-mode as soon as any entry has `href`
   instead of `id`.
========================================================= */
(function () {
  function currentFile() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  }

  function init(opts) {
    opts = opts || {};
    const mount = document.getElementById(opts.mountId);
    if (!mount) return;
    const tabs = opts.tabs || [];
    const linkMode = tabs.length > 0 && tabs[0].href !== undefined;

    if (linkMode) {
      const here = currentFile();
      const activeOverride = opts.activeHref;
      mount.innerHTML = tabs.map(function (t) {
        const isActive = activeOverride ? t.href === activeOverride : t.href === here;
        return (
          '<a href="' + t.href + '" class="bn-item' + (isActive ? ' bn-active' : '') + '">' +
            '<span class="bn-icon-wrap"><i class="fa-solid ' + t.icon + '"></i></span>' +
            '<span class="bn-label">' + t.label + '</span>' +
          '</a>'
        );
      }).join('');
      return;
    }

    let active = opts.default || (tabs[0] && tabs[0].id);

    function render() {
      mount.innerHTML = tabs.map(function (t) {
        const isActive = t.id === active;
        return (
          '<button type="button" class="bn-item' + (isActive ? ' bn-active' : '') + '" data-bn-tab="' + t.id + '">' +
            '<span class="bn-icon-wrap"><i class="fa-solid ' + t.icon + '"></i></span>' +
            '<span class="bn-label">' + t.label + '</span>' +
          '</button>'
        );
      }).join('');

      mount.querySelectorAll('[data-bn-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          go(btn.getAttribute('data-bn-tab'));
        });
      });
    }

    function go(id) {
      active = id;
      document.querySelectorAll('[data-tab-section]').forEach(function (panel) {
        const show = panel.getAttribute('data-tab-section') === id;
        panel.hidden = !show;
      });
      mount.querySelectorAll('[data-bn-tab]').forEach(function (btn) {
        btn.classList.toggle('bn-active', btn.getAttribute('data-bn-tab') === id);
      });
      const content = document.querySelector('.app-content');
      if (content) content.scrollTo({ top: 0, behavior: 'auto' });
      window.dispatchEvent(new CustomEvent('bottomnav:change', { detail: { id: id } }));
    }

    render();
    go(active);

    window.BottomNav._go = go; // exposed so a page can switch tabs programmatically
  }

  window.BottomNav = { init: init, go: function (id) { if (window.BottomNav._go) window.BottomNav._go(id); } };
})();
