import { useSyncExternalStore } from 'react';
import { getRentalEnabled, subscribeRentalEnabled } from '../featureFlags';

/** Whether the Rental service is on. Re-renders the component when the admin's setting changes. */
export default function useRentalEnabled() {
  return useSyncExternalStore(subscribeRentalEnabled, getRentalEnabled, getRentalEnabled);
}
