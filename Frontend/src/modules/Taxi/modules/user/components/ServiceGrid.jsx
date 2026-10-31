import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, ChevronRight, Package, Users } from 'lucide-react';

import api from '../../../shared/api/axiosInstance';
import { BACKEND_ORIGIN } from '../../../shared/api/runtimeConfig';

const LIME = '#C6F432';
const TINTS = ['#FFF3D6', '#E3F6F2', '#E6EEFB', '#EAF0FF', '#F1EAFB', '#FCE7F0'];

// Parcel has its own booking flow (what to send, sender and receiver), not the ride location screen.
const PARCEL_CARD = { id: 'parcel', label: 'Parcel', note: 'Send anything', seats: null, img: '', tint: '#FFEFE0', path: '/taxi/user/parcel/type' };

const resolveAssetUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(raw)) return raw;
  return `${BACKEND_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

// `category` is what the location/vehicle screens already understand: bike | auto | cab.
const getCategory = (type) => {
  const icon = String(type?.icon_types || type?.name || '').toLowerCase();
  if (icon.includes('bike') || icon.includes('scoot')) return 'bike';
  if (icon.includes('auto')) return 'auto';
  return 'cab';
};

const readCatalog = (response) => {
  const payload = response?.data ?? response;
  const list = payload?.vehicle_types || payload?.results || payload?.paginator?.data || (Array.isArray(payload) ? payload : []);
  return Array.isArray(list) ? list : [];
};

// The vehicles come from the admin's Vehicle Types, so the name, seats and picture are always the ones the
// admin set. A vehicle without an uploaded picture shows a plain icon instead of a stock image.
const toRideCard = (type, index) => ({
  id: String(type?._id || type?.id || index),
  label: type?.name || 'Vehicle',
  note: String(type?.short_description || '').trim().slice(0, 18),
  seats: Number(type?.capacity) > 0 ? Number(type.capacity) : null,
  img: resolveAssetUrl(type?.image || type?.map_icon || type?.icon || ''),
  tint: TINTS[index % TINTS.length],
  category: getCategory(type),
});

const CardImage = ({ vehicle, index }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [vehicle.img]);

  if (!vehicle.img || broken) {
    const Fallback = vehicle.id === 'parcel' ? Package : Car;
    return <Fallback size={34} strokeWidth={1.6} className="text-[#14213D]/35" aria-label={vehicle.label} />;
  }

  return (
    <motion.img
      src={vehicle.img}
      alt={vehicle.label}
      onError={() => setBroken(true)}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
      className="h-[58px] w-[88px] object-contain drop-shadow-[0_8px_8px_rgba(20,33,61,0.22)]"
    />
  );
};

const VehicleCard = ({ vehicle, index }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05, type: 'spring', stiffness: 130 }}
      whileTap={{ scale: 0.96 }}
      onClick={() =>
        vehicle.path
          ? navigate(vehicle.path)
          : navigate('/taxi/user/ride/select-location', {
            state: { preferredCategory: vehicle.category, preferredVehicle: vehicle.id },
          })
      }
      className="relative flex w-[132px] flex-shrink-0 flex-col overflow-hidden rounded-[22px] border border-[#E8EEEB] bg-white p-3 text-left shadow-[0_10px_22px_rgba(15,118,110,0.08)]"
    >
      <span
        className="relative flex h-[74px] items-center justify-center rounded-[16px]"
        style={{ backgroundColor: vehicle.tint }}
      >
        <CardImage vehicle={vehicle} index={index} />
      </span>
      <span className="mt-2.5 truncate text-[13px] font-black leading-tight text-[#14213D]">{vehicle.label}</span>
      <span className="mt-0.5 flex items-center justify-between text-[10px] font-bold text-[#14213D]/50">
        <span className="truncate">{vehicle.note}</span>
        {vehicle.seats ? (
          <span className="flex items-center gap-0.5">
            <Users size={10} />
            {vehicle.seats}
          </span>
        ) : null}
      </span>
    </motion.button>
  );
};

const ServiceGrid = ({ plain = false }) => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);

  useEffect(() => {
    let active = true;

    api.get('/users/vehicle-types')
      .then((response) => {
        if (!active) return;
        const cards = readCatalog(response)
          .filter((type) => {
            const isActive = type?.active !== false && Number(type?.status ?? 1) !== 0;
            const transport = String(type?.transport_type || 'taxi').toLowerCase();
            const name = `${type?.icon_types || ''} ${type?.name || ''}`.toLowerCase();
            const isCycle = ['cycle', 'bicycle', 'e-cycle'].some((word) => name.includes(word));
            return isActive && !isCycle && (transport === 'taxi' || transport === 'both');
          })
          .map(toRideCard);
        setRides(cards);
      })
      .catch(() => {
        // The Parcel card below still works; ride types show up once the catalog loads.
      });

    return () => {
      active = false;
    };
  }, []);

  const vehicles = [...rides, PARCEL_CARD];

  const containerClass = plain
    ? 'relative z-10 mt-1'
    : 'relative w-full rounded-b-[32px] bg-[#F8FAF7] pb-6 pt-3';

  return (
    <div className={containerClass}>
      <div className="flex items-end justify-between px-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0F766E]">Rides</p>
          <h2 className="mt-0.5 text-[20px] font-black leading-tight tracking-tight text-[#14213D]">
            Choose your ride
          </h2>
          <p className="mt-0.5 text-[11px] font-bold text-[#14213D]/50">Pick a vehicle that suits your trip.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/taxi/user/ride/select-location')}
          className="flex flex-shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-black text-[#14213D]"
          style={{ backgroundColor: LIME }}
        >
          Book now
          <ChevronRight size={12} strokeWidth={3} />
        </button>
      </div>

      <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-5 pb-3">
        {vehicles.map((vehicle, index) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
        ))}
      </div>
    </div>
  );
};

export default ServiceGrid;
