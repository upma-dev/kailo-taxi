import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';
import { AdminBusinessSetting } from '../admin/models/AdminBusinessSetting.js';
import { SubscriptionPlan } from '../admin/models/SubscriptionPlan.js';
import { Driver } from '../driver/models/Driver.js';
import { DriverSubscription } from '../driver/models/DriverSubscription.js';
import { WalletTransaction } from '../driver/models/WalletTransaction.js';

// Driver subscriptions, driven by the admin's mode (Admin -> Drivers -> Subscription):
// - commissionOnly:   no subscriptions; every ride pays the admin commission.
// - subscriptionOnly: a driver needs an active plan to go online and get rides; no commission on rides.
// - both:             plans are optional; a driver with an active plan pays no commission, others pay commission.

const MODES = ['commissionOnly', 'subscriptionOnly', 'both'];
const DAY_MS = 24 * 60 * 60 * 1000;
let modeCache = { value: 'commissionOnly', at: 0 };

export const getDriverSubscriptionMode = async () => {
  if (Date.now() - modeCache.at < 15000) return modeCache.value;
  const setting = await AdminBusinessSetting.findOne({ scope: 'default' }).select('subscription').lean();
  const mode = MODES.includes(setting?.subscription?.mode) ? setting.subscription.mode : 'commissionOnly';
  modeCache = { value: mode, at: Date.now() };
  return mode;
};

export const clearDriverSubscriptionModeCache = () => {
  modeCache = { value: 'commissionOnly', at: 0 };
};

const markExpired = (filter = {}) =>
  DriverSubscription.updateMany({ ...filter, status: 'active', expiresAt: { $lte: new Date() } }, { $set: { status: 'expired' } });

/** The plan that is running right now (bought plans that start later are not "active" yet). */
export const findActiveDriverSubscription = async (driverId) => {
  if (!driverId) return null;
  await markExpired({ driverId });
  const now = new Date();
  return DriverSubscription.findOne({ driverId, status: 'active', startsAt: { $lte: now }, expiresAt: { $gt: now } })
    .sort({ expiresAt: -1 })
    .lean();
};

/** Ids (strings) of the given drivers that have a running plan. */
export const filterDriversWithActiveSubscription = async (driverIds = []) => {
  const ids = driverIds.map(String).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) return new Set();
  const now = new Date();
  const rows = await DriverSubscription.find({
    driverId: { $in: ids },
    status: 'active',
    startsAt: { $lte: now },
    expiresAt: { $gt: now },
  }).distinct('driverId');
  return new Set(rows.map(String));
};

/** Whether this driver's ride commission is waived because of the mode and an active plan. */
export const isCommissionWaivedForDriver = async (driverId) => {
  const mode = await getDriverSubscriptionMode();
  if (mode === 'commissionOnly') return false;
  return Boolean(await findActiveDriverSubscription(driverId));
};

const serializePlan = (plan) => ({
  id: String(plan._id),
  name: plan.name || '',
  description: plan.description || '',
  how_it_works: plan.how_it_works || '',
  amount: Number(plan.amount || 0),
  duration: Number(plan.duration || 0),
  transport_type: plan.transport_type || '',
  vehicle_type: plan.vehicle_type_id?.name ? { id: String(plan.vehicle_type_id._id), name: plan.vehicle_type_id.name } : null,
});

const serializeSubscription = (item) => {
  const now = Date.now();
  const startsAt = item.startsAt ? new Date(item.startsAt).getTime() : 0;
  const expiresAt = item.expiresAt ? new Date(item.expiresAt).getTime() : 0;
  const running = item.status === 'active' && startsAt <= now && expiresAt > now;
  return {
    id: String(item._id),
    name: item.name || '',
    amount: Number(item.amount || 0),
    durationDays: Number(item.durationDays || 0),
    status: running ? 'active' : item.status === 'active' && startsAt > now ? 'upcoming' : item.status,
    purchasedAt: item.purchasedAt || item.createdAt || null,
    startsAt: item.startsAt || null,
    expiresAt: item.expiresAt || null,
    daysLeft: running ? Math.max(1, Math.ceil((expiresAt - now) / DAY_MS)) : 0,
    purchaseSource: item.purchaseSource || 'wallet',
  };
};

const plansForDriver = async (driver) => {
  const query = { audience: 'driver', active: true };
  if (driver?.vehicleTypeId) {
    query.$or = [{ vehicle_type_id: null }, { vehicle_type_id: { $exists: false } }, { vehicle_type_id: driver.vehicleTypeId }];
  } else {
    query.$or = [{ vehicle_type_id: null }, { vehicle_type_id: { $exists: false } }];
  }
  return SubscriptionPlan.find(query).sort({ amount: 1 }).populate('vehicle_type_id', 'name').lean();
};

