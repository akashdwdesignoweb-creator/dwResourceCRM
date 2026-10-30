const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = (rawApiUrl && !rawApiUrl.includes('yourdomain.com')) ? rawApiUrl : '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  verifyOtp: (temp_token, otp) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ temp_token, otp }) }),
  resendOtp: (temp_token) => request('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ temp_token }) }),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  getSecurityEvents: () => request('/security/events'),
  getSecurityStats: () => request('/security/stats'),
  unlockUser: (id) => request(`/security/unlock-user/${id}`, { method: 'POST' }),
  toggleUserMFA: (id) => request(`/security/toggle-mfa/${id}`, { method: 'PATCH' }),
  getMe: () => request('/auth/me'),
  getDashboardStats: () => request('/dashboard/stats'),
  getPeriods: () => request('/periods'),
  createPeriod: (body) => request('/periods', { method: 'POST', body: JSON.stringify(body) }),
  setCurrentPeriod: (id) => request(`/periods/${id}/set-current`, { method: 'PATCH' }),
  deletePeriod: (id) => request(`/periods/${id}`, { method: 'DELETE' }),
  autoCreateNextPeriod: () => request('/periods/auto-create-next', { method: 'POST' }),
  getAllocations: (params) => {
    const q = params ? new URLSearchParams(params).toString() : '';
    return request(`/allocations${q ? `?${q}` : ''}`);
  },
  getMyAllocations: (period_id) => request(`/allocations/my${period_id ? `?period_id=${period_id}` : ''}`),
  updateAllocation: (id, body) => request(`/allocations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createAllocation: (body) => request('/allocations', { method: 'POST', body: JSON.stringify(body) }),
  deleteAllocation: (id) => request(`/allocations/${id}`, { method: 'DELETE' }),
  getProjects: () => request('/projects'),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getUsers: (params) => {
    const q = params ? new URLSearchParams(params).toString() : '';
    return request(`/users${q ? `?${q}` : ''}`);
  },
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  quickSetupDepartments: () => request('/users/quick-setup-departments', { method: 'POST' }),
  getLeadership: () => request('/leadership'),
  getDevOps: () => request('/devops'),
  updateDevOps: (id, body) => request(`/devops/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getScorecards: (params) => {
    const q = params ? new URLSearchParams(params).toString() : '';
    return request(`/scorecards${q ? `?${q}` : ''}`);
  },
  getMyScorecards: () => request('/scorecards?my=true'),
  updateScorecard: (id, body) => request(`/scorecards/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  toggleScorecardAccess: (id) => request(`/scorecards/${id}/toggle-access`, { method: 'PATCH' }),
  submitSelfScorecard: (id, body) => request(`/scorecards/${id}/self-eval`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAuditLogs: () => request('/audit-logs'),
  purgeOldAuditLogs: () => request('/audit-logs/purge', { method: 'POST' }),
};


