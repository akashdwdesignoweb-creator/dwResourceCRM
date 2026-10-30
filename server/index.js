require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generateToken, generateTempToken, verifyTempToken, generateOTP, maskEmail, authenticateToken, requireRoles } = require('./auth');
const { ROLE_PERMISSIONS, sanitizeFields } = require('./permissions');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Enterprise HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Helper to format any UTC or SQLite timestamp in Indian Standard Time (IST - Asia/Kolkata)
function formatToIST(dateStr, options = {}) {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
    str = str + 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  });
}

function formatFullIST(dateStr) {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
    str = str + 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Audit helper for column and row mutations
function logAudit(userId, userName, userRole, action, entity, entityId, fieldName, oldValue, newValue) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, user_role, action, entity, entity_id, field_name, old_value, new_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, userName, userRole, action, entity, entityId, fieldName, String(oldValue ?? ''), String(newValue ?? ''), new Date().toISOString());
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// Security & Authentication events audit logger
function logSecurityEvent(userId, email, eventType, status, req, details = '') {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    db.prepare(`
      INSERT INTO security_events (user_id, email, event_type, status, ip_address, user_agent, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId || null, email || '', eventType, status, String(ip), String(ua).substring(0, 255), details, new Date().toISOString());
  } catch (err) {
    console.error('Security event log failed:', err.message);
  }
}

// ==========================================
// 1. AUTHENTICATION & MULTI-FACTOR VERIFICATION (OTP)
// ==========================================

// Step 1: Verify credentials and issue OTP challenge
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Work email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  if (!user) {
    logSecurityEvent(null, cleanEmail, 'LOGIN_FAILED', 'FAILED', req, 'Unregistered email address attempted');
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Check account lockout status via SQLite UTC comparison
  const lockCheck = db.prepare(`
    SELECT 
      (locked_until IS NOT NULL AND locked_until > datetime('now')) as is_locked,
      CAST((strftime('%s', locked_until) - strftime('%s', 'now')) / 60 AS INTEGER) + 1 as remaining_minutes
    FROM users WHERE id = ?
  `).get(user.id);

  if (lockCheck && lockCheck.is_locked) {
    const remainingMinutes = Math.max(1, lockCheck.remaining_minutes || 1);
    logSecurityEvent(user.id, user.email, 'LOGIN_BLOCKED', 'BLOCKED', req, `Account locked. ${remainingMinutes} min remaining`);
    return res.status(423).json({
      error: `Security Lockout: Account temporarily locked due to repeated failed attempts. Please retry in ${remainingMinutes} minute(s) or contact Kalash/Bhavik.`
    });
  } else if (user.locked_until) {
    // Lock expired, reset
    db.prepare('UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?').run(user.id);
    user.failed_login_attempts = 0;
    user.locked_until = null;
  }

  let valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    if ((password === 'admin@123' || password === 'admin123') && 
        (bcrypt.compareSync('admin123', user.password_hash) || bcrypt.compareSync('admin@123', user.password_hash))) {
      valid = true;
    } else if ((password === 'password@123' || password === 'password123') && 
        (bcrypt.compareSync('password123', user.password_hash) || bcrypt.compareSync('password@123', user.password_hash))) {
      valid = true;
    }
  }
  if (!valid) {
    const newAttempts = (user.failed_login_attempts || 0) + 1;
    if (newAttempts >= 5) {
      db.prepare(`
        UPDATE users 
        SET failed_login_attempts = ?, 
            locked_until = datetime(CURRENT_TIMESTAMP, '+15 minutes')
        WHERE id = ?
      `).run(newAttempts, user.id);
      logSecurityEvent(user.id, user.email, 'ACCOUNT_LOCKED', 'LOCKED', req, '5 consecutive failed password attempts');
      return res.status(423).json({
        error: 'Security Lockout: Account locked for 15 minutes due to 5 consecutive failed login attempts.'
      });
    } else {
      db.prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?').run(newAttempts, user.id);
      const remaining = 5 - newAttempts;
      logSecurityEvent(user.id, user.email, 'LOGIN_FAILED', 'FAILED', req, `Invalid password. ${newAttempts}/5 attempts`);
      return res.status(401).json({
        error: `Invalid email or password. ${remaining} attempt(s) remaining before security lockout.`
      });
    }
  }

  // Direct login with Super-Admin provisioned credentials (2FA not required)
  db.prepare(`
    UPDATE users 
    SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP, last_login_ip = ?
    WHERE id = ?
  `).run(String(req.socket?.remoteAddress || ''), user.id);

  const token = generateToken(user);
  logSecurityEvent(user.id, user.email, 'LOGIN_SUCCESS', 'SUCCESS', req, 'Direct login with corporate credentials');

  const mustChange = Boolean(user.must_change_password && user.role !== 'ADMIN');

  res.json({
    mfa_required: false,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      secondary_role: user.secondary_role || null,
      department: user.department,
      skill: user.skill,
      capacity_hours: user.capacity_hours,
      status: user.status,
      must_change_password: mustChange
    },
    permissions: ROLE_PERMISSIONS[user.role]
  });
});

// Step 2: Verify 6-digit OTP and complete login
app.post('/api/auth/verify-otp', (req, res) => {
  const { temp_token, otp } = req.body;
  if (!temp_token || !otp) {
    return res.status(400).json({ error: 'Session token and 6-digit verification code are required.' });
  }

  const decoded = verifyTempToken(temp_token);
  if (!decoded) {
    return res.status(401).json({ error: 'Verification session expired or invalid. Please sign in again.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Check lockout via SQLite UTC
  const lockCheck = db.prepare(`
    SELECT (locked_until IS NOT NULL AND locked_until > datetime('now')) as is_locked
    FROM users WHERE id = ?
  `).get(user.id);
  if (lockCheck && lockCheck.is_locked) {
    return res.status(423).json({ error: 'Account is currently locked. Please contact your administrator.' });
  }

  // Look up latest active OTP
  const activeOtp = db.prepare(`
    SELECT * FROM otp_codes
    WHERE user_id = ? AND purpose = 'LOGIN' AND is_used = 0 AND expires_at > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(user.id);

  if (!activeOtp) {
    logSecurityEvent(user.id, user.email, 'OTP_FAILED', 'FAILED', req, 'No active OTP or expired');
    return res.status(400).json({ error: 'Verification code expired or not found. Please click Resend Code.' });
  }

  if (activeOtp.attempts >= activeOtp.max_attempts) {
    db.prepare('UPDATE otp_codes SET is_used = 1 WHERE id = ?').run(activeOtp.id);
    logSecurityEvent(user.id, user.email, 'OTP_BLOCKED', 'BLOCKED', req, 'Max attempts reached on OTP');
    return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please request a new code.' });
  }

  const cleanInput = String(otp).trim();
  if (cleanInput !== activeOtp.code) {
    const newAttempts = activeOtp.attempts + 1;
    db.prepare('UPDATE otp_codes SET attempts = ? WHERE id = ?').run(newAttempts, activeOtp.id);
    const remaining = activeOtp.max_attempts - newAttempts;
    logSecurityEvent(user.id, user.email, 'OTP_FAILED', 'FAILED', req, `Invalid code: entered ${cleanInput}. ${remaining} attempts remaining`);
    return res.status(400).json({ error: `Invalid verification code. ${remaining} attempt(s) remaining.` });
  }

  // Successful verification
  db.prepare('UPDATE otp_codes SET is_used = 1 WHERE id = ?').run(activeOtp.id);

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  db.prepare(`
    UPDATE users 
    SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP, last_login_ip = ?
    WHERE id = ?
  `).run(String(clientIp), user.id);

  logSecurityEvent(user.id, user.email, 'LOGIN_SUCCESS', 'SUCCESS', req, 'OTP verified successfully');
  logAudit(user.id, user.name, user.role, 'LOGIN_MFA_SUCCESS', 'users', user.id, 'session', null, 'authenticated');

  const token = generateToken(user);
  const mustChange = Boolean(user.must_change_password && user.role !== 'ADMIN');
  res.json({
    message: 'Identity verification successful.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      secondary_role: user.secondary_role || null,
      department: user.department,
      skill: user.skill,
      capacity_hours: user.capacity_hours,
      status: user.status,
      must_change_password: mustChange
    },
    permissions: ROLE_PERMISSIONS[user.role]
  });
});

