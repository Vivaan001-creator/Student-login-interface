/* Shows the Games card only for Class 1 and 2 students and remembers the class for games.html */
(function () {
  var el = document.getElementById('dashStudentClass'); if (!el) return;
  function run() {
    var m = (el.textContent || '').match(/\d+/), n = m ? parseInt(m[0], 10) : 0;
    if (n) { try { localStorage.setItem('ga_stu_class', String(n)); } catch (e) {} }
    var card = document.getElementById('gamesCard'); if (card) card.style.display = (n === 1 || n === 2) ? '' : 'none';
  }
  run(); new MutationObserver(run).observe(el, { childList: true, characterData: true, subtree: true });
})();
