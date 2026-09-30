/* Contact form - front-end validation only, nothing is sent anywhere. */

(function () {
  var btn = document.getElementById('contactSend');
  if (!btn) return;
  var box = document.getElementById('contactMsg');

  function say(text, type) {
    box.className = 'msg ' + type;
    box.textContent = text;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  var v = function (id) { return document.getElementById(id).value.trim(); };

  btn.addEventListener('click', function () {
    if (!v('c_name')) return say('Please tell us your name.', 'error');
    if (!/^\S+@\S+\.\S+$/.test(v('c_email'))) return say('That email address does not look right.', 'error');
    if (v('c_message').length < 10) return say('Please write a little more in the message.', 'error');

    say('Thanks ' + v('c_name') + ', your message has been noted. We will call you on ' +
        (v('c_phone') || 'the number you gave') + '.', 'success');
    ['c_name', 'c_phone', 'c_email', 'c_message'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
  });
})();