// Step 3: Resend OTP
app.post('/api/auth/resend-otp', (req, res) => {
  const { temp_token } = req.body;
  if (!temp_token) {
    return res.status(400).json({ error: 'Session token is required.' });
  }

  const decoded = verifyTempToken(temp_token);
  if (!decoded) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Rate limit: 20 seconds cooldown
  const recent = db.prepare(`
    SELECT created_at FROM otp_codes 
    WHERE user_id = ? AND purpose = 'LOGIN' AND created_at > datetime('now', '-20 seconds')
    ORDER BY id DESC LIMIT 1
  `).get(user.id);

  if (recent) {
    return res.status(429).json({ error: 'Please wait 20 seconds before requesting another code.' });
  }

  // Invalidate previous OTPs
  db.prepare("UPDATE otp_codes SET is_used = 1 WHERE user_id = ? AND purpose = 'LOGIN'").run(user.id);

  const otpCode = generateOTP();
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  db.prepare(`
    INSERT INTO otp_codes (user_id, email, code, purpose, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, 'LOGIN', datetime('now', '+10 minutes'), ?, ?)
  `).run(user.id, user.email, otpCode, String(clientIp), String(userAgent).substring(0, 255));

  const refreshedTempToken = generateTempToken(user);
  logSecurityEvent(user.id, user.email, 'OTP_RESENT', 'SUCCESS', req, 'Fresh OTP code dispatched');

  console.log(`\n==================================================`);
  console.log(`🔄 [SECURITY MFA RESEND]`);
  console.log(`User: ${user.name} (${user.email})`);
  console.log(`Fresh 6-Digit Verification Code: >>> ${otpCode} <<<`);
  console.log(`==================================================\n`);

  const isProd = process.env.NODE_ENV === 'production';

  res.json({
    message: 'A fresh verification code has been dispatched.',
    temp_token: refreshedTempToken,
    ...(isProd ? {} : { dev_otp: otpCode }),
    expires_in_seconds: 600
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, secondary_role, department, skill, capacity_hours, status, must_change_password FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const mustChange = Boolean(user.must_change_password && user.role !== 'ADMIN');
  res.json({
    user: {
      ...user,
      must_change_password: mustChange
    },
    permissions: ROLE_PERMISSIONS[user.role]
  });
});

// User Password Update (Initial setup or manual change)
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || String(new_password).trim().length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const cleanNew = String(new_password).trim();
  if (cleanNew.toLowerCase() === 'password123' || cleanNew.toLowerCase() === 'password@123') {
    return res.status(400).json({ error: 'New password cannot be the default temporary initial password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // If current_password is provided, verify it
  if (current_password) {
    let valid = bcrypt.compareSync(current_password, user.password_hash);
    if (!valid) {
      if ((current_password === 'password@123' || current_password === 'password123') &&
          (bcrypt.compareSync('password123', user.password_hash) || bcrypt.compareSync('password@123', user.password_hash))) {
        valid = true;
      } else if ((current_password === 'admin@123' || current_password === 'admin123') &&
          (bcrypt.compareSync('admin123', user.password_hash) || bcrypt.compareSync('admin@123', user.password_hash))) {
        valid = true;
      }
    }
    if (!valid) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }
  } else if (!user.must_change_password) {
    return res.status(400).json({ error: 'Current password is required to change password.' });
  }

  const newHash = bcrypt.hashSync(cleanNew, 10);
  db.prepare(`
    UPDATE users 
    SET password_hash = ?, must_change_password = 0, failed_login_attempts = 0 
    WHERE id = ?
  `).run(newHash, user.id);

  logSecurityEvent(user.id, user.email, 'PASSWORD_CHANGED', 'SUCCESS', req, 'User successfully changed password');
  logAudit(user.id, user.name, user.role, 'CHANGE_PASSWORD', 'users', user.id, 'password', null, 'Password updated');

  const freshUser = db.prepare(`
    SELECT id, email, name, role, secondary_role, department, skill, capacity_hours, status, must_change_password 
    FROM users WHERE id = ?
  `).get(user.id);

  res.json({
    message: 'Password changed successfully. Your account is secured.',
    user: {
      ...freshUser,
      must_change_password: false
    }
  });
});

// ==========================================
// 2. DASHBOARD KPI STATS
// ==========================================

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const isDeptManager = (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') && req.user.department && req.user.department !== 'GENERAL';
  const dept = isDeptManager ? req.user.department : null;

  const totalResources = dept
    ? db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active' AND UPPER(department) = UPPER(?)").get(dept).count
    : db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active'").get().count;

  const totalProjects = dept
    ? db.prepare(`
        SELECT COUNT(DISTINCT a.project_id) as count 
        FROM allocations a 
        JOIN users u ON a.user_id = u.id 
        WHERE UPPER(u.department) = UPPER(?) AND a.project_id IS NOT NULL
      `).get(dept).count
    : db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'Active'").get().count;
  
  // High risk projects
  const highRiskProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE weekly_risk IN ('High', 'Red')").get().count;
  const amberRiskProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE weekly_risk IN ('Medium', 'Amber')").get().count;

  // Current period
  const currentPeriod = db.prepare('SELECT id, name FROM periods WHERE is_current = 1').get() || db.prepare('SELECT id, name FROM periods ORDER BY id DESC LIMIT 1').get();
  
  // Utilization stats in current period
  let totalAllocatedPct = 0;
  let allocatedCount = 0;
  let benchCount = 0;

  if (currentPeriod) {
    const allocationsQuery = dept
      ? `
        SELECT a.user_id, SUM(a.allocated_pct) as total_alloc
        FROM allocations a
        JOIN users u ON a.user_id = u.id
        WHERE a.period_id = ? AND UPPER(u.department) = UPPER(?)
        GROUP BY a.user_id
      `
      : `
        SELECT user_id, SUM(allocated_pct) as total_alloc
        FROM allocations
        WHERE period_id = ?
        GROUP BY user_id
      `;
    
    const allocations = dept
      ? db.prepare(allocationsQuery).all(currentPeriod.id, dept)
      : db.prepare(allocationsQuery).all(currentPeriod.id);

    const benchCountQuery = dept
      ? `
        SELECT COUNT(*) as count FROM users
        WHERE id NOT IN (SELECT DISTINCT user_id FROM allocations WHERE period_id = ? AND allocated_pct > 0)
        AND role IN ('DEVELOPER', 'QA', 'TECH_LEAD', 'MANAGER')
        AND UPPER(department) = UPPER(?)
      `
      : `
        SELECT COUNT(*) as count FROM users
        WHERE id NOT IN (SELECT DISTINCT user_id FROM allocations WHERE period_id = ? AND allocated_pct > 0)
        AND role IN ('DEVELOPER', 'QA', 'TECH_LEAD')
      `;

    benchCount = dept
      ? db.prepare(benchCountQuery).get(currentPeriod.id, dept).count
      : db.prepare(benchCountQuery).get(currentPeriod.id).count;

    allocations.forEach(a => {
      totalAllocatedPct += a.total_alloc;
      allocatedCount++;
    });
  }

  const avgUtilization = allocatedCount > 0 ? Math.round(totalAllocatedPct / allocatedCount) : 0;

  // Signed in users today (IST calendar day: UTC+5:30)
  const signedInUsersToday = db.prepare(`
    SELECT 
      coalesce(u.id, 0) as id, 
      coalesce(u.name, se.email) as name, 
      se.email, 
      coalesce(u.role, 'USER') as role, 
      coalesce(u.department, 'GENERAL') as department, 
      MAX(se.created_at) as last_login_today
    FROM security_events se
    LEFT JOIN users u ON (u.id = se.user_id OR LOWER(u.email) = LOWER(se.email))
    WHERE se.event_type = 'LOGIN_SUCCESS'
      AND date(replace(replace(se.created_at, 'T', ' '), 'Z', ''), '+5 hours', '+30 minutes') = date('now', '+5 hours', '+30 minutes')
    GROUP BY coalesce(nullif(u.id, 0), se.email)
    ORDER BY last_login_today DESC
  `).all().map(u => ({
    ...u,
    time_ist: formatToIST(u.last_login_today)
  }));

  const activeUsersToday = signedInUsersToday.length;

  const pendingPasswordResets = db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE must_change_password = 1 AND role != 'ADMIN' AND (status IS NULL OR status != 'INACTIVE')
  `).get().count;

  res.json({
    totalResources,
    totalProjects,
    highRiskProjects,
    amberRiskProjects,
    benchCount,
    avgUtilization,
    currentPeriodName: currentPeriod ? currentPeriod.name : 'N/A',
    scopedDepartment: dept,
    activeUsersToday,
    signedInUsersToday,
    pendingPasswordResets
  });
});

// ==========================================
// 3. PERIODS (Weekly Tabs)
// ==========================================

app.get('/api/periods', authenticateToken, (req, res) => {
  const periods = db.prepare('SELECT * FROM periods ORDER BY id DESC').all();
  res.json(periods);
});

// Create new weekly cycle (manual or with allocation rollover)
app.post('/api/periods', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const { name, start_date, end_date, is_current = true, rollover_from_period_id, copy_pm_remarks = false } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Weekly cycle name is required (e.g. "Resource Allocation (19/10/26 - 23/10/26)").' });
  }

  try {
    const shouldBeCurrent = is_current ? 1 : 0;
    if (shouldBeCurrent === 1) {
      db.prepare('UPDATE periods SET is_current = 0').run();
    }

    const insertStmt = db.prepare(`
      INSERT INTO periods (name, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?)
    `);
    const result = insertStmt.run(name.trim(), start_date || '', end_date || '', shouldBeCurrent);
    const newPeriodId = result.lastInsertRowid;

    let clonedCount = 0;
    if (rollover_from_period_id) {
      const sourceAllocations = db.prepare(`
        SELECT user_id, project_id, role_title, capacity_pct, allocated_pct, allocation_days_note, pm_remarks
        FROM allocations
        WHERE period_id = ?
      `).all(rollover_from_period_id);

      const insertAlloc = db.prepare(`
        INSERT INTO allocations (period_id, user_id, project_id, role_title, capacity_pct, allocated_pct, allocation_days_note, pm_remarks, status, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
      `);

      const insertMany = db.transaction((allocs) => {
        for (const a of allocs) {
          insertAlloc.run(
            newPeriodId,
            a.user_id,
            a.project_id,
            a.role_title,
            a.capacity_pct,
            a.allocated_pct,
            a.allocation_days_note,
            copy_pm_remarks ? (a.pm_remarks || '') : '',
            req.user.id
          );
          clonedCount++;
        }
      });

      insertMany(sourceAllocations);
    }

    logAudit(req.user.id, req.user.name, req.user.role, 'CREATE_PERIOD', 'periods', newPeriodId, 'all', null, name.trim());

    res.status(201).json({
      id: newPeriodId,
      name: name.trim(),
      is_current: shouldBeCurrent === 1,
      allocations_created: clonedCount,
      message: `Weekly cycle "${name.trim()}" created successfully with ${clonedCount} team allocations rolled over.`
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A weekly cycle with this exact name already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Set active current cycle
app.patch('/api/periods/:id/set-current', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const periodId = req.params.id;
  const target = db.prepare('SELECT * FROM periods WHERE id = ?').get(periodId);
  if (!target) return res.status(404).json({ error: 'Weekly cycle not found.' });

  db.prepare('UPDATE periods SET is_current = 0').run();
  db.prepare('UPDATE periods SET is_current = 1 WHERE id = ?').run(periodId);

  logAudit(req.user.id, req.user.name, req.user.role, 'SET_CURRENT_PERIOD', 'periods', periodId, 'is_current', target.is_current, 1);

  res.json({ message: `Cycle "${target.name}" is now the active current cycle.` });
});

// Delete a cycle (Admin only)
app.delete('/api/periods/:id', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const periodId = req.params.id;
  const totalCycles = db.prepare('SELECT COUNT(*) as count FROM periods').get().count;
  if (totalCycles <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only existing cycle in the system.' });
  }

  const target = db.prepare('SELECT * FROM periods WHERE id = ?').get(periodId);
  if (!target) return res.status(404).json({ error: 'Weekly cycle not found.' });

  db.prepare('DELETE FROM periods WHERE id = ?').run(periodId);

  if (target.is_current) {
    const latest = db.prepare('SELECT id FROM periods ORDER BY id DESC LIMIT 1').get();
    if (latest) {
      db.prepare('UPDATE periods SET is_current = 1 WHERE id = ?').run(latest.id);
    }
  }

  logAudit(req.user.id, req.user.name, req.user.role, 'DELETE_PERIOD', 'periods', periodId, 'all', target.name, null);

  res.json({ message: `Weekly cycle "${target.name}" and its allocations have been removed.` });
});

// Auto-generate next week's cycle (1-click automation)
app.post('/api/periods/auto-create-next', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  try {
    const latest = db.prepare('SELECT * FROM periods ORDER BY id DESC LIMIT 1').get();
    let nextStart = new Date();
    let nextEnd = new Date();

    const dayOfWeek = nextStart.getDay();
    const daysUntilNextMonday = ((1 - dayOfWeek + 7) % 7) || 7;
    nextStart.setDate(nextStart.getDate() + daysUntilNextMonday);
    nextEnd.setDate(nextStart.getDate() + 4);

    const formatDate = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    };

    const startStr = formatDate(nextStart);
    const endStr = formatDate(nextEnd);
    const cycleName = `Resource Allocation (${startStr} - ${endStr})`;

    const existing = db.prepare('SELECT * FROM periods WHERE name = ?').get(cycleName);
    if (existing) {
      return res.status(400).json({ error: `Weekly cycle "${cycleName}" already exists.` });
    }

    db.prepare('UPDATE periods SET is_current = 0').run();
    const result = db.prepare(`
      INSERT INTO periods (name, start_date, end_date, is_current)
      VALUES (?, ?, ?, 1)
    `).run(cycleName, nextStart.toISOString().split('T')[0], nextEnd.toISOString().split('T')[0]);

    const newId = result.lastInsertRowid;
    let clonedCount = 0;

    if (latest) {
      const sourceAllocs = db.prepare('SELECT * FROM allocations WHERE period_id = ?').all(latest.id);
      const insertAlloc = db.prepare(`
        INSERT INTO allocations (period_id, user_id, project_id, role_title, capacity_pct, allocated_pct, allocation_days_note, pm_remarks, status, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, '', 'Active', ?)
      `);

      for (const a of sourceAllocs) {
        insertAlloc.run(newId, a.user_id, a.project_id, a.role_title, a.capacity_pct, a.allocated_pct, a.allocation_days_note, req.user.id);
        clonedCount++;
      }
    }

    logAudit(req.user.id, req.user.name, req.user.role, 'AUTO_CREATE_PERIOD', 'periods', newId, 'all', null, cycleName);

    res.status(201).json({
      id: newId,
      name: cycleName,
      is_current: true,
      allocations_created: clonedCount,
      message: `Next week's cycle "${cycleName}" created and activated with ${clonedCount} team allocations.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. RESOURCE ALLOCATIONS (Matrix & Table)
// ==========================================

// Developer & Member dedicated assignments view
app.get('/api/allocations/my', authenticateToken, (req, res) => {
  const { period_id } = req.query;
  let query = `
    SELECT 
      a.id, a.period_id, a.user_id, a.project_id, a.role_title,
      a.capacity_pct, a.allocated_pct, a.allocation_days_note,
      a.pm_remarks, a.tl_notes, a.member_notes, a.status, a.updated_at,
      u.name as resource_name, u.skill as resource_skill,
      p.name as project_name, p.weekly_risk as project_risk,
      p.account as project_account, p.stage as project_stage,
      p.qa_sheet_url as qa_sheet_url, p.active_qa_id as active_qa_id,
      pm.name as pm_name, tl.name as tl_name,
      per.name as period_name, per.is_current
    FROM allocations a
    JOIN users u ON a.user_id = u.id
    JOIN periods per ON a.period_id = per.id
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN users pm ON p.project_manager_id = pm.id
    LEFT JOIN users tl ON p.tech_lead_id = tl.id
    WHERE a.user_id = ?
  `;
  const params = [req.user.id];
  if (period_id) {
    query += ` AND a.period_id = ?`;
    params.push(period_id);
  }
  query += ` ORDER BY per.id DESC, a.id ASC`;

  const rows = db.prepare(query).all(...params);
  const result = rows.map(r => ({
    ...r,
    utilization_pct: r.capacity_pct > 0 ? Math.round((r.allocated_pct / r.capacity_pct) * 100) : 0
  }));
  res.json(result);
});

app.get('/api/allocations', authenticateToken, (req, res) => {
  const { period_id, project_id, role, department, search } = req.query;

  let query = `
    SELECT 
      a.id, a.period_id, a.user_id, a.project_id, a.role_title,
      a.capacity_pct, a.allocated_pct, a.allocation_days_note,
      a.pm_remarks, a.tl_notes, a.member_notes, a.status, a.updated_at,
      u.name as resource_name, u.email as resource_email, u.skill as resource_skill, u.department as resource_department,
      u.role as resource_role, u.secondary_role as resource_secondary_role, u.capacity_hours as resource_capacity_hours,
      u.capacity_pct as user_capacity_pct, u.status as resource_status,
      p.name as project_name, p.weekly_risk as project_risk,
      p.account as project_account,
      pm.name as pm_name
    FROM allocations a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN users pm ON p.project_manager_id = pm.id
    WHERE 1=1
  `;
  const params = [];

  if (period_id) {
    query += ` AND a.period_id = ?`;
    params.push(period_id);
  }
  if (project_id) {
    query += ` AND a.project_id = ?`;
    params.push(project_id);
  }
  if (role) {
    query += ` AND a.role_title = ?`;
    params.push(role);
  }

  // Department Scoping:
  // If user is a Department Manager (e.g. MOBILE, BACKEND, FRONTEND), restrict strictly to their department!
  if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      query += ` AND UPPER(u.department) = UPPER(?)`;
      params.push(req.user.department);
    }
  } else if (department) {
    query += ` AND UPPER(u.department) = UPPER(?)`;
    params.push(department);
  }

  if (search) {
    query += ` AND (u.name LIKE ? OR u.skill LIKE ? OR p.name LIKE ? OR a.pm_remarks LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += ` ORDER BY u.name ASC, a.id ASC`;

  const rows = db.prepare(query).all(...params);

  // Aggregate allocations per employee across all their active projects
  const employeeAllocTotals = {};
  rows.forEach(r => {
    if (!employeeAllocTotals[r.user_id]) {
      employeeAllocTotals[r.user_id] = {
        total_allocated: 0,
        capacity_pct: r.capacity_pct || 80,
      };
    }
    if (r.status !== 'Completed' && r.status !== 'Leave' && r.status !== 'On Leave') {
      employeeAllocTotals[r.user_id].total_allocated += (r.allocated_pct || 0);
    }
  });

  const getWorkloadStatus = (utilization) => {
    if (utilization < 70) return 'Available';
    if (utilization <= 100) return 'Balanced';
    if (utilization <= 120) return 'Overload';
    return 'Critical';
  };

  const result = rows.map(r => {
    const empData = employeeAllocTotals[r.user_id] || { total_allocated: r.allocated_pct, capacity_pct: r.capacity_pct || 80 };
    const empUtilization = empData.capacity_pct > 0 
      ? Math.round((empData.total_allocated / empData.capacity_pct) * 100) 
      : 0;
    const remainingCapacity = empData.capacity_pct - empData.total_allocated;

    return {
      ...r,
      total_employee_allocated_pct: empData.total_allocated,
      employee_capacity_pct: empData.capacity_pct,
      utilization_pct: empUtilization, // Aggregated employee utilization per Rule 4
      workload_status: getWorkloadStatus(empUtilization),
      remaining_capacity_pct: remainingCapacity,
      project_utilization_pct: r.capacity_pct > 0 ? Math.round((r.allocated_pct / r.capacity_pct) * 100) : 0
    };
  });

  res.json(result);
});

// Update an Allocation (Role-based column security)
app.patch('/api/allocations/:id', authenticateToken, (req, res) => {
  const allocationId = req.params.id;
  const userRole = req.user.role;

  const existing = db.prepare('SELECT * FROM allocations WHERE id = ?').get(allocationId);
  if (!existing) {
    return res.status(404).json({ error: 'Allocation not found.' });
  }

  // Check if developer is designated as Tech Lead on this project
  const project = existing.project_id ? db.prepare('SELECT tech_lead_id FROM projects WHERE id = ?').get(existing.project_id) : null;
  const isTechLeadOnProject = (project && project.tech_lead_id === req.user.id) || existing.role_title === 'Tech Lead';

  // Department scoping: Manager can only update their own department's members
  if (userRole === 'MANAGER' || userRole === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      const targetUser = db.prepare('SELECT department FROM users WHERE id = ?').get(existing.user_id);
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({
          error: `Permission denied. You can only manage allocations for your own department (${req.user.department}).`
        });
      }
    }
  }

  let effectiveRole = userRole;
  if (['DEVELOPER', 'QA'].includes(userRole)) {
    if (isTechLeadOnProject) {
      effectiveRole = 'TECH_LEAD';
    } else if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own assigned tasks and notes.' });
    }
  }

  const { sanitized, rejectedFields, allowedList } = sanitizeFields(effectiveRole, 'allocations', req.body, req.user.secondary_role);

  if (Object.keys(sanitized).length === 0) {
    return res.status(403).json({
      error: `Your role (${userRole}) is not permitted to edit these columns.`,
      rejectedFields,
      allowedFields: allowedList
    });
  }

  // Build SQL update dynamically for allowed fields
  const updates = [];
  const params = [];

  for (const [key, val] of Object.entries(sanitized)) {
    updates.push(`${key} = ?`);
    params.push(val);
    // Audit field change
    if (existing[key] !== val) {
      logAudit(req.user.id, req.user.name, userRole, 'UPDATE_ALLOCATION_FIELD', 'allocations', allocationId, key, existing[key], val);
    }
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  updates.push('updated_by = ?');
  params.push(req.user.id);
  params.push(allocationId);

  db.prepare(`UPDATE allocations SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT a.*, u.name as resource_name, p.name as project_name
    FROM allocations a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN projects p ON a.project_id = p.id
    WHERE a.id = ?
  `).get(allocationId);

  res.json({
    message: 'Allocation updated successfully.',
    data: updated,
    rejectedFields: rejectedFields.length > 0 ? rejectedFields : undefined
  });
});

// Create a new allocation row (PM, Manager, or Admin)
app.post('/api/allocations', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const { period_id, user_id, project_id, role_title, capacity_pct, allocated_pct, allocation_days_note, pm_remarks, status } = req.body;

  if (!period_id || !user_id) {
    return res.status(400).json({ error: 'period_id and user_id are required.' });
  }

  // Department scoping: Manager can only allocate developers from their own department
  if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      const targetUser = db.prepare('SELECT department FROM users WHERE id = ?').get(user_id);
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({
          error: `Permission denied. You can only assign projects to developers in your department (${req.user.department}).`
        });
      }
    }
  }

  const stmt = db.prepare(`
    INSERT INTO allocations (
      period_id, user_id, project_id, role_title, capacity_pct,
      allocated_pct, allocation_days_note, pm_remarks, status, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    period_id,
    user_id,
    project_id || null,
    role_title || 'Developer',
    capacity_pct || 100,
    allocated_pct || 0,
    allocation_days_note || '',
    pm_remarks || '',
    status || 'Active',
    req.user.id
  );

  logAudit(req.user.id, req.user.name, req.user.role, 'CREATE_ALLOCATION', 'allocations', result.lastInsertRowid, 'all', null, 'created');

  res.status(201).json({ id: result.lastInsertRowid, message: 'Resource allocated successfully.' });
});

// Delete an allocation row (PM, Manager, or Admin)
app.delete('/api/allocations/:id', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const existing = db.prepare('SELECT * FROM allocations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Allocation not found.' });

  // Department scoping: Manager can only delete allocations for their own department
  if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      const targetUser = db.prepare('SELECT department FROM users WHERE id = ?').get(existing.user_id);
      if (targetUser && targetUser.department !== req.user.department) {
        return res.status(403).json({
          error: `Permission denied. You can only delete allocations for your own department (${req.user.department}).`
        });
      }
    }
  }

  db.prepare('DELETE FROM allocations WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, req.user.name, req.user.role, 'DELETE_ALLOCATION', 'allocations', req.params.id, 'all', JSON.stringify(existing), 'deleted');

  res.json({ message: 'Allocation deleted successfully.' });
});

