import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Car } from 'lucide-react';
import api from '../../../shared/api/axiosInstance';
import { userService } from '../services/userService';
import { RENTAL_ENABLED } from '../../../shared/featureFlags';
import {
  CURRENT_RIDE_UPDATED_EVENT,
  getCurrentRide,
  getRideResume,
  isResumableRide,
  toCurrentRideSnapshot,
} from '../services/currentRideService';

const POLL_MS = 20000;
const unwrap = (response) => response?.data?.data || response?.data || response;

const stageLabel = (ride) => {
  const stage = String(ride?.liveStatus || ride?.status || '').toLowerCase();
  const isParcel = String(ride?.serviceType || '').toLowerCase() === 'parcel';
  if (String(ride?.serviceType || '').toLowerCase() === 'rental') return 'Rental in progress';
  if (stage === 'searching') return 'Finding you a captain…';
  if (stage === 'started' || stage === 'ongoing') return isParcel ? 'Parcel in transit' : 'Ride in progress';
  if (stage === 'arrived') return isParcel ? 'Parcel reached destination' : 'Reached destination';
  if (stage === 'arriving') return 'Your captain has arrived';
  return isParcel ? 'Parcel booked' : 'Captain is on the way';
};

/** Slim "ride in progress" bar shown above the bottom nav so a live trip is never out of sight. */
const ActiveRideBar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [ride, setRide] = useState(() => {
    const stored = getCurrentRide();
    return stored && isResumableRide(stored) ? stored : null;
  });

  useEffect(() => {
    let off = false;
    let timer = null;

    const fromStorage = () => {
      const stored = getCurrentRide();
      if (!off) setRide(stored && isResumableRide(stored) ? stored : null);
    };

    const sync = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const data = unwrap(await api.get('/rides/active/me'));
        if (off) return;
        const snapshot = data?._id || data?.rideId ? toCurrentRideSnapshot(data) : null;
        setRide(snapshot && isResumableRide(snapshot) ? snapshot : null);
      } catch (error) {
        if (Number(error?.response?.status || 0) !== 404) return;
        if (!off) setRide(null);
      }

      // no ride: an active rental booking counts as a live trip too
      if (!RENTAL_ENABLED) return;
      try {
        const res = await userService.getActiveRentalBooking();
        const rental = res?.id ? res : res?.data || null;
        const status = String(rental?.status || '').toLowerCase();
        if (!off && rental?.id && !['completed', 'cancelled', 'delivered'].includes(status)) {
          setRide({
            rideId: rental.id,
            serviceType: 'rental',
            status: rental.status,
            liveStatus: rental.status,
            ...rental,
          });
        }
      } catch {
        // ignore: the rental bar is best-effort
      }
    };

    sync();
    timer = window.setInterval(sync, POLL_MS);
    window.addEventListener(CURRENT_RIDE_UPDATED_EVENT, fromStorage);
    window.addEventListener('focus', sync);
    return () => {
      off = true;
      window.clearInterval(timer);
      window.removeEventListener(CURRENT_RIDE_UPDATED_EVENT, fromStorage);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // Home already shows the full ride card; the tracking screens are the ride itself.
  const hide = pathname === '/taxi/user' || pathname === '/taxi/user/' || /\/(ride|parcel)\/(tracking|searching)/.test(pathname);
  if (!ride || hide) return null;

  const resume = getRideResume(ride, '/taxi/user');
  return (
    <button
      type="button"
      onClick={() => navigate(resume.path, { state: resume.state })}
      className="fixed left-0 right-0 z-[99] mx-auto flex w-[calc(100%-1.5rem)] max-w-lg items-center gap-3 rounded-2xl bg-[#0F766E] px-4 py-3 text-left text-white shadow-[0_12px_30px_-10px_rgba(5,46,43,0.8)] active:scale-[0.99]"
      style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom))' }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C6F432] text-[#14213D]">
        <Car size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-widest text-white/70">Active trip</span>
        <span className="block truncate text-[13px] font-black">{stageLabel(ride)}</span>
      </span>
      <span className="flex items-center gap-1 text-[12px] font-black text-[#C6F432]">
        Continue <ChevronRight size={16} strokeWidth={3} />
      </span>
    </button>
  );
};

export default ActiveRideBar;
