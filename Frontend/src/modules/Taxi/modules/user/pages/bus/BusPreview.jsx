import BusFlowSteps from './BusFlowSteps';
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BusCancellationPolicy from './BusCancellationPolicy';
import {
  ArrowLeft,
  Armchair,
  BusFront,
  CalendarDays,
  ChevronRight,
  Clock3,
  Images,
  MapPin,
  Phone,
  ShieldCheck,
  Ticket,
} from 'lucide-react';

const getRoutePrefix = (pathname = '') => (pathname.startsWith('/taxi/user') ? '/taxi/user' : '');

const formatTravelDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
};

const formatDurationBrief = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return 'Direct';
  // A bare number means hours.
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}h`;
  return raw
    .replace(/days?/gi, 'd')
    .replace(/hours?/gi, 'h')
    .replace(/hrs?/gi, 'h')
    .replace(/minutes?/gi, 'm')
    .replace(/mins?/gi, 'm')
    .replace(/\s+/g, ' ')
    .trim();
};

const stopBadgeTone = {
  pickup: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  drop: 'border-rose-200 bg-rose-50 text-rose-700',
  both: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

const BusPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = useMemo(() => getRoutePrefix(location.pathname), [location.pathname]);
  const state = location.state || {};
  const { bus, fromCity, toCity, date } = state;
  const [activeImage, setActiveImage] = useState(bus?.coverImage || bus?.image || bus?.galleryImages?.[0] || '');

  if (!bus?.busServiceId || !bus?.scheduleId) {
    navigate(`${routePrefix}/bus`, { replace: true });
    return null;
  }

  const gallery = [
    bus?.coverImage || bus?.image || '',
    ...(Array.isArray(bus?.galleryImages) ? bus.galleryImages : []),
  ].filter(Boolean).filter((image, index, list) => list.indexOf(image) === index);
  const routeStops = Array.isArray(bus?.route?.stops) ? bus.route.stops : [];

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-[linear-gradient(180deg,#eef7f6_0%,#ffffff_18%,#f8fafc_100%)] font-booking pb-28">
      <header className="sticky top-0 z-20 border-b border-white/80 bg-white/90 px-5 pb-4 pt-10 shadow-[0_4px_20px_rgba(15,23,42,0.05)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <ArrowLeft size={18} className="text-slate-900" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-900">{bus.operator || 'Bus Details'}</h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {fromCity} to {toCity} • {formatTravelDate(date)}
            </p>
          </div>
        </div>
        <BusFlowSteps current={0} />
      </header>

      <div className="space-y-5 px-5 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[30px] border border-white/80 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
        >
          {activeImage ? (
            <img src={activeImage} alt={bus.busName || bus.operator || 'Bus'} className="h-48 w-full object-cover" />
          ) : null}
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft,#E7F3F2)] text-[var(--app-primary,#0F766E)]">
                <BusFront size={24} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-900">{bus.operator}</h2>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{bus.type} • {bus.routeName || 'Direct route'}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starts at</p>
              <p className="text-xl font-bold text-slate-900">₹{Number(bus.price || 0)}</p>
            </div>
          </div>

          {gallery.length > 1 ? (
            <div className="border-t border-slate-100 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Images size={14} className="text-slate-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gallery</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`overflow-hidden rounded-2xl border-2 ${activeImage === image ? 'border-[var(--app-primary,#0F766E)]' : 'border-transparent'}`}
                  >
                    <img src={image} alt={`${bus.operator} ${index + 1}`} className="h-20 w-28 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </motion.div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-900">{bus.departure || 'NA'}</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-600">{fromCity}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center px-1 pt-2">
              <span className="rounded-full bg-[var(--app-primary-soft,#E7F3F2)] px-3 py-1 text-[11px] font-bold text-[var(--app-primary,#0F766E)]">
                {formatDurationBrief(bus.duration)}
              </span>
              <div className="relative mt-3 flex w-full items-center">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--app-primary,#0F766E)] bg-white" />
                <span className="h-0.5 flex-1 bg-gradient-to-r from-[var(--app-primary,#0F766E)] to-[#C6F432]" />
                <BusFront size={16} className="mx-1 shrink-0 text-[var(--app-primary,#0F766E)]" />
                <span className="h-0.5 flex-1 bg-gradient-to-r from-[#C6F432] to-[var(--app-primary,#0F766E)]" />
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--app-primary,#0F766E)]" />
              </div>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-2xl font-bold text-slate-900">{bus.arrival || 'NA'}</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-600">{toCity}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-dashed border-slate-200 pt-4 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
              <p className="mt-1 text-[13px] font-bold text-slate-900">{formatTravelDate(date)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bus type</p>
              <p className="mt-1 truncate text-[13px] font-bold text-slate-900">{bus.type || 'Coach'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seats left</p>
              <p className={`mt-1 text-[13px] font-bold ${Number(bus.availableSeats || 0) > 0 && Number(bus.availableSeats) <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {bus.availableSeats || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boarding and drop points</p>
          <div className="mt-4 space-y-3">
            {routeStops.length > 0 ? routeStops.map((stop, index) => (
              <div key={stop.id || `${bus.id}-stop-${index}`} className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[var(--app-primary,#0F766E)]" />
                      <p className="truncate text-sm font-bold text-slate-900">{stop.city || stop.pointName || `Stop ${index + 1}`}</p>
                    </div>
                    <p className="mt-1 truncate text-[12px] font-semibold text-slate-500">{stop.pointName || 'Point not set'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${stopBadgeTone[stop.stopType] || stopBadgeTone.both}`}>
                      {stop.stopType === 'both' ? 'BP + DP' : stop.stopType === 'drop' ? 'DP' : 'BP'}
                    </span>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{stop.arrivalTime || stop.departureTime || '--:--'}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
                No stop details added for this bus yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Good to know</p>
          </div>

          {Array.isArray(bus.amenities) && bus.amenities.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {bus.amenities.map((amenity) => (
                <span key={amenity} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700">
                  {amenity}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {bus.boardingPolicy ? (
              <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boarding Policy</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{bus.boardingPolicy}</p>
              </div>
            ) : null}
            <BusCancellationPolicy bus={bus} />
            {bus.luggagePolicy ? (
              <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Luggage Policy</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{bus.luggagePolicy}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 border-t border-slate-100 bg-white/95 px-5 pb-8 pt-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starts at</p>
            <p className="text-2xl font-bold leading-none text-slate-900">
              ₹{Number(bus.price || 0)}
              <span className="ml-1 text-[11px] font-bold text-slate-400">/ seat</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${routePrefix}/bus/seats`, { state })}
            className="flex flex-1 items-center justify-center gap-2 rounded-[20px] bg-[var(--app-primary,#0F766E)] py-4 text-base font-bold text-white shadow-lg shadow-[#0F766E]/25 active:scale-[0.98]"
          >
            Select Seats <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusPreview;