// ==========================================
// 5. PROJECTS (Listings, Lead, QA, Stage, Risk)
// ==========================================

app.get('/api/projects', authenticateToken, (req, res) => {
  const projects = db.prepare(`
    SELECT 
      p.*,
      pm.name as pm_name, pm.email as pm_email,
      tl.name as tl_name, tl.email as tl_email,
      qa.name as qa_name, qa.email as qa_email,
      (SELECT COUNT(DISTINCT user_id) FROM allocations WHERE project_id = p.id) as assigned_members_count,
      (SELECT GROUP_CONCAT(DISTINCT u.id || ':::' || u.name || ':::' || COALESCE(u.department, '') || ':::' || COALESCE(u.role, '')) 
       FROM allocations a JOIN users u ON a.user_id = u.id WHERE a.project_id = p.id) as assigned_members_raw
    FROM projects p
    LEFT JOIN users pm ON p.project_manager_id = pm.id
    LEFT JOIN users tl ON p.tech_lead_id = tl.id
    LEFT JOIN users qa ON p.active_qa_id = qa.id
    ORDER BY p.name ASC
  `).all().map(p => {
    let assigned_members = [];
    if (p.assigned_members_raw) {
      assigned_members = p.assigned_members_raw.split(',').map(str => {
        const [id, name, department, role] = str.split(':::');
        return { id: Number(id), name, department, role };
      });
    }
    const { assigned_members_raw, ...rest } = p;
    return { ...rest, assigned_members };
  });

  res.json(projects);
});

