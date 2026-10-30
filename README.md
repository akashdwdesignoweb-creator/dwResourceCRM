# DW Resource & Project Management CRM (v2.0 RBAC)

A modern, role-secured Resource Allocation & Project Management CRM built directly from the **DW-Resource Tracker** Google Spreadsheet data.

---

## 🌟 Key Highlights & Architecture

- **Role-Tailored UI & Workspaces (Zero Clutter)**:
  - **Developer & QA View**:
    - **No confusing admin bars or clutter**: Developers do not see admin management sheets or other team members' settings.
    - **Assigned Projects & Timeline**: Clear, dedicated cards showing which project they are assigned to, the timeline/working days (e.g. `100% Full Week` or `40% Tuesday/Wednesday`), and their utilization.
    - **Work Assigned in that Timeline**: Prominent display of the exact work, sprint objectives, and deliverables entered by the PM (matching the PM Remarks in weekly sheets).
    - **Manager-Gated Responsibility Scorecard**: Strictly locked by default (`🔒 Self-Evaluation Access Locked`). Developers can only fill their self-evaluation and scores if the Admin or Project Manager explicitly toggles access for them. All other information is completely untouched.
  - **Project Manager View**:
    - Manage weekly resource allocations (matrix view matching the Google Sheets tabs).
    - Assign projects, set timeline percentages & working days, and enter PM Remarks / work instructions each week.
    - Toggle developer self-evaluation access on the Responsibility Scorecard.
  - **Tech Lead View**:
    - Focuses on Technical Projects, architecture alignment, Leadership Board, and blockers.
  - **DevOps View**:
    - Focuses on deployment channels (Prod & Staging) and weekly DevOps health audits.
  - **Admin View**:
    - Full system oversight with all views, user rosters, and immutable audit trails.


---

## 🔐 Credentials & Role Directory (dw.com Domain)

The system enforces strict 2-Factor Authentication (Email OTP verification with account lockout protection). Pre-configured accounts seeded directly from the spreadsheet:

### 1. Super Admins (Full System Oversight)
- **Kalash Pachauri**: `kalash@dw.com` / `admin123`
- **Bhavik Agarwal**: `bhavik@dw.com` / `admin123`
*Capabilities*: Complete access across all departments, user management (can create/edit managers & developers), projects, allocations, capacity planning, audit trail, and Security Center (unlock accounts, view failed MFA attempts).

### 2. Department Managers (Hands-On Developers & Team Leaders)
- **Mukesh V.** (Mobile Dev Manager & Hands-On Developer): `mukesh.v@dw.com` / `password123`
- **Bhuvan Sharma** (Frontend Dev Manager & Hands-On Developer): `bhuvan.sharma@dw.com` / `password123`
*Capabilities*: Manage department allocations, assign projects, edit PM remarks, evaluate developer scorecards, plus access to their own "My Hands-On Tasks" tab for their active project allocations.

### 3. Dual-Role Specialist: Developer & DevOps
- **Deepanshu Tyagi**: `deepanshu.tyagi@dw.com` / `password123`
*Capabilities*: Operates seamlessly as a Backend Developer & Project Lead across 3 projects (ArcX 2.0, Goldsky Retainer, HH Retainer) **AND** has full DevOps access (Deployment Channels, Server Health Checks, infrastructure notes) under a single login.

### 4. Developers & Tech Leads
- **Mobile Dev**:
  - Palak Satti: `palak.satti@dw.com` / `password123` (Developer on Proski Revamp)
  - Sagar Sharma: `sagar.sharma@dw.com` / `password123` (Developer on Smartporters)
  - Sukhdeep Singh: `sukhdeep.singh@dw.com` / `password123` (Developer on ArcX 2.0, Project Lead on Navkom)
  - Hritik Rajput: `hritik.rajput@dw.com` / `password123` (Developer on Coyoacon Retainer, HomePro)
- **Backend Dev**:
  - Shivansh Katiyar: `shivansh.katiyar@dw.com` / `password123` (Project Lead on HomePro)
  - Abhishek Rai: `abhishek.rai@dw.com` / `password123` (Project Lead on Coyoacon Retainer, Developer on Server Maintenance)
  - Mayank Singh: `mayank.singh@dw.com` / `password123` (Project Lead on Smartporters)
  - Himanshu Bisht: `himanshu.bisht@dw.com` / `password123` (Project Lead on 24/7 CRM, Developer on Flambao 2.0)
  - Akash Verma: `akash.verma@dw.com` / `password123` (Developer on Leep Health, Nexlead Retainer)
- **Frontend Dev**:
  - Yash Gupta: `yash.gupta@dw.com` / `password123` (Developer on 24/7 CRM)
  - Jatin Gupta: `jatin.gupta@dw.com` / `password123` (Developer on Coyoacon Retainer, Smartporters)
  - Mehul: `mehul@dw.com` / `password123` (Developer on Goldsky, 24/7 CRM, HH Retainer)

