import { Driver } from '../models/Driver.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { toPoint } from '../../../../utils/geo.js';
import {
  RETURN_TRIP,
  clearReturnTrip,
  findReturnTripOffer,
  isReturnTripActive,
  serializeReturnTrip,
} from '../../services/returnTripService.js';

const loadDriver = async (id) => {
  const driver = await Driver.findById(id).select('location returnTrip');
  if (!driver) throw new ApiError(404, 'Driver not found');
  return driver;
};

const respond = async (res, driver) => {
  const offer = isReturnTripActive(driver) ? null : await findReturnTripOffer(driver);
  res.json({ success: true, data: serializeReturnTrip(driver, offer) });
};

export const getReturnTrip = async (req, res) => {
  await respond(res, await loadDriver(req.auth.sub));
};

export const startReturnTrip = async (req, res) => {
  const driver = await loadDriver(req.auth.sub);
  const offer = await findReturnTripOffer(driver);
  if (!offer) {
    throw new ApiError(400, 'Return Trip is available only after you finish a one-way outstation ride away from home.');
  }

  const now = new Date();
  driver.returnTrip = {
    homeLocation: toPoint(offer.homeCoordinates, 'homeCoordinates'),
    homeLabel: offer.homeLabel,
    fromLabel: offer.fromLabel,
    fromRideId: offer.rideId,
    active: true,
    activatedAt: now,
    expiresAt: new Date(now.getTime() + RETURN_TRIP.maxDurationHours * 60 * 60 * 1000),
  };
  await driver.save();
  await respond(res, driver);
};

export const stopReturnTrip = async (req, res) => {
  await Driver.updateOne({ _id: req.auth.sub }, { $set: clearReturnTrip() });
  await respond(res, await loadDriver(req.auth.sub));
};
