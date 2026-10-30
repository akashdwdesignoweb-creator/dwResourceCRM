import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Check, 
  X, 
  ArrowRight, 
  LogOut, 
  RefreshCw, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import DWLogo from '../components/DWLogo';

export default function ForceChangePasswordScreen() {
  const { user, changePassword, logout } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password rule checks
  const isMinLength = newPassword.trim().length >= 6;
  const isNotDefault = newPassword.trim() !== '' && 
    newPassword.trim().toLowerCase() !== 'password123' && 
    newPassword.trim().toLowerCase() !== 'password@123';
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword.length > 0 && isMinLength && isNotDefault && isMatching;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isMinLength) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (!isNotDefault) {
      setError('New password cannot be the temporary default password (password123). Please choose a unique password.');
      return;
    }

    if (!isMatching) {
      setError('Passwords do not match. Please verify and retype.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword.trim());
      showToast('Password updated successfully! Welcome to your CRM workspace.', 'success');
    } catch (err) {
      setError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn my-auto max-h-[92vh] flex flex-col">
        
        {/* Card Banner */}
        <div className="bg-gradient-to-r from-[#0D1226] via-[#141B34] to-[#1C2548] p-5 sm:p-6 text-white border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
              <ShieldCheck className="w-3 h-3 text-[#F3701B]" />
              Mandatory Setup Required
            </span>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition border border-white/10"
              title="Sign out of CRM"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#F3701B]" />
            Set Your Personal Password
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Hello <strong className="text-white">{user?.name}</strong>. Because this is your initial sign-in (or your credentials were reset by an administrator), 
            company policy requires you to set your own permanent password before accessing your dashboard.
          </p>
        </div>

        {/* Form Area */}
        <div className="p-6 sm:p-7 overflow-y-auto">
            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Current Temporary Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current / Temporary Initial Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter initial password provisioned by admin"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Personal Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retype your new password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  {isMinLength ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                  )}
                  <span className={isMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    At least 6 characters long
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isNotDefault ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                  )}
                  <span className={isNotDefault ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    Cannot be the initial default password (password123)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isMatching ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                  )}
                  <span className={isMatching ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    Passwords match exactly
                  </span>
                </div>
              </div>

              {/* Recovery Policy Callout */}
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-950">Important Notice on Password Recovery:</p>
                  <p className="mt-0.5 text-amber-800">
                    Automated email reset is disabled for security. If you ever forget this password in the future, you must 
                    contact your <span className="font-semibold">Super Admin (Kalash Pachauri or Bhavik Agarwal)</span> to reset it on their console.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#F3701B]/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Set Password &amp; Unlock CRM Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
  );
}
