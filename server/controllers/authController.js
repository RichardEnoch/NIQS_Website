const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { sendMail, passwordResetEmailHtml, publicBase } = require('../utils/email');

const generateToken = (id, isAdmin = false) => {
  return jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, true);
    setTokenCookie(res, token);

    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        assignedChapter: admin.assignedChapter,
        avatar: admin.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Member login
exports.memberLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, false);
    setTokenCookie(res, token);

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Member registration
exports.registerMember = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, membershipType } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ email, password, firstName, lastName, phone, membershipType });
    const token = generateToken(user._id, false);
    setTokenCookie(res, token);

    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user/admin
exports.getMe = async (req, res) => {
  try {
    if (req.admin) {
      // Shape the client expects: { admin: { ... } }
      return res.json({ admin: req.admin, type: 'admin' });
    }
    if (req.user) {
      // Shape the client expects: { user: { ... } }
      return res.json({ user: req.user, type: 'member' });
    }
    if (req.employer) {
      return res.json({ employer: req.employer, type: 'employer' });
    }
    res.status(401).json({ message: 'Not authenticated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Admin-only password reset (email link) ──────────────────────────────────
// Generic response always (no account enumeration). Sends a 30-min reset link
// via the shared email util; if SMTP isn't configured the link is logged server-side.
exports.adminForgotPassword = async (req, res) => {
  const generic = { message: 'If an admin account exists for that email, a reset link has been sent.' };
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) return res.json(generic);

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.isActive) return res.json(generic);

    const rawToken = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    admin.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await admin.save();

    const base = (publicBase() || req.headers.origin || '').replace(/\/$/, '');
    const link = `${base}/reset-password/${rawToken}?type=admin`;

    const result = await sendMail({
      to: admin.email,
      subject: 'Reset your NIQS admin password',
      html: passwordResetEmailHtml(admin, link),
      text: `Reset your NIQS admin password (expires in 30 minutes): ${link}`,
    });
    if (!result.sent) {
      console.warn(`[admin reset] SMTP not configured — reset link for ${admin.email}: ${link}`);
    }
    return res.json(generic);
  } catch (error) {
    // Never reveal internal errors on this endpoint
    return res.json(generic);
  }
};

exports.adminResetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    admin.password = password; // pre-save hook bcrypt-hashes
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.isActive = true;
    await admin.save();

    return res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── One-time seed: create the first main_admin ──────────────────────────────
// Only works when NO admins exist yet. Auto-disables after first use.
exports.seedAdmin = async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) {
      return res.status(403).json({ message: 'Admin account already exists. Seed disabled.' });
    }

    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const admin = await Admin.create({
      email,
      password,
      firstName: firstName || 'Main',
      lastName:  lastName  || 'Admin',
      role:      'main_admin',
      isActive:  true,
    });

    const token = generateToken(admin._id, true);
    setTokenCookie(res, token);

    res.status(201).json({
      message: 'Main admin created successfully. This endpoint is now disabled.',
      admin: { id: admin._id, email: admin.email, role: admin.role },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── One-time seed: create a test member account ─────────────────────────────
exports.seedMember = async (req, res) => {
  try {
    const testEmail = 'testmember@niqs.org';
    const existing = await User.findOne({ email: testEmail });
    if (existing) {
      return res.status(200).json({
        message: 'Test member already exists',
        credentials: { email: testEmail, password: 'member1' }
      });
    }

    await User.create({
      email:          testEmail,
      password:       'member1',
      firstName:      'Tunde',
      lastName:       'Adeyemi',
      phone:          '08012345678',
      membershipType: 'graduate',
      isVerified:     true,
    });

    res.status(201).json({
      message: 'Test member created successfully',
      credentials: { email: testEmail, password: 'member1' }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Logout
exports.logout = (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
  res.json({ message: 'Logged out successfully' });
};

// Forgot password (member)
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save();

    // In production, send email here with resetToken
    res.json({ message: 'If that email exists, a reset link has been sent', resetToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
