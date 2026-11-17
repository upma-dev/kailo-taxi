import mongoose from 'mongoose';
import { User } from '../user/models/User.js';
import { Driver } from '../driver/models/Driver.js';
import { Ride } from '../user/models/Ride.js';
import { WalletTransaction } from '../driver/models/WalletTransaction.js';
import { UserWallet } from '../user/models/UserWallet.js';
import { AdminBusinessSetting } from '../admin/models/AdminBusinessSetting.js';
import { RIDE_STATUS } from '../constants/index.js';

// Who referred whom, and whether the reward was paid. Everything is read from the real records:
// - `referredBy` on the user / driver who joined with a code,
// - the wallet credits the referral services wrote (reference keys "user-referral:..." / "driver-referral:..."),
// - `referralRewardGrantedAt` on the person who joined (set once the referrer's reward is paid).
// Counts are always counted from the database, never from a stored counter.

const MODELS = { user: User, driver: Driver };

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const loadProgram = async (kind) => {
  const setting = await AdminBusinessSetting.findOne({ scope: 'default' }).select('referral').lean();
  const program = setting?.referral?.[kind] || {};
  const type = String(program.type || 'instant_referrer').trim().toLowerCase();
  return {
    enabled: Boolean(program.enabled) && Number(program.amount || 0) > 0,
    type,
    conditional: type.startsWith('conditional'),
    bothGetReward: type.endsWith('_new'),
    amount: Math.max(0, Number(program.amount || 0) || 0),
    rideCount: Math.max(1, Number(program.ride_count || 0) || 1),
  };
};

const REFERRER_KEY = {
  user: /^user-referral:(?:signup|completed):([a-f\d]{24})(?::\d+)?:referrer$/i,
  driver: /^driver-referral:(?:signup|completed):([a-f\d]{24})(?::\d+)?:referrer$/i,
};

// referredId -> { amount, at } for the referrer's reward of each referred person.
const loadReferrerCredits = async (kind, referrerIds = []) => {
  const credits = new Map();
  const ids = [...new Set(referrerIds.map(String))].filter(isObjectId);
  if (!ids.length) return credits;

  if (kind === 'driver') {
    const rows = await WalletTransaction.find({ driverId: { $in: ids }, 'metadata.source': 'driver_referral' })
      .select('amount createdAt metadata')
      .lean();
    rows.forEach((row) => {
      const match = String(row?.metadata?.referenceKey || '').match(REFERRER_KEY.driver);
      if (match) credits.set(match[1], { amount: Number(row.amount || 0), at: row.createdAt || null });
    });
    return credits;
  }

  const wallets = await UserWallet.find({ userId: { $in: ids } }).select('transactions').lean();
  wallets.forEach((wallet) => {
    (wallet.transactions || []).forEach((tx) => {
      const match = String(tx?.referenceKey || '').match(REFERRER_KEY.user);
      if (match) credits.set(match[1], { amount: Number(tx.amount || 0), at: tx.createdAt || null });
    });
  });
  return credits;
};

