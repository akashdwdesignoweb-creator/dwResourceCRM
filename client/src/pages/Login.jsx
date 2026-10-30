import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DWLogo from '../components/DWLogo';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  KeyRound, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  ChevronLeft,
  Sparkles,
  Fingerprint,
  ArrowUpRight,
  X,
  HelpCircle
} from 'lucide-react';

export default function Login() {
  const { login, verifyOtp, resendOtp } = useAuth();
  
  // Step state: 'CREDENTIALS' or 'OTP'
  const [step, setStep] = useState('CREDENTIALS');
  const [showForgotModal, setShowForgotModal] = useState(false);
  
  // Credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state
  const [tempToken, setTempToken] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(600); // 10 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // General UI state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // References for the 6 OTP input boxes
  const inputRefs = useRef([]);

  // Timer countdowns for OTP expiration and resend cooldown
  useEffect(() => {
    let interval = null;
    if (step === 'OTP' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  // Autofocus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'OTP' && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // Step 1: Handle Email + Password Submission
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await login(email, password);
      if (res && res.mfa_required) {
        setTempToken(res.temp_token);
        setEmailMasked(res.email_masked || email);
        setDevOtp(res.dev_otp || '');
        if (res.dev_otp) {
          console.info('[Enterprise MFA Security Gateway] Verification code dispatched:', res.dev_otp);
        }
        setOtpTimer(res.expires_in_seconds || 600);
        setResendCooldown(25);
        setOtpDigits(['', '', '', '', '', '']);
        setStep('OTP');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Handle OTP input changes
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    setError('');

    // Advance focus if digit entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (newDigits.every((d) => d !== '')) {
      const fullOtp = newDigits.join('');
      executeOtpVerification(fullOtp);
    }
  };

  // Handle backspace key navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
      executeOtpVerification(pasted);
    }
  };

  // Execute OTP Verification
  const executeOtpVerification = async (codeToVerify) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await verifyOtp(tempToken, code);
      // On success, AuthContext navigates to dashboard
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await resendOtp(tempToken);
      if (res && res.temp_token) {
        if (res.dev_otp) {
          setDevOtp(res.dev_otp);
          console.info('[Enterprise MFA Security Gateway] Resent verification code:', res.dev_otp);
        }
        setOtpTimer(res.expires_in_seconds || 600);
        setResendCooldown(30);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessMsg('A new verification code has been dispatched.');
        setTimeout(() => setSuccessMsg(''), 4000);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format seconds to MM:SS
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ============================================================ */}
      {/* LEFT PANEL — Designoweb Midnight Navy Brand Panel             */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* LEFT PANEL — Designoweb Gradient & Halftone Pattern Hero       */}
      {/* ============================================================ */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between relative overflow-hidden select-none p-10 lg:p-14 text-white"
        style={{
          background: 'linear-gradient(80.78deg, #DBB695 -1.57%, #E37739 5.49%, #E3570E 14.14%, #D64209 25.88%, #BE1C01 36.88%, #A30802 46.29%, #910802 54.71%, #770703 62.39%, #5E0503 71.47%, #400505 80.64%, #0D0101 89.7%)',
        }}
      >
        {/* Halftone Dot Matrix Pattern Overlay from Designoweb Hero */}
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-90"
          style={{
            backgroundImage: 'url(/dw-pattern.png)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '960px auto',
            backgroundPosition: 'right -80px center',
          }}
        />

        {/* Top: Logo + Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DWLogo 
              className="h-7 w-auto flex-shrink-0 drop-shadow" 
              idPrefix="login_hero_logo" 
            />
            <span className="text-white font-bold text-lg tracking-tight lowercase">
              designoweb
            </span>
            <div className="h-4 w-px bg-white/25" />
            <span className="text-white/90 font-medium text-xs tracking-wider uppercase">
              Resource CRM
            </span>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-black/25 text-white/90 border border-white/20 backdrop-blur-xs">
            Enterprise Suite
          </span>
        </div>

        {/* Center: Hero Typography Matching Designoweb Hero Section */}
        <div className="relative z-10 my-auto py-10 max-w-xl">
          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-normal text-white tracking-tight leading-[1.08]">
            Designoweb <br />
            <span className="font-editorial italic font-normal tracking-tight text-white drop-shadow-sm">
              resource management
            </span> <br />
            system
          </h1>

          <p className="mt-6 text-sm sm:text-base text-white/85 leading-relaxed max-w-lg font-light drop-shadow-xs">
            From agile sprint capacity to cross-functional engineering allocations,
            we help technical leaders and teams deliver scalable, market-ready products.
          </p>

          {/* Action pill matching "Book a Strategy Call [↗]" style */}
          <div className="mt-8">
            <div className="inline-flex items-center gap-3 bg-[#FFFBF6] text-slate-900 px-5 py-2.5 rounded-xl shadow-xl shadow-black/20 font-medium text-sm transition-transform hover:scale-[1.02] cursor-default">
              <span className="font-semibold text-slate-900 tracking-tight">Enterprise Resource Matrix</span>
              <span className="w-6 h-6 rounded-lg bg-[#0D0101] flex items-center justify-center text-white">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL — Login form                                     */}
      {/* ============================================================ */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">

          {/* DW logo for mobile / right panel header */}
          <div className="flex items-center gap-2.5 mb-8">
            <DWLogo 
              className="h-6 w-auto flex-shrink-0" 
              idPrefix="login_form_logo" 
            />
            <span className="text-slate-800 font-bold text-sm tracking-tight">Resource CRM</span>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* PHASE 1: EMAIL & PASSWORD CREDENTIALS                    */}
          {/* ======================================================== */}
          {step === 'CREDENTIALS' && (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Enter your corporate credentials provisioned by your Super Admin
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
                {/* Email field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                      placeholder="name@dw.com"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Password
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">5-Attempt Lockout Active</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F3701B] focus:border-transparent transition placeholder:text-slate-400 text-slate-900"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-slate-400">First time or reset password?</span>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[#F3701B] hover:text-[#D30902] font-semibold transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-[#F3701B] to-[#ED6208] hover:from-[#ED6208] hover:to-[#D30902] text-white text-sm font-semibold rounded-lg shadow-sm shadow-[#F3701B]/25 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to CRM</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ======================================================== */}
          {/* PHASE 2: MULTI-FACTOR OTP VERIFICATION                   */}
          {/* ======================================================== */}
          {step === 'OTP' && (
            <div className="space-y-5 animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setStep('CREDENTIALS');
                  setDevOtp('');
                }}
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to sign in</span>
              </button>

              <div>
                <div className="inline-flex items-center justify-center p-2.5 bg-[#F3701B]/10 border border-[#F3701B]/20 rounded-xl mb-3">
                  <ShieldCheck className="w-7 h-7 text-[#ED6208]" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Enter the 6-digit security code dispatched to{' '}
                  <span className="font-semibold text-slate-700">{emailMasked}</span>
                </p>
              </div>

              {/* Local Security Gateway OTP Helper */}
              {devOtp && (
                <div className="bg-[#F3701B]/10 border border-[#F3701B]/20 rounded-lg p-3 flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-600 font-medium">Gateway Code:</span>
                    <strong className="font-mono text-sm tracking-wider text-[#0A0F23] font-bold bg-white px-2 py-0.5 rounded border border-[#F3701B]/20">
                      {devOtp}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtp.split('');
                      setOtpDigits(digits);
                      executeOtpVerification(devOtp);
                    }}
                    className="text-[11px] font-bold text-[#ED6208] bg-white hover:bg-[#F3701B]/10 hover:text-[#D30902] border border-[#F3701B]/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Quick Fill &amp; Verify
                  </button>
                </div>
              )}

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-between gap-2 my-2" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-xl font-bold font-mono border-2 border-slate-200 rounded-lg focus:border-[#F3701B] focus:ring-2 focus:ring-[#F3701B]/20 focus:outline-none transition-colors bg-slate-50 hover:bg-white text-slate-800"
                  />
                ))}
              </div>

              {/* Countdown & Resend */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Expires in{' '}
                    <strong className="font-mono text-slate-700">{formatTimer(otpTimer)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || submitting}
                  className="font-semibold text-[#ED6208] hover:text-[#D30902] disabled:text-slate-400 transition-colors"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              {/* Submit Verification Button */}
              <button
                type="button"
                onClick={() => executeOtpVerification()}
                disabled={submitting || otpDigits.some((d) => !d)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-[#F3701B] to-[#D30902] hover:from-[#ED6208] hover:to-[#B80802] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify &amp; Access CRM</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Forgot Password Guidance Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F3701B] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Password Reset Policy</h3>
                  <p className="text-xs text-slate-500">Corporate security & access recovery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                <p className="font-semibold text-amber-950 mb-1">Automated Email Reset is Restricted</p>
                <p className="text-amber-800">
                  To safeguard company resources and proprietary engineering data, developers and team members cannot self-reset passwords via email.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">How to recover your access:</p>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <li>
                    <span className="font-medium text-slate-800">Contact your Super Admin</span>:
                    <div className="mt-1 ml-4 space-y-1 font-semibold text-slate-900">
                      <div>• Kalash Pachauri <span className="font-normal text-slate-500">(Super Admin)</span></div>
                      <div>• Bhavik Agarwal <span className="font-normal text-slate-500">(Super Admin)</span></div>
                    </div>
                  </li>
                  <li className="mt-2">
                    The Super Admin will change/reset your credentials on their administrative console and provide you with a temporary password.
                  </li>
                  <li>
                    When you sign in with that temporary password, the system will prompt you to set your new personal password.
                  </li>
                </ol>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-gradient-to-r from-[#F3701B] to-[#D30902] text-white text-xs font-semibold rounded-lg hover:from-[#ED6208] hover:to-[#B80802] transition shadow-sm"
                >
                  Understood, Return to Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
