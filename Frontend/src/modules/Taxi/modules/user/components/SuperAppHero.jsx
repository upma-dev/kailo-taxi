import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import taxiImg from '../../../assets/3d images/AutoCab/taxi.png';
import busImg from '../../../assets/3d images/AutoCab/bus.png';
import outstationImg from '../../../assets/3d images/AutoCab/one way.png';
import airportImg from '../../../assets/3d images/AutoCab/airoplan.png';
import parcelImg from '../../../assets/3d images/gifts.png';
import modernCabImg from '../../../assets/modern_cab.png';
import { POOLING_ENABLED, RENTAL_ENABLED } from '../../../shared/featureFlags';

const LIME = '#C6F432';
const AUTO_ADVANCE_MS = 4200;

// Services only; the vehicle types (bike, auto, cab...) live in the "Choose your ride" section below.
const ALL_SERVICES = [
  {
    id: 'parcel',
    tab: 'Parcel',
    title: 'Send anything, anywhere',
    text: 'Pickup in minutes with a secure OTP handover.',
    cta: 'Send parcel',
    img: parcelImg,
    size: 104,
    path: '/taxi/user/parcel/type',
  },
  {
    id: 'outstation',
    tab: 'Outstation',
    title: 'Go beyond the city',
    text: 'Fixed-fare intercity cabs with no surprises.',
    cta: 'Plan a trip',
    img: outstationImg,
    size: 96,
    path: '/taxi/user/intercity',
  },
  {
    id: 'airport',
    tab: 'Airport',
    title: 'Never miss a flight',
    text: 'On-time airport pickups and drops.',
    cta: 'Book transfer',
    img: airportImg,
    size: 100,
    path: '/taxi/user/cab/airport',
  },
  {
    id: 'bus',
    tab: 'Bus',
    title: 'Pick your seat',
    text: 'Book bus tickets right inside the app.',
    cta: 'Find buses',
    img: busImg,
    size: 96,
    path: '/taxi/user/bus',
  },
  {
    id: 'pooling',
    tab: 'Pooling',
    title: 'Share the ride, split the fare',
    text: 'Travel with people going your way and save more.',
    cta: 'Find a pool',
    img: taxiImg,
    size: 88,
    path: '/taxi/user/pooling',
    flag: POOLING_ENABLED,
  },
  {
    id: 'rental',
    tab: 'Rental',
    title: 'Rent by the hour or day',
    text: 'Verified vehicles with simple packages.',
    cta: 'Book rental',
    img: modernCabImg,
    size: 88,
    path: '/taxi/user/rental',
    flag: RENTAL_ENABLED,
  },
];

const SERVICES = ALL_SERVICES.filter((service) => service.flag !== false);

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
    <div className="relative mx-4 mt-3 h-[150px] overflow-hidden rounded-[26px] border border-white/15 bg-white/10 shadow-[0_18px_34px_rgba(4,36,32,0.35)] backdrop-blur-md">
      <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-[#C6F432]/10 blur-2xl" />

      {/* artwork side */}
      <div className="absolute inset-y-0 right-0 w-[46%]" style={{ perspective: '600px' }}>
        <Platform />
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
              animate={{ y: [0, -7, 0], rotateZ: [-2, 2, -2] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-auto object-contain drop-shadow-[0_16px_12px_rgba(0,0,0,0.4)]"
              style={{ height: service.size }}
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
            <h2 className="text-[17px] font-black leading-[1.15] tracking-tight text-white">{service.title}</h2>
            <p className="mt-1 max-w-[150px] text-[11px] font-medium leading-snug text-white/65">{service.text}</p>
            <button
              type="button"
              onClick={() => onOpen(service)}
              className="mt-3 inline-flex items-center gap-1 rounded-full py-1.5 pl-3.5 pr-2.5 text-[11.5px] font-black text-[#14213D] shadow-[0_8px_16px_rgba(0,0,0,0.22)] transition active:scale-95"
              style={{ backgroundColor: LIME }}
            >
              {service.cta}
              <ArrowUpRight size={14} strokeWidth={3} />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SuperAppHero({ onSearchFocus }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [userPicked, setUserPicked] = useState(false);
  const active = SERVICES[index];

  // Rotate through the services on its own until the user picks one.
  useEffect(() => {
    if (userPicked) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SERVICES.length), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, userPicked]);

  const openService = (service) => navigate(service.path);
  const pick = (i) => {
    setUserPicked(true);
    setIndex(i);
  };

  return (
    <div className="relative select-none overflow-hidden pb-6 pt-2">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-10 h-56 w-56 rounded-full bg-[#C6F432]/15 blur-3xl" />
        <div className="absolute -left-24 top-28 h-60 w-60 rounded-full bg-[#14B8A6]/25 blur-3xl" />
      </div>

      <div className="relative z-10 px-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Kailo Taxi</p>
        <h1 className="mt-0.5 text-[27px] font-black leading-[1.05] tracking-tight text-white">
          Where to <span style={{ color: LIME }}>today?</span>
        </h1>

        <motion.button
          type="button"
          onClick={onSearchFocus}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          className="mt-4 flex w-full items-center gap-3 rounded-[20px] bg-[#F8FAF7] py-2.5 pl-4 pr-2.5 text-left shadow-[0_16px_30px_rgba(6,40,36,0.4)]"
        >
          <Search className="h-[18px] w-[18px] flex-shrink-0 text-[#0F766E]" strokeWidth={2.6} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#14213D]/70">Search destination</span>
          <span
            className="flex h-9 items-center gap-1 rounded-[14px] px-3.5 text-[12px] font-black uppercase tracking-wide text-[#14213D]"
            style={{ backgroundColor: LIME }}
          >
            Go
            <ArrowRight size={14} strokeWidth={3} />
          </span>
        </motion.button>
      </div>

      {/* service tabs: the active pill slides between options */}
      <div className="no-scrollbar relative z-10 mt-4 flex gap-2 overflow-x-auto px-4">
        {SERVICES.map((service, i) => {
          const isActive = i === index;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => pick(i)}
              className="relative flex-shrink-0 rounded-full px-4 py-2 text-[12px] font-extrabold transition-colors"
              style={{ color: isActive ? '#14213D' : 'rgba(255,255,255,0.75)' }}
            >
              {isActive && (
                <motion.span
                  layoutId="hero-service-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: LIME }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {!isActive && <span className="absolute inset-0 rounded-full border border-white/20 bg-white/10" />}
              <span className="relative">{service.tab}</span>
            </button>
          );
        })}
      </div>

      <Stage service={active} onOpen={openService} />

      {/* auto-advance progress */}
      {!userPicked && (
        <div className="relative z-10 mx-auto mt-3 h-[3px] w-24 overflow-hidden rounded-full bg-white/15">
          <motion.span
            key={active.id}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ backgroundColor: LIME }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}
