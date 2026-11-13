import mongoose from 'mongoose';
import { ApiError } from '../../../../utils/ApiError.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { UserSubscription } from '../../user/models/UserSubscription.js';
import { DriverSubscription } from '../../driver/models/DriverSubscription.js';
import {
  getDriverSubscriptionOverview,
  listDriverSubscriptionsForAdmin,
  purchaseDriverSubscription,
} from '../../services/driverSubscriptionService.js';

// ---------------- admin: edit / switch off / delete a plan (user and driver plans)

const EDITABLE = ['name', 'description', 'how_it_works', 'amount', 'duration', 'active', 'ride_limit', 'benefit_type'];

export const adminUpdateSubscriptionPlan = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, 'Invalid plan id');
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found');

  const body = req.body || {};
  const update = {};
  EDITABLE.forEach((key) => {
    if (body[key] !== undefined) update[key] = body[key];
  });
  if (update.name !== undefined && !String(update.name).trim()) throw new ApiError(400, 'Plan name is required');
  if (update.amount !== undefined) {
    update.amount = Number(update.amount);
    if (!Number.isFinite(update.amount) || update.amount <= 0) throw new ApiError(400, 'Price must be more than 0');
  }
  if (update.duration !== undefined) {
    update.duration = Math.round(Number(update.duration));
    if (!Number.isFinite(update.duration) || update.duration < 1) throw new ApiError(400, 'Duration must be at least 1 day');
  }
  if (update.active !== undefined) update.active = Boolean(update.active);
  // Ride limits only apply to rider plans; driver plans are time based.
  if (plan.audience === 'user') {
    if (update.benefit_type !== undefined) {
      update.benefit_type = String(update.benefit_type).toLowerCase() === 'unlimited' ? 'unlimited' : 'limited';
    }
    const benefit = update.benefit_type || plan.benefit_type;
    if (benefit === 'unlimited') update.ride_limit = 0;
    else if (update.ride_limit !== undefined) update.ride_limit = Math.max(1, Math.round(Number(update.ride_limit) || 0));
  } else {
    delete update.benefit_type;
    delete update.ride_limit;
  }

  Object.assign(plan, update);
  await plan.save();
  // People who already bought the plan keep what they paid for; changes apply to new purchases.
  res.json({ success: true, data: plan.toObject() });
};

export const adminDeleteSubscriptionPlan = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, 'Invalid plan id');
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found');

  const Model = plan.audience === 'user' ? UserSubscription : DriverSubscription;
  const bought = await Model.countDocuments({ planId: plan._id });
  if (bought > 0) {
    // Keep the record for the people who bought it; just stop selling it.
    plan.active = false;
    await plan.save();
    return res.json({
      success: true,
      data: { deleted: false, deactivated: true, message: `${bought} purchase(s) use this plan, so it was switched off instead of deleted.` },
    });
  }
  await plan.deleteOne();
  return res.json({ success: true, data: { deleted: true } });
};

export const adminGetDriverSubscriptions = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, 'Invalid driver id');
  res.json({ success: true, data: await listDriverSubscriptionsForAdmin(req.params.id) });
};

// ---------------- driver app

export const driverGetSubscriptions = async (req, res) => {
  res.json({ success: true, data: await getDriverSubscriptionOverview(req.auth.sub) });
};

export const driverBuySubscription = async (req, res) => {
  res.json({ success: true, data: await purchaseDriverSubscription({ driverId: req.auth.sub, planId: req.body?.planId }) });
};
