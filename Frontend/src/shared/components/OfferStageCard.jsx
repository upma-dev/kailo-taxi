import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { BANNER_THEMES } from '@/shared/components/auth/LoginBanners';

const LIME = '#C6F432';

// Picture side of the card: the admin's picture standing on a soft halo and a slowly turning ring.
function Artwork({ image, compact }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [image]);

  const ring = compact ? 'h-[84px] w-[84px]' : 'h-[112px] w-[112px]';
  const halo = compact ? 'h-[96px] w-[96px]' : 'h-[124px] w-[124px]';

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[44%] items-center justify-center">
      <span
        className={`absolute rounded-full ${halo}`}
        style={{ background: 'radial-gradient(circle, rgba(198,244,50,0.34) 0%, rgba(198,244,50,0) 68%)' }}
      />
      <motion.span
        className={`absolute rounded-full border border-dashed border-white/35 ${ring}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />
      {image && !broken ? (
        <motion.img
          src={image}
          alt=""
          aria-hidden="true"
          onError={() => setBroken(true)}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-auto object-contain drop-shadow-[0_14px_10px_rgba(0,0,0,0.35)]"
          style={{ height: compact ? 70 : 92 }}
        />
      ) : null}
    </div>
  );
}

/**
 * One offer banner: written text on the left (tag, title, text, button) and the admin's picture on the right.
 * `offer`: { tag, code, title, subtitle, cta, theme, image, link }. The button shows when the card has a link.
 */
export function OfferStageCard({ offer, onSelect, compact = false }) {
  const theme = BANNER_THEMES[offer.theme] || BANNER_THEMES.brand;
  const hasImage = Boolean(offer.image);
  const openable = Boolean(onSelect && offer.link);
  const buttonText = String(offer.cta || '').trim() || 'Explore';

  return (
    <div
      role={openable ? 'button' : undefined}
      tabIndex={openable ? 0 : undefined}
      onClick={() => openable && onSelect(offer)}
      onKeyDown={(event) => { if (openable && (event.key === 'Enter' || event.key === ' ')) onSelect(offer); }}
      className={`relative w-full overflow-hidden rounded-[26px] border border-white/15 text-left text-white shadow-[0_16px_30px_rgba(6,40,36,0.28)] ${compact ? 'h-[112px]' : 'h-[142px]'} ${openable ? 'cursor-pointer' : ''}`}
      style={{ background: theme.gradient }}
    >
      <span className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-14 right-10 h-32 w-32 rounded-full bg-black/10" />

      <Artwork image={offer.image} compact={compact} />

      <div className={`relative z-10 flex h-full flex-col justify-center pl-4 ${hasImage ? 'w-[60%]' : 'w-[88%]'}`}>
        {offer.tag || offer.code ? (
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {offer.tag ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider backdrop-blur">{offer.tag}</span>
            ) : null}
            {offer.code ? (
              <span className="rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#0B2B28]" style={{ backgroundColor: LIME }}>
                CODE: {offer.code}
              </span>
            ) : null}
          </div>
        ) : null}
        <h3 className={`font-semibold leading-[1.2] text-white ${compact ? 'text-[13.5px]' : 'text-[16px]'}`}>{offer.title}</h3>
        {offer.subtitle ? (
          <p className={`mt-0.5 line-clamp-2 font-normal leading-snug text-white/75 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{offer.subtitle}</p>
        ) : null}
        {offer.link ? (
          <span
            className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full pl-3 pr-2 font-semibold text-[#14213D] shadow-[0_8px_16px_rgba(0,0,0,0.22)] ${compact ? 'py-0.5 text-[10px]' : 'py-1 text-[11px]'}`}
            style={{ backgroundColor: LIME }}
          >
            {buttonText}
            <ArrowUpRight size={compact ? 11 : 13} strokeWidth={2.5} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Sliding strip of offer banners: moves on its own, can be swiped, with dots. Renders nothing when empty. */
export default function OfferStrip({ offers, onSelect, lightDots = false }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const count = offers.length;

  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), 4800);
    return () => clearTimeout(timer);
  }, [count, index, paused]);

  if (!count) return null;

  const go = (next) => setIndex(((next % count) + count) % count);
  const onTouchStart = (event) => {
    setPaused(true);
    touchStartX.current = event.touches[0].clientX;
  };
  const onTouchEnd = (event) => {
    setPaused(false);
    if (touchStartX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-[26px]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {offers.map((offer, i) => (
            <div key={offer._id || i} className="w-full shrink-0">
              <OfferStageCard offer={offer} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
      {count > 1 ? (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {offers.map((offer, i) => (
            <button
              key={offer._id || i}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? `w-5 ${lightDots ? 'bg-white' : 'bg-[#0F766E]'}` : `w-1.5 ${lightDots ? 'bg-white/40' : 'bg-[#14213D]/20'}`}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
