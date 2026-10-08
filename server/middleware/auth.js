const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

// Verify JWT token — works for both admins and members
const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Also check Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized — no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.isAdmin) {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin || !admin.isActive) {
        return res.status(401).json({ message: 'Admin account deactivated' });
      }
      req.admin = admin;
      req.userRole = admin.role;
    } else {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
      req.userRole = 'member';
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized — token invalid' });
  }
};

// Admin-only middleware (must be used after protect)
const adminOnly = (req, res, next) => {
  if (!req.admin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Member-only middleware (must be used after protect)
const memberOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Member access required' });
  }
  next();
};

// Attach req.user / req.admin when a valid token is present; never rejects.
// For public routes that show more to signed-in visitors.
const optionalAuth = async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.isAdmin) {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (admin?.isActive) { req.admin = admin; req.userRole = admin.role; }
    } else {
      const user = await User.findById(decoded.id).select('-password');
      if (user) { req.user = user; req.userRole = 'member'; }
    }
  } catch (_) { /* expired or bad token: treat as anonymous */ }
  next();
};

module.exports = { protect, adminOnly, memberOnly, optionalAuth };
