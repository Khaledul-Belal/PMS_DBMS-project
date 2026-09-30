/* Pricing page - shows the live plans from the database when the server is up,
   and quietly leaves the static cards in place when it is not. */

(function () {
  var list = document.getElementById('planList');
  var note = document.getElementById('planNote');
  if (!list) return;

  get('auth', 'plans').then(function (r) {
    if (!r.plans || !r.plans.length) return;
    list.innerHTML = r.plans.map(function (p, i) {
      var feats = (p.features || '').split(',').filter(Boolean);
      if (!feats.length) feats = ['Up to ' + p.max_properties + ' buildings'];
      return '<div class="plan' + (i === 1 ? ' featured' : '') + '">' +
        '<h3>' + esc(p.plan_name) + '</h3>' +
        '<div class="price">' + taka(p.price) + ' <small>/ ' + p.duration_days + ' days</small></div>' +
        '<ul><li>Up to ' + p.max_properties + ' buildings</li>' +
        feats.map(function (f) { return '<li>' + esc(f.trim()) + '</li>'; }).join('') + '</ul>' +
        '<a class="btn ' + (i === 1 ? '' : 'ghost ') + 'wide" href="signup.html">Choose ' + esc(p.plan_name) + '</a>' +
        '</div>';
    }).join('');
    note.textContent = 'Live prices, loaded from the subscription_plan table.';
  }).catch(function () {
    note.textContent = 'Showing the standard prices. Start Apache and MySQL to load them from the database.';
  });
})();
