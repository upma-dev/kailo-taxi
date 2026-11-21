import mongoose from 'mongoose';
import { Ride } from '../user/models/Ride.js';
import { User } from '../user/models/User.js';
import { UserWallet } from '../user/models/UserWallet.js';
import { Driver } from '../driver/models/Driver.js';
import { WalletTransaction } from '../driver/models/WalletTransaction.js';
import { applyDriverWalletAdjustment } from '../driver/services/walletService.js';
import { resolveSetPriceForRide } from './rideService.js';
import { releasePromoForCancelledRide } from './promoService.js';
import { AdminBusinessSetting } from '../admin/models/AdminBusinessSetting.js';
import { SetPrice } from '../admin/models/SetPrice.js';
import { Vehicle } from '../admin/models/Vehicle.js';
import { Zone } from '../driver/models/Zone.js';
import { BusService } from '../admin/models/BusService.js';
import { createDefaultBusinessSettings } from '../admin/data/defaultBusinessSettings.js';

const roundMoney = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

const hasSetPricePolicy = (setPrice) => Boolean(setPrice?.cancellation_policy && Object.keys(setPrice.cancellation_policy).length > 0);

const policyFromSetPrice = (setPrice) => {
  const userCancelFeeType = String(setPrice.user_cancellation_fee_type || '').trim().toLowerCase();
  const userCancelFee = Number(setPrice.user_cancellation_fee ?? 0);

  const fixedCharge = userCancelFeeType === 'percentage'
    ? 0
    : userCancelFeeType === 'fixed'
    ? userCancelFee
    : Number(setPrice.cancellation_policy.fixed_cancellation_charge ?? 50);

  const percentageCharge = userCancelFeeType === 'percentage'
    ? userCancelFee
    : 0;

  return {
    // Admin's "Fee Goes to" choice on the price rule: 'driver' means the rider's cancellation fee is paid out to the driver.
    fee_goes_to: String(setPrice.cancellation_fee_goes_to || 'admin').trim().toLowerCase(),
    enable_cancellation_charge: setPrice.cancellation_policy.enable_cancellation_charge ?? true,
    free_cancellation_time_mins: Number(setPrice.cancellation_policy.free_cancellation_time_mins ?? 2),
    fixed_cancellation_charge: fixedCharge,
    percentage_cancellation_charge: percentageCharge,
    max_cancellation_fee: Number(setPrice.cancellation_policy.max_cancellation_fee ?? 150),
    charge_after_driver_accepted: setPrice.cancellation_policy.charge_after_driver_accepted ?? true,
    charge_after_driver_arrived: setPrice.cancellation_policy.charge_after_driver_arrived ?? true,
    driver_cancellation_penalty: Number(setPrice.cancellation_policy.driver_cancellation_penalty ?? 30),
    driver_compensation_percentage: Number(setPrice.cancellation_policy.driver_compensation_percentage ?? 0),
    cancellation_grace_period_driver_arrived: Number(setPrice.cancellation_policy.cancellation_grace_period_driver_arrived ?? 5),
  };
};

const policyFromBusinessSettings = (bizSetting) => {
  const defaultPolicy = createDefaultBusinessSettings().transport_ride.cancellation_policy;
  const policyFromBiz = bizSetting?.transport_ride?.cancellation_policy || defaultPolicy;

  return {
    fee_goes_to: String(policyFromBiz.fee_goes_to || 'admin').trim().toLowerCase(),
    enable_cancellation_charge: Boolean(policyFromBiz.enable_cancellation_charge ?? true),
    free_cancellation_time_mins: Number(policyFromBiz.free_cancellation_time_mins ?? 2),
    fixed_cancellation_charge: Number(policyFromBiz.fixed_cancellation_charge ?? 50),
    percentage_cancellation_charge: Number(policyFromBiz.percentage_cancellation_charge ?? 0),
    max_cancellation_fee: Number(policyFromBiz.max_cancellation_fee ?? 150),
    charge_after_driver_accepted: Boolean(policyFromBiz.charge_after_driver_accepted ?? true),
    charge_after_driver_arrived: Boolean(policyFromBiz.charge_after_driver_arrived ?? true),
    driver_cancellation_penalty: Number(policyFromBiz.driver_cancellation_penalty ?? 30),
    driver_compensation_percentage: Number(policyFromBiz.driver_compensation_percentage ?? 0),
    cancellation_grace_period_driver_arrived: Number(policyFromBiz.cancellation_grace_period_driver_arrived ?? 5),
  };
};

