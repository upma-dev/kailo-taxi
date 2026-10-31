import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Car, ChevronRight, Package } from 'lucide-react';
import api from '../../../shared/api/axiosInstance';
import { getLocalDriverToken } from '../services/registrationService';

const POLL_MS = 15000;
const unwrap = (response) => response?.data?.data || response?.data || response;
const LIVE = ['accepted', 'arriving', 'started', 'ongoing', 'arrived'];

const auth = () => {
  const token = getLocalDriverToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const fetchLiveJob = async (url) => {
  try {
    const job = unwrap(await api.get(url, { ...auth(), params: { t: Date.now() } }));
    const id = job?.rideId || job?._id;
    const stage = String(job?.liveStatus || job?.status || '').toLowerCase();
    return id && LIVE.includes(stage) ? { ...job, rideId: id } : null;
  } catch {
    return null;
  }
};

const labelFor = (job) => {
  const stage = String(job?.liveStatus || job?.status || '').toLowerCase();
  if (stage === 'started' || stage === 'ongoing') return 'Trip in progress';
  if (stage === 'arriving') return 'Waiting for rider PIN';
  if (stage === 'arrived') return 'Collect payment';
  return 'Go to pickup';
};

/** Slim bar shown on every driver page while the driver has an accepted trip. */
const DriverActiveTripBar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [job, setJob] = useState(null);
  const [isParcel, setIsParcel] = useState(false);

  useEffect(() => {
    let off = false;
    const sync = async () => {
      if (document.visibilityState === 'hidden') return;
      const [delivery, ride] = await Promise.all([fetchLiveJob('/deliveries/active/me'), fetchLiveJob('/rides/active/me')]);
      if (off) return;
      const next = delivery || ride || null;
      setJob(next);
      setIsParcel(Boolean(delivery));
    };
    sync();
    const timer = window.setInterval(sync, POLL_MS);
    window.addEventListener('focus', sync);
    return () => {
      off = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // The trip screen is the trip; Home opens it by itself.
  if (!job || pathname.includes('/active-trip') || pathname === '/taxi/driver/home') return null;

  const Icon = isParcel ? Package : Car;
  return (
    <button
      type="button"
      onClick={() => navigate('/taxi/driver/active-trip', { state: { type: isParcel ? 'parcel' : 'ride', rideId: job.rideId } })}
      className="fixed inset-x-3 top-3 z-[9500] mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-left text-white shadow-2xl active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-900">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-widest text-white/60">Active trip</span>
        <span className="block truncate text-[13px] font-black">{labelFor(job)}</span>
      </span>
      <span className="flex items-center gap-1 text-[12px] font-black text-emerald-300">
        Open <ChevronRight size={16} strokeWidth={3} />
      </span>
    </button>
  );
};

export default DriverActiveTripBar;
