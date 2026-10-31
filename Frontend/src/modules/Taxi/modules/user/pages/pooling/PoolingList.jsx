import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock, Users, Zap, Car, Calendar, Plus, Ban, Split } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { userService } from '../../services/userService';
import taxiImg from '../../../../assets/3d images/AutoCab/taxi.png';

const unwrapPayload = (response) => response?.data?.data || response?.data || response || {};
const shortPlace = (label = '') => String(label).split(',')[0] || label;

const formatTime12h = (time = '') => {
  const [hh, mm] = String(time).split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return time;
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
};

const formatDate = (value) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const SectionTitle = ({ children, hint }) => (
  <div className="px-2">
    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{children}</p>
    {hint ? <p className="mt-1 text-xs font-semibold text-slate-400">{hint}</p> : null}
  </div>
);

const PoolingList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const search = useMemo(
    () => ({
      pickup: {
        lat: Number(searchParams.get('pickupLat')),
        lng: Number(searchParams.get('pickupLng')),
        label: searchParams.get('pickupLabel') || '',
      },
      drop: {
        lat: Number(searchParams.get('dropLat')),
        lng: Number(searchParams.get('dropLng')),
        label: searchParams.get('dropLabel') || '',
      },
      date: searchParams.get('date') || '',
      time: searchParams.get('time') || '',
      seats: Number(searchParams.get('seats') || 1),
    }),
    [searchParams],
  );

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await userService.searchPoolingTrips({
          pickupLat: search.pickup.lat,
          pickupLng: search.pickup.lng,
          pickupLabel: search.pickup.label,
          dropLat: search.drop.lat,
          dropLng: search.drop.lng,
          dropLabel: search.drop.label,
          date: search.date,
          time: search.time,
          seats: search.seats,
        });
        if (!cancelled) setResult(unwrapPayload(response));
      } catch (error) {
        if (!cancelled) {
          setResult(null);
          toast.error(error?.response?.data?.message || 'Failed to fetch rides');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [search]);

  const goToConfirm = (target) => {
    navigate('/taxi/user/pooling/confirm', {
      state: { ...target, pickup: search.pickup, drop: search.drop, travelDate: search.date, departureTime: search.time, seats: search.seats },
    });
  };

  const joinable = result?.joinable || [];
  const newRideOptions = result?.newRideOptions || [];
  const others = result?.others || [];

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 pb-24 font-sans selection:bg-indigo-100">
      <div className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 px-5 pb-5 pt-12 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/taxi/user/pooling')}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-black leading-tight text-slate-900">{shortPlace(search.pickup.label)}</span>
              <ChevronRight size={14} className="shrink-0 text-slate-300" />
              <span className="truncate text-base font-black leading-tight text-slate-900">{shortPlace(search.drop.label)}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(search.date)}</span>
              <span className="flex items-center gap-1"><Clock size={10} />{formatTime12h(search.time)}</span>
              <span className="flex items-center gap-1"><Users size={10} />{search.seats}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-5 pt-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 w-full animate-pulse rounded-[36px] border border-slate-100 bg-white" />
            ))}
          </div>
        ) : !result ? (
          <div className="py-24 text-center">
            <Car size={56} className="mx-auto text-indigo-200" />
            <h3 className="mt-6 text-xl font-black text-slate-900">Couldn't load rides</h3>
            <button
              onClick={() => navigate('/taxi/user/pooling')}
              className="mt-8 rounded-[20px] bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-white"
            >
              Modify Search
            </button>
          </div>
        ) : (
          <>
            {/* Join an existing car */}
            <section className="space-y-4">
              <SectionTitle hint="Cars already going your way. Join and the fare gets split.">Join a ride</SectionTitle>
              {joinable.length === 0 ? (
                <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white/60 p-6 text-center">
                  <p className="text-sm font-black text-slate-700">No car is going your way yet</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Start one below - others on your route can join you and share the fare.</p>
                </div>
              ) : (
                joinable.map((trip, index) => (
                  <motion.button
                    key={trip._id}
                    type="button"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToConfirm({ mode: 'join', trip })}
                    className="w-full rounded-[36px] border border-white bg-white p-6 text-left shadow-sm transition-all hover:border-indigo-100 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {shortPlace(trip.origin.label)} <span className="text-slate-300">→</span> {shortPlace(trip.destination.label)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          {formatTime12h(trip.departureTime)} · {trip.vehicle?.name || 'Shared car'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600">
                            <Users size={11} />{trip.occupiedSeats} on board · {trip.seatsLeft} left
                          </span>
                          <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
                            <Zap size={11} fill="currentColor" />Instant
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-3xl font-black leading-none tracking-tight text-slate-900">₹{trip.youPay}</p>
                        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">You pay</p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                      <Split size={14} className="shrink-0" />
                      Car fare ₹{trip.totalCarFare} is split equally. ₹{trip.farePerSeatAfterJoin} per seat once you join.
                    </div>
                  </motion.button>
                ))
              )}
            </section>

            {/* Start a new car */}
            <section className="space-y-4">
              <SectionTitle hint="You pay the whole car now. Money comes back to your wallet as people join.">Start your own ride</SectionTitle>
              {newRideOptions.length === 0 ? (
                <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white/60 p-6 text-center">
                  <p className="text-sm font-black text-slate-700">No car is free at this time</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Try a different time or fewer seats.</p>
                </div>
              ) : (
                newRideOptions.map((option) => (
                  <motion.button
                    key={option.vehicleId}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToConfirm({ mode: 'create', vehicle: option })}
                    className="w-full rounded-[36px] border border-white bg-white p-6 text-left shadow-sm transition-all hover:border-indigo-100 hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                        <img src={option.images?.[0] || taxiImg} alt={option.name} className="h-full w-full object-contain p-1" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">{option.name}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {option.vehicleModel || option.vehicleType} · {option.capacity} seats
                        </p>
                        <p className="mt-2 text-[11px] font-bold text-emerald-600">Drops to ₹{option.lowestFarePerSeat}/seat when full</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-black leading-none text-slate-900">₹{option.youPay}</p>
                        <p className="mt-1.5 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          <Plus size={10} />New ride
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </section>

            {/* Rides we can't match - tapping explains why */}
            {others.length > 0 ? (
              <section className="space-y-3">
                <SectionTitle hint="Different route or time. Tap to see why you can't join.">Other rides on this date</SectionTitle>
                {others.map((trip) => (
                  <button
                    key={trip._id}
                    type="button"
                    onClick={() => toast.error(trip.reason, { duration: 5000 })}
                    className="flex w-full items-center justify-between gap-3 rounded-[28px] border border-slate-100 bg-white/60 p-5 text-left opacity-70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-700">
                        {shortPlace(trip.origin.label)} → {shortPlace(trip.destination.label)}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {formatTime12h(trip.departureTime)} · {trip.seatsLeft} seats left
                      </p>
                    </div>
                    <Ban size={18} className="shrink-0 text-slate-300" />
                  </button>
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default PoolingList;
