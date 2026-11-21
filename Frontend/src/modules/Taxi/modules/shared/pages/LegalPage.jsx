import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ChevronDown,
  CreditCard,
  Database,
  FileText,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Users,
  UserCheck,
} from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import apiClient from '../../../shared/api/axiosInstance';
import { API_BASE_URL } from '../../../shared/api/runtimeConfig';
import { getLocalDriverToken, getAuthenticatedDriverRole } from '../../driver/services/registrationService';
import CancellationPolicyView from './CancellationPolicyView';
import PanelFooter from '../components/PanelFooter';

// Which document a URL shows. Custom documents the admin adds come in through /legal/:app/:doc.
const getDocumentType = (pathname = '') => {
  const value = pathname.toLowerCase();
  if (value.includes('privacy')) return 'privacy';
  if (value.includes('terms')) return 'terms';
  if (value.includes('refund')) return 'refund';
  if (value.includes('cancellation')) return 'cancellation';
  if (value.includes('shipping')) return 'shipping';
  if (value.includes('dmv')) return 'dmv-compliance';
  return 'terms';
};

const DOC_TITLES = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  refund: 'Refund Policy',
  cancellation: 'Cancellation Policy',
  shipping: 'Parcel & Shipping Policy',
  'dmv-compliance': 'DMV & Transport Compliance',
};

// The icon beside each section is picked from the words in its heading, so admins never have to choose one.
const ICON_RULES = [
  [/collect|information we|data we/i, Database],
  [/location|gps|tracking/i, MapPin],
  [/share|sharing|disclos|third/i, Users],
  [/secur|retention|protect|safety/i, Lock],
  [/choice|right|control|delete|opt/i, SlidersHorizontal],
  [/refund|cancel|return/i, RotateCcw],
  [/pric|fee|tax|payment|fare|payout|charge/i, CreditCard],
  [/eligib|account|regist|verif/i, UserCheck],
  [/notif|alert|communicat|sms|otp/i, Bell],
  [/liabil|prohibit|misuse|conduct|suspend|terminat|risk/i, AlertTriangle],
  [/contact|support|grievance|reach|question/i, Mail],
  [/about|overview|introduc|scope/i, Info],
  [/use|using|how we/i, Settings2],
];
const iconFor = (title) => ICON_RULES.find(([re]) => re.test(title))?.[1] || FileText;

const plain = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

// Turns the admin's HTML into { intro, sections: [{ id, title, html }] } so it can be shown as cards.
const parseLegalHtml = (html) => {
  if (!html || typeof DOMParser === 'undefined') return { intro: '', sections: [] };
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body.firstElementChild;
  const nodes = Array.from(root.childNodes);

  const h2Count = nodes.filter((n) => n.nodeName === 'H2').length;
  const h3Count = nodes.filter((n) => n.nodeName === 'H3').length;
  // "One H2 + several H3" means the H2 is just the document title and the H3s are the sections.
  const sectionTag = h2Count === 1 && h3Count > 0 ? 'H3' : 'H2';

  const preface = [];
  const sections = [];
  let current = null;

  for (const node of nodes) {
    const name = node.nodeName;
    if (name === sectionTag) {
      current = { title: plain(node), parts: [] };
      sections.push(current);
      continue;
    }
    // Title headings above the first section are dropped; the page header already shows the title.
    if (!current && (name === 'H1' || name === 'H2' || name === 'H3')) continue;
    if (node.nodeType === 3 && !node.textContent.trim()) continue;
    if (node.nodeType === 1 && !plain(node) && !node.querySelector?.('img')) continue; // <p><br></p>
    const markup = node.nodeType === 1 ? node.outerHTML : node.textContent;
    (current ? current.parts : preface).push({ markup, text: plain(node), name });
  }

  const intro = preface.map((p) => p.text).filter(Boolean).join(' ');
  const built = sections
    .filter((s) => s.title || s.parts.length)
    .map((s, i) => ({ id: `s${i + 1}`, title: /^\d+\s*[.):-]/.test(s.title) ? s.title : `${i + 1}. ${s.title || 'Section'}`, html: s.parts.map((p) => p.markup).join('') }));
  return { intro, sections: built };
};

const formatDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fetchPage = async (key) => {
  try {
    const res = await apiClient.get(`/pages/${key}`);
    return res?.data?.data || res?.data || {};
  } catch (err) {
    try {
      const raw = await fetch(`${API_BASE_URL}/pages/${key}`);
      if (raw.ok) {
        const json = await raw.json();
        return json?.data || json || {};
      }
    } catch (_) { /* ignore */ }
    throw err;
  }
};

