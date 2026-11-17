import { AdminAppSetting } from '../admin/models/AdminAppSetting.js';

// "Go Home" mode: at the end of the day a driver sets their home and, while the mode is on, they are
// only offered rides that move them towards home (strict filter).

const EARTH_RADIUS_METERS = 6371000;
const MIN_PROGRESS_METERS = 300;

export const GO_HOME_DEFAULTS = {
  enabled: true,
  coneAngleDegrees: 45,
  corridorWidthKm: 3,
  maxUsesPerDay: 2,
  maxDurationMinutes: 180,
  arrivalRadiusMeters: 300,
};

const toNumber = (value, fallback, { min = -Infinity, max = Infinity } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const isOff = (value) => value === false || value === 0 || value === '0' || value === 'false';

// Admin stores these as strings in AdminAppSetting.go_home_setting (see Admin -> Go Home Settings).
export const normalizeGoHomeConfig = (raw = {}) => ({
  enabled: raw.enabled === undefined ? GO_HOME_DEFAULTS.enabled : !isOff(raw.enabled),
  coneAngleDegrees: toNumber(raw.cone_angle_degrees, GO_HOME_DEFAULTS.coneAngleDegrees, { min: 10, max: 90 }),
  corridorWidthKm: toNumber(raw.corridor_width_km, GO_HOME_DEFAULTS.corridorWidthKm, { min: 0.5, max: 25 }),
  maxUsesPerDay: Math.round(toNumber(raw.max_uses_per_day, GO_HOME_DEFAULTS.maxUsesPerDay, { min: 1, max: 20 })),
  maxDurationMinutes: Math.round(toNumber(raw.max_duration_minutes, GO_HOME_DEFAULTS.maxDurationMinutes, { min: 15, max: 720 })),
  arrivalRadiusMeters: Math.round(toNumber(raw.arrival_radius_meters, GO_HOME_DEFAULTS.arrivalRadiusMeters, { min: 50, max: 2000 })),
});

let configCache = { value: null, at: 0 };
const CONFIG_TTL_MS = 30 * 1000;

export const invalidateGoHomeConfigCache = () => {
  configCache = { value: null, at: 0 };
};

export const getGoHomeConfig = async () => {
  if (configCache.value && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache.value;
  let raw = {};
  try {
    const doc = await AdminAppSetting.findOne({ scope: 'default' }, { go_home_setting: 1, _id: 0 }).lean();
    raw = doc?.go_home_setting || {};
  } catch {
    raw = {};
  }
  const value = normalizeGoHomeConfig(raw);
  configCache = { value, at: Date.now() };
  return value;
};

// ---- geometry (coordinates are GeoJSON [lng, lat]) ----
const toRad = (deg) => (deg * Math.PI) / 180;

export const distanceMeters = (a, b) => {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const bearingRad = (from, to) => {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return Math.atan2(y, x);
};

// Smallest angle between two bearings, in degrees (0-180).
const angleBetweenDegrees = (bearingA, bearingB) => {
  let diff = Math.abs(bearingA - bearingB) % (2 * Math.PI);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return (diff * 180) / Math.PI;
};

// Distance of `point` from the straight line start -> end.
const crossTrackMeters = (start, end, point) => {
  const d13 = distanceMeters(start, point) / EARTH_RADIUS_METERS;
  const value = Math.sin(d13) * Math.sin(bearingRad(start, point) - bearingRad(start, end));
  return Math.abs(Math.asin(Math.max(-1, Math.min(1, value))) * EARTH_RADIUS_METERS);
};

const isPoint = (value) =>
  Array.isArray(value) && value.length === 2 && value.every((item) => Number.isFinite(Number(item)));

/**
 * Is this ride "on the way home" for the driver?
 *  1. the drop is clearly closer to home than the pickup (real progress),
 *  2. the pickup -> drop direction is within the cone angle of the pickup -> home direction,
 *  3. pickup and drop both stay inside the corridor around the straight line driver -> home.
 */
export const evaluateRideAlongHome = ({ driverCoords, homeCoords, pickupCoords, dropCoords }, config) => {
  if (![driverCoords, homeCoords, pickupCoords, dropCoords].every(isPoint)) {
    return { ok: false, reason: 'missing_coordinates' };
  }

  const pickupToHome = distanceMeters(pickupCoords, homeCoords);
  const dropToHome = distanceMeters(dropCoords, homeCoords);
  if (dropToHome > pickupToHome - MIN_PROGRESS_METERS) return { ok: false, reason: 'no_progress' };

  const angle = angleBetweenDegrees(bearingRad(pickupCoords, dropCoords), bearingRad(pickupCoords, homeCoords));
  if (angle > config.coneAngleDegrees) return { ok: false, reason: 'outside_cone', angle };

  const corridorMeters = config.corridorWidthKm * 1000;
  const pickupOffset = crossTrackMeters(driverCoords, homeCoords, pickupCoords);
  const dropOffset = crossTrackMeters(driverCoords, homeCoords, dropCoords);
  if (pickupOffset > corridorMeters || dropOffset > corridorMeters) {
    return { ok: false, reason: 'outside_corridor', pickupOffset, dropOffset };
  }

  const directMeters = distanceMeters(driverCoords, homeCoords);
  const viaRideMeters = distanceMeters(driverCoords, pickupCoords) + distanceMeters(pickupCoords, dropCoords) + dropToHome;
  return { ok: true, angle, detourMeters: Math.max(0, Math.round(viaRideMeters - directMeters)) };
};

// ---- driver state helpers ----
export const todayKey = () => new Date().toISOString().slice(0, 10);

export const isGoHomeActive = (driver, now = Date.now()) => {
  const goHome = driver?.goHome;
  if (!goHome?.active) return false;
  if (goHome.expiresAt && new Date(goHome.expiresAt).getTime() <= now) return false;
  return isPoint(goHome.homeLocation?.coordinates);
};

export const usesToday = (goHome = {}) => (goHome.usesDate === todayKey() ? Number(goHome.usesToday || 0) : 0);

export const serializeGoHome = (driver, config) => {
  const goHome = driver?.goHome || {};
  const homeCoords = goHome.homeLocation?.coordinates;
  const hasHome = isPoint(homeCoords);
  const active = config.enabled && isGoHomeActive(driver);
  const driverCoords = driver?.location?.coordinates;
  const used = usesToday(goHome);

  return {
    featureEnabled: config.enabled,
    hasHome,
    homeCoordinates: hasHome ? homeCoords : null,
    label: String(goHome.label || ''),
    active,
    activatedAt: active ? goHome.activatedAt || null : null,
    expiresAt: active ? goHome.expiresAt || null : null,
    usesToday: used,
    maxUsesPerDay: config.maxUsesPerDay,
    remainingUses: Math.max(0, config.maxUsesPerDay - used),
    distanceToHomeMeters: hasHome && isPoint(driverCoords) ? Math.round(distanceMeters(driverCoords, homeCoords)) : null,
    coneAngleDegrees: config.coneAngleDegrees,
    corridorWidthKm: config.corridorWidthKm,
    maxDurationMinutes: config.maxDurationMinutes,
    arrivalRadiusMeters: config.arrivalRadiusMeters,
  };
};

/**
 * Strict filter used by dispatch: drivers in Go Home mode only keep rides that are on their way home.
 * Drivers not in Go Home mode are untouched.
 */
export const applyGoHomeFilter = (drivers = [], { pickupCoords, dropCoords }, config) => {
  if (!config.enabled) return drivers;
  return drivers.filter((driver) => {
    if (!isGoHomeActive(driver)) return true;
    return evaluateRideAlongHome(
      {
        driverCoords: driver.location?.coordinates,
        homeCoords: driver.goHome.homeLocation.coordinates,
        pickupCoords,
        dropCoords,
      },
      config,
    ).ok;
  });
};