/** Everything the driver app's Subscription page needs. */
export const getDriverSubscriptionOverview = async (driverId) => {
  const driver = await Driver.findById(driverId).select('vehicleTypeId wallet').lean();
  if (!driver) throw new ApiError(404, 'Driver not found');
  await markExpired({ driverId });
  const [mode, plans, history] = await Promise.all([
    getDriverSubscriptionMode(),
    plansForDriver(driver),
    DriverSubscription.find({ driverId }).sort({ expiresAt: -1 }).limit(30).lean(),
  ]);
  const items = history.map(serializeSubscription);
  return {
    mode,
    required: mode === 'subscriptionOnly',
    walletBalance: Number(driver.wallet?.balance || 0),
    active: items.find((item) => item.status === 'active') || null,
    upcoming: items.filter((item) => item.status === 'upcoming'),
    plans: mode === 'commissionOnly' ? [] : plans.map(serializePlan),
    history: items,
  };
};

/** Buy a plan from the driver wallet. A plan bought while another runs starts when that one ends. */
export const purchaseDriverSubscription = async ({ driverId, planId }) => {
  const mode = await getDriverSubscriptionMode();
  if (mode === 'commissionOnly') {
    throw new ApiError(400, 'Subscriptions are not available right now');
  }
  if (!mongoose.Types.ObjectId.isValid(planId)) throw new ApiError(400, 'Valid plan id is required');

  const driver = await Driver.findById(driverId).select('vehicleTypeId wallet').lean();
  if (!driver) throw new ApiError(404, 'Driver not found');

  const plan = await SubscriptionPlan.findOne({ _id: planId, audience: 'driver', active: true }).lean();
  if (!plan) throw new ApiError(404, 'This plan is not available');
  if (plan.vehicle_type_id && String(plan.vehicle_type_id) !== String(driver.vehicleTypeId || '')) {
    throw new ApiError(400, 'This plan is for a different vehicle type');
  }

  const amount = Math.round(Number(plan.amount || 0) * 100) / 100;
  const durationDays = Math.max(1, Number(plan.duration || 0));
  if (amount <= 0) throw new ApiError(400, 'This plan has no price set');

  // Take the money only if it is there, in one step (two quick taps can not both pass).
  const updated = await Driver.findOneAndUpdate(
    { _id: driverId, 'wallet.balance': { $gte: amount } },
    { $inc: { 'wallet.balance': -amount } },
    { returnDocument: 'after' },
  ).select('wallet').lean();
  if (!updated) {
    throw new ApiError(400, `Not enough wallet balance. Add ₹${amount} or more to your wallet to buy this plan.`);
  }

  const balanceAfter = Number(updated.wallet?.balance || 0);
  const transaction = await WalletTransaction.create({
    driverId,
    type: 'adjustment',
    amount: -amount,
    balanceBefore: Math.round((balanceAfter + amount) * 100) / 100,
    balanceAfter,
    cashLimit: Number(updated.wallet?.cashLimit || 0),
    isBlockedAfter: Boolean(updated.wallet?.isBlocked),
    description: `Subscription purchase: ${plan.name || 'Plan'}`,
    metadata: { category: 'driver_subscription', planId: String(plan._id) },
  });

  await markExpired({ driverId });
  const latest = await DriverSubscription.findOne({ driverId, status: 'active', expiresAt: { $gt: new Date() } })
    .sort({ expiresAt: -1 })
    .lean();
  const startsAt = latest ? new Date(latest.expiresAt) : new Date();
  const subscription = await DriverSubscription.create({
    driverId,
    planId: plan._id,
    name: plan.name || '',
    description: plan.description || '',
    amount,
    durationDays,
    transport_type: plan.transport_type || '',
    vehicle_type_id: plan.vehicle_type_id || null,
    status: 'active',
    purchaseSource: 'wallet',
    purchasedAt: new Date(),
    startsAt,
    expiresAt: new Date(startsAt.getTime() + durationDays * DAY_MS),
    walletTransactionId: transaction._id,
  });

  return {
    subscription: serializeSubscription(subscription.toObject()),
    walletBalance: balanceAfter,
  };
};

/** Admin: a driver's plan history. */
export const listDriverSubscriptionsForAdmin = async (driverId) => {
  await markExpired({ driverId });
  const [mode, items] = await Promise.all([
    getDriverSubscriptionMode(),
    DriverSubscription.find({ driverId }).sort({ expiresAt: -1 }).lean(),
  ]);
  const results = items.map(serializeSubscription);
  return { mode, active: results.find((item) => item.status === 'active') || null, results };
};
