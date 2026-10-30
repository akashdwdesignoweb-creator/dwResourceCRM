import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCSV } from '../utils/exportCsv';
import { 
  Users2, 
  Search, 
  Plus, 
  Mail, 
  Briefcase, 
  Sparkles, 
  Clock, 
  Trash2, 
  Edit3, 
  Download,
  X
} from 'lucide-react';

const deptAvatarBg = {
  MOBILE: 'bg-blue-500',
  BACKEND: 'bg-violet-500',
  FRONTEND: 'bg-sky-500',
  QA: 'bg-rose-500',
  DEVOPS: 'bg-cyan-500',
  GENERAL: 'bg-slate-500'
};

const deptBorderColor = {
  MOBILE: 'border-t-blue-500',
  BACKEND: 'border-t-violet-500',
  FRONTEND: 'border-t-sky-500',
  QA: 'border-t-rose-500',
  DEVOPS: 'border-t-cyan-500',
  GENERAL: 'border-t-slate-500'
};

export default function ResourceDirectory() {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'DEVELOPER',
    secondary_role: '',
    department: 'MOBILE',
    skill: '',
    capacity_pct: 80,
    capacity_hours: 40,
    status: 'Active',
    password: ''
  });

  // Add form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: 'DEVELOPER',
    department: 'MOBILE',
    skill: '',
    capacity_hours: 40,
    password: 'password123'
  });

  const [assignForm, setAssignForm] = useState({
    period_id: '',
    project_id: '',
    role_title: 'Developer',
    capacity_pct: 100,
    allocated_pct: 100,
    allocation_days_note: '100% (Monday - Friday)',
    pm_remarks: '',
    status: 'Active'
  });

  const [setupLoading, setSetupLoading] = useState(false);

  const fetchUsersAndMeta = (showLoading = false) => {
    if (showLoading) setLoading(true);
    else setIsRefreshing(true);

    return Promise.all([api.getUsers(), api.getProjects(), api.getPeriods()])
      .then(([usrs, projs, pers]) => {
        setUsers(usrs);
        setProjects(projs);
        setPeriods(pers);
        const cur = pers.find((p) => p.is_current) || pers[0];
        if (cur) setAssignForm((prev) => ({ ...prev, period_id: cur.id }));
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (showLoading) setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchUsersAndMeta(true);
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createUser(addForm);
      showToast(`Added ${addForm.name} to the team successfully.`, 'success');
      setShowAddModal(false);
      setAddForm({
        name: '',
        email: '',
        role: 'DEVELOPER',
        department: 'MOBILE',
        skill: '',
        capacity_hours: 40,
        password: 'password123'
      });
      if (res && res.user) {
        setUsers((prev) => [res.user, ...prev]);
      }
      fetchUsersAndMeta(false);
    } catch (err) {
      showToast(`Failed to create team member: ${err.message}`, 'error');
    }
  };

  const openEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setEditForm({
      name: targetUser.name || '',
      email: targetUser.email || '',
      role: targetUser.role || 'DEVELOPER',
      secondary_role: targetUser.secondary_role || '',
      department: targetUser.department || 'MOBILE',
      skill: targetUser.skill || '',
      capacity_pct: targetUser.capacity_pct ?? 80,
      capacity_hours: targetUser.capacity_hours ?? 40,
      status: targetUser.status || 'Active',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      if (!payload.secondary_role) payload.secondary_role = null;

      const res = await api.updateUser(editingUser.id, payload);
      showToast(`Updated ${editForm.name}'s profile successfully.`, 'success');
      setShowEditModal(false);

      // In-place state update so the team cards never unmount and viewport position is preserved
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, ...payload, ...(res && res.user ? res.user : {}) }
            : u
        )
      );
      setEditingUser(null);
      // Silent background sync
      fetchUsersAndMeta(false);
    } catch (err) {
      showToast(`Failed to update developer: ${err.message}`, 'error');
    }
  };

  const openAssignModal = (targetUser) => {
    setSelectedUserForAssign(targetUser);
    const defaultRoleTitle = targetUser.role === 'QA' 
      ? 'QA' 
      : (targetUser.role === 'MANAGER' ? 'Tech Lead' : 'Developer');
    setAssignForm((prev) => ({
      ...prev,
      role_title: defaultRoleTitle
    }));
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForAssign) return;
    try {
      await api.createAllocation({
        ...assignForm,
        user_id: selectedUserForAssign.id
      });
      setShowAssignModal(false);
      showToast(`Successfully assigned ${selectedUserForAssign.name} to project.`, 'success');
      fetchUsersAndMeta(false);
    } catch (err) {
      showToast(`Assignment failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to remove ${email}?`)) return;
    try {
      await api.deleteUser(userId);
      showToast(`User ${email} removed.`, 'success');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      fetchUsersAndMeta(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      { label: 'Employee Name', accessor: 'name' },
      { label: 'Corporate Email', accessor: 'email' },
      { label: 'Role', accessor: (u) => u.role + (u.secondary_role ? ` (${u.secondary_role})` : '') },
      { label: 'Department', accessor: 'department' },
      { label: 'Technical Skills', accessor: 'skill' },
      { label: 'Capacity Hours/Week', accessor: 'capacity_hours' },
      { label: 'Status', accessor: 'status' }
    ];
    exportToCSV(`DW_Team_Directory_${new Date().toISOString().slice(0, 10)}`, headers, filtered);
    showToast(`Exported ${filtered.length} team members to CSV.`, 'success');
  };

  const canManageUsers = hasRole('ADMIN', 'MANAGER', 'PROJECT_MANAGER');
  const isAdmin = hasRole('ADMIN');
  const isDeptManager = (user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') && user?.department && user?.department !== 'GENERAL';

  const filtered = users.filter((u) => {
    if (isDeptManager && u.department?.toUpperCase() !== user.department?.toUpperCase()) {
      return false;
    }
    const matchSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.skill || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = !selectedDept || u.department === selectedDept;
    const matchRole = !selectedRole || u.role === selectedRole;
    return matchSearch && matchDept && matchRole;
  });

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Page Header (white, border-b) */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-[#F3701B] to-[#D30902] rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-[#F3701B]/25">
                <Users2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Team Directory & Role Management</h1>
                  {user?.department && (user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                      {user.department === 'BACKEND' ? '💻' : '📱'} {user.department} Team
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {users.length} members • Role-based access control
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              title="Download Team Directory as CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download CSV</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#ED6208] hover:from-[#ED6208] hover:to-[#D30902] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#F3701B]/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar (white card below header, bg-white border-b border-slate-200 px-6 py-3) */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, skill, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent w-full sm:w-64 placeholder:text-slate-400 text-slate-900"
            />
          </div>

          {/* Department & Role filters on one row with gap-3, right-aligned */}
          <div className="flex items-center gap-3 justify-end flex-wrap">
            {isAdmin && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-700 cursor-pointer"
              >
                <option value="">All Departments</option>
                <option value="MOBILE">Mobile Team</option>
                <option value="BACKEND">Backend Team</option>
                <option value="FRONTEND">Frontend Team</option>
                <option value="QA">QA Team</option>
                <option value="GENERAL">General / Leadership</option>
              </select>
            )}

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent text-slate-700 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admins</option>
              <option value="MANAGER">Managers</option>
              <option value="DEVELOPER">Developers</option>
              <option value="QA">QA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                </div>
              </div>
              <div className="h-6 bg-slate-100 rounded-lg w-full" />
              <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
              <div className="h-8 bg-slate-100 rounded-lg w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Users2 className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No team members found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or department/role filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
          {filtered.map((member) => {
            const isSuperAdmin = member.email?.includes('kalash') || member.email?.includes('bhavik');
            const isManager = member.role === 'MANAGER' || member.role === 'PROJECT_MANAGER';
            const isDev = member.role === 'DEVELOPER' || member.role === 'QA';

            const initials = member.name
              ? member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              : 'EM';

            return (
              <div
                key={member.id}
                className={`bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#F3701B]/30 transition-all duration-200 border-t-2 ${deptBorderColor[member.department] || 'border-t-[#F3701B]'} flex flex-col justify-between overflow-hidden`}
              >
                <div className="px-5 py-4">
                  {/* Row 1 & Row 2 */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${deptAvatarBg[member.department] || 'bg-slate-500'} text-white flex items-center justify-center font-bold text-xs font-mono shadow-sm shrink-0 mt-0.5`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Row 1 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate" title={member.name}>
                            {member.name}
                          </h3>
                          {isSuperAdmin && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F3701B]/15 text-[#ED6208] border border-[#F3701B]/30 shrink-0">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {Boolean(member.must_change_password) && member.role !== 'ADMIN' && (
                            <span 
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                              title="Initial temporary password active. User must set new password on login."
                            >
                              Initial Pass
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                            {member.role?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono truncate" title={member.email}>
                          {member.email}
                        </span>
                        {member.secondary_role && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                            title={`Secondary Role: ${member.secondary_role}`}
                          >
                            +{member.secondary_role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-3 border-t border-slate-100" />

                  {/* Row 3: 3 mini stat chips */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80 truncate"
                      title={`Department: ${member.department || 'GENERAL'}`}
                    >
                      {member.department || 'GENERAL'}
                    </div>
                    <div
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20 truncate"
                      title={`Planned Capacity: ${member.capacity_pct ?? 80}% (${member.capacity_hours ?? 40}h/wk)`}
                    >
                      {member.capacity_pct ?? 80}% Cap
                    </div>
                    <div
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border truncate ${
                        member.status === 'On Leave'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : member.status === 'Inactive'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                      title={`Status: ${member.status || 'Active'}`}
                    >
                      {member.status || 'Active'}
                    </div>
                  </div>

                  {/* Row 4: Skills text truncated */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate" title={member.skill || 'General'}>
                      {member.skill || 'General engineering'}
                    </span>
                  </div>

                  {/* Allocation bar & Current projects */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/70 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Allocated: <strong className="text-slate-800 font-mono">{member.current_allocation_pct || 0}%</strong></span>
                    <span className="truncate max-w-[140px]" title={member.current_projects || 'Bench'}>
                      {member.current_projects || <span className="italic text-slate-400">Bench</span>}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (member.current_allocation_pct || 0) > 100
                          ? 'bg-rose-500'
                          : (member.current_allocation_pct || 0) >= 70
                          ? 'bg-emerald-500'
                          : (member.current_allocation_pct || 0) > 0
                          ? 'bg-[#F3701B]'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${Math.min(member.current_allocation_pct || 0, 100)}%` }}
                    />
                  </div>

                  {/* Footer: Action buttons row */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {(isAdmin || (canManageUsers && isDev)) && (
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
                        title="Edit member details"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>
                    )}

                    {canManageUsers && (isDev || isManager) && (
                      <button
                        type="button"
                        onClick={() => openAssignModal(member)}
                        className="px-2.5 py-1.5 text-[#F3701B] hover:text-[#ED6208] bg-orange-50 hover:bg-orange-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-orange-200 cursor-pointer"
                        title="Assign to project"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Assign</span>
                      </button>
                    )}

                    {isAdmin && !isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(member.id, member.email)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add Team Member</h2>
                  <p className="text-xs text-slate-500">
                    {isAdmin ? 'Admins can create Managers and Developers.' : 'Managers can add Developers to their team.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@dw.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Role
                    </label>
                    <select
                      value={addForm.role}
                      onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                    >
                      {isAdmin && <option value="MANAGER">Manager</option>}
                      <option value="DEVELOPER">Developer</option>
                      <option value="QA">QA Specialist</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Department
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={!isAdmin && user?.department ? user.department : addForm.department}
                      onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                    >
                      <option value="MOBILE">Mobile Team</option>
                      <option value="BACKEND">Backend Team</option>
                      <option value="FRONTEND">Frontend Team</option>
                      <option value="QA">QA</option>
                      {isAdmin && <option value="GENERAL">General</option>}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Primary Skill & Tech Stack
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flutter, iOS, React, Node.js..."
                    value={addForm.skill}
                    onChange={(e) => setAddForm({ ...addForm, skill: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition shadow-sm"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Developer to Project Modal */}
      {showAssignModal && selectedUserForAssign && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Assign Project: {selectedUserForAssign.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Set project, allocated timeline & working days, and enter work directives.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Weekly Allocation Cycle
                  </label>
                  <select
                    required
                    value={assignForm.period_id}
                    onChange={(e) => setAssignForm({ ...assignForm, period_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.is_current ? '★ (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Target Project
                  </label>
                  <select
                    required
                    value={assignForm.project_id}
                    onChange={(e) => setAssignForm({ ...assignForm, project_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.account})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Assignment Role / Technical Designation
                  </label>
                  <select
                    value={assignForm.role_title}
                    onChange={(e) => setAssignForm({ ...assignForm, role_title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                  >
                    <option value="Developer">Developer (Core Features)</option>
                    <option value="Tech Lead">Tech Lead (Technical Leadership & Architecture)</option>
                    <option value="Hands-On Manager">Hands-On Engineering Manager</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="QA">QA Specialist</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Designating as <strong>Tech Lead</strong> gives this member authority to enter Tech Lead Notes and manage technical direction.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Allocated (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={assignForm.allocated_pct}
                      onChange={(e) => setAssignForm({ ...assignForm, allocated_pct: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Working Days Breakdown
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 40% (Tuesday, Wednesday)"
                      value={assignForm.allocation_days_note}
                      onChange={(e) => setAssignForm({ ...assignForm, allocation_days_note: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Work Directives & Tasks (PM Remarks)
                  </label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Describe the exact deliverables and work the developer will be doing in this timeline..."
                    value={assignForm.pm_remarks}
                    onChange={(e) => setAssignForm({ ...assignForm, pm_remarks: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition shadow-sm"
                >
                  Save & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Developer / Team Member Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3701B]/10 rounded-xl flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5 text-[#ED6208]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Edit Team Member</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3701B]/10 text-[#ED6208] border border-[#F3701B]/20">
                      ID #{editingUser.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Update role designations, technical skills, department, and weekly capacity.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!isAdmin}
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Primary Role
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 disabled:bg-slate-100 cursor-pointer"
                    >
                      <option value="DEVELOPER">Developer (Core Engineering)</option>
                      <option value="TECH_LEAD">Tech Lead</option>
                      <option value="MANAGER">Manager / Engineering Lead</option>
                      <option value="QA">Quality Analyst (QA)</option>
                      <option value="DEVOPS">DevOps Engineer</option>
                      <option value="ADMIN">Super Admin</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Managers are also developers; developers can also lead projects.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Secondary Role (Dual-Role)
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={editForm.secondary_role || ''}
                      onChange={(e) => setEditForm({ ...editForm, secondary_role: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 disabled:bg-slate-100 cursor-pointer"
                    >
                      <option value="">None (Single Role)</option>
                      <option value="DEVOPS">DevOps (e.g. Deepanshu Tyagi)</option>
                      <option value="TECH_LEAD">Tech Lead</option>
                      <option value="DEVELOPER">Developer</option>
                      <option value="QA">QA Specialist</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Grants secondary permissions (e.g. DevOps DB backup management).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Department
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 disabled:bg-slate-100 cursor-pointer"
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
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Account Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 cursor-pointer"
                    >
                      <option value="Active">Active (Available for Work)</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Technical Skills & Stack
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flutter, Kotlin/Android or Node.js, AI Integration/Automation"
                    value={editForm.skill}
                    onChange={(e) => setEditForm({ ...editForm, skill: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 font-medium placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Comma-separated list of programming languages, frameworks, and skillsets.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Weekly Capacity & Allocation Standard
                    </label>
                    <span className="text-[11px] text-slate-400">Click preset or enter custom</span>
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
                        onClick={() => setEditForm({ ...editForm, capacity_pct: preset.pct, capacity_hours: preset.hours })}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          Number(editForm.capacity_pct) === preset.pct
                            ? 'bg-gradient-to-r from-[#F3701B] to-[#D30902] text-white border-transparent shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                        Planned Capacity (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="any"
                        required
                        value={editForm.capacity_pct}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          const autoHours = val !== '' ? Math.round((val / 100) * 40) : editForm.capacity_hours;
                          setEditForm({ ...editForm, capacity_pct: val, capacity_hours: autoHours });
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        100% = 40h/wk (Full 5 days), 80% = 32h/wk (4 days).
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                        Capacity Hours/Week
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="80"
                        step="any"
                        required
                        value={editForm.capacity_hours}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          const autoPct = val !== '' ? Math.min(100, Math.round((val / 40) * 100)) : editForm.capacity_pct;
                          setEditForm({ ...editForm, capacity_hours: val, capacity_pct: autoPct });
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Standard working hours per cycle.
                      </p>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                        Reset User Password <span className="text-slate-400 lowercase font-normal">(optional)</span>
                      </label>
                      <span className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded font-medium">
                        Prompts user to set new password on login
                      </span>
                    </div>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current, or enter new temporary password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition text-slate-900 placeholder:text-slate-400"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Entering a password will update their credentials and mark their account to choose a personal password upon their next sign-in.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
