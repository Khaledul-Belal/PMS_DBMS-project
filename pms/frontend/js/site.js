/* Shared behaviour for the public pages: mobile menu + footer year. */

(function () {
  var bar = document.getElementById('navBar');
  var btn = document.getElementById('navToggle');
  if (bar && btn) {
    btn.addEventListener('click', function () {
      var open = bar.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    /* close the menu when a link is tapped */
    bar.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { bar.classList.remove('open'); });
    });
    /* and when the window grows back to desktop */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880) bar.classList.remove('open');
    });
  }
})();
