document.addEventListener('DOMContentLoaded', function () {
  loadExperiences();

  document.getElementById('waitlist-btn').addEventListener('click', showForm);
  document.getElementById('subscribe-form').addEventListener('submit', handleSubscribe);
});

function showForm() {
  document.getElementById('waitlist-btn').style.display = 'none';
  document.getElementById('subscribe-form').style.display = '';
  document.getElementById('email-input').focus();
}

async function handleSubscribe(e) {
  e.preventDefault();

  var emailInput = document.getElementById('email-input');
  var submitBtn = document.getElementById('submit-btn');
  var messageEl = document.getElementById('form-message');
  var email = emailInput.value.trim();

  if (!email) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Kaydediliyor...';
  messageEl.textContent = '';
  messageEl.className = 'form-message';

  try {
    var res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });

    var data = await res.json();

    messageEl.textContent = data.message;
    messageEl.className = 'form-message ' + (data.success ? 'success' : 'error');

    if (data.success) {
      emailInput.value = '';
    }
  } catch (err) {
    messageEl.textContent = 'Baglanti hatasi. Lutfen tekrar deneyin.';
    messageEl.className = 'form-message error';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kaydet';
  }
}

function loadExperiences() {
  fetch('/api/experiences')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var experiences = data.experiences || [];

      if (experiences.length === 0) {
        document.getElementById('experiences').style.display = 'none';
        return;
      }

      var container = document.getElementById('experience-list');
      for (var i = 0; i < experiences.length; i++) {
        container.appendChild(buildExperienceCard(experiences[i]));
      }

      document.getElementById('scroll-indicator').style.display = '';
      document.getElementById('footer').style.display = '';
    })
    .catch(function () {
      document.getElementById('experiences').style.display = 'none';
    });
}

function buildExperienceCard(experience) {
  var card = document.createElement('div');
  card.className = 'experience-card';

  var title = document.createElement('h3');
  title.textContent = experience.title;

  var desc = document.createElement('p');
  desc.textContent = experience.description;

  card.appendChild(title);
  card.appendChild(desc);
  return card;
}
