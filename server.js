require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Guvenlik
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// Rotalar
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// MongoDB baglantisi ve sunucu baslatma
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB baglantisi basarili.');
    app.listen(PORT, () => {
      console.log(`Sunucu calisiyor: http://localhost:${PORT}`);
      console.log(`Admin panel: http://localhost:${PORT}/admin/login`);
    });
  })
  .catch((err) => {
    console.error('MongoDB baglanti hatasi:', err.message);
    process.exit(1);
  });
