import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike,
  Bus,
  Car,
  Clock,
  Headset,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Mail,
  Receipt,
  Route,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  Award,
  Building2,
  Wallet,
} from 'lucide-react';
import api from '../../../shared/api/axiosInstance';

export const arr = (v) => (Array.isArray(v) ? v : []);

// ---- Theme: four colours come from Admin > Landing Page > Theme, every tint is derived from them ----
const HEX = /^#[0-9a-f]{6}$/i;
const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex(x.map((v, i) => v * (1 - t) + y[i] * t));
};

export function themeVars(theme) {
  const pick = (v, d) => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim() : d);
  const p = pick(theme?.primary, '#0F766E');
  const d = pick(theme?.dark, '#052E2B');
  const a = pick(theme?.accent, '#C6F432');
  const i = pick(theme?.ink, '#14213D');
  const W = '#FFFFFF';
  return {
    '--lp-primary': p,
    '--lp-dark': d,
    '--lp-accent': a,
    '--lp-ink': i,
    '--lp-deep': mix(d, '#000000', 0.35),
    '--lp-dark-2': mix(d, p, 0.1),
    '--lp-mid': mix(p, d, 0.5),
    '--lp-primary-2': mix(p, W, 0.22),
    '--lp-mint': mix(p, W, 0.91),
    '--lp-mint-2': mix(p, W, 0.885),
    '--lp-mint-3': mix(p, W, 0.875),
    '--lp-mint-4': mix(p, W, 0.835),
    '--lp-mint-pale': mix(p, W, 0.95),
    '--lp-lime-1': mix(a, W, 0.8),
    '--lp-lime-2': mix(a, W, 0.76),
    '--lp-accent-light': mix(a, W, 0.45),
    '--lp-accent-deep': mix(a, '#000000', 0.15),
  };
}

// Icon keys an admin can pick from in Admin > Landing Page.
export const ICONS = {
  shield: ShieldCheck,
  userCheck: UserCheck,
  mapPin: MapPin,
  receipt: Receipt,
  car: Car,
  bike: Bike,
  bus: Bus,
  package: Package,
  route: Route,
  clock: Clock,
  headset: Headset,
  phone: Phone,
  mail: Mail,
  message: MessageCircle,
  users: Users,
  star: Star,
  heart: Heart,
  award: Award,
  building: Building2,
  wallet: Wallet,
};
export const ICON_KEYS = Object.keys(ICONS);
export const iconFor = (key, fallback = Star) => ICONS[key] || fallback;

export function useGo() {
  const navigate = useNavigate();
  return (target) => (e) => {
    const t = String(target || '').trim();
    if (!t) return;
    if (t.startsWith('#')) {
      e?.preventDefault?.();
      document.querySelector(t)?.scrollIntoView({ behavior: 'smooth' });
    } else if (/^https?:\/\//i.test(t)) {
      e?.preventDefault?.();
      window.open(t, '_blank', 'noopener,noreferrer');
    } else {
      e?.preventDefault?.();
      navigate(t);
    }
  };
}

