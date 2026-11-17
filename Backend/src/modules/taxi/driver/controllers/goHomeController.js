import { Driver } from '../models/Driver.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { normalizePoint, toPoint } from '../../../../utils/geo.js';
import {
  distanceMeters,
  getGoHomeConfig,
  isGoHomeActive,
  serializeGoHome,
  todayKey,
  usesToday,
} from '../../services/goHomeService.js';

const loadDriver = async (id) => {
  const driver = await Driver.findById(id).select('isOnline isOnRide location goHome');
  if (!driver) throw new ApiError(404, 'Driver not found');
  return driver;
};

const respond = async (res, driver, extra = {}) => {
  const config = await getGoHomeConfig();
  res.json({ success: true, data: { ...serializeGoHome(driver, config), ...extra } });
};

export const getGoHome = async (req, res) => {
  await respond(res, await loadDriver(req.auth.sub));
};

export const saveGoHomeLocation = async (req, res) => {
  const driver = await loadDriver(req.auth.sub);
  const coordinates = normalizePoint(
    req.body?.coordinates || (Number.isFinite(Number(req.body?.lng)) && Number.isFinite(Number(req.body?.lat)) ? [Number(req.body.lng), Number(req.body.lat)] : null),
    'coordinates',
  );

  // Changing home while the mode is on would silently change who gets which ride, so stop it first.
  driver.goHome = {
    ...(driver.goHome?.toObject?.() || driver.goHome || {}),
    homeLocation: toPoint(coordinates, 'coordinates'),
    label: String(req.body?.label || '').trim().slice(0, 120),
    active: false,
    activatedAt: null,
    expiresAt: null,
  };
  await driver.save();
  await respond(res, driver);
};

export const startGoHome = async (req, res) => {
  const config = await getGoHomeConfig();
  if (!config.enabled) throw new ApiError(403, 'Go Home is currently turned off');

  const driver = await loadDriver(req.auth.sub);
  const goHome = driver.goHome || {};
  const homeCoords = goHome.homeLocation?.coordinates;
  if (!Array.isArray(homeCoords) || homeCoords.length !== 2) throw new ApiError(400, 'Set your home location first');
  if (!driver.isOnline) throw new ApiError(400, 'Go online first to start Go Home');

  if (isGoHomeActive(driver)) return respond(res, driver);

  const used = usesToday(goHome);
  if (used >= config.maxUsesPerDay) {
    throw new ApiError(429, `You can use Go Home ${config.maxUsesPerDay} time(s) a day. Try again tomorrow.`);
  }

  const driverCoords = driver.location?.coordinates;
  if (Array.isArray(driverCoords) && distanceMeters(driverCoords, homeCoords) <= config.arrivalRadiusMeters) {
    throw new ApiError(400, 'You are already at your home location');
  }

  const now = new Date();
  driver.goHome.active = true;
  driver.goHome.activatedAt = now;
  driver.goHome.expiresAt = new Date(now.getTime() + config.maxDurationMinutes * 60 * 1000);
  driver.goHome.usesDate = todayKey();
  driver.goHome.usesToday = used + 1;
  await driver.save();
  await respond(res, driver);
};

export const stopGoHome = async (req, res) => {
  const driver = await loadDriver(req.auth.sub);
  if (driver.goHome?.active) {
    driver.goHome.active = false;
    driver.goHome.expiresAt = null;
    await driver.save();
  }
  await respond(res, driver);
};

/**
 * Called on every driver location ping. Switches the mode off once the driver reaches home or the
 * time limit runs out. Returns the reason ('arrived' | 'expired') or null.
 */
export const settleGoHomeOnLocation = async (driver) => {
  const goHome = driver?.goHome;
  if (!goHome?.active) return null;

  const config = await getGoHomeConfig();
  const homeCoords = goHome.homeLocation?.coordinates;
  const driverCoords = driver.location?.coordinates;
  let reason = null;

  if (!config.enabled) reason = 'disabled';
  else if (goHome.expiresAt && new Date(goHome.expiresAt).getTime() <= Date.now()) reason = 'expired';
  else if (
    Array.isArray(homeCoords) && homeCoords.length === 2 && Array.isArray(driverCoords) && driverCoords.length === 2 &&
    distanceMeters(driverCoords, homeCoords) <= config.arrivalRadiusMeters
  ) reason = 'arrived';

  if (!reason) return null;

  await Driver.updateOne({ _id: driver._id }, { $set: { 'goHome.active': false, 'goHome.expiresAt': null } });
  return reason === 'disabled' ? 'expired' : reason;
};