### 5. Quality Analyst (QA) Team
- **Pranav Thakur**: `pranav.thakur@dw.com` / `password123` (QA on Coyoacon Retainer, Smartporters, Goldsky Retainer)
- **Vidhi**: `vidhi@dw.com` / `password123` (QA on HH Retainer, Smartporters, Nexlead Retainer)
- **Abhay Prakash**: `abhay.prakash@dw.com` / `password123` (QA on HomePro, Smartporters)

---

## 📈 Resource Utilization & Capacity Rules

| Utilization (%) | Status Badge | Meaning |
|---|:---:|---|
| **< 70%** | `Available` (Blue) | Has spare capacity for new assignments |
| **70% – 100%** | `Balanced` (Green) | Workload is within expected capacity (100% is Balanced) |
| **> 100% – 120%** | `Overload` (Amber) | Workload exceeds capacity (120% is Overload) |
| **> 120%** | `Critical` (Red) | Significantly overloaded |

### Key Calculation Rules:
1. **Working Day to Allocation Conversion**: 1 working day = 20% allocation; a 5-day work week = 100%.
2. **Aggregated Utilization**: Employee-level utilization is calculated across **all** assigned projects against their personal planned capacity:
   $$\text{Utilization (\%)} = \left(\frac{\sum \text{Allocated \%}}{\text{Capacity \%}}\right) \times 100$$
3. **Calibrated Examples from Live Dataset**:
   - **Deepanshu Tyagi**: 40% (ArcX) + 30% (Goldsky) + 20% (HH) = **90%** total allocation vs **80%** capacity $\rightarrow$ **113% Overload** (Amber)
   - **Pranav Thakur**: 30% (Coyoacon) + 30% (Smartporters) + 20% (Goldsky) = **80%** total allocation vs **60%** capacity $\rightarrow$ **133% Critical** (Red)
   - **Mukesh V.**: 20% (RTT) + 40% (Nexlead) + 20% (Proski) = **80%** total allocation vs **80%** capacity $\rightarrow$ **100% Balanced** (Green)
   - **Mayank Singh**: 60% total allocation vs **60%** capacity $\rightarrow$ **100% Balanced** (Green)

---

## 🚦 Project Risk Classification (Low / Medium / High)

Projects across the **Project Directory**, **Leadership Board**, and **Executive Dashboard** use a 3-tier risk classification:

| Risk Level | Visual Indicator | Status Meaning |
|---|:---:|---|
| **Low Risk** | 🟢 Green Badge | Smooth delivery; no critical blockers; sprint deliverables on schedule. |
| **Medium Risk** | 🟡 Amber Badge | Moderate risk; watchpoint items (e.g., API delays, UAT bug validation). |
| **High Risk** | 🔴 Red Badge | Critical blockers requiring immediate tech lead / managerial escalation. |

---

## 📅 Weekly Planning Cycles & Rollover Workflow

In Google Sheets, a new tab was manually cloned each week. In this CRM, weekly cycles can be created in seconds with full allocation rollover or via 1-click automation:

### 1. How Admins & Managers Make a New Cycle
- Open the **Resource Matrix** tab.
- Next to the cycle dropdown, click **"+ New Cycle"**:
  1. **Cycle Name**: E.g., `Resource Allocation (19/10/26 - 23/10/26)` (auto-suggested).
  2. **Dates**: Select Monday start date and Friday end date.
  3. **Set as Active Current Cycle**: Makes it the default view for the team.
  4. **Rollover Team Allocations**: Clones all 36 active team assignments, working days, and capacity percentages as the baseline (no need to re-enter allocations).
  5. **Carry Forward PM Remarks**: Optional checkbox to copy forward sprint tasks or start with clean task fields.

### 2. 1-Click "⚡ Auto Next Week" Button
- Admins and Managers can click **"Auto Next Week"** right in the header bar.
- The system automatically:
  1. Calculates the upcoming Monday $\rightarrow$ Friday date range.
  2. Creates `Resource Allocation (DD/MM/YY - DD/MM/YY)`.
  3. Clones the team's project assignments and working capacities.
  4. Activates the new week as current.

### 3. Historical Cycle Inspection & "Make Active"
- The cycle dropdown lets managers inspect past weekly sprints at any time.
- If viewing an archived week, clicking **"Make Active"** switches the current active cycle.

---

## 🛡️ Enterprise Security & MFA Workflow

1. **Two-Factor Authentication (OTP)**: Every login generates a secure 6-digit OTP code valid for 10 minutes. For testing convenience in development, the OTP code is displayed directly in a preview toast on the UI.
2. **Brute-Force & Lockout Protection**: 5 consecutive failed login or OTP attempts trigger an automatic 15-minute account lockout.
3. **Admin Security Center (`/audit`)**: Super Admins can monitor real-time authentication logs, failed login spikes, active lockouts, and unlock accounts with a single click.

---

## 🚀 Running the Application

### Accessing the Running CRM
The CRM server is currently running at:
👉 **`http://localhost:5001`**

### Starting Manually
```bash
# Start backend and serve frontend (single command):
npm start
# Server starts on http://localhost:5001

# Or run client in Vite development mode with hot reload:
npm run client
# Starts on http://localhost:3000 (proxies API to 5001)
```

### Re-seeding the Database
To re-initialize or restore original Google Sheets data:
```bash
npm run seed
```