// referredId -> completed rides (the same rides the reward rules count).
const loadCompletedRides = async (kind, referredIds = []) => {
  const ids = referredIds.filter(isObjectId).map((id) => new mongoose.Types.ObjectId(String(id)));
  if (!ids.length) return new Map();
  const field = kind === 'driver' ? 'driverId' : 'userId';
  const match = { [field]: { $in: ids }, status: RIDE_STATUS.COMPLETED };
  if (kind === 'user') match.serviceType = { $in: ['ride', 'intercity'] };
  const rows = await Ride.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const describeStatus = ({ person, credit, program, ridesDone }) => {
  if (credit || person.referralRewardGrantedAt) {
    return {
      status: 'rewarded',
      label: 'Reward paid',
      rewardAmount: credit?.amount ?? null,
      rewardedAt: credit?.at || person.referralRewardGrantedAt || null,
    };
  }
  if (program.enabled && program.conditional) {
    const left = Math.max(0, program.rideCount - ridesDone);
    return {
      status: 'pending',
      label: left > 0 ? `${left} more ride${left === 1 ? '' : 's'} to unlock reward` : 'Reward being processed',
      ridesDone,
      ridesNeeded: program.rideCount,
      rewardAmount: program.amount,
    };
  }
  return {
    status: 'no_reward',
    label: program.enabled ? 'No reward (program was off when they joined)' : 'Referral reward is off',
  };
};

const personSummary = (doc) =>
  doc
    ? {
      id: String(doc._id),
      name: doc.name || '',
      phone: doc.phone || '',
      referralCode: doc.referralCode || '',
    }
    : null;

/** Rows for people who joined with a referral code, with their referrer and reward status. */
const buildRows = async (kind, people = [], { program } = {}) => {
  const activeProgram = program || (await loadProgram(kind));
  const Model = MODELS[kind];
  const referrerIds = people.map((person) => person.referredBy).filter(Boolean);
  const [referrers, credits, rides] = await Promise.all([
    Model.find({ _id: { $in: referrerIds } }).select('name phone referralCode').lean(),
    loadReferrerCredits(kind, referrerIds),
    loadCompletedRides(kind, people.map((person) => person._id)),
  ]);
  const referrerMap = new Map(referrers.map((doc) => [String(doc._id), doc]));

  return people.map((person) => {
    const id = String(person._id);
    const ridesDone = rides.get(id) || 0;
    return {
      id,
      kind,
      name: person.name || '',
      phone: person.phone || '',
      joinedAt: person.createdAt || null,
      deleted: Boolean(person.deletedAt),
      completedRides: ridesDone,
      referrer: personSummary(referrerMap.get(String(person.referredBy))),
      ...describeStatus({ person, credit: credits.get(id), program: activeProgram, ridesDone }),
    };
  });
};

const PERSON_FIELDS = 'name phone createdAt referredBy referralRewardGrantedAt deletedAt';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Admin list: everyone who joined with a code (newest first), searchable by name / phone. */
export const listReferrals = async ({ kind = 'user', page = 1, limit = 20, search = '' } = {}) => {
  const safeKind = kind === 'driver' ? 'driver' : 'user';
  const Model = MODELS[safeKind];
  const query = { referredBy: { $ne: null } };
  const text = String(search || '').trim();
  if (text) {
    const re = new RegExp(escapeRegex(text), 'i');
    query.$or = [{ name: re }, { phone: re }];
  }
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const [total, people] = await Promise.all([
    Model.countDocuments(query),
    Model.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).select(PERSON_FIELDS).lean(),
  ]);
  return {
    kind: safeKind,
    page: safePage,
    limit: safeLimit,
    total,
    results: await buildRows(safeKind, people),
  };
};

/** Admin user / driver details: who referred them, and everyone they referred. */
export const getReferralDetails = async (kind, id) => {
  const safeKind = kind === 'driver' ? 'driver' : 'user';
  const Model = MODELS[safeKind];
  if (!isObjectId(id)) return null;
  const person = await Model.findById(id).select(`${PERSON_FIELDS} referralCode`).lean();
  if (!person) return null;

  const program = await loadProgram(safeKind);
  const referred = await Model.find({ referredBy: person._id }).sort({ createdAt: -1 }).select(PERSON_FIELDS).lean();
  const [ownRow] = person.referredBy ? await buildRows(safeKind, [person], { program }) : [null];
  const rows = await buildRows(safeKind, referred, { program });

  return {
    kind: safeKind,
    referralCode: person.referralCode || '',
    referredBy: ownRow ? { ...ownRow.referrer, status: ownRow.status, label: ownRow.label, rewardAmount: ownRow.rewardAmount ?? null } : null,
    count: rows.length,
    rewardedCount: rows.filter((row) => row.status === 'rewarded').length,
    pendingCount: rows.filter((row) => row.status === 'pending').length,
    earned: rows.reduce((sum, row) => sum + (row.status === 'rewarded' ? Number(row.rewardAmount || 0) : 0), 0),
    program,
    results: rows,
  };
};

const maskName = (name = '') => {
  const text = String(name || '').trim();
  if (!text) return 'New member';
  return text
    .split(/\s+/)
    .map((part) => (part.length <= 2 ? `${part[0]}*` : `${part.slice(0, 2)}${'*'.repeat(Math.min(4, part.length - 3))}${part.slice(-1)}`))
    .join(' ');
};

const maskPhone = (phone = '') => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 4 ? `******${digits.slice(-4)}` : '';
};

