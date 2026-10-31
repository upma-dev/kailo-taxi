import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPinned,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../../services/adminService';
import { useSettings } from '../../../../shared/context/SettingsContext';
import { useLandingContent } from '../../../../shared/hooks/useLandingContent';
import { setUnifiedAdminSession } from '../../services/adminSession';
import taxiImg from '@/assets/3d images/AutoCab/taxi.png';
import busImg from '@/assets/3d images/AutoCab/bus.png';

const TEAL = '#0F766E';
const TEAL_DARK = '#0A4A46';
const LIME = '#C6F432';
const NAVY = '#14213D';

const HIGHLIGHTS = [
  { Icon: MapPinned, text: 'Live trips, zones and fleet on one map' },
  { Icon: Users, text: 'Drivers, owners and riders in one place' },
  { Icon: Wallet, text: 'Payouts, wallets and earnings at a glance' },
];

const inputClass =
  'w-full rounded-2xl border border-[#E1E8E5] bg-white py-3.5 pl-12 pr-4 text-[15px] font-semibold text-[#14213D] outline-none transition placeholder:font-medium placeholder:text-[#14213D]/35 focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 disabled:opacity-60';

function Field({ icon: Icon, right, ...inputProps }) {
  return (
    <div className="group relative">
      <Icon
        size={19}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#14213D]/35 transition group-focus-within:text-[#0F766E]"
      />
      <input {...inputProps} className={`${inputClass} ${right ? 'pr-12' : ''}`} />
      {right}
    </div>
  );
}

function PrimaryButton({ loading, children, ...props }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black text-[#14213D] shadow-[0_14px_26px_-10px_rgba(15,118,110,0.6)] transition active:translate-y-px disabled:opacity-70"
      style={{ background: `linear-gradient(135deg, ${LIME}, #A8E01F)` }}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : children}
    </button>
  );
}

