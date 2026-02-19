const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Email = require('../models/Email');
const Experience = require('../models/Experience');

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
      const existing = await Email.findOne({ email: req.body.email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Bu email adresi zaten kayitli.' });
      }

      await Email.create({ email: req.body.email });
      res.status(201).json({ success: true, message: 'Davet listemize basariyla eklendiniz.' });
    } catch (err) {
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
      const result = await Email.findOneAndDelete({ email: req.body.email });
      if (!result) {
        return res.status(404).json({ success: false, message: 'Bu email adresi listede bulunamadi.' });
      }

      res.json({ success: true, message: 'Listeden basariyla cikarildiniz.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Bir hata olustu. Lutfen tekrar deneyin.' });
    }
  }
);

// Public deneyim listesi
router.get('/experiences', async (req, res) => {
  try {
    const experiences = await Experience.find({ active: true })
      .sort({ order: 1 })
      .select('title description')
      .lean();

    res.json({ experiences });
  } catch (err) {
    res.status(500).json({ experiences: [] });
  }
});

module.exports = router;
