import { useEffect, useMemo, useState } from 'react';
import api from '../../../shared/api/axiosInstance';
import { POOLING_ENABLED } from '../../../shared/featureFlags';
import useRentalEnabled from '../../../shared/hooks/useRentalEnabled';
import taxiImg from '../../../assets/3d images/AutoCab/taxi.png';
import busImg from '../../../assets/3d images/AutoCab/bus.png';
import outstationImg from '../../../assets/modern_cab_cutout.png';
import airportImg from '../../../assets/3d images/AutoCab/airoplan.png';
import parcelImg from '../../../assets/3d images/gifts.png';
import { TINTS, isRideVehicle, resolveAssetUrl, toVehicleTile } from './useVehicleTiles';

// The user home is built from the admin's App Modules (Admin -> Price Management -> App Modules), in the
// admin's order. The Ride module is expanded into its Vehicle Types (Bike, Auto, Sedan ...); every other
// module (Parcel, Bus, Outstation, Airport, Car Pooling, Rental) is one tile with the module's name,
// short description and thumbnail. A module without a thumbnail uses a built-in picture for its service.
// `banner` is the standard header banner text of the service; an App Module's own banner title / text / button
// (Admin -> App Modules -> Home banner text) replaces it.
const SERVICE_TYPES = {
  parcel: { path: '/taxi/user/parcel/type', art: parcelImg, size: 104, banner: { title: 'Send anything, anywhere', text: 'Pickup in minutes with a secure OTP handover.', cta: 'Send parcel' } },
  outstation: { path: '/taxi/user/intercity', art: outstationImg, size: 96, banner: { title: 'Go beyond the city', text: 'Fixed-fare intercity cabs with no surprises.', cta: 'Plan a trip' } },
  airport: { path: '/taxi/user/cab/airport', art: airportImg, size: 100, banner: { title: 'Never miss a flight', text: 'On-time airport pickups and drops.', cta: 'Book transfer' } },
  bus: { path: '/taxi/user/bus', art: busImg, size: 96, banner: { title: 'Pick your seat', text: 'Book bus tickets right inside the app.', cta: 'Find buses' } },
  pooling: { path: '/taxi/user/pooling', art: taxiImg, size: 88, enabled: POOLING_ENABLED, banner: { title: 'Share the ride, split the fare', text: 'Travel with people going your way and save more.', cta: 'Find a pool' } },
  rental: { path: '/taxi/user/rental', art: outstationImg, size: 88, banner: { title: 'Rent by the hour or day', text: 'Verified vehicles with simple packages.', cta: 'Book rental' } },
};

// The seeded demo modules point at a stock line-icon from a CDN; that is not a real picture.
const isPlaceholderIcon = (url) => /tabler-icons/i.test(url);

const normalizeServiceType = (module) => {
  const type = String(module?.service_type || '').toLowerCase();
  if (type === 'delivery') return 'parcel';
  if (type === 'normal' && String(module?.transport_type || '').toLowerCase() === 'delivery') return 'parcel';
  return type;
};

const toServiceTile = (module, config, index) => {
  const uploaded = resolveAssetUrl(module.image || module.mobile_menu_icon);
  const picture = uploaded && !isPlaceholderIcon(uploaded) ? uploaded : config.art;
  const description = String(module.short_description || module.description || '').trim();

  return {
    id: `module-${module.id || module._id || index}`,
    label: module.name,
    title: String(module.banner_title || '').trim() || config.banner.title,
    text: String(module.banner_text || '').trim() || config.banner.text,
    cta: String(module.banner_cta || '').trim() || config.banner.cta,
    note: description,
    cardImg: picture,
    img: picture,
    fallbackImg: config.art,
    size: config.size,
    tint: TINTS[index % TINTS.length],
    path: config.path,
  };
};

export const modulesToTiles = (modules = [], { rentalEnabled = true } = {}) => {
  const tiles = [];

  modules.forEach((module) => {
    const type = normalizeServiceType(module);

    if (type === 'normal') {
      (module.vehicles || []).filter(isRideVehicle).forEach((vehicle) => {
        tiles.push(toVehicleTile(vehicle, tiles.length));
      });
      return;
    }

    const config = SERVICE_TYPES[type];
    if (!config || config.enabled === false) return;
    // The admin can switch the whole Rental service off (Customization -> Enable Rental Service).
    if (type === 'rental' && !rentalEnabled) return;
    tiles.push(toServiceTile(module, config, tiles.length));
  });

  return tiles;
};

// If the catalog cannot be loaded, fall back to the plain vehicle list plus the built-in services,
// so the home still works.
const loadLegacyModules = async () => {
  const response = await api.get('/users/vehicle-types');
  const payload = response?.data ?? response;
  const list = payload?.vehicle_types || payload?.results || payload?.paginator?.data || (Array.isArray(payload) ? payload : []);
  const vehicles = (Array.isArray(list) ? list : [])
    .filter((type) => type?.active !== false && Number(type?.status ?? 1) !== 0)
    .filter(isRideVehicle);

  return [
    { id: 'legacy-ride', service_type: 'normal', vehicles },
    { id: 'legacy-parcel', service_type: 'parcel', name: 'Parcel', short_description: 'Send anything, anywhere' },
    { id: 'legacy-bus', service_type: 'bus', name: 'Bus', short_description: 'Book bus tickets right inside the app' },
    { id: 'legacy-pooling', service_type: 'pooling', name: 'Pooling', short_description: 'Share the ride, split the fare' },
  ];
};

// The modules are cached as the server sent them; the tiles are built per render, so a setting that changes
// later (the admin switching Rental on or off) is applied without loading them again.
let cache = null;

const load = () => {
  if (!cache) {
    cache = api
      .get('/users/app-modules')
      .then((response) => {
        const payload = response?.data?.data || response?.data || response || {};
        if (!Array.isArray(payload.results)) throw new Error('bad response');
        return payload.results;
      })
      .catch(() => loadLegacyModules())
      .catch(() => {
        cache = null;
        return null;
      });
  }
  return cache;
};

/** Tiles for the user home (rides and services), in the admin's App Module order. */
export default function useHomeCatalog() {
  const [modules, setModules] = useState([]);
  const rentalEnabled = useRentalEnabled();

  useEffect(() => {
    let cancelled = false;
    load().then((list) => {
      if (!cancelled && list) setModules(list);
    });
    return () => { cancelled = true; };
  }, []);

  return useMemo(() => modulesToTiles(modules, { rentalEnabled }), [modules, rentalEnabled]);
}
