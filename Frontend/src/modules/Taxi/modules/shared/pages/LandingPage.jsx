import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Menu,
  Smartphone,
  X,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Users,
  KeyRound,
  Bike,
  Bus,
  Package,
  Route,
} from 'lucide-react';
import taxiImg from '@/assets/3d images/AutoCab/taxi.png';
import mapImg from '@/assets/premium_grid_map.webp';
import taxiCut from '@/assets/landing/cutout/taxi.webp';
import aboutPhoto from '@/assets/driver_welcome_hero.webp';
import cityIllu from '@/assets/images/mobility-illustration.png';
import coastImg from '@/assets/landing/options.png';
import bikeImg from '@/assets/landing/cutout/bike.webp';
import busImg from '@/assets/landing/cutout/bus.webp';
import parcelImg from '@/assets/landing/cutout/parcel.webp';
import tripImg from '@/assets/landing/cutout/one-way.webp';
import sceneCab from '@/assets/landing/scenes/cab.webp';
import sceneBike from '@/assets/landing/scenes/bike.webp';
import sceneBus from '@/assets/landing/scenes/bus.webp';
import sceneParcel from '@/assets/landing/scenes/parcel.webp';
import sceneTrip from '@/assets/landing/scenes/outstation.webp';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Reveal, SplitText, Tilt, Stage, Layer, useReducedMotion, useIsDesktop } from './landing3d';
import { useLandingContent } from '../../../shared/hooks/useLandingContent';
import './LandingPage.css';

// Only used if the API cannot be reached; the real content lives in Admin > Website & Pages > Landing Page.
const FALLBACK = {
  header: { brandName: 'Kailo Taxi', links: [], ctaText: 'Get the App', ctaTarget: '/taxi/user' },
  hero: {
    title: 'Every ride,',
    highlight: 'under control.',
    subtitle: 'City rides, rentals, parcels and intercity trips in one app.',
    primaryText: 'Book a Ride',
    primaryTarget: '/taxi/user',
  },
};

const AUDIENCE_ICONS = { user: Users, driver: Car, owner: KeyRound };
const arr = (v) => (Array.isArray(v) ? v : []);

