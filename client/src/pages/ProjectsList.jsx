import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCSV } from '../utils/exportCsv';
import { 
  FolderKanban, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  ExternalLink, 
  Users, 
  ShieldAlert,
  Server, 
  FileSpreadsheet, 
  Database, 
  Download,
  Search,
  X,
  User,
  ArrowRight,
  Trash2,
  RotateCcw,
  CheckCircle
} from 'lucide-react';

export default function ProjectsList() {
  const { user, canEditField, hasRole } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Status tab: 'ACTIVE' or 'COMPLETED'
  const [statusTab, setStatusTab] = useState('ACTIVE');
  const [confirmCompleteProject, setConfirmCompleteProject] = useState(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search and QA filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [qaFilter, setQaFilter] = useState('ALL'); // 'ALL' | 'MY_QA' | 'MISSING_QA'

  // Dedicated QA sheet modal states
  const [qaModalProject, setQaModalProject] = useState(null);
  const [qaSheetUrlInput, setQaSheetUrlInput] = useState('');
  const [savingQaModal, setSavingQaModal] = useState(false);

  const handleOpenQaModal = (proj) => {
    setQaModalProject(proj);
    setQaSheetUrlInput(proj.qa_sheet_url || '');
  };

  const handleSaveQaModal = async (e) => {
    e.preventDefault();
    if (!qaModalProject) return;
    setSavingQaModal(true);
    try {
      await api.updateProject(qaModalProject.id, { qa_sheet_url: qaSheetUrlInput.trim() });
      showToast(`QA Test Sheet updated for "${qaModalProject.name}".`, 'success');
      setProjects((prev) =>
        prev.map((p) =>
          p.id === qaModalProject.id ? { ...p, qa_sheet_url: qaSheetUrlInput.trim() } : p
        )
      );
      setQaModalProject(null);
      fetchProjects(false);
    } catch (err) {
      showToast(`Failed to update QA sheet: ${err.message}`, 'error');
    } finally {
      setSavingQaModal(false);
    }
  };

  const handleCompleteProject = async (proj) => {
    setActionLoading(true);
    try {
      await api.updateProject(proj.id, { status: 'Completed' });
      showToast(`Project "${proj.name}" marked as Completed. All resources have been freed!`, 'success');
      setConfirmCompleteProject(null);
      fetchProjects(false);
    } catch (err) {
      showToast(`Failed to complete project: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenProject = async (proj) => {
    setActionLoading(true);
    try {
      await api.updateProject(proj.id, { status: 'Active' });
      showToast(`Project "${proj.name}" returned to Active Portfolio.`, 'success');
      fetchProjects(false);
    } catch (err) {
      showToast(`Failed to reopen project: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async (proj) => {
    setActionLoading(true);
    try {
      await api.deleteProject(proj.id);
      showToast(`Project "${proj.name}" permanently deleted.`, 'success');
      setConfirmDeleteProject(null);
      fetchProjects(false);
    } catch (err) {
      showToast(`Failed to delete project: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const [createForm, setCreateForm] = useState({
    name: '',
    account: '',
    project_manager_id: '',
    tech_lead_id: '',
    active_qa_id: '',
    stage: 'Development & Integration',
    weekly_risk: 'Low',
    weekly_blockers: '',
    qa_sheet_url: '',
    production_deployment_channel: '#prod-deploy',
    staging_deployment_channel: '#stage-deploy',
    database_backup_url: ''
  });

  const fetchProjects = (showLoading = false) => {
    if (showLoading) setLoading(true);
    return Promise.all([
      api.getProjects(), 
      api.getUsers(), 
      api.getAllocations().catch(() => [])
    ])
      .then(([projs, usrs, allocs]) => {
        const enhancedProjs = (projs || []).map((p) => {
          if (p.assigned_members && p.assigned_members.length > 0) return p;
          const projAllocs = (allocs || []).filter((a) => a.project_id === p.id);
          const membersMap = new Map();
          projAllocs.forEach((a) => {
            const uid = a.user_id;
            if (uid && !membersMap.has(uid)) {
              membersMap.set(uid, {
                id: uid,
                name: a.resource_name || a.name || 'Team Member',
                department: a.resource_department || a.department || '',
                role: a.resource_role || a.role || ''
              });
            }
          });
          const assigned_members = Array.from(membersMap.values());
          return {
            ...p,
            assigned_members: assigned_members.length > 0 ? assigned_members : (p.assigned_members || [])
          };
        });
        setProjects(enhancedProjs);
        setUsersList(usrs);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  };

  useEffect(() => {
    fetchProjects(true);
  }, []);

  const handleStartEdit = (proj) => {
    setEditingProject(proj);
    setEditForm({
      name: proj.name,
      account: proj.account,
      project_manager_id: proj.project_manager_id || '',
      tech_lead_id: proj.tech_lead_id || '',
      active_qa_id: proj.active_qa_id || '',
      stage: proj.stage,
      weekly_risk: proj.weekly_risk,
      weekly_blockers: proj.weekly_blockers || '',
      qa_sheet_url: proj.qa_sheet_url || '',
      production_deployment_channel: proj.production_deployment_channel || '',
      staging_deployment_channel: proj.staging_deployment_channel || '',
      database_backup_url: proj.database_backup_url || '',
      status: proj.status
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updateProject(editingProject.id, editForm);
      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? { ...p, ...editForm } : p))
      );
      setEditingProject(null);
      showToast(`Updated project "${editForm.name}" successfully.`, 'success');
      fetchProjects(false);
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name) {
      showToast('Project name is required.', 'warning');
      return;
    }
    try {
      await api.createProject(createForm);
      showToast(`Project "${createForm.name}" created successfully.`, 'success');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        account: '',
        project_manager_id: '',
        tech_lead_id: '',
        active_qa_id: '',
        stage: 'Development & Integration',
        weekly_risk: 'Low',
        weekly_blockers: '',
        qa_sheet_url: '',
        production_deployment_channel: '#prod-deploy',
        staging_deployment_channel: '#stage-deploy',
        database_backup_url: ''
      });
      fetchProjects(false);
    } catch (err) {
      showToast(`Create failed: ${err.message}`, 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      { label: 'Project Name', accessor: 'name' },
      { label: 'Client / Account', accessor: 'account' },
      { label: 'Stage', accessor: 'stage' },
      { label: 'Weekly Risk', accessor: 'weekly_risk' },
      { label: 'Project Manager', accessor: (p) => p.pm_name || 'Unassigned' },
      { label: 'Tech Lead', accessor: (p) => p.tl_name || 'Unassigned' },
      { label: 'Active QA', accessor: (p) => p.qa_name || 'Unassigned' },
      { label: 'Assigned Team Members', accessor: 'assigned_members_count' },
      { label: 'Production Channel', accessor: 'production_deployment_channel' },
      { label: 'Staging Channel', accessor: 'staging_deployment_channel' },
      { label: 'Database Backup URL', accessor: 'database_backup_url' },
      { label: 'Weekly Blockers', accessor: (p) => p.weekly_blockers || 'None' }
    ];
    exportToCSV(`DW_Projects_Directory_${new Date().toISOString().slice(0, 10)}`, headers, projects);
    showToast(`Exported ${projects.length} projects to CSV.`, 'success');
  };

  const pms = usersList.filter((u) => ['MANAGER', 'PROJECT_MANAGER', 'ADMIN'].includes(u.role));
  const tls = usersList.filter((u) => ['DEVELOPER', 'MANAGER', 'TECH_LEAD', 'ADMIN'].includes(u.role));
  const qas = usersList.filter((u) => u.role === 'QA' || u.role === 'DEVELOPER');

  const isDevOpsUser = user?.role === 'DEVOPS' || user?.secondary_role === 'DEVOPS' || user?.email?.includes('deepanshu');
  const isQaUser = user?.role === 'QA' || user?.secondary_role === 'QA';

  const activeProjects = projects.filter((p) => p.status !== 'Completed');
  const completedProjects = projects.filter((p) => p.status === 'Completed');
  const currentTabProjects = statusTab === 'ACTIVE' ? activeProjects : completedProjects;

  const myQaCount = currentTabProjects.filter((p) => p.active_qa_id === user?.id || p.qa_name === user?.name).length;
  const missingQaCount = currentTabProjects.filter((p) => !p.qa_sheet_url || p.qa_sheet_url.trim() === '').length;

  const displayedProjects = currentTabProjects.filter((p) => {
    if (qaFilter === 'MY_QA') {
      const isMyQa = p.active_qa_id === user?.id || p.qa_name === user?.name;
      if (!isMyQa) return false;
    }
    if (qaFilter === 'MISSING_QA') {
      const isMissing = !p.qa_sheet_url || p.qa_sheet_url.trim() === '';
      if (!isMissing) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const nameMatch = p.name?.toLowerCase().includes(q);
      const accountMatch = p.account?.toLowerCase().includes(q);
      const pmMatch = p.pm_name?.toLowerCase().includes(q);
      const tlMatch = p.tl_name?.toLowerCase().includes(q);
      const qaMatch = p.qa_name?.toLowerCase().includes(q);
      const stageMatch = p.stage?.toLowerCase().includes(q);
      return nameMatch || accountMatch || pmMatch || tlMatch || qaMatch || stageMatch;
    }
    return true;
  });

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#F3701B]/25">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Project Portfolio</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeProjects.length} active projects • {completedProjects.length} completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download Projects Directory as CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {hasRole('ADMIN', 'PROJECT_MANAGER') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#ED6208] hover:from-[#ED6208] hover:to-[#D30902] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#F3701B]/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input & Pills */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[220px] max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects, accounts, leads..."
                className="w-full pl-9 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Tab Switcher: Active vs Completed Projects */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => { setStatusTab('ACTIVE'); setQaFilter('ALL'); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  statusTab === 'ACTIVE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Active ({activeProjects.length})
              </button>
              <button
                type="button"
                onClick={() => { setStatusTab('COMPLETED'); setQaFilter('ALL'); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  statusTab === 'COMPLETED'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Completed ({completedProjects.length})
              </button>
            </div>

            {/* QA filter pills: All | My QA Assigned | Missing QA Sheet */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => setQaFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  qaFilter === 'ALL'
                    ? 'bg-gradient-to-r from-[#F3701B] to-[#ED6208] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                All ({currentTabProjects.length})
              </button>

              {isQaUser && (
                <button
                  type="button"
                  onClick={() => setQaFilter('MY_QA')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    qaFilter === 'MY_QA'
                      ? 'bg-gradient-to-r from-[#F3701B] to-[#ED6208] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span>My QA Assigned</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    qaFilter === 'MY_QA' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {myQaCount}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setQaFilter('MISSING_QA')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  qaFilter === 'MISSING_QA'
                    ? 'bg-gradient-to-r from-[#F3701B] to-[#ED6208] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>Missing QA Sheet</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  qaFilter === 'MISSING_QA' 
                    ? 'bg-white/20 text-white' 
                    : missingQaCount > 0 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {missingQaCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#F3701B] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-sm font-medium">Loading projects...</span>
          </div>
        ) : displayedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
              <FolderKanban className="w-7 h-7" />
            </div>
            <p className="text-base font-semibold text-slate-800">No projects found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchTerm 
                ? `No projects match "${searchTerm}". Try a different keyword.` 
                : 'No projects match your active QA filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedProjects.map((proj) => {
              const isRed = proj.weekly_risk === 'High' || proj.weekly_risk === 'Red';
              const isAmber = proj.weekly_risk === 'Medium' || proj.weekly_risk === 'Amber';
              const riskStripColor = isRed ? 'bg-rose-500' : isAmber ? 'bg-amber-500' : 'bg-emerald-500';

              const riskBadge = isRed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                  High Risk
                </span>
              ) : isAmber ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  Medium Risk
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  Low Risk
                </span>
              );

              return (
                <div
                  key={proj.id}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative"
                >
                  {/* Top Bar: colored risk strip h-1 */}
                  <div className={`h-1 w-full rounded-t-xl ${riskStripColor}`} />

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Row 1: Project name bold + account badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                          {proj.name}
                        </h3>
                        {proj.account && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                            {proj.account}
                          </span>
                        )}
                      </div>

                      {/* Row 2: Stage / Status badge + weekly_risk badge */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        {proj.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                            {proj.stage}
                          </span>
                        )}
                        {riskBadge}
                      </div>

                      {/* TL row & PM / Metadata */}
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tech Lead:</span>
                          </span>
                          <span className="font-semibold text-slate-900">{proj.tl_name || 'Unassigned'}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Project Manager:</span>
                          </span>
                          <span className="font-medium text-slate-800">{proj.pm_name || 'Unassigned'}</span>
                        </div>

                        {proj.qa_name && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Active QA:</span>
                            </span>
                            <span className="font-medium text-slate-800">{proj.qa_name}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-slate-600 relative">
                          <span className="text-slate-500">Assigned Team:</span>
                          <div className="relative group/team inline-block">
                            <span 
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                                (proj.assigned_members?.length || proj.assigned_members_count) > 0
                                  ? 'bg-slate-100 hover:bg-[#F3701B]/10 text-slate-700 hover:text-[#ED6208] border-slate-200 hover:border-[#ED6208]/30 shadow-2xs'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                              }`}
                            >
                              <Users className="w-3 h-3 text-slate-400 group-hover/team:text-[#ED6208] transition-colors" />
                              <span>{proj.assigned_members_count || proj.assigned_members?.length || 0} Resources</span>
                            </span>

                            {/* Floating hover popover card showing resource names */}
                            {proj.assigned_members && proj.assigned_members.length > 0 && (
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/team:flex flex-col w-64 p-3 bg-slate-900/95 text-white rounded-xl shadow-xl border border-slate-800 z-50 pointer-events-none backdrop-blur-xs animate-fadeIn">
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
                                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users className="w-3 h-3 text-[#F3701B]" />
                                    <span>Assigned Team ({proj.assigned_members.length})</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">Active</span>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                  {proj.assigned_members.map((m, idx) => (
                                    <div key={m.id || idx} className="flex items-center justify-between text-xs py-0.5">
                                      <span className="font-medium text-slate-100 truncate pr-2">
                                        {m.name}
                                      </span>
                                      {m.department && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-white/10 text-orange-200 border border-white/5 flex-shrink-0">
                                          {m.department}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {/* Tooltip pointer triangle */}
                                <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-900/95 rotate-45 border-r border-b border-slate-800 pointer-events-none" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Channels & DB backup */}
                      {(proj.production_deployment_channel || proj.staging_deployment_channel || proj.database_backup_url) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                          {(proj.production_deployment_channel || proj.staging_deployment_channel) && (
                            <div className="flex items-center gap-2 text-slate-500 font-mono">
                              <Server className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-700 truncate" title="Deployment channels (Prod / Staging)">
                                {proj.production_deployment_channel || '#prod'} / {proj.staging_deployment_channel || '#stage'}
                              </span>
                            </div>
                          )}
                          {proj.database_backup_url && (
                            <div className="flex items-center justify-between gap-1 text-slate-500">
                              <div className="flex items-center gap-1.5 truncate">
                                <Database className="w-3.5 h-3.5 text-[#ED6208] flex-shrink-0" />
                                <a
                                  href={proj.database_backup_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[#ED6208] hover:text-[#D30902] hover:underline truncate"
                                  title={proj.database_backup_url}
                                >
                                  {proj.database_backup_url.replace(/^https?:\/\//, '')}
                                </a>
                              </div>
                              <a
                                href={proj.database_backup_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-slate-600 p-0.5 flex-shrink-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Blockers if any: rose alert box */}
                      {proj.weekly_blockers && (
                        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                          <div className="flex items-center gap-1.5 font-semibold text-rose-700 text-[11px] uppercase tracking-wider mb-0.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            <span>Weekly Blockers</span>
                          </div>
                          <p className="line-clamp-2 text-rose-700">{proj.weekly_blockers}</p>
                        </div>
                      )}
                    </div>

                    {/* Divider & Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      {/* QA Test Sheet link or Add button */}
                      {proj.qa_sheet_url ? (
                        <div className="flex items-center justify-between gap-2 bg-sky-50/80 border border-sky-200/80 rounded-lg p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileSpreadsheet className="w-4 h-4 text-sky-600 flex-shrink-0" />
                            <a
                              href={proj.qa_sheet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline truncate flex items-center gap-1"
                              title={proj.qa_sheet_url}
                            >
                              <span>QA Test Sheet</span>
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          </div>
                          {(isQaUser || hasRole('ADMIN', 'PROJECT_MANAGER', 'TECH_LEAD') || canEditField('projects', 'qa_sheet_url')) && (
                            <button
                              type="button"
                              onClick={() => handleOpenQaModal(proj)}
                              className="p-1 text-slate-400 hover:text-sky-700 hover:bg-sky-100 rounded transition-colors flex-shrink-0"
                              title="Edit QA Sheet URL"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        (isQaUser || hasRole('ADMIN', 'PROJECT_MANAGER', 'TECH_LEAD') || canEditField('projects', 'qa_sheet_url')) && (
                          <button
                            type="button"
                            onClick={() => handleOpenQaModal(proj)}
                            className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-[#F3701B]/50 text-slate-600 hover:text-[#ED6208] hover:bg-[#F3701B]/5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add QA Sheet</span>
                          </button>
                        )
                      )}

                      {/* Footer: Admin actions (Complete, Reopen, Delete) & Edit button */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-3">
                        {hasRole('ADMIN') && (
                          <div className="flex items-center gap-1.5">
                            {proj.status === 'Completed' ? (
                              <button
                                type="button"
                                onClick={() => handleReopenProject(proj)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                                title="Reopen project into Active Portfolio"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                <span>Reopen</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCompleteProject(proj)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-emerald-200"
                                title="Mark project as Completed and free all assigned resources"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Complete</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProject(proj)}
                              disabled={actionLoading}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              title="Delete project permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {(hasRole('ADMIN', 'PROJECT_MANAGER') || canEditField('projects', 'stage')) && (
                          <button
                            onClick={() => handleStartEdit(proj)}
                            className="ml-auto px-3 py-1 text-xs font-semibold text-slate-700 hover:text-[#ED6208] hover:bg-[#F3701B]/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Manage Project: {editingProject.name}</h2>
                  <p className="text-xs text-slate-500">Edit project details according to role permissions ({user?.role})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Project Stage
                  </label>
                  {canEditField('projects', 'stage') ? (
                    <select
                      value={editForm.stage}
                      onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                    >
                      <option value="Planning & Prototype">Planning & Prototype</option>
                      <option value="Development & Integration">Development & Integration</option>
                      <option value="UAT & Final Acceptance">UAT & Final Acceptance</option>
                      <option value="Security & Stress Testing">Security & Stress Testing</option>
                      <option value="Production Maintenance">Production Maintenance</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 font-medium border border-slate-200">
                      {editForm.stage} (Locked)
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Weekly Risk
                  </label>
                  {canEditField('projects', 'weekly_risk') ? (
                    <select
                      value={editForm.weekly_risk === 'Green' ? 'Low' : editForm.weekly_risk === 'Amber' ? 'Medium' : editForm.weekly_risk === 'Red' ? 'High' : editForm.weekly_risk}
                      onChange={(e) => setEditForm({ ...editForm, weekly_risk: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                    >
                      <option value="Low">Low Risk</option>
                      <option value="Medium">Medium Risk</option>
                      <option value="High">High Risk</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 font-medium border border-slate-200">
                      {editForm.weekly_risk === 'Green' ? 'Low' : editForm.weekly_risk === 'Amber' ? 'Medium' : editForm.weekly_risk === 'Red' ? 'High' : editForm.weekly_risk} Risk (Locked)
                    </div>
                  )}
                </div>
              </div>

              {/* Leadership assignments (PM/Admin only) */}
              {canEditField('projects', 'project_manager_id') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Project Manager
                    </label>
                    <select
                      value={editForm.project_manager_id}
                      onChange={(e) => setEditForm({ ...editForm, project_manager_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                    >
                      <option value="">-- None --</option>
                      {pms.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Tech Lead
                    </label>
                    <select
                      value={editForm.tech_lead_id}
                      onChange={(e) => setEditForm({ ...editForm, tech_lead_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                    >
                      <option value="">-- None --</option>
                      {tls.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role.replace('_', ' ')})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Active QA
                    </label>
                    <select
                      value={editForm.active_qa_id}
                      onChange={(e) => setEditForm({ ...editForm, active_qa_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                    >
                      <option value="">-- None --</option>
                      {qas.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Weekly Blockers */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Weekly Blockers
                </label>
                {canEditField('projects', 'weekly_blockers') ? (
                  <textarea
                    rows="2"
                    value={editForm.weekly_blockers}
                    onChange={(e) => setEditForm({ ...editForm, weekly_blockers: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                    placeholder="Document current blockers..."
                  />
                ) : (
                  <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 border border-slate-200">
                    {editForm.weekly_blockers || 'None'}
                  </div>
                )}
              </div>

              {/* Deployment Channels (DevOps / Admin) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Prod Channel
                  </label>
                  {canEditField('projects', 'production_deployment_channel') ? (
                    <input
                      type="text"
                      value={editForm.production_deployment_channel}
                      onChange={(e) => setEditForm({ ...editForm, production_deployment_channel: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono text-slate-900"
                      placeholder="#prod-deploy"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 border border-slate-200 font-mono">
                      {editForm.production_deployment_channel || 'Not configured'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Staging Channel
                  </label>
                  {canEditField('projects', 'staging_deployment_channel') ? (
                    <input
                      type="text"
                      value={editForm.staging_deployment_channel}
                      onChange={(e) => setEditForm({ ...editForm, staging_deployment_channel: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono text-slate-900"
                      placeholder="#stage-deploy"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 border border-slate-200 font-mono">
                      {editForm.staging_deployment_channel || 'Not configured'}
                    </div>
                  )}
                </div>
              </div>

              {/* Database Backup URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#ED6208]" />
                  <span>Database Backup URL / Target</span>
                </label>
                {canEditField('projects', 'database_backup_url') ? (
                  <input
                    type="url"
                    value={editForm.database_backup_url}
                    onChange={(e) => setEditForm({ ...editForm, database_backup_url: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono text-slate-900"
                    placeholder="https://backups.s3.amazonaws.com/..."
                  />
                ) : (
                  <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 border border-slate-200 font-mono truncate">
                    {editForm.database_backup_url || 'None configured'}
                  </div>
                )}
              </div>

              {/* QA Sheet Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  QA Sheet URL
                </label>
                {canEditField('projects', 'qa_sheet_url') ? (
                  <input
                    type="url"
                    value={editForm.qa_sheet_url}
                    onChange={(e) => setEditForm({ ...editForm, qa_sheet_url: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono text-slate-900"
                    placeholder="https://docs.google.com/spreadsheets/..."
                  />
                ) : (
                  <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 border border-slate-200 font-mono truncate">
                    {editForm.qa_sheet_url || 'None linked'}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Create New Project</h2>
                  <p className="text-xs text-slate-500">Define client details, tech lead, and deployment pipelines</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Mobile Portal"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Client / Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Global Logistics Inc"
                  value={createForm.account}
                  onChange={(e) => setCreateForm({ ...createForm, account: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Tech Lead
                  </label>
                  <select
                    value={createForm.tech_lead_id}
                    onChange={(e) => setCreateForm({ ...createForm, tech_lead_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Select TL --</option>
                    {tls.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Active QA
                  </label>
                  <select
                    value={createForm.active_qa_id}
                    onChange={(e) => setCreateForm({ ...createForm, active_qa_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Select QA --</option>
                    {qas.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Prod Channel
                  </label>
                  <input
                    type="text"
                    placeholder="#prod-deploy"
                    value={createForm.production_deployment_channel}
                    onChange={(e) => setCreateForm({ ...createForm, production_deployment_channel: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Staging Channel
                  </label>
                  <input
                    type="text"
                    placeholder="#stage-deploy"
                    value={createForm.staging_deployment_channel}
                    onChange={(e) => setCreateForm({ ...createForm, staging_deployment_channel: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#ED6208]" />
                  <span>Database Backup URL</span>
                </label>
                <input
                  type="url"
                  placeholder="https://backups.s3.amazonaws.com/..."
                  value={createForm.database_backup_url}
                  onChange={(e) => setCreateForm({ ...createForm, database_backup_url: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick QA Test Sheet Modal */}
      {qaModalProject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage QA Test Sheet</h3>
                  <p className="text-xs text-slate-500">
                    {qaModalProject.name} {qaModalProject.account ? `(${qaModalProject.account})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQaModalProject(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 my-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Active QA Assignee:</span>
                <span className="font-semibold text-slate-800">{qaModalProject.qa_name || user?.name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Project Stage:</span>
                <span className="font-semibold text-slate-800">{qaModalProject.stage}</span>
              </div>
            </div>

            <form onSubmit={handleSaveQaModal} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    QA Google Sheet / Tracker URL
                  </label>
                  {qaSheetUrlInput && (
                    <a
                      href={qaSheetUrlInput}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#ED6208] hover:text-[#D30902] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Test link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={qaSheetUrlInput}
                  onChange={(e) => setQaSheetUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition font-mono placeholder:text-slate-400 text-slate-900"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Paste the Google Sheets test cases or bug verification spreadsheet link for this project.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQaModalProject(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQaModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{savingQaModal ? 'Saving...' : 'Save QA Sheet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Project Confirmation Modal */}
      {confirmCompleteProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Mark Project as Completed?</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to mark <strong className="text-slate-900 font-semibold">{confirmCompleteProject.name}</strong> as <strong>Completed</strong>?
              </p>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Automatic actions:</div>
                <div>• All assigned team members will be freed (allocations set to 0%).</div>
                <div>• Developers become available on the bench.</div>
                <div>• Project moves to the <strong>Completed</strong> projects archive.</div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmCompleteProject(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCompleteProject(confirmCompleteProject)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? 'Completing...' : 'Yes, Complete Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {confirmDeleteProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Permanently Delete Project?</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-900 font-semibold">{confirmDeleteProject.name}</strong>?
              </p>
              <div className="mt-4 p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-semibold text-rose-900">⚠️ Irreversible Action:</div>
                <div>• This project will be removed completely from the database.</div>
                <div>• All allocations, QA records, and channel configs will be deleted.</div>
                <div>• An immutable entry will be recorded in the security audit log.</div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteProject(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(confirmDeleteProject)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? 'Deleting...' : 'Delete Project Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
