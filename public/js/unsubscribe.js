document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('unsub-form').addEventListener('submit', handleUnsubscribe);
});

async function handleUnsubscribe(e) {
  e.preventDefault();

  var emailInput = document.getElementById('unsub-email');
  var btn = document.getElementById('unsub-btn');
  var msg = document.getElementById('unsub-message');
  var email = emailInput.value.trim();

  if (!email) return;

  btn.disabled = true;
  btn.textContent = 'Isleniyor...';
  msg.textContent = '';
  msg.className = 'unsub-message';

  try {
    var res = await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });

    var data = await res.json();

    msg.textContent = data.message;
    msg.className = 'unsub-message ' + (data.success ? 'success' : 'error');

    if (data.success) {
      emailInput.value = '';
    }
  } catch (err) {
    msg.textContent = 'Baglanti hatasi. Lutfen tekrar deneyin.';
    msg.className = 'unsub-message error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Listeden Cik';
  }
}
