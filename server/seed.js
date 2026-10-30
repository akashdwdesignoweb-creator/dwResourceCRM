const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  console.log('Initializing DW Resource CRM - Seeding Full Production Dataset...');

  // Drop and recreate tables with latest schema
  db.exec(`
    DROP TABLE IF EXISTS security_events;
    DROP TABLE IF EXISTS otp_codes;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS scorecards;
    DROP TABLE IF EXISTS devops_checks;
    DROP TABLE IF EXISTS leadership_board;
    DROP TABLE IF EXISTS allocations;
    DROP TABLE IF EXISTS periods;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS users;
  `);

  db.initDatabase();

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('password123', 10);

  // 1. Insert Users: Admins, Managers, Developers, QAs
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, secondary_role, department, skill, capacity_hours, capacity_pct, status, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const usersData = [
    // Super Admins
    {
      name: 'Kalash Pachauri',
      email: 'kalash@dw.com',
      pass: adminHash,
      role: 'ADMIN',
      secRole: null,
      department: 'GENERAL',
      skill: 'Super Administrator',
      capHours: 40,
      capPct: 100
    },
    {
      name: 'Bhavik Agarwal',
      email: 'bhavik@dw.com',
      pass: adminHash,
      role: 'ADMIN',
      secRole: null,
      department: 'GENERAL',
      skill: 'Super Administrator',
      capHours: 40,
      capPct: 100
    },

    // Mobile Dev Team
    {
      name: 'Palak Satti',
      email: 'palak.satti@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'MOBILE',
      skill: 'Swift',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Sagar Sharma',
      email: 'sagar.sharma@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'MOBILE',
      skill: 'Flutter',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Mukesh V.',
      email: 'mukesh.v@dw.com',
      pass: userHash,
      role: 'MANAGER', // Manager is also a developer
      secRole: null,
      department: 'MOBILE',
      skill: 'Flutter, Kotlin/Android',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Sukhdeep Singh',
      email: 'sukhdeep.singh@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'MOBILE',
      skill: 'Flutter',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Hritik Rajput',
      email: 'hritik.rajput@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'MOBILE',
      skill: 'Flutter',
      capHours: 32,
      capPct: 80
    },

    // Backend Dev Team
    {
      name: 'Shivansh Katiyar',
      email: 'shivansh.katiyar@dw.com',
      pass: userHash,
      role: 'MANAGER', // Backend Team Manager (also hands-on developer)
      secRole: null,
      department: 'BACKEND',
      skill: 'Kotlin/Android, Node.js, AI Integration/Automation',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Abhishek Rai',
      email: 'abhishek.rai@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'BACKEND',
      skill: 'Node.js, AI Integration/Automation',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Mayank Singh',
      email: 'mayank.singh@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'BACKEND',
      skill: 'AI Integration/Automation, Node.js',
      capHours: 24,
      capPct: 60
    },
    {
      name: 'Deepanshu Tyagi',
      email: 'deepanshu.tyagi@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: 'DEVOPS', // DUAL ROLE: Developer + DevOps
      department: 'BACKEND',
      skill: 'Node.js, AI Integration/Automation, PHP, CI/CD',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Himanshu Bisht',
      email: 'himanshu.bisht@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'BACKEND',
      skill: 'Node.js, AI Integration/Automation',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Akash Verma',
      email: 'akash.verma@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'BACKEND',
      skill: 'Node.js, Kotlin/Android, AI Integration/Automation',
      capHours: 32,
      capPct: 80
    },

    // Frontend Dev Team
    {
      name: 'Bhuvan Sharma',
      email: 'bhuvan.sharma@dw.com',
      pass: userHash,
      role: 'MANAGER', // Manager is also a developer
      secRole: null,
      department: 'FRONTEND',
      skill: 'React.js',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Yash Gupta',
      email: 'yash.gupta@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'FRONTEND',
      skill: 'React.js',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Jatin Gupta',
      email: 'jatin.gupta@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'FRONTEND',
      skill: 'React.js',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Mehul',
      email: 'mehul@dw.com',
      pass: userHash,
      role: 'DEVELOPER',
      secRole: null,
      department: 'FRONTEND',
      skill: 'React.js',
      capHours: 32,
      capPct: 80
    },

    // Quality Analyst Team
    {
      name: 'Pranav Thakur',
      email: 'pranav.thakur@dw.com',
      pass: userHash,
      role: 'QA',
      secRole: null,
      department: 'QA',
      skill: 'Postman, Manual Testing, Test Automation',
      capHours: 24,
      capPct: 60
    },
    {
      name: 'Vidhi',
      email: 'vidhi@dw.com',
      pass: userHash,
      role: 'QA',
      secRole: null,
      department: 'QA',
      skill: 'Manual Testing',
      capHours: 32,
      capPct: 80
    },
    {
      name: 'Abhay Prakash',
      email: 'abhay.prakash@dw.com',
      pass: userHash,
      role: 'QA',
      secRole: null,
      department: 'QA',
      skill: 'Postman, Manual Testing',
      capHours: 32,
      capPct: 80
    }
  ];

  const userMap = {};
  for (const u of usersData) {
    const res = insertUser.run(
      u.email,
      u.pass,
      u.name,
      u.role,
      u.secRole,
      u.department,
      u.skill,
      u.capHours,
      u.capPct,
      'Active',
      u.role === 'ADMIN' ? 0 : 1
    );
    userMap[u.name] = res.lastInsertRowid;
    console.log(`Created User: ${u.name} (${u.role}${u.secRole ? ` + ${u.secRole}` : ''}, ${u.department})`);
  }

  // 2. Insert Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (name, account, project_manager_id, tech_lead_id, active_qa_id, stage, weekly_risk, weekly_blockers, qa_sheet_url, production_deployment_channel, staging_deployment_channel, database_backup_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const projectsData = [
    { name: 'Proski Revamp', account: 'Proski', stage: 'In Progress', risk: 'Low', blockers: 'None', pm: 'Mukesh V.', tl: 'Mukesh V.', qa: 'Abhay Prakash' },
    { name: 'Smartporters', account: 'Smartporters Corp', stage: 'Delivery Sprint', risk: 'Low', blockers: 'UAT bug validation', pm: 'Mukesh V.', tl: 'Mayank Singh', qa: 'Pranav Thakur' },
    { name: 'RTT Retainer', account: 'RTT Global', stage: 'Retainer Maintenance', risk: 'Low', blockers: 'Walkie-talkie & radar testing', pm: 'Mukesh V.', tl: 'Mukesh V.', qa: 'Vidhi' },
    { name: 'Nexlead Retainer', account: 'Nexlead', stage: 'Retainer Maintenance', risk: 'Low', blockers: 'Subscription flow QA', pm: 'Mukesh V.', tl: 'Akash Verma', qa: 'Vidhi' },
    { name: 'ArcX 2.0', account: 'ArcX Tech', stage: 'In Progress', risk: 'Medium', blockers: 'Apple Watch BLE and Terra sync issues', pm: 'Mukesh V.', tl: 'Sukhdeep Singh', qa: 'Pranav Thakur' },
    { name: 'Navkom', account: 'Navkom Smart Access', stage: 'In Progress', risk: 'Low', blockers: 'RFID flow verification', pm: 'Mukesh V.', tl: 'Sukhdeep Singh', qa: 'Vidhi' },
    { name: 'Coyoacon Retainer', account: 'Coyoacon Group', stage: 'Retainer Maintenance', risk: 'Low', blockers: 'Mozio integration', pm: 'Mukesh V.', tl: 'Abhishek Rai', qa: 'Pranav Thakur' },
    { name: 'HomePro', account: 'HomePro Services', stage: 'UAT & Feedback', risk: 'Low', blockers: 'UAT feedback items', pm: 'Mukesh V.', tl: 'Shivansh Katiyar', qa: 'Abhay Prakash' },
    { name: 'Server Maintenance', account: 'Internal Infrastructure', stage: 'Active Maintenance', risk: 'Low', blockers: 'Subscription migration', pm: 'Kalash Pachauri', tl: 'Deepanshu Tyagi', qa: 'Pranav Thakur' },
    { name: 'Goldsky Retainer', account: 'Goldsky Media', stage: 'Retainer Maintenance', risk: 'Low', blockers: 'Draft section validation', pm: 'Bhuvan Sharma', tl: 'Deepanshu Tyagi', qa: 'Pranav Thakur' },
    { name: 'HH Retainer', account: 'HH Logistics', stage: 'Retainer Maintenance', risk: 'Low', blockers: 'Client UAT feedback', pm: 'Bhuvan Sharma', tl: 'Deepanshu Tyagi', qa: 'Vidhi' },
    { name: '24/7 CRM', account: '24/7 Operations', stage: 'Development', risk: 'Low', blockers: 'Auth and Outlook integration', pm: 'Bhuvan Sharma', tl: 'Himanshu Bisht', qa: 'Vidhi' },
    { name: 'Flambao 2.0', account: 'Flambao', stage: 'Scope Discussions', risk: 'Low', blockers: 'Technical scope sign-off', pm: 'Bhuvan Sharma', tl: 'Himanshu Bisht', qa: 'Abhay Prakash' },
    { name: 'Leep Health', account: 'Leep Health Systems', stage: 'Development', risk: 'Low', blockers: 'Sleep health graphs', pm: 'Bhuvan Sharma', tl: 'Akash Verma', qa: 'Abhay Prakash' },
    { name: 'Designoweb Website', account: 'Designoweb Internal', stage: 'Active Maintenance', risk: 'Low', blockers: 'FAQ updates', pm: 'Bhuvan Sharma', tl: 'Bhuvan Sharma', qa: 'Vidhi' },
    { name: '24/7 Truck Washing', account: '24/7 Operations', stage: 'Website Completion', risk: 'Low', blockers: 'Final pages review', pm: 'Bhuvan Sharma', tl: 'Bhuvan Sharma', qa: 'Abhay Prakash' }
  ];

  const projectMap = {};
  for (const p of projectsData) {
    const pmId = userMap[p.pm] || userMap['Kalash Pachauri'];
    const tlId = userMap[p.tl] || userMap['Kalash Pachauri'];
    const qaId = userMap[p.qa] || userMap['Abhay Prakash'];

    const slug = p.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const backupUrl = `https://backups.s3.amazonaws.com/dw/db/${slug}_daily_backup.sql.gz`;

    const res = insertProject.run(
      p.name,
      p.account,
      pmId,
      tlId,
      qaId,
      p.stage,
      p.risk,
      p.blockers,
      'https://docs.google.com/spreadsheets/d/1V1wYheI-bjIh3b2EcsU8AuN-OlpjBj-sVTSIaZjCcEs/edit#gid=1564639381',
      `#${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-prod`,
      `#${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stage`,
      backupUrl,
      'Active'
    );
    projectMap[p.name] = res.lastInsertRowid;

    // Insert leadership board row
    db.prepare(`
      INSERT INTO leadership_board (project_id, account, pm_name, lead_name, active_qa_name, weekly_blockers, weekly_risk, project_stage, qa_sheet_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(res.lastInsertRowid, p.account, p.pm, p.tl, p.qa, p.blockers, p.risk, p.stage, 'https://docs.google.com/spreadsheets/d/1V1wYheI-bjIh3b2EcsU8AuN-OlpjBj-sVTSIaZjCcEs/edit#gid=1564639381');

    // Insert DevOps checks (Deepanshu Tyagi manages DevOps!)
    db.prepare(`
      INSERT INTO devops_checks (project_id, account, prod_channel, stage_channel, db_backup_url, assigned_person, project_lead, health_check_status, check_period, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Passed', 'Current Cycle', 'Automated CI/CD pipeline active, daily database snapshot verified')
    `).run(
      res.lastInsertRowid,
      p.account,
      `#${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-prod`,
      `#${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stage`,
      backupUrl,
      'Deepanshu Tyagi (DevOps)',
      p.tl
    );
  }

  // 3. Insert Weekly Periods
  const insertPeriod = db.prepare(`
    INSERT INTO periods (name, start_date, end_date, is_current)
    VALUES (?, ?, ?, ?)
  `);

  const periods = [
    { name: 'Weekly Cycle (19/10/26 - 23/10/26)', start: '2026-10-19', end: '2026-10-23', current: 1 },
    { name: 'Resource Allocation (12/10/26 - 16/10/26)', start: '2026-10-12', end: '2026-10-16', current: 0 },
    { name: 'Resource Allocation (05/10/26 - 09/10/26)', start: '2026-10-05', end: '2026-10-09', current: 0 },
    { name: 'Resource Allocation (28/09/26 - 01/10/26)', start: '2026-09-28', end: '2026-10-01', current: 0 },
    { name: 'Resource Allocation (21/09/26 - 25/09/26)', start: '2026-09-21', end: '2026-09-25', current: 0 }
  ];

  let currentPeriodId = null;
  for (const p of periods) {
    const res = insertPeriod.run(p.name, p.start, p.end, p.current);
    if (p.current === 1) currentPeriodId = res.lastInsertRowid;
  }

  // 4. Insert All 36 Allocations from Spreadsheet Data
  const insertAllocation = db.prepare(`
    INSERT INTO allocations (
      period_id, user_id, project_id, role_title, capacity_pct,
      allocated_pct, allocation_days_note, pm_remarks, tl_notes, member_notes, status, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const allocationsData = [
    // Palak Satti
    { name: 'Palak Satti', project: 'Proski Revamp', role: 'Developer', cap: 80, alloc: 80, days: 'Mon–Thu', remarks: 'E-com + new iOS pricing flow', tl: 'Swift architecture verified' },
    
    // Sagar Sharma
    { name: 'Sagar Sharma', project: 'Smartporters', role: 'Developer', cap: 80, alloc: 80, days: 'Mon–Thu', remarks: 'Final delivery sprint', tl: 'On track for sprint freeze' },
    
    // Mukesh V. (Manager & Developer: 3 allocations)
    { name: 'Mukesh V.', project: 'RTT Retainer', role: 'Project Lead', cap: 80, alloc: 20, days: 'Thu', remarks: 'Client feedback, walkie-talkie and radar testing', tl: 'Field test passed' },
    { name: 'Mukesh V.', project: 'Nexlead Retainer', role: 'Developer', cap: 80, alloc: 40, days: 'Mon–Tue', remarks: 'Final bug fixes', tl: 'Code review pending' },
    { name: 'Mukesh V.', project: 'Proski Revamp', role: 'Project Lead', cap: 80, alloc: 20, days: 'Wed', remarks: 'E-com + new Android pricing flow', tl: 'Payment gateway aligned' },

    // Sukhdeep Singh (2 allocations)
    { name: 'Sukhdeep Singh', project: 'ArcX 2.0', role: 'Developer', cap: 80, alloc: 40, days: 'Tue–Wed', remarks: 'Apple Watch BLE and Terra issues', tl: 'BLE peripheral connection stabilized' },
    { name: 'Sukhdeep Singh', project: 'Navkom', role: 'Project Lead', cap: 80, alloc: 40, days: 'Mon, Thu', remarks: 'Client bug sheet and RFID flow', tl: 'RFID reader handshake verified' },

    // Hritik Rajput (2 allocations)
    { name: 'Hritik Rajput', project: 'Coyoacon Retainer', role: 'Developer', cap: 80, alloc: 50, days: 'Tue–Thu', remarks: 'Mozio integration', tl: 'API contract integrated' },
    { name: 'Hritik Rajput', project: 'HomePro', role: 'Developer', cap: 80, alloc: 20, days: 'Mon', remarks: 'UAT feedback', tl: 'UAT fixes pushed' },

    // Shivansh Katiyar
    { name: 'Shivansh Katiyar', project: 'HomePro', role: 'Project Lead', cap: 80, alloc: 80, days: 'Mon–Thu', remarks: 'Old feedback and new improvements', tl: 'Database indexing complete' },

    // Abhishek Rai (2 allocations)
    { name: 'Abhishek Rai', project: 'Server Maintenance', role: 'Developer', cap: 80, alloc: 20, days: 'Thu', remarks: 'Health check and subscription migration', tl: 'DB migration passed' },
    { name: 'Abhishek Rai', project: 'Coyoacon Retainer', role: 'Project Lead', cap: 80, alloc: 60, days: 'Mon–Wed', remarks: 'Mozio integration', tl: 'Webhook endpoints secured' },

    // Mayank Singh (Cap: 60%)
    { name: 'Mayank Singh', project: 'Smartporters', role: 'Project Lead', cap: 60, alloc: 60, days: 'Mon–Wed', remarks: 'Delivery optimization and UAT bugs', tl: 'Routing engine tuned' },

    // Deepanshu Tyagi (Cap: 80%, Alloc: 90% -> 113% Overload! Handles Projects + DevOps)
    { name: 'Deepanshu Tyagi', project: 'ArcX 2.0', role: 'Developer', cap: 80, alloc: 40, days: 'Wed–Thu', remarks: 'Taxonomy implementation', tl: 'GraphQL schema finalized' },
    { name: 'Deepanshu Tyagi', project: 'Goldsky Retainer', role: 'Project Lead', cap: 80, alloc: 30, days: 'Mon–Tue', remarks: 'Draft section validation', tl: 'Draft validation rules active' },
    { name: 'Deepanshu Tyagi', project: 'HH Retainer', role: 'Project Lead', cap: 80, alloc: 20, days: 'Tue', remarks: 'Client UAT feedback', tl: 'Feedback resolved' },

    // Himanshu Bisht (2 allocations)
    { name: 'Himanshu Bisht', project: '24/7 CRM', role: 'Project Lead', cap: 80, alloc: 60, days: 'Mon–Thu', remarks: 'Auth, Outlook integration, lead status segregation', tl: 'OAuth2 refresh tokens configured' },
    { name: 'Himanshu Bisht', project: 'Flambao 2.0', role: 'Developer', cap: 80, alloc: 10, days: 'Mon', remarks: 'Technical scope discussions', tl: 'Architecture spec written' },

    // Akash Verma (2 allocations)
    { name: 'Akash Verma', project: 'Leep Health', role: 'Developer', cap: 80, alloc: 40, days: 'Wed–Thu', remarks: 'Sleep health graphs', tl: 'Time series queries optimized' },
    { name: 'Akash Verma', project: 'Nexlead Retainer', role: 'Developer', cap: 80, alloc: 40, days: 'Mon–Tue', remarks: 'Subscription final sprint', tl: 'Stripe webhook verified' },

    // Bhuvan Sharma (Manager & Developer: 2 allocations)
    { name: 'Bhuvan Sharma', project: 'Designoweb Website', role: 'Project Lead', cap: 80, alloc: 20, days: 'Thu', remarks: 'FAQ section updates', tl: 'Static hydration verified' },
    { name: 'Bhuvan Sharma', project: '24/7 Truck Washing', role: 'Project Lead', cap: 80, alloc: 60, days: 'Mon–Wed', remarks: 'Website completion', tl: 'Form validations complete' },

    // Yash Gupta
    { name: 'Yash Gupta', project: '24/7 CRM', role: 'Developer', cap: 80, alloc: 80, days: 'Mon–Thu', remarks: 'Subscriber, follow-ups and common components', tl: 'Reusable component library built' },

    // Jatin Gupta (2 allocations)
    { name: 'Jatin Gupta', project: 'Coyoacon Retainer', role: 'Developer', cap: 80, alloc: 40, days: 'Wed–Thu', remarks: 'Mozio integration', tl: 'UI flow synced' },
    { name: 'Jatin Gupta', project: 'Smartporters', role: 'Developer', cap: 80, alloc: 40, days: 'Mon–Tue', remarks: 'Whitelabel and language integration', tl: 'i18n locale strings loaded' },

    // Mehul (3 allocations)
    { name: 'Mehul', project: 'Goldsky Retainer', role: 'Developer', cap: 80, alloc: 20, days: 'Mon–Tue', remarks: 'Draft section validation', tl: 'UI state persists' },
    { name: 'Mehul', project: '24/7 CRM', role: 'Developer', cap: 80, alloc: 40, days: 'Wed–Thu', remarks: 'Login, dashboard and leads screen mapping', tl: 'Dashboard cards responsive' },
    { name: 'Mehul', project: 'HH Retainer', role: 'Developer', cap: 80, alloc: 10, days: 'Tue', remarks: 'HH feedback', tl: 'UI feedback updated' },

    // Pranav Thakur (Cap: 60%, Alloc: 80% -> 133% Critical!)
    { name: 'Pranav Thakur', project: 'Coyoacon Retainer', role: 'QA', cap: 60, alloc: 30, days: '1st Mon, Thu', remarks: 'Milestone 1 issue testing', tl: 'Regression suite executed' },
    { name: 'Pranav Thakur', project: 'Smartporters', role: 'QA', cap: 60, alloc: 30, days: 'Wed, 1st Thu', remarks: 'Dispatcher panel user-story testing', tl: 'Dispatcher scenarios tested' },
    { name: 'Pranav Thakur', project: 'Goldsky Retainer', role: 'QA', cap: 60, alloc: 20, days: '1st Tue, 2nd Wed', remarks: 'Saved drafts and version mismatch testing', tl: 'Draft bug ticket logged' },

    // Vidhi (QA: 3 allocations)
    { name: 'Vidhi', project: 'HH Retainer', role: 'QA', cap: 80, alloc: 10, days: '2nd Tue', remarks: 'Client feedback', tl: 'Sanity testing passed' },
    { name: 'Vidhi', project: 'Smartporters', role: 'QA', cap: 80, alloc: 10, days: '1st Mon', remarks: 'QA documentation and admin panel testing', tl: 'Test cases documented' },
    { name: 'Vidhi', project: 'Nexlead Retainer', role: 'QA', cap: 80, alloc: 60, days: '2nd Mon, 1st Tue, Wed, Thu', remarks: 'Client change testing', tl: 'Client ticket verification pass' },

    // Abhay Prakash (QA: 2 allocations)
    { name: 'Abhay Prakash', project: 'HomePro', role: 'QA', cap: 80, alloc: 40, days: 'Mon–Tue', remarks: 'Client enhancements', tl: 'Postman collection automated' },
    { name: 'Abhay Prakash', project: 'Smartporters', role: 'QA', cap: 80, alloc: 40, days: 'Wed–Thu', remarks: 'Panel UI testing and bug-sheet updates', tl: 'Defect sheet signed off' }
  ];

  for (const a of allocationsData) {
    const userId = userMap[a.name];
    const projId = projectMap[a.project];
    if (userId && projId) {
      insertAllocation.run(
        currentPeriodId,
        userId,
        projId,
        a.role,
        a.cap,
        a.alloc,
        a.days,
        a.remarks,
        a.tl,
        'Progress tracked against sprint backlog',
        'Active',
        userMap['Kalash Pachauri']
      );
    }
  }

  // 5. Insert Scorecards for each employee for the month
  const insertScorecard = db.prepare(`
    INSERT INTO scorecards (
      month, user_id, is_self_eval_enabled, delivery_score, communication_score,
      ownership_score, initiative_score, documentation_score, quality_score, client_handling_score, total_score, evaluated_by
    ) VALUES ('October 2026', ?, 1, 18.0, 13.0, 18.0, 8.0, 8.0, 14.0, 8.0, 87.0, ?)
  `);

  for (const [name, id] of Object.entries(userMap)) {
    const userRole = usersData.find((u) => u.name === name)?.role;
    if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') continue;
    const isManager = userRole === 'MANAGER' || userRole === 'PROJECT_MANAGER';
    if (isManager) {
      // Managers have no manager appraisal score - they only score themselves
      db.prepare(`
        INSERT INTO scorecards (month, user_id, is_self_eval_enabled)
        VALUES ('October 2026', ?, 1)
      `).run(id);
    } else {
      insertScorecard.run(id, userMap['Kalash Pachauri']);
    }
  }

  console.log(`\n======================================================`);
  console.log(`SEEDED FULL PRODUCTION DATASET SUCCESSFULLY:`);
  console.log(`- ${usersData.length} Employees & Leaders created`);
  console.log(`- ${projectsData.length} Projects populated`);
  console.log(`- ${allocationsData.length} Allocations inserted for current cycle`);
  console.log(`- Dual-Role configured: Deepanshu Tyagi (Developer + DevOps)`);
  console.log(`- Hands-On Managers configured: Mukesh V. & Bhuvan Sharma`);
  console.log(`- 113% Overload on Deepanshu Tyagi & 133% Critical on Pranav Thakur calculated`);
  console.log(`======================================================\n`);
}

module.exports = seed;

if (require.main === module) {
  seed();
}