function BrandPanel({ appName, appLogo, screen = {} }) {
  return (
    <div
      className="relative hidden w-[46%] flex-col justify-between overflow-hidden p-10 text-white lg:flex"
      style={{ background: `linear-gradient(160deg, #14B8A6 0%, ${TEAL} 45%, ${TEAL_DARK} 100%)` }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C6F432]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#052E2B]/40 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 h-52 w-52 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full border border-white/5" />

      <div className="relative z-10 flex items-center gap-3">
        <img src={appLogo} alt="" className="h-11 w-11 rounded-2xl object-cover shadow-lg" />
        <span className="text-[22px] font-black tracking-tight">{appName}</span>
      </div>

      <div className="relative z-10">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
          Admin console
        </span>
        <h1 className="mt-4 text-[38px] font-black leading-[1.08] tracking-tight">
          {screen.title || 'Every ride,'}
          <br />
          <span style={{ color: LIME }}>{screen.highlight || 'under control.'}</span>
        </h1>
        <ul className="mt-6 space-y-3">
          {HIGHLIGHTS.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-[14px] font-semibold text-white/85">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                <Icon size={16} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* animated road with traffic */}
      <div className="relative z-10 h-24">
        <span className="absolute inset-x-0 bottom-3 h-[3px] rounded-full bg-white/15" />
        <motion.span
          className="absolute bottom-3 left-0 h-[3px] w-[200%]"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(198,244,50,0.9) 0 22px, transparent 22px 52px)' }}
          animate={{ x: [0, -52] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.img
          src={taxiImg}
          alt=""
          aria-hidden="true"
          initial={{ x: -200 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 45, damping: 14 }}
          className="absolute bottom-4 left-[14%] h-[66px] w-auto object-contain drop-shadow-[0_14px_10px_rgba(0,0,0,0.4)]"
        />
        <motion.img
          src={busImg}
          alt=""
          aria-hidden="true"
          className="absolute bottom-5 h-[58px] w-auto object-contain opacity-90 drop-shadow-[0_12px_8px_rgba(0,0,0,0.35)]"
          initial={{ x: 480 }}
          animate={{ x: [480, -160] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear', delay: 1.5 }}
          style={{ left: 0 }}
        />
      </div>
    </div>
  );
}

const AdminLogin = () => {
  const { settings } = useSettings();
  const { content: landing } = useLandingContent();
  const [view, setView] = useState('login'); // 'login' | 'forgot-email' | 'verify-otp' | 'reset-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const appLogo = settings.general?.logo || settings.customization?.logo || '/kailo-taxi-logo.png';
  const appName = settings.general?.app_name || 'Kailo Taxi';

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const messageFrom = (err, fallback) => {
    const raw = err?.response?.data?.message || err?.message || '';
    if (typeof raw === 'string' && (raw.includes('Invalid URL') || raw.includes('missing "//"'))) {
      return 'Unable to connect to server. Please check your network connection.';
    }
    return raw || fallback;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      const response = await adminService.login({ email, password });
      setUnifiedAdminSession({
        token: response?.data?.token || '',
        user: response?.data?.admin || {},
        refreshToken: response?.data?.refreshToken || null,
      });
      setTimeout(() => navigate('/taxi/admin/dashboard'), 300);
    } catch (err) {
      console.error('[Taxi AdminLogin Submit Error]', err);
      setError(messageFrom(err, 'Unable to complete admin login.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e?.preventDefault?.();
    setIsLoading(true);
    resetMessages();
    try {
      await adminService.forgotPassword(email);
      setSuccess('OTP has been sent to your email.');
      setView('verify-otp');
    } catch (err) {
      setError(messageFrom(err, 'Could not send OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();
    try {
      await adminService.verifyResetOtp({ email, otp });
      setView('reset-password');
    } catch (err) {
      setError(messageFrom(err, 'Invalid OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    resetMessages();
    try {
      await adminService.resetPassword({ email, otp, password: newPassword });
      setSuccess('Password changed successfully. Please sign in.');
      setView('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(messageFrom(err, 'Could not reset password.'));
    } finally {
      setIsLoading(false);
    }
  };

  const heading = {
    login: ['Welcome back', 'Sign in to manage your fleet and operations.'],
    'forgot-email': ['Forgot password?', 'Enter your admin email and we will send you a code.'],
    'verify-otp': ['Check your email', `Enter the 6-digit code sent to ${email || 'your email'}.`],
    'reset-password': ['Set a new password', 'Choose a strong password for your account.'],
  }[view];

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <Field
        icon={Mail}
        type="email"
        placeholder="Email address"
        required
        disabled={isLoading}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="off"
        name="admin-email"
      />
      <Field
        icon={Lock}
        type={showPassword ? 'text' : 'password'}
        placeholder="Password"
        required
        disabled={isLoading}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        name="admin-password"
        right={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#14213D]/40 transition hover:text-[#0F766E]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setView('forgot-email');
            resetMessages();
          }}
          className="text-[12.5px] font-extrabold text-[#0F766E] hover:underline"
        >
          Forgot password?
        </button>
      </div>
      <PrimaryButton loading={isLoading}>
        Sign in <ArrowRight size={18} strokeWidth={3} />
      </PrimaryButton>
    </form>
  );

  const renderForgotEmailForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <Field
        icon={Mail}
        type="email"
        placeholder="Registered email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PrimaryButton loading={isLoading}>
        Send OTP <ArrowRight size={18} strokeWidth={3} />
      </PrimaryButton>
      <button
        type="button"
        onClick={() => setView('login')}
        className="flex w-full items-center justify-center gap-2 text-[13px] font-bold text-[#14213D]/50 transition hover:text-[#14213D]"
      >
        <ArrowLeft size={16} /> Back to sign in
      </button>
    </form>
  );

  const renderVerifyOtpForm = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <div className="group relative">
        <KeyRound
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#14213D]/35 group-focus-within:text-[#0F766E]"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Enter OTP"
          required
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className={`${inputClass} text-center text-2xl font-extrabold ${otp ? 'tracking-[0.5em]' : ''}`}
        />
      </div>
      <PrimaryButton loading={isLoading}>
        Verify OTP <ArrowRight size={18} strokeWidth={3} />
      </PrimaryButton>
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setView('forgot-email')}
          className="text-[12.5px] font-bold text-[#14213D]/50 hover:text-[#14213D]"
        >
          Change email
        </button>
        <button type="button" onClick={handleForgotPassword} className="text-[12.5px] font-extrabold text-[#0F766E] hover:underline">
          Resend OTP
        </button>
      </div>
    </form>
  );

  const renderResetPasswordForm = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <Field
        icon={Lock}
        type="password"
        placeholder="New password"
        required
        minLength={5}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Field
        icon={Lock}
        type="password"
        placeholder="Confirm new password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <PrimaryButton loading={isLoading}>
        Reset password <CheckCircle2 size={18} strokeWidth={3} />
      </PrimaryButton>
    </form>
  );

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAF7] font-sans">
      <BrandPanel appName={appName} appLogo={appLogo} screen={landing?.appScreens?.admin} />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-8">
        {/* mobile header gradient */}
        <div
          className="absolute inset-x-0 top-0 h-56 rounded-b-[36px] lg:hidden"
          style={{ background: `linear-gradient(160deg, #14B8A6 0%, ${TEAL} 50%, ${TEAL_DARK} 100%)` }}
        />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#C6F432]/15 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          <div className="mb-5 flex items-center gap-3 lg:hidden">
            <img src={appLogo} alt="" className="h-11 w-11 rounded-2xl object-cover shadow-lg" />
            <span className="text-[20px] font-black tracking-tight text-white">{appName}</span>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-[#E8EEEB] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(10,74,70,0.45)] sm:p-8">
            {isLoading && (
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.6 }}
                className="absolute left-0 top-0 h-1"
                style={{ backgroundColor: LIME }}
              />
            )}

            <div className="mb-6">
              <span
                className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.18em]"
                style={{ backgroundColor: '#E3F6F2', color: TEAL }}
              >
                <ShieldCheck size={13} /> Secure admin access
              </span>
              <h2 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: NAVY }}>
                {heading[0]}
              </h2>
              <p className="mt-1 text-[13.5px] font-medium text-[#14213D]/55">{heading[1]}</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-600"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-[13px] font-bold leading-relaxed">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-4 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <p className="text-[13px] font-bold leading-relaxed">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.2 }}
              >
                {view === 'login' && renderLoginForm()}
                {view === 'forgot-email' && renderForgotEmailForm()}
                {view === 'verify-otp' && renderVerifyOtpForm()}
                {view === 'reset-password' && renderResetPasswordForm()}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-5 text-center text-[11.5px] font-semibold text-[#14213D]/40">
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
