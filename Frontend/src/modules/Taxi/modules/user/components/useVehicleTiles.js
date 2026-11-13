import bikeImg from '../../../assets/icons/bike.png';
import autoImg from '../../../assets/icons/auto.png';
import carImg from '../../../assets/icons/car.png';
import hatchbackImg from '../../../assets/icons/Hatchback.png';
import suvImg from '../../../assets/icons/SUV.png';
import luxuryImg from '../../../assets/icons/Luxury.png';
import premiumImg from '../../../assets/icons/Premium.png';
import truckImg from '../../../assets/icons/truck.png';
import { BACKEND_ORIGIN } from '../../../shared/api/runtimeConfig';

export const TINTS = ['#FFF3D6', '#E3F6F2', '#E6EEFB', '#EAF0FF', '#F1EAFB', '#FCE7F0'];

export const resolveAssetUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(raw)) return raw;
  return `${BACKEND_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

// `category` is what the location / vehicle screens already understand: bike | auto | cab.
const getCategory = (type) => {
  const icon = String(type?.icon_types || type?.name || '').toLowerCase();
  if (icon.includes('bike') || icon.includes('scoot')) return 'bike';
  if (icon.includes('auto')) return 'auto';
  return 'cab';
};

// Used when the admin has not uploaded a picture for a vehicle type, so every vehicle still shows a picture.
export const fallbackVehicleImage = (type) => {
  const text = `${type?.icon_types || ''} ${type?.name || ''}`.toLowerCase();
  if (/bike|scoot|moto/.test(text)) return bikeImg;
  if (/auto|rickshaw/.test(text)) return autoImg;
  if (/truck|lcv|hcv|mcv|pickup/.test(text)) return truckImg;
  if (/lux/.test(text)) return luxuryImg;
  if (/premium|prime/.test(text)) return premiumImg;
  if (/suv|innova|xl|muv/.test(text)) return suvImg;
  if (/hatch|mini|micro/.test(text)) return hatchbackImg;
  return carImg;
};

/** Vehicle types a rider can book as a ride (not delivery-only, not a cycle). */
export const isRideVehicle = (type) => {
  const transport = String(type?.transport_type || 'taxi').toLowerCase();
  const name = `${type?.icon_types || ''} ${type?.name || ''}`.toLowerCase();
  const isCycle = ['cycle', 'bicycle', 'e-cycle'].some((word) => name.includes(word));
  return (transport === 'taxi' || transport === 'both') && !isCycle;
};

/** One vehicle type as a home tile. `type` is a vehicle from the catalog (id/_id, name, image, icon_types ...). */
export const toVehicleTile = (type, index) => {
  const id = String(type?.id || type?._id || index);
  const label = type?.name || 'Vehicle';
  const description = String(type?.short_description || '').trim();
  const fallbackImg = fallbackVehicleImage(type);
  // The map marker (top-down) is not a display picture, so only the vehicle's own image is used.
  const picture = resolveAssetUrl(type?.image || '') || fallbackImg;

  return {
    id: `vehicle-${id}`,
    label,
    title: label,
    text: description || `Book a ${label.toLowerCase()} in a few taps.`,
    cardImg: picture,
    img: picture,
    fallbackImg,
    size: 96,
    tint: TINTS[index % TINTS.length],
    vehicle: true,
    category: getCategory(type),
    vehicleId: id,
  };
};

/** Opens the ride booking screen for a vehicle tile. */
export const openVehicle = (tile, navigate) =>
  navigate('/taxi/user/ride/select-location', {
    state: { preferredCategory: tile.category, preferredVehicle: tile.vehicleId },
  });