/**
 * Public view of the cancellation rules for the website: the default rule from Business Settings plus one entry per
 * vehicle that has its own rule on a price (Set Price). Uses the same mapping as real cancellations, so the page
 * always shows the numbers riders are actually charged.
 */
export const getPublicCancellationPolicy = async () => {
  const [bizSetting, rows, busRows] = await Promise.all([
    AdminBusinessSetting.findOne({ scope: 'default' }).select('customization transport_ride').lean(),
    SetPrice.find({
      active: 1,
      status: 'active',
      transport_type: { $in: ['taxi', 'both'] },
      vehicle_type: { $ne: null },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate({ path: 'vehicle_type', model: Vehicle, select: 'name status active' })
      .populate({ path: 'zone_id', model: Zone, select: 'name status active' })
      .lean(),
    BusService.find({ status: 'active' }).select('cancellationRules').lean().catch(() => []),
  ]);

  const defaultPolicy = policyFromBusinessSettings(bizSetting);
  const seen = new Set();
  const vehicles = [];
  const rules = [];
  const zoneMap = new Map();
  const ruleSeen = new Set();
  for (const row of rows) {
    const vehicle = row.vehicle_type;
    if (!vehicle?._id || !vehicle.name || vehicle.active === false || vehicle.status === 0) continue;
    const policy = hasSetPricePolicy(row) ? policyFromSetPrice(row) : defaultPolicy;
    const vehicleKey = String(vehicle._id);

    // Existing summary: one entry per vehicle (newest rule), kept for the old table.
    if (!seen.has(vehicleKey)) {
      seen.add(vehicleKey);
      vehicles.push({ id: vehicleKey, name: vehicle.name, policy });
    }

    // Per zone: one rule per vehicle and zone, newest first. Rows without a zone apply everywhere.
    const zone = row.zone_id && row.zone_id._id ? row.zone_id : null;
    if (zone && (zone.active === false || zone.status === 0)) continue;
    const zoneKey = zone ? String(zone._id) : '';
    const ruleKey = `${vehicleKey}|${zoneKey}`;
    if (ruleSeen.has(ruleKey)) continue;
    ruleSeen.add(ruleKey);
    if (zone && !zoneMap.has(zoneKey)) zoneMap.set(zoneKey, { id: zoneKey, name: zone.name || 'Zone' });
    rules.push({ vehicle_id: vehicleKey, vehicle_name: vehicle.name, zone_id: zoneKey || null, policy });
  }
  vehicles.sort((a, b) => a.name.localeCompare(b.name));
  const zones = [...zoneMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  // Refund rules admins set on bus tickets, listed once per distinct rule.
  const busRefunds = [];
  const busSeen = new Set();
  for (const bus of busRows || []) {
    for (const r of bus.cancellationRules || []) {
      const key = [r.hoursBeforeDeparture, r.refundType, r.refundValue].join('|');
      if (busSeen.has(key)) continue;
      busSeen.add(key);
      busRefunds.push({
        label: r.label || '',
        hours_before_departure: Number(r.hoursBeforeDeparture || 0),
        refund_type: r.refundType || 'percentage',
        refund_value: Number(r.refundValue || 0),
        notes: r.notes || '',
      });
    }
  }
  busRefunds.sort((a, b) => b.hours_before_departure - a.hours_before_departure);

  return {
    currency_symbol: bizSetting?.customization?.currency_symbol || '₹',
    default_policy: defaultPolicy,
    vehicles,
    zones,
    rules,
    bus_refunds: busRefunds,
  };
};

export const getCancellationPolicy = async (ride) => {
  let setPrice = null;
  if (ride?.vehicleTypeId) {
    try {
      const serviceType = String(ride?.serviceType || '').trim().toLowerCase();
      const transportType = serviceType === 'parcel' ? 'delivery' : serviceType === 'intercity' ? 'intercity' : 'taxi';
      setPrice = await resolveSetPriceForRide({
        serviceLocationId: ride.service_location_id || null,
        transportType,
        vehicleTypeId: ride.vehicleTypeId,
      });
    } catch (err) {
      console.warn('Failed to resolve SetPrice for cancellation policy:', err?.message);
    }
  }

  if (hasSetPricePolicy(setPrice)) return policyFromSetPrice(setPrice);

  return policyFromBusinessSettings(await AdminBusinessSetting.findOne({ scope: 'default' }).lean());
};

export const calculateCancellationBill = async ({ ride, cancelledBy = 'user', reason = '' }) => {
  const policy = await getCancellationPolicy(ride);
  const now = new Date();

  const bookingTime = ride.createdAt ? new Date(ride.createdAt) : now;
  const timeSinceBookingMins = Math.max(0, Math.round((now.getTime() - bookingTime.getTime()) / 60000));

  const timeSinceAcceptanceMins = ride.acceptedAt
    ? Math.max(0, Math.round((now.getTime() - new Date(ride.acceptedAt).getTime()) / 60000))
    : 0;

  const timeSinceArrivalMins = ride.arrivedAt
    ? Math.max(0, Math.round((now.getTime() - new Date(ride.arrivedAt).getTime()) / 60000))
    : 0;

  let stage = 'searching';
  if (ride.startedAt) {
    stage = 'started';
  } else if (ride.arrivedAt) {
    stage = 'arrived';
  } else if (ride.acceptedAt || ride.driverId) {
    stage = 'accepted';
  }

  let cancellationFee = 0;
  let isWaived = false;
  let feeWaivedReason = '';
  let driverCompensation = 0;
  let driverPenalty = 0;
  let paymentStatus = 'not_applicable';

  // Percentage fee is charged on the ride's own fare, never on dues carried over from earlier cancellations.
  const previousCancellationFee = Math.max(0, Number(ride.previousCancellationFee || 0));
  const estimatedFare = Number(ride.baseRideFare)
    || Math.max(0, Number(ride.fare || ride.baseFare || 0) - previousCancellationFee);

  // Share of the rider's fee paid to the driver. "Fee Goes to: Driver" pays all of it unless the admin has
  // set an explicit Driver Compensation % (then that % applies).
  const driverSharePercent = Math.min(100, Math.max(0,
    policy.fee_goes_to === 'driver' && !(policy.driver_compensation_percentage > 0)
      ? 100
      : policy.driver_compensation_percentage));

  if (!policy.enable_cancellation_charge) {
    isWaived = true;
    feeWaivedReason = 'Cancellation charges disabled by policy';
  } else if (cancelledBy === 'user') {
    if (stage === 'searching' || timeSinceBookingMins <= policy.free_cancellation_time_mins) {
      isWaived = true;
      feeWaivedReason = stage === 'searching'
        ? 'Cancelled while searching for driver'
        : `Cancelled within free time limit (${policy.free_cancellation_time_mins} mins)`;
    } else if (
      (stage === 'accepted' && policy.charge_after_driver_accepted) ||
      (stage === 'arrived' && policy.charge_after_driver_arrived) ||
      stage === 'started'
    ) {
      const calculatedBase = policy.fixed_cancellation_charge + (estimatedFare * policy.percentage_cancellation_charge / 100);
      cancellationFee = Math.min(Math.round(calculatedBase), policy.max_cancellation_fee);

      if (driverSharePercent > 0) {
        driverCompensation = Math.round((cancellationFee * driverSharePercent) / 100);
      }
      paymentStatus = 'added_to_next_ride_due';
    } else {
      isWaived = true;
      feeWaivedReason = 'No charge applicable for current stage';
    }
  } else if (cancelledBy === 'driver') {
    const isPassengerNoShow = String(reason).toLowerCase().includes('no-show') || String(reason).toLowerCase().includes('no show');

    if (isPassengerNoShow && timeSinceArrivalMins >= policy.cancellation_grace_period_driver_arrived) {
      const calculatedBase = policy.fixed_cancellation_charge + (estimatedFare * policy.percentage_cancellation_charge / 100);
      cancellationFee = Math.min(Math.round(calculatedBase), policy.max_cancellation_fee);
      if (driverSharePercent > 0) {
        driverCompensation = Math.round((cancellationFee * driverSharePercent) / 100);
      }
      driverPenalty = 0;
      paymentStatus = 'added_to_next_ride_due';
    } else {
      isWaived = true;
      feeWaivedReason = 'Driver cancelled booking';
      cancellationFee = 0;
      driverCompensation = 0;
      driverPenalty = policy.driver_cancellation_penalty;
    }
  } else {
    isWaived = true;
    feeWaivedReason = `Cancelled by ${cancelledBy}`;
  }

  const taxAmount = 0;
  const totalAmount = Math.round(cancellationFee);

  return {
    rideId: String(ride._id),
    cancelledBy,
    cancelledAt: now.toISOString(),
    cancellationStage: stage,
    cancellationReason: reason || '',
    billBreakdown: {
      baseFare: 0,
      freeCancellationLimitMins: policy.free_cancellation_time_mins,
      elapsedMinutes: stage === 'arrived' ? timeSinceArrivalMins : stage === 'accepted' ? timeSinceAcceptanceMins : timeSinceBookingMins,
      cancellationFee,
      taxAmount,
      totalAmount,
      isWaived,
      feeWaivedReason,
    },
    driverBreakdown: {
      driverPayout: driverCompensation,
      driverPenalty,
      netWalletChange: Math.round(driverCompensation - driverPenalty),
    },
    paymentDetails: {
      status: paymentStatus,
      note: cancellationFee > 0
        ? 'This amount will be added to your next ride fare.'
        : 'No fee charged for this cancellation.',
    },
    currency: '₹',
  };
};

/**
 * Rebuilds the bill of a ride that is already cancelled from what was saved at cancellation time.
 * Re-running calculateCancellationBill later would use the current clock and can show a different
 * fee than the one actually charged. Returns null when the ride has no saved cancellation.
 */
export const getStoredCancellationBill = (ride) => {
  const saved = ride?.cancellation;
  if (!saved?.cancelled_at) {
    return null;
  }

  const cancellationFee = Math.round(Number(saved.cancellation_charge || 0));
  const isWaived = !saved.is_fee_applied;
  const driverPayout = Math.round(Number(saved.driver_compensation_amount || 0));
  const driverPenalty = Math.round(Number(saved.driver_penalty_amount || 0));

  return {
    rideId: String(ride._id),
    cancelledBy: saved.cancelled_by || 'user',
    cancelledAt: new Date(saved.cancelled_at).toISOString(),
    cancellationStage: saved.stage || 'searching',
    cancellationReason: saved.reason || '',
    billBreakdown: {
      baseFare: 0,
      cancellationFee,
      taxAmount: 0,
      totalAmount: cancellationFee,
      isWaived,
      feeWaivedReason: saved.fee_waived_reason || '',
    },
    driverBreakdown: {
      driverPayout,
      driverPenalty,
      netWalletChange: driverPayout - driverPenalty,
    },
    paymentDetails: {
      status: saved.payment_status || 'not_applicable',
      note: cancellationFee > 0
        ? 'This amount will be added to your next ride fare.'
        : 'No fee charged for this cancellation.',
    },
    currency: '₹',
  };
};

const FLAGGED_DRIVER_REASONS = [
  'driver asked me to cancel',
  'driver asked for extra fare',
  'driver is not coming',
  "don't feel comfortable",
  'driver is behaving improperly',
  'driver is moving away',
  'driver is not responding'
];

// deferredSideEffects: pass an empty object to get promo restore and driver wallet credit/penalty back as
// `deferredSideEffects.run()` instead of doing them inside the caller's transaction. That lets the caller
// commit the cancellation and notify the other side first, then run it right after. Every wallet entry has
// a referenceKey, so running it again never double-credits.
export const processRideCancellation = async ({ ride, cancelledBy = 'user', reason = '', comment = '', cancellerId = null, session = null, deferredSideEffects = null }) => {
  if (!ride) {
    return null;
  }

  const cleanReason = String(reason || '').trim();
  const cleanComment = String(comment || '').trim();
  const lowerReason = cleanReason.toLowerCase();
  const isFlagged = FLAGGED_DRIVER_REASONS.some(r => lowerReason.includes(r));

  const cancellationBill = await calculateCancellationBill({ ride, cancelledBy, reason: cleanReason });
  const { billBreakdown, driverBreakdown, paymentDetails, cancellationStage } = cancellationBill;

  ride.cancellation = {
    cancelled_by: cancelledBy,
    canceller_id: cancellerId || null,
    reason: cleanReason,
    comment: cleanComment,
    flaggedForAdminReview: isFlagged,
    flagReason: isFlagged ? cleanReason : '',
    stage: cancellationStage,
    cancelled_at: new Date(),
    is_fee_applied: !billBreakdown.isWaived,
    fee_waived_reason: billBreakdown.feeWaivedReason || '',
    cancellation_charge: billBreakdown.totalAmount,
    driver_compensation_amount: driverBreakdown.driverPayout,
    driver_penalty_amount: driverBreakdown.driverPenalty,
    payment_status: paymentDetails.status,
  };

  const runSideEffects = async (sideSession) => {
    // Give the promo use back to the rider as per the promo's restore_on_cancel setting
    await releasePromoForCancelledRide({
      session: sideSession,
      ride,
      cancellationFeeApplied: !billBreakdown.isWaived && billBreakdown.totalAmount > 0,
      riderAtFault: cancelledBy === 'user',
    });

    // Reset driver isOnRide status & driver wallet transactions
    if (ride.driverId) {
      await Driver.updateOne(
        { _id: ride.driverId },
        { $set: { isOnRide: false } },
        { session: sideSession }
      );

      const refBase = `ride-cancel:${String(ride._id)}`;

      // Driver Compensation
      if (driverBreakdown.driverPayout > 0) {
        await applyDriverWalletAdjustment({
          driverId: ride.driverId,
          amount: driverBreakdown.driverPayout,
          type: 'adjustment',
          rideId: ride._id,
          description: `Cancellation compensation for booking ${String(ride._id).slice(-6)}`,
          metadata: {
            source: 'CANCELLATION_COMPENSATION',
            cancelledBy,
            referenceKey: `${refBase}:compensation`,
          },
          session: sideSession,
        });
      }

      // Driver Penalty
      if (driverBreakdown.driverPenalty > 0) {
        await applyDriverWalletAdjustment({
          driverId: ride.driverId,
          amount: -driverBreakdown.driverPenalty,
          type: 'adjustment',
          rideId: ride._id,
          description: `Cancellation penalty for booking ${String(ride._id).slice(-6)}`,
          metadata: {
            source: 'CANCELLATION_PENALTY',
            cancelledBy,
            referenceKey: `${refBase}:penalty`,
          },
          session: sideSession,
        });

        // Increment driver cancellation count
        await Driver.updateOne(
          { _id: ride.driverId },
          { $inc: { cancellation_count: 1 } },
          { session: sideSession }
        );
      }
    }
  };

  if (deferredSideEffects) {
    deferredSideEffects.run = () => runSideEffects(null);
  } else {
    await runSideEffects(session);
  }

  return cancellationBill;
};