const LegalPage = ({ role: propRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Which app the policy is for: the website, the rider app (default) or the driver app, or any app the admin added.
  const audience = useMemo(() => {
    const explicit = String(
      params.app || searchParams.get('app') || searchParams.get('role') || searchParams.get('type') || searchParams.get('userType') || '',
    ).toLowerCase();
    if (explicit === 'owner') return 'driver';
    if (explicit === 'rider' || explicit === 'customer') return 'user';
    if (explicit) return explicit;
    const stateRole = String(location.state?.role || propRole || '').toLowerCase();
    if (stateRole === 'driver' || stateRole === 'owner') return 'driver';
    if (location.pathname.includes('/driver') || location.pathname.includes('/owner')) return 'driver';
    return 'user';
  }, [params.app, searchParams, location.state, location.pathname, propRole]);

  const docType = String(params.doc || '').toLowerCase() || getDocumentType(location.pathname);
  const isDriver = audience === 'driver';

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState({ title: '', intro: '', content: '', updatedAt: '' });
  const [open, setOpen] = useState({});
  const [activeId, setActiveId] = useState('');
  const sectionRefs = useRef({});
  const chipRefs = useRef({});
  const chipRowRef = useRef(null);
  const lockSpyUntil = useRef(0);

  // Cancellation charges come live from the admin pricing settings, so those pages are not CMS text.
  const showPolicy = docType === 'cancellation' || docType === 'refund';
  const hideBody = docType === 'cancellation' || (docType === 'refund' && isDriver);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    const keyFor = (app) => (app === 'user' ? docType : `${app}-${docType}`);

    (async () => {
      if (hideBody) {
        if (alive) setPage({ title: DOC_TITLES[docType] || 'Policy', intro: '', content: '', updatedAt: '' });
        return;
      }
      try {
        let data = await fetchPage(keyFor(audience));
        // An app with no text of its own shows the rider text instead of an empty page.
        if (!data?.content && !data?.unpublished && audience !== 'user') data = await fetchPage(keyFor('user'));
        if (alive) {
          setPage({
            title: data?.title || DOC_TITLES[docType] || 'Policy',
            intro: data?.intro || '',
            content: data?.content || '',
            updatedAt: data?.showUpdated === false ? '' : data?.updatedAt || '',
            unpublished: !!data?.unpublished,
          });
        }
      } catch (_) {
        if (alive) {
          setFailed(true);
          setPage({ title: DOC_TITLES[docType] || 'Policy', intro: '', content: '', updatedAt: '' });
        }
      }
    })().finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [audience, docType, hideBody]);

  const parsed = useMemo(() => parseLegalHtml(page.content), [page.content]);
  const intro = page.intro || parsed.intro;
  const sections = parsed.sections.length
    ? parsed.sections
    : page.content
      ? [{ id: 's1', title: page.title || DOC_TITLES[docType] || 'Details', html: page.content }]
      : [];

  useEffect(() => {
    setOpen(Object.fromEntries(sections.map((s) => [s.id, true])));
    setActiveId(sections[0]?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.content]);

  const allOpen = sections.length > 0 && sections.every((s) => open[s.id]);
  const toggleAll = () => setOpen(Object.fromEntries(sections.map((s) => [s.id, !allOpen])));

  // Highlight the chip of the section being read while the page scrolls.
  useEffect(() => {
    if (!sections.length) return undefined;
    const onScroll = () => {
      if (Date.now() < lockSpyUntil.current) return;
      const line = 170; // just under the sticky header + chip row
      let current = sections[0].id;
      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = sections[sections.length - 1].id;
      setActiveId((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.content, open]);

  // Keep the active chip visible inside the horizontally scrolling row.
  useEffect(() => {
    const row = chipRowRef.current;
    const chip = chipRefs.current[activeId];
    if (!row || !chip) return;
    const target = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeId]);

  const jumpTo = (id) => {
    lockSpyUntil.current = Date.now() + 800;
    setActiveId(id);
    setOpen((prev) => ({ ...prev, [id]: true }));
    requestAnimationFrame(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleBack = () => {
    const explicitReturn =
      location.state?.returnTo || location.state?.from || location.state?.backTo || searchParams.get('returnTo') || searchParams.get('from');
    if (explicitReturn && typeof explicitReturn === 'string' && explicitReturn.startsWith('/') && !explicitReturn.includes('terms') && !explicitReturn.includes('privacy')) {
      navigate(explicitReturn, { replace: true });
      return;
    }

    const referrer = typeof document !== 'undefined' ? document.referrer || '' : '';
    const referrerIsDriver = Boolean(referrer && (referrer.includes('/taxi/driver') || referrer.includes('/taxi/owner')));
    const storedDriverToken = getLocalDriverToken();
    const storedDriverRole = String(getAuthenticatedDriverRole() || '').toLowerCase();
    const isDriverContext = isDriver || referrerIsDriver || Boolean(storedDriverToken);

    const hasHistory =
      typeof window !== 'undefined' &&
      window.history &&
      ((window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) ||
        (window.history.length > 1 && referrer && referrer.includes(window.location.host)));
    if (hasHistory) {
      navigate(-1);
      return;
    }

    if (isDriverContext) {
      if (storedDriverToken) navigate(storedDriverRole === 'owner' ? '/taxi/owner/dashboard' : '/taxi/driver/home', { replace: true });
      else navigate('/taxi/driver/login', { replace: true });
      return;
    }
    navigate('/taxi', { replace: true });
  };

  const updated = formatDate(page.updatedAt);

  return (
    <div className="legal-page min-h-screen bg-slate-50 text-slate-900 font-sans" style={{ '--legal-accent': 'var(--app-primary, #0F766E)' }}>
      <style>{`
        .legal-page .tint { background: color-mix(in srgb, var(--legal-accent) 11%, white); }
        .legal-page .legal-body { color: #475569; font-size: 15px; line-height: 1.7; }
        .legal-page .legal-body p { margin: 0 0 12px; }
        .legal-page .legal-body p:last-child { margin-bottom: 0; }
        .legal-page .legal-body strong { color: #0f172a; font-weight: 700; }
        .legal-page .legal-body a { color: var(--legal-accent); text-decoration: underline; }
        .legal-page .legal-body ul, .legal-page .legal-body ol { margin: 0; padding-left: 22px; }
        .legal-page .legal-body ul { list-style: disc; }
        .legal-page .legal-body ol { list-style: decimal; }
        .legal-page .legal-body li { margin-bottom: 10px; padding-left: 4px; }
        .legal-page .legal-body li:last-child { margin-bottom: 0; }
        .legal-page .legal-body li::marker { color: var(--legal-accent); }
        .legal-page .legal-body h3, .legal-page .legal-body h4 { margin: 16px 0 8px; font-size: 15px; font-weight: 800; color: #0f172a; }
        .legal-page .chips::-webkit-scrollbar { display: none; }
      `}</style>

      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-5 px-5">
          <button type="button" aria-label="Go back" onClick={handleBack} className="p-1 text-slate-800 hover:text-black cursor-pointer">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{page.title || DOC_TITLES[docType] || 'Policy'}</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[800px] px-4 pb-16 pt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--legal-accent)' }} />
            <p className="text-xs font-bold uppercase tracking-wider">Loading...</p>
          </div>
        ) : (
          <>
            {updated && <p className="mb-3 text-sm text-slate-500">Last updated {updated}</p>}

            {intro && (
              <div className="tint mb-6 rounded-3xl px-5 py-4 text-[15px] leading-relaxed" style={{ color: 'color-mix(in srgb, var(--legal-accent) 80%, black)' }}>
                {intro}
              </div>
            )}

            {showPolicy && (
              <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
                <CancellationPolicyView audience={isDriver ? 'driver' : 'user'} />
              </div>
            )}

            {!hideBody && sections.length > 0 && (
              <>
                <div className="sticky top-[72px] z-40 -mx-4 mb-2 bg-slate-50 px-4 py-3">
                <div ref={chipRowRef} className="chips flex gap-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {sections.map((s) => {
                    const on = activeId === s.id;
                    return (
                      <button
                        key={s.id}
                        ref={(el) => {
                          chipRefs.current[s.id] = el;
                        }}
                        type="button"
                        onClick={() => jumpTo(s.id)}
                        className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${on ? 'text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                        style={on ? { background: 'var(--legal-accent)', borderColor: 'var(--legal-accent)' } : { borderColor: '#e2e8f0' }}
                      >
                        {s.title}
                      </button>
                    );
                  })}
                </div>
                </div>

                <div className="mb-3 flex justify-end">
                  <button type="button" onClick={toggleAll} className="cursor-pointer text-sm font-bold" style={{ color: 'var(--legal-accent)' }}>
                    {allOpen ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>

                <div className="space-y-4">
                  {sections.map((s) => {
                    const Icon = iconFor(s.title);
                    const isOpen = !!open[s.id];
                    return (
                      <section
                        key={s.id}
                        ref={(el) => {
                          sectionRefs.current[s.id] = el;
                        }}
                        className="scroll-mt-40 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                      >
                        <button
                          type="button"
                          onClick={() => setOpen((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                          aria-expanded={isOpen}
                          className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left"
                        >
                          <span className="tint flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ color: 'var(--legal-accent)' }}>
                            <Icon size={22} strokeWidth={1.8} />
                          </span>
                          <span className="flex-1 text-lg font-extrabold tracking-tight text-slate-900">{s.title}</span>
                          <ChevronDown size={20} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 px-5 py-5">
                            <div className="legal-body" dangerouslySetInnerHTML={{ __html: s.html }} />
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
            )}

            {!hideBody && sections.length === 0 && (
              <div className="rounded-3xl border border-slate-200/80 bg-white py-16 text-center text-slate-400">
                <FileText size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">{failed ? 'Could not load this page. Please try again.' : page.unpublished ? 'This page is not available right now.' : 'This document has not been published yet.'}</p>
              </div>
            )}
          </>
        )}
      </main>
      {(audience === 'user' || audience === 'driver') && <PanelFooter panel={audience} />}
    </div>
  );
};

export default LegalPage;
