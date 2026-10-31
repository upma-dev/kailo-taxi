// One set of live-tracking rules shared by the driver trip screen and the rider ride/parcel tracking screens,
// so both sides refresh the route and frame the map the same way.

// Directions API is re-queried at most this often (also when the driver strays further than the deviation).
export const ROUTE_REFRESH_INTERVAL_MS = 20000;
export const ROUTE_DEVIATION_METERS = 100;

// Rider-side fallback poll of the driver's last saved position when the socket is quiet.
export const LIVE_LOCATION_POLL_MS = 5000;

// Straight-line (haversine) distance, the same figure the driver app uses for "x m away from pickup".
export const getDistanceMeters = (from, to) => {
  if (!from || !to) return 0;
  const [fromLat, fromLng, toLat, toLng] = [from.lat, from.lng, to.lat, to.lng].map(Number);
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return 0;

  const rad = (value) => value * (Math.PI / 180);
  const a = Math.sin(rad(toLat - fromLat) / 2) ** 2
    + Math.cos(rad(fromLat)) * Math.cos(rad(toLat)) * Math.sin(rad(toLng - fromLng) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// One wording and rounding for rider and driver: "120 m" / "1.35 km".
export const formatDistanceAway = (meters) => {
  const distance = Number(meters);
  if (!Number.isFinite(distance) || distance <= 0) return '';
  return distance >= 1000 ? `${parseFloat((distance / 1000).toFixed(2))} km` : `${Math.round(distance)} m`;
};

// The bottom sheet covers roughly half of the screen: keep it out of the framed area.
export const getSheetHeightPx = () => {
  if (typeof window === 'undefined') return 400;
  return Math.round(Math.min(window.innerHeight * 0.52, 470));
};

const isValidPoint = (pt) => pt && Number.isFinite(Number(pt.lat)) && Number.isFinite(Number(pt.lng));

// Before pickup the pickup -> drop route and the "D" drop marker are hidden: that stage is only about the
// driver reaching the rider, so they would just clutter the map and pull the zoom out.
export const SHOW_TRIP_PREVIEW_BEFORE_PICKUP = false;

// What the map should show at each stage, identical for driver and rider: before pickup the driver and the
// rider's pickup pin; after pickup the driver and the drop.
export const getStageFramePoints = ({ tripStarted, driver, hasDriver, pickup, drop }) => (
  tripStarted
    ? [hasDriver ? driver : null, drop]
    : [hasDriver ? driver : null, pickup, ...(SHOW_TRIP_PREVIEW_BEFORE_PICKUP ? [drop] : [])]
).filter(Boolean);

// Small caption under the rider pin ("You" on the rider's phone, "User" on the driver's).
export const riderPinLabel = (text) => ({ text, color: '#065f46', fontSize: '11px', fontWeight: '800' });

// Fits the given points into the part of the map that is not hidden by the header or the bottom sheet.
// A single point (or points a few metres apart) keeps a street-level zoom instead of the maximum zoom.
export const frameMapToPoints = (map, points = [], { top = 110, side = 56 } = {}) => {
  const googleMaps = typeof window !== 'undefined' ? window.google?.maps : null;
  if (!map || !googleMaps) return false;

  const valid = points.filter(isValidPoint);
  if (!valid.length) return false;

  const bounds = new googleMaps.LatLngBounds();
  valid.forEach((pt) => bounds.extend(pt));
  map.fitBounds(bounds, { top, right: side, bottom: getSheetHeightPx() + 24, left: side });

  const spanMeters = valid.reduce((max, pt) => Math.max(max, getDistanceMeters(valid[0], pt)), 0);
  // Points metres apart would otherwise zoom in so far that normal GPS jitter looks like a big offset.
  const maxZoom = spanMeters < 60 ? 18 : 17;
  googleMaps.event.addListenerOnce(map, 'idle', () => {
    if ((map.getZoom() || 0) > maxZoom) map.setZoom(maxZoom);
  });
  return true;
};
