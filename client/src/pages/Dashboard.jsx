import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Users2, 
  FolderKanban, 
  Clock, 
  ArrowUpRight, 
  ShieldCheck, 
  TrendingUp,
  ArrowRight,
  LayoutDashboard,
  Users,
  KeyRound
} from 'lucide-react';
import { formatAuditLogText, getAuditCategoryBadge, formatToIST, formatFullIST } from '../utils/auditFormatter';

export default function Dashboard({ setActiveTab }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);

  useEffect(() => {
    Promise.all([api.getDashboardStats(), api.getProjects(), api.getAuditLogs()])
      .then(([st, pr, al]) => {
        setStats(st);
        setProjects(pr);
        setRecentAudits(al.slice(0, 6));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-[#F3701B] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading enterprise intelligence...</p>
      </div>
    );
  }

  // Quick risk calculations for breakdown
  const highRiskCount = projects.filter((p) => p.weekly_risk === 'High' || p.weekly_risk === 'Red').length;
  const medRiskCount = projects.filter((p) => p.weekly_risk === 'Medium' || p.weekly_risk === 'Amber').length;
  const lowRiskCount = projects.filter((p) => p.weekly_risk === 'Low' || p.weekly_risk === 'Green').length;

  return (
    <div className="animate-fadeIn min-h-full">
      {/* Page Header section (sticky, white, border-b) */}
      <div className="sticky top-0 z-20 px-6 py-4 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] rounded-xl flex items-center justify-center shadow-xs shadow-[#F3701B]/25 flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {user?.name}'s operational overview • {stats?.currentPeriodName || 'Loading...'}
              </p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab('allocations')}
              className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#ED6208] hover:from-[#ED6208] hover:to-[#D30902] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#F3701B]/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Weekly Matrix</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Team Directory</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-6">
        {/* KPI Grid (6 columns on xl, 3 on lg, 2 on sm, 1 on mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Resources */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Resources</p>
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center text-[#F3701B]">
                <Users2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats?.totalResources ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>100% Deployed</span>
              </p>
            </div>
          </div>

          {/* Active Projects */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</p>
              <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats?.totalProjects ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="font-medium text-violet-700">6 Accounts</span>
                <span>• Active</span>
              </p>
            </div>
          </div>

          {/* Team Utilization */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Utilization</p>
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-emerald-600 tracking-tight">{stats?.avgUtilization ?? 0}%</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="font-medium text-emerald-700">Balanced Band</span>
              </p>
            </div>
          </div>

          {/* Bench Resources */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bench Resources</p>
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-bold text-amber-600 tracking-tight">{stats?.benchCount ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="font-medium text-amber-700">Available</span>
                <span>for sprint load</span>
              </p>
            </div>
          </div>

          {/* Active Users Today */}
          <div 
            onClick={() => {
              if (stats?.signedInUsersToday?.length > 0) setShowActiveUsersModal(true);
            }}
            className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm card-hover flex flex-col justify-between transition ${
              stats?.signedInUsersToday?.length > 0 ? 'cursor-pointer hover:border-emerald-300' : ''
            }`}
            title={stats?.signedInUsersToday?.length > 0 ? "Click to view signed-in users list" : ""}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Users</p>
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats?.activeUsersToday ?? 0}</p>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  IST Today
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {stats?.signedInUsersToday?.length > 0 ? (
                  <span className="text-emerald-700 font-medium hover:underline">
                    {stats.signedInUsersToday.map(u => (u.name || '').split(' ')[0]).join(', ')} →
                  </span>
                ) : (
                  'No sign-ins yet'
                )}
              </p>
            </div>
          </div>

          {/* Pending Password Requests */}
          <div 
            onClick={() => setActiveTab('resources')}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm card-hover flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition"
            title="View users with pending initial passwords"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password Resets</p>
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-indigo-600 tracking-tight">{stats?.pendingPasswordResets ?? 0}</p>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-full border border-indigo-200">
                  Pending
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {stats?.pendingPasswordResets > 0 ? (
                  <span className="text-indigo-600 font-medium hover:underline">Initial setup required →</span>
                ) : (
                  'All accounts updated'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Summary Bar (between KPIs and main grid) */}
        <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-sm flex items-center gap-3 overflow-x-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex-shrink-0">
            Risk Overview:
          </div>
          <div className="h-4 w-px bg-slate-200 flex-shrink-0 hidden sm:block" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
            <span>Low Risk: {lowRiskCount}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
            <span>Medium Risk: {medRiskCount}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
            <span>High Risk: {highRiskCount}</span>
          </div>
        </div>

        {/* Main two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left col (col-span-2): Project Health Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">Live Project Pipeline</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                  {projects.length} projects
                </span>
              </div>
              <button
                onClick={() => setActiveTab('projects')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F3701B] hover:text-[#ED6208] cursor-pointer transition"
              >
                <span>Manage Portfolio</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
              <table className="enterprise-table w-full text-left border-collapse min-w-[680px]">
                <thead className="bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 whitespace-nowrap">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 whitespace-nowrap">Tech Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 whitespace-nowrap">Stage</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 whitespace-nowrap">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-400 italic">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    projects.map((proj) => {
                      const isHigh = proj.weekly_risk === 'High' || proj.weekly_risk === 'Red';
                      const isMed = proj.weekly_risk === 'Medium' || proj.weekly_risk === 'Amber';
                      const riskLabel = isHigh ? 'High Risk' : isMed ? 'Medium Risk' : 'Low Risk';

                      return (
                        <tr key={proj.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isHigh ? 'bg-rose-500 ring-2 ring-rose-200' : isMed ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-emerald-500 ring-2 ring-emerald-200'
                                }`}
                              />
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 block truncate max-w-[220px]" title={proj.name}>
                                  {proj.name}
                                </span>
                                {proj.weekly_blockers && (
                                  <span className="text-[11px] text-rose-600 font-medium block truncate max-w-[220px]" title={proj.weekly_blockers}>
                                    ⚠️ {proj.weekly_blockers}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {proj.account || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">
                            {proj.tl_name || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                              {proj.stage || 'Development'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs whitespace-nowrap ${
                                isHigh
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isMed
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              <span>{riskLabel}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right col (col-span-1): Audit Feed */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between overflow-hidden">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-[#F3701B]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">Real-Time Audit</h2>
                </div>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-semibold text-[#F3701B] hover:text-[#ED6208] cursor-pointer flex items-center gap-1 transition"
                >
                  <span>All Logs →</span>
                </button>
              </div>

              {/* Feed Content */}
              <div className="p-5">
                {recentAudits.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    No audit logs recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {recentAudits.map((log) => {
                      const description = log.human_description || formatAuditLogText(log);
                      const badgeLabel = log.badge || (log.action || '').replace(/_/g, ' ');
                      const categoryClass = getAuditCategoryBadge(log.category);

                      return (
                        <div key={log.id} className="relative">
                          {/* Timeline dot */}
                          <span className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#F3701B] ring-4 ring-white" />

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-bold text-slate-900 truncate">{log.user_name}</span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 flex-shrink-0">
                                {log.user_role}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0" title={`${formatFullIST(log.created_at)} (IST)`}>
                              {log.time_ist || formatToIST(log.created_at)}
                            </span>
                          </div>

                          {/* Clear Human-Readable Action Summary */}
                          <p className="text-xs text-slate-800 font-medium mt-1 leading-snug">
                            {description}
                          </p>

                          {/* Metadata badge pill */}
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${categoryClass}`}>
                              {badgeLabel}
                            </span>
                            {log.entity && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                • {log.entity}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom RBAC status row */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-600">RBAC Security Compliance</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Signed In Users Today */}
      {showActiveUsersModal && stats?.signedInUsersToday && (
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
                    {stats.signedInUsersToday.length} team members active today (IST)
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
              {stats.signedInUsersToday.map((u) => (
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
