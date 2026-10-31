import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Headset, History, MapPin, Navigation, ShieldAlert } from 'lucide-react';
import api from '../../../shared/api/axiosInstance';

const LIME = '#C6F432';
const FETCH_LIMIT = 8;
const SHOW_LIMIT = 3;

const getPayload = (response) => response?.data?.data || response?.data || response || {};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Short label for an address: the first comma-separated part.
const shortAddress = (value) => String(value || '').split(',')[0].trim();

const toTrip = (ride) => {
  const pickup = String(ride?.pickupAddress || '').trim();
  const drop = String(ride?.dropAddress || '').trim();
  if (!pickup || !drop) return null;
  const status = String(ride?.status || '').toLowerCase();
  if (status !== 'completed') return null;
  if (String(ride?.serviceType || '').toLowerCase() === 'parcel') return null;

  return {
    id: ride.rideId || ride._id || ride.id,
    pickup,
    drop,
    fare: Number(ride.fare || 0),
    date: formatDate(ride.completedAt || ride.createdAt),
  };
};

function TripSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1].map((i) => (
        <div key={i} className="h-[66px] animate-pulse rounded-[18px] border border-[#E8EEEB] bg-white" />
      ))}
    </div>
  );
}

export default function RecentTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null); // null = loading

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await api.get('/rides', { params: { limit: FETCH_LIMIT, page: 1 } });
        const payload = getPayload(response);
        const rides = Array.isArray(payload?.results) ? payload.results : [];
        const list = rides.map(toTrip).filter(Boolean);
        // Same destination twice in a row is noise; keep the latest of each.
        const unique = list.filter((trip, index) => list.findIndex((t) => t.drop === trip.drop) === index);
        if (active) setTrips(unique.slice(0, SHOW_LIMIT));
      } catch {
        if (active) setTrips([]);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const rebook = (trip) =>
    navigate('/taxi/user/ride/select-location', { state: { drop: trip.drop } });

  return (
    <section className="relative z-10 px-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0F766E]">Quick rebook</p>
          <h2 className="mt-0.5 text-[20px] font-black leading-tight tracking-tight text-[#14213D]">Recent trips</h2>
        </div>
        {trips && trips.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/taxi/user/activity')}
            className="flex items-center gap-0.5 text-[11px] font-black text-[#0F766E]"
          >
            See all
            <ChevronRight size={13} strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="mt-3">
        {trips === null ? (
          <TripSkeleton />
        ) : trips.length > 0 ? (
          <ul className="space-y-2.5">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  onClick={() => rebook(trip)}
                  className="flex w-full items-center gap-3 rounded-[18px] border border-[#E8EEEB] bg-white p-3 text-left shadow-[0_8px_18px_rgba(15,118,110,0.06)] transition active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E3F6F2] text-[#0F766E]">
                    <History size={18} strokeWidth={2.3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold leading-tight text-[#14213D]">
                      {shortAddress(trip.drop)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-[#14213D]/50">
                      From {shortAddress(trip.pickup)}
                      {trip.date ? ` · ${trip.date}` : ''}
                      {trip.fare > 0 ? ` · ₹${Math.round(trip.fare)}` : ''}
                    </span>
                  </span>
                  <span
                    className="flex-shrink-0 rounded-full px-3 py-1.5 text-[10.5px] font-black text-[#14213D]"
                    style={{ backgroundColor: LIME }}
                  >
                    Book again
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/taxi/user/ride/select-location')}
            className="flex w-full items-center gap-3 rounded-[18px] border border-dashed border-[#0F766E]/30 bg-white p-3.5 text-left"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E3F6F2] text-[#0F766E]">
              <Navigation size={18} strokeWidth={2.3} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold leading-tight text-[#14213D]">No trips yet</span>
              <span className="mt-0.5 block text-[11px] font-medium text-[#14213D]/50">
                Your completed trips show up here for one-tap rebooking.
              </span>
            </span>
            <ChevronRight size={16} className="flex-shrink-0 text-[#14213D]/40" />
          </button>
        )}
      </div>

      {/* always-on safety and support shortcuts */}
      <div className="mt-4 grid grid-cols-2 gap-3 pb-2">
        <button
          type="button"
          onClick={() => navigate('/taxi/user/safety/sos')}
          className="flex items-center gap-2.5 rounded-[18px] bg-[#FEECEC] p-3 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#EF4444] text-white">
            <ShieldAlert size={17} strokeWidth={2.4} />
          </span>
          <span className="leading-tight">
            <span className="block text-[12px] font-black text-[#14213D]">Safety</span>
            <span className="block text-[10px] font-semibold text-[#14213D]/55">SOS contacts</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/taxi/user/support')}
          className="flex items-center gap-2.5 rounded-[18px] bg-[#E3F6F2] p-3 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white">
            <Headset size={17} strokeWidth={2.4} />
          </span>
          <span className="leading-tight">
            <span className="block text-[12px] font-black text-[#14213D]">Support</span>
            <span className="block text-[10px] font-semibold text-[#14213D]/55">We are here 24/7</span>
          </span>
        </button>
      </div>
    </section>
  );
}
