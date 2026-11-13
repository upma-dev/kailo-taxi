import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Globe, Loader2, Search, Mail, MapPin, Menu, Phone, Quote, Send, X, MessageCircle, Clock } from 'lucide-react';
import { Reveal, Tilt } from './landing3d';
import { submitLandingLead } from '../../../shared/hooks/useLandingContent';
import {
  AppleIcon,
  PlayIcon,
  GOOGLE_LANGUAGES,
  PUBLIC_PATHS,
  SectionHead,
  arr,
  changeLanguage,
  currentLanguage,
  iconFor,
  languageInfo,
  useAdminLogo,
  useGo,
} from './landingShared';

/* ------------------------------------------------------------------ Header */

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onClose]);
}

function StoreRow({ href, name, subtitle, icon }) {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-ink/5 text-lp-ink">{icon}</span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block text-[15px] font-bold text-lp-ink">{name}</span>
        <span className="block text-xs font-medium text-lp-ink/45">{href ? subtitle : 'Coming soon'}</span>
      </span>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-xl px-3 py-2.5 transition';
  if (!href) return <div className={`${cls} cursor-default opacity-70`}>{body}</div>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-lp-ink/5`}>
      {body}
    </a>
  );
}

function GetAppMenu({ data, download }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-lp-ink px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"
        aria-expanded={open}
      >
        {data.ctaText || 'Get the App'} <ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-lp-ink/5 bg-white p-2 shadow-[0_24px_50px_-18px_rgba(5,46,43,0.5)]"
          >
            <StoreRow href={download?.playStoreUrl} name="Google Play" subtitle={data.storeSubtitle || 'Kailo Taxi App'} icon={<PlayIcon />} />
            <StoreRow href={download?.appStoreUrl} name="App Store" subtitle={data.storeSubtitle || 'Kailo Taxi App'} icon={<AppleIcon />} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanguageMenu({ popular, showAll }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const close = useCallback(() => {
    setOpen(false);
    setQ('');
  }, []);
  useOutsideClose(ref, close);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const active = currentLanguage();
  const all = useMemo(() => {
    const list = showAll ? GOOGLE_LANGUAGES.map(languageInfo) : [];
    return list.sort((x, y) => x.english.localeCompare(y.english));
  }, [showAll]);
  const top = useMemo(
    () => popular.map((l) => ({ code: l.code, native: l.label || languageInfo(l.code).native, english: languageInfo(l.code).english })),
    [popular],
  );
  const current = [...top, ...all].find((l) => l.code === active) || top[0] || languageInfo('en');
  const needle = q.trim().toLowerCase();
  const match = (l) => !needle || l.native.toLowerCase().includes(needle) || l.english.toLowerCase().includes(needle) || l.code.toLowerCase() === needle;
  const topShown = top.filter(match);
  const allShown = all.filter((l) => match(l) && !(!needle && top.some((t) => t.code === l.code)));

  const Row = ({ l }) => (
    <li>
      <button
        type="button"
        onClick={() => (l.code === active ? close() : changeLanguage(l.code))}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-lp-primary/5"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-lp-ink">{l.native}</span>
          {l.english !== l.native && <span className="block truncate text-[11px] text-lp-ink/45">{l.english}</span>}
        </span>
        {l.code === active && <Check size={15} className="shrink-0 text-lp-primary" />}
      </button>
    </li>
  );

  return (
    <div className="relative" ref={ref} translate="no">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className="flex items-center gap-1.5 rounded-full border border-lp-ink/10 bg-white px-3 py-2 text-[13px] font-bold text-lp-ink transition hover:border-lp-primary/40"
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe size={16} className="text-lp-primary" />
        <span className="hidden xl:inline">{current.native}</span>
        <ChevronDown size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-3 top-[4.5rem] z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-lp-ink/5 bg-white shadow-[0_24px_50px_-18px_rgba(5,46,43,0.5)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80"
          >
            <div className="flex items-center justify-between gap-2 border-b border-lp-ink/5 px-4 py-3">
              <span className="text-sm font-extrabold text-lp-ink">Choose language</span>
              <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1.5 text-lp-ink/60 transition hover:bg-lp-ink/5 hover:text-lp-ink">
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-lp-ink/5 p-3">
              <div className="flex items-center gap-2 rounded-xl border border-lp-ink/10 bg-lp-mint-pale px-3 py-2">
                <Search size={15} className="shrink-0 text-lp-ink/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search language"
                  className="w-full bg-transparent text-sm text-lp-ink outline-none placeholder:text-lp-ink/35"
                />
                {q && (
                  <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="text-lp-ink/40 hover:text-lp-ink">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {topShown.length > 0 && (
                <>
                  {!needle && showAll && <p className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-lp-ink/40">Popular</p>}
                  <ul>
                    {topShown.map((l) => (
                      <Row key={`p-${l.code}`} l={l} />
                    ))}
                  </ul>
                </>
              )}
              {allShown.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-lp-ink/40">All languages</p>
                  <ul>
                    {allShown.map((l) => (
                      <Row key={l.code} l={l} />
                    ))}
                  </ul>
                </>
              )}
              {topShown.length === 0 && allShown.length === 0 && <p className="px-3 py-6 text-center text-sm text-lp-ink/50">No language found</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header({ data, download }) {
  const go = useGo();
  const logo = useAdminLogo(data.logo);
  const [open, setOpen] = useState(false);
  const links = arr(data.links);
  const languages = data.languageEnabled === false ? [] : arr(data.languages).filter((l) => l && l.code && l.enabled !== false);
  const showAll = data.showAllLanguages !== false;
  const showLang = data.languageEnabled !== false && (showAll || languages.length > 1);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-lp-ink/5 bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex shrink-0 items-center gap-3">
          <img src={logo} alt="" className="h-10 w-10 rounded-xl object-cover" />
          <span className="text-xl font-extrabold tracking-tight text-lp-ink" translate="no">
            {data.brandName}
          </span>
        </button>

        <div className="hidden items-center gap-6 text-[13px] font-semibold text-lp-ink/70 xl:flex">
          {links.map((l, i) => (
            <a key={i} href={l.target} onClick={go(l.target)} className="whitespace-nowrap transition-colors hover:text-lp-primary">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {data.earnText && (
            <a href={data.earnTarget} onClick={go(data.earnTarget)} className="hidden whitespace-nowrap text-[13px] font-semibold text-lp-ink/70 transition-colors hover:text-lp-primary sm:block">
              {data.earnText}
            </a>
          )}
          {showLang && <LanguageMenu popular={languages} showAll={showAll} />}
          <div className="hidden sm:block">
            <GetAppMenu data={data} download={download} />
          </div>
          <button type="button" className="rounded-lg p-2 text-lp-ink xl:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="max-h-[80vh] space-y-1 overflow-auto border-t border-lp-ink/5 bg-white px-4 pb-4 xl:hidden">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.target}
              onClick={(e) => {
                setOpen(false);
                go(l.target)(e);
              }}
              className="block rounded-lg px-3 py-3 text-sm font-bold text-lp-ink/80 hover:bg-lp-primary/5"
            >
              {l.label}
            </a>
          ))}
          {data.earnText && (
            <a
              href={data.earnTarget}
              onClick={(e) => {
                setOpen(false);
                go(data.earnTarget)(e);
              }}
              className="block rounded-lg px-3 py-3 text-sm font-bold text-lp-primary hover:bg-lp-primary/5"
            >
              {data.earnText}
            </a>
          )}
          <div className="grid grid-cols-2 gap-2 pt-2 sm:hidden">
            <StoreRow href={download?.playStoreUrl} name="Google Play" subtitle={data.storeSubtitle || 'Kailo Taxi App'} icon={<PlayIcon />} />
            <StoreRow href={download?.appStoreUrl} name="App Store" subtitle={data.storeSubtitle || 'Kailo Taxi App'} icon={<AppleIcon />} />
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------- About */

export function About({ data }) {
  const cards = arr(data.cards);
  return (
    <section id="about" className="relative overflow-hidden bg-gradient-to-b from-lp-mint via-lp-lime-1 to-lp-mint-2 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-lp-accent/25 blur-3xl max-sm:hidden" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-lp-primary/15 blur-3xl max-sm:hidden" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            {data.eyebrow && <span className="block text-[11px] font-extrabold uppercase tracking-[0.22em] text-lp-primary">{data.eyebrow}</span>}
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-lp-ink sm:text-5xl">{data.title}</h2>
            <p className="mt-5 text-base leading-relaxed text-lp-ink/65 sm:text-lg">{data.description}</p>
          </div>
        </Reveal>
        {data.image && (
          <Reveal delay={0.1}>
            <img src={data.image} alt="" className="mx-auto mt-10 max-h-80 w-full max-w-3xl rounded-3xl object-cover shadow-xl" />
          </Reveal>
        )}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => {
            const Icon = iconFor(c.icon);
            return (
              <Reveal key={i} delay={i * 0.08}>
                <Tilt className="h-full rounded-3xl border border-white bg-white/80 p-6 shadow-[0_22px_44px_-30px_rgba(5,46,43,0.6)]" max={4}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lp-primary-2 to-lp-primary text-lp-accent shadow-lg shadow-lp-primary/25">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-lp-ink">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-lp-ink/60">{c.description}</p>
                </Tilt>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Services */

export function Services({ data }) {
  const items = arr(data.items);
  if (!items.length) return null;
  return (
    <section id="services" className="relative overflow-hidden bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{ backgroundImage: 'radial-gradient(#0F766E22 1.2px, transparent 1.2px)', backgroundSize: '22px 22px' }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lp-accent/30 blur-3xl max-sm:hidden" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <SectionHead eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle} />
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((s, i) => {
            const Icon = iconFor(s.icon);
            return (
              <Reveal key={i} delay={(i % 4) * 0.08}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-lp-primary/10 bg-lp-mint-pale p-7 transition duration-300 hover:-translate-y-1.5 hover:border-transparent hover:bg-lp-primary hover:shadow-[0_30px_50px_-28px_rgba(15,118,110,0.8)]">
                  <span className="absolute -right-3 -top-5 select-none text-8xl font-extrabold text-lp-primary/[0.07] transition group-hover:text-white/10">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-lp-primary text-lp-accent transition group-hover:bg-lp-accent group-hover:text-lp-ink">
                    <Icon size={22} />
                  </span>
                  <h3 className="relative mt-5 text-lg font-bold text-lp-ink transition group-hover:text-white">{s.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-lp-ink/60 transition group-hover:text-white/80">{s.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ How it works */

export function HowItWorks({ data }) {
  const tabs = arr(data.tabs).filter((t) => t && arr(t.steps).length);
  const [active, setActive] = useState(0);
  if (!tabs.length) return null;
  const tab = tabs[Math.min(active, tabs.length - 1)];
  const steps = arr(tab.steps);
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-gradient-to-b from-lp-mint-2 via-lp-lime-2 to-lp-mint-3 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-lp-primary/10 blur-3xl max-sm:hidden" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <SectionHead eyebrow={data.eyebrow} title={data.title} />
        </Reveal>
        <div className="-mt-4 mb-10 flex justify-center overflow-x-auto sm:mb-12">
          <div className="inline-flex gap-1 rounded-full border border-lp-ink/10 bg-white p-1.5 shadow-sm">
            {tabs.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-bold transition ${
                  i === active ? 'bg-lp-ink text-white shadow' : 'text-lp-ink/65 hover:bg-lp-ink/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((s, i) => (
              <div key={i} className="relative flex flex-col rounded-3xl border border-white bg-white/85 p-6 shadow-[0_22px_44px_-30px_rgba(5,46,43,0.6)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lp-ink text-sm font-extrabold text-lp-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-5 text-lg font-bold text-lp-ink">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-lp-ink/60">{s.description}</p>
                <div className="mt-5 border-t border-lp-ink/10 pt-4 text-xs font-bold text-lp-primary">
                  {data.stepLabel || 'Step'} {i + 1} →
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Founder */

function Initials({ name }) {
  const letters = String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-lp-primary-2 to-lp-dark text-5xl font-extrabold text-lp-accent">{letters}</div>
  );
}

export function Founder({ data }) {
  const people = arr(data.people);
  const journey = arr(data.journey);
  if (!people.length && !journey.length) return null;
  return (
    <section id="founder" className="relative overflow-hidden bg-gradient-to-b from-lp-mint-3 to-lp-mint px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <SectionHead eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle} />
        </Reveal>
        <div className={`mx-auto grid gap-6 ${people.length > 1 ? 'md:grid-cols-2' : 'max-w-4xl'}`}>
          {people.map((p, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="flex h-full flex-col gap-6 overflow-hidden rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_30px_60px_-36px_rgba(5,46,43,0.7)] sm:flex-row sm:p-8">
                <div className="mx-auto h-44 w-44 shrink-0 overflow-hidden rounded-3xl shadow-lg sm:mx-0">
                  {p.photo ? <img src={p.photo} alt={p.name} className="h-full w-full object-cover" /> : <Initials name={p.name} />}
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-lp-ink">{p.name}</h3>
                  <p className="mt-1 text-sm font-bold uppercase tracking-wider text-lp-primary">{p.role}</p>
                  <p className="mt-4 text-sm leading-relaxed text-lp-ink/65">{p.bio}</p>
                  {p.quote && (
                    <p className="mt-4 flex gap-2 border-l-4 border-lp-accent pl-3 text-sm font-semibold italic text-lp-ink/80">
                      <Quote size={16} className="mt-0.5 shrink-0 text-lp-primary" /> {p.quote}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {journey.length > 0 && (
          <div id="journey" className="mt-10">
            <Reveal>
              <h3 className="mb-7 text-center text-2xl font-extrabold text-lp-ink sm:text-3xl">{data.journeyTitle}</h3>
            </Reveal>
            <div className="relative grid gap-6 md:grid-cols-4">
              <div className="pointer-events-none absolute left-0 right-0 top-[22px] hidden h-[2px] bg-gradient-to-r from-transparent via-lp-primary/40 to-transparent md:block" />
              {journey.map((j, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="relative text-center">
                    <span className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-lp-ink text-sm font-extrabold text-lp-accent ring-4 ring-lp-mint">{i + 1}</span>
                    <div className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-lp-primary">{j.year}</div>
                    <h4 className="mt-1 text-base font-bold text-lp-ink">{j.title}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-lp-ink/60">{j.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Contact */

function InfoCard({ icon: Icon, title, children, href }) {
  const body = (
    <div className="flex h-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-5 transition hover:border-lp-accent/40 hover:bg-white/[0.12]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lp-accent text-lp-ink">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/55">{title}</div>
        <div className="mt-1 break-words text-[15px] font-semibold leading-snug text-white">{children}</div>
      </div>
    </div>
  );
  if (!href) return body;
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block">
      {body}
    </a>
  );
}

const waLink = (n) => `https://wa.me/${String(n || '').replace(/[^\d]/g, '')}`;

const fieldCls =
  'mt-1.5 w-full rounded-xl border border-lp-ink/12 bg-white px-4 py-3 text-sm text-lp-ink outline-none transition placeholder:text-lp-ink/35 focus:border-lp-primary focus:ring-2 focus:ring-lp-primary/20';

export function Contact({ data, footer }) {
  const topics = arr(data.topics);
  const [form, setForm] = useState({ name: '', contact: '', topic: topics[0] || '', message: '' });
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const helpline = data.helpline || footer?.phone;
  const email = data.email || footer?.email;
  const extra = arr(data.extraCards);

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: false, error: '' });
    try {
      await submitLandingLead({
        name: form.name,
        contact: form.contact,
        role: (form.topic || 'contact').toLowerCase(),
        message: form.message,
      });
      setForm({ name: '', contact: '', topic: topics[0] || '', message: '' });
      setState({ busy: false, done: true, error: '' });
    } catch (err) {
      setState({ busy: false, done: false, error: err?.message || 'Could not send. Please try again.' });
    }
  };

  return (
    <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-lp-dark via-lp-mid to-lp-primary px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-lp-accent/15 blur-3xl max-sm:hidden" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <SectionHead light eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle} />
        </Reveal>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.05fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {helpline && (
              <InfoCard icon={Phone} title={data.helplineLabel ?? 'Helpline'} href={`tel:${String(helpline).replace(/\s/g, '')}`}>
                {helpline}
              </InfoCard>
            )}
            {data.whatsapp && (
              <InfoCard icon={MessageCircle} title={data.whatsappLabel ?? 'WhatsApp'} href={waLink(data.whatsapp)}>
                <span className="text-lp-accent">{data.whatsappText || 'Chat Now'} →</span>
              </InfoCard>
            )}
            {email && (
              <InfoCard icon={Mail} title={data.emailLabel ?? 'Email'} href={`mailto:${email}`}>
                {email}
              </InfoCard>
            )}
            {data.hours && (
              <InfoCard icon={Clock} title={data.hoursLabel ?? 'Hours'}>
                {data.hours}
              </InfoCard>
            )}
            {data.address && (
              <InfoCard icon={MapPin} title={data.addressLabel ?? 'Office'}>
                {data.address}
              </InfoCard>
            )}
            {extra.map((c, i) => (
              <InfoCard key={i} icon={iconFor(c.icon)} title={c.title}>
                <span className="text-sm font-medium text-white/80">{c.text}</span>
              </InfoCard>
            ))}
          </div>

          <form onSubmit={submit} className="rounded-[2rem] bg-white p-6 text-lp-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] sm:p-8">
            <h3 className="text-xl font-extrabold">{data.formTitle}</h3>
            <p className="mt-1 text-sm text-lp-ink/55">{data.formSubtitle}</p>
            {state.done ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-lp-mint p-5 text-sm font-semibold text-lp-primary">
                <Check size={20} className="mt-0.5 shrink-0" /> {data.successMessage}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-lp-ink/70">
                  {data.nameLabel} *
                  <input required minLength={2} value={form.name} onChange={set('name')} className={fieldCls} placeholder="e.g. Ravi Kumar" />
                </label>
                <label className="text-xs font-bold text-lp-ink/70">
                  {data.contactLabel} *
                  <input required value={form.contact} onChange={set('contact')} className={fieldCls} placeholder="Phone or email" />
                </label>
                {topics.length > 0 && (
                  <label className="text-xs font-bold text-lp-ink/70 sm:col-span-2">
                    {data.topicLabel}
                    <select value={form.topic} onChange={set('topic')} className={fieldCls}>
                      {topics.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-xs font-bold text-lp-ink/70 sm:col-span-2">
                  {data.messageLabel} *
                  <textarea required rows={4} value={form.message} onChange={set('message')} className={`${fieldCls} resize-y`} placeholder="How can we help you?" />
                </label>
                {state.error && <p className="text-sm font-semibold text-red-600 sm:col-span-2">{state.error}</p>}
                <button
                  type="submit"
                  disabled={state.busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-lp-ink px-6 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60 sm:col-span-2 sm:w-fit"
                >
                  {state.busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {data.buttonText}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Footer */

function FooterLink({ link }) {
  const go = useGo();
  const raw = String(link.target || '');
  const t = PUBLIC_PATHS[raw.replace(/\/$/, '')] || raw;
  const cls = 'transition-colors hover:text-lp-accent';
  if (t.startsWith('/') && !t.startsWith('//')) {
    return (
      <Link to={t} className={cls}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={t} onClick={go(t)} className={cls}>
      {link.label}
    </a>
  );
}

function FooterStore({ href, icon, name }) {
  const cls = 'inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition';
  if (!href)
    return (
      <span className={`${cls} cursor-default opacity-70`} title="Coming soon">
        {icon} {name}
      </span>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-lp-accent/60 hover:bg-white/10`}>
      {icon} {name}
    </a>
  );
}

export function Footer({ data, brand, logo: cmsLogo, download }) {
  const logo = useAdminLogo(cmsLogo);
  const columns = arr(data.columns);
  const social = arr(data.social);
  const company = data.companyName || brand;
  const copyright = String(data.copyright || '© {year} {company}. All rights reserved.')
    .replace(/\{year\}/g, new Date().getFullYear())
    .replace(/\{company\}/g, company);
  const qrTarget = download?.qrUrl || download?.playStoreUrl || download?.appStoreUrl;
  const qrSrc =
    download?.showQr === false
      ? ''
      : download?.qrImage || (qrTarget ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(qrTarget)}` : '');
  const colTitle = 'text-[11px] font-extrabold uppercase tracking-[0.2em] text-white';
  return (
    <footer id="footer" className="bg-lp-deep px-4 pb-8 pt-10 text-white sm:px-6 sm:pt-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 items-center rounded-xl bg-white px-2">
                <img src={logo || '/kailo-taxi-logo.png'} alt="" className="h-8 w-8 rounded-lg object-cover" />
              </span>
              <span className="text-xl font-extrabold tracking-tight text-lp-accent" translate="no">
                {brand}
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/60">{data.about}</p>
            {data.showStoreBadges !== false && (
              <div className="flex flex-wrap gap-2.5">
                <FooterStore href={download?.playStoreUrl} icon={<PlayIcon />} name="Google Play" />
                <FooterStore href={download?.appStoreUrl} icon={<AppleIcon />} name="App Store" />
              </div>
            )}
            {qrSrc && (
              <div className="flex items-center gap-3">
                <img src={qrSrc} alt="Scan to download the app" className="h-16 w-16 rounded-lg bg-white object-contain p-1" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">{download?.qrLabel ?? 'Scan to get the app'}</span>
              </div>
            )}
          </div>

          {columns.map((c, i) => (
            <div key={i}>
              <h4 className={colTitle}>{c.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm font-medium text-white/60">
                {arr(c.links).map((l, j) => (
                  <li key={j}>
                    <FooterLink link={l} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className={colTitle}>{data.locationTitle || 'LOCATION'}</h4>
            <div className="mt-4 space-y-3 text-sm text-white/60">
              {data.address && <p className="leading-relaxed">{data.address}</p>}
              {data.phone && (
                <p>
                  {data.helplineLabel || 'Helpline'}:{' '}
                  <a href={`tel:${String(data.phone).replace(/\s/g, '')}`} className="font-bold text-white hover:text-lp-accent">
                    {data.phone}
                  </a>
                </p>
              )}
              {data.email && (
                <p>
                  <a href={`mailto:${data.email}`} className="hover:text-lp-accent">
                    {data.email}
                  </a>
                </p>
              )}
              {social.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 font-bold">
                  {social.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-lp-accent">
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 pt-7 text-xs text-white/45 sm:flex-row">
          <p>{copyright}</p>
          <p>
            {data.builtIn}
            {data.builtIn && data.tagline ? ' • ' : ''}
            {data.tagline}
          </p>
        </div>

      </div>
    </footer>
  );
}
