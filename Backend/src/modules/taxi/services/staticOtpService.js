// Fixed-OTP test accounts (Play Store review / QA). Only the numbers below get OTP 1234 and no SMS is sent.
// Every other number always gets a real SMS OTP in production.
//
// - Add or remove numbers here (or, without a code change, put extra numbers in .env as
//   STATIC_OTP_PHONE=9999999999,8888888888 ; they use STATIC_OTP_CODE or 1234).
// - USE_DEFAULT_OTP=true (every number gets the fixed OTP) works only outside production, for local testing.
//
// The driver app login is shared by drivers, fleet owners and bus drivers, so the "driver" list covers all three:
// the account with that phone number in the chosen role logs in with 1234.

export const STATIC_TEST_OTP = '1234';

const TEST_NUMBERS = {
  user: ['7610416911'],
  driver: ['9755633147', '7974161582', '9641119590', '7354126134', '6268423925'],
};

const last10 = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

const envNumbers = () =>
  String(process.env.STATIC_OTP_PHONE || '')
    .split(',')
    .map(last10)
    .filter((value) => value.length === 10);

const envCode = () => String(process.env.STATIC_OTP_CODE || '').trim() || STATIC_TEST_OTP;

/**
 * The fixed OTP for this phone, or null when a real OTP must be sent.
 * @param {'user'|'driver'} app  which app is logging in ('driver' also covers owners and bus drivers)
 */
export const resolveStaticOtp = (app, phone) => {
  const number = last10(phone);
  if (!number) return null;

  if ((TEST_NUMBERS[app] || []).includes(number)) return STATIC_TEST_OTP;
  if (envNumbers().includes(number)) return envCode();

  // USE_DEFAULT_OTP=true: every number gets the fixed OTP (also in production, on explicit request).
  if (isTruthy(process.env.USE_DEFAULT_OTP)) return envCode();

  return null;
};
