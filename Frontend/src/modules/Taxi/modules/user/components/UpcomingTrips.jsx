import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, CarFront, UserRound, Users } from 'lucide-react';
import { userService } from '../services/userService';
import { userBusService } from '../services/busService';
import { RENTAL_ENABLED, POOLING_ENABLED } from '../../../shared/featureFlags';

const payloadOf = (response) => response?.data?.data || response?.data || response || {};
const listOf = (response) => {
  const payload = payloadOf(response);
  return Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
};

// "9:30 AM", "18:05" or an empty string applied on top of a date.
const withClock = (dateValue, clock) => {
  const base = new Date(dateValue);
  if (Number.isNaN(base.getTime())) return null;
  const raw = String(clock || '').trim().toUpperCase();
  const twelve = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  const twentyFour = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!twelve && !twentyFour) return base;
  let hours = Number((twelve || twentyFour)[1]);
  const minutes = Number((twelve || twentyFour)[2]);
  if (twelve) hours = (hours % 12) + (twelve[3] === 'PM' ? 12 : 0);
  base.setHours(hours, minutes, 0, 0);
  return base;
};

const KIND_VIEW = {
  bus: { label: 'Bus booking', icon: Bus, tone: 'bg-sky-50 text-sky-600', route: '/bus' },
  pooling: { label: 'Car pooling', icon: Users, tone: 'bg-violet-50 text-violet-600', route: '/pooling' },
  rental: { label: 'Rental vehicle', icon: CarFront, tone: 'bg-emerald-50 text-emerald-600', route: '/rental' },
  rental_driver: { label: 'Rental with driver', icon: UserRound, tone: 'bg-amber-50 text-amber-600', route: '/rental' },
};

const normalizeBus = (booking) => {
  const startAt = withClock(booking?.travelDate, booking?.bus?.departure);
  if (!startAt || String(booking?.status || '').toLowerCase() !== 'confirmed') return null;
  return {
    key: `bus:${booking.id || booking._id}`,
    kind: 'bus',
    title: `${booking?.bus?.fromCity || 'Pickup'} to ${booking?.bus?.toCity || 'Drop'}`,
    subtitle: [booking?.bus?.operator || booking?.bus?.busName, booking?.bookingCode].filter(Boolean).join(' - '),
    startAt,
  };
};

const normalizePooling = (booking) => {
  const startAt = withClock(booking?.travelDate, booking?.departureTime);
  const status = String(booking?.bookingStatus || '').toLowerCase();
  if (!startAt || ['cancelled', 'completed', 'failed', 'expired'].includes(status)) return null;
  return {
    key: `pooling:${booking._id}`,
    kind: 'pooling',
    title: `${booking?.pickupLabel || 'Pickup'} to ${booking?.dropLabel || 'Drop'}`,
    subtitle: [booking?.vehicle?.name, booking?.bookingId].filter(Boolean).join(' - '),
    startAt,
  };
};

// Self-drive rentals and rentals with a driver both come from the rental booking list, once approved.
const normalizeRental = (booking) => {
  const startAt = booking?.pickupDateTime ? new Date(booking.pickupDateTime) : null;
  if (!startAt || Number.isNaN(startAt.getTime()) || !['confirmed', 'assigned'].includes(String(booking?.status || ''))) return null;
  const withDriver = booking.serviceMode === 'with_driver';
  return {
    key: `${withDriver ? 'rental_driver' : 'rental'}:${booking.id}`,
    kind: withDriver ? 'rental_driver' : 'rental',
    title: booking.vehicleName || 'Rental vehicle',
    subtitle: [booking?.selectedPackage?.label, booking.bookingReference].filter(Boolean).join(' - '),
    startAt,
  };
};

const normalizeDriverRental = (booking) => {
  const startAt = booking?.pickupDateTime ? new Date(booking.pickupDateTime) : null;
  if (!startAt || Number.isNaN(startAt.getTime()) || !['confirmed', 'assigned'].includes(String(booking?.status || ''))) return null;
  return {
    key: `rental_driver:${booking.id}`,
    kind: 'rental_driver',
    title: booking.vehicleName || 'Vehicle with driver',
    subtitle: [booking?.assignedDriver?.name ? `Driver ${booking.assignedDriver.name}` : '', booking?.selectedPackage?.label].filter(Boolean).join(' - '),
    place: booking.pickupLocation || '',
    startAt,
  };
};

const pad = (n) => String(n).padStart(2, '0');

const countdownParts = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

// Cards for the rider's approved trips with a live countdown to the start. Renders nothing when there are none.
const UpcomingTrips = ({ className = '' }) => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [bus, pooling, rental, driverRental] = await Promise.allSettled([
      userBusService.getMyBookings({ page: 1, limit: 20, tripState: 'upcoming' }),
      POOLING_ENABLED ? userService.getMyPoolingBookings() : Promise.resolve([]),
      RENTAL_ENABLED ? userService.getMyRentalBookings({ page: 1, limit: 20 }) : Promise.resolve([]),
      RENTAL_ENABLED ? userService.getMyRentalDriverBookings() : Promise.resolve([]),
    ]);
    const take = (result, normalize) => (result.status === 'fulfilled' ? listOf(result.value).map(normalize).filter(Boolean) : []);
    const merged = [
      ...take(bus, normalizeBus),
      ...take(pooling, normalizePooling),
      ...take(rental, normalizeRental),
      ...take(driverRental, normalizeDriverRental),
    ];
    // The same booking can be returned by both rental lists; keep one card per key.
    const unique = [...new Map(merged.map((trip) => [trip.key, trip])).values()];
    setTrips(unique.sort((a, b) => a.startAt - b.startAt));
  }, []);

  useEffect(() => {
    load();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60000);
    return () => window.clearInterval(refresh);
  }, [load]);

  // One ticking clock for every card.
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const upcoming = useMemo(() => trips.filter((trip) => trip.startAt.getTime() > now - 60000), [trips, now]);

  if (!upcoming.length) return null;

  const prefix = window.location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="px-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Your upcoming trips</p>
      {upcoming.slice(0, 4).map((trip) => {
        const view = KIND_VIEW[trip.kind];
        const Icon = view.icon;
        const remaining = trip.startAt.getTime() - now;
        const started = remaining <= 0;
        const parts = countdownParts(remaining);
        const soon = !started && remaining < 60 * 60 * 1000;
        const timer = started
          ? 'Now'
          : parts.days > 0
            ? `${parts.days}d ${pad(parts.hours)}h ${pad(parts.minutes)}m`
            : `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
        return (
          <button
            key={trip.key}
            type="button"
            onClick={() => navigate(`${prefix}${view.route}`)}
            className="flex w-full items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${view.tone}`}>
              <Icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-black text-slate-900">{trip.title}</span>
                <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-700">Approved</span>
              </span>
              <span className="block truncate text-[11px] font-semibold text-slate-500">
                {view.label} - {trip.startAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
            <span className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${soon || started ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
              <span className="block text-[8px] font-black uppercase tracking-wide opacity-70">{started ? 'Starting' : soon ? 'Soon' : 'Starts in'}</span>
              <span className="block text-[13px] font-black tabular-nums leading-tight">{timer}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default UpcomingTrips;
