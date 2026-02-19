const jwt = require('jsonwebtoken');

function authenticateAdmin(req, res, next) {
  const token = req.cookies.admin_token;

  if (!token) {
    if (req.xhr || req.headers.accept === 'application/json' || req.path !== '/dashboard') {
      return res.status(401).json({ success: false, message: 'Yetkisiz erisim.' });
    }
    return res.redirect('/admin/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.clearCookie('admin_token');
    if (req.xhr || req.headers.accept === 'application/json' || req.path !== '/dashboard') {
      return res.status(401).json({ success: false, message: 'Oturum suresi doldu.' });
    }
    return res.redirect('/admin/login');
  }
}

module.exports = { authenticateAdmin };
