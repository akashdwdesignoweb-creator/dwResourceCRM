import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Award, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet,
  User,
  Briefcase,
  Layers,
  Search,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  FolderGit2
} from 'lucide-react';

export default function LeadershipBoard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  const fetchLeadership = () => {
    setLoading(true);
    api.getLeadership()
      .then((data) => setRows(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeadership();
  }, []);

  const getRiskMeta = (risk) => {
    const isRed = risk === 'High' || risk === 'Red';
    const isAmber = risk === 'Medium' || risk === 'Amber';
    if (isRed) {
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        label: 'High Risk',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
      };
    }
    if (isAmber) {
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Medium Risk',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
      };
    }
    return {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Low Risk',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    };
  };

  const filteredRows = rows.filter((row) => {
    if (riskFilter) {
      const isRed = row.weekly_risk === 'High' || row.weekly_risk === 'Red';
      const isAmber = row.weekly_risk === 'Medium' || row.weekly_risk === 'Amber';
      const isGreen = !isRed && !isAmber;
      if (riskFilter === 'High' && !isRed) return false;
      if (riskFilter === 'Medium' && !isAmber) return false;
      if (riskFilter === 'Low' && !isGreen) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesAccount = row.account?.toLowerCase().includes(term);
      const matchesProject = row.project_name?.toLowerCase().includes(term);
      const matchesTL = row.lead_name?.toLowerCase().includes(term);
      const matchesPM = row.pm_name?.toLowerCase().includes(term);
      const matchesQA = row.active_qa_name?.toLowerCase().includes(term);
      const matchesStage = row.project_stage?.toLowerCase().includes(term);
      if (!matchesAccount && !matchesProject && !matchesTL && !matchesPM && !matchesQA && !matchesStage) return false;
    }
    return true;
  });

  const highRiskCount = rows.filter((r) => r.weekly_risk === 'High' || r.weekly_risk === 'Red').length;
  const mediumRiskCount = rows.filter((r) => r.weekly_risk === 'Medium' || r.weekly_risk === 'Amber').length;
  const lowRiskCount = rows.filter((r) => r.weekly_risk !== 'High' && r.weekly_risk !== 'Red' && r.weekly_risk !== 'Medium' && r.weekly_risk !== 'Amber').length;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#F3701B]/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Technical Leadership Board
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                  {rows.length} Accounts
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Executive portfolio tracking across Project Managers, Tech Leads, Active QA, Blockers & Risk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 rounded-lg p-1 flex gap-1 border border-slate-200/60">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'cards'
                    ? 'bg-white shadow-2xs text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Leadership Cards Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white shadow-2xs text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={fetchLeadership}
              disabled={loading}
              className="px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 bg-white shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards (4 grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Portfolio Accounts */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</p>
            <div className="w-9 h-9 bg-[#F3701B]/10 rounded-lg flex items-center justify-center">
              <Award className="w-4.5 h-4.5 text-[#ED6208]" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{rows.length}</p>
            <p className="text-xs text-slate-500 mt-1">Enterprise projects monitored</p>
          </div>
        </div>

        {/* Card 2: Low Risk */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Risk (Green)</p>
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-emerald-600 tracking-tight">{lowRiskCount}</p>
            <p className="text-xs text-slate-500 mt-1">On schedule with no blockers</p>
          </div>
        </div>

        {/* Card 3: Medium Risk */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medium Risk</p>
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-amber-600 tracking-tight">{mediumRiskCount}</p>
            <p className="text-xs text-slate-500 mt-1">Minor blockers or delays</p>
          </div>
        </div>

        {/* Card 4: High Risk */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High Risk Alert</p>
            <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-rose-600 tracking-tight">{highRiskCount}</p>
            <p className="text-xs text-slate-500 mt-1">Critical escalation required</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search account, TL, or PM..."
              className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent w-64 placeholder:text-slate-400 text-slate-900 shadow-2xs"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-900 cursor-pointer shadow-2xs"
          >
            <option value="">All Risk Levels</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-900">{filteredRows.length}</span> leadership records
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-[#F3701B] animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading Leadership Board...</p>
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <Award className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No leadership records available</p>
            <p className="text-xs text-slate-400 mt-1">No accounts match your filter criteria.</p>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Leadership Cards in Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRows.map((row) => {
            const riskMeta = getRiskMeta(row.weekly_risk);
            const isRed = row.weekly_risk === 'High' || row.weekly_risk === 'Red';
            const isAmber = row.weekly_risk === 'Medium' || row.weekly_risk === 'Amber';

            return (
              <div
                key={row.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        {row.account}
                      </span>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">
                        {row.project_name}
                      </h2>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskMeta.badge}`}>
                        {riskMeta.icon}
                        <span>{riskMeta.label}</span>
                      </span>

                      {row.project_stage && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.project_stage}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Tech Lead Highlight */}
                  <div className="p-5 space-y-4">
                    {/* TL Name & Dept Badge */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F3701B] to-[#D30902] text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                        {row.lead_name ? row.lead_name.charAt(0).toUpperCase() : 'TL'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Tech Lead (TL)
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#F3701B]/10 text-[#ED6208]">
                            Lead
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {row.lead_name || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    {/* PM and Active QA */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Project Manager
                        </span>
                        <p className="font-semibold text-slate-800 mt-0.5 truncate">
                          {row.pm_name || 'Unassigned'}
                        </p>
                      </div>

                      <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Active QA
                        </span>
                        <p className="font-semibold text-slate-800 mt-0.5 truncate">
                          {row.active_qa_name || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    {/* Weekly Blockers */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Weekly Blockers & Notes
                      </span>
                      {row.weekly_blockers ? (
                        <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
                          isRed
                            ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                            : isAmber
                              ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                              : 'bg-slate-50 border-slate-200/60 text-slate-700'
                        }`}>
                          {row.weekly_blockers}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg text-xs text-slate-400 italic bg-slate-50 border border-slate-100">
                          No blockers reported this cycle.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: QA Sheet Link */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Quality Assurance:</span>
                  {row.qa_sheet_url ? (
                    <a
                      href={row.qa_sheet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ED6208] hover:text-[#D30902] bg-white hover:bg-[#F3701B]/10 border border-slate-200 hover:border-[#F3701B]/30 px-3 py-1 rounded-lg transition-colors shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#ED6208]" />
                      <span>View QA Sheet</span>
                      <ExternalLink className="w-3 h-3 text-[#F3701B]" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No sheet attached</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Data Table View */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Manager</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Lead (TL)</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Active QA</th>
                  <th className="px-4 py-3 min-w-[200px] text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Weekly Blockers</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">QA Sheet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const riskMeta = getRiskMeta(row.weekly_risk);

                  return (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.account}</td>
                      <td className="px-3 py-3 font-semibold text-[#ED6208]">{row.project_name}</td>
                      <td className="px-3 py-3 text-slate-700">{row.pm_name}</td>
                      <td className="px-3 py-3 text-slate-900 font-medium">{row.lead_name}</td>
                      <td className="px-3 py-3 text-slate-700">{row.active_qa_name}</td>
                      <td className="px-4 py-3 text-slate-600 leading-relaxed max-w-sm truncate">
                        {row.weekly_blockers || <span className="text-slate-400 italic">None reported</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${riskMeta.badge}`}>
                          {riskMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{row.project_stage}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {row.qa_sheet_url ? (
                          <a
                            href={row.qa_sheet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#ED6208] hover:text-[#D30902] font-semibold hover:underline"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Sheet</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
