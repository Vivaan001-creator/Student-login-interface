/* protect.js - blocks long-press select/copy, right-click menu, drag and common copy shortcuts.
   Typing fields (input, textarea) are left alone so forms still work. */
(function () {
  function editable(t) { return !!(t && t.closest && t.closest("input,textarea,[contenteditable='true']")); }
  function stop(e) { if (!editable(e.target)) e.preventDefault(); }
  ["contextmenu", "selectstart", "copy", "cut", "dragstart"].forEach(function (n) { document.addEventListener(n, stop, true); });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "u", "s", "p"].indexOf(k) !== -1 && !editable(e.target)) e.preventDefault();
    if (e.key === "F12") e.preventDefault();
  }, true);
  document.addEventListener("selectionchange", function () {
    var s = window.getSelection && window.getSelection();
    if (s && !s.isCollapsed && !editable(document.activeElement)) s.removeAllRanges();
  });
})();
