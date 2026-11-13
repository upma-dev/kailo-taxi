import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Package, X } from 'lucide-react';
import useHomeCatalog from './useHomeCatalog';
import { openVehicle } from './useVehicleTiles';

const TileImage = ({ tile }) => {
  const [src, setSrc] = useState(tile.cardImg);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setSrc(tile.cardImg);
    setBroken(false);
  }, [tile.cardImg]);

  if (!src || broken) {
    return <Package size={26} strokeWidth={1.6} className="text-[#14213D]/35" aria-label={tile.label} />;
  }

  return (
    <img
      src={src}
      alt={tile.label}
      // A broken uploaded picture falls back to the built-in picture.
      onError={() => (tile.fallbackImg && src !== tile.fallbackImg ? setSrc(tile.fallbackImg) : setBroken(true))}
      className="h-[40px] w-[52px] object-contain drop-shadow-[0_6px_6px_rgba(20,33,61,0.2)]"
    />
  );
};

const Tile = ({ tile, index, onOpen, size = 'row' }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(0.04 * index, 0.4), type: 'spring', stiffness: 140 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => onOpen(tile)}
    className={`flex flex-col items-center rounded-[18px] border border-[#E8EEEB] bg-white px-1 pb-2 pt-2.5 shadow-[0_8px_18px_rgba(15,118,110,0.07)] ${size === 'row' ? 'w-[80px] shrink-0 snap-start' : 'w-full'}`}
  >
    <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px]" style={{ backgroundColor: tile.tint }}>
      <TileImage tile={tile} />
    </span>
    <span className="mt-1.5 w-full truncate text-center text-[11px] font-bold leading-tight text-[#14213D]">{tile.label}</span>
  </motion.button>
);

// "Our Services": built from the admin's App Modules in their order. The Ride module shows its Vehicle
// Types (Bike, Auto, Sedan, SUV ...) and every other module (Parcel, Bus, Outstation ...) is one tile.
export default function OurServices({ plain = false }) {
  const navigate = useNavigate();
  const tiles = useHomeCatalog();
  const scrollerRef = useRef(null);
  const [scroll, setScroll] = useState({ left: false, right: false, thumb: 100, offset: 0 });
  const [showAll, setShowAll] = useState(false);


  // Tells the rider the row scrolls: edge fades, an arrow, and a progress bar under the row.
  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) {
      setScroll({ left: false, right: false, thumb: 100, offset: 0 });
      return;
    }
    const thumb = Math.max(18, Math.round((el.clientWidth / el.scrollWidth) * 100));
    const offset = (el.scrollLeft / max) * (100 - thumb);
    setScroll({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4, thumb, offset });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, tiles.length]);

  if (!tiles.length) return null;

  const open = (tile) => {
    setShowAll(false);
    if (tile.vehicle) {
      openVehicle(tile, navigate);
      return;
    }
    navigate(tile.path);
  };

  const scrollMore = () => scrollerRef.current?.scrollBy({ left: 220, behavior: 'smooth' });
  const hasOverflow = scroll.left || scroll.right;
  const fade = `linear-gradient(to right, ${scroll.left ? 'transparent 0, #000 28px' : '#000 0'}, ${scroll.right ? '#000 calc(100% - 44px), transparent 100%' : '#000 100%'})`;

  return (
    <section className={plain ? 'relative z-10 px-5' : 'relative w-full bg-[#F8FAF7] px-5 pb-1 pt-4'}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0F766E]">Explore</p>
          <h2 className="mt-0.5 text-[20px] font-black leading-tight tracking-tight text-[#14213D]">Our Services</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#14213D]/5 px-3 py-1.5 text-[11px] font-black text-[#14213D] active:scale-95"
        >
          View all
          <ChevronRight size={13} strokeWidth={3} />
        </button>
      </div>

      <div className="relative mt-3">
        <div
          ref={scrollerRef}
          onScroll={measure}
          className="scrollbar-hide -mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-2"
          style={{ WebkitMaskImage: fade, maskImage: fade }}
        >
          {tiles.map((tile, index) => (
            <Tile key={tile.id} tile={tile} index={index} onOpen={open} />
          ))}
        </div>

        {scroll.right ? (
          <button
            type="button"
            onClick={scrollMore}
            aria-label="Show more services"
            className="absolute right-0 top-[34px] z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#14213D] shadow-[0_6px_14px_rgba(15,23,42,0.25)] active:scale-90"
          >
            <ChevronRight size={16} strokeWidth={3} />
          </button>
        ) : null}
      </div>

      {hasOverflow ? (
        <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-[#14213D]/10">
          <span
            className="block h-full rounded-full bg-[#0F766E] transition-[margin] duration-100"
            style={{ width: `${scroll.thumb}%`, marginLeft: `${scroll.offset}%` }}
          />
        </div>
      ) : null}

      {typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
          {showAll ? (
            <motion.div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAll(false)}
            >
              <motion.div
                className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white px-5 pb-8 pt-4"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#14213D]/15" />
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[18px] font-black text-[#14213D]">All services</h3>
                  <button type="button" onClick={() => setShowAll(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14213D]/5 text-[#14213D]">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {tiles.map((tile, index) => (
                    <Tile key={tile.id} tile={tile} index={index} onOpen={open} size="grid" />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      ) : null}
    </section>
  );
}
