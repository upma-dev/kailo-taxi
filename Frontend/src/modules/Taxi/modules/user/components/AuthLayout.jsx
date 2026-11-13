import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Car } from 'lucide-react';
import heroImg from '@/assets/landing/hero.png';
import { useSettings } from '../../../shared/context/SettingsContext';
import { useLandingContent } from '../../../shared/hooks/useLandingContent';

import LoginBannerCarousel from '@/shared/components/auth/LoginBanners';
import { ServiceTicker } from '@/shared/components/auth/LoginShowcase';
import useLoginData from '@/shared/components/auth/useLoginData';
import mobilityBanner from '@/assets/images/mobility-banner-cartoony.png';

const AuthLayout = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const { config } = useLoginData('user');
  const accent = config.accent_color;
  const { settings } = useSettings();
  const { content: landing } = useLandingContent();
  const screen = landing?.appScreens?.user || {};
  const appName = settings.general?.app_name || 'Kailo Taxi';
  const appLogo = settings.general?.logo || settings.customization?.logo || settings.general?.favicon || '/kailo-taxi-logo.png';

  const handleClose = () => {
    navigate('/taxi/user', { replace: true });
  };

  return (
    <div className="h-screen w-screen bg-[#F8F9FA] flex flex-col lg:flex-row font-display overflow-hidden fixed inset-0">
      {/* Left side (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-between lg:w-[45%] xl:w-[50%] bg-gradient-to-br from-[#0F766E] via-[#0D625C] to-[#0A4A46] p-12 text-white relative overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.1)] z-10">
        {/* Top Header Actions (Single Back Button) */}
        <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-start">
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Subtle orange accent glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-[#C6F432]/10 rounded-full blur-[120px]" />
          <div className="absolute top-[60%] right-[10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col justify-between mt-12">
          <div className="flex items-center gap-4 mb-16">
            {appLogo ? (
              <img
                src={appLogo}
                alt={`${appName} logo`}
                className="w-12 h-12 rounded-xl object-contain bg-white shadow-lg p-1"
              />
            ) : (
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-6 h-6 bg-[#1A1A1A] rounded-md"></div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-tight">{appName}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#C6F432] text-[#14213D] text-xs font-black uppercase tracking-widest flex items-center gap-1">
                <Car size={12} />
                TAXI
              </span>
            </div>
          </div>
          
          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-5xl font-bold tracking-tight leading-[1.1] mb-6">
                {screen.title || 'Move with'} <br/>
                <span className="text-[#C6F432]">{screen.highlight || 'Safety & Style.'}</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-12">
                {screen.subtitle || `Experience the next generation of urban mobility with ${appName}. Reliable, fast, and always at your service.`}
              </p>
              {screen.image && <img src={screen.image} alt="" className="max-h-56 w-auto object-contain" />}
            </motion.div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-12">
            <span>{config.copyright_text}</span>
            <a href="/taxi/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/taxi/privacy" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </div>

      {/* Right side (Main content) */}
      <div className="flex-1 h-full flex flex-col items-center justify-start lg:justify-center relative w-full bg-white lg:bg-[#F8F9FA] overflow-y-auto lg:overflow-hidden">
        
        {/* Mobile hero: banners (if any) and the brand, kept compact */}
        <div className="lg:hidden relative z-20 w-full shrink-0 overflow-hidden px-4 pb-14 pt-16" style={{ background: `linear-gradient(180deg, ${config.header_from} 0%, ${config.header_to} 100%)` }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C6F432]/20 blur-[60px]" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-[40px]" />

          <button
            type="button"
            onClick={handleClose}
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <LoginBannerCarousel app="user" size="hero" lightDots className="relative mb-3 -mt-2" />

          <div className="relative flex flex-col items-center text-center">
            {appLogo ? (
              <img
                src={appLogo}
                alt={`${appName} logo`}
                className="mb-3 h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow-xl"
              />
            ) : (
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl">
                <div className="h-7 w-7 rounded-lg bg-[#1A1A1A]"></div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-[22px] font-black leading-none tracking-tight text-white">{appName}</h2>
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#14213D] shadow-md" style={{ background: accent }}>
                <Car size={11} />
                TAXI
              </span>
            </div>
            <p className="mt-2 max-w-[28ch] text-[13px] font-semibold leading-snug text-white/80 [text-wrap:balance]">{config.tagline_user}</p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-none lg:max-w-[420px] shrink-0 bg-white lg:bg-transparent rounded-t-[2rem] lg:rounded-3xl px-6 pb-2 pt-8 lg:p-0 z-30 relative shadow-[0_-18px_40px_-18px_rgba(0,0,0,0.35)] lg:shadow-none -mt-6 lg:mt-0"
        >
          <LoginBannerCarousel app="user" size="hero" className="hidden lg:block mb-8" />
          {title && (
            <div className="mb-9 text-center">
              <h1
                className="text-[29px] font-extrabold uppercase leading-tight tracking-[0.01em] text-[#0B3B36]"
                style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}
              >
                {title}
              </h1>
              <span className="mx-auto mb-3 mt-1 block h-[5px] w-14 rounded-full" style={{ background: accent }} />
              {subtitle && (
                <p className="mx-auto max-w-[30ch] text-[13px] font-medium leading-relaxed text-gray-500" style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
                  {subtitle}
                </p>
              )}
              <ServiceTicker app="user" className="mt-5" />
            </div>
          )}
          <div className="relative z-10 w-full">
            {children}
          </div>
        </motion.div>
        
        {/* Helper footer: support link + copyright, both managed by the admin */}
        <div className="mt-auto lg:mt-12 text-center w-full max-w-[420px] z-20 px-6 pb-8 pt-6 lg:pb-0 lg:pt-0 space-y-2">
            {config.show_support && config.support_label ? (
              <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center font-bold text-[10px]">?</span>
                {config.support_text}{' '}
                <a href={config.support_link || '/taxi/contact'} className="text-[#1A1A1A] font-semibold hover:text-[color:var(--app-primary,#0F766E)] transition-colors ml-1">{config.support_label}</a>
              </p>
            ) : null}
            {config.copyright_text ? <p className="text-[11px] font-medium text-gray-400">{config.copyright_text}</p> : null}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