app.post('/api/projects', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const { 
    name, account, project_manager_id, tech_lead_id, active_qa_id, 
    stage, weekly_risk, weekly_blockers, qa_sheet_url, 
    production_deployment_channel, staging_deployment_channel, database_backup_url 
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Project name is required.' });

  const stmt = db.prepare(`
    INSERT INTO projects (
      name, account, project_manager_id, tech_lead_id, active_qa_id,
      stage, weekly_risk, weekly_blockers, qa_sheet_url,
      production_deployment_channel, staging_deployment_channel, database_backup_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      name,
      account || 'Internal',
      project_manager_id || req.user.id,
      tech_lead_id || null,
      active_qa_id || null,
      stage || 'In Progress',
      weekly_risk || 'Low',
      weekly_blockers || '',
      qa_sheet_url || '',
      production_deployment_channel || '#prod-deploy',
      staging_deployment_channel || '#staging-deploy',
      database_backup_url || ''
    );

    // Also create leadership and devops rows
    db.prepare(`
      INSERT INTO leadership_board (project_id, account, pm_name, lead_name, weekly_risk, project_stage, qa_sheet_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, account || 'Internal', req.user.name, 'Unassigned', weekly_risk || 'Low', stage || 'In Progress', qa_sheet_url || '');

    db.prepare(`
      INSERT INTO devops_checks (project_id, account, prod_channel, stage_channel, db_backup_url, assigned_person, project_lead)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      result.lastInsertRowid,
      account || 'Internal',
      production_deployment_channel || '#prod-deploy',
      staging_deployment_channel || '#stage-deploy',
      database_backup_url || '',
      'Deepanshu Tyagi (DevOps)',
      'Tech Lead'
    );

    logAudit(req.user.id, req.user.name, req.user.role, 'CREATE_PROJECT', 'projects', result.lastInsertRowid, 'all', null, name);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Project created successfully.' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A project with this name already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userRole = req.user.role;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });

  const { sanitized, rejectedFields, allowedList } = sanitizeFields(userRole, 'projects', req.body, req.user.secondary_role);

  if (Object.keys(sanitized).length === 0) {
    return res.status(403).json({
      error: `Your role (${userRole}) is not permitted to edit these project fields.`,
      rejectedFields,
      allowedFields: allowedList
    });
  }

  const updates = [];
  const params = [];

  for (const [key, val] of Object.entries(sanitized)) {
    updates.push(`${key} = ?`);
    params.push(val);
    if (existing[key] !== val) {
      logAudit(req.user.id, req.user.name, userRole, 'UPDATE_PROJECT_FIELD', 'projects', projectId, key, existing[key], val);
    }
  }

  // If QA updates or adds QA sheet and project has no active QA, auto-link them
  if (userRole === 'QA' && !existing.active_qa_id && sanitized.qa_sheet_url) {
    updates.push('active_qa_id = ?');
    params.push(req.user.id);
  }

  params.push(projectId);
  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // If status or stage is updated to 'Completed', free all assigned resources from this project
  if (sanitized.status === 'Completed' || sanitized.stage === 'Completed') {
    db.prepare(`
      UPDATE allocations 
      SET allocated_pct = 0, status = 'Completed', pm_remarks = COALESCE(pm_remarks || ' | ', '') || 'Project Completed (Resources Freed)'
      WHERE project_id = ?
    `).run(projectId);

    logAudit(req.user.id, req.user.name, userRole, 'COMPLETE_PROJECT_FREE_RESOURCES', 'projects', projectId, 'status', existing.status, 'Completed');
  }

  // Sync leadership board if risk, blockers, stage, or qa_sheet_url changed
  if (sanitized.weekly_risk || sanitized.weekly_blockers !== undefined || sanitized.stage || sanitized.qa_sheet_url !== undefined) {
    const leadUpdates = [];
    const leadParams = [];
    if (sanitized.weekly_risk) { leadUpdates.push('weekly_risk = ?'); leadParams.push(sanitized.weekly_risk); }
    if (sanitized.weekly_blockers !== undefined) { leadUpdates.push('weekly_blockers = ?'); leadParams.push(sanitized.weekly_blockers); }
    if (sanitized.stage) { leadUpdates.push('project_stage = ?'); leadParams.push(sanitized.stage); }
    if (sanitized.qa_sheet_url !== undefined) { leadUpdates.push('qa_sheet_url = ?'); leadParams.push(sanitized.qa_sheet_url); }
    if (leadUpdates.length > 0) {
      leadParams.push(projectId);
      db.prepare(`UPDATE leadership_board SET ${leadUpdates.join(', ')} WHERE project_id = ?`).run(...leadParams);
    }
  }

  // Sync devops_checks if deployment channels or database backup URL changed
  if (sanitized.production_deployment_channel || sanitized.staging_deployment_channel || sanitized.database_backup_url !== undefined) {
    const devUpdates = [];
    const devParams = [];
    if (sanitized.production_deployment_channel) { devUpdates.push('prod_channel = ?'); devParams.push(sanitized.production_deployment_channel); }
    if (sanitized.staging_deployment_channel) { devUpdates.push('stage_channel = ?'); devParams.push(sanitized.staging_deployment_channel); }
    if (sanitized.database_backup_url !== undefined) { devUpdates.push('db_backup_url = ?'); devParams.push(sanitized.database_backup_url); }
    if (devUpdates.length > 0) {
      devParams.push(projectId);
      db.prepare(`UPDATE devops_checks SET ${devUpdates.join(', ')} WHERE project_id = ?`).run(...devParams);
    }
  }

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.json({ message: 'Project updated.', data: updated, rejectedFields: rejectedFields.length > 0 ? rejectedFields : undefined });
});

// DELETE a Project (Super Admin only)
app.delete('/api/projects/:id', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const projectId = req.params.id;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  // Delete project and cascade related allocations, leadership and devops rows
  db.prepare('DELETE FROM allocations WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM leadership_board WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM devops_checks WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

  logAudit(req.user.id, req.user.name, req.user.role, 'DELETE_PROJECT', 'projects', projectId, 'all', project.name, null);

  res.json({ message: `Project "${project.name}" and all related allocations were permanently deleted.` });
});

// ==========================================
// 6. USERS / TEAM MANAGEMENT
// ==========================================

app.get('/api/users', authenticateToken, (req, res) => {
  const { department, role, search } = req.query;
  const currentPeriod = db.prepare('SELECT id FROM periods WHERE is_current = 1').get() || db.prepare('SELECT id FROM periods ORDER BY id DESC LIMIT 1').get();

  let whereClause = 'WHERE 1=1';
  const filterParams = [];

  // Scoped to department if manager
  if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      whereClause += ` AND UPPER(u.department) = UPPER(?)`;
      filterParams.push(req.user.department);
    }
  } else if (department) {
    whereClause += ` AND UPPER(u.department) = UPPER(?)`;
    filterParams.push(department);
  }

  if (role) {
    whereClause += ` AND u.role = ?`;
    filterParams.push(role);
  }

  if (search) {
    whereClause += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.skill LIKE ?)`;
    const s = `%${search}%`;
    filterParams.push(s, s, s);
  }

  const query = `
    SELECT 
      u.id, u.email, u.name, u.role, u.department, u.skill, u.capacity_hours, u.capacity_pct, u.status, u.must_change_password, u.created_at,
      COALESCE((
        SELECT SUM(allocated_pct) 
        FROM allocations 
        WHERE user_id = u.id AND period_id = ?
      ), 0) as current_allocation_pct,
      (
        SELECT GROUP_CONCAT(p.name, ', ')
        FROM allocations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.user_id = u.id AND a.period_id = ? AND a.allocated_pct > 0
      ) as current_projects
    FROM users u
    ${whereClause}
    ORDER BY 
      CASE u.role 
        WHEN 'ADMIN' THEN 1 
        WHEN 'MANAGER' THEN 2 
        WHEN 'PROJECT_MANAGER' THEN 2 
        WHEN 'TECH_LEAD' THEN 3 
        ELSE 4 
      END,
      u.department ASC,
      u.name ASC
  `;

  const users = db.prepare(query).all(
    currentPeriod ? currentPeriod.id : 0,
    currentPeriod ? currentPeriod.id : 0,
    ...filterParams
  );

  res.json(users);
});

// Create new user (Admin creates Managers & Developers; Managers create Developers)
app.post('/api/users', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const { name, email, role, department, skill, capacity_hours, password } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required.' });
  }

  // Hierarchy enforcement: Only Admins can create Managers or Admins
  if (req.user.role !== 'ADMIN' && (role === 'ADMIN' || role === 'MANAGER' || role === 'PROJECT_MANAGER')) {
    return res.status(403).json({ error: 'Permission denied. Only Admins (Kalash Pachauri & Bhavik Agarwal) can create Managers or Admins.' });
  }

  // If manager, enforce that created user belongs to manager's department
  let dept = department;
  if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      dept = req.user.department;
    }
  } else if (!dept) {
    dept = 'GENERAL';
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'A team member with this email already exists.' });
  }

  const passHash = bcrypt.hashSync(password || 'password123', 10);
  const mustChange = (role !== 'ADMIN') ? 1 : 0;

  try {
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, department, skill, capacity_hours, status, must_change_password, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
    `).run(
      cleanEmail,
      passHash,
      name.trim(),
      role,
      dept,
      skill || '',
      capacity_hours || 40,
      mustChange,
      req.user.id
    );

    const newUserId = result.lastInsertRowid;

    // Automatically initialize a Responsibility Scorecard for the current month (except for Super Admins)
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      const isManager = role === 'MANAGER' || role === 'PROJECT_MANAGER';
      const existingScorecard = db.prepare("SELECT id FROM scorecards WHERE user_id = ? AND month = 'October 2026'").get(newUserId);
      if (!existingScorecard) {
        if (isManager) {
          db.prepare(`
            INSERT INTO scorecards (month, user_id, is_self_eval_enabled)
            VALUES ('October 2026', ?, 1)
          `).run(newUserId);
        } else {
          db.prepare(`
            INSERT INTO scorecards (month, user_id, delivery_score, communication_score, ownership_score, initiative_score, documentation_score, quality_score, client_handling_score, total_score, is_self_eval_enabled)
            VALUES ('October 2026', ?, 18.0, 13.0, 18.0, 8.0, 8.0, 14.0, 8.0, 87.0, 0)
          `).run(newUserId);
        }
      }
    }


    logAudit(req.user.id, req.user.name, req.user.role, 'CREATE_USER', 'users', newUserId, 'email', null, cleanEmail);

    const created = db.prepare('SELECT id, email, name, role, department, skill, capacity_hours, status FROM users WHERE id = ?').get(newUserId);
    res.status(201).json({ message: 'Team member created successfully.', user: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user details
app.patch('/api/users/:id', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const targetId = Number(req.params.id);
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  // Managers can only edit developers, not admins or other managers
  if (req.user.role !== 'ADMIN' && (targetUser.role === 'ADMIN' || targetUser.role === 'MANAGER')) {
    return res.status(403).json({ error: 'Permission denied. Only Admins can edit Managers or Admins.' });
  }

  const { name, email, skill, capacity_hours, capacity_pct, status, department, password, role, secondary_role, phone } = req.body;
  const updates = [];
  const params = [];

  if (name) { updates.push('name = ?'); params.push(name.trim()); }
  if (email && req.user.role === 'ADMIN') {
    const trimmedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(trimmedEmail, targetId);
    if (existing) {
      return res.status(400).json({ error: 'Email address already in use by another user.' });
    }
    updates.push('email = ?');
    params.push(trimmedEmail);
  }
  if (skill !== undefined) { updates.push('skill = ?'); params.push(skill.trim()); }
  if (capacity_hours) { updates.push('capacity_hours = ?'); params.push(Number(capacity_hours)); }
  if (capacity_pct !== undefined) { 
    updates.push('capacity_pct = ?'); 
    params.push(Number(capacity_pct)); 
  }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (department && req.user.role === 'ADMIN') { updates.push('department = ?'); params.push(department); }
  if (role && req.user.role === 'ADMIN') { updates.push('role = ?'); params.push(role); }
  if (secondary_role !== undefined && req.user.role === 'ADMIN') { 
    updates.push('secondary_role = ?'); 
    params.push(secondary_role || null); 
  }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone.trim()); }
  if (password) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
    if (targetUser.role !== 'ADMIN') {
      updates.push('must_change_password = 1');
    }
  }

  if (updates.length > 0) {
    params.push(targetId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    logAudit(req.user.id, req.user.name, req.user.role, 'UPDATE_USER', 'users', targetId, 'details', null, 'updated');

    // If capacity_pct was updated, sync allocations for active periods for accurate utilization calculations
    if (capacity_pct !== undefined) {
      try {
        db.prepare(`
          UPDATE allocations 
          SET capacity_pct = ? 
          WHERE user_id = ? AND period_id IN (SELECT id FROM periods WHERE is_current = 1)
        `).run(Number(capacity_pct), targetId);
      } catch (e) {
        console.warn('Sync capacity error:', e.message);
      }
    }
  }

  const updated = db.prepare('SELECT id, email, name, role, secondary_role, department, skill, capacity_hours, capacity_pct, status, phone, must_change_password FROM users WHERE id = ?').get(targetId);
  res.json({ message: 'Team member updated successfully.', user: updated });
});

// Delete user (Admin only, protects Kalash and Bhavik)
app.delete('/api/users/:id', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const targetId = Number(req.params.id);
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  if (targetUser.email.includes('kalash') || targetUser.email.includes('bhavik')) {
    return res.status(403).json({ error: 'Protected Super Admin account cannot be deleted.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  logAudit(req.user.id, req.user.name, req.user.role, 'DELETE_USER', 'users', targetId, 'all', targetUser.email, 'deleted');

  res.json({ message: 'User deleted successfully.' });
});

// Admin-only quick setup to initialize the 3 department managers (Mobile, Backend, Frontend) and initial developers
app.post('/api/users/quick-setup-departments', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const defaultPass = bcrypt.hashSync('password123', 10);
  
  const setupUsers = [
    // 3 Department Managers
    { name: 'Mobile Team Manager', email: 'mobile.manager@dw.com', role: 'MANAGER', department: 'MOBILE', skill: 'Mobile Architecture (iOS, Android, Flutter)' },
    { name: 'Backend Manager', email: 'backend.manager@dw.com', role: 'MANAGER', department: 'BACKEND', skill: 'Backend Architecture (Node, Python, Cloud, DB)' },
    { name: 'Frontend Manager', email: 'frontend.manager@dw.com', role: 'MANAGER', department: 'FRONTEND', skill: 'Web Architecture (React, Next.js, TypeScript)' },

    // Developers under managers
    { name: 'Sukhdeep Singh', email: 'sukhdeep.singh@dw.com', role: 'DEVELOPER', department: 'MOBILE', skill: 'Flutter & Dart Mobile Apps' },
    { name: 'Jatin Gupta', email: 'jatin.gupta@dw.com', role: 'DEVELOPER', department: 'MOBILE', skill: 'iOS & Android Native Integration' },
    { name: 'Hritik Rajput', email: 'hritik.rajput@dw.com', role: 'DEVELOPER', department: 'BACKEND', skill: 'Node.js & Microservices' },
    { name: 'Himanshu Bisht', email: 'himanshu.bisht@dw.com', role: 'DEVELOPER', department: 'BACKEND', skill: 'Python / Django / FastApi' },
    { name: 'Shivansh Katiyar', email: 'shivansh.katiyar@dw.com', role: 'DEVELOPER', department: 'FRONTEND', skill: 'React, Next.js & Tailwind' },
    { name: 'Bhuvan Sharma', email: 'bhuvan.sharma@dw.com', role: 'DEVELOPER', department: 'FRONTEND', skill: 'UI/UX & Frontend Design' },
    { name: 'Abhishek Rai', email: 'abhishek.rai@dw.com', role: 'QA', department: 'QA', skill: 'QA Automation & Regression Testing' }
  ];

  let addedCount = 0;
  const currentPeriod = db.prepare('SELECT id FROM periods WHERE is_current = 1').get() || db.prepare('SELECT id FROM periods ORDER BY id DESC LIMIT 1').get();
  const ttLock = db.prepare("SELECT id FROM projects WHERE name = 'TT Lock'").get();
  const dwPortal = db.prepare("SELECT id FROM projects WHERE name = 'DW Analytics Portal'").get();


  for (const u of setupUsers) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (!existing) {
      const ins = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, department, skill, capacity_hours, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 40, 'Active', ?)
      `).run(u.email, defaultPass, u.name, u.role, u.department, u.skill, req.user.id);
      
      const newId = ins.lastInsertRowid;
      addedCount++;

      // Create initial scorecards (except for Super Admins)
      if (u.role !== 'ADMIN' && u.role !== 'SUPERADMIN') {
        const isManager = u.role === 'MANAGER' || u.role === 'PROJECT_MANAGER';
        if (isManager) {
          db.prepare(`
            INSERT INTO scorecards (month, user_id, is_self_eval_enabled)
            VALUES ('October 2026', ?, 1)
          `).run(newId);
        } else {
          db.prepare(`
            INSERT INTO scorecards (month, user_id, delivery_score, communication_score, ownership_score, initiative_score, documentation_score, quality_score, client_handling_score, total_score, is_self_eval_enabled)
            VALUES ('October 2026', ?, 18.0, 13.0, 18.0, 8.0, 8.0, 14.0, 8.0, 87.0, 0)
          `).run(newId);
        }
      }

      // Create sample allocation for developer
      if (currentPeriod && u.role === 'DEVELOPER') {
        const projId = u.department === 'MOBILE' ? (ttLock ? ttLock.id : null) : (dwPortal ? dwPortal.id : null);
        const remark = u.department === 'MOBILE'
          ? 'Check documentation of TT Lock SDK & implement keypair generator.'
          : (u.department === 'BACKEND' ? 'Investigating Redis caching latency under peak load.' : 'Building drill-down export and role-based view filters.');
        
        db.prepare(`
          INSERT INTO allocations (period_id, user_id, project_id, role_title, capacity_pct, allocated_pct, allocation_days_note, pm_remarks, status, updated_by)
          VALUES (?, ?, ?, ?, 100, 100, '100% (Monday - Friday)', ?, 'Active', ?)
        `).run(currentPeriod.id, newId, projId, u.role, remark, req.user.id);
      }
    }
  }

  logAudit(req.user.id, req.user.name, req.user.role, 'QUICK_SETUP_DEPARTMENTS', 'users', 0, 'roster', null, `Added ${addedCount} team members`);

  res.json({ message: `Quick setup completed. Added ${addedCount} department managers and developers.` });
});


