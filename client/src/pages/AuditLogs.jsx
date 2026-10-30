import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCSV } from '../utils/exportCsv';
import { 
  History, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Fingerprint,
  Download,
  Search,
  XCircle,
  Clock,
  Trash2,
  Users,
  KeyRound,
  Layers,
  FolderKanban
} from 'lucide-react';
import { formatAuditLogText, getAuditCategoryBadge, formatToIST, formatFullIST } from '../utils/auditFormatter';

export default function AuditLogs() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const isAdmin = hasRole('ADMIN');
  const canViewSecurity = hasRole('ADMIN', 'MANAGER', 'PROJECT_MANAGER');

  const [activeTab, setActiveTab] = useState('SECURITY'); // 'SECURITY' or 'COLUMNS'
  const [logs, setLogs] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [securityStats, setSecurityStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colLogs, secEvts, secStats] = await Promise.all([
        api.getAuditLogs().catch(() => []),
        canViewSecurity ? api.getSecurityEvents().catch(() => []) : Promise.resolve([]),
        canViewSecurity ? api.getSecurityStats().catch(() => null) : Promise.resolve(null)
      ]);
      setLogs(colLogs);
      setSecurityEvents(secEvts);
      setSecurityStats(secStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canViewSecurity]);

  const handleUnlockUser = async (userId, userName) => {
    if (!window.confirm(`Unlock account for ${userName}? This will reset failed login attempts.`)) return;
    setActionLoading(true);
    try {
      const res = await api.unlockUser(userId);
      showToast(res.message, 'success');
      fetchData();
    } catch (err) {
      showToast(`Unlock failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurgeOldLogs = async () => {
    if (!window.confirm('Purge all audit logs, security events, and OTP records older than 3 days? This cannot be undone.')) return;
    setPurging(true);
    try {
      const res = await api.purgeOldAuditLogs();
      showToast(res.message || 'Audit logs older than 3 days successfully purged.', 'success');
      fetchData();
    } catch (err) {
      showToast(`Purge failed: ${err.message}`, 'error');
    } finally {
      setPurging(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'SECURITY') {
      const headers = [
        { label: 'Event Timestamp (UTC)', accessor: 'created_at' },
        { label: 'User Email', accessor: (e) => e.email || 'Unregistered' },
        { label: 'Security Event', accessor: 'event_type' },
        { label: 'Audit Status', accessor: 'status' },
        { label: 'IP Address', accessor: 'ip_address' },
        { label: 'Audit Notes / Details', accessor: 'details' }
      ];
      exportToCSV(`DW_Security_Events_${new Date().toISOString().slice(0, 10)}`, headers, securityEvents);
      showToast(`Exported ${securityEvents.length} security audit events.`, 'success');
    } else {
      const headers = [
        { label: 'Timestamp (UTC)', accessor: 'created_at' },
        { label: 'User Name', accessor: 'user_name' },
        { label: 'Role', accessor: 'user_role' },
        { label: 'Operation', accessor: 'action' },
        { label: 'Entity', accessor: 'entity' },
        { label: 'Entity ID', accessor: 'entity_id' },
        { label: 'Column Changed', accessor: 'field_name' },
        { label: 'Previous Value', accessor: 'old_value' },
        { label: 'Updated Value', accessor: 'new_value' }
      ];
      exportToCSV(`DW_Column_Audit_Ledger_${new Date().toISOString().slice(0, 10)}`, headers, logs);
      showToast(`Exported ${logs.length} ledger modification records.`, 'success');
    }
  };

  const getEventTypeBadge = (type) => {
    switch (type) {
      case 'LOGIN_SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOGIN_FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ACCOUNT_LOCKED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'OTP_GENERATED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BLOCKED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOCKED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredSecurityEvents = securityEvents.filter((evt) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (evt.email && evt.email.toLowerCase().includes(term)) ||
      (evt.event_type && evt.event_type.toLowerCase().includes(term)) ||
      (evt.ip_address && evt.ip_address.toLowerCase().includes(term)) ||
      (evt.status && evt.status.toLowerCase().includes(term)) ||
      (evt.details && evt.details.toLowerCase().includes(term))
    );
  });

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.user_name && log.user_name.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.entity && log.entity.toLowerCase().includes(term)) ||
      (log.field_name && log.field_name.toLowerCase().includes(term)) ||
      (log.user_role && log.user_role.toLowerCase().includes(term)) ||
      (log.human_description && log.human_description.toLowerCase().includes(term)) ||
      (log.target_name && log.target_name.toLowerCase().includes(term)) ||
      (log.badge && log.badge.toLowerCase().includes(term)) ||
      (log.new_value && String(log.new_value).toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#F3701B]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security & Audit Trail</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  3-Day Retention (Auto-Purged)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Immutable governance ledger • Auto-cleaned every 3 days</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                onClick={handlePurgeOldLogs}
                disabled={purging || loading}
                className="px-3.5 py-2 text-rose-700 hover:text-rose-900 hover:bg-rose-50 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 border border-rose-200 bg-white shadow-2xs disabled:opacity-50"
                title="Manually purge logs and OTPs older than 3 days"
              >
                <Trash2 className={`w-4 h-4 text-rose-500 ${purging ? 'animate-spin' : ''}`} />
                <span>{purging ? 'Purging...' : 'Purge >3d Logs'}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 border border-slate-200 bg-white shadow-2xs"
              title="Download audit records as CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 border border-slate-200 bg-white shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Metric Cards (4 grid) */}
      {canViewSecurity && activeTab === 'SECURITY' && securityStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Users Today */}
          <div 
            onClick={() => {
              if (securityStats?.signedInUsersToday?.length > 0) setShowActiveUsersModal(true);
            }}
            className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm transition ${
              securityStats?.signedInUsersToday?.length > 0 ? 'cursor-pointer hover:border-emerald-300 hover:shadow-md' : ''
            }`}
            title={securityStats?.signedInUsersToday?.length > 0 ? "Click to view signed-in users list" : ""}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Users Today</p>
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 tracking-tight">
                  {securityStats.signedInUsersToday?.length ?? securityStats.activeUsersToday ?? 0}
                </p>
                {securityStats?.signedInUsersToday?.length > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    IST Today
                  </span>
                )}
              </div>
              {securityStats?.signedInUsersToday?.length > 0 ? (
                <div className="mt-1 flex items-center justify-between gap-1">
                  <p className="text-xs text-slate-600 truncate font-medium">
                    {securityStats.signedInUsersToday.map(u => (u.name || '').split(' ')[0]).join(', ')}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-semibold flex-shrink-0 hover:underline">
                    View →
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1">No sign-ins recorded today yet</p>
              )}
            </div>
          </div>

          {/* Card 2: Pending Password Resets */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Password Resets</p>
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                <KeyRound className="w-4.5 h-4.5 text-indigo-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-indigo-600 tracking-tight">{securityStats.pendingPasswordResets ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Initial password change pending</p>
            </div>
          </div>

          {/* Card 3: Failed Logins */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed Logins</p>
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-amber-600 tracking-tight">{securityStats.failedLogins ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Wrong password attempts in last 3 days</p>
            </div>
          </div>

          {/* Card 4: Locked Accounts */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Locked Accounts</p>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${(securityStats.lockedUsers?.length || 0) > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                <Lock className={`w-4.5 h-4.5 ${(securityStats.lockedUsers?.length || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
              </div>
            </div>
            <div className="mt-3">
              <p className={`text-3xl font-bold tracking-tight ${(securityStats.lockedUsers?.length || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {securityStats.lockedUsers?.length || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(securityStats.lockedUsers?.length || 0) > 0
                  ? 'Temporarily locked (5+ wrong attempts)'
                  : 'All user accounts clear & active'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Stats Cards for Audit Columns tab */}
      {canViewSecurity && activeTab === 'COLUMNS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">3-Day Ledger Total</p>
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <History className="w-4.5 h-4.5 text-slate-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{logs.length}</p>
              <p className="text-xs text-slate-500 mt-1">Modifications in 3-day retention</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocation Edits</p>
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-emerald-600 tracking-tight">
                {logs.filter(l => (l.category || '').toUpperCase() === 'ALLOCATION' || (l.entity || '').toLowerCase().includes('alloc')).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Resource assignment changes</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Edits</p>
              <div className="w-9 h-9 bg-[#F3701B]/10 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-4.5 h-4.5 text-[#ED6208]" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-[#ED6208] tracking-tight">
                {logs.filter(l => (l.category || '').toUpperCase() === 'PROJECT' || (l.entity || '').toLowerCase().includes('project')).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Project stage, risk & detail updates</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Member & Role Edits</p>
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-indigo-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-indigo-600 tracking-tight">
                {logs.filter(l => (l.category || '').toUpperCase() === 'USER' || (l.entity || '').toLowerCase().includes('user')).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Team member role & setting updates</p>
            </div>
          </div>
        </div>
      )}

      {/* Locked Accounts Warning Banner */}
      {canViewSecurity && securityStats?.lockedUsers?.length > 0 && (
        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-3 shadow-sm">
          <div className="font-bold flex items-center gap-2 text-rose-900 text-sm">
            <ShieldAlert className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
            <span>Accounts Locked due to Failed Attempts ({securityStats.lockedUsers.length})</span>
          </div>
          <div className="divide-y divide-rose-200/60 bg-white/60 rounded-lg p-2 border border-rose-200/50">
            {securityStats.lockedUsers.map((u) => (
              <div key={u.id} className="py-2 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{u.name}</span>
                  <span className="text-slate-500 ml-1">({u.email})</span>
                  <span className="text-rose-700 font-medium ml-2">• {u.failed_login_attempts} failed attempts</span>
                  <span className="text-slate-400 ml-2 text-[11px]">Locked until {formatToIST(u.locked_until)} IST</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleUnlockUser(u.id, u.name)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs self-start sm:self-auto disabled:opacity-50"
                  >
                    <Unlock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Unlock User</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls: Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab switcher: pill tabs */}
        <div className="bg-slate-100 rounded-lg p-1 flex gap-1 w-fit border border-slate-200/60">
          {canViewSecurity && (
            <button
              onClick={() => setActiveTab('SECURITY')}
              className={`px-3 py-1.5 text-xs rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'SECURITY'
                  ? 'bg-white shadow-sm text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Security Events ({securityEvents.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('COLUMNS')}
            className={`px-3 py-1.5 text-xs rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'COLUMNS' || !canViewSecurity
                ? 'bg-white shadow-sm text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-700 font-medium'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Columns ({logs.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail..."
            className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent w-full sm:w-64 placeholder:text-slate-400 text-slate-900 shadow-2xs"
          />
        </div>
      </div>

      {/* TAB 1: AUTHENTICATION & SECURITY AUDIT */}
      {activeTab === 'SECURITY' && canViewSecurity && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[700px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[#F3701B] animate-spin" />
                        <span className="text-xs">Loading security events...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSecurityEvents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                          <ShieldCheck className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No security events found</p>
                        <p className="text-xs text-slate-400 mt-1">Audit log is clear or no events match your search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSecurityEvents.map((evt) => {
                    const isLocked = evt.status === 'LOCKED' || evt.event_type === 'ACCOUNT_LOCKED';
                    return (
                      <tr key={evt.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {evt.created_at_ist || formatFullIST(evt.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getEventTypeBadge(evt.event_type)}`}>
                            {evt.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {evt.email || 'Anonymous'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {evt.ip_address || '127.0.0.1'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(evt.status)}`}>
                            {evt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate" title={evt.details || ''}>
                          {evt.details || '—'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isLocked && evt.user_id && (
                            <button
                              onClick={() => handleUnlockUser(evt.user_id, evt.email)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-2xs"
                            >
                              <Unlock className="w-3 h-3 text-rose-500" />
                              <span>Unlock</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COLUMN & FIELD MODIFICATIONS */}
      {(activeTab === 'COLUMNS' || !canViewSecurity) && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[700px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity Summary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Values Changed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[#F3701B] animate-spin" />
                        <span className="text-xs">Loading audit ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                          <History className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No audit records found</p>
                        <p className="text-xs text-slate-400 mt-1">No modifications recorded yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const description = log.human_description || formatAuditLogText(log);
                    const categoryClass = getAuditCategoryBadge(log.category);
                    const badgeLabel = log.badge || (log.action || '').replace(/_/g, ' ');

                    return (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.created_at_ist || formatFullIST(log.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 text-xs">{log.user_name}</span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                              {log.user_role}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 text-xs leading-snug max-w-md">
                            {description}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryClass}`}>
                            {badgeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-slate-800 text-xs block">
                            {log.target_name || `${log.entity} #${log.entity_id}`}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {log.entity} #{log.entity_id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.new_value ? (
                            <div className="flex items-center gap-2 text-xs font-mono">
                              {log.old_value && log.old_value !== log.new_value ? (
                                <>
                                  <span className="text-slate-400 max-w-[120px] truncate" title={log.old_value}>
                                    {log.old_value}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                </>
                              ) : null}
                              <span className="text-emerald-700 font-semibold max-w-[150px] truncate" title={log.new_value}>
                                {log.new_value}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Signed In Users Today */}
      {showActiveUsersModal && securityStats?.signedInUsersToday && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Signed-In Users Today</h3>
                  <p className="text-xs text-slate-500">
                    {securityStats.signedInUsersToday.length} team members signed in on {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowActiveUsersModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto divide-y divide-slate-100">
              {securityStats.signedInUsersToday.map((u) => (
                <div key={u.id || u.email} className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-lg transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {(u.name || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{u.name}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      {u.time_ist} IST
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowActiveUsersModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
