import { motion, useReducedMotion } from 'framer-motion';
import {
  Bus,
  Car,
  Clock,
  Headset,
  IndianRupee,
  MapPinned,
  Package,
  Route,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

const CONTENT = {
  user: {
    tagline: 'Rides, parcels and outstation trips, all in one app',
    ticker: [
      { Icon: Car, label: 'City rides' },
      { Icon: Route, label: 'Outstation' },
      { Icon: Package, label: 'Parcel delivery' },
      { Icon: Users, label: 'Car pooling' },
      { Icon: Bus, label: 'Bus tickets' },
      { Icon: ShieldCheck, label: 'Verified drivers' },
      { Icon: MapPinned, label: 'Live tracking' },
      { Icon: Headset, label: '24x7 support' },
    ],
  },
  partner: {
    tagline: 'Drive, earn and grow with Kailo.',
    ticker: [
      { Icon: IndianRupee, label: 'Daily earnings' },
      { Icon: Wallet, label: 'Quick payouts' },
      { Icon: Zap, label: 'Milestone bonuses' },
      { Icon: Clock, label: 'Your own hours' },
      { Icon: Truck, label: 'Fleet owners welcome' },
      { Icon: ShieldCheck, label: 'Safe trips' },
      { Icon: Headset, label: 'Driver support' },
    ],
  },
};

const STRIP = {
  user: [
    { Icon: Car, label: 'Rides' },
    { Icon: Route, label: 'Outstation' },
    { Icon: Package, label: 'Parcels' },
    { Icon: Users, label: 'Car pool' },
  ],
  partner: [
    { Icon: IndianRupee, label: 'Daily earnings' },
    { Icon: Wallet, label: 'Payouts' },
    { Icon: Zap, label: 'Bonuses' },
  ],
};

export const showcaseTagline = (app) => (CONTENT[app] || CONTENT.user).tagline;

/** One fixed line of what the app offers, under the title. Short labels so everything fits and nothing is clipped. */
export function ServiceTicker({ app = 'user', className = '' }) {
  const items = (STRIP[app] || STRIP.user);

  return (
    <div className={`flex flex-nowrap items-center justify-center gap-1.5 ${className}`}>
      {items.map(({ Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E3F6F2] px-2.5 py-1.5 text-[11px] font-bold text-[#0F5F58]"
        >
          <Icon size={13} className="text-[#0F766E]" strokeWidth={2.4} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** Lightweight hero graphic: pulsing rings, a lime disc with a car, and floating tags. No photos. */
export function HeroTaxi({ className = '' }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden="true">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-[14%] rounded-full border-2 border-[#C6F432]/50"
          animate={reduceMotion ? undefined : { scale: [1, 1.55], opacity: [0.7, 0] }}
          transition={{ duration: 2.6, delay: i * 1.3, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
      <span className="absolute inset-[14%] rounded-full bg-[#C6F432] shadow-[0_14px_30px_-8px_rgba(198,244,50,0.7)]" />
      <span className="absolute inset-[26%] rounded-full bg-[#0A4A46]/10" />
      <Car className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 text-[#0A4A46]" strokeWidth={1.8} />
      <motion.span
        className="absolute -left-4 top-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#0A4A46] shadow-lg"
        animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        Fixed fares
      </motion.span>
      <motion.span
        className="absolute -right-2 bottom-2 rounded-full bg-[#0A4A46] px-2.5 py-1 text-[10px] font-black text-[#C6F432] shadow-lg"
        animate={reduceMotion ? undefined : { y: [0, 4, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        Live tracking
      </motion.span>
      <motion.span
        className="absolute right-[6%] top-[4%] flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0F766E] shadow-lg"
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <MapPinned size={18} strokeWidth={2.4} />
      </motion.span>
    </div>
  );
}
