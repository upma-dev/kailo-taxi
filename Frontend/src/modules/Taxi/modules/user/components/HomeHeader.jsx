import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, MapPin, Wallet } from 'lucide-react';
import {
  DEFAULT_LOCATION_LABEL,
  LOCATION_UPDATED_EVENT,
  getSavedLocation,
} from '../services/locationStore';
import { useSettings } from '../../../shared/context/SettingsContext';

// Kailo Taxi palette: Deep Teal + Lime Green on Off-White.
const LIME = '#C6F432';

const splitAddress = (address = '') =>
  String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export default function HomeHeader({ handleLocationClick }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState(() => getSavedLocation());
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'Kailo Taxi';
  const appLogo = settings.general?.logo || settings.customization?.logo || '/kailo-taxi-logo.png';

  useEffect(() => {
    const syncLocation = () => setLocation(getSavedLocation());
    syncLocation();
    window.addEventListener('storage', syncLocation);
    window.addEventListener(LOCATION_UPDATED_EVENT, syncLocation);
    window.addEventListener('userLocationUpdated', syncLocation);
    return () => {
      window.removeEventListener('storage', syncLocation);
      window.removeEventListener(LOCATION_UPDATED_EVENT, syncLocation);
      window.removeEventListener('userLocationUpdated', syncLocation);
    };
  }, []);

  const { title, subtitle } = useMemo(() => {
    const address = String(location?.formattedAddress || location?.address || '').trim();
    if (!address) return { title: DEFAULT_LOCATION_LABEL, subtitle: '' };

    const parts = splitAddress(address);
    const area = String(location?.area || '').trim();
    const city = String(location?.city || '').trim();
    const heading = area && city ? `${area}, ${city}` : parts[0] || address;
    return { title: heading, subtitle: parts.slice(1).join(', ') };
  }, [location]);

  const onLocationClick = useCallback(() => {
    if (handleLocationClick) {
      handleLocationClick();
      return;
    }
    navigate('/taxi/user/ride/select-location');
  }, [handleLocationClick, navigate]);

  return (
    <div className="relative z-20 flex items-center justify-between gap-2.5 px-4 pb-2 pt-4">
      <img
        src={appLogo}
        alt={appName}
        draggable={false}
        onError={(event) => {
          if (event.currentTarget.dataset.fallback) return;
          event.currentTarget.dataset.fallback = '1';
          event.currentTarget.src = '/kailo-taxi-logo.png';
        }}
        className="h-11 w-11 flex-shrink-0 rounded-2xl bg-white object-contain p-1 shadow-[0_6px_14px_rgba(0,0,0,0.2)]"
      />
      <button
        type="button"
        onClick={onLocationClick}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 py-2 pl-2 pr-3 text-left backdrop-blur-md transition active:scale-[0.99]"
      >
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-[0_6px_14px_rgba(0,0,0,0.18)]"
          style={{ backgroundColor: LIME }}
        >
          <MapPin className="h-[18px] w-[18px] text-[#14213D]" strokeWidth={2.4} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/60">
            Pickup from
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[14px] font-extrabold leading-tight text-white">{title}</span>
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/80" />
          </span>
          {subtitle ? (
            <span className="max-w-[200px] truncate text-[10.5px] font-medium text-white/60">{subtitle}</span>
          ) : null}
        </span>
      </button>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/taxi/user/notifications')}
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition active:scale-95"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/taxi/user/wallet')}
          aria-label="Wallet"
          className="flex h-10 w-10 items-center justify-center rounded-full shadow-[0_6px_14px_rgba(0,0,0,0.18)] transition active:scale-95"
          style={{ backgroundColor: LIME }}
        >
          <Wallet className="h-[18px] w-[18px] text-[#14213D]" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
