/* ============================================================
   Login page and signup page.
   One file serves both - it looks at which elements exist.
   ============================================================ */

var msgBox = document.getElementById('msg');

function say(text, type) {
  msgBox.className = 'msg ' + (type || 'error');
  msgBox.textContent = text;
}
function clearMsg() { msgBox.className = 'msg'; msgBox.textContent = ''; }

function goHome(user) {
  location.href = user.role === 'admin' ? 'admin.html' : 'app.html';
}

/* ---------- if a session is already open, skip the form ---------- */
get('auth', 'me')
  .then(function (r) { if (r.user) goHome(r.user); })
  .catch(function () { /* nobody is logged in, stay on the page */ });

/* ============================================================
   LOGIN PAGE
   ============================================================ */
var loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  var role = 'owner';

  document.querySelectorAll('.tabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tabs button').forEach(function (b) {
        b.setAttribute('aria-selected', 'false');
      });
      btn.setAttribute('aria-selected', 'true');
      role = btn.dataset.role;
      clearMsg();

      document.getElementById('email').placeholder =
        role === 'admin' ? 'admin@pms.com' : role === 'manager' ? 'manager@pms.com' : 'owner@pms.com';
      document.getElementById('signupSwitch').style.display = role === 'owner' ? '' : 'none';
    });
  });

  loginBtn.addEventListener('click', function () {
    clearMsg();
    var email = val('email'), password = val('password');
    if (!email || !password) return say('Enter your email and password.');

    loginBtn.disabled = true;
    api('auth', 'login', { email: email, password: password, role: role })
      .then(function (r) { goHome(r.user); })
      .catch(function (e) { say(e.message); loginBtn.disabled = false; });
  });

  document.getElementById('password').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });
}

/* ============================================================
   SIGNUP PAGE
   ============================================================ */
var signupBtn = document.getElementById('signupBtn');
if (signupBtn) {
  var planSel = document.getElementById('s_plan');

  get('auth', 'plans').then(function (r) {
    planSel.innerHTML = r.plans.map(function (p) {
      return '<option value="' + p.plan_id + '">' + esc(p.plan_name) + ' - ' + taka(p.price) +
             ' / ' + p.duration_days + ' days (' + p.max_properties + ' buildings)</option>';
    }).join('');
  }).catch(function () {
    planSel.innerHTML = '<option value="1">Basic</option><option value="2" selected>Standard</option>' +
                        '<option value="3">Premium</option>';
  });

  signupBtn.addEventListener('click', function () {
    clearMsg();
    var data = {
      full_name: val('s_name'), email: val('s_email'), password: val('s_pass'),
      phone: val('s_phone'), nid: val('s_nid'), address: val('s_address'),
      plan_id: val('s_plan'), self_managed: val('s_self')
    };
    if (!data.full_name) return say('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(data.email)) return say('That email address does not look right.');
    if (data.password.length < 6) return say('Your password needs at least 6 characters.');

    signupBtn.disabled = true;
    api('auth', 'signup', data)
      .then(function () { location.href = 'app.html'; })
      .catch(function (e) { say(e.message); signupBtn.disabled = false; });
  });
}
