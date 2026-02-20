const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sheets = require('../lib/sheets');

const router = express.Router();

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Cok fazla istek gonderdiniz. Lutfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Email kayit
router.post(
  '/subscribe',
  subscribeLimiter,
  body('email').isEmail().withMessage('Gecerli bir email adresi giriniz').normalizeEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    try {
      const existing = await sheets.findEmail(req.body.email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Bu email adresi zaten kayitli.' });
      }

      await sheets.appendEmail(req.body.email);
      res.status(201).json({ success: true, message: 'Davet listemize basariyla eklendiniz.' });
    } catch (err) {
      console.error('Subscribe hatasi:', err);
      res.status(500).json({ success: false, message: 'Bir hata olustu. Lutfen tekrar deneyin.' });
    }
  }
);

// Unsubscribe sayfasi
router.get('/unsubscribe', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'unsubscribe.html'));
});

// Unsubscribe islemi
router.post(
  '/unsubscribe',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Cok fazla istek. Lutfen daha sonra tekrar deneyin.' }
  }),
  body('email').isEmail().withMessage('Gecerli bir email adresi giriniz').normalizeEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    try {
      const deleted = await sheets.deleteEmailByAddress(req.body.email);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Bu email adresi listede bulunamadi.' });
      }

      res.json({ success: true, message: 'Listeden basariyla cikarildiniz.' });
    } catch (err) {
      console.error('Unsubscribe hatasi:', err);
      res.status(500).json({ success: false, message: 'Bir hata olustu. Lutfen tekrar deneyin.' });
    }
  }
);

// Public deneyim listesi
router.get('/experiences', (req, res) => {
  try {
    const data = require('../data/experiences.json');
    const experiences = data.filter(e => e.active);
    res.json({ experiences });
  } catch {
    res.json({ experiences: [] });
  }
});

module.exports = router;
