// ---- Rental ------------------------------------------------------------------------------------
// The Rental service (rental vehicles, quote requests, bookings, service-center panel, admin Rental menu) is
// switched on and off by the admin: Admin -> App Customization -> Customization -> "Enable Rental Service".
// The apps read that setting at start-up and call setRentalEnabled(); the last value is remembered in the
// browser so the next start does not flash the wrong state. `RENTAL_ENABLED` is a live binding: it always
// holds the current value wherever it is imported. Components that must re-render when it changes use the
// useRentalEnabled() hook.
const RENTAL_STORAGE_KEY = 'kailo_rental_enabled';

const readCachedRental = () => {
  try {
    const stored = localStorage.getItem(RENTAL_STORAGE_KEY);
    return stored === null ? null : stored === '1';
  } catch {
    return null;
  }
};

export let RENTAL_ENABLED = readCachedRental() ?? true;

const rentalListeners = new Set();

export const getRentalEnabled = () => RENTAL_ENABLED;

export const subscribeRentalEnabled = (listener) => {
  rentalListeners.add(listener);
  return () => rentalListeners.delete(listener);
};

export const setRentalEnabled = (next) => {
  const value = Boolean(next);
  try {
    localStorage.setItem(RENTAL_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // storage can be blocked; the value still applies for this session
  }
  if (value === RENTAL_ENABLED) return;
  RENTAL_ENABLED = value;
  rentalListeners.forEach((listener) => listener());
};

/** The value of the admin's "Enable Rental Service" setting (on unless it was switched off). */
export const isRentalSwitchedOn = (customization = {}) =>
  !['0', 0, false, 'false'].includes(customization?.enable_rental ?? '1');

/**
 * Master switch for the Taxi Car Pooling end-to-end product surface.
 * Code-level only (not admin-panel configurable).
 *
 * When false:
 * - Admin "Car Pooling" submenu is hidden
 * - User pooling routes / home grid entry are disabled
 * - Activity "Pooling" tab and reminder sync are disabled
 * - Driver onboarding cannot select pooling as a service category
 *
 * Flip to true to re-enable without hunting commented blocks.
 */
export const POOLING_ENABLED = true
