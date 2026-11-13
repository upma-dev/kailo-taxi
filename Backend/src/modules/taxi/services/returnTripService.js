import { Driver } from '../driver/models/Driver.js';
import { Ride } from '../user/models/Ride.js';
import { RIDE_STATUS } from '../constants/index.js';
import { distanceMeters, evaluateRideAlongHome } from './goHomeService.js';
import { emitToDriver } from './dispatchService.js';

// "Return Trip" for outstation drivers. After a one-way outstation ride (e.g. Indore -> Bhopal) the driver can
// switch it on; until it ends, the driver is only offered outstation rides that start near them and head back
// towards where that trip began (Bhopal -> Indore). It ends by itself when the driver is back home or after a
// few hours, so it can never get stuck the way the old "My Route Booking" did.
export const RETURN_TRIP = {
  maxDurationHours: 8,
  // An outstation ride finished within this many hours can still be used to start a return trip.
  offerWindowHours: 12,
  // Back within this distance of the trip's start = home, so the return trip ends.
  arrivalRadiusMeters: 15000,
  // Shorter trips are not worth a return trip.
  minTripMeters: 30000,
  // How far a ride may point away from home, and how far off the straight road home it may be.
  coneAngleDegrees: 45,
  corridorWidthKm: 25,
};

const isPoint = (value) =>
  Array.isArray(value) && value.length === 2 && value.every((n) => Number.isFinite(Number(n)));

export const isReturnTripActive = (driver, now = Date.now()) => {
  const trip = driver?.returnTrip;
  if (!trip?.active) return false;
  if (trip.expiresAt && new Date(trip.expiresAt).getTime() <= now) return false;
  return isPoint(trip.homeLocation?.coordinates);
};

// While a driver is on a return trip, only outstation rides along the way home are offered to them.
export const applyReturnTripFilter = (drivers = [], { serviceType = 'ride', pickupCoords, dropCoords }) => {
  const isOutstation = String(serviceType || '').toLowerCase() === 'intercity';
  return drivers.filter((driver) => {
    if (!isReturnTripActive(driver)) return true;
    if (!isOutstation) return false;
    return evaluateRideAlongHome(
      {
        driverCoords: driver.location?.coordinates,
        homeCoords: driver.returnTrip.homeLocation.coordinates,
        pickupCoords,
        dropCoords,
      },
      RETURN_TRIP,
    ).ok;
  });
};

// The driver's last outstation ride that a return trip can be started from, or null.
export const findReturnTripOffer = async (driver) => {
  const since = new Date(Date.now() - RETURN_TRIP.offerWindowHours * 60 * 60 * 1000);
  const ride = await Ride.findOne({
    driverId: driver._id,
    serviceType: 'intercity',
    status: RIDE_STATUS.COMPLETED,
    updatedAt: { $gte: since },
  })
    .sort({ updatedAt: -1 })
    .select('pickupLocation dropLocation pickupAddress dropAddress intercity updatedAt')
    .lean();

  if (!ride) return null;
  // A round trip already brings the driver back with the same rider.
  if (/round/i.test(String(ride.intercity?.tripType || ''))) return null;

  const home = ride.pickupLocation?.coordinates;
  const end = ride.dropLocation?.coordinates;
  if (!isPoint(home) || !isPoint(end)) return null;
  if (distanceMeters(home, end) < RETURN_TRIP.minTripMeters) return null;

  // Already back near where the trip started: nothing to offer.
  const here = driver.location?.coordinates;
  if (isPoint(here) && distanceMeters(here, home) <= RETURN_TRIP.arrivalRadiusMeters) return null;

  return {
    rideId: String(ride._id),
    homeCoordinates: home,
    homeLabel: String(ride.intercity?.fromCity || ride.pickupAddress || '').trim(),
    fromLabel: String(ride.intercity?.toCity || ride.dropAddress || '').trim(),
    completedAt: ride.updatedAt,
  };
};

export const serializeReturnTrip = (driver, offer = null) => {
  const trip = driver?.returnTrip || {};
  const active = isReturnTripActive(driver);
  const here = driver?.location?.coordinates;
  const home = trip.homeLocation?.coordinates;
  return {
    active,
    homeLabel: active ? trip.homeLabel || '' : '',
    fromLabel: active ? trip.fromLabel || '' : '',
    homeCoordinates: active ? home : null,
    activatedAt: active ? trip.activatedAt || null : null,
    expiresAt: active ? trip.expiresAt || null : null,
    distanceToHomeMeters: active && isPoint(here) && isPoint(home) ? Math.round(distanceMeters(here, home)) : null,
    offer: active ? null : offer,
    maxDurationHours: RETURN_TRIP.maxDurationHours,
  };
};

export const clearReturnTrip = () => ({
  'returnTrip.active': false,
  'returnTrip.expiresAt': null,
});

// ---- background check: end return trips that ran out or reached home ----
let timer = null;
let running = false;

const endFinishedReturnTrips = async () => {
  if (running) return;
  running = true;
  try {
    const drivers = await Driver.find({ 'returnTrip.active': true }).select('location returnTrip').limit(500).lean();
    const now = Date.now();
    for (const driver of drivers) {
      const home = driver.returnTrip?.homeLocation?.coordinates;
      const here = driver.location?.coordinates;
      const expired = !driver.returnTrip?.expiresAt || new Date(driver.returnTrip.expiresAt).getTime() <= now;
      const reachedHome = isPoint(home) && isPoint(here) && distanceMeters(here, home) <= RETURN_TRIP.arrivalRadiusMeters;
      if (!expired && !reachedHome && isPoint(home)) continue;

      await Driver.updateOne({ _id: driver._id }, { $set: clearReturnTrip() });
      emitToDriver(driver._id, 'returnTripEnded', {
        reason: reachedHome ? 'reached-home' : 'expired',
        message: reachedHome
          ? 'You are back home. Return Trip is off and you will get all rides again.'
          : 'Return Trip time is over. You will get all rides again.',
      });
    }
  } catch (error) {
    console.error('[returnTrip] check failed', error);
  } finally {
    running = false;
  }
};

export const startReturnTripJob = () => {
  if (timer) return;
  timer = setInterval(endFinishedReturnTrips, 60 * 1000);
  timer.unref?.();
  endFinishedReturnTrips();
};
