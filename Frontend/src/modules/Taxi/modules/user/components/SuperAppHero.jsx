import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import useHomeCatalog from './useHomeCatalog';

const LIME = '#C6F432';
const AUTO_ADVANCE_MS = 4200;

// 3D platform the artwork stands on: pulsing halo, slowly turning dashed ring and a ground shadow.
function Platform() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.span
        className="absolute h-[124px] w-[124px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(198,244,50,0.38) 0%, rgba(198,244,50,0) 68%)' }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute h-[116px] w-[116px] rounded-full border border-dashed border-white/35"
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />
      <motion.span
        className="absolute h-[84px] w-[84px] rounded-full border border-white/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <span className="absolute bottom-[8px] h-3.5 w-[84px] rounded-[50%] bg-black/35 blur-[6px]" />
    </div>
  );
}

function Stage({ service, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(service)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(service); }}
      className="relative mx-4 mt-3 h-[118px] cursor-pointer overflow-hidden rounded-[26px] border border-white/15 bg-white/10 shadow-[0_18px_34px_rgba(4,36,32,0.35)] backdrop-blur-md transition-transform active:scale-[0.99]"
    >
      <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-[#C6F432]/10 blur-2xl" />

      {/* artwork side */}
      <div className="absolute inset-y-0 right-0 w-[46%]" style={{ perspective: '600px' }}>
        <div className="absolute inset-0 scale-[0.78]"><Platform /></div>
        <AnimatePresence mode="wait">
          <motion.div
            key={service.id}
            initial={{ opacity: 0, scale: 0.55, rotateY: -70, y: 24 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, rotateY: 60, y: -12 }}
            transition={{ type: 'spring', stiffness: 150, damping: 16 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.img
              src={service.img}
              alt=""
              aria-hidden="true"
              onError={(event) => {
                // A broken picture falls back to the built-in artwork instead of an empty stage.
                if (service.fallbackImg && event.currentTarget.src !== service.fallbackImg) event.currentTarget.src = service.fallbackImg;
              }}
              animate={{ y: [0, -7, 0], rotateZ: [-2, 2, -2] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-auto object-contain drop-shadow-[0_16px_12px_rgba(0,0,0,0.4)]"
              style={{ height: Math.round((service.size || 90) * 0.78) }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* copy side */}
      <div className="relative z-10 flex h-full w-[58%] flex-col justify-center pl-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={service.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-[16px] font-semibold leading-tight text-white">{service.title}</h2>
            <p className="mt-1.5 line-clamp-3 max-w-[165px] text-[11px] font-normal leading-[1.45] text-white/70">{service.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// The top of the home: greeting, search, and a few feature banners that rotate on their own. They are the
// services (Parcel, Outstation, Bus, Pooling ...) from the admin's App Modules, with the module's name, short
// description and picture. The vehicles (Bike, Auto, SUV ...) are not repeated here: they are in "Our Services".
export default function SuperAppHero({ onSearchFocus }) {
  const navigate = useNavigate();
  const slides = useHomeCatalog().filter((tile) => !tile.vehicle);
  const [rawIndex, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  const count = slides.length;
  const index = count ? rawIndex % count : 0;
  const active = slides[index];

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, count]);

  const onTouchStart = (event) => {
    setPaused(true);
    touchStartX.current = event.touches[0].clientX;
  };
  const onTouchEnd = (event) => {
    setPaused(false);
    if (touchStartX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) setIndex((i) => (i + (dx < 0 ? 1 : -1) + count) % count);
  };

  return (
    <div className="relative select-none overflow-hidden pb-4 pt-1" style={{ fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-10 h-56 w-56 rounded-full bg-[#C6F432]/15 blur-3xl" />
        <div className="absolute -left-24 top-28 h-60 w-60 rounded-full bg-[#14B8A6]/25 blur-3xl" />
      </div>

      <div className="relative z-10 px-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">Kailo Taxi</p>
        <h1 className="mt-0.5 text-[22px] font-semibold leading-[1.1] text-white">
          Your ride, <span style={{ color: LIME }}>anywhere.</span>
        </h1>

        <motion.button
          type="button"
          onClick={onSearchFocus}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          className="mt-3 flex w-full items-center gap-3 rounded-[18px] bg-[#F8FAF7] py-2 pl-4 pr-2 text-left shadow-[0_16px_30px_rgba(6,40,36,0.4)]"
        >
          <Search className="h-[18px] w-[18px] flex-shrink-0 text-[#0F766E]" strokeWidth={2.6} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#14213D]/70">Search destination</span>
          <span
            className="flex h-8 items-center gap-1 rounded-[12px] px-3 text-[11.5px] font-semibold uppercase tracking-wide text-[#14213D]"
            style={{ backgroundColor: LIME }}
          >
            Go
            <ArrowRight size={13} strokeWidth={2.5} />
          </span>
        </motion.button>
      </div>

      {active ? (
        <>
          <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <Stage service={active} onOpen={(slide) => slide.path && navigate(slide.path)} />
          </div>

          {/* time to the next banner */}
          {count > 1 ? (
            <div className="relative z-10 mx-auto mt-2.5 h-[3px] w-20 overflow-hidden rounded-full bg-white/15">
              {!paused ? (
                <motion.span
                  key={active.id}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: LIME }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