export function SectionHead({ eyebrow, title, subtitle, light }) {
  return (
    <div className="mx-auto mb-6 max-w-2xl text-center sm:mb-9">
      {eyebrow && (
        <span className={`block text-[11px] font-extrabold uppercase tracking-[0.22em] ${light ? 'text-[#C6F432]' : 'text-[#0F766E]'}`}>{eyebrow}</span>
      )}
      <h2 className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl ${light ? 'text-white' : 'text-[#14213D]'}`}>{title}</h2>
      {subtitle && <p className={`mx-auto mt-4 max-w-xl text-base leading-relaxed ${light ? 'text-white/70' : 'text-[#14213D]/60'}`}>{subtitle}</p>}
    </div>
  );
}

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#00D7FE" d="M3.6 2.4c-.3.3-.5.8-.5 1.4v16.4c0 .6.2 1.1.5 1.4l9.1-9.6z" />
    <path fill="#FFCE00" d="M16 15.5 12.7 12 16 8.5l4 2.3c1.1.6 1.1 1.7 0 2.4z" />
    <path fill="#00F076" d="M3.6 21.6c.4.4 1 .4 1.7.1L16 15.5 12.7 12z" />
    <path fill="#FF3A44" d="M16 8.5 5.3 2.3c-.7-.4-1.300-.3-1.700.1L12.700 12z" />
  </svg>
);

export const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M16.4 12.6c0-2.500 2-3.700 2.100-3.800-1.200-1.700-3-1.900-3.600-1.900-1.500-.2-3 .9-3.800.9s-2-.9-3.300-.8c-1.700 0-3.300 1-4.100 2.500-1.800 3.100-.5 7.600 1.200 10.100.8 1.200 1.800 2.600 3.100 2.500 1.200 0 1.700-.8 3.200-.8s1.900.8 3.200.8 2.200-1.200 3-2.400c.9-1.400 1.300-2.700 1.300-2.800-.1 0-2.300-.9-2.300-3.300zM14 5.200c.7-.8 1.100-1.900 1-3-1 0-2.100.7-2.800 1.500-.6.700-1.200 1.800-1 2.900 1.100.1 2.100-.6 2.800-1.400z" />
  </svg>
);

// The logo the admin set in Settings wins; the landing CMS logo and the bundled one are only fallbacks.
// The landing page renders outside SettingsProvider, so the setting is fetched here once and shared.
let adminLogoPromise = null;
const loadAdminLogo = () => {
  if (!adminLogoPromise) {
    adminLogoPromise = api
      .get('/common/settings')
      .then((res) => {
        const d = res?.data?.data || res?.data || {};
        const logo = String(d.general?.logo || d.customization?.logo || '').trim();
        return /eqosy/i.test(logo) ? '' : logo;
      })
      .catch(() => '');
  }
  return adminLogoPromise;
};

export function useAdminLogo(cmsLogo) {
  const [adminLogo, setAdminLogo] = useState('');
  useEffect(() => {
    let live = true;
    loadAdminLogo().then((logo) => live && setAdminLogo(logo));
    return () => {
      live = false;
    };
  }, []);
  return adminLogo || cmsLogo || '/kailo-taxi-logo.png';
}

// Every language the Google Website Translator can translate into. (Google only lists these through a paid API key,
// so the codes are built in and the readable names come from the browser's own language data.)
export const GOOGLE_LANGUAGES = [
  'af', 'sq', 'am', 'ar', 'hy', 'as', 'ay', 'az', 'bm', 'eu', 'be', 'bn', 'bho', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW',
  'co', 'hr', 'cs', 'da', 'dv', 'doi', 'nl', 'en', 'eo', 'et', 'ee', 'fil', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gn', 'gu',
  'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'ilo', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'gom', 'ko',
  'kri', 'ku', 'ckb', 'ky', 'lo', 'la', 'lv', 'ln', 'lt', 'lg', 'lb', 'mk', 'mai', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mni-Mtei',
  'lus', 'mn', 'my', 'ne', 'no', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pa', 'qu', 'ro', 'ru', 'sm', 'sa', 'gd', 'nso', 'sr', 'st',
  'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'ti', 'ts', 'tr', 'tk', 'ak', 'uk',
  'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu',
];
const LANG_ALIAS = { iw: 'he', jw: 'jv', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', 'mni-Mtei': 'mni' };
const LANG_FALLBACK = {
  bho: 'Bhojpuri', doi: 'Dogri', gom: 'Konkani', kri: 'Krio', lus: 'Mizo', mai: 'Maithili', 'mni-Mtei': 'Meiteilon (Manipuri)',
  nso: 'Sepedi', ckb: 'Kurdish (Sorani)', ak: 'Twi', ay: 'Aymara', ee: 'Ewe', ilo: 'Ilocano', qu: 'Quechua', hmn: 'Hmong',
  ceb: 'Cebuano', haw: 'Hawaiian', ts: 'Tsonga', gn: 'Guarani', bm: 'Bambara', ln: 'Lingala', lg: 'Luganda', om: 'Oromo',
};
const displayName = (code, locale) => {
  const alias = LANG_ALIAS[code] || code;
  try {
    const n = new Intl.DisplayNames([locale || alias], { type: 'language' }).of(alias);
    if (n && n.toLowerCase() !== alias.toLowerCase()) return n;
  } catch {
    /* unknown code in this browser */
  }
  return LANG_FALLBACK[code] || '';
};

/** { code, native, english } for the language picker. */
export const languageInfo = (code) => {
  const english = displayName(code, 'en') || code;
  const native = displayName(code) || english;
  return { code, native, english };
};

// ---- Language switching -------------------------------------------------------------------
// The language list is admin-controlled. Translation itself uses the Google Website Translator,
// so every piece of admin-edited text is translated without per-language content.
const COOKIE = 'googtrans';

export const currentLanguage = () => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=/[^/]*/([^;]+)`));
    return m ? decodeURIComponent(m[1]) : 'en';
  } catch {
    return 'en';
  }
};

export const changeLanguage = (code) => {
  const host = window.location.hostname;
  const gone = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = `${COOKIE}=; ${gone}`;
  document.cookie = `${COOKIE}=; ${gone}; domain=${host}`;
  if (code && code !== 'en') {
    document.cookie = `${COOKIE}=/en/${code}; path=/`;
    document.cookie = `${COOKIE}=/en/${code}; path=/; domain=${host}`;
  }
  window.location.reload();
};

export function useGoogleTranslate(enabled) {
  useEffect(() => {
    if (!enabled || currentLanguage() === 'en' || document.getElementById('google-translate-script')) return;
    const holder = document.createElement('div');
    holder.id = 'google_translate_element';
    holder.style.display = 'none';
    document.body.appendChild(holder);
    window.googleTranslateElementInit = () => {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
    };
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, [enabled]);
}

// Short public paths are mapped to the real taxi routes; unknown short paths would otherwise
// fall into the "resume last panel" redirect and land on the admin dashboard.
export const PUBLIC_PATHS = {
  '/privacy': '/taxi/privacy',
  '/terms': '/taxi/terms',
  '/contact': '/taxi/contact',
  '/about': '/taxi/about',
  '/faq': '/taxi/faq',
  '/refund': '/taxi/refund',
  '/cancellation': '/taxi/cancellation',
};