app.get('/api/leadership', authenticateToken, (req, res) => {
  const rows = db.prepare(`
    SELECT 
      lb.id,
      lb.project_id,
      COALESCE(NULLIF(lb.account, ''), p.account) AS account,
      COALESCE(u_pm.name, NULLIF(lb.pm_name, ''), 'Unassigned') AS pm_name,
      COALESCE(u_lead.name, NULLIF(lb.lead_name, ''), 'Unassigned') AS lead_name,
      COALESCE(u_qa.name, NULLIF(lb.active_qa_name, ''), 'Unassigned') AS active_qa_name,
      COALESCE(NULLIF(lb.weekly_blockers, ''), p.weekly_blockers, '') AS weekly_blockers,
      COALESCE(NULLIF(p.weekly_risk, ''), lb.weekly_risk, 'Low') AS weekly_risk,
      COALESCE(NULLIF(p.stage, ''), lb.project_stage, 'In Progress') AS project_stage,
      COALESCE(NULLIF(p.qa_sheet_url, ''), NULLIF(lb.qa_sheet_url, ''), '') AS qa_sheet_url,
      lb.updated_at,
      p.name AS project_name,
      p.account AS account_name
    FROM leadership_board lb
    JOIN projects p ON lb.project_id = p.id
    LEFT JOIN users u_pm ON p.project_manager_id = u_pm.id
    LEFT JOIN users u_lead ON p.tech_lead_id = u_lead.id
    LEFT JOIN users u_qa ON p.active_qa_id = u_qa.id
    ORDER BY p.name ASC
  `).all();
  res.json(rows);
});

