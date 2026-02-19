document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();

  var btn = document.getElementById('login-btn');
  var msg = document.getElementById('login-message');
  var username = document.getElementById('username').value.trim();
  var password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Giriş yapılıyor...';
  msg.textContent = '';

  try {
    var res = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });

    var data = await res.json();

    if (data.success) {
      window.location.href = '/admin/dashboard';
    } else {
      msg.textContent = data.message;
    }
  } catch (err) {
    msg.textContent = 'Bağlantı hatası.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Giriş Yap';
  }
}
