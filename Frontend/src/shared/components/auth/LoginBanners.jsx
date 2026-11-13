import { useEffect, useRef, useState } from 'react';
import useLoginData from './useLoginData';

export const BANNER_THEMES = {
  brand: { label: 'Kailo Brand', gradient: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 55%, #84CC16 100%)' },
  emerald: { label: 'Emerald', gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)' },
  navy: { label: 'Navy', gradient: 'linear-gradient(135deg, #0B1B3F 0%, #1E3A8A 100%)' },
  orange: { label: 'Orange', gradient: 'linear-gradient(135deg, #C2410C 0%, #FB923C 100%)' },
  purple: { label: 'Purple', gradient: 'linear-gradient(135deg, #5B21B6 0%, #A78BFA 100%)' },
  teal: { label: 'Teal', gradient: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' },
  rose: { label: 'Rose', gradient: 'linear-gradient(135deg, #9F1239 0%, #FB7185 100%)' },
};

/**
 * One banner. Can be a gradient card, an image, or a short looping video (admin controlled).
 * `size`: 'compact' (admin lists / preview), 'normal', or 'hero' (login screens).
 */
export function BannerCard({ banner, size = 'normal', compact = false }) {
  const variant = compact ? 'compact' : size;
  const theme = BANNER_THEMES[banner.theme] || BANNER_THEMES.brand;
  const hasMedia = Boolean(banner.video || banner.image);
  const background = banner.image && !banner.video
    ? `linear-gradient(90deg, rgba(0,0,0,0.6), rgba(0,0,0,0.1)), url(${banner.image}) center/cover`
    : theme.gradient;
  const Wrapper = banner.link ? 'a' : 'div';
  const wrapperProps = banner.link ? { href: banner.link, target: '_blank', rel: 'noreferrer' } : {};
  const pad = variant === 'compact' ? 'p-3' : variant === 'hero' ? 'p-4' : 'p-4';
  const minHeight = variant === 'hero' ? 'min-h-[132px]' : variant === 'compact' ? '' : 'min-h-[96px]';

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative flex w-full flex-col justify-end overflow-hidden rounded-2xl text-left text-white shadow-lg ${pad} ${minHeight}`}
      style={{ background }}
    >
      {banner.video ? (
        <>
          <video
            src={banner.video}
            poster={banner.image || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </>
      ) : null}
      <div className="relative">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {banner.tag ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur">{banner.tag}</span>
          ) : null}
          {banner.code ? (
            <span className="rounded-full bg-[#C6F432] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0B2B28]">
              CODE: {banner.code}
            </span>
          ) : null}
        </div>
        <p className={`font-black leading-snug drop-shadow ${variant === 'compact' ? 'text-[13px]' : 'text-[17px]'}`}>{banner.title}</p>
        {banner.subtitle ? (
          <p className={`mt-0.5 font-medium text-white/90 ${variant === 'compact' ? 'text-[10px]' : 'text-[12px]'}`}>{banner.subtitle}</p>
        ) : null}
      </div>
      {!hasMedia ? (
        <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      ) : null}
    </Wrapper>
  );
}

/** Sliding banner strip: auto-advances, swipeable, with dots. Renders nothing when empty. */
export function BannerStrip({ banners, size = 'normal', compact = false, lightDots = false }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const count = banners.length;

  useEffect(() => {
    setIndex(0);
    if (count < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 4500);
    return () => clearInterval(timer);
  }, [count]);

  if (!count) return null;

  const go = (next) => setIndex(((next % count) + count) % count);
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner, i) => (
            <div key={banner._id || i} className="w-full shrink-0">
              <BannerCard banner={banner} size={size} compact={compact} />
            </div>
          ))}
        </div>
      </div>
      {count > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b._id || i}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? `w-5 ${lightDots ? 'bg-white' : 'bg-gray-700'}`
                  : `w-1.5 ${lightDots ? 'bg-white/40' : 'bg-gray-300'}`
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Shows the admin-managed banners for `app` ('user' | 'partner'). */
export default function LoginBannerCarousel({ app = 'user', className = '', size = 'hero', lightDots = false }) {
  const { banners } = useLoginData(app);

  if (!banners.length) return null;
  return (
    <div className={className}>
      <BannerStrip banners={banners} size={size} lightDots={lightDots} />
    </div>
  );
}