/** For the apps: my referral list (names and phones partly hidden). Also keeps the stored counter in step. */
export const getMyReferrals = async (kind, id) => {
  const details = await getReferralDetails(kind, id);
  if (!details) return null;
  const Model = MODELS[details.kind];
  await Model.updateOne({ _id: id }, { $set: { referralCount: details.count } }).catch(() => {});

  return {
    referralCode: details.referralCode,
    count: details.count,
    rewardedCount: details.rewardedCount,
    pendingCount: details.pendingCount,
    earned: details.earned,
    program: {
      enabled: details.program.enabled,
      conditional: details.program.conditional,
      bothGetReward: details.program.bothGetReward,
      amount: details.program.amount,
      rideCount: details.program.rideCount,
    },
    results: details.results.map((row) => ({
      id: row.id,
      name: maskName(row.name),
      phone: maskPhone(row.phone),
      joinedAt: row.joinedAt,
      status: row.status,
      label: row.label,
      rewardAmount: row.rewardAmount ?? null,
      ridesDone: row.ridesDone ?? row.completedRides,
      ridesNeeded: row.ridesNeeded ?? null,
    })),
  };
};

const monthlyCounts = async (Model, year) => {
  const start = new Date(Date.UTC(year, 0, 1) - 5.5 * 3600 * 1000);
  const end = new Date(Date.UTC(year + 1, 0, 1) - 5.5 * 3600 * 1000);
  const rows = await Model.aggregate([
    { $match: { referredBy: { $ne: null }, createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: { $month: { date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
  ]);
  const months = Array(12).fill(0);
  rows.forEach((row) => {
    if (row._id >= 1 && row._id <= 12) months[row._id - 1] = row.count;
  });
  return months;
};

const sumUserReferralCredits = async () => {
  const rows = await UserWallet.aggregate([
    { $unwind: '$transactions' },
    { $match: { 'transactions.referenceKey': { $regex: '^user-referral:' }, 'transactions.kind': 'credit' } },
    { $group: { _id: null, total: { $sum: '$transactions.amount' } } },
  ]);
  return Number(rows[0]?.total || 0);
};

const sumDriverReferralCredits = async () => {
  const rows = await WalletTransaction.aggregate([
    { $match: { 'metadata.source': 'driver_referral' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return Number(rows[0]?.total || 0);
};

/** Admin referral dashboard numbers (all real). */
export const getReferralDashboardData = async () => {
  const year = Number(new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 4));
  const [
    totalUsers,
    totalDrivers,
    referredUsers,
    referredDrivers,
    userReferrers,
    driverReferrers,
    userMonthly,
    driverMonthly,
    userCredits,
    driverCredits,
    recentUsers,
    recentDrivers,
  ] = await Promise.all([
    User.countDocuments({}),
    Driver.countDocuments({}),
    User.countDocuments({ referredBy: { $ne: null } }),
    Driver.countDocuments({ referredBy: { $ne: null } }),
    User.distinct('referredBy', { referredBy: { $ne: null } }),
    Driver.distinct('referredBy', { referredBy: { $ne: null } }),
    monthlyCounts(User, year),
    monthlyCounts(Driver, year),
    sumUserReferralCredits(),
    sumDriverReferralCredits(),
    listReferrals({ kind: 'user', limit: 10 }),
    listReferrals({ kind: 'driver', limit: 10 }),
  ]);

  return {
    year,
    total_users: totalUsers,
    total_drivers: totalDrivers,
    // People who joined with a referral code.
    total_referrals: referredUsers + referredDrivers,
    // People who referred at least one person.
    active_referrals: userReferrers.length + driverReferrers.length,
    // Money paid out as referral rewards (referrers and new members).
    referral_earning: userCredits + driverCredits,
    user_referrals: {
      normal_user: totalUsers - referredUsers,
      referral_user: referredUsers,
      referrers: userReferrers.length,
      paid: userCredits,
      monthly: userMonthly,
      recent: recentUsers.results,
    },
    driver_referrals: {
      normal_driver: totalDrivers - referredDrivers,
      referral_driver: referredDrivers,
      referrers: driverReferrers.length,
      paid: driverCredits,
      monthly: driverMonthly,
      recent: recentDrivers.results,
    },
  };
};
