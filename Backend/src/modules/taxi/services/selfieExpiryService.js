import { Driver } from '../driver/models/Driver.js';
import { buildDriverTodaySummaryFromDocument, mergeOnlineSessionIntoTracking } from '../driver/services/driverTodaySummaryService.js';
import { emitToDriver } from './dispatchService.js';

// A driver's online selfie counts for one hour. Once it runs out, a driver who is not on a ride is taken
// offline and asked for a new selfie. A driver on a ride is checked again right after the ride ends.
const CHECK_EVERY_MS = 60 * 1000;
let timer = null;
let running = false;

const expireOnlineSelfies = async () => {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const drivers = await Driver.find({
      isOnline: true,
      isOnRide: { $ne: true },
      $or: [
        { 'onlineSelfie.expiresAt': null },
        { 'onlineSelfie.expiresAt': { $exists: false } },
        { 'onlineSelfie.expiresAt': { $lte: now } },
      ],
    }).limit(500);

    for (const driver of drivers) {
      const tracking = mergeOnlineSessionIntoTracking(
        driver.incentiveTracking || {},
        driver.incentiveTracking?.currentOnlineStartedAt,
        now,
      );
      const result = await Driver.updateOne(
        { _id: driver._id, isOnline: true, isOnRide: { $ne: true } },
        {
          $set: {
            isOnline: false,
            incentiveTracking: { ...tracking, currentOnlineStartedAt: null },
            todaySummary: buildDriverTodaySummaryFromDocument(driver),
          },
        },
      );
      if (result.modifiedCount) {
        emitToDriver(driver._id, 'selfieRequired', {
          reason: 'selfie-expired',
          message: 'Your hourly selfie check is due. Take a selfie to go online again.',
        });
      }
    }
  } catch (error) {
    console.error('[selfieExpiry] check failed', error);
  } finally {
    running = false;
  }
};

export const startSelfieExpiryJob = () => {
  if (timer) return;
  timer = setInterval(expireOnlineSelfies, CHECK_EVERY_MS);
  timer.unref?.();
  expireOnlineSelfies();
};

export const stopSelfieExpiryJob = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
