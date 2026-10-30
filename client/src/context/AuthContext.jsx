import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [permissions, setPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('permissions');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('permissions');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then((res) => {
          if (res && res.user) {
            setUser(res.user);
            setPermissions(res.permissions);
            localStorage.setItem('user', JSON.stringify(res.user));
            localStorage.setItem('permissions', JSON.stringify(res.permissions));
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.mfa_required) {
      return res; // Signal that MFA OTP verification is required
    }
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('permissions', JSON.stringify(res.permissions));
    setUser(res.user);
    setPermissions(res.permissions);
    return res.user;
  };

  const verifyOtp = async (tempToken, otp) => {
    const res = await api.verifyOtp(tempToken, otp);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    localStorage.setItem('permissions', JSON.stringify(res.permissions));
    setUser(res.user);
    setPermissions(res.permissions);
    return res.user;
  };

  const resendOtp = async (tempToken) => {
    return await api.resendOtp(tempToken);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.changePassword({ current_password: currentPassword, new_password: newPassword });
    if (res && res.user) {
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    setUser(null);
    setPermissions(null);
  };

  // Helper function to check role-based column edit permission
  const canEditField = (entity, fieldName) => {
    if (!user || !permissions) return false;
    if (user.role === 'ADMIN') return true;

    if (entity === 'allocations') {
      return (permissions.allowedAllocationFields || []).includes(fieldName);
    }
    if (entity === 'projects') {
      if ((user.secondary_role === 'DEVOPS' || user.role === 'DEVOPS') && ['production_deployment_channel', 'staging_deployment_channel', 'database_backup_url'].includes(fieldName)) {
        return true;
      }
      if ((user.secondary_role === 'QA' || user.role === 'QA') && fieldName === 'qa_sheet_url') {
        return true;
      }
      return (permissions.allowedProjectFields || []).includes(fieldName);
    }
    if (entity === 'scorecards') {
      return (permissions.allowedScorecardFields || []).includes(fieldName);
    }
    if (entity === 'devops') {
      if (user.secondary_role === 'DEVOPS' || user.role === 'DEVOPS') return true;
      return (permissions.allowedDevOpsFields || []).includes(fieldName);
    }
    return false;
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role) || (user.secondary_role && roles.includes(user.secondary_role));
  };

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, verifyOtp, resendOtp, changePassword, logout, canEditField, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
