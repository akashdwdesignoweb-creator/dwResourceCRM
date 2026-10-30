import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Award, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Send, 
  AlertCircle, 
  Sparkles, 
  TrendingUp,
  FileSpreadsheet,
  Info,
  Star,
  RefreshCw
} from 'lucide-react';

export default function DeveloperScorecard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isManagerUser = user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER';
  const [scorecards, setScorecards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScorecard, setSelectedScorecard] = useState(null);

  const [selfScores, setSelfScores] = useState({
    self_delivery_score: '',
    self_communication_score: '',
    self_ownership_score: '',
    self_initiative_score: '',
    self_documentation_score: '',
    self_quality_score: '',
    self_client_handling_score: '',
    self_remarks: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchScorecards = () => {
    setLoading(true);
    api.getMyScorecards()
      .then((data) => {
        setScorecards(data);
        if (data && data.length > 0) {
          const current = (selectedScorecard && data.find((s) => s.id === selectedScorecard.id)) || data[0];
          setSelectedScorecard(current);
          setSelfScores({
            self_delivery_score: current.self_delivery_score ?? '',
            self_communication_score: current.self_communication_score ?? '',
            self_ownership_score: current.self_ownership_score ?? '',
            self_initiative_score: current.self_initiative_score ?? '',
            self_documentation_score: current.self_documentation_score ?? '',
            self_quality_score: current.self_quality_score ?? '',
            self_client_handling_score: current.self_client_handling_score ?? '',
            self_remarks: current.self_remarks || ''
          });
        }
      })
      .catch((err) => console.error('Failed to load scorecards:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchScorecards();
  }, []);

  const handleSelectScorecard = (sc) => {
    setSelectedScorecard(sc);
    setSelfScores({
      self_delivery_score: sc.self_delivery_score ?? '',
      self_communication_score: sc.self_communication_score ?? '',
      self_ownership_score: sc.self_ownership_score ?? '',
      self_initiative_score: sc.self_initiative_score ?? '',
      self_documentation_score: sc.self_documentation_score ?? '',
      self_quality_score: sc.self_quality_score ?? '',
      self_client_handling_score: sc.self_client_handling_score ?? '',
      self_remarks: sc.self_remarks || ''
    });
  };

  const calculateSelfTotal = () => {
    const d = Number(selfScores.self_delivery_score || 0);
    const c = Number(selfScores.self_communication_score || 0);
    const o = Number(selfScores.self_ownership_score || 0);
    const i = Number(selfScores.self_initiative_score || 0);
    const doc = Number(selfScores.self_documentation_score || 0);
    const q = Number(selfScores.self_quality_score || 0);
    const ch = Number(selfScores.self_client_handling_score || 0);
    return d + c + o + i + doc + q + ch;
  };

  const handleSubmitSelfEval = async (e) => {
    e.preventDefault();
    if (!selectedScorecard) return;
    setSubmitting(true);
    try {
      await api.submitSelfScorecard(selectedScorecard.id, selfScores);
      setSubmitSuccess(true);
      showToast('Self-evaluation scorecard submitted successfully.', 'success');
      setTimeout(() => setSubmitSuccess(false), 3000);
      fetchScorecards();
    } catch (err) {
      showToast(`Submission failed: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreGrade = (score) => {
    if (score >= 90) return { grade: 'A+', label: 'Outstanding Performer', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 80) return { grade: 'A', label: 'Strong / High Performer', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    if (score >= 70) return { grade: 'B', label: 'Meets Expectations', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { grade: 'C', label: 'Needs Improvement', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const isAccessOpen = selectedScorecard?.is_self_eval_enabled;

  const renderStars = (score, max) => {
    const scaled = Math.min(5, Math.max(0, Math.round(((Number(score) || 0) / max) * 5)));
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= scaled ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
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
              <Star className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  My Performance Scorecard
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                  {user?.department ? `${user.department} Team` : 'Designoweb'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Self-evaluation appraisal & monthly performance pillars • 7 Core Metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scorecards.length > 1 && (
              <select
                value={selectedScorecard?.id || ''}
                onChange={(e) => {
                  const sc = scorecards.find((s) => s.id === Number(e.target.value));
                  if (sc) handleSelectScorecard(sc);
                }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-900 cursor-pointer shadow-2xs"
              >
                {scorecards.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.month} ({sc.total_score} pts)
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={fetchScorecards}
              disabled={loading}
              className="px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 bg-white shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-[#F3701B] animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading your responsibility scorecard...</p>
          </div>
        </div>
      ) : user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-[#F3701B]/10 rounded-xl flex items-center justify-center mb-3">
              <Award className="w-6 h-6 text-[#ED6208]" />
            </div>
            <p className="text-base font-bold text-slate-800">Super Admin Evaluator Mode</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Super Admins govern company operations and evaluate team members. Individual employee performance scorecards are not generated for Super Admins.
            </p>
          </div>
        </div>
      ) : !selectedScorecard ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <Award className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Scorecard Found</p>
            <p className="text-xs text-slate-400 mt-1">Your manager has not yet published an appraisal scorecard for this cycle.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Locked state banner: Designoweb orange info box when scorecard is locked */}
          {!isAccessOpen ? (
            <div className="p-4 rounded-xl border border-[#F3701B]/25 bg-[#F3701B]/5 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F3701B]/15 flex items-center justify-center text-[#ED6208] flex-shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#ED6208]">
                    Self-Evaluation Access Locked
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedScorecard.self_submitted_at
                      ? `Your self-evaluation has been submitted and automatically locked. Contact Super Admin if revisions are required.`
                      : 'Self-evaluation is currently locked by the Super Admin. You can review your appraisal scores below. Contact Super Admin to unlock your evaluation window.'}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 self-start sm:self-auto">
                <Lock className="w-3 h-3 text-rose-500" />
                <span>Locked</span>
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Self-Evaluation Window Open
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Super Admin has unlocked self-evaluation for this cycle. Rate yourself on the 7 core pillars below and submit your review.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 self-start sm:self-auto">
                ● Active Submission
              </span>
            </div>
          )}

          {/* Scores Overview: Manager Total vs Self Total */}
          {isManagerUser ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Self Score Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    My Self-Evaluation Total
                  </p>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-4xl font-bold text-[#F3701B] tracking-tight">
                      {selectedScorecard.self_total_score !== null && selectedScorecard.self_total_score !== undefined
                        ? selectedScorecard.self_total_score
                        : calculateSelfTotal() || '—'}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="mt-3">
                    {selectedScorecard.self_submitted_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Submitted on {new Date(selectedScorecard.self_submitted_at).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {isAccessOpen ? 'Pending Your Submission' : 'Submission Window Closed'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                  Evaluation Cycle: <strong className="text-slate-800">{selectedScorecard.month}</strong>
                </div>
              </div>

              {/* Leadership Role Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Leadership Appraisal Model
                  </p>
                  <div className="mt-3 space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                      <Award className="w-3.5 h-3.5" />
                      <span>Self-Evaluation Only</span>
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed mt-2">
                      Department Managers do not receive an external manager appraisal score. You score your own performance quarterly.
                    </p>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                  Department: <strong className="text-slate-800">{user?.department || 'Engineering'}</strong>
                </div>
              </div>

              {/* Developer Evaluation Authority */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Team Scorecard Responsibilities
                  </p>
                  <div className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/60 min-h-[70px]">
                    As a Manager, you hold evaluation authority to score the developers reporting in your department on the <strong>Team Scorecards</strong> panel.
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
                  Switch to "Team Scorecards" to evaluate developers.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Manager Score Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Manager Appraisal Score
                  </p>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-4xl font-bold text-slate-900 tracking-tight">
                      {selectedScorecard.total_score}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="mt-3">
                    {(() => {
                      const grade = getScoreGrade(selectedScorecard.total_score);
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${grade.color}`}>
                          <span>Grade {grade.grade}:</span>
                          <span>{grade.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                  Evaluator: <strong className="text-slate-800">{selectedScorecard.evaluator_name || 'Designoweb Leadership'}</strong>
                </div>
              </div>

              {/* Self Score Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    My Self-Evaluation Total
                  </p>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-4xl font-bold text-[#F3701B] tracking-tight">
                      {selectedScorecard.self_total_score !== null && selectedScorecard.self_total_score !== undefined
                        ? selectedScorecard.self_total_score
                        : calculateSelfTotal() || '—'}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="mt-3">
                    {selectedScorecard.self_submitted_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Submitted on {new Date(selectedScorecard.self_submitted_at).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {isAccessOpen ? 'Pending Your Submission' : 'Submission Window Closed'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                  Evaluation Cycle: <strong className="text-slate-800">{selectedScorecard.month}</strong>
                </div>
              </div>

              {/* Manager Feedback */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Manager Feedback & Scope
                  </p>
                  <div className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/60 min-h-[70px]">
                    {selectedScorecard.scope_of_improvement || (
                      <span className="text-slate-400 italic">
                        No specific improvement directives recorded by your manager for this cycle.
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
                  Review this feedback when planning next month's objectives.
                </div>
              </div>
            </div>
          )}

          {/* Interactive Self-Evaluation Form */}
          <form onSubmit={handleSubmitSelfEval} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F3701B]" />
                  <span>The 7 DW Responsibility Pillars</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isManagerUser
                    ? 'Self-evaluation ratings across the 7 DW Responsibility Pillars.'
                    : 'Side-by-side comparison of manager appraisal scores and your self-evaluation ratings.'}
                </p>
              </div>

              {submitSuccess && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Self-Evaluation Submitted Successfully!</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 1. Delivery (20) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">1. Delivery (Max 20)</span>
                  {isManagerUser ? (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: <strong className="text-slate-800">20</strong> pts
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mgr: <strong className="text-slate-800">{selectedScorecard.delivery_score}</strong>/20
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Sprint deadlines, delivery velocity, and bug turnaround time.
                </p>
                {renderStars(selfScores.self_delivery_score || 0, 20)}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    disabled={!isAccessOpen}
                    value={selfScores.self_delivery_score || 0}
                    onChange={(e) => setSelfScores({ ...selfScores, self_delivery_score: e.target.value })}
                    className="flex-1 accent-[#F3701B] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    disabled={!isAccessOpen}
                    required={isAccessOpen}
                    placeholder="0-20"
                    value={selfScores.self_delivery_score}
                    onChange={(e) => setSelfScores({ ...selfScores, self_delivery_score: e.target.value })}
                    className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 2. Communication (15) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">2. Communication (Max 15)</span>
                  {isManagerUser ? (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: <strong className="text-slate-800">15</strong> pts
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mgr: <strong className="text-slate-800">{selectedScorecard.communication_score}</strong>/15
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Standup attendance, proactive Slack updates, client and PM clarity.
                </p>
                {renderStars(selfScores.self_communication_score || 0, 15)}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    disabled={!isAccessOpen}
                    value={selfScores.self_communication_score || 0}
                    onChange={(e) => setSelfScores({ ...selfScores, self_communication_score: e.target.value })}
                    className="flex-1 accent-[#F3701B] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    disabled={!isAccessOpen}
                    required={isAccessOpen}
                    placeholder="0-15"
                    value={selfScores.self_communication_score}
                    onChange={(e) => setSelfScores({ ...selfScores, self_communication_score: e.target.value })}
                    className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 3. Ownership (20) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">3. Ownership (Max 20)</span>
                  {isManagerUser ? (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: <strong className="text-slate-800">20</strong> pts
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mgr: <strong className="text-slate-800">{selectedScorecard.ownership_score}</strong>/20
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  End-to-end task responsibility, unblocking oneself, accountability.
                </p>
                {renderStars(selfScores.self_ownership_score || 0, 20)}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    disabled={!isAccessOpen}
                    value={selfScores.self_ownership_score || 0}
                    onChange={(e) => setSelfScores({ ...selfScores, self_ownership_score: e.target.value })}
                    className="flex-1 accent-[#F3701B] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    disabled={!isAccessOpen}
                    required={isAccessOpen}
                    placeholder="0-20"
                    value={selfScores.self_ownership_score}
                    onChange={(e) => setSelfScores({ ...selfScores, self_ownership_score: e.target.value })}
                    className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 4. Initiative (10) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">4. Initiative (Max 10)</span>
                  {isManagerUser ? (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: <strong className="text-slate-800">10</strong> pts
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mgr: <strong className="text-slate-800">{selectedScorecard.initiative_score}</strong>/10
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Proactive proposals, learning new tech, going beyond minimum scope.
                </p>
                {renderStars(selfScores.self_initiative_score || 0, 10)}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    disabled={!isAccessOpen}
                    value={selfScores.self_initiative_score || 0}
                    onChange={(e) => setSelfScores({ ...selfScores, self_initiative_score: e.target.value })}
                    className="flex-1 accent-[#F3701B] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    disabled={!isAccessOpen}
                    required={isAccessOpen}
                    placeholder="0-10"
                    value={selfScores.self_initiative_score}
                    onChange={(e) => setSelfScores({ ...selfScores, self_initiative_score: e.target.value })}
                    className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 5. Documentation (10) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">5. Documentation (Max 10)</span>
                  {isManagerUser ? (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: <strong className="text-slate-800">10</strong> pts
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mgr: <strong className="text-slate-800">{selectedScorecard.documentation_score}</strong>/10
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  PR descriptions, API docs, code comments, and handover clarity.
                </p>
                {renderStars(selfScores.self_documentation_score || 0, 10)}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    disabled={!isAccessOpen}
                    value={selfScores.self_documentation_score || 0}
                    onChange={(e) => setSelfScores({ ...selfScores, self_documentation_score: e.target.value })}
                    className="flex-1 accent-[#F3701B] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    disabled={!isAccessOpen}
                    required={isAccessOpen}
                    placeholder="0-10"
                    value={selfScores.self_documentation_score}
                    onChange={(e) => setSelfScores({ ...selfScores, self_documentation_score: e.target.value })}
                    className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 6. Quality (15) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">6. Quality (Max 15)</span>
                  {isManagerUser ? (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: <strong className="text-slate-800">15</strong> pts
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mgr: <strong className="text-slate-800">{selectedScorecard.quality_score}</strong>/15
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Code cleanliness, low regression rate, unit tests, adherence to specs.
                </p>
                {renderStars(selfScores.self_quality_score || 0, 15)}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    disabled={!isAccessOpen}
                    value={selfScores.self_quality_score || 0}
                    onChange={(e) => setSelfScores({ ...selfScores, self_quality_score: e.target.value })}
                    className="flex-1 accent-[#F3701B] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    disabled={!isAccessOpen}
                    required={isAccessOpen}
                    placeholder="0-15"
                    value={selfScores.self_quality_score}
                    onChange={(e) => setSelfScores({ ...selfScores, self_quality_score: e.target.value })}
                    className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* 7. Client Handling (10) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">7. Client Handling (Max 10)</span>
                  {isManagerUser ? (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Max: <strong className="text-slate-800">10</strong> pts
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mgr: <strong className="text-slate-800">{selectedScorecard.client_handling_score}</strong>/10
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Client demo conduct, meeting clarity, handling feedback professionally.
                </p>
                {renderStars(selfScores.self_client_handling_score || 0, 10)}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    disabled={!isAccessOpen}
                    value={selfScores.self_client_handling_score || 0}
                    onChange={(e) => setSelfScores({ ...selfScores, self_client_handling_score: e.target.value })}
                    className="flex-1 accent-[#F3701B] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    disabled={!isAccessOpen}
                    required={isAccessOpen}
                    placeholder="0-10"
                    value={selfScores.self_client_handling_score}
                    onChange={(e) => setSelfScores({ ...selfScores, self_client_handling_score: e.target.value })}
                    className="w-16 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

            </div>

            {/* Self Remarks / Achievements Textarea */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                My Highlights, Wins & Self-Appraisal Remarks:
              </label>
              <textarea
                rows="3"
                disabled={!isAccessOpen}
                placeholder={isAccessOpen ? "Describe your key wins, features delivered, or technical milestones achieved this month..." : "Self-evaluation is locked."}
                value={selfScores.self_remarks}
                onChange={(e) => setSelfScores({ ...selfScores, self_remarks: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-100 gap-3">
              <div className="text-xs text-slate-500">
                Calculated Self Total: <strong className="text-[#F3701B] text-base font-bold ml-1">{calculateSelfTotal()} / 100</strong>
              </div>

              {isAccessOpen ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting & Locking...' : 'Submit Self-Evaluation'}</span>
                </button>
              ) : (
                <div className="text-xs text-slate-600 font-medium inline-flex items-center gap-1.5 bg-slate-100 px-3.5 py-2 rounded-lg border border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {selectedScorecard.self_submitted_at
                      ? 'Scorecard submitted & automatically locked'
                      : 'Self-evaluation locked by Super Admin'}
                  </span>
                </div>
              )}
            </div>
          </form>
        </>
      )}

    </div>
  );
}
