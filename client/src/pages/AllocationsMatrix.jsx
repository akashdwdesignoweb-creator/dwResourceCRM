import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCSV } from '../utils/exportCsv';
import { 
  Calendar, 
  CalendarDays,
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Check, 
  Lock, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Clock,
  Copy,
  Star,
  Download,
  X,
  User,
  Users,
  Briefcase
} from 'lucide-react';

export default function AllocationsMatrix({ onPeriodChange }) {
  const { user, canEditField, hasRole } = useAuth();
  const { showToast } = useToast();
  const isAdmin = hasRole('ADMIN');
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Super Admin Developer Editing State
  const [showEditDevModal, setShowEditDevModal] = useState(false);
  const [editingDev, setEditingDev] = useState(null);
  const [devForm, setDevForm] = useState({
    name: '',
    email: '',
    role: 'DEVELOPER',
    secondary_role: '',
    department: 'MOBILE',
    skill: '',
    capacity_pct: 80,
    capacity_hours: 40,
    status: 'Active'
  });

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlloc, setNewAlloc] = useState({
    user_id: '',
    project_id: '',
    role_title: 'Developer',
    capacity_pct: 100,
    allocated_pct: 100,
    allocation_days_note: '100% (Full Week)',
    pm_remarks: '',
    status: 'Active'
  });

  // Weekly Cycle Management States
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_current: true,
    rollover: true,
    copy_remarks: false
  });

  const getNextWeekDates = () => {
    const nextStart = new Date();
    const dayOfWeek = nextStart.getDay();
    const daysUntilNextMonday = ((1 - dayOfWeek + 7) % 7) || 7;
    nextStart.setDate(nextStart.getDate() + daysUntilNextMonday);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 4);

    const pad = (n) => String(n).padStart(2, '0');
    const startStr = `${pad(nextStart.getDate())}/${pad(nextStart.getMonth() + 1)}/${String(nextStart.getFullYear()).slice(-2)}`;
    const endStr = `${pad(nextEnd.getDate())}/${pad(nextEnd.getMonth() + 1)}/${String(nextEnd.getFullYear()).slice(-2)}`;

    return {
      name: `Resource Allocation (${startStr} - ${endStr})`,
      start_date: nextStart.toISOString().split('T')[0],
      end_date: nextEnd.toISOString().split('T')[0]
    };
  };

  const openCreatePeriodModal = () => {
    const defaults = getNextWeekDates();
    setPeriodForm({
      name: defaults.name,
      start_date: defaults.start_date,
      end_date: defaults.end_date,
      is_current: true,
      rollover: true,
      copy_remarks: false
    });
    setShowNewPeriodModal(true);
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    setCreatingPeriod(true);
    try {
      const res = await api.createPeriod({
        name: periodForm.name,
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        is_current: periodForm.is_current,
        rollover_from_period_id: periodForm.rollover ? selectedPeriodId : null,
        copy_pm_remarks: periodForm.copy_remarks
      });
      setShowNewPeriodModal(false);
      const newPers = await api.getPeriods();
      setPeriods(newPers);
      setSelectedPeriodId(res.id);
      if (onPeriodChange) onPeriodChange(res.name);
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create weekly cycle', 'error');
    } finally {
      setCreatingPeriod(false);
    }
  };

  const handleAutoNextWeek = async () => {
    if (!window.confirm("Auto-generate next week's allocation cycle and rollover team assignments?")) return;
    setCreatingPeriod(true);
    try {
      const res = await api.autoCreateNextPeriod();
      const newPers = await api.getPeriods();
      setPeriods(newPers);
      setSelectedPeriodId(res.id);
      if (onPeriodChange) onPeriodChange(res.name);
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message || 'Auto-create failed', 'error');
    } finally {
      setCreatingPeriod(false);
    }
  };

  const handleSetCurrentPeriod = async () => {
    try {
      const res = await api.setCurrentPeriod(selectedPeriodId);
      const newPers = await api.getPeriods();
      setPeriods(newPers);
      showToast(res.message || 'Cycle is now marked as active current cycle.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update active cycle', 'error');
    }
  };

  // Load periods, projects, and users
  useEffect(() => {
    Promise.all([api.getPeriods(), api.getProjects(), api.getUsers()])
      .then(([pers, projs, usrs]) => {
        setPeriods(pers);
        setProjects(projs);
        setUsersList(usrs);
        const cur = pers.find((p) => p.is_current) || pers[0];
        if (cur) {
          setSelectedPeriodId(cur.id);
          if (onPeriodChange) onPeriodChange(cur.name);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Load allocations whenever period or filters change
  const fetchAllocations = (showLoading = false) => {
    if (!selectedPeriodId) return Promise.resolve();
    if (showLoading) setLoading(true);
    else setIsRefreshing(true);

    return api.getAllocations({
      period_id: selectedPeriodId,
      project_id: selectedProject,
      role: selectedRole,
      department: selectedDept,
      search: search
    })
      .then((data) => setAllocations(data))
      .catch((err) => console.error(err))
      .finally(() => {
        if (showLoading) setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    // Only show full loading if we have no allocations loaded yet
    fetchAllocations(allocations.length === 0);
    const curP = periods.find((p) => p.id === Number(selectedPeriodId));
    if (curP && onPeriodChange) onPeriodChange(curP.name);
  }, [selectedPeriodId, selectedProject, selectedRole, selectedDept, search]);

  const handleStartEdit = (alloc) => {
    setEditingId(alloc.id);
    setEditForm({
      project_id: alloc.project_id || '',
      role_title: alloc.role_title,
      allocated_pct: alloc.allocated_pct,
      allocation_days_note: alloc.allocation_days_note || '',
      pm_remarks: alloc.pm_remarks || '',
      tl_notes: alloc.tl_notes || '',
      member_notes: alloc.member_notes || '',
      status: alloc.status
    });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.updateAllocation(id, editForm);
      setEditingId(null);
      setSaveSuccessId(id);
      showToast('Allocation updated successfully.', 'success');
      setTimeout(() => setSaveSuccessId(null), 2500);

      // In-place update so table does not unmount or jump scroll position
      setAllocations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...editForm } : a))
      );
      fetchAllocations(false);
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRow = handleSaveEdit;

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this allocation?')) return;
    try {
      await api.deleteAllocation(id);
      showToast('Allocation removed successfully.', 'success');
      setAllocations((prev) => prev.filter((a) => a.id !== id));
      fetchAllocations(false);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteAlloc = handleDelete;

  const handleCopyAlloc = (alloc) => {
    const text = `${alloc.resource_name} | ${alloc.project_name || 'Bench'} | ${alloc.role_title} | ${alloc.allocated_pct}%${alloc.allocation_days_note ? ` (${alloc.allocation_days_note})` : ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    showToast(`Copied allocation for ${alloc.resource_name}`, 'info');
  };

  const openEditDevModal = (alloc) => {
    const u = usersList.find((usr) => usr.id === alloc.user_id) || {};
    setEditingDev({
      id: alloc.user_id,
      name: alloc.resource_name
    });
    setDevForm({
      name: u.name || alloc.resource_name || '',
      email: u.email || alloc.resource_email || '',
      role: u.role || alloc.resource_role || 'DEVELOPER',
      secondary_role: u.secondary_role || alloc.resource_secondary_role || '',
      department: u.department || alloc.resource_department || 'MOBILE',
      skill: u.skill || alloc.resource_skill || '',
      capacity_pct: u.capacity_pct ?? alloc.user_capacity_pct ?? alloc.capacity_pct ?? 80,
      capacity_hours: u.capacity_hours ?? alloc.resource_capacity_hours ?? 40,
      status: u.status || alloc.resource_status || 'Active'
    });
    setShowEditDevModal(true);
  };

  const handleSaveDev = async (e) => {
    e.preventDefault();
    if (!editingDev) return;
    try {
      const payload = { ...devForm };
      if (!payload.secondary_role) payload.secondary_role = null;
      await api.updateUser(editingDev.id, payload);
      showToast(`Updated ${devForm.name}'s developer profile successfully.`, 'success');
      setShowEditDevModal(false);

      // In-place update so table position is preserved without jumping
      setUsersList((prev) =>
        prev.map((u) => (u.id === editingDev.id ? { ...u, ...payload } : u))
      );
      setAllocations((prev) =>
        prev.map((a) =>
          a.user_id === editingDev.id
            ? {
                ...a,
                resource_name: payload.name || a.resource_name,
                resource_email: payload.email || a.resource_email,
                resource_role: payload.role || a.resource_role,
                resource_secondary_role: payload.secondary_role,
                resource_department: payload.department || a.resource_department,
                resource_skill: payload.skill || a.resource_skill,
                resource_capacity_hours: payload.capacity_hours || a.resource_capacity_hours,
                capacity_pct: payload.capacity_pct || a.capacity_pct
              }
            : a
        )
      );
      setEditingDev(null);
      fetchAllocations(false);
      api.getUsers().then(setUsersList).catch(console.error);
    } catch (err) {
      showToast(`Failed to update developer: ${err.message}`, 'error');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newAlloc.user_id) {
      showToast('Please select a team member.', 'warning');
      return;
    }
    try {
      await api.createAllocation({
        ...newAlloc,
        period_id: selectedPeriodId
      });
      showToast('Allocation created successfully.', 'success');
      setShowAddModal(false);
      setNewAlloc({
        user_id: '',
        project_id: '',
        role_title: 'Developer',
        capacity_pct: 100,
        allocated_pct: 100,
        allocation_days_note: '100% (Full Week)',
        pm_remarks: '',
        status: 'Active'
      });
      fetchAllocations(false);
    } catch (err) {
      showToast(`Error creating allocation: ${err.message}`, 'error');
    }
  };

  const handleAddAlloc = handleAddSubmit;

  const handleExportCSV = () => {
    const curPeriod = periods.find((p) => p.id === Number(selectedPeriodId));
    const cycleName = curPeriod ? curPeriod.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Allocations';
    const headers = [
      { label: 'Employee', accessor: 'resource_name' },
      { label: 'Department', accessor: 'resource_department' },
      { label: 'Skills', accessor: 'resource_skill' },
      { label: 'Project', accessor: (a) => a.project_name || 'Unassigned' },
      { label: 'Role', accessor: 'role_title' },
      { label: 'Capacity (%)', accessor: 'capacity_pct' },
      { label: 'Allocated (%)', accessor: 'allocated_pct' },
      { label: 'Working Days', accessor: 'allocation_days_note' },
      { label: 'PM Remarks', accessor: (a) => a.pm_remarks || '' },
      { label: 'Utilization (%)', accessor: (a) => `${a.utilization_pct}%` },
      { label: 'Status', accessor: 'status' }
    ];
    exportToCSV(`DW_Resource_Allocations_${cycleName}`, headers, allocations);
    showToast(`Exported ${allocations.length} allocations to CSV.`, 'success');
  };

  const isDeptManager = (user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') && user?.department && user?.department !== 'GENERAL';

  const displayedAllocations = isDeptManager
    ? allocations.filter((a) => a.resource_department?.toUpperCase() === user.department?.toUpperCase())
    : allocations;

  const assignableUsers = isDeptManager
    ? usersList.filter((u) => u.department?.toUpperCase() === user.department?.toUpperCase())
    : usersList;

  // Quick stats aggregated per unique team member
  const uniqueEmployeeMap = new Map();
  displayedAllocations.forEach((a) => {
    if (!uniqueEmployeeMap.has(a.user_id)) {
      uniqueEmployeeMap.set(a.user_id, {
        totalAllocated: a.total_employee_allocated_pct !== undefined ? a.total_employee_allocated_pct : a.allocated_pct,
        utilization: a.utilization_pct !== undefined ? a.utilization_pct : (a.capacity_pct > 0 ? Math.round((a.allocated_pct / a.capacity_pct) * 100) : 0),
        status: a.status
      });
    }
  });

  const uniqueEmployees = Array.from(uniqueEmployeeMap.values());
  const uniqueResourcesCount = uniqueEmployees.length;
  const overAllocatedCount = uniqueEmployees.filter((e) => e.utilization > 100).length;
  const optimalCount = uniqueEmployees.filter((e) => e.utilization >= 80 && e.utilization <= 100).length;
  // A resource is on the bench only if their total active workload across all projects is 0%
  const benchCount = uniqueEmployees.filter((e) => e.totalAllocated === 0 || e.status === 'Bench').length;
  const totalAllocatedCount = uniqueEmployees.filter((e) => e.totalAllocated > 0).length;

  const getDeptBadgeClass = (dept) => {
    switch (dept?.toUpperCase()) {
      case 'MOBILE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'BACKEND':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FRONTEND':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'QA':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'DEVOPS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-[#F3701B]/10 text-[#ED6208] border-[#F3701B]/20';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Bench':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Leave':
      case 'On Leave':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      
      {/* Page Header (white, sticky, border-b) */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#F3701B] to-[#D30902] rounded-lg flex items-center justify-center shadow-sm shadow-[#F3701B]/25 shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Weekly Resource Allocation Matrix
                </h1>
                {user?.department && (user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                    {user.department} Team Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Role-based matrix for sprint assignments, capacity, and weekly working schedules
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Period selector dropdown */}
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900 cursor-pointer font-medium shadow-sm transition"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.is_current ? ' ★ (Active Cycle)' : ''}
                </option>
              ))}
            </select>

            {/* Historical period: Make Active */}
            {hasRole('ADMIN', 'PROJECT_MANAGER', 'MANAGER') && periods.find((p) => p.id === Number(selectedPeriodId) && !p.is_current) && (
              <button
                type="button"
                onClick={handleSetCurrentPeriod}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                title="Set this historical cycle as the active current cycle"
              >
                <Star className="w-3.5 h-3.5 text-amber-600" />
                <span>Make Active</span>
              </button>
            )}

            {/* Auto Next Week Rollover */}
            {hasRole('ADMIN', 'PROJECT_MANAGER', 'MANAGER') && (
              <button
                type="button"
                onClick={handleAutoNextWeek}
                disabled={creatingPeriod}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                title="1-Click: Automatically generates next Monday-Friday cycle and rolls over current allocations"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto Next Week</span>
              </button>
            )}

            {/* + New Cycle button */}
            {hasRole('ADMIN', 'PROJECT_MANAGER', 'MANAGER') && (
              <button
                type="button"
                onClick={openCreatePeriodModal}
                className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#ED6208] hover:from-[#ED6208] hover:to-[#D30902] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#F3701B]/20 transition-all flex items-center gap-2 cursor-pointer"
                title="Create a new weekly cycle with custom dates or allocation rollover"
              >
                <Plus className="w-4 h-4" />
                <span>New Cycle</span>
              </button>
            )}

            {/* New Allocation button */}
            {hasRole('ADMIN', 'PROJECT_MANAGER', 'MANAGER') && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#ED6208] hover:from-[#ED6208] hover:to-[#D30902] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#F3701B]/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Allocation</span>
              </button>
            )}

            {/* CSV Export ghost button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
              title="Download Weekly Allocations as CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>CSV Export</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchAllocations}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh matrix"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#F3701B]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Below header: stats row showing total allocations count, active resources, etc. as small pills */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#F3701B]"></span>
            Total Allocations: <span className="font-bold text-slate-900">{displayedAllocations.length}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            Active Resources: <span className="font-bold text-slate-900">{uniqueResourcesCount}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Optimal (80-100%): <span className="font-bold text-emerald-900">{optimalCount}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Over-allocated (&gt;100%): <span className="font-bold text-rose-900">{overAllocatedCount}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Bench / Available: <span className="font-bold text-slate-900">{benchCount}</span>
          </span>
        </div>
      </div>

      {/* Filter Bar (white bg, border-b) */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
        {/* Search box (Search icon) */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search resource, skill, remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
          />
        </div>

        {/* Project filter select */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 cursor-pointer"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Role filter select */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="TL">Tech Lead (TL)</option>
          <option value="Developer">Developer</option>
          <option value="QA">QA</option>
          <option value="DevOps">DevOps</option>
        </select>

        {/* Department filter select */}
        {hasRole('ADMIN') && (
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 cursor-pointer"
          >
            <option value="">All Departments</option>
            <option value="MOBILE">Mobile Dev</option>
            <option value="BACKEND">Backend Dev</option>
            <option value="FRONTEND">Frontend Dev</option>
            <option value="QA">Quality Analyst (QA)</option>
            <option value="DEVOPS">DevOps</option>
            <option value="GENERAL">General</option>
          </select>
        )}

        {(search || selectedProject || selectedRole || selectedDept) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedProject('');
              setSelectedRole('');
              setSelectedDept('');
            }}
            className="text-xs text-[#F3701B] hover:text-[#D30902] font-semibold px-2 py-1.5 hover:bg-[#F3701B]/10 rounded-lg transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Allocation Table (the main enterprise-table table) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden mx-6 my-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse enterprise-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                  Resource
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                  Department / Role
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5">
                    <span>Project</span>
                    {canEditField('allocations', 'project_id') ? (
                      <Edit3 className="w-3 h-3 text-[#ED6208]" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                  Capacity
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5">
                    <span>Allocated%</span>
                    {canEditField('allocations', 'allocated_pct') ? (
                      <Edit3 className="w-3 h-3 text-[#ED6208]" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5">
                    <span>Role Title</span>
                    {canEditField('allocations', 'role_title') ? (
                      <Edit3 className="w-3 h-3 text-[#ED6208]" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left min-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    <span>Work Notes</span>
                    {canEditField('allocations', 'pm_remarks') || canEditField('allocations', 'tl_notes') || canEditField('allocations', 'member_notes') ? (
                      <Edit3 className="w-3 h-3 text-[#ED6208]" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">
                  Status
                </th>
                <th className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-[#F3701B] animate-spin mb-3" />
                      <p className="text-sm font-semibold text-slate-700">Loading allocation matrix...</p>
                      <p className="text-xs text-slate-400 mt-1">Fetching weekly assignments and workload distribution</p>
                    </div>
                  </td>
                </tr>
              ) : displayedAllocations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                        <Calendar className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No resource allocations found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or assign a resource for this cycle.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedAllocations.map((alloc) => {
                  const isEditing = editingId === alloc.id;
                  const isSaved = saveSuccessId === alloc.id;
                  const isOwnRecord = user?.id === alloc.user_id;

                  const isOver = alloc.utilization_pct > 100 || alloc.allocated_pct > alloc.capacity_pct;
                  const isOptimal = alloc.utilization_pct >= 80 && alloc.utilization_pct <= 100;
                  const isBench = alloc.allocated_pct === 0 || alloc.status === 'Bench';

                  return (
                    <tr
                      key={alloc.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${
                        isSaved ? 'bg-emerald-50/60' : ''
                      }`}
                    >
                      {/* Resource: bold slate-900, email in slate-400 text-xs below */}
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{alloc.resource_name}</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openEditDevModal(alloc)}
                                className="text-slate-400 hover:text-[#F3701B] transition p-0.5 rounded hover:bg-[#F3701B]/10"
                                title="Edit Developer Profile (Super Admin)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isSaved && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-fadeIn">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Saved
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-normal">
                            {alloc.resource_email || `${alloc.resource_name?.toLowerCase().replace(/\s+/g, '.')}@directworks.io`}
                          </span>
                          {alloc.resource_skill && (
                            <span className="text-[11px] text-slate-500 font-normal truncate max-w-[220px] mt-0.5" title={alloc.resource_skill}>
                              {alloc.resource_skill}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dept/Role: badge pills (colored per dept) */}
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getDeptBadgeClass(alloc.resource_department)}`}>
                            {alloc.resource_department || 'General'}
                          </span>
                          {alloc.resource_role && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              {alloc.resource_role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Project: project name + account in smaller text */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing && canEditField('allocations', 'project_id') ? (
                          <select
                            value={editForm.project_id}
                            onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-[#F3701B]/40 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900"
                          >
                            <option value="">-- Bench / None --</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <span className={`font-semibold ${alloc.project_name ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                              {alloc.project_name || 'Bench'}
                            </span>
                            {alloc.project_account && (
                              <p className="text-xs text-slate-400 mt-0.5">{alloc.project_account}</p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Capacity: number badge */}
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                          {alloc.capacity_pct}%
                        </span>
                      </td>

                      {/* Allocated%: number badges, overallocated in rose, normal in emerald */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing && canEditField('allocations', 'allocated_pct') ? (
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="0"
                              max="200"
                              step="any"
                              value={editForm.allocated_pct}
                              onChange={(e) => setEditForm({ ...editForm, allocated_pct: Number(e.target.value) })}
                              className="w-20 px-2 py-1 text-xs text-center border border-[#F3701B]/40 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900"
                            />
                            <input
                              type="text"
                              placeholder="Days (e.g. Mon-Wed)"
                              value={editForm.allocation_days_note}
                              onChange={(e) => setEditForm({ ...editForm, allocation_days_note: e.target.value })}
                              className="w-full px-2 py-0.5 text-[11px] border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 text-slate-800"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                                isOver
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isOptimal
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isBench
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {alloc.allocated_pct}%
                              </span>
                              {alloc.utilization_pct !== undefined && (
                                <span className="text-[11px] text-slate-400 font-mono" title="Utilization %">
                                  ({alloc.utilization_pct}%)
                                </span>
                              )}
                            </div>
                            {alloc.allocation_days_note && (
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                                {alloc.allocation_days_note}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Role Title */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing && canEditField('allocations', 'role_title') ? (
                          <select
                            value={editForm.role_title}
                            onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                            className="px-2 py-1 text-xs border border-[#F3701B]/40 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900"
                          >
                            <option value="TL">TL</option>
                            <option value="Developer">Developer</option>
                            <option value="Tech Lead">Tech Lead</option>
                            <option value="Senior Developer">Senior Developer</option>
                            <option value="Hands-On Manager">Hands-On Manager</option>
                            <option value="QA">QA</option>
                            <option value="DevOps">DevOps</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {alloc.role_title}
                          </span>
                        )}
                      </td>

                      {/* Work Notes */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <div className="space-y-2">
                            {canEditField('allocations', 'pm_remarks') && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                  PM Remarks
                                </span>
                                <textarea
                                  rows="2"
                                  value={editForm.pm_remarks}
                                  onChange={(e) => setEditForm({ ...editForm, pm_remarks: e.target.value })}
                                  className="w-full text-xs border border-[#F3701B]/40 rounded-lg p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900"
                                  placeholder="PM remarks..."
                                />
                              </div>
                            )}

                            {(canEditField('allocations', 'tl_notes') || alloc.role_title === 'Tech Lead' || alloc.tl_name === user?.name) && (
                              <div>
                                <span className="text-[10px] font-bold text-[#ED6208] uppercase tracking-wider block mb-0.5">
                                  Tech Lead Notes
                                </span>
                                <textarea
                                  rows="2"
                                  value={editForm.tl_notes}
                                  onChange={(e) => setEditForm({ ...editForm, tl_notes: e.target.value })}
                                  className="w-full text-xs border border-[#F3701B]/40 rounded-lg p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900"
                                  placeholder="Tech Lead notes..."
                                />
                              </div>
                            )}

                            {(canEditField('allocations', 'member_notes') || isOwnRecord) && (
                              <div>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">
                                  Member Notes
                                </span>
                                <textarea
                                  rows="2"
                                  value={editForm.member_notes}
                                  onChange={(e) => setEditForm({ ...editForm, member_notes: e.target.value })}
                                  className="w-full text-xs border border-[#F3701B]/40 rounded-lg p-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900"
                                  placeholder="Member notes..."
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1 max-w-xs text-xs">
                            {alloc.pm_remarks && (
                              <div>
                                <span className="font-semibold text-slate-700 text-[11px]">PM: </span>
                                <span className="text-slate-600 leading-relaxed">{alloc.pm_remarks}</span>
                              </div>
                            )}
                            {alloc.tl_notes && (
                              <div>
                                <span className="font-semibold text-[#ED6208] text-[11px]">TL: </span>
                                <span className="text-slate-600 leading-relaxed">{alloc.tl_notes}</span>
                              </div>
                            )}
                            {alloc.member_notes && (
                              <div>
                                <span className="font-semibold text-emerald-700 text-[11px]">Dev: </span>
                                <span className="text-slate-600 leading-relaxed">{alloc.member_notes}</span>
                              </div>
                            )}
                            {!alloc.pm_remarks && !alloc.tl_notes && !alloc.member_notes && (
                              <span className="text-slate-400 italic text-xs">No notes recorded</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status: emerald/amber/rose pill */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing && (canEditField('allocations', 'status') || isOwnRecord) ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="px-2 py-1 text-xs border border-[#F3701B]/40 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900"
                          >
                            <option value="Active">Active</option>
                            <option value="Bench">Bench</option>
                            <option value="Leave">Leave</option>
                            <option value="Completed">Completed</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(alloc.status)}`}>
                            {alloc.status}
                          </span>
                        )}
                      </td>

                      {/* Actions: edit (pencil), delete (trash), copy (copy) icon ghost buttons */}
                      <td className="px-4 py-3 text-sm text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(alloc.id)}
                              disabled={saving}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                              title="Save Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(alloc)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                              title="Edit permitted fields"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleCopyAlloc(alloc)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                              title="Copy allocation summary"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {hasRole('ADMIN', 'PROJECT_MANAGER', 'MANAGER') && (
                              <button
                                onClick={() => handleDelete(alloc.id)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                                title="Remove allocation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* Add Allocation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Assign Resource to Project</h2>
                  <p className="text-xs text-slate-500">Allocate team member capacity and working schedule</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Team Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={newAlloc.user_id}
                    onChange={(e) => setNewAlloc({ ...newAlloc, user_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Select Resource --</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.skill || u.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Target Project
                  </label>
                  <select
                    value={newAlloc.project_id}
                    onChange={(e) => setNewAlloc({ ...newAlloc, project_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Bench / No Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Role in Project
                    </label>
                    <select
                      value={newAlloc.role_title}
                      onChange={(e) => setNewAlloc({ ...newAlloc, role_title: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 cursor-pointer"
                    >
                      <option value="Developer">Developer</option>
                      <option value="Tech Lead">Tech Lead</option>
                      <option value="Hands-On Manager">Hands-On Manager</option>
                      <option value="Senior Developer">Senior Developer</option>
                      <option value="QA">QA</option>
                      <option value="DevOps">DevOps</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Allocated (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      step="any"
                      value={newAlloc.allocated_pct}
                      onChange={(e) => setNewAlloc({ ...newAlloc, allocated_pct: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Days / Schedule Breakdown
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100% (Full Week) or 40% (Tuesday, Wednesday)"
                    value={newAlloc.allocation_days_note}
                    onChange={(e) => setNewAlloc({ ...newAlloc, allocation_days_note: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    PM Remarks
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Sprint focus, tasks, deliverables..."
                    value={newAlloc.pm_remarks}
                    onChange={(e) => setNewAlloc({ ...newAlloc, pm_remarks: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  Create Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Weekly Allocation Cycle Modal */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Start New Weekly Cycle</h2>
                  <p className="text-xs text-slate-500">Plan resource allocations and working day schedules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Weekly Cycle Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Resource Allocation (19/10/26 - 23/10/26)"
                    value={periodForm.name}
                    onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Start Date (Monday)
                    </label>
                    <input
                      type="date"
                      required
                      value={periodForm.start_date}
                      onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      End Date (Friday)
                    </label>
                    <input
                      type="date"
                      required
                      value={periodForm.end_date}
                      onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-700">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={periodForm.is_current}
                      onChange={(e) => setPeriodForm({ ...periodForm, is_current: e.target.checked })}
                      className="rounded text-[#F3701B] focus:ring-[#F3701B] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-900">Set as Active Current Cycle</span>
                      <p className="text-[11px] text-slate-500">Developers and leaders will see this cycle by default upon login.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-slate-200">
                    <input
                      type="checkbox"
                      checked={periodForm.rollover}
                      onChange={(e) => setPeriodForm({ ...periodForm, rollover: e.target.checked })}
                      className="rounded text-[#F3701B] focus:ring-[#F3701B] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-900">Rollover Team Allocations</span>
                      <p className="text-[11px] text-slate-500">Clones current project assignments, working days, and capacity percentages as baseline.</p>
                    </div>
                  </label>

                  {periodForm.rollover && (
                    <label className="flex items-center gap-2.5 cursor-pointer pl-6">
                      <input
                        type="checkbox"
                        checked={periodForm.copy_remarks}
                        onChange={(e) => setPeriodForm({ ...periodForm, copy_remarks: e.target.checked })}
                        className="rounded text-[#F3701B] focus:ring-[#F3701B] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-slate-600">Carry forward PM remarks & sprint instructions</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowNewPeriodModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPeriod}
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingPeriod && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Cycle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Edit Developer Modal */}
      {showEditDevModal && editingDev && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Edit Developer Profile</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                      ID #{editingDev.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Super Admin controls: update skills, role, capacity, and department</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditDevModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDev}>
              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={devForm.name}
                    onChange={(e) => setDevForm({ ...devForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    value={devForm.email}
                    onChange={(e) => setDevForm({ ...devForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Primary Role
                    </label>
                    <select
                      value={devForm.role}
                      onChange={(e) => setDevForm({ ...devForm, role: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="DEVELOPER">Developer</option>
                      <option value="TECH_LEAD">Tech Lead</option>
                      <option value="MANAGER">Manager / Lead</option>
                      <option value="QA">Quality Analyst (QA)</option>
                      <option value="DEVOPS">DevOps Engineer</option>
                      <option value="ADMIN">Super Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Secondary Role
                    </label>
                    <select
                      value={devForm.secondary_role || ''}
                      onChange={(e) => setDevForm({ ...devForm, secondary_role: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="">None</option>
                      <option value="DEVOPS">DevOps (e.g. Deepanshu Tyagi)</option>
                      <option value="TECH_LEAD">Tech Lead</option>
                      <option value="DEVELOPER">Developer</option>
                      <option value="QA">QA Specialist</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <select
                      value={devForm.department}
                      onChange={(e) => setDevForm({ ...devForm, department: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="MOBILE">Mobile Team</option>
                      <option value="BACKEND">Backend Team</option>
                      <option value="FRONTEND">Frontend Team</option>
                      <option value="QA">Quality Assurance (QA)</option>
                      <option value="DEVOPS">DevOps & Cloud</option>
                      <option value="GENERAL">General / Leadership</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Account Status
                    </label>
                    <select
                      value={devForm.status}
                      onChange={(e) => setDevForm({ ...devForm, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Technical Skills & Stack
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flutter, Kotlin/Android or Node.js, AI Integration/Automation"
                    value={devForm.skill}
                    onChange={(e) => setDevForm({ ...devForm, skill: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Weekly Capacity & Allocation Standard
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Click preset or enter custom</span>
                  </div>

                  {/* Capacity Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { pct: 100, hours: 40, label: '100% (40h)' },
                      { pct: 80, hours: 32, label: '80% (32h)' },
                      { pct: 75, hours: 30, label: '75% (30h)' },
                      { pct: 60, hours: 24, label: '60% (24h)' },
                      { pct: 50, hours: 20, label: '50% (20h)' }
                    ].map((preset) => (
                      <button
                        key={preset.pct}
                        type="button"
                        onClick={() => setDevForm({ ...devForm, capacity_pct: preset.pct, capacity_hours: preset.hours })}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          Number(devForm.capacity_pct) === preset.pct
                            ? 'bg-gradient-to-r from-[#F3701B] to-[#D30902] text-white border-transparent shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Planned Capacity (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="any"
                        required
                        value={devForm.capacity_pct}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          const autoHours = val !== '' ? Math.round((val / 100) * 40) : devForm.capacity_hours;
                          setDevForm({ ...devForm, capacity_pct: val, capacity_hours: autoHours });
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        100% = 40h/wk (Full 5 days), 80% = 32h/wk (4 days).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Capacity Hours/Week
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="80"
                        step="any"
                        required
                        value={devForm.capacity_hours}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          const autoPct = val !== '' ? Math.min(100, Math.round((val / 40) * 100)) : devForm.capacity_pct;
                          setDevForm({ ...devForm, capacity_hours: val, capacity_pct: autoPct });
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#F3701B] transition text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Standard working hours per cycle.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowEditDevModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Save Developer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