// ==========================================
// 8. DEVOPS HEALTH CHECKS
// ==========================================

app.get('/api/devops', authenticateToken, (req, res) => {
  const rows = db.prepare(`
    SELECT 
      dc.*,
      p.name as project_name,
      p.account as account_name
    FROM devops_checks dc
    JOIN projects p ON dc.project_id = p.id
    ORDER BY p.name ASC
  `).all();
  res.json(rows);
});

app.patch('/api/devops/:id', authenticateToken, requireRoles(['ADMIN', 'DEVOPS', 'TECH_LEAD']), (req, res) => {
  const checkId = req.params.id;
  const existing = db.prepare('SELECT * FROM devops_checks WHERE id = ?').get(checkId);
  if (!existing) return res.status(404).json({ error: 'Health check record not found.' });

  const { sanitized } = sanitizeFields(req.user.role, 'devops', req.body, req.user.secondary_role);
  const updates = [];
  const params = [];

  for (const [key, val] of Object.entries(sanitized)) {
    updates.push(`${key} = ?`);
    params.push(val);
    if (existing[key] !== val) {
      logAudit(req.user.id, req.user.name, req.user.role, 'UPDATE_DEVOPS_CHECK', 'devops_checks', checkId, key, existing[key], val);
    }
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(checkId);

  db.prepare(`UPDATE devops_checks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Sync back to projects table
  if (sanitized.prod_channel || sanitized.stage_channel || sanitized.db_backup_url !== undefined) {
    const projUpdates = [];
    const projParams = [];
    if (sanitized.prod_channel) { projUpdates.push('production_deployment_channel = ?'); projParams.push(sanitized.prod_channel); }
    if (sanitized.stage_channel) { projUpdates.push('staging_deployment_channel = ?'); projParams.push(sanitized.stage_channel); }
    if (sanitized.db_backup_url !== undefined) { projUpdates.push('database_backup_url = ?'); projParams.push(sanitized.db_backup_url); }
    if (projUpdates.length > 0) {
      projParams.push(existing.project_id);
      db.prepare(`UPDATE projects SET ${projUpdates.join(', ')} WHERE id = ?`).run(...projParams);
    }
  }

  res.json({ message: 'DevOps health check updated.' });
});

// ==========================================
// 9. RESPONSIBILITY SCORECARDS
// ==========================================

app.get('/api/scorecards', authenticateToken, (req, res) => {
  let query = `
    SELECT 
      s.*,
      u.name as member_name,
      u.role as member_role,
      u.department as member_department,
      u.skill as member_skill,
      eval.name as evaluator_name
    FROM scorecards s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN users eval ON s.evaluated_by = eval.id
  `;
  const where = ["u.role NOT IN ('ADMIN', 'SUPERADMIN')"];
  const params = [];

  // If requested explicitly for 'my' scorecard (e.g. DeveloperScorecard view) OR developer/QA, strictly return ONLY their own scorecard
  if (req.query.my === 'true' || ['DEVELOPER', 'QA'].includes(req.user.role)) {
    where.push('s.user_id = ?');
    params.push(req.user.id);
  } else if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      where.push('UPPER(u.department) = UPPER(?)');
      params.push(req.user.department);
    }
  } else if (req.query.department) {
    where.push('UPPER(u.department) = UPPER(?)');
    params.push(req.query.department);
  }

  query += ` WHERE ${where.join(' AND ')}`;
  query += ` ORDER BY s.month DESC, s.total_score DESC`;
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// ONLY Super Admin can toggle whether a developer or manager can fill self-evaluation
app.patch('/api/scorecards/:id/toggle-access', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const scorecardId = req.params.id;
  const existing = db.prepare('SELECT * FROM scorecards WHERE id = ?').get(scorecardId);
  if (!existing) return res.status(404).json({ error: 'Scorecard not found.' });

  const newStatus = existing.is_self_eval_enabled ? 0 : 1;
  db.prepare('UPDATE scorecards SET is_self_eval_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, scorecardId);

  logAudit(
    req.user.id,
    req.user.name,
    req.user.role,
    newStatus === 1 ? 'ENABLE_SELF_EVAL' : 'DISABLE_SELF_EVAL',
    'scorecards',
    scorecardId,
    'is_self_eval_enabled',
    existing.is_self_eval_enabled,
    newStatus
  );

  res.json({
    message: newStatus === 1 ? 'Scorecard self-evaluation access granted.' : 'Scorecard self-evaluation access locked.',
    is_self_eval_enabled: newStatus
  });
});

// Developer or Manager submits self-evaluation (ONLY if Super Admin enabled access)
// Once submitted, the scorecard is AUTOMATICALLY LOCKED immediately
app.patch('/api/scorecards/:id/self-eval', authenticateToken, (req, res) => {
  const scorecardId = req.params.id;
  const existing = db.prepare('SELECT * FROM scorecards WHERE id = ?').get(scorecardId);
  if (!existing) return res.status(404).json({ error: 'Scorecard not found.' });

  // Only the assigned user or admin can submit self-eval
  if (req.user.role !== 'ADMIN' && existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only fill self-evaluation for your own scorecard.' });
  }

  // Strictly check if Super Admin has given access
  if (req.user.role !== 'ADMIN' && !existing.is_self_eval_enabled) {
    return res.status(403).json({
      error: 'Self-evaluation window is currently locked. Access must be granted by the Super Admin to fill this scorecard.'
    });
  }

  const {
    self_delivery_score,
    self_communication_score,
    self_ownership_score,
    self_initiative_score,
    self_documentation_score,
    self_quality_score,
    self_client_handling_score,
    self_remarks
  } = req.body;

  const d = Number(self_delivery_score || 0);
  const c = Number(self_communication_score || 0);
  const o = Number(self_ownership_score || 0);
  const i = Number(self_initiative_score || 0);
  const doc = Number(self_documentation_score || 0);
  const q = Number(self_quality_score || 0);
  const ch = Number(self_client_handling_score || 0);
  const total = d + c + o + i + doc + q + ch;

  // Once submitted, is_self_eval_enabled is automatically set to 0 (locked)
  db.prepare(`
    UPDATE scorecards SET
      self_delivery_score = ?,
      self_communication_score = ?,
      self_ownership_score = ?,
      self_initiative_score = ?,
      self_documentation_score = ?,
      self_quality_score = ?,
      self_client_handling_score = ?,
      self_total_score = ?,
      self_remarks = ?,
      self_submitted_at = CURRENT_TIMESTAMP,
      is_self_eval_enabled = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(d, c, o, i, doc, q, ch, total, self_remarks || '', scorecardId);

  logAudit(req.user.id, req.user.name, req.user.role, 'SUBMIT_SELF_EVAL', 'scorecards', scorecardId, 'self_total_score', null, total);

  res.json({ 
    message: 'Self-evaluation submitted successfully. Scorecard is now automatically locked.', 
    self_total_score: total,
    is_self_eval_enabled: 0
  });
});

app.patch('/api/scorecards/:id', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const scorecardId = req.params.id;
  const existing = db.prepare('SELECT * FROM scorecards WHERE id = ?').get(scorecardId);
  if (!existing) return res.status(404).json({ error: 'Scorecard not found.' });

  const targetUser = db.prepare('SELECT id, name, role, department FROM users WHERE id = ?').get(existing.user_id);
  if (!targetUser) return res.status(404).json({ error: 'Target user not found.' });

  // Rule: Managers cannot have a manager appraisal score ("there will be no manager score for them")
  if (targetUser.role === 'MANAGER' || targetUser.role === 'PROJECT_MANAGER') {
    return res.status(400).json({
      error: 'Managers cannot receive a manager appraisal score. Managers only score themselves and their developers.'
    });
  }

  // Department scoping: Manager can only update scorecards for their own department's developers
  if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
    if (req.user.department && req.user.department !== 'GENERAL') {
      if (targetUser.department && targetUser.department.toUpperCase() !== req.user.department.toUpperCase()) {
        return res.status(403).json({
          error: `Permission denied. You can only evaluate scorecards for developers in your department (${req.user.department}).`
        });
      }
    }
  }

  const { sanitized } = sanitizeFields(req.user.role, 'scorecards', req.body);

  // Recalculate total score if scoring fields change
  const d = sanitized.delivery_score !== undefined ? Number(sanitized.delivery_score) : existing.delivery_score;
  const c = sanitized.communication_score !== undefined ? Number(sanitized.communication_score) : existing.communication_score;
  const o = sanitized.ownership_score !== undefined ? Number(sanitized.ownership_score) : existing.ownership_score;
  const i = sanitized.initiative_score !== undefined ? Number(sanitized.initiative_score) : existing.initiative_score;
  const doc = sanitized.documentation_score !== undefined ? Number(sanitized.documentation_score) : existing.documentation_score;
  const q = sanitized.quality_score !== undefined ? Number(sanitized.quality_score) : existing.quality_score;
  const ch = sanitized.client_handling_score !== undefined ? Number(sanitized.client_handling_score) : existing.client_handling_score;

  const total = d + c + o + i + doc + q + ch;

  const updates = [];
  const params = [];

  for (const [key, val] of Object.entries(sanitized)) {
    updates.push(`${key} = ?`);
    params.push(val);
  }
  updates.push('total_score = ?');
  params.push(total);
  updates.push('evaluated_by = ?');
  params.push(req.user.id);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(scorecardId);

  db.prepare(`UPDATE scorecards SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  logAudit(req.user.id, req.user.name, req.user.role, 'UPDATE_SCORECARD', 'scorecards', scorecardId, 'total_score', existing.total_score, total);

  res.json({ message: 'Scorecard updated.', total_score: total });
});


// ==========================================
// 10. SECURITY AUDIT & ACCESS CONTROLS
// ==========================================

app.get('/api/security/events', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const events = db.prepare('SELECT * FROM security_events ORDER BY id DESC LIMIT 100').all();
  const enrichedEvents = events.map(evt => ({
    ...evt,
    created_at_ist: formatFullIST(evt.created_at),
    time_ist: formatToIST(evt.created_at)
  }));
  res.json(enrichedEvents);
});

app.get('/api/security/stats', authenticateToken, requireRoles(['ADMIN', 'MANAGER', 'PROJECT_MANAGER']), (req, res) => {
  const totalEvents = db.prepare('SELECT COUNT(*) as count FROM security_events').get().count;
  
  // Signed in users today (IST calendar day: UTC+5:30)
  const signedInUsersToday = db.prepare(`
    SELECT 
      coalesce(u.id, 0) as id, 
      coalesce(u.name, se.email) as name, 
      se.email, 
      coalesce(u.role, 'USER') as role, 
      coalesce(u.department, 'GENERAL') as department, 
      MAX(se.created_at) as last_login_today
    FROM security_events se
    LEFT JOIN users u ON (u.id = se.user_id OR LOWER(u.email) = LOWER(se.email))
    WHERE se.event_type = 'LOGIN_SUCCESS'
      AND date(replace(replace(se.created_at, 'T', ' '), 'Z', ''), '+5 hours', '+30 minutes') = date('now', '+5 hours', '+30 minutes')
    GROUP BY coalesce(nullif(u.id, 0), se.email)
    ORDER BY last_login_today DESC
  `).all().map(u => ({
    ...u,
    time_ist: formatToIST(u.last_login_today)
  }));

  const activeUsersToday = signedInUsersToday.length;

  const pendingPasswordResets = db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE must_change_password = 1 AND role != 'ADMIN' AND (status IS NULL OR status != 'INACTIVE')
  `).get().count;

  const failedLogins = db.prepare("SELECT COUNT(*) as count FROM security_events WHERE event_type IN ('LOGIN_FAILED', 'OTP_FAILED')").get().count;

  const lockedUsers = db.prepare(`
    SELECT id, name, email, locked_until, failed_login_attempts 
    FROM users 
    WHERE locked_until IS NOT NULL 
      AND datetime(replace(replace(locked_until, 'T', ' '), 'Z', '')) > datetime('now')
  `).all();

  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  res.json({
    totalEvents,
    activeUsersToday,
    signedInUsersToday,
    pendingPasswordResets,
    failedLogins,
    lockedUsers,
    totalUsers
  });
});

