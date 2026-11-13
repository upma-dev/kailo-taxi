import React, { useCallback, useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { socketService } from '../../../shared/api/socket';
import { getReturnTripState, startReturnTrip, stopReturnTrip } from '../services/registrationService';

const unwrap = (response) => response?.data?.data || response?.data || response || {};
const DISMISSED_KEY = 'driver_return_trip_dismissed_ride';

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) || '';
  } catch {
    return '';
  }
};

const writeDismissed = (rideId) => {
  try {
    localStorage.setItem(DISMISSED_KEY, String(rideId || ''));
  } catch {
    // storage blocked: the card simply shows again next time
  }
};

const formatKm = (meters) => {
  if (!Number.isFinite(meters)) return '';
  return meters < 1000 ? `${meters} m` : `${Math.round(meters / 1000)} km`;
};

const shortPlace = (value = '') => String(value || '').split(',')[0].trim() || 'home';

/** Shared state for the outstation Return Trip (used on the driver home and in the profile). */
export const useReturnTrip = ({ poll = false } = {}) => {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(unwrap(await getReturnTripState()));
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => {
    load();
    if (!poll) return undefined;
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load, poll]);

  // The server ends the trip by itself (back home / time over) and tells the app.
  useEffect(() => {
    const onEnded = (data) => {
      toast(data?.message || 'Return Trip is off. You will get all rides again.');
      load();
    };
    socketService.on('returnTripEnded', onEnded);
    return () => socketService.off('returnTripEnded', onEnded);
  }, [load]);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const next = unwrap(await startReturnTrip());
      setState(next);
      toast.success(`Return Trip is on. You will get outstation rides towards ${shortPlace(next.homeLabel)}.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not start Return Trip.');
    } finally {
      setBusy(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      setState(unwrap(await stopReturnTrip()));
      toast('Return Trip is off. You will get all rides again.');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not stop Return Trip.');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, start, stop, reload: load };
};

// On the driver home: a chip while a Return Trip is on, or a one-time offer after a one-way outstation ride.
const ReturnTripCard = () => {
  const { state, busy, start, stop } = useReturnTrip({ poll: true });
  const [dismissed, setDismissed] = useState(readDismissed);

  if (state?.active) {
    return (
      <div className="fixed left-1/2 top-[152px] z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 py-2 pl-4 pr-2 text-white shadow-xl">
        <Undo2 size={14} />
        <span className="text-[12px] font-bold">
          Return Trip to {shortPlace(state.homeLabel)}
          {state.distanceToHomeMeters != null ? ` · ${formatKm(state.distanceToHomeMeters)}` : ''}
        </span>
        <button
          type="button"
          onClick={stop}
          disabled={busy}
          className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-bold active:scale-95 disabled:opacity-60"
        >
          Stop
        </button>
      </div>
    );
  }

  const offer = state?.offer;
  if (!offer?.rideId || dismissed === offer.rideId) return null;

  const close = () => {
    writeDismissed(offer.rideId);
    setDismissed(offer.rideId);
  };

  return (
    <div className="fixed inset-x-4 top-[152px] z-40 mx-auto max-w-md rounded-3xl border border-amber-100 bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Undo2 size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-slate-900">Need a ride back?</p>
          <p className="mt-0.5 text-[12px] font-medium text-slate-500">
            {shortPlace(offer.fromLabel)} → {shortPlace(offer.homeLabel)}. Turn on Return Trip to get only outstation
            rides going back towards {shortPlace(offer.homeLabel)}.
          </p>
        </div>
        <button type="button" onClick={close} className="text-slate-300" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={close}
          className="h-10 rounded-2xl border border-slate-200 text-[13px] font-bold text-slate-600"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="h-10 rounded-2xl bg-amber-500 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Starting...' : 'Turn on'}
        </button>
      </div>
    </div>
  );
};

export default ReturnTripCard;
