const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Email = require('../models/Email');

const router = express.Router();

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5,
  message: { success: false, message: 'Cok fazla istek gonderdiniz. Lutfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false
});

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

module.exports = router;
