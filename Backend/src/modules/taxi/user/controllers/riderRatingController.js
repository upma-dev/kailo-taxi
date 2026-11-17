import mongoose from 'mongoose';
import { ApiError } from '../../../../utils/ApiError.js';
import { Ride } from '../models/Ride.js';
import { User } from '../models/User.js';

// The driver rates the rider (1-5 stars) after a completed trip, like Ola / Uber / Rapido.
// The rider's profile shows the real average of these ratings.

/** Recalculate a rider's average from all ratings drivers gave them. */
export const refreshRiderRating = async (userId) => {
  const [row] = await Ride.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)), 'riderFeedback.rating': { $gte: 1 } } },
    { $group: { _id: null, average: { $avg: '$riderFeedback.rating' }, count: { $sum: 1 } } },
  ]);
  const average = row ? Math.round(row.average * 10) / 10 : null;
  const count = row?.count || 0;
  await User.updateOne({ _id: userId }, { $set: { riderRating: average, riderRatingCount: count } });
  return { average, count };
};

export const rateRider = async (req, res) => {
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be a whole number from 1 to 5');
  }
  const comment = String(req.body?.comment || '').trim().slice(0, 300);

  const ride = await Ride.findOne({ _id: req.params.rideId, driverId: req.auth.sub })
    .select('userId status liveStatus riderFeedback')
    .lean();
  if (!ride) throw new ApiError(404, 'Ride not found');

  const completed = String(ride.status || '').toLowerCase() === 'completed'
    || String(ride.liveStatus || '').toLowerCase() === 'completed';
  if (!completed) throw new ApiError(400, 'You can rate the rider only after the trip is completed');
  if (ride.riderFeedback?.rating) throw new ApiError(409, 'You already rated this rider');

  // Only one rating per trip, even if two requests arrive together.
  const updated = await Ride.updateOne(
    // `null` matches both "no rating yet" and a missing field.
    { _id: ride._id, 'riderFeedback.rating': null },
    { $set: { riderFeedback: { rating, comment, submittedAt: new Date() } } },
  );
  if (!updated.modifiedCount) throw new ApiError(409, 'You already rated this rider');

  const summary = await refreshRiderRating(ride.userId);
  res.json({ success: true, data: { rideId: String(ride._id), rating, riderRating: summary.average, riderRatingCount: summary.count } });
};
