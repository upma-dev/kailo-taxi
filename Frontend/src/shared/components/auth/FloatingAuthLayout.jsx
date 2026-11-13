import { useState } from 'react';
import { motion } from 'framer-motion';
import useLoginData from './useLoginData';
import {
  AlertCircle,
  ArrowLeft,
  Car,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Route,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react';

// One theme per app, every one drawn from the Kailo Taxi logo (navy base, orange, lime, yellow).
// `gradient` paints the dark hero, `glow` / `glow2` are the two blurred lights behind the logo,
// `accent` -> `accent2` paints buttons, `accentDark` is the readable accent used for text on the cream sheet,
// `accentSoft` is the pale tint behind small chips and the +91 block.
export const AUTH_THEMES = {
  // Kailo Taxi: deep teal with lime lights.
  driver: {
    gradient: 'linear-gradient(180deg, #052E2B 0%, #0F766E 62%, #0A4A46 100%)',
    glow: '#C6F432',
    glow2: '#14B8A6',
    accent: '#0F766E',
    accent2: '#0A4A46',
    accentDark: '#0F766E',
    accentSoft: '#E3F6F2',
    Icons: [Car, MapPin, Navigation, Route],
  },
};

/**
 * Shared login shell for the driver / owner app. Mirrors the user app: a compact teal hero
 * (back button, logo, brand, role chip, tagline) with a white card that holds the title,
 * the form (`children`) and the legal `footer`.
 */
export default function FloatingAuthLayout({
  theme,
  logo,
  logoAlt = 'Logo',
  brand,
  badge,
  BadgeIcon,
  tagline,
  title,
  subtitle,
  onBack,
  bottomInset = 0,
  heroTop,
  belowTitle,
  extra,
  children,
  footer,
}) {
  const FallbackIcon = theme.Icons[0];
  const ChipIcon = BadgeIcon || FallbackIcon;
  const { config } = useLoginData('partner');
  const accent = config.accent_color;

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col items-center font-sans"
      style={{ paddingBottom: bottomInset || undefined, background: `linear-gradient(180deg, ${config.header_from} 0%, ${config.header_to} 100%)` }}
    >
      <div className="relative z-20 w-full max-w-[520px] shrink-0 overflow-hidden px-4 pb-12 pt-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C6F432]/20 blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-[40px]" />

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}

        {heroTop ? <div className="relative mb-3 -mt-2">{heroTop}</div> : null}

        <div className="relative -mt-2 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl">
            {logo ? (
              <img src={logo} alt={logoAlt} className="h-full w-full object-contain" />
            ) : (
              <FallbackIcon size={30} style={{ color: theme.accent }} />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {brand ? <h2 className="text-[22px] font-black leading-none tracking-tight text-white">{brand}</h2> : null}
            {badge ? (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#14213D] shadow-md" style={{ background: accent }}>
                <ChipIcon size={11} />
                {badge}
              </span>
            ) : null}
          </div>
          {(tagline || config.tagline_partner) ? (
            <p className="mt-2 max-w-[28ch] text-[13px] font-semibold leading-snug text-white/80 [text-wrap:balance]">{tagline || config.tagline_partner}</p>
          ) : null}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-30 flex w-full max-w-[520px] flex-1 flex-col rounded-t-[2rem] bg-white px-6 pb-6 pt-8 shadow-[0_-18px_40px_-18px_rgba(0,0,0,0.35)]"
      >
        <div className="mb-8 text-center">
          <h1
            className="text-[29px] font-extrabold uppercase leading-tight tracking-[0.01em] text-[#0B3B36]"
            style={{ fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif" }}
          >
            {title}
          </h1>
          <span className="mx-auto mb-3 mt-1 block h-[5px] w-14 rounded-full" style={{ background: accent }} />
          {subtitle ? (
            <p className="mx-auto max-w-[30ch] text-[13px] font-medium leading-relaxed text-gray-500" style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
              {subtitle}
            </p>
          ) : null}
          {belowTitle ? <div className="mt-4">{belowTitle}</div> : null}
        </div>

        <div className="space-y-6">{children}</div>

        {extra ? <div className="mt-6 border-t border-dashed border-[#D9DEEE] pt-5">{extra}</div> : null}
        {footer ? <div className="mt-8 text-center">{footer}</div> : null}

        <div className="mt-auto space-y-2 pt-8 text-center">
          {config.show_support && config.support_label ? (
            <p className="text-xs text-gray-400">
              {config.support_text}{' '}
              <a href={config.support_link || '/taxi/contact'} className="ml-1 font-semibold text-[#1A1A1A]">{config.support_label}</a>
            </p>
          ) : null}
          {config.copyright_text ? <p className="text-[11px] font-medium text-gray-400">{config.copyright_text}</p> : null}
        </div>
      </motion.div>
    </div>
  );
}

export function AuthPhoneField({
  theme,
  value,
  onChange,
  inputRef,
  hasError = false,
  label = 'Mobile Number',
  placeholder = 'Mobile number',
  prefix = '+91',
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = hasError ? '#F87171' : focused ? theme.accent : '#E4E8F4';
  const ring = hasError ? '#FEE2E2' : `${theme.accent}2e`;

  return (
    <div className="space-y-2">
      {label ? (
        <label className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#8A93B2]">{label}</label>
      ) : null}
      <div
        className="flex h-16 items-stretch overflow-hidden rounded-2xl bg-white transition-all"
        style={{
          border: `1.5px solid ${borderColor}`,
          boxShadow: focused || hasError ? `0 0 0 4px ${ring}` : 'none',
        }}
      >
        <div
          className="flex items-center px-5 text-[18px] font-black"
          style={{ color: theme.accentDark, background: theme.accentSoft }}
        >
          <Phone size={18} className="mr-2" strokeWidth={2.4} />
          {prefix}
        </div>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-[22px] font-extrabold tracking-[0.14em] text-[#0C1336] outline-none ring-0 placeholder:text-[17px] placeholder:font-semibold placeholder:tracking-normal placeholder:text-[#AEB5CE]"
          {...inputProps}
        />
      </div>
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-600"
    >
      <AlertCircle className="mt-px h-4 w-4 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

export function AuthButton({ theme, children, loading = false, loadingLabel, disabled = false, ...buttonProps }) {
  const inactive = disabled || loading;
  const off = disabled && !loading;

  return (
    <motion.button
      type="button"
      whileTap={inactive ? undefined : { scale: 0.98 }}
      disabled={inactive}
      className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-black tracking-wide transition-all disabled:cursor-not-allowed"
      style={{
        background: off ? '#E9ECF6' : `linear-gradient(135deg, ${theme.accent}, ${theme.accent2 || theme.accentDark})`,
        color: off ? '#A3AAC6' : '#fff',
        boxShadow: off ? 'none' : `0 14px 26px -10px ${theme.accent}cc`,
      }}
      {...buttonProps}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{loadingLabel || 'Please wait...'}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
