import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Receipt,
  Plane,
  Hotel,
  Truck,
} from 'lucide-react';
import mapImg from '@/assets/premium_grid_map.webp';
import aboutCab from '@/assets/modern_cab_cutout.png';
import cityIllu from '@/assets/images/mobility-illustration.webp';
import sceneHotel from '@/assets/landing/scenes/hotel.webp';
import sceneFlight from '@/assets/landing/scenes/flight.webp';
import sceneMovers from '@/assets/landing/scenes/movers.webp';
import sceneCab from '@/assets/landing/scenes/cab.webp';
import sceneBike from '@/assets/landing/scenes/bike.webp';
import sceneBus from '@/assets/landing/scenes/bus.webp';
import sceneParcel from '@/assets/landing/scenes/parcel.webp';
import sceneTrip from '@/assets/landing/scenes/outstation.webp';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Reveal, SplitText, Tilt, Stage, Layer, useReducedMotion, useIsDesktop } from './landing3d';
import { useLandingContent } from '../../../shared/hooks/useLandingContent';
import { AppleIcon, PlayIcon, SectionHead, arr, themeVars, useGo, useGoogleTranslate } from './landingShared';
import { About, Contact, Footer, Founder, Header, HowItWorks, Services } from './LandingSections';
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



const SCENE_IMG = {
  cab: sceneCab,
  bike: sceneBike,
  bus: sceneBus,
  parcel: sceneParcel,
  outstation: sceneTrip,
  flight: sceneFlight,
  hotel: sceneHotel,
  movers: sceneMovers,
};
const ACCENT = { cab: '#C6F432', bike: '#FFB347', bus: '#38D0F8', parcel: '#B79CFF', outstation: '#FB923C', flight: '#5EEAD4', hotel: '#F9A8D4', movers: '#FCD34D' };
const VEHICLE_ICON = { cab: Car, bike: Bike, bus: Bus, parcel: Package, outstation: Route, flight: Plane, hotel: Hotel, movers: Truck };

// Foreground of a slide: only an admin video or photo(s). By default the background picture carries the slide on its own.
function SlideMedia({ slide, accent }) {
  if (slide.video) {
    return (
      <video
        key={slide.video}
        src={slide.video}
        autoPlay
        muted
        loop
        playsInline
        className="w-[88%] max-w-[560px] rounded-[2rem] border-[5px] border-white/25 object-cover shadow-xl"
      />
    );
  }
  if (slide.image && slide.image2) {
    return (
      <div className="flex w-full items-end justify-center gap-2 sm:gap-4">
        <img src={slide.image} alt="" className="w-[48%] max-w-[300px] object-contain" />
        <img src={slide.image2} alt="" className="w-[48%] max-w-[300px] object-contain" />
      </div>
    );
  }
  if (slide.image) return <img src={slide.image} alt="" className="w-[88%] max-w-[580px] object-contain sm:w-full" />;
  return null;
}
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
        <div className="absolute inset-0 bg-gradient-to-t from-lp-deep via-lp-dark-2 to-transparent" />
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

  const bg = slide.background || SCENE_IMG[slide.key] || data.background || sceneCab;

  return (
    <section
      className="relative overflow-hidden bg-lp-deep pt-20 text-white max-sm:min-h-[520px] sm:min-h-[560px] sm:pt-24 lg:min-h-[660px]"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.9 } }}
          />
        </AnimatePresence>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-lp-deep/90 via-lp-deep/45 to-transparent max-sm:from-lp-deep/75 max-sm:via-lp-deep/65 max-sm:to-lp-deep/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-lp-deep via-transparent to-lp-deep/50" />

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
                  className={`relative flex shrink-0 items-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-colors duration-500 ${
                    on ? 'text-lp-deep' : 'text-white/75 hover:bg-white/10'
                  }`}
                  style={on ? { background: ACCENT[s.key] || '#C6F432' } : undefined}
                >
                  <Icon size={15} /> {s.tab || s.key}
                  {on && !paused && !reduce && slides.length > 1 && (
                    <motion.span
                      key={`bar-${active}`}
                      className="absolute bottom-0 left-0 h-[3px] bg-lp-deep/70"
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

        <div className="grid items-center gap-2 pb-10 sm:pb-16 lg:min-h-[480px] lg:grid-cols-[1fr_1.05fr] lg:pb-20">
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
                  className="inline-block rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: accent }}
                >
                  {slide.badge}
                </motion.span>
              )}
              <h1 className="mt-4 text-[2.5rem] font-bold leading-[1.06] tracking-normal sm:mt-5 sm:text-6xl lg:text-7xl">
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
                    className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-lp-deep transition hover:brightness-95 active:scale-95 sm:px-7 sm:py-4 sm:text-[15px]"
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

          {(slide.image || slide.video) && (
            <Stage className="relative mt-2 flex h-[230px] items-center justify-center sm:h-[400px] lg:h-[470px]" tilt={5}>
              {/* glowing turntable the vehicle sits on */}
              <Layer depth={-30} className={`absolute bottom-[8%] w-full ${slide.image || slide.video ? '' : 'hidden'}`}>
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
                    <SlideMedia slide={slide} accent={accent} />
                  </motion.div>
                </AnimatePresence>
              </Layer>
            </Stage>
          )}
        </div>
      </div>

    </section>
  );
}


