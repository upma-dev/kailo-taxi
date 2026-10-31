const CURRENT_RIDE_STORAGE_KEY = 'kailo_current_ride';

export const CURRENT_RIDE_UPDATED_EVENT = 'kailo:current-ride-updated';

const ACTIVE_RIDE_STATUSES = new Set(['accepted', 'arriving', 'started', 'ongoing', 'assigned', 'confirmed', 'end_requested']);
const TERMINAL_RIDE_STATUSES = new Set(['completed', 'cancelled', 'delivered']);

const notifyCurrentRideChange = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(CURRENT_RIDE_UPDATED_EVENT));
};

export const getCurrentRide = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawRide = window.localStorage.getItem(CURRENT_RIDE_STORAGE_KEY);
    return rawRide ? JSON.parse(rawRide) : null;
  } catch {
    return null;
  }
};

export const isActiveCurrentRide = (ride) => {
  if (!ride?.rideId) {
    return false;
  }

  const status = String(ride.status || '').toLowerCase();
  const liveStatus = String(ride.liveStatus || '').toLowerCase();

  if (TERMINAL_RIDE_STATUSES.has(status) || TERMINAL_RIDE_STATUSES.has(liveStatus)) {
    return false;
  }

  return ACTIVE_RIDE_STATUSES.has(liveStatus || status || 'accepted');
};

// A booking still waiting for a captain. Shown on Home so the user can reopen the search or cancel it.
// Parcel and rental bookings have their own flows, so only rides (incl. intercity) count here.
export const isSearchingCurrentRide = (ride) => {
  if (!ride?.rideId) {
    return false;
  }

  const serviceType = String(ride.serviceType || ride.type || 'ride').toLowerCase();
  if (serviceType === 'parcel' || serviceType === 'rental') {
    return false;
  }

  const status = String(ride.status || '').toLowerCase();
  const liveStatus = String(ride.liveStatus || '').toLowerCase();
  return (liveStatus || status) === 'searching';
};

export const saveCurrentRide = (ride) => {
  if (typeof window === 'undefined' || !ride?.rideId) {
    return;
  }

  const nextRide = {
    ...ride,
    status: ride.status || 'accepted',
    liveStatus: ride.liveStatus || ride.status || 'accepted',
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(CURRENT_RIDE_STORAGE_KEY, JSON.stringify(nextRide));
  notifyCurrentRideChange();
};

// Turns an API ride (from /rides or /rides/active/me) into the shape the tracking screens expect.
export const toCurrentRideSnapshot = (rideData = {}) => ({
  rideId: rideData._id || rideData.rideId || rideData.id,
  pickup: rideData.pickupAddress || rideData.pickup,
  drop: rideData.dropAddress || rideData.drop,
  pickupCoords: rideData.pickupLocation?.coordinates || rideData.pickupCoords || null,
  dropCoords: rideData.dropLocation?.coordinates || rideData.dropCoords || null,
  fare: rideData.fare,
  baseFare: rideData.baseFare || rideData.fare || 0,
  status: rideData.status,
  liveStatus: rideData.liveStatus,
  serviceType: rideData.serviceType,
  scheduledAt: rideData.scheduledAt || null,
  acceptedAt: rideData.acceptedAt || null,
  arrivedAt: rideData.arrivedAt || null,
  estimatedDistanceMeters: rideData.estimatedDistanceMeters || 0,
  estimatedDurationMinutes: rideData.estimatedDurationMinutes || 0,
  paymentMethod: rideData.paymentMethod || 'Cash',
  pricingSnapshot: rideData.pricingSnapshot || null,
  otp: rideData.otp || '',
  driver: rideData.driverId || rideData.driver,
  vehicleIconUrl: rideData.vehicleIconUrl,
  vehicleIconType: rideData.vehicleIconType,
});

// A ride the rider can still open: waiting for a captain, or already assigned and not finished.
export const isResumableRide = (ride) => isActiveCurrentRide(ride) || isSearchingCurrentRide(ride);

// Where "Continue" should send the rider for this ride, plus the router state to pass along.
export const getRideResume = (ride, routePrefix = '/taxi/user') => {
  const snapshot = ride?.rideId ? ride : toCurrentRideSnapshot(ride);
  const serviceType = String(snapshot.serviceType || snapshot.type || 'ride').toLowerCase();
  const searching = isSearchingCurrentRide(snapshot);
  const path = searching
    ? `${routePrefix}/ride/searching`
    : serviceType === 'parcel'
      ? `${routePrefix}/parcel/tracking`
      : serviceType === 'rental'
        ? `${routePrefix}/rental/confirmed`
        : `${routePrefix}/ride/tracking`;
  return { path, state: searching ? { ...snapshot, resumeRideId: snapshot.rideId } : snapshot };
};

export const clearCurrentRide = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(CURRENT_RIDE_STORAGE_KEY);
  notifyCurrentRideChange();
};