function useGo() {
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

function SectionHead({ eyebrow, title, subtitle, light }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      {eyebrow && (
        <span
          className={`inline-block rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${
            light ? 'bg-white/15 text-white' : 'bg-[#0F766E]/10 text-[#0F766E]'
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2 className={`mt-4 text-3xl font-black tracking-tight sm:text-4xl ${light ? 'text-white' : 'text-[#14213D]'}`}>{title}</h2>
      {subtitle && <p className={`mt-3 text-base ${light ? 'text-white/75' : 'text-[#14213D]/60'}`}>{subtitle}</p>}
    </div>
  );
}

// Small Play Store / App Store badges. Links come from Admin > Landing Page > Store links.
// With no link yet the badge stays visible but inert ("coming soon").
function MiniStoreBadge({ href, store, label, children, full }) {
  const cls = `flex items-center gap-2 rounded-xl bg-[#14213D] px-3 py-1.5 text-white shadow-md transition ${full ? 'flex-1 justify-center' : ''}`;
  const inner = (
    <>
      <span className="flex h-5 w-5 items-center justify-center">{children}</span>
      <span className="text-left leading-none">
        <span className="block text-[8px] font-semibold uppercase tracking-wider text-white/60">{href ? label : 'Coming soon'}</span>
        <span className="mt-0.5 block text-[13px] font-black">{store}</span>
      </span>
    </>
  );
  if (!href) return <span className={`${cls} cursor-default opacity-80`} title="Coming soon">{inner}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:-translate-y-0.5 hover:bg-black`}>
      {inner}
    </a>
  );
}

function Header({ data, download }) {
  const go = useGo();
  const [open, setOpen] = useState(false);
  const links = arr(data.links);
  const badges = (full) => (
    <>
      <MiniStoreBadge href={download?.playStoreUrl} store="Google Play" label="Get it on" full={full}>
        <PlayIcon />
      </MiniStoreBadge>
      <MiniStoreBadge href={download?.appStoreUrl} store="App Store" label="Download on" full={full}>
        <AppleIcon />
      </MiniStoreBadge>
    </>
  );
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#14213D]/5 bg-white/90">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3">
          <img src={data.logo || '/kailo-taxi-logo.png'} alt="" className="h-10 w-10 rounded-xl object-cover" />
          <span className="text-xl font-black tracking-tight text-[#14213D]">{data.brandName}</span>
        </button>

        <div className="hidden items-center gap-8 text-[13px] font-bold text-[#14213D]/65 md:flex">
          {links.map((l) => (
            <a key={l.label} href={l.target} onClick={go(l.target)} className="transition-colors hover:text-[#0F766E]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">{badges(false)}</div>
          <button type="button" className="rounded-lg p-2 text-[#14213D] md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="space-y-1 border-t border-[#14213D]/5 bg-white px-4 pb-4 md:hidden">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.target}
              onClick={(e) => {
                setOpen(false);
                go(l.target)(e);
              }}
              className="block rounded-lg px-3 py-3 text-sm font-bold text-[#14213D]/80 hover:bg-[#0F766E]/5"
            >
              {l.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">{badges(true)}</div>
        </div>
      )}
    </header>
  );
}

const VEHICLE_IMG = { cab: taxiCut, bike: bikeImg, bus: busImg, parcel: parcelImg, outstation: taxiCut };
const SCENE_IMG = { cab: sceneCab, bike: sceneBike, bus: sceneBus, parcel: sceneParcel, outstation: sceneTrip };
const ACCENT = { cab: '#C6F432', bike: '#FFB347', bus: '#38D0F8', parcel: '#B79CFF', outstation: '#FB923C' };
const VEHICLE_ICON = { cab: Car, bike: Bike, bus: Bus, parcel: Package, outstation: Route };
const AUTOPLAY_MS = 6000;

// Soft glowing dots that drift upward behind everything.
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 47) % 100,
  size: 3 + ((i * 7) % 5),
  delay: (i * 0.7) % 9,
  duration: 9 + ((i * 3) % 8),
}));

function RoadFloor({ accent }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[42%] overflow-hidden md:block" style={{ perspective: 520 }} aria-hidden="true">
      <div
        className="absolute -inset-x-[40%] bottom-[-30%] h-[170%] origin-bottom"
        style={{ transform: 'rotateX(66deg)', maskImage: 'linear-gradient(to top, black 35%, transparent 95%)', WebkitMaskImage: 'linear-gradient(to top, black 35%, transparent 95%)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#031a19] via-[#06302d] to-transparent" />
        <div className="absolute inset-y-0 left-[30%] w-[3px]" style={{ background: accent, boxShadow: `0 0 18px 3px ${accent}` }} />
        <div className="absolute inset-y-0 right-[30%] w-[3px]" style={{ background: accent, boxShadow: `0 0 18px 3px ${accent}` }} />
        {/* lane dashes: the strip is taller than the box and slides by exactly one period */}
        <div
          className="landing-road-run absolute -top-[170px] bottom-0 left-1/2 w-[10px] -translate-x-1/2"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.85) 0 70px, transparent 70px 170px)' }}
        />
      </div>
    </div>
  );
}

function SpeedLines({ accent }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {[18, 30, 44, 56, 68, 78].map((top, i) => (
        <motion.span
          key={i}
          className="absolute h-[2px] rounded-full"
          style={{ top: `${top}%`, width: `${160 + (i % 3) * 90}px`, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          initial={{ left: '105%', opacity: 0 }}
          animate={{ left: '-30%', opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.9, delay: i * 0.05, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function Hero({ data, download }) {
  const go = useGo();
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const slides = useMemo(() => {
    const list = arr(data.slides).filter((s) => s && (s.title || s.highlight));
    if (list.length) return list;
    return [{ key: 'cab', tab: 'Cab', badge: data.badge, title: data.title, highlight: data.highlight, subtitle: data.subtitle, ctaText: data.primaryText, ctaTarget: data.primaryTarget, image: data.image }];
  }, [data]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeRef = useRef(null);
  const slide = slides[Math.min(active, slides.length - 1)];
  const accent = ACCENT[slide.key] || '#C6F432';

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 20 });
  const sy = useSpring(my, { stiffness: 50, damping: 20 });
  const bgX = useTransform(sx, [-0.5, 0.5], [18, -18]);
  const bgY = useTransform(sy, [-0.5, 0.5], [10, -10]);
  const farX = useTransform(sx, [-0.5, 0.5], [-30, 30]);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  useEffect(() => {
    if (paused || reduce || slides.length < 2) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % slides.length), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [active, paused, reduce, slides.length]);

  useEffect(() => () => clearTimeout(resumeRef.current), []);

  const customVehicle = slide.image;
  const bg = slide.background || SCENE_IMG[slide.key] || data.background || sceneCab;
  const isTrip = slide.key === 'outstation' && !customVehicle;

  return (
    <section
      className="relative min-h-[100svh] overflow-hidden bg-[#031a19] pt-20 text-white sm:pt-24 lg:min-h-[760px]"
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {/* scene background: crossfades per tab, slow zoom + pointer parallax */}
      <motion.div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={bg}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bg})` }}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: desktop ? 1.12 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.9 }, scale: { duration: 14, ease: 'linear' } }}
          />
        </AnimatePresence>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#031a19]/90 via-[#031a19]/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#031a19] via-transparent to-[#031a19]/50" />

      {/* accent glow that follows the active tab */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`glow-${active}`}
          className="pointer-events-none absolute right-[2%] top-[10%] hidden h-[620px] w-[620px] rounded-full md:block"
          style={{ background: `radial-gradient(closest-side, ${accent}, transparent)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        />
      </AnimatePresence>

      {desktop && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0 rounded-full bg-white/70"
              style={{ left: `${p.left}%`, width: p.size, height: p.size, boxShadow: `0 0 12px ${accent}` }}
              animate={{ y: [0, -820], opacity: [0, 0.9, 0] }}
              transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      )}

      <RoadFloor accent={accent} />
      {desktop && <SpeedLines key={`speed-${active}`} accent={accent} />}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* vehicle tabs */}
        <div className="-mx-4 mb-6 flex overflow-x-auto px-4 pb-1 sm:mx-0 sm:mb-8 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-1 rounded-2xl border border-white/15 bg-black/30 p-1.5">
            {slides.map((s, i) => {
              const Icon = VEHICLE_ICON[s.key] || Car;
              const on = i === active;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setPaused(true);
                    clearTimeout(resumeRef.current);
                    resumeRef.current = setTimeout(() => setPaused(false), 10000);
                  }}
                  className={`relative flex shrink-0 items-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[12px] font-black uppercase tracking-wider transition-colors duration-500 ${
                    on ? 'text-[#031a19]' : 'text-white/75 hover:bg-white/10'
                  }`}
                  style={on ? { background: ACCENT[s.key] || '#C6F432' } : undefined}
                >
                  <Icon size={15} /> {s.tab || s.key}
                  {on && !paused && !reduce && slides.length > 1 && (
                    <motion.span
                      key={`bar-${active}`}
                      className="absolute bottom-0 left-0 h-[3px] bg-[#031a19]/70"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-center gap-2 pb-16 sm:pb-24 lg:grid-cols-[1fr_1.05fr] lg:pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${active}`}
              initial="hidden"
              animate="show"
              exit="gone"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } }, gone: { transition: { staggerChildren: 0.03 } } }}
            >
              {slide.badge && (
                <motion.span
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 }, gone: { opacity: 0, y: -10 } }}
                  className="inline-block rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em]"
                  style={{ color: accent }}
                >
                  {slide.badge}
                </motion.span>
              )}
              <h1 className="mt-4 text-[2.5rem] font-black leading-[1.06] tracking-tight sm:mt-5 sm:text-6xl lg:text-7xl">
                <motion.span
                  className="block"
                  variants={{ hidden: { opacity: 0, y: 46, rotateX: -50 }, show: { opacity: 1, y: 0, rotateX: 0 }, gone: { opacity: 0, y: -30 } }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {slide.title}
                </motion.span>
                <motion.span
                  className="block"
                  style={{ color: accent, textShadow: `0 0 40px ${accent}66` }}
                  variants={{ hidden: { opacity: 0, y: 46, rotateX: -50 }, show: { opacity: 1, y: 0, rotateX: 0 }, gone: { opacity: 0, y: -30 } }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {slide.highlight}
                </motion.span>
              </h1>
              <motion.p
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 }, gone: { opacity: 0 } }}
                className="mt-4 max-w-xl text-base font-medium leading-relaxed text-white/80 sm:mt-6 sm:text-lg"
              >
                {slide.subtitle}
              </motion.p>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 }, gone: { opacity: 0 } }}
                className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8"
              >
                {slide.ctaText && (
                  <a
                    href={slide.ctaTarget}
                    onClick={go(slide.ctaTarget)}
                    className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#031a19] transition hover:brightness-95 active:scale-95 sm:px-7 sm:py-4 sm:text-[15px]"
                    style={{ background: accent, boxShadow: `0 16px 34px -12px ${accent}` }}
                  >
                    {slide.ctaText} <ArrowRight size={18} strokeWidth={3} />
                  </a>
                )}
                <StoreButton href={download?.playStoreUrl} label="Get it on" store="Google Play">
                  <PlayIcon />
                </StoreButton>
                <StoreButton href={download?.appStoreUrl} label="Download on the" store="App Store">
                  <AppleIcon />
                </StoreButton>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <Stage className="relative mt-2 flex h-[230px] items-center justify-center sm:h-[400px] lg:h-[470px]" tilt={5}>
            {/* glowing turntable the vehicle sits on */}
            <Layer depth={-30} className="absolute bottom-[8%] w-full">
              <div className="mx-auto" style={{ transform: 'rotateX(72deg)', width: desktop ? '78%' : '62%' }}>
                <motion.div
                  className="aspect-square w-full rounded-full border-[3px] border-dashed"
                  style={{ borderColor: accent }}
                  animate={desktop ? { rotate: 360 } : undefined}
                  transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </Layer>
            <Layer depth={70} float={10} className="relative w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`veh-${active}`}
                  className="relative mx-auto flex w-full justify-center"
                  initial={{ opacity: 0, x: 120, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -120 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {isTrip ? (
                    <img
                      src={coastImg}
                      alt=""
                      className="w-[230px] rotate-[-1deg] rounded-[2rem] border-[5px] border-white/25 object-cover shadow-xl sm:w-[400px]"
                    />
                  ) : (
                    <img
                      src={customVehicle || VEHICLE_IMG[slide.key] || taxiCut}
                      alt=""
                      className={`object-contain ${slide.key === 'parcel' && !customVehicle ? 'max-h-[240px] sm:max-h-[420px]' : 'w-[88%] max-w-[580px] sm:w-full'}`}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </Layer>
          </Stage>
        </div>
      </div>

    </section>
  );
}

function About({ data }) {
  const points = arr(data.points);
  return (
    <section id="about" className="relative overflow-hidden bg-gradient-to-b from-[#E6F7EE] via-[#EEFBE0] to-[#DDF3EC] px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#C6F432]/25 blur-3xl max-sm:hidden" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#0F766E]/15 blur-3xl max-sm:hidden" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <Reveal y={12}>
            <span className="inline-block rounded-full bg-[#0F766E]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#0F766E]">
              About us
            </span>
          </Reveal>
          <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-[#14213D] sm:text-5xl">
            <SplitText text={data.title} />
          </h2>
          <Reveal delay={0.2}>
            <p className="mt-5 text-lg leading-relaxed text-[#14213D]/65">{data.description}</p>
          </Reveal>
          <div className="mt-9 grid gap-4 sm:grid-cols-1">
            {points.map((p, i) => (
              <Reveal key={i} delay={0.1 + i * 0.1}>
                <Tilt className="group rounded-2xl border border-[#14213D]/5 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(20,33,61,0.55)]" max={5}>
                  <div className="flex items-start gap-4" style={{ transform: 'translateZ(24px)' }}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#14B8A6] to-[#0F766E] text-lg font-black text-[#C6F432] shadow-lg shadow-[#0F766E]/30">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="font-black text-[#14213D]">{p.title}</div>
                      <div className="mt-0.5 text-sm text-[#14213D]/60">{p.description}</div>
                    </div>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>

        {/* layered 3D composition */}
        <Stage className="relative h-[440px] sm:h-[520px]" tilt={4}>
          <Layer depth={-60} className="absolute inset-0">
            <div className="absolute inset-x-4 inset-y-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#14B8A6] via-[#0F766E] to-[#052E2B] shadow-[0_50px_80px_-40px_rgba(5,46,43,0.9)]">
              <div className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity" style={{ backgroundImage: `url(${mapImg})` }} />
              <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#C6F432]/30 blur-3xl max-sm:hidden" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </Layer>
          <Layer depth={-20} className="absolute left-[6%] top-[14%]">
            <motion.div
              className="h-40 w-40 rounded-full border-2 border-dashed border-[#C6F432]/60"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            />
          </Layer>
          <Layer depth={40} float={10} className="absolute inset-x-0 top-[9%] flex justify-center">
            <img
              src={data.image || aboutPhoto}
              alt=""
              className="aspect-square w-[78%] max-w-[420px] rotate-[-1deg] rounded-[2rem] border-[6px] border-white/80 object-cover shadow-[0_45px_60px_-20px_rgba(0,0,0,0.6)]"
            />
          </Layer>
          {points[0] && (
            <Layer depth={60} float={8} className="absolute left-0 top-[6%]">
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-2xl">
                <ShieldCheck size={18} className="text-[#0F766E]" />
                <span className="text-sm font-black text-[#14213D]">{points[0].title}</span>
              </div>
            </Layer>
          )}
          {points[1] && (
            <Layer depth={70} float={10} className="absolute right-0 top-[40%]">
              <div className="flex items-center gap-2 rounded-2xl bg-[#C6F432] px-4 py-3 shadow-2xl">
                <CheckCircle2 size={18} className="text-[#14213D]" />
                <span className="text-sm font-black text-[#14213D]">{points[1].title}</span>
              </div>
            </Layer>
          )}
          {points[2] && (
            <Layer depth={50} float={8} className="absolute bottom-[5%] left-[6%]">
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-2xl">
                <Users size={18} className="text-[#0F766E]" />
                <span className="text-sm font-black text-[#14213D]">{points[2].title}</span>
              </div>
            </Layer>
          )}
        </Stage>
      </div>
    </section>
  );
}

function FloatCard({ card, accent }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 shadow-[0_20px_30px_-12px_rgba(0,0,0,0.5)] ${
        accent ? 'bg-[#C6F432] text-[#14213D]' : 'bg-white/95 text-[#14213D]'
      }`}
    >
      <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{card.label}</div>
      <div className="text-lg font-black">{card.value}</div>
    </div>
  );
}

// Vision & mission: a compact strip; the values cycle automatically in a 3D flip card.
function VisionCarousel({ data }) {
  const values = arr(data.values);
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (hold || values.length < 2) return undefined;
    const t = setTimeout(() => setI((n) => (n + 1) % values.length), 4200);
    return () => clearTimeout(t);
  }, [i, hold, values.length]);

  if (!values.length && !data.description) return null;
  const cur = values[Math.min(i, values.length - 1)];

  return (
    <div
      id="vision"
      className="relative mb-14 scroll-mt-24 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
    >
      <div className="grid items-center gap-5 md:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">Vision &amp; mission</span>
          <h3 className="mt-2 text-2xl font-black tracking-tight">{data.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/75">{data.description}</p>
          {data.mission && <p className="mt-2 text-sm font-bold text-[#C6F432]">{data.mission}</p>}
        </div>

        {cur && (
          <div style={{ perspective: 1000 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, rotateX: -70, y: 20 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, rotateX: 70, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
                className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C6F432] text-2xl font-black text-[#14213D]">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-lg font-black">{cur.title}</div>
                  <p className="text-sm leading-snug text-white/75">{cur.description}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 flex items-center justify-center gap-2">
              {values.map((v, n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={v.title}
                  onClick={() => setI(n)}
                  className="relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-all"
                  style={{ width: n === i ? 36 : 8 }}
                >
                  {n === i && !hold && values.length > 1 && (
                    <motion.span
                      key={`p-${i}`}
                      className="absolute inset-y-0 left-0 bg-[#C6F432]"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 4.2, ease: 'linear' }}
                    />
                  )}
                  {n === i && hold && <span className="absolute inset-0 bg-[#C6F432]" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Rider({ data, vision }) {
  const go = useGo();
  const cards = arr(data.floatCards);
  const bg = data.background || mapImg;
  return (
    <section id="rider" className="relative overflow-hidden bg-[#052E2B] px-4 py-16 text-white sm:px-6 lg:px-8" style={{ perspective: 1400 }}>
      {/* 3D city map floor: a tilted plane that slowly drifts */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -inset-x-1/4 -bottom-1/3 top-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${bg})`, transform: 'rotateX(58deg) scale(1.5)', transformOrigin: '50% 100%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#052E2B] via-[#052E2B]/70 to-[#0F766E]/60" />
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-[#C6F432]/20 blur-3xl max-sm:hidden" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {vision && <VisionCarousel data={vision} />}
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            {data.eyebrow && (
              <Reveal y={12}>
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">{data.eyebrow}</span>
              </Reveal>
            )}
            <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              <SplitText text={data.title} />
              <br />
              <SplitText text={data.highlight} className="text-[#C6F432]" delay={0.2} />
            </h2>
            <Reveal delay={0.35}>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">{data.description}</p>
              <ul className="mt-7 space-y-3">
                {arr(data.bullets).map((b, i) => (
                  <li key={i} className="flex items-center gap-3 font-semibold text-white/90">
                    <CheckCircle2 size={20} className="shrink-0 text-[#C6F432]" /> {b}
                  </li>
                ))}
              </ul>
              {data.ctaText && (
                <a
                  href={data.ctaTarget}
                  onClick={go(data.ctaTarget)}
                  className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-[#C6F432] px-7 py-4 text-[15px] font-black text-[#14213D] shadow-[0_16px_30px_-12px_rgba(198,244,50,0.8)] transition hover:brightness-95 active:scale-95"
                >
                  {data.ctaText} <ArrowRight size={18} strokeWidth={3} />
                </a>
              )}
            </Reveal>
          </div>

          <Stage className="relative flex h-[330px] items-center justify-center sm:h-[420px]" tilt={5}>
            <Layer depth={-80} className="absolute">
              <div className="h-72 w-72 rounded-[2.5rem] border border-white/15 bg-white/5 sm:h-96 sm:w-96" style={{ transform: 'rotate(3deg)' }} />
            </Layer>
            <Layer depth={0} className="absolute">
              <motion.div
                className="h-60 w-60 rounded-full border-2 border-dashed border-[#C6F432]/50 sm:h-80 sm:w-80"
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
              />
            </Layer>
            <Layer depth={90} float={16} className="relative">
              <img
                src={data.image || cityIllu}
                alt=""
                className="w-[300px] rotate-[1deg] rounded-[2rem] border-[5px] border-white/25 object-cover shadow-[0_50px_60px_-20px_rgba(0,0,0,0.65)] sm:w-[400px]"
              />
            </Layer>
            {cards[0] && (
              <Layer depth={50} float={8} className="absolute left-0 top-4">
                <FloatCard card={cards[0]} />
              </Layer>
            )}
            {cards[1] && (
              <Layer depth={60} float={10} className="absolute right-0 top-24">
                <FloatCard card={cards[1]} accent />
              </Layer>
            )}
            {cards[2] && (
              <Layer depth={45} float={8} className="absolute bottom-6 left-4 sm:left-10">
                <FloatCard card={cards[2]} />
              </Layer>
            )}
          </Stage>
        </div>

      </div>
    </section>
  );
}

const AUDIENCE_THEMES = [
  {
    card: 'bg-gradient-to-br from-[#14B8A6] via-[#0F766E] to-[#052E2B] text-white',
    glow: 'bg-[#C6F432]/30',
    icon: 'bg-[#C6F432] text-[#14213D]',
    muted: 'text-white/75',
    check: 'text-[#C6F432]',
    cta: 'text-[#C6F432]',
    store: 'bg-white text-[#14213D] hover:bg-[#C6F432]',
    storeSub: 'text-[#14213D]/60',
  },
  {
    card: 'bg-gradient-to-br from-[#E4FF7A] via-[#C6F432] to-[#8FD414] text-[#14213D]',
    glow: 'bg-white/50',
    icon: 'bg-[#052E2B] text-[#C6F432]',
    muted: 'text-[#14213D]/70',
    check: 'text-[#052E2B]',
    cta: 'text-[#052E2B]',
    store: 'bg-[#052E2B] text-white hover:bg-black',
    storeSub: 'text-white/60',
  },
];

function PlayBadge({ href, theme }) {
  const base = `inline-flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-lg transition ${theme.store}`;
  const inner = (
    <>
      <PlayIcon />
      <span className="text-left leading-tight">
        <span className={`block text-[9px] font-semibold uppercase tracking-wider ${theme.storeSub}`}>{href ? 'Get it on' : 'Coming soon on'}</span>
        <span className="block text-sm font-black">Google Play</span>
      </span>
    </>
  );
  if (!href) return <span className={`${base} cursor-default opacity-90`}>{inner}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} hover:-translate-y-0.5`}>
      {inner}
    </a>
  );
}

function Audiences({ data, download }) {
  const go = useGo();
  const items = arr(data.items).filter((it) => it.key !== 'user');
  return (
    <section id="audiences" className="relative overflow-hidden bg-gradient-to-b from-[#DDF3EC] via-[#EAF8D8] to-[#D9F1EA] px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-[#0F766E]/10 blur-3xl max-sm:hidden" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#C6F432]/25 blur-3xl max-sm:hidden" />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <SectionHead eyebrow="Partner with us" title={data.title} subtitle={data.subtitle} />
        </Reveal>
        <div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-2">
          {items.map((it, i) => {
            const Icon = AUDIENCE_ICONS[it.key] || Users;
            const t = AUDIENCE_THEMES[i % AUDIENCE_THEMES.length];
            const storeUrl = it.playStoreUrl || download?.playStoreUrl || '';
            return (
              <Reveal key={i} delay={i * 0.12}>
                <Tilt className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] shadow-[0_40px_70px_-35px_rgba(5,46,43,0.75)] ${t.card}`} max={7}>
                  {/* decorative depth */}
                  <div className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-2xl max-sm:hidden ${t.glow}`} />
                  <div className="pointer-events-none absolute -bottom-24 -left-10 h-60 w-60 rounded-full border-[24px] border-white/10" />
                  <Icon className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 opacity-[0.09]" strokeWidth={1.2} />

                  {it.image && <img src={it.image} alt="" className="relative h-44 w-full object-cover" />}
                  <div className="relative flex flex-1 flex-col p-8" style={{ transform: 'translateZ(30px)' }}>
                    <span className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${t.icon}`}>
                      <Icon size={26} />
                    </span>
                    <h3 className="text-3xl font-black tracking-tight">{it.name}</h3>
                    <p className={`mt-2 text-[15px] leading-relaxed ${t.muted}`}>{it.description}</p>
                    <ul className="mt-5 space-y-2.5">
                      {arr(it.bullets).map((b, j) => (
                        <li key={j} className="flex items-center gap-2.5 text-sm font-bold">
                          <CheckCircle2 size={18} className={t.check} /> {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <PlayBadge href={storeUrl} theme={t} />
                      {it.ctaText && (
                        <a
                          href={it.ctaTarget}
                          onClick={go(it.ctaTarget)}
                          className={`inline-flex items-center gap-2 text-sm font-black transition group-hover:gap-3 ${t.cta}`}
                        >
                          {it.ctaText} <ArrowRight size={16} strokeWidth={3} />
                        </a>
                      )}
                    </div>
                  </div>
                </Tilt>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <path fill="#00D7FE" d="M3.6 2.4c-.3.3-.5.8-.5 1.4v16.4c0 .6.2 1.1.5 1.4l9.1-9.6z" />
    <path fill="#FFCE00" d="M16 15.5 12.7 12 16 8.5l4 2.3c1.1.6 1.1 1.7 0 2.4z" />
    <path fill="#00F076" d="M3.6 21.6c.4.4 1 .4 1.7.1L16 15.5 12.7 12z" />
    <path fill="#FF3A44" d="M16 8.5 5.3 2.3c-.7-.4-1.300-.3-1.700.1L12.700 12z" />
  </svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
    <path d="M16.4 12.6c0-2.500 2-3.700 2.100-3.800-1.200-1.700-3-1.900-3.600-1.900-1.500-.2-3 .9-3.800.9s-2-.9-3.300-.8c-1.700 0-3.300 1-4.100 2.500-1.800 3.100-.5 7.600 1.200 10.100.8 1.200 1.800 2.600 3.100 2.500 1.200 0 1.700-.8 3.200-.8s1.900.8 3.200.8 2.200-1.200 3-2.400c.9-1.400 1.300-2.700 1.300-2.800-.1 0-2.300-.9-2.300-3.300zM14 5.200c.7-.8 1.100-1.900 1-3-1 0-2.100.7-2.800 1.500-.6.700-1.200 1.800-1 2.900 1.100.1 2.100-.6 2.800-1.400z" />
  </svg>
);

function StoreButton({ href, label, store, children }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-[#14213D] px-5 py-3 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-black"
    >
      {children}
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">{label}</span>
        <span className="block text-base font-black">{store}</span>
      </span>
    </a>
  );
}

function Faq({ data }) {
  const [open, setOpen] = useState(0);
  const items = arr(data.items);
  if (!items.length) return null;
  return (
    <section id="faq" className="bg-gradient-to-b from-[#D9F1EA] to-[#CDEBE4] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionHead eyebrow="FAQ" title={data.title} />
        <div className="space-y-3">
          {items.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_14px_30px_-22px_rgba(5,46,43,0.5)]">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                <span className="font-black text-[#14213D]">{f.question}</span>
                <ChevronDown size={20} className={`shrink-0 text-[#0F766E] transition ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="px-6 pb-5 text-sm leading-relaxed text-[#14213D]/65">{f.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Short public paths are mapped to the real taxi routes; unknown short paths would otherwise
// fall into the "resume last panel" redirect and land on the admin dashboard.
const PUBLIC_PATHS = {
  '/privacy': '/taxi/privacy',
  '/terms': '/taxi/terms',
  '/contact': '/taxi/contact',
  '/about': '/taxi/about',
  '/faq': '/taxi/faq',
  '/refund': '/taxi/refund',
  '/cancellation': '/taxi/cancellation',
};

function FooterLink({ link }) {
  const go = useGo();
  const raw = String(link.target || '');
  const t = PUBLIC_PATHS[raw.replace(/\/$/, '')] || raw;
  if (t.startsWith('/') && !t.startsWith('//')) {
    return (
      <Link to={t} className="transition-colors hover:text-[#C6F432]">
        {link.label}
      </Link>
    );
  }
  return (
    <a href={t} onClick={go(t)} className="transition-colors hover:text-[#C6F432]">
      {link.label}
    </a>
  );
}

function Footer({ data, brand, logo, download }) {
  const columns = arr(data.columns);
  const social = arr(data.social);
  const qrTarget = download?.qrUrl || download?.playStoreUrl || download?.appStoreUrl;
  const qrSrc =
    download?.showQr === false
      ? ''
      : download?.qrImage ||
        (qrTarget ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(qrTarget)}` : '');
  return (
    <footer className="bg-[#052E2B] px-4 pb-8 pt-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <img src={logo || '/kailo-taxi-logo.png'} alt="" className="h-10 w-10 rounded-xl object-cover" />
              <span className="text-2xl font-black tracking-tight">{brand}</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/60">{data.about}</p>
            {qrSrc && (
              <div className="flex items-center gap-3">
                <img src={qrSrc} alt="Scan to download the app" className="h-20 w-20 rounded-xl bg-white object-contain p-1.5" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Scan to get the app</span>
              </div>
            )}
            <div className="space-y-2 text-sm text-white/70">
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-2 hover:text-[#C6F432]">
                  <Mail size={15} /> {data.email}
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-2 hover:text-[#C6F432]">
                  <Phone size={15} /> {data.phone}
                </a>
              )}
              {data.address && (
                <p className="flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0" /> {data.address}
                </p>
              )}
            </div>
          </div>
          {columns.map((c, i) => (
            <div key={i}>
              <h4 className="text-xs font-black uppercase tracking-[0.18em] text-white">{c.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm font-medium text-white/60">
                {arr(c.links).map((l, j) => (
                  <li key={j}>
                    <FooterLink link={l} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-white/50 sm:flex-row">
          <p>{data.copyright}</p>
          {social.length > 0 && (
            <div className="flex flex-wrap gap-4 font-bold">
              {social.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#C6F432]">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

// Sections stack like cards: a layer sticks once its bottom reaches the bottom of the
// viewport (so tall sections can still be read), and the next layer slides over it.
function StackLayer({ z, first, children }) {
  const ref = useRef(null);
  const desktop = useIsDesktop();
  const [top, setTop] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !desktop) return undefined;
    const calc = () => setTop(Math.min(0, window.innerHeight - el.offsetHeight));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    window.addEventListener('resize', calc);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', calc);
    };
  }, [desktop]);
  return (
    <div
      ref={ref}
      style={desktop ? { position: 'sticky', top, zIndex: z } : undefined}
      className={first || !desktop ? '' : 'overflow-hidden rounded-t-[2.75rem] shadow-[0_-20px_40px_-24px_rgba(5,46,43,0.55)]'}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const { content } = useLandingContent();
  const c = useMemo(() => content || FALLBACK, [content]);
  const header = { ...FALLBACK.header, ...(c.header || {}) };

  return (
    <div className="landing-root min-h-screen w-full bg-[#E6F7EE] text-[#14213D] selection:bg-[#C6F432] selection:text-[#14213D]">
      <Header data={header} download={c.download} />
      <StackLayer z={1} first>
        <Hero data={{ ...FALLBACK.hero, ...(c.hero || {}) }} download={c.download} />
      </StackLayer>
      {c.about && (
        <StackLayer z={2}>
          <About data={c.about} />
        </StackLayer>
      )}
      {c.rider && c.rider.enabled !== false ? (
        <StackLayer z={3}>
          <Rider data={c.rider} vision={c.vision} />
        </StackLayer>
      ) : (
        c.vision && (
          <StackLayer z={3}>
            <section className="landing-hero px-4 py-20 text-white sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <VisionCarousel data={c.vision} />
              </div>
            </section>
          </StackLayer>
        )
      )}
      {c.audiences && (
        <StackLayer z={4}>
          <Audiences data={c.audiences} download={c.download} />
        </StackLayer>
      )}
      {c.faq && (
        <StackLayer z={5}>
          <Faq data={c.faq} />
        </StackLayer>
      )}
      <div className="relative" style={{ zIndex: 6 }}>
        <Footer data={c.footer || {}} brand={header.brandName} logo={header.logo} download={c.download} />
      </div>
    </div>
  );
}
