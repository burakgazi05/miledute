const jwt = require('jsonwebtoken');

function authenticateAdmin(req, res, next) {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.redirect('/admin/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.clearCookie('admin_token');
    return res.redirect('/admin/login');
  }
}

module.exports = { authenticateAdmin };
