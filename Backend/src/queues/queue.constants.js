/**
 * Centralized queue names for BullMQ.
 * Used by producers, workers, and queue initialization.
 */
export const OTP_QUEUE = 'otp';
export const NOTIFICATION_QUEUE = 'notification';

export const QUEUE_NAMES = Object.freeze([
    OTP_QUEUE,
    NOTIFICATION_QUEUE
]);
