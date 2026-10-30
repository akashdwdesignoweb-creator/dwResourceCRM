import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  CheckSquare, 
  Edit3, 
  Check, 
  Star, 
  TrendingUp, 
  Award, 
  Lock, 
  Unlock, 
  UserCheck,
  Search,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  X
} from 'lucide-react';

export default function Scorecards() {
  const { user, canEditField, hasRole } = useAuth();
  const { showToast } = useToast();
  const [scorecards, setScorecards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [togglingId, setTogglingId] = useState(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  const fetchScorecards = (showLoading = false) => {
    if (showLoading) setLoading(true);
    else setIsRefreshing(true);

    return api.getScorecards()
      .then((data) => setScorecards(data))
      .catch((err) => console.error(err))
      .finally(() => {
        if (showLoading) setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchScorecards(true);
  }, []);

  const handleStartEdit = (sc) => {
    setEditingId(sc.id);
    setEditForm({
      delivery_score: sc.delivery_score,
      communication_score: sc.communication_score,
      ownership_score: sc.ownership_score,
      initiative_score: sc.initiative_score,
      documentation_score: sc.documentation_score,
      quality_score: sc.quality_score,
      client_handling_score: sc.client_handling_score,
      scope_of_improvement: sc.scope_of_improvement || ''
    });
  };

  const handleSave = async (id) => {
    try {
      const updatedData = await api.updateScorecard(id, editForm);
      setEditingId(null);
      showToast('Scorecard evaluation saved successfully.', 'success');
      // In-place update so page does not jump or unmount
      setScorecards((prev) =>
        prev.map((sc) =>
          sc.id === id
            ? {
                ...sc,
                ...editForm,
                total_score: (
                  Number(editForm.delivery_score || sc.delivery_score || 0) +
                  Number(editForm.communication_score || sc.communication_score || 0) +
                  Number(editForm.ownership_score || sc.ownership_score || 0) +
                  Number(editForm.initiative_score || sc.initiative_score || 0) +
                  Number(editForm.documentation_score || sc.documentation_score || 0) +
                  Number(editForm.quality_score || sc.quality_score || 0) +
                  Number(editForm.client_handling_score || sc.client_handling_score || 0)
                ),
                ...(updatedData && typeof updatedData === 'object' ? updatedData : {})
              }
            : sc
        )
      );
      fetchScorecards(false);
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'error');
    }
  };

  const handleToggleAccess = async (id) => {
    setTogglingId(id);
    try {
      const res = await api.toggleScorecardAccess(id);
      showToast(res.message || 'Self-evaluation access updated.', 'success');
      // In-place state update so the card never unmounts and viewport scroll position is preserved
      setScorecards((prev) =>
        prev.map((sc) =>
          sc.id === id
            ? {
                ...sc,
                is_self_eval_enabled: res.is_self_eval_enabled !== undefined 
                  ? res.is_self_eval_enabled 
                  : (sc.is_self_eval_enabled ? 0 : 1)
              }
            : sc
        )
      );
      // Silent background sync
      fetchScorecards(false);
    } catch (err) {
      showToast(`Failed to toggle access: ${err.message}`, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const canManage = hasRole('ADMIN', 'PROJECT_MANAGER', 'MANAGER');
  const isAdmin = hasRole('ADMIN');
  const isDeptManager = (user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') && user?.department && user?.department !== 'GENERAL';

  const displayedScorecards = scorecards.filter((sc) => {
    // Super Admins are evaluators and do not have employee performance scorecards
    if (sc.member_role === 'ADMIN' || sc.member_role === 'SUPERADMIN') {
      return false;
    }
    if (isDeptManager && sc.member_department?.toUpperCase() !== user.department?.toUpperCase()) {
      return false;
    }
    if (selectedDeptFilter && sc.member_department?.toUpperCase() !== selectedDeptFilter.toUpperCase()) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = sc.member_name?.toLowerCase().includes(term);
      const matchesRole = sc.member_role?.toLowerCase().includes(term);
      const matchesDept = sc.member_department?.toLowerCase().includes(term);
      if (!matchesName && !matchesRole && !matchesDept) return false;
    }
    return true;
  });

  const renderStars = (score, max) => {
    const scaled = Math.min(5, Math.max(0, Math.round(((Number(score) || 0) / max) * 5)));
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= scaled ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#F3701B]/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Team Performance Scorecards
                </h1>
                {user?.department && (user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                    {user.department} Team
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation management with access control • 7 Responsibility Pillars
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-900 cursor-pointer shadow-2xs"
              >
                <option value="">All Squads</option>
                <option value="BACKEND">Backend</option>
                <option value="MOBILE">Mobile</option>
                <option value="FRONTEND">Frontend</option>
                <option value="QA">QA</option>
              </select>
            )}

            <div className="bg-slate-100 rounded-lg p-1 flex gap-1 border border-slate-200/60">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'cards'
                    ? 'bg-white shadow-2xs text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Cards View"
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
              onClick={() => fetchScorecards(false)}
              disabled={loading || isRefreshing}
              className="px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 bg-white shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search developer or squad..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent placeholder:text-slate-400 text-slate-900 shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-900">{displayedScorecards.length}</span> scorecards
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-[#F3701B] animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading performance scorecards...</p>
          </div>
        </div>
      ) : displayedScorecards.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <CheckSquare className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No scorecards found</p>
            <p className="text-xs text-slate-400 mt-1">No evaluations match your current filter or department.</p>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card-based Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayedScorecards.map((sc) => {
            const isEditing = editingId === sc.id;
            const isLocked = !sc.is_self_eval_enabled;
            const isManagerCard = sc.member_role === 'MANAGER' || sc.member_role === 'PROJECT_MANAGER';
            const scoreOutOf10 = sc.total_score !== null && sc.total_score !== undefined ? (sc.total_score / 10).toFixed(1) : '—';

            return (
              <div
                key={sc.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <div>
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{sc.member_name}</h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                          {sc.member_role?.replace('_', ' ')}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {sc.member_department}
                        </span>
                      </div>
                      {isManagerCard ? (
                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-bold text-emerald-600 tracking-tight">
                                {sc.self_total_score !== null && sc.self_total_score !== undefined ? (sc.self_total_score / 10).toFixed(1) : '—'}
                              </span>
                              <span className="text-sm font-semibold text-slate-400">/10</span>
                            </div>
                            {sc.self_total_score !== null && sc.self_total_score !== undefined ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Self-Evaluation: {sc.self_total_score} / 100
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                Self-Evaluation Pending
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 italic">
                            Managers evaluate themselves • No manager appraisal score
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-2">
                          {/* Overall score as a large number */}
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-[#F3701B] tracking-tight">
                              {scoreOutOf10}
                            </span>
                            <span className="text-sm font-semibold text-slate-400">/10</span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">
                            ({sc.total_score} / 100 pts)
                          </span>

                          {sc.self_total_score !== null && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ml-2">
                              Self: {sc.self_total_score}/100
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right-aligned Lock/Unlock access button / badge */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {isAdmin ? (
                        <button
                          onClick={() => handleToggleAccess(sc.id)}
                          disabled={togglingId === sc.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition shadow-2xs ${
                            sc.is_self_eval_enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                          }`}
                          title="Super Admin: Toggle self-evaluation access"
                        >
                          {sc.is_self_eval_enabled ? (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Access Open</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-rose-500" />
                              <span>Access Locked</span>
                            </>
                          )}
                        </button>
                      ) : (
                        isLocked ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            <Lock className="w-3 h-3 text-rose-500" />
                            <span>Locked by Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            <Unlock className="w-3 h-3 text-emerald-600" />
                            <span>Access Open</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Score breakdown grid */}
                  <div className="p-6 space-y-4">
                    {isManagerCard ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Delivery */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Delivery (Self)</p>
                              {renderStars(sc.self_delivery_score || 0, 20)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {sc.self_delivery_score !== null && sc.self_delivery_score !== undefined ? sc.self_delivery_score : '—'} <span className="text-slate-400 font-normal">/20</span>
                            </span>
                          </div>

                          {/* Communication */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Communication (Self)</p>
                              {renderStars(sc.self_communication_score || 0, 15)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {sc.self_communication_score !== null && sc.self_communication_score !== undefined ? sc.self_communication_score : '—'} <span className="text-slate-400 font-normal">/15</span>
                            </span>
                          </div>

                          {/* Ownership */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Ownership (Self)</p>
                              {renderStars(sc.self_ownership_score || 0, 20)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {sc.self_ownership_score !== null && sc.self_ownership_score !== undefined ? sc.self_ownership_score : '—'} <span className="text-slate-400 font-normal">/20</span>
                            </span>
                          </div>

                          {/* Initiative */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Initiative (Self)</p>
                              {renderStars(sc.self_initiative_score || 0, 10)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {sc.self_initiative_score !== null && sc.self_initiative_score !== undefined ? sc.self_initiative_score : '—'} <span className="text-slate-400 font-normal">/10</span>
                            </span>
                          </div>

                          {/* Documentation */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Documentation (Self)</p>
                              {renderStars(sc.self_documentation_score || 0, 10)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {sc.self_documentation_score !== null && sc.self_documentation_score !== undefined ? sc.self_documentation_score : '—'} <span className="text-slate-400 font-normal">/10</span>
                            </span>
                          </div>

                          {/* Quality */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Quality (Self)</p>
                              {renderStars(sc.self_quality_score || 0, 15)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {sc.self_quality_score !== null && sc.self_quality_score !== undefined ? sc.self_quality_score : '—'} <span className="text-slate-400 font-normal">/15</span>
                            </span>
                          </div>

                          {/* Client Handling */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2 sm:col-span-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Client Handling (Self)</p>
                              {renderStars(sc.self_client_handling_score || 0, 10)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {sc.self_client_handling_score !== null && sc.self_client_handling_score !== undefined ? sc.self_client_handling_score : '—'} <span className="text-slate-400 font-normal">/10</span>
                            </span>
                          </div>
                        </div>

                        {/* Self remarks */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Manager Self-Evaluation Remarks:
                          </p>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs text-slate-600 leading-relaxed min-h-[46px]">
                            {sc.self_remarks || (
                              <span className="text-slate-400 italic">No self-evaluation remarks submitted yet.</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Delivery */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Delivery</p>
                              {renderStars(isEditing ? editForm.delivery_score : sc.delivery_score, 20)}
                            </div>
                            {isEditing && canManage ? (
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={editForm.delivery_score}
                                onChange={(e) => setEditForm({ ...editForm, delivery_score: e.target.value })}
                                className="w-16 px-2 py-1 text-xs text-right font-bold border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sc.delivery_score} <span className="text-slate-400 font-normal">/20</span>
                              </span>
                            )}
                          </div>

                          {/* Communication */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Communication</p>
                              {renderStars(isEditing ? editForm.communication_score : sc.communication_score, 15)}
                            </div>
                            {isEditing && canManage ? (
                              <input
                                type="number"
                                min="0"
                                max="15"
                                step="0.5"
                                value={editForm.communication_score}
                                onChange={(e) => setEditForm({ ...editForm, communication_score: e.target.value })}
                                className="w-16 px-2 py-1 text-xs text-right font-bold border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sc.communication_score} <span className="text-slate-400 font-normal">/15</span>
                              </span>
                            )}
                          </div>

                          {/* Ownership */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Ownership</p>
                              {renderStars(isEditing ? editForm.ownership_score : sc.ownership_score, 20)}
                            </div>
                            {isEditing && canManage ? (
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                value={editForm.ownership_score}
                                onChange={(e) => setEditForm({ ...editForm, ownership_score: e.target.value })}
                                className="w-16 px-2 py-1 text-xs text-right font-bold border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sc.ownership_score} <span className="text-slate-400 font-normal">/20</span>
                              </span>
                            )}
                          </div>

                          {/* Initiative */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Initiative</p>
                              {renderStars(isEditing ? editForm.initiative_score : sc.initiative_score, 10)}
                            </div>
                            {isEditing && canManage ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={editForm.initiative_score}
                                onChange={(e) => setEditForm({ ...editForm, initiative_score: e.target.value })}
                                className="w-16 px-2 py-1 text-xs text-right font-bold border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sc.initiative_score} <span className="text-slate-400 font-normal">/10</span>
                              </span>
                            )}
                          </div>

                          {/* Documentation */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Documentation</p>
                              {renderStars(isEditing ? editForm.documentation_score : sc.documentation_score, 10)}
                            </div>
                            {isEditing && canManage ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={editForm.documentation_score}
                                onChange={(e) => setEditForm({ ...editForm, documentation_score: e.target.value })}
                                className="w-16 px-2 py-1 text-xs text-right font-bold border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sc.documentation_score} <span className="text-slate-400 font-normal">/10</span>
                              </span>
                            )}
                          </div>

                          {/* Quality */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Quality</p>
                              {renderStars(isEditing ? editForm.quality_score : sc.quality_score, 15)}
                            </div>
                            {isEditing && canManage ? (
                              <input
                                type="number"
                                min="0"
                                max="15"
                                step="0.5"
                                value={editForm.quality_score}
                                onChange={(e) => setEditForm({ ...editForm, quality_score: e.target.value })}
                                className="w-16 px-2 py-1 text-xs text-right font-bold border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sc.quality_score} <span className="text-slate-400 font-normal">/15</span>
                              </span>
                            )}
                          </div>

                          {/* Client Handling */}
                          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-2 sm:col-span-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Client Handling</p>
                              {renderStars(isEditing ? editForm.client_handling_score : sc.client_handling_score, 10)}
                            </div>
                            {isEditing && canManage ? (
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={editForm.client_handling_score}
                                onChange={(e) => setEditForm({ ...editForm, client_handling_score: e.target.value })}
                                className="w-16 px-2 py-1 text-xs text-right font-bold border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {sc.client_handling_score} <span className="text-slate-400 font-normal">/10</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Scope of improvement textarea block */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Scope of Improvement:
                          </p>
                          {isEditing && canManage ? (
                            <textarea
                              rows="2"
                              value={editForm.scope_of_improvement}
                              onChange={(e) => setEditForm({ ...editForm, scope_of_improvement: e.target.value })}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-900 placeholder:text-slate-400"
                              placeholder="Note key development areas or guidance for this cycle..."
                            />
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs text-slate-600 leading-relaxed min-h-[46px]">
                              {sc.scope_of_improvement || (
                                <span className="text-slate-400 italic">No improvement directives noted.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit / Save buttons or Manager Self-Eval indicator */}
                <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  {isManagerCard ? (
                    <span className="text-xs text-slate-400 italic">
                      Self-evaluated role • No manager evaluation required
                    </span>
                  ) : canManage && (
                    <div className="flex items-center justify-end gap-2 w-full">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(sc.id)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Evaluation</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(sc)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Scorecard</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Data Table View */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[750px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name & Role</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Self-Eval Access</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery /20</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Comm /15</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Ownership /20</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Init /10</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Doc /10</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality /15</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Client /10</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-[#ED6208] bg-[#F3701B]/10 uppercase tracking-wider">Manager Score</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-emerald-700 bg-emerald-50/40 uppercase tracking-wider">Self Score</th>
                  <th className="px-4 py-3 min-w-[200px] text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Scope of Improvement</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedScorecards.map((sc) => {
                  const isEditing = editingId === sc.id;
                  const isManagerCard = sc.member_role === 'MANAGER' || sc.member_role === 'PROJECT_MANAGER';

                  return (
                    <tr key={sc.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block">{sc.member_name}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span>{sc.member_role?.replace('_', ' ')}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{sc.member_department}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        {isAdmin ? (
                          <button
                            onClick={() => handleToggleAccess(sc.id)}
                            disabled={togglingId === sc.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                              sc.is_self_eval_enabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {sc.is_self_eval_enabled ? (
                              <>
                                <Unlock className="w-3 h-3 text-emerald-600" />
                                <span>Open</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-rose-500" />
                                <span>Locked</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            sc.is_self_eval_enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 border border-rose-200 text-rose-600'
                          }`}>
                            {sc.is_self_eval_enabled ? 'Open' : 'Locked'}
                          </span>
                        )}
                      </td>

                      {/* Delivery */}
                      <td className="px-2 py-3 text-center">
                        {isManagerCard ? (
                          <span className="font-mono text-xs">{sc.self_delivery_score !== null && sc.self_delivery_score !== undefined ? sc.self_delivery_score : '—'}</span>
                        ) : isEditing && canManage ? (
                          <input
                            type="number"
                            max="20"
                            min="0"
                            step="0.5"
                            value={editForm.delivery_score}
                            onChange={(e) => setEditForm({ ...editForm, delivery_score: e.target.value })}
                            className="w-12 text-center border border-slate-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">{sc.delivery_score}</span>
                        )}
                      </td>

                      {/* Communication */}
                      <td className="px-2 py-3 text-center">
                        {isManagerCard ? (
                          <span className="font-mono text-xs">{sc.self_communication_score !== null && sc.self_communication_score !== undefined ? sc.self_communication_score : '—'}</span>
                        ) : isEditing && canManage ? (
                          <input
                            type="number"
                            max="15"
                            min="0"
                            step="0.5"
                            value={editForm.communication_score}
                            onChange={(e) => setEditForm({ ...editForm, communication_score: e.target.value })}
                            className="w-12 text-center border border-slate-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">{sc.communication_score}</span>
                        )}
                      </td>

                      {/* Ownership */}
                      <td className="px-2 py-3 text-center">
                        {isManagerCard ? (
                          <span className="font-mono text-xs">{sc.self_ownership_score !== null && sc.self_ownership_score !== undefined ? sc.self_ownership_score : '—'}</span>
                        ) : isEditing && canManage ? (
                          <input
                            type="number"
                            max="20"
                            min="0"
                            step="0.5"
                            value={editForm.ownership_score}
                            onChange={(e) => setEditForm({ ...editForm, ownership_score: e.target.value })}
                            className="w-12 text-center border border-slate-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">{sc.ownership_score}</span>
                        )}
                      </td>

                      {/* Initiative */}
                      <td className="px-2 py-3 text-center">
                        {isManagerCard ? (
                          <span className="font-mono text-xs">{sc.self_initiative_score !== null && sc.self_initiative_score !== undefined ? sc.self_initiative_score : '—'}</span>
                        ) : isEditing && canManage ? (
                          <input
                            type="number"
                            max="10"
                            min="0"
                            step="0.5"
                            value={editForm.initiative_score}
                            onChange={(e) => setEditForm({ ...editForm, initiative_score: e.target.value })}
                            className="w-12 text-center border border-slate-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">{sc.initiative_score}</span>
                        )}
                      </td>

                      {/* Documentation */}
                      <td className="px-2 py-3 text-center">
                        {isManagerCard ? (
                          <span className="font-mono text-xs">{sc.self_documentation_score !== null && sc.self_documentation_score !== undefined ? sc.self_documentation_score : '—'}</span>
                        ) : isEditing && canManage ? (
                          <input
                            type="number"
                            max="10"
                            min="0"
                            step="0.5"
                            value={editForm.documentation_score}
                            onChange={(e) => setEditForm({ ...editForm, documentation_score: e.target.value })}
                            className="w-12 text-center border border-slate-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">{sc.documentation_score}</span>
                        )}
                      </td>

                      {/* Quality */}
                      <td className="px-2 py-3 text-center">
                        {isManagerCard ? (
                          <span className="font-mono text-xs">{sc.self_quality_score !== null && sc.self_quality_score !== undefined ? sc.self_quality_score : '—'}</span>
                        ) : isEditing && canManage ? (
                          <input
                            type="number"
                            max="15"
                            min="0"
                            step="0.5"
                            value={editForm.quality_score}
                            onChange={(e) => setEditForm({ ...editForm, quality_score: e.target.value })}
                            className="w-12 text-center border border-slate-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">{sc.quality_score}</span>
                        )}
                      </td>

                      {/* Client Handling */}
                      <td className="px-2 py-3 text-center">
                        {isManagerCard ? (
                          <span className="font-mono text-xs">{sc.self_client_handling_score !== null && sc.self_client_handling_score !== undefined ? sc.self_client_handling_score : '—'}</span>
                        ) : isEditing && canManage ? (
                          <input
                            type="number"
                            max="10"
                            min="0"
                            step="0.5"
                            value={editForm.client_handling_score}
                            onChange={(e) => setEditForm({ ...editForm, client_handling_score: e.target.value })}
                            className="w-12 text-center border border-slate-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">{sc.client_handling_score}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center bg-[#F3701B]/5">
                        {isManagerCard ? (
                          <span className="text-slate-400 text-xs italic">Self Only</span>
                        ) : (
                          <span className="font-bold font-mono text-[#ED6208] text-xs">
                            {sc.total_score !== null && sc.total_score !== undefined ? sc.total_score : '—'}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center bg-emerald-50/30">
                        {sc.self_total_score !== null && sc.self_total_score !== undefined ? (
                          <span className="font-bold font-mono text-emerald-700 text-xs">
                            {sc.self_total_score}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isManagerCard ? (
                          <p className="text-slate-600 text-xs max-w-xs leading-relaxed truncate">
                            {sc.self_remarks || <span className="text-slate-400 italic">Self-evaluation role</span>}
                          </p>
                        ) : isEditing && canManage ? (
                          <textarea
                            rows="2"
                            value={editForm.scope_of_improvement}
                            onChange={(e) => setEditForm({ ...editForm, scope_of_improvement: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-[#F3701B]"
                          />
                        ) : (
                          <p className="text-slate-600 text-xs max-w-xs leading-relaxed truncate">
                            {sc.scope_of_improvement || <span className="text-slate-400 italic">None noted</span>}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {isManagerCard ? (
                          <span className="text-slate-400 text-xs italic">Self Only</span>
                        ) : canManage && (
                          isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSave(sc.id)}
                                className="p-1 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white rounded transition shadow-2xs"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(sc)}
                              className="p-1.5 text-slate-500 hover:text-[#F3701B] hover:bg-[#F3701B]/10 rounded-lg transition"
                              title="Edit scores"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )
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
