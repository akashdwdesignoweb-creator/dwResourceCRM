import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Activity, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  ShieldAlert, 
  Check, 
  Database, 
  ExternalLink,
  XCircle,
  X,
  Search,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  Layers,
  Globe
} from 'lucide-react';

export default function DevOpsChecks() {
  const { user, canEditField, hasRole } = useAuth();
  const { showToast } = useToast();
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  const fetchDevOps = () => {
    setLoading(true);
    api.getDevOps()
      .then((data) => setChecks(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevOps();
  }, []);

  const handleStartEdit = (chk) => {
    setEditingId(chk.id);
    setEditForm({
      prod_channel: chk.prod_channel || '',
      stage_channel: chk.stage_channel || '',
      db_backup_url: chk.db_backup_url || '',
      assigned_person: chk.assigned_person || '',
      health_check_status: chk.health_check_status || 'Passed',
      notes: chk.notes || ''
    });
  };

  const handleSave = async (id) => {
    try {
      await api.updateDevOps(id, editForm);
      setEditingId(null);
      showToast('DevOps infrastructure check updated successfully.', 'success');
      fetchDevOps();
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'error');
    }
  };

  const filteredChecks = checks.filter((chk) => {
    if (statusFilter && chk.health_check_status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesAccount = chk.account?.toLowerCase().includes(term);
      const matchesProject = chk.project_name?.toLowerCase().includes(term);
      const matchesDevOps = chk.assigned_person?.toLowerCase().includes(term);
      const matchesLead = chk.project_lead?.toLowerCase().includes(term);
      const matchesNotes = chk.notes?.toLowerCase().includes(term);
      if (!matchesAccount && !matchesProject && !matchesDevOps && !matchesLead && !matchesNotes) return false;
    }
    return true;
  });

  const passedCount = checks.filter((c) => c.health_check_status === 'Passed').length;
  const warningCount = checks.filter((c) => c.health_check_status === 'Warning').length;
  const criticalCount = checks.filter((c) => c.health_check_status === 'Critical').length;

  const getStatusDetails = (status) => {
    switch (status) {
      case 'Critical':
        return {
          border: 'border-l-4 border-l-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
          label: 'Critical'
        };
      case 'Warning':
        return {
          border: 'border-l-4 border-l-amber-500',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
          label: 'Warning'
        };
      case 'Passed':
      default:
        return {
          border: 'border-l-4 border-l-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
          label: 'Passed'
        };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#F3701B]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  DevOps Health & Infrastructure
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                  Managed by DevOps & Leads
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Production & staging deployment channels, automated backup URLs, and cloud infrastructure audit checks
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
                title="Checklist Cards View"
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
                title="Data Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={fetchDevOps}
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
        {/* Card 1: Total Monitored Projects */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monitored Systems</p>
            <div className="w-9 h-9 bg-[#F3701B]/10 rounded-lg flex items-center justify-center">
              <Server className="w-4.5 h-4.5 text-[#ED6208]" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{checks.length}</p>
            <p className="text-xs text-slate-500 mt-1">Active deployment channels</p>
          </div>
        </div>

        {/* Card 2: Healthy / Passed */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Passed Health Check</p>
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-emerald-600 tracking-tight">{passedCount}</p>
            <p className="text-xs text-slate-500 mt-1">Passing all cloud benchmarks</p>
          </div>
        </div>

        {/* Card 3: Warnings */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warning Status</p>
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-amber-600 tracking-tight">{warningCount}</p>
            <p className="text-xs text-slate-500 mt-1">Requires maintenance review</p>
          </div>
        </div>

        {/* Card 4: Critical */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Alerts</p>
            <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold text-rose-600 tracking-tight">{criticalCount}</p>
            <p className="text-xs text-slate-500 mt-1">Action needed immediately</p>
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
              placeholder="Search project or engineer..."
              className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent w-64 placeholder:text-slate-400 text-slate-900 shadow-2xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-900 cursor-pointer shadow-2xs"
          >
            <option value="">All Health Statuses</option>
            <option value="Passed">Passed</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-900">{filteredChecks.length}</span> systems
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-[#F3701B] animate-spin" />
            <p className="text-sm font-medium text-slate-600">Loading DevOps health records...</p>
          </div>
        </div>
      ) : filteredChecks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <Activity className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No DevOps records found</p>
            <p className="text-xs text-slate-400 mt-1">No infrastructure checks match your filter criteria.</p>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Checklist cards with status indicators (emerald checkmark, rose X, amber warning) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredChecks.map((chk) => {
            const isEditing = editingId === chk.id;
            const currentStatus = isEditing ? editForm.health_check_status : chk.health_check_status;
            const statusMeta = getStatusDetails(currentStatus);

            return (
              <div
                key={chk.id}
                className={`bg-white rounded-xl border border-slate-200/80 shadow-sm ${statusMeta.border} overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md`}
              >
                <div>
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{chk.account}</span>
                        <span className="text-slate-300">•</span>
                        <h2 className="text-base font-bold text-slate-900">{chk.project_name}</h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing && canEditField('devops', 'health_check_status') ? (
                        <select
                          value={editForm.health_check_status}
                          onChange={(e) => setEditForm({ ...editForm, health_check_status: e.target.value })}
                          className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] cursor-pointer shadow-2xs"
                        >
                          <option value="Passed">Passed</option>
                          <option value="Warning">Warning</option>
                          <option value="Critical">Critical</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {statusMeta.icon}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badge}`}>
                            {chk.health_check_status}
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(chk)}
                          className="p-1.5 text-slate-400 hover:text-[#F3701B] hover:bg-[#F3701B]/10 rounded-lg transition"
                          title="Edit DevOps Record"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Deployment Channels Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Prod Deploy Channel */}
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Production Channel
                        </span>
                        {isEditing && canEditField('devops', 'prod_channel') ? (
                          <input
                            type="text"
                            value={editForm.prod_channel}
                            onChange={(e) => setEditForm({ ...editForm, prod_channel: e.target.value })}
                            className="w-full text-xs font-mono font-medium border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                          />
                        ) : (
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                            {chk.prod_channel || 'None set'}
                          </span>
                        )}
                      </div>

                      {/* Staging Deploy Channel */}
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Staging Channel
                        </span>
                        {isEditing && canEditField('devops', 'stage_channel') ? (
                          <input
                            type="text"
                            value={editForm.stage_channel}
                            onChange={(e) => setEditForm({ ...editForm, stage_channel: e.target.value })}
                            className="w-full text-xs font-mono font-medium border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                          />
                        ) : (
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                            {chk.stage_channel || 'None set'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Database Backup URL */}
                    <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Database Backup URL
                      </span>
                      {isEditing && canEditField('devops', 'db_backup_url') ? (
                        <input
                          type="url"
                          placeholder="https://backup-bucket.s3..."
                          value={editForm.db_backup_url}
                          onChange={(e) => setEditForm({ ...editForm, db_backup_url: e.target.value })}
                          className="w-full text-xs font-mono border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                        />
                      ) : chk.db_backup_url ? (
                        <a
                          href={chk.db_backup_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-[#ED6208] bg-[#F3701B]/10 hover:bg-[#F3701B]/20 px-2.5 py-1 rounded-md border border-[#F3701B]/20 transition-colors max-w-full truncate"
                          title={chk.db_backup_url}
                        >
                          <Database className="w-3.5 h-3.5 text-[#ED6208] flex-shrink-0" />
                          <span className="truncate">{chk.db_backup_url.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 text-[#F3701B] flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No automated backup URL configured</span>
                      )}
                    </div>

                    {/* Team Personnel */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          DevOps Engineer
                        </span>
                        <p className="text-xs font-medium text-slate-800 mt-0.5">
                          {chk.assigned_person || 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Project Lead
                        </span>
                        <p className="text-xs font-medium text-slate-800 mt-0.5">
                          {chk.project_lead || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    {/* Audit Notes & Details */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Audit Notes & Health Details
                      </span>
                      {isEditing && canEditField('devops', 'notes') ? (
                        <textarea
                          rows="2"
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B]"
                          placeholder="Infrastructure health, backup frequency notes..."
                        />
                      ) : (
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[42px]">
                          {chk.notes || <span className="text-slate-400 italic">No audit notes recorded.</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer (Save / Cancel if editing) */}
                {isEditing && (
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(chk.id)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prod Channel</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staging Channel</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Backup</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DevOps Eng</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Lead</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Status</th>
                  <th className="px-4 py-3 min-w-[200px] text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Notes</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChecks.map((chk) => {
                  const isEditing = editingId === chk.id;
                  const statusMeta = getStatusDetails(chk.health_check_status);

                  return (
                    <tr key={chk.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{chk.account}</td>
                      <td className="px-3 py-3 font-semibold text-[#ED6208]">{chk.project_name}</td>
                      
                      <td className="px-3 py-3">
                        {isEditing && canEditField('devops', 'prod_channel') ? (
                          <input
                            type="text"
                            value={editForm.prod_channel}
                            onChange={(e) => setEditForm({ ...editForm, prod_channel: e.target.value })}
                            className="text-xs border border-slate-200 rounded p-1 bg-white font-mono w-28"
                          />
                        ) : (
                          <span className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {chk.prod_channel}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing && canEditField('devops', 'stage_channel') ? (
                          <input
                            type="text"
                            value={editForm.stage_channel}
                            onChange={(e) => setEditForm({ ...editForm, stage_channel: e.target.value })}
                            className="text-xs border border-slate-200 rounded p-1 bg-white font-mono w-28"
                          />
                        ) : (
                          <span className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {chk.stage_channel}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {isEditing && canEditField('devops', 'db_backup_url') ? (
                          <input
                            type="url"
                            value={editForm.db_backup_url}
                            onChange={(e) => setEditForm({ ...editForm, db_backup_url: e.target.value })}
                            placeholder="https://backups.s3..."
                            className="text-xs border border-slate-200 rounded p-1 bg-white font-mono w-44"
                          />
                        ) : chk.db_backup_url ? (
                          <a
                            href={chk.db_backup_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#ED6208] bg-[#F3701B]/10 hover:bg-[#F3701B]/20 px-2 py-0.5 rounded border border-[#F3701B]/20 transition max-w-[170px] truncate"
                          >
                            <Database className="w-3 h-3 text-[#ED6208] flex-shrink-0" />
                            <span className="truncate">{chk.db_backup_url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-[#F3701B] flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No backup set</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-slate-700 font-medium">{chk.assigned_person}</td>
                      <td className="px-3 py-3 text-slate-700">{chk.project_lead}</td>

                      <td className="px-3 py-3 text-center">
                        {isEditing && canEditField('devops', 'health_check_status') ? (
                          <select
                            value={editForm.health_check_status}
                            onChange={(e) => setEditForm({ ...editForm, health_check_status: e.target.value })}
                            className="text-xs border border-slate-200 rounded p-1 bg-white"
                          >
                            <option value="Passed">Passed</option>
                            <option value="Warning">Warning</option>
                            <option value="Critical">Critical</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badge}`}>
                            {chk.health_check_status}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing && canEditField('devops', 'notes') ? (
                          <textarea
                            rows="2"
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                          />
                        ) : (
                          <p className="text-slate-600 text-xs leading-relaxed max-w-sm truncate">
                            {chk.notes || <span className="text-slate-400 italic">No notes</span>}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSave(chk.id)}
                              className="p-1.5 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white rounded-lg transition shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(chk)}
                            className="p-1.5 text-slate-500 hover:text-[#F3701B] hover:bg-[#F3701B]/10 rounded-lg transition"
                            title="Edit DevOps status"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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
