// Saved addresses (Home / Work / landmarks) live in localStorage and are shared by the
// Addresses settings page and the ride location picker.
export const SAVED_ADDRESSES_KEY = 'kailo:savedAddresses';

export const readSavedAddresses = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_ADDRESSES_KEY) || 'null');
    if (parsed && typeof parsed === 'object') {
      // Older builds pre-filled a placeholder home address; never treat it as a real saved place.
      if (parsed.home?.address === 'Vijay Nagar, Indore' && !parsed.home.coords) parsed.home = { ...parsed.home, address: '' };
      return {
        home: parsed.home || null,
        work: parsed.work || null,
        landmarks: Array.isArray(parsed.landmarks) ? parsed.landmarks : [],
      };
    }
  } catch {
    // ignore
  }
  return { home: null, work: null, landmarks: [] };
};

const validCoords = (coords) =>
  Array.isArray(coords) && coords.length === 2 && coords.every((n) => Number.isFinite(Number(n)));

/** Flat list for the picker: [{ id, kind, label, address, coords|null }] (only entries that have an address). */
export const getSavedPlaces = () => {
  const { home, work, landmarks } = readSavedAddresses();
  const places = [];
  if (home?.address?.trim()) places.push({ id: 'home', kind: 'home', label: 'Home', address: home.address.trim(), coords: validCoords(home.coords) ? home.coords : null });
  if (work?.address?.trim()) places.push({ id: 'work', kind: 'work', label: 'Work', address: work.address.trim(), coords: validCoords(work.coords) ? work.coords : null });
  landmarks.forEach((l) => {
    if (l?.address?.trim()) {
      places.push({ id: l.id, kind: 'landmark', label: l.label || 'Saved place', address: l.address.trim(), coords: validCoords(l.coords) ? l.coords : null });
    }
  });
  return places;
};

/** Reverse-geocode the device's current position into { address, coords: [lng, lat] }. */
export const getCurrentAddress = () =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        let address = '';
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const json = await response.json();
          address = json?.display_name || '';
        } catch {
          // fall through to coordinates
        }
        resolve({ address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, coords: [lng, lat] });
      },
      (error) => {
        reject(new Error(error?.code === 1 ? 'Please allow location access to use your current location' : 'Unable to get your current location'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
