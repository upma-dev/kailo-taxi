import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import { getGoHomeState } from '../services/registrationService';

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const formatKm = (meters) => {
  if (!Number.isFinite(meters)) return '';
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
};

// Shown on the driver home map while Go Home mode is on. Renders nothing otherwise.
const GoHomeChip = () => {
  const navigate = useNavigate();
  const [state, setState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = unwrap(await getGoHomeState());
        if (!cancelled) setState(next);
      } catch {
        if (!cancelled) setState(null);
      }
    };
    load();
    const timer = setInterval(load, 45000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (!state?.active) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/taxi/driver/go-home')}
      className="fixed left-1/2 top-[108px] z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white shadow-xl active:scale-95"
    >
      <Navigation size={14} />
      <span className="text-[12px] font-bold">Going home{state.distanceToHomeMeters != null ? ` · ${formatKm(state.distanceToHomeMeters)} left` : ''}</span>
    </button>
  );
};

export default GoHomeChip;
