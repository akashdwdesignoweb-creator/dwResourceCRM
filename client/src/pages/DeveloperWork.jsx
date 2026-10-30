import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Calendar, 
  Clock, 
  Briefcase, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Save, 
  ExternalLink, 
  Edit3, 
  Check, 
  FileSpreadsheet,
  User,
  Users
} from 'lucide-react';

export default function DeveloperWork() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [myAllocations, setMyAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState({});
  const [saveSuccess, setSaveSuccess] = useState({});
  const [memberNotes, setMemberNotes] = useState({});
  const [editingQaSheet, setEditingQaSheet] = useState({});
  const [qaSheetUrls, setQaSheetUrls] = useState({});
  const [savingQaSheet, setSavingQaSheet] = useState({});

  useEffect(() => {
    api.getPeriods()
      .then((pers) => {
        setPeriods(pers);
        const cur = pers.find((p) => p.is_current) || pers[0];
        if (cur) setSelectedPeriodId(cur.id);
      })
      .catch((err) => console.error('Failed to load periods:', err));
  }, []);

  const fetchMyWork = (showLoading = false) => {
    if (!selectedPeriodId) return;
    if (showLoading) setLoading(true);
    api.getMyAllocations(selectedPeriodId)
      .then((data) => {
        setMyAllocations(data);
        const initialNotes = {};
        const initialQaSheets = {};
        data.forEach((a) => {
          initialNotes[a.id] = a.member_notes || '';
          initialQaSheets[a.id] = a.qa_sheet_url || '';
        });
        setMemberNotes(initialNotes);
        setQaSheetUrls(initialQaSheets);
      })
      .catch((err) => console.error('Failed to load assigned work:', err))
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  };

  useEffect(() => {
    fetchMyWork(true);
  }, [selectedPeriodId]);

  const handleSaveNotes = async (allocId) => {
    setSavingNotes((prev) => ({ ...prev, [allocId]: true }));
    try {
      await api.updateAllocation(allocId, { member_notes: memberNotes[allocId] || '' });
      setSaveSuccess((prev) => ({ ...prev, [allocId]: true }));
      showToast('Progress notes saved successfully.', 'success');
      setTimeout(() => {
        setSaveSuccess((prev) => ({ ...prev, [allocId]: false }));
      }, 2500);
    } catch (err) {
      showToast(`Failed to save note: ${err.message}`, 'error');
    } finally {
      setSavingNotes((prev) => ({ ...prev, [allocId]: false }));
    }
  };

  const handleSaveQaSheet = async (allocId, projectId, projectName) => {
    if (!projectId) return;
    setSavingQaSheet((prev) => ({ ...prev, [allocId]: true }));
    try {
      const url = qaSheetUrls[allocId] || '';
      await api.updateProject(projectId, { qa_sheet_url: url });
      setEditingQaSheet((prev) => ({ ...prev, [allocId]: false }));
      setMyAllocations((prev) =>
        prev.map((a) => (a.id === allocId ? { ...a, qa_sheet_url: url } : a))
      );
      showToast(`QA Test Sheet URL updated for "${projectName}".`, 'success');
      fetchMyWork(false);
    } catch (err) {
      showToast(`Failed to update QA sheet: ${err.message}`, 'error');
    } finally {
      setSavingQaSheet((prev) => ({ ...prev, [allocId]: false }));
    }
  };

  const currentPeriod = periods.find((p) => p.id === Number(selectedPeriodId));

  // Compute developer's total allocation and utilization for this cycle
  const totalAllocatedPct = myAllocations.reduce((sum, a) => sum + (a.allocated_pct || 0), 0);
  const capacityPct = user?.capacity_pct || 80;
  const utilizationPct = capacityPct > 0 ? Math.round((totalAllocatedPct / capacityPct) * 100) : 0;
  const remainingCapacity = capacityPct - totalAllocatedPct;

  const getWorkloadBadge = (util) => {
    if (util < 70) {
      return { label: 'Available (Spare Capacity)', bg: 'bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20' };
    }
    if (util <= 100) {
      return { label: 'Optimal Workload', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (util <= 120) {
      return { label: 'Over Capacity', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: 'Critical Overload', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const workloadBadge = getWorkloadBadge(utilizationPct);

  const getRiskBadge = (risk) => {
    if (risk === 'High' || risk === 'Red') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          High Risk
        </span>
      );
    }
    if (risk === 'Medium' || risk === 'Amber') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Medium Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Low Risk
      </span>
    );
  };

  const isQaUser = user?.role === 'QA' || user?.secondary_role === 'QA';

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#F3701B]/25">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Sprint Workspace</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {user?.name} • {user?.department || 'Engineering'} Team • {user?.role}
              </p>
            </div>
          </div>

          {/* Period selector dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">Sprint Cycle:</span>
            <div className="relative min-w-[240px]">
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer shadow-sm font-medium"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.is_current ? '★ (Active Cycle)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-6 space-y-6">
        {/* Utilization & Workload Overview Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#F3701B]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#ED6208]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Weekly Capacity & Utilization</h2>
                <p className="text-xs text-slate-500">
                  Active Cycle: <strong className="text-slate-700">{currentPeriod?.name || 'Active Cycle'}</strong>
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${workloadBadge.bg}`}>
              {workloadBadge.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Standard Capacity</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">{capacityPct}%</span>
              <span className="text-xs text-slate-500 block">({(capacityPct / 100) * 40} hrs/wk)</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Allocated</span>
              <span className="text-xl font-bold text-[#ED6208] mt-0.5 block">{totalAllocatedPct}%</span>
              <span className="text-xs text-slate-500 block">({(totalAllocatedPct / 100) * 40} hrs planned)</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Utilization Rate</span>
              <span className={`text-xl font-bold mt-0.5 block ${utilizationPct > 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {utilizationPct}%
              </span>
              <span className="text-xs text-slate-500 block">of planned capacity</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Available Buffer</span>
              <span className={`text-xl font-bold mt-0.5 block ${remainingCapacity < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {remainingCapacity}%
              </span>
              <span className="text-xs text-slate-500 block">
                {remainingCapacity < 0 ? 'Over capacity' : 'Spare capacity'}
              </span>
            </div>
          </div>

          {/* Capacity Bar Visual */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1.5 text-slate-600">
              <span className="font-medium">Workload Distribution</span>
              <span className="font-mono text-slate-900 font-semibold">{totalAllocatedPct}% of {capacityPct}% allocated</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  utilizationPct > 100 ? 'bg-amber-500' : 'bg-gradient-to-r from-[#F3701B] to-[#ED6208]'
                }`}
                style={{ width: `${Math.min(100, (totalAllocatedPct / capacityPct) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Work Assignment Cards */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#F3701B] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-sm font-medium">Loading your assignments...</span>
          </div>
        ) : myAllocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No project allocations for this cycle</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              You are currently marked as Bench / Available for this cycle. Your manager will allocate project hours when new sprints start.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myAllocations.map((alloc) => {
              const isTechLead = alloc.role_title === 'Tech Lead' || alloc.tl_name === user?.name;

              return (
                <div
                  key={alloc.id}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden"
                >
                  {/* Header Strip */}
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {alloc.project_name || 'Bench Allocation'}
                      </h3>
                      {alloc.project_account && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                          {alloc.project_account}
                        </span>
                      )}
                      {alloc.project_risk && getRiskBadge(alloc.project_risk)}
                      {isTechLead && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                          ⚡ Tech Lead
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20 font-mono">
                        {alloc.allocated_pct}% Allocated
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {((alloc.allocated_pct || 0) / 20).toFixed(0)} Days / Wk
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4 space-y-4">
                    {/* PM Directives box */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-[#ED6208]" />
                        <span>PM Work Directives</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-normal">
                        {alloc.pm_remarks || (
                          <span className="text-slate-400 italic">
                            No specific directives entered by the Project Manager for this cycle yet.
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Metadata Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Your Role:</span>
                        <span className="font-semibold text-slate-800">{alloc.role_title || 'Developer'}</span>
                      </div>
                      <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Project Manager:</span>
                        <span className="font-semibold text-slate-800">{alloc.pm_name || 'Unassigned'}</span>
                      </div>
                      <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tech Lead:</span>
                        <span className="font-semibold text-slate-800">{alloc.tl_name || 'Unassigned'}</span>
                      </div>
                      <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Project Stage:</span>
                        <span className="font-semibold text-slate-800">{alloc.project_stage || 'In Progress'}</span>
                      </div>
                    </div>

                    {/* QA Test Sheet block with current URL display + inline edit */}
                    {(isQaUser || alloc.qa_sheet_url || ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role)) && (
                      <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>QA Test Sheet & Bug Tracker</span>
                          </div>

                          {!editingQaSheet[alloc.id] && (isQaUser || ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role)) && (
                            <button
                              type="button"
                              onClick={() => setEditingQaSheet((prev) => ({ ...prev, [alloc.id]: true }))}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#ED6208] bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{alloc.qa_sheet_url ? 'Edit Sheet URL' : '+ Add QA Sheet'}</span>
                            </button>
                          )}
                        </div>

                        {editingQaSheet[alloc.id] ? (
                          <div className="space-y-2 pt-1">
                            <input
                              type="url"
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                              value={qaSheetUrls[alloc.id] !== undefined ? qaSheetUrls[alloc.id] : (alloc.qa_sheet_url || '')}
                              onChange={(e) => setQaSheetUrls({ ...qaSheetUrls, [alloc.id]: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] font-mono text-slate-900"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingQaSheet((prev) => ({ ...prev, [alloc.id]: false }))}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveQaSheet(alloc.id, alloc.project_id, alloc.project_name)}
                                disabled={savingQaSheet[alloc.id]}
                                className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{savingQaSheet[alloc.id] ? 'Saving...' : 'Save QA Sheet'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                            {alloc.qa_sheet_url ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-slate-500 font-medium">Sheet URL:</span>
                                <a
                                  href={alloc.qa_sheet_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono font-medium text-[#ED6208] hover:text-[#D30902] hover:underline truncate max-w-md flex items-center gap-1"
                                  title={alloc.qa_sheet_url}
                                >
                                  <span className="truncate">{alloc.qa_sheet_url}</span>
                                  <ExternalLink className="w-3.5 h-3.5 text-[#ED6208] flex-shrink-0" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                No QA test sheet linked yet for this project.
                              </span>
                            )}

                            {alloc.qa_sheet_url && (
                              <a
                                href={alloc.qa_sheet_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white shadow-sm transition-colors self-start sm:self-auto"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Open QA Sheet</span>
                                <ExternalLink className="w-3 h-3 ml-0.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress Notes */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span>My Work Status & Member Notes</span>
                          <span className="text-[10px] font-normal text-slate-400 lowercase">(visible to leads & PM)</span>
                        </label>
                        {saveSuccess[alloc.id] && (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Notes Saved!</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <textarea
                          rows="2"
                          placeholder="Log your progress updates, PR links, or blockers here..."
                          value={memberNotes[alloc.id] || ''}
                          onChange={(e) => setMemberNotes({ ...memberNotes, [alloc.id]: e.target.value })}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(alloc.id)}
                          disabled={savingNotes[alloc.id]}
                          className="self-end sm:self-center px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#ED6208] hover:from-[#ED6208] hover:to-[#D30902] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#F3701B]/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{savingNotes[alloc.id] ? 'Saving...' : 'Save Note'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Timeline row & Days note */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-[#ED6208] flex-shrink-0" />
                        <span className="font-medium text-slate-700">Sprint Timeline:</span>
                        <span className="text-slate-900 font-semibold">
                          {currentPeriod?.start_date ? `${currentPeriod.start_date} — ${currentPeriod.end_date}` : currentPeriod?.name || 'Active Sprint'}
                        </span>
                      </div>
                      {alloc.allocation_days_note && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Working Days: <strong className="text-slate-700">{alloc.allocation_days_note}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
