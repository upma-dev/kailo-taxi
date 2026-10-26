import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin } from 'lucide-react';
import {
  DEFAULT_LOCATION_LABEL,
  LOCATION_UPDATED_EVENT,
  getSavedLocation,
} from '../services/locationStore';

const HEADER_BG = '#0B172A';
const ACCENT = '#5B9BD5';

const splitAddress = (address = '') =>
  String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export default function HomeHeader({ handleLocationClick }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState(() => getSavedLocation());

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
    <div className="relative z-10 w-full" style={{ backgroundColor: HEADER_BG }}>
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 pb-4 pt-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={onLocationClick}
        >
          <MapPin
            className="h-5 w-5 flex-shrink-0"
            strokeWidth={1.5}
            style={{ color: ACCENT, fill: ACCENT }}
          />
          <div className="flex min-w-0 flex-col text-white">
            <div className="flex min-w-0 items-center gap-0.5">
              <span className="truncate text-[14px] font-bold drop-shadow-sm">{title}</span>
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-90" />
            </div>
            {subtitle ? (
              <span className="max-w-[210px] truncate text-[11px] font-medium opacity-80">
                {subtitle}
              </span>
            ) : null}
          </div>
        </button>

        <button
          type="button"
          className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-all hover:bg-gray-50"
          onClick={() => navigate('/taxi/user/wallet')}
          aria-label="Wallet"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-gray-800">
            <span className="font-serif text-[10px] font-bold text-gray-800">₹</span>
          </div>
        </button>
      </div>
    </div>
  );
}
