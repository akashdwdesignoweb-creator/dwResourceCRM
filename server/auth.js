const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dw_resource_tracker_jwt_super_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      secondary_role: user.secondary_role || null,
      skill: user.skill,
      department: user.department,
      capacity_pct: user.capacity_pct || 80
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token.' });
    }

    try {
      const freshUser = db.prepare(`
        SELECT id, email, name, role, secondary_role, department, skill, capacity_pct, capacity_hours, status, must_change_password 
        FROM users WHERE id = ?
      `).get(decoded.id);

      if (!freshUser || freshUser.status === 'Inactive') {
        return res.status(401).json({ error: 'User account disabled or not found.' });
      }

      // Enforce mandatory password change: block access to all CRM resources until initial password is changed
      const isAllowedPasswordEndpoint = 
        req.path === '/api/auth/change-password' || 
        req.path === '/api/auth/me' ||
        req.path.endsWith('/change-password') ||
        req.path.endsWith('/me');

      if (freshUser.must_change_password && freshUser.role !== 'ADMIN' && !isAllowedPasswordEndpoint) {
        return res.status(403).json({ 
          code: 'MUST_CHANGE_PASSWORD',
          error: 'Action Required: You must change your initial temporary password before accessing CRM resources.' 
        });
      }

      req.user = freshUser;
      next();
    } catch (dbErr) {
      req.user = decoded;
      next();
    }
  });
}

function requireRoles(roles) {
  return (req, res, next) => {
    const hasRole = req.user && (
      roles.includes(req.user.role) || 
      (req.user.secondary_role && roles.includes(req.user.secondary_role))
    );
    if (!hasRole) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${roles.join(' or ')}. Your role: ${req.user ? req.user.role : 'None'}`
      });
    }
    next();
  };
}

const crypto = require('crypto');

function generateTempToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      step: 'MFA_REQUIRED'
    },
    JWT_SECRET,
    { expiresIn: '10m' }
  );
}

function verifyTempToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.step !== 'MFA_REQUIRED') {
      return null;
    }
    return decoded;
  } catch (err) {
    return null;
  }
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

module.exports = {
  JWT_SECRET,
  generateToken,
  generateTempToken,
  verifyTempToken,
  generateOTP,
  maskEmail,
  authenticateToken,
  requireRoles
};

