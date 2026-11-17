import { AdminBusinessSetting } from '../admin/models/AdminBusinessSetting.js';

// The admin can switch the whole Rental service on or off (Admin -> App Customization -> Customization ->
// "Enable Rental Service"). It is on unless it was explicitly switched off.
const CACHE_TTL_MS = 20 * 1000;
let cache = { value: true, at: 0 };

export const invalidateRentalSettingCache = () => {
  cache = { value: true, at: 0 };
};

export const isRentalEnabled = async () => {
  if (cache.at && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  let value = true;
  try {
    const doc = await AdminBusinessSetting.findOne({ scope: 'default' }, { customization: 1, _id: 0 }).lean();
    const raw = doc?.customization?.enable_rental;
    value = !(raw === '0' || raw === 0 || raw === false || raw === 'false');
  } catch {
    value = true;
  }
  cache = { value, at: Date.now() };
  return value;
};

/** Express middleware: rental endpoints answer "unavailable" while the Rental service is switched off. */
export const requireRentalEnabled = async (_req, res, next) => {
  if (await isRentalEnabled()) return next();
  return res.status(403).json({ success: false, message: 'Rental is currently unavailable' });
};