app.post('/api/security/unlock-user/:id', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const targetId = Number(req.params.id);
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  db.prepare('UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?').run(targetId);
  logSecurityEvent(targetId, targetUser.email, 'ACCOUNT_UNLOCKED', 'SUCCESS', req, `Manually unlocked by Admin ${req.user.name}`);
  logAudit(req.user.id, req.user.name, req.user.role, 'UNLOCK_USER', 'users', targetId, 'locked_until', targetUser.locked_until, null);

  res.json({ message: `Account for ${targetUser.name} (${targetUser.email}) unlocked successfully.` });
});

app.patch('/api/security/toggle-mfa/:id', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const targetId = Number(req.params.id);
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  const newMfa = targetUser.mfa_enabled === 1 ? 0 : 1;
  db.prepare('UPDATE users SET mfa_enabled = ? WHERE id = ?').run(newMfa, targetId);
  logSecurityEvent(targetId, targetUser.email, 'MFA_TOGGLED', 'SUCCESS', req, `MFA set to ${newMfa} by Admin ${req.user.name}`);
  logAudit(req.user.id, req.user.name, req.user.role, 'TOGGLE_MFA', 'users', targetId, 'mfa_enabled', targetUser.mfa_enabled, newMfa);

  res.json({ message: `MFA ${newMfa === 1 ? 'Enabled' : 'Disabled'} for ${targetUser.name}.`, mfa_enabled: newMfa });
});

// ==========================================
// 11. AUDIT LOGS & HOUSEKEEPING (3-Day Retention)
// ==========================================

