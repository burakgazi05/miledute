require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Guvenlik
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// Rotalar
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Sayfa bulunamadi.' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Beklenmeyen hata:', err.message);
  res.status(500).json({ success: false, message: 'Sunucu hatasi.' });
});

// Sunucu baslatma
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu calisiyor: http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} alindi. Sunucu kapatiliyor...`);
  server.close(() => {
    console.log('Sunucu kapatildi.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Graceful shutdown zaman asimina ugradi, zorla kapatiliyor.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
