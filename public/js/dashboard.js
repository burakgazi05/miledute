var currentPage = 1;
var currentSearch = '';

document.addEventListener('DOMContentLoaded', function () {
  loadEmails(1);

  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('search-input').addEventListener('input', debounce(handleSearch, 400));
  document.getElementById('delete-selected-btn').addEventListener('click', handleDeleteSelected);
  document.getElementById('select-all').addEventListener('change', handleSelectAll);
  document.getElementById('change-password-btn').addEventListener('click', openPasswordModal);
  document.getElementById('password-modal-close').addEventListener('click', closePasswordModal);
  document.getElementById('password-form').addEventListener('submit', handleChangePassword);
});

async function loadEmails(page) {
  try {
    var url = '/admin/emails?page=' + page + '&limit=50';
    if (currentSearch) {
      url += '&search=' + encodeURIComponent(currentSearch);
    }

    var res = await fetch(url);
    if (res.status === 401 || res.redirected) {
      window.location.href = '/admin/login';
      return;
    }

    var data = await res.json();
    currentPage = data.page;

    document.getElementById('total-count').textContent = data.total;

    var tbody = document.getElementById('email-tbody');
    var noData = document.getElementById('no-data');
    var selectAll = document.getElementById('select-all');

    selectAll.checked = false;

    if (data.emails.length === 0) {
      tbody.innerHTML = '';
      noData.style.display = 'block';
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    noData.style.display = 'none';
    tbody.innerHTML = '';

    data.emails.forEach(function (entry, index) {
      var tr = document.createElement('tr');
      var num = (data.page - 1) * 50 + index + 1;
      var date = new Date(entry.createdAt).toLocaleString('tr-TR');

      var tdCheck = document.createElement('td');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'email-checkbox';
      checkbox.value = entry._id;
      tdCheck.appendChild(checkbox);

      var tdNum = document.createElement('td');
      tdNum.textContent = num;

      var tdEmail = document.createElement('td');
      tdEmail.textContent = entry.email;

      var tdDate = document.createElement('td');
      tdDate.textContent = date;

      var tdAction = document.createElement('td');
      var delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.textContent = 'Sil';
      delBtn.addEventListener('click', function () {
        deleteEmail(entry._id);
      });
      tdAction.appendChild(delBtn);

      tr.appendChild(tdCheck);
      tr.appendChild(tdNum);
      tr.appendChild(tdEmail);
      tr.appendChild(tdDate);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });

    renderPagination(data.page, data.totalPages);
  } catch (err) {
    document.getElementById('no-data').textContent = 'Veriler yüklenirken hata oluştu.';
    document.getElementById('no-data').style.display = 'block';
  }
}

function renderPagination(current, total) {
  var container = document.getElementById('pagination');
  container.innerHTML = '';

  if (total <= 1) return;

  var prevBtn = document.createElement('button');
  prevBtn.textContent = '\u2190 \u00d6nceki';
  prevBtn.disabled = current <= 1;
  prevBtn.addEventListener('click', function () { loadEmails(current - 1); });
  container.appendChild(prevBtn);

  var pageInfo = document.createElement('button');
  pageInfo.textContent = current + ' / ' + total;
  pageInfo.className = 'current';
  pageInfo.disabled = true;
  container.appendChild(pageInfo);

  var nextBtn = document.createElement('button');
  nextBtn.textContent = 'Sonraki \u2192';
  nextBtn.disabled = current >= total;
  nextBtn.addEventListener('click', function () { loadEmails(current + 1); });
  container.appendChild(nextBtn);
}

async function deleteEmail(id) {
  if (!confirm('Bu e-postayı silmek istediğinize emin misiniz?')) return;

  try {
    var res = await fetch('/admin/emails/' + id, { method: 'DELETE' });
    var data = await res.json();
    if (data.success) {
      loadEmails(currentPage);
    } else {
      alert(data.message || 'Silme islemi basarisiz.');
    }
  } catch (err) {
    alert('Silme islemi sirasinda hata olustu.');
  }
}

async function handleDeleteSelected() {
  var checkboxes = document.querySelectorAll('.email-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Lütfen silmek istediğiniz e-postaları seçin.');
    return;
  }

  if (!confirm(checkboxes.length + ' e-postayı silmek istediğinize emin misiniz?')) return;

  var ids = [];
  checkboxes.forEach(function (cb) { ids.push(cb.value); });

  try {
    var res = await fetch('/admin/emails/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids })
    });
    var data = await res.json();
    if (data.success) {
      loadEmails(currentPage);
    } else {
      alert(data.message || 'Toplu silme basarisiz.');
    }
  } catch (err) {
    alert('Toplu silme sirasinda hata olustu.');
  }
}

function handleSelectAll(e) {
  var checkboxes = document.querySelectorAll('.email-checkbox');
  checkboxes.forEach(function (cb) { cb.checked = e.target.checked; });
}

function handleSearch(e) {
  currentSearch = e.target.value.trim();
  loadEmails(1);
}

async function handleLogout() {
  await fetch('/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
}

function openPasswordModal() {
  document.getElementById('password-modal').style.display = 'flex';
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-message').textContent = '';
}

function closePasswordModal() {
  document.getElementById('password-modal').style.display = 'none';
}

async function handleChangePassword(e) {
  e.preventDefault();

  var currentPw = document.getElementById('pw-current').value;
  var newPw = document.getElementById('pw-new').value;
  var confirmPw = document.getElementById('pw-confirm').value;
  var msg = document.getElementById('pw-message');

  if (newPw.length < 8) {
    msg.textContent = 'Yeni şifre en az 8 karakter olmalı.';
    msg.style.color = '#cf6e6e';
    return;
  }

  if (newPw !== confirmPw) {
    msg.textContent = 'Yeni şifreler eşleşmiyor.';
    msg.style.color = '#cf6e6e';
    return;
  }

  try {
    var res = await fetch('/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
    });

    var data = await res.json();
    msg.textContent = data.message;
    msg.style.color = data.success ? '#6ecf6e' : '#cf6e6e';

    if (data.success) {
      setTimeout(closePasswordModal, 1500);
    }
  } catch (err) {
    msg.textContent = 'Bağlantı hatası.';
    msg.style.color = '#cf6e6e';
  }
}

function debounce(fn, delay) {
  var timer;
  return function (e) {
    clearTimeout(timer);
    timer = setTimeout(function () { fn(e); }, delay);
  };
}