// Function to clean up audit logs and security events older than 3 days
function cleanupOldAuditLogs() {
  try {
    const auditRes = db.prepare("DELETE FROM audit_logs WHERE created_at < datetime('now', '-3 days')").run();
    const secRes = db.prepare("DELETE FROM security_events WHERE created_at < datetime('now', '-3 days')").run();
    const otpRes = db.prepare("DELETE FROM otp_codes WHERE created_at < datetime('now', '-3 days')").run();
    if (auditRes.changes > 0 || secRes.changes > 0) {
      console.log(`[Audit Housekeeping] Cleaned logs older than 3 days: ${auditRes.changes} audit entries, ${secRes.changes} security events.`);
    }
    return { auditPurged: auditRes.changes, securityPurged: secRes.changes, otpPurged: otpRes.changes };
  } catch (err) {
    console.error('[Audit Housekeeping] Error cleaning old logs:', err.message);
    return { error: err.message };
  }
}

// Run cleanup immediately on server start
cleanupOldAuditLogs();

// Schedule periodic cleanup every 6 hours
setInterval(cleanupOldAuditLogs, 6 * 60 * 60 * 1000);

function enrichAuditLog(log, { projectMap, userMap, periodMap }) {
  const pName = projectMap[log.entity_id] || ('Project #' + log.entity_id);
  const uName = userMap[log.entity_id] || ('Member #' + log.entity_id);
  const periodName = periodMap[log.entity_id] || ('Cycle #' + log.entity_id);

  let humanDescription = '';
  let category = 'System';
  let badge = log.action;

  switch (log.action) {
    case 'CHANGE_PASSWORD':
      humanDescription = 'Changed account security password';
      category = 'Security';
      badge = 'Password Updated';
      break;

    case 'LOGIN_MFA_SUCCESS':
      humanDescription = 'Successfully completed multi-factor sign-in';
      category = 'Authentication';
      badge = 'MFA Sign-In';
      break;

    case 'CREATE_USER': {
      const createdName = userMap[log.entity_id] || log.new_value || 'New User';
      humanDescription = `Created new team member: ${createdName}`;
      category = 'Team';
      badge = 'Member Added';
      break;
    }

    case 'UPDATE_USER':
      humanDescription = log.field_name === 'password'
        ? `Reset credentials for ${uName}`
        : `Updated member profile for ${uName}`;
      category = 'Team';
      badge = 'Member Updated';
      break;

    case 'DELETE_USER':
      humanDescription = `Removed team member: ${log.old_value || uName}`;
      category = 'Team';
      badge = 'Member Removed';
      break;

    case 'UNLOCK_USER':
      humanDescription = `Unlocked account lockout for ${uName}`;
      category = 'Security';
      badge = 'Account Unlocked';
      break;

    case 'TOGGLE_MFA':
      humanDescription = `Updated two-factor authentication (MFA) for ${uName}`;
      category = 'Security';
      badge = 'MFA Config';
      break;

    case 'CREATE_PROJECT':
      humanDescription = `Created project: ${log.new_value || pName}`;
      category = 'Projects';
      badge = 'Project Created';
      break;

    case 'DELETE_PROJECT':
      humanDescription = `Deleted project: ${log.old_value || pName}`;
      category = 'Projects';
      badge = 'Project Deleted';
      break;

    case 'COMPLETE_PROJECT_FREE_RESOURCES':
      humanDescription = `Marked ${pName} as Completed & released all allocations`;
      category = 'Projects';
      badge = 'Project Completed';
      break;

    case 'UPDATE_PROJECT_FIELD': {
      category = 'Projects';
      if (log.field_name === 'status') {
        humanDescription = `Changed status of ${pName}: ${log.old_value || 'None'} → ${log.new_value}`;
        badge = 'Project Status';
      } else if (log.field_name === 'project_manager_id') {
        const oldPM = userMap[log.old_value];
        const newPM = userMap[log.new_value] || 'Unassigned';
        humanDescription = `Assigned Project Manager on ${pName}: ${oldPM ? `${oldPM} → ` : ''}${newPM}`;
        badge = 'PM Assigned';
      } else if (log.field_name === 'tech_lead_id') {
        const oldTL = userMap[log.old_value];
        const newTL = userMap[log.new_value] || 'Unassigned';
        humanDescription = `Assigned Tech Lead on ${pName}: ${oldTL ? `${oldTL} → ` : ''}${newTL}`;
        badge = 'TL Assigned';
      } else if (log.field_name === 'active_qa_id') {
        const newQA = userMap[log.new_value] || 'Unassigned';
        humanDescription = `Assigned QA Specialist on ${pName}: ${newQA}`;
        badge = 'QA Assigned';
      } else if (log.field_name === 'weekly_risk') {
        humanDescription = `Updated risk level for ${pName}: ${log.old_value || 'Low'} → ${log.new_value}`;
        badge = 'Risk Level';
      } else if (log.field_name === 'qa_sheet_url') {
        humanDescription = `Linked QA Test Sheet on ${pName}`;
        badge = 'QA Sheet';
      } else if (log.field_name === 'weekly_blockers') {
        humanDescription = `Updated weekly blockers on ${pName}`;
        badge = 'Blockers';
      } else if (log.field_name === 'stage') {
        humanDescription = `Moved ${pName} stage to ${log.new_value}`;
        badge = 'Stage Change';
      } else {
        const cleanField = (log.field_name || '').replace(/_/g, ' ');
        humanDescription = `Updated ${cleanField} on ${pName} to "${log.new_value}"`;
        badge = 'Project Edit';
      }
      break;
    }

    case 'CREATE_ALLOCATION':
      humanDescription = 'Created developer sprint allocation';
      category = 'Allocations';
      badge = 'Allocation Added';
      break;

    case 'DELETE_ALLOCATION':
      humanDescription = 'Removed sprint allocation';
      category = 'Allocations';
      badge = 'Allocation Removed';
      break;

    case 'UPDATE_ALLOCATION_FIELD': {
      category = 'Allocations';
      if (log.field_name === 'allocated_pct') {
        humanDescription = `Updated allocation percentage: ${log.old_value || 0}% → ${log.new_value}%`;
        badge = 'Capacity %';
      } else if (log.field_name === 'project_id') {
        const targetProj = projectMap[log.new_value] || 'Bench';
        humanDescription = `Reassigned allocation to ${targetProj}`;
        badge = 'Project Reassign';
      } else if (log.field_name === 'pm_work_notes') {
        humanDescription = 'Updated PM work directives & sprint notes';
        badge = 'Work Notes';
      } else {
        const cleanField = (log.field_name || '').replace(/_/g, ' ');
        humanDescription = `Updated allocation ${cleanField}`;
        badge = 'Allocation Edit';
      }
      break;
    }

    case 'CREATE_PERIOD':
    case 'AUTO_CREATE_PERIOD':
      humanDescription = `Created new weekly cycle: ${log.new_value || periodName}`;
      category = 'Sprints';
      badge = 'Cycle Created';
      break;

    case 'SET_CURRENT_PERIOD':
      humanDescription = `Activated active weekly cycle: ${periodName}`;
      category = 'Sprints';
      badge = 'Active Cycle';
      break;

    case 'DELETE_PERIOD':
      humanDescription = `Deleted weekly cycle: ${log.old_value || periodName}`;
      category = 'Sprints';
      badge = 'Cycle Deleted';
      break;

    case 'UPDATE_SCORECARD':
      humanDescription = `Evaluated performance scorecard for ${uName} (${log.new_value || 0}/100)`;
      category = 'Scorecards';
      badge = 'Scorecard Rated';
      break;

    case 'SUBMIT_SELF_EVAL':
      humanDescription = `Submitted self-evaluation scorecard (${log.new_value || 0}/100)`;
      category = 'Scorecards';
      badge = 'Self Evaluation';
      break;

    case 'ENABLE_SELF_EVAL':
      humanDescription = `Unlocked self-evaluation access for ${uName}`;
      category = 'Scorecards';
      badge = 'Self-Eval Unlocked';
      break;

    case 'UPDATE_DEVOPS_CHECK':
      humanDescription = `Updated infrastructure DevOps check status to ${log.new_value}`;
      category = 'DevOps';
      badge = 'DevOps Check';
      break;

    default:
      humanDescription = `${(log.action || '').replace(/_/g, ' ')} on ${log.entity}`;
      category = 'General';
      badge = log.action;
      break;
  }

  return {
    text: humanDescription,
    targetName: (log.entity === 'projects' ? pName : (log.entity === 'users' ? uName : null)),
    category,
    badge
  };
}

app.get('/api/audit-logs', authenticateToken, (req, res) => {
  cleanupOldAuditLogs();
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200').all();

  const projectMap = Object.fromEntries(
    db.prepare('SELECT id, name FROM projects').all().map(p => [p.id, p.name])
  );
  const userMap = Object.fromEntries(
    db.prepare('SELECT id, name FROM users').all().map(u => [u.id, u.name])
  );
  const periodMap = Object.fromEntries(
    db.prepare('SELECT id, name FROM periods').all().map(p => [p.id, p.name])
  );

  const enrichedLogs = logs.map(log => {
    const enriched = enrichAuditLog(log, { projectMap, userMap, periodMap });
    return {
      ...log,
      human_description: enriched.text,
      target_name: enriched.targetName,
      category: enriched.category,
      badge: enriched.badge,
      created_at_ist: formatFullIST(log.created_at),
      time_ist: formatToIST(log.created_at)
    };
  });

  res.json(enrichedLogs);
});

app.post('/api/audit-logs/purge', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const result = cleanupOldAuditLogs();
  res.json({ message: 'Audit logs older than 3 days purged successfully.', ...result });
});

// Serve static client build if available
const path = require('path');
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Catch-all fallback for client single-page app
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Resource Allocation CRM Server running on http://localhost:${PORT}`);
});


