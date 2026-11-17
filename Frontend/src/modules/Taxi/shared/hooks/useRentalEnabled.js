import { RENTAL_ENABLED } from '../featureFlags';

/** Whether the Rental service is on. It is a code-level switch (see featureFlags.js), so this never changes at runtime. */
export default function useRentalEnabled() {
  return RENTAL_ENABLED;
}
