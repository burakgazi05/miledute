const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const Email = require('../models/Email');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Cok fazla basarisiz giris denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false
});

// *** GECICI: Admin setup endpointi - admin olusturduktan sonra SIL ***
router.get('/setup', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin Setup</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050505;color:#e0e0e0;font-family:'Montserrat',sans-serif;height:100vh;display:flex;justify-content:center;align-items:center}.box{width:100%;max-width:380px;padding:40px 30px;text-align:center}h1{font-size:1.2rem;letter-spacing:4px;margin-bottom:30px;color:#b08d57}input{width:100%;padding:14px 18px;background:transparent;border:1px solid #222;color:#e0e0e0;font-size:.85rem;outline:none;margin-bottom:12px;transition:border-color .3s}input:focus{border-color:#b08d57}button{width:100%;padding:14px;background:transparent;border:1px solid #b08d57;color:#b08d57;font-size:.8rem;letter-spacing:2px;cursor:pointer;transition:all .4s;margin-top:8px}button:hover{background:#b08d57;color:#050505}p{font-size:.75rem;min-height:18px;margin-top:12px;letter-spacing:.5px}</style></head><body><div class="box"><h1>ADMIN SETUP</h1><input type="text" id="u" placeholder="Kullanici Adi"><input type="password" id="p" placeholder="Sifre (min 8 karakter)"><button onclick="go()">Olustur / Guncelle</button><p id="m"></p></div><script>async function go(){var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value,m=document.getElementById('m');if(!u||!p){m.textContent='Kullanici adi ve sifre gerekli.';m.style.color='#cf6e6e';return}try{var r=await fetch('/admin/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});var d=await r.json();m.textContent=d.message;m.style.color=d.success?'#6ecf6e':'#cf6e6e'}catch(e){m.textContent='Baglanti hatasi.';m.style.color='#cf6e6e'}}</script></body></html>`);
});

router.post('/setup', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Kullanici adi ve sifre gerekli.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Sifre en az 8 karakter olmali.' });
  }
  try {
    const existing = await Admin.findOne({ username });
    if (existing) {
      existing.password = password;
      await existing.save();
      res.json({ success: true, message: 'Admin sifresi guncellendi: ' + username });
    } else {
      await Admin.create({ username, password });
      res.json({ success: true, message: 'Admin olusturuldu: ' + username });
    }
  } catch (err) {
    console.error('Setup hatasi:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  }
});
// *** GECICI KISIM SONU ***

// Login sayfasi
router.get('/login', (req, res) => {
  const token = req.cookies.admin_token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/admin/dashboard');
    } catch {
      // Token gecersiz, login sayfasini goster
    }
  }
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// Login islemi
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Kullanici adi ve sifre gerekli.' });
  }

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Gecersiz kullanici adi veya sifre.' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Gecersiz kullanici adi veya sifre.' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000
    });

    res.json({ success: true, message: 'Giris basarili.' });
  } catch (err) {
    console.error('Login hatasi:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  }
});

// Dashboard
router.get('/dashboard', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// Email listesi API (arama destekli)
router.get('/emails', authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const filter = {};
    if (search) {
      filter.email = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const [emails, total] = await Promise.all([
      Email.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Email.countDocuments(filter)
    ]);

    res.json({ emails, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Email listesi hatasi:', err);
    res.status(500).json({ message: 'Sunucu hatasi.' });
  }
});

// Tek email sil
router.delete('/emails/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Gecersiz ID.' });
    }

    const result = await Email.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Email bulunamadi.' });
    }

    res.json({ success: true, message: 'Email silindi.' });
  } catch (err) {
    console.error('Email silme hatasi:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  }
});

// Toplu email sil
router.post('/emails/bulk-delete', authenticateAdmin, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Silinecek email listesi bos.' });
    }

    if (ids.length > 500) {
      return res.status(400).json({ success: false, message: 'Tek seferde en fazla 500 email silinebilir.' });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Gecerli ID bulunamadi.' });
    }

    const result = await Email.deleteMany({ _id: { $in: validIds } });
    res.json({ success: true, message: result.deletedCount + ' email silindi.' });
  } catch (err) {
    console.error('Toplu silme hatasi:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  }
});

// CSV export (CSV injection korumasli)
router.get('/export-csv', authenticateAdmin, async (req, res) => {
  try {
    const emails = await Email.find().sort({ createdAt: -1 }).lean();

    let csv = 'Email,Kayit Tarihi\n';
    for (const entry of emails) {
      const date = new Date(entry.createdAt).toLocaleString('tr-TR');
      const safeEmail = sanitizeCsvValue(entry.email);
      const safeDate = sanitizeCsvValue(date);
      csv += `${safeEmail},${safeDate}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=miledute-emails.csv');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('CSV export hatasi:', err);
    res.status(500).json({ message: 'CSV olusturulurken hata olustu.' });
  }
});

// Sifre degistir
router.post('/change-password', authenticateAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Mevcut ve yeni sifre gerekli.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Yeni sifre en az 8 karakter olmali.' });
  }

  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin bulunamadi.' });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mevcut sifre yanlis.' });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: 'Sifre basariyla degistirildi.' });
  } catch (err) {
    console.error('Sifre degistirme hatasi:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

function sanitizeCsvValue(value) {
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

module.exports = router;