// Vision & mission: a compact strip; the values cycle automatically in a 3D flip card.
// Vision & mission as plain text inside the rider content (no separate card).
function VisionInline({ data }) {
  const values = arr(data.values);
  if (!values.length && !data.description) return null;
  return (
    <div id="vision" className="mt-6 scroll-mt-24 border-l-4 border-lp-accent pl-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">{data.eyebrow ?? 'Vision & mission'}</p>
      {data.title && <h3 className="mt-1 text-lg font-bold tracking-normal">{data.title}</h3>}
      {data.description && <p className="mt-1 text-sm leading-relaxed text-white/75">{data.description}</p>}
      {data.mission && <p className="mt-1.5 text-sm font-bold text-lp-accent">{data.mission}</p>}
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((v, n) => (
            <span key={n} title={v.description} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90">
              {v.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Rider({ data, vision }) {
  const go = useGo();
  const bg = data.background || mapImg;
  return (
    <section id="rider" className="relative overflow-hidden bg-lp-dark px-4 py-8 text-white sm:px-6 sm:py-12 lg:px-8">
      {/* one continuous background for Vision + Riders */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${bg})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-lp-dark/80 via-lp-dark/50 to-lp-primary/50" />
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-lp-accent/20 blur-3xl max-sm:hidden" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-6 sm:gap-10 lg:grid-cols-2">
          <div>
            {data.eyebrow && (
              <Reveal y={12}>
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">{data.eyebrow}</span>
              </Reveal>
            )}
            <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-normal sm:text-5xl">
              <SplitText text={data.title} />
              <br />
              <SplitText text={data.highlight} className="text-lp-accent" delay={0.2} />
            </h2>
            <Reveal delay={0.35}>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">{data.description}</p>
              {vision && <VisionInline data={vision} />}
              <ul className="mt-7 space-y-3">
                {arr(data.bullets).map((b, i) => (
                  <li key={i} className="flex items-center gap-3 font-semibold text-white/90">
                    <CheckCircle2 size={20} className="shrink-0 text-lp-accent" /> {b}
                  </li>
                ))}
              </ul>
              {data.ctaText && (
                <a
                  href={data.ctaTarget}
                  onClick={go(data.ctaTarget)}
                  className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-lp-accent px-7 py-4 text-[15px] font-bold text-lp-ink shadow-[0_16px_30px_-12px_rgba(198,244,50,0.8)] transition hover:brightness-95 active:scale-95"
                >
                  {data.ctaText} <ArrowRight size={18} strokeWidth={3} />
                </a>
              )}
            </Reveal>
          </div>

          <div>
          <Stage className="relative flex h-[300px] items-center justify-center sm:h-[380px]" tilt={5}>
            <Layer depth={-80} className="absolute">
              <div className="h-72 w-72 rounded-[2.5rem] border border-white/15 bg-white/5 sm:h-96 sm:w-96" style={{ transform: 'rotate(3deg)' }} />
            </Layer>
            <Layer depth={0} className="absolute">
              <motion.div
                className="h-60 w-60 rounded-full border-2 border-dashed border-lp-accent/50 sm:h-80 sm:w-80"
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
          </Stage>
          </div>
        </div>

      </div>
    </section>
  );
}

const AUDIENCE_THEMES = [
  {
    card: 'bg-gradient-to-br from-lp-primary-2 via-lp-primary to-lp-dark text-white',
    glow: 'bg-lp-accent/30',
    icon: 'bg-lp-accent text-lp-ink',
    muted: 'text-white/75',
    check: 'text-lp-accent',
    cta: 'text-lp-accent',
    store: 'bg-white text-lp-ink hover:bg-lp-accent',
    storeSub: 'text-lp-ink/60',
  },
  {
    card: 'bg-gradient-to-br from-lp-accent-light via-lp-accent to-lp-accent-deep text-lp-ink',
    glow: 'bg-white/50',
    icon: 'bg-lp-dark text-lp-accent',
    muted: 'text-lp-ink/70',
    check: 'text-lp-dark',
    cta: 'text-lp-dark',
    store: 'bg-lp-dark text-white hover:bg-black',
    storeSub: 'text-white/60',
  },
  {
    card: 'bg-white text-lp-ink ring-1 ring-lp-ink/5',
    glow: 'bg-lp-accent/40',
    icon: 'bg-lp-primary text-lp-accent',
    muted: 'text-lp-ink/65',
    check: 'text-lp-primary',
    cta: 'text-lp-primary',
    store: 'bg-lp-ink text-white hover:bg-black',
    storeSub: 'text-white/60',
  },
];

function StoreBadge({ href, theme, kind }) {
  const apple = kind === 'apple';
  const base = `inline-flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-lg transition ${theme.store}`;
  const inner = (
    <>
      {apple ? <AppleIcon /> : <PlayIcon />}
      <span className="text-left leading-tight">
        <span className={`block text-[9px] font-semibold uppercase tracking-wider ${theme.storeSub}`}>{href ? (apple ? 'Download on the' : 'Get it on') : 'Coming soon on'}</span>
        <span className="block text-sm font-bold">{apple ? 'App Store' : 'Google Play'}</span>
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
  const items = arr(data.items);
  return (
    <section id="audiences" className="relative overflow-hidden bg-gradient-to-b from-lp-mint-2 via-lp-lime-2 to-lp-mint-3 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-lp-primary/10 blur-3xl max-sm:hidden" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-lp-accent/25 blur-3xl max-sm:hidden" />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <SectionHead eyebrow={data.eyebrow ?? 'Partner with us'} title={data.title} subtitle={data.subtitle} />
        </Reveal>
        <div className={`mx-auto grid gap-7 md:grid-cols-2 ${items.length > 2 ? 'max-w-6xl lg:grid-cols-3' : 'max-w-5xl'}`}>
          {items.map((it, i) => {
            const Icon = AUDIENCE_ICONS[it.key] || Users;
            const t = AUDIENCE_THEMES[i % AUDIENCE_THEMES.length];
            const storeUrl = it.playStoreUrl || download?.playStoreUrl || '';
            const appleUrl = it.appStoreUrl || download?.appStoreUrl || '';
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
                    <h3 className="text-3xl font-bold tracking-normal">{it.name}</h3>
                    <p className={`mt-2 text-[15px] leading-relaxed ${t.muted}`}>{it.description}</p>
                    <ul className="mt-5 space-y-2.5">
                      {arr(it.bullets).map((b, j) => (
                        <li key={j} className="flex items-center gap-2.5 text-sm font-bold">
                          <CheckCircle2 size={18} className={t.check} /> {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <StoreBadge href={storeUrl} theme={t} kind="play" />
                      <StoreBadge href={appleUrl} theme={t} kind="apple" />
                      {it.ctaText && (
                        <a
                          href={it.ctaTarget}
                          onClick={go(it.ctaTarget)}
                          className={`inline-flex items-center gap-2 text-sm font-bold transition group-hover:gap-3 ${t.cta}`}
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


function StoreButton({ href, label, store, children }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-lp-ink px-5 py-3 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-black"
    >
      {children}
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">{label}</span>
        <span className="block text-base font-bold">{store}</span>
      </span>
    </a>
  );
}

function Faq({ data }) {
  const [open, setOpen] = useState(0);
  const items = arr(data.items);
  if (!items.length) return null;
  return (
    <section id="faq" className="bg-gradient-to-b from-lp-mint-3 to-lp-mint-4 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionHead eyebrow={data.eyebrow ?? 'FAQ'} title={data.title} />
        <div className="space-y-3">
          {items.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_14px_30px_-22px_rgba(5,46,43,0.5)]">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                <span className="font-bold text-lp-ink">{f.question}</span>
                <ChevronDown size={20} className={`shrink-0 text-lp-primary transition ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="px-6 pb-5 text-sm leading-relaxed text-lp-ink/65">{f.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


export default function LandingPage() {
  const { content } = useLandingContent();
  const c = useMemo(() => content || FALLBACK, [content]);
  const header = { ...FALLBACK.header, ...(c.header || {}) };
  useGoogleTranslate(header.languageEnabled !== false);
  const on = (section) => section && section.enabled !== false;

  return (
    <div className="landing-root min-h-screen w-full bg-lp-mint text-lp-ink selection:bg-lp-accent selection:text-lp-ink" style={themeVars(c.theme)}>
      <Header data={header} download={c.download} />
      <Hero data={{ ...FALLBACK.hero, ...(c.hero || {}) }} download={c.download} />
      {c.about && <About data={c.about} />}
      {on(c.services) && <Services data={c.services} />}
      {c.rider && c.rider.enabled !== false ? (
        <Rider data={c.rider} vision={c.vision} />
      ) : (
        c.vision && (
          <section className="landing-hero px-4 py-20 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <VisionInline data={c.vision} />
            </div>
          </section>
        )
      )}
      {on(c.howItWorks) && <HowItWorks data={c.howItWorks} />}
      {c.audiences && <Audiences data={c.audiences} download={c.download} />}
      {on(c.founder) && <Founder data={c.founder} />}
      {c.faq && <Faq data={c.faq} />}
      {on(c.contact) && <Contact data={c.contact} footer={c.footer} />}
      <Footer data={c.footer || {}} brand={header.brandName} logo={header.logo} download={c.download} />
    </div>
  );
}
