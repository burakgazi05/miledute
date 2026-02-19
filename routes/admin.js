const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const Email = require('../models/Email');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5,
  message: 'Cok fazla basarisiz giris denemesi. 15 dakika sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false
});

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
      maxAge: 2 * 60 * 60 * 1000 // 2 saat
    });

    res.json({ success: true, message: 'Giris basarili.' });
  } catch {
    res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
  }
});

// Dashboard
router.get('/dashboard', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// Email listesi API (dashboard icin)
router.get('/emails', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      Email.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Email.countDocuments()
    ]);

    res.json({ emails, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: 'Sunucu hatasi.' });
  }
});

// CSV export
router.get('/export-csv', authenticateAdmin, async (req, res) => {
  try {
    const emails = await Email.find().sort({ createdAt: -1 }).lean();

    let csv = 'Email,Kayit Tarihi\n';
    for (const entry of emails) {
      const date = new Date(entry.createdAt).toLocaleString('tr-TR');
      csv += `${entry.email},${date}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=miledute-emails.csv');
    res.send('\uFEFF' + csv); // BOM for Excel Turkish character support
  } catch {
    res.status(500).json({ message: 'CSV olusturulurken hata olustu.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

module.exports = router;
