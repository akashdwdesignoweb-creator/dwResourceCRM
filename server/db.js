const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(process.env.DATABASE_PATH) 
  : path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- Users table with Roles & Departments
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MANAGER', 'DEVELOPER', 'PROJECT_MANAGER', 'TECH_LEAD', 'QA', 'DEVOPS')),
      secondary_role TEXT DEFAULT NULL,
      department TEXT DEFAULT 'GENERAL' CHECK(department IN ('GENERAL', 'MOBILE', 'BACKEND', 'FRONTEND', 'QA', 'DEVOPS')),
      skill TEXT DEFAULT '',
      capacity_hours INTEGER DEFAULT 40,
      capacity_pct INTEGER DEFAULT 80,
      avatar TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME DEFAULT NULL,
      mfa_enabled INTEGER DEFAULT 1,
      phone TEXT DEFAULT '',
      last_login_at DATETIME DEFAULT NULL,
      last_login_ip TEXT DEFAULT '',
      must_change_password INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );


    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      account TEXT DEFAULT 'Internal',
      project_manager_id INTEGER,
      tech_lead_id INTEGER,
      active_qa_id INTEGER,
      stage TEXT DEFAULT 'In Progress',
      weekly_risk TEXT DEFAULT 'Low' CHECK(weekly_risk IN ('Low', 'Medium', 'High', 'Green', 'Amber', 'Red')),
      weekly_blockers TEXT DEFAULT '',
      qa_sheet_url TEXT DEFAULT '',
      production_deployment_channel TEXT DEFAULT 'Slack #prod-deploy',
      staging_deployment_channel TEXT DEFAULT 'Slack #stage-deploy',
      database_backup_url TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_manager_id) REFERENCES users(id),
      FOREIGN KEY (tech_lead_id) REFERENCES users(id),
      FOREIGN KEY (active_qa_id) REFERENCES users(id)
    );

    -- Weekly Periods
    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL, -- e.g. "Resource Allocation (28/09/26 - 01/10/26)"
      start_date TEXT,
      end_date TEXT,
      is_current INTEGER DEFAULT 0
    );

    -- Resource Allocations Table (Columns matching Google Sheets)
    CREATE TABLE IF NOT EXISTS allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      role_title TEXT DEFAULT 'Developer', -- TL / Dev / QA
      capacity_pct INTEGER DEFAULT 100,     -- 40 Hours = 100%
      allocated_pct INTEGER DEFAULT 0,      -- 1 Working Day = 20%
      allocation_days_note TEXT DEFAULT '', -- e.g. "40 (Tuesday, Wednesday)"
      pm_remarks TEXT DEFAULT '',
      tl_notes TEXT DEFAULT '',
      member_notes TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',         -- Active, Bench, Leave, Completed
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );

    -- Leadership Board Tracking
    CREATE TABLE IF NOT EXISTS leadership_board (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      account TEXT DEFAULT '',
      pm_name TEXT DEFAULT '',
      lead_name TEXT DEFAULT '',
      active_qa_name TEXT DEFAULT '',
      weekly_blockers TEXT DEFAULT '',
      weekly_risk TEXT DEFAULT 'Low',
      project_stage TEXT DEFAULT 'Development',
      qa_sheet_url TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- DevOps Health Checks
    CREATE TABLE IF NOT EXISTS devops_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      account TEXT DEFAULT '',
      prod_channel TEXT DEFAULT '',
      stage_channel TEXT DEFAULT '',
      assigned_person TEXT DEFAULT '',
      project_lead TEXT DEFAULT '',
      health_check_status TEXT DEFAULT 'Passed', -- Passed, Warning, Critical
      check_period TEXT DEFAULT 'Current Period',
      db_backup_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- Responsibility Scorecards
    CREATE TABLE IF NOT EXISTS scorecards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      is_self_eval_enabled INTEGER DEFAULT 0, -- Set by Admin/Manager: 1 = Developer can fill, 0 = Locked
      delivery_score REAL DEFAULT 18.0,      -- /20
      communication_score REAL DEFAULT 13.0, -- /15
      ownership_score REAL DEFAULT 18.0,     -- /20
      initiative_score REAL DEFAULT 8.0,     -- /10
      documentation_score REAL DEFAULT 8.0,  -- /10
      quality_score REAL DEFAULT 14.0,       -- /15
      client_handling_score REAL DEFAULT 8.0,-- /10
      total_score REAL DEFAULT 87.0,         -- /100
      scope_of_improvement TEXT DEFAULT '',
      self_delivery_score REAL DEFAULT NULL,
      self_communication_score REAL DEFAULT NULL,
      self_ownership_score REAL DEFAULT NULL,
      self_initiative_score REAL DEFAULT NULL,
      self_documentation_score REAL DEFAULT NULL,
      self_quality_score REAL DEFAULT NULL,
      self_client_handling_score REAL DEFAULT NULL,
      self_total_score REAL DEFAULT NULL,
      self_remarks TEXT DEFAULT '',
      self_submitted_at DATETIME DEFAULT NULL,
      evaluated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (evaluated_by) REFERENCES users(id)
    );


    -- Field-Level & Row Audit Trail
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- OTP Verification Codes Table for Two-Factor Authentication (MFA)
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT DEFAULT 'LOGIN',
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 5,
      expires_at DATETIME NOT NULL,
      is_used INTEGER DEFAULT 0,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Security & Authentication Audit Events Log
    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT,
      event_type TEXT NOT NULL, -- LOGIN_ATTEMPT, LOGIN_SUCCESS, LOGIN_FAILED, OTP_GENERATED, OTP_VERIFIED, OTP_FAILED, ACCOUNT_LOCKED, UNLOCKED
      status TEXT NOT NULL,     -- SUCCESS, FAILED, WARNING, BLOCKED
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for user security columns
  try { db.exec('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 1'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ""'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN last_login_ip TEXT DEFAULT ""'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN secondary_role TEXT DEFAULT NULL'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN capacity_pct INTEGER DEFAULT 80'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE projects ADD COLUMN database_backup_url TEXT DEFAULT ""'); } catch(e) {}
  try { db.exec('ALTER TABLE devops_checks ADD COLUMN db_backup_url TEXT DEFAULT ""'); } catch(e) {}

  // Migrate existing weekly_risk values: Green -> Low, Amber -> Medium, Red -> High
  try { db.exec("UPDATE projects SET weekly_risk = 'Low' WHERE weekly_risk = 'Green'"); } catch(e) {}
  try { db.exec("UPDATE projects SET weekly_risk = 'Medium' WHERE weekly_risk = 'Amber'"); } catch(e) {}
  try { db.exec("UPDATE projects SET weekly_risk = 'High' WHERE weekly_risk = 'Red'"); } catch(e) {}
  try { db.exec("UPDATE leadership_board SET weekly_risk = 'Low' WHERE weekly_risk = 'Green'"); } catch(e) {}
  try { db.exec("UPDATE leadership_board SET weekly_risk = 'Medium' WHERE weekly_risk = 'Amber'"); } catch(e) {}
  try { db.exec("UPDATE leadership_board SET weekly_risk = 'High' WHERE weekly_risk = 'Red'"); } catch(e) {}
}

initDatabase();

module.exports = db;
module.exports.initDatabase = initDatabase;

